"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
    Button,
    Checkbox,
    Divider,
    Input,
    Select,
    SelectItem,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import CircularStepper from "@/components/ui/circular-stepper";
import LocationMapPickerField, { type MapLocation } from "@/components/ui/location-map-picker-field";
import { getEventTypeOptions } from "@/lib/booking-labels";
import { autocompleteBookingLink } from "@/lib/booking-links";
import { startVoiceDictation, type VoiceDictationSession } from "@/lib/voice-dictation";
import { createMusicianBooking } from "@/lib/bookings";
import { listEnsembleMembers } from "@/lib/ensemble-members";
import {
    formatLocationReference,
    getMinEventDate,
    normalizeStartTime,
    searchPlaces,
} from "@/lib/geocoding";
import { getMusicianProfile } from "@/lib/profiles";
import type { EnsembleMemberOut } from "@/types/api";

const DOCUMENT_TYPES = ["DNI", "CE", "Pasaporte", "RUC", "Otro"];

type WizardStep = 1 | 2 | 3;

type Props = {
    onSuccess?: () => void;
};

function addHoursToTime(startTime: string, hoursToAdd: number): string {
    const match = /^(\d{1,2}):(\d{2})/.exec(startTime.trim());
    if (!match) return "";
    const baseHours = Number(match[1]);
    const baseMinutes = Number(match[2]);
    if (Number.isNaN(baseHours) || Number.isNaN(baseMinutes)) return "";
    const totalMinutes = (baseHours * 60 + baseMinutes + Math.round(hoursToAdd * 60)) % (24 * 60);
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const endM = String(totalMinutes % 60).padStart(2, "0");
    return `${endH}:${endM}`;
}

