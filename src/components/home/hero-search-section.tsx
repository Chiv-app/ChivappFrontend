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

    const [location, setLocation] = useState("");
    const [style, setStyle] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((current) => (current + 1) % phrases.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    function handleSearch(e?: React.FormEvent) {
        e?.preventDefault();
        const params = new URLSearchParams();
        if (location.trim()) params.append("location", location.trim());
        if (style.trim()) params.append("q", style.trim());
        router.push(`/musicians?${params.toString()}`);
    }

    return (
        <section className="relative w-full pt-32 sm:pt-40 pb-16 flex flex-col justify-center items-center px-4 text-center overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 top-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] bg-primary/15 rounded-full blur-[120px] opacity-70" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-20 max-w-4xl mx-auto flex flex-col items-center w-full"
            >
                {/* H1 para indexación y lectores de pantalla */}
                <h1 className="sr-only">
                    Chivapp – Contrata mariachis y músicos para tu evento en Perú
                </h1>
                
                <div aria-hidden="true" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 min-h-[160px] sm:min-h-[180px] md:min-h-[220px] lg:min-h-[240px] flex items-center justify-center w-full">
                    <div className="w-full flex justify-center text-foreground">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={index}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.4 }}
                                className="block w-full text-balance"
                            >
                                {phrases[index]}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>
                
                <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="text-lg md:text-xl text-default-600 max-w-2xl mb-12 mt-4 text-pretty px-4"
                >
                    Explora orquestas, DJs, bandas de rock, mariachis y más. Cotiza al instante y reserva con pagos protegidos.
                </motion.p>
                
                {/* Search Form Pill */}
                <motion.form 
                    onSubmit={handleSearch}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="flex flex-col sm:flex-row items-center w-full max-w-3xl bg-content1 border border-default-200/70 sm:rounded-full rounded-3xl p-2.5 shadow-elevated backdrop-blur-xl"
                >
                    <div className="flex-1 flex items-center w-full px-4 sm:px-6 border-b sm:border-b-0 sm:border-r border-default-200 hover:bg-default-100 sm:rounded-l-full rounded-t-3xl sm:rounded-tr-none transition-colors py-2 group focus-within:bg-default-100 cursor-text" onClick={() => document.getElementById("hero-location")?.focus()}>
                        <Icon icon="twemoji:round-pushpin" className="text-2xl mr-3 sm:mr-4 opacity-70 shrink-0" />
                        <div className="text-left w-full overflow-hidden flex flex-col">
                            <label htmlFor="hero-location" className="text-[10px] sm:text-xs font-bold uppercase text-foreground cursor-pointer">Ubicación</label>
                            <input 
                                id="hero-location"
                                type="text" 
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="¿Dónde es tu evento?" 
                                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-default-400 w-full p-0 m-0 focus:ring-0"
                            />
                        </div>
                    </div>
                    <div className="flex-1 flex items-center w-full px-4 sm:px-6 hover:bg-default-100 transition-colors py-2 rounded-b-3xl sm:rounded-none group focus-within:bg-default-100 cursor-text" onClick={() => document.getElementById("hero-style")?.focus()}>
                        <Icon icon="twemoji:guitar" className="text-2xl mr-3 sm:mr-4 opacity-70 shrink-0" />
                        <div className="text-left w-full overflow-hidden flex flex-col">
                            <label htmlFor="hero-style" className="text-[10px] sm:text-xs font-bold uppercase text-foreground cursor-pointer">Estilo musical</label>
                            <input 
                                id="hero-style"
                                type="text" 
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                placeholder="Salsa, Rock, DJ..." 
                                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-default-400 w-full p-0 m-0 focus:ring-0"
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full sm:w-16 h-12 sm:h-16 mt-2 sm:mt-0 rounded-2xl sm:rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 transition-transform shrink-0 shadow-lg"
                        aria-label="Buscar músicos"
                    >
                        <Icon icon="material-symbols:search-rounded" width={28} height={28} />
                    </button>
                </motion.form>
                
            </motion.div>
        </section>
    );
}
