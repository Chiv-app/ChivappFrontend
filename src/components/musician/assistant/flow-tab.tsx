"use client";

import { useState, type ReactNode } from "react";
import { Button, Input, Switch, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  saveAssistantConfigChange,
  type AssistantEscalationRules,
  type MusicianAssistantConfigOut,
  type MusicianWhatsAppChannelOut,
  type MusicianWhatsAppChannelUpdate,
} from "@/lib/assistant";
import { SectionCard, errorText, type AssistantTabKey } from "./shared";

export const DEFAULT_ESCALATION_RULES: AssistantEscalationRules = {
  big_event_on: false,
  big_event_guests: 100,
  special_date_on: false,
  unknown_question_on: true,
};

const MIN_GUESTS = 10;
const MAX_GUESTS = 5000;

type ProtectionKey =
  | "is_active"
  | "ignore_ensemble_members"
  | "ignore_personal_chats"
  | "auto_pause_on_human_reply";

const PROTECTIONS: { key: ProtectionKey; title: string; hint: string }[] = [
  {
    key: "is_active",
    title: "Responder automáticamente en WhatsApp",
    hint: "Puedes apagarlo temporalmente cuando quieras.",
  },
  {
    key: "ignore_ensemble_members",
    title: "Ignorar a los integrantes de mi agrupación",
    hint: "Nunca responde a los números de tu sección Integrantes.",
  },
  {
    key: "ignore_personal_chats",
    title: "Filtro de chats personales o familiares",
    hint: "Solo interviene si el mensaje consulta por eventos, precios, fechas o presentaciones.",
  },
  {
    key: "auto_pause_on_human_reply",
    title: "Pausar cuando yo escribo desde mi celular",
    hint: "Si intervienes en un chat, el asistente se silencia ahí.",
  },
];

