import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OnboardingPreviewClient from "./preview-client";
import { PREVIEW_DRAFT_MESSAGE } from "@/components/musician/onboarding-preview/types";

vi.mock("@/components/layout/app-navbar", () => ({ default: () => <nav aria-label="navbar" /> }));
vi.mock("@/components/musician/musician-detail-view", () => ({
    default: ({ musician }: { musician: { name: string; city: string | null; image: string | null; genres: string[] } }) => (
        <main>
            <h1 data-preview="name">{musician.name}</h1>
            {musician.genres.length > 0 ? <div data-preview="genres">géneros</div> : null}
            <p data-testid="city">{musician.city ?? ""}</p>
            <p data-testid="image">{musician.image ?? ""}</p>
        </main>
    ),
}));

const draft = {
    name: "Grupo Aurora",
    city: "Arequipa",
    price: "450",
    genres: ["Huayno"],
    instruments: ["Guitarra"],
    bio: "Somos un grupo de Arequipa.",
    photo: null,
};

function send(data: unknown, init: { origin?: string; source?: Window | null } = {}) {
    act(() => {
        window.dispatchEvent(
            new MessageEvent("message", {
                origin: init.origin ?? window.location.origin,
                source: init.source === undefined ? window : init.source,
                data,
            }),
        );
    });
}

describe("OnboardingPreviewClient", () => {
    window.scrollTo = vi.fn();

    it("empieza vacío, sin datos de ejemplo", () => {
        render(<OnboardingPreviewClient />);
        expect(screen.getByRole("heading", { name: "Tu nombre artístico" })).toBeTruthy();
    });

    it("muestra el borrador que manda la guía (mismo origen y ventana padre)", () => {
        render(<OnboardingPreviewClient />);
        send({ type: PREVIEW_DRAFT_MESSAGE, draft, focus: "name" });
        expect(screen.getByRole("heading", { name: "Grupo Aurora" })).toBeTruthy();
        expect(screen.getByTestId("city").textContent).toBe("Arequipa");
    });

    it("ignora mensajes de otro origen", () => {
        render(<OnboardingPreviewClient />);
        send({ type: PREVIEW_DRAFT_MESSAGE, draft, focus: null }, { origin: "https://evil.example" });
        expect(screen.getByRole("heading", { name: "Tu nombre artístico" })).toBeTruthy();
    });

    it("ignora mensajes que no vienen de la ventana padre", () => {
        render(<OnboardingPreviewClient />);
        send({ type: PREVIEW_DRAFT_MESSAGE, draft, focus: null }, { source: null });
        expect(screen.getByRole("heading", { name: "Tu nombre artístico" })).toBeTruthy();
    });

    it("descarta un borrador con una foto externa", () => {
        render(<OnboardingPreviewClient />);
        send({ type: PREVIEW_DRAFT_MESSAGE, draft: { ...draft, photo: "https://evil.example/x.png" }, focus: null });
        expect(screen.getByRole("heading", { name: "Tu nombre artístico" })).toBeTruthy();
        expect(screen.getByTestId("image").textContent).toBe("");
    });

    it("resalta la parte del perfil del paso actual", async () => {
        render(<OnboardingPreviewClient />);
        send({ type: PREVIEW_DRAFT_MESSAGE, draft, focus: "name" });
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
        });
        expect(screen.getByRole("heading", { name: "Grupo Aurora" }).hasAttribute("data-preview-focus")).toBe(true);
    });

    it("si la sección del paso aún no existe, se desplaza una sola vez cuando aparece", async () => {
        const scroll = vi.fn();
        window.scrollTo = scroll;
        render(<OnboardingPreviewClient />);
        const wait = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });

        // Paso «¿Qué tocas?» sin géneros todavía: no hay a dónde ir.
        send({ type: PREVIEW_DRAFT_MESSAGE, draft: { ...draft, genres: [], instruments: [] }, focus: "specialty" });
        await wait();
        expect(scroll).not.toHaveBeenCalled();

        // El músico elige un género: la sección aparece, se resalta y la vista se desplaza.
        send({ type: PREVIEW_DRAFT_MESSAGE, draft, focus: "specialty" });
        await wait();
        expect(scroll).toHaveBeenCalledTimes(1);
        expect(document.querySelector('[data-preview="genres"]')?.hasAttribute("data-preview-focus")).toBe(true);

        // Cambios siguientes dentro del mismo paso no la mueven otra vez.
        send({ type: PREVIEW_DRAFT_MESSAGE, draft: { ...draft, genres: ["Huayno", "Jazz"] }, focus: "specialty" });
        await wait();
        expect(scroll).toHaveBeenCalledTimes(1);
    });
});