export default function MusicianCreateBookingForm({ onSuccess }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<WizardStep>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Paso 1: Dictado por voz o texto con IA
    const [quickNote, setQuickNote] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const dictationSessionRef = useRef<VoiceDictationSession | null>(null);

    // Paso 2: Evento, horario y ubicación
    const [eventType, setEventType] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [locationAddress, setLocationAddress] = useState("");
    const [locationCity, setLocationCity] = useState("");
    const [location, setLocation] = useState<MapLocation | null>(null);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [eventDescription, setEventDescription] = useState("");

    // Paso 3: Cliente (en borrador), precio e integrantes
    const [contractorPhone, setContractorPhone] = useState("");
    const [contractorFullname, setContractorFullname] = useState("");
    const [contractorEmail, setContractorEmail] = useState("");
    const [documentType, setDocumentType] = useState("DNI");
    const [documentNumber, setDocumentNumber] = useState("");
    const [priceAgreed, setPriceAgreed] = useState("");
    const [advanceReceived, setAdvanceReceived] = useState("");
    const [quoteNotes, setQuoteNotes] = useState("");

    // Integrantes del grupo (solo cuando el perfil activo es group)
    const [isGroupProfile, setIsGroupProfile] = useState(false);
    const [activeMembers, setActiveMembers] = useState<EnsembleMemberOut[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

    const minEventDate = useMemo(() => getMinEventDate(), []);

    useEffect(() => {
        let cancelled = false;
        getMusicianProfile()
            .then((profile) => {
                if (cancelled) return;
                const isGroup = (profile.profile_type || "solo") === "group";
                setIsGroupProfile(isGroup);
                if (isGroup) {
                    return listEnsembleMembers().then((members) => {
                        if (cancelled) return;
                        const eligible = members.filter((m) => m.status !== "inactive");
                        setActiveMembers(eligible);
                        setSelectedMemberIds(new Set(eligible.map((m) => m.id)));
                    });
                }
            })
            .catch(() => {
                // Silencioso: si falla la carga de integrantes no bloquea el formulario
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            dictationSessionRef.current?.stop();
        };
    }, []);

    function applyExtractedFields(data: Awaited<ReturnType<typeof autocompleteBookingLink>>) {
        let filledCount = 0;
        if (data.price != null && data.price >= 10) {
            setPriceAgreed(String(data.price));
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
            filledCount++;
        }
        if (data.location_address) {
            setLocationAddress(data.location_address);
            filledCount++;
        }
        if (data.location_city) {
            setLocationCity(data.location_city);
            filledCount++;
        }
        if (data.client_fullname) {
            setContractorFullname(data.client_fullname);
            filledCount++;
        }
        if (data.client_phone) {
            setContractorPhone(data.client_phone);
            filledCount++;
        }
        if (data.client_email) {
            setContractorEmail(data.client_email);
            filledCount++;
        }
        if (data.client_document_number) {
            setDocumentNumber(data.client_document_number);
            filledCount++;
        }
        if (data.event_description) {
            setEventDescription(data.event_description);
            filledCount++;
        }
        if (data.transcript) {
            setQuickNote(data.transcript);
        }
        if (filledCount > 0) {
            addToast({
                title: "Datos extraídos con IA",
                description: `Completamos ${filledCount} campo(s). Revisa el evento y lugar antes de continuar.`,
                color: "success",
            });
            setStep(2);
        } else {
            addToast({
                title: "No se detectaron datos claros",
                description:
                    "Menciona el tipo de evento, fecha, hora, dirección, teléfono del cliente o monto, o avanza al paso 2 manualmente.",
                color: "warning",
            });
        }
    }

    async function handleExtractFromText() {
        if (!quickNote.trim()) {
            addToast({
                title: "Escribe o dicta los detalles",
                description: "Describe en una frase qué acordaste con el cliente o avanza manualmente.",
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
                description: (err as Error).message || "Puedes llenar los campos manualmente.",
                color: "danger",
            });
        } finally {
            setIsExtracting(false);
        }
    }

    async function handleToggleVoiceRecording() {
        if (isRecording) {
            dictationSessionRef.current?.stop();
            setIsRecording(false);
            return;
        }
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            addToast({
                title: "Micrófono no disponible",
                description: "Tu navegador no permite grabar audio aquí. Escribe o pega el texto.",
                color: "warning",
            });
            return;
        }
        try {
            const session = await startVoiceDictation({
                initialText: quickNote,
                onTranscriptChange: (liveText) => {
                    setQuickNote(liveText);
                },
                onComplete: async ({ transcriptText, base64DataUrl, mimeType }) => {
                    const effectiveText = transcriptText.trim() || quickNote.trim();
                    if (!effectiveText && !base64DataUrl) return;
                    setIsExtracting(true);
                    try {
                        const res = await autocompleteBookingLink({
                            text: effectiveText || null,
                            audio_base64: base64DataUrl || null,
                            audio_mime_type: mimeType,
                        });
                        applyExtractedFields(res);
                    } catch (err: unknown) {
                        addToast({
                            title: "No se pudo procesar el audio",
                            description: (err as Error).message || "Puedes escribir los datos manualmente.",
                            color: "danger",
                        });
                    } finally {
                        setIsExtracting(false);
                    }
                },
            });
            dictationSessionRef.current = session;
            setIsRecording(true);
        } catch (err: unknown) {
            const errName = err instanceof DOMException ? err.name : "";
            const isNoDevice = errName === "NotFoundError" || errName === "DevicesNotFoundError";
            const isBusy = errName === "NotReadableError" || errName === "TrackStartError";
            addToast({
                title: isNoDevice
                    ? "No se detectó un micrófono"
                    : isBusy
                      ? "Micrófono en uso"
                      : "Permiso de micrófono bloqueado",
                description: isNoDevice
                    ? "Conecta un micrófono o escribe los detalles en el cuadro de texto."
                    : isBusy
                      ? "Otra aplicación está usando el micrófono. Ciérrala e inténtalo de nuevo."
                      : "Permite el acceso al micrófono desde el ícono junto a la barra de direcciones del navegador.",
                color: "warning",
            });
        }
    }

    function handleMapLocationChange(loc: MapLocation | null) {
        setLocation(loc);
        if (loc) {
            if (loc.address && !locationAddress.trim()) {
                setLocationAddress(loc.address);
            } else if (loc.address) {
                setLocationAddress(loc.address);
            }
            if (loc.city) {
                setLocationCity(loc.city);
            }
        }
    }

    function validateStep2(): boolean {
        if (!eventType.trim() || eventType.trim().length < 2) {
            addToast({
                title: "Tipo de evento requerido",
                description: "Indica qué tipo de evento es (ej. Cumpleaños, Boda, Serenata).",
                color: "warning",
            });
            return false;
        }
        if (!eventDate) {
            addToast({
                title: "Fecha requerida",
                description: "Selecciona la fecha de la presentación.",
                color: "warning",
            });
            return false;
        }
        if (!startTime) {
            addToast({
                title: "Hora de inicio requerida",
                description: "Indica la hora en la que inicia el show.",
                color: "warning",
            });
            return false;
        }
        const effectiveAddress = locationAddress.trim() || location?.address?.trim() || "";
        if (effectiveAddress.length < 3) {
            addToast({
                title: "Ubicación requerida",
                description: "Escribe la dirección del evento o selecciónala en el mapa.",
                color: "warning",
            });
            return false;
        }
        return true;
    }

    function toggleMemberSelection(memberId: string) {
        setSelectedMemberIds((prev) => {
            const next = new Set(prev);
            if (next.has(memberId)) {
                next.delete(memberId);
            } else {
                next.add(memberId);
            }
            return next;
        });
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!validateStep2()) {
            setStep(2);
            return;
        }

        const cleanPhone = contractorPhone.trim();
        const phoneDigits = cleanPhone.replace(/\D/g, "");
        if (phoneDigits.length < 7) {
            addToast({
                title: "Teléfono del cliente obligatorio",
                description: "Ingresa el número de celular o WhatsApp del cliente.",
                color: "warning",
            });
            return;
        }

        const trimmedPrice = priceAgreed.trim().replace(",", ".");
        const price = Number(trimmedPrice);
        if (!trimmedPrice || Number.isNaN(price) || price < 10 || price > 50000) {
            addToast({
                title: "Precio inválido",
                description: "El precio acordado debe estar entre S/ 10 y S/ 50,000.",
                color: "warning",
            });
            return;
        }
        if (!/^\d+(\.\d{1,2})?$/.test(trimmedPrice)) {
            addToast({
                title: "Demasiados decimales",
                description: "El precio acordado admite como máximo 2 decimales.",
                color: "warning",
            });
            return;
        }

        const trimmedAdvance = advanceReceived.trim().replace(",", ".");
        const advanceNum = trimmedAdvance ? Number(trimmedAdvance) : 0;
        if (
            trimmedAdvance &&
            (Number.isNaN(advanceNum) || advanceNum < 0 || advanceNum > price)
        ) {
            addToast({
                title: "Adelanto inválido",
                description:
                    "El adelanto recibido no puede ser negativo ni mayor al monto total acordado.",
                color: "warning",
            });
            return;
        }
        const combinedQuoteNotes =
            advanceNum > 0
                ? `Adelanto recibido: S/ ${advanceNum.toFixed(2)}${
                      quoteNotes.trim() ? ` · ${quoteNotes.trim()}` : ""
                  }`
                : quoteNotes.trim() || null;

        const effectiveAddress = locationAddress.trim() || location?.address?.trim() || "";
        const effectiveCity = locationCity.trim() || location?.city?.trim() || null;

        setIsSubmitting(true);
        try {
            let resolvedCoords =
                location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
                    ? { lat: location.lat, lng: location.lng }
                    : null;

            if (!resolvedCoords && effectiveAddress.length >= 3) {
                const query = [effectiveAddress, effectiveCity]
                    .filter(Boolean)
                    .join(", ");
                const matches = await searchPlaces(query).catch(() => []);
                if (matches.length > 0) {
                    resolvedCoords = { lat: matches[0].lat, lng: matches[0].lng };
                }
            }

            const effectiveReference = resolvedCoords
                ? formatLocationReference(resolvedCoords.lat, resolvedCoords.lng)
                : null;

            const booking = await createMusicianBooking({
                contractor_fullname: contractorFullname.trim() || null,
                contractor_email: contractorEmail.trim().toLowerCase() || null,
                contractor_phone: cleanPhone,
                document_type: documentNumber.trim() ? documentType || "DNI" : null,
                document_number: documentNumber.trim() || null,
                contractor_address: effectiveAddress || null,
                contractor_city: effectiveCity,
                event_date: eventDate,
                start_time: normalizeStartTime(startTime),
                end_time: endTime ? normalizeStartTime(endTime) : null,
                location_address: effectiveAddress,
                location_city: effectiveCity,
                location_reference: effectiveReference,
                event_type: eventType.trim(),
                event_description: eventDescription.trim() || null,
                price_agreed: price,
                musician_quote_notes: combinedQuoteNotes,
                already_paid: true,
                ensemble_member_ids:
                    isGroupProfile && selectedMemberIds.size > 0
                        ? Array.from(selectedMemberIds)
                        : null,
            });

            addToast({
                title: "Contrata registrada y confirmada",
                description:
                    "Tu agenda quedó bloqueada y ya puedes gestionar la presentación y el reparto a tu banda.",
                color: "success",
            });
            onSuccess?.();
            router.push(`/musician/bookings/${booking.id}`);
        } catch (error) {
            addToast({
                title: "No se pudo registrar la contrata",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const stepsMeta: Array<{ id: WizardStep; title: string }> = [
        { id: 1, title: "Dictado o resumen" },
        { id: 2, title: "Evento y lugar" },
        { id: 3, title: "Cliente, precio y equipo" },
    ];

    const eventTypeOptions = useMemo(
        () => getEventTypeOptions(eventType),
        [eventType],
    );

    return (
        <div className="flex flex-col gap-5">
            {/* Barra de pasos circular unificada */}
            <CircularStepper
                ariaLabel="Pasos para registrar nueva contrata"
                steps={stepsMeta.map((item) => ({
                    id: item.id,
                    title: item.title,
                    state:
                        step > item.id
                            ? "done"
                            : step === item.id
                              ? "current"
                              : "upcoming",
                }))}
                onStepClick={(clicked) => {
                    const targetId = Number(clicked.id) as WizardStep;
                    if (targetId < step) {
                        setStep(targetId);
                    } else if (targetId === 2) {
                        setStep(2);
                    } else if (targetId === 3 && validateStep2()) {
                        setStep(3);
                    }
                }}
            />

            {step === 1 && (
                <div className="flex flex-col gap-4 py-1">
                    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Icon icon="material-symbols:mic-rounded" className="text-primary" width={22} />
                                <span className="text-sm font-bold text-foreground">
                                    Autocompletar con voz o texto (IA)
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
                                {isRecording ? "Detener grabación" : "Dictar por voz"}
                            </Button>
                        </div>
                        <p className="text-xs text-default-600">
                            Dicta o pega lo que cerraste por WhatsApp (fecha, hora, lugar, teléfono del cliente, monto y canciones) para llenar los pasos siguientes en segundos.
                        </p>
                        <Textarea
                            aria-label="Resumen del acuerdo por llamada o WhatsApp"
                            minRows={3}
                            maxRows={5}
                            placeholder='Ej: "Cerré con Carlos (987654321) un cumpleaños el 2026-12-20 de 8pm a 10pm en Av. Mariscal Cáceres 820 Huamanga por S/ 800, pidió Las Mañanitas"'
                            value={quickNote}
                            onValueChange={setQuickNote}
                            variant="bordered"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    void handleExtractFromText();
                                }
                            }}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <Button
                                variant="flat"
                                radius="lg"
                                size="sm"
                                onPress={() => setStep(2)}
                                endContent={<Icon icon="lucide:arrow-right" width={15} />}
                            >
                                Prefiero escribir paso a paso
                            </Button>
                            <Button
                                color="primary"
                                variant="solid"
                                radius="lg"
                                isLoading={isExtracting}
                                onPress={() => void handleExtractFromText()}
                                startContent={!isExtracting ? <Icon icon="lucide:sparkles" width={16} /> : undefined}
                            >
                                Extraer datos y continuar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="flex flex-col gap-4 py-1">
                    <section className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Icon icon="material-symbols:event" width={20} className="text-primary" />
                            <h3 className="font-semibold text-foreground">Evento y horario</h3>
                        </div>

                        <Select
                            label="Tipo de evento"
                            placeholder="Selecciona el tipo de evento"
                            selectedKeys={eventType ? new Set([eventType]) : new Set()}
                            onSelectionChange={(keys) => {
                                if (keys === "all") return;
                                const val = Array.from(keys)[0]?.toString() ?? "";
                                setEventType(val);
                            }}
                            isRequired
                            variant="bordered"
                            radius="lg"
                        >
                            {eventTypeOptions.map((type) => (
                                <SelectItem key={type}>{type}</SelectItem>
                            ))}
                        </Select>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Input
                                label="Fecha del evento"
                                type="date"
                                isRequired
                                min={minEventDate}
                                value={eventDate}
                                onValueChange={setEventDate}
                                variant="bordered"
                                radius="lg"
                            />
                            <Input
                                label="Hora de inicio"
                                type="time"
                                isRequired
                                value={startTime}
                                onValueChange={(val) => {
                                    setStartTime(val);
                                    if (!endTime && val) {
                                        setEndTime(addHoursToTime(val, 1));
                                    }
                                }}
                                variant="bordered"
                                radius="lg"
                            />
                            <Input
                                label="Hora de fin / duración"
                                type="time"
                                value={endTime}
                                onValueChange={setEndTime}
                                variant="bordered"
                                radius="lg"
                            />
                        </div>

                        {startTime ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-default-500 mr-1">Duración rápida:</span>
                                {[1, 2, 3, 4].map((hrs) => (
                                    <Button
                                        key={hrs}
                                        size="sm"
                                        variant="flat"
                                        radius="lg"
                                        className="h-7 min-w-0 px-2.5 text-xs"
                                        onPress={() => setEndTime(addHoursToTime(startTime, hrs))}
                                    >
                                        +{hrs} h
                                    </Button>
                                ))}
                            </div>
                        ) : null}
                    </section>

                    <Divider />

                    <section className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Icon icon="material-symbols:location-on" width={20} className="text-primary" />
                                <h3 className="font-semibold text-foreground">Ubicación del evento</h3>
                            </div>
                            <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                radius="lg"
                                onPress={() => setShowMapPicker((v) => !v)}
                                startContent={<Icon icon="lucide:map-pin" width={14} />}
                            >
                                {showMapPicker ? "Ocultar mapa" : "Colocar pin en el mapa"}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Input
                                className="sm:col-span-2"
                                label="Dirección exacta del evento"
                                placeholder="Ej. Av. Mariscal Cáceres 820"
                                isRequired
                                value={locationAddress}
                                onValueChange={(val) => {
                                    setLocationAddress(val);
                                    setLocation((prev) =>
                                        prev
                                            ? { ...prev, lat: Number.NaN, lng: Number.NaN, address: val }
                                            : null,
                                    );
                                }}
                                variant="bordered"
                                radius="lg"
                            />
                            <Input
                                label="Distrito / Ciudad"
                                placeholder="Ej. Huamanga, Lima"
                                value={locationCity}
                                onValueChange={(val) => {
                                    setLocationCity(val);
                                    setLocation((prev) =>
                                        prev
                                            ? { ...prev, lat: Number.NaN, lng: Number.NaN, city: val }
                                            : null,
                                    );
                                }}
                                variant="bordered"
                                radius="lg"
                            />
                        </div>

                        {showMapPicker ? (
                            <div className="pt-1">
                                <LocationMapPickerField
                                    value={location}
                                    onChange={handleMapLocationChange}
                                    fallbackQuery={
                                        [locationAddress.trim(), locationCity.trim()]
                                            .filter(Boolean)
                                            .join(", ") || undefined
                                    }
                                />
                            </div>
                        ) : null}

                        <Textarea
                            label="Notas y repertorio para la banda (opcional)"
                            placeholder="Ej. Vestimenta formal, canciones pedidas por el cliente o indicaciones de llegada…"
                            value={eventDescription}
                            onValueChange={setEventDescription}
                            variant="bordered"
                            radius="lg"
                            minRows={2}
                        />
                    </section>

                    <div className="flex items-center justify-between gap-2 pt-2">
                        <Button
                            variant="flat"
                            radius="lg"
                            onPress={() => setStep(1)}
                            startContent={<Icon icon="lucide:arrow-left" width={16} />}
                        >
                            Volver al dictado
                        </Button>
                        <Button
                            color="primary"
                            radius="lg"
                            className="font-semibold"
                            onPress={() => {
                                if (validateStep2()) {
                                    setStep(3);
                                }
                            }}
                            endContent={<Icon icon="lucide:arrow-right" width={16} />}
                        >
                            Siguiente: Cliente y precio
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-1">
                    <section className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Icon icon="material-symbols:person" width={20} className="text-primary" />
                            <h3 className="font-semibold text-foreground">Datos del cliente</h3>
                        </div>
                        <p className="text-xs text-default-500">
                            Solo el celular es obligatorio. Si agregas su DNI, nombre o correo, dejaremos creado su perfil en borrador para que pueda completarlo si ingresa a Chivapp.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                                label="Celular / WhatsApp del cliente"
                                type="tel"
                                inputMode="tel"
                                placeholder="Ej. 987654321"
                                isRequired
                                value={contractorPhone}
                                onValueChange={setContractorPhone}
                                variant="bordered"
                                radius="lg"
                            />
                            <Input
                                label="Nombre del cliente (opcional)"
                                placeholder="Ej. Carlos Pérez"
                                value={contractorFullname}
                                onValueChange={setContractorFullname}
                                variant="bordered"
                                radius="lg"
                            />
                            <Select
                                label="Tipo de documento (opcional)"
                                selectedKeys={documentType ? [documentType] : []}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0];
                                    setDocumentType(value ? String(value) : "");
                                }}
                                variant="bordered"
                                radius="lg"
                            >
                                {DOCUMENT_TYPES.map((type) => (
                                    <SelectItem key={type}>{type}</SelectItem>
                                ))}
                            </Select>
                            <Input
                                label="Número de documento (opcional)"
                                placeholder="Ej. 71234567 (DNI, CE o RUC)"
                                value={documentNumber}
                                onValueChange={setDocumentNumber}
                                variant="bordered"
                                radius="lg"
                            />
                            <Input
                                className="sm:col-span-2"
                                label="Correo del cliente (opcional)"
                                type="email"
                                inputMode="email"
                                placeholder="Ej. cliente@correo.com"
                                value={contractorEmail}
                                onValueChange={setContractorEmail}
                                variant="bordered"
                                radius="lg"
                            />
                        </div>
                    </section>

                    <Divider />

                    <section className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Icon icon="material-symbols:payments" width={20} className="text-primary" />
                            <h3 className="font-semibold text-foreground">Precio acordado y adelanto</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Input
                                label="Monto total acordado"
                                type="number"
                                min={10}
                                max={50000}
                                step="0.01"
                                isRequired
                                value={priceAgreed}
                                onValueChange={setPriceAgreed}
                                variant="bordered"
                                radius="lg"
                                startContent={<span className="text-default-400 text-sm">S/</span>}
                                description="Sin comisión Chivapp (0 %)."
                            />
                            <Input
                                label="Adelanto recibido (opcional)"
                                type="number"
                                min={0}
                                max={Number(priceAgreed) || 50000}
                                step="0.01"
                                placeholder="0.00"
                                value={advanceReceived}
                                onValueChange={setAdvanceReceived}
                                variant="bordered"
                                radius="lg"
                                startContent={<span className="text-default-400 text-sm">S/</span>}
                                description="Lo que ya te abonó el cliente."
                            />
                            <Input
                                label="Nota o medio de pago (opcional)"
                                placeholder="Ej. Por Yape, saldo en efectivo"
                                value={quoteNotes}
                                onValueChange={setQuoteNotes}
                                variant="bordered"
                                radius="lg"
                            />
                        </div>
                        {Number(priceAgreed) > 0 ? (
                            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-default-200/80 bg-default-50/70 p-3 text-xs">
                                <div>
                                    <p className="text-default-500">Tarifa total</p>
                                    <p className="font-bold text-foreground text-sm tabular-nums mt-0.5">
                                        S/ {Number(priceAgreed).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-default-500">Adelanto recibido</p>
                                    <p className="font-bold text-success-text text-sm tabular-nums mt-0.5">
                                        S/ {Math.min(Number(priceAgreed), Math.max(0, Number(advanceReceived) || 0)).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-default-500">Saldo al finalizar</p>
                                    <p className="font-bold text-foreground text-sm tabular-nums mt-0.5">
                                        S/ {Math.max(0, Number(priceAgreed) - (Number(advanceReceived) || 0)).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </section>

                    {isGroupProfile && activeMembers.length > 0 ? (
                        <>
                            <Divider />
                            <section className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="material-symbols:groups" width={20} className="text-primary" />
                                        <h3 className="font-semibold text-foreground">
                                            Convocar integrantes ({selectedMemberIds.size}/{activeMembers.length})
                                        </h3>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        radius="lg"
                                        onPress={() => {
                                            if (selectedMemberIds.size === activeMembers.length) {
                                                setSelectedMemberIds(new Set());
                                            } else {
                                                setSelectedMemberIds(new Set(activeMembers.map((m) => m.id)));
                                            }
                                        }}
                                    >
                                        {selectedMemberIds.size === activeMembers.length
                                            ? "Desmarcar todos"
                                            : "Seleccionar a toda la banda"}
                                    </Button>
                                </div>
                                <p className="text-xs text-default-500">
                                    Los integrantes marcados recibirán la convocatoria del evento apenas guardes la contrata.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                    {activeMembers.map((member) => {
                                        const isChecked = selectedMemberIds.has(member.id);
                                        return (
                                            <div
                                                key={member.id}
                                                className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors ${
                                                    isChecked
                                                        ? "border-primary/40 bg-primary/5"
                                                        : "border-default-200 bg-content1"
                                                }`}
                                            >
                                                <Checkbox
                                                    isSelected={isChecked}
                                                    onValueChange={() => toggleMemberSelection(member.id)}
                                                    size="sm"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-foreground">
                                                            {member.fullname}
                                                        </span>
                                                        {member.specialties.length > 0 ? (
                                                            <span className="text-xs text-default-500">
                                                                {member.specialties.slice(0, 2).join(", ")}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </Checkbox>
                                                {member.profile_slug ? (
                                                    <a
                                                        href={`/musicians/${member.profile_slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-medium text-primary-text hover:underline shrink-0"
                                                    >
                                                        Perfil solista
                                                    </a>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    ) : null}

                    <div className="flex items-center justify-between gap-2 pt-2">
                        <Button
                            variant="flat"
                            radius="lg"
                            onPress={() => setStep(2)}
                            startContent={<Icon icon="lucide:arrow-left" width={16} />}
                        >
                            Atrás
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            radius="lg"
                            className="font-semibold"
                            isLoading={isSubmitting}
                            startContent={
                                isSubmitting ? undefined : (
                                    <Icon icon="material-symbols:check-circle" width={18} />
                                )
                            }
                        >
                            Registrar contrata confirmada
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
