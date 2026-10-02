import sys
import re

file_path = 'src/components/auth/register-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

toggle = '''<div className="flex bg-transparent border border-default-200/50 p-1 rounded-md w-full">
                    <button
                        type="button"
                        onClick={() => {
                            setRole("contractor");
                            setPasswordError("");
                            setFormAlert(null);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-sm text-xs font-semibold transition-colors ${role === "contractor" ? "bg-default-200/20 text-foreground shadow-sm" : "text-default-500 hover:text-default-700"}`}
                    >
                        <Icon icon="lucide:party-popper" /> Busco músicos
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setRole("musician");
                            setPasswordError("");
                            setFormAlert(null);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-sm text-xs font-semibold transition-colors ${role === "musician" ? "bg-default-200/20 text-foreground shadow-sm" : "text-default-500 hover:text-default-700"}`}
                    >
                        <Icon icon="lucide:music" /> Soy músico
                    </button>
                </div>'''

content = re.sub(
    r'<Tabs.*?<\/Tabs>',
    toggle,
    content,
    flags=re.DOTALL
)

# Fix inputs bg-content2/30 to bg-transparent
content = content.replace('bg-content2/30 border-default-200/50', 'bg-transparent border-default-200/50')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path = 'src/components/auth/login-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('bg-content2/30 border-default-200/50', 'bg-transparent border-default-200/50')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path = 'src/components/auth/social-auth-buttons.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('bg-content2/30', 'bg-transparent')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
