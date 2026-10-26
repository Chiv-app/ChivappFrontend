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

export function formatCancellationSummaryShort(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
    const maxPartial = getPartialRefundMaxDays(policy);
    return `Tu pago se custodia hasta finalizar el evento. Reembolso del 100 % (sin costo de pasarela) si cancelas con ${policy.full_refund_min_days} días calendario o más de anticipación y ${policy.partial_refund_percent} % entre ${policy.partial_refund_min_days} y ${maxPartial} días.`;
}

export function formatClientCancellationRules(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
    const maxPartial = getPartialRefundMaxDays(policy);
    return `${policy.full_refund_min_days} días calendario o más de anticipación: 100 % de lo pagado (sin el costo de la pasarela); entre ${policy.partial_refund_min_days} y ${maxPartial} días: ${policy.partial_refund_percent} % (sin el costo de la pasarela); menos de ${policy.no_refund_below_days} días: sin reembolso (salvo caso fortuito o fuerza mayor acreditado).`;
}

export function formatFaqCancellationAnswer(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
    const maxPartial = getPartialRefundMaxDays(policy);
    return `Sí, puedes cancelar desde tu panel. Si cancelas con ${policy.full_refund_min_days} días calendario o más de anticipación recibes el 100 % de lo pagado (sin el costo de la pasarela); entre ${policy.partial_refund_min_days} y ${maxPartial} días recibes el ${policy.partial_refund_percent} % (sin el costo de la pasarela); y con menos de ${policy.no_refund_below_days} días no aplica reembolso salvo cancelación o inasistencia del músico (${policy.musician_fault_refund_percent} % del importe abonado) o fuerza mayor acreditada. Puedes consultar el detalle en /legal/reembolsos.`;
}

export function formatContractCancellationClause(
    policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
    const maxPartial = getPartialRefundMaxDays(policy);
    return `Las cancelaciones y reembolsos se rigen por la política de Chivapp: si EL CLIENTE cancela con ${policy.full_refund_min_days} días calendario o más de anticipación se le reembolsa el 100 % de lo pagado (sin el costo de la pasarela de pagos); entre ${policy.partial_refund_min_days} y ${maxPartial} días, el ${policy.partial_refund_percent} % (sin el costo de la pasarela de pagos); y con menos de ${policy.no_refund_below_days} días no hay reembolso. Los reembolsos son revisados y aprobados por Chivapp.`;
}
