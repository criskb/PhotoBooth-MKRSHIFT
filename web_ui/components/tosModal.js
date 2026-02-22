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
            By using this photo booth, you consent to capture and AI processing of your photo.
          </p>
          <ul class="tos-list">
            <li>Your selected photo is sent to configured AI services (including <strong>comfy.icu</strong>) to generate the final image.</li>
            <li>If upload is enabled, generated images may be shared via <strong>freeimage.host</strong> links/QR codes.</li>
            <li>Avoid submitting sensitive personal information in photos or prompts.</li>
            <li>Operators may retain outputs/logs for booth operation and troubleshooting.</li>
          </ul>
          <p class="tos-note">
            If you do not agree, please close this booth session now.
          </p>
        </div>
      </div>
    </div>
  `;
}
