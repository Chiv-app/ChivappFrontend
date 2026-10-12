import os

p = "src/app/(public)/pay/[token]/checkout-client.tsx"
c = open(p, encoding='utf-8').read()

c = c.replace(
    'router.push(`/contractor/bookings/${res.booking_id}`);',
    'window.location.href = `/contractor/bookings/${res.booking_id}`;'
)

# Friendly error toast
old_err = """            addToast({
                title: "Error",
                description: (error as Error).message || "No se pudo procesar la solicitud",
                color: "danger"
            });"""
new_err = """            addToast({
                title: "Problema al procesar",
                description: (error as Error).message || "Ocurrió un problema inesperado. Por favor, intenta nuevamente.",
                color: "danger"
            });"""
c = c.replace(old_err, new_err)

open(p, 'w', encoding='utf-8').write(c)
print("done")
