"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Textarea, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { apiFetch } from "@/lib/api";
import { autocompleteBookingLink, type BookingLinkOut } from "@/lib/booking-links";
import { contractorPayableTotal, platformFeeAmount } from "@/lib/platform-fee";
import { formatCurrency } from "@/lib/booking-labels";
import { todayPeruIso } from "@/lib/date-utils";
import { getPlatformPaymentInstructions } from "@/lib/payments";

type Props = {
    onSuccess: () => void;
};

export default function MusicianCreateLinkForm({ onSuccess }: Props) {
    const [price, setPrice] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [eventType, setEventType] = useState("");
    const [locationAddress, setLocationAddress] = useState("");
    const [locationCity, setLocationCity] = useState("");
    const [clientFullname, setClientFullname] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [eventDescription, setEventDescription] = useState("");
    const [sourceType, setSourceType] = useState<"manual" | "voice_dictation">("manual");
    const [showExtraFields, setShowExtraFields] = useState(false);

    // Autocompletado por voz o texto
    const [quickNote, setQuickNote] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdLink, setCreatedLink] = useState<string | null>(null);
    const [livePlatformFeePercent, setLivePlatformFeePercent] = useState<number>(2);

    useEffect(() => {
        getPlatformPaymentInstructions()
            .then(res => {
                if (res.platform_fee_percent != null) {
                    setLivePlatformFeePercent(res.platform_fee_percent);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const applyExtractedFields = (data: Awaited<ReturnType<typeof autocompleteBookingLink>>) => {
        let filledCount = 0;
        if (data.price != null && data.price >= 10) {
            setPrice(String(data.price));
            filledCount++;
        }
        if (data.event_date) {
            setEventDate(data.event_date);
            filledCount++;
        }
        if (data.start_time) {
            setStartTime(data.start_time.slice(0, 5));
            filledCount++;
        }
        if (data.end_time) {
            setEndTime(data.end_time.slice(0, 5));
            filledCount++;
        }
        if (data.event_type) {
            setEventType(data.event_type);
            setShowExtraFields(true);
            filledCount++;
        }
        if (data.location_address) {
            setLocationAddress(data.location_address);
            setShowExtraFields(true);
            filledCount++;
        }
        if (data.location_city) {
            setLocationCity(data.location_city);
            setShowExtraFields(true);
            filledCount++;
        }
        if (data.client_fullname) {
            setClientFullname(data.client_fullname);
            setShowExtraFields(true);
            filledCount++;
        }
        if (data.client_phone) {
            setClientPhone(data.client_phone);
            setShowExtraFields(true);
            filledCount++;
        }
        if (data.client_email) {
            setClientEmail(data.client_email);
            filledCount++;
        }
        if (data.event_description) {
            setEventDescription(data.event_description);
            setShowExtraFields(true);
            filledCount++;
        }
        if (data.transcript && !quickNote.trim()) {
            setQuickNote(data.transcript);
        }
        setSourceType("voice_dictation");
        addToast({
            title: filledCount > 0 ? "Datos extraídos automáticamente" : "Nota procesada",
            description:
                filledCount > 0
                    ? `Se completaron ${filledCount} campo(s) de la contrata. Revísalos antes de generar el link.`
                    : "No se detectaron campos específicos; puedes completarlos manualmente.",
            color: filledCount > 0 ? "success" : "warning",
        });
    };

    const handleExtractFromText = async () => {
        if (!quickNote.trim()) {
            addToast({
                title: "Escribe o dicta los detalles",
                description: "Describe en una frase qué acordaste con el cliente por llamada o WhatsApp.",
                color: "warning",
            });
            return;
        }
        setIsExtracting(true);
        try {
            const res = await autocompleteBookingLink({ text: quickNote.trim() });
            applyExtractedFields(res);
        } catch (err: unknown) {
            addToast({
                title: "No se pudo autocompletar",
                description: (err as Error).message || "Intenta nuevamente",
                color: "danger",
            });
        } finally {
            setIsExtracting(false);
        }
    };

    const handleToggleVoiceRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            return;
        }
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            addToast({
                title: "Micrófono no disponible",
                description: "Tu navegador no permite grabar audio aquí. Escribe o pega el texto directamente.",
                color: "warning",
            });
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
            const recorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];
            recorder.ondataavailable = (ev) => {
                if (ev.data.size > 0) {
                    audioChunksRef.current.push(ev.data);
                }
            };
            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64DataUrl = typeof reader.result === "string" ? reader.result : "";
                    if (!base64DataUrl) return;
                    setIsExtracting(true);
                    try {
                        const res = await autocompleteBookingLink({
                            text: quickNote.trim() || null,
                            audio_base64: base64DataUrl,
                            audio_mime_type: mimeType,
                        });
                        applyExtractedFields(res);
                    } catch (err: unknown) {
                        addToast({
                            title: "No se pudo procesar el audio",
                            description: (err as Error).message || "Puedes escribir los datos en el cuadro de texto.",
                            color: "danger",
                        });
                    } finally {
                        setIsExtracting(false);
                    }
                };
                reader.readAsDataURL(blob);
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch {
            addToast({
                title: "Permiso de micrófono denegado",
                description: "Habilita el micrófono en tu navegador o escribe los detalles en texto.",
                color: "warning",
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice < 10 || numericPrice > 50000) {
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
        setIsSubmitting(true);
        try {
            const res = await apiFetch<BookingLinkOut>("/booking-links", {
                method: "POST",
                body: JSON.stringify({
                    price: numericPrice,
                    event_date: eventDate || null,
                    start_time: startTime || null,
                    end_time: endTime || null,
                    event_type: eventType.trim() || null,
                    location_address: locationAddress.trim() || null,
                    location_city: locationCity.trim() || null,
                    client_fullname: clientFullname.trim() || null,
                    client_phone: clientPhone.trim() || null,
                    client_email: clientEmail.trim() || null,
                    event_description: eventDescription.trim() || null,
                    source: sourceType,
                })
            });
            const url = `${window.location.origin}/pay/${res.token}`;
            setCreatedLink(url);
            addToast({
                title: "Link creado",
                description: "El link de contrato pre-llenado ha sido generado.",
                color: "success"
            });
        } catch (error: unknown) {
            addToast({
                title: "Error",
                description: (error as Error).message || "No se pudo crear el link",
                color: "danger"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (createdLink) {
        const cleanDigits = clientPhone.replace(/\D/g, "");
        const waPhone = cleanDigits.length === 9 ? `51${cleanDigits}` : cleanDigits;
        const waText = encodeURIComponent(
            `¡Hola${clientFullname ? ` ${clientFullname}` : ""}! Aquí tienes el enlace oficial de Chivapp con todos los datos de nuestra contrata ya listos para revisar el contrato y confirmar la reserva: ${createdLink}`
        );

        return (
            <div className="flex flex-col gap-4 py-4 text-center">
                <Icon icon="lucide:check-circle-2" className="text-success mx-auto" width={48} />
                <h3 className="text-xl font-bold">¡Contrata pre-llenada lista!</h3>
                <p className="text-sm text-default-500">
                    Tu cliente abrirá el enlace con todos los datos que completaste ya cargados, listo para firmar y pagar.
                </p>
                <div className="bg-content2 p-3 rounded-lg flex items-center justify-between gap-2 border border-default-200">
                    <span className="text-sm truncate select-all">{createdLink}</span>
                    <Button 
                        isIconOnly 
                        aria-label="Copiar enlace de pago"
                        size="sm" 
                        color="primary" 
                        variant="flat"
                        onPress={() => {
                            navigator.clipboard.writeText(createdLink);
                            addToast({ title: "Copiado al portapapeles", color: "success" });
                        }}
                    >
                        <Icon icon="lucide:copy" width={16} />
                    </Button>
                </div>
                {waPhone.length >= 9 && (
                    <Button
                        as="a"
                        href={`https://wa.me/${waPhone}?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="success"
                        variant="flat"
                        startContent={<Icon icon="ic:baseline-whatsapp" width={20} />}
                    >
                        Enviar link directo por WhatsApp a {clientFullname || clientPhone}
                    </Button>
                )}
                <Button color="primary" onPress={onSuccess} className="mt-2">Cerrar</Button>
            </div>
        );
    }

    const parsedPrice = parseFloat(price) || 0;
    const bookingPreview = {
        price_agreed: parsedPrice,
        platform_fee_percent: livePlatformFeePercent
    };
    const totalToPay = contractorPayableTotal(bookingPreview) || 0;
    const feeToPay = platformFeeAmount(bookingPreview) || 0;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
            {/* Bloque de Autocompletado por Voz o Texto (para llamadas / WhatsApp) */}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Icon icon="material-symbols:mic-rounded" className="text-primary" width={20} />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                            Autocompletar con Voz o Texto (Llamadas / WhatsApp)
                        </span>
                    </div>
                    <Button
                        size="sm"
                        color={isRecording ? "danger" : "primary"}
                        variant={isRecording ? "solid" : "flat"}
                        onPress={handleToggleVoiceRecording}
                        isDisabled={isExtracting}
                        startContent={
                            <Icon
                                icon={isRecording ? "lucide:square" : "lucide:mic"}
                                width={15}
                            />
                        }
                    >
                        {isRecording ? "Detener audio" : "Dictar por voz"}
                    </Button>
                </div>
                <Textarea
                    aria-label="Resumen de la llamada o mensaje de WhatsApp"
                    minRows={2}
                    maxRows={4}
                    placeholder='Ej: "Cerré por llamada con Carlos Pérez (987654321) un cumpleaños el 2026-12-20 a las 8pm en Av. Mariscal Cáceres 820 Huamanga por S/ 450"'
                    value={quickNote}
                    onValueChange={setQuickNote}
                    variant="bordered"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleExtractFromText();
                        }
                    }}
                />
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-default-500">
                        Pega el mensaje del cliente o dicta lo que acordaron por teléfono.
                    </span>
                    <Button
                        size="sm"
                        color="primary"
                        variant="solid"
                        isLoading={isExtracting}
                        onPress={handleExtractFromText}
                        startContent={!isExtracting ? <Icon icon="lucide:sparkles" width={14} /> : undefined}
                    >
                        Extraer datos
                    </Button>
                </div>
            </div>

            <Input
                label="Precio acordado (obligatorio)"
                type="number"
                min={10}
                max={50000}
                step="0.01"
                description="Monto entre S/ 10.00 y S/ 50,000.00"
                isRequired
                value={price}
                onValueChange={setPrice}
                variant="bordered"
                startContent={<span className="text-default-400 text-sm">S/</span>}
            />
            
            {parsedPrice > 0 && (
                <div className="bg-default-50 border border-default-200 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-default-500">Tu ganancia (Precio base)</span>
                        <span className="font-semibold">{formatCurrency(parsedPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-default-500">Tarifa de servicio</span>
                        <span className="font-semibold">{formatCurrency(feeToPay)}</span>
                    </div>
                    <div className="h-px w-full bg-default-200 my-1"></div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold">Total a pagar por el cliente</span>
                        <span className="font-bold text-primary">{formatCurrency(totalToPay)}</span>
                    </div>
                    <p className="text-xs text-default-500 mt-1 leading-tight">
                        * El cliente pagará esta cantidad. Incluye la comisión de la plataforma y los cargos de procesamiento bancario.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                    label="Fecha del evento"
                    type="date"
                    min={todayPeruIso()}
                    value={eventDate}
                    onValueChange={setEventDate}
                    variant="bordered"
                />
                <Input
                    label="Hora inicio"
                    type="time"
                    value={startTime}
                    onValueChange={setStartTime}
                    variant="bordered"
                />
                <Input
                    label="Hora fin (opc.)"
                    type="time"
                    value={endTime}
                    onValueChange={setEndTime}
                    variant="bordered"
                />
            </div>

            <div className="flex items-center justify-between pt-1">
                <button
                    type="button"
                    onClick={() => setShowExtraFields((v) => !v)}
                    className="text-xs font-semibold text-primary flex items-center gap-1.5 hover:underline"
                >
                    <Icon
                        icon={showExtraFields ? "lucide:chevron-up" : "lucide:chevron-down"}
                        width={16}
                    />
                    {showExtraFields
                        ? "Ocultar datos pre-llenados del evento y cliente"
                        : "Pre-llenar lugar, tipo de evento y datos del cliente (recomendado)"}
                </button>
            </div>

            {showExtraFields && (
                <div className="flex flex-col gap-3 rounded-xl border border-default-200 bg-default-50/50 p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Tipo de evento"
                            placeholder="Ej. Cumpleaños, Serenata, Boda"
                            value={eventType}
                            onValueChange={setEventType}
                            variant="bordered"
                            size="sm"
                        />
                        <Input
                            label="Ciudad / Distrito"
                            placeholder="Ej. Huamanga, Ayacucho"
                            value={locationCity}
                            onValueChange={setLocationCity}
                            variant="bordered"
                            size="sm"
                        />
                    </div>
                    <Input
                        label="Dirección exacta del evento"
                        placeholder="Ej. Av. Mariscal Cáceres 820, Huamanga"
                        value={locationAddress}
                        onValueChange={setLocationAddress}
                        variant="bordered"
                        size="sm"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Nombre del cliente"
                            placeholder="Ej. Carlos Pérez"
                            value={clientFullname}
                            onValueChange={setClientFullname}
                            variant="bordered"
                            size="sm"
                            autoComplete="name"
                        />
                        <Input
                            label="Celular / WhatsApp del cliente"
                            type="tel"
                            inputMode="tel"
                            placeholder="Ej. 987654321"
                            value={clientPhone}
                            onValueChange={setClientPhone}
                            variant="bordered"
                            size="sm"
                            autoComplete="tel"
                        />
                    </div>
                    <Textarea
                        label="Notas o repertorio acordado (opcional)"
                        placeholder="Ej. 7 integrantes, traje blanco, incluir Las Mañanitas y El Rey"
                        minRows={2}
                        value={eventDescription}
                        onValueChange={setEventDescription}
                        variant="bordered"
                        size="sm"
                    />
                </div>
            )}

            <Input
                label="Correo del cliente (opcional)"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="cliente@ejemplo.com"
                description="Si lo indicas, el enlace quedará reservado únicamente para ese correo."
                value={clientEmail}
                onValueChange={setClientEmail}
                variant="bordered"
            />
            <div className="bg-primary/10 p-3 rounded-lg mt-1">
                <p className="text-xs text-primary-text">
                    Todo lo que dejes cargado aquí le aparecerá <strong>ya completado</strong> a tu cliente cuando abra el enlace, para que solo revise, firme el contrato digital y pague.
                </p>
            </div>
            <div className="flex justify-end gap-2 mt-1">
                <Button type="submit" color="primary" isLoading={isSubmitting}>
                    Generar link de contrata
                </Button>
            </div>
        </form>
    );
}
