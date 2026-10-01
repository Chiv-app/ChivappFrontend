"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Textarea,
    addToast,
} from "@heroui/react";
import { cancelAdminBooking } from "@/lib/admin";
import { formatCurrency, toAmount } from "@/lib/booking-labels";
import type { AdminBookingOut } from "@/types/api";

type Props = {
    bookingId: string | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCancelled: (updated: AdminBookingOut) => void;
};

/** Cancelación administrativa con % de reembolso configurable (0-100). */
export default function AdminCancelBookingModal({
    bookingId,
    isOpen,
    onOpenChange,
    onCancelled,
}: Props) {
    const [reason, setReason] = useState("");
    const [refundPercent, setRefundPercent] = useState("100");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setReason("");
            setRefundPercent("100");
        }
    }, [isOpen]);

    const parsedPercent = Number(refundPercent);
    const percentValid =
        refundPercent.trim() !== "" &&
        Number.isInteger(parsedPercent) &&
        parsedPercent >= 0 &&
        parsedPercent <= 100;

    async function handleConfirm(onClose: () => void) {
        if (!bookingId || !percentValid) return;
        setBusy(true);
        try {
            const updated = await cancelAdminBooking(bookingId, {
                reason: reason.trim() || null,
                refund_percent: parsedPercent,
            });
            const refundAmount = toAmount(updated.cancellation_refund_amount);
            addToast({
                title: "Reserva cancelada por admin",
                description:
                    updated.cancellation_refund_status === "failed"
                        ? "El reembolso en Mercado Pago falló. Puedes reintentarlo desde el detalle."
                        : refundAmount > 0
                          ? `Reembolso de ${formatCurrency(refundAmount)} iniciado.`
                          : undefined,
                color:
                    updated.cancellation_refund_status === "failed" ? "danger" : "warning",
            });
            onCancelled(updated);
            onClose();
        } catch (error) {
            addToast({
                title: "No se pudo cancelar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={!busy}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader>Cancelar reserva</ModalHeader>
                        <ModalBody>
                            <p className="text-sm text-default-600">
                                Esta acción cancela la reserva como administrador. Las
                                partes verán el estado cancelado.
                            </p>
                            <Input
                                type="number"
                                label="Reembolso al contratista (%)"
                                min={0}
                                max={100}
                                step={1}
                                value={refundPercent}
                                onValueChange={setRefundPercent}
                                variant="bordered"
                                endContent={<span className="text-default-400 text-sm">%</span>}
                                isInvalid={!percentValid}
                                errorMessage="Ingresa un número entero entre 0 y 100."
                                description="Se aplica solo si hay un pago retenido. Se reembolsa automáticamente por Mercado Pago al medio de pago original (100 % por defecto)."
                            />
                            <Textarea
                                label="Motivo (opcional)"
                                value={reason}
                                onValueChange={setReason}
                                variant="bordered"
                                maxLength={500}
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="flat" onPress={onClose} isDisabled={busy}>
                                Volver
                            </Button>
                            <Button
                                color="danger"
                                isLoading={busy}
                                isDisabled={!percentValid}
                                onPress={() => handleConfirm(onClose)}
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
