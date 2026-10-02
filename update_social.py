import sys
import re

file_path = 'src/components/auth/social-auth-buttons.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<Button[\s\S]*?as="a"[\s\S]*?>[\s\S]*?</Button>'
replacement = '''<Button
                as="a"
                href={oauthStartUrl("google", intent)}
                variant="bordered"
                radius="md"
                size="lg"
                className="font-bold border-default-200/50 bg-content2/30 shadow-none text-foreground hover:bg-content2 transition-colors w-full"
                startContent={<Icon icon="logos:google-icon" width={18} />}
            >
                Continuar con Google
            </Button>'''

content = re.sub(pattern, replacement, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
