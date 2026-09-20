"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Tab,
    Tabs,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    BOOKING_STATUS_LABELS,
    formatBookingDate,
    formatCurrency,
} from "@/lib/booking-labels";
import {
    listMemberSettlements,
    markBookingMemberPayoutPaid,
    upsertBookingMemberPayouts,
} from "@/lib/ensemble-members";
import { useAuth } from "@/contexts/auth-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import type {
    BookingStatus,
    MemberSettlementBookingOut,
} from "@/types/api";

type FilterKey = "pending" | "ready" | "paid" | "all";

export default function MusicianPayoutsView() {
    const { user } = useAuth();
    const { isVerified: profileIsVerified, isLoading: isVerificationLoading } = useProfileVerification("musician", true, user?.is_verified);

    const [rows, setRows] = useState<MemberSettlementBookingOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>("pending");
    const [amounts, setAmounts] = useState<Record<string, Record<string, string>>>(
        {},
    );
    const [savingId, setSavingId] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const data = await listMemberSettlements();
        setRows(data);
        setIsLoading(false);
        const next: Record<string, Record<string, string>> = {};
        for (const row of data) {
            next[row.booking_id] = {};
            for (const member of row.members) {
                next[row.booking_id][member.ensemble_member_id] = String(
                    member.amount ?? "",
                );
            }
        }
        setAmounts(next);
    }, []);

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
        });
        refresh()
            .catch((error) => {
                if (cancelled) return;
                addToast({
                    title: "No se pudieron cargar los pagos",
                    description:
                        error instanceof Error
                            ? error.message
                            : "Intenta de nuevo más tarde.",
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

    const filtered = useMemo(() => {
        return rows.filter((row) => {
            const pending = Number(row.total_pending) > 0;
            const allPaid =
                row.members.length > 0 &&
                row.members.every((m) => m.payout_status === "paid");
            if (filter === "pending") return pending || !allPaid;
            if (filter === "ready") return row.can_pay && pending;
            if (filter === "paid") return allPaid;
            return true;
        });
    }, [rows, filter]);

    if (!isVerificationLoading && !profileIsVerified) {
        return (
            <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
                <div className="flex flex-col items-start gap-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Pagos a integrantes
                    </h1>
                    <p className="text-sm text-default-500">
                        Gestiona los cobros de tus eventos finalizados
                    </p>
                </div>
                <Card className="border border-warning-200 bg-warning-50/50 shadow-soft">
                    <CardBody className="gap-3 p-10 text-center items-center justify-center">
                        <div className="w-16 h-16 bg-warning-100 text-warning-600 rounded-full flex items-center justify-center mb-2">
                            <Icon icon="material-symbols:payments-outline-rounded" width={36} />
                        </div>
                        <h3 className="text-xl font-bold">Verificación requerida</h3>
                        <p className="text-base text-default-600 max-w-lg">
                            Para poder gestionar y recibir cobros de la plataforma, necesitas completar tu perfil de músico al 100% y ser validado por nuestro equipo.
                        </p>
                        <Button
                            as="a"
                            href="/musician/profile"
                            color="warning"
                            variant="flat"
                            size="lg"
                            className="mt-4 font-semibold"
                        >
                            Completar mi perfil
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    const stats = useMemo(() => {
        let pendingAmount = 0;
        let readyCount = 0;
        let paidAmount = 0;
        for (const row of rows) {
            pendingAmount += Number(row.total_pending || 0);
            paidAmount += Number(row.total_paid || 0);
            if (row.can_pay && Number(row.total_pending) > 0) readyCount += 1;
        }
        return { pendingAmount, readyCount, paidAmount, total: rows.length };
    }, [rows]);

    async function saveRow(row: MemberSettlementBookingOut, lock: boolean) {
        const items = row.members.map((member) => ({
            ensemble_member_id: member.ensemble_member_id,
            amount: Number(
                amounts[row.booking_id]?.[member.ensemble_member_id] || 0,
            ),
        }));
        const priceCap = Number(row.price_agreed || 0);
        const total = items.reduce((sum, item) => sum + item.amount, 0);
        if (priceCap > 0 && total > priceCap + 0.001) {
            addToast({
                title: "Excede el precio del evento",
                description: `El reparto (S/ ${total.toFixed(2)}) no puede superar ${formatCurrency(priceCap)}.`,
                color: "warning",
            });
            return;
        }
        setSavingId(row.booking_id);
        try {
            await upsertBookingMemberPayouts(row.booking_id, items, lock);
            await refresh();
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
            setSavingId(null);
        }
    }

    async function markPaid(bookingId: string, payoutId: string) {
        setSavingId(bookingId);
        try {
            await markBookingMemberPayoutPaid(bookingId, payoutId);
            await refresh();
            addToast({ title: "Marcado como pagado", color: "success" });
        } catch (error) {
            addToast({
                title: "No se pudo marcar",
                description:
                    error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setSavingId(null);
        }
    }

    function splitEqual(row: MemberSettlementBookingOut) {
        const total = Number(row.price_agreed || 0);
        if (!total || row.members.length === 0) return;
        const each = Math.floor((total / row.members.length) * 100) / 100;
        setAmounts((prev) => {
            const bookingAmounts: Record<string, string> = {
                ...(prev[row.booking_id] ?? {}),
            };
            for (const member of row.members) {
                if (member.payout_status === "paid") continue;
                bookingAmounts[member.ensemble_member_id] = String(each);
            }
            return { ...prev, [row.booking_id]: bookingAmounts };
        });
    }

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <div className="h-28 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-64 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div className="rounded-4xl border border-default-200/70 bg-gradient-to-br from-secondary/15 via-content1 to-content1 px-4 py-5 sm:px-6 sm:py-6 shadow-soft">
                <Chip color="secondary" variant="flat" size="sm" className="mb-3">
                    Pagos a tu agrupación
                </Chip>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Pagos
                </h1>
                <p className="text-default-600 mt-2 max-w-2xl text-sm sm:text-base">
                    Aquí figuran las reservas con integrantes asociados, a quién debes
                    pagar y el estado de cada reparto. Puedes cerrar el show sin pagar; el
                    pendiente se queda en este módulo.
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {[
                    {
                        label: "Reservas",
                        value: stats.total,
                        icon: "material-symbols:event",
                    },
                    {
                        label: "Listas para pagar",
                        value: stats.readyCount,
                        icon: "material-symbols:check-circle",
                    },
                    {
                        label: "Pendiente",
                        value: formatCurrency(stats.pendingAmount),
                        icon: "material-symbols:hourglass-top",
                        isText: true,
                    },
                    {
                        label: "Pagado",
                        value: formatCurrency(stats.paidAmount),
                        icon: "material-symbols:payments",
                        isText: true,
                    },
                ].map((item) => (
                    <Card key={item.label} className="border border-default-200/70 shadow-soft">
                        <CardBody className="gap-2 p-3 sm:p-4">
                            <Icon
                                icon={item.icon}
                                width={20}
                                className="text-secondary"
                            />
                            <p className="text-[11px] sm:text-xs text-default-500">
                                {item.label}
                            </p>
                            <p
                                className={`font-bold ${
                                    item.isText ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
                                }`}
                            >
                                {item.value}
                            </p>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <Tabs
                selectedKey={filter}
                onSelectionChange={(key) => setFilter(key as FilterKey)}
                variant="underlined"
                color="secondary"
            >
                <Tab key="pending" title="Pendientes" />
                <Tab key="ready" title="Listas para pagar" />
                <Tab key="paid" title="Pagadas" />
                <Tab key="all" title="Todas" />
            </Tabs>

            {filtered.length === 0 ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="gap-3 p-10 text-center">
                        <Icon
                            icon="material-symbols:payments"
                            width={36}
                            className="mx-auto text-default-400"
                        />
                        <p className="font-semibold">No hay pagos en esta vista</p>
                        <p className="text-sm text-default-500">
                            Cuando asocies integrantes a una reserva y avances el show,
                            aparecerán aquí.
                        </p>
                    </CardBody>
                </Card>
            ) : (
                <div className="flex flex-col gap-4">
                    {filtered.map((row) => {
                        const statusLabel =
                            BOOKING_STATUS_LABELS[row.status as BookingStatus] ??
                            row.status;
                        const isSaving = savingId === row.booking_id;
                        return (
                            <Card
                                key={row.booking_id}
                                className="border border-default-200/70 shadow-soft"
                            >
                                <CardBody className="gap-4 p-5 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-lg font-bold truncate">
                                                    {row.event_type}
                                                </h2>
                                                <Chip size="sm" variant="flat">
                                                    {statusLabel}
                                                </Chip>
                                                {row.can_pay ? (
                                                    <Chip size="sm" color="success" variant="flat">
                                                        Puedes pagar
                                                    </Chip>
                                                ) : !row.has_contractor_review ? (
                                                    <Chip size="sm" color="warning" variant="flat">
                                                        Falta reseña al contratista
                                                    </Chip>
                                                ) : (
                                                    <Chip size="sm" variant="flat">
                                                        Aún no habilitado
                                                    </Chip>
                                                )}
                                            </div>
                                            <p className="text-sm text-default-500 mt-1">
                                                {formatBookingDate(row.event_date)}
                                                {row.location_city
                                                    ? ` · ${row.location_city}`
                                                    : ""}
                                                {" · "}
                                                Referencia / tope{" "}
                                                {formatCurrency(
                                                    Number(row.price_agreed || 0),
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            as={Link}
                                            href={`/musician/bookings/${row.booking_id}`}
                                            size="sm"
                                            variant="flat"
                                            radius="lg"
                                        >
                                            Ver reserva
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-sm">
                                        <span>
                                            Asignado:{" "}
                                            <strong>
                                                {formatCurrency(
                                                    Number(row.total_assigned || 0),
                                                )}
                                            </strong>
                                        </span>
                                        <span>
                                            Pendiente:{" "}
                                            <strong>
                                                {formatCurrency(
                                                    Number(row.total_pending || 0),
                                                )}
                                            </strong>
                                        </span>
                                        <span>
                                            Pagado:{" "}
                                            <strong>
                                                {formatCurrency(
                                                    Number(row.total_paid || 0),
                                                )}
                                            </strong>
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-medium">
                                                A quién pagar
                                            </p>
                                            {row.can_pay ? (
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    radius="lg"
                                                    onPress={() => splitEqual(row)}
                                                >
                                                    Dividir monto total
                                                </Button>
                                            ) : null}
                                        </div>
                                        {row.members.map((member) => (
                                            <div
                                                key={member.ensemble_member_id}
                                                className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-2xl border border-default-200 px-3 py-3"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">
                                                        {member.member_fullname}
                                                    </p>
                                                    <p className="text-xs text-default-500">
                                                        {member.member_email}
                                                    </p>
                                                    <Chip
                                                        size="sm"
                                                        variant="flat"
                                                        className="mt-1"
                                                        color={
                                                            member.payout_status === "paid"
                                                                ? "success"
                                                                : member.payout_status ===
                                                                    "locked"
                                                                  ? "secondary"
                                                                  : "default"
                                                        }
                                                    >
                                                        {member.payout_status === "paid"
                                                            ? "Pagado"
                                                            : member.payout_status ===
                                                                "locked"
                                                              ? "Confirmado"
                                                              : member.payout_status
                                                                ? "Borrador"
                                                                : "Sin monto"}
                                                    </Chip>
                                                </div>
                                                <Input
                                                    type="number"
                                                    label="Monto"
                                                    variant="bordered"
                                                    radius="lg"
                                                    className="sm:w-40"
                                                    isDisabled={
                                                        !row.can_pay ||
                                                        member.payout_status === "paid"
                                                    }
                                                    value={
                                                        amounts[row.booking_id]?.[
                                                            member.ensemble_member_id
                                                        ] ?? ""
                                                    }
                                                    onValueChange={(value) =>
                                                        setAmounts((prev) => ({
                                                            ...prev,
                                                            [row.booking_id]: {
                                                                ...(prev[row.booking_id] ??
                                                                    {}),
                                                                [member.ensemble_member_id]:
                                                                    value,
                                                            },
                                                        }))
                                                    }
                                                    startContent={
                                                        <span className="text-default-400 text-sm">
                                                            S/
                                                        </span>
                                                    }
                                                />
                                                {row.can_pay &&
                                                member.payout_id &&
                                                member.payout_status === "locked" ? (
                                                    <Button
                                                        size="sm"
                                                        color="success"
                                                        variant="flat"
                                                        radius="lg"
                                                        isLoading={isSaving}
                                                        onPress={() =>
                                                            markPaid(
                                                                row.booking_id,
                                                                member.payout_id!,
                                                            )
                                                        }
                                                    >
                                                        Marcar pagado
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>

                                    {row.can_pay ? (
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="flat"
                                                radius="lg"
                                                isLoading={isSaving}
                                                onPress={() => saveRow(row, false)}
                                            >
                                                Guardar borrador
                                            </Button>
                                            <Button
                                                color="secondary"
                                                radius="lg"
                                                isLoading={isSaving}
                                                onPress={() => saveRow(row, true)}
                                            >
                                                Confirmar reparto
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-default-500">
                                            {row.has_contractor_review
                                                ? "Cuando el show entre en fase de evento o cierre, podrás pagar aquí."
                                                : "Deja tu reseña al contratista en el detalle de la reserva para habilitar el pago."}
                                        </p>
                                    )}
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
