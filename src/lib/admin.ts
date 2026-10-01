import { ApiError, apiFetch } from "@/lib/api";
import type {
    AdminActivityItem,
    AdminApproveRefund,
    AdminBookingCancel,
    AdminBookingDetailOut,
    AdminBookingOut,
    AdminListParams,
    AdminPaymentOut,
    AdminProfileStatusUpdate,
    AdminStatsOut,
    AdminSupportTicketOut,
    AdminUserOut,
    AdminUserUpdate,
    ContractorProfileAdminOut,
    MusicianProfileAdminOut,
    ProfileReviewAction,
    SupportTicketRespond,
} from "@/types/api";

function getApiUrl(): string {
    if (typeof window !== "undefined") {
        return process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    }
    return (
        process.env.API_URL_INTERNAL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:8000/api/v1"
    );
}

function toQuery(params: AdminListParams = {}) {
    const search = new URLSearchParams();
    if (params.skip != null) search.set("skip", String(params.skip));
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", String(params.status));
    if (params.refund_status) search.set("refund_status", params.refund_status);
    if (params.role) search.set("role", params.role);
    if (params.is_verified != null) search.set("is_verified", String(params.is_verified));
    if (params.is_active != null) search.set("is_active", String(params.is_active));
    const qs = search.toString();
    return qs ? `?${qs}` : "";
}

export function getAdminStats() {
    return apiFetch<AdminStatsOut>("/admin/stats");
}

export function getAdminUsers(params: AdminListParams = {}) {
    return apiFetch<AdminUserOut[]>(`/admin/users${toQuery({ limit: 50, ...params })}`);
}

