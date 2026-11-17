import { apiFetch } from "./api";

export type AssistantTone = "cercano" | "formal" | "breve";

export type AssistantEscalationRules = {
  big_event_on: boolean;
  /** Entre 10 y 5000 invitados. */
  big_event_guests: number;
  special_date_on: boolean;
  unknown_question_on: boolean;
};

export type AssistantPackageItem = {
  id: string;
  name: string;
  members_count: number;
  duration_hours: number;
  price: number;
  description?: string | null;
};

export type AssistantZoneSurchargeItem = {
  zone: string;
  surcharge: number;
  distance_km?: number | null;
};

export type MusicianAssistantConfigOut = {
  id: string;
  profile_id: string;
  profile_stage_name?: string | null;
  profile_type?: string | null;
  profile_city?: string | null;
  enabled: boolean;
  greeting_message?: string | null;
  packages: AssistantPackageItem[];
  additional_hour_price?: number | null;
  zone_surcharges: AssistantZoneSurchargeItem[];
  per_km_rate?: number | null;
  night_surcharge_amount: number;
  night_surcharge_start_hour: number;
  special_date_surcharge_percent: number;
  max_discount_amount: number;
  max_discount_percent: number;
  custom_instructions?: string | null;
  /** Cómo suena al redactar. Opcional: un servidor anterior no lo manda. */
  tone?: AssistantTone;
  /** Mensajes del propio músico que el asistente imita (máx. 10, cada uno de hasta 300 caracteres). */
  voice_examples?: string[];
  /** Cuándo el asistente se detiene y te pasa la conversación. */
  escalation_rules?: AssistantEscalationRules;
  updated_at: string;
};

export type MusicianAssistantConfigUpdate = {
  enabled?: boolean;
  greeting_message?: string | null;
  packages?: AssistantPackageItem[];
  additional_hour_price?: number | null;
  zone_surcharges?: AssistantZoneSurchargeItem[];
  per_km_rate?: number | null;
  night_surcharge_amount?: number;
  night_surcharge_start_hour?: number;
  special_date_surcharge_percent?: number;
  max_discount_amount?: number;
  max_discount_percent?: number;
  custom_instructions?: string | null;
  // Opcionales: si no se envían, el servidor conserva lo que ya tenía.
  tone?: AssistantTone;
  voice_examples?: string[];
  escalation_rules?: AssistantEscalationRules;
};

export type MusicianWhatsAppChannelOut = {
  id: string;
  user_id: string;
  phone_number_id?: string | null;
  waba_id?: string | null;
  display_phone?: string | null;
  has_access_token: boolean;
  webhook_verify_token?: string | null;
  webhook_url: string;
  is_active: boolean;
  auto_pause_on_human_reply: boolean;
  ignore_ensemble_members: boolean;
  ignore_personal_chats: boolean;
  ignored_phones: string[];
  connected_at?: string | null;
  updated_at: string;
};

export type MusicianWhatsAppChannelUpdate = {
  phone_number_id?: string | null;
  waba_id?: string | null;
  display_phone?: string | null;
  access_token?: string | null;
  is_active?: boolean;
  auto_pause_on_human_reply?: boolean;
  ignore_ensemble_members?: boolean;
  ignore_personal_chats?: boolean;
  ignored_phones?: string[];
};

export type AssistantTraceKnowledge = {
  /** "contract" | "policy" | "profile" | "package" | "faq" */
  source: string;
  ref: string;
  score: number;
};

/** Cómo respondió el asistente. Ausente o null cuando contestó el motor por reglas. */
export type AssistantTrace = {
  engine: "agent" | string;
  tools: string[];
  knowledge: AssistantTraceKnowledge[];
  rounds: number;
  ms: number;
};

export type AssistantMessageItem = {
  id: string;
  sender: "client" | "assistant" | "musician" | string;
  text: string;
  media_type?: "text" | "audio" | string;
  created_at: string;
  booking_link_token?: string | null;
  trace?: AssistantTrace | null;
};

