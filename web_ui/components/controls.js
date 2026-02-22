export function renderControls() {
  return `
    <div class="controls">
      <div class="styles-panel">
        <div class="styles-card">
          <div class="styles-header">
            <p class="styles-title">Choose a style</p>
            <p class="styles-selected">Selected: <span class="styles-selected__value">None</span></p>
          </div>
          <div class="styles">
            <button class="style">Clay</button>
            <button class="style">Comic</button>
            <button class="style">Oil Paint</button>
            <button class="style">Cyberpunk</button>
            <button class="style">Pixel Art</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
