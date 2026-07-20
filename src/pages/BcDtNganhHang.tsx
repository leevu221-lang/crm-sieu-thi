import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { domToPng } from 'modern-screenshot';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { removeAccents, cn, normalizeStoreId } from './RTST/utils';
import { supabase } from '../supabaseClient';
import { useStore } from '../contexts/StoreContext';
import {
  LayoutGrid,
  FileSpreadsheet,
  Trash2,
  ChevronRight,
  ChevronDown,
  Camera,
  Activity,
  Store,
  Sliders,
  Package,
  User,
  Building2,
  Search,
  FolderOpen,
  CloudUpload,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const PRODUCT_CODE_MAP: Record<string, string> = {
  '1640571000491': 'Icall',
  '1640571000492': 'Icall',
  '1640571000500': 'Mango',
  '1640571000501': 'Mango',
  '4644499000102': 'BHKV',
  '1644479000057': 'BHYT',
  '1644479000056': 'BHXH',
  '1644479000098': 'BH.HOME'
};

const BRAND_DEFINITIONS: Array<[string, string]> = [
  ['MITSUBISHI HEAVY', 'Mitsubishi Heavy'],
  ['HARMAN KARDON', 'Harman Kardon'],
  ['THẺ GAME GARENA', 'Thẻ game Garena'],
  ['THẾ GIỚI DI ĐỘNG', 'Thế Giới Di Động'],
  ['UNIBEST CO., LTD', 'UNIBEST CO., LTD'],
  ['GỖ TRƯỜNG SƠN', 'Gỗ Trường Sơn'],
  ['BẢO HIỂM PTI', 'Bảo hiểm PTI'],
  ['BẢO HIỂM PVI', 'Bảo hiểm PVI'],
  ['CHƯA XÁC ĐỊNH', 'Chưa xác định'],
  ['ĐIỆN MÁY XANH', 'Điện Máy Xanh'],
  ['ARCTIC HUNTER', 'Arctic Hunter'],
  ['DANH PHONG', 'Danh Phong'],
  ['GREENCOOK', 'GREENCOOK'],
  ['HK THUNDER', 'HK THUNDER'],
  ['INNOSTYLE', 'INNOSTYLE'],
  ['SOUNDPEATS', 'Soundpeats'],
  ['DAIKIOSAN', 'DAIKIOSAN'],
  ['ELECTROLUX', 'Electrolux'],
  ['ENERGIZER', 'ENERGIZER'],
  ['MITSUBISHI', 'Mitsubishi Heavy'],
  ['SMILE KID', 'SMILE KID'],
  ['M-SERVICE', 'M-Service'],
  ['VINAPHONE', 'Vinaphone'],
  ['BLUESTONE', 'Bluestone'],
  ['KANGAROO', 'Kangaroo'],
  ['LOGITECH', 'Logitech'],
  ['MEGALIFE', 'Megalife'],
  ['MOTOROLA', 'Motorola'],
  ['NAGAKAWA', 'NAGAKAWA'],
  ['PANASONIC', 'Panasonic'],
  ['SUNHOUSE', 'Sunhouse'],
  ['ARISTON', 'Ariston'],
  ['FIVESTAR', 'Fivestar'],
  ['HIKSEMI', 'HIKSEMI'],
  ['KINGSTON', 'Kingston'],
  ['LOCK&LOCK', 'Lock&Lock'],
  ['MOBIFONE', 'MobiFone'],
  ['PEPOCO', 'Pepko'],
  ['PHILIPS', 'Philips'],
  ['SHOWCASE', 'Showcase'],
  ['TOSHIBA', 'Toshiba'],
  ['VIETTEL', 'Viettel'],
  ['AVITA', 'Avita'],
  ['AVA+', 'AVA+'],
  ['BASEUS', 'Baseus'],
  ['XMOBILE', 'Xmobile'],
  ['BEAR', 'BEAR'],
  ['BEAZOUT', 'Beazout'],
  ['BROTHER', 'Brother'],
  ['CASH24', 'Cash24'],
  ['CASIO', 'Casio'],
  ['CASPER', 'Casper'],
  ['COCOON', 'Cocoon'],
  ['COMFEE', 'Comfee'],
  ['COSMIS', 'Cosmis'],
  ['CRYSTAL', 'CRYSTAL'],
  ['CUCKOO', 'Cuckoo'],
  ['DAIKIN', 'Daikin'],
  ['DALLAN', 'Dallan'],
  ['DALTON', 'Dalton'],
  ['DAREU', 'Dareu'],
  ['DENON', 'Denon'],
  ['DUXDUC', 'Duxduc'],
  ['DUY TÂN', 'DUY TÂN'],
  ['ELMICH', 'Elmich'],
  ['EZVIZ', 'Ezviz'],
  ['GIMIKO', 'GIMIKO'],
  ['HAFELE', 'Hafele'],
  ['HAITER', 'Haier'],
  ['HAIER', 'Haier'],
  ['HAVIT', 'Havit'],
  ['HISENSE', 'Hisense'],
  ['HISENSI', 'Hisense'],
  ['HOMMY', 'Hommy'],
  ['INOCHI', 'Inochi'],
  ['JINCASE', 'Jincase'],
  ['JUNGER', 'Junger'],
  ['KACHI', 'Kachi'],
  ['KAROFI', 'KAROFI'],
  ['KIDCARE', 'Kidcare'],
  ['KODAK', 'KODAK'],
  ['LIVOTEC', 'LIVOTEC'],
  ['MASSTEL', 'Masstel'],
  ['MISHIO', 'Mishio'],
  ['MUTOSI', 'Mutosi'],
  ['NAMILUX', 'Namilux'],
  ['NANOMAX', 'Nanomax'],
  ['PALOMA', 'Paloma'],
  ['PROMAS', 'Promas'],
  ['PRAMIE', 'Pramie'],
  ['RAPIDO', 'Rapido'],
  ['RAPOO', 'Rapoo'],
  ['REALME', 'Realme'],
  ['RINNAI', 'Rinnai'],
  ['SAKURA', 'Sakura'],
  ['SAMSUNG', 'Samsung'],
  ['SANAKY', 'Sanaky'],
  ['SANDISK', 'Sandisk'],
  ['SANYO', 'Sanyo'],
  ['SOUMAX', 'Soumax'],
  ['SUNRA', 'Sunra'],
  ['SUPOR', 'Supor'],
  ['TP-LINK', 'TP-LINK'],
  ['UGREEN', 'Ugreen'],
  ['VIETEL', 'Viettel'],
  ['XIAOMI', 'Xiaomi'],
  ['ANKER', 'Anker'],
  ['APPLE', 'Apple'],
  ['ARISTO', 'Ariston'],
  ['CANON', 'Canon'],
  ['DAHUA', 'Dahua'],
  ['DELL', 'Dell'],
  ['DMAX', 'DMAX'],
  ['ELIO', 'ELIO'],
  ['EPSON', 'Epson'],
  ['ESAY', 'Esay'],
  ['EVIC', 'Evic'],
  ['GAMA', 'GAMA'],
  ['HONOR', 'Honor'],
  ['IMOU', 'Imou'],
  ['ITEL', 'Itel'],
  ['JAMMY', 'Jammy'],
  ['JBL', 'Jbl'],
  ['JOIE', 'Joie'],
  ['MOBEL', 'Mobell'],
  ['MODI', 'MODI'],
  ['MUTOS', 'Mutosi'],
  ['NOKIA', 'Nokia'],
  ['PUMAX', 'PUMAX'],
  ['REOLINK', 'Reolink'],
  ['SHARP', 'Sharp'],
  ['SUUNTO', 'Suunto'],
  ['TEFAL', 'Tefal'],
  ['TOGO', 'Togo'],
  ['UNIQ', 'UNIQ'],
  ['VIEON', 'VIEON'],
  ['VPLINK', 'VPLink'],
  ['ZINC', 'Zinc'],
  ['AQUA', 'Aqua'],
  ['ASUS', 'Asus'],
  ['BEKO', 'Beko'],
  ['BOSE', 'Bose'],
  ['BOSCH', 'Bosch'],
  ['COEX', 'Coex'],
  ['DARE', 'Dareu'],
  ['DELL', 'Dell'],
  ['ELIO', 'ELIO'],
  ['IMOO', 'Imoo'],
  ['IPHONE', 'iPhone'],
  ['ITEL', 'Itel'],
  ['JOIE', 'Joie'],
  ['OPPO', 'OPPO'],
  ['SONY', 'Sony'],
  ['TCL', 'TCL'],
  ['TECN', 'TECNO'],
  ['VIVO', 'Vivo'],
  ['AC', 'AC'],
  ['AS', 'Asia'],
  ['AV', 'Ava'],
  ['LG', 'LG'],
  ['MD', 'M.D'],
  ['HP', 'HP'],
  ['HR', 'Haier'],
  ['O.TECH', 'O.Tech'],
  ['ĐIỆN QUANG', 'Điện Quang']
];

const NHOM_HANG_MAP: Record<string, { large: string, small: string }> = {
  "4479 - Dịch Vụ Bảo Hiểm": { large: "BẢO HIỂM", small: "B.HIỂM" },
  "4499 - Thu Hộ Phí Bảo Hiểm": { large: "BẢO HIỂM", small: "B.HIỂM" },
  "1098 - Máy lạnh (IMEI)": { large: "CE", small: "ML" },
  "911 - Máy nước nóng": { large: "CE", small: "MNN" },
  "1097 - Tủ lạnh (IMEI)": { large: "CE", small: "TL" },
  "893 - Tủ đông": { large: "CE", small: "TL" },
  "894 - Tủ mát": { large: "CE", small: "TL" },
  "1099 - Máy giặt (IMEI)": { large: "CE", small: "MG" },
  "3659 - Máy sấy lồng ngang": { large: "CE", small: "MG" },
  "3859 - Máy rửa chén": { large: "CE", small: "MG" },
  "880 - Loa Karaoke": { large: "CE", small: "AUDIO" },
  "1094 - Tivi LED (IMEI)": { large: "CE", small: "TIVI" },
  "3241 - Dao/Kéo/Thớt": { large: "DCNB", small: "" },
  "3263 - Chảo": { large: "DCNB", small: "" },
  "3187 - Bình/Ly/Ca giữ nhiệt": { large: "DCNB", small: "" },
  "3185 - Vệ sinh nhà cửa": { large: "DCNB", small: "" },
  "3265 - Nồi": { large: "DCNB", small: "" },
  "2999 - Dụng cụ nhà bếp khác": { large: "DCNB", small: "" },
  "3240 - Hộp/Hũ": { large: "DCNB", small: "" },
  "4302 - Nón bảo hiểm các loại": { large: "DCNB", small: "" },
  "4171 - Lọc nước dạng tủ đứng": { large: "ĐIỆN GD", small: "MLN" },
  "4150 - Máy nước nóng lạnh": { large: "ĐIỆN GD", small: "CNL" },
  "4172 - Lọc nước âm tủ/trên bàn": { large: "ĐIỆN GD", small: "MLN" },
  "4144 - Bếp gas âm": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "3779 - Bếp điện âm": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4148 - Bếp điện đôi": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4339 - Ổn Áp": { large: "ĐIỆN GD", small: "" },
  "4459 - Quạt Trần": { large: "ĐIỆN GD", small: "QUẠT" },
  "955 - Hút mùi/ hút khói": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4146 - Bếp gas đôi": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "956 - Hút bụi": { large: "ĐIỆN GD", small: "HÚT BỤI" },
  "4155 - Hút bụi cây": { large: "ĐIỆN GD", small: "HÚT BỤI" },
  "4439 - Hút Bụi Robot": { large: "ĐIỆN GD", small: "HÚT BỤI" },
  "3639 - Máy lọc không khí": { large: "ĐIỆN GD", small: "HÚT BỤI" },
  "6000 - Máy ép trái cây": { large: "ĐIỆN GD", small: "XAY ÉP" },
  "4099 - Nồi chiên": { large: "ĐIỆN GD", small: "N.CHIÊN" },
  "4156 - Nồi cơm nắp gài/nắp rời": { large: "ĐIỆN GD", small: "NC NẮP RỜI" },
  "4158 - Nồi cơm điện tử": { large: "ĐIỆN GD", small: "NC Đ.TỬ" },
  "4157 - Nồi cơm cao tần": { large: "ĐIỆN GD", small: "NC Đ.TỬ" },
  "4660 - Quạt lửng": { large: "ĐIỆN GD", small: "QUẠT" },
  "4160 - Quạt bàn/hộp/sạc": { large: "ĐIỆN GD", small: "QUẠT" },
  "4159 - Quạt đứng": { large: "ĐIỆN GD", small: "QUẠT" },
  "4161 - Quạt treo": { large: "ĐIỆN GD", small: "QUẠT" },
  "3799 - Quạt điều hòa": { large: "ĐIỆN GD", small: "QĐH" },
  "4154 - Xay ép/Khác": { large: "ĐIỆN GD", small: "XAY ÉP" },
  "4153 - Xay Sinh tố": { large: "ĐIỆN GD", small: "XAY ÉP" },
  "4149 - Bình thủy điện": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "958 - Lò vi sóng": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "967 - Sấy tóc": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4142 - Bình đun siêu tốc": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4145 - Bếp gas đơn": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4141 - Bàn ủi khô": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4151 - Áp suất/lẩu/chiên/nướng": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4140 - Bàn ủi hơi nước": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "957 - Lò nướng": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4143 - Bàn ủi hơi nước đứng": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4152 - Ổ cắm điện/vợt muỗi": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4147 - Bếp điện đơn": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4139 - Đèn bàn/Đèn Sạc/Đèn bắt muỗi": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4062 - Đồng hồ Nữ Dây kim loại": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4061 - Đồng hồ Nam Dây khác": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4059 - Đồng hồ Nam Dây kim loại": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4070 - Đồng hồ Trẻ em": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4063 - Đồng hồ Nữ Dây da": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4064 - Đồng hồ Nữ Dây khác": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4060 - Đồng hồ Nam Dây da": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "3359 - Phụ kiện đồng hồ": { large: "ĐỒNG HỒ", small: "" },
  "4125 - Smartband": { large: "ĐỒNG HỒ", small: "" },
  "2391 - Smartwatch": { large: "ĐỒNG HỒ", small: "" },
  "1491 - Smartphone": { large: "ICT", small: "SMP" },
  "42 - Laptop": { large: "ICT", small: "LAP" },
  "931 - Máy tính bảng": { large: "ICT", small: "TAB" },
  "6479 - Camera IP Trong nhà": { large: "PHỤ KIỆN", small: "CAM" },
  "4219 - Camera IP Ngoài trời": { large: "PHỤ KIỆN", small: "CAM" },
  "4779 - Loa di động - imei": { large: "PHỤ KIỆN", small: "LOA" },
  "1031 - Loa di động": { large: "PHỤ KIỆN", small: "LOA" },
  "12 - Pin sạc dự phòng": { large: "PHỤ KIỆN", small: "SDP" },
  "2651 - Pin sạc dự phòng đa dạng": { large: "PHỤ KIỆN", small: "SDP" },
  "3346 - Tai Nghe Bluetooth": { large: "PHỤ KIỆN", small: "TN BLT" },
  "4540 - Tai Nghe Bluetooth - imei": { large: "PHỤ KIỆN", small: "TN BLT" },
  "15 - Tai nghe dây": { large: "PHỤ KIỆN", small: "TN DÂY" },
  "3345 - Cáp": { large: "PHỤ KIỆN", small: "CÁP" },
  "14 - Sạc/ Adapter": { large: "PHỤ KIỆN", small: "ADAPTER" },
  "531 - Pin": { large: "PHỤ KIỆN", small: "" },
  "4095 - Cáp (Giá Rẻ)": { large: "PHỤ KIỆN", small: "CÁP" },
  "16 - Thẻ Nhớ": { large: "PHỤ KIỆN", small: "T.NHỚ" },
  "4659 - Phụ kiện tiện ích Apple": { large: "PHỤ KIỆN", small: "PK APPLE" },
  "4900 - Bàn phím": { large: "PHỤ KIỆN", small: "" },
  "10 - Chuột": { large: "PHỤ KIỆN", small: "CHUỘT" },
  "6400 - Phụ kiện tiện ích Apple - imei": { large: "PHỤ KIỆN", small: "PK APPLE" },
  "2351 - Router - Imei": { large: "PHỤ KIỆN", small: "" },
  "2831 - Phụ kiện trang trí Apple": { large: "PHỤ KIỆN", small: "PK APPLE" },
  "2691 - Bộ Sạc/Cáp/Adaptor (Giá Rẻ)": { large: "PHỤ KIỆN", small: "CÁP" },
  "73 - Phụ kiện điện máy": { large: "PHỤ KIỆN", small: "" },
  "3479 - Thiết bị mạng khác": { large: "PHỤ KIỆN", small: "" },
  "871 - USB": { large: "PHỤ KIỆN", small: "" },
  "4199 - Miếng Dán Kính": { large: "PHỤ KIỆN", small: "M.DÁN" },
  "1231 - Miếng dán mặt trước": { large: "PHỤ KIỆN", small: "M.DÁN" },
  "58 - Miếng dán mặt sau": { large: "PHỤ KIỆN", small: "M.DÁN" },
  "431 - Ốp Lưng - Flip Cover": { large: "PHỤ KIỆN", small: "ỐP LƯNG" },
  "5975 - Balo Túi Chống Sốc": { large: "PHỤ KIỆN", small: "BALO" },
  "410 - Phụ kiện TT khác": { large: "PHỤ KIỆN", small: "" },
  "1351 - Loa vi tính (imei)": { large: "PHỤ KIỆN", small: "LOA" },
  "1891 - Sim Online": { large: "SIM", small: "SIM" },
  "4179 - Sim Online Số Đẹp": { large: "SIM", small: "SIM" },
  "571 - UDDĐ": { large: "VIEON", small: "VIEON" },
  "4741 - Xe Đạp Trẻ Em": { large: "XE ĐẠP", small: "XE ĐẠP" },
  "4742 - Xe Đạp Người Lớn": { large: "XE ĐẠP", small: "XE ĐẠP" },
  "4324 - Khung treo, giá đỡ": { large: "KHUNG TREO", small: "KHUNG TREO" },
  "4169 - Lõi lọc": { large: "LÕI LỌC", small: "LÕI LỌC" },
  "7161 - Dịch vụ bảo hành 1 đổi 1 Thợ Điện Máy Xanh": { large: "B.Hiểm", small: "B.Hiểm" }
};

const NHOM_SMALL_DISPLAY: Record<string, string> = {
  'ML': 'Máy lạnh', 'MNN': 'Máy nước nóng', 'TL': 'Tủ lạnh', 'MG': 'Máy giặt',
  'AUDIO': 'Loa Karaoke', 'TIVI': 'Tivi', 'MLN': 'Lọc nước', 'QĐH': 'Quạt ĐH', 'CNL': 'Cây Nóng/Lạnh',
  'NC NẮP RỜI': 'NC nắp rời', 'NC Đ.TỬ': 'NC điện tử', 'NC': 'Nồi cơm',
  'HÚT BỤI': 'Hút bụi', 'BẾP GAS/ĐIỆN/HÚT MÙI': 'Bếp', 'XAY ÉP/S.TỐ': 'Xay ép',
  'XAY ÉP': 'Xay ép',
  'N.CHIÊN': 'Nồi chiên', 'ĐGD KHÁC': 'ĐGD khác', 'QUẠT': 'Quạt',
  'SMP': 'Smartphone', 'LAP': 'Laptop', 'TAB': 'Máy tính bảng',
  'TN BLT': 'Tai nghe BT', 'TN DÂY': 'Tai nghe dây', 'CÁP': 'Cáp',
  'ADAPTER': 'Sạc', 'T.NHỚ': 'Thẻ nhớ', 'M.DÁN': 'Miếng dán',
  'ỐP LƯNG': 'Ốp lưng', 'PK APPLE': 'PK Apple', 'BALO': 'Balo/Túi',
  'CAM': 'Camera', 'LOA': 'Loa', 'PIN SDP': 'Pin sạc', 'SIM': 'Sim',
  'SDP': 'Pin sạc',
  'CHUỘT': 'Chuột', 'Đ.HỒ': 'Đồng hồ', 'B.HIỂM': 'Bảo hiểm',
  'B.Hiểm': 'Bảo hiểm',
  'XE ĐẠP': 'Xe đạp', 'VIEON': 'VieON', 'KHUNG TREO': 'Khung treo', 'LÕI LỌC': 'Lõi lọc',
  'CHĂM SÓC SẮC ĐẸP': 'Chăm sóc sắc đẹp',
  'ĐIỆN THOẠI DI ĐỘNG': 'Điện thoại di động',
  'ĐỒNG HỒ THỜI TRANG': 'Đồng hồ thời trang',
  'WEARABLE': 'Wearable',
  'BHXM': 'BHXM', 'BHRV': 'BHRV', 'BHMR': 'BHMR', 'BHKV': 'BHKV', 'SC+': 'SC+', '1 ĐỔI 1': '1 ĐỔI 1',
  'APPLE+': 'APPLE+', 'ANM': 'ANM', 'BH.HOME': 'BH.HOME', 'BHYT': 'BHYT', 'BHXH': 'BHXH', 'BVMH': 'BVMH',
  'PK LẮP ĐẶT': 'PK lắp đặt', 'PHỤ KIỆN LẮP ĐẶT': 'PK lắp đặt',
  'DCNB': 'Dụng cụ nhà bếp',
  'PK KHÁC': 'PK khác', 'MÁY IN': 'Máy in', 'ĐÈN NĂNG LƯỢNG MẶT TRỜI': 'Đèn năng lượng mặt trời',
};

const NGANH_DISPLAY: Record<string, string> = {
  "CE": "CE",
  "ICT": "ICT",
  "ĐIỆN GD": "Gia dụng",
  "PHỤ KIỆN": "Phụ kiện",
  "DCNB": "DCNB",
  "BẢO HIỂM": "Bảo hiểm",
  "ĐỒNG HỒ": "Đồng hồ",
  "ĐỒNG HỒ THỜI TRANG": "Đồng hồ thời trang",
  "PHỤ KIỆN LẮP ĐẶT": "Phụ kiện lắp đặt",
  "SIM": "Sim",
  "IT": "IT",
  "THỂ CÀO": "Thẻ cào",
  "THÊN CÀO": "Thẻ cào",
  "VIEON": "VieON",
  "WEARABLE": "Wearable",
  "CHĂM SÓC SẮC ĐẸP": "Chăm sóc sắc đẹp",
  "XE ĐẠP": "Xe đạp",
};

const classifyProductByCode = (code: string): string | null => {
  const cleanCode = String(code || '').trim();
  if (!cleanCode) return null;
  if (cleanCode.startsWith('177655900')) return 'APPLE+';
  if (cleanCode.startsWith('46444990000')) return 'BHXM';
  return PRODUCT_CODE_MAP[cleanCode] || null;
};

const classifyProduct = (name: string) => {
  const n = String(name || '').toUpperCase();
  if (n.includes('ICALLME') || n.includes('ICALL')) return 'Icall';
  if (n.includes('MANGO')) return 'Mango';
  if (n.includes('GIC-BOLTTECH_BẢO VỆ MÀN HÌNH') || n.includes('BẢO VỆ MÀN HÌNH') || n.includes('BVMH')) return 'BVMH';
  if (n.includes('1 ĐỔI 1')) return '1 ĐỔI 1';
  if (n.includes('BẢO HIỂM KHOẢN VAY')) return 'BHKV';
  if (n.includes('BHMR')) return 'BHMR';
  if (n.includes('BẢO HÀNH MỞ RỘNG')) return 'BHMR';
  if (n.includes('BẢO HIỂM RƠI VỠ')) return 'BHRV';
  if (n.includes('BẢO HIỂM SC+')) return 'SC+';
  if (n.includes('BẢO HÀNH APPLECARE+')) return 'BHAP';
  if (n.includes('BẢO HIỂM Ô TÔ')) return 'BHOT';
  if (n.includes('BẢO HIỂM VẬT CHẤT')) return 'BHVC';
  if (n.includes('BẢO HIỂM XE MẤY')) return 'BHXM';
  if (n.includes('BẢO HIỂM XE MOTO')) return 'BHMT';
  if (n.includes('BẢO HIỂM XÃ HỘI')) return 'BHXH';
  if (n.includes('BẢO HIỂM Y TẾ')) return 'BHYT';
  if (n.includes('01 THÁNG')) return 'V1';
  if (n.includes('03 THÁNG')) return 'V2';
  if (n.includes('06 THÁNG')) return 'V4';
  return '-';
};

const classifyNhomHangLargeRaw = (category: string, productName?: string): string => {
  const cat = String(category || '').trim();
  const prod = String(productName || '').trim();
  const catLower = cat.toLowerCase();
  const prodLower = prod.toLowerCase();
  const normCat = removeAccents(cat);
  const normProd = removeAccents(prod);

  const pClass = classifyProduct(prod);
  if (['BHXM', 'BHRV', 'BHMR', 'BHKV', 'SC+', '1 ĐỔI 1'].includes(pClass)) {
    if (pClass !== '1 ĐỔI 1' || normCat.includes('1841') || normCat.includes('1994') || normCat.includes('7139') || normCat.includes('khac') || normCat.includes('bao hiem') || !cat) {
      return 'BẢO HIỂM';
    }
  }

  if (
    normProd.includes('non bao hiem') ||
    normProd.includes('mu bao hiem') ||
    normCat.includes('non bao hiem') ||
    normCat.includes('mu bao hiem')
  ) {
    return 'DCNB';
  }

  if (!cat) return 'Khác';

  if (
    normCat.includes('bao hiem') ||
    normProd.includes('bao hiem') ||
    normCat.includes('dich vu bao hiem') ||
    normCat.includes('thu ho phi bao hiem') ||
    normCat.includes('1994') ||
    normCat.includes('7139') ||
    normCat.includes('bao hanh, bao duong') ||
    normCat.includes('bao hanh mo rong')
  ) {
    return 'BẢO HIỂM';
  }

  if (
    catLower.includes('wearable') ||
    catLower.includes('smartband') ||
    catLower.includes('smartwatch') ||
    prodLower.includes('smartwatch') ||
    prodLower.includes('smartband') ||
    prodLower.includes('wearable')
  ) {
    return 'WEARABLE';
  }

  if (NHOM_HANG_MAP[cat]?.large) {
    const mapped = NHOM_HANG_MAP[cat].large;
    if (mapped === 'ĐỒNG HỒ') {
      if (catLower.includes('smartwatch') || catLower.includes('smartband') || catLower.includes('smart') || prodLower.includes('smart')) {
        return 'WEARABLE';
      }
      return 'ĐỒNG HỒ THỜI TRANG';
    }
    return mapped;
  }

  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    if (key.toLowerCase() === catLower) {
      const mapped = val.large;
      if (mapped === 'ĐỒNG HỒ') {
        if (key.toLowerCase().includes('smartwatch') || key.toLowerCase().includes('smartband') || catLower.includes('smart') || prodLower.includes('smart')) {
          return 'WEARABLE';
        }
        return 'ĐỒNG HỒ THỜI TRANG';
      }
      return mapped;
    }
  }

  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    const parts = key.split(' - ');
    if (parts.length === 2) {
      const name = parts[1].trim().toLowerCase();
      if (catLower === name || catLower.includes(name) || name.includes(catLower)) {
        const mapped = val.large;
        if (mapped === 'ĐỒNG HỒ') {
          if (name.includes('smartwatch') || name.includes('smartband') || catLower.includes('smart') || prodLower.includes('smart')) {
            return 'WEARABLE';
          }
          return 'ĐỒNG HỒ THỜI TRANG';
        }
        return mapped;
      }
    }
  }

  if (catLower.includes('phụ kiện lắp đặt')) return 'PHỤ KIỆN LẮP ĐẶT';
  return 'Khác';
};

