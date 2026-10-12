import os

p = "src/app/(public)/pay/[token]/checkout-client.tsx"
c = open(p, encoding='utf-8').read()

c = c.replace(
    'location_address: location.address,',
    'location_address: location?.address || "",'
)
c = c.replace(
    'location_city: location.city || "",',
    'location_city: location?.city || "",'
)

open(p, 'w', encoding='utf-8').write(c)
print("done")
