import json

log_path = '/Users/linhvu/.gemini/antigravity-ide/brain/6ce18ff1-9094-421b-9a59-ca72fc07aa2c/.system_generated/logs/transcript.jsonl'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if 'in-dia-chi' in content or 'in-phieu-bh' in content:
                print(f"Step {data.get('step_index')}: {data.get('type')}")
                if 'tool_calls' in data:
                    for call in data['tool_calls']:
                        if 'ToolHoTro.tsx' in str(call.get('args', '')):
                            print(f"  Tool: {call['name']}")
                            args = call['args']
                            if isinstance(args, str):
                                args = json.loads(args)
                            print(f"  Target: {args.get('TargetFile')}")
                            # Let's print replacement content or chunks keys
                            if 'ReplacementContent' in args:
                                print(f"  ReplacementContent length: {len(args['ReplacementContent'])}")
                            if 'ReplacementChunks' in args:
                                print(f"  ReplacementChunks: {len(args['ReplacementChunks'])}")
        except Exception as e:
            pass
