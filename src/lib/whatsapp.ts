/**
 * Utilidades para enlaces directos de WhatsApp (`wa.me`) según decisión D8:
 * sin API de pago de Meta, usando enlaces directos con mensaje prellenado.
 */

function normalizePhone(phone?: string | null): string {
    if (!phone) return "";
    const digits = phone.replace(/\D+/g, "");
    if (!digits) return "";
    if (digits.length === 9 && digits.startsWith("9")) {
        return `51${digits}`;
    }
    return digits;
}

export function buildWhatsAppShareUrl(message: string, phone?: string | null): string {
    const cleanPhone = normalizePhone(phone);
    const encoded = encodeURIComponent(message.trim());
    if (cleanPhone) {
        return `https://wa.me/${cleanPhone}?text=${encoded}`;
    }
    return `https://wa.me/?text=${encoded}`;
}

export function buildMusicianProfileWhatsAppUrl(params: {
    stageName: string;
    profileUrl: string;
    city?: string | null;
}): string {
    const locationPart = params.city ? ` en ${params.city}` : "";
    const text = `Mira mi perfil verificado de ${params.stageName}${locationPart} en Chivapp y cotiza para tu evento con pago protegido: ${params.profileUrl}`;
    return buildWhatsAppShareUrl(text);
}

export function buildEnsembleInviteWhatsAppUrl(params: {
    ensembleName: string;
    inviteUrl: string;
    memberPhone?: string | null;
}): string {
    const text = `Hola, te invité a unirte a la agrupación "${params.ensembleName}" en Chivapp. Acepta la invitación aquí: ${params.inviteUrl}`;
    return buildWhatsAppShareUrl(text, params.memberPhone);
}
