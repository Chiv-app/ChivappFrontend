"use client";

import Link from "next/link";
import { Button, Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import DashboardModuleCard from "@/components/dashboard/dashboard-module-card";
import {
    DashboardKpiStrip,
    DashboardModuleHeader,
} from "@/components/dashboard/dashboard-module-header";
import { formatCurrency } from "@/lib/booking-labels";
import { CONTRACTOR_MODULES } from "@/lib/dashboard-nav";

type Props = {
    isVerified: boolean;
    activeBookings?: number;
    unreadNotifications?: number;
    pendingOperations?: number;
    netOut?: number;
    retainedExpenses?: number;
};

export default function ContractorDashboardOverview({
    isVerified,
    activeBookings = 0,
    unreadNotifications = 0,
    pendingOperations = 0,
    netOut = 0,
    retainedExpenses = 0,
}: Props) {
    return (
        <div className="w-full flex flex-col gap-5">
            <DashboardModuleHeader
                title="Resumen"
                subtitle="Gestiona tus reservas, operaciones, dinero y notificaciones en un solo panel."
                actions={
                    <>
                        <Button
                            as={Link}
                            href="/contractor/operations"
                            variant="flat"
                            radius="full"
                            className="font-semibold"
                            startContent={
                                <Icon
                                    icon="material-symbols:receipt-long"
                                    width={18}
                                />
                            }
                        >
                            Ver operaciones
                        </Button>
                        <Button
                            as={Link}
                            href="/contractor/bookings"
                            color="primary"
                            radius="full"
                            className="font-bold shadow-soft"
                            startContent={
                                <Icon
                                    icon="material-symbols:event-available"
                                    width={18}
                                />
                            }
                        >
                            Ver reservas
                        </Button>
                    </>
                }
            />

            {!isVerified && (
                <Card className="border border-warning/30 bg-warning/5 shadow-soft">
                    <CardBody className="gap-3 p-5">
                        <h2 className="text-base font-bold text-foreground">
                            Verificación de identidad pendiente
                        </h2>
                        <p className="text-xs sm:text-sm text-default-500">
                            Puedes explorar músicos y solicitar reservas libremente. Sin embargo, para <b>chatear directamente</b> y <b>compartir tu ubicación</b> con los músicos, necesitas completar tu verificación de identidad.
                        </p>
                        <Link
                            href="/contractor/profile"
                            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary"
                        >
                            Completar perfil
                            <Icon icon="material-symbols:arrow-forward" width={16} height={16} />
                        </Link>
                    </CardBody>
                </Card>
            )}

            <DashboardKpiStrip
                items={[
                    {
                        key: "pending",
                        label: "Por atender",
                        value: pendingOperations,
                        dotClass: "bg-warning",
                        href: "/contractor/operations",
                    },
                    {
                        key: "active",
                        label: "Reservas activas",
                        value: activeBookings,
                        dotClass: "bg-primary",
                        href: "/contractor/bookings",
                    },
                    {
                        key: "unread",
                        label: "Sin leer",
                        value: unreadNotifications,
                        dotClass: "bg-secondary",
                        href: "/contractor/notifications",
                    },
                ]}
                summaryLabel={`Neto (${formatCurrency(retainedExpenses)} protegido):`}
                summaryValue={formatCurrency(netOut)}
                summaryHref="/contractor/operations"
            />

            <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                    Módulos principales
                </h2>
                <p className="text-sm text-default-500 mb-4">
                    Tus contrataciones, calendario y pagos protegidos en un solo lugar.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {CONTRACTOR_MODULES.map((module) => (
                        <DashboardModuleCard
                            key={module.title}
                            module={module}
                            locked={!!module.requiresVerification && !isVerified}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
