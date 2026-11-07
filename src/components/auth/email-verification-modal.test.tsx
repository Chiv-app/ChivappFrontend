import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import EmailVerificationModal from "./email-verification-modal";

const { sendMock, confirmMock } = vi.hoisted(() => ({
    sendMock: vi.fn(),
    confirmMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    sendEmailVerificationCode: (...args: unknown[]) => sendMock(...args),
    confirmEmailVerificationCode: (...args: unknown[]) => confirmMock(...args),
}));

describe("EmailVerificationModal", () => {
    beforeEach(() => {
        sendMock.mockReset();
        confirmMock.mockReset();
    });

    it("envía el código solo cuando la persona lo pide y verifica con el código recibido", async () => {
        sendMock.mockResolvedValue({ message: "ok", email_verified: false });
        confirmMock.mockResolvedValue({ message: "ok", email_verified: true });
        const onVerified = vi.fn();
        const user = userEvent.setup();

        render(
            <EmailVerificationModal
                isOpen
                email="cliente@example.com"
                onClose={vi.fn()}
                onVerified={onVerified}
            />,
        );

        // Al abrir no se envía nada por sí solo.
        expect(sendMock).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Enviar código" }));
        await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));

        const input = await screen.findByLabelText(/Código de verificación/i);
        await user.type(input, "123456");
        await user.click(screen.getByRole("button", { name: "Verificar" }));

        await waitFor(() => expect(confirmMock).toHaveBeenCalledWith("123456"));
        await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    });

    it("muestra el error del servidor cuando el código es incorrecto y no continúa", async () => {
        sendMock.mockResolvedValue({ message: "ok", email_verified: false });
        confirmMock.mockRejectedValue(new ApiError("/auth/email-verification/confirm", 401, "Código inválido o expirado"));
        const onVerified = vi.fn();
        const user = userEvent.setup();

        render(
            <EmailVerificationModal
                isOpen
                email="cliente@example.com"
                onClose={vi.fn()}
                onVerified={onVerified}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Enviar código" }));
        const input = await screen.findByLabelText(/Código de verificación/i);
        await user.type(input, "000000");
        await user.click(screen.getByRole("button", { name: "Verificar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/^Código inválido o expirado$/);
        expect(onVerified).not.toHaveBeenCalled();
    });
});
