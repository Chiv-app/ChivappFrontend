"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { PasswordInput } from "@/components/auth/password-input";
import PasswordRequirementsChecklist from "@/components/auth/password-requirements-checklist";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { previewPasswordReset, resetPassword } from "@/lib/auth";
import { evaluatePasswordRules } from "@/lib/password-rules";
import { getPostLoginPath } from "@/lib/profiles";
import { UI } from "@/lib/ui-classes";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const { refresh } = useAuth();

    const [preview, setPreview] = useState<{ email: string; fullname: string } | null>(
        null,
    );
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) return;

        let cancelled = false;
        previewPasswordReset(token)
            .then((data) => {
                if (!cancelled) setPreview(data);
            })
            .catch((error) => {
                if (!cancelled) {
                    setPreviewError(
                        error instanceof ApiError
                            ? error.message
                            : "Enlace no válido o expirado.",
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    const displayError = !token ? "Enlace inválido." : previewError;

    const passwordEvaluation = evaluatePasswordRules(password, confirm);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!token) return;
        if (!passwordEvaluation.isValid) {
            let msg = "Por favor cumple con todos los requisitos de seguridad.";
            if (!passwordEvaluation.minLength || !passwordEvaluation.maxLength) {
                msg = "La contraseña debe tener entre 8 y 64 caracteres.";
            } else if (!passwordEvaluation.matchesConfirm) {
                msg = "Las contraseñas no coinciden.";
            }
            addToast({
                title: "Error de contraseña",
                description: msg,
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const user = await resetPassword(token, password);
            await refresh();
            addToast({ title: "Contraseña actualizada", color: "success" });
            router.replace(getPostLoginPath(user.role, user.is_verified));
        } catch (error) {
            addToast({
                title: "No se pudo restablecer",
                description:
                    error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="w-full max-w-lg border border-default-200/70 shadow-soft">
            <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-0">
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:key" className="text-2xl text-primary" />
                    <h1 className="text-xl font-semibold">Nueva contraseña</h1>
                </div>
                {preview ? (
                    <p className="text-sm text-default-500">
                        Cuenta: <span className="font-medium">{preview.email}</span>
                    </p>
                ) : null}
            </CardHeader>
            <CardBody className="px-6 pb-6 pt-4">
                {displayError ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-danger text-sm">{displayError}</p>
                        <Button as={Link} href="/forgot-password" color="primary" radius="lg">
                            Solicitar nuevo enlace
                        </Button>
                    </div>
                ) : !preview ? (
                    <p className="text-default-500">Validando enlace…</p>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <PasswordInput
                            label="Nueva contraseña"
                            placeholder="••••••••"
                            variant="bordered"
                            value={password}
                            onValueChange={setPassword}
                            isRequired
                            autoComplete="new-password"
                            classNames={UI.authInput}
                        />
                        <PasswordInput
                            label="Confirmar contraseña"
                            placeholder="••••••••"
                            variant="bordered"
                            value={confirm}
                            onValueChange={setConfirm}
                            isRequired
                            autoComplete="new-password"
                            classNames={UI.authInput}
                        />
                        <PasswordRequirementsChecklist
                            password={password}
                            confirmPassword={confirm}
                            showMatch={true}
                            showStrengthBar={true}
                        />
                        <Button
                            type="submit"
                            color="primary"
                            radius="lg"
                            isLoading={isSubmitting}
                            isDisabled={!passwordEvaluation.isValid}
                            className="font-semibold shadow-glow hover:shadow-glow-lg transition-shadow"
                        >
                            Guardar contraseña
                        </Button>
                    </form>
                )}
            </CardBody>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
            <Suspense fallback={<p className="text-default-500">Cargando…</p>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
