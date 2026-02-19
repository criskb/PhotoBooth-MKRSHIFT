import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import { loadWorkflowJson, loadWorkflowStyles } from "./workflowLoader.js";
import { sendWorkflow } from "./comfyClient.js";
import { fetchPrinters, sendToPrinter } from "./print.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "web_ui");
const workflowDir = path.join(rootDir, "workflows");
const galleryDir = path.join(rootDir, "gallery");
const galleryInputDir = path.join(galleryDir, "input");
const galleryOutputDir = path.join(galleryDir, "output");
const comfyInputPath =
  process.env.COMFY_INPUT_PATH ?? path.join(rootDir, "ComfyUI", "input", "input.png");
let comfyServerUrl = normalizeComfyServerUrl(process.env.COMFY_SERVER_URL) ?? "http://127.0.0.1:8188";
let comfyApiKey = process.env.COMFY_API_KEY ?? "";
const freeimageHostKey = process.env.FREEIMAGE_HOST_KEY ?? "";
let comfyHistoryUrl = `${comfyServerUrl}/history`;
let comfyProgressUrl = `${comfyServerUrl}/progress`;
let comfyViewUrl = `${comfyServerUrl}/view`;
const comfyClientId = process.env.COMFY_CLIENT_ID ?? crypto.randomUUID();
const progressByPrompt = new Map();
const progressMetaByPrompt = new Map();
const outputByPrompt = new Map();
let comfySocket = null;
let comfySocketReady = false;
let comfySocketRetryCount = 0;
let lastPromptId = null;
const remoteClients = new Set();

function setComfyServerUrl(nextUrl) {
  if (!nextUrl || nextUrl === comfyServerUrl) {
    return;
  }
  comfyServerUrl = nextUrl;
  comfyHistoryUrl = `${comfyServerUrl}/history`;
  comfyProgressUrl = `${comfyServerUrl}/progress`;
  comfyViewUrl = `${comfyServerUrl}/view`;
  connectComfyWebsocket();
}

function setComfyApiKey(nextKey) {
  if (nextKey === comfyApiKey) {
    return;
  }
  comfyApiKey = nextKey || "";
  connectComfyWebsocket();
}

function normalizeComfyServerUrl(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    url.pathname = url.pathname.replace(/\/api\/v1\/workflows\/?$/i, "");
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    return null;
  }
}

function normalizeApiKey(value) {
  if (Array.isArray(value)) {
    return value[0]?.trim?.() ?? "";
  }
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}


function isComfyIcuWorkflowCollectionUrl(serverUrl) {
  try {
    const url = new URL(serverUrl);
    return /\/api\/v1\/workflows\/?$/i.test(url.pathname);
  } catch (error) {
    return false;
  }
}

function shouldUseComfyWebsocket(serverUrl) {
  try {
    const url = new URL(serverUrl);
    return !/\/api\/v1\/workflows(\/|$)/i.test(url.pathname) && !/\/api\/v1\/workflows\/[^/]+$/i.test(url.pathname);
  } catch (error) {
    return true;
  }
}

function normalizeStyleName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.json$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function buildComfyApiUrls(baseUrl) {
  const normalized = normalizeComfyServerUrl(baseUrl) ?? baseUrl;
  return {
    historyUrl: `${normalized}/history`,
    progressUrl: `${normalized}/progress`,
    viewUrl: `${normalized}/view`,
  };
}

function buildComfyHeaders() {
  if (!comfyApiKey) {
    return {};
  }
  return {
    Authorization: `Bearer ${comfyApiKey}`,
    "X-API-Key": comfyApiKey,
  };
}

