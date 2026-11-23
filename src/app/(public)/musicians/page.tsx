import type { Metadata } from "next";
import MusiciansBrowseView from "@/components/musicians/musicians-browse-view";
import { EVENT_TYPE_OPTIONS } from "@/lib/profile-details";
import { searchMusicians } from "@/lib/musicians";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";
import type { MusicianCard } from "@/types/ui/musician";

export const metadata: Metadata = buildPageMetadata({
    title: "Contratar músicos, bandas de rock, mariachis y grupos en Perú",
    description: `Directorio para contratar músicos en Perú: encuentra banda de rock, mariachis, orquestas y DJs. Servicios musicales para cumpleaños, bodas y serenatas en ${SITE_NAME}.`,
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
    // Solo se aceptan valores conocidos: cualquier otro se ignora en lugar de romper la búsqueda.
    const rawType = pickParam(params, "profile_type");
    const profileType = rawType === "solo" || rawType === "group" ? rawType : "";
    const rawEvent = pickParam(params, "event");
    const eventType = EVENT_TYPE_OPTIONS.some((o) => o.value === rawEvent) ? rawEvent : "";

    const initialFilters = {
        city,
        genre,
        instrument,
        minPrice,
        maxPrice,
        availableDate,
        profileType,
        eventType,
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
            profile_type: profileType || undefined,
            event_types: eventType ? [eventType] : undefined,
            skip: 0,
            limit: 20,
        });
    } catch {
        initialMusicians = undefined;
    }

    return (
        <div className="pt-4 sm:pt-6 pb-16 sm:pb-24">
            <header className="w-full px-3 sm:px-6 mb-5">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    Contratar músicos, bandas y grupos musicales para tu evento
                </h1>
                <p className="text-sm sm:text-base text-default-600 mt-1">
                    Servicios musicales para cumpleaños, bodas, serenatas y fiestas: encuentra banda de rock, mariachis, orquestas y DJs verificados en todo el Perú.
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
