import { initIdleOverlay } from "./idle.js";
import { renderApp } from "./components/index.js";
import {
  storageKeys,
  readStoredValue,
  writeStoredValue,
  removeStoredValue,
  readStoredJson,
  writeStoredJson,
} from "./settingsStore.js";

const appRoot =
  document.querySelector(".app") ??
  (() => {
    const root = document.createElement("div");
    root.className = "app";
    document.body.appendChild(root);
    return root;
  })();
renderApp(appRoot);

const video = document.querySelector("#camera");
const stylesContainer = document.querySelector(".styles");
const stylePreview = document.querySelector(".style-preview-card");
const stylePreviewImage = document.querySelector(".style-preview__image");
const statusLabel = document.querySelector(".status__label");
const statusMeta = document.querySelector(".status__meta");
const statusConnection = document.querySelector(".status__connection");
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
const progressCloseButton = document.querySelector(".progress-close");
const settingsToggle = document.querySelector(".settings-toggle");
const fullscreenToggle = document.querySelector(".fullscreen-toggle");
const settingsModal = document.querySelector(".settings-modal");
const settingsComfyInput = document.querySelector(".settings-input--comfy");
const settingsComfyKeyInput = document.querySelector(".settings-input--comfy-key");
const settingsComfyCredits = document.querySelector(".settings-comfy-credits");
const settingsOrientationInput = document.querySelector(".settings-input--orientation");
const settingsCameraInput = document.querySelector(".settings-input--camera");
const settingsMirrorInput = document.querySelector(".settings-input--mirror");
const settingsPrinterInput = document.querySelector(".settings-input--printer");
const settingsPrinterDetails = document.querySelector(".settings-printer-details");
const settingsPrinterCopiesInput = document.querySelector(".settings-input--printer-copies");
const settingsFreeimageInput = document.querySelector(".settings-input--freeimage");
const settingsEnabledInput = document.querySelector(".settings-input--enabled");
const settingsHidePrintInput = document.querySelector(".settings-input--hide-print");
const settingsUploadsInput = document.querySelector(".settings-input--uploads");
const settingsHideQrInput = document.querySelector(".settings-input--hide-qr");
const settingsRemoteResultInput = document.querySelector(".settings-input--remote-result");
const settingsRemoteCameraInput = document.querySelector(".settings-input--remote-camera");
const settingsWatermarkInput = document.querySelector(".settings-input--watermark");
const settingsWatermarkPreview = document.querySelector(".settings-watermark__image");
const settingsWatermarkTextInput = document.querySelector(".settings-input--watermark-text");
const settingsWatermarkFileInput = document.querySelector(".settings-input--watermark-file");
const settingsWatermarkClear = document.querySelector(".settings-action--clear-watermark");
const settingsRemoteQr = document.querySelector(".settings-remote__qr");
const settingsRemoteLink = document.querySelector(".settings-remote__link");
const settingsSave = document.querySelector(".settings-action--save");
const settingsClose = document.querySelector(".settings-action--close");
const diagnosticsToggle = document.querySelector(".diagnostics-toggle");
const diagnosticsModal = document.querySelector(".diagnostics-modal");
const diagnosticsClose = document.querySelector(".diagnostics-close");
const diagnosticsRefresh = document.querySelector(".diagnostics-refresh");
const diagnosticsServer = document.querySelector(".diagnostics-value--server");
const diagnosticsSocket = document.querySelector(".diagnostics-value--socket");
const diagnosticsApi = document.querySelector(".diagnostics-value--api");
const diagnosticsUptime = document.querySelector(".diagnostics-value--uptime");
const galleryToggle = document.querySelector(".gallery-toggle");
const galleryModal = document.querySelector(".gallery-modal");
const galleryClose = document.querySelector(".gallery-close");
const galleryList = document.querySelector(".gallery-list");
const gallerySearch = document.querySelector(".gallery-search");
const gallerySort = document.querySelector(".gallery-sort");
const galleryMetaId = document.querySelector(".gallery-meta__value--id");
const galleryMetaDate = document.querySelector(".gallery-meta__value--date");
const galleryInputImage = document.querySelector(".gallery-image--input");
const galleryOutputImage = document.querySelector(".gallery-image--output");
const galleryUploadButton = document.querySelector(".gallery-action--upload");
const galleryPrintButton = document.querySelector(".gallery-action--print");
const galleryUploadStatus = document.querySelector(".gallery-upload-status");
const galleryQr = document.querySelector(".gallery-qr");
const galleryQrImage = document.querySelector(".gallery-qr-image");
const countdownOverlay = document.querySelector(".countdown-overlay");
const countdownValue = document.querySelector(".countdown-value");
const flashOverlay = document.querySelector(".flash-overlay");
const idleOverlay = document.querySelector(".idle-overlay");

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
let comfyApiKey = "";
let selectedGalleryUrl = "";
let galleryItems = [];
let galleryFilterText = "";
let gallerySortOrder = "recent";
let selectedDelay = 0;
let countdownTimer = null;
let countdownActive = false;
let remoteSocket = null;
let remoteSocketReconnect = null;
let lastRemoteProgress = { status: "ready", label: "Ready", percent: 0, complete: false };
let stylePreviewToken = 0;
let selectedGalleryId = "";
const defaultComfyServerUrl = "http://127.0.0.1:8188";
let comfyServerUrl = defaultComfyServerUrl;
let cameraOrientation = 0;
let cameraMirrored = false;
let cameraDeviceId = "";
let watermarkEnabled = false;
let watermarkCustomDataUrl = "";
let watermarkImageCache = { src: "", image: null };
let watermarkText = "MKRShift";
let uploadEnabled = true;
let hidePrintEnabled = false;
let hideQrEnabled = false;
let remoteResultEnabled = true;
let remoteCameraCaptureEnabled = false;
let knownPrinters = [];
const idleController = initIdleOverlay({ timeoutMs: 5 * 60 * 1000 });

function updateActionButtonState() {
  actionButton.disabled = !selectedStyle;
}

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

function normalizeComfyInput(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "";
  }
  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    return withProtocol;
  }
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

