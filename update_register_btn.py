import sys
import re

file_path = 'src/components/auth/register-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'<Button\s+type="submit"\s+color="primary"\s+radius="md"\s+size="lg"\s+className="font-bold shadow-glow mt-2 hover:shadow-glow-lg transition-shadow"',
    '<Button\n                    type="submit"\n                    color="primary"\n                    radius="full"\n                    size="lg"\n                    className="font-bold shadow-lg w-fit px-10 mt-2 hover:opacity-90 transition-opacity"',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
