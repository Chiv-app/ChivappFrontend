import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { BookingOut } from "@/types/api";
import BookingMercadoPagoModal from "./booking-mercadopago-modal";

const {
    checkStatusMock,
    processPaymentMock,
    createPreferenceMock,
    createYapeTokenMock,
    renderPaymentBrickMock,
    addToastMock,
} = vi.hoisted(() => ({
    checkStatusMock: vi.fn(),
    processPaymentMock: vi.fn(),
    createPreferenceMock: vi.fn(),
    createYapeTokenMock: vi.fn(),
    renderPaymentBrickMock: vi.fn(),
    addToastMock: vi.fn(),
}));

vi.mock("@/contexts/auth-context", () => ({
    useAuth: () => ({
        user: {
            id: "u-contractor",
            email: "payer@example.com",
            role: "contractor",
            is_verified: true,
        },
    }),
}));

vi.mock("@/hooks/use-mercadopago", () => ({
    useMercadoPago: () => ({
        isLoaded: true,
        loadError: null,
        createYapeToken: (...args: unknown[]) => createYapeTokenMock(...args),
        renderPaymentBrick: (...args: unknown[]) =>
            renderPaymentBrickMock(...args),
        getDeviceSessionId: () => "dev-session-123",
    }),
}));

vi.mock("@/lib/payments", () => ({
    checkMercadoPagoPaymentStatus: (...args: unknown[]) =>
        checkStatusMock(...args),
    processMercadoPagoPayment: (...args: unknown[]) =>
        processPaymentMock(...args),
    createMercadoPagoPreference: (...args: unknown[]) =>
        createPreferenceMock(...args),
}));

vi.mock("@heroui/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@heroui/react")>();
    return { ...actual, addToast: addToastMock };
});

const sampleBooking = {
    id: "booking-123",
    event_type: "Boda",
    status: "contract_pending",
} as unknown as BookingOut;

