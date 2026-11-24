import type { UserRole } from "@/types/api";

export type DashboardSubItem = {
    href: string;
    label: string;
    icon: string;
    description?: string;
    requiresVerification?: boolean;
    ensembleAllowed?: boolean;
};

export type DashboardNavItem = {
    href: string;
    label: string;
    icon: string;
    category?: string;
    description?: string;
    /** Additional route prefixes that belong to this unified hub. */
    matchPrefixes?: string[];
    /** Sub-tabs rendered inside the unified module hub. */
    subItems?: DashboardSubItem[];
    requiresVerification?: boolean;
    requiresEmailVerification?: boolean;
};

export type DashboardModule = {
    href: string;
    title: string;
    description: string;
    icon: string;
    badge?: string;
    subLinks?: Array<{ label: string; href: string; icon?: string }>;
    requiresVerification?: boolean;
    comingSoon?: boolean;
};

export const MUSICIAN_NAV: DashboardNavItem[] = [
    {
        href: "/musician",
        label: "Resumen",
        icon: "material-symbols:dashboard-rounded",
        category: "Principal",
        description: "Indicadores y accesos rápidos",
        requiresVerification: true,
    },
    {
        href: "/musician/profile",
        label: "Mi perfil",
        icon: "material-symbols:person",
        category: "Cuenta",
        description: "Datos, portafolio y verificación",
    },
    {
        href: "/musician/bookings",
        label: "Agenda",
        icon: "material-symbols:calendar-month-rounded",
        category: "Operación",
        description: "Reservas, calendario y links de pago",
        matchPrefixes: ["/musician/bookings", "/musician/calendar", "/musician/links"],
        requiresVerification: true,
        subItems: [
            {
                href: "/musician/bookings",
                label: "Reservas",
                icon: "material-symbols:event-upcoming-rounded",
                description: "Solicitudes, contratas y shows en curso",
                requiresVerification: true,
                ensembleAllowed: true,
            },
            {
                href: "/musician/calendar",
                label: "Calendario",
                icon: "material-symbols:calendar-view-week-rounded",
                description: "Vista mensual/semanal y Google Calendar",
                ensembleAllowed: true,
            },
            {
                href: "/musician/links",
                label: "Enlaces de pago",
                icon: "material-symbols:add-link-rounded",
                description: "Links rápidos de contratación y firma",
                requiresVerification: true,
            },
        ],
    },
    {
        href: "/musician/members",
        label: "Equipo",
        icon: "material-symbols:groups-rounded",
        category: "Agrupación",
        description: "Integrantes y reparto por show",
        matchPrefixes: ["/musician/members", "/musician/payouts"],
        requiresVerification: true,
        subItems: [
            {
                href: "/musician/members",
                label: "Integrantes",
                icon: "material-symbols:groups-rounded",
                description: "Directorio, especialidades e invitaciones",
                requiresVerification: true,
            },
            {
                href: "/musician/payouts",
                label: "Reparto por evento",
                icon: "material-symbols:account-balance-wallet-rounded",
                description: "Liquidación y pagos a tu agrupación",
                requiresVerification: true,
            },
        ],
    },
    {
        href: "/musician/earnings",
        label: "Finanzas",
        icon: "material-symbols:payments-rounded",
        category: "Dinero y Analítica",
        description: "Mis cobros, retiros y reportes",
        matchPrefixes: ["/musician/earnings", "/musician/reports"],
        requiresVerification: true,
        subItems: [
            {
                href: "/musician/earnings",
                label: "Mis cobros y Retiros",
                icon: "material-symbols:payments-rounded",
                description: "Deuda por show, historial y pagos como integrante",
                requiresVerification: true,
                ensembleAllowed: true,
            },
            {
                href: "/musician/reports",
                label: "Reportes y Analítica",
                icon: "material-symbols:analytics-rounded",
                description: "Métricas de ingresos, shows y conversión",
                requiresVerification: true,
            },
        ],
    },
    {
        href: "/musician/assistant",
        label: "Asistente IA",
        icon: "material-symbols:smart-toy-rounded",
        category: "Automatización",
        description: "Tarifario IA, simulador y WhatsApp",
        requiresVerification: true,
    },
    {
        href: "/musician/notifications",
        label: "Notificaciones",
        icon: "material-symbols:notifications",
        requiresVerification: true,
    },
];

