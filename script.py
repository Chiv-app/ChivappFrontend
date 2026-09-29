import re

with open("src/components/auth/register-form.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'import type { UserRole } from "@/types/api";',
    'import type { UserRole, RegisterRequest } from "@/types/api";'
)

with open("src/components/auth/register-form.tsx", "w", encoding="utf-8") as f:
    f.write(content)
