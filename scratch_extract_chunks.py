import json
import os

log_path = '/Users/linhvu/.gemini/antigravity-ide/brain/6ce18ff1-9094-421b-9a59-ca72fc07aa2c/.system_generated/logs/transcript.jsonl'
output_dir = 'scratch_extracted_chunks'
os.makedirs(output_dir, exist_ok=True)

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index', 0)
            
            # Check tool calls
            for call in data.get('tool_calls', []):
                args = call.get('args', {})
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except:
                        pass
                if isinstance(args, dict) and 'ToolHoTro.tsx' in str(args.get('TargetFile', '')) or 'ToolHoTro.tsx' in str(args.get('AbsolutePath', '')):
                    with open(os.path.join(output_dir, f'step_{step}_request.json'), 'w', encoding='utf-8') as out:
                        json.dump(call, out, indent=2, ensure_ascii=False)
            
            # Check step content / response
            content = data.get('content', '')
            if 'ToolHoTro.tsx' in content:
                with open(os.path.join(output_dir, f'step_{step}_response.txt'), 'w', encoding='utf-8') as out:
                    out.write(content)
        except Exception as e:
            pass

print(f"Done extracting chunks to {output_dir}")
