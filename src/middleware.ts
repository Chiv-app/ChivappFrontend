import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    let changed = false;

    // Obtener el protocolo reenviado por el balanceador de carga o proxy (ej. Vercel)
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttp = url.protocol === "http:" || forwardedProto === "http";

    // Forzar HTTPS si es HTTP
    if ((url.hostname === "chiv.app" || url.hostname === "www.chiv.app") && isHttp) {
        url.protocol = "https:";
        url.port = "";
        changed = true;
    }

    // Redirigir de www.chiv.app a chiv.app
    if (url.hostname === "www.chiv.app") {
        url.hostname = "chiv.app";
        url.port = "";
        changed = true;
    }

    if (changed) {
        return NextResponse.redirect(url, 308); // 308 es Permanent Redirect, ideal para SEO
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Aplica a todas las rutas excepto las estáticas puras.
        // Incluimos explícitamente sitemap.xml y robots.txt para que también se beneficien de la redirección
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
    ],
};
