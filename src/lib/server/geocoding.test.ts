import { describe, expect, it } from "vitest";
import { parseLocationSignalsFromText } from "@/lib/server/geocoding";
import {
    looksLikeSharedLocationText,
    parseLocationReference,
} from "@/lib/geocoding";

describe("WhatsApp & Google Maps shared location parsing", () => {
    it("parses standard WhatsApp location pin URL (maps.google.com/?q=lat,lng)", () => {
        const text = "https://maps.google.com/?q=-13.160555,-74.225833";
        expect(looksLikeSharedLocationText(text)).toBe(true);
        const signal = parseLocationSignalsFromText(text);
        expect(signal.coords).toEqual({
            lat: -13.160555,
            lng: -74.225833,
        });
    });

    it("parses multi-line WhatsApp shared location message with venue name and URL", () => {
        const text =
            "📍 Ubicación: Salón de Eventos Las Palmas, Av. Mariscal Cáceres 820\nhttps://maps.google.com/maps?q=-13.160412%2C-74.225819&z=17&hl=es";
        expect(looksLikeSharedLocationText(text)).toBe(true);
        const signal = parseLocationSignalsFromText(text);
        expect(signal.coords).toEqual({
            lat: -13.160412,
            lng: -74.225819,
        });
        expect(signal.labelHint).toContain("Salón de Eventos Las Palmas");
    });

    it("extracts exact pin coordinates (!3d...!4d...) over camera viewport (@...) in full Google Maps URLs", () => {
        const url =
            "https://www.google.com/maps/place/Plaza+Mayor+de+Huamanga/@-13.161000,-74.226000,17z/data=!3m1!4b1!4m6!3m5!1s0x91127d88f5b2:0x1234!8m2!3d-13.160555!4d-74.225833";
        expect(looksLikeSharedLocationText(url)).toBe(true);
        const signal = parseLocationSignalsFromText(url);
        expect(signal.coords).toEqual({
            lat: -13.160555,
            lng: -74.225833,
        });
        expect(signal.labelHint).toBe("Plaza Mayor de Huamanga");
    });

    it("detects short Google Maps URLs (maps.app.goo.gl and goo.gl/maps)", () => {
        const text =
            "Recepción Familia Quispe\nhttps://maps.app.goo.gl/AbCdEfGh12345";
        expect(looksLikeSharedLocationText(text)).toBe(true);
        const signal = parseLocationSignalsFromText(text);
        expect(signal.shortUrl).toBe("https://maps.app.goo.gl/AbCdEfGh12345");
        expect(signal.labelHint).toBe("Recepción Familia Quispe");
    });

    it("parses DMS coordinates shared from WhatsApp / Google Maps pins", () => {
        const dms = `13°09'38.0"S 74°13'33.0"W`;
        expect(looksLikeSharedLocationText(dms)).toBe(true);
        const signal = parseLocationSignalsFromText(dms);
        expect(signal.coords).not.toBeNull();
        expect(signal.coords!.lat).toBeCloseTo(-13.160555, 4);
        expect(signal.coords!.lng).toBeCloseTo(-74.225833, 4);
    });

    it("parses raw decimal coordinates", () => {
        const raw = "-13.163141, -74.223618";
        expect(looksLikeSharedLocationText(raw)).toBe(true);
        const signal = parseLocationSignalsFromText(raw);
        expect(signal.coords).toEqual({
            lat: -13.163141,
            lng: -74.223618,
        });
        expect(parseLocationReference(raw)).toEqual({
            lat: -13.163141,
            lng: -74.223618,
        });
    });
});
