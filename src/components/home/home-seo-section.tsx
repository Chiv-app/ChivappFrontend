import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

const EVENT_TYPES = [
    "bodas",
    "cumpleaños",
    "quinceañeros",
    "bautizos",
    "aniversarios",
    "serenatas",
    "eventos corporativos",
];

/**
 * Texto propio de la home, renderizado en el servidor para que buscadores y lectores
 * de pantalla lo reciban como contenido. No cita cifras: solo describe el servicio.
 */
export default function HomeSeoSection() {
    return (
        <section
            aria-labelledby="home-seo-title"
            className="container mx-auto max-w-content px-4 sm:px-6 py-12 sm:py-16"
        >
            <div className="max-w-3xl flex flex-col gap-3 text-default-600 text-sm sm:text-base leading-relaxed">
                <h2
                    id="home-seo-title"
                    className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
                >
                    Música para cada tipo de evento en Perú
                </h2>
                <p>
                    {SITE_NAME} reúne a músicos y agrupaciones de distintos géneros para{" "}
                    {EVENT_TYPES.slice(0, -1).join(", ")} y {EVENT_TYPES[EVENT_TYPES.length - 1]}.
                    Explora los perfiles, escucha su repertorio, pide tu cotización y reserva con
                    contrato digital y pago protegido por Mercado Pago.
                </p>
                <p>
                    <Link
                        href="/musicians"
                        className="font-semibold text-primary-text underline underline-offset-2"
                    >
                        Explorar todos los músicos
                    </Link>
                </p>
            </div>
        </section>
    );
}
