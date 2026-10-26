"use client";

import { FormEvent, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Checkbox,
    Chip,
    Divider,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import BookingReopenQuoteModal from "@/components/booking/booking-reopen-quote-modal";
import BookingRepertoirePicker from "@/components/booking/booking-repertoire-picker";
import BookingMercadoPagoModal from "@/components/booking/booking-mercadopago-modal";
import BookingGuestUpsellModal from "@/components/booking/booking-guest-upsell-modal";
import ContractDocumentView from "@/components/booking/contract-document-view";
import SignaturePad from "@/components/ui/signature-pad";
import { formatCurrency } from "@/lib/booking-labels";
import { formatClientCancellationRules } from "@/lib/cancellation-policy";
import { useCancellationPolicy } from "@/hooks/use-cancellation-policy";
import { getBooking } from "@/lib/bookings";
import { useAuth } from "@/contexts/auth-context";
import {
    contractorPayableTotal,
    platformFeeAmount,
} from "@/lib/platform-fee";
import { uploadSignatureDataUrl } from "@/lib/uploads";
import type { BookingOut, ContractOut } from "@/types/api";

type Props = {
    booking: BookingOut;
    contract: ContractOut | null;
    isLoadingContract: boolean;
    onUpdated: (booking: BookingOut) => void;
    bypassVerificationCheck?: boolean;
};

const STEPS = [
    "Revisar contrato",
    "Elegir repertorio",
    "Firmar y pagar",
];

export default function BookingContractConfirmCard({
    booking,
    contract,
    isLoadingContract,
    onUpdated,
}: Props) {
    const { user } = useAuth();
    const cancellationPolicy = useCancellationPolicy();
    const [isConfirming, setIsConfirming] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<{
        paymentId: string | null;
        message: string;
    } | null>(null);
    const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const fee = platformFeeAmount(booking);
    const contractorTotal = contractorPayableTotal(booking);
    const payLabel = contractorTotal != null ? formatCurrency(contractorTotal) : "";
    const isAlreadySigned =
        booking.status === "contract_signed" || Boolean(contract?.contractor_signed);

    async function handleConfirm(event: FormEvent) {
        event.preventDefault();
        setValidationError(null);

        if (pendingPayment) {
            setIsPaymentModalOpen(true);
            return;
        }

        if (isAlreadySigned) {
            if (contract?.contractor_signature_url && !uploadedSignatureUrl) {
                setUploadedSignatureUrl(contract.contractor_signature_url);
            }
            if (user && user.has_password === false) {
                setIsUpsellModalOpen(true);
            } else {
                setIsPaymentModalOpen(true);
            }
            return;
        }

        if (!signatureDataUrl) {
            const msg = "Registra tu firma (dibujándola o escribiéndola con teclado) antes de continuar.";
            setValidationError(msg);
            addToast({
                title: "Firma requerida",
                description: msg,
                color: "warning",
            });
            return;
        }

        if (!termsAccepted) {
            const msg = "Marca la casilla para confirmar que leíste y aceptas los términos del contrato.";
            setValidationError(msg);
            addToast({
                title: "Aceptación requerida",
                description: msg,
                color: "warning",
            });
            return;
        }

        setIsConfirming(true);
        try {
            const signatureImageUrl = await uploadSignatureDataUrl(
                signatureDataUrl,
                "firma-contrato",
            );
            setUploadedSignatureUrl(signatureImageUrl);
            if (user && user.has_password === false) {
                setIsUpsellModalOpen(true);
            } else {
                setIsPaymentModalOpen(true);
            }
        } catch (error) {
            addToast({
                title: "Error al registrar firma",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsConfirming(false);
        }
    }

    return (
        <Card className="border border-secondary/30 shadow-soft overflow-hidden">
            <div className="bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <Chip color="secondary" variant="flat" size="sm">
                        Paso 3 · Contrato
                    </Chip>
                    <Button
                        size="sm"
                        variant="bordered"
                        radius="lg"
                        className="min-h-11"
                        startContent={
                            <Icon icon="material-symbols:edit" width={16} />
                        }
                        onPress={() => setIsEditOpen(true)}
                    >
                        Editar solicitud
                    </Button>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                    Contrato, repertorio y pago seguro
                </h2>
                <p className="text-sm text-default-600 mt-2 max-w-2xl">
                    Revisa el contrato, elige los temas que quieres del repertorio del
                    músico y confirma tu reserva con Mercado Pago. Si cambias datos del evento,
                    la reserva vuelve a cotización.
                </p>
            </div>

            <CardBody className="gap-6 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {STEPS.map((step, index) => (
                        <div
                            key={step}
                            className="rounded-2xl border border-default-200 bg-content1 px-4 py-3"
                        >
                            <p className="text-xs font-semibold text-primary-text">
                                Paso {index + 1}
                            </p>
                            <p className="text-sm text-foreground mt-1">{step}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-default-200 p-4">
                        <p className="text-xs text-default-500">Precio del servicio</p>
                        <p className="text-xl font-bold text-foreground mt-1">
                            {booking.price_agreed != null
                                ? formatCurrency(Number(booking.price_agreed))
                                : "—"}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-default-200 p-4">
                        <p className="text-xs text-default-500">
                            Comisión plataforma
                            {booking.platform_fee_percent != null &&
                            Number(booking.platform_fee_percent) > 0
                                ? ` (${Number(booking.platform_fee_percent)}%)`
                                : ""}
                        </p>
                        <p className="text-xl font-bold text-foreground mt-1">
                            {fee > 0 ? formatCurrency(fee) : "S/ 0.00"}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                        <p className="text-xs text-default-500">Total a pagar (pago único 100%)</p>
                        <p className="text-xl font-bold text-primary mt-1">
                            {contractorTotal != null
                                ? formatCurrency(contractorTotal)
                                : "—"}
                        </p>
                        <p className="text-xs text-default-500 mt-1">
                            Custodiado por Chivapp hasta finalizar tu evento
                        </p>
                    </div>
                </div>

                <ContractDocumentView
                    contract={contract}
                    bookingId={booking.id}
                    isLoading={isLoadingContract}
                    title="Contrato de la solicitud"
                    description="Condiciones del servicio acordadas en la cotización. Léelas completas antes de firmar. Puedes descargar el PDF cuando lo necesites."
                />

                <BookingRepertoirePicker
                    booking={booking}
                    canEdit
                    onUpdated={onUpdated}
                />

                {/* Resumen de política de cancelación y protección antes de firmar */}
                <div className="rounded-2xl border border-default-200 bg-default-50/70 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Icon icon="material-symbols:verified-user-outline" width={18} className="text-primary-text shrink-0" />
                        <span>Política de cancelación y garantía Chivapp</span>
                    </div>
                    <ul className="text-xs text-default-600 space-y-1 list-disc list-inside leading-relaxed">
                        <li>
                            <strong>Cancelación del músico:</strong> recibes el {cancellationPolicy.musician_fault_refund_percent} % del importe abonado.
                        </li>
                        <li>
                            <strong>Cancelación del cliente:</strong> {formatClientCancellationRules(cancellationPolicy)}{" "}
                            <a
                                href="/legal/reembolsos"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-primary-text underline underline-offset-2"
                            >
                                Ver política completa
                            </a>
                        </li>
                        <li>
                            <strong>Pago protegido:</strong> el monto se libera al músico únicamente después de realizado el evento.
                        </li>
                    </ul>
                </div>

                <Divider />

                <form onSubmit={handleConfirm} className="flex flex-col gap-5">
                    {isAlreadySigned ? (
                        <div className="rounded-2xl border border-success/30 bg-success/5 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-success font-medium">
                                <Icon icon="material-symbols:check-circle" width={22} className="shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Contrato firmado electrónicamente</p>
                                    <p className="text-xs text-default-500">Tu firma ya fue registrada. Continúa con el pago en Mercado Pago.</p>
                                </div>
                            </div>
                            <Chip size="sm" color="success" variant="flat">Firmado</Chip>
                        </div>
                    ) : (
                        <>
                            <SignaturePad
                                value={signatureDataUrl}
                                onChange={(val) => {
                                    setSignatureDataUrl(val);
                                    if (val) setValidationError(null);
                                }}
                                label="Firma para aceptar términos y condiciones"
                                helperText="Tu firma se guarda como adjunto y se inserta en el PDF del contrato."
                            />

                            <div className="rounded-2xl border border-default-200 bg-default-50/60 p-4">
                                <Checkbox
                                    isSelected={termsAccepted}
                                    onValueChange={(checked) => {
                                        setTermsAccepted(checked);
                                        if (checked) setValidationError(null);
                                    }}
                                    classNames={{ label: "text-sm leading-relaxed" }}
                                >
                                    He leído el contrato de la solicitud y la política de cancelación, firmo y acepto sus términos
                                    y condiciones para continuar con la reserva.
                                </Checkbox>
                            </div>

                            {validationError && (
                                <p role="alert" className="text-xs font-medium text-danger flex items-center gap-1.5">
                                    <Icon icon="material-symbols:error-outline" width={16} className="shrink-0" />
                                    <span>{validationError}</span>
                                </p>
                            )}
                        </>
                    )}

                    {/* Mercado Pago Security Banner */}
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-text shrink-0">
                                <Icon icon="material-symbols:shield-lock" width={24} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground flex flex-wrap items-center gap-1.5">
                                    <span>Pago único 100% protegido con Mercado Pago</span>
                                    <Chip size="sm" variant="flat" color="primary" className="text-xs h-5">
                                        Oficial
                                    </Chip>
                                </div>
                                <p className="text-xs text-default-500 mt-0.5">
                                    Acepta tarjetas de crédito o débito y Yape sin cargos posteriores.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-default-500 text-xs self-end sm:self-auto shrink-0">
                            <Icon icon="logos:visa" width={28} />
                            <Icon icon="logos:mastercard" width={24} />
                            <span className="font-bold text-primary px-1">yape</span>
                        </div>
                    </div>

                    {pendingPayment ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-foreground">
                                    Tienes un pago en proceso de verificación
                                </p>
                                <p className="text-xs text-default-600">
                                    {pendingPayment.message}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    <Button
                        type="submit"
                        color={pendingPayment ? "warning" : "primary"}
                        radius="lg"
                        size="lg"
                        isLoading={isConfirming}
                        className="font-bold text-sm sm:text-base shadow-lg shadow-primary/20 py-5 sm:py-6 h-auto whitespace-normal leading-snug text-center px-4"
                        startContent={
                            !isConfirming && <Icon icon="material-symbols:lock" width={22} className="shrink-0" />
                        }
                    >
                        {isConfirming
                            ? "Conectando con Mercado Pago..."
                            : pendingPayment
                              ? "Ver estado del pago en proceso"
                              : isAlreadySigned
                                ? `Pagar ${payLabel} con Mercado Pago`
                                : `Firmar contrato y pagar ${payLabel} con Mercado Pago`}
                    </Button>
                </form>
            </CardBody>

            <BookingGuestUpsellModal
                isOpen={isUpsellModalOpen}
                onClose={() => setIsUpsellModalOpen(false)}
                onSkip={() => {
                    setIsUpsellModalOpen(false);
                    setIsPaymentModalOpen(true);
                }}
                onSuccess={() => {
                    setIsUpsellModalOpen(false);
                    setIsPaymentModalOpen(true);
                }}
            />

            <BookingMercadoPagoModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                booking={booking}
                amount={contractorTotal ?? 0}
                signatureImageUrl={uploadedSignatureUrl || contract?.contractor_signature_url || null}
                contractBodySha256={contract?.body_sha256}
                onPendingChange={setPendingPayment}
                onSuccess={() => {
                    setPendingPayment(null);
                    void getBooking(booking.id)
                        .then((fresh) => onUpdated(fresh))
                        .catch(() => {
                            // Keep current booking state if fetch fails; parent will poll/refresh.
                        });
                }}
            />

            <BookingReopenQuoteModal
                booking={booking}
                isOpen={isEditOpen}
                onOpenChange={setIsEditOpen}
                onUpdated={onUpdated}
            />
        </Card>
    );
}
