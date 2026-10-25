"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import BookingCommitmentCard from "@/components/booking/booking-commitment-card";
import BookingConfirmedWorkspace from "@/components/booking/booking-confirmed-workspace";
import BookingComplaintPanel from "@/components/booking/booking-complaint-panel";
import BookingContractorActions from "@/components/booking/booking-contractor-actions";
import BookingDocumentsCard from "@/components/booking/booking-documents-card";
import BookingEditCommitmentModal from "@/components/booking/booking-edit-commitment-modal";
import BookingMemberInviteCard from "@/components/booking/booking-member-invite-card";
import BookingPaymentStatusCard from "@/components/booking/booking-payment-status-card";
import BookingPendingChangesModal from "@/components/booking/booking-pending-changes-modal";
import BookingCalendarSyncModal from "@/components/booking/booking-calendar-sync-modal";
import BookingQuoteForm from "@/components/booking/booking-quote-form";
import BookingTimeline from "@/components/booking/booking-timeline";
import CancelBookingModal from "@/components/booking/cancel-booking-modal";
import CancellationRefundNotice from "@/components/booking/cancellation-refund-notice";
import { ApiError } from "@/lib/api";
import { getBooking, listBookingReviews } from "@/lib/bookings";
import { checkMercadoPagoPaymentStatus } from "@/lib/payments";
import { usePendingPaymentPolling } from "@/hooks/use-pending-payment-polling";
import {
    isCancellableBookingStatus,
    isConfirmedBookingStatus,
    isEventUpcoming,
} from "@/lib/booking-labels";
import type { BookingOut, UserRole } from "@/types/api";

type Role = Extract<UserRole, "musician" | "contractor">;

type Props = {
    bookingId: string;
    role: Role;
};

