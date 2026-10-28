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

export async function searchPlaces(query: string): Promise<MapLocation[]> {
    if (!query.trim()) return [];

    const params = new URLSearchParams({
        format: "json",
        q: query.trim(),
        countrycodes: "pe",
        limit: "5",
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
