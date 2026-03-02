import { initIdleOverlay } from "./idle.js";
import { renderApp } from "./components/index.js";
import {
  HOSTED_COMFY_WAITING_LABEL,
  createProgressPreviewManager,
  getHostedProgressState,
} from "./ui/progressState.js";
import { createStyleController } from "./ui/styleControls.js";
import { createPrinterController } from "./ui/printerControls.js";
import {
  formatUptime,
  getOrientationDegrees,
  hasUsableOutputUrl,
  isHostedComfyUrl,
  normalizeComfyInput,
  toPrinterEntry,
  toTitleCase,
} from "./ui/appUtils.js";
import {
  storageKeys,
  readStoredValue,
  writeStoredValue,
  removeStoredValue,
  readStoredJson,
  writeStoredJson,
} from "./settingsStore.js";

const appRoot =
  document.querySelector(".app") ??
  (() => {
    const root = document.createElement("div");
    root.className = "app";
    document.body.appendChild(root);
    return root;
  })();
renderApp(appRoot);

const video = document.querySelector("#camera");
const stylesContainer = document.querySelector(".styles");
const stylePreview = document.querySelector(".style-preview-card");
const stylePreviewImage = document.querySelector(".style-preview__image");
const styleSelectedValue = document.querySelector(".styles-selected__value");
const statusLabel = document.querySelector(".status__label");
const statusMeta = document.querySelector(".status__meta");
const statusConnection = document.querySelector(".status__connection");
const brandTitleLabel = document.querySelector(".brand__title");
const brandSubtitleAccentLabel = document.querySelector(".brand__subtitle-accent");
const brandSubtitleNeutralLabel = document.querySelector(".brand__subtitle-neutral");
const idleOverlayEyebrowAccentLabel = document.querySelector(".idle-overlay__eyebrow-accent");
const debateSpark = document.querySelector(".debate-spark");
const debatePromptLabel = document.querySelector(".debate-spark__prompt");
const debateStreakLabel = document.querySelector(".debate-spark__streak");
const debateMeterFill = document.querySelector(".debate-spark__meter-fill");
const debateMeterEmoji = document.querySelector(".debate-spark__meter-emoji");
const debateVotesLabel = document.querySelector(".debate-spark__votes");
const debateSplitLabel = document.querySelector(".debate-spark__split");
const debateHeatLabel = document.querySelector(".debate-spark__heat");
const debateAgreeButton = document.querySelector(".debate-spark__button--yes");
const debateDisagreeButton = document.querySelector(".debate-spark__button--no");
const debateNextButton = document.querySelector(".debate-spark__button--next");
const debateResetButton = document.querySelector(".debate-spark__button--reset");
const actionButton = document.querySelector(".action");
const timerToggle = document.querySelector(".timer-toggle");
const timerMenu = document.querySelector(".timer-menu");
const timerOptions = Array.from(document.querySelectorAll(".timer-option"));
const progressLabels = Array.from(document.querySelectorAll(".progress__label"));
const progressValues = Array.from(document.querySelectorAll(".progress__value"));
const progressFills = Array.from(document.querySelectorAll(".progress__fill"));
const progressPreviews = Array.from(document.querySelectorAll(".progress__preview"));
const progressPreviewManager = createProgressPreviewManager(progressPreviews);
const uploadButton = document.querySelector(".progress-action--upload");
const printButton = document.querySelector(".progress-action--print");
const doneButton = document.querySelector(".progress-action--done");
const redoButton = document.querySelector(".progress-action--redo");
const qrContainer = document.querySelector(".progress__qr");
const qrImage = document.querySelector(".progress__qr-image");
const progressCloseButton = document.querySelector(".progress-close");
const remoteToggle = document.querySelector(".remote-toggle");
const tosToggle = document.querySelector(".tos-toggle");
const settingsToggle = document.querySelector(".settings-toggle");
const fullscreenToggle = document.querySelector(".fullscreen-toggle");
const remoteLaunchModal = document.querySelector(".remote-launch-modal");
const remoteLaunchClose = document.querySelector(".remote-launch-close");
const settingsModal = document.querySelector(".settings-modal");
const settingsComfyInput = document.querySelector(".settings-input--comfy");
const settingsComfyKeyInput = document.querySelector(".settings-input--comfy-key");
const settingsComfyMinCreditsInput = document.querySelector(".settings-input--comfy-min-credits");
const settingsComfyAcceleratorInput = document.querySelector(".settings-input--comfy-accelerator");
const settingsComfyHostedInput = document.querySelector(".settings-input--comfy-hosted");
const settingsOrientationInput = document.querySelector(".settings-input--orientation");
const settingsCameraInput = document.querySelector(".settings-input--camera");
const settingsMirrorInput = document.querySelector(".settings-input--mirror");
const settingsPrinterInput = document.querySelector(".settings-input--printer");
const settingsPrinterDetails = document.querySelector(".settings-printer-details");
const settingsPrinterCopiesInput = document.querySelector(".settings-input--printer-copies");
const settingsFreeimageInput = document.querySelector(".settings-input--freeimage");
const settingsEnabledInput = document.querySelector(".settings-input--enabled");
const settingsHidePrintInput = document.querySelector(".settings-input--hide-print");
const settingsUploadsInput = document.querySelector(".settings-input--uploads");
const settingsHideQrInput = document.querySelector(".settings-input--hide-qr");
const settingsRemoteResultInput = document.querySelector(".settings-input--remote-result");
const settingsRemoteCameraInput = document.querySelector(".settings-input--remote-camera");
const settingsRemoteShortcutInput = document.querySelector(".settings-input--remote-shortcut");
const settingsSoundEffectsInput = document.querySelector(".settings-input--sound-effects");
const settingsBackgroundMusicInput = document.querySelector(".settings-input--background-music");
const settingsDebateSparkInput = document.querySelector(".settings-input--debate-spark");
const settingsHideStatusInput = document.querySelector(".settings-input--hide-status");
const settingsDiagnosticsShortcutInput = document.querySelector(".settings-input--diagnostics-shortcut");
const settingsGalleryShortcutInput = document.querySelector(".settings-input--gallery-shortcut");
const settingsResetDebateAction = document.querySelector(".settings-action--reset-debate");
const settingsDebateResetStatus = document.querySelector(".settings-debate-reset-status");
const settingsWatermarkInput = document.querySelector(".settings-input--watermark");
const settingsWatermarkPreview = document.querySelector(".settings-watermark__image");
const settingsWatermarkTextInput = document.querySelector(".settings-input--watermark-text");
const settingsWatermarkFileInput = document.querySelector(".settings-input--watermark-file");
const settingsWatermarkClear = document.querySelector(".settings-action--clear-watermark");
const settingsBrandTitleInput = document.querySelector(".settings-input--brand-title");
const settingsBrandAccentTextInput = document.querySelector(".settings-input--brand-accent-text");
const settingsBrandNeutralTextInput = document.querySelector(".settings-input--brand-neutral-text");
const settingsBrandIntroBadgeTextInput = document.querySelector(".settings-input--brand-intro-badge-text");
const settingsBrandTitleColorInput = document.querySelector(".settings-input--brand-title-color");
const settingsBrandAccentColorInput = document.querySelector(".settings-input--brand-accent-color");
const settingsBrandNeutralColorInput = document.querySelector(".settings-input--brand-neutral-color");
const settingsBrandButtonColorInput = document.querySelector(".settings-input--brand-button-color");
const settingsBrandButtonTextColorInput = document.querySelector(".settings-input--brand-button-text-color");
const settingsBrandPanelTintColorInput = document.querySelector(".settings-input--brand-panel-tint-color");
const settingsBrandProgressStartColorInput = document.querySelector(".settings-input--brand-progress-start-color");
const settingsBrandProgressEndColorInput = document.querySelector(".settings-input--brand-progress-end-color");
const settingsBrandPanelBgColorInput = document.querySelector(".settings-input--brand-panel-bg-color");
const settingsBrandPanelBorderColorInput = document.querySelector(".settings-input--brand-panel-border-color");
const settingsBrandMenuBgColorInput = document.querySelector(".settings-input--brand-menu-bg-color");
const settingsBrandProgressFlowStartColorInput = document.querySelector(".settings-input--brand-progress-flow-start-color");
const settingsBrandProgressFlowEndColorInput = document.querySelector(".settings-input--brand-progress-flow-end-color");
const settingsBrandCardBgStartColorInput = document.querySelector(".settings-input--brand-card-bg-start-color");
const settingsBrandCardBgEndColorInput = document.querySelector(".settings-input--brand-card-bg-end-color");
const settingsBrandProfileSelect = document.querySelector(".settings-input--brand-profile-select");
const settingsBrandProfileNameInput = document.querySelector(".settings-input--brand-profile-name");
const settingsBrandProfileSave = document.querySelector(".settings-action--brand-profile-save");
const settingsBrandProfileLoad = document.querySelector(".settings-action--brand-profile-load");
const settingsBrandProfileDelete = document.querySelector(".settings-action--brand-profile-delete");
const settingsRemoteQr = document.querySelector(".settings-remote__qr");
const settingsRemoteLink = document.querySelector(".settings-remote__link");
const remoteLaunchQr = document.querySelector(".remote-launch-qr");
const remoteLaunchLink = document.querySelector(".remote-launch-link");
const settingsSave = document.querySelector(".settings-action--save");
const settingsClose = document.querySelector(".settings-action--close");
const diagnosticsToggle = document.querySelector(".diagnostics-toggle");
const diagnosticsModal = document.querySelector(".diagnostics-modal");
const diagnosticsClose = document.querySelector(".diagnostics-close");
const tosModal = document.querySelector(".tos-modal");
const tosClose = document.querySelector(".tos-close");
const diagnosticsRefresh = document.querySelector(".diagnostics-refresh");
const diagnosticsServer = document.querySelector(".diagnostics-value--server");
const diagnosticsSocket = document.querySelector(".diagnostics-value--socket");
const diagnosticsApi = document.querySelector(".diagnostics-value--api");
const diagnosticsUptime = document.querySelector(".diagnostics-value--uptime");
const galleryToggle = document.querySelector(".gallery-toggle");
const galleryModal = document.querySelector(".gallery-modal");
const galleryClose = document.querySelector(".gallery-close");
const galleryList = document.querySelector(".gallery-list");
const gallerySearch = document.querySelector(".gallery-search");
const gallerySort = document.querySelector(".gallery-sort");
const galleryClear = document.querySelector(".gallery-clear");
const galleryRefresh = document.querySelector(".gallery-refresh");
const gallerySummary = document.querySelector(".gallery-summary");
const galleryMetaId = document.querySelector(".gallery-meta__value--id");
const galleryMetaDate = document.querySelector(".gallery-meta__value--date");
const galleryMetaFile = document.querySelector(".gallery-meta__value--file");
const galleryInputImage = document.querySelector(".gallery-image--input");
const galleryOutputImage = document.querySelector(".gallery-image--output");
const galleryUploadButton = document.querySelector(".gallery-action--upload");
const galleryPrintButton = document.querySelector(".gallery-action--print");
const galleryDeleteButton = document.querySelector(".gallery-action--delete");
const galleryUploadStatus = document.querySelector(".gallery-upload-status");
const galleryQr = document.querySelector(".gallery-qr");
const galleryQrImage = document.querySelector(".gallery-qr-image");
const countdownOverlay = document.querySelector(".countdown-overlay");
const countdownValue = document.querySelector(".countdown-value");
const flashOverlay = document.querySelector(".flash-overlay");
const idleOverlay = document.querySelector(".idle-overlay");

let selectedStyle = null;
let isQueueing = false;
let lastShake = 0;
let motionPermissionGranted = false;
let currentPromptId = null;
let progressPoller = null;
let outputReady = false;
let lastOutputUrl = null;
let lastCapturedImageData = null;
let printerConfig = { name: "", enabled: false, copies: 1 };
let freeimageApiKey = "";
let comfyApiKey = "";
let comfyMinCredits = 2500;
let comfyAccelerator = "L4";
let comfyHostedEnabled = true;
let selectedGalleryUrl = "";
let galleryItems = [];
let galleryFilterText = "";
let gallerySortOrder = "recent";
let selectedDelay = 0;
let countdownTimer = null;
let countdownActive = false;
const countdownGlyphUrlByValue = new Map();
const countdownGlyphExtensions = ["svg", "png", "webp", "jpg", "jpeg"];
let countdownGlyphToken = 0;
let debatePromptIndex = 0;
let debateStreak = 0;
let debateHeat = 0;
let debatePromptVotes = {};
let debateSparkEnabled = true;
const defaultDebatePrompts = [
  "Is AI creativity more honest than human creativity?",
  "Should AI-generated portraits require a visible watermark?",
  "Would you trust an AI to choose your best profile photo?",
  "Do filters reveal personality or hide authenticity?",
  "Should people be paid when their style trains an AI model?",
  "Is speed more important than originality in visual art?",
];
let debatePrompts = [...defaultDebatePrompts];

function getCountdownGlyphUrl(value, extension = "svg") {
  return `/countdown-glyphs/${encodeURIComponent(String(value))}.${extension}`;
}

function getCountdownGlyphCandidateUrls(value) {
  return countdownGlyphExtensions.map((extension) => getCountdownGlyphUrl(value, extension));
}

async function resolveCountdownGlyphUrl(value) {
  if (countdownGlyphUrlByValue.has(value)) {
    return countdownGlyphUrlByValue.get(value);
  }

  const glyphUrls = getCountdownGlyphCandidateUrls(value);
  for (const glyphUrl of glyphUrls) {
    try {
      const response = await fetch(glyphUrl, { method: "HEAD", cache: "no-store" });
      if (response.ok) {
        countdownGlyphUrlByValue.set(value, glyphUrl);
        return glyphUrl;
      }
      if (response.status === 405) {
        const fallbackResponse = await fetch(glyphUrl, { cache: "no-store" });
        if (fallbackResponse.ok) {
          countdownGlyphUrlByValue.set(value, glyphUrl);
          return glyphUrl;
        }
      }
    } catch (error) {
      // fallback GET probe below for servers that block HEAD or fail intermittently
    }

    try {
      const fallbackResponse = await fetch(glyphUrl, { cache: "no-store" });
      if (fallbackResponse.ok) {
        countdownGlyphUrlByValue.set(value, glyphUrl);
        return glyphUrl;
      }
    } catch (error) {
      // try next extension
    }
  }

  return null;
}

