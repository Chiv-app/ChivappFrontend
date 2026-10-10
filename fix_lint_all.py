import os
import re

files_to_fix = [
    ("src/components/home/home-view.tsx", [(r'\(error: any\)', '(error: unknown)')]),
    ("src/components/musician/ensemble-member-profile-editor.tsx", [(r'\(error: any\)', '(error: unknown)')]),
    ("src/hooks/use-mercadopago.ts", [(r'\(error: any\)', '(error: unknown)')]),
    ("src/lib/musicians.ts", [(r'\(error: any\)', '(error: unknown)')]),
    ("src/components/home/why-chivapp-view.tsx", [
        (r'el botón "Pagar ahora"', 'el botón &quot;Pagar ahora&quot;'),
        (r'el botón "Compartir"', 'el botón &quot;Compartir&quot;'),
        (r'dar "click"', 'dar &quot;click&quot;'),
        (r'en un "click"', 'en un &quot;click&quot;'),
        (r'como "Pagado"', 'como &quot;Pagado&quot;')
    ])
]

for filepath, replacements in files_to_fix:
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        for old, new in replacements:
            content = re.sub(old, new, content)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"Not found: {filepath}")
