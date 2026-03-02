const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_BACKDROP_CYCLE_MS = 8500;

function shuffleArray(values) {
  const array = [...values];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

const portalGlowCache = new Map();

function samplePortalGlowRgb(imageSrc) {
  if (!imageSrc) {
    return Promise.resolve(null);
  }
  if (portalGlowCache.has(imageSrc)) {
    return portalGlowCache.get(imageSrc);
  }

  const samplePromise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve(null);
          return;
        }
        const sampleSize = 16;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        context.drawImage(img, 0, 0, sampleSize, sampleSize);
        const data = context.getImageData(0, 0, sampleSize, sampleSize).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 30) {
            continue;
          }
          red += data[i];
          green += data[i + 1];
          blue += data[i + 2];
          count += 1;
        }

        if (!count) {
          resolve(null);
          return;
        }
        resolve(`${Math.round(red / count)}, ${Math.round(green / count)}, ${Math.round(blue / count)}`);
      } catch (_error) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });

  portalGlowCache.set(imageSrc, samplePromise);
  return samplePromise;
}

export function initIdleOverlay({ timeoutMs = DEFAULT_IDLE_TIMEOUT_MS } = {}) {
  const overlay = document.querySelector(".idle-overlay");
  const canvas = document.querySelector(".idle-overlay__canvas");
  const backdrops = Array.from(document.querySelectorAll(".idle-overlay__backdrop"));
  let idleTimer = null;
  let backdropCycleTimer = null;
  let activeBackdropIndex = -1;
  let lastBackdropImage = "";
  let backdropDirectionForward = true;
  let images = [];
  let resizeTimer = null;
  let paused = false;

  if (!overlay || !canvas) {
    return {
      loadImages: async () => {},
      show: () => {},
      hide: () => {},
      schedule: () => {},
      handleUserActivity: () => {},
      pause: () => {},
      resume: () => {},
    };
  }

  const stopBackdropCycle = () => {
    if (backdropCycleTimer) {
      clearInterval(backdropCycleTimer);
      backdropCycleTimer = null;
    }
  };

  const clearBackdrops = () => {
    activeBackdropIndex = -1;
    lastBackdropImage = "";
    backdrops.forEach((backdrop) => {
      backdrop.classList.remove("idle-overlay__backdrop--active");
      backdrop.style.backgroundImage = "none";
    });
  };

  const pickBackdropImage = () => {
    if (!images.length) {
      return null;
    }
    if (images.length === 1) {
      lastBackdropImage = images[0];
      return images[0];
    }
    let next = images[Math.floor(Math.random() * images.length)];
    for (let attempts = 0; attempts < 5 && next === lastBackdropImage; attempts += 1) {
      next = images[Math.floor(Math.random() * images.length)];
    }
    lastBackdropImage = next;
    return next;
  };

  const applyBackdropImage = (backdrop, image) => {
    if (!backdrop || !image) {
      return;
    }
    const travelX = randomBetween(1.8, 4.8);
    const travelY = randomBetween(1.2, 3.8);
    const horizontalSign = backdropDirectionForward ? 1 : -1;
    const startX = travelX * -horizontalSign;
    const midX = randomBetween(-0.9, 0.9);
    const endX = travelX * horizontalSign * randomBetween(0.75, 1.1);
    const startY = randomBetween(-travelY, travelY);
    const midY = randomBetween(-0.7, 0.7);
    const endY = -startY * randomBetween(0.5, 1.1);
    backdropDirectionForward = !backdropDirectionForward;

    backdrop.style.backgroundImage = `url("${image}")`;
    backdrop.style.setProperty("--bg-focus-x", `${randomBetween(18, 82).toFixed(2)}%`);
    backdrop.style.setProperty("--bg-focus-y", `${randomBetween(12, 88).toFixed(2)}%`);
    backdrop.style.setProperty("--bg-pan-duration", `${randomBetween(18, 28).toFixed(2)}s`);
    backdrop.style.setProperty("--bg-scale-start", randomBetween(1.08, 1.16).toFixed(3));
    backdrop.style.setProperty("--bg-scale-mid", randomBetween(1.15, 1.23).toFixed(3));
    backdrop.style.setProperty("--bg-scale-end", randomBetween(1.22, 1.31).toFixed(3));
    backdrop.style.setProperty("--bg-shift-start-x", `${startX.toFixed(2)}%`);
    backdrop.style.setProperty("--bg-shift-start-y", `${startY.toFixed(2)}%`);
    backdrop.style.setProperty("--bg-shift-mid-x", `${midX.toFixed(2)}%`);
    backdrop.style.setProperty("--bg-shift-mid-y", `${midY.toFixed(2)}%`);
    backdrop.style.setProperty("--bg-shift-end-x", `${endX.toFixed(2)}%`);
    backdrop.style.setProperty("--bg-shift-end-y", `${endY.toFixed(2)}%`);
  };

  const cycleBackdrops = ({ instant = false } = {}) => {
    if (!images.length || !backdrops.length) {
      return;
    }

    const image = pickBackdropImage();
    if (!image) {
      return;
    }

    const nextIndex = activeBackdropIndex < 0 ? 0 : (activeBackdropIndex + 1) % backdrops.length;
    const nextBackdrop = backdrops[nextIndex];
    const previousBackdrop = activeBackdropIndex >= 0 ? backdrops[activeBackdropIndex] : null;

    applyBackdropImage(nextBackdrop, image);

    nextBackdrop.classList.remove("idle-overlay__backdrop--active", "idle-overlay__backdrop--instant");
    if (instant) {
      nextBackdrop.classList.add("idle-overlay__backdrop--instant");
      nextBackdrop.classList.add("idle-overlay__backdrop--active");
      requestAnimationFrame(() => {
        nextBackdrop.classList.remove("idle-overlay__backdrop--instant");
      });
    } else {
      requestAnimationFrame(() => {
        nextBackdrop.classList.add("idle-overlay__backdrop--active");
      });
    }

    if (previousBackdrop && previousBackdrop !== nextBackdrop) {
      previousBackdrop.classList.remove("idle-overlay__backdrop--active");
    }

    activeBackdropIndex = nextIndex;
  };

  const startBackdropCycle = ({ forceInitial = false } = {}) => {
    stopBackdropCycle();
    if (!images.length || !backdrops.length) {
      return;
    }

    if (forceInitial || activeBackdropIndex < 0) {
      cycleBackdrops({ instant: true });
    }
    backdropCycleTimer = setInterval(() => {
      cycleBackdrops();
    }, DEFAULT_BACKDROP_CYCLE_MS);
  };

  const show = () => {
    if (paused) {
      return;
    }
    overlay.classList.remove("idle-overlay--hidden");
    overlay.classList.add("idle-overlay--active");
    startBackdropCycle();
  };

  const hide = () => {
    overlay.classList.add("idle-overlay--hidden");
    overlay.classList.remove("idle-overlay--active");
    stopBackdropCycle();
  };

  const schedule = () => {
    if (paused) {
      return;
    }
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(show, timeoutMs);
  };

  const handleUserActivity = () => {
    if (paused) {
      return;
    }
    if (!overlay.classList.contains("idle-overlay--hidden")) {
      hide();
    }
    schedule();
  };

  const buildCanvas = () => {
    canvas.innerHTML = "";
    if (!images.length) {
      return;
    }

    const portalsMode = document.body.classList.contains("intro-bg-portals");
    const kaleidoMode = document.body.classList.contains("intro-bg-kaleido");
    const orbitMode = document.body.classList.contains("intro-bg-orbit");
    const stripsMode = document.body.classList.contains("intro-bg-strips");

    const width = window.innerWidth || 1024;
    const height = window.innerHeight || 768;
    const laneCount = portalsMode
      ? 1
      : stripsMode
        ? Math.max(4, Math.min(8, Math.floor(width / 220)))
        : Math.max(4, Math.min(7, Math.floor(height / 140)));
    const portalsCardHeight = Math.max(240, Math.min(height - 220, 520));
    const portalsCardSize = portalsCardHeight * (4 / 7);
    const portalsGap = 150;
    const portalsCenterSpacing = portalsCardSize + portalsGap;
    const cardsPerLane = portalsMode
      ? Math.max(4, Math.ceil((width + portalsCardSize * 1.5) / portalsCenterSpacing))
      : stripsMode
        ? Math.max(5, Math.ceil((height + 420) / 230))
        : kaleidoMode
          ? Math.max(6, Math.ceil(width / 180))
          : orbitMode
            ? Math.max(10, Math.ceil(width / 110))
            : Math.max(4, Math.ceil(width / 240));
    const cardCount = portalsMode
      ? Math.max(cardsPerLane, images.length)
      : kaleidoMode
        ? Math.max(2, Math.min(images.length || 2, 12))
        : orbitMode
          ? Math.max(images.length, cardsPerLane)
          : stripsMode
            ? Math.max(images.length, cardsPerLane * laneCount)
            : laneCount * cardsPerLane;
    const pool = shuffleArray(images);
    const fragment = document.createDocumentFragment();
    const laneGap = height / (laneCount + 1);

    for (let i = 0; i < cardCount; i += 1) {
      const image = pool[i % pool.length];
      const card = document.createElement("div");
      card.className = "idle-overlay__card";

      const lane = i % laneCount;
      const laneY = portalsMode
        ? (height - portalsCardHeight) * 0.5
        : stripsMode
          ? ((lane + 0.5) * width) / laneCount
          : laneGap * (lane + 1) + randomBetween(-20, 20);
      const depth = (portalsMode || kaleidoMode || orbitMode || stripsMode) ? 1 : randomBetween(0.76, 1.24);
      const size = portalsMode
        ? portalsCardSize
        : kaleidoMode
          ? Math.max(width, height) * 1.25
          : orbitMode
            ? randomBetween(150, 230)
            : stripsMode
              ? randomBetween(140, 190)
              : randomBetween(150, 250) * depth;
      const rotation = portalsMode ? 0 : kaleidoMode ? randomBetween(-8, 8) : orbitMode ? randomBetween(-10, 10) : 0;
      const opacity = portalsMode ? 0.9 : kaleidoMode ? 1 : orbitMode ? 0.78 : stripsMode ? 0.82 : Math.max(0.35, Math.min(0.9, 0.72 * depth));
      const floatDuration = portalsMode ? 22 : kaleidoMode ? Math.max(14, cardCount * 3.5) : orbitMode ? 26 : stripsMode ? 24 : Number(randomBetween(16, 26).toFixed(2));
      const floatDelay = portalsMode
        ? -((i / cardsPerLane) * floatDuration)
        : kaleidoMode
          ? -((i / cardCount) * floatDuration)
          : orbitMode
            ? -((i / cardCount) * floatDuration)
            : stripsMode
              ? -((Math.floor(i / laneCount) / cardsPerLane) * floatDuration)
              : Number(randomBetween(-24, 0).toFixed(2));
      const drift = (portalsMode || stripsMode) ? "0" : randomBetween(-20, 20).toFixed(2);
      const blur = (portalsMode || kaleidoMode || orbitMode || stripsMode) ? "0" : Math.max(0, (1 - depth) * 3.2).toFixed(2);

      card.style.setProperty("--card-size", `${size.toFixed(2)}px`);
      card.style.setProperty("--lane-y", `${laneY.toFixed(2)}px`);
      card.style.setProperty("--scale", depth.toFixed(2));
      card.style.setProperty("--rotation", `${rotation.toFixed(2)}deg`);
      card.style.setProperty("--opacity", opacity.toFixed(2));
      card.style.setProperty("--float-duration", `${Number(floatDuration).toFixed(2)}s`);
      card.style.setProperty("--float-delay", `${Number(floatDelay).toFixed(2)}s`);
      card.style.setProperty("--drift", `${drift}px`);
      card.style.setProperty("--blur", `${blur}px`);

      if (kaleidoMode) {
        card.classList.add("idle-overlay__card--kaleido");
        card.style.setProperty("--kaleido-duration", `${floatDuration.toFixed(2)}s`);
        card.style.setProperty("--kaleido-delay", `${floatDelay.toFixed(2)}s`);
        card.style.setProperty("--kaleido-rotation", `${rotation.toFixed(2)}deg`);
      } else if (orbitMode) {
        card.classList.add("idle-overlay__card--orbit");
        const angle = (i / cardCount) * Math.PI * 2;
        const radiusX = Math.max(220, width * 0.26);
        const radiusY = Math.max(140, height * 0.2);
        card.style.setProperty("--orbit-x", `${(Math.cos(angle) * radiusX).toFixed(2)}px`);
        card.style.setProperty("--orbit-y", `${(Math.sin(angle) * radiusY).toFixed(2)}px`);
      } else if (stripsMode) {
        card.classList.add("idle-overlay__card--strips");
        const row = Math.floor(i / laneCount);
        card.style.setProperty("--strip-x", `${laneY.toFixed(2)}px`);
        card.style.setProperty("--strip-start", `${(height + row * 220).toFixed(2)}px`);
      }

      const img = document.createElement("img");
      img.src = image;
      img.alt = "";
      img.loading = portalsMode ? "eager" : "lazy";
      if (portalsMode) {
        const applyGlow = () => {
          samplePortalGlowRgb(image).then((rgb) => {
            if (rgb) {
              card.style.setProperty("--portal-glow-rgb", rgb);
            }
          });
        };
        if (img.complete) {
          applyGlow();
        } else {
          img.addEventListener("load", applyGlow, { once: true });
        }
      }
      card.appendChild(img);
      fragment.appendChild(card);
    }

    canvas.appendChild(fragment);
  };

  const loadImages = async () => {
    try {
      const response = await fetch("/api/idle-images");
      if (!response.ok) {
        throw new Error("Idle images unavailable");
      }
      const data = await response.json();
      images = Array.from(data.images ?? []);
      buildCanvas();
      clearBackdrops();
      if (images.length) {
        cycleBackdrops({ instant: true });
        if (!overlay.classList.contains("idle-overlay--hidden")) {
          startBackdropCycle();
        }
      }
    } catch (error) {
      images = [];
      canvas.innerHTML = "";
      stopBackdropCycle();
      clearBackdrops();
    }
  };

  const handleResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(buildCanvas, 250);
  };

  window.addEventListener("resize", handleResize);
  window.addEventListener("idle-theme-changed", buildCanvas);

  const pause = () => {
    paused = true;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    hide();
  };

  const resume = () => {
    paused = false;
    schedule();
  };

  return {
    loadImages,
    show,
    hide,
    schedule,
    handleUserActivity,
    pause,
    resume,
  };
}
