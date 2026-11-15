import { removeVietnameseDiacritics } from '../src/utils/thiDuaAiParser';

export interface StandardBiProgramEntry {
  name: string;
  channel: 'DT' | 'SL';
  aliases: string[];
  priority: number;
}

export const STANDARD_BI_PROGRAM_CATALOG: StandardBiProgramEntry[] = [
  // High priority compounds (priority 90-100)
  {
    name: 'Trả chậm FECREDIT, SAMSUNG',
    channel: 'DT',
    aliases: ['fecredit', 'fe credit', 'tra cham fecredit', 'tra cham fecredit samsung', 'tra cham fecredit, samsung'],
    priority: 100,
  },
  {
    name: 'Trả chậm Homecredit',
    channel: 'DT',
    aliases: ['homecredit', 'home credit', 'tra cham homecredit', 'tra cham home credit'],
    priority: 95,
  },
  {
    name: 'Trả chậm Điện máy & Gia dụng',
    channel: 'DT',
    aliases: ['tra cham dien may', 'dien may & gia dung', 'tra cham dien may gia dung', 'tra cham dien may & gia dung'],
    priority: 90,
  },
  {
    name: 'Điện tử Samsung',
    channel: 'DT',
    aliases: ['dien tu samsung', 'samsung'],
    priority: 85,
  },
  {
    name: 'Bảo hiểm Thợ ICT',
    channel: 'DT',
    aliases: ['tho ict', 'thoilct', 'thoict', 'bao hiem tho ict', 'tho ilct'],
    priority: 80,
  },
  {
    name: 'Bảo hiểm Thợ DMX',
    channel: 'DT',
    aliases: ['tho dmx', 'thodmx', 'bao hiem tho dmx', 'tho dmx'],
    priority: 80,
  },
  {
    name: 'Bảo hiểm Tổng',
    channel: 'DT',
    aliases: ['bao hiem tong', 'bh tong'],
    priority: 75,
  },
  {
    name: 'Sim DMX',
    channel: 'SL',
    aliases: ['sim dmx', 'simdmx', 'sim đmx'],
    priority: 75,
  },
  {
    name: 'Sim',
    channel: 'SL',
    aliases: ['sim'],
    priority: 40,
  },
  {
    name: 'Máy lọc KK - Hút bụi - Hút ẩm',
    channel: 'DT',
    aliases: ['may loc kk', 'hut bui', 'hut am', 'may loc kk hut bui hut am', 'may loc kk - hut bui - hut am'],
    priority: 70,
  },
  {
    name: 'Máy lọc nước',
    channel: 'DT',
    aliases: ['may loc nuoc', 'may locnuoc'],
    priority: 70,
  },
  {
    name: 'Máy sấy / Máy rửa chén',
    channel: 'DT',
    aliases: ['may say', 'may rua chen', 'may say may rua chen', 'may say / may rua chen'],
    priority: 70,
  },
  {
    name: 'Tủ Lạnh / Đông / Mát',
    channel: 'DT',
    aliases: ['tu lanh', 'dong / mat', 'dong mat', 'tu lanh dong mat', 'tu lanh / dong / mat', 'dong jmat'],
    priority: 70,
  },
  {
    name: 'Điện thoại & Tablet Android',
    channel: 'DT',
    aliases: ['tablet android', 'android', 'dien thoai & tablet android', 'dien thoai tablet android'],
    priority: 70,
  },
  {
    name: 'Phụ kiện khác IT & Nhóm khác',
    channel: 'DT',
    aliases: ['phu kien khac it', 'phu kien khac', 'nhom khac', 'phu kien khac it & nhom khac'],
    priority: 70,
  },
  {
    name: 'MỞ THẺ TÍN DỤNG VPBANK',
    channel: 'SL',
    aliases: ['vpbank', 'vp bank', 'mo the tin dung', 'mo the tin dung vpbank', 'mo the tin dung vpbankm'],
    priority: 70,
  },
  {
    name: 'Đồng hồ & Smartwatch',
    channel: 'DT',
    aliases: ['smartwatch', 'dong ho & smartwatch', 'dong ho smartwatch', 'dong ho'],
    priority: 65,
  },
  {
    name: 'Đèn năng lượng mặt trời',
    channel: 'SL',
    aliases: ['den nang luong mat troi', 'nang luong mat troi', 'den nang luong'],
    priority: 65,
  },
  {
    name: 'Điện thoại Realme',
    channel: 'DT',
    aliases: ['realme', 'dien thoai realme'],
    priority: 65,
  },
  {
    name: 'Điện thoại Vivo',
    channel: 'DT',
    aliases: ['vivo', 'dien thoai vivo'],
    priority: 65,
  },
  {
    name: 'Tivi TCL',
    channel: 'DT',
    aliases: ['tcl', 'tivi tcl', 'tivitcl'],
    priority: 65,
  },
  {
    name: 'CE LG',
    channel: 'DT',
    aliases: ['ce lg', 'celg', 'lg'],
    priority: 65,
  },
  {
    name: 'Nồi cơm & Nồi chiên',
    channel: 'DT',
    aliases: ['noi com', 'noi chien', 'noi com & noi chien', 'noi com noi chien'],
    priority: 60,
  },
  {
    name: 'Máy nước nóng',
    channel: 'SL',
    aliases: ['may nuoc nong'],
    priority: 60,
  },
  {
    name: 'Máy giặt',
    channel: 'DT',
    aliases: ['may giat'],
    priority: 60,
  },
  {
    name: 'Máy Lạnh',
    channel: 'SL',
    aliases: ['may lanh'],
    priority: 60,
  },
  {
    name: 'Phụ kiện công nghệ',
    channel: 'DT',
    aliases: ['phu kien cong nghe'],
    priority: 60,
  },
  {
    name: 'Vay tiền mặt',
    channel: 'DT',
    aliases: ['vay tien mat', 'vay tien'],
    priority: 60,
  },
  {
    name: 'Loa Phụ Kiện',
    channel: 'DT',
    aliases: ['loa phu kien', 'loa pk'],
    priority: 60,
  },
  {
    name: 'Ví trả sau',
    channel: 'DT',
    aliases: ['vi tra sau'],
    priority: 60,
  },
  {
    name: 'Sạc dự phòng',
    channel: 'DT',
    aliases: ['sac du phong', 'sdp'],
    priority: 60,
  },
  {
    name: 'Nạp rút',
    channel: 'SL',
    aliases: ['nap rut', 'nạút', 'naut', 'naprut'],
    priority: 60,
  },
  {
    name: 'Quạt gió',
    channel: 'DT',
    aliases: ['quat gio', 'quat'],
    priority: 60,
  },
  {
    name: 'Laptop',
    channel: 'DT',
    aliases: ['laptop'],
    priority: 60,
  },
  {
    name: 'Tai nghe',
    channel: 'DT',
    aliases: ['tai nghe', 'tainghe'],
    priority: 60,
  },
  {
    name: 'Camera',
    channel: 'DT',
    aliases: ['camera'],
    priority: 60,
  },
  {
    name: 'Cáp sạc',
    channel: 'DT',
    aliases: ['cap sac'],
    priority: 60,
  },
  {
    name: 'VAS',
    channel: 'SL',
    aliases: ['vas'],
    priority: 60,
  },
  {
    name: 'Điện tử',
    channel: 'DT',
    aliases: ['dien tu'],
    priority: 10,
  },
];

