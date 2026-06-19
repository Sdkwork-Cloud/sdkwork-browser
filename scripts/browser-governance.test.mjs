import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

const requiredPaths = [
  "AGENTS.md",
  "sdkwork.workflow.json",
  "sdkwork.app.config.json",
  ".github/workflows/package.yml",
  "deployments/README.md",
  "specs/component.spec.json",
  "specs/README.md",
  "tests/README.md",
  "docs/adr/ADR-002-browser-engine-standard.md",
  "docs/adr/ADR-003-browser-rpc-discovery-deferred.md",
  "configs/profiles/browser.default.yaml",
  "apis/app-api/platform/openapi.yaml",
  "apis/backend-api/platform/openapi.yaml",
  "crates/sdkwork-browser-engine-api-service/Cargo.toml",
  "crates/sdkwork-browser-storage-sqlx-rust/Cargo.toml",
  "crates/sdkwork-browser-shared-service/Cargo.toml",
  "crates/sdkwork-router-browser-app-api/Cargo.toml",
  "crates/sdkwork-routes-browser-app-api/Cargo.toml",
  "crates/sdkwork-router-browser-backend-api/Cargo.toml",
  "sdks/_route-manifests/app-api/sdkwork-routes-browser-app-api.route-manifest.json",
  "sdks/_route-manifests/backend-api/sdkwork-routes-browser-backend-api.route-manifest.json",
  "apps/sdkwork-browser-pc/sdkwork.app.config.json",
];

for (const rel of requiredPaths) {
  assert.ok(existsSync(join(root, rel)), `missing required path: ${rel}`);
}

const cargoToml = readFileSync(join(root, "Cargo.toml"), "utf8");
for (const dep of [
  "sdkwork-database-config",
  "sdkwork-web-core",
  "sdkwork-utils-rust",
]) {
  assert.match(cargoToml, new RegExp(dep), `Cargo.toml must declare ${dep}`);
}
assert.doesNotMatch(cargoToml, /sdkwork-discovery/, "discovery must remain deferred");

const storageToml = readFileSync(
  join(root, "crates/sdkwork-browser-storage-sqlx-rust/Cargo.toml"),
  "utf8",
);
assert.match(storageToml, /sdkwork-database-sqlx/);

const appRouteToml = readFileSync(
  join(root, "crates/sdkwork-routes-browser-app-api/Cargo.toml"),
  "utf8",
);
assert.match(appRouteToml, /sdkwork-web-core/);

const workflow = JSON.parse(readFileSync(join(root, "sdkwork.workflow.json"), "utf8"));
const workflowDeps = workflow.dependencies.map((entry) => entry.id);
for (const dep of ["sdkwork-database", "sdkwork-web-framework", "sdkwork-utils"]) {
  assert.ok(workflowDeps.includes(dep), `sdkwork.workflow.json must declare ${dep}`);
}
assert.ok(!workflowDeps.includes("sdkwork-discovery"), "discovery must not be in workflow yet");

const rootManifest = JSON.parse(readFileSync(join(root, "sdkwork.app.config.json"), "utf8"));
assert.equal(rootManifest.schemaVersion, 3);
assert.equal(rootManifest.app.key, "sdkwork-browser");

const pcManifest = JSON.parse(
  readFileSync(join(root, "apps/sdkwork-browser-pc/sdkwork.app.config.json"), "utf8"),
);
assert.equal(pcManifest.schemaVersion, 3);
assert.equal(pcManifest.app.key, "sdkwork-browser-pc");

const cratesDir = join(root, "crates");
for (const entry of readdirSync(cratesDir)) {
  const crateDir = join(cratesDir, entry);
  if (!statSync(crateDir).isDirectory()) continue;
  assert.ok(
    existsSync(join(crateDir, "specs/component.spec.json")),
    `missing component spec for crate: ${entry}`,
  );
}

console.log("browser governance checks passed");
