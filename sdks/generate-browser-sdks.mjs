#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

const families = [
  "sdks/sdkwork-browser-app-sdk/bin/generate-sdk.mjs",
  "sdks/sdkwork-browser-backend-sdk/bin/generate-sdk.mjs",
];

for (const familyScript of families) {
  const scriptPath = path.resolve(workspaceRoot, familyScript);
  const result = spawnSync("node", [scriptPath], { cwd: workspaceRoot, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Browser SDK families generated (typescript, rust, java, python).");
