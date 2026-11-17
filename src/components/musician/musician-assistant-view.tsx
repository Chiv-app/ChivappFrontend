"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Spinner,
  Switch,
  Textarea,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  PROFILE_VERIFICATION_INVALIDATED_EVENT,
  listMyMusicianProfiles,
} from "@/lib/profiles";
import type { MusicianProfileSummary } from "@/types/api";
import {
  getAssistantConfig,
  updateAssistantConfig,
  simulateAssistantChat,
  getWhatsAppChannel,
  updateWhatsAppChannel,
  listAssistantConversations,
  listAssistantPending,
  updateAssistantConversationStatus,
  type AssistantPackageItem,
  type AssistantPendingQuestion,
  type AssistantZoneSurchargeItem,
  type MusicianAssistantConfigOut,
  type MusicianAssistantConfigUpdate,
  type MusicianWhatsAppChannelOut,
  type MusicianWhatsAppChannelUpdate,
  type AssistantConversationOut,
} from "@/lib/assistant";
import { formatCurrency } from "@/lib/booking-labels";
import AssistantUsageBanner from "@/components/musician/assistant-usage-banner";
import AssistantHomeTab from "@/components/musician/assistant/home-tab";
import AssistantFlowTab from "@/components/musician/assistant/flow-tab";
import AssistantKnowledgeTab from "@/components/musician/assistant/knowledge-tab";
import AssistantVoiceTab from "@/components/musician/assistant/voice-tab";
import AssistantPendingTab from "@/components/musician/assistant/pending-tab";
import AssistantVersionsTab from "@/components/musician/assistant/versions-tab";
import AssistantMessageTools from "@/components/musician/assistant/message-trace";
import {
  ChangesPreviewCard,
  QuotePreviewCard,
  pricingDiffersFromSaved,
} from "@/components/musician/assistant/training-previews";
import {
  conversationsNeedingMusician,
  type AssistantTabKey,
} from "@/components/musician/assistant/shared";

const TABS: { key: AssistantTabKey; label: string; icon: string }[] = [
  {
    key: "home",
    label: "Inicio",
    icon: "material-symbols:home-outline",
  },
  {
    key: "flow",
    label: "Cómo atiende",
    icon: "material-symbols:support-agent",
  },
  {
    key: "training",
    label: "Entrenamiento y Simulador",
    icon: "material-symbols:smart-toy-outline",
  },
  {
    key: "knowledge",
    label: "Lo que sabe",
    icon: "material-symbols:description",
  },
  {
    key: "voice",
    label: "Cómo habla",
    icon: "material-symbols:chat",
  },
  {
    key: "pending",
    label: "Pendientes",
    icon: "material-symbols:pending-actions",
  },
  {
    key: "versions",
    label: "Versiones",
    icon: "material-symbols:history",
  },
  {
    key: "conversations",
    label: "Conversaciones y Links",
    icon: "material-symbols:forum-outline",
  },
  {
    key: "whatsapp",
    label: "Conexión WhatsApp (Meta)",
    icon: "ic:baseline-whatsapp",
  },
];

