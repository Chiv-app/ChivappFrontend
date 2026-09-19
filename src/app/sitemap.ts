import type { MetadataRoute } from "next";
import { getMusicians } from "@/lib/musicians";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: absoluteUrl("/"),
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: absoluteUrl("/musicians"),
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: absoluteUrl("/legal/terminos"),
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: absoluteUrl("/legal/privacidad"),
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.3,
        },
    ];

    let musicianRoutes: MetadataRoute.Sitemap = [];
    let seoRoutes: MetadataRoute.Sitemap = [];

    try {
        const musicians = await getMusicians({ limit: 500 });
        
        // 1. Perfiles de músicos
        musicianRoutes = musicians.map((musician) => ({
            url: absoluteUrl(`/musicians/${musician.slug || musician.id}`),
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }));

        // 2. Extraer combinaciones únicas para SEO Automático (Estrategia Airbnb)
        const uniqueGenres = new Set<string>();
        const uniqueCombinations = new Set<string>(); // "genero|ciudad"

        musicians.forEach(m => {
            // Mapeamos los géneros
            const genresToProcess = m.genres.length > 0 ? m.genres : (m.genre ? [m.genre] : []);
            
            genresToProcess.forEach(g => {
                const slugGenre = encodeURIComponent(g.toLowerCase().replace(/\s+/g, "-"));
                uniqueGenres.add(slugGenre);

                if (m.city) {
                    const slugCity = encodeURIComponent(m.city.toLowerCase().replace(/\s+/g, "-"));
                    uniqueCombinations.add(`${slugGenre}/${slugCity}`);
                }
            });
        });

        // Generar URLs para géneros puros (ej: /musicos/mariachi)
        const genreRoutes: MetadataRoute.Sitemap = Array.from(uniqueGenres).map(genre => ({
            url: absoluteUrl(`/musicos/${genre}`),
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.85,
        }));

        // Generar URLs para combinaciones (ej: /musicos/mariachi/ayacucho)
        const combinationRoutes: MetadataRoute.Sitemap = Array.from(uniqueCombinations).map(combo => ({
            url: absoluteUrl(`/musicos/${combo}`),
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.9,
        }));

        seoRoutes = [...genreRoutes, ...combinationRoutes];

    } catch {
        // Sitemap still ships static routes if the API is unreachable at build time.
    }

    return [...staticRoutes, ...seoRoutes, ...musicianRoutes];
}
