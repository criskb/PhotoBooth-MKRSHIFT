import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadWorkflowStyles } from "./workflowLoader.js";
import { sendWorkflow } from "./comfyClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "web_ui");
const workflowDir = path.join(rootDir, "workflows");
const comfyInputPath =
  process.env.COMFY_INPUT_PATH ?? path.join(rootDir, "ComfyUI", "input", "input.png");
const comfyServerUrl = process.env.COMFY_SERVER_URL ?? "http://127.0.0.1:8188";
const imgurClientId = process.env.IMGUR_CLIENT_ID ?? "";
const printerCommand = process.env.PRINTER_COMMAND ?? "";
const comfyHistoryUrl = `${comfyServerUrl}/history`;
const comfyProgressUrl = `${comfyServerUrl}/progress`;
const comfyViewUrl = `${comfyServerUrl}/view`;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function writeBase64Image(dataUrl, outputPath) {
  const match = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("Invalid image data");
  }
  const buffer = Buffer.from(match[1], "base64");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
}

async function fetchComfyJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ComfyUI error: ${response.status}`);
  }
  return response.json();
}

function getOutputImage(historyItem) {
  if (!historyItem?.outputs) {
    return null;
  }
  for (const output of Object.values(historyItem.outputs)) {
    if (output?.images?.length) {
      return output.images[0];
    }
  }
  return null;
}

async function readImageAsBase64(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("base64");
}

function buildLocalUrl(req, imageUrl) {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return new URL(imageUrl, `http://${req.headers.host}`).toString();
}

