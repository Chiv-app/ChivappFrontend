import type { MapLocation } from "@/lib/geocoding";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const PHOTON_BASE = "https://photon.komoot.io";
// Nominatim exige un User-Agent que identifique la aplicación y un contacto.
const USER_AGENT =
    "Chivapp/1.0 (+https://chiv.app; soporte@chiv.app) booking-location-picker";
const FETCH_TIMEOUT_MS = 5500;

// Bounding box de Perú: minLon, minLat, maxLon, maxLat
const PERU_BBOX = "-81.5,-18.5,-68.5,0.1";

type NominatimAddress = {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    suburb?: string;
    neighbourhood?: string;
    residential?: string;
    quarter?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    city_district?: string;
    county?: string;
    state_district?: string;
    state?: string;
    region?: string;
    amenity?: string;
    building?: string;
    shop?: string;
    tourism?: string;
};

type NominatimResult = {
    lat: string;
    lon: string;
    name?: string;
    display_name: string;
    address?: NominatimAddress;
};

type PhotonFeature = {
    geometry?: {
        coordinates?: [number, number];
    };
    properties?: {
        name?: string;
        street?: string;
        housenumber?: string;
        district?: string;
        suburb?: string;
        locality?: string;
        city?: string;
        county?: string;
        state?: string;
        countrycode?: string;
    };
};

type PhotonResponse = {
    features?: PhotonFeature[];
};

function extractCity(result: NominatimResult): string | null {
    const address = result.address;
    if (!address) return null;
    return (
        address.city_district ??
        address.municipality ??
        address.city ??
        address.town ??
        address.village ??
        address.suburb ??
        address.county ??
        address.state_district ??
        address.state ??
        address.region ??
        null
    );
}

function buildCleanAddress(result: NominatimResult): string {
    const addr = result.address;
    if (!addr) return result.display_name;

    const placeName =
        result.name?.trim() ||
        addr.amenity?.trim() ||
        addr.building?.trim() ||
        addr.tourism?.trim() ||
        addr.shop?.trim() ||
        "";
    const street = (addr.road || addr.pedestrian || "").trim();
    const houseNumber = (addr.house_number || "").trim();
    const streetWithNumber = [street, houseNumber].filter(Boolean).join(" ").trim();

    const zone = (
        addr.neighbourhood ||
        addr.residential ||
        addr.quarter ||
        addr.suburb ||
        ""
    ).trim();
    const city = (
        addr.city_district ||
        addr.municipality ||
        addr.city ||
        addr.town ||
        addr.village ||
        ""
    ).trim();
    const region = (addr.state_district || addr.county || addr.state || "").trim();

    const parts: string[] = [];
    if (placeName && placeName.toLowerCase() !== street.toLowerCase()) {
        parts.push(placeName);
    }
    if (streetWithNumber) {
        parts.push(streetWithNumber);
    }
    if (zone && !parts.some((p) => p.toLowerCase().includes(zone.toLowerCase()))) {
        parts.push(zone);
    }
    if (city && !parts.some((p) => p.toLowerCase().includes(city.toLowerCase()))) {
        parts.push(city);
    }
    if (
        region &&
        parts.length < 3 &&
        !parts.some((p) => p.toLowerCase().includes(region.toLowerCase()))
    ) {
        parts.push(region);
    }

    if (parts.length >= 2) {
        return parts.join(", ");
    }

    const rawSegments = result.display_name
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !/^\d{4,6}$/.test(s) && s.toLowerCase() !== "perú" && s.toLowerCase() !== "peru");

    return rawSegments.slice(0, 4).join(", ") || result.display_name;
}

function toMapLocation(result: NominatimResult): MapLocation {
    return {
        address: buildCleanAddress(result),
        city: extractCity(result),
        lat: Number(Number(result.lat).toFixed(6)),
        lng: Number(Number(result.lon).toFixed(6)),
    };
}

