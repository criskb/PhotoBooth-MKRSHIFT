export function renderRemoteLaunchModal() {
  return `
    <div class="remote-launch-modal" role="dialog" aria-modal="true" aria-labelledby="remote-launch-title">
      <div class="remote-launch-card">
        <div class="remote-launch-header">
          <h2 id="remote-launch-title">Phone Remote</h2>
          <button class="remote-launch-close btn btn--secondary" aria-label="Close remote QR">Close</button>
        </div>
        <p class="remote-launch-copy">
          Scan to open the remote on a phone or tablet connected to the same network.
        </p>
        <img class="remote-launch-qr" alt="QR code for the phone remote" />
        <p class="remote-launch-url">
          URL:
          <a class="remote-launch-link" target="_blank" rel="noreferrer"></a>
        </p>
      </div>
    </div>
  `;
}
