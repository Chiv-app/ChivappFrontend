import sys
import re

file_path = 'src/components/auth/register-form.test.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('name: "Crear cuenta"', 'name: "Crear cuenta gratis"')
# Also we need to check if they query by placeholder
content = content.replace('getByLabelText(/^Correo electr/i)', 'getByPlaceholderText("correo@ejemplo.com")')
content = content.replace('getByLabelText(/^Nombre completo$/i)', 'getByPlaceholderText("Nombre y apellido")')
content = content.replace('getByLabelText(/^Número de celular$/i)', 'getByPlaceholderText("Número de celular")')
content = content.replace('getByLabelText(/^Contraseña$/i)', 'getByPlaceholderText("Contraseña")')
content = content.replace('getByLabelText(/^Validar contraseña$/i)', 'getByPlaceholderText("Confirmar contraseña")')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path = 'src/components/auth/login-form.test.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('getByLabelText(/^Correo electr/i)', 'getByPlaceholderText("correo@ejemplo.com")')
content = content.replace('getByLabelText(/^Contraseña$/i)', 'getByPlaceholderText("Contraseña")')


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
