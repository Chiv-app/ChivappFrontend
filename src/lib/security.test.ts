import { describe, expect, it } from "vitest";
import { resolveAuthRedirect } from "@/lib/profiles";
import { serializeJsonLd } from "@/lib/seo";

describe("serializeJsonLd", () => {
    it("no permite cerrar el <script> desde datos del usuario", () => {
        const out = serializeJsonLd({ description: "</script><script>alert(1)</script>" });
        expect(out).not.toContain("<");
        expect(out).not.toContain(">");
        expect(JSON.parse(out).description).toBe("</script><script>alert(1)</script>");
    });
});

describe("resolveAuthRedirect", () => {
    it("rechaza redirecciones a otros dominios", () => {
        expect(resolveAuthRedirect("contractor", "https://evil.com")).toBe("/");
        expect(resolveAuthRedirect("contractor", "//evil.com")).toBe("/");
        expect(resolveAuthRedirect("contractor", "/\\evil.com")).toBe("/");
    });

    it("permite rutas internas del rol", () => {
        expect(resolveAuthRedirect("contractor", "/musicians/mariachi-sol?reservar=1")).toBe(
            "/musicians/mariachi-sol?reservar=1",
        );
    });
});
