"use client";

import {
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";

type Props = {
    className?: string;
    size?: "sm" | "md";
    variant?: "solid" | "overlay";
};

export default function VerifiedBadge({
    className = "",
    size = "sm",
    variant = "solid",
}: Props) {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const sizeClasses = size === "md" ? "text-sm px-3 py-1" : "text-xs px-2.5 py-0.5";
    const variantClasses =
        variant === "overlay"
            ? "bg-emerald-800 text-white border border-white/20 backdrop-blur-sm"
            : "bg-success/15 text-success-text border border-success/30";

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpen();
                }}
                aria-label="Artista verificado. ¿Qué significa verificado?"
                title="¿Qué significa verificado?"
                className="inline-flex items-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
                <Chip
                    size={size === "md" ? "md" : "sm"}
                    variant="flat"
                    className={`${sizeClasses} font-semibold ${variantClasses} ${className}`}
                    startContent={
                        <Icon
                            icon="material-symbols:verified"
                            width={size === "md" ? 18 : 14}
                            height={size === "md" ? 18 : 14}
                            aria-hidden="true"
                        />
                    }
                    endContent={
                        <Icon
                            icon="material-symbols:help-outline-rounded"
                            width={size === "md" ? 15 : 13}
                            height={size === "md" ? 15 : 13}
                            className="ml-0.5 opacity-80"
                            aria-hidden="true"
                        />
                    }
                >
                    Verificado
                </Chip>
            </button>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center gap-2 text-foreground">
                                <Icon
                                    icon="material-symbols:verified"
                                    width={22}
                                    className="text-success"
                                    aria-hidden="true"
                                />
                                <span>¿Qué significa artista verificado?</span>
                            </ModalHeader>
                            <ModalBody className="text-sm text-default-600 space-y-3">
                                <p>
                                    Antes de publicar un perfil en Chivapp, nuestro equipo revisa manualmente:
                                </p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>
                                        <strong className="text-foreground">Identidad validada:</strong>{" "}
                                        documento oficial de identidad (DNI o Carnet de Extranjería) del representante o solista.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Material auténtico:</strong>{" "}
                                        fotos, videos de presentaciones reales y repertorio propio de la agrupación.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Datos de cobro verificados:</strong>{" "}
                                        cuenta titular validada para operar con pago protegido y contrato electrónico.
                                    </li>
                                </ul>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="primary" onPress={onClose} className="font-semibold">
                                    Entendido
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
