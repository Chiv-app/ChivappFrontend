"use client";

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
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="3xl"
            scrollBehavior="inside"
            placement="center"
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[92vh]",
                wrapper: "items-end sm:items-center",
                body: "px-4 sm:px-6 overflow-y-auto",
                header: "px-4 sm:px-6",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col items-start gap-1 pb-2">
                            <span className="text-xl font-bold">Nueva contrata</span>
                            <span className="text-sm font-normal text-default-500">
                                Obligatorios: nombre, fecha, hora, tipo, ubicación y precio.
                                El cliente aceptará, firmará y pagará la propuesta en Chivapp.
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
