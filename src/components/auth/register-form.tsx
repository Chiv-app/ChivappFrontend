"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Button,
    Checkbox,
    Divider,
    Input,
    addToast,
    Form,
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
import type { UserRole, RegisterRequest } from "@/types/api";
import { UI } from "@/lib/ui-classes";

type Props = {
    redirect?: string | null;
    oauthError?: string | null;
    defaultRole?: UserRole;
    onSuccess?: (destination: string) => void;
};

export default function RegisterForm({
    redirect = "/",
    oauthError,
    defaultRole,
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
            const payload: RegisterRequest = {
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
                <p role="alert" className="text-sm text-danger-text rounded-xl bg-danger/10 px-3 py-2 leading-relaxed">
                    {oauthError === "google_not_configured"
                        ? "El registro con Google no está disponible en este momento. Puedes crear tu cuenta con correo y contraseña."
                        : oauthError === "access_denied"
                          ? "Acceso cancelado en Google. Intenta nuevamente si deseas registrarte con tu cuenta."
                          : "No se pudo completar el registro social. Intenta de nuevo o ingresa con tu correo."}
                </p>
            ) : null}
            <SocialAuthButtons intent="login" />
            <div className="flex items-center gap-3">
                <Divider className="flex-1" />
                <span className="text-xs font-medium text-default-500">
                    O con correo
                </span>
                <Divider className="flex-1" />
            </div>
            <Form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full" validationBehavior="native">
                {formAlert ? (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-danger-text shadow-sm"
                    >
                        <Icon icon="solar:danger-triangle-bold" className="mt-0.5 text-lg shrink-0 text-danger-text" />
                        <div className="flex-1 text-sm">
                            <p className="font-semibold">{formAlert.title}</p>
                            <p className="mt-0.5 text-xs opacity-90">{formAlert.description}</p>
                        </div>
                    </div>
                ) : null}

                <div
                    role="group"
                    aria-label="Tipo de cuenta"
                    className="flex bg-transparent border border-default-200/50 p-1 rounded-md w-full"
                >
                    <button
                        type="button"
                        aria-pressed={role === "contractor"}
                        onClick={() => {
                            setRole("contractor");
                            setPasswordError("");
                            setFormAlert(null);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 min-h-11 rounded-sm text-xs font-semibold transition-colors ${role === "contractor" ? "bg-default-200/60 text-foreground shadow-md" : "text-default-500 hover:text-default-700"}`}
                    >
                        <Icon icon="lucide:party-popper" /> Busco músicos
                    </button>
                    <button
                        type="button"
                        aria-pressed={role === "musician"}
                        onClick={() => {
                            setRole("musician");
                            setPasswordError("");
                            setFormAlert(null);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 min-h-11 rounded-sm text-xs font-semibold transition-colors ${role === "musician" ? "bg-default-200/60 text-foreground shadow-md" : "text-default-500 hover:text-default-700"}`}
                    >
                        <Icon icon="lucide:music" /> Soy músico
                    </button>
                </div>

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
                        setFormAlert(null);
                    }}
                    isRequired
                    autoComplete="email"
                    startContent={<Icon icon="lucide:mail" className="text-default-400" width={18} />}
                    classNames={{
                        ...UI.authInput,
                        inputWrapper: "bg-transparent border-default-200/50 shadow-none",
                    }}
                />

                {role === "contractor" && (
                    <>
                        <Input
                            label="Nombre completo"
                            labelPlacement="outside"
                            placeholder="Nombre y apellido"
                            type="text"
                            variant="bordered"
                            radius="md"
                            size="lg"
                            value={fullname}
                            onValueChange={(val) => {
                                setFullname(val);
                                setFormAlert(null);
                            }}
                            isRequired
                            autoComplete="name"
                            startContent={<Icon icon="lucide:user" className="text-default-400" width={18} />}
                            classNames={{
                                ...UI.authInput,
                                inputWrapper: "bg-transparent border-default-200/50 shadow-none",
                            }}
                        />
                        <Input
                            label="Número de celular"
                            labelPlacement="outside"
                            placeholder="Ej. 999 888 777"
                            type="tel"
                            inputMode="tel"
                            variant="bordered"
                            radius="md"
                            size="lg"
                            value={phone}
                            onValueChange={(val) => {
                                setPhone(val);
                                setFormAlert(null);
                            }}
                            isRequired
                            autoComplete="tel"
                            startContent={<Icon icon="lucide:phone" className="text-default-400" width={18} />}
                            classNames={{
                                ...UI.authInput,
                                inputWrapper: "bg-transparent border-default-200/50 shadow-none",
                            }}
                        />
                    </>
                )}

                <PasswordInput
                    label="Contraseña"
                    labelPlacement="outside"
                    placeholder="Crea una contraseña"
                    variant="bordered"
                    radius="md"
                    size="lg"
                    value={password}
                    onValueChange={(val) => {
                        setPassword(val);
                        setPasswordError("");
                        setFormAlert(null);
                    }}
                    isRequired
                    autoComplete="new-password"
                    startContent={<Icon icon="lucide:lock" className="text-default-400" width={18} />}
                    classNames={{
                        ...UI.authInput,
                        inputWrapper: "bg-transparent border-default-200/50 shadow-none",
                    }}
                />

                <PasswordInput
                    label="Repetir contraseña"
                    labelPlacement="outside"
                    placeholder="Repite tu contraseña"
                    variant="bordered"
                    radius="md"
                    size="lg"
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
                    startContent={<Icon icon="lucide:lock" className="text-default-400" width={18} />}
                    classNames={{
                        ...UI.authInput,
                        inputWrapper: "bg-transparent border-default-200/50 shadow-none",
                    }}
                />

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
                        Términos y condiciones
                    </Link>{" "}
                    y la{" "}
                    <Link
                        href="/legal/privacidad"
                        target="_blank"
                        className="text-primary underline underline-offset-2"
                    >
                        Política de privacidad
                    </Link>{" "}
                    de Chivapp.
                </Checkbox>

                <Button
                    type="submit"
                    color="primary"
                    radius="full"
                    size="lg"
                    className="font-bold shadow-lg w-full mt-2 hover:opacity-90 transition-opacity"
                    isLoading={isSubmitting}
                    isDisabled={!acceptedTerms || !passwordEvaluation.isValid}
                >
                    Crear cuenta gratis
                </Button>
                {(!acceptedTerms || !passwordEvaluation.isValid) && (
                    <p className="text-xs text-default-500 text-center">
                        {!passwordEvaluation.isValid && !acceptedTerms
                            ? "Completa los requisitos de contraseña y acepta los términos para activar el botón."
                            : !passwordEvaluation.isValid
                              ? "Completa los requisitos de contraseña para continuar."
                              : "Acepta los términos y condiciones para continuar."}
                    </p>
                )}
            </Form>
        </div>
    );
}
