"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

const phrases = [
    "La banda sonora de tus mejores momentos.",
    "El mejor mariachi para tu serenata.",
    "Orquestas para celebrar a lo grande.",
    "Encuentra el DJ ideal para tu fiesta.",
];

export default function HeroSearchSection() {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const shouldReduceMotion = useReducedMotion();
    const router = useRouter();

    const [location, setLocation] = useState("");
    const [style, setStyle] = useState("");

    useEffect(() => {
        if (shouldReduceMotion || paused) return;
        const interval = setInterval(() => {
            setIndex((current) => (current + 1) % phrases.length);
        }, 4500);
        return () => clearInterval(interval);
    }, [shouldReduceMotion, paused]);

    function handleSearch(e?: React.FormEvent) {
        e?.preventDefault();
        const params = new URLSearchParams();
        if (location.trim()) params.append("location", location.trim());
        if (style.trim()) params.append("q", style.trim());
        const qs = params.toString();
        router.push(qs ? `/musicians?${qs}` : "/musicians");
    }

    return (
        <section className="relative w-full pt-28 sm:pt-36 pb-14 flex flex-col justify-center items-center px-4 text-center overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 top-0 pointer-events-none -z-10" aria-hidden="true">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] bg-primary/15 rounded-full blur-[120px] opacity-70" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-20 max-w-4xl mx-auto flex flex-col items-center w-full"
            >
                <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3.5 py-1 text-xs font-semibold text-primary-text mb-4">
                    Mariachis, orquestas y DJs verificados en Perú
                </p>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-3 text-balance text-foreground">
                    Contrata mariachis y músicos verificados para tu evento
                </h1>

                <div
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    className="min-h-[44px] flex items-center justify-center gap-2 mb-3 px-4"
                >
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={index}
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="text-lg sm:text-xl md:text-2xl font-semibold text-primary-text text-balance"
                        >
                            {phrases[index]}
                        </motion.p>
                    </AnimatePresence>
                    {!shouldReduceMotion && (
                        <button
                            type="button"
                            onClick={() => setPaused((prev) => !prev)}
                            aria-pressed={paused}
                            aria-label={
                                paused
                                    ? "Reanudar animación de frases"
                                    : "Pausar animación de frases"
                            }
                            className="inline-flex min-w-11 min-h-11 items-center justify-center rounded-full border border-default-200 bg-content1/80 text-default-600 hover:text-foreground hover:bg-default-100 transition-colors shrink-0"
                        >
                            <Icon
                                icon={
                                    paused
                                        ? "material-symbols:play-arrow-rounded"
                                        : "material-symbols:pause-rounded"
                                }
                                width={16}
                                aria-hidden="true"
                            />
                        </button>
                    )}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-base sm:text-lg md:text-xl text-default-600 max-w-2xl mb-10 text-pretty px-4"
                >
                    Explora orquestas, DJs, bandas de rock, mariachis y más. Pide tu cotización al instante y reserva con pagos protegidos.
                </motion.p>

                {/* Search Form Pill */}
                <motion.form
                    onSubmit={handleSearch}
                    role="search"
                    aria-label="Buscar músicos por ubicación y estilo"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center w-full max-w-3xl bg-content1 border border-default-200/80 sm:rounded-full rounded-3xl p-2.5 shadow-elevated backdrop-blur-xl"
                >
                    <label
                        htmlFor="hero-location"
                        className="flex-1 flex items-center w-full px-4 sm:px-6 border-b sm:border-b-0 sm:border-r border-default-200 hover:bg-default-100/70 sm:rounded-l-full rounded-t-2xl sm:rounded-tr-none transition-colors py-2.5 cursor-text focus-within:bg-default-100"
                    >
                        <Icon
                            icon="twemoji:round-pushpin"
                            className="text-2xl mr-3 sm:mr-4 opacity-80 shrink-0"
                            aria-hidden="true"
                        />
                        <span className="text-left w-full overflow-hidden flex flex-col">
                            <span className="text-xs font-semibold text-foreground">
                                Ubicación
                            </span>
                            <input
                                id="hero-location"
                                name="location"
                                type="text"
                                autoComplete="address-level2"
                                enterKeyHint="search"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="¿Dónde es tu evento? (ej. Lima)"
                                className="bg-transparent border-none text-base sm:text-sm text-foreground placeholder:text-default-400 w-full p-0 m-0 focus-visible:outline-none"
                            />
                        </span>
                    </label>

                    <label
                        htmlFor="hero-style"
                        className="flex-1 flex items-center w-full px-4 sm:px-6 hover:bg-default-100/70 transition-colors py-2.5 rounded-b-2xl sm:rounded-none cursor-text focus-within:bg-default-100"
                    >
                        <Icon
                            icon="twemoji:guitar"
                            className="text-2xl mr-3 sm:mr-4 opacity-80 shrink-0"
                            aria-hidden="true"
                        />
                        <span className="text-left w-full overflow-hidden flex flex-col">
                            <span className="text-xs font-semibold text-foreground">
                                Estilo o agrupación
                            </span>
                            <input
                                id="hero-style"
                                name="q"
                                type="search"
                                enterKeyHint="search"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                placeholder="Mariachi, salsa, rock, DJ..."
                                className="bg-transparent border-none text-base sm:text-sm text-foreground placeholder:text-default-400 w-full p-0 m-0 focus-visible:outline-none"
                            />
                        </span>
                    </label>

                    <button
                        type="submit"
                        className="w-full sm:w-auto sm:min-w-14 h-12 sm:h-14 mt-2 sm:mt-0 px-6 sm:px-5 rounded-2xl sm:rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shrink-0 shadow-lg cursor-pointer"
                        aria-label="Buscar músicos"
                    >
                        <Icon
                            icon="material-symbols:search-rounded"
                            width={24}
                            height={24}
                            aria-hidden="true"
                        />
                        <span className="sm:hidden">Buscar músicos</span>
                    </button>
                </motion.form>
            </motion.div>
        </section>
    );
}
