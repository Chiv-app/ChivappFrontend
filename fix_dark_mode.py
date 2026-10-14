import re

filepath = r'src/app/(public)/pay/[token]/checkout-client.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    r'(?<!dark:)bg-\[\#080e17\]': 'bg-slate-50 dark:bg-[#080e17]',
    r'(?<!dark:)text-\[\#dde2f0\]': 'text-slate-800 dark:text-[#dde2f0]',
    r'(?<!dark:)bg-\[\#11161d\]': 'bg-white dark:bg-[#11161d]',
    r'(?<!dark:)border-white/\[0\.03\]': 'border-slate-200 dark:border-white/[0.03]',
    r'(?<!dark:)border-white/\[0\.08\]': 'border-slate-200 dark:border-white/[0.08]',
    r'(?<!dark:)text-white': 'text-slate-900 dark:text-white',
    r'(?<!dark:)text-slate-400': 'text-slate-500 dark:text-slate-400',
    r'(?<!dark:)text-slate-300': 'text-slate-600 dark:text-slate-300',
    r'(?<!dark:)text-slate-200': 'text-slate-700 dark:text-slate-200',
    r'(?<!dark:)bg-\[\#1a1f26\]': 'bg-slate-100 dark:bg-[#1a1f26]',
    r'(?<!dark:)border-white/5(?!\d)': 'border-slate-200 dark:border-white/5',
    r'(?<!dark:)bg-\[\#0c1017\]': 'bg-slate-200 dark:bg-[#0c1017]',
    r'(?<!dark:)bg-\[\#161c25\]/72': 'bg-white/90 dark:bg-[#161c25]/72',
    r'(?<!dark:)bg-\[\#111824\]': 'bg-slate-50 dark:bg-[#111824]',
    r'(?<!dark:)bg-white/5(?!\d)': 'bg-slate-100 dark:bg-white/5',
    r'(?<!dark:)bg-white/\[0\.02\]': 'bg-slate-50 dark:bg-white/[0.02]',
    r'(?<!dark:)bg-white/10': 'bg-slate-200 dark:bg-white/10',
    r'(?<!dark:)border-white/10': 'border-slate-300 dark:border-white/10',
    r'(?<!dark:)border-white/11': 'border-slate-300 dark:border-white/11',
    r'(?<!dark:)border-white/20': 'border-slate-400 dark:border-white/20',
    r'(?<!dark:)bg-\[\#0e141d\]/88': 'bg-white dark:bg-[#0e141d]/88',
    r'(?<!dark:)bg-black/40': 'bg-slate-100 dark:bg-black/40',
    r'(?<!dark:)bg-black/30': 'bg-slate-50 dark:bg-black/30',
    r'(?<!dark:)bg-black/80': 'bg-slate-100 dark:bg-black/80',
    r'(?<!dark:)bg-\[\#0A1220\]': 'bg-slate-100 dark:bg-[#0A1220]',
    r'(?<!dark:)bg-\[\#0c1424\]': 'bg-white dark:bg-[#0c1424]',
    r'(?<!dark:)bg-\[\#141f33\]': 'bg-slate-50 dark:bg-[#141f33]',
    r'(?<!dark:)bg-black/50': 'bg-slate-200/50 dark:bg-black/50',
}

new_content = content
for pat, rep in replacements.items():
    regex = r'(?<=[\s\"\'\])' + pat + r'(?=[\s\"\'\])'
    new_content = re.sub(regex, rep, new_content)

if new_content != content:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated " + filepath)
else:
    print("No changes in " + filepath)