function isRemoteComfyServerUrl(serverUrl) {
  try {
    const url = new URL(serverUrl);
    const host = url.hostname;
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch (error) {
    return false;
  }
}

function normalizePreviewImage(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  if (base64Pattern.test(trimmed) && trimmed.length > 64) {
    return `data:image/png;base64,${trimmed}`;
  }
  return null;
}

function buildPreviewUrl(preview) {
  if (!preview) {
    return null;
  }
  if (typeof preview === "string") {
    return normalizePreviewImage(preview) ??
      `/api/output?filename=${encodeURIComponent(preview)}&type=temp&subfolder=`;
  }
  const inlinePreview =
    normalizePreviewImage(preview.image) ??
    normalizePreviewImage(preview.preview) ??
    normalizePreviewImage(preview.data);
  if (inlinePreview) {
    return inlinePreview;
  }
  const filename = preview.filename ?? preview.image ?? preview.name;
  if (!filename) {
    return null;
  }
  const type = preview.type ?? "temp";
  const subfolder = preview.subfolder ?? "";
  return `/api/output?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(
    type
  )}&subfolder=${encodeURIComponent(subfolder)}`;
}

function resolvePreviewPayload(progressResult) {
  return (
    progressResult?.preview ??
    progressResult?.state?.preview ??
    progressResult?.progress?.preview ??
    progressResult?.preview_image ??
    progressResult?.previewImage ??
    null
  );
}

function updateProgressFromSocket(payload) {
  if (!payload?.promptId) {
    return;
  }
  progressByPrompt.set(payload.promptId, {
    percent: payload.percent ?? 0,
    complete: Boolean(payload.complete),
    updatedAt: Date.now(),
  });
}

function buildWorkflowStepMeta(workflow) {
  const nodeSteps = new Map();
  const samplerSteps = new Map();
  let totalSteps = 0;
  let samplerTotal = 0;
  Object.entries(workflow ?? {}).forEach(([nodeId, node]) => {
    const steps = node?.inputs?.steps;
    if (typeof steps === "number" && Number.isFinite(steps) && steps > 0) {
      nodeSteps.set(nodeId, steps);
      totalSteps += steps;
    }
    if (typeof node?.class_type === "string" && /ksampler/i.test(node.class_type)) {
      if (typeof steps === "number" && Number.isFinite(steps) && steps > 0) {
        samplerSteps.set(nodeId, steps);
        samplerTotal += steps;
      }
    }
  });
  const activeSteps = samplerTotal > 0 ? samplerSteps : nodeSteps;
  const activeTotal = samplerTotal > 0 ? samplerTotal : totalSteps;
  return {
    nodeSteps: activeSteps,
    totalSteps: activeTotal,
    nodeProgress: new Map(),
  };
}

function updateProgressFromNode(promptId, nodeId, value, max) {
  if (!promptId || !nodeId) {
    return null;
  }
  const meta = progressMetaByPrompt.get(promptId);
  if (!meta) {
    return null;
  }
  const nodeTotal = meta.nodeSteps.get(String(nodeId));
  if (!nodeTotal) {
    return null;
  }
  const rawValue = Number(value ?? 0);
  if (!Number.isFinite(rawValue)) {
    return null;
  }
  let normalizedValue = rawValue;
  const maxValue = Number(max ?? 0);
  if (Number.isFinite(maxValue) && maxValue > 0 && maxValue !== nodeTotal) {
    normalizedValue = (rawValue / maxValue) * nodeTotal;
  }
  const clamped = Math.max(0, Math.min(nodeTotal, normalizedValue));
  meta.nodeProgress.set(String(nodeId), clamped);
  const done = Array.from(meta.nodeProgress.values()).reduce((sum, entry) => sum + entry, 0);
  if (!meta.totalSteps) {
    return null;
  }
  return (done / meta.totalSteps) * 100;
}

function resolvePromptIdFromSocket(message) {
  return (
    message?.prompt_id ??
    message?.promptId ??
    message?.data?.prompt_id ??
    message?.data?.promptId ??
    message?.data?.prompt?.id ??
    message?.data?.prompt?.prompt_id ??
    message?.data?.prompt?.promptId ??
    message?.data?.extra_data?.prompt_id ??
    message?.data?.extra_data?.promptId ??
    message?.data?.metadata?.prompt_id ??
    message?.data?.metadata?.promptId ??
    lastPromptId
  );
}

function handleComfySocketMessage(message) {
  if (!message?.type) {
    return;
  }
  const promptId = resolvePromptIdFromSocket(message);
  if (message.type === "progress_state" || message.type === "progress") {
    if (!message.data) {
      return;
    }
    const value = Number(message.data.value ?? 0);
    const max = Number(message.data.max ?? 0);
    const percent =
      updateProgressFromNode(promptId, message.data.node, value, max) ??
      (Number.isFinite(value) && Number.isFinite(max) && max > 0 ? (value / max) * 100 : 0);
    updateProgressFromSocket({
      promptId,
      percent,
    });
    return;
  }
  if (message.type === "executed" && promptId && message.data?.output) {
    const socketOutput = getOutputImage(message.data.output);
    if (socketOutput) {
      outputByPrompt.set(promptId, socketOutput);
    }
  }
  if (message.type === "executing" && message.data.node == null) {
    updateProgressFromSocket({
      promptId,
      percent: 100,
      complete: true,
    });
  }
}

function connectComfyWebsocket() {
  if (comfySocket) {
    try {
      comfySocket.close();
    } catch (error) {
      // noop
    }
  }
  if (!shouldUseComfyWebsocket(comfyServerUrl)) {
    comfySocket = null;
    comfySocketReady = false;
    return;
  }
  const wsUrl = `${comfyServerUrl.replace(/^http/, "ws")}/ws?clientId=${encodeURIComponent(
    comfyClientId
  )}`;
  console.info(`ComfyUI WebSocket connecting (clientId: ${comfyClientId}): ${wsUrl}`);
  comfySocket = new WebSocket(wsUrl, { headers: buildComfyHeaders() });
  comfySocketReady = false;
  comfySocket.on("open", () => {
    comfySocketReady = true;
    comfySocketRetryCount = 0;
    console.info("ComfyUI WebSocket connected.");
  });
  comfySocket.on("message", (data, isBinary) => {
    if (isBinary) {
      return;
    }
    const raw = typeof data === "string" ? data : data?.toString?.("utf8");
    if (!raw) {
      return;
    }
    try {
      const message = JSON.parse(raw);
      handleComfySocketMessage(message);
    } catch (error) {
      // ignore malformed messages
    }
  });
  comfySocket.on("close", () => {
    comfySocketReady = false;
    comfySocketRetryCount += 1;
    const remoteServer = isRemoteComfyServerUrl(comfyServerUrl);
    const retryDelayMs = Math.min(1500 * Math.max(comfySocketRetryCount, 1), 10000);
    if (remoteServer && comfySocketRetryCount >= 5) {
      console.warn("ComfyUI WebSocket unavailable for remote host; using HTTP polling only.");
      return;
    }
    console.warn(`ComfyUI WebSocket closed; reconnecting in ${retryDelayMs}ms.`);
    setTimeout(() => {
      connectComfyWebsocket();
    }, retryDelayMs);
  });
  comfySocket.on("error", () => {
    comfySocketReady = false;
    console.warn("ComfyUI WebSocket error; falling back to polling.");
  });
}

connectComfyWebsocket();

fs.mkdirSync(galleryInputDir, { recursive: true });
fs.mkdirSync(galleryOutputDir, { recursive: true });

const promptToCapture = new Map();
const promptToServerUrl = new Map();
const promptToQueueResult = new Map();
const outputSaved = new Set();

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

function decodeBase64Image(dataUrl) {
  const match = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("Invalid image data");
  }
  return Buffer.from(match[1], "base64");
}

