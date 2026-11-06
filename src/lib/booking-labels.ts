import type { BookingStatus } from "@/types/api";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
    requested: "Solicitud enviada",
    accepted: "Tienes una cotización para revisar",
    contract_pending: "Acuerdo listo para firmar",
    contract_signed: "Listo para pagar",
    payment_pending: "Verificando pago",
    payment_retained: "Reserva confirmada",
    change_pending: "Cambio por confirmar",
    // Legacy (flujo anticipo/saldo, ya inalcanzable): se muestran como confirmadas.
    balance_pending: "Reserva confirmada",
    balance_review: "Reserva confirmada",
    in_progress: "Evento en curso",
    payment_released: "Pago liberado",
    completed: "Evento finalizado",
    cancelled: "Cancelada",
};

export const MUSICIAN_BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
    requested: "Nueva solicitud",
    accepted: "Cotización enviada",
    contract_pending: "Esperando firma del cliente",
    contract_signed: "Contrato firmado (esperando pago)",
    payment_pending: "Pago en verificación",
    payment_retained: "Reserva confirmada",
    change_pending: "Cambio por confirmar",
    balance_pending: "Reserva confirmada",
    balance_review: "Reserva confirmada",
    in_progress: "Show en curso",
    payment_released: "Cobro liberado",
    completed: "Evento finalizado",
    cancelled: "Cancelada",
};

export function getBookingStatusLabel(
    status: BookingStatus,
    role?: "contractor" | "musician" | "admin",
): string {
    if (role === "musician" && MUSICIAN_BOOKING_STATUS_LABELS[status]) {
        return MUSICIAN_BOOKING_STATUS_LABELS[status];
    }
    return BOOKING_STATUS_LABELS[status] || status;
}

export const BOOKING_STATUS_HINTS: Record<BookingStatus, string> = {
    requested: "Si no responde en 24 h te sugeriremos artistas alternativos disponibles.",
    accepted: "El artista envió su propuesta: revisa el precio acordado y acéptala o recházala.",
    contract_pending: "Elige repertorio, firma digitalmente el contrato y pasa al pago protegido.",
    contract_signed: "Contrato firmado — realiza el pago protegido con Mercado Pago para confirmar tu fecha.",
    payment_pending: "Mercado Pago está procesando tu pago. Te avisaremos en cuanto quede acreditado.",
    payment_retained:
        "¡Fecha bloqueada! Tu pago está protegido. Chatea con el músico y sigue el GPS el día del evento.",
    change_pending:
        "Hay una solicitud de cambio de datos del evento pendiente de respuesta.",
    balance_pending:
        "¡Fecha bloqueada! Tu pago está protegido. Chatea con el músico y sigue el GPS el día del evento.",
    balance_review:
        "¡Fecha bloqueada! Tu pago está protegido. Chatea con el músico y sigue el GPS el día del evento.",
    in_progress:
        "Presentación en marcha — al terminar deja tu reseña final del show.",
    payment_released: "Los pagos fueron liberados al músico.",
    completed: "Contratación completada con éxito.",
    cancelled: "Esta reserva fue cancelada.",
};

export const MUSICIAN_BOOKING_STATUS_HINTS: Record<BookingStatus, string> = {
    requested: "Envía tu cotización o descarta la solicitud (tienes hasta 72 h para responder).",
    accepted: "Esperando respuesta del cliente a tu propuesta.",
    contract_pending: "El cliente aceptó tu cotización y está revisando el contrato para firmarlo.",
    contract_signed: "El cliente ya firmó el acuerdo; falta acreditar el pago en Mercado Pago.",
    payment_pending: "Mercado Pago está validando el pago del cliente.",
    payment_retained:
        "Pago asegurado por Chivapp (recibes el 100 % de tu tarifa). Coordina detalles y prepárate para el show.",
    change_pending:
        "Revisa y acepta o rechaza el cambio propuesto en el evento.",
    balance_pending:
        "Pago asegurado por Chivapp (recibes el 100 % de tu tarifa). Coordina detalles y prepárate para el show.",
    balance_review:
        "Pago asegurado por Chivapp (recibes el 100 % de tu tarifa). Coordina detalles y prepárate para el show.",
    in_progress:
        "Presentación activa — al terminar califica al contratista para habilitar tu retiro.",
    payment_released: "El pago del evento fue liberado a tu cuenta configurada.",
    completed: "Evento cerrado — recibes el 100 % de tu tarifa acordada.",
    cancelled: "Esta reserva fue cancelada.",
};

export function getBookingStatusHint(
    status: BookingStatus,
    role?: "contractor" | "musician" | "admin",
): string {
    if (role === "musician" && MUSICIAN_BOOKING_STATUS_HINTS[status]) {
        return MUSICIAN_BOOKING_STATUS_HINTS[status]!;
    }
    return BOOKING_STATUS_HINTS[status] || "";
}

