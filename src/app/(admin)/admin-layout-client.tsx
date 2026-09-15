"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.replace(buildAuthModalUrl("login", { redirect: "/admin" }));
            return;
        }
        if (user.role !== "admin") {
            router.replace(getPostLoginPath(user.role, user.is_verified));
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || user.role !== "admin") {
        return (
            <div className="min-h-[100dvh] bg-background">
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
            <main className="pt-[var(--app-navbar-height)]">
                <div className="p-4 lg:p-8">
                    <AdminShell>{children}</AdminShell>
                </div>
            </main>
        </div>
    );
}
