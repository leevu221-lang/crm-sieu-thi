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
  storeName?: string;
}

export const ADDRESS_CATEGORY_OPTIONS = [
  { id: 'cat_phone_laptop', label: 'ĐIỆN THOẠI & LAPTOP', value: 'ĐIỆN THOẠI & LAPTOP' },
  { id: 'cat_tv_fridge', label: 'TIVI - TỦ LẠNH', value: 'TIVI - TỦ LẠNH' },
  { id: 'cat_washer_water', label: 'MÁY GIẶT - MÁY LỌC NƯỚC', value: 'MÁY GIẶT - MÁY LỌC NƯỚC' },
  { id: 'cat_ac_fan', label: 'MÁY LẠNH - QUẠT ĐIỀU HÒA', value: 'MÁY LẠNH - QUẠT ĐIỀU HÒA' },
  { id: 'cat_appliances', label: 'GIA DỤNG - NHÀ BẾP', value: 'GIA DỤNG - NHÀ BẾP' },
];

export const DEFAULT_ADDRESS_DATA: AddressFlyerData = {
  headerTitle: 'ĐIỆN MÁY XANH',
  headerSubtitle: '(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)',
  invitationTitle: 'THƯ MỜI, THỨ 7 TUẦN NÀY',
  invitationTarget: 'Kính mời: Quý Khách Hàng thân yêu',
  eventTimeLocation: 'Ngày 28/03 đến ĐMX',
  eventDescription: 'tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN',
  discountPercentage: '50%',
  duration: '1 NGÀY DUY NHẤT 28/03',
  categoriesLine1: 'ĐIỆN THOẠI & LAPTOP',
  categoriesLine2: 'TIVI - TỦ LẠNH - MÁY GIẶT - MÁY LỌC NƯỚC',
  categoriesLine3: 'MÁY LẠNH - QUẠT ĐIỀU HÒA',
  specialOffer: '➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%',
  paymentTerm: 'MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ',
  footerTitle: 'ĐIỆN MÁY XANH',
  footerLine1: 'CAM KẾT GIÁ RẺ - HÀNG CHÍNH HÃNG',
  footerLine2: 'GIAO HÀNG NHANH - HỖ TRỢ TẬN NHÀ',
  footerLine3: 'NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI ⬇',
  footerLine4: 'Được giảm thêm 10%'
};

/**
 * Tạo dữ liệu mặc định cho tờ rơi / poster theo tên cơ sở đang đăng nhập hoặc đang chọn
 */
export function getDefaultAddressData(storeName?: string): AddressFlyerData {
  const cleanStore = (storeName || '').trim();
  const title = cleanStore || 'ĐIỆN MÁY XANH';
  const cleanTitle = resolveAddressFlyerFooterTitle(title, undefined, cleanStore);
  return {
    ...DEFAULT_ADDRESS_DATA,
    headerTitle: cleanTitle,
    footerTitle: cleanTitle,
    eventTimeLocation: cleanStore ? `Ngày 28/03 đến ${cleanStore}` : 'Ngày 28/03 đến ĐIỆN MÁY XANH',
  };
}

/**
 * Trích xuất tên Tỉnh/Thành hoặc địa phương từ chuỗi (chỉ dùng khi cần phân tích, KHÔNG tự động ép vào tên siêu thị)
 */
export function extractProvinceOrLocation(text?: string): string {
  if (!text) return '';
  const clean = text.trim();

  // 1. Phân tách theo dấu gạch ngang
  const dashMatch = clean.match(/[-–—]\s*([^–—\-]+)$/);
  if (dashMatch && dashMatch[1].trim()) {
    const candidate = dashMatch[1].trim().replace(/[().,]+$/g, '').trim();
    if (candidate) return candidate.toUpperCase();
  }

  // 2. Phân tách theo dấu phẩy cuối câu
  const commaMatch = clean.match(/,\s*([^,()]+)$/);
  if (commaMatch && commaMatch[1].trim()) {
    const candidate = commaMatch[1].trim().replace(/[().,]+$/g, '').trim();
    if (candidate) return candidate.toUpperCase();
  }

  return '';
}

/**
 * Tự động xác định tên siêu thị hiển thị tại Dòng 1 chân trang của poster:
 * - Lấy trực tiếp từ tên siêu thị cấu hình (hoặc headerTitle người dùng nhập).
 * - TUYỆT ĐỐI KHÔNG tự động nối thêm hậu tố "- CÀ MAU" hoặc tỉnh/thành.
 * - Tự động loại bỏ hậu tố "- CÀ MAU" nếu dữ liệu cũ vô tình bị nối sai trong khi tên cấu hình không có Cà Mau.
 * - Chuẩn hóa tiền tố "ĐIỆN MÁY XANH" nếu người dùng chỉ nhập tên chi nhánh (ví dụ: "AN BIÊN" -> "ĐIỆN MÁY XANH AN BIÊN").
 */