export const ADMIN_NAV: DashboardNavItem[] = [
    { href: "/admin", label: "Resumen", icon: "material-symbols:dashboard" },
    { href: "/admin/users", label: "Usuarios", icon: "material-symbols:group" },
    {
        href: "/admin/musicians",
        label: "Músicos",
        icon: "material-symbols:music-note",
    },
    {
        href: "/admin/contractors",
        label: "Contratistas",
        icon: "material-symbols:business-center",
    },
    {
        href: "/admin/bookings",
        label: "Reservas",
        icon: "material-symbols:calendar-month",
    },
    {
        href: "/admin/payments",
        label: "Tesorería y pagos",
        icon: "material-symbols:payments",
    },
    { href: "/admin/activity", label: "Actividad", icon: "material-symbols:history" },
    { href: "/admin/emails", label: "Correos", icon: "material-symbols:mail" },
    {
        href: "/admin/assistant",
        label: "Asistente IA",
        icon: "material-symbols:smart-toy",
    },
    {
        href: "/admin/support",
        label: "Ayuda",
        icon: "material-symbols:support-agent",
    },
];

export const ADMIN_MODULES: DashboardModule[] = [
    {
        href: "/admin/users",
        title: "Usuarios y acceso",
        description: "Verifica, activa o suspende cuentas de toda la plataforma.",
        icon: "material-symbols:group",
    },
    {
        href: "/admin/musicians",
        title: "Moderación de músicos",
        description: "Aprueba, rechaza, despublica o solicita reenvío de perfiles.",
        icon: "material-symbols:music-note",
    },
    {
        href: "/admin/contractors",
        title: "Moderación de contratistas",
        description: "Controla identidad y publicación de perfiles contratistas.",
        icon: "material-symbols:business-center",
    },
    {
        href: "/admin/bookings",
        title: "Operaciones de reservas",
        description: "Pipeline completo: cambios, pagos, enlaces y cancelaciones.",
        icon: "material-symbols:calendar-month",
    },
    {
        href: "/admin/payments",
        title: "Tesorería y pagos",
        description: "Sigue retenciones, liberaciones y evidencias de pago.",
        icon: "material-symbols:payments",
    },
    {
        href: "/admin/activity",
        title: "Actividad en vivo",
        description: "Registros recientes de usuarios, perfiles, reservas y pagos.",
        icon: "material-symbols:history",
    },
    {
        href: "/admin/emails",
        title: "Correos y plantillas",
        description: "Edita plantillas transaccionales y revisa el historial de envíos.",
        icon: "material-symbols:mail",
    },
    {
        href: "/admin/assistant",
        title: "Asistente IA",
        description: "Define cuánto puede usar cada músico el modelo de IA, que paga Chivapp.",
        icon: "material-symbols:smart-toy",
    },
    {
        href: "/admin/support",
        title: "Ayuda y comentarios",
        description: "Revisa y responde comentarios de usuarios y visitantes.",
        icon: "material-symbols:support-agent",
    },
];

