export interface AddressFlyerData {
  headerTitle: string;
  headerSubtitle: string;
  invitationTitle: string;
  invitationTarget: string;
  eventTimeLocation: string;
  eventDescription: string;
  discountPercentage: string;
  duration: string;
  categoriesLine1: string;
  categoriesLine2: string;
  categoriesLine3: string;
  specialOffer: string;
  paymentTerm: string;
  footerTitle: string;
  footerLine1: string;
  footerLine2: string;
  footerLine3: string;
  footerLine4: string;
}

export const ADDRESS_CATEGORY_OPTIONS = [
  { id: 'cat_phone_laptop', label: 'ĐIỆN THOẠI & LAPTOP', value: 'ĐIỆN THOẠI & LAPTOP' },
  { id: 'cat_tv_fridge', label: 'TIVI - TỦ LẠNH', value: 'TIVI - TỦ LẠNH' },
  { id: 'cat_washer_water', label: 'MÁY GIẶT - MÁY LỌC NƯỚC', value: 'MÁY GIẶT - MÁY LỌC NƯỚC' },
  { id: 'cat_ac_fan', label: 'MÁY LẠNH - QUẠT ĐIỀU HÒA', value: 'MÁY LẠNH - QUẠT ĐIỀU HÒA' },
  { id: 'cat_appliances', label: 'GIA DỤNG - NHÀ BẾP', value: 'GIA DỤNG - NHÀ BẾP' },
];

export const DEFAULT_ADDRESS_DATA: AddressFlyerData = {
  headerTitle: 'ĐIỆN MÁY XANH PHƯỜNG 8 - CÀ MAU',
  headerSubtitle: '(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)',
  invitationTitle: 'THƯ MỜI, THỨ 7 TUẦN NÀY',
  invitationTarget: 'Kính mời: Quý Khách Hàng thân yêu',
  eventTimeLocation: 'Ngày 28/03 đến ĐMX PHƯỜNG 8',
  eventDescription: 'tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN',
  discountPercentage: '50%',
  duration: '1 NGÀY DUY NHẤT 28/03',
  categoriesLine1: 'ĐIỆN THOẠI & LAPTOP',
  categoriesLine2: 'TIVI - TỦ LẠNH - MÁY GIẶT - MÁY LỌC NƯỚC',
  categoriesLine3: 'MÁY LẠNH - QUẠT ĐIỀU HÒA',
  specialOffer: '➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%',
  paymentTerm: 'MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ',
  footerTitle: 'ĐIỆN MÁY XANH PHƯỜNG 8 - CÀ MAU',
  footerLine1: 'CAM KẾT GIÁ RẺ - HÀNG CHÍNH HÃNG',
  footerLine2: 'GIAO HÀNG NHANH - HỖ TRỢ TẬN NHÀ',
  footerLine3: 'NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI ⬇',
  footerLine4: 'Được giảm thêm 10%'
};

// Danh sách các tỉnh thành Việt Nam (sắp xếp dài trước ngắn sau để ưu tiên khớp cụm từ đầy đủ)
const VIETNAM_PROVINCES = [
  'BÀ RỊA - VŨNG TÀU', 'BÀ RỊA VŨNG TÀU', 'TP HỒ CHÍ MINH', 'TP. HỒ CHÍ MINH', 'TP.HCM', 'TPHCM',
  'HỒ CHÍ MINH', 'THỪA THIÊN HUẾ', 'BÌNH PHƯỚC', 'BÌNH THUẬN', 'NINH THUẬN', 'LÂM ĐỒNG',
  'ĐẮK NÔNG', 'ĐẮK LẮK', 'BÌNH DƯƠNG', 'ĐỒNG NAI', 'BÌNH ĐỊNH', 'QUẢNG NGÃI', 'QUẢNG NAM',
  'QUẢNG BÌNH', 'QUẢNG TRỊ', 'QUẢNG NINH', 'HẢI PHÒNG', 'HẢI DƯƠNG', 'HƯNG YÊN', 'BẮC NINH',
  'BẮC GIANG', 'LẠNG SƠN', 'THÁI NGUYÊN', 'TUYÊN QUANG', 'VĨNH PHÚC', 'PHÚ THỌ', 'ĐIỆN BIÊN',
  'LAI CHÂU', 'HÒA BÌNH', 'NINH BÌNH', 'NAM ĐỊNH', 'THÁI BÌNH', 'CÀ MAU', 'BẠC LIÊU',
  'SÓC TRĂNG', 'CẦN THƠ', 'HẬU GIANG', 'KIÊN GIANG', 'AN GIANG', 'ĐỒNG THÁP', 'VĨNH LONG',
  'TRÀ VINH', 'BẾN TRE', 'TIỀN GIANG', 'LONG AN', 'TÂY NINH', 'NHA TRANG', 'KHÁNH HÒA',
  'ĐÀ LẠT', 'PLEIKU', 'GIA LAI', 'KON TUM', 'PHÚ YÊN', 'ĐÀ NẴNG', 'NGHỆ AN', 'HÀ TĨNH',
  'THANH HÓA', 'HÀ NỘI', 'HÀ GIANG', 'LÀO CAI', 'YÊN BÁI', 'SƠN LA', 'CAO BẰNG', 'BẮC KẠN'
];

