import type { BookingOut } from "@/types/api";

/** Comisión de plataforma sobre el precio del músico (solo la paga el contratista). */

export function contractorPayableTotal(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
>): number | null {
    if (booking.price_agreed == null) return null;
    const M = Number(booking.price_agreed);
    const g_percent = booking.platform_fee_percent != null ? Number(booking.platform_fee_percent) : 0;
    const g = g_percent / 100;
    
    // Mercado Pago variables (Peru)
    const F = 1.18;
    const p = 0.0412;
    
    const c_unico = (M * (1 + g) + F) / (1 - p);
    return Math.round(c_unico * 100) / 100;
}

export function platformFeeAmount(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
>): number {
    const total = contractorPayableTotal(booking);
    const price = booking.price_agreed != null ? Number(booking.price_agreed) : 0;
    if (total == null || total <= 0) return 0;
    return Math.round((total - price) * 100) / 100;
}

export function platformAppFeeAmount(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
>): number {
    const price = booking.price_agreed != null ? Number(booking.price_agreed) : 0;
    const g_percent = booking.platform_fee_percent != null ? Number(booking.platform_fee_percent) : 0;
    const g = g_percent / 100;
    return Math.round((price * g) * 100) / 100;
}

export function platformGatewayFeeAmount(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
>): number {
    const total = contractorPayableTotal(booking);
    const appFee = platformAppFeeAmount(booking);
    const price = booking.price_agreed != null ? Number(booking.price_agreed) : 0;
    if (total == null || total <= 0) return 0;
    return Math.round((total - price - appFee) * 100) / 100;
}

export function contractorAdvanceDue(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
>): number | null {
    return contractorPayableTotal(booking);
}

export function contractorRemainingAfterAdvance(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
>): number | null {
    return 0;
}
