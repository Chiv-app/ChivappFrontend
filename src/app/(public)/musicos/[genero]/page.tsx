import type { Metadata } from "next";
import MusiciansBrowseView from "@/components/musicians/musicians-browse-view";
import { searchMusicians } from "@/lib/musicians";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";

type Props = {
    params: Promise<{ genero: string }>;
};

// Formatea el slug a un texto legible (ej: "musica-criolla" -> "Música Criolla")
function formatTitle(slug: string) {
    const dec = decodeURIComponent(slug).replace(/-/g, " ");
    return dec.charAt(0).toUpperCase() + dec.slice(1);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { genero } = await params;
    const genreName = formatTitle(genero);

    return buildPageMetadata({
        title: `Contratar ${genreName}`,
        description: `Encuentra y contrata a los mejores ${genreName.toLowerCase()} en ${SITE_NAME}. Revisa sus precios, fotos y valoraciones reales.`,
        path: `/musicos/${genero}`,
    });
}

export default async function GenrePage({ params }: Props) {
    const { genero } = await params;
    const genreName = formatTitle(genero);

    let initialMusicians = [];
    try {
        initialMusicians = await searchMusicians({
            genres: [genreName],
            limit: 20,
        });
    } catch {
        // Fallback a cliente si el servidor falla
    }

    return (
        <div className="pt-3 sm:pt-4 pb-16 sm:pb-24">
            <h1 className="sr-only">Contratar {genreName}</h1>
            <MusiciansBrowseView 
                initialFilters={{ genre: genreName }}
                initialMusicians={initialMusicians}
            />
        </div>
    );
}
