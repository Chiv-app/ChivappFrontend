"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Tab,
    Tabs,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
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
    payment_advance: "material-symbols:payments",
    payment_balance: "material-symbols:payments",
    payment_out: "material-symbols:payments",
    balance_due: "material-symbols:account-balance-wallet",
    balance_review: "material-symbols:hourglass-top",
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
    const [tab, setTab] = useState<ViewTab>("action");

    useEffect(() => {
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (!cancelled) setIsLoading(true);
        });

        getContractorOperations()
            .then((data) => {
                if (!cancelled) setSummary(normalizeSummary(data));
            })
            .catch((error) => {
                if (cancelled) return;
                addToast({
                    title: "No se pudieron cargar las operaciones",
                    description:
                        error instanceof Error
                            ? error.message
                            : "Intenta de nuevo más tarde.",
                    color: "danger",
                });
                setSummary(emptySummary());
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredItems = useMemo(
        () => summary.items.filter((item) => matchesTab(item, tab)),
        [summary.items, tab],
    );

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <div className="h-32 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-48 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    const moneyCards = [
        {
            label: "Pagado (bruto)",
            value: summary.total_out,
            hint:
                (summary.total_fees ?? 0) > 0
                    ? `Servicio ${formatCurrency(summary.total_service ?? 0)} · comisión ${formatCurrency(summary.total_fees ?? 0)}`
                    : "Transferencias a la plataforma",
            icon: "material-symbols:arrow-outward",
            tone: "text-danger",
            bg: "bg-danger/10",
        },
        {
            label: "Devuelto",
            value: summary.total_in,
            hint:
                (summary.total_refund_pending ?? 0) > 0
                    ? `Pendiente ${formatCurrency(summary.total_refund_pending ?? 0)}`
                    : "Devoluciones ya validadas",
            icon: "material-symbols:undo",
            tone: "text-success",
            bg: "bg-success/10",
        },
        {
            label: "Neto",
            value: summary.net_out,
            hint: "Pagado bruto − devuelto validado",
            icon: "material-symbols:account-balance",
            tone: "text-primary",
            bg: "bg-primary/10",
        },
        {
            label: "Retenido",
            value: summary.total_retained,
            hint: "En garantía (bruto)",
            icon: "material-symbols:lock",
            tone: "text-secondary",
            bg: "bg-secondary/10",
        },
    ];

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div className="rounded-4xl border border-default-200/70 bg-gradient-to-br from-primary/15 via-content1 to-content1 px-4 py-5 sm:px-6 sm:py-6 shadow-soft overflow-hidden relative">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                        <Chip color="primary" variant="flat" size="sm" className="mb-3">
                            Actuar · Enterarte · Dinero
                        </Chip>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                            Operaciones
                        </h1>
                        <p className="text-default-600 mt-2 max-w-2xl text-sm sm:text-base">
                            Todo lo que debes hacer o saber de tus reservas: cotizaciones,
                            pagos, disputas y reembolsos, con acceso directo a cada evento.
                        </p>
                    </div>
                    <Button
                        as={Link}
                        href="/contractor/bookings"
                        variant="flat"
                        radius="lg"
                        className="font-semibold w-full sm:w-auto"
                        startContent={
                            <Icon icon="material-symbols:event-available" width={18} />
                        }
                    >
                        Ir a reservas
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <Card className="border border-warning/30 bg-warning/5 shadow-soft">
                    <CardBody className="p-4 gap-1">
                        <p className="text-sm text-default-500">Tu turno</p>
                        <p className="text-2xl font-bold text-foreground">
                            {summary.pending_me_count}
                        </p>
                    </CardBody>
                </Card>
                <Card className="border border-secondary/30 bg-secondary/5 shadow-soft">
                    <CardBody className="p-4 gap-1">
                        <p className="text-sm text-default-500">En espera</p>
                        <p className="text-2xl font-bold text-foreground">
                            {summary.pending_other_count}
                        </p>
                    </CardBody>
                </Card>
                <Card className="border border-danger/20 bg-danger/5 shadow-soft">
                    <CardBody className="p-4 gap-1">
                        <p className="text-sm text-default-500">Disputas / reembolsos</p>
                        <p className="text-2xl font-bold text-foreground">
                            {summary.dispute_count}
                        </p>
                    </CardBody>
                </Card>
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="p-4 gap-1">
                        <p className="text-sm text-default-500">En revisión (pagos)</p>
                        <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(summary.total_pending)}
                        </p>
                    </CardBody>
                </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {moneyCards.map((card) => (
                    <Card key={card.label} className="border border-default-200/70 shadow-soft">
                        <CardBody className="gap-3 p-5">
                            <div
                                className={`flex size-10 items-center justify-center rounded-2xl ${card.bg} ${card.tone}`}
                            >
                                <Icon icon={card.icon} width={20} />
                            </div>
                            <div>
                                <p className="text-sm text-default-500">{card.label}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {formatCurrency(card.value)}
                                </p>
                                <p className="text-xs text-default-400 mt-1">{card.hint}</p>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Actividad</h2>
                        <p className="text-sm text-default-500 mt-1">
                            Cada ítem abre la reserva correspondiente.
                        </p>
                    </div>
                    <Tabs
                        selectedKey={tab}
                        onSelectionChange={(key) => setTab(key as ViewTab)}
                        size="sm"
                        variant="solid"
                        color="primary"
                        classNames={{
                            base: "w-full sm:w-auto overflow-x-auto",
                            tabList: "gap-1",
                        }}
                    >
                        <Tab
                            key="action"
                            title={`Pendientes (${summary.pending_me_count + summary.pending_other_count})`}
                        />
                        <Tab key="money" title="Dinero" />
                        <Tab
                            key="disputes"
                            title={`Disputas (${summary.dispute_count})`}
                        />
                        <Tab key="all" title="Todas" />
                    </Tabs>
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
            ? "bg-warning/15 text-warning"
            : item.kind === "dispute"
              ? "bg-danger/10 text-danger"
              : item.direction === "in"
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary";

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