function setSelectedDelay(delaySeconds, { persist = true } = {}) {
  selectedDelay = Number(delaySeconds) || 0;
  if (persist) {
    writeStoredValue(storageKeys.selectedDelay, String(selectedDelay));
  }
  updateTimerLabel();
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
  if (!selectedStyle) {
    statusLabel.textContent = "Pick a Style";
    statusMeta.textContent = "Select a style before taking a selfie.";
    updateActionButtonState();
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
  remoteSocket.addEventListener("open", () => {
    if (selectedStyle) {
      sendRemoteMessage({ type: "style", style: selectedStyle, source: "booth" });
    }
    broadcastRemoteConfig();
  });
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
      if (payload?.type === "capture-image" && typeof payload.image === "string") {
        if (!remoteCameraCaptureEnabled) {
          return;
        }
        queueSelfieWithImage(payload.image, payload.source ?? "remote-camera");
      }
      if (payload?.type === "style" && typeof payload.style === "string") {
        applyStyleSelection(payload.style, { source: payload.source ?? "remote" });
      }
      if (payload?.type === "exit") {
        handleDoneAction();
      }
      if (payload?.type === "status-request") {
        if (selectedStyle) {
          sendRemoteMessage({ type: "style", style: selectedStyle, source: "booth" });
        }
        broadcastRemoteConfig();
        if (lastRemoteProgress) {
          sendRemoteMessage({ type: "progress", ...lastRemoteProgress, source: "booth" });
        }
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

function sendRemoteMessage(payload) {
  if (!remoteSocket || remoteSocket.readyState !== WebSocket.OPEN) {
    return;
  }
  remoteSocket.send(JSON.stringify(payload));
}


function broadcastRemoteConfig() {
  sendRemoteMessage({
    type: "remote-config",
    showResultOnRemote: remoteResultEnabled,
    allowRemoteCameraCapture: remoteCameraCaptureEnabled,
    source: "booth",
  });
}

function clearStylePreview() {
  if (!stylePreview || !stylePreviewImage) {
    return;
  }
  stylePreview.classList.remove("style-preview--visible");
  stylePreviewImage.removeAttribute("src");
}

function updateStylePreview(style) {
  if (!stylePreview || !stylePreviewImage) {
    return;
  }
  const trimmed = typeof style === "string" ? style.trim() : "";
  if (!trimmed) {
    clearStylePreview();
    return;
  }
  stylePreviewToken += 1;
  const token = stylePreviewToken;
  const previewUrl = `/api/style-preview?style=${encodeURIComponent(trimmed)}`;
  stylePreviewImage.onload = () => {
    if (token !== stylePreviewToken) {
      return;
    }
    stylePreview.classList.add("style-preview--visible");
  };
  stylePreviewImage.onerror = () => {
    if (token !== stylePreviewToken) {
      return;
    }
    clearStylePreview();
  };
  stylePreviewImage.src = previewUrl;
}

function applyStyleSelection(style, { source = "booth", announce = true } = {}) {
  const trimmed = typeof style === "string" ? style.trim() : "";
  if (!trimmed) {
    return;
  }
  selectedStyle = trimmed;
  writeStoredValue(storageKeys.selectedStyle, trimmed);
  updateActionButtonState();
  let matched = false;
  document.querySelectorAll(".style").forEach((button) => {
    const isMatch = button.dataset.style === trimmed;
    button.classList.toggle("style--active", isMatch);
    if (isMatch) {
      matched = true;
    }
  });
  if (matched) {
    updateStylePreview(trimmed);
  } else {
    clearStylePreview();
  }
  if (announce) {
    statusLabel.textContent = "Style Selected";
    statusMeta.textContent =
      source === "remote"
        ? `${toTitleCase(trimmed)} selected on remote`
        : `${toTitleCase(trimmed)} ready to shoot`;
  }
  return matched;
}

function updateRemoteProgress(payload) {
  const promptId = payload.promptId ?? currentPromptId ?? lastRemoteProgress?.promptId ?? null;
  const outputUrl = payload.outputUrl ?? lastRemoteProgress?.outputUrl ?? lastOutputUrl ?? null;
  lastRemoteProgress = { ...payload, promptId, comfyServerUrl, outputUrl };
  sendRemoteMessage({
    type: "progress",
    ...payload,
    promptId,
    comfyServerUrl,
    outputUrl,
    showResultOnRemote: remoteResultEnabled,
    source: "booth",
  });
}

async function updateRemoteInfo() {
  let remoteUrl = new URL("/remote", window.location.origin).toString();
  try {
    const response = await fetch("/api/remote-info");
    if (response.ok) {
      const data = await response.json();
      if (data?.remoteUrl) {
        remoteUrl = data.remoteUrl;
      }
    }
  } catch (error) {
    // ignore fetch errors
  }
  if (settingsRemoteQr) {
    settingsRemoteQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&color=58d68d&bgcolor=ffffff00&data=${encodeURIComponent(
      remoteUrl
    )}`;
  }
  if (settingsRemoteLink) {
    settingsRemoteLink.textContent = remoteUrl;
    settingsRemoteLink.href = remoteUrl;
  }
}


function stopCameraStream() {
  const stream = video.srcObject;
  if (!stream) {
    return;
  }
  stream.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
}

async function listCameraDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  } catch (error) {
    return [];
  }
}

function getCameraDeviceLabel(device, index) {
  const label = typeof device.label === "string" ? device.label.trim() : "";
  if (label) {
    return label;
  }
  return `Camera ${index + 1}`;
}

async function refreshCameraOptions() {
  if (!settingsCameraInput) {
    return;
  }
  const devices = await listCameraDevices();
  const preferredId = settingsCameraInput.value || cameraDeviceId;

  settingsCameraInput.innerHTML = '<option value="">Default camera</option>';
  devices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = getCameraDeviceLabel(device, index);
    settingsCameraInput.appendChild(option);
  });

  const hasPreferred = preferredId && devices.some((device) => device.deviceId === preferredId);
  settingsCameraInput.value = hasPreferred ? preferredId : "";

  if (!hasPreferred && cameraDeviceId && !devices.some((device) => device.deviceId === cameraDeviceId)) {
    cameraDeviceId = "";
    removeStoredValue(storageKeys.cameraDeviceId);
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    statusLabel.textContent = "Camera Unsupported";
    statusMeta.textContent = "This browser cannot access the camera.";
    return;
  }

  stopCameraStream();

  const primaryConstraints = cameraDeviceId
    ? { deviceId: { exact: cameraDeviceId } }
    : { facingMode: "user" };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: primaryConstraints,
      audio: false,
    });
    video.srcObject = stream;
    await refreshCameraOptions();
    statusLabel.textContent = "Camera Ready";
    statusMeta.textContent = "Select a style, then tap or shake to shoot";
  } catch (error) {
    const canFallback =
      cameraDeviceId && (error?.name === "OverconstrainedError" || error?.name === "NotFoundError");

    if (canFallback) {
      cameraDeviceId = "";
      removeStoredValue(storageKeys.cameraDeviceId);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        video.srcObject = fallbackStream;
        await refreshCameraOptions();
        statusLabel.textContent = "Camera Ready";
        statusMeta.textContent = "Selected camera unavailable; switched to default camera.";
        return;
      } catch (fallbackError) {
        // handled by generic error status below
      }
    }

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
  await queueSelfieWithImage(imageData, source);
}

async function queueSelfieWithImage(imageData, source = "tap") {
  if (isQueueing) {
    return;
  }
  if (!selectedStyle) {
    statusLabel.textContent = "Pick a Style";
    statusMeta.textContent = "Select a style before taking a selfie.";
    return;
  }
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
  progressCloseButton.disabled = true;
  statusLabel.textContent = "Queueing";
  statusMeta.textContent = `Sending ${toTitleCase(selectedStyle)} to ComfyUI (${source})`;
  updateRemoteProgress({
    status: "queueing",
    label: "Queueing",
    percent: 0,
    complete: false,
    outputUrl: null,
  });
  try {
    const response = await fetch("/api/selfie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        style: selectedStyle,
        image: imageData,
        comfyServerUrl,
        comfyApiKey: comfyApiKey || "",
        freeimageApiKey: freeimageApiKey || "",
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
    updateRemoteProgress({
      status: "queued",
      label: "Queued",
      percent: 0,
      complete: false,
      outputUrl: null,
    });
    startProgressPolling();
  } catch (error) {
    statusLabel.textContent = "Queue Failed";
    const details = error?.message ? ` ${error.message}` : "";
    statusMeta.textContent = `Unable to send workflow to ComfyUI.${details}`;
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
    progressCloseButton.disabled = false;
    updateRemoteProgress({
      status: "error",
      label: "Error",
      percent: 0,
      complete: false,
      outputUrl: null,
    });
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
  updateRemoteProgress({
    status: progress.complete ? "complete" : "generating",
    label,
    percent,
    complete: Boolean(progress.complete),
  });
  if (typeof progress.websocketConnected === "boolean") {
    updateComfyConnectionStatus(progress.websocketConnected);
  }
}

function updateComfyConnectionStatus(isConnected) {
  if (!statusConnection) {
    return;
  }
  statusConnection.textContent = isConnected ? "ComfyUI: Connected" : "ComfyUI: Offline";
  statusConnection.classList.toggle("status__connection--offline", !isConnected);
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function toggleSystemMenus() {
  document.body.classList.toggle("system-controls-hidden");
}

function formatUptime(seconds) {
  const totalSeconds = Number(seconds) || 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

async function fetchDiagnostics() {
  if (!diagnosticsServer || !diagnosticsSocket || !diagnosticsApi || !diagnosticsUptime) {
    return;
  }
  diagnosticsServer.textContent = "Loading...";
  diagnosticsSocket.textContent = "Loading...";
  diagnosticsApi.textContent = "Loading...";
  diagnosticsUptime.textContent = "Loading...";
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      throw new Error("Diagnostics unavailable");
    }
    const data = await response.json();
    diagnosticsServer.textContent = data.comfyServerUrl || "Unknown";
    diagnosticsSocket.textContent = data.websocketConnected ? "Connected" : "Offline";
    diagnosticsApi.textContent = data.apiKeyConfigured ? "Configured" : "Not set";
    diagnosticsUptime.textContent = formatUptime(data.uptimeSeconds);
    updateComfyConnectionStatus(Boolean(data.websocketConnected));
  } catch (error) {
    diagnosticsServer.textContent = "Unavailable";
    diagnosticsSocket.textContent = "Unavailable";
    diagnosticsApi.textContent = "Unavailable";
    diagnosticsUptime.textContent = "Unavailable";
    updateComfyConnectionStatus(false);
  }
}

function openDiagnostics() {
  if (!diagnosticsModal) {
    return;
  }
  diagnosticsModal.classList.add("diagnostics-modal--open");
  fetchDiagnostics();
}

function closeDiagnostics() {
  diagnosticsModal?.classList.remove("diagnostics-modal--open");
}

function toPrinterEntry(entry) {
  if (typeof entry === "string") {
    return {
      name: entry,
      connection: "unknown",
      isDefault: false,
      uri: "",
      location: "",
      interface: "",
      options: {},
    };
  }
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  if (!name) {
    return null;
  }
  return {
    name,
    connection: entry.connection || "unknown",
    isDefault: Boolean(entry.isDefault),
    uri: entry.uri || "",
    location: entry.location || "",
    interface: entry.interface || "",
    options: entry.options || {},
  };
}

function findPrinterByName(name) {
  return knownPrinters.find((printer) => printer.name === name) || null;
}

function formatPrinterDetails(printer) {
  if (!printer) {
    return "No printer selected.";
  }
  const lines = [
    `Connection: ${printer.connection || "unknown"}`,
    `URI/Port: ${printer.uri || "n/a"}`,
    `Location: ${printer.location || "n/a"}`,
    `Driver/Interface: ${printer.interface || "n/a"}`,
  ];
  const optionEntries = Object.entries(printer.options || {});
  if (optionEntries.length) {
    lines.push("Options:");
    optionEntries.slice(0, 8).forEach(([key, values]) => {
      const rendered = Array.isArray(values) ? values.join(", ") : String(values || "");
      lines.push(`• ${key}: ${rendered}`);
    });
  } else {
    lines.push("Options: none reported");
  }
  return lines.join("\n");
}

function updatePrinterDetails(selectedName) {
  if (!settingsPrinterDetails) {
    return;
  }
  const selectedPrinter = findPrinterByName(selectedName);
  settingsPrinterDetails.textContent = formatPrinterDetails(selectedPrinter);
}

function renderPrinterOptions(printers, selectedName) {
  const options = [];
  const seen = new Set();
  const sorted = [...printers].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach((printer) => {
    if (!printer?.name || seen.has(printer.name)) {
      return;
    }
    seen.add(printer.name);
    const tags = [];
    if (printer.isDefault) {
      tags.push("default");
    }
    if (printer.connection && printer.connection !== "unknown") {
      tags.push(printer.connection);
    }
    const suffix = tags.length ? ` (${tags.join(", ")})` : "";
    options.push({ name: printer.name, label: `${printer.name}${suffix}` });
  });
  if (selectedName && !seen.has(selectedName)) {
    options.unshift({ name: selectedName, label: `${selectedName} (saved)` });
  }
  settingsPrinterInput.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = options.length ? "Select a printer" : "No printers detected";
  settingsPrinterInput.appendChild(placeholder);
  options.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.name;
    option.textContent = entry.label;
    settingsPrinterInput.appendChild(option);
  });
  settingsPrinterInput.value = selectedName || "";
  updatePrinterDetails(settingsPrinterInput.value || selectedName || "");
}

async function loadPrinters(selectedName = printerConfig.name) {
  try {
    const response = await fetch("/api/printers");
    if (!response.ok) {
      throw new Error("Printer list unavailable");
    }
    const data = await response.json();
    const detailed = Array.isArray(data.printerDetails) ? data.printerDetails : data.printers;
    knownPrinters = (Array.isArray(detailed) ? detailed : [])
      .map((entry) => toPrinterEntry(entry))
      .filter(Boolean);
  } catch (error) {
    knownPrinters = [];
  }
  renderPrinterOptions(knownPrinters, selectedName);
}

function applyUploadVisibility() {
  document.body.classList.toggle("is-upload-hidden", !uploadEnabled);
  document.body.classList.toggle("is-qr-hidden", hideQrEnabled);
  uploadButton.disabled = !uploadEnabled || !outputReady;
  if (galleryUploadButton) {
    galleryUploadButton.disabled = !uploadEnabled || !selectedGalleryUrl;
  }
  if (!uploadEnabled || hideQrEnabled) {
    qrContainer.style.display = "none";
    qrImage.src = "";
    galleryUploadStatus.textContent = "";
    galleryQr.style.display = "none";
    galleryQrImage.src = "";
  }
}

function applyPrintVisibility() {
  document.body.classList.toggle("is-print-hidden", hidePrintEnabled);
  if (printButton) {
    printButton.disabled =
      hidePrintEnabled || !printerConfig.enabled || !printerConfig.name || !outputReady;
  }
  if (galleryPrintButton) {
    galleryPrintButton.disabled =
      hidePrintEnabled || !printerConfig.enabled || !printerConfig.name || !selectedGalleryUrl;
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
      const headers = comfyApiKey ? { "x-comfy-api-key": comfyApiKey } : {};
      const response = await fetch(
        `/api/progress?promptId=${encodeURIComponent(
          currentPromptId
        )}&comfyServerUrl=${encodeURIComponent(comfyServerUrl)}`,
        { headers }
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
        uploadButton.disabled = !uploadEnabled;
        applyPrintVisibility();
        doneButton.disabled = false;
        progressCloseButton.disabled = false;
        updateRemoteProgress({
          status: "complete",
          label: "Complete",
          percent: 100,
          complete: true,
        });
      }
    } catch (error) {
      progressLabels.forEach((element) => {
        element.textContent = "Waiting";
      });
      updateRemoteProgress({
        status: "waiting",
        label: "Waiting",
        percent: 0,
        complete: false,
      });
    }
  }, 1200);
}

function setBusy(isBusy) {
  if (isBusy) {
    appRoot.classList.add("app--busy");
    idleController.pause();
    updateRemoteProgress({
      status: "busy",
      label: "Processing",
      percent: 0,
      complete: false,
    });
    return;
  }
  appRoot.classList.remove("app--busy");
  idleController.resume();
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
  progressCloseButton.disabled = true;
  if (progressPoller) {
    clearInterval(progressPoller);
    progressPoller = null;
  }
  currentPromptId = null;
  outputReady = false;
  lastOutputUrl = null;
  lastRemoteProgress = {
    status: "ready",
    label: "Ready",
    percent: 0,
    complete: false,
  };
  updateRemoteProgress(lastRemoteProgress);
}

function loadPrinterConfig() {
  try {
    const storedPrinterConfig = readStoredJson(storageKeys.printerConfig, null);
    if (storedPrinterConfig && typeof storedPrinterConfig === "object") {
      printerConfig = storedPrinterConfig;
    }
    if (!Number.isFinite(Number(printerConfig.copies)) || Number(printerConfig.copies) <= 0) {
      printerConfig.copies = 1;
    }
    const freeimageRaw = readStoredValue(storageKeys.freeimageApiKey);
    if (freeimageRaw) {
      freeimageApiKey = freeimageRaw;
    }
    const comfyKeyRaw = readStoredValue(storageKeys.comfyApiKey);
    if (comfyKeyRaw) {
      comfyApiKey = comfyKeyRaw;
    }
    const comfyRaw = readStoredValue(storageKeys.comfyServerUrl);
    if (comfyRaw) {
      comfyServerUrl = normalizeComfyInput(comfyRaw) || comfyRaw;
    }
    const orientationRaw = readStoredValue(storageKeys.cameraOrientation);
    if (orientationRaw) {
      cameraOrientation = Number(orientationRaw) || 0;
    }
    const mirrorRaw = readStoredValue(storageKeys.cameraMirrored);
    if (mirrorRaw !== null) {
      cameraMirrored = mirrorRaw === "true";
    }
    const cameraDeviceRaw = readStoredValue(storageKeys.cameraDeviceId);
    if (cameraDeviceRaw) {
      cameraDeviceId = cameraDeviceRaw;
    }
    const watermarkRaw = readStoredValue(storageKeys.watermarkEnabled);
    if (watermarkRaw !== null) {
      watermarkEnabled = watermarkRaw === "true";
    }
    const watermarkCustomRaw = readStoredValue(storageKeys.watermarkCustomDataUrl);
    if (watermarkCustomRaw) {
      watermarkCustomDataUrl = watermarkCustomRaw;
    }
    const watermarkTextRaw = readStoredValue(storageKeys.watermarkText);
    if (watermarkTextRaw) {
      watermarkText = watermarkTextRaw;
    }
    const uploadRaw = readStoredValue(storageKeys.uploadEnabled);
    if (uploadRaw !== null) {
      uploadEnabled = uploadRaw === "true";
    }
    const hidePrintRaw = readStoredValue(storageKeys.hidePrintEnabled);
    if (hidePrintRaw !== null) {
      hidePrintEnabled = hidePrintRaw === "true";
    }
    const hideQrRaw = readStoredValue(storageKeys.hideQrEnabled);
    if (hideQrRaw !== null) {
      hideQrEnabled = hideQrRaw === "true";
    }
    const remoteResultRaw = readStoredValue(storageKeys.remoteResultEnabled);
    if (remoteResultRaw !== null) {
      remoteResultEnabled = remoteResultRaw === "true";
    }
    const remoteCameraRaw = readStoredValue(storageKeys.remoteCameraCaptureEnabled);
    if (remoteCameraRaw !== null) {
      remoteCameraCaptureEnabled = remoteCameraRaw === "true";
    }
  } catch (error) {
    printerConfig = { name: "", enabled: false, copies: 1 };
    freeimageApiKey = "";
    comfyApiKey = "";
    comfyServerUrl = defaultComfyServerUrl;
    cameraOrientation = 0;
    cameraMirrored = false;
    cameraDeviceId = "";
    watermarkEnabled = false;
    watermarkCustomDataUrl = "";
    watermarkImageCache = { src: "", image: null };
    watermarkText = "MKRShift";
    uploadEnabled = true;
    hidePrintEnabled = false;
    hideQrEnabled = false;
    remoteResultEnabled = true;
    remoteCameraCaptureEnabled = false;
  }
  settingsComfyInput.value = comfyServerUrl || defaultComfyServerUrl;
  settingsComfyKeyInput.value = comfyApiKey || "";
  settingsOrientationInput.value = String(cameraOrientation || 0);
  if (settingsCameraInput) {
    settingsCameraInput.value = cameraDeviceId || "";
  }
  if (settingsMirrorInput) {
    settingsMirrorInput.checked = cameraMirrored;
  }
  settingsPrinterInput.value = printerConfig.name || "";
  settingsPrinterCopiesInput.value = String(printerConfig.copies || 1);
  settingsEnabledInput.checked = Boolean(printerConfig.enabled);
  if (settingsHidePrintInput) {
    settingsHidePrintInput.checked = hidePrintEnabled;
  }
  settingsFreeimageInput.value = freeimageApiKey || "";
  settingsUploadsInput.checked = uploadEnabled;
  if (settingsHideQrInput) {
    settingsHideQrInput.checked = hideQrEnabled;
  }
  if (settingsRemoteResultInput) {
    settingsRemoteResultInput.checked = remoteResultEnabled;
  }
  if (settingsRemoteCameraInput) {
    settingsRemoteCameraInput.checked = remoteCameraCaptureEnabled;
  }
  settingsWatermarkInput.checked = watermarkEnabled;
  if (settingsWatermarkTextInput) {
    settingsWatermarkTextInput.value = watermarkText || "MKRShift";
  }
  if (settingsWatermarkClear) {
    settingsWatermarkClear.disabled = !watermarkCustomDataUrl;
  }
  renderWatermarkPreview();
  applyPrintVisibility();
  applyCameraOrientation();
  updateRemoteInfo();
  applyUploadVisibility();
  loadPrinters(printerConfig.name);
}

function loadUiPreferences() {
  try {
    const storedDelay = Number(readStoredValue(storageKeys.selectedDelay));
    if (Number.isFinite(storedDelay)) {
      setSelectedDelay(storedDelay, { persist: false });
    }
    const storedStyle = readStoredValue(storageKeys.selectedStyle);
    if (storedStyle) {
      selectedStyle = storedStyle;
    }
  } catch (error) {
    selectedDelay = 0;
    selectedStyle = null;
  }
}

async function savePrinterConfig() {
  const copies = Number(settingsPrinterCopiesInput.value) || 1;
  printerConfig = {
    name: settingsPrinterInput.value.trim(),
    enabled: settingsEnabledInput.checked,
    copies: Math.max(1, Math.floor(copies)),
  };
  writeStoredJson(storageKeys.printerConfig, printerConfig);
  freeimageApiKey = settingsFreeimageInput.value.trim();
  writeStoredValue(storageKeys.freeimageApiKey, freeimageApiKey);
  comfyApiKey = settingsComfyKeyInput.value.trim();
  writeStoredValue(storageKeys.comfyApiKey, comfyApiKey);
  const normalizedComfy = normalizeComfyInput(settingsComfyInput.value);
  comfyServerUrl = normalizedComfy || defaultComfyServerUrl;
  writeStoredValue(storageKeys.comfyServerUrl, comfyServerUrl);
  cameraOrientation = Number(settingsOrientationInput.value) || 0;
  writeStoredValue(storageKeys.cameraOrientation, String(cameraOrientation));
  if (settingsMirrorInput) {
    cameraMirrored = settingsMirrorInput.checked;
    writeStoredValue(storageKeys.cameraMirrored, String(cameraMirrored));
  }
  const selectedCameraDevice = settingsCameraInput?.value || "";
  const cameraChanged = selectedCameraDevice !== cameraDeviceId;
  cameraDeviceId = selectedCameraDevice;
  if (cameraDeviceId) {
    writeStoredValue(storageKeys.cameraDeviceId, cameraDeviceId);
  } else {
    removeStoredValue(storageKeys.cameraDeviceId);
  }
  watermarkEnabled = settingsWatermarkInput.checked;
  writeStoredValue(storageKeys.watermarkEnabled, String(watermarkEnabled));
  if (settingsWatermarkTextInput) {
    watermarkText = settingsWatermarkTextInput.value.trim() || "MKRShift";
    writeStoredValue(storageKeys.watermarkText, watermarkText);
  }
  renderWatermarkPreview();
  uploadEnabled = settingsUploadsInput.checked;
  writeStoredValue(storageKeys.uploadEnabled, String(uploadEnabled));
  if (settingsHidePrintInput) {
    hidePrintEnabled = settingsHidePrintInput.checked;
    writeStoredValue(storageKeys.hidePrintEnabled, String(hidePrintEnabled));
  }
  if (settingsHideQrInput) {
    hideQrEnabled = settingsHideQrInput.checked;
    writeStoredValue(storageKeys.hideQrEnabled, String(hideQrEnabled));
  }
  if (settingsRemoteResultInput) {
    remoteResultEnabled = settingsRemoteResultInput.checked;
    writeStoredValue(storageKeys.remoteResultEnabled, String(remoteResultEnabled));
  }
  if (settingsRemoteCameraInput) {
    remoteCameraCaptureEnabled = settingsRemoteCameraInput.checked;
    writeStoredValue(storageKeys.remoteCameraCaptureEnabled, String(remoteCameraCaptureEnabled));
  }
  applyPrintVisibility();
  applyCameraOrientation();
  applyUploadVisibility();
  broadcastRemoteConfig();
  updateRemoteProgress(lastRemoteProgress);
  if (cameraChanged) {
    await startCamera();
  }
  await refreshHostedCredits();
}

async function refreshHostedCredits() {
  if (!settingsComfyCredits) {
    return;
  }
  const endpointInput = settingsComfyInput?.value?.trim?.() || comfyServerUrl || "";
  const keyInput = settingsComfyKeyInput?.value?.trim?.() || comfyApiKey || "";
  if (!endpointInput || !/comfy\.icu|\/api\/v1\/workflows/i.test(endpointInput)) {
    settingsComfyCredits.textContent = "Remaining credits: n/a (not hosted)";
    return;
  }
  if (!keyInput) {
    settingsComfyCredits.textContent = "Remaining credits: add API key";
    return;
  }
  settingsComfyCredits.textContent = "Remaining credits: checking...";
  try {
    const response = await fetch(
      `/api/comfy-credits?comfyServerUrl=${encodeURIComponent(endpointInput)}`,
      {
        headers: {
          "x-comfy-api-key": keyInput,
        },
      }
    );
    if (!response.ok) {
      throw new Error("lookup failed");
    }
    const payload = await response.json();
    if (!payload?.hosted) {
      settingsComfyCredits.textContent = "Remaining credits: n/a (not hosted)";
      return;
    }
    if (Number.isFinite(Number(payload?.credits))) {
      settingsComfyCredits.textContent = `Remaining credits: ${Number(payload.credits)}`;
      return;
    }
    settingsComfyCredits.textContent = "Remaining credits: unavailable";
  } catch (error) {
    settingsComfyCredits.textContent = "Remaining credits: unavailable";
  }
}

async function openSettings() {
  if (!settingsModal) {
    return;
  }
  settingsModal.classList.add("settings-modal--open");
  if (settingsClose) {
    settingsClose.disabled = false;
  }
  loadPrinters(printerConfig.name);
  await refreshCameraOptions();
  await refreshHostedCredits();
}

function handlePrinterSelection() {
  const selectedName = settingsPrinterInput.value.trim();
  printerConfig = {
    ...printerConfig,
    name: selectedName,
  };
  writeStoredJson(storageKeys.printerConfig, printerConfig);
  updatePrinterDetails(selectedName);
  applyPrintVisibility();
}

function closeSettings() {
  settingsModal?.classList.remove("settings-modal--open");
}

function openGallery() {
  if (!galleryModal) {
    return;
  }
  galleryModal.classList.add("gallery-modal--open");
  galleryUploadStatus.textContent = "";
  if (galleryQr) {
    galleryQr.style.display = "none";
  }
  if (galleryQrImage) {
    galleryQrImage.src = "";
  }
  galleryFilterText = "";
  if (gallerySearch) {
    gallerySearch.value = "";
  }
  if (gallerySort) {
    gallerySort.value = gallerySortOrder;
  }
  loadGallery();
}

function closeGallery() {
  galleryModal?.classList.remove("gallery-modal--open");
}

function setGallerySelection(item) {
  if (!item) {
    selectedGalleryUrl = "";
    selectedGalleryId = "";
    if (galleryMetaId) {
      galleryMetaId.textContent = "—";
    }
    if (galleryMetaDate) {
      galleryMetaDate.textContent = "—";
    }
    updateGallerySelectionHighlight();
    galleryUploadButton.disabled = true;
    if (galleryPrintButton) {
      galleryPrintButton.disabled = true;
    }
    return;
  }
  selectedGalleryUrl = item.outputUrl;
  selectedGalleryId = item.id;
  if (galleryMetaId) {
    galleryMetaId.textContent = item.id;
  }
  if (galleryMetaDate) {
    galleryMetaDate.textContent = new Date(item.updatedAt).toLocaleString();
  }
  galleryInputImage.src = item.inputUrl;
  galleryOutputImage.src = item.outputUrl;
  updateGallerySelectionHighlight();
  galleryUploadButton.disabled = !uploadEnabled;
  applyPrintVisibility();
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
  } else {
    video.style.top = "";
    video.style.left = "";
    video.style.width = "";
    video.style.height = "";
  }
  const mirrorValue = cameraMirrored ? " scaleX(-1)" : "";
  if (orientation) {
    video.style.transform = `translate(-50%, -50%) rotate(${orientation}deg)${mirrorValue}`;
  } else {
    video.style.transform = mirrorValue ? `scaleX(-1)` : "";
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
    row.dataset.id = item.id;
    row.setAttribute("aria-pressed", "false");
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

function applyGalleryFilters() {
  const filtered = galleryItems.filter((item) => {
    if (!galleryFilterText) {
      return true;
    }
    return item.id.toLowerCase().includes(galleryFilterText);
  });
  const sorted = [...filtered].sort((a, b) => {
    if (gallerySortOrder === "oldest") {
      return a.updatedAt - b.updatedAt;
    }
    return b.updatedAt - a.updatedAt;
  });
  renderGalleryItems(sorted);
}

function updateGallerySelectionHighlight() {
  const items = Array.from(galleryList.querySelectorAll(".gallery-item"));
  items.forEach((item) => {
    const isActive = item.dataset.id === selectedGalleryId;
    item.classList.toggle("gallery-item--active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
}

async function loadGallery() {
  try {
    const response = await fetch("/api/gallery");
    if (!response.ok) {
      throw new Error("Gallery unavailable");
    }
    const data = await response.json();
    galleryItems = data.items ?? [];
    applyGalleryFilters();
  } catch (error) {
    galleryItems = [];
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

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

async function getWatermarkImage() {
  if (!watermarkCustomDataUrl) {
    return null;
  }
  if (watermarkImageCache.src === watermarkCustomDataUrl && watermarkImageCache.image) {
    return watermarkImageCache.image;
  }
  const image = await loadImageElement(watermarkCustomDataUrl);
  watermarkImageCache = { src: watermarkCustomDataUrl, image };
  return image;
}

async function drawWatermark(ctx, width, height, { opacity = 1 } = {}) {
  const margin = Math.round(width * 0.035);
  const boxFill = "rgba(0, 0, 0, 0.72)";
  ctx.save();
  ctx.globalAlpha = opacity;
  let useTextWatermark = !watermarkCustomDataUrl;
  if (watermarkCustomDataUrl) {
    try {
      const watermarkImage = await getWatermarkImage();
      if (watermarkImage) {
        const maxWidth = width * 0.3;
        const maxHeight = height * 0.18;
        const scale = Math.min(
          maxWidth / watermarkImage.width,
          maxHeight / watermarkImage.height,
          1,
        );
        const wmWidth = watermarkImage.width * scale;
        const wmHeight = watermarkImage.height * scale;
        const padding = Math.round(Math.max(wmWidth, wmHeight) * 0.12);
        const boxWidth = wmWidth + padding * 2;
        const boxHeight = wmHeight + padding * 2;
        const x = width - margin - boxWidth;
        const y = height - margin - boxHeight;
        drawRoundedRect(ctx, x, y, boxWidth, boxHeight, Math.round(boxHeight * 0.3));
        ctx.fillStyle = boxFill;
        ctx.fill();
        ctx.drawImage(watermarkImage, x + padding, y + padding, wmWidth, wmHeight);
        useTextWatermark = false;
      } else {
        useTextWatermark = true;
      }
    } catch (error) {
      useTextWatermark = true;
    }
  }
  if (useTextWatermark) {
    const text = watermarkText || "MKRShift";
    const fontSize = Math.max(18, Math.round(width * 0.045));
    ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
    const metrics = ctx.measureText(text);
    const textHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || fontSize;
    const paddingX = Math.round(fontSize * 0.7);
    const paddingY = Math.round(fontSize * 0.5);
    const boxWidth = metrics.width + paddingX * 2;
    const boxHeight = textHeight + paddingY * 2;
    const x = width - margin - boxWidth;
    const y = height - margin - boxHeight;
    drawRoundedRect(ctx, x, y, boxWidth, boxHeight, Math.round(boxHeight * 0.3));
    ctx.fillStyle = boxFill;
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, x + paddingX, y + paddingY + (metrics.actualBoundingBoxAscent || fontSize));
  }
  ctx.restore();
}

function renderWatermarkPreview() {
  if (!settingsWatermarkPreview) {
    return;
  }
  const width = 420;
  const height = 240;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1a2130");
  gradient.addColorStop(1, "#0b0f16");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  const opacity = watermarkEnabled ? 1 : 0.45;
  drawWatermark(ctx, width, height, { opacity })
    .catch(() => {})
    .finally(() => {
      settingsWatermarkPreview.src = canvas.toDataURL("image/png");
    });
}

function setWatermarkCustomDataUrl(value) {
  watermarkCustomDataUrl = value;
  watermarkImageCache = { src: "", image: null };
  if (watermarkCustomDataUrl) {
    writeStoredValue(storageKeys.watermarkCustomDataUrl, watermarkCustomDataUrl);
  } else {
    removeStoredValue(storageKeys.watermarkCustomDataUrl);
  }
  if (settingsWatermarkClear) {
    settingsWatermarkClear.disabled = !watermarkCustomDataUrl;
  }
  renderWatermarkPreview();
}

function handleWatermarkFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      setWatermarkCustomDataUrl(reader.result);
      if (settingsWatermarkFileInput) {
        settingsWatermarkFileInput.value = "";
      }
    }
  };
  reader.readAsDataURL(file);
}

function clearCustomWatermark() {
  setWatermarkCustomDataUrl("");
  if (settingsWatermarkFileInput) {
    settingsWatermarkFileInput.value = "";
  }
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
  await drawWatermark(ctx, width, height, { opacity: 1 });
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
  if (!uploadEnabled) {
    return;
  }
  uploadButton.disabled = true;
  try {
    const imageUrl = await resolveShareImageUrl(lastOutputUrl);
    const data = await uploadImage(imageUrl);
    if (data.qrUrl && !hideQrEnabled) {
      qrImage.src = data.qrUrl;
      qrContainer.style.display = "flex";
    }
    statusLabel.textContent = "Upload Complete";
    statusMeta.textContent = "Scan the QR code to view the image.";
  } catch (error) {
    statusLabel.textContent = "Upload Failed";
    statusMeta.textContent = error?.message || "Unable to upload the image.";
  } finally {
    uploadButton.disabled = !uploadEnabled || !outputReady;
  }
}

async function uploadGallerySelection() {
  if (!selectedGalleryUrl) {
    return;
  }
  if (!uploadEnabled) {
    return;
  }
  galleryUploadButton.disabled = true;
  galleryUploadStatus.textContent = "Uploading...";
  try {
    const imageUrl = await resolveShareImageUrl(selectedGalleryUrl);
    const data = await uploadImage(imageUrl);
    if (data.qrUrl && !hideQrEnabled) {
      galleryQrImage.src = data.qrUrl;
      galleryQr.style.display = "flex";
    }
    galleryUploadStatus.textContent = "Upload complete.";
  } catch (error) {
    galleryUploadStatus.textContent = error?.message || "Upload failed.";
  } finally {
    galleryUploadButton.disabled = !uploadEnabled;
  }
}

async function printGallerySelection() {
  if (!selectedGalleryUrl || !printerConfig.enabled || !printerConfig.name) {
    return;
  }
  if (hidePrintEnabled) {
    return;
  }
  galleryPrintButton.disabled = true;
  galleryUploadStatus.textContent = "Sending to printer...";
  try {
    const imageUrl = await resolveShareImageUrl(selectedGalleryUrl);
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
    galleryUploadStatus.textContent = `Sent to printer ${printerConfig.name}`;
  } catch (error) {
    galleryUploadStatus.textContent = error?.message || "Print failed.";
  } finally {
    applyPrintVisibility();
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
    statusMeta.textContent = error?.message || "Printer not configured or unavailable.";
  } finally {
    applyPrintVisibility();
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
      button.dataset.style = style;
      button.addEventListener("click", () => {
        applyStyleSelection(style, { source: "booth" });
        sendRemoteMessage({ type: "style", style, source: "booth" });
      });
      stylesContainer.appendChild(button);
    });
    if (selectedStyle) {
      applyStyleSelection(selectedStyle, { announce: false });
    }
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
    setSelectedDelay(Number(option.dataset.delay) || 0);
    closeTimerMenu();
  });
});
document.addEventListener("click", () => {
  if (timerMenu.classList.contains("timer-menu--open")) {
    closeTimerMenu();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "m" && !isEditableTarget(event.target)) {
    toggleSystemMenus();
    return;
  }
  if (event.key !== "Escape") {
    return;
  }
  if (timerMenu.classList.contains("timer-menu--open")) {
    closeTimerMenu();
  }
  if (settingsModal.classList.contains("settings-modal--open")) {
    closeSettings();
  }
  if (galleryModal.classList.contains("gallery-modal--open")) {
    closeGallery();
  }
  if (diagnosticsModal?.classList.contains("diagnostics-modal--open")) {
    closeDiagnostics();
  }
});
settingsModal?.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    closeSettings();
  }
});
galleryModal?.addEventListener("click", (event) => {
  if (event.target === galleryModal) {
    closeGallery();
  }
});
diagnosticsModal?.addEventListener("click", (event) => {
  if (event.target === diagnosticsModal) {
    closeDiagnostics();
  }
});
settingsToggle?.addEventListener("click", () => openSettings());
diagnosticsToggle?.addEventListener("click", () => openDiagnostics());
fullscreenToggle?.addEventListener("click", toggleFullscreen);
settingsPrinterInput?.addEventListener("change", handlePrinterSelection);
settingsMirrorInput?.addEventListener("change", () => {
  cameraMirrored = settingsMirrorInput.checked;
  writeStoredValue(storageKeys.cameraMirrored, String(cameraMirrored));
  applyCameraOrientation();
});
settingsCameraInput?.addEventListener("change", async () => {
  const nextCameraId = settingsCameraInput.value || "";
  if (nextCameraId === cameraDeviceId) {
    return;
  }
  cameraDeviceId = nextCameraId;
  if (cameraDeviceId) {
    writeStoredValue(storageKeys.cameraDeviceId, cameraDeviceId);
  } else {
    removeStoredValue(storageKeys.cameraDeviceId);
  }
  await startCamera();
});
settingsWatermarkInput?.addEventListener("change", renderWatermarkPreview);
settingsWatermarkTextInput?.addEventListener("input", () => {
  watermarkText = settingsWatermarkTextInput.value.trim() || "MKRShift";
  writeStoredValue(storageKeys.watermarkText, watermarkText);
  renderWatermarkPreview();
});
settingsWatermarkFileInput?.addEventListener("change", handleWatermarkFileChange);
settingsWatermarkClear?.addEventListener("click", clearCustomWatermark);
settingsSave?.addEventListener("click", async () => {
  await savePrinterConfig();
  closeSettings();
});
settingsClose?.addEventListener("click", closeSettings);
diagnosticsClose?.addEventListener("click", closeDiagnostics);
diagnosticsRefresh?.addEventListener("click", fetchDiagnostics);
galleryToggle?.addEventListener("click", openGallery);
galleryClose?.addEventListener("click", closeGallery);
gallerySearch?.addEventListener("input", (event) => {
  galleryFilterText = event.target.value.trim().toLowerCase();
  applyGalleryFilters();
});
gallerySort?.addEventListener("change", (event) => {
  gallerySortOrder = event.target.value;
  applyGalleryFilters();
});
galleryUploadButton.addEventListener("click", uploadGallerySelection);
galleryPrintButton?.addEventListener("click", printGallerySelection);
uploadButton.addEventListener("click", uploadToFreeimage);
printButton.addEventListener("click", sendToPrinter);
doneButton.addEventListener("click", () => {
  handleDoneAction();
});
progressCloseButton.addEventListener("click", () => {
  handleDoneAction();
});
window.addEventListener("devicemotion", handleShake);
window.addEventListener("resize", applyCameraOrientation);
["pointerdown", "mousemove", "keydown", "touchstart", "wheel"].forEach((eventName) => {
  window.addEventListener(eventName, idleController.handleUserActivity, { passive: true });
});
idleOverlay?.addEventListener("click", (event) => {
  if (idleOverlay.classList.contains("idle-overlay--hidden")) {
    return;
  }
  idleController.hide();
  requestAnimationFrame(() => {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (target && target !== idleOverlay) {
      target.click();
    }
  });
});

startCamera();
loadUiPreferences();
loadStyles();
loadPrinterConfig();
updateTimerLabel();
updateActionButtonState();
progressCloseButton.disabled = true;
connectRemoteSocket();
idleController.loadImages();
idleController.schedule();

function handleDoneAction() {
  if (isQueueing) {
    return;
  }
  setBusy(false);
  statusLabel.textContent = "Ready";
  statusMeta.textContent = "Select a style, then tap or shake to shoot";
}
