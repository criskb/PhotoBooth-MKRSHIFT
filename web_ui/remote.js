const timerButtons = Array.from(document.querySelectorAll(".remote-timer"));
const actionButton = document.querySelector(".remote-action");
const statusLabel = document.querySelector(".remote-status");
const styleList = document.querySelector(".remote-styles-list");
const styleScrollPrev = document.querySelector(".remote-styles-scroll--prev");
const styleScrollNext = document.querySelector(".remote-styles-scroll--next");
const styleDrawer = document.querySelector(".remote-style-drawer");
const styleDrawerBackdrop = document.querySelector(".remote-style-drawer-backdrop");
const styleDrawerToggle = document.querySelector(".remote-styles-toggle");
const styleDrawerClose = document.querySelector(".remote-style-drawer__close");
const styleDrawerOk = document.querySelector(".remote-style-drawer__ok");
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
let pendingStyleSelection = null;
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

function isTabletLayout() {
  return document.body.classList.contains("remote-layout--tablet");
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
  if (styleDrawerOk) {
    const pending = pendingStyleSelection ?? selectedStyle;
    styleDrawerOk.disabled = !pending || pending === selectedStyle;
  }
  if (!pendingStyleSelection && selectedStyle) {
    setPendingStyle(selectedStyle);
  }
  setTimeout(updateStyleScrollButtons, 40);
}

function closeStyleDrawer() {
  if (!styleDrawer || !styleDrawerBackdrop || !styleDrawerToggle) {
    return;
  }
  const keepVisible = allowRemoteCameraCapture && isTabletLayout() && !isPhoneLayout();
  styleDrawer.classList.remove("remote-style-drawer--open");
  styleDrawerBackdrop.classList.remove("remote-style-drawer-backdrop--visible");
  styleDrawer.hidden = !keepVisible;
  styleDrawerBackdrop.hidden = true;
  styleDrawerToggle.setAttribute("aria-expanded", "false");
}

function syncStyleDrawerForViewport() {
  if (!styleDrawer || !styleDrawerBackdrop || !styleDrawerToggle) {
    return;
  }
  if (!allowRemoteCameraCapture) {
    styleDrawer.hidden = false;
    styleDrawerBackdrop.hidden = true;
    styleDrawer.classList.remove("remote-style-drawer--open");
    styleDrawerBackdrop.classList.remove("remote-style-drawer-backdrop--visible");
    styleDrawerToggle.setAttribute("aria-expanded", "false");
    if (styleDrawerOk) {
      styleDrawerOk.hidden = true;
      styleDrawerOk.disabled = true;
    }
    return;
  }
  if (styleDrawerOk) {
    styleDrawerOk.hidden = false;
    styleDrawerOk.disabled = !pendingStyleSelection || pendingStyleSelection === selectedStyle;
  }
  if (isPhoneLayout()) {
    closeStyleDrawer();
    return;
  }
  styleDrawer.hidden = false;
  styleDrawerBackdrop.hidden = true;
  styleDrawer.classList.remove("remote-style-drawer--open");
  styleDrawerBackdrop.classList.remove("remote-style-drawer-backdrop--visible");
  styleDrawerToggle.setAttribute("aria-expanded", "false");
}

