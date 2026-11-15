/**
 * Tipo de perfil (solista o grupo) y datos de detalle del artista.
 * Los valores son los mismos que acepta el backend (`app/services/profile_details.py`): cualquier otro se rechaza.
 * Los íconos van como texto literal para que el generador de íconos sin conexión los encuentre.
 */

export type ProfileKind = "solo" | "group";
export type GroupSize = "2" | "3" | "4-5" | "6-8" | "9+";

export type Option<V extends string = string> = { value: V; label: string; icon: string };

export type ProfileDetails = {
    event_types?: string[];
    audience?: string;
    duration?: string;
    includes?: string[];
    setup?: string;
    other_cities?: string[];
    travel_fee?: string;
    notice?: string;
    experience?: string;
    format?: string;
    reduced?: string;
};

export const PROFILE_KIND_OPTIONS: { value: ProfileKind; title: string; description: string; note: string; icon: string }[] = [
    { value: "solo", title: "Trabajo solo", description: "Eres solista.", note: "Tu perfil se centra en ti.", icon: "mdi:account-music-outline" },
    { value: "group", title: "Somos un grupo", description: "Varias personas, un solo perfil.", note: "Luego invitas a tus integrantes y repartes los pagos.", icon: "mdi:account-group-outline" },
];

export const GROUP_SIZE_OPTIONS: Option<GroupSize>[] = [
    { value: "2", label: "2 · Dúo", icon: "mdi:account-multiple-outline" },
    { value: "3", label: "3 · Trío", icon: "mdi:account-multiple-outline" },
    { value: "4-5", label: "4 a 5", icon: "mdi:account-group-outline" },
    { value: "6-8", label: "6 a 8", icon: "mdi:account-group-outline" },
    { value: "9+", label: "9 o más", icon: "mdi:account-group-outline" },
];

export const EVENT_TYPE_OPTIONS: Option[] = [
    { value: "bodas", label: "Bodas", icon: "mdi:ring" },
    { value: "cumpleanos", label: "Cumpleaños", icon: "mdi:cake-variant-outline" },
    { value: "quinceaneros", label: "Quinceañeros", icon: "mdi:crown-outline" },
    { value: "bautizos", label: "Bautizos y comuniones", icon: "mdi:church-outline" },
    { value: "aniversarios", label: "Aniversarios", icon: "mdi:glass-wine" },
    { value: "infantiles", label: "Fiestas infantiles", icon: "mdi:balloon" },
    { value: "empresa", label: "Eventos de empresa", icon: "mdi:briefcase-outline" },
    { value: "inauguraciones", label: "Inauguraciones", icon: "mdi:ribbon" },
    { value: "restaurantes", label: "Restaurantes y bares", icon: "mdi:silverware-fork-knife" },
];

export const AUDIENCE_OPTIONS: Option[] = [
    { value: "50", label: "Hasta 50", icon: "mdi:account-multiple-outline" },
    { value: "150", label: "50 a 150", icon: "mdi:account-group-outline" },
    { value: "300", label: "150 a 300", icon: "mdi:account-group-outline" },
    { value: "300+", label: "Más de 300", icon: "mdi:domain" },
    { value: "any", label: "Cualquier tamaño", icon: "mdi:check-circle-outline" },
];

export const DURATION_OPTIONS: Option[] = [
    { value: "1h", label: "1 hora", icon: "mdi:clock-outline" },
    { value: "2h", label: "2 horas", icon: "mdi:clock-outline" },
    { value: "3h", label: "3 horas", icon: "mdi:clock-outline" },
    { value: "4h+", label: "4 horas o más", icon: "mdi:clock-outline" },
    { value: "flex", label: "A convenir", icon: "mdi:dots-horizontal" },
];

export const INCLUDE_OPTIONS: Option[] = [
    { value: "sound", label: "Sonido", icon: "mdi:speaker" },
    { value: "lights", label: "Iluminación", icon: "mdi:lightbulb-on-outline" },
    { value: "transport", label: "Transporte", icon: "mdi:car-outline" },
    { value: "outfit", label: "Vestuario de gala", icon: "mdi:hanger" },
    { value: "requests", label: "Canciones a pedido", icon: "mdi:playlist-music-outline" },
    { value: "mc", label: "Animador", icon: "mdi:microphone-outline" },
];