export const BOOKING_STATUS_COLORS: Record<
    BookingStatus,
    "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
    requested: "warning",
    accepted: "primary",
    contract_pending: "secondary",
    contract_signed: "secondary",
    payment_pending: "warning",
    payment_retained: "success",
    change_pending: "warning",
    balance_pending: "success",
    balance_review: "success",
    in_progress: "primary",
    payment_released: "success",
    completed: "success",
    cancelled: "danger",
};

/** Visual groups for cards/headers — clearer than per-status chip color alone. */
export type BookingStatusTone =
    | "progress"
    | "action"
    | "confirmed"
    | "done"
    | "cancelled";

export function getBookingStatusTone(status: BookingStatus): BookingStatusTone {
    switch (status) {
        case "cancelled":
            return "cancelled";
        case "completed":
        case "payment_released":
            return "done";
        case "payment_retained":
        // Legacy (inalcanzables): equivalen a una reserva confirmada.
        case "balance_pending":
        case "balance_review":
            return "confirmed";
        case "payment_pending":
        case "change_pending":
            return "action";
        default:
            return "progress";
    }
}

export const BOOKING_STATUS_TONE_CARD: Record<BookingStatusTone, string> = {
    progress: "border-primary/25 bg-primary/5",
    action: "border-warning/40 bg-warning/5",
    confirmed: "border-success/30 bg-success/5",
    done: "border-success/40 bg-success/10",
    cancelled: "border-danger/40 bg-danger/5",
};

export const BOOKING_STATUS_TONE_ACCENT_BAR: Record<BookingStatusTone, string> = {
    progress: "bg-primary",
    action: "bg-warning",
    confirmed: "bg-success",
    done: "bg-success",
    cancelled: "bg-danger",
};

export const BOOKING_STATUS_TONE_ICON: Record<BookingStatusTone, string> = {
    progress: "text-primary",
    action: "text-warning",
    confirmed: "text-success",
    done: "text-success",
    cancelled: "text-danger",
};

export const BOOKING_STATUS_TONE_ICON_BOX: Record<BookingStatusTone, string> = {
    progress: "bg-primary/10 text-primary-text",
    action: "bg-warning/15 text-warning-text",
    confirmed: "bg-success/10 text-success-text",
    done: "bg-success/15 text-success-text",
    cancelled: "bg-danger/10 text-danger-text",
};

export function getBookingStatusChipVariant(
    status: BookingStatus,
): "flat" | "solid" {
    const tone = getBookingStatusTone(status);
    return tone === "done" || tone === "cancelled" ? "solid" : "flat";
}

export const CONFIRMED_BOOKING_STATUSES: BookingStatus[] = [
    "payment_retained",
    "change_pending",
    // Legacy (inalcanzables): equivalen a una reserva confirmada.
    "balance_pending",
    "balance_review",
    "in_progress",
    "payment_released",
    "completed",
];

export function isConfirmedBookingStatus(status: BookingStatus): boolean {
    return CONFIRMED_BOOKING_STATUSES.includes(status);
}

/** Estados en los que un participante puede cancelar (espejo de CANCELLABLE_STATUSES del backend). */
export const CANCELLABLE_BOOKING_STATUSES: BookingStatus[] = [
    "requested",
    "accepted",
    "contract_pending",
    "contract_signed",
    "payment_pending",
    "payment_retained",
    "change_pending",
    // Legacy (inalcanzables): equivalen a una reserva confirmada.
    "balance_pending",
    "balance_review",
];

export function isCancellableBookingStatus(status: BookingStatus): boolean {
    return CANCELLABLE_BOOKING_STATUSES.includes(status);
}

export const CANCELLATION_REFUND_STATUS_LABELS: Record<string, string> = {
    pending_approval: "Reembolso en revisión",
    processing: "En proceso",
    completed: "Reembolsado a tu medio de pago",
    failed: "Pendiente: lo está revisando el equipo de Chivapp",
    rejected: "Sin reembolso",
};

/** Convierte montos Decimal serializados (string o number) a number. */
export function toAmount(value: number | string | null | undefined): number {
    if (value == null) return 0;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function formatBookingDate(date: string): string {
    return new Date(`${date}T12:00:00-05:00`).toLocaleDateString("es-PE", {
        timeZone: "America/Lima",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function formatBookingTime(time: string): string {
    return time.slice(0, 5);
}

export function formatCurrency(amount: number | string | null | undefined): string {
    return `S/ ${toAmount(amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function formatQuotedAt(date: string | null): string | null {
    if (!date) return null;
    const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(date) ? date : `${date}Z`;
    return new Date(normalized).toLocaleString("es-PE", {
        timeZone: "America/Lima",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function getEventDateTime(eventDate: string, startTime: string): Date {
    return new Date(`${eventDate}T${startTime.slice(0, 8)}-05:00`);
}

export function isEventUpcoming(eventDate: string, startTime: string): boolean {
    return getEventDateTime(eventDate, startTime).getTime() > Date.now();
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    initiated: "Iniciado",
    retained: "Retenido",
    released: "Liberado",
    failed: "Fallido",
    refunded: "Reembolsado",
    rejected: "Rechazado",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
    full: "Pago total",
    // Legacy: pagos antiguos registrados como "advance" equivalen al pago total.
    advance: "Pago total",
};
