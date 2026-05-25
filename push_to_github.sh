#!/bin/bash
echo "=== Đang khôi phục file ToolHoTro.tsx từ file sạch ==="
cp src/pages/ToolHoTroTemp.tsx src/pages/ToolHoTro.tsx
rm src/pages/ToolHoTroTemp.tsx

echo "=== Đang stage các file đã thay đổi ==="
git add -A

echo "=== Đang commit thay đổi ==="
git commit -m "fix: restore ToolHoTro.tsx and fix Cloudflare build error"

echo "=== Đang push lên GitHub (nhánh main) ==="
git push origin main

echo "=== Hoàn thành đẩy code lên GitHub! ==="
