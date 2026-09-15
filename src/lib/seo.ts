import type { Metadata } from "next";
import { resolveUploadUrl } from "@/lib/uploads";

export const SITE_NAME = "Chivapp";
export const SITE_TAGLINE = "Encuentra y contrata músicos para tu evento.";
export const SITE_DESCRIPTION =
    "Chivapp conecta personas con músicos verificados para bodas, fiestas y eventos. Descubre perfiles, escucha su estilo y reserva en minutos.";

export function getSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, "");

    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

    if (process.env.NODE_ENV === "production") {
        return "https://Chivapp.com";
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
    const fullTitle = isRoot ? SITE_NAME : `${title} | ${SITE_NAME}`;

    return {
        title: isRoot ? { absolute: SITE_NAME } : title,
        description,
        alternates: { canonical: url },
        robots: noIndex
            ? { index: false, follow: false }
            : { index: true, follow: true },
        openGraph: {
            type: "website",
            locale: "es_ES",
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
            logo: absoluteUrl("/logo-chivapp.png"),
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
        logo: absoluteUrl("/logo-chivapp.png"),
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
}) {
    const image = absoluteImageUrl(input.image) ?? absoluteUrl("/logo-chivapp.png");
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
    };
}
