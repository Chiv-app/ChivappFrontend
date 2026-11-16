import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MusicianTeamSection from "./musician-team-section";

describe("MusicianTeamSection", () => {
    it("no dibuja nada si no hay equipo ni grupos", () => {
        const { container } = render(<MusicianTeamSection members={[]} playsWith={[]} />);
        expect(container.innerHTML).toBe("");
    });

    it("lista a los integrantes y enlaza, con discreción, solo a quienes tienen perfil de solista publicado", () => {
        render(
            <MusicianTeamSection
                members={[
                    { name: "Luis Pérez", specialties: ["Guitarra", "Voz"], profile_slug: "luis-perez" },
                    { name: "Marta Ríos", specialties: [], profile_slug: null },
                ]}
                playsWith={[]}
            />,
        );

        expect(screen.getByRole("heading", { name: "Integrantes" })).toBeTruthy();
        expect(screen.getByText("Guitarra, Voz")).toBeTruthy();
        const links = screen.getAllByRole("link");
        expect(links).toHaveLength(1);
        expect(links[0].getAttribute("href")).toBe("/musicians/luis-perez");
        expect(links[0].textContent).toContain("Perfil profesional");
        // El lector de pantalla sabe de quién es el enlace.
        expect(links[0].textContent).toContain("de Luis Pérez");
    });

    it("en un solista muestra los grupos con los que toca", () => {
        render(<MusicianTeamSection members={[]} playsWith={[{ name: "Los Hermanos Quispe", slug: "los-hermanos-quispe" }]} />);

        expect(screen.getByRole("heading", { name: "Toca con" })).toBeTruthy();
        expect(screen.getByRole("link", { name: /Los Hermanos Quispe/ }).getAttribute("href")).toBe("/musicians/los-hermanos-quispe");
        expect(screen.queryByRole("heading", { name: "Integrantes" })).toBeNull();
    });

    it("en modo propietario de grupo sin integrantes activos muestra aviso y acceso a gestionar integrantes", () => {
        render(
            <MusicianTeamSection
                members={[]}
                playsWith={[]}
                isOwner
                profileType="group"
            />,
        );

        expect(screen.getByRole("heading", { name: "Integrantes" })).toBeTruthy();
        expect(
            screen.getByText(/Aún no tienes integrantes activos visibles/i),
        ).toBeTruthy();
        expect(
            screen.getByRole("link", { name: /Gestionar integrantes/i }).getAttribute("href"),
        ).toBe("/musician/members");
    });
});
