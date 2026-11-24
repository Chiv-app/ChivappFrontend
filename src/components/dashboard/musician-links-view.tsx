"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import MusicianCreateLinkForm from "@/components/booking/musician-create-link-form";
import CircularStepper from "@/components/ui/circular-stepper";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import {
    BookingLinkOut,
    getMyBookingLinks,
    resetBookingLinkExpiration,
} from "@/lib/booking-links";
import { formatCurrency } from "@/lib/booking-labels";
import { formatDateTime } from "@/lib/date-utils";

const FUNNEL_STEPS = [
    { step: 1, short: "Evento", label: "Datos del evento" },
    { step: 2, short: "Datos", label: "Datos del cliente" },
    { step: 3, short: "Firma", label: "Firma de contrato" },
    { step: 4, short: "Pago", label: "Pasarela de pago" },
] as const;

function getEffectiveStepInfo(link: BookingLinkOut): {
    step: number;
    maxStep: number;
    headline: string;
    tone: "default" | "primary" | "warning" | "success";
} {
    const draft = link.draft_data ?? {};
    if (link.status === "completed") {
        return {
            step: 4,
            maxStep: 4,
            headline: "Completado: contrato firmado y pago acreditado",
            tone: "success",
        };
    }

    const openCount = Number(link.open_count ?? 0);
    const currentStep = Number(link.current_step ?? 0);
    const maxStep = Math.max(
        Number(link.max_step_reached ?? 0),
        currentStep,
        draft.payment_modal_opened || link.booking_id ? 4 : 0,
    );

    if (openCount === 0 && maxStep === 0) {
        return {
            step: 0,
            maxStep: 0,
            headline: "Sin abrir: el cliente aún no ha entrado al enlace",
            tone: "default",
        };
    }

    const active = currentStep || maxStep || 1;
    if (active >= 4 || draft.payment_modal_opened || link.booking_id) {
        return {
            step: 4,
            maxStep: 4,
            headline: "Se quedó en Paso 4: firmó el contrato y abrió la pasarela de pago",
            tone: "primary",
        };
    }
    if (active === 3) {
        return {
            step: 3,
            maxStep,
            headline: draft.has_signature
                ? "En Paso 3: ya dibujó su firma, falta confirmar y pasar al pago"
                : "Se quedó en Paso 3: revisando y firmando el contrato",
            tone: "warning",
        };
    }
    if (active === 2) {
        return {
            step: 2,
            maxStep,
            headline: "Se quedó en Paso 2: completando sus datos personales",
            tone: "warning",
        };
    }
    return {
        step: 1,
        maxStep: Math.max(1, maxStep),
        headline: "Se quedó en Paso 1: revisando detalles de fecha y ubicación",
        tone: "warning",
    };
}

function buildWhatsAppFollowupUrl(
    phoneRaw: string,
    clientName: string | null | undefined,
    step: number,
    linkUrl: string,
): string | null {
    const digits = phoneRaw.replace(/\D/g, "");
    if (digits.length < 9) return null;
    const intlPhone = digits.length === 9 ? `51${digits}` : digits;
    const greeting = clientName ? `Hola ${clientName.split(" ")[0]}` : "Hola";
    const stepHint =
        step >= 4
            ? "vi que ya firmaste el contrato y solo quedó pendiente completar el pago"
            : step === 3
              ? "vi que avanzaste hasta la revisión del contrato"
              : step >= 1
                ? "vi que abriste el enlace de reserva y tus datos quedaron guardados automáticamente"
                : "te comparto nuevamente el enlace seguro de reserva";
    const msg = `${greeting}, ${stepHint}. ¿Tienes alguna duda para ayudarte a finalizar la reserva? Aquí puedes retomarla donde te quedaste: ${linkUrl}`;
    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
}

