"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { useIsClient } from "@/hooks/use-is-client";

export default function StartBookingButton() {
    const isClient = useIsClient();
    const { user, isLoading } = useAuth();
    const { openLogin } = useAuthModal();

    // Keep SSR and first client paint identical to avoid hydration mismatches
    // when auth resolves in the parent before this subtree hydrates.
    if (!isClient || isLoading) {
        return (
            <Button
                variant="flat"
                radius="full"
                isLoading
                className="w-full sm:w-auto max-w-sm bg-content1 text-foreground font-semibold"
            >
                Comenzar reserva
            </Button>
        );
    }

    if (!user) {
        return (
            <Button
                as={Link}
                href="/musicians"
                variant="flat"
                radius="full"
                className="w-full sm:w-auto max-w-sm bg-content1 text-foreground font-semibold hover:bg-primary sm:hover:scale-105 transition-all duration-300"
                endContent={
                    <Icon icon="material-symbols:arrow-right" width={22} height={22} />
                }
            >
                Comenzar reserva
            </Button>
        );
    }

    if (user.role !== "contractor") {
        return (
            <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                <Button
                    isDisabled
                    variant="flat"
                    radius="full"
                    className="w-full bg-content1 text-foreground font-semibold"
                >
                    Comenzar reserva
                </Button>
                <p className="text-sm text-default-600 text-pretty px-1">
                    Solo los contratistas pueden enviar solicitudes. Puedes seguir
                    explorando perfiles libremente.
                </p>
            </div>
        );
    }



    return (
        <Button
            as={Link}
            href="/musicians"
            variant="flat"
            radius="full"
            className="w-full sm:w-auto max-w-sm bg-content1 text-foreground font-semibold hover:bg-primary sm:hover:scale-105 transition-all duration-300"
            endContent={
                <Icon icon="material-symbols:arrow-right" width={22} height={22} />
            }
        >
            Explorar músicos
        </Button>
    );
}
