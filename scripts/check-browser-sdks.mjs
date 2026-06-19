#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const typescriptPackages = [
  "sdks/sdkwork-browser-app-sdk/sdkwork-browser-app-sdk-typescript/generated/server-openapi",
  "sdks/sdkwork-browser-backend-sdk/sdkwork-browser-backend-sdk-typescript/generated/server-openapi",
];

for (const relativePath of typescriptPackages) {
  const projectDir = path.join(root, relativePath);
  if (!existsSync(projectDir)) {
    console.error(`missing generated SDK package: ${relativePath}`);
    process.exit(1);
  }

  const build = spawnSync("pnpm", ["run", "build"], {
    cwd: projectDir,
    stdio: "inherit",
    shell: true,
  });
  if ((build.status ?? 1) !== 0) {
    process.exit(build.status ?? 1);
  }

  // Mirror publish-core TypeScript --action check without isolated npm install
  // (workspace pnpm install already links @sdkwork/sdk-common and rollup).
  const pack = spawnSync("npm", ["pack", "--dry-run"], {
    cwd: projectDir,
    stdio: "inherit",
    shell: true,
  });
  if ((pack.status ?? 1) !== 0) {
    process.exit(pack.status ?? 1);
  }
}

console.log("browser SDK build and pack checks passed");
