# PhotoBooth-MKRSHIFT

PhotoBooth-MKRSHIFT is a JavaScript-first photo booth stack that pairs a Node.js server with a Three.js web UI and ComfyUI workflows. Styles and prompts live in workflow JSON files, and the UI consumes them through a simple JSON API.

## Repository layout

```
PhotoBooth-MKRSHIFT/
├── js_app/        # Node.js API server + ComfyUI client
├── web_ui/        # Three.js photo booth UI (served by js_app)
├── workflows/     # ComfyUI workflow JSON files (style prompts live here)
├── gallery/       # Generated image output (if enabled)
└── README.md      # Project documentation
```

> Legacy Python folders remain for historical reference, but the active stack is the JavaScript app in `js_app/`.

## Quick start

### 1) Install dependencies

```bash
npm install
cd js_app
npm install
```

### 2) Run the server

```bash
cd js_app
npm run start
```

The server starts on `http://localhost:8080` and serves the Three.js UI from `web_ui/`.

## Electron app

Launch the Electron shell, which will auto-install `js_app` dependencies and check for updates from
`git@github.com:criskb/PhotoBooth-MKRSHIFT.git` before starting the local server:

```bash
npm run start:desktop
```

## Installer scripts

Use the helper scripts to install Node dependencies on each platform:

```bash
./scripts/install-macos.sh
```

```powershell
.\scripts\install-windows.ps1
```

## Build desktop installers

Generate platform installers with Electron Builder (the icon files are generated automatically):

```bash
npm run build:mac
```

```bash
npm run build:win
```

Artifacts are written to `dist/`. On macOS, drag `PhotoBooth.app` to the Applications folder so it
appears in the Dock. Supply a 1024x1024 `assets/icon.png` before building to customize the app icon.

## Raspberry Pi setup (Raspberry Pi OS Bookworm)

The project runs well on Raspberry Pi as a **Node.js server + browser kiosk** setup.
This is the recommended Pi deployment mode (instead of Electron).

### 1) Install system prerequisites on the Pi

```bash
sudo apt update
sudo apt install -y git curl build-essential ca-certificates
```

Install Node.js 20 LTS (ARM64/ARMHF compatible):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 2) Clone and install PhotoBooth dependencies

```bash
git clone https://github.com/criskb/PhotoBooth-MKRSHIFT.git
cd PhotoBooth-MKRSHIFT
./scripts/install-raspberry.sh
```

(If script execution is blocked, run `chmod +x scripts/install-raspberry.sh` once.)

### 3) Run PhotoBooth on the Pi

```bash
npm run start
```

Open `http://<pi-ip>:8080` from the Pi itself (kiosk browser) or another device on the same network.

### 4) Optional: auto-start on boot (systemd)

Create `/etc/systemd/system/photobooth.service`:

```ini
[Unit]
Description=PhotoBooth-MKRSHIFT
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/PhotoBooth-MKRSHIFT
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable photobooth
sudo systemctl start photobooth
sudo systemctl status photobooth
```

### Notes for Raspberry Pi

- For Pi installs, prefer `npm run start` (web server mode). This is the most reliable path on ARM devices.
- Electron desktop packaging in this repo targets macOS/Windows; Pi usage should run the web UI in Chromium kiosk mode.
- ComfyUI can run on the same Pi for lightweight workflows, but for heavy models use a separate GPU machine and point PhotoBooth to that ComfyUI endpoint in Settings.

## Configuring styles

Each workflow JSON inside `workflows/` contains its own prompt text and settings. To add a new style, drop a workflow JSON file into the folder. The API exposes the style list at:

```
GET /api/styles
```

## ComfyUI runtime notes

Start ComfyUI with preview updates enabled so the UI can show sampling progress:

```bash
python main.py --preview-method taesd
```

If you want automatic selection:

```bash
python main.py --preview-method auto
```

### Container TTY requirements

Some ComfyUI samplers expect a TTY. If you run in Docker, allocate a TTY (for example, `docker run -it ...`) so progress output does not stall.

