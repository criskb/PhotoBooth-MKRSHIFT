const video = document.querySelector("#camera");
const stylesContainer = document.querySelector(".styles");
const statusLabel = document.querySelector(".status__label");
const statusMeta = document.querySelector(".status__meta");
const actionButton = document.querySelector(".action");
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
const settingsPrinterInput = document.querySelector(".settings-input--printer");
const settingsFreeimageInput = document.querySelector(".settings-input--freeimage");
const settingsEnabledInput = document.querySelector(".settings-input--enabled");
const settingsSave = document.querySelector(".settings-action--save");
const settingsClose = document.querySelector(".settings-action--close");
const galleryToggle = document.querySelector(".gallery-toggle");
const galleryModal = document.querySelector(".gallery-modal");
const galleryClose = document.querySelector(".gallery-close");
const galleryList = document.querySelector(".gallery-list");
const galleryInputImage = document.querySelector(".gallery-image--input");
const galleryOutputImage = document.querySelector(".gallery-image--output");

let selectedStyle = null;
let isQueueing = false;
let lastShake = 0;
let motionPermissionGranted = false;
let currentPromptId = null;
let progressPoller = null;
let outputReady = false;
let lastOutputUrl = null;
let printerConfig = { name: "", enabled: false };
let freeimageApiKey = "";

function toTitleCase(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
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
      body: JSON.stringify({ style: selectedStyle, image: imageData }),
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
    progressPreviews.forEach((element) => {
      element.src = progress.outputUrl;
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
      const response = await fetch(`/api/progress?promptId=${encodeURIComponent(currentPromptId)}`);
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
    const freeimageRaw = localStorage.getItem("freeimageApiKey");
    if (freeimageRaw) {
      freeimageApiKey = freeimageRaw;
    }
  } catch (error) {
    printerConfig = { name: "", enabled: false };
    freeimageApiKey = "";
  }
  settingsPrinterInput.value = printerConfig.name || "";
  settingsEnabledInput.checked = Boolean(printerConfig.enabled);
  settingsFreeimageInput.value = freeimageApiKey || "";
  printButton.disabled = !printerConfig.enabled || !printerConfig.name || !outputReady;
}

function savePrinterConfig() {
  printerConfig = {
    name: settingsPrinterInput.value.trim(),
    enabled: settingsEnabledInput.checked,
  };
  localStorage.setItem("printerConfig", JSON.stringify(printerConfig));
  freeimageApiKey = settingsFreeimageInput.value.trim();
  localStorage.setItem("freeimageApiKey", freeimageApiKey);
  printButton.disabled = !printerConfig.enabled || !printerConfig.name || !outputReady;
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
  loadGallery();
}

function closeGallery() {
  galleryModal.classList.remove("gallery-modal--open");
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
      galleryInputImage.src = item.inputUrl;
      galleryOutputImage.src = item.outputUrl;
    });
    galleryList.appendChild(row);
  });
  galleryInputImage.src = items[0].inputUrl;
  galleryOutputImage.src = items[0].outputUrl;
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

async function uploadToFreeimage() {
  if (!lastOutputUrl) {
    return;
  }
  uploadButton.disabled = true;
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: lastOutputUrl, apiKey: freeimageApiKey }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Upload failed");
    }
    const data = await response.json();
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

async function sendToPrinter() {
  if (!lastOutputUrl || !printerConfig.enabled || !printerConfig.name) {
    return;
  }
  printButton.disabled = true;
  try {
    const response = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: lastOutputUrl,
        printerName: printerConfig.name,
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
  queueSelfie("tap");
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

startCamera();
loadStyles();
loadPrinterConfig();
