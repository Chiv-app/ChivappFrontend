import Link from "next/link";
import {
    SITE_NAME,
    breadcrumbJsonLd,
    itemListJsonLd,
    serializeJsonLd,
} from "@/lib/seo";
import type { MusicianCard } from "@/types/ui/musician";

type Props = {
    genreName: string;
    /** Slug del género tal como está en la URL (para migas y enlaces). */
    genreSlug: string;
    cityName?: string;
    /** Resultados de la búsqueda inicial; `undefined` si el servidor falló. */
    musicians: MusicianCard[] | undefined;
    /** Cantidad máxima pedida en la búsqueda inicial (para no afirmar totales falsos). */
    searchLimit: number;
};

type Faq = { question: string; answer: string };

function formatPrice(value: number): string {
    return `S/ ${Math.round(value).toLocaleString("es-PE")}`;
}

/**
 * Texto propio para páginas de género y ciudad: describe cómo contratar, usa datos
 * reales de la búsqueda (cantidad y tarifa mínima) y agrega migas, lista de perfiles
 * y preguntas frecuentes como datos estructurados. No inventa cifras: si no hay datos,
 * usa redacción general.
 */
export default function SeoLandingContent({
    genreName,
    genreSlug,
    cityName,
    musicians,
    searchLimit,
}: Props) {
    const genreLower = genreName.toLowerCase();
    const place = cityName ? `en ${cityName}` : "en Perú";
    const path = `/musicos/${genreSlug}`;

    const count = musicians?.length ?? 0;
    const prices = (musicians ?? [])
        .map((m) => m.price)
        .filter((p): p is number => typeof p === "number" && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;

    const countText =
        count === 0
            ? null
            : count >= searchLimit
              ? `${searchLimit} o más artistas`
              : `${count} ${count === 1 ? "artista" : "artistas"}`;

    const intro = countText
        ? `En ${SITE_NAME} encuentras ${countText} de ${genreLower} ${place}${
              minPrice ? `, con tarifas desde ${formatPrice(minPrice)}` : ""
          }. Cada perfil muestra videos, repertorio, valoraciones y tarifa para que compares antes de pedir tu cotización.`
        : `En ${SITE_NAME} puedes comparar perfiles de ${genreLower} ${place}: videos, repertorio, valoraciones y tarifas, y pedir tu cotización antes de reservar.`;

    const faqs: Faq[] = [
        {
            question: `¿Cuánto cuesta contratar ${genreLower} ${place}?`,
            answer: minPrice
                ? `La tarifa depende del artista, la duración y el lugar del evento. En ${SITE_NAME} hay opciones desde ${formatPrice(minPrice)}. Cada perfil muestra su tarifa y puedes pedir una cotización para tu fecha.`
                : `La tarifa depende del artista, la duración y el lugar del evento. Cada perfil en ${SITE_NAME} muestra su tarifa y puedes pedir una cotización para tu fecha.`,
        },
        {
            question: `¿Cómo reservo ${genreLower} ${place}?`,
            answer:
                "Elige un artista, pide tu cotización indicando fecha, lugar y tipo de evento, revisa el precio que te propone, firma el contrato digital y paga con Mercado Pago.",
        },
        {
            question: "¿Mi pago está protegido?",
            answer: `Sí. El pago se realiza por Mercado Pago y queda en custodia de ${SITE_NAME} hasta que finaliza el evento. Las condiciones de cancelación y reembolso están en la política publicada.`,
        },
    ];

    const crumbs = [
        { name: "Inicio", path: "/" },
        { name: "Músicos", path: "/musicians" },
        { name: genreName, path },
        ...(cityName
            ? [{ name: cityName, path: `${path}/${encodeURIComponent(cityName.toLowerCase().replace(/\s+/g, "-"))}` }]
            : []),
    ];

    const listEntries = (musicians ?? []).map((m) => ({
        name: m.name,
        path: `/musicians/${m.slug || m.id}`,
    }));

    const jsonLd = [
        breadcrumbJsonLd(crumbs),
        ...(listEntries.length > 0
            ? [itemListJsonLd(`${genreName} ${place}`, listEntries)]
            : []),
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
        },
    ];

    return (
        <section
            aria-labelledby="seo-landing-title"
            className="max-w-[1800px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 mt-12 sm:mt-16"
        >
            {jsonLd.map((entry, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: serializeJsonLd(entry) }}
                />
            ))}

            <div className="max-w-3xl flex flex-col gap-6 text-default-600 text-sm sm:text-base leading-relaxed">
                <div className="flex flex-col gap-2">
                    <h2
                        id="seo-landing-title"
                        className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
                    >
                        Cómo contratar {genreLower} {place}
                    </h2>
                    <p>{intro}</p>
                </div>

                <ol className="list-decimal pl-5 flex flex-col gap-2">
                    <li>Compara perfiles, videos, repertorio y reseñas.</li>
                    <li>
                        Pide tu cotización con la fecha, el lugar y el tipo de evento; el artista
                        responde con su precio.
                    </li>
                    <li>
                        Firma el contrato digital y paga con Mercado Pago (Yape o tarjeta). El pago
                        queda protegido hasta que termina el evento.
                    </li>
                </ol>

                <div className="flex flex-col gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                        Preguntas frecuentes
                    </h2>
                    {faqs.map((faq) => (
                        <div key={faq.question} className="flex flex-col gap-1">
                            <h3 className="font-semibold text-foreground">{faq.question}</h3>
                            <p>{faq.answer}</p>
                        </div>
                    ))}
                </div>

                <p className="flex flex-wrap gap-x-4 gap-y-2">
                    <Link
                        href="/musicians"
                        className="font-semibold text-primary-text underline underline-offset-2"
                    >
                        Ver todos los músicos
                    </Link>
                    {cityName ? (
                        <Link
                            href={path}
                            className="font-semibold text-primary-text underline underline-offset-2"
                        >
                            {genreName} en todo Perú
                        </Link>
                    ) : null}
                    <Link
                        href="/legal/reembolsos"
                        className="font-semibold text-primary-text underline underline-offset-2"
                    >
                        Política de cancelación y reembolsos
                    </Link>
                </p>
            </div>
        </section>
    );
}
