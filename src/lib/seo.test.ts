import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import {
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_TITLE,
    absoluteUrl,
    breadcrumbJsonLd,
    buildPageMetadata,
    itemListJsonLd,
} from "@/lib/seo";

function absoluteTitle(meta: ReturnType<typeof buildPageMetadata>): string {
    const title = meta.title;
    if (title && typeof title === "object" && "absolute" in title) {
        return String(title.absolute);
    }
    return String(title);
}

describe("SEO", () => {
    it("la home usa un título descriptivo con la marca al final, no solo el nombre", () => {
        const meta = buildPageMetadata({ title: SITE_NAME, description: SITE_DESCRIPTION });
        expect(absoluteTitle(meta)).toBe(SITE_TITLE);
        expect(SITE_TITLE).not.toBe(SITE_NAME);
        expect(SITE_TITLE.endsWith(`| ${SITE_NAME}`)).toBe(true);
        expect(SITE_TITLE.length).toBeLessThanOrEqual(65);
    });

    it("las páginas internas ponen las palabras clave primero y la marca al final", () => {
        const meta = buildPageMetadata({
            title: "Contratar rock en Lima, Perú",
            description: "x",
            path: "/musicos/rock/lima",
        });
        expect(absoluteTitle(meta)).toBe("Contratar rock en Lima, Perú | Chivapp");
    });

    it("la descripción de la home cabe en un resultado de búsqueda", () => {
        expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(170);
        expect(SITE_DESCRIPTION).toContain("Perú");
    });

    it("robots apunta al sitemap del sitio configurado", () => {
        expect(robots().sitemap).toBe(absoluteUrl("/sitemap.xml"));
    });

    it("las migas y la lista de perfiles usan URL absolutas y posiciones correlativas", () => {
        const crumbs = breadcrumbJsonLd([
            { name: "Inicio", path: "/" },
            { name: "Músicos", path: "/musicians" },
        ]);
        expect(crumbs["@type"]).toBe("BreadcrumbList");
        expect(crumbs.itemListElement.map((i) => i.position)).toEqual([1, 2]);
        expect(crumbs.itemListElement[1].item).toBe(absoluteUrl("/musicians"));

        const list = itemListJsonLd("Rock en Lima", [{ name: "Banda", path: "/musicians/banda" }]);
        expect(list.numberOfItems).toBe(1);
        expect(list.itemListElement[0].url).toBe(absoluteUrl("/musicians/banda"));
    });
});
