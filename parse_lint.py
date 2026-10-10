import json
import os

with open("lint.json", "r", encoding="utf-16") as f:
    data = json.load(f)

for file in data:
    for msg in file.get("messages", []):
        if msg.get("severity") == 2: # Error
            rel_path = os.path.relpath(file['filePath'], os.getcwd())
            print(f"{rel_path}:{msg['line']}:{msg['column']} - {msg['ruleId']}")
