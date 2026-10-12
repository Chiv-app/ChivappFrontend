import os

p = "src/components/booking/musician-create-link-form.tsx"
c = open(p, encoding='utf-8').read()

c = c.replace('import { BookingLinkOut } from "@/lib/types";', 'import type { BookingLinkOut } from "@/lib/api";')
open(p, 'w', encoding='utf-8').write(c)

print("done")
