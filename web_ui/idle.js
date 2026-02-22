const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

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
  const backdrop = document.querySelector(".idle-overlay__backdrop");
  let idleTimer = null;
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

  const show = () => {
    if (paused) {
      return;
    }
    overlay.classList.remove("idle-overlay--hidden");
    overlay.classList.add("idle-overlay--active");
  };

  const hide = () => {
    overlay.classList.add("idle-overlay--hidden");
    overlay.classList.remove("idle-overlay--active");
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

    const width = window.innerWidth || 1024;
    const height = window.innerHeight || 768;
    const laneCount = Math.max(4, Math.min(7, Math.floor(height / 140)));
    const cardsPerLane = Math.max(4, Math.ceil(width / 240));
    const cardCount = laneCount * cardsPerLane;
    const pool = shuffleArray(images);
    const fragment = document.createDocumentFragment();
    const laneGap = height / (laneCount + 1);

    for (let i = 0; i < cardCount; i += 1) {
      const image = pool[i % pool.length];
      const card = document.createElement("div");
      card.className = "idle-overlay__card";

      const lane = i % laneCount;
      const laneY = laneGap * (lane + 1) + randomBetween(-20, 20);
      const depth = randomBetween(0.76, 1.24);
      const size = randomBetween(150, 250) * depth;
      const rotation = randomBetween(-8, 8);
      const opacity = Math.max(0.35, Math.min(0.9, 0.72 * depth));
      const floatDuration = randomBetween(16, 26).toFixed(2);
      const floatDelay = randomBetween(-24, 0).toFixed(2);
      const drift = randomBetween(-20, 20).toFixed(2);
      const blur = Math.max(0, (1 - depth) * 3.2).toFixed(2);

      card.style.setProperty("--card-size", `${size.toFixed(2)}px`);
      card.style.setProperty("--lane-y", `${laneY.toFixed(2)}px`);
      card.style.setProperty("--scale", depth.toFixed(2));
      card.style.setProperty("--rotation", `${rotation.toFixed(2)}deg`);
      card.style.setProperty("--opacity", opacity.toFixed(2));
      card.style.setProperty("--float-duration", `${floatDuration}s`);
      card.style.setProperty("--float-delay", `${floatDelay}s`);
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
      if (images.length && backdrop) {
        const backdropImage = images[Math.floor(Math.random() * images.length)];
        backdrop.style.backgroundImage = `url("${backdropImage}")`;
      }
      buildCanvas();
    } catch (error) {
      images = [];
      canvas.innerHTML = "";
      if (backdrop) {
        backdrop.style.backgroundImage = "none";
      }
    }
  };

  const handleResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(buildCanvas, 250);
  };

  window.addEventListener("resize", handleResize);

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
