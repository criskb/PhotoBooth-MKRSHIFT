import { initIdleOverlay } from "./idle.js";

const video = document.querySelector("#camera");
const stylesContainer = document.querySelector(".styles");
const statusLabel = document.querySelector(".status__label");
const statusMeta = document.querySelector(".status__meta");
const actionButton = document.querySelector(".action");
const timerToggle = document.querySelector(".timer-toggle");
const timerMenu = document.querySelector(".timer-menu");
const timerOptions = Array.from(document.querySelectorAll(".timer-option"));
const progressLabels = Array.from(document.querySelectorAll(".progress__label"));
const progressValues = Array.from(document.querySelectorAll(".progress__value"));
const progressFills = Array.from(document.querySelectorAll(".progress__fill"));
const progressPreviews = Array.from(document.querySelectorAll(".progress__preview"));
const uploadButton = document.querySelector(".progress-action--upload");
const printButton = document.querySelector(".progress-action--print");
const doneButton = document.querySelector(".progress-action--done");
const qrContainer = document.querySelector(".progress__qr");
const qrImage = document.querySelector(".progress__qr-image");
const appRoot = document.querySelector(".app");
const settingsToggle = document.querySelector(".settings-toggle");
const fullscreenToggle = document.querySelector(".fullscreen-toggle");
const settingsModal = document.querySelector(".settings-modal");
const settingsComfyInput = document.querySelector(".settings-input--comfy");
const settingsOrientationInput = document.querySelector(".settings-input--orientation");
const settingsPrinterInput = document.querySelector(".settings-input--printer");
const settingsPrinterCopiesInput = document.querySelector(".settings-input--printer-copies");
const settingsFreeimageInput = document.querySelector(".settings-input--freeimage");
const settingsEnabledInput = document.querySelector(".settings-input--enabled");
const settingsWatermarkInput = document.querySelector(".settings-input--watermark");
const settingsRemoteQr = document.querySelector(".settings-remote__qr");
const settingsSave = document.querySelector(".settings-action--save");
const settingsClose = document.querySelector(".settings-action--close");
const galleryToggle = document.querySelector(".gallery-toggle");
const galleryModal = document.querySelector(".gallery-modal");
const galleryClose = document.querySelector(".gallery-close");
const galleryList = document.querySelector(".gallery-list");
const galleryInputImage = document.querySelector(".gallery-image--input");
const galleryOutputImage = document.querySelector(".gallery-image--output");
const galleryUploadButton = document.querySelector(".gallery-action--upload");
const galleryUploadStatus = document.querySelector(".gallery-upload-status");
const galleryQr = document.querySelector(".gallery-qr");
const galleryQrImage = document.querySelector(".gallery-qr-image");
const countdownOverlay = document.querySelector(".countdown-overlay");
const countdownValue = document.querySelector(".countdown-value");
const flashOverlay = document.querySelector(".flash-overlay");

let selectedStyle = null;
let isQueueing = false;
let lastShake = 0;
let motionPermissionGranted = false;
let currentPromptId = null;
let progressPoller = null;
let outputReady = false;
let lastOutputUrl = null;
let printerConfig = { name: "", enabled: false, copies: 1 };
let freeimageApiKey = "";
let selectedGalleryUrl = "";
let selectedDelay = 0;
let countdownTimer = null;
let countdownActive = false;
let remoteSocket = null;
let remoteSocketReconnect = null;
const defaultComfyServerUrl = "http://127.0.0.1:8188";
let comfyServerUrl = defaultComfyServerUrl;
let cameraOrientation = 0;
let watermarkEnabled = false;
const idleController = initIdleOverlay({ timeoutMs: 5 * 60 * 1000 });