function photonFeatureToMapLocation(feature: PhotonFeature): MapLocation | null {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const p = feature.properties ?? {};
    const streetLine = [p.street, p.housenumber].filter(Boolean).join(" ").trim();
    const zone = p.district || p.suburb || p.locality || "";
    const city = p.city || p.district || p.county || p.state || null;

    const parts: string[] = [];
    if (p.name && p.name.toLowerCase() !== (p.street || "").toLowerCase()) {
        parts.push(p.name);
    }
    if (streetLine) {
        parts.push(streetLine);
    }
    if (zone && !parts.some((item) => item.toLowerCase() === zone.toLowerCase())) {
        parts.push(zone);
    }
    if (city && !parts.some((item) => item.toLowerCase() === city.toLowerCase())) {
        parts.push(city);
    }
    if (
        p.state &&
        parts.length < 3 &&
        !parts.some((item) => item.toLowerCase() === p.state!.toLowerCase())
    ) {
        parts.push(p.state);
    }

    const address =
        parts.join(", ") ||
        `Ubicación marcada (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    return {
        address,
        city,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
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

    const response = await fetch(
        `${NOMINATIM_BASE}/search?${params.toString()}`,
        {
            headers: {
                "Accept-Language": "es",
                "User-Agent": USER_AGENT,
            },
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
    );

    if (!response.ok) return [];

    const results = (await response.json()) as NominatimResult[];
    return results.map(toMapLocation);
}

async function fetchPhotonSearch(q: string): Promise<MapLocation[]> {
    const params = new URLSearchParams({
        q: `${q}, Perú`,
        limit: "6",
        bbox: PERU_BBOX,
    });

    const response = await fetch(`${PHOTON_BASE}/api/?${params.toString()}`, {
        headers: {
            "User-Agent": USER_AGENT,
        },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as PhotonResponse;
    const locations: MapLocation[] = [];
    for (const feature of data.features ?? []) {
        if (
            feature.properties?.countrycode &&
            feature.properties.countrycode.toUpperCase() !== "PE"
        ) {
            continue;
        }
        const mapped = photonFeatureToMapLocation(feature);
        if (mapped) {
            locations.push(mapped);
        }
    }
    return locations;
}

function isValidLatLng(lat: number, lng: number): boolean {
    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0)
    );
}

function dmsToDecimal(
    deg: string,
    min: string,
    sec: string,
    dir: string,
): number | null {
    const d = Number(deg);
    const m = Number(min || "0");
    const s = Number(sec || "0");
    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(s)) {
        return null;
    }
    let val = Math.abs(d) + m / 60 + s / 3600;
    const upper = dir.toUpperCase();
    if (upper === "S" || upper === "W" || upper === "O") {
        val = -val;
    }
    return val;
}

export type ParsedLocationSignal = {
    coords: { lat: number; lng: number } | null;
    labelHint: string | null;
    queryHint: string | null;
    shortUrl: string | null;
};

const SHORT_MAP_URL_REGEX =
    /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|waze\.com\/ul)\/[^\s<>")]+/i;
const ANY_URL_REGEX = /https?:\/\/[^\s<>")]+/gi;

export function parseLocationSignalsFromText(
    rawInput: string,
): ParsedLocationSignal {
    const raw = rawInput.trim();
    if (!raw) {
        return { coords: null, labelHint: null, queryHint: null, shortUrl: null };
    }

    let decoded = raw;
    try {
        decoded = decodeURIComponent(raw);
    } catch {
        // Keep raw if malformed URI encoding
    }

    // Extraer texto descriptivo fuera de las URLs (ej. cuando pegan un mensaje completo de WhatsApp)
    const textWithoutUrls = raw
        .replace(ANY_URL_REGEX, " ")
        .replace(/^[📍📌🗺️\s:-]+/gm, "")
        .replace(/\b(?:ubicaci[oó]n(?:\s+actual|\s+en\s+tiempo\s+real)?|ver\s+en\s+google\s+maps|compartido\s+desde\s+whatsapp)\b[:\s-]*/gi, "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length >= 3 && !/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/.test(line))
        .join(", ")
        .trim();

    let labelHint: string | null = textWithoutUrls || null;
    let queryHint: string | null = null;

    const shortMatch = raw.match(SHORT_MAP_URL_REGEX);
    const shortUrl = shortMatch ? shortMatch[0] : null;

    // 1. Coordenadas exactas de pin de Google Maps: !3d<lat>!4d<lng>
    const bangMatches = Array.from(
        decoded.matchAll(/!3d(-?\d{1,2}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/g),
    );
    if (bangMatches.length > 0) {
        const last = bangMatches[bangMatches.length - 1];
        const lat = Number(last[1]);
        const lng = Number(last[2]);
        if (isValidLatLng(lat, lng)) {
            const placeMatch = decoded.match(/\/maps\/place\/([^/@?]+)/i);
            if (placeMatch && !labelHint) {
                const candidate = placeMatch[1].replace(/\+/g, " ").trim();
                if (
                    candidate.length >= 3 &&
                    !/^-?\d/.test(candidate) &&
                    !candidate.includes("°")
                ) {
                    labelHint = candidate;
                }
            }
            return { coords: { lat, lng }, labelHint, queryHint, shortUrl };
        }
    }

    // 2. Parámetros en URLs (?q=lat,lng, ?query=lat,lng, ?ll=lat,lng, ?center=lat,lng, ?daddr=lat,lng, mlat/mlon)
    const paramCoordMatch = decoded.match(
        /(?:[?&](?:q|query|ll|center|daddr|destination|saddr|viewpoint)=|\/maps\/search\/|\/maps\/dir\/\/)(-?\d{1,2}\.\d{3,})\s*,\s*\+?(-?\d{1,3}\.\d{3,})/i,
    );
    if (paramCoordMatch) {
        const lat = Number(paramCoordMatch[1]);
        const lng = Number(paramCoordMatch[2]);
        if (isValidLatLng(lat, lng)) {
            return { coords: { lat, lng }, labelHint, queryHint, shortUrl };
        }
    }

    const osmMatch = decoded.match(
        /mlat=(-?\d{1,2}\.\d{3,}).*?mlon=(-?\d{1,3}\.\d{3,})/i,
    );
    if (osmMatch) {
        const lat = Number(osmMatch[1]);
        const lng = Number(osmMatch[2]);
        if (isValidLatLng(lat, lng)) {
            return { coords: { lat, lng }, labelHint, queryHint, shortUrl };
        }
    }

    // 3. Segmento /@lat,lng en URLs de Google Maps
    const atMatch = decoded.match(
        /@(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/,
    );
    if (atMatch) {
        const lat = Number(atMatch[1]);
        const lng = Number(atMatch[2]);
        if (isValidLatLng(lat, lng)) {
            const placeMatch = decoded.match(/\/maps\/place\/([^/@?]+)/i);
            if (placeMatch && !labelHint) {
                const candidate = placeMatch[1].replace(/\+/g, " ").trim();
                if (
                    candidate.length >= 3 &&
                    !/^-?\d/.test(candidate) &&
                    !candidate.includes("°")
                ) {
                    labelHint = candidate;
                }
            }
            return { coords: { lat, lng }, labelHint, queryHint, shortUrl };
        }
    }

    // 4. Coordenadas en formato Grados, Minutos y Segundos (DMS): ej. 13°09'47.3"S 74°13'25.0"W
    const dmsMatch = decoded.match(
        /(\d{1,2})\s*°\s*(\d{1,2})?\s*['′]?\s*(\d{1,2}(?:\.\d+)?)?\s*["″]?\s*([NSns])[,\s]+(\d{1,3})\s*°\s*(\d{1,2})?\s*['′]?\s*(\d{1,2}(?:\.\d+)?)?\s*["″]?\s*([EWewOo])/,
    );
    if (dmsMatch) {
        const lat = dmsToDecimal(
            dmsMatch[1],
            dmsMatch[2],
            dmsMatch[3],
            dmsMatch[4],
        );
        const lng = dmsToDecimal(
            dmsMatch[5],
            dmsMatch[6],
            dmsMatch[7],
            dmsMatch[8],
        );
        if (lat != null && lng != null && isValidLatLng(lat, lng)) {
            return { coords: { lat, lng }, labelHint, queryHint, shortUrl };
        }
    }

    // 5. Coordenadas decimales directas en el texto: ej. "-13.163141, -74.223618"
    const rawCoordMatch = decoded.match(
        /(?:^|[^\d.])(-?\d{1,2}\.\d{4,})\s*,\s*\+?(-?\d{1,3}\.\d{4,})(?!\d)/,
    );
    if (rawCoordMatch) {
        const lat = Number(rawCoordMatch[1]);
        const lng = Number(rawCoordMatch[2]);
        if (isValidLatLng(lat, lng)) {
            return { coords: { lat, lng }, labelHint, queryHint, shortUrl };
        }
    }

    // 6. Query de texto dentro de un link de Google Maps (?q=Nombre+del+lugar o /maps/place/Nombre)
    const queryParamMatch = decoded.match(
        /[?&](?:q|query|daddr|destination)=([^&#]+)/i,
    );
    if (queryParamMatch) {
        const qVal = queryParamMatch[1].replace(/\+/g, " ").trim();
        if (qVal.length >= 3 && !/^https?:/i.test(qVal)) {
            queryHint = qVal;
        }
    } else {
        const placeMatch = decoded.match(/\/maps\/(?:place|search)\/([^/@?]+)/i);
        if (placeMatch) {
            const qVal = placeMatch[1].replace(/\+/g, " ").trim();
            if (qVal.length >= 3) {
                queryHint = qVal;
            }
        }
    }

    return { coords: null, labelHint, queryHint, shortUrl };
}

const ALLOWED_SHORT_HOSTS = new Set([
    "maps.app.goo.gl",
    "goo.gl",
    "www.google.com",
    "google.com",
    "maps.google.com",
    "g.co",
    "waze.com",
    "www.waze.com",
]);

async function expandShortMapUrl(shortUrl: string): Promise<string | null> {
    try {
        const parsed = new URL(shortUrl);
        if (!ALLOWED_SHORT_HOSTS.has(parsed.hostname.toLowerCase())) {
            return null;
        }
        const response = await fetch(shortUrl, {
            method: "GET",
            redirect: "follow",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "es-PE,es;q=0.9",
            },
            signal: AbortSignal.timeout(5000),
        });

        const finalUrl = response.url || "";
        const bodySnippet = await response.text().catch(() => "");
        return `${finalUrl}\n${bodySnippet.slice(0, 8000)}`;
    } catch {
        return null;
    }
}

export async function resolveSharedLocationInput(
    rawInput: string,
): Promise<MapLocation | null> {
    let signal = parseLocationSignalsFromText(rawInput);

    // Si es un link corto (maps.app.goo.gl, goo.gl/maps, etc.) y aún no tenemos coordenadas, lo expandimos
    if (!signal.coords && signal.shortUrl) {
        const expandedText = await expandShortMapUrl(signal.shortUrl);
        if (expandedText) {
            const expandedSignal = parseLocationSignalsFromText(expandedText);
            signal = {
                coords: expandedSignal.coords,
                labelHint: signal.labelHint || expandedSignal.labelHint,
                queryHint: signal.queryHint || expandedSignal.queryHint,
                shortUrl: signal.shortUrl,
            };
        }
    }

    if (signal.coords) {
        const { lat, lng } = signal.coords;
        const reversed = await reverseGeocode(lat, lng).catch(() => null);
        const hintClean = signal.labelHint?.trim() || "";

        let finalAddress = reversed?.address || "";
        if (hintClean && hintClean.length >= 4) {
            if (
                finalAddress &&
                !finalAddress.toLowerCase().includes(hintClean.toLowerCase())
            ) {
                finalAddress = `${hintClean} (${finalAddress})`;
            } else if (!finalAddress) {
                finalAddress = hintClean;
            }
        }
        if (!finalAddress) {
            finalAddress = `Ubicación marcada (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        }

        return {
            address: finalAddress,
            city: reversed?.city ?? null,
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
        };
    }

    const searchTarget = signal.queryHint || signal.labelHint;
    if (searchTarget && searchTarget.length >= 3) {
        const matches = await searchPlaces(searchTarget);
        if (matches.length > 0) {
            const top = matches[0];
            return {
                address:
                    signal.labelHint && signal.labelHint.length >= 5
                        ? signal.labelHint
                        : top.address,
                city: top.city,
                lat: top.lat,
                lng: top.lng,
            };
        }
    }

    return null;
}

