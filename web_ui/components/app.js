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

export function renderApp(container) {
  if (!container) {
    return;
  }
  container.innerHTML = `
    ${renderHud()}
    <video id="camera" autoplay playsinline muted></video>
    ${renderControls()}
    <div class="style-preview-card" aria-live="polite">
      <img class="style-preview__image" alt="Selected style preview" />
    </div>
    ${renderUtilityControls()}
    ${renderGalleryToggle()}
    ${renderProgressOverlay()}
    ${renderIdleOverlay()}
    ${renderSettingsModal()}
    ${renderDiagnosticsModal()}
    ${renderGalleryModal()}
    ${renderOverlays()}
  `;
}
