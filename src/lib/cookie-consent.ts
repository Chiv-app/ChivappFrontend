/** Clave de localStorage donde el banner guarda la aceptación de cookies. */
export const COOKIE_CONSENT_STORAGE_KEY = "chivapp_cookie_consent";

/** Evento que el banner emite en `window` cuando el usuario acepta. */
export const COOKIE_CONSENT_EVENT = "chivapp:cookie-consent";

/**
 * true solo si el usuario pulsó "Aceptar" en el banner.
 * Sin localStorage o con un valor inválido se asume que NO hay consentimiento.
 */
export function hasAnalyticsConsent(): boolean {
    try {
        const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { accepted?: unknown } | null;
        return parsed?.accepted === true;
    } catch {
        return false;
    }
}

export function subscribeToCookieConsent(callback: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
        if (event.key === COOKIE_CONSENT_STORAGE_KEY) callback();
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, callback);
    window.addEventListener("storage", onStorage);
    return () => {
        window.removeEventListener(COOKIE_CONSENT_EVENT, callback);
        window.removeEventListener("storage", onStorage);
    };
}
