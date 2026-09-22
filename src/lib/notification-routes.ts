import type { NotificationOut, UserRole } from "@/types/api";

const BOOKING_NOTIFICATION_TYPES = new Set([
    "booking_requested",
    "booking_updated",
    "booking_quoted",
    "booking_quote_updated",
    "booking_quote_accepted",
    "booking_confirmed",
    "booking_rejected",
    "booking_cancelled",
    "booking_change_requested",
    "booking_change_accepted",
    "booking_change_rejected",
    "booking_commitment_updated",
    "booking_message",
    "booking_event_started",
    "live_location_requested",
    "live_location_sharing",
    "balance_submitted",
    "balance_validated",
    "balance_rejected",
    "booking_completed",
    "booking_review",
    "booking_complaint_opened",
    "booking_complaint_musician_update",
    "booking_settled",
    "booking_settled_refund",
    "booking_refund_transfer",
    "booking_refund_validated",
    "booking_refund_rejected",
    "payment_validated",
    "payment_rejected",
    "payment_released",
]);

const PROFILE_NOTIFICATION_TYPES = new Set([
    "profile_submitted",
    "profile_approved",
    "profile_rejected",
    "profile_needs_resubmit",
    "profile_review_requested",
]);

export type NotificationAudience = Extract<
    UserRole,
    "musician" | "contractor" | "admin"
>;

export function isBookingNotification(type: string): boolean {
    return BOOKING_NOTIFICATION_TYPES.has(type);
}

export function isProfileNotification(type: string): boolean {
    return PROFILE_NOTIFICATION_TYPES.has(type);
}

export function getBookingIdFromNotification(
    meta: Record<string, unknown> | null | undefined,
): string | null {
    const bookingId = meta?.booking_id;
    return typeof bookingId === "string" && bookingId.length > 0 ? bookingId : null;
}

function getProfileRoleFromMeta(
    meta: Record<string, unknown> | null | undefined,
): "musician" | "contractor" | null {
    const role = meta?.profile_role;
    if (role === "musician" || role === "contractor") return role;
    return null;
}

export function getNotificationHref(
    notification: Pick<NotificationOut, "type" | "meta">,
    role: NotificationAudience,
): string | null {
    if (notification.type === "ensemble_invite") {
        const inviteUrl = notification.meta?.invite_url;
        if (typeof inviteUrl === "string" && inviteUrl.length > 0) {
            try {
                const parsed = new URL(inviteUrl, "http://local");
                return `${parsed.pathname}${parsed.search}`;
            } catch {
                return "/set-password";
            }
        }
        return "/set-password";
    }

    if (
        notification.type === "ensemble_member_joined"
    ) {
        return role === "musician" ? "/musician/members" : null;
    }

    if (notification.type === "booking_member_response") {
        const bookingId = getBookingIdFromNotification(notification.meta);
        if (bookingId && role === "musician") {
            return `/musician/bookings/${bookingId}`;
        }
        return role === "musician" ? "/musician/members" : null;
    }

    if (notification.type === "booking_member_invite") {
        const bookingId = getBookingIdFromNotification(notification.meta);
        if (bookingId) return `/musician/bookings/${bookingId}`;
        const respondUrl = notification.meta?.respond_url;
        if (typeof respondUrl === "string" && respondUrl.length > 0) {
            try {
                const parsed = new URL(respondUrl, "http://local");
                return `${parsed.pathname}${parsed.search}`;
            } catch {
                return null;
            }
        }
        return null;
    }

    if (notification.type === "profile_review_requested" && role === "admin") {
        const profileRole = getProfileRoleFromMeta(notification.meta);
        if (profileRole === "musician") return "/admin/musicians";
        if (profileRole === "contractor") return "/admin/contractors";
        return "/admin/activity";
    }

    if (isProfileNotification(notification.type) && role !== "admin") {
        return role === "musician" ? "/musician/profile" : "/contractor/profile";
    }

    if (
        role === "admin" &&
        (notification.type === "booking_refund_validated" ||
            notification.type === "booking_refund_rejected" ||
            notification.type === "booking_complaint_musician_update" ||
            notification.type === "booking_complaint_opened")
    ) {
        return "/admin/payments";
    }

    if (!isBookingNotification(notification.type) || role === "admin") {
        return null;
    }

    const bookingId = getBookingIdFromNotification(notification.meta);
    if (!bookingId) return null;

    if (notification.type === "payment_released" && role === "musician") {
        return "/musician/earnings";
    }
    if (
        (notification.type === "booking_settled" ||
            notification.type === "booking_settled_refund") &&
        role === "musician"
    ) {
        return "/musician/earnings";
    }
    if (notification.type === "booking_refund_transfer" && role === "contractor") {
        return `/contractor/bookings/${bookingId}`;
    }

    const base = role === "musician" ? "/musician/bookings" : "/contractor/bookings";
    return `${base}/${bookingId}`;
}

