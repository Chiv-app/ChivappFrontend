"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Tabs,
    Tab,
    Chip,
    Spinner,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { useMercadoPago } from "@/hooks/use-mercadopago";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/booking-labels";
import {
    checkMercadoPagoPaymentStatus,
    createMercadoPagoPreference,
    processMercadoPagoPayment,
} from "@/lib/payments";
import type { BookingOut } from "@/types/api";

const PENDING_MP_STATUSES = new Set([
    "pending",
    "in_process",
    "sync_pending",
    "reconciliation_required",
    "authorized",
]);

function isSafeMercadoPagoRedirectUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== "https:") return false;
        const host = parsed.hostname.toLowerCase();
        return (
            host === "mercadopago.com" ||
            host.endsWith(".mercadopago.com") ||
            host.endsWith(".mercadopago.com.pe") ||
            host.endsWith(".mercadopago.cl") ||
            host.endsWith(".mercadopago.com.ar") ||
            host.endsWith(".mercadopago.com.co") ||
            host.endsWith(".mercadopago.com.mx") ||
            host.endsWith(".mercadolibre.com")
        );
    } catch {
        return false;
    }
}

type Props = {
    isOpen: boolean;
    onClose: () => void;
    booking: BookingOut;
    amount: number;
    signatureImageUrl?: string | null;
    contractBodySha256?: string | null;
    onSuccess: (booking?: BookingOut) => void;
    onPendingChange?: (pending: { paymentId: string | null; message: string } | null) => void;
};

function translateMercadoPagoError(raw?: string | null, fallback?: string): string {
    const defaultMsg =
        fallback ||
        "El pago no pudo ser aprobado por el banco emisor. Por favor verifica tus datos o intenta con otro medio de pago.";
    if (!raw) return defaultMsg;
    const normalized = raw.toLowerCase();

    if (normalized.includes("cc_rejected_high_risk") || normalized.includes("high_risk")) {
        return "Por seguridad, la pasarela rechazó esta operación. Intenta con otra tarjeta, usa Yape o evita pagar desde una cuenta asociada al mismo titular de cobro.";
    }
    if (normalized.includes("cc_rejected_insufficient_amount") || normalized.includes("insufficient_amount")) {
        return "La tarjeta no cuenta con saldo o línea disponible suficiente para cubrir el monto.";
    }
    if (
        normalized.includes("cc_rejected_bad_filled_security_code") ||
        normalized.includes("bad_filled_security_code")
    ) {
        return "El código de seguridad (CVV) de la tarjeta es incorrecto. Revísalo e intenta nuevamente.";
    }
    if (normalized.includes("cc_rejected_bad_filled_date") || normalized.includes("bad_filled_date")) {
        return "La fecha de vencimiento de la tarjeta es incorrecta. Revísala e intenta nuevamente.";
    }
    if (
        normalized.includes("cc_rejected_bad_filled_card_number") ||
        normalized.includes("bad_filled_card_number")
    ) {
        return "El número de la tarjeta es incorrecto. Revísalo e intenta nuevamente.";
    }
    if (normalized.includes("cc_rejected_call_for_authorize") || normalized.includes("call_for_authorize")) {
        return "Tu banco requiere que autorices compras por internet o por este monto antes de reintentar.";
    }
    if (normalized.includes("cc_rejected_card_disabled") || normalized.includes("card_disabled")) {
        return "La tarjeta se encuentra inactiva o bloqueada para compras en línea. Actívala en la app de tu banco.";
    }
    if (normalized.includes("cc_rejected_max_attempts") || normalized.includes("max_attempts")) {
        return "Superaste el límite de intentos permitidos con esta tarjeta. Prueba con Yape u otra tarjeta.";
    }
    if (normalized.includes("cc_rejected_duplicated_payment") || normalized.includes("duplicated_payment")) {
        return "Ya se registró un pago reciente por este mismo monto. Verifica el estado de tu reserva antes de reintentar.";
    }
    if (normalized.includes("cc_rejected_other_reason") || normalized.includes("cc_rejected_")) {
        return "El banco emisor rechazó el cobro. Intenta con otra tarjeta o paga con Yape.";
    }
    return raw;
}

