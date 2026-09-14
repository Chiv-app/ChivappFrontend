/**
 * Utilidades para manejo y visualización de fechas y horas en zona horaria oficial de Perú (America/Lima, UTC-5).
 */

export const PERU_TIMEZONE = "America/Lima";
export const PERU_LOCALE = "es-PE";

/**
 * Formatea una fecha en formato legible en español (Perú).
 * Ej: "jueves, 10 de septiembre de 2026" o con opciones personalizadas.
 */
export function formatPeruDate(
    value: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!value) return "—";
    const date = typeof value === "string" 
        ? (value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00-05:00`))
        : value;
    
    if (Number.isNaN(date.getTime())) return "—";

    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: PERU_TIMEZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    };

    return date.toLocaleDateString(PERU_LOCALE, options ?? defaultOptions);
}

/**
 * Formatea una hora en formato corto HH:MM en horario de Perú.
 * Admite strings tipo "19:00:00", "19:00" o Date/ISO string.
 */
export function formatPeruTime(value: string | Date | null | undefined): string {
    if (!value) return "—";
    if (typeof value === "string" && !value.includes("T")) {
        // String directo de tiempo "HH:mm:ss" o "HH:mm"
        return value.slice(0, 5);
    }
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString(PERU_LOCALE, {
        timeZone: PERU_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/**
 * Formatea fecha y hora completa en horario de Perú.
 * Ej: "10 de sep. de 2026, 19:30"
 */
export function formatPeruDateTime(
    value: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "—";

    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: PERU_TIMEZONE,
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    return date.toLocaleString(PERU_LOCALE, options ?? defaultOptions);
}

/**
 * Retorna un objeto Date interpretando fecha y hora en el huso horario de Perú (-05:00).
 */
export function getPeruEventDate(eventDate: string, startTime: string): Date {
    const cleanTime = startTime.slice(0, 8);
    // Interpretar explícitamente en UTC-5 (hora de Perú)
    return new Date(`${eventDate}T${cleanTime}-05:00`);
}

/**
 * Formatea un timestamp ISO genérico a formato legible.
 * Ej: "10 de sep. de 2026, 19:30"
 */
export function formatDateTime(value: string | Date | null | undefined): string {
    return formatPeruDateTime(value);
}