function toTitleCase(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getOrientationDegrees(value) {
  const orientation = Number(value) || 0;
  if (orientation === 270) {
    return -90;
  }
  return orientation;
}

function updateTimerLabel() {
  timerToggle.textContent = `⏱️ ${selectedDelay}s`;
  timerToggle.setAttribute("aria-expanded", String(timerMenu.classList.contains("timer-menu--open")));
  timerOptions.forEach((option) => {
    option.classList.toggle(
      "timer-option--active",
      Number(option.dataset.delay) === selectedDelay
    );
  });
}

function closeTimerMenu() {
  timerMenu.classList.remove("timer-menu--open");
  updateTimerLabel();
}

function toggleTimerMenu() {
  timerMenu.classList.toggle("timer-menu--open");
  updateTimerLabel();
}

function triggerFlash() {
  flashOverlay.classList.add("flash-overlay--active");
  setTimeout(() => {
    flashOverlay.classList.remove("flash-overlay--active");
  }, 240);
}

function startCountdown(delaySeconds, source) {
  if (isQueueing || countdownActive) {
    return;
  }
  const delay = Number(delaySeconds) || 0;
  if (delay <= 0) {
    triggerFlash();
    setTimeout(() => {
      queueSelfie(source);
    }, 140);
    return;
  }
  countdownActive = true;
  let remaining = delay;
  countdownValue.textContent = String(remaining);
  countdownOverlay.classList.add("countdown-overlay--active");
  statusLabel.textContent = "Countdown";
  statusMeta.textContent = `Taking photo in ${remaining}s`;
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      countdownOverlay.classList.remove("countdown-overlay--active");
      countdownActive = false;
      triggerFlash();
      setTimeout(() => {
        queueSelfie(source);
      }, 140);
      return;
    }
    countdownValue.textContent = String(remaining);
    statusMeta.textContent = `Taking photo in ${remaining}s`;
  }, 1000);
}

