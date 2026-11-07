import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom no soporta la optimización de imágenes de next/image; se renderiza como <img> plano.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    delete rest.priority;
    return React.createElement("img", rest);
  },
}));

// @iconify/react carga los iconos con temporizadores asíncronos; si uno vence cuando jsdom ya se
// cerró lanza "window is not defined" y hace fallar toda la corrida (visto en CI). En pruebas el
// icono se reemplaza por un <span> inerte.
vi.mock("@iconify/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@iconify/react")>();
  return {
    ...original,
    Icon: (props: Record<string, unknown>) =>
      React.createElement("span", {
        "data-icon": typeof props.icon === "string" ? props.icon : undefined,
        "aria-hidden": "true",
        className: typeof props.className === "string" ? props.className : undefined,
      }),
  };
});

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

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
