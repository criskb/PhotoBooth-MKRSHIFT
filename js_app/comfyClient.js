import crypto from "node:crypto";
import { loadWorkflowJson } from "./workflowLoader.js";

function applyPromptOverrides(workflow, stylePrompt) {
  if (!stylePrompt) {
    return workflow;
  }
  const updated = JSON.parse(JSON.stringify(workflow));
  Object.values(updated).forEach((node) => {
    const classType = node.class_type ?? "";
    const inputs = node.inputs ?? {};
    const normalized = classType.toLowerCase().replace(/\s/g, "");
    if (["textmultiline", "textmultilinewidget", "textmultilineprompt"].includes(normalized)) {
      inputs.text = stylePrompt;
    }
    node.inputs = inputs;
  });
  return updated;
}

export async function sendWorkflow({
  workflowDir,
  styleName,
  stylePrompt,
  inputImagePath,
  serverUrl,
}) {
  const workflow = loadWorkflowJson(workflowDir, styleName);
  const payload = applyPromptOverrides(workflow, stylePrompt);
  const clientId = crypto.randomUUID();

  const response = await fetch(`${serverUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: payload, client_id: clientId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`ComfyUI error: ${response.status} ${message}`);
  }

  return response.json();
}
