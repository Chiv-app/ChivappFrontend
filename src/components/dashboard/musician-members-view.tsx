"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Textarea,
    Tooltip,
    addToast,
    Avatar,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import ChipListInput from "@/components/ui/chip-list-input";
import MemberPayoutHistoryModal from "@/components/dashboard/member-payout-history-modal";
import { ApiError } from "@/lib/api";
import {
    createEnsembleMember,
    deactivateEnsembleMember,
    listEnsembleMembers,
    resendEnsembleInvite,
    updateEnsembleMember,
} from "@/lib/ensemble-members";
import { formatPeruDate } from "@/lib/date-utils";
import { COMMON_INSTRUMENTS, getInstrumentIcon } from "@/lib/instrument-icons";
import { UI } from "@/lib/ui-classes";
import type { EnsembleMemberOut, EnsembleMemberStatus } from "@/types/api";

type StatusFilter = "all" | EnsembleMemberStatus | "expired";

type DisplayState = {
    key: "pending" | "expired" | "accepted" | "inactive";
    label: string;
    color: "warning" | "danger" | "success" | "default";
    detail: string | null;
};

/** Misma plantilla en cabecera y filas para alinear columnas. */
const TABLE_GRID =
    "md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.15fr)_minmax(9.5rem,0.85fr)_minmax(7rem,0.7fr)_minmax(7.5rem,auto)] md:gap-x-4 md:items-center";

const INSTRUMENT_SUGGESTIONS = COMMON_INSTRUMENTS.map((label) => ({
    label,
    icon: getInstrumentIcon(label),
}));

const emptyForm = {
    fullname: "",
    email: "",
    phone: "",
    specialties: [] as string[],
    notes: "",
};

