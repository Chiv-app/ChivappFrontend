"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import MusicianDashboardOverview from "@/components/dashboard/musician-dashboard-overview";
import { needsMusicianAction } from "@/components/dashboard/musician-bookings-view";
import { useNotifications } from "@/contexts/notifications-context";
import { useAuth } from "@/contexts/auth-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import { listBookings } from "@/lib/bookings";
import { getMusicianEarnings } from "@/lib/payments";
import { isBookingNotification } from "@/lib/notification-routes";

export default function MusicianDashboardPage() {
    const { user } = useAuth();
    const { isVerified } = useProfileVerification(
        "musician",
        !!user,
        user?.is_verified ?? false,
    );
    const { notifications, unreadCount } = useNotifications();
    const [pendingBookings, setPendingBookings] = useState(0);
    const [releasedEarnings, setReleasedEarnings] = useState(0);
    const [retainedEarnings, setRetainedEarnings] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);

    const bookingNotifications = notifications.filter((notification) =>
        isBookingNotification(notification.type),
    );

    const isEnsemble = Boolean(user?.is_ensemble_member);
    const hasAccess = isVerified || isEnsemble;

    const loadDashboard = useCallback(async () => {
        if (!hasAccess) return;
        setLoadError(null);
        const errors: string[] = [];

        await Promise.all([
            listBookings()
                .then((bookings) => {
                    setPendingBookings(
                        bookings.filter((booking) => needsMusicianAction(booking)).length,
                    );
                })
                .catch((err) => {
                    errors.push(
                        err instanceof Error
                            ? err.message
                            : "No se pudieron cargar las reservas.",
                    );
                }),
            getMusicianEarnings()
                .then((summary) => {
                    setReleasedEarnings(summary.total_released);
                    setRetainedEarnings(summary.total_retained);
                })
                .catch((err) => {
                    errors.push(
                        err instanceof Error
                            ? err.message
                            : "No se pudieron cargar los ingresos.",
                    );
                }),
        ]);

        if (errors.length > 0) {
            setLoadError(errors[0]);
        }
    }, [hasAccess]);

    useEffect(() => {
        void Promise.resolve().then(() => loadDashboard());
    }, [loadDashboard]);

    return (
        <div className="flex flex-col gap-4">
            {loadError ? (
                <div className="max-w-6xl mx-auto w-full rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar indicadores del panel
                        </p>
                        <p className="text-xs text-default-600">{loadError}</p>
                    </div>
                    <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() => void loadDashboard()}
                    >
                        Reintentar
                    </Button>
                </div>
            ) : null}
            <MusicianDashboardOverview
                isVerified={hasAccess}
                isEnsembleMember={isEnsemble}
                pendingBookings={pendingBookings}
                unreadNotifications={unreadCount}
                bookingNotifications={bookingNotifications}
                releasedEarnings={releasedEarnings}
                retainedEarnings={retainedEarnings}
            />
        </div>
    );
}
