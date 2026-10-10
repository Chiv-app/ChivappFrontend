import re
import os

files = [
    "src/app/(public)/pay/[token]/checkout-client.tsx",
    "src/components/booking/musician-create-link-form.tsx",
    "src/components/dashboard/musician-links-view.tsx"
]

for file_path in files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix error: any
    content = re.sub(r'catch \(error: any\)', 'catch (error: unknown)', content)
    content = content.replace('error.message', '(error as Error).message')
    
    # Fix quotes in TSX texts (the ones reported by lint)
    # in checkout-client.tsx
    content = content.replace('sus datos personales, la dirección del evento y pagará', 'sus datos personales, la direcci&oacute;n del evento y pagar&aacute;')
    content = content.replace('"Nueva contrata"', '&quot;Nueva contrata&quot;')
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Done")
