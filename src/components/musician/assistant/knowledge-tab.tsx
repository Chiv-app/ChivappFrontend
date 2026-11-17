"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Chip, Input, Spinner, Textarea, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  createAssistantKnowledge,
  deleteAssistantKnowledge,
  listAssistantKnowledge,
  updateAssistantKnowledge,
  type AssistantKnowledgeEntry,
} from "@/lib/assistant";
import {
  DEFAULT_CANCELLATION_POLICY,
  fetchCancellationPolicy,
  getPartialRefundMaxDays,
  type CancellationPolicy,
} from "@/lib/cancellation-policy";
import { InlineNotice, SectionCard, errorText } from "./shared";

const MAX_ENTRIES = 100;
const MAX_QUESTION = 300;
const MAX_ANSWER = 2000;
const MIN_TEXT = 3;

const SOURCE_LABELS: Record<string, string> = {
  tu: "Tú",
  conversacion: "Conversación",
  entrevista: "Entrevista",
};

const INTERVIEW: { question: string; placeholder: string }[] = [
  {
    question: "¿Pueden pedir canciones especiales?",
    placeholder: "Ej. Sí, hasta 3 canciones, avisando con 3 días.",
  },
  {
    question: "¿Tocan en matrimonios y eventos grandes?",
    placeholder: "Ej. Sí, hasta 100 personas con nuestro propio sonido.",
  },
  {
    question: "¿Qué NO haces o no ofreces?",
    placeholder: "Ej. No tocamos en discotecas ni en eventos políticos.",
  },
  {
    question: "¿Cuánto tiempo antes conviene reservar?",
    placeholder: "Ej. Con 2 semanas de anticipación.",
  },
];

const SOURCES: { title: string; hint: string }[] = [
  { title: "Tus reglas de precio", hint: "Paquetes, zonas, recargos y descuento." },
  { title: "Tu agenda", hint: "Chivapp y Google Calendar." },
  { title: "Tu perfil", hint: "Biografía, repertorio, qué incluye y video." },
  {
    title: "Tu contrata y la política de Chivapp",
    hint: "Pago, cancelación, llegada y equipo.",
  },
  {
    title: "Respuestas que le diste",
    hint: "Lo que escribes aquí, en las pruebas o en Pendientes.",
  },
];

