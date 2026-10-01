import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/server/geocoding";
import { geocodeRateLimit, getClientIp } from "@/lib/server/rate-limit";

const COORDINATE_PATTERN = /^-?\d{1,3}(?:\.\d+)?$/;

function parseCoordinate(raw: string | null, max: number): number | null {
    const value = raw?.trim();
    if (!value || value.length > 32 || !COORDINATE_PATTERN.test(value)) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < -max || parsed > max) return null;
    return parsed;
}

export async function GET(request: NextRequest) {
    const rate = geocodeRateLimit(getClientIp(request));
    if (!rate.allowed) {
        return NextResponse.json(
            { error: "Demasiadas solicitudes. Intenta nuevamente en un momento." },
            { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
        );
    }

    const lat = parseCoordinate(request.nextUrl.searchParams.get("lat"), 90);
    const lng = parseCoordinate(request.nextUrl.searchParams.get("lng"), 180);

    if (lat === null || lng === null) {
        return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
    }

    try {
        const location = await reverseGeocode(lat, lng);
        if (!location) {
            return NextResponse.json({ error: "No se encontró la dirección" }, { status: 404 });
        }
        return NextResponse.json(location);
    } catch {
        return NextResponse.json({ error: "Error de geocodificación" }, { status: 502 });
    }
}