export const SETUP_OPTIONS: Option[] = [
    { value: "30m", label: "30 minutos", icon: "mdi:timer-outline" },
    { value: "1h", label: "1 hora", icon: "mdi:timer-outline" },
    { value: "2h+", label: "2 horas o más", icon: "mdi:timer-outline" },
];

export const TRAVEL_FEE_OPTIONS: Option[] = [
    { value: "yes", label: "Sí", icon: "mdi:check-circle-outline" },
    { value: "no", label: "No", icon: "mdi:close-circle-outline" },
    { value: "maybe", label: "A convenir", icon: "mdi:dots-horizontal" },
];

export const NOTICE_OPTIONS: Option[] = [
    { value: "0", label: "Mismo día", icon: "mdi:calendar-clock-outline" },
    { value: "2d", label: "2 días", icon: "mdi:calendar-clock-outline" },
    { value: "1w", label: "1 semana", icon: "mdi:calendar-clock-outline" },
    { value: "2w", label: "2 semanas", icon: "mdi:calendar-clock-outline" },
    { value: "1m", label: "1 mes", icon: "mdi:calendar-clock-outline" },
];

export const EXPERIENCE_OPTIONS: Option[] = [
    { value: "<2", label: "Menos de 2 años", icon: "mdi:medal-outline" },
    { value: "2-5", label: "2 a 5 años", icon: "mdi:medal-outline" },
    { value: "5-10", label: "5 a 10 años", icon: "mdi:medal-outline" },
    { value: "10+", label: "Más de 10 años", icon: "mdi:medal-outline" },
];

export const FORMAT_OPTIONS: Option[] = [
    { value: "acoustic", label: "Acústico", icon: "mdi:guitar-acoustic" },
    { value: "electric", label: "Eléctrico", icon: "mdi:guitar-electric" },
    { value: "orchestra", label: "Orquesta", icon: "mdi:violin" },
    { value: "mixed", label: "Mixto", icon: "mdi:music-circle-outline" },
];

export const YES_NO_OPTIONS: Option[] = [
    { value: "yes", label: "Sí", icon: "mdi:check-circle-outline" },
    { value: "no", label: "No", icon: "mdi:close-circle-outline" },
];

const SINGLE_LISTS = {
    audience: AUDIENCE_OPTIONS,
    duration: DURATION_OPTIONS,
    setup: SETUP_OPTIONS,
    travel_fee: TRAVEL_FEE_OPTIONS,
    notice: NOTICE_OPTIONS,
    experience: EXPERIENCE_OPTIONS,
    format: FORMAT_OPTIONS,
    reduced: YES_NO_OPTIONS,
} as const;

const MULTI_LISTS = {
    event_types: EVENT_TYPE_OPTIONS,
    includes: INCLUDE_OPTIONS,
} as const;

export const MAX_OTHER_CITIES = 10;
const MAX_CITY_LENGTH = 60;

type SingleKey = keyof typeof SINGLE_LISTS;
type MultiKey = keyof typeof MULTI_LISTS;

export function optionLabel(list: readonly Option[], value: string | undefined): string {
    return list.find((o) => o.value === value)?.label ?? "";
}

export function groupSizeLabel(size: string | null | undefined): string {
    return GROUP_SIZE_OPTIONS.find((o) => o.value === size)?.label.replace(/^\d \· /, "") ?? "";
}

/** Etiqueta corta del tipo de perfil: «Solista», «Dúo», «Trío», «Grupo de 4 a 5» o «Grupo». */
export function profileBadge(kind: ProfileKind | undefined, size: string | null | undefined): string {
    if (kind !== "group") return "Solista";
    if (size === "2") return "Dúo";
    if (size === "3") return "Trío";
    const label = groupSizeLabel(size);
    return label ? `Grupo de ${label}` : "Grupo";
}

/**
 * Se queda solo con claves y valores que el backend acepta. Lo que llega de la API puede tener claves viejas;
 * enviarlas de vuelta haría que el guardado se rechace.
 */
