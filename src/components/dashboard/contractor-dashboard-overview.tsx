"use client";

import Link from "next/link";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import DashboardModuleCard from "@/components/dashboard/dashboard-module-card";
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
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
            <div>
                <Chip color="primary" variant="flat" className="mb-3">
                    Panel de contratista
                </Chip>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    Tu espacio de gestión
                </h1>
                <p className="text-default-500 mt-2 max-w-2xl">
                    Gestiona tus reservas, operaciones, dinero y notificaciones en un solo panel.
                </p>
                <div className="flex flex-wrap gap-2 mt-5">
                        <Button
                            as={Link}
                            href="/contractor/bookings"
                            color="primary"
                            radius="lg"
                            className="font-semibold"
                            startContent={
                                <Icon icon="material-symbols:event-available" width={18} />
                            }
                        >
                            Ver reservas
                        </Button>
                        <Button
                            as={Link}
                            href="/contractor/operations"
                            variant="flat"
                            radius="lg"
                            className="font-semibold"
                            startContent={
                                <Icon icon="material-symbols:receipt-long" width={18} />
                            }
                        >
                            Ver operaciones
                        </Button>
                    </div>
            </div>

            
            {!isVerified && (
                <Card className="border border-warning/30 bg-warning/5 shadow-soft mb-4">
                    <CardBody className="gap-4 p-6">
                        <h2 className="text-lg font-bold text-foreground">
                            Verificación de identidad pendiente
                        </h2>
                        <p className="text-sm text-default-500">
                            Puedes explorar músicos y solicitar reservas libremente. Sin embargo, para <b>chatear directamente</b> y <b>compartir tu ubicación</b> con los músicos, necesitas completar tu verificación de identidad.
                        </p>
                        <Link
                            href="/contractor/profile"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                        >
                            Completar perfil
                            <Icon icon="material-symbols:arrow-forward" width={18} height={18} />
                        </Link>
                    </CardBody>
                </Card>
            )}
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Card
                        as={Link}
                        href="/contractor/bookings"
                        isPressable
                        className="border border-default-200/70 shadow-soft"
                    >
                        <CardBody className="gap-2 p-5">
                            <p className="text-sm text-default-500">Reservas activas</p>
                            <p className="text-3xl font-bold text-foreground">{activeBookings}</p>
                        </CardBody>
                    </Card>
                    <Card
                        as={Link}
                        href="/contractor/operations"
                        isPressable
                        className="border border-warning/30 bg-warning/5 shadow-soft"
                    >
                        <CardBody className="gap-2 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-default-500">Pendientes</p>
                                <Icon
                                    icon="material-symbols:priority"
                                    className="text-warning"
                                    width={18}
                                />
                            </div>
                            <p className="text-3xl font-bold text-foreground">
                                {pendingOperations}
                            </p>
                            <p className="text-xs text-default-500">
                                Operaciones por atender o en espera
                            </p>
                        </CardBody>
                    </Card>
                    <Card
                        as={Link}
                        href="/contractor/operations"
                        isPressable
                        className="border border-secondary/30 bg-secondary/5 shadow-soft"
                    >
                        <CardBody className="gap-2 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-default-500">Neto / retenido</p>
                                <Icon
                                    icon="material-symbols:account-balance"
                                    className="text-secondary"
                                    width={18}
                                />
                            </div>
                            <p className="text-3xl font-bold text-foreground">
                                {formatCurrency(netOut)}
                            </p>
                            <p className="text-xs text-default-500">
                                Retenido {formatCurrency(retainedExpenses)}
                            </p>
                        </CardBody>
                    </Card>
                    <Card
                        as={Link}
                        href="/contractor/notifications"
                        isPressable
                        className="border border-default-200/70 shadow-soft"
                    >
                        <CardBody className="gap-2 p-5">
                            <p className="text-sm text-default-500">Notificaciones sin leer</p>
                            <p className="text-3xl font-bold text-foreground">
                                {unreadNotifications}
                            </p>
                        </CardBody>
                    </Card>
                </div>

            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Módulos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
