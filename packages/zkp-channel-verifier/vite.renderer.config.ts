import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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

