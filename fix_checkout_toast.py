import os

p = "src/app/(public)/pay/[token]/checkout-client.tsx"
c = open(p, encoding='utf-8').read()

c = c.replace(
    'description: "Te redirigiremos a la pasarela de pago...",',
    'description: "Preparando tu contrato y entorno de pago seguro...",'
)

open(p, 'w', encoding='utf-8').write(c)
print("done")
