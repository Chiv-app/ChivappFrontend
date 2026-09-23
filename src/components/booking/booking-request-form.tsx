"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    Button,
    Chip,
    DatePicker,
    Input,
    Select,
    SelectItem,
    Spinner,
    Textarea,
    addToast,
    TimeInput,
} from "@heroui/react";
import {
    getLocalTimeZone,
    parseDate,
    today,
    Time,
    type DateValue,
} from "@internationalized/date";
import LocationMapPickerField, { type MapLocation } from "@/components/ui/location-map-picker-field";
import { getMusicianAvailability } from "@/lib/availability";
import {
    formatAvailabilitySummary,
    formatTimeLabel,
    getAvailableDaySet,
    getSlotsForDate,
    validateBookingAgainstAvailability,
} from "@/lib/availability-calendar";
import { createBooking } from "@/lib/bookings";
import {
    formatLocationReference,
    normalizeStartTime,
    validateBookingRequest,
} from "@/lib/geocoding";
import type { AvailabilityOut } from "@/types/api";

const EVENT_TYPES = [
    "Boda",
    "Quinceañero",
    "Cumpleaños",
    "Aniversario",
    "Evento corporativo",
    "Serenata",
    "Otro",
];

type MusicianRef = {
    id: string;
    name: string;
};

type Props = {
    musician: MusicianRef;
    onSuccess?: () => void;
};

