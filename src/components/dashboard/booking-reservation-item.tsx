"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
    Avatar,
    Button,
    Card,
    CardBody,
    Chip,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_TONE_ACCENT_BAR,
    BOOKING_STATUS_TONE_CARD,
    formatBookingDate,
    formatBookingTime,
    formatCurrency,
    getBookingStatusChipVariant,
    getBookingStatusHint,
    getBookingStatusLabel,
    getBookingStatusTone,
    type BookingStatusTone,
} from "@/lib/booking-labels";
import {
    buildGoogleMapsUrl,
    parseLocationReference,
} from "@/lib/geocoding";
import { resolveUploadUrl } from "@/lib/uploads";
import type { BookingOut, UserRole } from "@/types/api";
import {
    contractorPayableTotal,
    platformFeeAmount,
} from "@/lib/platform-fee";

export type BookingLayoutMode = "cards" | "list";

type Role = Extract<UserRole, "musician" | "contractor">;

const COMPLAINT_STATUS_LABEL: Record<string, string> = {
    open: "Queja pendiente",
    musician_accepted: "Queja aceptada",
    musician_responded: "Con descargo",
    settled: "Queja liquidada",
};

function complaintHint(booking: BookingOut, role: Role): string | null {
    if (!booking.complaint_status) return null;
    if (booking.complaint_status === "settled") {
        return "Esta reserva tuvo una queja ya liquidada por el administrador.";
    }
    if (role === "musician" && booking.complaint_status === "open") {
        return booking.complaint_reason
            ? `Hay una queja abierta: “${booking.complaint_reason}”. Entra para aceptar o presentar descargo.`
            : "Hay una queja abierta. Entra para aceptar o presentar descargo.";
    }
    if (role === "musician") {
        return "La disputa está en revisión del administrador.";
    }
    if (booking.complaint_status === "open") {
        return "Tu queja está esperando respuesta del músico.";
    }
    return "Tu queja está en revisión del administrador para liquidar.";
}

type Props = {
    booking: BookingOut;
    role: Role;
    layout: BookingLayoutMode;
    urgent: boolean;
    primaryActionLabel: string;
    detailHref: string;
    canCancel: boolean;
    isCancelling: boolean;
    onCancel: () => void;
    memberBadge?: boolean;
};

type Party = {
    label: string;
    name: string;
    imageUrl: string | null;
    profileHref: string;
    icon: string;
};

function resolveCounterparty(booking: BookingOut, role: Role): Party {
    if (role === "contractor") {
        return {
            label: "Músico",
            name: booking.musician_name?.trim() || "Músico",
            imageUrl: resolveUploadUrl(booking.musician_image_url),
            profileHref: `/musicians/${booking.musician_id}`,
            icon: "material-symbols:music-note",
        };
    }
    return {
        label: "Cliente",
        name: booking.contractor_name?.trim() || "Cliente",
        imageUrl: resolveUploadUrl(booking.contractor_image_url),
        profileHref: `/contractors/${booking.contractor_id}`,
        icon: "material-symbols:person",
    };
}

function StatusChip({
    booking,
    role,
    urgent,
}: {
    booking: BookingOut;
    role: Role;
    urgent: boolean;
}) {
    const complaintOpen = booking.complaint_status === "open";
    const inDispute =
        Boolean(booking.complaint_status) &&
        booking.complaint_status !== "settled";

    return (
        <Chip
            color={
                complaintOpen || (urgent && inDispute)
                    ? "danger"
                    : urgent
                      ? "warning"
                      : inDispute
                        ? "danger"
                        : BOOKING_STATUS_COLORS[booking.status]
            }
            variant={
                urgent || inDispute
                    ? "solid"
                    : getBookingStatusChipVariant(booking.status)
            }
            size="sm"
            className="shrink-0"
        >
            {complaintOpen
                ? roleAgnosticComplaintLabel(booking)
                : inDispute
                  ? COMPLAINT_STATUS_LABEL[booking.complaint_status || ""] ||
                    "En disputa"
                  : urgent
                    ? `Acción: ${getBookingStatusLabel(booking.status, role)}`
                    : getBookingStatusLabel(booking.status, role)}
        </Chip>
    );
}

function roleAgnosticComplaintLabel(booking: BookingOut) {
    return COMPLAINT_STATUS_LABEL[booking.complaint_status || ""] || "Queja";
}

