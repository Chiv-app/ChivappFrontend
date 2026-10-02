import sys
import re

file_path = 'src/components/auth/login-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change Input definitions
input_email_pattern = r'<Input[\s\S]*?label="Correo electrónico"[\s\S]*?/>'
input_email_replacement = '''<Input
                    placeholder="correo@ejemplo.com"
                    type="email"
                    variant="bordered"
                    radius="md"
                    size="lg"
                    value={email}
                    onValueChange={(val) => {
                        setEmail(val);
                        setFormAlert(null);
                    }}
                    isRequired
                    autoComplete="email"
                    startContent={<Icon icon="lucide:mail" className="text-default-400" width={18} />}
                    classNames={{
                        ...UI.authInput,
                        inputWrapper: "bg-content2/30 border-default-200/50 shadow-none"
                    }}
                />'''
content = re.sub(input_email_pattern, input_email_replacement, content)

# Password
pw_pattern = r'<PasswordInput[\s\S]*?/>'
pw_replacement = '''<PasswordInput
                    placeholder="Contraseña"
                    variant="bordered"
                    radius="md"
                    size="lg"
                    value={password}
                    onValueChange={(val) => {
                        setPassword(val);
                        setFormAlert(null);
                    }}
                    isRequired
                    autoComplete="current-password"
                    startContent={<Icon icon="lucide:lock" className="text-default-400" width={18} />}
                    classNames={{
                        ...UI.authInput,
                        inputWrapper: "bg-content2/30 border-default-200/50 shadow-none"
                    }}
                />'''

content = re.sub(pw_pattern, pw_replacement, content, count=1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
