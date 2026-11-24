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
import MusicianCreateBookingModal from "@/components/booking/musician-create-booking-modal";
import CancelBookingModal from "@/components/booking/cancel-booking-modal";
import {
    BookingAgendaListItem,
    BookingDetailPreviewContent,
    BookingMobileSheet,
    groupBookingsByEventDate,
} from "@/components/dashboard/booking-master-detail-panel";
import { useAuth } from "@/contexts/auth-context";
import { listBookings } from "@/lib/bookings";
import {
    BOOKING_STATUS_LABELS,
    formatCurrency,
    getBookingStatusLabel,
    isCancellableBookingStatus,
} from "@/lib/booking-labels";
import type { BookingOut, BookingStatus } from "@/types/api";

type FilterKey = "all" | "action" | "active" | "completed" | "cancelled";

const PAGE_SIZE = 10;

const ACTION_STATUSES: BookingStatus[] = [
    "requested",
    "change_pending",
];

export function needsMusicianAction(booking: BookingOut) {
    if (booking.status === "completed" || booking.status === "cancelled") {
        return false;
    }
    if (booking.viewer_role === "member") {
        return booking.member_invite_status === "pending";
    }
    if (booking.complaint_status === "open") return true;
    return ACTION_STATUSES.includes(booking.status);
}

function getMusicianBookingBucket(
    booking: BookingOut,
): Exclude<FilterKey, "all"> {
    if (booking.status === "completed") return "completed";
    if (booking.status === "cancelled") return "cancelled";
    if (needsMusicianAction(booking)) return "action";
    return "active";
}

function actionLabel(booking: BookingOut) {
    if (booking.complaint_status === "open") return "Responder queja";
    const status = booking.status;
    if (status === "requested") return "Cotizar ahora";
    if (status === "change_pending") return "Revisar cambio";
    return "Gestionar presentación";
}

