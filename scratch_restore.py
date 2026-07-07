import json
import re

log_path = '/Users/linhvu/.gemini/antigravity-ide/brain/6ce18ff1-9094-421b-9a59-ca72fc07aa2c/.system_generated/logs/transcript.jsonl'

target_file = '/Users/linhvu/Desktop/APP Antigravity IDE/crm---siêu-thị/src/pages/ToolHoTro.tsx'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call['name'] in ['default_api:replace_file_content', 'default_api:multi_replace_file_content', 'default_api:write_to_file']:
                        args = call['args']
                        if isinstance(args, str):
                            args = json.loads(args)
                        
                        target = args.get('TargetFile', '')
                        if 'ToolHoTro.tsx' in target:
                            print(f"Step {data.get('step_index')}: {call['name']}")
                            # Print instruction and description
                            print(f"  Description: {args.get('Description')}")
                            print(f"  Instruction: {args.get('Instruction')}")
                            
                            # Print replacement chunks or content summary
                            if 'ReplacementChunks' in args:
                                chunks = args['ReplacementChunks']
                                if isinstance(chunks, str):
                                    chunks = json.loads(chunks)
                                print(f"  Chunks: {len(chunks)}")
                                for idx, chunk in enumerate(chunks):
                                    print(f"    Chunk {idx+1}: Lines {chunk.get('StartLine')}-{chunk.get('EndLine')}")
                                    print(f"      Target: {chunk.get('TargetContent')[:100]}...")
                                    print(f"      Replacement: {chunk.get('ReplacementContent')[:100]}...")
                            elif 'ReplacementContent' in args:
                                print(f"    Replacement Content: {args.get('ReplacementContent')[:100]}...")
                            elif 'CodeContent' in args:
                                print(f"    Code Content: {args.get('CodeContent')[:100]}...")
        except Exception as e:
            pass
