import { NextRequest, NextResponse } from "next/server";

function getUpstreamBase(request: NextRequest): string {
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
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
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

/** Tipos que se sirven tal cual (inline). Cualquier otro se fuerza a descarga. */
const INLINE_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "video/mp4",
]);

const BASE_CSP =
    "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'";
// `sandbox` impide que Chrome renderice PDFs, así que solo se omite para PDFs.
const SANDBOXED_CSP = `${BASE_CSP}; sandbox`;

function isSafeSegment(segment: string): boolean {
    if (!segment) return false;
    let decoded: string;
    try {
        decoded = decodeURIComponent(segment);
    } catch {
        return false;
    }
    for (const value of [segment, decoded]) {
        if (!value || value === "." || value === "..") return false;
        if (value.includes("/") || value.includes("\\") || value.includes("\0")) return false;
        if (/%2f|%5c|%00/i.test(value)) return false;
    }
    return true;
}

function securityHeaders(
    contentType: string,
    isError = false,
    isPrivate = false,
    isPartial = false,
): Headers {
    const headers = new Headers();
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
        "Content-Security-Policy",
        contentType === "application/pdf" ? BASE_CSP : SANDBOXED_CSP,
    );
    // Los errores y las respuestas parciales (206 Range) no deben cachearse como públicas.
    headers.set(
        "Cache-Control",
        isError
            ? "no-store"
            : isPartial
              ? "private, no-store"
              : isPrivate
                ? "private, max-age=300"
                : "public, max-age=3600",
    );
    return headers;
}

async function handleUploadRequest(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
    method: "GET" | "HEAD",
) {
    const { path } = await context.params;
    if (!path || path.length === 0) {
        return new NextResponse(method === "HEAD" ? null : "Not Found", {
            status: 404,
            headers: securityHeaders("text/plain", true),
        });
    }

    if (!path.every(isSafeSegment)) {
        return new NextResponse(method === "HEAD" ? null : "Ruta inválida", {
            status: 400,
            headers: securityHeaders("text/plain", true),
        });
    }

    const segments = path.map((segment) => encodeURIComponent(decodeURIComponent(segment)));
    const isPrivate = segments[0] === "private";

    const upstreamBase = getUpstreamBase(request);
    const targetUrl = `${upstreamBase}/uploads/${segments.join("/")}`;

    try {
        const forwardHeaders: Record<string, string> = {};
        const range = request.headers.get("range");
        if (range) {
            forwardHeaders["range"] = range;
        }
        // El backend autoriza /uploads/private/... con la sesión del usuario.
        const cookie = request.headers.get("cookie");
        if (cookie) {
            forwardHeaders["cookie"] = cookie;
        }

        const upstreamRes = await fetch(targetUrl, {
            method,
            headers: forwardHeaders,
            cache: "no-store",
            redirect: "manual",
            signal: AbortSignal.timeout(15_000),
        });

        // Redirects del backend (p. ej. a un bucket) se delegan al navegador sin reenviar cookies.
        const location = upstreamRes.headers.get("location");
        if (upstreamRes.status >= 300 && upstreamRes.status < 400 && location) {
            const redirectUrl = new URL(location, targetUrl);
            if (redirectUrl.protocol === "https:" || redirectUrl.protocol === "http:") {
                const redirect = NextResponse.redirect(redirectUrl, 302);
                redirect.headers.set("Cache-Control", "private, max-age=300");
                return redirect;
            }
        }

        if (!upstreamRes.ok) {
            // Se propaga el status (401/403/404/416…) sin exponer el cuerpo del backend.
            const status = upstreamRes.status >= 400 ? upstreamRes.status : 502;
            return new NextResponse(method === "HEAD" ? null : "Archivo no encontrado", {
                status,
                headers: securityHeaders("text/plain", true, isPrivate),
            });
        }

        const upstreamType = (upstreamRes.headers.get("content-type") || "")
            .split(";")[0]
            .trim()
            .toLowerCase();
        const isInline = INLINE_CONTENT_TYPES.has(upstreamType);
        const contentType = isInline ? upstreamType : "application/octet-stream";

        const isPartial = upstreamRes.status === 206;
        const headers = securityHeaders(contentType, false, isPrivate, isPartial);
        headers.set("Content-Type", contentType);
        // "inline" permite visualizar imágenes, videos y PDFs; el resto se descarga.
        headers.set("Content-Disposition", isInline ? "inline" : "attachment");
        for (const name of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
            const value = upstreamRes.headers.get(name);
            if (value) headers.set(name, value);
        }

        // FE6-08: devolver el ReadableStream directamente sin bufferizar hasta 15 MB en memoria.
        return new NextResponse(method === "HEAD" ? null : upstreamRes.body, {
            status: upstreamRes.status,
            headers,
        });
    } catch (err) {
        console.error("Error cargando archivo desde backend upstream:", err);
        return new NextResponse(
            method === "HEAD" ? null : "Error al conectar con el servidor de archivos",
            {
                status:
                    err instanceof Error &&
                    (err.name === "TimeoutError" || err.name === "AbortError")
                        ? 504
                        : 502,
                headers: securityHeaders("text/plain", true),
            },
        );
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    return handleUploadRequest(request, context, "GET");
}

export async function HEAD(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    return handleUploadRequest(request, context, "HEAD");
}
