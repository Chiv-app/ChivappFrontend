import type { PaymentStatus } from "./enums";

export type PaymentOut = {
    id: string;
    booking_id: string;
    amount: number;
    currency: string;
    payment_type: string | null;
    evidence_url: string | null;
    evidence_urls?: string[];
    status: PaymentStatus;
    retained_at: string | null;
    released_at: string | null;
    reviewed_by_user_id?: string | null;
    reviewed_at?: string | null;
    rejection_reason?: string | null;
    gateway_provider?: string | null;
    gateway_payment_id?: string | null;
    gateway_preference_id?: string | null;
    created_at: string;
    updated_at: string;
};

export type MercadoPagoPreferenceRequest = {
    booking_id: string;
    payment_type: "full";
    signature_image_url?: string | null;
    sign_ip?: string | null;
};

export type MercadoPagoPreferenceResponse = {
    preference_id: string;
    init_point: string;
    sandbox_init_point?: string | null;
    public_key: string;
    amount: number;
    currency: string;
    payment_type: "full";
};

export type MercadoPagoPaymentCheckResponse = {
    status: "approved" | "pending" | "rejected" | string;
    payment_id?: string | null;
    booking_status: string;
    is_approved: boolean;
    message: string;
};

export type MercadoPagoProcessPaymentRequest = {
    booking_id: string;
    payment_type: "full";
    token: string;
    payment_method_id?: string;
    amount?: number;
    installments?: number;
    issuer_id?: string;
    payer_email?: string;
    device_id?: string;
    identification_type?: string;
    identification_number?: string;
    signature_image_url?: string | null;
    sign_ip?: string | null;
};

export type MercadoPagoProcessPaymentResponse = {
    success: boolean;
    status: string;
    status_detail?: string | null;
    payment_id?: string | null;
    message: string;
};


export type MusicianEarningsItem = {
    payment_id: string;
    booking_id: string;
    event_type: string;
    event_date: string;
    location_city: string | null;
    booking_status: string;
    amount: number;
    currency: string;
    payment_type: string | null;
    status: PaymentStatus;
    retained_at: string | null;
    released_at: string | null;
    created_at: string;
};

export type MusicianDebtItem = {
    booking_id: string;
    event_type: string;
    event_date: string;
    location_city: string | null;
    price_agreed: number | null;
    retained_total: number;
    released_total: number;
    currency: string;
    booking_status: string;
    debt_state: string;
    complaint_status: string | null;
    complaint_reason: string | null;
    admin_musician_amount: number | null;
    admin_contractor_refund: number | null;
};

export type MusicianEarningsSummary = {
    currency: string;
    total_quoted: number;
    total_released: number;
    total_retained: number;
    total_pending: number;
    total_app_debt?: number;
    total_disputed?: number;
    total_retained_active?: number;
    bookings_active: number;
    bookings_completed: number;
    bookings_cancelled: number;
    items: MusicianEarningsItem[];
    debts?: MusicianDebtItem[];
};

export type PlatformPaymentInstructions = {
    phone_number: string;
    phone_label: string;
    account_name: string | null;
    qr_image_url: string | null;
    instructions: string | null;
    platform_fee_percent?: number;
    updated_at?: string | null;
};

export type BookingComplaint = {
    id: string;
    booking_id: string;
    opened_by_user_id: string;
    reason: string;
    evidence_url: string | null;
    status: "open" | "musician_accepted" | "musician_responded" | "settled" | string;
    musician_response: string | null;
    musician_response_evidence_url: string | null;
    musician_responded_at: string | null;
    admin_musician_amount: number | null;
    admin_contractor_refund: number | null;
    admin_notes: string | null;
    settled_at: string | null;
    refund_status?:
        | "none"
        | "awaiting_transfer"
        | "awaiting_validation"
        | "completed"
        | "rejected"
        | string;
    refund_evidence_url?: string | null;
    refund_sent_at?: string | null;
    refund_validated_at?: string | null;
    refund_rejection_reason?: string | null;
    refund_payment_id?: string | null;
    created_at: string;
    updated_at: string;
};

export type MusicianPayoutInfoOut = {
    payout_method?: string | null;
    payout_bank_name?: string | null;
    payout_account_number?: string | null;
    payout_cci?: string | null;
    payout_phone?: string | null;
    payout_beneficiary_name?: string | null;
    payout_beneficiary_document?: string | null;
    payout_mp_email?: string | null;
};

export type AdminSettlementOut = {
    booking_id: string;
    event_type: string;
    event_date: string;
    location_city: string | null;
    price_agreed: number | null;
    retained_total: number;
    released_total: number;
    retained_gross?: number;
    released_gross?: number;
    platform_fee_on_retained?: number;
    currency: string;
    musician_name: string | null;
    musician_id?: string | null;
    contractor_name: string | null;
    booking_status: string;
    settlement_state: string;
    complaint: BookingComplaint | null;
    musician_payout_info?: MusicianPayoutInfoOut | null;
    payout_reference?: string | null;
    payout_evidence_url?: string | null;
    payout_notes?: string | null;
};


export type ContractorExpensesItem = {
    payment_id: string;
    booking_id: string;
    event_type: string;
    event_date: string;
    location_city: string | null;
    musician_stage_name: string | null;
    booking_status: string;
    amount: number;
    currency: string;
    payment_type: string | null;
    status: PaymentStatus;
    retained_at: string | null;
    released_at: string | null;
    created_at: string;
};

export type ContractorExpensesSummary = {
    currency: string;
    total_quoted: number;
    total_released: number;
    total_retained: number;
    total_pending: number;
    bookings_active: number;
    bookings_completed: number;
    bookings_cancelled: number;
    items: ContractorExpensesItem[];
};

export type ContractorOperationKind =
    | "awaiting_quote"
    | "quote_review"
    | "contract_sign"
    | "payment_review"
    | "payment_full"
    | "payment_out"
    | "change_pending"
    | "event_active"
    | "finalize"
    | "dispute"
    | "refund"
    | string;

export type ContractorOperationStatus =
    | "pending_me"
    | "pending_other"
    | "done"
    | "settled"
    | "rejected"
    | "cancelled"
    | string;

export type ContractorOperationDirection = "out" | "in" | "none" | string;

export type ContractorOperationItem = {
    id: string;
    booking_id: string;
    kind: ContractorOperationKind;
    status: ContractorOperationStatus;
    direction: ContractorOperationDirection;
    title: string;
    subtitle: string | null;
    cta_label: string;
    amount: number | null;
    currency: string;
    event_type: string;
    event_date: string;
    location_city: string | null;
    musician_stage_name: string | null;
    booking_status: string;
    payment_type: string | null;
    payment_status: PaymentStatus | null;
    complaint_status: string | null;
    occurred_at: string;
    source: "booking" | "payment" | "settlement" | string;
};

export type ContractorOperationsSummary = {
    currency: string;
    total_out: number;
    total_in: number;
    net_out: number;
    total_quoted: number;
    total_service?: number;
    total_fees?: number;
    total_released: number;
    total_retained: number;
    total_pending: number;
    total_refund_pending?: number;
    pending_me_count: number;
    pending_other_count: number;
    dispute_count: number;
    bookings_active: number;
    bookings_completed: number;
    bookings_cancelled: number;
    items: ContractorOperationItem[];
};
