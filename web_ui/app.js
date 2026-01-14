const video = document.querySelector("#camera");
const stylesContainer = document.querySelector(".styles");
const statusLabel = document.querySelector(".status__label");
const statusMeta = document.querySelector(".status__meta");
const actionButton = document.querySelector(".action");

let selectedStyle = null;
let isQueueing = false;
let lastShake = 0;
let motionPermissionGranted = false;

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
    statusLabel.textContent = "Queued";
    statusMeta.textContent = "Workflow sent to ComfyUI.";
  } catch (error) {
    statusLabel.textContent = "Queue Failed";
    statusMeta.textContent = "Unable to send workflow to ComfyUI.";
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
window.addEventListener("devicemotion", handleShake);

startCamera();
loadStyles();
