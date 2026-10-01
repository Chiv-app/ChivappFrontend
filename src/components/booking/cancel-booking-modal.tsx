"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Spinner,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { cancelBooking, getCancellationQuote } from "@/lib/bookings";
import { formatCurrency, toAmount } from "@/lib/booking-labels";
import type { BookingOut, CancellationQuoteOut } from "@/types/api";

type Props = {
    /** Reserva a cancelar; null mantiene el modal sin datos. */
    bookingId: string | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCancelled: (updated: BookingOut) => void;
    title?: string;
};

/**
 * Confirmación de cancelación: primero muestra la política aplicable y el
 * reembolso estimado (GET /cancellation-quote) y solo entonces cancela.
 */
export default function CancelBookingModal({
    bookingId,
    isOpen,
    onOpenChange,
    onCancelled,
    title = "Cancelar reserva",
}: Props) {
    const [quote, setQuote] = useState<CancellationQuoteOut | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !bookingId) return;
        let active = true;
        setQuote(null);
        setQuoteError(null);
        setReason("");
        setIsLoadingQuote(true);
        getCancellationQuote(bookingId)
            .then((data) => {
                if (active) setQuote(data);
            })
            .catch((error) => {
                if (!active) return;
                setQuoteError(
                    error instanceof Error
                        ? error.message
                        : "No se pudo calcular el reembolso.",
                );
            })
            .finally(() => {
                if (active) setIsLoadingQuote(false);
            });
        return () => {
            active = false;
        };
    }, [isOpen, bookingId]);

    async function handleConfirm(onClose: () => void) {
        if (!bookingId || !quote?.can_cancel) return;
        setIsSubmitting(true);
        try {
            const trimmed = reason.trim();
            const updated = await cancelBooking(bookingId, {
                rejection_reason: trimmed || null,
            });
            const refundAmount = toAmount(updated.cancellation_refund_amount);
            let description = "La reserva fue cancelada.";
            if (refundAmount > 0) {
                description = `La solicitud de reembolso de ${formatCurrency(refundAmount)} se envió a Chivapp para su revisión. Te avisaremos cuando sea aprobada.`;
            }
            addToast({ title: "Reserva cancelada", description, color: "success" });
            onCancelled(updated);
            onClose();
        } catch (error) {
            addToast({
                title: "No se pudo cancelar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const paidTotal = toAmount(quote?.paid_total);
    const refundAmount = toAmount(quote?.refund_amount);

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="md"
            scrollBehavior="inside"
            placement="center"
            isDismissable={!isSubmitting}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex items-center gap-2">
                            <Icon
                                icon="material-symbols:cancel"
                                width={22}
                                className="text-danger"
                            />
                            {title}
                        </ModalHeader>
                        <ModalBody className="gap-4">
                            {isLoadingQuote ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner size="md" label="Calculando reembolso..." />
                                </div>
                            ) : quoteError ? (
                                <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                                    {quoteError}
                                </div>
                            ) : quote ? (
                                <>
                                    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
                                        <Icon
                                            icon="material-symbols:policy"
                                            width={22}
                                            className="text-warning shrink-0 mt-0.5"
                                        />
                                        <p className="text-sm text-default-700 leading-relaxed">
                                            {quote.rule}
                                        </p>
                                    </div>

                                    <dl className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-xl border border-default-200 p-3">
                                            <dt className="text-xs text-default-500">
                                                Días antes del evento
                                            </dt>
                                            <dd className="font-semibold text-foreground mt-0.5">
                                                {quote.days_before_event}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-default-200 p-3">
                                            <dt className="text-xs text-default-500">
                                                Monto pagado
                                            </dt>
                                            <dd className="font-semibold text-foreground mt-0.5">
                                                {formatCurrency(paidTotal)}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-default-200 p-3">
                                            <dt className="text-xs text-default-500">
                                                Reembolso
                                            </dt>
                                            <dd className="font-semibold text-foreground mt-0.5">
                                                {quote.refund_percent} %
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                                            <dt className="text-xs text-default-500">
                                                Reembolso estimado
                                            </dt>
                                            <dd className="font-semibold text-success mt-0.5">
                                                {formatCurrency(refundAmount)}
                                            </dd>
                                        </div>
                                    </dl>

                                    {refundAmount > 0 ? (
                                        <p className="text-xs text-default-500">
                                            El reembolso será revisado y aprobado por
                                            Chivapp antes de enviarse con Mercado Pago al
                                            medio de pago que usó el cliente.
                                        </p>
                                    ) : null}

                                    {quote.can_cancel ? (
                                        <Textarea
                                            label="Motivo (opcional)"
                                            placeholder="Cuéntanos por qué cancelas la reserva"
                                            value={reason}
                                            onValueChange={setReason}
                                            minRows={2}
                                            maxLength={500}
                                        />
                                    ) : (
                                        <p className="text-sm text-danger">
                                            Esta reserva ya no se puede cancelar en su estado
                                            actual.
                                        </p>
                                    )}
                                </>
                            ) : null}
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="light"
                                onPress={onClose}
                                isDisabled={isSubmitting}
                            >
                                Volver
                            </Button>
                            <Button
                                color="danger"
                                onPress={() => handleConfirm(onClose)}
                                isLoading={isSubmitting}
                                isDisabled={!quote?.can_cancel || isLoadingQuote}
                            >
                                Confirmar cancelación
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
