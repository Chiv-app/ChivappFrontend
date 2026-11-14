/**
 * Páginas donde la barra superior y la de precio se muestran solo después de hacer scroll:
 * el perfil público de un músico y su vista previa dentro de la guía de alta.
 */
export function isScrollRevealRoute(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    return (
        /^\/musicians\/[^/]+\/?$/.test(pathname) ||
        pathname.startsWith("/musician/onboarding/preview")
    );
}
