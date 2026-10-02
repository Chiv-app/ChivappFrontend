import sys
import re

file_path = 'src/components/auth/auth-modal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Chivapp logo icon
content = content.replace(
    '<Icon icon="lucide:music" className="text-cyan-400" />',
    '<Image src="/ico_chivapp.png" width={16} height={16} alt="Chivapp" />'
)

if 'import Image' not in content:
    content = 'import Image from "next/image";\n' + content

# Replace integrations
content = content.replace('<Icon icon="lucide:credit-card" />', '<Icon icon="logos:mercadopago-icon" width={14} />')
content = content.replace('<Icon icon="lucide:calendar" />', '<Icon icon="logos:google-calendar" width={14} />')
content = content.replace('<Icon icon="mdi:whatsapp" />', '<Icon icon="logos:whatsapp-icon" width={14} />')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
