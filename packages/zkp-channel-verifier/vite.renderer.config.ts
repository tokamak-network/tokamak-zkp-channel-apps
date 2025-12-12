import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Enable polyfills for specific modules
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@noble/curves/misc": path.resolve(__dirname, "./node_modules/@noble/curves/misc.js"),
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  publicDir: "public",
  base: "./",
  server: {
    proxy: {
      // Proxy RPC requests to avoid CORS in dev mode
      '/rpc': {
        target: 'https://sepolia.infura.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add necessary headers
            proxyReq.setHeader('Content-Type', 'application/json');
          });
        },
      },
    },
  },
});

