"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, CardBody, Chip, Textarea, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import FileUploadField from "@/components/ui/file-upload-field";
import {
    acceptBookingComplaint,
    getBookingComplaint,
    rejectBookingRefund,
    respondBookingComplaint,
    validateBookingRefund,
} from "@/lib/bookings";
import { formatCurrency } from "@/lib/booking-labels";
import { resolveUploadUrl } from "@/lib/uploads";
import type { BookingComplaint } from "@/types/api";

type Props = {
    bookingId: string;
    role: "musician" | "contractor" | "admin" | string;
    onUpdated?: () => void;
};

const STATUS_LABEL: Record<string, string> = {
    open: "Esperando al músico",
    musician_accepted: "Aceptada · pendiente admin",
    musician_responded: "Con descargo · pendiente admin",
    settled: "Liquidada",
};

const REFUND_STATUS_LABEL: Record<string, string> = {
    none: "Sin devolución",
    awaiting_transfer: "Espera transferencia admin",
    awaiting_validation: "Tu turno: validar comprobante",
    completed: "Devolución confirmada",
    rejected: "Comprobante rechazado",
};

export default function BookingComplaintPanel({ bookingId, role, onUpdated }: Props) {
    const [complaint, setComplaint] = useState<BookingComplaint | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [response, setResponse] = useState("");
    const [evidence, setEvidence] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [busy, setBusy] = useState<
        "accept" | "respond" | "validate" | "reject" | null
    >(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        getBookingComplaint(bookingId)
            .then((data) => {
                if (!cancelled) setComplaint(data);
            })
            .catch(() => {
                if (!cancelled) setComplaint(null);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    if (isLoading || !complaint) return null;

    async function handleAccept() {
        setBusy("accept");
        try {
            const updated = await acceptBookingComplaint(bookingId);
            setComplaint(updated);
            addToast({
                title: "Queja aceptada",
                description: "El admin definirá los montos al liquidar.",
                color: "success",
            });
            onUpdated?.();
        } catch (error) {
            addToast({
                title: "No se pudo aceptar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setBusy(null);
        }
    }

    async function handleRespond(event: FormEvent) {
        event.preventDefault();
        const trimmed = response.trim();
        if (trimmed.length < 10) {
            addToast({
                title: "Descargo corto",
                description: "Escribe al menos 10 caracteres.",
                color: "warning",
            });
            return;
        }
        setBusy("respond");
        try {
            const updated = await respondBookingComplaint(bookingId, {
                response: trimmed,
                evidence_url: evidence,
            });
            setComplaint(updated);
            addToast({
                title: "Descargo enviado",
                description: "El admin revisará y liquidará la reserva.",
                color: "success",
            });
            onUpdated?.();
        } catch (error) {
            addToast({
                title: "No se pudo enviar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setBusy(null);
        }
    }

    async function handleValidateRefund() {
        setBusy("validate");
        try {
            const updated = await validateBookingRefund(bookingId);
            setComplaint(updated);
            addToast({
                title: "Devolución confirmada",
                description: "Registramos que recibiste el monto.",
                color: "success",
            });
            onUpdated?.();
        } catch (error) {
            addToast({
                title: "No se pudo validar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setBusy(null);
        }
    }

    async function handleRejectRefund(event: FormEvent) {
        event.preventDefault();
        const trimmed = rejectReason.trim();
        if (trimmed.length < 10) {
            addToast({
                title: "Motivo corto",
                description: "Explica al menos 10 caracteres por qué rechazas.",
                color: "warning",
            });
            return;
        }
        setBusy("reject");
        try {
            const updated = await rejectBookingRefund(bookingId, trimmed);
            setComplaint(updated);
            addToast({
                title: "Comprobante rechazado",
                description: "El admin fue notificado para volver a transferir.",
                color: "warning",
            });
            onUpdated?.();
        } catch (error) {
            addToast({
                title: "No se pudo rechazar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setBusy(null);
        }
    }

    const canMusicianAct = role === "musician" && complaint.status === "open";
    const refundAmount = Number(complaint.admin_contractor_refund ?? 0);
    const refundStatus = complaint.refund_status || "none";
    const canValidateRefund =
        role === "contractor" &&
        complaint.status === "settled" &&
        refundAmount > 0 &&
        refundStatus === "awaiting_validation";

    return (
        <Card className="border border-danger/30 bg-danger/5 shadow-soft">
            <CardBody className="gap-4 p-6">
                <div className="flex flex-wrap items-center gap-2">
                    <Icon icon="material-symbols:report" width={22} className="text-danger" />
                    <h3 className="text-lg font-bold text-foreground">
                        Reserva en disputa
                    </h3>
                    <Chip size="sm" color="danger" variant="flat">
                        {STATUS_LABEL[complaint.status] || complaint.status}
                    </Chip>
                    {complaint.status === "settled" && refundAmount > 0 ? (
                        <Chip
                            size="sm"
                            color={
                                refundStatus === "completed"
                                    ? "success"
                                    : refundStatus === "awaiting_validation"
                                      ? "warning"
                                      : "secondary"
                            }
                            variant="flat"
                        >
                            {REFUND_STATUS_LABEL[refundStatus] || refundStatus}
                        </Chip>
                    ) : null}
                </div>

                <div>
                    <p className="text-sm font-semibold text-default-700">Queja del contratista</p>
                    <p className="text-sm text-default-600 mt-1 whitespace-pre-wrap">
                        {complaint.reason}
                    </p>
                    {complaint.evidence_url ? (
                        <a
                            href={resolveUploadUrl(complaint.evidence_url) || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary underline mt-2 inline-block"
                        >
                            Ver evidencia
                        </a>
                    ) : null}
                </div>

                {complaint.musician_response ? (
                    <div className="rounded-xl border border-default-200 bg-content1 p-3">
                        <p className="text-sm font-semibold text-default-700">
                            Respuesta del músico
                        </p>
                        <p className="text-sm text-default-600 mt-1 whitespace-pre-wrap">
                            {complaint.musician_response}
                        </p>
                        {complaint.musician_response_evidence_url ? (
                            <a
                                href={
                                    resolveUploadUrl(
                                        complaint.musician_response_evidence_url,
                                    ) || "#"
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-primary underline mt-2 inline-block"
                            >
                                Ver evidencia del músico
                            </a>
                        ) : null}
                    </div>
                ) : null}

                {complaint.status === "settled" ? (
                    <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm">
                        <p className="font-semibold text-foreground">Liquidación admin</p>
                        <p className="text-default-600 mt-1">
                            Músico: {formatCurrency(Number(complaint.admin_musician_amount ?? 0))}
                            {" · "}
                            Devolución contratista: {formatCurrency(refundAmount)}
                        </p>
                        {complaint.admin_notes ? (
                            <p className="text-default-500 mt-1">{complaint.admin_notes}</p>
                        ) : null}

                        {refundAmount > 0 ? (
                            <div className="mt-3 rounded-lg border border-default-200 bg-content1 p-3">
                                {refundStatus === "awaiting_transfer" ||
                                refundStatus === "none" ||
                                refundStatus === "rejected" ? (
                                    <p className="text-default-600">
                                        {refundStatus === "rejected"
                                            ? "Rechazaste el comprobante. El admin debe volver a transferir."
                                            : "El admin aún debe transferir la devolución y adjuntar el comprobante."}
                                        {complaint.refund_rejection_reason ? (
                                            <span className="block mt-1 text-danger">
                                                Motivo: {complaint.refund_rejection_reason}
                                            </span>
                                        ) : null}
                                    </p>
                                ) : null}

                                {(refundStatus === "awaiting_validation" ||
                                    refundStatus === "completed") &&
                                complaint.refund_evidence_url ? (
                                    <p className="text-default-600">
                                        Comprobante de devolución:{" "}
                                        <a
                                            href={
                                                resolveUploadUrl(
                                                    complaint.refund_evidence_url,
                                                ) || "#"
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary underline"
                                        >
                                            Ver evidencia
                                        </a>
                                        {" · "}
                                        Monto: {formatCurrency(refundAmount)}
                                    </p>
                                ) : null}

                                {refundStatus === "completed" ? (
                                    <p className="text-success mt-2 font-semibold">
                                        Devolución validada y completada.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {canValidateRefund ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
                        <p className="text-sm font-semibold text-foreground">
                            Confirma si recibiste {formatCurrency(refundAmount)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                color="success"
                                radius="lg"
                                className="font-semibold"
                                isLoading={busy === "validate"}
                                isDisabled={busy !== null}
                                onPress={handleValidateRefund}
                            >
                                Sí, recibí el dinero
                            </Button>
                        </div>
                        <form onSubmit={handleRejectRefund} className="flex flex-col gap-3">
                            <Textarea
                                label="Si no lo recibiste, explica el motivo"
                                placeholder="Ej: el comprobante no coincide / no llegó el monto…"
                                value={rejectReason}
                                onValueChange={setRejectReason}
                                variant="bordered"
                                minRows={2}
                                isDisabled={busy !== null}
                            />
                            <Button
                                type="submit"
                                color="danger"
                                variant="flat"
                                radius="lg"
                                className="font-semibold w-fit"
                                isLoading={busy === "reject"}
                                isDisabled={busy !== null}
                            >
                                Rechazar comprobante
                            </Button>
                        </form>
                    </div>
                ) : null}

                {canMusicianAct ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                color="success"
                                radius="lg"
                                className="font-semibold"
                                isLoading={busy === "accept"}
                                isDisabled={busy !== null}
                                onPress={handleAccept}
                            >
                                Aceptar queja
                            </Button>
                        </div>
                        <form onSubmit={handleRespond} className="flex flex-col gap-3">
                            <Textarea
                                label="Presentar descargo"
                                placeholder="Explica tu versión (mín. 10 caracteres)"
                                value={response}
                                onValueChange={setResponse}
                                variant="bordered"
                                minRows={3}
                                isDisabled={busy !== null}
                            />
                            <FileUploadField
                                label="Evidencia del descargo (opcional)"
                                privateUpload
                                value={evidence}
                                onChange={setEvidence}
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                            />
                            <Button
                                type="submit"
                                color="warning"
                                radius="lg"
                                className="font-semibold w-fit"
                                isLoading={busy === "respond"}
                                isDisabled={busy !== null}
                            >
                                Enviar descargo
                            </Button>
                        </form>
                    </div>
                ) : null}
            </CardBody>
        </Card>
    );
}