async function renderCountdownValue(value) {
  if (!countdownValue) {
    return;
  }
  const numeric = Number(value);
  const safeNumber = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  const nextLabel = String(safeNumber);
  const token = ++countdownGlyphToken;

  countdownValue.textContent = nextLabel;
  countdownValue.classList.remove("countdown-value--glyph");
  countdownValue.style.removeProperty("--countdown-glyph-url");

  if (safeNumber < 1) {
    return;
  }

  const glyphUrl = await resolveCountdownGlyphUrl(safeNumber);
  if (!glyphUrl || token !== countdownGlyphToken) {
    return;
  }

  countdownValue.classList.add("countdown-value--glyph");
  countdownValue.style.setProperty("--countdown-glyph-url", `url("${glyphUrl}")`);
}
let remoteSocket = null;
let remoteSocketReconnect = null;
let lastRemoteProgress = { status: "ready", label: "Ready", percent: 0, complete: false };
let selectedGalleryId = "";
const defaultComfyServerUrl = "http://127.0.0.1:8188";
let comfyServerUrl = defaultComfyServerUrl;
let cameraOrientation = 0;
let cameraMirrored = false;
let cameraDeviceId = "";
let watermarkEnabled = false;
let watermarkCustomDataUrl = "";
let watermarkImageCache = { src: "", image: null };
let watermarkText = "MKRShift";
const defaultBranding = {
  titleText: "AI PHOTOBOOTH",
  accentText: "MKR",
  neutralText: "Shift",
  introBadgeText: "MKRSHIFT",
  titleColor: "#f7f7fb",
  accentColor: "#58d36e",
  neutralColor: "#f7f7fb",
  buttonColor: "#58d68d",
  buttonTextColor: "#071b11",
  panelTintColor: "#6f7885",
  progressStartColor: "#58d68d",
  progressEndColor: "#feaa3a",
  panelBgColor: "#0c101a",
  panelBorderColor: "#f7f7fb",
  menuBgColor: "#080b12",
  progressFlowStartColor: "#5fd3ff",
  progressFlowEndColor: "#feaa3a",
  cardBgStartColor: "#0a0e16",
  cardBgEndColor: "#080b12",
};
let branding = { ...defaultBranding };
let brandProfiles = [];
let uploadEnabled = true;
let hidePrintEnabled = false;
let hideQrEnabled = false;
let remoteResultEnabled = true;
let remoteCameraCaptureEnabled = false;
let remoteShortcutEnabled = true;
let diagnosticsShortcutEnabled = true;
let galleryShortcutEnabled = true;
let soundEffectsEnabled = true;
let backgroundMusicEnabled = false;
let hideStatusEnabled = false;
const SOUND_EFFECT_EVENTS = {
  styleSelect: "style-select.mp3",
  countdownTick: "countdown-tick.mp3",
  countdownGo: "countdown-go.mp3",
  galleryOpen: "gallery-open.mp3",
};
let soundEffectsList = [];
let backgroundMusicList = [];
let audioListsLoaded = false;
let audioListsPromise = null;
let backgroundMusicAudio = null;
const unavailableAudioAssets = new Set();
const idleController = initIdleOverlay({ timeoutMs: 5 * 60 * 1000 });
const printerController = createPrinterController({
  settingsPrinterInput,
  settingsPrinterDetails,
  toPrinterEntry,
});
let styleController;

styleController = createStyleController({
  stylesContainer,
  stylePreview,
  stylePreviewImage,
  updateActionButtonState: () => {
    selectedStyle = styleController?.getSelectedStyle?.() ?? null;
    updateActionButtonState();
  },
  setStatusMeta: (message) => {
    statusMeta.textContent = message;
  },
  sendRemoteMessage: (payload) => sendRemoteMessage(payload),
});

function parseAudioList(rawText) {
  return String(rawText || "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function resolveAudioAssetPath(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/sounds/${encodeURIComponent(trimmed)}`;
}

async function loadAudioListFile(pathname) {
  try {
    const response = await fetch(pathname, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    return parseAudioList(await response.text());
  } catch (error) {
    return [];
  }
}

async function ensureAudioListsLoaded() {
  if (audioListsLoaded) {
    return;
  }
  if (!audioListsPromise) {
    audioListsPromise = Promise.all([
      loadAudioListFile("/sounds/sfx-names.txt"),
      loadAudioListFile("/sounds/music-names.txt"),
    ]).then(([sfxNames, musicNames]) => {
      soundEffectsList = sfxNames;
      backgroundMusicList = musicNames;
      audioListsLoaded = true;
    });
  }
  await audioListsPromise;
}

function playSoundEffectByName(fileName, volume = 0.85) {
  if (!soundEffectsEnabled || !fileName) {
    return;
  }
  const assetPath = resolveAudioAssetPath(fileName);
  if (!assetPath || unavailableAudioAssets.has(assetPath)) {
    return;
  }
  try {
    const audio = new Audio(assetPath);
    audio.volume = Math.max(0, Math.min(1, Number(volume) || 0.85));
    audio.play().catch(() => {
      unavailableAudioAssets.add(assetPath);
    });
  } catch (error) {
    unavailableAudioAssets.add(assetPath);
  }
}

async function playSoundEffect(eventName, volume = 0.85) {
  if (!soundEffectsEnabled) {
    return;
  }
  await ensureAudioListsLoaded();
  const fileName = SOUND_EFFECT_EVENTS[eventName];
  if (!fileName || !soundEffectsList.includes(fileName)) {
    return;
  }
  playSoundEffectByName(fileName, volume);
}

function stopBackgroundMusic() {
  if (!backgroundMusicAudio) {
    return;
  }
  backgroundMusicAudio.pause();
  backgroundMusicAudio.currentTime = 0;
  backgroundMusicAudio = null;
}

async function ensureBackgroundMusic() {
  if (!backgroundMusicEnabled) {
    stopBackgroundMusic();
    return;
  }
  await ensureAudioListsLoaded();
  if (!backgroundMusicList.length) {
    return;
  }
  if (backgroundMusicAudio && !backgroundMusicAudio.paused) {
    return;
  }
  for (const trackName of backgroundMusicList) {
    const assetPath = resolveAudioAssetPath(trackName);
    if (!assetPath || unavailableAudioAssets.has(assetPath)) {
      continue;
    }
    try {
      const audio = new Audio(assetPath);
      audio.loop = true;
      audio.volume = 0.3;
      await audio.play();
      backgroundMusicAudio = audio;
      return;
    } catch (error) {
      unavailableAudioAssets.add(assetPath);
    }
  }
}

function applyAudioToggles() {
  if (settingsSoundEffectsInput) {
    settingsSoundEffectsInput.checked = soundEffectsEnabled;
  }
  if (settingsBackgroundMusicInput) {
    settingsBackgroundMusicInput.checked = backgroundMusicEnabled;
  }
  if (!backgroundMusicEnabled) {
    stopBackgroundMusic();
  }
}

function normalizeBrandText(value, fallback, maxLength = 48) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.slice(0, maxLength);
}

function normalizeBrandColor(value, fallback) {
  const candidate = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) {
    return candidate.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    const [, r, g, b] = candidate;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function hexToRgbTriplet(value, fallback = "95, 211, 255") {
  const normalized = normalizeBrandColor(value, "");
  if (!normalized) {
    return fallback;
  }
  const hex = normalized.slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function hexToRgbaString(value, alpha = 1, fallback = "rgba(12, 16, 26, 0.72)") {
  const normalized = normalizeBrandColor(value, "");
  if (!normalized) {
    return fallback;
  }
  const hex = normalized.slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, Number(alpha) || 1));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function shadeHexColor(value, factor = 0.82, fallback = "#24b26b") {
  const normalized = normalizeBrandColor(value, "");
  if (!normalized) {
    return fallback;
  }
  const hex = normalized.slice(1);
  const clamp = (channel) => Math.max(0, Math.min(255, Math.round(channel * factor)));
  const r = clamp(Number.parseInt(hex.slice(0, 2), 16));
  const g = clamp(Number.parseInt(hex.slice(2, 4), 16));
  const b = clamp(Number.parseInt(hex.slice(4, 6), 16));
  const toHex = (channel) => channel.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyBranding() {
  branding.titleText = normalizeBrandText(branding.titleText, defaultBranding.titleText, 48);
  branding.accentText = normalizeBrandText(branding.accentText, defaultBranding.accentText, 24);
  branding.neutralText = normalizeBrandText(branding.neutralText, defaultBranding.neutralText, 24);
  branding.introBadgeText = normalizeBrandText(branding.introBadgeText, defaultBranding.introBadgeText, 24);
  branding.titleColor = normalizeBrandColor(branding.titleColor, defaultBranding.titleColor);
  branding.accentColor = normalizeBrandColor(branding.accentColor, defaultBranding.accentColor);
  branding.neutralColor = normalizeBrandColor(branding.neutralColor, defaultBranding.neutralColor);
  branding.buttonColor = normalizeBrandColor(branding.buttonColor, defaultBranding.buttonColor);
  branding.buttonTextColor = normalizeBrandColor(branding.buttonTextColor, defaultBranding.buttonTextColor);
  branding.panelTintColor = normalizeBrandColor(branding.panelTintColor, defaultBranding.panelTintColor);
  branding.progressStartColor = normalizeBrandColor(branding.progressStartColor, defaultBranding.progressStartColor);
  branding.progressEndColor = normalizeBrandColor(branding.progressEndColor, defaultBranding.progressEndColor);
  branding.panelBgColor = normalizeBrandColor(branding.panelBgColor, defaultBranding.panelBgColor);
  branding.panelBorderColor = normalizeBrandColor(branding.panelBorderColor, defaultBranding.panelBorderColor);
  branding.menuBgColor = normalizeBrandColor(branding.menuBgColor, defaultBranding.menuBgColor);
  branding.progressFlowStartColor = normalizeBrandColor(branding.progressFlowStartColor, defaultBranding.progressFlowStartColor);
  branding.progressFlowEndColor = normalizeBrandColor(branding.progressFlowEndColor, defaultBranding.progressFlowEndColor);
  branding.cardBgStartColor = normalizeBrandColor(branding.cardBgStartColor, defaultBranding.cardBgStartColor);
  branding.cardBgEndColor = normalizeBrandColor(branding.cardBgEndColor, defaultBranding.cardBgEndColor);

  if (brandTitleLabel) {
    brandTitleLabel.textContent = branding.titleText;
  }
  if (brandSubtitleAccentLabel) {
    brandSubtitleAccentLabel.textContent = branding.accentText;
  }
  if (brandSubtitleNeutralLabel) {
    brandSubtitleNeutralLabel.textContent = branding.neutralText;
  }
  if (idleOverlayEyebrowAccentLabel) {
    idleOverlayEyebrowAccentLabel.textContent = branding.introBadgeText;
  }

  const brandButtonRgb = hexToRgbTriplet(branding.buttonColor);
  const panelTintRgb = hexToRgbTriplet(branding.panelTintColor, "111, 120, 133");
  const progressStartRgb = hexToRgbTriplet(branding.progressStartColor, brandButtonRgb);
  const progressEndRgb = hexToRgbTriplet(branding.progressEndColor, "254, 170, 58");
  const progressFlowStartRgb = hexToRgbTriplet(branding.progressFlowStartColor, brandButtonRgb);
  const progressFlowEndRgb = hexToRgbTriplet(branding.progressFlowEndColor, "254, 170, 58");
  const brandButtonStrong = shadeHexColor(branding.buttonColor, 0.78, defaultBranding.buttonColor);

  document.documentElement.style.setProperty("--brand-title-color", branding.titleColor);
  document.documentElement.style.setProperty("--brand-accent-color", branding.accentColor);
  document.documentElement.style.setProperty("--brand-neutral-color", branding.neutralColor);
  document.documentElement.style.setProperty("--brand-button-color", branding.buttonColor);
  document.documentElement.style.setProperty("--brand-button-text-color", branding.buttonTextColor);
  document.documentElement.style.setProperty("--accent-rgb", brandButtonRgb);
  document.documentElement.style.setProperty("--accent-glow-rgb", brandButtonRgb);
  document.documentElement.style.setProperty("--accent-success", branding.buttonColor);
  document.documentElement.style.setProperty("--accent-success-strong", brandButtonStrong);
  document.documentElement.style.setProperty("--ui-panel-tint-rgb", panelTintRgb);
  document.documentElement.style.setProperty("--progress-gradient-start-rgb", progressStartRgb);
  document.documentElement.style.setProperty("--progress-gradient-end-rgb", progressEndRgb);
  document.documentElement.style.setProperty("--progress-flow-start-rgb", progressFlowStartRgb);
  document.documentElement.style.setProperty("--progress-flow-end-rgb", progressFlowEndRgb);
  document.documentElement.style.setProperty("--panel-bg", hexToRgbaString(branding.panelBgColor, 0.72, "rgba(12, 16, 26, 0.72)"));
  document.documentElement.style.setProperty("--panel-border", hexToRgbaString(branding.panelBorderColor, 0.32, "rgba(255, 255, 255, 0.32)"));
  document.documentElement.style.setProperty("--menu-bg", hexToRgbaString(branding.menuBgColor, 0.98, "rgba(8, 11, 18, 0.98)"));
  document.documentElement.style.setProperty("--card-bg-start", hexToRgbaString(branding.cardBgStartColor, 0.98, "rgba(10, 14, 22, 0.98)"));
  document.documentElement.style.setProperty("--card-bg-end", hexToRgbaString(branding.cardBgEndColor, 0.92, "rgba(8, 11, 18, 0.92)"));
}

function syncBrandingInputs() {
  if (settingsBrandTitleInput) {
    settingsBrandTitleInput.value = branding.titleText;
  }
  if (settingsBrandAccentTextInput) {
    settingsBrandAccentTextInput.value = branding.accentText;
  }
  if (settingsBrandNeutralTextInput) {
    settingsBrandNeutralTextInput.value = branding.neutralText;
  }
  if (settingsBrandIntroBadgeTextInput) {
    settingsBrandIntroBadgeTextInput.value = branding.introBadgeText;
  }
  if (settingsBrandTitleColorInput) {
    settingsBrandTitleColorInput.value = branding.titleColor;
  }
  if (settingsBrandAccentColorInput) {
    settingsBrandAccentColorInput.value = branding.accentColor;
  }
  if (settingsBrandNeutralColorInput) {
    settingsBrandNeutralColorInput.value = branding.neutralColor;
  }
  if (settingsBrandButtonColorInput) {
    settingsBrandButtonColorInput.value = branding.buttonColor;
  }
  if (settingsBrandButtonTextColorInput) {
    settingsBrandButtonTextColorInput.value = branding.buttonTextColor;
  }
  if (settingsBrandPanelTintColorInput) {
    settingsBrandPanelTintColorInput.value = branding.panelTintColor;
  }
  if (settingsBrandProgressStartColorInput) {
    settingsBrandProgressStartColorInput.value = branding.progressStartColor;
  }
  if (settingsBrandProgressEndColorInput) {
    settingsBrandProgressEndColorInput.value = branding.progressEndColor;
  }
  if (settingsBrandPanelBgColorInput) {
    settingsBrandPanelBgColorInput.value = branding.panelBgColor;
  }
  if (settingsBrandPanelBorderColorInput) {
    settingsBrandPanelBorderColorInput.value = branding.panelBorderColor;
  }
  if (settingsBrandMenuBgColorInput) {
    settingsBrandMenuBgColorInput.value = branding.menuBgColor;
  }
  if (settingsBrandProgressFlowStartColorInput) {
    settingsBrandProgressFlowStartColorInput.value = branding.progressFlowStartColor;
  }
  if (settingsBrandProgressFlowEndColorInput) {
    settingsBrandProgressFlowEndColorInput.value = branding.progressFlowEndColor;
  }
  if (settingsBrandCardBgStartColorInput) {
    settingsBrandCardBgStartColorInput.value = branding.cardBgStartColor;
  }
  if (settingsBrandCardBgEndColorInput) {
    settingsBrandCardBgEndColorInput.value = branding.cardBgEndColor;
  }
}

function applyStatusVisibility() {
  document.body.classList.toggle("is-status-hidden", hideStatusEnabled);
  recalcDebateOffset();
}

function updateActionButtonState() {
  actionButton.disabled = !selectedStyle;
  refreshCaptureSelectionUi();
}

function refreshCaptureSelectionUi() {
  const selectedLabel = selectedStyle ? toTitleCase(selectedStyle) : "None";
  if (styleSelectedValue) {
    styleSelectedValue.textContent = selectedLabel;
  }
  actionButton.textContent = selectedStyle ? `Take ${toTitleCase(selectedStyle)} Selfie` : "Take Selfie";
}

function getActiveDebatePrompt() {
  return debatePrompts[debatePromptIndex] || defaultDebatePrompts[0] || "";
}

function getDebatePromptKey(prompt) {
  return String(prompt || "").trim().toLowerCase();
}

function getDebateEmoji(agreePercent) {
  const p = Math.max(0, Math.min(100, Math.round(Number(agreePercent) || 0)));
  if (p >= 80) return "😄";
  if (p >= 60) return "🙂";
  if (p >= 45) return "😐";
  if (p >= 25) return "🙁";
  return "😡";
}

async function loadDebatePrompts() {
  try {
    const response = await fetch("/api/debate-prompts", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (!Array.isArray(data?.prompts)) {
      return;
    }
    const prompts = data.prompts
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    if (prompts.length) {
      debatePrompts = prompts;
    }
  } catch (error) {
    // keep defaults
  }
}

function persistDebateVote(prompt, side) {
  fetch("/api/debate-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "vote",
      prompt,
      side,
      streak: debateStreak,
      heat: debateHeat,
      createdAt: Date.now(),
    }),
  }).catch(() => {});
}

function persistDebateReset() {
  fetch("/api/debate-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "reset",
      prompt: getActiveDebatePrompt(),
      streak: debateStreak,
      heat: debateHeat,
      createdAt: Date.now(),
    }),
  }).catch(() => {});
}