export default function MusicianAssistantView() {
  const [myProfiles, setMyProfiles] = useState<MusicianProfileSummary[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const activeProfileId = selectedProfileId;
  const activeProfileName =
    myProfiles.find((p) => p.id === selectedProfileId)?.stage_name ||
    myProfiles.find((p) => p.is_primary)?.stage_name ||
    "Tu perfil activo";

  const baseId = useId();
  const [activeTab, setActiveTab] = useState<AssistantTabKey>("home");
  const tabRefs = useRef<Record<AssistantTabKey, HTMLButtonElement | null>>({
    home: null,
    flow: null,
    training: null,
    knowledge: null,
    voice: null,
    pending: null,
    versions: null,
    whatsapp: null,
    conversations: null,
  });

  // --- Estado de Entrenamiento (por perfil) ---
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [config, setConfig] = useState<MusicianAssistantConfigOut | null>(null);

  const [enabled, setEnabled] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState("");
  const [packages, setPackages] = useState<AssistantPackageItem[]>([]);
  const [additionalHourPrice, setAdditionalHourPrice] = useState("");
  const [zoneSurcharges, setZoneSurcharges] = useState<
    AssistantZoneSurchargeItem[]
  >([]);
  const [perKmRate, setPerKmRate] = useState("");
  const [nightSurchargeAmount, setNightSurchargeAmount] = useState("0");
  const [nightSurchargeStartHour, setNightSurchargeStartHour] = useState("23");
  const [specialDatePercent, setSpecialDatePercent] = useState("0");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("0");
  const [maxDiscountPercent, setMaxDiscountPercent] = useState("0");
  const [customInstructions, setCustomInstructions] = useState("");

  // --- Estado del Simulador en vivo ---
  const [simConversation, setSimConversation] =
    useState<AssistantConversationOut | null>(null);
  const [simInput, setSimInput] = useState("");
  const [simSending, setSimSending] = useState(false);
  const [simQuoteSummary, setSimQuoteSummary] = useState<string | null>(null);
  const [simBookingUrl, setSimBookingUrl] = useState<string | null>(null);
  const [isRecordingSim, setIsRecordingSim] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // --- Estado del Canal WhatsApp (Meta Cloud API) ---
  const [waChannel, setWaChannel] = useState<MusicianWhatsAppChannelOut | null>(
    null,
  );
  const [savingWa, setSavingWa] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waWabaId, setWaWabaId] = useState("");
  const [waDisplayPhone, setWaDisplayPhone] = useState("");
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waIsActive, setWaIsActive] = useState(true);
  const [waAutoPause, setWaAutoPause] = useState(true);
  const [waIgnoreMembers, setWaIgnoreMembers] = useState(true);
  const [waIgnorePersonal, setWaIgnorePersonal] = useState(true);
  const [waIgnoredPhonesText, setWaIgnoredPhonesText] = useState("");

  // --- Estado de Conversaciones ---
  const [conversations, setConversations] = useState<
    AssistantConversationOut[]
  >([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // --- Dudas pendientes (lo que un cliente preguntó y el asistente no supo) ---
  const [pendingQuestions, setPendingQuestions] = useState<
    AssistantPendingQuestion[]
  >([]);

  const hydrateConfigForm = useCallback((cfg: MusicianAssistantConfigOut) => {
    setConfig(cfg);
    setEnabled(cfg.enabled);
    setGreetingMessage(cfg.greeting_message || "");
    setPackages(cfg.packages || []);
    setAdditionalHourPrice(
      cfg.additional_hour_price != null
        ? String(cfg.additional_hour_price)
        : "",
    );
    setZoneSurcharges(cfg.zone_surcharges || []);
    setPerKmRate(cfg.per_km_rate != null ? String(cfg.per_km_rate) : "");
    setNightSurchargeAmount(String(cfg.night_surcharge_amount ?? 0));
    setNightSurchargeStartHour(String(cfg.night_surcharge_start_hour ?? 23));
    setSpecialDatePercent(String(cfg.special_date_surcharge_percent ?? 0));
    setMaxDiscountAmount(String(cfg.max_discount_amount ?? 0));
    setMaxDiscountPercent(String(cfg.max_discount_percent ?? 0));
    setCustomInstructions(cfg.custom_instructions || "");
  }, []);

  const hydrateWaForm = useCallback((ch: MusicianWhatsAppChannelOut) => {
    setWaChannel(ch);
    setWaPhoneNumberId(ch.phone_number_id || "");
    setWaWabaId(ch.waba_id || "");
    setWaDisplayPhone(ch.display_phone || "");
    setWaIsActive(ch.is_active);
    setWaAutoPause(ch.auto_pause_on_human_reply);
    setWaIgnoreMembers(ch.ignore_ensemble_members);
    setWaIgnorePersonal(ch.ignore_personal_chats);
    setWaIgnoredPhonesText((ch.ignored_phones || []).join(", "));
  }, []);

  const loadAll = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const [profilesList, cfg, wa, convs, pendingList] = await Promise.all([
        listMyMusicianProfiles().catch(() => [] as MusicianProfileSummary[]),
        getAssistantConfig(activeProfileId),
        getWhatsAppChannel(),
        listAssistantConversations(),
        // Las dudas pendientes solo alimentan la pestaña nueva: si fallan, el resto sigue cargando.
        listAssistantPending(activeProfileId).catch(
          () => [] as AssistantPendingQuestion[],
        ),
      ]);
      setMyProfiles(profilesList);
      setPendingQuestions(pendingList);
      if (!selectedProfileId && cfg.profile_id) {
        setSelectedProfileId(cfg.profile_id);
      }
      hydrateConfigForm(cfg);
      hydrateWaForm(wa);
      setConversations(convs);
      const latestSim = convs.find(
        (c) =>
          c.channel === "simulator" &&
          (!cfg.profile_id || c.profile_id === cfg.profile_id),
      );
      setSimConversation(latestSim || null);
      setSimBookingUrl(latestSim?.last_booking_link_url || null);
      setSimQuoteSummary(
        typeof latestSim?.extracted_data?.quote_summary === "string"
          ? latestSim.extracted_data.quote_summary
          : null,
      );
      if (convs.length > 0 && !selectedConvId) {
        setSelectedConvId(convs[0].id);
      }
    } catch (err: unknown) {
      addToast({
        title: "No se pudo cargar el asistente",
        description: (err as Error).message || "Intenta recargar la página.",
        color: "danger",
      });
    } finally {
      setLoadingConfig(false);
    }
  }, [activeProfileId, hydrateConfigForm, hydrateWaForm, selectedConvId, selectedProfileId]);

  useEffect(() => {
    void Promise.resolve().then(() => loadAll());
  }, [loadAll]);

  useEffect(() => {
    const handleProfileSwitch = () => {
      setSelectedProfileId(null);
      void loadAll();
    };
    window.addEventListener(
      PROFILE_VERIFICATION_INVALIDATED_EVENT,
      handleProfileSwitch,
    );
    return () =>
      window.removeEventListener(
        PROFILE_VERIFICATION_INVALIDATED_EVENT,
        handleProfileSwitch,
      );
  }, [loadAll]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [simConversation?.messages]);

  // Las reglas del formulario ya limpiadas, tal como se guardan. Las usan el guardado y las vistas previas.
  const buildConfigPayload = (): MusicianAssistantConfigUpdate => {
    const cleanedPackages = packages
      .filter((p) => p.name.trim() && Number(p.price) >= 10)
      .map((p, idx) => ({
        id: p.id || `pkg-${idx + 1}`,
        name: p.name.trim(),
        members_count: Math.max(1, Number(p.members_count) || 1),
        duration_hours: Math.max(0.25, Number(p.duration_hours) || 1),
        price: Number(p.price),
        description: p.description?.trim() || null,
      }));

    const cleanedZones = zoneSurcharges
      .filter((z) => z.zone.trim())
      .map((z) => ({
        zone: z.zone.trim(),
        surcharge: Math.max(0, Number(z.surcharge) || 0),
        distance_km:
          z.distance_km != null && String(z.distance_km) !== ""
            ? Math.max(0, Number(z.distance_km))
            : null,
      }));

    return {
      enabled,
      greeting_message: greetingMessage.trim() || null,
      packages: cleanedPackages,
      additional_hour_price: additionalHourPrice.trim()
        ? Number(additionalHourPrice)
        : null,
      zone_surcharges: cleanedZones,
      per_km_rate: perKmRate.trim() ? Number(perKmRate) : null,
      night_surcharge_amount: Math.max(0, Number(nightSurchargeAmount) || 0),
      night_surcharge_start_hour: Math.min(
        23,
        Math.max(0, Number(nightSurchargeStartHour) || 23),
      ),
      special_date_surcharge_percent: Math.min(
        200,
        Math.max(0, Number(specialDatePercent) || 0),
      ),
      max_discount_amount: Math.max(0, Number(maxDiscountAmount) || 0),
      max_discount_percent: Math.min(
        80,
        Math.max(0, Number(maxDiscountPercent) || 0),
      ),
      custom_instructions: customInstructions.trim() || null,
    };
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      // Sin tono, voz ni reglas de aviso: el servidor los conserva tal como están.
      const updated = await updateAssistantConfig(
        buildConfigPayload(),
        activeProfileId,
      );
      hydrateConfigForm(updated);
      addToast({
        title: "Entrenamiento guardado",
        description: `El asistente de "${updated.profile_stage_name || activeProfileName}" ya usa tus nuevas reglas.`,
        color: "success",
      });
    } catch (err: unknown) {
      addToast({
        title: "Error al guardar",
        description:
          (err as Error).message || "Revisa los valores ingresados.",
        color: "danger",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendSimulation = async (
    overrideText?: string,
    resetChat = false,
    audioBase64?: string,
    audioMimeType?: string,
  ) => {
    const textToSend = (overrideText ?? simInput).trim();
    if (!textToSend && !audioBase64 && !resetChat) return;
    if (!overrideText) setSimInput("");

    setSimSending(true);
    try {
      const res = await simulateAssistantChat({
        profile_id: activeProfileId,
        conversation_id: resetChat ? null : simConversation?.id || null,
        message:
          textToSend ||
          (resetChat
            ? "Hola, quisiera información para un evento"
            : null),
        audio_base64: audioBase64 || null,
        audio_mime_type: audioMimeType || null,
        reset: resetChat,
      });
      setSimConversation(res.conversation);
      setSimQuoteSummary(res.quote_summary || null);
      setSimBookingUrl(res.booking_link_url || null);
      // Refrescar lista de conversaciones
      const convs = await listAssistantConversations();
      setConversations(convs);
    } catch (err: unknown) {
      addToast({
        title: "Error en el simulador",
        description: (err as Error).message || "Intenta enviar nuevamente.",
        color: "danger",
      });
    } finally {
      setSimSending(false);
    }
  };

  const handleToggleSimAudio = async () => {
    if (isRecordingSim) {
      mediaRecorderRef.current?.stop();
      setIsRecordingSim(false);
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      addToast({
        title: "Micrófono no disponible",
        description: "Usa el campo de texto para probar el simulador.",
        color: "warning",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64DataUrl =
            typeof reader.result === "string" ? reader.result : "";
          if (base64DataUrl) {
            void handleSendSimulation("", false, base64DataUrl, mimeType);
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingSim(true);
    } catch {
      addToast({
        title: "No se pudo acceder al micrófono",
        description: "Verifica los permisos de tu navegador.",
        color: "warning",
      });
    }
  };

  const handleSaveWhatsApp = async () => {
    setSavingWa(true);
    try {
      const ignoredList = waIgnoredPhonesText
        .split(/[,\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await updateWhatsAppChannel({
        phone_number_id: waPhoneNumberId.trim() || null,
        waba_id: waWabaId.trim() || null,
        display_phone: waDisplayPhone.trim() || null,
        access_token: waAccessToken.trim() ? waAccessToken.trim() : undefined,
        is_active: waIsActive,
        auto_pause_on_human_reply: waAutoPause,
        ignore_ensemble_members: waIgnoreMembers,
        ignore_personal_chats: waIgnorePersonal,
        ignored_phones: ignoredList,
      });
      hydrateWaForm(updated);
      setWaAccessToken("");
      addToast({
        title: "Configuración de WhatsApp actualizada",
        description: "Tus reglas y credenciales de Meta Cloud API se guardaron.",
        color: "success",
      });
    } catch (err: unknown) {
      addToast({
        title: "No se pudo guardar WhatsApp",
        description: (err as Error).message || "Intenta nuevamente.",
        color: "danger",
      });
    } finally {
      setSavingWa(false);
    }
  };

  const handleToggleConvStatus = async (conv: AssistantConversationOut) => {
    const nextStatus =
      conv.status === "bot_active" ? "paused_by_musician" : "bot_active";
    try {
      const updated = await updateAssistantConversationStatus(
        conv.id,
        nextStatus,
      );
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      addToast({
        title:
          nextStatus === "bot_active"
            ? "Asistente IA reactivado en este chat"
            : "Asistente IA pausado en este chat",
        color: "success",
      });
    } catch (err: unknown) {
      addToast({
        title: "Error al cambiar estado",
        description: (err as Error).message,
        color: "danger",
      });
    }
  };

  // Un ajuste de protección de WhatsApp hecho desde «Cómo atiende»: mismo dato y mismo endpoint que la pestaña de WhatsApp.
  const handleChannelChange = async (patch: MusicianWhatsAppChannelUpdate) => {
    try {
      const updated = await updateWhatsAppChannel(patch);
      setWaChannel(updated);
      if (patch.is_active !== undefined) setWaIsActive(updated.is_active);
      if (patch.auto_pause_on_human_reply !== undefined)
        setWaAutoPause(updated.auto_pause_on_human_reply);
      if (patch.ignore_ensemble_members !== undefined)
        setWaIgnoreMembers(updated.ignore_ensemble_members);
      if (patch.ignore_personal_chats !== undefined)
        setWaIgnorePersonal(updated.ignore_personal_chats);
      addToast({ title: "Ajuste de WhatsApp guardado", color: "success" });
    } catch (err: unknown) {
      addToast({
        title: "No se pudo guardar el ajuste",
        description: (err as Error).message || "Intenta nuevamente.",
        color: "danger",
      });
    }
  };

  // Tras restaurar una versión hay que volver a leer la configuración y rehacer el formulario.
  const handleVersionRestored = async (restoredNumber: number) => {
    const fresh = await getAssistantConfig(activeProfileId);
    hydrateConfigForm(fresh);
    addToast({
      title: `Versión ${restoredNumber} restaurada`,
      description: "Tu asistente ya usa esa configuración.",
      color: "success",
    });
  };

  const handleOpenConversation = (conversationId: string) => {
    setSelectedConvId(conversationId);
    setActiveTab("conversations");
  };

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    let nextIdx = idx;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft")
      nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = TABS.length - 1;
    else return;

    e.preventDefault();
    const nextKey = TABS[nextIdx].key;
    setActiveTab(nextKey);
    tabRefs.current[nextKey]?.focus();
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="Cargando tu Asistente IA..." />
      </div>
    );
  }

  const selectedConversation =
    conversations.find((c) => c.id === selectedConvId) ||
    conversations[0] ||
    null;

  const conversationsNeedingYou = conversationsNeedingMusician(
    conversations,
    activeProfileId,
  );
  const pendingBadgeCount =
    pendingQuestions.length + conversationsNeedingYou.length;

  // Reglas del formulario (sin guardar) para las vistas previas, y si difieren de lo guardado.
  const formPayload = buildConfigPayload();
  const formDiffersFromSaved = pricingDiffersFromSaved(formPayload, config);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera con contexto del perfil activo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-default-200 bg-content1 p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Icon icon="material-symbols:smart-toy-rounded" width={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-foreground">
                Asistente IA de Ventas y Contratas
              </h1>
              <Chip size="sm" color="primary" variant="flat">
                Perfil: {config?.profile_stage_name || activeProfileName}
              </Chip>
            </div>
            <p className="text-xs sm:text-sm text-default-500 mt-1">
              Responde consultas por WhatsApp, revisa tu calendario en tiempo
              real, cotiza según integrantes/ubicación y envía el link de
              contrato pre-llenado en Chivapp.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            isSelected={enabled}
            onValueChange={setEnabled}
            color="success"
            size="sm"
            aria-label="Activar asistente para este perfil"
          >
            <span className="text-xs font-semibold">
              {enabled ? "IA Activa en este perfil" : "IA Pausada"}
            </span>
          </Switch>
        </div>
      </div>

      {/* En «Inicio» el aviso de uso va dentro de la propia pestaña. */}
      {activeTab !== "home" && (
        <AssistantUsageBanner
          refreshKey={simConversation?.messages?.length ?? 0}
        />
      )}

      {/* Pestañas accesibles con roving tabindex */}
      <div
        role="tablist"
        aria-label="Secciones del Asistente IA"
        className="flex flex-wrap gap-2 border-b border-default-200 pb-2"
      >
        {TABS.map((tab, idx) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              id={`${baseId}-tab-${tab.key}`}
              role="tab"
              type="button"
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${tab.key}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-default-100/70 text-default-600 hover:bg-default-200/70"
              }`}
            >
              <Icon icon={tab.icon} width={18} />
              <span>{tab.label}</span>
              {tab.key === "conversations" && conversations.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[11px] rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-default-200 text-default-700"
                  }`}
                >
                  {conversations.length}
                </span>
              )}
              {tab.key === "pending" && pendingBadgeCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[11px] rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-warning-100 text-warning-700"
                  }`}
                >
                  {pendingBadgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* INICIO: preparación del asistente */}
      <div
        id={`${baseId}-panel-home`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-home`}
        hidden={activeTab !== "home"}
      >
        {activeTab === "home" && (
          <AssistantHomeTab
            profileId={activeProfileId}
            usageRefreshKey={simConversation?.messages?.length ?? 0}
            onGoTo={setActiveTab}
          />
        )}
      </div>

      {/* CÓMO ATIENDE: recorrido del asistente y cuándo te avisa */}
      <div
        id={`${baseId}-panel-flow`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-flow`}
        hidden={activeTab !== "flow"}
      >
        {activeTab === "flow" && (
          <AssistantFlowTab
            config={config}
            profileId={activeProfileId}
            channel={waChannel}
            onChannelChange={handleChannelChange}
            onConfigSaved={setConfig}
            onGoTo={setActiveTab}
          />
        )}
      </div>

      {/* TAB 1: ENTRENAMIENTO + SIMULADOR EN VIVO */}
      <div
        id={`${baseId}-panel-training`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-training`}
        hidden={activeTab !== "training"}
      >
        {activeTab === "training" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna izquierda: Reglas de precios y entrenamiento */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Vista previa de cómo cotiza el asistente con las reglas en pantalla */}
              <QuotePreviewCard
                payload={formPayload}
                profileId={activeProfileId}
              />
              {formDiffersFromSaved && (
                <ChangesPreviewCard
                  payload={formPayload}
                  profileId={activeProfileId}
                />
              )}

              {/* 1. Paquetes por integrantes y duración */}
              <Card className="border border-default-200 shadow-xs">
                <CardBody className="flex flex-col gap-4 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Icon
                          icon="lucide:users"
                          className="text-primary"
                          width={18}
                        />
                        1. Tarifas por cantidad de integrantes y duración
                      </h2>
                      <p className="text-xs text-default-500">
                        Configura cuánto cobras según el número de músicos y las
                        horas de show.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      startContent={<Icon icon="lucide:plus" width={15} />}
                      onPress={() =>
                        setPackages((prev) => [
                          ...prev,
                          {
                            id: `pkg-${Date.now()}`,
                            name: "Nuevo formato",
                            members_count: 5,
                            duration_hours: 1,
                            price: 400,
                            description: "",
                          },
                        ])
                      }
                    >
                      Agregar paquete
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {packages.map((pkg, idx) => (
                      <div
                        key={pkg.id || idx}
                        className="rounded-xl border border-default-200 bg-default-50/50 p-3.5 flex flex-col gap-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                          <div className="sm:col-span-5">
                            <Input
                              label="Nombre del paquete"
                              size="sm"
                              variant="bordered"
                              value={pkg.name}
                              onValueChange={(v) =>
                                setPackages((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, name: v } : item,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              label="Integrantes"
                              type="number"
                              min={1}
                              max={50}
                              size="sm"
                              variant="bordered"
                              value={String(pkg.members_count)}
                              onValueChange={(v) =>
                                setPackages((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          members_count: Number(v) || 1,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              label="Horas"
                              type="number"
                              step="0.5"
                              min={0.5}
                              max={12}
                              size="sm"
                              variant="bordered"
                              value={String(pkg.duration_hours)}
                              onValueChange={(v) =>
                                setPackages((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          duration_hours: Number(v) || 1,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              label="Precio (S/)"
                              type="number"
                              min={10}
                              size="sm"
                              variant="bordered"
                              value={String(pkg.price)}
                              onValueChange={(v) =>
                                setPackages((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, price: Number(v) || 0 }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            <Button
                              isIconOnly
                              size="sm"
                              color="danger"
                              variant="light"
                              aria-label="Eliminar paquete"
                              isDisabled={packages.length <= 1}
                              onPress={() =>
                                setPackages((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                            >
                              <Icon icon="lucide:trash-2" width={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <Input
                      label="Precio hora adicional (S/)"
                      type="number"
                      min={0}
                      size="sm"
                      variant="bordered"
                      placeholder="Ej. 250"
                      value={additionalHourPrice}
                      onValueChange={setAdditionalHourPrice}
                    />
                    <Input
                      label="Recargo nocturno (S/)"
                      type="number"
                      min={0}
                      size="sm"
                      variant="bordered"
                      placeholder="Ej. 50"
                      value={nightSurchargeAmount}
                      onValueChange={setNightSurchargeAmount}
                    />
                    <Input
                      label="Hora inicio nocturno (0-23h)"
                      type="number"
                      min={0}
                      max={23}
                      size="sm"
                      variant="bordered"
                      value={nightSurchargeStartHour}
                      onValueChange={setNightSurchargeStartHour}
                    />
                  </div>
                </CardBody>
              </Card>

              {/* 2. Movilidad por Zonas / Distritos */}
              <Card className="border border-default-200 shadow-xs">
                <CardBody className="flex flex-col gap-4 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Icon
                          icon="lucide:map-pin"
                          className="text-primary"
                          width={18}
                        />
                        2. Zonas de cobertura y recargo por movilidad
                      </h2>
                      <p className="text-xs text-default-500">
                        Si un cliente pide un evento fuera de tus zonas, el
                        asistente guardará los datos y te avisará para que tú
                        confirmes el traslado.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      startContent={<Icon icon="lucide:plus" width={15} />}
                      onPress={() =>
                        setZoneSurcharges((prev) => [
                          ...prev,
                          { zone: "", surcharge: 30, distance_km: 5 },
                        ])
                      }
                    >
                      Agregar zona
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {zoneSurcharges.map((z, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                      >
                        <div className="sm:col-span-6">
                          <Input
                            label="Distrito / Zona / Ciudad"
                            placeholder="Ej. Carmen Alto, San Juan Bautista"
                            size="sm"
                            variant="bordered"
                            value={z.zone}
                            onValueChange={(v) =>
                              setZoneSurcharges((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, zone: v } : item,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <Input
                            label="Recargo movilidad (S/)"
                            type="number"
                            min={0}
                            size="sm"
                            variant="bordered"
                            value={String(z.surcharge)}
                            onValueChange={(v) =>
                              setZoneSurcharges((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, surcharge: Number(v) || 0 }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          <Button
                            isIconOnly
                            size="sm"
                            color="danger"
                            variant="light"
                            aria-label="Eliminar zona"
                            onPress={() =>
                              setZoneSurcharges((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            <Icon icon="lucide:trash-2" width={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              {/* 3. Negociación, Descuentos e Instrucciones libres */}
              <Card className="border border-default-200 shadow-xs">
                <CardBody className="flex flex-col gap-4 p-5">
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Icon
                        icon="lucide:handshake"
                        className="text-primary"
                        width={18}
                      />
                      3. Margen de negociación e instrucciones personalizadas
                    </h2>
                    <p className="text-xs text-default-500">
                      Define cuánto descuento máximo puede ofrecer la IA si el
                      cliente pide rebaja, y escribe reglas en tus propias
                      palabras.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Descuento máx. en soles (S/)"
                      type="number"
                      min={0}
                      size="sm"
                      variant="bordered"
                      value={maxDiscountAmount}
                      onValueChange={setMaxDiscountAmount}
                    />
                    <Input
                      label="Descuento máx. (%)"
                      type="number"
                      min={0}
                      max={80}
                      size="sm"
                      variant="bordered"
                      value={maxDiscountPercent}
                      onValueChange={setMaxDiscountPercent}
                    />
                    <Input
                      label="Recargo Día de la Madre/Navidad (%)"
                      type="number"
                      min={0}
                      max={200}
                      size="sm"
                      variant="bordered"
                      value={specialDatePercent}
                      onValueChange={setSpecialDatePercent}
                    />
                  </div>

                  <Input
                    label="Mensaje de saludo inicial"
                    size="sm"
                    variant="bordered"
                    value={greetingMessage}
                    onValueChange={setGreetingMessage}
                  />

                  <Textarea
                    label="Instrucciones libres para tu asistente (en tus propias palabras)"
                    placeholder="Ej: Si piden serenata de lunes a jueves antes de las 9pm puedes ofrecer 1 canción extra de regalo. Menciona siempre que vamos con traje de gala completo y equipo de sonido propio."
                    minRows={3}
                    variant="bordered"
                    value={customInstructions}
                    onValueChange={setCustomInstructions}
                  />

                  <div className="flex justify-end">
                    <Button
                      color="primary"
                      isLoading={savingConfig}
                      onPress={handleSaveConfig}
                      startContent={
                        !savingConfig ? (
                          <Icon icon="lucide:save" width={16} />
                        ) : undefined
                      }
                    >
                      Guardar entrenamiento del perfil
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Columna derecha: Simulador de WhatsApp en Vivo */}
            <div className="lg:col-span-5 lg:sticky lg:top-6">
              <Card className="border border-primary/30 shadow-md overflow-hidden">
                <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Icon icon="ic:baseline-whatsapp" width={22} />
                    <div>
                      <p className="text-sm font-bold leading-tight">
                        Simulador de Cliente en Vivo
                      </p>
                      <p className="text-[11px] text-emerald-100">
                        Prueba cómo responde y genera el link pre-llenado
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    className="bg-white/15 text-white text-xs"
                    onPress={() => void handleSendSimulation("", true)}
                  >
                    Reiniciar
                  </Button>
                </div>

                <CardBody className="p-0 flex flex-col">
                  {/* Botones de prueba rápida */}
                  <div className="px-3 py-2 bg-default-100/80 border-b border-default-200 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        void handleSendSimulation(
                          "Hola, cuánto me cuesta una serenata de cumpleaños para este sábado a las 9pm",
                        )
                      }
                      className="text-[11px] bg-content1 hover:bg-primary/10 border border-default-200 rounded-full px-2.5 py-1 text-default-700 cursor-pointer"
                    >
                      💬 Cotizar cumpleaños sábado 9pm
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleSendSimulation(
                          "Será en Av. Mariscal Cáceres 820, Huamanga. Soy Carlos Pérez",
                        )
                      }
                      className="text-[11px] bg-content1 hover:bg-primary/10 border border-default-200 rounded-full px-2.5 py-1 text-default-700 cursor-pointer"
                    >
                      📍 Dar dirección y generar link
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleSendSimulation(
                          "¿Me puedes hacer un descuentito por favor?",
                        )
                      }
                      className="text-[11px] bg-content1 hover:bg-primary/10 border border-default-200 rounded-full px-2.5 py-1 text-default-700 cursor-pointer"
                    >
                      🤝 Probar regateo
                    </button>
                  </div>

                  {/* Historial de mensajes */}
                  <div
                    ref={chatScrollRef}
                    className="h-[360px] overflow-y-auto p-4 flex flex-col gap-3 bg-default-50/60"
                  >
                    {(!simConversation ||
                      simConversation.messages.length === 0) && (
                      <div className="my-auto text-center text-xs text-default-500 px-4">
                        Escribe o graba un audio como si fueras un cliente
                        preguntando precio, fecha y lugar para ver cómo tu
                        asistente calcula la tarifa y crea el contrato en
                        Chivapp.
                      </div>
                    )}
                    {simConversation?.messages.map((msg, msgIdx, allMsgs) => {
                      const isClientMsg = msg.sender === "client";
                      // Mensaje del cliente al que responde este mensaje (para «Enseñarle esta respuesta»).
                      const previousClientText =
                        allMsgs
                          .slice(0, msgIdx)
                          .reverse()
                          .find((m) => m.sender === "client")?.text ?? null;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm whitespace-pre-line ${
                            isClientMsg
                              ? "self-end bg-emerald-600 text-white rounded-br-xs"
                              : "self-start bg-content1 border border-default-200 text-foreground rounded-bl-xs shadow-2xs"
                          }`}
                        >
                          {msg.media_type === "audio" && (
                            <span className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5 flex items-center gap-1">
                              <Icon icon="lucide:mic" width={12} /> Nota de voz
                              transcrita
                            </span>
                          )}
                          <span>{msg.text}</span>
                          {!isClientMsg && msg.trace && (
                            <div className="whitespace-normal">
                              <AssistantMessageTools
                                message={msg}
                                previousClientText={previousClientText}
                                profileId={activeProfileId}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {simSending && (
                      <div className="self-start bg-content1 border border-default-200 rounded-2xl px-3.5 py-2 text-xs text-default-500 flex items-center gap-2">
                        <Spinner size="sm" /> Revisando agenda y calculando...
                      </div>
                    )}
                  </div>

                  {/* Tarjeta del Link de Contrato generado en vivo */}
                  {(simQuoteSummary || simBookingUrl) && (
                    <div className="px-4 py-3 bg-success/10 border-t border-success/30 flex flex-col gap-2">
                      {simQuoteSummary && (
                        <p className="text-xs font-semibold text-foreground">
                          📊 {simQuoteSummary}
                        </p>
                      )}
                      {simBookingUrl && (
                        <div className="flex items-center justify-between gap-2 bg-content1 rounded-xl p-2.5 border border-success/40">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-success">
                              ¡Enlace de contrato pre-llenado creado!
                            </p>
                            <p className="text-xs truncate text-default-600">
                              {simBookingUrl}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              color="success"
                              variant="flat"
                              as="a"
                              href={simBookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Abrir link
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              aria-label="Copiar enlace generado"
                              onPress={() => {
                                navigator.clipboard.writeText(simBookingUrl);
                                addToast({
                                  title: "Enlace copiado",
                                  color: "success",
                                });
                              }}
                            >
                              <Icon icon="lucide:copy" width={15} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Barra de entrada con soporte IME-safe Enter y micrófono */}
                  <div className="p-3 bg-content1 border-t border-default-200 flex items-center gap-2">
                    <Button
                      isIconOnly
                      size="sm"
                      color={isRecordingSim ? "danger" : "default"}
                      variant={isRecordingSim ? "solid" : "flat"}
                      aria-label={
                        isRecordingSim
                          ? "Detener grabación de voz"
                          : "Enviar nota de voz al simulador"
                      }
                      onPress={handleToggleSimAudio}
                    >
                      <Icon
                        icon={isRecordingSim ? "lucide:square" : "lucide:mic"}
                        width={16}
                      />
                    </Button>
                    <input
                      type="text"
                      aria-label="Mensaje de prueba como cliente"
                      placeholder="Escribe como un cliente (Enter para enviar)..."
                      value={simInput}
                      onChange={(e) => setSimInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          void handleSendSimulation();
                        }
                      }}
                      className="flex-1 bg-default-100 rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      color="primary"
                      aria-label="Enviar mensaje al simulador"
                      isLoading={simSending}
                      onPress={() => void handleSendSimulation()}
                    >
                      <Icon icon="lucide:send" width={16} />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* LO QUE SABE: fuentes, contrata, entrevista y respuestas enseñadas */}
      <div
        id={`${baseId}-panel-knowledge`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-knowledge`}
        hidden={activeTab !== "knowledge"}
      >
        {activeTab === "knowledge" && (
          <AssistantKnowledgeTab profileId={activeProfileId} />
        )}
      </div>

      {/* CÓMO HABLA: tono y ejemplos de voz */}
      <div
        id={`${baseId}-panel-voice`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-voice`}
        hidden={activeTab !== "voice"}
      >
        {activeTab === "voice" && (
          <AssistantVoiceTab
            config={config}
            profileId={activeProfileId}
            onConfigSaved={setConfig}
            onGoTo={setActiveTab}
          />
        )}
      </div>

      {/* PENDIENTES: chats que esperan al músico y dudas sin responder */}
      <div
        id={`${baseId}-panel-pending`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-pending`}
        hidden={activeTab !== "pending"}
      >
        {activeTab === "pending" && (
          <AssistantPendingTab
            profileId={activeProfileId}
            conversations={conversationsNeedingYou}
            pending={pendingQuestions}
            onPendingResolved={(id) =>
              setPendingQuestions((prev) => prev.filter((q) => q.id !== id))
            }
            onOpenConversation={handleOpenConversation}
          />
        )}
      </div>

      {/* VERSIONES: copias de la configuración y restaurar */}
      <div
        id={`${baseId}-panel-versions`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-versions`}
        hidden={activeTab !== "versions"}
      >
        {activeTab === "versions" && (
          <AssistantVersionsTab
            profileId={activeProfileId}
            onRestored={handleVersionRestored}
          />
        )}
      </div>

      {/* TAB 2: CONEXIÓN WHATSAPP OFICIAL (META CLOUD API) */}
      <div
        id={`${baseId}-panel-whatsapp`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-whatsapp`}
        hidden={activeTab !== "whatsapp"}
      >
        {activeTab === "whatsapp" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7 border border-default-200 shadow-xs">
              <CardBody className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Icon
                        icon="ic:baseline-whatsapp"
                        className="text-emerald-600"
                        width={22}
                      />
                      Conectar tu número con Meta WhatsApp Cloud API
                    </h2>
                    <p className="text-xs text-default-500">
                      El asistente responderá desde tu propio número de WhatsApp
                      Business y conocerá todos tus perfiles publicados en
                      Chivapp.
                    </p>
                  </div>
                  <Chip
                    size="sm"
                    color={waChannel?.phone_number_id ? "success" : "warning"}
                    variant="flat"
                  >
                    {waChannel?.phone_number_id
                      ? "Vinculado"
                      : "Pendiente de vincular"}
                  </Chip>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Phone Number ID (Meta)"
                    placeholder="Ej. 105928374651928"
                    value={waPhoneNumberId}
                    onValueChange={setWaPhoneNumberId}
                    variant="bordered"
                    size="sm"
                  />
                  <Input
                    label="WhatsApp Business Account ID (WABA)"
                    placeholder="Ej. 109283746519283"
                    value={waWabaId}
                    onValueChange={setWaWabaId}
                    variant="bordered"
                    size="sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Número visible (Display Phone)"
                    placeholder="Ej. +51 987 654 321"
                    type="tel"
                    inputMode="tel"
                    value={waDisplayPhone}
                    onValueChange={setWaDisplayPhone}
                    variant="bordered"
                    size="sm"
                  />
                  <Input
                    label={
                      waChannel?.has_access_token
                        ? "Access Token permanente (Ya guardado — escribe para reemplazar)"
                        : "Access Token de Meta Cloud API"
                    }
                    type="password"
                    placeholder="EAAB..."
                    value={waAccessToken}
                    onValueChange={setWaAccessToken}
                    variant="bordered"
                    size="sm"
                  />
                </div>

                {waChannel && (
                  <div className="rounded-xl border border-default-200 bg-default-50 p-3.5 flex flex-col gap-2">
                    <p className="text-xs font-bold text-foreground">
                      Datos de Webhook para tu panel de Meta Developers:
                    </p>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-default-600 truncate">
                        <strong>Callback URL:</strong> {waChannel.webhook_url}
                      </span>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          navigator.clipboard.writeText(waChannel.webhook_url);
                          addToast({
                            title: "URL de Webhook copiada",
                            color: "success",
                          });
                        }}
                      >
                        Copiar URL
                      </Button>
                    </div>
                    {waChannel.webhook_verify_token && (
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-default-600 truncate">
                          <strong>Verify Token:</strong>{" "}
                          {waChannel.webhook_verify_token}
                        </span>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            navigator.clipboard.writeText(
                              waChannel.webhook_verify_token || "",
                            );
                            addToast({
                              title: "Verify Token copiado",
                              color: "success",
                            });
                          }}
                        >
                          Copiar Token
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    color="primary"
                    isLoading={savingWa}
                    onPress={handleSaveWhatsApp}
                  >
                    Guardar conexión de WhatsApp
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Reglas de protección de chats personales e integrantes */}
            <Card className="lg:col-span-5 border border-default-200 shadow-xs">
              <CardBody className="flex flex-col gap-4 p-5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Icon
                    icon="lucide:shield-check"
                    className="text-primary"
                    width={18}
                  />
                  Protección de chats personales e integrantes
                </h3>

                <Switch
                  isSelected={waIsActive}
                  onValueChange={setWaIsActive}
                  size="sm"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">
                      Responder automáticamente en WhatsApp
                    </span>
                    <span className="text-[11px] text-default-500">
                      Puedes apagarlo temporalmente cuando quieras.
                    </span>
                  </div>
                </Switch>

                <Switch
                  isSelected={waIgnoreMembers}
                  onValueChange={setWaIgnoreMembers}
                  size="sm"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">
                      Ignorar a los integrantes de mi agrupación
                    </span>
                    <span className="text-[11px] text-default-500">
                      La IA nunca responderá a los números registrados en tu
                      sección Integrantes.
                    </span>
                  </div>
                </Switch>

                <Switch
                  isSelected={waIgnorePersonal}
                  onValueChange={setWaIgnorePersonal}
                  size="sm"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">
                      Filtro inteligente de chats personales / familiares
                    </span>
                    <span className="text-[11px] text-default-500">
                      Solo interviene cuando el mensaje consulta por eventos,
                      precios, fechas o presentaciones.
                    </span>
                  </div>
                </Switch>

                <Switch
                  isSelected={waAutoPause}
                  onValueChange={setWaAutoPause}
                  size="sm"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">
                      Pausar IA automáticamente cuando yo escribo desde mi
                      celular
                    </span>
                    <span className="text-[11px] text-default-500">
                      Si intervienes manualmente en un chat, el bot se silencia
                      en esa conversación.
                    </span>
                  </div>
                </Switch>

                <Textarea
                  label="Números adicionales a excluir (separados por coma)"
                  placeholder="Ej. 999888777, 911222333"
                  minRows={2}
                  size="sm"
                  variant="bordered"
                  value={waIgnoredPhonesText}
                  onValueChange={setWaIgnoredPhonesText}
                />

                <Button
                  color="primary"
                  variant="flat"
                  isLoading={savingWa}
                  onPress={handleSaveWhatsApp}
                >
                  Actualizar reglas de privacidad
                </Button>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* TAB 3: CONVERSACIONES Y ENLACES GENERADOS */}
      <div
        id={`${baseId}-panel-conversations`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-conversations`}
        hidden={activeTab !== "conversations"}
      >
        {activeTab === "conversations" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-5 border border-default-200 shadow-xs">
              <CardBody className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">
                    Conversaciones recientes ({conversations.length})
                  </h2>
                  <Button
                    size="sm"
                    variant="light"
                    isLoading={loadingConversations}
                    onPress={async () => {
                      setLoadingConversations(true);
                      try {
                        const list = await listAssistantConversations();
                        setConversations(list);
                      } finally {
                        setLoadingConversations(false);
                      }
                    }}
                  >
                    Actualizar
                  </Button>
                </div>

                {conversations.length === 0 ? (
                  <p className="text-xs text-default-500 py-8 text-center">
                    Aún no hay conversaciones registradas. Prueba el simulador
                    en la primera pestaña.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto">
                    {conversations.map((conv) => {
                      const isSel = selectedConversation?.id === conv.id;
                      return (
                        <button
                          key={conv.id}
                          type="button"
                          onClick={() => setSelectedConvId(conv.id)}
                          className={`text-left rounded-xl p-3 border transition-colors cursor-pointer ${
                            isSel
                              ? "border-primary bg-primary/10"
                              : "border-default-200 bg-content1 hover:bg-default-100/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-foreground truncate">
                              {conv.client_name ||
                                conv.client_phone ||
                                "Cliente"}
                            </span>
                            <Chip
                              size="sm"
                              variant="flat"
                              color={
                                conv.status === "needs_musician"
                                  ? "warning"
                                  : conv.status === "bot_active"
                                    ? "success"
                                    : "default"
                              }
                            >
                              {conv.status === "needs_musician"
                                ? "Requiere tu atención"
                                : conv.status === "paused_by_musician"
                                  ? "Pausado por ti"
                                  : conv.status === "ignored_personal"
                                    ? "Personal (Ignorado)"
                                    : "IA Activa"}
                            </Chip>
                          </div>
                          <p className="text-[11px] text-default-500 mt-1 truncate">
                            {conv.channel === "whatsapp"
                              ? "📱 WhatsApp"
                              : "🧪 Simulador"}{" "}
                            · {conv.profile_stage_name || "Perfil"}
                          </p>
                          {conv.last_booking_link_url && (
                            <p className="text-[11px] font-semibold text-success mt-1">
                              ✓ Link de contrato generado
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="lg:col-span-7 border border-default-200 shadow-xs">
              <CardBody className="p-5 flex flex-col gap-4">
                {!selectedConversation ? (
                  <p className="text-xs text-default-500 py-12 text-center">
                    Selecciona una conversación para ver los datos extraídos y
                    el enlace generado.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default-200 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {selectedConversation.client_name ||
                            selectedConversation.client_phone ||
                            "Cliente"}
                        </h3>
                        <p className="text-xs text-default-500">
                          Atendido con el perfil:{" "}
                          <strong>
                            {selectedConversation.profile_stage_name ||
                              activeProfileName}
                          </strong>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        color={
                          selectedConversation.status === "bot_active"
                            ? "warning"
                            : "success"
                        }
                        variant="flat"
                        onPress={() =>
                          void handleToggleConvStatus(selectedConversation)
                        }
                      >
                        {selectedConversation.status === "bot_active"
                          ? "Pausar IA y tomar control"
                          : "Reactivar IA en este chat"}
                      </Button>
                    </div>

                    {selectedConversation.escalation_reason && (
                      <div className="rounded-xl bg-warning/15 border border-warning/30 p-3 text-xs text-warning-text">
                        <strong>Motivo de aviso:</strong>{" "}
                        {selectedConversation.escalation_reason}
                      </div>
                    )}

                    {/* Resumen de datos extraídos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-default-50 rounded-xl p-3 border border-default-200 text-xs">
                      <div>
                        <span className="text-default-500 block">Fecha:</span>
                        <strong>
                          {String(
                            selectedConversation.extracted_data?.event_date ||
                              "Por definir",
                          )}
                        </strong>
                      </div>
                      <div>
                        <span className="text-default-500 block">Hora:</span>
                        <strong>
                          {String(
                            selectedConversation.extracted_data?.start_time ||
                              "Por definir",
                          )}
                        </strong>
                      </div>
                      <div>
                        <span className="text-default-500 block">Evento:</span>
                        <strong>
                          {String(
                            selectedConversation.extracted_data?.event_type ||
                              "Por definir",
                          )}
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-default-500 block">
                          Dirección:
                        </span>
                        <strong>
                          {String(
                            selectedConversation.extracted_data
                              ?.location_address || "Por definir",
                          )}
                        </strong>
                      </div>
                      <div>
                        <span className="text-default-500 block">
                          Cotización:
                        </span>
                        <strong className="text-primary">
                          {selectedConversation.extracted_data?.calculated_price
                            ? formatCurrency(
                                Number(
                                  selectedConversation.extracted_data
                                    .calculated_price,
                                ),
                              )
                            : "—"}
                        </strong>
                      </div>
                    </div>

                    {selectedConversation.last_booking_link_url && (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-success/10 border border-success/30 p-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-success">
                            Enlace de contrato pre-llenado enviado al cliente
                          </p>
                          <p className="text-xs truncate text-default-600">
                            {selectedConversation.last_booking_link_url}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            color="success"
                            variant="flat"
                            as="a"
                            href={selectedConversation.last_booking_link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver contrato
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto p-3 rounded-xl bg-default-50/60 border border-default-200">
                      {selectedConversation.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-xl px-3 py-2 text-xs max-w-[85%] whitespace-pre-line ${
                            m.sender === "client"
                              ? "self-end bg-emerald-600 text-white"
                              : "self-start bg-content1 border border-default-200 text-foreground"
                          }`}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