function FactRow({
    icon,
    label,
    children,
    trailing,
}: {
    icon: string;
    label: string;
    children: ReactNode;
    trailing?: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[1.25rem_4.5rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 text-sm">
            <Icon
                icon={icon}
                width={16}
                className="text-default-500 justify-self-center"
                aria-hidden
            />
            <span className="text-default-500">{label}</span>
            <div className="min-w-0 text-foreground">{children}</div>
            {trailing ? <div className="shrink-0 pl-1">{trailing}</div> : null}
        </div>
    );
}

function PartyValue({ party }: { party: Party }) {
    return (
        <Link
            href={party.profileHref}
            className="inline-flex items-center gap-2 min-w-0 max-w-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            title={`Ver perfil de ${party.name}`}
        >
            <Avatar
                src={party.imageUrl ?? undefined}
                name={party.name}
                size="sm"
                className="size-6 shrink-0"
                classNames={{ base: "size-6", icon: "size-3.5" }}
                showFallback
                fallback={
                    <Icon
                        icon={party.icon}
                        width={14}
                        className="text-default-500"
                    />
                }
            />
            <span className="font-medium truncate hover:underline underline-offset-2">
                {party.name}
            </span>
        </Link>
    );
}

function PriceDetailButton({ booking }: { booking: BookingOut }) {
    const [isOpen, setIsOpen] = useState(false);

    const total =
        booking.price_agreed != null ? Number(booking.price_agreed) : null;
    const fee = platformFeeAmount(booking);
    const contractorTotal = contractorPayableTotal(booking);
    const feePercent =
        booking.platform_fee_percent != null
            ? Number(booking.platform_fee_percent)
            : null;

    return (
        <Popover
            placement="top"
            isOpen={isOpen}
            onOpenChange={setIsOpen}
        >
            <PopoverTrigger>
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    radius="full"
                    className="h-6 w-6 min-w-6 text-default-500 data-[hover=true]:text-foreground"
                    aria-label="Ver detalle del precio"
                >
                    <Icon icon="material-symbols:info-outline" width={16} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-3 w-60">
                <div className="flex flex-col gap-2 w-full">
                    <p className="text-xs font-semibold uppercase tracking-wide text-default-500">
                        Detalle del precio
                    </p>
                    <dl className="flex flex-col gap-1.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-default-500">Precio servicio</dt>
                            <dd className="font-semibold tabular-nums text-foreground">
                                {total != null
                                    ? formatCurrency(total)
                                    : "Sin cotizar"}
                            </dd>
                        </div>
                        {fee > 0 ? (
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-default-500">
                                    Comisión
                                    {feePercent != null ? ` (${feePercent}%)` : ""}
                                </dt>
                                <dd className="font-medium tabular-nums text-foreground">
                                    {formatCurrency(fee)}
                                </dd>
                            </div>
                        ) : null}
                        {contractorTotal != null && fee > 0 ? (
                            <div className="flex items-center justify-between gap-3 border-t border-default-200/70 pt-1.5 mt-0.5">
                                <dt className="text-default-500">Total contratista</dt>
                                <dd className="font-semibold tabular-nums text-foreground">
                                    {formatCurrency(contractorTotal)}
                                </dd>
                            </div>
                        ) : null}
                    </dl>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function PriceValue({
    booking,
    priceLabel,
}: {
    booking: BookingOut;
    priceLabel: string;
}) {
    return (
        <span className="inline-flex items-center gap-1 min-w-0">
            <span className="font-semibold tabular-nums text-foreground">
                {priceLabel}
            </span>
            <PriceDetailButton booking={booking} />
        </span>
    );
}

function MapsButton({
    url,
    iconOnly = false,
}: {
    url: string;
    iconOnly?: boolean;
}) {
    return (
        <Button
            as="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="flat"
            color="primary"
            radius="lg"
            isIconOnly={iconOnly}
            className={
                iconOnly
                    ? "h-7 w-7 min-w-7"
                    : "h-7 min-w-0 px-2.5 text-xs font-medium"
            }
            startContent={
                iconOnly ? undefined : (
                    <Icon icon="material-symbols:map" width={14} />
                )
            }
            aria-label="Abrir ubicación en Maps"
        >
            {iconOnly ? (
                <Icon icon="material-symbols:map" width={16} />
            ) : (
                "Maps"
            )}
        </Button>
    );
}

function CardActions({
    urgent,
    primaryActionLabel,
    detailHref,
    canCancel,
    isCancelling,
    onCancel,
    dense = false,
}: {
    urgent: boolean;
    primaryActionLabel: string;
    detailHref: string;
    canCancel: boolean;
    isCancelling: boolean;
    onCancel: () => void;
    dense?: boolean;
}) {
    return (
        <div
            className={`flex items-center gap-2 ${
                dense ? "flex-wrap justify-end" : "pt-1 border-t border-default-200/60"
            }`}
        >
            <Button
                as={Link}
                href={detailHref}
                color={urgent ? "warning" : "primary"}
                variant={urgent ? "solid" : "flat"}
                radius="lg"
                size="sm"
                className={`font-semibold ${dense ? "" : "flex-1"}`}
                startContent={
                    <Icon
                        icon={
                            urgent
                                ? "material-symbols:bolt"
                                : "material-symbols:arrow-forward"
                        }
                        width={18}
                    />
                }
            >
                {urgent ? primaryActionLabel : "Ver detalle"}
            </Button>
            {canCancel ? (
                <Button
                    color="danger"
                    variant="light"
                    radius="lg"
                    size="sm"
                    isLoading={isCancelling}
                    onPress={onCancel}
                    aria-label="Cancelar reserva"
                >
                    Cancelar
                </Button>
            ) : null}
        </div>
    );
}

export default function BookingReservationItem({
    booking,
    role,
    layout,
    urgent,
    primaryActionLabel,
    detailHref,
    canCancel,
    isCancelling,
    onCancel,
    memberBadge = false,
}: Props) {
    const tone = getBookingStatusTone(booking.status);
    const party = resolveCounterparty(booking, role);
    const timeLabel = `${formatBookingTime(booking.start_time)}${
        booking.end_time ? ` – ${formatBookingTime(booking.end_time)}` : ""
    }`;
    const placeLabel =
        [booking.location_address, booking.location_city]
            .filter(Boolean)
            .join(", ") || "Sin ubicación";
    const priceLabel =
        booking.price_agreed != null
            ? formatCurrency(Number(booking.price_agreed))
            : "Sin cotizar";
    const coords = parseLocationReference(booking.location_reference);
    const mapsUrl = buildGoogleMapsUrl({
        lat: coords?.lat,
        lng: coords?.lng,
        address: booking.location_address,
        city: booking.location_city,
    });
    const whenLabel = `${formatBookingDate(booking.event_date)} · ${timeLabel}`;
    const disputeHint = complaintHint(booking, role);
    const disputeUrgent =
        Boolean(booking.complaint_status) &&
        booking.complaint_status !== "settled";
    const visualTone: BookingStatusTone =
        urgent || disputeUrgent ? "action" : tone;
    const badges = (
        <div className="flex flex-col items-end gap-1 shrink-0">
            {memberBadge ? (
                <Chip size="sm" variant="flat" color="secondary">
                    Como integrante
                </Chip>
            ) : null}
            <StatusChip booking={booking} role={role} urgent={urgent} />
        </div>
    );

    if (layout === "list") {
        return (
            <Card
                className={`relative border overflow-hidden shadow-soft ${BOOKING_STATUS_TONE_CARD[visualTone]}`}
            >
                <div
                    aria-hidden
                    className={`absolute inset-y-0 left-0 w-1 ${BOOKING_STATUS_TONE_ACCENT_BAR[visualTone]}`}
                />
                <CardBody className="pl-4 sm:pl-5 py-4 px-4 gap-3">
                    {/* Mobile / tablet: same hierarchy as cards */}
                    <div className="flex flex-col gap-3 lg:hidden">
                        <header className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-foreground leading-snug">
                                    {booking.event_type}
                                </h2>
                                <p className="text-sm text-default-600 mt-1">
                                    {whenLabel}
                                </p>
                            </div>
                            {badges}
                        </header>

                        <div className="flex flex-col gap-2.5">
                            <FactRow icon={party.icon} label={party.label}>
                                <PartyValue party={party} />
                            </FactRow>
                            <FactRow
                                icon="material-symbols:location-on"
                                label="Lugar"
                                trailing={
                                    mapsUrl ? (
                                        <MapsButton url={mapsUrl} iconOnly />
                                    ) : undefined
                                }
                            >
                                <span className="truncate block" title={placeLabel}>
                                    {placeLabel}
                                </span>
                            </FactRow>
                            <FactRow icon="material-symbols:payments" label="Precio">
                                <PriceValue booking={booking} priceLabel={priceLabel} />
                            </FactRow>
                        </div>

                        {disputeHint ? (
                            <p className="text-sm text-danger-text bg-danger/10 rounded-xl px-3 py-2">
                                {disputeHint}
                            </p>
                        ) : urgent ? (
                            <p className="text-sm text-warning-text bg-warning/10 rounded-xl px-3 py-2">
                                {getBookingStatusHint(booking.status, role)}
                            </p>
                        ) : null}

                        <CardActions
                            urgent={urgent || disputeUrgent}
                            primaryActionLabel={primaryActionLabel}
                            detailHref={detailHref}
                            canCancel={canCancel}
                            isCancelling={isCancelling}
                            onCancel={onCancel}
                        />
                    </div>

                    {/* Desktop: scannable columns, same facts */}
                    <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(9rem,0.9fr)_minmax(0,1.2fr)_8rem_minmax(11rem,auto)] lg:gap-x-5 lg:items-center">
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-foreground truncate">
                                {booking.event_type}
                            </h2>
                            <p className="text-sm text-default-600 mt-1 truncate">
                                {whenLabel}
                            </p>
                            {disputeHint ? (
                                <p className="text-xs text-danger-text mt-1.5 line-clamp-2">
                                    {disputeHint}
                                </p>
                            ) : urgent ? (
                                <p className="text-xs text-warning-text mt-1.5 line-clamp-2">
                                    {getBookingStatusHint(booking.status, role)}
                                </p>
                            ) : null}
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wide text-default-500 mb-1">
                                {party.label}
                            </p>
                            <PartyValue party={party} />
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wide text-default-500 mb-1">
                                Lugar
                            </p>
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className="text-sm text-foreground truncate"
                                    title={placeLabel}
                                >
                                    {placeLabel}
                                </span>
                                {mapsUrl ? (
                                    <MapsButton url={mapsUrl} iconOnly />
                                ) : null}
                            </div>
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wide text-default-500 mb-1">
                                Precio
                            </p>
                            <PriceValue booking={booking} priceLabel={priceLabel} />
                        </div>

                        <div className="flex flex-col items-end gap-2 min-w-0">
                            {badges}
                            <CardActions
                                urgent={urgent || disputeUrgent}
                                primaryActionLabel={primaryActionLabel}
                                detailHref={detailHref}
                                canCancel={canCancel}
                                isCancelling={isCancelling}
                                onCancel={onCancel}
                                dense
                            />
                        </div>
                    </div>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card
            className={`relative border overflow-hidden shadow-soft h-full ${BOOKING_STATUS_TONE_CARD[visualTone]}`}
        >
            <div
                aria-hidden
                className={`absolute inset-y-0 left-0 w-1 ${BOOKING_STATUS_TONE_ACCENT_BAR[visualTone]}`}
            />
            <CardBody className="pl-5 p-5 flex flex-col gap-4 h-full">
                {/* 1. Identity + status */}
                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-foreground leading-tight tracking-tight">
                            {booking.event_type}
                        </h2>
                        <p className="text-sm text-default-600 mt-1.5">
                            {whenLabel}
                        </p>
                    </div>
                    {badges}
                </header>

                {/* 2. Facts — one scan path */}
                <div className="flex flex-col gap-2.5">
                    <FactRow icon={party.icon} label={party.label}>
                        <PartyValue party={party} />
                    </FactRow>
                    <FactRow
                        icon="material-symbols:location-on"
                        label="Lugar"
                        trailing={mapsUrl ? <MapsButton url={mapsUrl} /> : undefined}
                    >
                        <span className="truncate block" title={placeLabel}>
                            {placeLabel}
                        </span>
                    </FactRow>
                    <FactRow icon="material-symbols:payments" label="Precio">
                        <PriceValue booking={booking} priceLabel={priceLabel} />
                    </FactRow>
                </div>

                {/* 3. Guidance only when it helps */}
                {disputeHint ? (
                    <p className="text-sm text-danger-700 dark:text-danger-400 bg-danger/10 rounded-xl px-3 py-2">
                        {disputeHint}
                    </p>
                ) : urgent ? (
                    <p className="text-sm text-warning-700 dark:text-warning-500 bg-warning/10 rounded-xl px-3 py-2">
                        {getBookingStatusHint(booking.status, role)}
                    </p>
                ) : null}

                {/* 4. Actions */}
                <div className="mt-auto">
                    <CardActions
                        urgent={urgent || disputeUrgent}
                        primaryActionLabel={primaryActionLabel}
                        detailHref={detailHref}
                        canCancel={canCancel}
                        isCancelling={isCancelling}
                        onCancel={onCancel}
                    />
                </div>
            </CardBody>
        </Card>
    );
}
