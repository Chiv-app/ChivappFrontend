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
    const location =
        typeof params.location === "string"
            ? params.location
            : typeof params.city === "string"
              ? params.city
              : "";
    const genre =
        typeof params.genre === "string"
            ? params.genre
            : typeof params.q === "string"
              ? params.q
              : "";

    const initialFilters = {
        city: location,
        genre: genre,
    };

    return (
        <div className="pt-4 sm:pt-6 pb-16 sm:pb-24">
            <header className="max-w-[1800px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 mb-5">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    Explora músicos y agrupaciones para tu evento
                </h1>
                <p className="text-sm sm:text-base text-default-600 mt-1">
                    Artistas verificados con precios claros y reserva protegida en todo el Perú.
                </p>
            </header>
            <MusiciansBrowseView key={JSON.stringify(initialFilters)} initialFilters={initialFilters} />
        </div>
    );
}
