/**
 * Eventos del embudo de conversión (WP-23) y gestión de preferencias de cookies (WP-18).
 */

export type FunnelEventName =
    | "search_musicians"
    | "view_musician_profile"
    | "start_quote_request"
    | "submit_quote_request"
    | "accept_quote_contract"
    | "start_checkout_payment"
    | "complete_checkout_payment";

export const COOKIE_CONSENT_STORAGE_KEY = "chivapp_cookie_consent_v1";

export type CookieConsentValue = "accepted" | "essential_only" | null;

export function getCookieConsent(): CookieConsentValue {
    if (typeof window === "undefined") return null;
    try {
        const val = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        if (val === "accepted" || val === "essential_only") return val;
        return null;
    } catch {
        return null;
    }
}

export function setCookieConsent(value: "accepted" | "essential_only"): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
        window.dispatchEvent(new CustomEvent("chivapp:cookie-consent-changed", { detail: value }));
    } catch {
        // Ignore storage errors in private browsing
    }
}

export function resetCookieConsent(): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent("chivapp:cookie-consent-changed", { detail: null }));
    } catch {
        // Ignore storage errors
    }
}

export function trackFunnelEvent(
    event: FunnelEventName,
    properties?: Record<string, string | number | boolean | null | undefined>,
): void {
    if (typeof window === "undefined") return;
    if (getCookieConsent() !== "accepted") return;

    const w = window as Window & {
        gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
        dataLayer?: Array<Record<string, unknown>>;
    };

    if (typeof w.gtag === "function") {
        w.gtag("event", event, properties ?? {});
        return;
    }

    if (Array.isArray(w.dataLayer)) {
        w.dataLayer.push({ event, ...(properties ?? {}) });
    }
}
