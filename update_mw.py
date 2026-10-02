import sys
import re

file_path = 'src/components/auth/auth-modal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="w-full max-w-md mx-auto mt-2"', 'className="w-full max-w-sm mx-auto mt-2"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
