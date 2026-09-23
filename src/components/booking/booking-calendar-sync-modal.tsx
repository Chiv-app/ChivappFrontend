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
    const [members, setMembers] = useState<{id: string; name: string; user_id: string}[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setIncludeContractor(true);
        setSelectedMembers([]);
        
        // Fetch ensemble members
        let cancelled = false;
        setMembersLoading(true);
        apiFetch<{id: string, stage_name: string, user_id: string}[]>("/musician/members")
            .then(data => {
                if (!cancelled) {
                    setMembers(data.map(d => ({id: d.id, name: d.stage_name, user_id: d.user_id})));
                    // select all by default
                    setSelectedMembers(data.map(d => d.user_id));
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setMembersLoading(false);
            });
            
        return () => { cancelled = true; };
    }, [isOpen]);

    async function handleSync() {
        setIsLoading(true);
        try {
            const updated = await apiFetch<BookingOut>("/bookings/" + booking.id + "/calendar-sync", {
                method: "POST",
                body: JSON.stringify({
                    include_contractor: includeContractor,
                    member_user_ids: selectedMembers,
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
                                Esto crear\u00e1 o actualizar\u00e1 un evento en tu Google Calendar.
                                Selecciona a qui\u00e9nes deseas incluir como invitados para que tambi\u00e9n reciban la invitaci\u00f3n en su calendario.
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
                                            <Checkbox key={m.id} value={m.user_id}>
                                                {m.name}
                                            </Checkbox>
                                        ))}
                                    </CheckboxGroup>
                                ) : (
                                    <div className="text-sm text-default-400">No tienes integrantes registrados en tu perfil.</div>
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



