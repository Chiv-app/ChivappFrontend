import type { BookingStatus, UserRole } from "@/types/api";

export type TimelineStepId =
    | "request"
    | "quote"
    | "payment"
    | "confirmed"
    | "event";

export type TimelineStepState = "done" | "current" | "upcoming" | "skipped";

export type BookingTimelineStep = {
    id: TimelineStepId;
    title: string;
    description: string;
    actorHint: string;
    state: TimelineStepState;
};

const MAIN_FLOW: TimelineStepId[] = [
    "request",
    "quote",
    "payment",
    "confirmed",
    "event",
];

const STEP_COPY: Record<
    TimelineStepId,
    { title: string; description: string; musician: string; contractor: string }
> = {
    request: {
        title: "Solicitud",
        description: "Solicitud enviada al artista con fecha y detalles del evento.",
        musician: "Revisa los detalles y envía tu cotización.",
        contractor: "Espera la cotización del músico.",
    },
    quote: {
        title: "Cotización y acuerdo",
        description: "Revisión de propuesta económica, repertorio y firma del contrato.",
        musician: "Propuesta enviada; esperando aceptación y firma del cliente.",
        contractor: "Revisa el monto propuesto, elige repertorio y firma el contrato.",
    },
    payment: {
        title: "Pago",
        description: "Pago protegido al 100 % mediante Mercado Pago.",
        musician: "El cliente ya firmó y está completando el pago en Mercado Pago.",
        contractor: "Completa el pago seguro con tarjeta o Yape para bloquear la fecha.",
    },
    confirmed: {
        title: "Confirmación",
        description: "Fecha bloqueada, chat activo y ubicación en vivo para el día del show.",
        musician: "Fecha reservada con pago asegurado. Prepárate para el evento.",
        contractor: "Pago protegido confirmado. Coordina detalles por el chat.",
    },
    event: {
        title: "Evento y cierre",
        description: "Presentación en vivo, calificación mutua y cobro del artista.",
        musician: "Realiza el show, califica al cliente y solicita tu retiro.",
        contractor: "Disfruta el show y deja tu reseña final para cerrar la reserva.",
    },
};

function statusToStepIndex(status: BookingStatus): number {
    switch (status) {
        case "requested":
            return 0;
        case "accepted":
        case "contract_pending":
            return 1;
        case "contract_signed":
        case "payment_pending":
            return 2;
        case "payment_retained":
        case "change_pending":
        // Legacy (inalcanzables): equivalen a una reserva confirmada.
        case "balance_pending":
        case "balance_review":
            return 3;
        case "in_progress":
        case "payment_released":
        case "completed":
            return 4;
        case "cancelled":
            return -1;
        default:
            return 0;
    }
}

