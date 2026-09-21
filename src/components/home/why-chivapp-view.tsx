"use client";

import { motion } from "framer-motion";

export default function WhyChivappSection() {
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
                        Por qu\u00e9 Chivapp
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight text-foreground">
                        Construido para tu tranquilidad
                    </h2>
                    <p className="text-default-500 text-lg md:text-xl text-pretty">
                        La \u00fanica plataforma que te protege y te acompa\u00f1a desde la primera cotizaci\u00f3n hasta el aplauso final.
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
                                \uD83D\uDEE1\uFE0F
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-foreground">
                                Pagos 100% Seguros
                            </h3>
                            <p className="text-default-500 text-base md:text-lg leading-relaxed text-pretty">
                                Tu dinero est\u00e1 protegido. Retenemos el pago en una b\u00f3veda virtual de garant\u00eda y solo lo liberamos al artista cuando el evento concluye exitosamente.
                            </p>
                        </div>
                        {/* Decoraci\u00f3n Visual */}
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
                                Sigue la ubicaci\u00f3n de la agrupaci\u00f3n en tiempo real hasta que llegan a tu puerta.
                            </p>
                        </div>
                        <div className="mt-auto w-16 h-16 bg-background rounded-full flex items-center justify-center text-primary text-3xl font-bold shadow-lg group-hover:scale-110 transition-transform origin-bottom-left relative z-10">
                            \uD83D\uDCCD
                        </div>
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    </motion.div>

                    {/* Bloque 3: Cotizaciones */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                        className="md:col-span-5 bg-content1 border border-default-200/70 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden group hover:shadow-xl hover:border-default-300 transition-all shadow-soft"
                    >
                        <div className="w-14 h-14 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-2xl mb-8 group-hover:rotate-12 transition-transform">
                            \u26A1
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-4 tracking-tight text-foreground">
                            Cotizaciones al instante
                        </h3>
                        <p className="text-default-500 mb-8 text-pretty">
                            Compara precios de m\u00faltiples grupos simult\u00e1neamente sin llamadas inc\u00f3modas.
                        </p>
                        
                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-auto relative z-10">
                            <div className="px-4 py-2 bg-background border border-default-200 rounded-full text-sm font-semibold shadow-sm text-foreground">S/ 450</div>
                            <div className="px-4 py-2 bg-foreground text-background border border-foreground rounded-full text-sm font-bold shadow-md sm:scale-110 origin-left">S/ 400</div>
                            <div className="px-4 py-2 bg-background border border-default-200 rounded-full text-sm font-semibold shadow-sm text-foreground">S/ 520</div>
                        </div>
                    </motion.div>

                    {/* Bloque 4: Rese\u00f1as Reales */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
                        className="md:col-span-7 bg-content1 border border-default-200/70 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden group hover:shadow-xl hover:border-default-300 transition-all shadow-soft"
                    >
                        <div className="flex items-center gap-1 mb-8">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <span key={i} className="text-xl sm:text-2xl text-warning">\u2B50</span>
                            ))}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-foreground">
                            Rese\u00f1as 100% Reales
                        </h3>
                        <p className="text-default-500 text-base md:text-lg mb-8 max-w-lg text-pretty">
                            Solo usuarios que han completado un evento a trav\u00e9s de Chivapp pueden dejar una valoraci\u00f3n. Calidad garantizada.
                        </p>

                        <div className="mt-auto bg-background border border-default-200 rounded-2xl p-4 flex gap-4 items-center w-full max-w-[400px]">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">"La mejor orquesta que contrat\u00e9."</p>
                                <p className="text-xs text-default-500 truncate">Mar\u00eda P. - Boda en Miraflores</p>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
