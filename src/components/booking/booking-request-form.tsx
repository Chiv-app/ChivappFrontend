"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { Icon } from "@iconify/react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Select,
  SelectItem,
  Textarea,
  addToast,
  Input,
  Card,
  CardBody,
} from "@heroui/react";
import LocationMapPickerField, {
  type MapLocation,
} from "@/components/ui/location-map-picker-field";
import { getMusicianAvailability } from "@/lib/availability";
import {
  formatTimeLabel,
  getSlotsForDate,
  validateBookingAgainstAvailability,
} from "@/lib/availability-calendar";
import { createBooking } from "@/lib/bookings";
import { apiFetch, ApiError } from "@/lib/api";
import { isEmailTakenError } from "@/lib/auth-errors";
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
  const { user, refresh } = useAuth();
  const { openLogin } = useAuthModal();
  const [showAuthSection, setShowAuthSection] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [attemptedGuestSubmit, setAttemptedGuestSubmit] = useState(false);

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

  const todayIso = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const daySlots = useMemo(
    () => (eventDate ? getSlotsForDate(slots, eventDate) : []),
    [slots, eventDate],
  );
  const availabilityMismatch = useMemo(() => {
    if (!eventDate || !startTime || isLoadingSlots || slotsError) return null;
    return validateBookingAgainstAvailability({
      eventDate,
      startTime,
      slots,
    });
  }, [eventDate, startTime, slots, isLoadingSlots, slotsError]);

  const loadAvailability = useCallback(() => {
    setIsLoadingSlots(true);
    setSlotsError(null);

    getMusicianAvailability(musician.id)
      .then((data) => {
        setSlots(data);
      })
      .catch((error) => {
        setSlots([]);
        setSlotsError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la disponibilidad del músico.",
        );
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });
  }, [musician.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAvailability();
  }, [loadAvailability]);

  async function submitRequest() {
    setAttemptedSubmit(true);

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

    if (!slotsError) {
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

    if (!user && !showAuthSection) {
      setShowAuthSection(true);
      return;
    }

    let registeredAsGuest = false;
    if (!user) {
      setAttemptedGuestSubmit(true);
      if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
        addToast({
          title: "Faltan datos de contacto",
          description: "Completa tus datos para enviar la solicitud.",
          color: "warning",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        await apiFetch("/auth/guest-register", {
          method: "POST",
          body: JSON.stringify({
            fullname: contactName.trim(),
            email: contactEmail.trim(),
            phone: contactPhone.trim(),
          }),
          headers: { "Content-Type": "application/json" },
        });
        registeredAsGuest = true;
      } catch (error: unknown) {
        setIsSubmitting(false);
        const status =
          error instanceof ApiError
            ? error.status
            : error && typeof error === "object" && "status" in error
              ? (error as { status?: number }).status
              : undefined;
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrió un error al registrar tus datos.";
        if ((status === 400 || status === 409) && isEmailTakenError(message)) {
          addToast({
            title: "Cuenta existente",
            description:
              "Este correo ya tiene una cuenta. Inicia sesión con código por correo o contraseña para continuar.",
            color: "warning",
          });
          openLogin({ redirect: `${window.location.pathname}?reservar=1` });
        } else {
          addToast({
            title: "No se pudo registrar",
            description: message,
            color: "danger",
          });
        }
        return;
      }
    } else {
      setIsSubmitting(true);
    }

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
      const targetUrl = `/contractor/bookings/${booking.id}`;
      if (registeredAsGuest) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "post_password_setup_redirect",
            targetUrl,
          );
        }
        await refresh();
      }
      addToast({
        title: "Solicitud enviada",
        description:
          "El músico recibirá tu solicitud y responderá con una cotización.",
        color: "success",
      });
      onSuccess?.();
      router.push(
        registeredAsGuest
          ? `/set-password?callbackUrl=${encodeURIComponent(targetUrl)}`
          : targetUrl,
      );
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

  const canSubmit = !isLoadingSlots && !availabilityMismatch;

  const missingStepReason = useMemo(() => {
    if (isLoadingSlots) return "Verificando horarios disponibles del músico…";
    if (availabilityMismatch) return availabilityMismatch;
    const missing: string[] = [];
    if (!eventDate) missing.push("fecha");
    if (!startTime) missing.push("hora");
    if (!eventType) missing.push("motivo");
    if (!location?.address) missing.push("ubicación en el mapa");
    if (missing.length > 0) {
      return `Completa: ${missing.join(", ")}.`;
    }
    return null;
  }, [isLoadingSlots, availabilityMismatch, eventDate, startTime, eventType, location]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <style>
        {".hide-scroll::-webkit-scrollbar { display: none !important; }"}
      </style>
      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* 1. Fecha */}
        <div className="flex flex-col justify-center">
          <Input
            type="date"
            label="Fecha"
            variant="bordered"
            isRequired
            min={todayIso}
            value={eventDate}
            onValueChange={(val) => {
              setEventDate(val);
            }}
            isDisabled={isLoadingSlots}
            isInvalid={
              Boolean(availabilityMismatch) || (attemptedSubmit && !eventDate)
            }
            errorMessage={
              attemptedSubmit && !eventDate ? "Selecciona la fecha" : undefined
            }
            classNames={{
              label: "font-semibold text-xs",
              input: "font-semibold text-base sm:text-sm",
            }}
          />
        </div>

        {/* 2. Hora */}
        <div className="flex flex-col justify-center">
          <Input
            type="time"
            label="Hora"
            variant="bordered"
            isRequired
            value={startTime}
            onValueChange={(val) => {
              setStartTime(val);
            }}
            isDisabled={isLoadingSlots}
            isInvalid={
              Boolean(availabilityMismatch) || (attemptedSubmit && !startTime)
            }
            errorMessage={
              attemptedSubmit && !startTime ? "Selecciona la hora" : undefined
            }
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
            classNames={{
              label: "font-semibold text-xs",
              input: "font-semibold text-base sm:text-sm",
            }}
          />
        </div>

        {/* 3. Tipo de evento */}
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
          isInvalid={attemptedSubmit && !eventType}
          errorMessage={
            attemptedSubmit && !eventType ? "Elige el motivo" : undefined
          }
          classNames={{
            label: "font-semibold text-xs",
            value: "font-semibold text-base sm:text-sm",
          }}
        >
          {EVENT_TYPES.map((type) => (
            <SelectItem key={type}>{type}</SelectItem>
          ))}
        </Select>
      </div>

      {(slotsError || availabilityMismatch) && (
        <div
          role="alert"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-xs font-medium text-warning-700 dark:text-warning-400"
        >
          <span>
            {slotsError
              ? `${slotsError} Puedes continuar y el músico confirmará su disponibilidad.`
              : availabilityMismatch}
          </span>
          {slotsError && (
            <Button
              size="sm"
              variant="flat"
              color="warning"
              onPress={loadAvailability}
              className="font-semibold"
            >
              Reintentar
            </Button>
          )}
        </div>
      )}

      <LocationMapPickerField value={location} onChange={setLocation} />
      {attemptedSubmit && !location?.address && (
        <p role="alert" className="text-xs text-danger -mt-2">
          Busca la dirección o mueve el pin en el mapa para confirmar la ubicación.
        </p>
      )}

      <Textarea
        label="Detalles (opcional)"
        placeholder="Ej: Es sorpresa, repertorio especial, indicaciones de llegada..."
        value={eventDescription}
        onValueChange={setEventDescription}
        variant="bordered"
        minRows={2}
        classNames={{
          label: "font-semibold text-xs",
          input: "font-medium text-base sm:text-sm",
        }}
      />

      {/* Footer / Continue / Auth Section */}
      {!user && !showAuthSection && (
        <div className="pt-2 flex flex-col gap-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary-text p-1.5 rounded-full shrink-0">
                <Icon icon="lucide:shield-check" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-foreground font-bold leading-tight">
                  Pago protegido
                </p>
                <p className="text-xs text-default-500 leading-tight mt-0.5">
                  por <span className="font-bold text-primary-text">Mercado Pago</span>
                </p>
              </div>
            </div>
            <Button
              color="primary"
              radius="lg"
              size="md"
              onPress={() => {
                setAttemptedSubmit(true);
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
                if (!canSubmit) return;
                setShowAuthSection(true);
              }}
              isDisabled={!canSubmit}
              className="w-full md:w-auto font-bold shadow-md min-h-11"
              endContent={<Icon icon="lucide:arrow-right" className="w-4 h-4" />}
            >
              Continuar
            </Button>
          </div>
          {missingStepReason && (
            <p className="text-xs text-default-500 text-right">
              {missingStepReason}
            </p>
          )}
        </div>
      )}

      {!user && showAuthSection && (
        <div className="flex flex-col gap-3 mt-2 border-t border-divider pt-4 animate-appearance-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:user-circle" className="text-primary w-5 h-5" />
              <h3 className="text-sm font-bold m-0">
                Tus datos de contacto
              </h3>
            </div>
            <Button
              as="a"
              href={
                (process.env.NEXT_PUBLIC_API_URL || "/api/v1") +
                "/auth/oauth/google/start?intent=login"
              }
              variant="flat"
              radius="md"
              size="sm"
              className="bg-default-100 text-foreground font-bold shadow-sm min-h-10"
              startContent={<Icon icon="logos:google-icon" width={14} />}
            >
              Usar Google
            </Button>
          </div>

          <Card className="bg-default-50/50 border border-default-200 shadow-none overflow-visible">
            <CardBody className="p-4 flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  label="Nombre completo"
                  placeholder="Ej. Juan Pérez"
                  autoComplete="name"
                  variant="bordered"
                  isRequired
                  value={contactName}
                  onValueChange={setContactName}
                  isInvalid={attemptedGuestSubmit && !contactName.trim()}
                  errorMessage={
                    attemptedGuestSubmit && !contactName.trim()
                      ? "Ingresa tu nombre"
                      : undefined
                  }
                  classNames={{
                    label: "font-semibold text-xs",
                    input: "font-semibold text-base sm:text-sm",
                  }}
                />
                <Input
                  label="Celular"
                  placeholder="+51 999 999 999"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  variant="bordered"
                  isRequired
                  value={contactPhone}
                  onValueChange={setContactPhone}
                  isInvalid={attemptedGuestSubmit && !contactPhone.trim()}
                  errorMessage={
                    attemptedGuestSubmit && !contactPhone.trim()
                      ? "Ingresa tu celular"
                      : undefined
                  }
                  classNames={{
                    label: "font-semibold text-xs",
                    input: "font-semibold text-base sm:text-sm",
                  }}
                />
                <Input
                  label="Correo"
                  placeholder="correo@ejemplo.com"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  variant="bordered"
                  isRequired
                  value={contactEmail}
                  onValueChange={setContactEmail}
                  isInvalid={attemptedGuestSubmit && !contactEmail.trim()}
                  errorMessage={
                    attemptedGuestSubmit && !contactEmail.trim()
                      ? "Ingresa tu correo"
                      : undefined
                  }
                  classNames={{
                    label: "font-semibold text-xs",
                    input: "font-semibold text-base sm:text-sm",
                  }}
                />
              </div>

              <div className="pt-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-xs text-default-500 leading-snug m-0">
                  Crearemos tu cuenta automáticamente sin contraseñas. Al continuar aceptas los{" "}
                  <Link
                    href="/legal/terminos"
                    target="_blank"
                    className="text-primary underline font-semibold"
                  >
                    Términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/legal/privacidad"
                    target="_blank"
                    className="text-primary underline font-semibold"
                  >
                    Política de privacidad
                  </Link>
                  .
                </p>
                <Button
                  type="submit"
                  color="primary"
                  radius="lg"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto font-bold shadow-md shrink-0 min-h-11"
                  endContent={<Icon icon="lucide:send" className="w-4 h-4" />}
                >
                  Pedir cotización
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {user && (
        <div className="pt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary-text p-1.5 rounded-full shrink-0">
                <Icon icon="lucide:shield-check" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-foreground font-bold leading-tight">
                  Pago protegido
                </p>
                <p className="text-xs text-default-500 leading-tight mt-0.5">
                  por <span className="font-bold text-primary-text">Mercado Pago</span>
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
              className="font-bold shadow-md min-h-11"
            >
              Pedir cotización
            </Button>
          </div>
          {missingStepReason && (
            <p className="text-xs text-default-500 text-right">
              {missingStepReason}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
