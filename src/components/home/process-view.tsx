"use client";

import { motion } from "framer-motion";

const steps = [
    {
        title: "Explora",
        description: "Busca por g\u00e9nero, precio o ciudad. Mira videos reales y lee rese\u00f1as aut\u00e9nticas.",
        icon: "🔍",
    },
    {
        title: "Cotiza",
        description: "Pide cotizaciones a m\u00faltiples artistas al mismo tiempo, sin compromisos.",
        icon: "📝",
    },
    {
        title: "Reserva Seguro",
        description: "Realiza el pago protegido. El dinero se libera solo cuando el evento termina.",
        icon: "🔒",
    },
    {
        title: "Disfruta",
        description: "Sigue la llegada del m\u00fasico por GPS en vivo y conc\u00e9ntrate en disfrutar la fiesta.",
        icon: "🎉",
    },
];

export default function ProcessSection() {
    return (
        <section
            id="how-it-works"
            className="scroll-mt-24 border-t border-default-200/60 bg-content1/40 py-24 md:py-32 overflow-hidden"
        >
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-20"
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight text-foreground">
                        Tu evento perfecto, en 4 pasos
                    </h2>
                    <p className="text-default-500 text-lg md:text-xl text-pretty">
                        Olv\u00eddate de las agendas complicadas. Hemos simplificado la contrataci\u00f3n de m\u00fasica en vivo.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 relative">
                    {/* L\u00ednea conectora (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-transparent via-default-200 to-transparent z-0" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={step.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                            className="relative z-10 flex flex-col items-center text-center group"
                        >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-background border-4 border-content1 shadow-soft flex items-center justify-center text-3xl sm:text-4xl mb-6 group-hover:scale-110 group-hover:border-primary transition-all duration-300">
                                {step.icon}
                            </div>
                            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                                {index + 1}
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold mb-3 text-foreground">
                                {step.title}
                            </h3>
                            <p className="text-default-500 text-sm sm:text-base text-pretty">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
