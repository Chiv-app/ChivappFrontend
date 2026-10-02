import sys

file_path = 'src/components/auth/register-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the toggle more visible
content = content.replace('bg-default-200/20 text-foreground shadow-sm', 'bg-default-200/60 text-foreground shadow-md')

# Make the button full width
content = content.replace('w-fit px-10 mt-2', 'w-full mt-2')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path = 'src/components/auth/login-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the button full width
content = content.replace('w-fit px-10 mt-2', 'w-full mt-2')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
