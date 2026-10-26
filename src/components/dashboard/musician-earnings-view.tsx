"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Tab,
    Tabs,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { useProfileVerification } from "@/hooks/use-profile-verification";
import {
    BOOKING_STATUS_LABELS,
    PAYMENT_STATUS_LABELS,
    PAYMENT_TYPE_LABELS,
    formatBookingDate,
    formatCurrency,
} from "@/lib/booking-labels";
import { formatDateTime } from "@/lib/date-utils";
import { listMyMemberIncome } from "@/lib/ensemble-members";
import { getMusicianEarnings, requestPayout } from "@/lib/payments";
import type {
    BookingStatus,
    MusicianDebtItem,
    MusicianEarningsItem,
    MusicianEarningsSummary,
    MyMemberIncomeItem,
    MyMemberIncomeSummary,
} from "@/types/api";

type DebtFilter = "all" | "payable" | "disputed" | "settled";
type PaymentFilter = "all" | "retained" | "released" | "initiated";
type MainTab = "debts" | "payments" | "member";

function emptySummary(): MusicianEarningsSummary {
    return {
        currency: "PEN",
        total_quoted: 0,
        total_released: 0,
        total_retained: 0,
        total_pending: 0,
        total_app_debt: 0,
        total_disputed: 0,
        total_retained_active: 0,
        bookings_active: 0,
        bookings_completed: 0,
        bookings_cancelled: 0,
        items: [],
        debts: [],
    };
}

function emptyMemberIncome(): MyMemberIncomeSummary {
    return {
        currency: "PEN",
        total_assigned: 0,
        total_pending: 0,
        total_paid: 0,
        items: [],
    };
}

const DEBT_STATE_LABEL: Record<string, string> = {
    payable: "Por cobrar",
    awaiting_reviews: "Pendiente de reseñas",
    disputed: "En disputa",
    awaiting_admin: "Esperando admin",
    settled: "Cobrado",
    in_progress: "En curso",
};

const DEBT_STATE_COLOR: Record<
    string,
    "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
    payable: "primary",
    awaiting_reviews: "warning",
    disputed: "danger",
    awaiting_admin: "warning",
    settled: "success",
    payment_released: "success",
    completed: "success",
    cancelled: "danger",
    in_progress: "secondary",
};

const MEMBER_PAYOUT_LABEL: Record<string, string> = {
    draft: "Borrador",
    locked: "Confirmado",
    paid: "Pagado",
};



