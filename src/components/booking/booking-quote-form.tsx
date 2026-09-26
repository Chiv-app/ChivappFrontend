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
        <Card className="border border-primary/20 bg-primary/5 shadow-soft">
            <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">
                        {isEditMode ? "Editar cotización" : "Responder solicitud"}
                    </h2>
                    {isEditMode ? (
                        <Chip size="sm" color="primary" variant="flat">
                            En revisión del contratista
                        </Chip>
                    ) : null}
                </div>
                <p className="text-sm text-default-500">
                    {isEditMode
                        ? "Puedes ajustar tu propuesta mientras el contratista no la haya aceptado. Cada cambio genera una nueva alerta."
                        : "Indica tu precio y qué información adicional necesitas del contratista."}
                </p>
                {isEditMode && quotedAtLabel ? (
                    <p className="text-xs text-default-400">
                        Última actualización: {quotedAtLabel}
                    </p>
                ) : null}
            </CardHeader>
            <CardBody className="px-6 pb-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1">
                        <Input
                            label="Precio del servicio (S/)"
                            type="number"
                            min="1"
                            value={priceAgreed}
                            onValueChange={setPriceAgreed}
                            variant="bordered"
                            isRequired
                            description="Lo que tú recibes por el servicio."
                        />
                    </div>
                    {contractorTotalPreview != null ? (
                        <div className="rounded-2xl border border-primary/20 bg-content1 px-4 py-3 text-sm flex flex-col gap-2">
                            <p className="font-semibold text-foreground">
                                El contratista pagará{" "}
                                <span className="text-primary">
                                    {formatCurrency(contractorTotalPreview)}
                                </span>
                            </p>
                            <p className="text-default-500">
                                Servicio {formatCurrency(pricePreview)}
                                {feePreview > 0
                                    ? ` + comisión plataforma y pasarela de pagos (${formatCurrency(feePreview)})`
                                    : " · sin comisión de plataforma"}
                                . Tú recibes el precio del servicio íntegro.
                            </p>
                        </div>
                    ) : null}
                    <Textarea
                        label="Información adicional requerida"
                        placeholder="Ej. Necesito la dirección exacta con referencia, acceso para equipo, número de asistentes..."
                        value={quoteNotes}
                        onValueChange={setQuoteNotes}
                        variant="bordered"
                        minRows={3}
                    />
                    <div className="rounded-2xl border border-default-200 bg-content1 p-4 flex flex-col gap-3">
                        <p className="text-sm font-semibold text-foreground">
                            Ubicación del evento (puedes solicitar más detalle)
                        </p>
                        <Input
                            label="Dirección"
                            value={locationAddress}
                            onValueChange={setLocationAddress}
                            variant="bordered"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                                label="Ciudad"
                                value={locationCity}
                                onValueChange={setLocationCity}
                                variant="bordered"
                            />
                            <Input
                                label="Referencia"
                                value={locationReference}
                                onValueChange={setLocationReference}
                                variant="bordered"
                                description="Coordenadas o referencia adicional."
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                            type="submit"
                            color="primary"
                            radius="lg"
                            isLoading={isSubmitting}
                            className="font-semibold"
                            startContent={
                                <Icon
                                    icon={
                                        isEditMode
                                            ? "material-symbols:save"
                                            : "material-symbols:send"
                                    }
                                    width={18}
                                />
                            }
                        >
                            {isEditMode ? "Actualizar cotización" : "Enviar cotización"}
                        </Button>
                        {!isEditMode ? (
                            <Button
                                color="danger"
                                variant="flat"
                                radius="lg"
                                isLoading={isRejecting}
                                onPress={handleReject}
                            >
                                Rechazar solicitud
                            </Button>
                        ) : null}
                    </div>
                </form>
            </CardBody>
        </Card>
    );
}
