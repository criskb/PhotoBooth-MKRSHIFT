import { renderHud } from "./hud.js";
import { renderControls } from "./controls.js";
import { renderUtilityControls } from "./utilityControls.js";
import { renderGalleryToggle } from "./galleryToggle.js";
import { renderProgressOverlay } from "./progressOverlay.js";
import { renderIdleOverlay } from "./idleOverlay.js";
import { renderSettingsModal } from "./settingsModal.js";
import { renderGalleryModal } from "./galleryModal.js";
import { renderOverlays } from "./overlays.js";
import { renderDiagnosticsModal } from "./diagnosticsModal.js";
import { renderTosModal } from "./tosModal.js";

export function renderApp(container) {
  if (!container) {
    return;
  }
  container.innerHTML = `
    ${renderHud()}
    <video id="camera" autoplay playsinline muted></video>
    <div class="capture-controls">
      <button class="action" disabled>Take Selfie</button>
      <div class="timer-control">
        <button class="timer-toggle" aria-haspopup="true" aria-expanded="false">⏱️ 0s</button>
        <div class="timer-menu" role="menu">
          <button class="timer-option" data-delay="0" role="menuitem">0s</button>
          <button class="timer-option" data-delay="3" role="menuitem">3s</button>
          <button class="timer-option" data-delay="5" role="menuitem">5s</button>
          <button class="timer-option" data-delay="10" role="menuitem">10s</button>
        </div>
      </div>
    </div>
    <div class="controls-preview-group">
      ${renderControls()}
      <div class="style-preview-card" aria-live="polite">
        <img class="style-preview__image" alt="Selected style preview" />
      </div>
    </div>
    ${renderUtilityControls()}
    ${renderGalleryToggle()}
    ${renderProgressOverlay()}
    ${renderIdleOverlay()}
    ${renderSettingsModal()}
    ${renderDiagnosticsModal()}
    ${renderTosModal()}
    ${renderGalleryModal()}
    ${renderOverlays()}
  `;
}