export default function BookingMercadoPagoModal({
    isOpen,
    onClose,
    booking,
    amount,
    signatureImageUrl,
    contractBodySha256,
    onSuccess,
    onPendingChange,
}: Props) {
    const { user } = useAuth();
    const { isLoaded, loadError, createYapeToken, renderPaymentBrick, getDeviceSessionId } = useMercadoPago();

    const [selectedTab, setSelectedTab] = useState<string>("yape");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [yapeDocNumber, setYapeDocNumber] = useState("");
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [cardPayerEmail, setCardPayerEmail] = useState<string>(user?.email || "");
    const cardPayerEmailRef = useRef(cardPayerEmail);
    const onSuccessRef = useRef(onSuccess);
    const onCloseRef = useRef(onClose);
    const onPendingChangeRef = useRef(onPendingChange);
    useEffect(() => {
        cardPayerEmailRef.current = cardPayerEmail;
    }, [cardPayerEmail]);
    useEffect(() => {
        onSuccessRef.current = onSuccess;
        onCloseRef.current = onClose;
        onPendingChangeRef.current = onPendingChange;
    }, [onSuccess, onClose, onPendingChange]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processError, setProcessError] = useState<string | null>(null);
    // FE4-01 / FE5-01: estados pendientes / en revisión no deben tratarse como rechazo ni permitir doble cobro.
    const [pendingVerification, setPendingVerification] = useState<{
        paymentId: string | null;
        message: string;
    } | null>(null);
    const hasPendingVerification = pendingVerification !== null;
    const lastBookingIdRef = useRef<string | null>(booking.id);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    // 409: el monto calculado por el servidor cambió; hay que recargar para ver el nuevo total.
    const [needsReload, setNeedsReload] = useState(false);
    const [brickLoaded, setBrickLoaded] = useState(false);

    const brickControllerRef = useRef<{ unmount: () => void } | null>(null);

    useEffect(() => {
        onPendingChangeRef.current?.(pendingVerification);
    }, [pendingVerification]);

    // Reset transient form fields on modal open, preserving pendingVerification for the same booking (FE5-01)
    useEffect(() => {
        if (isOpen) {
            void Promise.resolve().then(() => {
                setProcessError(null);
                if (lastBookingIdRef.current !== booking.id) {
                    lastBookingIdRef.current = booking.id;
                    setPendingVerification(null);
                }
                setPhoneError(null);
                setOtpError(null);
                setNeedsReload(false);
                setIsProcessing(false);
                setPhoneNumber("");
                setOtp("");
                setYapeDocNumber("");
                if (user?.email) {
                    setCardPayerEmail(user.email);
                }
            });
        }
    }, [isOpen, user?.email, booking.id]);

    // FE5-01: Al abrir el modal sin estado pendiente local, consultar el backend por si ya existe un pago en curso
    useEffect(() => {
        if (!isOpen || hasPendingVerification) return;
        let cancelled = false;
        void checkMercadoPagoPaymentStatus(booking.id)
            .then((statusRes) => {
                if (cancelled) return;
                if (statusRes.is_approved || statusRes.booking_status === "payment_retained") {
                    onSuccessRef.current();
                    onCloseRef.current();
                } else if (
                    Boolean(statusRes.payment_id) &&
                    ((statusRes.status && PENDING_MP_STATUSES.has(statusRes.status)) ||
                        (statusRes.status_detail && PENDING_MP_STATUSES.has(statusRes.status_detail)))
                ) {
                    setPendingVerification({
                        paymentId: statusRes.payment_id || null,
                        message:
                            statusRes.message ||
                            "Tu pago está siendo verificado por Mercado Pago. No realices un nuevo cobro mientras confirmamos el estado.",
                    });
                }
            })
            .catch(() => {
                // Ignorar si aún no hay pagos iniciados o error de red transitorio
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, hasPendingVerification, booking.id]);

    // FE4-01 / FE6-04: consultar periódicamente el estado cuando el pago quedó pendiente de confirmación (incluso si se cierra el modal)
    useEffect(() => {
        if (!pendingVerification) return;
        let cancelled = false;
        const interval = setInterval(async () => {
            try {
                const statusRes = await checkMercadoPagoPaymentStatus(
                    booking.id,
                    pendingVerification.paymentId,
                );
                if (cancelled) return;
                if (statusRes.is_approved || statusRes.booking_status === "payment_retained") {
                    addToast({
                        title: "¡Pago confirmado!",
                        description: "Tu reserva ha sido confirmada exitosamente.",
                        color: "success",
                    });
                    onSuccessRef.current();
                    onCloseRef.current();
                } else if (statusRes.status === "not_started") {
                    setPendingVerification(null);
                } else if (statusRes.status === "rejected" || statusRes.status === "cancelled") {
                    setPendingVerification(null);
                    setProcessError(
                        statusRes.message ||
                            "El pago fue rechazado por la entidad financiera. Puedes intentar con otro medio.",
                    );
                }
            } catch {
                // Silenciar errores transitorios de red durante el sondeo
            }
        }, 4000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [pendingVerification, booking.id]);

    const handleConflict409 = useCallback(async (err: unknown): Promise<boolean> => {
        if (!(err instanceof ApiError && err.status === 409)) return false;
        if (/pago en proceso/i.test(err.message)) {
            try {
                const statusRes = await checkMercadoPagoPaymentStatus(booking.id);
                setPendingVerification({
                    paymentId: statusRes.payment_id ?? null,
                    message: statusRes.message || err.message,
                });
            } catch {
                setPendingVerification({
                    paymentId: null,
                    message: err.message,
                });
            }
            return true;
        }
        setNeedsReload(true);
        return false;
    }, [booking.id]);

    async function handleManualStatusCheck() {
        if (!pendingVerification) return;
        setIsCheckingStatus(true);
        try {
            const statusRes = await checkMercadoPagoPaymentStatus(
                booking.id,
                pendingVerification.paymentId,
            );
            if (statusRes.is_approved || statusRes.booking_status === "payment_retained") {
                addToast({
                    title: "¡Pago confirmado!",
                    description: "Tu reserva ha sido confirmada exitosamente.",
                    color: "success",
                });
                onSuccessRef.current();
                onCloseRef.current();
            } else if (statusRes.status === "not_started") {
                setPendingVerification(null);
            } else if (statusRes.status === "rejected" || statusRes.status === "cancelled") {
                setPendingVerification(null);
                setProcessError(
                    statusRes.message ||
                        "El pago fue rechazado por la entidad financiera. Puedes intentar con otro medio.",
                );
            } else {
                addToast({
                    title: "Aún en verificación",
                    description:
                        statusRes.message ||
                        "Mercado Pago sigue procesando la operación. Te avisaremos en cuanto se acredite.",
                    color: "warning",
                });
            }
        } catch {
            addToast({
                title: "No se pudo consultar el estado",
                description: "Revisa tu conexión e inténtalo en unos segundos.",
                color: "warning",
            });
        } finally {
            setIsCheckingStatus(false);
        }
    }

    // Mount Payment Brick when Card tab is selected and not in pending verification (FE5-02)
    useEffect(() => {
        let isMounted = true;

        if (isOpen && selectedTab === "card" && isLoaded && !hasPendingVerification) {
            void Promise.resolve().then(() => {
                if (isMounted) setBrickLoaded(false);
            });

            // Clean previous brick if exists
            if (brickControllerRef.current) {
                try {
                    brickControllerRef.current.unmount();
                } catch {
                    // Ignore unmount error
                }
                brickControllerRef.current = null;
            }

            const timer = setTimeout(async () => {
                const container = document.getElementById("mp-payment-brick-container");
                if (!container || !isMounted) return;

                // Ensure container is empty before creating a new Brick instance
                container.innerHTML = "";

                try {
                    const controller = await renderPaymentBrick({
                        containerId: "mp-payment-brick-container",
                        amount: amount,
                        payerEmail: cardPayerEmailRef.current.trim() || undefined,
                        onReady: () => {
                            if (isMounted) {
                                setBrickLoaded(true);
                            }
                        },
                        onSubmit: async (param: Record<string, unknown>) => {
                            // Support both cardPayment (direct formData) and payment ({ formData })
                            const rawForm = (param?.formData || param || {}) as {
                                token?: string;
                                payment_method_id?: string;
                                paymentMethodId?: string;
                                issuer_id?: string;
                                issuerId?: string;
                                installments?: number;
                                transaction_amount?: number;
                                payer?: {
                                    email?: string;
                                    identification?: { type?: string; number?: string };
                                };
                            };
                            const formData = rawForm;
                            const token = formData.token;
                            const paymentMethodId = formData.payment_method_id || formData.paymentMethodId;
                            const issuerId = formData.issuer_id || formData.issuerId;
                            const installments = formData.installments || 1;
                            const resolvedEmail =
                                cardPayerEmailRef.current.trim() ||
                                formData.payer?.email ||
                                user?.email ||
                                undefined;
                            const idType = formData.payer?.identification?.type;
                            const idNumber = formData.payer?.identification?.number;

                            if (!token) {
                                const msg = "No se pudo validar los datos de la tarjeta. Revisa los campos e intenta de nuevo.";
                                setProcessError(msg);
                                throw new Error(msg);
                            }

                            const cardAmount =
                                formData.transaction_amount != null
                                    ? Number(formData.transaction_amount)
                                    : Math.max(1, Number(Number(amount).toFixed(2)) || 1);

                            setIsProcessing(true);
                            setProcessError(null);
                            try {
                                const res = await processMercadoPagoPayment({
                                    booking_id: booking.id,
                                    payment_type: "full",
                                    token: token,
                                    payment_method_id: paymentMethodId,
                                    issuer_id: issuerId,
                                    installments: Number(installments) || 1,
                                    payer_email: resolvedEmail,
                                    device_id: getDeviceSessionId(),
                                    identification_type: idType,
                                    identification_number: idNumber,
                                    signature_image_url: signatureImageUrl,
                                    contract_body_sha256: contractBodySha256 ?? undefined,
                                    amount: cardAmount,
                                });

                                if (res.success && res.status === "approved") {
                                    addToast({
                                        title: "¡Pago aprobado!",
                                        description: "Tu pago con tarjeta fue procesado con éxito.",
                                        color: "success",
                                    });
                                    onSuccessRef.current();
                                    onCloseRef.current();
                                } else if (
                                    (res.status && PENDING_MP_STATUSES.has(res.status)) ||
                                    (res.status_detail && PENDING_MP_STATUSES.has(res.status_detail))
                                ) {
                                    setPendingVerification({
                                        paymentId: res.payment_id || null,
                                        message:
                                            res.message ||
                                            "Tu pago está siendo verificado por Mercado Pago y el banco emisor. No realices un nuevo cobro mientras confirmamos el estado.",
                                    });
                                } else {
                                    const errMsg = translateMercadoPagoError(
                                        res.message,
                                        "El pago no pudo ser aprobado por el banco emisor. Por favor prueba con otra tarjeta.",
                                    );
                                    setProcessError(errMsg);
                                    throw new Error(errMsg);
                                }
                            } catch (err) {
                                if (await handleConflict409(err)) {
                                    return;
                                }
                                const rawMsg = err instanceof Error ? err.message : "Error al procesar el pago con tarjeta.";
                                const errMsg = translateMercadoPagoError(rawMsg, "Error al procesar el pago con tarjeta.");
                                setProcessError(errMsg);
                                throw err;
                            } finally {
                                setIsProcessing(false);
                            }
                        },
                        onError: (error: unknown) => {
                            console.error("Error en Mercado Pago Brick:", error);
                            if (isMounted) {
                                setBrickLoaded(true);
                                const errObj = error as Record<string, unknown> | undefined;
                                const cause = (errObj?.message as string) || (errObj?.cause as string) || "";
                                setProcessError(
                                    cause
                                        ? translateMercadoPagoError(cause)
                                        : "Ocurrió un error en la pasarela de tarjetas. Puedes pagar con Yape o en la web segura de Mercado Pago."
                                );
                            }
                        },
                    });

                    if (isMounted) {
                        brickControllerRef.current = controller;
                    }
                } catch (err) {
                    console.error("No se pudo instanciar Payment Brick:", err);
                    if (isMounted) {
                        setBrickLoaded(true);
                        setProcessError("No se pudo inicializar el formulario de tarjetas. Puedes pagar en la web segura de Mercado Pago con el botón inferior o usar Yape.");
                    }
                }
            }, 150);

            return () => {
                isMounted = false;
                clearTimeout(timer);
                if (brickControllerRef.current) {
                    try {
                        brickControllerRef.current.unmount();
                    } catch {
                        // ignore
                    }
                    brickControllerRef.current = null;
                }
            };
        }
    }, [
        isOpen,
        selectedTab,
        isLoaded,
        hasPendingVerification,
        amount,
        booking.id,
        signatureImageUrl,
        contractBodySha256,
        renderPaymentBrick,
        getDeviceSessionId,
        handleConflict409,
        user?.email,
    ]);

    // Handle Yape Payment
    async function handleYapePayment() {
        setProcessError(null);
        setPhoneError(null);
        setOtpError(null);
        const cleanPhone = phoneNumber.replace(/\D/g, "");
        const cleanOtp = otp.replace(/\D/g, "");

        let hasValidationError = false;
        if (cleanPhone.length !== 9) {
            setPhoneError("Ingresa un número de celular válido de 9 dígitos.");
            hasValidationError = true;
        }
        if (cleanOtp.length !== 6) {
            setOtpError("Ingresa el código de aprobación de 6 dígitos de tu app Yape.");
            hasValidationError = true;
        }
        if (hasValidationError) return;

        setIsProcessing(true);
        try {
            // 1. Tokenizar en Mercado Pago con mp.yape
            const token = await createYapeToken({
                phoneNumber: cleanPhone,
                otp: cleanOtp,
            });

            const yapeAmount = Math.max(1, Number(Number(amount).toFixed(2)) || 1);

            // 2. Procesar el pago en nuestro backend
            const res = await processMercadoPagoPayment({
                booking_id: booking.id,
                payment_type: "full",
                token: token,
                payment_method_id: "yape",
                payer_email: user?.email || undefined,
                device_id: getDeviceSessionId(),
                identification_type: yapeDocNumber.trim() ? "DNI" : undefined,
                identification_number: yapeDocNumber.trim() || undefined,
                signature_image_url: signatureImageUrl,
                contract_body_sha256: contractBodySha256 ?? undefined,
                amount: yapeAmount,
            });

            if (res.success && res.status === "approved") {
                addToast({
                    title: "¡Yapeo exitoso!",
                    description: "Tu reserva ha quedado confirmada inmediatamente.",
                    color: "success",
                });
                onSuccess();
                onClose();
            } else if (
                (res.status && PENDING_MP_STATUSES.has(res.status)) ||
                (res.status_detail && PENDING_MP_STATUSES.has(res.status_detail))
            ) {
                setPendingVerification({
                    paymentId: res.payment_id || null,
                    message:
                        res.message ||
                        "Tu operación con Yape está siendo confirmada por Mercado Pago. No vuelvas a yapear; estamos verificando el estado automáticamente.",
                });
            } else {
                setProcessError(
                    translateMercadoPagoError(
                        res.message,
                        "Tu código de aprobación de Yape no es válido o ha expirado. Genera uno nuevo en tu app.",
                    ),
                );
            }
        } catch (err) {
            if (await handleConflict409(err)) {
                return;
            }
            const rawMsg =
                err instanceof Error ? err.message : "Error al procesar el pago con Yape. Verifica tus datos.";
            setProcessError(translateMercadoPagoError(rawMsg, "Error al procesar el pago con Yape. Verifica tus datos."));
        } finally {
            setIsProcessing(false);
        }
    }

    // Fallback: Checkout Pro
    async function handleCheckoutProRedirect() {
        setIsProcessing(true);
        setProcessError(null);
        try {
            const pref = await createMercadoPagoPreference({
                booking_id: booking.id,
                payment_type: "full",
                signature_image_url: signatureImageUrl,
                contract_body_sha256: contractBodySha256 ?? undefined,
            });
            const redirectUrl = pref.init_point || pref.sandbox_init_point;
            if (redirectUrl && isSafeMercadoPagoRedirectUrl(redirectUrl)) {
                window.location.href = redirectUrl;
            } else {
                throw new Error("No se pudo generar un enlace seguro de Mercado Pago.");
            }
        } catch (err) {
            if (await handleConflict409(err)) {
                setIsProcessing(false);
                return;
            }
            setProcessError(
                err instanceof Error ? err.message : "Error al redirigir a Mercado Pago."
            );
            setIsProcessing(false);
        }
    }

    const paymentLabel = "Pago único";

    return (
        <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
            isOpen={isOpen}
            onClose={() => {
                if (!isProcessing) onClose();
            }}
            size="2xl"
            scrollBehavior="inside"
            backdrop="blur"
            classNames={{
                base: "mx-2 sm:mx-auto max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[calc(100dvh-4rem)] sm:max-h-[92dvh]",
                wrapper: "items-end sm:items-center",
            }}
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 pb-2 pr-10 sm:pr-12">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary-text shrink-0">
                                        <Icon icon="solar:shield-check-bold" className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-xl font-bold text-foreground truncate">
                                            Pago seguro en Chivapp
                                        </h3>
                                        <p className="text-xs text-default-500 line-clamp-1">
                                            Checkout respaldado por Mercado Pago
                                        </p>
                                    </div>
                                </div>
                                <Chip color="success" variant="flat" size="sm" startContent={<Icon icon="solar:lock-bold" />} className="hidden xs:inline-flex">
                                    100% protegido
                                </Chip>
                            </div>
                        </ModalHeader>

                        <ModalBody className="gap-5 py-3">
                            {/* Resumen del Monto */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 gap-3">
                                <div>
                                    <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                                        Concepto a pagar
                                    </span>
                                    <p className="text-sm font-medium text-foreground">
                                        {booking.event_type} · {paymentLabel}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-xs text-default-500">Total a debitar</span>
                                    <p className="text-2xl font-black text-primary">
                                        {formatCurrency(amount)}
                                    </p>
                                </div>
                            </div>

                            {/* Alerta de Error si ocurre */}
                            {processError && (
                                <div
                                    role="alert"
                                    className="p-3.5 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 text-danger-text text-sm flex items-start gap-2.5"
                                >
                                    <Icon icon="solar:danger-triangle-bold" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">No pudimos procesar el pago</p>
                                        <p className="text-xs mt-0.5">{processError}</p>
                                        {needsReload ? (
                                            <Button
                                                size="sm"
                                                color="danger"
                                                variant="flat"
                                                className="mt-2"
                                                startContent={<Icon icon="solar:refresh-bold" className="w-4 h-4" />}
                                                onPress={() => window.location.reload()}
                                            >
                                                Recargar página
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            )}

                            {/* Aviso conciso de validación de pago */}
                            <div className="p-3 rounded-xl bg-default-100/70 border border-default-200 text-default-700 text-xs flex items-start gap-2.5">
                                <Icon icon="solar:shield-check-bold" className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                <p>
                                    Usa un medio de pago a tu nombre. Por seguridad antifraude, Mercado Pago no permite pagar con tarjetas o cuentas Yape asociadas al propio músico.
                                </p>
                            </div>

                            {/* Error de Carga SDK */}
                            {loadError && !pendingVerification && (
                                <div role="alert" className="p-3.5 rounded-xl bg-warning-50 border border-warning-200 text-warning-text text-sm">
                                    {loadError}
                                </div>
                            )}

                            {/* Estado de Pago en Proceso (FE4-01: evita doble cobro) */}
                            {pendingVerification ? (
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className="p-5 rounded-2xl bg-warning-50/70 dark:bg-warning-900/20 border border-warning-300 text-warning-text space-y-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <Spinner size="sm" color="warning" className="mt-0.5 shrink-0" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm text-foreground">
                                                Pago en proceso de verificación
                                            </p>
                                            <p className="text-xs text-default-700 leading-relaxed">
                                                {pendingVerification.message}
                                            </p>
                                            <p className="text-xs text-default-500">
                                                No vuelvas a realizar el pago para evitar un cobro duplicado. Estamos consultando el estado automáticamente.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            color="warning"
                                            variant="flat"
                                            isLoading={isCheckingStatus}
                                            onPress={handleManualStatusCheck}
                                            startContent={!isCheckingStatus && <Icon icon="solar:refresh-bold" className="w-4 h-4" />}
                                        >
                                            Verificar estado del pago
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                            /* Pestañas de Métodos de Pago */
                            <Tabs
                                selectedKey={selectedTab}
                                onSelectionChange={(k) => {
                                    setSelectedTab(k as string);
                                    setProcessError(null);
                                }}
                                color="primary"
                                variant="bordered"
                                className="w-full"
                                classNames={{
                                    tabList: "grid grid-cols-2 w-full p-1",
                                    tab: "min-h-11 py-2 text-xs sm:text-sm",
                                }}
                            >
                                {/* TAB 1: YAPE NATIVO */}
                                <Tab
                                    key="yape"
                                    title={
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <Icon icon="solar:smartphone-bold" className="w-4 h-4 text-purple-600 shrink-0" />
                                            <span className="font-semibold text-purple-700 dark:text-purple-300">Yape</span>
                                            <Chip size="sm" color="secondary" variant="flat" className="h-5 text-xs hidden sm:inline-flex">
                                                Recomendado
                                            </Chip>
                                        </div>
                                    }
                                >
                                    <div className="space-y-4 pt-2">
                                        <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs text-default-700 space-y-1.5">
                                            <div className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300">
                                                <Icon icon="solar:info-circle-bold" className="w-4 h-4" />
                                                ¿Cómo obtener tu código de aprobación?
                                            </div>
                                            <ol className="list-decimal list-inside space-y-1 text-default-600">
                                                <li>Abre tu aplicación <strong>Yape</strong> en tu celular.</li>
                                                <li>Abre el menú y pulsa en <strong>Código de aprobación</strong>.</li>
                                                <li>Copia el código temporal de <strong>6 dígitos</strong> e ingrésalo abajo.</li>
                                            </ol>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Celular registrado en Yape"
                                                placeholder="987654321"
                                                type="tel"
                                                inputMode="numeric"
                                                autoComplete="tel-national"
                                                value={phoneNumber}
                                                onValueChange={(val) => {
                                                    setPhoneNumber(val);
                                                    setPhoneError(null);
                                                }}
                                                maxLength={9}
                                                isInvalid={Boolean(phoneError)}
                                                errorMessage={phoneError || undefined}
                                                startContent={
                                                    <span className="text-default-500 text-sm font-semibold">+51</span>
                                                }
                                                variant="bordered"
                                                isDisabled={isProcessing}
                                            />
                                            <Input
                                                label="DNI del titular de Yape (opcional)"
                                                placeholder="12345678"
                                                type="text"
                                                inputMode="numeric"
                                                value={yapeDocNumber}
                                                onValueChange={setYapeDocNumber}
                                                maxLength={15}
                                                variant="bordered"
                                                isDisabled={isProcessing}
                                                description="Ayuda a validar tu pago de forma segura."
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <Input
                                                label="Código de aprobación (6 dígitos)"
                                                placeholder="123456"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                value={otp}
                                                onValueChange={(val) => {
                                                    setOtp(val);
                                                    setOtpError(null);
                                                }}
                                                maxLength={6}
                                                isInvalid={Boolean(otpError)}
                                                errorMessage={otpError || undefined}
                                                variant="bordered"
                                                classNames={{
                                                    input: "tracking-widest font-mono text-base font-bold",
                                                }}
                                                isDisabled={isProcessing}
                                            />
                                        </div>

                                        <Button
                                            color="secondary"
                                            className="w-full font-bold bg-[#742284] hover:bg-[#5e1b6b] text-white shadow-lg shadow-purple-500/20 py-6"
                                            size="lg"
                                            onPress={handleYapePayment}
                                            isLoading={isProcessing}
                                            isDisabled={!isLoaded}
                                            startContent={!isProcessing && <Icon icon="solar:check-circle-bold" className="w-5 h-5" />}
                                        >
                                            Yapear {formatCurrency(amount)}
                                        </Button>
                                    </div>
                                </Tab>

                                {/* TAB 2: TARJETAS DE CRÉDITO / DÉBITO */}
                                <Tab
                                    key="card"
                                    title={
                                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                            <Icon icon="solar:card-2-bold" className="w-4 h-4 text-primary shrink-0" />
                                            <span className="font-semibold truncate">
                                                <span className="hidden sm:inline">Tarjeta débito / crédito</span>
                                                <span className="sm:hidden">Tarjeta</span>
                                            </span>
                                        </div>
                                    }
                                >
                                    <div className="space-y-3 pt-2">
                                        <p className="text-xs text-default-500">
                                            Aceptamos Visa, Mastercard, American Express y Diners. Transacción procesada de forma encriptada.
                                        </p>

                                        <div className="flex flex-col gap-1.5 bg-default-50 p-3 rounded-xl border border-default-200">
                                            <label
                                                htmlFor="mp-card-payer-email"
                                                className="text-xs font-semibold text-default-700 flex items-center gap-1.5"
                                            >
                                                <Icon icon="solar:letter-bold" className="w-4 h-4 text-primary" />
                                                Correo electrónico del titular
                                            </label>
                                            <Input
                                                id="mp-card-payer-email"
                                                aria-label="Correo electrónico del titular"
                                                placeholder="tu.correo@ejemplo.com"
                                                type="email"
                                                autoComplete="email"
                                                value={cardPayerEmail}
                                                onValueChange={setCardPayerEmail}
                                                variant="bordered"
                                                size="sm"
                                                className="bg-content1"
                                            />
                                            <p className="text-xs text-default-500">
                                                Recibirás la constancia de la transacción en este correo.
                                            </p>
                                        </div>

                                        <div className="relative min-h-[320px]">
                                            {!brickLoaded && (
                                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 gap-3 bg-content1/80 backdrop-blur-sm border border-dashed border-default-200 rounded-2xl">
                                                    <Spinner size="md" color="primary" />
                                                    <p className="text-xs text-default-500">Cargando formulario seguro de tarjetas...</p>
                                                </div>
                                            )}

                                            <div
                                                id="mp-payment-brick-container"
                                                className="min-h-[320px]"
                                            />
                                        </div>
                                    </div>
                                </Tab>
                            </Tabs>
                            )}
                        </ModalBody>

                        <ModalFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-default-100 pt-3">
                            {!pendingVerification ? (
                                <Button
                                    variant="light"
                                    size="sm"
                                    className="text-xs text-default-500 hover:text-primary-text min-h-11 h-auto py-2 whitespace-normal text-center sm:text-left"
                                    onPress={handleCheckoutProRedirect}
                                    isDisabled={isProcessing}
                                >
                                    <Icon icon="solar:link-round-angle-bold" className="w-3.5 h-3.5 mr-1 shrink-0 inline" />
                                    <span>¿Prefieres pagar en la web externa de Mercado Pago?</span>
                                </Button>
                            ) : <div />}

                            <Button
                                variant="flat"
                                color="default"
                                size="sm"
                                onPress={onClose}
                                isDisabled={isProcessing}
                                className="w-full sm:w-auto min-h-11"
                            >
                                {pendingVerification ? "Cerrar" : "Cancelar"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
