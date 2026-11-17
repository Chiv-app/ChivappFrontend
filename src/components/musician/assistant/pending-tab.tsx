"use client";

import { useState } from "react";
import { Button, Chip, Textarea, addToast } from "@heroui/react";
import {
  answerAssistantPending,
  dismissAssistantPending,
  type AssistantConversationOut,
  type AssistantPendingQuestion,
} from "@/lib/assistant";
import { InlineNotice, SectionCard, errorText } from "./shared";

const MIN_ANSWER = 3;
const MAX_ANSWER = 2000;

function lastClientMessage(conv: AssistantConversationOut): string | null {
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    if (conv.messages[i].sender === "client") return conv.messages[i].text;
  }
  return null;
}

function PendingQuestionCard({
  item,
  profileId,
  onDone,
}: {
  item: AssistantPendingQuestion;
  profileId: string | null;
  onDone: (id: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState<"answer" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = answer.trim();
  const canAnswer = trimmed.length >= MIN_ANSWER;

  const submitAnswer = async () => {
    if (!canAnswer) return;
    setBusy("answer");
    setError(null);
    try {
      await answerAssistantPending(item.id, trimmed, profileId);
      onDone(item.id);
      addToast({
        title: "Listo, tu asistente ya lo sabe",
        description: "La próxima vez que pregunten lo mismo, responderá solo.",
        color: "success",
      });
    } catch (err: unknown) {
      setError(errorText(err, "No se pudo guardar tu respuesta."));
      setBusy(null);
    }
  };

  const dismiss = async () => {
    setBusy("dismiss");
    setError(null);
    try {
      await dismissAssistantPending(item.id, profileId);
      onDone(item.id);
      addToast({ title: "Duda descartada", color: "success" });
    } catch (err: unknown) {
      setError(errorText(err, "No se pudo descartar la duda."));
      setBusy(null);
    }
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-default-200 bg-content1 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">{item.question}</h3>
        <Chip size="sm" color="warning" variant="flat">
          Preguntaron {item.asked_count}{" "}
          {item.asked_count === 1 ? "vez" : "veces"}
        </Chip>
      </div>
      {item.context && (
        <div className="rounded-lg bg-default-100 px-3 py-2 text-xs text-default-700 sm:text-sm">
          <span className="block text-[11px] text-default-500">
            Lo que escribió el cliente
          </span>
          «{item.context}»
        </div>
      )}
      <Textarea
        label="Tu respuesta"
        placeholder="Escribe como se lo dirías al cliente"
        minRows={2}
        variant="bordered"
        maxLength={MAX_ANSWER}
        value={answer}
        onValueChange={setAnswer}
      />
      {error && <InlineNotice>{error}</InlineNotice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          color="primary"
          size="sm"
          isLoading={busy === "answer"}
          isDisabled={!canAnswer || busy === "dismiss"}
          onPress={() => void submitAnswer()}
        >
          Guardar y enseñar
        </Button>
        <Button
          size="sm"
          variant="light"
          isLoading={busy === "dismiss"}
          isDisabled={busy === "answer"}
          onPress={() => void dismiss()}
        >
          No es algo que deba responder
        </Button>
      </div>
    </li>
  );
}

export default function AssistantPendingTab({
  profileId,
  conversations,
  pending,
  onPendingResolved,
  onOpenConversation,
}: {
  profileId: string | null;
  /** Conversaciones con estado «needs_musician» del perfil seleccionado. */
  conversations: AssistantConversationOut[];
  pending: AssistantPendingQuestion[];
  onPendingResolved: (id: string) => void;
  onOpenConversation: (conversationId: string) => void;
}) {
  if (conversations.length === 0 && pending.length === 0) {
    return (
      <SectionCard title="No tienes nada pendiente">
        <p className="text-sm text-default-500">
          Aquí aparecerán las conversaciones que requieren tu atención y las
          dudas nuevas de tus clientes.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {conversations.length > 0 && (
        <SectionCard
          title="Conversaciones que requieren tu atención"
          subtitle="El asistente se detuvo y espera que intervengas."
        >
          <ul className="flex flex-col gap-3">
            {conversations.map((conv) => {
              const last = lastClientMessage(conv);
              return (
                <li
                  key={conv.id}
                  className="flex flex-col gap-3 rounded-xl border border-default-200 bg-content1 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      {conv.client_name || conv.client_phone || "Cliente"}
                    </h3>
                    <Chip size="sm" color="warning" variant="flat">
                      Requiere tu atención
                    </Chip>
                  </div>
                  {conv.escalation_reason && (
                    <div className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700 sm:text-sm">
                      <strong>Motivo:</strong> {conv.escalation_reason}
                    </div>
                  )}
                  {last && (
                    <p className="text-xs text-default-600 sm:text-sm">
                      <span className="text-default-500">Último mensaje: </span>
                      «{last}»
                    </p>
                  )}
                  <div>
                    <Button
                      color="primary"
                      size="sm"
                      onPress={() => onOpenConversation(conv.id)}
                    >
                      Abrir conversación
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {pending.length > 0 && (
        <SectionCard
          title="Dudas que tu asistente no supo responder"
          subtitle="Responde una vez. La próxima vez que pregunten lo mismo, contestará solo."
        >
          <ul className="flex flex-col gap-3">
            {pending.map((item) => (
              <PendingQuestionCard
                key={item.id}
                item={item}
                profileId={profileId}
                onDone={onPendingResolved}
              />
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
