const timerButtons = Array.from(document.querySelectorAll(".remote-timer"));
const actionButton = document.querySelector(".remote-action");
const statusLabel = document.querySelector(".remote-status");
const styleList = document.querySelector(".remote-style-list");
const styleStatus = document.querySelector(".remote-style-status");

let selectedDelay = 0;
let socket = null;
let reconnectTimer = null;
let selectedStyle = null;

function setStatus(message) {
  statusLabel.textContent = message;
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
  timerButtons.forEach((button) => {
    button.classList.toggle(
      "remote-timer--active",
      Number(button.dataset.delay) === value
    );
  });
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
  });
  socket.addEventListener("close", () => {
    setStatus("Disconnected. Reconnecting…");
    reconnectTimer = setTimeout(connectSocket, 1500);
  });
  socket.addEventListener("error", () => {
    setStatus("Connection error. Reconnecting…");
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
  const payload = {
    type: "capture",
    delaySeconds: selectedDelay,
    source: "remote",
  };
  socket.send(JSON.stringify(payload));
  setStatus(`Sent (${selectedDelay}s timer).`);
}

function sendStyle(style) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setStatus("Not connected yet.");
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

function setSelectedStyle(style, { announce = true } = {}) {
  selectedStyle = style;
  const styleButtons = Array.from(document.querySelectorAll(".remote-style"));
  styleButtons.forEach((button) => {
    button.classList.toggle("remote-style--active", button.dataset.style === style);
  });
  if (announce && style) {
    setStyleStatus(`Selected: ${toTitleCase(style)}`);
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
      });
      styleList.appendChild(button);
    });
    setStyleStatus("Tap a style to select it.");
    if (selectedStyle) {
      setSelectedStyle(selectedStyle, { announce: false });
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

loadStyles();
connectSocket();
