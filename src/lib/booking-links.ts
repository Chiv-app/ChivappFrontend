import { apiFetch } from "./api";

export type BookingLinkStatus = "active" | "completed" | "expired";

export type MusicianLinkProfile = {
    id: string;
    stage_name: string;
    profile_picture_url: string | null;
};

export type BookingLinkPublicOut = {
    token: string;
    price: number;
    event_date: string | null;
    start_time: string | null;
    musician: MusicianLinkProfile;
    status: BookingLinkStatus;
    expires_at: string;
};

export type BookingLinkCheckout = {
    event_date: string;
    start_time: string;
    event_type: string;
    location_address: string;
    location_city?: string | null;
    fullname: string;
    email: string;
    phone: string;
    document_number?: string | null;
};

export async function getBookingLinkPublic(token: string): Promise<BookingLinkPublicOut> {
    return apiFetch<BookingLinkPublicOut>(`/booking-links/${token}`);
}

export async function checkoutBookingLink(token: string, payload: BookingLinkCheckout): Promise<{ message: string; booking_id: string }> {
    return apiFetch<{ message: string; booking_id: string }>(`/booking-links/${token}/checkout`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}


export type BookingLinkOut = {
    id: string;
    token: string;
    musician_id: string;
    price: number;
    event_date: string | null;
    start_time: string | null;
    client_email: string | null;
    status: BookingLinkStatus;
    expires_at: string;
    booking_id: string | null;
    created_at: string;
    updated_at: string;
};

export async function getMyBookingLinks(): Promise<BookingLinkOut[]> {
    return apiFetch<BookingLinkOut[]>("/booking-links/me");
}

export async function resetBookingLinkExpiration(token: string): Promise<BookingLinkOut> {
    return apiFetch<BookingLinkOut>(`/booking-links/${token}/reset-expiration`, {
        method: "POST",
    });
}
