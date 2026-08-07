import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // En desarrollo local el gateway/nginx no existen: proxy manual opcional.
    proxy: {
      "/api": { target: "http://localhost:80", changeOrigin: true },
      "/graphql": { target: "http://localhost:80", changeOrigin: true },
      "/media": { target: "http://localhost:80", changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          data: ["@tanstack/react-query", "@apollo/client", "graphql", "zustand"],
          motion: ["framer-motion"],
          markdown: ["react-markdown", "remark-gfm"],
        },
      },
    },
  },
});