function saveDebateState() {
  writeStoredJson(storageKeys.debateState, {
    promptIndex: debatePromptIndex,
    streak: debateStreak,
    heat: debateHeat,
    votes: debatePromptVotes,
  });
}

function updateDebateUi({ animate = false } = {}) {
  if (!debateSpark) {
    return;
  }
  const prompt = getActiveDebatePrompt();
  const promptKey = getDebatePromptKey(prompt);
  const votes = debatePromptVotes[promptKey] || { agree: 0, disagree: 0 };
  const totalVotes = votes.agree + votes.disagree;
  const agreeRatio = totalVotes > 0 ? votes.agree / totalVotes : 0.5;

  if (debatePromptLabel) {
    debatePromptLabel.textContent = prompt;
  }
  if (debateStreakLabel) {
    debateStreakLabel.textContent = `🔥 Streak ${debateStreak}`;
  }
  const agreePercent = Math.round(agreeRatio * 100);
  const disagreePercent = 100 - agreePercent;

  if (debateMeterFill) {
    debateMeterFill.style.width = `${agreePercent}%`;
  }
  if (debateMeterEmoji) {
    debateMeterEmoji.textContent = getDebateEmoji(agreePercent);
    debateMeterEmoji.style.left = `${agreePercent}%`;
  }
  if (debateVotesLabel) {
    debateVotesLabel.textContent = `${totalVotes} vote${totalVotes === 1 ? "" : "s"}`;
  }
  if (debateSplitLabel) {
    debateSplitLabel.textContent = `${agreePercent}% agree · ${disagreePercent}% disagree`;
  }
  if (debateHeatLabel) {
    debateHeatLabel.textContent = `Heat ${debateHeat}%`;
  }

  debateSpark.classList.toggle("debate-spark--hot", debateStreak >= 3 || debateHeat >= 70);
  if (debateSpark) {
    debateSpark.style.setProperty("--debate-heat", String(debateHeat / 100));
  }
  document.body.classList.toggle("debate-fever", debateSparkEnabled && debateHeat >= 80);

  if (animate) {
    debateSpark.classList.remove("debate-spark--pulse");
    void debateSpark.offsetWidth;
    debateSpark.classList.add("debate-spark--pulse");
  }
}

function voteOnDebate(side) {
  const prompt = getActiveDebatePrompt();
  const promptKey = getDebatePromptKey(prompt);
  const current = debatePromptVotes[promptKey] || { agree: 0, disagree: 0 };
  if (side === "agree") {
    current.agree += 1;
  } else {
    current.disagree += 1;
  }
  debatePromptVotes[promptKey] = current;
  debateStreak += 1;
  debateHeat = Math.min(100, debateHeat + 12);
  persistDebateVote(prompt, side);
  saveDebateState();
  updateDebateUi({ animate: true });
  statusLabel.textContent = "Hot Take Registered";
  statusMeta.textContent = `${side === "agree" ? "Agree" : "Disagree"} locked in — now capture your reaction.`;
}

function coolDebateHeat() {
  debateHeat = Math.max(0, debateHeat - 3);
  updateDebateUi();
  saveDebateState();
}

function resetDebateState() {
  persistDebateReset();
  debatePromptVotes = {};
  debateStreak = 0;
  debateHeat = 0;
  saveDebateState();
  updateDebateUi();
  statusLabel.textContent = "Debate Reset";
  statusMeta.textContent = "Fresh prompt energy — stir the crowd again.";
}

function nextDebatePrompt() {
  if (!debatePrompts.length) {
    return;
  }
  debatePromptIndex = (debatePromptIndex + 1) % debatePrompts.length;
  saveDebateState();
  updateDebateUi();
}

function loadDebateState() {
  const fallback = { promptIndex: 0, streak: 0, heat: 0, votes: {} };
  const stored = readStoredJson(storageKeys.debateState, fallback) || fallback;
  const parsedPromptIndex = Number(stored.promptIndex);
  const maxPromptIndex = Math.max(0, debatePrompts.length - 1);
  debatePromptIndex = Number.isFinite(parsedPromptIndex)
    ? Math.max(0, Math.min(maxPromptIndex, Math.floor(parsedPromptIndex)))
    : 0;
  const parsedStreak = Number(stored.streak);
  debateStreak = Number.isFinite(parsedStreak) ? Math.max(0, Math.floor(parsedStreak)) : 0;
  const parsedHeat = Number(stored.heat);
  debateHeat = Number.isFinite(parsedHeat) ? Math.max(0, Math.min(100, Math.floor(parsedHeat))) : 0;
  debatePromptVotes = stored.votes && typeof stored.votes === "object" ? stored.votes : {};
  updateDebateUi();
}

function updateTimerLabel() {
  timerToggle.textContent = `⏱️ ${selectedDelay}s`;
  timerToggle.setAttribute("aria-expanded", String(timerMenu.classList.contains("timer-menu--open")));
  timerOptions.forEach((option) => {
    option.classList.toggle(
      "timer-option--active",
      Number(option.dataset.delay) === selectedDelay
    );
  });
}

function setSelectedDelay(delaySeconds, { persist = true } = {}) {
  selectedDelay = Number(delaySeconds) || 0;
  if (persist) {
    writeStoredValue(storageKeys.selectedDelay, String(selectedDelay));
  }
  updateTimerLabel();
}

function closeTimerMenu() {
  timerMenu.classList.remove("timer-menu--open");
  updateTimerLabel();
}

function toggleTimerMenu() {
  timerMenu.classList.toggle("timer-menu--open");
  updateTimerLabel();
}

function triggerFlash() {
  flashOverlay.classList.add("flash-overlay--active");
  setTimeout(() => {
    flashOverlay.classList.remove("flash-overlay--active");
  }, 240);
}

function startCountdown(delaySeconds, source) {
  if (isQueueing || countdownActive) {
    return;
  }
  if (!selectedStyle) {
    statusLabel.textContent = "Pick a Style";
    statusMeta.textContent = "Select a style before taking a selfie.";
    updateActionButtonState();
    return;
  }
  const delay = Number(delaySeconds) || 0;
  if (delay <= 0) {
    triggerFlash();
    setTimeout(() => {
      queueSelfie(source);
    }, 140);
    return;
  }
  countdownActive = true;
  let remaining = delay;
  void renderCountdownValue(remaining);
  countdownOverlay.classList.add("countdown-overlay--active");
  statusLabel.textContent = "Countdown";
  statusMeta.textContent = `Taking photo in ${remaining}s`;
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      countdownOverlay.classList.remove("countdown-overlay--active");
      countdownActive = false;
      countdownGlyphToken += 1;
      countdownValue.classList.remove("countdown-value--glyph");
      countdownValue.style.removeProperty("--countdown-glyph-url");
      void playSoundEffect("countdownGo", 0.9);
      triggerFlash();
      setTimeout(() => {
        queueSelfie(source);
      }, 140);
      return;
    }
    void renderCountdownValue(remaining);
    void playSoundEffect("countdownTick", 0.6);
    statusMeta.textContent = `Taking photo in ${remaining}s`;
  }, 1000);
}

function connectRemoteSocket() {
  if (remoteSocketReconnect) {
    clearTimeout(remoteSocketReconnect);
    remoteSocketReconnect = null;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${window.location.host}/remote-ws`;
  remoteSocket = new WebSocket(wsUrl);
  remoteSocket.addEventListener("open", () => {
    if (selectedStyle) {
      sendRemoteMessage({ type: "style", style: selectedStyle, source: "booth" });
    }
    broadcastRemoteConfig();
  });
  remoteSocket.addEventListener("message", (event) => {
    if (!event?.data) {
      return;
    }
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "capture") {
        const delay = Number(
          payload.delaySeconds ?? payload.delay ?? payload.timer ?? payload.seconds ?? 0
        );
        startCountdown(delay, payload.source ?? "remote");
      }
      if (payload?.type === "capture-image" && typeof payload.image === "string") {
        if (!remoteCameraCaptureEnabled) {
          return;
        }
        queueSelfieWithImage(payload.image, payload.source ?? "remote-camera");
      }
      if (payload?.type === "style" && typeof payload.style === "string") {
        if (payload.source === "booth") {
          return;
        }
        applyStyleSelection(payload.style, { source: "remote" });
      }
      if (payload?.type === "exit") {
        handleDoneAction();
      }
      if (payload?.type === "status-request") {
        if (selectedStyle) {
          sendRemoteMessage({ type: "style", style: selectedStyle, source: "booth" });
        }
        broadcastRemoteConfig();
        if (lastRemoteProgress) {
          sendRemoteMessage({ type: "progress", ...lastRemoteProgress, source: "booth" });
        }
      }
    } catch (error) {
      // ignore malformed messages
    }
  });
  remoteSocket.addEventListener("close", () => {
    remoteSocketReconnect = setTimeout(connectRemoteSocket, 1500);
  });
  remoteSocket.addEventListener("error", () => {
    remoteSocketReconnect = setTimeout(connectRemoteSocket, 1500);
  });
}

function sendRemoteMessage(payload) {
  if (!remoteSocket || remoteSocket.readyState !== WebSocket.OPEN) {
    return;
  }
  remoteSocket.send(JSON.stringify(payload));
}


function broadcastRemoteConfig() {
  sendRemoteMessage({
    type: "remote-config",
    showResultOnRemote: remoteResultEnabled,
    allowRemoteCameraCapture: remoteCameraCaptureEnabled,
    source: "booth",
  });
}

function applyStyleSelection(style, { source = "booth", announce = true } = {}) {
  const matched = styleController.applySelection(style, { source, announce: false });
  selectedStyle = styleController.getSelectedStyle();
  if (selectedStyle) {
    writeStoredValue(storageKeys.selectedStyle, selectedStyle);
  } else {
    removeStoredValue(storageKeys.selectedStyle);
  }
  updateActionButtonState();
  if (source !== "remote" && selectedStyle) {
    void playSoundEffect("styleSelect", 0.65);
  }
  if (announce && selectedStyle) {
    statusLabel.textContent = "Style Selected";
    statusMeta.textContent =
      source === "remote"
        ? `${toTitleCase(selectedStyle)} selected on remote`
        : `${toTitleCase(selectedStyle)} ready to shoot`;
  }
  return Boolean(matched);
}

async function loadStyles() {
  const styles = await styleController.loadStyles({
    endpoint: "/api/styles",
    onOffline: () => {
      statusLabel.textContent = "Offline";
      statusMeta.textContent = "Unable to load styles";
    },
  });
  if (styles.length > 0 && selectedStyle) {
    applyStyleSelection(selectedStyle, { announce: false });
  } else if (styles.length === 0) {
    statusLabel.textContent = "No Styles";
    statusMeta.textContent = "Add workflow JSON files to /workflows and reload.";
    updateActionButtonState();
  }
}

function updateRemoteProgress(payload) {
  const promptId = payload.promptId ?? currentPromptId ?? lastRemoteProgress?.promptId ?? null;
  const outputUrl = payload.outputUrl ?? lastRemoteProgress?.outputUrl ?? lastOutputUrl ?? null;
  lastRemoteProgress = { ...payload, promptId, comfyServerUrl, outputUrl };
  sendRemoteMessage({
    type: "progress",
    ...payload,
    promptId,
    comfyServerUrl,
    outputUrl,
    showResultOnRemote: remoteResultEnabled,
    source: "booth",
  });
}

async function updateRemoteInfo() {
  let remoteUrl = new URL("/remote", window.location.origin).toString();
  try {
    const response = await fetch("/api/remote-info");
    if (response.ok) {
      const data = await response.json();
      if (data?.remoteUrl) {
        remoteUrl = data.remoteUrl;
      }
    }
  } catch (error) {
    // ignore fetch errors
  }
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&color=000000&bgcolor=ffffff00&data=${encodeURIComponent(
    remoteUrl
  )}`;
  [settingsRemoteQr, remoteLaunchQr].forEach((qr) => {
    if (qr) {
      qr.src = qrUrl;
    }
  });
  [settingsRemoteLink, remoteLaunchLink].forEach((link) => {
    if (link) {
      link.textContent = remoteUrl;
      link.href = remoteUrl;
    }
  });
}


function stopCameraStream() {
  const stream = video.srcObject;
  if (!stream) {
    return;
  }
  stream.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
}

async function listCameraDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  } catch (error) {
    return [];
  }
}

