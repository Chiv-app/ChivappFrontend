"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { formatCurrency } from "@/lib/booking-labels";
import {
    getContractorRecommendation,
} from "@/lib/bookings";
import {
    listBookingMemberInvites,
    listBookingMemberPayouts,
    markBookingMemberPayoutPaid,
    upsertBookingMemberPayouts,
} from "@/lib/ensemble-members";
import type {
    BookingMemberInviteOut,
    BookingMemberPayoutOut,
    BookingOut,
} from "@/types/api";

type Props = {
    booking: BookingOut;
};

const EVENT_STATUSES = new Set([
    "in_progress",
    "payment_released",
    "completed",
]);

export default function BookingMemberPayoutPanel({ booking }: Props) {
    const [invites, setInvites] = useState<BookingMemberInviteOut[]>([]);
    const [payouts, setPayouts] = useState<BookingMemberPayoutOut[]>([]);
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [hasReview, setHasReview] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const eventReady = EVENT_STATUSES.has(booking.status);
    const canPay = eventReady && hasReview;
    const accepted = invites.filter((i) => i.status === "accepted");

    const refresh = useCallback(async () => {
        const [inviteRows, payoutRows, recommendation] = await Promise.all([
            listBookingMemberInvites(booking.id),
            listBookingMemberPayouts(booking.id).catch(() => []),
            getContractorRecommendation(booking.id).catch(() => null),
        ]);
        setInvites(inviteRows);
        setPayouts(payoutRows);
        setHasReview(recommendation != null);

        const next: Record<string, string> = {};
        for (const payout of payoutRows) {
            next[payout.ensemble_member_id] = String(payout.amount);
        }
        for (const invite of inviteRows) {
            if (
                invite.status === "accepted" &&
                next[invite.ensemble_member_id] == null
            ) {
                next[invite.ensemble_member_id] = "";
            }
        }
        setAmounts(next);
    }, [booking.id]);

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
        });
        refresh()
            .catch((error) => {
                if (cancelled) return;
                addToast({
                    title: "No se pudo cargar el reparto",
                    description:
                        error instanceof Error ? error.message : "Intenta de nuevo.",
                    color: "danger",
                });
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [refresh]);

    function splitEqual() {
        if (accepted.length === 0) return;
        const total = Number(booking.price_agreed || 0);
        if (!total) {
            addToast({
                title: "Sin monto de referencia",
                description: "La reserva no tiene precio acordado.",
                color: "warning",
            });
            return;
        }
        const each = Math.floor((total / accepted.length) * 100) / 100;
        const next: Record<string, string> = {};
        for (const invite of accepted) {
            next[invite.ensemble_member_id] = String(each);
        }
        setAmounts((prev) => ({ ...prev, ...next }));
    }

    async function savePayouts(lock: boolean) {
        const items = accepted.map((invite) => ({
            ensemble_member_id: invite.ensemble_member_id,
            amount: Number(amounts[invite.ensemble_member_id] || 0),
        }));
        const priceCap = Number(booking.price_agreed || 0);
        const total = items.reduce((sum, item) => sum + item.amount, 0);
        if (priceCap > 0 && total > priceCap + 0.001) {
            addToast({
                title: "Excede el precio del evento",
                description: `El reparto (S/ ${total.toFixed(2)}) no puede superar ${formatCurrency(priceCap)}.`,
                color: "warning",
            });
            return;
        }
        setIsSaving(true);
        try {
            const updated = await upsertBookingMemberPayouts(
                booking.id,
                items,
                lock,
            );
            setPayouts(updated);
            addToast({
                title: lock ? "Reparto confirmado" : "Borrador guardado",
                color: "success",
            });
        } catch (error) {
            addToast({
                title: "No se pudo guardar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    }

    async function markPaid(payoutId: string) {
        try {
            const updated = await markBookingMemberPayoutPaid(
                booking.id,
                payoutId,
            );
            setPayouts((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p)),
            );
            addToast({ title: "Marcado como pagado", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo marcar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        }
    }

    if (isLoading) {
        return <div className="h-32 rounded-4xl bg-default-100 animate-pulse" />;
    }

    if (accepted.length === 0) {
        return null;
    }

    if (!eventReady) {
        return (
            <div className="border border-default-200/70 shadow-soft rounded-2xl bg-content1 p-6 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:payments" width={22} />
                    <h3 className="text-lg font-bold">Pago a integrantes</h3>
                </div>
                <p className="text-sm text-default-500">
                    Se habilita al finalizar el show y después de dejar tu reseña al
                    contratista. Si cierras sin pagar, la reserva seguirá en{" "}
                    <Link href="/musician/payouts" className="text-primary underline">
                        Pagos
                    </Link>
                    .
                </p>
            </div>
        );
    }

    if (!hasReview) {
        return (
            <div className="border border-warning/30 shadow-soft rounded-2xl bg-warning/5 p-6 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:rate-review" width={22} />
                    <h3 className="text-lg font-bold">Pago a integrantes</h3>
                </div>
                <p className="text-sm text-default-600">
                    Deja primero tu reseña al contratista para poder repartir y pagar
                    a tus músicos con el monto del show (
                    {formatCurrency(Number(booking.price_agreed || 0))}).
                </p>
            </div>
        );
    }

    return (
        <div className="border border-success/30 shadow-soft rounded-2xl bg-content1 p-6 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <Icon icon="material-symbols:payments" width={22} />
                            <h3 className="text-lg font-bold">Pago a integrantes</h3>
                        </div>
                        <p className="text-sm text-default-500 mt-1">
                            Tope del evento:{" "}
                            {formatCurrency(Number(booking.price_agreed || 0))}.
                            El reparto total no puede superar ese monto.
                        </p>
                    </div>
                    <Button
                        as={Link}
                        href="/musician/payouts"
                        size="sm"
                        variant="flat"
                        radius="lg"
                    >
                        Abrir Pagos
                    </Button>
                </div>

                {canPay ? (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                                Reparto ·{" "}
                                <span className="text-default-500 font-normal">
                                    {formatCurrency(
                                        accepted.reduce(
                                            (sum, invite) =>
                                                sum +
                                                Number(
                                                    amounts[
                                                        invite.ensemble_member_id
                                                    ] || 0,
                                                ),
                                            0,
                                        ),
                                    )}{" "}
                                    /{" "}
                                    {formatCurrency(
                                        Number(booking.price_agreed || 0),
                                    )}
                                </span>
                            </p>
                            <Button
                                size="sm"
                                variant="flat"
                                radius="lg"
                                onPress={splitEqual}
                            >
                                Dividir en partes iguales
                            </Button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {accepted.map((invite) => {
                                const payout = payouts.find(
                                    (p) =>
                                        p.ensemble_member_id ===
                                        invite.ensemble_member_id,
                                );
                                return (
                                    <div
                                        key={invite.ensemble_member_id}
                                        className="flex flex-col sm:flex-row sm:items-end gap-2"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {invite.member_fullname}
                                            </p>
                                            {payout ? (
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    className="mt-1"
                                                    color={
                                                        payout.status === "paid"
                                                            ? "success"
                                                            : payout.status === "locked"
                                                              ? "secondary"
                                                              : "default"
                                                    }
                                                >
                                                    {payout.status === "paid"
                                                        ? "Pagado"
                                                        : payout.status === "locked"
                                                          ? "Confirmado"
                                                          : "Borrador"}
                                                </Chip>
                                            ) : null}
                                        </div>
                                        <Input
                                            type="number"
                                            label="Monto"
                                            variant="bordered"
                                            radius="lg"
                                            className="sm:w-40"
                                            value={
                                                amounts[invite.ensemble_member_id] ?? ""
                                            }
                                            onValueChange={(value) =>
                                                setAmounts((prev) => ({
                                                    ...prev,
                                                    [invite.ensemble_member_id]: value,
                                                }))
                                            }
                                            isDisabled={payout?.status === "paid"}
                                            startContent={
                                                <span className="text-default-400 text-sm">
                                                    S/
                                                </span>
                                            }
                                        />
                                        {payout && payout.status === "locked" ? (
                                            <Button
                                                size="sm"
                                                color="success"
                                                variant="flat"
                                                radius="lg"
                                                onPress={() => markPaid(payout.id)}
                                            >
                                                Marcar pagado
                                            </Button>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="flat"
                                radius="lg"
                                isLoading={isSaving}
                                onPress={() => savePayouts(false)}
                            >
                                Guardar borrador
                            </Button>
                            <Button
                                color="primary"
                                radius="lg"
                                isLoading={isSaving}
                                onPress={() => savePayouts(true)}
                            >
                                Confirmar y habilitar pago
                            </Button>
                        </div>
                    </>
                ) : null}
        </div>
    );
}
