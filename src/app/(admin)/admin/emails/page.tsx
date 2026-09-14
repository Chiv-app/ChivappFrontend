"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Select,
    SelectItem,
    Switch,
    Tab,
    Tabs,
    Textarea,
    addToast,
} from "@heroui/react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { formatDateTime } from "@/lib/date-utils";
import {
    getAdminEmailLogs,
    getAdminEmailTemplates,
    previewAdminEmailTemplate,
    renderAdminEmailTemplate,
    updateAdminEmailTemplate,
} from "@/lib/admin";
import { UI } from "@/lib/ui-classes";
import type { EmailLogOut, EmailTemplateOut, EmailTemplateRenderOut } from "@/types/api";

const STATUS_LABEL: Record<string, string> = {
    sent: "Enviado",
    failed: "Fallido",
    skipped: "Omitido",
};

const STATUS_COLOR: Record<string, "success" | "danger" | "warning"> = {
    sent: "success",
    failed: "danger",
    skipped: "warning",
};

export default function AdminEmailsPage() {
    const [templates, setTemplates] = useState<EmailTemplateOut[]>([]);
    const [selectedSlug, setSelectedSlug] = useState<string>("");
    const [form, setForm] = useState<EmailTemplateOut | null>(null);
    const [logs, setLogs] = useState<EmailLogOut[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [rendered, setRendered] = useState<EmailTemplateRenderOut | null>(null);
    const [renderLoading, setRenderLoading] = useState(false);
    const [previewFormat, setPreviewFormat] = useState<"html" | "text">("html");
    const [logStatus, setLogStatus] = useState<string>("");
    const [logQuery, setLogQuery] = useState("");

    const selectedTemplate = useMemo(
        () => templates.find((item) => item.slug === selectedSlug) ?? null,
        [templates, selectedSlug],
    );

    const loadTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        try {
            const data = await getAdminEmailTemplates();
            setTemplates(data);
            setSelectedSlug((current) => current || data[0]?.slug || "");
            setForm((current) => {
                if (current) {
                    return data.find((item) => item.slug === current.slug) ?? data[0] ?? null;
                }
                return data[0] ?? null;
            });
        } catch {
            setTemplates([]);
        } finally {
            setLoadingTemplates(false);
        }
    }, []);

    const loadLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const data = await getAdminEmailLogs({
                limit: 80,
                status: logStatus || undefined,
                q: logQuery.trim() || undefined,
            });
            setLogs(data);
        } catch {
            setLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    }, [logStatus, logQuery]);

    useEffect(() => {
        void loadTemplates();
    }, [loadTemplates]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        if (selectedTemplate) {
            setForm(selectedTemplate);
        }
    }, [selectedTemplate]);

    useEffect(() => {
        if (!form) {
            setRendered(null);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setRenderLoading(true);
            try {
                const result = await renderAdminEmailTemplate(form.slug, {
                    subject: form.subject,
                    html_body: form.html_body,
                    text_body: form.text_body,
                });
                if (!cancelled) {
                    setRendered(result);
                }
            } catch {
                if (!cancelled) {
                    setRendered(null);
                }
            } finally {
                if (!cancelled) {
                    setRenderLoading(false);
                }
            }
        }, 400);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [form]);

    async function handleSave() {
        if (!form) return;
        setSaving(true);
        try {
            const updated = await updateAdminEmailTemplate(form.slug, {
                name: form.name,
                description: form.description,
                subject: form.subject,
                html_body: form.html_body,
                text_body: form.text_body,
                enabled: form.enabled,
            });
            setTemplates((current) =>
                current.map((item) => (item.slug === updated.slug ? updated : item)),
            );
            setForm(updated);
            addToast({ title: "Plantilla guardada", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo guardar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setSaving(false);
        }
    }

    async function handlePreview() {
        if (!form) return;
        setPreviewing(true);
        try {
            const log = await previewAdminEmailTemplate(form.slug);
            addToast({
                title:
                    log.status === "sent"
                        ? "Correo de prueba enviado"
                        : "Vista previa registrada",
                description: log.error_message ?? `Estado: ${log.status}`,
                color: log.status === "sent" ? "success" : "warning",
            });
            void loadLogs();
        } catch (error) {
            addToast({
                title: "No se pudo enviar la prueba",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setPreviewing(false);
        }
    }

    const editorFields = form ? (
        <>
            <Input
                label="Nombre interno"
                value={form.name}
                onValueChange={(name) => setForm((prev) => (prev ? { ...prev, name } : prev))}
                variant="bordered"
                classNames={UI.authInput}
            />
            <Input
                label="Asunto"
                value={form.subject}
                onValueChange={(subject) =>
                    setForm((prev) => (prev ? { ...prev, subject } : prev))
                }
                variant="bordered"
                classNames={UI.authInput}
            />
            <Textarea
                label="Cuerpo HTML"
                minRows={10}
                value={form.html_body}
                onValueChange={(html_body) =>
                    setForm((prev) => (prev ? { ...prev, html_body } : prev))
                }
                variant="bordered"
            />
            <Textarea
                label="Cuerpo texto plano"
                minRows={6}
                value={form.text_body}
                onValueChange={(text_body) =>
                    setForm((prev) => (prev ? { ...prev, text_body } : prev))
                }
                variant="bordered"
            />
        </>
    ) : null;

    const previewPanel = form ? (
        <div className="flex flex-col gap-4 min-h-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold">Vista previa del envío</p>
                    <p className="text-xs text-default-500 mt-1">
                        Así se verá el correo con datos de ejemplo. Incluye cambios sin guardar.
                    </p>
                </div>
                <Tabs
                    aria-label="Formato de vista previa"
                    selectedKey={previewFormat}
                    onSelectionChange={(key) => setPreviewFormat(String(key) as "html" | "text")}
                    size="sm"
                    variant="light"
                >
                    <Tab key="html" title="HTML" />
                    <Tab key="text" title="Texto" />
                </Tabs>
            </div>

            <div className="rounded-xl border border-default-200/70 bg-default-100 p-3 sm:p-4 flex flex-col gap-3 min-h-[420px]">
                <div className="rounded-lg bg-content1 border border-default-200 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-default-400 mb-1">
                        Asunto
                    </p>
                    {renderLoading ? (
                        <p className="text-sm text-default-400">Generando vista previa…</p>
                    ) : (
                        <p className="text-sm font-medium break-words">
                            {rendered?.subject ?? form.subject}
                        </p>
                    )}
                </div>

                <div className="flex-1 rounded-lg bg-white border border-default-200 overflow-hidden min-h-[320px]">
                    {renderLoading ? (
                        <p className="text-sm text-default-400 p-4">Generando vista previa…</p>
                    ) : previewFormat === "html" ? (
                        <iframe
                            title={`Vista previa: ${form.name}`}
                            srcDoc={rendered?.html ?? form.html_body}
                            sandbox=""
                            className="w-full h-full min-h-[320px] border-0 bg-white"
                        />
                    ) : (
                        <pre className="text-sm text-default-700 whitespace-pre-wrap p-4 font-sans leading-relaxed overflow-auto max-h-[520px]">
                            {rendered?.text ?? form.text_body}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Correos transaccionales"
                description="Administra plantillas de Brevo, variables y revisa el historial de envíos."
            />

            <Tabs aria-label="Correos admin" color="primary" variant="underlined">
                <Tab key="templates" title="Plantillas">
                    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 pt-4">
                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="p-4 gap-2">
                                {loadingTemplates ? (
                                    <p className="text-sm text-default-500">Cargando…</p>
                                ) : (
                                    templates.map((template) => (
                                        <button
                                            key={template.slug}
                                            type="button"
                                            onClick={() => setSelectedSlug(template.slug)}
                                            className={`text-left rounded-xl px-3 py-3 transition-colors ${
                                                selectedSlug === template.slug
                                                    ? "bg-primary/10 border border-primary/20"
                                                    : "hover:bg-default-100 border border-transparent"
                                            }`}
                                        >
                                            <p className="font-medium text-sm">{template.name}</p>
                                            <p className="text-xs text-default-500 mt-1">
                                                {template.slug}
                                            </p>
                                        </button>
                                    ))
                                )}
                            </CardBody>
                        </Card>

                        {form ? (
                            <Card className="border border-default-200/70 shadow-soft">
                                <CardBody className="p-6 flex flex-col gap-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-semibold">{form.name}</h2>
                                            <p className="text-sm text-default-500">
                                                {form.description}
                                            </p>
                                        </div>
                                        <Switch
                                            isSelected={form.enabled}
                                            onValueChange={(enabled) =>
                                                setForm((prev) =>
                                                    prev ? { ...prev, enabled } : prev,
                                                )
                                            }
                                        >
                                            Activa
                                        </Switch>
                                    </div>

                                    <div className="rounded-xl bg-default-100 px-4 py-3">
                                        <p className="text-xs font-semibold text-default-600 mb-2">
                                            Variables disponibles
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {form.available_variables.map((variable) => (
                                                <Chip key={variable} size="sm" variant="flat">
                                                    {`{{${variable}}}`}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="hidden xl:grid xl:grid-cols-2 gap-6 items-start">
                                        <div className="flex flex-col gap-4">{editorFields}</div>
                                        {previewPanel}
                                    </div>

                                    <div className="xl:hidden">
                                        <Tabs
                                            aria-label="Editor de plantilla"
                                            color="primary"
                                            variant="underlined"
                                        >
                                            <Tab key="edit" title="Editar">
                                                <div className="flex flex-col gap-4 pt-4">
                                                    {editorFields}
                                                </div>
                                            </Tab>
                                            <Tab key="preview" title="Vista previa">
                                                <div className="pt-4">{previewPanel}</div>
                                            </Tab>
                                        </Tabs>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            color="primary"
                                            radius="lg"
                                            isLoading={saving}
                                            onPress={handleSave}
                                        >
                                            Guardar cambios
                                        </Button>
                                        <Button
                                            variant="flat"
                                            radius="lg"
                                            isLoading={previewing}
                                            onPress={handlePreview}
                                        >
                                            Enviarme prueba
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        ) : null}
                    </div>
                </Tab>

                <Tab key="logs" title="Historial">
                    <div className="flex flex-col gap-4 pt-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                placeholder="Buscar por destinatario o asunto"
                                value={logQuery}
                                onValueChange={setLogQuery}
                                variant="bordered"
                                className="sm:max-w-md"
                            />
                            <Select
                                placeholder="Estado"
                                selectedKeys={logStatus ? [logStatus] : []}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0];
                                    setLogStatus(value ? String(value) : "");
                                }}
                                variant="bordered"
                                className="sm:max-w-xs"
                            >
                                <SelectItem key="">Todos</SelectItem>
                                <SelectItem key="sent">Enviado</SelectItem>
                                <SelectItem key="failed">Fallido</SelectItem>
                                <SelectItem key="skipped">Omitido</SelectItem>
                            </Select>
                            <Button
                                color="primary"
                                radius="lg"
                                onPress={loadLogs}
                                isLoading={loadingLogs}
                            >
                                Actualizar
                            </Button>
                        </div>

                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="p-0">
                                {loadingLogs ? (
                                    <p className="text-sm text-default-500 text-center py-10">
                                        Cargando historial…
                                    </p>
                                ) : logs.length === 0 ? (
                                    <p className="text-sm text-default-500 text-center py-10">
                                        No hay envíos registrados.
                                    </p>
                                ) : (
                                    <div className="divide-y divide-default-200">
                                        {logs.map((log) => (
                                            <div
                                                key={log.id}
                                                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">
                                                        {log.subject}
                                                    </p>
                                                    <p className="text-sm text-default-500 truncate">
                                                        {log.recipient} · {log.template_slug}
                                                    </p>
                                                    {log.error_message ? (
                                                        <p className="text-xs text-danger mt-1">
                                                            {log.error_message}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Chip
                                                        size="sm"
                                                        color={STATUS_COLOR[log.status] ?? "default"}
                                                        variant="flat"
                                                    >
                                                        {STATUS_LABEL[log.status] ?? log.status}
                                                    </Chip>
                                                    <span className="text-xs text-default-400">
                                                        {formatDateTime(log.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
}


