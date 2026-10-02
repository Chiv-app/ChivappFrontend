import sys
import re

file_path = 'src/components/auth/register-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'size="md"\s*\n\s*radius="md"\s*\n\s*size="lg"', 'radius="md"\n                    size="lg"', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
