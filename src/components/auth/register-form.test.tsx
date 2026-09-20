import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import RegisterForm from "./register-form";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    usePathname: () => "/",
}));

vi.mock("@/lib/auth", () => ({
    getCurrentUser: vi.fn().mockResolvedValue(null),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    logoutUser: vi.fn(),
}));

const { addToastMock } = vi.hoisted(() => ({ addToastMock: vi.fn() }));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: addToastMock };
});

function renderRegisterForm() {
    return render(
        <AuthProvider>
            <RegisterForm />
        </AuthProvider>,
    );
}

async function fillRequiredFields(
    user: ReturnType<typeof userEvent.setup>,
    role: "contractor" | "musician" = "contractor",
    password = "SuperSecreta123!",
    confirmPassword = "SuperSecreta123!",
) {
    await user.type(screen.getByLabelText(/^Correo electr/i), "nuevo@example.com");
    if (role === "contractor") {
        await user.type(screen.getByLabelText(/^Nombre completo$/i), "Juan Pérez");
        await user.type(screen.getByLabelText(/^N.mero de celular$/i), "987654321");
    }
    await user.type(screen.getByLabelText(/^Contrase.a$/i), password);
    await user.type(screen.getByLabelText(/^Validar contrase.a$/i), confirmPassword);
    await user.click(screen.getByRole("checkbox"));
}

describe("RegisterForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("submits the form data to registerUser, defaulting to the contractor role", async () => {
        const { registerUser } = await import("@/lib/auth");
        vi.mocked(registerUser).mockResolvedValue({
            id: "u1",
            email: "nuevo@example.com",
            role: "contractor",
            is_verified: false,
        } as never);

        const user = userEvent.setup();
        renderRegisterForm();
        await fillRequiredFields(user, "contractor");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        expect(registerUser).toHaveBeenCalledWith({
            email: "nuevo@example.com",
            password: "SuperSecreta123!",
            role: "contractor",
            accepted_terms: true,
            fullname: "Juan Pérez",
            phone: "987654321",
        });
    });

    it("submits musician form data when musician role is selected", async () => {
        const { registerUser } = await import("@/lib/auth");
        vi.mocked(registerUser).mockResolvedValue({
            id: "m1",
            email: "nuevo@example.com",
            role: "musician",
            is_verified: false,
        } as never);

        const user = userEvent.setup();
        renderRegisterForm();
        await user.click(screen.getByRole("radio", { name: /Músico/i }));
        await fillRequiredFields(user, "musician");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        expect(registerUser).toHaveBeenCalledWith({
            email: "nuevo@example.com",
            password: "SuperSecreta123!",
            role: "musician",
            accepted_terms: true,
        });
    });

    it("prevents submission and displays an error when passwords do not match", async () => {
        const { registerUser } = await import("@/lib/auth");

        const user = userEvent.setup();
        renderRegisterForm();
        await fillRequiredFields(user, "contractor", "SuperSecreta123!", "OtraPassword456!");

        const submitBtn = screen.getByRole("button", { name: "Crear cuenta" });
        expect(submitBtn).toBeDisabled();
        expect(registerUser).not.toHaveBeenCalled();
    });

    it("shows a specific message when the email is already taken", async () => {
        const { registerUser } = await import("@/lib/auth");
        vi.mocked(registerUser).mockRejectedValue(
            new ApiError("/auth/register", 400, "Ese correo ya está en uso"),
        );

        const user = userEvent.setup();
        renderRegisterForm();
        await fillRequiredFields(user, "contractor");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        expect(addToastMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Correo no disponible" }),
        );
    });
});
