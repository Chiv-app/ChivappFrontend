"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Input, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { resendVerificationEmail, verifyEmail } from "@/lib/auth";

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const { user, isLoading: authLoading, refresh } = useAuth();
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [passwordResetSent, setPasswordResetSent] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [resending, setResending] = useState(false);
    const [emailInput, setEmailInput] = useState("");

    async function runVerification(optionalPassword?: string) {
        if (!token) return;
        setStatus("loading");
        try {
            const result = await verifyEmail(token, optionalPassword);
            setStatus("success");
            setMessage(result.message);
            setPasswordResetSent(Boolean(result.password_reset_sent));
            await refresh().catch(() => undefined);
        } catch (error) {
            setStatus("error");
            setMessage(
                error instanceof ApiError
                    ? error.message
                    : "No se pudo verificar tu correo.",
            );
        }
    }

    useEffect(() => {
        if (!token || authLoading) return;
        // Si el usuario ya tiene sesión activa en este navegador, verificamos de inmediato.
        // Si abre el enlace desde otro dispositivo sin sesión, puede ingresar su contraseña
        // para conservarla o confirmar directamente para recibir un enlace de restablecimiento.
        if (user && status === "idle") {
            void Promise.resolve().then(() => runVerification());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, authLoading, user]);

    const displayStatus = !token ? "error" : status;
    const displayMessage = !token
        ? "Falta el token de verificación en el enlace."
        : message;

    async function handleResend() {
        const targetEmail = user?.email || emailInput.trim();
        if (!user && !targetEmail) {
            addToast({
                title: "Ingresa tu correo",
                description: "Escribe tu correo electrónico para enviarte un nuevo enlace de verificación.",
                color: "warning",
            });
            return;
        }
        setResending(true);
        try {
            const result = await resendVerificationEmail(user ? undefined : targetEmail);
            addToast({ title: result.message, color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo reenviar",
                description:
                    error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setResending(false);
        }
    }

    return (
        <Card className="w-full max-w-lg border border-default-200/70 shadow-soft">
            <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-0">
                <div className="flex items-center gap-2">
                    <Icon
                        icon={
                            displayStatus === "success"
                                ? "material-symbols:mark-email-read"
                                : displayStatus === "error"
                                  ? "material-symbols:error"
                                  : "material-symbols:mail"
                        }
                        className="text-2xl text-primary"
                    />
                    <h1 className="text-xl font-semibold">Verificación de correo</h1>
                </div>
            </CardHeader>
            <CardBody className="px-6 pb-6 pt-4 flex flex-col gap-4">
                {displayStatus === "loading" || authLoading ? (
                    <p className="text-default-500">Verificando tu correo…</p>
                ) : displayStatus === "idle" && !user ? (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-default-600">
                            Estás verificando tu correo desde un dispositivo sin sesión activa. Si ya elegiste una contraseña al registrarte, escríbela para conservarla; si no la tienes a mano, verificaremos tu correo y te enviaremos un enlace para definir una nueva.
                        </p>
                        <Input
                            label="Contraseña de tu cuenta (opcional)"
                            labelPlacement="outside"
                            placeholder="Ingresa tu contraseña para conservarla"
                            type="password"
                            variant="bordered"
                            value={passwordInput}
                            onValueChange={setPasswordInput}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                color="primary"
                                radius="lg"
                                onPress={() => runVerification(passwordInput.trim() || undefined)}
                            >
                                Confirmar correo
                            </Button>
                            <Button
                                variant="flat"
                                radius="lg"
                                onPress={() => runVerification(undefined)}
                            >
                                No recuerdo mi contraseña
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p
                        className={
                            displayStatus === "success" ? "text-success" : "text-danger"
                        }
                    >
                        {displayMessage}
                    </p>
                )}
                {displayStatus === "success" && passwordResetSent ? (
                    <div className="rounded-xl border border-warning-200 bg-warning-50/70 p-3 text-sm text-warning-800">
                        Por seguridad, dado que verificaste tu correo sin sesión activa, te enviamos un correo adicional con un enlace para definir tu contraseña antes de iniciar sesión.
                    </div>
                ) : null}
                {displayStatus === "error" && !user ? (
                    <div className="flex flex-col gap-2">
                        <Input
                            label="Correo electrónico para reenviar enlace"
                            labelPlacement="outside"
                            placeholder="correo@ejemplo.com"
                            type="email"
                            variant="bordered"
                            value={emailInput}
                            onValueChange={setEmailInput}
                        />
                        <p className="text-xs text-default-500">
                            También puedes{" "}
                            <Link
                                href="/forgot-password"
                                className="font-semibold text-primary-text underline underline-offset-2"
                            >
                                restablecer tu contraseña
                            </Link>
                            , lo cual verificará tu correo automáticamente.
                        </p>
                    </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                    {displayStatus === "success" ? (
                        <Button color="primary" radius="lg" onPress={() => router.replace("/")}>
                            Ir al inicio
                        </Button>
                    ) : null}
                    {displayStatus === "error" ? (
                        <>
                            <Button
                                color="primary"
                                radius="lg"
                                variant="flat"
                                isLoading={resending}
                                onPress={handleResend}
                            >
                                Reenviar verificación
                            </Button>
                            <Button radius="lg" variant="light" onPress={() => router.replace("/")}>
                                Ir al inicio
                            </Button>
                        </>
                    ) : null}
                </div>
            </CardBody>
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
            <Suspense fallback={<p className="text-default-500">Cargando…</p>}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
