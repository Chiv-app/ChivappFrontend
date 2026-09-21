"use client";

import { Accordion, AccordionItem } from "@heroui/react";
import { motion } from "framer-motion";

const faqs = [
    {
        key: "pago",
        question: "\u00bfC\u00f3mo funciona el pago protegido?",
        answer: "Al reservar, tu pago se guarda en una cuenta segura. El artista solo recibe el dinero una vez que el evento ha finalizado satisfactoriamente. Si el artista no se presenta, se te devuelve el 100% de tu dinero.",
    },
    {
        key: "cancelar",
        question: "\u00bfPuedo cancelar una reserva?",
        answer: "S\u00ed, puedes cancelar. Dependiendo de la anticipaci\u00f3n con la que canceles y las pol\u00edticas espec\u00edficas del m\u00fasico (visibles al momento de reservar), podr\u00edas recibir un reembolso completo o parcial.",
    },
    {
        key: "cotizar",
        question: "\u00bfC\u00f3mo cotizo sin compromiso?",
        answer: "Simplemente navega por la lista de artistas, selecciona los que te gusten y presiona 'Solicitar cotizaci\u00f3n'. Ingresa los detalles de tu evento una sola vez, y los artistas te enviar\u00e1n sus propuestas de precio. Es totalmente gratis.",
    },
    {
        key: "verificado",
        question: "\u00bfC\u00f3mo s\u00e9 que el m\u00fasico es real?",
        answer: "Cada perfil pasa por un proceso de verificaci\u00f3n e incluye fotos, videos y repertorio propio, para que veas exactamente lo que vas a contratar antes de reservar.",
    },
    {
        key: "contrato",
        question: "\u00bfHay un contrato de por medio?",
        answer: "S\u00ed. Antes del evento se genera un contrato con los t\u00e9rminos acordados, firmado digitalmente por ambas partes desde la plataforma para proteger a ambos.",
    },
    {
        key: "musico",
        question: "\u00bfC\u00f3mo me uno como m\u00fasico?",
        answer: "Publica tu perfil gratis con tu bio, g\u00e9neros, fotos y videos. En cuanto est\u00e9 listo, empiezas a recibir solicitudes de contratistas de tu ciudad.",
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
                        Lo que m\u00e1s preguntan contratistas y m\u00fasicos antes de empezar.
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
