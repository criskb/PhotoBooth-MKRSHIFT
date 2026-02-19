import crypto from "node:crypto";
import { loadWorkflowJson } from "./workflowLoader.js";

const HOSTED_MIN_REQUIRED_CREDITS = 2500;
const HOSTED_ACCELERATOR = "L4";

function applyPromptOverrides(workflow, stylePrompt, inputImage) {
  if (!stylePrompt) {
    const updated = JSON.parse(JSON.stringify(workflow));
    Object.values(updated).forEach((node) => {
      const classType = node.class_type ?? "";
      const inputs = node.inputs ?? {};
      if (classType === "LoadImage" && inputImage) {
        inputs.image = inputImage;
        if (!inputs.upload) {
          inputs.upload = "image";
        }
      }
      if (classType === "SaveImage" && !inputs.filename_prefix) {
        inputs.filename_prefix = "output";
      }
      node.inputs = inputs;
    });
    return updated;
  }
  const updated = JSON.parse(JSON.stringify(workflow));
  Object.values(updated).forEach((node) => {
    const classType = node.class_type ?? "";
    const inputs = node.inputs ?? {};
    const normalized = classType.toLowerCase().replace(/\s/g, "");
    if (["textmultiline", "textmultilinewidget", "textmultilineprompt"].includes(normalized)) {
      inputs.text = stylePrompt;
    }
    if (classType === "LoadImage" && inputImage) {
      inputs.image = inputImage;
      if (!inputs.upload) {
        inputs.upload = "image";
      }
    }
    if (classType === "SaveImage" && !inputs.filename_prefix) {
      inputs.filename_prefix = "output";
    }
    node.inputs = inputs;
  });
  return updated;
}

function assertApiWorkflowShape(workflowJson, styleName) {
  if (workflowJson && typeof workflowJson === "object" && Array.isArray(workflowJson.nodes)) {
    throw new Error(
      `Workflow "${styleName}" appears to be UI graph JSON (has nodes/links). Export ComfyUI API JSON and save it as workflows/${styleName}.json.`
    );
  }
}

function extractWorkflowPrompt(workflowJson) {
  if (!workflowJson || typeof workflowJson !== "object" || Array.isArray(workflowJson)) {
    return {};
  }
  if (workflowJson.prompt && typeof workflowJson.prompt === "object" && !Array.isArray(workflowJson.prompt)) {
    return workflowJson.prompt;
  }
  return workflowJson;
}


function randomSeedValue() {
  return Math.floor(Math.random() * 1125899906842624);
}

function applyRandomSeeds(workflowPrompt) {
  if (!workflowPrompt || typeof workflowPrompt !== "object") {
    return workflowPrompt;
  }
  const shouldRandomizeSeedInput = (key) => /(^|[_-])seed$/i.test(String(key ?? ""));
  const isSeedLikeValue = (value) => {
    if (Number.isFinite(Number(value))) {
      return true;
    }
    if (typeof value !== "string") {
      return false;
    }
    const trimmed = value.trim().toLowerCase();
    return trimmed === "randomize" || /^\d+$/.test(trimmed);
  };
  Object.values(workflowPrompt).forEach((node) => {
    const inputs = node?.inputs;
    if (!inputs || typeof inputs !== "object") {
      return;
    }
    Object.keys(inputs).forEach((key) => {
      if (!shouldRandomizeSeedInput(key)) {
        return;
      }
      if (!isSeedLikeValue(inputs[key])) {
        return;
      }
      inputs[key] = randomSeedValue();
    });
  });
  return workflowPrompt;
}

function normalizeComfyBaseUrl(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.hostname.toLowerCase() === "comfy.icu" && (url.pathname === "/" || url.pathname === "")) {
      url.pathname = "/api/v1/workflows/";
    }
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    return trimmed.replace(/\/$/, "");
  }
}

function buildComfyHeaders(apiKey) {
  if (!apiKey) {
    return {};
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
  };
}

function isHostedWorkflowApiUrl(serverUrl) {
  try {
    const url = new URL(serverUrl);
    return /\/api\/v1\/workflows(\/|$)/i.test(url.pathname) || url.hostname.toLowerCase() === "comfy.icu";
  } catch (error) {
    return false;
  }
}

function extractHostedWorkflowId(serverUrl) {
  try {
    const url = new URL(serverUrl);
    const match = url.pathname.match(/\/api\/v1\/workflows\/([^/]+)\/?$/i);
    return match?.[1] ?? null;
  } catch (error) {
    return null;
  }
}

