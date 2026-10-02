"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardBody, Chip, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { LiveMapPoint } from "@/components/booking/live-location-map-inner";
import {
    getLiveLocation,
    readDevicePosition,
    refreshLiveLocation,
    requestLiveLocation,
    shareLiveLocation,
    stopLiveLocation,
    stopLiveLocationBeacon,
    updateLiveLocation,
    watchDevicePosition,
} from "@/lib/booking-location";
import type {
    LiveLocationParticipantOut,
    LiveLocationSessionOut,
    UserRole,
} from "@/types/api";

type Role = Extract<UserRole, "musician" | "contractor">;

type Props = {
    bookingId: string;
    role: Role;
};

const LiveLocationMapInner = dynamic(
    () => import("@/components/booking/live-location-map-inner"),
    {
        ssr: false,
        loading: () => (
            <div className="h-64 sm:h-80 rounded-2xl border border-default-200 bg-default-100 animate-pulse" />
        ),
    },
);

const PARTICIPANT_COLORS = [
    "#2563eb",
    "#059669",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#0891b2",
    "#4f46e5",
];

function roleLabel(role: string): string {
    if (role === "leader") return "Líder";
    if (role === "member") return "Integrante";
    if (role === "contractor") return "Contratista";
    return role;
}

function participantColor(
    participant: LiveLocationParticipantOut,
    index: number,
): string {
    if (participant.is_me) return "#2563eb";
    return PARTICIPANT_COLORS[(index + 1) % PARTICIPANT_COLORS.length];
}