const classifyNhomHangLarge = (category: string, productName?: string): string => {
  const res = classifyNhomHangLargeRaw(category, productName);
  if (res === 'DCNB') return 'ĐIỆN GD';
  return res;
};

const resolveNhomSmall = (category: string, nhomSmallValue: string, nhomLarge: string, productName?: string): string => {
  const cat = String(category || '').trim();
  const prod = String(productName || '').trim();
  const catLower = cat.toLowerCase();
  
  if (nhomLarge === 'BẢO HIỂM') {
    return classifyProduct(prod);
  }

  if (nhomLarge === 'ĐIỆN GD') {
    const rawLarge = classifyNhomHangLargeRaw(category, productName);
    if (rawLarge === 'DCNB') return 'DCNB';
  }

  if (NHOM_HANG_MAP[cat]?.small) {
    return NHOM_HANG_MAP[cat].small;
  }

  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    if (key.toLowerCase() === catLower) {
      return val.small;
    }
  }

  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    const parts = key.split(' - ');
    if (parts.length === 2) {
      const name = parts[1].trim().toLowerCase();
      if (catLower === name || catLower.includes(name) || name.includes(catLower)) {
        return val.small;
      }
    }
  }

  if (nhomSmallValue) return nhomSmallValue;
  return '-';
};

