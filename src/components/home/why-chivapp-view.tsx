"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type Review = {
    id: string;
    rating: number;
    comment: string;
    author_label: string;
    event_type: string | null;
    created_at: string;
};

type Props = {
    reviews?: Review[];
};

export default function WhyChivappSection({ reviews = [] }: Props) {
    const [reviewIndex, setReviewIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        if (reviews.length <= 1 || isPaused || shouldReduceMotion) return;
        const interval = setInterval(() => {
            setReviewIndex((current) => (current + 1) % reviews.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [reviews, isPaused, shouldReduceMotion]);

    return (
        <section
            id="why-chivapp"
            className="scroll-mt-24 py-24 md:py-32 border-t border-default-200/60 bg-content1/20"
        >
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary-text text-xs font-semibold mb-4 sm:mb-5">
                        Por qué Chivapp
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight text-foreground">
                        Construido para tu tranquilidad
                    </h2>
                    <p className="text-default-500 text-lg md:text-xl text-pretty">
                        La única plataforma que te protege y te acompaña desde la primera cotización hasta el aplauso final.
                    </p>
                </motion.div>

                {/* Grid Bento Modular */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto">
                    {/* Bloque 1: Pagos Seguros */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="md:col-span-8 bg-content1 border border-default-200/70 rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between overflow-hidden relative group hover:shadow-xl hover:border-default-300 transition-all shadow-soft"
                    >
                        <div className="relative z-10 max-w-lg">
                            <div
                                aria-hidden="true"
                                className="w-16 h-16 rounded-full bg-success/15 text-success-text flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform"
                            >
                                🛡️
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-foreground">
                                Pagos 100% seguros
                            </h3>
                            <p className="text-default-500 text-base md:text-lg leading-relaxed text-pretty">
                                Tu dinero está protegido. Retenemos el pago en garantía y solo lo liberamos al artista cuando el evento concluye satisfactoriamente.
                            </p>
                        </div>
                        <div
                            aria-hidden="true"
                            className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-96 h-96 bg-success/10 blur-3xl rounded-full pointer-events-none"
                        />
                    </motion.div>

                    {/* Bloque 2: GPS en Vivo */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="md:col-span-4 bg-primary text-primary-foreground border border-primary/20 rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between overflow-hidden relative group hover:shadow-xl transition-all shadow-soft"
                    >
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-4 tracking-tight">
                                GPS en vivo
                            </h3>
                            <p className="text-primary-foreground/85 text-base mb-12 text-pretty">
                                Sigue la ubicación de la agrupación en tiempo real hasta que llegan a tu evento.
                            </p>
                        </div>
                        <div
                            aria-hidden="true"
                            className="mt-auto w-16 h-16 bg-background rounded-full flex items-center justify-center text-primary-text text-3xl font-bold shadow-lg group-hover:scale-110 transition-transform origin-bottom-left relative z-10"
                        >
                            📍
                        </div>
                        <div
                            aria-hidden="true"
                            className="absolute right-0 top-0 w-64 h-64 bg-white/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
                        />
                    </motion.div>

                    {/* Bloque 3: Cotizaciones */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="md:col-span-5 bg-content1 border border-default-200/70 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden group hover:shadow-xl hover:border-default-300 transition-all shadow-soft"
                    >
                        <div
                            aria-hidden="true"
                            className="w-14 h-14 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-2xl mb-8 group-hover:rotate-12 transition-transform"
                        >
                            ⚡
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-4 tracking-tight text-foreground">
                            Cotizaciones al instante
                        </h3>
                        <p className="text-default-500 mb-8 text-pretty">
                            Compara propuestas de múltiples agrupaciones sin llamadas incómodas.
                        </p>

                        <div
                            aria-hidden="true"
                            className="flex flex-wrap gap-2 sm:gap-3 mt-auto relative z-10"
                        >
                            <div className="px-4 py-2 bg-background border border-default-200 rounded-full text-sm font-semibold shadow-sm text-default-500">
                                Propuesta A
                            </div>
                            <div className="px-4 py-2 bg-foreground text-background border border-foreground rounded-full text-sm font-bold shadow-md sm:scale-105 origin-left">
                                Propuesta elegida
                            </div>
                            <div className="px-4 py-2 bg-background border border-default-200 rounded-full text-sm font-semibold shadow-sm text-default-500">
                                Propuesta B
                            </div>
                        </div>
                    </motion.div>

                    {/* Bloque 4: Reseñas Reales */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        onFocusCapture={() => setIsPaused(true)}
                        onBlurCapture={() => setIsPaused(false)}
                        className="md:col-span-7 bg-content1 border border-default-200/70 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden group hover:shadow-xl hover:border-default-300 transition-all shadow-soft"
                    >
                        <div
                            role="img"
                            aria-label="Calificación promedio de 5 estrellas"
                            className="flex items-center gap-1 mb-6"
                        >
                            {[1, 2, 3, 4, 5].map((i) => (
                                <span
                                    key={i}
                                    aria-hidden="true"
                                    className="text-xl sm:text-2xl text-warning"
                                >
                                    ⭐
                                </span>
                            ))}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-foreground">
                            Reseñas verificadas
                        </h3>
                        <p className="text-default-500 text-base md:text-lg mb-6 max-w-lg text-pretty">
                            Solo los contratistas que completaron un evento pagado en Chivapp pueden calificar al artista.
                        </p>

                        <div className="mt-auto min-h-[120px] w-full max-w-[520px] relative">
                            {reviews.length > 0 ? (
                                <>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={reviewIndex}
                                            initial={
                                                shouldReduceMotion
                                                    ? false
                                                    : { opacity: 0, y: 10 }
                                            }
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={
                                                shouldReduceMotion
                                                    ? undefined
                                                    : { opacity: 0, y: -10 }
                                            }
                                            transition={{ duration: 0.35 }}
                                            className="bg-background border border-default-200 rounded-2xl p-4 flex gap-4 items-center"
                                        >
                                            <div
                                                aria-hidden="true"
                                                className="w-12 h-12 rounded-full bg-primary/15 text-primary-text shrink-0 flex items-center justify-center text-xl font-bold uppercase"
                                            >
                                                {reviews[reviewIndex].author_label.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-foreground line-clamp-2">
                                                    &ldquo;{reviews[reviewIndex].comment}&rdquo;
                                                </p>
                                                <p className="text-xs text-default-500 mt-1">
                                                    {reviews[reviewIndex].author_label} •{" "}
                                                    {reviews[reviewIndex].event_type ||
                                                        "Evento privado"}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                    {reviews.length > 1 && (
                                        <div
                                            className="flex items-center gap-1 mt-3"
                                            role="group"
                                            aria-label="Controles del carrusel de reseñas"
                                        >
                                            {reviews.slice(0, 6).map((rev, idx) => (
                                                <button
                                                    key={rev.id}
                                                    type="button"
                                                    onClick={() => setReviewIndex(idx)}
                                                    aria-label={`Ver reseña ${idx + 1} de ${rev.author_label}`}
                                                    aria-pressed={reviewIndex === idx}
                                                    className="inline-flex min-h-11 min-w-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className={`h-2.5 rounded-full transition-all ${
                                                            reviewIndex === idx
                                                                ? "w-6 bg-primary-text"
                                                                : "w-2.5 bg-default-300 hover:bg-default-400"
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                            {!shouldReduceMotion && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPaused((prev) => !prev)}
                                                    aria-pressed={isPaused}
                                                    aria-label={
                                                        isPaused
                                                            ? "Reanudar carrusel de reseñas"
                                                            : "Pausar carrusel de reseñas"
                                                    }
                                                    className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-default-200 bg-background text-default-600 hover:text-foreground hover:bg-default-100 transition-colors"
                                                >
                                                    <Icon
                                                        icon={
                                                            isPaused
                                                                ? "material-symbols:play-arrow-rounded"
                                                                : "material-symbols:pause-rounded"
                                                        }
                                                        width={16}
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="bg-background border border-default-200 rounded-2xl p-4 flex gap-4 items-center">
                                    <div
                                        aria-hidden="true"
                                        className="w-12 h-12 rounded-full bg-primary/15 text-primary-text shrink-0 flex items-center justify-center text-lg font-bold"
                                    >
                                        ★
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            Calificaciones 100% verificadas tras cada presentación
                                        </p>
                                        <p className="text-xs text-default-500 mt-0.5">
                                            Revisa las opiniones reales en el perfil de cada agrupación.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
