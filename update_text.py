import sys
import re

file_path = 'src/components/auth/auth-modal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the h2 flex-col so it renders on multiple lines
content = re.sub(
    r'<h2 className="text-4xl font-extrabold leading-\[1.15\] mb-5 text-white tracking-tight flex flex-wrap gap-x-2">',
    '<h2 className="text-5xl font-extrabold leading-[1.1] mb-6 text-white tracking-tight flex flex-col gap-2">',
    content
)

# And the rotating text width needs to be larger since text is bigger
content = content.replace('w-[140px]', 'w-[200px]')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
