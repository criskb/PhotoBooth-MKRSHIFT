import { toTitleCase } from "./appUtils.js";

function sanitizeStyleList(rawStyles) {
  if (!Array.isArray(rawStyles)) {
    return [];
  }
  return rawStyles
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

export function createStyleController({
  stylesContainer,
  stylePreview,
  stylePreviewImage,
  updateActionButtonState,
  setStatusMeta,
  sendRemoteMessage,
}) {
  let selectedStyle = null;
  let stylePreviewToken = 0;

  function clearStylePreview() {
    if (!stylePreview || !stylePreviewImage) {
      return;
    }
    stylePreview.classList.remove("style-preview--visible");
    stylePreviewImage.removeAttribute("src");
  }

  function updateStylePreview(style) {
    if (!stylePreview || !stylePreviewImage) {
      return;
    }
    const trimmed = typeof style === "string" ? style.trim() : "";
    if (!trimmed) {
      clearStylePreview();
      return;
    }
    stylePreviewToken += 1;
    const token = stylePreviewToken;
    const previewUrl = `/api/style-preview?style=${encodeURIComponent(trimmed)}`;
    stylePreviewImage.onload = () => {
      if (token !== stylePreviewToken) {
        return;
      }
      stylePreview.classList.add("style-preview--visible");
    };
    stylePreviewImage.onerror = () => {
      if (token !== stylePreviewToken) {
        return;
      }
      clearStylePreview();
    };
    stylePreviewImage.src = previewUrl;
  }

  function applySelection(style, { source = "booth", announce = true } = {}) {
    const trimmed = typeof style === "string" ? style.trim() : "";
    if (!trimmed) {
      selectedStyle = null;
      updateActionButtonState();
      clearStylePreview();
      if (announce) {
        setStatusMeta("Select a style before taking a selfie.");
      }
      return selectedStyle;
    }

    selectedStyle = trimmed;
    document.querySelectorAll(".style").forEach((button) => {
      const isMatch = button.dataset.style === trimmed;
      button.classList.toggle("style--active", isMatch);
    });
    updateActionButtonState();
    updateStylePreview(trimmed);
    if (announce) {
      setStatusMeta(`Style ready: ${toTitleCase(trimmed)}`);
    }
    if (source !== "remote") {
      sendRemoteMessage({ type: "style", style: trimmed, source: "booth" });
    }
    return selectedStyle;
  }

  async function loadStyles({
    endpoint = "/api/styles",
    onOffline,
  } = {}) {
    if (!stylesContainer) {
      return [];
    }
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to load styles");
      }
      const data = await response.json();
      const styles = sanitizeStyleList(data.styles);
      const fragment = document.createDocumentFragment();
      styles.forEach((style) => {
        const button = document.createElement("button");
        button.className = "style";
        button.textContent = toTitleCase(style);
        button.dataset.style = style;
        button.addEventListener("click", () => {
          applySelection(style, { source: "booth" });
        });
        fragment.appendChild(button);
      });
      if (styles.length > 0) {
        stylesContainer.replaceChildren(fragment);
      }
      if (selectedStyle) {
        applySelection(selectedStyle, { announce: false });
      }
      return styles;
    } catch (error) {
      if (typeof onOffline === "function") {
        onOffline(error);
      }
      return [];
    }
  }

  function getSelectedStyle() {
    return selectedStyle;
  }

  return {
    loadStyles,
    applySelection,
    clearStylePreview,
    getSelectedStyle,
  };
}
