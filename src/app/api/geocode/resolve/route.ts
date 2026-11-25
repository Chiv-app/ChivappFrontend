import { NextRequest, NextResponse } from "next/server";
import { resolveSharedLocationInput } from "@/lib/server/geocoding";
import { geocodeRateLimit, getClientIp } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
    const rate = geocodeRateLimit(getClientIp(request));
    if (!rate.allowed) {
        return NextResponse.json(
            { error: "Demasiadas solicitudes. Intenta nuevamente en un momento." },
            {
                status: 429,
                headers: { "Retry-After": String(rate.retryAfterSeconds) },
            },
        );
    }

    let body: { text?: string } = {};
    try {
        body = (await request.json()) as { text?: string };
    } catch {
        return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const rawText = body.text?.trim() ?? "";
    if (rawText.length < 4 || rawText.length > 2000) {
        return NextResponse.json(
            { error: "El texto de ubicación debe tener entre 4 y 2000 caracteres." },
            { status: 400 },
        );
    }

    try {
        const location = await resolveSharedLocationInput(rawText);
        if (!location) {
            return NextResponse.json(
                { error: "No se pudo extraer una ubicación válida del texto o enlace." },
                { status: 404 },
            );
        }
        return NextResponse.json(location);
    } catch {
        return NextResponse.json(
            { error: "No se pudo resolver la ubicación compartida." },
            { status: 502 },
        );
    }
}
