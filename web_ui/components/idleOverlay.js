export function renderIdleOverlay() {
  return `
    <div class="idle-overlay idle-overlay--hidden" aria-live="polite">
      <div class="idle-overlay__backdrop" aria-hidden="true"></div>
      <div class="idle-overlay__glow" aria-hidden="true"></div>
      <div class="idle-overlay__canvas" aria-hidden="true"></div>
      <div class="idle-overlay__copy">
        <p class="idle-overlay__eyebrow">
          <span class="idle-overlay__eyebrow-accent">MKRSHIFT</span> AI PHOTOBOOTH
        </p>
        <p class="idle-overlay__title">Touch to start</p>
        <p class="idle-overlay__subtitle">Tap the screen to begin · Press ESC for attract mode</p>
        <p class="idle-overlay__subnote">No app download required</p>
        <div class="idle-overlay__cta" aria-hidden="true">
          <span class="idle-overlay__cta-dot"></span>
          <span>Ready when you are</span>
        </div>

        <div class="idle-overlay__steps-wrap" aria-hidden="true">
          <div class="idle-overlay__steps-track"></div>
          <ol class="idle-overlay__steps">
          <li><span class="idle-overlay__step-index">1</span><span>Choose your style</span></li>
          <li><span class="idle-overlay__step-index">2</span><span>Take your selfie</span></li>
          <li><span class="idle-overlay__step-index">3</span><span>Get your AI result</span></li>
          <li><span class="idle-overlay__step-index">4</span><span>Upload QR or print</span></li>
        </ol>
        </div>

        <div class="idle-overlay__gesture" aria-hidden="true">
          <span class="idle-overlay__gesture-arrow">⌄</span>
          <span>Tap anywhere to continue</span>
        </div>
      </div>
    </div>
  `;
}
