import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
    // Avoid duplicate React instance: optimizer can load a second copy of React
    // and cause "Cannot read properties of null (reading 'useState')" in providers.
    deps: {
      optimizer: {
        web: { enabled: false },
      },
    },
    server: {
      deps: {
        // Force react/react-dom through Vite so one instance is used (fixes hooks null dispatcher).
        inline: ["react", "react-dom", "@testing-library/react"],
      },
    },
    // Exclude reference folder (external code for inspiration only)
    // and functions folder (Firebase Functions with their own node_modules)
    exclude: ["node_modules", "reference/**", "functions/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/__tests__/",
        "reference/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force a single React instance: point to root node_modules so test runner
      // and app code share one copy (avoids "useState/useMemo of null" in hooks).
      react: path.resolve(__dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
});
