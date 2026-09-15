"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { getAdminActivity } from "@/lib/admin";
import { formatDateTime } from "@/lib/date-utils";
import type { AdminActivityItem, BookingStatus } from "@/types/api";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/booking-labels";

const TYPE_LABEL: Record<string, string> = {
    user_registered: "Usuario",
    musician_submitted: "Músico",
    contractor_submitted: "Contratista",
    booking_updated: "Reserva",
    payment_event: "Pago",
};

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

export default function AdminActivityPage() {
    const [activity, setActivity] = useState<AdminActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            setActivity(await getAdminActivity(80));
        } catch {
            setActivity([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="Actividad de la plataforma"
                description="Usuarios nuevos, perfiles enviados, movimientos de reservas y pagos."
                actions={
                    <Button color="primary" radius="lg" onPress={load} isLoading={loading}>
                        Actualizar
                    </Button>
                }
            />

            <Card className="border border-default-200/70 shadow-soft">
                <CardBody className="p-6 gap-3">
                    {loading ? (
                        <p className="text-sm text-default-500 text-center py-8">
                            Cargando actividad…
                        </p>
                    ) : activity.length === 0 ? (
                        <p className="text-sm text-default-500 text-center py-8">
                            No hay actividad reciente.
                        </p>
                    ) : (
                        activity.map((item) => (
                            <Link
                                key={`${item.type}-${item.id}-${item.created_at}`}
                                href={item.href || "/admin/activity"}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-default-200 px-4 py-3 hover:bg-default-50 transition-colors"
                            >
                                <div className="min-w-0 flex items-start gap-3">
                                    <Chip size="sm" variant="flat" className="shrink-0">
                                        {TYPE_LABEL[item.type] ?? item.type}
                                    </Chip>
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
                                </div>
                                <span className="text-xs text-default-400 shrink-0">
                                    {formatDateTime(item.created_at)}
                                </span>
                            </Link>
                        ))
                    )}
                </CardBody>
            </Card>
        </div>
    );
}


