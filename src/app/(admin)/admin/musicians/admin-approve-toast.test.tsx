import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import AdminMusiciansPage from "./page";

const {
    approveMusicianProfileMock,
    getAdminMusiciansMock,
    addToastMock,
} = vi.hoisted(() => ({
    approveMusicianProfileMock: vi.fn(),
    getAdminMusiciansMock: vi.fn(),
    addToastMock: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
    approveMusicianProfile: (...args: unknown[]) =>
        approveMusicianProfileMock(...args),
    getAdminMusicians: (...args: unknown[]) => getAdminMusiciansMock(...args),
    getMusicianAdminDetail: vi.fn(),
    moderateMusicianProfile: vi.fn(),
    rejectMusicianProfile: vi.fn(),
}));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: addToastMock };
});

describe("AdminMusiciansPage (FE6-02)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getAdminMusiciansMock.mockResolvedValue([
            {
                id: "m-incomplete",
                stage_name: "Mariachi Sol",
                user_fullname: "Juan Pérez",
                user_email: "juan@example.com",
                status: "pending_review",
                bio: "",
            },
        ]);
    });

    it("shows a danger toast with missing fields when approveMusicianProfile rejects with 400", async () => {
        approveMusicianProfileMock.mockRejectedValueOnce(
            new ApiError(
                "/admin/musicians/m-incomplete/approve",
                400,
                "El perfil está incompleto y no puede publicarse. Faltan: biografía",
            ),
        );

        const user = userEvent.setup();
        render(<AdminMusiciansPage />);

        const approveBtn = await screen.findByRole("button", { name: /^Aprobar$/i });
        await user.click(approveBtn);

        const confirmBtn = await screen.findByRole("button", {
            name: /^Aprobar perfil$/i,
        });
        await user.click(confirmBtn);

        await waitFor(() => {
            expect(approveMusicianProfileMock).toHaveBeenCalledWith("m-incomplete");
            expect(addToastMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "No se pudo aprobar",
                    description:
                        "El perfil está incompleto y no puede publicarse. Faltan: biografía",
                    color: "danger",
                }),
            );
        });
    });
});
