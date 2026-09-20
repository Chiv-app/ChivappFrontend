"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import AppNavbar from "@/components/layout/app-navbar";
import EmailVerificationBanner from "@/components/auth/email-verification-banner";
import { useAuth } from "@/contexts/auth-context";
import { buildAuthModalUrl } from "@/contexts/auth-modal-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import {
    isEnsembleMemberAllowedPath,
    isVerifiedOnlyPath,
    type DashboardNavItem,
} from "@/lib/dashboard-nav";
import { getPostLoginPath } from "@/lib/profiles";
import type { UserRole } from "@/types/api";

type Role = Extract<UserRole, "musician" | "contractor">;

type Props = {
    role: Role;
    profilePath: string;
    navItems: DashboardNavItem[];
    children: React.ReactNode;
};

function AuthGateSkeleton() {
    return (
        <div className="min-h-[100dvh] bg-background">
            <div className="h-[var(--app-navbar-height)] border-b border-default-200 bg-content1 animate-pulse" />
            <div className="p-4 lg:p-8">
                <div className="max-w-4xl mx-auto h-64 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
            </div>
        </div>
    );
}

export default function RoleDashboardShell({
    role,
    profilePath,
    navItems,
    children,
}: Props) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { isVerified, isLoading: isCheckingVerification, status } =
        useProfileVerification(role, !!user && user.role === role, user?.is_verified ?? false);

    const ensembleBypass =
        role === "musician" &&
        Boolean(user?.is_ensemble_member) &&
        isEnsembleMemberAllowedPath(pathname);

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.replace(
                buildAuthModalUrl("login", { redirect: pathname }),
            );
            return;
        }
        if (user.role !== role) {
            router.replace(getPostLoginPath(user.role, user.is_verified));
        }
    }, [user, isLoading, router, pathname, role]);

    useEffect(() => {
        if (isLoading || isCheckingVerification || !user) return;
        if (user.role !== role) return;

        if (role === "musician" && status?.status === "draft" && pathname !== "/musician/onboarding") {
            router.replace("/musician/onboarding");
            return;
        }

        if (!isVerified && !ensembleBypass && isVerifiedOnlyPath(pathname, navItems)) {
            router.replace(profilePath);
        }
    }, [
        isLoading,
        isCheckingVerification,
        isVerified,
        ensembleBypass,
        pathname,
        profilePath,
        navItems,
        router,
        role,
        user,
        status,
    ]);

    if (isLoading || isCheckingVerification || !user || user.role !== role) {
        return <AuthGateSkeleton />;
    }

    return (
        <div className="min-h-[100dvh] bg-background">
            <AppNavbar />

            <div className="pt-[var(--app-navbar-height)]">
                <EmailVerificationBanner className="px-4 lg:px-8 pt-3" />
                {!isVerified && (pathname !== profilePath || status?.status === "pending_review") ? (
                    <div className="flex flex-col gap-3 px-4 lg:px-8 pt-4">
                        {!isVerified && pathname !== profilePath && !ensembleBypass ? (
                            <div className="rounded-4xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-default-700 shadow-soft">
                                Completa tu verificación para habilitar todos los módulos de gestión.
                            </div>
                        ) : null}

                        {!isVerified && ensembleBypass ? (
                            <div className="rounded-4xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-default-700 shadow-soft">
                                Acceso como integrante: puedes ver tus reservas y gestionar
                                tus ingresos asignados por el líder.
                            </div>
                        ) : null}

                        {!isVerified && status?.status === "pending_review" ? (
                            <div className="rounded-4xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-default-700 shadow-soft">
                                Tu perfil está en revisión. Te avisaremos cuando sea aprobado.
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <main className="p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
