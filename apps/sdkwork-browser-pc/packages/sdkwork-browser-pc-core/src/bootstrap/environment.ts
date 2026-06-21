export function getRuntimeEnvironment(): string {
  return import.meta.env.MODE ?? "development";
}
