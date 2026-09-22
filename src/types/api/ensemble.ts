export type EnsembleMemberStatus = "invited" | "active" | "inactive";

export type EnsembleMemberOut = {
    id: string;
    email: string;
    fullname: string;
    phone: string | null;
    specialties: string[];
    notes: string | null;
    status: EnsembleMemberStatus;
    has_password: boolean;
    invite_url: string | null;
    invite_expires_at?: string | null;
    invite_expired?: boolean;
    member_user_id: string | null;
    invited_at: string | null;
    joined_at: string | null;
    created_at: string;
    updated_at: string;
};

export type EnsembleMemberCreate = {
    fullname: string;
    email: string;
    phone?: string | null;
    specialties: string[];
    notes?: string | null;
};

export type EnsembleMemberUpdate = {
    fullname?: string;
    phone?: string | null;
    specialties?: string[];
    notes?: string | null;
    status?: EnsembleMemberStatus;
};

export type PasswordSetupPreviewOut = {
    email: string;
    fullname: string;
    specialties: string[];
    leader_name: string | null;
    requires_password: boolean;
};

export type BookingMemberInviteStatus = "pending" | "accepted" | "declined";

export type BookingMemberInviteOut = {
    id: string;
    booking_id: string;
    ensemble_member_id: string;
    member_fullname: string;
    member_email: string;
    specialties: string[];
    status: BookingMemberInviteStatus;
    respond_url: string | null;
    invited_at: string | null;
    responded_at: string | null;
};

export type BookingMemberInvitePreviewOut = {
    event_type: string;
    event_date: string;
    start_time: string;
    location_city: string | null;
    location_address: string | null;
    leader_name: string;
    member_fullname: string;
    status: BookingMemberInviteStatus;
    can_respond: boolean;
    needs_password?: boolean;
};

export type BookingMemberPayoutStatus = "draft" | "locked" | "paid";

export type BookingMemberPayoutOut = {
    id: string;
    booking_id: string;
    ensemble_member_id: string;
    member_fullname: string;
    member_email: string;
    amount: number | string;
    currency: string;
    status: BookingMemberPayoutStatus;
    note: string | null;
    set_by_leader_at: string | null;
    paid_at: string | null;
};

export type MemberSettlementLineOut = {
    ensemble_member_id: string;
    member_fullname: string;
    member_email: string;
    invite_status: BookingMemberInviteStatus;
    payout_id: string | null;
    amount: number | string;
    currency: string;
    payout_status: BookingMemberPayoutStatus | null;
    paid_at: string | null;
};

export type MemberSettlementBookingOut = {
    booking_id: string;
    event_type: string;
    event_date: string;
    start_time: string;
    location_city: string | null;
    status: string;
    price_agreed: number | string | null;
    currency: string;
    can_pay: boolean;
    has_contractor_review: boolean;
    members: MemberSettlementLineOut[];
    total_assigned: number | string;
    total_paid: number | string;
    total_pending: number | string;
};

export type MyMemberIncomeItem = {
    payout_id: string;
    booking_id: string;
    event_type: string;
    event_date: string;
    location_city: string | null;
    booking_status: string;
    leader_name: string | null;
    amount: number | string;
    currency: string;
    status: BookingMemberPayoutStatus;
    note: string | null;
    set_by_leader_at: string | null;
    paid_at: string | null;
};

export type MyMemberIncomeSummary = {
    currency: string;
    total_assigned: number | string;
    total_pending: number | string;
    total_paid: number | string;
    items: MyMemberIncomeItem[];
};

export type MemberPayoutHistoryItem = {
    payout_id: string;
    booking_id: string;
    event_type: string;
    event_date: string;
    location_city: string | null;
    booking_status: string;
    amount: number | string;
    currency: string;
    status: BookingMemberPayoutStatus;
    note: string | null;
    set_by_leader_at: string | null;
    paid_at: string | null;
};

export type MemberPayoutHistoryOut = {
    member_id: string;
    member_fullname: string;
    member_email: string;
    currency: string;
    total_assigned: number | string;
    total_pending: number | string;
    total_paid: number | string;
    shows_count: number;
    items: MemberPayoutHistoryItem[];
};

export type MusicianReportSeriesPoint = {
    bucket: string;
    label: string;
    bookings: number;
    revenue: number;
    released: number;
    retained: number;
    member_paid: number;
};

export type MusicianReportStatusSlice = {
    key: string;
    label: string;
    count: number;
    value?: number;
};

export type MusicianReportMemberRow = {
    ensemble_member_id: string;
    fullname: string;
    email: string;
    status: string;
    shows: number;
    assigned: number;
    paid: number;
    pending: number;
};

export type MusicianReportBookingRow = {
    booking_id: string;
    event_type: string;
    event_date: string;
    location_city: string | null;
    status: string;
    price_agreed: number | null;
    retained: number;
    released: number;
    member_assigned: number;
    member_paid: number;
};

export type MusicianReportsOut = {
    currency: string;
    period_from: string;
    period_to: string;
    group_by: string;
    bookings_total: number;
    bookings_completed: number;
    bookings_cancelled: number;
    bookings_active: number;
    revenue_quoted: number;
    revenue_retained: number;
    revenue_released: number;
    member_assigned: number;
    member_paid: number;
    member_pending: number;
    rating_avg: number | null;
    rating_count: number;
    complaints_total: number;
    complaints_open: number;
    complaints_settled: number;
    series: MusicianReportSeriesPoint[];
    bookings_by_status: MusicianReportStatusSlice[];
    payouts_by_status: MusicianReportStatusSlice[];
    top_members: MusicianReportMemberRow[];
    bookings_table: MusicianReportBookingRow[];
    members_table: MusicianReportMemberRow[];
};
