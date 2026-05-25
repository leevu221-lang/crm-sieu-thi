import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, Printer, Trash2, Info, Archive, ShieldAlert, FilePlus, 
  ChevronDown, CheckCircle2, Save, Loader2, Calendar, ArrowUpDown, 
  SortAsc, SortDesc, PieChart, Users, UploadCloud, Settings, 
  ChevronRight, LayoutGrid, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import StickerPrintModal from '../components/StickerPrintModal';
import PrintLayoutModal from '../components/PrintLayoutModal';
import PhanCaTable from '../components/PhanCaTable';
import PhanCaTuanTable from '../components/PhanCaTuanTable';
import BienBanTinhTrangHangHoa from '../components/BienBanTinhTrangHangHoa';

import { STORAGE_KEYS } from './RTST/types';

const DEFAULT_CONTRACT_TEMPLATE = `<div style="text-align: center; margin-bottom: 12px;"><h2 style="font-size: 18px; font-weight: bold; margin: 0 0 3px 0; text-transform: uppercase; text-align: center; line-height: 1.2;">HỢP ĐỒNG MUA BÁN</h2><div style="font-size: 14px; font-weight: bold; margin: 0 0 6px 0; text-align: center; line-height: 1.2;">Số./No.: {{Số hợp đồng}}/KD-TGDD/HĐMB</div><div style="font-size: 14px; font-style: italic; margin: 0; text-align: center; line-height: 1.2;">Hôm nay, ngày {{Ngày ký}} / {{Tháng ký}} /2026 (“Ngày Ký”), chúng tôi gồm có:</div></div>

<table style="width: 100%; border-collapse: collapse; border: 1.5px solid black; margin-bottom: 10px; font-size: 13px;">
  <tr>
    <td colspan="3" style="border: 1px solid black; padding: 4px 6px; font-weight: bold; background-color: #f3f4f6; text-transform: uppercase;">BÊN MUA (BÊN A): CHI NHÁNH PHÍA NAM - TỔNG CÔNG TY XÂY DỰNG TRƯỜNG SƠN</td>
  </tr>
  <tr>
    <td style="width: 25%; border: 1px solid black; padding: 4px 6px; font-weight: bold;">Trụ sở đăng ký</td>
    <td style="width: 2%; border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Trụ sở đăng ký Bên A}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Mã số thuế</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Mã số thuế Bên A}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Điện thoại – Fax</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Điện thoại Bên A}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Số tài khoản</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Số tài khoản Bên A}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Tại ngân hàng</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Ngân hàng Bên A}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Đại diện bởi</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Đại diện Bên A}} - Chức vụ: {{Chức vụ Bên A}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold; height: 20px;"></td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;"></td>
  </tr>
</table>

<table style="width: 100%; border-collapse: collapse; border: 1.5px solid black; margin-bottom: 10px; font-size: 13px;">
  <tr>
    <td colspan="3" style="border: 1px solid black; padding: 4px 6px; font-weight: bold; background-color: #f3f4f6; text-transform: uppercase;">BÊN BÁN (BÊN B): CHI NHÁNH CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH</td>
  </tr>
  <tr>
    <td style="width: 25%; border: 1px solid black; padding: 4px 6px; font-weight: bold;">Trụ sở đăng ký</td>
    <td style="width: 2%; border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Trụ sở đăng ký Bên B}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Văn phòng điều hành</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Văn phòng điều hành Bên B}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Mã số thuế</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Mã số thuế Bên B}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Điện thoại – Fax</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Điện thoại Bên B}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Số tài khoản</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Số tài khoản Bên B}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Tại ngân hàng</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px;">{{Ngân hàng Bên B}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Đại diện bởi</td>
    <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">:</td>
    <td style="border: 1px solid black; padding: 4px 6px; line-height: 1.4;">{{Đại diện Bên B}}<br/>Chức vụ: {{Chức vụ Bên B}}<br/>(Theo giấy ủy quyền số {{Số ủy quyền Bên B}} ký ngày {{Ngày ủy quyền Bên B}})</td>
  </tr>
</table>

<p style="margin-top: 8px; margin-bottom: 8px; text-align: justify;">Sau khi bàn bạc, hai bên thống nhất ký kết Hợp Đồng Mua Bán này (“Hợp Đồng”) với các điều khoản sau:</p>

<h3 style="font-size: 14px; font-weight: bold; margin-top: 8px; margin-bottom: 4px;">ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</h3>
<p style="margin-bottom: 6px; text-align: justify;">1.1 Bên B đồng ý bán và Bên A đồng ý mua sản phẩm của Bên B với chủng loại, tính năng kỹ thuật và giá cả cụ thể như sau (Sau đây gọi tắt là “Sản Phẩm”):</p>

<table style="width: 100%; border-collapse: collapse; border: 1.5px solid black; margin-bottom: 10px; font-size: 13px;">
  <thead>
    <tr style="background-color: #f3f4f6;">
      <th style="border: 1px solid black; padding: 4px 6px; text-align: center; width: 8%;">STT/NO.</th>
      <th style="border: 1px solid black; padding: 4px 6px; text-align: left;">Mô tả hàng hóa</th>
      <th style="border: 1px solid black; padding: 4px 6px; text-align: center; width: 12%;">Số lượng</th>
      <th style="border: 1px solid black; padding: 4px 6px; text-align: right; width: 20%;">Đơn giá (VND)</th>
      <th style="border: 1px solid black; padding: 4px 6px; text-align: right; width: 20%;">Thành tiền (VND)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">01</td>
      <td style="border: 1px solid black; padding: 4px 6px;">{{Mô tả hàng hóa 1}}</td>
      <td style="border: 1px solid black; padding: 4px 6px; text-align: center; font-weight: bold;">{{Số lượng 1}}</td>
      <td style="border: 1px solid black; padding: 4px 6px; text-align: right; font-weight: bold;">{{Đơn giá 1}}</td>
      <td style="border: 1px solid black; padding: 4px 6px; text-align: right; font-weight: bold;">{{Thành tiền 1}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid black; padding: 4px 6px; text-align: center;">02</td>
      <td style="border: 1px solid black; padding: 4px 6px;">{{Mô tả hàng hóa 2}}</td>
      <td style="border: 1px solid black; padding: 4px 6px; text-align: center; font-weight: bold;">{{Số lượng 2}}</td>
      <td style="border: 1px solid black; padding: 4px 6px; text-align: right; font-weight: bold;">{{Đơn giá 2}}</td>
      <td style="border: 1px solid black; padding: 4px 6px; text-align: right; font-weight: bold;">{{Thành tiền 2}}</td>
    </tr>
    <tr>
      <td colspan="3" style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Tổng tiền (chưa thuế) : {{Tổng tiền chưa thuế}} vnd</td>
      <td style="border: 1px solid black; padding: 4px 6px;"></td>
      <td style="border: 1px solid black; padding: 4px 6px;"></td>
    </tr>
    <tr>
      <td colspan="3" style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Thuế giá trị gia tăng : {{Thuế VAT}} vnd</td>
      <td style="border: 1px solid black; padding: 4px 6px;"></td>
      <td style="border: 1px solid black; padding: 4px 6px;"></td>
    </tr>
    <tr>
      <td colspan="3" style="border: 1px solid black; padding: 4px 6px; font-weight: bold;">Tổng tiền (đã bao gồm VAT) : {{Tổng tiền gồm VAT}} vnd</td>
      <td style="border: 1px solid black; padding: 4px 6px;"></td>
      <td style="border: 1px solid black; padding: 4px 6px;"></td>
    </tr>
  </tbody>
</table>

<div style="position: absolute; bottom: 10mm; left: 20mm; right: 15mm; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; border-top: 1px solid #cbd5e1; padding-top: 5px;">
  <div>Pháp Chế_111124_TGDD_VN</div>
  <div>1</div>
</div>
<!-- pagebreak -->
<p style="margin-bottom: 15px; font-weight: bold; color: red;">Tổng giá bằng chữ: {{Tổng giá bằng chữ}}.</p>

<p style="margin-bottom: 10px; text-align: justify;">1.2 Tổng tiền mà Bên A phải thanh toán cho Bên B theo quy định tại Điều 1.1 (“Giá Sản Phẩm”) là chi phí cố định không thay đổi trong suốt quá trình thực hiện Hợp đồng và chưa bao gồm phần chi phí vật tư và/hoặc các chi phí khác phát sinh khi lắp đặt (nếu có). Các chi phí phát sinh này được quy định tại website: https://www.dienmayxanh.com/kinh-nghiem-hay/chinh-sach-giao-hang-lap-dat-1261528 vào thời điểm lắp đặt.</p>
<p style="margin-bottom: 10px; text-align: justify;">1.3 Giá Sản Phẩm được Bên A thanh toán cho Bên B theo quy định tại Điều 3 Hợp Đồng này. Chi phí vật tư và/hoặc chi phí khác phát sinh khi lắp đặt sẽ được thanh toán bằng tiền mặt/chuyển khoản ngay khi Bên B lắp đặt cho Bên A hoàn tất.</p>
<p style="margin-bottom: 10px; text-align: justify;">1.4 Trường hợp Sản Phẩm cần lắp đặt thì Bên A chịu trách nhiệm chuẩn bị các thiết bị sau và điểm chờ đấu nối cụ thể:</p>
<p style="margin-bottom: 5px; margin-left: 20px; text-align: justify;">a. Điểm lắp đặt cao trên 4m (tính từ sàn) thì Bên A tự chuẩn bị thang phù hợp hoặc giàn giáo.</p>
<p style="margin-bottom: 15px; margin-left: 20px; text-align: justify;">b. Liên quan đến thiết bị cần cấp và thoát nước, Bên A cần phải có ống âm chờ cấp vào máy và ra các thiết bị sẵn tại vị trí lắp máy (Đầu chờ nước cấp, đầu ra nóng, Bộ pha nước ra nóng lạnh, ống thoát nước, v.v.).</p>

<div style="position: absolute; bottom: 10mm; left: 20mm; right: 15mm; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; border-top: 1px solid #cbd5e1; padding-top: 5px;">
  <div>Pháp Chế_111124_TGDD_VN</div>
  <div>2</div>
</div>
<!-- pagebreak -->
<h3 style="font-size: 14px; font-weight: bold; margin-top: 10px; margin-bottom: 5px;">ĐIỀU 2: THỜI GIAN VÀ ĐỊA ĐIỂM GIAO HÀNG</h3>
<p style="margin-bottom: 10px; text-align: justify;">2.1 Thời gian giao hàng: Bên B thực hiện giao Hàng hóa trong vòng ba (03) kể từ ngày Bên B được Ngân hàng báo có đúng, đầy đủ Giá Sản Phẩm vào tài khoản ngân hàng của Bên B. Trường hợp ngày Ngân hàng báo có rơi vào thứ bảy, chủ nhật hoặc ngày nghỉ Lễ, Tết theo quy định pháp luật thì thời hạn bắt đầu được tính từ ngày làm việc tiếp theo hoặc theo thông báo của Bên B (tùy trường hợp).</p>
<p style="margin-bottom: 15px; text-align: justify;">2.2 Địa điểm giao hàng: <span style="background-color: yellow; font-weight: bold;">Tại địa chỉ: {{Địa điểm giao hàng}}</span></p>

<h3 style="font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">ĐIỀU 3: THANH TOÁN</h3>
<p style="margin-bottom: 10px; text-align: justify;">3.1 Bên A sẽ thanh toán 100% Giá Sản Phẩm cho Bên B bằng các chuyển khoản vào tài khoản ngân hàng của Bên B sau khi Hợp Đồng được ký kết. Thông tin tài khoản ngân hàng của Bên B:</p>
<ul style="margin-bottom: 10px; margin-left: 20px; list-style-type: disc;">
  <li>Chủ tài khoản: <strong>{{Chủ tài khoản ngân hàng Bên B}}</strong></li>
  <li>Số tài khoản: <strong>{{Số tài khoản ngân hàng Bên B}}</strong></li>
  <li>Tại ngân hàng: <strong>{{Ngân hàng giao dịch Bên B}}</strong></li>
  <li>Địa chỉ ngân hàng: <strong>{{Địa chỉ ngân hàng Bên B}}</strong></li>
</ul>
<p style="margin-bottom: 10px; text-align: justify;">3.2 Xuất hóa đơn:</p>
<p style="margin-bottom: 5px; margin-left: 20px; text-align: justify;">a. Giao hàng khu vực Hồ Chí Minh: Bên B trực tiếp giao hàng và xuất hóa đơn cho Bên A</p>
<p style="margin-bottom: 15px; margin-left: 20px; text-align: justify;">b. Giao hàng ở tỉnh: Bên B ủy quyền cho Chi nhánh của Bên B tại các tỉnh giao hàng và xuất hóa đơn cho Bên A.</p>

<h3 style="font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">ĐIỀU 4: CHÍNH SÁCH BẢO HÀNH, ĐỔI, TRẢ SẢN PHẨM VÀ HOÀN TIỀN</h3>
<p style="margin-bottom: 10px; text-align: justify;">4.1 Sản Phẩm do Bên B cung cấp sẽ được bảo hành theo tiêu chuẩn của nhà sản xuất hoặc nhà phân phối. Sản phẩm sẽ được kích hoạt bảo hành ngay tại thời điểm Bên B xuất hóa đơn VAT cho Bên A.</p>
<p style="margin-bottom: 10px; text-align: justify;">4.2 Chính sách bảo hành của nhà sản xuất hoặc nhà phân phối được đính kèm theo sản phẩm hoặc có thể tham khảo tại website của nhà sản xuất hoặc nhà phân phối;</p>
<p style="margin-bottom: 10px; text-align: justify;">4.3 Nếu sản phẩm có áp dụng chính sách đổi trả hoặc hoàn tiền của Bên B vui lòng xem chính sách tại website https://www.dienmayxanh.com/bao-hanh-doi-tra (hoặc https://www.thegioididong.com/chinh-sach-bao-hanh-san-pham áp dụng tùy từng loại sản phẩm). Bên B bảo lưu quyền thay đổi các chính sách này tại từng thời điểm và không cần sự chấp thuận của Bên A.</p>

<div style="position: absolute; bottom: 10mm; left: 20mm; right: 15mm; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; border-top: 1px solid #cbd5e1; padding-top: 5px;">
  <div>Pháp Chế_111124_TGDD_VN</div>
  <div>3</div>
</div>
<!-- pagebreak -->
<p style="margin-bottom: 15px; text-align: justify;">4.4 Cho mục đích bảo hành hoặc khiếu nại về Sản Phẩm Bên A liên hệ số điện thoại như được công khai tại website https://www.dienmayxanh.com/ hoặc https://www.thegioididong.com/.</p>

<h3 style="font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">ĐIỀU 5: NGHĨA VỤ CÁC BÊN</h3>
<p style="margin-bottom: 5px; font-weight: bold;">5.1 Nghĩa vụ của Bên A:</p>
<p style="margin-bottom: 5px; margin-left: 20px; text-align: justify;">a. Cam kết không tiết lộ cho bên thứ ba bất kỳ thông tin nào có liên quan đến việc thực hiện Hợp đồng này.</p>
<p style="margin-bottom: 5px; margin-left: 20px; text-align: justify;">b. Thanh toán cho Bên A Giá Sản Phẩm và chi phí vật tư đúng và đầy đủ theo quy định Hợp Đồng này.</p>
<p style="margin-bottom: 5px; margin-left: 20px; text-align: justify;">c. Bên A đồng ý với chính sách thu thập thông tin và xử lý dữ liệu của Bên B theo các điều khoản và điều kiện đã được quy định tại website https://www.dienmayxanh.com/ hoặc https://www.thegioididong.com/</p>
<p style="margin-bottom: 10px; margin-left: 20px; text-align: justify;">d. Thực đúng các cam kết được ghi trong Hợp Đồng này.</p>
<p style="margin-bottom: 5px; font-weight: bold;">5.2 Nghĩa vụ của Bên B:</p>
<p style="margin-bottom: 5px; margin-left: 20px; text-align: justify;">a. Đảm bảo cung cấp Sản Phẩm mới 100%, đúng với quy cách, giá cả, thời gian giao hàng theo cam kết tại Điều 1 and Điều 2 Hợp Đồng này.</p>
<p style="margin-bottom: 5px; margin-left: 20px; text-align: justify;">b. Cam kết không tiết lộ cho bên thứ ba bất kỳ thông tin nào có liên quan đến việc thực hiện Hợp đồng này.</p>
<p style="margin-bottom: 15px; margin-left: 20px; text-align: justify;">c. Thực hiện đúng các cam kết được ghi trong Hợp Đồng này.</p>

<h3 style="font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">ĐIỀU 6: THỜI HẠN CHẤM DỨT HỢP ĐỒNG</h3>
<p style="margin-bottom: 10px; text-align: justify;">Hợp Đồng này tự động chấm dứt trong trường hợp sau:</p>
<p style="margin-bottom: 10px; text-align: justify;">6.1 Bên A không thực hiện nghĩa vụ thanh toán trong vòng 10 (mười) ngày làm việc kể từ Ngày Ký thì xem như Bên A không có nhu cầu mua hàng và Bên B không có nghĩa vụ giữ giá, hàng hóa cho Bên A. Khi đó, Hợp Đồng tự động chấm dứt. Trường hợp Bên A tiếp tục mua hàng thì Hai Bên phải ký lại Hợp Đồng mới; hoặc</p>
<p style="margin-bottom: 15px; text-align: justify;">6.2 Bên A đã thực hiện nghĩa vụ thanh toán; Hợp đồng được tự động chấm dứt sau khi Hai Bên hoàn thành các nghĩa vụ quy định tại Hợp Đồng. Riêng các điều khoản về bảo hành vẫn có hiệu lực cho đến khi hết thời hạn bảo hành theo quy định của nhà sản xuất hoặc nhà phân phối.</p>

<h3 style="font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">ĐIỀU 7: CAM KẾT CHỐNG THAM NHŨNG</h3>
<p style="margin-bottom: 10px; text-align: justify;">7.1 Các bên cam kết tuân thủ luật pháp chống tham nhũng, không tham gia bất kỳ hành vi hối lộ, gian lận, tặng quà hoặc gợi ý tặng quà dưới bất kỳ hình thức nào cho nhân viên của bên kia nhằm đạt được lợi ích quá trình thực hiện hợp đồng. Nếu phát hiện vi phạm, bên bị vi phạm có quyền chấm dứt hợp đồng ngay lập tức, và bên vi phạm phải bồi thường mọi thiệt hại phát sinh.</p>
<p style="margin-bottom: 15px; text-align: justify;">7.2 Bên Mua chỉ thanh toán số tiền đã được các bên thống nhất trong hợp đồng hoặc các văn bản thanh toán liên quan. Bên Mua chỉ thanh toán vào tài khoản của Bên Bán như trên và không được thanh toán vào bất kỳ tài khoản cá nhân/tổ chức nào khác.</p>

<h3 style="font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">ĐIỀU 8: CAM KẾT CHUNG</h3>
<p style="margin-bottom: 10px; text-align: justify;">8.1 Hai Bên cam kết thực hiện đúng những điều ghi trên Hợp Đồng này. Mọi sự thay đổi trong Hợp Đồng này phải lập phụ lục hợp đồng và phải có chữ ký xác nhận của Hai Bên. Nếu một trong Hai Bên cố ý vi phạm các điều khoản của Hợp Đồng này sẽ phải chịu trách nhiệm về các hành vi vi phạm đó.</p>

<h3 style="font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">ĐIỀU 8: CAM KẾT CHUNG</h3>
<p style="margin-bottom: 10px; text-align: justify;">8.1 Hai Bên cam kết thực hiện đúng những điều ghi trên Hợp Đồng này. Mọi sự thay đổi trong Hợp Đồng này phải lập phụ lục hợp đồng và phải có chữ ký xác nhận của Hai Bên. Nếu một trong Hai Bên cố ý vi phạm các điều khoản của Hợp Đồng này sẽ phải chịu trách nhiệm về các hành vi vi phạm đó.</p>
<p style="margin-bottom: 10px; text-align: justify;">8.2 Trong trường hợp xảy ra tranh chấp, hai bên cố gắng cùng nhau bàn bạc các biện pháp giải quyết trên tinh thần hòa giải, có thiện chí và hợp tác. Nếu vẫn không thể thống nhất cách giải quyết thì hai bên sẽ đưa vụ việc ra Tòa án có thẩm quyền giải quyết, toàn bộ chi phí xét xử do bên thua chịu.</p>
<p style="margin-bottom: 15px; text-align: justify;">8.3 Hợp đồng này được lập thành 02 (hai) bản, mỗi bên giữ 01 (một) bản có giá trị pháp lý như nhau.</p>

<table style="width: 100%; border-collapse: collapse; border: none; margin-top: 25px; font-size: 13px;">
  <tr>
    <td style="width: 50%; border: 1.5px dashed #cbd5e1; padding: 15px; height: 180px; vertical-align: top;">
      <div style="font-weight: bold; text-align: center; margin-bottom: 15px;">Đại Diện Bên A</div>
    </td>
    <td style="width: 50%; border: 1.5px dashed #cbd5e1; padding: 15px; height: 180px; vertical-align: top;">
      <div style="font-weight: bold; text-align: center; margin-bottom: 15px;">Đại Diện Bên B</div>
    </td>
  </tr>
  <tr>
    <td style="width: 50%; border: none; padding: 10px 5px; vertical-align: top; line-height: 1.5;">
      <strong>Bởi:</strong> CHI NHÁNH PHÍA NAM - TỔNG CÔNG TY XÂY DỰNG TRƯỜNG SƠN<br/>
      <strong>Tên:</strong> {{Tên đại diện Bên A}}<br/>
      <strong>Chức vụ:</strong> {{Chức vụ Bên A}}
    </td>
    <td style="width: 50%; border: none; padding: 10px 5px; vertical-align: top; line-height: 1.5;">
      <strong>Bởi:</strong> CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH<br/>
      <strong>Tên:</strong> {{Tên đại diện Bên B}}<br/>
      <strong>Chức vụ:</strong> {{Chức vụ Bên B}}
    </td>
  </tr>
</table>

<div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 5px;">
  <div>Pháp Chế_111124_TGDD_VN</div>
  <div>Trang 1/1</div>
</div>`;

