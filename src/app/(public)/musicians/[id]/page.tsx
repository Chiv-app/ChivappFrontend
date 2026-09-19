import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MusicianDetailView from "@/components/musician/musician-detail-view";
import { ApiError } from "@/lib/api";
import { getMusicianById } from "@/lib/musicians";
import { buildPageMetadata, musicianJsonLd } from "@/lib/seo";
import type { MusicianDetail } from "@/types/ui/musician";

type PageProps = {
    params: Promise<{ id: string }>;
};

const detailFallback = (
    <main className="pt-8 pb-20 px-4 md:px-8">
        <div className="max-w-content mx-auto h-96 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
    </main>
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;

    try {
        const musician = await getMusicianById(id);
        const description =
            musician.bio ??
            musician.portfolioDescription ??
            `Contrata a ${musician.name}${musician.genre ? ` (${musician.genre})` : ""} para tu evento en Chivapp.`;

        return buildPageMetadata({
            title: musician.name,
            description,
            path: `/musicians/${id}`,
        });
    } catch {
        return buildPageMetadata({
            title: "Músico no encontrado",
            description: "Este perfil de músico no está disponible en Chivapp.",
            path: `/musicians/${id}`,
            noIndex: true,
        });
    }
}

async function loadMusician(id: string): Promise<MusicianDetail> {
    try {
        return await getMusicianById(id);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }
        throw error;
    }
}

export default async function MusicianDetailPage({ params }: PageProps) {
    const { id } = await params;
    const musician = await loadMusician(id);
    const description =
        musician.bio ??
        musician.portfolioDescription ??
        `Contrata a ${musician.name} para tu evento en Chivapp.`;
    const jsonLd = musicianJsonLd({
        name: musician.name,
        description,
        path: `/musicians/${id}`,
        image: musician.image ?? musician.galleryImages[0] ?? null,
        genres: musician.genres.length ? musician.genres : [musician.genre],
        city: musician.city,
        rating: musician.rating,
        ratingCount: musician.ratingCount,
        price: musician.price,
        socialUrls: [
            musician.instagramUrl,
            musician.facebookUrl,
            musician.tiktokUrl,
            musician.youtubeChannelUrl,
            musician.spotifyUrl,
            musician.websiteUrl
        ].filter(Boolean) as string[],
    });

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd),
                }}
            />
            <Suspense fallback={detailFallback}>
                <MusicianDetailView musician={musician} />
            </Suspense>
        </>
    );
}
