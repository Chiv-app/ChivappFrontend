"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, Chip, Input, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    disableBookingShare,
    enableBookingShare,
    getBookingShare,
} from "@/lib/booking-share";
import type { BookingOut, BookingShareOut } from "@/types/api";

type Props = {
    booking: BookingOut;
};

function absoluteShareUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (typeof window !== "undefined") {
        return `${window.location.origin}${path}`;
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    return siteUrl ? `${siteUrl}${path}` : path;
}

export default function BookingShareCard({ booking }: Props) {
    const [share, setShare] = useState<BookingShareOut | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isWorking, setIsWorking] = useState(false);

    const refresh = useCallback(() => {
        return getBookingShare(booking.id)
            .then(setShare)
            .catch(() => setShare(null));
    }, [booking.id]);

    useEffect(() => {
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
        });

        refresh().finally(() => {
            if (!cancelled) setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [booking.id, booking.status, refresh]);

    async function handleEnable() {
        setIsWorking(true);
        try {
            const data = await enableBookingShare(booking.id);
            setShare(data);
            addToast({
                title: "Enlace listo",
                description: "Ya puedes compartirlo con tus invitados.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo habilitar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsWorking(false);
        }
    }

    async function handleDisable() {
        setIsWorking(true);
        try {
            const data = await disableBookingShare(booking.id);
            setShare(data);
            addToast({
                title: "Compartir cancelado",
                description: "El enlace dejó de funcionar para los invitados.",
                color: "warning",
            });
        } catch (error) {
            addToast({
                title: "No se pudo cancelar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsWorking(false);
        }
    }

    async function handleCopy() {
        const url = absoluteShareUrl(share?.path);
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            addToast({ title: "Enlace copiado", color: "success" });
        } catch {
            addToast({
                title: "No se pudo copiar",
                description: "Copia el enlace manualmente.",
                color: "warning",
            });
        }
    }

    async function handleNativeShare() {
        const url = absoluteShareUrl(share?.path);
        if (!url) return;
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: `Invitación · ${booking.event_type}`,
                    text: "Únete al timeline del show y deja tu reacción.",
                    url,
                });
                return;
            } catch {
                // fall through to copy
            }
        }
        await handleCopy();
    }

    if (isLoading) {
        return <div className="h-36 rounded-2xl bg-default-100 animate-pulse" />;
    }

    if (!share) return null;

    const locked =
        booking.status === "completed" || booking.status === "cancelled";
    const url = absoluteShareUrl(share.path);
    const canShowActions = share.can_enable || share.enabled;

    if (!canShowActions && !share.reason && !locked) {
        return null;
    }

    return (
        <Card
            className={`border overflow-hidden shadow-soft ${
                share.enabled
                    ? "border-primary/30"
                    : locked
                      ? "border-default-200"
                      : "border-default-200"
            }`}
        >
            <div className="bg-gradient-to-br from-primary/12 via-primary/5 to-transparent px-6 py-5">
                <Chip
                    color={share.enabled ? "primary" : locked ? "default" : "warning"}
                    variant="flat"
                    size="sm"
                    className="mb-3"
                >
                    {share.enabled
                        ? "Enlace activo"
                        : locked
                          ? "Compartir cerrado"
                          : "Invitados"}
                </Chip>
                <h3 className="text-xl font-bold text-foreground">
                    Compartir con invitados
                </h3>
                <p className="text-sm text-default-600 mt-2 max-w-2xl">
                    {locked
                        ? "La reserva finalizó. El enlace de invitados quedó cancelado."
                        : share.enabled
                          ? "Los invitados entran solo con su nombre y pueden reaccionar en el timeline del show."
                          : share.can_enable
                            ? "La reserva está pagada y confirmada. Genera un enlace para que tus invitados vean el evento y publiquen reacciones."
                            : share.reason ||
                              "Disponible cuando la reserva esté pagada y confirmada."}
                </p>
            </div>

            <CardBody className="gap-4 p-6">
                {share.enabled && url ? (
                    <>
                        <Input
                            label="Enlace para invitados"
                            value={url}
                            isReadOnly
                            variant="bordered"
                            endContent={
                                <Button
                                    size="sm"
                                    variant="flat"
                                    radius="lg"
                                    onPress={handleCopy}
                                >
                                    Copiar
                                </Button>
                            }
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                color="primary"
                                radius="lg"
                                className="font-semibold"
                                isLoading={isWorking}
                                onPress={handleNativeShare}
                                startContent={
                                    <Icon icon="material-symbols:share" width={18} />
                                }
                            >
                                Compartir
                            </Button>
                            <Button
                                color="danger"
                                variant="flat"
                                radius="lg"
                                isLoading={isWorking}
                                onPress={handleDisable}
                                startContent={
                                    <Icon icon="material-symbols:link-off" width={18} />
                                }
                            >
                                Cancelar enlace
                            </Button>
                        </div>
                    </>
                ) : null}

                {!share.enabled && share.can_enable ? (
                    <Button
                        color="primary"
                        radius="lg"
                        className="font-semibold w-fit"
                        isLoading={isWorking}
                        onPress={handleEnable}
                        startContent={
                            <Icon icon="material-symbols:share" width={18} />
                        }
                    >
                        Generar enlace para invitados
                    </Button>
                ) : null}

                {!share.enabled && !share.can_enable && share.reason ? (
                    <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                        <p className="text-sm text-default-600">{share.reason}</p>
                    </div>
                ) : null}
            </CardBody>
        </Card>
    );
}
