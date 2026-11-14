import { describe, expect, it } from "vitest";
import {
    buildBioDraft,
    emptyGuideData,
    incompleteSteps,
    resumeStep,
    validateStep,
    type GuideData,
} from "./onboarding-guide";

function complete(): GuideData {
    return {
        ...emptyGuideData(),
        name: "Los Hermanos Quispe",
        fullname: "Carlos Quispe Rivera",
        genres: ["Cumbia"],
        instruments: ["Voz"],
        city: "Arequipa",
        price: "450",
        photoUrl: "/uploads/foto.jpg",
        bio: "Soy un grupo de Arequipa que anima celebraciones con música para toda la familia.",
        dniUrl: "/uploads/private/dni.jpg",
        signatureUrl: "/uploads/private/firma.png",
    };
}

describe("validateStep", () => {
    it("pide el nombre artístico con un mensaje claro", () => {
        expect(validateStep("nombre", emptyGuideData())).toEqual({
            field: "name",
            message: "Escribe tu nombre artístico (mínimo 2 letras).",
        });
        expect(validateStep("nombre", { ...emptyGuideData(), name: "Ana" })).toBeNull();
    });

    it("exige género e instrumento por separado", () => {
        expect(validateStep("toca", emptyGuideData())?.field).toBe("genres");
        expect(validateStep("toca", { ...emptyGuideData(), genres: ["Salsa"] })?.field).toBe("instruments");
        expect(validateStep("toca", { ...emptyGuideData(), genres: ["Salsa"], instruments: ["Voz"] })).toBeNull();
    });

    it("exige ciudad y una tarifa mayor que cero", () => {
        expect(validateStep("donde", emptyGuideData())?.field).toBe("city");
        expect(validateStep("donde", { ...emptyGuideData(), city: "Lima" })?.field).toBe("price");
        expect(validateStep("donde", { ...emptyGuideData(), city: "Lima", price: "0" })?.field).toBe("price");
        expect(validateStep("donde", { ...emptyGuideData(), city: "Lima", price: "300" })).toBeNull();
    });

    it("dice cuántos caracteres faltan en la biografía", () => {
        const err = validateStep("bio", { ...emptyGuideData(), bio: "Hola, soy músico" });
        expect(err?.field).toBe("bio");
        expect(err?.message).toContain("Te faltan 24 caracteres");
        expect(validateStep("bio", complete())).toBeNull();
    });

    it("pide nombre completo y documento en el paso de identidad", () => {
        expect(validateStep("dni", emptyGuideData())?.field).toBe("fullname");
        expect(validateStep("dni", { ...emptyGuideData(), fullname: "Carlos Quispe" })?.field).toBe("dni");
        expect(validateStep("dni", { ...emptyGuideData(), fullname: "Carlos Quispe", dniUrl: "/x" })).toBeNull();
    });

    it("acepta una firma ya guardada o una recién dibujada", () => {
        expect(validateStep("firma", emptyGuideData())?.field).toBe("signature");
        expect(validateStep("firma", { ...emptyGuideData(), signatureUrl: "/firma.png" })).toBeNull();
        expect(validateStep("firma", { ...emptyGuideData(), signatureDataUrl: "data:image/png;base64,AAA" })).toBeNull();
    });

    it("la revisión lista lo que falta", () => {
        const err = validateStep("revision", { ...complete(), photoUrl: null, dniUrl: null });
        expect(err?.field).toBe("review");
        expect(err?.message).toBe("Falta completar: foto, identidad.");
        expect(validateStep("revision", complete())).toBeNull();
    });
});

describe("resumeStep", () => {
    it("empieza por la bienvenida si no hay avance, aunque el nombre venga prellenado", () => {
        expect(resumeStep(emptyGuideData())).toBe("welcome");
        expect(resumeStep({ ...emptyGuideData(), name: "Carlos Quispe" })).toBe("welcome");
    });

    it("retoma en el primer paso incompleto", () => {
        const base = { ...emptyGuideData(), name: "Grupo Aurora", genres: ["Salsa"], instruments: ["Voz"] };
        expect(resumeStep(base)).toBe("donde");
        expect(resumeStep({ ...base, city: "Lima", price: "300" })).toBe("foto");
    });

    it("va a la revisión cuando todo está completo", () => {
        expect(resumeStep(complete())).toBe("revision");
        expect(incompleteSteps(complete())).toEqual([]);
    });
});

describe("buildBioDraft", () => {
    it("arma un texto con los datos dados y supera el mínimo", () => {
        const text = buildBioDraft({ name: "Los Quispe", city: "Arequipa", genres: ["Cumbia", "Salsa"], instruments: ["Voz"] });
        expect(text).toContain("Soy Los Quispe, artista de Arequipa");
        expect(text).toContain("cumbia, salsa");
        expect(text.length).toBeGreaterThan(40);
    });

    it("no se rompe con datos vacíos", () => {
        const text = buildBioDraft({ name: "", city: "", genres: [], instruments: [] });
        expect(text.length).toBeGreaterThan(40);
    });
});
