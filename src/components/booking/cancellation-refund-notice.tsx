import { Icon } from "@iconify/react";
import {
    CANCELLATION_REFUND_STATUS_LABELS,
    formatCurrency,
    toAmount,
} from "@/lib/booking-labels";
import type { BookingOut } from "@/types/api";

type Props = {
    booking: Pick<
        BookingOut,
        | "status"
        | "cancellation_refund_amount"
        | "cancellation_refund_percent"
        | "cancellation_refund_status"
    >;
    className?: string;
};

/** Aviso del reembolso automático de una reserva cancelada (si corresponde). */
export default function CancellationRefundNotice({ booking, className = "" }: Props) {
    const amount = toAmount(booking.cancellation_refund_amount);
    if (booking.status !== "cancelled" || amount <= 0) return null;

    const percent = toAmount(booking.cancellation_refund_percent);
    const status = booking.cancellation_refund_status ?? "";
    const statusLabel = CANCELLATION_REFUND_STATUS_LABELS[status];
    const tone =
        status === "completed"
            ? "border-success/30 bg-success/5 text-success"
            : status === "failed"
              ? "border-warning/30 bg-warning/5 text-warning"
              : "border-primary/30 bg-primary/5 text-primary";

    return (
        <div
            className={`rounded-2xl border p-4 flex items-start gap-3 ${tone} ${className}`}
        >
            <Icon
                icon="material-symbols:currency-exchange"
                width={22}
                className="shrink-0 mt-0.5"
            />
            <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm">
                    Reembolso de {formatCurrency(amount)} ({percent} %)
                </p>
                {statusLabel ? (
                    <p className="text-xs text-default-600 mt-0.5">{statusLabel}</p>
                ) : null}
            </div>
        </div>
    );
}
