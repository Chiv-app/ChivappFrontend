"use client";

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
import {
    approveMusicianProfile,
    getAdminMusicians,
    getMusicianAdminDetail,
    moderateMusicianProfile,
    rejectMusicianProfile,
} from "@/lib/admin";
import { formatRelativeTime } from "@/lib/format-time";
import { resolveUploadUrl } from "@/lib/uploads";
import type { MusicianProfileAdminOut, ProfileStatus } from "@/types/api";

const STATUS_OPTIONS = [
    { key: "all", label: "Todos" },
    { key: "pending_review", label: "Pendientes" },
    { key: "published", label: "Publicados" },
    { key: "rejected", label: "Rechazados" },
    { key: "draft", label: "Borradores" },
];

const STATUS_LABELS: Record<string, string> = { draft: "Borrador", pending_review: "En revisiÃ³n", published: "Publicado", rejected: "Rechazado" };

const STATUS_COLOR: Record<
    string,
    "default" | "warning" | "success" | "danger" | "primary"
> = {
    draft: "default",
    pending_review: "warning",
    published: "success",
    rejected: "danger",
};

export default function AdminMusiciansPage() {
    const [profiles, setProfiles] = useState<MusicianProfileAdminOut[]>([]);
    const [selected, setSelected] = useState<MusicianProfileAdminOut | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [status, setStatus] = useState("pending_review");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const rejectModal = useDisclosure();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminMusicians({
                status: status === "all" ? undefined : (status as ProfileStatus),
                q: q.trim() || undefined,
                limit: 100,
            });
            setProfiles(data);
        } catch {
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    }, [q, status]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            void load();
        }, 250);
        return () => window.clearTimeout(t);
    }, [load]);

    async function handleApprove(id: string) {
        await approveMusicianProfile(id);
        addToast({ title: "Perfil aprobado", color: "success" });
        setSelected(null);
        await load();
    }

    async function handleReject() {
        if (!selected) return;
        await rejectMusicianProfile(selected.id, {
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
        await moderateMusicianProfile(id, {
            action,
            reason: rejectionReason || null,
        });
        addToast({
            title: action === "unpublish" ? "Perfil despublicado" : "ReenvÃ­o solicitado",
            color: "warning",
        });
        setSelected(null);
        setRejectionReason("");
        await load();
    }

    async function openDetail(id: string) {
        setSelected(await getMusicianAdminDetail(id));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="ModeraciÃ³n de mÃºsicos"
                description="Aprueba, rechaza, despublica o solicita correcciones sobre cualquier perfil."
                actions={
                    <Chip color="primary" variant="flat">
                        {profiles.length} resultados
                    </Chip>
                }
            />

            <div className="flex flex-col sm:flex-row gap-3">
                <Input
                    label="Buscar"
                    placeholder="Nombre artÃ­stico, emailâ€¦"
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
                        No hay perfiles con este filtro.
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
                                            {profile.stage_name}
                                        </h3>
                                        <p className="text-sm text-default-500 truncate">
                                            {profile.user_fullname} Â· {profile.user_email}
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
                                            <span className="text-xs text-default-400">
                                                Enviado {formatRelativeTime(profile.submitted_at)}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="text-sm text-default-600 line-clamp-3">
                                    {profile.bio}
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
                                            onPress={() => handleApprove(profile.id)}
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
                                                handleModerate(profile.id, "unpublish")
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

                        <Modal isOpen={!!selected && !rejectModal.isOpen} onOpenChange={(open) => { if (!open) setSelected(null); }} size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                {selected?.stage_name}
                            </ModalHeader>
                            <ModalBody>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-default-600">
                                    <p>
                                        <strong className="text-foreground">Ciudad:</strong>{" "}
                                        {selected?.location_city}
                                    </p>
                                    <p>
                                        <strong className="text-foreground">Zona:</strong>{" "}
                                        {selected?.location_zone}
                                    </p>
                                    <p>
                                        <strong className="text-foreground">Géneros:</strong>{" "}
                                        {selected?.genres?.join(", ") || "Ninguno"}
                                    </p>
                                    <p>
                                        <strong className="text-foreground">Instrumentos:</strong>{" "}
                                        {selected?.instruments?.join(", ") || "Ninguno"}
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
                                    {selected?.contract_pdf_url ? (
                                        <a
                                            href={resolveUploadUrl(selected.contract_pdf_url) ?? "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-2 text-sm font-medium text-primary hover:bg-default-100 transition-colors"
                                        >
                                            <Icon icon="material-symbols:picture-as-pdf" width={18} className="text-danger" />
                                            <span>Ver contrato PDF</span>
                                            <Icon icon="material-symbols:open-in-new" width={14} className="text-default-400" />
                                        </a>
                                    ) : null}
                                    {selected?.profile_image_url ? (
                                        <a
                                            href={resolveUploadUrl(selected.profile_image_url) ?? "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-2 text-sm font-medium text-primary hover:bg-default-100 transition-colors"
                                        >
                                            <Icon icon="material-symbols:image-outline" width={18} />
                                            <span>Ver foto de perfil</span>
                                            <Icon icon="material-symbols:open-in-new" width={14} className="text-default-400" />
                                        </a>
                                    ) : null}
                                </div>
                                {selected?.gallery_images && selected.gallery_images.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 pt-2">
                                        <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">
                                            Galería ({selected.gallery_images.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selected.gallery_images.map((gUrl, idx) => {
                                                const resolvedGUrl = resolveUploadUrl(gUrl);
                                                if (!resolvedGUrl) return null;
                                                    return (
                                                        <a
                                                            key={`${gUrl}-${idx}`}
                                                            href={resolvedGUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="group relative h-14 w-14 overflow-hidden rounded-lg border border-default-200"
                                                        title="Ver foto en tamaño completo"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={resolvedGUrl}
                                                            alt={`Galería ${idx + 1}`}
                                                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                                                            <Icon icon="material-symbols:open-in-new" width={14} className="text-white" />
                                                        </div>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}
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

            <Modal isOpen={rejectModal.isOpen} onOpenChange={rejectModal.onOpenChange}>
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
        </div>
    );
}



