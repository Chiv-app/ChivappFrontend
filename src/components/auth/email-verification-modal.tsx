"use client";

import { FormEvent, useState } from "react";
import {
    Button,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { ApiError } from "@/lib/api";
import {
    confirmEmailVerificationCode,
    sendEmailVerificationCode,
} from "@/lib/auth";

type Props = {
    isOpen: boolean;
    email: string;
    onClose: () => void;
    /** Se llama cuando el correo quedó verificado (la sesión sigue activa). */
    onVerified: () => void;
};

/**
 * Pide verificar el correo con un código de 6 dígitos antes de firmar el contrato y pagar.
 * El código se envía solo cuando la persona lo pide, para no enviar correos sin que lo espere.
 */
export default function EmailVerificationModal({ isOpen, email, onClose, onVerified }: Props) {
    const [codeSent, setCodeSent] = useState(false);
    const [code, setCode] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    function resetState() {
        setCodeSent(false);
        setCode("");
        setErrorMessage(null);
    }

    function handleClose() {
        resetState();
        onClose();
    }

    function handleVerified() {
        resetState();
        onVerified();
    }

    async function handleSend() {
        setIsSending(true);
        setErrorMessage(null);
        try {
            const res = await sendEmailVerificationCode();
            if (res.email_verified) {
                handleVerified();
                return;
            }
            setCodeSent(true);
            addToast({
                title: "Código enviado",
                description: `Revisa tu correo ${email}. El código vence en 10 minutos.`,
                color: "success",
            });
        } catch (error) {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "No se pudo enviar el código. Intenta de nuevo.";
            // Si ya se envió uno hace poco, se deja ingresar ese mismo código.
            if (error instanceof ApiError && error.status === 429) {
                setCodeSent(true);
            }
            setErrorMessage(message);
        } finally {
            setIsSending(false);
        }
    }

    async function handleConfirm(e: FormEvent) {
        e.preventDefault();
        setIsConfirming(true);
        setErrorMessage(null);
        try {
            await confirmEmailVerificationCode(code.trim());
            addToast({
                title: "Correo verificado",
                description: "Ya puedes firmar el contrato y pagar.",
                color: "success",
            });
            handleVerified();
        } catch (error) {
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : "No se pudo verificar el código. Intenta de nuevo.",
            );
        } finally {
            setIsConfirming(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} isDismissable={false} placement="center">
            <ModalContent>
                {() => (
                    <form onSubmit={handleConfirm}>
                        <ModalHeader className="flex items-center gap-2">
                            <Icon icon="lucide:mail-check" width={22} className="text-primary" />
                            Verifica tu correo
                        </ModalHeader>
                        <ModalBody className="gap-3">
                            <p className="text-sm text-default-600">
                                Para firmar el contrato y pagar necesitamos confirmar que{" "}
                                <b>{email}</b> es tuyo. Te enviaremos un código de 6 dígitos.
                            </p>
                            {codeSent ? (
                                <Input
                                    id="email-verification-code"
                                    label="Código de verificación"
                                    labelPlacement="outside"
                                    placeholder="Ingresa el código de 6 dígitos"
                                    inputMode="numeric"
                                    maxLength={6}
                                    variant="bordered"
                                    value={code}
                                    onValueChange={setCode}
                                    autoComplete="one-time-code"
                                    isRequired
                                />
                            ) : null}
                            {errorMessage ? (
                                <p role="alert" className="text-sm text-danger-text">
                                    {errorMessage}
                                </p>
                            ) : null}
                        </ModalBody>
                        <ModalFooter className="flex-wrap gap-2">
                            <Button variant="light" onPress={handleClose}>
                                Cancelar
                            </Button>
                            {codeSent ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="flat"
                                        isLoading={isSending}
                                        onPress={handleSend}
                                    >
                                        Reenviar código
                                    </Button>
                                    <Button
                                        type="submit"
                                        color="primary"
                                        isLoading={isConfirming}
                                        isDisabled={code.trim().length < 4}
                                    >
                                        Verificar
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    color="primary"
                                    isLoading={isSending}
                                    onPress={handleSend}
                                >
                                    Enviar código
                                </Button>
                            )}
                        </ModalFooter>
                    </form>
                )}
            </ModalContent>
        </Modal>
    );
}