export default function MusicianEarningsView() {
    const { user } = useAuth();
    const { isVerified } = useProfileVerification(
        "musician",
        !!user && user.role === "musician",
        user?.is_verified ?? false,
    );
    const isEnsembleMember = Boolean(user?.is_ensemble_member);

    const [summary, setSummary] = useState<MusicianEarningsSummary>(emptySummary());
    const [memberIncome, setMemberIncome] =
        useState<MyMemberIncomeSummary>(emptyMemberIncome());
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [reloadTick, setReloadTick] = useState(0);
    const [isRequestingPayout, setIsRequestingPayout] = useState(false);
    const [debtFilter, setDebtFilter] = useState<DebtFilter>("all");
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
    const [mainTab, setMainTab] = useState<MainTab>("debts");
    const [selectedPayment, setSelectedPayment] =
        useState<MusicianEarningsItem | null>(null);
    const [selectedMemberItem, setSelectedMemberItem] =
        useState<MyMemberIncomeItem | null>(null);

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) {
                setIsLoading(true);
                setLoadError(null);
            }
        });

        const tasks: Promise<void>[] = [];

        if (isVerified) {
            tasks.push(
                getMusicianEarnings()
                    .then((data) => {
                        if (!cancelled) setSummary(data);
                    })
                    .catch((error) => {
                        if (cancelled) return;
                        const msg =
                            error instanceof Error
                                ? error.message
                                : "Intenta de nuevo más tarde.";
                        setLoadError(msg);
                        addToast({
                            title: "No se pudieron cargar los ingresos",
                            description: msg,
                            color: "danger",
                        });
                        setSummary(emptySummary());
                    }),
            );
        }

        if (isEnsembleMember) {
            tasks.push(
                listMyMemberIncome()
                    .then((data) => {
                        if (!cancelled) setMemberIncome(data);
                    })
                    .catch((error) => {
                        if (cancelled) return;
                        const msg =
                            error instanceof Error
                                ? error.message
                                : "Intenta de nuevo más tarde.";
                        setLoadError(msg);
                        addToast({
                            title: "No se pudieron cargar tus ingresos de integrante",
                            description: msg,
                            color: "danger",
                        });
                        setMemberIncome(emptyMemberIncome());
                    }),
            );
        }

        Promise.all(tasks).finally(() => {
            if (!cancelled) setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [isVerified, isEnsembleMember, reloadTick]);

    useEffect(() => {
        if (!isVerified && isEnsembleMember) {
            setTimeout(() => setMainTab("member"), 0);
            return;
        }
        if (isVerified) setTimeout(() => setMainTab("debts"), 0);
    }, [isVerified, isEnsembleMember]);

    const handleRequestPayout = async () => {
        try {
            setIsRequestingPayout(true);
            const created = await requestPayout();
            setSummary((prev) => ({
                ...prev,
                pending_payout_request: created,
            }));
            addToast({
                title: "Solicitud enviada",
                description: `Se registró tu solicitud de retiro por ${formatCurrency(created.amount)}. El equipo administrativo procesará el desembolso.`,
                color: "success",
            });
            try {
                const data = await getMusicianEarnings();
                setSummary(data);
            } catch {
                // La solicitud ya fue creada; si falla el refresco secundario, conservamos el estado optimista.
            }
        } catch (error) {
            addToast({
                title: "No se pudo solicitar el retiro",
                description: error instanceof Error ? error.message : "Error desconocido",
                color: "danger",
            });
        } finally {
            setIsRequestingPayout(false);
        }
    };

    const filteredDebts = useMemo(() => {
        const debts = summary.debts ?? [];
        return debts.filter((item) => {
            if (debtFilter === "payable") return item.debt_state === "payable";
            if (debtFilter === "disputed") {
                return (
                    item.debt_state === "disputed" ||
                    item.debt_state === "awaiting_admin"
                );
            }
            if (debtFilter === "settled") return item.debt_state === "settled";
            return item.debt_state !== "in_progress" || item.retained_total > 0;
        });
    }, [summary.debts, debtFilter]);

    const filteredPayments = useMemo(() => {
        const payments = summary.items ?? [];
        return payments.filter((item) => {
            if (paymentFilter === "all") return true;
            return item.status === paymentFilter;
        });
    }, [summary.items, paymentFilter]);

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <div className="h-32 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-48 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    const showPlatform = isVerified;
    const showMember = isEnsembleMember;

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div className="rounded-4xl border border-default-200/70 bg-gradient-to-br from-secondary/15 via-content1 to-content1 px-4 py-5 sm:px-6 sm:py-6 shadow-soft overflow-hidden relative">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                        <Chip color="secondary" variant="flat" size="sm" className="mb-3">
                            Control financiero
                        </Chip>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                            Ingresos
                        </h1>
                        <p className="text-default-600 mt-2 max-w-2xl text-sm sm:text-base">
                            {showPlatform && showMember
                                ? "Consulta la deuda de la plataforma, el historial de cada pago y lo que te asignaron como integrante."
                                : showMember
                                  ? "Aquí ves lo que el líder te asignó por cada evento y el estado de cada pago."
                                  : "El dinero de los shows lo retiene Chivapp. Revisa deudas por show y el historial de cada pago."}
                        </p>
                    </div>
                    <Button
                        as={Link}
                        href="/musician/bookings"
                        variant="flat"
                        radius="lg"
                        className="font-semibold w-full sm:w-auto"
                        startContent={
                            <Icon icon="material-symbols:calendar-month" width={18} />
                        }
                    >
                        Ir a reservas
                    </Button>
                </div>
            </div>

            {loadError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-danger">
                            Error al cargar tus ingresos
                        </p>
                        <p className="text-xs text-default-600">{loadError}</p>
                    </div>
                    <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() => setReloadTick((n) => n + 1)}
                    >
                        Reintentar
                    </Button>
                </div>
            ) : null}

            {showPlatform || showMember ? (
                <Tabs
                    aria-label="Secciones de ingresos del músico"
                    selectedKey={mainTab}
                    onSelectionChange={(key) => setMainTab(key as MainTab)}
                    variant="underlined"
                    color="secondary"
                >
                    {showPlatform ? <Tab key="debts" title="Deuda por show" /> : null}
                    {showPlatform ? (
                        <Tab key="payments" title="Historial de pagos" />
                    ) : null}
                    {showMember ? (
                        <Tab key="member" title="Como integrante" />
                    ) : null}
                </Tabs>
            ) : null}

            {showPlatform && mainTab === "debts" ? (
                <PlatformDebtsSection
                    summary={summary}
                    filteredDebts={filteredDebts}
                    filter={debtFilter}
                    onFilterChange={setDebtFilter}
                    isRequestingPayout={isRequestingPayout}
                    onPayoutRequest={handleRequestPayout}
                />
            ) : null}

            {showPlatform && mainTab === "payments" ? (
                <PlatformPaymentsSection
                    items={filteredPayments}
                    filter={paymentFilter}
                    onFilterChange={setPaymentFilter}
                    onOpenDetail={setSelectedPayment}
                />
            ) : null}

            {showMember && mainTab === "member" ? (
                <MemberIncomeSection
                    summary={memberIncome}
                    onOpenDetail={setSelectedMemberItem}
                />
            ) : null}

            {!showPlatform && !showMember ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="gap-3 p-10 text-center">
                        <p className="font-semibold">Sin datos de ingresos</p>
                        <p className="text-sm text-default-500">
                            Completa tu verificación o participa como integrante para ver
                            ingresos aquí.
                        </p>
                    </CardBody>
                </Card>
            ) : null}

            <PaymentDetailModal
                item={selectedPayment}
                onClose={() => setSelectedPayment(null)}
            />
            <MemberIncomeDetailModal
                item={selectedMemberItem}
                onClose={() => setSelectedMemberItem(null)}
            />
        </div>
    );
}

