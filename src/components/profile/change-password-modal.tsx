"use client";

import { useState } from "react";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { PasswordInput } from "@/components/auth/password-input";
import PasswordRequirementsChecklist from "@/components/auth/password-requirements-checklist";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { changePassword } from "@/lib/auth";
import { evaluatePasswordRules } from "@/lib/password-rules";
import { UI } from "@/lib/ui-classes";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function ChangePasswordModal({ isOpen, onClose }: Props) {
    const { user, refresh } = useAuth();
    const hasExistingPassword = user?.has_password ?? true;

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const evaluation = evaluatePasswordRules(newPassword, confirmPassword);
    const canSubmit =
        evaluation.isValid &&
        (!hasExistingPassword || currentPassword.length > 0) &&
        !isSubmitting;

    const resetForm = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrorMsg(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await changePassword({
                current_password: hasExistingPassword ? currentPassword : "",
                new_password: newPassword,
            });

            addToast({
                title: "Contraseña actualizada",
                description: res.message || "Tu contraseña se ha cambiado correctamente.",
                color: "success",
            });

            await refresh();
            handleClose();
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : "Error al actualizar la contraseña";
            setErrorMsg(message);
            addToast({
                title: "No se pudo cambiar la contraseña",
                description: message,
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) handleClose();
            }}
            size="lg" scrollBehavior="inside" placement="bottom-center"
            backdrop="blur"
            classNames={{
                base: "border border-default-200/80 bg-content1 shadow-2xl rounded-3xl",
                header: "border-b border-default-200/50 pb-3 pt-5 px-6",
                body: "py-4 px-6 gap-4",
                footer: "border-t border-default-200/50 pt-3 pb-5 px-6",
            }}
        >
            <ModalContent>
                <form onSubmit={handleSubmit} className="contents">
                    <ModalHeader className="flex items-center gap-2 text-foreground font-semibold">
                        <Icon icon="solar:lock-password-bold-duotone" className="text-xl text-primary" />
                        <span>{hasExistingPassword ? "Cambiar contraseña" : "Crear contraseña"}</span>
                    </ModalHeader>

                    <ModalBody className="py-4 gap-4">
                        {errorMsg && (
                            <div className="flex items-start gap-2 rounded-xl bg-danger/10 border border-danger/30 p-3 text-xs text-danger">
                                <Icon icon="material-symbols:error-rounded" className="text-base shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {hasExistingPassword ? (
                            <PasswordInput
                                label="Contraseña actual"
                                placeholder="Ingresa tu contraseña actual"
                                variant="bordered"
                                value={currentPassword}
                                onValueChange={(val) => {
                                    setCurrentPassword(val);
                                    setErrorMsg(null);
                                }}
                                isRequired
                                autoComplete="current-password"
                                classNames={UI.authInput}
                            />
                        ) : (
                            <p className="text-xs text-default-500">
                                Tu cuenta fue creada mediante acceso social. Define una contraseña para acceder con correo y clave.
                            </p>
                        )}

                        <PasswordInput
                            label="Nueva contraseña"
                            placeholder="Ingresa la nueva contraseña"
                            variant="bordered"
                            value={newPassword}
                            onValueChange={(val) => {
                                setNewPassword(val);
                                setErrorMsg(null);
                            }}
                            isRequired
                            autoComplete="new-password"
                            classNames={UI.authInput}
                        />

                        <PasswordInput
                            label="Confirmar nueva contraseña"
                            placeholder="Repite la nueva contraseña"
                            variant="bordered"
                            value={confirmPassword}
                            onValueChange={(val) => {
                                setConfirmPassword(val);
                                setErrorMsg(null);
                            }}
                            isRequired
                            autoComplete="new-password"
                            classNames={UI.authInput}
                        />

                        <PasswordRequirementsChecklist
                            password={newPassword}
                            confirmPassword={confirmPassword}
                            showMatch={true}
                            showStrengthBar={true}
                        />
                    </ModalBody>

                    <ModalFooter className="flex justify-end gap-2">
                        <Button variant="flat" color="default" onPress={handleClose} isDisabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            isLoading={isSubmitting}
                            isDisabled={!canSubmit}
                            className="font-medium"
                        >
                            Guardar contraseña
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}


