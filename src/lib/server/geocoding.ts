import type { MapLocation } from "@/lib/geocoding";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Chivapp/1.0 (booking-location-picker)";

type NominatimResult = {
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        suburb?: string;
    };
};

function extractCity(result: NominatimResult): string | null {
    const address = result.address;
    if (!address) return null;
    return address.city ?? address.town ?? address.village ?? address.suburb ?? address.state ?? null;
}

function toMapLocation(result: NominatimResult): MapLocation {
    return {
        address: result.display_name,
        city: extractCity(result),
        lat: Number(result.lat),
        lng: Number(result.lon),
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
    });

    if (!response.ok) return null;

    const result = (await response.json()) as NominatimResult;
    if (!result.display_name) return null;
    
    const loc = toMapLocation(result);
    // Force the exact coordinates requested to avoid "snapping" to nearby buildings
    loc.lat = lat;
    loc.lng = lng;
    
    return loc;
}
