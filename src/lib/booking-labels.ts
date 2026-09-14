import type { BookingStatus } from "@/types/api";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
    requested: "Solicitud enviada",
    accepted: "Cotización pendiente",
    contract_pending: "Firmar contrato",
    contract_signed: "Contrato firmado",
    payment_pending: "Pago en procesamiento",
    payment_retained: "Reserva confirmada",
    change_pending: "Cambio en revisión",
    balance_pending: "Saldo pendiente",
    balance_review: "Saldo en procesamiento",
    in_progress: "En evento",
    payment_released: "Pago liberado",
    completed: "Finalizada",
    cancelled: "Cancelada",
};

export const BOOKING_STATUS_HINTS: Record<BookingStatus, string> = {
    requested: "El músico aún debe responder con una cotización.",
    accepted: "Revisa el precio propuesto y acepta o rechaza.",
    contract_pending: "Lee el contrato, fírmalo y confirma de forma segura con Mercado Pago.",
    contract_signed: "Contrato firmado. Procede con el pago para confirmar tu fecha.",
    payment_pending: "Procesando la acreditación de tu pago con Mercado Pago.",
    payment_retained:
        "Pago confirmado. Coordina detalles, ubica el evento y prepárate para el show.",
    change_pending:
        "Hay cambios propuestos. La otra parte debe aceptarlos o rechazarlos (sin re-firma).",
    balance_pending: "Falta el saldo del evento. Paga el saldo seguro con Mercado Pago.",
    balance_review: "Procesando pago del saldo con Mercado Pago.",
    in_progress:
        "Pago completado. Comparte fotos, videos y una reseña del show.",
    payment_released: "Los pagos fueron liberados al músico.",
    completed: "Finalizada. Servicio completado con éxito.",
    cancelled: "Esta reserva fue cancelada.",
};

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
    balance_pending: "warning",
    balance_review: "warning",
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
            return "confirmed";
        case "payment_pending":
        case "change_pending":
        case "balance_pending":
        case "balance_review":
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
    progress: "bg-primary/10 text-primary",
    action: "bg-warning/15 text-warning",
    confirmed: "bg-success/10 text-success",
    done: "bg-success/15 text-success",
    cancelled: "bg-danger/10 text-danger",
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
    "balance_pending",
    "balance_review",
    "in_progress",
    "payment_released",
    "completed",
];

export function isConfirmedBookingStatus(status: BookingStatus): boolean {
    return CONFIRMED_BOOKING_STATUSES.includes(status);
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

export function formatCurrency(amount: number): string {
    return `S/ ${amount.toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function formatQuotedAt(date: string | null): string | null {
    if (!date) return null;
    return new Date(date).toLocaleString("es-PE", {
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
    rejected: "Rechazado"
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
    advance: "Anticipo",
    balance: "Saldo",
    full: "Pago total"
};
