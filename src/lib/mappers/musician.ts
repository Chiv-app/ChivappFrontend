import type {
    MusicianProfileListOut,
    MusicianProfileOut,
    MusicianProfilePublicOut,
    MusicianSearchResult,
} from "@/types/api";
import {
    getVisibleMusicianPrices,
    resolveDisplayPrice,
} from "@/lib/musician-pricing";
import { resolveUploadUrl } from "@/lib/uploads";
import type { MusicianCard, MusicianDetail } from "@/types/ui/musician";

function resolveGenre(genres: string[] | null | undefined): string {
    if (genres?.length) return genres[0];
    return "Sin género";
}

function toNullableNumber(val: number | string | null | undefined): number | null {
    if (val == null || val === "") return null;
    const n = typeof val === "number" ? val : Number(val);
    return Number.isFinite(n) ? n : null;
}

function formatPriceLabel(
    availabilityType: MusicianProfileListOut["availability_type"],
    pricePerHour: number | string | null | undefined,
    pricePerEvent: number | string | null | undefined,
): string {
    const visible = getVisibleMusicianPrices(
        availabilityType,
        toNullableNumber(pricePerHour),
        toNullableNumber(pricePerEvent),
    );
    const parts: string[] = [];
    if (visible.pricePerHour != null) {
        parts.push(`S/ ${visible.pricePerHour}/h`);
    }
    if (visible.pricePerEvent != null) {
        parts.push(`S/ ${visible.pricePerEvent}/evento`);
    }
    if (parts.length === 0) return "Consultar tarifa";
    if (parts.length === 1) return `Desde ${parts[0]}`;
    return parts.join(" · ");
}

function resolveImageList(
    profileImage: string | null | undefined,
    gallery: string[] | null | undefined,
): string[] {
    const urls = [
        resolveUploadUrl(profileImage),
        ...(gallery ?? []).map((url) => resolveUploadUrl(url)),
    ].filter((url): url is string => Boolean(url));
    return Array.from(new Set(urls));
}

function cardBase(input: {
    id: string;
    slug: string | null;
    name: string;
    genres: string[];
    instruments: string[];
    bio: string | null;
    city: string | null;
    zone: string | null;
    price: number | null;
    priceLabel: string;
    image: string | null;
    images: string[];
    rating: number | null;
    ratingCount: number | null;
    verified: boolean;
}): MusicianCard {
    return {
        ...input,
        genre: resolveGenre(input.genres),
    };
}

export function toMusicianCardFromList(
    profile: MusicianProfileListOut,
): MusicianCard {
    const images = resolveImageList(
        profile.profile_image_url,
        profile.gallery_images,
    );
    return cardBase({
        id: profile.id,
        slug: profile.slug ?? null,
        name: profile.stage_name || "Músico",
        genres: profile.genres ?? [],
        instruments: profile.instruments ?? [],
        bio: profile.bio ?? null,
        city: profile.location_city,
        zone: profile.location_zone,
        price: resolveDisplayPrice(
            profile.availability_type,
            toNullableNumber(profile.price_per_hour),
            toNullableNumber(profile.price_per_event),
        ),
        priceLabel: formatPriceLabel(
            profile.availability_type,
            profile.price_per_hour,
            profile.price_per_event,
        ),
        image: images[0] ?? null,
        images,
        rating: profile.rating_avg,
        ratingCount: profile.rating_count,
        verified: profile.is_verified === true,
    });
}

export function toMusicianCardFromSearch(
    result: MusicianSearchResult,
): MusicianCard {
    const price = toNullableNumber(result.price_per_event);
    const image = resolveUploadUrl(result.main_image_url);
    return cardBase({
        id: result.musician_id,
        slug: result.slug ?? null,
        name: result.stage_name,
        genres: result.genres ?? [],
        instruments: result.instruments ?? [],
        bio: null,
        city: result.city,
        zone: result.zone,
        price,
        priceLabel:
            price != null ? `Desde S/ ${price}/evento` : "Consultar tarifa",
        image,
        images: image ? [image] : [],
        rating: result.rating_avg,
        ratingCount: result.rating_count,
        verified: result.is_verified === true,
    });
}

