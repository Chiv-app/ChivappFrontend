import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useScrolledPast } from "./use-scrolled-past";
import { isScrollRevealRoute } from "@/lib/scroll-reveal-routes";

function scrollTo(y: number) {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
}

describe("useScrolledPast", () => {
    afterEach(() => scrollTo(0));

    it("empieza oculto arriba, aparece al bajar y se oculta al volver", () => {
        const { result } = renderHook(() => useScrolledPast(80));
        expect(result.current).toBe(false);

        act(() => scrollTo(200));
        expect(result.current).toBe(true);

        act(() => scrollTo(0));
        expect(result.current).toBe(false);
    });

    it("no se activa por un desplazamiento menor al umbral", () => {
        const { result } = renderHook(() => useScrolledPast(80));
        act(() => scrollTo(40));
        expect(result.current).toBe(false);
    });

    it("deshabilitado: siempre visible, sin esperar al scroll", () => {
        const { result } = renderHook(() => useScrolledPast(80, false));
        expect(result.current).toBe(true);
    });
});

describe("isScrollRevealRoute", () => {
    it("aplica al perfil público y a la vista previa de la guía", () => {
        expect(isScrollRevealRoute("/musicians/grupo-aurora")).toBe(true);
        expect(isScrollRevealRoute("/musicians/grupo-aurora/")).toBe(true);
        expect(isScrollRevealRoute("/musician/onboarding/preview")).toBe(true);
    });

    it("no aplica al listado, a la reserva ni al resto del sitio", () => {
        expect(isScrollRevealRoute("/musicians")).toBe(false);
        expect(isScrollRevealRoute("/musicians/grupo-aurora/book")).toBe(false);
        expect(isScrollRevealRoute("/")).toBe(false);
        expect(isScrollRevealRoute("/musician/profile")).toBe(false);
        expect(isScrollRevealRoute(null)).toBe(false);
    });
});
