"use client";

import { useEffect, useState } from "react";
import MusicianDashboardOverview from "@/components/dashboard/musician-dashboard-overview";
import { useNotifications } from "@/contexts/notifications-context";
import { useAuth } from "@/contexts/auth-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import { listBookings } from "@/lib/bookings";
import { getMusicianEarnings } from "@/lib/payments";
import { isBookingNotification } from "@/lib/notification-routes";
import type { BookingStatus } from "@/types/api";

const ACTION_STATUSES: BookingStatus[] = [
    "requested",
    "payment_pending",
    "change_pending",
    "balance_review",
];

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

    const bookingNotifications = notifications.filter((notification) =>
        isBookingNotification(notification.type),
    );

    const isEnsemble = Boolean(user?.is_ensemble_member);
    const hasAccess = isVerified || isEnsemble;

    useEffect(() => {
        if (!hasAccess) return;

        listBookings()
            .then((bookings) => {
                setPendingBookings(
                    bookings.filter((booking) =>
                        ACTION_STATUSES.includes(booking.status),
                    ).length,
                );
            })
            .catch(() => setPendingBookings(0));

        getMusicianEarnings()
            .then((summary) => {
                setReleasedEarnings(summary.total_released);
                setRetainedEarnings(summary.total_retained);
            })
            .catch(() => {
                setReleasedEarnings(0);
                setRetainedEarnings(0);
            });
    }, [hasAccess]);

    return (
        <MusicianDashboardOverview
            isVerified={hasAccess}
            isEnsembleMember={isEnsemble}
            pendingBookings={pendingBookings}
            unreadNotifications={unreadCount}
            bookingNotifications={bookingNotifications}
            releasedEarnings={releasedEarnings}
            retainedEarnings={retainedEarnings}
        />
    );
}
