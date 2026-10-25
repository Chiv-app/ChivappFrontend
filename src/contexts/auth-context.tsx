"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { AUTH_UNAUTHORIZED_EVENT, ApiError, apiFetch } from "@/lib/api";
import {
    getCurrentUser,
    loginUser,
    loginOtp,
    logoutUser,
    registerUser,
} from "@/lib/auth";
import { useIsClient } from "@/hooks/use-is-client";
import type { LoginRequest, RegisterRequest, UserOut } from "@/types/api";

type AuthContextValue = {
    user: UserOut | null;
    isLoading: boolean;
    authError: boolean;
    login: (credentials: LoginRequest) => Promise<UserOut>;
    loginWithOtp: (email: string, otp: string) => Promise<UserOut>;
    register: (data: RegisterRequest) => Promise<UserOut>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const isClient = useIsClient();
    const [user, setUser] = useState<UserOut | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const current = await apiFetch<UserOut>("/auth/me");
            setUser(current);
            setAuthError(false);
        } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                setUser(null);
                setAuthError(false);
            } else {
                setAuthError(true);
            }
        }
    }, []);

    useEffect(() => {
        if (!isClient) return;

        let cancelled = false;

        getCurrentUser()
            .then((current) => {
                if (!cancelled) {
                    setUser(current);
                    setAuthError(false);
                }
            })
            .catch(() => {
                // Transient network or 5xx error: do not overwrite an existing session or redirect to login.
                if (!cancelled) {
                    setAuthError(true);
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isClient]);

    useEffect(() => {
        if (!isClient) return;

        function handleUnauthorized() {
            setUser(null);
            setAuthError(false);
        }

        window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
        return () => {
            window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
        };
    }, [isClient]);

    const loginWithOtp = useCallback(async (email: string, otp: string) => {
        const loggedIn = await loginOtp(email, otp);
        setUser(loggedIn);
        setAuthError(false);
        return loggedIn;
    }, []);

    const login = useCallback(async (credentials: LoginRequest) => {
        const loggedIn = await loginUser(credentials);
        setUser(loggedIn);
        setAuthError(false);
        setIsLoading(false);
        return loggedIn;
    }, []);

    const register = useCallback(async (data: RegisterRequest) => {
        const registered = await registerUser(data);
        setUser(registered);
        setAuthError(false);
        setIsLoading(false);
        return registered;
    }, []);

    const logout = useCallback(async () => {
        await logoutUser();
        setUser(null);
        setAuthError(false);
    }, []);

    const value = useMemo(
        () => ({
            // SSR + hydration always see "pending session" so AppNavbar HTML matches.
            user: isClient ? user : null,
            isLoading: !isClient || isLoading,
            authError: isClient ? authError : false,
            login,
            loginWithOtp,
            register,
            logout,
            refresh,
        }),
        [user, isLoading, authError, isClient, login, loginWithOtp, register, logout, refresh],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
