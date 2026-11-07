import { apiFetch } from "./api";

export interface CancellationPolicy {
    full_refund_min_days: number;
    partial_refund_min_days: number;
    partial_refund_percent: number;
    no_refund_below_days: number;
    musician_fault_refund_percent: number;
    force_majeure_refund_percent: number;
}

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
    full_refund_min_days: 15,
    partial_refund_min_days: 7,
    partial_refund_percent: 50,
    no_refund_below_days: 7,
    musician_fault_refund_percent: 100,
    force_majeure_refund_percent: 100,
};

let cachedPolicy: CancellationPolicy | null = null;
let inflightPromise: Promise<CancellationPolicy> | null = null;

export async function fetchCancellationPolicy(): Promise<CancellationPolicy> {
    if (cachedPolicy) return cachedPolicy;
    if (!inflightPromise) {
        inflightPromise = apiFetch<CancellationPolicy>("/bookings/cancellation-policy")
            .then((res) => {
                cachedPolicy = {
                    ...DEFAULT_CANCELLATION_POLICY,
                    ...res,
                };
                return cachedPolicy;
            })
            .catch(() => DEFAULT_CANCELLATION_POLICY)
            .finally(() => {
                inflightPromise = null;
            });
    }
    return inflightPromise;
}

export function getCachedCancellationPolicy(): CancellationPolicy | null {
    return cachedPolicy;
}

export function getPartialRefundMaxDays(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): number {
    return Math.max(policy.partial_refund_min_days, policy.full_refund_min_days - 1);
}

/** Aviso común: el reembolso solo sale de la tarifa del artista. */
export const NON_REFUNDABLE_NOTE =
    "La comisión de servicio y el costo de la pasarela de pagos no son reembolsables.";

export function formatCancellationSummaryShort(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
    const maxPartial = getPartialRefundMaxDays(policy);
    return `Tu pago queda protegido hasta finalizar el evento. Si cancelas con ${policy.full_refund_min_days} días calendario o más de anticipación se reembolsa el 100 % de la tarifa del artista, y el ${policy.partial_refund_percent} % entre ${policy.partial_refund_min_days} y ${maxPartial} días. ${NON_REFUNDABLE_NOTE}`;
}

export function formatClientCancellationRules(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
    const maxPartial = getPartialRefundMaxDays(policy);
    return `${policy.full_refund_min_days} días calendario o más de anticipación: 100 % de la tarifa del artista; entre ${policy.partial_refund_min_days} y ${maxPartial} días: ${policy.partial_refund_percent} % de la tarifa; menos de ${policy.no_refund_below_days} días: sin reembolso (salvo caso fortuito o fuerza mayor acreditado). ${NON_REFUNDABLE_NOTE}`;
}

export function formatFaqCancellationAnswer(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
    const maxPartial = getPartialRefundMaxDays(policy);
    return `Sí, puedes cancelar desde tu panel. Si cancelas con ${policy.full_refund_min_days} días calendario o más de anticipación recibes el 100 % de la tarifa del artista; entre ${policy.partial_refund_min_days} y ${maxPartial} días recibes el ${policy.partial_refund_percent} % de la tarifa; y con menos de ${policy.no_refund_below_days} días no aplica reembolso salvo cancelación o inasistencia del músico (${policy.musician_fault_refund_percent} % de la tarifa) o fuerza mayor acreditada. ${NON_REFUNDABLE_NOTE} Puedes consultar el detalle en /legal/reembolsos.`;
}

export function formatContractCancellationClause(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
    const maxPartial = getPartialRefundMaxDays(policy);
    return `Las cancelaciones y reembolsos se rigen por la política de Chivapp: si EL CLIENTE cancela con ${policy.full_refund_min_days} días calendario o más de anticipación se le reembolsa el 100 % de la tarifa del artista (la comisión de servicio y el costo de la pasarela de pagos no son reembolsables); entre ${policy.partial_refund_min_days} y ${maxPartial} días, el ${policy.partial_refund_percent} % de la tarifa; y con menos de ${policy.no_refund_below_days} días no hay reembolso. Los reembolsos son revisados y aprobados por Chivapp.`;
}
