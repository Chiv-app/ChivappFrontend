import os

p = "src/components/booking/musician-create-link-form.tsx"
c = open(p, encoding='utf-8').read()

if 'BookingLinkOut' not in c[:300]:
    c = c.replace('import { apiFetch } from "@/lib/api";', 'import { apiFetch } from "@/lib/api";\nimport { BookingLinkOut } from "@/lib/types";')
    open(p, 'w', encoding='utf-8').write(c)

print("done")
