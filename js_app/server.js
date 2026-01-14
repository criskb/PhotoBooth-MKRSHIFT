import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadWorkflowStyles } from "./workflowLoader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "web_ui");
const workflowDir = path.join(rootDir, "workflows");

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
