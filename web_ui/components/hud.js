export function renderHud() {
  return `
    <div class="hud">
      <div class="brand brand-card">
        <span class="brand__title">AI PHOTOBOOTH</span>
        <span class="brand__subtitle">
          <span class="brand__subtitle-accent">MKR</span><span class="brand__subtitle-neutral">Shift</span>
        </span>
      </div>
      <div class="status">
        <span class="status__label">Ready</span>
        <span class="status__meta">Select a style, then tap or shake to shoot</span>
        <span class="status__connection">ComfyUI: Checking…</span>
      </div>
    </div>
  `;
}
