"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { PasswordInput } from "@/components/auth/password-input";
import PasswordRequirementsChecklist from "@/components/auth/password-requirements-checklist";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { previewPasswordSetup, setPassword } from "@/lib/ensemble-members";
import { evaluatePasswordRules } from "@/lib/password-rules";
import { getPostLoginPath } from "@/lib/profiles";
import { UI } from "@/lib/ui-classes";
import type { PasswordSetupPreviewOut } from "@/types/api";

function SetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const { user, isLoading: authLoading, refresh } = useAuth();

    const [preview, setPreview] = useState<PasswordSetupPreviewOut | null>(null);
    const [password, setPasswordValue] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewLoaded, setPreviewLoaded] = useState(false);

    const loadingPreview = Boolean(token) && !previewLoaded && !previewError;

    useEffect(() => {
        if (!token) return;

        let cancelled = false;
        previewPasswordSetup(token)
            .then((data) => {
                if (cancelled) return;
                setPreview(data);
                setPreviewError(null);
                setPreviewLoaded(true);
            })
            .catch((error) => {
                if (cancelled) return;
                setPreviewError(
                    error instanceof ApiError
                        ? error.message
                        : "Enlace de invitación no válido",
                );
                setPreviewLoaded(true);
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    useEffect(() => {
        if (authLoading || token) return;
        if (!user) {
            router.replace("/?auth=login&redirect=/set-password");
            return;
        }
        if (user.has_password) {
            router.replace(getPostLoginPath(user.role, user.is_verified));
        }
    }, [authLoading, user, token, router]);

    const passwordEvaluation = evaluatePasswordRules(password, confirm);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
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
            const updated = await setPassword({
                password,
                token: token || undefined,
            });
            // La cookie ya viene en la respuesta; no fallar si /me tarda.
            await refresh().catch(() => undefined);
            addToast({
                title: "Contraseña creada",
                description: "Ya puedes usar la app con tu correo y contraseña.",
                color: "success",
            });
            if (updated.is_ensemble_member) {
                router.replace("/musician/bookings");
            } else {
                router.replace(getPostLoginPath(updated.role, updated.is_verified));
            }
        } catch (error) {
            addToast({
                title: "No se pudo guardar",
                description:
                    error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
            setIsSubmitting(false);
        }
    }

    if (loadingPreview || authLoading) {
        return (
            <div className="w-full max-w-md h-80 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
        );
    }

    if (token && previewError) {
        return (
            <Card className="w-full max-w-md border border-danger/30 shadow-soft">
                <CardBody className="gap-3 p-6">
                    <Chip color="danger" variant="flat" className="w-fit">
                        Enlace inválido
                    </Chip>
                    <h1 className="text-xl font-bold">No pudimos abrir la invitación</h1>
                    <p className="text-sm text-default-600">{previewError}</p>
                    <p className="text-sm text-default-500">
                        Pide al líder de tu agrupación que reenvíe el enlace.
                    </p>
                </CardBody>
            </Card>
        );
    }

    if (token && preview && !preview.requires_password) {
        return (
            <Card className="w-full max-w-md border border-default-200/70 shadow-soft">
                <CardBody className="gap-4 p-6">
                    <Chip color="success" variant="flat" className="w-fit">
                        Cuenta lista
                    </Chip>
                    <h1 className="text-xl font-bold">Ya tienes contraseña</h1>
                    <p className="text-sm text-default-600">
                        Tu correo <strong>{preview.email}</strong> ya puede iniciar
                        sesión. Si llegaste por una invitación, entra con tu contraseña
                        actual.
                    </p>
                    <Button
                        as={Link}
                        href="/?auth=login"
                        color="primary"
                        radius="lg"
                        className={UI.primaryButton}
                    >
                        Ir a iniciar sesión
                    </Button>
                </CardBody>
            </Card>
        );
    }

    if (!token && user?.has_password) {
        return null;
    }

    if (!token && !user) {
        return null;
    }

    const titleName = preview?.fullname || user?.fullname || "Integrante";

    return (
        <Card className="w-full max-w-md border border-default-200/70 shadow-soft">
            <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-0">
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:lock" className="text-2xl text-primary" />
                    <h1 className="text-xl font-semibold">Crea tu contraseña</h1>
                </div>
                <p className="text-sm text-default-500">
                    Hola {titleName}, define una contraseña segura para acceder a tu
                    cuenta.
                </p>
            </CardHeader>
            <CardBody className="px-6 pb-6 pt-4">
                {!token && user ? (
                    <div className="mb-4 rounded-xl bg-default-100 p-3 text-xs text-default-600">
                        Tu cuenta aún no tiene contraseña. Créala para continuar.
                        <p className="mt-1 font-medium">{user.email}</p>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <PasswordInput
                        label="Nueva contraseña"
                        placeholder="••••••••"
                        variant="bordered"
                        value={password}
                        onValueChange={setPasswordValue}
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
                        className={UI.primaryButton}
                        isLoading={isSubmitting}
                        isDisabled={!passwordEvaluation.isValid}
                        startContent={
                            !isSubmitting ? (
                                <Icon icon="material-symbols:lock" width={18} />
                            ) : undefined
                        }
                    >
                        Guardar y continuar
                    </Button>
                </form>
            </CardBody>
        </Card>
    );
}

export default function SetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="w-full max-w-md h-80 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
            }
        >
            <SetPasswordForm />
        </Suspense>
    );
}
