import re

p = "src/app/(public)/pay/[token]/checkout-client.tsx"
c = open(p, encoding='utf-8').read()

pattern = r'<Input[^>]*label="Direcci[^>]*exacta".*?<Input[^>]*label="Ciudad[^>]*Distrito"[^>]*/>'
new_jsx = '<LocationMapPickerField value={location} onChange={setLocation} />'

c = re.sub(pattern, new_jsx, c, flags=re.DOTALL)

open(p, 'w', encoding='utf-8').write(c)
print("done regex")