export async function searchPlaces(query: string): Promise<MapLocation[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Si el usuario pegó un link de WhatsApp / Google Maps o coordenadas en el buscador, resolverlo primero
    if (
        /https?:\/\//i.test(trimmed) ||
        /!3d-?\d/.test(trimmed) ||
        /^(-?\d{1,2}\.\d{4,})\s*,\s*\+?(-?\d{1,3}\.\d{4,})$/.test(trimmed) ||
        /\d{1,2}\s*°/.test(trimmed)
    ) {
        const resolved = await resolveSharedLocationInput(trimmed);
        if (resolved) {
            return [resolved];
        }
    }

    const candidates = buildPeruvianSearchQueries(trimmed);
    if (candidates.length === 0) return [];

    // 2. Probar hasta los 2 primeros candidatos en Nominatim para evitar rate-limit
    for (const candidate of candidates.slice(0, 2)) {
        try {
            const locations = await fetchNominatimSearch(candidate);
            if (locations.length > 0) {
                return locations;
            }
        } catch {
            // Continúa con el respaldo Photon
        }
    }

    // 3. Respaldo rápido con Photon (OpenStreetMap)
    for (const candidate of candidates.slice(0, 2)) {
        try {
            const photonLocations = await fetchPhotonSearch(candidate);
            if (photonLocations.length > 0) {
                return photonLocations;
            }
        } catch {
            // Continúa con el siguiente candidato
        }
    }

    // 4. Si había candidatos más generales (distrito/ciudad), probar el último en Nominatim
    if (candidates.length > 2) {
        try {
            const fallbackLocations = await fetchNominatimSearch(
                candidates[candidates.length - 1],
            );
            if (fallbackLocations.length > 0) {
                return fallbackLocations;
            }
        } catch {
            // Ignorar error final
        }
    }

    return [];
}

