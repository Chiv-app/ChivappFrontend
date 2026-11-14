import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoleDashboardShell from "./role-dashboard-shell";

const { routerMock, pathState, verification } = vi.hoisted(() => ({
    routerMock: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
    pathState: { pathname: "/musician/profile" },
    verification: {
        isVerified: false,
        isLoading: false,
        status: { status: "draft", is_ensemble_only: false } as Record<string, unknown> | null,
    },
}));

const authState = vi.hoisted(() => ({
    user: { id: "u1", role: "musician", is_verified: false, is_ensemble_member: false, is_email_verified: true } as Record<string, unknown>,
    isLoading: false,
    authError: false,
    refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => routerMock,
    usePathname: () => pathState.pathname,
}));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/use-profile-verification", () => ({ useProfileVerification: () => verification }));
vi.mock("@/components/layout/app-navbar", () => ({ default: () => <nav aria-label="navbar" /> }));
vi.mock("@/components/auth/email-verification-banner", () => ({ default: () => null }));

const navItems = [
    { href: "/musician", label: "Inicio", icon: "x" },
    { href: "/musician/profile", label: "Perfil", icon: "x" },
];

function renderShell() {
    return render(
        <RoleDashboardShell role="musician" profilePath="/musician/profile" navItems={navItems}>
            <p>contenido</p>
        </RoleDashboardShell>,
    );
}

describe("RoleDashboardShell: músico con el perfil en borrador", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pathState.pathname = "/musician/profile";
        verification.status = { status: "draft", is_ensemble_only: false };
        authState.user = { id: "u1", role: "musician", is_verified: false, is_ensemble_member: false, is_email_verified: true };
    });

    it("la vista de perfil lleva a la guía de alta", async () => {
        renderShell();
        await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/musician/onboarding"));
    });

    it("el resto del panel también lleva a la guía", async () => {
        pathState.pathname = "/musician/bookings";
        renderShell();
        await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/musician/onboarding"));
    });

    it("con el perfil ya enviado a revisión se puede ver la vista de perfil", async () => {
        verification.status = { status: "pending_review", is_ensemble_only: false };
        renderShell();
        await screen.findByText("contenido");
        expect(routerMock.replace).not.toHaveBeenCalledWith("/musician/onboarding");
    });

    it("quien solo es integrante de una agrupación no es enviado a la guía", async () => {
        verification.status = { status: "draft", is_ensemble_only: true };
        authState.user = { id: "u1", role: "musician", is_verified: false, is_ensemble_member: true, is_email_verified: true };
        pathState.pathname = "/musician/profile";
        renderShell();
        await screen.findByText("contenido");
        expect(routerMock.replace).not.toHaveBeenCalledWith("/musician/onboarding");
    });
});