function isRemoteServerUrl(serverUrl) {
  try {
    const url = new URL(serverUrl);
    const host = url.hostname;
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch (error) {
    return false;
  }
}

function extractNumericFromObject(payload, keyMatcher) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  for (const [key, value] of Object.entries(payload)) {
    if (keyMatcher.test(String(key))) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
    if (value && typeof value === "object") {
      const nested = extractNumericFromObject(value, keyMatcher);
      if (Number.isFinite(nested)) {
        return nested;
      }
    }
  }
  return null;
}

async function fetchHostedCreditBalance({ serverUrl, apiKey }) {
  let origin = "";
  try {
    origin = new URL(serverUrl).origin;
  } catch (error) {
    return null;
  }
  if (!origin) {
    return null;
  }
  const candidates = [
    `${origin}/api/v1/me`,
    `${origin}/api/v1/account`,
    `${origin}/api/v1/user`,
    `${origin}/api/v1/credits`,
  ];
  for (const target of candidates) {
    try {
      const response = await fetch(target, {
        headers: {
          accept: "application/json",
          ...buildComfyHeaders(apiKey),
        },
      });
      if (!response.ok) {
        continue;
      }
      const payload = await response.json().catch(() => null);
      if (!payload || typeof payload !== "object") {
        continue;
      }
      const remaining =
        extractNumericFromObject(payload, /remaining.*(credit|token)|credit.*remaining|token.*remaining/i) ??
        extractNumericFromObject(payload, /credit|token|balance/i);
      if (Number.isFinite(remaining)) {
        return remaining;
      }
    } catch (error) {
      // ignore and continue probing compatible endpoints
    }
  }
  return null;
}

async function uploadInputImage({ serverUrl, apiKey, buffer, fileName }) {
  const normalizedServerUrl = normalizeComfyBaseUrl(serverUrl);
  const formData = new FormData();
  formData.append("image", new Blob([buffer], { type: "image/png" }), fileName);
  formData.append("type", "input");
  const response = await fetch(`${normalizedServerUrl}/upload/image`, {
    method: "POST",
    headers: buildComfyHeaders(apiKey),
    body: formData,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`ComfyUI upload error: ${response.status} ${message}`);
  }
  const result = await response.json();
  return (
    result?.name ??
    result?.filename ??
    result?.data?.name ??
    result?.data?.filename ??
    fileName
  );
}

async function uploadHostedInputImage({ serverUrl, apiKey, buffer, fileName }) {
  let origin = "";
  try {
    origin = new URL(serverUrl).origin;
  } catch (error) {
    origin = "";
  }
  const base = serverUrl.replace(/\/$/, "");
  const targets = [
    `${base}/upload/image`,
    origin ? `${origin}/api/v1/files/upload` : null,
    origin ? `${origin}/api/v1/upload/image` : null,
    origin ? `${origin}/upload/image` : null,
  ].filter(Boolean);

  let lastError = null;
  for (const target of targets) {
    const formData = new FormData();
    formData.append("image", new Blob([buffer], { type: "image/png" }), fileName);
    formData.append("file", new Blob([buffer], { type: "image/png" }), fileName);
    formData.append("type", "input");
    formData.append("folder", "input");
    const response = await fetch(target, {
      method: "POST",
      headers: buildComfyHeaders(apiKey),
      body: formData,
    });
    if (response.ok) {
      let result = null;
      try {
        result = await response.json();
      } catch (error) {
        result = null;
      }
      const ref =
        result?.name ??
        result?.filename ??
        result?.file?.name ??
        result?.file_name ??
        result?.url ??
        result?.data?.name ??
        result?.data?.filename ??
        result?.data?.url;
      if (ref) {
        return ref;
      }
      return fileName;
    }
    const message = await response.text().catch(() => "");
    lastError = `POST ${target} -> ${response.status} ${message}`;
  }
  throw new Error(`Hosted upload failed. ${lastError ?? "No supported upload endpoint found."}`);
}

