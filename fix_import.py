import os

p = "src/app/(public)/pay/[token]/checkout-client.tsx"
c = open(p, encoding='utf-8').read()

old_import = """import { getBooking, getBookingContract } from "@/lib/bookings";"""
new_import = """import { getBooking } from "@/lib/bookings";
import { getBookingContract } from "@/lib/contracts";"""

c = c.replace(old_import, new_import)

open(p, 'w', encoding='utf-8').write(c)
print("done")
