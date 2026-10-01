import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/server/geocoding";
import { geocodeRateLimit, getClientIp } from "@/lib/server/rate-limit";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 200;

export async function GET(request: NextRequest) {
    const rate = geocodeRateLimit(getClientIp(request));
    if (!rate.allowed) {
        return NextResponse.json(
            { error: "Demasiadas solicitudes. Intenta nuevamente en un momento." },
            { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
        );
    }

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
        return NextResponse.json(
            { error: "La búsqueda debe tener entre 2 y 200 caracteres." },
            { status: 400 },
        );
    }

    try {
        const results = await searchPlaces(q);
        return NextResponse.json(results);
    } catch {
        return NextResponse.json([], { status: 502 });
    }
}
