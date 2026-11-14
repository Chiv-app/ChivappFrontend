import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProfilePreview from "./profile-preview";
import { PREVIEW_DRAFT_MESSAGE, PREVIEW_READY_MESSAGE, type PreviewDraft } from "./types";

const draft: PreviewDraft = {
    name: "Grupo Aurora",
    city: "Arequipa",
    price: "450",
    genres: ["Huayno"],
    instruments: ["Guitarra"],
    bio: "Somos un grupo de Arequipa que anima celebraciones.",
    photo: null,
};

function iframeOf(container: HTMLElement): HTMLIFrameElement {
    const frame = container.querySelector("iframe");
    if (!frame) throw new Error("No hay iframe");
    return frame;
}

describe("ProfilePreview", () => {
    it("empieza en el perfil, con tres pestañas del mismo grupo", () => {
        const { container } = render(<ProfilePreview draft={draft} focus={null} />);
        const tabs = screen.getAllByRole("tab");
        expect(tabs.map((t) => t.textContent)).toEqual(["Perfil", "Buscador", "Compartir"]);
        expect(screen.getByRole("tab", { name: "Perfil" }).getAttribute("aria-selected")).toBe("true");
        expect(iframeOf(container).getAttribute("src")).toBe("/musician/onboarding/preview");
        expect(iframeOf(container).getAttribute("title")).toBeTruthy();
    });

    it("las flechas del teclado mueven la selección y el foco entre pestañas", async () => {
        const user = userEvent.setup();
        render(<ProfilePreview draft={draft} focus={null} />);
        screen.getByRole("tab", { name: "Perfil" }).focus();

        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: "Buscador" }).getAttribute("aria-selected")).toBe("true");
        expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Buscador" }));

        await user.keyboard("{End}");
        expect(screen.getByRole("tab", { name: "Compartir" }).getAttribute("aria-selected")).toBe("true");

        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: "Perfil" }).getAttribute("aria-selected")).toBe("true");
    });

    it("solo la pestaña activa entra en el orden de tabulación", () => {
        render(<ProfilePreview draft={draft} focus={null} />);
        const indexes = screen.getAllByRole("tab").map((t) => (t as HTMLElement).tabIndex);
        expect(indexes).toEqual([0, -1, -1]);
    });

    it("en «Buscador» muestra la tarjeta real con los datos del borrador", async () => {
        const user = userEvent.setup();
        render(<ProfilePreview draft={draft} focus={null} />);
        await user.click(screen.getByRole("tab", { name: "Buscador" }));
        expect(await screen.findByText("Grupo Aurora")).toBeTruthy();
        expect(screen.getByText(/S\/ 450/)).toBeTruthy();
    });

    it("en «Compartir» ofrece cuatro redes y describe lo que se ve", async () => {
        const user = userEvent.setup();
        render(<ProfilePreview draft={draft} focus={null} />);
        await user.click(screen.getByRole("tab", { name: "Compartir" }));

        const networks = screen.getAllByRole("tab").map((t) => t.textContent);
        expect(networks).toEqual(expect.arrayContaining(["WhatsApp", "Facebook", "Instagram", "X"]));
        expect(screen.getByRole("img", { name: /WhatsApp.*Grupo Aurora \| Chivapp/ })).toBeTruthy();

        await user.click(screen.getByRole("tab", { name: "Instagram" }));
        expect(screen.getByRole("img", { name: /Instagram/ })).toBeTruthy();
    });

    it("manda el borrador al iframe cuando este avisa que está listo", async () => {
        const { container } = render(<ProfilePreview draft={draft} focus="specialty" />);
        const frame = iframeOf(container);
        const spy = vi.spyOn(frame.contentWindow as Window, "postMessage");

        fireEvent(
            window,
            new MessageEvent("message", {
                origin: window.location.origin,
                source: frame.contentWindow,
                data: { type: PREVIEW_READY_MESSAGE },
            }),
        );

        await waitFor(() => expect(spy).toHaveBeenCalled());
        expect(spy).toHaveBeenCalledWith(
            { type: PREVIEW_DRAFT_MESSAGE, draft, focus: "specialty" },
            window.location.origin,
        );
    });

    it("ignora avisos de otro origen o de otra ventana", async () => {
        const { container } = render(<ProfilePreview draft={draft} focus={null} />);
        const frame = iframeOf(container);
        const spy = vi.spyOn(frame.contentWindow as Window, "postMessage");

        fireEvent(
            window,
            new MessageEvent("message", {
                origin: "https://evil.example",
                source: frame.contentWindow,
                data: { type: PREVIEW_READY_MESSAGE },
            }),
        );
        fireEvent(
            window,
            new MessageEvent("message", {
                origin: window.location.origin,
                source: window,
                data: { type: PREVIEW_READY_MESSAGE },
            }),
        );

        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(spy).not.toHaveBeenCalled();
    });
});
