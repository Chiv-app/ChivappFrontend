import sys

file_path = 'src/components/auth/auth-modal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

if 'use client' in lines[1]:
    lines[1] = lines[0]
    lines[0] = '"use client";\n'

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(''.join(lines))
