"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useAuthModal } from "@/contexts/auth-modal-context";

type MessageTarget = "how-it-works" | "home-content" | "register-musician";

const messages: {
    title: string;
    subtitle: string;
    ctaLabel: string;
    target: MessageTarget;
}[] = [
    {
        title: "Encontrar músicos nunca fue tan fácil",
        subtitle: "Mira cómo funciona reservar en minutos.",
        ctaLabel: "Cómo funciona",
        target: "how-it-works",
    },
    {
        title: "Reserva tu evento de manera segura.",
        subtitle: "Con contrato firmado y pago protegido.",
        ctaLabel: "Explorar ahora",
        target: "home-content",
    },
    {
        title: "Crea tu perfil y da a conocer tu arte.",
        subtitle: "¿Eres músico? También puedes unirte.",
        ctaLabel: "Publica tu perfil",
        target: "register-musician",
    },
];

const CAROUSEL_MS = 4000;

export default function RotatingMessageCard() {
    const [index, setIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const { openRegister } = useAuthModal();

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % messages.length);
            setProgress(0);
        }, CAROUSEL_MS);

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) return 100;
                return prev + 100 / (CAROUSEL_MS / 50);
            });
        }, 50);

        return () => {
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, []);

    const current = messages[index];

    function handleCta(target: MessageTarget) {
        if (target === "register-musician") {
            openRegister({ defaultRole: "musician", redirect: "/musician/profile" });
            return;
        }
        document
            .getElementById(target)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <div className="relative bg-gradient-brand rounded-3xl sm:rounded-4xl p-5 sm:p-6 md:p-7 break-inside-avoid shadow-glow-lg min-h-48 sm:min-h-56 md:min-h-64 flex flex-col overflow-hidden">
            <div className="pointer-events-none absolute -top-8 -right-8 size-28 sm:size-32 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 size-32 sm:size-40 rounded-full bg-secondary-900/20 blur-3xl" />

            <div className="relative flex-1 flex flex-col justify-center min-h-0">
                {/* H1 Oficial para Google (Invisible para el usuario pero perfecto para SEO) */}
                <h1 className="sr-only">
                    Contrata mariachis, orquestas y músicos para tu evento en Chivapp
                </h1>
                
                <div key={index} className="animate-fade-in-up flex flex-col gap-3 sm:gap-4">
                    <div>
                        <h2 className="text-lg min-[400px]:text-xl sm:text-2xl md:text-[1.75rem] font-bold leading-snug tracking-tight text-white text-balance">
                            {current.title}
                        </h2>
                        <p className="text-white/85 text-sm sm:text-[0.95rem] md:text-base max-w-xs text-pretty leading-relaxed mt-1.5 sm:mt-2">
                            {current.subtitle}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleCta(current.target)}
                        className="group relative isolate self-start overflow-hidden rounded-full shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                    >
                        {/* Fondo base + el propio "loader" rellenando el botón:
                            ya no hay una barra de progreso separada. */}
                        <span
                            className="absolute inset-0 bg-white/35"
                            aria-hidden
                        />
                        <span
                            className="absolute inset-y-0 left-0 bg-white transition-[width] duration-75 ease-linear"
                            style={{ width: `${progress}%` }}
                            aria-hidden
                        />
                        <span className="relative z-10 flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-primary">
                            {current.ctaLabel}
                            <Icon
                                icon="material-symbols:arrow-right-alt"
                                width={16}
                                className="transition-transform duration-200 group-hover:translate-x-0.5"
                            />
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
