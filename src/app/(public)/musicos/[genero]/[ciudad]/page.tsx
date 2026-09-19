import type { Metadata } from "next";
import MusiciansBrowseView from "@/components/musicians/musicians-browse-view";
import { searchMusicians } from "@/lib/musicians";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";

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

export default async function GenreCityPage({ params }: Props) {
    const { genero, ciudad } = await params;
    const genreName = formatTitle(genero);
    const cityName = formatTitle(ciudad);

    let initialMusicians = [];
    try {
        initialMusicians = await searchMusicians({
            genres: [genreName],
            city: cityName,
            limit: 20,
        });
    } catch {
        // Fallback a cliente
    }

    return (
        <div className="pt-3 sm:pt-4 pb-16 sm:pb-24">
            <h1 className="sr-only">Contratar {genreName} en {cityName}</h1>
            <MusiciansBrowseView 
                initialFilters={{ genre: genreName, city: cityName }}
                initialMusicians={initialMusicians}
            />
        </div>
    );
}
