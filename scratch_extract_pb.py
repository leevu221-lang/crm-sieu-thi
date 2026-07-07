import re

pb_path = '/Users/linhvu/.gemini/antigravity-ide/conversations/6ce18ff1-9094-421b-9a59-ca72fc07aa2c.pb'

try:
    with open(pb_path, 'rb') as f:
        data = f.read()
    
    print(f"Read {len(data)} bytes from pb file")
    
    # We look for a pattern that matches the top of ToolHoTro.tsx:
    # "import React, { useState, useRef, useEffect, useMemo } from 'react';"
    # and the end of the file.
    # Since it's stored in a protobuf string, it will be contiguous bytes.
    
    # Let's search for the byte sequence of: "import React, { useState, useRef, useEffect"
    search_bytes = b"import React, { useState, useRef, useEffect"
    
    indices = [m.start() for m in re.finditer(re.escape(search_bytes), data)]
    print(f"Found {len(indices)} occurrences of search pattern")
    
    for idx in indices:
        # Extract a large block from this index
        block = data[idx:idx + 300000]
        # Find where it ends (usually a null byte or non-ascii/control char, 
        # but since we want the TSX file, we can decode it as utf-8 ignore and find where the TSX structure ends)
        text = block.decode('utf-8', errors='ignore')
        
        # Let's search for the end of ToolHoTro.tsx: "export default ToolHoTro;" or "export default"
        end_match = re.search(r'export default ToolHoTro;?\s*}?\s*$', text, re.MULTILINE)
        if not end_match:
            # Let's search for just the last export
            end_match = re.search(r'export default ToolHoTro;', text)
            
        if end_match:
            end_idx = end_match.end()
            tsx_content = text[:end_idx]
            lines = tsx_content.split('\n')
            print(f"Found complete-looking file starting at index {idx} with {len(lines)} lines")
            if len(lines) > 2000:
                with open('ToolHoTro_recovered.tsx', 'w', encoding='utf-8') as out:
                    out.write(tsx_content)
                print("Successfully wrote recovered file to ToolHoTro_recovered.tsx")
                break
        else:
            print(f"No end match found for block starting at index {idx}")

except Exception as e:
    print(f"Error: {e}")
