import type { AvailabilityType, ProfileStatus } from "./enums";

export type RepertoireItem = {
    title: string;
    youtube_url?: string | null;
};

export type PlatformStatsOut = {
    musicians_count: number;
    completed_bookings_count: number;
    average_rating: number | null;
};

export type ValidationStepOut = {
    id: number;
    key: string;
    label: string;
    completed: boolean;
    missing: string[];
    /** When false, the step does not block profile submission. */
    required?: boolean;
};

export type ProfileValidationOut = {
    status: ProfileStatus;
    current_step: number;
    steps: ValidationStepOut[];
    can_submit: boolean;
    is_public: boolean;
    is_ensemble_only?: boolean;
};

export type MusicianProfileListOut = {
    id: string;
    stage_name: string;
    slug?: string | null;
    bio?: string | null;
    genres: string[];
    instruments: string[];
    songs: string[];
    repertoire?: RepertoireItem[];
    price_per_hour: number | null;
    price_per_event: number | null;
    availability_type?: AvailabilityType | null;
    location_city: string | null;
    location_zone: string | null;
    rating_avg: number | null;
    rating_count: number | null;
    profile_image_url: string | null;
    gallery_images: string[];
    videos: string[];
    showreel_video_url?: string | null;
    is_verified: boolean;
    instagram_url?: string | null;
    facebook_url?: string | null;
    tiktok_url?: string | null;
    youtube_channel_url?: string | null;
    spotify_url?: string | null;
    website_url?: string | null;
};

export type MusicianPublicReviewOut = {
    id: string;
    rating: number;
    comment: string;
    author_label: string;
    event_type: string | null;
    created_at: string;
};

export type MusicianProfilePublicOut = {
    id: string;
    is_ensemble_only?: boolean;
    stage_name?: string | null;
    slug?: string | null;
    bio: string | null;
    genres: string[];
    instruments: string[];
    songs: string[];
    repertoire?: RepertoireItem[];
    price_per_hour: number | null;
    price_per_event: number | null;
    portfolio_description: string | null;
    location_city: string | null;
    location_zone: string | null;
    availability_type: AvailabilityType | null;
    rating_avg: number | null;
    rating_count: number | null;
    profile_image_url: string | null;
    gallery_images: string[];
    videos: string[];
    showreel_video_url?: string | null;
    is_verified: boolean;
    instagram_url?: string | null;
    facebook_url?: string | null;
    tiktok_url?: string | null;
    youtube_channel_url?: string | null;
    spotify_url?: string | null;
    website_url?: string | null;
    reviews?: MusicianPublicReviewOut[];
};

export type ContractorPublicRecommendationOut = {
    id: string;
    rating: number;
    comment: string;
    musician_name: string;
    created_at: string;
};

export type ContractorProfilePublicOut = {
    id: string;
    fullname: string;
    bio: string | null;
    city: string | null;
    rating_avg: number | null;
    rating_count: number | null;
    is_verified: boolean;
    recommendations: ContractorPublicRecommendationOut[];
};

export type MusicianProfileOut = MusicianProfilePublicOut & {
    user_id: string;
    username?: string | null;
    fullname?: string | null;
    email?: string | null;
    status: ProfileStatus;
    submitted_at: string | null;
    published_at: string | null;
    rejection_reason: string | null;
    id_document_url: string | null;
    contract_template_title: string | null;
    contract_template_body: string | null;
    contract_pdf_url: string | null;
    signature_image_url: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
    tiktok_url: string | null;
    youtube_channel_url: string | null;
    spotify_url: string | null;
    website_url: string | null;
    payout_method?: string | null;
    payout_bank_name?: string | null;
    payout_account_number?: string | null;
    payout_cci?: string | null;
    payout_phone?: string | null;
    payout_beneficiary_name?: string | null;
    payout_beneficiary_document?: string | null;
    payout_mp_email?: string | null;
    created_at: string;
    updated_at: string;
};

export type MusicianProfileCreate = {
    is_ensemble_only?: boolean;
    stage_name: string;
    username?: string | null;
    fullname?: string | null;
    bio?: string | null;
    genres?: string[];
    instruments?: string[];
    songs?: string[];
    repertoire?: RepertoireItem[];
    price_per_hour?: number | null;
    price_per_event?: number | null;
    portfolio_description?: string | null;
    location_city?: string | null;
    location_zone?: string | null;
    availability_type?: AvailabilityType | null;
    profile_image_url?: string | null;
    gallery_images?: string[];
    videos?: string[];
    showreel_video_url?: string | null;
    instagram_url?: string | null;
    facebook_url?: string | null;
    tiktok_url?: string | null;
    youtube_channel_url?: string | null;
    spotify_url?: string | null;
    website_url?: string | null;
    id_document_url?: string | null;
    contract_template_title?: string | null;
    contract_template_body?: string | null;
    signature_image_url?: string | null;
    payout_method?: string | null;
    payout_bank_name?: string | null;
    payout_account_number?: string | null;
    payout_cci?: string | null;
    payout_phone?: string | null;
    payout_beneficiary_name?: string | null;
    payout_beneficiary_document?: string | null;
    payout_mp_email?: string | null;
};


export type MusicianProfileUpdate = Partial<MusicianProfileCreate>;

export type ContractorProfileOut = {
    id: string;
    user_id: string;
    username?: string | null;
    fullname?: string | null;
    email?: string | null;
    phone?: string | null;
    bio: string | null;
    preferences: string[];
    document_type: string | null;
    document_number: string | null;
    address: string | null;
    city: string | null;
    id_document_url: string | null;
    contract_template_title: string | null;
    contract_template_body: string | null;
    contract_pdf_url: string | null;
    status: ProfileStatus;
    submitted_at: string | null;
    published_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
};

export type ContractorProfileCreate = {
    username?: string | null;
    fullname?: string | null;
    phone?: string | null;
    bio?: string | null;
    preferences?: string[];
    document_type?: string | null;
    document_number?: string | null;
    address?: string | null;
    city?: string | null;
    id_document_url?: string | null;
    contract_template_title?: string | null;
    contract_template_body?: string | null;
};

export type ContractorProfileUpdate = Partial<ContractorProfileCreate>;

export type MusicianProfileAdminOut = MusicianProfileOut & {
    user_email: string;
    user_fullname: string;
    user_phone: string | null;
};

export type ContractorProfileAdminOut = ContractorProfileOut & {
    user_email: string;
    user_fullname: string;
    user_phone: string | null;
};

export type MusicianContractGenerateOut = {
    contract_pdf_url: string;
};

export type ContractorContractGenerateOut = {
    contract_pdf_url: string;
};
