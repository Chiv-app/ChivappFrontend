import re
path = "src/lib/ensemble-members.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_my_respond = """export function respondMyBookingMemberInvite(
    bookingId: string,
    action: "accept" | "decline",
): Promise<BookingOut> {
    return apiFetch(`/bookings/${bookingId}/member-invites/me/respond`, {
        method: "POST",
        body: JSON.stringify(password ? { action, password } : { action }),
    });
}"""

new_my_respond = """export function respondMyBookingMemberInvite(
    bookingId: string,
    action: "accept" | "decline",
): Promise<BookingOut> {
    return apiFetch(`/bookings/${bookingId}/member-invites/me/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
    });
}"""

content = content.replace(old_my_respond, new_my_respond)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
