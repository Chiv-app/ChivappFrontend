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
    it("acepta un borrador válido", () => {
        expect(parsePreviewDraft(valid)).toEqual(valid);
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
