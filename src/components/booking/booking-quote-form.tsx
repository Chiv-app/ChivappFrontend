"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { quoteBooking, rejectBooking } from "@/lib/bookings";
import { formatCurrency, formatQuotedAt } from "@/lib/booking-labels";
import { getPlatformPaymentInstructions } from "@/lib/payments";
import { platformFeeAmount } from "@/lib/platform-fee";
import { useAuth } from "@/contexts/auth-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import type { BookingOut } from "@/types/api";

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

type Props = {
    booking: BookingOut;
    onUpdated: (booking: BookingOut) => void;
};

export default function BookingQuoteForm({ booking, onUpdated }: Props) {
    const { user } = useAuth();
    const { isVerified: profileIsVerified, isLoading } = useProfileVerification("musician", true, user?.is_verified);
    const isLocked = !isLoading && !profileIsVerified;

    const isEditMode = booking.status === "accepted";
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [priceAgreed, setPriceAgreed] = useState("");
    const [quoteNotes, setQuoteNotes] = useState("");
    const [locationAddress, setLocationAddress] = useState(booking.location_address);
    const [locationCity, setLocationCity] = useState(booking.location_city ?? "");
    const [locationReference, setLocationReference] = useState(
        booking.location_reference ?? "",
    );

    if (isLocked) {
        return (
            <Card className="border border-warning-200 bg-warning-50/50 shadow-soft">
                <CardBody className="gap-3 p-6 text-center items-center justify-center">
                    <div className="w-12 h-12 bg-warning-100 text-warning-600 rounded-full flex items-center justify-center mb-1">
                        <Icon icon="material-symbols:edit-document" width={28} />
                    </div>
                    <h3 className="text-lg font-bold">Verificación requerida</h3>
                    <p className="text-sm text-default-600 max-w-sm">
                        Para poder aceptar contratos y fijar precios, debes completar tu perfil al 100% y ser validado por nuestro equipo.
                    </p>
                    <Button
                        as="a"
                        href="/musician/profile"
                        color="warning"
                        variant="flat"
                        className="mt-2 font-semibold"
                    >
                        Completar mi perfil
                    </Button>
                </CardBody>
            </Card>
        );
    }
    const [platformFeePercent, setPlatformFeePercent] = useState<number>(
        booking.platform_fee_percent != null
            ? Number(booking.platform_fee_percent)
            : 2,
    );

    useEffect(() => {
        setPriceAgreed(
            booking.price_agreed != null ? String(Number(booking.price_agreed)) : "",
        );
        setQuoteNotes(booking.musician_quote_notes ?? "");
        setLocationAddress(booking.location_address);
        setLocationCity(booking.location_city ?? "");
        setLocationReference(booking.location_reference ?? "");
        if (booking.platform_fee_percent != null) {
            setPlatformFeePercent(Number(booking.platform_fee_percent));
        }
    }, [booking]);

    useEffect(() => {
        let cancelled = false;
        getPlatformPaymentInstructions()
            .then((data) => {
                if (cancelled) return;
                // Al cotizar siempre usamos la comisin más reciente del administrador
                setPlatformFeePercent(Number(data.platform_fee_percent ?? 2));
            })
            .catch(() => {
                // Keep local/default percent if instructions are unavailable.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const pricePreview = Number(priceAgreed);
    const feePreview = useMemo(() => {
        if (!pricePreview || pricePreview <= 0) return 0;
        return platformFeeAmount({
            price_agreed: pricePreview,
            platform_fee_percent: platformFeePercent,
        });
    }, [pricePreview, platformFeePercent]);
    const contractorTotalPreview =
        pricePreview > 0 ? roundMoney(pricePreview + feePreview) : null;

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const price = Number(priceAgreed);
        if (!price || price <= 0) {
            addToast({
                title: "Precio requerido",
                description: "Indica un precio válido para tu cotización.",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const updated = await quoteBooking(booking.id, {
                price_agreed: price,
                advance_amount: price,
                musician_quote_notes: quoteNotes.trim() || null,
                location_address: locationAddress.trim() || null,
                location_city: locationCity.trim() || null,
                location_reference: locationReference.trim() || null,
            });
            onUpdated(updated);
            addToast({
                title: isEditMode ? "Cotización actualizada" : "Cotización enviada",
                description: isEditMode
                    ? "El contratista fue notificado sobre los cambios en tu propuesta."
                    : "El contratista fue notificado para revisar tu propuesta.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo enviar",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleReject() {
        if (isEditMode) return;

        setIsRejecting(true);
        try {
            const updated = await rejectBooking(booking.id);
            onUpdated(updated);
            addToast({ title: "Solicitud rechazada", color: "success" });
        } catch (error) {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsRejecting(false);
        }
    }

    const quotedAtLabel = formatQuotedAt(booking.quoted_at);

    return (
        <Card className="shadow-soft border border-default-200 bg-content1 rounded-[2rem] p-5 sm:p-7 flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                        {isEditMode ? "Editar cotización" : "Responder solicitud"}
                    </h2>
                    {isEditMode && quotedAtLabel ? (
                        <p className="text-xs text-default-400 mt-1">
                            Última actualización: {quotedAtLabel}
                        </p>
                    ) : null}
                </div>
                {isEditMode ? (
                    <Chip size="sm" color="primary" variant="flat" className="px-1 font-medium">
                        En revisión del contratista
                    </Chip>
                ) : null}
            </div>

            <p className="text-sm text-default-500 leading-relaxed -mt-3">
                {isEditMode
                    ? "Puedes ajustar tu propuesta mientras el contratista no la haya aceptado. Cada cambio genera una nueva alerta."
                    : "Indica tu precio y qué información adicional necesitas del contratista."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                    <Input
                        label="Precio del servicio (S/)"
                        type="number"
                        min="1"
                        value={priceAgreed}
                        onValueChange={setPriceAgreed}
                        variant="bordered"
                        isRequired
                        description="Lo que tú recibes por el servicio."
                        classNames={{ inputWrapper: "border-default-200" }}
                    />
                    
                    {contractorTotalPreview != null ? (
                        <div className="rounded-xl border border-default-200 bg-content2/30 px-4 py-3 flex flex-col gap-1.5">
                            <p className="font-semibold text-foreground text-sm">
                                El contratista pagará{" "}
                                <span className="text-primary font-bold">
                                    {formatCurrency(contractorTotalPreview)}
                                </span>
                            </p>
                            <p className="text-xs text-default-500">
                                Servicio {formatCurrency(pricePreview)}
                                {feePreview > 0
                                    ? ` + comisión plataforma y pasarela de pagos (${formatCurrency(feePreview)})`
                                    : " – sin comisión de plataforma"}
                                . Tú recibes el precio del servicio íntegro.
                            </p>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    <Textarea
                        label="Mensaje o condiciones para el cliente"
                        placeholder="Ej. Necesito la dirección exacta con referencia, acceso para equipo, número de asistentes..."
                        value={quoteNotes}
                        onValueChange={setQuoteNotes}
                        variant="bordered"
                        minRows={3}
                        classNames={{ inputWrapper: "border-default-200" }}
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Button 
                            size="sm" 
                            variant="flat" 
                            radius="full" 
                            className="bg-default-100 text-default-600 font-medium"
                            onPress={() => setQuoteNotes(prev => (prev ? prev + "\n" : "") + "¿Hay estacionamiento disponible?")}
                        >
                            + ¿Hay estacionamiento disponible?
                        </Button>
                        <Button 
                            size="sm" 
                            variant="flat" 
                            radius="full" 
                            className="bg-default-100 text-default-600 font-medium"
                            onPress={() => setQuoteNotes(prev => (prev ? prev + "\n" : "") + "El precio incluye amplificación.")}
                        >
                            + Incluye amplificación
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl border border-default-200 bg-content1 p-5 flex flex-col gap-4 mt-2">
                    <h4 className="text-sm font-bold text-foreground">
                        Ubicación del evento <span className="text-default-400 font-normal">(puedes solicitar más detalle)</span>
                    </h4>
                    <Input
                        label="Dirección"
                        value={locationAddress}
                        onValueChange={setLocationAddress}
                        variant="bordered"
                        classNames={{ inputWrapper: "border-default-200" }}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Ciudad"
                            value={locationCity}
                            onValueChange={setLocationCity}
                            variant="bordered"
                            classNames={{ inputWrapper: "border-default-200" }}
                        />
                        <Input
                            label="Referencia"
                            value={locationReference}
                            onValueChange={setLocationReference}
                            variant="bordered"
                            description="Coordenadas o referencia adicional."
                            classNames={{ inputWrapper: "border-default-200" }}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                    <Button
                        type="submit"
                        color="primary"
                        radius="full"
                        size="lg"
                        isLoading={isSubmitting}
                        className="font-bold px-8 shadow-md"
                        startContent={
                            <Icon
                                icon={isEditMode ? "material-symbols:save" : "material-symbols:send"}
                                width={18}
                            />
                        }
                    >
                        {isEditMode ? "Actualizar cotización" : "Enviar cotización"}
                    </Button>
                    {!isEditMode ? (
                        <Button
                            color="danger"
                            variant="light"
                            radius="full"
                            size="sm"
                            className="font-medium"
                            isLoading={isRejecting}
                            onPress={handleReject}
                        >
                            Rechazar solicitud
                        </Button>
                    ) : (
                        <Button
                            color="danger"
                            variant="light"
                            radius="full"
                            size="sm"
                            className="font-medium"
                            isLoading={isRejecting}
                            onPress={handleReject}
                        >
                            Cancelar reserva
                        </Button>
                    )}
                </div>
            </form>
        </Card>
    );
}
