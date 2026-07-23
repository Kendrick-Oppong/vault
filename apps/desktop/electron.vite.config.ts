import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve(__dirname, "src/renderer/src"),
        "@vault/types": resolve(__dirname, "../../packages/types/src"),
        "@vault/ui": resolve(__dirname, "../../packages/ui/src"),
        "@/lib": resolve(__dirname, "src/renderer/src/lib"),
        "@/components": resolve(__dirname, "src/renderer/src/components"),
        "@/providers": resolve(__dirname, "src/renderer/src/providers"),
        "@/features": resolve(__dirname, "src/renderer/src/features"),
        "@/stores": resolve(__dirname, "src/renderer/src/stores"),
        "@/assets": resolve(__dirname, "src/renderer/src/assets")
      }
    },
    plugins: [react(), tailwindcss()]
  }
});
