import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  // Note: Synthesizer is run as a binary, so we don't need alias for synthesizer-lib
  // resolve: {
  //   alias: {},
  // },
  build: {
    rollupOptions: {
      external: (id, importer) => {
        // Don't externalize relative imports or aliased paths (let alias resolve them)
        if (id.startsWith(".") || id.startsWith("/")) {
          return false;
        }

        // Handle alias paths - these should be resolved, not externalized
        if (id.startsWith("src/")) {
          return false;
        }

        // Electron built-in modules
        if (id === "electron") return true;

        // Node.js built-in modules
        const nodeBuiltins = [
          "fs",
          "path",
          "crypto",
          "child_process",
          "os",
          "util",
          "stream",
          "events",
          "buffer",
          "url",
          "http",
          "https",
          "net",
          "tls",
          "zlib",
        ];
        if (nodeBuiltins.includes(id)) return true;

        // Note: Synthesizer runs as binary, so these dependencies are not needed
        // If you need them for other purposes, uncomment:
        // if (id.startsWith("@ethereumjs/")) return true;
        // if (id.startsWith("@noble/")) return true;
        // if (id.startsWith("ethereum-cryptography")) return true;
        // if (id === "ethers" || id.startsWith("ethers/")) return true;

        return false;
      },
    },
  },
  // Note: Synthesizer runs as binary, so SSR external config not needed
  // ssr: {
  //   external: ["electron"],
  // },
});
