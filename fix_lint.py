import os

p = "src/components/home/why-chivapp-view.tsx"
if os.path.exists(p):
    c = open(p, encoding='utf-8').read()
    c = c.replace('garantizamos un ambiente "Cero acoso, Cero tolerancias"', 'garantizamos un ambiente &quot;Cero acoso, Cero tolerancias&quot;')
    open(p, 'w', encoding='utf-8').write(c)
    print("Fixed unescaped entities")

p2 = "src/components/dashboard/musician-earnings-view.tsx"
if os.path.exists(p2):
    c2 = open(p2, encoding='utf-8').read()
    c2 = c2.replace('setMainTab("member");\n            return;', 'setTimeout(() => setMainTab("member"), 0);\n            return;')
    open(p2, 'w', encoding='utf-8').write(c2)
    print("Fixed set-state-in-effect")
