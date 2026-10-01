import { NextRequest, NextResponse } from "next/server";

function getUpstreamBase(request?: NextRequest): string {
    if (process.env.API_PROXY_TARGET) {
        return process.env.API_PROXY_TARGET.replace(/\/$/, "");
    }
    if (process.env.BACKEND_URL) {
        return process.env.BACKEND_URL.replace(/\/$/, "");
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
    }
    const host = (
        request?.headers.get("x-forwarded-host") ||
        request?.headers.get("host") ||
        ""
    ).toLowerCase();
    if (
        host.includes("chiv.app") ||
        host.includes("run.app") ||
        process.env.NODE_ENV === "production"
    ) {
        return "https://api.chiv.app";
    }
    return "http://localhost:8000";
}

async function fetchUpstream(
    targetUrl: string,
    init: RequestInit,
): Promise<Response> {
    // Never auto-follow redirects: OAuth start/callback must reach the browser.
    return fetch(targetUrl, { ...init, redirect: "manual" });
}

function resolveRedirectUrl(currentUrl: string, location: string): string | null {
    try {
        return new URL(location, currentUrl).toString();
    } catch {
        return null;
    }
}

/** Next strips trailing slashes; FastAPI often requires them — resolve that here. */
function isInternalSlashRedirect(fromUrl: string, toUrl: string, apiBase: string): boolean {
    if (!toUrl.startsWith(apiBase)) return false;
    const from = fromUrl.replace(/\/+$/, "");
    const to = toUrl.replace(/\/+$/, "");
    return from === to;
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
    const apiBase = getUpstreamBase(request);
    const hasTrailingSlash = request.nextUrl.pathname.endsWith("/");
    const path = pathSegments.join("/") + (hasTrailingSlash ? "/" : "");
    const search = request.nextUrl.search;
    let targetUrl = `${apiBase}/api/v1/${path}${search}`;

    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) {
        headers.set("content-type", contentType);
    }

    const cookie = request.headers.get("cookie");
    if (cookie) {
        headers.set("cookie", cookie);
    }

    const auth = request.headers.get("authorization");
    if (auth) {
        headers.set("authorization", auth);
    }

    // Metadata reenviada para endpoints que la registran (ej. ayuda/soporte).
    const userAgent = request.headers.get("user-agent");
    if (userAgent) {
        headers.set("user-agent", userAgent);
    }
    // IP real del cliente: la última entrada de X-Forwarded-For la agrega el
    // balanceador (las anteriores las puede inventar el cliente). Se envía al
    // backend firmada con el secreto compartido para el rate limit y auditoría.
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",").pop()?.trim();
    const proxySecret = process.env.PROXY_SHARED_SECRET;
    if (clientIp && proxySecret) {
        headers.set("x-chivapp-client-ip", clientIp);
        headers.set("x-chivapp-proxy-secret", proxySecret);
    }

    // Cabeceras de pasarela de pago (Webhooks de Mercado Pago, firmas HMAC e idempotencia)
    const xSignature = request.headers.get("x-signature");
    if (xSignature) {
        headers.set("x-signature", xSignature);
    }
    const xRequestId = request.headers.get("x-request-id");
    if (xRequestId) {
        headers.set("x-request-id", xRequestId);
    }
    const xIdempotencyKey = request.headers.get("x-idempotency-key");
    if (xIdempotencyKey) {
        headers.set("x-idempotency-key", xIdempotencyKey);
    }

    const hasBody = !["GET", "HEAD"].includes(request.method);
    const body = hasBody ? await request.arrayBuffer() : undefined;

    let upstream: Response;
    try {
        upstream = await fetchUpstream(targetUrl, {
            method: request.method,
            headers,
            body,
        });

        // Follow only same-path trailing-slash redirects from FastAPI.
        for (let hop = 0; hop < 2; hop++) {
            if (![301, 302, 307, 308].includes(upstream.status)) break;
            const location = upstream.headers.get("location");
            if (!location) break;
            const nextUrl = resolveRedirectUrl(targetUrl, location);
            if (!nextUrl || !isInternalSlashRedirect(targetUrl, nextUrl, apiBase)) break;

            targetUrl = nextUrl;
            upstream = await fetchUpstream(targetUrl, {
                method: request.method,
                headers,
                body,
            });
        }
    } catch {
        return NextResponse.json(
            {
                detail:
                    "No se pudo conectar con el backend. Verifica que el servidor API esté en ejecución.",
            },
            { status: 503 },
        );
    }

    const responseHeaders = new Headers();
    const setCookies = typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : [];

    upstream.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower === "transfer-encoding" || lower === "set-cookie") return;
        // Keep any remaining API redirects on the same origin as the Next proxy.
        if (lower === "location" && value.startsWith(apiBase)) {
            responseHeaders.set(key, value.slice(apiBase.length) || "/");
            return;
        }
        responseHeaders.append(key, value);
    });

    if (setCookies.length > 0) {
        setCookies.forEach((cookieStr) => {
            responseHeaders.append("set-cookie", cookieStr);
        });
    } else {
        const rawSetCookie = upstream.headers.get("set-cookie");
        if (rawSetCookie) {
            responseHeaders.append("set-cookie", rawSetCookie);
        }
    }

    return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
    });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}