export function getNotificationIcon(type: string): string {
    switch (type) {
        case "booking_requested":
        case "booking_updated":
            return "material-symbols:calendar-add-on";
        case "booking_quoted":
        case "booking_quote_updated":
            return "material-symbols:request-quote";
        case "booking_quote_accepted":
        case "profile_approved":
            return "material-symbols:check-circle";
        case "booking_confirmed":
        case "payment_validated":
        case "balance_validated":
            return "material-symbols:verified";
        case "booking_rejected":
        case "profile_rejected":
            return "material-symbols:cancel";
        case "booking_cancelled":
            return "material-symbols:event-busy";
        case "booking_change_requested":
        case "booking_change_accepted":
        case "booking_change_rejected":
        case "booking_commitment_updated":
            return "material-symbols:edit-location";
        case "booking_message":
            return "material-symbols:chat";
        case "booking_event_started":
            return "material-symbols:play-circle";
        case "balance_submitted":
        case "payment_released":
            return "material-symbols:payments";
        case "balance_rejected":
        case "payment_rejected":
        case "booking_complaint_opened":
        case "booking_complaint_musician_update":
            return "material-symbols:report";
        case "booking_completed":
            return "material-symbols:celebration";
        case "booking_review":
            return "material-symbols:rate-review";
        case "booking_settled":
        case "booking_settled_refund":
        case "booking_refund_transfer":
        case "booking_refund_validated":
        case "booking_refund_rejected":
            return "material-symbols:account-balance-wallet";
        case "profile_submitted":
        case "profile_needs_resubmit":
        case "profile_review_requested":
            return "material-symbols:badge";
        case "ensemble_invite":
        case "ensemble_member_joined":
        case "booking_member_invite":
        case "booking_member_response":
            return "material-symbols:groups";
        default:
            return "material-symbols:notifications";
    }
}

export function getNotificationActionLabel(
    type: string,
    role: NotificationAudience,
): string {
    if (type === "profile_review_requested" && role === "admin") {
        return "Revisar perfil";
    }
    if (
        type === "profile_submitted" ||
        type === "profile_approved" ||
        type === "profile_rejected" ||
        type === "profile_needs_resubmit"
    ) {
        return "Ver perfil";
    }
    if (type === "booking_requested" && role === "musician") return "Ver solicitud";
    if (type === "booking_updated" && role === "musician") return "Ver cambios";
    if ((type === "booking_quoted" || type === "booking_quote_updated") && role === "contractor") {
        return "Ver cotización";
    }
    if (type === "booking_confirmed" && role === "musician") return "Ver reserva";
    if (type === "booking_change_requested" && role === "musician") return "Revisar cambios";
    if (type === "booking_commitment_updated" && role === "contractor") return "Ver reserva";
    if (type === "booking_change_rejected" && role === "contractor") return "Ver reserva";
    if (type === "booking_change_accepted" && role === "contractor") return "Ver reserva";
    if (type === "balance_submitted" && role === "musician") return "Validar abono";
    if (type === "booking_message") return "Abrir chat";
    if (type === "booking_review") return "Ver reacciones";
    if (type === "booking_event_started") return "Ver evento";
    if (type === "booking_complaint_opened" && role === "musician") {
        return "Responder queja";
    }
    if (type === "booking_complaint_opened" || type === "booking_complaint_musician_update") {
        return "Ver disputa";
    }
    if (type === "booking_settled" && role === "musician") return "Ver ingresos";
    if (type === "booking_refund_transfer" && role === "contractor") {
        return "Validar devolución";
    }
    if (
        type === "booking_refund_validated" ||
        type === "booking_refund_rejected"
    ) {
        return "Ver tesorería";
    }
    if (
        type === "booking_settled" ||
        type === "booking_settled_refund" ||
        type === "booking_refund_transfer"
    ) {
        return "Ver reserva";
    }
    if (type === "payment_released" && role === "musician") return "Ver ingresos";
    if (type === "payment_rejected" || type === "balance_rejected") {
        return role === "contractor" ? "Pagar con Mercado Pago" : "Ver reserva";
    }
    if (type === "ensemble_invite") return "Crear contraseña";
    if (type === "ensemble_member_joined") return "Ver integrantes";
    if (type === "booking_member_invite") return "Responder convocatoria";
    if (type === "booking_member_response") return "Ver reserva";
    return "Ver reserva";
}
