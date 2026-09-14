"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Chip, Divider } from "@heroui/react";
import { PaymentEvidenceViewer } from "@/components/booking/contract-pdf-viewer";
import ContractDocumentView from "@/components/booking/contract-document-view";
import { formatCurrency } from "@/lib/booking-labels";
import { getBookingContract } from "@/lib/contracts";
import { listBookingPayments } from "@/lib/payments";
import type { BookingOut, ContractOut, PaymentOut } from "@/types/api";

type Props = {
    booking: BookingOut;
    title?: string;
    description?: string;
    showPaymentDetails?: boolean;
};

function paymentTypeLabel(type: string | null): string {
    if (type === "advance") return "Anticipo";
    if (type === "balance") return "Abono final";
    if (type === "full") return "Pago total";
    return "Pago";
}

function paymentStatusLabel(status: PaymentOut["status"]): string {
    switch (status) {
        case "initiated":
            return "En revisión";
        case "retained":
            return "Validado";
        case "released":
            return "Liberado";
        case "refunded":
            return "Reembolsado";
        case "failed":
            return "Fallido";
        default:
            return status;
    }
}

function paymentStatusColor(
    status: PaymentOut["status"],
): "warning" | "success" | "primary" | "danger" | "default" {
    switch (status) {
        case "initiated":
            return "warning";
        case "retained":
        case "released":
            return "success";
        case "failed":
            return "danger";
        default:
            return "default";
    }
}

export default function BookingDocumentsCard({
    booking,
    title = "Contrato y pagos",
    description = "Documentos y registro de pagos asociados a esta reserva.",
    showPaymentDetails = true,
}: Props) {
    const [contract, setContract] = useState<ContractOut | null>(null);
    const [payments, setPayments] = useState<PaymentOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
        });

        Promise.all([
            getBookingContract(booking.id).catch(() => null),
            listBookingPayments(booking.id).catch(() => []),
        ])
            .then(([contractData, paymentData]) => {
                if (cancelled) return;
                setContract(contractData);
                setPayments(paymentData);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [booking.id, booking.status]);

    return (
        <Card className="border border-default-200/70 shadow-soft overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-5">
                <Chip color="primary" variant="flat" size="sm" className="mb-3">
                    Documentos
                </Chip>
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <p className="text-sm text-default-600 mt-2 max-w-2xl">{description}</p>
            </div>

            <CardBody className="gap-6 p-6">
                {isLoading ? (
                    <div className="h-48 rounded-2xl bg-default-100 animate-pulse" />
                ) : (
                    <>
                        <ContractDocumentView
                            contract={contract}
                            bookingId={booking.id}
                            title={
                                contract?.contractor_signed
                                    ? "Contrato firmado"
                                    : "Contrato de la solicitud"
                            }
                            description={
                                contract?.contractor_signed
                                    ? "Acuerdo firmado digitalmente. El PDF se genera desde los datos guardados en la solicitud."
                                    : "Contenido del acuerdo asociado a esta reserva. El PDF se genera bajo demanda."
                            }
                        />

                        <Divider />

                        <div className="flex flex-col gap-4">
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    Registro de pagos
                                </h3>
                                <p className="text-sm text-default-500 mt-1">
                                    Pagos procesados y registrados para esta reserva.
                                </p>
                            </div>

                            {!showPaymentDetails || payments.length === 0 ? (
                                <p className="text-sm text-default-500">
                                    Aún no hay pagos registrados para esta reserva.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-5">
                                    {payments.map((payment, index) => (
                                        <div
                                            key={payment.id}
                                            className="rounded-2xl border border-default-200 bg-default-50/60 p-4 flex flex-col gap-4"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-foreground">
                                                        {index + 1}.{" "}
                                                        {paymentTypeLabel(payment.payment_type)}
                                                    </p>
                                                    <p className="text-sm text-default-500 mt-1">
                                                        {formatCurrency(Number(payment.amount))} ·{" "}
                                                        {formatDateTime(payment.created_at)}
                                                    </p>
                                                </div>
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    color={paymentStatusColor(payment.status)}
                                                >
                                                    {paymentStatusLabel(payment.status)}
                                                </Chip>
                                            </div>
                                            {payment.evidence_url || (payment.evidence_urls && payment.evidence_urls.length > 0) ? (
                                                <PaymentEvidenceViewer
                                                    evidenceUrl={payment.evidence_url}
                                                    evidenceUrls={payment.evidence_urls}
                                                    label={`Detalle · ${paymentTypeLabel(payment.payment_type)}`}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs text-default-500">
                                                    <Chip size="sm" variant="dot" color="primary">
                                                        Mercado Pago
                                                    </Chip>
                                                    <span>Transacción procesada digitalmente</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </CardBody>
        </Card>
    );
}

