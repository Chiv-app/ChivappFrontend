import { apiFetch } from "./api";

export type BookingLinkStatus = "active" | "completed" | "expired";

export type MusicianReviewOut = {
    guest_name?: string | null;
    rating: number;
    comment?: string | null;
    created_at: string;
};

export type MusicianLinkProfile = {
    id: string;
    stage_name: string;
    profile_image_url: string | null;
    portfolio_description?: string | null;
    gallery_images?: string[] | null;
    videos?: string[] | null;
    showreel_video_url?: string | null;
    rating_avg?: number | null;
    rating_count?: number | null;
    genres?: string[] | null;
    instruments?: string[] | null;
    location_city?: string | null;
    reviews?: MusicianReviewOut[] | null;
};

export type CancellationPolicyPublicOut = {
    full_refund_min_days: number;
    partial_refund_min_days: number;
    partial_refund_percent: number;
};

export type BookingLinkDraftData = {
    event_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    event_type?: string | null;
    location_address?: string | null;
    location_city?: string | null;
    location_reference?: string | null;
    event_description?: string | null;
    client_fullname?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    client_document_number?: string | null;
    has_signature?: boolean | null;
    payment_modal_opened?: boolean | null;
    updated_at?: string | null;
};

export type BookingLinkPublicOut = {
    token: string;
    price: number;
    fee_percent?: number | null;
    fee_amount?: number | null;
    total_payable?: number | null;
    event_date: string | null;
    start_time: string | null;
    end_time?: string | null;
    event_type?: string | null;
    location_address?: string | null;
    location_city?: string | null;
    location_reference?: string | null;
    client_fullname?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    client_document_number?: string | null;
    event_description?: string | null;
    source?: string | null;
    musician: MusicianLinkProfile;
    status: BookingLinkStatus;
    expires_at: string;
    cancellation_policy?: CancellationPolicyPublicOut | null;
    contract_template_title?: string | null;
    contract_template_body?: string | null;
    open_count?: number;
    first_opened_at?: string | null;
    last_opened_at?: string | null;
    last_activity_at?: string | null;
    current_step?: number;
    max_step_reached?: number;
    draft_data?: BookingLinkDraftData | null;
};

export type BookingLinkCheckout = {
    event_date: string;
    start_time: string;
    end_time?: string | null;
    event_type: string;
    location_address: string;
    location_city?: string | null;
    location_reference?: string | null;
    fullname: string;
    email: string;
    phone: string;
    document_number?: string | null;
    event_description?: string | null;
    signature_image_url?: string | null;
    accept_terms?: boolean;
    otp?: string | null;
    password?: string | null;
};

export async function getBookingLinkPublic(token: string): Promise<BookingLinkPublicOut> {
    return apiFetch<BookingLinkPublicOut>(`/booking-links/${token}`, { cache: "no-store" });
}

export async function checkoutBookingLink(
    token: string,
    payload: BookingLinkCheckout
): Promise<{
    message: string;
    booking_id: string;
    signature_image_url?: string | null;
    contract_body_sha256?: string | null;
}> {
    return apiFetch<{
        message: string;
        booking_id: string;
        signature_image_url?: string | null;
        contract_body_sha256?: string | null;
    }>(
        `/booking-links/${token}/checkout`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        }
    );
}


export type BookingLinkOut = {
    id: string;
    token: string;
    musician_id: string;
    price: number;
    event_date: string | null;
    start_time: string | null;
    end_time?: string | null;
    event_type?: string | null;
    location_address?: string | null;
    location_city?: string | null;
    location_reference?: string | null;
    client_fullname?: string | null;
    client_phone?: string | null;
    client_email: string | null;
    client_document_number?: string | null;
    event_description?: string | null;
    source?: string | null;
    status: BookingLinkStatus;
    expires_at: string;
    booking_id: string | null;
    open_count?: number;
    first_opened_at?: string | null;
    last_opened_at?: string | null;
    last_activity_at?: string | null;
    current_step?: number;
    max_step_reached?: number;
    draft_data?: BookingLinkDraftData | null;
    created_at: string;
    updated_at: string;
};

export type BookingLinkProgressUpdate = {
    record_open?: boolean;
    current_step?: number;
    event_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    event_type?: string | null;
    location_address?: string | null;
    location_city?: string | null;
    location_reference?: string | null;
    event_description?: string | null;
    client_fullname?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    client_document_number?: string | null;
    has_signature?: boolean | null;
    payment_modal_opened?: boolean | null;
};

export type BookingLinkProgressOut = {
    open_count: number;
    first_opened_at?: string | null;
    last_opened_at?: string | null;
    last_activity_at?: string | null;
    current_step: number;
    max_step_reached: number;
    draft_data: BookingLinkDraftData;
    saved_at: string;
};

export async function saveBookingLinkProgress(
    token: string,
    payload: BookingLinkProgressUpdate
): Promise<BookingLinkProgressOut> {
    return apiFetch<BookingLinkProgressOut>(`/booking-links/${token}/progress`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export type BookingLinkAutocompleteOut = {
    transcript?: string | null;
    price?: number | null;
    event_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    event_type?: string | null;
    location_address?: string | null;
    location_city?: string | null;
    location_reference?: string | null;
    client_fullname?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    client_document_number?: string | null;
    event_description?: string | null;
};

export async function autocompleteBookingLink(payload: {
    text?: string | null;
    audio_base64?: string | null;
    audio_mime_type?: string | null;
}): Promise<BookingLinkAutocompleteOut> {
    return apiFetch<BookingLinkAutocompleteOut>("/booking-links/autocomplete", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function getMyBookingLinks(): Promise<BookingLinkOut[]> {
    return apiFetch<BookingLinkOut[]>("/booking-links/me");
}

export async function resetBookingLinkExpiration(token: string): Promise<BookingLinkOut> {
    return apiFetch<BookingLinkOut>(`/booking-links/${token}/reset-expiration`, {
        method: "POST",
    });
}

export type BookingLinkIdentityStatus = 'self' | 'exists_verified' | 'exists_unverified' | 'new';

export type BookingLinkIdentityResponse = {
    status: BookingLinkIdentityStatus;
    message?: string | null;
};

export async function checkIdentityBookingLink(token: string, email: string): Promise<BookingLinkIdentityResponse> {
    return apiFetch<BookingLinkIdentityResponse>(`/booking-links/${token}/check-identity`, {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export async function sendOtpBookingLink(token: string, email: string): Promise<{message: string}> {
    return apiFetch<{message: string}>(`/booking-links/${token}/send-otp`, {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}
