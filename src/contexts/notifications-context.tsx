"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import {
    listNotificationsPage,
    markAllNotificationsRead,
    markNotificationRead,
} from "@/lib/notifications";
import type { NotificationOut } from "@/types/api";

const POLL_INTERVAL_MS = 30_000;
const PAGE_SIZE = 50;

type NotificationsContextValue = {
    notifications: NotificationOut[];
    unreadCount: number;
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function canReceiveNotifications(role: string | undefined): boolean {
    return role === "musician" || role === "contractor" || role === "admin";
}

function sortNotifications(data: NotificationOut[]): NotificationOut[] {
    return [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

function mergeRefreshedPage(
    freshPage: NotificationOut[],
    existing: NotificationOut[],
): NotificationOut[] {
    const freshById = new Map(freshPage.map((item) => [item.id, item]));
    const merged: NotificationOut[] = [...freshPage];
    for (const item of existing) {
        if (!freshById.has(item.id)) {
            merged.push(item);
        }
    }
    return sortNotifications(merged);
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationOut[]>([]);
    const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null);
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expiredForUser, setExpiredForUser] = useState<typeof user>(null);

    const activeUserId =
        user && canReceiveNotifications(user.role) ? user.id : null;
    const sessionExpired = Boolean(activeUserId && user && expiredForUser === user);

    const refresh = useCallback(async () => {
        if (!activeUserId || sessionExpired) return;

        try {
            const { items, unreadCount } = await listNotificationsPage({
                skip: 0,
                limit: PAGE_SIZE,
            });
            setNotifications((current) => {
                if (current.length <= PAGE_SIZE) {
                    return sortNotifications(items);
                }
                return mergeRefreshedPage(items, current);
            });
            setServerUnreadCount(unreadCount);
            setHasMore((prevHasMore) => prevHasMore || items.length >= PAGE_SIZE);
            setError(null);
            setExpiredForUser(null);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setExpiredForUser(user);
                setNotifications([]);
                setServerUnreadCount(0);
                setHasMore(false);
                return;
            }
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar las notificaciones.",
            );
        } finally {
            setLoadedForUserId(activeUserId);
        }
    }, [activeUserId, sessionExpired, user]);

    const loadMore = useCallback(async () => {
        if (!activeUserId || sessionExpired || isLoadingMore || !hasMore) {
            return;
        }
        setIsLoadingMore(true);
        try {
            const { items, unreadCount } = await listNotificationsPage({
                skip: notifications.length,
                limit: PAGE_SIZE,
            });
            setNotifications((current) => {
                const seen = new Set(current.map((item) => item.id));
                const next = [...current, ...items.filter((item) => !seen.has(item.id))];
                return sortNotifications(next);
            });
            if (unreadCount !== null) {
                setServerUnreadCount(unreadCount);
            }
            setHasMore(items.length >= PAGE_SIZE);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setExpiredForUser(user);
                setNotifications([]);
                setServerUnreadCount(0);
                setHasMore(false);
            }
        } finally {
            setIsLoadingMore(false);
        }
    }, [activeUserId, sessionExpired, isLoadingMore, hasMore, notifications.length, user]);

    const markRead = useCallback(async (id: string) => {
        const updated = await markNotificationRead(id);
        const wasUnread = notifications.some((item) => item.id === id && !item.is_read);
        setNotifications((current) =>
            current.map((item) => (item.id === id ? updated : item)),
        );
        if (wasUnread && updated.is_read) {
            setServerUnreadCount((prev) =>
                prev !== null ? Math.max(0, prev - 1) : null,
            );
        }
    }, [notifications]);

    const markAllRead = useCallback(async () => {
        await markAllNotificationsRead();
        setNotifications((current) =>
            current.map((item) => (item.is_read ? item : { ...item, is_read: true })),
        );
        setServerUnreadCount(0);
    }, []);

    useEffect(() => {
        if (!activeUserId) {
            return;
        }

        let cancelled = false;

        listNotificationsPage({ skip: 0, limit: PAGE_SIZE })
            .then(({ items, unreadCount }) => {
                if (!cancelled) {
                    setNotifications(sortNotifications(items));
                    setServerUnreadCount(unreadCount);
                    setHasMore(items.length >= PAGE_SIZE);
                    setError(null);
                    setExpiredForUser(null);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    if (err instanceof ApiError && err.status === 401) {
                        setExpiredForUser(user);
                        setNotifications([]);
                        setServerUnreadCount(0);
                        setHasMore(false);
                        return;
                    }
                    setError(
                        err instanceof Error
                            ? err.message
                            : "No se pudieron cargar las notificaciones.",
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoadedForUserId(activeUserId);
            });

        return () => {
            cancelled = true;
        };
    }, [activeUserId, user]);

    useEffect(() => {
        if (!activeUserId || sessionExpired) return;

        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void refresh();
            }
        }, POLL_INTERVAL_MS);

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                void refresh();
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [refresh, activeUserId, sessionExpired]);

    const visibleNotifications = useMemo(
        () => (activeUserId && !sessionExpired ? notifications : []),
        [activeUserId, sessionExpired, notifications],
    );

    const unreadCount = useMemo(() => {
        if (!activeUserId || sessionExpired) return 0;
        const localUnread = visibleNotifications.filter((n) => !n.is_read).length;
        if (serverUnreadCount !== null) {
            return Math.max(serverUnreadCount, localUnread);
        }
        return localUnread;
    }, [activeUserId, sessionExpired, serverUnreadCount, visibleNotifications]);

    const isLoading = Boolean(activeUserId && loadedForUserId !== activeUserId);

    const value = useMemo(
        () => ({
            notifications: visibleNotifications,
            unreadCount,
            isLoading,
            isLoadingMore,
            hasMore: activeUserId && !sessionExpired ? hasMore : false,
            error: activeUserId && !sessionExpired ? error : null,
            refresh,
            loadMore,
            markRead,
            markAllRead,
        }),
        [
            visibleNotifications,
            unreadCount,
            isLoading,
            isLoadingMore,
            activeUserId,
            sessionExpired,
            hasMore,
            error,
            refresh,
            loadMore,
            markRead,
            markAllRead,
        ],
    );

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error("useNotifications must be used within NotificationsProvider");
    }
    return context;
}
