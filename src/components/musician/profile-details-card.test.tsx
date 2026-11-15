import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileDetailsCard from "./profile-details-card";
import { ApiError } from "@/lib/api";

const { getProfile, updateProfile, toast } = vi.hoisted(() => ({
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    toast: vi.fn(),
}));

vi.mock("@/lib/profiles", () => ({
    getMusicianProfile: getProfile,
    updateMusicianProfile: updateProfile,
}));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: toast };
});

function profile(overrides: Record<string, unknown> = {}) {
    return {
        profile_type: "solo",
        group_size: null,
        details: {},
        location_city: "Lima",
        ...overrides,
    };
}

describe("ProfileDetailsCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateProfile.mockResolvedValue({});
    });

    it("no ofrece guardar mientras no haya cambios", async () => {
        getProfile.mockResolvedValue(profile());
        render(<ProfileDetailsCard />);

        const save = await screen.findByRole("button", { name: "Guardar detalles" });
        expect((save as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText("Sin cambios por guardar")).toBeTruthy();
    });

    it("guarda el tipo y los detalles elegidos, y avisa que no pasa por revisión", async () => {
        getProfile.mockResolvedValue(profile());
        const user = userEvent.setup();
        render(<ProfileDetailsCard />);

        await user.click(await screen.findByRole("button", { name: "Bodas" }));
        await user.click(screen.getByRole("button", { name: "3 horas" }));
        await user.click(screen.getByRole("button", { name: "Guardar detalles" }));

        await waitFor(() =>
            expect(updateProfile).toHaveBeenCalledWith({
                profile_type: "solo",
                group_size: null,
                details: { event_types: ["bodas"], duration: "3h" },
            }),
        );
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Detalles guardados" }));
    });

    it("un grupo debe indicar cuántas personas son antes de guardar", async () => {
        getProfile.mockResolvedValue(profile());
        const user = userEvent.setup();
        render(<ProfileDetailsCard />);

        await user.click(await screen.findByRole("radio", { name: /Somos un grupo/ }));
        await user.click(screen.getByRole("button", { name: "Guardar detalles" }));
        expect(await screen.findByText("Indica cuántas personas son para guardar un perfil de grupo.")).toBeTruthy();
        expect(updateProfile).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "6 a 8" }));
        await user.click(screen.getByRole("button", { name: "Guardar detalles" }));
        await waitFor(() =>
            expect(updateProfile).toHaveBeenCalledWith({ profile_type: "group", group_size: "6-8", details: {} }),
        );
    });

    it("al pasar a solista se descartan los datos exclusivos de grupo", async () => {
        getProfile.mockResolvedValue(
            profile({ profile_type: "group", group_size: "3", details: { format: "mixed", reduced: "yes", duration: "2h" } }),
        );
        const user = userEvent.setup();
        render(<ProfileDetailsCard />);

        await user.click(await screen.findByRole("radio", { name: /Trabajo solo/ }));
        await user.click(screen.getByRole("button", { name: "Guardar detalles" }));

        await waitFor(() =>
            expect(updateProfile).toHaveBeenCalledWith({ profile_type: "solo", group_size: null, details: { duration: "2h" } }),
        );
    });

    it("muestra el motivo cuando el servidor no deja pasar a solista con integrantes", async () => {
        getProfile.mockResolvedValue(profile({ profile_type: "group", group_size: "3" }));
        updateProfile.mockRejectedValue(new ApiError("/profiles/musician", 409, "Tu perfil tiene integrantes. Quítalos antes de pasar a solista."));
        const user = userEvent.setup();
        render(<ProfileDetailsCard />);

        await user.click(await screen.findByRole("radio", { name: /Trabajo solo/ }));
        await user.click(screen.getByRole("button", { name: "Guardar detalles" }));

        expect(await screen.findByText("Tu perfil tiene integrantes. Quítalos antes de pasar a solista.")).toBeTruthy();
    });

    it("no ofrece la ciudad propia como ciudad adicional", async () => {
        getProfile.mockResolvedValue(profile({ location_city: "Lima" }));
        render(<ProfileDetailsCard />);

        await screen.findByRole("button", { name: "Arequipa" });
        expect(screen.queryByRole("button", { name: "Lima" })).toBeNull();
    });
});
