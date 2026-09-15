import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AppLogo from "@/components/layout/app-logo";
import ThemeToggle from "@/components/layout/theme-toggle";

export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12 bg-background overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-radial-brand -z-10" />

            <div className="absolute top-4 right-4 z-10">
                <ThemeToggle />
            </div>

            <Link
                href="/"
                aria-label="Chivapp"
                className="mb-8 hover:opacity-80 transition-opacity"
            >
                <AppLogo height={34} priority />
            </Link>
            <Suspense
                fallback={
                    <div className="w-full max-w-md h-96 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
                }
            >
                {children}
            </Suspense>
        </div>
    );
}