async function saveTempImage(imageUrl, req) {
  const localUrl = buildLocalUrl(req, imageUrl);
  const response = await fetch(localUrl);
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const fileName = `photobooth-${crypto.randomUUID()}.png`;
  const filePath = path.join(os.tmpdir(), fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function runPrintCommand(command, printerName, filePath) {
  const cmd = command
    .replace("{printer}", printerName)
    .replace("{file}", filePath);
  return new Promise((resolve, reject) => {
    exec(cmd, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  if (req.url.startsWith("/api/styles")) {
    const styles = loadWorkflowStyles(workflowDir);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ styles }));
    return;
  }

  if (req.url.startsWith("/api/selfie") && req.method === "POST") {
    readJsonBody(req)
      .then(async (payload) => {
        const style = payload.style;
        const image = payload.image;
        if (!style || !image) {
          res.writeHead(400);
          res.end("Missing style or image");
          return;
        }
        try {
          writeBase64Image(image, comfyInputPath);
          const result = await sendWorkflow({
            workflowDir,
            styleName: style,
            stylePrompt: null,
            inputImagePath: comfyInputPath,
            serverUrl: comfyServerUrl,
          });
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "queued", promptId: result.prompt_id }));
        } catch (error) {
          res.writeHead(500);
          res.end(`Queue failed: ${error.message}`);
        }
      })
      .catch((error) => {
        res.writeHead(400);
        res.end(`Invalid request: ${error.message}`);
      });
    return;
  }

  if (req.url.startsWith("/api/progress")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const promptId = url.searchParams.get("promptId");
    if (!promptId) {
      res.writeHead(400);
      res.end("Missing promptId");
      return;
    }
    Promise.allSettled([
      fetchComfyJson(`${comfyProgressUrl}?prompt_id=${encodeURIComponent(promptId)}`),
      fetchComfyJson(`${comfyHistoryUrl}/${encodeURIComponent(promptId)}`),
    ])
      .then((results) => {
        const progressResult = results[0].status === "fulfilled" ? results[0].value : null;
        const historyResult = results[1].status === "fulfilled" ? results[1].value : null;
        const historyItem = historyResult?.[promptId];
        const outputImage = getOutputImage(historyItem);
        const progressValue =
          progressResult?.value ??
          progressResult?.progress?.value ??
          progressResult?.current ??
          progressResult?.progress?.current ??
          0;
        const progressMax =
          progressResult?.max ??
          progressResult?.progress?.max ??
          progressResult?.total ??
          progressResult?.progress?.total ??
          0;
        const percent =
          typeof progressValue === "number" && typeof progressMax === "number" && progressMax > 0
            ? (progressValue / progressMax) * 100
            : historyItem?.status?.completed
              ? 100
              : 0;
        const responsePayload = {
          percent,
          label: historyItem?.status?.completed ? "Complete" : "Sampling",
          complete: Boolean(historyItem?.status?.completed),
          outputUrl: outputImage
            ? `/api/output?filename=${encodeURIComponent(outputImage.filename)}&type=${
                outputImage.type ?? "output"
              }&subfolder=${encodeURIComponent(outputImage.subfolder ?? "")}`
            : null,
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(responsePayload));
      })
      .catch((error) => {
        res.writeHead(500);
        res.end(`Progress failed: ${error.message}`);
      });
    return;
  }

  if (req.url.startsWith("/api/output")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filename = url.searchParams.get("filename");
    if (!filename) {
      res.writeHead(400);
      res.end("Missing filename");
      return;
    }
    const type = url.searchParams.get("type") ?? "output";
    const subfolder = url.searchParams.get("subfolder") ?? "";
    const target = `${comfyViewUrl}?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(
      type
    )}&subfolder=${encodeURIComponent(subfolder)}`;
    fetch(target)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`ComfyUI view error: ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        res.writeHead(200, { "Content-Type": response.headers.get("content-type") ?? "image/png" });
        res.end(buffer);
      })
      .catch((error) => {
        res.writeHead(500);
        res.end(`Output fetch failed: ${error.message}`);
      });
    return;
  }

  if (req.url.startsWith("/api/upload") && req.method === "POST") {
    if (!imgurClientId) {
      res.writeHead(501);
      res.end("IMGUR_CLIENT_ID not configured");
      return;
    }
    readJsonBody(req)
      .then(async (payload) => {
        const imageUrl = payload.imageUrl;
        if (!imageUrl) {
          res.writeHead(400);
          res.end("Missing imageUrl");
          return;
        }
        const resolvedUrl = buildLocalUrl(req, imageUrl);
        const base64 = await readImageAsBase64(resolvedUrl);
        const imgurResponse = await fetch("https://api.imgur.com/3/image", {
          method: "POST",
          headers: {
            Authorization: `Client-ID ${imgurClientId}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64, type: "base64" }),
        });
        if (!imgurResponse.ok) {
          const message = await imgurResponse.text();
          throw new Error(message || "Imgur upload failed");
        }
        const result = await imgurResponse.json();
        const link = result?.data?.link;
        if (!link) {
          throw new Error("Missing Imgur link");
        }
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
          link
        )}`;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ link, qrUrl }));
      })
      .catch((error) => {
        res.writeHead(500);
        res.end(`Upload failed: ${error.message}`);
      });
    return;
  }

  if (req.url.startsWith("/api/print") && req.method === "POST") {
    if (!printerCommand) {
      res.writeHead(501);
      res.end("PRINTER_COMMAND not configured");
      return;
    }
    readJsonBody(req)
      .then(async (payload) => {
        const imageUrl = payload.imageUrl;
        const printerName = payload.printerName;
        if (!imageUrl || !printerName) {
          res.writeHead(400);
          res.end("Missing imageUrl or printerName");
          return;
        }
        const filePath = await saveTempImage(imageUrl, req);
        await runPrintCommand(printerCommand, printerName, filePath);
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "sent" }));
      })
      .catch((error) => {
        res.writeHead(500);
        res.end(`Print failed: ${error.message}`);
      });
    return;
  }

  const filePath = req.url === "/" ? "index.html" : req.url.replace(/^\//, "");
  const resolved = path.join(webDir, filePath);
  if (!resolved.startsWith(webDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(resolved);
    const typeMap = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
    };
    res.writeHead(200, { "Content-Type": typeMap[ext] ?? "application/octet-stream" });
    res.end(data);
  });
});

const port = process.env.PORT ?? 8080;
server.listen(port, () => {
  console.log(`Photo Booth UI server running on http://localhost:${port}`);
});