function connectRemoteSocket() {
  if (remoteSocketReconnect) {
    clearTimeout(remoteSocketReconnect);
    remoteSocketReconnect = null;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${window.location.host}/remote-ws`;
  remoteSocket = new WebSocket(wsUrl);
  remoteSocket.addEventListener("message", (event) => {
    if (!event?.data) {
      return;
    }
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "capture") {
        const delay = Number(
          payload.delaySeconds ?? payload.delay ?? payload.timer ?? payload.seconds ?? 0
        );
        startCountdown(delay, payload.source ?? "remote");
      }
    } catch (error) {
      // ignore malformed messages
    }
  });
  remoteSocket.addEventListener("close", () => {
    remoteSocketReconnect = setTimeout(connectRemoteSocket, 1500);
  });
  remoteSocket.addEventListener("error", () => {
    remoteSocketReconnect = setTimeout(connectRemoteSocket, 1500);
  });
}


async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    statusLabel.textContent = "Camera Unsupported";
    statusMeta.textContent = "This browser cannot access the camera.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    statusLabel.textContent = "Camera Ready";
    statusMeta.textContent = "Select a style, then tap or shake to shoot";
  } catch (error) {
    statusLabel.textContent = "Camera Blocked";
    statusMeta.textContent = "Allow camera access to continue.";
  }
}

function captureFrame() {
  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }
  const orientation = getOrientationDegrees(cameraOrientation);
  const canvas = document.createElement("canvas");
  const needsSwap = Math.abs(orientation) === 90;
  canvas.width = needsSwap ? video.videoHeight : video.videoWidth;
  canvas.height = needsSwap ? video.videoWidth : video.videoHeight;
  const context = canvas.getContext("2d");
  if (orientation) {
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((orientation * Math.PI) / 180);
    context.drawImage(
      video,
      -video.videoWidth / 2,
      -video.videoHeight / 2,
      video.videoWidth,
      video.videoHeight
    );
  } else {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  }
  return canvas.toDataURL("image/png");
}

async function queueSelfie(source = "tap") {
  if (isQueueing) {
    return;
  }
  if (!selectedStyle) {
    statusLabel.textContent = "Pick a Style";
    statusMeta.textContent = "Select a style before taking a selfie.";
    return;
  }
  const imageData = captureFrame();
  if (!imageData) {
    statusLabel.textContent = "Camera Warming Up";
    statusMeta.textContent = "Please wait for the camera feed.";
    return;
  }

  isQueueing = true;
  setBusy(true);
  outputReady = false;
  lastOutputUrl = null;
  currentPromptId = null;
  if (progressPoller) {
    clearInterval(progressPoller);
    progressPoller = null;
  }
  progressLabels.forEach((element) => {
    element.textContent = "Queueing";
  });
  progressValues.forEach((element) => {
    element.textContent = "0%";
  });
  progressFills.forEach((element) => {
    element.style.width = "0%";
  });
  progressPreviews.forEach((element) => {
    element.src = "";
    element.style.display = "none";
  });
  qrContainer.style.display = "none";
  qrImage.src = "";
  uploadButton.disabled = true;
  printButton.disabled = true;
  doneButton.disabled = true;
  statusLabel.textContent = "Queueing";
  statusMeta.textContent = `Sending ${toTitleCase(selectedStyle)} to ComfyUI (${source})`;
  try {
    const response = await fetch("/api/selfie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        style: selectedStyle,
        image: imageData,
        comfyServerUrl,
      }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to queue");
    }
    const data = await response.json();
    currentPromptId = data.promptId ?? data.prompt_id ?? null;
    statusLabel.textContent = "Queued";
    statusMeta.textContent = "Workflow sent to ComfyUI.";
    startProgressPolling();
  } catch (error) {
    statusLabel.textContent = "Queue Failed";
    statusMeta.textContent = "Unable to send workflow to ComfyUI.";
    progressLabels.forEach((element) => {
      element.textContent = "Error";
    });
    progressValues.forEach((element) => {
      element.textContent = "0%";
    });
    progressFills.forEach((element) => {
      element.style.width = "0%";
    });
    setBusy(false);
  } finally {
    isQueueing = false;
  }
}

async function ensureMotionPermission() {
  if (motionPermissionGranted) {
    return true;
  }
  if (typeof DeviceMotionEvent === "undefined") {
    return false;
  }
  if (typeof DeviceMotionEvent.requestPermission !== "function") {
    motionPermissionGranted = true;
    return true;
  }
  try {
    const state = await DeviceMotionEvent.requestPermission();
    motionPermissionGranted = state === "granted";
    if (!motionPermissionGranted) {
      statusLabel.textContent = "Motion Blocked";
      statusMeta.textContent = "Enable motion access to use shake selfie.";
    }
    return motionPermissionGranted;
  } catch (error) {
    statusLabel.textContent = "Motion Blocked";
    statusMeta.textContent = "Enable motion access to use shake selfie.";
    return false;
  }
}

function handleShake(event) {
  const acceleration = event.accelerationIncludingGravity;
  if (!acceleration) {
    return;
  }
  const magnitude = Math.sqrt(
    (acceleration.x || 0) ** 2 +
      (acceleration.y || 0) ** 2 +
      (acceleration.z || 0) ** 2
  );
  const now = Date.now();
  if (magnitude > 22 && now - lastShake > 2000) {
    lastShake = now;
    queueSelfie("shake");
  }
}

function updateProgress(progress) {
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent ?? 0)));
  const label = progress.label ?? "Sampling";
  progressLabels.forEach((element) => {
    element.textContent = label;
  });
  progressValues.forEach((element) => {
    element.textContent = `${percent}%`;
  });
  progressFills.forEach((element) => {
    element.style.width = `${percent}%`;
  });
  if (progress.outputUrl) {
    lastOutputUrl = progress.outputUrl;
  }
  const previewUrl = progress.outputUrl ?? progress.previewUrl;
  if (previewUrl) {
    progressPreviews.forEach((element) => {
      element.src = previewUrl;
      element.style.display = "block";
    });
  }
}

function startProgressPolling() {
  if (!currentPromptId) {
    return;
  }
  progressLabels.forEach((element) => {
    element.textContent = "Sampling";
  });
  progressValues.forEach((element) => {
    element.textContent = "0%";
  });
  progressFills.forEach((element) => {
    element.style.width = "0%";
  });
  progressPoller = setInterval(async () => {
    try {
      const response = await fetch(
        `/api/progress?promptId=${encodeURIComponent(
          currentPromptId
        )}&comfyServerUrl=${encodeURIComponent(comfyServerUrl)}`
      );
      if (!response.ok) {
        throw new Error("Progress unavailable");
      }
      const data = await response.json();
      updateProgress(data);
      if (data.complete) {
        clearInterval(progressPoller);
        progressPoller = null;
        progressLabels.forEach((element) => {
          element.textContent = "Complete";
        });
        outputReady = true;
        uploadButton.disabled = false;
        printButton.disabled = !printerConfig.enabled || !printerConfig.name;
        doneButton.disabled = false;
      }
    } catch (error) {
      progressLabels.forEach((element) => {
        element.textContent = "Waiting";
      });
    }
  }, 1200);
}

function setBusy(isBusy) {
  if (isBusy) {
    appRoot.classList.add("app--busy");
    return;
  }
  appRoot.classList.remove("app--busy");
  progressLabels.forEach((element) => {
    element.textContent = "";
  });
  progressValues.forEach((element) => {
    element.textContent = "";
  });
  progressFills.forEach((element) => {
    element.style.width = "0%";
  });
  progressPreviews.forEach((element) => {
    element.src = "";
    element.style.display = "none";
  });
  qrContainer.style.display = "none";
  qrImage.src = "";
  uploadButton.disabled = true;
  printButton.disabled = true;
  doneButton.disabled = true;
  if (progressPoller) {
    clearInterval(progressPoller);
    progressPoller = null;
  }
  currentPromptId = null;
  outputReady = false;
  lastOutputUrl = null;
}

function loadPrinterConfig() {
  try {
    const raw = localStorage.getItem("printerConfig");
    if (raw) {
      printerConfig = JSON.parse(raw);
    }
    if (!Number.isFinite(Number(printerConfig.copies)) || Number(printerConfig.copies) <= 0) {
      printerConfig.copies = 1;
    }
    const freeimageRaw = localStorage.getItem("freeimageApiKey");
    if (freeimageRaw) {
      freeimageApiKey = freeimageRaw;
    }
    const comfyRaw = localStorage.getItem("comfyServerUrl");
    if (comfyRaw) {
      comfyServerUrl = comfyRaw;
    }
    const orientationRaw = localStorage.getItem("cameraOrientation");
    if (orientationRaw) {
      cameraOrientation = Number(orientationRaw) || 0;
    }
    const watermarkRaw = localStorage.getItem("watermarkEnabled");
    if (watermarkRaw !== null) {
      watermarkEnabled = watermarkRaw === "true";
    }
  } catch (error) {
    printerConfig = { name: "", enabled: false, copies: 1 };
    freeimageApiKey = "";
    comfyServerUrl = defaultComfyServerUrl;
    cameraOrientation = 0;
    watermarkEnabled = false;
  }
  settingsComfyInput.value = comfyServerUrl || defaultComfyServerUrl;
  settingsOrientationInput.value = String(cameraOrientation || 0);
  settingsPrinterInput.value = printerConfig.name || "";
  settingsPrinterCopiesInput.value = String(printerConfig.copies || 1);
  settingsEnabledInput.checked = Boolean(printerConfig.enabled);
  settingsFreeimageInput.value = freeimageApiKey || "";
  settingsWatermarkInput.checked = watermarkEnabled;
  printButton.disabled = !printerConfig.enabled || !printerConfig.name || !outputReady;
  applyCameraOrientation();
  if (settingsRemoteQr) {
    const remoteUrl = new URL("/remote.html", window.location.origin).toString();
    settingsRemoteQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&color=58d68d&bgcolor=ffffff00&data=${encodeURIComponent(
      remoteUrl
    )}`;
  }
}

