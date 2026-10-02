import re
with open('src/components/booking/booking-detail-view.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

imports = re.findall(r'import\s+.*?\s+from\s+[\'"].*?[\'"]', content)
for i in imports:
    print(i)
