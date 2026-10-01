"use client";

import { useSyncExternalStore } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { hasAnalyticsConsent, subscribeToCookieConsent } from "@/lib/cookie-consent";

/**
 * Carga Google Analytics solo después de que el usuario acepta cookies en
 * `CookieConsentBanner`. Por defecto (SSR, sin consentimiento o sin
 * localStorage) no se carga nada.
 */
export default function AnalyticsGate({ gaId }: { gaId: string }) {
    const consented = useSyncExternalStore(
        subscribeToCookieConsent,
        hasAnalyticsConsent,
        () => false,
    );

    if (!consented) return null;
    return <GoogleAnalytics gaId={gaId} />;
}
