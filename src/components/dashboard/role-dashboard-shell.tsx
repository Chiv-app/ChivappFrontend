"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import AppNavbar from "@/components/layout/app-navbar";
import EmailVerificationBanner from "@/components/auth/email-verification-banner";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useAuth } from "@/contexts/auth-context";
import { buildAuthModalUrl } from "@/contexts/auth-modal-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import {
    isEnsembleMemberAllowedPath,
    isEnsembleMemberNavItem,
    isVerifiedOnlyPath,
    isEmailVerifiedOnlyPath,
    isNavItemActive,
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
        <div className="min-h-[100dvh] bg-background" aria-busy="true">
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
    const { user, isLoading, authError, refresh } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const {
        isVerified,
        isLoading: isCheckingVerification,
        status,
    } = useProfileVerification(
        role,
        !!user && user.role === role,
        user?.is_verified ?? false,
    );

    const ensembleBypass =
        role === "musician" &&
        Boolean(user?.is_ensemble_member) &&
        isEnsembleMemberAllowedPath(pathname);

    useEffect(() => {
        if (isLoading || authError) return;
        if (!user) {
            router.replace(buildAuthModalUrl("login", { redirect: pathname }));
            return;
        }
        if (user.role !== role) {
            router.replace(getPostLoginPath(user.role, user.is_verified));
        }
    }, [user, isLoading, authError, router, pathname, role]);

    useEffect(() => {
        if (isLoading || isCheckingVerification || !user) return;
        if (user.role !== role) return;

        const isEnsembleOnlyUser =
            status?.is_ensemble_only || user?.is_ensemble_member;
        if (
            role === "musician" &&
            status?.status === "draft" &&
            !isEnsembleOnlyUser &&
            pathname !== "/musician/onboarding" &&
            !pathname.startsWith("/musician/profile")
        ) {
            router.replace("/musician/onboarding");
            return;
        }

        if (
            user.is_email_verified === false &&
            isEmailVerifiedOnlyPath(pathname, navItems)
        ) {
            router.replace(profilePath);
            return;
        }

        if (
            !isVerified &&
            !ensembleBypass &&
            isVerifiedOnlyPath(pathname, navItems)
        ) {
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

    const visibleNavItems = useMemo(() => {
        if (!user) return [];
        const isEnsembleOnly =
            role === "musician" &&
            Boolean(user.is_ensemble_member) &&
            !isVerified;
        return navItems
            .filter((item) => {
                if (isEnsembleOnly && !isEnsembleMemberNavItem(item.href)) {
                    return false;
                }
                return true;
            })
            .map((item) => {
                const ensembleUnlocked =
                    Boolean(user.is_ensemble_member) &&
                    isEnsembleMemberNavItem(item.href);
                const emailLocked =
                    user.is_email_verified === false &&
                    Boolean(item.requiresEmailVerification);
                const verifyLocked =
                    Boolean(item.requiresVerification) &&
                    !isVerified &&
                    !ensembleUnlocked;
                return {
                    ...item,
                    locked: emailLocked || verifyLocked,
                    active: isNavItemActive(pathname, item.href),
                };
            });
    }, [user, role, isVerified, navItems, pathname]);

    if (!isLoading && !user && authError) {
        return (
            <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
                <div
                    role="alert"
                    className="max-w-md w-full rounded-3xl border border-danger/30 bg-content1 p-6 text-center shadow-soft flex flex-col items-center gap-3"
                >
                    <Icon icon="lucide:wifi-off" className="text-danger" width={32} />
                    <h2 className="text-base font-bold text-foreground">
                        No pudimos verificar tu sesión
                    </h2>
                    <p className="text-sm text-default-600">
                        Ocurrió un problema temporal al conectar con el servidor. Tu sesión no se ha cerrado.
                    </p>
                    <button
                        type="button"
                        onClick={() => void refresh()}
                        className="mt-1 inline-flex items-center justify-center min-h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading || isCheckingVerification || !user || user.role !== role) {
        return <AuthGateSkeleton />;
    }

    const isOnboarding = pathname === "/musician/onboarding";
    const musicianPrimaryHrefs = [
        "/musician",
        "/musician/bookings",
        "/musician/earnings",
        "/musician/notifications",
    ];
    const hasOverflow = role === "musician" && visibleNavItems.length > 5;
    const mobileBottomItems = hasOverflow
        ? visibleNavItems.filter((item) =>
              musicianPrimaryHrefs.includes(item.href),
          )
        : visibleNavItems.slice(0, 5);
    const mobileOverflowItems = hasOverflow
        ? visibleNavItems.filter(
              (item) => !musicianPrimaryHrefs.includes(item.href),
          )
        : visibleNavItems.slice(5);
    const isOverflowActive = mobileOverflowItems.some((item) => item.active);
    const showMobileBottomNav =
        !isOnboarding &&
        !pathname.startsWith("/musician/profile") &&
        mobileBottomItems.length > 0;

    return (
        <div
            className="min-h-[100dvh] bg-background"
            style={
                {
                    "--bottom-nav-h": showMobileBottomNav ? "4.25rem" : "0px",
                } as React.CSSProperties
            }
        >
            <AppNavbar />

            <div className="pt-[var(--app-navbar-height)] pb-20 lg:pb-8">
                <EmailVerificationBanner className="px-4 lg:px-8 pt-3" />

                {user.is_email_verified === false &&
                pathname !== profilePath &&
                isEmailVerifiedOnlyPath(pathname, navItems) ? (
                    <div className="flex flex-col gap-3 px-4 lg:px-8 pt-4">
                        <div
                            role="alert"
                            className="rounded-4xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-default-700 shadow-soft"
                        >
                            Verifica tu correo electrónico para acceder a este módulo.
                        </div>
                    </div>
                ) : null}

                {!isVerified &&
                (pathname !== profilePath ||
                    status?.status === "pending_review") ? (
                    <div className="flex flex-col gap-3 px-4 lg:px-8 pt-4">
                        {!isVerified &&
                        pathname !== profilePath &&
                        !ensembleBypass ? (
                            <div
                                role="status"
                                className="rounded-4xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-default-700 shadow-soft"
                            >
                                Completa tu verificación para habilitar todos los módulos de gestión.
                            </div>
                        ) : null}

                        {!isVerified && ensembleBypass ? (
                            <div
                                role="status"
                                className="rounded-4xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-default-700 shadow-soft"
                            >
                                Acceso como integrante: puedes ver tus reservas y gestionar tus cobros asignados por el líder.
                            </div>
                        ) : null}

                        {!isVerified && status?.status === "pending_review" ? (
                            <div
                                role="status"
                                className="rounded-4xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-default-700 shadow-soft"
                            >
                                Tu perfil está en revisión. Te avisaremos cuando sea aprobado.
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <main className="p-4 lg:p-8">{children}</main>
            </div>

            {showMobileBottomNav && (
                <>
                    <nav
                        aria-label="Navegación rápida del panel"
                        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-content1/95 backdrop-blur-xl border-t border-default-200/80 px-2 py-1.5 shadow-[0_-4px_20px_rgb(0,0,0,0.06)]"
                    >
                        <ul className="grid grid-cols-5 gap-1 max-w-md mx-auto">
                            {mobileBottomItems.map((item) => (
                                <li key={item.href} className="min-w-0">
                                    {item.locked ? (
                                        <span
                                            aria-disabled="true"
                                            className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl text-default-400 cursor-not-allowed min-h-11"
                                        >
                                            <Icon
                                                icon={item.icon}
                                                width={20}
                                                aria-hidden="true"
                                            />
                                            <span className="text-xs font-medium truncate max-w-full">
                                                {item.label}
                                            </span>
                                        </span>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            aria-current={
                                                item.active ? "page" : undefined
                                            }
                                            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition-colors min-h-11 ${
                                                item.active
                                                    ? "text-primary-text font-semibold bg-primary/10"
                                                    : "text-default-600 hover:text-foreground"
                                            }`}
                                        >
                                            <Icon
                                                icon={item.icon}
                                                width={20}
                                                aria-hidden="true"
                                            />
                                            <span className="text-xs truncate max-w-full">
                                                {item.label}
                                            </span>
                                        </Link>
                                    )}
                                </li>
                            ))}
                            {mobileOverflowItems.length > 0 && (
                                <li className="min-w-0">
                                    <button
                                        type="button"
                                        aria-expanded={isMoreOpen}
                                        aria-label="Más secciones del panel"
                                        onClick={() => setIsMoreOpen(true)}
                                        className={`w-full flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition-colors min-h-11 ${
                                            isOverflowActive
                                                ? "text-primary-text font-semibold bg-primary/10"
                                                : "text-default-600 hover:text-foreground"
                                        }`}
                                    >
                                        <Icon
                                            icon="material-symbols:more-horiz"
                                            width={20}
                                            aria-hidden="true"
                                        />
                                        <span className="text-xs truncate max-w-full">
                                            Más
                                        </span>
                                    </button>
                                </li>
                            )}
                        </ul>
                    </nav>

                    <Modal
                        closeButton={<ModalCloseButton aria-label="Cerrar" />}
                        isOpen={isMoreOpen}
                        onOpenChange={setIsMoreOpen}
                        placement="bottom"
                        size="md"
                    >
                        <ModalContent>
                            <ModalHeader className="text-base font-bold">
                                Más secciones del panel
                            </ModalHeader>
                            <ModalBody className="pb-6">
                                <nav
                                    aria-label="Secciones adicionales del panel"
                                    className="flex flex-col gap-1"
                                >
                                    {mobileOverflowItems.map((item) =>
                                        item.locked ? (
                                            <span
                                                key={item.href}
                                                aria-disabled="true"
                                                className="flex items-center justify-between gap-2.5 rounded-2xl px-3 py-3 text-sm font-medium text-default-400 cursor-not-allowed select-none min-h-11"
                                            >
                                                <span className="flex items-center gap-2.5 truncate">
                                                    <Icon
                                                        icon={item.icon}
                                                        width={20}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="truncate">
                                                        {item.label}
                                                    </span>
                                                </span>
                                                <Icon
                                                    icon="material-symbols:lock"
                                                    width={16}
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        ) : (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() =>
                                                    setIsMoreOpen(false)
                                                }
                                                aria-current={
                                                    item.active
                                                        ? "page"
                                                        : undefined
                                                }
                                                className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-sm font-medium transition-colors min-h-11 ${
                                                    item.active
                                                        ? "bg-primary text-primary-foreground font-semibold"
                                                        : "text-default-700 hover:bg-default-100 hover:text-foreground"
                                                }`}
                                            >
                                                <Icon
                                                    icon={item.icon}
                                                    width={20}
                                                    aria-hidden="true"
                                                />
                                                <span className="truncate">
                                                    {item.label}
                                                </span>
                                            </Link>
                                        ),
                                    )}
                                </nav>
                            </ModalBody>
                        </ModalContent>
                    </Modal>
                </>
            )}
        </div>
    );
}
