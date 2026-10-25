"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
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
import AdminPageHeader from "@/components/admin/admin-page-header";
import { getAdminSupportTickets, respondAdminSupportTicket } from "@/lib/admin";
import { formatRelativeTime } from "@/lib/format-time";
import type { AdminSupportTicketOut, SupportTicketStatus } from "@/types/api";

const STATUS_OPTIONS: { key: "all" | SupportTicketStatus; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "open", label: "Recibidos" },
    { key: "in_progress", label: "En revisión" },
    { key: "resolved", label: "Resueltos" },
];

const STATUS_COLOR: Record<SupportTicketStatus, "warning" | "primary" | "success"> = {
    open: "warning",
    in_progress: "primary",
    resolved: "success",
};

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
    open: "Recibido",
    in_progress: "En revisión",
    resolved: "Resuelto",
};

const PAGE_SIZE = 100;

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<AdminSupportTicketOut[]>([]);
    const [status, setStatus] = useState<"all" | SupportTicketStatus>("open");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selected, setSelected] = useState<AdminSupportTicketOut | null>(null);
    const [response, setResponse] = useState("");
    const [nextStatus, setNextStatus] = useState<SupportTicketStatus>("resolved");
    const [isSaving, setIsSaving] = useState(false);
    const detailModal = useDisclosure();

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await getAdminSupportTickets({
                status: status === "all" ? undefined : status,
                skip: 0,
                limit: PAGE_SIZE,
            });
            setTickets(data);
            setHasMore(data.length === PAGE_SIZE);
        } catch (err) {
            setTickets([]);
            setHasMore(false);
            setLoadError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar los tickets de soporte.",
            );
        } finally {
            setLoading(false);
        }
    }, [status]);

    async function loadMore() {
        setLoadingMore(true);
        try {
            const data = await getAdminSupportTickets({
                status: status === "all" ? undefined : status,
                skip: tickets.length,
                limit: PAGE_SIZE,
            });
            setTickets((current) => [...current, ...data]);
            setHasMore(data.length === PAGE_SIZE);
        } catch (err) {
            addToast({
                title: "No se pudieron cargar más tickets",
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
        }, 0);
        return () => window.clearTimeout(t);
    }, [load]);

    function openTicket(ticket: AdminSupportTicketOut) {
        setSelected(ticket);
        setResponse(ticket.admin_response ?? "");
        setNextStatus(ticket.status === "open" ? "in_progress" : "resolved");
        detailModal.onOpen();
    }

    async function handleRespond() {
        if (!selected || !response.trim()) return;
        setIsSaving(true);
        try {
            await respondAdminSupportTicket(selected.id, {
                response: response.trim(),
                status: nextStatus,
            });
            addToast({ title: "Respuesta enviada", color: "success" });
            detailModal.onClose();
            setSelected(null);
            await load();
        } catch {
            addToast({ title: "No se pudo guardar la respuesta", color: "danger" });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Ayuda y comentarios"
                description="Comentarios y consultas enviados por usuarios y visitantes desde toda la plataforma."
                actions={
                    <Chip color="primary" variant="flat">
                        {tickets.length} resultados
                    </Chip>
                }
            />

            {loadError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar los comentarios
                        </p>
                        <p className="text-xs text-default-600">{loadError}</p>
                    </div>
                    <Button size="sm" color="danger" variant="flat" onPress={load}>
                        Reintentar
                    </Button>
                </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
                <Select
                    label="Estado"
                    selectedKeys={new Set([status])}
                    onSelectionChange={(keys) => {
                        if (keys === "all") return;
                        setStatus(
                            (Array.from(keys)[0]?.toString() as "all" | SupportTicketStatus) ??
                                "all",
                        );
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
            ) : tickets.length === 0 ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="p-8 text-center text-default-500">
                        {loadError
                            ? "No se pudieron cargar los comentarios."
                            : "No hay comentarios con este filtro."}
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {tickets.map((ticket) => (
                        <Card
                            key={ticket.id}
                            className="border border-default-200/70 shadow-soft"
                        >
                            <CardBody className="p-6 gap-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-semibold text-foreground truncate">
                                            {ticket.submitter_name ?? "Sin nombre"}
                                        </h3>
                                        <p className="text-sm text-default-500 truncate">
                                            {ticket.submitter_email ?? "Sin correo"}
                                            {!ticket.user_id ? " · Visitante" : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            color={STATUS_COLOR[ticket.status]}
                                        >
                                            {STATUS_LABEL[ticket.status]}
                                        </Chip>
                                        <span className="text-xs text-default-400">
                                            {formatRelativeTime(ticket.created_at)}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-default-600 line-clamp-3">
                                    {ticket.message}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={() => openTicket(ticket)}
                                    >
                                        Ver y responder
                                    </Button>
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
                        Cargar más ({tickets.length} mostrados)
                    </Button>
                </div>
            ) : null}

            <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />} isOpen={detailModal.isOpen} onOpenChange={detailModal.onOpenChange} size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Comentario</ModalHeader>
                            <ModalBody>
                                {selected ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="text-sm text-default-500 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                            <p>
                                                <strong className="text-foreground">De:</strong>{" "}
                                                {selected.submitter_name ?? "Sin nombre"} (
                                                {selected.submitter_email ?? "sin correo"})
                                            </p>
                                            <p>
                                                <strong className="text-foreground">Página:</strong>{" "}
                                                {selected.submitted_path ?? "—"}
                                            </p>
                                            <p>
                                                <strong className="text-foreground">IP:</strong>{" "}
                                                {selected.submitted_ip ?? "—"}
                                            </p>
                                            <p className="truncate">
                                                <strong className="text-foreground">
                                                    Navegador:
                                                </strong>{" "}
                                                {selected.submitted_user_agent ?? "—"}
                                            </p>
                                        </div>
                                        <p className="text-base text-foreground whitespace-pre-wrap rounded-2xl border border-default-200/70 p-4">
                                            {selected.message}
                                        </p>
                                        <Select
                                            label="Nuevo estado"
                                            selectedKeys={new Set([nextStatus])}
                                            onSelectionChange={(keys) => {
                                                const value = Array.from(keys)[0]?.toString();
                                                if (value) setNextStatus(value as SupportTicketStatus);
                                            }}
                                            variant="bordered"
                                        >
                                            <SelectItem key="in_progress">En revisión</SelectItem>
                                            <SelectItem key="resolved">Resuelto</SelectItem>
                                        </Select>
                                        <Textarea
                                            label="Respuesta"
                                            placeholder="Escribe tu respuesta para el usuario..."
                                            value={response}
                                            onValueChange={setResponse}
                                            variant="bordered"
                                            minRows={4}
                                        />
                                    </div>
                                ) : null}
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>
                                    Cerrar
                                </Button>
                                <Button
                                    color="primary"
                                    isLoading={isSaving}
                                    isDisabled={!response.trim()}
                                    onPress={handleRespond}
                                >
                                    Responder
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
