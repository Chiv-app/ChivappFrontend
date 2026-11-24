"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addToast,
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { resolveUploadUrl } from "@/lib/uploads";
import {
  BookingLinkPublicOut,
  checkoutBookingLink,
  checkIdentityBookingLink,
  saveBookingLinkProgress,
  sendOtpBookingLink,
  BookingLinkIdentityStatus,
} from "@/lib/booking-links";
import LocationMapPickerField, {
  type MapLocation,
} from "@/components/ui/location-map-picker-field";
import CircularStepper from "@/components/ui/circular-stepper";
import { formatLocationReference, searchPlaces } from "@/lib/geocoding";
import { formatCurrency, getEventTypeOptions } from "@/lib/booking-labels";
import { formatPeruDate, todayPeruIso } from "@/lib/date-utils";
import { sanitizeContractHtml } from "@/lib/sanitize-html";
import { useIsClient } from "@/hooks/use-is-client";
import { getVideoEmbedUrl, isSupportedVideoUrl } from "@/lib/video-urls";
import { useAuth } from "@/contexts/auth-context";
import BookingMercadoPagoModal from "@/components/booking/booking-mercadopago-modal";
import BookingAchievementShareModal from "@/components/booking/booking-achievement-share-modal";
import type { BookingOut } from "@/types/api";
import { contractorPayableTotal, platformFeeAmount } from "@/lib/platform-fee";
import SignaturePad from "@/components/ui/signature-pad";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function CheckoutClient({
  linkData,
}: {
  linkData: BookingLinkPublicOut;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShareAchievementOpen, setIsShareAchievementOpen] = useState(false);

  const draft = linkData.draft_data ?? {};
  const isDirectMode = draft.payment_mode === "direct";
  const directAdvanceAmount =
    isDirectMode &&
    draft.advance_amount != null &&
    Number(draft.advance_amount) > 0
      ? Number(draft.advance_amount)
      : null;
  const directRemainingBalance =
    directAdvanceAmount != null
      ? Math.max(0, Number(linkData.price) - directAdvanceAmount)
      : Number(linkData.price);

  const bookingPreview = {
    price_agreed: linkData.price,
    platform_fee_percent: isDirectMode ? 0 : (linkData.fee_percent ?? 2),
    platform_fee_amount: isDirectMode ? 0 : (linkData.fee_amount ?? null),
  };
  const totalPayable = isDirectMode
    ? Number(linkData.price)
    : (linkData.total_payable != null &&
      Number(linkData.total_payable) > Number(linkData.price)
        ? Number(linkData.total_payable)
        : contractorPayableTotal(bookingPreview)) || 0;
  const serviceFee = isDirectMode
    ? 0
    : (linkData.fee_amount != null && Number(linkData.fee_amount) > 0
        ? Number(linkData.fee_amount)
        : platformFeeAmount(bookingPreview)) || 0;

  const todayIso = useMemo(() => todayPeruIso(), []);
  const eventTypeOptions = useMemo(
    () => getEventTypeOptions(linkData.event_type || linkData.draft_data?.event_type),
    [linkData.draft_data?.event_type, linkData.event_type],
  );

  // Form state (hydrate from client draft_data if previously saved, while keeping locks strictly on musician-prefilled fields)
  const isDateLocked = Boolean(linkData.event_date);
  const isTimeLocked = Boolean(linkData.start_time);
  const isEmailLocked = Boolean(linkData.client_email);

  const initialEventDate = linkData.event_date || draft.event_date || "";
  const initialStartTime = linkData.start_time
    ? linkData.start_time.slice(0, 5)
    : draft.start_time
      ? draft.start_time.slice(0, 5)
      : "";
  const initialEventType = linkData.event_type || draft.event_type || "";
  const initialAddress = linkData.location_address || draft.location_address || "";
  const initialCity =
    linkData.location_city ||
    draft.location_city ||
    linkData.musician.location_city ||
    null;

  const [eventDate, setEventDate] = useState(initialEventDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [eventType, setEventType] = useState(initialEventType);
  const [location, setLocation] = useState<MapLocation | null>(() => {
    if (!initialAddress) return null;
    return {
      address: initialAddress,
      city: initialCity,
      lat: Number.NaN,
      lng: Number.NaN,
    };
  });

  useEffect(() => {
    const addr = (linkData.location_address || draft.location_address || "").trim();
    const city = (
      linkData.location_city ||
      draft.location_city ||
      linkData.musician.location_city ||
      ""
    ).trim();
    const query = [addr, city].filter(Boolean).join(", ");
    if (!addr || query.length < 3) return;

    let cancelled = false;
    void searchPlaces(query)
      .then((matches) => {
        if (cancelled || matches.length === 0) return;
        const top = matches[0];
        setLocation((prev) => {
          if (prev && Number.isFinite(prev.lat) && Number.isFinite(prev.lng)) {
            return prev;
          }
          return {
            address: prev?.address || addr,
            city: prev?.city || top.city || city || null,
            lat: top.lat,
            lng: top.lng,
          };
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    draft.location_address,
    draft.location_city,
    linkData.location_address,
    linkData.location_city,
    linkData.musician.location_city,
  ]);
  const [fullname, setFullname] = useState(
    linkData.client_fullname || draft.client_fullname || "",
  );
  const [email, setEmail] = useState(
    linkData.client_email || draft.client_email || "",
  );
  const [phone, setPhone] = useState(
    linkData.client_phone || draft.client_phone || "",
  );
  const [documentNumber, setDocumentNumber] = useState(
    linkData.client_document_number || draft.client_document_number || "",
  );
  const [step1Attempted, setStep1Attempted] = useState(false);
  const [step2Attempted, setStep2Attempted] = useState(false);
  const [step3Attempted, setStep3Attempted] = useState(false);
  const [isContractPreviewOpen, setIsContractPreviewOpen] = useState(false);

  const isStep1Prefilled = Boolean(
    linkData.event_date &&
      linkData.start_time &&
      linkData.event_type &&
      linkData.location_address,
  );
  const isStep1DraftComplete = Boolean(
    initialEventDate && initialStartTime && initialEventType && initialAddress,
  );

  // Identity Flow State
  const [identityStatus, setIdentityStatus] = useState<
    BookingLinkIdentityStatus | "idle" | "check_error"
  >("idle");
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [isCheckingIdentity, setIsCheckingIdentity] = useState(false);
  const [lastOtpSentEmail, setLastOtpSentEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  const initialStep = useMemo(() => {
    const savedStep = Number(linkData.current_step ?? 0);
    if (savedStep >= 1 && savedStep <= 3) return savedStep;
    return isStep1Prefilled || isStep1DraftComplete ? 2 : 1;
  }, [isStep1DraftComplete, isStep1Prefilled, linkData.current_step]);

  const [activeStep, setActiveStep] = useState<number>(initialStep);
  const [completedSteps, setCompletedSteps] = useState(() => {
    const set = new Set<number>();
    if (isStep1Prefilled || isStep1DraftComplete || initialStep >= 2) set.add(1);
    if (initialStep >= 3) set.add(2);
    return set;
  });
  const { user, refresh: refreshAuth } = useAuth();

  useEffect(() => {
    if (!user) return;
    void Promise.resolve().then(() => {
      setFullname((prev) => (prev.trim() ? prev : user.fullname || ""));
      if (!isEmailLocked) {
        setEmail((prev) => (prev.trim() ? prev : user.email || ""));
      }
      setPhone((prev) => (prev.trim() ? prev : user.phone || ""));
    });
  }, [user, isEmailLocked]);

  const sessionUserMatchesEmail = Boolean(
    user?.email &&
      email.trim().toLowerCase() === user.email.trim().toLowerCase(),
  );

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [booking, setBooking] = useState<BookingOut | null>(null);
  const [contractBodySha256, setContractBodySha256] = useState<string | null>(
    null,
  );
  const [lastCheckoutSnapshot, setLastCheckoutSnapshot] = useState<
    string | null
  >(null);
  const [pendingPayment, setPendingPayment] = useState<{
    paymentId: string | null;
    message: string;
  } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<
    string | null
  >(null);
  const isClient = useIsClient();

  // Auto-save & progress tracking state
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >(draft.updated_at ? "saved" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    draft.updated_at ?? null,
  );
  const openRecordedRef = useRef(false);
  const lastSavedPayloadRef = useRef<string>("");

  const buildProgressPayload = useCallback(
    (options?: { recordOpen?: boolean }) => ({
      record_open: Boolean(options?.recordOpen),
      current_step: isPaymentModalOpen ? 4 : activeStep,
      event_date: eventDate || null,
      start_time: startTime || null,
      event_type: eventType.trim() || null,
      location_address: location?.address?.trim() || null,
      location_city: location?.city?.trim() || null,
      location_reference:
        location &&
        Number.isFinite(location.lat) &&
        Number.isFinite(location.lng)
          ? formatLocationReference(location.lat, location.lng)
          : null,
      client_fullname: fullname.trim() || null,
      client_email: email.trim() || null,
      client_phone: phone.trim() || null,
      client_document_number: documentNumber.trim() || null,
      has_signature: Boolean(signature || uploadedSignatureUrl),
      payment_modal_opened: isPaymentModalOpen,
    }),
    [
      activeStep,
      documentNumber,
      email,
      eventDate,
      eventType,
      fullname,
      isPaymentModalOpen,
      location,
      phone,
      signature,
      startTime,
      uploadedSignatureUrl,
    ],
  );

  const persistProgress = useCallback(
    async (options?: { recordOpen?: boolean; manual?: boolean }) => {
      if (typeof saveBookingLinkProgress !== "function") return;
      const payload = buildProgressPayload({
        recordOpen: options?.recordOpen,
      });
      const serialized = JSON.stringify({ ...payload, record_open: false });
      if (
        !options?.recordOpen &&
        !options?.manual &&
        serialized === lastSavedPayloadRef.current
      ) {
        return;
      }
      setSaveState("saving");
      try {
        const res = await saveBookingLinkProgress(linkData.token, payload);
        lastSavedPayloadRef.current = serialized;
        setSaveState("saved");
        setLastSavedAt(res?.saved_at || new Date().toISOString());
        if (options?.manual) {
          addToast({
            title: "Avance guardado",
            description:
              "Tus datos y el paso actual quedaron guardados en este enlace.",
            color: "success",
          });
        }
      } catch {
        setSaveState("error");
        if (options?.manual) {
          addToast({
            title: "No se pudo guardar el avance",
            description: "Revisa tu conexión e inténtalo de nuevo.",
            color: "warning",
          });
        }
      }
    },
    [buildProgressPayload, linkData.token],
  );

  // Record real client open once when mounted in browser
  useEffect(() => {
    if (!isClient || openRecordedRef.current) return;
    openRecordedRef.current = true;
    void Promise.resolve().then(() => persistProgress({ recordOpen: true }));
  }, [isClient, persistProgress]);

  // Debounced real-time auto-save whenever fields or steps change
  useEffect(() => {
    if (!isClient || !openRecordedRef.current || paymentCompleted) return;
    const timer = window.setTimeout(() => {
      void persistProgress();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [
    activeStep,
    documentNumber,
    email,
    eventDate,
    eventType,
    fullname,
    isClient,
    isPaymentModalOpen,
    location,
    paymentCompleted,
    persistProgress,
    phone,
    signature,
    startTime,
    uploadedSignatureUrl,
  ]);

  const renderedContractHtml = useMemo(() => {
    const rawTemplate = linkData.contract_template_body?.trim();
    if (!rawTemplate) return null;
    const escapeHtml = (val: string) =>
      val
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const cityFallback =
      location?.city || linkData.musician.location_city || "Por definir";
    const instrumentsLabel = linkData.musician.instruments?.length
      ? linkData.musician.instruments.join(", ")
      : "Según perfil del artista";
    const genresLabel = linkData.musician.genres?.length
      ? linkData.musician.genres.join(", ")
      : "Según perfil del artista";

    const replacements: Record<string, string> = {
      "{{nombre_artista}}": escapeHtml(linkData.musician.stage_name || "Artista"),
      "{{documento_artista}}": "Visible en el contrato PDF final tras confirmar",
      "{{correo_artista}}": "Visible en el contrato PDF final tras confirmar",
      "{{telefono_artista}}": "Visible en el contrato PDF final tras confirmar",
      "{{instrumentos_artista}}": escapeHtml(instrumentsLabel),
      "{{generos_artista}}": escapeHtml(genresLabel),
      "{{modalidad}}": "Solista / Agrupación",
      "{{nombre_cliente}}": escapeHtml(fullname.trim() || "Por completar"),
      "{{documento_cliente}}": escapeHtml(
        documentNumber.trim() || "Por completar",
      ),
      "{{tipo_documento_cliente}}": "DNI / CE",
      "{{correo_cliente}}": escapeHtml(email.trim() || "Por completar"),
      "{{telefono_cliente}}": escapeHtml(phone.trim() || "Por completar"),
      "{{ciudad_cliente}}": escapeHtml(cityFallback),
      "{{direccion_cliente}}": escapeHtml(
        location?.address || "Dirección por definir",
      ),
      "{{tipo_evento}}": escapeHtml(eventType.trim() || "Por definir"),
      "{{descripcion_evento}}": escapeHtml(eventType.trim() || "Por definir"),
      "{{fecha_evento}}": escapeHtml(
        eventDate ? formatPeruDate(eventDate) : "Por definir",
      ),
      "{{hora_evento}}": escapeHtml(startTime || "Por definir"),
      "{{hora_inicio}}": escapeHtml(startTime || "Por definir"),
      "{{hora_fin}}": "Según duración acordada",
      "{{lugar_evento}}": escapeHtml(
        location?.address || "Dirección por definir",
      ),
      "{{ciudad_evento}}": escapeHtml(cityFallback),
      "{{referencia_evento}}": escapeHtml(
        location?.address || "Dirección por definir",
      ),
      "{{duracion_servicio}}": "Según lo acordado",
      "{{monto_total}}": escapeHtml(formatCurrency(totalPayable)),
      "{{total_cliente}}": escapeHtml(formatCurrency(totalPayable)),
      "{{anticipo}}": escapeHtml(
        isDirectMode
          ? directAdvanceAmount != null
            ? formatCurrency(directAdvanceAmount)
            : "Gestionado directamente con el artista"
          : formatCurrency(totalPayable),
      ),
      "{{saldo_pendiente}}": escapeHtml(
        isDirectMode
          ? formatCurrency(directRemainingBalance)
          : formatCurrency(0),
      ),
      "{{tarifa_evento}}": escapeHtml(formatCurrency(linkData.price)),
      "{{tarifa_hora}}": escapeHtml(formatCurrency(linkData.price)),
      "{{neto_artista}}": escapeHtml(formatCurrency(linkData.price)),
      "{{comision_plataforma}}": escapeHtml(formatCurrency(serviceFee)),
      "{{porcentaje_comision}}": escapeHtml(
        isDirectMode ? "0%" : `${linkData.fee_percent ?? 2}%`,
      ),
      "{{fecha_contrato}}": escapeHtml(formatPeruDate(todayIso)),
    };

    let html = rawTemplate;
    for (const [token, val] of Object.entries(replacements)) {
      html = html.split(token).join(val);
    }
    return isClient ? sanitizeContractHtml(html) : "";
  }, [
    linkData.contract_template_body,
    linkData.musician.stage_name,
    linkData.musician.instruments,
    linkData.musician.genres,
    linkData.musician.location_city,
    linkData.price,
    linkData.fee_percent,
    fullname,
    documentNumber,
    email,
    phone,
    eventType,
    eventDate,
    startTime,
    location?.address,
    location?.city,
    totalPayable,
    serviceFee,
    todayIso,
    isClient,
    isDirectMode,
    directAdvanceAmount,
    directRemainingBalance,
  ]);

  const hasVideos =
    !!linkData.musician.showreel_video_url ||
    (linkData.musician.videos && linkData.musician.videos.length > 0);
  const [activeMediaTab, setActiveMediaTab] = useState<
    "videos" | "fotos" | "comentarios"
  >(hasVideos ? "videos" : "fotos");
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const handleMediaTab = (tab: "videos" | "fotos" | "comentarios") => {
    setActiveMediaTab(tab);
    setActiveMediaIndex(0);
  };

  const videoList: string[] = [];
  if (linkData.musician.showreel_video_url) {
    linkData.musician.showreel_video_url.split(",").forEach((v) => {
      const clean = v.trim();
      if (clean && !videoList.includes(clean)) videoList.push(clean);
    });
  }
  if (linkData.musician.videos) {
    linkData.musician.videos.forEach((v) => {
      if (typeof v === "string") {
        v.split(",").forEach((subV) => {
          const clean = subV.trim();
          if (clean && !videoList.includes(clean)) videoList.push(clean);
        });
      }
    });
  }

  const handleSendOtp = async (targetEmail?: string) => {
    const emailToSend = (targetEmail ?? email).trim().toLowerCase();
    if (!emailToSend) return;
    try {
      await sendOtpBookingLink(linkData.token, emailToSend);
      setLastOtpSentEmail(emailToSend);
      addToast({
        title: "Código enviado",
        description: "Revisa tu correo para obtener el código de acceso.",
        color: "success",
      });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "No se pudo enviar el código";
      addToast({
        title: "Error",
        description: msg || "No se pudo enviar el código",
        color: "danger",
      });
    }
  };

  const handleEmailBlur = async (): Promise<
    BookingLinkIdentityStatus | "idle" | "check_error"
  > => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return "idle";
    setIsCheckingIdentity(true);
    try {
      const res = await checkIdentityBookingLink(
        linkData.token,
        normalizedEmail,
      );
      setIdentityStatus(res.status);
      setIdentityMessage(res.message || null);
      if (
        res.status === "exists_verified" &&
        lastOtpSentEmail !== normalizedEmail
      ) {
        await handleSendOtp(normalizedEmail);
      }
      return res.status;
    } catch (error) {
      console.error("Failed to check identity", error);
      setIdentityStatus("check_error");
      setIdentityMessage(
        "No pudimos verificar si tu correo ya tiene cuenta. Si ya tienes cuenta en Chivapp, solicita un código OTP o ingresa tu contraseña.",
      );
      return "check_error";
    } finally {
      setIsCheckingIdentity(false);
    }
  };

  const focusElementById = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id) as HTMLElement | null;
      el?.focus();
    }, 0);
  };

  useEffect(() => {
    if (paymentCompleted) {
      focusElementById("checkout-confirmed-heading");
    }
  }, [paymentCompleted]);

  const goToStep = async (step: number) => {
    if ((pendingPayment || paymentCompleted) && step < 3) {
      addToast({
        title: "Operación en curso",
        description:
          "No puedes modificar los datos del evento mientras tu pago está en verificación o ya fue confirmado.",
        color: "warning",
      });
      return;
    }
    if (step === 2) {
      setStep1Attempted(true);
      if (!eventDate || !startTime || !eventType.trim() || !location?.address) {
        addToast({
          title: "Datos incompletos",
          description:
            "Completa la fecha, hora, tipo de evento y ubicación.",
          color: "danger",
        });
        if (!eventDate) focusElementById("checkout-event-date");
        else if (!startTime) focusElementById("checkout-start-time");
        else if (!eventType.trim()) focusElementById("checkout-event-type");
        return;
      }
      if (eventType.trim().length < 2) {
        addToast({
          title: "Tipo de evento muy corto",
          description: "El tipo de evento debe tener al menos 2 caracteres.",
          color: "danger",
        });
        focusElementById("checkout-event-type");
        return;
      }
      if (location.address.trim().length < 5) {
        addToast({
          title: "Ubicación incompleta",
          description:
            "La dirección del evento debe tener al menos 5 caracteres.",
          color: "danger",
        });
        return;
      }
      setCompletedSteps((prev) => new Set(prev).add(1));
      if (isEmailLocked && identityStatus === "idle") {
        void handleEmailBlur();
      }
    } else if (step === 3) {
      setStep2Attempted(true);
      if (!fullname.trim() || !email.trim() || !phone.trim()) {
        addToast({
          title: "Datos incompletos",
          description: "El nombre, correo y celular son obligatorios.",
          color: "danger",
        });
        if (!fullname.trim()) focusElementById("checkout-fullname");
        else if (!email.trim()) focusElementById("checkout-email");
        else if (!phone.trim()) focusElementById("checkout-phone");
        return;
      }
      if (fullname.trim().length < 2) {
        addToast({
          title: "Nombre muy corto",
          description: "Ingresa tu nombre completo (mínimo 2 caracteres).",
          color: "danger",
        });
        focusElementById("checkout-fullname");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        addToast({
          title: "Correo inválido",
          description: "Ingresa un correo electrónico válido.",
          color: "danger",
        });
        focusElementById("checkout-email");
        return;
      }
      if (phone.trim().length < 6) {
        addToast({
          title: "Teléfono inválido",
          description:
            "Ingresa un teléfono de contacto válido (mínimo 6 caracteres).",
          color: "danger",
        });
        focusElementById("checkout-phone");
        return;
      }
      if (isCheckingIdentity) {
        addToast({
          title: "Verificando correo",
          description:
            "Espera un momento mientras validamos tu correo electrónico.",
          color: "warning",
        });
        return;
      }
      let resolvedStatus = identityStatus;
      if (resolvedStatus === "idle") {
        resolvedStatus = await handleEmailBlur();
      }
      if (resolvedStatus === "self") {
        addToast({
          title: "Acción no permitida",
          description:
            "No puedes contratarte a ti mismo con tu cuenta de músico.",
          color: "danger",
        });
        focusElementById("checkout-email");
        return;
      }
      if (resolvedStatus === "exists_verified" && !otp.trim()) {
        addToast({
          title: "Falta código",
          description: "Ingresa el código OTP enviado a tu correo.",
          color: "danger",
        });
        focusElementById("checkout-otp");
        return;
      }
      if (resolvedStatus === "exists_unverified" && !password) {
        addToast({
          title: "Falta contraseña",
          description: "Ingresa tu contraseña para continuar.",
          color: "danger",
        });
        focusElementById("checkout-password");
        return;
      }
      const cleanDoc = documentNumber.trim();
      if (cleanDoc && (cleanDoc.length < 8 || cleanDoc.length > 20)) {
        addToast({
          title: "Documento inválido",
          description:
            "El documento de identidad debe tener entre 8 y 20 caracteres, o déjalo vacío si es opcional.",
          color: "danger",
        });
        focusElementById("checkout-doc");
        return;
      }
      setCompletedSteps((prev) => new Set(prev).add(2));
    }
    setActiveStep(step);
    focusElementById(`checkout-step-${step}-heading`);
  };

  const handlePayAndConfirm = async () => {
    if (booking && pendingPayment) {
      setIsPaymentModalOpen(true);
      return;
    }
    setStep3Attempted(true);
    if (!termsAccepted) {
      addToast({
        title: "Términos obligatorios",
        description: "Debes aceptar los términos para continuar.",
        color: "warning",
      });
      focusElementById("checkout-terms");
      return;
    }
    if (!signature) {
      addToast({
        title: "Firma obligatoria",
        description:
          "Firma o escribe tu nombre para aceptar el contrato de actuación.",
        color: "warning",
      });
      return;
    }
    const cleanDoc = documentNumber.trim();
    if (cleanDoc && (cleanDoc.length < 8 || cleanDoc.length > 20)) {
      addToast({
        title: "Documento inválido",
        description:
          "El documento de identidad debe tener entre 8 y 20 caracteres, o déjalo vacío.",
        color: "warning",
      });
      return;
    }

    const locationReference =
      location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng)
        ? formatLocationReference(location.lat, location.lng)
        : undefined;

    const currentSnapshot = JSON.stringify({
      eventDate,
      startTime,
      eventType: eventType.trim(),
      address: location?.address || "",
      city: location?.city || "",
      locationReference: locationReference || "",
      fullname: fullname.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      doc: cleanDoc,
      signature,
    });

    if (!booking || currentSnapshot !== lastCheckoutSnapshot) {
      setIsSubmitting(true);
      try {
        const res = await checkoutBookingLink(linkData.token, {
          event_date: eventDate,
          start_time: startTime,
          end_time: linkData.end_time || undefined,
          event_type: eventType.trim(),
          location_address: location?.address || "",
          location_city: location?.city || "",
          location_reference: locationReference,
          fullname: fullname.trim(),
          email: email.trim(),
          phone: phone.trim(),
          document_number: cleanDoc || undefined,
          event_description: linkData.event_description || undefined,
          signature_image_url: signature,
          accept_terms: termsAccepted,
          otp:
            identityStatus === "exists_verified" ||
            identityStatus === "check_error"
              ? otp.trim() || undefined
              : undefined,
          password:
            identityStatus === "exists_unverified" ||
            identityStatus === "check_error"
              ? password || undefined
              : undefined,
        });

        await refreshAuth();
        if (res.signature_image_url) {
          setUploadedSignatureUrl(res.signature_image_url);
        }
        if (res.contract_body_sha256) {
          setContractBodySha256(res.contract_body_sha256);
        }
        setLastCheckoutSnapshot(currentSnapshot);
        const directConfirmed = Boolean(res.direct_confirmed || isDirectMode);
        setBooking({
          id: res.booking_id,
          event_type: eventType.trim(),
          event_date: eventDate,
          start_time: startTime,
          location_address: location?.address || "",
          location_city: location?.city || "",
          location_reference: locationReference ?? null,
          price_agreed: linkData.price,
          platform_fee_percent: directConfirmed ? 0 : (linkData.fee_percent ?? 2),
          platform_fee_amount: directConfirmed ? 0 : serviceFee,
          status: directConfirmed ? "payment_retained" : "contract_signed",
        } as BookingOut);

        if (directConfirmed) {
          setPendingPayment(null);
          setIsPaymentModalOpen(false);
          setPaymentCompleted(true);
          addToast({
            title: "¡Reserva confirmada!",
            description:
              "El contrato digital quedó firmado y tu fecha está confirmada en la agenda del artista.",
            color: "success",
          });
        } else {
          // Se firma y se paga primero: el correo se verifica después, con el enlace del
          // correo de confirmación del pago.
          setIsPaymentModalOpen(true);
        }
      } catch (error: unknown) {
        let errorMsg =
          (error as Error).message || "Ocurrió un problema inesperado.";
        if (error && typeof error === "object" && "response" in error) {
          const response = (
            error as { response?: { data?: { detail?: unknown } } }
          ).response;
          if (response?.data?.detail) {
            errorMsg =
              typeof response.data.detail === "string"
                ? response.data.detail
                : JSON.stringify(response.data.detail);
          }
        }
        addToast({
          title: "Problema al procesar",
          description: errorMsg,
          color: "danger",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  const profileImageUrl = resolveUploadUrl(linkData.musician.profile_image_url);

  return (
    <div className="font-sans antialiased selection:bg-primary/20 selection:text-primary-text relative bg-background text-foreground min-h-screen">
      {/* Ambient Backdrop Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-[450px] h-[450px] bg-warning/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full px-3 sm:px-6 py-6 lg:py-8 flex flex-col gap-6 sm:gap-8">
        {/* 1. HERO CABECERA */}
        <section className="bg-content1 rounded-[2rem] p-6 sm:p-8 border border-divider shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

          {/* LADO IZQUIERDO: Información del Músico */}
          <div className="flex flex-col items-center gap-6 lg:w-[45%] relative z-10 text-center mx-auto">
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl mx-auto overflow-hidden border border-divider bg-primary/15 flex items-center justify-center">
                {profileImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    alt={linkData.musician.stage_name}
                    className="w-full h-full object-cover object-top"
                    src={profileImageUrl}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="text-3xl font-bold text-primary"
                  >
                    {getInitials(linkData.musician.stage_name)}
                  </span>
                )}
              </div>
            </div>

            {/* Detalles e Insignias */}
            <div className="space-y-4 min-w-0 flex-1 w-full mt-2 sm:mt-0">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                  {linkData.musician.stage_name}
                </h1>
              </div>

              <div className="flex items-center justify-center gap-3 text-sm text-default-500 flex-wrap">
                <div className="flex items-center text-warning font-bold gap-1.5 bg-default-100 px-2.5 py-1 rounded-lg border border-divider shadow-sm">
                  <Icon
                    icon="lucide:star"
                    className="w-4 h-4 fill-warning text-warning"
                  />
                  <span>
                    {linkData.musician.rating_avg
                      ? Number(linkData.musician.rating_avg).toFixed(1)
                      : "Nuevo"}
                  </span>
                </div>
                <span className="text-default-400 font-bold">•</span>
                <span className="text-default-600 font-medium">
                  {linkData.musician.rating_count
                    ? `${linkData.musician.rating_count} presentaciones realizadas`
                    : "Nuevo en la plataforma"}
                </span>
              </div>

              {linkData.musician.genres &&
                linkData.musician.genres.length > 0 && (
                  <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                    {linkData.musician.genres.slice(0, 3).map((genre, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium text-default-700 bg-default-100 border border-divider px-3.5 py-1.5 rounded-full flex items-center gap-2"
                      >
                        <Icon
                          icon={
                            i === 0
                              ? "lucide:music"
                              : i === 1
                                ? "lucide:heart"
                                : "lucide:sparkles"
                          }
                          className="w-3.5 h-3.5 text-primary"
                        />{" "}
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

              {linkData.musician.portfolio_description && (
                <div className="text-sm text-default-500 leading-relaxed pt-2 max-w-lg mx-auto">
                  <p className="line-clamp-2">
                    {linkData.musician.portfolio_description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* LADO DERECHO: Portafolio Visual y Multimedia */}
          <div className="flex flex-col lg:w-[55%] relative z-10 space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 sm:gap-4" role="tablist" aria-label="Multimedia del músico">
                <button
                  id="checkout-tab-videos"
                  type="button"
                  role="tab"
                  aria-selected={activeMediaTab === "videos"}
                  aria-controls="checkout-media-tabpanel"
                  onClick={() => handleMediaTab("videos")}
                  className={`text-xs font-bold px-4 py-2 min-h-10 rounded-full flex items-center gap-1.5 transition-all ${
                    activeMediaTab === "videos"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-default-500 hover:text-foreground"
                  }`}
                >
                  <Icon icon="lucide:play" className="w-4 h-4" /> Videos
                </button>
                <button
                  id="checkout-tab-fotos"
                  type="button"
                  role="tab"
                  aria-selected={activeMediaTab === "fotos"}
                  aria-controls="checkout-media-tabpanel"
                  onClick={() => handleMediaTab("fotos")}
                  className={`text-xs font-bold px-4 py-2 min-h-10 rounded-full flex items-center gap-1.5 transition-all ${
                    activeMediaTab === "fotos"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-default-500 hover:text-foreground"
                  }`}
                >
                  <Icon icon="lucide:image" className="w-4 h-4" /> Fotos
                </button>
                <button
                  id="checkout-tab-comentarios"
                  type="button"
                  role="tab"
                  aria-selected={activeMediaTab === "comentarios"}
                  aria-controls="checkout-media-tabpanel"
                  onClick={() => handleMediaTab("comentarios")}
                  className={`text-xs font-bold px-4 py-2 min-h-10 rounded-full flex items-center gap-1.5 transition-all ${
                    activeMediaTab === "comentarios"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-default-500 hover:text-foreground"
                  }`}
                >
                  <Icon icon="lucide:star" className="w-4 h-4" /> Comentarios
                  <span className="px-1.5 rounded text-xs ml-0.5 border border-current/20">
                    {linkData.musician.reviews?.length || 0}
                  </span>
                </button>
              </div>
              {linkData.musician.location_city && (
                <div className="hidden sm:flex text-xs font-medium text-default-500">
                  En {linkData.musician.location_city}
                </div>
              )}
            </div>

            {/* Contenedor Multimedia Principal */}
            <div
              id="checkout-media-tabpanel"
              role="tabpanel"
              aria-labelledby={`checkout-tab-${activeMediaTab}`}
              className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-default-100 shadow-inner group flex items-center justify-center"
            >
              {activeMediaTab === "videos" && videoList.length > 0 ? (
                <>
                  {isSupportedVideoUrl(videoList[activeMediaIndex]) ? (
                    <div className="w-full h-full relative group/iframe">
                      <iframe
                        key={videoList[activeMediaIndex]}
                        title={`Video de ${linkData.musician.stage_name} (${activeMediaIndex + 1} de ${videoList.length})`}
                        src={
                          getVideoEmbedUrl(videoList[activeMediaIndex]) ||
                          undefined
                        }
                        className="w-full h-full object-cover"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      key={videoList[activeMediaIndex]}
                      src={
                        resolveUploadUrl(videoList[activeMediaIndex]) ||
                        undefined
                      }
                      className="w-full h-full object-cover"
                      controls
                      poster={
                        linkData.musician.gallery_images?.[0]
                          ? resolveUploadUrl(
                              linkData.musician.gallery_images[0],
                            ) || undefined
                          : undefined
                      }
                    />
                  )}
                  {videoList.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Video anterior"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMediaIndex((prev) =>
                            prev === 0 ? videoList.length - 1 : prev - 1,
                          );
                        }}
                        className="absolute z-10 left-2 top-1/2 -translate-y-1/2 bg-content1/85 hover:bg-content1 text-foreground w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-sm transition-all shadow-md"
                      >
                        <Icon icon="lucide:chevron-left" className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Siguiente video"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMediaIndex((prev) =>
                            prev === videoList.length - 1 ? 0 : prev + 1,
                          );
                        }}
                        className="absolute z-10 right-2 top-1/2 -translate-y-1/2 bg-content1/85 hover:bg-content1 text-foreground w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-sm transition-all shadow-md"
                      >
                        <Icon icon="lucide:chevron-right" className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              ) : activeMediaTab === "fotos" &&
                linkData.musician.gallery_images &&
                linkData.musician.gallery_images.length > 0 ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={linkData.musician.gallery_images[activeMediaIndex]}
                    src={
                      resolveUploadUrl(
                        linkData.musician.gallery_images[activeMediaIndex],
                      ) || undefined
                    }
                    alt={`Foto ${activeMediaIndex + 1} de ${linkData.musician.stage_name}`}
                    className="w-full h-full object-contain bg-default-200/50 backdrop-blur-sm"
                  />
                  {linkData.musician.gallery_images.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Foto anterior"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMediaIndex((prev) =>
                            prev === 0
                              ? linkData.musician.gallery_images!.length - 1
                              : prev - 1,
                          );
                        }}
                        className="absolute z-10 left-2 top-1/2 -translate-y-1/2 bg-content1/85 hover:bg-content1 text-foreground w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-sm transition-all shadow-md"
                      >
                        <Icon icon="lucide:chevron-left" className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Siguiente foto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMediaIndex((prev) =>
                            prev ===
                            linkData.musician.gallery_images!.length - 1
                              ? 0
                              : prev + 1,
                          );
                        }}
                        className="absolute z-10 right-2 top-1/2 -translate-y-1/2 bg-content1/85 hover:bg-content1 text-foreground w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-sm transition-all shadow-md"
                      >
                        <Icon icon="lucide:chevron-right" className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              ) : activeMediaTab === "comentarios" ? (
                <div className="w-full h-full flex flex-col bg-default-100/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                  {linkData.musician.reviews &&
                  linkData.musician.reviews.length > 0 ? (
                    <div className="space-y-4 w-full h-full">
                      {linkData.musician.reviews.map((review, i) => (
                        <div
                          key={i}
                          className="bg-content1 border border-divider rounded-xl p-4 w-full"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-foreground">
                              {review.guest_name || "Usuario"}
                            </span>
                            <div className="flex gap-0.5 text-warning">
                              {Array.from({ length: review.rating }).map(
                                (_, j) => (
                                  <Icon
                                    key={j}
                                    icon="lucide:star"
                                    className="w-3.5 h-3.5 fill-warning"
                                  />
                                ),
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-default-500 leading-relaxed italic">
                            &quot;{review.comment}&quot;
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-default-500 h-full text-center m-auto">
                      <Icon
                        icon="lucide:message-square-quote"
                        className="w-12 h-12 mb-3 text-default-300"
                      />
                      <p className="text-sm">
                        El músico aún no cuenta con reseñas escritas.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-default-100">
                  <Icon
                    icon="lucide:music"
                    className="w-12 h-12 text-default-300"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. CUERPO CENTRAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: Acordeones */}
          <section className="lg:col-span-7 space-y-4">
            {/* Barra de guardado automático + botón manual Guardar */}
            <div className="rounded-2xl border border-default-200/80 bg-content1/95 backdrop-blur-md px-4 py-3 shadow-soft flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                    saveState === "saving"
                      ? "bg-primary/15 text-primary"
                      : saveState === "saved"
                        ? "bg-success/15 text-success"
                        : saveState === "error"
                          ? "bg-warning/15 text-warning-text"
                          : "bg-default-100 text-default-500"
                  }`}
                >
                  <Icon
                    icon={
                      saveState === "saving"
                        ? "lucide:loader-2"
                        : saveState === "saved"
                          ? "lucide:cloud-check"
                          : "lucide:save"
                    }
                    className={`w-4 h-4 ${saveState === "saving" ? "animate-spin" : ""}`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      Guardado automático activo
                    </p>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={
                        saveState === "saving"
                          ? "primary"
                          : saveState === "saved"
                            ? "success"
                            : saveState === "error"
                              ? "warning"
                              : "default"
                      }
                    >
                      {saveState === "saving"
                        ? "Guardando..."
                        : saveState === "saved"
                          ? "Avance guardado"
                          : saveState === "error"
                            ? "Pendiente de sincronizar"
                            : "En vivo"}
                    </Chip>
                  </div>
                  <p className="text-[11px] sm:text-xs text-default-500 truncate">
                    {lastSavedAt
                      ? "Tus datos quedan guardados si necesitas retomar este enlace más tarde."
                      : "Los campos que completes se guardan automáticamente mientras avanzas."}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="flat"
                color="primary"
                radius="lg"
                className="font-semibold shrink-0"
                isLoading={saveState === "saving"}
                onPress={() => void persistProgress({ manual: true })}
                startContent={
                  saveState !== "saving" ? (
                    <Icon icon="lucide:save" className="w-4 h-4" />
                  ) : undefined
                }
              >
                Guardar avance
              </Button>
            </div>

            {/* Stepper circular unificado */}
            <div className="rounded-2xl border border-default-200/80 bg-content1/95 px-4 py-3.5 shadow-soft">
              <CircularStepper
                ariaLabel="Pasos de confirmación de reserva"
                steps={[
                  {
                    id: 1,
                    title: "Datos del evento",
                    state:
                      completedSteps.has(1) && activeStep !== 1
                        ? "done"
                        : activeStep === 1
                          ? "current"
                          : "upcoming",
                  },
                  {
                    id: 2,
                    title: "Datos personales",
                    state:
                      completedSteps.has(2) && activeStep !== 2
                        ? "done"
                        : activeStep === 2
                          ? "current"
                          : "upcoming",
                    disabled: !completedSteps.has(1) && activeStep < 2,
                  },
                  {
                    id: 3,
                    title: isDirectMode
                      ? "Contrato y firma"
                      : "Confirmación y pago",
                    state: paymentCompleted
                      ? "done"
                      : activeStep === 3
                        ? "current"
                        : "upcoming",
                    disabled: !completedSteps.has(2) && activeStep < 3,
                  },
                ]}
                onStepClick={(stepItem) => {
                  const target = Number(stepItem.id);
                  if (target === 1) goToStep(1);
                  else if (target === 2 && completedSteps.has(1)) goToStep(2);
                  else if (target === 3 && completedSteps.has(2)) goToStep(3);
                }}
              />
            </div>

            {isDirectMode && (
              <div className="rounded-2xl border border-secondary/35 bg-secondary/10 p-4 flex items-start gap-3">
                <Icon
                  icon="lucide:file-check-2"
                  className="w-5 h-5 text-secondary shrink-0 mt-0.5"
                />
                <div className="text-xs sm:text-sm text-foreground">
                  <p className="font-bold text-secondary">
                    Acuerdo directo con {linkData.musician.stage_name} · Sin cobro adicional en este enlace
                  </p>
                  <p className="text-default-600 mt-0.5">
                    Este enlace es únicamente para confirmar la <strong>ubicación exacta en el mapa GPS</strong>, registrar tus <strong>datos de contratista</strong> y <strong>firmar el contrato digital</strong> de tu presentación.
                  </p>
                </div>
              </div>
            )}

            {isStep1Prefilled && (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-4 flex items-start gap-3">
                <Icon
                  icon="lucide:check-circle-2"
                  className="w-5 h-5 text-success shrink-0 mt-0.5"
                />
                <div className="text-xs sm:text-sm text-foreground">
                  <p className="font-bold text-success">
                    ¡Datos del evento ya pre-cargados!
                  </p>
                  <p className="text-default-600 mt-0.5">
                    Cargamos automáticamente la fecha, hora, lugar y tipo de evento que acordaste con{" "}
                    <strong>{linkData.musician.stage_name}</strong>.{" "}
                    {isDirectMode
                      ? "Solo confirma tus datos de contacto y firma el contrato digital para dejar tu reserva lista."
                      : "Solo confirma tus datos de contacto, firma el contrato digital y realiza el pago."}
                  </p>
                </div>
              </div>
            )}

            {/* PASO 1 */}
            <div
              className={`bg-content1/95 backdrop-blur-xl rounded-3xl transition-all duration-300 overflow-hidden shadow-xl relative ${
                activeStep === 1
                  ? "border border-primary/50"
                  : "border border-divider"
              }`}
            >
              <button
                type="button"
                aria-expanded={activeStep === 1}
                onClick={() => goToStep(1)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between cursor-pointer border-b border-divider bg-default-50/60"
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border font-bold text-sm ${
                      completedSteps.has(1) && activeStep !== 1
                        ? "bg-success text-success-foreground border-success"
                        : activeStep === 1
                          ? "bg-primary text-primary-foreground border-primary shadow-glow ring-4 ring-primary/20"
                          : "bg-default-100 text-default-600 border-divider"
                    }`}
                  >
                    {completedSteps.has(1) && activeStep !== 1 ? (
                      <Icon icon="lucide:check" className="w-4 h-4 stroke-[3]" />
                    ) : (
                      1
                    )}
                  </div>
                  <div>
                    <h2
                      id="checkout-step-1-heading"
                      tabIndex={-1}
                      className="text-base font-extrabold text-foreground flex items-center gap-2 outline-none"
                    >
                      1. Datos del evento
                    </h2>
                    <p className="text-xs text-default-500">
                      Cuándo y dónde será la presentación
                    </p>
                  </div>
                </div>
                {activeStep === 1 && (
                  <span className="text-primary-text text-xs font-bold px-2.5 py-1 bg-primary/10 rounded-full border border-primary/25">
                    Paso actual
                  </span>
                )}
              </button>

              {activeStep === 1 && (
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="checkout-event-date"
                        className="block text-xs font-bold text-default-700 mb-1.5 flex items-center gap-1.5"
                      >
                        <Icon
                          icon="lucide:calendar-days"
                          className="w-3.5 h-3.5 text-primary"
                        />{" "}
                        Fecha de la presentación{" "}
                        <span className="text-primary">*</span>
                      </label>
                      <input
                        id="checkout-event-date"
                        min={todayIso}
                        readOnly={isDateLocked}
                        disabled={isDateLocked}
                        aria-invalid={step1Attempted && !eventDate}
                        aria-describedby={
                          step1Attempted && !eventDate
                            ? "checkout-event-date-error"
                            : undefined
                        }
                        className={`bg-content1 border ${
                          step1Attempted && !eventDate
                            ? "border-danger"
                            : "border-default-300"
                        } ${
                          isDateLocked ? "opacity-75 cursor-not-allowed bg-default-100" : ""
                        } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                        type="date"
                        value={eventDate}
                        onChange={(e) => {
                          if (!isDateLocked) setEventDate(e.target.value);
                        }}
                      />
                      {isDateLocked && (
                        <p className="text-xs text-default-500 mt-1">
                          Fecha fijada en este enlace de reserva.
                        </p>
                      )}
                      {step1Attempted && !eventDate && (
                        <p
                          id="checkout-event-date-error"
                          role="alert"
                          className="text-xs text-danger mt-1"
                        >
                          Selecciona la fecha del evento.
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-start-time"
                        className="block text-xs font-bold text-default-700 mb-1.5 flex items-center gap-1.5"
                      >
                        <Icon
                          icon="lucide:clock"
                          className="w-3.5 h-3.5 text-primary"
                        />{" "}
                        Hora aproximada <span className="text-primary">*</span>
                      </label>
                      <input
                        id="checkout-start-time"
                        readOnly={isTimeLocked}
                        disabled={isTimeLocked}
                        aria-invalid={step1Attempted && !startTime}
                        aria-describedby={
                          step1Attempted && !startTime
                            ? "checkout-start-time-error"
                            : undefined
                        }
                        className={`bg-content1 border ${
                          step1Attempted && !startTime
                            ? "border-danger"
                            : "border-default-300"
                        } ${
                          isTimeLocked ? "opacity-75 cursor-not-allowed bg-default-100" : ""
                        } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                        type="time"
                        value={startTime}
                        onChange={(e) => {
                          if (!isTimeLocked) setStartTime(e.target.value);
                        }}
                      />
                      {isTimeLocked && (
                        <p className="text-xs text-default-500 mt-1">
                          Hora fijada en este enlace de reserva.
                        </p>
                      )}
                      {step1Attempted && !startTime && (
                        <p
                          id="checkout-start-time-error"
                          role="alert"
                          className="text-xs text-danger mt-1"
                        >
                          Indica la hora de inicio.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-event-type"
                      className="block text-xs font-bold text-default-700 mb-1.5 flex items-center gap-1.5"
                    >
                      <Icon
                        icon="lucide:sparkles"
                        className="w-3.5 h-3.5 text-primary"
                      />{" "}
                      Tipo de evento{" "}
                      <span className="text-primary">*</span>
                    </label>
                    <select
                      id="checkout-event-type"
                      aria-invalid={
                        step1Attempted &&
                        (!eventType.trim() || eventType.trim().length < 2)
                      }
                      aria-describedby={
                        step1Attempted &&
                        (!eventType.trim() || eventType.trim().length < 2)
                          ? "checkout-event-type-error"
                          : undefined
                      }
                      className={`bg-content1 border ${
                        step1Attempted &&
                        (!eventType.trim() || eventType.trim().length < 2)
                          ? "border-danger"
                          : "border-default-300"
                      } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    >
                      <option value="">Selecciona el tipo de evento</option>
                      {getEventTypeOptions(eventType || eventTypeOptions[0]).map(
                        (type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ),
                      )}
                    </select>
                    {step1Attempted &&
                      (!eventType.trim() || eventType.trim().length < 2) && (
                        <p
                          id="checkout-event-type-error"
                          role="alert"
                          className="text-xs text-danger mt-1"
                        >
                          Selecciona el tipo de evento.
                        </p>
                      )}
                  </div>

                  <div>
                    <p className="block text-xs font-bold text-default-700 mb-1.5 flex items-center gap-1.5">
                      <Icon
                        icon="lucide:map-pin"
                        className="w-3.5 h-3.5 text-primary"
                      />{" "}
                      Ubicación del evento{" "}
                      <span className="text-primary">*</span>
                    </p>
                    <div
                      className={`bg-content1 border ${
                        step1Attempted &&
                        (!location?.address || location.address.trim().length < 5)
                          ? "border-danger"
                          : "border-default-300"
                      } rounded-2xl p-3`}
                    >
                      <LocationMapPickerField
                        value={location}
                        onChange={setLocation}
                        fallbackQuery={
                          [
                            linkData.location_address,
                            linkData.location_city ||
                              linkData.musician.location_city,
                          ]
                            .filter(Boolean)
                            .join(", ") || undefined
                        }
                      />
                    </div>
                    {step1Attempted &&
                      (!location?.address ||
                        location.address.trim().length < 5) && (
                        <p
                          id="checkout-location-error"
                          role="alert"
                          className="text-xs text-danger mt-1"
                        >
                          {!location?.address
                            ? "Busca la dirección o selecciona el punto en el mapa."
                            : "La dirección del evento debe tener al menos 5 caracteres."}
                        </p>
                      )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      className="w-full sm:w-auto min-h-11 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer"
                      onClick={() => goToStep(2)}
                      type="button"
                    >
                      <span>Continuar al paso 2: Datos personales</span>
                      <Icon
                        icon="lucide:arrow-right"
                        className="w-4 h-4 stroke-[3]"
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PASO 2 */}
            <div
              className={`bg-content1/95 backdrop-blur-xl rounded-3xl transition-all duration-300 overflow-hidden shadow-xl relative ${
                activeStep === 2
                  ? "border border-primary/50"
                  : "border border-divider"
              }`}
            >
              <button
                type="button"
                aria-expanded={activeStep === 2}
                disabled={!completedSteps.has(1) && activeStep < 2}
                onClick={() => {
                  if (completedSteps.has(1)) goToStep(2);
                }}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-default-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border font-bold text-sm ${
                      completedSteps.has(2) && activeStep !== 2
                        ? "bg-success text-success-foreground border-success"
                        : activeStep === 2
                          ? "bg-primary text-primary-foreground border-primary shadow-glow ring-4 ring-primary/20"
                          : "bg-default-100 text-default-600 border-divider"
                    }`}
                  >
                    {completedSteps.has(2) && activeStep !== 2 ? (
                      <Icon icon="lucide:check" className="w-4 h-4 stroke-[3]" />
                    ) : (
                      2
                    )}
                  </div>
                  <div>
                    <h2
                      id="checkout-step-2-heading"
                      tabIndex={-1}
                      className="text-base font-bold text-foreground flex items-center gap-2 outline-none"
                    >
                      2. Tus datos personales
                    </h2>
                    <p className="text-xs text-default-500">
                      Información de contacto del contratista
                    </p>
                  </div>
                </div>
              </button>

              {activeStep === 2 && (
                <div className="p-6 sm:p-7 space-y-5 border-t border-divider">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="checkout-fullname"
                        className="block text-xs font-bold text-default-700 mb-1.5"
                      >
                        Nombre y apellidos completos{" "}
                        <span className="text-primary">*</span>
                      </label>
                      <input
                        id="checkout-fullname"
                        autoComplete="name"
                        aria-invalid={
                          step2Attempted &&
                          (!fullname.trim() || fullname.trim().length < 2)
                        }
                        aria-describedby={
                          step2Attempted &&
                          (!fullname.trim() || fullname.trim().length < 2)
                            ? "checkout-fullname-error"
                            : undefined
                        }
                        className={`bg-content1 border ${
                          step2Attempted &&
                          (!fullname.trim() || fullname.trim().length < 2)
                            ? "border-danger"
                            : "border-default-300"
                        } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder-default-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                        placeholder="Ej. Carlos Mendoza"
                        type="text"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                      />
                      {step2Attempted &&
                        (!fullname.trim() || fullname.trim().length < 2) && (
                          <p
                            id="checkout-fullname-error"
                            role="alert"
                            className="text-xs text-danger mt-1"
                          >
                            {!fullname.trim()
                              ? "Ingresa tu nombre completo."
                              : "Ingresa tu nombre completo (mínimo 2 caracteres)."}
                          </p>
                        )}
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-email"
                        className="block text-xs font-bold text-default-700 mb-1.5"
                      >
                        Correo electrónico{" "}
                        <span className="text-primary">*</span>
                      </label>
                      <input
                        id="checkout-email"
                        autoComplete="email"
                        inputMode="email"
                        readOnly={isEmailLocked}
                        disabled={isEmailLocked}
                        aria-invalid={
                          identityStatus === "self" ||
                          (step2Attempted &&
                            (!email.trim() ||
                              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))
                        }
                        aria-describedby={
                          identityStatus === "self" ||
                          (step2Attempted &&
                            (!email.trim() ||
                              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))
                            ? "checkout-email-error"
                            : undefined
                        }
                        className={`bg-content1 border ${
                          identityStatus === "self" ||
                          (step2Attempted &&
                            (!email.trim() ||
                              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))
                            ? "border-danger text-danger"
                            : "border-default-300"
                        } ${
                          isEmailLocked ? "opacity-75 cursor-not-allowed bg-default-100" : ""
                        } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder-default-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                        placeholder="ejemplo@gmail.com"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          if (!isEmailLocked) {
                            setEmail(e.target.value);
                            setIdentityStatus("idle");
                            setIdentityMessage(null);
                          }
                        }}
                        onBlur={handleEmailBlur}
                      />
                      {isEmailLocked && (
                        <p className="text-xs text-default-500 mt-1">
                          Correo fijado por el músico para este enlace.
                        </p>
                      )}
                      {isCheckingIdentity && (
                        <span className="text-xs text-primary mt-1 block">
                          Verificando...
                        </span>
                      )}
                      {(identityStatus === "self" ||
                        (step2Attempted &&
                          (!email.trim() ||
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                              email.trim(),
                            )))) && (
                        <p
                          id="checkout-email-error"
                          role="alert"
                          className="text-xs text-danger mt-1"
                        >
                          {identityStatus === "self"
                            ? identityMessage ||
                              "No puedes contratarte a ti mismo con tu cuenta de músico."
                            : !email.trim()
                              ? "Ingresa tu correo electrónico."
                              : "Ingresa un correo electrónico válido."}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-phone"
                        className="block text-xs font-bold text-default-700 mb-1.5"
                      >
                        Teléfono celular / WhatsApp{" "}
                        <span className="text-primary">*</span>
                      </label>
                      <input
                        id="checkout-phone"
                        autoComplete="tel"
                        inputMode="tel"
                        aria-invalid={
                          step2Attempted &&
                          (!phone.trim() || phone.trim().length < 6)
                        }
                        aria-describedby={
                          step2Attempted &&
                          (!phone.trim() || phone.trim().length < 6)
                            ? "checkout-phone-error"
                            : undefined
                        }
                        className={`bg-content1 border ${
                          step2Attempted &&
                          (!phone.trim() || phone.trim().length < 6)
                            ? "border-danger"
                            : "border-default-300"
                        } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder-default-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                        placeholder="966 123 456"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      {step2Attempted &&
                        (!phone.trim() || phone.trim().length < 6) && (
                          <p
                            id="checkout-phone-error"
                            role="alert"
                            className="text-xs text-danger mt-1"
                          >
                            {!phone.trim()
                              ? "Ingresa tu teléfono de contacto."
                              : "Ingresa un teléfono de contacto válido (mínimo 6 caracteres)."}
                          </p>
                        )}
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-doc"
                        className="block text-xs font-bold text-default-700 mb-1.5"
                      >
                        Documento de identidad (DNI/CE, opcional)
                      </label>
                      <input
                        id="checkout-doc"
                        inputMode="numeric"
                        aria-invalid={
                          (step2Attempted || step3Attempted) &&
                          Boolean(documentNumber.trim()) &&
                          (documentNumber.trim().length < 8 ||
                            documentNumber.trim().length > 20)
                        }
                        aria-describedby={
                          (step2Attempted || step3Attempted) &&
                          Boolean(documentNumber.trim()) &&
                          (documentNumber.trim().length < 8 ||
                            documentNumber.trim().length > 20)
                            ? "checkout-doc-error"
                            : undefined
                        }
                        className={`bg-content1 border ${
                          (step2Attempted || step3Attempted) &&
                          Boolean(documentNumber.trim()) &&
                          (documentNumber.trim().length < 8 ||
                            documentNumber.trim().length > 20)
                            ? "border-danger"
                            : "border-default-300"
                        } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder-default-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                        maxLength={20}
                        placeholder="8 dígitos"
                        type="text"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                      />
                      {(step2Attempted || step3Attempted) &&
                        Boolean(documentNumber.trim()) &&
                        (documentNumber.trim().length < 8 ||
                          documentNumber.trim().length > 20) && (
                          <p
                            id="checkout-doc-error"
                            role="alert"
                            className="text-xs text-danger mt-1"
                          >
                            El documento de identidad debe tener entre 8 y 20
                            caracteres, o déjalo vacío si es opcional.
                          </p>
                        )}
                    </div>
                  </div>

                  {identityStatus === "new" && !sessionUserMatchesEmail && (
                    <div
                      role="status"
                      className="bg-primary/10 p-3.5 rounded-xl border border-primary/20 text-xs text-primary-text font-medium"
                    >
                      Crearás tu reserva con este correo. Al confirmar el pago
                      te enviaremos un enlace para activar tu cuenta y consultar
                      el estado de tu reserva.
                    </div>
                  )}

                  {(identityStatus === "exists_verified" ||
                    identityStatus === "check_error") && (
                    <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 flex flex-col gap-3">
                      <label
                        htmlFor="checkout-otp"
                        className="text-sm font-medium text-foreground"
                      >
                        {identityMessage ||
                          "Este correo ya está registrado. Hemos enviado un código a tu correo para verificar tu identidad."}
                      </label>
                      <input
                        id="checkout-otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-invalid={
                          step2Attempted &&
                          identityStatus === "exists_verified" &&
                          !otp.trim()
                        }
                        aria-describedby={
                          step2Attempted &&
                          identityStatus === "exists_verified" &&
                          !otp.trim()
                            ? "checkout-otp-error"
                            : undefined
                        }
                        className={`bg-content1 border ${
                          step2Attempted &&
                          identityStatus === "exists_verified" &&
                          !otp.trim()
                            ? "border-danger"
                            : "border-primary/30"
                        } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder-default-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                        placeholder="Código OTP (000000)"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                      {step2Attempted &&
                        identityStatus === "exists_verified" &&
                        !otp.trim() && (
                          <p
                            id="checkout-otp-error"
                            role="alert"
                            className="text-xs text-danger"
                          >
                            Ingresa el código OTP enviado a tu correo.
                          </p>
                        )}
                      <button
                        type="button"
                        onClick={() => void handleSendOtp()}
                        className="text-xs text-primary self-start font-semibold min-h-10 px-2"
                      >
                        {identityStatus === "check_error"
                          ? "Enviar código OTP a mi correo"
                          : "Reenviar código"}
                      </button>
                    </div>
                  )}

                  {(identityStatus === "exists_unverified" ||
                    identityStatus === "check_error") && (
                    <div className="bg-warning/10 p-4 rounded-xl border border-warning/20 flex flex-col gap-3">
                      <label
                        htmlFor="checkout-password"
                        className="text-sm font-medium text-foreground"
                      >
                        {identityStatus === "check_error"
                          ? "O si tu cuenta usa contraseña, ingrésala aquí:"
                          : identityMessage ||
                            "Este correo ya está registrado pero requiere contraseña."}
                      </label>
                      <input
                        id="checkout-password"
                        autoComplete="current-password"
                        aria-invalid={
                          step2Attempted &&
                          identityStatus === "exists_unverified" &&
                          !password
                        }
                        aria-describedby={
                          step2Attempted &&
                          identityStatus === "exists_unverified" &&
                          !password
                            ? "checkout-password-error"
                            : undefined
                        }
                        className={`bg-content1 border ${
                          step2Attempted &&
                          identityStatus === "exists_unverified" &&
                          !password
                            ? "border-danger"
                            : "border-warning/30"
                        } w-full rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder-default-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                        type="password"
                        placeholder="Tu contraseña de Chivapp"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      {step2Attempted &&
                        identityStatus === "exists_unverified" &&
                        !password && (
                          <p
                            id="checkout-password-error"
                            role="alert"
                            className="text-xs text-danger"
                          >
                            Ingresa tu contraseña para continuar.
                          </p>
                        )}
                    </div>
                  )}

                  <div className="pt-3 flex justify-between items-center gap-3">
                    <button
                      className="text-xs text-default-500 hover:text-foreground px-3 py-2 min-h-11 font-semibold transition-colors"
                      onClick={() => goToStep(1)}
                      type="button"
                    >
                      ← Volver al paso 1
                    </button>
                    <button
                      className="px-7 py-3 min-h-11 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center gap-2 shadow-md transition-all"
                      onClick={() => goToStep(3)}
                      type="button"
                    >
                      <span>
                        {isDirectMode
                          ? "Continuar al paso 3: Contrato y firma"
                          : "Continuar al paso 3: Pago"}
                      </span>
                      <Icon
                        icon="lucide:arrow-right"
                        className="w-4 h-4 stroke-[3]"
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PASO 3 */}
            <div
              className={`bg-content1/95 backdrop-blur-xl rounded-3xl transition-all duration-300 overflow-hidden shadow-xl relative ${
                activeStep === 3
                  ? "border border-primary/50"
                  : "border border-divider"
              }`}
            >
              <button
                type="button"
                aria-expanded={activeStep === 3}
                disabled={!completedSteps.has(2) && activeStep < 3}
                onClick={() => {
                  if (completedSteps.has(2)) goToStep(3);
                }}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-default-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border font-bold text-sm ${
                      paymentCompleted
                        ? "bg-success text-success-foreground border-success"
                        : activeStep === 3
                          ? "bg-primary text-primary-foreground border-primary shadow-glow ring-4 ring-primary/20"
                          : "bg-default-100 text-default-600 border-divider"
                    }`}
                  >
                    {paymentCompleted ? (
                      <Icon icon="lucide:check" className="w-4 h-4 stroke-[3]" />
                    ) : (
                      3
                    )}
                  </div>
                  <div>
                    <h2
                      id="checkout-step-3-heading"
                      tabIndex={-1}
                      className="text-base font-bold text-foreground flex items-center gap-2 outline-none"
                    >
                      {isDirectMode
                        ? "3. Firma de contrato y confirmación"
                        : "3. Confirmación y pago"}
                    </h2>
                    <p className="text-xs text-default-500">
                      {isDirectMode
                        ? "Revisa tu contrato digital, firma y confirma tu reserva"
                        : "Revisa el contrato y reserva"}
                    </p>
                  </div>
                </div>
              </button>

              {activeStep === 3 && (
                <div className="p-6 sm:p-7 space-y-6 border-t border-divider">
                  {paymentCompleted && booking ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="p-6 rounded-2xl bg-success/10 border border-success/30 space-y-5"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-success/20 text-success-text flex items-center justify-center shrink-0">
                          <Icon icon="lucide:check-circle-2" className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h3
                            id="checkout-confirmed-heading"
                            tabIndex={-1}
                            className="text-lg font-extrabold text-foreground outline-none"
                          >
                            {isDirectMode
                              ? "¡Reserva confirmada y contrato firmado!"
                              : "¡Reserva confirmada y pago protegido!"}
                          </h3>
                          <p className="text-xs sm:text-sm text-default-600">
                            {isDirectMode ? (
                              <>
                                Tu contrato digital por{" "}
                                <strong className="text-foreground">
                                  {formatCurrency(linkData.price)}
                                </strong>{" "}
                                quedó firmado y tu fecha está oficialmente reservada en la agenda de{" "}
                                <strong className="text-foreground">
                                  {linkData.musician.stage_name}
                                </strong>
                                .
                              </>
                            ) : (
                              <>
                                Tu pago por{" "}
                                <strong className="text-foreground">
                                  {formatCurrency(totalPayable)}
                                </strong>{" "}
                                fue procesado y permanece protegido por
                                Chivapp hasta que finalice tu presentación con{" "}
                                <strong className="text-foreground">
                                  {linkData.musician.stage_name}
                                </strong>
                                .
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-content1 p-4 border border-divider text-xs space-y-2">
                        <p className="font-bold text-foreground">
                          Resumen de tu reserva
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-default-600">
                          <div>
                            <span className="text-default-500">Artista:</span>{" "}
                            <strong className="text-foreground">
                              {linkData.musician.stage_name}
                            </strong>
                          </div>
                          <div>
                            <span className="text-default-500">
                              Fecha y hora:
                            </span>{" "}
                            <strong className="text-foreground">
                              {formatPeruDate(booking.event_date || eventDate)} ·{" "}
                              {(booking.start_time || startTime).slice(0, 5)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-default-500">Evento:</span>{" "}
                            <strong className="text-foreground">
                              {booking.event_type || eventType}
                            </strong>
                          </div>
                          <div>
                            <span className="text-default-500">Ubicación:</span>{" "}
                            <strong className="text-foreground">
                              {booking.location_address || location?.address}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-default-700">
                        <p className="font-bold text-foreground">
                          Próximos pasos:
                        </p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>
                            Hemos enviado la constancia de tu reserva a{" "}
                            <strong>{email}</strong>. Si es tu primera reserva en
                            Chivapp, revisa ese correo para{" "}
                            <strong>activar tu cuenta y crear tu contraseña</strong>.
                          </li>
                          <li>
                            Desde el panel de tu reserva puedes descargar el
                            contrato firmado en PDF y coordinar detalles con el
                            artista.
                          </li>
                          <li>
                            Al finalizar el evento, deja tu reseña para cerrar
                            la reserva y liberar el pago al músico.
                          </li>
                        </ol>
                      </div>

                      <div className="pt-1 flex flex-wrap gap-3">
                        <Button
                          color="primary"
                          className="font-bold"
                          onPress={() =>
                            router.push(`/contractor/bookings/${booking.id}`)
                          }
                        >
                          Ir al detalle de mi reserva
                        </Button>
                        <Button
                          variant="bordered"
                          className="font-semibold bg-content1"
                          onPress={() => setIsShareAchievementOpen(true)}
                          startContent={
                            <Icon icon="lucide:share-2" className="w-4 h-4" />
                          }
                        >
                          Compartir logro en redes / historias
                        </Button>
                      </div>
                    </div>
                  ) : (
                  <>
                  <div className="p-4 sm:p-5 rounded-2xl bg-default-50 border border-divider text-xs text-default-600 space-y-4">
                    <div className="space-y-2.5">
                      <div className="font-extrabold text-foreground flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Icon
                            icon="lucide:file-text"
                            className="w-4 h-4 text-primary"
                          />{" "}
                          {linkData.contract_template_title ||
                            "Contrato de prestación de servicios musicales"}
                        </span>
                        <Button
                          size="sm"
                          variant="light"
                          color="primary"
                          onPress={() => setIsContractPreviewOpen(true)}
                          className="font-semibold text-xs"
                        >
                          Ver contrato completo en pantalla amplia
                        </Button>
                      </div>
                      {!isClient && linkData.contract_template_body?.trim() ? (
                        <div
                          aria-busy="true"
                          aria-label="Cargando contrato"
                          className="h-32 animate-pulse rounded-xl border border-divider bg-default-100 p-4"
                        />
                      ) : renderedContractHtml ? (
                        <div
                          tabIndex={0}
                          aria-label="Contrato de prestación de servicios musicales"
                          className="contract-doc contract-doc-page max-h-64 overflow-y-auto rounded-xl border border-divider bg-white p-4 text-xs leading-relaxed text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          dangerouslySetInnerHTML={{
                            __html: renderedContractHtml,
                          }}
                        />
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-default-600 text-xs">
                          <li>
                            El pago asegura la fecha en la agenda exclusiva de{" "}
                            <strong className="text-primary font-bold">
                              {linkData.musician.stage_name}
                            </strong>
                            .
                          </li>
                          <li>
                            Llegada garantizada a la hora coordinada con
                            vestimenta completa.
                          </li>
                          <li>Confirmación inmediata enviada por correo.</li>
                        </ul>
                      )}
                    </div>

                    {isDirectMode ? (
                      <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-3.5 text-xs text-default-700 space-y-1.5">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                          <Icon
                            icon="lucide:handshake"
                            className="w-4 h-4 text-secondary"
                          />
                          Modalidad de acuerdo directo con el artista (0 % comisión Chivapp)
                        </p>
                        <p>
                          El pago de los honorarios ({formatCurrency(linkData.price)}) se gestiona directamente con{" "}
                          <strong>{linkData.musician.stage_name}</strong>
                          {directAdvanceAmount != null
                            ? ` (adelanto registrado: ${formatCurrency(directAdvanceAmount)} · saldo en el evento: ${formatCurrency(directRemainingBalance)})`
                            : ""}
                          . Al firmar este contrato digital, tu reserva queda confirmada de inmediato sin cobros en línea adicionales.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-xs text-default-600 space-y-1.5">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                          <Icon
                            icon="lucide:shield-check"
                            className="w-4 h-4 text-primary"
                          />
                          Política de cancelación y protección del pago
                        </p>
                        <p>
                          Tu pago queda protegido por Chivapp hasta finalizar el
                          evento. Si cancelas con{" "}
                          {linkData.cancellation_policy?.full_refund_min_days ?? 15}{" "}
                          días calendario o más de anticipación recibes el 100% de
                          la tarifa del artista; entre{" "}
                          {linkData.cancellation_policy?.partial_refund_min_days ?? 7}{" "}
                          y{" "}
                          {(linkData.cancellation_policy?.full_refund_min_days ?? 15) - 1}{" "}
                          días antes, el{" "}
                          {linkData.cancellation_policy?.partial_refund_percent ?? 50}
                          % de la tarifa; con menos de{" "}
                          {linkData.cancellation_policy?.partial_refund_min_days ?? 7}{" "}
                          días no aplica reembolso salvo cancelación o
                          inasistencia del músico (reembolso del 100% de la
                          tarifa). La comisión de servicio y el costo de la
                          pasarela no son reembolsables.
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-divider">
                      <SignaturePad
                        value={signature || ""}
                        onChange={setSignature}
                        label="Firma del cliente"
                        helperText="Dibuja tu firma o escribe tu nombre para aceptar el contrato."
                        isInvalid={step3Attempted && !signature}
                        errorMessage="Firma o escribe tu nombre para aceptar el contrato de actuación."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="checkout-terms"
                        className="flex items-start sm:items-center gap-2.5 pt-2 text-foreground cursor-pointer select-none"
                      >
                        <input
                          id="checkout-terms"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          aria-invalid={step3Attempted && !termsAccepted}
                          aria-describedby={
                            step3Attempted && !termsAccepted
                              ? "checkout-terms-error"
                              : undefined
                          }
                          className="w-4 h-4 rounded text-primary border-default-400 mt-0.5 sm:mt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          type="checkbox"
                        />
                        <span className="text-xs">
                          He leído y acepto el{" "}
                          <button
                            type="button"
                            onClick={() => setIsContractPreviewOpen(true)}
                            className="text-primary hover:underline font-semibold"
                          >
                            contrato de prestación de servicios musicales
                          </button>
                          , las{" "}
                          <a
                            href="/legal/reembolsos"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-semibold"
                          >
                            políticas de cancelación y reembolso
                          </a>{" "}
                          y los{" "}
                          <a
                            href="/legal/terminos"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-semibold"
                          >
                            términos y condiciones
                          </a>
                          .
                        </span>
                      </label>
                      {step3Attempted && !termsAccepted && (
                        <p
                          id="checkout-terms-error"
                          role="alert"
                          className="text-xs text-danger"
                        >
                          Debes aceptar los términos para continuar.
                        </p>
                      )}
                    </div>
                  </div>

                  {pendingPayment ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="p-4 rounded-2xl bg-warning/10 border border-warning/40 text-xs text-default-700 space-y-1.5"
                    >
                      <p className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Icon
                          icon="lucide:clock"
                          className="w-4 h-4 text-warning"
                        />
                        Tienes un pago en proceso de verificación
                      </p>
                      <p>{pendingPayment.message}</p>
                    </div>
                  ) : null}

                  <div className="p-4 sm:p-5 rounded-2xl bg-default-100 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-default-500 block font-medium">
                        {isDirectMode
                          ? "Honorarios acordados directamente con el artista (sin cobro en este enlace):"
                          : "Total a pagar ahora (Yape o tarjeta vía Mercado Pago):"}
                      </span>
                      <span className="text-3xl font-black text-primary">
                        {formatCurrency(totalPayable)}
                      </span>
                      {isDirectMode && directAdvanceAmount != null && (
                        <span className="text-xs text-success-text font-semibold block mt-0.5">
                          Adelanto abonado: {formatCurrency(directAdvanceAmount)} · Saldo en el evento: {formatCurrency(directRemainingBalance)}
                        </span>
                      )}
                    </div>
                    <button
                      className="w-full sm:w-auto min-h-11 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                      id="btn-confirm-booking"
                      type="button"
                      onClick={handlePayAndConfirm}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Spinner size="sm" color="current" />
                      ) : (
                        <Icon
                          icon={
                            isDirectMode
                              ? "lucide:file-check-2"
                              : "lucide:lock"
                          }
                          className="w-4 h-4 stroke-[3]"
                        />
                      )}
                      <span>
                        {isDirectMode
                          ? "Firmar contrato y confirmar reserva"
                          : pendingPayment
                            ? "Ver estado del pago en proceso"
                            : "Pagar y confirmar"}
                      </span>
                    </button>
                  </div>
                  {!pendingPayment ? (
                    <div className="flex justify-start">
                      <button
                        className="text-xs text-default-500 hover:text-foreground px-3 py-2 min-h-11 font-semibold transition-colors"
                        onClick={() => void goToStep(2)}
                        type="button"
                      >
                        ← Volver al paso 2
                      </button>
                    </div>
                  ) : null}
                  </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* COLUMNA DERECHA: Resumen */}
          <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
            <div className="bg-content1/95 backdrop-blur-xl rounded-3xl p-6 border border-primary/30 shadow-xl relative space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-divider">
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Icon icon="lucide:receipt" className="w-4 h-4 text-primary" />{" "}
                  Resumen de tu reserva
                </h2>
              </div>

              <div className="bg-default-50 border border-divider rounded-2xl p-4 space-y-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-default-500">
                    Honorarios del músico
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(linkData.price)}
                  </span>
                </div>
                {isDirectMode ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-default-500">
                        Comisión Chivapp (Pago directo)
                      </span>
                      <span className="font-semibold text-success-text">
                        S/ 0.00
                      </span>
                    </div>
                    {directAdvanceAmount != null && (
                      <>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-default-500">
                            Adelanto registrado
                          </span>
                          <span className="font-semibold text-success-text">
                            {formatCurrency(directAdvanceAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-default-500">
                            Saldo en el evento
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(directRemainingBalance)}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  serviceFee > 0.01 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-default-500">
                        Tarifa de servicio (incluye comisión y procesamiento)
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(serviceFee)}
                      </span>
                    </div>
                  )
                )}
                <div className="h-px w-full bg-divider my-1"></div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground font-bold">
                    {isDirectMode ? "Tarifa total acordada" : "Total a pagar"}
                  </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(totalPayable)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-primary font-extrabold block">
                    {isDirectMode
                      ? "Acuerdo directo con el artista"
                      : "Costo total del evento"}
                  </span>
                  <span className="text-xs text-success font-semibold flex items-center gap-1.5">
                    <Icon icon="lucide:check-circle" className="w-3.5 h-3.5" />{" "}
                    {isDirectMode
                      ? "Solo firma digital · Sin cobro en este link"
                      : "Pago único y seguro"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-3xl sm:text-4xl font-black text-primary tracking-tight flex items-baseline sm:justify-end gap-1">
                    {formatCurrency(totalPayable)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/20 text-success-text flex items-center justify-center flex-shrink-0">
                  <Icon icon="lucide:lock" className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-extrabold text-foreground block">
                    Reserva 100% protegida
                  </span>
                  <span className="text-default-600 text-xs">
                    Contrato directo garantizado por Chivapp
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal de vista previa del contrato de actuación */}
      <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
        isOpen={isContractPreviewOpen}
        onOpenChange={setIsContractPreviewOpen}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {linkData.contract_template_title ||
                  "Contrato de prestación de servicios musicales"}
              </ModalHeader>
              <ModalBody className="text-sm text-default-700 space-y-3">
                {renderedContractHtml ? (
                  <div
                    className="contract-doc contract-doc-page rounded-xl border border-divider bg-white p-4 text-xs sm:text-sm leading-relaxed text-zinc-900"
                    dangerouslySetInnerHTML={{
                      __html: renderedContractHtml,
                    }}
                  />
                ) : (
                  <>
                    <p>
                      <strong>Artista / agrupación:</strong>{" "}
                      {linkData.musician.stage_name}
                    </p>
                    <p>
                      <strong>Contratista:</strong>{" "}
                      {fullname || "Por completar"} ({email || "sin correo"})
                    </p>
                    <p>
                      <strong>Fecha y hora del evento:</strong>{" "}
                      {eventDate || "Por definir"} a las{" "}
                      {startTime || "Por definir"}
                    </p>
                    <p>
                      <strong>Tipo de evento y ubicación:</strong>{" "}
                      {eventType || "Por definir"} —{" "}
                      {location?.address || "Dirección por definir"}
                    </p>
                    <p>
                      <strong>Monto total acordado:</strong>{" "}
                      {formatCurrency(totalPayable)} (incluye honorarios de{" "}
                      {formatCurrency(linkData.price)} y tarifa de servicio de{" "}
                      {formatCurrency(serviceFee)}).
                    </p>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Entendido
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {booking && (
        <BookingMercadoPagoModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          booking={booking}
          amount={totalPayable}
          signatureImageUrl={uploadedSignatureUrl || signature}
          contractBodySha256={contractBodySha256}
          onPendingChange={setPendingPayment}
          onSuccess={() => {
            setPendingPayment(null);
            setIsPaymentModalOpen(false);
            setPaymentCompleted(true);
          }}
        />
      )}

      {booking && (
        <BookingAchievementShareModal
          isOpen={isShareAchievementOpen}
          onOpenChange={setIsShareAchievementOpen}
          role="contractor"
          musicianName={linkData.musician.stage_name}
          eventType={booking.event_type || eventType}
          eventDate={booking.event_date || eventDate}
          startTime={booking.start_time || startTime}
          city={
            booking.location_city ||
            location?.city ||
            linkData.musician.location_city
          }
        />
      )}
    </div>
  );
}
