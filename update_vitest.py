import sys
import os

file_path = 'vitest.setup.ts'
content = ''
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

mock = '''
if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
'''
if 'ResizeObserver' not in content:
    content += mock

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
