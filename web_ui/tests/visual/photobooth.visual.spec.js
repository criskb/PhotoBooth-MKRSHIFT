import { test, expect } from "@playwright/test";

const placeholderImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6Xb4QAAAABJRU5ErkJggg==";

const galleryFixtures = [
  {
    id: "MKR-2024-001",
    inputUrl: placeholderImage,
    outputUrl: placeholderImage,
    updatedAt: Date.now() - 1000 * 60 * 5,
  },
  {
    id: "MKR-2024-002",
    inputUrl: placeholderImage,
    outputUrl: placeholderImage,
    updatedAt: Date.now() - 1000 * 60 * 15,
  },
];

const apiResponses = {
  "/api/styles": { styles: ["watercolor", "comic", "cyberpunk"] },
  "/api/printers": { printers: ["Canon Selphy", "Fujifilm Instax"] },
  "/api/remote-info": { remoteUrl: "https://example.com/remote" },
  "/api/idle-images": { images: [placeholderImage] },
  "/api/gallery": { items: galleryFixtures },
  "/api/health": {
    comfyServerUrl: "http://127.0.0.1:8188",
    websocketConnected: true,
    apiKeyConfigured: true,
    uptimeSeconds: 6543,
  },
};

const disableMotionAndSocketsScript = () => {
  const seedBase = 0.123;
  let seed = seedBase;
  const nextRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  Math.random = nextRandom;
  const stream = typeof MediaStream === "function" ? new MediaStream() : {};
  navigator.mediaDevices = navigator.mediaDevices || {};
  navigator.mediaDevices.getUserMedia = () => Promise.resolve(stream);

  class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor() {
      this.readyState = FakeWebSocket.OPEN;
      this._listeners = new Map();
      setTimeout(() => this._emit("open"), 0);
    }

    addEventListener(event, handler) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, new Set());
      }
      this._listeners.get(event).add(handler);
    }

    removeEventListener(event, handler) {
      this._listeners.get(event)?.delete(handler);
    }

    send() {}

    close() {
      this.readyState = FakeWebSocket.CLOSED;
      this._emit("close");
    }

    _emit(event) {
      this._listeners.get(event)?.forEach((handler) => handler());
      const handler = this[`on${event}`];
      if (typeof handler === "function") {
        handler();
      }
    }
  }

  window.WebSocket = FakeWebSocket;
};

const stateSetters = {
  idle: async (page) => {
    await page.evaluate(() => {
      document.querySelector(".idle-overlay")?.classList.remove("idle-overlay--hidden");
      document.querySelector(".app")?.classList.remove("app--busy");
      document.querySelector(".settings-modal")?.classList.remove("settings-modal--open");
      document.querySelector(".gallery-modal")?.classList.remove("gallery-modal--open");
      document.querySelector(".diagnostics-modal")?.classList.remove("diagnostics-modal--open");
    });
    await expect(page.locator(".idle-overlay")).toBeVisible();
  },
  progress: async (page) => {
    await page.evaluate((image) => {
      document.querySelector(".idle-overlay")?.classList.add("idle-overlay--hidden");
      const app = document.querySelector(".app");
      app?.classList.add("app--busy");
      document.querySelectorAll(".progress__label").forEach((node) => {
        node.textContent = "Rendering";
      });
      document.querySelectorAll(".progress__value").forEach((node) => {
        node.textContent = "45%";
      });
      document.querySelectorAll(".progress__fill").forEach((node) => {
        node.style.width = "45%";
      });
      document.querySelectorAll(".progress__preview").forEach((node) => {
        node.src = image;
        node.style.display = "block";
      });
    }, placeholderImage);
    await expect(page.locator(".progress-overlay")).toBeVisible();
  },
  gallery: async (page) => {
    await page.evaluate((image) => {
      document.querySelector(".idle-overlay")?.classList.add("idle-overlay--hidden");
      const modal = document.querySelector(".gallery-modal");
      modal?.classList.add("gallery-modal--open");
      const list = document.querySelector(".gallery-list");
      if (list) {
        list.innerHTML = "";
        const items = ["MKR-2024-001", "MKR-2024-002"];
        items.forEach((id, index) => {
          const row = document.createElement("button");
          row.type = "button";
          row.className = "gallery-item";
          if (index === 0) {
            row.classList.add("gallery-item--active");
          }
          row.dataset.id = id;
          const thumb = document.createElement("img");
          thumb.src = image;
          const label = document.createElement("span");
          label.textContent = id;
          row.appendChild(thumb);
          row.appendChild(label);
          list.appendChild(row);
        });
      }
      const inputImage = document.querySelector(".gallery-image--input");
      const outputImage = document.querySelector(".gallery-image--output");
      if (inputImage) {
        inputImage.src = image;
      }
      if (outputImage) {
        outputImage.src = image;
      }
      const metaId = document.querySelector(".gallery-meta__value--id");
      const metaDate = document.querySelector(".gallery-meta__value--date");
      if (metaId) {
        metaId.textContent = "MKR-2024-001";
      }
      if (metaDate) {
        metaDate.textContent = new Date().toLocaleString();
      }
    }, placeholderImage);
    await expect(page.locator(".gallery-modal")).toBeVisible();
  },
  settings: async (page) => {
    await page.evaluate(() => {
      document.querySelector(".idle-overlay")?.classList.add("idle-overlay--hidden");
      const modal = document.querySelector(".settings-modal");
      modal?.classList.add("settings-modal--open");
      const server = document.querySelector(".settings-input--comfy");
      const printer = document.querySelector(".settings-input--printer");
      const copies = document.querySelector(".settings-input--printer-copies");
      if (server) {
        server.value = "https://comfy.local";
      }
      if (printer) {
        printer.value = "Canon Selphy";
      }
      if (copies) {
        copies.value = "2";
      }
    });
    await expect(page.locator(".settings-modal")).toBeVisible();
  },
  diagnostics: async (page) => {
    await page.evaluate(() => {
      document.querySelector(".idle-overlay")?.classList.add("idle-overlay--hidden");
      const modal = document.querySelector(".diagnostics-modal");
      modal?.classList.add("diagnostics-modal--open");
      const server = document.querySelector(".diagnostics-value--server");
      const socket = document.querySelector(".diagnostics-value--socket");
      const api = document.querySelector(".diagnostics-value--api");
      const uptime = document.querySelector(".diagnostics-value--uptime");
      if (server) {
        server.textContent = "http://127.0.0.1:8188";
      }
      if (socket) {
        socket.textContent = "Connected";
      }
      if (api) {
        api.textContent = "Configured";
      }
      if (uptime) {
        uptime.textContent = "1h 49m 3s";
      }
    });
    await expect(page.locator(".diagnostics-modal")).toBeVisible();
  },
};

const states = [
  { key: "idle", name: "idle state" },
  { key: "progress", name: "progress overlay" },
  { key: "gallery", name: "gallery modal" },
  { key: "settings", name: "settings modal" },
  { key: "diagnostics", name: "diagnostics modal" },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(disableMotionAndSocketsScript);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const body = apiResponses[url.pathname];
    if (body) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route("https://api.qrserver.com/**", async (route) => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6Xb4QAAAABJRU5ErkJggg==",
      "base64"
    );
    await route.fulfill({ status: 200, contentType: "image/png", body: png });
  });
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".status__label");
  await page.addStyleTag({
    content: `* { animation: none !important; transition: none !important; }`,
  });
});

for (const state of states) {
  test(`visual snapshot - ${state.name}`, async ({ page }) => {
    await stateSetters[state.key](page);
    await expect(page).toHaveScreenshot(`${state.key}.png`, { fullPage: true });
  });
}
