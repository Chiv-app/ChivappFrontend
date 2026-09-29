"use client";

import { useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onSkip: () => void;
};

export default function BookingGuestUpsellModal({
    isOpen,
    onClose,
    onSuccess,
    onSkip,
}: Props) {
    const { user } = useAuth();
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSetPassword() {
        if (password.length < 8) {
            addToast({ title: "Contraseña muy corta", description: "Debe tener al menos 8 caracteres.", color: "warning" });
            return;
        }
        
        setIsLoading(true);
        try {
            await apiFetch("/auth/set-password", {
                method: "POST",
                body: JSON.stringify({ password }),
                headers: { "Content-Type": "application/json" }
            });
            
            addToast({ title: "¡Cuenta protegida!", description: "Contraseña guardada correctamente.", color: "success" });
            onSuccess();
        } catch (error) {
            addToast({ title: "Error", description: "Ocurrió un error al guardar la contraseña.", color: "danger" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={(open) => !open && onClose()}
            placement="center"
            backdrop="blur"
            isDismissable={false}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <h3 className="text-xl font-bold">¡Estás a un paso!</h3>
                        </ModalHeader>
                        <ModalBody>
                            <p className="text-sm text-default-600 mb-4">
                                Crea una contraseña rápida para asegurar tu cuenta, ganar puntos en el futuro y poder descargar tus recibos en cualquier momento.
                            </p>
                            
                            <Input
                                label="Crea tu contraseña"
                                type="password"
                                variant="bordered"
                                placeholder="Mínimo 8 caracteres"
                                value={password}
                                onValueChange={setPassword}
                                isDisabled={isLoading}
                            />
                        </ModalBody>
                        <ModalFooter className="flex-col sm:flex-row gap-2">
                            <Button 
                                variant="light" 
                                onPress={onSkip}
                                isDisabled={isLoading}
                                className="w-full sm:w-auto"
                            >
                                No gracias, ir a pagar
                            </Button>
                            <Button
                                color="primary"
                                onPress={handleSetPassword}
                                isLoading={isLoading}
                                className="w-full sm:w-auto font-bold shadow-md"
                                endContent={!isLoading ? <Icon icon="lucide:arrow-right" /> : null}
                            >
                                Guardar y Pagar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
