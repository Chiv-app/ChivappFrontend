"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
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
    // Legacy (inalcanzables): equivalen a una reserva confirmada.
    "balance_pending",
    "balance_review",
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
            listEnsembleMembers({ status: "active" }).catch(() =>
                listEnsembleMembers(),
            ),
            listBookingMemberInvites(booking.id),
        ]);
        setMembers(memberRows.filter((m) => m.status !== "inactive"));
        setInvites(inviteRows);
    }, [booking.id]);

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
        });
        refresh()
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

    if (isLoading) {
        return <div className="h-40 rounded-4xl bg-default-100 animate-pulse" />;
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="w-full">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            as={Link}
                            href="/musician/payouts"
                            size="sm"
                            variant="flat"
                            radius="lg"
                        >
                            Ir a Pagos
                        </Button>
                        <Button
                            as={Link}
                            href="/musician/members"
                            size="sm"
                            variant="flat"
                            radius="lg"
                        >
                            Gestionar integrantes
                        </Button>
                    </div>
                </div>

                {members.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-default-300 px-4 py-6 text-center">
                        <p className="text-sm text-default-600">
                            Todavía no tienes integrantes activos.
                        </p>
                        <Button
                            as={Link}
                            href="/musician/members"
                            className="mt-3"
                            color="primary"
                            size="sm"
                            radius="lg"
                        >
                            Agregar integrantes
                        </Button>
                    </div>
                ) : (
                    <>
                        {canInvite && selectable.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                <p className="text-sm font-medium">Elegir integrantes</p>
                                <div className="flex flex-col gap-2">
                                    {selectable.map((member) => (
                                        <Checkbox
                                            key={member.id}
                                            isSelected={selected.includes(member.id)}
                                            onValueChange={(checked) => {
                                                setSelected((prev) =>
                                                    checked
                                                        ? [...prev, member.id]
                                                        : prev.filter((id) => id !== member.id),
                                                );
                                            }}
                                        >
                                            <span className="font-medium">{member.fullname}</span>
                                            <span className="text-default-500 text-sm ml-2">
                                                {member.specialties.join(", ")}
                                            </span>
                                        </Checkbox>
                                    ))}
                                </div>
                                <Button
                                    color="primary"
                                    radius="lg"
                                    className="self-start"
                                    isLoading={isInviting}
                                    onPress={handleInvite}
                                    startContent={
                                        <Icon icon="material-symbols:send" width={18} />
                                    }
                                >
                                    Asociar al evento
                                </Button>
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

                        {invites.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                <p className="text-sm font-medium">Asociados a esta reserva</p>
                                                                <ul className="divide-y divide-default-200 rounded-2xl border border-default-200">
                                    {invites.map((invite) => {
                                        const meta = INVITE_STATUS[invite.status];
                                        const fullMember = members.find(m => m.id === invite.ensemble_member_id);
                                        return (
                                            <li key={invite.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <Avatar name={invite.member_fullname} size="sm" className="flex-shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-foreground">
                                                            {invite.member_fullname}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            {invite.specialties.map(spec => (
                                                                <Chip key={spec} size="sm" variant="flat" className="text-[10px] h-5" startContent={<Icon icon={getInstrumentIcon(spec)} className="mr-1" />}>
                                                                    {spec}
                                                                </Chip>
                                                            ))}
                                                            {fullMember?.phone && (
                                                                <span className="text-xs text-default-500">{fullMember.phone}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Chip size="sm" color={meta.color} variant="flat">
                                                        {meta.label}
                                                    </Chip>
                                                    
                                                    {invite.status === "accepted" && (
                                                        <div className="flex items-center gap-2 ml-2">
                                                            {fullMember?.phone && (
                                                                <Button
                                                                    as="a"
                                                                    href={`https://wa.me/${fullMember.phone.replace(/[^0-9]/g, "")}`}
                                                                    target="_blank"
                                                                    size="sm"
                                                                    variant="flat"
                                                                    color="success"
                                                                    isIconOnly
                                                                    aria-label="WhatsApp"
                                                                >
                                                                    <Icon icon="mdi:whatsapp" width={18} />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                as="a"
                                                                href={`mailto:${invite.member_email}`}
                                                                size="sm"
                                                                variant="flat"
                                                                color="primary"
                                                                isIconOnly
                                                                aria-label="Email"
                                                            >
                                                                <Icon icon="mdi:email-outline" width={18} />
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {invite.respond_url && invite.status === "pending" && (
                                                        <div className="flex items-center gap-2 ml-2">
                                                            <Button
                                                                size="sm"
                                                                variant="flat"
                                                                radius="lg"
                                                                isIconOnly
                                                                aria-label="Copiar link"
                                                                onPress={() => copyLink(invite.respond_url)}
                                                            >
                                                                <Icon icon="lucide:link" width={16} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="flat"
                                                                color="primary"
                                                                radius="lg"
                                                                isLoading={workingId === invite.ensemble_member_id}
                                                                onPress={() => handleResend(invite.ensemble_member_id)}
                                                            >
                                                                Reenviar
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ) : null}
                    </>
                )}
            </div>

            <Modal isOpen={isFormOpen} onOpenChange={setIsFormOpen} scrollBehavior="inside">
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
                                    variant="bordered"
                                    value={newMemberForm.fullname}
                                    onValueChange={(val) => setNewMemberForm(prev => ({ ...prev, fullname: val }))}
                                    isRequired
                                />
                                <Input
                                    label="Correo electrónico"
                                    type="email"
                                    variant="bordered"
                                    value={newMemberForm.email}
                                    onValueChange={(val) => setNewMemberForm(prev => ({ ...prev, email: val }))}
                                    isRequired
                                />
                                <Input
                                    label="Teléfono"
                                    placeholder="Opcional"
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





