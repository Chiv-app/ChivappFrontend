import { apiFetch } from "@/lib/api";
import type {
    BookingBalanceDue,
    BookingChangeDecision,
    BookingCreate,
    BookingEventChangeRequest,
    BookingMessageCreate,
    BookingMessageOut,
    BookingOut,
    BookingQuote,
    BookingReject,
    BookingReopenQuote,
    BookingRequestedRepertoireUpdate,
    BookingReviewCreate,
    BookingReviewOut,
    BookingUpdate,
    CancellationQuoteOut,
    ContractorRecommendationOut,
    MusicianBookingCreate,
} from "@/types/api";

export function listBookings() {
    return apiFetch<BookingOut[]>("/bookings");
}

export function getBooking(id: string) {
    return apiFetch<BookingOut>(`/bookings/${id}`);
}

export function createBooking(payload: BookingCreate) {
    return apiFetch<BookingOut>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function createMusicianBooking(payload: MusicianBookingCreate) {
    return apiFetch<BookingOut>("/bookings/musician-created", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function updateBooking(id: string, payload: BookingUpdate) {
    return apiFetch<BookingOut>(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function rejectBooking(id: string, payload: BookingReject = {}) {
    return apiFetch<BookingOut>(`/bookings/${id}/reject`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function quoteBooking(id: string, payload: BookingQuote) {
    return apiFetch<BookingOut>(`/bookings/${id}/quote`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function rejectQuote(id: string, payload: BookingReject = {}) {
    return apiFetch<BookingOut>(`/bookings/${id}/reject-quote`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function acceptQuote(id: string) {
    return apiFetch<BookingOut>(`/bookings/${id}/accept-quote`, { method: "POST" });
}

export function updateRequestedRepertoire(
    id: string,
    payload: BookingRequestedRepertoireUpdate,
) {
    return apiFetch<BookingOut>(`/bookings/${id}/requested-repertoire`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function reopenBookingQuote(id: string, payload: BookingReopenQuote = {}) {
    return apiFetch<BookingOut>(`/bookings/${id}/reopen-quote`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/** Vista previa del reembolso que aplicaría si el usuario actual cancela ahora. */
export function getCancellationQuote(id: string) {
    return apiFetch<CancellationQuoteOut>(`/bookings/${id}/cancellation-quote`);
}

export function cancelBooking(id: string, payload: BookingReject = {}) {
    return apiFetch<BookingOut>(`/bookings/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function listBookingMessages(id: string) {
    return apiFetch<BookingMessageOut[]>(`/bookings/${id}/messages`);
}

export function postBookingMessage(id: string, payload: BookingMessageCreate) {
    return apiFetch<BookingMessageOut>(`/bookings/${id}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function requestBookingChange(id: string, payload: BookingEventChangeRequest) {
    return apiFetch<BookingOut>(`/bookings/${id}/request-change`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function decideBookingChange(id: string, payload: BookingChangeDecision) {
    return apiFetch<BookingOut>(`/bookings/${id}/decide-change`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function getBookingBalanceDue(id: string) {
    return apiFetch<BookingBalanceDue>(`/bookings/${id}/balance-due`);
}

export function startBookingEvent(id: string) {
    return apiFetch<BookingOut>(`/bookings/${id}/start-event`, { method: "POST" });
}

export function listBookingReviews(id: string) {
    return apiFetch<BookingReviewOut[]>(`/bookings/${id}/reviews`);
}

export function getBookingReview(id: string) {
    return apiFetch<BookingReviewOut | null>(`/bookings/${id}/review`);
}

export function createBookingReview(id: string, payload: BookingReviewCreate) {
    return apiFetch<BookingReviewOut>(`/bookings/${id}/review`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function createFinalBookingReview(
    id: string,
    payload: {
        rating?: number;
        comment?: string;
        complaint_reason?: string | null;
        complaint_evidence_url?: string | null;
    },
) {
    return apiFetch<{
        mode: "review" | "complaint";
        completed?: boolean;
    }>(`/bookings/${id}/final-review`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function getBookingComplaint(id: string) {
    return apiFetch<import("@/types/api").BookingComplaint | null>(
        `/bookings/${id}/complaint`,
    );
}

export function acceptBookingComplaint(id: string) {
    return apiFetch<import("@/types/api").BookingComplaint>(
        `/bookings/${id}/complaint/accept`,
        { method: "POST" },
    );
}

export function respondBookingComplaint(
    id: string,
    payload: { response: string; evidence_url?: string | null },
) {
    return apiFetch<import("@/types/api").BookingComplaint>(
        `/bookings/${id}/complaint/respond`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function validateBookingRefund(id: string) {
    return apiFetch<import("@/types/api").BookingComplaint>(
        `/bookings/${id}/complaint/validate-refund`,
        { method: "POST" },
    );
}

export function rejectBookingRefund(id: string, reason: string) {
    return apiFetch<import("@/types/api").BookingComplaint>(
        `/bookings/${id}/complaint/reject-refund`,
        {
            method: "POST",
            body: JSON.stringify({ reason }),
        },
    );
}

/** @deprecated Prefer createBookingReview — kept for compatibility */
export function upsertBookingReview(id: string, payload: BookingReviewCreate) {
    return createBookingReview(id, payload);
}

export function getContractorRecommendation(id: string) {
    return apiFetch<ContractorRecommendationOut | null>(
        `/bookings/${id}/recommend-contractor`,
    );
}

export function recommendContractor(
    id: string,
    payload: { rating: number; comment: string },
) {
    return apiFetch<ContractorRecommendationOut>(
        `/bookings/${id}/recommend-contractor`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

export function completeBooking(id: string) {
    return apiFetch<BookingOut>(`/bookings/${id}/complete`, { method: "POST" });
}
