import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MusicianGuidedOnboarding from "./musician-guided-onboarding";
import { OTHER_GENRE_ICON, OTHER_INSTRUMENT_ICON } from "@/lib/onboarding-icons";

const { getProfile, updateProfile } = vi.hoisted(() => ({
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
    useRouter: () => routerMock,
    usePathname: () => "/musician/onboarding",
}));

const authState = vi.hoisted(() => ({
    user: { id: "u1", role: "musician", fullname: "Carlos Quispe", is_verified: false },
    isLoading: false,
}));

vi.mock("@/contexts/auth-context", () => ({
    useAuth: () => ({ ...authState, refresh: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/profiles", () => ({
    getMusicianProfile: getProfile,
    updateMusicianProfile: updateProfile,
    submitMusicianProfile: vi.fn(),
    deleteAdditionalMusicianProfile: vi.fn().mockResolvedValue(undefined),
    invalidateProfileVerificationCache: vi.fn(),
}));

vi.mock("@/lib/uploads", () => ({
    uploadFile: vi.fn().mockResolvedValue("/uploads/x.jpg"),
    uploadSignatureDataUrl: vi.fn().mockResolvedValue("/uploads/private/firma.png"),
    resolveUploadUrl: (url: string | null) => url,
}));

vi.mock("@/components/ui/signature-pad", () => ({ default: () => <div data-testid="signature-pad" /> }));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: vi.fn() };
});

/** Perfil con nombre y un género: la guía retoma en «¿Qué tocas?». */
function atSpecialtyStep() {
    return {
        status: "draft",
        is_ensemble_only: false,
        stage_name: "Grupo Aurora",
        genres: ["Salsa"],
        instruments: [],
        location_city: null,
        price_per_event: null,
        price_per_hour: null,
        profile_image_url: null,
        bio: null,
        id_document_url: null,
        signature_image_url: null,
        fullname: "Carlos Quispe",
    };
}

async function openSpecialtyStep() {
    getProfile.mockResolvedValue(atSpecialtyStep());
    const view = render(<MusicianGuidedOnboarding />);
    await screen.findByRole("heading", { name: "¿Qué tocas?" });
    return view;
}

describe("Guía de perfil: UX", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.scrollTo = vi.fn();
        updateProfile.mockResolvedValue({});
    });

    it("muestra el logo real de Chivapp", async () => {
        const { container } = await openSpecialtyStep();
        const logo = container.querySelector('img[alt="Chivapp"]');
        expect(logo?.getAttribute("src")).toBe("/logo-chivappv2.png");
    });

    it("cada ficha de género e instrumento lleva su ícono", async () => {
        await openSpecialtyStep();
        const genres = screen.getByRole("group", { name: /Géneros/ });
        const chips = within(genres).getAllByRole("button", { pressed: false }).filter((b) => b.hasAttribute("aria-pressed"));
        expect(chips.length).toBeGreaterThan(5);
        for (const chip of chips) expect(chip.querySelector("[data-icon]")).not.toBeNull();
        expect(within(genres).getByRole("button", { name: "Salsa" }).querySelector('[data-icon="mdi:trumpet"]')).not.toBeNull();
    });

    it("«Otro género» y «Otro instrumento» tienen íconos distintos", async () => {
        const { container } = await openSpecialtyStep();
        expect(container.querySelectorAll(`[data-icon="${OTHER_GENRE_ICON}"]`)).toHaveLength(1);
        expect(container.querySelectorAll(`[data-icon="${OTHER_INSTRUMENT_ICON}"]`)).toHaveLength(1);
    });

    it("al llegar a 5 géneros desactiva las demás fichas y explica por qué", async () => {
        const user = userEvent.setup();
        await openSpecialtyStep();
        const genres = screen.getByRole("group", { name: /Géneros/ });

        for (const name of ["Cumbia", "Rock", "Pop", "Balada"]) {
            await user.click(within(genres).getByRole("button", { name }));
        }

        expect(await screen.findByText(/Llegaste al máximo de 5 géneros/)).toBeTruthy();
        expect((within(genres).getByRole("button", { name: "Jazz" }) as HTMLButtonElement).disabled).toBe(true);
        // Las ya elegidas siguen activas para poder quitarlas.
        expect((within(genres).getByRole("button", { name: "Rock" }) as HTMLButtonElement).disabled).toBe(false);
        expect((screen.getByLabelText("Agregar otro género") as HTMLInputElement).disabled).toBe(true);

        await user.click(within(genres).getByRole("button", { name: "Rock" }));
        expect((within(genres).getByRole("button", { name: "Jazz" }) as HTMLButtonElement).disabled).toBe(false);
    });

    it("«Agregar» está desactivado hasta escribir algo y agrega una ficha nueva ya elegida", async () => {
        const user = userEvent.setup();
        await openSpecialtyStep();
        const instruments = screen.getByRole("group", { name: "Instrumentos" });
        const add = within(instruments).getByRole("button", { name: "Agregar" }) as HTMLButtonElement;
        expect(add.disabled).toBe(true);

        await user.type(screen.getByLabelText("Agregar otro instrumento"), "ocarina");
        expect(add.disabled).toBe(false);
        await user.click(add);

        const chip = await within(instruments).findByRole("button", { name: "Ocarina" });
        expect(chip.getAttribute("aria-pressed")).toBe("true");
        expect((screen.getByLabelText("Agregar otro instrumento") as HTMLInputElement).value).toBe("");
    });

    it("dos toques seguidos en fichas no se pisan entre sí", async () => {
        const user = userEvent.setup();
        await openSpecialtyStep();
        const instruments = screen.getByRole("group", { name: "Instrumentos" });
        await user.click(within(instruments).getByRole("button", { name: "Voz" }));
        await user.click(within(instruments).getByRole("button", { name: "Guitarra" }));
        expect(within(instruments).getByRole("button", { name: "Voz" }).getAttribute("aria-pressed")).toBe("true");
        expect(within(instruments).getByRole("button", { name: "Guitarra" }).getAttribute("aria-pressed")).toBe("true");
    });

    it("explica qué parte del perfil alimenta el paso, como texto y no como botón", async () => {
        await openSpecialtyStep();
        const hint = screen.getByText("Alimenta Instrumentos y Géneros");
        expect(hint.closest("button")).toBeNull();
    });

    it("en celular ofrece «Ver cómo te ven» y abre la vista previa con sus pestañas", async () => {
        const user = userEvent.setup();
        await openSpecialtyStep();
        await user.click(screen.getByRole("button", { name: /Ver cómo te ven/ }));
        const dialog = await screen.findByRole("dialog");
        await waitFor(() => expect(within(dialog).getAllByRole("tab").length).toBe(3));
        expect(within(dialog).getByRole("tab", { name: "Compartir" })).toBeTruthy();
    });
});
