export type MusicianSearchFilters = {
    city?: string | null;
    genres?: string[] | null;
    instruments?: string[] | null;
    min_price_per_event?: number | null;
    max_price_per_event?: number | null;
    available_date?: string | null;
    skip?: number;
    limit?: number;
};

export type MusicianSearchResult = {
    musician_id: string;
    user_id: string;
    slug?: string | null;
    stage_name: string;
    city: string | null;
    zone: string | null;
    genres: string[] | null;
    instruments: string[] | null;
    price_per_event: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    main_image_url: string | null;
    is_verified: boolean;
};
