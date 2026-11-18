import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const PROFILE = "11111111-1111-4111-8111-111111111111";

function call(headers: Record<string, string>) {
    const request = new NextRequest("http://localhost:3000/api/v1/profiles/musician/me", { headers });
    return GET(request, { params: Promise.resolve({ path: ["profiles", "musician", "me"] }) });
}

describe("proxy de la API: perfil activo", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubEnv("API_PROXY_TARGET", "http://backend.test");
        fetchMock.mockReset();
        fetchMock.mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    function sentHeaders(): Headers {
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        return new Headers(init.headers);
    }

    it("reenvía al backend el perfil elegido", async () => {
        await call({ "x-musician-profile-id": PROFILE });
        expect(sentHeaders().get("x-musician-profile-id")).toBe(PROFILE);
    });

    it("no reenvía valores que no sean un id", async () => {
        await call({ "x-musician-profile-id": "no-es-un-id" });
        expect(sentHeaders().get("x-musician-profile-id")).toBeNull();
    });

    it("sin la cabecera no manda nada", async () => {
        await call({});
        expect(sentHeaders().get("x-musician-profile-id")).toBeNull();
    });
});

describe("proxy de la API: webhook de WhatsApp", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubEnv("API_PROXY_TARGET", "http://backend.test");
        fetchMock.mockReset();
        fetchMock.mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("reenvía la firma de Meta y el cuerpo sin tocarlo", async () => {
        const body = '{"object":"whatsapp_business_account","entry":[]}';
        const request = new NextRequest("http://localhost:3000/api/v1/whatsapp/webhook", {
            method: "POST",
            headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=abc123" },
            body,
        });
        await POST(request, { params: Promise.resolve({ path: ["whatsapp", "webhook"] }) });

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("http://backend.test/api/v1/whatsapp/webhook");
        expect(new Headers(init.headers).get("x-hub-signature-256")).toBe("sha256=abc123");
        expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(body);
    });
});
