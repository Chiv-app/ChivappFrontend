"use client";

import { Button, Card, CardBody, Chip, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import BookingLocationLinks from "@/components/booking/booking-location-links";
import {
    formatBookingDate,
    formatBookingTime,
    formatCurrency,
    formatQuotedAt,
} from "@/lib/booking-labels";
import {
    contractorPayableTotal,
    platformFeeAmount,
    platformAppFeeAmount,
    platformGatewayFeeAmount,
} from "@/lib/platform-fee";
import type { BookingOut } from "@/types/api";

type Props = {
    booking: BookingOut;
    isAccepting: boolean;
    isRejecting: boolean;
    onAccept: () => void;
    onReject: () => void;
};

function PriceStat({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl border p-4 ${
                highlight
                    ? "border-primary/30 bg-primary/10"
                    : "border-default-200 bg-content1"
            }`}
        >
            <p className="text-xs uppercase tracking-wide text-default-500">{label}</p>
            <p
                className={`mt-1 font-bold ${
                    highlight ? "text-2xl text-primary" : "text-lg text-foreground"
                }`}
            >
                {value}
            </p>
        </div>
    );
}

export default function BookingQuoteReviewCard({
    booking,
    isAccepting,
    isRejecting,
    onAccept,
    onReject,
}: Props) {
    const total = booking.price_agreed != null ? Number(booking.price_agreed) : null;
    const fee = platformFeeAmount(booking);
    const appFee = platformAppFeeAmount(booking);
    const gatewayFee = platformGatewayFeeAmount(booking);
    const contractorTotal = contractorPayableTotal(booking);
    const quotedAt = formatQuotedAt(booking.quoted_at);

    return (
        <Card className="border border-primary/20 shadow-soft overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Chip color="primary" variant="flat" size="sm" className="mb-3">
                            Cotización recibida
                        </Chip>
                        <h2 className="text-2xl font-bold text-foreground">
                            Propuesta del músico
                        </h2>
                        <p className="text-sm text-default-600 mt-2 max-w-xl">
                            Revisa el precio, las condiciones y la ubicación antes de decidir.
                            {quotedAt ? ` Enviada el ${quotedAt}.` : ""}
                        </p>
                    </div>
                    {contractorTotal != null ? (
                        <div className="w-full sm:w-auto rounded-3xl border border-primary/20 bg-content1/80 px-5 py-4 text-left sm:text-right shadow-soft">
                            <p className="text-xs text-default-500">Total a pagar</p>
                            <p className="text-3xl font-bold text-primary">
                                {formatCurrency(contractorTotal)}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>

            <CardBody className="gap-6 p-6">
                <div className="rounded-2xl border border-default-200 bg-default-50/50 p-5">
                    <p className="font-semibold text-foreground mb-4">Desglose del pago único</p>
                    <div className="flex flex-col gap-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-default-600">Tarifa del músico</span>
                            <span className="font-medium text-foreground">{total != null ? formatCurrency(total) : "—"}</span>
                        </div>
                        {fee > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-default-600">Tarifa de servicio</span>
                                <span className="font-medium text-foreground">{formatCurrency(fee)}</span>
                            </div>
                        )}
                        <Divider className="my-1" />
                        <div className="flex justify-between items-center text-base">
                            <span className="font-bold text-foreground">Total a pagar</span>
                            <span className="font-bold text-primary">{contractorTotal != null ? formatCurrency(contractorTotal) : "—"}</span>
                        </div>
                    </div>
                </div>
                {fee > 0 ? (
                    <p className="text-xs text-default-500 -mt-2">
                        * El músico recibe su tarifa íntegra. La tarifa de servicio incluye la comisión de la plataforma y los costos de procesamiento bancario.
                    </p>
                ) : null}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-default-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Icon
                                icon="material-symbols:event"
                                width={20}
                                className="text-primary"
                            />
                            <p className="font-semibold text-foreground">Resumen del evento</p>
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            <p>
                                <span className="text-default-500">Tipo: </span>
                                <span className="text-foreground">{booking.event_type}</span>
                            </p>
                            <p>
                                <span className="text-default-500">Fecha: </span>
                                <span className="text-foreground">
                                    {formatBookingDate(booking.event_date)}
                                </span>
                            </p>
                            <p>
                                <span className="text-default-500">Hora: </span>
                                <span className="text-foreground">
                                    {formatBookingTime(booking.start_time)}
                                    {booking.end_time
                                        ? ` – ${formatBookingTime(booking.end_time)}`
                                        : ""}
                                </span>
                            </p>
                        </div>
                    </div>

                    {booking.musician_quote_notes ? (
                        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Icon
                                    icon="material-symbols:chat-info"
                                    width={20}
                                    className="text-warning"
                                />
                                <p className="font-semibold text-foreground">
                                    Notas del músico
                                </p>
                            </div>
                            <p className="text-sm text-default-700 leading-relaxed">
                                {booking.musician_quote_notes}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-default-200 bg-default-50/50 p-4">
                            <p className="text-sm text-default-500">
                                El músico no agregó notas adicionales en esta cotización.
                            </p>
                        </div>
                    )}
                </div>

                <BookingLocationLinks
                    address={booking.location_address}
                    city={booking.location_city}
                    reference={booking.location_reference}
                />

                {booking.event_description ? (
                    <div className="rounded-2xl border border-default-200 p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">
                            Tu solicitud original
                        </p>
                        <p className="text-sm text-default-600">{booking.event_description}</p>
                    </div>
                ) : null}

                <Divider />

                <div className="rounded-2xl border border-default-200 bg-default-50/60 p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">
                        ¿Qué pasa después?
                    </p>
                    <ol className="flex flex-col gap-2 text-sm text-default-600">
                        <li className="flex items-start gap-2">
                            <Icon
                                icon="material-symbols:check-circle"
                                width={18}
                                className="text-success shrink-0 mt-0.5"
                            />
                            Si aceptas, revisarás el contrato del músico, firmarás y realizarás el pago de forma segura con Mercado Pago.
                        </li>
                        <li className="flex items-start gap-2">
                            <Icon
                                icon="material-symbols:cancel"
                                width={18}
                                className="text-danger shrink-0 mt-0.5"
                            />
                            Si rechazas, la reserva se cancelará y el músico será notificado.
                        </li>
                    </ol>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                    <Button
                        color="danger"
                        variant="flat"
                        radius="lg"
                        size="lg"
                        isLoading={isRejecting}
                        onPress={onReject}
                        className="font-semibold w-full sm:w-auto sm:min-w-44"
                    >
                        Rechazar cotización
                    </Button>
                    <Button
                        color="primary"
                        radius="lg"
                        size="lg"
                        isLoading={isAccepting}
                        onPress={onAccept}
                        className="font-semibold w-full sm:w-auto sm:min-w-52"
                        startContent={
                            <Icon icon="material-symbols:thumb-up" width={20} />
                        }
                    >
                        Aceptar cotización
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}