export type AssistantConversationOut = {
  id: string;
  profile_id?: string | null;
  profile_stage_name?: string | null;
  channel: "whatsapp" | "simulator" | string;
  client_phone?: string | null;
  client_name?: string | null;
  status: "bot_active" | "paused_by_musician" | "needs_musician" | "ignored_personal" | "completed" | string;
  escalation_reason?: string | null;
  extracted_data: Record<string, unknown>;
  messages: AssistantMessageItem[];
  last_booking_link_id?: string | null;
  last_booking_link_token?: string | null;
  last_booking_link_url?: string | null;
  last_message_at: string;
  created_at: string;
};

export type AssistantSimulateChatResponse = {
  conversation: AssistantConversationOut;
  reply: string;
  calculated_price?: number | null;
  quote_summary?: string | null;
  booking_link_token?: string | null;
  booking_link_url?: string | null;
};

export type AssistantUsage = {
  ai_calls_used: number;
  ai_calls_limit: number;
  audio_used: number;
  audio_limit: number;
};

// --- Contrato real del backend (app/schemas/assistant.py) ---
// La pantalla trabaja con los tipos de arriba; las funciones de abajo traducen desde y hacia las respuestas del servidor.

type ServerConfig = Omit<MusicianAssistantConfigOut, "id" | "profile_stage_name" | "profile_city" | "updated_at"> & {
  stage_name?: string | null;
  location_city?: string | null;
};

type ServerWhatsAppChannel = {
  connected: boolean;
  phone_number_id?: string | null;
  waba_id?: string | null;
  display_phone_number?: string | null;
  has_access_token: boolean;
  is_active: boolean;
  auto_pause_on_human_reply: boolean;
  ignore_ensemble_members: boolean;
  ignore_personal_chats: boolean;
  ignored_phones: string[];
  webhook_url: string;
  verify_token?: string | null;
  connected_at?: string | null;
};

type ServerConversation = {
  id: string;
  profile_id?: string | null;
  profile_name?: string | null;
  channel: string;
  client_phone?: string | null;
  client_name?: string | null;
  status: string;
  escalation_reason?: string | null;
  extracted_data: Record<string, unknown>;
  messages: AssistantMessageItem[];
  last_booking_link_token?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
};

type ServerTurn = {
  conversation_id: string;
  profile_id?: string | null;
  profile_name?: string | null;
  status: string;
  escalation_reason?: string | null;
  reply?: string | null;
  extracted_data: Record<string, unknown>;
  quote_breakdown?: { summary?: string } | null;
  booking_link_token?: string | null;
  booking_link_url?: string | null;
  messages: AssistantMessageItem[];
};

function payUrl(token?: string | null): string | null {
  if (!token) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/pay/${token}`;
}

function toConversation(row: ServerConversation): AssistantConversationOut {
  const now = new Date().toISOString();
  return {
    id: row.id,
    profile_id: row.profile_id ?? null,
    profile_stage_name: row.profile_name ?? null,
    channel: row.channel,
    client_phone: row.client_phone ?? null,
    client_name: row.client_name ?? null,
    status: row.status,
    escalation_reason: row.escalation_reason ?? null,
    extracted_data: row.extracted_data ?? {},
    messages: row.messages ?? [],
    last_booking_link_token: row.last_booking_link_token ?? null,
    last_booking_link_url: payUrl(row.last_booking_link_token),
    last_message_at: row.last_message_at ?? now,
    created_at: row.created_at ?? now,
  };
}

function toConfig(row: ServerConfig): MusicianAssistantConfigOut {
  return {
    ...row,
    id: row.profile_id,
    profile_stage_name: row.stage_name ?? null,
    profile_city: row.location_city ?? null,
    updated_at: "",
  };
}

function toChannel(row: ServerWhatsAppChannel): MusicianWhatsAppChannelOut {
  return {
    id: "",
    user_id: "",
    phone_number_id: row.phone_number_id ?? null,
    waba_id: row.waba_id ?? null,
    display_phone: row.display_phone_number ?? null,
    has_access_token: row.has_access_token,
    webhook_verify_token: row.verify_token ?? null,
    webhook_url: row.webhook_url,
    is_active: row.is_active,
    auto_pause_on_human_reply: row.auto_pause_on_human_reply,
    ignore_ensemble_members: row.ignore_ensemble_members,
    ignore_personal_chats: row.ignore_personal_chats,
    ignored_phones: row.ignored_phones ?? [],
    connected_at: row.connected_at ?? null,
    updated_at: row.connected_at ?? "",
  };
}

export async function getAssistantUsage(): Promise<AssistantUsage> {
  return apiFetch<AssistantUsage>("/assistant/usage");
}

export async function getAssistantConfig(profileId?: string | null): Promise<MusicianAssistantConfigOut> {
  const qs = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : "";
  return toConfig(await apiFetch<ServerConfig>(`/assistant/config${qs}`));
}

export async function updateAssistantConfig(
  payload: MusicianAssistantConfigUpdate,
  profileId?: string | null
): Promise<MusicianAssistantConfigOut> {
  const qs = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : "";
  return toConfig(
    await apiFetch<ServerConfig>(`/assistant/config${qs}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  );
}

