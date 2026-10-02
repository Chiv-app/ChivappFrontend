import sys
import re

file_path = 'src/components/auth/auth-modal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add AppLogo import
if 'import AppLogo' not in content:
    content = content.replace(
        'import LoginForm',
        'import AppLogo from "@/components/layout/app-logo";\nimport LoginForm'
    )

# Replace the Chip with AppLogo
content = re.sub(
    r'<Chip[^>]*>\s*Chivapp M.*?sica en Vivo\s*</Chip>',
    '<AppLogo height={28} className="mb-8" priority />',
    content,
    flags=re.DOTALL
)

# Replace the integrations chips
new_integrations = '''<div className="flex items-center gap-4">
                                        <div className="bg-[#0B1221] border border-white/5 rounded-lg h-9 flex items-center justify-center px-3" title="Mercadopago">
                                            <Icon icon="logos:mercadopago" height={16} />
                                        </div>
                                        <div className="bg-[#0B1221] border border-white/5 rounded-lg h-9 w-11 flex items-center justify-center" title="Google Calendar">
                                            <Icon icon="logos:google-calendar" height={20} />
                                        </div>
                                        <div className="bg-[#0B1221] border border-white/5 rounded-lg h-9 w-11 flex items-center justify-center" title="WhatsApp">
                                            <Icon icon="logos:whatsapp-icon" height={22} />
                                        </div>
                                    </div>'''

content = re.sub(
    r'<div className="flex flex-wrap gap-2">.*?</div>',
    new_integrations,
    content,
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
