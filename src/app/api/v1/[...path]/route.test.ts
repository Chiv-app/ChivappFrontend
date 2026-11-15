import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

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
