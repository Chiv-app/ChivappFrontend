import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

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
                "/pay/",
                "/invite/",
                "/calendar-callback",
                "/complete-role",
                "/set-password",
                "/reset-password",
                "/forgot-password",
                "/verify-email",
            ],
        },
        sitemap: absoluteUrl("/sitemap.xml"),
    };
}
