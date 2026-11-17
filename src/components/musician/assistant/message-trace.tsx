"use client";

import { useState } from "react";
import { Button, Textarea, addToast } from "@heroui/react";
import {
  createAssistantKnowledge,
  type AssistantMessageItem,
  type AssistantTrace,
} from "@/lib/assistant";
import { InlineNotice, errorText } from "./shared";

const MAX_QUESTION = 300;
const MAX_ANSWER = 2000;
const MIN_TEXT = 3;

export const KNOWLEDGE_SOURCE_LABELS: Record<string, string> = {
  contract: "Tu contrata",
  policy: "Política de Chivapp",
  profile: "Tu perfil",
  package: "Tus paquetes",
  faq: "Respuesta que le enseñaste",
};

export const TOOL_LABELS: Record<string, string> = {
  update_reservation: "Anotó los datos del pedido",
  quote: "Calculó el precio con tus reglas",
  check_availability: "Revisó tu agenda",
  search_knowledge: "Buscó en lo que sabe",
  create_booking_link: "Creó el enlace de pago",
  ask_musician: "Te dejó una duda pendiente",
  handoff_to_musician: "Te pasó la conversación",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ");
}

export function knowledgeSourceLabel(source: string): string {
  return KNOWLEDGE_SOURCE_LABELS[source] ?? source;
}

function TraceDetails({ trace }: { trace: AssistantTrace }) {
  const tools = trace.tools ?? [];
  const knowledge = trace.knowledge ?? [];
  return (
    <div className="rounded-lg border-l-4 border-primary bg-default-100 px-3 py-2 text-xs text-default-700">
      <p className="font-bold text-foreground">Así respondió</p>
      <div className="mt-1.5">
        <p className="text-[11px] text-default-500">Qué hizo</p>
        {tools.length > 0 ? (
          <ul className="mt-0.5 list-disc pl-4">
            {tools.map((tool, i) => (
              <li key={`${tool}-${i}`}>{toolLabel(tool)}</li>
            ))}
          </ul>
        ) : (
          <p>Respondió solo con lo que ya había en la conversación.</p>
        )}
      </div>
      <div className="mt-1.5">
        <p className="text-[11px] text-default-500">De dónde sacó los datos</p>
        {knowledge.length > 0 ? (
          <ul className="mt-0.5 list-disc pl-4">
            {knowledge.map((k, i) => (
              <li key={`${k.source}-${k.ref}-${i}`}>
                <span className="font-semibold">
                  {knowledgeSourceLabel(k.source)}
                </span>
                {k.ref && !UUID_PATTERN.test(k.ref) && (
                  <span className="text-default-500">: {k.ref}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No consultó tus datos guardados.</p>
        )}
      </div>
    </div>
  );
}

function TeachEditor({
  initialQuestion,
  initialAnswer,
  profileId,
  onClose,
}: {
  initialQuestion: string;
  initialAnswer: string;
  profileId: string | null;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState(
    initialQuestion.slice(0, MAX_QUESTION),
  );
  const [answer, setAnswer] = useState(initialAnswer.slice(0, MAX_ANSWER));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    question.trim().length >= MIN_TEXT && answer.trim().length >= MIN_TEXT;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createAssistantKnowledge(
        {
          question: question.trim(),
          answer: answer.trim(),
          source: "conversacion",
        },
        profileId,
      );
      addToast({
        title: "Listo, tu asistente aprendió esta respuesta",
        description: "La verás en «Lo que sabe».",
        color: "success",
      });
      onClose();
    } catch (err: unknown) {
      // El motivo del 422 viene en español: se muestra tal cual.
      setError(errorText(err, "No se pudo guardar la respuesta."));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-default-200 bg-default-50 p-3">
      <Textarea
        label="Si el cliente pregunta..."
        minRows={1}
        size="sm"
        variant="bordered"
        maxLength={MAX_QUESTION}
        value={question}
        onValueChange={setQuestion}
      />
      <Textarea
        label="Responde así"
        minRows={2}
        size="sm"
        variant="bordered"
        maxLength={MAX_ANSWER}
        value={answer}
        onValueChange={setAnswer}
      />
      {error && <InlineNotice>{error}</InlineNotice>}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          color="primary"
          isLoading={saving}
          isDisabled={!valid}
          onPress={() => void save()}
        >
          Guardar respuesta
        </Button>
        <Button size="sm" variant="light" isDisabled={saving} onPress={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/**
 * Botones bajo un mensaje del asistente que trae `trace`: explicar de dónde salió la respuesta y enseñarla.
 * No muestra nada si el mensaje no es del asistente o respondió el motor por reglas (sin `trace`).
 */
export default function AssistantMessageTools({
  message,
  previousClientText,
  profileId,
}: {
  message: AssistantMessageItem;
  /** Último mensaje del cliente antes de esta respuesta. */
  previousClientText: string | null;
  profileId: string | null;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [teaching, setTeaching] = useState(false);

  if (message.sender !== "assistant" || !message.trace) return null;

  return (
    <div className="mt-2 flex flex-col gap-2 text-foreground">
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="flat"
          className="h-7 min-w-0 px-2.5 text-[11px]"
          aria-expanded={showWhy}
          onPress={() => setShowWhy((v) => !v)}
        >
          ¿Por qué respondió esto?
        </Button>
        <Button
          size="sm"
          variant="flat"
          className="h-7 min-w-0 px-2.5 text-[11px]"
          aria-expanded={teaching}
          isDisabled={!previousClientText}
          onPress={() => setTeaching((v) => !v)}
        >
          Enseñarle esta respuesta
        </Button>
      </div>
      {showWhy && <TraceDetails trace={message.trace} />}
      {teaching && previousClientText && (
        <TeachEditor
          initialQuestion={previousClientText}
          initialAnswer={message.text}
          profileId={profileId}
          onClose={() => setTeaching(false)}
        />
      )}
    </div>
  );
}
