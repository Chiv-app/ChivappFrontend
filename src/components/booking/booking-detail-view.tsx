"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import MusicianAttachSignatureCard from "@/components/booking/musician-attach-signature-card";
import { cancelBooking, getBooking, getBookingBalanceDue, listBookingReviews } from "@/lib/bookings";
import { checkMercadoPagoPaymentStatus } from "@/lib/payments";
import {
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
    const [isCancelling, setIsCancelling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [amountPaid, setAmountPaid] = useState<number | null>(null);
    const [hasReview, setHasReview] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isPendingOpen, setIsPendingOpen] = useState(false);
    const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const checkedMpRef = useRef(false);

    function refreshBalance(bookingData: BookingOut) {
        if (
            isConfirmedBookingStatus(bookingData.status) ||
            bookingData.status === "payment_pending"
        ) {
            getBookingBalanceDue(bookingData.id)
                .then((balance) => {
                    setAmountPaid(
                        balance.amount_paid != null ? balance.amount_paid : null,
                    );
                })
                .catch(() => {
                    setAmountPaid(null);
                });
        } else {
            setAmountPaid(null);
        }
    }

    function refreshReviews(bookingId: string) {
        listBookingReviews(bookingId)
            .then((reviews) =>
                setHasReview(reviews.some((review) => Boolean(review.is_final))),
            )
            .catch(() => setHasReview(false));
    }

    useEffect(() => {
        setIsLoading(true);
        getBooking(bookingId)
            .then((data) => {
                setBooking(data);
                refreshBalance(data);
                refreshReviews(data.id);
            })
            .catch((error) => {
                addToast({
                    title: "Error",
                    description:
                        error instanceof Error
                            ? error.message
                            : "No se pudo cargar la reserva.",
                    color: "danger",
                });
            })
            .finally(() => setIsLoading(false));
    }, [bookingId]);

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
                            refreshBalance(updated);
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
            } else if (mpStatus === "pending") {
                addToast({
                    title: "Pago en proceso",
                    description:
                        "Tu pago está siendo procesado por Mercado Pago. Te notificaremos cuando se acredite.",
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

    async function handleCancel() {
        if (!booking) return;
        setIsCancelling(true);
        try {
            const updated = await cancelBooking(booking.id);
            setBooking(updated);
            addToast({ title: "Reserva cancelada", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo cancelar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsCancelling(false);
        }
    }

    function handleUpdated(updated: BookingOut) {
        setBooking(updated);
        refreshBalance(updated);
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
    const canCancel =
        !isMemberView &&
        (booking.status === "requested" ||
            booking.status === "accepted" ||
            booking.status === "contract_pending");

    return (
        <div className="max-w-6xl mx-auto px-0">
            <BookingEditCommitmentModal
                booking={booking}
                role={role}
                isOpen={isEditOpen}
                onOpenChange={setIsEditOpen}
                onUpdated={handleUpdated}
                validatedAdvance={amountPaid}
            />

            <BookingPendingChangesModal
                booking={booking}
                isOpen={isPendingOpen}
                onOpenChange={setIsPendingOpen}
                onUpdated={handleUpdated}
                validatedAdvance={amountPaid}
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
                        {booking.calendar_event_id ? "Actualizar Agenda" : "Generar Agenda"}
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

            <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
                <aside className="order-2 lg:order-1 lg:sticky lg:top-[calc(var(--app-navbar-height)+var(--booking-timeline-height,0px)+0.75rem)] lg:self-start min-w-0">
                    <BookingCommitmentCard
                        booking={booking}
                        confirmed={confirmed}
                        canEdit={canEditCommitment}
                        hasPendingChanges={hasPendingChanges}
                        role={role}
                        onEdit={() => setIsEditOpen(true)}
                        onReviewPending={() => setIsPendingOpen(true)}
                        layout="sidebar"
                    />
                </aside>

                <section className="order-1 lg:order-2 flex flex-col gap-6 min-w-0">
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

                    {!isMemberView &&
                    role === "musician" &&
                    (booking.status === "requested" || booking.status === "accepted") ? (
                        <BookingQuoteForm booking={booking} onUpdated={handleUpdated} />
                    ) : null}

                    {!isMemberView &&
                    role === "musician" &&
                    booking.status === "payment_pending" ? (
                        <BookingPaymentStatusCard booking={booking} kind="advance" />
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
                        <MusicianAttachSignatureCard
                            booking={booking}
                            onUpdated={handleUpdated}
                        />
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
                                isLoading={isCancelling}
                                onPress={handleCancel}
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




