"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardBody, Chip, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import {
    getNotificationActionLabel,
    getNotificationHref,
    getNotificationIcon,
    isBookingNotification,
} from "@/lib/notification-routes";
import { formatDateTime } from "@/lib/date-utils";
import type { UserRole } from "@/types/api";

function canManageNotifications(
    role: UserRole | undefined,
): role is Extract<UserRole, "musician" | "contractor" | "admin"> {
    return role === "musician" || role === "contractor" || role === "admin";
}

export default function NotificationsListView() {
    const router = useRouter();
    const { user } = useAuth();
    const { notifications, isLoading, error, refresh, markRead } = useNotifications();
    const [actionId, setActionId] = useState<string | null>(null);

    async function handleMarkRead(id: string) {
        setActionId(id);
        try {
            await markRead(id);
        } catch (error) {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setActionId(null);
        }
    }

    async function openNotification(id: string, href: string | null) {
        const notification = notifications.find((item) => item.id === id);
        if (!notification) return;

        setActionId(id);
        try {
            if (!notification.is_read) {
                await markRead(id);
            }
            if (href) {
                router.push(href);
            }
        } catch (error) {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Intenta de nuevo.",
                color: "danger",
            });
        } finally {
            setActionId(null);
        }
    }

    if (isLoading && notifications.length === 0) {
        return (
            <div className="max-w-3xl mx-auto h-64 rounded-4xl bg-content1 border border-default-200 animate-pulse" />
        );
    }

    const role = canManageNotifications(user?.role) ? user.role : null;
    const bookingAlerts = notifications.filter((notification) =>
        isBookingNotification(notification.type),
    );

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="rounded-4xl border border-default-200/70 bg-gradient-to-br from-primary/15 via-content1 to-content1 px-6 py-6 shadow-soft overflow-hidden relative">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    Notificaciones
                </h1>
                <p className="text-default-500 mt-2">
                    Alertas sobre verificación de perfil, reservas, cotizaciones, contratos y pagos.
                </p>
            </div>

            {error ? (
                <Card className="border border-danger/30 bg-danger/5 shadow-soft">
                    <CardBody className="gap-3 p-5">
                        <p className="font-semibold text-foreground">
                            No se pudieron cargar las notificaciones
                        </p>
                        <p className="text-sm text-default-600">{error}</p>
                        <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            radius="lg"
                            className="w-fit"
                            onPress={() => void refresh()}
                        >
                            Reintentar
                        </Button>
                    </CardBody>
                </Card>
            ) : null}

            {role && bookingAlerts.length > 0 ? (
                <Card className="border border-primary/20 bg-primary/5 shadow-soft">
                    <CardBody className="gap-2 p-5">
                        <p className="text-sm font-semibold text-foreground">
                            {role === "musician"
                                ? "Solicitudes y reservas"
                                : "Tus reservas activas"}
                        </p>
                        <p className="text-sm text-default-600">
                            {bookingAlerts.length}{" "}
                            {bookingAlerts.length === 1 ? "alerta" : "alertas"} relacionadas con
                            reservas. Abre cada una para ver el detalle.
                        </p>
                    </CardBody>
                </Card>
            ) : null}

            {!error && notifications.length === 0 ? (
                <Card className="border border-default-200/70 shadow-soft">
                    <CardBody className="p-8 text-center text-default-500">
                        No tienes notificaciones por ahora.
                    </CardBody>
                </Card>
            ) : !error ? (
                <div className="flex flex-col gap-3">
                    {notifications.map((notification) => {
                        const href = role ? getNotificationHref(notification, role) : null;
                        const actionLabel = role
                            ? getNotificationActionLabel(notification.type, role)
                            : "Ver detalle";

                        return (
                            <Card
                                key={notification.id}
                                className={`border shadow-soft ${
                                    notification.is_read
                                        ? "border-default-200"
                                        : "border-primary/30 bg-primary/5"
                                }`}
                            >
                                <CardBody className="gap-3 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <Icon
                                                    icon={getNotificationIcon(notification.type)}
                                                    width={20}
                                                    height={20}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="font-bold text-foreground">
                                                    {notification.title}
                                                </h2>
                                                <p className="text-sm text-default-600 mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-default-400 mt-2">
                                                    {formatDateTime(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        {!notification.is_read ? (
                                            <Chip size="sm" color="primary" variant="flat">
                                                Nueva
                                            </Chip>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {href ? (
                                            <Button
                                                size="sm"
                                                color="primary"
                                                variant="flat"
                                                radius="lg"
                                                isLoading={actionId === notification.id}
                                                onPress={() =>
                                                    void openNotification(notification.id, href)
                                                }
                                            >
                                                {actionLabel}
                                            </Button>
                                        ) : null}
                                        {!notification.is_read ? (
                                            <Button
                                                size="sm"
                                                variant="bordered"
                                                radius="lg"
                                                isLoading={actionId === notification.id}
                                                onPress={() =>
                                                    handleMarkRead(notification.id)
                                                }
                                            >
                                                Marcar como leída
                                            </Button>
                                        ) : null}
                                    </div>
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

