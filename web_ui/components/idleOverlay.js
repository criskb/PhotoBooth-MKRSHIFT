export function renderIdleOverlay() {
  return `
    <div class="idle-overlay idle-overlay--hidden" aria-live="polite">
      <div class="idle-overlay__backdrop" aria-hidden="true"></div>
      <div class="idle-overlay__glow" aria-hidden="true"></div>
      <div class="idle-overlay__canvas" aria-hidden="true"></div>
      <div class="idle-overlay__copy">
        <p class="idle-overlay__title">Touch to start</p>
        <p class="idle-overlay__subtitle">AI PhotoBooth by MKRShift</p>
      </div>
    </div>
  `;
}
