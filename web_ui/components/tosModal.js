export function renderTosModal() {
  return `
    <div class="tos-modal" role="dialog" aria-modal="true" aria-labelledby="tos-title">
      <div class="tos-card">
        <div class="tos-header">
          <h2 id="tos-title">Terms of Service</h2>
          <button class="tos-close btn btn--secondary" aria-label="Close terms">Close</button>
        </div>
        <div class="tos-body">
          <p>
            By using this photo booth, you agree that your captured image data may be transmitted to
            third-party services for processing and hosting, including <strong>comfy.icu</strong>
            and <strong>freeimage.host</strong>.
          </p>
        </div>
      </div>
    </div>
  `;
}
