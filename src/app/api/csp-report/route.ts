import { NextRequest } from "next/server";

const MAX_CSP_REPORT_BYTES = 16_384;
const CSP_RATE_WINDOW_MS = 60_000;
const CSP_MAX_REPORTS_PER_WINDOW = 30;
const cspRateBuckets = new Map<string, { count: number; resetAt: number }>();

export function resetCspRateLimitForTests(): void {
    cspRateBuckets.clear();
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const bucket = cspRateBuckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
        if (cspRateBuckets.size > 2048) {
            const firstKey = cspRateBuckets.keys().next().value;
            if (firstKey) cspRateBuckets.delete(firstKey);
        }
        cspRateBuckets.set(ip, { count: 1, resetAt: now + CSP_RATE_WINDOW_MS });
        return false;
    }
    bucket.count += 1;
    return bucket.count > CSP_MAX_REPORTS_PER_WINDOW;
}

function sanitizeField(value: unknown, maxLen = 240): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.replace(/[\r\n\t]+/g, " ").trim();
    return trimmed ? trimmed.slice(0, maxLen) : undefined;
}

export async function POST(request: NextRequest) {
    const forwarded = request.headers.get("x-forwarded-for") || "";
    const clientIp = forwarded.split(",")[0]?.trim() || "127.0.0.1";
    if (isRateLimited(clientIp)) {
        return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
    }
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
        const declaredBytes = Number(contentLengthHeader);
        if (Number.isFinite(declaredBytes) && declaredBytes > MAX_CSP_REPORT_BYTES) {
            return new Response(null, { status: 413 });
        }
    }

    try {
        const rawBody = await request.text();
        if (rawBody.length > MAX_CSP_REPORT_BYTES) {
            return new Response(null, { status: 413 });
        }
        if (rawBody.trim()) {
            const parsed: unknown = JSON.parse(rawBody);
            const entries = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of entries.slice(0, 5)) {
                if (!item || typeof item !== "object") continue;
                const record = item as Record<string, unknown>;
                const report =
                    (record["csp-report"] as Record<string, unknown> | undefined) ??
                    (record["body"] as Record<string, unknown> | undefined) ??
                    record;

                const summary = {
                    blockedUri: sanitizeField(
                        report["blocked-uri"] ?? report["blockedURL"],
                    ),
                    violatedDirective: sanitizeField(
                        report["violated-directive"] ?? report["effectiveDirective"],
                    ),
                    documentUri: sanitizeField(
                        report["document-uri"] ?? report["documentURL"],
                    ),
                    disposition: sanitizeField(report["disposition"], 40),
                };

                if (
                    summary.blockedUri ||
                    summary.violatedDirective ||
                    summary.documentUri
                ) {
                    console.warn("[CSP Violation]", summary);
                }
            }
        }
    } catch {
        // Ignore malformed CSP report payloads
    }
    return new Response(null, { status: 204 });
}
