"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { consumeMagicLink } from "@/lib/auth";

function MagicLinkContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const redirectHint = searchParams.get("redirect") || "/";
    const { refresh } = useAuth();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleConfirm() {
        if (!token) return;
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await consumeMagicLink(token);
            await refresh().catch(() => undefined);
            const target =
                res.redirect_to && res.redirect_to.startsWith("/") && !res.redirect_to.startsWith("//")
                    ? res.redirect_to
                    : redirectHint.startsWith("/") && !redirectHint.startsWith("//")
                      ? redirectHint
                      : "/";
            router.replace(target);
        } catch (error) {
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : "El enlace mágico ha expirado o ya fue utilizado.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-md border border-default-200/70 shadow-soft">
            <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-0">
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:login" className="text-2xl text-primary" />
                    <h1 className="text-xl font-semibold">Confirmar acceso</h1>
                </div>
            </CardHeader>
            <CardBody className="px-6 pb-6 pt-4 flex flex-col gap-4">
                {!token ? (
                    <p className="text-sm text-danger">
                        El enlace de acceso es inválido o está incompleto.
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-default-600">
                            Haz clic en el botón de abajo para iniciar sesión de forma segura y continuar a tu panel.
                        </p>
                        {errorMessage ? (
                            <p className="text-sm text-danger">{errorMessage}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-3">
                            <Button
                                color="primary"
                                radius="lg"
                                isLoading={loading}
                                onPress={handleConfirm}
                            >
                                Continuar e iniciar sesión
                            </Button>
                            <Button
                                variant="light"
                                radius="lg"
                                onPress={() => router.replace("/")}
                            >
                                Volver al inicio
                            </Button>
                        </div>
                    </>
                )}
            </CardBody>
        </Card>
    );
}

export default function MagicLinkPage() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
            <Suspense fallback={<p className="text-default-500">Cargando…</p>}>
                <MagicLinkContent />
            </Suspense>
        </div>
    );
}
