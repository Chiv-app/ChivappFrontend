"use client";

import { Icon } from "@iconify/react";
import StartBookingButton from "@/components/auth/start-booking-button";

export default function ProcessSection() {
    const steps = [
        {
            title: "Solicita tu reserva",
            description:
                "Comparte la fecha, el lugar y los detalles de tu evento. El músico responde directo, sin intermediarios.",
            icon: "material-symbols:edit-note",
        },
        {
            title: "Firma el contrato",
            description:
                "Acuerden el precio final y firmen el contrato digital antes del evento. Todo queda por escrito.",
            icon: "material-symbols:contract-edit-outline",
        },
        {
            title: "Disfruta tu evento",
            description:
                "Tu pago queda retenido de forma segura y se libera al músico solo cuando el show termina.",
            icon: "material-symbols:payments",
        },
    ];

    return (
        <section
            id="how-it-works"
            className="scroll-mt-24 border-t border-default-200/60 bg-content1/40 py-14 sm:py-20 md:py-24"
        >
            <div className="max-w-content mx-auto px-4 sm:px-6 md:px-8 text-center">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-xs font-semibold uppercase tracking-wide mb-4 sm:mb-5">
                    Confianza de principio a fin
                </span>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight text-balance px-1">
                    El estándar seguro para contratar músicos
                </h2>

                <p className="text-default-600 max-w-xl mx-auto mb-10 sm:mb-14 md:mb-16 text-sm sm:text-base text-pretty px-1">
                    Desde la solicitud hasta el aplauso final, cada paso queda
                    documentado, firmado y protegido — para que sepas siempre en
                    qué punto está tu evento.
                </p>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8">
                    <div
                        aria-hidden
                        className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px bg-linear-to-r from-transparent via-default-300 to-transparent -z-10"
                    />

                    {steps.map((step, index) => (
                        <div
                            key={step.title}
                            className="group relative flex flex-col items-center gap-3 sm:gap-4"
                        >
                            {index < steps.length - 1 ? (
                                <div
                                    aria-hidden
                                    className="md:hidden absolute left-1/2 top-[3.5rem] bottom-[-2rem] w-px -translate-x-1/2 bg-linear-to-b from-default-300 via-default-200 to-transparent"
                                />
                            ) : null}

                            <div className="size-12 sm:size-14 shrink-0 rounded-full bg-content2 text-foreground ring-1 ring-default-200/80 flex items-center justify-center font-bold text-base sm:text-lg leading-none tabular-nums transition-colors duration-300 group-hover:bg-primary group-hover:text-white group-hover:ring-transparent group-hover:shadow-glow relative z-10">
                                {index + 1}
                            </div>

                            <div className="p-6 sm:p-8 flex flex-col items-center rounded-3xl sm:rounded-4xl border border-default-200/70 bg-content1 shadow-soft w-full max-w-md md:max-w-none mx-auto hover:-translate-y-2 hover:shadow-xl hover:border-primary/40 transition-all duration-300 relative z-10 overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-150 transition-transform duration-500">
                                    <Icon icon={step.icon} width={120} height={120} />
                                </div>
                                <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground relative z-10">
                                    <Icon
                                        icon={step.icon}
                                        width={26}
                                        height={26}
                                    />
                                </div>

                                <h3 className="text-foreground font-bold text-lg sm:text-xl mb-3 relative z-10">
                                    {step.title}
                                </h3>

                                <p className="text-default-600 text-sm sm:text-base leading-relaxed text-pretty relative z-10">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 sm:mt-16 flex justify-center px-1">
                    <StartBookingButton />
                </div>
            </div>
        </section>
    );
}
