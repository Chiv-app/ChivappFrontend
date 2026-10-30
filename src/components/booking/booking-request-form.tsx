"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
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
import { PasswordInput } from "@/components/auth/password-input";
import LocationMapPickerField, {
  type MapLocation,
} from "@/components/ui/location-map-picker-field";
import { getMusicianAvailability } from "@/lib/availability";
import {
  formatTimeLabel,
  getSlotsForDate,
  validateBookingAgainstAvailability,
} from "@/lib/availability-calendar";
import { loginStepOne } from "@/lib/auth";
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

type BookingDraft = {
  eventDate?: string;
  startTime?: string;
  eventType?: string;
  eventDescription?: string;
  location?: MapLocation | null;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

function readBookingDraft(storageKey: string): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}

export default function BookingRequestForm({ musician, onSuccess }: Props) {
  const { user, login, loginWithOtp, logout, refresh } = useAuth();
  const draftStorageKey = `chivapp:pending_booking_request:${musician.id}`;
  const [initialDraft] = useState<BookingDraft | null>(() =>
    readBookingDraft(draftStorageKey),
  );
  const [showAuthSection, setShowAuthSection] = useState(false);
  const [authStep, setAuthStep] = useState<"contact" | "otp" | "password">(
    "contact",
  );
  const [contactName, setContactName] = useState(
    () => initialDraft?.contactName ?? "",
  );
  const [contactPhone, setContactPhone] = useState(
    () => initialDraft?.contactPhone ?? "",
  );
  const [contactEmail, setContactEmail] = useState(
    () => initialDraft?.contactEmail ?? "",
  );
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [attemptedGuestSubmit, setAttemptedGuestSubmit] = useState(false);

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slots, setSlots] = useState<AvailabilityOut[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(
    () => initialDraft?.eventDate ?? "",
  );
  const [startTime, setStartTime] = useState(
    () => initialDraft?.startTime ?? "",
  );
  const [eventType, setEventType] = useState(
    () => initialDraft?.eventType ?? "",
  );
  const [eventDescription, setEventDescription] = useState(
    () => initialDraft?.eventDescription ?? "",
  );
  const [location, setLocation] = useState<MapLocation | null>(
    () => initialDraft?.location ?? null,
  );

  const persistDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          eventDate,
          startTime,
          eventType,
          eventDescription,
          location,
          contactName,
          contactPhone,
          contactEmail,
        }),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [
    draftStorageKey,
    eventDate,
    startTime,
    eventType,
    eventDescription,
    location,
    contactName,
    contactPhone,
    contactEmail,
  ]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(draftStorageKey);
    } catch {
      // Ignore storage errors
    }
  }, [draftStorageKey]);

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
    void Promise.resolve().then(() => loadAvailability());
  }, [loadAvailability]);

  async function handleResendOtp() {
    if (!contactEmail.trim()) return;
    setIsResendingOtp(true);
    try {
      const res = await loginStepOne(contactEmail.trim());
      if (res.status === "otp_sent") {
        addToast({
          title: "Código reenviado",
          description: `Enviamos un nuevo código de 6 dígitos a ${contactEmail.trim()}.`,
          color: "success",
        });
      }
    } catch (error) {
      addToast({
        title: "No se pudo reenviar el código",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente en unos segundos.",
        color: "danger",
      });
    } finally {
      setIsResendingOtp(false);
    }
  }

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
      persistDraft();
      setShowAuthSection(true);
      return;
    }

    if (user && user.role !== "contractor") {
      addToast({
        title: "Cuenta no habilitada para reservar",
        description:
          "Solo las cuentas de cliente/contratista pueden enviar solicitudes de reserva. Usa la opción para continuar como cliente.",
        color: "warning",
      });
      return;
    }

    let registeredAsGuest = false;
    if (!user) {
      setAttemptedGuestSubmit(true);
      if (!contactEmail.trim()) {
        addToast({
          title: "Falta tu correo",
          description: "Ingresa tu correo electrónico para continuar.",
          color: "warning",
        });
        return;
      }

      if (authStep === "otp") {
        if (otpCode.trim().length !== 6) {
          addToast({
            title: "Código incompleto",
            description: "Ingresa el código de 6 dígitos enviado a tu correo.",
            color: "warning",
          });
          return;
        }
        setIsSubmitting(true);
        try {
          const loggedIn = await loginWithOtp(contactEmail.trim(), otpCode.trim());
          if (loggedIn.role !== "contractor") {
            setIsSubmitting(false);
            addToast({
              title: "Cuenta de músico o administrador",
              description:
                "Este correo está registrado como músico o administrador. Para reservar como cliente, ingresa otro correo.",
              color: "warning",
            });
            await logout();
            setAuthStep("contact");
            setOtpCode("");
            return;
          }
        } catch (error) {
          setIsSubmitting(false);
          addToast({
            title: "Código inválido o expirado",
            description:
              error instanceof Error
                ? error.message
                : "Verifica el código enviado a tu correo.",
            color: "danger",
          });
          return;
        }
      } else if (authStep === "password") {
        if (!password) {
          addToast({
            title: "Ingresa tu contraseña",
            description: "Escribe la contraseña de tu cuenta para enviar la solicitud.",
            color: "warning",
          });
          return;
        }
        setIsSubmitting(true);
        try {
          const loggedIn = await login({
            email: contactEmail.trim(),
            password,
          });
          if (loggedIn.role !== "contractor") {
            setIsSubmitting(false);
            addToast({
              title: "Cuenta de músico o administrador",
              description:
                "Este correo está registrado como músico o administrador. Para reservar como cliente, ingresa otro correo.",
              color: "warning",
            });
            await logout();
            setAuthStep("contact");
            setPassword("");
            return;
          }
        } catch (error) {
          setIsSubmitting(false);
          addToast({
            title: "No se pudo iniciar sesión",
            description:
              error instanceof Error
                ? error.message
                : "Verifica tu contraseña e intenta nuevamente.",
            color: "danger",
          });
          return;
        }
      } else {
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
            try {
              const stepOne = await loginStepOne(contactEmail.trim());
              setIsSubmitting(false);
              if (stepOne.status === "otp_sent") {
                setAuthStep("otp");
                setOtpCode("");
                addToast({
                  title: "Te enviamos un código de verificación",
                  description: `Tu correo ${contactEmail.trim()} ya tiene cuenta. Ingresa el código de 6 dígitos que enviamos a tu correo para enviar tu reserva.`,
                  color: "primary",
                });
                return;
              }
              if (stepOne.status === "requires_password") {
                setAuthStep("password");
                setPassword("");
                addToast({
                  title: "Cuenta existente",
                  description:
                    "Ingresa tu contraseña para confirmar y enviar tu solicitud de reserva.",
                  color: "primary",
                });
                return;
              }
            } catch (stepError) {
              setIsSubmitting(false);
              addToast({
                title: "Cuenta existente",
                description:
                  stepError instanceof Error
                    ? stepError.message
                    : "Este correo ya tiene una cuenta registrada.",
                color: "warning",
              });
              return;
            }
          }
          setIsSubmitting(false);
          addToast({
            title: "No se pudo registrar",
            description: message,
            color: "danger",
          });
          return;
        }
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
      clearDraft();
      if (registeredAsGuest) {
        await refresh();
      }
      addToast({
        title: "Solicitud enviada",
        description:
          "El músico recibirá tu solicitud y responderá con una cotización.",
        color: "success",
      });
      onSuccess?.();
      router.push(targetUrl);
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
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-xs font-medium text-warning-text"
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
                persistDraft();
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
              onClick={persistDraft}
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
                  isRequired={authStep === "contact"}
                  value={contactName}
                  onValueChange={setContactName}
                  isInvalid={
                    authStep === "contact" &&
                    attemptedGuestSubmit &&
                    !contactName.trim()
                  }
                  errorMessage={
                    authStep === "contact" &&
                    attemptedGuestSubmit &&
                    !contactName.trim()
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
                  isRequired={authStep === "contact"}
                  value={contactPhone}
                  onValueChange={setContactPhone}
                  isInvalid={
                    authStep === "contact" &&
                    attemptedGuestSubmit &&
                    !contactPhone.trim()
                  }
                  errorMessage={
                    authStep === "contact" &&
                    attemptedGuestSubmit &&
                    !contactPhone.trim()
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
                  onValueChange={(val) => {
                    setContactEmail(val);
                    if (authStep !== "contact") {
                      setAuthStep("contact");
                      setOtpCode("");
                      setPassword("");
                    }
                  }}
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

              {authStep === "otp" && (
                <div className="flex flex-col gap-2.5 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 animate-appearance-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground m-0">
                      Este correo ya tiene una cuenta. Ingresa el código de 6 dígitos que enviamos a{" "}
                      <span className="font-bold">{contactEmail.trim()}</span> para enviar tu solicitud de reserva:
                    </p>
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isLoading={isResendingOtp}
                      onPress={handleResendOtp}
                      className="font-bold h-7 px-2 text-xs"
                    >
                      Reenviar código
                    </Button>
                  </div>
                  <Input
                    label="Código de verificación (6 dígitos)"
                    placeholder="000000"
                    variant="bordered"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onValueChange={(val) =>
                      setOtpCode(val.replace(/\D/g, "").slice(0, 6))
                    }
                    classNames={{
                      label: "font-semibold text-xs",
                      input: "font-bold tracking-widest text-base",
                    }}
                  />
                </div>
              )}

              {authStep === "password" && (
                <div className="flex flex-col gap-2.5 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 animate-appearance-in">
                  <p className="text-xs font-semibold text-foreground m-0">
                    Este correo ya tiene una cuenta con contraseña. Ingrésala para confirmar y enviar tu solicitud de reserva:
                  </p>
                  <PasswordInput
                    label="Contraseña de tu cuenta"
                    placeholder="Ingresa tu contraseña"
                    variant="bordered"
                    value={password}
                    onValueChange={setPassword}
                    autoComplete="current-password"
                    classNames={{
                      label: "font-semibold text-xs",
                      input: "font-semibold text-base sm:text-sm",
                    }}
                  />
                </div>
              )}

              <div className="pt-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-xs text-default-500 leading-snug m-0">
                  {authStep === "contact"
                    ? "Crearemos tu cuenta automáticamente sin contraseñas. "
                    : "Al confirmar se enviará tu solicitud de reserva inmediatamente. "}
                  Al continuar aceptas los{" "}
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
                  {authStep === "otp"
                    ? "Verificar y pedir cotización"
                    : authStep === "password"
                      ? "Ingresar y pedir cotización"
                      : "Pedir cotización"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {user && user.role !== "contractor" && (
        <div
          role="alert"
          className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-3.5 text-xs"
        >
          <div className="flex flex-col gap-0.5">
            <p className="font-bold text-foreground m-0">
              Sesión activa como {user.role === "musician" ? "músico" : "administrador"} ({user.email})
            </p>
            <p className="text-default-600 m-0">
              Para enviar una solicitud de reserva necesitas usar una cuenta de cliente/contratista.
            </p>
          </div>
          <Button
            size="sm"
            color="warning"
            variant="flat"
            onPress={async () => {
              persistDraft();
              await logout();
              setShowAuthSection(true);
            }}
            className="font-bold shrink-0"
          >
            Usar datos de cliente
          </Button>
        </div>
      )}

      {user && user.role === "contractor" && (
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
