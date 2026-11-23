"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Checkbox,
    Chip,
    addToast,
    Avatar,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import {
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@heroui/react";
import ChipListInput from "@/components/ui/chip-list-input";
import { COMMON_INSTRUMENTS } from "@/lib/instrument-icons";
import { createEnsembleMember } from "@/lib/ensemble-members";
import { ApiError } from "@/lib/api";

import {
    createBookingMemberInvites,
    listBookingMemberInvites,
    listEnsembleMembers,
    resendBookingMemberInviteEmail,
} from "@/lib/ensemble-members";
import type {
    BookingMemberInviteOut,
    BookingOut,
    EnsembleMemberOut,
} from "@/types/api";

type Props = {
    booking: BookingOut;
};

const INVITE_STATUS: Record<
    BookingMemberInviteOut["status"],
    { label: string; color: "warning" | "success" | "danger" }
> = {
    pending: { label: "Pendiente", color: "warning" },
    accepted: { label: "Aceptó", color: "success" },
    declined: { label: "Rechazó", color: "danger" },
};

const INSTRUMENT_ICONS: Record<string, string> = {
    "trompeta": "mdi:trumpet",
    "violin": "mdi:violin",
    "violín": "mdi:violin",
    "guitarron": "mdi:guitar-acoustic",
    "guitarrón": "mdi:guitar-acoustic",
    "vihuela": "mdi:guitar-acoustic",
    "guitarra": "mdi:guitar-acoustic",
    "arpa": "mdi:music-clef-treble",
    "voz": "mdi:microphone",
    "cantante": "mdi:microphone",
    "piano": "mdi:piano",
    "teclado": "mdi:piano",
    "saxofon": "mdi:saxophone",
    "saxofón": "mdi:saxophone",
    "bajo": "mdi:guitar-electric",
};

function getInstrumentIcon(name: string) {
    const key = name.toLowerCase().trim();
    for (const [k, v] of Object.entries(INSTRUMENT_ICONS)) {
        if (key.includes(k)) return v;
    }
    return "mdi:music";
}

const INVITE_OPEN_STATUSES = new Set([
    "payment_retained",
    "change_pending",
    "in_progress",
    "payment_released",
]);

export default function BookingEnsemblePanel({ booking }: Props) {
    const [members, setMembers] = useState<EnsembleMemberOut[]>([]);
    const [invites, setInvites] = useState<BookingMemberInviteOut[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [workingId, setWorkingId] = useState<string | null>(null);

    // New member form
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCreatingMember, setIsCreatingMember] = useState(false);
    const [newMemberForm, setNewMemberForm] = useState({
        fullname: "",
        email: "",
        phone: "",
        specialties: [] as string[],
    });

    async function handleCreateAndInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!newMemberForm.fullname.trim() || !newMemberForm.email.trim()) {
            addToast({ title: "Completa nombre y correo", color: "warning" });
            return;
        }
        if (newMemberForm.specialties.length === 0) {
            addToast({ title: "Agrega al menos una especialidad", color: "warning" });
            return;
        }

        setIsCreatingMember(true);
        try {
            // 1. Crear el integrante (envía email de invitación a la agrupación)
            const created = await createEnsembleMember({
                fullname: newMemberForm.fullname.trim(),
                email: newMemberForm.email.trim(),
                phone: newMemberForm.phone.trim() || null,
                specialties: newMemberForm.specialties,
                notes: null,
            });

            // 2. Invitar al evento automáticamente
            const createdInvites = await createBookingMemberInvites(booking.id, [created.id]);

            // 3. Actualizar estado
            setMembers((prev) => [created, ...prev]);
            setInvites((prev) => {
                const map = new Map(prev.map((i) => [i.ensemble_member_id, i]));
                for (const row of createdInvites) map.set(row.ensemble_member_id, row);
                return Array.from(map.values());
            });

            addToast({
                title: "Integrante creado e invitado",
                description: "Se le ha enviado un correo para configurar su cuenta.",
                color: "success",
            });
            setIsFormOpen(false);
            setNewMemberForm({ fullname: "", email: "", phone: "", specialties: [] });
        } catch (error) {
            addToast({
                title: "No se pudo crear/invitar",
                description: error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsCreatingMember(false);
        }
    }


    const canInvite = INVITE_OPEN_STATUSES.has(booking.status);

    const refresh = useCallback(async () => {
        const [memberRows, inviteRows] = await Promise.all([
            listEnsembleMembers(),
            listBookingMemberInvites(booking.id),
        ]);
        setMembers(memberRows.filter((m) => m.status !== "inactive"));
        setInvites(inviteRows);
    }, [booking.id]);

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
            return refresh()
                .catch((error) => {
                    if (cancelled) return;
                    addToast({
                        title: "No se pudo cargar integrantes del evento",
                        description:
                            error instanceof Error ? error.message : "Intenta de nuevo.",
                        color: "danger",
                    });
                })
                .finally(() => {
                    if (!cancelled) setIsLoading(false);
                });
        });
        return () => {
            cancelled = true;
        };
    }, [refresh]);

    const selectable = useMemo(() => {
        const already = new Set(
            invites
                .filter((i) => i.status === "pending" || i.status === "accepted")
                .map((i) => i.ensemble_member_id),
        );
        return members.filter((m) => !already.has(m.id));
    }, [members, invites]);

    async function handleInvite() {
        if (selected.length === 0) {
            addToast({
                title: "Selecciona al menos un integrante",
                color: "warning",
            });
            return;
        }
        setIsInviting(true);
        try {
            const created = await createBookingMemberInvites(booking.id, selected);
            setInvites((prev) => {
                const map = new Map(prev.map((i) => [i.ensemble_member_id, i]));
                for (const row of created) map.set(row.ensemble_member_id, row);
                return Array.from(map.values());
            });
            setSelected([]);
            addToast({
                title: "Integrantes convocados",
                description: "Es opcional: ellos verán la reserva en su módulo.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo convocar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsInviting(false);
        }
    }

    async function handleInviteSingle(memberId: string) {
        setWorkingId(memberId);
        try {
            const created = await createBookingMemberInvites(booking.id, [memberId]);
            setInvites((prev) => {
                const map = new Map(prev.map((i) => [i.ensemble_member_id, i]));
                for (const row of created) map.set(row.ensemble_member_id, row);
                return Array.from(map.values());
            });
            setSelected((prev) => prev.filter((id) => id !== memberId));
            addToast({
                title: "Correo de convocatoria enviado",
                description: "Se envió la invitación del evento al correo del integrante.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo enviar la convocatoria",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setWorkingId(null);
        }
    }

    async function handleResend(memberId: string) {
        setWorkingId(memberId);
        try {
            const updated = await resendBookingMemberInviteEmail(booking.id, memberId);
            setInvites((prev) => prev.map((i) => (i.ensemble_member_id === memberId ? updated : i)));
            addToast({
                title: "Correo reenviado",
                description: "Se ha enviado un nuevo enlace al integrante.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo reenviar el correo",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setWorkingId(null);
        }
    }

    async function copyLink(url: string | null) {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            addToast({ title: "Link copiado", color: "success" });
        } catch {
            addToast({
                title: "No se pudo copiar",
                description: url,
                color: "warning",
            });
        }
    }

    const allSelected =
        selectable.length > 0 &&
        selectable.every((member) => selected.includes(member.id));

    function toggleSelectAll() {
        if (allSelected) {
            setSelected([]);
        } else {
            setSelected(selectable.map((m) => m.id));
        }
    }

    function toggleMemberSelection(memberId: string) {
        setSelected((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId],
        );
    }

    if (isLoading) {
        return <div className="h-44 rounded-3xl bg-content1 border border-default-200/70 animate-pulse" />;
    }

    return (
        <div className="rounded-3xl border border-default-200/70 bg-content1 p-5 sm:p-6 shadow-soft flex flex-col gap-6">
            {/* Cabecera y acciones rápidas */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-default-200/70">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                            Convocatoria del equipo
                        </h3>
                        <Chip size="sm" variant="flat" color="primary">
                            {invites.length} {invites.length === 1 ? "convocado" : "convocados"}
                        </Chip>
                        {selectable.length > 0 ? (
                            <Chip size="sm" variant="flat" color="default">
                                {selectable.length} {selectable.length === 1 ? "disponible" : "disponibles"}
                            </Chip>
                        ) : null}
                    </div>
                    <p className="text-xs sm:text-sm text-default-500 mt-1">
                        Selecciona a los músicos que participarán en este show para enviarles su invitación y sincronizar su agenda.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canInvite ? (
                        <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            radius="lg"
                            className="font-semibold"
                            startContent={<Icon icon="material-symbols:person-add-outline" width={17} />}
                            onPress={() => setIsFormOpen(true)}
                        >
                            Nuevo integrante
                        </Button>
                    ) : null}
                    <Button
                        as={Link}
                        href="/musician/members"
                        size="sm"
                        variant="bordered"
                        radius="lg"
                        className="font-medium"
                        startContent={<Icon icon="material-symbols:groups-outline" width={17} />}
                    >
                        Gestionar integrantes
                    </Button>
                    <Button
                        as={Link}
                        href="/musician/payouts"
                        size="sm"
                        variant="bordered"
                        radius="lg"
                        className="font-medium"
                        startContent={<Icon icon="material-symbols:payments-outline" width={17} />}
                    >
                        Ir a Pagos
                    </Button>
                </div>
            </div>

            {members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-default-300 bg-default-50/50 px-4 py-8 text-center flex flex-col items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                        <Icon icon="material-symbols:groups" width={26} />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">
                            Todavía no tienes integrantes registrados
                        </p>
                        <p className="text-sm text-default-500 mt-1 max-w-md">
                            Agrega a los músicos de tu agrupación para convocarlos por correo y llevar el control de sus pagos.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-1">
                        {canInvite ? (
                            <Button
                                color="primary"
                                size="sm"
                                radius="lg"
                                className="font-semibold"
                                startContent={<Icon icon="material-symbols:person-add" width={17} />}
                                onPress={() => setIsFormOpen(true)}
                            >
                                Crear e invitar ahora
                            </Button>
                        ) : null}
                        <Button
                            as={Link}
                            href="/musician/members"
                            variant="flat"
                            size="sm"
                            radius="lg"
                        >
                            Ir a Integrantes
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* 1. Integrantes ya asociados a esta reserva */}
                    {invites.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-foreground">
                                    Asociados a esta reserva ({invites.length})
                                </p>
                            </div>
                            <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                {invites.map((invite) => {
                                    const meta = INVITE_STATUS[invite.status];
                                    const fullMember = members.find(
                                        (m) => m.id === invite.ensemble_member_id,
                                    );
                                    return (
                                        <li
                                            key={invite.id}
                                            className="rounded-2xl border border-default-200/80 bg-default-50/40 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <Avatar
                                                    name={invite.member_fullname}
                                                    size="sm"
                                                    className="shrink-0 mt-0.5"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-sm text-foreground truncate">
                                                            {invite.member_fullname}
                                                        </p>
                                                        <Chip size="sm" color={meta.color} variant="flat" className="h-5 text-xs">
                                                            {meta.label}
                                                        </Chip>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        {invite.specialties.map((spec) => (
                                                            <Chip
                                                                key={spec}
                                                                size="sm"
                                                                variant="flat"
                                                                className="text-xs h-5"
                                                                startContent={
                                                                    <Icon
                                                                        icon={getInstrumentIcon(spec)}
                                                                        className="mr-0.5"
                                                                        width={13}
                                                                    />
                                                                }
                                                            >
                                                                {spec}
                                                            </Chip>
                                                        ))}
                                                        {fullMember?.phone ? (
                                                            <span className="text-xs text-default-500">
                                                                · {fullMember.phone}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                {invite.status === "accepted" && fullMember?.phone ? (
                                                    <Button
                                                        as="a"
                                                        href={`https://wa.me/${fullMember.phone.replace(/[^0-9]/g, "")}`}
                                                        target="_blank"
                                                        size="sm"
                                                        variant="flat"
                                                        color="success"
                                                        radius="lg"
                                                        isIconOnly
                                                        aria-label="WhatsApp"
                                                    >
                                                        <Icon icon="mdi:whatsapp" width={17} />
                                                    </Button>
                                                ) : null}
                                                {invite.respond_url ? (
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        radius="lg"
                                                        isIconOnly
                                                        aria-label="Copiar enlace de invitación"
                                                        onPress={() => copyLink(invite.respond_url)}
                                                    >
                                                        <Icon icon="lucide:link" width={15} />
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    color="primary"
                                                    radius="lg"
                                                    className="font-medium"
                                                    isLoading={workingId === invite.ensemble_member_id}
                                                    startContent={
                                                        <Icon
                                                            icon="material-symbols:forward-to-inbox-outline"
                                                            width={16}
                                                        />
                                                    }
                                                    onPress={() => handleResend(invite.ensemble_member_id)}
                                                >
                                                    Reenviar correo
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : null}

                    {/* 2. Elegir integrantes disponibles para convocar */}
                    {canInvite && selectable.length > 0 ? (
                        <div className="flex flex-col gap-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <p className="text-sm font-bold text-foreground">
                                        Elegir integrantes ({selectable.length})
                                    </p>
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        className="text-xs font-semibold text-primary-text hover:underline cursor-pointer"
                                    >
                                        {allSelected
                                            ? "Limpiar selección"
                                            : "Seleccionar todos"}
                                    </button>
                                </div>

                                <Button
                                    color="primary"
                                    size="sm"
                                    radius="lg"
                                    className="font-semibold self-start sm:self-auto"
                                    isLoading={isInviting}
                                    isDisabled={selected.length === 0}
                                    onPress={handleInvite}
                                    startContent={
                                        <Icon icon="material-symbols:send" width={16} />
                                    }
                                >
                                    {selected.length > 0
                                        ? `Asociar y enviar correo (${selected.length})`
                                        : "Asociar y enviar correo"}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {selectable.map((member) => {
                                    const isChecked = selected.includes(member.id);
                                    return (
                                        <div
                                            key={member.id}
                                            onClick={() => toggleMemberSelection(member.id)}
                                            role="group"
                                            aria-label={`Integrante ${member.fullname}`}
                                            className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer ${
                                                isChecked
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                                                    : "border-default-200/80 bg-content1 hover:border-default-300 hover:bg-default-50/50"
                                            }`}
                                        >
                                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="pt-0.5 shrink-0"
                                                >
                                                    <Checkbox
                                                        aria-label={`Seleccionar a ${member.fullname}`}
                                                        isSelected={isChecked}
                                                        onValueChange={() =>
                                                            toggleMemberSelection(member.id)
                                                        }
                                                    />
                                                </div>
                                                <Avatar
                                                    name={member.fullname}
                                                    size="sm"
                                                    className="shrink-0 mt-0.5"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-sm text-foreground truncate">
                                                        {member.fullname}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                                        {member.specialties.length > 0 ? (
                                                            member.specialties.map((spec) => (
                                                                <span
                                                                    key={spec}
                                                                    className="inline-flex items-center gap-1 rounded-md bg-default-100 px-2 py-0.5 text-xs font-medium text-default-600"
                                                                >
                                                                    <Icon
                                                                        icon={getInstrumentIcon(spec)}
                                                                        width={12}
                                                                    />
                                                                    {spec}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-default-400">
                                                                Sin especialidad
                                                            </span>
                                                        )}
                                                        {member.status === "invited" ? (
                                                            <Chip
                                                                size="sm"
                                                                color="warning"
                                                                variant="flat"
                                                                className="text-xs h-5"
                                                            >
                                                                Invitación pendiente
                                                            </Chip>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                className="shrink-0"
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    color="primary"
                                                    radius="lg"
                                                    className="font-medium"
                                                    isLoading={workingId === member.id}
                                                    startContent={
                                                        <Icon
                                                            icon="material-symbols:send"
                                                            width={14}
                                                        />
                                                    }
                                                    onPress={() => handleInviteSingle(member.id)}
                                                >
                                                    Enviar correo
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {!canInvite ? (
                        <p className="text-sm text-default-500">
                            La convocatoria se cierra al finalizar el show. Puedes
                            gestionar pagos pendientes en{" "}
                            <Link href="/musician/payouts" className="text-primary underline">
                                Pagos
                            </Link>
                            .
                        </p>
                    ) : null}
                </div>
            )}

            <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />} isOpen={isFormOpen} onOpenChange={setIsFormOpen} scrollBehavior="inside">
                <ModalContent>
                    {(onClose) => (
                        <form onSubmit={handleCreateAndInvite}>
                            <ModalHeader>Crear e invitar integrante</ModalHeader>
                            <ModalBody className="flex flex-col gap-4">
                                <p className="text-sm text-default-600">
                                    Esta persona recibirá un correo para crear su contraseña, unirse a tu agrupación y aceptar este evento específico.
                                </p>
                                <Input
                                    label="Nombre completo"
                                    placeholder="Ej. Carlos Mendoza"
                                    variant="bordered"
                                    value={newMemberForm.fullname}
                                    onValueChange={(val) => setNewMemberForm(prev => ({ ...prev, fullname: val }))}
                                    isRequired
                                />
                                <Input
                                    label="Correo electrónico"
                                    type="email"
                                    placeholder="Ej. integrante@correo.com"
                                    variant="bordered"
                                    value={newMemberForm.email}
                                    onValueChange={(val) => setNewMemberForm(prev => ({ ...prev, email: val }))}
                                    isRequired
                                />
                                <Input
                                    label="Teléfono"
                                    placeholder="Ej. +51 999 888 777 (opcional)"
                                    variant="bordered"
                                    value={newMemberForm.phone}
                                    onValueChange={(val) => setNewMemberForm(prev => ({ ...prev, phone: val }))}
                                />
                                <ChipListInput
                                    label="Especialidades"
                                    values={newMemberForm.specialties}
                                    onChange={(val) => setNewMemberForm(prev => ({ ...prev, specialties: val }))}
                                    placeholder="Ej. Violín, Trompeta"
                                    suggestions={COMMON_INSTRUMENTS.map(label => ({
                                        label,
                                        icon: getInstrumentIcon(label)
                                    }))}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose}>
                                    Cancelar
                                </Button>
                                <Button color="primary" type="submit" isLoading={isCreatingMember}>
                                    Crear e invitar
                                </Button>
                            </ModalFooter>
                        </form>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}