export function resolveAddressFlyerFooterTitle(
  headerTitle?: string,
  explicitFooterTitle?: string,
  configuredStoreName?: string
): string {
  // 1. Xác định tên gốc: ưu tiên headerTitle, kế đến configuredStoreName
  const rawBase = (headerTitle || configuredStoreName || '').trim();
  const trimmedExplicit = (explicitFooterTitle || '').trim();

  // Nhận diện dữ liệu cũ bị nối sai "- CÀ MAU" từ phiên bản trước
  const isStaleCorrupted =
    !trimmedExplicit ||
    trimmedExplicit === 'ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU' ||
    trimmedExplicit.endsWith(' - CÀ MAU - CÀ MAU') ||
    trimmedExplicit.includes(' - BẠC LIÊU - CÀ MAU') ||
    trimmedExplicit.includes(' - SÓC TRĂNG - CÀ MAU') ||
    (rawBase && !rawBase.toUpperCase().includes('CÀ MAU') && trimmedExplicit.toUpperCase().endsWith(' - CÀ MAU'));

  // Nếu người dùng chủ động sửa footerTitle trên form và không phải là chuỗi lỗi cũ
  if (trimmedExplicit && !isStaleCorrupted) {
    return trimmedExplicit.toUpperCase();
  }

  if (!rawBase) {
    return 'ĐIỆN MÁY XANH';
  }

  // Chuẩn hóa tiền tố ĐIỆN MÁY XANH
  let cleanName = rawBase;
  if (/^ĐMX\s+/i.test(cleanName)) {
    cleanName = cleanName.replace(/^ĐMX\s+/i, 'ĐIỆN MÁY XANH ');
  } else if (!/^ĐIỆN\s+MÁY\s+XANH/i.test(cleanName)) {
    cleanName = `ĐIỆN MÁY XANH ${cleanName}`;
  }

  // Tẩy sạch "- CÀ MAU" nếu cơ sở này không có chữ Cà Mau trong cấu hình gốc
  if (configuredStoreName && !configuredStoreName.toUpperCase().includes('CÀ MAU')) {
    cleanName = cleanName.replace(/\s*[-–—]\s*CÀ\s*MAU$/i, '').trim();
  } else if (!rawBase.toUpperCase().includes('CÀ MAU')) {
    cleanName = cleanName.replace(/\s*[-–—]\s*CÀ\s*MAU$/i, '').trim();
  }

  // Loại bỏ dấu gạch ngang thừa ở cuối (nếu có)
  cleanName = cleanName.replace(/\s*[-–—]\s*$/, '').trim();

  return cleanName.toUpperCase();
}

/**
 * Chuẩn hóa dữ liệu tờ rơi khi tải từ DB / LocalStorage
 */
export function normalizeAddressFlyerData(
  raw?: Partial<AddressFlyerData> | null,
  configuredStoreName?: string
): AddressFlyerData {
  const fallback = getDefaultAddressData(configuredStoreName);
  if (!raw || typeof raw !== 'object') return { ...fallback };

  const merged: AddressFlyerData = {
    ...fallback,
    ...raw,
  };

  // Nếu headerTitle rỗng hoặc là giá trị mặc định của siêu thị khác trong khi đã có tên siêu thị cụ thể
  if (
    configuredStoreName &&
    (!merged.headerTitle ||
      merged.headerTitle === 'ĐIỆN MÁY XANH' ||
      merged.headerTitle === 'ĐIỆN MÁY XANH PHƯỜNG 8' ||
      merged.headerTitle === 'ĐIỆN MÁY XANH PHƯỜNG 8 - CÀ MAU')
  ) {
    merged.headerTitle = configuredStoreName;
  }

  // Tẩy sạch hậu tố - CÀ MAU nếu siêu thị không thuộc Cà Mau mà bị lưu nhầm từ bản trước
  if (
    configuredStoreName &&
    !configuredStoreName.toUpperCase().includes('CÀ MAU') &&
    merged.headerTitle.toUpperCase().endsWith(' - CÀ MAU')
  ) {
    merged.headerTitle = merged.headerTitle.replace(/\s*[-–—]\s*CÀ\s*MAU$/i, '').trim();
  }

  if (merged.categoriesLine2 === 'TIVI - TỦ LẠNH - MÁY GIẶT- MÁY LỌC NƯỚC') {
    merged.categoriesLine2 = 'TIVI - TỦ LẠNH - MÁY GIẶT - MÁY LỌC NƯỚC';
  }
  if (merged.footerLine1 === 'CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU') {
    merged.footerLine1 = 'CAM KẾT GIÁ RẺ - HÀNG CHÍNH HÃNG';
  }
  if (merged.footerLine2 === 'BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN') {
    merged.footerLine2 = 'GIAO HÀNG NHANH - HỖ TRỢ TẬN NHÀ';
  }

  // Luôn đồng bộ footerTitle chuẩn xác theo tên siêu thị, không tự động nối thêm tỉnh/thành hay - CÀ MAU
  merged.footerTitle = resolveAddressFlyerFooterTitle(
    merged.headerTitle,
    merged.footerTitle,
    configuredStoreName
  );

  return merged;
}
