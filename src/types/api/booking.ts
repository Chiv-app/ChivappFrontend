import type { BookingStatus } from "./enums";

export type BookingCreate = {
    musician_id: string;
    event_date: string;
    start_time: string;
    end_time?: string | null;
    location_address: string;
    location_city?: string | null;
    location_reference?: string | null;
    event_type: string;
    event_description?: string | null;
};

export type MusicianBookingCreate = {
    contractor_fullname: string;
    contractor_email?: string | null;
    contractor_phone?: string | null;
    document_type?: string | null;
    document_number?: string | null;
    contractor_address?: string | null;
    contractor_city?: string | null;
    event_date: string;
    start_time: string;
    end_time?: string | null;
    location_address: string;
    location_city?: string | null;
    location_reference?: string | null;
    event_type: string;
    event_description?: string | null;
    price_agreed: number;
    advance_amount?: number | null;
    musician_quote_notes?: string | null;
    contractor_signature_url?: string | null;
    payment_evidence_url?: string | null;
    payment_evidence_urls?: string[];
    payment_amount?: number | null;
    payment_type?: "advance" | "full" | null;
    mark_payment_validated?: boolean;
};

export type MusicianAttachContractorSignature = {
    signature_image_url: string;
    terms_accepted?: boolean;
    payment_evidence_url?: string | null;
    payment_evidence_urls?: string[];
    payment_amount?: number | null;
    payment_type?: "advance" | "full" | null;
    mark_payment_validated?: boolean;
    sign_ip?: string;
};

export type BookingUpdate = {
    event_date?: string;
    start_time?: string;
    end_time?: string | null;
    location_address?: string;
    location_city?: string | null;
    location_reference?: string | null;
    event_type?: string;
    event_description?: string | null;
};

export type BookingRequestedRepertoireUpdate = {
    requested_repertoire: string[];
};

export type BookingReopenQuote = {
    event_date?: string;
    start_time?: string;
    end_time?: string | null;
    location_address?: string;
    location_city?: string | null;
    location_reference?: string | null;
    event_type?: string;
    event_description?: string | null;
    requested_repertoire?: string[] | null;
};

export type BookingQuote = {
    price_agreed: number;
    advance_amount?: number | null;
    musician_quote_notes?: string | null;
    location_address?: string | null;
    location_city?: string | null;
    location_reference?: string | null;
};

export type BookingReject = {
    rejection_reason?: string | null;
};

export type BookingConfirm = {
    terms_accepted: boolean;
    payment_evidence_url?: string | null;
    payment_evidence_urls?: string[];
    signature_image_url: string;
    amount: number;
    payment_type: "advance" | "full";
    sign_ip?: string;
};

export type BookingEventChangeRequest = {
    location_address?: string | null;
    location_city?: string | null;
    location_reference?: string | null;
    event_description?: string | null;
    change_notes?: string | null;
    price_agreed?: number | null;
    advance_amount?: number | null;
};

export type BookingChangeDecision = {
    accept: boolean;
    price_agreed?: number | null;
    advance_amount?: number | null;
};

export type BookingBalancePayment = {
    amount: number;
    payment_evidence_url?: string | null;
    payment_evidence_urls?: string[];
};

export type BookingMessageCreate = {
    body: string;
};

export type BookingMessageOut = {
    id: string;
    booking_id: string;
    sender_user_id: string;
    sender_name: string | null;
    body: string;
    created_at: string;
};

export type BookingReviewCreate = {
    rating: number;
    emoji?: string | null;
    comment?: string | null;
    photo_urls?: string[];
    video_urls?: string[];
    is_final?: boolean;
};

export type BookingGuestReviewCreate = {
    rating: number;
    emoji?: string | null;
    comment?: string | null;
    photo_urls?: string[];
    video_urls?: string[];
    guest_name: string;
};

export type BookingReviewOut = {
    id: string;
    booking_id: string;
    author_user_id: string | null;
    guest_name: string | null;
    author_label: string | null;
    rating: number;
    emoji: string | null;
    comment: string | null;
    photo_urls: string[] | null;
    video_urls: string[] | null;
    is_final?: boolean;
    created_at: string;
    updated_at: string;
};

export type ContractorRecommendationCreate = {
    rating: number;
    comment: string;
};

export type ContractorRecommendationOut = {
    id: string;
    booking_id: string;
    musician_id: string;
    contractor_id: string;
    rating: number;
    comment: string;
    musician_name: string | null;
    created_at: string;
};

export type BookingShareOut = {
    booking_id: string;
    enabled: boolean;
    can_enable: boolean;
    token: string | null;
    path: string | null;
    reason: string | null;
    share_enabled_at: string | null;
};

export type BookingSharePublicOut = {
    token: string;
    event_type: string;
    event_date: string;
    start_time: string;
    end_time: string | null;
    location_city: string | null;
    musician_name: string | null;
    status: BookingStatus;
    calendar_event_id?: string | null;
    reactions_open: boolean;
    message: string;
};

export type BookingBalanceDue = {
    booking_id: string;
    price_agreed: number | null;
    platform_fee_percent?: number | null;
    platform_fee_amount?: number | null;
    contractor_total?: number | null;
    suggested_advance?: number | null;
    suggested_remaining?: number | null;
    balance_due: number;
    amount_paid?: number;
    currency: string;
};

export type BookingOut = {
    id: string;
    contractor_id: string;
    musician_id: string;
    event_date: string;
    start_time: string;
    end_time: string | null;
    location_address: string;
    location_city: string | null;
    location_reference: string | null;
    event_type: string;
    event_description: string | null;
    requested_repertoire?: string[] | null;
    price_agreed: number | null;
    advance_amount: number | null;
    platform_fee_percent?: number | null;
    platform_fee_amount?: number | null;
    musician_quote_notes: string | null;
    quoted_at: string | null;
    rejection_reason: string | null;
    cancelled_by: string | null;
    pending_location_address: string | null;
    pending_location_city: string | null;
    pending_location_reference: string | null;
    pending_event_description: string | null;
    pending_change_notes: string | null;
    pending_price_agreed: number | null;
    pending_advance_amount: number | null;
    change_requested_by: "contractor" | "musician" | string | null;
    change_requested_at: string | null;
    status: BookingStatus;
    calendar_event_id?: string | null;
    created_at: string;
    updated_at: string;
    musician_name?: string | null;
    musician_image_url?: string | null;
    contractor_name?: string | null;
    contractor_image_url?: string | null;
    /** owner = líder/contratista; member = integrante asociado */
    viewer_role?: "owner" | "member" | null;
    /** pending | accepted | declined — solo relevante si viewer_role=member */
    member_invite_status?: "pending" | "accepted" | "declined" | string | null;
    complaint_status?: string | null;
    complaint_reason?: string | null;
};