const extractBrand = (productName: string): string => {
  const upper = productName.toUpperCase();
  if (upper.includes('IPHONE')) return 'iPhone';
  for (const [keyword, displayName] of BRAND_DEFINITIONS) {
    if (keyword.length <= 3) {
      const regex = new RegExp(`(?:^|[\\s\\-\\_\\/\\(\\)])${keyword}(?:[\\s\\-\\_\\/\\(\\)]|$)`);
      if (regex.test(upper)) return displayName;
      if (upper.startsWith(keyword + ' ') || upper.startsWith(keyword + '-')) return displayName;
    } else {
      if (upper.includes(keyword)) return displayName;
    }
  }
  return 'Khác';
};

const resolveBrandForProduct = (productName: string, nhomSmall: string): string => {
  if (nhomSmall === 'CAM') {
    const prodLower = productName.toLowerCase();
    const normProd = removeAccents(prodLower);
    if (prodLower.includes('ngoài trời') || normProd.includes('ngoai troi') ||
        prodLower.includes('outdoor') || prodLower.includes('bullet') ||
        prodLower.includes('chống nước') || normProd.includes('chong nuoc')) {
      return 'Ngoài trời';
    }
    return 'Trong nhà';
  }
  return extractBrand(productName);
};

const getRowDtqd = (nhomLarge: string, qty: number, revenue: number, nhomSmall?: string, isTraGop?: boolean) => {
  let rate = 1.0;
  if (nhomLarge === 'ICT') {
    if (nhomSmall === 'LAP' || nhomSmall === 'TAB' || nhomSmall === 'TABLET') {
      rate = 1.20;
    }
  } else if (nhomLarge === 'CE') {
    if (nhomSmall === 'AUDIO') {
      rate = 1.29;
    }
  } else if (nhomLarge === 'ĐIỆN GD' || nhomLarge === 'PHỤ KIỆN LẮP ĐẶT' || nhomLarge === 'Gia dụng lắp đặt') {
    if (nhomSmall === 'DCNB') {
      rate = 1.92;
    } else {
      rate = 1.85;
    }
  } else if (nhomLarge === 'BẢO HIỂM' || nhomLarge === 'B.HIỂM') {
    rate = 4.18;
  } else if (nhomLarge === 'SIM') {
    rate = 5.45;
  } else if (nhomLarge === 'VIEON') {
    rate = 5.45;
  } else if (nhomLarge === 'CHĂM SÓC SẮC ĐẸP') {
    rate = 1.85;
  } else if (nhomLarge === 'ĐỒNG HỒ' || nhomLarge === 'ĐỒNG HỒ THỜI TRANG' || nhomLarge === 'WEARABLE') {
    rate = 3.00;
  } else if (nhomLarge === 'PHỤ KIỆN') {
    rate = 3.37;
  } else if (nhomLarge === 'DCNB') {
    rate = 1.92;
  } else if (nhomLarge === 'IT') {
    rate = 2.00;
  }

  if (isTraGop) {
    return (revenue * rate) + (revenue * 0.3);
  }
  return revenue * rate;
};

