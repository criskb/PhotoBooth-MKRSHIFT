export function renderSettingsModal() {
  return `
    <div class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="settings-card">
        <h2 id="settings-title">Settings</h2>
        <label class="settings-field">
          ComfyUI API Endpoint
          <input
            class="settings-input form-input settings-input--comfy"
            type="url"
            placeholder="http://127.0.0.1:8188 or your hosted API URL"
          />
        </label>
        <p class="settings-help">
          Enter the exact Comfy API URL from your provider. Local ComfyUI usually uses
          <strong>http://127.0.0.1:8188</strong>. Hosted services can use either a workflow URL with ID, or the collection URL
          <code>https://comfy.icu/api/v1/workflows/</code>. When using the collection URL, style button
          names must match hosted workflow names so the app can auto-pick the workflow ID.
        </p>
        <label class="settings-field">
          ComfyUI API Key (for hosted services)
          <input
            class="settings-input form-input settings-input--comfy-key"
            type="password"
            placeholder="Comfy.ICU auth token"
            autocomplete="off"
          />
        </label>
        <p class="settings-help settings-help--subtle">
          The token is sent as both <code>Authorization: Bearer &lt;token&gt;</code> and
          <code>X-API-Key</code>.
        </p>
        <label class="settings-field">
          Camera Orientation
          <select class="settings-input form-input settings-input--orientation">
            <option value="0">0° (Normal)</option>
            <option value="90">90°</option>
            <option value="180">180°</option>
            <option value="270">270°</option>
          </select>
        </label>
        <label class="settings-field">
          Camera Device
          <select class="settings-input form-input settings-input--camera">
            <option value="">Default camera</option>
          </select>
        </label>
        <label class="settings-field settings-field--toggle">
          <input class="settings-input settings-input--mirror" type="checkbox" />
          Mirror camera preview
        </label>
        <label class="settings-field settings-field--toggle">
          <input class="settings-input settings-input--enabled" type="checkbox" />
          Enable printing
        </label>
        <label class="settings-field settings-field--toggle">
          <input class="settings-input settings-input--hide-print" type="checkbox" />
          Hide print button
        </label>
        <label class="settings-field">
          Printer Name
          <select class="settings-input form-input settings-input--printer">
            <option value="">Select a printer</option>
          </select>
        </label>
        <div class="settings-printer-details" aria-live="polite">No printer selected.</div>
        <label class="settings-field">
          Printer Copies
          <input
            class="settings-input form-input settings-input--printer-copies"
            type="number"
            min="1"
            step="1"
            value="1"
          />
        </label>
        <label class="settings-field">
          Freeimage API Key
          <input
            class="settings-input form-input settings-input--freeimage"
            type="text"
            placeholder="Freeimage API Key"
          />
        </label>
        <label class="settings-field settings-field--toggle">
          <input class="settings-input settings-input--uploads" type="checkbox" />
          Enable uploads
        </label>
        <label class="settings-field settings-field--toggle">
          <input class="settings-input settings-input--hide-qr" type="checkbox" />
          Hide QR downloads
        </label>
        <label class="settings-field settings-field--toggle">
          <input class="settings-input settings-input--remote-result" type="checkbox" />
          Show finished image on phone remote
        </label>
        <label class="settings-field settings-field--toggle">
          <input class="settings-input settings-input--remote-camera" type="checkbox" />
          Allow phone camera capture from remote
        </label>
        <label class="settings-field settings-field--toggle">
          <input class="settings-input settings-input--watermark" type="checkbox" />
          Add MKRSHIFT watermark on upload/print
        </label>
        <div class="settings-watermark">
          <p class="settings-watermark__label">Watermark preview</p>
          <div class="settings-watermark__preview">
            <img class="settings-watermark__image" alt="Watermark preview" />
          </div>
          <label class="settings-field settings-field--compact">
            Watermark text
            <input
              class="settings-input form-input settings-input--watermark-text"
              type="text"
              value="MKRShift"
              maxlength="48"
            />
          </label>
          <label class="settings-field settings-field--file">
            Custom signature watermark
            <div class="settings-watermark__upload">
              <button
                type="button"
                class="settings-action settings-action--clear-watermark btn btn--secondary"
                aria-label="Clear custom signature"
                title="Clear custom signature"
              >
                ✕
              </button>
              <input
                class="settings-input form-input settings-input--watermark-file"
                type="file"
                accept="image/*"
              />
            </div>
          </label>
        </div>
        <div class="settings-actions">
          <button class="settings-action settings-action--save btn btn--primary">Save</button>
          <button class="settings-action settings-action--close btn btn--secondary">Close</button>
        </div>
        <div class="settings-remote">
          <p class="settings-remote__title">Phone remote shutter</p>
          <p class="settings-remote__text">
            Scan the QR code to open the remote on your phone. Connect to the same Wi-Fi, choose a
            timer, and tap capture to trigger the booth over the WebSocket.
          </p>
          <img class="settings-remote__qr" alt="QR code for the phone remote" />
          <p class="settings-remote__url">
            URL:
            <a class="settings-remote__link" target="_blank" rel="noreferrer"></a>
          </p>
          <p class="settings-remote__hint">
            Keep the booth screen open while you use the remote.
          </p>
        </div>
        <div class="settings-about">
          <p class="settings-about__title">About this project</p>
          <p class="settings-about__text">
            This project is a complete rewrite based on the collaborative work from
            <a href="https://github.com/tvibitnmkt/PhotoBooth" target="_blank" rel="noreferrer">tvibitnmkt/PhotoBooth</a>
            and
            <a href="https://github.com/ADEFORGE/PhotoBooth" target="_blank" rel="noreferrer">ADEFORGE/PhotoBooth</a>.
          </p>
          <p class="settings-about__text">Made by Cris K B · MKRShift</p>
        </div>
      </div>
    </div>
  `;
}
