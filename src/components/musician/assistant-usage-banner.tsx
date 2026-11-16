"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { getAssistantUsage, type AssistantUsage } from "@/lib/assistant";

/** Aviso del cupo mensual de IA. `refreshKey` vuelve a pedir el uso cuando cambia (p. ej. tras un mensaje del simulador). */
export default function AssistantUsageBanner({ refreshKey = 0 }: { refreshKey?: number }) {
  const [usage, setUsage] = useState<AssistantUsage | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getAssistantUsage();
        if (!cancelled) setUsage(data);
      } catch {
        if (!cancelled) setUsage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!usage) return null;

  const aiOut = usage.ai_calls_used >= usage.ai_calls_limit;
  const audioOut = usage.audio_used >= usage.audio_limit;
  const nearLimit =
    usage.ai_calls_limit > 0 && usage.ai_calls_used / usage.ai_calls_limit >= 0.8;
  const tone = aiOut ? "danger" : nearLimit || audioOut ? "warning" : "neutral";
  const toneClass = {
    danger: "border-danger-200 bg-danger-50 text-danger-700",
    warning: "border-warning-200 bg-warning-50 text-warning-700",
    neutral: "border-default-200 bg-content1 text-default-600",
  }[tone];

  return (
    <div
      role="status"
      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${toneClass}`}
    >
      <p className="flex items-center gap-2 font-semibold">
        <Icon icon="material-symbols:smart-toy-outline" width={18} aria-hidden="true" />
        Uso de IA este mes: {usage.ai_calls_used} de {usage.ai_calls_limit} respuestas · {usage.audio_used} de{" "}
        {usage.audio_limit} audios
      </p>
      {aiOut ? (
        <p>
          Llegaste al límite: el asistente sigue cotizando con tus tarifas, pero ya no redacta con IA. Se reinicia el día 1.
        </p>
      ) : audioOut ? (
        <p>Llegaste al límite de audios: tus clientes tendrán que escribir. Se reinicia el día 1.</p>
      ) : nearLimit ? (
        <p>Te estás acercando al límite mensual.</p>
      ) : null}
    </div>
  );
}
