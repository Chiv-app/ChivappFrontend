/**
 * Perfil artístico activo del músico. Una persona puede tener varios perfiles (hasta 3); la app elige con
 * cuál trabaja mandando su id en la cabecera `X-Musician-Profile-Id`. El servidor solo lo acepta si el perfil
 * es de quien hace la petición; si no, usa el principal.
 */
export const ACTIVE_PROFILE_KEY = "chivapp:active-musician-profile";
export const ACTIVE_PROFILE_HEADER = "X-Musician-Profile-Id";
export const ONBOARDING_PREV_PROFILE_KEY = "chivapp:onboarding-prev-profile";
export const ONBOARDING_RETURN_PATH_KEY = "chivapp:onboarding-return-path";

const PRIMARY_SENTINEL = "__primary__";
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

function isSafeReturnPath(path: string | null | undefined): path is string {
    return Boolean(
        path &&
            path.startsWith("/") &&
            !path.startsWith("//") &&
            !path.includes("\\") &&
            !path.startsWith("/musician/onboarding"),
    );
}

/** Guarda el perfil activo previo y la ruta actual antes de entrar al onboarding de un perfil adicional. */
export function saveOnboardingReturnState(
    previousProfileId: string | null,
    returnPath?: string | null,
): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            ONBOARDING_PREV_PROFILE_KEY,
            previousProfileId && isProfileId(previousProfileId)
                ? previousProfileId
                : PRIMARY_SENTINEL,
        );
        if (isSafeReturnPath(returnPath)) {
            window.localStorage.setItem(ONBOARDING_RETURN_PATH_KEY, returnPath);
        } else {
            window.localStorage.removeItem(ONBOARDING_RETURN_PATH_KEY);
        }
    } catch {
        // ignore storage errors
    }
}

export function peekOnboardingReturnState(): {
    hasReturnState: boolean;
    previousProfileId: string | null;
    returnPath: string;
} {
    if (typeof window === "undefined") {
        return { hasReturnState: false, previousProfileId: null, returnPath: "/musician" };
    }
    try {
        const rawPrev = window.localStorage.getItem(ONBOARDING_PREV_PROFILE_KEY);
        const rawPath = window.localStorage.getItem(ONBOARDING_RETURN_PATH_KEY);
        const previousProfileId = isProfileId(rawPrev) ? rawPrev : null;
        const returnPath = isSafeReturnPath(rawPath) ? rawPath : "/musician";
        return {
            hasReturnState: rawPrev !== null || rawPath !== null,
            previousProfileId,
            returnPath,
        };
    } catch {
        return { hasReturnState: false, previousProfileId: null, returnPath: "/musician" };
    }
}

export function consumeOnboardingReturnState(): {
    previousProfileId: string | null;
    returnPath: string;
} {
    const state = peekOnboardingReturnState();
    if (typeof window !== "undefined") {
        try {
            window.localStorage.removeItem(ONBOARDING_PREV_PROFILE_KEY);
            window.localStorage.removeItem(ONBOARDING_RETURN_PATH_KEY);
        } catch {
            // ignore storage errors
        }
    }
    return {
        previousProfileId: state.previousProfileId,
        returnPath: state.returnPath,
    };
}

/** Cabecera para las peticiones del navegador; vacía si no hay un perfil elegido. */
export function activeProfileHeaders(): Record<string, string> {
    const id = getActiveProfileId();
    return id ? { [ACTIVE_PROFILE_HEADER]: id } : {};
}
