#!/bin/bash
# Script hỗ trợ đẩy code lên GitHub tự động từ terminal của bạn (tránh lỗi sandbox của IDE)

echo "=== Đang stage các file đã thay đổi ==="
git add -A

echo "=== Đang commit thay đổi ==="
git commit -m "feat: add Phân Tích Khai Thác table and update employee health styles"

echo "=== Đang push lên GitHub (nhánh main) ==="
git push origin main

echo "=== Hoàn thành đẩy code lên GitHub! ==="
