"use client";

import { useEffect, useState } from "react";
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

    useEffect(() => {
        // !isVerified is no longer a blocker for fetching stats

        listBookings()
            .then((bookings) => {
                setActiveBookings(
                    bookings.filter((booking) => booking.status !== "cancelled").length,
                );
            })
            .catch(() => setActiveBookings(0));

        getContractorOperations()
            .then((summary) => {
                setPendingOperations(
                    summary.pending_me_count + summary.pending_other_count,
                );
                setNetOut(summary.net_out);
                setRetainedExpenses(summary.total_retained);
            })
            .catch(() => {
                setPendingOperations(0);
                setNetOut(0);
                setRetainedExpenses(0);
            });
    }, []);

    return (
        <ContractorDashboardOverview
            isVerified={isVerified}
            activeBookings={activeBookings}
            unreadNotifications={unreadCount}
            pendingOperations={pendingOperations}
            netOut={netOut}
            retainedExpenses={retainedExpenses}
        />
    );
}
