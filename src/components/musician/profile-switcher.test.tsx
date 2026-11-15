import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileSwitcher from "./profile-switcher";
import { ApiError } from "@/lib/api";

const { listProfiles, createProfile, toast } = vi.hoisted(() => ({
    listProfiles: vi.fn(),
    createProfile: vi.fn(),
    toast: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));

vi.mock("@/lib/profiles", () => ({
    listMyMusicianProfiles: listProfiles,
    createAdditionalMusicianProfile: createProfile,
    invalidateProfileVerificationCache: vi.fn(),
}));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: toast };
});

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

function row(id: string, name: string | null, overrides: Record<string, unknown> = {}) {
    return {
        id,
        stage_name: name,
        slug: name ? name.toLowerCase().replace(/ /g, "-") : null,
        profile_type: "solo",
        group_size: null,
        status: "published",
        is_primary: false,
        profile_image_url: null,
        ...overrides,
    };
}

const reload = vi.fn();

describe("ProfileSwitcher", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload } });
    });

    it("no se muestra si hay un solo perfil y todavía no puede agregar otro", async () => {
        listProfiles.mockResolvedValue([row(A, "Carlos", { is_primary: true, status: "draft" })]);
        const { container } = render(<ProfileSwitcher />);

        await waitFor(() => expect(listProfiles).toHaveBeenCalled());
        expect(container.querySelector("button")).toBeNull();
    });

    it("con un perfil enviado ofrece agregar otro", async () => {
        listProfiles.mockResolvedValue([row(A, "Carlos", { is_primary: true })]);
        const user = userEvent.setup();
        render(<ProfileSwitcher />);

        await user.click(await screen.findByRole("button", { name: /Perfil activo/ }));
        const add = screen.getByRole("menuitem", { name: /Agregar otro perfil/ });
        expect((add as HTMLButtonElement).disabled).toBe(false);
    });

    it("muestra el perfil activo y cambia de perfil guardando la elección", async () => {
        listProfiles.mockResolvedValue([
            row(A, "Carlos Quispe", { is_primary: true }),
            row(B, "Los Hermanos Quispe", { profile_type: "group", group_size: "4-5", status: "pending_review" }),
        ]);
        const user = userEvent.setup();
        render(<ProfileSwitcher />);

        const trigger = await screen.findByRole("button", { name: /Perfil activo/ });
        expect(trigger.textContent).toContain("Carlos Quispe");

        await user.click(trigger);
        const items = screen.getAllByRole("menuitemradio");
        expect(items).toHaveLength(2);
        expect(items[0].getAttribute("aria-checked")).toBe("true");
        expect(items[1].textContent).toContain("Grupo de 4 a 5 · En revisión");

        await user.click(items[1]);
        expect(window.localStorage.getItem("chivapp:active-musician-profile")).toBe(B);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("respeta el perfil elegido antes y vuelve al principal si el guardado ya no existe", async () => {
        listProfiles.mockResolvedValue([row(A, "Carlos", { is_primary: true }), row(B, "Mi grupo")]);
        window.localStorage.setItem("chivapp:active-musician-profile", B);
        const first = render(<ProfileSwitcher />);
        expect((await screen.findByRole("button", { name: /Perfil activo/ })).textContent).toContain("Mi grupo");
        first.unmount();

        window.localStorage.setItem("chivapp:active-musician-profile", C);
        render(<ProfileSwitcher />);
        expect((await screen.findByRole("button", { name: /Perfil activo/ })).textContent).toContain("Carlos");
    });

    it("al llegar a tres perfiles no permite agregar y dice por qué", async () => {
        listProfiles.mockResolvedValue([row(A, "Uno", { is_primary: true }), row(B, "Dos"), row(C, "Tres")]);
        const user = userEvent.setup();
        render(<ProfileSwitcher />);

        await user.click(await screen.findByRole("button", { name: /Perfil activo/ }));
        const add = screen.getByRole("menuitem", { name: /Agregar otro perfil/ });
        expect((add as HTMLButtonElement).disabled).toBe(true);
        expect(add.textContent).toContain("Máximo 3 perfiles");
    });

    it("agrega un perfil, lo deja activo y lleva a su guía", async () => {
        listProfiles.mockResolvedValue([row(A, "Carlos", { is_primary: true })]);
        createProfile.mockResolvedValue({ id: B });
        const user = userEvent.setup();
        render(<ProfileSwitcher />);

        await user.click(await screen.findByRole("button", { name: /Perfil activo/ }));
        await user.click(screen.getByRole("menuitem", { name: /Agregar otro perfil/ }));

        await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/musician/onboarding"));
        expect(window.localStorage.getItem("chivapp:active-musician-profile")).toBe(B);
    });

    it("si el servidor rechaza el nuevo perfil, muestra el motivo y no cambia nada", async () => {
        listProfiles.mockResolvedValue([row(A, "Carlos", { is_primary: true })]);
        createProfile.mockRejectedValue(new ApiError("/profiles/musician/additional", 409, "Puedes tener hasta 3 perfiles."));
        const user = userEvent.setup();
        render(<ProfileSwitcher />);

        await user.click(await screen.findByRole("button", { name: /Perfil activo/ }));
        await user.click(screen.getByRole("menuitem", { name: /Agregar otro perfil/ }));

        await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Puedes tener hasta 3 perfiles." })));
        expect(routerMock.push).not.toHaveBeenCalled();
        expect(window.localStorage.getItem("chivapp:active-musician-profile")).toBeNull();
    });

    it("Escape cierra el menú", async () => {
        listProfiles.mockResolvedValue([row(A, "Carlos", { is_primary: true }), row(B, "Mi grupo")]);
        const user = userEvent.setup();
        render(<ProfileSwitcher />);

        await user.click(await screen.findByRole("button", { name: /Perfil activo/ }));
        expect(screen.getByRole("menu")).toBeTruthy();
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("menu")).toBeNull();
    });
});
