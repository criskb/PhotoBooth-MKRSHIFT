export function renderOverlays() {
  return `
    <div class="countdown-overlay" aria-live="assertive" aria-atomic="true">
      <span class="countdown-value">3</span>
    </div>
    <div class="flash-overlay" aria-hidden="true"></div>
  `;
}
