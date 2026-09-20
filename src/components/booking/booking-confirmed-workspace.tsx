"use client";

import { FormEvent, useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import BookingDocumentsCard from "@/components/booking/booking-documents-card";
import CollapsiblePhaseSection from "@/components/booking/collapsible-phase-section";
import BookingEnsemblePanel from "@/components/booking/booking-ensemble-panel";
import BookingLiveLocationCard from "@/components/booking/booking-live-location-card";
import BookingMemberPayoutPanel from "@/components/booking/booking-member-payout-panel";
import BookingFinalReviewModal from "@/components/booking/booking-final-review-modal";
import BookingPaymentStatusCard from "@/components/booking/booking-payment-status-card";
import BookingReviewsTimeline from "@/components/booking/booking-reviews-timeline";
import BookingShareCard from "@/components/booking/booking-share-card";
import RecommendContractorCard from "@/components/booking/recommend-contractor-card";
import { useAuth } from "@/contexts/auth-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import { formatCurrency } from "@/lib/booking-labels";
import { createMercadoPagoPreference } from "@/lib/payments";
import { formatDateTime } from "@/lib/date-utils";
import {
    completeBooking,
    getBooking,
    listBookingMessages,
    postBookingMessage,
    startBookingEvent,
} from "@/lib/bookings";
import { getCompletionGates } from "@/lib/booking-timeline";
import type {
    BookingMessageOut,
    BookingOut,
    UserRole,
} from "@/types/api";

type Role = Extract<UserRole, "musician" | "contractor">;

type Props = {
    booking: BookingOut;
    role: Role;
    /** owner = líder/contratista; member = integrante aceptado */
    mode?: "owner" | "member";
    onUpdated: (booking: BookingOut) => void;
    hasReview?: boolean;
    onReviewsChanged?: (count: number, hasFinal: boolean) => void;
};

function LockedFeatureCard({ title, icon, actionText }: { title: string, icon: string, actionText: string }) {
    return (
        <Card className="border border-warning-200 bg-warning-50/50 shadow-soft">
            <CardBody className="gap-3 p-6 text-center items-center justify-center">
                <div className="w-12 h-12 bg-warning-100 text-warning-600 rounded-full flex items-center justify-center mb-1">
                    <Icon icon={icon} width={28} />
                </div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm text-default-600 max-w-sm">
                    Para usar esta función, necesitas completar tu perfil y esperar la validación del administrador.
                </p>
                <Button
                    as="a"
                    href="/contractor/profile"
                    color="warning"
                    variant="flat"
                    className="mt-2 font-semibold"
                >
                    {actionText}
                </Button>
            </CardBody>
        </Card>
    );
}

export default function BookingConfirmedWorkspace({
    booking,
    role,
    mode = "owner",
    onUpdated,
    hasReview = false,
    onReviewsChanged,
}: Props) {
    const isMemberMode = mode === "member";
    const { user } = useAuth();
    const { isVerified: profileIsVerified } = useProfileVerification(
        role,
        true,
        user?.is_verified
    );

    const isLocked = role === "contractor" && !profileIsVerified;

    const [messages, setMessages] = useState<BookingMessageOut[]>([]);
    const [messageBody, setMessageBody] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    const [isCompleting, setIsCompleting] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isFinalReviewOpen, setIsFinalReviewOpen] = useState(false);

    useEffect(() => {
        listBookingMessages(booking.id)
            .then(setMessages)
            .catch(() => setMessages([]));
    }, [booking.id, booking.status, isMemberMode]);

    async function handleSendMessage(event: FormEvent) {
        event.preventDefault();
        if (!messageBody.trim()) return;
        setIsSendingMessage(true);
        try {
            const created = await postBookingMessage(booking.id, {
                body: messageBody.trim(),
            });
            setMessages((prev) => [...prev, created]);
            setMessageBody("");
        } catch (error) {
            addToast({
                title: "No se pudo enviar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSendingMessage(false);
        }
    }

    async function handleStartEvent() {
        setIsStarting(true);
        try {
            const updated = await startBookingEvent(booking.id);
            onUpdated(updated);
            addToast({
                title: "Evento habilitado",
                description: "Ya pueden compartir fotos y reseña.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo iniciar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsStarting(false);
        }
    }

    async function finalizeBooking() {
        setIsCompleting(true);
        try {
            const updated = await completeBooking(booking.id);
            onUpdated(updated);
            addToast({ title: "Reserva finalizada", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo finalizar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
            throw error;
        } finally {
            setIsCompleting(false);
        }
    }

    async function handleComplete() {
        const { canFinalize, missing } = getCompletionGates(booking.status, {
            hasReview,
            role,
        });

        if (!canFinalize) {
            const first = missing[0];
            addToast({
                title: "Aún no puedes finalizar",
                description: first
                    ? `Te falta: ${first.title}. ${first.hint}`
                    : "Revisa el checklist de pasos pendientes.",
                color: "warning",
            });
            return;
        }

        if (role === "contractor" && !hasReview) {
            setIsFinalReviewOpen(true);
            return;
        }

        try {
            await finalizeBooking();
        } catch {
            // Toast already shown in finalizeBooking
        }
    }

    async function handleFinalReviewSubmitted(result?: {
        mode: "review" | "complaint";
        completed?: boolean;
    }) {
        onReviewsChanged?.(0, true);
        if (result?.completed) {
            try {
                const updated = await getBooking(booking.id);
                onUpdated(updated);
            } catch {
                await finalizeBooking();
            }
            return;
        }
        await finalizeBooking();
    }

    const waitingOwnChange =
        !isMemberMode &&
        role === "contractor" &&
        booking.status === "change_pending" &&
        booking.change_requested_by === "contractor";
    const isCompleted = booking.status === "completed";
    const canChat =
        booking.status !== "cancelled" && booking.status !== "completed";
    const showReview =
        booking.status === "in_progress" ||
        booking.status === "payment_released" ||
        booking.status === "completed";
    const reviewGateDone = hasReview || isCompleted;
    // Finalizada: solo lectura (sin nuevas reacciones).
    const canAddReview =
        !isMemberMode &&
        role === "contractor" &&
        (booking.status === "in_progress" ||
            booking.status === "payment_released");
    const showCompletePanel =
        !isMemberMode && booking.status !== "cancelled" && !isCompleted;
    const completion = getCompletionGates(booking.status, {
        hasReview,
        role,
    });

    const showPaymentActions =
        !isMemberMode &&
        (role === "musician" && booking.status === "payment_retained");
    const showMusicianRecommend =
        !isMemberMode &&
        role === "musician" &&
        (booking.status === "in_progress" ||
            booking.status === "payment_released" ||
            booking.status === "completed");

    return (
        <div className="flex flex-col gap-6">
            {!isMemberMode && role === "musician" ? (
                <>
                    {!isCompleted ? <BookingEnsemblePanel booking={booking} /> : null}
                    <BookingMemberPayoutPanel booking={booking} />
                </>
            ) : null}

            {waitingOwnChange ? (
                <Card className="border border-primary/30 shadow-soft">
                    <CardBody className="gap-2 p-6">
                        <Chip color="primary" variant="flat" size="sm" className="w-fit">
                            En validación
                        </Chip>
                        <h3 className="text-lg font-bold">Cambio enviado</h3>
                        <p className="text-sm text-default-600">
                            Esperando que el músico acepte o rechace tu propuesta.
                            No se requiere una nueva firma.
                        </p>
                    </CardBody>
                </Card>
            ) : null}

            {booking.status === "in_progress" ? (
                isLocked ? (
                    <LockedFeatureCard title="Ubicación en vivo" icon="material-symbols:location-on" actionText="Completar mi perfil" />
                ) : (
                    <BookingLiveLocationCard bookingId={booking.id} role={role} />
                )
            ) : null}

            {/* Acciones de pago / habilitación del evento */}
            {showPaymentActions ? (
                <Card className="border border-warning/30 shadow-soft">
                    <CardBody className="gap-5 p-6">
                        <div className="flex items-center gap-2">
                            <Icon icon="material-symbols:account-balance-wallet" width={22} />
                            <h3 className="text-lg font-bold">Pagos del evento</h3>
                        </div>

                        {role === "musician" &&
                        booking.status === "payment_retained" ? (
                            <div className="flex flex-col gap-3">
                                <div>
                                    <h4 className="font-semibold text-foreground">
                                        Pago total cubierto
                                    </h4>
                                    <p className="text-sm text-default-600 mt-1">
                                        No hay saldo pendiente. Puedes habilitar la fase de
                                        evento para fotos y reseña.
                                    </p>
                                </div>
                                <Button
                                    color="primary"
                                    radius="lg"
                                    className="w-fit font-semibold"
                                    isLoading={isStarting}
                                    onPress={handleStartEvent}
                                >
                                    Habilitar fase de evento
                                </Button>
                            </div>
                        ) : null}
                    </CardBody>
                </Card>
            ) : null}

            {/* 3. Conversación */}
            {isLocked && canChat ? (
                <LockedFeatureCard title="Conversación" icon="material-symbols:chat" actionText="Completar mi perfil" />
            ) : canChat ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="gap-4 p-6">
                        <div className="flex items-center gap-2">
                            <Icon icon="material-symbols:chat" width={22} />
                            <h3 className="text-lg font-bold">Conversación</h3>
                        </div>
                        <div className="max-h-72 overflow-y-auto rounded-2xl border border-default-200 bg-default-50 p-4 flex flex-col gap-3">
                            {messages.length === 0 ? (
                                <p className="text-sm text-default-500 text-center py-6">
                                    Aún no hay mensajes. Coordina detalles del evento aquí.
                                </p>
                            ) : (
                                messages.map((message) => {
                                    const mine = message.sender_user_id === user?.id;
                                    return (
                                        <div
                                            key={message.id}
                                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                                                mine
                                                    ? "ml-auto bg-primary text-primary-foreground"
                                                    : "bg-content1 border border-default-200"
                                            }`}
                                        >
                                            <p className="text-[11px] opacity-80 mb-1">
                                                {message.sender_name ?? "Usuario"} ·{" "}
                                                {formatDateTime(message.created_at)}
                                            </p>
                                            <p>{message.body}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <Input
                                value={messageBody}
                                onValueChange={setMessageBody}
                                placeholder="Escribe un mensaje…"
                                variant="bordered"
                                radius="lg"
                            />
                            <Button
                                type="submit"
                                color="primary"
                                radius="lg"
                                isLoading={isSendingMessage}
                            >
                                Enviar
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            ) : null}

            {/* 4. Documentos contractuales — ya están listos en este punto del
                flujo (contrato firmado y anticipo validado), así que arranca
                colapsado; se puede reabrir para revisarlos. */}
            {!isMemberMode ? (
                <CollapsiblePhaseSection
                    icon="material-symbols:description"
                    title="Contrato y pagos"
                    summary="Documentos firmados y registro de pagos"
                    done
                >
                    <BookingDocumentsCard
                        booking={booking}
                        title="Contrato y pagos"
                        description="Documentos firmados y registro de pagos asociados a esta reserva."
                    />
                </CollapsiblePhaseSection>
            ) : null}

            {/* 5. Compartir con invitados */}
            {isLocked ? (
                <LockedFeatureCard title="Compartir con invitados" icon="material-symbols:share" actionText="Completar mi perfil" />
            ) : (
                <BookingShareCard booking={booking} />
            )}

            {/* 6. Reseñas y recomendación */}
            {showReview ? (
                <CollapsiblePhaseSection
                    icon="material-symbols:reviews"
                    title="Reseñas y recomendación"
                    summary={
                        reviewGateDone
                            ? "Reseña final ya registrada"
                            : "Falta la reseña final del contratista"
                    }
                    done={reviewGateDone}
                >
                    <BookingReviewsTimeline
                        booking={booking}
                        role={role}
                        canAdd={canAddReview}
                        onReviewsChanged={onReviewsChanged}
                    />
                </CollapsiblePhaseSection>
            ) : null}

            {showMusicianRecommend ? (
                <RecommendContractorCard booking={booking} />
            ) : null}

            {/* 7. Cierre */}
            {showCompletePanel ? (
                <Card
                    className={`border overflow-hidden shadow-soft ${
                        completion.canFinalize
                            ? "border-success/40"
                            : "border-warning/40"
                    }`}
                >
                    <div
                        className={`px-6 py-5 ${
                            completion.canFinalize
                                ? "bg-gradient-to-br from-success/15 via-success/5 to-transparent"
                                : "bg-gradient-to-br from-warning/15 via-warning/5 to-transparent"
                        }`}
                    >
                        <Chip
                            color={completion.canFinalize ? "success" : "warning"}
                            variant="flat"
                            size="sm"
                            className="mb-3"
                        >
                            {completion.canFinalize
                                ? "Listo para finalizar"
                                : "Pasos pendientes"}
                        </Chip>
                        <h3 className="text-xl font-bold text-foreground">
                            Finalizar contratación
                        </h3>
                        <p className="text-sm text-default-600 mt-2 max-w-2xl">
                            {completion.canFinalize
                                ? role === "contractor" && !hasReview
                                    ? "Al finalizar te pediremos la reseña del show. Luego se liberan los pagos y se cierra la reserva."
                                    : "Todos los pasos están listos. Al finalizar se liberan los pagos y se cierra la reserva."
                                : "Para cerrar el contrato debes completar los pasos marcados abajo. El timeline de la izquierda también te indica el pendiente."}
                        </p>
                    </div>
                    <CardBody className="gap-4 p-6">
                        <ul className="flex flex-col gap-2">
                            {completion.gates
                                .filter((gate) => gate.id !== "done")
                                .map((gate) => (
                                    <li
                                        key={gate.id}
                                        className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                                            gate.done
                                                ? "border-success/30 bg-success/10"
                                                : "border-warning/30 bg-warning/10"
                                        }`}
                                    >
                                        <Icon
                                            icon={
                                                gate.done
                                                    ? "material-symbols:check-circle"
                                                    : "material-symbols:radio-button-unchecked"
                                            }
                                            width={20}
                                            className={
                                                gate.done
                                                    ? "text-success shrink-0 mt-0.5"
                                                    : "text-warning shrink-0 mt-0.5"
                                            }
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground">
                                                {gate.title}
                                            </p>
                                            {!gate.done ? (
                                                <p className="text-xs text-default-600 mt-0.5">
                                                    {gate.hint}
                                                </p>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                        </ul>

                        {!completion.canFinalize && completion.missing[0] ? (
                            <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                                <p className="text-sm font-semibold text-foreground">
                                    Siguiente paso: {completion.missing[0].title}
                                </p>
                                <p className="text-xs text-default-600 mt-1">
                                    {completion.missing[0].hint}
                                </p>
                            </div>
                        ) : null}

                        <div className="flex justify-end">
                            <Button
                                color="success"
                                radius="lg"
                                size="lg"
                                className="font-semibold"
                                isLoading={isCompleting}
                                isDisabled={!completion.canFinalize}
                                onPress={handleComplete}
                                startContent={
                                    <Icon
                                        icon="material-symbols:check-circle"
                                        width={20}
                                    />
                                }
                            >
                                {completion.canFinalize
                                    ? role === "contractor" && !hasReview
                                        ? "Finalizar y dejar reseña"
                                        : "Finalizar contratación"
                                    : "Completa los pasos para finalizar"}
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            ) : null}

            {role === "contractor" ? (
                <BookingFinalReviewModal
                    bookingId={booking.id}
                    isOpen={isFinalReviewOpen}
                    onOpenChange={setIsFinalReviewOpen}
                    onSubmitted={handleFinalReviewSubmitted}
                />
            ) : null}

        </div>
    );
}


