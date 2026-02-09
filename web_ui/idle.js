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
    const cardCount = Math.max(14, Math.ceil((width * height) / 70000));
    const pool = shuffleArray(images);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < cardCount; i += 1) {
      const image = pool[i % pool.length];
      const card = document.createElement("div");
      card.className = "idle-overlay__card";

      const size = randomBetween(140, 260);
      const startX = randomBetween(-0.2 * width, width * 0.9);
      const startY = randomBetween(-0.2 * height, height * 0.9);
      const midX = randomBetween(-0.3 * width, width * 0.95);
      const midY = randomBetween(-0.3 * height, height * 0.95);
      const endX = randomBetween(-0.2 * width, width * 0.9);
      const endY = randomBetween(-0.2 * height, height * 0.9);
      const scale = randomBetween(0.9, 1.12);
      const rotation = randomBetween(-12, 12);
      const opacity = randomBetween(0.45, 0.85);
      const floatDuration = randomBetween(18, 36).toFixed(2);
      const floatDelay = randomBetween(-20, 0).toFixed(2);

      card.style.setProperty("--card-size", `${size}px`);
      card.style.setProperty("--x-start", `${startX}px`);
      card.style.setProperty("--y-start", `${startY}px`);
      card.style.setProperty("--x-mid", `${midX}px`);
      card.style.setProperty("--y-mid", `${midY}px`);
      card.style.setProperty("--x-end", `${endX}px`);
      card.style.setProperty("--y-end", `${endY}px`);
      card.style.setProperty("--scale", scale.toFixed(2));
      card.style.setProperty("--rotation", `${rotation.toFixed(2)}deg`);
      card.style.setProperty("--opacity", opacity.toFixed(2));
      card.style.setProperty("--float-duration", `${floatDuration}s`);
      card.style.setProperty("--float-delay", `${floatDelay}s`);

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
