export function renderGalleryModal() {
  return `
    <div class="gallery-modal" role="dialog" aria-modal="true" aria-labelledby="gallery-title">
      <div class="gallery-card">
        <div class="gallery-header">
          <h2 id="gallery-title">Gallery</h2>
          <button class="gallery-close btn btn--secondary" aria-label="Close gallery">Close</button>
        </div>
        <div class="gallery-body">
          <div class="gallery-sidebar">
            <div class="gallery-filters">
              <label class="gallery-filter">
                Search
                <input class="gallery-search" type="search" placeholder="Filter by capture id" />
              </label>
              <label class="gallery-filter">
                Sort
                <select class="gallery-sort">
                  <option value="recent">Most recent</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
            <div class="gallery-list"></div>
          </div>
          <div class="gallery-detail">
            <div class="gallery-meta">
              <span class="gallery-meta__label">Capture</span>
              <span class="gallery-meta__value gallery-meta__value--id">—</span>
              <span class="gallery-meta__label">Captured at</span>
              <span class="gallery-meta__value gallery-meta__value--date">—</span>
            </div>
            <div class="gallery-pair">
              <div class="gallery-panel">
                <span class="gallery-label">Input</span>
                <img class="gallery-image gallery-image--input" alt="Input image" />
              </div>
              <div class="gallery-panel">
                <span class="gallery-label">Output</span>
                <img class="gallery-image gallery-image--output" alt="Output image" />
              </div>
            </div>
            <div class="gallery-actions">
              <button class="gallery-action gallery-action--upload btn btn--primary">Upload Selected</button>
              <button class="gallery-action gallery-action--print btn btn--primary">Print Selected</button>
              <span class="gallery-upload-status" aria-live="polite"></span>
            </div>
            <div class="gallery-qr">
              <span class="gallery-qr-label">Upload QR</span>
              <img class="gallery-qr-image" alt="QR code for uploaded image" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
