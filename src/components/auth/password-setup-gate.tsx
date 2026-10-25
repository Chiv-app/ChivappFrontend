"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useIsClient } from "@/hooks/use-is-client";

const ALLOWED_PREFIXES = [
    "/set-password",
    "/reset-password",
    "/forgot-password",
    "/verify-email",
    "/invite/",
    "/pay/",
    "/complete-role",
    "/api/",
];

/**
 * Si el usuario autenticado no tiene contraseña, obliga a crearla
 * antes de seguir usando la app (p. ej. OAuth o integrante invitado).
 */
export default function PasswordSetupGate({
    children,
}: {
    children: React.ReactNode;
}) {
    const isClient = useIsClient();
    const { user, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isAllowed = ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix),
    );

    useEffect(() => {
        if (!isClient || isLoading || !user) return;
        if (user.has_password !== false) return;
        if (isAllowed) return;
        const pendingRedirect =
            typeof window !== "undefined"
                ? window.sessionStorage.getItem("post_password_setup_redirect")
                : null;
        if (pendingRedirect && typeof window !== "undefined") {
            window.sessionStorage.removeItem("post_password_setup_redirect");
        }
        const currentUrl =
            pendingRedirect ||
            (typeof window !== "undefined" && window.location.search
                ? `${pathname}${window.location.search}`
                : pathname);
        router.replace(
            "/set-password?callbackUrl=" + encodeURIComponent(currentUrl),
        );
    }, [isClient, isLoading, user, isAllowed, pathname, router]);

    // Keep children during SSR/hydration so auth cannot swap the tree early.
    if (
        isClient &&
        !isLoading &&
        user &&
        user.has_password === false &&
        !isAllowed
    ) {
        return (
            <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
                <div className="h-40 w-full max-w-md rounded-4xl border border-default-200 bg-content1 animate-pulse" />
            </div>
        );
    }

    return <>{children}</>;
}