export default function BookingLiveLocationCard({ bookingId }: Props) {
    const [session, setSession] = useState<LiveLocationSessionOut | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);
    const sharingRef = useRef(false);

    const loadSession = useCallback(async () => {
        const data = await getLiveLocation(bookingId);
        setSession(data);
        sharingRef.current = data.me.sharing;
        return data;
    }, [bookingId]);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        loadSession()
            .catch((error) => {
                if (!cancelled) {
                    addToast({
                        title: "Ubicación",
                        description:
                            error instanceof Error
                                ? error.message
                                : "No se pudo cargar la sesión de ubicación.",
                        color: "danger",
                    });
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [loadSession]);

    // Poll mientras alguien comparte.
    useEffect(() => {
        if (!session || session.sharing_count <= 0) return;
        const id = window.setInterval(() => {
            void loadSession().catch(() => undefined);
        }, 8000);
        return () => window.clearInterval(id);
    }, [session?.sharing_count, loadSession]);

    // Heartbeat GPS mientras yo comparto (mantiene viva la sesión).
    useEffect(() => {
        if (!session?.me.sharing) return;
        let lastSentAt = 0;
        const stopWatch = watchDevicePosition(
            (coords) => {
                const now = Date.now();
                if (now - lastSentAt < 10000) return;
                lastSentAt = now;
                void updateLiveLocation(bookingId, coords)
                    .then((data) => {
                        setSession(data);
                        sharingRef.current = data.me.sharing;
                    })
                    .catch(() => undefined);
            },
            () => undefined,
        );
        return () => stopWatch();
    }, [session?.me.sharing, bookingId]);

    // Al cerrar pestaña/app: detener compartir (hay que volver a solicitar).
    useEffect(() => {
        function handleUnload() {
            if (!sharingRef.current) return;
            stopLiveLocationBeacon(bookingId);
            sharingRef.current = false;
        }
        function handleVisibility() {
            if (document.visibilityState === "hidden" && sharingRef.current) {
                // Soft reset on long background; beacon on pagehide is stronger.
            }
        }
        window.addEventListener("pagehide", handleUnload);
        window.addEventListener("beforeunload", handleUnload);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.removeEventListener("pagehide", handleUnload);
            window.removeEventListener("beforeunload", handleUnload);
            document.removeEventListener("visibilitychange", handleVisibility);
            if (sharingRef.current) {
                stopLiveLocationBeacon(bookingId);
                sharingRef.current = false;
            }
        };
    }, [bookingId]);

    const points = useMemo(() => {
        if (!session) return [] as LiveMapPoint[];
        const list: LiveMapPoint[] = [];
        if (session.event.lat != null && session.event.lng != null) {
            list.push({
                key: "event",
                lat: session.event.lat,
                lng: session.event.lng,
                label: "Punto del evento",
                color: "#b45309",
            });
        }
        session.participants.forEach((participant, index) => {
            if (
                !participant.visible ||
                participant.lat == null ||
                participant.lng == null
            ) {
                return;
            }
            list.push({
                key: participant.user_id,
                lat: participant.lat,
                lng: participant.lng,
                label: participant.is_me
                    ? `Tú · ${participant.display_name}`
                    : `${participant.display_name} · ${roleLabel(participant.role)}`,
                color: participantColor(participant, index),
            });
        });
        return list;
    }, [session]);

    async function withBusy(action: () => Promise<void>) {
        setIsBusy(true);
        try {
            await action();
        } finally {
            setIsBusy(false);
        }
    }

    async function handleShare() {
        await withBusy(async () => {
            try {
                const coords = await readDevicePosition();
                const data = await shareLiveLocation(bookingId, coords);
                setSession(data);
                sharingRef.current = data.me.sharing;
                addToast({
                    title: "Ubicación compartida",
                    description:
                        "Tu posición aparece en el mapa. Si cierras la app, deberás compartir de nuevo.",
                    color: "success",
                });
            } catch (error) {
                addToast({
                    title: "No se pudo compartir",
                    description:
                        error instanceof Error ? error.message : "Intenta de nuevo.",
                    color: "danger",
                });
            }
        });
    }

    async function handleRequest() {
        await withBusy(async () => {
            try {
                const data = await requestLiveLocation(bookingId);
                setSession(data);
                addToast({
                    title: "Solicitud enviada",
                    description:
                        "Se notificó a los participantes que aún no comparten ubicación.",
                    color: "success",
                });
            } catch (error) {
                addToast({
                    title: "No se pudo solicitar",
                    description:
                        error instanceof Error ? error.message : "Intenta de nuevo.",
                    color: "danger",
                });
            }
        });
    }

    async function handleStop() {
        await withBusy(async () => {
            try {
                const data = await stopLiveLocation(bookingId);
                setSession(data);
                sharingRef.current = false;
                addToast({
                    title: "Dejaste de compartir",
                    description: "Tu ubicación ya no es visible en el mapa.",
                    color: "warning",
                });
            } catch (error) {
                addToast({
                    title: "No se pudo detener",
                    description:
                        error instanceof Error ? error.message : "Intenta de nuevo.",
                    color: "danger",
                });
            }
        });
    }

    async function handleRefresh() {
        await withBusy(async () => {
            try {
                let data: LiveLocationSessionOut;
                if (session?.me.sharing) {
                    const coords = await readDevicePosition();
                    data = await refreshLiveLocation(bookingId, coords);
                } else {
                    data = await getLiveLocation(bookingId);
                }
                setSession(data);
                sharingRef.current = data.me.sharing;
                addToast({
                    title: "Ubicaciones actualizadas",
                    description: `${data.sharing_count} participante(s) compartiendo.`,
                    color: "success",
                });
            } catch (error) {
                addToast({
                    title: "No se pudo refrescar",
                    description:
                        error instanceof Error ? error.message : "Intenta de nuevo.",
                    color: "danger",
                });
            }
        });
    }

    const eventLabel = [session?.event.address, session?.event.city]
        .filter(Boolean)
        .join(" · ");
    const othersNotSharing =
        session?.participants.filter((p) => !p.is_me && !p.sharing) ?? [];
    const anyRequestedByMe = othersNotSharing.some((p) => p.requested_by_me);

    return (
        <div className="flex flex-col gap-5">
                {isLoading || !session ? (
                    <div className="h-64 rounded-2xl bg-default-100 animate-pulse" />
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {session.participants.map((participant, index) => (
                                <Chip
                                    key={participant.user_id}
                                    size="sm"
                                    variant="flat"
                                    color={participant.sharing ? "success" : "default"}
                                    startContent={
                                        <span
                                            className="ml-1 h-2 w-2 rounded-full"
                                            style={{
                                                backgroundColor: participantColor(
                                                    participant,
                                                    index,
                                                ),
                                            }}
                                        />
                                    }
                                >
                                    {participant.is_me
                                        ? "Tú"
                                        : participant.display_name}
                                    :{" "}
                                    {participant.sharing
                                        ? "compartiendo"
                                        : "sin compartir"}
                                </Chip>
                            ))}
                            <Chip
                                size="sm"
                                variant="flat"
                                color={
                                    session.sharing_count > 0 ? "primary" : "warning"
                                }
                            >
                                {session.sharing_count} en el mapa
                            </Chip>
                        </div>

                        {session.me.pending_request ? (
                            <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                                Te pidieron compartir tu ubicación. Acepta pulsando
                                “Compartir mi ubicación”.
                            </div>
                        ) : null}

                        {anyRequestedByMe ? (
                            <div className="rounded-2xl border border-default-200 bg-default-50 px-4 py-3 text-sm text-default-600">
                                Esperando a que los demás acepten y compartan su
                                ubicación.
                            </div>
                        ) : null}

                        {points.length > 0 ? (
                            <LiveLocationMapInner points={points} />
                        ) : (
                            <div className="h-64 rounded-2xl border border-dashed border-default-300 bg-default-50 flex items-center justify-center px-4 text-center">
                                <p className="text-sm text-default-500">
                                    Aún no hay puntos para mostrar. Comparte tu
                                    ubicación o verifica que el evento tenga
                                    coordenadas.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3 text-xs text-default-500">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
                                Evento
                            </span>
                            {session.participants.map((participant, index) => (
                                <span
                                    key={`legend-${participant.user_id}`}
                                    className="inline-flex items-center gap-1.5"
                                >
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                            backgroundColor: participantColor(
                                                participant,
                                                index,
                                            ),
                                        }}
                                    />
                                    {participant.is_me
                                        ? "Tú"
                                        : `${participant.display_name} (${roleLabel(participant.role)})`}
                                </span>
                            ))}
                        </div>

                        {eventLabel ? (
                            <p className="text-sm text-default-600">
                                Evento: {eventLabel}
                            </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                            {!session.me.sharing ? (
                                <Button
                                    color="primary"
                                    radius="lg"
                                    isLoading={isBusy}
                                    onPress={() => void handleShare()}
                                    startContent={
                                        <Icon
                                            icon="material-symbols:my-location"
                                            width={18}
                                        />
                                    }
                                >
                                    {session.me.pending_request
                                        ? "Aceptar y compartir"
                                        : "Compartir mi ubicación"}
                                </Button>
                            ) : (
                                <Button
                                    color="danger"
                                    variant="flat"
                                    radius="lg"
                                    isLoading={isBusy}
                                    onPress={() => void handleStop()}
                                    startContent={
                                        <Icon
                                            icon="material-symbols:location-off"
                                            width={18}
                                        />
                                    }
                                >
                                    Dejar de compartir
                                </Button>
                            )}

                            {othersNotSharing.length > 0 ? (
                                <Button
                                    variant="bordered"
                                    radius="lg"
                                    isLoading={isBusy}
                                    isDisabled={anyRequestedByMe}
                                    onPress={() => void handleRequest()}
                                    startContent={
                                        <Icon
                                            icon="material-symbols:person-pin-circle"
                                            width={18}
                                        />
                                    }
                                >
                                    {anyRequestedByMe
                                        ? "Solicitud enviada"
                                        : "Solicitar a los demás"}
                                </Button>
                            ) : null}

                            <Button
                                variant="flat"
                                radius="lg"
                                isLoading={isBusy}
                                onPress={() => void handleRefresh()}
                                startContent={
                                    <Icon icon="material-symbols:refresh" width={18} />
                                }
                            >
                                Refrescar
                            </Button>
                        </div>
                    </>
                )}
        </div>
    );
}