export default function ToolHoTro() {
  const { userProfile } = useAuth();
  const maKho = userProfile?.ma_kho || '';
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('sticker-event');
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [priceFile, setPriceFile] = useState<File | null>(null);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [lastUpdateInventory, setLastUpdateInventory] = useState<string | null>(null);
  const [lastUpdatePrice, setLastUpdatePrice] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [contractTemplateName, setContractTemplateName] = useState<string>('Hợp đồng mua bán mặc định');
  const [templateContent, setTemplateContent] = useState<string>(DEFAULT_CONTRACT_TEMPLATE);
  
  const [inputValues, setInputValues] = useState<Record<string, string>>({
    'Số hợp đồng': '02',
    'Ngày ký': '25',
    'Tháng ký': '05',
    'Trụ sở đăng ký Bên A': '30D PHAN VĂN TRỊ, PHƯỜNG HẠNH THÔNG, THÀNH PHỐ HỒ CHÍ MINH, VIỆT NAM',
    'Mã số thuế Bên A': '0100512273-003',
    'Điện thoại Bên A': '',
    'Số tài khoản Bên A': '2011100004002',
    'Ngân hàng Bên A': 'Ngân hàng thương mại cổ phần Quân Đội - CN Bắc Sài Gòn',
    'Đại diện Bên A': 'Võ Thanh Phong',
    'Chức vụ Bên A': 'GIÁM ĐỐC',
    'Trụ sở đăng ký Bên B': 'Số 2A, Đường Trần Hưng Đạo, Khóm 6, Phường Tân Thành, Tỉnh Cà Mau, Việt Nam',
    'Văn phòng điều hành Bên B': 'ĐML_CMA_CM... Nguyễn Tất Thành',
    'Mã số thuế Bên B': '0303217354-006',
    'Điện thoại Bên B': '18001060 – (+84) 8 38125957',
    'Số tài khoản Bên B': '1243 666 888',
    'Ngân hàng Bên B': 'Vietcombank - CN Tân Bình',
    'Đại diện Bên B': 'Lê Thụy Sơn ca',
    'Chức vụ Bên B': 'GIÁM ĐỐC BÁN HÀNG',
    'Số ủy quyền Bên B': '50/2025/ĐMX/UQ',
    'Ngày ủy quyền Bên B': '4/12/2025',
    'Mô tả hàng hóa 1': 'MÁY LẠNH CASPER GC-18IS33',
    'Số lượng 1': '2',
    'Đơn giá 1': '12.690.000',
    'Thành tiền 1': '25.380.000',
    'Mô tả hàng hóa 2': 'MÁY LẠNH CASPER GC-12IB36',
    'Số lượng 2': '3',
    'Đơn giá 2': '7.990.000',
    'Thành tiền 2': '23.970.000',
    'Tổng tiền chưa thuế': '45.694.444',
    'Thuế VAT': '3.655.556',
    'Tổng tiền gồm VAT': '49.350.000',
    'Tổng giá bằng chữ': 'Bốn mươi chín triệu ba trăm năm mươi ngàn đồng chẵn',
    'Địa điểm giao hàng': 'Xã Hồ Thị Kỷ, Tỉnh Cà Mau',
    'Chủ tài khoản ngân hàng Bên B': 'CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH',
    'Số tài khoản ngân hàng Bên B': '1243 666 888',
    'Ngân hàng giao dịch Bên B': 'Vietcombank - CN Tân Bình',
    'Địa chỉ ngân hàng Bên B': 'CN Tân Bình',
    'Tên đại diện Bên A': 'VÕ THANH PHONG',
    'Tên đại diện Bên B': 'Lê Thụy Sơn ca'
  });
  
  const [contractFont, setContractFont] = useState<'times' | 'arial'>('times');

  const placeholders = useMemo(() => {
    const found = new Set<string>();
    const doubleCurlyRegex = /\{\{(.+?)\}\}/g;
    let match;
    while ((match = doubleCurlyRegex.exec(templateContent)) !== null) {
      found.add(match[1].trim());
    }
    const squareBracketRegex = /\[([^\]]+)\]/g;
    while ((match = squareBracketRegex.exec(templateContent)) !== null) {
      const val = match[1].trim();
      if (val && val.length < 50 && !val.includes('/') && !val.includes(':')) {
        found.add(val);
      }
    }
    return Array.from(found);
  }, [templateContent]);

  const renderedContent = useMemo(() => {
    let result = templateContent;
    placeholders.forEach(key => {
      const val = inputValues[key] || `(Chưa nhập ${key})`;
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      result = result.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g'), val);
      result = result.replace(new RegExp(`\\[\\s*${escapedKey}\\s*\\]`, 'g'), val);
    });
    return result;
  }, [templateContent, placeholders, inputValues]);

  const contractPages = useMemo(() => {
    if (renderedContent.includes('<!-- pagebreak -->')) {
      return renderedContent.split('<!-- pagebreak -->');
    }
    return [renderedContent];
  }, [renderedContent]);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const name = file.name.toLowerCase();
      if (name.endsWith('.docx')) {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const zip = await JSZip.loadAsync(arrayBuffer);
          const docXml = await zip.file('word/document.xml')?.async('text');
          if (docXml) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(docXml, 'application/xml');
            const paragraphs = xmlDoc.getElementsByTagName('w:p');
            let docText = '';
            for (let i = 0; i < paragraphs.length; i++) {
              const p = paragraphs[i];
              const tTags = p.getElementsByTagName('w:t');
              let pText = '';
              for (let j = 0; j < tTags.length; j++) {
                pText += tTags[j].textContent || '';
              }
              if (pText.trim() || pText === '') {
                docText += pText + '\n';
              }
            }
            
            if (docText.trim()) {
              setTemplateContent(docText);
              setContractTemplateName(file.name);
              const foundInputs: Record<string, string> = {};
              const doubleCurlyRegex = /\{\{(.+?)\}\}/g;
              let match;
              while ((match = doubleCurlyRegex.exec(docText)) !== null) {
                foundInputs[match[1].trim()] = '';
              }
              const squareBracketRegex = /\[([^\]]+)\]/g;
              while ((match = squareBracketRegex.exec(docText)) !== null) {
                const val = match[1].trim();
                if (val && val.length < 50 && !val.includes('/') && !val.includes(':')) {
                  foundInputs[val] = '';
                }
              }
              setInputValues(foundInputs);
              showNotification(`Đã tải mẫu hợp đồng từ file Word: ${file.name}`, 'success');
            } else {
              showNotification('Không tìm thấy văn bản trong file Word!', 'error');
            }
          }
        } catch (err) {
          console.error(err);
          showNotification('Lỗi khi đọc file Word (.docx)!', 'error');
        }
      } else {
        const text = evt.target?.result as string;
        setTemplateContent(text);
        setContractTemplateName(file.name);
        const foundInputs: Record<string, string> = {};
        const doubleCurlyRegex = /\{\{(.+?)\}\}/g;
        let match;
        while ((match = doubleCurlyRegex.exec(text)) !== null) {
          foundInputs[match[1].trim()] = '';
        }
        const squareBracketRegex = /\[([^\]]+)\]/g;
        while ((match = squareBracketRegex.exec(text)) !== null) {
          const val = match[1].trim();
          if (val && val.length < 50 && !val.includes('/') && !val.includes(':')) {
            foundInputs[val] = '';
          }
        }
        setInputValues(foundInputs);
        showNotification(`Đã tải mẫu hợp đồng từ file: ${file.name}`, 'success');
      }
    };
    if (file.name.toLowerCase().endsWith('.docx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handlePrintContract = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('Vui lòng cho phép mở popup để in hợp đồng!', 'error');
      return;
    }
    
    const fontStyle = contractFont === 'times' 
      ? "font-family: 'Times New Roman', Times, serif;" 
      : "font-family: Arial, sans-serif;";

    const pagesHtml = contractPages.map((pageHtml) => `
      <div class="a4-page">
        <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
          <div>
            ${pageHtml}
          </div>
        </div>
      </div>
    `).join('\n');

    printWindow.document.write(`
      <html>
        <head>
          <title>In Hợp Đồng - ${contractTemplateName}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .a4-page {
              width: 210mm;
              height: 297mm;
              padding: 20mm 15mm 20mm 20mm;
              box-sizing: border-box;
              page-break-after: always;
              break-after: page;
              position: relative;
              background: white;
              ${fontStyle}
              font-size: 14px;
              line-height: 1.6;
              color: #000;
              white-space: pre-wrap;
              overflow: hidden;
            }
            .a4-page:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              ${fontStyle}
            }
            .text-justify {
              text-align: justify;
            }
            .text-center {
              text-align: center;
            }
            .font-bold {
              font-weight: bold;
            }
            .uppercase {
              text-transform: uppercase;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${pagesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [isBienBanModalOpen, setIsBienBanModalOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ style: 'classic', layout: '4', showPromoLabel: true });
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<number, number>>({});
  const [printQuantity, setPrintQuantity] = useState<string>('');
  const [filters, setFilters] = useState({
    maSieuThi: '',
    nganhHang: '',
    nhomHang: '',
    onlyInventory: false,
    sortOrder: '' // '' | 'asc' | 'desc'
  });

  const [manualData, setManualData] = useState({
    productCode: '',
    name: '',
    originalPrice: '',
    discountPrice: ''
  });

  const [autoExpand, setAutoExpand] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Fetch data from local storage on mount
  useEffect(() => {
    if (activeTab === 'sticker-event' || activeTab === 'sticker') {
      const storageKeyInv = STORAGE_KEYS.STICKER_INVENTORY_DATA;
      const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;

      const savedInventory = localStorage.getItem(storageKeyInv);
      if (savedInventory) {
        try {
          const parsed = JSON.parse(savedInventory);
          setInventoryData(parsed.data || []);
          setLastUpdateInventory(parsed.timestamp ? new Date(parsed.timestamp).toLocaleString('vi-VN') : null);
        } catch (e) {
          console.error('Error parsing saved inventory:', e);
        }
      }

      const savedPrice = localStorage.getItem(storageKeyPrice);
      if (savedPrice) {
        try {
          const parsed = JSON.parse(savedPrice);
          setPriceData(parsed.data || []);
          setLastUpdatePrice(parsed.timestamp ? new Date(parsed.timestamp).toLocaleString('vi-VN') : null);
        } catch (e) {
          console.error('Error parsing saved price:', e);
        }
      }
    }
  }, [activeTab]);

  // Autosave priceData to localStorage when it changes
  React.useEffect(() => {
    if (priceData.length > 0) {
      const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;
      localStorage.setItem(storageKeyPrice, JSON.stringify({
        data: priceData,
        timestamp: new Date().toISOString()
      }));
    }
  }, [priceData, activeTab]);

  const fetchInventoryData = async () => {
    // Disabled database fetching as per user request
    return;
  };

  const fetchPriceData = async () => {
    // Disabled database fetching as per user request
    return;
  };

  const combinedPriceData = React.useMemo(() => {
    if (!inventoryData || inventoryData.length === 0) return priceData;

    const inventoryMap = new Map<string, { nganhHang: string, nhomHang: string }>();

    // Handle both array of arrays (file upload) and array of objects (database)
    if (Array.isArray(inventoryData[0])) {
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(20, inventoryData.length); i++) {
        const row: any = inventoryData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('mã sản phẩm') || rowStr.includes('tên sản phẩm') || rowStr.includes('mã hàng')) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx !== -1) {
        const headerRow = inventoryData[headerRowIdx].map((h: any) => String(h || '').toLowerCase().trim());
        const maSpIdx = headerRow.findIndex((h: string) => h === 'mã sản phẩm' || h === 'mã sp' || h === 'mã hàng');
        const nganhHangIdx = headerRow.findIndex((h: string) => h === 'ngành hàng');
        const nhomHangIdx = headerRow.findIndex((h: string) => h === 'nhóm hàng');

        if (maSpIdx !== -1) {
          for (let i = headerRowIdx + 1; i < inventoryData.length; i++) {
            const row = inventoryData[i];
            if (!row || !Array.isArray(row)) continue;
            const maSp = String(row[maSpIdx] || '').trim();
            if (maSp) {
              inventoryMap.set(maSp, {
                nganhHang: nganhHangIdx !== -1 ? String(row[nganhHangIdx] || '').trim() : '',
                nhomHang: nhomHangIdx !== -1 ? String(row[nhomHangIdx] || '').trim() : ''
              });
            }
          }
        }
      }
    } else {
      // Array of objects from database
      inventoryData.forEach((item: any) => {
        if (item.ma_san_pham) {
          inventoryMap.set(item.ma_san_pham, {
            nganhHang: item.nganh_hang || '',
            nhomHang: item.nhom_hang || ''
          });
        }
      });
    }

    return priceData.map(item => {
      const productCode = item.maSanPham || item.productCode || (item.name || '').split(' - ')[0].trim();
      const invInfo = inventoryMap.get(productCode);
      return {
        ...item,
        nganhHang: invInfo?.nganhHang || item.nganhHang || '',
        nhomHang: invInfo?.nhomHang || item.nhomHang || ''
      };
    });
  }, [priceData, inventoryData]);

  const filteredPriceData = React.useMemo(() => {
    let result = combinedPriceData.filter(item => {
      const matchNganh = !filters.nganhHang || item.nganhHang === filters.nganhHang;
      const matchNhom = !filters.nhomHang || item.nhomHang === filters.nhomHang;
      const matchInv = !filters.onlyInventory || (item.nganhHang || item.nhomHang);
      return matchNganh && matchNhom && matchInv;
    });

    if (filters.sortOrder === 'asc') {
      result = [...result].sort((a, b) => Number(a.discountPrice) - Number(b.discountPrice));
    } else if (filters.sortOrder === 'desc') {
      result = [...result].sort((a, b) => Number(b.discountPrice) - Number(a.discountPrice));
    }

    return result;
  }, [combinedPriceData, filters]);

  const uniqueNganhHang = React.useMemo(() => {
    const set = new Set<string>();
    combinedPriceData.forEach(item => {
      if (item.nganhHang) set.add(item.nganhHang);
    });
    return Array.from(set).sort();
  }, [combinedPriceData]);

  const uniqueNhomHang = React.useMemo(() => {
    const set = new Set<string>();
    combinedPriceData.forEach(item => {
      if (item.nhomHang && (!filters.nganhHang || item.nganhHang === filters.nganhHang)) {
        set.add(item.nhomHang);
      }
    });
    return Array.from(set).sort();
  }, [combinedPriceData, filters.nganhHang]);

  React.useEffect(() => {
    const initialQuantities: Record<number, number> = {};
    filteredPriceData.forEach((_, index) => {
      initialQuantities[index] = 1;
    });
    setPrintQuantities(initialQuantities);
    setSelectedIndices(filteredPriceData.map((_, index) => index));
  }, [filteredPriceData]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIndices = filteredPriceData.map((_, index) => index);
      setSelectedIndices(allIndices);
      const newQuantities = { ...printQuantities };
      allIndices.forEach(index => {
        if (!newQuantities[index] || newQuantities[index] === 0) newQuantities[index] = 1;
      });
      setPrintQuantities(newQuantities);
    } else {
      setSelectedIndices([]);
    }
  };

  const handleSelectRow = (index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        if (!printQuantities[index] || printQuantities[index] === 0) {
          setPrintQuantities(prevQ => ({ ...prevQ, [index]: 1 }));
        }
        return [...prev, index];
      }
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newQty = Math.max(0, qty);
    setPrintQuantities(prev => ({
      ...prev,
      [index]: newQty
    }));
    
    if (newQty > 0) {
      if (!selectedIndices.includes(index)) {
        setSelectedIndices(prev => [...prev, index]);
      }
    } else {
      setSelectedIndices(prev => prev.filter(i => i !== index));
    }
  };

  const totalStickersToPrint = React.useMemo(() => {
    return selectedIndices.reduce((sum, index) => sum + (printQuantities[index] || 0), 0);
  }, [selectedIndices, printQuantities]);

  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File, type: 'inventory' | 'price', shouldAppend: boolean = false) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    if (type === 'inventory') {
      setInventoryFile(file);
    } else if (!shouldAppend) {
      setPriceFile(file);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataBuffer = evt.target?.result as ArrayBuffer;
      const wb = XLSX.read(dataBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' }) as any[][]; 
      
      if (!data || data.length === 0) {
        showNotification('File Excel không có dữ liệu!', 'error');
        return;
      }

      if (type === 'inventory') {
        const storageKeyInv = STORAGE_KEYS.STICKER_INVENTORY_DATA;
        setInventoryData(data);
        const timestamp = new Date().toISOString();
        setLastUpdateInventory(new Date(timestamp).toLocaleString('vi-VN'));
        localStorage.setItem(storageKeyInv, JSON.stringify({
          data,
          timestamp
        }));
        showNotification('Đã tải và lưu tạm file Tồn kho!', 'success');

        // Tự động xuất file Excel chỉ lấy dữ liệu cột G
        try {
          const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || 'Du_Lieu';
          const colGData = data.map((row) => {
            const value = row && row.length > 6 ? row[6] : '';
            return [value];
          });
          const exportWs = XLSX.utils.aoa_to_sheet(colGData);
          const exportWb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(exportWb, exportWs, 'Sheet1');
          XLSX.writeFile(exportWb, `${originalName}_Cot_G.xlsx`);
          showNotification('Đã tự động xuất file Excel cột G!', 'success');
        } catch (err) {
          console.error('Error auto-exporting column G:', err);
        }
      } else {
        // Process price data
        const parsedPriceData: any[] = [];
        
        if (shouldAppend) {
          // TRANG STICKER -> BẢNG DỮ LIỆU BẢNG GIÁ -> Cột A = Mã SP, Cột B = Tên SP, Cột C = Giá gốc, Cột D = Giá giảm
          const cleanPrice = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            if (typeof val === 'number') return val;
            return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
          };

          for (let i = 0; i < data.length; i++) {
            const row: any = data[i];
            if (!row || !Array.isArray(row)) continue;

            const colA = String(row[0] || '').trim();  // Cột A
            const colB = String(row[1] || '').trim();  // Cột B
            const colC = row[2];                        // Cột C = Giá gốc
            const colD = row[3];                        // Cột D = Giá giảm

            // Bỏ qua dòng tiêu đề
            if (i === 0 && (colA.toLowerCase().includes('mã') || colB.toLowerCase().includes('tên') || colB.toLowerCase().includes('sản phẩm'))) {
              continue;
            }

            if (!colB) continue; // Bỏ qua dòng trống không có tên SP

            parsedPriceData.push({
              maSanPham: colA,
              productCode: colA,
              name: colB,
              originalPrice: cleanPrice(colC),
              discountPrice: cleanPrice(colD),
              nganhHang: '',
              nhomHang: ''
            });
          }
        } else {
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(20, data.length); i++) {
            const row: any = data[i];
            if (!row || !Array.isArray(row)) continue;
            const rowStr = row.join(' ').toLowerCase();
            if (rowStr.includes('tên sản phẩm') || rowStr.includes('tên hàng') || rowStr.includes('mã sản phẩm') || rowStr.includes('giá niêm yết') || rowStr.includes('giá gốc') || rowStr.includes('giá sau giảm')) {
              headerRowIdx = i;
              break;
            }
          }

          if (headerRowIdx !== -1) {
            const headerRow = data[headerRowIdx].map((h: any) => String(h || '').toLowerCase().trim());
            const maSpIdx = headerRow.findIndex((h: string) => h === 'mã sản phẩm' || h === 'mã sp' || h === 'mã hàng');
            const nameIdx = headerRow.findIndex((h: string) => h === 'tên sản phẩm' || h === 'tên hàng' || h === 'sản phẩm');
            const originalPriceIdx = headerRow.findIndex((h: string) => h === 'giá niêm yết' || h === 'giá gốc' || h === 'giá cũ');
            const discountPriceIdx = headerRow.findIndex((h: string) => h === 'giá mới' || h === 'giá giảm' || h === 'giá bán' || h === 'giá hiện tại' || h === 'giá sau giảm');
            const nganhHangIdx = headerRow.findIndex((h: string) => h === 'ngành hàng');
            const nhomHangIdx = headerRow.findIndex((h: string) => h === 'nhóm hàng');

            for (let i = headerRowIdx + 1; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
              if (!name || name.toLowerCase().includes('tên sản phẩm')) continue;

              const cleanPrice = (val: any) => {
                if (val === undefined || val === null || val === '') return 0;
                if (typeof val === 'number') return val;
                return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
              };

              parsedPriceData.push({
                maSanPham: maSpIdx !== -1 ? String(row[maSpIdx] || '').trim() : '',
                productCode: maSpIdx !== -1 ? String(row[maSpIdx] || '').trim() : '',
                name,
                originalPrice: originalPriceIdx !== -1 ? cleanPrice(row[originalPriceIdx]) : 0,
                discountPrice: discountPriceIdx !== -1 ? cleanPrice(row[discountPriceIdx]) : 0,
                nganhHang: nganhHangIdx !== -1 ? String(row[nganhHangIdx] || '').trim() : '',
                nhomHang: nhomHangIdx !== -1 ? String(row[nhomHangIdx] || '').trim() : ''
              });
            }
          } else {
            // Fallback: Không tìm thấy header
            // Cột AK (index 36) = Mã SP, Cột A+B = Tên SP, Cột E = Giá gốc, Cột F = Giá giảm
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colA = String(row[0] || '').trim();  // Cột A
              const colB = String(row[1] || '').trim();  // Cột B
              const colE = row[4];                        // Cột E = Giá gốc
              const colF = row[5];                        // Cột F = Giá giảm
              const colAK = String(row[36] || '').trim(); // Cột AK = Mã SP

              // Tên SP = Cột A + Cột B (gộp lại)
              const name = [colA, colB].filter(Boolean).join(' ').trim();

              // Bỏ qua dòng trống
              if (!name) continue;

              parsedPriceData.push({
                maSanPham: colAK,
                productCode: colAK,
                name,
                originalPrice: cleanPrice(colE),
                discountPrice: cleanPrice(colF),
                nganhHang: '',
                nhomHang: ''
              });
            }
          }
        }

        const finalData = shouldAppend ? [...priceData, ...parsedPriceData] : parsedPriceData;
        setPriceData(finalData);
        
        const timestamp = new Date().toISOString();
        if (!shouldAppend) setLastUpdatePrice(new Date(timestamp).toLocaleString('vi-VN'));
        
        const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;
        localStorage.setItem(storageKeyPrice, JSON.stringify({
          data: finalData,
          timestamp
        }));
        
        const message = shouldAppend 
          ? `Đã thêm ${parsedPriceData.length} sản phẩm vào danh sách!` 
          : `Đã tải và đồng bộ ${parsedPriceData.length} sản phẩm bảng giá!`;
        showNotification(message, 'success');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearData = () => {
    setInventoryFile(null);
    setPriceFile(null);
    setInventoryData([]);
    setPriceData([]);
    setLastUpdateInventory(null);
    setLastUpdatePrice(null);
    const storageKeyInv = STORAGE_KEYS.STICKER_INVENTORY_DATA;
    const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;
    localStorage.removeItem(storageKeyInv);
    localStorage.removeItem(storageKeyPrice);
    setSaveMessage({ type: '', text: '' });
    if (inventoryInputRef.current) inventoryInputRef.current.value = '';
    if (priceInputRef.current) priceInputRef.current.value = '';
  };

  const handlePrintSticker = () => {
    setIsPrintModalOpen(true);
  };

  const handleAddManualSticker = () => {
    if (!manualData.name || !manualData.discountPrice) {
      showNotification('Vui lòng nhập tên sản phẩm và giá giảm!', 'error');
      return;
    }

    const newItem = {
      productCode: manualData.productCode || 'MANUAL',
      maSanPham: manualData.productCode || 'MANUAL',
      name: manualData.name,
      originalPrice: parseInt(manualData.originalPrice.replace(/[^\d]/g, '')) || 0,
      discountPrice: parseInt(manualData.discountPrice.replace(/[^\d]/g, '')) || 0,
      nganhHang: 'THỦ CÔNG',
      nhomHang: 'THỦ CÔNG',
      isManual: true
    };

    setPriceData(prev => [newItem, ...prev]);
    setManualData({
      productCode: '',
      name: '',
      originalPrice: '',
      discountPrice: ''
    });
    showNotification('Đã thêm sản phẩm thủ công vào danh sách!', 'success');
  };

  const handleDeleteRow = (index: number) => {
    const itemToDelete = filteredPriceData[index];
    if (!itemToDelete) return;

    setPriceData(prev => prev.filter(item => {
      return !(item.maSanPham === itemToDelete.maSanPham && 
               item.productCode === itemToDelete.productCode && 
               item.name === itemToDelete.name);
    }));
    showNotification('Đã xóa sản phẩm khỏi danh sách!', 'success');
  };

  const handlePriceChange = (index: number, field: 'originalPrice' | 'discountPrice', value: string) => {
    const itemToUpdate = filteredPriceData[index];
    if (!itemToUpdate) return;

    // Use a unique combination of fields to identify the item in the original priceData
    const numericValue = value.replace(/[^0-9]/g, '');
    const newValue = numericValue ? parseInt(numericValue, 10) : 0;
    
    setPriceData(prev => prev.map(item => {
      const matches = (item.maSanPham === itemToUpdate.maSanPham && 
                       item.productCode === itemToUpdate.productCode && 
                       item.name === itemToUpdate.name);
      if (matches) {
        return { ...item, [field]: newValue };
      }
      return item;
    }));
  };

  const handleQuickPrint = (style: string, layout: string) => {
    const finalLayout = (style === 'giovang' || style === 'display') ? '1' : layout;
    setPrintConfig({ style, layout: finalLayout, showPromoLabel: true });
    setIsPrintModalOpen(true);
  };

  const handlePrintStickerDirect = () => {
    setIsLayoutModalOpen(true);
  };

  const menuItems = [
    { id: 'sticker', label: 'STICKER', icon: Printer, color: 'text-blue-500' },
    { id: 'sticker-event', label: 'STICKER EVENT', icon: Printer, color: 'text-emerald-500' },
    { id: 'phan-ca-thang', label: 'PHÂN CA THÁNG', icon: Users, color: 'text-purple-500' },
    { id: 'phan-ca-tuan', label: 'PHÂN CA TUẦN', icon: UploadCloud, color: 'text-orange-500' },
    { id: 'bien-ban', label: 'BIÊN BẢN CÁC LOẠI', icon: FileText, color: 'text-rose-500' },
    { id: 'hd-mua-ban', label: 'HĐ MUA BÁN', icon: FileText, color: 'text-amber-500' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Top Header Section - Spans full width */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00965e] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Tools Hỗ Trợ Công Việc</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#00965e] text-[9px] font-black uppercase tracking-widest">Quản Trị Viên</span>
                <span className="text-[10px] font-bold text-slate-400">Kho: {maKho || '43751'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-all uppercase tracking-tighter">Đổi mật khẩu</button>
             <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400"><Info size={18} /></div>
             <button className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black hover:bg-rose-100 transition-all uppercase tracking-tighter">Đăng Xuất</button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-8 p-8">
        {/* Left Vertical Navigation */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="flex flex-col gap-3 py-4 sticky top-[116px]">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-4 px-6 py-5 rounded-[22px] border transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white border-[#00965e] shadow-[0_15px_35px_-10px_rgba(0,150,94,0.15)] -translate-y-0.5 translate-x-1' 
                      : 'bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-emerald-50 ' + item.color : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                  }`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[15px] font-black tracking-tight uppercase ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00965e] shadow-[0_0_10px_rgba(0,150,94,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area - Right Side */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'phan-ca-thang' && (
              <motion.div
                key="phan-ca-thang"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PhanCaTable />
              </motion.div>
            )}
            {activeTab === 'phan-ca-tuan' && (
              <motion.div
                key="phan-ca-tuan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PhanCaTuanTable />
              </motion.div>
            )}

            {(activeTab === 'sticker-event' || activeTab === 'sticker') && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
              {/* Left Column */}
              <div className="col-span-1 space-y-6">
                {activeTab === 'sticker-event' ? (
                  /* Card 1: Thông tin & Nhập dữ liệu */
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-700">Thông tin người in <span className="text-red-500">*</span></h3>
                      <button 
                        onClick={handleClearData}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span className="text-xs font-medium">Xóa dữ liệu</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-2xl font-black text-slate-800">43751</span>
                      <button className="text-sm text-blue-600 hover:underline">(Sửa)</button>
                    </div>

                    <div className="h-px bg-slate-100 w-full mb-6"></div>

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-700">Nhập dữ liệu (Admin)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={inventoryInputRef}
                        onChange={(e) => handleFileUpload(e, 'inventory')}
                      />
                      <button 
                        onClick={() => inventoryInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all relative ${
                          inventoryFile || lastUpdateInventory
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700' 
                            : 'border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        {inventoryFile || lastUpdateInventory ? <CheckCircle2 size={24} strokeWidth={1.5} className="text-indigo-500" /> : <Archive size={24} strokeWidth={1.5} />}
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-wider">{inventoryFile || lastUpdateInventory ? 'Đã tải Tồn Kho' : 'Tải Tồn Kho'}</div>
                          {lastUpdateInventory && !inventoryFile && <div className="text-[8px] font-bold text-indigo-400 mt-1">Cập nhật: {lastUpdateInventory}</div>}
                          {inventoryFile && <div className="text-[8px] font-bold text-indigo-400 mt-1 truncate max-w-[80px]">{inventoryFile.name}</div>}
                        </div>
                      </button>

                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={priceInputRef}
                        onChange={(e) => handleFileUpload(e, 'price')}
                      />
                      <button 
                        onClick={() => priceInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed transition-all relative ${
                          priceFile || lastUpdatePrice
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-emerald-300 bg-emerald-50/30 text-emerald-600 hover:bg-emerald-50/50'
                        }`}
                      >
                        {priceFile || lastUpdatePrice ? <CheckCircle2 size={24} strokeWidth={1.5} className="text-emerald-500" /> : <FilePlus size={24} strokeWidth={1.5} />}
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-wider">{priceFile || lastUpdatePrice ? 'Đã tải Bảng Giá' : 'Tải Bảng Giá'}</div>
                          {lastUpdatePrice && !priceFile && <div className="text-[8px] font-bold text-emerald-500 mt-1">Cập nhật: {lastUpdatePrice}</div>}
                          {priceFile && <div className="text-[8px] font-bold text-emerald-500 mt-1 truncate max-w-[80px]">{priceFile.name}</div>}
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Card 2: Nhập thủ công */
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                          <FilePlus size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">In Sticker Thủ Công</h3>
                      </div>
                      <button 
                        onClick={handleClearData}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span className="text-xs font-medium">Xóa dữ liệu</span>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Mã sản phẩm</label>
                          <input 
                            type="text"
                            placeholder="Mã SP..."
                            value={manualData.productCode}
                            onChange={(e) => setManualData(prev => ({ ...prev, productCode: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tên sản phẩm</label>
                          <input 
                            type="text"
                            placeholder="Tên SP..."
                            value={manualData.name}
                            onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Giá gốc</label>
                          <input 
                            type="text"
                            placeholder="Giá gốc..."
                            value={manualData.originalPrice}
                            onChange={(e) => setManualData(prev => ({ ...prev, originalPrice: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Giá sau giảm</label>
                          <input 
                            type="text"
                            placeholder="Giá giảm..."
                            value={manualData.discountPrice}
                            onChange={(e) => setManualData(prev => ({ ...prev, discountPrice: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <button
                          onClick={handleAddManualSticker}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <FilePlus size={14} />
                          THÊM VÀO LIST
                        </button>
                        
                        <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                          <UploadCloud size={14} />
                          FILE EXCEL {'->'} LIST
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".xlsx, .xls"
                            onChange={(e) => {
                              handleFileUpload(e, 'price', true);
                              e.target.value = ''; // Reset to allow same file again
                            }}
                          />
                        </label>
                      </div>

                      <button
                        onClick={() => {
                          const templateData = [
                            {
                              'MÃ SẢN PHẨM': 'SP001',
                              'TÊN SẢN PHẨM': 'Ví dụ Tên Sản Phẩm',
                              'GIÁ GỐC': 1000000,
                              'GIÁ SAU GIẢM': 500000
                            }
                          ];
                          const worksheet = XLSX.utils.json_to_sheet(templateData);
                          const workbook = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(workbook, worksheet, 'StickerTemplate');
                          XLSX.writeFile(workbook, `Mau_In_Sticker_Event.xlsx`);
                          showNotification('Đã tải file Excel mẫu!', 'success');
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <UploadCloud size={14} />
                        XUẤT FILE MẪU
                      </button>
                    </div>
                  </div>
                )}

                {/* Nút In Sticker */}
                <button
                  onClick={handlePrintStickerDirect}
                  disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-3xl text-base font-bold transition-colors shadow-sm"
                >
                  <Printer size={20} />
                  IN STICKER
                </button>
              </div>

              {/* Right Column */}
              <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">BỘ LỌC TỒN KHO</h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                          checked={filters.onlyInventory}
                          onChange={(e) => setFilters(prev => ({ ...prev, onlyInventory: e.target.checked }))}
                        />
                        <span className="text-sm font-medium text-slate-600">Có trong tồn kho</span>
                      </label>
                    </div>
                    <button 
                      onClick={() => {
                        setFilters({ maSieuThi: '', nganhHang: '', nhomHang: '', onlyInventory: false, sortOrder: '' });
                        setPrintQuantity('');
                      }}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Ngành hàng</label>
                      <div className="relative">
                        <select 
                          value={filters.nganhHang}
                          onChange={(e) => setFilters(prev => ({ ...prev, nganhHang: e.target.value, nhomHang: '' }))}
                          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Tất cả ngành hàng</option>
                          {uniqueNganhHang.map(nganh => (
                            <option key={nganh} value={nganh}>{nganh}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Nhóm hàng</label>
                      <div className="relative">
                        <select 
                          value={filters.nhomHang}
                          onChange={(e) => setFilters(prev => ({ ...prev, nhomHang: e.target.value }))}
                          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Tất cả nhóm hàng</option>
                          {uniqueNhomHang.map(nhom => (
                            <option key={nhom} value={nhom}>{nhom}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Sắp xếp giá giảm</label>
                      <div className="relative">
                        <select 
                          value={filters.sortOrder}
                          onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Mặc định</option>
                          <option value="asc">Giá thấp đến cao</option>
                          <option value="desc">Giá cao đến thấp</option>
                        </select>
                        <ArrowUpDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Số lượng cần in</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          min="0"
                          max={filteredPriceData.length}
                          placeholder="VD: 5"
                          value={printQuantity}
                          onChange={(e) => setPrintQuantity(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button 
                          onClick={() => {
                            const qty = parseInt(printQuantity);
                            if (!isNaN(qty) && qty >= 0) {
                              const count = Math.min(qty, filteredPriceData.length);
                              setSelectedIndices(Array.from({ length: count }, (_, i) => i));
                            }
                          }}
                          className="bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors shrink-0"
                        >
                          Chọn
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Table or Instructions */}
                {priceData.length > 0 ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <FilePlus size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">DỮ LIỆU BẢNG GIÁ</h3>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Đã lọc {filteredPriceData.length} / {combinedPriceData.length} sản phẩm</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {saveMessage.text && (
                          <span className={`text-xs font-bold ${saveMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {saveMessage.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="overflow-auto flex-1 p-0">
                      <table className="w-full text-left border-collapse border border-slate-200">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 shadow-sm">
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-10 text-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                checked={filteredPriceData.length > 0 && selectedIndices.length === filteredPriceData.length}
                                onChange={handleSelectAll}
                              />
                            </th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">STT</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center">SL In</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Mã SP</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Tên sản phẩm</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Ngành hàng</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Nhóm hàng</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-36">Giá gốc</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-36">Giá giảm</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-10">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPriceData.map((item, index) => (
                            <tr key={index} className={`hover:bg-slate-50 transition-colors ${item.isManual ? 'bg-amber-50/30' : ''}`}>
                              <td className="py-3 px-4 text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  checked={selectedIndices.includes(index)}
                                  onChange={() => handleSelectRow(index)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-500">{index + 1}</td>
                              <td className="py-3 px-4 text-center">
                                <input 
                                  type="number" 
                                  min="0"
                                  className="w-16 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                                  value={printQuantities[index] ?? 0}
                                  onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-indigo-600">{item.maSanPham || item.productCode || '-'}</td>
                              <td className="py-3 px-4 text-sm font-bold text-slate-800">{item.name}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-600">{item.nganhHang || '-'}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-600">{item.nhomHang || '-'}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-600 text-right">
                                <input 
                                  type="text"
                                  className="w-32 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                                  value={Number(item.originalPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                  onChange={(e) => handlePriceChange(index, 'originalPrice', e.target.value)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-red-600 text-right">
                                <input 
                                  type="text"
                                  className="w-32 bg-white border border-slate-200 text-red-600 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                                  value={Number(item.discountPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                  onChange={(e) => handlePriceChange(index, 'discountPrice', e.target.value)}
                                />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button 
                                  onClick={() => handleDeleteRow(index)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                  title="Xóa dòng này"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-sm border border-indigo-100 p-6 md:p-8 relative overflow-hidden">
                    {/* Background subtle tint */}
                    <div className="absolute inset-0 bg-indigo-50/30 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-start gap-4 mb-8">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <Info size={24} className="text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-slate-800 tracking-tight">Hướng Dẫn Xuất File Giá Từ ERP</h2>
                          <p className="text-slate-500 mt-1">Làm theo các bước sau để thêm dữ liệu vào công cụ</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">1.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Truy cập: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">ERP {'>'} In bảng giá</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">2.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Ngành hàng: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Điện gia dụng, Dụng cụ nhà bếp,...</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">3.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Nhóm hàng: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Tất cả</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">4.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Vị trí trưng bày: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">2 - Kệ trưng bày</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">5.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Mẫu in: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">81 - Bảng giá Gia Dụng - Phụ Kiện rút gọn...</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">6.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Xuất file: Bấm nút <span className="font-bold">"In"</span>, sau đó chọn định dạng <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Excel Workbook Data - only (*.xlsx)</span>.
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 pt-6 border-t border-indigo-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Lưu ý quan trọng</h3>
                        <p className="text-sm text-slate-600">
                          Đảm bảo bạn đã chọn đúng siêu thị và ngành hàng trước khi xuất file để dữ liệu in ra được chính xác nhất.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'bien-ban' && (
            <motion.div
              key="bien-ban"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">BIÊN BẢN CÁC LOẠI</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                  onClick={() => setIsBienBanModalOpen(true)}
                  className="flex flex-col items-center justify-center p-6 bg-white border-2 border-indigo-100 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50 rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 text-center uppercase">Biên bản Tình Trạng Hàng Hóa</h3>
                  <p className="text-slate-500 text-sm text-center mt-2">Dùng khi ghi nhận tình trạng hàng hóa, in A4 ngang</p>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'hd-mua-ban' && (
            <motion.div
              key="hd-mua-ban"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-8"
            >
              {/* Cột trái: Cấu hình và nhập liệu */}
              <div className="xl:col-span-5 space-y-6">
                {/* Card 1: Tải file mẫu và tùy chọn font */}
                <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cấu hình Hợp đồng</h2>
                      <p className="text-xs text-slate-500 font-medium">Tải file mẫu hoặc thiết lập font chữ</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Drag & drop / upload file */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">File hợp đồng mẫu</label>
                      <div className="relative group border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-2xl p-6 transition-all bg-slate-50/50 hover:bg-amber-50/10 text-center cursor-pointer">
                        <input
                          type="file"
                          accept=".docx, .txt, .html"
                          onChange={handleTemplateUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 group-hover:border-amber-200 flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-all shadow-sm">
                            <FileText size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-700">Kéo thả hoặc click để tải file</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">Hỗ trợ .docx, .txt, .html</p>
                          </div>
                        </div>
                      </div>
                      {/* Hiển thị tên file mẫu hiện tại */}
                      <div className="mt-3 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs">
                        <span className="text-slate-500 font-bold">Mẫu đang dùng:</span>
                        <span className="text-amber-600 font-black truncate max-w-[200px]" title={contractTemplateName}>
                          {contractTemplateName}
                        </span>
                      </div>
                    </div>

                    {/* Tùy chỉnh Font chữ */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Font chữ văn bản</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setContractFont('times')}
                          className={`py-3 px-4 rounded-xl border text-xs font-black transition-all ${
                            contractFont === 'times'
                              ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Times New Roman
                        </button>
                        <button
                          onClick={() => setContractFont('arial')}
                          className={`py-3 px-4 rounded-xl border text-xs font-black transition-all ${
                            contractFont === 'arial'
                              ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Arial
                        </button>
                      </div>
                    </div>

                    {/* Nút reset về mẫu mặc định */}
                    <button
                      onClick={() => {
                        setContractTemplateName('Hợp đồng mua bán mặc định');
                        setTemplateContent(DEFAULT_CONTRACT_TEMPLATE);
                        setInputValues({
                          'Số hợp đồng': '02',
                          'Ngày ký': '25',
                          'Tháng ký': '05',
                          'Trụ sở đăng ký Bên A': '30D PHAN VĂN TRỊ, PHƯỜNG HẠNH THÔNG, THÀNH PHỐ HỒ CHÍ MINH, VIỆT NAM',
                          'Mã số thuế Bên A': '0100512273-003',
                          'Điện thoại Bên A': '',
                          'Số tài khoản Bên A': '2011100004002',
                          'Ngân hàng Bên A': 'Ngân hàng thương mại cổ phần Quân Đội - CN Bắc Sài Gòn',
                          'Đại diện Bên A': 'Võ Thanh Phong',
                          'Chức vụ Bên A': 'GIÁM ĐỐC',
                          'Trụ sở đăng ký Bên B': 'Số 2A, Đường Trần Hưng Đạo, Khóm 6, Phường Tân Thành, Tỉnh Cà Mau, Việt Nam',
                          'Văn phòng điều hành Bên B': 'ĐML_CMA_CM... Nguyễn Tất Thành',
                          'Mã số thuế Bên B': '0303217354-006',
                          'Điện thoại Bên B': '18001060 – (+84) 8 38125957',
                          'Số tài khoản Bên B': '1243 666 888',
                          'Ngân hàng Bên B': 'Vietcombank - CN Tân Bình',
                          'Đại diện Bên B': 'Lê Thụy Sơn ca',
                          'Chức vụ Bên B': 'GIÁM ĐỐC BÁN HÀNG',
                          'Số ủy quyền Bên B': '50/2025/ĐMX/UQ',
                          'Ngày ủy quyền Bên B': '4/12/2025',
                          'Mô tả hàng hóa 1': 'MÁY LẠNH CASPER GC-18IS33',
                          'Số lượng 1': '2',
                          'Đơn giá 1': '12.690.000',
                          'Thành tiền 1': '25.380.000',
                          'Mô tả hàng hóa 2': 'MÁY LẠNH CASPER GC-12IB36',
                          'Số lượng 2': '3',
                          'Đơn giá 2': '7.990.000',
                          'Thành tiền 2': '23.970.000',
                          'Tổng tiền chưa thuế': '45.694.444',
                          'Thuế VAT': '3.655.556',
                          'Tổng tiền gồm VAT': '49.350.000',
                          'Tổng giá bằng chữ': 'Bốn mươi chín triệu ba trăm năm mươi ngàn đồng chẵn',
                          'Địa điểm giao hàng': 'Xã Hồ Thị Kỷ, Tỉnh Cà Mau',
                          'Chủ tài khoản ngân hàng Bên B': 'CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH',
                          'Số tài khoản ngân hàng Bên B': '1243 666 888',
                          'Ngân hàng giao dịch Bên B': 'Vietcombank - CN Tân Bình',
                          'Địa chỉ ngân hàng Bên B': 'CN Tân Bình',
                          'Tên đại diện Bên A': 'VÕ THANH PHONG',
                          'Tên đại diện Bên B': 'Lê Thụy Sơn ca'
                        });
                        showNotification('Đã đặt lại mẫu hợp đồng mặc định!', 'success');
                      }}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors"
                    >
                      Khôi phục mẫu mặc định
                    </button>
                  </div>
                </div>

                {/* Card 2: Form nhập dữ liệu tự động */}
                <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <FilePlus size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Thông tin Hợp đồng</h2>
                      <p className="text-xs text-slate-500 font-medium">Nhập thông tin điền vào các trường trống</p>
                    </div>
                  </div>

                  {placeholders.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {placeholders.map(key => (
                        <div key={key} className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            {key}
                          </label>
                          <input
                            type="text"
                            value={inputValues[key] || ''}
                            placeholder={`Nhập ${key.toLowerCase()}...`}
                            onChange={(e) => setInputValues(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Info size={36} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">Không tìm thấy trường giữ chỗ nào.</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[250px] mx-auto leading-relaxed">
                        Vui lòng sử dụng định dạng <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-600 font-mono text-[9px] font-black">{"{{tên biến}}"}</code> hoặc <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-600 font-mono text-[9px] font-black">{"[tên biến]"}</code> trong file mẫu hợp đồng tải lên.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải: Xem trước A4 */}
              <div className="xl:col-span-7 space-y-6">
                <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Printer size={24} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Bản xem trước A4</h2>
                        <p className="text-xs text-slate-500 font-medium">Xem trước theo tỷ lệ chuẩn A4 và in ấn</p>
                      </div>
                    </div>

                    <button
                      onClick={handlePrintContract}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-colors shadow-lg shadow-amber-100"
                    >
                      <Printer size={16} />
                      IN HỢP ĐỒNG (A4)
                    </button>
                  </div>

                  {/* Vùng hiển thị A4 giống như tờ giấy thật */}
                  <div className="bg-slate-100 rounded-2xl p-6 overflow-auto max-h-[850px] border border-slate-200 flex flex-col items-center gap-6">
                    {contractPages.map((pageHtml, index) => (
                      <div
                        key={index}
                        id={`contract-a4-page-${index}`}
                        style={{
                          width: '210mm',
                          minHeight: '297mm',
                          padding: '20mm 15mm 20mm 20mm',
                          fontFamily: contractFont === 'times' ? "'Times New Roman', Times, serif" : 'Arial, sans-serif',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          color: '#1e293b',
                          whiteSpace: 'pre-wrap',
                          textAlign: 'left',
                          backgroundColor: 'white',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #cbd5e1',
                          position: 'relative',
                          boxSizing: 'border-box',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div dangerouslySetInnerHTML={{ __html: pageHtml }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      <BienBanTinhTrangHangHoa 
        isOpen={isBienBanModalOpen}
        onClose={() => setIsBienBanModalOpen(false)}
      />

      <PrintLayoutModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        onConfirm={(style, layout, showPromoLabel) => {
          setPrintConfig({ style, layout, showPromoLabel });
          setIsLayoutModalOpen(false);
          setIsPrintModalOpen(true);
        }}
      />

      <StickerPrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        data={filteredPriceData.flatMap((item, index) => {
          const isSelected = selectedIndices.length === 0 || selectedIndices.includes(index);
          const quantity = printQuantities[index] || 1;
          return isSelected && quantity > 0 ? Array(quantity).fill(item) : [];
        })} 
        config={printConfig}
      />
    </div>
  );
}
