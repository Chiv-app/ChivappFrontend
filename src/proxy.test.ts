import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/v1/[...path]/route";
import {
    POST as postCspReport,
    resetCspRateLimitForTests,
} from "@/app/api/csp-report/route";

describe("API proxy route handler (WP-11)", () => {
    const originalFetch = global.fetch;
    const originalSecret = process.env.PROXY_SHARED_SECRET;

    beforeEach(() => {
        process.env.PROXY_SHARED_SECRET = "test-shared-secret-with-at-least-32-chars";
        resetCspRateLimitForTests();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        process.env.PROXY_SHARED_SECRET = originalSecret;
        vi.restoreAllMocks();
    });

    it("rejects path traversal segments with 400", async () => {
        const req = new NextRequest("http://localhost:3000/api/v1/bookings/..%2Fadmin");
        const res = await GET(req, { params: Promise.resolve({ path: ["bookings", "..", "admin"] }) });
        expect(res.status).toBe(400);
    });

    it("forwards client IP, proxy secret, webhook signature and Set-Cookie headers", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                    "set-cookie": "access_token=abc; Path=/; HttpOnly",
                },
            }),
        );
        global.fetch = fetchMock as unknown as typeof fetch;

        const req = new NextRequest("http://localhost:3000/api/v1/payments/mercadopago/webhook", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-forwarded-for": "198.51.100.10, 203.0.113.5",
                "x-signature": "ts=1700000000,v1=deadbeef",
                "x-request-id": "req-123",
            },
            body: JSON.stringify({ type: "payment" }),
        });

        const res = await POST(req, {
            params: Promise.resolve({ path: ["payments", "mercadopago", "webhook"] }),
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("set-cookie")).toContain("access_token=abc");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0];
        const forwardedHeaders = init.headers as Headers;
        expect(forwardedHeaders.get("x-chivapp-client-ip")).toBe("203.0.113.5");
        expect(forwardedHeaders.get("x-chivapp-proxy-secret")).toBe(
            "test-shared-secret-with-at-least-32-chars",
        );
        expect(forwardedHeaders.get("x-signature")).toBe("ts=1700000000,v1=deadbeef");
        expect(forwardedHeaders.get("x-request-id")).toBe("req-123");
    });

    it("follows internal trailing-slash redirects without exposing upstream origin", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 307,
                    headers: { location: "http://localhost:8000/api/v1/bookings/" },
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
        global.fetch = fetchMock as unknown as typeof fetch;

        const req = new NextRequest("http://localhost:3000/api/v1/bookings");
        const res = await GET(req, { params: Promise.resolve({ path: ["bookings"] }) });
        expect(res.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("rejects oversized request bodies with 413", async () => {
        const req = new NextRequest("http://localhost:3000/api/v1/uploads", {
            method: "POST",
            headers: {
                "content-length": String(20 * 1024 * 1024),
            },
            body: "x",
        });
        const res = await POST(req, { params: Promise.resolve({ path: ["uploads"] }) });
        expect(res.status).toBe(413);
    });

    it("rate-limits CSP violation reports per IP", async () => {
        for (let i = 0; i < 30; i++) {
            const req = new NextRequest("http://localhost:3000/api/csp-report", {
                method: "POST",
                headers: { "x-forwarded-for": "192.0.2.99" },
                body: JSON.stringify({ "csp-report": { "blocked-uri": "https://evil.test" } }),
            });
            const res = await postCspReport(req);
            expect(res.status).toBe(204);
        }
        const blockedReq = new NextRequest("http://localhost:3000/api/csp-report", {
            method: "POST",
            headers: { "x-forwarded-for": "192.0.2.99" },
            body: JSON.stringify({ "csp-report": { "blocked-uri": "https://evil.test" } }),
        });
        const blockedRes = await postCspReport(blockedReq);
        expect(blockedRes.status).toBe(429);
    });
});
