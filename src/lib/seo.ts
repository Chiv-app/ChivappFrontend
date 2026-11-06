import type { Metadata } from "next";
import { resolveUploadUrl } from "@/lib/uploads";

export const SITE_NAME = "Chivapp";
export const SITE_TAGLINE = "Encuentra y contrata músicos para tu evento.";
/** Título de la home: palabras clave primero y la marca al final (~55 caracteres). */
export const SITE_TITLE = "Contrata músicos para bodas y eventos en Perú | Chivapp";
/** Descripción de la home: las primeras ~155 letras son lo que suele mostrar Google. */
export const SITE_DESCRIPTION =
    "Contrata músicos y agrupaciones verificadas en Perú para bodas, fiestas y eventos. Compara perfiles y repertorio, pide tu cotización y paga protegido en Chivapp.";

/**
 * Serializa JSON-LD para un <script>. JSON.stringify no escapa "<", así que
 * un texto con "</script>" (p. ej. la bio de un músico) inyectaría HTML.
 */
export function serializeJsonLd(data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}

export function getSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, "");

    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

    if (process.env.NODE_ENV === "production") {
        return "https://chiv.app";
    }

    return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
    const base = getSiteUrl();
    if (!path || path === "/") return base;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute URL for Open Graph / Twitter images (uploads or absolute). */
export function absoluteImageUrl(
    url: string | null | undefined,
): string | undefined {
    if (!url) return undefined;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const resolved = resolveUploadUrl(url);
    if (!resolved) return undefined;
    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
        return resolved;
    }
    return absoluteUrl(resolved);
}

type BuildPageMetadataInput = {
    title: string;
    description: string;
    path?: string;
    image?: string | null;
    noIndex?: boolean;
};

export function buildPageMetadata({
    title,
    description,
    path = "/",
    image,
    noIndex = false,
}: BuildPageMetadataInput): Metadata {
    const url = absoluteUrl(path);
    const ogImage = image ? absoluteImageUrl(image) : undefined;
    const isRoot = title === SITE_NAME;
    // Palabras clave primero y marca al final: "Contratar Rock en Lima | Chivapp".
    const fullTitle = isRoot ? SITE_TITLE : `${title} | ${SITE_NAME}`;

    return {
        title: { absolute: fullTitle },
        description,
        alternates: { canonical: url },
        robots: noIndex
            ? { index: false, follow: false }
            : { index: true, follow: true },
        openGraph: {
            type: "website",
            locale: "es_PE",
            siteName: SITE_NAME,
            title: fullTitle,
            description,
            url,
            ...(ogImage && {
                images: [
                    {
                        url: ogImage,
                        width: 1200,
                        height: 630,
                        alt: fullTitle,
                    },
                ],
            }),
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
            ...(ogImage && { images: [ogImage] }),
        },
    };
}

export function websiteJsonLd() {
    const url = getSiteUrl();
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        alternateName: ["Chivapp"],
        url,
        description: SITE_DESCRIPTION,
        inLanguage: "es",
        publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url,
            logo: absoluteUrl("/logo-chivappv2.png"),
        },
    };
}

export function organizationJsonLd() {
    const url = getSiteUrl();
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url,
        logo: absoluteUrl("/logo-chivappv2.png"),
        description: SITE_DESCRIPTION,
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: "soporte@chiv.app",
            availableLanguage: ["es"],
        },
    };
}

export function musicianJsonLd(input: {
    name: string;
    description: string;
    path: string;
    image?: string | null;
    genres?: string[];
    city?: string | null;
    rating?: number | null;
    ratingCount?: number | null;
    price?: number | null;
    socialUrls?: string[];
}) {
    const image = absoluteImageUrl(input.image) ?? absoluteUrl("/logo-chivappv2.png");
    
    // Solo mostramos calificación si hay al menos 1 reseña válida
    const hasRating = input.rating != null && input.ratingCount != null && input.ratingCount > 0;
    
    // Redes sociales válidas (no nulas/vacías)
    const sameAs = input.socialUrls?.filter(Boolean) || [];

    return {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name: input.name,
        description: input.description,
        url: absoluteUrl(input.path),
        image,
        ...(input.genres?.length ? { genre: input.genres } : {}),
        ...(input.city
            ? {
                  address: {
                      "@type": "PostalAddress",
                      addressLocality: input.city,
                      addressCountry: "PE",
                  },
              }
            : {}),
        ...(hasRating
            ? {
                  aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: input.rating?.toFixed(1),
                      reviewCount: input.ratingCount,
                      bestRating: "5",
                      worstRating: "1"
                  },
              }
            : {}),
        ...(input.price
            ? {
                  offers: {
                      "@type": "Offer",
                      price: input.price,
                      priceCurrency: "PEN",
                  },
              }
            : {}),
        ...(sameAs.length > 0 ? { sameAs } : {}),
    };
}

/** Migas de pan (BreadcrumbList) para páginas de categoría. `path` es relativo al sitio. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.path),
        })),
    };
}

/** Lista de perfiles (ItemList) que aparecen en una página de categoría. */
export function itemListJsonLd(
    name: string,
    entries: Array<{ name: string; path: string }>,
) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        numberOfItems: entries.length,
        itemListElement: entries.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: entry.name,
            url: absoluteUrl(entry.path),
        })),
    };
}


/** WP-19 (D12): Diccionario de géneros conocidos con capitalización especial o tildes. */
export const KNOWN_GENRE_LABELS: Record<string, { label: string; keepCaseInSentence?: boolean }> = {
    dj: { label: "DJ", keepCaseInSentence: true },
    djs: { label: "DJs", keepCaseInSentence: true },
    "r&b": { label: "R&B", keepCaseInSentence: true },
    "r-b": { label: "R&B", keepCaseInSentence: true },
    rnb: { label: "R&B", keepCaseInSentence: true },
    "k-pop": { label: "K-Pop", keepCaseInSentence: true },
    kpop: { label: "K-Pop", keepCaseInSentence: true },
    edm: { label: "EDM", keepCaseInSentence: true },
    mpb: { label: "MPB", keepCaseInSentence: true },
    "musica criolla": { label: "Música criolla" },
    "música criolla": { label: "Música criolla" },
    "musica andina": { label: "Música andina" },
    "música andina": { label: "Música andina" },
    "musica clasica": { label: "Música clásica" },
    "música clásica": { label: "Música clásica" },
    "bossa nova": { label: "Bossa Nova", keepCaseInSentence: true },
    "hip hop": { label: "Hip-Hop", keepCaseInSentence: true },
    "hip-hop": { label: "Hip-Hop", keepCaseInSentence: true },
    "rock and roll": { label: "Rock & Roll", keepCaseInSentence: true },
};

export function formatGenreName(
    slugOrText: string,
    options?: { inSentence?: boolean },
): string {
    const raw = decodeURIComponent(slugOrText || "").trim();
    if (!raw) return "";
    const spaced = raw.replace(/-/g, " ").replace(/\s+/g, " ").trim();
    const keyLower = spaced.toLowerCase();
    const rawKeyLower = raw.toLowerCase();
    const match = KNOWN_GENRE_LABELS[rawKeyLower] ?? KNOWN_GENRE_LABELS[keyLower];
    if (match) {
        if (options?.inSentence && !match.keepCaseInSentence) {
            return match.label.toLowerCase();
        }
        return match.label;
    }
    if (options?.inSentence) {
        return spaced.toLowerCase();
    }
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
