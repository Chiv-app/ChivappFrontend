import { Icon } from "@iconify/react";

const features = [
    {
        icon: "material-symbols:verified-user-outline",
        title: "Perfiles verificados",
        description:
            "Cada músico muestra fotos, videos y repertorio real antes de que reserves.",
    },
    {
        icon: "material-symbols:contract-edit-outline",
        title: "Contrato firmado digital",
        description:
            "Los términos del evento quedan por escrito y firmados antes de la fecha.",
    },
    {
        icon: "material-symbols:encrypted-outline",
        title: "Pago protegido",
        description:
            "Tu dinero queda retenido en la plataforma y se libera al músico al terminar el show.",
    },
    {
        icon: "material-symbols:location-on-outline",
        title: "Ubicación en vivo",
        description:
            "El día del evento puedes seguir la ubicación del músico camino al lugar.",
    },
    {
        icon: "material-symbols:notifications-active-outline",
        title: "Seguimiento en tiempo real",
        description:
            "Notificaciones en cada paso: aceptación, contrato, pago y confirmación.",
    },
    {
        icon: "material-symbols:reviews-outline",
        title: "Reseñas después del evento",
        description:
            "Contratistas y músicos se califican al finalizar, para que la próxima elección sea más fácil.",
    },
];

export default function WhyChivappSection() {
    return (
        <section
            id="why-chivapp"
            className="scroll-mt-24 py-14 sm:py-20 md:py-24"
        >
            <div className="max-w-content mx-auto px-4 sm:px-6 md:px-8 text-center">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-xs font-semibold uppercase tracking-wide mb-4 sm:mb-5">
                    Por qué Chivapp
                </span>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight text-balance px-1">
                    Contratar música, sin sorpresas
                </h2>

                <p className="text-default-600 max-w-xl mx-auto mb-10 sm:mb-14 text-sm sm:text-base text-pretty px-1">
                    Todo lo que necesitas para reservar con confianza, de principio a fin.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="group flex flex-col items-center text-center gap-4 p-7 sm:p-8 rounded-3xl sm:rounded-4xl border border-default-200/70 bg-content1 shadow-soft hover:-translate-y-2 hover:shadow-xl hover:border-primary/40 hover:bg-gradient-to-b from-content1 to-primary/5 transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="flex size-14 sm:size-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground shadow-inner">
                                <Icon icon={feature.icon} width={28} height={28} />
                            </div>
                            <h3 className="text-foreground font-bold text-lg sm:text-xl">
                                {feature.title}
                            </h3>
                            <p className="text-default-600 text-sm sm:text-base leading-relaxed text-pretty">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
