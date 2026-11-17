import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AssistantConversationOut,
  AssistantMessageItem,
  MusicianAssistantConfigOut,
  MusicianWhatsAppChannelOut,
} from "@/lib/assistant";
import AssistantMessageTools from "./message-trace";
import AssistantPendingTab from "./pending-tab";
import AssistantVersionsTab from "./versions-tab";
import AssistantFlowTab from "./flow-tab";
import AssistantKnowledgeTab from "./knowledge-tab";

const api = vi.hoisted(() => ({
  createAssistantKnowledge: vi.fn(),
  listAssistantKnowledge: vi.fn(),
  updateAssistantKnowledge: vi.fn(),
  deleteAssistantKnowledge: vi.fn(),
  answerAssistantPending: vi.fn(),
  dismissAssistantPending: vi.fn(),
  listAssistantVersions: vi.fn(),
  restoreAssistantVersion: vi.fn(),
  saveAssistantConfigChange: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/lib/assistant", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/assistant")>();
  return { ...actual, ...api };
});

vi.mock("@/lib/cancellation-policy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cancellation-policy")>();
  return { ...actual, fetchCancellationPolicy: vi.fn().mockResolvedValue(actual.DEFAULT_CANCELLATION_POLICY) };
});

vi.mock("@heroui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@heroui/react")>();
  return { ...actual, addToast: toast };
});

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  toast.mockReset();
});

const PROFILE = "11111111-1111-4111-8111-111111111111";
const CONTRACT_DETAIL =
  "El pago y la cancelación los define tu contrata; el asistente ya responde desde ahí.";

function assistantMessage(overrides: Partial<AssistantMessageItem> = {}): AssistantMessageItem {
  return {
    id: "m2",
    sender: "assistant",
    text: "Tenemos libre ese día. Son S/ 450.00.",
    created_at: "2026-11-16T10:00:00Z",
    trace: {
      engine: "agent",
      tools: ["check_availability", "quote"],
      knowledge: [
        { source: "contract", ref: "payment", score: 0.9 },
        { source: "faq", ref: "22222222-2222-4222-8222-222222222222", score: 0.7 },
      ],
      rounds: 2,
      ms: 900,
    },
    ...overrides,
  };
}

