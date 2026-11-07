import type { ValidationStepOut } from "@/types/api";

export type WizardStepKey =
    | "identity"
    | "specialty"
    | "location_pricing"
    | "repertoire"
    | "media"
    | "social"
    | "availability"
    | "documents"
    | "contract";

export type WizardStepDef = {
    key: WizardStepKey;
    title: string;
    description: string;
    icon: string;
    shortTitle?: string;
    required?: boolean;
};

export const WIZARD_STEPS: WizardStepDef[] = [
    {
        key: "identity",
        title: "Identidad artística",
        shortTitle: "Identidad",
        description: "Presenta quién eres como artista con una bio clara y una foto profesional.",
        icon: "material-symbols:person",
        required: true,
    },
    {
        key: "specialty",
        title: "Especialidad",
        shortTitle: "Especialidad",
        description: "Indica géneros, instrumentos y cómo ofreces tus servicios.",
        icon: "material-symbols:music-note",
        required: true,
    },
    {
        key: "location_pricing",
        title: "Ubicación y tarifas",
        shortTitle: "Tarifas",
        description: "Indica tu ciudad y cuánto cobras (obligatorio para aparecer en las búsquedas). El distrito es opcional.",
        icon: "material-symbols:payments",
        required: true,
    },
    {
        key: "repertoire",
        title: "Repertorio",
        shortTitle: "Repertorio",
        description: "Agrega las canciones o piezas que sueles interpretar en tus shows.",
        icon: "material-symbols:library-music",
        required: false,
    },
    {
        key: "media",
        title: "Fotos y videos",
        shortTitle: "Media",
        description: "Sube imágenes de tu trabajo y enlaces de YouTube u otras plataformas.",
        icon: "material-symbols:photo-library",
        required: false,
    },
    {
        key: "social",
        title: "Redes sociales",
        shortTitle: "Redes",
        description: "Conecta tus perfiles para que los contratistas conozcan más de ti.",
        icon: "material-symbols:share",
        required: false,
    },
    {
        key: "availability",
        title: "Disponibilidad",
        shortTitle: "Agenda",
        description: "Indica los días y horarios en los que puedes recibir reservas.",
        icon: "material-symbols:calendar-month",
        required: false,
    },
    {
        key: "documents",
        title: "Documento de identidad",
        shortTitle: "DNI",
        description: "Sube tu DNI, CE o pasaporte para validar tu identidad.",
        icon: "material-symbols:badge",
        required: true,
    },
    {
        key: "contract",
        title: "Contrato y firma",
        shortTitle: "Contrato",
        description:
            "Diseña tu contrato y registra tu firma digital; ambas alimentan el PDF de cada contrata.",
        icon: "material-symbols:contract",
        required: false,
    },
];

export function getStepStatus(
    stepKey: WizardStepKey,
    validationSteps: ValidationStepOut[],
): "completed" | "current" | "pending" {
    const step = validationSteps.find((item) => item.key === stepKey);
    if (step?.completed) return "completed";
    return "pending";
}

export function getInitialStepIndex(validationSteps: ValidationStepOut[]): number {
    const firstRequiredIncomplete = WIZARD_STEPS.findIndex((step) => {
        if (step.required === false) return false;
        const match = validationSteps.find((item) => item.key === step.key);
        return !(match?.completed ?? false);
    });
    if (firstRequiredIncomplete !== -1) return firstRequiredIncomplete;

    const firstIncomplete = WIZARD_STEPS.findIndex((step) => {
        const match = validationSteps.find((item) => item.key === step.key);
        return !match?.completed;
    });
    return firstIncomplete === -1 ? 0 : firstIncomplete;
}
