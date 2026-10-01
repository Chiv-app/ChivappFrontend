"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

    useEffect(() => {
        if (reviews.length <= 1) return;
        const interval = setInterval(() => {
            setReviewIndex((current) => (current + 1) % reviews.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [reviews]);

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
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-xs font-semibold uppercase tracking-wide mb-4 sm:mb-5">
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
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                        className="md:col-span-8 bg-content1 border border-default-200/70 rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between overflow-hidden relative group hover:shadow-xl hover:border-default-300 transition-all shadow-soft"
                    >
                        <div className="relative z-10 max-w-lg">
                            <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">
                                🛡️
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-foreground">
                                Pagos 100% Seguros
                            </h3>
                            <p className="text-default-500 text-base md:text-lg leading-relaxed text-pretty">
                                Tu dinero está protegido. Retenemos el pago en una bóveda virtual de garantía y solo lo liberamos al artista cuando el evento concluye exitosamente.
                            </p>
                        </div>
                        {/* Decoración Visual */}
                        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-96 h-96 bg-success/10 blur-3xl rounded-full pointer-events-none" />
                    </motion.div>

                    {/* Bloque 2: GPS en Vivo */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
                        className="md:col-span-4 bg-primary text-primary-foreground border border-primary/20 rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between overflow-hidden relative group hover:shadow-xl transition-all shadow-soft"
                    >
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-4 tracking-tight">GPS en Vivo</h3>
                            <p className="text-primary-foreground/80 text-base mb-12 text-pretty">
                                Sigue la ubicación de la agrupación en tiempo real hasta que llegan a tu puerta.
                            </p>
                        </div>
                        <div className="mt-auto w-16 h-16 bg-background rounded-full flex items-center justify-center text-primary text-3xl font-bold shadow-lg group-hover:scale-110 transition-transform origin-bottom-left relative z-10">
                            📍
                        </div>
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    </motion.div>

                    {/* Bloque 3: Cotizaciones */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                        className="md:col-span-5 bg-content1 border border-default-200/70 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden group hover:shadow-xl hover:border-default-300 transition-all shadow-soft"
                    >
                        <div className="w-14 h-14 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-2xl mb-8 group-hover:rotate-12 transition-transform">
                            ⚡
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-4 tracking-tight text-foreground">
                            Cotizaciones al instante
                        </h3>
                        <p className="text-default-500 mb-8 text-pretty">
                            Compara propuestas de múltiples grupos simultáneamente sin llamadas incómodas.
                        </p>
                        
                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-auto relative z-10">
                            <div className="px-4 py-2 bg-background border border-default-200 rounded-full text-sm font-semibold shadow-sm text-foreground/50">Propuesta A</div>
                            <div className="px-4 py-2 bg-foreground text-background border border-foreground rounded-full text-sm font-bold shadow-md sm:scale-110 origin-left">Propuesta Elegida</div>
                            <div className="px-4 py-2 bg-background border border-default-200 rounded-full text-sm font-semibold shadow-sm text-foreground/50">Propuesta B</div>
                        </div>
                    </motion.div>

                    {/* Bloque 4: Reseñas Reales */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
                        className="md:col-span-7 bg-content1 border border-default-200/70 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden group hover:shadow-xl hover:border-default-300 transition-all shadow-soft"
                    >
                        <div className="flex items-center gap-1 mb-8">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <span key={i} className="text-xl sm:text-2xl text-warning">⭐</span>
                            ))}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-foreground">
                            Reseñas
                        </h3>
                        <p className="text-default-500 text-base md:text-lg mb-8 max-w-lg text-pretty">
                            Solo los contratistas que han completado un evento pagado a través de Chivapp pueden dejar una valoración. Calidad garantizada.
                        </p>

                        <div className="mt-auto h-[120px] w-full max-w-[500px] relative">
                            {reviews.length > 0 ? (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={reviewIndex}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 bg-background border border-default-200 rounded-2xl p-4 flex gap-4 items-center"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary shrink-0 flex items-center justify-center text-xl font-bold uppercase">
                                            {reviews[reviewIndex].author_label.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-foreground line-clamp-2">
                                                "{reviews[reviewIndex].comment}"
                                            </p>
                                            <p className="text-xs text-default-500 mt-1">
                                                {reviews[reviewIndex].author_label} • {reviews[reviewIndex].event_type || "Evento privado"}
                                            </p>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                <div className="absolute inset-0 bg-background border border-default-200 rounded-2xl p-4 flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-full bg-default-200 shrink-0 flex items-center justify-center text-default-500 font-bold">
                                        💬
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="h-4 bg-default-200 rounded w-3/4 mb-2 animate-pulse" />
                                        <div className="h-3 bg-default-100 rounded w-1/2 animate-pulse" />
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
