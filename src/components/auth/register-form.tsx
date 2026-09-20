"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Button,
    Checkbox,
    Divider,
    Input,
    Radio,
    RadioGroup,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { PasswordInput } from "@/components/auth/password-input";
import PasswordRequirementsChecklist from "@/components/auth/password-requirements-checklist";
import SocialAuthButtons from "@/components/auth/social-auth-buttons";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { isEmailTakenError } from "@/lib/auth-errors";
import { evaluatePasswordRules } from "@/lib/password-rules";
import { resolveAuthRedirect } from "@/lib/profiles";
import type { UserRole } from "@/types/api";
import { UI } from "@/lib/ui-classes";

type Props = {
    redirect?: string | null;
    oauthError?: string | null;
    defaultRole?: UserRole;
    onSwitchToLogin?: () => void;
    onSuccess?: (destination: string) => void;
};

export default function RegisterForm({
    redirect = "/",
    oauthError,
    defaultRole,
    onSwitchToLogin,
    onSuccess,
}: Props) {
    const { register } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<UserRole>(defaultRole ?? "contractor");
    const [fullname, setFullname] = useState("");
    const [phone, setPhone] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formAlert, setFormAlert] = useState<{ title: string; description: string } | null>(null);
    const [passwordError, setPasswordError] = useState("");

    const passwordEvaluation = evaluatePasswordRules(password, confirmPassword);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setFormAlert(null);
        setPasswordError("");

        if (!passwordEvaluation.isValid) {
            let msg = "La contraseña debe cumplir con todos los parámetros de seguridad.";
            if (!passwordEvaluation.minLength || !passwordEvaluation.maxLength) {
                msg = "La contraseña debe tener entre 8 y 64 caracteres.";
            } else if (!passwordEvaluation.matchesConfirm) {
                msg = "Las contraseñas no coinciden.";
            }
            setPasswordError(msg);
            setFormAlert({
                title: "Error de contraseña",
                description: msg,
            });
            addToast({
                title: "Error de contraseña",
                description: msg,
                color: "danger",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const payload: any = {
                email: email.trim(),
                password,
                role,
                accepted_terms: acceptedTerms,
            };

            if (role === "contractor") {
                payload.fullname = fullname.trim();
                payload.phone = phone.trim();
            }

            const registered = await register(payload);
            let destination = resolveAuthRedirect(
                registered.role,
                redirect,
                registered.is_verified,
            );

            if (registered.role === "musician") {
                destination = "/musician/onboarding";
            }

            addToast({
                title: "Cuenta creada",
                description:
                    "Te enviamos un correo para verificar tu cuenta. Revisa tu bandeja de entrada.",
                color: "success",
            });
            addToast({
                title:
                    registered.role === "musician"
                        ? "Siguiente paso: completa tu perfil de músico"
                        : "Siguiente paso: completa tu perfil de contratista",
                color: "primary",
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
                    : "No se pudo completar el registro. Intenta de nuevo.";
            const isEmailTaken = isEmailTakenError(raw);

            if (isEmailTaken) {
                const desc = "No se puede utilizar este correo porque ya está en uso.";
                setFormAlert({
                    title: "Correo no disponible",
                    description: desc,
                });
                addToast({
                    title: "Correo no disponible",
                    description: desc,
                    color: "danger",
                });
            } else {
                setFormAlert({
                    title: "Error al registrarse",
                    description: raw,
                });
                addToast({
                    title: "Error al registrarse",
                    description: raw,
                    color: "danger",
                });
            }
            setIsSubmitting(false);
        }
    }

    const passwordsDoNotMatch = Boolean(
        confirmPassword && password && confirmPassword !== password,
    );

    return (
        <div className="flex flex-col gap-4">
            {oauthError ? (
                <p className="text-sm text-danger rounded-xl bg-danger/10 px-3 py-2 leading-relaxed">
                    {oauthError === "google_not_configured"
                        ? "El registro con Google requiere configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor. Puedes crear tu cuenta con correo y contraseña."
                        : oauthError === "access_denied"
                          ? "Acceso cancelado en Google. Intenta nuevamente si deseas registrarte con tu cuenta."
                          : "No se pudo completar el registro social. Intenta de nuevo o ingresa con tu correo."}
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
                {formAlert ? (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50/90 p-3.5 text-danger-800 dark:border-danger-900/40 dark:bg-danger-950/40 dark:text-danger-200 shadow-sm"
                    >
                        <Icon icon="solar:danger-triangle-bold" className="mt-0.5 text-lg shrink-0 text-danger-600 dark:text-danger-400" />
                        <div className="flex-1 text-sm">
                            <p className="font-semibold">{formAlert.title}</p>
                            <p className="mt-0.5 text-xs opacity-90">{formAlert.description}</p>
                        </div>
                    </div>
                ) : null}

                <RadioGroup
                    label="Quiero registrarme como"
                    value={role}
                    onValueChange={(value) => {
                        setRole(value as UserRole);
                        setPasswordError("");
                        setFormAlert(null);
                    }}
                    orientation="horizontal"
                    isRequired
                    classNames={{
                        base: "w-full",
                        wrapper: "grid grid-cols-2 gap-2 sm:gap-2.5",
                        label: "text-xs font-semibold text-foreground/80 mb-1",
                    }}
                >
                    <Radio
                        value="contractor"
                        classNames={{
                            base: "inline-flex m-0 max-w-full w-full bg-content2/50 hover:bg-content2 items-center justify-between flex-row-reverse cursor-pointer rounded-2xl gap-2 p-2.5 border-2 border-default-200/60 data-[selected=true]:border-primary data-[selected=true]:bg-primary/10 transition-all",
                            labelWrapper: "ml-0 flex-1",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    role === "contractor"
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "bg-default-200/70 text-default-600"
                                }`}
                            >
                                <Icon icon="material-symbols:business-center-rounded" className="text-lg" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-xs font-bold leading-tight text-foreground">
                                    Contratista
                                </span>
                                <span className="text-[10px] text-default-500 leading-tight">
                                    Busco mariachis
                                </span>
                            </div>
                        </div>
                    </Radio>

                    <Radio
                        value="musician"
                        classNames={{
                            base: "inline-flex m-0 max-w-full w-full bg-content2/50 hover:bg-content2 items-center justify-between flex-row-reverse cursor-pointer rounded-2xl gap-2 p-2.5 border-2 border-default-200/60 data-[selected=true]:border-primary data-[selected=true]:bg-primary/10 transition-all",
                            labelWrapper: "ml-0 flex-1",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    role === "musician"
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "bg-default-200/70 text-default-600"
                                }`}
                            >
                                <Icon icon="material-symbols:music-note-rounded" className="text-lg" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-xs font-bold leading-tight text-foreground">
                                    Músico
                                </span>
                                <span className="text-[10px] text-default-500 leading-tight">
                                    Ofrezco música
                                </span>
                            </div>
                        </div>
                    </Radio>
                </RadioGroup>

                <Input
                    label="Correo electrónico"
                    type="email"
                    placeholder="tu@email.com"
                    variant="bordered"
                    value={email}
                    onValueChange={(val) => {
                        setEmail(val);
                        setFormAlert(null);
                    }}
                    isRequired
                    autoComplete="email"
                    classNames={UI.authInput}
                />

                {role === "contractor" && (
                    <>
                        <Input
                            label="Nombre completo"
                            type="text"
                            placeholder="Ej. Juan Pérez"
                            variant="bordered"
                            value={fullname}
                            onValueChange={(val) => {
                                setFullname(val);
                                setFormAlert(null);
                            }}
                            isRequired
                            autoComplete="name"
                            classNames={UI.authInput}
                        />
                        <Input
                            label="Número de celular"
                            type="tel"
                            placeholder="Ej. 987654321"
                            variant="bordered"
                            value={phone}
                            onValueChange={(val) => {
                                setPhone(val);
                                setFormAlert(null);
                            }}
                            isRequired
                            autoComplete="tel"
                            classNames={UI.authInput}
                        />
                    </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <PasswordInput
                        label="Contraseña"
                        placeholder="••••••••"
                        variant="bordered"
                        value={password}
                        onValueChange={(val) => {
                            setPassword(val);
                            setPasswordError("");
                            setFormAlert(null);
                        }}
                        isRequired
                        autoComplete="new-password"
                        classNames={UI.authInput}
                    />

                    <PasswordInput
                        label="Validar contraseña"
                        placeholder="••••••••"
                        variant="bordered"
                        value={confirmPassword}
                        onValueChange={(val) => {
                            setConfirmPassword(val);
                            setPasswordError("");
                            setFormAlert(null);
                        }}
                        isRequired
                        autoComplete="new-password"
                        isInvalid={passwordsDoNotMatch || Boolean(passwordError)}
                        errorMessage={
                            passwordsDoNotMatch
                                ? "Las contraseñas no coinciden"
                                : passwordError
                        }
                        classNames={UI.authInput}
                    />
                </div>

                <PasswordRequirementsChecklist
                    password={password}
                    confirmPassword={confirmPassword}
                    showMatch={true}
                    showStrengthBar={true}
                />

                <Checkbox
                    isSelected={acceptedTerms}
                    onValueChange={setAcceptedTerms}
                    classNames={{ label: "text-sm leading-relaxed" }}
                >
                    Acepto los{" "}
                    <Link
                        href="/legal/terminos"
                        target="_blank"
                        className="text-primary underline underline-offset-2"
                    >
                        Términos y Condiciones
                    </Link>{" "}
                    y la{" "}
                    <Link
                        href="/legal/privacidad"
                        target="_blank"
                        className="text-primary underline underline-offset-2"
                    >
                        Política de Privacidad
                    </Link>{" "}
                    de Chivapp.
                </Checkbox>

                <Button
                    type="submit"
                    color="primary"
                    radius="lg"
                    className="font-semibold shadow-glow hover:shadow-glow-lg transition-shadow"
                    isLoading={isSubmitting}
                    isDisabled={!acceptedTerms || !passwordEvaluation.isValid}
                >
                    Crear cuenta
                </Button>
            </form>
            {onSwitchToLogin ? (
                <p className="text-sm text-default-500 text-center">
                    ¿Ya tienes cuenta?{" "}
                    <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="font-semibold text-foreground hover:text-secondary transition-colors"
                    >
                        Inicia sesión
                    </button>
                </p>
            ) : null}
        </div>
    );
}
