"use client";

import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/api";
import { formatPeruDate } from "@/lib/date-utils";
import {
    listMyEnsembleInvites,
    respondEnsembleInvite,
    listMyCalls,
    respondMyBookingMemberInvite,
} from "@/lib/ensemble-members";
import type { EnsembleMemberOut, BookingMemberInviteOut } from "@/types/api";

export default function MusicianOnboardingOverlay() {
    const [ensembleInvites, setEnsembleInvites] = useState<EnsembleMemberOut[]>([]);
    const [bookingCalls, setBookingCalls] = useState<BookingMemberInviteOut[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [workingAction, setWorkingAction] = useState<"accept" | "decline" | null>(null);
    const [confirmDeclineCallId, setConfirmDeclineCallId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const fetchInvites = async () => {
            try {
                const [ens, calls] = await Promise.all([
                    listMyEnsembleInvites(),
                    listMyCalls(),
                ]);
                if (cancelled) return;
                const pendingEns = ens.filter((e) => e.status === "invited");
                const pendingCalls = calls.filter((c) => c.status === "pending");
                setEnsembleInvites(pendingEns);
                setBookingCalls(pendingCalls);

                if (pendingEns.length > 0 || pendingCalls.length > 0) {
                    setIsOpen(true);
                }
            } catch {
                // Silent on background check; musician can still manage invites from their panel.
            }
        };
        void fetchInvites();
        return () => {
            cancelled = true;
        };
    }, []);

    const advanceOrClose = (nextEnsCount: number, nextCallsCount: number) => {
        if (nextEnsCount === 0 && nextCallsCount === 0) {
            setIsOpen(false);
        }
    };

    const handleRespondEnsemble = async (id: string, action: "accept" | "decline") => {
        setWorkingAction(action);
        try {
            await respondEnsembleInvite(id, action);
            const remainingEns = ensembleInvites.filter((e) => e.id !== id);
            setEnsembleInvites(remainingEns);
            addToast({
                title: action === "accept" ? "Te uniste a la agrupación" : "Invitación rechazada",
                color: action === "accept" ? "success" : "default",
            });
            advanceOrClose(remainingEns.length, bookingCalls.length);
        } catch (err) {
            addToast({
                title: "No pudimos procesar tu respuesta",
                description: err instanceof ApiError ? err.message : "Inténtalo de nuevo en unos segundos.",
                color: "danger",
            });
        } finally {
            setWorkingAction(null);
        }
    };

    const handleRespondCall = async (bookingId: string, action: "accept" | "decline") => {
        setWorkingAction(action);
        try {
            await respondMyBookingMemberInvite(bookingId, action);
            const remainingCalls = bookingCalls.filter((c) => c.booking_id !== bookingId);
            setBookingCalls(remainingCalls);
            addToast({
                title: action === "accept" ? "Compromiso confirmado" : "Convocatoria rechazada",
                color: action === "accept" ? "success" : "default",
            });
            advanceOrClose(ensembleInvites.length, remainingCalls.length);
        } catch (err) {
            addToast({
                title: "No pudimos procesar tu respuesta",
                description: err instanceof ApiError ? err.message : "Inténtalo de nuevo en unos segundos.",
                color: "danger",
            });
        } finally {
            setWorkingAction(null);
        }
    };

    const handlePostponeCurrent = () => {
        if (ensembleInvites.length > 0) {
            const remainingEns = ensembleInvites.slice(1);
            setEnsembleInvites(remainingEns);
            advanceOrClose(remainingEns.length, bookingCalls.length);
            return;
        }
        if (bookingCalls.length > 0) {
            const remainingCalls = bookingCalls.slice(1);
            setBookingCalls(remainingCalls);
            advanceOrClose(ensembleInvites.length, remainingCalls.length);
            return;
        }
        setIsOpen(false);
    };

    if (!isOpen) return null;

    const currentEns = ensembleInvites[0];
    const currentCall = !currentEns ? bookingCalls[0] : null;

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            closeButton={<ModalCloseButton />}
            backdrop="blur"
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            {currentEns
                                ? "¡Tienes una invitación a una agrupación!"
                                : "¡Tienes una invitación a un evento!"}
                        </ModalHeader>
                        <ModalBody>
                            {currentEns ? (
                                <div className="flex flex-col gap-4 text-center items-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary-text mb-2">
                                        <Icon icon="lucide:music" width={32} />
                                    </div>
                                    <p className="text-lg font-semibold">
                                        {currentEns.leader_name
                                            ? `${currentEns.leader_name} te invitó a unirte a su agrupación.`
                                            : "Has sido invitado a unirte a una agrupación."}
                                    </p>
                                    <p className="text-sm text-default-500">
                                        Al aceptar, podrás recibir convocatorias a sus eventos y gestionar tus pagos.
                                    </p>
                                </div>
                            ) : currentCall ? (
                                <div className="flex flex-col gap-4 text-center items-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center text-success-text mb-1">
                                        <Icon icon="lucide:calendar-check" width={32} />
                                    </div>
                                    <p className="text-lg font-bold text-foreground">
                                        {currentCall.event_type || "Has sido convocado a un evento"}
                                    </p>
                                    {currentCall.leader_name ? (
                                        <p className="text-sm text-default-600 -mt-2">
                                            Convocatoria enviada por{" "}
                                            <span className="font-semibold text-foreground">
                                                {currentCall.leader_name}
                                            </span>
                                        </p>
                                    ) : null}
                                    {(currentCall.event_date ||
                                        currentCall.location_city ||
                                        currentCall.location_address) && (
                                        <div className="w-full rounded-2xl bg-default-100 px-4 py-3 text-sm text-left flex flex-col gap-2">
                                            {currentCall.event_date ? (
                                                <div className="flex items-center gap-2 text-default-700">
                                                    <Icon icon="material-symbols:calendar-month" width={18} />
                                                    <span>
                                                        {formatPeruDate(currentCall.event_date)}
                                                        {currentCall.start_time
                                                            ? ` · ${String(currentCall.start_time).slice(0, 5)}`
                                                            : ""}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {(currentCall.location_address || currentCall.location_city) ? (
                                                <div className="flex items-start gap-2 text-default-700">
                                                    <Icon
                                                        icon="material-symbols:location-on"
                                                        width={18}
                                                        className="mt-0.5 shrink-0"
                                                    />
                                                    <span>
                                                        {[currentCall.location_address, currentCall.location_city]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                    <p className="text-sm text-default-500">
                                        Acepta el compromiso para confirmar tu asistencia al evento o recházalo si no tienes disponibilidad.
                                    </p>
                                </div>
                            ) : null}
                        </ModalBody>
                        <ModalFooter className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="light"
                                onPress={handlePostponeCurrent}
                                isDisabled={workingAction !== null}
                                className="w-full sm:w-auto"
                            >
                                Más tarde
                            </Button>
                            {currentEns ? (
                                <>
                                    <Button
                                        color="danger"
                                        variant="flat"
                                        isLoading={workingAction === "decline"}
                                        isDisabled={workingAction === "accept"}
                                        onPress={() => void handleRespondEnsemble(currentEns.id, "decline")}
                                        className="w-full sm:w-auto"
                                    >
                                        Rechazar
                                    </Button>
                                    <Button
                                        color="primary"
                                        isLoading={workingAction === "accept"}
                                        isDisabled={workingAction === "decline"}
                                        onPress={() => void handleRespondEnsemble(currentEns.id, "accept")}
                                        className="w-full sm:w-auto"
                                    >
                                        Aceptar y unirme
                                    </Button>
                                </>
                            ) : currentCall ? (
                                <>
                                    <Button
                                        color="danger"
                                        variant="flat"
                                        isLoading={workingAction === "decline"}
                                        isDisabled={workingAction === "accept"}
                                        onPress={() => setConfirmDeclineCallId(currentCall.booking_id)}
                                        className="w-full sm:w-auto"
                                    >
                                        Rechazar
                                    </Button>
                                    <Button
                                        color="success"
                                        className="text-success-foreground font-bold w-full sm:w-auto"
                                        isLoading={workingAction === "accept"}
                                        isDisabled={workingAction === "decline"}
                                        onPress={() => void handleRespondCall(currentCall.booking_id, "accept")}
                                    >
                                        Aceptar compromiso
                                    </Button>
                                </>
                            ) : null}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
            <ConfirmDialog
                isOpen={confirmDeclineCallId !== null}
                onClose={() => setConfirmDeclineCallId(null)}
                onConfirm={async () => {
                    if (!confirmDeclineCallId) return;
                    const id = confirmDeclineCallId;
                    setConfirmDeclineCallId(null);
                    await handleRespondCall(id, "decline");
                }}
                title="¿Rechazar convocatoria?"
                description="El líder de tu agrupación será notificado de que no podrás asistir a este evento."
                confirmLabel="Sí, rechazar"
                cancelLabel="Volver"
                color="danger"
                isLoading={workingAction === "decline"}
            />
        </Modal>
    );
}
