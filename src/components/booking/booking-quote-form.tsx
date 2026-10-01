import { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/booking-labels";
import type { BookingOut } from "@/types/api";
import { Icon } from "@iconify/react";
import { Button, Checkbox, Textarea, Input } from "@heroui/react";
import { quoteBooking, rejectBooking, updateBooking } from "@/lib/bookings";
import { addToast } from "@heroui/react";
import CancelBookingModal from "@/components/booking/cancel-booking-modal";
import { contractorPayableTotal, platformFeeAmount } from "@/lib/platform-fee";

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
        
    const [priceAgreed, setPriceAgreed] = useState<string>(
        booking.price_agreed?.toString() ?? "",
    );
    const [quoteNotes, setQuoteNotes] = useState(booking.musician_quote_notes ?? "");
    const [includesTravel, setIncludesTravel] = useState(true);
    const [locationAddress, setLocationAddress] = useState(booking.location_address || "");
    const [locationCity, setLocationCity] = useState(booking.location_city || "");
    const [isCancelOpen, setIsCancelOpen] = useState(false);

    const [isPendingSubmit, startSubmit] = useTransition();
    const [isPendingReject, startReject] = useTransition();
    const isSubmitting = isPendingSubmit;
    const isRejecting = isPendingReject;

    const priceNum = Number(priceAgreed) || 0;
    
    // Restauramos la lógica original de cobro usando platform-fee.ts
    const contractorTotalPreview = contractorPayableTotal({
        price_agreed: priceNum,
        platform_fee_percent: booking.platform_fee_percent
    });
    
    const feePreview = platformFeeAmount({
        price_agreed: priceNum,
        platform_fee_percent: booking.platform_fee_percent
    });

    const handleDraft = () => {
        startSubmit(async () => {
            try {
                const res = await updateBooking(booking.id, {
                    location_address: locationAddress,
                    location_city: locationCity,
                });
                onUpdated?.(res);
                addToast({ title: "Borrador guardado", color: "success" });
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
        if (!priceAgreed || isNaN(Number(priceAgreed))) return;

        let finalNotes = quoteNotes;
        if (includesTravel) {
            const travelText = `Incluye traslado y viáticos a ${booking.location_city || "la ciudad"}.`;
            if (!finalNotes.includes(travelText)) {
                finalNotes = finalNotes ? `${finalNotes}\n${travelText}` : travelText;
            }
        }

        startSubmit(async () => {
            try {
                const res = await quoteBooking(booking.id, {
                    price_agreed: Number(priceAgreed),
                    musician_quote_notes: finalNotes,
                    location_address: locationAddress || booking.location_address,
                    location_city: locationCity || booking.location_city || undefined,
                    location_reference: booking.location_reference ?? undefined,
                });
                onUpdated?.(res);
                addToast({ title: "Propuesta enviada", color: "success" });
            } catch (err: any) {
                addToast({ title: err.message || "Error al enviar", color: "danger" });
            }
        });
    };

    const handleReject = () => {
        // Tras enviar la cotización ya no se puede "rechazar": se cancela con la política vigente.
        if (booking.status !== "requested") {
            setIsCancelOpen(true);
            return;
        }
        if (!window.confirm("¿Seguro que deseas rechazar esta solicitud?")) return;
        startReject(async () => {
            try {
                const res = await rejectBooking(booking.id, { rejection_reason: "No puedo atender la solicitud." });
                onUpdated?.(res);
                addToast({ title: "Reserva rechazada", color: "success" });
            } catch (err: any) {
                addToast({ title: err.message || "Error al rechazar", color: "danger" });
            }
        });
    };

    return (
        <div className="w-full h-full flex flex-col rounded-2xl border border-default-200/50 bg-content1 dark:bg-[#0C121A] p-6 sm:p-8">
            <CancelBookingModal
                bookingId={booking.id}
                isOpen={isCancelOpen}
                onOpenChange={setIsCancelOpen}
                onCancelled={(updated) => onUpdated?.(updated)}
            />
            <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-foreground dark:text-white">
                        {isEditMode ? "Editar propuesta" : "Enviar propuesta"}
                    </h2>
                    <p className="text-sm text-default-400 mt-1">
                        Ingresa lo que tú deseas recibir por el evento.
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
                    <Icon icon="lucide:shield-check" width={16} />
                    Pago protegido
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8 mt-6">
                {/* DETALLES SECTION */}
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-default-400 font-semibold uppercase tracking-wider">Detalles del Evento</p>
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
                        <label className="text-xs font-bold text-default-500 tracking-wider">
                            LO QUE TÚ RECIBES (PEN)
                        </label>
                        <span className="text-xs text-default-500">Moneda: Soles (S/)</span>
                    </div>
                    
                    <div className="flex items-center rounded-xl border border-default-200/40 bg-default-100 dark:bg-[#151D28] px-5 py-2 h-[72px] focus-within:border-primary transition-colors">
                        <span className="text-default-400 text-2xl font-medium mr-3">S/</span>
                        <input 
                            type="number"
                            min="1"
                            required
                            value={priceAgreed}
                            onChange={(e) => setPriceAgreed(e.target.value)}
                            className="bg-transparent text-foreground dark:text-white text-3xl font-bold flex-1 outline-none w-full"
                            placeholder="0.00"
                        />
                    </div>

                    <div className="rounded-xl border border-default-200/20 bg-transparent px-5 py-4 flex flex-col gap-1 mt-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <p className="text-sm font-medium text-default-400">
                                El contratista pagará: <span className="text-foreground dark:text-white font-bold text-base tracking-wide">S/ {contractorTotalPreview?.toFixed(2) || "0.00"}</span>
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
                    <label className="text-xs font-bold text-default-500 tracking-wider">
                        MENSAJE O CONDICIONES PARA EL CLIENTE <span className="font-normal opacity-70">(opcional)</span>
                    </label>
                    
                    <Textarea
                        placeholder="Escribe un mensaje o indicaciones para el cliente (opcional)..."
                        value={quoteNotes}
                        onValueChange={setQuoteNotes}
                        minRows={4}
                        classNames={{
                            inputWrapper: "border border-default-200/40 bg-default-100 dark:bg-[#151D28] hover:bg-default-200 dark:hover:bg-[#151D28] hover:border-default-200/60 focus-within:!bg-default-100 dark:focus-within:!bg-[#151D28] focus-within:!border-primary",
                            input: "text-foreground dark:text-white text-[15px]"
                        }}
                    />
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <button 
                            type="button"
                            className="text-xs font-medium text-default-400 bg-content2/40 hover:bg-content2/80 hover:text-foreground dark:hover:text-white px-3 py-1.5 rounded-full border border-default-200/30 transition-colors"
                            onClick={() => setQuoteNotes(prev => (prev ? prev + "\n" : "") + "¿Hay estacionamiento disponible?")}
                        >
                            + ¿Hay estacionamiento disponible?
                        </button>
                        <button 
                            type="button"
                            className="text-xs font-medium text-default-400 bg-content2/40 hover:bg-content2/80 hover:text-foreground dark:hover:text-white px-3 py-1.5 rounded-full border border-default-200/30 transition-colors"
                            onClick={() => setQuoteNotes(prev => (prev ? prev + "\n" : "") + "Incluye amplificación.")}
                        >
                            + Incluye amplificación
                        </button>
                    </div>

                    {booking.location_city && (
                        <Checkbox 
                            size="sm" 
                            isSelected={includesTravel}
                            onValueChange={setIncludesTravel}
                            classNames={{
                                label: "text-sm text-default-600 dark:text-default-300",
                                wrapper: "before:border-default-400"
                            }}
                            className="mt-3"
                        >
                            Incluye traslado y viáticos a {booking.location_city}
                        </Checkbox>
                    )}
                </div>

                {/* BOTONES ACTION */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-6 border-t border-default-200/20">
                    <button
                        type="button"
                        onClick={handleReject}
                        disabled={isRejecting || isSubmitting}
                        className="text-sm font-medium text-danger hover:text-danger-400 transition-colors self-start sm:self-auto px-2"
                    >
                        {isEditMode ? "Cancelar reserva" : "Rechazar solicitud"}
                    </button>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="bordered"
                            radius="full"
                            onClick={handleDraft}
                            disabled={isSubmitting}
                            className="border-default-200/40 text-foreground dark:text-white font-medium flex-1 sm:flex-none hover:bg-default-200/10"
                        >
                            Guardar borrador
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            radius="full"
                            isLoading={isSubmitting}
                            className="font-bold px-6 shadow-[0_0_20px_rgba(0,212,255,0.3)] flex-1 sm:flex-none"
                            startContent={
                                !isSubmitting && <Icon icon="lucide:send" width={16} />
                            }
                        >
                            {isEditMode ? "Actualizar" : "Enviar cotización"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
