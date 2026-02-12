const timerButtons = Array.from(document.querySelectorAll(".remote-timer"));
const actionButton = document.querySelector(".remote-action");
const statusLabel = document.querySelector(".remote-status");
const styleList = document.querySelector(".remote-style-list");
const styleDrawer = document.querySelector(".remote-style-drawer");
const styleDrawerBackdrop = document.querySelector(".remote-style-drawer-backdrop");
const styleDrawerToggle = document.querySelector(".remote-styles-toggle");
const styleDrawerClose = document.querySelector(".remote-style-drawer__close");
const styleStatus = document.querySelector(".remote-style-status");
const stylePreview = document.querySelector(".remote-style-preview");
const stylePreviewImage = document.querySelector(".remote-style-preview__image");
const progressLabel = document.querySelector(".remote-progress__label");
const progressValue = document.querySelector(".remote-progress__value");
const progressFill = document.querySelector(".remote-progress__fill");
const exitButton = document.querySelector(".remote-exit");
const remoteResultSection = document.querySelector(".remote-result");
const remoteResultImage = document.querySelector(".remote-result__image");
const remoteResultSave = document.querySelector(".remote-result__save");
const remoteCameraSection = document.querySelector(".remote-camera");
const remoteCameraToggle = document.querySelector(".remote-camera-toggle");
const remoteCameraPreview = document.querySelector(".remote-camera-preview");
const remoteCameraCapture = document.querySelector(".remote-camera-capture");
const remoteCameraStatus = document.querySelector(".remote-camera-status");
const remoteCameraSelect = document.querySelector(".remote-camera-select");

let selectedDelay = 0;
let socket = null;
let reconnectTimer = null;
let selectedStyle = null;
let remoteBusy = false;
let currentPromptId = null;
let progressPoller = null;
let comfyServerUrl = "";
let resultReady = false;
let stylePreviewToken = 0;
let showResultOnRemote = true;
let allowRemoteCameraCapture = false;
let phoneCameraStream = null;
let availableCameraDevices = [];
let selectedRemoteCameraDeviceId = "";
const remotePreferenceKeys = {
  selectedDelay: "remoteSelectedDelay",
  selectedStyle: "remoteSelectedStyle",
  selectedCameraDevice: "remoteCameraDeviceId",
};


function getCameraDeviceLabel(device, index) {
  const label = typeof device.label === "string" ? device.label.trim() : "";
  if (label) {
    return label;
  }
  return `Camera ${index + 1}`;
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

function renderCameraSelectOptions() {
  if (!remoteCameraSelect) {
    return;
  }
  const preferred = selectedRemoteCameraDeviceId || remoteCameraSelect.value || "";
  remoteCameraSelect.innerHTML = '<option value="">Default camera</option>';
  availableCameraDevices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = getCameraDeviceLabel(device, index);
    remoteCameraSelect.appendChild(option);
  });
  const hasPreferred = preferred && availableCameraDevices.some((device) => device.deviceId === preferred);
  remoteCameraSelect.value = hasPreferred ? preferred : "";
  if (!hasPreferred) {
    selectedRemoteCameraDeviceId = "";
    try {
      localStorage.removeItem(remotePreferenceKeys.selectedCameraDevice);
    } catch (error) {
      // noop
    }
  }
}

async function refreshCameraOptions() {
  availableCameraDevices = await listCameraDevices();
  renderCameraSelectOptions();
}

function setStatus(message) {
  statusLabel.textContent = message;
}

function isPhoneLayout() {
  return document.body.classList.contains("remote-layout--phone");
}

function openStyleDrawer() {
  if (!styleDrawer || !styleDrawerBackdrop || !styleDrawerToggle) {
    return;
  }
  styleDrawer.hidden = false;
  styleDrawerBackdrop.hidden = false;
  styleDrawer.classList.add("remote-style-drawer--open");
  styleDrawerBackdrop.classList.add("remote-style-drawer-backdrop--visible");
  styleDrawerToggle.setAttribute("aria-expanded", "true");
}

function closeStyleDrawer() {
  if (!styleDrawer || !styleDrawerBackdrop || !styleDrawerToggle) {
    return;
  }
  styleDrawer.classList.remove("remote-style-drawer--open");
  styleDrawerBackdrop.classList.remove("remote-style-drawer-backdrop--visible");
  styleDrawer.hidden = true;
  styleDrawerBackdrop.hidden = true;
  styleDrawerToggle.setAttribute("aria-expanded", "false");
}

