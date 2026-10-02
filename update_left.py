import sys
import re

file_path = 'src/components/auth/auth-modal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure AppLogo is imported
if 'import AppLogo' not in content:
    content = content.replace('import Image from "next/image";', 'import Image from "next/image";\nimport AppLogo from "@/components/layout/app-logo";')

# Replace the Chip completely
content = re.sub(r'<Chip[\s\S]*?Chivapp M.*?sica en Vivo[\s\S]*?<\/Chip>', '<AppLogo height={32} className="mb-8" color="white" priority />', content)

# Center the text block in the left column.
# The current div is: <div className="relative z-10">
content = content.replace('<div className="relative z-10">', '<div className="relative z-10 flex-1 flex flex-col justify-center">')

# Modify integrations to remove cards
integrations_old = r'<div className="flex items-center gap-4">.*?</div>\s*</div>\s*</div>'
integrations_new = '''<div className="flex items-center gap-6">
                                        <Icon icon="logos:mercadopago" height={20} />
                                        <Icon icon="logos:google-calendar" height={22} />
                                        <Icon icon="logos:whatsapp-icon" height={24} />
                                    </div>
                                </div>
                            </div>'''
content = re.sub(integrations_old, integrations_new, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
