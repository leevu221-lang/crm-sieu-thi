# ycx-auto-sync

Userscript Tampermonkey tự động đồng bộ bảng **"Điểm thưởng nhân viên"** từ BCNB
(`newinsite.thegioididong.com/office/thuong-nhan-vien`) sang các ô **"Dán dữ liệu
từ BI"** trên CRM Siêu Thị (`crm-sieu-thi.pages.dev`), khỏi phải copy/paste tay
từng nhân viên.

Script **KHÔNG** tự bấm nút Cập Nhật/Đồng Bộ trên CRM — chỉ tự điền dữ liệu vào
ô input, người dùng tự kiểm tra rồi bấm nút cuối cùng để tránh sai sót không
kiểm soát được.

## File trong project

| File | Vai trò |
|---|---|
| `ycx-auto-sync.user.js` | **Bản chính, dùng bản này.** v0.1.3 — đầy đủ nhất: xử lý autocomplete khi tìm NV, chọn khoảng ngày (kỳ Tháng trước/Hiện tại), set giá trị theo kiểu React-controlled input. |
| `ycx-auto-sync.draft-v0.1.0.user.js` | Bản nháp cũ hơn, đơn giản hơn — giữ lại để tham khảo, **không cần cài**. |

## Cài đặt

1. Cài extension [Tampermonkey](https://www.tampermonkey.net/) trên Chrome/Edge/Firefox.
2. Mở Tampermonkey → **Create a new script** → xoá hết nội dung mặc định → dán
   toàn bộ nội dung file `ycx-auto-sync.user.js` vào → Lưu (Ctrl+S).
3. Mở 2 tab: 1 tab CRM Siêu Thị (ở trang có bảng "Thưởng NV"), 1 tab BCNB
   (`newinsite.thegioididong.com/office/thuong-nhan-vien`).

## ⚠️ Tình trạng hiện tại: CHƯA TEST với DOM thật

Script được viết dựa trên ảnh chụp màn hình, không phải DOM/HTML thật, nên
nhiều chỗ selector là **dự đoán theo chữ hiển thị** (text-matching) thay vì
class/id thật của trang. Mọi chỗ như vậy được đánh dấu bằng comment
`⚠️ KIỂM TRA` trong code.

### Quy trình test an toàn (bắt buộc trước khi chạy full)

1. Trong code, để `CONFIG.DEBUG = true` và `CONFIG.TEST_SINGLE_ID = "71132"`
   (đã để sẵn) — script sẽ dừng lại và log từng bước ra Console (F12) thay vì
   chạy ồ ạt hết danh sách nhân viên.
2. Trên tab CRM, bấm nút nổi **"🎁 Auto Đồng Bộ Thưởng NV"** (script tự chèn
   góc dưới phải trang).
3. Theo dõi log ở khung nổi trên cả 2 tab (không chỉ Console — một số bản
   Tampermonkey chạy sandbox riêng khiến `console.log` không ghi vào console
   của trang).
4. Đối chiếu dữ liệu được điền vào ô "Dán dữ liệu..." với việc tự bôi đen bảng
   bên BCNB → Ctrl+C → dán Notepad — phải khớp nhau.
5. Sửa các chỗ `⚠️ KIỂM TRA` theo đúng DOM thật (thường chỉ cần đổi
   selector/text-match), lặp lại tới khi đúng với 1 người.
6. Xoá `TEST_SINGLE_ID` (để `''` hoặc `null`), chạy full, xác nhận đủ toàn bộ
   nhân viên × 2 kỳ (Tháng trước + Hiện tại) đều được điền, không sót ai.

### Nếu 1 bước nào đó sai (VD: không gõ được vào ô tìm kiếm vì nó là ô
autocomplete cần chọn từ gợi ý)

Gửi lại đoạn code liên quan + ảnh chụp DevTools (chuột phải → Inspect vào
đúng ô đó) cho Claude Code để sửa lại đúng selector.

## Cách hoạt động

Script chạy trên **cả 2 trang**, đóng 2 vai trò khác nhau, nói chuyện với
nhau qua bộ nhớ dùng chung của Tampermonkey (`GM_setValue`/`GM_getValue` +
`GM_addValueChangeListener` — như một "hộp thư" mà tab nào cũng đọc/ghi
được, không cần 2 tab mở cùng lúc vẫn hoạt động vì dữ liệu được lưu lại).

**Bên CRM Siêu Thị:**
- Tự quét trang để tìm danh sách NV (dạng "mã số - Tên NV") và ô input
  "Dán dữ liệu..." tương ứng của từng người.
- Hiện bảng điều khiển nhỏ góc màn hình: bấm để bắt đầu đồng bộ.
- Ghi danh sách NV cần lấy dữ liệu vào "hộp thư" cho tab BCNB xử lý.
- Theo dõi hộp thư, hễ có dữ liệu mới của NV nào là tự điền vào đúng ô input
  của NV đó.

**Bên BCNB:**
- Tự phát hiện có danh sách NV cần lấy trong "hộp thư".
- Lần lượt: gõ mã NV vào ô tìm kiếm → chọn gợi ý autocomplete (nếu có) →
  bấm Tìm kiếm → đợi bảng load xong → đọc bảng kết quả, chuyển thành dạng
  văn bản giống hệt như bôi đen cả bảng rồi Ctrl+C → bỏ vào "hộp thư" cho
  CRM lấy.
- Lặp lại cho từng NV trong danh sách.

## Các tuỳ chỉnh trong `CONFIG`

| Key | Ý nghĩa |
|---|---|
| `DEBUG` | Log chi tiết ra console — luôn bật khi đang test/sửa selector. |
| `TEST_SINGLE_ID` | Chỉ chạy đúng 1 mã NV này để test an toàn. Để `''`/`null` khi chạy full. |
| `AUTO_SUBMIT` | **Giữ `false`** — không tự bấm nút Cập Nhật/Đồng Bộ, người dùng tự bấm tay lần cuối. |
| `WAIT_AFTER_TYPE_MS`, `WAIT_AFTER_PICK_SUGGEST_MS`, `WAIT_AFTER_SEARCH_MS`, `WAIT_BETWEEN_EMPLOYEES_MS` | Các độ trễ chờ UI phản hồi (ms) — tăng lên nếu mạng/máy chậm và script đọc hụt dữ liệu. |
