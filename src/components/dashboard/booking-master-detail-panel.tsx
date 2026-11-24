"use client";

import Link from "next/link";
import {
    Avatar,
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import CircularStepper, {
    type CircularStepItem,
} from "@/components/ui/circular-stepper";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import {
    BOOKING_STATUS_COLORS,
    formatBookingDate,
    formatBookingTime,
    formatCurrency,
    getBookingStatusChipVariant,
    getBookingStatusHint,
    getBookingStatusLabel,
} from "@/lib/booking-labels";
import { buildBookingTimeline, getBookingStage } from "@/lib/booking-timeline";
import {
    buildGoogleMapsUrl,
    parseLocationReference,
} from "@/lib/geocoding";
import {
    contractorPayableTotal,
    platformFeeAmount,
} from "@/lib/platform-fee";
import { resolveUploadUrl } from "@/lib/uploads";
import type { BookingOut, UserRole } from "@/types/api";

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

function formatBookingCode(booking: BookingOut): string {
    const year = booking.event_date?.slice(0, 4) || "2026";
    const shortId = booking.id.replace(/-/g, "").slice(0, 4).toUpperCase();
    return `#CHV-${year}-${shortId}`;
}

function computeBookingDurationHours(
    startTime: string,
    endTime?: string | null,
): string | null {
    if (!endTime) return null;
    const [sh, sm] = startTime.slice(0, 5).split(":").map(Number);
    const [eh, em] = endTime.slice(0, 5).split(":").map(Number);
    if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) {
        return null;
    }
    let diffMinutes = eh * 60 + em - (sh * 60 + sm);
    if (diffMinutes <= 0) diffMinutes += 24 * 60;
    const hours = Math.round((diffMinutes / 60) * 10) / 10;
    return `${hours}h`;
}

function resolvePaymentStatusSummary(booking: BookingOut): {
    label: string;
    toneClass: string;
} {
    switch (booking.status) {
        case "payment_retained":
        case "change_pending":
        case "in_progress":
            return {
                label: "100 % protegido en custodia",
                toneClass: "text-success-text",
            };
        case "payment_released":
        case "completed":
            return {
                label: "Liberado al artista",
                toneClass: "text-success-text",
            };
        case "cancelled":
            return {
                label: "Reserva cancelada",
                toneClass: "text-danger-text",
            };
        case "contract_signed":
            return {
                label: "Listo para pago en Mercado Pago",
                toneClass: "text-primary-text",
            };
        default:
            return {
                label: "Pendiente de acuerdo y pago",
                toneClass: "text-default-600",
            };
    }
}

export type BookingDetailPreviewProps = {
    booking: BookingOut;
    role: Role;
    urgent: boolean;
    primaryActionLabel: string;
    detailHref: string;
    canCancel: boolean;
    onCancel: () => void;
    memberBadge?: boolean;
};

