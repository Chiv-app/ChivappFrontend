"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useState, useEffect, useMemo } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Checkbox,
    CheckboxGroup,
    Chip,
    Divider,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import type { BookingOut } from "@/types/api";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { isSafeGoogleOAuthUrl } from "@/components/musician/calendar-connection-card";
import {
    buildBookingStartEndIso,
    buildGoogleCalendarTemplateUrl,
    downloadCalendarIcs,
} from "@/lib/calendar";

type Props = {
    booking: BookingOut;
    role?: "musician" | "contractor";
    isMemberView?: boolean;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: (booking: BookingOut) => void;
};

type SyncableMember = {
    id: string;
    name: string;
    status: "accepted" | "pending" | "active";
};

export default function BookingCalendarSyncModal({
    booking,
    role = "musician",
    isMemberView = false,
    isOpen,
    onOpenChange,
    onUpdated,
}: Props) {
    const { user } = useAuth();
    const isLeadMusician = role === "musician" && !isMemberView;
    const isContractor = role === "contractor";
    const isCalendarConnected = Boolean(user?.has_connected_calendar);

    const [isLoading, setIsLoading] = useState(false);
    const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
    const [includeContractor, setIncludeContractor] = useState(true);
    const [members, setMembers] = useState<SyncableMember[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (cancelled) return;
            setIncludeContractor(!isMemberView);
            setSelectedMembers([]);
            setMembersLoading(isLeadMusician);
        });
        if (!isLeadMusician) {
            return () => {
                cancelled = true;
            };
        }

        Promise.all([
            apiFetch<
                {
                    status: string;
                    ensemble_member_id: string;
                    member_fullname: string;
                }[]
            >(`/bookings/${booking.id}/member-invites`).catch(() => []),
            apiFetch<{ id: string; fullname: string; status: string }[]>(
                "/ensemble-members?status=active",
            ).catch(() => []),
        ])
            .then(([invites, activeRoster]) => {
                if (cancelled) return;
                const byId = new Map<string, SyncableMember>();
                for (const inv of invites) {
                    if (inv.status === "accepted" || inv.status === "pending") {
                        byId.set(inv.ensemble_member_id, {
                            id: inv.ensemble_member_id,
                            name: inv.member_fullname,
                            status:
                                inv.status === "accepted"
                                    ? "accepted"
                                    : "pending",
                        });
                    }
                }
                for (const m of activeRoster) {
                    if (!byId.has(m.id)) {
                        byId.set(m.id, {
                            id: m.id,
                            name: m.fullname,
                            status: "active",
                        });
                    }
                }
                const combined = Array.from(byId.values());
                setMembers(combined);
                const preselected = combined
                    .filter(
                        (item) =>
                            item.status === "accepted" ||
                            item.status === "pending",
                    )
                    .map((item) => item.id);
                setSelectedMembers(
                    preselected.length > 0
                        ? preselected
                        : combined.map((item) => item.id),
                );
            })
            .finally(() => {
                if (!cancelled) setMembersLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, booking.id, isLeadMusician, isMemberView]);

    const calendarExportMeta = useMemo(() => {
        const { startIso, endIso } = buildBookingStartEndIso(booking);
        const title = `Chivapp: ${booking.event_type}${booking.musician_name ? ` - ${booking.musician_name}` : ""}`;
        const location = [booking.location_address, booking.location_city]
            .filter(Boolean)
            .join(", ");
        const descriptionParts = [
            `Reserva confirmada en Chivapp (#${booking.id.slice(0, 8)})`,
            booking.musician_name ? `Artista: ${booking.musician_name}` : null,
            !isMemberView && booking.contractor_name
                ? `Cliente: ${booking.contractor_name}`
                : null,
            location ? `Lugar: ${location}` : null,
            booking.event_description
                ? `Detalles: ${booking.event_description}`
                : null,
        ].filter(Boolean);
        const description = descriptionParts.join("\n");
        const googleTemplateUrl = buildGoogleCalendarTemplateUrl({
            title,
            startIso,
            endIso,
            location,
            description,
        });
        return {
            title,
            startIso,
            endIso,
            location,
            description,
            googleTemplateUrl,
        };
    }, [booking, isMemberView]);

    async function handleConnectGoogleCalendar() {
        setIsConnectingOAuth(true);
        try {
            const res = await apiFetch<{ auth_url: string }>(
                "/calendar-auth/url",
            );
            if (res?.auth_url && isSafeGoogleOAuthUrl(res.auth_url)) {
                window.location.href = res.auth_url;
                return;
            }
            throw new Error("No se recibió una URL segura de Google.");
        } catch (error) {
            addToast({
                title: "No se pudo iniciar la conexión",
                description:
                    error instanceof Error
                        ? error.message
                        : "Intenta nuevamente en unos segundos.",
                color: "danger",
            });
            setIsConnectingOAuth(false);
        }
    }

    async function handleSync() {
        setIsLoading(true);
        try {
            const updated = await apiFetch<BookingOut>(
                "/bookings/" + booking.id + "/calendar-sync",
                {
                    method: "POST",
                    body: JSON.stringify({
                        include_contractor: isMemberView
                            ? false
                            : includeContractor,
                        ensemble_member_ids: isLeadMusician
                            ? selectedMembers
                            : [],
                    }),
                },
            );
            onUpdated(updated);
            addToast({ title: "Agenda sincronizada", color: "success" });
            onOpenChange(false);
        } catch (error) {
            addToast({
                title: "Error al sincronizar",
                description:
                    error instanceof Error
                        ? error.message
                        : "Intenta de nuevo",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const title = booking.calendar_event_id
        ? "Actualizar Agenda"
        : "Agregar / Sincronizar Agenda";

    return (
        <Modal
            closeButton={<ModalCloseButton aria-label="Cerrar" />}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="md"
            scrollBehavior="inside"
            placement="bottom-center"
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            {title}
                        </ModalHeader>
                        <ModalBody className="gap-4">
                            {!isCalendarConnected ? (
                                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 flex flex-col gap-2.5">
                                    <div className="flex items-start gap-2.5">
                                        <Icon
                                            icon="logos:google-calendar"
                                            width={20}
                                            className="mt-0.5 shrink-0"
                                        />
                                        <div className="text-xs text-default-700">
                                            <p className="font-bold text-foreground">
                                                Conecta tu Google Calendar para sincronización automática
                                            </p>
                                            <p className="mt-0.5">
                                                Al vincular tu cuenta, Chivapp agenda tus eventos automáticamente y avisa a tus integrantes. También puedes usar las opciones directas de abajo sin vincular.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        color="primary"
                                        radius="lg"
                                        className="self-start font-semibold"
                                        isLoading={isConnectingOAuth}
                                        onPress={handleConnectGoogleCalendar}
                                        startContent={
                                            !isConnectingOAuth ? (
                                                <Icon
                                                    icon="logos:google-calendar"
                                                    width={16}
                                                />
                                            ) : null
                                        }
                                    >
                                        Conectar Google Calendar
                                    </Button>
                                </div>
                            ) : null}

                            {isMemberView ? (
                                <p className="text-default-500 text-sm">
                                    Esto creará o actualizará el evento de esta presentación en tu Google Calendar conectado.
                                </p>
                            ) : isContractor ? (
                                <>
                                    <p className="text-default-500 text-sm">
                                        Esto creará o actualizará el evento de tu contratación en tu Google Calendar conectado.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <Checkbox
                                            isSelected={includeContractor}
                                            onValueChange={setIncludeContractor}
                                        >
                                            Incluir al músico (
                                            {booking.musician_name || "Artista"}
                                            )
                                        </Checkbox>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-default-500 text-sm">
                                        Sincroniza este evento con tu Google Calendar.
                                        {members.length > 0
                                            ? " Selecciona a quiénes deseas incluir para que reciban la invitación en su calendario."
                                            : ""}
                                    </p>

                                    <div className="flex flex-col gap-3">
                                        <Checkbox
                                            isSelected={includeContractor}
                                            onValueChange={setIncludeContractor}
                                        >
                                            Incluir al contratista (
                                            {booking.contractor_name ||
                                                "Cliente"}
                                            )
                                        </Checkbox>

                                        {membersLoading ? (
                                            <div className="text-xs text-default-400">
                                                Cargando integrantes...
                                            </div>
                                        ) : members.length > 0 ? (
                                            <CheckboxGroup
                                                label="Incluir integrantes de tu agrupación:"
                                                value={selectedMembers}
                                                onValueChange={
                                                    setSelectedMembers
                                                }
                                            >
                                                {members.map((m) => (
                                                    <Checkbox
                                                        key={m.id}
                                                        value={m.id}
                                                    >
                                                        <span className="inline-flex items-center gap-2">
                                                            <span>
                                                                {m.name}
                                                            </span>
                                                            {m.status ===
                                                            "accepted" ? (
                                                                <Chip
                                                                    size="sm"
                                                                    color="success"
                                                                    variant="flat"
                                                                >
                                                                    Confirmado
                                                                </Chip>
                                                            ) : m.status ===
                                                              "pending" ? (
                                                                <Chip
                                                                    size="sm"
                                                                    color="warning"
                                                                    variant="flat"
                                                                >
                                                                    Convocado
                                                                </Chip>
                                                            ) : null}
                                                        </span>
                                                    </Checkbox>
                                                ))}
                                            </CheckboxGroup>
                                        ) : null}
                                    </div>
                                </>
                            )}

                            <Divider />

                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold text-default-600">
                                    Agregar directamente a tu calendario personal
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        as="a"
                                        href={
                                            calendarExportMeta.googleTemplateUrl
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="sm"
                                        variant="bordered"
                                        radius="lg"
                                        startContent={
                                            <Icon
                                                icon="logos:google-calendar"
                                                width={16}
                                            />
                                        }
                                    >
                                        Abrir en Google Calendar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="bordered"
                                        radius="lg"
                                        onPress={() =>
                                            downloadCalendarIcs({
                                                uid: booking.id,
                                                title: calendarExportMeta.title,
                                                startIso:
                                                    calendarExportMeta.startIso,
                                                endIso: calendarExportMeta.endIso,
                                                location:
                                                    calendarExportMeta.location,
                                                description:
                                                    calendarExportMeta.description,
                                            })
                                        }
                                        startContent={
                                            <Icon
                                                icon="lucide:download"
                                                width={16}
                                            />
                                        }
                                    >
                                        Descargar .ics (Apple / Outlook)
                                    </Button>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                color="primary"
                                onPress={handleSync}
                                isLoading={isLoading}
                                isDisabled={!isCalendarConnected}
                                startContent={
                                    !isLoading && (
                                        <Icon icon="lucide:calendar-sync" />
                                    )
                                }
                            >
                                Sincronizar automático
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
