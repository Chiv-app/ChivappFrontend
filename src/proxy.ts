import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type JWTPayload = {
    sub?: string;
    role?: "musician" | "contractor" | "admin" | string;
    exp?: number;
};

function parseJwt(token: string): JWTPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export function proxy(request: NextRequest) {
    const url = request.nextUrl.clone();
    let urlChanged = false;

    // 1. Redirecciones SEO: Forzar HTTPS y redirigir www a dominio base
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttp = url.protocol === "http:" || forwardedProto === "http";

    if ((url.hostname === "chiv.app" || url.hostname === "www.chiv.app") && isHttp) {
        url.protocol = "https:";
        url.port = "";
        urlChanged = true;
    }

    if (url.hostname === "www.chiv.app") {
        url.hostname = "chiv.app";
        url.port = "";
        urlChanged = true;
    }

    if (urlChanged) {
        return NextResponse.redirect(url, 308); // 308 Permanent Redirect for SEO
    }

    // 2. Control de Autenticación y Autorización
    const { pathname, search } = url;
    const token = request.cookies.get("access_token")?.value;

    const payload = token ? parseJwt(token) : null;
    const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : false;
    const isAuthenticated = Boolean(payload && !isExpired);
    const userRole = isAuthenticated ? payload?.role : null;

    const isAuthRoute =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password");

    const isMusicianDashboard =
        pathname === "/musician" || pathname.startsWith("/musician/");
    const isContractorDashboard =
        pathname === "/contractor" || pathname.startsWith("/contractor/");
    const isAdminDashboard =
        pathname === "/admin" || pathname.startsWith("/admin/");
    const isProtectedDashboard =
        isMusicianDashboard || isContractorDashboard || isAdminDashboard;

    // Redirigir a login si intenta ingresar a un dashboard sin sesión válida
    if (isProtectedDashboard && !isAuthenticated) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", ${pathname});
        return NextResponse.redirect(loginUrl);
    }

    // Redirigir usuarios autenticados que visitan login/registro
    if (isAuthRoute && isAuthenticated) {
        if (userRole === "admin") {
            return NextResponse.redirect(new URL("/admin", request.url));
        }
        return NextResponse.redirect(new URL("/", request.url));
    }

    // Control de acceso por rol para evitar cruce de dashboards
    if (isAuthenticated && userRole) {
        if (isMusicianDashboard && userRole !== "musician") {
            const redirectUrl =
                userRole === "contractor" ? "/contractor/bookings" : "/admin";
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        }

        if (isContractorDashboard && userRole !== "contractor") {
            const redirectUrl =
                userRole === "musician" ? "/musician/bookings" : "/admin";
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        }

        if (isAdminDashboard && userRole !== "admin") {
            return NextResponse.redirect(new URL("/", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Coincide con todas las rutas excepto:
         * - api (endpoints API)
         * - _next/static (archivos estáticos compilados)
         * - _next/image (optimización de imágenes)
         * - favicon.ico, sitemap.xml, robots.txt
         * - archivos estáticos de multimedia
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
