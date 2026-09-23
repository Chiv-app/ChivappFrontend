import os

file_path = 'src/components/booking/contract-document-view.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'contract.contractor_signed ?'
replacement = '(contract.contractor_signed || contract.contract_signed_pdf_url) ?'
content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
