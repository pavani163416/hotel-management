import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
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
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  build: {
    // Warn if any chunk exceeds 1MB
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // disable in production for security
  },
  plugins: [
    react(),
    // componentTagger only runs in development — never in production builds
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: [
      "react", "react-dom",
      "react/jsx-runtime", "react/jsx-dev-runtime",
      "@tanstack/react-query", "@tanstack/query-core",
    ],
  },
};
});
