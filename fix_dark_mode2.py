import os

filepath = r'src/app/(public)/pay/[token]/checkout-client.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'bg-[#080e17]': 'bg-slate-50 dark:bg-[#080e17]',
    'text-[#dde2f0]': 'text-slate-800 dark:text-[#dde2f0]',
    'bg-[#11161d]': 'bg-white dark:bg-[#11161d]',
    'border-white/[0.03]': 'border-slate-200 dark:border-white/[0.03]',
    'border-white/[0.08]': 'border-slate-200 dark:border-white/[0.08]',
    'text-white': 'text-slate-900 dark:text-white',
    'text-slate-400': 'text-slate-500 dark:text-slate-400',
    'text-slate-300': 'text-slate-600 dark:text-slate-300',
    'text-slate-200': 'text-slate-700 dark:text-slate-200',
    'bg-[#1a1f26]': 'bg-slate-100 dark:bg-[#1a1f26]',
    'border-white/5 ': 'border-slate-200 dark:border-white/5 ',
    'border-white/5"': 'border-slate-200 dark:border-white/5"',
    'bg-[#0c1017]': 'bg-slate-200 dark:bg-[#0c1017]',
    'bg-[#161c25]/72': 'bg-white/90 dark:bg-[#161c25]/72',
    'bg-[#111824]': 'bg-slate-50 dark:bg-[#111824]',
    'bg-white/5 ': 'bg-slate-100 dark:bg-white/5 ',
    'bg-white/5"': 'bg-slate-100 dark:bg-white/5"',
    'bg-white/[0.02]': 'bg-slate-50 dark:bg-white/[0.02]',
    'bg-white/10': 'bg-slate-200 dark:bg-white/10',
    'border-white/10': 'border-slate-300 dark:border-white/10',
    'border-white/11': 'border-slate-300 dark:border-white/11',
    'border-white/20': 'border-slate-400 dark:border-white/20',
    'bg-[#0e141d]/88': 'bg-white dark:bg-[#0e141d]/88',
    'bg-black/40': 'bg-slate-100 dark:bg-black/40',
    'bg-black/30': 'bg-slate-50 dark:bg-black/30',
    'bg-black/80': 'bg-slate-100 dark:bg-black/80',
    'bg-[#0A1220]': 'bg-slate-100 dark:bg-[#0A1220]',
    'bg-[#0c1424]': 'bg-white dark:bg-[#0c1424]',
    'bg-[#141f33]': 'bg-slate-50 dark:bg-[#141f33]',
    'bg-black/50': 'bg-slate-200/50 dark:bg-black/50',
    'text-slate-950': 'text-white dark:text-slate-950',
    'bg-black/70': 'bg-white/70 dark:bg-black/70',
    'bg-black/20': 'bg-white/20 dark:bg-black/20',
    'group-hover:bg-black/10': 'group-hover:bg-white/10 dark:group-hover:bg-black/10'
}

new_content = content
for pat, rep in replacements.items():
    # Only replace if not already preceded by dark:
    # Actually simple replace, but we need to ensure we don't duplicate
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
