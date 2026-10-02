import sys
import re

file_path = 'src/components/auth/register-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('placeholder="correo@ejemplo.com"', 'aria-label="Correo electrónico"\n                    placeholder="correo@ejemplo.com"')
content = content.replace('placeholder="Nombre y apellido"', 'aria-label="Nombre completo"\n                            placeholder="Nombre y apellido"')
content = content.replace('placeholder="Número de celular"', 'aria-label="Número de celular"\n                            placeholder="Número de celular"')
content = content.replace('placeholder="Contraseña"', 'aria-label="Contraseña"\n                        placeholder="Contraseña"')
content = content.replace('placeholder="Confirmar contraseña"', 'aria-label="Validar contraseña"\n                        placeholder="Confirmar contraseña"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path = 'src/components/auth/login-form.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('placeholder="correo@ejemplo.com"', 'aria-label="Correo electrónico"\n                    placeholder="correo@ejemplo.com"')
content = content.replace('placeholder="Contraseña"', 'aria-label="Contraseña"\n                    placeholder="Contraseña"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
