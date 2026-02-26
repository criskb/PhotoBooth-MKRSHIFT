export function renderProgressOverlay() {
  return `
    <div class="progress-overlay" aria-live="polite">
      <div class="progress-card">
        <button class="progress-close btn btn--secondary" aria-label="Close results">✕</button>
        <div class="progress__meta">
          <span class="progress__label">Idle</span>
          <span class="progress__value">0%</span>
        </div>
        <div class="progress__bar">
          <span class="progress__fill"></span>
        </div>
        <img class="progress__preview" alt="Latest generated output" />
        <div class="progress__actions">
          <button class="progress-action progress-action--redo btn btn--secondary" disabled>Re-Do with current style</button>
          <button class="progress-action progress-action--upload btn btn--primary" disabled>Upload</button>
          <button class="progress-action progress-action--print btn btn--primary" disabled>Print</button>
          <button class="progress-action progress-action--done btn btn--primary" disabled>Back to Capture</button>
        </div>
        <div class="progress__qr">
          <span class="progress__qr-label">Upload QR</span>
          <img class="progress__qr-image" alt="QR code for uploaded image" />
        </div>
      </div>
    </div>
  `;
}
