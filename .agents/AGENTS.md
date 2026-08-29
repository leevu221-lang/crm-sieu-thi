# Project Rules

- **Firebase Cost Optimization**: Minimizing Firebase Firestore read and write operations is a critical priority.
  - Consolidate configurations and related multi-date records into single document wrappers where applicable to avoid multiple read/write counts.
  - Rely on real-time listeners (`onSnapshot`) instead of active database polling.
  - Perform date, filtering, and query manipulations locally on client state or LocalStorage whenever possible.
  - Keep active heartbeats or ping signals at a minimal frequency.

- **Robust Excel Merged Cell Date Propagation**:
  - Propagate the active date string from left to right in merged column ranges using a state/tracker variable.
  - Only update the active date tracker when the cell contains a valid Date object or explicitly matches a date-like pattern (such as `\d{1,2}[\/\-]\d{1,2}`).
  - Do not use loose checks like `val.match(/\d/)` on cell values during propagation, as generic numbers or text placeholders (e.g. `0` or `"Ca 1"`) in merged ranges will corrupt date mapping.

- **JavaScript Date Construction Safety**:
  - Avoid timezone offsets and month length overflow side-effects.
  - Never construct a date with `new Date()` and then sequentially apply `.setDate(d)` and `.setMonth(m)`. Always construct Date objects with explicit arguments: `new Date(year, monthIndex, day)`.

- **Proactive Bug Fixing & Mobile Capture Quality**:
  - Luôn chủ động rà soát và fix triệt để các lỗi lặt vặt (lệch layout, responsive mobile, z-index dropdown, tràn chữ, lệch viền bảng) khi chỉnh sửa tính năng.
  - Khi chụp ảnh bảng biểu xuất file (htmlToImage/domToPng/html2canvas):
    1. **Khóa Cố Định Cột Bảng**: Luôn khai báo `<colgroup>` với độ rộng rõ ràng cho từng cột và đặt `table-layout: fixed` trên `<table>`. Thêm `truncate` / `overflow: hidden` trên các ô dữ liệu để tên dài không bao giờ làm méo hay xô lệch các cột số liệu bên phải.
    2. **Triệt Tiêu Hoàn Toàn Bóng Mờ (Zero-Shadow Export)**: Tự động gỡ bỏ toàn bộ `boxShadow`, `textShadow`, `filter` và các class `shadow-*` trong cây clone khi render ảnh để ảnh xuất trên điện thoại luôn phẳng, sắc nét 100%, không bị viền đen loang lổ.
    3. **Bọc Khung Đệm Độc Lập (`frameWrapper`)**: Đặt clone bên trong `frameWrapper` nền trắng `#ffffff` (`boxShadow: 'none'`) để dải banner tiêu đề và bảng luôn khớp khít mép 100%, không bị hở viền.
- **Đồng Bộ Song Song Laptop & Mobile (Dual-Platform Optimization)**:
  - Ứng dụng web vận hành song song trên cả Laptop (màn hình lớn desktop) và Mobile (điện thoại thông minh, màn hình cảm ứng).
  - Khi thao tác sửa bất kỳ tính năng, bảng biểu, thanh công cụ hay thành phần nào, LUÔN LUÔN chủ động tối ưu đồng bộ cả 2 giao diện:
    - **Laptop**: Tận dụng tối đa chiều rộng màn hình (`w-full max-w-none`), bố cục lưới ngang đa cột (3 bảng ngang trên `xl`), font UTM AVO sắc nét, các thao tác chuột & popover chuẩn xác.
    - **Mobile**: Responsive mượt mà, padding/margin tinh gọn (`p-1.5` đến `p-3`), cỡ chữ co giãn theo breakpoint (`text-[10.5px]` - `text-[13px]`), nút bấm cảm ứng nhạy, chống tràn ngang (`max-w-[85vw] - max-w-[90vw]`), cuộn bảng mượt mà (`overflow-x-auto`).

- **Auto-Deploy After Every Change (Cloudflare Pages)**:
  - Sau khi hoàn thành mọi thay đổi code, LUÔN LUÔN tự động deploy lên production:
    1. Build: `npx vite build`
    2. Deploy: `npx -y wrangler pages deploy dist --project-name=crm-sieu-thi --branch=main`
  - Không cần hỏi user, tự động thực hiện sau mỗi task.


