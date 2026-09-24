import re

with open('src/components/dashboard/musician-members-view.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"use client";', '"use client";\n\nimport { FormEvent, useCallback, useEffect, useMemo, useState } from "react";')

with open('src/components/dashboard/musician-members-view.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
