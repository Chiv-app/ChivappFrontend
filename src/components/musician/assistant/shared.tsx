"use client";

import type { ReactNode } from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { AssistantConversationOut } from "@/lib/assistant";

export type AssistantTabKey =
  | "home"
  | "flow"
  | "training"
  | "knowledge"
  | "voice"
  | "pending"
  | "versions"
  | "conversations"
  | "whatsapp";

/** Texto legible de un error de API (el `detail` del servidor ya viene en español). */
export function errorText(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** Conversaciones en las que el asistente se detuvo y espera al músico, del perfil seleccionado. */
export function conversationsNeedingMusician(
  conversations: AssistantConversationOut[],
  profileId: string | null,
): AssistantConversationOut[] {
  return conversations.filter(
    (c) =>
      c.status === "needs_musician" &&
      (!profileId || !c.profile_id || c.profile_id === profileId),
  );
}

export const TONE_LABELS: Record<string, string> = {
  cercano: "Cercano",
  formal: "Formal",
  breve: "Breve",
};

export function formatShortDate(value?: string | null): string {
  if (!value) return "";
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Tarjeta de sección con el mismo aspecto que las de «Entrenamiento y Simulador». */
export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="border border-default-200 shadow-xs">
      <CardBody className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              {icon && (
                <Icon
                  icon={icon}
                  className="text-primary"
                  width={18}
                  aria-hidden="true"
                />
              )}
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-default-500 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

/** Barra de progreso simple (0 a 1). */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-default-200"
    >
      <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Aviso de error o información dentro de una tarjeta. */
export function InlineNotice({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "warning" | "info";
  children: ReactNode;
}) {
  const classes = {
    danger: "border-danger-200 bg-danger-50 text-danger-700",
    warning: "border-warning-200 bg-warning-50 text-warning-700",
    info: "border-default-200 bg-default-50 text-default-600",
  }[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`rounded-xl border px-3 py-2 text-xs sm:text-sm ${classes}`}
    >
      {children}
    </div>
  );
}