function writeImageBuffer(buffer, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return buffer;
}

async function fetchComfyJson(url) {
  const response = await fetch(url, { headers: buildComfyHeaders() });
  if (!response.ok) {
    throw new Error(`ComfyUI error: ${response.status}`);
  }
  return response.json();
}

function isHostedWorkflowApiUrl(serverUrl) {
  try {
    const url = new URL(serverUrl);
    return /\/api\/v1\/workflows(\/|$)/i.test(url.pathname);
  } catch (error) {
    return false;
  }
}

function pickHostedOutputUrl(payload) {
  return (
    payload?.output_url ??
    payload?.image_url ??
    payload?.result?.output_url ??
    payload?.result?.image_url ??
    payload?.data?.output_url ??
    payload?.data?.image_url ??
    payload?.outputs?.[0]?.url ??
    payload?.images?.[0]?.url ??
    null
  );
}

async function fetchHostedRunStatus(serverUrl, promptId) {
  const base = serverUrl.replace(/\/$/, "");
  const candidates = [`${base}/runs/${encodeURIComponent(promptId)}`, `${base}/run/${encodeURIComponent(promptId)}`];
  let lastError = null;
  for (const target of candidates) {
    const response = await fetch(target, { headers: buildComfyHeaders() });
    if (response.ok) {
      return response.json();
    }
    const message = await response.text().catch(() => "");
    lastError = `GET ${target} -> ${response.status} ${message}`;
    if (response.status !== 404 && response.status !== 405) {
      break;
    }
  }
  throw new Error(lastError ?? "Unable to fetch hosted run status");
}

