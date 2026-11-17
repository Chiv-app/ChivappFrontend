import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { createAssistantKnowledge } from "./assistant";

// Aquí NO se simula `apiFetch`: se simula la red, para comprobar de punta a punta que el `detail` del 422 llega tal cual.
afterEach(() => {
    vi.unstubAllGlobals();
});

describe("errores del conocimiento del asistente (red simulada)", () => {
    it("un 422 con `detail` en español llega como ApiError con ese mensaje", async () => {
        const detail = "El pago y la cancelación los define tu contrata; el asistente ya responde desde ahí.";
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ detail }), { status: 422, headers: { "Content-Type": "application/json" } })
            )
        );

        const error = await createAssistantKnowledge({ question: "¿Piden anticipo?", answer: "Sí." }).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(422);
        expect((error as ApiError).message).toBe(detail);
    });
});
