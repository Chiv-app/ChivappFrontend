"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, CardBody, Input, addToast } from "@heroui/react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { ApiError } from "@/lib/api";
import { getAdminAssistantLimits, updateAdminAssistantLimits, type AdminAssistantLimits } from "@/lib/admin";
import { UI } from "@/lib/ui-classes";

type Draft = { monthlyAi: string; monthlyAudio: string; dailyGlobal: string };

const MAX_LIMIT = 1_000_000;

function toDraft(limits: AdminAssistantLimits): Draft {
    return {
        monthlyAi: String(limits.monthly_ai_calls_per_musician),
        monthlyAudio: String(limits.monthly_audio_per_musician),
        dailyGlobal: String(limits.daily_ai_calls_global),
    };
}

function parseLimit(value: string): number | null {
    if (!/^\d+$/.test(value.trim())) return null;
    const parsed = Number(value);
    return parsed >= 0 && parsed <= MAX_LIMIT ? parsed : null;
}

export default function AdminAssistantPage() {
    const [limits, setLimits] = useState<AdminAssistantLimits | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);

    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const data = await getAdminAssistantLimits();
                if (cancelled) return;
                setLimits(data);
                setDraft(toDraft(data));
            } catch {
                if (!cancelled) setLoadFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const parsed = draft
        ? {
              monthly_ai_calls_per_musician: parseLimit(draft.monthlyAi),
              monthly_audio_per_musician: parseLimit(draft.monthlyAudio),
              daily_ai_calls_global: parseLimit(draft.dailyGlobal),
          }
        : null;
    const valid = parsed !== null && Object.values(parsed).every((value) => value !== null);
    const dirty =
        limits !== null &&
        parsed !== null &&
        valid &&
        (parsed.monthly_ai_calls_per_musician !== limits.monthly_ai_calls_per_musician ||
            parsed.monthly_audio_per_musician !== limits.monthly_audio_per_musician ||
            parsed.daily_ai_calls_global !== limits.daily_ai_calls_global);

    async function save(event: FormEvent) {
        event.preventDefault();
        if (!parsed || !valid || saving) return;
        setSaving(true);
        try {
            const saved = await updateAdminAssistantLimits({
                monthly_ai_calls_per_musician: parsed.monthly_ai_calls_per_musician as number,
                monthly_audio_per_musician: parsed.monthly_audio_per_musician as number,
                daily_ai_calls_global: parsed.daily_ai_calls_global as number,
            });
            setLimits(saved);
            setDraft(toDraft(saved));
            addToast({ title: "Topes guardados", description: "Rigen desde la próxima llamada al modelo.", color: "success" });
        } catch (error) {
            const description = error instanceof ApiError && error.message ? error.message : "No pudimos guardar. Inténtalo de nuevo.";
            addToast({ title: "No se pudo guardar", description, color: "danger" });
        } finally {
            setSaving(false);
        }
    }

    const field = (label: string, description: string, key: keyof Draft, value: number | null) => (
        <Input
            label={label}
            description={description}
            inputMode="numeric"
            variant="bordered"
            radius="lg"
            classNames={UI.input}
            value={draft?.[key] ?? ""}
            onValueChange={(next) => setDraft((current) => (current ? { ...current, [key]: next } : current))}
            isInvalid={value === null}
            errorMessage={`Escribe un número entero entre 0 y ${MAX_LIMIT.toLocaleString("es-PE")}.`}
        />
    );

    return (
        <div className="grid gap-6">
            <AdminPageHeader
                title="Asistente IA"
                description="Cada respuesta o audio que entiende el asistente es una llamada al modelo, y la paga Chivapp. Estos topes acotan ese gasto."
            />

            {loadFailed ? (
                <Card className={UI.surfaceCard}>
                    <CardBody className="flex flex-col items-start gap-3 p-6">
                        <p className="text-sm text-default-600">No pudimos cargar los topes.</p>
                        <Button variant="bordered" radius="lg" onPress={() => {
                                setLoadFailed(false);
                                setReloadKey((key) => key + 1);
                            }}>
                            Reintentar
                        </Button>
                    </CardBody>
                </Card>
            ) : !limits || !draft ? (
                <div className={`${UI.skeleton} h-72`} />
            ) : (
                <>
                    <Card className={UI.surfaceCard}>
                        <CardBody className="flex flex-col gap-1 p-5 sm:p-6">
                            <p className="text-sm text-default-500">Llamadas al modelo hoy, en toda la plataforma</p>
                            <p className="text-3xl font-bold tabular-nums">
                                {limits.global_calls_today.toLocaleString("es-PE")}
                                <span className="text-lg font-medium text-default-500">
                                    {" "}
                                    de {limits.daily_ai_calls_global.toLocaleString("es-PE")}
                                </span>
                            </p>
                        </CardBody>
                    </Card>

                    <Card className={UI.surfaceCard}>
                        <CardBody className="p-5 sm:p-6">
                            <form onSubmit={save} className="grid gap-5">
                                {field(
                                    "Llamadas por músico al mes",
                                    "Cada respuesta del asistente o autocompletado de un enlace cuenta como una.",
                                    "monthlyAi",
                                    parsed?.monthly_ai_calls_per_musician ?? null,
                                )}
                                {field(
                                    "Audios por músico al mes",
                                    "Cada audio que se transcribe cuenta como audio y también como llamada.",
                                    "monthlyAudio",
                                    parsed?.monthly_audio_per_musician ?? null,
                                )}
                                {field(
                                    "Tope de toda la plataforma por día",
                                    "Freno de emergencia: al llegar, el modelo se detiene para todos hasta el día siguiente.",
                                    "dailyGlobal",
                                    parsed?.daily_ai_calls_global ?? null,
                                )}
                                <ul className="list-disc space-y-1 pl-5 text-sm text-default-500">
                                    <li>Con 0 se apaga esa vía por completo.</li>
                                    <li>
                                        Al agotar el cupo, el asistente sigue cotizando con las tarifas del músico, pero ya no usa el
                                        modelo para redactar ni entiende audios.
                                    </li>
                                    <li>El conteo mensual se reinicia el día 1 (hora de Lima).</li>
                                </ul>
                                <div className="flex items-center justify-end gap-3">
                                    {!dirty ? <span className="text-sm text-default-500">Sin cambios por guardar</span> : null}
                                    <Button
                                        type="submit"
                                        color="primary"
                                        radius="lg"
                                        className="font-semibold"
                                        isLoading={saving}
                                        isDisabled={!dirty}
                                    >
                                        Guardar topes
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </>
            )}
        </div>
    );
}
