"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { PaymentEvidenceViewer } from "@/components/booking/contract-pdf-viewer";
import { formatCurrency } from "@/lib/booking-labels";
import { listBookingPayments } from "@/lib/payments";
import type { BookingOut, PaymentOut } from "@/types/api";

type Kind = "advance" | "balance" | "full";

type Props = {
    booking: BookingOut;
    kind: Kind;
};

function paymentTypeLabel(type: string | null): string {
    if (type === "advance") return "Anticipo";
    if (type === "balance") return "Abono final";
    if (type === "full") return "Pago total";
    return "Pago";
}

/**
 * Vista de solo lectura del anticipo/abono final: el músico ya no valida ni
 * rechaza comprobantes (eso lo resuelve un admin en Tesorería). Solo se
 * renderiza mientras el booking está en payment_pending/balance_review, así
 * que el pago más reciente relevante siempre está "initiated".
 */
export default function BookingPaymentStatusCard({ booking, kind }: Props) {
    const [payments, setPayments] = useState<PaymentOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
        });

        listBookingPayments(booking.id)
            .then((data) => {
                if (!cancelled) setPayments(data);
            })
            .catch(() => {
                if (!cancelled) setPayments([]);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [booking.id, booking.status]);

    const relevant = payments.filter((item) =>
        kind === "balance" ? item.payment_type === "balance" : kind === "advance" ? item.payment_type === "advance" : item.payment_type === "full",
    );
    const payment = relevant[relevant.length - 1] ?? null;

    return (
        <Card className="border border-warning/30 shadow-soft overflow-hidden">
            <div className="bg-gradient-to-br from-warning/10 via-warning/5 to-transparent px-6 py-6">
                <Chip color="warning" variant="flat" size="sm" className="mb-3">
                    {kind === "advance" ? "Anticipo" : kind === "full" ? "Pago total" : "Abono final"}
                </Chip>
                <h2 className="text-2xl font-bold text-foreground">
                    Pago en procesamiento
                </h2>
                <p className="text-sm text-default-600 mt-2 max-w-2xl">
                    El pago {kind === "advance" ? "del anticipo" : kind === "full" ? "total" : "del abono final"} está siendo procesado a través de Mercado Pago.
                    Pulsa &quot;Actualizar&quot; arriba para verificar si ya fue acreditado.
                </p>
            </div>

            <CardBody className="gap-5 p-6">
                {isLoading ? (
                    <div className="h-32 rounded-2xl bg-default-100 animate-pulse" />
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
                                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-sky-600 dark:text-sky-400 font-medium">
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