describe("«¿Por qué respondió esto?» y «Enseñarle esta respuesta»", () => {
  it("no muestra nada si el mensaje no trae trace (motor por reglas)", () => {
    const { container } = render(
      <AssistantMessageTools
        message={assistantMessage({ trace: null })}
        previousClientText="Hola"
        profileId={PROFILE}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("explica las herramientas y las fuentes con etiquetas legibles", async () => {
    const user = userEvent.setup();
    render(
      <AssistantMessageTools
        message={assistantMessage()}
        previousClientText="¿Tocan el sábado?"
        profileId={PROFILE}
      />,
    );

    await user.click(screen.getByRole("button", { name: "¿Por qué respondió esto?" }));

    expect(screen.getByText("Revisó tu agenda")).toBeInTheDocument();
    expect(screen.getByText("Calculó el precio con tus reglas")).toBeInTheDocument();
    expect(screen.getByText("Tu contrata")).toBeInTheDocument();
    expect(screen.getByText("Respuesta que le enseñaste")).toBeInTheDocument();
    // Un identificador interno no se muestra al músico.
    expect(screen.queryByText(/22222222/)).not.toBeInTheDocument();
  });

  it("enseña la respuesta usando el mensaje anterior del cliente como pregunta", async () => {
    const user = userEvent.setup();
    api.createAssistantKnowledge.mockResolvedValue({ id: "k-1" });
    render(
      <AssistantMessageTools
        message={assistantMessage()}
        previousClientText="¿Tocan el sábado?"
        profileId={PROFILE}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enseñarle esta respuesta" }));
    await user.click(screen.getByRole("button", { name: "Guardar respuesta" }));

    await waitFor(() =>
      expect(api.createAssistantKnowledge).toHaveBeenCalledWith(
        {
          question: "¿Tocan el sábado?",
          answer: "Tenemos libre ese día. Son S/ 450.00.",
          source: "conversacion",
        },
        PROFILE,
      ),
    );
  });

  it("muestra el motivo del 422 tal cual", async () => {
    const user = userEvent.setup();
    api.createAssistantKnowledge.mockRejectedValue(new Error(CONTRACT_DETAIL));
    render(
      <AssistantMessageTools
        message={assistantMessage()}
        previousClientText="¿Piden anticipo?"
        profileId={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enseñarle esta respuesta" }));
    await user.click(screen.getByRole("button", { name: "Guardar respuesta" }));

    expect(await screen.findByText(CONTRACT_DETAIL)).toBeInTheDocument();
  });
});

describe("Pendientes", () => {
  const conversation = {
    id: "c-1",
    profile_id: PROFILE,
    channel: "whatsapp",
    status: "needs_musician",
    escalation_reason: "Evento fuera de tus zonas de cobertura",
    client_name: "Diego Paredes",
    extracted_data: {},
    messages: [{ id: "m1", sender: "client", text: "¿Tocan en Huancayo?", created_at: "2026-11-16T10:00:00Z" }],
    last_message_at: "2026-11-16T10:00:00Z",
    created_at: "2026-11-16T10:00:00Z",
  } as AssistantConversationOut;
  const pending = {
    id: "q-1",
    question: "¿Pueden tocar en la playa?",
    context: "Queremos algo en la playa",
    asked_count: 3,
    status: "open",
  };

  it("muestra un estado vacío amable", () => {
    render(
      <AssistantPendingTab
        profileId={PROFILE}
        conversations={[]}
        pending={[]}
        onPendingResolved={vi.fn()}
        onOpenConversation={vi.fn()}
      />,
    );
    expect(screen.getByText("No tienes nada pendiente")).toBeInTheDocument();
  });

  it("abre la conversación elegida", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <AssistantPendingTab
        profileId={PROFILE}
        conversations={[conversation]}
        pending={[]}
        onPendingResolved={vi.fn()}
        onOpenConversation={onOpen}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Abrir conversación" }));
    expect(onOpen).toHaveBeenCalledWith("c-1");
  });

  it("guarda y enseña la respuesta de una duda", async () => {
    const user = userEvent.setup();
    const onResolved = vi.fn();
    api.answerAssistantPending.mockResolvedValue({ id: "k-1" });
    render(
      <AssistantPendingTab
        profileId={PROFILE}
        conversations={[]}
        pending={[pending]}
        onPendingResolved={onResolved}
        onOpenConversation={vi.fn()}
      />,
    );

    expect(screen.getByText("Preguntaron 3 veces")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Tu respuesta"), "Sí, con sonido propio.");
    await user.click(screen.getByRole("button", { name: "Guardar y enseñar" }));

    await waitFor(() =>
      expect(api.answerAssistantPending).toHaveBeenCalledWith("q-1", "Sí, con sonido propio.", PROFILE),
    );
    expect(onResolved).toHaveBeenCalledWith("q-1");
  });

  it("muestra el motivo del 422 y no quita la duda", async () => {
    const user = userEvent.setup();
    const onResolved = vi.fn();
    api.answerAssistantPending.mockRejectedValue(new Error(CONTRACT_DETAIL));
    render(
      <AssistantPendingTab
        profileId={PROFILE}
        conversations={[]}
        pending={[pending]}
        onPendingResolved={onResolved}
        onOpenConversation={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Tu respuesta"), "La mitad por adelantado.");
    await user.click(screen.getByRole("button", { name: "Guardar y enseñar" }));

    expect(await screen.findByText(CONTRACT_DETAIL)).toBeInTheDocument();
    expect(onResolved).not.toHaveBeenCalled();
  });

  it("descarta una duda que no hay que responder", async () => {
    const user = userEvent.setup();
    const onResolved = vi.fn();
    api.dismissAssistantPending.mockResolvedValue(undefined);
    render(
      <AssistantPendingTab
        profileId={PROFILE}
        conversations={[]}
        pending={[pending]}
        onPendingResolved={onResolved}
        onOpenConversation={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "No es algo que deba responder" }));

    await waitFor(() => expect(api.dismissAssistantPending).toHaveBeenCalledWith("q-1", PROFILE));
    expect(onResolved).toHaveBeenCalledWith("q-1");
  });
});

describe("Versiones", () => {
  const versions = [
    { number: 3, label: "Ajustaste precios", created_at: "2026-11-10T10:00:00Z", package_count: 2, tone: "cercano", is_current: true },
    { number: 2, label: "Primera versión", created_at: "2026-11-01T10:00:00Z", package_count: 1, tone: "formal", is_current: false },
  ];

  it("marca la versión en uso y pide confirmación dentro de la página antes de restaurar", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    const onRestored = vi.fn().mockResolvedValue(undefined);
    api.listAssistantVersions.mockResolvedValue(versions);
    api.restoreAssistantVersion.mockResolvedValue({ number: 4 });
    render(<AssistantVersionsTab profileId={PROFILE} onRestored={onRestored} />);

    expect(await screen.findByText("En uso")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Restaurar" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Restaurar" }));
    expect(api.restoreAssistantVersion).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Sí, restaurar" }));

    await waitFor(() => expect(api.restoreAssistantVersion).toHaveBeenCalledWith(2, PROFILE));
    expect(onRestored).toHaveBeenCalledWith(2);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe("Cómo atiende", () => {
  const config = {
    id: PROFILE,
    profile_id: PROFILE,
    enabled: true,
    packages: [],
    zone_surcharges: [],
    night_surcharge_amount: 0,
    night_surcharge_start_hour: 23,
    special_date_surcharge_percent: 0,
    max_discount_amount: 0,
    max_discount_percent: 0,
    escalation_rules: { big_event_on: false, big_event_guests: 100, special_date_on: false, unknown_question_on: true },
    updated_at: "",
  } as MusicianAssistantConfigOut;
  const channel = {
    is_active: true,
    ignore_ensemble_members: true,
    ignore_personal_chats: true,
    auto_pause_on_human_reply: true,
  } as MusicianWhatsAppChannelOut;

  function renderFlow(overrides: { onChannelChange?: () => Promise<void>; onConfigSaved?: () => void } = {}) {
    return render(
      <AssistantFlowTab
        config={config}
        profileId={PROFILE}
        channel={channel}
        onChannelChange={overrides.onChannelChange ?? vi.fn().mockResolvedValue(undefined)}
        onConfigSaved={overrides.onConfigSaved ?? vi.fn()}
        onGoTo={vi.fn()}
      />,
    );
  }

  it("un interruptor de protección usa el mismo cliente del canal de WhatsApp", async () => {
    const user = userEvent.setup();
    const onChannelChange = vi.fn().mockResolvedValue(undefined);
    renderFlow({ onChannelChange });

    await user.click(screen.getByRole("switch", { name: /Filtro de chats personales o familiares/ }));

    expect(onChannelChange).toHaveBeenCalledWith({ ignore_personal_chats: false });
  });

  it("«fuera de cobertura» está siempre activo y bloqueado", () => {
    renderFlow();
    const locked = screen.getByRole("switch", { name: /fuera de tus zonas de cobertura/ });
    expect(locked).toBeChecked();
    expect(locked).toBeDisabled();
  });

  it("guarda las reglas con la configuración completa", async () => {
    const user = userEvent.setup();
    const onConfigSaved = vi.fn();
    api.saveAssistantConfigChange.mockResolvedValue({
      ...config,
      escalation_rules: { big_event_on: true, big_event_guests: 100, special_date_on: false, unknown_question_on: true },
    });
    renderFlow({ onConfigSaved });

    expect(screen.getByRole("button", { name: "Guardar avisos" })).toBeDisabled();
    await user.click(screen.getByRole("switch", { name: /Evento grande/ }));
    await user.click(screen.getByRole("button", { name: "Guardar avisos" }));

    await waitFor(() =>
      expect(api.saveAssistantConfigChange).toHaveBeenCalledWith(
        config,
        {
          escalation_rules: { big_event_on: true, big_event_guests: 100, special_date_on: false, unknown_question_on: true },
        },
        PROFILE,
      ),
    );
    expect(onConfigSaved).toHaveBeenCalled();
  });

  it("no deja guardar un número de invitados fuera de rango", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole("switch", { name: /Evento grande/ }));
    const guests = screen.getByLabelText("Número de invitados que activa el aviso");
    await user.clear(guests);
    await user.type(guests, "5");

    expect(screen.getByRole("button", { name: "Guardar avisos" })).toBeDisabled();
  });
});

describe("Lo que sabe", () => {
  it("muestra el detalle del 422 al agregar una respuesta sobre pago", async () => {
    const user = userEvent.setup();
    api.listAssistantKnowledge.mockResolvedValue([]);
    api.createAssistantKnowledge.mockRejectedValue(new Error(CONTRACT_DETAIL));
    render(<AssistantKnowledgeTab profileId={PROFILE} />);

    await screen.findByText("Todavía no le enseñaste ninguna respuesta", { exact: false });
    const [questionBox] = screen.getAllByLabelText("Pregunta del cliente");
    await user.type(questionBox, "¿Piden anticipo?");
    const [answerBox] = screen.getAllByLabelText("Tu respuesta");
    await user.type(answerBox, "Sí, la mitad.");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(await screen.findByText(CONTRACT_DETAIL)).toBeInTheDocument();
  });

  it("la entrevista guarda con origen «entrevista» y avanza a la siguiente pregunta", async () => {
    const user = userEvent.setup();
    api.listAssistantKnowledge.mockResolvedValue([]);
    api.createAssistantKnowledge.mockResolvedValue({
      id: "k-1",
      question: "¿Pueden pedir canciones especiales?",
      answer: "Sí, hasta 3.",
      source: "entrevista",
    });
    render(<AssistantKnowledgeTab profileId={PROFILE} />);

    expect(await screen.findByText("Pregunta 1 de 4")).toBeInTheDocument();
    await user.type(screen.getByLabelText("¿Pueden pedir canciones especiales?"), "Sí, hasta 3.");
    await user.click(screen.getByRole("button", { name: "Guardar y seguir" }));

    await waitFor(() =>
      expect(api.createAssistantKnowledge).toHaveBeenCalledWith(
        { question: "¿Pueden pedir canciones especiales?", answer: "Sí, hasta 3.", source: "entrevista" },
        PROFILE,
      ),
    );
    expect(await screen.findByText("Pregunta 2 de 4")).toBeInTheDocument();
  });

  it("«Saltar» pasa a la siguiente pregunta sin guardar nada", async () => {
    const user = userEvent.setup();
    api.listAssistantKnowledge.mockResolvedValue([]);
    render(<AssistantKnowledgeTab profileId={PROFILE} />);

    await screen.findByText("Pregunta 1 de 4");
    await user.click(screen.getByRole("button", { name: "Saltar" }));

    expect(screen.getByText("Pregunta 2 de 4")).toBeInTheDocument();
    expect(api.createAssistantKnowledge).not.toHaveBeenCalled();
  });
});
