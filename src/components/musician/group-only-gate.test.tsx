import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GroupOnlyGate from "./group-only-gate";

const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
vi.mock("@/lib/profiles", () => ({ getMusicianProfile: getProfile }));

describe("GroupOnlyGate", () => {
    beforeEach(() => vi.clearAllMocks());

    it("muestra la pantalla de equipo en un perfil de grupo", async () => {
        getProfile.mockResolvedValue({ profile_type: "group" });
        render(<GroupOnlyGate><p>Equipo del grupo</p></GroupOnlyGate>);

        expect(await screen.findByText("Equipo del grupo")).toBeTruthy();
    });

    it("en un solista explica por qué no hay equipo y dónde activarlo", async () => {
        getProfile.mockResolvedValue({ profile_type: "solo" });
        render(<GroupOnlyGate><p>Equipo del grupo</p></GroupOnlyGate>);

        expect(await screen.findByRole("heading", { name: "Este perfil es de solista" })).toBeTruthy();
        expect(screen.queryByText("Equipo del grupo")).toBeNull();
        expect(screen.getByRole("button", { name: /Detalles de tu perfil/ }).getAttribute("href")).toBe("/musician/profile");
    });

    it("si no se pudo saber el tipo, no bloquea la pantalla", async () => {
        getProfile.mockRejectedValue(new Error("sin red"));
        render(<GroupOnlyGate><p>Equipo del grupo</p></GroupOnlyGate>);

        expect(await screen.findByText("Equipo del grupo")).toBeTruthy();
    });
});
