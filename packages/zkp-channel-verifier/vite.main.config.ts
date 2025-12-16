import { defineConfig, Plugin } from "vite";
import path from "node:path";
import fs from "node:fs";

// Helper function to copy binaries
function copyBinaries(srcDir: string, destDir: string) {
  if (fs.existsSync(srcDir)) {
    // Ensure destination directory exists
    fs.mkdirSync(destDir, { recursive: true });
    
    console.log(`[copy-binaries] Copying ${srcDir} to ${destDir}`);
    fs.cpSync(srcDir, destDir, { recursive: true, force: true });
    console.log("[copy-binaries] Copy completed successfully");
  } else {
    console.warn(`[copy-binaries] Source directory not found: ${srcDir}`);
  }
}

// Custom plugin to copy binaries to the build output directory
function copyBinariesPlugin(): Plugin {
  return {
    name: "copy-binaries",
    // Run on build start
    buildStart() {
      const srcDir = path.resolve(__dirname, "src/binaries");
      const destDir = path.resolve(__dirname, ".vite/build/binaries");
      copyBinaries(srcDir, destDir);
    },
    // Run when dev server is configured (development mode)
    configureServer() {
      const srcDir = path.resolve(__dirname, "src/binaries");
      const destDir = path.resolve(__dirname, ".vite/build/binaries");
      copyBinaries(srcDir, destDir);
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

