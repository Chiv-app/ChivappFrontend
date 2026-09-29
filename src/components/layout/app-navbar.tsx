"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
            aria-hidden
        />
    );
}

type Props = {
    /**
     * En páginas públicas el navbar arranca oculto y aparece al hacer scroll
     * (en el home, tras pasar toda la sección de músicos). En dashboards
     * siempre está visible.
     */
    revealOnScroll?: boolean;
};

export default function AppNavbar({ revealOnScroll = false }: Props) {
    const isClient = useIsClient();
    const { user, isLoading, logout } = useAuth();
    const { openLogin, openRegister } = useAuthModal();
    const router = useRouter();
    const pathname = usePathname();
    const [revealed, setRevealed] = useState(!revealOnScroll);
    const [hovering, setHovering] = useState(false);
    const hoverHideTimeout = useRef<number | null>(null);
    const navRef = useRef<HTMLElement | null>(null);
    const triggerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        return () => {
            if (hoverHideTimeout.current) {
                window.clearTimeout(hoverHideTimeout.current);
            }
        };
    }, []);

    function handleHoverEnter() {
        if (hoverHideTimeout.current) {
            window.clearTimeout(hoverHideTimeout.current);
            hoverHideTimeout.current = null;
        }
        setHovering(true);
    }

    function handleHoverLeave() {
        if (hoverHideTimeout.current) {
            window.clearTimeout(hoverHideTimeout.current);
        }
        // Pequeño delay para que no se oculte al pasar por el hueco entre la
        // franja de detección y la píldora del navbar.
        hoverHideTimeout.current = window.setTimeout(() => {
            setHovering(false);
        }, 200);
    }

    useEffect(() => {
        // Sin scroll-reveal (dashboards), `revealed` ya nace en `true`.
        if (!revealOnScroll) return;

        if (pathname === "/") {
            const introSection = document.getElementById("musicians");
            // Sin la sección (no debería pasar en el home real), no ocultamos
            // el navbar para siempre.
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
        // Defer el chequeo inicial a un callback en lugar de invocarlo
        // sincrónicamente en el cuerpo del efecto.
        const raf = requestAnimationFrame(handleScroll);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [revealOnScroll, pathname]);
    // Keep auth-dependent chrome identical on SSR and hydration.
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

    // Mientras auth hidrata, el logo apunta a "/" para coincidir con el HTML del servidor.
    const homePath =
        authReady && user ? getRoleHomePath(user.role) : "/";

    // La "píldora" flotante es el estilo del navbar en toda la app (públicas
    // y dashboards). Lo único que cambia con `revealOnScroll` es si arranca
    // oculto/chico: en el home arranca chico y "crece" al pasar la sección
    // de músicos; en el resto de páginas públicas arranca oculto y aparece
    // al hacer scroll; en los dashboards (sin revealOnScroll) siempre está
    // visible en su tamaño completo, como antes.
    const isHome = pathname === "/";
    const compact = revealOnScroll && isHome && !revealed;
    const hiddenUntilScroll = revealOnScroll && !isHome && !revealed;
    // Acercar el mouse al borde superior lo muestra igual que el scroll;
    // alejarlo lo vuelve a ocultar (solo aplica mientras está oculto).
    const effectivelyHidden = hiddenUntilScroll && !hovering;

    // Expone si el navbar ocupa espacio ahora mismo mediante una variable
    // CSS global: contenido flotante de otras vistas (ej. los filtros de
    // /musicians) puede leerla para "empujarse" hacia abajo cuando el
    // navbar reaparece, en vez de quedar tapado detrás (z-50).
    useEffect(() => {
        document.documentElement.style.setProperty(
            "--app-navbar-reveal-offset",
            effectivelyHidden ? "0px" : "var(--app-navbar-height)",
        );
    }, [effectivelyHidden]);

    // Equivalente táctil del hover: un tap en la franja/navbar lo muestra
    // (via onClick, más abajo) y un tap fuera de ambos lo vuelve a ocultar —
    // en mobile no hay mouseleave, así que esto es lo que lo cierra.
    useEffect(() => {
        if (!hiddenUntilScroll || !hovering) return;

        function handleOutsidePointer(event: PointerEvent) {
            const target = event.target as Node | null;
            if (navRef.current?.contains(target)) return;
            if (triggerRef.current?.contains(target)) return;
            if (hoverHideTimeout.current) {
                window.clearTimeout(hoverHideTimeout.current);
                hoverHideTimeout.current = null;
            }
            setHovering(false);
        }

        document.addEventListener("pointerdown", handleOutsidePointer);
        return () =>
            document.removeEventListener("pointerdown", handleOutsidePointer);
    }, [hiddenUntilScroll, hovering]);

    return (
        <>
            {hiddenUntilScroll ? (
                <div
                    ref={triggerRef}
                    aria-hidden
                    role="presentation"
                    className="fixed top-0 inset-x-0 h-4 sm:h-3 z-40"
                    onMouseEnter={handleHoverEnter}
                    onClick={handleHoverEnter}
                />
            ) : null}
            <nav
                ref={navRef}
                onMouseEnter={hiddenUntilScroll ? handleHoverEnter : undefined}
                onMouseLeave={hiddenUntilScroll ? handleHoverLeave : undefined}
                onClick={hiddenUntilScroll ? handleHoverEnter : undefined}
                className={[
                    "fixed z-50 inset-x-3 sm:inset-x-6 top-3 sm:top-4 rounded-full bg-content1/70 backdrop-blur-md shadow-soft border border-default-200/60",
                    "transition-all duration-300 ease-out",
                    compact ? "h-14" : "h-16",
                    effectivelyHidden
                        ? "-translate-y-full pointer-events-none"
                        : "translate-y-0",
                ].join(" ")}
            >
            <div
                className={`h-full max-w-full mx-auto flex items-center justify-between gap-2 sm:gap-4 ${
                    compact ? "px-3 sm:px-4" : "px-3 sm:px-6"
                }`}
            >
                <Link
                    href={homePath}
                    aria-label="Chivapp"
                    className="shrink-0 hover:opacity-80 transition-opacity"
                >
                    <AppLogo height={compact ? 22 : 28} priority color="dynamic" />
                </Link>

                <div
                    className={`flex items-center min-w-0 ${
                        compact ? "gap-1 sm:gap-1.5" : "gap-1.5 sm:gap-3"
                    }`}
                >
                    <ThemeToggle size={compact ? "sm" : "md"} />
                    {!authReady ? (
                        <AuthNavSkeleton compact={compact} />
                    ) : !user ? (
                        <>
                            <Button
                                variant="light"
                                radius="lg"
                                size="sm"
                                className="font-semibold text-sm min-w-0 px-2 sm:px-3"
                                onPress={() => openLogin()}
                            >
                                <span className="sm:hidden">Entrar</span>
                                <span className="hidden sm:inline">Iniciar sesión</span>
                            </Button>
                            <Button
                                color="primary"
                                radius="lg"
                                size="sm"
                                className="font-semibold text-sm transition-shadow min-w-0 px-2.5 sm:px-4"
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
                                            compact ? "h-9" : "h-11"
                                        }`}
                                        endContent={
                                            <Icon
                                                icon="material-symbols:keyboard-arrow-down"
                                                width={18}
                                                height={18}
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
                                                <span className="truncate max-w-[9rem] text-[11px] font-medium text-default-500">
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
                                                    <span className="inline-flex mt-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-secondary">
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
                                                            />
                                                        </span>
                                                    }
                                                    description="Explora el catálogo en el inicio"
                                                >
                                                    Buscar músicos
                                                </DropdownItem>
                                            ) : null}
                                            {profilePath ? (
                                                <DropdownItem
                                                    key="profile"
                                                    startContent={
                                                        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                            <Icon
                                                                icon="material-symbols:person"
                                                                width={18}
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
                                                "text-[11px] uppercase tracking-wide text-default-400 px-2",
                                        }}
                                    >
                                        {moduleEntries.map((entry) => (
                                            <DropdownItem
                                                key={`module:${entry.href}`}
                                                isDisabled={entry.locked}
                                                className={
                                                    entry.active
                                                        ? "bg-primary/10 text-primary"
                                                        : undefined
                                                }
                                                startContent={
                                                    <span
                                                        className={`flex size-8 items-center justify-center rounded-lg ${
                                                            entry.active
                                                                ? "bg-primary/20 text-primary"
                                                                : "bg-default-100 text-default-600"
                                                        }`}
                                                    >
                                                        <Icon icon={entry.icon} width={18} />
                                                    </span>
                                                }
                                                endContent={
                                                    entry.locked ? (
                                                        <Icon
                                                            icon="material-symbols:lock"
                                                            width={16}
                                                            className="text-default-400"
                                                        />
                                                    ) : entry.active ? (
                                                        <Icon
                                                            icon="material-symbols:check-circle"
                                                            width={16}
                                                            className="text-primary"
                                                        />
                                                    ) : (
                                                        <Icon
                                                            icon="material-symbols:chevron-right"
                                                            width={16}
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
                                            className="text-danger data-[hover=true]:bg-danger/10 data-[hover=true]:text-danger"
                                            color="danger"
                                            startContent={
                                                <span className="flex size-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
                                                    <Icon
                                                        icon="material-symbols:logout"
                                                        width={18}
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
