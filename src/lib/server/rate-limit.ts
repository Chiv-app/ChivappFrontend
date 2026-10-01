import type { NextRequest } from "next/server";

/**
 * Rate limit en memoria por IP (ventana fija). Es por instancia: con varias
 * réplicas en Cloud Run el límite efectivo se multiplica, pero basta para
 * frenar abuso básico de los proxies (p. ej. geocodificación).
 */

type Bucket = { count: number; resetAt: number };

const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = {
    allowed: boolean;
    retryAfterSeconds: number;
};

export function createRateLimiter(options: { limit: number; windowMs: number }) {
    const buckets = new Map<string, Bucket>();

    function prune(now: number) {
        for (const [key, bucket] of buckets) {
            if (bucket.resetAt <= now) buckets.delete(key);
        }
    }

    return function check(key: string): RateLimitResult {
        const now = Date.now();
        if (buckets.size >= MAX_TRACKED_KEYS) prune(now);

        const bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + options.windowMs });
            return { allowed: true, retryAfterSeconds: 0 };
        }

        bucket.count += 1;
        if (bucket.count > options.limit) {
            return {
                allowed: false,
                retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
            };
        }
        return { allowed: true, retryAfterSeconds: 0 };
    };
}

/** IP del cliente: última entrada de x-forwarded-for (la agrega el proxy de confianza). */
export function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const parts = forwardedFor
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        const last = parts[parts.length - 1];
        if (last) return last;
    }
    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Límite compartido por los endpoints de geocodificación: 30 solicitudes/minuto por IP. */
export const geocodeRateLimit = createRateLimiter({ limit: 30, windowMs: 60_000 });
