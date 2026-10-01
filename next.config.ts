import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

/** Origen (scheme://host[:port]) de una URL absoluta de env; null si es relativa o inválida. */
function originOf(value: string | undefined): string | null {
  if (!value || !/^https?:\/\//i.test(value)) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const gcsBucketOrigin = originOf(process.env.NEXT_PUBLIC_GCS_BUCKET_URL);
const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL);
const uploadsOrigin = originOf(process.env.NEXT_PUBLIC_UPLOADS_URL);

/** Archivos subidos: bucket GCS (NEXT_PUBLIC_GCS_BUCKET_URL) y, si aplica, un host de uploads propio. */
const uploadSources = [
  "https://storage.googleapis.com",
  gcsBucketOrigin,
  uploadsOrigin,
].filter((value): value is string => Boolean(value));

// Inventario de orígenes externos usados por el frontend:
// - Mercado Pago: SDK (sdk.mercadopago.com), security.js (www.mercadopago.com),
//   Bricks/iframes (*.mercadopago.com, *.mercadopago.com.pe, *.mercadolibre.com),
//   estáticos (*.mlstatic.com) y reCAPTCHA que usa su antifraude.
// - Google Analytics (@next/third-parties): googletagmanager.com, google-analytics.com.
// - Videos: YouTube/Vimeo embeds (youtube.com, youtube-nocookie.com, player.vimeo.com)
//   y miniaturas (img.youtube.com, i.ytimg.com).
// - Mapas: teselas OSM (*.tile.openstreetmap.org) e iconos de Leaflet (unpkg.com).
//   La geocodificación (Nominatim) va por el servidor (/api/geocode), no desde el navegador.
// - Visor de PDF alternativo: docs.google.com (gview).
// - Imágenes: lh3.googleusercontent.com (avatar Google), images.pexels.com,
//   ui-avatars.com, storage.googleapis.com / bucket de uploads.
// - Fuentes: next/font/google las autoaloja en build, no requiere fonts.googleapis.com.
const mercadoPagoSources = [
  "https://sdk.mercadopago.com",
  "https://www.mercadopago.com",
  "https://*.mercadopago.com",
  "https://*.mercadopago.com.pe",
  "https://*.mercadolibre.com",
  "https://*.mlstatic.com",
];
const googleAnalyticsSources = [
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
];
const recaptchaSources = ["https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"];

const reportOnlyDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  // 'unsafe-inline' es temporal: Next/HeroUI inyectan scripts/estilos inline sin nonce.
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    ...(isProduction ? [] : ["'unsafe-eval'"]),
    ...mercadoPagoSources,
    ...googleAnalyticsSources,
    ...recaptchaSources,
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://*.mlstatic.com"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://img.youtube.com",
    "https://i.ytimg.com",
    "https://*.tile.openstreetmap.org",
    "https://unpkg.com",
    "https://lh3.googleusercontent.com",
    "https://images.pexels.com",
    "https://ui-avatars.com",
    ...uploadSources,
    ...mercadoPagoSources,
    ...googleAnalyticsSources,
  ],
  "font-src": ["'self'", "data:", "https://*.mlstatic.com"],
  "connect-src": [
    "'self'",
    ...(apiOrigin ? [apiOrigin] : []),
    ...uploadSources,
    "https://api.mercadopago.com",
    "https://api.mercadolibre.com",
    ...mercadoPagoSources,
    ...googleAnalyticsSources,
    ...(isProduction ? [] : ["ws:", "wss:", "http://localhost:*", "http://127.0.0.1:*"]),
  ],
  "frame-src": [
    "'self'",
    "blob:",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://player.vimeo.com",
    "https://docs.google.com",
    "https://www.google.com",
    ...uploadSources,
    ...mercadoPagoSources,
  ],
  "media-src": ["'self'", "blob:", ...uploadSources],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'", "https://*.mercadopago.com", "https://*.mercadopago.com.pe"],
  "frame-ancestors": ["'none'"],
};

const serializeCsp = (directives: Record<string, string[]>) =>
  Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${Array.from(new Set(sources)).join(" ")}`)
    .join("; ");

// CSP ENFORCED mínima: anti-clickjacking, sin plugins, base/form acotados.
// La política completa va en Report-Only mientras se valida; el plan es migrar
// a nonces (sin 'unsafe-inline') y luego pasarla a enforced.
const enforcedCsp =
  "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://*.mercadopago.com https://*.mercadopago.com.pe";
const reportOnlyCsp = serializeCsp(reportOnlyDirectives);

const baseSecurityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
];

const devImagePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = isProduction
  ? []
  : [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
  },
  reactCompiler: false,
  transpilePackages: ["@heroui/react", "@heroui/theme"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: baseSecurityHeaders,
      },
      {
        // Todo excepto /uploads: no se permite embeber el sitio en iframes.
        source: "/((?!uploads/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: enforcedCsp },
          { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp },
        ],
      },
      {
        // /uploads define su propia CSP en el route handler; los PDFs se
        // previsualizan en iframes del mismo origen.
        source: "/uploads/:path*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/auth/complete-role",
        destination: "/complete-role",
        permanent: false,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.chiv.app' }],
        destination: 'https://chiv.app/:path*',
        permanent: true,
      },
    ];
  },
  images: {
    // Next 16 blocks optimizer fetches to private IPs by default.
    // Prefer same-origin /uploads paths; allow local IP in development as fallback.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "chiv.app",
      },
      {
        protocol: "https",
        hostname: "api.chiv.app",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      // Solo en desarrollo: backend local.
      ...devImagePatterns,
    ],
  },
};

export default nextConfig;