const getNganhName = (key: string) => NGANH_DISPLAY[key] || key;

const fmtTr = (v: number): string => {
  if (!v || v === 0) return '-';
  const absVal = Math.abs(v);
  if (absVal >= 1_000_000_000) {
    const tỷ = v / 1_000_000_000;
    return `${tỷ % 1 === 0 ? tỷ.toFixed(0) : tỷ.toFixed(1)} Tỷ`;
  }
  if (absVal >= 1_000_000) {
    const m = v / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} Tr`;
  }
  if (absVal >= 1_000) {
    const k = v / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} K`;
  }
  return String(v);
};

const fmtDiff = (curr: number, prev: number, isMoney = false, toFixed?: number): React.ReactNode => {
  const diff = curr - prev;
  if (diff === 0) return <span className="text-slate-300">-</span>;

  let val = '';
  if (toFixed !== undefined) {
    if (Math.abs(diff).toFixed(toFixed) === (0).toFixed(toFixed)) {
      return <span className="text-slate-300">-</span>;
    }
    val = Math.abs(diff).toFixed(toFixed);
  } else {
    val = isMoney ? fmtTr(Math.abs(diff)) : Math.abs(diff).toLocaleString();
  }

  const sign = diff > 0 ? '+' : '-';
  const color = diff > 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold';
  return <span className={`text-[10px] font-black ${color}`}>{sign}{val}</span>;
};

const getColumnIndices = (headers: string[]) => {
  const lowerHeaders = headers.map(h => removeAccents(h).toLowerCase().trim());
  const findIdx = (names: string[], defaultIdx: number) => {
    const normalizedNames = names.map(n => removeAccents(n).toLowerCase().trim());
    for (const name of normalizedNames) {
      const exactIdx = lowerHeaders.findIndex(h => h === name);
      if (exactIdx !== -1) return exactIdx;
      const partialIdx = lowerHeaders.findIndex(h => {
        if (name === 'nhom hang' && h.includes('nho')) return false;
        if (name === 'nganh hang' && h.includes('lon')) return false;
        return h.includes(name);
      });
      if (partialIdx !== -1) return partialIdx;
    }
    return defaultIdx;
  };

  const idxStaff = findIdx(['người tạo', 'nhân viên', 'tên nhân viên', 'người bán', 'user tạo'], 23);
  const idxQty = findIdx(['số lượng', 'sl'], 35);
  
  const idxRevenue = (() => {
    const giaBan1Idx = lowerHeaders.findIndex(h => h === 'gia ban_1' || h === 'gia ban 1' || (h.includes('gia ban') && h.includes('1')));
    if (giaBan1Idx !== -1) return giaBan1Idx;
    return findIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá trị', 'giá bán'], 37);
  })();

  const idxCategory = findIdx(['ngành hàng', 'nhóm ngành hàng', 'nhóm hàng'], 40);
  const idxSmallCat = findIdx(['nhóm hàng nhỏ'], -1);
  const idxProduct = (() => {
    const exact = lowerHeaders.findIndex(h => h === 'tên sản phẩm' || h === 'ten san pham');
    if (exact !== -1) return exact;
    const partial = lowerHeaders.findIndex(h => h.startsWith('tên sản phẩm') || h.startsWith('ten san pham') || h === 'tên hàng' || h === 'ten hang');
    return partial !== -1 ? partial : 33;
  })();

  const idxMarket = findIdx(['mã kho tạo', 'mã kho', 'siêu thị', 'tên kho', 'kho'], 1);
  const idxHinhThucXuat = findIdx(['hình thức xuất', 'loại hình', 'loại ycx', 'loại yêu cầu'], 3);
  const idxStatus = findIdx(['trạng thái xuất', 'trạng thái'], 13);
  const idxTra = findIdx(['tình trạng nhập trả', 'trạng thái trả', 'trả hàng', 'nhập trả'], 44);

  return {
    idxStaff,
    idxQty,
    idxRevenue,
    idxCategory,
    idxSmallCat,
    idxProduct,
    idxMarket,
    idxHinhThucXuat,
    idxStatus,
    idxTra
  };
};

