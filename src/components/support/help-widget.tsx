"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
    Accordion,
    AccordionItem,
    Button,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Textarea,
    addToast,
    useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { createSupportTicket, getMySupportTickets } from "@/lib/support";
import type { SupportTicketOut, SupportTicketStatus } from "@/types/api";

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
    open: "Recibido",
    in_progress: "En revisión",
    resolved: "Resuelto",
};

const STATUS_COLOR: Record<SupportTicketStatus, "warning" | "primary" | "success"> = {
    open: "warning",
    in_progress: "primary",
    resolved: "success",
};

export default function HelpWidget() {
    const { user } = useAuth();
    const pathname = usePathname();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [message, setMessage] = useState("");
    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myTickets, setMyTickets] = useState<SupportTicketOut[] | null>(null);

    function resetForm() {
        setMessage("");
        setGuestName("");
        setGuestEmail("");
    }

    async function loadMyTickets() {
        if (!user) return;
        try {
            const tickets = await getMySupportTickets();
            setMyTickets(tickets);
        } catch {
            setMyTickets(null);
        }
    }

    async function handleSubmit() {
        if (!message.trim()) return;
        if (!user && (!guestName.trim() || !guestEmail.trim())) return;

        setIsSubmitting(true);
        try {
            await createSupportTicket({
                message: message.trim(),
                guest_name: user ? undefined : guestName.trim(),
                guest_email: user ? undefined : guestEmail.trim(),
                page_path: pathname,
            });
            addToast({
                title: "Comentario enviado",
                description: "Nuestro equipo lo revisará pronto.",
                color: "success",
            });
            resetForm();
            void loadMyTickets();
        } catch (error) {
            addToast({
                title: "No se pudo enviar",
                description:
                    error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const canSubmit =
        message.trim().length >= 5 &&
        (!!user || (guestName.trim() && guestEmail.trim()));

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    onOpen();
                    void loadMyTickets();
                }}
                aria-label="Ayuda y comentarios"
                className="fixed bottom-24 right-4 sm:right-6 z-40 flex items-center justify-center size-12 rounded-full border border-default-200/70 bg-content1/90 backdrop-blur-md shadow-elevated text-default-600 hover:text-primary hover:border-primary/40 transition-colors"
            >
                <Icon icon="material-symbols:support-agent" width={24} height={24} />
            </button>

            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                placement="bottom-center" scrollBehavior="inside"
                backdrop="blur"
                classNames={{
                    base: "border border-default-200/80 bg-content1 shadow-2xl rounded-3xl",
                    header: "pt-6 px-6 pb-2",
                    body: "px-6 py-2",
                    footer: "pb-6 px-6 pt-2",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Ayuda y comentarios
                            </ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-default-500">
                                    Cuéntanos tu duda, sugerencia o problema. Un
                                    administrador lo revisará y te responderá.
                                </p>

                                {user ? (
                                    <p className="text-xs text-default-400">
                                        Enviarás esto como{" "}
                                        <strong>{user.fullname || user.email}</strong> ({user.email}).
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <Input
                                            label="Nombre"
                                            variant="bordered"
                                            value={guestName}
                                            onValueChange={setGuestName}
                                            isRequired
                                        />
                                        <Input
                                            label="Correo electrónico"
                                            type="email"
                                            variant="bordered"
                                            value={guestEmail}
                                            onValueChange={setGuestEmail}
                                            isRequired
                                        />
                                    </div>
                                )}

                                <Textarea
                                    label="Mensaje"
                                    placeholder="Escribe tu comentario..."
                                    variant="bordered"
                                    minRows={4}
                                    value={message}
                                    onValueChange={setMessage}
                                    isRequired
                                />

                                {user && myTickets && myTickets.length > 0 ? (
                                    <Accordion variant="bordered" className="mt-2">
                                        <AccordionItem
                                            key="history"
                                            aria-label="Tus consultas anteriores"
                                            title={`Tus consultas anteriores (${myTickets.length})`}
                                        >
                                            <div className="flex flex-col gap-3 pb-2">
                                                {myTickets.map((ticket) => (
                                                    <div
                                                        key={ticket.id}
                                                        className="rounded-2xl border border-default-200/70 p-3"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <Chip
                                                                size="sm"
                                                                color={STATUS_COLOR[ticket.status]}
                                                                variant="flat"
                                                            >
                                                                {STATUS_LABEL[ticket.status]}
                                                            </Chip>
                                                        </div>
                                                        <p className="text-sm text-foreground line-clamp-2">
                                                            {ticket.message}
                                                        </p>
                                                        {ticket.admin_response ? (
                                                            <p className="text-sm text-default-500 mt-2 border-t border-default-200/70 pt-2">
                                                                <strong>Respuesta:</strong>{" "}
                                                                {ticket.admin_response}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionItem>
                                    </Accordion>
                                ) : null}
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>
                                    Cerrar
                                </Button>
                                <Button
                                    color="primary"
                                    isLoading={isSubmitting}
                                    isDisabled={!canSubmit}
                                    onPress={handleSubmit}
                                >
                                    Enviar
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}

