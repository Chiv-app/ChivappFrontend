"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

const phrases = [
    "La banda sonora de tus mejores momentos.",
    "El mejor mariachi para tu serenata.",
    "Orquestas para celebrar a lo grande.",
    "Encuentra el DJ ideal para tu fiesta."
];

export default function HeroSearchSection() {
    const [index, setIndex] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((current) => (current + 1) % phrases.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative w-full pt-36 sm:pt-48 pb-16 flex flex-col justify-center items-center px-4 text-center overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 top-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] bg-primary/15 rounded-full blur-[120px] opacity-70" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-20 max-w-4xl mx-auto flex flex-col items-center"
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-default-200/70 bg-content1/50 backdrop-blur-md mb-8 shadow-soft">
                    <Icon icon="twemoji:party-popper" className="text-xl" />
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                        Música en vivo para cualquier evento
                    </span>
                </div>
                
                {/* H1 para indexación y lectores de pantalla */}
                <h1 className="sr-only">
                    La banda sonora de tus mejores momentos. Encuentra y reserva mariachis, orquestas, djs y más.
                </h1>
                
                <div aria-hidden="true" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 min-h-[140px] sm:min-h-[160px] md:min-h-[200px] flex items-center justify-center w-full">
                    <div className="relative w-full flex justify-center text-foreground">
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={index}
                                initial={{ opacity: 0, y: 30, rotateX: -90 }}
                                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                exit={{ opacity: 0, y: -30, rotateX: 90 }}
                                transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                                className="absolute block w-full text-balance"
                                style={{ transformOrigin: "50% 50%" }}
                            >
                                {phrases[index]}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>
                
                <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="text-lg md:text-xl text-default-600 max-w-2xl mb-12 mt-4 text-pretty"
                >
                    Explora orquestas, DJs, bandas de rock, mariachis y más. Cotiza al instante y reserva con pagos protegidos.
                </motion.p>
                
                {/* Search Pill */}
                <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="flex flex-col sm:flex-row items-center w-full max-w-3xl bg-content1 border border-default-200/70 sm:rounded-full rounded-3xl p-2.5 shadow-elevated backdrop-blur-xl"
                >
                    <div 
                        className="flex-1 flex items-center w-full px-6 border-b sm:border-b-0 sm:border-r border-default-200 hover:bg-default-100 sm:rounded-l-full rounded-t-3xl sm:rounded-tr-none cursor-pointer transition-colors py-3 sm:py-2"
                        onClick={() => router.push("/musicians")}
                    >
                        <Icon icon="twemoji:round-pushpin" className="text-2xl mr-4 opacity-70" />
                        <div className="text-left w-full overflow-hidden">
                            <p className="text-xs font-bold uppercase text-foreground">Ubicación</p>
                            <p className="text-sm text-default-500 truncate w-full">¿Dónde es tu evento?</p>
                        </div>
                    </div>
                    <div 
                        className="flex-1 flex items-center w-full px-6 hover:bg-default-100 cursor-pointer transition-colors py-3 sm:py-2 rounded-b-3xl sm:rounded-none"
                        onClick={() => router.push("/musicians")}
                    >
                        <Icon icon="twemoji:guitar" className="text-2xl mr-4 opacity-70" />
                        <div className="text-left w-full overflow-hidden">
                            <p className="text-xs font-bold uppercase text-foreground">Estilo musical</p>
                            <p className="text-sm text-default-500 truncate w-full">Salsa, Rock, DJ, Mariachi...</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => router.push("/musicians")}
                        className="w-full sm:w-16 h-14 sm:h-16 mt-2 sm:mt-0 rounded-2xl sm:rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 transition-transform shrink-0 shadow-lg"
                        aria-label="Buscar músicos"
                    >
                        <Icon icon="material-symbols:search-rounded" width={28} height={28} />
                    </button>
                </motion.div>
                
            </motion.div>
        </section>
    );
}
