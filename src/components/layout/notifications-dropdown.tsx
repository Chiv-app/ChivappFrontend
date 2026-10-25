"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNotifications } from "@/contexts/notifications-context";
import { getNotificationsPath } from "@/lib/dashboard-nav";
import {
    getNotificationActionLabel,
    getNotificationHref,
    getNotificationIcon,
} from "@/lib/notification-routes";
import type { NotificationOut, UserRole } from "@/types/api";

function useNowMs(): number {
    const [nowMs, setNowMs] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const tick = () => {
            if (!cancelled) setNowMs(Date.now());
        };
        // Defer first paint update to avoid sync setState-in-effect lint/cascade.
        const timeoutId = window.setTimeout(tick, 0);
        const intervalId = window.setInterval(tick, 60_000);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
        };
    }, []);

    return nowMs;
}

type Props = {
    role: Extract<UserRole, "musician" | "contractor" | "admin">;
};

function formatRelativeTime(date: string, nowMs: number): string {
    const diffMs = nowMs - new Date(date).getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
}

async function handleNotificationClick(
    notification: NotificationOut,
    role: Props["role"],
    href: string | null,
    markRead: (id: string) => Promise<void>,
    router: ReturnType<typeof useRouter>,
) {
    if (!notification.is_read) {
        await markRead(notification.id).catch(() => undefined);
    }

    if (href) {
        router.push(href);
    }
}

export default function NotificationsDropdown({ role }: Props) {
    const router = useRouter();
    const nowMs = useNowMs();
    const {
        notifications,
        unreadCount,
        isLoading,
        error,
        refresh,
        markRead,
        markAllRead,
    } = useNotifications();
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const allNotificationsPath = getNotificationsPath(role);
    const recentNotifications = notifications.slice(0, 8);

    async function handleMarkAllRead() {
        setIsMarkingAll(true);
        try {
            await markAllRead();
        } catch {
            // Silently ignore in dropdown
        } finally {
            setIsMarkingAll(false);
        }
    }

    return (
        <div className="relative">
            <Popover placement="bottom-end" offset={12}>
                <PopoverTrigger>
                    <Button
                        isIconOnly
                        variant="flat"
                        radius="lg"
                        aria-label={
                            unreadCount > 0
                                ? `Notificaciones (${unreadCount} sin leer)`
                                : "Notificaciones"
                        }
                    >
                        <Icon
                            icon={
                                unreadCount > 0
                                    ? "material-symbols:notifications-active"
                                    : "material-symbols:notifications"
                            }
                            width={22}
                            height={22}
                        />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(100vw-2rem,24rem)] p-0">
                    <div className="w-full border-b border-default-200 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="font-bold text-foreground">Notificaciones</p>
                                <p className="text-xs text-default-500">
                                    {unreadCount > 0
                                        ? `${unreadCount} sin leer`
                                        : "Estás al día"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 ? (
                                    <Button
                                        size="sm"
                                        variant="light"
                                        color="primary"
                                        radius="lg"
                                        className="text-xs font-semibold h-7 px-2"
                                        isLoading={isMarkingAll}
                                        onPress={() => void handleMarkAllRead()}
                                    >
                                        Marcar todas leídas
                                    </Button>
                                ) : null}
                                {isLoading ? <Spinner size="sm" color="primary" /> : null}
                            </div>
                        </div>
                    </div>

                    <div className="max-h-80 w-full overflow-y-auto">
                        {error ? (
                            <div className="px-4 py-6 text-center">
                                <p className="text-sm text-danger mb-3">
                                    No se pudieron cargar las alertas.
                                </p>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    color="danger"
                                    radius="lg"
                                    onPress={() => void refresh()}
                                >
                                    Reintentar
                                </Button>
                            </div>
                        ) : recentNotifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-default-500">
                                No tienes notificaciones por ahora.
                            </div>
                        ) : (
                            <ul className="divide-y divide-default-100">
                                {recentNotifications.map((notification) => {
                                    const href = getNotificationHref(notification, role);
                                    const actionLabel = href
                                        ? getNotificationActionLabel(notification.type, role)
                                        : null;

                                    return (
                                        <li key={notification.id}>
                                            <button
                                                type="button"
                                                className={`w-full px-4 py-3 text-left transition-colors hover:bg-default-100 ${
                                                    notification.is_read
                                                        ? "opacity-80"
                                                        : "bg-primary/5"
                                                } ${href ? "cursor-pointer" : "cursor-default"}`}
                                                onClick={() => {
                                                    void handleNotificationClick(
                                                        notification,
                                                        role,
                                                        href,
                                                        markRead,
                                                        router,
                                                    );
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                                                        <Icon
                                                            icon={getNotificationIcon(
                                                                notification.type,
                                                            )}
                                                            width={18}
                                                            height={18}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-foreground truncate">
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-xs text-default-600 mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            <p className="text-xs text-default-500">
                                                                {nowMs
                                                                    ? formatRelativeTime(
                                                                          notification.created_at,
                                                                          nowMs,
                                                                      )
                                                                    : ""}
                                                            </p>
                                                            {actionLabel ? (
                                                                <span className="text-xs font-semibold text-primary">
                                                                    {actionLabel}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    {!notification.is_read ? (
                                                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                                    ) : null}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {allNotificationsPath ? (
                        <div className="w-full border-t border-default-200 p-3">
                            <Button
                                as={Link}
                                href={allNotificationsPath}
                                variant="flat"
                                radius="lg"
                                className="w-full font-semibold"
                                size="sm"
                            >
                                Ver todas las notificaciones
                            </Button>
                        </div>
                    ) : null}
                </PopoverContent>
            </Popover>

            {unreadCount > 0 ? (
                <span
                    aria-hidden
                    className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center"
                >
                    <span className="absolute inset-0 rounded-full bg-danger/50 animate-notification-pulse" />
                    <span className="absolute inset-0 rounded-full bg-danger/35 animate-notification-pulse [animation-delay:0.4s]" />
                    <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-bold leading-none text-danger-foreground ring-2 ring-content1 animate-notification-badge">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                </span>
            ) : null}
        </div>
    );
}
