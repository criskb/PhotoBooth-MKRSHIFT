export const storageKeys = {
  selectedDelay: "selectedDelay",
  selectedStyle: "selectedStyle",
  printerConfig: "printerConfig",
  freeimageApiKey: "freeimageApiKey",
  comfyApiKey: "comfyApiKey",
  comfyServerUrl: "comfyServerUrl",
  comfyMinCredits: "comfyMinCredits",
  comfyAccelerator: "comfyAccelerator",
  cameraOrientation: "cameraOrientation",
  cameraMirrored: "cameraMirrored",
  cameraDeviceId: "cameraDeviceId",
  watermarkEnabled: "watermarkEnabled",
  watermarkCustomDataUrl: "watermarkCustomDataUrl",
  watermarkText: "watermarkText",
  uploadEnabled: "uploadEnabled",
  hidePrintEnabled: "hidePrintEnabled",
  hideQrEnabled: "hideQrEnabled",
  remoteResultEnabled: "remoteResultEnabled",
  remoteCameraCaptureEnabled: "remoteCameraCaptureEnabled",
  soundEffectsEnabled: "soundEffectsEnabled",
  backgroundMusicEnabled: "backgroundMusicEnabled",
};

function getStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

export function readStoredValue(key) {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  return storage.getItem(key);
}

export function writeStoredValue(key, value) {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(key, String(value));
}

export function removeStoredValue(key) {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(key);
}

export function readStoredJson(key, fallback = null) {
  const raw = readStoredValue(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export function writeStoredJson(key, value) {
  writeStoredValue(key, JSON.stringify(value));
}
