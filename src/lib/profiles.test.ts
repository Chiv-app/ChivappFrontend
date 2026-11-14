import { describe, expect, it } from "vitest";
import { getPostLoginPath, resolveAuthRedirect } from "@/lib/profiles";

describe("getPostLoginPath", () => {
    it("un músico sin aprobar va a la guía de alta", () => {
        expect(getPostLoginPath("musician", false)).toBe("/musician/onboarding");
    });

    it("un músico aprobado vuelve al inicio", () => {
        expect(getPostLoginPath("musician", true)).toBe("/");
    });

    it("quien solo es integrante de una agrupación va a sus reservas, no a la guía", () => {
        expect(getPostLoginPath("musician", false, true)).toBe("/musician/bookings");
    });

    it("el contratante y el admin no cambian", () => {
        expect(getPostLoginPath("contractor", false)).toBe("/");
        expect(getPostLoginPath("contractor", true)).toBe("/");
        expect(getPostLoginPath("admin", false)).toBe("/admin");
    });
});

describe("resolveAuthRedirect para músicos sin aprobar", () => {
    it("sin destino pedido, lleva a la guía", () => {
        expect(resolveAuthRedirect("musician", null, false)).toBe("/musician/onboarding");
        expect(resolveAuthRedirect("musician", "/", false)).toBe("/musician/onboarding");
    });

    it("un integrante sin destino pedido va a sus reservas", () => {
        expect(resolveAuthRedirect("musician", null, false, true)).toBe("/musician/bookings");
    });

    it("respeta un destino pedido del panel (el panel decide si lo deja pasar)", () => {
        expect(resolveAuthRedirect("musician", "/musician/bookings", false)).toBe("/musician/bookings");
    });

    it("un destino inseguro cae en la guía, no en el sitio externo", () => {
        expect(resolveAuthRedirect("musician", "https://evil.com", false)).toBe("/musician/onboarding");
        expect(resolveAuthRedirect("musician", "//evil.com", false)).toBe("/musician/onboarding");
    });

    it("un músico aprobado sigue como antes", () => {
        expect(resolveAuthRedirect("musician", null, true)).toBe("/");
        expect(resolveAuthRedirect("musician", "/musician/earnings", true)).toBe("/musician/earnings");
    });
});