function isCameraSecureContext() {
  if (window.isSecureContext) {
    return true;
  }
  const hostname = window.location.hostname || "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getCameraDeviceLabel(device, index) {
  const label = typeof device.label === "string" ? device.label.trim() : "";
  if (label) {
    return label;
  }
  return `Camera ${index + 1}`;
}

async function refreshCameraOptions() {
  if (!settingsCameraInput) {
    return;
  }
  const devices = await listCameraDevices();
  const preferredId = settingsCameraInput.value || cameraDeviceId;

  settingsCameraInput.innerHTML = '<option value="">Default camera</option>';
  devices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = getCameraDeviceLabel(device, index);
    settingsCameraInput.appendChild(option);
  });

  const hasPreferred = preferredId && devices.some((device) => device.deviceId === preferredId);
  settingsCameraInput.value = hasPreferred ? preferredId : "";

  if (!hasPreferred && cameraDeviceId && !devices.some((device) => device.deviceId === cameraDeviceId)) {
    cameraDeviceId = "";
    removeStoredValue(storageKeys.cameraDeviceId);
  }
}

async function startCamera() {
  if (!isCameraSecureContext()) {
    statusLabel.textContent = "Camera Requires HTTPS";
    statusMeta.textContent = "Open this booth over HTTPS (or localhost) to enable camera access.";
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    statusLabel.textContent = "Camera Unsupported";
    statusMeta.textContent = "This browser cannot access the camera.";
    return;
  }

  stopCameraStream();

  const attempts = [];
  if (cameraDeviceId) {
    attempts.push({
      constraints: { deviceId: { exact: cameraDeviceId } },
      reason: "preferred-device",
    });
  }
  attempts.push(
    { constraints: { facingMode: "user" }, reason: "front-camera" },
    { constraints: true, reason: "any-camera" }
  );

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: attempt.constraints,
        audio: false,
      });
      video.srcObject = stream;
      await video.play().catch(() => {});
      await refreshCameraOptions();
      if (attempt.reason === "preferred-device") {
        statusLabel.textContent = "Camera Ready";
        statusMeta.textContent = "Choose a style, then tap shutter or shake to shoot";
      } else if (attempt.reason === "front-camera") {
        statusLabel.textContent = "Camera Ready";
        statusMeta.textContent = "Using default front camera.";
      } else {
        statusLabel.textContent = "Camera Ready";
        statusMeta.textContent = "Using available camera device.";
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt.reason === "preferred-device") {
        cameraDeviceId = "";
        removeStoredValue(storageKeys.cameraDeviceId);
      }
    }
  }

  const name = lastError?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    statusLabel.textContent = "Camera Blocked";
    statusMeta.textContent = "Allow camera access in browser settings, then reload.";
    return;
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    statusLabel.textContent = "Camera Missing";
    statusMeta.textContent = "No camera detected. Connect one and reload.";
    return;
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    statusLabel.textContent = "Camera Busy";
    statusMeta.textContent = "Camera is in use by another app. Close it and retry.";
    return;
  }

  statusLabel.textContent = "Camera Error";
  statusMeta.textContent = "Unable to initialize camera. Check permissions and device.";
}

function captureFrame() {
  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }
  const orientation = getOrientationDegrees(cameraOrientation);
  const canvas = document.createElement("canvas");
  const needsSwap = Math.abs(orientation) === 90;
  canvas.width = needsSwap ? video.videoHeight : video.videoWidth;
  canvas.height = needsSwap ? video.videoWidth : video.videoHeight;
  const context = canvas.getContext("2d");
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((orientation * Math.PI) / 180);
  if (cameraMirrored) {
    context.scale(-1, 1);
  }
  context.drawImage(
    video,
    -video.videoWidth / 2,
    -video.videoHeight / 2,
    video.videoWidth,
    video.videoHeight
  );
  context.restore();
  return canvas.toDataURL("image/png");
}

async function queueSelfie(source = "tap") {
  if (isQueueing) {
    return;
  }
  if (!selectedStyle) {
    statusLabel.textContent = "Pick a Style";
    statusMeta.textContent = "Select a style before taking a selfie.";
    return;
  }
  const imageData = captureFrame();
  lastCapturedImageData = imageData || lastCapturedImageData;
  await queueSelfieWithImage(imageData, source);
}

async function queueSelfieWithImage(imageData, source = "tap") {
  if (isQueueing) {
    return;
  }
  if (!selectedStyle) {
    statusLabel.textContent = "Pick a Style";
    statusMeta.textContent = "Select a style before taking a selfie.";
    return;
  }
  if (!imageData) {
    statusLabel.textContent = "Camera Warming Up";
    statusMeta.textContent = "Please wait for the camera feed.";
    return;
  }

  lastCapturedImageData = imageData;
  isQueueing = true;
  setBusy(true);
  outputReady = false;
  lastOutputUrl = null;
  currentPromptId = null;
  if (progressPoller) {
    clearInterval(progressPoller);
    progressPoller = null;
  }
  progressLabels.forEach((element) => {
    element.textContent = "Queueing";
  });
  progressValues.forEach((element) => {
    element.textContent = "0%";
  });
  progressFills.forEach((element) => {
    element.style.width = "0%";
  });
  progressPreviews.forEach((element) => {
    const stage = element.closest(".progress__preview-stage");
    if (stage) {
      stage.style.display = "none";
    }
    element.src = "";
    element.style.display = "none";
  });
  qrContainer.style.display = "none";
  qrImage.src = "";
  uploadButton.disabled = true;
  printButton.disabled = true;
  doneButton.disabled = true;
  progressCloseButton.disabled = true;
  statusLabel.textContent = "Queueing";
  statusMeta.textContent = `Sending ${toTitleCase(selectedStyle)} to ComfyUI (${source})`;
  updateRemoteProgress({
    status: "queueing",
    label: "Queueing",
    percent: 0,
    complete: false,
    outputUrl: null,
  });
  try {
    const response = await fetch("/api/selfie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        style: selectedStyle,
        image: imageData,
        comfyServerUrl,
        comfyApiKey: comfyApiKey || "",
        freeimageApiKey: freeimageApiKey || "",
        comfyMinCredits,
        comfyAccelerator,
        comfyHostedEnabled,
      }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to queue");
    }
    const data = await response.json();
    currentPromptId = data.promptId ?? data.prompt_id ?? null;
    statusLabel.textContent = "Queued";
    statusMeta.textContent = "Workflow sent to ComfyUI.";
    updateRemoteProgress({
      status: "queued",
      label: "Queued",
      percent: 0,
      complete: false,
      outputUrl: null,
    });
    startProgressPolling();
  } catch (error) {
    statusLabel.textContent = "Queue Failed";
    const details = error?.message ? ` ${error.message}` : "";
    statusMeta.textContent = `Unable to send workflow to ComfyUI.${details}`;
    progressLabels.forEach((element) => {
      element.textContent = "Error";
    });
    progressValues.forEach((element) => {
      element.textContent = "0%";
    });
    progressFills.forEach((element) => {
      element.style.width = "0%";
    });
    setBusy(false);
    progressCloseButton.disabled = false;
    updateRemoteProgress({
      status: "error",
      label: "Error",
      percent: 0,
      complete: false,
      outputUrl: null,
    });
  } finally {
    isQueueing = false;
  }
}

async function ensureMotionPermission() {
  if (motionPermissionGranted) {
    return true;
  }
  if (typeof DeviceMotionEvent === "undefined") {
    return false;
  }
  if (typeof DeviceMotionEvent.requestPermission !== "function") {
    motionPermissionGranted = true;
    return true;
  }
  try {
    const state = await DeviceMotionEvent.requestPermission();
    motionPermissionGranted = state === "granted";
    if (!motionPermissionGranted) {
      statusLabel.textContent = "Motion Blocked";
      statusMeta.textContent = "Enable motion access to use shake selfie.";
    }
    return motionPermissionGranted;
  } catch (error) {
    statusLabel.textContent = "Motion Blocked";
    statusMeta.textContent = "Enable motion access to use shake selfie.";
    return false;
  }
}

function handleShake(event) {
  const acceleration = event.accelerationIncludingGravity;
  if (!acceleration) {
    return;
  }
  const magnitude = Math.sqrt(
    (acceleration.x || 0) ** 2 +
      (acceleration.y || 0) ** 2 +
      (acceleration.z || 0) ** 2
  );
  const now = Date.now();
  if (magnitude > 22 && now - lastShake > 2000) {
    lastShake = now;
    queueSelfie("shake");
  }
}

function updateProgress(progress) {
  const outputUrl = hasUsableOutputUrl(progress.outputUrl) ? progress.outputUrl.trim() : "";
  const hasOutputUrl = Boolean(outputUrl);
  const outputReadyForDisplay = progressPreviewManager.isReady(outputUrl);
  const { waitingForHostedImage, percent, label } = getHostedProgressState({
    progress,
    outputUrl,
    outputReadyForDisplay,
    isHostedComfy: isHostedComfyUrl(comfyServerUrl),
  });

  progressLabels.forEach((element) => {
    element.textContent = label;
  });
  progressValues.forEach((element) => {
    element.textContent = `${percent}%`;
  });
  progressFills.forEach((element) => {
    element.style.width = `${percent}%`;
  });
  if (hasOutputUrl) {
    lastOutputUrl = outputUrl;
    progressPreviewManager.queue(outputUrl);
    if (outputReadyForDisplay) {
      progressPreviewManager.show(outputUrl);
    } else {
      progressPreviewManager.clear();
    }
  } else {
    progressPreviewManager.clear();
  }

  updateRemoteProgress({
    status: waitingForHostedImage ? "waiting" : progress.complete ? "complete" : "generating",
    label,
    percent,
    complete: Boolean(progress.complete && outputReadyForDisplay),
    outputUrl: outputReadyForDisplay ? outputUrl : null,
  });
  if (typeof progress.websocketConnected === "boolean") {
    updateComfyConnectionStatus(progress.websocketConnected);
  }
}

function updateComfyConnectionStatus(isConnected) {
  if (!statusConnection) {
    return;
  }
  statusConnection.textContent = isConnected ? "ComfyUI: Connected" : "ComfyUI: Offline";
  statusConnection.classList.toggle("status__connection--offline", !isConnected);
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function toggleSystemMenus() {
  document.body.classList.toggle("system-controls-hidden");
}

function openDiagnostics() {
  if (!diagnosticsModal) {
    return;
  }
  diagnosticsModal.classList.add("diagnostics-modal--open");
  fetchDiagnostics();
}

function closeDiagnostics() {
  diagnosticsModal?.classList.remove("diagnostics-modal--open");
}

async function fetchDiagnostics() {
  if (diagnosticsServer) {
    diagnosticsServer.textContent = "Checking...";
  }
  if (diagnosticsSocket) {
    diagnosticsSocket.textContent = "Checking...";
  }
  if (diagnosticsApi) {
    diagnosticsApi.textContent = "Checking...";
  }
  if (diagnosticsUptime) {
    diagnosticsUptime.textContent = "—";
  }
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const health = await response.json();
    if (diagnosticsServer) {
      diagnosticsServer.textContent = health.comfyServerUrl || "Not configured";
    }
    if (diagnosticsSocket) {
      diagnosticsSocket.textContent = health.websocketConnected ? "Connected" : "Offline";
    }
    if (diagnosticsApi) {
      diagnosticsApi.textContent = health.apiKeyConfigured ? "Configured" : "Not configured";
    }
    if (diagnosticsUptime) {
      diagnosticsUptime.textContent = formatUptime(health.uptimeSeconds || 0);
    }
  } catch (error) {
    const message = error?.message || "Unavailable";
    if (diagnosticsServer) {
      diagnosticsServer.textContent = message;
    }
    if (diagnosticsSocket) {
      diagnosticsSocket.textContent = "Unavailable";
    }
    if (diagnosticsApi) {
      diagnosticsApi.textContent = "Unavailable";
    }
    if (diagnosticsUptime) {
      diagnosticsUptime.textContent = "Unavailable";
    }
  }
}

function openTos() {
  if (!tosModal) {
    return;
  }
  tosModal.classList.add("tos-modal--open");
}

function closeTos() {
  tosModal?.classList.remove("tos-modal--open");
}

function applyUploadVisibility() {
  document.body.classList.toggle("is-upload-hidden", !uploadEnabled);
  document.body.classList.toggle("is-qr-hidden", hideQrEnabled);
  uploadButton.disabled = !uploadEnabled || !outputReady;
  if (galleryUploadButton) {
    galleryUploadButton.disabled = !uploadEnabled || !selectedGalleryUrl;
  }
  if (!uploadEnabled || hideQrEnabled) {
    qrContainer.style.display = "none";
    qrImage.src = "";
    setGalleryStatus("");
    galleryQr.style.display = "none";
    galleryQrImage.src = "";
  }
}

function applyPrintVisibility() {
  document.body.classList.toggle("is-print-hidden", hidePrintEnabled);
  if (printButton) {
    printButton.disabled =
      hidePrintEnabled || !printerConfig.enabled || !printerConfig.name || !outputReady;
  }
  if (galleryPrintButton) {
    galleryPrintButton.disabled =
      hidePrintEnabled || !printerConfig.enabled || !printerConfig.name || !selectedGalleryUrl;
  }
}

function applyDebateSparkVisibility() {
  document.body.classList.toggle("is-debate-spark-hidden", !debateSparkEnabled);
  if (!debateSparkEnabled) {
    document.body.classList.remove("debate-fever");
  }
  if (settingsDebateSparkInput) {
    settingsDebateSparkInput.checked = debateSparkEnabled;
  }
  recalcDebateOffset();
}