export function updateAdminUser(userId: string, payload: AdminUserUpdate) {
    return apiFetch<AdminUserOut>(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export function getAdminMusicians(params: AdminListParams = {}) {
    return apiFetch<MusicianProfileAdminOut[]>(
        `/admin/musicians${toQuery({ limit: 50, ...params })}`,
    );
}

export function getAdminContractors(params: AdminListParams = {}) {
    return apiFetch<ContractorProfileAdminOut[]>(
        `/admin/contractors${toQuery({ limit: 50, ...params })}`,
    );
}

export function getPendingMusicians() {
    return apiFetch<MusicianProfileAdminOut[]>("/admin/musicians/pending");
}

export function getPendingContractors() {
    return apiFetch<ContractorProfileAdminOut[]>("/admin/contractors/pending");
}

export function getAdminActivity(limit = 30) {
    return apiFetch<AdminActivityItem[]>(`/admin/activity?limit=${limit}`);
}

export function approveMusicianProfile(musicianId: string) {
    return apiFetch<MusicianProfileAdminOut>(`/admin/musicians/${musicianId}/approve`, {
        method: "POST",
    });
}

export function rejectMusicianProfile(musicianId: string, payload: ProfileReviewAction) {
    return apiFetch<MusicianProfileAdminOut>(`/admin/musicians/${musicianId}/reject`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function moderateMusicianProfile(
    musicianId: string,
    payload: AdminProfileStatusUpdate,
) {
    return apiFetch<MusicianProfileAdminOut>(`/admin/musicians/${musicianId}/moderate`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function approveContractorProfile(contractorId: string) {
    return apiFetch<ContractorProfileAdminOut>(`/admin/contractors/${contractorId}/approve`, {
        method: "POST",
    });
}

export function rejectContractorProfile(
    contractorId: string,
    payload: ProfileReviewAction,
) {
    return apiFetch<ContractorProfileAdminOut>(
        `/admin/contractors/${contractorId}/reject`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function moderateContractorProfile(
    contractorId: string,
    payload: AdminProfileStatusUpdate,
) {
    return apiFetch<ContractorProfileAdminOut>(
        `/admin/contractors/${contractorId}/moderate`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function getMusicianAdminDetail(musicianId: string) {
    return apiFetch<MusicianProfileAdminOut>(`/admin/musicians/${musicianId}`);
}

export function getContractorAdminDetail(contractorId: string) {
    return apiFetch<ContractorProfileAdminOut>(`/admin/contractors/${contractorId}`);
}

export function getAdminBookings(params: AdminListParams = {}) {
    return apiFetch<AdminBookingOut[]>(
        `/admin/bookings${toQuery({ limit: 50, ...params })}`,
    );
}

export function getAdminBooking(bookingId: string) {
    return apiFetch<AdminBookingOut>(`/admin/bookings/${bookingId}`);
}

export function getAdminBookingDetail(bookingId: string) {
    return apiFetch<AdminBookingDetailOut>(`/admin/bookings/${bookingId}/detail`);
}

/** PDF generado on-demand desde el snapshot (o legacy). Requiere sesión de admin. */
export async function getAdminBookingContractPdfBlob(bookingId: string): Promise<Blob> {
    const endpoint = `/admin/bookings/${bookingId}/contract-pdf`;
    let res: Response;
    try {
        res = await fetch(`${getApiUrl()}${endpoint}`, {
            method: "GET",
            credentials: "include",
        });
    } catch {
        throw new ApiError(
            endpoint,
            0,
            "No se pudo conectar con el servidor. Verifica que la aplicación esté en ejecución.",
        );
    }

    if (!res.ok) {
        let message = `Error ${res.status}`;
        try {
            const body = await res.json();
            if (typeof body.detail === "string") message = body.detail;
        } catch {
            // ignore
        }
        throw new ApiError(endpoint, res.status, message);
    }

    return res.blob();
}

export function cancelAdminBooking(bookingId: string, payload: AdminBookingCancel = {}) {
    return apiFetch<AdminBookingOut>(`/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/**
 * Aprueba el reembolso de una cancelación pendiente de aprobación.
 * Sin `amount` (o null) se reembolsa el monto calculado por la política;
 * `0` rechaza el reembolso. El backend responde 400 si supera lo retenido.
 */
export function approveAdminCancellationRefund(
    bookingId: string,
    amount?: string | number | null,
) {
    const payload: AdminApproveRefund = { amount: amount ?? null };
    return apiFetch<AdminBookingOut>(`/admin/bookings/${bookingId}/approve-refund`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/** Reintenta en Mercado Pago un reembolso de cancelación fallido o pendiente. */
export function retryAdminCancellationRefund(bookingId: string) {
    return apiFetch<AdminBookingOut>(`/admin/bookings/${bookingId}/retry-refund`, {
        method: "POST",
    });
}

export function disableAdminBookingShare(bookingId: string) {
    return apiFetch<AdminBookingOut>(`/admin/bookings/${bookingId}/disable-share`, {
        method: "POST",
    });
}

export function getAdminPayments(params: AdminListParams = {}) {
    return apiFetch<AdminPaymentOut[]>(
        `/admin/payments${toQuery({ limit: 50, ...params })}`,
    );
}

export function getAdminPaymentInstructions() {
    return apiFetch<import("@/types/api").PlatformPaymentInstructions>(
        "/admin/payment-instructions",
    );
}

export function updateAdminPaymentInstructions(payload: {
    phone_number: string;
    phone_label?: string;
    account_name?: string | null;
    qr_image_url?: string | null;
    instructions?: string | null;
    platform_fee_percent?: number;
}) {
    return apiFetch<import("@/types/api").PlatformPaymentInstructions>(
        "/admin/payment-instructions",
        {
            method: "PUT",
            body: JSON.stringify(payload),
        },
    );
}

export function getAdminSettlements(params: { state?: string; limit?: number } = {}) {
    return apiFetch<import("@/types/api").AdminSettlementOut[]>(
        `/admin/settlements${toQuery({ limit: 50, ...params })}`,
    );
}

export function settleAdminBooking(
    bookingId: string,
    payload: {
        musician_amount: number;
        contractor_refund: number;
        notes?: string | null;
        payout_reference?: string | null;
        payout_evidence_url?: string | null;
    },
) {
    return apiFetch<import("@/types/api").AdminSettlementOut>(
        `/admin/settlements/${bookingId}/settle`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function releaseAdminSettlement(
    bookingId: string,
    payload: {
        payout_reference?: string | null;
        payout_evidence_url?: string | null;
        payout_notes?: string | null;
    } = {},
) {
    return apiFetch<import("@/types/api").AdminSettlementOut>(
        `/admin/settlements/${bookingId}/release`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function getAdminSettlementsExportUrl(state?: string): string {
    const base = getApiUrl();
    const qs = state ? `?state=${encodeURIComponent(state)}` : "";
    return `${base}/admin/settlements/export${qs}`;
}


export function sendAdminRefundTransfer(
    bookingId: string,
    payload: {
        evidence_url: string;
        notes?: string | null;
    },
) {
    return apiFetch<import("@/types/api").AdminSettlementOut>(
        `/admin/settlements/${bookingId}/refund-transfer`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function getAdminEmailTemplates() {
    return apiFetch<import("@/types/api").EmailTemplateOut[]>("/admin/email/templates");
}

export function updateAdminEmailTemplate(
    slug: string,
    payload: import("@/types/api").EmailTemplateUpdate,
) {
    return apiFetch<import("@/types/api").EmailTemplateOut>(`/admin/email/templates/${slug}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export function previewAdminEmailTemplate(
    slug: string,
    payload: import("@/types/api").EmailTemplatePreviewRequest = {},
) {
    return apiFetch<import("@/types/api").EmailLogOut>(
        `/admin/email/templates/${slug}/preview`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function renderAdminEmailTemplate(
    slug: string,
    payload: import("@/types/api").EmailTemplateRenderRequest = {},
) {
    return apiFetch<import("@/types/api").EmailTemplateRenderOut>(
        `/admin/email/templates/${slug}/render`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function getAdminEmailLogs(params: {
    skip?: number;
    limit?: number;
    status?: string;
    template_slug?: string;
    q?: string;
} = {}) {
    const search = new URLSearchParams();
    if (params.skip != null) search.set("skip", String(params.skip));
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.status) search.set("status", params.status);
    if (params.template_slug) search.set("template_slug", params.template_slug);
    if (params.q) search.set("q", params.q);
    const qs = search.toString();
    return apiFetch<import("@/types/api").EmailLogOut[]>(
        `/admin/email/logs${qs ? `?${qs}` : ""}`,
    );
}

export function getAdminSupportTickets(params: AdminListParams = {}) {
    return apiFetch<AdminSupportTicketOut[]>(
        `/admin/support/tickets${toQuery({ limit: 50, ...params })}`,
    );
}

export function getAdminSupportTicket(ticketId: string) {
    return apiFetch<AdminSupportTicketOut>(`/admin/support/tickets/${ticketId}`);
}

export function respondAdminSupportTicket(ticketId: string, payload: SupportTicketRespond) {
    return apiFetch<AdminSupportTicketOut>(`/admin/support/tickets/${ticketId}/respond`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
