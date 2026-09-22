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
import BookingReservationItem, {
    type BookingLayoutMode,
} from "@/components/dashboard/booking-reservation-item";
import { useAuth } from "@/contexts/auth-context";
import { cancelBooking, listBookings } from "@/lib/bookings";
import { BOOKING_STATUS_LABELS, formatCurrency } from "@/lib/booking-labels";
import type { BookingOut, BookingStatus } from "@/types/api";

type FilterKey = "all" | "action" | "upcoming" | "done";

const PAGE_SIZE = 10;

const ACTION_STATUSES: BookingStatus[] = [
    "requested",
    "payment_pending",
    "change_pending",
    "balance_review",
];

const UPCOMING_STATUSES: BookingStatus[] = [
    "accepted",
    "contract_pending",
    "contract_signed",
    "payment_retained",
    "balance_pending",
    "in_progress",
    "payment_released",
];

const DONE_STATUSES: BookingStatus[] = ["completed", "cancelled"];

function needsMusicianAction(booking: BookingOut) {
    if (booking.complaint_status === "open") return true;
    return ACTION_STATUSES.includes(booking.status);
}

function actionLabel(booking: BookingOut) {
    if (booking.complaint_status === "open") return "Responder queja";
    const status = booking.status;
    if (status === "requested") return "Cotizar";
    if (status === "payment_pending") return "Esperando pago";
    if (status === "balance_review") return "Esperando pago";
    if (status === "change_pending") return "Revisar cambio";
    return "Gestionar";
}

export default function MusicianBookingsView() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookingOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>("all");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [layout, setLayout] = useState<BookingLayoutMode>("cards");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const hasOwnedBookings = bookings.some((b) => b.viewer_role !== "member");
    const memberOnly =
        Boolean(user?.is_ensemble_member) && !hasOwnedBookings;

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

    async function handleCancel(id: string) {
        setActionId(id);
        try {
            await cancelBooking(id);
            await loadBookings();
            addToast({
                title: "Reserva cancelada",
                description: "La reserva fue cancelada.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo cancelar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setActionId(null);
        }
    }

    const stats = useMemo(() => {
        const owned = bookings.filter((b) => b.viewer_role !== "member");
        const pendingMemberInvites = bookings.filter(
            (b) =>
                b.viewer_role === "member" &&
                b.member_invite_status === "pending",
        ).length;
        const action =
            owned.filter((b) => needsMusicianAction(b)).length +
            pendingMemberInvites;
        const upcoming = bookings.filter((b) =>
            UPCOMING_STATUSES.includes(b.status),
        ).length;
        const completed = bookings.filter((b) => b.status === "completed").length;
        const quoted = owned.reduce(
            (sum, b) => sum + (b.price_agreed != null ? Number(b.price_agreed) : 0),
            0,
        );
        return { action, upcoming, completed, quoted };
    }, [bookings]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return bookings.filter((booking) => {
            const isMember = booking.viewer_role === "member";
            if (filter === "action") {
                const needsAction = isMember
                    ? booking.member_invite_status === "pending"
                    : needsMusicianAction(booking);
                if (!needsAction) return false;
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
                booking.contractor_name,
                booking.musician_name,
                BOOKING_STATUS_LABELS[booking.status],
                isMember ? "integrante" : "",
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
                        label: "Cotizado",
                        value: formatCurrency(stats.quoted),
                        icon: "material-symbols:payments",
                        tone: "text-secondary",
                        bg: "bg-secondary/10",
                        isText: true,
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
                                <p
                                    className={`font-bold text-foreground mt-1 break-words ${
                                        item.isText
                                            ? "text-base sm:text-lg"
                                            : "text-xl sm:text-2xl"
                                    }`}
                                >
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
                        placeholder="Buscar por evento, cliente, ciudad o estado"
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
                                ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                                : "flex flex-col gap-3"
                        }
                    >
                        {pageItems.map((booking) => {
                            const isMember = booking.viewer_role === "member";
                            const memberPending =
                                isMember &&
                                booking.member_invite_status === "pending";
                            const urgent =
                                memberPending ||
                                (!isMember && needsMusicianAction(booking));
                            const canCancel =
                                !isMember &&
                                (booking.status === "requested" ||
                                    booking.status === "accepted" ||
                                    booking.status === "contract_pending");

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
                                    isCancelling={actionId === booking.id}
                                    onCancel={() => handleCancel(booking.id)}
                                    memberBadge={isMember}
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
