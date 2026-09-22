"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Chip, Input, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import AppLogo from "@/components/layout/app-logo";
import { ApiError } from "@/lib/api";
import {
    previewBookingMemberInvite,
    previewPasswordSetup,
    respondBookingMemberInvite,
} from "@/lib/ensemble-members";
import { UI } from "@/lib/ui-classes";
import type { BookingMemberInvitePreviewOut } from "@/types/api";

type Props = {
    params: Promise<{ token: string }>;
};

export default function MemberInviteRespondPage({ params }: Props) {
    const { token } = use(params);
    const router = useRouter();
    const [preview, setPreview] = useState<BookingMemberInvitePreviewOut | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isWorking, setIsWorking] = useState<"accept" | "decline" | null>(null);
    const [password, setPassword] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function resolveInvite() {
            try {
                const data = await previewBookingMemberInvite(token);
                if (!cancelled) setPreview(data);
                return;
            } catch (bookingErr) {
                // Enlaces antiguos o mal copiados de "crear contraseña" a veces
                // apuntan aquí; redirigir al flujo correcto si el token es de setup.
                try {
                    await previewPasswordSetup(token);
                    if (!cancelled) {
                        router.replace(
                            `/set-password?token=${encodeURIComponent(token)}`,
                        );
                    }
                    return;
                } catch {
                    if (!cancelled) {
                        setError(
                            bookingErr instanceof ApiError
                                ? bookingErr.message
                                : "No se encontró la convocatoria",
                        );
                    }
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void resolveInvite();
        return () => {
            cancelled = true;
        };
    }, [token, router]);

    async function respond(action: "accept" | "decline") {
        if (action === "accept" && preview?.needs_password && password.length < 8) {
            addToast({
                title: "Contraseña inválida",
                description: "La contraseña debe tener al menos 8 caracteres.",
                color: "warning",
            });
            return;
        }
        setIsWorking(action);
        try {
            const updated = await respondBookingMemberInvite(token, action, action === "accept" && preview?.needs_password ? password : undefined);
            setPreview(updated);
            addToast({
                title: action === "accept" ? "Asistencia confirmada" : "Convocatoria rechazada",
                color: action === "accept" ? "success" : "warning",
            });
        } catch (err) {
            addToast({
                title: "No se pudo registrar tu respuesta",
                description:
                    err instanceof ApiError ? err.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsWorking(null);
        }
    }

    return (
        <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 py-10">
            <Link href="/" aria-label="Chivapp" className="mb-6">
                <AppLogo height={34} />
            </Link>

            {isLoading ? (
                <div className="w-full max-w-md h-72 rounded-4xl border border-default-200 bg-content1 animate-pulse" />
            ) : error || !preview ? (
                <Card className="w-full max-w-md border border-danger/30 shadow-soft">
                    <CardBody className="gap-3 p-6">
                        <Chip color="danger" variant="flat" className="w-fit">
                            Enlace inválido
                        </Chip>
                        <h1 className="text-xl font-bold">Convocatoria no disponible</h1>
                        <p className="text-sm text-default-600">
                            {error || "Pide un nuevo enlace al líder de tu agrupación."}
                        </p>
                    </CardBody>
                </Card>
            ) : (
                <Card className="w-full max-w-md border border-default-200/70 shadow-soft">
                    <CardBody className="gap-5 p-6">
                        <div>
                            <Chip
                                color={
                                    preview.status === "accepted"
                                        ? "success"
                                        : preview.status === "declined"
                                          ? "danger"
                                          : "primary"
                                }
                                variant="flat"
                                size="sm"
                                className="mb-3"
                            >
                                {preview.status === "accepted"
                                    ? "Aceptada"
                                    : preview.status === "declined"
                                      ? "Rechazada"
                                      : "Pendiente"}
                            </Chip>
                            <h1 className="text-2xl font-bold text-foreground">
                                {preview.event_type}
                            </h1>
                            <p className="text-sm text-default-500 mt-1">
                                Hola {preview.member_fullname}. {preview.leader_name} te
                                convocó a este show.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-default-100 px-4 py-3 text-sm flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Icon icon="material-symbols:calendar-month" width={18} />
                                <span>
                                    {preview.event_date}
                                    {preview.start_time
                                        ? ` · ${String(preview.start_time).slice(0, 5)}`
                                        : ""}
                                </span>
                            </div>
                            {(preview.location_address || preview.location_city) && (
                                <div className="flex items-start gap-2">
                                    <Icon
                                        icon="material-symbols:location-on"
                                        width={18}
                                        className="mt-0.5"
                                    />
                                    <span>
                                        {[preview.location_address, preview.location_city]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </span>
                                </div>
                            )}
                        </div>

                        {preview.can_respond ? (
                            <div className="flex flex-col gap-4">
                                {preview.needs_password && (
                                    <div className="bg-primary-50 text-primary-800 p-4 rounded-xl text-sm mb-2">
                                        <p className="font-semibold mb-2">Crea tu contraseña para aceptar</p>
                                        <p className="opacity-90 mb-4">Para confirmar tu asistencia y acceder a tu perfil en Chivapp, necesitas crear una contraseña.</p>
                                        <Input
                                            type="password"
                                            label="Nueva contraseña"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            variant="bordered"
                                            color="primary"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                <Button
                                    color="danger"
                                    variant="flat"
                                    radius="lg"
                                    isLoading={isWorking === "decline"}
                                    isDisabled={isWorking === "accept"}
                                    onPress={() => respond("decline")}
                                >
                                    Rechazar
                                </Button>
                                <Button
                                    color="success"
                                    radius="lg"
                                    className={UI.primaryButton}
                                    isLoading={isWorking === "accept"}
                                    isDisabled={isWorking === "decline"}
                                    onPress={() => respond("accept")}
                                >
                                    Aceptar
                                </Button>
                            </div>
                            </div>
                        ) : (
                            <p className="text-sm text-default-600 text-center">
                                Tu respuesta ya quedó registrada para el líder.
                            </p>
                        )}
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
