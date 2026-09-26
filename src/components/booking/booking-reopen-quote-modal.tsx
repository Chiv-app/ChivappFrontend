"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    Button,
    DatePicker,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Textarea,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    getLocalTimeZone,
    parseDate,
    today,
    type DateValue,
} from "@internationalized/date";
import { getMusicianAvailability } from "@/lib/availability";
import {
    formatTimeLabel,
    getAvailableDaySet,
    getSlotsForDate,
    validateBookingAgainstAvailability,
} from "@/lib/availability-calendar";
import { reopenBookingQuote } from "@/lib/bookings";
import type { AvailabilityOut, BookingOut } from "@/types/api";

type Props = {
    booking: BookingOut;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: (booking: BookingOut) => void;
};

export default function BookingReopenQuoteModal({
    booking,
    isOpen,
    onOpenChange,
    onUpdated,
}: Props) {
    const [eventDate, setEventDate] = useState(booking.event_date);
    const [startTime, setStartTime] = useState(booking.start_time.slice(0, 5));
    const [endTime, setEndTime] = useState(
        booking.end_time ? booking.end_time.slice(0, 5) : "",
    );
    const [eventType, setEventType] = useState(booking.event_type);
    const [locationAddress, setLocationAddress] = useState(booking.location_address);
    const [locationCity, setLocationCity] = useState(booking.location_city ?? "");
    const [locationReference, setLocationReference] = useState(
        booking.location_reference ?? "",
    );
    const [eventDescription, setEventDescription] = useState(
        booking.event_description ?? "",
    );
    const [isSaving, setIsSaving] = useState(false);
    const [slots, setSlots] = useState<AvailabilityOut[]>([]);
    const minCalendarValue = useMemo(() => today(getLocalTimeZone()), []);
    const availableDays = useMemo(() => getAvailableDaySet(slots), [slots]);
    const daySlots = useMemo(
        () => (eventDate ? getSlotsForDate(slots, eventDate) : []),
        [slots, eventDate],
    );

    useEffect(() => {
        if (!isOpen) return;
        setEventDate(booking.event_date);
        setStartTime(booking.start_time.slice(0, 5));
        setEndTime(booking.end_time ? booking.end_time.slice(0, 5) : "");
        setEventType(booking.event_type);
        setLocationAddress(booking.location_address);
        setLocationCity(booking.location_city ?? "");
        setLocationReference(booking.location_reference ?? "");
        setEventDescription(booking.event_description ?? "");
        setIsSaving(false);

        let cancelled = false;
        getMusicianAvailability(booking.musician_id)
            .then((data) => {
                if (!cancelled) setSlots(data);
            })
            .catch(() => {
                if (!cancelled) setSlots([]);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, booking]);

    function isDateUnavailable(date: DateValue): boolean {
        if (availableDays.size === 0) return false;
        const jsDay = date.toDate(getLocalTimeZone()).getDay();
        return !availableDays.has(jsDay);
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!eventDate || !startTime || !eventType.trim() || !locationAddress.trim()) {
            addToast({
                title: "Datos incompletos",
                description: "Fecha, hora, tipo y ubicación son obligatorios.",
                color: "warning",
            });
            return;
        }

        if (slots.length > 0) {
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
        }

        setIsSaving(true);
        try {
            const updated = await reopenBookingQuote(booking.id, {
                event_date: eventDate,
                start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
                end_time: endTime
                    ? endTime.length === 5
                        ? `${endTime}:00`
                        : endTime
                    : null,
                event_type: eventType.trim(),
                location_address: locationAddress.trim(),
                location_city: locationCity.trim() || null,
                location_reference: locationReference.trim() || null,
                event_description: eventDescription.trim() || null,
                requested_repertoire: booking.requested_repertoire ?? [],
            });
            onUpdated(updated);
            onOpenChange(false);
            addToast({
                title: "Solicitud actualizada",
                description:
                    "La reserva volvió a cotización. El músico debe enviar una nueva propuesta.",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo actualizar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="2xl"
            scrollBehavior="inside"
            placement="center"
            isDismissable={!isSaving}
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-2xl",
                wrapper: "items-end sm:items-center",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <form onSubmit={handleSubmit} className="contents">
                        <ModalHeader className="flex flex-col items-start gap-1">
                            <span className="text-xl font-bold">Editar solicitud</span>
                            <span className="text-sm font-normal text-default-500">
                                Al guardar, se cancela el contrato actual y la reserva
                                vuelve a cotización.
                            </span>
                        </ModalHeader>
                        <ModalBody className="gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <DatePicker
                                    label="Fecha del evento"
                                    variant="bordered"
                                    isRequired
                                    isDisabled={isSaving}
                                    minValue={minCalendarValue}
                                    value={eventDate ? parseDate(eventDate) : null}
                                    onChange={(value) =>
                                        setEventDate(value ? value.toString() : "")
                                    }
                                    isDateUnavailable={isDateUnavailable}
                                    description={
                                        daySlots.length > 0
                                            ? `Horario: ${daySlots
                                                  .map(
                                                      (s) =>
                                                          `${formatTimeLabel(s.start_time)}–${formatTimeLabel(s.end_time)}`,
                                                  )
                                                  .join(", ")}`
                                            : undefined
                                    }
                                />
                                <Input
                                    label="Tipo de evento"
                                    value={eventType}
                                    onValueChange={setEventType}
                                    variant="bordered"
                                    isRequired
                                    isDisabled={isSaving}
                                />
                                <Input
                                    type="time"
                                    label="Hora inicio"
                                    value={startTime}
                                    onValueChange={setStartTime}
                                    variant="bordered"
                                    isRequired
                                    isDisabled={isSaving}
                                />
                                <Input
                                    type="time"
                                    label="Hora fin (opcional)"
                                    value={endTime}
                                    onValueChange={setEndTime}
                                    variant="bordered"
                                    isDisabled={isSaving}
                                />
                            </div>
                            <Input
                                label="Dirección"
                                value={locationAddress}
                                onValueChange={setLocationAddress}
                                variant="bordered"
                                isRequired
                                isDisabled={isSaving}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Ciudad"
                                    value={locationCity}
                                    onValueChange={setLocationCity}
                                    variant="bordered"
                                    isDisabled={isSaving}
                                />
                                <Input
                                    label="Referencia"
                                    value={locationReference}
                                    onValueChange={setLocationReference}
                                    variant="bordered"
                                    isDisabled={isSaving}
                                />
                            </div>
                            <Textarea
                                label="Descripción del evento"
                                value={eventDescription}
                                onValueChange={setEventDescription}
                                variant="bordered"
                                minRows={3}
                                isDisabled={isSaving}
                            />
                            <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-default-700">
                                El músico deberá cotizar de nuevo con estos datos.
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="light"
                                radius="lg"
                                onPress={onClose}
                                isDisabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                color="warning"
                                radius="lg"
                                className="font-semibold"
                                isLoading={isSaving}
                                startContent={
                                    isSaving ? undefined : (
                                        <Icon
                                            icon="material-symbols:restart-alt"
                                            width={18}
                                        />
                                    )
                                }
                            >
                                Guardar y volver a cotización
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </ModalContent>
        </Modal>
    );
}

