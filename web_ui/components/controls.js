export function renderControls() {
  return `
    <div class="controls">
      <div class="action-row">
        <button class="action" disabled>Take Selfie</button>
        <div class="timer-control">
          <button class="timer-toggle" aria-haspopup="true" aria-expanded="false">⏱️ 0s</button>
          <div class="timer-menu" role="menu">
            <button class="timer-option" data-delay="0" role="menuitem">0s</button>
            <button class="timer-option" data-delay="3" role="menuitem">3s</button>
            <button class="timer-option" data-delay="5" role="menuitem">5s</button>
            <button class="timer-option" data-delay="10" role="menuitem">10s</button>
          </div>
        </div>
      </div>
      <div class="styles-panel">
        <div class="styles">
          <button class="style">Clay</button>
          <button class="style">Comic</button>
          <button class="style">Oil Paint</button>
          <button class="style">Cyberpunk</button>
          <button class="style">Pixel Art</button>
        </div>
        <div class="style-preview" aria-live="polite">
          <img class="style-preview__image" alt="Selected style preview" />
        </div>
      </div>
    </div>
  `;
}
