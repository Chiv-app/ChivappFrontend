import sys
file_path = 'src/components/auth/login-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { Button, Divider, Input, addToast, Form } from "@heroui/react";', 'import { Button, Divider, Input, addToast, Form } from "@heroui/react";\nimport { Icon } from "@iconify/react";')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