/**
 * Trích xuất tên Tỉnh/Thành hoặc địa phương từ chuỗi tiêu đề siêu thị hoặc địa chỉ
 */
export function extractProvinceOrLocation(text?: string): string {
  if (!text) return '';
  const clean = text.trim();

  // 1. Phân tách theo dấu gạch ngang: "ĐIỆN MÁY XANH PHƯỜNG 8 - BẠC LIÊU" -> "BẠC LIÊU"
  const dashMatch = clean.match(/[-–—]\s*([^–—\-]+)$/);
  if (dashMatch && dashMatch[1].trim()) {
    const candidate = dashMatch[1].trim().replace(/[().,]+$/g, '').trim();
    if (candidate) return candidate.toUpperCase();
  }

  // 2. Phân tách theo dấu phẩy cuối câu: "ĐIỆN MÁY XANH PHƯỜNG 8, BẠC LIÊU" -> "BẠC LIÊU"
  const commaMatch = clean.match(/,\s*([^,()]+)$/);
  if (commaMatch && commaMatch[1].trim()) {
    const candidate = commaMatch[1].trim().replace(/[().,]+$/g, '').trim();
    if (candidate) return candidate.toUpperCase();
  }

  // 3. Tra cứu từ danh sách tỉnh thành Việt Nam
  const upper = clean.toUpperCase();
  for (const prov of VIETNAM_PROVINCES) {
    if (upper.includes(prov)) {
      return prov;
    }
  }

  return '';
}

/**
 * Tự động tính toán dòng tiêu đề khung cuối tờ rơi (footerTitle).
 * Đảm bảo từ địa danh (ví dụ CÀ MAU) luôn thay đổi theo dòng ở trên (headerTitle/headerSubtitle).
 * Ví dụ:
 * - headerTitle: "ĐIỆN MÁY XANH PHƯỜNG 8 - BẠC LIÊU" -> "ĐIỆN MÁY XANH PHƯỜNG 8 - BẠC LIÊU"
 * - headerTitle: "ĐIỆN MÁY XANH HỘ PHÒNG - BẠC LIÊU" -> "ĐIỆN MÁY XANH HỘ PHÒNG - BẠC LIÊU"
 * - headerTitle: "PHƯỜNG 8 - BẠC LIÊU" -> "ĐIỆN MÁY XANH PHƯỜNG 8 - BẠC LIÊU"
 * - headerTitle: "ĐIỆN MÁY XANH PHƯỜNG 8 - CÀ MAU" -> "ĐIỆN MÁY XANH PHƯỜNG 8 - CÀ MAU"
 */
