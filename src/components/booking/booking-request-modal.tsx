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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

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
                  aria-label="Cerrar"
                  className="absolute top-2 right-2 text-default-500 hover:text-foreground z-10 min-w-11 min-h-11"
                  size="sm"
                >
                  <Icon icon="lucide:x" className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3.5 mr-10">
                  {musician.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={musician.image}
                      alt={musician.name}
                      className="w-11 h-11 rounded-full shadow-sm border border-default-200 object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="w-11 h-11 rounded-full shadow-sm border border-default-200 bg-primary/15 text-primary-text font-bold text-sm flex items-center justify-center shrink-0"
                    >
                      {getInitials(musician.name)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-base font-bold leading-tight text-foreground">
                      {musician.name}
                    </h2>
                    <p className="text-xs text-primary-text font-semibold mt-0.5">
                      Pedir cotización
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