export default function MusicianLinksView() {
    const [links, setLinks] = useState<BookingLinkOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [renewingToken, setRenewingToken] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const loadLinks = useCallback(async (options?: { silent?: boolean }) => {
        if (options?.silent) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
            setLoadError(null);
        }
        try {
            const data = await getMyBookingLinks();
            setLinks(data);
        } catch (error: unknown) {
            if (!options?.silent) {
                const message =
                    error instanceof Error && error.message
                        ? error.message
                        : "No se pudieron cargar los links de pago.";
                setLoadError(message);
                addToast({
                    title: "Error",
                    description: message,
                    color: "danger",
                });
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => loadLinks());
    }, [loadLinks]);

    // Auto-refresco cada 15s para ver en vivo el avance del cliente
    useEffect(() => {
        const timer = window.setInterval(() => {
            void loadLinks({ silent: true });
        }, 15000);
        return () => window.clearInterval(timer);
    }, [loadLinks]);

    async function handleRenewLink(token: string) {
        setRenewingToken(token);
        try {
            const updated = await resetBookingLinkExpiration(token);
            setLinks((prev) =>
                prev.map((item) => (item.token === token ? updated : item)),
            );
            addToast({
                title: "Enlace renovado por 24 horas",
                description: "El cliente puede volver a entrar conservando todo su avance.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo renovar el enlace",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setRenewingToken(null);
        }
    }

    if (isLoading) {
        return (
            <div className="w-full flex flex-col gap-4">
                <div className="h-28 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-64 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="rounded-4xl border border-default-200/70 bg-gradient-to-br from-primary/15 via-content1 to-content1 px-4 py-5 sm:px-6 sm:py-6 shadow-soft overflow-hidden relative">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Chip color="primary" variant="flat" size="sm">
                                Contratas rápidas
                            </Chip>
                            <Chip
                                color="success"
                                variant="flat"
                                size="sm"
                                startContent={
                                    <Icon icon="material-symbols:sync" width={14} />
                                }
                            >
                                Seguimiento de avance en vivo
                            </Chip>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                            Mis links de pago
                        </h1>
                        <p className="text-default-600 mt-2 max-w-2xl text-sm sm:text-base">
                            Crea enlaces pre-llenados y supervisa en tiempo real cuántas veces los abrió tu cliente, qué campos ya completó y en qué paso se encuentra.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="flat"
                            radius="lg"
                            className="font-semibold flex-1 sm:flex-none"
                            isLoading={isRefreshing}
                            onPress={() => void loadLinks({ silent: true })}
                            startContent={
                                !isRefreshing ? (
                                    <Icon icon="material-symbols:refresh" width={18} />
                                ) : undefined
                            }
                        >
                            Actualizar avance
                        </Button>
                        <Button
                            color="primary"
                            radius="lg"
                            className="font-semibold shadow-glow hover:shadow-glow-lg transition-shadow flex-1 sm:flex-none"
                            startContent={<Icon icon="material-symbols:add" width={18} />}
                            onPress={() => setIsCreateOpen(true)}
                        >
                            Nuevo link de pago
                        </Button>
                    </div>
                </div>
            </div>

            <Modal
                closeButton={<ModalCloseButton aria-label="Cerrar" />}
                isOpen={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                size="xl"
                scrollBehavior="inside"
                placement="center"
                classNames={{
                    base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-xl",
                    header: "px-4 sm:px-6",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col items-start gap-1 pb-2">
                                <span className="text-xl font-bold">Nuevo link de pago</span>
                                <span className="text-sm font-normal text-default-500">
                                    Dicta por voz o escribe lo que acordaste y genera el enlace pre-llenado para cobrar por Chivapp.
                                </span>
                            </ModalHeader>
                            <ModalBody className="pb-6">
                                <MusicianCreateLinkForm
                                    onSuccess={() => {
                                        onClose();
                                        void loadLinks();
                                    }}
                                />
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {loadError ? (
                <Card className="border border-danger/30 bg-danger/5 shadow-soft">
                    <CardBody className="gap-3 p-8 text-center">
                        <Icon
                            icon="material-symbols:error-outline"
                            width={36}
                            className="mx-auto text-danger"
                        />
                        <p className="font-semibold text-danger">
                            No se pudieron cargar los links de pago
                        </p>
                        <p className="text-sm text-default-600">{loadError}</p>
                        <div>
                            <Button
                                color="danger"
                                variant="flat"
                                radius="lg"
                                onPress={() => void loadLinks()}
                            >
                                Reintentar
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            ) : links.length === 0 ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="gap-3 p-10 text-center">
                        <Icon
                            icon="lucide:link-2-off"
                            width={36}
                            className="mx-auto text-default-400"
                        />
                        <p className="font-semibold text-foreground">
                            No has creado ningún link todavía
                        </p>
                        <p className="text-sm text-default-500">
                            Genera un enlace pre-llenado para que tu cliente revise el contrato y pague con tarjeta o Yape.
                        </p>
                        <div>
                            <Button
                                color="primary"
                                radius="lg"
                                className="font-semibold mt-1"
                                startContent={<Icon icon="material-symbols:add" width={18} />}
                                onPress={() => setIsCreateOpen(true)}
                            >
                                Nuevo link de pago
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {links.map((link) => {
                        const isExpired =
                            link.status === "expired" ||
                            (link.status !== "completed" &&
                                new Date(link.expires_at) < new Date());
                        const linkUrl =
                            typeof window !== "undefined"
                                ? `${window.location.origin}/pay/${link.token}`
                                : "";
                        const draft = link.draft_data ?? {};
                        const openCount = Number(link.open_count ?? 0);
                        const stepInfo = getEffectiveStepInfo(link);

                        // Valores combinados (pre-llenados por el músico + auto-guardados por el cliente)
                        const mergedEventDate = link.event_date || draft.event_date || null;
                        const mergedStartTime = link.start_time || draft.start_time || null;
                        const mergedEventType = link.event_type || draft.event_type || null;
                        const mergedAddress =
                            link.location_address || draft.location_address || null;
                        const mergedFullname =
                            link.client_fullname || draft.client_fullname || null;
                        const mergedPhone = link.client_phone || draft.client_phone || null;
                        const mergedEmail = link.client_email || draft.client_email || null;
                        const mergedDoc =
                            link.client_document_number ||
                            draft.client_document_number ||
                            null;
                        const hasSignature = Boolean(
                            draft.has_signature ||
                                link.booking_id ||
                                link.status === "completed",
                        );

                        const fieldChecklist = [
                            {
                                key: "date",
                                label: "Fecha y hora",
                                done: Boolean(mergedEventDate && mergedStartTime),
                            },
                            {
                                key: "type",
                                label: "Tipo evento",
                                done: Boolean(mergedEventType),
                            },
                            {
                                key: "address",
                                label: "Ubicación",
                                done: Boolean(mergedAddress),
                            },
                            {
                                key: "name",
                                label: "Nombre",
                                done: Boolean(mergedFullname),
                            },
                            {
                                key: "phone",
                                label: "Celular",
                                done: Boolean(mergedPhone),
                            },
                            {
                                key: "email",
                                label: "Correo",
                                done: Boolean(mergedEmail),
                            },
                            {
                                key: "doc",
                                label: "DNI",
                                done: Boolean(mergedDoc),
                            },
                            {
                                key: "sig",
                                label: "Firma",
                                done: hasSignature,
                            },
                        ];
                        const completedFieldsCount = fieldChecklist.filter(
                            (f) => f.done,
                        ).length;

                        const whatsappUrl =
                            link.status !== "completed" && mergedPhone && linkUrl
                                ? buildWhatsAppFollowupUrl(
                                      mergedPhone,
                                      mergedFullname,
                                      stepInfo.step,
                                      linkUrl,
                                  )
                                : null;

                        return (
                            <Card
                                key={link.id}
                                className="border border-default-200/70 shadow-soft"
                            >
                                <CardBody className="p-5 flex flex-col gap-3.5 justify-between">
                                    <div className="flex flex-col gap-3.5">
                                        {/* Cabecera: Precio, fuente y estado */}
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-xl font-bold text-primary">
                                                        {formatCurrency(link.price)}
                                                    </p>
                                                    {(link.source === "whatsapp_ai" ||
                                                        link.source ===
                                                            "assistant_whatsapp") && (
                                                        <Chip
                                                            size="sm"
                                                            color="success"
                                                            variant="flat"
                                                        >
                                                            IA WhatsApp
                                                        </Chip>
                                                    )}
                                                    {(link.source === "voice_dictation" ||
                                                        link.source ===
                                                            "voice_autocomplete") && (
                                                        <Chip
                                                            size="sm"
                                                            color="secondary"
                                                            variant="flat"
                                                        >
                                                            Dictado IA
                                                        </Chip>
                                                    )}
                                                    {(link.source === "simulator" ||
                                                        link.source ===
                                                            "assistant_simulator") && (
                                                        <Chip
                                                            size="sm"
                                                            color="primary"
                                                            variant="flat"
                                                        >
                                                            Simulador IA
                                                        </Chip>
                                                    )}
                                                </div>
                                                <p className="text-xs text-default-500 mt-1">
                                                    Creado: {formatDateTime(link.created_at)}
                                                </p>
                                            </div>
                                            <Chip
                                                size="sm"
                                                color={
                                                    link.status === "completed"
                                                        ? "success"
                                                        : isExpired
                                                          ? "danger"
                                                          : "warning"
                                                }
                                                variant="flat"
                                            >
                                                {link.status === "completed"
                                                    ? "Pagado"
                                                    : isExpired
                                                      ? "Expirado"
                                                      : "Pendiente"}
                                            </Chip>
                                        </div>

                                        {/* Bloque de seguimiento de aperturas y paso actual */}
                                        <div className="rounded-2xl border border-default-200/80 bg-default-50/70 p-3 flex flex-col gap-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    color={openCount > 0 ? "primary" : "default"}
                                                    startContent={
                                                        <Icon
                                                            icon={
                                                                openCount > 0
                                                                    ? "material-symbols:visibility-outline"
                                                                    : "material-symbols:visibility-off-outline"
                                                            }
                                                            width={15}
                                                        />
                                                    }
                                                >
                                                    {openCount === 0
                                                        ? "Sin abrir aún"
                                                        : openCount === 1
                                                          ? "Abierto 1 vez"
                                                          : `Abierto ${openCount} veces`}
                                                </Chip>
                                                <span className="text-[11px] font-semibold text-default-500">
                                                    {completedFieldsCount}/{fieldChecklist.length}{" "}
                                                    campos listos
                                                </span>
                                            </div>

                                            {/* Stepper circular de 4 pasos del embudo */}
                                            <CircularStepper
                                                compact
                                                ariaLabel="Avance del cliente en el enlace de pago"
                                                steps={FUNNEL_STEPS.map((s) => ({
                                                    id: s.step,
                                                    title: s.short,
                                                    state:
                                                        link.status === "completed" ||
                                                        stepInfo.step > s.step
                                                            ? "done"
                                                            : stepInfo.step === s.step &&
                                                                stepInfo.step > 0
                                                              ? "current"
                                                              : "upcoming",
                                                }))}
                                            />

                                            <p className="text-xs font-semibold text-foreground leading-snug">
                                                {stepInfo.headline}
                                            </p>

                                            {link.last_activity_at || link.last_opened_at ? (
                                                <p className="text-[11px] text-default-500">
                                                    Última actividad del cliente:{" "}
                                                    {formatDateTime(
                                                        link.last_activity_at ||
                                                            link.last_opened_at,
                                                    )}
                                                </p>
                                            ) : null}

                                            {/* Chips de campos completados vs faltantes */}
                                            <div className="flex flex-wrap gap-1 pt-0.5">
                                                {fieldChecklist.map((field) => (
                                                    <span
                                                        key={field.key}
                                                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium border ${
                                                            field.done
                                                                ? "border-success/30 bg-success/10 text-success-text"
                                                                : "border-default-200 bg-content1 text-default-500"
                                                        }`}
                                                    >
                                                        <Icon
                                                            icon={
                                                                field.done
                                                                    ? "material-symbols:check-circle"
                                                                    : "material-symbols:radio-button-unchecked"
                                                            }
                                                            width={12}
                                                        />
                                                        {field.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Datos guardados (pre-llenados + auto-guardados por el cliente) */}
                                        {(mergedFullname ||
                                            mergedEventType ||
                                            mergedEventDate ||
                                            mergedAddress ||
                                            mergedPhone ||
                                            mergedEmail) && (
                                            <div className="text-xs text-default-600 bg-default-100/60 rounded-xl p-2.5 flex flex-col gap-1">
                                                {(mergedFullname || mergedEventType) && (
                                                    <p className="font-semibold text-foreground truncate">
                                                        {[mergedFullname, mergedEventType]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </p>
                                                )}
                                                {(mergedEventDate || mergedStartTime) && (
                                                    <p className="truncate">
                                                        📅{" "}
                                                        {[
                                                            mergedEventDate,
                                                            mergedStartTime?.slice(0, 5),
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" a las ")}
                                                    </p>
                                                )}
                                                {mergedAddress && (
                                                    <p className="truncate">
                                                        📍 {mergedAddress}
                                                    </p>
                                                )}
                                                {(mergedPhone || mergedEmail) && (
                                                    <p className="truncate text-default-500">
                                                        {[mergedPhone, mergedEmail]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 pt-1">
                                        <div className="bg-default-50 rounded-xl p-2.5 flex items-center justify-between border border-default-100">
                                            <div className="truncate text-xs font-medium mr-2">
                                                {linkUrl}
                                            </div>
                                            <Button
                                                isIconOnly
                                                aria-label="Copiar enlace de pago"
                                                size="sm"
                                                color="default"
                                                variant="flat"
                                                onPress={() => {
                                                    navigator.clipboard.writeText(linkUrl);
                                                    addToast({
                                                        title: "Enlace copiado",
                                                        color: "success",
                                                    });
                                                }}
                                                isDisabled={link.status !== "active" || isExpired}
                                            >
                                                <Icon icon="lucide:copy" width={16} />
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {whatsappUrl ? (
                                                <Button
                                                    as="a"
                                                    href={whatsappUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    color="success"
                                                    variant="flat"
                                                    size="sm"
                                                    radius="lg"
                                                    className="flex-1 font-semibold"
                                                    startContent={
                                                        <Icon
                                                            icon="ic:baseline-whatsapp"
                                                            width={17}
                                                        />
                                                    }
                                                >
                                                    Seguimiento WhatsApp
                                                </Button>
                                            ) : null}

                                            {isExpired && link.status !== "completed" ? (
                                                <Button
                                                    size="sm"
                                                    color="warning"
                                                    variant="flat"
                                                    radius="lg"
                                                    className="flex-1 font-semibold"
                                                    isLoading={renewingToken === link.token}
                                                    onPress={() =>
                                                        void handleRenewLink(link.token)
                                                    }
                                                    startContent={
                                                        <Icon
                                                            icon="material-symbols:autorenew"
                                                            width={17}
                                                        />
                                                    }
                                                >
                                                    Reactivar 24 h
                                                </Button>
                                            ) : null}

                                            {link.status === "completed" && link.booking_id && (
                                                <Button
                                                    as="a"
                                                    href={`/musician/bookings/${link.booking_id}`}
                                                    color="primary"
                                                    variant="flat"
                                                    size="sm"
                                                    radius="lg"
                                                    className="w-full font-semibold"
                                                    startContent={
                                                        <Icon icon="lucide:arrow-right" />
                                                    }
                                                >
                                                    Ver reserva
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
