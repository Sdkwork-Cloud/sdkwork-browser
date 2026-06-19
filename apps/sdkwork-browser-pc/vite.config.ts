import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const devHost = "127.0.0.1";
const devPort = Number(process.env.SDKWORK_BROWSER_PC_DEV_PORT ?? 1620);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: devHost,
    port: devPort,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
