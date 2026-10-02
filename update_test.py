import sys

file_path = 'src/components/auth/register-form.test.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('getByRole("tab", { name: /Soy músico/i })', 'getByRole("button", { name: /Soy músico/i })')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
