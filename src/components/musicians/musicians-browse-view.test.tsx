import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MusiciansBrowseView from "./musicians-browse-view";

const { search } = vi.hoisted(() => ({ search: vi.fn() }));

vi.mock("@/lib/musicians", () => ({ searchMusicians: search }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => "/musicians",
    useSearchParams: () => new URLSearchParams(),
}));

describe("MusiciansBrowseView: tipo de artista y de evento", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        search.mockResolvedValue([]);
        window.history.replaceState(null, "", "/musicians");
    });

    it("filtra por grupos y por tipo de evento, y lo deja en la dirección", async () => {
        const user = userEvent.setup();
        render(<MusiciansBrowseView initialMusicians={[]} />);

        await user.click(screen.getByRole("button", { name: "Grupos" }));
        await user.click(screen.getByRole("button", { name: "Bodas" }));

        await waitFor(() =>
            expect(search).toHaveBeenLastCalledWith(
                expect.objectContaining({ profile_type: "group", event_types: ["bodas"] }),
            ),
        );
        expect(window.location.search).toContain("profile_type=group");
        expect(window.location.search).toContain("event=bodas");
        expect(screen.getByRole("button", { name: "Grupos" }).getAttribute("aria-pressed")).toBe("true");
    });

    it("volver a tocar una ficha quita el filtro", async () => {
        const user = userEvent.setup();
        render(<MusiciansBrowseView initialMusicians={[]} initialFilters={{ profileType: "solo" }} />);

        const solistas = screen.getByRole("button", { name: "Solistas" });
        expect(solistas.getAttribute("aria-pressed")).toBe("true");
        await user.click(solistas);

        await waitFor(() => expect(solistas.getAttribute("aria-pressed")).toBe("false"));
        await waitFor(() =>
            expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ profile_type: undefined })),
        );
    });
});
