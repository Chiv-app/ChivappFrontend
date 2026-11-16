"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Button,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownSection,
    DropdownTrigger,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import AppLogo from "@/components/layout/app-logo";
import { useAuth } from "@/contexts/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import NotificationsDropdown from "@/components/layout/notifications-dropdown";
import ThemeToggle from "@/components/layout/theme-toggle";
import UserAvatar from "@/components/layout/user-avatar";
import { MAX_PROFILES } from "@/components/musician/profile-switcher";
import { useIsClient } from "@/hooks/use-is-client";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import {
    getActiveProfileId,
    saveOnboardingReturnState,
    setActiveProfileId,
} from "@/lib/active-profile";
import { ApiError } from "@/lib/api";
import {
    getNavItemsForRole,
    getRoleHomePath,
    isEnsembleMemberNavItem,
    isNavItemActive,
} from "@/lib/dashboard-nav";
import { profileBadge } from "@/lib/profile-details";
import {
    PROFILE_VERIFICATION_INVALIDATED_EVENT,
    createAdditionalMusicianProfile,
    invalidateProfileVerificationCache,
    listMyMusicianProfiles,
} from "@/lib/profiles";
import { isScrollRevealRoute } from "@/lib/scroll-reveal-routes";
import type { MusicianProfileSummary } from "@/types/api";

const roleLabels = {
    contractor: "Contratista",
    musician: "Músico",
    admin: "Administrador",
} as const;

const PROFILE_STATUS_LABELS: Record<string, string> = {
    draft: "En borrador",
    pending_review: "En revisión",
    published: "Publicado",
    rejected: "Rechazado",
};

type ModuleEntry = {
    key: string;
    label: string;
    icon: string;
    href: string;
    locked: boolean;
    active: boolean;
};

function AuthNavSkeleton() {
    return (
        <div
            className="rounded-lg bg-default-200 animate-pulse h-10 w-20 sm:w-28"
            aria-hidden="true"
        />
    );
}

