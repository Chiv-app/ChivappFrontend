import sys
import re
sys.path.append('.')

path = 'src/app/(public)/musicians/[id]/opengraph-image.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

if 'export const dynamic' not in text:
    text = text.replace('export const runtime = "nodejs";', 'export const runtime = "nodejs";\nexport const dynamic = "force-dynamic";')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
