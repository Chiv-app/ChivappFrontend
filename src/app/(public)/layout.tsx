"use client";

import { usePathname } from "next/navigation";
import AppNavbar from "@/components/layout/app-navbar";
import EmailVerificationBanner from "@/components/auth/email-verification-banner";
import Footer from "@/components/layout/footer";
import { isScrollRevealRoute } from "@/lib/scroll-reveal-routes";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    // Solo el home (que tiene su propio hero con pt-28/pt-36) y el detalle de perfil
    // público de músico (/musicians/[id], donde el navbar aparece al hacer scroll)
    // arrancan desde el borde superior sin padding de navbar.
    const isFullBleed = pathname === "/" || isScrollRevealRoute(pathname);

    return (
        <>
            <AppNavbar />
            <div
                className={
                    isFullBleed
                        ? "min-h-[100dvh]"
                        : "pt-[var(--app-navbar-height)] min-h-[calc(100dvh-var(--app-navbar-height))]"
                }
            >
                <EmailVerificationBanner
                    className={`px-3 sm:px-6 max-w-content mx-auto ${
                        isFullBleed ? "pt-[calc(var(--app-navbar-height)+0.75rem)]" : "pt-3"
                    }`}
                />
                {children}
            </div>
            <Footer />
        </>
    );
}