export async function reverseGeocode(
    lat: number,
    lng: number,
): Promise<MapLocation | null> {
    const normLat = Number(lat.toFixed(6));
    const normLng = Number(lng.toFixed(6));

    // 1. Intentar con Nominatim
    try {
        const params = new URLSearchParams({
            format: "json",
            lat: String(normLat),
            lon: String(normLng),
            addressdetails: "1",
        });

        const response = await fetch(
            `${NOMINATIM_BASE}/reverse?${params.toString()}`,
            {
                headers: {
                    "Accept-Language": "es",
                    "User-Agent": USER_AGENT,
                },
                next: { revalidate: 3600 },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            },
        );

        if (response.ok) {
            const result = (await response.json()) as NominatimResult;
            if (result.display_name) {
                const loc = toMapLocation(result);
                loc.lat = normLat;
                loc.lng = normLng;
                return loc;
            }
        }
    } catch {
        // Fallback a Photon abajo
    }

    // 2. Respaldo con Photon reverse geocoding
    try {
        const params = new URLSearchParams({
            lat: String(normLat),
            lon: String(normLng),
        });
        const response = await fetch(
            `${PHOTON_BASE}/reverse?${params.toString()}`,
            {
                headers: {
                    "User-Agent": USER_AGENT,
                },
                next: { revalidate: 3600 },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            },
        );
        if (response.ok) {
            const data = (await response.json()) as PhotonResponse;
            const first = data.features?.[0];
            if (first) {
                const mapped = photonFeatureToMapLocation(first);
                if (mapped) {
                    mapped.lat = normLat;
                    mapped.lng = normLng;
                    return mapped;
                }
            }
        }
    } catch {
        // Ignorar error y devolver fallback con coordenadas
    }

    return {
        address: `Ubicación marcada (${normLat.toFixed(5)}, ${normLng.toFixed(5)})`,
        city: null,
        lat: normLat,
        lng: normLng,
    };
}