const processRowSignAndAlign = (row: any[]) => {
  if (!row || row.length === 0) return null;
  
  let sign: '+' | '-' | null = null;
  let cleanRow = [...row];
  
  const firstCell = String(row[0] || '').trim();
  
  if (firstCell === '+' || firstCell === '-' || firstCell === '—' || firstCell === '–') {
    sign = (firstCell === '+') ? '+' : '-';
    cleanRow = row.slice(1);
  } else {
    // Check if it starts with the sign prefix (e.g. "+ Chảo", "- NNH Điện gia dụng")
    if (firstCell.startsWith('+') || firstCell.startsWith('-') || firstCell.startsWith('—') || firstCell.startsWith('–')) {
      sign = firstCell.startsWith('+') ? '+' : '-';
      cleanRow[0] = firstCell.replace(/^[+\-—–]\s*/, '');
    } else {
      // Guess sign: if starts with "NNH ", it's parent (-), else child (+)
      if (firstCell.toLowerCase().startsWith('nnh ')) {
        sign = '-';
      } else {
        sign = '+';
      }
    }
  }
  
  return { sign, cleanRow };
};

const filterDataset = (rows: any[][], idxs: any) => {
  if (rows.length <= 1) return [];
  
  const results: any[][] = [];
  
  rows.slice(1).forEach(row => {
    const res = processRowSignAndAlign(row);
    if (!res) return;
    
    // Skip aggregate category header rows (where sign is '-') to avoid double counting
    if (res.sign === '-') return;
    
    const cleanRow = res.cleanRow;
    const statusVal = String(cleanRow[idxs.idxStatus] || '').trim().toLowerCase();
    const traVal = String(cleanRow[idxs.idxTra] || '').trim().toLowerCase();

    const isMatch = (statusVal === 'đã xuất' || !statusVal) && (traVal === 'chưa trả' || !traVal);
    if (isMatch) {
      results.push(cleanRow);
    }
  });
  
  return results;
};

const parseYcxRows = (data: string): any[][] => {
  if (!data) return [];
  let rows: any[][] = [];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else {
      rows = data.split('\n').map(line => line.split('\t'));
    }
  } catch (e) {
    rows = data.split('\n').map(line => line.split('\t'));
  }
  return rows.filter(r => r.length > 0 && r.some(c => String(c).trim() !== ''));
};