export async function sendWorkflow({
  workflowDir,
  styleName,
  stylePrompt,
  inputImagePath,
  inputImageBuffer,
  inputImageUrl,
  serverUrl,
  clientId,
  promptId,
  apiKey,
}) {
  const normalizedServerUrl = normalizeComfyBaseUrl(serverUrl);
  const hostedWorkflowApi = isHostedWorkflowApiUrl(normalizedServerUrl);
  const workflow = loadWorkflowJson(workflowDir, styleName);
  assertApiWorkflowShape(workflow, styleName);
  const hostedWorkflowId = hostedWorkflowApi ? extractHostedWorkflowId(normalizedServerUrl) : null;
  if (hostedWorkflowApi && !hostedWorkflowId) {
    throw new Error(
      "Hosted Comfy workflow ID is missing. Use a workflow URL like https://comfy.icu/api/v1/workflows/<id> (or configure collection URL mode so style names map to hosted workflow names)."
    );
  }
  let inputImage = inputImagePath;
  let inputFiles = null;
  if (inputImageBuffer && isRemoteServerUrl(normalizedServerUrl)) {
    if (hostedWorkflowApi) {
      if (inputImageUrl) {
        inputImage = "photobooth-input.png";
        inputFiles = {
          "/input/photobooth-input.png": inputImageUrl,
        };
      } else {
        throw new Error(
          "Hosted input URL is unavailable. Configure FREEIMAGE_HOST_KEY or set PHOTOBOOTH_PUBLIC_BASE_URL/PUBLIC_BASE_URL to a public tunnel URL so Comfy.ICU can download the capture."
        );
      }
    } else {
      const uploadName = await uploadInputImage({
        serverUrl: normalizedServerUrl,
        apiKey,
        buffer: inputImageBuffer,
        fileName: "photobooth-input.png",
      });
      inputImage = uploadName;
    }
  }
  const prompt = applyRandomSeeds(
    applyPromptOverrides(extractWorkflowPrompt(workflow), stylePrompt, inputImage)
  );
  if (hostedWorkflowApi && (!prompt || typeof prompt !== "object" || Object.keys(prompt).length === 0)) {
    throw new Error(
      `Hosted Comfy prompt is empty for style "${styleName}". Ensure workflows/${styleName}.json contains ComfyUI API JSON.`
    );
  }
  const resolvedClientId = clientId ?? crypto.randomUUID();
  const resolvedPromptId = promptId ?? crypto.randomUUID();

  const endpointCandidates = hostedWorkflowApi ? ["/runs"] : ["/prompt"];
  const accelerator = HOSTED_ACCELERATOR;
  const requestPayload = hostedWorkflowApi
    ? {
        workflow_id: hostedWorkflowId,
        prompt,
        ...(accelerator ? { accelerator } : {}),
        ...(inputFiles ? { files: inputFiles } : {}),
      }
    : {
        prompt,
        client_id: resolvedClientId,
        prompt_id: resolvedPromptId,
      };
  if (hostedWorkflowApi) {
    const remainingCredits = await fetchHostedCreditBalance({
      serverUrl: normalizedServerUrl,
      apiKey,
    });
    if (Number.isFinite(remainingCredits) && remainingCredits < HOSTED_MIN_REQUIRED_CREDITS) {
      throw new Error(
        `Hosted credits/tokens are below minimum (${remainingCredits} < ${HOSTED_MIN_REQUIRED_CREDITS}). Refusing to queue run to avoid overdraft.`
      );
    }
  }
  let result = null;
  let lastError = null;
  let retriedAfterHostedUpload = false;
  for (let index = 0; index < endpointCandidates.length; index += 1) {
    const suffix = endpointCandidates[index];
    const endpoint = suffix ? `${normalizedServerUrl}${suffix}` : normalizedServerUrl;
    const requestBody = JSON.stringify(requestPayload);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        ...buildComfyHeaders(apiKey),
      },
      body: requestBody,
    });
    if (response.ok) {
      result = await response.json();
      break;
    }
    const message = await response.text();
    if (
      hostedWorkflowApi &&
      response.status === 413 &&
      !retriedAfterHostedUpload &&
      inputImageBuffer
    ) {
      lastError = `POST ${endpoint} -> ${response.status} ${message}`;
      break;
    }
    lastError = `POST ${endpoint} -> ${response.status} ${message}`;
    if (/insufficient|credit|token|quota|payment|required/i.test(message)) {
      lastError = `${lastError}. Hosted balance appears exhausted; run was refused.`;
      break;
    }
    if (response.status !== 404 && response.status !== 405) {
      break;
    }
  }
  if (!result) {
    throw new Error(`Comfy API queue failed. ${lastError ?? "No compatible queue endpoint found."}`);
  }
  return {
    ...result,
    prompt_id:
      result?.prompt_id ??
      result?.id ??
      result?.run_id ??
      result?.job_id ??
      result?.data?.id ??
      result?.data?.run_id ??
      resolvedPromptId,
    hostedWorkflowApi,
  };
}
