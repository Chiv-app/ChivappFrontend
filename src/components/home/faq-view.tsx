"use client";

import { Accordion, AccordionItem } from "@heroui/react";
import { motion } from "framer-motion";

const faqs = [
    {
        key: "pago",
        question: "¿Cómo funciona el pago protegido?",
        answer: "Al reservar, tu pago se guarda en una cuenta segura. El artista solo recibe el dinero una vez que el evento ha finalizado satisfactoriamente. Si el artista no se presenta, se te devuelve el 100% de tu dinero.",
    },
    {
        key: "cancelar",
        question: "¿Puedo cancelar una reserva?",
        answer: "Sí, puedes cancelar. Dependiendo de la anticipación con la que canceles y las políticas específicas del músico (visibles al momento de reservar), podrías recibir un reembolso completo o parcial.",
    },
    {
        key: "cotizar",
        question: "¿Cómo cotizo sin compromiso?",
        answer: "Simplemente navega por la lista de artistas, selecciona los que te gusten y presiona 'Solicitar cotización'. Ingresa los detalles de tu evento una sola vez, y los artistas te enviarán sus propuestas de precio. Es totalmente gratis.",
    },
    {
        key: "verificado",
        question: "¿Cómo sé que el músico es real?",
        answer: "Cada perfil pasa por un proceso de verificación e incluye fotos, videos y repertorio propio, para que veas exactamente lo que vas a contratar antes de reservar.",
    },
    {
        key: "contrato",
        question: "¿Hay un contrato de por medio?",
        answer: "Sí. Antes del evento se genera un contrato con los términos acordados, firmado digitalmente por ambas partes desde la plataforma para proteger a ambos.",
    },
    {
        key: "musico",
        question: "¿Cómo me uno como músico?",
        answer: "Publica tu perfil gratis con tu bio, géneros, fotos y videos. En cuanto esté listo, empiezas a recibir solicitudes de contratistas de tu ciudad.",
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
            className="scroll-mt-24 py-24 md:py-32 bg-background border-t border-default-200/60"
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