async function resolveComfyServerUrlForStyle(baseServerUrl, styleName) {
  if (!isComfyIcuWorkflowCollectionUrl(baseServerUrl)) {
    return baseServerUrl;
  }
  const collectionUrl = `${baseServerUrl.replace(/\/$/, "")}`;
  const listResult = await fetchComfyJson(collectionUrl);
  const workflows =
    (Array.isArray(listResult) && listResult) ||
    (Array.isArray(listResult?.workflows) && listResult.workflows) ||
    (Array.isArray(listResult?.data) && listResult.data) ||
    [];
  if (workflows.length === 0) {
    throw new Error("No workflows returned by Comfy.ICU for this token.");
  }
  const wanted = normalizeStyleName(styleName);
  const match = workflows.find((workflow) => {
    const candidates = [
      workflow?.name,
      workflow?.title,
      workflow?.slug,
      workflow?.workflow_name,
      workflow?.metadata?.name,
    ];
    return candidates.some((candidate) => normalizeStyleName(candidate) === wanted);
  });
  if (!match) {
    const available = workflows
      .map((workflow) => workflow?.name ?? workflow?.title ?? workflow?.slug)
      .filter(Boolean)
      .slice(0, 8)
      .join(", ");
    throw new Error(
      `No hosted workflow matched style "${styleName}". Rename your hosted workflow to match the style button name. Available: ${available || "(none)"}`
    );
  }
  const workflowId =
    match?.id ?? match?.workflow_id ?? match?.workflowId ?? match?.uuid ?? match?.slug ?? null;
  if (!workflowId) {
    throw new Error(`Matched workflow "${styleName}" is missing an id in API response.`);
  }
  return `${collectionUrl}/${encodeURIComponent(String(workflowId))}`;
}

function parseComfyProgressPercent(progressPayload) {
  if (typeof progressPayload === "number" && Number.isFinite(progressPayload)) {
    return progressPayload <= 1 ? progressPayload * 100 : progressPayload;
  }
  const nestedProgress = progressPayload?.progress;
  if (nestedProgress && typeof nestedProgress === "object") {
    const nestedPercent = parseComfyProgressPercent(nestedProgress);
    if (nestedPercent > 0) {
      return nestedPercent;
    }
  }
  const percentValue = Number(
    progressPayload?.percent ??
      progressPayload?.percentage ??
      progressPayload?.progressPercent ??
      progressPayload?.progress_percent ??
      progressPayload?.ratio ??
      0
  );
  if (Number.isFinite(percentValue) && percentValue > 0) {
    return percentValue <= 1 ? percentValue * 100 : percentValue;
  }
  const progressValue = Number(
    progressPayload?.value ??
      progressPayload?.current ??
      progressPayload?.step ??
      progressPayload?.steps ??
      0
  );
  const progressMax = Number(
    progressPayload?.max ?? progressPayload?.total ?? progressPayload?.steps_total ?? 0
  );
  if (!Number.isFinite(progressValue) || !Number.isFinite(progressMax) || progressMax <= 0) {
    return 0;
  }
  return (progressValue / progressMax) * 100;
}

function getOutputImage(historyItem) {
  const outputs =
    historyItem?.outputs ??
    historyItem?.result?.outputs ??
    historyItem?.result?.output ??
    historyItem?.output;
  const pickImage = (images) => {
    if (!Array.isArray(images) || images.length === 0) {
      return null;
    }
    const outputImage = images.find((image) => image?.type === "output");
    return outputImage ?? null;
  };
  if (outputs) {
    for (const output of Object.values(outputs)) {
      const selected = pickImage(output?.images);
      if (selected) {
        return selected;
      }
    }
  }
  return pickImage(historyItem?.images);
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
  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return new URL(imageUrl, `http://${req.headers.host}`).toString();
}

function getLanAddress() {
  const networks = os.networkInterfaces();
  for (const addresses of Object.values(networks)) {
    if (!addresses) {
      continue;
    }
    for (const address of addresses) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
  return null;
}

function resolveRemoteBaseUrl(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" && forwardedProto.length > 0
    ? forwardedProto.split(",")[0].trim()
    : "http";
  const hostHeader = req.headers.host ?? "";
  let hostname = "localhost";
  let port = "";
  if (hostHeader) {
    try {
      const parsed = new URL(`${protocol}://${hostHeader}`);
      hostname = parsed.hostname;
      port = parsed.port;
    } catch (error) {
      hostname = hostHeader;
    }
  }
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    const lanAddress = getLanAddress();
    if (lanAddress) {
      hostname = lanAddress;
    }
  }
  const portSegment = port ? `:${port}` : "";
  return `${protocol}://${hostname}${portSegment}`;
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

function safeFileName(value) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "_");
}