export const CONTRACTOR_NAV: DashboardNavItem[] = [
    {
        href: "/contractor",
        label: "Resumen",
        icon: "material-symbols:dashboard-rounded",
        category: "Principal",
        description: "Panel general de actividad",
    },
    {
        href: "/contractor/profile",
        label: "Mi perfil",
        icon: "material-symbols:verified-user",
        category: "Cuenta",
        description: "Datos e identidad verificada",
    },
    {
        href: "/contractor/bookings",
        label: "Mis Eventos",
        icon: "material-symbols:celebration-rounded",
        category: "Contrataciones",
        description: "Reservas y calendario de eventos",
        matchPrefixes: ["/contractor/bookings", "/contractor/calendar"],
        subItems: [
            {
                href: "/contractor/bookings",
                label: "Mis reservas",
                icon: "material-symbols:event-available-rounded",
                description: "Seguimiento de cada presentación",
            },
            {
                href: "/contractor/calendar",
                label: "Calendario",
                icon: "material-symbols:calendar-view-week-rounded",
                description: "Agenda mensual/semanal y Google Calendar",
            },
        ],
    },
    {
        href: "/contractor/operations",
        label: "Pagos y Gastos",
        icon: "material-symbols:receipt-long-rounded",
        category: "Finanzas",
        description: "Operaciones, garantías y reembolsos",
        requiresEmailVerification: true,
    },
    {
        href: "/contractor/notifications",
        label: "Notificaciones",
        icon: "material-symbols:notifications",
    },
];

export const MUSICIAN_MODULES: DashboardModule[] = [
    {
        href: "/musician/bookings",
        title: "Agenda y Reservas",
        badge: "3 vistas integradas",
        description:
            "Gestiona tus reservas, sincroniza tu calendario con Google y genera enlaces rápidos de pago en un solo módulo.",
        icon: "material-symbols:calendar-month-rounded",
        requiresVerification: true,
        subLinks: [
            {
                label: "Reservas",
                href: "/musician/bookings",
                icon: "material-symbols:event-upcoming-rounded",
            },
            {
                label: "Calendario",
                href: "/musician/calendar",
                icon: "material-symbols:calendar-view-week-rounded",
            },
            {
                label: "Enlaces de pago",
                href: "/musician/links",
                icon: "material-symbols:add-link-rounded",
            },
        ],
    },
    {
        href: "/musician/members",
        title: "Equipo y Reparto",
        badge: "2 vistas integradas",
        description:
            "Administra el directorio de integrantes de tu agrupación, convócalos a shows y liquida el reparto por evento.",
        icon: "material-symbols:groups-rounded",
        requiresVerification: true,
        subLinks: [
            {
                label: "Integrantes",
                href: "/musician/members",
                icon: "material-symbols:groups-rounded",
            },
            {
                label: "Reparto por evento",
                href: "/musician/payouts",
                icon: "material-symbols:account-balance-wallet-rounded",
            },
        ],
    },
    {
        href: "/musician/earnings",
        title: "Finanzas y Reportes",
        badge: "2 vistas integradas",
        description:
            "Controla tu dinero disponible para retirar, el historial de pagos, tus ingresos como integrante y la analítica.",
        icon: "material-symbols:payments-rounded",
        requiresVerification: true,
        subLinks: [
            {
                label: "Mis cobros y Retiros",
                href: "/musician/earnings",
                icon: "material-symbols:payments-rounded",
            },
            {
                label: "Reportes y Analítica",
                href: "/musician/reports",
                icon: "material-symbols:analytics-rounded",
            },
        ],
    },
    {
        href: "/musician/assistant",
        title: "Asistente IA",
        badge: "IA + WhatsApp",
        description:
            "Entrena tu tarifario inteligente por zona y horario, prueba el simulador en vivo y conecta tu WhatsApp.",
        icon: "material-symbols:smart-toy-rounded",
        requiresVerification: true,
        subLinks: [
            {
                label: "Tarifario y Simulador",
                href: "/musician/assistant",
                icon: "material-symbols:smart-toy-rounded",
            },
        ],
    },
];

