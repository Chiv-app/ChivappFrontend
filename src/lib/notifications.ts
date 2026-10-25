import { apiFetch, apiFetchWithHeaders } from "@/lib/api";
import type { NotificationOut } from "@/types/api";

function buildNotificationsQuery(params?: { skip?: number; limit?: number }): string {
    const query = new URLSearchParams();
    if (params?.skip != null && params.skip > 0) {
        query.set("skip", String(params.skip));
    }
    if (params?.limit != null) {
        query.set("limit", String(params.limit));
    }
    const qs = query.toString();
    return `/notifications/me${qs ? `?${qs}` : ""}`;
}

export function listNotifications(params?: { skip?: number; limit?: number }) {
    return apiFetch<NotificationOut[]>(buildNotificationsQuery(params));
}

export async function listNotificationsPage(params?: {
    skip?: number;
    limit?: number;
}): Promise<{ items: NotificationOut[]; unreadCount: number | null }> {
    const { data, headers } = await apiFetchWithHeaders<NotificationOut[]>(
        buildNotificationsQuery(params),
    );
    const rawHeader = headers.get("x-unread-count");
    const parsed = rawHeader != null ? Number.parseInt(rawHeader, 10) : Number.NaN;
    return {
        items: data,
        unreadCount: Number.isFinite(parsed) && parsed >= 0 ? parsed : null,
    };
}

export function markNotificationRead(id: string) {
    return apiFetch<NotificationOut>(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
    return apiFetch<{ ok: boolean; updated: number }>("/notifications/read-all", {
        method: "POST",
    });
}
