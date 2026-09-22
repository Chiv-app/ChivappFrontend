"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    Suspense,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AuthModal, { type AuthModalMode } from "@/components/auth/auth-modal";
import type { UserRole } from "@/types/api";

type OpenAuthOptions = {
    redirect?: string | null;
    oauthError?: string | null;
};

type OpenRegisterOptions = OpenAuthOptions & {
    defaultRole?: UserRole;
};

type AuthModalContextValue = {
    isOpen: boolean;
    mode: AuthModalMode;
    openLogin: (options?: OpenAuthOptions) => void;
    openRegister: (options?: OpenRegisterOptions) => void;
    close: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

function AuthModalUrlSync({
    setMode,
    setRedirect,
    setOauthError,
    setIsOpen,
}: {
    setMode: (m: AuthModalMode) => void;
    setRedirect: (r: string | null) => void;
    setOauthError: (e: string | null) => void;
    setIsOpen: (o: boolean) => void;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const authParam = searchParams.get("auth");
    const urlMode: AuthModalMode | null =
        authParam === "login" || authParam === "register" ? authParam : null;

    useEffect(() => {
        if (!urlMode) return;

        const nextRedirect = searchParams.get("redirect");
        const nextOauthError = searchParams.get("oauth_error");
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (cancelled) return;
            setMode(urlMode);
            setRedirect(nextRedirect);
            setOauthError(nextOauthError);
            setIsOpen(true);

            const next = new URLSearchParams(searchParams.toString());
            next.delete("auth");
            next.delete("redirect");
            next.delete("oauth_error");
            const qs = next.toString();
            router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
        });

        return () => {
            cancelled = true;
        };
    }, [urlMode, searchParams, pathname, router, setMode, setRedirect, setOauthError, setIsOpen]);

    return null;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<AuthModalMode>("login");
    const [redirect, setRedirect] = useState<string | null>(null);
    const [oauthError, setOauthError] = useState<string | null>(null);
    const [defaultRole, setDefaultRole] = useState<UserRole | undefined>(
        undefined,
    );

    const openLogin = useCallback((options?: OpenAuthOptions) => {
        setMode("login");
        setRedirect(options?.redirect ?? null);
        setOauthError(options?.oauthError ?? null);
        setDefaultRole(undefined);
        setIsOpen(true);
    }, []);

    const openRegister = useCallback((options?: OpenRegisterOptions) => {
        setMode("register");
        setRedirect(options?.redirect ?? null);
        setOauthError(null);
        setDefaultRole(options?.defaultRole);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setOauthError(null);
    }, []);

    function handleOpenChange(open: boolean) {
        if (!open) close();
        else setIsOpen(true);
    }

    function handleAuthenticated(destination: string) {
        close();
        router.replace(destination);
        router.refresh();
    }

    // Only use state for open UI so SSR/static HTML matches hydration.
    // URL deep-links open the modal in the effect above after mount.
    const value = useMemo(
        () => ({
            isOpen,
            mode,
            openLogin,
            openRegister,
            close,
        }),
        [isOpen, mode, openLogin, openRegister, close],
    );

    return (
        <AuthModalContext.Provider value={value}>
            {children}
            <Suspense fallback={null}>
                <AuthModalUrlSync
                    setMode={setMode}
                    setRedirect={setRedirect}
                    setOauthError={setOauthError}
                    setIsOpen={setIsOpen}
                />
            </Suspense>
            <AuthModal
                isOpen={isOpen}
                mode={mode}
                redirect={redirect}
                oauthError={oauthError}
                defaultRole={defaultRole}
                onOpenChange={handleOpenChange}
                onSwitchMode={setMode}
                onAuthenticated={handleAuthenticated}
            />
        </AuthModalContext.Provider>
    );
}

export function useAuthModal() {
    const context = useContext(AuthModalContext);
    if (!context) {
        throw new Error("useAuthModal must be used within AuthModalProvider");
    }
    return context;
}

/** URL que abre el modal de auth en la home (deep links / OAuth / guards). */
export function buildAuthModalUrl(
    mode: AuthModalMode,
    options?: OpenAuthOptions,
): string {
    const params = new URLSearchParams();
    params.set("auth", mode);
    if (options?.redirect) params.set("redirect", options.redirect);
    if (options?.oauthError) params.set("oauth_error", options.oauthError);
    return `/?${params.toString()}`;
}
