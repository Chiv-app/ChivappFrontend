"use client";

import { usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { useIsClient } from "@/hooks/use-is-client";

type Props = {
    musicianId: string;
    label?: string;
    size?: "sm" | "md" | "lg";
    radius?: "lg" | "full";
    className?: string;
    fullWidth?: boolean;
    showHelper?: boolean;
    onBook?: () => void;
};

export default function BookActionButton({
    musicianId,
    label = "Contratar",
    size = "lg",
    radius = "lg",
    className = "font-semibold",
    fullWidth = false,
    showHelper = false,
    onBook,
}: Props) {
    const isClient = useIsClient();
    const { user, isLoading } = useAuth();
    const { openLogin } = useAuthModal();
    const pathname = usePathname();

    // Usa la ruta actual (slug o UUID, la que sea que esté en la barra de
    // direcciones) en vez de reconstruirla desde el id, para no "saltar" a
    // la URL con UUID después de loguearse.
    const bookRedirect = `${pathname || `/musicians/${musicianId}`}?reservar=1`;
    const widthClass = fullWidth ? "w-full" : "";

    // Keep SSR and first client paint identical to avoid hydration mismatches.
    if (!isClient || isLoading) {
        return (
            <Button
                color="primary"
                radius={radius}
                size={size}
                isLoading
                className={`${className} ${widthClass}`}
            >
                {label}
            </Button>
        );
    }

    if (!user) {
        return (
            <div className={fullWidth ? "w-full" : "flex flex-col gap-2"}>
                <Button
                    color="primary"
                    radius={radius}
                    size={size}
                    className={`${className} ${widthClass}`}
                    onPress={onBook}
                    endContent={
                        <Icon icon="material-symbols:calendar-month" width={22} height={22} />
                    }
                >
                    {label}
                </Button>
                {showHelper && (
                    <p className="text-sm text-default-500 max-w-xs leading-snug">
                        Reserva en segundos sin necesidad de crear cuenta.
                    </p>
                )}
            </div>
        );
    }



    return (
        <Button
            color="primary"
            radius={radius}
            size={size}
            className={`${className} ${widthClass}`}
            onPress={onBook}
            endContent={
                <Icon icon="material-symbols:calendar-month" width={22} height={22} />
            }
        >
            {label}
        </Button>
    );
}
