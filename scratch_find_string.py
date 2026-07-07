import os

history_dirs = [
    "/Users/linhvu/Library/Application Support/Antigravity/User/History",
    "/Users/linhvu/Library/Application Support/Antigravity IDE/User/History",
    "/Users/linhvu/Library/Application Support/Code/User/History",
    "/Users/linhvu/Library/Application Support/Cursor/User/History"
]

for hdir in history_dirs:
    exists = os.path.exists(hdir)
    print(f"Path: {hdir} exists? {exists}")
    if exists:
        file_count = 0
        for root, dirs, files in os.walk(hdir):
            file_count += len(files)
        print(f"  Total files in {hdir}: {file_count}")
