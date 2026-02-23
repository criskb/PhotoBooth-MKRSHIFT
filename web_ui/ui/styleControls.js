import { toTitleCase } from "./appUtils.js";

function normalizeStyleValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sanitizeStyleList(rawStyles) {
  if (!Array.isArray(rawStyles)) {
    return [];
  }
  const seen = new Set();
  return rawStyles
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .filter((name) => {
      const normalized = normalizeStyleValue(name);
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
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
  const stylesScrollPrev = document.querySelector(".styles-scroll--prev");
  const stylesScrollNext = document.querySelector(".styles-scroll--next");

  function getStyleButtons() {
    if (!stylesContainer) {
      return [];
    }
    return Array.from(stylesContainer.querySelectorAll(".style"));
  }

  function setScrollControlDisabled(button, disabled) {
    if (!button) {
      return;
    }
    button.disabled = disabled;
    button.classList.toggle("styles-scroll--disabled", disabled);
    button.setAttribute("aria-disabled", String(disabled));
  }

  function updateStyleScrollButtons() {
    if (!stylesContainer) {
      return;
    }
    const maxScroll = Math.max(0, stylesContainer.scrollWidth - stylesContainer.clientWidth);
    const atStart = stylesContainer.scrollLeft <= 2;
    const atEnd = stylesContainer.scrollLeft >= maxScroll - 2;
    setScrollControlDisabled(stylesScrollPrev, atStart);
    setScrollControlDisabled(stylesScrollNext, atEnd);
  }

  function scrollStylesBy(direction) {
    if (!stylesContainer) {
      return;
    }
    const amount = Math.max(160, Math.floor(stylesContainer.clientWidth * 0.55));
    stylesContainer.scrollBy({ left: amount * direction, behavior: "smooth" });
    setTimeout(updateStyleScrollButtons, 180);
  }

  function centerActiveStyleButton() {
    if (!stylesContainer || !selectedStyle) {
      return;
    }
    const activeButton = stylesContainer.querySelector(`.style[data-style="${CSS.escape(selectedStyle)}"]`);
    if (!activeButton) {
      return;
    }
    const targetLeft =
      activeButton.offsetLeft - (stylesContainer.clientWidth / 2 - activeButton.clientWidth / 2);
    stylesContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    setTimeout(updateStyleScrollButtons, 180);
  }

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
    const styleButtons = getStyleButtons();

    if (!trimmed) {
      selectedStyle = null;
      styleButtons.forEach((button) => {
        button.classList.remove("style--active");
        button.setAttribute("aria-pressed", "false");
      });
      updateActionButtonState();
      clearStylePreview();
      if (announce) {
        setStatusMeta("Select a style before taking a selfie.");
      }
      return selectedStyle;
    }

    const hasButtons = styleButtons.length > 0;
    const styleExists = styleButtons.some((button) => button.dataset.style === trimmed);
    if (hasButtons && !styleExists) {
      selectedStyle = null;
      styleButtons.forEach((button) => {
        button.classList.remove("style--active");
        button.setAttribute("aria-pressed", "false");
      });
      updateActionButtonState();
      clearStylePreview();
      if (announce) {
        setStatusMeta("Style unavailable. Select another style.");
      }
      return selectedStyle;
    }

    selectedStyle = trimmed;
    styleButtons.forEach((button) => {
      const isMatch = button.dataset.style === trimmed;
      button.classList.toggle("style--active", isMatch);
      button.setAttribute("aria-pressed", String(isMatch));
    });
    updateActionButtonState();
    updateStylePreview(trimmed);
    centerActiveStyleButton();
    if (announce) {
      setStatusMeta(`Style ready: ${toTitleCase(trimmed)}`);
    }
    if (source !== "remote") {
      sendRemoteMessage({ type: "style", style: trimmed, source: "booth" });
    }
    return selectedStyle;
  }

  function renderStyles(styles) {
    const fragment = document.createDocumentFragment();
    if (!styles.length) {
      const empty = document.createElement("span");
      empty.className = "styles-empty";
      empty.textContent = "No styles found in workflows.";
      fragment.appendChild(empty);
      stylesContainer.replaceChildren(fragment);
      setScrollControlDisabled(stylesScrollPrev, true);
      setScrollControlDisabled(stylesScrollNext, true);
      return;
    }
    styles.forEach((style) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "style";
      button.textContent = toTitleCase(style);
      button.dataset.style = style;
      button.title = `Use ${toTitleCase(style)} style`;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        applySelection(style, { source: "booth" });
      });
      fragment.appendChild(button);
    });
    stylesContainer.replaceChildren(fragment);
    updateStyleScrollButtons();
  }

  if (stylesContainer) {
    stylesContainer.addEventListener("scroll", updateStyleScrollButtons, { passive: true });
    stylesContainer.addEventListener("keydown", (event) => {
      const buttons = getStyleButtons();
      if (!buttons.length) {
        return;
      }

      if (event.key === "Home") {
        buttons[0].click();
        buttons[0].focus();
        event.preventDefault();
        return;
      }

      if (event.key === "End") {
        const lastButton = buttons[buttons.length - 1];
        lastButton.click();
        lastButton.focus();
        event.preventDefault();
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      const activeIndex = buttons.findIndex((button) => button.classList.contains("style--active"));
      if (activeIndex < 0) {
        return;
      }
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextButton = buttons[Math.max(0, Math.min(buttons.length - 1, activeIndex + direction))];
      if (nextButton && nextButton !== buttons[activeIndex]) {
        nextButton.click();
        nextButton.focus();
        event.preventDefault();
      }
    });
  }

  if (stylesScrollPrev) {
    stylesScrollPrev.addEventListener("click", () => scrollStylesBy(-1));
  }

  if (stylesScrollNext) {
    stylesScrollNext.addEventListener("click", () => scrollStylesBy(1));
  }

  async function loadStyles({
    endpoint = "/api/styles",
    onOffline,
  } = {}) {
    if (!stylesContainer) {
      return [];
    }
    try {
      stylesContainer.setAttribute("aria-busy", "true");
      if (!stylesContainer.children.length) {
        const loading = document.createElement("span");
        loading.className = "styles-empty styles-empty--loading";
        loading.textContent = "Loading styles";
        stylesContainer.replaceChildren(loading);
      }
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to load styles");
      }
      const data = await response.json();
      const styles = sanitizeStyleList(data.styles);
      stylesContainer.tabIndex = 0;
      renderStyles(styles);
      if (selectedStyle) {
        const selectedNormalized = normalizeStyleValue(selectedStyle);
        const exactMatch = styles.find((style) => style === selectedStyle) ?? null;
        const normalizedMatch = styles.find(
          (style) => normalizeStyleValue(style) === selectedNormalized
        ) ?? null;
        applySelection(exactMatch ?? normalizedMatch ?? null, { announce: false });
      } else if (!styles.length) {
        applySelection(null, { announce: false });
      }
      return styles;
    } catch (error) {
      if (typeof onOffline === "function") {
        onOffline(error);
      }
      if (stylesContainer) {
        const offline = document.createElement("span");
        offline.className = "styles-empty";
        offline.textContent = "Unable to load styles";
        stylesContainer.replaceChildren(offline);
      }
      setScrollControlDisabled(stylesScrollPrev, true);
      setScrollControlDisabled(stylesScrollNext, true);
      applySelection(null, { announce: false });
      return [];
    } finally {
      stylesContainer.removeAttribute("aria-busy");
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
