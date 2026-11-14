import type { MusicianProfileOut } from "@/types/api";

/** Pasos de la guía de alta del músico, en orden. */
export type GuideStepId =
    | "welcome"
    | "nombre"
    | "toca"
    | "donde"
    | "foto"
    | "bio"
    | "dni"
    | "firma"
    | "revision"
    | "enviado";

export const GUIDE_STEPS: GuideStepId[] = [
    "welcome",
    "nombre",
    "toca",
    "donde",
    "foto",
    "bio",
    "dni",
    "firma",
    "revision",
    "enviado",
];

/** Pasos que cuentan en «Paso n de 8». */
export const FLOW_STEPS: GuideStepId[] = ["nombre", "toca", "donde", "foto", "bio", "dni", "firma", "revision"];

export const STEP_LABELS: Record<GuideStepId, string> = {
    welcome: "Bienvenida",
    nombre: "Nombre",
    toca: "Qué tocas",
    donde: "Dónde y cuánto",
    foto: "Foto",
    bio: "Biografía",
    dni: "Identidad",
    firma: "Firma",
    revision: "Revisión",
    enviado: "Enviado",
};

export const GENRE_OPTIONS = [
    "Salsa",
    "Cumbia",
    "Rock",
    "Pop",
    "Balada",
    "Música criolla",
    "Huayno",
    "Jazz",
    "Reggaetón",
    "Bachata",
    "Boleros",
    "Folclore",
];

export const INSTRUMENT_OPTIONS = [
    "Voz",
    "Guitarra",
    "Teclado",
    "Bajo",
    "Batería",
    "Violín",
    "Trompeta",
    "Saxofón",
    "Percusión",
    "Cajón",
    "Charango",
    "Acordeón",
];

export const CITY_OPTIONS = ["Lima", "Arequipa", "Cusco", "Trujillo", "Piura", "Chiclayo"];

export const MAX_GENRES = 5;
export const BIO_MIN_LENGTH = 40;
export const NAME_MIN_LENGTH = 2;

export type GuideData = {
    name: string;
    fullname: string;
    genres: string[];
    instruments: string[];
    city: string;
    price: string;
    priceHour: string;
    photoUrl: string | null;
    bio: string;
    dniUrl: string | null;
    signatureUrl: string | null;
    signatureDataUrl: string | null;
};

export type GuideField =
    | "name"
    | "genres"
    | "instruments"
    | "city"
    | "price"
    | "photo"
    | "bio"
    | "fullname"
    | "dni"
    | "signature"
    | "review";

export type GuideError = { field: GuideField; message: string };

export function emptyGuideData(): GuideData {
    return {
        name: "",
        fullname: "",
        genres: [],
        instruments: [],
        city: "",
        price: "",
        priceHour: "",
        photoUrl: null,
        bio: "",
        dniUrl: null,
        signatureUrl: null,
        signatureDataUrl: null,
    };
}

function toPriceText(value: number | string | null | undefined): string {
    if (value == null || value === "") return "";
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "";
    return String(Math.round(n));
}

export function dataFromProfile(profile: MusicianProfileOut, fallbackFullname?: string | null): GuideData {
    return {
        name: profile.stage_name ?? "",
        fullname: (profile.fullname ?? fallbackFullname ?? "").trim(),
        genres: profile.genres ?? [],
        instruments: profile.instruments ?? [],
        city: profile.location_city ?? "",
        price: toPriceText(profile.price_per_event as number | string | null | undefined),
        priceHour: toPriceText(profile.price_per_hour as number | string | null | undefined),
        photoUrl: profile.profile_image_url ?? null,
        bio: profile.bio ?? "",
        dniUrl: profile.id_document_url ?? null,
        signatureUrl: profile.signature_image_url ?? null,
        signatureDataUrl: null,
    };
}

/** Valida un paso. Devuelve el primer problema (con el campo al que enfocar) o null. */
export function validateStep(step: GuideStepId, d: GuideData): GuideError | null {
    switch (step) {
        case "nombre":
            return d.name.trim().length >= NAME_MIN_LENGTH
                ? null
                : { field: "name", message: "Escribe tu nombre artístico (mínimo 2 letras)." };
        case "toca":
            if (d.genres.length === 0) return { field: "genres", message: "Elige al menos un género." };
            if (d.instruments.length === 0) {
                return { field: "instruments", message: "Elige al menos un instrumento. La voz también cuenta." };
            }
            return null;
        case "donde":
            if (!d.city.trim()) return { field: "city", message: "Elige tu ciudad para aparecer en las búsquedas." };
            if (!(Number(d.price) > 0)) {
                return { field: "price", message: "Indica cuánto cobras por evento. Puedes cambiarlo cuando quieras." };
            }
            return null;
        case "foto":
            return d.photoUrl ? null : { field: "photo", message: "Sube una foto donde se te vea bien la cara." };
        case "bio": {
            const missing = BIO_MIN_LENGTH - d.bio.trim().length;
            return missing <= 0
                ? null
                : { field: "bio", message: `Te faltan ${missing} caracteres para que quede completa.` };
        }
        case "dni":
            if (d.fullname.trim().length < NAME_MIN_LENGTH) {
                return { field: "fullname", message: "Escribe tu nombre completo, como aparece en tu documento." };
            }
            return d.dniUrl ? null : { field: "dni", message: "Sube una foto de tu documento para continuar." };
        case "firma":
            return d.signatureDataUrl || d.signatureUrl
                ? null
                : { field: "signature", message: "Dibuja tu firma o escribe tu nombre." };
        case "revision": {
            const missing = incompleteSteps(d);
            return missing.length === 0
                ? null
                : {
                      field: "review",
                      message: `Falta completar: ${missing.map((s) => STEP_LABELS[s].toLowerCase()).join(", ")}.`,
                  };
        }
        default:
            return null;
    }
}

const DATA_STEPS: GuideStepId[] = ["nombre", "toca", "donde", "foto", "bio", "dni", "firma"];

/** Pasos con datos que aún faltan, en orden. */
export function incompleteSteps(d: GuideData): GuideStepId[] {
    return DATA_STEPS.filter((s) => validateStep(s, d) !== null);
}

function hasAnyProgress(d: GuideData): boolean {
    return Boolean(
        d.genres.length ||
            d.instruments.length ||
            d.city.trim() ||
            d.price ||
            d.photoUrl ||
            d.bio.trim() ||
            d.dniUrl ||
            d.signatureUrl,
    );
}

/** Paso en el que retomar: la bienvenida si no hay avance, o el primer paso incompleto. */
export function resumeStep(d: GuideData): GuideStepId {
    if (!hasAnyProgress(d)) return "welcome";
    return incompleteSteps(d)[0] ?? "revision";
}

/** Borrador de biografía con los datos ya dados (sin IA: es una plantilla). */
export function buildBioDraft(d: Pick<GuideData, "name" | "city" | "genres" | "instruments">): string {
    const who = d.name.trim() || "artista";
    const city = d.city.trim() || "tu ciudad";
    const instruments = d.instruments.length ? d.instruments.slice(0, 3).join(", ").toLowerCase() : "música";
    const genres = d.genres.length ? d.genres.slice(0, 3).join(", ").toLowerCase() : "varios géneros";
    return `Soy ${who}, artista de ${city}. Toco ${instruments} y me especializo en ${genres}. Pongo repertorio a la medida de cada celebración para que tu evento se disfrute de principio a fin.`;
}
