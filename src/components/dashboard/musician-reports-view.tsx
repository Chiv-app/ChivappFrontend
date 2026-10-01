"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Select,
    SelectItem,
    Tab,
    Tabs,
    addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    BOOKING_STATUS_LABELS,
    formatBookingDate,
    formatCurrency,
} from "@/lib/booking-labels";
import { getMusicianReports } from "@/lib/ensemble-members";
import type {
    BookingStatus,
    MusicianReportsOut,
} from "@/types/api";

type GroupBy = "month" | "week";

const PIE_COLORS = [
    "#2563eb",
    "#7c3aed",
    "#059669",
    "#ea580c",
    "#db2777",
    "#0891b2",
    "#ca8a04",
    "#4f46e5",
];

function defaultFrom(): string {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return from.toISOString().slice(0, 10);
}

function defaultTo(): string {
    return new Date().toISOString().slice(0, 10);
}

const STATUS_OPTIONS = [
    { key: "__all", label: "Todos" },
    ...Object.entries(BOOKING_STATUS_LABELS).map(([key, label]) => ({ key, label })),
];

export default function MusicianReportsView() {
    const [dateFrom, setDateFrom] = useState(defaultFrom);
    const [dateTo, setDateTo] = useState(defaultTo);
    const [groupBy, setGroupBy] = useState<GroupBy>("month");
    const [status, setStatus] = useState<string>("");
    const [applied, setApplied] = useState({
        date_from: defaultFrom(),
        date_to: defaultTo(),
        group_by: "month" as GroupBy,
        status: "",
    });
    const [data, setData] = useState<MusicianReportsOut | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tableTab, setTableTab] = useState<"bookings" | "members">("bookings");

    const refresh = useCallback(async () => {
        const result = await getMusicianReports({
            date_from: applied.date_from,
            date_to: applied.date_to,
            group_by: applied.group_by,
            status: applied.status || undefined,
        });
        setData(result);
    }, [applied]);

    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => setIsLoading(true));
        refresh()
            .catch((error) => {
                if (cancelled) return;
                addToast({
                    title: "No se pudieron cargar los reportes",
                    description:
                        error instanceof Error ? error.message : "Intenta de nuevo.",
                    color: "danger",
                });
                setData(null);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [refresh]);

    const statusPie = useMemo(
        () =>
            (data?.bookings_by_status ?? []).map((slice) => ({
                name: slice.label,
                value: slice.count,
            })),
        [data],
    );

    const payoutPie = useMemo(
        () =>
            (data?.payouts_by_status ?? []).map((slice) => ({
                name: slice.label,
                value: Number(slice.value || 0),
            })),
        [data],
    );

    const memberPayChart = useMemo(() => {
        const rows = (data?.members_table ?? []).filter(
            (row) => row.assigned > 0 || row.paid > 0 || row.pending > 0,
        );
        return rows
            .slice()
            .sort((a, b) => b.assigned - a.assigned)
            .slice(0, 12)
            .map((row) => ({
                name:
                    row.fullname.length > 16
                        ? `${row.fullname.slice(0, 14)}…`
                        : row.fullname,
                fullname: row.fullname,
                shows: row.shows,
                assigned: Number(row.assigned || 0),
                paid: Number(row.paid || 0),
                pending: Number(row.pending || 0),
            }));
    }, [data]);

    const memberSharePie = useMemo(
        () =>
            memberPayChart
                .filter((row) => row.assigned > 0)
                .map((row) => ({
                    name: row.name,
                    value: row.assigned,
                })),
        [memberPayChart],
    );

    function applyFilters() {
        setApplied({
            date_from: dateFrom,
            date_to: dateTo,
            group_by: groupBy,
            status,
        });
    }

    if (isLoading && !data) {
        return (
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <div className="h-28 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
                <div className="h-72 rounded-4xl bg-content1/60 border border-default-200/70 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div className="rounded-4xl border border-default-200/70 bg-gradient-to-br from-secondary/15 via-content1 to-content1 px-4 py-5 sm:px-6 sm:py-6 shadow-soft">
                <Chip color="secondary" variant="flat" size="sm" className="mb-3">
                    Analítica
                </Chip>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Reportes
                </h1>
                <p className="text-default-600 mt-2 max-w-2xl text-sm sm:text-base">
                    Visualiza reservas, ingresos, pagos a integrantes y quejas con
                    filtros por fecha, agrupación y estado.
                </p>
            </div>

            <Card className="border border-default-200/70 shadow-soft">
                <CardBody className="gap-4 p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Input
                            type="date"
                            label="Desde"
                            variant="bordered"
                            radius="lg"
                            value={dateFrom}
                            onValueChange={setDateFrom}
                        />
                        <Input
                            type="date"
                            label="Hasta"
                            variant="bordered"
                            radius="lg"
                            value={dateTo}
                            onValueChange={setDateTo}
                        />
                        <Select
                            label="Agrupar por"
                            variant="bordered"
                            radius="lg"
                            selectedKeys={[groupBy]}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as GroupBy;
                                if (value) setGroupBy(value);
                            }}
                        >
                            <SelectItem key="month">Mes</SelectItem>
                            <SelectItem key="week">Semana</SelectItem>
                        </Select>
                        <Select
                            label="Estado de reserva"
                            variant="bordered"
                            radius="lg"
                            selectedKeys={status ? [status] : ["__all"]}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0];
                                setStatus(
                                    !value || String(value) === "__all"
                                        ? ""
                                        : String(value),
                                );
                            }}
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.key}>{option.label}</SelectItem>
                            ))}
                        </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            color="secondary"
                            radius="lg"
                            className="font-semibold"
                            isLoading={isLoading}
                            onPress={applyFilters}
                            startContent={
                                <Icon icon="material-symbols:filter-alt" width={18} />
                            }
                        >
                            Aplicar filtros
                        </Button>
                        <Button
                            variant="flat"
                            radius="lg"
                            onPress={() => {
                                setDateFrom(defaultFrom());
                                setDateTo(defaultTo());
                                setGroupBy("month");
                                setStatus("");
                                setApplied({
                                    date_from: defaultFrom(),
                                    date_to: defaultTo(),
                                    group_by: "month",
                                    status: "",
                                });
                            }}
                        >
                            Limpiar
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {!data ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="p-10 text-center text-default-500">
                        No hay datos para mostrar con estos filtros.
                    </CardBody>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            {
                                label: "Reservas",
                                value: String(data.bookings_total),
                                hint: `${data.bookings_completed} finalizadas`,
                            },
                            {
                                label: "Cotizado",
                                value: formatCurrency(data.revenue_quoted),
                                hint: "Precio acordado del periodo",
                            },
                            {
                                label: "Liberado",
                                value: formatCurrency(data.revenue_released),
                                hint: "Tu porción liberada",
                            },
                            {
                                label: "Pagado a integrantes",
                                value: formatCurrency(data.member_paid),
                                hint: `${formatCurrency(data.member_pending)} pendiente`,
                            },
                        ].map((card) => (
                            <Card
                                key={card.label}
                                className="border border-default-200/70 shadow-soft"
                            >
                                <CardBody className="gap-1 p-4">
                                    <p className="text-xs text-default-500">{card.label}</p>
                                    <p className="text-xl font-bold">{card.value}</p>
                                    <p className="text-[11px] text-default-400">
                                        {card.hint}
                                    </p>
                                </CardBody>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="p-4">
                                <p className="text-sm text-default-500">Rating del periodo</p>
                                <p className="text-2xl font-bold mt-1">
                                    {data.rating_avg != null
                                        ? `${data.rating_avg.toFixed(1)}★`
                                        : "—"}
                                </p>
                                <p className="text-xs text-default-400 mt-1">
                                    {data.rating_count} reseñas finales
                                </p>
                            </CardBody>
                        </Card>
                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="p-4">
                                <p className="text-sm text-default-500">Quejas</p>
                                <p className="text-2xl font-bold mt-1">
                                    {data.complaints_total}
                                </p>
                                <p className="text-xs text-default-400 mt-1">
                                    {data.complaints_open} abiertas ·{" "}
                                    {data.complaints_settled} liquidadas
                                </p>
                            </CardBody>
                        </Card>
                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="p-4">
                                <p className="text-sm text-default-500">Periodo</p>
                                <p className="text-base font-semibold mt-1">
                                    {formatBookingDate(data.period_from)} –{" "}
                                    {formatBookingDate(data.period_to)}
                                </p>
                                <p className="text-xs text-default-400 mt-1">
                                    Agrupado por {data.group_by === "week" ? "semana" : "mes"}
                                </p>
                            </CardBody>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="gap-3 p-5">
                                <h2 className="text-lg font-bold">
                                    Reservas e ingresos
                                </h2>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.series}>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                opacity={0.3}
                                            />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar
                                                dataKey="bookings"
                                                name="Reservas"
                                                fill="#7c3aed"
                                                radius={[6, 6, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="revenue"
                                                name="Cotizado (S/)"
                                                fill="#2563eb"
                                                radius={[6, 6, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="released"
                                                name="Liberado (S/)"
                                                fill="#059669"
                                                radius={[6, 6, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="gap-3 p-5">
                                <h2 className="text-lg font-bold">
                                    Pagos a integrantes
                                </h2>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.series}>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                opacity={0.3}
                                            />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar
                                                dataKey="member_paid"
                                                name="Pagado (S/)"
                                                fill="#ea580c"
                                                radius={[6, 6, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="retained"
                                                name="Retenido (S/)"
                                                fill="#0891b2"
                                                radius={[6, 6, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="gap-3 p-5">
                                <h2 className="text-lg font-bold">
                                    Reservas por estado
                                </h2>
                                {statusPie.length === 0 ? (
                                    <p className="text-sm text-default-500 py-10 text-center">
                                        Sin datos
                                    </p>
                                ) : (
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={statusPie}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={55}
                                                    outerRadius={95}
                                                    paddingAngle={2}
                                                >
                                                    {statusPie.map((_, index) => (
                                                        <Cell
                                                            key={index}
                                                            fill={
                                                                PIE_COLORS[
                                                                    index % PIE_COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="gap-3 p-5">
                                <h2 className="text-lg font-bold">
                                    Reparto por estado
                                </h2>
                                {payoutPie.length === 0 ? (
                                    <p className="text-sm text-default-500 py-10 text-center">
                                        Sin repartos en el periodo
                                    </p>
                                ) : (
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={payoutPie}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={55}
                                                    outerRadius={95}
                                                    paddingAngle={2}
                                                >
                                                    {payoutPie.map((_, index) => (
                                                        <Cell
                                                            key={index}
                                                            fill={
                                                                PIE_COLORS[
                                                                    (index + 2) %
                                                                        PIE_COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value: number) =>
                                                        formatCurrency(value)
                                                    }
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="gap-3 p-5">
                                <div>
                                    <h2 className="text-lg font-bold">
                                        Paga por integrante
                                    </h2>
                                    <p className="text-sm text-default-500 mt-1">
                                        Detalle de lo asignado, pagado y pendiente de cada
                                        músico en el periodo filtrado.
                                    </p>
                                </div>
                                {memberPayChart.length === 0 ? (
                                    <p className="text-sm text-default-500 py-10 text-center">
                                        Aún no hay repartos asignados a integrantes.
                                    </p>
                                ) : (
                                    <div
                                        className="w-full"
                                        style={{
                                            height: Math.max(
                                                280,
                                                memberPayChart.length * 48,
                                            ),
                                        }}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={memberPayChart}
                                                layout="vertical"
                                                margin={{ left: 8, right: 16, top: 8 }}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    opacity={0.3}
                                                />
                                                <XAxis
                                                    type="number"
                                                    tick={{ fontSize: 11 }}
                                                />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    width={110}
                                                    tick={{ fontSize: 11 }}
                                                />
                                                <Tooltip
                                                    formatter={(value: number) =>
                                                        formatCurrency(value)
                                                    }
                                                    labelFormatter={(_, payload) => {
                                                        const row = payload?.[0]?.payload as
                                                            | {
                                                                  fullname?: string;
                                                                  shows?: number;
                                                              }
                                                            | undefined;
                                                        if (!row?.fullname)
                                                            return "";
                                                        return `${row.fullname} · ${row.shows ?? 0} show(s)`;
                                                    }}
                                                />
                                                <Legend />
                                                <Bar
                                                    dataKey="assigned"
                                                    name="Asignado"
                                                    fill="#7c3aed"
                                                    radius={[0, 6, 6, 0]}
                                                />
                                                <Bar
                                                    dataKey="paid"
                                                    name="Pagado"
                                                    fill="#059669"
                                                    radius={[0, 6, 6, 0]}
                                                />
                                                <Bar
                                                    dataKey="pending"
                                                    name="Pendiente"
                                                    fill="#ea580c"
                                                    radius={[0, 6, 6, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        <Card className="border border-default-200/70 shadow-soft">
                            <CardBody className="gap-3 p-5">
                                <div>
                                    <h2 className="text-lg font-bold">
                                        Participación del reparto
                                    </h2>
                                    <p className="text-sm text-default-500 mt-1">
                                        Cuánto del total asignado corresponde a cada
                                        integrante.
                                    </p>
                                </div>
                                {memberSharePie.length === 0 ? (
                                    <p className="text-sm text-default-500 py-10 text-center">
                                        Sin montos asignados para graficar.
                                    </p>
                                ) : (
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={memberSharePie}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={50}
                                                    outerRadius={95}
                                                    paddingAngle={2}
                                                >
                                                    {memberSharePie.map((_, index) => (
                                                        <Cell
                                                            key={index}
                                                            fill={
                                                                PIE_COLORS[
                                                                    index %
                                                                        PIE_COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value: number) =>
                                                        formatCurrency(value)
                                                    }
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>

                    <Card className="border border-default-200/70 shadow-soft">
                        <CardBody className="gap-4 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-bold">Tablas de detalle</h2>
                                <Tabs
                                    selectedKey={tableTab}
                                    onSelectionChange={(key) =>
                                        setTableTab(key as "bookings" | "members")
                                    }
                                    size="sm"
                                    color="secondary"
                                    variant="solid"
                                >
                                    <Tab key="bookings" title="Reservas" />
                                    <Tab key="members" title="Integrantes" />
                                </Tabs>
                            </div>

                            {tableTab === "bookings" ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-default-500 border-b border-default-200">
                                                <th className="py-2 pr-3 font-medium">Evento</th>
                                                <th className="py-2 pr-3 font-medium">Fecha</th>
                                                <th className="py-2 pr-3 font-medium">Estado</th>
                                                <th className="py-2 pr-3 font-medium">Precio</th>
                                                <th className="py-2 pr-3 font-medium">Liberado</th>
                                                <th className="py-2 font-medium">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.bookings_table.map((row) => (
                                                <tr
                                                    key={row.booking_id}
                                                    className="border-b border-default-100"
                                                >
                                                    <td className="py-2.5 pr-3 font-medium">
                                                        {row.event_type}
                                                    </td>
                                                    <td className="py-2.5 pr-3 text-default-600">
                                                        {formatBookingDate(row.event_date)}
                                                    </td>
                                                    <td className="py-2.5 pr-3">
                                                        {BOOKING_STATUS_LABELS[
                                                            row.status as BookingStatus
                                                        ] || row.status}
                                                    </td>
                                                    <td className="py-2.5 pr-3">
                                                        {row.price_agreed != null
                                                            ? formatCurrency(row.price_agreed)
                                                            : "—"}
                                                    </td>
                                                    <td className="py-2.5 pr-3">
                                                        {formatCurrency(row.released)}
                                                    </td>
                                                    <td className="py-2.5">
                                                        <Button
                                                            as={Link}
                                                            href={`/musician/bookings/${row.booking_id}`}
                                                            size="sm"
                                                            variant="flat"
                                                            radius="lg"
                                                        >
                                                            Ver
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.bookings_table.length === 0 ? (
                                        <p className="text-sm text-default-500 py-6 text-center">
                                            Sin reservas en el periodo.
                                        </p>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-default-500 border-b border-default-200">
                                                <th className="py-2 pr-3 font-medium">
                                                    Integrante
                                                </th>
                                                <th className="py-2 pr-3 font-medium">Shows</th>
                                                <th className="py-2 pr-3 font-medium">
                                                    Asignado
                                                </th>
                                                <th className="py-2 pr-3 font-medium">Pagado</th>
                                                <th className="py-2 font-medium">Pendiente</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.members_table.map((row) => (
                                                <tr
                                                    key={row.ensemble_member_id}
                                                    className="border-b border-default-100"
                                                >
                                                    <td className="py-2.5 pr-3">
                                                        <p className="font-medium">
                                                            {row.fullname}
                                                        </p>
                                                        <p className="text-xs text-default-500">
                                                            {row.email}
                                                        </p>
                                                    </td>
                                                    <td className="py-2.5 pr-3">{row.shows}</td>
                                                    <td className="py-2.5 pr-3">
                                                        {formatCurrency(row.assigned)}
                                                    </td>
                                                    <td className="py-2.5 pr-3">
                                                        {formatCurrency(row.paid)}
                                                    </td>
                                                    <td className="py-2.5">
                                                        {formatCurrency(row.pending)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.members_table.length === 0 ? (
                                        <p className="text-sm text-default-500 py-6 text-center">
                                            Sin integrantes registrados.
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </>
            )}
        </div>
    );
}
