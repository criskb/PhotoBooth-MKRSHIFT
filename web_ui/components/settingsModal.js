export function renderSettingsModal() {
  return `
    <div class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="settings-card">
        <div class="settings-header">
          <h2 id="settings-title">Settings</h2>
          <p class="settings-header__subtitle">Configure API, camera, output, and remote controls.</p>
        </div>

        <nav class="settings-nav" aria-label="Settings sections">
          <a class="settings-nav__link" href="#settings-comfy">Comfy</a>
          <a class="settings-nav__link" href="#settings-camera">Camera</a>
          <a class="settings-nav__link" href="#settings-print">Print</a>
          <a class="settings-nav__link" href="#settings-watermark">Watermark</a>
          <a class="settings-nav__link" href="#settings-audio">Audio</a>
          <a class="settings-nav__link" href="#settings-remote">Remote</a>
        </nav>

        <section class="settings-section" id="settings-comfy">
          <h3 class="settings-section__title">Comfy / Generation</h3>
          <div class="settings-grid settings-grid--two">
            <label class="settings-field settings-field--span-2">
              ComfyUI API Endpoint
              <input
                class="settings-input form-input settings-input--comfy"
                type="url"
                placeholder="http://127.0.0.1:8188 or your hosted API URL"
              />
            </label>
            <p class="settings-help settings-field--span-2">
              Enter the exact Comfy API URL from your provider. Local ComfyUI usually uses
              <strong>http://127.0.0.1:8188</strong>. Hosted services can use either a workflow URL with ID, or the collection URL
              <code>https://comfy.icu/api/v1/workflows/</code>. When using the collection URL, style button
              names must match hosted workflow names so the app can auto-pick the workflow ID.
            </p>
            <label class="settings-field settings-field--span-2">
              ComfyUI API Key (for hosted services)
              <input
                class="settings-input form-input settings-input--comfy-key"
                type="password"
                placeholder="Comfy.ICU auth token"
                autocomplete="off"
              />
            </label>
            <div class="settings-comfy-credits settings-field--span-2" aria-live="polite">Remaining credits: --</div>
            <label class="settings-field">
              Minimum hosted credits required
              <input
                class="settings-input form-input settings-input--comfy-min-credits"
                type="number"
                min="0"
                step="1"
                value="2500"
              />
            </label>
            <label class="settings-field">
              Hosted GPU accelerator
              <select class="settings-input form-input settings-input--comfy-accelerator">
                <option value="L4">L4 (default)</option>
                <option value="T4">T4</option>
                <option value="A10">A10</option>
                <option value="A100_40GB">A100_40GB</option>
                <option value="A100_80GB">A100_80GB</option>
                <option value="H100">H100</option>
              </select>
            </label>
          </div>
        </section>

        <section class="settings-section" id="settings-camera">
          <h3 class="settings-section__title">Camera & capture</h3>
          <div class="settings-grid settings-grid--two">
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
              <input class="settings-input settings-input--remote-camera" type="checkbox" />
              Allow phone camera capture from remote
            </label>
          </div>
        </section>

        <section class="settings-section" id="settings-print">
          <h3 class="settings-section__title">Print & sharing</h3>
          <div class="settings-grid settings-grid--two">
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
            <div class="settings-printer-details settings-field--span-2" aria-live="polite">No printer selected.</div>

            <label class="settings-field settings-field--span-2">
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
            <label class="settings-field settings-field--toggle settings-field--span-2">
              <input class="settings-input settings-input--remote-result" type="checkbox" />
              Show finished image on phone remote
            </label>
          </div>
        </section>

        <section class="settings-section" id="settings-watermark">
          <h3 class="settings-section__title">Watermark</h3>
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
        </section>


        <section class="settings-section" id="settings-audio">
          <h3 class="settings-section__title">Audio</h3>
          <div class="settings-grid settings-grid--two">
            <label class="settings-field settings-field--toggle">
              <input class="settings-input settings-input--sound-effects" type="checkbox" />
              Enable sound effects
            </label>
            <label class="settings-field settings-field--toggle">
              <input class="settings-input settings-input--background-music" type="checkbox" />
              Enable looping background music
            </label>
            <p class="settings-help settings-field--span-2">
              Optional files are loaded from <code>/web_ui/sounds</code> using <code>sfx-names.txt</code> and <code>music-names.txt</code>. Missing files are ignored.
            </p>
          </div>
        </section>

        <div class="settings-remote" id="settings-remote">
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

        <div class="settings-actions">
          <button class="settings-action settings-action--save btn btn--primary">Save</button>
          <button class="settings-action settings-action--close btn btn--secondary">Close</button>
        </div>
      </div>
    </div>
  `;
}
