"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Input,
    Radio,
    RadioGroup,
    addToast,
} from "@heroui/react";
import { useAuth } from "@/contexts/auth-context";
import { buildAuthModalUrl } from "@/contexts/auth-modal-context";
import { ApiError } from "@/lib/api";
import { completeOAuthRegistration, getOAuthPending } from "@/lib/auth";
import { getPostLoginPath } from "@/lib/profiles";
import { UI } from "@/lib/ui-classes";
import type { UserRole } from "@/types/api";

export default function CompleteRolePage() {
    const router = useRouter();
    const { refresh } = useAuth();
    const [fullname, setFullname] = useState("");
    const [email, setEmail] = useState<string | null>(null);
    const [provider, setProvider] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState<Extract<UserRole, "musician" | "contractor">>(
        "contractor",
    );
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        void (async () => {
            try {
                const pending = await getOAuthPending();
                setFullname(pending.fullname);
                setEmail(pending.email);
                setProvider(pending.provider);
            } catch {
                router.replace(
                    buildAuthModalUrl("login", { oauthError: "pending_expired" }),
                );
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const user = await completeOAuthRegistration({
                role,
                phone: phone.trim() || null,
            });
            await refresh();
            addToast({
                title: "Cuenta lista",
                description: "Completa tu perfil para empezar a usar Chivapp.",
                color: "success",
            });
            // El músico recién creado va directo a la guía de perfil; el contratante, al inicio.
            router.replace(
                user.role === "musician"
                    ? "/musician/onboarding"
                    : getPostLoginPath(user.role, user.is_verified),
            );
            router.refresh();
        } catch (error) {
            addToast({
                title: "No se pudo completar el registro",
                description:
                    error instanceof ApiError
                        ? error.message
                        : "Intenta iniciar sesión social de nuevo.",
                color: "danger",
            });
            setIsSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="w-full max-w-md h-80 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
        );
    }

    return (
        <Card className="w-full max-w-md border border-default-200/70 shadow-elevated">
            <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Elige tu rol
                </h1>
                <p className="text-sm text-default-500">
                    Continúas con {provider || "tu cuenta social"}
                    {email ? ` (${email})` : ""}.
                </p>
            </CardHeader>
            <CardBody className="gap-4 px-6 pb-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        label="Nombre"
                        value={fullname}
                        isReadOnly
                        variant="bordered"
                        classNames={UI.authInput}
                    />
                    <RadioGroup
                        label="¿Cómo usarás Chivapp?"
                        value={role}
                        onValueChange={(value) =>
                            setRole(value as "musician" | "contractor")
                        }
                    >
                        <Radio value="contractor">Quiero contratar músicos</Radio>
                        <Radio value="musician">Soy músico / agrupación</Radio>
                    </RadioGroup>
                    <Input
                        label="Teléfono (opcional)"
                        value={phone}
                        onValueChange={setPhone}
                        variant="bordered"
                        classNames={UI.authInput}
                    />
                    <Button
                        type="submit"
                        color="primary"
                        radius="lg"
                        className="font-semibold"
                        isLoading={isSubmitting}
                    >
                        Continuar
                    </Button>
                </form>
            </CardBody>
        </Card>
    );
}
