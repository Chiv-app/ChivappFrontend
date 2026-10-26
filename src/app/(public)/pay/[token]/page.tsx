import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookingLinkPublic } from "@/lib/booking-links";
import { ApiError } from "@/lib/api";
import CheckoutClient from "./checkout-client";
import { Icon } from "@iconify/react";

type Props = {
    params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    try {
        const data = await getBookingLinkPublic(resolvedParams.token);
        return {
            title: `Reserva con ${data.musician.stage_name} | Chivapp`,
            description: `Completa y asegura tu reserva musical con ${data.musician.stage_name} de forma rápida y segura.`,
            robots: { index: false, follow: false },
        };
    } catch {
        return {
            title: "Enlace de pago | Chivapp",
            robots: { index: false, follow: false },
        };
    }
}

function CompletedBookingCard() {
    return (
        <div className="min-h-[70dvh] bg-default-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-content1 rounded-3xl p-8 text-center shadow-lg border border-default-100">
                <div className="w-16 h-16 bg-success/10 text-success-text rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon icon="solar:check-circle-bold" width={36} />
                </div>
                <h1 className="text-2xl font-bold mb-2">¡Reserva completada!</h1>
                <p className="text-default-500 mb-6">
                    Este enlace de pago ya fue utilizado y la reserva con el músico se encuentra en proceso o confirmada.
                </p>
                <div className="p-4 bg-default-100 rounded-2xl text-xs text-default-600 mb-6 font-medium">
                    Revisa tu correo electrónico para ver los detalles de tu reserva o inicia sesión en tu cuenta de Chivapp.
                </div>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                        Ir a mis reservas
                        <Icon icon="solar:arrow-right-linear" width={18} />
                    </Link>
                    <Link
                        href="/forgot-password"
                        className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-default-200 bg-content2 text-foreground font-semibold text-sm hover:bg-default-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                        Crear o recuperar contraseña
                    </Link>
                </div>
            </div>
        </div>
    );
}

function translateCheckoutLinkError(rawMessage: string): string {
    const normalized = rawMessage.trim().toLowerCase();
    if (normalized.includes("cancelled") || normalized.includes("cancelad")) {
        return "Este enlace de reserva fue cancelado por el músico y ya no admite pagos.";
    }
    if (normalized.includes("expired") || normalized.includes("caducad") || normalized.includes("expirad")) {
        return "Este enlace de pago ha expirado (validez máxima de 24 horas).";
    }
    if (normalized.includes("no está disponible") || normalized.includes("not available")) {
        return "Este enlace de pago ya no se encuentra disponible.";
    }
    return rawMessage
        .replace(/\blink\b/gi, "enlace")
        .replace(/\(cancelled\)/gi, "(cancelado)")
        .replace(/\(expired\)/gi, "(expirado)");
}

export default async function PublicCheckoutPage({ params }: Props) {
    const resolvedParams = await params;
    const { token } = resolvedParams;

    let linkData = null;
    let errorReason: "not_found" | "expired" | "completed" | "error" | "server_error" | null = null;
    let errorDetail = "";

    try {
        linkData = await getBookingLinkPublic(token);
    } catch (err: unknown) {
        if (err instanceof ApiError) {
            if (err.status === 404) {
                errorReason = "not_found";
            } else if (err.status === 400) {
                if (err.message.toLowerCase().includes("utilizado") || err.message.toLowerCase().includes("completado")) {
                    errorReason = "completed";
                } else if (err.message.toLowerCase().includes("caducado") || err.message.toLowerCase().includes("expirado")) {
                    errorReason = "expired";
                } else {
                    errorReason = "error";
                    errorDetail = translateCheckoutLinkError(err.message);
                }
            } else if (err.status >= 500) {
                errorReason = "server_error";
                errorDetail = "El servicio de reservas presenta una interrupción temporal. Tu enlace sigue siendo válido.";
            } else {
                errorReason = "error";
                errorDetail = "No pudimos cargar los detalles del enlace en este momento.";
            }
        } else {
            errorReason = "server_error";
            errorDetail = "No pudimos conectarnos con el servidor en este momento. Tu enlace sigue siendo válido.";
        }
    }

    if (errorReason === "not_found") {
        notFound();
    }

    if (errorReason === "completed") {
        return <CompletedBookingCard />;
    }

    if (errorReason === "server_error") {
        return (
            <div className="min-h-[70dvh] bg-default-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-content1 rounded-3xl p-8 text-center shadow-lg border border-default-100">
                    <div className="w-16 h-16 bg-warning/10 text-warning-text rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon icon="solar:refresh-circle-bold" width={36} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">
                        Servicio temporalmente no disponible
                    </h1>
                    <p className="text-default-600 mb-6">
                        {errorDetail}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <a
                            href={`/pay/${encodeURIComponent(token)}`}
                            className="inline-flex items-center justify-center gap-2 flex-1 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                            Reintentar
                        </a>
                        <Link
                            href="/musicians"
                            className="inline-flex items-center justify-center gap-2 flex-1 h-11 px-4 rounded-xl border border-default-200 bg-content2 text-foreground font-semibold text-sm hover:bg-default-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                            Explorar músicos
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (errorReason === "expired" || errorReason === "error") {
        return (
            <div className="min-h-[70dvh] bg-default-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-content1 rounded-3xl p-8 text-center shadow-lg border border-default-100">
                    <div className="w-16 h-16 bg-danger/10 text-danger-text rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon icon="solar:clock-circle-bold" width={36} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">
                        {errorReason === "expired" ? "Enlace caducado" : "Enlace no disponible"}
                    </h1>
                    <p className="text-default-600 mb-6">
                        {errorReason === "expired"
                            ? "Por motivos de seguridad y disponibilidad en la agenda del músico, este enlace de pago ha expirado (validez máxima de 24 horas)."
                            : errorDetail}
                    </p>
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl text-xs text-warning-text font-medium mb-6">
                        Por favor, solicita al músico que te genere o reactive el enlace de reserva para continuar.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            href="/musicians"
                            className="inline-flex items-center justify-center gap-2 flex-1 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                            Explorar músicos
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 flex-1 h-11 px-4 rounded-xl border border-default-200 bg-content2 text-foreground font-semibold text-sm hover:bg-default-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                            Ir a mis reservas
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!linkData) {
        return null;
    }

    if (linkData.status === "completed") {
        return <CompletedBookingCard />;
    }

    if (linkData.status === "expired") {
        return (
            <div className="min-h-[70dvh] bg-default-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-content1 rounded-3xl p-8 text-center shadow-lg border border-default-100">
                    <div className="w-16 h-16 bg-danger/10 text-danger-text rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon icon="solar:clock-circle-bold" width={36} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Enlace caducado</h1>
                    <p className="text-default-500 mb-6">
                        Por motivos de seguridad y disponibilidad en la agenda del músico, este enlace de pago ha expirado (validez máxima de 24 horas).
                    </p>
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl text-xs text-warning-text font-medium">
                        Por favor, solicita al músico que te genere o reactive el enlace de reserva para continuar.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[70dvh] bg-default-50/50 pb-20">
            <CheckoutClient linkData={linkData} />
        </div>
    );
}
