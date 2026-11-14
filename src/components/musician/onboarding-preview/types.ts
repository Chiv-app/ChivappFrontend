/** Datos y mensajes de la vista previa del perfil dentro de la guía de alta. */

export const PREVIEW_ROUTE = "/musician/onboarding/preview";
export const PREVIEW_DRAFT_MESSAGE = "chivapp:onboarding-preview-draft";
export const PREVIEW_READY_MESSAGE = "chivapp:onboarding-preview-ready";

/** Parte del perfil que alimenta el paso actual de la guía (se resalta en la vista previa). */
export type PreviewFocus = "name" | "photo" | "specialty" | "bio" | "location" | "price" | null;

export type PreviewDraft = {
    name: string;
    city: string;
    price: string;
    genres: string[];
    instruments: string[];
    bio: string;
    /** Ruta `/uploads/...` o `blob:` de la foto; nunca una URL externa. */
    photo: string | null;
};

export const EMPTY_PREVIEW_DRAFT: PreviewDraft = {
    name: "",
    city: "",
    price: "",
    genres: [],
    instruments: [],
    bio: "",
    photo: null,
};

const FOCUS_VALUES: ReadonlySet<string> = new Set(["name", "photo", "specialty", "bio", "location", "price"]);

const MAX_TEXT = 700;
const MAX_ITEMS = 20;
const MAX_ITEM_LENGTH = 60;

function text(value: unknown, max = MAX_TEXT): string | null {
    return typeof value === "string" && value.length <= max ? value : null;
}

function list(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length > MAX_ITEMS) return null;
    const items: string[] = [];
    for (const item of value) {
        const parsed = text(item, MAX_ITEM_LENGTH);
        if (parsed === null) return null;
        items.push(parsed);
    }
    return items;
}

/** Solo se aceptan fotos propias de la app: una ruta de subida o un blob creado en esta misma página. */
export function isSafePhotoSrc(value: string): boolean {
    return value.startsWith("/uploads/") || value.startsWith("blob:");
}

/** Valida lo que llega por postMessage: lo que no encaja se descarta entero en lugar de mostrarse. */
export function parsePreviewDraft(value: unknown): PreviewDraft | null {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const name = text(raw.name, 120);
    const city = text(raw.city, 80);
    const price = text(raw.price, 8);
    const bio = text(raw.bio);
    const genres = list(raw.genres);
    const instruments = list(raw.instruments);
    if (name === null || city === null || price === null || bio === null || !genres || !instruments) return null;

    let photo: string | null = null;
    if (raw.photo !== null && raw.photo !== undefined) {
        if (typeof raw.photo !== "string" || !isSafePhotoSrc(raw.photo)) return null;
        photo = raw.photo;
    }
    return { name, city, price, genres, instruments, bio, photo };
}

export function parsePreviewFocus(value: unknown): PreviewFocus {
    return typeof value === "string" && FOCUS_VALUES.has(value) ? (value as PreviewFocus) : null;
}