function resolveRepertoire(
    profile: MusicianProfilePublicOut,
): MusicianDetail["repertoire"] {
    if (profile.repertoire?.length) {
        return profile.repertoire.map((item) => ({
            title: item.title,
            youtubeUrl: item.youtube_url ?? null,
        }));
    }
    return (profile.songs ?? []).map((title) => ({
        title,
        youtubeUrl: null,
    }));
}

export function toMusicianDetail(
    profile: MusicianProfilePublicOut,
): MusicianDetail {
    const repertoire = resolveRepertoire(profile);
    const profileImage = resolveUploadUrl(profile.profile_image_url);
    const galleryFromApi = (profile.gallery_images ?? [])
        .map((url) => resolveUploadUrl(url))
        .filter((url): url is string => !!url);

    // Ensure the musician profile photo always appears in the portfolio grid.
    const galleryImages =
        profileImage && !galleryFromApi.includes(profileImage)
            ? [profileImage, ...galleryFromApi]
            : galleryFromApi;

    const card = cardBase({
        id: profile.id,
        slug: profile.slug ?? null,
        name: profile.stage_name || "Músico",
        genres: profile.genres ?? [],
        instruments: profile.instruments ?? [],
        bio: profile.bio ?? null,
        city: profile.location_city,
        zone: profile.location_zone,
        price: resolveDisplayPrice(
            profile.availability_type,
            toNullableNumber(profile.price_per_hour),
            toNullableNumber(profile.price_per_event),
        ),
        priceLabel: formatPriceLabel(
            profile.availability_type,
            profile.price_per_hour,
            profile.price_per_event,
        ),
        image: profileImage ?? galleryImages[0] ?? null,
        images: galleryImages,
        rating: profile.rating_avg,
        ratingCount: profile.rating_count,
        verified: profile.is_verified === true,
    });

    return {
        ...card,
        availabilityType: profile.availability_type ?? null,
        pricePerHour: toNullableNumber(profile.price_per_hour),
        pricePerEvent: toNullableNumber(profile.price_per_event),
        galleryImages,
        videos: profile.videos ?? [],
        showreelVideoUrl: profile.showreel_video_url ?? null,
        songs: repertoire.map((item) => item.title),
        repertoire,
        portfolioDescription: profile.portfolio_description,
        instagramUrl: profile.instagram_url ?? null,
        facebookUrl: profile.facebook_url ?? null,
        tiktokUrl: profile.tiktok_url ?? null,
        youtubeChannelUrl: profile.youtube_channel_url ?? null,
        spotifyUrl: profile.spotify_url ?? null,
        websiteUrl: profile.website_url ?? null,
        reviews: (profile.reviews ?? []).map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            authorLabel: review.author_label,
            eventType: review.event_type,
            createdAt: review.created_at,
        })),
    };
}

/**
 * Map the musician's own profile payload into the public detail shape.
 * `mediaGalleryUrls` fills gaps when `gallery_images` on the profile row is empty.
 */
export function toMusicianDetailFromOwnedProfile(
    profile: MusicianProfileOut,
    mediaGalleryUrls: string[] = [],
): MusicianDetail {
    const fromMedia = mediaGalleryUrls
        .map((url) => resolveUploadUrl(url))
        .filter((url): url is string => !!url);
    const fromProfile = (profile.gallery_images ?? [])
        .map((url) => resolveUploadUrl(url))
        .filter((url): url is string => !!url);
    const mergedGallery = Array.from(new Set([...fromMedia, ...fromProfile]));

    return toMusicianDetail({
        ...profile,
        gallery_images: mergedGallery,
        is_verified: profile.status === "published",
        reviews: profile.reviews ?? [],
    });
}

/** @deprecated Use toMusicianCardFromList instead. */
export const mapMusician = toMusicianCardFromList;
