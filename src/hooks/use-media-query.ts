"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Indica si coincide una media query. En el servidor y en el primer render devuelve `false`. */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const list = window.matchMedia(query);
            list.addEventListener("change", onChange);
            return () => list.removeEventListener("change", onChange);
        },
        [query],
    );
    const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
