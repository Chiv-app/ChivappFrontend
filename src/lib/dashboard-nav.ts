import type { UserRole } from "@/types/api";

export type DashboardNavItem = {
    href: string;
    label: string;
    icon: string;
    requiresVerification?: boolean;
};

export type DashboardModule = {
    href: string;
    title: string;
    description: string;
    icon: string;
    requiresVerification?: boolean;
    comingSoon?: boolean;
};

export const MUSICIAN_NAV: DashboardNavItem[] = [
    {
        href: "/musician",
        label: "Resumen",
        icon: "material-symbols:dashboard",
        requiresVerification: true,
    },
    {
        href: "/musician/profile",
        label: "Mi perfil",
        icon: "material-symbols:person",
    },
    {
        href: "/musician/bookings",
        label: "Reservas",
        icon: "material-symbols:calendar-month",
        requiresVerification: true,
    },
    {
        href: "/musician/members",
        label: "Integrantes",
        icon: "material-symbols:groups",
        requiresVerification: true,
    },
    {
        href: "/musician/payouts",
        label: "Pagos",
        icon: "material-symbols:account-balance-wallet",
        requiresVerification: true,
    },
    {
        href: "/musician/earnings",
        label: "Ingresos",
        icon: "material-symbols:payments",
        requiresVerification: true,
    },
    {
        href: "/musician/reports",
        label: "Reportes",
        icon: "material-symbols:analytics",
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
        label: "Pagos",
        icon: "material-symbols:payments",
    },
    { href: "/admin/activity", label: "Actividad", icon: "material-symbols:history" },
    { href: "/admin/emails", label: "Correos", icon: "material-symbols:mail" },
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
        description: "Pipeline completo: cambios, pagos, shares y cancelaciones.",
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
        icon: "material-symbols:dashboard",
        requiresVerification: true,
    },
    {
        href: "/contractor/profile",
        label: "Mi perfil",
        icon: "material-symbols:verified-user",
    },
    {
        href: "/contractor/bookings",
        label: "Mis reservas",
        icon: "material-symbols:event-available",
        requiresVerification: true,
    },
    {
        href: "/contractor/operations",
        label: "Operaciones",
        icon: "material-symbols:receipt-long",
        requiresVerification: true,
    },
    {
        href: "/contractor/notifications",
        label: "Notificaciones",
        icon: "material-symbols:notifications",
        requiresVerification: true,
    },
];

export const MUSICIAN_MODULES: DashboardModule[] = [
    {
        href: "/musician/bookings",
        title: "Reservas",
        description: "Atiende cotizaciones, valida pagos y sigue cada presentación.",
        icon: "material-symbols:calendar-month",
        requiresVerification: true,
    },
    {
        href: "/musician/members",
        title: "Integrantes",
        description: "Gestiona tu agrupación, especialidades, convocatorias y repartos.",
        icon: "material-symbols:groups",
        requiresVerification: true,
    },
    {
        href: "/musician/payouts",
        title: "Pagos",
        description: "Paga a tus integrantes por reserva, con montos y estados pendientes.",
        icon: "material-symbols:account-balance-wallet",
        requiresVerification: true,
    },
    {
        href: "/musician/earnings",
        title: "Ingresos",
        description: "Controla lo cotizado, retenido y liberado de tus eventos.",
        icon: "material-symbols:payments",
        requiresVerification: true,
    },
    {
        href: "/musician/reports",
        title: "Reportes",
        description:
            "Gráficas y tablas de reservas, ingresos, integrantes y quejas con filtros.",
        icon: "material-symbols:analytics",
        requiresVerification: true,
    },
    {
        href: "/musician/profile",
        title: "Mi perfil",
        description: "Actualiza tu información artística, fotos, videos y tarifas.",
        icon: "material-symbols:edit-document",
    },
    {
        href: "/musician/notifications",
        title: "Notificaciones",
        description: "Mantente al día con novedades sobre tus reservas y pagos.",
        icon: "material-symbols:notifications-active",
        requiresVerification: true,
    },
];

export const CONTRACTOR_MODULES: DashboardModule[] = [
    {
        href: "/contractor/profile",
        title: "Gestionar perfil",
        description: "Actualiza tus datos personales y documentos de verificación.",
        icon: "material-symbols:badge",
    },
    {
        href: "/contractor/bookings",
        title: "Reservas y presentaciones",
        description: "Administra tus eventos contratados y el estado de cada reserva.",
        icon: "material-symbols:celebration",
        requiresVerification: true,
    },
    {
        href: "/contractor/operations",
        title: "Operaciones",
        description:
            "Pendientes, pagos, disputas y reembolsos de tus reservas en un solo lugar.",
        icon: "material-symbols:receipt-long",
        requiresVerification: true,
    },
    {
        href: "/contractor/notifications",
        title: "Notificaciones",
        description: "Recibe alertas sobre reservas, pagos y contratos.",
        icon: "material-symbols:notifications-active",
        requiresVerification: true,
    },
    {
        href: "/musicians",
        title: "Explorar músicos",
        description: "Encuentra artistas verificados para tu próximo evento.",
        icon: "material-symbols:search",
        requiresVerification: true,
    },
];

export function getRoleHomePath(role: UserRole): string {
    if (role === "admin") return "/admin";
    // Landing público como home para músico y contratista.
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

export function isNavItemActive(pathname: string, href: string): boolean {
    if (href === "/musician" || href === "/contractor" || href === "/admin") {
        return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function isVerifiedOnlyPath(
    pathname: string,
    navItems: DashboardNavItem[],
): boolean {
    const match = navItems.find((item) => isNavItemActive(pathname, item.href));
    return match?.requiresVerification === true;
}

/** Rutas que un integrante (sin perfil publicado) sí puede usar. */
export function isEnsembleMemberAllowedPath(pathname: string): boolean {
    return (
        pathname === "/musician" ||
        pathname === "/musician/profile" ||
        pathname === "/musician/bookings" ||
        pathname.startsWith("/musician/bookings/") ||
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
        href === "/musician/earnings" ||
        href === "/musician/notifications"
    );
}
