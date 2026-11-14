"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/api";
import { leaveEnsemble, listMyEnsembles } from "@/lib/ensemble-members";
import type { EnsembleMemberOut } from "@/types/api";

/** Agrupaciones a las que pertenece el músico, con la opción de salirse cuando quiera. */
export default function MyEnsemblesCard() {
    const [ensembles, setEnsembles] = useState<EnsembleMemberOut[]>([]);
    const [leaving, setLeaving] = useState<EnsembleMemberOut | null>(null);
    const [isWorking, setIsWorking] = useState(false);

    const load = useCallback(async () => {
        try {
            setEnsembles(await listMyEnsembles());
        } catch {
            // Sin esta sección el resto del perfil sigue funcionando.
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => load());
    }, [load]);

    async function confirmLeave() {
        if (!leaving) return;
        setIsWorking(true);
        try {
            await leaveEnsemble(leaving.id);
            setEnsembles((current) => current.filter((e) => e.id !== leaving.id));
            addToast({ title: "Saliste de la agrupación", color: "default" });
            setLeaving(null);
        } catch (err) {
            addToast({
                title: "No pudimos sacarte de la agrupación",
                description: err instanceof ApiError ? err.message : "Inténtalo de nuevo en unos segundos.",
                color: "danger",
            });
        } finally {
            setIsWorking(false);
        }
    }

    if (ensembles.length === 0) return null;

    return (
        <section aria-labelledby="my-ensembles-title" className="mx-auto mb-6 w-full max-w-3xl rounded-2xl border border-default-200 bg-content1 p-5">
            <h2 id="my-ensembles-title" className="text-base font-bold">
                Mis agrupaciones
            </h2>
            <p className="mt-1 text-sm text-default-500">Eres integrante de estas agrupaciones. Puedes salirte cuando quieras.</p>
            <ul className="mt-4 grid gap-3">
                {ensembles.map((ensemble) => (
                    <li key={ensemble.id} className="flex items-center justify-between gap-3 rounded-xl bg-default-100 px-4 py-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                            <Icon icon="lucide:users" width={18} aria-hidden="true" />
                            <span className="truncate">{ensemble.leader_name || "Agrupación"}</span>
                        </span>
                        <Button size="sm" variant="bordered" color="danger" onPress={() => setLeaving(ensemble)}>
                            Salir
                        </Button>
                    </li>
                ))}
            </ul>
            <ConfirmDialog
                isOpen={leaving !== null}
                onClose={() => setLeaving(null)}
                onConfirm={confirmLeave}
                isLoading={isWorking}
                title="¿Salir de la agrupación?"
                description={`Dejarás de recibir convocatorias de ${leaving?.leader_name || "esta agrupación"} y perderás el acceso a sus eventos. El líder recibirá un aviso.`}
                confirmLabel="Sí, salir"
                cancelLabel="Quedarme"
            />
        </section>
    );
}
