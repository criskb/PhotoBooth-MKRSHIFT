export function renderControls() {
  return `
    <div class="controls">
      <div class="styles-panel">
        <div class="styles-card">
          <div class="styles-header">
            <p class="styles-title">Choose a style</p>
            <p class="styles-selected">Selected: <span class="styles-selected__value">None</span></p>
          </div>
          <div class="styles-scroller">
            <button class="styles-scroll styles-scroll--prev" aria-label="Scroll styles left" type="button">‹</button>
            <div class="styles" aria-live="polite">
              <span class="styles-empty">Loading styles…</span>
            </div>
            <button class="styles-scroll styles-scroll--next" aria-label="Scroll styles right" type="button">›</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
