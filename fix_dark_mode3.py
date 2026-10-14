import os

filepath = r'src/app/(public)/pay/[token]/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'bg-[#080e17]': 'bg-slate-50 dark:bg-[#080e17]',
    'text-white': 'text-slate-900 dark:text-white',
    'bg-[#161c25]/72': 'bg-white/90 dark:bg-[#161c25]/72',
    'border-white/10': 'border-slate-300 dark:border-white/10',
    'text-slate-400': 'text-slate-500 dark:text-slate-400',
    'bg-default-50': 'bg-slate-50 dark:bg-default-50',
    'bg-white ': 'bg-white dark:bg-content1 ',
    'text-default-500': 'text-slate-500 dark:text-default-500',
    'bg-primary px-4': 'bg-primary px-4'
}

new_content = content
for pat, rep in replacements.items():
    parts = new_content.split(pat)
    assembled = parts[0]
    for i in range(1, len(parts)):
        if assembled.endswith('dark:'):
            assembled += pat + parts[i]
        else:
            assembled += rep + parts[i]
    new_content = assembled

if new_content != content:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated " + filepath)
else:
    print("No changes in " + filepath)
