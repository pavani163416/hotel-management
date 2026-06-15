import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "production") {
    const env = loadEnv(mode, process.cwd(), "");
    if (!env.VITE_API_URL) {
      console.error("FATAL BUILD ERROR: VITE_API_URL is missing! You must explicitly provide this environment variable for production builds to avoid data-integrity risks.");
      process.exit(1);
    }
  }

  return {
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { port: 5173 },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    // Force new content hashes on every build so CDN/browser never serves stale JS
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
};
});
