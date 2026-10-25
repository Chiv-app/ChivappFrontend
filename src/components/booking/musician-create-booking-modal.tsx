"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
} from "@heroui/react";
import MusicianCreateLinkForm from "@/components/booking/musician-create-link-form";

type Props = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function MusicianCreateBookingModal({
    isOpen,
    onOpenChange,
}: Props) {
    return (
        <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="md"
            placement="center"
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-md",
                header: "px-4 sm:px-6",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col items-start gap-1 pb-2">
                            <span className="text-xl font-bold">Generar contrata rápida</span>
                            <span className="text-sm font-normal text-default-500">
                                Define el precio y obtén un enlace de pago para compartir con tu cliente.
                            </span>
                        </ModalHeader>
                        <ModalBody className="pb-6">
                            <MusicianCreateLinkForm onSuccess={onClose} />
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