function Step({
  index,
  title,
  description,
  last = false,
  highlight = false,
  children,
}: {
  index: number;
  title: string;
  description: string;
  last?: boolean;
  highlight?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[34px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            highlight
              ? "border-2 border-warning bg-warning-50 text-warning-700"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {index}
        </span>
        {!last && <span className="min-h-[14px] w-0.5 flex-1 bg-default-200" />}
      </div>
      <div className="min-w-0 pb-4">
        <div
          className={`rounded-xl border bg-content1 px-4 py-3 ${
            highlight ? "border-warning-200" : "border-default-200"
          }`}
        >
          <h3 className="text-sm font-bold text-foreground">
            <span className="sr-only">Paso {index}: </span>
            {title}
          </h3>
          <p className="text-xs text-default-500 sm:text-sm">{description}</p>
          {children && <div className="mt-3 flex flex-col gap-3">{children}</div>}
        </div>
      </div>
    </li>
  );
}

export default function AssistantFlowTab({
  config,
  profileId,
  channel,
  onChannelChange,
  onConfigSaved,
  onGoTo,
}: {
  config: MusicianAssistantConfigOut | null;
  profileId: string | null;
  channel: MusicianWhatsAppChannelOut | null;
  /** Guarda un ajuste del canal de WhatsApp (el mismo dato y endpoint de la pestaña de WhatsApp). */
  onChannelChange: (patch: MusicianWhatsAppChannelUpdate) => Promise<void>;
  onConfigSaved: (config: MusicianAssistantConfigOut) => void;
  onGoTo: (tab: AssistantTabKey) => void;
}) {
  const saved = config?.escalation_rules ?? DEFAULT_ESCALATION_RULES;
  const [rules, setRules] = useState<AssistantEscalationRules>(saved);
  const [guestsText, setGuestsText] = useState(String(saved.big_event_guests));
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<ProtectionKey | null>(null);

  const guests = /^\d+$/.test(guestsText.trim()) ? Number(guestsText) : NaN;
  const guestsValid =
    Number.isInteger(guests) && guests >= MIN_GUESTS && guests <= MAX_GUESTS;
  const draft: AssistantEscalationRules = {
    ...rules,
    big_event_guests: guestsValid ? guests : rules.big_event_guests,
  };
  const dirty =
    draft.big_event_on !== saved.big_event_on ||
    draft.big_event_guests !== saved.big_event_guests ||
    draft.special_date_on !== saved.special_date_on ||
    draft.unknown_question_on !== saved.unknown_question_on;
  const canSave = !!config && dirty && guestsValid;

  const toggleProtection = async (key: ProtectionKey, value: boolean) => {
    setBusyKey(key);
    try {
      await onChannelChange({ [key]: value });
    } finally {
      setBusyKey(null);
    }
  };

  const saveRules = async () => {
    if (!config || !canSave) return;
    setSaving(true);
    try {
      const updated = await saveAssistantConfigChange(
        config,
        { escalation_rules: draft },
        profileId,
      );
      onConfigSaved(updated);
      const next = updated.escalation_rules ?? draft;
      setRules(next);
      setGuestsText(String(next.big_event_guests));
      addToast({
        title: "Avisos guardados",
        description: "El asistente ya se detiene en estos casos.",
        color: "success",
      });
    } catch (err: unknown) {
      addToast({
        title: "No se pudieron guardar los avisos",
        description: errorText(err, "Intenta nuevamente."),
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Cómo atiende tu asistente"
        icon="material-symbols:support-agent"
        subtitle="Este recorrido es el mismo para todos los músicos. Tú decides en qué puntos se detiene y te llama."
      >
        <ol>
          <Step
            index={1}
            title="El cliente escribe primero"
            description="El asistente nunca abre una conversación ni usa plantillas: solo responde."
          />

          <Step
            index={2}
            title="¿Es un chat que debo atender?"
            description="Descarta a tu familia, a tus integrantes y a los chats donde ya intervienes tú."
          >
            {channel ? (
              <>
                {PROTECTIONS.map((p) => (
                  <Switch
                    key={p.key}
                    isSelected={channel[p.key]}
                    isDisabled={busyKey !== null}
                    onValueChange={(v) => void toggleProtection(p.key, v)}
                    size="sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{p.title}</span>
                      <span className="text-[11px] text-default-500">
                        {p.hint}
                      </span>
                    </div>
                  </Switch>
                ))}
                <p className="text-xs text-default-500">
                  Son los mismos ajustes de la pestaña de WhatsApp y se aplican
                  al instante.
                </p>
              </>
            ) : (
              <p className="text-xs text-default-500">
                No se pudieron cargar los ajustes de WhatsApp. Recarga la página
                para verlos.
              </p>
            )}
          </Step>

          <Step
            index={3}
            title="Entiende el pedido"
            description="Saca fecha, hora, lugar, tipo de evento y datos del cliente de lo que escribe o dicta."
          />

          <Step
            index={4}
            title="Revisa tu agenda"
            description="Cruza tu agenda de Chivapp y Google Calendar. Si ese horario está ocupado, propone otro."
          />

          <Step
            index={5}
            title="Cotiza con tus reglas"
            description="El precio lo calcula el sistema con tus paquetes, zonas y recargos. La IA no lo inventa."
          >
            <div>
              <Button
                size="sm"
                variant="flat"
                onPress={() => onGoTo("training")}
                endContent={
                  <Icon icon="material-symbols:arrow-forward" width={16} />
                }
              >
                Editar precios y reglas
              </Button>
            </div>
          </Step>

          <Step
            index={6}
            title="Crea tu enlace de pago"
            description="Cuando tiene los datos y el horario está libre, genera el enlace con todo precargado."
          />

          <Step
            index={7}
            title="Te avisa cuando hace falta"
            description="Estos son los casos en que el asistente se detiene y te pasa la conversación."
            last
            highlight
          >
            <Switch isSelected isDisabled size="sm">
              <div className="flex flex-col">
                <span className="text-xs font-bold">
                  Evento fuera de tus zonas de cobertura
                </span>
                <span className="text-[11px] text-default-500">
                  Siempre te avisa; no se puede desactivar.
                </span>
              </div>
            </Switch>

            <div className="flex flex-col gap-2">
              <Switch
                isSelected={rules.big_event_on}
                onValueChange={(v) => setRules((r) => ({ ...r, big_event_on: v }))}
                size="sm"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Evento grande</span>
                  <span className="text-[11px] text-default-500">
                    Si piden más de este número de invitados, te lo pasa a ti.
                  </span>
                </div>
              </Switch>
              <div className="flex items-center gap-2 pl-[52px]">
                <Input
                  type="number"
                  size="sm"
                  variant="bordered"
                  className="max-w-[120px]"
                  aria-label="Número de invitados que activa el aviso"
                  min={MIN_GUESTS}
                  max={MAX_GUESTS}
                  isDisabled={!rules.big_event_on}
                  value={guestsText}
                  onValueChange={setGuestsText}
                  isInvalid={rules.big_event_on && !guestsValid}
                  errorMessage={`Entre ${MIN_GUESTS} y ${MAX_GUESTS}`}
                />
                <span className="text-xs text-default-500">invitados</span>
              </div>
            </div>

            <Switch
              isSelected={rules.special_date_on}
              onValueChange={(v) =>
                setRules((r) => ({ ...r, special_date_on: v }))
              }
              size="sm"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold">Fecha especial</span>
                <span className="text-[11px] text-default-500">
                  Fechas como Navidad o el Día de la Madre pasan a ti antes de cotizar.
                </span>
              </div>
            </Switch>

            <Switch
              isSelected={rules.unknown_question_on}
              onValueChange={(v) =>
                setRules((r) => ({ ...r, unknown_question_on: v }))
              }
              size="sm"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold">
                  Si piden algo que no sé
                </span>
                <span className="text-[11px] text-default-500">
                  Te lo deja en «Pendientes» para que lo respondas una vez.
                </span>
              </div>
            </Switch>

            <div className="flex justify-end">
              <Button
                color="primary"
                size="sm"
                isLoading={saving}
                isDisabled={!canSave}
                onPress={() => void saveRules()}
              >
                Guardar avisos
              </Button>
            </div>
          </Step>
        </ol>
      </SectionCard>
    </div>
  );
}
