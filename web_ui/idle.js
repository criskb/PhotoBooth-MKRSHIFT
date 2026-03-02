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

    const width = window.innerWidth || 1024;
    const height = window.innerHeight || 768;
    const laneCount = portalsMode
      ? 1
      : Math.max(4, Math.min(7, Math.floor(height / 140)));
    const cardsPerLane = portalsMode
      ? Math.max(6, Math.ceil(width / 240) + 2)
      : Math.max(4, Math.ceil(width / 240));
    const cardCount = laneCount * cardsPerLane;
    const pool = shuffleArray(images);
    const fragment = document.createDocumentFragment();
    const laneGap = height / (laneCount + 1);

    for (let i = 0; i < cardCount; i += 1) {
      const image = pool[i % pool.length];
      const card = document.createElement("div");
      card.className = "idle-overlay__card";

      const lane = i % laneCount;
      const laneY = portalsMode
        ? height * 0.5
        : laneGap * (lane + 1) + randomBetween(-20, 20);
      const depth = portalsMode ? 1 : randomBetween(0.76, 1.24);
      const size = portalsMode ? Math.max(210, Math.min(330, height * 0.46)) : randomBetween(150, 250) * depth;
      const rotation = portalsMode ? 0 : randomBetween(-8, 8);
      const opacity = portalsMode ? 0.9 : Math.max(0.35, Math.min(0.9, 0.72 * depth));
      const floatDuration = portalsMode ? 18 : Number(randomBetween(16, 26).toFixed(2));
      const floatDelay = portalsMode
        ? -((i / cardsPerLane) * floatDuration)
        : Number(randomBetween(-24, 0).toFixed(2));
      const drift = portalsMode ? "0" : randomBetween(-20, 20).toFixed(2);
      const blur = portalsMode ? "0" : Math.max(0, (1 - depth) * 3.2).toFixed(2);

      card.style.setProperty("--card-size", `${size.toFixed(2)}px`);
      card.style.setProperty("--lane-y", `${laneY.toFixed(2)}px`);
      card.style.setProperty("--scale", depth.toFixed(2));
      card.style.setProperty("--rotation", `${rotation.toFixed(2)}deg`);
      card.style.setProperty("--opacity", opacity.toFixed(2));
      card.style.setProperty("--float-duration", `${Number(floatDuration).toFixed(2)}s`);
      card.style.setProperty("--float-delay", `${Number(floatDelay).toFixed(2)}s`);
      card.style.setProperty("--drift", `${drift}px`);
      card.style.setProperty("--blur", `${blur}px`);

      const img = document.createElement("img");
      img.src = image;
      img.alt = "";
      img.loading = "lazy";
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
