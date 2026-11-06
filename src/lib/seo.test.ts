import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import {
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_TITLE,
    absoluteUrl,
    breadcrumbJsonLd,
    buildPageMetadata,
    formatGenreName,
    itemListJsonLd,
} from "@/lib/seo";
import {
    UNIFIED_BOOKING_STAGES,
    getRoleAwareStatusLabel,
    mapStatusToUnifiedStage,
} from "@/lib/booking-stages";
import {
    buildEnsembleInviteWhatsAppUrl,
    buildMusicianProfileWhatsAppUrl,
    buildWhatsAppShareUrl,
} from "@/lib/whatsapp";
import {
    getCookieConsent,
    resetCookieConsent,
    setCookieConsent,
    trackFunnelEvent,
} from "@/lib/analytics";

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

    it("formatGenreName conserva mayúsculas de siglas conocidas como DJ y R&B (D12)", () => {
        expect(formatGenreName("dj")).toBe("DJ");
        expect(formatGenreName("djs")).toBe("DJs");
        expect(formatGenreName("r-b")).toBe("R&B");
        expect(formatGenreName("musica-criolla")).toBe("Música criolla");
        expect(formatGenreName("rock", { inSentence: true })).toBe("rock");
        expect(formatGenreName("dj", { inSentence: true })).toBe("DJ");
    });
});

describe("WP-20 a WP-23 Utilidades de producto", () => {
    it("unifica las etapas de reserva en 5 pasos y distingue el estado accepted por rol", () => {
        expect(UNIFIED_BOOKING_STAGES).toHaveLength(5);
        expect(mapStatusToUnifiedStage("pending")).toBe("solicitud");
        expect(mapStatusToUnifiedStage("accepted")).toBe("cotizacion");
        expect(mapStatusToUnifiedStage("quote_accepted")).toBe("pago");
        expect(mapStatusToUnifiedStage("confirmed")).toBe("confirmada");
        expect(mapStatusToUnifiedStage("completed")).toBe("cierre");
        expect(getRoleAwareStatusLabel("accepted", "contractor")).toBe(
            "Tienes una cotización para revisar",
        );
        expect(getRoleAwareStatusLabel("accepted", "musician")).toContain("Cotización enviada");
    });

    it("genera enlaces directos wa.me con mensaje prellenado y prefijo 51 para móviles de Perú (D8)", () => {
        const shareUrl = buildMusicianProfileWhatsAppUrl({
            stageName: "Banda Solaris",
            profileUrl: "https://chiv.app/musicians/banda-solaris",
            city: "Lima",
        });
        expect(shareUrl.startsWith("https://wa.me/?text=")).toBe(true);
        expect(decodeURIComponent(shareUrl)).toContain("Banda Solaris en Lima");

        const inviteUrl = buildEnsembleInviteWhatsAppUrl({
            ensembleName: "Orquesta Estelar",
            inviteUrl: "https://chiv.app/musician/ensemble",
            memberPhone: "987 654 321",
        });
        expect(inviteUrl.startsWith("https://wa.me/51987654321?text=")).toBe(true);
        expect(buildWhatsAppShareUrl("Hola", "+51 999 888 777")).toContain(
            "https://wa.me/51999888777?text=Hola",
        );
    });

    it("gestiona el consentimiento de cookies y solo envía eventos de embudo cuando está aceptado", () => {
        resetCookieConsent();
        expect(getCookieConsent()).toBeNull();
        const events: Array<Record<string, unknown>> = [];
        (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer = events;

        trackFunnelEvent("search_musicians", { city: "Lima" });
        expect(events).toHaveLength(0);

        setCookieConsent("accepted");
        expect(getCookieConsent()).toBe("accepted");
        trackFunnelEvent("search_musicians", { city: "Lima" });
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ event: "search_musicians", city: "Lima" });

        resetCookieConsent();
        expect(getCookieConsent()).toBeNull();
    });
});