export function matchStandardProgramWithCatalog(ocrName: string): {
  matchedName: string;
  channel: 'DT' | 'SL';
  isMatched: boolean;
  score: number;
} {
  const normalizedInput = ocrName.normalize('NFC').trim();
  const prefixMatch = normalizedInput.match(/^(T\d{1,2}\s*[-–—:]\s*)/i);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  const coreOcr = prefixMatch ? normalizedInput.slice(prefixMatch[0].length).trim() : normalizedInput.trim();
  const isTruncated = /[.…]{2,}$/.test(coreOcr);
  const cleanCore = coreOcr.replace(/[.…]+$/, '').trim();
  const ocrKey = removeVietnameseDiacritics(cleanCore);

  if (!ocrKey) {
    return { matchedName: normalizedInput, channel: 'DT', isMatched: false, score: 0 };
  }

  // 1. Sort catalog by priority descending, then alias length descending
  const sortedCatalog = [...STANDARD_BI_PROGRAM_CATALOG].sort((a, b) => b.priority - a.priority);

  for (const entry of sortedCatalog) {
    for (const alias of entry.aliases) {
      const aliasKey = removeVietnameseDiacritics(alias);
      if (ocrKey === aliasKey) {
        const finalName = prefix ? `${prefix}${entry.name}` : entry.name;
        return {
          matchedName: (isTruncated && !finalName.endsWith('...') ? `${finalName}...` : finalName).normalize('NFC'),
          channel: entry.channel,
          isMatched: true,
          score: 1.0,
        };
      }
      // If ocrKey contains the aliasKey
      if (aliasKey.length >= 3 && ocrKey.includes(aliasKey)) {
        const finalName = prefix ? `${prefix}${entry.name}` : entry.name;
        return {
          matchedName: (isTruncated && !finalName.endsWith('...') ? `${finalName}...` : finalName).normalize('NFC'),
          channel: entry.channel,
          isMatched: true,
          score: 0.95,
        };
      }
    }
  }

  return { matchedName: normalizedInput, channel: 'DT', isMatched: false, score: 0 };
}

