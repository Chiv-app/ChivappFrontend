"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import PasswordSetupGate from "@/components/auth/password-setup-gate";
import CookieConsentBanner from "@/components/legal/cookie-consent-banner";
import HelpWidget from "@/components/support/help-widget";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthModalProvider } from "@/contexts/auth-modal-context";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { setupIcons } from "@/lib/icon-setup";

setupIcons();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <HeroUIProvider>
                <ToastProvider />
                <AuthProvider>
                    <NotificationsProvider>
                        <CookieConsentBanner />
                        <HelpWidget />
                        <AuthModalProvider>
                            <PasswordSetupGate>{children}</PasswordSetupGate>
                        </AuthModalProvider>
                    </NotificationsProvider>
                </AuthProvider>
            </HeroUIProvider>
        </NextThemesProvider>
    );
}
