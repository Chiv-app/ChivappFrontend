"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Divider, Input, addToast } from "@heroui/react";
import { PasswordInput } from "@/components/auth/password-input";
import SocialAuthButtons from "@/components/auth/social-auth-buttons";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { isEmailTakenError } from "@/lib/auth-errors";
import { resolveAuthRedirect } from "@/lib/profiles";
import { UI } from "@/lib/ui-classes";

type Props = {
    redirect?: string | null;
    oauthError?: string | null;
    onSwitchToRegister?: () => void;
    onSuccess?: (destination: string) => void;
};

export default function LoginForm({
    redirect = "/",
    oauthError,
    onSwitchToRegister,
    onSuccess,
}: Props) {
    const { login } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const loggedIn = await login({ email, password });
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
        } catch (error) {
            const raw =
                error instanceof ApiError
                    ? error.message
                    : "No se pudo iniciar sesión. Intenta de nuevo.";
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
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {oauthError ? (
                <p className="text-sm text-danger rounded-xl bg-danger/10 px-3 py-2 leading-relaxed">
                    {oauthError === "google_not_configured"
                        ? "El inicio de sesión con Google requiere configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor. Puedes ingresar con tu correo y contraseña."
                        : oauthError === "access_denied"
                          ? "Acceso cancelado en Google. Intenta nuevamente si deseas ingresar con tu cuenta."
                          : oauthError === "pending_expired"
                            ? "El registro social expiró. Por favor intenta iniciar sesión con Google nuevamente."
                            : "No se pudo completar el acceso social. Intenta de nuevo o ingresa con tu correo."}
                </p>
            ) : null}
            <SocialAuthButtons intent="login" />
            <div className="flex items-center gap-3">
                <Divider className="flex-1" />
                <span className="text-xs font-medium text-default-400 uppercase tracking-widest">
                    O con correo
                </span>
                <Divider className="flex-1" />
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                    label="Correo electrónico"
                    type="email"
                    placeholder="tu@email.com"
                    variant="bordered"
                    value={email}
                    onValueChange={setEmail}
                    isRequired
                    autoComplete="email"
                    classNames={UI.authInput}
                />
                <PasswordInput
                    label="Contraseña"
                    placeholder="••••••••"
                    variant="bordered"
                    value={password}
                    onValueChange={setPassword}
                    isRequired
                    autoComplete="current-password"
                    classNames={UI.authInput}
                />
                <div className="flex justify-end">
                    <a
                        href="/forgot-password"
                        className="text-sm text-default-500 hover:text-foreground transition-colors"
                    >
                        ¿Olvidaste tu contraseña?
                    </a>
                </div>
                <Button
                    type="submit"
                    color="primary"
                    radius="lg"
                    className="font-semibold shadow-glow hover:shadow-glow-lg transition-shadow"
                    isLoading={isSubmitting}
                >
                    Ingresar
                </Button>
            </form>
            {onSwitchToRegister ? (
                <p className="text-sm text-default-500 text-center">
                    ¿No tienes cuenta?{" "}
                    <button
                        type="button"
                        onClick={onSwitchToRegister}
                        className="font-semibold text-foreground hover:text-secondary transition-colors"
                    >
                        Regístrate
                    </button>
                </p>
            ) : null}
        </div>
    );
}
