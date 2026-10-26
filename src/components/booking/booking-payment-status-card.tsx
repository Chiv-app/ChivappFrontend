"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { PaymentEvidenceViewer } from "@/components/booking/contract-pdf-viewer";
import { PAYMENT_TYPE_LABELS, formatCurrency } from "@/lib/booking-labels";
import { listBookingPayments } from "@/lib/payments";
import type { BookingOut, PaymentOut } from "@/types/api";

type Props = {
    booking: BookingOut;
};

function paymentTypeLabel(type: string | null): string {
    return (type && PAYMENT_TYPE_LABELS[type]) || "Pago";
}

/**
 * Vista de solo lectura del pago único (100 %) con Mercado Pago. Solo se
 * renderiza mientras el booking está en payment_pending, así que el pago más
 * reciente siempre está "initiated".
 */
export default function BookingPaymentStatusCard({ booking }: Props) {
    const [payments, setPayments] = useState<PaymentOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [reloadCount, setReloadCount] = useState(0);

    useEffect(() => {
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (!cancelled) {
                setIsLoading(true);
                setLoadError(null);
            }
        });

        listBookingPayments(booking.id)
            .then((data) => {
                if (!cancelled) setPayments(data);
            })
            .catch((err) => {
                if (!cancelled) {
                    setPayments([]);
                    setLoadError(
                        err instanceof Error
                            ? err.message
                            : "No se pudo cargar el detalle del pago.",
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [booking.id, booking.status, reloadCount]);

    // Pago único; "advance" es metadata antigua equivalente al pago total.
    const relevant = payments.filter(
        (item) => item.payment_type === "full" || item.payment_type === "advance",
    );
    const payment = relevant[relevant.length - 1] ?? null;

    return (
        <Card className="border border-warning/30 shadow-soft overflow-hidden">
            <div className="bg-gradient-to-br from-warning/10 via-warning/5 to-transparent px-6 py-6">
                <Chip color="warning" variant="flat" size="sm" className="mb-3">
                    Pago total
                </Chip>
                <h2 className="text-2xl font-bold text-foreground">
                    Pago en procesamiento
                </h2>
                <p className="text-sm text-default-600 mt-2 max-w-2xl">
                    El pago total está siendo procesado a través de Mercado Pago.
                    Pulsa &quot;Actualizar&quot; arriba para verificar si ya fue acreditado.
                </p>
            </div>

            <CardBody className="gap-5 p-6">
                {isLoading ? (
                    <div className="h-32 rounded-2xl bg-default-100 animate-pulse" />
                ) : loadError ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                        <span>{loadError}</span>
                        <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            onPress={() => setReloadCount((c) => c + 1)}
                            startContent={<Icon icon="material-symbols:refresh" width={16} />}
                        >
                            Reintentar
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-default-200 p-4">
                                <p className="text-xs text-default-500">Monto</p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {payment ? formatCurrency(Number(payment.amount)) : "—"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-default-200 p-4">
                                <p className="text-xs text-default-500">Tipo de pago</p>
                                <p className="text-lg font-semibold text-foreground mt-1">
                                    {payment ? paymentTypeLabel(payment.payment_type) : "—"}
                                </p>
                                {payment?.gateway_provider === "mercadopago" && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-primary-text font-medium">
                                        <Icon icon="material-symbols:verified" width={14} />
                                        Mercado Pago {payment.gateway_payment_id ? `#${payment.gateway_payment_id}` : ""}
                                    </span>
                                )}
                            </div>
                        </div>

                        {payment ? (
                            <div className="rounded-2xl border border-default-200 bg-default-50/60 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon
                                        icon="material-symbols:payments"
                                        width={18}
                                        className="text-default-500"
                                    />
                                    <p className="text-sm font-semibold text-foreground">
                                        Detalle de la transacción
                                    </p>
                                </div>
                                {payment.evidence_url || (payment.evidence_urls && payment.evidence_urls.length > 0) ? (
                                    <PaymentEvidenceViewer
                                        evidenceUrl={payment.evidence_url}
                                        evidenceUrls={payment.evidence_urls}
                                        label={`Detalle · ${paymentTypeLabel(payment.payment_type)}`}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-default-600">
                                        <Icon icon="material-symbols:check-circle" width={18} className="text-success" />
                                        <span>Procesado digitalmente vía Mercado Pago Checkout.</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-default-500">
                                Esperando registro de la transacción.
                            </p>
                        )}
                    </>
                )}
            </CardBody>
        </Card>
    );
}