function savePrinterConfig() {
  const copies = Number(settingsPrinterCopiesInput.value) || 1;
  printerConfig = {
    name: settingsPrinterInput.value.trim(),
    enabled: settingsEnabledInput.checked,
    copies: Math.max(1, Math.floor(copies)),
  };
  localStorage.setItem("printerConfig", JSON.stringify(printerConfig));
  freeimageApiKey = settingsFreeimageInput.value.trim();
  localStorage.setItem("freeimageApiKey", freeimageApiKey);
  comfyServerUrl = settingsComfyInput.value.trim() || defaultComfyServerUrl;
  localStorage.setItem("comfyServerUrl", comfyServerUrl);
  cameraOrientation = Number(settingsOrientationInput.value) || 0;
  localStorage.setItem("cameraOrientation", String(cameraOrientation));
  watermarkEnabled = settingsWatermarkInput.checked;
  localStorage.setItem("watermarkEnabled", String(watermarkEnabled));
  printButton.disabled = !printerConfig.enabled || !printerConfig.name || !outputReady;
  applyCameraOrientation();
}

function openSettings() {
  settingsModal.classList.add("settings-modal--open");
  settingsClose.disabled = false;
}

function closeSettings() {
  settingsModal.classList.remove("settings-modal--open");
}

function openGallery() {
  galleryModal.classList.add("gallery-modal--open");
  galleryUploadStatus.textContent = "";
  galleryQr.style.display = "none";
  galleryQrImage.src = "";
  loadGallery();
}

