"use client";

import { useEffect, useState } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  getAssistantReadiness,
  type AssistantReadiness,
  type AssistantReadinessItem,
} from "@/lib/assistant";
import AssistantUsageBanner from "@/components/musician/assistant-usage-banner";
import {
  InlineNotice,
  ProgressBar,
  SectionCard,
  errorText,
  type AssistantTabKey,
} from "./shared";

const ITEM_TARGET: Record<string, { tab: AssistantTabKey; cta: string }> = {
  pricing: { tab: "training", cta: "Ver" },
  knowledge: { tab: "knowledge", cta: "Agregar" },
  voice: { tab: "voice", cta: "Agregar" },
  pending: { tab: "pending", cta: "Responder" },
  whatsapp: { tab: "whatsapp", cta: "Conectar" },
  tests: { tab: "training", cta: "Probar" },
};

export function scoreMessage(score: number): string {
  if (score >= 85) return "Tu asistente está listo para atender solo.";
  if (score >= 60) {
    return "Ya responde bien lo básico. Lo que falta son dudas que hoy te deriva a ti.";
  }
  return "Todavía te derivará muchas consultas.";
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="relative h-[120px] w-[120px] shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="h-[120px] w-[120px] -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-default-200"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-3xl font-bold tabular-nums text-foreground"
        role="img"
        aria-label={`Preparación del asistente: ${clamped} por ciento`}
      >
        {clamped}%
      </span>
    </div>
  );
}

function MissingItem({
  item,
  onGoTo,
}: {
  item: AssistantReadinessItem;
  onGoTo: (tab: AssistantTabKey) => void;
}) {
  const target = ITEM_TARGET[item.key];
  const done = item.progress >= 1;
  return (
    <li className="flex items-center gap-3 border-t border-default-200 py-3 first:border-t-0">
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          done
            ? "border-success bg-success text-white"
            : item.progress > 0
              ? "border-warning text-warning"
              : "border-default-300"
        }`}
      >
        {done && <Icon icon="material-symbols:check" width={14} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{item.title}</p>
        <p className="text-xs text-default-500">{item.detail}</p>
        {!done && <ProgressBar value={item.progress} label={item.title} />}
      </div>
      {done ? (
        <Chip size="sm" color="success" variant="flat">
          Listo
        </Chip>
      ) : target ? (
        <Button size="sm" variant="flat" onPress={() => onGoTo(target.tab)}>
          {target.cta}
        </Button>
      ) : null}
    </li>
  );
}

export default function AssistantHomeTab({
  profileId,
  usageRefreshKey,
  onGoTo,
}: {
  profileId: string | null;
  usageRefreshKey: number;
  onGoTo: (tab: AssistantTabKey) => void;
}) {
  const [readiness, setReadiness] = useState<AssistantReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getAssistantReadiness(profileId);
        if (cancelled) return;
        setReadiness(data);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(errorText(err, "No se pudo calcular la preparación."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return (
    <div className="flex flex-col gap-5">
      {error && <InlineNotice>{error}</InlineNotice>}

      {!readiness && !error && (
        <div className="flex justify-center py-10">
          <Spinner label="Revisando qué tan preparado está tu asistente..." />
        </div>
      )}

      {readiness && (
        <>
          <SectionCard title="Qué tan preparado está tu asistente">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <ScoreRing score={readiness.score} />
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {scoreMessage(readiness.score)}
                </p>
                <p className="text-xs text-default-500 sm:text-sm">
                  Lo que le enseñas se aplica enseguida, tanto en tus pruebas
                  como con tus clientes.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Qué te falta" icon="material-symbols:checklist">
            <ul>
              {readiness.items.map((item) => (
                <MissingItem key={item.key} item={item} onGoTo={onGoTo} />
              ))}
            </ul>
          </SectionCard>
        </>
      )}

      <AssistantUsageBanner refreshKey={usageRefreshKey} />
    </div>
  );
}
