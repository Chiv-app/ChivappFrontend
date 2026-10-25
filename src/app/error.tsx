"use client";

import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div
            role="alert"
            className="min-h-[60dvh] w-full max-w-lg mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-4"
        >
            <div className="size-14 rounded-2xl bg-danger/10 text-danger-text flex items-center justify-center">
                <Icon icon="lucide:alert-circle" width={28} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
                No pudimos cargar esta página
            </h1>
            <p className="text-sm text-default-500">
                Ocurrió un inconveniente temporal. Revisa tu conexión e inténtalo nuevamente.
                {error.digest ? ` (Ref: ${error.digest})` : ""}
            </p>
            <Button
                color="primary"
                onPress={reset}
                className="font-semibold text-primary-foreground"
            >
                Reintentar
            </Button>
        </div>
    );
}
