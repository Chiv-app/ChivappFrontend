"use client";

import { Suspense, useMemo } from "react";
import MusicianDetailView from "@/components/musician/musician-detail-view";
import { toMusicianDetailFromOwnedProfile } from "@/lib/mappers/musician";
import type { MusicianProfileOut } from "@/types/api";

type Props = {
    profile: MusicianProfileOut;
    /** Uploaded gallery image URLs from musician media (fills empty gallery_images). */
    mediaGalleryUrls?: string[];
    onEdit: () => void;
    onOpenSettings?: () => void;
};

function PreviewFallback() {
    return (
        <div className="min-h-[50vh] animate-pulse bg-content2 border-b border-default-200/70" />
    );
}

export default function MusicianVerifiedPreview({
    profile,
    mediaGalleryUrls = [],
    onEdit,
    onOpenSettings,
}: Props) {
    const musician = useMemo(
        () => toMusicianDetailFromOwnedProfile(profile, mediaGalleryUrls),
        [profile, mediaGalleryUrls],
    );

    return (
        <Suspense fallback={<PreviewFallback />}>
            <MusicianDetailView
                musician={musician}
                mode="owner"
                onEdit={onEdit}
                onOpenSettings={onOpenSettings}
            />
        </Suspense>
    );
}