export async function simulateAssistantChat(payload: {
  profile_id?: string | null;
  conversation_id?: string | null;
  message?: string | null;
  audio_base64?: string | null;
  audio_mime_type?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  reset?: boolean;
}): Promise<AssistantSimulateChatResponse> {
  // `reset` solo lo usa la pantalla (conversation_id null abre una conversación nueva): el servidor no lo recibe.
  const body = { ...payload };
  delete body.reset;
  const turn = await apiFetch<ServerTurn>("/assistant/simulate", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const now = new Date().toISOString();
  const calculated = turn.extracted_data?.calculated_price;
  return {
    conversation: {
      id: turn.conversation_id,
      profile_id: turn.profile_id ?? null,
      profile_stage_name: turn.profile_name ?? null,
      channel: "simulator",
      status: turn.status,
      escalation_reason: turn.escalation_reason ?? null,
      extracted_data: turn.extracted_data ?? {},
      messages: turn.messages ?? [],
      last_booking_link_token: turn.booking_link_token ?? null,
      last_booking_link_url: turn.booking_link_url ?? null,
      last_message_at: now,
      created_at: now,
    },
    reply: turn.reply ?? "",
    calculated_price: typeof calculated === "number" ? calculated : null,
    quote_summary: turn.quote_breakdown?.summary ?? null,
    booking_link_token: turn.booking_link_token ?? null,
    booking_link_url: turn.booking_link_url ?? null,
  };
}

export async function getWhatsAppChannel(): Promise<MusicianWhatsAppChannelOut> {
  return toChannel(await apiFetch<ServerWhatsAppChannel>("/assistant/whatsapp"));
}

/** Guarda las credenciales de Meta (si vienen) y las reglas del canal en dos llamadas, como las expone el servidor. */
export async function updateWhatsAppChannel(
  payload: MusicianWhatsAppChannelUpdate
): Promise<MusicianWhatsAppChannelOut> {
  if (payload.phone_number_id) {
    await apiFetch<ServerWhatsAppChannel>("/assistant/whatsapp/connect", {
      method: "POST",
      body: JSON.stringify({
        phone_number_id: payload.phone_number_id,
        waba_id: payload.waba_id ?? null,
        display_phone_number: payload.display_phone ?? null,
        access_token: payload.access_token ?? null,
      }),
    });
  }
  const channel = await apiFetch<ServerWhatsAppChannel>("/assistant/whatsapp/settings", {
    method: "PATCH",
    body: JSON.stringify({
      is_active: payload.is_active,
      auto_pause_on_human_reply: payload.auto_pause_on_human_reply,
      ignore_ensemble_members: payload.ignore_ensemble_members,
      ignore_personal_chats: payload.ignore_personal_chats,
      ignored_phones: payload.ignored_phones,
    }),
  });
  return toChannel(channel);
}

export async function listAssistantConversations(channel?: string): Promise<AssistantConversationOut[]> {
  const qs = channel ? `?channel=${encodeURIComponent(channel)}` : "";
  const rows = await apiFetch<ServerConversation[]>(`/assistant/conversations${qs}`);
  return rows.map(toConversation);
}

export async function updateAssistantConversationStatus(
  conversationId: string,
  status: string
): Promise<AssistantConversationOut> {
  const row = await apiFetch<ServerConversation>(`/assistant/conversations/${conversationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return toConversation(row);
}

// --- Entrenamiento del asistente: conocimiento, dudas, versiones, preparación y vistas previas ---

/** Arma `?profile_id=...` (y otros parámetros) para las rutas que aceptan perfil opcional. */
function profileQuery(profileId?: string | null, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  if (profileId) params.set("profile_id", profileId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Convierte la configuración guardada en el cuerpo completo del PUT. El servidor reemplaza todos los campos
 * clásicos, así que para cambiar uno solo hay que reenviar el resto tal cual.
 */
export function configToUpdate(config: MusicianAssistantConfigOut): MusicianAssistantConfigUpdate {
  return {
    enabled: config.enabled,
    greeting_message: config.greeting_message ?? null,
    packages: config.packages ?? [],
    additional_hour_price: config.additional_hour_price ?? null,
    zone_surcharges: config.zone_surcharges ?? [],
    per_km_rate: config.per_km_rate ?? null,
    night_surcharge_amount: config.night_surcharge_amount,
    night_surcharge_start_hour: config.night_surcharge_start_hour,
    special_date_surcharge_percent: config.special_date_surcharge_percent,
    max_discount_amount: config.max_discount_amount,
    max_discount_percent: config.max_discount_percent,
    custom_instructions: config.custom_instructions ?? null,
    ...(config.tone ? { tone: config.tone } : {}),
    ...(config.voice_examples ? { voice_examples: config.voice_examples } : {}),
    ...(config.escalation_rules ? { escalation_rules: config.escalation_rules } : {}),
  };
}

/** Guarda un cambio sobre la configuración completa que ya está guardada (no sobre lo que hay a medio editar). */
export async function saveAssistantConfigChange(
  current: MusicianAssistantConfigOut,
  change: MusicianAssistantConfigUpdate,
  profileId?: string | null
): Promise<MusicianAssistantConfigOut> {
  return updateAssistantConfig({ ...configToUpdate(current), ...change }, profileId ?? current.profile_id);
}

export type AssistantKnowledgeSource = "tu" | "conversacion" | "entrevista";

export type AssistantKnowledgeEntry = {
  id: string;
  question: string;
  answer: string;
  source: AssistantKnowledgeSource | string;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function listAssistantKnowledge(profileId?: string | null): Promise<AssistantKnowledgeEntry[]> {
  return apiFetch<AssistantKnowledgeEntry[]>(`/assistant/knowledge${profileQuery(profileId)}`);
}

/** Si la pregunta es de pago, cancelación, anticipo, reembolso o llegada, el servidor responde 422 con el motivo en español. */
export async function createAssistantKnowledge(
  payload: { question: string; answer: string; source?: AssistantKnowledgeSource },
  profileId?: string | null
): Promise<AssistantKnowledgeEntry> {
  return apiFetch<AssistantKnowledgeEntry>(`/assistant/knowledge${profileQuery(profileId)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAssistantKnowledge(
  id: string,
  payload: { question: string; answer: string },
  profileId?: string | null
): Promise<AssistantKnowledgeEntry> {
  return apiFetch<AssistantKnowledgeEntry>(`/assistant/knowledge/${encodeURIComponent(id)}${profileQuery(profileId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAssistantKnowledge(id: string, profileId?: string | null): Promise<void> {
  await apiFetch<void>(`/assistant/knowledge/${encodeURIComponent(id)}${profileQuery(profileId)}`, {
    method: "DELETE",
  });
}

export type AssistantPendingQuestion = {
  id: string;
  question: string;
  context?: string | null;
  asked_count: number;
  status: string;
  conversation_id?: string | null;
  created_at?: string | null;
};

export async function listAssistantPending(profileId?: string | null): Promise<AssistantPendingQuestion[]> {
  return apiFetch<AssistantPendingQuestion[]>(`/assistant/pending${profileQuery(profileId)}`);
}

/** Responde una duda: el servidor la convierte en una respuesta de conocimiento. */
export async function answerAssistantPending(
  id: string,
  answer: string,
  profileId?: string | null
): Promise<AssistantKnowledgeEntry> {
  return apiFetch<AssistantKnowledgeEntry>(`/assistant/pending/${encodeURIComponent(id)}/answer${profileQuery(profileId)}`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export async function dismissAssistantPending(id: string, profileId?: string | null): Promise<void> {
  await apiFetch<void>(`/assistant/pending/${encodeURIComponent(id)}/dismiss${profileQuery(profileId)}`, {
    method: "POST",
  });
}

export type AssistantConfigVersion = {
  number: number;
  label: string;
  created_at?: string | null;
  knowledge_count?: number | null;
  package_count: number;
  tone?: string | null;
  is_current: boolean;
};

export async function listAssistantVersions(profileId?: string | null): Promise<AssistantConfigVersion[]> {
  return apiFetch<AssistantConfigVersion[]>(`/assistant/versions${profileQuery(profileId)}`);
}

/** Restaura una versión (el servidor crea una nueva con ese contenido). Después hay que recargar la configuración. */
export async function restoreAssistantVersion(
  number: number,
  profileId?: string | null
): Promise<AssistantConfigVersion> {
  return apiFetch<AssistantConfigVersion>(`/assistant/versions/${number}/restore${profileQuery(profileId)}`, {
    method: "POST",
  });
}

export type AssistantReadinessKey = "pricing" | "knowledge" | "voice" | "pending" | "whatsapp" | "tests";

export type AssistantReadinessItem = {
  key: AssistantReadinessKey | string;
  title: string;
  detail: string;
  /** De 0 a 1. */
  progress: number;
  weight: number;
};

export type AssistantReadiness = {
  /** De 0 a 100. */
  score: number;
  items: AssistantReadinessItem[];
};

export async function getAssistantReadiness(profileId?: string | null): Promise<AssistantReadiness> {
  return apiFetch<AssistantReadiness>(`/assistant/readiness${profileQuery(profileId)}`);
}

export type AssistantQuotePreviewInput = {
  /** Reglas del formulario SIN guardar. Si no se envía, el servidor usa las guardadas. */
  config?: MusicianAssistantConfigUpdate;
  members_count?: number;
  duration_hours?: number;
  zone?: string;
  /** "HH:MM" */
  start_time?: string;
  special_date: boolean;
  requested_discount: boolean;
};

export type AssistantQuotePreview = {
  total: number;
  package_name: string;
  summary: string;
  lines: { label: string; amount: number }[];
  out_of_coverage: boolean;
};

/** No consume IA ni guarda nada. */
export async function previewAssistantQuote(
  payload: AssistantQuotePreviewInput,
  profileId?: string | null
): Promise<AssistantQuotePreview> {
  return apiFetch<AssistantQuotePreview>(`/assistant/preview/quote${profileQuery(profileId)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AssistantComparePreview = {
  key: string;
  label: string;
  current_total: number;
  proposed_total: number;
  current_summary: string;
  proposed_summary: string;
  changed: boolean;
};

/** Compara casos de ejemplo con lo guardado y con la configuración del formulario sin guardar. */
export async function previewAssistantCompare(
  config: MusicianAssistantConfigUpdate,
  profileId?: string | null
): Promise<AssistantComparePreview[]> {
  return apiFetch<AssistantComparePreview[]>(`/assistant/preview/compare${profileQuery(profileId)}`, {
    method: "POST",
    body: JSON.stringify({ config }),
  });
}
