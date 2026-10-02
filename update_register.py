import sys
import re

file_path = 'src/components/auth/register-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace RadioGroup import with Tabs, Tab
content = content.replace('Radio,', '')
content = content.replace('RadioGroup,', 'Tabs, Tab,')

# Replace the RadioGroup block with Tabs
radio_group_pattern = r'<RadioGroup[\s\S]*?</RadioGroup>'
tabs_replacement = '''<Tabs 
                    fullWidth 
                    size="md"
                    radius="lg"
                    selectedKey={role} 
                    onSelectionChange={(key) => {
                        setRole(key as UserRole);
                        setPasswordError("");
                        setFormAlert(null);
                    }}
                    classNames={{
                        base: "w-full",
                        tabList: "bg-content2/30 border border-default-200/50 p-1",
                        tab: "h-10",
                        cursor: "bg-content1 shadow-sm border border-default-200/50",
                        tabContent: "group-data-[selected=true]:text-foreground text-default-500 font-semibold text-xs"
                    }}
                >
                    <Tab 
                        key="contractor" 
                        title={<div className="flex items-center gap-2"><Icon icon="lucide:party-popper" width={16} /> Busco músicos</div>} 
                    />
                    <Tab 
                        key="musician" 
                        title={<div className="flex items-center gap-2"><Icon icon="lucide:music" width={16} /> Soy músico</div>} 
                    />
                </Tabs>'''

content = re.sub(radio_group_pattern, tabs_replacement, content)

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

input_name_pattern = r'<Input[\s\S]*?label="Nombre completo"[\s\S]*?/>'
input_name_replacement = '''<Input
                            placeholder="Nombre y apellido"
                            type="text"
                            variant="bordered"
                            radius="md"
                            size="lg"
                            value={fullname}
                            onValueChange={(val) => {
                                setFullname(val);
                                setFormAlert(null);
                            }}
                            isRequired
                            autoComplete="name"
                            startContent={<Icon icon="lucide:user" className="text-default-400" width={18} />}
                            classNames={{
                                ...UI.authInput,
                                inputWrapper: "bg-content2/30 border-default-200/50 shadow-none"
                            }}
                        />'''
content = re.sub(input_name_pattern, input_name_replacement, content)

input_phone_pattern = r'<Input[\s\S]*?label="Número de celular"[\s\S]*?/>'
input_phone_replacement = '''<Input
                            placeholder="Número de celular"
                            type="tel"
                            variant="bordered"
                            radius="md"
                            size="lg"
                            value={phone}
                            onValueChange={(val) => {
                                setPhone(val);
                                setFormAlert(null);
                            }}
                            isRequired
                            autoComplete="tel"
                            startContent={<Icon icon="lucide:phone" className="text-default-400" width={18} />}
                            classNames={{
                                ...UI.authInput,
                                inputWrapper: "bg-content2/30 border-default-200/50 shadow-none"
                            }}
                        />'''
content = re.sub(input_phone_pattern, input_phone_replacement, content)


# Password
pw_pattern = r'<PasswordInput[\s\S]*?/>'
# Note that PasswordInput takes label by default in its definition, let's remove label and set placeholder.
pw_replacement = '''<PasswordInput
                        placeholder="Contraseña"
                        variant="bordered"
                        radius="md"
                        size="lg"
                        value={password}
                        onValueChange={(val) => {
                            setPassword(val);
                            setPasswordError("");
                            setFormAlert(null);
                        }}
                        isRequired
                        autoComplete="new-password"
                        startContent={<Icon icon="lucide:lock" className="text-default-400" width={18} />}
                        classNames={{
                            ...UI.authInput,
                            inputWrapper: "bg-content2/30 border-default-200/50 shadow-none"
                        }}
                    />'''

grid_pw_pattern = r'<div className="grid grid-cols-1 sm:grid-cols-2 gap-2\.5">([\s\S]*?)</div>'

def repl_pw(m):
    return f'<div className="flex flex-col gap-4">\n{m.group(1)}\n</div>'

content = re.sub(grid_pw_pattern, repl_pw, content)
content = re.sub(pw_pattern, pw_replacement, content, count=1)

pw_confirm_replacement = '''<PasswordInput
                        placeholder="Confirmar contraseña"
                        variant="bordered"
                        radius="md"
                        size="lg"
                        value={confirmPassword}
                        onValueChange={(val) => {
                            setConfirmPassword(val);
                        }}
                        isRequired
                        autoComplete="new-password"
                        startContent={<Icon icon="lucide:lock" className="text-default-400" width={18} />}
                        classNames={{
                            ...UI.authInput,
                            inputWrapper: "bg-content2/30 border-default-200/50 shadow-none"
                        }}
                    />'''
content = re.sub(pw_pattern, pw_confirm_replacement, content, count=1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