function syncStyleDrawerForViewport() {
  if (!styleDrawer || !styleDrawerBackdrop || !styleDrawerToggle) {
    return;
  }
  if (!isPhoneLayout()) {
    styleDrawer.hidden = false;
    styleDrawerBackdrop.hidden = true;
    styleDrawer.classList.remove("remote-style-drawer--open");
    styleDrawerBackdrop.classList.remove("remote-style-drawer-backdrop--visible");
    styleDrawerToggle.setAttribute("aria-expanded", "false");
    return;
  }
  closeStyleDrawer();
}

function updateViewportClass() {
  const body = document.body;
  if (!body) {
    return;
  }
  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const isLandscape = width > height;
  const isTablet = Math.max(width, height) >= 900;
  body.classList.toggle("remote-layout--tablet", isTablet);
  body.classList.toggle("remote-layout--phone", !isTablet);
  body.classList.toggle("remote-layout--landscape", isLandscape);
  body.classList.toggle("remote-layout--portrait", !isLandscape);
  syncStyleDrawerForViewport();
}

function setStyleStatus(message) {
  if (styleStatus) {
    styleStatus.textContent = message;
  }
}

function toTitleCase(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function setSelectedDelay(value) {
  selectedDelay = value;
  localStorage.setItem(remotePreferenceKeys.selectedDelay, String(value));
  timerButtons.forEach((button) => {
    button.classList.toggle(
      "remote-timer--active",
      Number(button.dataset.delay) === value
    );
  });
}

function setRemoteBusy(isBusy) {
  remoteBusy = isBusy;
  const controls = [
    ...timerButtons,
    actionButton,
    ...Array.from(document.querySelectorAll(".remote-style")),
  ];
  controls.forEach((button) => {
    if (!button) {
      return;
    }
    button.disabled = remoteBusy;
  });
  if (exitButton) {
    exitButton.disabled = !resultReady;
  }
  if (!remoteBusy && progressPoller) {
    clearInterval(progressPoller);
    progressPoller = null;
  }
}

function updateProgressDisplay({ label, percent }) {
  if (progressLabel) {
    progressLabel.textContent = label;
  }
  if (progressValue) {
    progressValue.textContent = `${percent}%`;
  }
  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }
}

function setResultReady(isReady) {
  resultReady = isReady;
  if (exitButton) {
    exitButton.disabled = !resultReady;
  }
}

function clearStylePreview() {
  if (!stylePreview || !stylePreviewImage) {
    return;
  }
  stylePreview.classList.remove("remote-style-preview--visible");
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
    stylePreview.classList.add("remote-style-preview--visible");
  };
  stylePreviewImage.onerror = () => {
    if (token !== stylePreviewToken) {
      return;
    }
    clearStylePreview();
  };
  stylePreviewImage.src = previewUrl;
}

function startProgressPolling(promptId) {
  if (!promptId) {
    return;
  }
  if (progressPoller) {
    clearInterval(progressPoller);
  }
  progressPoller = setInterval(async () => {
    try {
      const query = new URLSearchParams({ promptId });
      if (comfyServerUrl) {
        query.set("comfyServerUrl", comfyServerUrl);
      }
      const response = await fetch(
        `/api/progress?${query.toString()}`
      );
      if (!response.ok) {
        throw new Error("Progress unavailable");
      }
      const data = await response.json();
      const percent = Math.max(0, Math.min(100, Math.round(data.percent ?? 0)));
      const label = data.label ?? "Sampling";
      updateProgressDisplay({ label, percent });
      if (data.complete) {
        setResultReady(true);
        setRemoteBusy(true);
        clearInterval(progressPoller);
        progressPoller = null;
        currentPromptId = null;
      }
    } catch (error) {
      updateProgressDisplay({ label: "Waiting", percent: 0 });
    }
  }, 1500);
}


function setRemoteResult(url) {
  if (!remoteResultSection || !remoteResultImage || !remoteResultSave) {
    return;
  }
  if (!showResultOnRemote || !url) {
    remoteResultSection.classList.remove("remote-result--visible");
    remoteResultImage.removeAttribute("src");
    remoteResultSave.removeAttribute("href");
    return;
  }
  remoteResultImage.src = url;
  remoteResultSave.href = url;
  remoteResultSection.classList.add("remote-result--visible");
}

