"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Chip, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ApiError } from "@/lib/api";
import {
    getOAuthAccounts,
    unlinkOAuthAccount,
    type OAuthAccountsOut,
} from "@/lib/auth";

const PROVIDER_META = {
    google: { label: "Google", icon: "logos:google-icon" },
} as const;

const OAUTH_LINK_ERROR_MESSAGES: Record<string, string> = {
    account_already_linked:
        "Esta cuenta de Google ya está vinculada a otro usuario.",
    session_required:
        "Tu sesión expiró antes de completar la vinculación. Inicia sesión e inténtalo de nuevo.",
    access_denied: "Cancelaste la vinculación en Google.",
    invalid_state:
        "La solicitud de vinculación expiró. Vuelve a intentarlo desde tu perfil.",
    google_not_configured:
        "La vinculación con Google no está disponible en este momento.",
    oauth_failed:
        "No se pudo vincular tu cuenta de Google. Inténtalo nuevamente.",
};

function oauthStartUrl(provider: "google" | "facebook") {
    const base = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    return `${base}/auth/oauth/${provider}/start?intent=link`;
}

export default function ConnectedAccountsCard() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [data, setData] = useState<OAuthAccountsOut | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setData(await getOAuthAccounts());
        } catch (error) {
            addToast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "No se pudieron cargar las cuentas conectadas.",
                color: "danger",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => refresh());
    }, [refresh]);

    useEffect(() => {
        const linkedProvider = searchParams.get("linked");
        const oauthError = searchParams.get("oauth_error");
        if (!linkedProvider && !oauthError) return;

        if (linkedProvider) {
            const label =
                linkedProvider === "google"
                    ? PROVIDER_META.google.label
                    : linkedProvider;
            addToast({
                title: "Cuenta vinculada",
                description: `${label} se conectó correctamente a tu cuenta.`,
                color: "success",
            });
            void Promise.resolve().then(() => refresh());
        } else if (oauthError) {
            addToast({
                title: "No se pudo vincular la cuenta",
                description:
                    OAUTH_LINK_ERROR_MESSAGES[oauthError] ||
                    "Ocurrió un problema al conectar tu cuenta social.",
                color: "danger",
            });
        }

        const next = new URLSearchParams(searchParams.toString());
        next.delete("linked");
        next.delete("oauth_error");
        const qs = next.toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }, [searchParams, pathname, router, refresh]);

    async function handleUnlink(provider: "google") {
        setBusy(provider);
        try {
            await unlinkOAuthAccount(provider);
            addToast({
                title: "Cuenta desvinculada",
                description: `${PROVIDER_META[provider].label} ya no está conectada.`,
                color: "success",
            });
            await refresh();
        } catch (error) {
            addToast({
                title: "No se pudo desvincular",
                description:
                    error instanceof ApiError
                        ? error.message
                        : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setBusy(null);
        }
    }

    return (
        <Card className="border border-default-200/70 shadow-soft">
            <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
                <h2 className="text-lg font-bold text-foreground">Cuentas conectadas</h2>
                <p className="text-sm text-default-500">
                    Vincula Google para iniciar sesión más rápido.
                </p>
            </CardHeader>
            <CardBody className="gap-3 px-6 pb-6">
                {loading || !data ? (
                    <div className="h-20 rounded-2xl bg-default-100 animate-pulse" />
                ) : (
                    (["google"] as const).map((provider) => {
                        const meta = PROVIDER_META[provider];
                        const account = data.accounts.find((item) => item.provider === provider);
                        const linked = Boolean(account?.linked);

                        return (
                            <div
                                key={provider}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-default-200 px-4 py-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Icon icon={meta.icon} width={22} />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground">{meta.label}</p>
                                        <p className="text-xs text-default-500 truncate">
                                            {linked
                                                ? account?.email || "Cuenta vinculada"
                                                : "No vinculada"}
                                        </p>
                                    </div>
                                </div>
                                {linked ? (
                                    <div className="flex items-center gap-2">
                                        <Chip size="sm" color="success" variant="flat">
                                            Conectada
                                        </Chip>
                                        <Button
                                            size="sm"
                                            variant="light"
                                            color="danger"
                                            isLoading={busy === provider}
                                            onPress={() => void handleUnlink(provider)}
                                        >
                                            Desvincular
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        as="a"
                                        href={oauthStartUrl(provider)}
                                        size="sm"
                                        color="primary"
                                        variant="flat"
                                        radius="lg"
                                    >
                                        Vincular
                                    </Button>
                                )}
                            </div>
                        );
                    })
                )}
            </CardBody>
        </Card>
    );
}
