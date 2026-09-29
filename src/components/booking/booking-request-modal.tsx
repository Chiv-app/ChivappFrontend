"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import BookingRequestForm from "@/components/booking/booking-request-form";

type MusicianRef = {
  id: string;
  name: string;
  image?: string | null;
};

type Props = {
  musician: MusicianRef;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function BookingRequestModal({
  musician,
  isOpen,
  onOpenChange,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      hideCloseButton
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
            <ModalHeader className="flex flex-col items-stretch px-0 pb-0 pt-0">
              <div className="px-5 py-4 border-b border-divider relative">
                <Button
                  isIconOnly
                  variant="light"
                  onPress={onClose}
                  className="absolute top-2 right-2 text-default-500 hover:text-foreground z-10"
                  size="sm"
                >
                  <Icon icon="lucide:x" className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3.5 mr-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={musician.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(musician.name)}&background=0891b2&color=fff&rounded=true&bold=true&size=128`}
                    alt={musician.name}
                    className="w-11 h-11 rounded-full shadow-sm border border-default-200 object-cover"
                  />
                  <div className="flex-1">
                    <h2 className="text-base font-bold leading-tight text-foreground">
                      {musician.name}
                    </h2>
                    <p className="text-[0.7rem] text-primary font-bold tracking-wide uppercase mt-0.5">
                      Solicitar Reserva
                    </p>
                  </div>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="pb-6 pt-5 px-5">
              <BookingRequestForm musician={musician} onSuccess={onClose} />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
