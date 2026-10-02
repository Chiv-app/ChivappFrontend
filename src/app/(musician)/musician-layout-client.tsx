"use client";

import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { MUSICIAN_NAV } from "@/lib/dashboard-nav";
import MusicianOnboardingOverlay from '@/components/layout/musician-onboarding-overlay';

export default function MusicianLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RoleDashboardShell
            role="musician"
            profilePath="/musician/profile"
            navItems={MUSICIAN_NAV}
        >
            {children}
            <MusicianOnboardingOverlay />
        </RoleDashboardShell>
    );
}
