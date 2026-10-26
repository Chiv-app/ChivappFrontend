import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    let publicKey =
        process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ||
        process.env.MERCADO_PAGO_PUBLIC_KEY ||
        "";

    // No recorrer process.env buscando valores "APP_USR-": los access tokens
    // privados de Mercado Pago tienen el mismo prefijo y se publicarían.
    const backendBase =
        process.env.API_PROXY_TARGET ||
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        (process.env.NODE_ENV === "production" ? "https://api.chiv.app" : "http://localhost:8000");
    if (!publicKey && backendBase) {
        try {
            const cleanBase = backendBase.replace(/\/$/, "").replace(/\/api\/v1$/, "");
            const res = await fetch(
                `${cleanBase}/api/v1/payments/mercadopago/public-key`,
                { signal: AbortSignal.timeout(4000), cache: "no-store" }
            );
            if (res.ok) {
                const data = await res.json();
                if (data?.public_key) {
                    publicKey = data.public_key;
                }
            }
        } catch {
            // ignore network errors
        }
    }

    return NextResponse.json(
        { publicKey },
        {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        },
    );
}