function PlatformDebtsSection({
    summary,
    filteredDebts,
    filter,
    onFilterChange,
    isRequestingPayout,
    onPayoutRequest,
}: {
    summary: MusicianEarningsSummary;
    filteredDebts: MusicianDebtItem[];
    filter: DebtFilter;
    onFilterChange: (value: DebtFilter) => void;
    isRequestingPayout: boolean;
    onPayoutRequest: () => void;
}) {
    const cards = [
        {
            label: "Deuda de la app",
            value: summary.total_app_debt ?? 0,
            hint: "Shows finalizados listos para desembolso",
            icon: "material-symbols:account-balance",
            tone: "text-primary",
            bg: "bg-primary/10",
        },
        {
            label: "En disputa",
            value: summary.total_disputed ?? 0,
            hint: "Con queja abierta o pendiente de admin",
            icon: "material-symbols:report",
            tone: "text-danger",
            bg: "bg-danger/10",
        },
        {
            label: "Cobrado",
            value: summary.total_released,
            hint: "Desembolsos autorizados por admin",
            icon: "material-symbols:account-balance-wallet",
            tone: "text-success",
            bg: "bg-success/10",
        },
        {
            label: "Retenido en curso",
            value: summary.total_retained_active ?? 0,
            hint: "Shows aún no finalizados",
            icon: "material-symbols:lock",
            tone: "text-secondary",
            bg: "bg-secondary/10",
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-foreground">Resumen de deuda</h2>
                {(summary.total_app_debt ?? 0) > 0 && (
                    summary.pending_payout_request ? (
                        <Chip
                            color="success"
                            variant="flat"
                            size="lg"
                            startContent={<Icon icon="material-symbols:check-circle" width={18} />}
                            className="px-3 py-2 font-semibold"
                        >
                            Retiro solicitado ({formatCurrency(summary.pending_payout_request.amount)}) · En proceso
                        </Chip>
                    ) : (
                        <Button
                            color="primary"
                            isLoading={isRequestingPayout}
                            onPress={onPayoutRequest}
                            startContent={
                                !isRequestingPayout ? (
                                    <Icon icon="material-symbols:payments-outline" width={18} />
                                ) : undefined
                            }
                        >
                            Solicitar retiro ({formatCurrency(summary.total_app_debt ?? 0)})
                        </Button>
                    )
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {cards.map((card) => (
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

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Deuda por show</h2>
                    <p className="text-sm text-default-500 mt-1">
                        Shows finalizados y liquidaciones. El admin autoriza cada
                        desembolso.
                    </p>
                </div>
                <Tabs
                    aria-label="Filtrar deuda por show según estado"
                    selectedKey={filter}
                    onSelectionChange={(key) => onFilterChange(key as DebtFilter)}
                    size="sm"
                    variant="solid"
                    color="secondary"
                >
                    <Tab key="all" title="Todos" />
                    <Tab key="payable" title="Por cobrar" />
                    <Tab key="disputed" title="En disputa" />
                    <Tab key="settled" title="Cobrados" />
                </Tabs>
            </div>

            {filteredDebts.length === 0 ? (
                <EmptyState
                    title="Aún no hay deuda registrada"
                    description="Cuando finalicen shows con pagos retenidos verás aquí el detalle."
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredDebts.map((item) => (
                        <DebtRow key={item.booking_id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

function PlatformPaymentsSection({
    items,
    filter,
    onFilterChange,
    onOpenDetail,
}: {
    items: MusicianEarningsItem[];
    filter: PaymentFilter;
    onFilterChange: (value: PaymentFilter) => void;
    onOpenDetail: (item: MusicianEarningsItem) => void;
}) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        Historial de pagos
                    </h2>
                    <p className="text-sm text-default-500 mt-1">
                        Cada pago total asociado a tus reservas.
                    </p>
                </div>
                <Tabs
                    aria-label="Filtrar historial de pagos por estado"
                    selectedKey={filter}
                    onSelectionChange={(key) => onFilterChange(key as PaymentFilter)}
                    size="sm"
                    variant="solid"
                    color="secondary"
                >
                    <Tab key="all" title="Todos" />
                    <Tab key="retained" title="Retenidos" />
                    <Tab key="released" title="Liberados" />
                    <Tab key="initiated" title="Iniciados" />
                </Tabs>
            </div>

            {items.length === 0 ? (
                <EmptyState
                    title="Sin pagos registrados"
                    description="Cuando se registren pagos en las reservas aparecerán aquí uno por uno."
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map((item) => (
                        <Card
                            key={item.payment_id}
                            className="border border-default-200/70 shadow-soft"
                        >
                            <CardBody className="p-0">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                                        <Icon
                                            icon="material-symbols:receipt-long"
                                            width={22}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold text-foreground">
                                                {item.event_type}
                                            </h3>
                                            <Chip size="sm" variant="flat" color="secondary">
                                                {PAYMENT_TYPE_LABELS[item.payment_type || ""] ||
                                                    item.payment_type ||
                                                    "Pago"}
                                            </Chip>
                                            <Chip size="sm" variant="flat">
                                                {PAYMENT_STATUS_LABELS[item.status] ||
                                                    item.status}
                                            </Chip>
                                        </div>
                                        <p className="text-sm text-default-500 mt-1">
                                            {formatBookingDate(item.event_date)}
                                            {item.location_city
                                                ? ` · ${item.location_city}`
                                                : ""}
                                            {" · "}
                                            {formatDateTime(item.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                                        <p className="text-xl font-bold text-foreground">
                                            {formatCurrency(item.amount)}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            radius="lg"
                                            onPress={() => onOpenDetail(item)}
                                        >
                                            Ver detalle
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function MemberIncomeSection({
    summary,
    onOpenDetail,
}: {
    summary: MyMemberIncomeSummary;
    onOpenDetail: (item: MyMemberIncomeItem) => void;
}) {
    const cards = [
        {
            label: "Asignado",
            value: Number(summary.total_assigned || 0),
            icon: "material-symbols:payments",
        },
        {
            label: "Pendiente",
            value: Number(summary.total_pending || 0),
            icon: "material-symbols:hourglass-top",
        },
        {
            label: "Pagado",
            value: Number(summary.total_paid || 0),
            icon: "material-symbols:check-circle",
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {cards.map((card) => (
                    <Card key={card.label} className="border border-default-200/70 shadow-soft">
                        <CardBody className="gap-2 p-4">
                            <Icon
                                icon={card.icon}
                                width={20}
                                className="text-secondary"
                            />
                            <p className="text-sm text-default-500">{card.label}</p>
                            <p className="text-2xl font-bold">
                                {formatCurrency(card.value)}
                            </p>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <div>
                <h2 className="text-xl font-bold text-foreground">Tus pagos por evento</h2>
                <p className="text-sm text-default-500 mt-1">
                    Montos que el líder te asignó. Revisa el detalle de cada uno.
                </p>
            </div>

            {summary.items.length === 0 ? (
                <EmptyState
                    title="Aún no tienes ingresos asignados"
                    description="Cuando el líder confirme el reparto de un evento aparecerán aquí."
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {summary.items.map((item) => (
                        <Card
                            key={item.payout_id}
                            className="border border-default-200/70 shadow-soft"
                        >
                            <CardBody className="p-0">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                                        <Icon
                                            icon="material-symbols:groups"
                                            width={22}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold">
                                                {item.event_type}
                                            </h3>
                                            <Chip
                                                size="sm"
                                                variant="flat"
                                                color={
                                                    item.status === "paid"
                                                        ? "success"
                                                        : item.status === "locked"
                                                          ? "secondary"
                                                          : "default"
                                                }
                                            >
                                                {MEMBER_PAYOUT_LABEL[item.status] ||
                                                    item.status}
                                            </Chip>
                                        </div>
                                        <p className="text-sm text-default-500 mt-1">
                                            {formatBookingDate(item.event_date)}
                                            {item.location_city
                                                ? ` · ${item.location_city}`
                                                : ""}
                                            {item.leader_name
                                                ? ` · Líder: ${item.leader_name}`
                                                : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                                        <p className="text-xl font-bold">
                                            {formatCurrency(Number(item.amount))}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                radius="lg"
                                                onPress={() => onOpenDetail(item)}
                                            >
                                                Ver detalle
                                            </Button>
                                            <Button
                                                as={Link}
                                                href={`/musician/bookings/${item.booking_id}`}
                                                size="sm"
                                                variant="bordered"
                                                radius="lg"
                                            >
                                                Ver reserva
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function DebtRow({ item }: { item: MusicianDebtItem }) {
    const bookingStatus = item.booking_status as BookingStatus;
    const amount =
        item.debt_state === "settled"
            ? item.admin_musician_amount ?? item.released_total
            : item.retained_total || item.released_total;

    return (
        <Card className="border border-default-200/70 shadow-soft">
            <CardBody className="p-0">
                <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                        <Icon icon="material-symbols:payments" width={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                                {item.event_type}
                            </h3>
                            <Chip
                                size="sm"
                                variant="flat"
                                color={DEBT_STATE_COLOR[item.debt_state] || "default"}
                            >
                                {DEBT_STATE_LABEL[item.debt_state] || item.debt_state}
                            </Chip>
                        </div>
                        <p className="text-sm text-default-500 mt-1">
                            {formatBookingDate(item.event_date)}
                            {item.location_city ? ` · ${item.location_city}` : ""}
                            {" · "}
                            {BOOKING_STATUS_LABELS[bookingStatus] || item.booking_status}
                        </p>
                        {item.complaint_reason ? (
                            <p className="text-sm text-danger mt-2 line-clamp-2">
                                Queja: {item.complaint_reason}
                            </p>
                        ) : null}
                        {item.debt_state === "awaiting_reviews" ? (
                            <p className="text-xs text-warning-text mt-1.5">
                                {!item.has_contractor_review && !item.has_musician_review
                                    ? "Para habilitar el desembolso, tanto el contratista como tú deben dejar su reseña tras culminar el evento."
                                    : !item.has_contractor_review
                                      ? "Falta la reseña final del contratista tras culminar el evento para habilitar el desembolso."
                                      : !item.has_musician_review
                                        ? "Falta que dejes tu reseña al contratista en el detalle de la reserva para habilitar el desembolso."
                                        : "El evento debe estar marcado como finalizado con ambas reseñas para habilitar el desembolso."}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        <p className="text-xl font-bold text-foreground">
                            {formatCurrency(amount)}
                        </p>
                        <Button
                            as={Link}
                            href={`/musician/bookings/${item.booking_id}`}
                            size="sm"
                            variant="flat"
                            radius="lg"
                            color={
                                item.debt_state === "disputed" ? "danger" : "default"
                            }
                        >
                            {item.debt_state === "disputed"
                                ? "Ver queja / descargo"
                                : "Ver reserva"}
                        </Button>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

function PaymentDetailModal({
    item,
    onClose,
}: {
    item: MusicianEarningsItem | null;
    onClose: () => void;
}) {
    return (
        <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />} isOpen={Boolean(item)} onOpenChange={(open) => !open && onClose()} scrollBehavior="inside" placement="bottom-center">
            <ModalContent>
                {(close) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Detalle del pago
                            <span className="text-sm font-normal text-default-500">
                                {item?.event_type}
                            </span>
                        </ModalHeader>
                        <ModalBody className="gap-3">
                            {item ? (
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <DetailField
                                        label="Monto (tu porción)"
                                        value={formatCurrency(item.amount)}
                                    />
                                    <DetailField
                                        label="Estado"
                                        value={
                                            PAYMENT_STATUS_LABELS[item.status] ||
                                            item.status
                                        }
                                    />
                                    <DetailField
                                        label="Tipo"
                                        value={
                                            PAYMENT_TYPE_LABELS[item.payment_type || ""] ||
                                            item.payment_type ||
                                            "—"
                                        }
                                    />
                                    <DetailField
                                        label="Reserva"
                                        value={
                                            BOOKING_STATUS_LABELS[
                                                item.booking_status as BookingStatus
                                            ] || item.booking_status
                                        }
                                    />
                                    <DetailField
                                        label="Fecha evento"
                                        value={formatBookingDate(item.event_date)}
                                    />
                                    <DetailField
                                        label="Ciudad"
                                        value={item.location_city || "—"}
                                    />
                                    <DetailField
                                        label="Registrado"
                                        value={formatDateTime(item.created_at)}
                                    />
                                    <DetailField
                                        label="Retenido"
                                        value={formatDateTime(item.retained_at)}
                                    />
                                    <DetailField
                                        label="Liberado"
                                        value={formatDateTime(item.released_at)}
                                    />
                                    <DetailField
                                        label="ID pago"
                                        value={item.payment_id}
                                    />
                                </dl>
                            ) : null}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={close}>
                                Cerrar
                            </Button>
                            {item ? (
                                <Button
                                    as={Link}
                                    href={`/musician/bookings/${item.booking_id}`}
                                    color="secondary"
                                    onPress={close}
                                >
                                    Abrir reserva
                                </Button>
                            ) : null}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

function MemberIncomeDetailModal({
    item,
    onClose,
}: {
    item: MyMemberIncomeItem | null;
    onClose: () => void;
}) {
    return (
        <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />} isOpen={Boolean(item)} onOpenChange={(open) => !open && onClose()} scrollBehavior="inside" placement="bottom-center">
            <ModalContent>
                {(close) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Detalle de tu pago
                            <span className="text-sm font-normal text-default-500">
                                {item?.event_type}
                            </span>
                        </ModalHeader>
                        <ModalBody className="gap-3">
                            {item ? (
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <DetailField
                                        label="Monto"
                                        value={formatCurrency(Number(item.amount))}
                                    />
                                    <DetailField
                                        label="Estado"
                                        value={
                                            MEMBER_PAYOUT_LABEL[item.status] ||
                                            item.status
                                        }
                                    />
                                    <DetailField
                                        label="Líder"
                                        value={item.leader_name || "—"}
                                    />
                                    <DetailField
                                        label="Fecha evento"
                                        value={formatBookingDate(item.event_date)}
                                    />
                                    <DetailField
                                        label="Ciudad"
                                        value={item.location_city || "—"}
                                    />
                                    <DetailField
                                        label="Estado reserva"
                                        value={
                                            BOOKING_STATUS_LABELS[
                                                item.booking_status as BookingStatus
                                            ] || item.booking_status
                                        }
                                    />
                                    <DetailField
                                        label="Asignado"
                                        value={formatDateTime(item.set_by_leader_at)}
                                    />
                                    <DetailField
                                        label="Pagado"
                                        value={formatDateTime(item.paid_at)}
                                    />
                                    <DetailField
                                        label="Nota"
                                        value={item.note || "—"}
                                    />
                                </dl>
                            ) : null}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={close}>
                                Cerrar
                            </Button>
                            {item ? (
                                <Button
                                    as={Link}
                                    href={`/musician/bookings/${item.booking_id}`}
                                    color="secondary"
                                    onPress={close}
                                >
                                    Abrir reserva
                                </Button>
                            ) : null}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-default-200 bg-default-50/60 px-3 py-2.5">
            <dt className="text-xs uppercase tracking-wide text-default-500">
                {label}
            </dt>
            <dd className="mt-1 font-medium text-foreground break-all">{value}</dd>
        </div>
    );
}

function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <Card className="border border-default-200/70 shadow-soft">
            <CardBody className="gap-3 p-10 text-center">
                <Icon
                    icon="material-symbols:payments"
                    width={36}
                    className="mx-auto text-default-400"
                />
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm text-default-500">{description}</p>
            </CardBody>
        </Card>
    );
}


