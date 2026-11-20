import type { MapLocation } from "@/lib/geocoding";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
// Nominatim exige un User-Agent que identifique la aplicación y un contacto.
const USER_AGENT = "Chivapp/1.0 (+https://chiv.app; soporte@chiv.app) booking-location-picker";
const FETCH_TIMEOUT_MS = 5000;

type NominatimResult = {
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        city_district?: string;
        suburb?: string;
        county?: string;
        state_district?: string;
        state?: string;
        region?: string;
    };
};

function extractCity(result: NominatimResult): string | null {
    const address = result.address;
    if (!address) return null;
    return (
        address.city ??
        address.town ??
        address.municipality ??
        address.city_district ??
        address.village ??
        address.suburb ??
        address.county ??
        address.state_district ??
        address.state ??
        address.region ??
        null
    );
}

function toMapLocation(result: NominatimResult): MapLocation {
    return {
        address: result.display_name,
        city: extractCity(result),
        lat: Number(Number(result.lat).toFixed(6)),
        lng: Number(Number(result.lon).toFixed(6)),
    };
}

function expandPeruvianAbbreviations(input: string): string {
    return input
        .replace(/\bav\.?(?=\s)/gi, "Avenida")
        .replace(/\bjr\.?(?=\s)/gi, "Jirón")
        .replace(/\bca\.?(?=\s)/gi, "Calle")
        .replace(/\bp(?:s)?je\.?(?=\s)/gi, "Pasaje")
        .replace(/\bprol(?:g)?\.?(?=\s)/gi, "Prolongación")
        .replace(/\bmcal\.?(?=\s)/gi, "Mariscal")
        .replace(/\bgral\.?(?=\s)/gi, "General")
        .replace(/\balm\.?(?=\s)/gi, "Almirante")
        .replace(/\bc(?:r)?nel\.?(?=\s)/gi, "Coronel")
        .replace(/\bcmdte\.?(?=\s)/gi, "Comandante")
        .replace(/\b(?:n°|nro\.?|núm\.?|num\.?|s\/n)\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

function stripAddressNoise(input: string): string {
    return input
        .replace(/\([^)]*\)/g, " ")
        .replace(
            /\b(?:dpto\.?|dep\.?|departamento|int\.?|interior|piso|of\.?|oficina|mz\.?|manzana|lt\.?|lote|etapa|sector|bloque|cdra\.?|cuadra)\s*[a-z0-9\-]+/gi,
            " ",
        )
        .replace(
            /\b(?:urb\.?|urbanizaci[oó]n|asoc\.?|asociaci[oó]n|aa\.?\s*hh\.?|residencial)\s+/gi,
            " ",
        )
        .replace(/\s*,\s*,+/g, ", ")
        .replace(/\s+,/g, ",")
        .replace(/\s+/g, " ")
        .replace(/^[,\s]+|[,\s]+$/g, "")
        .trim();
}

export function buildPeruvianSearchQueries(rawQuery: string): string[] {
    const base = rawQuery.trim();
    if (!base) return [];

    const expanded = expandPeruvianAbbreviations(base);
    const cleaned = stripAddressNoise(expanded);
    const withoutHouseNumbers = cleaned
        .replace(/\b\d{1,5}(?:-[a-z0-9]+)?\b/gi, " ")
        .replace(/\s*,\s*,+/g, ", ")
        .replace(/\s+,/g, ",")
        .replace(/\s+/g, " ")
        .replace(/^[,\s]+|[,\s]+$/g, "")
        .trim();

    const segments = cleaned
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length >= 3);

    const candidates: string[] = [
        base,
        expanded,
        cleaned,
        withoutHouseNumbers,
    ];

    if (segments.length >= 2) {
        candidates.push(segments.slice(-2).join(", "));
    }
    if (segments.length >= 1) {
        candidates.push(segments[segments.length - 1]);
    }

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const candidate of candidates) {
        const norm = candidate.trim();
        const key = norm.toLowerCase();
        if (norm.length >= 3 && !seen.has(key)) {
            seen.add(key);
            unique.push(norm);
        }
    }
    return unique;
}

async function fetchNominatimSearch(q: string): Promise<MapLocation[]> {
    const params = new URLSearchParams({
        format: "json",
        q,
        countrycodes: "pe",
        limit: "6",
        addressdetails: "1",
    });

    const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
        headers: {
            "Accept-Language": "es",
            "User-Agent": USER_AGENT,
        },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return [];

    const results = (await response.json()) as NominatimResult[];
    return results.map(toMapLocation);
}

export async function searchPlaces(query: string): Promise<MapLocation[]> {
    const candidates = buildPeruvianSearchQueries(query);
    if (candidates.length === 0) return [];

    for (const candidate of candidates) {
        try {
            const locations = await fetchNominatimSearch(candidate);
            if (locations.length > 0) {
                return locations;
            }
        } catch {
            // Continúa con el siguiente candidato más amplio si falla o expira
        }
    }

    return [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<MapLocation | null> {
    const params = new URLSearchParams({
        format: "json",
        lat: String(lat),
        lon: String(lng),
        addressdetails: "1",
    });

    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
        headers: {
            "Accept-Language": "es",
            "User-Agent": USER_AGENT,
        },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const result = (await response.json()) as NominatimResult;
    if (!result.display_name) return null;
    
    const loc = toMapLocation(result);
    // Force the exact coordinates requested to avoid "snapping" to nearby buildings
    loc.lat = Number(lat.toFixed(6));
    loc.lng = Number(lng.toFixed(6));

    return loc;
}
