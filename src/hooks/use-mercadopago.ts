"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
    interface Window {
        MP_DEVICE_SESSION_ID?: string;
        MercadoPago?: new (
            publicKey: string,
            options?: { locale?: string; advancedFraudPrevention?: boolean }
        ) => {
            yape: (params: { phoneNumber: string; otp: string }) => {
                create: () => Promise<{ id: string; status?: string; [key: string]: unknown }>;
            };
            bricks: () => {
                create: (
                    brickName: string,
                    containerId: string,
                    settings: unknown
                ) => Promise<{ unmount: () => void }>;
            };
            [key: string]: unknown;
        };
    }
}

const MP_SDK_URL = "https://sdk.mercadopago.com/js/v2";
const MP_SECURITY_URL = "https://www.mercadopago.com/v2/security.js";

export function useMercadoPago() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const mpInstanceRef = useRef<InstanceType<NonNullable<Window["MercadoPago"]>> | null>(null);

    const [publicKey, setPublicKey] = useState<string>(
        process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || ""
    );

    // Load security.js for device session ID
    useEffect(() => {
        if (typeof window === "undefined") return;
        const existingSecurityScript = document.querySelector(`script[src="${MP_SECURITY_URL}"]`);
        if (!existingSecurityScript) {
            const script = document.createElement("script");
            script.src = MP_SECURITY_URL;
            script.async = true;
            script.setAttribute("view", "checkout");
            document.body.appendChild(script);
        }
    }, []);

    const getDeviceSessionId = useCallback(() => {
        return window.MP_DEVICE_SESSION_ID || undefined;
    }, []);

    useEffect(() => {
        let isMounted = true;
        if (!publicKey) {
            fetch("/api/mercadopago/public-key")
                .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load key"))))
                .then((data) => {
                    if (!isMounted) return;
                    if (data?.publicKey) {
                        setPublicKey(data.publicKey);
                    } else {
                        setLoadError("NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY no está configurada.");
                    }
                })
                .catch(() => {
                    if (isMounted) {
                        setLoadError("NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY no está configurada.");
                    }
                });
        }
        return () => {
            isMounted = false;
        };
    }, [publicKey]);

    useEffect(() => {
        if (!publicKey) return;

        if (window.MercadoPago) {
            if (!mpInstanceRef.current) {
                mpInstanceRef.current = new window.MercadoPago(publicKey, { locale: "es-PE" });
            }
            // eslint-disable-next-line
            setIsLoaded(true);
            return;
        }

        const existingScript = document.querySelector(`script[src="${MP_SDK_URL}"]`);
        if (existingScript) {
            const handleLoad = () => {
                if (window.MercadoPago) {
                    mpInstanceRef.current = new window.MercadoPago(publicKey, { locale: "es-PE" });
                    setIsLoaded(true);
                }
            };
            existingScript.addEventListener("load", handleLoad);
            return () => existingScript.removeEventListener("load", handleLoad);
        }

        const script = document.createElement("script");
        script.src = MP_SDK_URL;
        script.async = true;
        script.onload = () => {
            if (window.MercadoPago) {
                mpInstanceRef.current = new window.MercadoPago(publicKey, { locale: "es-PE" });
                setIsLoaded(true);
            } else {
                setLoadError("No se pudo inicializar MercadoPago SDK.");
            }
        };
        script.onerror = () => {
            setLoadError("No se pudo cargar el script de Mercado Pago.");
        };
        document.body.appendChild(script);
    }, [publicKey]);

    const createYapeToken = useCallback(
        async ({ phoneNumber, otp }: { phoneNumber: string; otp: string }): Promise<string> => {
            if (!mpInstanceRef.current) {
                throw new Error("Mercado Pago SDK aún no está inicializado.");
            }
            const cleanPhone = phoneNumber.replace(/\D/g, "");
            const cleanOtp = otp.replace(/\D/g, "");

            if (cleanPhone.length !== 9) {
                throw new Error("El número de celular debe tener 9 dígitos.");
            }
            if (cleanOtp.length !== 6) {
                throw new Error("El código de aprobación de Yape debe tener 6 dígitos.");
            }

            const yapeInstance = mpInstanceRef.current.yape({
                phoneNumber: cleanPhone,
                otp: cleanOtp,
            });

            const res = await yapeInstance.create();
            if (!res || !res.id) {
                throw new Error("No se pudo obtener el token de Yape. Revisa que el código OTP sea vigente.");
            }
            return res.id;
        },
        []
    );

    const renderPaymentBrick = useCallback(
        async ({
            containerId,
            amount,
            payerEmail,
            onSubmit,
            onError,
            onReady,
        }: {
            containerId: string;
            amount: number;
            payerEmail?: string;
            onSubmit: (formData: any) => Promise<void>;
            onError?: (error: unknown) => void;
            onReady?: () => void;
        }) => {
            if (!mpInstanceRef.current) {
                throw new Error("Mercado Pago SDK no está listo.");
            }
            const bricks = mpInstanceRef.current.bricks();
            const safeAmount = Math.max(1, Number(Number(amount).toFixed(2)) || 1);

            try {
                // Prefer specialized cardPayment brick for credit & debit cards
                const controller = await bricks.create("cardPayment", containerId, {
                    initialization: {
                        amount: safeAmount,
                        ...(payerEmail ? { payer: { email: payerEmail } } : {}),
                    },
                    customization: {
                        paymentMethods: {
                            minInstallments: 1,
                            maxInstallments: 12,
                        },
                        visual: {
                            style: {
                                theme: "default",
                            },
                        },
                    },
                    callbacks: {
                        onReady: () => {
                            if (onReady) onReady();
                        },
                        onSubmit: (cardFormData: any) => {
                            return new Promise<void>((resolve, reject) => {
                                onSubmit(cardFormData)
                                    .then(() => resolve())
                                    .catch((err) => reject(err));
                            });
                        },
                        onError: (err: unknown) => {
                            if (onError) onError(err);
                        },
                    },
                });
                return controller;
            } catch (cardErr) {
                console.warn("cardPayment brick falló, intentando con payment brick:", cardErr);
                // Fallback to multi-method payment brick
                const controller = await bricks.create("payment", containerId, {
                    initialization: {
                        amount: safeAmount,
                    },
                    customization: {
                        paymentMethods: {
                            creditCard: "all",
                            debitCard: "all",
                        },
                    },
                    callbacks: {
                        onReady: () => {
                            if (onReady) onReady();
                        },
                        onSubmit: (param: any) => {
                            return new Promise<void>((resolve, reject) => {
                                onSubmit(param?.formData || param)
                                    .then(() => resolve())
                                    .catch((err) => reject(err));
                            });
                        },
                        onError: (err: unknown) => {
                            if (onError) onError(err);
                        },
                    },
                });
                return controller;
            }
        },
        []
    );

    return {
        isLoaded,
        loadError,
        getMp: () => mpInstanceRef.current,
        createYapeToken,
        renderPaymentBrick,
        getDeviceSessionId,
    };
}