function applyRemoteConfig() {
  if (remoteResultSection && !showResultOnRemote) {
    remoteResultSection.classList.remove("remote-result--visible");
  }
  if (remoteCameraSection) {
    remoteCameraSection.classList.toggle("remote-camera--enabled", allowRemoteCameraCapture);
  }
  if (remoteCameraSelect) {
    remoteCameraSelect.disabled = !allowRemoteCameraCapture;
  }
  if (!allowRemoteCameraCapture) {
    stopPhoneCamera();
    if (stylePreview && stylePreviewImage?.src) {
      stylePreview.classList.add("remote-style-preview--visible");
    }
  }
}

function setCameraStatus(message) {
  if (remoteCameraStatus) {
    remoteCameraStatus.textContent = message;
  }
}

function stopPhoneCamera() {
  if (phoneCameraStream) {
    phoneCameraStream.getTracks().forEach((track) => track.stop());
    phoneCameraStream = null;
  }
  if (remoteCameraPreview) {
    remoteCameraPreview.srcObject = null;
  }
  if (remoteCameraToggle) {
    remoteCameraToggle.textContent = "Use Phone Camera";
  }
}

async function startPhoneCamera() {
  if (!allowRemoteCameraCapture) {
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setCameraStatus("Phone camera is not available in this browser.");
    return;
  }
  const selectedDevice = remoteCameraSelect?.value || selectedRemoteCameraDeviceId || "";
  const primaryConstraints = selectedDevice
    ? { deviceId: { exact: selectedDevice } }
    : { facingMode: { ideal: "environment" } };
  try {
    phoneCameraStream = await navigator.mediaDevices.getUserMedia({
      video: primaryConstraints,
      audio: false,
    });
    remoteCameraPreview.srcObject = phoneCameraStream;
    remoteCameraToggle.textContent = "Stop Phone Camera";
    selectedRemoteCameraDeviceId = selectedDevice;
    if (selectedRemoteCameraDeviceId) {
      try {
        localStorage.setItem(remotePreferenceKeys.selectedCameraDevice, selectedRemoteCameraDeviceId);
      } catch (error) {
        // noop
      }
    }
    await refreshCameraOptions();
    setCameraStatus("Phone camera ready.");
  } catch (error) {
    const canFallback = selectedDevice && (error?.name === "OverconstrainedError" || error?.name === "NotFoundError");
    if (canFallback) {
      selectedRemoteCameraDeviceId = "";
      if (remoteCameraSelect) {
        remoteCameraSelect.value = "";
      }
      try {
        localStorage.removeItem(remotePreferenceKeys.selectedCameraDevice);
      } catch (removeError) {
        // noop
      }
      try {
        phoneCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        remoteCameraPreview.srcObject = phoneCameraStream;
        remoteCameraToggle.textContent = "Stop Phone Camera";
        await refreshCameraOptions();
        setCameraStatus("Selected camera unavailable; switched to default camera.");
        return;
      } catch (fallbackError) {
        // handled below
      }
    }
    setCameraStatus("Camera permission denied.");
  }
}

