import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Las pruebas de interfaz con HeroUI pueden tardar más de 5 s cuando el equipo (o la integración continua) va cargado.
    testTimeout: 15000,
  },
});
