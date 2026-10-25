"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { getMyBookingLinks, BookingLinkOut } from "@/lib/booking-links";
import { formatCurrency } from "@/lib/booking-labels";
import { formatDateTime } from "@/lib/date-utils";

export default function MusicianLinksView() {
    const [links, setLinks] = useState<BookingLinkOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadLinks();
    }, []);

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
                <div className="h-28 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-64 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
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
                            Aquí puedes ver todos los enlaces de pago que has generado para compartir con tus clientes.
                        </p>
                    </div>
                </div>
            </div>

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
                            Puedes generar uno desde la vista de Reservas usando &quot;Nueva contrata&quot;.
                        </p>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {links.map((link) => {
                        const isExpired = link.status === "expired" || new Date(link.expires_at) < new Date();
                        const linkUrl = typeof window !== "undefined" ? `${window.location.origin}/pay/${link.token}` : "";
                        
                        return (
                            <Card key={link.id} className="border border-default-200/70 shadow-soft">
                                <CardBody className="p-5 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <p className="text-xl font-bold text-primary">{formatCurrency(link.price)}</p>
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
