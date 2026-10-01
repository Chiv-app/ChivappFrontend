"use client";

import { useEffect, useRef, useState } from "react";
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
import { processMercadoPagoPayment, createMercadoPagoPreference } from "@/lib/payments";
import type { BookingOut } from "@/types/api";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    booking: BookingOut;
    amount: number;
    signatureImageUrl?: string | null;
    onSuccess: (booking?: BookingOut) => void;
};

export default function BookingMercadoPagoModal({
    isOpen,
    onClose,
    booking,
    amount,
    signatureImageUrl,
    onSuccess,
}: Props) {
    const { user } = useAuth();
    const { isLoaded, loadError, createYapeToken, renderPaymentBrick, getDeviceSessionId } = useMercadoPago();

    const [selectedTab, setSelectedTab] = useState<string>("yape");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [yapeDocNumber, setYapeDocNumber] = useState("");
    const [cardPayerEmail, setCardPayerEmail] = useState<string>(user?.email || "");
    const cardPayerEmailRef = useRef(cardPayerEmail);
    useEffect(() => {
        cardPayerEmailRef.current = cardPayerEmail;
    }, [cardPayerEmail]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processError, setProcessError] = useState<string | null>(null);
    // 409: el monto calculado por el servidor cambió; hay que recargar para ver el nuevo total.
    const [needsReload, setNeedsReload] = useState(false);
    const [brickLoaded, setBrickLoaded] = useState(false);

    const brickControllerRef = useRef<{ unmount: () => void } | null>(null);

    // Reset fields on modal open
    useEffect(() => {
        if (isOpen) {
            setProcessError(null);
            setNeedsReload(false);
            setIsProcessing(false);
            setPhoneNumber("");
            setOtp("");
            setYapeDocNumber("");
            if (user?.email) {
                setCardPayerEmail(user.email);
            }
        }
    }, [isOpen, user?.email]);

    // Mount Payment Brick when Card tab is selected
    useEffect(() => {
        let isMounted = true;

        if (isOpen && selectedTab === "card" && isLoaded) {
            setBrickLoaded(false);
            setProcessError(null);

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
                        onSubmit: async (param: any) => {
                            // Support both cardPayment (direct formData) and payment ({ formData })
                            const formData = param?.formData || param || {};
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
                                const msg = "No se pudo obtener el token de la tarjeta. Verifica los datos ingresados.";
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
                                    amount: cardAmount,
                                });

                                if (res.success && res.status === "approved") {
                                    addToast({
                                        title: "¡Pago Aprobado!",
                                        description: "Tu pago con tarjeta fue procesado con ééxito.",
                                        color: "success",
                                    });
                                    onSuccess();
                                    onClose();
                                } else {
                                    const errMsg = res.message || "El pago no pudo ser aprobado por el banco emisor. Por favor prueba con otra tarjeta.";
                                    setProcessError(errMsg);
                                    throw new Error(errMsg);
                                }
                            } catch (err) {
                                const errMsg = err instanceof Error ? err.message : "Error al procesar el pago con tarjeta.";
                                if (err instanceof ApiError && err.status === 409) setNeedsReload(true);
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
                                        ? `Mercado Pago: ${cause}`
                                        : "Ocurrió un error en la pasarela de tarjetas. Puedes pagar con Yape o con Checkout Pro."
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
                        setProcessError("No se pudo inicializar el formulario de tarjetas. Puedes usar Checkout Pro en el botón inferior o Yape.");
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
        amount,
        booking.id,
        signatureImageUrl,
        renderPaymentBrick,
        onSuccess,
        onClose,
    ]);

    // Handle Yape Payment
    async function handleYapePayment() {
        setProcessError(null);
        const cleanPhone = phoneNumber.replace(/\D/g, "");
        const cleanOtp = otp.replace(/\D/g, "");

        if (cleanPhone.length !== 9) {
            setProcessError("Ingresa un número de celular válido de 9 dígitos.");
            return;
        }
        if (cleanOtp.length !== 6) {
            setProcessError("Ingresa el código de aprobación de 6 dígitos de tu app Yape.");
            return;
        }

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
                amount: yapeAmount,
            });

            if (res.success && res.status === "approved") {
                addToast({
                    title: "¡Yapeo Eéxitoso!",
                    description: "Tu reserva ha quedado confirmada inmediatamente.",
                    color: "success",
                });
                onSuccess();
                onClose();
            } else {
                setProcessError(
                    res.message || "Tu código OTP de Yape no es válido o ha expirado. Genera uno nuevo en tu app."
                );
            }
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) setNeedsReload(true);
            setProcessError(
                err instanceof Error ? err.message : "Error al procesar el pago con Yape. Verifica tus datos."
            );
        } finally {
            setIsProcessing(false);
        }
    }

    // Fallback: Checkout Pro
    async function handleCheckoutProRedirect() {
        setIsProcessing(true);
        try {
            const pref = await createMercadoPagoPreference({
                booking_id: booking.id,
                payment_type: "full",
                signature_image_url: signatureImageUrl,
            });
            const redirectUrl = pref.init_point || pref.sandbox_init_point;
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                throw new Error("No se pudo generar el enlace de pago.");
            }
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) setNeedsReload(true);
            setProcessError(
                err instanceof Error ? err.message : "Error al redirigir a Mercado Pago."
            );
            setIsProcessing(false);
        }
    }

    const paymentLabel = "Pago Total";

    return (
        <Modal
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
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                                        <Icon icon="solar:shield-check-bold" className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-xl font-bold text-foreground truncate">
                                            Pago Seguro en Chivapp
                                        </h3>
                                        <p className="text-xs text-default-500 line-clamp-1">
                                            Checkout respaldado por Mercado Pago
                                        </p>
                                    </div>
                                </div>
                                <Chip color="success" variant="flat" size="sm" startContent={<Icon icon="solar:lock-bold" />} className="hidden xs:inline-flex">
                                    100% Protegido
                                </Chip>
                            </div>
                        </ModalHeader>

                        <ModalBody className="gap-5 py-3">
                            {/* Resumen del Monto */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 gap-3">
                                <div>
                                    <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                                        Concepto a Pagar
                                    </span>
                                    <p className="text-sm font-medium text-foreground">
                                        {booking.event_type} · {paymentLabel}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-xs text-default-500">Total a debitar</span>
                                    <p className="text-2xl font-black text-foreground text-primary">
                                        {formatCurrency(amount)}
                                    </p>
                                </div>
                            </div>

                            {/* Alerta de Error si ocurre */}
                            {processError && (
                                <div className="p-3.5 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 text-danger text-sm flex items-start gap-2.5">
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

                            {/* Alerta de Seguridad de Mercado Pago */}
                            <div className="p-3.5 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 text-warning-800 dark:text-warning-300 text-xs flex items-start gap-2.5">
                                <Icon icon="solar:shield-warning-bold" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm">Política de seguridad</p>
                                    <p className="mt-1">
                                        Para evitar bloqueos por el sistema antifraude (cc_rejected_high_risk), <strong>Mercado Pago prohíbe las auto-compras</strong>. 
                                        No intentes pagarte a ti mismo utilizando tarjetas, cuentas de Yape, IPs o redes Wi-Fi asociadas a tu propia cuenta de cobro.
                                    </p>
                                </div>
                            </div>

                            {/* Error de Carga SDK */}
                            {loadError && (
                                <div className="p-3.5 rounded-xl bg-warning-50 border border-warning-200 text-warning text-sm">
                                    {loadError}
                                </div>
                            )}

                            {/* Pestañas de Métodos de Pago */}
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
                                    tab: "h-auto py-2 text-xs sm:text-sm",
                                }}
                            >
                                {/* TAB 1: YAPE NATIVO */}
                                <Tab
                                    key="yape"
                                    title={
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <Icon icon="solar:smartphone-bold" className="w-4 h-4 text-purple-600 shrink-0" />
                                            <span className="font-semibold text-purple-700 dark:text-purple-300">Yape</span>
                                            <Chip size="sm" color="secondary" variant="flat" className="h-5 text-[9px] sm:text-[10px] hidden sm:inline-flex">
                                                Recomendado
                                            </Chip>
                                        </div>
                                    }
                                >
                                    <div className="space-y-4 pt-2">
                                        <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs text-default-700 space-y-1.5">
                                            <div className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300">
                                                <Icon icon="solar:info-circle-bold" className="w-4 h-4" />
                                                ¿Cómo obtener tu Código de Aprobación?
                                            </div>
                                            <ol className="list-decimal list-inside space-y-1 text-default-600">
                                                <li>Abre tu aplicación <strong>Yape</strong> en tu celular.</li>
                                                <li>Despliega el menú lateral izquierdo o pulsa en <strong>Código de aprobación</strong>.</li>
                                                <li>Copia el código temporal de <strong>6 dígitos</strong> y colócalo abajo.</li>
                                            </ol>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Celular registrado en Yape"
                                                placeholder="987654321"
                                                value={phoneNumber}
                                                onValueChange={setPhoneNumber}
                                                maxLength={9}
                                                startContent={
                                                    <span className="text-default-400 text-sm font-semibold">+51</span>
                                                }
                                                variant="bordered"
                                                isDisabled={isProcessing}
                                            />
                                            <Input
                                                label="DNI del titular de Yape"
                                                placeholder="12345678"
                                                value={yapeDocNumber}
                                                onValueChange={setYapeDocNumber}
                                                maxLength={15}
                                                variant="bordered"
                                                isDisabled={isProcessing}
                                                description="Para validar tu pago de forma segura."
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">

                                            <Input
                                                label="Código de Aprobación (OTP)"
                                                placeholder="123456"
                                                value={otp}
                                                onValueChange={setOtp}
                                                maxLength={6}
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
                                            isDisabled={!isLoaded || phoneNumber.length < 9 || otp.length < 6}
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
                                                <span className="hidden sm:inline">Tarjeta Débito / Crédito</span>
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
                                            <label className="text-xs font-semibold text-default-700 flex items-center gap-1.5">
                                                <Icon icon="solar:letter-bold" className="w-4 h-4 text-primary" />
                                                Email del pagador
                                            </label>
                                            <Input
                                                aria-label="Email del titular"
                                                placeholder="tu.correo@ejemplo.com"
                                                type="email"
                                                value={cardPayerEmail}
                                                onValueChange={setCardPayerEmail}
                                                variant="bordered"
                                                size="sm"
                                                className="bg-content1"
                                            />
                                            <p className="text-[11px] text-default-400">
                                                Correo asociado a la transacción para validación antifraude de la pasarela.
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
                        </ModalBody>

                        <ModalFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-default-100 pt-3">
                            <Button
                                variant="light"
                                size="sm"
                                className="text-xs text-default-500 hover:text-primary h-auto py-2 whitespace-normal text-center sm:text-left"
                                onPress={handleCheckoutProRedirect}
                                isDisabled={isProcessing}
                            >
                                <Icon icon="solar:link-round-angle-bold" className="w-3.5 h-3.5 mr-1 shrink-0 inline" />
                                <span>¿Prefieres pagar en la web externa de Mercado Pago?</span>
                            </Button>

                            <Button
                                variant="flat"
                                color="default"
                                size="sm"
                                onPress={onClose}
                                isDisabled={isProcessing}
                                className="w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
