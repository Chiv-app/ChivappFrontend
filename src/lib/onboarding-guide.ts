import { GROUP_SIZE_OPTIONS, type GroupSize, type ProfileDetails, type ProfileKind, parseDetails } from "@/lib/profile-details";
import type { MusicianProfileOut } from "@/types/api";

/** Pasos de la guía de alta del músico, en orden. */
export type GuideStepId =
    | "welcome"
    | "tipo"
    | "nombre"
    | "toca"
    | "eventos"
    | "donde"
    | "show"
    | "reservas"
    | "foto"
    | "bio"
    | "dni"
    | "firma"
    | "revision"
    | "enviado";

/** Pasos que cuentan en «Capítulo · n de m». */
export const FLOW_STEPS: GuideStepId[] = [
    "tipo",
    "nombre",
    "toca",
    "eventos",
    "donde",
    "show",
    "reservas",
    "foto",
    "bio",
    "dni",
    "firma",
    "revision",
];

export const GUIDE_STEPS: GuideStepId[] = ["welcome", ...FLOW_STEPS, "enviado"];

/**
 * Guía corta de un perfil adicional: sin documento ni firma, que ya se dieron con el primer perfil.
 */
export const ADDITIONAL_FLOW: GuideStepId[] = FLOW_STEPS.filter((s) => s !== "dni" && s !== "firma");

export function flowFor(additional: boolean): GuideStepId[] {
    return additional ? ADDITIONAL_FLOW : FLOW_STEPS;
}

export function guideStepsFor(additional: boolean): GuideStepId[] {
    return ["welcome", ...flowFor(additional), "enviado"];
}

/** Pasos que no bloquean: se pueden omitir y completar después desde «Mi perfil». */
export const OPTIONAL_STEPS: GuideStepId[] = ["eventos", "show", "reservas"];

export type ChapterId = "tu" | "musica" | "show" | "imagen" | "verificacion";

export const CHAPTERS: { id: ChapterId; title: string; icon: string }[] = [
    { id: "tu", title: "Tú", icon: "mdi:account-music-outline" },
    { id: "musica", title: "Tu música", icon: "mdi:music-note-outline" },
    { id: "show", title: "Tu show", icon: "mdi:party-popper" },
    { id: "imagen", title: "Tu imagen", icon: "mdi:camera-outline" },
    { id: "verificacion", title: "Verificación", icon: "mdi:shield-check-outline" },
];

export const STEP_CHAPTER: Partial<Record<GuideStepId, ChapterId>> = {
    tipo: "tu",
    nombre: "tu",
    toca: "musica",
    eventos: "musica",
    donde: "show",
    show: "show",
    reservas: "show",
    foto: "imagen",
    bio: "imagen",
    dni: "verificacion",
    firma: "verificacion",
    revision: "verificacion",
};

/** Minutos aproximados por paso, para «≈ n min restantes». */
export const STEP_MINUTES: Partial<Record<GuideStepId, number>> = {
    tipo: 0.5,
    nombre: 0.5,
    toca: 1,
    eventos: 0.5,
    donde: 1,
    show: 0.5,
    reservas: 0.5,
    foto: 0.5,
    bio: 1,
    dni: 1,
    firma: 0.5,
    revision: 0.5,
};

export function minutesLeft(from: GuideStepId, flow: GuideStepId[] = FLOW_STEPS): number {
    const index = flow.indexOf(from);
    if (index < 0) return 0;
    const total = flow.slice(index).reduce((sum, step) => sum + (STEP_MINUTES[step] ?? 0), 0);
    return Math.max(1, Math.round(total));
}

export function totalMinutes(flow: GuideStepId[] = FLOW_STEPS): number {
    return Math.max(1, Math.round(flow.reduce((sum, step) => sum + (STEP_MINUTES[step] ?? 0), 0)));
}

export const STEP_LABELS: Record<GuideStepId, string> = {
    welcome: "Bienvenida",
    tipo: "Cómo trabajas",
    nombre: "Nombre",
    toca: "Qué tocas",
    eventos: "Eventos",
    donde: "Dónde y cuánto",
    show: "Tu show",
    reservas: "Reservas",
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
    /** null mientras la persona no haya elegido: es la primera pregunta de la guía. */
    profileType: ProfileKind | null;
    groupSize: GroupSize | null;
    details: ProfileDetails;
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
    | "kind"
    | "groupSize"
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
        profileType: null,
        groupSize: null,
        details: {},
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
    const data: GuideData = {
        profileType: null,
        groupSize: null,
        details: parseDetails(profile.details),
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
    // El backend siempre devuelve un tipo («solo» por defecto), así que no distingue «elegí solista» de
    // «aún no elegí». Un perfil sin ningún avance vuelve a preguntarlo; uno con avance conserva el suyo.
    if (hasAnyProgress(data)) {
        data.profileType = profile.profile_type === "group" ? "group" : "solo";
        data.groupSize = GROUP_SIZE_OPTIONS.find((o) => o.value === profile.group_size)?.value ?? null;
    }
    return data;
}

/** Valida un paso. Devuelve el primer problema (con el campo al que enfocar) o null. */
export function validateStep(step: GuideStepId, d: GuideData, additional = false): GuideError | null {
    switch (step) {
        case "tipo":
            if (!d.profileType) return { field: "kind", message: "Elige cómo trabajas: solo o en grupo." };
            if (d.profileType === "group" && !d.groupSize) {
                return { field: "groupSize", message: "Indica cuántas personas son." };
            }
            return null;
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
            const missing = incompleteSteps(d, additional);
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

const DATA_STEPS: GuideStepId[] = ["tipo", "nombre", "toca", "donde", "foto", "bio", "dni", "firma"];

/** Pasos con datos que aún faltan, en orden. */
export function incompleteSteps(d: GuideData, additional = false): GuideStepId[] {
    return DATA_STEPS.filter((s) => !(additional && (s === "dni" || s === "firma"))).filter((s) => validateStep(s, d) !== null);
}

/**
 * Hay avance cuando la persona ya llenó algo suyo. El documento y la firma no cuentan: en un perfil adicional
 * llegan copiados del primero y no significan que haya empezado este perfil.
 */
function hasAnyProgress(d: GuideData): boolean {
    return Boolean(d.genres.length || d.instruments.length || d.city.trim() || d.price || d.photoUrl || d.bio.trim());
}

/** Paso en el que retomar: la bienvenida si no hay avance, o el primer paso incompleto. */
export function resumeStep(d: GuideData, additional = false): GuideStepId {
    if (!hasAnyProgress(d)) return "welcome";
    return incompleteSteps(d, additional)[0] ?? "revision";
}

/** Borrador de biografía con los datos ya dados (sin IA: es una plantilla). */
export function buildBioDraft(d: Pick<GuideData, "name" | "city" | "genres" | "instruments">): string {
    const who = d.name.trim() || "artista";
    const city = d.city.trim() || "tu ciudad";
    const instruments = d.instruments.length ? d.instruments.slice(0, 3).join(", ").toLowerCase() : "música";
    const genres = d.genres.length ? d.genres.slice(0, 3).join(", ").toLowerCase() : "varios géneros";
    return `Soy ${who}, artista de ${city}. Toco ${instruments} y me especializo en ${genres}. Pongo repertorio a la medida de cada celebración para que tu evento se disfrute de principio a fin.`;
}