export function resolveAddressFlyerFooterTitle(
  headerTitle?: string,
  headerSubtitle?: string,
  explicitFooterTitle?: string
): string {
  const rawHeader = (headerTitle || '').trim();
  const trimmedExplicit = (explicitFooterTitle || '').trim();

  // Kiểm tra nếu explicitFooterTitle là giá trị mặc định cũ hoặc bị lỗi lặp
  const isStaleDefault =
    !trimmedExplicit ||
    trimmedExplicit === 'ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU' ||
    trimmedExplicit === 'ĐIỆN MÁY XANH PHƯỜNG 8 - CÀ MAU' ||
    trimmedExplicit.endsWith(' - CÀ MAU - CÀ MAU') ||
    trimmedExplicit.includes(' - BẠC LIÊU - CÀ MAU') ||
    trimmedExplicit.includes(' - SÓC TRĂNG - CÀ MAU');

  // Nếu người dùng đã nhập một footerTitle tùy biến hợp lệ
  if (trimmedExplicit && !isStaleDefault) {
    const headerLoc = extractProvinceOrLocation(rawHeader);
    const explicitLoc = extractProvinceOrLocation(trimmedExplicit);

    // Nếu dòng ở trên có địa danh khác với footer cũ (VD: người dùng đổi tên siêu thị ở trên từ Cà Mau sang Bạc Liêu),
    // ta ưu tiên đồng bộ theo dòng ở trên:
    if (headerLoc && explicitLoc && headerLoc !== explicitLoc) {
      // Cho phép rơi xuống logic bên dưới để cập nhật địa danh theo dòng ở trên
    } else {
      return trimmedExplicit.toUpperCase();
    }
  }

  // 1. Nếu dòng ở trên (headerTitle) có dấu gạch ngang phân cách chi nhánh và tỉnh/thành:
  if (rawHeader) {
    const dashMatch = rawHeader.match(/^(.*?)\s*[-–—]\s*(.+)$/);
    if (dashMatch) {
      let branchPart = dashMatch[1].trim();
      const locationPart = dashMatch[2].trim().toUpperCase();

      // Đảm bảo tiền tố "ĐIỆN MÁY XANH "
      if (/^ĐMX\s+/i.test(branchPart)) {
        branchPart = branchPart.replace(/^ĐMX\s+/i, 'ĐIỆN MÁY XANH ');
      } else if (!/^ĐIỆN\s+MÁY\s+XANH/i.test(branchPart)) {
        branchPart = `ĐIỆN MÁY XANH ${branchPart}`;
      }
      return `${branchPart.toUpperCase()} - ${locationPart}`;
    }
  }

  // 2. Trích xuất địa danh từ headerTitle hoặc headerSubtitle
  const locationFromHeader = extractProvinceOrLocation(rawHeader);
  const locationFromSubtitle = extractProvinceOrLocation(headerSubtitle);
  const detectedLocation = (locationFromHeader || locationFromSubtitle || 'CÀ MAU').toUpperCase();

  // Chuẩn hóa tên siêu thị
  let branch = rawHeader || 'ĐIỆN MÁY XANH PHƯỜNG 8';
  if (/^ĐMX\s+/i.test(branch)) {
    branch = branch.replace(/^ĐMX\s+/i, 'ĐIỆN MÁY XANH ');
  } else if (!/^ĐIỆN\s+MÁY\s+XANH/i.test(branch)) {
    branch = `ĐIỆN MÁY XANH ${branch}`;
  }
  branch = branch.toUpperCase().replace(/\s*[-–—]\s*$/, '').trim();

  // Nếu tên siêu thị đã kết thúc bằng chính địa danh đó (VD: "ĐIỆN MÁY XANH BẠC LIÊU")
  if (branch.endsWith(detectedLocation)) {
    return branch;
  }

  return `${branch} - ${detectedLocation}`;
}

export function normalizeAddressFlyerData(raw?: Partial<AddressFlyerData> | null): AddressFlyerData {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ADDRESS_DATA };
  const merged: AddressFlyerData = {
    ...DEFAULT_ADDRESS_DATA,
    ...raw,
  };
  if (merged.categoriesLine2 === 'TIVI - TỦ LẠNH - MÁY GIẶT- MÁY LỌC NƯỚC') {
    merged.categoriesLine2 = 'TIVI - TỦ LẠNH - MÁY GIẶT - MÁY LỌC NƯỚC';
  }
  if (merged.footerTitle === 'ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU') {
    merged.footerTitle = 'ĐIỆN MÁY XANH PHƯỜNG 8 - CÀ MAU';
  }
  if (merged.footerLine1 === 'CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU') {
    merged.footerLine1 = 'CAM KẾT GIÁ RẺ - HÀNG CHÍNH HÃNG';
  }
  if (merged.footerLine2 === 'BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN') {
    merged.footerLine2 = 'GIAO HÀNG NHANH - HỖ TRỢ TẬN NHÀ';
  }

  // Tự động giải quyết footerTitle theo dòng ở trên nếu chưa được tùy biến riêng
  merged.footerTitle = resolveAddressFlyerFooterTitle(
    merged.headerTitle,
    merged.headerSubtitle,
    merged.footerTitle
  );

  return merged;
}
