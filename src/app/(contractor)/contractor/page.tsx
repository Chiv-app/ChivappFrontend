"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import ContractorDashboardOverview from "@/components/dashboard/contractor-dashboard-overview";
import { useNotifications } from "@/contexts/notifications-context";
import { useAuth } from "@/contexts/auth-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import { listBookings } from "@/lib/bookings";
import { getContractorOperations } from "@/lib/payments";

export default function ContractorDashboardPage() {
    const { user } = useAuth();
    const { isVerified } = useProfileVerification(
        "contractor",
        !!user,
        user?.is_verified ?? false,
    );
    const { unreadCount } = useNotifications();
    const [activeBookings, setActiveBookings] = useState(0);
    const [pendingOperations, setPendingOperations] = useState(0);
    const [netOut, setNetOut] = useState(0);
    const [retainedExpenses, setRetainedExpenses] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadDashboard = useCallback(async () => {
        setLoadError(null);
        const errors: string[] = [];

        await Promise.all([
            listBookings()
                .then((bookings) => {
                    setActiveBookings(
                        bookings.filter((booking) => booking.status !== "cancelled").length,
                    );
                })
                .catch((err) => {
                    errors.push(
                        err instanceof Error
                            ? err.message
                            : "No se pudieron cargar las reservas.",
                    );
                }),
            getContractorOperations()
                .then((summary) => {
                    setPendingOperations(
                        summary.pending_me_count + summary.pending_other_count,
                    );
                    setNetOut(summary.net_out);
                    setRetainedExpenses(summary.total_retained);
                })
                .catch((err) => {
                    errors.push(
                        err instanceof Error
                            ? err.message
                            : "No se pudieron cargar las operaciones.",
                    );
                }),
        ]);

        if (errors.length > 0) {
            setLoadError(errors[0]);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadDashboard();
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
            <ContractorDashboardOverview
                isVerified={isVerified}
                activeBookings={activeBookings}
                unreadNotifications={unreadCount}
                pendingOperations={pendingOperations}
                netOut={netOut}
                retainedExpenses={retainedExpenses}
            />
        </div>
    );
}
