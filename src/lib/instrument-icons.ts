// Solo íconos que existen en el paquete offline de la app (mdi no trae batería, acordeón, flauta, arpa ni chelo).
const INSTRUMENT_ICON_MAP: Record<string, string> = {
    guitarra: "mdi:guitar-acoustic",
    "guitarra acustica": "mdi:guitar-acoustic",
    "guitarra electrica": "mdi:guitar-electric",
    voz: "mdi:microphone",
    canto: "mdi:microphone",
    "voz principal": "mdi:microphone",
    trompeta: "mdi:trumpet",
    violin: "mdi:violin",
    viola: "mdi:violin",
    chelo: "mdi:violin",
    violonchelo: "mdi:violin",
    guitarrón: "material-symbols:music-note",
    guitarron: "material-symbols:music-note",
    arpa: "mdi:music-note-eighth",
    flauta: "mdi:music-note-eighth",
    piano: "mdi:piano",
    bateria: "mdi:instrument-triangle",
    percusion: "mdi:hand-clap",
    acordeon: "mdi:music-circle-outline",
    saxofon: "mdi:saxophone",
    contrabajo: "mdi:guitar-electric",
    clarinete: "mdi:saxophone",
    bandoneon: "mdi:music-circle-outline",
    maracas: "mdi:instrument-triangle",
    tambor: "mdi:instrument-triangle",
    charango: "mdi:guitar-acoustic",
    quena: "mdi:music-note-eighth",
    cajon: "mdi:cube-outline",
    teclado: "mdi:piano",
    bajo: "mdi:guitar-electric",
    vihuela: "mdi:guitar-acoustic",
};

function normalizeInstrument(name: string): string {
    return name
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

/** Resolves an Iconify icon for a free-text instrument label from profile setup. */
export function getInstrumentIcon(name: string): string {
    const key = normalizeInstrument(name);

    if (INSTRUMENT_ICON_MAP[key]) {
        return INSTRUMENT_ICON_MAP[key];
    }

    for (const [label, icon] of Object.entries(INSTRUMENT_ICON_MAP)) {
        if (key.includes(label) || label.includes(key)) {
            return icon;
        }
    }

    return "material-symbols:music-note";
}

/** Known labels for quick-pick in profile configuration (future use). */
export const COMMON_INSTRUMENTS = [
    "Guitarra",
    "Voz",
    "Trompeta",
    "Violín",
    "Guitarrón",
    "Arpa",
    "Vihuela",
    "Flauta",
    "Percusión",
    "Piano",
] as const;