export default function MusicianBookingsView() {
    const { user } = useAuth();
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
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const hasOwnedBookings = bookings.some((b) => b.viewer_role !== "member");
    const memberOnly =
        Boolean(user?.is_ensemble_member) && !hasOwnedBookings;

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
        const owned = bookings.filter((b) => b.viewer_role !== "member");
        let action = 0;
        let active = 0;
        let completed = 0;
        let cancelled = 0;

        for (const booking of bookings) {
            const bucket = getMusicianBookingBucket(booking);
            if (bucket === "action") action += 1;
            else if (bucket === "active") active += 1;
            else if (bucket === "completed") completed += 1;
            else if (bucket === "cancelled") cancelled += 1;
        }

        const quoted = owned
            .filter((b) => b.status !== "cancelled")
            .reduce(
                (sum, b) =>
                    sum + (b.price_agreed != null ? Number(b.price_agreed) : 0),
                0,
            );
        return { action, active, completed, cancelled, quoted };
    }, [bookings]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return bookings.filter((booking) => {
            const isMember = booking.viewer_role === "member";
            const bucket = getMusicianBookingBucket(booking);
            if (filter !== "all" && bucket !== filter) {
                return false;
            }
            if (!q) return true;
            const haystack = [
                booking.event_type,
                booking.location_city,
                booking.location_address,
                booking.contractor_name,
                booking.musician_name,
                BOOKING_STATUS_LABELS[booking.status],
                getBookingStatusLabel(booking.status, "musician"),
                isMember ? "integrante" : "",
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

            {!memberOnly ? (
                <MusicianCreateBookingModal
                    isOpen={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                />
            ) : null}

            {/* 1. Cabecera compacta integrada: Título + Sub-navegación de Agenda + Nueva contrata */}
            <header className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                            Reservas
                        </h1>
                        <nav
                            aria-label="Secciones de Agenda"
                            className="hidden sm:inline-flex items-center gap-1 rounded-full border border-default-200/80 bg-content1 p-1 shadow-xs"
                        >
                            <Link
                                href="/musician/bookings"
                                aria-current="page"
                                className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary-text px-3.5 py-1.5 text-xs font-bold transition-colors"
                            >
                                <Icon
                                    icon="material-symbols:event-upcoming-rounded"
                                    width={16}
                                    aria-hidden="true"
                                />
                                <span>Reservas</span>
                            </Link>
                            <Link
                                href="/musician/calendar"
                                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-default-600 hover:text-foreground hover:bg-default-100/70 transition-colors"
                            >
                                <Icon
                                    icon="material-symbols:calendar-view-week-rounded"
                                    width={16}
                                    aria-hidden="true"
                                />
                                <span>Calendario</span>
                            </Link>
                            {!memberOnly ? (
                                <Link
                                    href="/musician/links"
                                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-default-600 hover:text-foreground hover:bg-default-100/70 transition-colors"
                                >
                                    <Icon
                                        icon="material-symbols:add-link-rounded"
                                        width={16}
                                        aria-hidden="true"
                                    />
                                    <span>Enlaces de pago</span>
                                </Link>
                            ) : null}
                        </nav>
                    </div>

                    {!memberOnly ? (
                        <Button
                            color="primary"
                            radius="full"
                            className="font-bold shadow-soft px-4 sm:px-5 shrink-0"
                            startContent={
                                <Icon icon="material-symbols:add" width={18} />
                            }
                            onPress={() => setIsCreateOpen(true)}
                        >
                            Nueva contrata
                        </Button>
                    ) : null}
                </div>

                {/* Sub-navegación de Agenda en Mobile */}
                <nav
                    aria-label="Secciones de Agenda móvil"
                    className="grid sm:hidden grid-cols-3 gap-1 rounded-full border border-default-200/80 bg-content1 p-1 shadow-xs"
                >
                    <Link
                        href="/musician/bookings"
                        aria-current="page"
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary/15 text-primary-text py-2 px-2 text-xs font-bold"
                    >
                        <Icon
                            icon="material-symbols:event-upcoming-rounded"
                            width={15}
                            aria-hidden="true"
                        />
                        <span>Reservas</span>
                    </Link>
                    <Link
                        href="/musician/calendar"
                        className="inline-flex items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs font-semibold text-default-600"
                    >
                        <Icon
                            icon="material-symbols:calendar-view-week-rounded"
                            width={15}
                            aria-hidden="true"
                        />
                        <span>Calendario</span>
                    </Link>
                    {!memberOnly ? (
                        <Link
                            href="/musician/links"
                            className="inline-flex items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs font-semibold text-default-600"
                        >
                            <Icon
                                icon="material-symbols:add-link-rounded"
                                width={15}
                                aria-hidden="true"
                            />
                            <span>Pagos</span>
                        </Link>
                    ) : null}
                </nav>
            </header>

            {loadError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar las reservas
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

            {/* 2. Barra compacta clicable de indicadores (Tira horizontal en Desktop, grilla 2x2 en Mobile) */}
            <div className="rounded-2xl border border-default-200/80 bg-content1 p-2.5 sm:px-4 sm:py-2.5 shadow-soft">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                        {[
                            {
                                key: "action" as FilterKey,
                                label: "Por atender",
                                mobileLabel: "Por atender",
                                count: stats.action,
                                dotClass: "bg-warning",
                                activeClass:
                                    "bg-warning/15 border-warning/40 text-foreground",
                            },
                            {
                                key: "active" as FilterKey,
                                label: "Activas",
                                mobileLabel: "Activas",
                                count: stats.active,
                                dotClass: "bg-primary",
                                activeClass:
                                    "bg-primary/15 border-primary/40 text-foreground",
                            },
                            {
                                key: "completed" as FilterKey,
                                label: "Finalizadas",
                                mobileLabel: "Finalizadas",
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
                            Total cotizado:
                        </span>
                        <span className="font-extrabold text-primary-text text-sm sm:text-base tabular-nums">
                            {formatCurrency(stats.quoted)}
                        </span>
                    </button>
                </div>
            </div>

            {/* 3. Layout Maestro-Detalle (Lista compacta a la izquierda + Panel de detalle a la derecha en Desktop / Bottom Sheet en Mobile) */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(21rem,26rem)_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)] gap-4 items-start">
                {/* Columna Izquierda: Buscador + Píldoras de estado + Lista agrupada por fecha */}
                <div className="flex flex-col gap-3 min-w-0">
                    <Input
                        aria-label="Buscar reservas por evento, cliente o lugar"
                        value={query}
                        onValueChange={(val) => {
                            setQuery(val);
                            setPage(1);
                        }}
                        placeholder="Buscar por evento, cliente o lugar..."
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

                    {/* Píldoras de filtro con suma exacta */}
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
                                    {memberOnly
                                        ? "Cuando te asocien a un evento aparecerá aquí."
                                        : "Cuando recibas solicitudes aparecerán aquí, o crea una contrata con los datos de tu cliente."}
                                </p>
                                {!memberOnly ? (
                                    <Button
                                        color="primary"
                                        variant="flat"
                                        radius="full"
                                        size="sm"
                                        className="mx-auto font-semibold"
                                        startContent={
                                            <Icon
                                                icon="material-symbols:add"
                                                width={16}
                                            />
                                        }
                                        onPress={() => setIsCreateOpen(true)}
                                    >
                                        Nueva contrata
                                    </Button>
                                ) : null}
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
                                            const isMember =
                                                booking.viewer_role === "member";
                                            const urgent =
                                                needsMusicianAction(booking);
                                            const isSelected =
                                                activeSelectedBooking?.id ===
                                                booking.id;

                                            return (
                                                <BookingAgendaListItem
                                                    key={booking.id}
                                                    booking={booking}
                                                    role="musician"
                                                    urgent={urgent}
                                                    isSelected={isSelected}
                                                    memberBadge={isMember}
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

                {/* Columna Derecha (Desktop): Panel de Detalle Persistente */}
                <div className="hidden lg:block sticky top-[calc(var(--app-navbar-height)+1rem)]">
                    {activeSelectedBooking ? (
                        <Card className="border border-default-200/80 bg-content1 shadow-soft rounded-3xl">
                            <CardBody className="p-6">
                                {(() => {
                                    const isMember =
                                        activeSelectedBooking.viewer_role ===
                                        "member";
                                    const memberPending =
                                        isMember &&
                                        activeSelectedBooking.member_invite_status ===
                                            "pending";
                                    const urgent = needsMusicianAction(
                                        activeSelectedBooking,
                                    );
                                    const canCancel =
                                        !isMember &&
                                        isCancellableBookingStatus(
                                            activeSelectedBooking.status,
                                        );

                                    return (
                                        <BookingDetailPreviewContent
                                            booking={activeSelectedBooking}
                                            role="musician"
                                            urgent={urgent}
                                            primaryActionLabel={
                                                memberPending
                                                    ? "Responder convocatoria"
                                                    : isMember
                                                      ? "Ver detalle"
                                                      : actionLabel(
                                                            activeSelectedBooking,
                                                        )
                                            }
                                            detailHref={`/musician/bookings/${activeSelectedBooking.id}`}
                                            canCancel={canCancel}
                                            onCancel={() =>
                                                setCancelTargetId(
                                                    activeSelectedBooking.id,
                                                )
                                            }
                                            memberBadge={isMember}
                                        />
                                    );
                                })()}
                            </CardBody>
                        </Card>
                    ) : (
                        <Card className="border border-default-200/70 bg-content1/60 shadow-soft rounded-3xl">
                            <CardBody className="p-10 text-center text-default-500 text-sm">
                                Selecciona una reserva de la lista para ver su
                                ubicación, cliente, resumen económico y acciones
                                rápidas.
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            {/* Bottom Sheet (Mobile) al tocar una reserva */}
            {activeSelectedBooking ? (
                <BookingMobileSheet
                    isOpen={isMobileSheetOpen}
                    onOpenChange={setIsMobileSheetOpen}
                    booking={activeSelectedBooking}
                    role="musician"
                    urgent={needsMusicianAction(activeSelectedBooking)}
                    primaryActionLabel={
                        activeSelectedBooking.viewer_role === "member" &&
                        activeSelectedBooking.member_invite_status === "pending"
                            ? "Responder convocatoria"
                            : activeSelectedBooking.viewer_role === "member"
                              ? "Ver detalle"
                              : actionLabel(activeSelectedBooking)
                    }
                    detailHref={`/musician/bookings/${activeSelectedBooking.id}`}
                    canCancel={
                        activeSelectedBooking.viewer_role !== "member" &&
                        isCancellableBookingStatus(activeSelectedBooking.status)
                    }
                    onCancel={() => {
                        setIsMobileSheetOpen(false);
                        setCancelTargetId(activeSelectedBooking.id);
                    }}
                    memberBadge={activeSelectedBooking.viewer_role === "member"}
                />
            ) : null}
        </div>
    );
}
