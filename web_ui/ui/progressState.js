export const HOSTED_COMFY_WAITING_LABEL = "Please keep patient — image being processed on comfy.icu";

export function createProgressPreviewManager(previewElements) {
  let loadedOutputUrl = null;
  let pendingOutputUrl = null;

  function show(url) {
    previewElements.forEach((element) => {
      element.src = url;
      element.style.display = "block";
    });
  }

  function clear() {
    previewElements.forEach((element) => {
      element.src = "";
      element.style.display = "none";
    });
  }

  function queue(url) {
    if (!url || loadedOutputUrl === url || pendingOutputUrl === url) {
      return;
    }
    pendingOutputUrl = url;
    const image = new Image();
    image.onload = () => {
      loadedOutputUrl = url;
      pendingOutputUrl = null;
      show(url);
    };
    image.onerror = () => {
      if (pendingOutputUrl === url) {
        pendingOutputUrl = null;
      }
    };
    image.src = url;
  }

  function isReady(url) {
    const trimmed = typeof url === "string" ? url.trim() : "";
    return Boolean(trimmed) && loadedOutputUrl === trimmed;
  }

  function reset() {
    loadedOutputUrl = null;
    pendingOutputUrl = null;
    clear();
  }

  return {
    show,
    clear,
    queue,
    isReady,
    reset,
  };
}

export function getHostedProgressState({ progress, outputUrl, outputReadyForDisplay, isHostedComfy }) {
  const waitingForHostedImage = isHostedComfy && !outputReadyForDisplay;
  const percent = waitingForHostedImage
    ? 90
    : Math.max(0, Math.min(100, Math.round(progress.percent ?? 0)));
  const label = waitingForHostedImage
    ? HOSTED_COMFY_WAITING_LABEL
    : progress.label ?? "Sampling";

  return {
    waitingForHostedImage,
    percent,
    label,
    outputUrl: outputUrl || null,
  };
}
