"use client";

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
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: (booking: BookingOut) => void;
};

export default function BookingCalendarSyncModal({
    booking,
    isOpen,
    onOpenChange,
    onUpdated,
}: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [includeContractor, setIncludeContractor] = useState(true);
    // Let's assume members are fetched or just not selected initially if we don't have them in BookingOut, 
    // actually we might not have the list of members in BookingOut.
    // We would need to fetch the ensemble members to list them.
    // To keep it simple, we can fetch them when the modal opens.
    const [members, setMembers] = useState<{id: string; name: string; }[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    useEffect(() => {
        if (!isOpen) return;
        setIncludeContractor(true);
        setSelectedMembers([]);
        
        // Fetch booking members
        let cancelled = false;
        setMembersLoading(true);
        apiFetch<any[]>(`/bookings/${booking.id}/member-invites`)
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
    }, [isOpen, booking.id]);

    async function handleSync() {
        setIsLoading(true);
        try {
            const updated = await apiFetch<BookingOut>("/bookings/" + booking.id + "/calendar-sync", {
                method: "POST",
                body: JSON.stringify({
                    include_contractor: includeContractor,
                    ensemble_member_ids: selectedMembers,
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
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            {title}
                        </ModalHeader>
                        <ModalBody>
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
                                        label="Incluir integrantes de tu mariachi:"
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







