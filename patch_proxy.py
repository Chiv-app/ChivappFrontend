import sys
sys.path.append('.')

path = 'src/proxy.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('export function middleware(request: NextRequest)', 'export default function proxy(request: NextRequest)')
# or just 'export function proxy(request: NextRequest)'

# The docs say: "Ensure this file has either a default or 'proxy' function export."
text = text.replace('export default function proxy', 'export function proxy') # just in case

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
