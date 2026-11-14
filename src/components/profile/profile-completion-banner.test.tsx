import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileCompletionBanner from "./profile-completion-banner";

const { routerMock, getStatus } = vi.hoisted(() => ({
    routerMock: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
    getStatus: vi.fn(),
}));

const authState = vi.hoisted(() => ({
    user: { id: "u1", role: "musician", is_ensemble_member: false } as Record<string, unknown> | null,
    isLoading: false,
}));

vi.mock("next/navigation", () => ({ useRouter: () => routerMock, usePathname: () => "/" }));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => authState }));
vi.mock("@/lib/profiles", () => ({
    getMusicianProfileStatus: getStatus,
    getContractorProfileStatus: vi.fn(),
}));

function status(overrides: Record<string, unknown> = {}) {
    return {
        status: "draft",
        current_step: 1,
        steps: [
            { key: "a", label: "A", completed: true },
            { key: "b", label: "B", completed: false },
        ],
        can_submit: false,
        is_public: false,
        is_ensemble_only: false,
        ...overrides,
    };
}

describe("ProfileCompletionBanner", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authState.user = { id: "u1", role: "musician", is_ensemble_member: false };
    });

    it("un músico con el perfil en borrador entra directo a la guía de alta", async () => {
        getStatus.mockResolvedValue(status());
        render(<ProfileCompletionBanner />);
        await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/musician/onboarding"));
    });

    it("el botón «Continuar perfil» lleva a la guía, no a la vista de perfil", async () => {
        getStatus.mockResolvedValue(status());
        render(<ProfileCompletionBanner />);
        const link = await screen.findByRole("button", { name: "Continuar perfil" });
        expect(link.getAttribute("href")).toBe("/musician/onboarding");
    });

    it("si ya envió el perfil a revisión no lo manda a la guía", async () => {
        getStatus.mockResolvedValue(status({ status: "pending_review", can_submit: true }));
        render(<ProfileCompletionBanner />);
        const link = await screen.findByRole("button", { name: "Ver estado" });
        expect(link.getAttribute("href")).toBe("/musician/profile");
        expect(routerMock.replace).not.toHaveBeenCalled();
    });

    it("quien solo es integrante de una agrupación no pasa por la guía", async () => {
        authState.user = { id: "u1", role: "musician", is_ensemble_member: true };
        getStatus.mockResolvedValue(status({ is_ensemble_only: true }));
        render(<ProfileCompletionBanner />);
        await screen.findByRole("button");
        expect(routerMock.replace).not.toHaveBeenCalled();
    });
});
