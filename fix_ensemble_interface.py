import re
path = "src/types/api/ensemble.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("can_respond: boolean;\n};", "can_respond: boolean;\n    needs_password?: boolean;\n};")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
