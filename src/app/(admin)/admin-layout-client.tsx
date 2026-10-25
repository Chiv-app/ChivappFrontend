"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminShell from "@/components/admin/admin-shell";
import AppNavbar from "@/components/layout/app-navbar";
import { useAuth } from "@/contexts/auth-context";
import { buildAuthModalUrl } from "@/contexts/auth-modal-context";
import { getPostLoginPath } from "@/lib/profiles";

export default function AdminLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, authError, refresh } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading || authError) return;
        if (!user) {
            router.replace(buildAuthModalUrl("login", { redirect: pathname || "/admin" }));
            return;
        }
        if (user.role !== "admin") {
            router.replace(getPostLoginPath(user.role, user.is_verified));
        }
    }, [user, isLoading, authError, router, pathname]);

    if (!isLoading && !user && authError) {
        return (
            <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
                <div
                    role="alert"
                    className="max-w-md w-full rounded-3xl border border-danger/30 bg-content1 p-6 text-center shadow-soft flex flex-col items-center gap-3"
                >
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

    if (isLoading || !user || user.role !== "admin") {
        return (
            <div className="min-h-[100dvh] bg-background" aria-busy="true">
                <div className="h-[var(--app-navbar-height)] border-b border-default-200 bg-content1 animate-pulse" />
                <div className="p-4 lg:p-8">
                    <div className="max-w-4xl mx-auto h-64 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-background">
            <AppNavbar />
            <div className="pt-[var(--app-navbar-height)]">
                <div className="p-4 lg:p-8">
                    <AdminShell>{children}</AdminShell>
                </div>
            </div>
        </div>
    );
}
