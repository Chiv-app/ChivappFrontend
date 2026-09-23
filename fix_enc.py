import os

def fix_encoding(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if not file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.py')):
                continue
            path = os.path.join(root, file)
            # Try to read as utf-8
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    f.read()
            except UnicodeDecodeError:
                # It's not utf-8. Read as cp1252 and save as utf-8
                print(f"Fixing encoding for {path}")
                with open(path, 'r', encoding='windows-1252') as f:
                    content = f.read()
                with open(path, 'w', encoding='utf-8', newline='\n') as f:
                    f.write(content)

fix_encoding('src')
