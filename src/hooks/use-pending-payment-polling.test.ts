import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const checkMock = vi.fn();

vi.mock("@/lib/payments", () => ({
    checkMercadoPagoPaymentStatus: (...args: unknown[]) => checkMock(...args),
}));

import { usePendingPaymentPolling } from "./use-pending-payment-polling";

function setVisibility(state: DocumentVisibilityState) {
    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => state,
    });
}

async function advance(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

describe("usePendingPaymentPolling", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        checkMock.mockReset();
        setVisibility("visible");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("sondea cada 10 s y se detiene al aprobarse", async () => {
        checkMock
            .mockResolvedValueOnce({ status: "pending", is_approved: false })
            .mockResolvedValueOnce({ status: "approved", is_approved: true });
        const onApproved = vi.fn();

        renderHook(() =>
            usePendingPaymentPolling({ bookingId: "b1", enabled: true, onApproved }),
        );

        await advance(10_000);
        expect(checkMock).toHaveBeenCalledTimes(1);
        expect(checkMock).toHaveBeenCalledWith("b1");
        expect(onApproved).not.toHaveBeenCalled();

        await advance(10_000);
        expect(onApproved).toHaveBeenCalledTimes(1);

        await advance(30_000);
        expect(checkMock).toHaveBeenCalledTimes(2);
    });

    it("se detiene cuando Mercado Pago rechaza el pago", async () => {
        checkMock.mockResolvedValue({ status: "rejected", is_approved: false });
        const onApproved = vi.fn();
        const onRejected = vi.fn();

        renderHook(() =>
            usePendingPaymentPolling({
                bookingId: "b1",
                enabled: true,
                onApproved,
                onRejected,
            }),
        );

        await advance(10_000);
        expect(onRejected).toHaveBeenCalledTimes(1);
        await advance(30_000);
        expect(checkMock).toHaveBeenCalledTimes(1);
        expect(onApproved).not.toHaveBeenCalled();
    });

    it("no consulta con la pestaña oculta y se detiene a los 5 minutos", async () => {
        checkMock.mockResolvedValue({ status: "pending", is_approved: false });
        setVisibility("hidden");
        const onTimeout = vi.fn();

        renderHook(() =>
            usePendingPaymentPolling({
                bookingId: "b1",
                enabled: true,
                onApproved: vi.fn(),
                onTimeout,
            }),
        );

        await advance(60_000);
        expect(checkMock).not.toHaveBeenCalled();

        setVisibility("visible");
        await advance(5 * 60_000);
        expect(onTimeout).toHaveBeenCalledTimes(1);
        const calls = checkMock.mock.calls.length;
        await advance(60_000);
        expect(checkMock.mock.calls.length).toBe(calls);
    });

    it("limpia el intervalo al desmontar", async () => {
        checkMock.mockResolvedValue({ status: "pending", is_approved: false });
        const { unmount } = renderHook(() =>
            usePendingPaymentPolling({ bookingId: "b1", enabled: true, onApproved: vi.fn() }),
        );
        unmount();
        await advance(60_000);
        expect(checkMock).not.toHaveBeenCalled();
    });

    it("no hace nada si está desactivado", async () => {
        renderHook(() =>
            usePendingPaymentPolling({ bookingId: "b1", enabled: false, onApproved: vi.fn() }),
        );
        await advance(60_000);
        expect(checkMock).not.toHaveBeenCalled();
    });
});
