import type { BookingOut } from "@/types/api";

function roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Comisión de plataforma sobre el precio del músico (solo la paga el contratista). */

export function contractorPayableTotal(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
> & Partial<Pick<BookingOut, "platform_fee_amount">>): number | null {
    if (booking.price_agreed == null) return null;
    const M = Number(booking.price_agreed);
    if (!Number.isFinite(M)) return null;
    if (booking.platform_fee_amount != null) {
        const fee = Number(booking.platform_fee_amount);
        if (Number.isFinite(fee) && fee > 0) {
            return roundCurrency(M + fee);
        }
    }
    const g_percent = booking.platform_fee_percent != null ? Number(booking.platform_fee_percent) : 0;
    const g = g_percent / 100;

    // Mercado Pago variables (Peru)
    const F = 1.18;
    const p = 0.0412;

    const c_unico = (M * (1 + g) + F) / (1 - p);
    return roundCurrency(c_unico);
}

export function platformFeeAmount(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
> & Partial<Pick<BookingOut, "platform_fee_amount">>): number {
    if (booking.platform_fee_amount != null) {
        const fee = Number(booking.platform_fee_amount);
        if (Number.isFinite(fee) && fee > 0) {
            return roundCurrency(fee);
        }
    }
    const total = contractorPayableTotal(booking);
    const price = booking.price_agreed != null ? Number(booking.price_agreed) : 0;
    if (total == null || total <= 0) return 0;
    return roundCurrency(total - price);
}

export function platformAppFeeAmount(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
>): number {
    const price = booking.price_agreed != null ? Number(booking.price_agreed) : 0;
    const g_percent = booking.platform_fee_percent != null ? Number(booking.platform_fee_percent) : 0;
    const g = g_percent / 100;
    return roundCurrency(price * g);
}

export function platformGatewayFeeAmount(booking: Pick<
    BookingOut,
    "price_agreed" | "platform_fee_percent"
> & Partial<Pick<BookingOut, "platform_fee_amount">>): number {
    const total = contractorPayableTotal(booking);
    const appFee = platformAppFeeAmount(booking);
    const price = booking.price_agreed != null ? Number(booking.price_agreed) : 0;
    if (total == null || total <= 0) return 0;
    return roundCurrency(total - price - appFee);
}
