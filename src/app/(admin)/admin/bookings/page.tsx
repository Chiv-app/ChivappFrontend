"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
    Button,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    Textarea,
    addToast,
    useDisclosure,
} from "@heroui/react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import {
    cancelAdminBooking,
    disableAdminBookingShare,
    getAdminBookings,
    rejectAdminAdvancePayment,
    rejectAdminBalancePayment,
    validateAdminAdvancePayment,
    validateAdminBalancePayment,
} from "@/lib/admin";
import { formatPeruDate, formatPeruTime } from "@/lib/date-utils";
import {
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    formatCurrency,
    getBookingStatusChipVariant,
} from "@/lib/booking-labels";
import { UI } from "@/lib/ui-classes";
import type { AdminBookingOut, BookingStatus } from "@/types/api";

/** Reservas cuyo estado significa "hay un comprobante esperando validación admin". */
const PAYMENT_REVIEW_KIND: Partial<Record<BookingStatus, "advance" | "balance">> = {
    payment_pending: "advance",
    balance_review: "balance",
};

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
    { key: "all", label: "Todos" },
    { key: "payment_retained", label: "Confirmadas" },
    { key: "change_pending", label: "Cambio pendiente" },
    { key: "payment_pending", label: "Pago anticipo" },
    { key: "balance_review", label: "Abono en revisión" },
    { key: "in_progress", label: "En evento" },
    { key: "completed", label: "Completadas" },
    { key: "cancelled", label: "Canceladas" },
];

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<AdminBookingOut[]>([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<AdminBookingOut | null>(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const cancelModal = useDisclosure();
    const [validatingId, setValidatingId] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<AdminBookingOut | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminBookings({
                q: q.trim() || undefined,
                status: status === "all" ? undefined : status,
                limit: 100,
            });
            setBookings(data);
        } catch {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, [q, status]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            void load();
        }, 250);
        return () => window.clearTimeout(t);
    }, [load]);

    async function handleCancel() {
        if (!selected) return;
        setBusy(true);
        try {
            const updated = await cancelAdminBooking(selected.id, {
                reason: reason.trim() || null,
            });
            setBookings((current) =>
                current.map((item) => (item.id === updated.id ? updated : item)),
            );
            addToast({ title: "Reserva cancelada por admin", color: "warning" });
            cancelModal.onClose();
            setSelected(null);
            setReason("");
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

    async function handleValidatePayment(booking: AdminBookingOut) {
        const kind = PAYMENT_REVIEW_KIND[booking.status as BookingStatus];
        if (!kind) return;
        setValidatingId(booking.id);
        try {
            const updated =
                kind === "advance"
                    ? await validateAdminAdvancePayment(booking.id)
                    : await validateAdminBalancePayment(booking.id);
            setBookings((current) =>
                current.map((item) => (item.id === updated.id ? updated : item)),
            );
            addToast({ title: "Comprobante validado", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo validar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setValidatingId(null);
        }
    }

    function openRejectPayment(booking: AdminBookingOut) {
        setRejectTarget(booking);
        setRejectReason("");
    }

    async function handleRejectPayment() {
        if (!rejectTarget) return;
        const kind = PAYMENT_REVIEW_KIND[rejectTarget.status as BookingStatus];
        if (!kind) return;
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
            const updated =
                kind === "advance"
                    ? await rejectAdminAdvancePayment(rejectTarget.id, trimmedReason)
                    : await rejectAdminBalancePayment(rejectTarget.id, trimmedReason);
            setBookings((current) =>
                current.map((item) => (item.id === updated.id ? updated : item)),
            );
            addToast({
                title: "Comprobante rechazado",
                description: "Se notificó al contratista para que vuelva a subir evidencia.",
                color: "warning",
            });
            setRejectTarget(null);
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

    async function handleDisableShare(booking: AdminBookingOut) {
        try {
            const updated = await disableAdminBookingShare(booking.id);
            setBookings((current) =>
                current.map((item) => (item.id === updated.id ? updated : item)),
            );
            addToast({ title: "Share deshabilitado", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo deshabilitar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        }
    }

    const pendingPaymentCount = bookings.filter(
        (booking) => PAYMENT_REVIEW_KIND[booking.status as BookingStatus],
    ).length;

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Operaciones de reservas"
                description="Controla el pipeline completo: avance, comprobantes por validar, shares públicos y cancelaciones."
                actions={
                    <Chip color={pendingPaymentCount > 0 ? "warning" : "default"} variant="flat">
                        {pendingPaymentCount} por validar
                    </Chip>
                }
            />

            <div className="flex flex-col sm:flex-row gap-3">
                <Input
                    label="Buscar"
                    placeholder="Evento, ciudad, músico o email"
                    value={q}
                    onValueChange={setQ}
                    variant="bordered"
                    className="flex-1"
                />
                <Select
                    label="Estado"
                    selectedKeys={new Set([status])}
                    onSelectionChange={(keys) => {
                        if (keys === "all") return;
                        setStatus(Array.from(keys)[0]?.toString() ?? "all");
                    }}
                    variant="bordered"
                    className="sm:w-64"
                >
                    {STATUS_FILTERS.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                    ))}
                </Select>
                <Button color="primary" radius="lg" className="sm:self-end" onPress={load}>
                    Actualizar
                </Button>
            </div>

            <div className={UI.tablePanel}>
                <Table
                    aria-label="Reservas admin"
                    removeWrapper
                    classNames={{ base: "min-w-[720px]" }}
                >
                    <TableHeader>
                        <TableColumn>Evento</TableColumn>
                        <TableColumn>Partes</TableColumn>
                        <TableColumn>Estado</TableColumn>
                        <TableColumn>Monto</TableColumn>
                        <TableColumn>Flags</TableColumn>
                        <TableColumn>Acciones</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={loading ? "Cargando…" : "Sin reservas"}
                        isLoading={loading}
                        items={bookings}
                    >
                        {(booking) => {
                            const statusKey = booking.status as BookingStatus;
                            return (
                                <TableRow key={booking.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{booking.event_type}</p>
                                            <p className="text-xs text-default-500">
                                                {formatPeruDate(booking.event_date)} a las {formatPeruTime(booking.start_time)} ·{" "}
                                                {booking.location_city ||
                                                    booking.location_address}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs space-y-1">
                                            <p>
                                                <span className="text-default-400">M: </span>
                                                {booking.musician_name || "—"}
                                            </p>
                                            <p>
                                                <span className="text-default-400">C: </span>
                                                {booking.contractor_name || "—"}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="sm"
                                            variant={
                                                BOOKING_STATUS_COLORS[statusKey]
                                                    ? getBookingStatusChipVariant(statusKey)
                                                    : "flat"
                                            }
                                            color={
                                                BOOKING_STATUS_COLORS[statusKey] ?? "default"
                                            }
                                        >
                                            {BOOKING_STATUS_LABELS[statusKey] ??
                                                booking.status}
                                        </Chip>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {booking.price_agreed != null
                                            ? formatCurrency(Number(booking.price_agreed))
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {booking.share_enabled ? (
                                                <Chip size="sm" color="success" variant="flat">
                                                    Share
                                                </Chip>
                                            ) : null}
                                            {booking.change_requested_by ? (
                                                <Chip size="sm" color="warning" variant="flat">
                                                    Cambio
                                                </Chip>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                as={Link}
                                                href={`/admin/bookings/${booking.id}`}
                                                size="sm"
                                                color="primary"
                                                variant="flat"
                                            >
                                                Ver detalle
                                            </Button>
                                            {PAYMENT_REVIEW_KIND[statusKey] ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        color="success"
                                                        isLoading={validatingId === booking.id}
                                                        onPress={() =>
                                                            handleValidatePayment(booking)
                                                        }
                                                    >
                                                        Validar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        color="danger"
                                                        variant="flat"
                                                        onPress={() =>
                                                            openRejectPayment(booking)
                                                        }
                                                    >
                                                        Rechazar
                                                    </Button>
                                                </>
                                            ) : null}
                                            {booking.share_enabled ? (
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    onPress={() =>
                                                        handleDisableShare(booking)
                                                    }
                                                >
                                                    Cortar share
                                                </Button>
                                            ) : null}
                                            {booking.status !== "cancelled" &&
                                            booking.status !== "completed" ? (
                                                <Button
                                                    size="sm"
                                                    color="danger"
                                                    variant="flat"
                                                    onPress={() => {
                                                        setSelected(booking);
                                                        cancelModal.onOpen();
                                                    }}
                                                >
                                                    Cancelar
                                                </Button>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        }}
                    </TableBody>
                </Table>
            </div>

            <Modal isOpen={cancelModal.isOpen} onOpenChange={cancelModal.onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Cancelar reserva</ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-default-600">
                                    Esta acción cancela la reserva como administrador.
                                    Las partes verán el estado cancelado.
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
                                <Button
                                    color="danger"
                                    isLoading={busy}
                                    onPress={handleCancel}
                                >
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
