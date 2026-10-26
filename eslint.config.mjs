import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/dark:text-(default|danger|warning|success|primary)-[0-9]+/]",
          message:
            "Usa los tokens semánticos verificados (text-primary-text, text-success-text, text-warning-text, text-danger-text, text-default-N) en lugar de dark:text-*-N manuales.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
