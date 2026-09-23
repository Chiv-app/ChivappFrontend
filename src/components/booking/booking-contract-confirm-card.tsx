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
import ContractDocumentView from "@/components/booking/contract-document-view";
import SignaturePad from "@/components/ui/signature-pad";
import { formatCurrency } from "@/lib/booking-labels";
import { useAuth } from "@/contexts/auth-context";
import { useContractorVerification } from "@/hooks/use-contractor-verification";
import { createMercadoPagoPreference } from "@/lib/payments";
import {
    contractorAdvanceDue,
    contractorPayableTotal,
    contractorRemainingAfterAdvance,
    platformFeeAmount,
} from "@/lib/platform-fee";
import { uploadSignatureDataUrl } from "@/lib/uploads";
import type { BookingOut, ContractOut } from "@/types/api";

type Props = {
    booking: BookingOut;
    contract: ContractOut | null;
    isLoadingContract: boolean;
    onUpdated: (booking: BookingOut) => void;
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
    const { isVerified, isLoading: isLoadingVerification } = useContractorVerification(true, user?.is_verified ?? false);
    const { addToast } = useToast();
    const [isConfirming, setIsConfirming] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentType, setPaymentType] = useState<"advance" | "full">(
        booking.advance_amount != null ? "advance" : "full",
    );
    const [isEditOpen, setIsEditOpen] = useState(false);
    const fee = platformFeeAmount(booking);
    const contractorTotal = contractorPayableTotal(booking);
    const advanceDue = contractorAdvanceDue(booking);
    const remainingAfterAdvance = contractorRemainingAfterAdvance(booking);
    const isAlreadySigned =
        booking.status === "contract_signed" || Boolean(contract?.contractor_signed);

    async function handleConfirm(event: FormEvent) {
        event.preventDefault();

        if (isLoadingVerification) {
            return;
        }

        if (!isVerified) {
            addToast({
                title: "Perfil incompleto",
                description: "Debes completar y verificar tu perfil antes de poder realizar pagos.",
                color: "danger",
            });
            return;
        }

        if (isAlreadySigned) {
            if (contract?.contractor_signature_url && !uploadedSignatureUrl) {
                setUploadedSignatureUrl(contract.contractor_signature_url);
            }
            setIsPaymentModalOpen(true);
            return;
        }

        if (!termsAccepted) {
            addToast({
                title: "Aceptación requerida",
                description: "Debes leer y aceptar los términos del contrato.",
                color: "warning",
            });
            return;
        }
        if (!signatureDataUrl) {
            addToast({
                title: "Firma requerida",
                description: "Debes firmar para aceptar los términos y alimentar el contrato.",
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
            setIsPaymentModalOpen(true);
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
                            <p className="text-xs font-semibold text-secondary">
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
                        <p className="text-xs text-default-500">Total a pagar</p>
                        <p className="text-xl font-bold text-primary mt-1">
                            {contractorTotal != null
                                ? formatCurrency(contractorTotal)
                                : "—"}
                        </p>
                        <p className="text-xs text-default-500 mt-1">
                            Anticipo sugerido:{" "}
                            {advanceDue != null
                                ? formatCurrency(advanceDue)
                                : "Pago total"}
                            {remainingAfterAdvance != null &&
                            booking.advance_amount != null
                                ? ` · Saldo restante: ${formatCurrency(remainingAfterAdvance)}`
                                : ""}
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

                <Divider />

                <form onSubmit={handleConfirm} className="flex flex-col gap-5">
                    {isAlreadySigned ? (
                        <div className="rounded-2xl border border-success/30 bg-success/5 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-success font-medium">
                                <Icon icon="material-symbols:check-circle" width={22} className="shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Contrato firmado electrónicamente</p>
                                    <p className="text-xs text-default-500">Tu firma ya fue registrada. Continúa seleccionando tu forma de pago.</p>
                                </div>
                            </div>
                            <Chip size="sm" color="success" variant="flat">Firmado</Chip>
                        </div>
                    ) : (
                        <>
                            <SignaturePad
                                value={signatureDataUrl}
                                onChange={setSignatureDataUrl}
                                label="Firma para aceptar términos y condiciones"
                                helperText="Tu firma se guarda como adjunto y alimenta el PDF al generarlo."
                            />

                            <div className="rounded-2xl border border-default-200 bg-default-50/60 p-4">
                                <Checkbox
                                    isSelected={termsAccepted}
                                    onValueChange={setTermsAccepted}
                                    classNames={{ label: "text-sm leading-relaxed" }}
                                >
                                    He leído el contrato de la solicitud, firmo y acepto sus términos
                                    y condiciones para continuar con la reserva.
                                </Checkbox>
                            </div>
                        </>
                    )}

                    {/* Selector de Modalidad de Pago - ÚNICA OPCIÓN */}
                    <div className="flex flex-col gap-3">
                        <p className="text-sm font-semibold text-foreground">
                            Modalidad de pago
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            <div
                                className="cursor-default rounded-2xl border p-4 transition-all border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                                        Pago completo del show
                                    </span>
                                    <div
                                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center border-primary bg-primary"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </div>
                                </div>
                                <p className="font-bold text-foreground text-lg">
                                    {contractorTotal != null ? formatCurrency(contractorTotal) : "Total"}
                                </p>
                                <div className="text-xs text-default-500 mt-1">
                                    Cancela el 100% del servicio hoy. Despreocúpate de realizar abonos posteriores.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mercado Pago Security Banner */}
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                <Icon icon="material-symbols:shield-lock" width={24} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground flex flex-wrap items-center gap-1.5">
                                    <span>Pago 100% protegido con Mercado Pago</span>
                                    <Chip size="sm" variant="flat" color="primary" className="text-[11px] h-5">
                                        Oficial
                                    </Chip>
                                </div>
                                <p className="text-xs text-default-500 mt-0.5">
                                    Acepta Tarjetas (Crédito / Débito), Yape y Transferencia bancaria.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-default-400 text-xs self-end sm:self-auto shrink-0">
                            <Icon icon="logos:visa" width={28} />
                            <Icon icon="logos:mastercard" width={24} />
                            <span className="font-bold text-primary px-1">yape</span>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        color="primary"
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
                            : isAlreadySigned
                              ? `Pagar ${
                                    paymentType === "advance" && advanceDue != null
                                        ? formatCurrency(advanceDue)
                                        : contractorTotal != null
                                          ? formatCurrency(contractorTotal)
                                          : ""
                                } con Mercado Pago`
                              : `Firmar contrato y pagar ${
                                    paymentType === "advance" && advanceDue != null
                                        ? formatCurrency(advanceDue)
                                        : contractorTotal != null
                                          ? formatCurrency(contractorTotal)
                                          : ""
                                } con Mercado Pago`}
                    </Button>
                </form>
            </CardBody>

            <BookingMercadoPagoModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                booking={booking}
                paymentType={paymentType}
                amount={paymentType === "advance" ? (advanceDue ?? 0) : (contractorTotal ?? 0)}
                signatureImageUrl={uploadedSignatureUrl}
                onSuccess={() => {
                    onUpdated({
                        ...booking,
                        status: "payment_retained" as BookingOut["status"],
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
