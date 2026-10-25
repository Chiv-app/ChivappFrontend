"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useCallback, useEffect, useState } from "react";
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
    Select,
    SelectItem,
    Textarea,
    addToast,
    useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
    approveContractorProfile,
    getAdminContractors,
    getContractorAdminDetail,
    moderateContractorProfile,
    rejectContractorProfile,
} from "@/lib/admin";
import { formatRelativeTime } from "@/lib/format-time";
import { resolveUploadUrl } from "@/lib/uploads";
import type { ContractorProfileAdminOut, ProfileStatus } from "@/types/api";

const STATUS_OPTIONS = [
    { key: "all", label: "Todos" },
    { key: "pending_review", label: "Pendientes" },
    { key: "published", label: "Publicados" },
    { key: "rejected", label: "Rechazados" },
    { key: "draft", label: "Borradores" },
];

const STATUS_LABELS: Record<string, string> = { draft: "Borrador", pending_review: "Perfil en revisión", published: "Publicado", rejected: "Rechazado" };

const STATUS_COLOR: Record<
    string,
    "default" | "warning" | "success" | "danger" | "primary"
> = {
    draft: "default",
    pending_review: "warning",
    published: "success",
    rejected: "danger",
};

const PAGE_SIZE = 100;

export default function AdminContractorsPage() {
    const [profiles, setProfiles] = useState<ContractorProfileAdminOut[]>([]);
    const [selected, setSelected] = useState<ContractorProfileAdminOut | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [status, setStatus] = useState(() => {
        if (typeof window === "undefined") return "pending_review";
        const param = new URLSearchParams(window.location.search).get("status");
        return STATUS_OPTIONS.some((opt) => opt.key === param) ? (param as string) : "pending_review";
    });
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        id: string;
        name: string;
        type: "approve" | "unpublish";
    } | null>(null);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const rejectModal = useDisclosure();

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await getAdminContractors({
                status: status === "all" ? undefined : (status as ProfileStatus),
                q: q.trim() || undefined,
                skip: 0,
                limit: PAGE_SIZE,
            });
            setProfiles(data);
            setHasMore(data.length === PAGE_SIZE);
        } catch (err) {
            setProfiles([]);
            setHasMore(false);
            setLoadError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar los perfiles de contratistas.",
            );
        } finally {
            setLoading(false);
        }
    }, [q, status]);

    async function loadMore() {
        setLoadingMore(true);
        try {
            const data = await getAdminContractors({
                status: status === "all" ? undefined : (status as ProfileStatus),
                q: q.trim() || undefined,
                skip: profiles.length,
                limit: PAGE_SIZE,
            });
            setProfiles((current) => [...current, ...data]);
            setHasMore(data.length === PAGE_SIZE);
        } catch (err) {
            addToast({
                title: "No se pudieron cargar más perfiles",
                description: err instanceof Error ? err.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setLoadingMore(false);
        }
    }

    useEffect(() => {
        const t = window.setTimeout(() => {
            void load();
        }, 250);
        return () => window.clearTimeout(t);
    }, [load]);

    async function handleApprove(id: string) {
        await approveContractorProfile(id);
        addToast({ title: "Perfil aprobado", color: "success" });
        setSelected(null);
        await load();
    }

    async function handleReject() {
        if (!selected) return;
        await rejectContractorProfile(selected.id, {
            rejection_reason: rejectionReason,
        });
        addToast({ title: "Perfil rechazado", color: "warning" });
        rejectModal.onClose();
        setRejectionReason("");
        setSelected(null);
        await load();
    }

    async function handleModerate(
        id: string,
        action: "unpublish" | "request_resubmit",
    ) {
        await moderateContractorProfile(id, {
            action,
            reason: rejectionReason || null,
        });
        addToast({
            title: action === "unpublish" ? "Perfil despublicado" : "Reenvío solicitado",
            color: "warning",
        });
        setSelected(null);
        setRejectionReason("");
        await load();
    }
    async function openDetail(id: string) {
        try {
            setSelected(await getContractorAdminDetail(id));
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Intenta de nuevo.";
            addToast({ title: "Error al cargar detalle", description: message, color: "danger" });
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Moderación de contratistas"
                description="Valida identidad, publica o retira perfiles y controla quién puede reservar."
                actions={
                    <Chip color="primary" variant="flat">
                        {profiles.length} resultados
                    </Chip>
                }
            />

            {loadError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar los perfiles
                        </p>
                        <p className="text-xs text-default-600">{loadError}</p>
                    </div>
                    <Button size="sm" color="danger" variant="flat" onPress={load}>
                        Reintentar
                    </Button>
                </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
                <Input
                    label="Buscar"
                    placeholder="Nombre o email..."
                    value={q}
                    onValueChange={setQ}
                    variant="bordered"
                    className="flex-1"
                />
                <Select
                    label="Estado"
                    selectedKeys={new Set([status])}
                    onSelectionChange={(keys) => {
                        if (keys === "all") return;
                        setStatus(Array.from(keys)[0]?.toString() ?? "all");
                    }}
                    variant="bordered"
                    className="sm:w-56"
                >
                    {STATUS_OPTIONS.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                    ))}
                </Select>
                <Button color="primary" radius="lg" className="sm:self-end" onPress={load}>
                    Actualizar
                </Button>
            </div>

            {loading ? (
                <div className="h-40 rounded-3xl border border-default-200 animate-pulse" />
            ) : profiles.length === 0 ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="p-8 text-center text-default-500">
                        {loadError
                            ? "No se pudieron cargar los perfiles."
                            : "No hay perfiles con este filtro."}
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {profiles.map((profile) => (
                        <Card
                            key={profile.id}
                            className="border border-default-200/70 shadow-soft"
                        >
                            <CardBody className="p-6 gap-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="text-xl font-semibold text-foreground truncate">
                                            {profile.user_fullname}
                                        </h3>
                                        <p className="text-sm text-default-500 truncate">
                                            {profile.user_email}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            color={STATUS_COLOR[profile.status] ?? "default"}
                                        >
                                            {STATUS_LABELS[profile.status] ?? profile.status}
                                        </Chip>
                                        {profile.submitted_at ? (
                                            <span className="text-xs text-default-500">
                                                Enviado {formatRelativeTime(profile.submitted_at)}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="text-sm text-default-600 line-clamp-3">
                                    {profile.bio || "Sin biografía"}
                                </p>
                                <p className="text-xs text-default-500">
                                    {profile.document_type} {profile.document_number} ·{" "}
                                    {profile.city || "Sin ciudad"}
                                </p>
                                {profile.status === "rejected" && profile.rejection_reason ? (
                                    <p className="text-sm text-danger">
                                        Motivo del rechazo: {profile.rejection_reason}
                                    </p>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={() => openDetail(profile.id)}
                                    >
                                        Ver detalle
                                    </Button>
                                    {profile.status === "pending_review" ||
                                    profile.status === "rejected" ? (
                                        <Button
                                            size="sm"
                                            color="success"
                                            onPress={() =>
                                                setConfirmAction({
                                                    id: profile.id,
                                                    name: profile.user_fullname || profile.user_email || "este contratista",
                                                    type: "approve",
                                                })
                                            }
                                        >
                                            Aprobar
                                        </Button>
                                    ) : null}
                                    {profile.status === "pending_review" ||
                                    profile.status === "published" ? (
                                        <Button
                                            size="sm"
                                            color="danger"
                                            variant="flat"
                                            onPress={() => {
                                                setSelected(profile);
                                                rejectModal.onOpen();
                                            }}
                                        >
                                            Rechazar
                                        </Button>
                                    ) : null}
                                    {profile.status === "published" ? (
                                        <Button
                                            size="sm"
                                            color="warning"
                                            variant="flat"
                                            onPress={() =>
                                                setConfirmAction({
                                                    id: profile.id,
                                                    name: profile.user_fullname || profile.user_email || "este contratista",
                                                    type: "unpublish",
                                                })
                                            }
                                        >
                                            Despublicar
                                        </Button>
                                    ) : null}
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {hasMore && !loading ? (
                <div className="flex justify-center">
                    <Button
                        variant="flat"
                        color="primary"
                        radius="lg"
                        isLoading={loadingMore}
                        onPress={loadMore}
                    >
                        Cargar más ({profiles.length} mostrados)
                    </Button>
                </div>
            ) : null}

            <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />} isOpen={!!selected && !rejectModal.isOpen} onOpenChange={(open) => { if (!open) setSelected(null); }} size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                {selected?.user_fullname}
                            </ModalHeader>
                            <ModalBody>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-default-600">
                                    <p>
                                        <strong className="text-foreground">Email:</strong>{" "}
                                        {selected?.user_email}
                                    </p>
                                    <p>
                                        <strong className="text-foreground">Teléfono:</strong>{" "}
                                        {selected?.user_phone || "—"}
                                    </p>
                                    <p>
                                        <strong className="text-foreground">Documento:</strong>{" "}
                                        {selected?.document_type} {selected?.document_number}
                                    </p>
                                    <p>
                                        <strong className="text-foreground">Ciudad:</strong>{" "}
                                        {selected?.city || "—"}
                                    </p>
                                    <p className="md:col-span-2">
                                        <strong className="text-foreground">Dirección:</strong>{" "}
                                        {selected?.address || "—"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3 pt-2">
                                    {selected?.id_document_url ? (
                                        <a
                                            href={resolveUploadUrl(selected.id_document_url) ?? "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-2 text-sm font-medium text-primary hover:bg-default-100 transition-colors"
                                        >
                                            <Icon icon="material-symbols:badge-outline" width={18} />
                                            <span>Ver documento de identidad</span>
                                            <Icon icon="material-symbols:open-in-new" width={14} className="text-default-400" />
                                        </a>
                                    ) : null}
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex-wrap justify-between">
                                <div className="flex gap-2">
                                    {selected?.status === "published" ? (
                                        <>
                                            <Button
                                                size="sm"
                                                color="warning"
                                                variant="flat"
                                                onPress={() => handleModerate(selected.id, "unpublish")}
                                            >
                                                Despublicar
                                            </Button>
                                            <Button
                                                size="sm"
                                                color="secondary"
                                                variant="flat"
                                                onPress={() => handleModerate(selected.id, "request_resubmit")}
                                            >
                                                Pedir reenvío
                                            </Button>
                                        </>
                                    ) : null}
                                </div>
                                <Button color="primary" variant="light" onPress={onClose}>
                                    Cerrar
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />} isOpen={rejectModal.isOpen} onOpenChange={rejectModal.onOpenChange}>
                <ModalContent>
                    <ModalHeader>Rechazar perfil</ModalHeader>
                    <ModalBody>
                        <Textarea
                            label="Motivo del rechazo"
                            value={rejectionReason}
                            onValueChange={setRejectionReason}
                            variant="bordered"
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={rejectModal.onClose}>
                            Cancelar
                        </Button>
                        <Button color="danger" onPress={handleReject}>
                            Rechazar perfil
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <ConfirmDialog
                isOpen={confirmAction != null}
                onOpenChange={(open) => {
                    if (!open) setConfirmAction(null);
                }}
                title={
                    confirmAction?.type === "approve"
                        ? "¿Aprobar perfil de contratista?"
                        : "¿Despublicar perfil de contratista?"
                }
                description={
                    confirmAction?.type === "approve"
                        ? `El perfil de ${confirmAction.name} quedará verificado y aprobado.`
                        : `El perfil de ${confirmAction?.name ?? "este contratista"} quedará despublicado.`
                }
                confirmLabel={confirmAction?.type === "approve" ? "Aprobar perfil" : "Despublicar"}
                color={confirmAction?.type === "approve" ? "success" : "warning"}
                isLoading={confirmBusy}
                onConfirm={async () => {
                    if (!confirmAction) return;
                    setConfirmBusy(true);
                    try {
                        if (confirmAction.type === "approve") {
                            await handleApprove(confirmAction.id);
                        } else {
                            await handleModerate(confirmAction.id, "unpublish");
                        }
                        setConfirmAction(null);
                    } finally {
                        setConfirmBusy(false);
                    }
                }}
            />
        </div>
    );
}
