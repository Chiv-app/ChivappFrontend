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
    invalidateProfileVerificationCache: vi.fn(),
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
        expect(await screen.findByRole("heading", { name: "¿Cómo trabajas?" })).toBeTruthy();
        expect(screen.getByText("Tú · 1 de 2")).toBeTruthy();
    });

    it("no avanza sin elegir cómo trabajas y lo explica", async () => {
        getProfile.mockResolvedValue(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await user.click(await screen.findByRole("button", { name: "Empezar" }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        expect(await screen.findByText("Elige cómo trabajas: solo o en grupo.")).toBeTruthy();
        expect(updateProfile).not.toHaveBeenCalled();
    });

    it("un grupo debe indicar cuántas personas son", async () => {
        getProfile.mockResolvedValue(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await user.click(await screen.findByRole("button", { name: "Empezar" }));
        await user.click(screen.getByRole("radio", { name: /Somos un grupo/ }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        expect(await screen.findByText("Indica cuántas personas son.")).toBeTruthy();
        expect(updateProfile).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "4 a 5" }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await waitFor(() =>
            expect(updateProfile).toHaveBeenCalledWith({ profile_type: "group", group_size: "4-5", details: {} }),
        );
        expect(await screen.findByRole("heading", { name: "¿Cómo te conocen?" })).toBeTruthy();
        expect(screen.getByLabelText("Nombre del grupo")).toBeTruthy();
    });

    it("un solista guarda sin tamaño de grupo y ve «Nombre artístico»", async () => {
        getProfile.mockResolvedValue(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await user.click(await screen.findByRole("button", { name: "Empezar" }));
        await user.click(screen.getByRole("radio", { name: /Trabajo solo/ }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        await waitFor(() =>
            expect(updateProfile).toHaveBeenCalledWith({ profile_type: "solo", group_size: null, details: {} }),
        );
        expect(await screen.findByLabelText("Nombre artístico")).toBeTruthy();
    });

    it("no avanza sin nombre y explica qué falta", async () => {
        getProfile.mockResolvedValue(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await user.click(await screen.findByRole("button", { name: "Empezar" }));
        await user.click(screen.getByRole("radio", { name: /Trabajo solo/ }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await screen.findByRole("heading", { name: "¿Cómo te conocen?" });
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        expect(await screen.findByText("Escribe tu nombre artístico (mínimo 2 letras).")).toBeTruthy();
        expect(updateProfile).toHaveBeenCalledTimes(1);
    });

    it("guarda el nombre artístico y pasa a «¿Qué tocas?»", async () => {
        getProfile.mockResolvedValue(draftProfile());
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await user.click(await screen.findByRole("button", { name: "Empezar" }));
        await user.click(screen.getByRole("radio", { name: /Trabajo solo/ }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await user.type(await screen.findByLabelText("Nombre artístico"), "Grupo Aurora");
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ stage_name: "Grupo Aurora" }));
        expect(await screen.findByRole("heading", { name: "¿Qué tocas?" })).toBeTruthy();
        expect(screen.getByText("Tu música · 1 de 2")).toBeTruthy();
    });

    it("un paso opcional se omite sin guardar nada y sigue al siguiente", async () => {
        getProfile.mockResolvedValue(draftProfile({ stage_name: "Grupo Aurora", genres: ["Salsa"], instruments: ["Voz"] }));
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await screen.findByRole("heading", { name: "¿Dónde trabajas y cuánto cobras?" });

        await user.click(screen.getByRole("button", { name: "Volver al paso anterior" }));
        expect(await screen.findByRole("heading", { name: "¿Qué eventos animas?" })).toBeTruthy();
        expect(screen.getByText("Opcional · puedes omitirlo")).toBeTruthy();

        await user.click(screen.getByRole("button", { name: "Omitir por ahora" }));
        expect(await screen.findByRole("heading", { name: "¿Dónde trabajas y cuánto cobras?" })).toBeTruthy();
        expect(updateProfile).not.toHaveBeenCalled();
    });

    it("guarda los eventos elegidos dentro de los detalles", async () => {
        getProfile.mockResolvedValue(draftProfile({ stage_name: "Grupo Aurora", genres: ["Salsa"], instruments: ["Voz"] }));
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);
        await screen.findByRole("heading", { name: "¿Dónde trabajas y cuánto cobras?" });
        await user.click(screen.getByRole("button", { name: "Volver al paso anterior" }));
        await screen.findByRole("heading", { name: "¿Qué eventos animas?" });

        await user.click(screen.getByRole("button", { name: "Bodas" }));
        await user.click(screen.getByRole("button", { name: "Quinceañeros" }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        await waitFor(() =>
            expect(updateProfile).toHaveBeenCalledWith({ details: { event_types: ["bodas", "quinceaneros"] } }),
        );
        expect(await screen.findByRole("heading", { name: "¿Dónde trabajas y cuánto cobras?" })).toBeTruthy();
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

    it("un perfil adicional usa la guía corta: sin documento ni firma y con salida al perfil principal", async () => {
        window.localStorage.setItem("chivapp:active-musician-profile", "11111111-1111-4111-8111-111111111111");
        getProfile.mockResolvedValue(
            draftProfile({
                is_primary: false,
                stage_name: null,
                id_document_url: "/uploads/private/dni.jpg",
                signature_image_url: "/uploads/private/firma.png",
            }),
        );
        const user = userEvent.setup();
        render(<MusicianGuidedOnboarding />);

        expect(await screen.findByRole("heading", { name: "Agreguemos tu nuevo perfil" })).toBeTruthy();
        expect(screen.getByText(/no los repites/)).toBeTruthy();
        expect(screen.getByText("10 pasos cortos, unos 7 minutos. 3 son opcionales. Se guarda solo: puedes salir y seguir cuando quieras.")).toBeTruthy();

        await user.click(screen.getByRole("button", { name: "Salir" }));
        expect(window.localStorage.getItem("chivapp:active-musician-profile")).toBeNull();
        expect(routerMock.replace).toHaveBeenCalledWith("/musician");
    });

    it("al terminar un perfil adicional, «Ir a mi panel» vuelve al perfil principal", async () => {
        window.localStorage.setItem("chivapp:active-musician-profile", "11111111-1111-4111-8111-111111111111");
        getProfile.mockResolvedValue(
            draftProfile({
                is_primary: false,
                profile_type: "solo",
                stage_name: "Mi grupo",
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
        expect(screen.queryByRole("button", { name: /documento|firma/i })).toBeNull();
        await user.click(screen.getByRole("button", { name: "Enviar a revisión" }));
        expect(await screen.findByRole("heading", { name: "Perfil enviado" })).toBeTruthy();

        await user.click(screen.getByRole("button", { name: "Ir a mi panel" }));
        expect(window.localStorage.getItem("chivapp:active-musician-profile")).toBeNull();
        expect(routerMock.replace).toHaveBeenCalledWith("/musician");
    });
});
