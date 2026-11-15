/** Simplified musician shape for cards and list views. */
export type MusicianCard = {
    id: string;
    slug: string | null;
    name: string;
    genre: string;
    genres: string[];
    instruments: string[];
    bio: string | null;
    city: string | null;
    zone: string | null;
    price: number | null;
    priceLabel: string;
    image: string | null;
    /** Profile + gallery images for card carousel (deduped, resolved URLs). */
    images: string[];
    rating: number | null;
    ratingCount: number | null;
    verified: boolean;
    /** «solo» (solista) o «group». Ausente en datos anteriores a este dato. */
    profileType?: "solo" | "group";
    /** Cuántas personas son, solo en grupos. */
    groupSize?: string | null;
};

export type MusicianRepertoireItem = {
    title: string;
    youtubeUrl: string | null;
};

/** Extended musician shape for detail pages. */
export type MusicianDetail = MusicianCard & {
    availabilityType: "hourly" | "per_event" | "both" | null;
    pricePerHour: number | null;
    pricePerEvent: number | null;
    galleryImages: string[];
    videos: string[];
    /** Featured showreel URL; falls back to videos[0] on the public page. */
    showreelVideoUrl: string | null;
    songs: string[];
    repertoire: MusicianRepertoireItem[];
    portfolioDescription: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
    youtubeChannelUrl: string | null;
    spotifyUrl: string | null;
    websiteUrl: string | null;
    /** Datos de detalle validados (eventos, show, reservas, experiencia). */
    details?: import("@/lib/profile-details").ProfileDetails;
    reviews: Array<{
        id: string;
        rating: number;
        comment: string;
        authorLabel: string;
        eventType: string | null;
        createdAt: string;
    }>;
};
