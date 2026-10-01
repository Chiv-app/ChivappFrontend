"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Divider,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import AdminBookingTimelineCard from "@/components/admin/admin-booking-timeline-card";
import AdminCancelBookingModal from "@/components/admin/admin-cancel-booking-modal";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { formatDateTime } from "@/lib/date-utils";
import ContractDocumentView from "@/components/booking/contract-document-view";
import { PaymentEvidenceViewer } from "@/components/booking/contract-pdf-viewer";
import {
    approveAdminCancellationRefund,
    disableAdminBookingShare,
    getAdminBookingContractPdfBlob,
    getAdminBookingDetail,
    retryAdminCancellationRefund,
} from "@/lib/admin";
import {
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    formatBookingDate,
    formatBookingTime,
    formatCurrency,
    getBookingStatusChipVariant,
    toAmount,
} from "@/lib/booking-labels";
import { formatRelativeTime } from "@/lib/format-time";
import type { AdminBookingDetailOut, BookingStatus } from "@/types/api";

type Props = {
    params: Promise<{ id: string }>;
};

import { PAYMENT_STATUS_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/booking-labels";

function paymentTypeLabel(type: string | null): string {
    return (type && PAYMENT_TYPE_LABELS[type]) || "Pago";
}

const PAYMENT_STATUS_COLOR: Record<
    string,
    "default" | "warning" | "success" | "danger" | "primary"
> = {
    initiated: "warning",
    retained: "primary",
    released: "success",
    rejected: "danger",
    failed: "danger",
    refunded: "default",
};

const REFUND_STATUS_META: Record<
    string,
    { label: string; color: "default" | "warning" | "success" | "danger" | "primary" }
> = {
    none: { label: "Sin reembolso", color: "default" },
    pending_approval: { label: "Por aprobar", color: "warning" },
    processing: { label: "En proceso", color: "primary" },
    completed: { label: "Reembolsado", color: "success" },
    failed: { label: "Fallido", color: "danger" },
    rejected: { label: "Rechazado", color: "default" },
};

function formatAmountInput(value: number): string {
    return value.toFixed(2);
}

const CANCELLED_BY_LABELS: Record<string, string> = {
    musician: "el músico",
    contractor: "el contratista",
    admin: "admin",
};

export default function AdminBookingDetailPage({ params }: Props) {
    const { id } = use(params);
    const [booking, setBooking] = useState<AdminBookingDetailOut | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [isRetryingRefund, setIsRetryingRefund] = useState(false);
    const [refundAmountInput, setRefundAmountInput] = useState("");
    const [isApprovingRefund, setIsApprovingRefund] = useState(false);
    const [isRejectRefundOpen, setIsRejectRefundOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminBookingDetail(id);
            setBooking(data);
        } catch (error) {
            addToast({
                title: "No se pudo cargar la reserva",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
            setBooking(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    // Prefill del monto editable con el calculado por la política.
    const pendingPolicyAmount =
        booking?.cancellation_refund_status === "pending_approval"
            ? toAmount(booking.cancellation_refund_amount)
            : null;
    useEffect(() => {
        if (pendingPolicyAmount != null) {
            setRefundAmountInput(formatAmountInput(pendingPolicyAmount));
        }
    }, [pendingPolicyAmount]);

    async function submitRefundDecision(amount: number | null) {
        setIsApprovingRefund(true);
        try {
            const updated = await approveAdminCancellationRefund(id, amount);
            const status = updated.cancellation_refund_status;
            addToast({
                title:
                    status === "rejected"
                        ? "Reembolso rechazado"
                        : status === "completed"
                          ? "Reembolso aprobado y completado"
                          : status === "failed"
                            ? "Reembolso aprobado, pero falló en Mercado Pago"
                            : "Reembolso aprobado",
                description:
                    status === "failed"
                        ? (updated.cancellation_refund_error ?? "Puedes reintentarlo.")
                        : undefined,
                color:
                    status === "failed"
                        ? "danger"
                        : status === "rejected"
                          ? "warning"
                          : "success",
            });
            setIsRejectRefundOpen(false);
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo procesar el reembolso",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsApprovingRefund(false);
        }
    }

    function handleApproveRefund() {
        const parsed = Number(refundAmountInput);
        if (refundAmountInput.trim() === "" || !Number.isFinite(parsed) || parsed <= 0) {
            addToast({
                title: "Monto inválido",
                description:
                    "Indica un monto mayor a cero. Para no reembolsar usa «Rechazar reembolso».",
                color: "warning",
            });
            return;
        }
        const retained = booking ? toAmount(booking.amount_paid) : 0;
        if (retained > 0 && parsed > retained + 0.001) {
            addToast({
                title: "Monto inválido",
                description: `El monto no puede superar lo retenido (${formatCurrency(retained)}).`,
                color: "warning",
            });
            return;
        }
        const rounded = Math.round(parsed * 100) / 100;
        // Sin cambios: se envía null para usar el monto exacto de la política.
        const amount =
            pendingPolicyAmount != null && Math.abs(rounded - pendingPolicyAmount) < 0.005
                ? null
                : rounded;
        void submitRefundDecision(amount);
    }

    async function handleRetryRefund() {
        setIsRetryingRefund(true);
        try {
            const updated = await retryAdminCancellationRefund(id);
            addToast({
                title:
                    updated.cancellation_refund_status === "completed"
                        ? "Reembolso completado"
                        : updated.cancellation_refund_status === "failed"
                          ? "El reembolso volvió a fallar"
                          : "Reembolso reintentado",
                description: updated.cancellation_refund_error ?? undefined,
                color: updated.cancellation_refund_status === "failed" ? "danger" : "success",
            });
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo reintentar el reembolso",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsRetryingRefund(false);
        }
    }

    async function handleDisableShare() {
        try {
            await disableAdminBookingShare(id);
            addToast({ title: "Share deshabilitado", color: "success" });
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo deshabilitar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        }
    }

    if (loading) {
        return (
            <div className="h-96 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
        );
    }

    if (!booking) {
        return (
            <div className="text-center py-16">
                <p className="text-default-500 mb-4">No se encontró esta reserva.</p>
                <Button as={Link} href="/admin/bookings" variant="flat" radius="lg">
                    Volver al listado
                </Button>
            </div>
        );
    }

    const statusKey = booking.status as BookingStatus;
    const finalReview = booking.reviews.find((review) => review.is_final);
    const refundStatus = booking.cancellation_refund_status ?? null;
    const refundMeta = refundStatus ? REFUND_STATUS_META[refundStatus] : undefined;
    const showRefundInfo =
        booking.status === "cancelled" &&
        (toAmount(booking.cancellation_refund_amount) > 0 ||
            (refundStatus != null && refundStatus !== "none"));

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={booking.event_type}
                description={`${formatBookingDate(booking.event_date)} · ${formatBookingTime(booking.start_time)} · ${
                    booking.location_city || booking.location_address
                }`}
                actions={
                    <Button
                        as={Link}
                        href="/admin/bookings"
                        variant="flat"
                        radius="lg"
                        startContent={<Icon icon="material-symbols:arrow-back" width={18} />}
                    >
                        Volver
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="border border-default-200/70 shadow-soft lg:col-span-2">
                    <CardBody className="gap-4 p-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <Chip
                                variant={getBookingStatusChipVariant(statusKey)}
                                color={BOOKING_STATUS_COLORS[statusKey] ?? "default"}
                            >
                                {BOOKING_STATUS_LABELS[statusKey] ?? booking.status}
                            </Chip>
                            {booking.share_enabled ? (
                                <Chip size="sm" color="success" variant="flat">
                                    Share activo
                                </Chip>
                            ) : null}
                            {booking.change_requested_by ? (
                                <Chip size="sm" color="warning" variant="flat">
                                    Cambio pendiente
                                </Chip>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="rounded-xl border border-default-200 p-3">
                                <p className="text-xs text-default-500">Músico</p>
                                <p className="font-medium text-foreground">
                                    {booking.musician_name || "—"}
                                </p>
                                <p className="text-default-500">{booking.musician_email}</p>
                                <p className="text-default-500">
                                    {booking.musician_phone || "Sin teléfono"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-default-200 p-3">
                                <p className="text-xs text-default-500">Contratista</p>
                                <p className="font-medium text-foreground">
                                    {booking.contractor_name || "—"}
                                </p>
                                <p className="text-default-500">{booking.contractor_email}</p>
                                <p className="text-default-500">
                                    {booking.contractor_phone || "Sin teléfono"}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-default-500">Precio acordado</p>
                                <p className="font-semibold">
                                    {booking.price_agreed != null
                                        ? formatCurrency(booking.price_agreed)
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-default-500">Pagado</p>
                                <p className="font-semibold">
                                    {formatCurrency(booking.amount_paid)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-default-500">Creada</p>
                                <p className="font-semibold">
                                    {formatRelativeTime(booking.created_at)}
                                </p>
                            </div>
                        </div>

                        {showRefundInfo ? (
                            <div
                                className={`rounded-xl border p-3 flex flex-col gap-2 text-sm ${
                                    refundStatus === "failed"
                                        ? "border-danger/30 bg-danger/5"
                                        : refundStatus === "pending_approval"
                                          ? "border-warning/40 bg-warning/5"
                                          : "border-default-200"
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-foreground">
                                        Reembolso por cancelación
                                        {booking.cancelled_by
                                            ? ` · cancelada por ${
                                                  CANCELLED_BY_LABELS[booking.cancelled_by] ??
                                                  booking.cancelled_by
                                              }`
                                            : ""}
                                    </p>
                                    {refundMeta ? (
                                        <Chip size="sm" variant="flat" color={refundMeta.color}>
                                            {refundMeta.label}
                                        </Chip>
                                    ) : null}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-default-500">
                                            {refundStatus === "pending_approval"
                                                ? "Monto según la política"
                                                : "Monto"}
                                        </p>
                                        <p className="font-semibold">
                                            {formatCurrency(
                                                toAmount(booking.cancellation_refund_amount),
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-default-500">Porcentaje</p>
                                        <p className="font-semibold">
                                            {toAmount(booking.cancellation_refund_percent)} %
                                        </p>
                                    </div>
                                </div>
                                {refundStatus === "pending_approval" ? (
                                    <div className="flex flex-col gap-3 pt-1">
                                        <p className="text-xs text-default-600">
                                            Revisa el monto antes de aprobar. Se reembolsará
                                            por Mercado Pago al medio de pago del contratista.
                                            Lo que no se reembolse queda retenido para liquidar
                                            al músico.
                                            {toAmount(booking.amount_paid) > 0
                                                ? ` Retenido: ${formatCurrency(toAmount(booking.amount_paid))}.`
                                                : ""}
                                        </p>
                                        <Input
                                            type="number"
                                            label="Monto a reembolsar (S/)"
                                            min="0"
                                            step="0.01"
                                            max={
                                                toAmount(booking.amount_paid) > 0
                                                    ? String(toAmount(booking.amount_paid))
                                                    : undefined
                                            }
                                            value={refundAmountInput}
                                            onValueChange={setRefundAmountInput}
                                            variant="bordered"
                                            size="sm"
                                            className="max-w-xs"
                                            isDisabled={isApprovingRefund}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                color="success"
                                                isLoading={isApprovingRefund && !isRejectRefundOpen}
                                                isDisabled={isApprovingRefund}
                                                onPress={handleApproveRefund}
                                                startContent={
                                                    <Icon icon="material-symbols:check-circle" width={16} />
                                                }
                                            >
                                                Aprobar reembolso
                                            </Button>
                                            <Button
                                                size="sm"
                                                color="danger"
                                                variant="flat"
                                                isDisabled={isApprovingRefund}
                                                onPress={() => setIsRejectRefundOpen(true)}
                                            >
                                                Rechazar reembolso
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                                {refundStatus === "failed" ? (
                                    <>
                                        {booking.cancellation_refund_error ? (
                                            <p className="text-xs text-danger break-words">
                                                Error de Mercado Pago:{" "}
                                                {booking.cancellation_refund_error}
                                            </p>
                                        ) : null}
                                        <div>
                                            <Button
                                                size="sm"
                                                color="danger"
                                                isLoading={isRetryingRefund}
                                                onPress={handleRetryRefund}
                                                startContent={
                                                    isRetryingRefund ? null : (
                                                        <Icon icon="material-symbols:refresh" width={16} />
                                                    )
                                                }
                                            >
                                                Reintentar reembolso
                                            </Button>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        ) : null}

                        <Divider />

                        <div className="flex flex-wrap gap-2">
                            {booking.share_enabled ? (
                                <Button size="sm" variant="flat" onPress={handleDisableShare}>
                                    Cortar share
                                </Button>
                            ) : null}
                            {booking.status !== "cancelled" && booking.status !== "completed" ? (
                                <Button
                                    size="sm"
                                    color="danger"
                                    variant="flat"
                                    onPress={() => setIsCancelOpen(true)}
                                >
                                    Cancelar reserva
                                </Button>
                            ) : null}
                        </div>
                    </CardBody>
                </Card>

                <AdminBookingTimelineCard
                    status={statusKey}
                    hasReview={Boolean(finalReview)}
                />
            </div>

            <Card className="border border-default-200/70 shadow-soft">
                <CardBody className="gap-4 p-6">
                    <h3 className="text-lg font-bold">Contrato</h3>
                    <ContractDocumentView
                        contract={booking.contract}
                        bookingId={booking.id}
                        fetchPdfBlob={getAdminBookingContractPdfBlob}
                    />
                </CardBody>
            </Card>

            <Card className="border border-default-200/70 shadow-soft">
                <CardBody className="gap-4 p-6">
                    <h3 className="text-lg font-bold">Pagos ({booking.payments.length})</h3>
                    {booking.payments.length === 0 ? (
                        <p className="text-sm text-default-500">
                            Aún no hay pagos registrados en esta reserva.
                        </p>
                    ) : (
                        booking.payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="rounded-2xl border border-default-200 bg-default-50/60 p-4 flex flex-col gap-3"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-foreground">
                                        {paymentTypeLabel(payment.payment_type)} ·{" "}
                                        {formatCurrency(Number(payment.amount))}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-default-500">
                                            {formatRelativeTime(payment.created_at)}
                                        </span>
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            color={PAYMENT_STATUS_COLOR[payment.status] ?? "default"}
                                        >
                                            {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                                        </Chip>
                                    </div>
                                </div>
                                {payment.rejection_reason ? (
                                    <p className="text-sm text-danger">
                                        Motivo del rechazo: {payment.rejection_reason}
                                    </p>
                                ) : null}
                                <PaymentEvidenceViewer
                                    evidenceUrl={payment.evidence_url}
                                    evidenceUrls={payment.evidence_urls}
                                    label={`Comprobante · ${paymentTypeLabel(payment.payment_type)}`}
                                />
                            </div>
                        ))
                    )}
                </CardBody>
            </Card>

            <Card className="border border-default-200/70 shadow-soft">
                <CardBody className="gap-4 p-6">
                    <h3 className="text-lg font-bold">
                        Conversación ({booking.messages.length})
                    </h3>
                    {booking.messages.length === 0 ? (
                        <p className="text-sm text-default-500">Sin mensajes todavía.</p>
                    ) : (
                        <div className="max-h-96 overflow-y-auto flex flex-col gap-3 pr-1">
                            {booking.messages.map((message) => (
                                <div
                                    key={message.id}
                                    className="rounded-2xl border border-default-200 bg-default-50/60 p-3 text-sm"
                                >
                                    <p className="text-xs text-default-500 mb-1">
                                        {message.sender_name ?? "Usuario"} ·{" "}
                                        {formatDateTime(message.created_at)}
                                    </p>
                                    <p>{message.body}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {booking.complaint ? (
                <Card className="border border-danger/30 shadow-soft">
                    <CardBody className="gap-3 p-6">
                        <h3 className="text-lg font-bold text-danger">Queja</h3>
                        <p className="text-sm">
                            <span className="text-default-500">Estado: </span>
                            {booking.complaint.status}
                        </p>
                        <p className="text-sm">{booking.complaint.reason}</p>
                        {booking.complaint.musician_response ? (
                            <p className="text-sm">
                                <span className="text-default-500">Respuesta del músico: </span>
                                {booking.complaint.musician_response}
                            </p>
                        ) : null}
                    </CardBody>
                </Card>
            ) : null}

            {finalReview ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="gap-2 p-6">
                        <h3 className="text-lg font-bold">Reseña final</h3>
                        <p className="text-sm font-semibold">{finalReview.rating}★</p>
                        {finalReview.comment ? (
                            <p className="text-sm text-default-600">{finalReview.comment}</p>
                        ) : null}
                    </CardBody>
                </Card>
            ) : null}

            <Modal
                isOpen={isRejectRefundOpen}
                onOpenChange={(open) => {
                    if (!isApprovingRefund) setIsRejectRefundOpen(open);
                }}
                placement="center"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>¿Rechazar el reembolso?</ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-default-600">
                                    El contratista no recibirá devolución por esta
                                    cancelación. Todo lo retenido quedará para liquidar al
                                    músico. Esta acción no se puede deshacer.
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    variant="flat"
                                    onPress={onClose}
                                    isDisabled={isApprovingRefund}
                                >
                                    Volver
                                </Button>
                                <Button
                                    color="danger"
                                    isLoading={isApprovingRefund}
                                    onPress={() => void submitRefundDecision(0)}
                                >
                                    Sí, rechazar reembolso
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <AdminCancelBookingModal
                bookingId={booking.id}
                isOpen={isCancelOpen}
                onOpenChange={setIsCancelOpen}
                onCancelled={() => {
                    void load();
                }}
            />
        </div>
    );
}


