"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Indica si la página ya se desplazó más de `threshold` px.
 *
 * Con `enabled = false` devuelve siempre `true` (es decir, «ya visible»), para poder usar la misma
 * clase de CSS en las páginas donde el elemento no debe esperar al scroll. En el servidor y en el
 * primer render devuelve `!enabled`, así que el HTML inicial ya sale oculto sin parpadeo.
 */
export function useScrolledPast(threshold = 80, enabled = true): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (!enabled) return () => undefined;
            window.addEventListener("scroll", onChange, { passive: true });
            return () => window.removeEventListener("scroll", onChange);
        },
        [enabled],
    );
    const getSnapshot = useCallback(
        () => (enabled ? window.scrollY > threshold : true),
        [enabled, threshold],
    );
    return useSyncExternalStore(subscribe, getSnapshot, () => !enabled);
}
