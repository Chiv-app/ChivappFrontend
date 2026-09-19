import Link from "next/link";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

const trustBadges = [
    { icon: "material-symbols:contract-edit-outline", label: "Contrato firmado" },
    { icon: "material-symbols:encrypted-outline", label: "Pago protegido" },
    { icon: "material-symbols:verified-user-outline", label: "Perfiles verificados" },
];

export default function HeroView() {
    return (
        <section className="relative pt-4 pb-10 sm:pt-8 sm:pb-14 md:pb-16 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-xs font-semibold uppercase tracking-wide mb-4 sm:mb-5">
                Reserva segura
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight text-balance max-w-3xl mx-auto px-1">
                Contrata al músico perfecto para tu evento.
            </h2>

            <p className="text-default-600 text-base sm:text-lg max-w-2xl mx-auto mt-4 sm:mt-5 text-pretty px-1">
                Explora músicos, cotiza directo con ellos y paga
                con la tranquilidad de un contrato firmado y fondos
                protegidos hasta el final del show.
            </p>

            <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                    as={Link}
                    href="#musicians"
                    color="primary"
                    radius="full"
                    size="lg"
                    className="font-semibold shadow-glow hover:shadow-glow-lg transition-shadow w-full sm:w-auto"
                    endContent={
                        <Icon
                            icon="material-symbols:arrow-right-alt"
                            width={22}
                            height={22}
                        />
                    }
                >
                    Explorar músicos
                </Button>
            </div>

            <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 px-1">
                {trustBadges.map((badge) => (
                    <span
                        key={badge.label}
                        className="inline-flex items-center gap-1.5 rounded-full bg-content1 border border-default-200/70 shadow-soft px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-foreground"
                    >
                        <Icon
                            icon={badge.icon}
                            width={16}
                            height={16}
                            className="text-primary"
                        />
                        {badge.label}
                    </span>
                ))}
            </div>
        </section>
    );
}
