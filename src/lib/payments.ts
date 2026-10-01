import { apiFetch, ApiError } from "@/lib/api";
import type {
    ContractorExpensesSummary,
    ContractorOperationItem,
    ContractorOperationsSummary,
    MercadoPagoPaymentCheckResponse,
    MercadoPagoPreferenceRequest,
    MercadoPagoPreferenceResponse,
    MercadoPagoProcessPaymentRequest,
    MercadoPagoProcessPaymentResponse,
    MusicianEarningsSummary,
    PaymentOut,
} from "@/types/api";

export function getBookingPayment(bookingId: string) {
    return apiFetch<PaymentOut>(`/payments/booking/${bookingId}`);
}

export function listBookingPayments(bookingId: string) {
    return apiFetch<PaymentOut[]>(`/payments/booking/${bookingId}/all`);
}

export function getMusicianEarnings() {
    return apiFetch<MusicianEarningsSummary>("/payments/musician/earnings");
}

export function getContractorExpenses() {
    return apiFetch<ContractorExpensesSummary>("/payments/contractor/expenses");
}

/** Pago único (100 %). "advance" es metadata antigua equivalente al pago total. */
function isFullPaymentType(type: string | null | undefined): boolean {
    return type === "full" || type === "advance";
}

function expensesToOperations(
    summary: ContractorExpensesSummary,
): ContractorOperationsSummary {
    const items: ContractorOperationItem[] = summary.items.map((item) => ({
        id: `payment:${item.payment_id}`,
        booking_id: item.booking_id,
        kind: isFullPaymentType(item.payment_type) ? "payment_full" : "payment_out",
        status:
            item.status === "initiated"
                ? "pending_other"
                : item.status === "refunded"
                  ? "settled"
                  : item.status === "failed"
                    ? "rejected"
                    : "done",
        direction: "out",
        title: isFullPaymentType(item.payment_type) ? "Pago total" : "Pago",
        subtitle: null,
        cta_label: "Ver reserva",
        amount: item.amount,
        currency: item.currency,
        event_type: item.event_type,
        event_date: item.event_date,
        location_city: item.location_city,
        musician_stage_name: item.musician_stage_name,
        booking_status: item.booking_status,
        payment_type: item.payment_type,
        payment_status: item.status,
        complaint_status: null,
        occurred_at: item.created_at,
        source: "payment",
    }));

    return {
        currency: summary.currency,
        total_out: summary.items.reduce((acc, item) => acc + item.amount, 0),
        total_in: 0,
        net_out: summary.items.reduce((acc, item) => acc + item.amount, 0),
        total_quoted: summary.total_quoted,
        total_released: summary.total_released,
        total_retained: summary.total_retained,
        total_pending: summary.total_pending,
        pending_me_count: 0,
        pending_other_count: 0,
        dispute_count: 0,
        bookings_active: summary.bookings_active,
        bookings_completed: summary.bookings_completed,
        bookings_cancelled: summary.bookings_cancelled,
        items,
    };
}

export async function getContractorOperations() {
    try {
        return await apiFetch<ContractorOperationsSummary>(
            "/payments/contractor/operations",
        );
    } catch (error) {
        // Compat: servidor aún sin la ruta nueva.
        if (error instanceof ApiError && error.status === 404) {
            const expenses = await getContractorExpenses();
            return expensesToOperations(expenses);
        }
        throw error;
    }
}

export function createMercadoPagoPreference(payload: MercadoPagoPreferenceRequest) {
    return apiFetch<MercadoPagoPreferenceResponse>("/payments/mercadopago/preference", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function checkMercadoPagoPaymentStatus(
    bookingId: string,
    paymentId?: string | null,
    collectionId?: string | null,
) {
    const params = new URLSearchParams();
    if (paymentId) params.set("payment_id", paymentId);
    if (collectionId) params.set("collection_id", collectionId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<MercadoPagoPaymentCheckResponse>(
        `/payments/mercadopago/check-status/${bookingId}${query}`,
    );
}

export function processMercadoPagoPayment(payload: MercadoPagoProcessPaymentRequest) {
    return apiFetch<MercadoPagoProcessPaymentResponse>("/payments/mercadopago/process", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

