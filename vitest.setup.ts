import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom no soporta la optimización de imágenes de next/image; se renderiza como <img> plano.
vi.mock("next/image", () => ({
  default: ({ fill, priority, ...props }: Record<string, unknown>) => React.createElement("img", props),
}));

// jsdom no implementa matchMedia; lo necesitan next-themes y otros hooks de UI.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

