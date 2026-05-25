import os

file_path = 'src/pages/ToolHoTro.tsx'
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

start_token = "import { STORAGE_KEYS } from './RTST/types';"
end_token = "export default function ToolHoTro() {"

start_idx = content.find(start_token)
end_idx = content.find(end_token)

if start_idx != -1 and end_idx != -1:
    before = content[:start_idx + len(start_token)]
    after = content[end_idx:]
    new_content = before + "\n\n" + after
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully fixed ToolHoTro.tsx locally!")
else:
    print("Could not find tokens in local python script:", start_idx, end_idx)