function closeGallery() {
  galleryModal.classList.remove("gallery-modal--open");
}

function setGallerySelection(item) {
  if (!item) {
    selectedGalleryUrl = "";
    galleryUploadButton.disabled = true;
    return;
  }
  selectedGalleryUrl = item.outputUrl;
  galleryInputImage.src = item.inputUrl;
  galleryOutputImage.src = item.outputUrl;
  galleryUploadButton.disabled = false;
  galleryUploadStatus.textContent = "";
  galleryQr.style.display = "none";
  galleryQrImage.src = "";
}

function applyCameraOrientation() {
  const orientation = getOrientationDegrees(cameraOrientation);
  const rotated = Math.abs(orientation) === 90;
  const container = appRoot.getBoundingClientRect();
  if (orientation) {
    video.style.top = "50%";
    video.style.left = "50%";
    if (rotated && container.width && container.height) {
      video.style.width = `${container.height}px`;
      video.style.height = `${container.width}px`;
    }
    video.style.transform = `translate(-50%, -50%) rotate(${orientation}deg)`;
  } else {
    video.style.top = "";
    video.style.left = "";
    video.style.width = "";
    video.style.height = "";
    video.style.transform = "";
  }
  video.style.transformOrigin = "center";
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return;
  }
  document.exitFullscreen?.().catch(() => {});
}

function renderGalleryItems(items) {
  galleryList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.textContent = "No results yet.";
    empty.style.opacity = "0.6";
    galleryList.appendChild(empty);
    setGallerySelection(null);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "gallery-item";
    const thumb = document.createElement("img");
    thumb.src = item.outputUrl;
    const label = document.createElement("span");
    label.textContent = item.id;
    row.appendChild(thumb);
    row.appendChild(label);
    row.addEventListener("click", () => {
      setGallerySelection(item);
    });
    galleryList.appendChild(row);
  });
  setGallerySelection(items[0]);
}

async function loadGallery() {
  try {
    const response = await fetch("/api/gallery");
    if (!response.ok) {
      throw new Error("Gallery unavailable");
    }
    const data = await response.json();
    renderGalleryItems(data.items ?? []);
  } catch (error) {
    renderGalleryItems([]);
  }
}

async function uploadImage(imageUrl) {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, apiKey: freeimageApiKey }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Upload failed");
  }
  return response.json();
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = src;
  });
}

async function buildWatermarkedImageUrl(imageUrl) {
  const image = await loadImageElement(imageUrl);
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  const fontSize = Math.max(18, Math.round(width * 0.045));
  ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = Math.round(fontSize * 0.4);
  const margin = Math.round(fontSize * 0.6);
  ctx.fillText("MKRSHIFT", width - margin, height - margin);
  return canvas.toDataURL("image/png");
}

async function resolveShareImageUrl(imageUrl) {
  if (!watermarkEnabled) {
    return imageUrl;
  }
  try {
    return await buildWatermarkedImageUrl(imageUrl);
  } catch (error) {
    return imageUrl;
  }
}

async function uploadToFreeimage() {
  if (!lastOutputUrl) {
    return;
  }
  uploadButton.disabled = true;
  try {
    const imageUrl = await resolveShareImageUrl(lastOutputUrl);
    const data = await uploadImage(imageUrl);
    if (data.qrUrl) {
      qrImage.src = data.qrUrl;
      qrContainer.style.display = "flex";
    }
    statusLabel.textContent = "Upload Complete";
    statusMeta.textContent = "Scan the QR code to view the image.";
  } catch (error) {
    statusLabel.textContent = "Upload Failed";
    statusMeta.textContent = error?.message || "Unable to upload the image.";
  } finally {
    uploadButton.disabled = false;
  }
}

