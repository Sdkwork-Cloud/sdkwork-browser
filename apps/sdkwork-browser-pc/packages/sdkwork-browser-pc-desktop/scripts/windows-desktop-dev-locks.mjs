import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const DESKTOP_HOST_EXE = "sdkwork-browser-pc-desktop.exe";

export function createDesktopHostBinaryPath(workspaceRoot, profile = "debug") {
  return path.join(workspaceRoot, "target", profile, DESKTOP_HOST_EXE);
}

export function buildWindowsDesktopHostUnlockCommand(binaryPath, { removeBinary = true } = {}) {
  const escapedBinaryPath = binaryPath.replace(/'/g, "''");
  const commands = [
    `$TargetPath = '${escapedBinaryPath}'`,
    `Get-Process ${DESKTOP_HOST_EXE.replace(".exe", "")} -ErrorAction SilentlyContinue | Where-Object { $_.Path -and [string]::Equals($_.Path, $TargetPath, [System.StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force -ErrorAction SilentlyContinue`,
  ];

  if (removeBinary) {
    commands.push(
      "if (Test-Path $TargetPath) { Remove-Item -LiteralPath $TargetPath -Force -ErrorAction SilentlyContinue }",
    );
  }

  return commands.join("; ");
}

export function buildWindowsStaleCargoUnlockCommand(workspaceRootPath) {
  const escapedWorkspaceRootPath = workspaceRootPath.replace(/'/g, "''");

  return [
    `$WorkspaceRoot = '${escapedWorkspaceRootPath}'`,
    "Get-CimInstance Win32_Process -Filter \"Name = 'cargo.exe'\" |",
    "  Where-Object {",
    "    $_.CommandLine -and",
    "    $_.CommandLine -match [regex]::Escape($WorkspaceRoot)",
    "  } |",
    "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
  ].join("\n");
}

export function releaseWindowsStaleCargoLock(
  workspaceRootPath,
  runner = spawnSync,
  cwd = process.cwd(),
) {
  if (process.platform !== "win32") {
    return;
  }

  const result = runner(
    "powershell.exe",
    ["-NoProfile", "-Command", buildWindowsStaleCargoUnlockCommand(workspaceRootPath)],
    {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      shell: false,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        `Failed to unlock stale cargo processes for ${workspaceRootPath}.`,
    );
  }
}

export function buildWindowsDesktopViteUnlockCommand(workspaceRootPath, port) {
  const escapedWorkspaceRootPath = workspaceRootPath.replace(/'/g, "''");

  return [
    `$WorkspaceRoot = '${escapedWorkspaceRootPath}'`,
    `$PortToken = '127.0.0.1:${port}'`,
    "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" |",
    "  Where-Object {",
    "    $_.CommandLine -and",
    "    $_.CommandLine -match [regex]::Escape($WorkspaceRoot) -and",
    "    $_.CommandLine -match 'vite'",
    "  } |",
    "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
    "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" |",
    "  Where-Object {",
    "    $_.CommandLine -and",
    "    $_.CommandLine -match [regex]::Escape($PortToken)",
    "  } |",
    "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
  ].join("\n");
}

export function createWindowsProcessTreeKillPlan(pid) {
  return {
    command: "taskkill.exe",
    args: ["/PID", String(pid), "/T", "/F"],
  };
}

export function releaseWindowsDesktopHostLock(
  binaryPath,
  runner = spawnSync,
  cwd = process.cwd(),
  options = {},
) {
  if (process.platform !== "win32") {
    return;
  }

  const result = runner(
    "powershell.exe",
    ["-NoProfile", "-Command", buildWindowsDesktopHostUnlockCommand(binaryPath, options)],
    {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      shell: false,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      result.stderr?.trim() || `Failed to unlock desktop host binary ${binaryPath}.`,
    );
  }
}

export function releaseWindowsDesktopViteLock(
  workspaceRootPath,
  port,
  runner = spawnSync,
  cwd = process.cwd(),
) {
  if (process.platform !== "win32") {
    return;
  }

  const result = runner(
    "powershell.exe",
    ["-NoProfile", "-Command", buildWindowsDesktopViteUnlockCommand(workspaceRootPath, port)],
    {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      shell: false,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        `Failed to unlock desktop vite process for ${workspaceRootPath} on port ${port}.`,
    );
  }
}

export function killWindowsProcessTree(pid, runner = spawnSync) {
  if (process.platform !== "win32" || typeof pid !== "number") {
    return;
  }

  const plan = createWindowsProcessTreeKillPlan(pid);
  const result = runner(plan.command, plan.args, {
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  const stderr = result.stderr?.trim() ?? "";
  const stdout = result.stdout?.trim() ?? "";
  const missingProcess =
    /not found|no running instance|process .* could not be found/i.test(stderr) ||
    /not found|no running instance|process .* could not be found/i.test(stdout);

  if (missingProcess) {
    return;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(stderr || stdout || `Failed to kill process tree for pid ${pid}.`);
  }
}
