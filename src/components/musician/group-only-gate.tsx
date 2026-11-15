"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { getMusicianProfile } from "@/lib/profiles";

type Props = { children: React.ReactNode };

/**
 * Las funciones de equipo (integrantes, convocatorias, reparto) son de los perfiles de grupo. En un perfil
 * de solista se explica por qué no están y cómo activarlas, en lugar de dejar una pantalla que no funciona.
 */
export default function GroupOnlyGate({ children }: Props) {
    const [kind, setKind] = useState<"loading" | "solo" | "group">("loading");

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const profile = await getMusicianProfile();
                if (!cancelled) setKind(profile.profile_type === "group" ? "group" : "solo");
            } catch {
                // Si no se pudo saber, no se bloquea: la pantalla de equipo muestra su propio error.
                if (!cancelled) setKind("group");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (kind === "loading") return <div className="h-40 animate-pulse rounded-2xl bg-default-100" aria-hidden="true" />;
    if (kind === "group") return <>{children}</>;

    return (
        <Card className="mx-auto w-full max-w-2xl" shadow="sm">
            <CardBody className="grid justify-items-center gap-4 p-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                    <Icon icon="mdi:account-group-outline" width={30} aria-hidden="true" />
                </span>
                <div className="grid gap-1.5">
                    <h1 className="text-xl font-bold">Este perfil es de solista</h1>
                    <p className="max-w-[46ch] text-default-500">
                        Los integrantes, las convocatorias y el reparto de pagos son de los perfiles de grupo. Si trabajas con más personas, cambia este
                        perfil a grupo desde «Detalles de tu perfil».
                    </p>
                </div>
                <Button as={Link} href="/musician/profile" color="primary" radius="lg" className="font-semibold" startContent={<Icon icon="mdi:tune-vertical" width={18} aria-hidden="true" />}>
                    Ir a «Detalles de tu perfil»
                </Button>
            </CardBody>
        </Card>
    );
}
