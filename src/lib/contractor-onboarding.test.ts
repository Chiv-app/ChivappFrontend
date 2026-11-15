import { describe, expect, it } from "vitest";
import {
    CONTRACTOR_CHAPTERS,
    CONTRACTOR_FLOW,
    CONTRACTOR_STEP_CHAPTER,
    contractorDataFromProfile,
    contractorMinutesLeft,
    emptyContractorData,
    incompleteContractorSteps,
    resumeContractorStep,
    validateContractorStep,
    type ContractorGuideData,
} from "./contractor-onboarding";
import type { ContractorProfileOut } from "@/types/api";

function complete(): ContractorGuideData {
    return {
        fullname: "María Torres Quispe",
        phone: "",
        city: "Lima",
        address: "Av. Los Olivos 123, Miraflores",
        documentType: "DNI",
        documentNumber: "45678912",
        documentUrl: "/uploads/private/dni.jpg",
    };
}

describe("validateContractorStep", () => {
    it("pide el nombre completo", () => {
        expect(validateContractorStep("contacto", emptyContractorData())?.field).toBe("fullname");
        expect(validateContractorStep("contacto", { ...emptyContractorData(), fullname: "Ana" })).toBeNull();
    });

    it("pide ciudad y dirección por separado", () => {
        expect(validateContractorStep("donde", emptyContractorData())?.field).toBe("city");
        expect(validateContractorStep("donde", { ...emptyContractorData(), city: "Lima" })?.field).toBe("address");
        expect(validateContractorStep("donde", { ...emptyContractorData(), city: "Lima", address: "Jr. Cusco 120" })).toBeNull();
    });

    it("pide el número y la foto del documento", () => {
        expect(validateContractorStep("documento", emptyContractorData())?.field).toBe("documentNumber");
        expect(validateContractorStep("documento", { ...emptyContractorData(), documentNumber: "45678912" })?.field).toBe("document");
        expect(validateContractorStep("documento", complete())).toBeNull();
    });

    it("el teléfono es opcional", () => {
        expect(incompleteContractorSteps({ ...complete(), phone: "" })).toEqual([]);
    });

    it("la revisión lista lo que falta", () => {
        const err = validateContractorStep("revision", { ...complete(), documentUrl: null });
        expect(err?.field).toBe("review");
        expect(err?.message).toBe("Falta completar: documento.");
        expect(validateContractorStep("revision", complete())).toBeNull();
    });
});

describe("resumeContractorStep y datos del perfil", () => {
    it("retoma en el primer paso incompleto o en la revisión", () => {
        expect(resumeContractorStep({ ...emptyContractorData(), fullname: "Ana Quispe" })).toBe("donde");
        expect(resumeContractorStep({ ...complete(), documentUrl: null })).toBe("documento");
        expect(resumeContractorStep(complete())).toBe("revision");
    });

    it("lee el perfil con valores seguros", () => {
        const data = contractorDataFromProfile(
            { fullname: null, phone: null, city: "Cusco", address: null, document_type: "Otro", document_number: null, id_document_url: null } as unknown as ContractorProfileOut,
            "  Carlos Rivera ",
        );
        expect(data.fullname).toBe("Carlos Rivera");
        expect(data.documentType).toBe("DNI");
        expect(data.city).toBe("Cusco");
        expect(data.documentUrl).toBeNull();
    });
});

describe("capítulos y tiempo", () => {
    it("cada paso numerado pertenece a un capítulo y el orden es coherente", () => {
        const ids = CONTRACTOR_CHAPTERS.map((c) => c.id);
        const order = CONTRACTOR_FLOW.map((s) => ids.indexOf(CONTRACTOR_STEP_CHAPTER[s as keyof typeof CONTRACTOR_STEP_CHAPTER]));
        expect(order.every((i) => i >= 0)).toBe(true);
        expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it("el tiempo restante baja a medida que se avanza", () => {
        expect(contractorMinutesLeft("contacto")).toBeGreaterThan(contractorMinutesLeft("documento"));
        expect(contractorMinutesLeft("revision")).toBe(1);
        expect(contractorMinutesLeft("enviado")).toBe(0);
    });
});
