import Link from "next/link";
import { Icon } from "@iconify/react";

const SEO_LINKS = [
    { label: "Mariachis en Ayacucho", href: "/musicos/mariachi/ayacucho" },
    { label: "Mariachis en Lima", href: "/musicos/mariachi/lima" },
    { label: "Cumbia en Lima", href: "/musicos/cumbia/lima" },
    { label: "Orquestas para Bodas", href: "/musicos/orquesta" },
    { label: "Música Criolla en Cusco", href: "/musicos/musica-criolla/cusco" },
    { label: "DJs para Fiestas", href: "/musicos/dj" },
];

export default function SeoLinksView() {
    return (
        <section className="py-12 sm:py-16">
            <div className="text-center mb-8 sm:mb-10 px-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    Búsquedas Populares
                </h2>
                <p className="text-default-500 mt-2 text-sm sm:text-base">
                    Encuentra rápidamente lo que otros están contratando
                </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-4xl mx-auto px-4">
                {SEO_LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="group inline-flex items-center gap-2 rounded-full border border-default-200/70 bg-content1/60 hover:bg-content1 px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-medium text-default-700 hover:text-primary transition-all hover:shadow-soft hover:-translate-y-0.5"
                    >
                        <Icon icon="material-symbols:search-rounded" width={18} className="text-default-400 group-hover:text-primary transition-colors" />
                        {link.label}
                    </Link>
                ))}
            </div>
            
            <div className="mt-10 text-center">
                <Link href="/musicians" className="inline-flex items-center gap-1 text-sm sm:text-base font-semibold text-primary hover:underline underline-offset-4">
                    Explorar todos los géneros
                    <Icon icon="material-symbols:arrow-forward-rounded" width={18} />
                </Link>
            </div>
        </section>
    );
}