export function buildBookingTimeline(
    status: BookingStatus,
    role: Extract<UserRole, "musician" | "contractor">,
    options?: { hasReview?: boolean },
): {
    steps: BookingTimelineStep[];
    currentIndex: number;
    progressPercent: number;
    nextAction: string;
    destination: string;
    isCancelled: boolean;
} {
    if (status === "cancelled") {
        return {
            steps: [],
            currentIndex: -1,
            progressPercent: 0,
            nextAction: "Esta reserva fue cancelada.",
            destination: "No aplica",
            isCancelled: true,
        };
    }

    const hasReview = Boolean(options?.hasReview);
    const currentIndex = statusToStepIndex(status);

    const steps: BookingTimelineStep[] = MAIN_FLOW.map((id, index) => {
        const copy = STEP_COPY[id];
        let state: TimelineStepState = "upcoming";

        if (index < currentIndex) {
            state = "done";
        } else if (index === currentIndex) {
            // Completada: el paso final es "hecho" (verde), no "actual".
            state = status === "completed" ? "done" : "current";
        }

        // Reserva finalizada (cliente o músico): todo el camino en verde.
        if (status === "completed") {
            state = "done";
        }

        return {
            id,
            title: copy.title,
            description: copy.description,
            actorHint: role === "musician" ? copy.musician : copy.contractor,
            state,
        };
    });

    if (status === "accepted" && steps[1]) {
        steps[1].actorHint =
            role === "musician"
                ? "Esperando respuesta del cliente a tu propuesta."
                : "El artista envió su propuesta: acéptala o recházala.";
    }
    if (status === "contract_pending" && steps[1]) {
        steps[1].actorHint =
            role === "musician"
                ? "El cliente aceptó tu cotización y está revisando el contrato."
                : "Elige repertorio y firma digitalmente el contrato.";
        steps[1].description = "Acuerdo listo para firma digital antes del pago.";
    }
    if (status === "contract_signed" && steps[2]) {
        steps[2].actorHint =
            role === "musician"
                ? "El cliente ya firmó el acuerdo; falta acreditar el pago."
                : "Contrato firmado — realiza el pago protegido con Mercado Pago.";
    }
    if (status === "payment_pending" && steps[2]) {
        steps[2].actorHint =
            role === "musician"
                ? "Mercado Pago está validando el pago del cliente."
                : "Mercado Pago está procesando tu pago.";
        steps[2].description = "Verificación de pago en curso con Mercado Pago.";
    }
    if (status === "change_pending" && steps[3]) {
        steps[3].actorHint =
            role === "musician"
                ? "Revisa y acepta o rechaza el cambio propuesto."
                : "Espera la respuesta del músico a tu solicitud de cambio.";
        steps[3].description = "Cambio de ubicación/detalles en revisión.";
    }
    if ((status === "in_progress" || status === "payment_released") && steps[4]) {
        if (hasReview) {
            steps[4].actorHint =
                role === "musician"
                    ? "La reseña final ya está. Puedes finalizar la contratación."
                    : "Reseña final lista. Confirma para finalizar la contratación.";
            steps[4].description =
                "Todo listo: confirma el cierre para liberar pagos.";
        } else {
            steps[4].actorHint =
                role === "musician"
                    ? "Presentación activa — al terminar califica al contratista."
                    : "Presentación en marcha — al terminar deja tu reseña.";
        }
    }
    if (status === "completed" && steps[4]) {
        steps[4].description = "Contratación cerrada. Esta reserva quedó finalizada.";
        steps[4].actorHint =
            role === "musician"
                ? "Evento cerrado — cobro listo para desembolso."
                : "Contratación completada con éxito.";
    }

    const current = steps.find((step) => step.state === "current");
    const progressDone = steps.filter(
        (step) => step.state === "done" || step.state === "skipped",
    ).length;
    const progressPercent = Math.round((progressDone / steps.length) * 100);

    return {
        steps,
        currentIndex: status === "completed" ? steps.length - 1 : currentIndex,
        progressPercent: status === "completed" ? 100 : Math.min(progressPercent, 95),
        nextAction:
            status === "completed"
                ? "Esta contratación quedó cerrada."
                : (current?.actorHint ?? "Revisa el detalle de la reserva."),
        destination: STEP_COPY.event.title,
        isCancelled: false,
    };
}

export type CompletionGate = {
    id: string;
    title: string;
    done: boolean;
    hint: string;
};

/** Checklist de lo que falta para poder finalizar la contratación. */
export function getCompletionGates(
    status: BookingStatus,
    options?: {
        hasReview?: boolean;
        role?: "musician" | "contractor";
    },
): {
    canFinalize: boolean;
    gates: CompletionGate[];
    missing: CompletionGate[];
} {
    const hasReview = Boolean(options?.hasReview);
    const role = options?.role;
    const statusIndex = statusToStepIndex(status);

    const confirmedDone = statusIndex >= 3 && status !== "cancelled";
    const eventPhaseDone =
        status === "in_progress" ||
        status === "payment_released" ||
        status === "completed";
    const reviewDone = hasReview || status === "completed";
    const finalized = status === "completed";

    const gates: CompletionGate[] = [
        {
            id: "confirmed",
            title: "Confirmación",
            done: confirmedDone,
            hint: "El pago debe estar validado.",
        },
        {
            id: "event",
            title: "Fase de evento activa",
            done: eventPhaseDone,
            hint: "El músico debe habilitar la fase de evento.",
        },
        {
            id: "review",
            title: "Reseña final del contratista",
            done: reviewDone,
            hint:
                role === "contractor"
                    ? "Se te pedirá en un popup al pulsar Finalizar."
                    : "El contratista deja estrellas y comentario al finalizar.",
        },
        {
            id: "done",
            title: "Contratación finalizada",
            done: finalized,
            hint: "Pulsa finalizar cuando los pasos anteriores estén listos.",
        },
    ];

    const missing = gates.filter((gate) => !gate.done && gate.id !== "done");
    // El contratista completa la reseña en el popup de Finalizar; no bloquea el botón.
    const blockingMissing = missing.filter(
        (gate) => !(role === "contractor" && gate.id === "review"),
    );
    const canFinalize =
        status !== "completed" &&
        status !== "cancelled" &&
        blockingMissing.length === 0;

    return { canFinalize, gates, missing: blockingMissing };
}
