import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference implementations (external code)
    "reference/**",
    // Compiled Firebase Functions
    "functions/lib/**",
    "functions/node_modules/**",
  ]),
  // Ban console.* statements in API routes for security
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      "no-console": "error",
    },
  },
]);

export default eslintConfig;
