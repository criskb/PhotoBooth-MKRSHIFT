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

## Legacy Python notes

The previous Python implementation is deprecated and retained only for reference.
