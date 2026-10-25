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
import PasswordRequirementsChecklist from "@/components/auth/password-requirements-checklist";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useAuth } from "@/contexts/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import { evaluatePasswordRules } from "@/lib/password-rules";

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

    const passwordEvaluation = evaluatePasswordRules(password, password);
    const needsVerification = Boolean(user && user.is_email_verified === false);

    async function handleSetPassword() {
        if (!passwordEvaluation.isValid) {
            addToast({
                title: "Contraseña insegura",
                description:
                    "Cumple con todos los requisitos (mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial).",
                color: "warning",
            });
            return;
        }

        setIsLoading(true);
        try {
            await apiFetch("/auth/set-password", {
                method: "POST",
                body: JSON.stringify({ password }),
                headers: { "Content-Type": "application/json" },
            });

            addToast({
                title: "¡Cuenta protegida!",
                description: "Contraseña guardada correctamente.",
                color: "success",
            });
            onSuccess();
        } catch (error) {
            addToast({
                title: "No se pudo guardar la contraseña",
                description:
                    error instanceof ApiError
                        ? error.message
                        : "Verifica tu correo electrónico desde tu bandeja de entrada e inténtalo de nuevo.",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Modal
            closeButton={<ModalCloseButton aria-label="Cerrar" />}
            isOpen={isOpen}
            onOpenChange={(open) => !open && onClose()}
            placement="center"
            backdrop="blur"
            isDismissable={false}
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <h3 className="text-xl font-bold">¡Estás a un paso!</h3>
                        </ModalHeader>
                        <ModalBody>
                            {needsVerification ? (
                                <div
                                    className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-default-700"
                                    role="status"
                                >
                                    Te enviamos un correo de verificación a{" "}
                                    <strong>{user?.email}</strong>. Confírmalo desde tu bandeja
                                    de entrada para crear tu contraseña permanente, o continúa
                                    con tu reserva ahora mismo.
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-default-600 mb-3">
                                        Crea una contraseña rápida para asegurar tu cuenta y
                                        consultar tus reservas y recibos en cualquier momento.
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
                                    <PasswordRequirementsChecklist
                                        password={password}
                                        confirmPassword={password}
                                        showMatch={false}
                                        showStrengthBar={true}
                                    />
                                </>
                            )}
                        </ModalBody>
                        <ModalFooter className="flex-col sm:flex-row gap-2">
                            <Button
                                variant="light"
                                onPress={onSkip}
                                isDisabled={isLoading}
                                className="w-full sm:w-auto"
                            >
                                {needsVerification
                                    ? "Continuar con mi reserva"
                                    : "No gracias, continuar"}
                            </Button>
                            {!needsVerification ? (
                                <Button
                                    color="primary"
                                    onPress={handleSetPassword}
                                    isLoading={isLoading}
                                    isDisabled={!passwordEvaluation.isValid}
                                    className="w-full sm:w-auto font-bold shadow-md"
                                    endContent={
                                        !isLoading ? <Icon icon="lucide:arrow-right" /> : null
                                    }
                                >
                                    Guardar y continuar
                                </Button>
                            ) : null}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
