"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    getCurrentUser,
    loginUser, loginOtp,
    logoutUser,
    registerUser,
} from "@/lib/auth";
import { useIsClient } from "@/hooks/use-is-client";
import type { LoginRequest, RegisterRequest, UserOut } from "@/types/api";

type AuthContextValue = {
    user: UserOut | null;
    isLoading: boolean;
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

    const refresh = useCallback(async () => {
        const current = await getCurrentUser();
        setUser(current);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        let cancelled = false;

        getCurrentUser()
            .then((current) => {
                if (!cancelled) setUser(current);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isClient]);

    
    const loginWithOtp = useCallback(async (email: string, otp: string) => {
        const loggedIn = await loginOtp(email, otp);
        setUser(loggedIn);
        return loggedIn;
    }, []);

    const login = useCallback(async (credentials: LoginRequest) => {
        const loggedIn = await loginUser(credentials);
        setUser(loggedIn);
        setIsLoading(false);
        return loggedIn;
    }, []);

    const register = useCallback(async (data: RegisterRequest) => {
        const registered = await registerUser(data);
        setUser(registered);
        setIsLoading(false);
        return registered;
    }, []);

    const logout = useCallback(async () => {
        await logoutUser();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            // SSR + hydration always see "pending session" so AppNavbar HTML matches.
            user: isClient ? user : null,
            isLoading: !isClient || isLoading,
            login,
            loginWithOtp,
            register,
            logout,
            refresh,
        }),
        [user, isLoading, isClient, login, loginWithOtp, register, logout, refresh],
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
