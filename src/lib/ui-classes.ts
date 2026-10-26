/** Shared Tailwind class strings for the v2 design system. */
export const UI = {
    surfaceCard:
        "rounded-4xl border border-default-200/70 bg-content1 shadow-soft",
    surfaceCardHover:
        "hover:shadow-elevated hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300",
    surfaceCardInteractive:
        "rounded-4xl border border-default-200/70 bg-content1 shadow-soft hover:shadow-elevated hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300",
    pageHero:
        "rounded-4xl border border-default-200/70 bg-gradient-to-br from-primary/15 via-content1 to-content1 px-4 py-5 sm:px-6 sm:py-6 shadow-soft overflow-hidden relative",
    pageTitle:
        "text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight",
    pageSubtitle: "text-default-500 mt-2 text-sm sm:text-base",
    sectionTitle: "text-xl font-bold text-foreground",
    sectionSubtitle: "text-sm text-default-500 mt-1",
    heroCard: "rounded-4xl border border-default-200/70 shadow-soft",
    statCard: "border border-default-200/70 shadow-soft",
    listRow:
        "rounded-4xl border border-default-200/70 bg-content1 shadow-soft hover:shadow-elevated hover:border-primary/30 transition-all duration-300",
    stickyBar:
        "sticky bottom-4 z-10 rounded-4xl border border-default-200/70 bg-content1/90 backdrop-blur-xl p-3 sm:p-4 shadow-elevated flex flex-wrap items-center justify-between gap-3",
    /** Wide data tables: keep card chrome, allow horizontal scroll on small screens. */
    tablePanel:
        "rounded-3xl border border-default-200/70 bg-content1 shadow-soft overflow-x-auto",
    primaryButton:
        "font-semibold shadow-glow hover:shadow-glow-lg transition-shadow",
    skeleton: "rounded-4xl bg-content1 border border-default-200/70 animate-pulse",
    input: {
        inputWrapper: "border-default-400 data-[hover=true]:border-default-500",
        input: "placeholder:text-default-500",
    },
    authInput: {
        input: "placeholder:text-default-600",
    },
} as const;