export default function BookingDetailView({ bookingId, role }: Props) {
    const [booking, setBooking] = useState<BookingOut | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasReview, setHasReview] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isPendingOpen, setIsPendingOpen] = useState(false);
    const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    // Retorno desde Mercado Pago con pago pendiente: activa el sondeo aunque la
    // reserva aún no figure en payment_pending.
    const [mpPendingReturn, setMpPendingReturn] = useState(() => {
        const status =
            searchParams.get("mp_status") ||
            searchParams.get("collection_status") ||
            searchParams.get("status");
        return status === "pending" || status === "in_process";
    });

    function handleCopyPaymentLink() {
        const link = `${window.location.origin}/contractor/bookings/${booking!.id}`;
        navigator.clipboard.writeText(link);
        addToast({ title: "Enlace copiado", description: "Enlace de pago copiado al portapapeles.", color: "success" });
    }

    const pathname = usePathname();
    const checkedMpRef = useRef(false);

    function refreshReviews(id: string) {
        listBookingReviews(id)
            .then((reviews) =>
                setHasReview(reviews.some((review) => Boolean(review.is_final))),
            )
            .catch((err) => {
                if (err instanceof ApiError && err.status === 404) {
                    setHasReview(false);
                    return;
                }
                addToast({
                    title: "Aviso",
                    description:
                        "No pudimos verificar el estado de las reseñas. Puedes reintentar en la sección de reseñas.",
                    color: "warning",
                });
            });
    }

    const loadBooking = useCallback(() => {
        setIsLoading(true);
        setLoadError(null);
        setNotFound(false);
        getBooking(bookingId)
            .then((data) => {
                setBooking(data);
                refreshReviews(data.id);
            })
            .catch((error) => {
                if (error instanceof ApiError && error.status === 404) {
                    setNotFound(true);
                    return;
                }
                const message =
                    error instanceof Error
                        ? error.message
                        : "No se pudo cargar la reserva.";
                setLoadError(message);
                addToast({
                    title: "Error",
                    description: message,
                    color: "danger",
                });
            })
            .finally(() => setIsLoading(false));
    }, [bookingId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadBooking();
    }, [loadBooking]);

    useEffect(() => {
        const mpStatus =
            searchParams.get("mp_status") ||
            searchParams.get("collection_status") ||
            searchParams.get("status");
        const paymentId = searchParams.get("payment_id");
        const collectionId = searchParams.get("collection_id");

        if (mpStatus && !checkedMpRef.current) {
            checkedMpRef.current = true;
            router.replace(pathname);

            if (mpStatus === "approved") {
                checkMercadoPagoPaymentStatus(
                    bookingId,
                    paymentId || undefined,
                    collectionId || undefined,
                )
                    .then(async (res) => {
                        try {
                            const updated = await getBooking(bookingId);
                            setBooking(updated);
                            refreshReviews(updated.id);
                        } catch {
                            // Ignored if booking fetch fails
                        }
                        if (res.is_approved || res.status === "approved") {
                            addToast({
                                title: "¡Pago completado con éxito!",
                                description:
                                    "Tu pago con Mercado Pago fue confirmado y retenido de forma segura.",
                                color: "success",
                            });
                        } else {
                            addToast({
                                title: "Verificación de pago",
                                description: res.message || `Estado: ${res.status}`,
                                color: "primary",
                            });
                        }
                    })
                    .catch((err) => {
                        addToast({
                            title: "Estado del pago",
                            description:
                                err instanceof Error
                                    ? err.message
                                    : "No se pudo verificar el pago.",
                            color: "warning",
                        });
                    });
            } else if (mpStatus === "pending" || mpStatus === "in_process") {
                addToast({
                    title: "Pago en proceso",
                    description:
                        "Tu pago está siendo procesado por Mercado Pago. Verificaremos su estado automáticamente en los próximos minutos.",
                    color: "warning",
                });
            } else if (mpStatus === "failure" || mpStatus === "rejected") {
                addToast({
                    title: "Pago no realizado",
                    description:
                        "La transacción no fue completada en Mercado Pago. Puedes intentar nuevamente.",
                    color: "danger",
                });
            }
        }
    }, [searchParams, bookingId, pathname, router]);

    function handleUpdated(updated: BookingOut) {
        setBooking(updated);
        refreshReviews(updated.id);
    }

    async function handleRefresh() {
        setIsRefreshing(true);
        try {
            const updated = await getBooking(bookingId);
            handleUpdated(updated);
        } catch (error) {
            addToast({
                title: "No se pudo actualizar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsRefreshing(false);
        }
    }

    // Misma lógica que "Actualizar", sin el toast de error (el sondeo reintenta).
    const reloadBookingSilently = useCallback(async () => {
        try {
            const updated = await getBooking(bookingId);
            setBooking(updated);
            refreshReviews(updated.id);
        } catch {
            // Se ignora: el usuario puede pulsar "Actualizar".
        }
    }, [bookingId]);

    const handlePollApproved = useCallback(() => {
        setMpPendingReturn(false);
        void reloadBookingSilently();
        addToast({
            title: "¡Pago completado con éxito!",
            description:
                "Tu pago con Mercado Pago fue confirmado y retenido de forma segura.",
            color: "success",
        });
    }, [reloadBookingSilently]);

    const handlePollRejected = useCallback(
        (result: { message?: string | null }) => {
            setMpPendingReturn(false);
            void reloadBookingSilently();
            addToast({
                title: "Pago no realizado",
                description:
                    result.message ||
                    "Mercado Pago rechazó el pago. Puedes intentarlo nuevamente.",
                color: "danger",
            });
        },
        [reloadBookingSilently],
    );

    const handlePollTimeout = useCallback(() => {
        setMpPendingReturn(false);
        addToast({
            title: "Seguimos verificando tu pago",
            description:
                "Mercado Pago aún no confirma la transacción. Te avisaremos por correo apenas se acredite o puedes pulsar Actualizar.",
            color: "warning",
        });
    }, []);

    usePendingPaymentPolling({
        bookingId: booking?.id,
        enabled:
            role === "contractor" &&
            booking != null &&
            booking.viewer_role !== "member" &&
            (booking.status === "payment_pending" ||
                (mpPendingReturn &&
                    (booking.status === "contract_pending" ||
                        booking.status === "contract_signed"))),
        onApproved: handlePollApproved,
        onRejected: handlePollRejected,
        onTimeout: handlePollTimeout,
    });

    function handleReviewsChanged(_count: number, hasFinal: boolean) {
        setHasReview(hasFinal);
    }

    const listHref = role === "musician" ? "/musician/bookings" : "/contractor/bookings";

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto h-96 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
        );
    }

    if (!booking) {
        if (loadError && !notFound) {
            return (
                <div className="max-w-xl mx-auto text-center py-16 flex flex-col items-center gap-4">
                    <Icon
                        icon="material-symbols:error-outline"
                        width={40}
                        className="text-danger"
                    />
                    <div>
                        <p className="font-semibold text-foreground">
                            No se pudo cargar la reserva
                        </p>
                        <p className="text-sm text-default-500 mt-1">{loadError}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button
                            color="primary"
                            radius="lg"
                            onPress={loadBooking}
                        >
                            Reintentar
                        </Button>
                        <Button as={Link} href={listHref} variant="flat" radius="lg">
                            Volver al listado
                        </Button>
                    </div>
                </div>
            );
        }
        return (
            <div className="max-w-6xl mx-auto text-center py-16">
                <p className="text-default-500 mb-4">No se encontró esta reserva.</p>
                <Button as={Link} href={listHref} variant="flat" radius="lg">
                    Volver al listado
                </Button>
            </div>
        );
    }

    const confirmed = isConfirmedBookingStatus(booking.status);
    const isMemberView = role === "musician" && booking.viewer_role === "member";
    const memberAccepted =
        isMemberView && booking.member_invite_status === "accepted";
    const upcoming = isEventUpcoming(booking.event_date, booking.start_time);
    const hasPendingChanges =
        !isMemberView &&
        role === "musician" &&
        booking.status === "change_pending" &&
        booking.change_requested_by === "contractor";
    const canEditCommitment =
        !isMemberView &&
        booking.status === "payment_retained" &&
        upcoming &&
        !hasPendingChanges;
    const canCancel = !isMemberView && isCancellableBookingStatus(booking.status);

    return (
        <div className="max-w-6xl mx-auto px-0">
            <CancelBookingModal
                bookingId={booking.id}
                isOpen={isCancelOpen}
                onOpenChange={setIsCancelOpen}
                onCancelled={handleUpdated}
            />

            <BookingEditCommitmentModal
                booking={booking}
                role={role}
                isOpen={isEditOpen}
                onOpenChange={setIsEditOpen}
                onUpdated={handleUpdated}
            />

            <BookingPendingChangesModal
                booking={booking}
                isOpen={isPendingOpen}
                onOpenChange={setIsPendingOpen}
                onUpdated={handleUpdated}
            />

            <BookingCalendarSyncModal
                booking={booking}
                isOpen={isCalendarSyncOpen}
                onOpenChange={setIsCalendarSyncOpen}
                onUpdated={handleUpdated}
            />

            <div className="flex justify-end gap-2 mb-2">
                {!isMemberView && role === "musician" && (
                    <Button
                        variant="flat"
                        color="primary"
                        radius="lg"
                        size="sm"
                        onPress={() => setIsCalendarSyncOpen(true)}
                        startContent={<Icon icon="lucide:calendar-sync" width={16} />}
                    >
                        {booking.calendar_event_id ? "Actualizar agenda" : "Generar agenda"}
                    </Button>
                )}
                <Button
                    variant="flat"
                    radius="lg"
                    size="sm"
                    isLoading={isRefreshing}
                    onPress={handleRefresh}
                    startContent={
                        isRefreshing ? null : (
                            <Icon icon="material-symbols:refresh" width={18} />
                        )
                    }
                >
                    Actualizar
                </Button>
            </div>

            {/*
              El sticky del timeline debe ser hermano del contenido (no
              vivir en un wrapper corto); si no, al scrollear se va con el
              contenedor y queda oculto bajo el navbar.
            */}
            <BookingTimeline
                status={booking.status}
                role={role}
                hasReview={hasReview}
                orientation="horizontal"
                collapseOnScroll
                backHref={listHref}
            />

            <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                <aside className="order-2 lg:order-1 lg:col-span-5 lg:sticky lg:top-[calc(var(--app-navbar-height)+var(--booking-timeline-height,0px)+0.75rem)] lg:self-start min-w-0">
                    <BookingCommitmentCard
                        booking={booking}
                        onEdit={canEditCommitment ? () => setIsEditOpen(true) : undefined}
                    />
                </aside>

                <section className="order-1 lg:order-2 lg:col-span-7 flex flex-col gap-6 min-w-0">
                    {isMemberView ? (
                        <BookingMemberInviteCard
                            booking={booking}
                            onUpdated={handleUpdated}
                        />
                    ) : null}

                    {!isMemberView ? (
                        <BookingComplaintPanel
                            bookingId={booking.id}
                            role={role}
                        />
                    ) : null}

                    {hasPendingChanges ? (
                        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <Icon
                                    icon="material-symbols:edit-calendar"
                                    width={22}
                                    className="text-warning shrink-0 mt-0.5"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        El contratista solicitó cambios en la reserva
                                    </p>
                                    <p className="text-xs text-default-600 mt-0.5">
                                        Revisa la nueva fecha, horario o ubicación propuesta para aceptar o rechazar el cambio.
                                    </p>
                                </div>
                            </div>
                            <Button
                                color="warning"
                                variant="solid"
                                radius="lg"
                                size="sm"
                                className="shrink-0 font-semibold"
                                onPress={() => setIsPendingOpen(true)}
                            >
                                Revisar cambios propuestos
                            </Button>
                        </div>
                    ) : null}

                    {!isMemberView &&
                    role === "musician" &&
                    (booking.status === "requested" || booking.status === "accepted") ? (
                        <BookingQuoteForm booking={booking} onUpdated={handleUpdated} />
                    ) : null}

                    {!isMemberView ? (
                        <CancellationRefundNotice booking={booking} />
                    ) : null}

                    {!isMemberView &&
                    role === "musician" &&
                    booking.status === "payment_pending" ? (
                        <div className="flex flex-col gap-4">
                            <BookingPaymentStatusCard booking={booking} />
                            <Button 
                                color="primary" 
                                variant="flat" 
                                startContent={<Icon icon="lucide:link" width={18} />}
                                onPress={handleCopyPaymentLink}
                            >
                                Copiar link de pago para el cliente
                            </Button>
                        </div>
                    ) : null}

                    {!isMemberView && role === "contractor" && !confirmed ? (
                        <BookingContractorActions
                            booking={booking}
                            onUpdated={handleUpdated}
                            onEdit={() => setIsEditOpen(true)}
                        />
                    ) : null}

                    {!isMemberView &&
                    role === "musician" &&
                    booking.status === "contract_pending" ? (
                        <div className="flex flex-col gap-4">
                            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
                                <Icon
                                    icon="material-symbols:info"
                                    width={22}
                                    className="text-primary shrink-0 mt-0.5"
                                />
                                <p className="text-sm text-default-600">
                                    Esperando que el cliente revise, firme el contrato y
                                    pague a través de Chivapp con Mercado Pago.
                                </p>
                            </div>
                            <Button
                                color="primary"
                                variant="flat"
                                startContent={<Icon icon="lucide:link" width={18} />}
                                onPress={handleCopyPaymentLink}
                            >
                                Copiar link de pago para el cliente
                            </Button>
                        </div>
                    ) : null}

                    {!isMemberView &&
                    role === "musician" &&
                    booking.status === "contract_signed" ? (
                        <BookingDocumentsCard
                            booking={booking}
                            title="Contrato firmado"
                            description="La firma del contratista ya está registrada. Esperando la confirmación del pago."
                        />
                    ) : null}

                    {confirmed && (!isMemberView || memberAccepted) ? (
                        <BookingConfirmedWorkspace
                            booking={booking}
                            role={role}
                            mode={isMemberView ? "member" : "owner"}
                            onUpdated={handleUpdated}
                            hasReview={hasReview}
                            onReviewsChanged={handleReviewsChanged}
                        />
                    ) : null}

                    {canCancel ? (
                        <div className="flex justify-end">
                            <Button
                                color="danger"
                                variant="flat"
                                radius="lg"
                                onPress={() => setIsCancelOpen(true)}
                            >
                                Cancelar reserva
                            </Button>
                        </div>
                    ) : null}
                </section>
            </div>
        </div>
    );
}
