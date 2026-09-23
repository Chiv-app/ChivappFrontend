import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/admin",
                "/admin/",
                "/contractor",
                "/contractor/",
                "/musician",
                "/musician/",
                "/login",
                "/register",
                "/api/",
            ],
        },
        sitemap: "https://chiv.app/sitemap.xml",
        host: "https://chiv.app",
    };
}
