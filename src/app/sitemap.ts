import type { MetadataRoute } from "next";
import { getMusicians } from "@/lib/musicians";
import { absoluteUrl } from "@/lib/seo";
import type { MusicianCard } from "@/types/ui/musician";

const SITEMAP_PAGE_SIZE = 50;
const SITEMAP_MAX_PAGES = 20;

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: absoluteUrl("/"),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: absoluteUrl("/musicians"),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: absoluteUrl("/legal/terminos"),
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: absoluteUrl("/legal/privacidad"),
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: absoluteUrl("/legal/reembolsos"),
            changeFrequency: "monthly",
            priority: 0.3,
        },
    ];

    let musicianRoutes: MetadataRoute.Sitemap = [];
    let seoRoutes: MetadataRoute.Sitemap = [];

    try {
        const musicians: MusicianCard[] = [];
        for (let page = 0; page < SITEMAP_MAX_PAGES; page += 1) {
            const batch = await getMusicians({
                limit: SITEMAP_PAGE_SIZE,
                skip: page * SITEMAP_PAGE_SIZE,
            });
            musicians.push(...batch);
            if (batch.length < SITEMAP_PAGE_SIZE) {
                break;
            }
        }

        // 1. Perfiles de músicos
        musicianRoutes = musicians.map((musician) => ({
            url: absoluteUrl(`/musicians/${musician.slug || musician.id}`),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }));

        // 2. Extraer combinaciones únicas para SEO Automático (Estrategia Airbnb)
        const uniqueGenres = new Set<string>();
        const uniqueCombinations = new Set<string>(); // "genero|ciudad"

        musicians.forEach((m) => {
            const genresToProcess = m.genres.length > 0 ? m.genres : m.genre ? [m.genre] : [];

            genresToProcess.forEach((g) => {
                const slugGenre = encodeURIComponent(g.toLowerCase().replace(/\s+/g, "-"));
                uniqueGenres.add(slugGenre);

                if (m.city) {
                    const slugCity = encodeURIComponent(m.city.toLowerCase().replace(/\s+/g, "-"));
                    uniqueCombinations.add(`${slugGenre}/${slugCity}`);
                }
            });
        });

        const genreRoutes: MetadataRoute.Sitemap = Array.from(uniqueGenres).map((genre) => ({
            url: absoluteUrl(`/musicos/${genre}`),
            changeFrequency: "weekly" as const,
            priority: 0.85,
        }));

        const combinationRoutes: MetadataRoute.Sitemap = Array.from(uniqueCombinations).map((combo) => ({
            url: absoluteUrl(`/musicos/${combo}`),
            changeFrequency: "weekly" as const,
            priority: 0.9,
        }));

        seoRoutes = [...genreRoutes, ...combinationRoutes];
    } catch (error) {
        // Sitemap still ships static routes if the API is unreachable at build time.
        console.error("[sitemap] Failed to fetch musicians for dynamic routes:", error);
    }

    return [...staticRoutes, ...seoRoutes, ...musicianRoutes];
}