function capturePhoneFrame() {
  if (!remoteCameraPreview || !remoteCameraPreview.videoWidth || !remoteCameraPreview.videoHeight) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = remoteCameraPreview.videoWidth;
  canvas.height = remoteCameraPreview.videoHeight;
  const context = canvas.getContext("2d");
  context.drawImage(remoteCameraPreview, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function sendCameraCapture() {
  if (!allowRemoteCameraCapture) {
    setCameraStatus("Phone camera capture is disabled in settings.");
    return;
  }
  if (!phoneCameraStream) {
    setCameraStatus("Start phone camera first.");
    return;
  }
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setCameraStatus("Remote is not connected.");
    return;
  }
  if (remoteBusy) {
    setCameraStatus("Please wait for current photo.");
    return;
  }
  const image = capturePhoneFrame();
  if (!image) {
    setCameraStatus("Camera preview is not ready.");
    return;
  }
  socket.send(
    JSON.stringify({
      type: "capture-image",
      image,
      source: "remote-camera",
    })
  );
  setStatus("Sent photo from phone camera.");
  setResultReady(false);
  setRemoteBusy(true);
}

function connectSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${window.location.host}/remote-ws`;
  socket = new WebSocket(wsUrl);
  socket.addEventListener("open", () => {
    setStatus("Connected.");
    if (selectedStyle) {
      sendStyle(selectedStyle);
    }
    socket.send(JSON.stringify({ type: "status-request", source: "remote" }));
  });
  socket.addEventListener("close", () => {
    setStatus("Disconnected. Reconnecting…");
    stopPhoneCamera();
    reconnectTimer = setTimeout(connectSocket, 1500);
    setRemoteBusy(false);
    setResultReady(false);
    updateProgressDisplay({ label: "Disconnected", percent: 0 });
  });
  socket.addEventListener("error", () => {
    setStatus("Connection error. Reconnecting…");
    setRemoteBusy(false);
  });
  socket.addEventListener("message", (event) => {
    if (!event?.data) {
      return;
    }
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "style" && typeof payload.style === "string") {
        setSelectedStyle(payload.style, { announce: false });
      }
      if (payload?.type === "remote-config") {
        showResultOnRemote = payload.showResultOnRemote !== false;
        allowRemoteCameraCapture = Boolean(payload.allowRemoteCameraCapture);
        applyRemoteConfig();
      }
      if (payload?.type === "progress") {
        const percent = Math.max(0, Math.min(100, Math.round(payload.percent ?? 0)));
        const label = payload.label ?? "Working";
        updateProgressDisplay({ label, percent });
        if (payload.promptId) {
          currentPromptId = payload.promptId;
        }
        if (payload.comfyServerUrl) {
          comfyServerUrl = payload.comfyServerUrl;
        }
        if (payload.complete) {
          setResultReady(true);
          setRemoteBusy(true);
          setRemoteResult(payload.showResultOnRemote === false ? null : payload.outputUrl ?? null);
          if (progressPoller) {
            clearInterval(progressPoller);
            progressPoller = null;
          }
          currentPromptId = null;
        } else if (payload.status === "ready") {
          setResultReady(false);
          setRemoteBusy(false);
          setRemoteResult(null);
        } else {
          setResultReady(false);
          setRemoteBusy(
            payload.status === "queueing" ||
              payload.status === "queued" ||
              payload.status === "generating" ||
              payload.status === "busy" ||
              payload.status === "waiting"
          );
          if (currentPromptId) {
            startProgressPolling(currentPromptId);
          }
        }
      }
    } catch (error) {
      // ignore malformed messages
    }
  });
}

function sendCapture() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setStatus("Not connected yet.");
    return;
  }
  if (remoteBusy) {
    setStatus("Please wait for the current photo.");
    return;
  }
  const payload = {
    type: "capture",
    delaySeconds: selectedDelay,
    source: "remote",
  };
  socket.send(JSON.stringify(payload));
  setStatus(`Sent (${selectedDelay}s timer).`);
  setResultReady(false);
  setRemoteBusy(true);
  setRemoteResult(null);
}

function sendStyle(style) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setStatus("Not connected yet.");
    return;
  }
  if (remoteBusy) {
    setStatus("Please wait for the current photo.");
    return;
  }
  socket.send(
    JSON.stringify({
      type: "style",
      style,
      source: "remote",
    })
  );
  setStatus(`Style sent: ${toTitleCase(style)}`);
}

function sendExit() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setStatus("Not connected yet.");
    return;
  }
  if (!resultReady) {
    return;
  }
  socket.send(JSON.stringify({ type: "exit", source: "remote" }));
  setResultReady(false);
  setRemoteBusy(false);
  updateProgressDisplay({ label: "Ready", percent: 0 });
  setStatus("Ready for a new photo.");
}

function setSelectedStyle(style, { announce = true } = {}) {
  selectedStyle = style;
  if (style) {
    localStorage.setItem(remotePreferenceKeys.selectedStyle, style);
  }
  const styleButtons = Array.from(document.querySelectorAll(".remote-style"));
  styleButtons.forEach((button) => {
    button.classList.toggle("remote-style--active", button.dataset.style === style);
  });
  if (announce && style) {
    setStyleStatus(`Selected: ${toTitleCase(style)}`);
  }
  if (style) {
    updateStylePreview(style);
  } else {
    clearStylePreview();
  }
}

function loadRemotePreferences() {
  try {
    const storedDelay = Number(localStorage.getItem(remotePreferenceKeys.selectedDelay));
    if (Number.isFinite(storedDelay)) {
      selectedDelay = storedDelay;
    }
    const storedStyle = localStorage.getItem(remotePreferenceKeys.selectedStyle);
    if (storedStyle) {
      selectedStyle = storedStyle;
    }
    const storedCamera = localStorage.getItem(remotePreferenceKeys.selectedCameraDevice);
    if (storedCamera) {
      selectedRemoteCameraDeviceId = storedCamera;
    }
  } catch (error) {
    selectedDelay = 0;
    selectedStyle = null;
  }
  setSelectedDelay(selectedDelay);
  if (selectedStyle) {
    setSelectedStyle(selectedStyle, { announce: false });
  }
}

async function loadStyles() {
  if (!styleList) {
    return;
  }
  setStyleStatus("Loading styles…");
  try {
    const response = await fetch("/api/styles");
    if (!response.ok) {
      throw new Error("Failed to load styles");
    }
    const data = await response.json();
    const styles = data.styles ?? [];
    styleList.innerHTML = "";
    if (!styles.length) {
      setStyleStatus("No styles available.");
      return;
    }
    styles.forEach((style) => {
      const button = document.createElement("button");
      button.className = "remote-style";
      button.textContent = toTitleCase(style);
      button.dataset.style = style;
      button.addEventListener("click", () => {
        setSelectedStyle(style);
        sendStyle(style);
        if (isPhoneLayout()) {
          closeStyleDrawer();
        }
      });
      styleList.appendChild(button);
    });
    setStyleStatus("Tap a style to select it.");
    if (selectedStyle) {
      setSelectedStyle(selectedStyle, { announce: false });
    }
    if (!selectedStyle) {
      clearStylePreview();
    }
    if (remoteBusy) {
      setRemoteBusy(true);
    }
  } catch (error) {
    setStyleStatus("Unable to load styles.");
  }
}

timerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const value = Number(button.dataset.delay) || 0;
    setSelectedDelay(value);
  });
});

actionButton.addEventListener("click", sendCapture);
if (exitButton) {
  exitButton.addEventListener("click", sendExit);
}
if (remoteCameraToggle) {
  remoteCameraToggle.addEventListener("click", async () => {
    if (!allowRemoteCameraCapture) {
      setCameraStatus("Phone camera capture is disabled in settings.");
      return;
    }
    if (phoneCameraStream) {
      stopPhoneCamera();
      setCameraStatus("");
      return;
    }
    await startPhoneCamera();
  });
}
if (remoteCameraCapture) {
  remoteCameraCapture.addEventListener("click", sendCameraCapture);
}
if (remoteCameraSelect) {
  remoteCameraSelect.addEventListener("change", async () => {
    selectedRemoteCameraDeviceId = remoteCameraSelect.value || "";
    try {
      if (selectedRemoteCameraDeviceId) {
        localStorage.setItem(remotePreferenceKeys.selectedCameraDevice, selectedRemoteCameraDeviceId);
      } else {
        localStorage.removeItem(remotePreferenceKeys.selectedCameraDevice);
      }
    } catch (error) {
      // noop
    }
    if (phoneCameraStream) {
      stopPhoneCamera();
      await startPhoneCamera();
    }
  });
}
if (styleDrawerToggle) {
  styleDrawerToggle.addEventListener("click", () => {
    if (!isPhoneLayout()) {
      return;
    }
    const isOpen = styleDrawer && !styleDrawer.hidden;
    if (isOpen) {
      closeStyleDrawer();
    } else {
      openStyleDrawer();
    }
  });
}
if (styleDrawerClose) {
  styleDrawerClose.addEventListener("click", closeStyleDrawer);
}
if (styleDrawerBackdrop) {
  styleDrawerBackdrop.addEventListener("click", closeStyleDrawer);
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeStyleDrawer();
  }
});

applyRemoteConfig();
loadStyles();
loadRemotePreferences();
refreshCameraOptions();
connectSocket();
updateViewportClass();
window.addEventListener("resize", updateViewportClass);
window.addEventListener("orientationchange", updateViewportClass);
