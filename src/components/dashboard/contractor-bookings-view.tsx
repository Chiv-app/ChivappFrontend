"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Pagination,
    Tab,
    Tabs,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import CancelBookingModal from "@/components/booking/cancel-booking-modal";
import BookingReservationItem, {
    type BookingLayoutMode,
} from "@/components/dashboard/booking-reservation-item";
import { listBookings } from "@/lib/bookings";
import {
    BOOKING_STATUS_LABELS,
    isCancellableBookingStatus,
} from "@/lib/booking-labels";
import type { BookingOut, BookingStatus } from "@/types/api";

type FilterKey = "all" | "action" | "upcoming" | "done";

const PAGE_SIZE = 10;

const ACTION_STATUSES: BookingStatus[] = [
    "accepted",
    "contract_pending",
    "in_progress",
];

const UPCOMING_STATUSES: BookingStatus[] = [
    "requested",
    "contract_signed",
    "payment_pending",
    "payment_retained",
    "change_pending",
    // Legacy (inalcanzables): equivalen a una reserva confirmada.
    "balance_pending",
    "balance_review",
    "payment_released",
];

const DONE_STATUSES: BookingStatus[] = ["completed", "cancelled"];

function needsContractorAction(booking: BookingOut) {
    if (
        booking.complaint_status &&
        booking.complaint_status !== "settled"
    ) {
        return true;
    }
    return ACTION_STATUSES.includes(booking.status);
}

function actionLabel(booking: BookingOut) {
    if (booking.complaint_status === "open") return "Ver disputa";
    if (
        booking.complaint_status === "musician_accepted" ||
        booking.complaint_status === "musician_responded"
    ) {
        return "Ver disputa";
    }
    const status = booking.status;
    if (status === "accepted") return "Revisar cotización";
    if (status === "contract_pending") return "Contrato pendiente";
    if (status === "in_progress") return "Continuar";
    return "Gestionar";
}

