import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("./api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

import {
    answerAssistantPending,
    configToUpdate,
    createAssistantKnowledge,
    deleteAssistantKnowledge,
    dismissAssistantPending,
    getAssistantConfig,
    getAssistantReadiness,
    getAssistantUsage,
    getWhatsAppChannel,
    listAssistantConversations,
    listAssistantKnowledge,
    listAssistantPending,
    listAssistantVersions,
    previewAssistantCompare,
    previewAssistantQuote,
    restoreAssistantVersion,
    saveAssistantConfigChange,
    simulateAssistantChat,
    updateAssistantConfig,
    updateAssistantConversationStatus,
    updateAssistantKnowledge,
    updateWhatsAppChannel,
    type MusicianAssistantConfigOut,
} from "./assistant";

beforeEach(() => {
    apiFetch.mockReset();
});

const serverChannel = {
    connected: true,
    phone_number_id: "109876",
    waba_id: "waba-1",
    display_phone_number: "+51 999 888 777",
    has_access_token: true,
    is_active: true,
    auto_pause_on_human_reply: true,
    ignore_ensemble_members: true,
    ignore_personal_chats: true,
    ignored_phones: ["999000111"],
    webhook_url: "https://chiv.app/api/v1/whatsapp/webhook",
    verify_token: "verify-me",
    connected_at: "2026-11-16T10:00:00Z",
};

describe("cliente del asistente IA frente al contrato del servidor", () => {
    it("la configuración usa los nombres del servidor y la pantalla recibe los suyos", async () => {
        apiFetch.mockResolvedValueOnce({
            profile_id: "p-1",
            stage_name: "Los Test",
            location_city: "Lima",
            enabled: true,
            packages: [],
            zone_surcharges: [],
            night_surcharge_amount: 0,
            night_surcharge_start_hour: 23,
            special_date_surcharge_percent: 0,
            max_discount_amount: 0,
            max_discount_percent: 0,
        });

        const config = await getAssistantConfig("p-1");

        expect(apiFetch).toHaveBeenCalledWith("/assistant/config?profile_id=p-1");
        expect(config.profile_id).toBe("p-1");
        expect(config.profile_stage_name).toBe("Los Test");
        expect(config.profile_city).toBe("Lima");
    });

    it("el simulador arma la conversación con la respuesta del servidor y no le manda `reset`", async () => {
        apiFetch.mockResolvedValueOnce({
            conversation_id: "c-1",
            profile_id: "p-1",
            profile_name: "Los Test",
            status: "link_sent",
            reply: "Listo, aquí tu enlace",
            extracted_data: { calculated_price: 420 },
            quote_breakdown: { summary: "S/ 420.00 por 1 hora" },
            booking_link_token: "tok",
            booking_link_url: "https://chiv.app/pay/tok",
            messages: [{ id: "m1", sender: "client", text: "Hola", created_at: "2026-11-16T10:00:00Z" }],
        });

        const res = await simulateAssistantChat({ message: "Hola", conversation_id: null, reset: true });

        const [path, init] = apiFetch.mock.calls[0];
        expect(path).toBe("/assistant/simulate");
        expect(JSON.parse(init.body)).toEqual({ message: "Hola", conversation_id: null });
        expect(res.conversation.id).toBe("c-1");
        expect(res.conversation.messages).toHaveLength(1);
        expect(res.conversation.last_booking_link_url).toBe("https://chiv.app/pay/tok");
        expect(res.reply).toBe("Listo, aquí tu enlace");
        expect(res.calculated_price).toBe(420);
        expect(res.quote_summary).toBe("S/ 420.00 por 1 hora");
    });

    it("el canal de WhatsApp traduce nombres y verify token", async () => {
        apiFetch.mockResolvedValueOnce(serverChannel);

        const channel = await getWhatsAppChannel();

        expect(apiFetch).toHaveBeenCalledWith("/assistant/whatsapp");
        expect(channel.display_phone).toBe("+51 999 888 777");
        expect(channel.webhook_verify_token).toBe("verify-me");
    });

    it("guardar el canal conecta las credenciales (POST) y luego las reglas (PATCH)", async () => {
        apiFetch.mockResolvedValueOnce(serverChannel).mockResolvedValueOnce(serverChannel);

        const channel = await updateWhatsAppChannel({
            phone_number_id: "109876",
            waba_id: "waba-1",
            display_phone: "+51 999 888 777",
            access_token: "EAAB",
            is_active: true,
            ignored_phones: ["999000111"],
        });

        const [connectPath, connectInit] = apiFetch.mock.calls[0];
        expect(connectPath).toBe("/assistant/whatsapp/connect");
        expect(connectInit.method).toBe("POST");
        expect(JSON.parse(connectInit.body)).toEqual({
            phone_number_id: "109876",
            waba_id: "waba-1",
            display_phone_number: "+51 999 888 777",
            access_token: "EAAB",
        });
        const [settingsPath, settingsInit] = apiFetch.mock.calls[1];
        expect(settingsPath).toBe("/assistant/whatsapp/settings");
        expect(settingsInit.method).toBe("PATCH");
        expect(channel.display_phone).toBe("+51 999 888 777");
    });

    it("sin Phone Number ID solo se guardan las reglas", async () => {
        apiFetch.mockResolvedValueOnce({ ...serverChannel, phone_number_id: null, connected: false });

        await updateWhatsAppChannel({ phone_number_id: null, is_active: false });

        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(apiFetch.mock.calls[0][0]).toBe("/assistant/whatsapp/settings");
    });

    it("las conversaciones traen el nombre del perfil y el enlace de pago completo", async () => {
        apiFetch.mockResolvedValueOnce([
            {
                id: "c-1",
                profile_name: "Los Test",
                channel: "whatsapp",
                status: "bot_active",
                extracted_data: {},
                messages: [],
                last_booking_link_token: "tok",
            },
        ]);

        const [conversation] = await listAssistantConversations();

        expect(conversation.profile_stage_name).toBe("Los Test");
        expect(conversation.last_booking_link_url).toMatch(/\/pay\/tok$/);
    });

    it("pausar o reactivar un chat usa PATCH", async () => {
        apiFetch.mockResolvedValueOnce({
            id: "c-1",
            channel: "whatsapp",
            status: "paused_by_musician",
            extracted_data: {},
            messages: [],
        });

        const updated = await updateAssistantConversationStatus("c-1", "paused_by_musician");

        const [path, init] = apiFetch.mock.calls[0];
        expect(path).toBe("/assistant/conversations/c-1/status");
        expect(init.method).toBe("PATCH");
        expect(updated.status).toBe("paused_by_musician");
    });

    it("el uso mensual se pide a /assistant/usage", async () => {
        apiFetch.mockResolvedValueOnce({ ai_calls_used: 3, ai_calls_limit: 300, audio_used: 0, audio_limit: 60 });

        const usage = await getAssistantUsage();

        expect(apiFetch).toHaveBeenCalledWith("/assistant/usage");
        expect(usage.ai_calls_limit).toBe(300);
    });

    it("la configuración trae tono, ejemplos de voz y reglas de aviso sin perderlos", async () => {
        const escalation_rules = { big_event_on: true, big_event_guests: 150, special_date_on: false, unknown_question_on: true };
        apiFetch.mockResolvedValueOnce({
            profile_id: "p-1",
            enabled: true,
            packages: [],
            zone_surcharges: [],
            night_surcharge_amount: 0,
            night_surcharge_start_hour: 23,
            special_date_surcharge_percent: 0,
            max_discount_amount: 0,
            max_discount_percent: 0,
            tone: "formal",
            voice_examples: ["Con gusto, ya te cuento"],
            escalation_rules,
        });

        const config = await getAssistantConfig("p-1");

        expect(config.tone).toBe("formal");
        expect(config.voice_examples).toEqual(["Con gusto, ya te cuento"]);
        expect(config.escalation_rules).toEqual(escalation_rules);
    });

    it("guardar un cambio reenvía la configuración completa con ese cambio", async () => {
        const saved: MusicianAssistantConfigOut = {
            id: "p-1",
            profile_id: "p-1",
            enabled: true,
            greeting_message: "Hola",
            packages: [{ id: "k4", name: "Show estándar", members_count: 4, duration_hours: 1, price: 450 }],
            additional_hour_price: 200,
            zone_surcharges: [{ zone: "Surco", surcharge: 0 }],
            per_km_rate: null,
            night_surcharge_amount: 50,
            night_surcharge_start_hour: 23,
            special_date_surcharge_percent: 15,
            max_discount_amount: 30,
            max_discount_percent: 10,
            custom_instructions: "Sé amable",
            tone: "cercano",
            voice_examples: ["Perfecto, lo dejo anotado."],
            escalation_rules: { big_event_on: false, big_event_guests: 100, special_date_on: false, unknown_question_on: true },
            updated_at: "",
        };
        apiFetch.mockResolvedValueOnce({ ...saved, tone: "breve" });

        const updated = await saveAssistantConfigChange(saved, { tone: "breve" });

        const [path, init] = apiFetch.mock.calls[0];
        expect(path).toBe("/assistant/config?profile_id=p-1");
        expect(init.method).toBe("PUT");
        const body = JSON.parse(init.body);
        expect(body).toEqual({ ...configToUpdate(saved), tone: "breve" });
        expect(body.packages).toHaveLength(1);
        expect(body.zone_surcharges).toEqual([{ zone: "Surco", surcharge: 0 }]);
        expect(body.voice_examples).toEqual(["Perfecto, lo dejo anotado."]);
        expect(body.escalation_rules.unknown_question_on).toBe(true);
        expect(updated.tone).toBe("breve");
    });

    it("el guardado clásico sigue sin mandar tono, voz ni reglas (el servidor los conserva)", async () => {
        apiFetch.mockResolvedValueOnce({ profile_id: "p-1", enabled: true, packages: [], zone_surcharges: [] });

        await updateAssistantConfig({ enabled: true, greeting_message: "Hola" }, "p-1");

        const body = JSON.parse(apiFetch.mock.calls[0][1].body);
        expect(body).toEqual({ enabled: true, greeting_message: "Hola" });
    });

    it("el conocimiento se lista, crea, edita y borra en /assistant/knowledge", async () => {
        const entry = {
            id: "k-1",
            question: "¿Pueden pedir canciones especiales?",
            answer: "Sí, hasta 3.",
            source: "entrevista",
            created_at: "2026-11-16T10:00:00Z",
            updated_at: "2026-11-16T10:00:00Z",
        };
        apiFetch
            .mockResolvedValueOnce([entry])
            .mockResolvedValueOnce(entry)
            .mockResolvedValueOnce({ ...entry, answer: "Sí, hasta 4." })
            .mockResolvedValueOnce(undefined);

        const list = await listAssistantKnowledge("p-1");
        expect(apiFetch.mock.calls[0][0]).toBe("/assistant/knowledge?profile_id=p-1");
        expect(list[0].source).toBe("entrevista");

        await createAssistantKnowledge({ question: entry.question, answer: entry.answer, source: "entrevista" }, "p-1");
        const [createPath, createInit] = apiFetch.mock.calls[1];
        expect(createPath).toBe("/assistant/knowledge?profile_id=p-1");
        expect(createInit.method).toBe("POST");
        expect(JSON.parse(createInit.body)).toEqual({
            question: entry.question,
            answer: entry.answer,
            source: "entrevista",
        });

        const edited = await updateAssistantKnowledge("k-1", { question: entry.question, answer: "Sí, hasta 4." });
        const [putPath, putInit] = apiFetch.mock.calls[2];
        expect(putPath).toBe("/assistant/knowledge/k-1");
        expect(putInit.method).toBe("PUT");
        expect(JSON.parse(putInit.body)).toEqual({ question: entry.question, answer: "Sí, hasta 4." });
        expect(edited.answer).toBe("Sí, hasta 4.");

        await deleteAssistantKnowledge("k-1", "p-1");
        const [delPath, delInit] = apiFetch.mock.calls[3];
        expect(delPath).toBe("/assistant/knowledge/k-1?profile_id=p-1");
        expect(delInit.method).toBe("DELETE");
    });

    it("sin perfil elegido, las rutas de conocimiento no llevan query", async () => {
        apiFetch.mockResolvedValueOnce([]);

        await listAssistantKnowledge();

        expect(apiFetch).toHaveBeenCalledWith("/assistant/knowledge");
    });

    it("el 422 del servidor llega como error con su mensaje en español", async () => {
        const detail = "El pago y la cancelación los define tu contrata; el asistente ya responde desde ahí.";
        apiFetch.mockRejectedValueOnce(Object.assign(new Error(detail), { status: 422 }));

        await expect(createAssistantKnowledge({ question: "¿Piden anticipo?", answer: "Sí, la mitad." })).rejects.toThrow(
            detail
        );
    });

    it("las dudas pendientes se listan, responden (POST answer) y descartan (POST dismiss)", async () => {
        const pending = {
            id: "q-1",
            question: "¿Pueden tocar en la playa?",
            context: "Queremos algo en la playa",
            asked_count: 3,
            status: "open",
            conversation_id: "c-1",
            created_at: "2026-11-16T10:00:00Z",
        };
        apiFetch
            .mockResolvedValueOnce([pending])
            .mockResolvedValueOnce({ id: "k-9", question: pending.question, answer: "Sí, con sonido propio.", source: "conversacion" })
            .mockResolvedValueOnce(undefined);

        const list = await listAssistantPending("p-1");
        expect(apiFetch.mock.calls[0][0]).toBe("/assistant/pending?profile_id=p-1");
        expect(list[0].asked_count).toBe(3);

        await answerAssistantPending("q-1", "Sí, con sonido propio.", "p-1");
        const [answerPath, answerInit] = apiFetch.mock.calls[1];
        expect(answerPath).toBe("/assistant/pending/q-1/answer?profile_id=p-1");
        expect(answerInit.method).toBe("POST");
        expect(JSON.parse(answerInit.body)).toEqual({ answer: "Sí, con sonido propio." });

        await dismissAssistantPending("q-1", "p-1");
        const [dismissPath, dismissInit] = apiFetch.mock.calls[2];
        expect(dismissPath).toBe("/assistant/pending/q-1/dismiss?profile_id=p-1");
        expect(dismissInit.method).toBe("POST");
        expect(dismissInit.body).toBeUndefined();
    });

    it("las versiones se listan y se restauran con POST", async () => {
        apiFetch
            .mockResolvedValueOnce([{ number: 3, label: "Restaurada", package_count: 2, tone: "cercano", is_current: true }])
            .mockResolvedValueOnce({ number: 4, label: "Restaurada desde la 2", package_count: 2, tone: "formal", is_current: true });

        const versions = await listAssistantVersions("p-1");
        expect(apiFetch.mock.calls[0][0]).toBe("/assistant/versions?profile_id=p-1");
        expect(versions[0].is_current).toBe(true);

        const restored = await restoreAssistantVersion(2, "p-1");
        const [path, init] = apiFetch.mock.calls[1];
        expect(path).toBe("/assistant/versions/2/restore?profile_id=p-1");
        expect(init.method).toBe("POST");
        expect(restored.number).toBe(4);
    });

    it("la preparación se pide a /assistant/readiness", async () => {
        apiFetch.mockResolvedValueOnce({
            score: 62,
            items: [{ key: "pricing", title: "Precios", detail: "2 paquetes", progress: 1, weight: 25 }],
        });

        const readiness = await getAssistantReadiness("p-1");

        expect(apiFetch).toHaveBeenCalledWith("/assistant/readiness?profile_id=p-1");
        expect(readiness.score).toBe(62);
        expect(readiness.items[0].key).toBe("pricing");
    });

    it("la vista previa de cotización manda la configuración sin guardar y los datos del caso", async () => {
        apiFetch.mockResolvedValueOnce({
            total: 480,
            package_name: "Show estándar",
            summary: "S/ 480.00",
            lines: [{ label: "Show estándar", amount: 450 }],
            out_of_coverage: false,
        });

        const quote = await previewAssistantQuote(
            {
                config: { enabled: true, packages: [{ id: "k4", name: "Show estándar", members_count: 4, duration_hours: 1, price: 450 }] },
                members_count: 4,
                duration_hours: 1,
                zone: "Surco",
                start_time: "20:00",
                special_date: false,
                requested_discount: true,
            },
            "p-1"
        );

        const [path, init] = apiFetch.mock.calls[0];
        expect(path).toBe("/assistant/preview/quote?profile_id=p-1");
        expect(init.method).toBe("POST");
        const body = JSON.parse(init.body);
        expect(body.config.packages[0].price).toBe(450);
        expect(body).toMatchObject({ members_count: 4, zone: "Surco", start_time: "20:00", special_date: false, requested_discount: true });
        expect(quote.total).toBe(480);
        expect(quote.lines[0].amount).toBe(450);
    });

    it("la comparación manda la configuración del formulario dentro de `config`", async () => {
        apiFetch.mockResolvedValueOnce([
            { key: "base", label: "Show estándar", current_total: 450, proposed_total: 500, current_summary: "a", proposed_summary: "b", changed: true },
        ]);

        const cases = await previewAssistantCompare({ enabled: true, additional_hour_price: 250 });

        const [path, init] = apiFetch.mock.calls[0];
        expect(path).toBe("/assistant/preview/compare");
        expect(init.method).toBe("POST");
        expect(JSON.parse(init.body)).toEqual({ config: { enabled: true, additional_hour_price: 250 } });
        expect(cases[0].changed).toBe(true);
    });
});
