import { describe, expect, it } from "vitest";
import { isSafePhotoSrc, parsePreviewDraft, parsePreviewFocus } from "./types";

const valid = {
    name: "Grupo Aurora",
    city: "Arequipa",
    price: "450",
    genres: ["Huayno", "Jazz"],
    instruments: ["Guitarra"],
    bio: "Somos un grupo de Arequipa.",
    photo: "/uploads/foto.jpg",
};

describe("parsePreviewDraft", () => {
    it("acepta un borrador válido y completa el tipo de perfil cuando falta", () => {
        expect(parsePreviewDraft(valid)).toEqual({ ...valid, profileType: "solo", groupSize: "", details: {} });
    });

    it("acepta el tipo, el tamaño del grupo y los detalles, y descarta lo que no encaja", () => {
        const parsed = parsePreviewDraft({
            ...valid,
            profileType: "group",
            groupSize: "4-5",
            details: { event_types: ["bodas", "fiesta-secreta"], duration: "10h", format: "mixed", otra: "x" },
        });
        expect(parsed?.profileType).toBe("group");
        expect(parsed?.groupSize).toBe("4-5");
        expect(parsed?.details).toEqual({ event_types: ["bodas"], format: "mixed" });
        expect(parsePreviewDraft({ ...valid, profileType: "banda" })?.profileType).toBe("solo");
        expect(parsePreviewDraft({ ...valid, groupSize: "x".repeat(9) })).toBeNull();
    });

    it("acepta una foto blob creada en la propia página o ninguna foto", () => {
        expect(parsePreviewDraft({ ...valid, photo: "blob:http://localhost:3000/abc" })?.photo).toBe("blob:http://localhost:3000/abc");
        expect(parsePreviewDraft({ ...valid, photo: null })?.photo).toBeNull();
    });

    it("rechaza fotos que no sean propias de la app", () => {
        expect(parsePreviewDraft({ ...valid, photo: "https://evil.example/x.png" })).toBeNull();
        expect(parsePreviewDraft({ ...valid, photo: "javascript:alert(1)" })).toBeNull();
        expect(parsePreviewDraft({ ...valid, photo: "data:image/png;base64,AAA" })).toBeNull();
        expect(parsePreviewDraft({ ...valid, photo: 42 })).toBeNull();
    });

    it("rechaza formas incorrectas y textos demasiado largos", () => {
        expect(parsePreviewDraft(null)).toBeNull();
        expect(parsePreviewDraft("hola")).toBeNull();
        expect(parsePreviewDraft({ ...valid, name: 5 })).toBeNull();
        expect(parsePreviewDraft({ ...valid, genres: "Jazz" })).toBeNull();
        expect(parsePreviewDraft({ ...valid, genres: [1] })).toBeNull();
        expect(parsePreviewDraft({ ...valid, bio: "x".repeat(701) })).toBeNull();
        expect(parsePreviewDraft({ ...valid, instruments: Array.from({ length: 21 }, () => "a") })).toBeNull();
    });
});

describe("parsePreviewFocus", () => {
    it("solo acepta las partes conocidas del perfil", () => {
        expect(parsePreviewFocus("price")).toBe("price");
        expect(parsePreviewFocus("specialty")).toBe("specialty");
        expect(parsePreviewFocus("events")).toBe("events");
        expect(parsePreviewFocus("show")).toBe("show");
        expect(parsePreviewFocus("otra")).toBeNull();
        expect(parsePreviewFocus(undefined)).toBeNull();
    });
});

describe("isSafePhotoSrc", () => {
    it("distingue rutas propias de URLs externas", () => {
        expect(isSafePhotoSrc("/uploads/a.jpg")).toBe(true);
        expect(isSafePhotoSrc("blob:http://x/y")).toBe(true);
        expect(isSafePhotoSrc("//evil.example/a.jpg")).toBe(false);
        expect(isSafePhotoSrc("https://storage.googleapis.com/a.jpg")).toBe(false);
    });
});