async function uploadGallerySelection() {
  if (!selectedGalleryUrl) {
    return;
  }
  galleryUploadButton.disabled = true;
  galleryUploadStatus.textContent = "Uploading...";
  try {
    const imageUrl = await resolveShareImageUrl(selectedGalleryUrl);
    const data = await uploadImage(imageUrl);
    if (data.qrUrl) {
      galleryQrImage.src = data.qrUrl;
      galleryQr.style.display = "flex";
    }
    galleryUploadStatus.textContent = "Upload complete.";
  } catch (error) {
    galleryUploadStatus.textContent = error?.message || "Upload failed.";
  } finally {
    galleryUploadButton.disabled = false;
  }
}

async function sendToPrinter() {
  if (!lastOutputUrl || !printerConfig.enabled || !printerConfig.name) {
    return;
  }
  printButton.disabled = true;
  try {
    const imageUrl = await resolveShareImageUrl(lastOutputUrl);
    const response = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        printerName: printerConfig.name,
        copies: printerConfig.copies,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    statusLabel.textContent = "Print Sent";
    statusMeta.textContent = `Sent to printer ${printerConfig.name}`;
  } catch (error) {
    statusLabel.textContent = "Print Failed";
    statusMeta.textContent = "Printer not configured or unavailable.";
  } finally {
    printButton.disabled = !printerConfig.enabled || !printerConfig.name || !outputReady;
  }
}

async function loadStyles() {
  try {
    const response = await fetch("/api/styles");
    if (!response.ok) {
      throw new Error("Failed to load styles");
    }
    const data = await response.json();
    const styles = data.styles ?? [];
    stylesContainer.innerHTML = "";
    styles.forEach((style) => {
      const button = document.createElement("button");
      button.className = "style";
      button.textContent = toTitleCase(style);
      button.addEventListener("click", () => {
        document.querySelectorAll(".style").forEach((el) => el.classList.remove("style--active"));
        button.classList.add("style--active");
        selectedStyle = style;
        statusLabel.textContent = "Style Selected";
        statusMeta.textContent = `${toTitleCase(style)} ready to shoot`;
      });
      stylesContainer.appendChild(button);
    });
  } catch (error) {
    statusLabel.textContent = "Offline";
    statusMeta.textContent = "Unable to load styles";
  }
}

actionButton.addEventListener("click", async () => {
  await ensureMotionPermission();
  startCountdown(selectedDelay, "tap");
});
timerToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleTimerMenu();
});
timerOptions.forEach((option) => {
  option.addEventListener("click", (event) => {
    event.stopPropagation();
    selectedDelay = Number(option.dataset.delay) || 0;
    closeTimerMenu();
  });
});
document.addEventListener("click", () => {
  if (timerMenu.classList.contains("timer-menu--open")) {
    closeTimerMenu();
  }
});
settingsToggle.addEventListener("click", () => openSettings());
fullscreenToggle.addEventListener("click", toggleFullscreen);
settingsSave.addEventListener("click", () => {
  savePrinterConfig();
  closeSettings();
});
settingsClose.addEventListener("click", closeSettings);
galleryToggle.addEventListener("click", openGallery);
galleryClose.addEventListener("click", closeGallery);
galleryUploadButton.addEventListener("click", uploadGallerySelection);
uploadButton.addEventListener("click", uploadToFreeimage);
printButton.addEventListener("click", sendToPrinter);
doneButton.addEventListener("click", () => {
  if (!outputReady) {
    return;
  }
  setBusy(false);
  statusLabel.textContent = "Ready";
  statusMeta.textContent = "Select a style, then tap or shake to shoot";
});
window.addEventListener("devicemotion", handleShake);
window.addEventListener("resize", applyCameraOrientation);
["pointerdown", "mousemove", "keydown", "touchstart", "wheel"].forEach((eventName) => {
  window.addEventListener(eventName, idleController.handleUserActivity, { passive: true });
});

startCamera();
loadStyles();
loadPrinterConfig();
updateTimerLabel();
connectRemoteSocket();
idleController.loadImages();
idleController.show();
idleController.schedule();
