"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody } from "@heroui/react";
import { useAuth } from "@/contexts/auth-context";
import { useIsClient } from "@/hooks/use-is-client";
import {
    getContractorProfileStatus,
    getMusicianProfileStatus,
} from "@/lib/profiles";
import type { ProfileValidationOut } from "@/types/api";

function shouldShowBanner(validation: ProfileValidationOut): boolean {
    if (validation.status === "pending_review" || validation.status === "rejected") {
        return true;
    }

    // Ya verificado: no bloquear con el banner de verificación.
    if (validation.status === "published" && validation.is_public) {
        return false;
    }

    if (!validation.can_submit) {
        return true;
    }

    return !validation.is_public;
}

export default function ProfileCompletionBanner() {
    const isClient = useIsClient();
    const { user, isLoading } = useAuth();
    const [validation, setValidation] = useState<ProfileValidationOut | null>(null);
    const [statusError, setStatusError] = useState(false);

    useEffect(() => {
        if (!isClient || isLoading || !user) return;

        if (user.role === "musician") {
            getMusicianProfileStatus()
                .then((data) => {
                    setValidation(data);
                    setStatusError(false);
                })
                .catch(() => {
                    setValidation(null);
                    setStatusError(true);
                });
            return;
        }

        if (user.role === "contractor") {
            getContractorProfileStatus()
                .then((data) => {
                    setValidation(data);
                    setStatusError(false);
                })
                .catch(() => {
                    setValidation(null);
                    setStatusError(true);
                });
        }
    }, [user, isLoading, isClient]);

    // SSR + hydration: always empty so late auth resolution cannot mismatch HTML.
    if (!isClient || isLoading || !user || user.role === "admin") {
        return null;
    }

    const profileHref =
        user.role === "musician" ? "/musician/profile" : "/contractor/profile";

    if (statusError) {
        return (
            <section className="mb-6 sm:mb-8">
                <Card className="border border-danger/30 bg-danger/10 shadow-soft">
                    <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-6">
                        <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm sm:text-base">
                                No pudimos cargar el estado de tu perfil
                            </p>
                            <p className="text-sm text-default-600 mt-1 text-pretty">
                                Entra a tu panel para completar o revisar tu información.
                            </p>
                        </div>
                        <Button
                            as={Link}
                            href={profileHref}
                            color="primary"
                            radius="lg"
                            className="w-full sm:w-auto shrink-0"
                        >
                            Ir a mi perfil
                        </Button>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (!validation || !shouldShowBanner(validation)) {
        return null;
    }

    const completed = validation.steps.filter((step) => step.completed).length;
    const total = validation.steps.length;

    return (
        <section className="mb-6 sm:mb-8">
            <Card className="border border-warning/30 bg-warning/10 shadow-soft">
                <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-6">
                    <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm sm:text-base">
                            {user.role === "musician"
                                ? "Completa tu perfil de músico (0 % comisión — cobras el 100 % de tu tarifa)"
                                : "Completa tu verificación de contratista"}
                        </p>
                        <p className="text-sm text-default-600 mt-1 text-pretty">
                            Llevas {completed} de {total} pasos listos.
                            {validation.status === "pending_review"
                                ? " Tu perfil está en revisión (plazo estimado: 24–48 h hábiles). Recibirás un correo en cuanto sea aprobado."
                                : validation.status === "rejected"
                                  ? " Tu perfil fue rechazado; revisa los comentarios y reenvíalo."
                                  : validation.is_public
                                    ? " Tu perfil está publicado, pero faltan requisitos nuevos por completar."
                                    : " Termina los pasos pendientes y envíalo a revisión (24–48 h hábiles)."}
                        </p>
                    </div>
                    <Button
                        as={Link}
                        href={profileHref}
                        color="warning"
                        radius="lg"
                        className="font-semibold w-full sm:w-auto shrink-0"
                    >
                        {validation.status === "pending_review"
                            ? "Ver estado"
                            : "Continuar perfil"}
                    </Button>
                </CardBody>
            </Card>
        </section>
    );
}
