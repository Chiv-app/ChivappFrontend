import { apiFetch } from "@/lib/api";

export type CalendarEvent = {
    id: string;
    booking_id: string;
    kind: "booking" | "convocation";
    role: "owner" | "member" | "contractor";
    state: "confirmed" | "tentative";
    title: string;
    event_type: string | null;
    start: string;
    end: string;
    city: string | null;
    address: string | null;
    profile_id: string | null;
    profile_name: string | null;
    synced: boolean;
    conflict: boolean;
};

export type BusyBlock = { start: string; end: string };

export type CalendarBusy = { connected: boolean; needs_reconnect: boolean; busy: BusyBlock[] };

export type CalendarView = "month" | "week" | "day";

export function getCalendarEvents(start: string, end: string) {
    return apiFetch<{ events: CalendarEvent[] }>(`/calendar/events?start=${start}&end=${end}`).then((r) => r.events);
}

export function getCalendarBusy(start: string, end: string) {
    return apiFetch<CalendarBusy>(`/calendar/busy?start=${start}&end=${end}`);
}

/* ---------- fechas (siempre en la hora local de la persona, sin zonas) ---------- */

export function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function parseIsoDate(value: string): Date {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

export function addMonths(date: Date, months: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Lunes de la semana de `date`. */
export function startOfWeek(date: Date): Date {
    const offset = (date.getDay() + 6) % 7;
    return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -offset);
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Días que se dibujan y rango de la consulta para cada vista. El mes incluye los días de relleno de las semanas completas. */
export function visibleDays(view: CalendarView, anchor: Date): Date[] {
    if (view === "day") return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())];
    if (view === "week") {
        const monday = startOfWeek(anchor);
        return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const start = startOfWeek(first);
    const end = addDays(startOfWeek(last), 6);
    const count = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function rangeFor(view: CalendarView, anchor: Date): { start: string; end: string } {
    const days = visibleDays(view, anchor);
    return { start: toIsoDate(days[0]), end: toIsoDate(days[days.length - 1]) };
}

export function stepAnchor(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
    if (view === "day") return addDays(anchor, direction);
    if (view === "week") return addDays(anchor, 7 * direction);
    return addMonths(anchor, direction);
}

/* ---------- eventos ---------- */

/** Minutos desde la medianoche de `day` (puede ser negativo o mayor de 1440 si el evento cruza de día). */
function minutesFrom(day: Date, iso: string): number {
    const at = new Date(iso);
    const base = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return Math.round((at.getTime() - base.getTime()) / 60_000);
}

export type Placed<T extends { start: string; end: string }> = {
    event: T;
    /** Minutos desde las 00:00, recortados al día. */
    top: number;
    bottom: number;
    lane: number;
    lanes: number;
};

/** Eventos de un día con su posición y carril (los que se pisan van lado a lado). */
export function placeEvents<T extends { start: string; end: string }>(events: T[], day: Date): Placed<T>[] {
    const items = events
        .map((event) => ({
            event,
            top: Math.max(0, minutesFrom(day, event.start)),
            bottom: Math.min(24 * 60, minutesFrom(day, event.end)),
        }))
        .filter((item) => item.bottom > item.top)
        .sort((a, b) => a.top - b.top || b.bottom - a.bottom);

    const placed: Placed<T>[] = [];
    let group: Placed<T>[] = [];
    let groupEnd = -1;
    const closeGroup = () => {
        const lanes = group.reduce((max, p) => Math.max(max, p.lane + 1), 1);
        group.forEach((p) => (p.lanes = lanes));
        placed.push(...group);
        group = [];
    };
    for (const item of items) {
        if (group.length && item.top >= groupEnd) closeGroup();
        const taken = new Set(group.filter((p) => p.bottom > item.top).map((p) => p.lane));
        let lane = 0;
        while (taken.has(lane)) lane += 1;
        group.push({ ...item, lane, lanes: 1 });
        groupEnd = Math.max(groupEnd, item.bottom);
    }
    if (group.length) closeGroup();
    return placed;
}

export function eventsOnDay<T extends { start: string; end: string }>(events: T[], day: Date): T[] {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const dayEnd = dayStart + 86_400_000;
    return events.filter((e) => new Date(e.start).getTime() < dayEnd && new Date(e.end).getTime() > dayStart);
}

export function formatTime(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatRange(event: { start: string; end: string }): string {
    return `${formatTime(event.start)} – ${formatTime(event.end)}`;
}

export const STATE_LABEL: Record<CalendarEvent["state"], string> = {
    confirmed: "Confirmado",
    tentative: "Tentativo",
};

export function describeState(event: Pick<CalendarEvent, "state" | "kind">): string {
    if (event.kind === "convocation") {
        return event.state === "confirmed"
            ? "Aceptaste esta convocatoria y la reserva está pagada."
            : "Te convocaron a este evento. Respóndela para confirmarlo en tu agenda.";
    }
    return event.state === "confirmed" ? "El pago de la reserva está retenido: el evento está confirmado." : "Todavía sin pago: la hora queda apartada como tentativa.";
}

function toCompactLocalDateTime(isoOrDateAndTime: string): string {
    const d = new Date(isoOrDateAndTime);
    if (Number.isNaN(d.getTime())) {
        return isoOrDateAndTime.replace(/[-:]/g, "").slice(0, 15);
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

export function buildBookingStartEndIso(booking: {
    event_date: string;
    start_time: string;
    end_time?: string | null;
}): { startIso: string; endIso: string } {
    const normTime = (t: string) => {
        const clean = t.trim().slice(0, 5);
        return /^\d{2}:\d{2}$/.test(clean) ? `${clean}:00` : "20:00:00";
    };
    const startIso = `${booking.event_date}T${normTime(booking.start_time)}`;
    if (booking.end_time) {
        const endCandidate = `${booking.event_date}T${normTime(booking.end_time)}`;
        const st = new Date(startIso);
        const et = new Date(endCandidate);
        if (!Number.isNaN(st.getTime()) && !Number.isNaN(et.getTime()) && et <= st) {
            const nextDay = addDays(et, 1);
            return {
                startIso,
                endIso: `${toIsoDate(nextDay)}T${normTime(booking.end_time)}`,
            };
        }
        return { startIso, endIso: endCandidate };
    }
    const st = new Date(startIso);
    if (Number.isNaN(st.getTime())) {
        return { startIso, endIso: startIso };
    }
    const endDate = new Date(st.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const endIso = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;
    return { startIso, endIso };
}

export function buildGoogleCalendarTemplateUrl(params: {
    title: string;
    startIso: string;
    endIso: string;
    location?: string | null;
    description?: string | null;
}): string {
    const startStamp = toCompactLocalDateTime(params.startIso);
    const endStamp = toCompactLocalDateTime(params.endIso);
    const search = new URLSearchParams({
        action: "TEMPLATE",
        text: params.title,
        dates: `${startStamp}/${endStamp}`,
        ctz: "America/Lima",
    });
    if (params.location?.trim()) {
        search.set("location", params.location.trim());
    }
    if (params.description?.trim()) {
        search.set("details", params.description.trim());
    }
    return `https://calendar.google.com/calendar/render?${search.toString()}`;
}

export function downloadCalendarIcs(params: {
    uid: string;
    title: string;
    startIso: string;
    endIso: string;
    location?: string | null;
    description?: string | null;
}): void {
    if (typeof window === "undefined") return;
    const escapeIcs = (val: string) =>
        val
            .replace(/\\/g, "\\\\")
            .replace(/;/g, "\\;")
            .replace(/,/g, "\\,")
            .replace(/\r?\n/g, "\\n");
    const startStamp = toCompactLocalDateTime(params.startIso);
    const endStamp = toCompactLocalDateTime(params.endIso);
    const nowUtc = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d+Z$/, "Z");
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Chivapp//Agenda Musical//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${params.uid}@chiv.app`,
        `DTSTAMP:${nowUtc}`,
        `DTSTART;TZID=America/Lima:${startStamp}`,
        `DTEND;TZID=America/Lima:${endStamp}`,
        `SUMMARY:${escapeIcs(params.title)}`,
    ];
    if (params.location?.trim()) {
        lines.push(`LOCATION:${escapeIcs(params.location.trim())}`);
    }
    if (params.description?.trim()) {
        lines.push(`DESCRIPTION:${escapeIcs(params.description.trim())}`);
    }
    lines.push("END:VEVENT", "END:VCALENDAR");
    const content = lines.join("\r\n");
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chivapp-evento-${params.uid.slice(0, 8)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
