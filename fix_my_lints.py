import os

# checkout-client
p1 = "src/app/(public)/pay/[token]/checkout-client.tsx"
if os.path.exists(p1):
    c1 = open(p1, encoding='utf-8').read()
    c1 = c1.replace('keys as any', 'keys as Iterable<string>')
    open(p1, 'w', encoding='utf-8').write(c1)

# link form
p2 = "src/components/booking/musician-create-link-form.tsx"
if os.path.exists(p2):
    c2 = open(p2, encoding='utf-8').read()
    c2 = c2.replace('apiFetch<any>', 'apiFetch<BookingLinkOut>')
    # check if import exists
    if 'BookingLinkOut' not in c2:
        c2 = c2.replace('import { apiFetch } from "@/lib/api";', 'import { apiFetch } from "@/lib/api";\nimport { type BookingLinkOut } from "@/lib/booking-links";')
    open(p2, 'w', encoding='utf-8').write(c2)

print("done")
