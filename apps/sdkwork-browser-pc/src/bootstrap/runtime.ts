import { getRuntimeEnvironment } from "./environment.ts";

export interface PcRuntimeProfile {
  environment: string;
  surface: "pc";
  host: "browser" | "desktop" | "tablet";
}

export function createPcRuntimeProfile(host: PcRuntimeProfile["host"] = "browser"): PcRuntimeProfile {
  return {
    environment: getRuntimeEnvironment(),
    surface: "pc",
    host,
  };
}
