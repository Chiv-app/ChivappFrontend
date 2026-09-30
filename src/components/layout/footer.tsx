import Link from "next/link";
import AppLogo from "@/components/layout/app-logo";

export default function Footer() {
    return (
        <footer className="relative bg-default-900 text-white overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-brand" />
            <div className="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative max-w-footer mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-14 md:py-16">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 sm:gap-10 mb-10 sm:mb-12">
                    <div className="max-w-sm">
                        <AppLogo height={42} className="mb-3 sm:mb-4" color="white" />
                        <p className="text-white/65 text-sm leading-relaxed text-pretty">
                            Conectamos personas con músicos excepcionales para
                            eventos inolvidables.
                        </p>
                    </div>

                    <ul className="space-y-2.5 sm:space-y-3 text-sm text-white/65">
                        <li>
                            <Link
                                href="/musicians"
                                className="hover:text-primary-300 transition"
                            >
                                Explorar músicos
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/#how-it-works"
                                className="hover:text-primary-300 transition"
                            >
                                Cómo funciona
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/legal/terminos"
                                className="hover:text-primary-300 transition"
                            >
                                Términos y Condiciones
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/legal/privacidad"
                                className="hover:text-primary-300 transition"
                            >
                                Privacidad y Cookies
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="border-t border-white/10 mb-5 sm:mb-6" />

                <p className="text-xs sm:text-sm text-white/55 text-center sm:text-left">
                    © {new Date().getFullYear()} Chivapp. Todos los derechos
                    reservados.
                </p>
            </div>
        </footer>
    );
}
