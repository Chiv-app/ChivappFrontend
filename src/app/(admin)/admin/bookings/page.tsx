"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
    Button,
    Chip,
    Input,
    Select,
    SelectItem,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    addToast,
} from "@heroui/react";
import AdminCancelBookingModal from "@/components/admin/admin-cancel-booking-modal";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { disableAdminBookingShare, getAdminBookings } from "@/lib/admin";
import { formatPeruDate, formatPeruTime } from "@/lib/date-utils";
import {
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    formatCurrency,
    getBookingStatusChipVariant,
} from "@/lib/booking-labels";
import { UI } from "@/lib/ui-classes";
import type { AdminBookingOut, BookingStatus } from "@/types/api";

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
    { key: "all", label: "Todos" },
    { key: "payment_retained", label: "Confirmadas" },
    { key: "change_pending", label: "Cambio pendiente" },
    { key: "payment_pending", label: "Pago en proceso" },
    { key: "in_progress", label: "En evento" },
    { key: "completed", label: "Completadas" },
    { key: "cancelled", label: "Canceladas" },
];

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<AdminBookingOut[]>([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

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

    function handleCancelled(updated: AdminBookingOut) {
        setBookings((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
        );
    }

    const failedRefundCount = bookings.filter(
        (booking) => booking.cancellation_refund_status === "failed",
    ).length;

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Operaciones de reservas"
                description="Controla el pipeline completo: avance, pagos con Mercado Pago, shares públicos, cancelaciones y reembolsos."
                actions={
                    <Chip color={failedRefundCount > 0 ? "danger" : "default"} variant="flat">
                        {failedRefundCount} reembolsos con error
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
                                            {booking.cancellation_refund_status === "failed" ? (
                                                <Chip size="sm" color="danger" variant="flat">
                                                    Reembolso fallido
                                                </Chip>
                                            ) : booking.cancellation_refund_status === "processing" ? (
                                                <Chip size="sm" color="primary" variant="flat">
                                                    Reembolso en proceso
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
                                                    onPress={() => setCancelTargetId(booking.id)}
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

            <AdminCancelBookingModal
                bookingId={cancelTargetId}
                isOpen={cancelTargetId != null}
                onOpenChange={(open) => {
                    if (!open) setCancelTargetId(null);
                }}
                onCancelled={handleCancelled}
            />
        </div>
    );
}
