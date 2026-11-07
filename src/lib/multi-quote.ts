/**
 * Cotización múltiple: pedir cotización a varios artistas con una sola solicitud.
 * El backend acepta hasta 5 artistas y el envío es todo o nada.
 */
export const MULTI_QUOTE_NAME = "Cotización múltiple";
export const MULTI_QUOTE_MIN = 2;
export const MULTI_QUOTE_MAX = 5;
export const MULTI_QUOTE_PATH = "/cotizacion-multiple";

const ID_PATTERN = /^[0-9a-f-]{8,64}$/i;

/** Lee los identificadores de artistas de la URL: sin repetidos, sin valores raros y con tope. */
export function parseMultiQuoteIds(value: string | null | undefined): string[] {
    if (!value) return [];
    const seen = new Set<string>();
    for (const raw of value.split(",")) {
        const id = raw.trim();
        if (ID_PATTERN.test(id)) seen.add(id);
        if (seen.size >= MULTI_QUOTE_MAX) break;
    }
    return Array.from(seen);
}

export function buildMultiQuoteHref(ids: string[]): string {
    const clean = parseMultiQuoteIds(ids.join(","));
    return `${MULTI_QUOTE_PATH}?ids=${clean.map(encodeURIComponent).join(",")}`;
}
