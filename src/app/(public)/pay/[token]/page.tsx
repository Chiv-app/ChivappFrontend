import { Metadata } from "next";
import { Suspense } from "react";
import { getBookingLinkPublic } from "@/lib/booking-links";
import { notFound } from "next/navigation";
import CheckoutClient from "./checkout-client";

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
                images: link.musician.profile_image_url ? [link.musician.profile_image_url] : [],
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
