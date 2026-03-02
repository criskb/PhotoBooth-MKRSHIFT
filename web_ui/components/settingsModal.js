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
          <a class="settings-nav__link" href="#settings-interface">Interface</a>
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
            <label class="settings-field settings-field--toggle settings-field--span-2">
              <input class="settings-input settings-input--comfy-hosted" type="checkbox" checked />
              Enable hosted Comfy workflow API mode (comfy.icu / /api/v1/workflows)
            </label>
            <label class="settings-field settings-field--span-2">
              ComfyUI API Key (for hosted services)
              <input
                class="settings-input form-input settings-input--comfy-key"
                type="password"
                placeholder="Comfy.ICU auth token"
                autocomplete="off"
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
                type="password"
                placeholder="Freeimage API Key"
                autocomplete="off"
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
            add brand watermark on upload/print
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
          <div class="settings-branding">
            <p class="settings-watermark__label">Booth branding</p>
            <div class="settings-brand-profiles">
              <label class="settings-field settings-field--span-2">
                Saved brand profile
                <select class="settings-input form-input settings-input--brand-profile-select"></select>
              </label>
              <label class="settings-field">
                Profile name
                <input class="settings-input form-input settings-input--brand-profile-name" type="text" value="" maxlength="32" placeholder="My Booth Theme" />
              </label>
              <div class="settings-brand-profiles__actions">
                <button class="settings-action settings-action--brand-profile-save btn btn--secondary" type="button">Save profile</button>
                <button class="settings-action settings-action--brand-profile-load btn btn--secondary" type="button">Load profile</button>
                <button class="settings-action settings-action--brand-profile-delete btn btn--secondary" type="button">Delete profile</button>
              </div>
            </div>
            <div class="settings-grid settings-grid--two">
              <label class="settings-field settings-field--span-2">
                Title text
                <input
                  class="settings-input form-input settings-input--brand-title"
                  type="text"
                  value="AI PHOTOBOOTH"
                  maxlength="48"
                />
              </label>
              <label class="settings-field">
                Accent text
                <input
                  class="settings-input form-input settings-input--brand-accent-text"
                  type="text"
                  value="MKR"
                  maxlength="24"
                />
              </label>
              <label class="settings-field">
                Secondary text
                <input
                  class="settings-input form-input settings-input--brand-neutral-text"
                  type="text"
                  value="Shift"
                  maxlength="24"
                />
              </label>
              <label class="settings-field settings-field--span-2">
                Intro badge text
                <input
                  class="settings-input form-input settings-input--brand-intro-badge-text"
                  type="text"
                  value="MKRSHIFT"
                  maxlength="24"
                />
              </label>
              <label class="settings-field settings-field--span-2">
                Booth font
                <select class="settings-input form-input settings-input--brand-font-family">
                  <option value="matter">Matter / Segoe UI</option>
                  <option value="inter">Inter</option>
                  <option value="poppins">Poppins</option>
                  <option value="montserrat">Montserrat</option>
                  <option value="system">System Sans</option>
                </select>
              </label>
              <label class="settings-field">
                Title color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-title-color"
                  type="color"
                  value="#f7f7fb"
                />
              </label>
              <label class="settings-field">
                Accent color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-accent-color"
                  type="color"
                  value="#58d36e"
                />
              </label>
              <label class="settings-field">
                Secondary color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-neutral-color"
                  type="color"
                  value="#f7f7fb"
                />
              </label>
              <label class="settings-field">
                Button color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-button-color"
                  type="color"
                  value="#58d68d"
                />
              </label>
              <label class="settings-field">
                Button text color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-button-text-color"
                  type="color"
                  value="#071b11"
                />
              </label>
              <label class="settings-field">
                Panel tint color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-panel-tint-color"
                  type="color"
                  value="#6f7885"
                />
              </label>
              <label class="settings-field">
                Progress gradient start
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-progress-start-color"
                  type="color"
                  value="#58d68d"
                />
              </label>
              <label class="settings-field">
                Progress gradient end
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-progress-end-color"
                  type="color"
                  value="#feaa3a"
                />
              </label>
              <label class="settings-field">
                Panel background color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-panel-bg-color"
                  type="color"
                  value="#0c101a"
                />
              </label>
              <label class="settings-field">
                Panel border color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-panel-border-color"
                  type="color"
                  value="#f7f7fb"
                />
              </label>
              <label class="settings-field">
                Menu background color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-menu-bg-color"
                  type="color"
                  value="#080b12"
                />
              </label>
              <label class="settings-field">
                Settings quick-nav background
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-settings-nav-bg-color"
                  type="color"
                  value="#090c14"
                />
              </label>
              <label class="settings-field">
                Quick-nav button color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-quick-nav-button-bg-color"
                  type="color"
                  value="#0d121d"
                />
              </label>
              <label class="settings-field">
                Quick-nav button text color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-quick-nav-button-text-color"
                  type="color"
                  value="#f7f7fb"
                />
              </label>
              <label class="settings-field">
                Input background color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-input-bg-color"
                  type="color"
                  value="#0c1018"
                />
              </label>
              <label class="settings-field">
                Input border color
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-input-border-color"
                  type="color"
                  value="#f7f7fb"
                />
              </label>
              <label class="settings-field">
                Card background start
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-card-bg-start-color"
                  type="color"
                  value="#0a0e16"
                />
              </label>
              <label class="settings-field">
                Card background end
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-card-bg-end-color"
                  type="color"
                  value="#080b12"
                />
              </label>
              <label class="settings-field">
                Progress shimmer color A
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-progress-flow-start-color"
                  type="color"
                  value="#5fd3ff"
                />
              </label>
              <label class="settings-field">
                Progress shimmer color B
                <input
                  class="settings-input form-input settings-input--color settings-input--brand-progress-flow-end-color"
                  type="color"
                  value="#feaa3a"
                />
              </label>
            </div>
          </div>
        </section>


        <section class="settings-section" id="settings-interface">
          <h3 class="settings-section__title">Interface</h3>
          <div class="settings-grid settings-grid--two">
            <label class="settings-field settings-field--toggle settings-field--span-2">
              <input class="settings-input settings-input--debate-spark" type="checkbox" />
              Enable Debate Spark widget
            </label>
            <label class="settings-field settings-field--toggle settings-field--span-2">
              <input class="settings-input settings-input--hide-status" type="checkbox" />
              Hide Status widget (top-right) and shift layout
            </label>
            <label class="settings-field settings-field--span-2">
              Intro background animation
              <select class="settings-input form-input settings-input--brand-intro-bg-animation">
                <option value="classic">Classic gradient glow</option>
                <option value="drift">Cinematic drift</option>
                <option value="portals">Portals</option>
                <option value="none">None (static)</option>
              </select>
            </label>
            <label class="settings-field settings-field--toggle settings-field--span-2">
              <input class="settings-input settings-input--diagnostics-shortcut" type="checkbox" />
              Show Diagnostics button
            </label>
            <label class="settings-field settings-field--toggle settings-field--span-2">
              <input class="settings-input settings-input--gallery-shortcut" type="checkbox" />
              Show Gallery button
            </label>
            <div class="settings-inline-actions settings-field--span-2">
              <button class="settings-action settings-action--reset-debate btn btn--secondary" type="button">
                Reset Debate Spark saved results
              </button>
              <span class="settings-debate-reset-status" aria-live="polite"></span>
            </div>
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
          <label class="settings-field settings-field--toggle settings-field--span-2">
            <input class="settings-input settings-input--remote-shortcut" type="checkbox" />
            Show Remote QR button on booth screen
          </label>
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
