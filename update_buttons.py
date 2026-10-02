import sys
import re

file_path = 'src/components/auth/register-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('radius="lg"', 'radius="md"\n                    size="lg"')
content = content.replace('className="font-semibold shadow-glow', 'className="font-bold shadow-glow mt-2')
content = content.replace('Crear cuenta\n                </Button>', 'Crear cuenta gratis\n                </Button>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path = 'src/components/auth/login-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('radius="lg"', 'radius="md"\n                    size="lg"')
content = content.replace('className="font-semibold shadow-glow', 'className="font-bold shadow-glow mt-2')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
