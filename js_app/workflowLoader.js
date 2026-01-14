import fs from "node:fs";
import path from "node:path";

export function loadWorkflowStyles(workflowDir) {
  if (!fs.existsSync(workflowDir)) {
    return [];
  }

  return fs
    .readdirSync(workflowDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.basename(file, ".json"))
    .filter((name) => !name.startsWith("default") && !name.includes("_save"))
    .sort();
}

export function loadWorkflowJson(workflowDir, styleName) {
  const target = path.join(workflowDir, `${styleName}.json`);
  const fallback = path.join(workflowDir, "default.json");
  const candidate = fs.existsSync(target) ? target : fallback;
  if (!fs.existsSync(candidate)) {
    throw new Error(`Missing workflow JSON for style ${styleName}`);
  }
  return JSON.parse(fs.readFileSync(candidate, "utf-8"));
}
