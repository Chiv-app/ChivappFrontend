"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownSection,
    DropdownTrigger,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import AppLogo from "@/components/layout/app-logo";
import { useAuth } from "@/contexts/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import NotificationsDropdown from "@/components/layout/notifications-dropdown";
import ThemeToggle from "@/components/layout/theme-toggle";
import UserAvatar from "@/components/layout/user-avatar";
import { useIsClient } from "@/hooks/use-is-client";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import {
    getNavItemsForRole,
    getRoleHomePath,
    isEnsembleMemberNavItem,
    isNavItemActive,
} from "@/lib/dashboard-nav";

const roleLabels = {
    contractor: "Contratista",
    musician: "Músico",
    admin: "Administrador",
} as const;

type ModuleEntry = {
    key: string;
    label: string;
    icon: string;
    href: string;
    locked: boolean;
    active: boolean;
};

function AuthNavSkeleton({ compact = false }: { compact?: boolean }) {
    return (
        <div
            className={`rounded-lg bg-default-200 animate-pulse ${
                compact ? "h-8 w-16" : "h-10 w-20 sm:w-28"
            }`}
            aria-hidden="true"
        />
    );
}

type Props = {
    revealOnScroll?: boolean;
};

export default function AppNavbar({ revealOnScroll = false }: Props) {
    const isClient = useIsClient();
    const { user, isLoading, logout } = useAuth();
    const { openLogin, openRegister } = useAuthModal();
    const router = useRouter();
    const pathname = usePathname();
    const [revealed, setRevealed] = useState(!revealOnScroll);

    useEffect(() => {
        if (!revealOnScroll) return;

        if (pathname === "/") {
            const introSection = document.getElementById("musicians");
            if (!introSection) return;

            const observer = new IntersectionObserver(
                ([entry]) => setRevealed(!entry.isIntersecting),
                { threshold: 0 },
            );
            observer.observe(introSection);
            return () => observer.disconnect();
        }

        function handleScroll() {
            setRevealed(window.scrollY > 24);
        }
        const raf = requestAnimationFrame(handleScroll);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [revealOnScroll, pathname]);

    const authReady = isClient && !isLoading;
    const musicianVerification = useProfileVerification(
        "musician",
        authReady && !!user && user.role === "musician",
        user?.is_verified ?? false,
    );
    const contractorVerification = useProfileVerification(
        "contractor",
        authReady && !!user && user.role === "contractor",
        user?.is_verified ?? false,
    );

    const isVerified =
        user?.role === "musician"
            ? musicianVerification.isVerified
            : user?.role === "contractor"
              ? contractorVerification.isVerified
              : true;

    const profilePath =
        user?.role === "musician"
            ? "/musician/profile"
            : user?.role === "contractor"
              ? "/contractor/profile"
              : null;

    const moduleEntries = useMemo((): ModuleEntry[] => {
        if (!user) return [];
        const isEnsembleOnly =
            user.role === "musician" &&
            Boolean(user.is_ensemble_member) &&
            !isVerified;

        return getNavItemsForRole(user.role)
            .filter((item) => {
                if (item.href.endsWith("/notifications")) return false;
                if (profilePath && item.href === profilePath) return false;
                if (isEnsembleOnly && !isEnsembleMemberNavItem(item.href)) {
                    return false;
                }
                return true;
            })
            .map((item) => {
                const ensembleUnlocked =
                    Boolean(user.is_ensemble_member) &&
                    isEnsembleMemberNavItem(item.href);
                return {
                    key: item.href,
                    label: item.label,
                    icon: item.icon,
                    href: item.href,
                    locked:
                        !!item.requiresVerification &&
                        !isVerified &&
                        !ensembleUnlocked,
                    active: isNavItemActive(pathname, item.href),
                };
            });
    }, [user, isVerified, pathname, profilePath]);

    async function handleLogout() {
        await logout();
        router.push("/");
        router.refresh();
    }

    const homePath = authReady && user ? getRoleHomePath(user.role) : "/";

    const isMusicianBrowseOrDetail =
        pathname.startsWith("/musicians") || pathname.startsWith("/musicos");
    const compact = revealOnScroll && !revealed && !isMusicianBrowseOrDetail;

    const isDashboardRoute =
        pathname.startsWith("/musician/") ||
        pathname === "/musician" ||
        pathname.startsWith("/contractor/") ||
        pathname === "/contractor" ||
        pathname.startsWith("/admin");

    return (
        <>
            <nav
                aria-label="Navegación principal"
                className={[
                    "fixed z-50 inset-x-3 sm:inset-x-6 top-3 sm:top-4 rounded-full bg-content1/85 backdrop-blur-xl shadow-[0_4px_30px_rgb(0,0,0,0.1)] border border-default-200/50",
                    "transition-all duration-300 ease-out",
                    compact ? "h-14" : "h-16",
                ].join(" ")}
            >
                <div
                    className={`h-full max-w-full mx-auto flex items-center justify-between gap-1.5 sm:gap-4 ${
                        compact ? "px-2.5 sm:px-4" : "px-2.5 sm:px-6"
                    }`}
                >
                    <div className="flex items-center gap-4 min-w-0">
                        <Link
                            href={homePath}
                            aria-label="Chivapp — Ir al inicio"
                            className="shrink-0 hover:opacity-80 transition-opacity"
                        >
                            <AppLogo height={compact ? 28 : 40} priority color="dynamic" />
                        </Link>

                        {!isDashboardRoute && (
                            <div className="hidden md:flex items-center gap-1">
                                <Link
                                    href="/musicians"
                                    className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
                                        pathname.startsWith("/musicians") ||
                                        pathname.startsWith("/musicos")
                                            ? "bg-primary/15 text-primary-text"
                                            : "text-default-600 hover:text-foreground hover:bg-default-100"
                                    }`}
                                >
                                    Explorar músicos
                                </Link>
                                <Link
                                    href="/#how-it-works"
                                    className="px-3.5 py-2 rounded-full text-sm font-semibold text-default-600 hover:text-foreground hover:bg-default-100 transition-colors"
                                >
                                    Cómo funciona
                                </Link>
                                <Link
                                    href="/#faq"
                                    className="px-3.5 py-2 rounded-full text-sm font-semibold text-default-600 hover:text-foreground hover:bg-default-100 transition-colors"
                                >
                                    Preguntas frecuentes
                                </Link>
                            </div>
                        )}
                    </div>

                    <div id="navbar-center-slot" className="hidden xl:flex flex-1 justify-center px-4" />

                    <div
                        className={`flex items-center min-w-0 ${
                            compact ? "gap-1 sm:gap-1.5" : "gap-1 sm:gap-3"
                        }`}
                    >
                        {!isDashboardRoute && (
                            <Link
                                href="/musicians"
                                className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-2 rounded-full text-xs font-semibold text-default-600 hover:text-foreground hover:bg-default-100 transition-colors touch-target"
                            >
                                <Icon icon="material-symbols:search" width={18} aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Músicos</span>
                            </Link>
                        )}
                        <ThemeToggle size={compact ? "sm" : "md"} />
                        {!authReady ? (
                            <AuthNavSkeleton compact={compact} />
                        ) : !user ? (
                            <>
                                <Button
                                    variant="light"
                                    radius="lg"
                                    size="sm"
                                    className="font-semibold text-xs sm:text-sm min-w-0 px-2 sm:px-3 min-h-11"
                                    onPress={() => openLogin()}
                                >
                                    <span className="sm:hidden">Entrar</span>
                                    <span className="hidden sm:inline">Iniciar sesión</span>
                                </Button>
                                <Button
                                    color="primary"
                                    radius="lg"
                                    size="sm"
                                    className="font-semibold text-xs sm:text-sm text-primary-foreground transition-shadow min-w-0 px-2.5 sm:px-4 min-h-11"
                                    onPress={() => openRegister()}
                                >
                                    <span className="sm:hidden">Registro</span>
                                    <span className="hidden sm:inline">Registrarse</span>
                                </Button>
                            </>
                        ) : (
                            <>
                                {(user.role === "musician" ||
                                    user.role === "contractor" ||
                                    user.role === "admin") && (
                                    <NotificationsDropdown role={user.role} />
                                )}

                                <Dropdown placement="bottom-end" offset={8}>
                                    <DropdownTrigger>
                                        <Button
                                            variant="flat"
                                            radius="full"
                                            className={`min-w-0 px-2 sm:px-3 font-semibold data-[hover=true]:bg-default-100 ${
                                                compact ? "h-10" : "h-11"
                                            }`}
                                            endContent={
                                                <Icon
                                                    icon="material-symbols:keyboard-arrow-down"
                                                    width={18}
                                                    height={18}
                                                    aria-hidden="true"
                                                    className={`text-default-500 ${
                                                        compact ? "hidden" : "hidden sm:block"
                                                    }`}
                                                />
                                            }
                                        >
                                            <span className="flex items-center gap-2.5 min-w-0">
                                                <UserAvatar user={user} size="sm" />
                                                <span
                                                    className={`flex-col items-start min-w-0 text-left leading-tight ${
                                                        compact ? "hidden" : "hidden sm:flex"
                                                    }`}
                                                >
                                                    <span className="truncate max-w-[9rem] text-sm text-foreground">
                                                        {user.fullname || user.email}
                                                    </span>
                                                    <span className="truncate max-w-[9rem] text-xs font-medium text-default-500">
                                                        {roleLabels[user.role]}
                                                    </span>
                                                </span>
                                            </span>
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu
                                        aria-label="Menú de usuario"
                                        className="w-[min(19rem,calc(100vw-1.5rem))]"
                                        itemClasses={{
                                            base: "rounded-xl gap-3 data-[hover=true]:bg-default-100",
                                            title: "text-sm font-medium",
                                            description: "text-xs text-default-500",
                                        }}
                                        onAction={(key) => {
                                            if (key === "logout") {
                                                void handleLogout();
                                                return;
                                            }
                                            if (key === "search-musicians") {
                                                router.push("/musicians");
                                                return;
                                            }
                                            if (
                                                typeof key === "string" &&
                                                key.startsWith("module:")
                                            ) {
                                                const href = key.replace("module:", "");
                                                const entry = moduleEntries.find(
                                                    (item) => item.href === href,
                                                );
                                                if (entry && !entry.locked) {
                                                    router.push(entry.href);
                                                }
                                                return;
                                            }
                                            if (key === "profile" && profilePath) {
                                                router.push(profilePath);
                                            }
                                        }}
                                    >
                                        <DropdownSection showDivider className="mb-0">
                                            <DropdownItem
                                                key="identity"
                                                isReadOnly
                                                className="h-auto py-3 cursor-default data-[hover=true]:bg-transparent"
                                                textValue={user.fullname ?? user.email}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        user={user}
                                                        size="md"
                                                        showBorder
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-foreground truncate">
                                                            {user.fullname || user.email}
                                                        </p>
                                                        <p className="text-xs text-default-500 truncate mt-0.5">
                                                            {user.email}
                                                        </p>
                                                        <span className="inline-flex mt-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
                                                            {roleLabels[user.role]}
                                                        </span>
                                                    </div>
                                                </div>
                                            </DropdownItem>
                                        </DropdownSection>

                                        {profilePath || user.role === "contractor" ? (
                                            <DropdownSection showDivider title="Cuenta">
                                                {user.role === "contractor" ? (
                                                    <DropdownItem
                                                        key="search-musicians"
                                                        startContent={
                                                            <span className="flex size-8 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                                                                <Icon
                                                                    icon="material-symbols:search"
                                                                    width={18}
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                        }
                                                        description="Explora el catálogo de artistas"
                                                    >
                                                        Buscar músicos
                                                    </DropdownItem>
                                                ) : null}
                                                {profilePath ? (
                                                    <DropdownItem
                                                        key="profile"
                                                        startContent={
                                                            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                                                                <Icon
                                                                    icon="material-symbols:person"
                                                                    width={18}
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                        }
                                                        description="Datos y verificación"
                                                    >
                                                        Mi perfil
                                                    </DropdownItem>
                                                ) : null}
                                            </DropdownSection>
                                        ) : null}

                                        <DropdownSection
                                            showDivider
                                            title="Navegación"
                                            classNames={{
                                                heading:
                                                    "text-xs font-semibold text-default-500 px-2",
                                            }}
                                        >
                                            {moduleEntries.map((entry) => (
                                                <DropdownItem
                                                    key={`module:${entry.href}`}
                                                    isDisabled={entry.locked}
                                                    className={
                                                        entry.active
                                                            ? "bg-primary/10 text-primary-text"
                                                            : undefined
                                                    }
                                                    startContent={
                                                        <span
                                                            className={`flex size-8 items-center justify-center rounded-lg ${
                                                                entry.active
                                                                    ? "bg-primary/20 text-primary-text"
                                                                    : "bg-default-100 text-default-600"
                                                            }`}
                                                        >
                                                            <Icon icon={entry.icon} width={18} aria-hidden="true" />
                                                        </span>
                                                    }
                                                    endContent={
                                                        entry.locked ? (
                                                            <Icon
                                                                icon="material-symbols:lock"
                                                                width={16}
                                                                aria-hidden="true"
                                                                className="text-default-400"
                                                            />
                                                        ) : entry.active ? (
                                                            <Icon
                                                                icon="material-symbols:check-circle"
                                                                width={16}
                                                                aria-hidden="true"
                                                                className="text-primary"
                                                            />
                                                        ) : (
                                                            <Icon
                                                                icon="material-symbols:chevron-right"
                                                                width={16}
                                                                aria-hidden="true"
                                                                className="text-default-300"
                                                            />
                                                        )
                                                    }
                                                    description={
                                                        entry.locked
                                                            ? "Completa tu verificación"
                                                            : undefined
                                                    }
                                                >
                                                    {entry.label}
                                                </DropdownItem>
                                            ))}
                                        </DropdownSection>

                                        <DropdownSection>
                                            <DropdownItem
                                                key="logout"
                                                className="text-danger-text data-[hover=true]:bg-danger/10 data-[hover=true]:text-danger-text"
                                                color="danger"
                                                startContent={
                                                    <span className="flex size-8 items-center justify-center rounded-lg bg-danger/10 text-danger-text">
                                                        <Icon
                                                            icon="material-symbols:logout"
                                                            width={18}
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                }
                                                description="Salir de tu cuenta"
                                            >
                                                Cerrar sesión
                                            </DropdownItem>
                                        </DropdownSection>
                                    </DropdownMenu>
                                </Dropdown>
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
}
