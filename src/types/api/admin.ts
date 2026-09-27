import type { UserOut } from "./auth";
import type { BookingMessageOut, BookingReviewOut } from "./booking";
import type { BookingComplaint, PaymentOut } from "./payment";
import type { ContractOut } from "./contract";
import type { BookingStatus, PaymentStatus, ProfileStatus } from "./enums";

export type AdminStatsOut = {
    total_users: number;
    total_musicians: number;
    total_contractors: number;
    pending_musician_profiles: number;
    pending_contractor_profiles: number;
    published_musicians: number;
    published_contractors: number;
    total_bookings: number;
    active_bookings: number;
    change_pending_bookings: number;
    payment_review_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    total_payments: number;
    retained_payments_amount: number;
    released_payments_amount: number;
    share_enabled_bookings: number;
};

export type AdminUserOut = UserOut & {
    is_active?: boolean;
    registration_type?: string | null;
};

export type AdminUserUpdate = {
    is_verified?: boolean | null;
    is_active?: boolean | null;
};

export type AdminActivityItem = {
    id: string;
    type: string;
    title: string;
    subtitle: string | null;
    href?: string | null;
    created_at: string;
};

export type ProfileReviewAction = {
    rejection_reason?: string | null;
};

export type AdminProfileStatusUpdate = {
    action: "unpublish" | "request_resubmit";
    reason?: string | null;
};

export type AdminBookingOut = {
    id: string;
    status: BookingStatus | string;
    event_type: string;
    event_date: string;
    start_time: string;
    location_address: string;
    location_city: string | null;
    price_agreed: number | null;
    advance_amount: number | null;
    share_enabled: boolean;
    change_requested_by: string | null;
    musician_id: string;
    contractor_id: string;
    musician_name: string | null;
    contractor_name: string | null;
    musician_email: string | null;
    contractor_email: string | null;
    cancelled_by: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
};

export type AdminBookingCancel = {
    reason?: string | null;
};

export type AdminBookingDetailOut = AdminBookingOut & {
    musician_phone: string | null;
    contractor_phone: string | null;
    balance_due: number;
    amount_paid: number;
    contract: ContractOut | null;
    payments: PaymentOut[];
    messages: BookingMessageOut[];
    complaint: BookingComplaint | null;
    reviews: BookingReviewOut[];
};

export type AdminPaymentOut = {
    id: string;
    booking_id: string;
    amount: number;
    currency: string;
    payment_type: string | null;
    evidence_url: string | null;
    evidence_urls?: string[] | null;
    status: PaymentStatus | string;
    retained_at: string | null;
    released_at: string | null;
    reviewed_by_user_id?: string | null;
    reviewed_at?: string | null;
    rejection_reason?: string | null;
    created_at: string;
    event_type: string | null;
    event_date: string | null;
    musician_name: string | null;
    contractor_name: string | null;
};

export type AdminPaymentReviewItem = {
    booking_id: string;
    booking_status: string;
    kind: "advance" | "balance";
    payment_id: string;
    amount: number;
    currency: string;
    evidence_urls: string[];
    event_type: string;
    event_date: string;
    musician_name: string | null;
    contractor_name: string | null;
    submitted_at: string;
    previous_rejections: number;
};

export type AdminListParams = {
    skip?: number;
    limit?: number;
    q?: string;
    status?: ProfileStatus | BookingStatus | PaymentStatus | string;
    role?: string;
    is_verified?: boolean;
    is_active?: boolean;
};
