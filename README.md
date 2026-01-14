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
cd js_app
npm install
```

### 2) Run the server

```bash
npm run start
```

The server starts on `http://localhost:8080` and serves the Three.js UI from `web_ui/`.

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
