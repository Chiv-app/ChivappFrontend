/**
 * Perfil artístico activo del músico. Una persona puede tener varios perfiles (hasta 3); la app elige con
 * cuál trabaja mandando su id en la cabecera `X-Musician-Profile-Id`. El servidor solo lo acepta si el perfil
 * es de quien hace la petición; si no, usa el principal.
 */
export const ACTIVE_PROFILE_KEY = "chivapp:active-musician-profile";
export const ACTIVE_PROFILE_HEADER = "X-Musician-Profile-Id";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProfileId(value: unknown): value is string {
    return typeof value === "string" && UUID_PATTERN.test(value);
}

export function getActiveProfileId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const stored = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
        return isProfileId(stored) ? stored : null;
    } catch {
        return null;
    }
}

export function setActiveProfileId(id: string | null): void {
    if (typeof window === "undefined") return;
    try {
        if (id && isProfileId(id)) window.localStorage.setItem(ACTIVE_PROFILE_KEY, id);
        else window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
    } catch {
        // sin almacenamiento disponible: se usa el perfil principal
    }
}

/** Cabecera para las peticiones del navegador; vacía si no hay un perfil elegido. */
export function activeProfileHeaders(): Record<string, string> {
    const id = getActiveProfileId();
    return id ? { [ACTIVE_PROFILE_HEADER]: id } : {};
}
