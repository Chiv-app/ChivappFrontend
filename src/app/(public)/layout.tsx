"use client";

import { usePathname } from "next/navigation";
import AppNavbar from "@/components/layout/app-navbar";
import EmailVerificationBanner from "@/components/auth/email-verification-banner";
import Footer from "@/components/layout/footer";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    // El home y las vistas de músicos (listado y perfil) tienen su propio
    // hero/barra flotante a pantalla completa (sin navbar visible al
    // inicio): el navbar arranca oculto y solo aparece con scroll u hover
    // cerca del borde superior, igual que en el perfil del músico.
    const isFullBleed = pathname === "/" || pathname.startsWith("/musicians");

    return (
        <>
            <AppNavbar revealOnScroll />
            <div
                className={
                    isFullBleed
                        ? "min-h-[100dvh]"
                        : "pt-[var(--app-navbar-height)] min-h-[calc(100dvh-var(--app-navbar-height))]"
                }
            >
                <EmailVerificationBanner
                    className={`px-4 sm:px-6 md:px-8 max-w-content mx-auto ${
                        isFullBleed ? "pt-[calc(var(--app-navbar-height)+0.75rem)]" : "pt-3"
                    }`}
                />
                {children}
            </div>
            <Footer />
        </>
    );
}
