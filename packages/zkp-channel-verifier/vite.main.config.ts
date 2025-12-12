import { defineConfig, Plugin } from "vite";
import path from "node:path";
import fs from "node:fs";

// Custom plugin to copy binaries to the build output directory
function copyBinariesPlugin(): Plugin {
  return {
    name: "copy-binaries",
    buildStart() {
      const srcDir = path.resolve(__dirname, "src/binaries");
      const destDir = path.resolve(__dirname, ".vite/build/binaries");

      // Copy binaries directory recursively
      if (fs.existsSync(srcDir)) {
        console.log(`[copy-binaries] Copying ${srcDir} to ${destDir}`);
        fs.cpSync(srcDir, destDir, { recursive: true, force: true });
        console.log("[copy-binaries] Copy completed successfully");
      } else {
        console.warn(`[copy-binaries] Source directory not found: ${srcDir}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [copyBinariesPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

