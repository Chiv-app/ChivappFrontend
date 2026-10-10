import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import LoginForm from "./login-form";

const { pushMock, replaceMock, refreshMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    replaceMock: vi.fn(),
    refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: refreshMock }),
    usePathname: () => "/",
}));

vi.mock("@/lib/auth", () => ({
    getCurrentUser: vi.fn().mockResolvedValue(null),
    loginStepOne: vi.fn(),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    logoutUser: vi.fn(),
}));

const { addToastMock } = vi.hoisted(() => ({ addToastMock: vi.fn() }));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: addToastMock };
});

function renderLoginForm() {
    return render(
        <AuthProvider>
            <LoginForm />
        </AuthProvider>,
    );
}

describe("LoginForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    
    it("submits the entered credentials to loginUser", async () => {
        const { loginUser, loginStepOne } = await import("@/lib/auth");
        vi.mocked(loginStepOne).mockResolvedValue({ status: "requires_password" } as any);
        vi.mocked(loginUser).mockResolvedValue({

            id: "u1",
            email: "user@example.com",
            role: "contractor",
            is_verified: true,
        } as never);

        const user = userEvent.setup();
        renderLoginForm();

        await user.type(screen.getByLabelText("Correo electrónico"), "user@example.com");
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await screen.findByLabelText("Contraseña");
        await user.type(screen.getByLabelText("Contraseña"), "SuperSecreta123");
        await user.click(screen.getByRole("button", { name: "Ingresar" }));

        expect(loginUser).toHaveBeenCalledWith({
            email: "user@example.com",
            password: "SuperSecreta123",
        });
    });

    
    it("shows a specific message when the email is already taken", async () => {
        const { loginUser, loginStepOne } = await import("@/lib/auth");
        vi.mocked(loginStepOne).mockResolvedValue({ status: "requires_password" } as any);
        vi.mocked(loginUser).mockRejectedValue(

            new ApiError("/auth/login", 400, "Ese correo ya está en uso"),
        );

        const user = userEvent.setup();
        renderLoginForm();

        await user.type(screen.getByLabelText("Correo electrónico"), "user@example.com");
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await screen.findByLabelText("Contraseña");
        await user.type(screen.getByLabelText("Contraseña"), "wrong");
        await user.click(screen.getByRole("button", { name: "Ingresar" }));

        expect(addToastMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Correo no disponible" }),
        );
    });

    
    it("shows the backend's raw message for other login errors", async () => {
        const { loginUser, loginStepOne } = await import("@/lib/auth");
        vi.mocked(loginStepOne).mockResolvedValue({ status: "requires_password" } as any);
        vi.mocked(loginUser).mockRejectedValue(

            new ApiError("/auth/login", 401, "Credenciales inválidas"),
        );

        const user = userEvent.setup();
        renderLoginForm();

        await user.type(screen.getByLabelText("Correo electrónico"), "user@example.com");
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await screen.findByLabelText("Contraseña");
        await user.type(screen.getByLabelText("Contraseña"), "wrong");
        await user.click(screen.getByRole("button", { name: "Ingresar" }));

        expect(addToastMock).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Error al iniciar sesión",
                description: "Credenciales inválidas",
            }),
        );
    });
});
