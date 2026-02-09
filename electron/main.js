import { app, BrowserWindow, dialog } from "electron";
import { execFile } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = app.isPackaged ? app.getAppPath() : path.resolve(__dirname, "..");
const jsAppRoot = app.isPackaged
  ? path.join(process.resourcesPath, "app.asar.unpacked", "js_app")
  : path.join(repoRoot, "js_app");
const serverScript = path.join(jsAppRoot, "server.js");
const repoUrl = "git@github.com:criskb/PhotoBooth-MKRSHIFT.git";
const serverPort = Number(process.env.PORT ?? 8080);
const appIconPath = path.join(repoRoot, "assets", "icon.png");
let serverInstance = null;

async function runCommand(command, args, options = {}) {
  const { stdout } = await execFileAsync(command, args, {
    cwd: repoRoot,
    ...options,
  });
  return stdout.trim();
}

async function ensureJsDependencies() {
  if (app.isPackaged) {
    return;
  }
  const wsPath = path.join(jsAppRoot, "node_modules", "ws");
  try {
    await fsPromises.access(wsPath);
    return;
  } catch (error) {
    console.info("Installing js_app dependencies...");
  }
  await runCommand("npm", ["install"], { cwd: path.join(repoRoot, "js_app") });
}

async function ensureGitRemote() {
  try {
    const currentUrl = await runCommand("git", ["remote", "get-url", "origin"]);
    if (currentUrl === repoUrl) {
      return;
    }
    await runCommand("git", ["remote", "set-url", "origin", repoUrl]);
  } catch (error) {
    await runCommand("git", ["remote", "add", "origin", repoUrl]);
  }
}

async function resolveRemoteHead() {
  try {
    const headRef = await runCommand("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
    return headRef.replace(/^origin\//, "");
  } catch (error) {
    const candidates = ["main", "master"];
    for (const candidate of candidates) {
      try {
        await runCommand("git", ["rev-parse", `origin/${candidate}`]);
        return candidate;
      } catch (candidateError) {
        continue;
      }
    }
  }
  return null;
}

async function ensureGitUpdate() {
  if (app.isPackaged) {
    return;
  }
  try {
    await runCommand("git", ["--version"]);
  } catch (error) {
    console.warn("Git is not available. Skipping update check.");
    return;
  }
  await ensureGitRemote();
  await runCommand("git", ["fetch", "origin", "--prune"]);
  const remoteBranch = await resolveRemoteHead();
  if (!remoteBranch) {
    console.warn("Unable to determine remote branch for updates.");
    return;
  }
  const localHead = await runCommand("git", ["rev-parse", "HEAD"]);
  const remoteHead = await runCommand("git", ["rev-parse", `origin/${remoteBranch}`]);
  if (localHead === remoteHead) {
    return;
  }
  try {
    await runCommand("git", ["merge-base", "--is-ancestor", "HEAD", `origin/${remoteBranch}`]);
    console.info(`Pulling updates from origin/${remoteBranch}...`);
    await runCommand("git", ["pull", "--ff-only", "origin", remoteBranch]);
  } catch (error) {
    console.warn("Local branch has diverged; skipping auto pull.");
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Server did not respond in time."));
          return;
        }
        setTimeout(attempt, 500);
      });
    };
    attempt();
  });
}

async function startServer() {
  if (serverInstance) {
    return;
  }
  const serverModule = await import(pathToFileURL(serverScript).href);
  serverInstance = serverModule.startServer();
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await window.loadURL(`http://localhost:${serverPort}`);
}

app.whenReady().then(async () => {
  try {
    if (process.platform === "darwin") {
      if (fs.existsSync(appIconPath)) {
        app.dock.setIcon(appIconPath);
      }
    }
    await ensureJsDependencies();
    await ensureGitUpdate();
    await startServer();
    await waitForServer(`http://localhost:${serverPort}`);
    await createWindow();
  } catch (error) {
    console.error("Failed to launch Photo Booth:", error);
    dialog.showErrorBox("Photo Booth Launch Error", error.message ?? String(error));
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
});
