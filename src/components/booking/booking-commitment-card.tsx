import {
    buildGoogleMapsUrl,
    buildOpenStreetMapUrl,
    parseLocationReference,
} from "@/lib/geocoding";
import type { BookingOut } from "@/types/api";
import { Icon } from "@iconify/react";
import { BOOKING_STATUS_LABELS } from '@/lib/booking-labels';
import { Card, CardBody, Chip } from "@heroui/react";

function formatDuration(start: string, end: string | null) {
    if (!end) return null;
    try {
        const d1 = new Date(`1970-01-01T${start}`);
        const d2 = new Date(`1970-01-01T${end}`);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

        const diffMs = d2.getTime() - d1.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);

        if (diffHrs <= 0) return null;
        if (diffHrs === 1) return "1 hora";
        return `${diffHrs} horas`;
    } catch {
        return null;
    }
}

export default function BookingCommitmentCard({ booking }: { booking: BookingOut }) {
    const isMusician = booking.viewer_role === "member";
    const coords = parseLocationReference(booking.location_reference);
    const googleMapsUrl = buildGoogleMapsUrl({
        lat: coords?.lat,
        lng: coords?.lng,
        address: booking.location_address,
        city: booking.location_city,
    });
    const openStreetMapUrl = coords
        ? buildOpenStreetMapUrl(coords.lat, coords.lng)
        : null;

    const durationText = formatDuration(booking.start_time, booking.end_time);

    return (
        <Card
            className="w-full h-full shadow-lg border border-default-200/50 bg-content1 xl:sticky xl:top-24 rounded-2xl"
            radius="lg"
        >
            <CardBody className="p-6 sm:p-8 flex flex-col gap-8">
                {/* Cabecera */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
                            RESUMEN DEL EVENTO
                        </p>
                        <Chip
                            size="sm"
                            variant="flat"
                            color="primary"
                            className="bg-primary/20 text-primary"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-primary" />
                                {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                            </span>
                        </Chip>
                    </div>
                    <h2 className="text-3xl font-extrabold text-foreground dark:text-white mt-2">
                        {booking.event_type}
                    </h2>
                </div>

                {/* Lista de Detalles */}
                <div className="flex flex-col gap-6">
                    {/* Fecha y Hora */}
                    <div className="flex gap-4">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-content2/50 text-primary shrink-0">
                            <Icon icon="lucide:calendar" width={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-xs text-default-500 font-medium mb-1">Fecha y Hora</p>
                            <p className="text-base font-bold text-foreground dark:text-white text-balance leading-snug">
                                {new Date(booking.event_date + "T00:00:00").toLocaleDateString("es-PE", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                            <p className="text-sm text-default-400 mt-1 flex items-center gap-1.5">
                                <span className="text-foreground dark:text-white font-medium">
                                    {booking.start_time.slice(0, 5)} hrs
                                </span>
                                {durationText ? (
                                    <>
                                        <span className="size-1 rounded-full bg-default-500" />
                                        <span>Duración aprox: {durationText}</span>
                                    </>
                                ) : null}
                            </p>
                        </div>
                    </div>

                    {/* Ubicación */}
                    <div className="flex gap-4">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-content2/50 text-danger-400 shrink-0">
                            <Icon icon="lucide:map-pin" width={20} />
                        </div>
                        <div className="flex flex-col min-w-0 w-full">
                            <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-default-500 font-medium mb-1">Ubicación</p>
                                {(googleMapsUrl || openStreetMapUrl) && (
                                    <a
                                        href={googleMapsUrl || openStreetMapUrl || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline shrink-0"
                                    >
                                        <Icon icon="lucide:flag" width={14} />
                                        Ver en mapa
                                    </a>
                                )}
                            </div>
                            <p className="text-base font-bold text-foreground dark:text-white text-balance leading-snug">
                                {booking.location_address || "Dirección no especificada"}
                                {booking.location_city ? `, ${booking.location_city}` : ""}
                            </p>
                            {booking.location_reference ? (
                                <p className="text-sm text-default-400 mt-1">
                                    Ref: {booking.location_reference}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {/* Cliente */}
                    <div className="flex gap-4">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-content2/50 text-default-400 shrink-0">
                            <Icon icon="lucide:user" width={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-xs text-default-500 font-medium mb-1">
                                {isMusician ? "Músico solicitado" : "Cliente solicitante"}
                            </p>
                            <div className="flex items-center gap-2">
                                <p className="text-base font-bold text-foreground dark:text-white leading-snug">
                                    {isMusician
                                        ? booking.musician_name || "Músico"
                                        : booking.contractor_name || "Cliente particular"}
                                </p>
                                <Chip size="sm" variant="flat" className="bg-content2/60 text-default-400 h-5 px-1 text-[10px]">
                                    Verificado
                                </Chip>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mensaje del cliente */}
                {booking.event_description ? (
                    <div className="mt-4 flex flex-col gap-2">
                        <p className="text-xs text-default-500 font-medium">Mensaje del cliente:</p>
                        <div className="rounded-xl border border-default-100/5 bg-content2 p-4 relative">
                            <p className="text-[15px] italic text-default-600 dark:text-default-300 leading-relaxed">
                                "{booking.event_description}"
                            </p>
                        </div>
                    </div>
                ) : null}
            </CardBody>
        </Card>
    );
}
