import { describe, expect, it } from "vitest";
import {
    getNotificationActionLabel,
    getNotificationHref,
    getNotificationIcon,
} from "./notification-routes";

describe("notification-routes (FE3-17)", () => {
    it("routes payment_alert notifications to /admin/payments for admins", () => {
        expect(
            getNotificationHref(
                { type: "payment_alert", meta: { booking_id: "b-123" } },
                "admin",
            ),
        ).toBe("/admin/payments");
        expect(getNotificationIcon("payment_alert")).toBe(
            "material-symbols:warning",
        );
        expect(getNotificationActionLabel("payment_alert", "admin")).toBe(
            "Conciliar pago",
        );
    });

    it("routes admin_refund_approval_requested to the specific admin booking detail", () => {
        expect(
            getNotificationHref(
                {
                    type: "admin_refund_approval_requested",
                    meta: { booking_id: "b-456" },
                },
                "admin",
            ),
        ).toBe("/admin/bookings/b-456");
    });
});
