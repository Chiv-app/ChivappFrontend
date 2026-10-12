import os

p = "src/components/home/why-chivapp-view.tsx"
if os.path.exists(p):
    c = open(p, encoding='utf-8').read()
    c = c.replace('"Cero acoso, Cero tolerancias"', '&quot;Cero acoso, Cero tolerancias&quot;')
    open(p, 'w', encoding='utf-8').write(c)

p2 = "src/components/dashboard/musician-earnings-view.tsx"
if os.path.exists(p2):
    c2 = open(p2, encoding='utf-8').read()
    c2 = c2.replace('if (isVerified) setMainTab("debts");', 'if (isVerified) setTimeout(() => setMainTab("debts"), 0);')
    open(p2, 'w', encoding='utf-8').write(c2)