export default function BookingRequestForm({ musician, onSuccess }: Props) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [slots, setSlots] = useState<AvailabilityOut[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(true);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [eventDate, setEventDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [eventType, setEventType] = useState("");
    const [eventDescription, setEventDescription] = useState("");
    const [location, setLocation] = useState<MapLocation | null>(null);

    const minCalendarValue = useMemo(() => today(getLocalTimeZone()), []);
    const availableDays = useMemo(() => getAvailableDaySet(slots), [slots]);
    const daySlots = useMemo(
        () => (eventDate ? getSlotsForDate(slots, eventDate) : []),
        [slots, eventDate],
    );

    const timeOptions = useMemo(() => {
        const options = [];
        for (let h = 0; h < 24; h++) {
            for (const m of [0, 30]) {
                const hh = h.toString().padStart(2, "0");
                const mm = m.toString().padStart(2, "0");
                const value = hh + ":" + mm;
                
                let disabled = false;
                if (eventDate && slots.length > 0) {
                    disabled = !!validateBookingAgainstAvailability({
                        eventDate,
                        startTime: value,
                        slots,
                    });
                }
                
                let hours = h;
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                const label = hours + ":" + mm + " " + ampm;

                options.push({ value, label, disabled });
            }
        }
        return options;
    }, [eventDate, slots]);
    const availabilitySummary = useMemo(
        () => formatAvailabilitySummary(slots),
        [slots],
    );

    useEffect(() => {
        let cancelled = false;

        setIsLoadingSlots(true);
        setSlotsError(null);

        getMusicianAvailability(musician.id)
            .then((data) => {
                if (cancelled) return;
                setSlots(data);
            })
            .catch((error) => {
                if (cancelled) return;
                setSlots([]);
                setSlotsError(
                    error instanceof Error
                        ? error.message
                        : "No se pudo cargar la disponibilidad del músico.",
                );
            })
            .finally(() => {
                if (!cancelled) setIsLoadingSlots(false);
            });

        return () => {
            cancelled = true;
        };
    }, [musician.id]);

    function isDateUnavailable(date: DateValue): boolean {
        if (availableDays.size === 0) return false;
        const jsDay = date.toDate(getLocalTimeZone()).getDay();
        return !availableDays.has(jsDay);
    }

    function handleDateChange(value: DateValue | null) {
        if (!value) {
            setEventDate("");
            return;
        }
        const next = value.toString();
        setEventDate(next);
        if (startTime) {
            const mismatch = validateBookingAgainstAvailability({
                eventDate: next,
                startTime,
                slots,
            });
            if (mismatch) setStartTime("");
        }
    }

    async function submitRequest() {
        const validationError = validateBookingRequest({
            eventDate,
            startTime,
            eventType,
            location,
        });

        if (validationError) {
            addToast({
                title: "Campos incompletos",
                description: validationError,
                color: "warning",
            });
            return;
        }

        const availabilityError = validateBookingAgainstAvailability({
            eventDate,
            startTime,
            slots,
        });
        if (availabilityError) {
            addToast({
                title: "Fuera de disponibilidad",
                description: availabilityError,
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const booking = await createBooking({
                musician_id: musician.id,
                event_date: eventDate,
                start_time: normalizeStartTime(startTime),
                end_time: null,
                location_address: location!.address,
                location_city: location!.city,
                location_reference: formatLocationReference(location!.lat, location!.lng),
                event_type: eventType,
                event_description: eventDescription.trim() || null,
            });
            addToast({
                title: "Solicitud enviada",
                description: "El músico recibirá tu solicitud y responderá con una cotización.",
                color: "success",
            });
            onSuccess?.();
            router.push(`/contractor/bookings/${booking.id}`);
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

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        await submitRequest();
    }

    const calendarValue = eventDate ? parseDate(eventDate) : null;
    const canSubmit = !isLoadingSlots && !slotsError;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-2xl border-l-4 border-l-primary bg-primary-50/40 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary text-xl">📅</span>
                    <p className="text-base font-bold text-primary-900">
                        Disponibilidad de {musician.name}
                    </p>
                </div>
                
                {isLoadingSlots ? (
                    <div className="flex items-center gap-2 mt-2 text-sm text-primary-700">
                        <Spinner size="sm" color="primary" />
                        Cargando horarios...
                    </div>
                ) : slotsError ? (
                    <p className="text-sm text-danger mt-2">{slotsError}</p>
                ) : slots.length === 0 ? (
                    <div className="mt-2 text-sm text-primary-800 bg-white/60 p-2.5 rounded-lg border border-primary-100">
                        ✨ <strong>Disponibilidad flexible</strong>: el músico confirmará la fecha y hora exacta al enviarte una cotización.
                    </div>
                ) : (
                    <div className="mt-2 text-sm text-primary-800 leading-relaxed bg-white/60 p-3 rounded-lg border border-primary-100">
                        {availabilitySummary.split('·').map((line, i) => (
                            <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
                                <span className="text-primary/60">•</span> {line.trim()}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatePicker
                    label="Fecha del evento"
                    variant="bordered"
                    isRequired
                    minValue={minCalendarValue}
                    value={calendarValue}
                    onChange={handleDateChange}
                    isDateUnavailable={isDateUnavailable}
                    isDisabled={isLoadingSlots}
                    description={
                        slots.length > 0
                            ? "Solo puedes elegir días en los que el músico publicó disponibilidad."
                            : "Disponibilidad abierta: el músico revisará tu fecha al cotizar."
                    }
                />
                <div className="flex flex-col gap-2">
                    {slots.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Hora del evento</label>
                            {daySlots.length === 0 ? (
                                <div className="p-3 border border-default-200 rounded-xl bg-default-50 text-sm text-default-500">
                                    {!eventDate 
                                        ? "Primero elige una fecha." 
                                        : "Este día no está dentro de los horarios publicados."}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {timeOptions.filter(o => !o.disabled).map(option => (
                                        <Button
                                            key={option.value}
                                            size="sm"
                                            variant={startTime === option.value ? "solid" : "flat"}
                                            color={startTime === option.value ? "primary" : "default"}
                                            onPress={() => setStartTime(option.value)}
                                            className="font-medium"
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-default-500">
                                Horario del día: {daySlots.map((s) => `${formatTimeLabel(s.start_time)} - ${formatTimeLabel(s.end_time)}`).join(", ")}
                            </p>
                        </div>
                    ) : (
                        <TimeInput
                            label="Hora del evento"
                            variant="bordered"
                            isRequired
                            isDisabled={!eventDate}
                            value={startTime ? new Time(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1])) : null}
                            onChange={(time) => setStartTime(time ? `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}` : "")}
                            description={
                                eventDate
                                    ? "Ingresa la hora tentativa de inicio de tu evento."
                                    : "Primero elige una fecha."
                            }
                        />
                    )}
                </div>
            </div>

            <Select
                label="Tipo de evento"
                placeholder="Selecciona el tipo"
                selectedKeys={eventType ? new Set([eventType]) : new Set()}
                onSelectionChange={(keys) => {
                    if (keys === "all") return;
                    const value = Array.from(keys)[0]?.toString();
                    setEventType(value ?? "");
                }}
                variant="bordered"
                isRequired
            >
                {EVENT_TYPES.map((type) => (
                    <SelectItem key={type}>{type}</SelectItem>
                ))}
            </Select>

            <Textarea
                label="Descripción del evento"
                placeholder="Cuéntale al músico qué necesitas: duración, invitados, repertorio..."
                value={eventDescription}
                onValueChange={setEventDescription}
                variant="bordered"
                minRows={3}
            />

            <LocationMapPickerField value={location} onChange={setLocation} />

            <Button
                type="submit"
                color="primary"
                radius="lg"
                size="lg"
                isLoading={isSubmitting}
                isDisabled={!canSubmit}
                className="font-semibold mt-1"
            >
                Enviar solicitud
            </Button>
        </form>
    );
}