export default function ContractorBookingsView() {
    const [bookings, setBookings] = useState<BookingOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>("all");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [layout, setLayout] = useState<BookingLayoutMode>("cards");

    async function loadBookings() {
        setIsLoading(true);
        try {
            const data = await listBookings();
            setBookings(
                [...data].sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime(),
                ),
            );
        } catch (error) {
            addToast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "No se pudieron cargar las reservas.",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadBookings();
    }, []);

    const stats = useMemo(() => {
        const action = bookings.filter((b) => needsContractorAction(b)).length;
        const upcoming = bookings.filter((b) =>
            UPCOMING_STATUSES.includes(b.status),
        ).length;
        const completed = bookings.filter((b) => b.status === "completed").length;
        return { action, upcoming, completed, total: bookings.length };
    }, [bookings]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return bookings.filter((booking) => {
            if (filter === "action" && !needsContractorAction(booking)) {
                return false;
            }
            if (filter === "upcoming" && !UPCOMING_STATUSES.includes(booking.status)) {
                return false;
            }
            if (filter === "done" && !DONE_STATUSES.includes(booking.status)) {
                return false;
            }
            if (!q) return true;
            const haystack = [
                booking.event_type,
                booking.location_city,
                booking.location_address,
                booking.musician_name,
                BOOKING_STATUS_LABELS[booking.status],
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [bookings, filter, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    const pageItems = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, page]);

    useEffect(() => {
        setPage(1);
    }, [filter, query]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <div className="h-28 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-64 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <CancelBookingModal
                bookingId={cancelTargetId}
                isOpen={cancelTargetId != null}
                onOpenChange={(open) => {
                    if (!open) setCancelTargetId(null);
                }}
                onCancelled={() => {
                    void loadBookings();
                }}
            />
            <div className="rounded-4xl border border-default-200/70 bg-gradient-to-br from-primary/15 via-content1 to-content1 px-4 py-5 sm:px-6 sm:py-6 shadow-soft overflow-hidden relative">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                        <Chip color="primary" variant="flat" size="sm" className="mb-3">
                            Mis presentaciones
                        </Chip>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                            Mis reservas
                        </h1>
                        <p className="text-default-600 mt-2 max-w-2xl text-sm sm:text-base">
                            Sigue el estado de cada evento, completa lo pendiente y
                            organiza tus contrataciones con claridad.
                        </p>
                    </div>
                    <Button
                        as={Link}
                        href="/musicians"
                        color="primary"
                        radius="lg"
                        className="font-semibold shadow-glow hover:shadow-glow-lg transition-shadow w-full sm:w-auto"
                        startContent={
                            <Icon icon="material-symbols:add" width={18} />
                        }
                    >
                        Nueva reserva
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {[
                    {
                        label: "Requieren acción",
                        value: stats.action,
                        icon: "material-symbols:priority-high",
                        tone: "text-warning",
                        bg: "bg-warning/10",
                    },
                    {
                        label: "En curso",
                        value: stats.upcoming,
                        icon: "material-symbols:event-upcoming",
                        tone: "text-primary",
                        bg: "bg-primary/10",
                    },
                    {
                        label: "Finalizadas",
                        value: stats.completed,
                        icon: "material-symbols:check-circle",
                        tone: "text-success",
                        bg: "bg-success/10",
                    },
                    {
                        label: "Total",
                        value: stats.total,
                        icon: "material-symbols:calendar-month",
                        tone: "text-secondary",
                        bg: "bg-secondary/10",
                    },
                ].map((item) => (
                    <Card key={item.label} className="border border-default-200/70 shadow-soft">
                        <CardBody className="gap-2 sm:gap-3 p-3 sm:p-4">
                            <div
                                className={`flex size-8 sm:size-9 items-center justify-center rounded-xl ${item.bg} ${item.tone}`}
                            >
                                <Icon icon={item.icon} width={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] sm:text-xs text-default-500">
                                    {item.label}
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                                    {item.value}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col gap-4">
                <Tabs
                    selectedKey={filter}
                    onSelectionChange={(key) => setFilter(key as FilterKey)}
                    variant="underlined"
                    color="primary"
                    classNames={{
                        base: "w-full overflow-x-auto",
                        tabList: "gap-2 sm:gap-4 flex-nowrap",
                    }}
                >
                    <Tab key="all" title={`Todas (${bookings.length})`} />
                    <Tab key="action" title={`Acción (${stats.action})`} />
                    <Tab key="upcoming" title={`En curso (${stats.upcoming})`} />
                    <Tab key="done" title="Cerradas" />
                </Tabs>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <Input
                        value={query}
                        onValueChange={setQuery}
                        placeholder="Buscar por evento, músico, ciudad o estado"
                        variant="bordered"
                        radius="lg"
                        className="w-full max-w-sm"
                        startContent={
                            <Icon
                                icon="material-symbols:search"
                                width={18}
                                className="text-default-400"
                            />
                        }
                    />
                    <div className="inline-flex items-center rounded-2xl bg-content2/70 p-1 gap-1 shrink-0">
                        <Button
                            isIconOnly
                            aria-label="Vista en cards"
                            size="sm"
                            radius="lg"
                            variant={layout === "cards" ? "solid" : "light"}
                            color={layout === "cards" ? "primary" : "default"}
                            onPress={() => setLayout("cards")}
                        >
                            <Icon icon="material-symbols:grid-view" width={18} />
                        </Button>
                        <Button
                            isIconOnly
                            aria-label="Vista en lista"
                            size="sm"
                            radius="lg"
                            variant={layout === "list" ? "solid" : "light"}
                            color={layout === "list" ? "primary" : "default"}
                            onPress={() => setLayout("list")}
                        >
                            <Icon icon="material-symbols:view-list" width={18} />
                        </Button>
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="gap-4 p-10 text-center">
                        <Icon
                            icon="material-symbols:event-busy"
                            width={36}
                            className="mx-auto text-default-400"
                        />
                        <p className="font-semibold text-foreground">
                            No hay reservas en esta vista
                        </p>
                        <p className="text-sm text-default-500">
                            Explora músicos verificados y crea tu primera reserva.
                        </p>
                        <Button
                            as={Link}
                            href="/musicians"
                            color="primary"
                            variant="flat"
                            radius="lg"
                            className="mx-auto font-semibold"
                        >
                            Explorar músicos
                        </Button>
                    </CardBody>
                </Card>
            ) : (
                <div className="flex flex-col gap-3">
                    <div
                        className={
                            layout === "cards"
                                ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                                : "flex flex-col gap-3"
                        }
                    >
                        {pageItems.map((booking) => {
                            const urgent = needsContractorAction(booking);
                            const canCancel = isCancellableBookingStatus(booking.status);

                            return (
                                <BookingReservationItem
                                    key={booking.id}
                                    booking={booking}
                                    role="contractor"
                                    layout={layout}
                                    urgent={urgent}
                                    primaryActionLabel={actionLabel(booking)}
                                    detailHref={`/contractor/bookings/${booking.id}`}
                                    canCancel={canCancel}
                                    isCancelling={false}
                                    onCancel={() => setCancelTargetId(booking.id)}
                                />
                            );
                        })}
                    </div>

                    {filtered.length > PAGE_SIZE ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <p className="text-sm text-default-500">
                                Mostrando {(page - 1) * PAGE_SIZE + 1}–
                                {Math.min(page * PAGE_SIZE, filtered.length)} de{" "}
                                {filtered.length}
                            </p>
                            <Pagination
                                page={page}
                                total={totalPages}
                                onChange={setPage}
                                showControls
                                color="primary"
                                radius="lg"
                                size="sm"
                            />
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
