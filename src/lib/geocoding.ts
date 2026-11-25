export type MapLocation = {
    address: string;
    city: string | null;
    lat: number;
    lng: number;
};

export function formatLocationReference(lat: number, lng: number): string {
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function parseLocationReference(
    reference: string | null | undefined,
): { lat: number; lng: number } | null {
    if (!reference) return null;

    const match = reference
        .trim()
        .match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*\+?(-?\d{1,3}(?:\.\d+)?)/);
    if (!match) return null;

    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        return null;
    }

    return { lat, lng };
}

/**
 * Detecta si un texto pegado parece ser una ubicación compartida de WhatsApp / Google Maps / Waze
 * o coordenadas GPS directas (decimales o grados/minutos/segundos).
 */
export function looksLikeSharedLocationText(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed.length < 6) return false;
    return (
        /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|g\.co\/kgs|(?:www\.)?waze\.com\/ul|(?:www\.)?openstreetmap\.org)/i.test(
            trimmed,
        ) ||
        /!3d-?\d{1,2}\.\d+!4d-?\d{1,3}\.\d+/.test(trimmed) ||
        /(?:^|[^\d.])(-?\d{1,2}\.\d{4,})\s*,\s*\+?(-?\d{1,3}\.\d{4,})(?!\d)/.test(
            trimmed,
        ) ||
        /\d{1,2}\s*°\s*\d{1,2}/.test(trimmed)
    );
}

export async function resolveSharedLocation(
    rawText: string,
): Promise<MapLocation | null> {
    const trimmed = rawText.trim();
    if (!trimmed) return null;

    const response = await fetch("/api/geocode/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
    });

    if (!response.ok) return null;
    return (await response.json()) as MapLocation;
}

export function buildGoogleMapsUrl(input: {
    lat?: number;
    lng?: number;
    address?: string | null;
    city?: string | null;
}): string | null {
    const coords =
        input.lat != null && input.lng != null ? `${input.lat},${input.lng}` : null;
    const addressQuery = [input.address, input.city].filter(Boolean).join(", ");
    const query = coords ?? addressQuery;

    if (!query) return null;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildOpenStreetMapUrl(lat: number, lng: number): string {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

export function buildFallbackLocation(lat: number, lng: number): MapLocation {
    return {
        address: `Ubicación marcada (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        city: null,
        lat,
        lng,
    };
}

export async function searchPlaces(query: string): Promise<MapLocation[]> {
    if (!query.trim()) return [];

    const params = new URLSearchParams({ q: query.trim() });
    const response = await fetch(`/api/geocode/search?${params.toString()}`);

    if (!response.ok) return [];

    return (await response.json()) as MapLocation[];
}

export async function reverseGeocode(lat: number, lng: number): Promise<MapLocation | null> {
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
    });
    const response = await fetch(`/api/geocode/reverse?${params.toString()}`);

    if (!response.ok) return null;

    return (await response.json()) as MapLocation;
}

export function getMinEventDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function normalizeStartTime(value: string): string {
    const trimmed = value.trim();
    if (/^\d{2}:\d{2}$/.test(trimmed)) {
        return `${trimmed}:00`;
    }
    return trimmed;
}

export function validateBookingRequest(input: {
    eventDate: string;
    startTime: string;
    eventType: string;
    location: MapLocation | null;
    locationCity?: string;
}): string | null {
    if (!input.eventDate) return "Selecciona la fecha del evento.";
    if (!input.startTime) return "Selecciona la hora del evento.";
    if (!input.eventType) return "Selecciona el tipo de evento.";
    if (!input.location && !input.locationCity?.trim()) {
        return "Indica el distrito o ciudad del evento (o márcalo en el mapa).";
    }

    if (input.eventDate < getMinEventDate()) {
        return "La fecha del evento no puede ser anterior a hoy.";
    }

    return null;
}
