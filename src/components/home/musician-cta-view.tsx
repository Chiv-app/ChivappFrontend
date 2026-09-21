"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuthModal } from "@/contexts/auth-modal-context";

export default function MusicianCtaSection() {
    const { openRegister } = useAuthModal();

    return (
        <section className="px-4 sm:px-6 lg:px-8 pb-10 pt-16">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-[1600px] mx-auto bg-foreground text-background rounded-[3rem] px-6 py-20 md:py-32 text-center relative overflow-hidden"
            >
                {/* Efecto visual oscuro de fondo */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                
                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                    <motion.span 
                        initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", delay: 0.3 }}
                        className="text-5xl md:text-6xl mb-8 block"
                    >
                        \uD83D\uDE80
                    </motion.span>
                    <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-balance">
                        Es momento de celebrar
                    </h2>
                    <p className="text-lg md:text-2xl text-background/80 mb-12 text-pretty">
                        Cientos de agrupaciones est\u00e1n listas para hacer de tu evento algo inolvidable.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-6 mb-16 sm:mb-24 w-full sm:w-auto">
                        <Link 
                            href="/musicos"
                            className="inline-flex justify-center items-center px-10 py-5 rounded-full bg-background text-foreground font-bold text-lg hover:scale-105 transition-transform shadow-xl w-full sm:w-auto"
                        >
                            Encontrar m\u00fasicos
                        </Link>
                    </div>

                    {/* Separador y CTA M\u00fasicos */}
                    <div className="w-full max-w-3xl border-t border-background/20 pt-12 mt-4 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                        <div>
                            <h3 className="text-2xl font-bold mb-2">
                                \u00bfEres m\u00fasico o tienes una banda?
                            </h3>
                            <p className="text-background/80 text-pretty">
                                \u00danete a Chivapp y consigue m\u00e1s eventos cada mes.
                            </p>
                        </div>
                        <button 
                            onClick={() => openRegister({ defaultRole: "musician", redirect: "/musician/profile" })}
                            className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md font-semibold text-sm transition-colors border border-white/20 shrink-0 w-full md:w-auto"
                        >
                            Registrarme como artista
                        </button>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
