import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
    // The API and both WebSocket channels are proxied so the app is same-origin in the
    // browser: no CORS preflights, and `getUserMedia` runs in a secure context on
    // localhost without TLS.
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:8000", ws: true },
      "/health": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
});
