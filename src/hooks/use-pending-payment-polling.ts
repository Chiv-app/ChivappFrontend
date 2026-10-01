"use client";

import { useEffect, useRef } from "react";
import { checkMercadoPagoPaymentStatus } from "@/lib/payments";
import type { MercadoPagoPaymentCheckResponse } from "@/types/api";

export const PENDING_PAYMENT_POLL_INTERVAL_MS = 10_000;
export const PENDING_PAYMENT_POLL_MAX_MS = 5 * 60_000;

type Options = {
    bookingId: string | null | undefined;
    /** Activa el sondeo (p. ej. reserva en payment_pending o retorno con mp_status=pending). */
    enabled: boolean;
    /** El pago quedó aprobado/retenido: refresca la reserva. */
    onApproved: (result: MercadoPagoPaymentCheckResponse) => void;
    /** Mercado Pago rechazó el pago: se detiene el sondeo. */
    onRejected?: (result: MercadoPagoPaymentCheckResponse) => void;
    /** Se agotó el tiempo máximo sin una respuesta definitiva. */
    onTimeout?: () => void;
    intervalMs?: number;
    maxDurationMs?: number;
};

/**
 * Consulta GET /payments/mercadopago/check-status/{booking_id} cada ~10 s
 * (máx. ~5 min) mientras la pestaña está visible, hasta que el pago se aprueba
 * o se rechaza. Se limpia al desmontar o al desactivarse.
 */
export function usePendingPaymentPolling({
    bookingId,
    enabled,
    onApproved,
    onRejected,
    onTimeout,
    intervalMs = PENDING_PAYMENT_POLL_INTERVAL_MS,
    maxDurationMs = PENDING_PAYMENT_POLL_MAX_MS,
}: Options): void {
    const callbacksRef = useRef({ onApproved, onRejected, onTimeout });

    useEffect(() => {
        callbacksRef.current = { onApproved, onRejected, onTimeout };
    }, [onApproved, onRejected, onTimeout]);

    useEffect(() => {
        if (!enabled || !bookingId) return;

        const startedAt = Date.now();
        let stopped = false;
        let inFlight = false;
        let timer: ReturnType<typeof setInterval> | null = null;

        function stop() {
            stopped = true;
            if (timer != null) {
                clearInterval(timer);
                timer = null;
            }
            document.removeEventListener("visibilitychange", handleVisibility);
        }

        async function tick() {
            if (stopped || inFlight) return;
            if (Date.now() - startedAt > maxDurationMs) {
                stop();
                callbacksRef.current.onTimeout?.();
                return;
            }
            if (document.visibilityState !== "visible") return;

            inFlight = true;
            try {
                const result = await checkMercadoPagoPaymentStatus(bookingId as string);
                if (stopped) return;
                if (result.is_approved || result.status === "approved") {
                    stop();
                    callbacksRef.current.onApproved(result);
                } else if (result.status === "rejected") {
                    stop();
                    callbacksRef.current.onRejected?.(result);
                }
            } catch {
                // Error transitorio de red: se reintenta en el siguiente ciclo.
            } finally {
                inFlight = false;
            }
        }

        function handleVisibility() {
            if (document.visibilityState === "visible") void tick();
        }

        timer = setInterval(() => {
            void tick();
        }, intervalMs);
        document.addEventListener("visibilitychange", handleVisibility);

        return stop;
    }, [bookingId, enabled, intervalMs, maxDurationMs]);
}
