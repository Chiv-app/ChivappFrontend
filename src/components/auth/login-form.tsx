"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Divider, Input, addToast, Form } from "@heroui/react";
import { Icon } from "@iconify/react";
import { PasswordInput } from "@/components/auth/password-input";
import SocialAuthButtons from "@/components/auth/social-auth-buttons";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { isEmailTakenError } from "@/lib/auth-errors";
import { resolveAuthRedirect } from "@/lib/profiles";
import { UI } from "@/lib/ui-classes";
import { loginStepOne, resendVerificationEmail } from "@/lib/auth";

type Props = {
    redirect?: string | null;
    oauthError?: string | null;
    onSuccess?: (destination: string) => void;
    onSwitchToRegister?: () => void;
};

type Step = "email" | "password" | "otp";

export default function LoginForm({
    redirect = "/",
    oauthError,
    onSuccess,
    onSwitchToRegister,
}: Props) {
    const { login, loginWithOtp } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notFoundError, setNotFoundError] = useState(false);
    const [unverifiedEmailError, setUnverifiedEmailError] = useState(false);
    const [isResendingVerification, setIsResendingVerification] = useState(false);

    const handleSuccess = (loggedIn: {
        role: "contractor" | "musician" | "admin";
        is_verified?: boolean;
        is_ensemble_member?: boolean;
    }) => {
        let destination = resolveAuthRedirect(
            loggedIn.role,
            redirect,
            loggedIn.is_verified,
        );

        if (loggedIn.role === "musician") {
            if (!loggedIn.is_verified && !loggedIn.is_ensemble_member) {
                destination = "/musician/onboarding";
            } else {
                if (destination === "/musician/onboarding" && (loggedIn.is_verified || loggedIn.is_ensemble_member)) {
                    destination = "/musician/bookings";
                } else if (destination === "/") {
                    destination = "/musician/bookings";
                }
            }
        }

        addToast({
            title: "Bienvenido",
            description:
                loggedIn.role === "admin"
                    ? "Accede al panel de administración."
                    : loggedIn.role === "musician"
                      ? "Gestiona tu perfil, reservas e ingresos."
                      : "Explora músicos y gestiona tus reservas.",
            color: "success",
        });

        if (onSuccess) {
            onSuccess(destination);
            return;
        }

        if (destination !== pathname) {
            router.replace(destination);
        }
        router.refresh();
    };

    const handleError = (error: unknown) => {
        const raw =
            error instanceof ApiError
                ? error.message
                : "No se pudo iniciar sesión. Intenta de nuevo.";
        if (
            error instanceof ApiError &&
            error.status === 403 &&
            raw.toLowerCase().includes("verificar tu correo")
        ) {
            setUnverifiedEmailError(true);
        }
        const isEmailTaken = isEmailTakenError(raw);
        addToast({
            title: isEmailTaken
                ? "Correo no disponible"
                : "Error al iniciar sesión",
            description: isEmailTaken
                ? "No se puede utilizar este correo porque ya está en uso."
                : raw,
            color: "danger",
        });
    };

    async function handleResendVerification() {
        if (!email.trim()) return;
        setIsResendingVerification(true);
        try {
            const res = await resendVerificationEmail(email.trim());
            addToast({
                title: "Correo enviado",
                description: res.message || "Revisa tu bandeja de entrada para confirmar tu correo.",
                color: "success",
            });
        } catch (err) {
            addToast({
                title: "No se pudo reenviar",
                description: err instanceof ApiError ? err.message : "Intenta nuevamente en unos minutos.",
                color: "danger",
            });
        } finally {
            setIsResendingVerification(false);
        }
    }

    async function handleEmailSubmit(e: FormEvent) {
        e.preventDefault();
        setNotFoundError(false);
        setIsSubmitting(true);
        try {
            const res = await loginStepOne(email);
            if (res.status === "not_found") {
                setNotFoundError(true);
            } else if (res.status === "requires_password") {
                setStep("password");
            } else if (res.status === "otp_sent") {
                setStep("otp");
            }
        } catch (error) {
            handleError(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handlePasswordSubmit(e: FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const loggedIn = await login({ email, password });
            handleSuccess(loggedIn);
        } catch (error) {
            handleError(error);
            setIsSubmitting(false);
        }
    }

    async function handleOtpSubmit(e: FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const loggedIn = await loginWithOtp(email, otp);
            handleSuccess(loggedIn);
        } catch (error) {
            handleError(error);
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {oauthError ? (
                <p role="alert" className="text-sm text-danger-text rounded-xl bg-danger/10 px-3 py-2 leading-relaxed">
                    {oauthError === "google_not_configured"
                        ? "El inicio de sesión con Google no está disponible en este momento. Puedes ingresar con tu correo y contraseña."
                        : oauthError === "access_denied"
                          ? "Acceso cancelado en Google. Intenta nuevamente si deseas ingresar con tu cuenta."
                          : oauthError === "pending_expired"
                            ? "El registro social expiró. Por favor intenta iniciar sesión con Google nuevamente."
                            : oauthError === "email_in_use"
                              ? "Este correo ya tiene una cuenta. Inicia sesión con tu contraseña y vincula Google desde tu perfil."
                              : oauthError === "invalid_state"
                                ? "La sesión de inicio con Google expiró o no es válida. Vuelve a intentarlo desde este navegador."
                                : oauthError === "invalid_magic_link"
                                  ? "El enlace de acceso expiró o ya fue utilizado. Solicita un nuevo código desde aquí."
                                  : oauthError === "user_not_found"
                                    ? "No encontramos la cuenta asociada a ese enlace. Inicia sesión con tu correo."
                                    : "No se pudo completar el acceso social. Intenta de nuevo o ingresa con tu correo."}
                </p>
            ) : null}

            {step === "email" && (
                <>
                    <SocialAuthButtons intent="login" />
                    <div className="flex items-center gap-3">
                        <Divider className="flex-1" />
                        <span className="text-xs font-medium text-default-500">
                            O con correo
                        </span>
                        <Divider className="flex-1" />
                    </div>
                    <Form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 w-full" validationBehavior="native">
                        <Input
                            label="Correo electrónico"
                            labelPlacement="outside"
                            placeholder="correo@ejemplo.com"
                            type="email"
                            variant="bordered"
                            radius="md"
                            size="lg"
                            value={email}
                            onValueChange={(val) => {
                                setEmail(val);
                                setNotFoundError(false);
                            }}
                            isRequired
                            isInvalid={notFoundError}
                            errorMessage={
                                notFoundError ? (
                                    <span className="inline-flex flex-wrap items-center gap-1">
                                        <span>No encontramos una cuenta con ese correo.</span>
                                        {onSwitchToRegister ? (
                                            <button
                                                type="button"
                                                onClick={onSwitchToRegister}
                                                className="font-semibold text-primary-text underline underline-offset-2"
                                            >
                                                Crear cuenta ahora
                                            </button>
                                        ) : (
                                            <Link
                                                href="/register"
                                                className="font-semibold text-primary-text underline underline-offset-2"
                                            >
                                                Crear cuenta ahora
                                            </Link>
                                        )}
                                    </span>
                                ) : undefined
                            }
                            autoComplete="email"
                            startContent={<Icon icon="lucide:mail" className="text-default-400" width={18} />}
                            classNames={{
                                ...UI.authInput,
                                inputWrapper: "bg-transparent border-default-200/50 shadow-none",
                            }}
                        />
                        <Button
                            type="submit"
                            color="primary"
                            radius="full"
                            size="lg"
                            className="font-bold shadow-lg w-full mt-2 hover:opacity-90 transition-opacity"
                            isLoading={isSubmitting}
                        >
                            Continuar
                        </Button>
                    </Form>
                </>
            )}

            {step === "password" && (
                <Form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 w-full" validationBehavior="native">
                    <p className="text-sm text-default-500 mb-2">Ingresa tu contraseña para <b>{email}</b></p>
                    {unverifiedEmailError ? (
                        <div
                            role="alert"
                            className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-default-700 flex flex-col gap-2"
                        >
                            <p className="font-semibold text-warning-text">
                                Debes confirmar tu correo electrónico antes de ingresar con contraseña.
                            </p>
                            <p>
                                Revisa tu bandeja de entrada o solicita un nuevo enlace. También puedes{" "}
                                <Link
                                    href="/forgot-password"
                                    className="font-semibold text-primary-text underline underline-offset-2"
                                >
                                    restablecer tu contraseña
                                </Link>{" "}
                                para confirmar tu correo automáticamente.
                            </p>
                            <div>
                                <Button
                                    type="button"
                                    size="sm"
                                    color="warning"
                                    variant="flat"
                                    isLoading={isResendingVerification}
                                    onPress={handleResendVerification}
                                >
                                    Reenviar correo de verificación
                                </Button>
                            </div>
                        </div>
                    ) : null}
                    <PasswordInput
                        label="Contraseña"
                        labelPlacement="outside"
                        placeholder="Contraseña"
                        variant="bordered"
                        radius="md"
                        size="lg"
                        value={password}
                        onValueChange={setPassword}
                        isRequired
                        autoComplete="current-password"
                        startContent={<Icon icon="lucide:lock" className="text-default-400" width={18} />}
                        classNames={{
                            ...UI.authInput,
                            inputWrapper: "bg-transparent border-default-200/50 shadow-none",
                        }}
                    />
                    <div className="flex justify-between items-center mt-1">
                        <button
                            type="button"
                            onClick={() => setStep("email")}
                            className="min-h-11 inline-flex items-center text-sm text-default-500 hover:text-foreground transition-colors"
                        >
                            Cambiar correo
                        </button>
                        <Link
                            href="/forgot-password"
                            className="min-h-11 inline-flex items-center text-sm text-primary-text hover:opacity-80 transition-colors"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                    <Button
                        type="submit"
                        color="primary"
                        radius="full"
                        size="lg"
                        className="font-bold shadow-lg w-full mt-2 hover:opacity-90 transition-opacity"
                        isLoading={isSubmitting}
                    >
                        Ingresar
                    </Button>
                </Form>
            )}

            {step === "otp" && (
                <Form onSubmit={handleOtpSubmit} className="flex flex-col gap-4 w-full" validationBehavior="native">
                    <p className="text-sm text-default-500 mb-2">
                        Hemos enviado un código a <b>{email}</b>. Ingrésalo para continuar.
                    </p>
                    <Input
                        label="Código de verificación"
                        labelPlacement="outside"
                        placeholder="Ingresa el código de 6 dígitos"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        variant="bordered"
                        radius="md"
                        size="lg"
                        value={otp}
                        onValueChange={setOtp}
                        isRequired
                        autoComplete="one-time-code"
                        startContent={<Icon icon="lucide:key" className="text-default-400" width={18} />}
                        classNames={{
                            ...UI.authInput,
                            inputWrapper: "bg-transparent border-default-200/50 shadow-none",
                        }}
                    />
                    <Button
                        type="submit"
                        color="primary"
                        radius="full"
                        size="lg"
                        className="font-bold shadow-lg w-full mt-2 hover:opacity-90 transition-opacity"
                        isLoading={isSubmitting}
                    >
                        Verificar e ingresar
                    </Button>
                    <div className="flex flex-col items-center gap-1 mt-2">
                        <button
                            type="button"
                            onClick={() => setStep("password")}
                            className="min-h-11 inline-flex items-center text-sm text-primary hover:opacity-80 transition-colors"
                        >
                            Usar mi contraseña en su lugar
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep("email")}
                            className="min-h-11 inline-flex items-center text-sm text-default-500 hover:text-foreground transition-colors"
                        >
                            Cambiar correo
                        </button>
                    </div>
                </Form>
            )}
        </div>
    );
}
