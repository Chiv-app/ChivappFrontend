"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    Input,
    Pagination,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import CancelBookingModal from "@/components/booking/cancel-booking-modal";
import {
    BookingAgendaListItem,
    BookingDetailPreviewContent,
    BookingMobileSheet,
    groupBookingsByEventDate,
} from "@/components/dashboard/booking-master-detail-panel";
import { listBookings } from "@/lib/bookings";
import {
    BOOKING_STATUS_LABELS,
    formatCurrency,
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
    if (status === "contract_pending") return "Firmar contrato";
    if (status === "contract_signed") return "Completar pago";
    if (status === "in_progress") return "Calificar presentación";
    return "Gestionar reserva";
}

export default function ContractorBookingsView() {
    const [bookings, setBookings] = useState<BookingOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>("all");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
        null,
    );
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
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
        let quoted = 0;

        for (const booking of bookings) {
            const bucket = getContractorBookingBucket(booking);
            if (bucket === "action") action += 1;
            else if (bucket === "active") active += 1;
            else if (bucket === "completed") completed += 1;
            else if (bucket === "cancelled") cancelled += 1;

            if (booking.status !== "cancelled" && booking.price_agreed != null) {
                quoted += Number(booking.price_agreed);
            }
        }

        return { action, active, completed, cancelled, quoted, total: bookings.length };
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

    const dateGroups = useMemo(
        () => groupBookingsByEventDate(pageItems),
        [pageItems],
    );

    const activeSelectedBooking = useMemo(() => {
        if (filtered.length === 0) return null;
        if (selectedBookingId) {
            const found = filtered.find((b) => b.id === selectedBookingId);
            if (found) return found;
        }
        return pageItems[0] ?? filtered[0] ?? null;
    }, [filtered, pageItems, selectedBookingId]);

    if (isLoading) {
        return (
            <div className="w-full flex flex-col gap-4">
                <div className="h-14 rounded-2xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-96 rounded-3xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    const filterPills: Array<{
        key: FilterKey;
        label: string;
        count: number;
    }> = [
        { key: "all", label: "Todas", count: bookings.length },
        { key: "action", label: "Por atender", count: stats.action },
        { key: "active", label: "Activas", count: stats.active },
        { key: "completed", label: "Finalizadas", count: stats.completed },
        { key: "cancelled", label: "Canceladas", count: stats.cancelled },
    ];

    return (
        <div className="w-full flex flex-col gap-4">
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

            {/* 1. Cabecera compacta integrada */}
            <header className="flex items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    Mis reservas
                </h1>
                <Button
                    as={Link}
                    href="/musicians"
                    color="primary"
                    radius="full"
                    className="font-bold shadow-soft px-4 sm:px-5 shrink-0"
                    startContent={
                        <Icon icon="material-symbols:add" width={18} />
                    }
                >
                    Nueva reserva
                </Button>
            </header>

            {loadError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar tus reservas
                        </p>
                        <p className="text-xs text-default-600">{loadError}</p>
                    </div>
                    <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={loadBookings}
                    >
                        Reintentar
                    </Button>
                </div>
            ) : null}

            {/* 2. Barra compacta clicable de indicadores (Tira en Desktop, grilla 2x2 en Mobile) */}
            <div className="rounded-2xl border border-default-200/80 bg-content1 p-2.5 sm:px-4 sm:py-2.5 shadow-soft">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                        {[
                            {
                                key: "action" as FilterKey,
                                label: "Por atender",
                                count: stats.action,
                                dotClass: "bg-warning",
                                activeClass:
                                    "bg-warning/15 border-warning/40 text-foreground",
                            },
                            {
                                key: "active" as FilterKey,
                                label: "Activas",
                                count: stats.active,
                                dotClass: "bg-primary",
                                activeClass:
                                    "bg-primary/15 border-primary/40 text-foreground",
                            },
                            {
                                key: "completed" as FilterKey,
                                label: "Finalizadas",
                                count: stats.completed,
                                dotClass: "bg-success",
                                activeClass:
                                    "bg-success/15 border-success/40 text-foreground",
                            },
                        ].map((item) => {
                            const isSelected = filter === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => {
                                        setFilter((prev) =>
                                            prev === item.key ? "all" : item.key,
                                        );
                                        setPage(1);
                                    }}
                                    className={`inline-flex items-center justify-between sm:justify-start gap-2 rounded-xl border px-3 py-2 sm:py-1.5 text-xs sm:text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                                        isSelected
                                            ? item.activeClass
                                            : "border-transparent bg-default-100/70 sm:bg-transparent hover:bg-default-100 text-default-700"
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-2 min-w-0">
                                        <span
                                            aria-hidden="true"
                                            className={`size-2.5 rounded-full shrink-0 ${item.dotClass}`}
                                        />
                                        <span className="truncate font-medium">
                                            {item.label}
                                        </span>
                                    </span>
                                    <span className="font-extrabold text-foreground tabular-nums">
                                        {item.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        aria-pressed={filter === "all"}
                        onClick={() => {
                            setFilter("all");
                            setPage(1);
                        }}
                        title="Suma de reservas activas y finalizadas (no incluye canceladas)"
                        className="inline-flex items-center justify-between sm:justify-end gap-2 rounded-xl border border-transparent bg-default-100/70 sm:bg-transparent px-3 py-2 sm:py-1.5 text-xs sm:text-sm hover:bg-default-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                        <span className="text-default-600 font-medium">
                            Cotizado:
                        </span>
                        <span className="font-extrabold text-primary-text text-sm sm:text-base tabular-nums">
                            {formatCurrency(stats.quoted)}
                        </span>
                    </button>
                </div>
            </div>

            {/* 3. Layout Maestro-Detalle */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(21rem,26rem)_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)] gap-4 items-start">
                {/* Columna Izquierda */}
                <div className="flex flex-col gap-3 min-w-0">
                    <Input
                        aria-label="Buscar reservas por evento, músico o lugar"
                        value={query}
                        onValueChange={(val) => {
                            setQuery(val);
                            setPage(1);
                        }}
                        placeholder="Buscar por evento, músico o lugar..."
                        variant="bordered"
                        radius="full"
                        size="sm"
                        classNames={{
                            inputWrapper: "bg-content1 border-default-200/80 shadow-xs",
                        }}
                        startContent={
                            <Icon
                                icon="material-symbols:search"
                                width={18}
                                className="text-default-400"
                            />
                        }
                    />

                    <div
                        role="group"
                        aria-label="Filtrar reservas por estado"
                        className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {filterPills.map((pill) => {
                            const active = filter === pill.key;
                            return (
                                <button
                                    key={pill.key}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        setFilter(pill.key);
                                        setPage(1);
                                    }}
                                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                                        active
                                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                            : "bg-content1 text-default-700 border-default-200/80 hover:border-default-300"
                                    }`}
                                >
                                    <span>{pill.label}</span>
                                    <span className="tabular-nums opacity-90">
                                        ({pill.count})
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {filtered.length === 0 ? (
                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="gap-3 p-8 text-center">
                                <Icon
                                    icon="material-symbols:event-busy"
                                    width={34}
                                    className="mx-auto text-default-400"
                                />
                                <p className="font-semibold text-foreground text-sm">
                                    No hay reservas en esta vista
                                </p>
                                <p className="text-xs text-default-500">
                                    Explora músicos verificados y crea tu primera
                                    reserva.
                                </p>
                                <Button
                                    as={Link}
                                    href="/musicians"
                                    color="primary"
                                    variant="flat"
                                    radius="full"
                                    size="sm"
                                    className="mx-auto font-semibold"
                                >
                                    Explorar músicos
                                </Button>
                            </CardBody>
                        </Card>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {dateGroups.map((group) => (
                                <div
                                    key={group.eventDate}
                                    className="flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between px-1 pt-1 text-xs">
                                        <span
                                            className={`font-bold ${
                                                group.isToday
                                                    ? "text-primary-text"
                                                    : "text-default-600"
                                            }`}
                                        >
                                            {group.headerLabel}
                                        </span>
                                        <span className="text-default-500 font-medium">
                                            {group.items.length}{" "}
                                            {group.items.length === 1
                                                ? "evento"
                                                : "eventos"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {group.items.map((booking) => {
                                            const urgent =
                                                needsContractorAction(booking);
                                            const isSelected =
                                                activeSelectedBooking?.id ===
                                                booking.id;

                                            return (
                                                <BookingAgendaListItem
                                                    key={booking.id}
                                                    booking={booking}
                                                    role="contractor"
                                                    urgent={urgent}
                                                    isSelected={isSelected}
                                                    onSelect={() => {
                                                        setSelectedBookingId(
                                                            booking.id,
                                                        );
                                                        if (
                                                            typeof window !==
                                                                "undefined" &&
                                                            window.innerWidth <
                                                                1024
                                                        ) {
                                                            setIsMobileSheetOpen(
                                                                true,
                                                            );
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {filtered.length > PAGE_SIZE ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                                    <p className="text-xs text-default-500">
                                        Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                                        {Math.min(
                                            currentPage * PAGE_SIZE,
                                            filtered.length,
                                        )}{" "}
                                        de {filtered.length}
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

                {/* Columna Derecha (Desktop) */}
                <div className="hidden lg:block sticky top-[calc(var(--app-navbar-height)+1rem)]">
                    {activeSelectedBooking ? (
                        <Card className="border border-default-200/80 bg-content1 shadow-soft rounded-3xl">
                            <CardBody className="p-6">
                                <BookingDetailPreviewContent
                                    booking={activeSelectedBooking}
                                    role="contractor"
                                    urgent={needsContractorAction(
                                        activeSelectedBooking,
                                    )}
                                    primaryActionLabel={actionLabel(
                                        activeSelectedBooking,
                                    )}
                                    detailHref={`/contractor/bookings/${activeSelectedBooking.id}`}
                                    canCancel={isCancellableBookingStatus(
                                        activeSelectedBooking.status,
                                    )}
                                    onCancel={() =>
                                        setCancelTargetId(
                                            activeSelectedBooking.id,
                                        )
                                    }
                                />
                            </CardBody>
                        </Card>
                    ) : (
                        <Card className="border border-default-200/70 bg-content1/60 shadow-soft rounded-3xl">
                            <CardBody className="p-10 text-center text-default-500 text-sm">
                                Selecciona una reserva de la lista para ver su
                                ubicación, artista, resumen económico y acciones
                                rápidas.
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            {/* Bottom Sheet (Mobile) */}
            {activeSelectedBooking ? (
                <BookingMobileSheet
                    isOpen={isMobileSheetOpen}
                    onOpenChange={setIsMobileSheetOpen}
                    booking={activeSelectedBooking}
                    role="contractor"
                    urgent={needsContractorAction(activeSelectedBooking)}
                    primaryActionLabel={actionLabel(activeSelectedBooking)}
                    detailHref={`/contractor/bookings/${activeSelectedBooking.id}`}
                    canCancel={isCancellableBookingStatus(
                        activeSelectedBooking.status,
                    )}
                    onCancel={() => {
                        setIsMobileSheetOpen(false);
                        setCancelTargetId(activeSelectedBooking.id);
                    }}
                />
            ) : null}
        </div>
    );
}
