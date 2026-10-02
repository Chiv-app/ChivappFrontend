import sys
import re

file_path = 'src/components/auth/register-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I notice there's a div wrapping the password inputs: `<div className="flex flex-col gap-4">`.
# I think when I see `<div className="flex flex-col gap-4">` inside the form (which is also flex flex-col), it's redundant.
# Wait, let me replace it with `<></>` or just remove it to ensure it inherits the full width of the form correctly.
content = content.replace('                <div className="flex flex-col gap-4">\n\n                    <PasswordInput', '                    <PasswordInput')
content = content.replace('                    />\n                \n</div>', '                    />')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