function formatJoinedDate(value: string | null | undefined) {
    return formatPeruDate(value, {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

/** Aceptó = creó su contraseña. El status solo no basta. */
function hasAcceptedInvite(member: EnsembleMemberOut) {
    return Boolean(member.has_password);
}

function isInvitePending(member: EnsembleMemberOut) {
    return member.status !== "inactive" && !hasAcceptedInvite(member);
}

function getDisplayState(member: EnsembleMemberOut): DisplayState {
    if (member.status === "inactive") {
        return {
            key: "inactive",
            label: "Inactivo",
            color: "default",
            detail: null,
        };
    }
    if (hasAcceptedInvite(member)) {
        const joined = formatJoinedDate(member.joined_at);
        return {
            key: "accepted",
            label: "Aceptó",
            color: "success",
            detail: joined
                ? `Contraseña creada · ${joined}`
                : "Ya creó su contraseña",
        };
    }
    if (member.invite_expired) {
        const expired = formatJoinedDate(member.invite_expires_at);
        return {
            key: "expired",
            label: "Enlace expirado",
            color: "danger",
            detail: expired ? `Venció el ${expired}` : "Regenera el enlace",
        };
    }
    const invited = formatJoinedDate(member.invited_at);
    return {
        key: "pending",
        label: "Pendiente",
        color: "warning",
        detail: invited
            ? `Invitado el ${invited}`
            : "Esperando que cree su contraseña",
    };
}

export default function MusicianMembersView() {
    const [members, setMembers] = useState<EnsembleMemberOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<EnsembleMemberOut | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [createdMember, setCreatedMember] = useState<EnsembleMemberOut | null>(
        null,
    );
    const [workingId, setWorkingId] = useState<string | null>(null);
    const [historyMember, setHistoryMember] = useState<EnsembleMemberOut | null>(
        null,
    );

    const refresh = useCallback(async () => {
        const data = await listEnsembleMembers({
            q: query.trim() || undefined,
        });
        setMembers(data);
    }, [query]);

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
        });
        refresh()
            .catch((error) => {
                if (cancelled) return;
                addToast({
                    title: "No se pudieron cargar los integrantes",
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

    const counts = useMemo(() => {
        return {
            all: members.length,
            active: members.filter(
                (m) => hasAcceptedInvite(m) && m.status !== "inactive",
            ).length,
            invited: members.filter(
                (m) => isInvitePending(m) && !m.invite_expired,
            ).length,
            expired: members.filter(
                (m) => isInvitePending(m) && Boolean(m.invite_expired),
            ).length,
            inactive: members.filter((m) => m.status === "inactive").length,
        };
    }, [members]);

    const filteredMembers = useMemo(() => {
        return members.filter((member) => {
            if (statusFilter === "all") return true;
            if (statusFilter === "active") {
                return hasAcceptedInvite(member) && member.status !== "inactive";
            }
            if (statusFilter === "invited") {
                return isInvitePending(member) && !member.invite_expired;
            }
            if (statusFilter === "expired") {
                return isInvitePending(member) && Boolean(member.invite_expired);
            }
            if (statusFilter === "inactive") {
                return member.status === "inactive";
            }
            return true;
        });
    }, [members, statusFilter]);

    function openCreate() {
        setEditing(null);
        setCreatedMember(null);
        setForm(emptyForm);
        setInviteLink(null);
        setIsFormOpen(true);
    }

    function openEdit(member: EnsembleMemberOut) {
        setEditing(member);
        setCreatedMember(null);
        setForm({
            fullname: member.fullname,
            email: member.email,
            phone: member.phone ?? "",
            specialties: [...member.specialties],
            notes: member.notes ?? "",
        });
        setInviteLink(member.invite_url);
        setIsFormOpen(true);
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!form.fullname.trim() || !form.email.trim()) {
            addToast({
                title: "Completa nombre y correo",
                color: "warning",
            });
            return;
        }
        if (form.specialties.length === 0) {
            addToast({
                title: "Agrega al menos una especialidad",
                color: "warning",
            });
            return;
        }

        setIsSaving(true);
        try {
            if (editing) {
                const updated = await updateEnsembleMember(editing.id, {
                    fullname: form.fullname.trim(),
                    phone: form.phone.trim() || null,
                    specialties: form.specialties,
                    notes: form.notes.trim() || null,
                });
                setMembers((prev) =>
                    prev.map((m) => (m.id === updated.id ? updated : m)),
                );
                setEditing(updated);
                setInviteLink(updated.invite_url);
                addToast({ title: "Integrante actualizado", color: "success" });
                setIsFormOpen(false);
            } else {
                const created = await createEnsembleMember({
                    fullname: form.fullname.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim() || null,
                    specialties: form.specialties,
                    notes: form.notes.trim() || null,
                });
                setMembers((prev) => [created, ...prev]);
                setInviteLink(created.invite_url);
                setCreatedMember(created);
                addToast({
                    title: created.has_password
                        ? "Integrante agregado"
                        : "Invitación lista",
                    description: created.has_password
                        ? "Ya tenía contraseña. Se considera que aceptó la invitación."
                        : "Copia el enlace para que cree su contraseña y acepte.",
                    color: "success",
                });
                if (created.has_password) {
                    setIsFormOpen(false);
                    setCreatedMember(null);
                }
            }
            await refresh();
        } catch (error) {
            addToast({
                title: "No se pudo guardar",
                description:
                    error instanceof ApiError
                        ? error.message
                        : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    }

    async function handleResend(member: EnsembleMemberOut) {
        setWorkingId(member.id);
        try {
            const updated = await resendEnsembleInvite(member.id);
            setMembers((prev) =>
                prev.map((m) => (m.id === updated.id ? updated : m)),
            );
            setInviteLink(updated.invite_url);
            setEditing(updated);
            setCreatedMember(null);
            setForm({
                fullname: updated.fullname,
                email: updated.email,
                phone: updated.phone ?? "",
                specialties: [...updated.specialties],
                notes: updated.notes ?? "",
            });
            setIsFormOpen(true);
            addToast({
                title: "Enlace regenerado",
                description: "Cópialo y envíaselo al integrante.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo reenviar",
                description:
                    error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setWorkingId(null);
        }
    }

    async function handleDeactivate(member: EnsembleMemberOut) {
        setWorkingId(member.id);
        try {
            const updated = await deactivateEnsembleMember(member.id);
            setMembers((prev) =>
                prev.map((m) => (m.id === updated.id ? updated : m)),
            );
            if (editing?.id === member.id) {
                setEditing(updated);
                setInviteLink(updated.invite_url);
            }
            addToast({ title: "Integrante desactivado", color: "warning" });
        } catch (error) {
            addToast({
                title: "No se pudo desactivar",
                description:
                    error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setWorkingId(null);
        }
    }

    async function handleReactivate(member: EnsembleMemberOut) {
        setWorkingId(member.id);
        try {
            const updated = await updateEnsembleMember(member.id, {
                status: hasAcceptedInvite(member) ? "active" : "invited",
            });
            setMembers((prev) =>
                prev.map((m) => (m.id === updated.id ? updated : m)),
            );
            if (editing?.id === member.id) {
                setEditing(updated);
                setInviteLink(updated.invite_url);
            }
            addToast({ title: "Integrante reactivado", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo reactivar",
                description:
                    error instanceof ApiError ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setWorkingId(null);
        }
    }

    async function copyInvite(url: string | null | undefined) {
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

    const filters: { key: StatusFilter; label: string; count: number }[] = [
        { key: "all", label: "Todos", count: counts.all },
        { key: "active", label: "Aceptaron", count: counts.active },
        { key: "invited", label: "Pendientes", count: counts.invited },
        { key: "expired", label: "Expirados", count: counts.expired },
        { key: "inactive", label: "Inactivos", count: counts.inactive },
    ];

    const editingState = editing ? getDisplayState(editing) : null;
    const showCreateSuccess = Boolean(createdMember && !createdMember.has_password);
    const modalInviteLink =
        inviteLink ||
        createdMember?.invite_url ||
        (editing && isInvitePending(editing) ? editing.invite_url : null) ||
        null;

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <div className={UI.skeleton + " h-32"} />
                <div className={UI.skeleton + " h-64"} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <section className={UI.pageHero}>
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                        <Chip color="primary" variant="flat" size="sm" className="mb-3">
                            Tu agrupación
                        </Chip>
                        <h1 className={UI.pageTitle}>Integrantes</h1>
                        <p className={UI.pageSubtitle}>
                            Solo se considera que aceptaron cuando crean su contraseña.
                            Hasta entonces puedes copiar y reenviar el enlace.
                        </p>
                    </div>
                    <Button
                        color="primary"
                        radius="lg"
                        className={UI.primaryButton}
                        startContent={
                            <Icon icon="material-symbols:person-add" width={20} />
                        }
                        onPress={openCreate}
                    >
                        Agregar integrante
                    </Button>
                </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Buscar por nombre o correo"
                    variant="bordered"
                    radius="lg"
                    startContent={
                        <Icon
                            icon="material-symbols:search"
                            width={18}
                            className="text-default-400"
                        />
                    }
                    className="sm:max-w-sm"
                    classNames={UI.authInput}
                />
                <div className="flex flex-wrap gap-2">
                    {filters.map((filter) => (
                        <Button
                            key={filter.key}
                            size="sm"
                            radius="lg"
                            variant={statusFilter === filter.key ? "flat" : "light"}
                            color={statusFilter === filter.key ? "primary" : "default"}
                            onPress={() => setStatusFilter(filter.key)}
                        >
                            {filter.label}
                            <span className="text-default-500 ml-1">{filter.count}</span>
                        </Button>
                    ))}
                </div>
            </div>

            {filteredMembers.length === 0 ? (
                <div className="rounded-4xl border border-dashed border-default-300 bg-content1/60 px-6 py-14 text-center">
                    <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon icon="material-symbols:groups" width={28} />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        {query || statusFilter !== "all"
                            ? "Nadie coincide con tu búsqueda"
                            : "Aún no tienes integrantes"}
                    </h2>
                    <p className="mt-2 text-sm text-default-500 max-w-md mx-auto">
                        {query || statusFilter !== "all"
                            ? "Prueba otro filtro o limpia la búsqueda."
                            : "Agrega a tu equipo con nombre, correo y especialidad. Ellos aceptan al crear su contraseña."}
                    </p>
                    {!query && statusFilter === "all" ? (
                        <Button
                            className="mt-5"
                            color="primary"
                            radius="lg"
                            onPress={openCreate}
                        >
                            Agregar primer integrante
                        </Button>
                    ) : (
                        <Button
                            className="mt-5"
                            variant="flat"
                            radius="lg"
                            onPress={() => {
                                setQuery("");
                                setStatusFilter("all");
                            }}
                        >
                            Limpiar filtros
                        </Button>
                    )}
                </div>
            ) : (
                <div className={UI.tablePanel}>
                    <div
                        className={`hidden ${TABLE_GRID} px-4 py-3 text-xs font-medium uppercase tracking-wide text-default-400 border-b border-default-200`}
                    >
                        <span>Integrante</span>
                        <span>Especialidades</span>
                        <span>Estado</span>
                        <span>Contacto</span>
                        <span className="text-right">Acciones</span>
                    </div>
                    <ul className="divide-y divide-default-200">
                        {filteredMembers.map((member) => {
                            const meta = getDisplayState(member);
                            const pending = isInvitePending(member);
                            return (
                                <li
                                    key={member.id}
                                    className={`px-4 py-4 flex flex-col gap-3 ${TABLE_GRID}`}
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wide text-default-400 md:hidden mb-1">
                                            Integrante
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={member.fullname} size="sm" className="flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground truncate">
                                                    {member.fullname}
                                                </p>
                                                <p className="text-sm text-default-500 truncate">
                                                    {member.email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wide text-default-400 md:hidden mb-1">
                                            Especialidades
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {member.specialties.slice(0, 3).map((spec) => (
                                                <Chip
                                                    key={spec}
                                                    size="sm"
                                                    variant="flat"
                                                    startContent={
                                                        <Icon
                                                            icon={getInstrumentIcon(spec)}
                                                            width={14}
                                                        />
                                                    }
                                                >
                                                    {spec}
                                                </Chip>
                                            ))}
                                            {member.specialties.length > 3 ? (
                                                <Chip size="sm" variant="flat">
                                                    +{member.specialties.length - 3}
                                                </Chip>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wide text-default-400 md:hidden mb-1">
                                            Estado
                                        </p>
                                        <Chip size="sm" color={meta.color} variant="flat">
                                            {meta.label}
                                        </Chip>
                                        {meta.detail ? (
                                            <p className="text-xs text-default-500 mt-1 leading-snug">
                                                {meta.detail}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="min-w-0 text-sm text-default-600">
                                        <p className="text-xs font-medium uppercase tracking-wide text-default-400 md:hidden mb-1">
                                            Contacto
                                        </p>
                                        <span className="truncate block">
                                            {member.phone || "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center md:justify-end gap-0.5">
                                        <Tooltip content="Historial de pagos" placement="top">
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="light"
                                                color="secondary"
                                                radius="lg"
                                                aria-label="Historial de pagos"
                                                onPress={() => setHistoryMember(member)}
                                            >
                                                <Icon
                                                    icon="material-symbols:receipt-long"
                                                    width={18}
                                                />
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content="Editar" placement="top">
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="light"
                                                radius="lg"
                                                aria-label="Editar integrante"
                                                onPress={() => openEdit(member)}
                                            >
                                                <Icon
                                                    icon="material-symbols:edit-outline"
                                                    width={18}
                                                />
                                            </Button>
                                        </Tooltip>
                                        {pending && member.invite_url ? (
                                            <Tooltip
                                                content="Copiar enlace"
                                                placement="top"
                                            >
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    radius="lg"
                                                    aria-label="Copiar enlace de invitación"
                                                    onPress={() =>
                                                        copyInvite(member.invite_url)
                                                    }
                                                >
                                                    <Icon
                                                        icon="material-symbols:content-copy-outline"
                                                        width={18}
                                                    />
                                                </Button>
                                            </Tooltip>
                                        ) : null}
                                        {pending ? (
                                            <Tooltip
                                                content={
                                                    meta.key === "expired"
                                                        ? "Regenerar enlace"
                                                        : "Reenviar enlace"
                                                }
                                                placement="top"
                                            >
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color={
                                                        meta.key === "expired"
                                                            ? "warning"
                                                            : "primary"
                                                    }
                                                    radius="lg"
                                                    aria-label={
                                                        meta.key === "expired"
                                                            ? "Regenerar enlace"
                                                            : "Reenviar enlace"
                                                    }
                                                    isLoading={workingId === member.id}
                                                    onPress={() => handleResend(member)}
                                                >
                                                    <Icon
                                                        icon={
                                                            meta.key === "expired"
                                                                ? "material-symbols:refresh"
                                                                : "material-symbols:forward-to-inbox-outline"
                                                        }
                                                        width={18}
                                                    />
                                                </Button>
                                            </Tooltip>
                                        ) : null}
                                        {member.status === "inactive" ? (
                                            <Tooltip
                                                content="Reactivar"
                                                placement="top"
                                            >
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="success"
                                                    radius="lg"
                                                    aria-label="Reactivar integrante"
                                                    isLoading={workingId === member.id}
                                                    onPress={() =>
                                                        handleReactivate(member)
                                                    }
                                                >
                                                    <Icon
                                                        icon="material-symbols:person-check-outline"
                                                        width={18}
                                                    />
                                                </Button>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip
                                                content="Desactivar"
                                                placement="top"
                                            >
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="danger"
                                                    radius="lg"
                                                    aria-label="Desactivar integrante"
                                                    isLoading={workingId === member.id}
                                                    onPress={() =>
                                                        handleDeactivate(member)
                                                    }
                                                >
                                                    <Icon
                                                        icon="material-symbols:person-off-outline"
                                                        width={18}
                                                    />
                                                </Button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <Modal
                isOpen={isFormOpen}
                onOpenChange={(open) => {
                    setIsFormOpen(open);
                    if (!open) {
                        setCreatedMember(null);
                        setInviteLink(null);
                    }
                }}
                size="2xl"
                scrollBehavior="inside" placement="bottom-center"
                backdrop="blur"
            >
                <ModalContent>
                    {(onClose) => (
                        <form onSubmit={handleSubmit} className="contents">
                            <ModalHeader className="flex flex-col gap-1">
                                <span>
                                    {showCreateSuccess
                                        ? "Invitación lista"
                                        : editing
                                          ? "Editar integrante"
                                          : "Agregar integrante"}
                                </span>
                                <span className="text-sm font-normal text-default-500">
                                    {showCreateSuccess
                                        ? "Comparte el enlace. Aceptará la invitación al crear su contraseña."
                                        : editing
                                          ? hasAcceptedInvite(editing)
                                              ? "Ya aceptó creando su contraseña. Puedes actualizar sus datos."
                                              : "Aún no creó su contraseña. Puedes copiar o regenerar el enlace."
                                          : "Completa sus datos. La contraseña la crea el integrante con el enlace."}
                                </span>
                            </ModalHeader>
                            <ModalBody className="gap-5">
                                {showCreateSuccess && createdMember ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                                                    <Icon
                                                        icon="material-symbols:check-circle"
                                                        width={22}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground">
                                                        {createdMember.fullname}
                                                    </p>
                                                    <p className="text-sm text-default-600">
                                                        {createdMember.email}
                                                    </p>
                                                    <Chip
                                                        size="sm"
                                                        color="warning"
                                                        variant="flat"
                                                        className="mt-2"
                                                    >
                                                        Pendiente de aceptar
                                                    </Chip>
                                                </div>
                                            </div>
                                        </div>

                                        {modalInviteLink ? (
                                            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex flex-col gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        Enlace de invitación
                                                    </p>
                                                    <p className="text-xs text-default-500 mt-1">
                                                        Válido por 14 días. Podrás
                                                        copiarlo de nuevo mientras no
                                                        cree su contraseña.
                                                    </p>
                                                </div>
                                                <p className="text-xs text-default-700 break-all rounded-xl bg-content1/80 px-3 py-2 border border-default-200">
                                                    {modalInviteLink}
                                                </p>
                                                <Button
                                                    color="primary"
                                                    radius="lg"
                                                    className="self-start"
                                                    startContent={
                                                        <Icon
                                                            icon="material-symbols:content-copy"
                                                            width={18}
                                                        />
                                                    }
                                                    onPress={() =>
                                                        copyInvite(modalInviteLink)
                                                    }
                                                >
                                                    Copiar enlace
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <>
                                        {editing && editingState ? (
                                            <div
                                                className={
                                                    editingState.key === "accepted"
                                                        ? "rounded-2xl border border-success/30 bg-success/10 px-4 py-3"
                                                        : editingState.key === "expired"
                                                          ? "rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3"
                                                          : editingState.key ===
                                                              "inactive"
                                                            ? "rounded-2xl border border-default-300 bg-default-100 px-4 py-3"
                                                            : "rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3"
                                                }
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Chip
                                                        size="sm"
                                                        color={editingState.color}
                                                        variant="flat"
                                                    >
                                                        {editingState.label}
                                                    </Chip>
                                                    {editingState.detail ? (
                                                        <span className="text-sm text-default-600">
                                                            {editingState.detail}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm text-default-600 mt-2">
                                                    {editingState.key === "accepted"
                                                        ? "Aceptó la invitación al crear su contraseña."
                                                        : editingState.key === "expired"
                                                          ? "El enlace venció. Regenera uno nuevo para que pueda aceptar."
                                                          : editingState.key ===
                                                              "inactive"
                                                            ? "Está desactivado y no aparecerá para convocar a shows."
                                                            : "Todavía no creó su contraseña. Usa las acciones de abajo."}
                                                </p>
                                            </div>
                                        ) : null}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Nombre completo"
                                                placeholder="Ej. Carlos Mendoza"
                                                variant="bordered"
                                                value={form.fullname}
                                                onValueChange={(value) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        fullname: value,
                                                    }))
                                                }
                                                isRequired
                                                classNames={UI.authInput}
                                                className="sm:col-span-2"
                                            />
                                            <Input
                                                label="Correo electrónico"
                                                type="email"
                                                placeholder="integrante@email.com"
                                                description={
                                                    editing
                                                        ? "El correo no se puede cambiar"
                                                        : "Ahí recibirá la invitación"
                                                }
                                                variant="bordered"
                                                value={form.email}
                                                onValueChange={(value) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        email: value,
                                                    }))
                                                }
                                                isRequired
                                                isDisabled={Boolean(editing)}
                                                classNames={UI.authInput}
                                            />
                                            <Input
                                                label="Teléfono"
                                                placeholder="Opcional"
                                                variant="bordered"
                                                value={form.phone}
                                                onValueChange={(value) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        phone: value,
                                                    }))
                                                }
                                                classNames={UI.authInput}
                                            />
                                        </div>

                                        <ChipListInput
                                            label="Especialidad(es)"
                                            values={form.specialties}
                                            onChange={(specialties) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    specialties,
                                                }))
                                            }
                                            placeholder="Ej. Trompeta"
                                            suggestions={INSTRUMENT_SUGGESTIONS}
                                        />

                                        <Textarea
                                            label="Notas internas"
                                            placeholder="Solo tú las ves (opcional)"
                                            variant="bordered"
                                            value={form.notes}
                                            onValueChange={(value) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    notes: value,
                                                }))
                                            }
                                            minRows={2}
                                        />

                                        {editing && isInvitePending(editing) ? (
                                            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 flex flex-col gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        Enlace de invitación
                                                    </p>
                                                    <p className="text-xs text-default-500 mt-1">
                                                        Disponible hasta que cree su
                                                        contraseña.
                                                    </p>
                                                </div>
                                                {modalInviteLink ? (
                                                    <p className="text-xs text-default-700 break-all rounded-xl bg-content1/80 px-3 py-2 border border-default-200">
                                                        {modalInviteLink}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-warning">
                                                        No hay enlace vigente. Regenera
                                                        uno nuevo.
                                                    </p>
                                                )}
                                                {editing.invite_expires_at ? (
                                                    <p className="text-xs text-default-500">
                                                        {editing.invite_expired
                                                            ? `Venció el ${formatJoinedDate(editing.invite_expires_at) ?? "—"}`
                                                            : `Válido hasta ${formatJoinedDate(editing.invite_expires_at) ?? "—"}`}
                                                    </p>
                                                ) : null}
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        color="primary"
                                                        variant="flat"
                                                        radius="lg"
                                                        isDisabled={!modalInviteLink}
                                                        startContent={
                                                            <Icon
                                                                icon="material-symbols:content-copy"
                                                                width={16}
                                                            />
                                                        }
                                                        onPress={() =>
                                                            copyInvite(modalInviteLink)
                                                        }
                                                    >
                                                        Copiar enlace
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        color={
                                                            editingState?.key ===
                                                            "expired"
                                                                ? "warning"
                                                                : "default"
                                                        }
                                                        radius="lg"
                                                        isLoading={
                                                            workingId === editing.id
                                                        }
                                                        startContent={
                                                            <Icon
                                                                icon={
                                                                    editingState?.key ===
                                                                    "expired"
                                                                        ? "material-symbols:refresh"
                                                                        : "material-symbols:forward-to-inbox-outline"
                                                                }
                                                                width={16}
                                                            />
                                                        }
                                                        onPress={() =>
                                                            handleResend(editing)
                                                        }
                                                    >
                                                        {editingState?.key === "expired"
                                                            ? "Regenerar enlace"
                                                            : "Reenviar enlace"}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : null}

                                        {editing ? (
                                            <div className="rounded-2xl border border-default-200 px-4 py-4 flex flex-col gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        Estado en la agrupación
                                                    </p>
                                                    <p className="text-xs text-default-500 mt-1">
                                                        {editing.status === "inactive"
                                                            ? "Reactívalo para volver a convocarlo a shows."
                                                            : "Al desactivarlo dejará de aparecer al convocar."}
                                                    </p>
                                                </div>
                                                {editing.status === "inactive" ? (
                                                    <Button
                                                        size="sm"
                                                        color="success"
                                                        variant="flat"
                                                        radius="lg"
                                                        className="self-start"
                                                        isLoading={
                                                            workingId === editing.id
                                                        }
                                                        startContent={
                                                            <Icon
                                                                icon="material-symbols:person-check-outline"
                                                                width={16}
                                                            />
                                                        }
                                                        onPress={() =>
                                                            handleReactivate(editing)
                                                        }
                                                    >
                                                        Reactivar integrante
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        color="danger"
                                                        variant="flat"
                                                        radius="lg"
                                                        className="self-start"
                                                        isLoading={
                                                            workingId === editing.id
                                                        }
                                                        startContent={
                                                            <Icon
                                                                icon="material-symbols:person-off-outline"
                                                                width={16}
                                                            />
                                                        }
                                                        onPress={() =>
                                                            handleDeactivate(editing)
                                                        }
                                                    >
                                                        Desactivar integrante
                                                    </Button>
                                                )}
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </ModalBody>
                            <ModalFooter className="flex flex-wrap gap-2">
                                <Button
                                    variant="light"
                                    onPress={() => {
                                        onClose();
                                        setCreatedMember(null);
                                        setInviteLink(null);
                                    }}
                                >
                                    {showCreateSuccess ? "Listo" : "Cancelar"}
                                </Button>
                                {!showCreateSuccess ? (
                                    <Button
                                        color="primary"
                                        type="submit"
                                        isLoading={isSaving}
                                        className={UI.primaryButton}
                                    >
                                        {editing
                                            ? "Guardar cambios"
                                            : "Enviar invitación"}
                                    </Button>
                                ) : (
                                    <Button
                                        color="primary"
                                        variant="flat"
                                        radius="lg"
                                        startContent={
                                            <Icon
                                                icon="material-symbols:content-copy"
                                                width={16}
                                            />
                                        }
                                        onPress={() => copyInvite(modalInviteLink)}
                                        isDisabled={!modalInviteLink}
                                    >
                                        Copiar enlace
                                    </Button>
                                )}
                            </ModalFooter>
                        </form>
                    )}
                </ModalContent>
            </Modal>

            <MemberPayoutHistoryModal
                member={historyMember}
                isOpen={Boolean(historyMember)}
                onOpenChange={(open) => {
                    if (!open) setHistoryMember(null);
                }}
            />
        </div>
    );
}



