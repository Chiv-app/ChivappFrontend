"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import AdminStatCard from "@/components/admin/admin-stat-card";
import { getAdminActivity, getAdminStats } from "@/lib/admin";
import { ADMIN_MODULES } from "@/lib/dashboard-nav";
import { formatCurrency, BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/booking-labels";
import { formatDateTime } from "@/lib/date-utils";
import type { AdminActivityItem, AdminStatsOut, BookingStatus } from "@/types/api";

function formatSubtitle(item: AdminActivityItem): string | null {
    if (!item.subtitle) return null;
    if (item.type === "booking_updated") {
        const parts = item.subtitle.split(" · ");
        if (parts.length >= 2) {
            const statusKey = parts[0] as BookingStatus;
            const label = BOOKING_STATUS_LABELS[statusKey] || parts[0];
            return `${label} · ${parts.slice(1).join(" · ")}`;
        }
    }
    if (item.type === "payment_event") {
        const statusKey = item.subtitle;
        const label = PAYMENT_STATUS_LABELS[statusKey] || statusKey;
        return label;
    }
    return item.subtitle;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStatsOut | null>(null);
    const [activity, setActivity] = useState<AdminActivityItem[]>([]);

    useEffect(() => {
        Promise.all([getAdminStats(), getAdminActivity(12)])
            .then(([statsData, activityData]) => {
                setStats(statsData);
                setActivity(activityData);
            })
            .catch(() => {
                setStats(null);
                setActivity([]);
            });
    }, []);

    if (!stats) {
        return (
            <div className="h-64 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <AdminPageHeader
                title="Centro de control"
                description="Vista total de la plataforma: usuarios, moderación, reservas, pagos y actividad en tiempo casi real."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <AdminStatCard
                    label="Usuarios"
                    value={stats.total_users}
                    icon="material-symbols:group"
                    hint={`${stats.total_musicians} músicos · ${stats.total_contractors} contratistas`}
                />
                <AdminStatCard
                    label="Perfiles por revisar"
                    value={
                        stats.pending_musician_profiles +
                        stats.pending_contractor_profiles
                    }
                    icon="material-symbols:pending-actions"
                    tone="warning"
                    hint={`${stats.pending_musician_profiles} músicos · ${stats.pending_contractor_profiles} contratistas`}
                />
                <AdminStatCard
                    label="Reservas activas"
                    value={stats.active_bookings}
                    icon="material-symbols:calendar-month"
                    tone="primary"
                    hint={`${stats.change_pending_bookings} con cambios · ${stats.payment_review_bookings} en pago`}
                />
                <AdminStatCard
                    label="Retenido"
                    value={formatCurrency(stats.retained_payments_amount)}
                    icon="material-symbols:account-balance-wallet"
                    tone="success"
                    hint={`Liberado: ${formatCurrency(stats.released_payments_amount)}`}
                />
            </div>

            <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Módulos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {ADMIN_MODULES.map((module) => (
                        <Card
                            key={module.href}
                            as={Link}
                            href={module.href}
                            isPressable
                            className="border border-default-200/70 shadow-soft"
                        >
                            <CardBody className="p-5 gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Icon icon={module.icon} width={22} />
                                    </div>
                                    <h4 className="font-semibold text-foreground">
                                        {module.title}
                                    </h4>
                                </div>
                                <p className="text-sm text-default-500">
                                    {module.description}
                                </p>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="p-6 gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-xl font-semibold text-foreground">
                                Actividad reciente
                            </h3>
                            <Button
                                as={Link}
                                href="/admin/activity"
                                size="sm"
                                variant="flat"
                                radius="lg"
                            >
                                Ver todo
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {activity.map((item) => (
                                <Link
                                    key={`${item.type}-${item.id}-${item.created_at}`}
                                    href={item.href || "/admin/activity"}
                                    className="flex items-center justify-between rounded-2xl border border-default-200 px-4 py-3 hover:bg-default-50 transition-colors"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground truncate">
                                            {item.title}
                                        </p>
                                        {item.subtitle ? (
                                            <p className="text-sm text-default-500 truncate">
                                                {formatSubtitle(item)}
                                            </p>
                                        ) : null}
                                    </div>
                                    <span className="text-xs text-default-400 shrink-0 ml-3">
                                        {formatDateTime(item.created_at)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="p-6 gap-4">
                        <h3 className="text-xl font-semibold text-foreground">
                            Semáforo operativo
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3">
                                <span className="text-sm text-foreground">
                                    Cambios pendientes
                                </span>
                                <Chip color="warning" variant="flat" size="sm">
                                    {stats.change_pending_bookings}
                                </Chip>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
                                <span className="text-sm text-foreground">
                                    Pagos por revisar
                                </span>
                                <Chip color="primary" variant="flat" size="sm">
                                    {stats.payment_review_bookings}
                                </Chip>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success/5 px-4 py-3">
                                <span className="text-sm text-foreground">
                                    Shares activos
                                </span>
                                <Chip color="success" variant="flat" size="sm">
                                    {stats.share_enabled_bookings}
                                </Chip>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-default-200 px-4 py-3">
                                <span className="text-sm text-foreground">
                                    Completadas / canceladas
                                </span>
                                <span className="text-sm font-semibold">
                                    {stats.completed_bookings} / {stats.cancelled_bookings}
                                </span>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

