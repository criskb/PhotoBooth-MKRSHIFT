export function toTitleCase(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getOrientationDegrees(value) {
  const orientation = Number(value) || 0;
  if (orientation === 270) {
    return -90;
  }
  return orientation;
}

export function normalizeComfyInput(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "";
  }
  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    return withProtocol;
  }
}

export function isHostedComfyUrl(value) {
  const normalized = normalizeComfyInput(value);
  if (!normalized) {
    return false;
  }
  try {
    const url = new URL(normalized);
    return (
      url.hostname.toLowerCase() === "comfy.icu" ||
      /\/api\/v1\/workflows(\/|$)/i.test(url.pathname)
    );
  } catch (error) {
    return /comfy\.icu|\/api\/v1\/workflows/i.test(String(value || ""));
  }
}

export function hasUsableOutputUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
    return false;
  }
  return true;
}

export function formatUptime(seconds) {
  const totalSeconds = Number(seconds) || 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

export function toPrinterEntry(entry) {
  if (!entry) {
    return null;
  }
  if (typeof entry === "string") {
    const name = entry.trim();
    if (!name) {
      return null;
    }
    return { name, isDefault: false };
  }
  if (typeof entry === "object") {
    const rawName =
      entry.name ??
      entry.printerName ??
      entry.deviceName ??
      entry.id ??
      entry.value ??
      entry.label;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) {
      return null;
    }
    const isDefault =
      entry.isDefault === true ||
      entry.default === true ||
      entry.is_default === true ||
      entry.systemDefault === true;
    return { name, isDefault };
  }
  return null;
}
