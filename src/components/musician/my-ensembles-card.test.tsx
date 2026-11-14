import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyEnsemblesCard from "./my-ensembles-card";

const { listMock, leaveMock } = vi.hoisted(() => ({ listMock: vi.fn(), leaveMock: vi.fn() }));

vi.mock("@/lib/ensemble-members", () => ({
    listMyEnsembles: listMock,
    leaveEnsemble: leaveMock,
}));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: vi.fn() };
});

describe("MyEnsemblesCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("no muestra nada si el músico no pertenece a ninguna agrupación", async () => {
        listMock.mockResolvedValue([]);
        const { container } = render(<MyEnsemblesCard />);
        await waitFor(() => expect(listMock).toHaveBeenCalled());
        expect(container.querySelector("section")).toBeNull();
    });

    it("lista las agrupaciones y permite salirse tras confirmar", async () => {
        listMock.mockResolvedValue([{ id: "m1", leader_name: "Grupo Aurora", status: "active" }]);
        leaveMock.mockResolvedValue({ id: "m1", status: "inactive" });
        const user = userEvent.setup();
        render(<MyEnsemblesCard />);

        expect(await screen.findByText("Grupo Aurora")).toBeTruthy();
        await user.click(screen.getByRole("button", { name: "Salir" }));
        await user.click(await screen.findByRole("button", { name: "Sí, salir" }));

        await waitFor(() => expect(leaveMock).toHaveBeenCalledWith("m1"));
        await waitFor(() => expect(screen.queryByText("Grupo Aurora")).toBeNull());
    });

    it("no sale de la agrupación si se arrepiente", async () => {
        listMock.mockResolvedValue([{ id: "m1", leader_name: "Grupo Aurora", status: "active" }]);
        const user = userEvent.setup();
        render(<MyEnsemblesCard />);

        await user.click(await screen.findByRole("button", { name: "Salir" }));
        await user.click(await screen.findByRole("button", { name: "Quedarme" }));

        expect(leaveMock).not.toHaveBeenCalled();
        expect(screen.getByText("Grupo Aurora")).toBeTruthy();
    });
});
