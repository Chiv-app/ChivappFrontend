"use client";

import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { listMyEnsembleInvites, respondEnsembleInvite, listMyCalls, respondMyBookingMemberInvite } from "@/lib/ensemble-members";
import type { EnsembleMemberOut, BookingMemberInviteOut } from "@/types/api";

export default function MusicianOnboardingOverlay() {
    const [ensembleInvites, setEnsembleInvites] = useState<EnsembleMemberOut[]>([]);
    const [bookingCalls, setBookingCalls] = useState<BookingMemberInviteOut[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchInvites = async () => {
            try {
                const [ens, calls] = await Promise.all([
                    listMyEnsembleInvites(),
                    listMyCalls()
                ]);
                // only pending
                const pendingEns = ens.filter(e => e.status === "invited");
                const pendingCalls = calls.filter(c => c.status === "pending");
                setEnsembleInvites(pendingEns);
                setBookingCalls(pendingCalls);
                
                if (pendingEns.length > 0 || pendingCalls.length > 0) {
                    setIsOpen(true);
                }
            } catch (err) {
                console.error("Error fetching onboarding invites", err);
            }
        };
        fetchInvites();
    }, []);

    const handleAcceptEnsemble = async (id: string) => {
        setIsLoading(true);
        try {
            await respondEnsembleInvite(id, "accept");
            setEnsembleInvites(prev => prev.filter(e => e.id !== id));
            // if no more ensemble invites, but we have calls, modal stays open for calls
            if (ensembleInvites.length <= 1 && bookingCalls.length === 0) {
                setIsOpen(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptCall = async (bookingId: string) => {
        setIsLoading(true);
        try {
            await respondMyBookingMemberInvite(bookingId, "accept");
            setBookingCalls(prev => prev.filter(c => c.booking_id !== bookingId));
            if (ensembleInvites.length === 0 && bookingCalls.length <= 1) {
                setIsOpen(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Show ensemble invites first, then booking calls
    const currentEns = ensembleInvites[0];
    const currentCall = !currentEns ? bookingCalls[0] : null;

    return (
        <Modal isOpen={isOpen} hideCloseButton isDismissable={false} isKeyboardDismissDisabled={true} backdrop="blur">
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            {currentEns ? "¡Tienes una invitación a una agrupación!" : "¡Tienes una invitación a un evento!"}
                        </ModalHeader>
                        <ModalBody>
                            {currentEns ? (
                                <div className="flex flex-col gap-4 text-center items-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2">
                                        <Icon icon="lucide:music" width={32} />
                                    </div>
                                    <p className="text-lg">
                                        Has sido invitado a unirte a una agrupación.
                                    </p>
                                    <p className="text-sm text-default-500">
                                        Al aceptar, podrás recibir convocatorias a sus eventos y gestionar tus pagos.
                                    </p>
                                </div>
                            ) : currentCall ? (
                                <div className="flex flex-col gap-4 text-center items-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center text-success mb-2">
                                        <Icon icon="lucide:calendar-check" width={32} />
                                    </div>
                                    <p className="text-lg">
                                        Has sido convocado a un evento.
                                    </p>
                                    <p className="text-sm text-default-500">
                                        Acepta el compromiso para confirmar tu asistencia al evento.
                                    </p>
                                </div>
                            ) : null}
                        </ModalBody>
                        <ModalFooter className="flex-col sm:flex-row">
                            {currentEns ? (
                                <Button 
                                    color="primary" 
                                    fullWidth 
                                    isLoading={isLoading} 
                                    onPress={() => handleAcceptEnsemble(currentEns.id)}
                                >
                                    Aceptar y unirme
                                </Button>
                            ) : currentCall ? (
                                <Button 
                                    color="success" 
                                    className="text-white font-bold"
                                    fullWidth 
                                    isLoading={isLoading} 
                                    onPress={() => handleAcceptCall(currentCall.booking_id)}
                                >
                                    Aceptar compromiso
                                </Button>
                            ) : null}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