function updateViewportClass() {
  const body = document.body;
  if (!body) {
    return;
  }
  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const isLandscape = width > height;
  const isTablet = shortestSide >= 700 && longestSide >= 900;
  body.classList.toggle("remote-layout--tablet", isTablet);
  body.classList.toggle("remote-layout--phone", !isTablet);
  body.classList.toggle("remote-layout--landscape", isLandscape);
  body.classList.toggle("remote-layout--portrait", !isLandscape);
  syncStyleDrawerForViewport();
  updateStyleScrollButtons();
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

function getStyleButtons() {
  if (!styleList) {
    return [];
  }
  return Array.from(styleList.querySelectorAll(".style"));
}

function setStyleScrollControlDisabled(button, disabled) {
  if (!button) {
    return;
  }
  button.disabled = disabled;
  button.classList.toggle("styles-scroll--disabled", disabled);
  button.setAttribute("aria-disabled", String(disabled));
}

function updateStyleScrollButtons() {
  if (!styleList) {
    return;
  }
  const maxScroll = Math.max(0, styleList.scrollWidth - styleList.clientWidth);
  const atStart = styleList.scrollLeft <= 2;
  const atEnd = styleList.scrollLeft >= maxScroll - 2;
  setStyleScrollControlDisabled(styleScrollPrev, atStart);
  setStyleScrollControlDisabled(styleScrollNext, atEnd);
}

function scrollStylesBy(direction) {
  if (!styleList) {
    return;
  }
  const amount = Math.max(160, Math.floor(styleList.clientWidth * 0.55));
  styleList.scrollBy({ left: amount * direction, behavior: "smooth" });
  setTimeout(updateStyleScrollButtons, 180);
}

function keepActiveStyleInView({ behavior = "smooth", alignCenter = false } = {}) {
  if (!styleList || !selectedStyle) {
    return;
  }

  const activeButton = getStyleButtons().find((button) => button.dataset.style === selectedStyle);
  if (!activeButton) {
    return;
  }

  const viewportLeft = styleList.scrollLeft;
  const viewportRight = viewportLeft + styleList.clientWidth;
  const buttonLeft = activeButton.offsetLeft;
  const buttonRight = buttonLeft + activeButton.offsetWidth;
  const padding = 12;

  const fullyVisible =
    buttonLeft >= viewportLeft + padding &&
    buttonRight <= viewportRight - padding;
  if (fullyVisible) {
    return;
  }

  let targetLeft;
  if (alignCenter) {
    targetLeft = activeButton.offsetLeft - (styleList.clientWidth / 2 - activeButton.clientWidth / 2);
  } else if (buttonLeft < viewportLeft + padding) {
    targetLeft = buttonLeft - padding;
  } else {
    const overflowRight = buttonRight - (viewportRight - padding);
    targetLeft = viewportLeft + Math.max(0, overflowRight);
  }

  styleList.scrollTo({ left: Math.max(0, targetLeft), behavior });
  setTimeout(updateStyleScrollButtons, 180);
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
    styleScrollPrev,
    styleScrollNext,
    styleDrawerOk,
    ...getStyleButtons(),
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
  if (remoteCameraCapture) {
    remoteCameraCapture.disabled = !allowRemoteCameraCapture;
    remoteCameraCapture.title = allowRemoteCameraCapture
      ? "Capture from your phone camera"
      : "Enable phone camera capture in booth settings";
  }
  if (remoteCameraStatus && !allowRemoteCameraCapture && !phoneCameraStream) {
    setCameraStatus("Phone camera preview is available, but remote capture is disabled in booth settings.");
  }
  if (allowRemoteCameraCapture && remoteCameraStatus?.textContent?.includes("disabled in booth settings")) {
    setCameraStatus("");
  }
  if (styleDrawerToggle) {
    styleDrawerToggle.style.display = allowRemoteCameraCapture ? "inline-flex" : "none";
  }
  document.body.classList.toggle("remote-camera-mode", allowRemoteCameraCapture);
  if (stylePreview) {
    stylePreview.classList.toggle("remote-style-preview--drawer-only", allowRemoteCameraCapture);
  }
  if (!allowRemoteCameraCapture) {
    pendingStyleSelection = null;
  }
  syncStyleDrawerForViewport();
  if (!allowRemoteCameraCapture) {
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

function applyPendingStyleSelection() {
  if (!pendingStyleSelection) {
    return;
  }
  const nextStyle = pendingStyleSelection;
  pendingStyleSelection = null;
  setSelectedStyle(nextStyle);
  sendStyle(nextStyle);
  setStyleStatus(`Selected: ${toTitleCase(nextStyle)}`);
  if (styleDrawerOk) {
    styleDrawerOk.disabled = true;
  }
  closeStyleDrawer();
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
  const styleButtons = getStyleButtons();
  styleButtons.forEach((button) => {
    const isMatch = button.dataset.style === style;
    button.classList.toggle("style--active", isMatch);
    button.setAttribute("aria-pressed", String(isMatch));
  });
  if (announce && style) {
    setStyleStatus(`Selected: ${toTitleCase(style)}`);
  }
  if (style) {
    updateStylePreview(style);
    keepActiveStyleInView();
  } else {
    clearStylePreview();
  }
}


function setPendingStyle(style) {
  pendingStyleSelection = style;
  const styleButtons = getStyleButtons();
  styleButtons.forEach((button) => {
    const isMatch = button.dataset.style === style;
    button.classList.toggle("style--active", isMatch);
    button.setAttribute("aria-pressed", String(isMatch));
  });
  if (style) {
    updateStylePreview(style);
    keepActiveStyleInView();
    setStyleStatus(`Pending: ${toTitleCase(style)} (tap OK to confirm)`);
  }
  if (styleDrawerOk) {
    styleDrawerOk.disabled = !style || style === selectedStyle;
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
    styleList.setAttribute("aria-busy", "true");
    if (!styleList.children.length) {
      styleList.innerHTML = '<span class="styles-empty styles-empty--loading">Loading styles</span>';
    }
    const response = await fetch("/api/styles");
    if (!response.ok) {
      throw new Error("Failed to load styles");
    }
    const data = await response.json();
    const styles = Array.from(new Set(Array.isArray(data.styles) ? data.styles : []));
    styleList.innerHTML = "";
    if (!styles.length) {
      setStyleStatus("No styles available.");
      styleList.innerHTML = '<span class="styles-empty">No styles available.</span>';
      setStyleScrollControlDisabled(styleScrollPrev, true);
      setStyleScrollControlDisabled(styleScrollNext, true);
      return;
    }
    styles.forEach((style) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "style";
      button.textContent = toTitleCase(style);
      button.dataset.style = style;
      button.title = `Use ${toTitleCase(style)} style`;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        if (allowRemoteCameraCapture) {
          setPendingStyle(style);
          return;
        }
        setSelectedStyle(style);
        sendStyle(style);
        if (isPhoneLayout() || allowRemoteCameraCapture) {
          closeStyleDrawer();
        }
      });
      styleList.appendChild(button);
    });
    styleList.tabIndex = 0;
    updateStyleScrollButtons();
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
    styleList.innerHTML = '<span class="styles-empty">Unable to load styles.</span>';
    setStyleScrollControlDisabled(styleScrollPrev, true);
    setStyleScrollControlDisabled(styleScrollNext, true);
  } finally {
    styleList.removeAttribute("aria-busy");
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
    if (!allowRemoteCameraCapture) {
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
if (styleDrawerOk) {
  styleDrawerOk.addEventListener("click", applyPendingStyleSelection);
}
if (styleDrawerBackdrop) {
  styleDrawerBackdrop.addEventListener("click", closeStyleDrawer);
}
if (styleList) {
  styleList.addEventListener("scroll", updateStyleScrollButtons, { passive: true });
  styleList.addEventListener("keydown", (event) => {
    const styleButtons = getStyleButtons();
    if (!styleButtons.length) {
      return;
    }

    if (event.key === "Home") {
      const firstButton = styleButtons[0];
      firstButton.click();
      firstButton.focus();
      event.preventDefault();
      return;
    }

    if (event.key === "End") {
      const lastButton = styleButtons[styleButtons.length - 1];
      lastButton.click();
      lastButton.focus();
      event.preventDefault();
      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    const activeIndex = styleButtons.findIndex((button) => button.classList.contains("style--active"));
    if (activeIndex < 0) {
      return;
    }
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = Math.max(0, Math.min(styleButtons.length - 1, activeIndex + direction));
    const nextButton = styleButtons[nextIndex];
    if (nextButton && nextButton !== styleButtons[activeIndex]) {
      nextButton.click();
      nextButton.focus();
      event.preventDefault();
    }
  });
}
if (styleScrollPrev) {
  styleScrollPrev.addEventListener("click", () => scrollStylesBy(-1));
}
if (styleScrollNext) {
  styleScrollNext.addEventListener("click", () => scrollStylesBy(1));
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
