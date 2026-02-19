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
  Object.values(workflowPrompt).forEach((node) => {
    const inputs = node?.inputs;
    if (!inputs || typeof inputs !== "object") {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(inputs, "seed") && Number.isFinite(Number(inputs.seed))) {
      inputs.seed = randomSeedValue();
    }
    if (Object.prototype.hasOwnProperty.call(inputs, "noise_seed") && Number.isFinite(Number(inputs.noise_seed))) {
      inputs.noise_seed = randomSeedValue();
    }
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
        inputImage = await uploadHostedInputImage({
          serverUrl: normalizedServerUrl,
          apiKey,
          buffer: inputImageBuffer,
          fileName: "photobooth-input.png",
        });
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
  const requestedAccelerator = "L4";
  const requestPayload = hostedWorkflowApi
    ? {
        workflow_id: hostedWorkflowId,
        prompt,
        ...(requestedAccelerator ? { accelerator: requestedAccelerator } : {}),
        ...(inputFiles ? { files: inputFiles } : {}),
      }
    : {
        prompt,
        client_id: resolvedClientId,
        prompt_id: resolvedPromptId,
      };
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
      const uploadedRef = await uploadHostedInputImage({
        serverUrl: normalizedServerUrl,
        apiKey,
        buffer: inputImageBuffer,
        fileName: "photobooth-input.png",
      });
      const promptWithUpload = applyRandomSeeds(
        applyPromptOverrides(extractWorkflowPrompt(workflow), stylePrompt, uploadedRef)
      );
      requestPayload.prompt = promptWithUpload;
      retriedAfterHostedUpload = true;
      index -= 1;
      continue;
    }
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
