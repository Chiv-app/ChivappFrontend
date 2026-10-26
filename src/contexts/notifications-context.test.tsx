import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import {
    NotificationsProvider,
    useNotifications,
} from "@/contexts/notifications-context";

const { useAuthMock, listNotificationsPageMock } = vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    listNotificationsPageMock: vi.fn(),
}));

vi.mock("@/contexts/auth-context", () => ({
    useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/notifications", () => ({
    listNotificationsPage: (...args: unknown[]) =>
        listNotificationsPageMock(...args),
    markAllNotificationsRead: vi.fn(),
    markNotificationRead: vi.fn(),
}));

function Consumer() {
    const { unreadCount, notifications } = useNotifications();
    return (
        <div>
            <span data-testid="unread">{unreadCount}</span>
            <span data-testid="count">{notifications.length}</span>
        </div>
    );
}

describe("NotificationsProvider (FE4-03 expiredForUser)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("stops polling after 401 and resumes fetching when the same user logs in again with a fresh user reference", async () => {
        const firstSessionUser = {
            id: "u-1",
            email: "contractor@example.com",
            role: "contractor",
            is_verified: true,
        };
        useAuthMock.mockReturnValue({ user: firstSessionUser });

        // First call returns 401 (expired session cookie)
        listNotificationsPageMock.mockRejectedValueOnce(
            new ApiError("/notifications/me", 401, "Sesión expirada"),
        );

        const { rerender } = render(
            <NotificationsProvider>
                <Consumer />
            </NotificationsProvider>,
        );

        await waitFor(() => {
            expect(listNotificationsPageMock).toHaveBeenCalledTimes(1);
        });
        expect(screen.getByTestId("unread").textContent).toBe("0");

        // Re-render with the SAME user reference -> should NOT re-fetch because expiredForUser === user
        rerender(
            <NotificationsProvider>
                <Consumer />
            </NotificationsProvider>,
        );
        expect(listNotificationsPageMock).toHaveBeenCalledTimes(1);

        // User logs in again without page reload -> new user object reference with the same id
        const secondSessionUser = { ...firstSessionUser };
        useAuthMock.mockReturnValue({ user: secondSessionUser });
        listNotificationsPageMock.mockResolvedValueOnce({
            items: [
                {
                    id: "n-1",
                    type: "booking_accepted",
                    title: "Reserva aceptada",
                    message: "Tu reserva fue aceptada",
                    is_read: false,
                    created_at: new Date().toISOString(),
                },
            ],
            unreadCount: 3,
        });

        rerender(
            <NotificationsProvider>
                <Consumer />
            </NotificationsProvider>,
        );

        await waitFor(() => {
            expect(listNotificationsPageMock).toHaveBeenCalledTimes(2);
            expect(screen.getByTestId("unread").textContent).toBe("3");
            expect(screen.getByTestId("count").textContent).toBe("1");
        });
    });
});
