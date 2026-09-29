"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Icon } from "@iconify/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Select,
  SelectItem,
  Textarea,
  addToast,
  TimeInput,
  Input,
  Card,
  CardBody,
  Divider,
} from "@heroui/react";
import {
  getLocalTimeZone,
  parseDate,
  today,
  type DateValue,
  Time,
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
  const { user } = useAuth();
  const [showAuthSection, setShowAuthSection] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

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

  const timeValue = startTime
    ? new Time(
        parseInt(startTime.split(":")[0]),
        parseInt(startTime.split(":")[1]),
      )
    : null;

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

    
    if (!user && !showAuthSection) {
      setShowAuthSection(true);
      return;
    }

    if (!user) {
      if (!contactName || !contactPhone || !contactEmail) {
         addToast({ title: "Faltan datos de contacto", description: "Completa tus datos para enviar la cotización.", color: "warning" });
         return;
      }
      // TODO: Here we should call a backend endpoint for silent registration / guest booking
      addToast({ title: "Modo invitado", description: "Enviaremos la cotización a tu correo (Simulación).", color: "success" });
      onSuccess?.();
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
      <style>
        {".hide-scroll::-webkit-scrollbar { display: none !important; }"}
      </style>
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

        {/* 2. Hora (TimeInput) */}
        <div className="flex flex-col justify-center">
          <TimeInput
            label="Hora"
            variant="bordered"
            isRequired
            hourCycle={12}
            value={timeValue}
            description={
              daySlots.length > 0
                ? `Disp: ${daySlots
                    .map(
                      (s) =>
                        `${formatTimeLabel(s.start_time)} - ${formatTimeLabel(s.end_time)}`,
                    )
                    .join(", ")}`
                : undefined
            }
            onChange={(val) => {
              if (val) {
                setStartTime(
                  `${val.hour.toString().padStart(2, "0")}:${val.minute.toString().padStart(2, "0")}`,
                );
              } else {
                setStartTime("");
              }
            }}
            isDisabled={isLoadingSlots}
            classNames={{
              label: "uppercase font-bold tracking-wider text-[0.55rem]",
              input: "font-bold text-xs",
            }}
          />
        </div>

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

      {/* Footer / Continue / Auth Section */}
      {(!user && !showAuthSection) && (
        <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-4">
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
            color="primary"
            radius="lg"
            size="md"
            onPress={() => setShowAuthSection(true)}
            isDisabled={!canSubmit}
            className="w-full md:w-auto font-bold shadow-md"
            endContent={<Icon icon="lucide:arrow-right" className="w-4 h-4" />}
          >
            Continuar
          </Button>
        </div>
      )}

      {(!user && showAuthSection) && (
        <div className="flex flex-col gap-3 mt-2 border-t border-divider pt-4 animate-appearance-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:user-circle" className="text-primary w-5 h-5" />
              <h3 className="text-sm font-bold m-0 uppercase tracking-wide">Tus Datos de Contacto</h3>
            </div>
            <Button
              as="a"
              href={(process.env.NEXT_PUBLIC_API_URL || "/api/v1") + "/auth/oauth/google/start?intent=login"}
              variant="flat"
              radius="md"
              size="sm"
              className="bg-default-100 text-foreground font-bold shadow-sm"
              startContent={<Icon icon="logos:google-icon" width={14} />}
            >
              Usar Google
            </Button>
          </div>

          <Card className="bg-default-50/50 border border-default-200 shadow-none overflow-visible">
            <CardBody className="p-4 flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  label="Nombre completo"
                  placeholder="Ej. Juan Pérez"
                  variant="bordered"
                  value={contactName}
                  onValueChange={setContactName}
                  classNames={{ label: "uppercase font-bold tracking-wider text-[0.55rem]", input: "font-bold text-xs" }}
                />
                <Input
                  label="Celular"
                  placeholder="+51 999 999 999"
                  type="tel"
                  variant="bordered"
                  value={contactPhone}
                  onValueChange={setContactPhone}
                  classNames={{ label: "uppercase font-bold tracking-wider text-[0.55rem]", input: "font-bold text-xs" }}
                />
                <Input
                  label="Correo"
                  placeholder="correo@ejemplo.com"
                  type="email"
                  variant="bordered"
                  value={contactEmail}
                  onValueChange={setContactEmail}
                  classNames={{ label: "uppercase font-bold tracking-wider text-[0.55rem]", input: "font-bold text-xs" }}
                />
              </div>

              <div className="pt-1 flex justify-end items-center gap-4">
                <p className="text-[10px] text-default-500 text-right leading-tight m-0 hidden md:block">
                  Crearemos tu cuenta automáticamente.<br /><b>Sin contraseñas.</b>
                </p>
                <Button
                  type="submit"
                  color="primary"
                  radius="lg"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full md:w-auto font-bold shadow-md"
                  endContent={<Icon icon="lucide:send" className="w-4 h-4" />}
                >
                  Solicitar Reserva
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {user && (
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
      )}
    </form>
  );
}