export function parseDetails(raw: unknown): ProfileDetails {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const source = raw as Record<string, unknown>;
    const out: ProfileDetails = {};
    for (const key of Object.keys(SINGLE_LISTS) as SingleKey[]) {
        const value = source[key];
        if (typeof value === "string" && SINGLE_LISTS[key].some((o) => o.value === value)) out[key] = value;
    }
    for (const key of Object.keys(MULTI_LISTS) as MultiKey[]) {
        const value = source[key];
        if (!Array.isArray(value)) continue;
        const allowed = value.filter((v): v is string => typeof v === "string" && MULTI_LISTS[key].some((o) => o.value === v));
        const unique = [...new Set(allowed)];
        if (unique.length) out[key] = unique;
    }
    const cities = source.other_cities;
    if (Array.isArray(cities)) {
        const clean = [
            ...new Set(
                cities
                    .filter((c): c is string => typeof c === "string")
                    .map((c) => c.trim())
                    .filter((c) => c.length >= 2 && c.length <= MAX_CITY_LENGTH),
            ),
        ].slice(0, MAX_OTHER_CITIES);
        if (clean.length) out.other_cities = clean;
    }
    return out;
}

/** Claves exclusivas de grupo: un solista no las tiene. */
export const GROUP_ONLY_KEYS = ["format", "reduced"] as const;

export function withoutGroupOnly(details: ProfileDetails): ProfileDetails {
    const copy = { ...details };
    for (const key of GROUP_ONLY_KEYS) delete copy[key];
    return copy;
}

export function toggleInList(list: string[] | undefined, value: string): string[] | undefined {
    const current = list ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    return next.length ? next : undefined;
}

export type DetailRow = { key: string; label: string; value: string; icon: string };

/** Filas de «Tu show» y «Disponibilidad» para mostrar en el perfil público. Vacío si no hay nada que mostrar. */
export function showRows(details: ProfileDetails, kind: ProfileKind): DetailRow[] {
    const rows: DetailRow[] = [];
    if (details.experience) rows.push({ key: "experience", label: "Experiencia", value: optionLabel(EXPERIENCE_OPTIONS, details.experience), icon: "mdi:medal-outline" });
    if (details.duration) rows.push({ key: "duration", label: "Duración", value: optionLabel(DURATION_OPTIONS, details.duration), icon: "mdi:clock-outline" });
    if (details.includes?.length) {
        rows.push({ key: "includes", label: "Incluye", value: details.includes.map((v) => optionLabel(INCLUDE_OPTIONS, v)).filter(Boolean).join(", "), icon: "mdi:check-circle-outline" });
    }
    if (details.setup) rows.push({ key: "setup", label: "Montaje", value: optionLabel(SETUP_OPTIONS, details.setup), icon: "mdi:timer-outline" });
    if (kind === "group" && details.format) rows.push({ key: "format", label: "Formato", value: optionLabel(FORMAT_OPTIONS, details.format), icon: "mdi:music-circle-outline" });
    if (kind === "group" && details.reduced === "yes") rows.push({ key: "reduced", label: "Formación", value: "También con menos integrantes", icon: "mdi:account-multiple-outline" });
    if (details.notice) rows.push({ key: "notice", label: "Reserva con", value: `${optionLabel(NOTICE_OPTIONS, details.notice)} de antelación`, icon: "mdi:calendar-clock-outline" });
    if (details.other_cities?.length) rows.push({ key: "cities", label: "También en", value: details.other_cities.join(", "), icon: "mdi:map-marker-radius-outline" });
    if (details.travel_fee === "yes") rows.push({ key: "travel", label: "Viáticos", value: "Se cobran fuera de su ciudad", icon: "mdi:car-outline" });
    if (details.travel_fee === "no") rows.push({ key: "travel", label: "Viáticos", value: "No se cobran", icon: "mdi:car-outline" });
    if (details.travel_fee === "maybe") rows.push({ key: "travel", label: "Viáticos", value: "A convenir", icon: "mdi:car-outline" });
    return rows;
}

/** Eventos que anima, como etiquetas. */
export function eventLabels(details: ProfileDetails): string[] {
    return (details.event_types ?? []).map((v) => optionLabel(EVENT_TYPE_OPTIONS, v)).filter(Boolean);
}

export function hasPublicDetails(details: ProfileDetails, kind: ProfileKind): boolean {
    return eventLabels(details).length > 0 || showRows(details, kind).length > 0 || Boolean(details.experience);
}
