import type { Metadata } from "next";
import MusiciansBrowseView from "@/components/musicians/musicians-browse-view";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Músicos",
    description: `Explora todos los músicos verificados de ${SITE_NAME} y filtra por ciudad, género, instrumento o presupuesto.`,
    path: "/musicians",
});

export default function MusiciansPage() {
    return (
        <div className="pt-3 sm:pt-4 pb-16 sm:pb-24">
            <h1 className="sr-only">Explora Músicos y Mariachis para tu Evento</h1>
            <MusiciansBrowseView />
        </div>
    );
}
