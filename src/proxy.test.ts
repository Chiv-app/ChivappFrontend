import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function createMockJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${header}.${body}.signature`;
}

describe("Next.js Middleware", () => {
    it("redirects unauthenticated user from protected dashboard to login", () => {
        const req = new NextRequest("http://localhost:3000/musician/bookings");
        const res = proxy(req);

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe(
            "http://localhost:3000/login?redirect=%2Fmusician%2Fbookings",
        );
    });

    it("allows public access to home page without auth", () => {
        const req = new NextRequest("http://localhost:3000/");
        const res = proxy(req);

        expect(res.status).toBe(200);
        expect(res.headers.get("location")).toBeNull();
    });

    it("allows musician to access /musician/bookings with valid token", () => {
        const token = createMockJwt({
            sub: "user-123",
            role: "musician",
            exp: Math.floor(Date.now() / 1000) + 3600,
        });

        const req = new NextRequest("http://localhost:3000/musician/bookings", {
            headers: {
                cookie: `access_token=${token}`,
            },
        });
        const res = proxy(req);

        expect(res.status).toBe(200);
        expect(res.headers.get("location")).toBeNull();
    });

    it("prevents musician from accessing contractor dashboard", () => {
        const token = createMockJwt({
            sub: "user-123",
            role: "musician",
            exp: Math.floor(Date.now() / 1000) + 3600,
        });

        const req = new NextRequest("http://localhost:3000/contractor/bookings", {
            headers: {
                cookie: `access_token=${token}`,
            },
        });
        const res = proxy(req);

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("http://localhost:3000/musician/bookings");
    });

    it("redirects authenticated user visiting /login back to home", () => {
        const token = createMockJwt({
            sub: "user-123",
            role: "musician",
            exp: Math.floor(Date.now() / 1000) + 3600,
        });

        const req = new NextRequest("http://localhost:3000/login", {
            headers: {
                cookie: `access_token=${token}`,
            },
        });
        const res = proxy(req);

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("http://localhost:3000/");
    });
});
