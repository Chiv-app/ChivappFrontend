function normalizeUtcString(value: string): string {
    // If it's a full ISO string from the backend (has T) but no timezone (Z or +/-, e.g. 2026-09-15T21:00:00)
    // append 'Z' so the browser parses it as UTC.
    if (value.includes("T") && !value.endsWith("Z") && !value.includes("+") && !value.match(/-\d{2}:\d{2}$/)) {
        return value + "Z";
    }
    return value;
}

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
        ? (value.includes("T") ? new Date(normalizeUtcString(value)) : new Date(`${value}T12:00:00-05:00`))
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
    const date = typeof value === "string" ? new Date(normalizeUtcString(value)) : value;
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
    const date = typeof value === "string" ? new Date(normalizeUtcString(value)) : value;
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

const DEFAULT_EVENT_DURATION_MINUTES = 120;
export const REVIEW_GRACE_HOURS = 24;

/**
 * Retorna la fecha y hora de finalización del evento en huso horario de Perú (-05:00).
 * Si no hay `endTime`, asume 120 minutos desde `startTime`. Si `endTime <= startTime`, suma 1 día.
 */
export function getPeruEventEndDate(
    eventDate: string,
    startTime: string,
    endTime?: string | null,
): Date {
    const start = getPeruEventDate(eventDate, startTime);
    if (endTime) {
        const end = getPeruEventDate(eventDate, endTime);
        if (end.getTime() <= start.getTime()) {
            return new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }
        return end;
    }
    return new Date(start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000);
}

/**
 * Retorna la fecha límite exacta (fin del show + 24 horas) para el desbloqueo automático de cobro.
 */
export function getBookingReviewGraceDeadline(
    eventDate?: string | null,
    startTime?: string | null,
    endTime?: string | null,
): Date | null {
    if (!eventDate || !startTime) return null;
    const end = getPeruEventEndDate(eventDate, startTime, endTime);
    if (Number.isNaN(end.getTime())) return null;
    return new Date(end.getTime() + REVIEW_GRACE_HOURS * 60 * 60 * 1000);
}

/**
 * Calcula el tiempo restante hasta una fecha objetivo y lo formatea como reloj HH:MM:SS.
 */
export function getRemainingCountdown(
    target: Date | string | null | undefined,
    now: Date = new Date(),
): {
    expired: boolean;
    totalSeconds: number;
    hours: number;
    minutes: number;
    seconds: number;
    clock: string;
    human: string;
} | null {
    if (!target) return null;
    const targetDate =
        typeof target === "string" ? new Date(normalizeUtcString(target)) : target;
    if (Number.isNaN(targetDate.getTime())) return null;

    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs <= 0) {
        return {
            expired: true,
            totalSeconds: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            clock: "00:00:00",
            human: "0h 00m 00s",
        };
    }

    const totalSeconds = Math.ceil(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    return {
        expired: false,
        totalSeconds,
        hours,
        minutes,
        seconds,
        clock: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
        human: `${hours}h ${pad(minutes)}m ${pad(seconds)}s`,
    };
}

/**
 * Indica si ya transcurrieron las 24 horas posteriores al fin del show.
 */
export function isBookingReviewGraceExpired(
    eventDate?: string | null,
    startTime?: string | null,
    endTime?: string | null,
    now: Date = new Date(),
): boolean {
    const deadline = getBookingReviewGraceDeadline(eventDate, startTime, endTime);
    if (!deadline) return false;
    return now.getTime() >= deadline.getTime();
}

/**
 * Formatea un timestamp ISO genérico a formato legible.
 * Ej: "10 de sep. de 2026, 19:30"
 */
export function formatDateTime(value: string | Date | null | undefined): string {
    return formatPeruDateTime(value);
}

/**
 * Retorna la fecha actual en zona horaria de Perú en formato ISO YYYY-MM-DD.
 */
export function todayPeruIso(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: PERU_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

