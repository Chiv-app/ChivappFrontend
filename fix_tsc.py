import os
import re

# 1. Fix checkout-client.tsx
f1 = "src/app/(public)/pay/[token]/checkout-client.tsx"
if os.path.exists(f1):
    with open(f1, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('import { formatCurrency } from "@/lib/payments";', 'import { formatCurrency } from "@/lib/booking-labels";')
    # maybe it imports something else from payments too?
    content = re.sub(r'import\s+\{\s*formatCurrency(.*)\s*\}\s+from\s+"@/lib/payments";', r'import { \1 } from "@/lib/payments";\nimport { formatCurrency } from "@/lib/booking-labels";', content)
    # wait if formatCurrency was the only import:
    content = content.replace('import { formatCurrency } from "@/lib/payments";\nimport { formatCurrency } from "@/lib/booking-labels";', 'import { formatCurrency } from "@/lib/booking-labels";')
    # Let's just do a dirty replace if it's there
    content = content.replace('import { formatCurrency } from "@/lib/payments";', 'import { formatCurrency } from "@/lib/booking-labels";')
    
    with open(f1, "w", encoding="utf-8") as f:
        f.write(content)

# 2. Fix musician-links-view.tsx
f2 = "src/components/dashboard/musician-links-view.tsx"
if os.path.exists(f2):
    with open(f2, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('import { formatDateTime } from "@/lib/format";', 'import { formatDateTime } from "@/lib/date-utils";')
    with open(f2, "w", encoding="utf-8") as f:
        f.write(content)

# 3. Fix ensemble-member-profile-editor.tsx error.message
f3 = "src/components/musician/ensemble-member-profile-editor.tsx"
if os.path.exists(f3):
    with open(f3, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('error.message', '(error as Error).message')
    with open(f3, "w", encoding="utf-8") as f:
        f.write(content)

# 4. Fix use-mercadopago.ts error.message
f4 = "src/hooks/use-mercadopago.ts"
if os.path.exists(f4):
    with open(f4, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('error.message', '(error as Error).message')
    with open(f4, "w", encoding="utf-8") as f:
        f.write(content)

# 5. Fix musicians.ts error.message
f5 = "src/lib/musicians.ts"
if os.path.exists(f5):
    with open(f5, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('error.message', '(error as Error).message')
    with open(f5, "w", encoding="utf-8") as f:
        f.write(content)

print("Compilation fixes applied.")
