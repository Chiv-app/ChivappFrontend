import type { BookingStatus } from "@/types/api";

export type UnifiedBookingStageKey =
    | "solicitud"
    | "cotizacion"
    | "pago"
    | "confirmada"
    | "cierre"
    | "cancelada";

export type UnifiedBookingStage = {
    key: UnifiedBookingStageKey;
    step: number;
    label: string;
    description: string;
};

export const UNIFIED_BOOKING_STAGES: readonly UnifiedBookingStage[] = [
    {
        key: "solicitud",
        step: 1,
        label: "Solicitud",
        description: "Solicitud enviada al artista",
    },
    {
        key: "cotizacion",
        step: 2,
        label: "Cotización",
        description: "Revisión de propuesta y firma de acuerdo",
    },
    {
        key: "pago",
        step: 3,
        label: "Pago",
        description: "Pago protegido en garantía",
    },
    {
        key: "confirmada",
        step: 4,
        label: "Reserva confirmada",
        description: "Fecha bloqueada y preparativos del evento",
    },
    {
        key: "cierre",
        step: 5,
        label: "Evento y cierre",
        description: "Presentación en vivo, reseñas y liquidación",
    },
] as const;

export const PLAIN_LANGUAGE_GLOSSARY: Record<string, { term: string; explanation: string }> = {
    pago_protegido: {
        term: "Pago protegido",
        explanation:
            "Chivapp retiene el pago de forma segura y solo libera la tarifa al músico cuando el evento concluye.",
    },
    comision_servicio: {
        term: "Comisión de servicio",
        explanation:
            "Cargo de soporte y protección de la plataforma. El músico recibe el 100 % de su tarifa acordada.",
    },
    pasarela: {
        term: "Cargo de pasarela",
        explanation:
            "Comisión cobrada por Mercado Pago para procesar pagos con tarjeta, Yape u otros medios.",
    },
};

export function mapStatusToUnifiedStage(status: BookingStatus | string): UnifiedBookingStageKey {
    switch (status) {
        case "pending":
            return "solicitud";
        case "accepted":
            return "cotizacion";
        case "quote_accepted":
            return "pago";
        case "confirmed":
            return "confirmada";
        case "in_progress":
        case "completed":
        case "disputed":
            return "cierre";
        case "rejected":
        case "cancelled":
        default:
            return "cancelada";
    }
}

export function getRoleAwareStatusLabel(
    status: BookingStatus | string,
    role: "contractor" | "musician" | "admin" = "contractor",
): string {
    switch (status) {
        case "pending":
            return role === "musician"
                ? "Nueva solicitud por cotizar"
                : "Esperando cotización del artista";
        case "accepted":
            return role === "contractor"
                ? "Tienes una cotización para revisar"
                : "Cotización enviada (esperando respuesta del cliente)";
        case "quote_accepted":
            return role === "contractor"
                ? "Acuerdo aceptado — pendiente de pago"
                : "Acuerdo aceptado — esperando pago del cliente";
        case "confirmed":
            return "Reserva confirmada";
        case "in_progress":
            return "Evento en curso";
        case "completed":
            return "Evento finalizado";
        case "disputed":
            return "Reclamo en revisión";
        case "rejected":
            return "Solicitud descartada";
        case "cancelled":
            return "Reserva cancelada";
        default:
            return String(status);
    }
}
