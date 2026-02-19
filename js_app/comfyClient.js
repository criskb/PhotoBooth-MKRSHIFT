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
  const hostedWorkflowApi = isHostedWorkflowApiUrl(normalizedServerUrl);
  const workflow = loadWorkflowJson(workflowDir, styleName);
  let inputImage = inputImagePath;
  if (inputImageBuffer && isRemoteServerUrl(normalizedServerUrl)) {
    if (hostedWorkflowApi) {
      inputImage = `data:image/png;base64,${Buffer.from(inputImageBuffer).toString("base64")}`;
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
  const payload = applyPromptOverrides(workflow, stylePrompt, inputImage);
  const resolvedClientId = clientId ?? crypto.randomUUID();
  const resolvedPromptId = promptId ?? crypto.randomUUID();

  const endpointCandidates = hostedWorkflowApi
    ? ["/runs", "/run", "/prompt", ""]
    : ["/prompt"];
  const requestPayload = {
    prompt: payload,
    workflow: payload,
    client_id: resolvedClientId,
    prompt_id: resolvedPromptId,
    inputs: {
      image: inputImage,
    },
  };
  let result = null;
  let lastError = null;
  for (const suffix of endpointCandidates) {
    const endpoint = suffix ? `${normalizedServerUrl}${suffix}` : normalizedServerUrl;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildComfyHeaders(apiKey),
      },
      body: JSON.stringify(requestPayload),
    });
    if (response.ok) {
      result = await response.json();
      break;
    }
    const message = await response.text();
    lastError = `POST ${endpoint} -> ${response.status} ${message}`;
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
