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

type FilterKey = "all" | "action" | "active" | "completed" | "cancelled";

const PAGE_SIZE = 10;

const ACTION_STATUSES: BookingStatus[] = [
    "accepted",
    "contract_pending",
    "contract_signed",
    "in_progress",
];

function needsContractorAction(booking: BookingOut) {
    if (booking.status === "completed" || booking.status === "cancelled") {
        return false;
    }
    if (
        booking.complaint_status &&
        booking.complaint_status !== "settled"
    ) {
        return true;
    }
    return ACTION_STATUSES.includes(booking.status);
}

function getContractorBookingBucket(
    booking: BookingOut,
): Exclude<FilterKey, "all"> {
    if (booking.status === "completed") return "completed";
    if (booking.status === "cancelled") return "cancelled";
    if (needsContractorAction(booking)) return "action";
    return "active";
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
    const [loadError, setLoadError] = useState<string | null>(null);

    async function loadBookings() {
        setIsLoading(true);
        setLoadError(null);
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
            const msg =
                error instanceof Error
                    ? error.message
                    : "No se pudieron cargar las reservas.";
            setLoadError(msg);
            addToast({
                title: "Error",
                description: msg,
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void Promise.resolve().then(() => loadBookings());
    }, []);

    const stats = useMemo(() => {
        let action = 0;
        let active = 0;
        let completed = 0;
        let cancelled = 0;

        for (const booking of bookings) {
            const bucket = getContractorBookingBucket(booking);
            if (bucket === "action") action += 1;
            else if (bucket === "active") active += 1;
            else if (bucket === "completed") completed += 1;
            else if (bucket === "cancelled") cancelled += 1;
        }

        return { action, active, completed, cancelled, total: bookings.length };
    }, [bookings]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return bookings.filter((booking) => {
            const bucket = getContractorBookingBucket(booking);
            if (filter !== "all" && bucket !== filter) {
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
    const currentPage = Math.min(page, totalPages);

    const pageItems = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, currentPage]);

    if (isLoading) {
        return (
            <div className="w-full flex flex-col gap-4">
                <div className="h-28 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-64 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6">
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

            {loadError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar tus reservas
                        </p>
                        <p className="text-xs text-default-600">{loadError}</p>
                    </div>
                    <Button size="sm" color="danger" variant="flat" onPress={loadBookings}>
                        Reintentar
                    </Button>
                </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {[
                    {
                        key: "action" as FilterKey,
                        label: "Por atender",
                        subtitle: "Cotizaciones, firmas o pagos por completar",
                        value: stats.action,
                        icon: "material-symbols:priority-high",
                        tone: "text-warning",
                        bg: "bg-warning/10",
                        activeBorder: "border-warning ring-2 ring-warning/20 bg-warning/5",
                    },
                    {
                        key: "active" as FilterKey,
                        label: "Activas",
                        subtitle: "Enviadas o confirmadas próximas al evento",
                        value: stats.active,
                        icon: "material-symbols:event-upcoming",
                        tone: "text-primary",
                        bg: "bg-primary/10",
                        activeBorder: "border-primary ring-2 ring-primary/20 bg-primary/5",
                    },
                    {
                        key: "completed" as FilterKey,
                        label: "Finalizadas",
                        subtitle: "Eventos realizados y cerrados con éxito",
                        value: stats.completed,
                        icon: "material-symbols:check-circle",
                        tone: "text-success",
                        bg: "bg-success/10",
                        activeBorder: "border-success ring-2 ring-success/20 bg-success/5",
                    },
                    {
                        key: "all" as FilterKey,
                        label: "Todas las reservas",
                        subtitle:
                            stats.cancelled > 0
                                ? `Incluye ${stats.cancelled} cancelada${stats.cancelled === 1 ? "" : "s"}`
                                : "Historial completo de solicitudes",
                        value: stats.total,
                        icon: "material-symbols:calendar-month",
                        tone: "text-secondary",
                        bg: "bg-secondary/10",
                        activeBorder: "border-secondary ring-2 ring-secondary/20 bg-secondary/5",
                    },
                ].map((item) => {
                    const isSelected = filter === item.key;
                    return (
                        <button
                            key={item.label}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                                setFilter((prev) =>
                                    prev === item.key && item.key !== "all"
                                        ? "all"
                                        : item.key,
                                );
                                setPage(1);
                            }}
                            className={`group text-left rounded-2xl border p-3.5 sm:p-4 transition-all shadow-soft hover:border-default-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                                isSelected
                                    ? item.activeBorder
                                    : "border-default-200/70 bg-content1"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.tone}`}
                                    >
                                        <Icon icon={item.icon} width={18} aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">
                                            {item.label}
                                        </p>
                                        <p className="text-[11px] text-default-500 line-clamp-1 mt-0.5">
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums shrink-0">
                                    {item.value}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 rounded-2xl border border-default-200/70 bg-content1 p-2 sm:p-2.5 shadow-soft">
                <Tabs
                    aria-label="Filtrar reservas del contratante por estado"
                    selectedKey={filter}
                    onSelectionChange={(key) => {
                        setFilter(key as FilterKey);
                        setPage(1);
                    }}
                    variant="underlined"
                    color="primary"
                    classNames={{
                        base: "w-full lg:w-auto overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                        tabList: "gap-1 sm:gap-2 flex-nowrap border-b-0 p-0",
                        tab: "h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium",
                    }}
                >
                    <Tab key="all" title={`Todas (${bookings.length})`} />
                    <Tab key="action" title={`Por atender (${stats.action})`} />
                    <Tab key="active" title={`Activas (${stats.active})`} />
                    <Tab key="completed" title={`Finalizadas (${stats.completed})`} />
                    <Tab key="cancelled" title={`Canceladas (${stats.cancelled})`} />
                </Tabs>
                <div className="flex items-center gap-2 w-full lg:w-auto lg:justify-end">
                    <Input
                        aria-label="Buscar reservas por evento, músico, ciudad o estado"
                        value={query}
                        onValueChange={(val) => {
                            setQuery(val);
                            setPage(1);
                        }}
                        placeholder="Buscar por evento, músico, ciudad o estado..."
                        variant="bordered"
                        radius="lg"
                        size="sm"
                        className="w-full lg:w-72 xl:w-80"
                        startContent={
                            <Icon
                                icon="material-symbols:search"
                                width={18}
                                className="text-default-400"
                            />
                        }
                    />
                    <div className="inline-flex items-center rounded-xl bg-content2/70 p-1 gap-1 shrink-0">
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
                                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4"
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
                                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                                {Math.min(currentPage * PAGE_SIZE, filtered.length)} de{" "}
                                {filtered.length}
                            </p>
                            <Pagination
                                page={currentPage}
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
