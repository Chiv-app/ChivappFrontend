import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MusicianGuidedOnboarding from "./musician-guided-onboarding";

const { refreshMock, getProfile, updateProfile, submitProfile } = vi.hoisted(() => ({
    refreshMock: vi.fn().mockResolvedValue(undefined),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    submitProfile: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
    useRouter: () => routerMock,
    usePathname: () => "/musician/onboarding",
}));

const authState = vi.hoisted(() => ({
    user: { id: "u1", role: "musician", fullname: "Carlos Quispe", is_verified: false },
    isLoading: false,
}));

vi.mock("@/contexts/auth-context", () => ({
    useAuth: () => ({ ...authState, refresh: refreshMock }),
}));

vi.mock("@/lib/profiles", () => ({
    getMusicianProfile: getProfile,
    updateMusicianProfile: updateProfile,
    submitMusicianProfile: submitProfile,
}));

vi.mock("@/lib/uploads", () => ({
    uploadFile: vi.fn().mockResolvedValue("/uploads/x.jpg"),
    uploadSignatureDataUrl: vi.fn().mockResolvedValue("/uploads/private/firma.png"),
    resolveUploadUrl: (url: string | null) => url,
}));

vi.mock("@/components/ui/signature-pad", () => ({
    default: () => <div data-testid="signature-pad" />,
}));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: vi.fn() };
});

function draftProfile(overrides: Record<string, unknown> = {}) {
    return {
        status: "draft",
        is_ensemble_only: false,
        stage_name: null,
        genres: [],
        instruments: [],
        location_city: null,
        price_per_event: null,
        price_per_hour: null,
        profile_image_url: null,
        bio: null,
        id_document_url: null,
        signature_image_url: null,
        fullname: "Carlos Quispe",
        ...overrides,
    };
}

describe("MusicianGuidedOnboarding", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateProfile.mockResolvedValue({});
    });

    it("muestra la bienvenida a un músico nuevo y avanza al primer paso", async () => {
        getProfile.mockResolvedValue(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);

        expect(await screen.findByRole("heading", { name: "Armemos tu perfil" })).toBeTruthy();
        await user.click(screen.getByRole("button", { name: "Empezar" }));
        expect(await screen.findByRole("heading", { name: "¿Cómo te conocen?" })).toBeTruthy();
        expect(screen.getByText("Paso 1 de 8")).toBeTruthy();
    });

    it("no avanza sin nombre y explica qué falta", async () => {
        getProfile.mockResolvedValue(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await user.click(await screen.findByRole("button", { name: "Empezar" }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        expect(await screen.findByText("Escribe tu nombre artístico (mínimo 2 letras).")).toBeTruthy();
        expect(updateProfile).not.toHaveBeenCalled();
    });

    it("guarda el nombre artístico y pasa a «¿Qué tocas?»", async () => {
        getProfile.mockResolvedValue(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await user.click(await screen.findByRole("button", { name: "Empezar" }));
        await user.type(screen.getByLabelText("Nombre artístico"), "Grupo Aurora");
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ stage_name: "Grupo Aurora" }));
        expect(await screen.findByRole("heading", { name: "¿Qué tocas?" })).toBeTruthy();
    });

    it("retoma en el primer paso incompleto cuando ya hay avance", async () => {
        getProfile.mockResolvedValue(
            draftProfile({ stage_name: "Grupo Aurora", genres: ["Salsa"], instruments: ["Voz"] }),
        );
        render(<MusicianGuidedOnboarding />);

        expect(await screen.findByRole("heading", { name: "¿Dónde trabajas y cuánto cobras?" })).toBeTruthy();
    });

    it("con todo completo llega a la revisión y envía el perfil", async () => {
        getProfile.mockResolvedValue(
            draftProfile({
                stage_name: "Grupo Aurora",
                genres: ["Salsa"],
                instruments: ["Voz"],
                location_city: "Lima",
                price_per_event: 300,
                profile_image_url: "/uploads/foto.jpg",
                bio: "Soy un grupo de Lima que anima celebraciones con música para toda la familia.",
                id_document_url: "/uploads/private/dni.jpg",
                signature_image_url: "/uploads/private/firma.png",
            }),
        );
        submitProfile.mockResolvedValue({});
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);

        expect(await screen.findByRole("heading", { name: "Revisa y envía" })).toBeTruthy();
        await user.click(screen.getByRole("button", { name: "Enviar a revisión" }));

        await waitFor(() => expect(submitProfile).toHaveBeenCalledTimes(1));
        expect(await screen.findByRole("heading", { name: "Perfil enviado" })).toBeTruthy();
        expect(refreshMock).toHaveBeenCalled();
    });

    it("manda al panel a quien ya envió su perfil", async () => {
        getProfile.mockResolvedValue(draftProfile({ status: "pending_review" }));
        render(<MusicianGuidedOnboarding />);

        await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/musician"));
    });

    it("ofrece reintentar si no se puede cargar el perfil", async () => {
        getProfile.mockRejectedValueOnce(new Error("sin red"));
        getProfile.mockResolvedValueOnce(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);

        await user.click(await screen.findByRole("button", { name: "Reintentar" }));
        expect(await screen.findByRole("heading", { name: "Armemos tu perfil" })).toBeTruthy();
    });
});
