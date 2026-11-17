"use client";

import { useEffect, useState } from "react";
import { Chip, Input, Spinner, Switch } from "@heroui/react";
import {
  previewAssistantCompare,
  previewAssistantQuote,
  type AssistantComparePreview,
  type AssistantQuotePreview,
  type MusicianAssistantConfigOut,
  type MusicianAssistantConfigUpdate,
} from "@/lib/assistant";
import { formatCurrency } from "@/lib/booking-labels";
import { InlineNotice, SectionCard, errorText } from "./shared";

/** Pausa corta antes de pedir la vista previa, para no llamar al servidor en cada tecla. */
const DEBOUNCE_MS = 500;

/** Solo lo que mueve el precio (no el saludo, ni las instrucciones, ni el interruptor de la IA). */
function pricingShape(config: Partial<MusicianAssistantConfigUpdate>) {
  return {
    packages: (config.packages ?? []).map((p) => ({
      name: p.name.trim(),
      members: Number(p.members_count),
      hours: Number(p.duration_hours),
      price: Number(p.price),
    })),
    extraHour: config.additional_hour_price ?? null,
    zones: (config.zone_surcharges ?? []).map((z) => ({
      zone: z.zone.trim(),
      surcharge: Number(z.surcharge),
      km: z.distance_km ?? null,
    })),
    perKm: config.per_km_rate ?? null,
    nightAmount: Number(config.night_surcharge_amount ?? 0),
    nightStart: Number(config.night_surcharge_start_hour ?? 23),
    specialPercent: Number(config.special_date_surcharge_percent ?? 0),
    discountAmount: Number(config.max_discount_amount ?? 0),
    discountPercent: Number(config.max_discount_percent ?? 0),
  };
}

/** ¿Las reglas de precio del formulario difieren de lo guardado? */
export function pricingDiffersFromSaved(
  form: MusicianAssistantConfigUpdate,
  saved: MusicianAssistantConfigOut | null,
): boolean {
  if (!saved) return false;
  return (
    JSON.stringify(pricingShape(form)) !== JSON.stringify(pricingShape(saved))
  );
}

function formatAmount(amount: number): string {
  return amount < 0
    ? `−${formatCurrency(Math.abs(amount))}`
    : formatCurrency(amount);
}

function positiveInt(text: string, max: number): number | undefined {
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : undefined;
}

function positiveNumber(text: string, max: number): number | undefined {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 && n <= max ? n : undefined;
}