export function BookingDetailPreviewContent({
    booking,
    role,
    urgent,
    primaryActionLabel,
    detailHref,
    canCancel,
    onCancel,
    memberBadge = false,
}: BookingDetailPreviewProps) {
    const party =
        role === "contractor"
            ? {
                  label: "Músico / Agrupación",
                  name: booking.musician_name?.trim() || "Músico",
                  imageUrl: resolveUploadUrl(booking.musician_image_url),
                  profileHref: `/musicians/${booking.musician_id}`,
                  icon: "material-symbols:music-note",
              }
            : {
                  label: "Cliente solicitante",
                  name: booking.contractor_name?.trim() || "Cliente",
                  imageUrl: resolveUploadUrl(booking.contractor_image_url),
                  profileHref: `/contractors/${booking.contractor_id}`,
                  icon: "material-symbols:person",
              };

    const timeLabel = `${formatBookingTime(booking.start_time)}${
        booking.end_time ? ` – ${formatBookingTime(booking.end_time)}` : ""
    }`;
    const whenLabel = `${formatBookingDate(booking.event_date)} · ${timeLabel}`;
    const coords = parseLocationReference(booking.location_reference);
    const nonCoordReference =
        !coords && booking.location_reference?.trim()
            ? booking.location_reference.trim()
            : null;
    const mapsUrl = buildGoogleMapsUrl({
        lat: coords?.lat,
        lng: coords?.lng,
        address: booking.location_address,
        city: booking.location_city,
    });
    const addressLine =
        booking.location_address?.trim() || "Dirección exacta por confirmar";
    const cityLine = booking.location_city?.trim() || null;

    const totalService =
        booking.price_agreed != null ? Number(booking.price_agreed) : null;
    const fee = platformFeeAmount(booking);
    const contractorTotal = contractorPayableTotal(booking);
    const priceLabel =
        totalService != null ? formatCurrency(totalService) : "Sin cotizar";
    const paymentSummary = resolvePaymentStatusSummary(booking);

    const stage = getBookingStage(booking.status);
    const timeline = buildBookingTimeline(booking.status, role);
    const stepperItems: CircularStepItem[] = timeline.steps.map((step) => ({
        id: step.id,
        title:
            step.id === "quote"
                ? "Cotización"
                : step.id === "event"
                  ? "Show"
                  : step.title,
        state:
            step.state === "done"
                ? "done"
                : step.state === "current"
                  ? "current"
                  : "upcoming",
    }));

    const disputeHint = complaintHint(booking, role);
    const hintText = disputeHint || getBookingStatusHint(booking.status, role);
    const complaintOpen = booking.complaint_status === "open";
    const inDispute =
        Boolean(booking.complaint_status) &&
        booking.complaint_status !== "settled";
    const durationComputed = computeBookingDurationHours(
        booking.start_time,
        booking.end_time,
    );

    const hasEventExtraDetails = Boolean(
        booking.event_description?.trim() ||
            booking.musician_quote_notes?.trim() ||
            durationComputed,
    );

    return (
        <div className="flex flex-col gap-5">
            {/* 1. Cabecera: Estado, Código, Evento, Fecha y Monto */}
            <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-default-200/70 pb-4">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip
                            size="sm"
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
                            startContent={
                                <Icon
                                    icon={
                                        booking.status === "cancelled"
                                            ? "material-symbols:cancel-outline"
                                            : urgent
                                              ? "material-symbols:bolt"
                                              : "material-symbols:check-circle-outline"
                                    }
                                    width={15}
                                    aria-hidden="true"
                                />
                            }
                        >
                            {complaintOpen
                                ? COMPLAINT_STATUS_LABEL[
                                      booking.complaint_status || ""
                                  ] || "Queja"
                                : inDispute
                                  ? COMPLAINT_STATUS_LABEL[
                                        booking.complaint_status || ""
                                    ] || "En disputa"
                                  : urgent
                                    ? `Por atender · ${getBookingStatusLabel(booking.status, role)}`
                                    : getBookingStatusLabel(booking.status, role)}
                        </Chip>
                        <span className="text-xs font-semibold text-default-400 tabular-nums">
                            {formatBookingCode(booking)}
                        </span>
                        {memberBadge ? (
                            <Chip size="sm" variant="flat" color="secondary">
                                Como integrante
                            </Chip>
                        ) : null}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-2">
                        {booking.event_type}
                    </h2>
                    <p className="text-sm text-default-600 mt-1 capitalize">
                        {whenLabel}
                    </p>
                </div>

                <div className="sm:text-right shrink-0">
                    <p className="text-xs font-medium text-default-500">
                        {role === "musician" ? "Monto acordado" : "Precio del servicio"}
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums mt-0.5">
                        {priceLabel}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${paymentSummary.toneClass}`}>
                        {paymentSummary.label}
                    </p>
                </div>
            </header>

            {/* 2. Progreso de la contrata + Guía del paso actual */}
            {!stage.cancelled ? (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-default-600">
                            Progreso de la contrata
                        </p>
                        <span className="text-xs font-semibold text-primary-text">
                            Etapa {stage.index} de {stage.total} · {stage.title}
                        </span>
                    </div>
                    <CircularStepper
                        steps={stepperItems}
                        compact
                        ariaLabel="Progreso de la contrata"
                    />
                </div>
            ) : null}

            {hintText ? (
                <div
                    className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-xs sm:text-sm ${
                        disputeHint
                            ? "border-danger/30 bg-danger/10 text-danger-text"
                            : urgent
                              ? "border-warning/35 bg-warning/10 text-warning-text"
                              : booking.status === "completed" ||
                                  booking.status === "payment_released"
                                ? "border-success/30 bg-success/10 text-success-text"
                                : booking.status === "cancelled"
                                  ? "border-default-200 bg-default-100/80 text-default-600"
                                  : "border-primary/25 bg-primary/10 text-foreground"
                    }`}
                >
                    <Icon
                        icon={
                            disputeHint
                                ? "material-symbols:report-outline"
                                : urgent
                                  ? "material-symbols:bolt"
                                  : booking.status === "cancelled"
                                    ? "material-symbols:cancel-outline"
                                    : "material-symbols:info-outline"
                        }
                        width={18}
                        className="shrink-0 mt-0.5"
                        aria-hidden="true"
                    />
                    <p className="leading-snug">
                        {urgent && !disputeHint ? (
                            <span className="font-bold">Siguiente paso (tu turno): </span>
                        ) : null}
                        {hintText}
                    </p>
                </div>
            ) : null}

            {/* 3. Bloques de Cliente/Músico y Ubicación completa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Contraparte */}
                <div className="rounded-2xl border border-default-200/70 bg-default-50/70 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-default-500">
                            <Icon icon={party.icon} width={16} aria-hidden="true" />
                            <span>{party.label}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                            src={party.imageUrl ?? undefined}
                            name={party.name}
                            size="sm"
                            className="size-10 shrink-0"
                            showFallback
                            fallback={
                                <Icon
                                    icon={party.icon}
                                    width={18}
                                    className="text-default-500"
                                />
                            }
                        />
                        <div className="min-w-0">
                            <p className="font-bold text-foreground text-sm sm:text-base truncate">
                                {party.name}
                            </p>
                            <p className="text-xs text-default-500 truncate">
                                {role === "musician"
                                    ? "Contratista registrado en Chivapp"
                                    : "Artista / Agrupación verificada"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                            as={Link}
                            href={party.profileHref}
                            size="sm"
                            variant="bordered"
                            radius="full"
                            className="h-8 text-xs font-semibold bg-content1"
                            startContent={
                                <Icon
                                    icon="material-symbols:account-circle-outline"
                                    width={15}
                                />
                            }
                        >
                            Ver perfil
                        </Button>
                        <Button
                            as={Link}
                            href={detailHref}
                            size="sm"
                            variant="flat"
                            color="primary"
                            radius="full"
                            className="h-8 text-xs font-semibold"
                            startContent={
                                <Icon icon="material-symbols:chat-outline" width={15} />
                            }
                        >
                            Abrir chat y sala
                        </Button>
                    </div>
                </div>

                {/* Lugar del evento */}
                <div className="rounded-2xl border border-default-200/70 bg-default-50/70 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-default-500">
                            <Icon
                                icon="material-symbols:location-on-outline"
                                width={16}
                                aria-hidden="true"
                            />
                            <span>Lugar del evento</span>
                        </div>
                        {coords ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-text">
                                <Icon icon="material-symbols:my-location" width={13} />
                                GPS
                            </span>
                        ) : null}
                    </div>

                    <div className="min-w-0">
                        <p className="font-bold text-foreground text-sm sm:text-base break-words">
                            {addressLine}
                        </p>
                        {cityLine && cityLine !== addressLine ? (
                            <p className="text-xs font-medium text-default-600 mt-0.5">
                                {cityLine}
                            </p>
                        ) : null}
                        {nonCoordReference ? (
                            <p className="text-xs text-default-500 mt-1">
                                Ref.: {nonCoordReference}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        {mapsUrl ? (
                            <Button
                                as="a"
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                color="primary"
                                variant="flat"
                                radius="full"
                                className="h-8 text-xs font-semibold"
                                startContent={
                                    <Icon icon="material-symbols:map-outline" width={15} />
                                }
                            >
                                Abrir en Maps
                            </Button>
                        ) : (
                            <span className="text-xs text-default-400">
                                Sin enlace de mapa disponible
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. Detalles adicionales del evento (mensaje del cliente, duración, invitados, notas) */}
            {hasEventExtraDetails ? (
                <div className="rounded-2xl border border-default-200/70 bg-default-50/50 p-4 flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-default-500 flex items-center gap-1.5">
                            <Icon icon="material-symbols:notes" width={16} />
                            Detalles y requerimientos del evento
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {durationComputed ? (
                                <Chip size="sm" variant="flat" color="default">
                                    Duración: {durationComputed}
                                </Chip>
                            ) : null}
                        </div>
                    </div>
                    {booking.event_description?.trim() ? (
                        <p className="text-xs sm:text-sm text-default-700 italic bg-content1 rounded-xl px-3 py-2 border border-default-200/60">
                            “{booking.event_description.trim()}”
                        </p>
                    ) : null}
                    {booking.musician_quote_notes?.trim() ? (
                        <p className="text-xs text-default-600">
                            <span className="font-semibold text-foreground">
                                Condiciones de cotización:{" "}
                            </span>
                            {booking.musician_quote_notes.trim()}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {/* 5. Resumen económico */}
            <div className="rounded-2xl border border-default-200/70 bg-default-50/70 p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-default-500">
                    Resumen económico
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <p className="text-[11px] text-default-500">
                            {role === "musician" ? "Tu tarifa neta" : "Precio servicio"}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
                            {totalService != null
                                ? formatCurrency(totalService)
                                : "Por cotizar"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] text-default-500">
                            Servicio y pasarela
                        </p>
                        <p className="text-sm sm:text-base font-bold text-primary-text tabular-nums mt-0.5">
                            {totalService != null ? formatCurrency(fee) : "—"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] text-default-500">
                            Total contratista
                        </p>
                        <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
                            {contractorTotal != null
                                ? formatCurrency(contractorTotal)
                                : "—"}
                        </p>
                    </div>
                </div>
            </div>

            {/* 6. Acciones principales */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-default-200/70">
                <div>
                    {canCancel ? (
                        <Button
                            color="danger"
                            variant="bordered"
                            radius="full"
                            size="sm"
                            onPress={onCancel}
                            className="w-full sm:w-auto font-semibold border-danger/40"
                        >
                            Cancelar reserva
                        </Button>
                    ) : null}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button
                        as={Link}
                        href={detailHref}
                        variant="flat"
                        color="primary"
                        radius="full"
                        size="md"
                        className="font-semibold"
                        startContent={
                            <Icon
                                icon="material-symbols:description-outline"
                                width={17}
                            />
                        }
                    >
                        Ver contrato y sala
                    </Button>
                    <Button
                        as={Link}
                        href={detailHref}
                        color={urgent || inDispute ? "warning" : "primary"}
                        variant="solid"
                        radius="full"
                        size="md"
                        className="font-bold shadow-soft"
                        startContent={
                            <Icon
                                icon={
                                    urgent || inDispute
                                        ? "material-symbols:bolt"
                                        : "material-symbols:check-rounded"
                                }
                                width={18}
                            />
                        }
                    >
                        {urgent || inDispute
                            ? primaryActionLabel
                            : "Gestionar presentación"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export type BookingAgendaListItemProps = {
    booking: BookingOut;
    role: Role;
    urgent: boolean;
    isSelected: boolean;
    onSelect: () => void;
    memberBadge?: boolean;
};

function getCompactStatusBadge(
    booking: BookingOut,
    role: Role,
    urgent: boolean,
): { label: string; className: string } {
    if (booking.complaint_status === "open") {
        return {
            label: "Queja pendiente",
            className: "bg-danger/15 text-danger-text border-danger/30",
        };
    }
    if (urgent) {
        return {
            label:
                booking.status === "requested"
                    ? role === "musician"
                        ? "Por cotizar"
                        : "Por confirmar"
                    : "Por atender",
            className: "bg-warning/20 text-warning-text border-warning/35",
        };
    }
    switch (booking.status) {
        case "payment_retained":
            return {
                label: "Confirmada",
                className: "bg-success/15 text-success-text border-success/30",
            };
        case "in_progress":
            return {
                label: "Show en curso",
                className: "bg-primary/15 text-primary-text border-primary/30",
            };
        case "payment_released":
        case "completed":
            return {
                label: "Finalizada",
                className: "bg-success/20 text-success-text border-success/35",
            };
        case "cancelled":
            return {
                label: "Cancelada",
                className: "bg-danger/10 text-danger-text border-danger/25",
            };
        case "accepted":
            return {
                label: "Cotizada",
                className: "bg-primary/15 text-primary-text border-primary/25",
            };
        case "contract_pending":
        case "contract_signed":
            return {
                label: "En firma / pago",
                className: "bg-secondary/15 text-secondary border-secondary/25",
            };
        default:
            return {
                label: getBookingStatusLabel(booking.status, role),
                className: "bg-default-100 text-default-700 border-default-200",
            };
    }
}

export function BookingAgendaListItem({
    booking,
    role,
    urgent,
    isSelected,
    onSelect,
    memberBadge = false,
}: BookingAgendaListItemProps) {
    const startTime = formatBookingTime(booking.start_time);
    const durationLabel =
        computeBookingDurationHours(booking.start_time, booking.end_time) ??
        (booking.end_time ? formatBookingTime(booking.end_time) : "Show");
    const placeLabel =
        [booking.location_address, booking.location_city]
            .filter(Boolean)
            .join(", ") || "Ubicación por definir";
    const counterpartyName =
        role === "contractor"
            ? booking.musician_name?.trim() || "Músico"
            : booking.contractor_name?.trim() || "Cliente";
    const priceLabel =
        booking.price_agreed != null
            ? formatCurrency(Number(booking.price_agreed))
            : "Sin cotizar";
    const statusBadge = getCompactStatusBadge(booking, role, urgent);

    const timeBoxClass =
        booking.status === "cancelled"
            ? "bg-default-100 text-default-500"
            : urgent
              ? "bg-warning/20 text-warning-text"
              : booking.status === "completed" ||
                  booking.status === "payment_released"
                ? "bg-success/15 text-success-text"
                : "bg-primary/15 text-primary-text";

    return (
        <button
            type="button"
            aria-pressed={isSelected}
            onClick={onSelect}
            className={`w-full text-left rounded-2xl border p-3 sm:p-3.5 transition-all flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                isSelected
                    ? "border-2 border-primary bg-primary/[0.04] shadow-soft"
                    : "border-default-200/80 bg-content1 hover:border-default-300 hover:bg-default-50/50"
            }`}
        >
            {/* Bloque izquierdo: Hora + Duración */}
            <div
                className={`flex flex-col items-center justify-center rounded-xl px-2.5 py-2 min-w-[4.25rem] shrink-0 ${timeBoxClass}`}
            >
                <span className="text-sm font-extrabold tabular-nums leading-tight">
                    {startTime}
                </span>
                <span className="text-[11px] font-semibold opacity-85 mt-0.5 tabular-nums">
                    {durationLabel}
                </span>
            </div>

            {/* Bloque central: Evento, Ubicación y Cliente/Músico */}
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-sm sm:text-base text-foreground truncate">
                        {booking.event_type}
                    </span>
                    {memberBadge ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary shrink-0">
                            Integrante
                        </span>
                    ) : null}
                </div>
                <p
                    className="text-xs text-default-600 truncate flex items-center gap-1"
                    title={placeLabel}
                >
                    <Icon
                        icon="material-symbols:location-on-outline"
                        width={13}
                        className="shrink-0 text-default-400"
                        aria-hidden="true"
                    />
                    <span className="truncate">{placeLabel}</span>
                </p>
                <p className="text-[11px] text-default-500 truncate flex items-center gap-1">
                    <Icon
                        icon={
                            role === "contractor"
                                ? "material-symbols:music-note"
                                : "material-symbols:person-outline"
                        }
                        width={13}
                        className="shrink-0 text-default-400"
                        aria-hidden="true"
                    />
                    <span className="truncate">{counterpartyName}</span>
                </p>
            </div>

            {/* Bloque derecho: Estado + Monto */}
            <div className="flex flex-col items-end justify-between gap-1.5 shrink-0 text-right">
                <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${statusBadge.className}`}
                >
                    {statusBadge.label}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-foreground tabular-nums">
                    {priceLabel}
                </span>
            </div>
        </button>
    );
}

export type BookingDateGroup = {
    eventDate: string;
    headerLabel: string;
    isToday: boolean;
    items: BookingOut[];
};

export function groupBookingsByEventDate(
    bookings: BookingOut[],
): BookingDateGroup[] {
    const todayIso = new Date().toLocaleDateString("sv-SE", {
        timeZone: "America/Lima",
    });
    const map = new Map<string, BookingOut[]>();
    for (const booking of bookings) {
        const key = booking.event_date || "Sin fecha";
        const existing = map.get(key);
        if (existing) {
            existing.push(booking);
        } else {
            map.set(key, [booking]);
        }
    }

    const groups: BookingDateGroup[] = [];
    for (const [eventDate, items] of map.entries()) {
        const isToday = eventDate === todayIso;
        let formatted = eventDate;
        if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
            const d = new Date(`${eventDate}T12:00:00-05:00`);
            const raw = d.toLocaleDateString("es-PE", {
                timeZone: "America/Lima",
                weekday: "long",
                day: "numeric",
                month: "short",
            });
            formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
        }
        groups.push({
            eventDate,
            headerLabel: isToday ? `Hoy · ${formatted}` : formatted,
            isToday,
            items,
        });
    }
    return groups;
}

export function BookingMobileSheet({
    isOpen,
    onOpenChange,
    ...props
}: BookingDetailPreviewProps & {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            placement="bottom"
            size="2xl"
            scrollBehavior="inside"
            closeButton={<ModalCloseButton aria-label="Cerrar detalle de reserva" />}
            classNames={{
                base: "m-0 sm:m-2 rounded-t-3xl sm:rounded-3xl max-h-[90dvh]",
                wrapper: "items-end sm:items-center",
                body: "px-4 pb-6 pt-3 overflow-y-auto",
            }}
        >
            <ModalContent>
                <ModalBody>
                    <div
                        aria-hidden="true"
                        className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-default-300/80"
                    />
                    <BookingDetailPreviewContent {...props} />
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
