import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDesktopHostBinaryPath,
  killWindowsProcessTree,
  releaseWindowsDesktopHostLock,
  releaseWindowsDesktopViteLock,
  releaseWindowsStaleCargoLock,
} from "./windows-desktop-dev-locks.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(desktopDir, "../../../..");
const baseConfigPath = path.join(desktopDir, "src-tauri", "tauri.conf.json");

export const DEFAULT_DEV_PORT = 1620;
const devHost = "127.0.0.1";

export function resolveStartPort(env = process.env, devUrl = null) {
  const fromEnv = Number(env.SDKWORK_BROWSER_PC_DEV_PORT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }

  if (typeof devUrl === "string" && devUrl.trim().length > 0) {
    try {
      const parsed = Number.parseInt(new URL(devUrl).port, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }

  return DEFAULT_DEV_PORT;
}

export function isPortAvailable(port, host = devHost) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

export async function findAvailablePort(startPort, maxAttempts = 32) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to find an available dev port starting from ${startPort}.`);
}

export function createTauriDevConfig(baseConfig, port) {
  const devUrl = `http://${devHost}:${port}`;
  return {
    ...baseConfig,
    build: {
      ...baseConfig.build,
      devUrl,
    },
  };
}

function resolveTauriCliEntrypoint() {
  const requireFrom = createRequire(path.join(desktopDir, "package.json"));
  return requireFrom.resolve("@tauri-apps/cli/tauri.js");
}

function releaseDesktopLocksSafely(port) {
  try {
    releaseWindowsStaleCargoLock(workspaceRoot);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
  }

  try {
    releaseWindowsDesktopHostLock(createDesktopHostBinaryPath(workspaceRoot, "debug"), undefined, workspaceRoot);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
  }

  try {
    releaseWindowsDesktopViteLock(path.join(workspaceRoot, "apps", "sdkwork-browser-pc"), port, undefined, workspaceRoot);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
  }
}

async function run() {
  const baseConfig = JSON.parse(fs.readFileSync(baseConfigPath, "utf8"));
  const startPort = resolveStartPort(process.env, baseConfig.build?.devUrl);
  releaseDesktopLocksSafely(startPort);
  const port = await findAvailablePort(startPort);

  if (port !== startPort) {
    console.log(`[sdkwork-browser-pc] port ${startPort} is busy, using ${port}`);
    releaseDesktopLocksSafely(port);
  }

  const cacheDir = path.join(desktopDir, "node_modules", ".cache", "sdkwork-browser-pc-desktop");
  fs.mkdirSync(cacheDir, { recursive: true });
  const configPath = path.join(cacheDir, `tauri.dev.${port}.${process.pid}.json`);
  fs.writeFileSync(configPath, JSON.stringify(createTauriDevConfig(baseConfig, port), null, 2));

  const devUrl = `http://${devHost}:${port}`;
  console.log(`[sdkwork-browser-pc] desktop dev url ${devUrl}`);

  const childEnv = {
    ...process.env,
    SDKWORK_BROWSER_PC_DEV_PORT: String(port),
  };

  const cliEntrypoint = resolveTauriCliEntrypoint();
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    fs.rmSync(configPath, { force: true });
    releaseDesktopLocksSafely(port);
  };

  const child = spawn(process.execPath, [cliEntrypoint, "dev", "--config", configPath], {
    cwd: desktopDir,
    stdio: "inherit",
    shell: false,
    env: childEnv,
  });

  const terminateChild = (signal) => {
    cleanup();
    if (child.killed) {
      return;
    }

    if (process.platform === "win32" && typeof child.pid === "number") {
      try {
        killWindowsProcessTree(child.pid);
        return;
      } catch (error) {
        console.warn(error instanceof Error ? error.message : String(error));
      }
    }

    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => terminateChild("SIGINT"));
  process.on("SIGTERM", () => terminateChild("SIGTERM"));
  process.on("SIGBREAK", () => terminateChild("SIGTERM"));

  child.on("error", (error) => {
    cleanup();
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    cleanup();

    if (signal) {
      console.error(`tauri dev exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
