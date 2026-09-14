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

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path } = await context.params;
    if (!path || path.length === 0) {
        return new NextResponse("Not Found", { status: 404 });
    }

    if (process.env.NEXT_PUBLIC_GCS_BUCKET_URL) {
        const gcsUrl = `${process.env.NEXT_PUBLIC_GCS_BUCKET_URL}/${path.join("/")}`;
        return NextResponse.redirect(gcsUrl, 302);
    }

    const upstreamBase = getUpstreamBase(request);
    const targetUrl = `${upstreamBase}/uploads/${path.join("/")}`;

    try {
        const forwardHeaders: Record<string, string> = {};
        const range = request.headers.get("range");
        if (range) {
            forwardHeaders["range"] = range;
        }

        const upstreamRes = await fetch(targetUrl, {
            headers: forwardHeaders,
            cache: "no-store",
        });

        if (!upstreamRes.ok) {
            return new NextResponse("Archivo no encontrado", {
                status: upstreamRes.status,
            });
        }

        const contentType =
            upstreamRes.headers.get("content-type") || "application/octet-stream";
        const contentLength = upstreamRes.headers.get("content-length");

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        // "inline" permite que el navegador visualice imágenes y PDFs directamente en la pestaña
        headers.set("Content-Disposition", "inline");
        headers.set(
            "Cache-Control",
            "public, max-age=86400, stale-while-revalidate=604800"
        );
        if (contentLength) {
            headers.set("Content-Length", contentLength);
        }

        return new NextResponse(upstreamRes.body, {
            status: upstreamRes.status,
            headers,
        });
    } catch (err) {
        console.error("Error cargando archivo desde backend upstream:", err);
        return new NextResponse("Error al conectar con el servidor de archivos", {
            status: 502,
        });
    }
}