async function fetchComfyImageBuffer(image) {
  const target = `${comfyViewUrl}?filename=${encodeURIComponent(image.filename)}&type=${encodeURIComponent(
    image.type ?? "output"
  )}&subfolder=${encodeURIComponent(image.subfolder ?? "")}`;
  const response = await fetch(target, { headers: buildComfyHeaders() });
  if (!response.ok) {
    throw new Error(`ComfyUI view error: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function broadcastRemote(payload) {
  const message = JSON.stringify(payload);
  remoteClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
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

  if (req.url.startsWith("/api/style-preview")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const style = url.searchParams.get("style");
    if (!style) {
      res.writeHead(400);
      res.end("Missing style");
      return;
    }
    const styles = loadWorkflowStyles(workflowDir);
    if (!styles.includes(style)) {
      res.writeHead(404);
      res.end("Style not found");
      return;
    }
    const previewPath = path.join(workflowDir, `${style}.png`);
    if (!fs.existsSync(previewPath)) {
      res.writeHead(404);
      res.end("Preview not found");
      return;
    }
    fs.readFile(previewPath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Unable to load preview");
        return;
      }
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(data);
    });
    return;
  }

  if (req.url.startsWith("/api/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        comfyServerUrl,
        websocketConnected: comfySocketReady,
        apiKeyConfigured: Boolean(comfyApiKey),
        uptimeSeconds: Math.floor(process.uptime()),
      })
    );
    return;
  }

  if (req.url.startsWith("/api/remote-info")) {
    const baseUrl = resolveRemoteBaseUrl(req);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        baseUrl,
        remoteUrl: `${baseUrl}/remote`,
      })
    );
    return;
  }

  if (req.url.startsWith("/api/printers")) {
    fetchPrinters()
      .then((printers) => {
        const names = printers.map((printer) => printer.name).filter(Boolean);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ printers: names, printerDetails: printers }));
      })
      .catch(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ printers: [], printerDetails: [] }));
      });
    return;
  }

  if (req.url.startsWith("/api/selfie") && req.method === "POST") {
    readJsonBody(req)
      .then(async (payload) => {
        const style = payload.style;
        const image = payload.image;
        const comfyOverride = normalizeComfyServerUrl(payload.comfyServerUrl);
        const comfyKeyOverride =
          typeof payload.comfyApiKey === "string" ? normalizeApiKey(payload.comfyApiKey) : null;
        if (comfyOverride) {
          setComfyServerUrl(comfyOverride);
        }
        if (comfyKeyOverride !== null) {
          setComfyApiKey(comfyKeyOverride);
        }
        if (!style || !image) {
          res.writeHead(400);
          res.end("Missing style or image");
          return;
        }
        try {
          const effectiveComfyServerUrl = await resolveComfyServerUrlForStyle(comfyServerUrl, style);
          const captureId = `capture-${Date.now()}-${crypto.randomUUID()}`;
          const safeId = safeFileName(captureId);
          const captureName = `${safeId}.png`;
          const buffer = decodeBase64Image(image);
          writeImageBuffer(buffer, path.join(galleryInputDir, captureName));
          let inputImagePath = null;
          let inputImageBuffer = null;
          if (isRemoteComfyServerUrl(effectiveComfyServerUrl)) {
            inputImageBuffer = buffer;
          } else {
            inputImagePath = comfyInputPath;
            writeImageBuffer(buffer, comfyInputPath);
          }
          console.info(`Queueing ComfyUI prompt (clientId: ${comfyClientId}).`);
          const promptId = crypto.randomUUID();
          const workflow = loadWorkflowJson(workflowDir, style);
          const result = await sendWorkflow({
            workflowDir,
            styleName: style,
            stylePrompt: null,
            inputImagePath,
            inputImageBuffer,
            serverUrl: effectiveComfyServerUrl,
            clientId: comfyClientId,
            promptId,
            apiKey: comfyApiKey,
          });
          const resolvedPromptId = result?.prompt_id ?? promptId;
          promptToCapture.set(resolvedPromptId, safeId);
          promptToServerUrl.set(resolvedPromptId, effectiveComfyServerUrl);
          promptToQueueResult.set(resolvedPromptId, result ?? null);
          lastPromptId = resolvedPromptId;
          progressMetaByPrompt.set(resolvedPromptId, buildWorkflowStepMeta(workflow));
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "queued",
              promptId: resolvedPromptId,
            })
          );
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
    const comfyOverride = normalizeComfyServerUrl(url.searchParams.get("comfyServerUrl"));
    const comfyKeyHeader = req.headers["x-comfy-api-key"];
    if (comfyOverride) {
      setComfyServerUrl(comfyOverride);
    }
    if (comfyKeyHeader !== undefined) {
      setComfyApiKey(normalizeApiKey(comfyKeyHeader));
    }
    if (!promptId) {
      res.writeHead(400);
      res.end("Missing promptId");
      return;
    }
    const requestComfyUrl = promptToServerUrl.get(promptId) ?? comfyServerUrl;
    const queueResult = promptToQueueResult.get(promptId);
    const hostedWorkflowApi =
      Boolean(queueResult?.hostedWorkflowApi) || isHostedWorkflowApiUrl(requestComfyUrl);
    if (hostedWorkflowApi) {
      fetchHostedRunStatus(requestComfyUrl, promptId)
        .then((runStatus) => {
          const status = String(
            runStatus?.status ?? runStatus?.state ?? runStatus?.result?.status ?? ""
          ).toLowerCase();
          const complete = ["succeeded", "success", "completed", "done", "finished"].includes(status);
          const failed = ["failed", "error", "cancelled", "canceled"].includes(status);
          const outputUrl = pickHostedOutputUrl(runStatus) || pickHostedOutputUrl(queueResult);
          const percent = failed ? 100 : complete ? 100 : Math.max(parseComfyProgressPercent(runStatus), 5);
          const responsePayload = {
            percent,
            label: failed ? "Failed" : complete ? "Complete" : "Sampling",
            complete,
            websocketConnected: false,
            outputUrl,
            previewUrl: pickHostedOutputUrl(runStatus?.preview) || null,
            error: failed
              ? runStatus?.error ?? runStatus?.message ?? runStatus?.result?.error ?? "Hosted run failed"
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
    const comfyUrls = buildComfyApiUrls(requestComfyUrl);
    Promise.allSettled([
      fetchComfyJson(`${comfyUrls.progressUrl}?prompt_id=${encodeURIComponent(promptId)}`),
      fetchComfyJson(`${comfyUrls.historyUrl}/${encodeURIComponent(promptId)}`),
    ])
      .then((results) => {
        const progressResult = results[0].status === "fulfilled" ? results[0].value : null;
        const historyResult = results[1].status === "fulfilled" ? results[1].value : null;
        const historyItem =
          historyResult?.[promptId] ??
          historyResult?.history?.[promptId] ??
          historyResult;
        const outputImage = outputByPrompt.get(promptId) ?? getOutputImage(historyItem);
        const captureId = promptToCapture.get(promptId);
        const fallbackOutputPath = captureId
          ? path.join(galleryOutputDir, `${captureId}.png`)
          : null;
        const fallbackOutputUrl =
          fallbackOutputPath && fs.existsSync(fallbackOutputPath)
            ? `/api/gallery/image?type=output&name=${encodeURIComponent(`${captureId}.png`)}`
            : null;
        const socketProgress = progressByPrompt.get(promptId);
        const socketPercent = Number.isFinite(socketProgress?.percent) ? socketProgress.percent : 0;
        const socketFresh =
          typeof socketProgress?.updatedAt === "number" &&
          Date.now() - socketProgress.updatedAt < 10_000;
        const progressPayload =
          progressResult?.progress ??
          progressResult?.state ??
          progressResult?.state?.progress ??
          progressResult ??
          {};
        const polledPercent = parseComfyProgressPercent(progressPayload);
        let percent = socketFresh
          ? Math.max(socketPercent, polledPercent)
          : polledPercent || socketPercent;
        const completed =
          Boolean(socketProgress?.complete) ||
          Boolean(historyItem?.status?.completed) ||
          Boolean(historyItem?.status?.status_str === "success") ||
          Boolean(outputImage);
        if (completed) {
          progressMetaByPrompt.delete(promptId);
        }
        if (!Number.isFinite(percent) || percent <= 0) {
          percent = completed ? 100 : 0;
        }
        const responsePayload = {
          percent,
          label: completed ? "Complete" : "Sampling",
          complete: completed,
          websocketConnected: comfySocketReady,
          outputUrl: outputImage
            ? `/api/output?filename=${encodeURIComponent(outputImage.filename)}&type=${
                outputImage.type ?? "output"
              }&subfolder=${encodeURIComponent(outputImage.subfolder ?? "")}&promptId=${encodeURIComponent(
                promptId
              )}`
            : fallbackOutputUrl,
          previewUrl: buildPreviewUrl(resolvePreviewPayload(progressResult)),
        };
        if (captureId && outputImage && !outputSaved.has(promptId)) {
          fetchComfyImageBuffer(outputImage)
            .then((buffer) => {
              fs.writeFileSync(path.join(galleryOutputDir, `${captureId}.png`), buffer);
              outputSaved.add(promptId);
            })
            .catch(() => {});
        }
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
    const promptId = url.searchParams.get("promptId");
    const requestComfyUrl = (promptId && promptToServerUrl.get(promptId)) ?? comfyServerUrl;
    const comfyUrls = buildComfyApiUrls(requestComfyUrl);
    const target = `${comfyUrls.viewUrl}?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(
      type
    )}&subfolder=${encodeURIComponent(subfolder)}`;
    fetch(target, { headers: buildComfyHeaders() })
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

  if (req.url.startsWith("/api/gallery/image")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const name = url.searchParams.get("name");
    const type = url.searchParams.get("type");
    if (!name || !type) {
      res.writeHead(400);
      res.end("Missing name or type");
      return;
    }
    const baseDir = type === "input" ? galleryInputDir : type === "output" ? galleryOutputDir : null;
    if (!baseDir) {
      res.writeHead(400);
      res.end("Invalid type");
      return;
    }
    const resolved = path.join(baseDir, path.basename(name));
    if (!resolved.startsWith(baseDir)) {
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
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(data);
    });
    return;
  }

  if (req.url.startsWith("/api/gallery")) {
    const outputFiles = fs.readdirSync(galleryOutputDir).filter((file) => file.endsWith(".png"));
    const entries = outputFiles
      .map((file) => {
        const inputPath = path.join(galleryInputDir, file);
        const outputPath = path.join(galleryOutputDir, file);
        if (!fs.existsSync(inputPath)) {
          return null;
        }
        const stat = fs.statSync(outputPath);
        return {
          id: path.basename(file, ".png"),
          inputUrl: `/api/gallery/image?type=input&name=${encodeURIComponent(file)}`,
          outputUrl: `/api/gallery/image?type=output&name=${encodeURIComponent(file)}`,
          updatedAt: stat.mtimeMs,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ items: entries }));
    return;
  }

  if (req.url.startsWith("/api/idle-images")) {
    const idleDir = path.join(webDir, "idle_pictures");
    let items = [];
    try {
      items = fs
        .readdirSync(idleDir)
        .filter((file) => file.toLowerCase().endsWith(".png"))
        .sort()
        .map((file) => `/idle_pictures/${encodeURIComponent(file)}`);
    } catch (error) {
      items = [];
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ images: items }));
    return;
  }

  if (req.url.startsWith("/api/upload") && req.method === "POST") {
    readJsonBody(req)
      .then(async (payload) => {
        const imageUrl = payload.imageUrl;
        const apiKey =
          typeof payload.apiKey === "string" && payload.apiKey.trim()
            ? payload.apiKey.trim()
            : freeimageHostKey;
        if (!apiKey) {
          res.writeHead(501);
          res.end("FREEIMAGE_HOST_KEY not configured");
          return;
        }
        if (!imageUrl) {
          res.writeHead(400);
          res.end("Missing imageUrl");
          return;
        }
        const resolvedUrl = buildLocalUrl(req, imageUrl);
        const base64 = await readImageAsBase64(resolvedUrl);
        const formData = new FormData();
        formData.append("key", apiKey);
        formData.append("source", base64);
        formData.append("format", "json");
        const uploadResponse = await fetch("https://freeimage.host/api/1/upload", {
          method: "POST",
          body: formData,
        });
        let result = null;
        try {
          result = await uploadResponse.json();
        } catch (error) {
          // ignore parse errors
        }
        if (!uploadResponse.ok) {
          const message =
            result?.status_txt ??
            result?.error ??
            result?.message ??
            (await uploadResponse.text().catch(() => "")) ??
            "";
          throw new Error(message || "Upload failed");
        }
        if (!result) {
          throw new Error("Upload response missing JSON");
        }
        const link =
          result?.image?.url ??
          result?.image?.display_url ??
          result?.data?.link ??
          result?.url;
        if (!link) {
          throw new Error("Missing upload link");
        }
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&color=58d68d&bgcolor=ffffff00&data=${encodeURIComponent(
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
    readJsonBody(req)
      .then(async (payload) => {
        const imageUrl = payload.imageUrl;
        const printerName = payload.printerName;
        const copies = Number(payload.copies ?? 1);
        if (!imageUrl || !printerName) {
          res.writeHead(400);
          res.end("Missing imageUrl or printerName");
          return;
        }
        const filePath = await saveTempImage(imageUrl, req);
        const safeCopies = Number.isFinite(copies) && copies > 0 ? Math.floor(copies) : 1;
        await sendToPrinter(printerName, filePath, safeCopies, payload.printOptions || {});
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "sent" }));
      })
      .catch((error) => {
        res.writeHead(500);
        res.end(`Print failed: ${error.message}`);
      });
    return;
  }

  let filePath = req.url === "/" ? "index.html" : req.url.replace(/^\//, "");
  if (req.url === "/remote" || req.url === "/remote/") {
    filePath = "remote.html";
  }
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

const remoteWss = new WebSocketServer({ server, path: "/remote-ws" });

remoteWss.on("connection", (socket) => {
  remoteClients.add(socket);
  socket.on("message", (data, isBinary) => {
    if (isBinary) {
      return;
    }
    const raw = typeof data === "string" ? data : data?.toString?.("utf8");
    if (!raw) {
      return;
    }
    try {
      const payload = JSON.parse(raw);
      if (payload?.type === "capture") {
        const delaySeconds = Number(payload.delaySeconds ?? payload.delay ?? payload.timer ?? 0) || 0;
        broadcastRemote({
          type: "capture",
          delaySeconds,
          source: payload.source ?? "remote",
        });
        return;
      }
      if (payload?.type === "capture-image" && typeof payload.image === "string") {
        const image = payload.image.trim();
        if (!image) {
          return;
        }
        broadcastRemote({
          type: "capture-image",
          image,
          source: payload.source ?? "remote",
        });
        return;
      }
      if (payload?.type === "style" && typeof payload.style === "string") {
        const style = payload.style.trim();
        if (!style) {
          return;
        }
        broadcastRemote({
          type: "style",
          style,
          source: payload.source ?? "remote",
        });
        return;
      }
      if (payload?.type === "progress") {
        const percent = Number(payload.percent ?? 0);
        broadcastRemote({
          type: "progress",
          status: payload.status ?? "generating",
          label: payload.label ?? "Sampling",
          percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0,
          complete: Boolean(payload.complete),
          promptId: payload.promptId ?? null,
          comfyServerUrl: payload.comfyServerUrl ?? null,
          outputUrl: payload.outputUrl ?? null,
          showResultOnRemote: payload.showResultOnRemote !== false,
          source: payload.source ?? "booth",
        });
        return;
      }
      if (payload?.type === "remote-config") {
        broadcastRemote({
          type: "remote-config",
          showResultOnRemote: payload.showResultOnRemote !== false,
          allowRemoteCameraCapture: Boolean(payload.allowRemoteCameraCapture),
          source: payload.source ?? "booth",
        });
        return;
      }
      if (payload?.type === "exit") {
        broadcastRemote({
          type: "exit",
          source: payload.source ?? "remote",
        });
        return;
      }
      if (payload?.type === "status-request") {
        broadcastRemote({
          type: "status-request",
          source: payload.source ?? "remote",
        });
      }
    } catch (error) {
      // ignore malformed messages
    }
  });
  socket.on("close", () => {
    remoteClients.delete(socket);
  });
  socket.on("error", () => {
    remoteClients.delete(socket);
  });
});

export function startServer() {
  const port = process.env.PORT ?? 8080;
  server.listen(port, () => {
    console.log(`Photo Booth UI server running on http://localhost:${port}`);
  });
  return server;
}

function isExecutedDirectly() {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }
  return path.resolve(entrypoint) === __filename;
}

if (isExecutedDirectly()) {
  startServer();
}
