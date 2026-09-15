"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Divider,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Textarea,
    addToast,
    useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import AdminBookingTimelineCard from "@/components/admin/admin-booking-timeline-card";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { formatDateTime } from "@/lib/date-utils";
import ContractDocumentView from "@/components/booking/contract-document-view";
import { PaymentEvidenceViewer } from "@/components/booking/contract-pdf-viewer";
import {
    cancelAdminBooking,
    disableAdminBookingShare,
    getAdminBookingContractPdfBlob,
    getAdminBookingDetail,
    rejectAdminAdvancePayment,
    rejectAdminBalancePayment,
    validateAdminAdvancePayment,
    validateAdminBalancePayment,
} from "@/lib/admin";
import {
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    formatBookingDate,
    formatBookingTime,
    formatCurrency,
    getBookingStatusChipVariant,
} from "@/lib/booking-labels";
import { formatRelativeTime } from "@/lib/format-time";
import type { AdminBookingDetailOut, BookingStatus, PaymentOut } from "@/types/api";

type Props = {
    params: Promise<{ id: string }>;
};

function paymentTypeLabel(type: string | null): string {
    if (type === "advance") return "Anticipo";
    if (type === "balance") return "Abono final";
    if (type === "full") return "Pago total";
    return "Pago";
}

import { PAYMENT_STATUS_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/booking-labels";

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

export default function AdminBookingDetailPage({ params }: Props) {
    const { id } = use(params);
    const [booking, setBooking] = useState<AdminBookingDetailOut | null>(null);
    const [loading, setLoading] = useState(true);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const cancelModal = useDisclosure();
    const [validatingPaymentId, setValidatingPaymentId] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<PaymentOut | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

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

    async function handleCancel() {
        setBusy(true);
        try {
            await cancelAdminBooking(id, { reason: reason.trim() || null });
            addToast({ title: "Reserva cancelada por admin", color: "warning" });
            cancelModal.onClose();
            setReason("");
            await load();
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

    async function handleValidatePayment(payment: PaymentOut) {
        setValidatingPaymentId(payment.id);
        try {
            if (payment.payment_type === "balance") {
                await validateAdminBalancePayment(id);
            } else {
                await validateAdminAdvancePayment(id);
            }
            addToast({ title: "Comprobante validado", color: "success" });
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo validar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setValidatingPaymentId(null);
        }
    }

    function openRejectPayment(payment: PaymentOut) {
        setRejectTarget(payment);
        setRejectReason("");
    }

    async function handleRejectPayment() {
        if (!rejectTarget) return;
        const trimmedReason = rejectReason.trim();
        if (trimmedReason.length < 3) {
            addToast({
                title: "Motivo requerido",
                description: "Explica brevemente por qué rechazas el comprobante.",
                color: "warning",
            });
            return;
        }
        setIsRejecting(true);
        try {
            if (rejectTarget.payment_type === "balance") {
                await rejectAdminBalancePayment(id, trimmedReason);
            } else {
                await rejectAdminAdvancePayment(id, trimmedReason);
            }
            addToast({
                title: "Comprobante rechazado",
                description: "Se notificó al contratista para que vuelva a subir evidencia.",
                color: "warning",
            });
            setRejectTarget(null);
            await load();
        } catch (error) {
            addToast({
                title: "No se pudo rechazar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsRejecting(false);
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

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
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
                                <p className="text-xs text-default-500">Saldo pendiente</p>
                                <p className="font-semibold">
                                    {formatCurrency(booking.balance_due)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-default-500">Creada</p>
                                <p className="font-semibold">
                                    {formatRelativeTime(booking.created_at)}
                                </p>
                            </div>
                        </div>

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
                                    onPress={cancelModal.onOpen}
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
                                {payment.status === "initiated" ? (
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            color="success"
                                            isLoading={validatingPaymentId === payment.id}
                                            onPress={() => handleValidatePayment(payment)}
                                        >
                                            Validar
                                        </Button>
                                        <Button
                                            size="sm"
                                            color="danger"
                                            variant="flat"
                                            onPress={() => openRejectPayment(payment)}
                                        >
                                            Rechazar
                                        </Button>
                                    </div>
                                ) : null}
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

            <Modal isOpen={cancelModal.isOpen} onOpenChange={cancelModal.onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Cancelar reserva</ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-default-600">
                                    Esta acción cancela la reserva como administrador. Las
                                    partes verán el estado cancelado.
                                </p>
                                <Textarea
                                    label="Motivo (opcional)"
                                    value={reason}
                                    onValueChange={setReason}
                                    variant="bordered"
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose} isDisabled={busy}>
                                    Volver
                                </Button>
                                <Button color="danger" isLoading={busy} onPress={handleCancel}>
                                    Confirmar cancelación
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal
                isOpen={!!rejectTarget}
                onOpenChange={(open) => {
                    if (!open) setRejectTarget(null);
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Rechazar comprobante
                                <span className="text-sm font-normal text-default-500">
                                    Se notificará al contratista y al músico con el motivo.
                                </span>
                            </ModalHeader>
                            <ModalBody>
                                <Textarea
                                    label="Motivo del rechazo"
                                    value={rejectReason}
                                    onValueChange={setRejectReason}
                                    variant="bordered"
                                    minRows={3}
                                    isRequired
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    variant="flat"
                                    onPress={onClose}
                                    isDisabled={isRejecting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    color="danger"
                                    isLoading={isRejecting}
                                    onPress={handleRejectPayment}
                                >
                                    Rechazar y notificar
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}


