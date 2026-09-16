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

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
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

    // 1. Redirigir a login si intenta ingresar a un dashboard sin sesión válida
    if (isProtectedDashboard && !isAuthenticated) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", `${pathname}${search}`);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Redirigir usuarios autenticados que visitan login/registro
    if (isAuthRoute && isAuthenticated) {
        if (userRole === "admin") {
            return NextResponse.redirect(new URL("/admin", request.url));
        }
        return NextResponse.redirect(new URL("/", request.url));
    }

    // 3. Control de acceso por rol para evitar cruce de dashboards
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
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
