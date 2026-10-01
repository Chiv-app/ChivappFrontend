export type UserRole = "contractor" | "musician" | "admin";

export type ProfileStatus = "draft" | "pending_review" | "published" | "rejected";

export type BookingStatus =
    | "requested"
    | "accepted"
    | "contract_pending"
    | "contract_signed"
    | "payment_pending"
    | "payment_retained"
    | "change_pending"
    /** Legacy (flujo anticipo/saldo): ya no se alcanza; se trata como confirmada. */
    | "balance_pending"
    /** Legacy (flujo anticipo/saldo): ya no se alcanza; se trata como confirmada. */
    | "balance_review"
    | "in_progress"
    | "payment_released"
    | "completed"
    | "cancelled";

export type PaymentStatus =
    | "initiated"
    | "retained"
    | "released"
    | "refunded"
    | "failed"
    | "rejected";

export type AvailabilityType = "hourly" | "per_event" | "both";

export type MediaType = "image" | "video" | "audio";
