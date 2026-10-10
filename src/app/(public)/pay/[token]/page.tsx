import { Metadata } from "next";
import { Suspense } from "react";
import { getBookingLinkPublic } from "@/lib/booking-links";
import { notFound } from "next/navigation";
import CheckoutClient from "./checkout-client";

type Params = {
    params: { token: string };
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    try {
        const link = await getBookingLinkPublic(params.token);
        return {
            title: `Contratar a ${link.musician.stage_name} - Pago Seguro`,
            description: `Realiza el pago seguro para confirmar tu evento con ${link.musician.stage_name}.`,
        };
    } catch {
        return { title: "Enlace no válido | Chivapp" };
    }
}

export default async function SmartPaymentPage({ params }: Params) {
    let link;
    try {
        link = await getBookingLinkPublic(params.token);
    } catch (e) {
        notFound();
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