export function QuotePreviewCard({
  payload,
  profileId,
}: {
  /** Las reglas tal como están en el formulario, sin guardar. */
  payload: MusicianAssistantConfigUpdate;
  profileId: string | null;
}) {
  const [members, setMembers] = useState("");
  const [hours, setHours] = useState("1");
  const [zone, setZone] = useState("");
  const [startTime, setStartTime] = useState("20:00");
  const [specialDate, setSpecialDate] = useState(false);
  const [discount, setDiscount] = useState(false);

  const [result, setResult] = useState<AssistantQuotePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestKey = JSON.stringify({
    payload,
    members,
    hours,
    zone,
    startTime,
    specialDate,
    discount,
    profileId,
  });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const req = JSON.parse(requestKey) as {
          payload: MusicianAssistantConfigUpdate;
          members: string;
          hours: string;
          zone: string;
          startTime: string;
          specialDate: boolean;
          discount: boolean;
          profileId: string | null;
        };
        setLoading(true);
        try {
          const data = await previewAssistantQuote(
            {
              config: req.payload,
              members_count: positiveInt(req.members, 60),
              duration_hours: positiveNumber(req.hours, 24),
              zone: req.zone.trim() || undefined,
              start_time: /^\d{1,2}:\d{2}$/.test(req.startTime)
                ? req.startTime
                : undefined,
              special_date: req.specialDate,
              requested_discount: req.discount,
            },
            req.profileId,
          );
          if (cancelled) return;
          setResult(data);
          setError(null);
        } catch (err: unknown) {
          if (cancelled) return;
          setResult(null);
          setError(errorText(err, "No se pudo calcular la cotización."));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [requestKey]);

  return (
    <SectionCard
      title="Así cotiza tu asistente"
      icon="material-symbols:request-quote"
      subtitle="Prueba un caso y mira el desglose con las reglas que tienes en pantalla, aunque todavía no las hayas guardado."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Input
          label="Integrantes"
          type="number"
          min={1}
          max={60}
          size="sm"
          variant="bordered"
          placeholder="Sin indicar"
          value={members}
          onValueChange={setMembers}
        />
        <Input
          label="Horas"
          type="number"
          min={0.5}
          max={24}
          step="0.5"
          size="sm"
          variant="bordered"
          value={hours}
          onValueChange={setHours}
        />
        <Input
          label="Zona"
          size="sm"
          variant="bordered"
          placeholder="Ej. Surco"
          value={zone}
          onValueChange={setZone}
        />
        <Input
          label="Hora de inicio"
          type="time"
          size="sm"
          variant="bordered"
          value={startTime}
          onValueChange={setStartTime}
        />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Switch isSelected={specialDate} onValueChange={setSpecialDate} size="sm">
          <span className="text-xs font-semibold">Es fecha especial</span>
        </Switch>
        <Switch isSelected={discount} onValueChange={setDiscount} size="sm">
          <span className="text-xs font-semibold">
            El cliente pide descuento
          </span>
        </Switch>
      </div>

      <div aria-live="polite" className="flex flex-col gap-3">
        {error && <InlineNotice tone="warning">{error}</InlineNotice>}
        {!result && !error && (
          <div className="flex justify-center py-3">
            <Spinner size="sm" label="Calculando..." />
          </div>
        )}
        {result && (
          <div
            className={`rounded-xl border border-default-200 bg-default-50 px-4 py-3 transition-opacity ${
              loading ? "opacity-60" : ""
            }`}
          >
            <ul className="flex flex-col gap-1">
              {result.lines.map((line, i) => (
                <li
                  key={`${line.label}-${i}`}
                  className="flex justify-between gap-3 text-sm tabular-nums text-default-700"
                >
                  <span>{line.label}</span>
                  <span>{formatAmount(line.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between gap-3 border-t border-default-200 pt-2 text-base font-bold tabular-nums text-foreground">
              <span>Total para el cliente</span>
              <span>{formatCurrency(result.total)}</span>
            </div>
            {result.out_of_coverage && (
              <div className="mt-3">
                <InlineNotice tone="warning">
                  Esa zona queda fuera de tu cobertura. En un caso real, el
                  asistente guardaría los datos y te avisaría para que confirmes
                  el traslado.
                </InlineNotice>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function ChangesPreviewCard({
  payload,
  profileId,
}: {
  payload: MusicianAssistantConfigUpdate;
  profileId: string | null;
}) {
  const [cases, setCases] = useState<AssistantComparePreview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestKey = JSON.stringify({ payload, profileId });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const req = JSON.parse(requestKey) as {
          payload: MusicianAssistantConfigUpdate;
          profileId: string | null;
        };
        try {
          const data = await previewAssistantCompare(req.payload, req.profileId);
          if (cancelled) return;
          setCases(data);
          setError(null);
        } catch (err: unknown) {
          if (cancelled) return;
          setError(errorText(err, "No se pudo comparar con lo guardado."));
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [requestKey]);

  const changed = (cases ?? []).filter((c) => c.changed);

  return (
    <SectionCard
      title="Qué cambiaría"
      icon="material-symbols:compare-arrows"
      subtitle="Tienes cambios sin guardar. Así responderían tus clientes con ellos, comparado con lo que está guardado."
    >
      {error && <InlineNotice tone="warning">{error}</InlineNotice>}
      {!cases && !error && (
        <div className="flex justify-center py-3">
          <Spinner size="sm" label="Comparando..." />
        </div>
      )}
      {cases && changed.length === 0 && !error && (
        <p className="text-sm text-default-500">
          Con estos cambios, las cotizaciones de ejemplo siguen igual.
        </p>
      )}
      {changed.length > 0 && (
        <ul className="flex flex-col">
          {changed.map((c) => (
            <li
              key={c.key}
              className="flex flex-col gap-2 border-t border-default-200 py-3 first:border-t-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-foreground">{c.label}</p>
                <Chip size="sm" color="warning" variant="flat">
                  {formatCurrency(c.current_total)} →{" "}
                  {formatCurrency(c.proposed_total)}
                </Chip>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-xs text-default-700 sm:text-sm">
                  <span className="block text-[11px] text-default-500">
                    Ahora
                  </span>
                  {c.current_summary}
                </div>
                <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-foreground sm:text-sm">
                  <span className="block text-[11px] text-default-500">
                    Con tus cambios
                  </span>
                  {c.proposed_summary}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
