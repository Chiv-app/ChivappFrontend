"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useIsClient } from "@/hooks/use-is-client";
import {
    COOKIE_CONSENT_EVENT,
    COOKIE_CONSENT_STORAGE_KEY as STORAGE_KEY,
} from "@/lib/cookie-consent";

function hasConsented(): boolean {
    try {
        return window.localStorage.getItem(STORAGE_KEY) != null;
    } catch {
        // Sin localStorage (ej. modo privado estricto): no insistimos con el banner.
        return true;
    }
}

export default function CookieConsentBanner() {
    const isClient = useIsClient();
    const [dismissed, setDismissed] = useState(false);

    function handleAccept() {
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ accepted: true, at: new Date().toISOString() }),
            );
        } catch {
            // ignore
        }
        // Avisa a AnalyticsGate para que cargue Google Analytics sin recargar.
        window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
        setDismissed(true);
    }

    // SSR + hydration: nada hasta que el cliente pueda leer localStorage.
    if (!isClient || dismissed || hasConsented()) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-default-200/70 bg-content1/95 backdrop-blur-md shadow-elevated">
            <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2 text-sm text-foreground max-w-3xl">
                    <Icon
                        icon="material-symbols:cookie-outline"
                        className="text-lg text-primary shrink-0 mt-0.5"
                    />
                    <p>
                        Usamos una cookie esencial para mantener tu sesión iniciada y, si
                        aceptas, cookies de analítica (Google Analytics) para mejorar el
                        servicio.{" "}
                        <Link
                            href="/legal/privacidad#cookies"
                            className="underline underline-offset-2 hover:text-primary"
                        >
                            Más información
                        </Link>
                    </p>
                </div>
                <Button
                    size="sm"
                    color="primary"
                    radius="lg"
                    className="shrink-0"
                    onPress={handleAccept}
                >
                    Aceptar
                </Button>
            </div>
        </div>
    );
}
