import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MusiciansBrowseView from "@/components/musicians/musicians-browse-view";
import { searchMusicians } from "@/lib/musicians";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";
import type { MusicianCard } from "@/types/ui/musician";

type Props = {
    params: Promise<{ genero: string; ciudad: string }>;
};

function formatTitle(slug: string) {
    const dec = decodeURIComponent(slug).replace(/-/g, " ");
    return dec.charAt(0).toUpperCase() + dec.slice(1);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { genero, ciudad } = await params;
    const genreName = formatTitle(genero);
    const cityName = formatTitle(ciudad);

    return buildPageMetadata({
        title: `Contratar ${genreName} en ${cityName}`,
        description: `Encuentra y contrata a los mejores ${genreName.toLowerCase()} en ${cityName}. Revisa sus precios, fotos y valoraciones reales en ${SITE_NAME}.`,
        path: `/musicos/${genero}/${ciudad}`,
    });
}

export const revalidate = 60;

export default async function GenreCityPage({ params }: Props) {
    const { genero, ciudad } = await params;
    const genreName = formatTitle(genero);
    const cityName = formatTitle(ciudad);

    let initialMusicians: MusicianCard[] | undefined;
    try {
        initialMusicians = await searchMusicians({
            genres: [genreName],
            city: cityName,
            limit: 20,
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
                    Contratar {genreName} en {cityName}
                </h1>
                <p className="text-sm sm:text-base text-default-600 mt-1">
                    Artistas verificados en {cityName} con tarifas transparentes y pago protegido.
                </p>
            </header>
            <MusiciansBrowseView
                initialFilters={{ genre: genreName, city: cityName }}
                initialMusicians={initialMusicians}
            />
        </div>
    );
}
