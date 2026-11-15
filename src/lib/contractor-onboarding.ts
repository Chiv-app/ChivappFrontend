import type { ContractorProfileOut } from "@/types/api";

/**
 * Alta guiada del contratante. Pide solo lo que el backend exige para aprobar el perfil
 * (`validate_contractor_profile`): nombre, ciudad, dirección y documento con su foto.
 */
export type ContractorStepId = "contacto" | "donde" | "documento" | "revision" | "enviado";

export const CONTRACTOR_FLOW: ContractorStepId[] = ["contacto", "donde", "documento", "revision"];

export type ContractorChapterId = "tu" | "verificacion";

export const CONTRACTOR_CHAPTERS: { id: ContractorChapterId; title: string; icon: string }[] = [
    { id: "tu", title: "Tú", icon: "mdi:account-outline" },
    { id: "verificacion", title: "Verificación", icon: "mdi:shield-check-outline" },
];

export const CONTRACTOR_STEP_CHAPTER: Record<Exclude<ContractorStepId, "enviado">, ContractorChapterId> = {
    contacto: "tu",
    donde: "tu",
    documento: "verificacion",
    revision: "verificacion",
};

const STEP_MINUTES: Record<Exclude<ContractorStepId, "enviado">, number> = {
    contacto: 0.5,
    donde: 0.5,
    documento: 1,
    revision: 0.5,
};

export function contractorMinutesLeft(from: ContractorStepId): number {
    const index = CONTRACTOR_FLOW.indexOf(from);
    if (index < 0) return 0;
    const total = CONTRACTOR_FLOW.slice(index).reduce(
        (sum, step) => sum + STEP_MINUTES[step as Exclude<ContractorStepId, "enviado">],
        0,
    );
    return Math.max(1, Math.round(total));
}

export const DOCUMENT_TYPES = [
    { value: "DNI", label: "DNI", icon: "mdi:card-account-details-outline" },
    { value: "CE", label: "Carné de extranjería", icon: "mdi:card-account-details-outline" },
    { value: "Pasaporte", label: "Pasaporte", icon: "mdi:passport" },
] as const;

export type ContractorGuideData = {
    fullname: string;
    phone: string;
    city: string;
    address: string;
    documentType: string;
    documentNumber: string;
    documentUrl: string | null;
};

export type ContractorGuideField = "fullname" | "city" | "address" | "documentNumber" | "document";
export type ContractorGuideError = { field: ContractorGuideField | "review"; message: string };

const MIN_NAME = 3;
const MIN_ADDRESS = 5;
const MIN_DOCUMENT_NUMBER = 6;

export function emptyContractorData(): ContractorGuideData {
    return { fullname: "", phone: "", city: "", address: "", documentType: "DNI", documentNumber: "", documentUrl: null };
}

export function contractorDataFromProfile(profile: ContractorProfileOut, fallbackFullname?: string | null): ContractorGuideData {
    return {
        fullname: (profile.fullname ?? fallbackFullname ?? "").trim(),
        phone: profile.phone ?? "",
        city: profile.city ?? "",
        address: profile.address ?? "",
        documentType: DOCUMENT_TYPES.some((d) => d.value === profile.document_type) ? (profile.document_type as string) : "DNI",
        documentNumber: profile.document_number ?? "",
        documentUrl: profile.id_document_url ?? null,
    };
}

export function validateContractorStep(step: ContractorStepId, d: ContractorGuideData): ContractorGuideError | null {
    switch (step) {
        case "contacto":
            return d.fullname.trim().length >= MIN_NAME
                ? null
                : { field: "fullname", message: "Escribe tu nombre completo, como aparece en tu documento." };
        case "donde":
            if (!d.city.trim()) return { field: "city", message: "Elige tu ciudad." };
            return d.address.trim().length >= MIN_ADDRESS
                ? null
                : { field: "address", message: "Escribe tu dirección: calle, número y distrito." };
        case "documento":
            if (d.documentNumber.trim().length < MIN_DOCUMENT_NUMBER) {
                return { field: "documentNumber", message: "Escribe el número de tu documento." };
            }
            return d.documentUrl ? null : { field: "document", message: "Sube una foto de tu documento para continuar." };
        case "revision": {
            const missing = incompleteContractorSteps(d);
            return missing.length === 0
                ? null
                : { field: "review", message: `Falta completar: ${missing.map((s) => STEP_LABELS[s]).join(", ")}.` };
        }
        default:
            return null;
    }
}

const STEP_LABELS: Record<ContractorStepId, string> = {
    contacto: "nombre",
    donde: "dirección",
    documento: "documento",
    revision: "revisión",
    enviado: "envío",
};

const DATA_STEPS: ContractorStepId[] = ["contacto", "donde", "documento"];

export function incompleteContractorSteps(d: ContractorGuideData): ContractorStepId[] {
    return DATA_STEPS.filter((s) => validateContractorStep(s, d) !== null);
}

/** Paso en el que retomar: el primero incompleto, o la revisión si todo está listo. */
export function resumeContractorStep(d: ContractorGuideData): ContractorStepId {
    return incompleteContractorSteps(d)[0] ?? "revision";
}
