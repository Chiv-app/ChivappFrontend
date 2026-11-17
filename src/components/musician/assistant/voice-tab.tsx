"use client";

import { useState } from "react";
import { Button, Input, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  saveAssistantConfigChange,
  type AssistantTone,
  type MusicianAssistantConfigOut,
} from "@/lib/assistant";
import { SectionCard, errorText, type AssistantTabKey } from "./shared";

const MAX_EXAMPLES = 10;
const RECOMMENDED_EXAMPLES = 3;
const MAX_EXAMPLE_LENGTH = 300;

const TONES: {
  key: AssistantTone;
  name: string;
  description: string;
  sample: string;
}[] = [
  {
    key: "cercano",
    name: "Cercano",
    description: "Cálido, de tú a tú y con frases cortas.",
    sample:
      "¡Hola! Qué gusto saludarte. Cuéntame para qué fecha, hora y lugar es tu evento.",
  },
  {
    key: "formal",
    name: "Formal",
    description: "Trato de usted, sin exclamaciones.",
    sample:
      "Buenas tardes. Indíquenos fecha, hora, lugar y tipo de evento para enviarle la cotización.",
  },
  {
    key: "breve",
    name: "Breve",
    description: "Directo, una o dos líneas.",
    sample: "Hola. ¿Fecha, hora y lugar del evento?",
  },
];

export default function AssistantVoiceTab({
  config,
  profileId,
  onConfigSaved,
  onGoTo,
}: {
  config: MusicianAssistantConfigOut | null;
  profileId: string | null;
  onConfigSaved: (config: MusicianAssistantConfigOut) => void;
  onGoTo: (tab: AssistantTabKey) => void;
}) {
  const savedTone: AssistantTone = config?.tone ?? "cercano";
  const savedExamples = config?.voice_examples ?? [];
  const [tone, setTone] = useState<AssistantTone>(savedTone);
  const [examples, setExamples] = useState<string[]>(savedExamples);
  const [newExample, setNewExample] = useState("");
  const [saving, setSaving] = useState(false);

  const dirty =
    tone !== savedTone ||
    JSON.stringify(examples) !== JSON.stringify(savedExamples);
  const trimmedNew = newExample.trim();
  const canAdd =
    trimmedNew.length > 0 &&
    trimmedNew.length <= MAX_EXAMPLE_LENGTH &&
    examples.length < MAX_EXAMPLES;

  const addExample = () => {
    if (!canAdd) return;
    setExamples((list) => [...list, trimmedNew]);
    setNewExample("");
  };

  const save = async () => {
    if (!config || !dirty) return;
    setSaving(true);
    try {
      const updated = await saveAssistantConfigChange(
        config,
        { tone, voice_examples: examples },
        profileId,
      );
      onConfigSaved(updated);
      setTone(updated.tone ?? tone);
      setExamples(updated.voice_examples ?? examples);
      addToast({
        title: "Tu forma de hablar quedó guardada",
        description: "El asistente ya escribe con este estilo.",
        color: "success",
      });
    } catch (err: unknown) {
      addToast({
        title: "No se pudo guardar",
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
        title="Tono"
        icon="material-symbols:chat"
        subtitle="Cómo suena tu asistente al redactar. El precio y las condiciones no cambian."
      >
        <div
          role="group"
          aria-label="Tono del asistente"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {TONES.map((t) => {
            const selected = tone === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setTone(t.key)}
                className={`flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-3.5 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-default-200 bg-content1 hover:bg-default-100/60"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {t.name}
                  </span>
                  {selected && (
                    <Icon
                      icon="material-symbols:check-circle-outline"
                      className="text-primary"
                      width={18}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="text-xs text-default-500">{t.description}</span>
                <span className="text-xs italic text-default-700">
                  «{t.sample}»
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Así escribo yo"
        icon="material-symbols:edit-note-outline-rounded"
        subtitle={`Mensajes tuyos que el asistente imita, sin copiarlos. Con ${RECOMMENDED_EXAMPLES} basta; puedes agregar hasta ${MAX_EXAMPLES}.`}
      >
        <p className="text-xs font-semibold text-default-600">
          {examples.length} de {RECOMMENDED_EXAMPLES} recomendados
          {examples.length > RECOMMENDED_EXAMPLES
            ? ` (${examples.length} de ${MAX_EXAMPLES} como máximo)`
            : ""}
        </p>

        {examples.length > 0 && (
          <ul className="flex flex-col">
            {examples.map((example, i) => (
              <li
                key={`${i}-${example}`}
                className="flex items-start justify-between gap-3 border-t border-default-200 py-2.5 first:border-t-0"
              >
                <span className="text-sm text-foreground">“{example}”</span>
                <Button
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() =>
                    setExamples((list) => list.filter((_, j) => j !== i))
                  }
                  aria-label={`Quitar el ejemplo: ${example}`}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-start gap-2">
          <Input
            aria-label="Nuevo mensaje de ejemplo"
            placeholder="Pega un mensaje que sueles enviar a tus clientes"
            size="sm"
            variant="bordered"
            maxLength={MAX_EXAMPLE_LENGTH}
            isDisabled={examples.length >= MAX_EXAMPLES}
            value={newExample}
            onValueChange={setNewExample}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addExample();
              }
            }}
          />
          <Button
            variant="flat"
            isDisabled={!canAdd}
            onPress={addExample}
            startContent={<Icon icon="material-symbols:add" width={18} />}
          >
            Agregar
          </Button>
        </div>
        {examples.length >= MAX_EXAMPLES && (
          <p className="text-xs text-default-500">
            Llegaste al máximo de {MAX_EXAMPLES} ejemplos. Quita alguno para
            agregar otro.
          </p>
        )}

        <div className="flex justify-end">
          <Button
            color="primary"
            isLoading={saving}
            isDisabled={!config || !dirty}
            onPress={() => void save()}
            startContent={
              !saving ? (
                <Icon icon="material-symbols:save" width={16} />
              ) : undefined
            }
          >
            Guardar mi forma de hablar
          </Button>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-default-200 bg-default-50 px-4 py-3 text-xs text-default-600 sm:text-sm">
        <span>
          El saludo inicial y las instrucciones libres siguen en «Entrenamiento
          y Simulador».
        </span>
        <Button size="sm" variant="flat" onPress={() => onGoTo("training")}>
          Ir a Entrenamiento y Simulador
        </Button>
      </div>
    </div>
  );
}
