import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Los Disallow son por prefijo: usar barra final para no bloquear
            // las rutas públicas /musicians/* y /contractors/*.
            disallow: [
                "/admin/",
                "/contractor/",
                "/musician/",
                "/login",
                "/register",
                "/api/",
                "/share/",
                "/invite/",
                "/calendar-callback",
                "/complete-role",
                "/set-password",
                "/reset-password",
                "/forgot-password",
                "/verify-email",
            ],
        },
        sitemap: "https://chiv.app/sitemap.xml",
    };
}
