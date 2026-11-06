"use client";

import { Accordion, AccordionItem } from "@heroui/react";
import { serializeJsonLd } from "@/lib/seo";
import { motion } from "framer-motion";
import { formatFaqCancellationAnswer } from "@/lib/cancellation-policy";
import { useCancellationPolicy } from "@/hooks/use-cancellation-policy";

function buildFaqs(cancelAnswer: string) {
    return [
        {
            key: "pago",
            question: "¿Cómo funciona el pago protegido?",
            answer: "Al reservar, tu pago se guarda en una cuenta segura. El artista solo recibe el dinero una vez que el evento ha finalizado satisfactoriamente. Si el artista no se presenta, se te devuelve el 100% de la tarifa del músico.",
        },
        {
            key: "respuesta",
            question: "¿Qué pasa si el músico no responde a mi solicitud?",
            answer: "Si un artista no responde dentro de las primeras 24 horas, te avisamos automáticamente y te sugerimos hasta 3 agrupaciones verificadas disponibles en tu ciudad. También puedes cotizar con varios artistas a la vez sin compromiso.",
        },
        {
            key: "comision",
            question: "¿Cuánto cobra la plataforma y qué incluye el total?",
            answer: "El músico recibe el 100% de su tarifa acordada (0% de comisión para el artista). Antes de pagar verás el desglose completo: tarifa del músico, comisión de servicio de Chivapp y cargo de pasarela de Mercado Pago.",
        },
        {
            key: "metodos-pago",
            question: "¿Es seguro pagar con Yape o tarjeta?",
            answer: "Sí. Todos los cobros se procesan mediante Mercado Pago con cifrado bancario. Puedes pagar con Yape, tarjetas de débito o crédito y otros medios habilitados por Mercado Pago.",
        },
        {
            key: "cancelar",
            question: "¿Puedo cancelar una reserva?",
            answer: cancelAnswer,
        },
        {
            key: "cotizar",
            question: "¿Cómo cotizo sin compromiso?",
            answer: "Simplemente navega por la lista de artistas, selecciona los que te gusten y presiona 'Pedir cotización'. Ingresa los detalles de tu evento una sola vez, y los artistas te enviarán sus propuestas de precio. Es totalmente gratis.",
        },
        {
            key: "verificado",
            question: "¿Cómo sé que el músico es real?",
            answer: "Cada perfil pasa por una revisión de identidad (DNI/CE), material audiovisual propio y datos de cobro verificados, para que veas exactamente lo que vas a contratar antes de reservar.",
        },
        {
            key: "contrato",
            question: "¿Hay un contrato de por medio?",
            answer: "Sí. Antes del evento se genera un contrato con los términos acordados, firmado digitalmente por ambas partes desde la plataforma para proteger a ambos.",
        },
        {
            key: "musico",
            question: "¿Cómo me uno como músico y cuándo cobro?",
            answer: "Publica tu perfil gratis con tu bio, géneros, fotos y videos (la revisión toma 24 a 48 horas hábiles). No cobramos comisión al músico: recibes el 100% de tu tarifa acordada una vez finalizado el evento y completadas las reseñas o liquidado por administración.",
        },
    ];
}

export default function FaqSection() {
    const policy = useCancellationPolicy();
    const faqs = buildFaqs(formatFaqCancellationAnswer(policy));
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
            className="scroll-mt-24 py-24 md:py-32 bg-background border-t border-default-200/60"
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
            />
            <div className="max-w-[800px] mx-auto px-4 sm:px-6 md:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12 sm:mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                        Preguntas frecuentes
                    </h2>
                    <p className="text-default-500 text-lg text-pretty">
                        Lo que más preguntan contratistas y músicos antes de empezar.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                >
                    <Accordion
                        variant="splitted"
                        className="px-0 gap-4"
                        itemClasses={{
                            base: "rounded-2xl! border border-default-200/70 bg-content1 shadow-soft px-2",
                            title: "font-bold text-foreground text-base sm:text-lg",
                            content: "text-default-500 text-sm sm:text-base leading-relaxed pb-6 text-pretty",
                            trigger: "py-4 sm:py-5",
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
                </motion.div>
            </div>
        </section>
    );
}
