import { rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
for (const target of ["node_modules", "dist", "apps/sdkwork-browser-pc/dist"]) {
  rmSync(join(root, target), { recursive: true, force: true });
}
