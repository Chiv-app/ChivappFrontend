"use client";

import Link from "next/link";
import { Card, CardBody, Chip, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import DashboardModuleCard from "@/components/dashboard/dashboard-module-card";
import { MUSICIAN_MODULES } from "@/lib/dashboard-nav";
import { formatCurrency } from "@/lib/booking-labels";
import {
    getNotificationActionLabel,
    getNotificationHref,
    getNotificationIcon,
} from "@/lib/notification-routes";
import type { NotificationOut } from "@/types/api";

type Props = {
    isVerified: boolean;
    isEnsembleMember?: boolean;
    pendingBookings?: number;
    unreadNotifications?: number;
    bookingNotifications?: NotificationOut[];
    releasedEarnings?: number;
    retainedEarnings?: number;
};

export default function MusicianDashboardOverview({
    isVerified,
    isEnsembleMember = false,
    pendingBookings = 0,
    unreadNotifications = 0,
    bookingNotifications = [],
    releasedEarnings = 0,
    retainedEarnings = 0,
}: Props) {
    const recentBookingAlerts = bookingNotifications.slice(0, 4);

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
            <section className="rounded-3xl border border-default-200/70 bg-gradient-to-br from-primary/20 via-primary/5 to-content1 px-6 py-7 overflow-hidden relative shadow-soft">
                <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative z-10 max-w-2xl">
                    <Chip color="primary" variant="flat" className="mb-3">
                        Panel de músico
                    </Chip>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                        {isVerified ? "Tu agenda y tus ingresos" : "Completa tu verificación"}
                    </h1>
                    <p className="text-default-600 mt-3">
                        {isVerified
                            ? "Atiende lo urgente, sigue tus presentaciones y controla el dinero que genera cada show."
                            : "Termina y envía tu perfil a revisión para habilitar reservas, ingresos y notificaciones."}
                    </p>
                    {isVerified ? (
                        <div className="flex flex-wrap gap-2 mt-5">
                            <Button
                                as={Link}
                                href="/musician/bookings"
                                color="primary"
                                radius="lg"
                                className="font-semibold"
                                startContent={
                                    <Icon icon="material-symbols:calendar-month" width={18} />
                                }
                            >
                                Ver reservas
                            </Button>
                            <Button
                                as={Link}
                                href="/musician/earnings"
                                variant="flat"
                                radius="lg"
                                className="font-semibold"
                                startContent={
                                    <Icon icon="material-symbols:payments" width={18} />
                                }
                            >
                                Ver ingresos
                            </Button>
                        </div>
                    ) : null}
                </div>
            </section>

            {isVerified ? (
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <Card
                        as={Link}
                        href="/musician/bookings"
                        isPressable
                        className="border border-warning/30 bg-warning/5 shadow-soft"
                    >
                        <CardBody className="gap-2 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-default-500">Por atender</p>
                                <Icon
                                    icon="material-symbols:priority-high"
                                    className="text-warning"
                                    width={18}
                                />
                            </div>
                            <p className="text-3xl font-bold text-foreground">
                                {pendingBookings}
                            </p>
                            <p className="text-xs text-default-500">
                                Solicitudes o validaciones pendientes
                            </p>
                        </CardBody>
                    </Card>
                    <Card
                        as={Link}
                        href="/musician/earnings"
                        isPressable
                        className="border border-success/30 bg-success/5 shadow-soft"
                    >
                        <CardBody className="gap-2 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-default-500">Liberado</p>
                                <Icon
                                    icon="material-symbols:account-balance-wallet"
                                    className="text-success"
                                    width={18}
                                />
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {formatCurrency(releasedEarnings)}
                            </p>
                            <p className="text-xs text-default-500">Pagos ya liberados</p>
                        </CardBody>
                    </Card>
                    <Card
                        as={Link}
                        href="/musician/earnings"
                        isPressable
                        className="border border-secondary/30 bg-secondary/5 shadow-soft"
                    >
                        <CardBody className="gap-2 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-default-500">Retenido</p>
                                <Icon
                                    icon="material-symbols:lock"
                                    className="text-secondary"
                                    width={18}
                                />
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {formatCurrency(retainedEarnings)}
                            </p>
                            <p className="text-xs text-default-500">Validado, por liberar</p>
                        </CardBody>
                    </Card>
                    <Card
                        as={Link}
                        href="/musician/notifications"
                        isPressable
                        className="border border-default-200/70 shadow-soft"
                    >
                        <CardBody className="gap-2 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-default-500">Sin leer</p>
                                <Icon
                                    icon="material-symbols:notifications"
                                    className="text-primary"
                                    width={18}
                                />
                            </div>
                            <p className="text-3xl font-bold text-foreground">
                                {unreadNotifications}
                            </p>
                            <p className="text-xs text-default-500">Notificaciones nuevas</p>
                        </CardBody>
                    </Card>
                </section>
            ) : (
                <Card className="border border-warning/30 bg-warning/5 shadow-soft">
                    <CardBody className="gap-4 p-6">
                        <h2 className="text-lg font-bold text-foreground">
                            Verificación requerida
                        </h2>
                        <p className="text-sm text-default-500">
                            Los módulos de reservas, ingresos y notificaciones se habilitarán
                            cuando un administrador apruebe tu perfil.
                        </p>
                        <Button
                            as={Link}
                            href="/musician/profile"
                            color="warning"
                            variant="flat"
                            radius="lg"
                            className="w-fit font-semibold"
                        >
                            Ir a mi perfil
                        </Button>
                    </CardBody>
                </Card>
            )}

            {isVerified && (pendingBookings > 0 || recentBookingAlerts.length > 0) ? (
                <section className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">
                                Prioridad ahora
                            </h2>
                            <p className="text-sm text-default-500 mt-1">
                                Lo que más conviene atender primero.
                            </p>
                        </div>
                        <Button
                            as={Link}
                            href="/musician/bookings"
                            variant="flat"
                            radius="lg"
                            size="sm"
                            className="font-semibold"
                        >
                            Ver agenda
                        </Button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {pendingBookings > 0 ? (
                            <Card
                                as={Link}
                                href="/musician/bookings"
                                isPressable
                                className="border border-warning/30 bg-warning/5 shadow-soft"
                            >
                                <CardBody className="flex flex-row items-center gap-4 p-5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                                        <Icon
                                            icon="material-symbols:calendar-add-on"
                                            width={22}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-foreground">
                                            {pendingBookings}{" "}
                                            {pendingBookings === 1
                                                ? "reserva requiere tu atención"
                                                : "reservas requieren tu atención"}
                                        </p>
                                        <p className="text-sm text-default-600 mt-1">
                                            Cotiza, revisa contratos o responde cambios.
                                        </p>
                                    </div>
                                    <Icon
                                        icon="material-symbols:arrow-forward"
                                        width={20}
                                        className="text-default-400 shrink-0"
                                    />
                                </CardBody>
                            </Card>
                        ) : null}

                        {recentBookingAlerts.map((notification) => {
                            const href = getNotificationHref(notification, "musician");
                            const body = (
                                <CardBody className="flex flex-row items-start gap-4 p-5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Icon
                                            icon={getNotificationIcon(notification.type)}
                                            width={20}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-foreground">
                                            {notification.title}
                                        </p>
                                        <p className="text-sm text-default-600 mt-1 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        {href ? (
                                            <p className="text-xs font-semibold text-primary mt-2">
                                                {getNotificationActionLabel(
                                                    notification.type,
                                                    "musician",
                                                )}
                                            </p>
                                        ) : null}
                                    </div>
                                    {!notification.is_read ? (
                                        <Chip size="sm" color="primary" variant="flat">
                                            Nueva
                                        </Chip>
                                    ) : null}
                                </CardBody>
                            );

                            if (href) {
                                return (
                                    <Card
                                        key={notification.id}
                                        as={Link}
                                        href={href}
                                        isPressable
                                        className={`border shadow-soft ${
                                            notification.is_read
                                                ? "border-default-200"
                                                : "border-primary/30 bg-primary/5"
                                        }`}
                                    >
                                        {body}
                                    </Card>
                                );
                            }

                            return (
                                <Card
                                    key={notification.id}
                                    className={`border shadow-soft ${
                                        notification.is_read
                                            ? "border-default-200"
                                            : "border-primary/30 bg-primary/5"
                                    }`}
                                >
                                    {body}
                                </Card>
                            );
                        })}
                    </div>
                </section>
            ) : null}

            <section>
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground">Módulos</h2>
                    <p className="text-sm text-default-500 mt-1">
                        Accesos directos a lo que usas día a día.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MUSICIAN_MODULES.map((module) => (
                                                    <DashboardModuleCard
                                key={module.title}
                                module={module}
                                locked={
                                    (!!module.requiresVerification && !isVerified) ||
                                    (isEnsembleMember && !["Reservas", "Ingresos", "Notificaciones"].includes(module.title))
                                }
                            />
                    ))}
                </div>
            </section>
        </div>
    );
}
