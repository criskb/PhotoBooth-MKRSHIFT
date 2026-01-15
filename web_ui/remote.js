const timerButtons = Array.from(document.querySelectorAll(".remote-timer"));
const actionButton = document.querySelector(".remote-action");
const statusLabel = document.querySelector(".remote-status");

let selectedDelay = 0;
let socket = null;
let reconnectTimer = null;

function setStatus(message) {
  statusLabel.textContent = message;
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
  });
  socket.addEventListener("close", () => {
    setStatus("Disconnected. Reconnecting…");
    reconnectTimer = setTimeout(connectSocket, 1500);
  });
  socket.addEventListener("error", () => {
    setStatus("Connection error. Reconnecting…");
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

timerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const value = Number(button.dataset.delay) || 0;
    setSelectedDelay(value);
  });
});

actionButton.addEventListener("click", sendCapture);

connectSocket();
