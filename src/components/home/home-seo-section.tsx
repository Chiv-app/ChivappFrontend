import Link from "next/link";
import { SITE_NAME, absoluteUrl, serializeJsonLd } from "@/lib/seo";

const GENRE_LINKS = [
    { label: "Bandas de rock", href: "/musicos/rock" },
    { label: "Mariachis para serenatas", href: "/musicos/mariachi" },
    { label: "Orquestas y salsa", href: "/musicos/salsa" },
    { label: "Grupos de cumbia", href: "/musicos/cumbia" },
    { label: "DJs para fiestas", href: "/musicos/dj" },
    { label: "Bandas de jazz y acústico", href: "/musicos/jazz" },
    { label: "Música criolla", href: "/musicos/musica-criolla" },
    { label: "Orquesta digital", href: "/musicos/orquesta" },
];

const EVENT_LINKS = [
    { label: "Servicios musicales para cumpleaños", href: "/musicians?event=cumpleanos" },
    { label: "Músicos y bandas para bodas", href: "/musicians?event=boda" },
    { label: "Mariachis y tríos para serenatas", href: "/musicians?event=serenata" },
    { label: "Música en vivo para eventos corporativos", href: "/musicians?event=corporativo" },
    { label: "Grupos musicales para quinceañeros", href: "/musicians?event=quinceanero" },
    { label: "Músicos para aniversarios y fiestas privadas", href: "/musicians?event=aniversario" },
];

const CITY_LINKS = [
    { label: "Músicos en Lima", href: "/musicians?city=Lima" },
    { label: "Músicos en Arequipa", href: "/musicians?city=Arequipa" },
    { label: "Músicos en Cusco", href: "/musicians?city=Cusco" },
    { label: "Músicos en Trujillo", href: "/musicians?city=Trujillo" },
    { label: "Músicos en Ayacucho", href: "/musicians?city=Ayacucho" },
    { label: "Músicos en Piura", href: "/musicians?city=Piura" },
    { label: "Músicos en Chiclayo", href: "/musicians?city=Chiclayo" },
    { label: "Músicos en Huancayo", href: "/musicians?city=Huancayo" },
];

/**
 * Contenido semántico de la home, renderizado en el servidor (SSR) con enlaces internos
 * rastreables y JSON-LD de catálogo de servicios para posicionar búsquedas comerciales
 * ("contratar músicos", "servicios musicales para cumpleaños", "encontrar banda de rock", etc.).
 */
export default function HomeSeoSection() {
    const serviceJsonLd = {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Contratación de músicos, bandas y servicios musicales para eventos en Perú",
        serviceType: "Servicios musicales para eventos",
        provider: {
            "@type": "Organization",
            name: SITE_NAME,
            url: absoluteUrl("/"),
        },
        areaServed: {
            "@type": "Country",
            name: "Perú",
        },
        hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Catálogo de músicos y bandas en vivo",
            itemListElement: [
                {
                    "@type": "Offer",
                    itemOffered: {
                        "@type": "Service",
                        name: "Servicios musicales para cumpleaños y fiestas privadas",
                    },
                },
                {
                    "@type": "Offer",
                    itemOffered: {
                        "@type": "Service",
                        name: "Contratar banda de rock, pop, jazz, salsa o cumbia",
                    },
                },
                {
                    "@type": "Offer",
                    itemOffered: {
                        "@type": "Service",
                        name: "Contratar mariachis y grupos para serenatas y bodas",
                    },
                },
            ],
        },
    };

    return (
        <section
            aria-labelledby="home-seo-title"
            className="w-full max-w-content mx-auto px-3 sm:px-6 py-12 sm:py-16 border-t border-default-200/60"
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceJsonLd) }}
            />

            <div className="w-full flex flex-col gap-8 text-default-600 text-sm sm:text-base leading-relaxed">
                <div className="max-w-4xl flex flex-col gap-3">
                    <h2
                        id="home-seo-title"
                        className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
                    >
                        Contratar músicos, bandas y servicios musicales para eventos en Perú
                    </h2>
                    <p>
                        En <strong className="text-foreground">{SITE_NAME}</strong> puedes{" "}
                        <strong className="text-foreground">contratar músicos verificados</strong>,{" "}
                        <strong className="text-foreground">encontrar una banda de rock</strong>, mariachis,
                        orquestas digitales, cantantes solistas y DJs para todo tipo de celebraciones.
                        Compara videos en vivo, repertorio de canciones, valoraciones de clientes y tarifas
                        por hora o por evento antes de solicitar tu cotización con contrato digital y pago
                        protegido por Mercado Pago.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-3xl border border-default-200/70 bg-content1 p-5 sm:p-6 shadow-soft flex flex-col gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                            Servicios musicales para cumpleaños, bodas y serenatas
                        </h3>
                        <p className="text-xs sm:text-sm text-default-500">
                            Encuentra el show ideal para celebrar en casa, locales o recepciones con repertorio personalizado:
                        </p>
                        <ul className="flex flex-wrap gap-2 pt-1">
                            {EVENT_LINKS.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="inline-flex items-center rounded-full border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary-text transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-3xl border border-default-200/70 bg-content1 p-5 sm:p-6 shadow-soft flex flex-col gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                            Encontrar banda de rock, mariachis, orquestas y DJs
                        </h3>
                        <p className="text-xs sm:text-sm text-default-500">
                            Explora agrupaciones y solistas por género musical, escucha sus demos y cotiza directo:
                        </p>
                        <ul className="flex flex-wrap gap-2 pt-1">
                            {GENRE_LINKS.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="inline-flex items-center rounded-full border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary-text transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-3xl border border-default-200/70 bg-content1 p-5 sm:p-6 shadow-soft flex flex-col gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                            Contratar músicos por ciudad en el Perú
                        </h3>
                        <p className="text-xs sm:text-sm text-default-500">
                            Artistas y bandas disponibles para presentaciones presenciales en las principales ciudades:
                        </p>
                        <ul className="flex flex-wrap gap-2 pt-1">
                            {CITY_LINKS.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="inline-flex items-center rounded-full border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary-text transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div>
                    <Link
                        href="/musicians"
                        className="font-semibold text-primary-text underline underline-offset-2"
                    >
                        Explorar el directorio completo de músicos y agrupaciones →
                    </Link>
                </div>
            </div>
        </section>
    );
}
