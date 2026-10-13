import { Metadata } from "next";
import { Suspense } from "react";
import { getBookingLinkPublic } from "@/lib/booking-links";
import { notFound } from "next/navigation";
import { toAbsoluteUploadUrl } from "@/lib/uploads";
import CheckoutClient from "./checkout-client";

import Link from "next/link";


type Params = {
    params: Promise<{ token: string }>;
};

export async function generateMetadata(props: Params): Promise<Metadata> {
    const params = await props.params;
    try {
        const link = await getBookingLinkPublic(params.token);
        return {
            title: `Reserva con ${link.musician.stage_name} | Chivapp`,
            description: `Realiza tu pago seguro y protege tu reserva para tu evento con ${link.musician.stage_name}. 100% garantizado en Chivapp.`,
            openGraph: {
                title: `Reserva con ${link.musician.stage_name} | Chivapp`,
                description: `Realiza tu pago seguro y protege tu reserva con ${link.musician.stage_name}. 100% garantizado en Chivapp.`,
                images: link.musician.profile_image_url ? [toAbsoluteUploadUrl(link.musician.profile_image_url) || ""] : [],
                type: "website",
            }
        };
    } catch {
        return { title: "Enlace no válido | Chivapp" };
    }
}

export default async function SmartPaymentPage(props: Params) {
    const params = await props.params;
    let link;
    try {
        link = await getBookingLinkPublic(params.token);
    } catch (e: any) {
        if (e.message?.includes("expirado")) {
            return (
                <main className="min-h-screen bg-default-50 py-10 px-4 flex items-center justify-center">
                    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center">
                        <div className="text-warning mx-auto mb-4 text-5xl">⏰</div>
                        <h1 className="text-2xl font-bold mb-2">Enlace expirado</h1>
                        <p className="text-default-500 mb-6">Este enlace de pago ha caducado. Por favor, solicita al músico que regenere un nuevo enlace para continuar con tu reserva.</p>
                    </div>
                </main>
            )
        }
        notFound();
    }

    if (link.status === "completed") {
        return (
            <main className="min-h-screen bg-default-50 py-10 px-4 flex items-center justify-center">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center">
                    <div className="text-success mx-auto mb-4 text-5xl">✅</div>
                    <h1 className="text-2xl font-bold mb-2">¡Reserva Completada!</h1>
                    <p className="text-default-500 mb-6">Este enlace ya fue procesado y la reserva ha sido creada. Puedes encontrar los detalles y el contrato en tu cuenta.</p>
                    <Link href="/login" className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
                        Ir a mi cuenta
                    </Link>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-default-50 py-10 px-4">
            <div className="max-w-2xl mx-auto">
                <Suspense fallback={<div>Cargando...</div>}>
                    <CheckoutClient linkData={link} />
                </Suspense>
            </div>
        </main>
    );
}