const BcDtNganhHang: React.FC = () => {
  const { currentStoreId, warehouseCode } = useStore();

  const [lastMonthData, setLastMonthData] = useState(() => localStorage.getItem('bcdtnh_last_month_data') || '');
  const [thisMonthData, setThisMonthData] = useState(() => localStorage.getItem('bcdtnh_this_month_data') || '');
  const [lastMonthFileName, setLastMonthFileName] = useState(() => localStorage.getItem('bcdtnh_last_month_filename') || '');
  const [thisMonthFileName, setThisMonthFileName] = useState(() => localStorage.getItem('bcdtnh_this_month_filename') || '');

  const [lastMonthCollapsed, setLastMonthCollapsed] = useState(false);
  const [thisMonthCollapsed, setThisMonthCollapsed] = useState(false);

  const [drillLevels, setDrillLevels] = useState<string[]>(['nganh', 'nhom', 'hang', 'sanpham']);
  const [draggedLevelIndex, setDraggedLevelIndex] = useState<number | null>(null);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [drillExpandDepth, setDrillExpandDepth] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);

  // Load data from Firebase when currentStoreId changes
  const loadStoreData = useCallback(async (storeId: string) => {
    if (!storeId || storeId === 'ALL') {
      setThisMonthData('');
      setThisMonthFileName('');
      setLastMonthData('');
      setLastMonthFileName('');
      return;
    }
    setIsLoadingDb(true);
    try {
      const docId = normalizeStoreId(storeId);
      const { data, error } = await supabase
        .from('store')
        .select('*')
        .eq('id', docId)
        .limit(1);

      if (error) throw error;
      const record = Array.isArray(data) ? data[0] : data;
      if (record) {
        const tData = record.bcdtnh_this_month_data || '';
        const tFile = record.bcdtnh_this_month_filename || '';
        const lData = record.bcdtnh_last_month_data || '';
        const lFile = record.bcdtnh_last_month_filename || '';

        setThisMonthData(tData);
        setThisMonthFileName(tFile);
        setLastMonthData(lData);
        setLastMonthFileName(lFile);

        localStorage.setItem('bcdtnh_this_month_data', tData);
        localStorage.setItem('bcdtnh_this_month_filename', tFile);
        localStorage.setItem('bcdtnh_last_month_data', lData);
        localStorage.setItem('bcdtnh_last_month_filename', lFile);
      } else {
        setThisMonthData('');
        setThisMonthFileName('');
        setLastMonthData('');
        setLastMonthFileName('');
        
        localStorage.removeItem('bcdtnh_this_month_data');
        localStorage.removeItem('bcdtnh_this_month_filename');
        localStorage.removeItem('bcdtnh_last_month_data');
        localStorage.removeItem('bcdtnh_last_month_filename');
      }
    } catch (err) {
      console.error('[BcDtNganhHang] Error loading from Firebase:', err);
    } finally {
      setIsLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    loadStoreData(currentStoreId);
  }, [currentStoreId, loadStoreData]);

  // Save data to Firebase
  const saveStoreData = useCallback(async (
    thisData = thisMonthData,
    thisFile = thisMonthFileName,
    lastData = lastMonthData,
    lastFile = lastMonthFileName
  ) => {
    if (!currentStoreId || currentStoreId === 'ALL') {
      alert('Vui lòng chọn siêu thị cụ thể để lưu dữ liệu!');
      return;
    }
    setIsSavingDb(true);
    try {
      const docId = normalizeStoreId(currentStoreId);
      const cleanMaKho = warehouseCode || '';
      
      const { error } = await supabase
        .from('store')
        .upsert({
          id: docId,
          warehouse_code: cleanMaKho,
          ten_sieu_thi: currentStoreId,
          bcdtnh_this_month_data: thisData,
          bcdtnh_this_month_filename: thisFile,
          bcdtnh_last_month_data: lastData,
          bcdtnh_last_month_filename: lastFile,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;
      console.log('[BcDtNganhHang] Data saved to Firestore successfully.');
    } catch (err: any) {
      console.error('[BcDtNganhHang] Error saving to Firebase:', err);
      alert(`Lỗi khi lưu dữ liệu lên Firebase: ${err.message}`);
    } finally {
      setIsSavingDb(false);
    }
  }, [currentStoreId, warehouseCode, thisMonthData, thisMonthFileName, lastMonthData, lastMonthFileName]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>, isCurrent: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    if (isCurrent) setThisMonthFileName(fileName);
    else setLastMonthFileName(fileName);

    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const rawString = data.map(row =>
          (Array.isArray(row) ? row : []).map(cell => cell === null || cell === undefined ? '' : String(cell).trim()).join('\t')
        ).join('\n');

        if (isCurrent) {
          setThisMonthData(rawString);
          localStorage.setItem('bcdtnh_this_month_data', rawString);
          localStorage.setItem('bcdtnh_this_month_filename', fileName);
          saveStoreData(rawString, fileName, lastMonthData, lastMonthFileName);
        } else {
          setLastMonthData(rawString);
          localStorage.setItem('bcdtnh_last_month_data', rawString);
          localStorage.setItem('bcdtnh_last_month_filename', fileName);
          saveStoreData(thisMonthData, thisMonthFileName, rawString, fileName);
        }
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleClearData = (isCurrent: boolean) => {
    if (isCurrent) {
      setThisMonthData('');
      setThisMonthFileName('');
      localStorage.removeItem('bcdtnh_this_month_data');
      localStorage.removeItem('bcdtnh_this_month_filename');
      saveStoreData('', '', lastMonthData, lastMonthFileName);
    } else {
      setLastMonthData('');
      setLastMonthFileName('');
      localStorage.removeItem('bcdtnh_last_month_data');
      localStorage.removeItem('bcdtnh_last_month_filename');
      saveStoreData(thisMonthData, thisMonthFileName, '', '');
    }
  };

  const currentRawRows = useMemo(() => parseYcxRows(thisMonthData), [thisMonthData]);
  const prevRawRows = useMemo(() => parseYcxRows(lastMonthData), [lastMonthData]);

  const { flatRows, prevNodesMap, totals } = useMemo(() => {
    const empty = { flatRows: [] as any[], prevNodesMap: new Map<string, any>(), totals: { sl: 0, dt: 0, tc_dt: 0, dtqd: 0, prevSl: 0, prevDt: 0 } };
    if (currentRawRows.length === 0) return empty;

    // Helper to find the actual header row in copy-pasted or excel data
    const findHeaderRowIdx = (rows: any[][]) => {
      return rows.findIndex(row => {
        if (!row || row.length < 2) return false;
        const rowStr = row.join(' ').toLowerCase();
        return rowStr.includes('số lượng') || rowStr.includes('sl') || rowStr.includes('doanh thu') || rowStr.includes('dt') || rowStr.includes('nhóm ngành hàng') || rowStr.includes('ngành hàng');
      });
    };

    const headerIdxCurrent = findHeaderRowIdx(currentRawRows);
    const currentHeaders = headerIdxCurrent !== -1 
      ? currentRawRows[headerIdxCurrent].map(h => String(h || '').trim())
      : currentRawRows[0].map(h => String(h || '').trim());
    const idxsCurrent = getColumnIndices(currentHeaders);
    const filteredCurrent = filterDataset(
      headerIdxCurrent !== -1 ? currentRawRows.slice(headerIdxCurrent) : currentRawRows,
      idxsCurrent
    );

    const headerIdxPrev = findHeaderRowIdx(prevRawRows);
    const prevHeaders = prevRawRows.length > 0
      ? (headerIdxPrev !== -1 ? prevRawRows[headerIdxPrev].map(h => String(h || '').trim()) : prevRawRows[0].map(h => String(h || '').trim()))
      : [];
    const idxsPrev = prevRawRows.length > 0 ? getColumnIndices(prevHeaders) : idxsCurrent;
    const filteredPrev = prevRawRows.length > 0
      ? filterDataset(headerIdxPrev !== -1 ? prevRawRows.slice(headerIdxPrev) : prevRawRows, idxsPrev)
      : [];

    const getLevelValueAndName = (lvl: string, row: any[], idxs: any) => {
      if (lvl === 'kho') {
        const val = String(row[idxs.idxMarket] || '').trim();
        return { key: val, name: val };
      }
      if (lvl === 'nganh') {
        const cat = String(row[idxs.idxCategory] || '').trim();
        const prod = String(row[idxs.idxProduct] || '').trim();
        const val = classifyNhomHangLarge(cat, prod);
        return { key: val, name: getNganhName(val) };
      }
      if (lvl === 'nhom') {
        const cat = String(row[idxs.idxCategory] || '').trim();
        const prod = String(row[idxs.idxProduct] || '').trim();
        const large = classifyNhomHangLarge(cat, prod);
        const smallVal = idxs.idxSmallCat !== -1 ? String(row[idxs.idxSmallCat] || '').trim().toUpperCase() : '';
        const val = resolveNhomSmall(cat, smallVal, large, prod);
        return { key: val, name: NHOM_SMALL_DISPLAY[val] || val };
      }
      if (lvl === 'hang') {
        const cat = String(row[idxs.idxCategory] || '').trim();
        const prod = String(row[idxs.idxProduct] || '').trim();
        const large = classifyNhomHangLarge(cat, prod);
        const smallVal = idxs.idxSmallCat !== -1 ? String(row[idxs.idxSmallCat] || '').trim().toUpperCase() : '';
        const small = resolveNhomSmall(cat, smallVal, large, prod);
        const val = resolveBrandForProduct(prod, small);
        return { key: val, name: val };
      }
      if (lvl === 'nguoitao') {
        const val = String(row[idxs.idxStaff] || '').trim();
        return { key: val, name: val };
      }
      if (lvl === 'sanpham') {
        const val = String(row[idxs.idxProduct] || '').trim();
        return { key: val, name: val };
      }
      return { key: '-', name: '-' };
    };

    const buildDrillTree = (rowsToBuild: any[][], levelsToUse: string[], idxs: any) => {
      const buildNode = (
        currentLevelRows: any[][],
        levelIndex: number,
        parentPath: string
      ): any[] => {
        if (levelIndex >= levelsToUse.length || currentLevelRows.length === 0) return [];

        const currentLevel = levelsToUse[levelIndex];
        const groups = new Map<string, { name: string; rows: any[][] }>();

        currentLevelRows.forEach(row => {
          const { key, name } = getLevelValueAndName(currentLevel, row, idxs);
          if (!groups.has(key)) {
            groups.set(key, { name, rows: [] });
          }
          groups.get(key)!.rows.push(row);
        });

        const nodes: any[] = [];
        groups.forEach(({ name, rows: nodeRows }, key) => {
          const nodePath = parentPath ? `${parentPath}.${key}` : key;

          let sl = 0;
          let dt = 0;
          let tc_dt = 0;
          let dtqd = 0;

          nodeRows.forEach(row => {
            const qty = Math.round(parseFloat(String(row[idxs.idxQty] || '0').replace(/,/g, '')) || 0);
            const revenue = Math.round(parseFloat(String(row[idxs.idxRevenue] || '0').replace(/,/g, '')) || 0);
            const htx = idxs.idxHinhThucXuat !== -1 ? String(row[idxs.idxHinhThucXuat] || '').toLowerCase() : '';
            const isTc = htx.includes('trả góp');
            const cat = String(row[idxs.idxCategory] || '').trim();
            const prod = String(row[idxs.idxProduct] || '').trim();
            const large = classifyNhomHangLarge(cat, prod);
            const smallVal = idxs.idxSmallCat !== -1 ? String(row[idxs.idxSmallCat] || '').trim().toUpperCase() : '';
            const small = resolveNhomSmall(cat, smallVal, large, prod);

            sl += qty;
            dt += revenue;
            if (isTc) tc_dt += revenue;
            dtqd += getRowDtqd(large, qty, revenue, small, isTc);
          });

          const children = buildNode(nodeRows, levelIndex + 1, nodePath);

          nodes.push({
            key: nodePath,
            nodeKey: key,
            levelKey: currentLevel,
            name,
            sl,
            dt,
            tc_dt,
            dtqd,
            children
          });
        });

        return nodes.sort((a, b) => b.dt - a.dt);
      };

      return buildNode(rowsToBuild, 0, '');
    };

    const drillTreeCurr = buildDrillTree(filteredCurrent, drillLevels, idxsCurrent);
    const drillTreePrev = filteredPrev.length > 0 ? buildDrillTree(filteredPrev, drillLevels, idxsPrev) : [];

    const map = new Map<string, any>();
    const traversePrev = (nodes: any[]) => {
      nodes.forEach(n => {
        map.set(n.key, n);
        if (n.children) traversePrev(n.children);
      });
    };
    traversePrev(drillTreePrev);

    const flattenTree = (nodes: any[], depth = 0, isVisible = true): any[] => {
      const result: any[] = [];
      nodes.forEach(node => {
        if (!isVisible) return;
        result.push({ ...node, depth });
        const isOpen = expandedRows[node.key] !== undefined
          ? expandedRows[node.key] === true
          : depth < drillExpandDepth;
        if (node.children && node.children.length > 0) {
          const flatChildren = flattenTree(node.children, depth + 1, isOpen);
          result.push(...flatChildren);
        }
      });
      return result;
    };

    const rawFlatRows = flattenTree(drillTreeCurr, 0, true);

    let totSl = 0, totDt = 0, totTc = 0, totDtqd = 0;
    drillTreeCurr.forEach(n => {
      totSl += n.sl;
      totDt += n.dt;
      totTc += n.tc_dt;
      totDtqd += n.dtqd;
    });

    let prevSl = 0;
    let prevDt = 0;
    if (prevRawRows.length > 0) {
      prevSl = filteredPrev.reduce((acc, r) => acc + (parseInt(r[idxsPrev.idxQty]) || 0), 0);
      prevDt = filteredPrev.reduce((acc, r) => acc + (parseInt(r[idxsPrev.idxRevenue]) || 0), 0);
    }

    return {
      flatRows: rawFlatRows,
      prevNodesMap: map,
      totals: { sl: totSl, dt: totDt, tc_dt: totTc, dtqd: totDtqd, prevSl, prevDt }
    };
  }, [currentRawRows, prevRawRows, drillLevels, expandedRows, drillExpandDepth]);

  const handleDragStart = (index: number) => {
    setDraggedLevelIndex(index);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };
  const handleDrop = (index: number) => {
    if (draggedLevelIndex === null) return;
    const newLevels = [...drillLevels];
    const [removed] = newLevels.splice(draggedLevelIndex, 1);
    newLevels.splice(index, 0, removed);
    setDrillLevels(newLevels);
    setDraggedLevelIndex(null);
  };

  const forceDesktopLayout = (element: HTMLElement) => {
    // Force categories grid to 2 columns
    const categoriesGrid = element.querySelector('.grid-cols-1.xl\\:grid-cols-2');
    if (categoriesGrid) {
      categoriesGrid.classList.add('force-grid-cols-2');
    }
  };

  const removeDesktopLayout = (element: HTMLElement) => {
    const categoriesGrid = element.querySelector('.grid-cols-1.xl\\:grid-cols-2');
    if (categoriesGrid) {
      categoriesGrid.classList.remove('force-grid-cols-2');
    }
  };

  const handleCapture = async () => {
    const element = document.getElementById('bcdtnh-table-capture-wrapper');
    if (!element) return;
    const originalPadding = element.style.padding;
    const originalBg = element.style.backgroundColor;
    const originalWidth = element.style.width;
    const originalMinWidth = element.style.minWidth;
    try {
      element.classList.add('capturing-target');
      document.body.classList.add('capturing-screenshot');

      // Expand all scrollable and overflow-hidden containers so we capture their full content
      const scrollContainers = element.querySelectorAll('.overflow-x-auto');
      const hiddenContainers = element.querySelectorAll('.overflow-hidden');
      const originalOverflows: { el: HTMLElement, overflowX: string, overflowY?: string }[] = [];
      scrollContainers.forEach(el => {
        const htmlEl = el as HTMLElement;
        originalOverflows.push({ el: htmlEl, overflowX: htmlEl.style.overflowX });
        htmlEl.style.overflowX = 'visible';
      });
      hiddenContainers.forEach(el => {
        const htmlEl = el as HTMLElement;
        originalOverflows.push({ el: htmlEl, overflowX: htmlEl.style.overflowX, overflowY: htmlEl.style.overflowY });
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.overflow = 'visible';
      });

      // Force desktop layout configurations for screenshot
      forceDesktopLayout(element);

      // Lock width to max-content to prevent column wrapping/clipping, but allow shrink-wrapping to eliminate whitespace
      element.style.width = 'max-content';
      element.style.minWidth = 'min-content';
      element.style.padding = '12px';
      element.style.backgroundColor = '#ffffff';

      // Small delay for browser rendering to adapt
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await domToPng(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      setPreviewImage(dataUrl);

      // Restore overflow styles
      originalOverflows.forEach(({ el, overflowX, overflowY }) => {
        el.style.overflowX = overflowX;
        if (overflowY !== undefined) el.style.overflowY = overflowY;
      });
    } catch (err) {
      console.error(err);
    } finally {
      element.style.padding = originalPadding;
      element.style.backgroundColor = originalBg;
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      element.classList.remove('capturing-target');
      removeDesktopLayout(element);
      document.body.classList.remove('capturing-screenshot');
    }
  };

  const filteredFlatRows = useMemo(() => {
    if (!searchTerm) return flatRows;
    const term = removeAccents(searchTerm).toLowerCase();
    return flatRows.filter(row => removeAccents(row.name).toLowerCase().includes(term));
  }, [flatRows, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .capturing-screenshot .no-capture { display: none !important; }
        .capturing-screenshot .capturing-screenshot-inline { display: inline !important; }
        
        /* Force CSS Grid columns to render identically to on-screen column layout during screenshot capture */
        .capturing-screenshot .force-grid-cols-6 {
          grid-template-columns: repeat(6, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-3 {
          grid-template-columns: repeat(3, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-2 {
          grid-template-columns: repeat(2, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-1 {
          grid-template-columns: 1fr !important;
          display: grid !important;
        }
        
        .capturing-screenshot .overflow-hidden {
          overflow: visible !important;
        }
      `}} />
      {/* Title */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-inner">
            <LayoutGrid size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">BC Doanh Thu Ngành Hàng</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">So sánh đối chiếu chi tiết các ngành hàng giữa 2 tháng lũy kế</p>
          </div>
        </div>

        {/* Sync Info Header */}
        <div className="flex items-center gap-2">
          {isLoadingDb ? (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-black bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 shadow-sm animate-pulse">
              <RefreshCw size={14} className="animate-spin" /> ĐANG TẢI FIREBASE...
            </div>
          ) : currentStoreId !== 'ALL' ? (
            <button
              onClick={() => saveStoreData()}
              disabled={isSavingDb}
              className="flex items-center gap-1.5 text-xs text-emerald-700 font-black bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm active:scale-95 transition-all"
            >
              <CloudUpload size={14} /> {isSavingDb ? 'ĐANG LƯU...' : 'LƯU FIREBASE'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Select Store Warning */}
      {currentStoreId === 'ALL' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-start gap-3 shadow-inner">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">Chọn siêu thị cụ thể</h4>
            <p className="text-xs text-amber-700 font-bold mt-1">Vui lòng chọn siêu thị cụ thể ở thanh tiêu đề phía trên để đồng bộ và lưu dữ liệu trực tiếp lên Firebase.</p>
          </div>
        </div>
      )}

      {/* Upload Panel Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Month 1: Last Month */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">📅 THÁNG TRƯỚC (KỲ TRƯỚC)</span>
            {lastMonthData && (
              <button
                onClick={() => handleClearData(false)}
                className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors uppercase"
              >
                <Trash2 size={12} /> Xóa dữ liệu
              </button>
            )}
          </div>



          <div>
            <button
              onClick={() => setLastMonthCollapsed(!lastMonthCollapsed)}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              {lastMonthCollapsed ? '› Hiển thị khung dán text' : 'v Thu gọn khung dán text'}
            </button>
            {!lastMonthCollapsed && (
              <textarea
                value={lastMonthData}
                onChange={(e) => {
                  setLastMonthData(e.target.value);
                  localStorage.setItem('bcdtnh_last_month_data', e.target.value);
                }}
                onBlur={() => saveStoreData(thisMonthData, thisMonthFileName, lastMonthData, lastMonthFileName)}
                placeholder="Dán dữ liệu cột YCX Tháng trước tại đây (copy từ Excel)..."
                className="w-full h-32 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono bg-white mt-2"
              />
            )}
          </div>
        </div>

        {/* Month 2: This Month */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">📅 THÁNG HIỆN TẠI (KỲ NÀY)</span>
            {thisMonthData && (
              <button
                onClick={() => handleClearData(true)}
                className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors uppercase"
              >
                <Trash2 size={12} /> Xóa dữ liệu
              </button>
            )}
          </div>



          <div>
            <button
              onClick={() => setThisMonthCollapsed(!thisMonthCollapsed)}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              {thisMonthCollapsed ? '› Hiển thị khung dán text' : 'v Thu gọn khung dán text'}
            </button>
            {!thisMonthCollapsed && (
              <textarea
                value={thisMonthData}
                onChange={(e) => {
                  setThisMonthData(e.target.value);
                  localStorage.setItem('bcdtnh_this_month_data', e.target.value);
                }}
                onBlur={() => saveStoreData(thisMonthData, thisMonthFileName, lastMonthData, lastMonthFileName)}
                placeholder="Dán dữ liệu cột YCX Tháng hiện tại tại đây (copy từ Excel)..."
                className="w-full h-32 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono bg-white mt-2"
              />
            )}
          </div>
        </div>
      </div>

      {/* Main comparative table section */}
      {flatRows.length > 0 && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm nhanh danh mục/ngành hàng..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50 font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5 no-capture">
                <button
                  onClick={() => setDrillExpandDepth(prev => Math.min(4, prev + 1))}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  + Mở rộng
                </button>
                <button
                  onClick={() => {
                    setDrillExpandDepth(0);
                    setExpandedRows({});
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  - Thu gọn
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCapture}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                <Camera size={14} /> CHỤP ẢNH BÁO CÁO
              </button>
            </div>
          </div>

          {/* Level Pills (Draggable) */}
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2 block w-full md:w-auto">CẤU TRÚC PHÂN CẤP (kéo thả để xếp lại):</span>
            <div className="flex flex-wrap items-center gap-2">
              {drillLevels.map((lvlKey, idx) => {
                const labelMap: Record<string, string> = {
                  kho: 'Kho', nganh: 'Ngành', nhom: 'Nhóm', hang: 'Hãng', nguoitao: 'Người bán', sanpham: 'Sản phẩm'
                };
                const bgMap: Record<string, string> = {
                  kho: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
                  nganh: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]',
                  nhom: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]',
                  hang: 'bg-[#fdf0f5] text-[#d0157a] border-[#fbcce2]',
                  nguoitao: 'bg-[#fef7e0] text-[#b06000] border-[#feebc8]',
                  sanpham: 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]'
                };
                return (
                  <div
                    key={lvlKey}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase shadow-sm cursor-grab active:cursor-grabbing select-none transition-all",
                      bgMap[lvlKey] || 'bg-white text-slate-500 border-slate-200'
                    )}
                  >
                    {lvlKey === 'kho' && <Store size={11} />}
                    {lvlKey === 'nganh' && <LayoutGrid size={11} />}
                    {lvlKey === 'nhom' && <Sliders size={11} />}
                    {lvlKey === 'hang' && <Building2 size={11} />}
                    {lvlKey === 'nguoitao' && <User size={11} />}
                    {lvlKey === 'sanpham' && <Package size={11} />}
                    <span>{labelMap[lvlKey] || lvlKey}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table Container Wrapper */}
          <div className="bg-white rounded-3xl border border-slate-300 shadow-xl overflow-hidden" id="bcdtnh-table-capture-wrapper">
            <div className="px-6 py-5 border-b border-slate-300 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-[#e11d48] tracking-tight uppercase">So sánh doanh thu ngành hàng</h3>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Số liệu chi tiết phân cấp ngành hàng đối chiếu theo tháng lũy kế</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200/50 [&_th]:border-r [&_th]:border-slate-200/50 [&_td]:border-r [&_td]:border-slate-200/50 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap font-sans" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 text-[13px] font-black uppercase">
                    <th rowSpan={2} className="py-2.5 px-4 text-left bg-slate-50 min-w-[240px] border-r border-slate-200/50 font-black align-middle">CHI TIẾT NGÀNH HÀNG</th>
                    <th colSpan={3} className="py-1 px-4 text-center text-[#047857] bg-[#e6fbf4] border-r border-slate-200/50 font-black border-b border-emerald-100">SỐ LƯỢNG</th>
                    <th colSpan={3} className="py-1 px-4 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 font-black border-b border-blue-100">DOANH THU</th>
                    <th colSpan={3} className="py-1 px-4 text-center text-[#b45309] bg-[#fef3c7] border-r border-slate-200/50 font-black border-b border-amber-100">DTQĐ</th>
                    <th colSpan={3} className="py-1 px-4 text-center text-[#6b21a8] bg-[#f3e8ff] border-r border-slate-200/50 font-black border-b border-purple-100">GIÁ TRỊ ĐH</th>
                    <th colSpan={3} className="py-1 px-4 text-center text-[#be123c] bg-[#ffe4e6] font-black border-b border-rose-100">TRẢ CHẬM</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 text-[10px] font-black uppercase">
                    <th className="py-1 px-2 text-center text-[#047857] bg-[#e6fbf4] border-r border-slate-200/50 w-20 font-black">Tháng này</th>
                    <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">Tháng trước</th>
                    <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] border-r border-slate-200/50 w-16 font-black">+/-</th>

                    <th className="py-1 px-2 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 w-20 font-black">Tháng này</th>
                    <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">Tháng trước</th>
                    <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] border-r border-slate-200/50 w-16 font-black">+/-</th>

                    <th className="py-1 px-2 text-center text-[#b45309] bg-[#fef3c7] border-r border-slate-200/50 w-20 font-black">Tháng này</th>
                    <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">Tháng trước</th>
                    <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] border-r border-slate-200/50 w-16 font-black">+/-</th>

                    <th className="py-1 px-2 text-center text-[#6b21a8] bg-[#f3e8ff] border-r border-slate-200/50 w-20 font-black">Tháng này</th>
                    <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">Tháng trước</th>
                    <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] border-r border-slate-200/50 w-16 font-black">+/-</th>

                    <th className="py-1 px-2 text-center text-[#be123c] bg-[#ffe4e6] border-r border-slate-200/50 w-20 font-black">Tháng này</th>
                    <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">Tháng trước</th>
                    <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] w-16 font-black">+/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px] font-black text-slate-700">
                  {filteredFlatRows.map(row => {
                    const nodePrev = prevNodesMap.get(row.key);
                    const hasChildren = row.children && row.children.length > 0;
                    const isExpanded = expandedRows[row.key] !== undefined
                      ? expandedRows[row.key] === true
                      : row.depth < drillExpandDepth;

                    const orderValue = row.sl > 0 ? (row.dt / 1000000) / row.sl : 0;
                    const prevOrderValue = nodePrev && nodePrev.sl > 0 ? (nodePrev.dt / 1000000) / nodePrev.sl : 0;
                    const tcPct = row.dt > 0 ? (row.tc_dt / row.dt) * 100 : 0;
                    const prevTcPct = nodePrev && nodePrev.dt > 0 ? (nodePrev.tc_dt / nodePrev.dt) * 100 : 0;

                    let textClass = 'text-slate-800';
                    if (row.levelKey === 'nganh') {
                      textClass = 'text-[#e11d48] font-black';
                    } else if (row.levelKey === 'nhom') {
                      textClass = 'text-indigo-600 font-bold';
                    } else if (row.levelKey === 'hang') {
                      textClass = 'text-amber-600 font-bold';
                    } else if (row.levelKey === 'sanpham') {
                      textClass = 'text-teal-700 font-bold';
                    }

                    return (
                      <tr key={row.key} className="border-b border-slate-100/70 hover:bg-slate-50/60 transition-colors h-10">
                        {/* Expandable Title */}
                        <td className="py-2 px-4 text-left border-r border-slate-200/50" style={{ paddingLeft: `${16 + row.depth * 20}px` }}>
                          <div className="flex items-center">
                            {hasChildren ? (
                              <button
                                onClick={() => {
                                  setExpandedRows(prev => ({
                                    ...prev,
                                    [row.key]: !isExpanded
                                  }));
                                }}
                                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 mr-1.5 transition-colors cursor-pointer shrink-0"
                              >
                                <ChevronRight size={14} className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            ) : (
                              <div className="w-5 h-5 mr-1.5 shrink-0" />
                            )}
                            <span className={textClass}>{row.name}</span>
                          </div>
                        </td>

                        {/* SL Columns */}
                        <td className="py-2 px-4 text-right border-r border-slate-200/50">{row.sl === 0 ? '-' : row.sl.toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-2 text-center bg-slate-50/50 text-[11px] font-black text-slate-400 border-r border-slate-200/50">
                          {nodePrev ? nodePrev.sl.toLocaleString('vi-VN') : "-"}
                        </td>
                        <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                          {nodePrev ? fmtDiff(row.sl, nodePrev.sl) : <span className="text-slate-300">-</span>}
                        </td>

                        {/* DT Columns */}
                        <td className="py-2 px-4 text-right border-r border-slate-200/50">{fmtTr(row.dt)}</td>
                        <td className="py-2 px-2 text-center bg-slate-50/50 text-[11px] font-black text-slate-400 border-r border-slate-200/50">
                          {nodePrev ? fmtTr(nodePrev.dt) : "-"}
                        </td>
                        <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                          {nodePrev ? fmtDiff(row.dt, nodePrev.dt, true) : <span className="text-slate-300">-</span>}
                        </td>

                        {/* DTQD Columns */}
                        <td className="py-2 px-4 text-right border-r border-slate-200/50">{fmtTr(row.dtqd)}</td>
                        <td className="py-2 px-2 text-center bg-slate-50/50 text-[11px] font-black text-slate-400 border-r border-slate-200/50">
                          {nodePrev ? fmtTr(nodePrev.dtqd) : "-"}
                        </td>
                        <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                          {nodePrev ? fmtDiff(row.dtqd, nodePrev.dtqd, true) : <span className="text-slate-300">-</span>}
                        </td>

                        {/* GTDH Columns */}
                        <td className="py-2 px-4 text-right border-r border-slate-200/50">{orderValue > 0 ? orderValue.toFixed(1) : '-'}</td>
                        <td className="py-2 px-2 text-center bg-slate-50/50 text-[11px] font-black text-slate-400 border-r border-slate-200/50">
                          {nodePrev && prevOrderValue > 0 ? prevOrderValue.toFixed(1) : "-"}
                        </td>
                        <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                          {nodePrev ? fmtDiff(orderValue, prevOrderValue, false, 1) : <span className="text-slate-300">-</span>}
                        </td>

                        {/* TRẢ CHẬM Columns */}
                        <td className="py-2 px-4 text-center border-r border-slate-200/50">{row.dt > 0 && row.tc_dt > 0 ? `${tcPct.toFixed(0)}%` : '-'}</td>
                        <td className="py-2 px-2 text-center bg-slate-50/50 text-[11px] font-black text-slate-400 border-r border-slate-200/50">
                          {nodePrev && nodePrev.dt > 0 && nodePrev.tc_dt > 0 ? `${prevTcPct.toFixed(0)}%` : "-"}
                        </td>
                        <td className="py-2 px-2 text-center bg-slate-50/30">
                          {nodePrev && (row.dt > 0 || nodePrev.dt > 0) ? fmtDiff(tcPct, prevTcPct, false, 0) : <span className="text-slate-300">-</span>}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#f8faff] border-t-2 border-slate-300 text-[13px] font-black text-slate-800">
                  <tr className="h-10">
                    <td className="py-2 px-4 text-center border-r border-slate-200/50 uppercase tracking-widest font-black">TỔNG CỘNG</td>
                    
                    {/* SL Total */}
                    <td className="py-2 px-4 text-right border-r border-slate-200/50">{totals.sl.toLocaleString('vi-VN')}</td>
                    <td className="py-2 px-2 text-center bg-slate-50/50 text-[11px] font-black text-slate-400 border-r border-slate-200/50">
                      {prevRawRows.length > 0 ? totals.prevSl.toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                      {prevRawRows.length > 0 ? fmtDiff(totals.sl, totals.prevSl) : '-'}
                    </td>

                    {/* DT Total */}
                    <td className="py-2 px-4 text-right border-r border-slate-200/50">{fmtTr(totals.dt)}</td>
                    <td className="py-2 px-2 text-center bg-slate-50/50 text-[11px] font-black text-slate-400 border-r border-slate-200/50">
                      {prevRawRows.length > 0 ? fmtTr(totals.prevDt) : '-'}
                    </td>
                    <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                      {prevRawRows.length > 0 ? fmtDiff(totals.dt, totals.prevDt, true) : '-'}
                    </td>

                    {/* DTQD Total */}
                    <td className="py-2 px-4 text-right border-r border-slate-200/50">{fmtTr(totals.dtqd)}</td>
                    <td className="py-2 px-2 text-center bg-slate-50/50 text-[11px] font-black text-slate-400 border-r border-slate-200/50">
                      {prevRawRows.length > 0 ? fmtTr(flatRows.reduce((acc, r) => {
                        const prevNode = prevNodesMap.get(r.key);
                        return acc + (prevNode ? prevNode.dtqd : 0);
                      }, 0)) : '-'}
                    </td>
                    <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                      {prevRawRows.length > 0 ? fmtDiff(totals.dtqd, flatRows.reduce((acc, r) => {
                        const prevNode = prevNodesMap.get(r.key);
                        return acc + (prevNode ? prevNode.dtqd : 0);
                      }, 0), true) : '-'}
                    </td>

                    <td colSpan={6} className="bg-slate-50/20"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {flatRows.length === 0 && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center">
          <FolderOpen size={48} className="text-slate-300 mb-3" />
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Chưa có dữ liệu so sánh</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">Vui lòng tải lên tệp Excel YCX hoặc dán văn bản báo cáo cho cả hai tháng để xem bảng phân tích so sánh đối chiếu.</p>
        </div>
      )}

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default BcDtNganhHang;
