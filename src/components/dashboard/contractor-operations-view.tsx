"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    Chip,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    DashboardKpiStrip,
    DashboardModuleHeader,
    DashboardPillTabs,
} from "@/components/dashboard/dashboard-module-header";
import {
    BOOKING_STATUS_LABELS,
    PAYMENT_STATUS_LABELS,
    formatBookingDate,
    formatCurrency,
} from "@/lib/booking-labels";
import { getContractorOperations } from "@/lib/payments";
import type {
    BookingStatus,
    ContractorOperationItem,
    ContractorOperationsSummary,
    PaymentStatus,
} from "@/types/api";

type ViewTab = "action" | "money" | "disputes" | "all";

const STATUS_LABELS: Record<string, string> = {
    pending_me: "Tu turno",
    pending_other: "En espera",
    done: "Listo",
    settled: "Liquidado",
    rejected: "Rechazado",
    cancelled: "Cancelado",
};

const STATUS_COLORS: Record<
    string,
    "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
    pending_me: "warning",
    pending_other: "secondary",
    done: "success",
    settled: "success",
    rejected: "danger",
    cancelled: "default",
};

const KIND_ICONS: Record<string, string> = {
    awaiting_quote: "material-symbols:hourglass-top",
    quote_review: "material-symbols:request-quote",
    contract_sign: "material-symbols:contract-edit",
    payment_review: "material-symbols:hourglass-top",
    payment_full: "material-symbols:payments",
    payment_out: "material-symbols:payments",
    change_pending: "material-symbols:edit-location",
    event_active: "material-symbols:celebration",
    finalize: "material-symbols:check-circle",
    dispute: "material-symbols:gavel",
    refund: "material-symbols:undo",
};

function emptySummary(): ContractorOperationsSummary {
    return {
        currency: "PEN",
        total_out: 0,
        total_in: 0,
        net_out: 0,
        total_quoted: 0,
        total_released: 0,
        total_retained: 0,
        total_pending: 0,
        pending_me_count: 0,
        pending_other_count: 0,
        dispute_count: 0,
        bookings_active: 0,
        bookings_completed: 0,
        bookings_cancelled: 0,
        items: [],
    };
}

function normalizeSummary(
    data: ContractorOperationsSummary,
): ContractorOperationsSummary {
    return {
        ...emptySummary(),
        ...data,
        items: Array.isArray(data.items) ? data.items : [],
        pending_me_count: data.pending_me_count ?? 0,
        pending_other_count: data.pending_other_count ?? 0,
        dispute_count: data.dispute_count ?? 0,
        total_out: data.total_out ?? 0,
        total_in: data.total_in ?? 0,
        net_out: data.net_out ?? 0,
        total_quoted: data.total_quoted ?? 0,
        total_released: data.total_released ?? 0,
        total_retained: data.total_retained ?? 0,
        total_pending: data.total_pending ?? 0,
    };
}

function matchesTab(item: ContractorOperationItem, tab: ViewTab): boolean {
    if (tab === "all") return true;
    if (tab === "action") {
        // Attention ops only (lifecycle + disputes); money rows live in Dinero.
        if (item.source === "payment") return false;
        return item.status === "pending_me" || item.status === "pending_other";
    }
    if (tab === "money") return item.direction === "out" || item.direction === "in";
    if (tab === "disputes") return item.kind === "dispute" || item.kind === "refund";
    return true;
}

function formatSignedAmount(
    amount: number | null | undefined,
    direction: string,
): string | null {
    if (amount == null) return null;
    const formatted = formatCurrency(amount);
    if (direction === "in") return `+ ${formatted}`;
    if (direction === "out") return `− ${formatted}`;
    return formatted;
}

