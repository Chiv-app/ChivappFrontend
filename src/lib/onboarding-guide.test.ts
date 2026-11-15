import { describe, expect, it } from "vitest";
import {
    CHAPTERS,
    FLOW_STEPS,
    OPTIONAL_STEPS,
    STEP_CHAPTER,
    buildBioDraft,
    dataFromProfile,
    emptyGuideData,
    incompleteSteps,
    minutesLeft,
    resumeStep,
    totalMinutes,
    validateStep,
    type GuideData,
} from "./onboarding-guide";
import type { MusicianProfileOut } from "@/types/api";

function complete(): GuideData {
    return {
        ...emptyGuideData(),
        profileType: "solo",
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
        const base: GuideData = { ...emptyGuideData(), profileType: "solo", name: "Grupo Aurora", genres: ["Salsa"], instruments: ["Voz"] };
        expect(resumeStep(base)).toBe("donde");
        expect(resumeStep({ ...base, city: "Lima", price: "300" })).toBe("foto");
    });

    it("va a la revisión cuando todo está completo", () => {
        expect(resumeStep(complete())).toBe("revision");
        expect(incompleteSteps(complete())).toEqual([]);
    });
});

describe("tipo de perfil", () => {
    it("es lo primero que se pide y un grupo debe indicar cuántas personas son", () => {
        expect(validateStep("tipo", emptyGuideData())?.field).toBe("kind");
        expect(validateStep("tipo", { ...emptyGuideData(), profileType: "solo" })).toBeNull();
        expect(validateStep("tipo", { ...emptyGuideData(), profileType: "group" })?.field).toBe("groupSize");
        expect(validateStep("tipo", { ...emptyGuideData(), profileType: "group", groupSize: "4-5" })).toBeNull();
    });

    it("la revisión lo exige, pero no exige los pasos opcionales", () => {
        expect(incompleteSteps({ ...complete(), profileType: null })).toEqual(["tipo"]);
        expect(incompleteSteps(complete())).toEqual([]);
        for (const step of OPTIONAL_STEPS) expect(validateStep(step, emptyGuideData())).toBeNull();
    });

    it("un perfil sin avance vuelve a preguntar el tipo; uno con avance conserva el suyo", () => {
        const fresh = dataFromProfile({ profile_type: "solo", genres: [], instruments: [] } as unknown as MusicianProfileOut);
        expect(fresh.profileType).toBeNull();
        const advanced = dataFromProfile({
            profile_type: "group",
            group_size: "6-8",
            genres: ["Salsa"],
            instruments: ["Voz"],
        } as unknown as MusicianProfileOut);
        expect(advanced.profileType).toBe("group");
        expect(advanced.groupSize).toBe("6-8");
        expect(dataFromProfile({ profile_type: "banda", genres: ["Salsa"] } as unknown as MusicianProfileOut).profileType).toBe("solo");
    });

    it("al cargar solo conserva detalles que el backend acepta", () => {
        const data = dataFromProfile({
            genres: ["Salsa"],
            details: { event_types: ["bodas", "otra"], duration: "2h", clave_vieja: 1 },
        } as unknown as MusicianProfileOut);
        expect(data.details).toEqual({ event_types: ["bodas"], duration: "2h" });
    });
});

describe("capítulos y tiempo", () => {
    it("cada paso numerado pertenece a un capítulo existente", () => {
        const ids = CHAPTERS.map((c) => c.id);
        for (const step of FLOW_STEPS) expect(ids).toContain(STEP_CHAPTER[step]);
    });

    it("los capítulos siguen el orden de los pasos", () => {
        const order = FLOW_STEPS.map((s) => CHAPTERS.findIndex((c) => c.id === STEP_CHAPTER[s]));
        expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it("el tiempo restante baja a medida que se avanza", () => {
        expect(minutesLeft("tipo")).toBe(totalMinutes());
        expect(minutesLeft("revision")).toBe(1);
        expect(minutesLeft("tipo")).toBeGreaterThan(minutesLeft("foto"));
        expect(minutesLeft("welcome")).toBe(0);
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
