import { apiFetch } from "@/lib/api";
import type {
    BookingMemberInviteOut,
    BookingMemberInvitePreviewOut,
    BookingMemberPayoutOut,
    BookingOut,
    EnsembleMemberCreate,
    EnsembleMemberOut,
    EnsembleMemberUpdate,
    MemberPayoutHistoryOut,
    MemberSettlementBookingOut,
    MusicianReportsOut,
    MyMemberIncomeSummary,
    PasswordSetupPreviewOut,
} from "@/types/api";

export function listEnsembleMembers(params?: {
    status?: string;
    q?: string;
}): Promise<EnsembleMemberOut[]> {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    return apiFetch(`/musician/members${qs ? `?${qs}` : ""}`);
}

export function createEnsembleMember(
    payload: EnsembleMemberCreate,
): Promise<EnsembleMemberOut> {
    return apiFetch("/musician/members", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function getEnsembleMember(id: string): Promise<EnsembleMemberOut> {
    return apiFetch(`/musician/members/${id}`);
}

export function updateEnsembleMember(
    id: string,
    payload: EnsembleMemberUpdate,
): Promise<EnsembleMemberOut> {
    return apiFetch(`/musician/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export function resendEnsembleInvite(id: string): Promise<EnsembleMemberOut> {
    return apiFetch(`/musician/members/${id}/resend-invite`, {
        method: "POST",
    });
}

export function deactivateEnsembleMember(
    id: string,
): Promise<EnsembleMemberOut> {
    return apiFetch(`/musician/members/${id}`, { method: "DELETE" });
}

export function previewPasswordSetup(
    token: string,
): Promise<PasswordSetupPreviewOut> {
    return apiFetch(`/auth/password-setup/${encodeURIComponent(token)}`);
}

export function setPassword(payload: {
    password: string;
    token?: string | null;
}): Promise<import("@/types/api").UserOut> {
    return apiFetch("/auth/set-password", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function listBookingMemberInvites(
    bookingId: string,
): Promise<BookingMemberInviteOut[]> {
    return apiFetch(`/bookings/${bookingId}/member-invites`);
}

export function createBookingMemberInvites(
    bookingId: string,
    ensembleMemberIds: string[],
): Promise<BookingMemberInviteOut[]> {
    return apiFetch(`/bookings/${bookingId}/member-invites`, {
        method: "POST",
        body: JSON.stringify({ ensemble_member_ids: ensembleMemberIds }),
    });
}

export function previewBookingMemberInvite(
    token: string,
): Promise<BookingMemberInvitePreviewOut> {
    return apiFetch(`/invites/member/${encodeURIComponent(token)}`);
}

export function respondBookingMemberInvite(
    token: string,
    action: "accept" | "decline",
    password?: string,
): Promise<BookingMemberInvitePreviewOut> {
    return apiFetch(`/invites/member/${encodeURIComponent(token)}/respond`, {
        method: "POST",
        body: JSON.stringify(password ? { action, password } : { action }),
    });
}

export function respondMyBookingMemberInvite(
    bookingId: string,
    action: "accept" | "decline",
): Promise<BookingOut> {
    return apiFetch(`/bookings/${bookingId}/member-invites/me/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
    });
}

export function listBookingMemberPayouts(
    bookingId: string,
): Promise<BookingMemberPayoutOut[]> {
    return apiFetch(`/bookings/${bookingId}/member-payouts`);
}

export function upsertBookingMemberPayouts(
    bookingId: string,
    items: { ensemble_member_id: string; amount: number; note?: string | null }[],
    lock = false,
): Promise<BookingMemberPayoutOut[]> {
    return apiFetch(`/bookings/${bookingId}/member-payouts`, {
        method: "PUT",
        body: JSON.stringify({ items, lock }),
    });
}

export function markBookingMemberPayoutPaid(
    bookingId: string,
    payoutId: string,
): Promise<BookingMemberPayoutOut> {
    return apiFetch(
        `/bookings/${bookingId}/member-payouts/${payoutId}/mark-paid`,
        { method: "POST" },
    );
}

export function listMemberSettlements(): Promise<MemberSettlementBookingOut[]> {
    return apiFetch("/musician/member-settlements");
}

export function listMyMemberIncome(): Promise<MyMemberIncomeSummary> {
    return apiFetch("/musician/my-income");
}

export function getMemberPayoutHistory(
    memberId: string,
    params?: { status?: string },
): Promise<MemberPayoutHistoryOut> {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return apiFetch(
        `/musician/members/${memberId}/payouts${qs ? `?${qs}` : ""}`,
    );
}

export function getMusicianReports(params?: {
    date_from?: string;
    date_to?: string;
    group_by?: "month" | "week";
    status?: string;
}): Promise<MusicianReportsOut> {
    const search = new URLSearchParams();
    if (params?.date_from) search.set("date_from", params.date_from);
    if (params?.date_to) search.set("date_to", params.date_to);
    if (params?.group_by) search.set("group_by", params.group_by);
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return apiFetch(`/musician/reports${qs ? `?${qs}` : ""}`);
}

export function listMyCalls(): Promise<BookingMemberInviteOut[]> {
    return apiFetch("/musician/my-calls");
}
