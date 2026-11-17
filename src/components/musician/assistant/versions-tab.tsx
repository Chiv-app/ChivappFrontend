"use client";

import { useEffect, useState } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import {
  listAssistantVersions,
  restoreAssistantVersion,
  type AssistantConfigVersion,
} from "@/lib/assistant";
import {
  InlineNotice,
  SectionCard,
  TONE_LABELS,
  errorText,
  formatShortDate,
} from "./shared";

function describeVersion(v: AssistantConfigVersion): string {
  const parts: string[] = [];
  const date = formatShortDate(v.created_at);
  if (date) parts.push(date);
  parts.push(`${v.package_count} ${v.package_count === 1 ? "paquete" : "paquetes"}`);
  if (typeof v.knowledge_count === "number") {
    parts.push(
      `${v.knowledge_count} ${v.knowledge_count === 1 ? "respuesta" : "respuestas"}`,
    );
  }
  if (v.tone) parts.push(`tono ${(TONE_LABELS[v.tone] ?? v.tone).toLowerCase()}`);
  return parts.join(" · ");
}

export default function AssistantVersionsTab({
  profileId,
  onRestored,
}: {
  profileId: string | null;
  /** Recarga la configuración y avisa al músico (lo hace la vista principal). */
  onRestored: (restoredNumber: number) => Promise<void>;
}) {
  const [versions, setVersions] = useState<AssistantConfigVersion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listAssistantVersions(profileId);
        if (cancelled) return;
        setVersions(list);
        setLoadError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setLoadError(errorText(err, "No se pudieron cargar las versiones."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, reloadKey]);

  const restore = async (number: number) => {
    setRestoring(true);
    setRestoreError(null);
    try {
      await restoreAssistantVersion(number, profileId);
      await onRestored(number);
      setConfirming(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setRestoreError(errorText(err, "No se pudo restaurar la versión."));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SectionCard
      title="Versiones"
      icon="material-symbols:history"
      subtitle="Cada vez que cambias la configuración de tu asistente se guarda una copia. Puedes volver a una anterior cuando quieras."
    >
      {loadError && <InlineNotice>{loadError}</InlineNotice>}
      {!versions && !loadError && (
        <div className="flex justify-center py-6">
          <Spinner size="sm" label="Cargando versiones..." />
        </div>
      )}
      {versions && versions.length === 0 && (
        <p className="py-4 text-center text-sm text-default-500">
          Todavía no hay versiones. La primera se guarda cuando cambies algo.
        </p>
      )}
      {versions && versions.length > 0 && (
        <ul>
          {versions.map((v) => (
            <li
              key={v.number}
              className="flex flex-col gap-3 border-t border-default-200 py-3 first:border-t-0"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Chip size="sm" variant="flat" color="primary">
                  v{v.number}
                </Chip>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{v.label}</p>
                  <p className="text-xs text-default-500">{describeVersion(v)}</p>
                </div>
                {v.is_current ? (
                  <Chip size="sm" variant="flat" color="success">
                    En uso
                  </Chip>
                ) : (
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={restoring}
                    onPress={() => {
                      setConfirming(v.number);
                      setRestoreError(null);
                    }}
                  >
                    Restaurar
                  </Button>
                )}
              </div>

              {confirming === v.number && (
                <div className="flex flex-col gap-3 rounded-xl border border-warning-200 bg-warning-50 p-3.5">
                  <p className="text-xs text-warning-700 sm:text-sm">
                    ¿Restaurar la versión {v.number}? Tus precios, tono y reglas
                    vuelven a como estaban entonces. Se guarda como una versión
                    nueva y las demás se conservan. Si tienes cambios sin guardar
                    en «Entrenamiento y Simulador», se descartan.
                  </p>
                  {restoreError && <InlineNotice>{restoreError}</InlineNotice>}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      color="primary"
                      size="sm"
                      isLoading={restoring}
                      onPress={() => void restore(v.number)}
                    >
                      Sí, restaurar
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      isDisabled={restoring}
                      onPress={() => {
                        setConfirming(null);
                        setRestoreError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
