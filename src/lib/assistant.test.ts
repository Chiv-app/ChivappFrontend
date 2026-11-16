import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("./api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

import {
    getAssistantConfig,
    getAssistantUsage,
    getWhatsAppChannel,
    listAssistantConversations,
    simulateAssistantChat,
    updateAssistantConversationStatus,
    updateWhatsAppChannel,
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
});