### Proxy timeouts

Long-running image generations can exceed reverse-proxy defaults. Increase proxy timeout values (for example, `proxy_read_timeout`/`proxy_send_timeout` in Nginx) if you see 504s while jobs are still running.

## Comfy.ICU setup (recommended API flow)

If you use hosted Comfy.ICU instead of a local ComfyUI install, use this exact setup:

### 1) Create API key and workflow

1. Create a Comfy.ICU API key from your Comfy.ICU account settings.
2. Create and test your workflow in Comfy.ICU.
3. Copy the workflow URL/id (for example: `https://comfy.icu/api/v1/workflows/<workflow_id>`).

### 2) Use matching local style files from `/workflows`

- Keep your local workflow JSON files in this repo under `/workflows`.
- Style buttons in the booth use these local files as the source `prompt` JSON.
- If you use the hosted **collection** URL (`https://comfy.icu/api/v1/workflows/`), hosted workflow names should match your local style names so the app can resolve ids automatically.

Optional (recommended): create a manual style-to-workflow-id mapping file at
`workflows/comfyicu-workflow-map.json`.

You can copy `workflows/comfyicu-workflow-map.example.json` and replace values with real Comfy.ICU
workflow ids. Example:

```json
{
  "clay": "4r8DLUYgcaMhGw-mf6l8P",
  "lowpoly": "YOUR_WORKFLOW_ID"
}
```

When this file exists, PhotoBooth uses it first to resolve the selected style to the correct hosted
workflow id, so you do not need to rename workflows exactly.

Debug endpoint:

```bash
curl http://localhost:8080/api/comfy-workflow-map
```

This returns each local style and the mapped workflow id (if configured), plus the expected map file
path, so you can quickly confirm your mapping is loaded.

### 3) Configure PhotoBooth settings

In the app Settings:

- **ComfyUI API Endpoint**:
  - Root host also works and is normalized to collection mode: `https://comfy.icu`
  - Specific workflow mode: `https://comfy.icu/api/v1/workflows/<workflow_id>`
  - Collection mode: `https://comfy.icu/api/v1/workflows/`
- **ComfyUI API Key**: paste your Comfy.ICU token.

### 4) How this app sends hosted runs

For hosted Comfy.ICU, PhotoBooth now uses the docs-style model:

- Sends run creation to `/api/v1/workflows/<workflow_id>/runs`.
- Sends your selected local style JSON as `prompt`.
- Uses latest captured booth image as the workflow input.
- Provides the image to hosted runs via either:
  - `files` mapping (preferred): `"/input/photobooth-input.png" -> public URL`, or
  - hosted upload fallback when `files` is not available.

This avoids large base64 payload errors and prevents `https://comfy.icu/upload/image -> 404` from blocking normal runs.

### 5) Important networking requirement for hosted files

When using hosted Comfy.ICU with input image files, your PhotoBooth server must be reachable by Comfy.ICU (public URL or properly tunneled URL), because Comfy.ICU needs to download the image URL you provide in `files`.

If your booth runs only on `localhost` with no public tunnel, hosted file download may fail. In that case:

- expose the booth with a tunnel/reverse-proxy URL, or
- use a deployment where Comfy.ICU can reach your `/api/gallery/image?...` URL.

### 6) Quick troubleshooting

- **`Queue failed ... /upload/image -> 404`**
  - Ensure endpoint is `https://comfy.icu/api/v1/workflows/<id>` or collection URL.
  - Update to latest code (this project now prefers `files` mapping for hosted runs).
- **`Body exceeded 1mb limit`**
  - Caused by oversized inline payloads; current code avoids this by not inlining base64 in hosted run body.
- **Run queued but no output**
  - Confirm your workflow writes to `/output` via `SaveImage` nodes.
  - Confirm Comfy.ICU can access the provided input file URL.

## Legacy Python notes

The previous Python implementation is deprecated and retained only for reference.
