"use client";

import { Accordion, AccordionItem } from "@heroui/react";

const faqs = [
    {
        key: "reservar",
        question: "¿Cómo reservo a un músico?",
        answer: "Explora los perfiles, elige al músico que te guste y envía una solicitud de reserva con los detalles de tu evento. El músico revisa la solicitud y acuerdan juntos los detalles finales antes de confirmar.",
    },
    {
        key: "pago",
        question: "¿Qué pasa con mi pago?",
        answer: "Tu pago queda protegido dentro de la plataforma desde que confirmas la reserva. El músico solo recibe el dinero después de que el evento se realiza, así que no liberas fondos hasta ver el show cumplido.",
    },
    {
        key: "verificado",
        question: "¿Cómo sé que el músico es real?",
        answer: "Cada perfil pasa por un proceso de verificación e incluye fotos, videos y repertorio propio, para que veas exactamente lo que vas a contratar antes de reservar.",
    },
    {
        key: "contrato",
        question: "¿Hay un contrato de por medio?",
        answer: "Sí. Antes del evento se genera un contrato con los términos acordados, firmado digitalmente por ambas partes desde la plataforma.",
    },
    {
        key: "compartir",
        question: "¿Puedo compartir el evento con mis invitados?",
        answer: "Sí, puedes generar un enlace para que tus invitados vean el evento y dejen sus reacciones, sin necesidad de que tengan una cuenta.",
    },
    {
        key: "musico",
        question: "¿Cómo me uno como músico?",
        answer: "Publica tu perfil gratis con tu bio, géneros, fotos y videos. En cuanto esté listo, empiezas a recibir solicitudes de contratistas verificados.",
    },
];

export default function FaqSection() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };

    return (
        <section
            id="faq"
            className="scroll-mt-24 border-t border-default-200/60 bg-content1/40 py-14 sm:py-20 md:py-24"
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
                <div className="text-center mb-10 sm:mb-14">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-xs font-semibold uppercase tracking-wide mb-4 sm:mb-5">
                        Preguntas frecuentes
                    </span>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight text-balance px-1">
                        ¿Tienes dudas?
                    </h2>

                    <p className="text-default-600 max-w-xl mx-auto text-sm sm:text-base text-pretty px-1">
                        Lo que más preguntan contratistas y músicos antes de empezar.
                    </p>
                </div>

                <Accordion
                    variant="splitted"
                    className="px-0 gap-3"
                    itemClasses={{
                        base: "rounded-3xl! border border-default-200/70 bg-content1 shadow-soft px-2",
                        title: "font-semibold text-foreground text-sm sm:text-base",
                        content: "text-default-600 text-sm leading-relaxed pb-4",
                    }}
                >
                    {faqs.map((faq) => (
                        <AccordionItem
                            key={faq.key}
                            aria-label={faq.question}
                            title={faq.question}
                        >
                            {faq.answer}
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
