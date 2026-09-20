"use client";

import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import BookingRequestForm from "@/components/booking/booking-request-form";
import { useAuth } from "@/contexts/auth-context";
import { resendVerificationEmail } from "@/lib/auth";

type MusicianRef = {
    id: string;
    name: string;
};

type Props = {
    musician: MusicianRef;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function BookingRequestModal({ musician, isOpen, onOpenChange }: Props) {
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="3xl"
            scrollBehavior="inside"
            placement="center"
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[calc(100dvh-4rem)] sm:max-h-[92dvh]",
                wrapper: "items-end sm:items-center",
                body: "px-4 sm:px-6 overflow-y-auto",
                header: "px-4 sm:px-6",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col items-start gap-1 pb-2">
                            <span className="text-xl font-bold">Solicitar reserva</span>
                            <span className="text-sm font-normal text-default-500">
                                con {musician.name}
                            </span>
                        </ModalHeader>
                        <ModalBody className="pb-6">
                            <BookingRequestForm
                                musician={musician}
                                onSuccess={onClose}
                            />
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
