import sys
sys.path.append('.')

path = 'src/proxy.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { middleware } from "./middleware";', 'import { proxy } from "./proxy";')
text = text.replace('middleware(req)', 'proxy(req)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
