import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Downgrade to warn during the Supabase-to-Drizzle migration:
      // Record<string, unknown> from generics.fetchData is inherently untyped.
      "@typescript-eslint/no-explicit-any": "warn",
      // setState in effect is acceptable for SWR-derived values
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
