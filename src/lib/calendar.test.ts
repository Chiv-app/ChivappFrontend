import { describe, expect, it } from "vitest";
import {
    addDays,
    describeState,
    eventsOnDay,
    formatRange,
    parseIsoDate,
    placeEvents,
    rangeFor,
    startOfWeek,
    stepAnchor,
    toIsoDate,
    visibleDays,
} from "./calendar";

const ev = (start: string, end: string, extra: Record<string, unknown> = {}) => ({ start, end, ...extra });

describe("fechas del calendario", () => {
    it("ida y vuelta de fechas sin corrimientos de zona", () => {
        expect(toIsoDate(parseIsoDate("2026-12-31"))).toBe("2026-12-31");
        expect(toIsoDate(addDays(parseIsoDate("2026-12-31"), 1))).toBe("2027-01-01");
    });

    it("la semana empieza el lunes", () => {
        expect(toIsoDate(startOfWeek(parseIsoDate("2026-11-15")))).toBe("2026-11-09"); // domingo -> lunes anterior
        expect(toIsoDate(startOfWeek(parseIsoDate("2026-11-09")))).toBe("2026-11-09");
        expect(toIsoDate(startOfWeek(parseIsoDate("2026-11-11")))).toBe("2026-11-09");
    });

    it("cada vista pide su rango: día, semana y mes con semanas completas", () => {
        const anchor = parseIsoDate("2026-11-15");
        expect(rangeFor("day", anchor)).toEqual({ start: "2026-11-15", end: "2026-11-15" });
        expect(rangeFor("week", anchor)).toEqual({ start: "2026-11-09", end: "2026-11-15" });
        // Noviembre de 2026 empieza en domingo y termina en lunes: 6 semanas completas.
        expect(rangeFor("month", anchor)).toEqual({ start: "2026-10-26", end: "2026-12-06" });
        expect(visibleDays("month", anchor)).toHaveLength(42);
        expect(visibleDays("week", anchor)).toHaveLength(7);
    });

    it("avanza y retrocede según la vista", () => {
        const anchor = parseIsoDate("2026-11-15");
        expect(toIsoDate(stepAnchor("day", anchor, 1))).toBe("2026-11-16");
        expect(toIsoDate(stepAnchor("week", anchor, -1))).toBe("2026-11-08");
        expect(toIsoDate(stepAnchor("month", anchor, 1))).toBe("2026-12-01");
        expect(toIsoDate(stepAnchor("month", parseIsoDate("2026-01-31"), -1))).toBe("2025-12-01");
    });
});

describe("posición de los eventos", () => {
    const day = parseIsoDate("2026-11-15");

    it("calcula inicio y fin en minutos desde la medianoche", () => {
        const [placed] = placeEvents([ev("2026-11-15T18:00:00", "2026-11-15T20:30:00")], day);
        expect(placed.top).toBe(18 * 60);
        expect(placed.bottom).toBe(20 * 60 + 30);
        expect(placed.lanes).toBe(1);
    });

    it("recorta lo que cruza la medianoche en cada día", () => {
        const night = ev("2026-11-15T22:00:00", "2026-11-16T02:00:00");
        expect(placeEvents([night], day)[0].bottom).toBe(24 * 60);
        const next = placeEvents([night], parseIsoDate("2026-11-16"))[0];
        expect(next.top).toBe(0);
        expect(next.bottom).toBe(120);
    });

    it("los que se pisan van en carriles distintos y los consecutivos no", () => {
        const a = ev("2026-11-15T18:00:00", "2026-11-15T20:00:00", { id: "a" });
        const b = ev("2026-11-15T19:00:00", "2026-11-15T21:00:00", { id: "b" });
        const c = ev("2026-11-15T21:00:00", "2026-11-15T22:00:00", { id: "c" });
        const placed = placeEvents([c, b, a], day);
        const by = Object.fromEntries(placed.map((p) => [(p.event as unknown as { id: string }).id, p]));
        expect(by.a.lane).toBe(0);
        expect(by.b.lane).toBe(1);
        expect(by.a.lanes).toBe(2);
        expect(by.b.lanes).toBe(2);
        expect(by.c.lanes).toBe(1);
        expect(by.c.lane).toBe(0);
    });

    it("tres eventos a la vez ocupan tres carriles", () => {
        const events = [
            ev("2026-11-15T18:00:00", "2026-11-15T20:00:00"),
            ev("2026-11-15T18:30:00", "2026-11-15T19:30:00"),
            ev("2026-11-15T19:00:00", "2026-11-15T21:00:00"),
        ];
        const placed = placeEvents(events, day);
        expect(new Set(placed.map((p) => p.lane)).size).toBe(3);
        expect(placed.every((p) => p.lanes === 3)).toBe(true);
    });

    it("descarta eventos que no caen en el día", () => {
        expect(placeEvents([ev("2026-11-16T10:00:00", "2026-11-16T11:00:00")], day)).toEqual([]);
        expect(eventsOnDay([ev("2026-11-16T10:00:00", "2026-11-16T11:00:00"), ev("2026-11-15T10:00:00", "2026-11-15T11:00:00")], day)).toHaveLength(1);
        expect(eventsOnDay([ev("2026-11-14T22:00:00", "2026-11-15T01:00:00")], day)).toHaveLength(1);
    });
});

describe("textos", () => {
    it("formatea el rango y explica cada estado", () => {
        expect(formatRange({ start: "2026-11-15T09:05:00", end: "2026-11-15T10:00:00" })).toBe("09:05 – 10:00");
        expect(describeState({ kind: "booking", state: "confirmed" })).toContain("retenido");
        expect(describeState({ kind: "booking", state: "tentative" })).toContain("sin pago");
        expect(describeState({ kind: "convocation", state: "tentative" })).toContain("Respóndela");
        expect(describeState({ kind: "convocation", state: "confirmed" })).toContain("Aceptaste");
    });
});
