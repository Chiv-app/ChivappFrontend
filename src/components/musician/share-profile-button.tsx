"use client";

import { Button, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";

type Props = {
    musicianId: string;
    slug: string | null;
    name: string;
    variant?: "overlay" | "flat" | "floating";
};

function absoluteProfileUrl(idOrSlug: string): string {
    const path = `/musicians/${idOrSlug}`;
    if (typeof window !== "undefined") {
        return `${window.location.origin}${path}`;
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    return siteUrl ? `${siteUrl}${path}` : path;
}

export default function ShareProfileButton({
    musicianId,
    slug,
    name,
    variant = "overlay",
}: Props) {
    async function handleShare() {
        const url = absoluteProfileUrl(slug || musicianId);

        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: `${name} · Chivapp`,
                    text: `Mira el perfil de ${name} en Chivapp`,
                    url,
                });
                return;
            } catch {
                // El usuario canceló el share sheet o no está soportado; copiamos igual.
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            addToast({ title: "Enlace del perfil copiado", color: "success" });
        } catch {
            addToast({
                title: "No se pudo copiar el enlace",
                description: url,
                color: "warning",
            });
        }
    }

    if (variant === "flat") {
        return (
            <Button
                variant="flat"
                radius="full"
                size="sm"
                className="font-semibold"
                onPress={handleShare}
                startContent={<Icon icon="material-symbols:share" width={16} />}
            >
                Compartir perfil
            </Button>
        );
    }

    if (variant === "floating") {
        // Mismo aspecto y tamaño que el botón de ayuda, para que se apilen sin chocar.
        return (
            <Button
                isIconOnly
                radius="full"
                aria-label="Compartir perfil"
                className="size-12 min-w-12 border border-default-200/70 bg-content1/90 text-default-600 shadow-elevated backdrop-blur-md transition-colors hover:border-primary/40 hover:text-primary-text"
                onPress={handleShare}
            >
                <Icon icon="material-symbols:share" width={22} />
            </Button>
        );
    }

    return (
        <Button
            isIconOnly
            radius="full"
            aria-label="Compartir perfil"
            className="border border-white/40 bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors"
            onPress={handleShare}
        >
            <Icon icon="material-symbols:share" width={20} />
        </Button>
    );
}
