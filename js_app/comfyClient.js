import crypto from "node:crypto";
import { loadWorkflowJson } from "./workflowLoader.js";

function applyPromptOverrides(workflow, stylePrompt, inputImage) {
  if (!stylePrompt) {
    const updated = JSON.parse(JSON.stringify(workflow));
    Object.values(updated).forEach((node) => {
      const classType = node.class_type ?? "";
      const inputs = node.inputs ?? {};
      if (classType === "LoadImage" && inputImage) {
        inputs.image = inputImage;
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
    }
    if (classType === "SaveImage" && !inputs.filename_prefix) {
      inputs.filename_prefix = "output";
    }
    node.inputs = inputs;
  });
  return updated;
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

function isRemoteServerUrl(serverUrl) {
  try {
    const url = new URL(serverUrl);
    const host = url.hostname;
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch (error) {
    return false;
  }
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

export async function sendWorkflow({
  workflowDir,
  styleName,
  stylePrompt,
  inputImagePath,
  inputImageBuffer,
  serverUrl,
  clientId,
  promptId,
  apiKey,
}) {
  const normalizedServerUrl = normalizeComfyBaseUrl(serverUrl);
  const workflow = loadWorkflowJson(workflowDir, styleName);
  let inputImage = inputImagePath;
  if (inputImageBuffer && isRemoteServerUrl(normalizedServerUrl)) {
    const uploadName = await uploadInputImage({
      serverUrl: normalizedServerUrl,
      apiKey,
      buffer: inputImageBuffer,
      fileName: "photobooth-input.png",
    });
    inputImage = uploadName;
  }
  const payload = applyPromptOverrides(workflow, stylePrompt, inputImage);
  const resolvedClientId = clientId ?? crypto.randomUUID();
  const resolvedPromptId = promptId ?? crypto.randomUUID();

  const response = await fetch(`${normalizedServerUrl}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildComfyHeaders(apiKey),
    },
    body: JSON.stringify({
      prompt: payload,
      client_id: resolvedClientId,
      prompt_id: resolvedPromptId,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`ComfyUI error: ${response.status} ${message}`);
  }

  const result = await response.json();
  return {
    ...result,
    prompt_id: result?.prompt_id ?? resolvedPromptId,
  };
}
