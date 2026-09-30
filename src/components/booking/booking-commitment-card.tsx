"use client";

import Link from "next/link";
import { Button, Card, Chip, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    formatBookingDate,
    formatBookingTime,
    formatCurrency,
    getBookingStatusChipVariant,
} from "@/lib/booking-labels";
import {
    contractorPayableTotal,
    platformFeeAmount,
} from "@/lib/platform-fee";
import {
    buildGoogleMapsUrl,
    buildOpenStreetMapUrl,
    parseLocationReference,
} from "@/lib/geocoding";
import type { BookingOut, UserRole } from "@/types/api";

type Role = Extract<UserRole, "musician" | "contractor">;

type Props = {
    booking: BookingOut;
    confirmed: boolean;
    canEdit: boolean;
    hasPendingChanges: boolean;
    role: Role;
    onEdit: () => void;
    onReviewPending: () => void;
    layout?: "page" | "sidebar";
};

export default function BookingCommitmentCard({
    booking,
    confirmed,
    canEdit,
    hasPendingChanges,
    role,
    onEdit,
    onReviewPending,
    layout = "page",
}: Props) {
    const isSidebar = layout === "sidebar";
    const servicePrice = booking.price_agreed != null ? Number(booking.price_agreed) : null;
    const fee = platformFeeAmount(booking);
    const contractorTotal = contractorPayableTotal(booking);

    const coords = parseLocationReference(booking.location_reference);
    const googleMapsUrl = buildGoogleMapsUrl({
        lat: coords?.lat,
        lng: coords?.lng,
        address: booking.location_address,
        city: booking.location_city,
    });
    const openStreetMapUrl = coords ? buildOpenStreetMapUrl(coords.lat, coords.lng) : null;

    const counterpartLabel = role === "musician" ? "CLIENTE" : "AGRUPACIÓN";
    const counterpartName = role === "musician" ? booking.contractor_name : booking.musician_name;
    const counterpartHref = role === "musician"
            ? (booking.contractor_id ? `/contractors/${booking.contractor_id}` : null)
            : (booking.musician_id ? `/musicians/${booking.musician_id}` : null);
    const counterpartIcon = role === "musician" ? "lucide:user" : "lucide:users";

    const repertoire = booking.requested_repertoire ?? [];
    const description = booking.event_description?.trim() || null;
    const musicianNotes = booking.musician_quote_notes?.trim() || null;

    return (
        <Card
            className={`shadow-soft border border-default-200 bg-content1 rounded-[2rem] p-5 sm:p-7 flex flex-col gap-6 ${
                isSidebar
                    ? "lg:overflow-y-auto lg:scrollbar-none lg:max-h-[calc(100dvh-var(--app-navbar-height)-var(--booking-timeline-height,0px)-1.5rem)]"
                    : ""
            }`}
        >
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h3 className="text-[10px] font-bold tracking-widest text-default-500 uppercase mb-1">
                        Detalle del compromiso
                    </h3>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                        {booking.event_type}
                    </h2>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Chip
                        variant={getBookingStatusChipVariant(booking.status)}
                        color={BOOKING_STATUS_COLORS[booking.status]}
                        size="sm"
                        className="font-medium px-1"
                    >
                        {BOOKING_STATUS_LABELS[booking.status]}
                    </Chip>
                    {hasPendingChanges ? (
                        <Button
                            color="warning"
                            variant="flat"
                            size="sm"
                            radius="full"
                            onPress={onReviewPending}
                            className="font-medium animate-pulse h-7"
                            startContent={<Icon icon="lucide:alert-circle" width={14} />}
                        >
                            Cambios pendientes
                        </Button>
                    ) : null}
                    {canEdit && !hasPendingChanges ? (
                        <Button
                            color="primary"
                            variant="light"
                            size="sm"
                            radius="full"
                            onPress={onEdit}
                            className="h-7 font-medium"
                            startContent={<Icon icon="lucide:edit-3" width={14} />}
                        >
                            Editar
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {/* Cliente / Agrupación */}
                <section>
                    <h3 className="text-[11px] font-bold tracking-widest text-default-500 uppercase flex items-center gap-2 mb-2">
                        <Icon icon={counterpartIcon} width={14} /> {counterpartLabel}
                    </h3>
                    <div className="pl-6">
                        {counterpartHref ? (
                            <Link
                                href={counterpartHref}
                                className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors"
                            >
                                {counterpartName} <Icon icon="lucide:external-link" width={14} className="text-default-400" />
                            </Link>
                        ) : (
                            <p className="font-semibold text-foreground">{counterpartName}</p>
                        )}
                    </div>
                </section>

                <Divider className="opacity-50" />

                {/* Fecha y Hora */}
                <section>
                    <h3 className="text-[11px] font-bold tracking-widest text-default-500 uppercase flex items-center gap-2 mb-2">
                        <Icon icon="lucide:calendar" width={14} /> FECHA Y HORA
                    </h3>
                    <div className="pl-6 flex flex-col gap-1.5">
                        <p className="font-medium text-foreground capitalize-first">
                            {formatBookingDate(booking.event_date)}
                        </p>
                        <p className="text-primary font-bold flex items-center gap-1.5">
                            <Icon icon="lucide:clock" width={16} /> {formatBookingTime(booking.start_time)}
                        </p>
                    </div>
                </section>

                <Divider className="opacity-50" />

                {/* Ubicación */}
                <section>
                    <h3 className="text-[11px] font-bold tracking-widest text-default-500 uppercase flex items-center gap-2 mb-2">
                        <Icon icon="lucide:map-pin" width={14} /> UBICACIÓN
                    </h3>
                    <div className="pl-6">
                        <p className="font-medium text-foreground text-balance">
                            {booking.location_address || "Dirección no especificada"}
                        </p>
                        {booking.location_city ? (
                            <p className="text-default-500 text-sm mt-0.5">{booking.location_city}</p>
                        ) : null}
                        {booking.location_reference ? (
                            <p className="text-default-500 text-sm mt-1 flex gap-1 items-start">
                                <Icon icon="lucide:info" width={14} className="mt-0.5 shrink-0" />
                                {booking.location_reference}
                            </p>
                        ) : null}
                        
                        {(googleMapsUrl || openStreetMapUrl) && (
                            <div className="flex gap-2 mt-3">
                                {googleMapsUrl ? (
                                    <Button
                                        as="a"
                                        href={googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="sm"
                                        variant="flat"
                                        color="primary"
                                        radius="full"
                                        startContent={<Icon icon="lucide:map" width={14} />}
                                    >
                                        Maps
                                    </Button>
                                ) : null}
                                {openStreetMapUrl ? (
                                    <Button
                                        as="a"
                                        href={openStreetMapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="sm"
                                        variant="bordered"
                                        radius="full"
                                        startContent={<Icon icon="lucide:globe" width={14} />}
                                    >
                                        OSM
                                    </Button>
                                ) : null}
                            </div>
                        )}
                        {coords ? (
                            <div className="mt-4 rounded-xl overflow-hidden border border-default-200/60 aspect-video w-full bg-default-100">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    frameBorder="0" 
                                    scrolling="no" 
                                    marginHeight={0} 
                                    marginWidth={0} 
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.005},${coords.lng + 0.005},${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat},${coords.lng}`} 
                                    className="w-full h-full grayscale-[0.2] contrast-125 dark:opacity-80 transition-opacity"
                                />
                            </div>
                        ) : null}
                    </div>
                </section>

                <Divider className="opacity-50" />

                {/* Descripción */}
                <section>
                    <h3 className="text-[11px] font-bold tracking-widest text-default-500 uppercase flex items-center gap-2 mb-2">
                        <Icon icon="lucide:file-text" width={14} /> DESCRIPCIÓN DEL EVENTO
                    </h3>
                    <div className="pl-6">
                        {description ? (
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {description}
                            </p>
                        ) : (
                            <p className="text-sm text-default-400 italic">Sin descripción.</p>
                        )}
                    </div>
                </section>

                {repertoire.length > 0 ? (
                    <>
                        <Divider className="opacity-50" />
                        <section>
                            <h3 className="text-[11px] font-bold tracking-widest text-default-500 uppercase flex items-center gap-2 mb-2">
                                <Icon icon="lucide:music" width={14} /> TEMAS SOLICITADOS
                            </h3>
                            <div className="pl-6 flex flex-wrap gap-2">
                                {repertoire.map((title) => (
                                    <span
                                        key={title}
                                        className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary"
                                    >
                                        {title}
                                    </span>
                                ))}
                            </div>
                        </section>
                    </>
                ) : null}

                <Divider className="opacity-50" />

                {/* Notas del músico */}
                <section>
                    <h3 className="text-[11px] font-bold tracking-widest text-default-500 uppercase flex items-center gap-2 mb-2">
                        <Icon icon="lucide:message-square" width={14} /> NOTAS DEL MÚSICO
                    </h3>
                    <div className="pl-6">
                        {musicianNotes ? (
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {musicianNotes}
                            </p>
                        ) : (
                            <p className="text-sm text-default-400 italic">El músico no agregó notas en la cotización.</p>
                        )}
                    </div>
                </section>

                <Divider className="opacity-50" />

                {/* Economía */}
                <section>
                    <h3 className="text-[11px] font-bold tracking-widest text-default-500 uppercase flex items-center gap-2 mb-3">
                        <Icon icon="lucide:wallet" width={14} /> RESUMEN ECONÓMICO
                    </h3>
                    <div className="bg-default-50/50 rounded-xl p-4 border border-default-100 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-default-500 font-medium">
                                {role === "contractor" ? "Precio del servicio" : "Precio acordado"}
                            </span>
                            <span className="font-bold text-foreground">
                                {servicePrice != null ? formatCurrency(servicePrice) : "Pendiente"}
                            </span>
                        </div>
                        {role === "contractor" && fee > 0 ? (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-default-500 font-medium">Tarifa de servicio</span>
                                <span className="font-semibold text-default-600">{formatCurrency(fee)}</span>
                            </div>
                        ) : null}
                        {role === "contractor" && contractorTotal != null && fee > 0 ? (
                            <>
                                <Divider className="my-1 opacity-50" />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-foreground">Total a pagar</span>
                                    <span className="font-bold text-primary text-lg">{formatCurrency(contractorTotal)}</span>
                                </div>
                            </>
                        ) : null}
                    </div>
                </section>
            </div>
        </Card>
    );
}
