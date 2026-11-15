import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContractorGuidedOnboarding from "./contractor-guided-onboarding";

const { getProfile, updateProfile, submitProfile, upload } = vi.hoisted(() => ({
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    submitProfile: vi.fn(),
    upload: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
    useRouter: () => routerMock,
    usePathname: () => "/contractor/onboarding",
}));

const authState = vi.hoisted(() => ({
    user: { id: "c1", role: "contractor", fullname: "María Torres", is_verified: false } as { id: string; role: string; fullname: string; is_verified: boolean } | null,
    isLoading: false,
}));

vi.mock("@/contexts/auth-context", () => ({
    useAuth: () => ({ ...authState, refresh: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/profiles", () => ({
    getContractorProfile: getProfile,
    updateContractorProfile: updateProfile,
    submitContractorProfile: submitProfile,
}));

vi.mock("@/lib/uploads", () => ({ uploadFile: upload }));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: vi.fn() };
});

function draft(overrides: Record<string, unknown> = {}) {
    return {
        status: "draft",
        fullname: "María Torres",
        phone: null,
        city: null,
        address: null,
        document_type: null,
        document_number: null,
        id_document_url: null,
        ...overrides,
    };
}

describe("ContractorGuidedOnboarding", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.scrollTo = vi.fn();
        authState.user = { id: "c1", role: "contractor", fullname: "María Torres", is_verified: false };
        updateProfile.mockResolvedValue({});
        submitProfile.mockResolvedValue({});
        upload.mockResolvedValue("/uploads/private/dni.jpg");
        URL.createObjectURL = vi.fn(() => "blob:preview");
        URL.revokeObjectURL = vi.fn();
    });

    it("un contratante nuevo empieza por el nombre aunque ya venga prellenado", async () => {
        getProfile.mockResolvedValue(draft());
        render(<ContractorGuidedOnboarding />);

        expect(await screen.findByRole("heading", { name: "¿Cómo te llamas?" })).toBeTruthy();
        expect(screen.getByText("Tú · 1 de 2")).toBeTruthy();
    });

    it("guarda nombre y teléfono y pasa a la dirección con aviso de capítulo", async () => {
        getProfile.mockResolvedValue(draft());
        const user = userEvent.setup();
        render(<ContractorGuidedOnboarding />);
        await screen.findByRole("heading", { name: "¿Cómo te llamas?" });

        await user.type(screen.getByLabelText("Teléfono (opcional)"), "+51 999 888 777");
        await user.click(screen.getByRole("button", { name: "Continuar" }));

        await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ fullname: "María Torres", phone: "+51 999 888 777" }));
        expect(await screen.findByRole("heading", { name: "¿Dónde vives?" })).toBeTruthy();
    });

    it("no avanza sin ciudad o dirección y lo explica", async () => {
        getProfile.mockResolvedValue(draft({ phone: "999" }));
        const user = userEvent.setup();
        render(<ContractorGuidedOnboarding />);
        await screen.findByRole("heading", { name: "¿Dónde vives?" });

        await user.click(screen.getByRole("button", { name: "Continuar" }));
        expect(await screen.findByText("Elige tu ciudad.")).toBeTruthy();

        await user.click(screen.getByRole("button", { name: "Lima" }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        expect(await screen.findByText("Escribe tu dirección: calle, número y distrito.")).toBeTruthy();
        expect(updateProfile).not.toHaveBeenCalled();
    });

    it("sube la foto del documento como archivo privado y guarda el documento", async () => {
        getProfile.mockResolvedValue(draft({ city: "Lima", address: "Av. Los Olivos 123, Miraflores" }));
        const user = userEvent.setup();
        render(<ContractorGuidedOnboarding />);
        await screen.findByRole("heading", { name: "Confirma que eres tú" });

        await user.type(screen.getByLabelText("Número de documento"), "45678912");
        const file = new File(["x"], "dni.jpg", { type: "image/jpeg" });
        await user.upload(screen.getByLabelText("Subir foto del documento"), file);
        await waitFor(() => expect(upload).toHaveBeenCalledWith(file, { private: true }));

        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await waitFor(() =>
            expect(updateProfile).toHaveBeenCalledWith({
                document_type: "DNI",
                document_number: "45678912",
                id_document_url: "/uploads/private/dni.jpg",
            }),
        );
        expect(await screen.findByRole("heading", { name: "Revisa y envía" })).toBeTruthy();
    });

    it("con todo completo llega a la revisión, permite cambiar y envía el perfil", async () => {
        getProfile.mockResolvedValue(
            draft({ city: "Lima", address: "Av. Los Olivos 123, Miraflores", document_type: "DNI", document_number: "45678912", id_document_url: "/uploads/private/dni.jpg" }),
        );
        const user = userEvent.setup();
        render(<ContractorGuidedOnboarding />);
        expect(await screen.findByRole("heading", { name: "Revisa y envía" })).toBeTruthy();

        await user.click(screen.getByRole("button", { name: "Cambiar dirección" }));
        expect(await screen.findByRole("heading", { name: "¿Dónde vives?" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Guardar y volver" })).toBeTruthy();
        await user.click(screen.getByRole("button", { name: "Guardar y volver" }));

        expect(await screen.findByRole("heading", { name: "Revisa y envía" })).toBeTruthy();
        await user.click(screen.getByRole("button", { name: "Enviar a revisión" }));
        await waitFor(() => expect(submitProfile).toHaveBeenCalledTimes(1));
        expect(await screen.findByRole("heading", { name: "Perfil enviado" })).toBeTruthy();

        await user.click(screen.getByRole("button", { name: "Ir a mi panel" }));
        expect(routerMock.replace).toHaveBeenCalledWith("/contractor");
    });

    it("quien ya envió o publicó su perfil va al panel, no a la guía", async () => {
        getProfile.mockResolvedValue(draft({ status: "pending_review" }));
        render(<ContractorGuidedOnboarding />);

        await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/contractor/profile"));
    });

    it("un músico o un visitante no entra a la guía del contratante", async () => {
        authState.user = { id: "m1", role: "musician", fullname: "Carlos", is_verified: false };
        const { unmount } = render(<ContractorGuidedOnboarding />);
        await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/musician"));
        unmount();

        routerMock.replace.mockClear();
        authState.user = null;
        render(<ContractorGuidedOnboarding />);
        await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/login?redirect=/contractor/onboarding"));
        expect(getProfile).not.toHaveBeenCalled();
    });
});
