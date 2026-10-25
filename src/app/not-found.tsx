import Link from "next/link";
import { Icon } from "@iconify/react";

export default function NotFound() {
    return (
        <div className="min-h-[75dvh] bg-default-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-content1 rounded-3xl p-8 text-center shadow-lg border border-default-100">
                <div className="w-16 h-16 bg-primary/10 text-primary-text rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon icon="solar:compass-big-bold-duotone" width={36} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary-text mb-2">
                    Error 404
                </p>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                    Página no encontrada
                </h1>
                <p className="text-sm text-default-600 mb-6 leading-relaxed">
                    La dirección que buscas no existe, cambió de ubicación o el enlace ya no está disponible.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        href="/musicians"
                        className="inline-flex items-center justify-center gap-2 flex-1 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                        Explorar músicos
                        <Icon icon="solar:music-note-bold" width={18} />
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 flex-1 h-11 px-4 rounded-xl border border-default-200 bg-content2 text-foreground font-semibold text-sm hover:bg-default-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                        Ir al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