export const CONTRACTOR_MODULES: DashboardModule[] = [
    {
        href: "/contractor/bookings",
        title: "Mis Eventos y Calendario",
        badge: "2 vistas integradas",
        description:
            "Administra tus eventos contratados, coordina en vivo con los músicos y revisa tu calendario sincronizado.",
        icon: "material-symbols:celebration-rounded",
        subLinks: [
            {
                label: "Mis reservas",
                href: "/contractor/bookings",
                icon: "material-symbols:event-available-rounded",
            },
            {
                label: "Calendario",
                href: "/contractor/calendar",
                icon: "material-symbols:calendar-view-week-rounded",
            },
        ],
    },
    {
        href: "/contractor/operations",
        title: "Pagos y Gastos",
        badge: "Pago protegido",
        description:
            "Sigue tus pagos en garantía, liberaciones, disputas y reembolsos en un solo centro financiero.",
        icon: "material-symbols:receipt-long-rounded",
    },
    {
        href: "/musicians",
        title: "Explorar músicos",
        badge: "Catálogo verificado",
        description:
            "Encuentra solistas, bandas, mariachis, orquestas y DJs verificados para tu próximo evento.",
        icon: "material-symbols:search-rounded",
    },
    {
        href: "/contractor/profile",
        title: "Mi Perfil y Verificación",
        description:
            "Actualiza tus datos personales, documento de identidad y vinculación con Google Calendar.",
        icon: "material-symbols:badge",
    },
];

export function getRoleHomePath(role: UserRole): string {
    if (role === "admin") return "/admin";
    if (role === "musician" || role === "contractor") return "/";
    return "/";
}

export function getNavItemsForRole(role: UserRole): DashboardNavItem[] {
    if (role === "admin") return ADMIN_NAV;
    if (role === "musician") return MUSICIAN_NAV;
    if (role === "contractor") return CONTRACTOR_NAV;
    return [];
}

export function getNotificationsPath(role: UserRole): string | null {
    if (role === "musician") return "/musician/notifications";
    if (role === "contractor") return "/contractor/notifications";
    if (role === "admin") return "/admin/activity";
    return null;
}

export function isNavItemActive(
    pathname: string,
    href: string,
    matchPrefixes?: string[],
): boolean {
    if (href === "/musician" || href === "/contractor" || href === "/admin") {
        return pathname === href;
    }
    if (pathname === href || pathname.startsWith(`${href}/`)) {
        return true;
    }
    if (matchPrefixes && matchPrefixes.length > 0) {
        return matchPrefixes.some(
            (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
        );
    }
    return false;
}

export function findActiveHub(
    pathname: string,
    navItems: DashboardNavItem[],
): DashboardNavItem | undefined {
    return navItems.find((item) =>
        isNavItemActive(pathname, item.href, item.matchPrefixes),
    );
}

export function isVerifiedOnlyPath(
    pathname: string,
    navItems: DashboardNavItem[],
): boolean {
    if (pathname === "/musician/calendar" || pathname === "/contractor/calendar") {
        return false;
    }
    const match = findActiveHub(pathname, navItems);
    return match?.requiresVerification === true;
}

export function isEmailVerifiedOnlyPath(
    pathname: string,
    navItems: DashboardNavItem[],
): boolean {
    const match = findActiveHub(pathname, navItems);
    if (pathname.match(/^\/contractor\/bookings\/[a-zA-Z0-9-]+$/)) {
        return false;
    }
    return match?.requiresEmailVerification === true;
}

/** Rutas que un integrante (sin perfil publicado) sí puede usar. */
export function isEnsembleMemberAllowedPath(pathname: string): boolean {
    return (
        pathname === "/musician" ||
        pathname === "/musician/profile" ||
        pathname === "/musician/bookings" ||
        pathname.startsWith("/musician/bookings/") ||
        pathname === "/musician/calendar" ||
        pathname === "/musician/earnings" ||
        pathname.startsWith("/musician/earnings/") ||
        pathname === "/musician/notifications" ||
        pathname.startsWith("/musician/notifications/")
    );
}

/** Nav visible/desbloqueada para integrantes sin verificación completa. */
export function isEnsembleMemberNavItem(href: string): boolean {
    return (
        href === "/musician" ||
        href === "/musician/profile" ||
        href === "/musician/bookings" ||
        href === "/musician/calendar" ||
        href === "/musician/earnings" ||
        href === "/musician/notifications"
    );
}