function startProgressPolling() {
  if (!currentPromptId) {
    return;
  }
  progressLabels.forEach((element) => {
    element.textContent = "Sampling";
  });
  progressValues.forEach((element) => {
    element.textContent = "0%";
  });
  progressFills.forEach((element) => {
    element.style.width = "0%";
  });
  progressPoller = setInterval(async () => {
    try {
      const headers = comfyApiKey ? { "x-comfy-api-key": comfyApiKey } : {};
      const response = await fetch(
        `/api/progress?promptId=${encodeURIComponent(
          currentPromptId
        )}&comfyServerUrl=${encodeURIComponent(comfyServerUrl)}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error("Progress unavailable");
      }
      const data = await response.json();
      updateProgress(data);
      if (data.complete && progressPreviewManager.isReady(data.outputUrl)) {
        clearInterval(progressPoller);
        progressPoller = null;
        progressLabels.forEach((element) => {
          element.textContent = "Complete";
        });
        outputReady = true;
        uploadButton.disabled = !uploadEnabled;
      redoButton && (redoButton.disabled = !lastCapturedImageData);
        applyPrintVisibility();
        doneButton.disabled = false;
        progressCloseButton.disabled = false;
        updateRemoteProgress({
          status: "complete",
          label: "Complete",
          percent: 100,
          complete: true,
        });
      }
    } catch (error) {
      progressLabels.forEach((element) => {
        element.textContent = HOSTED_COMFY_WAITING_LABEL;
      });
      progressPreviewManager.clear();
      progressValues.forEach((element) => {
        element.textContent = "90%";
      });
      progressFills.forEach((element) => {
        element.style.width = "90%";
      });
      updateRemoteProgress({
        status: "waiting",
        label: HOSTED_COMFY_WAITING_LABEL,
        percent: 90,
        complete: false,
      });
    }
  }, 1200);
}

function setBusy(isBusy) {
  if (isBusy) {
    appRoot.classList.add("app--busy");
    idleController.pause();
    updateRemoteProgress({
      status: "busy",
      label: "Processing",
      percent: 0,
      complete: false,
    });
    return;
  }
  appRoot.classList.remove("app--busy");
  idleController.resume();
  progressLabels.forEach((element) => {
    element.textContent = "";
  });
  progressValues.forEach((element) => {
    element.textContent = "";
  });
  progressFills.forEach((element) => {
    element.style.width = "0%";
  });
  qrContainer.style.display = "none";
  qrImage.src = "";
  uploadButton.disabled = true;
  printButton.disabled = true;
  doneButton.disabled = true;
  progressCloseButton.disabled = true;
  if (progressPoller) {
    clearInterval(progressPoller);
    progressPoller = null;
  }
  currentPromptId = null;
  outputReady = false;
  lastOutputUrl = null;
  progressPreviewManager.reset();
  lastRemoteProgress = {
    status: "ready",
    label: "Ready",
    percent: 0,
    complete: false,
  };
  updateRemoteProgress(lastRemoteProgress);
}

function stripHostedWorkflowPath(value) {
  const normalized = normalizeComfyInput(value);
  if (!normalized) {
    return value;
  }
  try {
    const url = new URL(normalized);
    if (/\/api\/v1\/workflows(\/|$)/i.test(url.pathname)) {
      return url.origin;
    }
  } catch (error) {
    return normalized;
  }
  return normalized;
}

function loadPrinterConfig() {
  try {
    const storedPrinterConfig = readStoredJson(storageKeys.printerConfig, null);
    if (storedPrinterConfig && typeof storedPrinterConfig === "object") {
      printerConfig = storedPrinterConfig;
    }
    if (!Number.isFinite(Number(printerConfig.copies)) || Number(printerConfig.copies) <= 0) {
      printerConfig.copies = 1;
    }
    const freeimageRaw = readStoredValue(storageKeys.freeimageApiKey);
    if (freeimageRaw) {
      freeimageApiKey = freeimageRaw;
    }
    const comfyKeyRaw = readStoredValue(storageKeys.comfyApiKey);
    if (comfyKeyRaw) {
      comfyApiKey = comfyKeyRaw;
    }
    const comfyRaw = readStoredValue(storageKeys.comfyServerUrl);
    if (comfyRaw) {
      comfyServerUrl = normalizeComfyInput(comfyRaw) || comfyRaw;
    }
    const comfyMinCreditsRaw = readStoredValue(storageKeys.comfyMinCredits);
    if (comfyMinCreditsRaw !== null) {
      const parsed = Number(comfyMinCreditsRaw);
      if (Number.isFinite(parsed) && parsed >= 0) {
        comfyMinCredits = Math.floor(parsed);
      }
    }
    const comfyAcceleratorRaw = readStoredValue(storageKeys.comfyAccelerator);
    if (comfyAcceleratorRaw) {
      comfyAccelerator = comfyAcceleratorRaw;
    }
    const comfyHostedEnabledRaw = readStoredValue(storageKeys.comfyHostedEnabled);
    if (comfyHostedEnabledRaw !== null) {
      comfyHostedEnabled = comfyHostedEnabledRaw === "true";
    }
    const orientationRaw = readStoredValue(storageKeys.cameraOrientation);
    if (orientationRaw) {
      cameraOrientation = Number(orientationRaw) || 0;
    }
    const mirrorRaw = readStoredValue(storageKeys.cameraMirrored);
    if (mirrorRaw !== null) {
      cameraMirrored = mirrorRaw === "true";
    }
    const cameraDeviceRaw = readStoredValue(storageKeys.cameraDeviceId);
    if (cameraDeviceRaw) {
      cameraDeviceId = cameraDeviceRaw;
    }
    const watermarkRaw = readStoredValue(storageKeys.watermarkEnabled);
    if (watermarkRaw !== null) {
      watermarkEnabled = watermarkRaw === "true";
    }
    const watermarkCustomRaw = readStoredValue(storageKeys.watermarkCustomDataUrl);
    if (watermarkCustomRaw) {
      watermarkCustomDataUrl = watermarkCustomRaw;
    }
    const watermarkTextRaw = readStoredValue(storageKeys.watermarkText);
    if (watermarkTextRaw) {
      watermarkText = watermarkTextRaw;
    }
    const brandTitleTextRaw = readStoredValue(storageKeys.brandTitleText);
    if (brandTitleTextRaw) {
      branding.titleText = brandTitleTextRaw;
    }
    const brandAccentTextRaw = readStoredValue(storageKeys.brandAccentText);
    if (brandAccentTextRaw) {
      branding.accentText = brandAccentTextRaw;
    }
    const brandNeutralTextRaw = readStoredValue(storageKeys.brandNeutralText);
    if (brandNeutralTextRaw) {
      branding.neutralText = brandNeutralTextRaw;
    }
    const brandIntroBadgeTextRaw = readStoredValue(storageKeys.brandIntroBadgeText);
    if (brandIntroBadgeTextRaw) {
      branding.introBadgeText = brandIntroBadgeTextRaw;
    }
    const brandTitleColorRaw = readStoredValue(storageKeys.brandTitleColor);
    if (brandTitleColorRaw) {
      branding.titleColor = brandTitleColorRaw;
    }
    const brandAccentColorRaw = readStoredValue(storageKeys.brandAccentColor);
    if (brandAccentColorRaw) {
      branding.accentColor = brandAccentColorRaw;
    }
    const brandNeutralColorRaw = readStoredValue(storageKeys.brandNeutralColor);
    if (brandNeutralColorRaw) {
      branding.neutralColor = brandNeutralColorRaw;
    }
    const brandButtonColorRaw = readStoredValue(storageKeys.brandButtonColor);
    if (brandButtonColorRaw) {
      branding.buttonColor = brandButtonColorRaw;
    }
    const brandButtonTextColorRaw = readStoredValue(storageKeys.brandButtonTextColor);
    if (brandButtonTextColorRaw) {
      branding.buttonTextColor = brandButtonTextColorRaw;
    }
    const brandPanelTintColorRaw = readStoredValue(storageKeys.brandPanelTintColor);
    if (brandPanelTintColorRaw) {
      branding.panelTintColor = brandPanelTintColorRaw;
    }
    const brandProgressStartColorRaw = readStoredValue(storageKeys.brandProgressStartColor);
    if (brandProgressStartColorRaw) {
      branding.progressStartColor = brandProgressStartColorRaw;
    }
    const brandProgressEndColorRaw = readStoredValue(storageKeys.brandProgressEndColor);
    if (brandProgressEndColorRaw) {
      branding.progressEndColor = brandProgressEndColorRaw;
    }
    const brandPanelBgColorRaw = readStoredValue(storageKeys.brandPanelBgColor);
    if (brandPanelBgColorRaw) {
      branding.panelBgColor = brandPanelBgColorRaw;
    }
    const brandPanelBorderColorRaw = readStoredValue(storageKeys.brandPanelBorderColor);
    if (brandPanelBorderColorRaw) {
      branding.panelBorderColor = brandPanelBorderColorRaw;
    }
    const brandMenuBgColorRaw = readStoredValue(storageKeys.brandMenuBgColor);
    if (brandMenuBgColorRaw) {
      branding.menuBgColor = brandMenuBgColorRaw;
    }
    const brandProgressFlowStartColorRaw = readStoredValue(storageKeys.brandProgressFlowStartColor);
    if (brandProgressFlowStartColorRaw) {
      branding.progressFlowStartColor = brandProgressFlowStartColorRaw;
    }
    const brandProgressFlowEndColorRaw = readStoredValue(storageKeys.brandProgressFlowEndColor);
    if (brandProgressFlowEndColorRaw) {
      branding.progressFlowEndColor = brandProgressFlowEndColorRaw;
    }
    const brandCardBgStartColorRaw = readStoredValue(storageKeys.brandCardBgStartColor);
    if (brandCardBgStartColorRaw) {
      branding.cardBgStartColor = brandCardBgStartColorRaw;
    }
    const brandCardBgEndColorRaw = readStoredValue(storageKeys.brandCardBgEndColor);
    if (brandCardBgEndColorRaw) {
      branding.cardBgEndColor = brandCardBgEndColorRaw;
    }
    const uploadRaw = readStoredValue(storageKeys.uploadEnabled);
    if (uploadRaw !== null) {
      uploadEnabled = uploadRaw === "true";
    }
    const hidePrintRaw = readStoredValue(storageKeys.hidePrintEnabled);
    if (hidePrintRaw !== null) {
      hidePrintEnabled = hidePrintRaw === "true";
    }
    const hideQrRaw = readStoredValue(storageKeys.hideQrEnabled);
    if (hideQrRaw !== null) {
      hideQrEnabled = hideQrRaw === "true";
    }
    const remoteResultRaw = readStoredValue(storageKeys.remoteResultEnabled);
    if (remoteResultRaw !== null) {
      remoteResultEnabled = remoteResultRaw === "true";
    }
    const remoteCameraRaw = readStoredValue(storageKeys.remoteCameraCaptureEnabled);
    if (remoteCameraRaw !== null) {
      remoteCameraCaptureEnabled = remoteCameraRaw === "true";
    }
    const remoteShortcutRaw = readStoredValue(storageKeys.remoteShortcutEnabled);
    if (remoteShortcutRaw !== null) {
      remoteShortcutEnabled = remoteShortcutRaw === "true";
    }
    const diagnosticsShortcutRaw = readStoredValue(storageKeys.diagnosticsShortcutEnabled);
    if (diagnosticsShortcutRaw !== null) {
      diagnosticsShortcutEnabled = diagnosticsShortcutRaw === "true";
    }
    const galleryShortcutRaw = readStoredValue(storageKeys.galleryShortcutEnabled);
    if (galleryShortcutRaw !== null) {
      galleryShortcutEnabled = galleryShortcutRaw === "true";
    }
    const sfxRaw = readStoredValue(storageKeys.soundEffectsEnabled);
    if (sfxRaw !== null) {
      soundEffectsEnabled = sfxRaw === "true";
    }
    const musicRaw = readStoredValue(storageKeys.backgroundMusicEnabled);
    if (musicRaw !== null) {
      backgroundMusicEnabled = musicRaw === "true";
    }
    const debateSparkRaw = readStoredValue(storageKeys.debateSparkEnabled);
    if (debateSparkRaw !== null) {
      debateSparkEnabled = debateSparkRaw === "true";
    }
  } catch (error) {
    printerConfig = { name: "", enabled: false, copies: 1 };
    freeimageApiKey = "";
    comfyApiKey = "";
    comfyServerUrl = defaultComfyServerUrl;
    comfyHostedEnabled = true;
    cameraOrientation = 0;
    cameraMirrored = false;
    cameraDeviceId = "";
    watermarkEnabled = false;
    watermarkCustomDataUrl = "";
    watermarkImageCache = { src: "", image: null };
    watermarkText = "MKRShift";
    branding = { ...defaultBranding };
    uploadEnabled = true;
    hidePrintEnabled = false;
    hideQrEnabled = false;
    remoteResultEnabled = true;
    remoteCameraCaptureEnabled = false;
    remoteShortcutEnabled = true;
    diagnosticsShortcutEnabled = true;
    galleryShortcutEnabled = true;
    soundEffectsEnabled = true;
    backgroundMusicEnabled = false;
    debateSparkEnabled = true;
  }
  if (!comfyHostedEnabled) {
    comfyServerUrl = stripHostedWorkflowPath(comfyServerUrl) || defaultComfyServerUrl;
  }
  settingsComfyInput.value = comfyServerUrl || defaultComfyServerUrl;
  settingsComfyKeyInput.value = comfyApiKey || "";
  if (settingsComfyMinCreditsInput) {
    settingsComfyMinCreditsInput.value = String(comfyMinCredits);
  }
  if (settingsComfyAcceleratorInput) {
    settingsComfyAcceleratorInput.value = comfyAccelerator;
  }
  if (settingsComfyHostedInput) {
    settingsComfyHostedInput.checked = comfyHostedEnabled;
  }
  settingsOrientationInput.value = String(cameraOrientation || 0);
  if (settingsCameraInput) {
    settingsCameraInput.value = cameraDeviceId || "";
  }
  if (settingsMirrorInput) {
    settingsMirrorInput.checked = cameraMirrored;
  }
  settingsPrinterInput.value = printerConfig.name || "";
  settingsPrinterCopiesInput.value = String(printerConfig.copies || 1);
  settingsEnabledInput.checked = Boolean(printerConfig.enabled);
  if (settingsHidePrintInput) {
    settingsHidePrintInput.checked = hidePrintEnabled;
  }
  settingsFreeimageInput.value = freeimageApiKey || "";
  settingsUploadsInput.checked = uploadEnabled;
  if (settingsHideQrInput) {
    settingsHideQrInput.checked = hideQrEnabled;
  }
  if (settingsRemoteResultInput) {
    settingsRemoteResultInput.checked = remoteResultEnabled;
  }
  if (settingsRemoteCameraInput) {
    settingsRemoteCameraInput.checked = remoteCameraCaptureEnabled;
  }
  if (settingsRemoteShortcutInput) {
    settingsRemoteShortcutInput.checked = remoteShortcutEnabled;
  }
  if (settingsDiagnosticsShortcutInput) {
    settingsDiagnosticsShortcutInput.checked = diagnosticsShortcutEnabled;
  }
  if (settingsGalleryShortcutInput) {
    settingsGalleryShortcutInput.checked = galleryShortcutEnabled;
  }
  applyRemoteShortcutVisibility();
  applyDiagnosticsShortcutVisibility();
  applyGalleryShortcutVisibility();
  applyAudioToggles();
  if (settingsDebateSparkInput) {
    settingsDebateSparkInput.checked = debateSparkEnabled;
  }
  settingsWatermarkInput.checked = watermarkEnabled;
  if (settingsWatermarkTextInput) {
    settingsWatermarkTextInput.value = watermarkText || "MKRShift";
  }
  syncBrandingInputs();
  loadBrandProfiles();
  if (settingsWatermarkClear) {
    settingsWatermarkClear.disabled = !watermarkCustomDataUrl;
  }
  applyBranding();
  renderWatermarkPreview();
  applyPrintVisibility();
  applyCameraOrientation();
  updateRemoteInfo();
  applyUploadVisibility();
  applyDebateSparkVisibility();
  printerController.loadPrinters(printerConfig.name);
  void ensureBackgroundMusic();
}

function getBrandingSnapshot() {
  return {
    titleText: branding.titleText,
    accentText: branding.accentText,
    neutralText: branding.neutralText,
    introBadgeText: branding.introBadgeText,
    titleColor: branding.titleColor,
    accentColor: branding.accentColor,
    neutralColor: branding.neutralColor,
    buttonColor: branding.buttonColor,
    buttonTextColor: branding.buttonTextColor,
    panelTintColor: branding.panelTintColor,
    progressStartColor: branding.progressStartColor,
    progressEndColor: branding.progressEndColor,
    panelBgColor: branding.panelBgColor,
    panelBorderColor: branding.panelBorderColor,
    menuBgColor: branding.menuBgColor,
    progressFlowStartColor: branding.progressFlowStartColor,
    progressFlowEndColor: branding.progressFlowEndColor,
    cardBgStartColor: branding.cardBgStartColor,
    cardBgEndColor: branding.cardBgEndColor,
  };
}

function renderBrandProfileOptions() {
  if (!settingsBrandProfileSelect) {
    return;
  }
  const current = settingsBrandProfileSelect.value;
  settingsBrandProfileSelect.innerHTML = '<option value="">Select profile…</option>';
  brandProfiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.name;
    option.textContent = profile.name;
    settingsBrandProfileSelect.appendChild(option);
  });
  if (current && brandProfiles.some((profile) => profile.name === current)) {
    settingsBrandProfileSelect.value = current;
  }
}

function persistBrandProfiles() {
  writeStoredJson(storageKeys.brandProfiles, brandProfiles);
}

function loadBrandProfiles() {
  const stored = readStoredJson(storageKeys.brandProfiles, []);
  brandProfiles = Array.isArray(stored)
    ? stored.filter((profile) => profile && typeof profile.name === "string" && profile.values)
    : [];
  renderBrandProfileOptions();
}

function applyBrandProfile(profileName) {
  const profile = brandProfiles.find((entry) => entry.name === profileName);
  if (!profile || !profile.values) {
    return;
  }
  branding = { ...branding, ...profile.values };
  applyBranding();
  syncBrandingInputs();
  writeStoredValue(storageKeys.brandTitleText, branding.titleText);
  writeStoredValue(storageKeys.brandAccentText, branding.accentText);
  writeStoredValue(storageKeys.brandNeutralText, branding.neutralText);
  writeStoredValue(storageKeys.brandIntroBadgeText, branding.introBadgeText);
  writeStoredValue(storageKeys.brandTitleColor, branding.titleColor);
  writeStoredValue(storageKeys.brandAccentColor, branding.accentColor);
  writeStoredValue(storageKeys.brandNeutralColor, branding.neutralColor);
  writeStoredValue(storageKeys.brandButtonColor, branding.buttonColor);
  writeStoredValue(storageKeys.brandButtonTextColor, branding.buttonTextColor);
  writeStoredValue(storageKeys.brandPanelTintColor, branding.panelTintColor);
  writeStoredValue(storageKeys.brandProgressStartColor, branding.progressStartColor);
  writeStoredValue(storageKeys.brandProgressEndColor, branding.progressEndColor);
  writeStoredValue(storageKeys.brandPanelBgColor, branding.panelBgColor);
  writeStoredValue(storageKeys.brandPanelBorderColor, branding.panelBorderColor);
  writeStoredValue(storageKeys.brandMenuBgColor, branding.menuBgColor);
  writeStoredValue(storageKeys.brandProgressFlowStartColor, branding.progressFlowStartColor);
  writeStoredValue(storageKeys.brandProgressFlowEndColor, branding.progressFlowEndColor);
  writeStoredValue(storageKeys.brandCardBgStartColor, branding.cardBgStartColor);
  writeStoredValue(storageKeys.brandCardBgEndColor, branding.cardBgEndColor);
}

function loadUiPreferences() {
  try {
    const storedDelay = Number(readStoredValue(storageKeys.selectedDelay));
    if (Number.isFinite(storedDelay)) {
      setSelectedDelay(storedDelay, { persist: false });
    }
    const storedStyle = readStoredValue(storageKeys.selectedStyle);
    if (storedStyle) {
      selectedStyle = storedStyle;
    }
    const hideStatusRaw = readStoredValue(storageKeys.hideStatusEnabled);
    if (hideStatusRaw !== null) {
      hideStatusEnabled = hideStatusRaw === "true";
    }
  } catch (error) {
    selectedDelay = 0;
    selectedStyle = null;
  }
}

function updateBrandingFromInputs({ persist = false } = {}) {
  if (settingsBrandTitleInput) {
    branding.titleText = settingsBrandTitleInput.value;
  }
  if (settingsBrandAccentTextInput) {
    branding.accentText = settingsBrandAccentTextInput.value;
  }
  if (settingsBrandNeutralTextInput) {
    branding.neutralText = settingsBrandNeutralTextInput.value;
  }
  if (settingsBrandIntroBadgeTextInput) {
    branding.introBadgeText = settingsBrandIntroBadgeTextInput.value;
  }
  if (settingsBrandTitleColorInput) {
    branding.titleColor = settingsBrandTitleColorInput.value;
  }
  if (settingsBrandAccentColorInput) {
    branding.accentColor = settingsBrandAccentColorInput.value;
  }
  if (settingsBrandNeutralColorInput) {
    branding.neutralColor = settingsBrandNeutralColorInput.value;
  }
  if (settingsBrandButtonColorInput) {
    branding.buttonColor = settingsBrandButtonColorInput.value;
  }
  if (settingsBrandButtonTextColorInput) {
    branding.buttonTextColor = settingsBrandButtonTextColorInput.value;
  }
  if (settingsBrandPanelTintColorInput) {
    branding.panelTintColor = settingsBrandPanelTintColorInput.value;
  }
  if (settingsBrandProgressStartColorInput) {
    branding.progressStartColor = settingsBrandProgressStartColorInput.value;
  }
  if (settingsBrandProgressEndColorInput) {
    branding.progressEndColor = settingsBrandProgressEndColorInput.value;
  }
  if (settingsBrandPanelBgColorInput) {
    branding.panelBgColor = settingsBrandPanelBgColorInput.value;
  }
  if (settingsBrandPanelBorderColorInput) {
    branding.panelBorderColor = settingsBrandPanelBorderColorInput.value;
  }
  if (settingsBrandMenuBgColorInput) {
    branding.menuBgColor = settingsBrandMenuBgColorInput.value;
  }
  if (settingsBrandProgressFlowStartColorInput) {
    branding.progressFlowStartColor = settingsBrandProgressFlowStartColorInput.value;
  }
  if (settingsBrandProgressFlowEndColorInput) {
    branding.progressFlowEndColor = settingsBrandProgressFlowEndColorInput.value;
  }
  if (settingsBrandCardBgStartColorInput) {
    branding.cardBgStartColor = settingsBrandCardBgStartColorInput.value;
  }
  if (settingsBrandCardBgEndColorInput) {
    branding.cardBgEndColor = settingsBrandCardBgEndColorInput.value;
  }

  applyBranding();
  syncBrandingInputs();

  if (!persist) {
    return;
  }
  writeStoredValue(storageKeys.brandTitleText, branding.titleText);
  writeStoredValue(storageKeys.brandAccentText, branding.accentText);
  writeStoredValue(storageKeys.brandNeutralText, branding.neutralText);
  writeStoredValue(storageKeys.brandIntroBadgeText, branding.introBadgeText);
  writeStoredValue(storageKeys.brandTitleColor, branding.titleColor);
  writeStoredValue(storageKeys.brandAccentColor, branding.accentColor);
  writeStoredValue(storageKeys.brandNeutralColor, branding.neutralColor);
  writeStoredValue(storageKeys.brandButtonColor, branding.buttonColor);
  writeStoredValue(storageKeys.brandButtonTextColor, branding.buttonTextColor);
  writeStoredValue(storageKeys.brandPanelTintColor, branding.panelTintColor);
  writeStoredValue(storageKeys.brandProgressStartColor, branding.progressStartColor);
  writeStoredValue(storageKeys.brandProgressEndColor, branding.progressEndColor);
  writeStoredValue(storageKeys.brandPanelBgColor, branding.panelBgColor);
  writeStoredValue(storageKeys.brandPanelBorderColor, branding.panelBorderColor);
  writeStoredValue(storageKeys.brandMenuBgColor, branding.menuBgColor);
  writeStoredValue(storageKeys.brandProgressFlowStartColor, branding.progressFlowStartColor);
  writeStoredValue(storageKeys.brandProgressFlowEndColor, branding.progressFlowEndColor);
  writeStoredValue(storageKeys.brandCardBgStartColor, branding.cardBgStartColor);
  writeStoredValue(storageKeys.brandCardBgEndColor, branding.cardBgEndColor);
}

async function savePrinterConfig() {
  const copies = Number(settingsPrinterCopiesInput.value) || 1;
  printerConfig = {
    name: settingsPrinterInput.value.trim(),
    enabled: settingsEnabledInput.checked,
    copies: Math.max(1, Math.floor(copies)),
  };
  writeStoredJson(storageKeys.printerConfig, printerConfig);
  freeimageApiKey = settingsFreeimageInput.value.trim();
  writeStoredValue(storageKeys.freeimageApiKey, freeimageApiKey);
  comfyApiKey = settingsComfyKeyInput.value.trim();
  writeStoredValue(storageKeys.comfyApiKey, comfyApiKey);
  if (settingsComfyMinCreditsInput) {
    const parsedMin = Number(settingsComfyMinCreditsInput.value);
    comfyMinCredits = Number.isFinite(parsedMin) && parsedMin >= 0 ? Math.floor(parsedMin) : 2500;
    writeStoredValue(storageKeys.comfyMinCredits, String(comfyMinCredits));
  }
  if (settingsComfyAcceleratorInput) {
    comfyAccelerator = settingsComfyAcceleratorInput.value || "L4";
    writeStoredValue(storageKeys.comfyAccelerator, comfyAccelerator);
  }
  if (settingsComfyHostedInput) {
    comfyHostedEnabled = settingsComfyHostedInput.checked;
    writeStoredValue(storageKeys.comfyHostedEnabled, String(comfyHostedEnabled));
  }
  const normalizedComfy = normalizeComfyInput(settingsComfyInput.value);
  const sanitizedComfy = comfyHostedEnabled ? normalizedComfy : stripHostedWorkflowPath(normalizedComfy);
  comfyServerUrl = sanitizedComfy || defaultComfyServerUrl;
  writeStoredValue(storageKeys.comfyServerUrl, comfyServerUrl);
  cameraOrientation = Number(settingsOrientationInput.value) || 0;
  writeStoredValue(storageKeys.cameraOrientation, String(cameraOrientation));
  if (settingsMirrorInput) {
    cameraMirrored = settingsMirrorInput.checked;
    writeStoredValue(storageKeys.cameraMirrored, String(cameraMirrored));
  }
  const selectedCameraDevice = settingsCameraInput?.value || "";
  const cameraChanged = selectedCameraDevice !== cameraDeviceId;
  cameraDeviceId = selectedCameraDevice;
  if (cameraDeviceId) {
    writeStoredValue(storageKeys.cameraDeviceId, cameraDeviceId);
  } else {
    removeStoredValue(storageKeys.cameraDeviceId);
  }
  watermarkEnabled = settingsWatermarkInput.checked;
  writeStoredValue(storageKeys.watermarkEnabled, String(watermarkEnabled));
  if (settingsWatermarkTextInput) {
    watermarkText = settingsWatermarkTextInput.value.trim() || "MKRShift";
    writeStoredValue(storageKeys.watermarkText, watermarkText);
  }
  updateBrandingFromInputs({ persist: true });
  renderWatermarkPreview();
  uploadEnabled = settingsUploadsInput.checked;
  writeStoredValue(storageKeys.uploadEnabled, String(uploadEnabled));
  if (settingsHidePrintInput) {
    hidePrintEnabled = settingsHidePrintInput.checked;
    writeStoredValue(storageKeys.hidePrintEnabled, String(hidePrintEnabled));
  }
  if (settingsHideQrInput) {
    hideQrEnabled = settingsHideQrInput.checked;
    writeStoredValue(storageKeys.hideQrEnabled, String(hideQrEnabled));
  }
  if (settingsRemoteResultInput) {
    remoteResultEnabled = settingsRemoteResultInput.checked;
    writeStoredValue(storageKeys.remoteResultEnabled, String(remoteResultEnabled));
  }
  if (settingsRemoteCameraInput) {
    remoteCameraCaptureEnabled = settingsRemoteCameraInput.checked;
    writeStoredValue(storageKeys.remoteCameraCaptureEnabled, String(remoteCameraCaptureEnabled));
  }
  if (settingsRemoteShortcutInput) {
    remoteShortcutEnabled = settingsRemoteShortcutInput.checked;
    writeStoredValue(storageKeys.remoteShortcutEnabled, String(remoteShortcutEnabled));
  }
  if (settingsDiagnosticsShortcutInput) {
    diagnosticsShortcutEnabled = settingsDiagnosticsShortcutInput.checked;
    writeStoredValue(storageKeys.diagnosticsShortcutEnabled, String(diagnosticsShortcutEnabled));
  }
  if (settingsGalleryShortcutInput) {
    galleryShortcutEnabled = settingsGalleryShortcutInput.checked;
    writeStoredValue(storageKeys.galleryShortcutEnabled, String(galleryShortcutEnabled));
  }
  if (settingsSoundEffectsInput) {
    soundEffectsEnabled = settingsSoundEffectsInput.checked;
    writeStoredValue(storageKeys.soundEffectsEnabled, String(soundEffectsEnabled));
  }
  if (settingsBackgroundMusicInput) {
    backgroundMusicEnabled = settingsBackgroundMusicInput.checked;
    writeStoredValue(storageKeys.backgroundMusicEnabled, String(backgroundMusicEnabled));
  }
  if (settingsDebateSparkInput) {
    debateSparkEnabled = settingsDebateSparkInput.checked;
    writeStoredValue(storageKeys.debateSparkEnabled, String(debateSparkEnabled));
  }
  if (settingsHideStatusInput) {
    hideStatusEnabled = settingsHideStatusInput.checked;
    writeStoredValue(storageKeys.hideStatusEnabled, String(hideStatusEnabled));
  }
  applyAudioToggles();
  void ensureBackgroundMusic();
  applyPrintVisibility();
  applyCameraOrientation();
  applyUploadVisibility();
  applyDebateSparkVisibility();
  applyStatusVisibility();
  applyRemoteShortcutVisibility();
  applyDiagnosticsShortcutVisibility();
  applyGalleryShortcutVisibility();
  broadcastRemoteConfig();
  updateRemoteProgress(lastRemoteProgress);
  if (cameraChanged) {
    await startCamera();
  }
}

async function openSettings() {
  if (!settingsModal) {
    return;
  }
  closeRemoteLaunch();
  settingsModal.classList.add("settings-modal--open");
  if (settingsClose) {
    settingsClose.disabled = false;
  }
  printerController.loadPrinters(printerConfig.name);
  await refreshCameraOptions();
}

function handlePrinterSelection() {
  const selectedName = settingsPrinterInput.value.trim();
  printerConfig = {
    ...printerConfig,
    name: selectedName,
  };
  writeStoredJson(storageKeys.printerConfig, printerConfig);
  printerController.updatePrinterDetails(selectedName);
  applyPrintVisibility();
}

function closeSettings() {
  settingsModal?.classList.remove("settings-modal--open");
}

function applyRemoteShortcutVisibility() {
  if (!remoteToggle) {
    return;
  }
  remoteToggle.classList.toggle("remote-toggle--hidden", !remoteShortcutEnabled);
  if (!remoteShortcutEnabled) {
    remoteLaunchModal?.classList.remove("remote-launch-modal--open");
  }
}

function applyDiagnosticsShortcutVisibility() {
  if (!diagnosticsToggle) {
    return;
  }
  diagnosticsToggle.classList.toggle("diagnostics-toggle--hidden", !diagnosticsShortcutEnabled);
  if (!diagnosticsShortcutEnabled) {
    closeDiagnostics();
  }
}

function applyGalleryShortcutVisibility() {
  if (!galleryToggle) {
    return;
  }
  galleryToggle.classList.toggle("gallery-toggle--hidden", !galleryShortcutEnabled);
  if (!galleryShortcutEnabled) {
    closeGallery();
  }
}

async function openRemoteLaunch() {
  if (!remoteShortcutEnabled || !remoteLaunchModal) {
    return;
  }
  remoteLaunchModal.classList.add("remote-launch-modal--open");
  await updateRemoteInfo();
}

function closeRemoteLaunch() {
  remoteLaunchModal?.classList.remove("remote-launch-modal--open");
}

function openGallery() {
  if (!galleryShortcutEnabled) {
    return;
  }
  if (!galleryModal) {
    return;
  }
  galleryModal.classList.add("gallery-modal--open");
  void playSoundEffect("galleryOpen", 0.7);
  setGalleryStatus("");
  if (galleryQr) {
    galleryQr.style.display = "none";
  }
  if (galleryQrImage) {
    galleryQrImage.src = "";
  }
  galleryFilterText = "";
  if (gallerySearch) {
    gallerySearch.value = "";
  }
  if (gallerySort) {
    gallerySort.value = gallerySortOrder;
  }
  loadGallery();
}

function closeGallery() {
  galleryModal?.classList.remove("gallery-modal--open");
}

function formatGalleryTimestamp(updatedAt) {
  const numeric = Number(updatedAt);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return new Date(numeric).toLocaleString();
}

function setGallerySummary(count) {
  if (!gallerySummary) {
    return;
  }
  gallerySummary.textContent = `${count} result${count === 1 ? "" : "s"}`;
}

function setGalleryStatus(message, tone = "") {
  if (!galleryUploadStatus) {
    return;
  }
  galleryUploadStatus.textContent = message || "";
  galleryUploadStatus.dataset.tone = tone;
}

function focusGalleryRowByOffset(offset) {
  const rows = Array.from(galleryList.querySelectorAll(".gallery-item"));
  if (!rows.length) {
    return;
  }
  const index = Math.max(0, rows.findIndex((row) => row.dataset.id === selectedGalleryId));
  const next = Math.min(rows.length - 1, Math.max(0, index + offset));
  rows[next].click();
  rows[next].focus();
}

function setGallerySelection(item) {
  if (!item) {
    selectedGalleryUrl = "";
    selectedGalleryId = "";
    if (galleryMetaId) {
      galleryMetaId.textContent = "—";
    }
    if (galleryMetaDate) {
      galleryMetaDate.textContent = "—";
    }
    if (galleryMetaFile) {
      galleryMetaFile.textContent = "—";
    }
    updateGallerySelectionHighlight();
    galleryUploadButton.disabled = true;
    if (galleryPrintButton) {
      galleryPrintButton.disabled = true;
    }
    if (galleryDeleteButton) {
      galleryDeleteButton.disabled = true;
    }
    return;
  }
  selectedGalleryUrl = item.outputUrl;
  selectedGalleryId = item.id;
  if (galleryMetaId) {
    galleryMetaId.textContent = item.id;
  }
  if (galleryMetaDate) {
    galleryMetaDate.textContent = formatGalleryTimestamp(item.updatedAt);
  }
  if (galleryMetaFile) {
    galleryMetaFile.textContent = `${item.id}.png`;
  }
  galleryInputImage.src = item.inputUrl;
  galleryOutputImage.src = item.outputUrl;
  updateGallerySelectionHighlight();
  galleryUploadButton.disabled = !uploadEnabled;
  if (galleryDeleteButton) {
    galleryDeleteButton.disabled = false;
  }
  applyPrintVisibility();
  setGalleryStatus("");
  galleryQr.style.display = "none";
  galleryQrImage.src = "";
}

function applyCameraOrientation() {
  const orientation = getOrientationDegrees(cameraOrientation);
  const rotated = Math.abs(orientation) === 90;
  const container = appRoot.getBoundingClientRect();
  if (orientation) {
    video.style.top = "50%";
    video.style.left = "50%";
    if (rotated && container.width && container.height) {
      video.style.width = `${container.height}px`;
      video.style.height = `${container.width}px`;
    }
  } else {
    video.style.top = "";
    video.style.left = "";
    video.style.width = "";
    video.style.height = "";
  }
  const mirrorValue = cameraMirrored ? " scaleX(-1)" : "";
  if (orientation) {
    video.style.transform = `translate(-50%, -50%) rotate(${orientation}deg)${mirrorValue}`;
  } else {
    video.style.transform = mirrorValue ? `scaleX(-1)` : "";
  }
  video.style.transformOrigin = "center";
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return;
  }
  document.exitFullscreen?.().catch(() => {});
}

function renderGalleryItems(items) {
  galleryList.innerHTML = "";
  setGallerySummary(items.length);
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "gallery-empty";
    empty.textContent = galleryFilterText ? "No captures match your filter." : "No captures yet.";
    galleryList.appendChild(empty);
    setGallerySelection(null);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "gallery-item";
    row.dataset.id = item.id;
    row.setAttribute("aria-pressed", "false");
    row.setAttribute("role", "option");
    row.setAttribute("tabindex", "0");
    const thumb = document.createElement("img");
    thumb.src = item.outputUrl;
    const meta = document.createElement("div");
    meta.className = "gallery-item__meta";
    const title = document.createElement("span");
    title.className = "gallery-item__title";
    title.textContent = item.id;
    const date = document.createElement("span");
    date.className = "gallery-item__date";
    date.textContent = formatGalleryTimestamp(item.updatedAt);
    meta.appendChild(title);
    meta.appendChild(date);
    row.appendChild(thumb);
    row.appendChild(meta);
    row.addEventListener("click", () => {
      setGallerySelection(item);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusGalleryRowByOffset(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusGalleryRowByOffset(-1);
      }
    });
    galleryList.appendChild(row);
  });
  const matched = items.find((item) => item.id === selectedGalleryId);
  setGallerySelection(matched ?? items[0]);
}

function applyGalleryFilters() {
  const filtered = galleryItems.filter((item) => {
    if (!galleryFilterText) {
      return true;
    }
    return item.id.toLowerCase().includes(galleryFilterText);
  });
  const sorted = [...filtered].sort((a, b) => {
    if (gallerySortOrder === "oldest") {
      return a.updatedAt - b.updatedAt;
    }
    return b.updatedAt - a.updatedAt;
  });
  renderGalleryItems(sorted);
}

function updateGallerySelectionHighlight() {
  const items = Array.from(galleryList.querySelectorAll(".gallery-item"));
  items.forEach((item) => {
    const isActive = item.dataset.id === selectedGalleryId;
    item.classList.toggle("gallery-item--active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
}

async function loadGallery() {
  setGalleryStatus("Loading gallery…");
  if (galleryRefresh) {
    galleryRefresh.disabled = true;
  }
  try {
    const response = await fetch("/api/gallery");
    if (!response.ok) {
      throw new Error("Gallery unavailable");
    }
    const data = await response.json();
    galleryItems = data.items ?? [];
    applyGalleryFilters();
    setGalleryStatus("");
  } catch (error) {
    galleryItems = [];
    renderGalleryItems([]);
    setGalleryStatus(error?.message || "Unable to load gallery.", "error");
  } finally {
    if (galleryRefresh) {
      galleryRefresh.disabled = false;
    }
  }
}

async function uploadImage(imageUrl) {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, apiKey: freeimageApiKey }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Upload failed");
  }
  return response.json();
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = src;
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

async function getWatermarkImage() {
  if (!watermarkCustomDataUrl) {
    return null;
  }
  if (watermarkImageCache.src === watermarkCustomDataUrl && watermarkImageCache.image) {
    return watermarkImageCache.image;
  }
  const image = await loadImageElement(watermarkCustomDataUrl);
  watermarkImageCache = { src: watermarkCustomDataUrl, image };
  return image;
}

async function drawWatermark(ctx, width, height, { opacity = 1 } = {}) {
  const margin = Math.round(width * 0.035);
  const boxFill = "rgba(0, 0, 0, 0.72)";
  ctx.save();
  ctx.globalAlpha = opacity;
  let useTextWatermark = !watermarkCustomDataUrl;
  if (watermarkCustomDataUrl) {
    try {
      const watermarkImage = await getWatermarkImage();
      if (watermarkImage) {
        const maxWidth = width * 0.3;
        const maxHeight = height * 0.18;
        const scale = Math.min(
          maxWidth / watermarkImage.width,
          maxHeight / watermarkImage.height,
          1,
        );
        const wmWidth = watermarkImage.width * scale;
        const wmHeight = watermarkImage.height * scale;
        const padding = Math.round(Math.max(wmWidth, wmHeight) * 0.12);
        const boxWidth = wmWidth + padding * 2;
        const boxHeight = wmHeight + padding * 2;
        const x = width - margin - boxWidth;
        const y = height - margin - boxHeight;
        drawRoundedRect(ctx, x, y, boxWidth, boxHeight, Math.round(boxHeight * 0.3));
        ctx.fillStyle = boxFill;
        ctx.fill();
        ctx.drawImage(watermarkImage, x + padding, y + padding, wmWidth, wmHeight);
        useTextWatermark = false;
      } else {
        useTextWatermark = true;
      }
    } catch (error) {
      useTextWatermark = true;
    }
  }
  if (useTextWatermark) {
    const text = watermarkText || "MKRShift";
    const fontSize = Math.max(18, Math.round(width * 0.045));
    ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
    const metrics = ctx.measureText(text);
    const textHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || fontSize;
    const paddingX = Math.round(fontSize * 0.7);
    const paddingY = Math.round(fontSize * 0.5);
    const boxWidth = metrics.width + paddingX * 2;
    const boxHeight = textHeight + paddingY * 2;
    const x = width - margin - boxWidth;
    const y = height - margin - boxHeight;
    drawRoundedRect(ctx, x, y, boxWidth, boxHeight, Math.round(boxHeight * 0.3));
    ctx.fillStyle = boxFill;
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, x + paddingX, y + paddingY + (metrics.actualBoundingBoxAscent || fontSize));
  }
  ctx.restore();
}

function renderWatermarkPreview() {
  if (!settingsWatermarkPreview) {
    return;
  }
  const width = 420;
  const height = 240;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1a2130");
  gradient.addColorStop(1, "#0b0f16");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  const opacity = watermarkEnabled ? 1 : 0.45;
  drawWatermark(ctx, width, height, { opacity })
    .catch(() => {})
    .finally(() => {
      settingsWatermarkPreview.src = canvas.toDataURL("image/png");
    });
}

function setWatermarkCustomDataUrl(value) {
  watermarkCustomDataUrl = value;
  watermarkImageCache = { src: "", image: null };
  if (watermarkCustomDataUrl) {
    writeStoredValue(storageKeys.watermarkCustomDataUrl, watermarkCustomDataUrl);
  } else {
    removeStoredValue(storageKeys.watermarkCustomDataUrl);
  }
  if (settingsWatermarkClear) {
    settingsWatermarkClear.disabled = !watermarkCustomDataUrl;
  }
  renderWatermarkPreview();
}

function handleWatermarkFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      setWatermarkCustomDataUrl(reader.result);
      if (settingsWatermarkFileInput) {
        settingsWatermarkFileInput.value = "";
      }
    }
  };
  reader.readAsDataURL(file);
}

function clearCustomWatermark() {
  setWatermarkCustomDataUrl("");
  if (settingsWatermarkFileInput) {
    settingsWatermarkFileInput.value = "";
  }
}

async function buildWatermarkedImageUrl(imageUrl) {
  const image = await loadImageElement(imageUrl);
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  await drawWatermark(ctx, width, height, { opacity: 1 });
  return canvas.toDataURL("image/png");
}

async function resolveShareImageUrl(imageUrl) {
  if (!watermarkEnabled) {
    return imageUrl;
  }
  try {
    return await buildWatermarkedImageUrl(imageUrl);
  } catch (error) {
    return imageUrl;
  }
}

async function uploadToFreeimage() {
  if (!lastOutputUrl) {
    return;
  }
  if (!uploadEnabled) {
    return;
  }
  uploadButton.disabled = true;
  try {
    const imageUrl = await resolveShareImageUrl(lastOutputUrl);
    const data = await uploadImage(imageUrl);
    if (data.qrUrl && !hideQrEnabled) {
      qrImage.src = data.qrUrl;
      qrContainer.style.display = "flex";
    }
    statusLabel.textContent = "Upload Complete";
    statusMeta.textContent = "Scan the QR code to view the image.";
  } catch (error) {
    statusLabel.textContent = "Upload Failed";
    statusMeta.textContent = error?.message || "Unable to upload the image.";
  } finally {
    uploadButton.disabled = !uploadEnabled || !outputReady;
  }
}

async function uploadGallerySelection() {
  if (!selectedGalleryUrl) {
    return;
  }
  if (!uploadEnabled) {
    return;
  }
  galleryUploadButton.disabled = true;
  setGalleryStatus("Uploading…");
  try {
    const imageUrl = await resolveShareImageUrl(selectedGalleryUrl);
    const data = await uploadImage(imageUrl);
    if (data.qrUrl && !hideQrEnabled) {
      galleryQrImage.src = data.qrUrl;
      galleryQr.style.display = "flex";
    }
    setGalleryStatus("Upload complete.", "success");
  } catch (error) {
    setGalleryStatus(error?.message || "Upload failed.", "error");
  } finally {
    galleryUploadButton.disabled = !uploadEnabled;
  }
}

async function deleteGallerySelection() {
  if (!selectedGalleryId) {
    return;
  }
  const confirmed = window.confirm(`Are you sure you want to delete ${selectedGalleryId}?

Yes = delete permanently
No = keep capture`);
  if (!confirmed) {
    return;
  }
  if (galleryDeleteButton) {
    galleryDeleteButton.disabled = true;
  }
  setGalleryStatus("Deleting…");
  try {
    const response = await fetch(`/api/gallery?id=${encodeURIComponent(selectedGalleryId)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    setGalleryStatus("Capture deleted.", "success");
    await loadGallery();
  } catch (error) {
    setGalleryStatus(error?.message || "Delete failed.", "error");
    if (galleryDeleteButton) {
      galleryDeleteButton.disabled = !selectedGalleryId;
    }
  }
}

async function printGallerySelection() {
  if (!selectedGalleryUrl || !printerConfig.enabled || !printerConfig.name) {
    return;
  }
  if (hidePrintEnabled) {
    return;
  }
  galleryPrintButton.disabled = true;
  setGalleryStatus("Sending to printer…");
  try {
    const imageUrl = await resolveShareImageUrl(selectedGalleryUrl);
    const response = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        printerName: printerConfig.name,
        copies: printerConfig.copies,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    setGalleryStatus(`Sent to printer ${printerConfig.name}`, "success");
  } catch (error) {
    setGalleryStatus(error?.message || "Print failed.", "error");
  } finally {
    applyPrintVisibility();
  }
}

async function sendToPrinter() {
  if (!lastOutputUrl || !printerConfig.enabled || !printerConfig.name) {
    return;
  }
  printButton.disabled = true;
  try {
    const imageUrl = await resolveShareImageUrl(lastOutputUrl);
    const response = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        printerName: printerConfig.name,
        copies: printerConfig.copies,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    statusLabel.textContent = "Print Sent";
    statusMeta.textContent = `Sent to printer ${printerConfig.name}`;
  } catch (error) {
    statusLabel.textContent = "Print Failed";
    statusMeta.textContent = error?.message || "Printer not configured or unavailable.";
  } finally {
    applyPrintVisibility();
  }
}

actionButton.addEventListener("click", async () => {
  await ensureMotionPermission();
  startCountdown(selectedDelay, "tap");
});
redoButton?.addEventListener("click", async () => {
  if (!lastCapturedImageData || isQueueing || !selectedStyle) {
    return;
  }
  await queueSelfieWithImage(lastCapturedImageData, "redo");
});
debateAgreeButton?.addEventListener("click", () => voteOnDebate("agree"));
debateDisagreeButton?.addEventListener("click", () => voteOnDebate("disagree"));
debateNextButton?.addEventListener("click", nextDebatePrompt);
debateResetButton?.addEventListener("click", resetDebateState);
timerToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleTimerMenu();
});
timerOptions.forEach((option) => {
  option.addEventListener("click", (event) => {
    event.stopPropagation();
    setSelectedDelay(Number(option.dataset.delay) || 0);
    closeTimerMenu();
  });
});
document.addEventListener("click", () => {
  if (timerMenu.classList.contains("timer-menu--open")) {
    closeTimerMenu();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "m" && !isEditableTarget(event.target)) {
    toggleSystemMenus();
    return;
  }
  if (event.key !== "Escape") {
    return;
  }

  let closedOverlay = false;
  if (timerMenu.classList.contains("timer-menu--open")) {
    closeTimerMenu();
    closedOverlay = true;
  }
  if (settingsModal.classList.contains("settings-modal--open")) {
    closeSettings();
    closedOverlay = true;
  }
  if (galleryModal.classList.contains("gallery-modal--open")) {
    closeGallery();
    closedOverlay = true;
  }
  if (diagnosticsModal?.classList.contains("diagnostics-modal--open")) {
    closeDiagnostics();
    closedOverlay = true;
  }
  if (tosModal?.classList.contains("tos-modal--open")) {
    closeTos();
    closedOverlay = true;
  }
  if (remoteLaunchModal?.classList.contains("remote-launch-modal--open")) {
    closeRemoteLaunch();
    closedOverlay = true;
  }
  if (!closedOverlay) {
    idleController.show();
  }
});
function recalcDebateOffset() {
  const hud = document.querySelector(".hud");
  const height = hud ? hud.offsetHeight : 0;
  const gap = 24;
  const offsetPx = hideStatusEnabled ? 0 : height + gap;
  document.documentElement.style.setProperty("--debate-offset", `${offsetPx}px`);
}
window.addEventListener("resize", recalcDebateOffset);
settingsModal?.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    closeSettings();
  }
});
galleryModal?.addEventListener("click", (event) => {
  if (event.target === galleryModal) {
    closeGallery();
  }
});
diagnosticsModal?.addEventListener("click", (event) => {
  if (event.target === diagnosticsModal) {
    closeDiagnostics();
  }
});
tosModal?.addEventListener("click", (event) => {
  if (event.target === tosModal) {
    closeTos();
  }
});
remoteLaunchModal?.addEventListener("click", (event) => {
  if (event.target === remoteLaunchModal) {
    closeRemoteLaunch();
  }
});
tosToggle?.addEventListener("click", () => openTos());
remoteToggle?.addEventListener("click", () => {
  void openRemoteLaunch();
});
settingsToggle?.addEventListener("click", () => openSettings());
diagnosticsToggle?.addEventListener("click", () => openDiagnostics());
fullscreenToggle?.addEventListener("click", toggleFullscreen);
remoteLaunchClose?.addEventListener("click", closeRemoteLaunch);
settingsPrinterInput?.addEventListener("change", handlePrinterSelection);
settingsMirrorInput?.addEventListener("change", () => {
  cameraMirrored = settingsMirrorInput.checked;
  writeStoredValue(storageKeys.cameraMirrored, String(cameraMirrored));
  applyCameraOrientation();
});
settingsCameraInput?.addEventListener("change", async () => {
  const nextCameraId = settingsCameraInput.value || "";
  if (nextCameraId === cameraDeviceId) {
    return;
  }
  cameraDeviceId = nextCameraId;
  if (cameraDeviceId) {
    writeStoredValue(storageKeys.cameraDeviceId, cameraDeviceId);
  } else {
    removeStoredValue(storageKeys.cameraDeviceId);
  }
  await startCamera();
});
settingsWatermarkInput?.addEventListener("change", renderWatermarkPreview);
settingsWatermarkTextInput?.addEventListener("input", () => {
  watermarkText = settingsWatermarkTextInput.value.trim() || "MKRShift";
  writeStoredValue(storageKeys.watermarkText, watermarkText);
  renderWatermarkPreview();
});
settingsBrandTitleInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandAccentTextInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandNeutralTextInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandIntroBadgeTextInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandTitleColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandAccentColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandNeutralColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandButtonColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandButtonTextColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandPanelTintColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandProgressStartColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandProgressEndColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandPanelBgColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandPanelBorderColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandProfileSave?.addEventListener("click", () => {
  const profileName = String(settingsBrandProfileNameInput?.value || "").trim();
  if (!profileName) {
    return;
  }
  const existingIndex = brandProfiles.findIndex((profile) => profile.name === profileName);
  const payload = { name: profileName, values: getBrandingSnapshot() };
  if (existingIndex >= 0) {
    brandProfiles[existingIndex] = payload;
  } else {
    brandProfiles.push(payload);
  }
  persistBrandProfiles();
  renderBrandProfileOptions();
  if (settingsBrandProfileSelect) {
    settingsBrandProfileSelect.value = profileName;
  }
});
settingsBrandProfileLoad?.addEventListener("click", () => {
  const selected = settingsBrandProfileSelect?.value;
  if (!selected) {
    return;
  }
  applyBrandProfile(selected);
});
settingsBrandProfileDelete?.addEventListener("click", () => {
  const selected = settingsBrandProfileSelect?.value;
  if (!selected) {
    return;
  }
  brandProfiles = brandProfiles.filter((profile) => profile.name !== selected);
  persistBrandProfiles();
  renderBrandProfileOptions();
});
settingsBrandMenuBgColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandProgressFlowStartColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandProgressFlowEndColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandCardBgStartColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsBrandCardBgEndColorInput?.addEventListener("input", () => {
  updateBrandingFromInputs({ persist: true });
});
settingsWatermarkFileInput?.addEventListener("change", handleWatermarkFileChange);
settingsWatermarkClear?.addEventListener("click", clearCustomWatermark);
settingsSave?.addEventListener("click", async () => {
  await savePrinterConfig();
  closeSettings();
});
settingsClose?.addEventListener("click", closeSettings);
settingsResetDebateAction?.addEventListener("click", async () => {
  settingsResetDebateAction.disabled = true;
  try {
    const response = await fetch("/api/debate-stats", { method: "DELETE" });
    if (response.ok) {
      removeStoredValue(storageKeys.debateState);
      debatePromptVotes = {};
      debatePromptIndex = 0;
      debateStreak = 0;
      debateHeat = 0;
      saveDebateState();
      updateDebateUi();
      statusLabel.textContent = "Debate Results Reset";
      statusMeta.textContent = "Saved votes cleared.";
      if (settingsDebateResetStatus) {
        settingsDebateResetStatus.textContent = "Debate Spark results cleared (0 votes).";
      }
      try {
        const verify = await fetch("/api/debate-stats");
        if (verify.ok) {
          const data = await verify.json();
          if (settingsDebateResetStatus) {
            settingsDebateResetStatus.textContent = `Debate Spark results cleared (totalEvents: ${data.totalEvents}).`;
          }
        }
      } catch (_) {}
    }
  } catch (error) {
    if (settingsDebateResetStatus) {
      settingsDebateResetStatus.textContent = "Unable to reset results. Try again.";
    }
  } finally {
    settingsResetDebateAction.disabled = false;
  }
});
diagnosticsClose?.addEventListener("click", closeDiagnostics);
tosClose?.addEventListener("click", closeTos);
diagnosticsRefresh?.addEventListener("click", fetchDiagnostics);
galleryToggle?.addEventListener("click", openGallery);
galleryClose?.addEventListener("click", closeGallery);
gallerySearch?.addEventListener("input", (event) => {
  galleryFilterText = event.target.value.trim().toLowerCase();
  applyGalleryFilters();
});
gallerySort?.addEventListener("change", (event) => {
  gallerySortOrder = event.target.value;
  applyGalleryFilters();
});
galleryClear?.addEventListener("click", () => {
  galleryFilterText = "";
  if (gallerySearch) {
    gallerySearch.value = "";
    gallerySearch.focus();
  }
  if (gallerySort) {
    gallerySortOrder = "recent";
    gallerySort.value = gallerySortOrder;
  }
  applyGalleryFilters();
});
galleryRefresh?.addEventListener("click", loadGallery);
galleryDeleteButton?.addEventListener("click", deleteGallerySelection);
galleryUploadButton.addEventListener("click", uploadGallerySelection);
galleryPrintButton?.addEventListener("click", printGallerySelection);
uploadButton.addEventListener("click", uploadToFreeimage);
printButton.addEventListener("click", sendToPrinter);
doneButton.addEventListener("click", () => {
  handleDoneAction();
});
progressCloseButton.addEventListener("click", () => {
  handleDoneAction();
});
window.addEventListener("devicemotion", handleShake);
window.addEventListener("resize", applyCameraOrientation);
["pointerdown", "mousemove", "touchstart", "wheel"].forEach((eventName) => {
  window.addEventListener(eventName, (event) => {
    idleController.handleUserActivity(event);
    if (eventName === "pointerdown" || eventName === "touchstart") {
      void ensureBackgroundMusic();
    }
  }, { passive: true });
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    return;
  }
  idleController.handleUserActivity();
  void ensureBackgroundMusic();
});
idleOverlay?.addEventListener("click", (event) => {
  if (idleOverlay.classList.contains("idle-overlay--hidden")) {
    return;
  }
  idleController.hide();
  requestAnimationFrame(() => {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (target && target !== idleOverlay) {
      target.click();
    }
  });
});

loadUiPreferences();
void ensureAudioListsLoaded();
applyCameraOrientation();
refreshCaptureSelectionUi();
startCamera();
loadStyles();
loadPrinterConfig();
updateTimerLabel();
updateActionButtonState();
progressCloseButton.disabled = true;
connectRemoteSocket();
idleController.loadImages();
idleController.schedule();
applyDebateSparkVisibility();
applyStatusVisibility();
setInterval(coolDebateHeat, 12000);

async function initializeDebateSpark() {
  await loadDebatePrompts();
  loadDebateState();
}

void initializeDebateSpark();

function handleDoneAction() {
  if (isQueueing) {
    return;
  }
  setBusy(false);
  statusLabel.textContent = "Ready";
  statusMeta.textContent = "Choose a style, then tap shutter or shake to shoot";
}