export default function ContractorOperationsView() {
    const [summary, setSummary] = useState<ContractorOperationsSummary>(emptySummary());
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [tab, setTab] = useState<ViewTab>("action");

    const load = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await getContractorOperations();
            setSummary(normalizeSummary(data));
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Intenta de nuevo más tarde.";
            setLoadError(message);
            addToast({
                title: "No se pudieron cargar las operaciones",
                description: message,
                color: "danger",
            });
            setSummary(emptySummary());
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => load());
    }, [load]);

    const filteredItems = useMemo(
        () => summary.items.filter((item) => matchesTab(item, tab)),
        [summary.items, tab],
    );

    if (isLoading) {
        return (
            <div className="w-full flex flex-col gap-4">
                <div className="h-32 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-48 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4">
            <DashboardModuleHeader
                title="Operaciones"
                subtitle="Todo lo que debes hacer o saber de tus reservas: cotizaciones, pagos, disputas y reembolsos, con acceso directo a cada evento."
                actions={
                    <Button
                        as={Link}
                        href="/contractor/bookings"
                        variant="flat"
                        radius="full"
                        className="font-semibold"
                        startContent={
                            <Icon
                                icon="material-symbols:event-available"
                                width={18}
                            />
                        }
                    >
                        Ir a reservas
                    </Button>
                }
            />

            {loadError ? (
                <Card className="border border-danger/30 bg-danger/5 shadow-soft">
                    <CardBody className="gap-3 p-8 text-center">
                        <Icon
                            icon="material-symbols:error-outline"
                            width={36}
                            className="mx-auto text-danger"
                        />
                        <p className="font-semibold text-danger">
                            No se pudieron cargar las operaciones
                        </p>
                        <p className="text-sm text-default-600">{loadError}</p>
                        <div>
                            <Button
                                color="danger"
                                variant="flat"
                                radius="lg"
                                onPress={() => void load()}
                            >
                                Reintentar
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            ) : (
                <>
                    <DashboardKpiStrip
                        items={[
                            {
                                key: "action",
                                label: "Tu turno",
                                value: summary.pending_me_count,
                                dotClass: "bg-warning",
                                isSelected: tab === "action",
                                activeClass:
                                    "bg-warning/15 border-warning/40 text-foreground",
                                onClick: () =>
                                    setTab((prev) =>
                                        prev === "action" ? "all" : "action",
                                    ),
                            },
                            {
                                key: "waiting",
                                label: "En espera",
                                value: summary.pending_other_count,
                                dotClass: "bg-primary",
                            },
                            {
                                key: "disputes",
                                label: "Disputas / reembolsos",
                                value: summary.dispute_count,
                                dotClass: "bg-danger",
                                isSelected: tab === "disputes",
                                activeClass:
                                    "bg-danger/15 border-danger/40 text-foreground",
                                onClick: () =>
                                    setTab((prev) =>
                                        prev === "disputes" ? "all" : "disputes",
                                    ),
                            },
                            {
                                key: "retained",
                                label: "Protegido",
                                value: formatCurrency(summary.total_retained),
                                dotClass: "bg-success",
                            },
                        ]}
                        summaryLabel="Neto pagado:"
                        summaryValue={formatCurrency(summary.net_out)}
                        summarySelected={tab === "money"}
                        onSummaryClick={() =>
                            setTab((prev) => (prev === "money" ? "all" : "money"))
                        }
                    />

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    Actividad
                                </h2>
                                <p className="text-xs sm:text-sm text-default-500 mt-0.5">
                                    Cada ítem abre la reserva correspondiente.
                                </p>
                            </div>
                            <DashboardPillTabs
                                ariaLabel="Filtrar operaciones por categoría"
                                selectedKey={tab}
                                onSelect={setTab}
                                items={[
                                    {
                                        key: "action",
                                        label: "Pendientes",
                                        count:
                                            summary.pending_me_count +
                                            summary.pending_other_count,
                                    },
                                    { key: "money", label: "Dinero" },
                                    {
                                        key: "disputes",
                                        label: "Disputas",
                                        count: summary.dispute_count,
                                    },
                                    { key: "all", label: "Todas" },
                                ]}
                            />
                        </div>

                        {filteredItems.length === 0 ? (
                            <Card className="border border-default-200/70 shadow-soft">
                                <CardBody className="gap-3 p-10 text-center">
                                    <Icon
                                        icon="material-symbols:task-alt"
                                        width={36}
                                        className="mx-auto text-default-400"
                                    />
                                    <p className="font-semibold text-foreground">
                                        No hay operaciones en esta vista
                                    </p>
                                    <p className="text-sm text-default-500">
                                        Cuando tengas cotizaciones, pagos o disputas aparecerán aquí.
                                    </p>
                                </CardBody>
                            </Card>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {filteredItems.map((item) => (
                                    <OperationRow key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function OperationRow({ item }: { item: ContractorOperationItem }) {
    const bookingStatus = item.booking_status as BookingStatus;
    const icon = KIND_ICONS[item.kind] || "material-symbols:receipt-long";
    const signed = formatSignedAmount(item.amount, item.direction);
    const amountClass =
        item.direction === "in"
            ? "text-success"
            : item.direction === "out"
              ? "text-foreground"
              : "text-foreground";

    const iconTone =
        item.status === "pending_me"
            ? "bg-warning/15 text-warning-text"
            : item.kind === "dispute"
              ? "bg-danger/10 text-danger-text"
              : item.direction === "in"
                ? "bg-success/10 text-success-text"
                : "bg-primary/10 text-primary-text";

    return (
        <Card className="border border-default-200/70 shadow-soft">
            <CardBody className="p-0">
                <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                    <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}
                    >
                        <Icon icon={icon} width={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{item.title}</h3>
                            <Chip
                                size="sm"
                                variant="flat"
                                color={STATUS_COLORS[item.status] || "default"}
                            >
                                {STATUS_LABELS[item.status] || item.status}
                            </Chip>
                            {item.payment_status ? (
                                <Chip size="sm" variant="flat">
                                    {paymentStatusLabel(item.payment_status)}
                                </Chip>
                            ) : null}
                        </div>
                        {item.subtitle ? (
                            <p className="text-sm text-default-600 mt-1">{item.subtitle}</p>
                        ) : null}
                        <p className="text-sm text-default-500 mt-1">
                            {item.event_type}
                            {item.musician_stage_name
                                ? ` · ${item.musician_stage_name}`
                                : ""}
                            {item.event_date
                                ? ` · ${formatBookingDate(item.event_date)}`
                                : ""}
                            {item.location_city ? ` · ${item.location_city}` : ""}
                            {" · "}
                            {BOOKING_STATUS_LABELS[bookingStatus] ??
                                item.booking_status}
                        </p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        {signed ? (
                            <p className={`text-xl font-bold ${amountClass}`}>{signed}</p>
                        ) : null}
                        <Button
                            as={Link}
                            href={`/contractor/bookings/${item.booking_id}`}
                            size="sm"
                            color={item.status === "pending_me" ? "primary" : "default"}
                            variant={item.status === "pending_me" ? "solid" : "flat"}
                            radius="lg"
                        >
                            {item.cta_label}
                        </Button>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

function paymentStatusLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABELS[status] || status;
}
