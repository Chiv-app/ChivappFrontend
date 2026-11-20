"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
} from "@heroui/react";
import MusicianCreateBookingForm from "@/components/booking/musician-create-booking-form";

type Props = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function MusicianCreateBookingModal({
    isOpen,
    onOpenChange,
}: Props) {
    return (
        <Modal
            closeButton={<ModalCloseButton aria-label="Cerrar" />}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="2xl"
            scrollBehavior="inside"
            placement="center"
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-2xl",
                header: "px-4 sm:px-6",
                body: "px-4 sm:px-6",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col items-start gap-1 pb-2">
                            <span className="text-xl font-bold">Nueva contrata</span>
                            <span className="text-sm font-normal text-default-500">
                                Registra una reserva ya acordada y pagada por fuera para bloquear tu agenda y gestionar tu presentación.
                            </span>
                        </ModalHeader>
                        <ModalBody className="pb-6">
                            <MusicianCreateBookingForm onSuccess={onClose} />
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
