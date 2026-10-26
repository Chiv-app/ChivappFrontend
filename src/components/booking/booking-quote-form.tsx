import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useState, useTransition, useEffect } from "react";
import type { BookingOut } from "@/types/api";
import { Icon } from "@iconify/react";
import {
    Button,
    Textarea,
    Input,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    addToast,
} from "@heroui/react";
import { quoteBooking, rejectBooking, updateBooking } from "@/lib/bookings";
import CancelBookingModal from "@/components/booking/cancel-booking-modal";
import { contractorPayableTotal, platformFeeAmount } from "@/lib/platform-fee";
import { getPlatformPaymentInstructions } from "@/lib/payments";

const DRAFT_STORAGE_PREFIX = "chivapp_quote_draft_";

type LocalQuoteDraft = {
    priceAgreed?: string;
    quoteNotes?: string;
    locationAddress?: string;
    locationCity?: string;
};

export default function BookingQuoteForm({
    booking,
    onUpdated,
}: {
    booking: BookingOut;
    onUpdated?: (updated: BookingOut) => void;
}) {
    const isEditMode =
        booking.status === "accepted" ||
        (booking.status === "requested" && booking.price_agreed != null);

    const [priceAgreed, setPriceAgreed] = useState<string>(() => {
        if (booking.price_agreed != null) return booking.price_agreed.toString();
        if (typeof window !== "undefined") {
            try {
                const raw = window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${booking.id}`);
                if (raw) {
                    const parsed = JSON.parse(raw) as LocalQuoteDraft;
                    if (parsed.priceAgreed) return parsed.priceAgreed;
                }
            } catch {
                // Ignore storage errors
            }
        }
        return "";
    });
    const [quoteNotes, setQuoteNotes] = useState<string>(() => {
        if (booking.musician_quote_notes) return booking.musician_quote_notes;
        if (typeof window !== "undefined") {
            try {
                const raw = window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${booking.id}`);
                if (raw) {
                    const parsed = JSON.parse(raw) as LocalQuoteDraft;
                    if (parsed.quoteNotes) return parsed.quoteNotes;
                }
            } catch {
                // Ignore storage errors
            }
        }
        return "";
    });
    const [locationAddress, setLocationAddress] = useState(booking.location_address || "");
    const [locationCity, setLocationCity] = useState(booking.location_city || "");
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    // Default to the booking's fee, but fetch the live one to show accurate preview
    const [livePlatformFeePercent, setLivePlatformFeePercent] = useState<number>(
        booking.platform_fee_percent != null ? Number(booking.platform_fee_percent) || 0 : 0
    );

    useEffect(() => {
        getPlatformPaymentInstructions()
            .then(res => {
                if (res.platform_fee_percent != null) {
                    setLivePlatformFeePercent(res.platform_fee_percent);
                }
            })
            .catch(() => {});
    }, []);

    const [isPendingSubmit, startSubmit] = useTransition();
    const [isPendingReject, startReject] = useTransition();
    const isSubmitting = isPendingSubmit;
    const isRejecting = isPendingReject;

    const priceNum = Number(priceAgreed) || 0;

    const contractorTotalPreview = contractorPayableTotal({
        price_agreed: priceNum,
        platform_fee_percent: livePlatformFeePercent
    });

    const feePreview = platformFeeAmount({
        price_agreed: priceNum,
        platform_fee_percent: livePlatformFeePercent
    });

    const handleDraft = () => {
        startSubmit(async () => {
            try {
                if (typeof window !== "undefined") {
                    const draftPayload: LocalQuoteDraft = {
                        priceAgreed,
                        quoteNotes,
                        locationAddress,
                        locationCity,
                    };
                    window.localStorage.setItem(
                        `${DRAFT_STORAGE_PREFIX}${booking.id}`,
                        JSON.stringify(draftPayload),
                    );
                }
                const res = await updateBooking(booking.id, {
                    location_address: locationAddress,
                    location_city: locationCity,
                });
                onUpdated?.(res);
                addToast({
                    title: "Borrador guardado en este dispositivo",
                    description:
                        "El monto y las notas quedaron guardados localmente en tu navegador (aún no se envían al cliente).",
                    color: "success",
                });
            } catch (err) {
                addToast({
                    title: "Error al guardar",
                    description: err instanceof Error ? err.message : "Error desconocido",
                    color: "danger",
                });
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericPrice = Number(priceAgreed);
        if (!priceAgreed || !Number.isFinite(numericPrice)) return;
        if (numericPrice < 10 || numericPrice > 50000) {
            addToast({
                title: "Precio fuera de rango",
                description: "El precio acordado debe estar entre S/ 10.00 y S/ 50,000.00.",
                color: "danger",
            });
            return;
        }
        if (Math.round(numericPrice * 100) !== numericPrice * 100) {
            addToast({
                title: "Precio inválido",
                description: "El precio puede tener como máximo 2 decimales.",
                color: "danger",
            });
            return;
        }

        startSubmit(async () => {
            try {
                const res = await quoteBooking(booking.id, {
                    price_agreed: numericPrice,
                    musician_quote_notes: quoteNotes,
                    location_address: locationAddress || booking.location_address,
                    location_city: locationCity || booking.location_city || undefined,
                    location_reference: booking.location_reference ?? undefined,
                });
                if (typeof window !== "undefined") {
                    window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${booking.id}`);
                }
                onUpdated?.(res);
                addToast({ title: "Propuesta enviada", color: "success" });
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Error al enviar";
                addToast({ title: msg || "Error al enviar", color: "danger" });
            }
        });
    };

    const handleReject = () => {
        // Tras enviar la cotización ya no se puede "rechazar": se cancela con la política vigente.
        if (booking.status !== "requested") {
            setIsCancelOpen(true);
            return;
        }
        setIsRejectOpen(true);
    };

    const confirmReject = () => {
        const trimmedReason = rejectionReason.trim() || "No puedo atender la solicitud.";
        startReject(async () => {
            try {
                const res = await rejectBooking(booking.id, {
                    rejection_reason: trimmedReason,
                });
                setIsRejectOpen(false);
                onUpdated?.(res);
                addToast({ title: "Reserva rechazada", color: "success" });
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Error al rechazar";
                addToast({ title: msg || "Error al rechazar", color: "danger" });
            }
        });
    };

    return (
        <div className="w-full h-full flex flex-col rounded-2xl border border-default-200/60 bg-content1 p-6 sm:p-8">
            <CancelBookingModal
                bookingId={booking.id}
                isOpen={isCancelOpen}
                onOpenChange={setIsCancelOpen}
                onCancelled={(updated) => onUpdated?.(updated)}
            />
            <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
                isOpen={isRejectOpen}
                onOpenChange={setIsRejectOpen}
                placement="center"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Rechazar solicitud de reserva
                            </ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-default-600">
                                    Indica opcionalmente el motivo del rechazo para que el cliente sepa por qué no puedes atender el evento.
                                </p>
                                <Textarea
                                    label="Motivo del rechazo"
                                    placeholder="Ej. Ya tengo otro compromiso agendado en ese horario."
                                    value={rejectionReason}
                                    onValueChange={setRejectionReason}
                                    minRows={3}
                                    variant="bordered"
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    variant="flat"
                                    onPress={onClose}
                                    isDisabled={isRejecting}
                                >
                                    Volver
                                </Button>
                                <Button
                                    color="danger"
                                    onPress={confirmReject}
                                    isLoading={isRejecting}
                                >
                                    Confirmar rechazo
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
            <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {isEditMode ? "Editar propuesta" : "Enviar propuesta"}
                    </h2>
                    <p className="text-sm text-default-500 mt-1">
                        Ingresa el monto neto que deseas recibir por el evento.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8 mt-6">
                {/* DETALLES SECTION */}
                <div className="flex flex-col gap-4">
                    <p className="text-xs text-default-500 font-semibold uppercase tracking-wider">Detalles del evento</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Dirección"
                            value={locationAddress}
                            onValueChange={setLocationAddress}
                            variant="faded"
                            classNames={{
                                inputWrapper: "bg-default-100/50 border-default-200/50",
                            }}
                        />
                        <Input
                            label="Ciudad"
                            value={locationCity}
                            onValueChange={setLocationCity}
                            variant="faded"
                            classNames={{
                                inputWrapper: "bg-default-100/50 border-default-200/50",
                            }}
                        />
                    </div>
                </div>

                {/* PRECIO SECTION */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <label
                            htmlFor="quote-price-input"
                            className="text-xs font-bold text-default-600 uppercase tracking-wider"
                        >
                            Lo que tú recibes (PEN)
                        </label>
                        <span className="text-xs text-default-500">Moneda: Soles (S/)</span>
                    </div>

                    <div className="flex items-center rounded-xl border border-default-200 bg-default-100 px-5 py-2 h-[72px] focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus transition-colors">
                        <span className="text-default-500 text-2xl font-medium mr-3" aria-hidden="true">S/</span>
                        <input
                            id="quote-price-input"
                            type="number"
                            inputMode="decimal"
                            min="10"
                            max="50000"
                            step="0.01"
                            required
                            value={priceAgreed}
                            onChange={(e) => setPriceAgreed(e.target.value)}
                            className="bg-transparent text-foreground text-3xl font-bold flex-1 outline-none w-full"
                            placeholder="0.00"
                        />
                    </div>

                    <div className="rounded-xl border border-default-200 bg-default-50/50 px-5 py-4 flex flex-col gap-1 mt-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <p className="text-sm font-medium text-default-600">
                                El contratista pagará:{" "}
                                <span className="text-foreground font-bold text-base tracking-wide">
                                    S/ {contractorTotalPreview?.toFixed(2) || "0.00"}
                                </span>
                            </p>
                        </div>
                        <p className="text-xs text-default-500">
                            Servicio (S/ {priceNum.toFixed(2)})
                            {feePreview > 0 ? ` + comisión plataforma y pasarela (S/ ${feePreview.toFixed(2)})` : " — sin comisiones adicionales"}
                        </p>
                    </div>
                </div>

                {/* MENSAJE SECTION */}
                <div className="flex flex-col gap-3">
                    <label
                        htmlFor="quote-notes-textarea"
                        className="text-xs font-bold text-default-600 uppercase tracking-wider"
                    >
                        Mensaje o condiciones para el cliente <span className="font-normal text-default-500 lowercase">(opcional)</span>
                    </label>

                    <Textarea
                        id="quote-notes-textarea"
                        aria-label="Mensaje o condiciones para el cliente"
                        placeholder="Escribe un mensaje o indicaciones para el cliente (opcional)..."
                        value={quoteNotes}
                        onValueChange={setQuoteNotes}
                        minRows={4}
                        classNames={{
                            inputWrapper: "border border-default-200 bg-default-100 hover:bg-default-200/70 focus-within:!bg-default-100 focus-within:!border-primary",
                            input: "text-foreground text-[15px]",
                        }}
                    />
                </div>

                {/* BOTONES ACTION */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-6 border-t border-default-200">
                    <button
                        type="button"
                        onClick={handleReject}
                        disabled={isRejecting || isSubmitting}
                        className="min-h-11 inline-flex items-center text-sm font-medium text-danger hover:text-danger-text transition-colors self-start sm:self-auto px-2"
                    >
                        {isEditMode ? "Cancelar reserva" : "Rechazar solicitud"}
                    </button>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="bordered"
                            radius="full"
                            onPress={handleDraft}
                            isDisabled={isSubmitting}
                            className="min-h-11 border-default-300 text-foreground font-medium flex-1 sm:flex-none hover:bg-default-100"
                        >
                            Guardar borrador local
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            radius="full"
                            isLoading={isSubmitting}
                            className="min-h-11 font-bold px-6 shadow-md flex-1 sm:flex-none"
                            startContent={
                                !isSubmitting && <Icon icon="lucide:send" width={16} />
                            }
                        >
                            {isEditMode ? "Actualizar cotización" : "Enviar cotización"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
