import json
import os

log_path = os.path.expanduser('~/.gemini/antigravity-cli/brain/c58b82c9-80d7-4d54-b30c-7cc49ec9b97e/.system_generated/logs/transcript_full.jsonl')
best_content = None

with open(log_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'TOOL_RESPONSE':
                content = data.get('content', '')
                if 'Sidebar.tsx' in content and 'Total Lines:' in content:
                    # view_file response
                    lines = content.split('\n')
                    code_lines = []
                    for l in lines:
                        if ':' in l and l.split(':')[0].isdigit():
                            code_lines.append(l.split(':', 1)[1].lstrip(' '))
                    if code_lines:
                        best_content = '\n'.join(code_lines)
        except:
            pass

if best_content:
    with open('Sidebar_recovered.tsx', 'w') as f:
        f.write(best_content)
    print("Recovered from view_file, length:", len(best_content))
else:
    print("Not found in view_file")
