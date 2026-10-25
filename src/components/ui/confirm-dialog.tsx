"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@heroui/react";
import { Icon } from "@iconify/react";

export type ConfirmDialogProps = {
    isOpen: boolean;
    onClose?: () => void;
    onOpenChange?: (isOpen: boolean) => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    color?: "danger" | "warning" | "primary" | "success";
    isLoading?: boolean;
};

export default function ConfirmDialog({
    isOpen,
    onClose,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Volver",
    color = "danger",
    isLoading = false,
}: ConfirmDialogProps) {
    const handleClose = () => {
        onClose?.();
        onOpenChange?.(false);
    };

    return (
        <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
            isOpen={isOpen}
            onClose={handleClose}
            onOpenChange={(open) => {
                if (!open) handleClose();
                else onOpenChange?.(open);
            }}
            placement="center"
            size="md"
        >
            <ModalContent>
                <ModalHeader className="flex items-center gap-2.5 text-foreground">
                    <Icon
                        icon={
                            color === "danger"
                                ? "lucide:alert-triangle"
                                : "lucide:help-circle"
                        }
                        width={20}
                        className={
                            color === "danger"
                                ? "text-danger shrink-0"
                                : color === "success"
                                  ? "text-success shrink-0"
                                  : "text-warning shrink-0"
                        }
                    />
                    <span>{title}</span>
                </ModalHeader>
                <ModalBody>
                    <p className="text-sm text-default-600 leading-relaxed">
                        {description}
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="flat"
                        onPress={handleClose}
                        isDisabled={isLoading}
                        autoFocus
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        color={color}
                        onPress={() => {
                            void onConfirm();
                        }}
                        isLoading={isLoading}
                        className="font-semibold"
                    >
                        {confirmLabel}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
