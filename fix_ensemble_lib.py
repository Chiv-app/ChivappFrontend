import re
path = "src/lib/ensemble-members.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_respond = """export function respondBookingMemberInvite(
    token: string,
    action: "accept" | "decline",
): Promise<BookingMemberInvitePreviewOut> {"""

new_respond = """export function respondBookingMemberInvite(
    token: string,
    action: "accept" | "decline",
    password?: string,
): Promise<BookingMemberInvitePreviewOut> {"""

content = content.replace(old_respond, new_respond)

content = content.replace(
    'body: JSON.stringify({ action }),',
    'body: JSON.stringify(password ? { action, password } : { action }),'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