describe("BookingMercadoPagoModal (FE5-01, FE5-02, FE6-03, FE6-04, FE6-05)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        checkStatusMock.mockResolvedValue({
            status: "not_started",
            payment_id: null,
            booking_status: "contract_pending",
            is_approved: false,
            message: "Aún no se ha iniciado ningún intento de pago.",
        });
        renderPaymentBrickMock.mockImplementation(
            async (opts: { onReady?: () => void }) => {
                opts?.onReady?.();
                return { unmount: vi.fn() };
            },
        );
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("(1) transitions to pending panel on process->pending and preserves it across close/reopen without remounting", async () => {
        createYapeTokenMock.mockResolvedValueOnce("yape-tok-1");
        processPaymentMock.mockResolvedValueOnce({
            success: false,
            status: "in_process",
            payment_id: "mp-pay-999",
            message: "Tu pago está en revisión por Mercado Pago.",
        });

        const onClose = vi.fn();
        const onSuccess = vi.fn();
        const user = userEvent.setup();

        const { rerender } = render(
            <BookingMercadoPagoModal
                isOpen={true}
                onClose={onClose}
                booking={sampleBooking}
                amount={450}
                onSuccess={onSuccess}
            />,
        );

        await user.type(
            await screen.findByLabelText(/Celular registrado en Yape/i),
            "987654321",
        );
        await user.type(
            screen.getByLabelText(/Código de aprobación/i),
            "123456",
        );
        await user.click(screen.getByRole("button", { name: /Yapear S\//i }));

        expect(
            await screen.findByText(/Pago en proceso de verificación/i),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /Yapear S\//i }),
        ).not.toBeInTheDocument();

        // Close and reopen without unmounting
        rerender(
            <BookingMercadoPagoModal
                isOpen={false}
                onClose={onClose}
                booking={sampleBooking}
                amount={450}
                onSuccess={onSuccess}
            />,
        );
        rerender(
            <BookingMercadoPagoModal
                isOpen={true}
                onClose={onClose}
                booking={sampleBooking}
                amount={450}
                onSuccess={onSuccess}
            />,
        );

        expect(
            await screen.findByText(/Pago en proceso de verificación/i),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /Yapear S\//i }),
        ).not.toBeInTheDocument();
    });

    it("(2) check-status pending without payment_id does NOT show pending panel, whereas with payment_id it DOES", async () => {
        checkStatusMock.mockResolvedValueOnce({
            status: "pending",
            payment_id: null,
            booking_status: "contract_pending",
            is_approved: false,
            message: "El pago aún no se ha acreditado.",
        });

        const { unmount } = render(
            <BookingMercadoPagoModal
                isOpen={true}
                onClose={vi.fn()}
                booking={sampleBooking}
                amount={450}
                onSuccess={vi.fn()}
            />,
        );

        await waitFor(() => {
            expect(checkStatusMock).toHaveBeenCalledWith("booking-123");
        });
        expect(
            screen.queryByText(/Pago en proceso de verificación/i),
        ).not.toBeInTheDocument();
        unmount();

        // Now with payment_id present
        checkStatusMock.mockResolvedValueOnce({
            status: "pending",
            payment_id: "mp-pay-777",
            booking_status: "contract_pending",
            is_approved: false,
            message: "Pago en revisión en Mercado Pago.",
        });

        render(
            <BookingMercadoPagoModal
                isOpen={true}
                onClose={vi.fn()}
                booking={sampleBooking}
                amount={450}
                onSuccess={vi.fn()}
            />,
        );

        expect(
            await screen.findByText(/Pago en proceso de verificación/i),
        ).toBeInTheDocument();
    });

    it("(3) pending -> rejected with Card tab active preserves the rejection reason and remounts the Brick (FE6-03)", async () => {
        let brickSubmitHandler:
            | ((data: { formData: Record<string, unknown> }) => Promise<void>)
            | null = null;
        renderPaymentBrickMock.mockImplementation(
            async (opts: {
                onReady?: () => void;
                onSubmit: (data: {
                    formData: Record<string, unknown>;
                }) => Promise<void>;
            }) => {
                brickSubmitHandler = opts.onSubmit;
                opts.onReady?.();
                return { unmount: vi.fn() };
            },
        );

        const user = userEvent.setup();
        render(
            <BookingMercadoPagoModal
                isOpen={true}
                onClose={vi.fn()}
                booking={sampleBooking}
                amount={450}
                onSuccess={vi.fn()}
            />,
        );

        // Switch to Card tab
        const cardTab = await screen.findByRole("tab", { name: /Tarjeta/i });
        await user.click(cardTab);

        await waitFor(() => {
            expect(renderPaymentBrickMock).toHaveBeenCalledTimes(1);
        });

        // Submit card payment -> returns pending
        processPaymentMock.mockResolvedValueOnce({
            success: false,
            status: "in_process",
            payment_id: "mp-card-pending-1",
            message: "Pago con tarjeta en revisión.",
        });

        await act(async () => {
            await brickSubmitHandler?.({
                formData: {
                    token: "card-tok-1",
                    payment_method_id: "visa",
                    installments: 1,
                },
            });
        });

        expect(
            await screen.findByText(/Pago en proceso de verificación/i),
        ).toBeInTheDocument();

        // Click manual check status -> returns rejected with specific message
        checkStatusMock.mockResolvedValueOnce({
            status: "rejected",
            payment_id: "mp-card-pending-1",
            booking_status: "contract_pending",
            is_approved: false,
            message: "La entidad emisora rechazó el pago con tarjeta.",
        });

        const verifyBtn = screen.getByRole("button", {
            name: /Verificar estado del pago/i,
        });
        await user.click(verifyBtn);

        // Both the rejection message AND a second Brick mount must happen
        expect(
            await screen.findByText(
                /La entidad emisora rechazó el pago con tarjeta\./i,
            ),
        ).toBeInTheDocument();
        await waitFor(() => {
            expect(renderPaymentBrickMock).toHaveBeenCalledTimes(2);
        });
    });

    it("(4) transitions to pendingVerification when process returns 409 'pago en proceso' instead of needsReload (FE6-05)", async () => {
        createYapeTokenMock.mockResolvedValueOnce("yape-tok-409");
        processPaymentMock.mockRejectedValueOnce(
            new ApiError(
                "/payments/mercadopago/process",
                409,
                "Ya hay un pago en proceso para esta reserva. Espera la confirmación antes de intentar de nuevo.",
            ),
        );
        checkStatusMock
            .mockResolvedValueOnce({
                status: "not_started",
                payment_id: null,
                booking_status: "contract_pending",
                is_approved: false,
                message: "Sin iniciar",
            })
            .mockResolvedValueOnce({
                status: "pending",
                payment_id: "mp-existing-pending",
                booking_status: "contract_pending",
                is_approved: false,
                message: "Pago en verificación activo.",
            });

        const user = userEvent.setup();
        render(
            <BookingMercadoPagoModal
                isOpen={true}
                onClose={vi.fn()}
                booking={sampleBooking}
                amount={450}
                onSuccess={vi.fn()}
            />,
        );

        await user.type(
            await screen.findByLabelText(/Celular registrado en Yape/i),
            "987654321",
        );
        await user.type(
            screen.getByLabelText(/Código de aprobación/i),
            "123456",
        );
        await user.click(screen.getByRole("button", { name: /Yapear S\//i }));

        expect(
            await screen.findByText(/Pago en proceso de verificación/i),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /Recargar página/i }),
        ).not.toBeInTheDocument();
    });

    it("(5) continues polling when modal is closed while payment is pending and calls onSuccess on approval (FE6-04)", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });

        checkStatusMock
            .mockResolvedValueOnce({
                status: "pending",
                payment_id: "mp-poll-closed-1",
                booking_status: "contract_pending",
                is_approved: false,
                message: "En revisión",
            })
            .mockResolvedValueOnce({
                status: "approved",
                payment_id: "mp-poll-closed-1",
                booking_status: "payment_retained",
                is_approved: true,
                message: "Aprobado",
            });

        const onSuccess = vi.fn();
        const onClose = vi.fn();

        const { rerender } = render(
            <BookingMercadoPagoModal
                isOpen={true}
                onClose={onClose}
                booking={sampleBooking}
                amount={450}
                onSuccess={onSuccess}
            />,
        );

        expect(
            await screen.findByText(/Pago en proceso de verificación/i),
        ).toBeInTheDocument();

        // Close modal while pendingVerification is active
        rerender(
            <BookingMercadoPagoModal
                isOpen={false}
                onClose={onClose}
                booking={sampleBooking}
                amount={450}
                onSuccess={onSuccess}
            />,
        );

        // Advance interval timer by 4.5s while modal is closed
        await act(async () => {
            await vi.advanceTimersByTimeAsync(4500);
        });

        expect(onSuccess).toHaveBeenCalledTimes(1);
    });
});
