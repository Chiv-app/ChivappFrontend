"use client";

import { useEffect, useState } from "react";
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
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { getMyBookingLinks, BookingLinkOut } from "@/lib/booking-links";
import { formatCurrency } from "@/lib/booking-labels";
import { formatDateTime } from "@/lib/date-utils";

export default function MusicianLinksView() {
    const [links, setLinks] = useState<BookingLinkOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    async function loadLinks() {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await getMyBookingLinks();
            setLinks(data);
        } catch (error: unknown) {
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
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void Promise.resolve().then(() => loadLinks());
    }, []);

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
                        <Chip color="primary" variant="flat" size="sm" className="mb-3">
                            Contratas rápidas
                        </Chip>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                            Mis links de pago
                        </h1>
                        <p className="text-default-600 mt-2 max-w-2xl text-sm sm:text-base">
                            Aquí puedes ver y crear enlaces de pago pre-llenados para que tus clientes firmen el contrato y paguen en línea.
                        </p>
                    </div>
                    <Button
                        color="primary"
                        radius="lg"
                        className="font-semibold shadow-glow hover:shadow-glow-lg transition-shadow w-full sm:w-auto"
                        startContent={<Icon icon="material-symbols:add" width={18} />}
                        onPress={() => setIsCreateOpen(true)}
                    >
                        Nuevo link de pago
                    </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {links.map((link) => {
                        const isExpired = link.status === "expired" || new Date(link.expires_at) < new Date();
                        const linkUrl = typeof window !== "undefined" ? `${window.location.origin}/pay/${link.token}` : "";
                        
                        return (
                            <Card key={link.id} className="border border-default-200/70 shadow-soft">
                                <CardBody className="p-5 flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xl font-bold text-primary">{formatCurrency(link.price)}</p>
                                                {(link.source === "whatsapp_ai" || link.source === "assistant_whatsapp") && (
                                                    <Chip size="sm" color="success" variant="flat">IA WhatsApp</Chip>
                                                )}
                                                {(link.source === "voice_dictation" || link.source === "voice_autocomplete") && (
                                                    <Chip size="sm" color="secondary" variant="flat">Dictado IA</Chip>
                                                )}
                                                {(link.source === "simulator" || link.source === "assistant_simulator") && (
                                                    <Chip size="sm" color="primary" variant="flat">Simulador IA</Chip>
                                                )}
                                            </div>
                                            <p className="text-xs text-default-500 mt-1">Creado: {formatDateTime(link.created_at)}</p>
                                        </div>
                                        <Chip 
                                            size="sm" 
                                            color={link.status === "completed" ? "success" : isExpired ? "danger" : "warning"}
                                            variant="flat"
                                        >
                                            {link.status === "completed" ? "Pagado" : isExpired ? "Expirado" : "Pendiente"}
                                        </Chip>
                                    </div>

                                    {(link.client_fullname || link.event_type || link.event_date || link.location_address) && (
                                        <div className="text-xs text-default-600 bg-default-100/60 rounded-xl p-2.5 flex flex-col gap-1">
                                            {(link.client_fullname || link.event_type) && (
                                                <p className="font-semibold text-foreground truncate">
                                                    {[link.client_fullname, link.event_type].filter(Boolean).join(" · ")}
                                                </p>
                                            )}
                                            {(link.event_date || link.start_time) && (
                                                <p className="truncate">
                                                    📅 {[link.event_date, link.start_time?.slice(0, 5)].filter(Boolean).join(" a las ")}
                                                </p>
                                            )}
                                            {link.location_address && (
                                                <p className="truncate">📍 {link.location_address}</p>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="bg-default-50 rounded-xl p-3 flex items-center justify-between border border-default-100">
                                        <div className="truncate text-sm font-medium mr-2">
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
                                                addToast({ title: "Enlace copiado", color: "success" });
                                            }}
                                            isDisabled={link.status !== "active"}
                                        >
                                            <Icon icon="lucide:copy" width={16} />
                                        </Button>
                                    </div>

                                    {link.status === "completed" && link.booking_id && (
                                        <Button
                                            as="a"
                                            href={`/musician/bookings/${link.booking_id}`}
                                            color="primary"
                                            variant="flat"
                                            size="sm"
                                            className="w-full mt-2"
                                            startContent={<Icon icon="lucide:arrow-right" />}
                                        >
                                            Ver reserva
                                        </Button>
                                    )}
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