function SourcesCard() {
  return (
    <SectionCard
      title="De dónde responde tu asistente"
      icon="material-symbols:info-outline"
      subtitle="No es una lista cerrada de preguntas. Usa estos datos, entiende lo que pregunta el cliente y lo redacta con sus propias palabras. Si la respuesta no está en ninguno, no inventa: te lo pregunta."
    >
      <ol className="flex flex-col gap-3">
        {SOURCES.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary"
            >
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{s.title}</p>
              <p className="text-xs text-default-500">{s.hint}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

function ContractCard() {
  const [policy, setPolicy] = useState<CancellationPolicy>(
    DEFAULT_CANCELLATION_POLICY,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await fetchCancellationPolicy();
      if (!cancelled) setPolicy(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const facts = [
    "Pago: 100 % en un solo pago por Chivapp",
    `Cancelación: ${policy.full_refund_min_days} días o más, 100 %; de ${policy.partial_refund_min_days} a ${getPartialRefundMaxDays(policy)} días, ${policy.partial_refund_percent} %`,
    "Llegada y montaje: según tu contrata",
    "Equipo y logística: según tu contrata",
  ];

  return (
    <SectionCard
      title="De tu contrata"
      icon="material-symbols:contract-outline"
      subtitle="El asistente lee tu contrata y la política de Chivapp tal cual. Si cambias tu contrata, cambia lo que responde. No hay que copiarla aquí."
      action={
        <Button
          as={Link}
          href="/musician/profile"
          size="sm"
          variant="flat"
          startContent={
            <Icon icon="material-symbols:edit-outline" width={16} />
          }
        >
          Editar mi contrata
        </Button>
      }
    >
      <ul className="flex flex-wrap gap-2">
        {facts.map((fact) => (
          <li key={fact}>
            <Chip size="sm" variant="flat" color="primary">
              {fact}
            </Chip>
          </li>
        ))}
      </ul>
      <p className="text-xs text-default-500">
        Solo lectura. Por eso no puedes enseñarle respuestas sobre pago,
        cancelación, anticipo, reembolso o llegada.
      </p>
    </SectionCard>
  );
}

function InterviewCard({
  entries,
  profileId,
  onSaved,
}: {
  entries: AssistantKnowledgeEntry[];
  profileId: string | null;
  onSaved: (entry: AssistantKnowledgeEntry) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = index >= INTERVIEW.length;
  const current = INTERVIEW[index];
  const existing = current
    ? entries.find((e) => e.question === current.question)
    : undefined;
  const text = answers[index] ?? existing?.answer ?? "";
  const canSave = text.trim().length >= MIN_TEXT && text.trim().length <= MAX_ANSWER;

  const next = () => {
    setError(null);
    setIndex((i) => i + 1);
  };

  const saveAndContinue = async () => {
    if (!current || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { question: current.question, answer: text.trim() };
      const entry = existing
        ? await updateAssistantKnowledge(existing.id, payload, profileId)
        : await createAssistantKnowledge(
            { ...payload, source: "entrevista" },
            profileId,
          );
      onSaved(entry);
      next();
    } catch (err: unknown) {
      setError(errorText(err, "No se pudo guardar tu respuesta."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Entrevista guiada"
      icon="material-symbols:chat"
      subtitle="En vez de un formulario en blanco, te preguntamos de a una cosa."
    >
      {done ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-default-600">
            Terminaste la entrevista. Puedes volver a empezar cuando quieras.
          </p>
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              setIndex(0);
              setAnswers({});
              setError(null);
            }}
          >
            Empezar de nuevo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-default-600">
              Pregunta {index + 1} de {INTERVIEW.length}
            </p>
            <Chip size="sm" variant="flat">
              {Math.round((index / INTERVIEW.length) * 100)} % completado
            </Chip>
          </div>
          <h3 className="text-base font-bold text-foreground">
            {current.question}
          </h3>
          <Textarea
            aria-label={current.question}
            placeholder={current.placeholder}
            minRows={3}
            variant="bordered"
            maxLength={MAX_ANSWER}
            value={text}
            onValueChange={(v) => setAnswers((a) => ({ ...a, [index]: v }))}
          />
          {error && <InlineNotice>{error}</InlineNotice>}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              color="primary"
              isLoading={saving}
              isDisabled={!canSave}
              onPress={() => void saveAndContinue()}
            >
              Guardar y seguir
            </Button>
            <Button variant="light" isDisabled={saving} onPress={next}>
              Saltar
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function EntryRow({
  entry,
  profileId,
  onChanged,
  onRemoved,
}: {
  entry: AssistantKnowledgeEntry;
  profileId: string | null;
  onChanged: (entry: AssistantKnowledgeEntry) => void;
  onRemoved: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [question, setQuestion] = useState(entry.question);
  const [answer, setAnswer] = useState(entry.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    question.trim().length >= MIN_TEXT && answer.trim().length >= MIN_TEXT;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateAssistantKnowledge(
        entry.id,
        { question: question.trim(), answer: answer.trim() },
        profileId,
      );
      onChanged(updated);
      setEditing(false);
      addToast({ title: "Respuesta actualizada", color: "success" });
    } catch (err: unknown) {
      setError(errorText(err, "No se pudo guardar el cambio."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAssistantKnowledge(entry.id, profileId);
      onRemoved(entry.id);
      addToast({ title: "Respuesta quitada", color: "success" });
    } catch (err: unknown) {
      setError(errorText(err, "No se pudo quitar la respuesta."));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <li className="flex flex-col gap-3 border-t border-default-200 py-4 first:border-t-0">
        <Input
          label="Pregunta del cliente"
          size="sm"
          variant="bordered"
          maxLength={MAX_QUESTION}
          value={question}
          onValueChange={setQuestion}
        />
        <Textarea
          label="Tu respuesta"
          minRows={3}
          variant="bordered"
          maxLength={MAX_ANSWER}
          value={answer}
          onValueChange={setAnswer}
        />
        {error && <InlineNotice>{error}</InlineNotice>}
        <div className="flex flex-wrap gap-2">
          <Button
            color="primary"
            size="sm"
            isLoading={busy}
            isDisabled={!valid}
            onPress={() => void save()}
          >
            Guardar cambios
          </Button>
          <Button
            size="sm"
            variant="light"
            isDisabled={busy}
            onPress={() => {
              setEditing(false);
              setQuestion(entry.question);
              setAnswer(entry.answer);
              setError(null);
            }}
          >
            Cancelar
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 border-t border-default-200 py-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{entry.question}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-default-600">
            {entry.answer}
          </p>
        </div>
        <Chip size="sm" variant="flat">
          {SOURCE_LABELS[entry.source] ?? entry.source}
        </Chip>
      </div>
      {error && <InlineNotice>{error}</InlineNotice>}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-default-600">
            ¿Quitar esta respuesta? El asistente dejará de usarla.
          </span>
          <Button
            size="sm"
            color="danger"
            isLoading={busy}
            onPress={() => void remove()}
          >
            Sí, quitar
          </Button>
          <Button
            size="sm"
            variant="light"
            isDisabled={busy}
            onPress={() => setConfirming(false)}
          >
            No
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => setEditing(true)}
            startContent={
              <Icon icon="material-symbols:edit-outline" width={15} />
            }
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="light"
            color="danger"
            onPress={() => setConfirming(true)}
          >
            Quitar
          </Button>
        </div>
      )}
    </li>
  );
}

function AddEntryForm({
  profileId,
  disabled,
  onAdded,
}: {
  profileId: string | null;
  disabled: boolean;
  onAdded: (entry: AssistantKnowledgeEntry) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    question.trim().length >= MIN_TEXT && answer.trim().length >= MIN_TEXT;

  const add = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await createAssistantKnowledge(
        { question: question.trim(), answer: answer.trim(), source: "tu" },
        profileId,
      );
      onAdded(entry);
      setQuestion("");
      setAnswer("");
      addToast({ title: "Respuesta agregada", color: "success" });
    } catch (err: unknown) {
      // El 422 trae el motivo en español (por ejemplo, que eso lo define la contrata): se muestra tal cual.
      setError(errorText(err, "No se pudo agregar la respuesta."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-default-200 pt-4">
      <h3 className="text-sm font-bold text-foreground">Agregar una respuesta</h3>
      <Input
        label="Pregunta del cliente"
        placeholder="Ej. ¿Tocan en matrimonios civiles?"
        size="sm"
        variant="bordered"
        maxLength={MAX_QUESTION}
        isDisabled={disabled}
        value={question}
        onValueChange={setQuestion}
      />
      <Textarea
        label="Tu respuesta"
        placeholder="Escribe como se lo dirías al cliente"
        minRows={3}
        variant="bordered"
        maxLength={MAX_ANSWER}
        isDisabled={disabled}
        value={answer}
        onValueChange={setAnswer}
      />
      {error && <InlineNotice>{error}</InlineNotice>}
      <div>
        <Button
          color="primary"
          isLoading={saving}
          isDisabled={!valid || disabled}
          onPress={() => void add()}
          startContent={<Icon icon="material-symbols:add" width={18} />}
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}

export default function AssistantKnowledgeTab({
  profileId,
}: {
  profileId: string | null;
}) {
  const [entries, setEntries] = useState<AssistantKnowledgeEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listAssistantKnowledge(profileId);
        if (cancelled) return;
        setEntries(list);
        setLoadError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setLoadError(errorText(err, "No se pudieron cargar tus respuestas."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const upsert = (entry: AssistantKnowledgeEntry) =>
    setEntries((prev) => {
      const list = prev ?? [];
      return list.some((e) => e.id === entry.id)
        ? list.map((e) => (e.id === entry.id ? entry : e))
        : [entry, ...list];
    });

  const remove = (id: string) =>
    setEntries((prev) => (prev ?? []).filter((e) => e.id !== id));

  const count = entries?.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <SourcesCard />
      <ContractCard />
      <InterviewCard
        entries={entries ?? []}
        profileId={profileId}
        onSaved={upsert}
      />

      <SectionCard
        title="Respuestas que le diste"
        icon="material-symbols:library-music-outline"
        subtitle={`${count} de ${MAX_ENTRIES}. No son preguntas exactas: el asistente las usa como datos y responde aunque el cliente pregunte con otras palabras.`}
      >
        {loadError && <InlineNotice>{loadError}</InlineNotice>}
        {!entries && !loadError && (
          <div className="flex justify-center py-6">
            <Spinner size="sm" label="Cargando tus respuestas..." />
          </div>
        )}
        {entries && entries.length === 0 && (
          <p className="py-4 text-center text-sm text-default-500">
            Todavía no le enseñaste ninguna respuesta. Empieza con la entrevista
            o agrega una abajo.
          </p>
        )}
        {entries && entries.length > 0 && (
          <ul>
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                profileId={profileId}
                onChanged={upsert}
                onRemoved={remove}
              />
            ))}
          </ul>
        )}
        {count >= MAX_ENTRIES && (
          <InlineNotice tone="warning">
            Llegaste al máximo de {MAX_ENTRIES} respuestas. Quita alguna para
            agregar otra.
          </InlineNotice>
        )}
        <AddEntryForm
          profileId={profileId}
          disabled={count >= MAX_ENTRIES}
          onAdded={upsert}
        />
      </SectionCard>
    </div>
  );
}
