import { getInstrumentIcon } from "@/lib/instrument-icons";

/**
 * Íconos de las opciones de la guía de perfil (géneros, instrumentos y ciudades).
 *
 * Todos salen de los conjuntos que la app empaqueta sin conexión (`mdi` y `material-symbols`, ver
 * `npm run icons:generate`). Los nombres van como texto literal para que el generador los encuentre.
 */
const GENRE_ICONS: Record<string, string> = {
    salsa: "mdi:trumpet",
    cumbia: "mdi:music-circle-outline",
    rock: "mdi:guitar-electric",
    pop: "mdi:microphone-variant",
    balada: "mdi:piano",
    "musica criolla": "mdi:guitar-acoustic",
    huayno: "mdi:image-filter-hdr-outline",
    jazz: "mdi:saxophone",
    reggaeton: "mdi:speaker",
    bachata: "mdi:heart-outline",
    boleros: "mdi:glass-wine",
    folclore: "mdi:human-female-dance",
};

const CITY_ICONS: Record<string, string> = {
    lima: "mdi:city-variant-outline",
    arequipa: "mdi:volcano-outline",
    cusco: "mdi:image-filter-hdr-outline",
    trujillo: "material-symbols:local-florist-outline",
    piura: "material-symbols:sunny-outline",
    chiclayo: "mdi:pyramid",
};

/** Instrumentos propios de la guía que no están (o se ven repetidos) en el mapa general del perfil. */
const GUIDE_INSTRUMENT_ICONS: Record<string, string> = {
    charango: "mdi:guitar-pick-outline",
};

export const GENERIC_GENRE_ICON = "material-symbols:music-note";

/** Íconos de los campos «Otro género» y «Otro instrumento»: distintos entre sí y de cualquier ficha. */
export const OTHER_GENRE_ICON = "mdi:playlist-music-outline";
export const OTHER_INSTRUMENT_ICON = "mdi:music-box-outline";
export const GENERIC_CITY_ICON = "material-symbols:location-on-outline";

function normalize(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

export function getGenreIcon(name: string): string {
    return GENRE_ICONS[normalize(name)] ?? GENERIC_GENRE_ICON;
}

export function getCityIcon(name: string): string {
    return CITY_ICONS[normalize(name)] ?? GENERIC_CITY_ICON;
}

export function getGuideInstrumentIcon(name: string): string {
    return GUIDE_INSTRUMENT_ICONS[normalize(name)] ?? getInstrumentIcon(name);
}