export default function AppNavbar() {
    const isClient = useIsClient();
    const { user, isLoading, logout } = useAuth();
    const { openLogin, openRegister } = useAuthModal();
    const router = useRouter();
    const pathname = usePathname();

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

    const [fetchedProfiles, setFetchedProfiles] = useState<MusicianProfileSummary[]>([]);
    const [addingProfile, setAddingProfile] = useState(false);
    const isMusicianReady = authReady && !!user && user.role === "musician";
    const musicianProfiles = useMemo(
        () => (isMusicianReady ? fetchedProfiles : []),
        [isMusicianReady, fetchedProfiles],
    );

    const loadMusicianProfiles = useCallback(async () => {
        if (!isMusicianReady) return;
        try {
            const list = await listMyMusicianProfiles();
            setFetchedProfiles(list);
        } catch {
            setFetchedProfiles([]);
        }
    }, [isMusicianReady]);

    useEffect(() => {
        if (!isMusicianReady) return;
        let cancelled = false;
        listMyMusicianProfiles()
            .then((list) => {
                if (!cancelled) setFetchedProfiles(list);
            })
            .catch(() => {
                if (!cancelled) setFetchedProfiles([]);
            });
        return () => {
            cancelled = true;
        };
    }, [isMusicianReady, pathname]);

    useEffect(() => {
        if (!authReady || user?.role !== "musician") return;
        const onInvalidated = () => {
            void loadMusicianProfiles();
        };
        window.addEventListener(PROFILE_VERIFICATION_INVALIDATED_EVENT, onInvalidated);
        return () => {
            window.removeEventListener(PROFILE_VERIFICATION_INVALIDATED_EVENT, onInvalidated);
        };
    }, [authReady, user?.role, loadMusicianProfiles]);

    const primaryMusicianProfile = musicianProfiles[0] ?? null;
    const storedProfileId = isClient ? getActiveProfileId() : null;
    const activeMusicianProfile =
        musicianProfiles.find((p) => p.id === storedProfileId) ?? primaryMusicianProfile;
    const canAddMusicianProfile =
        user?.role === "musician" &&
        musicianProfiles.length > 0 &&
        musicianProfiles.length < MAX_PROFILES &&
        primaryMusicianProfile?.status !== "draft";
    const showMusicianProfilesSection =
        user?.role === "musician" &&
        (musicianProfiles.length > 1 || canAddMusicianProfile);

    const navbarDisplayName =
        user?.role === "musician" && activeMusicianProfile?.stage_name?.trim()
            ? activeMusicianProfile.stage_name.trim()
            : user?.fullname || user?.email || "";
    const navbarSubtitle =
        user?.role === "musician" && activeMusicianProfile
            ? profileBadge(activeMusicianProfile.profile_type, activeMusicianProfile.group_size)
            : user
              ? roleLabels[user.role]
              : "";

    async function handleSwitchMusicianProfile(targetId: string) {
        const target = musicianProfiles.find((p) => p.id === targetId);
        if (!target) return;
        if (target.id === activeMusicianProfile?.id) {
            if (target.status === "draft") {
                saveOnboardingReturnState(primaryMusicianProfile?.id ?? null, pathname);
                router.push("/musician/onboarding");
            } else if (profilePath) {
                router.push(profilePath);
            }
            return;
        }
        if (target.status === "draft") {
            saveOnboardingReturnState(activeMusicianProfile?.id ?? null, pathname);
            setActiveProfileId(target.id);
            invalidateProfileVerificationCache("musician");
            router.push("/musician/onboarding");
            return;
        }
        setActiveProfileId(target.id);
        invalidateProfileVerificationCache("musician");
        window.location.reload();
    }

    async function handleAddMusicianProfile() {
        if (addingProfile || !canAddMusicianProfile) return;
        setAddingProfile(true);
        try {
            saveOnboardingReturnState(activeMusicianProfile?.id ?? null, pathname);
            const created = await createAdditionalMusicianProfile();
            setActiveProfileId(created.id);
            invalidateProfileVerificationCache("musician");
            await loadMusicianProfiles();
            router.push("/musician/onboarding");
        } catch (error) {
            const description =
                error instanceof ApiError && error.message
                    ? error.message
                    : "No pudimos crear el perfil. Inténtalo de nuevo.";
            addToast({
                title: "No se pudo agregar el perfil",
                description,
                color: "danger",
            });
        } finally {
            setAddingProfile(false);
        }
    }

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
    // En el perfil público la barra aparece al hacer scroll; en el resto del sitio está siempre visible.
    const revealOnScroll = isScrollRevealRoute(pathname);
    const isRevealed = useScrolledPast(80, revealOnScroll);
    const revealClassName = revealOnScroll
        ? `transition-[opacity,transform,visibility] duration-300 motion-reduce:transition-none ${
              isRevealed ? "" : "pointer-events-none invisible -translate-y-6 opacity-0"
          }`
        : "";

    return (
        <>
            <nav
                aria-label="Navegación principal"
                className={`fixed z-50 inset-x-3 sm:inset-x-6 top-3 sm:top-4 h-16 rounded-full bg-content1/85 backdrop-blur-xl shadow-[0_4px_30px_rgb(0,0,0,0.1)] border border-default-200/50 ${revealClassName}`}
            >
                <div className="h-full max-w-full mx-auto flex items-center justify-between gap-1.5 sm:gap-4 px-2.5 sm:px-6">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link
                            href={homePath}
                            aria-label="Chivapp — Ir al inicio"
                            className="shrink-0 hover:opacity-80 transition-opacity"
                        >
                            <AppLogo height={40} priority color="dynamic" />
                        </Link>
                    </div>

                    <div id="navbar-center-slot" className="hidden xl:flex flex-1 justify-center px-4" />

                    <div className="flex items-center min-w-0 gap-1 sm:gap-3">
                        <ThemeToggle size="md" />
                        {!authReady ? (
                            <AuthNavSkeleton />
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
                                            className="min-w-0 px-2 sm:px-3 font-semibold data-[hover=true]:bg-default-100 h-11"
                                            endContent={
                                                <Icon
                                                    icon="material-symbols:keyboard-arrow-down"
                                                    width={18}
                                                    height={18}
                                                    aria-hidden="true"
                                                    className="text-default-500 hidden sm:block"
                                                />
                                            }
                                        >
                                            <span className="flex items-center gap-2.5 min-w-0">
                                                <UserAvatar
                                                    user={user}
                                                    size="sm"
                                                    overrideImageUrl={
                                                        user.role === "musician" && activeMusicianProfile
                                                            ? activeMusicianProfile.profile_image_url
                                                            : undefined
                                                    }
                                                    overrideName={navbarDisplayName}
                                                />
                                                <span className="flex-col items-start min-w-0 text-left leading-tight hidden sm:flex">
                                                    <span className="truncate max-w-[9rem] text-sm text-foreground">
                                                        {navbarDisplayName}
                                                    </span>
                                                    <span className="truncate max-w-[9rem] text-xs font-medium text-default-500">
                                                        {navbarSubtitle}
                                                    </span>
                                                </span>
                                            </span>
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu
                                        aria-label="Menú de usuario"
                                        className="w-[min(20rem,calc(100vw-1.5rem))]"
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
                                            if (key === "add-profile") {
                                                void handleAddMusicianProfile();
                                                return;
                                            }
                                            if (
                                                typeof key === "string" &&
                                                key.startsWith("switch-profile:")
                                            ) {
                                                const profileId = key.replace("switch-profile:", "");
                                                void handleSwitchMusicianProfile(profileId);
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
                                                textValue={navbarDisplayName || (user.fullname ?? user.email)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        user={user}
                                                        size="md"
                                                        showBorder
                                                        overrideImageUrl={
                                                            user.role === "musician" && activeMusicianProfile
                                                                ? activeMusicianProfile.profile_image_url
                                                                : undefined
                                                        }
                                                        overrideName={navbarDisplayName}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-foreground truncate">
                                                            {navbarDisplayName}
                                                        </p>
                                                        <p className="text-xs text-default-500 truncate mt-0.5">
                                                            {user.email}
                                                        </p>
                                                        <span className="inline-flex mt-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
                                                            {navbarSubtitle}
                                                        </span>
                                                    </div>
                                                </div>
                                            </DropdownItem>
                                        </DropdownSection>

                                        {showMusicianProfilesSection ? (
                                            <DropdownSection
                                                showDivider
                                                title="Tus perfiles"
                                                classNames={{
                                                    heading:
                                                        "text-xs font-semibold text-default-500 px-2",
                                                }}
                                            >
                                                {[
                                                    ...musicianProfiles.map((profile) => {
                                                        const isActive =
                                                            profile.id === activeMusicianProfile?.id;
                                                        const pName =
                                                            profile.stage_name?.trim() ||
                                                            "Perfil en borrador";
                                                        const pDesc = `${profileBadge(
                                                            profile.profile_type,
                                                            profile.group_size,
                                                        )} · ${
                                                            PROFILE_STATUS_LABELS[profile.status] ??
                                                            profile.status
                                                        }${profile.is_primary ? " · Principal" : ""}`;
                                                        return (
                                                            <DropdownItem
                                                                key={`switch-profile:${profile.id}`}
                                                                textValue={pName}
                                                                className={
                                                                    isActive
                                                                        ? "bg-primary/10 text-primary-text"
                                                                        : undefined
                                                                }
                                                                startContent={
                                                                    <span
                                                                        className={`flex size-8 items-center justify-center rounded-lg ${
                                                                            isActive
                                                                                ? "bg-primary/20 text-primary-text"
                                                                                : "bg-default-100 text-default-600"
                                                                        }`}
                                                                    >
                                                                        <Icon
                                                                            icon={
                                                                                profile.profile_type ===
                                                                                "group"
                                                                                    ? "mdi:account-group-outline"
                                                                                    : "mdi:account-music-outline"
                                                                            }
                                                                            width={18}
                                                                            aria-hidden="true"
                                                                        />
                                                                    </span>
                                                                }
                                                                endContent={
                                                                    isActive ? (
                                                                        <Icon
                                                                            icon="material-symbols:check-circle"
                                                                            width={16}
                                                                            aria-hidden="true"
                                                                            className="text-primary"
                                                                        />
                                                                    ) : (
                                                                        <Icon
                                                                            icon="material-symbols:swap-horiz"
                                                                            width={16}
                                                                            aria-hidden="true"
                                                                            className="text-default-400"
                                                                        />
                                                                    )
                                                                }
                                                                description={pDesc}
                                                            >
                                                                {pName}
                                                            </DropdownItem>
                                                        );
                                                    }),
                                                    <DropdownItem
                                                        key="add-profile"
                                                        isDisabled={!canAddMusicianProfile || addingProfile}
                                                        textValue="Agregar otro perfil"
                                                        className="text-primary-text"
                                                        startContent={
                                                            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                                                                <Icon
                                                                    icon="material-symbols:add"
                                                                    width={18}
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                        }
                                                        description={
                                                            musicianProfiles.length >= MAX_PROFILES
                                                                ? `Máximo ${MAX_PROFILES} perfiles por cuenta`
                                                                : "Un solista o tu grupo, sin repetir DNI"
                                                        }
                                                    >
                                                        {addingProfile
                                                            ? "Creando perfil…"
                                                            : "Agregar otro perfil"}
                                                    </DropdownItem>,
                                                ]}
                                            </DropdownSection>
                                        ) : null}

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
