#!/bin/bash
# Script hỗ trợ đẩy code lên GitHub tự động từ terminal của bạn (tránh lỗi sandbox của IDE)
echo "=== Đang stage các file đã thay đổi ==="
git add -A
echo "=== Đang commit thay đổi ==="
git commit -m "feat: filter YCX data by sales conditions and fix PHÂN LOẠI YCX column classification"
echo "=== Đang push lên GitHub (nhánh main) ==="
git push origin main
echo "=== Hoàn thành đẩy code lên GitHub! ==="
