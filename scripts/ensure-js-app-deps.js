import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const jsAppPath = path.join(repoRoot, "js_app");
const wsPath = path.join(jsAppPath, "node_modules", "ws");

if (!fs.existsSync(wsPath)) {
  console.info("Installing js_app dependencies for Electron build...");
  execFileSync("npm", ["install"], { cwd: jsAppPath, stdio: "inherit" });
}
