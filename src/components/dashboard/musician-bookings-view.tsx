"use client";

import { useEffect, useMemo, useState } from "react";
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
import MusicianCreateBookingModal from "@/components/booking/musician-create-booking-modal";
import CancelBookingModal from "@/components/booking/cancel-booking-modal";
import BookingReservationItem, {
    type BookingLayoutMode,
} from "@/components/dashboard/booking-reservation-item";
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
    if (status === "requested") return "Cotizar";
    if (status === "change_pending") return "Revisar cambio";
    return "Gestionar";
}

export default function MusicianBookingsView() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookingOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>("all");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [layout, setLayout] = useState<BookingLayoutMode>("cards");
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
                (sum, b) => sum + (b.price_agreed != null ? Number(b.price_agreed) : 0),
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
                            Gestión de agenda
                        </Chip>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                            Reservas
                        </h1>
                        <p className="text-default-600 mt-2 max-w-2xl text-sm sm:text-base">
                            {memberOnly
                                ? "Aquí ves las reservas a las que te convocaron. Puedes aceptar o rechazar y, si aceptas, coordinar el evento."
                                : "Prioriza lo que necesita tu respuesta, crea contratas con tus clientes y cierra presentaciones con claridad."}
                        </p>
                    </div>
                    {!memberOnly ? (
                        <Button
                            color="primary"
                            radius="lg"
                            className="font-semibold shadow-glow hover:shadow-glow-lg transition-shadow w-full sm:w-auto"
                            startContent={<Icon icon="material-symbols:add" width={18} />}
                            onPress={() => setIsCreateOpen(true)}
                        >
                            Nueva contrata
                        </Button>
                    ) : null}
                </div>
            </div>

            {!memberOnly ? (
                <MusicianCreateBookingModal
                    isOpen={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                />
            ) : null}

            {loadError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar las reservas
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
                        subtitle: "Solicitudes por cotizar, cambios o disputas",
                        value: stats.action,
                        icon: "material-symbols:priority-high",
                        tone: "text-warning",
                        bg: "bg-warning/10",
                        activeBorder: "border-warning ring-2 ring-warning/20 bg-warning/5",
                    },
                    {
                        key: "active" as FilterKey,
                        label: "Activas",
                        subtitle: "Cotizadas en espera o shows confirmados",
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
                        label: "Monto vigente",
                        subtitle: "Activas y finalizadas (sin canceladas)",
                        value: formatCurrency(stats.quoted),
                        icon: "material-symbols:payments",
                        tone: "text-secondary",
                        bg: "bg-secondary/10",
                        activeBorder: "border-secondary ring-2 ring-secondary/20 bg-secondary/5",
                        isText: true,
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
                                <p
                                    className={`font-bold text-foreground tabular-nums shrink-0 ${
                                        item.isText
                                            ? "text-base sm:text-lg"
                                            : "text-xl sm:text-2xl"
                                    }`}
                                >
                                    {item.value}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 rounded-2xl border border-default-200/70 bg-content1 p-2 sm:p-2.5 shadow-soft">
                <Tabs
                    aria-label="Filtrar reservas de la agrupación por estado"
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
                        aria-label="Buscar reservas por evento, cliente, ciudad o estado"
                        value={query}
                        onValueChange={(val) => {
                            setQuery(val);
                            setPage(1);
                        }}
                        placeholder="Buscar por evento, cliente, ciudad o estado..."
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
                    <CardBody className="gap-3 p-10 text-center">
                        <Icon
                            icon="material-symbols:event-busy"
                            width={36}
                            className="mx-auto text-default-400"
                        />
                        <p className="font-semibold text-foreground">
                            No hay reservas en esta vista
                        </p>
                        <p className="text-sm text-default-500">
                            {memberOnly
                                ? "Cuando te asocien a un evento aparecerá aquí."
                                : "Cuando recibas solicitudes aparecerán aquí, o crea una contrata con los datos de tu cliente."}
                        </p>
                        {!memberOnly ? (
                            <Button
                                color="primary"
                                variant="flat"
                                radius="lg"
                                className="mx-auto font-semibold"
                                startContent={<Icon icon="material-symbols:add" width={18} />}
                                onPress={() => setIsCreateOpen(true)}
                            >
                                Nueva contrata
                            </Button>
                        ) : null}
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
                            const isMember = booking.viewer_role === "member";
                            const memberPending =
                                isMember &&
                                booking.member_invite_status === "pending";
                            const urgent = needsMusicianAction(booking);
                            const canCancel =
                                !isMember && isCancellableBookingStatus(booking.status);

                            return (
                                <BookingReservationItem
                                    key={booking.id}
                                    booking={booking}
                                    role="musician"
                                    layout={layout}
                                    urgent={urgent}
                                    primaryActionLabel={
                                        memberPending
                                            ? "Responder convocatoria"
                                            : isMember
                                              ? "Ver detalle"
                                              : actionLabel(booking)
                                    }
                                    detailHref={`/musician/bookings/${booking.id}`}
                                    canCancel={canCancel}
                                    isCancelling={false}
                                    onCancel={() => setCancelTargetId(booking.id)}
                                    memberBadge={isMember}
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
