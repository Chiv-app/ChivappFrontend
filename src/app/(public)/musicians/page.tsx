import type { Metadata } from "next";
import MusiciansBrowseView from "@/components/musicians/musicians-browse-view";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Músicos",
    description: `Explora todos los músicos verificados de ${SITE_NAME} y filtra por ciudad, género, instrumento o presupuesto.`,
    path: "/musicians",
});

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function MusiciansPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const location = typeof params.location === "string" ? params.location : "";
    const genre = typeof params.q === "string" ? params.q : "";

    const initialFilters = {
        city: location,
        genre: genre,
    };

    return (
        <div className="pt-3 sm:pt-4 pb-16 sm:pb-24">
            <h1 className="sr-only">Explora Músicos y Mariachis para tu Evento</h1>
            <MusiciansBrowseView key={JSON.stringify(initialFilters)} initialFilters={initialFilters} />
        </div>
    );
}