// Test against all 39 OCR strings from test_coordinate_parser.py
const testSamples = [
  'T11- Điện tử Samsung',
  'T11-TiviTCL',
  'T11-CELG',
  'T11- MỠ THẺ TÍN DUNG VPBANKM...',
  'T11- Phụ kiện công nghệ',
  'T11- Vay tiền mặt',
  'T11- Bảo hiểm ThợIlCT',
  'T11- Loa Phu Kiện',
  'T11- Bảo hiểm Tho DMX',
  'T11 - Ví trả sau',
  'T11-Máy giặt',
  'T11- Nồi cơm & Nồi chiên',
  'T11- Máy nước nóng',
  'T11- Bảo hiểm Tổng',
  'T11- Sạc dự phòng',
  'T11 - Máy lọc KK - Hút bụi - Hútẩm',
  'T11-Sim',
  'T11 - Trả Cham Điện máy & Gia dụng',
  'T11 - Phụ kiện khác IT & Nhóm khác',
  'T11- Điện tử',
  'T11-Nạp rút',
  'T11- Máy lọcnước',
  'T11 - ĐIỆN THOẠI & TABLET ANDROID',
  'T11- Quạt gió',
  'T11-Laptop',
  'T11- Đồng hồ & Smartwatch',
  'T11- Máy Lạnh',
  'T11- Trả chậm Homecredit',
  'T11 - Tainghe',
  'T11-Camera',
  'T11-SimĐMX',
  'T11-Cáp sạc',
  'T11- Tủ Lạnh / Đông JMát',
  'T11-VAS',
  'T11 - Điện thoại Realme',
  'T11- Điện thoại Vivo',
  'T11 - Máy sấy / Máy rửa chén',
  'T11- Đèn năng lượng mặt trời',
  'T11 - Trả chậm FECREDIT, SAMSUNG...',
];

let matchCount = 0;
testSamples.forEach((s, idx) => {
  const res = matchStandardProgramWithCatalog(s);
  if (res.isMatched) matchCount++;
  console.log(`${idx + 1}. [${res.channel}] ${s} => ${res.matchedName}`);
});

console.log(`\nMatched: ${matchCount}/${testSamples.length}`);
