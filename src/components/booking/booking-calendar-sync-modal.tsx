"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Checkbox,
    CheckboxGroup,
    addToast
} from "@heroui/react";
import { Icon } from "@iconify/react";
import type { BookingOut } from "@/types/api";
import { apiFetch } from "@/lib/api";

type Props = {
    booking: BookingOut;
    role?: "musician" | "contractor";
    isMemberView?: boolean;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: (booking: BookingOut) => void;
};

export default function BookingCalendarSyncModal({
    booking,
    role = "musician",
    isMemberView = false,
    isOpen,
    onOpenChange,
    onUpdated,
}: Props) {
    const isLeadMusician = role === "musician" && !isMemberView;
    const isContractor = role === "contractor";
    const [isLoading, setIsLoading] = useState(false);
    const [includeContractor, setIncludeContractor] = useState(true);
    const [members, setMembers] = useState<{id: string; name: string; }[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (cancelled) return;
            setIncludeContractor(!isMemberView);
            setSelectedMembers([]);
            setMembersLoading(isLeadMusician);
        });
        if (!isLeadMusician) {
            return () => {
                cancelled = true;
            };
        }
        apiFetch<{ status: string; ensemble_member_id: string; member_fullname: string }[]>(`/bookings/${booking.id}/member-invites`)
            .then(data => {
                if (!cancelled) {
                    const acceptedMembers = data.filter(d => d.status === "accepted");
                    setMembers(acceptedMembers.map(d => ({id: d.ensemble_member_id, name: d.member_fullname})));
                    setSelectedMembers(acceptedMembers.map(d => d.ensemble_member_id));
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setMembersLoading(false);
            });
            
        return () => { cancelled = true; };
    }, [isOpen, booking.id, isLeadMusician, isMemberView]);

    async function handleSync() {
        setIsLoading(true);
        try {
            const updated = await apiFetch<BookingOut>("/bookings/" + booking.id + "/calendar-sync", {
                method: "POST",
                body: JSON.stringify({
                    include_contractor: isMemberView ? false : includeContractor,
                    ensemble_member_ids: isLeadMusician ? selectedMembers : [],
                }),
            });
            onUpdated(updated);
            addToast({ title: "Agenda sincronizada", color: "success" });
            onOpenChange(false);
        } catch (error) {
            addToast({
                title: "Error al sincronizar",
                description: error instanceof Error ? error.message : "Intenta de nuevo",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const title = booking.calendar_event_id ? "Actualizar Agenda" : "Generar Agenda";

    return (
        <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />} isOpen={isOpen} onOpenChange={onOpenChange} size="md" scrollBehavior="inside" placement="bottom-center">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            {title}
                        </ModalHeader>
                        <ModalBody>
                            {isMemberView ? (
                                <p className="text-default-500 text-sm">
                                    Esto creará o actualizará el evento de esta presentación en tu Google Calendar conectado.
                                </p>
                            ) : isContractor ? (
                                <>
                                    <p className="text-default-500 text-sm">
                                        Esto creará o actualizará el evento de tu contratación en tu Google Calendar conectado.
                                    </p>
                                    <div className="mt-4 flex flex-col gap-4">
                                        <Checkbox
                                            isSelected={includeContractor}
                                            onValueChange={setIncludeContractor}
                                        >
                                            Incluir al músico ({booking.musician_name || "Artista"})
                                        </Checkbox>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-default-500 text-sm">
                                        Esto creará o actualizará un evento en tu Google Calendar.
                                        Selecciona a quiénes deseas incluir como invitados para que también reciban la invitación en su calendario.
                                    </p>
                                    
                                    <div className="mt-4 flex flex-col gap-4">
                                        <Checkbox 
                                            isSelected={includeContractor} 
                                            onValueChange={setIncludeContractor}
                                        >
                                            Incluir al contratista ({booking.contractor_name || "Cliente"})
                                        </Checkbox>
                                        
                                        {membersLoading ? (
                                            <div className="text-sm text-default-400">Cargando integrantes...</div>
                                        ) : members.length > 0 ? (
                                            <CheckboxGroup 
                                                label="Incluir integrantes de tu agrupación:"
                                                value={selectedMembers}
                                                onValueChange={setSelectedMembers}
                                            >
                                                {members.map(m => (
                                                    <Checkbox key={m.id} value={m.id}>
                                                        {m.name}
                                                    </Checkbox>
                                                ))}
                                            </CheckboxGroup>
                                        ) : (
                                            <div className="text-sm text-default-400">No hay integrantes que hayan aceptado esta convocatoria.</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={onClose}>
                                Cancelar
                            </Button>
                            <Button 
                                color="primary" 
                                onPress={handleSync} 
                                isLoading={isLoading}
                                startContent={!isLoading && <Icon icon="lucide:calendar-sync" />}
                            >
                                Sincronizar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}








