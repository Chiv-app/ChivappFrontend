import type { Metadata } from "next";
import MusiciansBrowseView from "@/components/musicians/musicians-browse-view";
import { searchMusicians } from "@/lib/musicians";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";
import type { MusicianCard } from "@/types/ui/musician";

export const metadata: Metadata = buildPageMetadata({
    title: "Músicos",
    description: `Explora todos los músicos verificados de ${SITE_NAME} y filtra por ciudad, género, instrumento, fecha o presupuesto.`,
    path: "/musicians",
});

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function pickParam(
    params: { [key: string]: string | string[] | undefined },
    ...keys: string[]
): string {
    for (const key of keys) {
        const val = params[key];
        if (typeof val === "string" && val.trim() !== "") {
            return val.trim();
        }
    }
    return "";
}

export default async function MusiciansPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const city = pickParam(params, "city", "location");
    const genre = pickParam(params, "genre", "q");
    const instrument = pickParam(params, "instrument");
    const minPrice = pickParam(params, "min_price", "minPrice");
    const maxPrice = pickParam(params, "max_price", "maxPrice");
    const availableDate = pickParam(params, "available_date", "date", "availableDate");

    const initialFilters = {
        city,
        genre,
        instrument,
        minPrice,
        maxPrice,
        availableDate,
    };

    let initialMusicians: MusicianCard[] | undefined = undefined;
    try {
        initialMusicians = await searchMusicians({
            city: city || undefined,
            genres: genre ? [genre] : undefined,
            instruments: instrument ? [instrument] : undefined,
            min_price_per_event: minPrice ? Number(minPrice) : undefined,
            max_price_per_event: maxPrice ? Number(maxPrice) : undefined,
            available_date: availableDate || undefined,
            skip: 0,
            limit: 20,
        });
    } catch {
        initialMusicians = undefined;
    }

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
            <MusiciansBrowseView
                key={JSON.stringify(initialFilters)}
                initialFilters={initialFilters}
                initialMusicians={initialMusicians}
            />
        </div>
    );
}
