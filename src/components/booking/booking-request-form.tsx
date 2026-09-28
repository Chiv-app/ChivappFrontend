"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Select,
  SelectItem,
  Textarea,
  addToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import {
  getLocalTimeZone,
  parseDate,
  today,
  type DateValue,
} from "@internationalized/date";
import LocationMapPickerField, {
  type MapLocation,
} from "@/components/ui/location-map-picker-field";
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
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const minCalendarValue = useMemo(() => today(getLocalTimeZone()), []);

  let currentH = "07";
  let currentM = "00";
  let currentP = "PM";
  if (startTime) {
    const [hStr, mStr] = startTime.split(":");
    let hInt = parseInt(hStr, 10);
    currentP = hInt >= 12 ? "PM" : "AM";
    if (hInt === 0) hInt = 12;
    if (hInt > 12) hInt -= 12;
    currentH = hInt.toString().padStart(2, "0");
    currentM = mStr;
  }

  const setTimePart = (part: "h" | "m" | "p", value: string) => {
    let newH = currentH;
    let newM = currentM;
    let newP = currentP;
    if (part === "h") newH = value;
    if (part === "m") newM = value;
    if (part === "p") newP = value;

    let hours24 = parseInt(newH, 10);
    if (newP === "PM" && hours24 < 12) hours24 += 12;
    if (newP === "AM" && hours24 === 12) hours24 = 0;

    setStartTime(`${hours24.toString().padStart(2, "0")}:${newM}`);
  };

  const availableDays = useMemo(() => getAvailableDaySet(slots), [slots]);
  const daySlots = useMemo(
    () => (eventDate ? getSlotsForDate(slots, eventDate) : []),
    [slots, eventDate],
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
        location_reference: formatLocationReference(
          location!.lat,
          location!.lng,
        ),
        event_type: eventType,
        event_description: eventDescription.trim() || null,
      });
      addToast({
        title: "Solicitud enviada",
        description:
          "El músico recibirá tu solicitud y responderá con una cotización.",
        color: "success",
      });
      onSuccess?.();
      router.push(`/contractor/bookings/${booking.id}`);
    } catch (error) {
      addToast({
        title: "No se pudo enviar",
        description:
          error instanceof Error ? error.message : "Intenta de nuevo.",
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
      <style>{".hide-scroll::-webkit-scrollbar { display: none !important; }"}</style>
      {/* Ultra-dense Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* 1. Fecha */}
        <div className="flex flex-col justify-center">
          <DatePicker
            label="Fecha"
            variant="bordered"
            isRequired
            minValue={minCalendarValue}
            value={calendarValue}
            onChange={handleDateChange}
            
            isDisabled={isLoadingSlots}
            classNames={{
              label: "uppercase font-bold tracking-wider text-[0.55rem]",
              input: "font-bold text-xs",
            }}
          />
        </div>

        {/* 2. Hora (Popover) */}
        <Popover
          placement="bottom"
          isOpen={isTimePickerOpen}
          onOpenChange={setIsTimePickerOpen}
        >
          <PopoverTrigger>
            <div className="relative cursor-pointer h-[52px] border-2 border-default-200 rounded-xl px-2 py-1 flex flex-col justify-center hover:bg-default-50 transition-colors">
              <label className="text-[0.55rem] text-default-500 font-bold uppercase tracking-wider pointer-events-none">
                Hora <span className="text-danger">*</span>
              </label>
              <div className="flex items-center justify-between mt-1 pointer-events-none">
                <span className="text-xs text-foreground font-bold tracking-tight">
                  {startTime
                    ? `${currentH}:${currentM} ${currentP}`
                    : "Seleccionar"}
                </span>
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-4">
            <div className="flex flex-col w-full">
              <div className="flex gap-2 w-full h-[180px] bg-default-50 rounded-xl p-2 border border-default-200">
                {/* Column 1: AM/PM */}
                <div style={{ scrollbarWidth: "none", msOverflowStyle: "none" }} className="hide-scroll flex-1 flex flex-col gap-1 overflow-y-auto scroll-smooth snap-y snap-mandatory border-r border-default-200 pr-2">
                  <div className="h-[calc(50%-1.25rem)] shrink-0 pointer-events-none"></div>
                  {["AM", "PM"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTimePart("p", p)}
                      className={`h-10 w-full shrink-0 snap-center rounded-lg text-sm font-bold transition-all ${currentP === p ? "bg-primary text-primary-foreground shadow-md scale-105" : "text-default-500 hover:bg-default-200"}`}
                    >
                      {p}
                    </button>
                  ))}
                  <div className="h-[calc(50%-1.25rem)] shrink-0 pointer-events-none"></div>
                </div>

                {/* Column 2: Hour */}
                <div style={{ scrollbarWidth: "none", msOverflowStyle: "none" }} className="hide-scroll flex-1 flex flex-col gap-1 overflow-y-auto scroll-smooth snap-y snap-mandatory border-r border-default-200 px-1">
                  <div className="h-[calc(50%-1.25rem)] shrink-0 pointer-events-none"></div>
                  {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTimePart("h", h)}
                      className={`h-10 w-full shrink-0 snap-center rounded-lg text-sm font-bold transition-all ${currentH === h ? "bg-primary text-primary-foreground shadow-md scale-105" : "text-default-500 hover:bg-default-200"}`}
                    >
                      {h}
                    </button>
                  ))}
                  <div className="h-[calc(50%-1.25rem)] shrink-0 pointer-events-none"></div>
                </div>

                {/* Column 3: Minute */}
                <div style={{ scrollbarWidth: "none", msOverflowStyle: "none" }} className="hide-scroll flex-1 flex flex-col gap-1 overflow-y-auto scroll-smooth snap-y snap-mandatory pl-2">
                  <div className="h-[calc(50%-1.25rem)] shrink-0 pointer-events-none"></div>
                  {["00", "15", "30", "45"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTimePart("m", m)}
                      className={`h-10 w-full shrink-0 snap-center rounded-lg text-sm font-bold transition-all ${currentM === m ? "bg-primary text-primary-foreground shadow-md scale-105" : "text-default-500 hover:bg-default-200"}`}
                    >
                      {m}
                    </button>
                  ))}
                  <div className="h-[calc(50%-1.25rem)] shrink-0 pointer-events-none"></div>
                </div>
              </div>
              {daySlots.length > 0 && (
                <p className="text-[0.65rem] text-default-500 mt-3 text-center bg-default-100 p-1.5 rounded-lg">
                  Disponibilidad:{" "}
                  <span className="font-bold text-foreground">
                    {daySlots
                      .map(
                        (s) =>
                          `${formatTimeLabel(s.start_time)} - ${formatTimeLabel(s.end_time)}`,
                      )
                      .join(", ")}
                  </span>
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* 3. Tipo de Evento */}
        <Select
          label="Motivo"
          placeholder="Elegir"
          selectedKeys={eventType ? new Set([eventType]) : new Set()}
          onSelectionChange={(keys) => {
            if (keys === "all") return;
            const value = Array.from(keys)[0]?.toString();
            setEventType(value ?? "");
          }}
          variant="bordered"
          isRequired
          classNames={{
            label: "uppercase font-bold tracking-wider text-[0.55rem]",
            value: "font-bold text-xs",
          }}
        >
          {EVENT_TYPES.map((type) => (
            <SelectItem key={type}>{type}</SelectItem>
          ))}
        </Select>
      </div>

      <LocationMapPickerField value={location} onChange={setLocation} />

      <Textarea
        label="Detalles (Opcional)"
        placeholder="Ej: Es sorpresa..."
        value={eventDescription}
        onValueChange={setEventDescription}
        variant="bordered"
        minRows={2}
        classNames={{
          label: "uppercase font-bold tracking-wider text-[0.55rem]",
          input: "font-medium text-xs",
        }}
      />

      {/* Footer con Trust Badge (Mercado Pago) */}
      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full shrink-0">
            <Icon icon="lucide:shield-check" className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <p className="text-[0.65rem] text-foreground font-bold leading-tight">
              Pago Protegido
            </p>
            <p className="text-[0.6rem] text-default-500 leading-tight mt-0.5">
              por <span className="font-bold text-blue-500">mercado</span>
              <span className="font-bold text-blue-900 dark:text-blue-400">
                pago
              </span>
            </p>
          </div>
        </div>
        <Button
          type="submit"
          color="primary"
          radius="lg"
          size="md"
          isLoading={isSubmitting}
          isDisabled={!canSubmit}
          className="font-bold shadow-md"
        >
          Solicitar Reserva
        </Button>
      </div>
    </form>
  );
}
