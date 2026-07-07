import os
import json
import time

history_dirs = [
    "/Users/linhvu/Library/Application Support/Antigravity/User/History",
    "/Users/linhvu/Library/Application Support/Antigravity IDE/User/History",
    "/Users/linhvu/Library/Application Support/Code/User/History"
]

all_entries = []

for history_dir in history_dirs:
    if not os.path.exists(history_dir):
        continue
    for root, dirs, files in os.walk(history_dir):
        if "entries.json" in files:
            entries_path = os.path.join(root, "entries.json")
            try:
                with open(entries_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    resource = data.get("resource", "")
                    if "crm" in resource.lower() or "siêu-thị" in resource.lower():
                        for entry in data.get("entries", []):
                            entry_id = entry.get("id")
                            timestamp = entry.get("timestamp", 0) / 1000.0
                            file_path = os.path.join(root, entry_id)
                            if os.path.exists(file_path):
                                all_entries.append({
                                    "resource": resource,
                                    "timestamp": timestamp,
                                    "time_str": time.ctime(timestamp),
                                    "path": file_path
                                })
            except Exception as e:
                pass

all_entries.sort(key=lambda x: x["timestamp"], reverse=True)

print(f"Total entries found: {len(all_entries)}")
for entry in all_entries[:30]:
    print(f"[{entry['time_str']}] {entry['resource']} -> {entry['path']}")

