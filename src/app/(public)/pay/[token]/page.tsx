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
                <main className="min-h-screen bg-[#080e17] text-white py-10 px-4 flex items-center justify-center">
                    <div className="max-w-md w-full bg-[#161c25]/72 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
                        <div className="text-amber-400 mx-auto mb-4 text-5xl">⏳</div>
                        <h1 className="text-2xl font-bold mb-2 text-white">Enlace expirado</h1>
                        <p className="text-slate-400 mb-6 relative z-10">Este enlace de pago ha caducado. Por favor, solicita al músico que regenere un nuevo enlace para continuar con tu reserva.</p>
                    </div>
                </main>
            )
        }
        if (e.message?.includes("completed") || e.message?.includes("completado")) {
            return (
                <main className="min-h-screen bg-[#080e17] text-white py-10 px-4 flex items-center justify-center">
                    <div className="max-w-md w-full bg-[#161c25]/72 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
                        <div className="text-primary mx-auto mb-4 text-5xl">✓</div>
                        <h1 className="text-2xl font-bold mb-2 text-white">¡Reserva Completada!</h1>
                        <p className="text-slate-400 mb-6 relative z-10">Este enlace ya fue procesado y la reserva ha sido creada. Puedes encontrar los detalles en tu cuenta.</p>
                        <Link href="/login" className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90 transition-all">
                            Ir a mi cuenta
                        </Link>
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
        <Suspense fallback={<div className="min-h-screen bg-[#080e17] flex items-center justify-center text-white">Cargando...</div>}>
            <CheckoutClient linkData={link} />
        </Suspense>
    );
}
