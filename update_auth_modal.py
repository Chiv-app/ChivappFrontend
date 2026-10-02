import sys
import re

file_path = 'src/components/auth/auth-modal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the text more noticeable
content = content.replace(
    '<p className="text-base text-default-300 leading-relaxed font-medium">',
    '<p className="text-[1.05rem] text-default-200 leading-relaxed font-semibold">'
)

# Center the form vertically
content = content.replace(
    'className="flex-1 flex flex-col p-6 sm:p-10 relative"',
    'className="flex-1 flex flex-col justify-center p-6 sm:p-10 relative"'
)

# Remove mt-2
content = content.replace(
    'className="w-full max-w-sm mx-auto mt-2"',
    'className="w-full max-w-sm mx-auto"'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
