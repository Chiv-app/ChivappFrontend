import os

p = "src/components/booking/booking-contract-confirm-card.tsx"
c = open(p, encoding='utf-8').read()

old_code = """        if (!user?.is_verified) {
            addToast({
                title: "Cuenta no verificada","""

new_code = """        if (!user?.is_verified && !bypassVerificationCheck) {
            addToast({
                title: "Cuenta no verificada","""

c = c.replace(old_code, new_code)
open(p, 'w', encoding='utf-8').write(c)
print("done")
