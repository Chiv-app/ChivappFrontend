"use client";

import { useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Divider,
    User,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import BookingLocationLinks from "@/components/booking/booking-location-links";
import CancelBookingModal from "@/components/booking/cancel-booking-modal";
import {
    formatBookingDate,
    formatBookingTime,
} from "@/lib/booking-labels";
import { resolveUploadUrl } from "@/lib/uploads";
import type { BookingOut } from "@/types/api";

type Props = {
    booking: BookingOut;
    onUpdated: (booking: BookingOut) => void;
    onEdit?: () => void;
};

export default function BookingContractorRequestedCard({
    booking,
    onUpdated,
    onEdit,
}: Props) {
    const [isCancelOpen, setIsCancelOpen] = useState(false);

    return (
        <Card className="border border-default-200/70 shadow-soft overflow-hidden">
            <CancelBookingModal
                bookingId={booking.id}
                isOpen={isCancelOpen}
                onOpenChange={setIsCancelOpen}
                onCancelled={onUpdated}
                title="Cancelar solicitud"
            />
            <div className="bg-gradient-to-br from-warning/15 via-warning/5 to-transparent px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <Chip color="warning" variant="flat" size="sm" startContent={<Icon icon="material-symbols:pending-actions" width={16} />}>
                        Pendiente de cotización
                    </Chip>
                    {onEdit && (
                        <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            radius="lg"
                            startContent={<Icon icon="material-symbols:edit" width={16} />}
                            onPress={onEdit}
                        >
                            Editar solicitud
                        </Button>
                    )}
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                    Solicitud enviada al mariachi
                </h2>
                <p className="text-sm text-default-600 mt-1 max-w-2xl">
                    Tu solicitud está en manos del músico. Está revisando la disponibilidad
                    y preparando una cotización personalizada para tu evento.
                </p>
            </div>

            <CardBody className="gap-6 p-6">
                {/* Musician preview */}
                {booking.musician_name && (
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-default-200 bg-content1">
                        <User
                            name={booking.musician_name}
                            description="Mariachi / Agrupación seleccionada"
                            avatarProps={{
                                src: resolveUploadUrl(booking.musician_image_url) ?? undefined,
                                size: "md",
                            }}
                        />
                        <Chip size="sm" variant="flat" color="default">
                            Destinatario
                        </Chip>
                    </div>
                )}

                {/* Event details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-default-200 p-4">
                        <p className="text-xs text-default-500 font-medium uppercase tracking-wide">
                            Fecha y Horario
                        </p>
                        <p className="text-base font-semibold text-foreground mt-1 flex items-center gap-1.5">
                            <Icon icon="material-symbols:calendar-month" width={18} className="text-primary" />
                            {formatBookingDate(booking.event_date)}
                        </p>
                        <p className="text-sm text-default-600 mt-1 flex items-center gap-1.5">
                            <Icon icon="material-symbols:schedule" width={18} className="text-primary" />
                            {formatBookingTime(booking.start_time)}
                            {booking.end_time ? ` – ${formatBookingTime(booking.end_time)}` : ""}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-default-200 p-4">
                        <p className="text-xs text-default-500 font-medium uppercase tracking-wide">
                            Tipo de evento
                        </p>
                        <p className="text-base font-semibold text-foreground mt-1 flex items-center gap-1.5">
                            <Icon icon="material-symbols:celebration" width={18} className="text-secondary" />
                            {booking.event_type || "No especificado"}
                        </p>
                    </div>
                </div>

                {/* Location */}
                <BookingLocationLinks
                    address={booking.location_address}
                    city={booking.location_city}
                    reference={booking.location_reference}
                />

                {/* Requested repertoire if any */}
                {booking.requested_repertoire && booking.requested_repertoire.length > 0 && (
                    <div className="rounded-2xl border border-default-200 p-4 flex flex-col gap-2">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <Icon icon="material-symbols:library-music" width={18} className="text-secondary" />
                            Temas solicitados ({booking.requested_repertoire.length})
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {booking.requested_repertoire.map((song) => (
                                <Chip key={song} size="sm" variant="flat" color="secondary">
                                    {song}
                                </Chip>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes if any */}
                {booking.event_description && (
                    <div className="rounded-2xl border border-default-200 p-4">
                        <p className="text-sm font-semibold text-foreground mb-1">
                            Notas y requerimientos especiales
                        </p>
                        <p className="text-sm text-default-600 whitespace-pre-wrap">
                            {booking.event_description}
                        </p>
                    </div>
                )}

                <Divider />

                {/* What's next info box */}
                <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
                    <Icon
                        icon="material-symbols:info"
                        width={22}
                        className="text-warning shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">
                            ¿Qué ocurre a continuación?
                        </p>
                        <p className="text-xs text-default-600 mt-1 leading-relaxed">
                            El músico revisará los detalles y te enviará una cotización con el monto total del servicio.
                            Te notificaremos en la plataforma en cuanto esté lista. Una vez recibida la cotización, podrás aceptarla, firmar el contrato digital y pagar de forma 100% segura con Mercado Pago.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        color="danger"
                        variant="flat"
                        radius="lg"
                        onPress={() => setIsCancelOpen(true)}
                        startContent={<Icon icon="material-symbols:cancel" width={18} />}
                    >
                        Cancelar solicitud
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}
