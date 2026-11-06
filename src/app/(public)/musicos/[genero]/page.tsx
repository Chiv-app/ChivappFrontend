import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MusiciansBrowseView from "@/components/musicians/musicians-browse-view";
import SeoLandingContent from "@/components/musicians/seo-landing-content";
import { searchMusicians } from "@/lib/musicians";
import { SITE_NAME, buildPageMetadata, formatGenreName } from "@/lib/seo";
import type { MusicianCard } from "@/types/ui/musician";

type Props = {
    params: Promise<{ genero: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { genero } = await params;
    const genreInSentence = formatGenreName(genero, { inSentence: true });

    return buildPageMetadata({
        title: `Contratar ${genreInSentence} en Perú`,
        description: `Contrata ${genreInSentence} en Perú para bodas, fiestas y eventos. Compara perfiles, repertorio, tarifas y reseñas, y paga protegido en ${SITE_NAME}.`,
        path: `/musicos/${genero}`,
    });
}

export const revalidate = 60;

const SEARCH_LIMIT = 20;

export default async function GenrePage({ params }: Props) {
    const { genero } = await params;
    const genreName = formatGenreName(genero);
    const genreInSentence = formatGenreName(genero, { inSentence: true });

    let initialMusicians: MusicianCard[] | undefined;
    try {
        initialMusicians = await searchMusicians({
            genres: [genreName],
            limit: SEARCH_LIMIT,
        });
    } catch {
        // Fallback a cliente si el servidor falla transitoriamente (no cachear 404)
        initialMusicians = undefined;
    }

    if (initialMusicians !== undefined && initialMusicians.length === 0) {
        notFound();
    }

    return (
        <div className="pt-4 sm:pt-6 pb-16 sm:pb-24">
            <header className="max-w-[1800px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 mb-5">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    Contratar {genreInSentence}
                </h1>
                <p className="text-sm sm:text-base text-default-600 mt-1">
                    Compara videos, repertorio, valoraciones y tarifas antes de reservar.
                </p>
            </header>
            <MusiciansBrowseView
                initialFilters={{ genre: genreName }}
                initialMusicians={initialMusicians}
            />
            <SeoLandingContent
                genreName={genreName}
                genreSlug={genero}
                musicians={initialMusicians}
                searchLimit={SEARCH_LIMIT}
            />
        </div>
    );
}
