#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LANGUAGES = (process.env.SDKWORK_BROWSER_SDK_LANGUAGES ?? "typescript,rust,java,python")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const PACKAGE_NAMES = {
  typescript: "@sdkwork/browser-app-sdk",
  rust: "sdkwork-browser-app-sdk",
  java: "com.sdkwork:sdkwork-browser-app-sdk",
  python: "sdkwork-browser-app-sdk",
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(sdkRoot, "../..");
const generatorBin = path.resolve(workspaceRoot, "../sdkwork-sdk-generator/bin/sdkgen.js");
const defaultInput = path.resolve(
  workspaceRoot,
  "apis/app-api/platform/openapi.yaml",
);

run(process.argv.slice(2));

function run(argv) {
  const args = parseArgs(argv);
  const input = args.input ? resolveWorkspacePath(args.input) : defaultInput;
  ensureOpenApi(input);

  if (!existsSync(generatorBin)) {
    fail(`SDK generator not found: ${generatorBin}`);
  }

  for (const language of args.languages) {
    generateLanguage({
      language,
      input,
      baseUrl: args.baseUrl,
      sdkName: "sdkwork-browser-app-sdk",
      sdkType: "app",
      apiPrefix: "/app/v3/api",
    });
  }
}

function generateLanguage({ language, input, baseUrl, sdkName, sdkType, apiPrefix }) {
  const outputPath = path.join(sdkRoot, `${sdkName}-${language}`, "generated", "server-openapi");
  mkdirSync(outputPath, { recursive: true });

  const commandArgs = [
    "generate",
    "--input",
    input,
    "--output",
    outputPath,
    "--name",
    sdkName,
    "--type",
    sdkType,
    "--language",
    language,
    "--base-url",
    baseUrl,
    "--api-prefix",
    apiPrefix,
    "--fixed-sdk-version",
    "0.1.0",
    "--sdk-root",
    sdkRoot,
    "--sdk-name",
    sdkName,
    "--package-name",
    PACKAGE_NAMES[language] ?? `${sdkName}-${language}`,
    "--standard-profile",
    "sdkwork-v3",
  ];

  if (language === "java") {
    commandArgs.push("--namespace", "com.sdkwork.browser.app.sdk");
  }

  const result = spawnSync("node", [generatorBin, ...commandArgs], {
    cwd: sdkRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    fail(`generator failed for ${language}`);
  }

  writeFileSync(
    path.join(outputPath, "source-openapi.json"),
    `${JSON.stringify(JSON.parse(readFileSync(input, "utf8")), null, 2)}\n`,
    "utf8",
  );
  console.log(`Generated ${sdkName} (${language})`);
}

function ensureOpenApi(input) {
  if (existsSync(input)) {
    return;
  }
  const materialize = path.resolve(workspaceRoot, "sdks/materialize-browser-v3-openapi-boundaries.mjs");
  const result = spawnSync("node", [materialize], { cwd: workspaceRoot, stdio: "inherit" });
  if (result.status !== 0 || !existsSync(input)) {
    fail(`OpenAPI input not found: ${input}`);
  }
}

function parseArgs(argv) {
  const parsed = {
    input: null,
    languages: [...LANGUAGES],
    baseUrl: "http://localhost:8080",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      parsed.input = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--languages") {
      parsed.languages = (argv[index + 1] ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (arg === "--base-url") {
      parsed.baseUrl = argv[index + 1] ?? parsed.baseUrl;
      index += 1;
    }
  }

  return parsed;
}

function resolveWorkspacePath(value) {
  return path.isAbsolute(value) ? value : path.resolve(workspaceRoot, value);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
