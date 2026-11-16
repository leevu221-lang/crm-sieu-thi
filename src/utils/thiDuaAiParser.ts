/**
 * Shared types, strict parsing, validation, multi-page merge/dedup,
 * and BI-compatible serialization for:
 * THI ĐUA CỤM -> LUỸ KẾ THI ĐUA (AI Image Recognition).
 */

export type ThiDuaKenh = 'DT' | 'SL';

export type ThiDuaDataSource = 'AI_VISION_BI' | 'EXCEL_PASTE';

export interface ThiDuaAiRawRow {
  ten_chuong_trinh?: unknown;
  kenh?: unknown;
  thuc_hien?: unknown;
  target?: unknown;
  ty_le_thuc_hien?: unknown;
  ty_le_du_kien?: unknown;
  hang_cty?: unknown;
  uncertain_fields?: unknown;
  note?: unknown;
}

export interface ThiDuaAiRawReport {
  report_type?: unknown;
  month?: unknown;
  year?: unknown;
  store_name?: unknown;
  expected_total_rows?: unknown;
  image_quality?: unknown;
  quality_warnings?: unknown;
  rows?: unknown;
}

export interface ThiDuaCellMetadata {
  bbox?: { x: number; y: number; w: number; h: number };
  rawValue?: string;
  parsedValue?: unknown;
  confidence?: number;
  status?: 'VERIFIED' | 'UNCERTAIN' | 'DEFAULT_ZERO' | 'MISSING';
}

export interface ThiDuaAiRow {
  id: string;
  stt?: number;
  ten_chuong_trinh: string;
  kenh: ThiDuaKenh | null;
  thuc_hien: number | null;
  target: number | null;
  ty_le_thuc_hien: number | null;
  ty_le_du_kien: number | null;
  hang_cty: number | null;
  uncertain_fields: string[];
  missing_fields: string[];
  errors: string[];
  warnings: string[];
  sourcePageIndex?: number;
  note?: string;
  cell_metadata?: {
    ten_chuong_trinh?: ThiDuaCellMetadata;
    kenh?: ThiDuaCellMetadata;
    thuc_hien?: ThiDuaCellMetadata;
    target?: ThiDuaCellMetadata;
    ty_le_thuc_hien?: ThiDuaCellMetadata;
    ty_le_du_kien?: ThiDuaCellMetadata;
    hang_cty?: ThiDuaCellMetadata;
  };
  row_bbox?: { x: number; y: number; w: number; h: number };
}

export interface OcrDebugTrace {
  rawText: string;
  blocksCount: number;
  linesCount: number;
  wordsCount: number;
  detectedRowsCount: number;
  parserMethod: 'SPATIAL_BBOX' | 'TEXT_STREAM' | 'HYBRID_MERGED' | 'COLUMN_GRID';
  spatialRowsCount: number;
  streamRowsCount: number;
  discardedLines: Array<{ lineText: string; reason: string }>;
  kpiSummary: {
    dat?: number;
    canDay?: number;
    chuaDat?: number;
    totalReported?: number;
  };
}

export interface ThiDuaAiReportResult {
  report_type: 'THI_DUA_LUY_KE';
  month: number | null;
  year: number | null;
  store_name: string | null;
  expected_total_rows: number | null;
  kpi_breakdown?: {
    dat?: number;
    canDay?: number;
    chuaDat?: number;
    totalReported?: number;
  };
  debug_trace?: OcrDebugTrace;
  image_quality: 'GOOD' | 'BLURRY' | 'PARTIAL';
  quality_warnings: string[];
  rows: ThiDuaAiRow[];
}

export interface ThiDuaAiValidationSummary {
  totalRecognized: number;
  expectedTotal: number | null;
  validRows: number;
  errorRows: number;
  warningRows: number;
  missingDataPrograms: string[];
  uncertainPrograms: Array<{ program: string; fields: string[] }>;
  duplicatePrograms: string[];
  under100Count: number;
  overOrEqual100Count: number;
  hasCountMismatch: boolean;
  requiresAdminConfirmation: boolean;
  canConfirmSave: boolean;
  blockingReasons: string[];
  minStt?: number;
  maxStt?: number;
  missingSttCount?: number;
  duplicateSttCount?: number;
  isIncomplete?: boolean;
  incompleteMessage?: string;
}

export interface ThiDuaLkUpdateHistoryEntry {
  updatedAt: string;
  updatedBy: string;
  source: ThiDuaDataSource;
  period: string;
  rowCount: number;
  expectedRowCount: number | null;
  reportHash: string;
  batchId?: string;
  batchStatus?: 'SAVED' | 'DRAFT';
  updatedCount?: number;
  addedCount?: number;
}

export interface ThiDuaLkMeta {
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  source: ThiDuaDataSource;
  period: string;
  month: number | null;
  year: number | null;
  rowCount: number;
  expectedRowCount: number | null;
  reportHash: string;
  batchId?: string;
  batchStatus?: 'SAVED' | 'DRAFT';
  updatedCount?: number;
  addedCount?: number;
  pageCount?: number;
  duplicatesMerged?: number;
  uncertainConfirmed?: boolean;
  rowsSnapshot?: Array<{
    ten_chuong_trinh: string;
    kenh: ThiDuaKenh;
    thuc_hien: number;
    target: number;
    ty_le_thuc_hien: number | null;
    ty_le_du_kien: number | null;
    hang_cty: number | null;
  }>;
  history: ThiDuaLkUpdateHistoryEntry[];
}

export const THI_DUA_EDITABLE_FIELDS = [
  'ten_chuong_trinh',
  'kenh',
  'thuc_hien',
  'target',
  'ty_le_thuc_hien',
  'ty_le_du_kien',
  'hang_cty',
] as const;

export function normalizeProgramName(name: string): string {
  return String(name || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeProgramKey(name: string): string {
  return normalizeProgramName(name)
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, ' - ');
}

// ==========================================
// STANDARD BI BUSINESS PROGRAM DICTIONARY & CATALOG
// ==========================================

export interface StandardBiProgramEntry {
  name: string;
  channel: ThiDuaKenh;
  aliases: string[];
  priority: number;
}

export const STANDARD_BI_PROGRAM_CATALOG: StandardBiProgramEntry[] = [
  // High priority compounds (checked before individual components)
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
    aliases: ['tho dmx', 'thodmx', 'bao hiem tho dmx'],
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
    aliases: [
      'sim dmx',
      'simdmx',
      'sim đmx',
      'simđmx',
      'simomx',
      'sim d mx',
      'sim-dmx',
      'sim0mx',
      'simdmx sl',
      'sim đmx sl',
      'sim dmx sl',
      't11 - sim dmx',
      't11 - sim đmx',
    ],
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
    aliases: ['may loc kk', 'hut bui', 'hut am', 'may loc kk hut bui hut am', 'may loc kk - hut bui - hút ẩm', 'may loc kk - hut bui - hut am'],
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

export const STANDARD_BI_THI_DUA_PROGRAMS: string[] = STANDARD_BI_PROGRAM_CATALOG.map((p) => p.name);

export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐðÐd]+/g, 'd')
    .toLowerCase()
    .replace(/[iìíỉĩị|l]+/g, 'i')
    .replace(/[^a-z0-9]/g, '');
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Matches an OCR-extracted program name against the standard business catalog:
 * - Restores correct Vietnamese diacritics, capitalization, and standard spacing.
 * - Preserves period prefix (e.g. 'T11 - ') and truncation ellipsis ('...').
 * - Matches against priority catalog aliases before fuzzy Levenshtein distance.
 * - Resolves canonical channel ('DT' or 'SL') according to business rules.
 * - Always ensures Unicode NFC.
 */
export function matchStandardProgramName(ocrName: string): {
  matchedName: string;
  channel?: ThiDuaKenh;
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
    return { matchedName: normalizedInput, isMatched: false, score: 0 };
  }

  // Phase 1: High-priority Catalog Exact and Substring Alias Matching
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

  // Phase 2: Levenshtein Distance Fallback
  let bestMatch: StandardBiProgramEntry | null = null;
  let bestScore = 0;
  let secondBestScore = 0;

  for (const entry of STANDARD_BI_PROGRAM_CATALOG) {
    const stdKey = removeVietnameseDiacritics(entry.name);
    let score = 0;
    if (ocrKey === stdKey) {
      score = 1.0;
    } else if (stdKey.startsWith(ocrKey) || ocrKey.startsWith(stdKey)) {
      score = Math.min(ocrKey.length, stdKey.length) / Math.max(ocrKey.length, stdKey.length);
    } else {
      const maxLen = Math.max(ocrKey.length, stdKey.length);
      const dist = levenshteinDistance(ocrKey, stdKey);
      score = (maxLen - dist) / maxLen;
    }

    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestMatch = entry;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  // High confidence threshold (>= 0.75) and margin over 2nd best to avoid ambiguity
  if (
    bestMatch &&
    (bestScore >= 0.85 || (bestScore >= 0.75 && bestScore - secondBestScore >= 0.12))
  ) {
    const finalName = prefix ? `${prefix}${bestMatch.name}` : bestMatch.name;
    return {
      matchedName: (isTruncated && !finalName.endsWith('...') ? `${finalName}...` : finalName).normalize('NFC'),
      channel: bestMatch.channel,
      isMatched: true,
      score: bestScore,
    };
  }

  return { matchedName: normalizedInput, isMatched: false, score: bestScore };
}

export function normalizeKenh(raw: unknown): ThiDuaKenh | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.normalize('NFC').trim().toUpperCase();
  if (upper === 'DT' || upper === 'DTLK' || upper === 'DOANH THU') return 'DT';
  if (upper === 'SL' || upper === 'SLLK' || upper === 'SỐ LƯỢNG' || upper === 'SO LUONG') return 'SL';
  if (upper.includes('DOANH THU') || /\bDT\b/.test(upper)) return 'DT';
  if (upper.includes('SỐ LƯỢNG') || upper.includes('SO LUONG') || /\bSL\b/.test(upper)) return 'SL';
  return null;
}

/**
 * Parses numeric values robustly while avoiding '.' vs ',' confusion.
 * - Accepts standard JS numbers directly.
 * - Handles mixed separators by using the rightmost separator as decimal
 *   (e.g. "9,033.52" -> 9033.52, "9.033,52" -> 9033.52).
 * - For percentages: single ',' or '.' with 1-2 trailing digits is always decimal.
 * - For blank / placeholder ('-', 'N/A', '?', ''): returns null.
 */
export function parseStrictBiNumber(
  raw: unknown,
  options: { isPercentage?: boolean; isIntegerRank?: boolean } = {}
): { value: number | null; invalidToken: boolean } {
  const { isPercentage = false, isIntegerRank = false } = options;

  if (raw === null || raw === undefined) {
    return { value: null, invalidToken: false };
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { value: null, invalidToken: true };
    if (isIntegerRank) {
      if (!Number.isInteger(raw)) return { value: null, invalidToken: true };
      return { value: raw, invalidToken: false };
    }
    return { value: Math.round(raw * 100) / 100, invalidToken: false };
  }

  if (typeof raw !== 'string') {
    return { value: null, invalidToken: true };
  }

  let s = raw
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[%₫đ]/gi, '')
    .trim();

  if (!s || s === '-' || s === '—' || s === '--' || /^n\/?a$/i.test(s) || /^\?+$/.test(s)) {
    return { value: null, invalidToken: false };
  }

  // Strip spaces used as thousands separators, e.g. "9 033.52"
  s = s.replace(/\s+/g, '');

  // Reject characters outside digits, '.', ',', '-', '+'
  if (!/^[+-]?[\d.,]+$/.test(s)) {
    return { value: null, invalidToken: true };
  }

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  let normalized = s;

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // VN/EU format: 1.234,56 -> remove dots, comma -> dot
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US/BI format: 9,033.52 -> remove commas
      normalized = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = s.split(',');
    if (parts.length > 2) {
      // Multiple commas: 1,234,567
      normalized = s.replace(/,/g, '');
    } else {
      const decimals = parts[1] ?? '';
      if (!isPercentage && decimals.length === 3 && /^\d+$/.test(parts[0].replace(/^[+-]/, ''))) {
        // Thousands comma: 51,730
        normalized = parts.join('');
      } else {
        // Decimal comma: 17,5 or 9033,52
        normalized = `${parts[0]}.${decimals}`;
      }
    }
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length > 2) {
      // Multiple dots: 1.234.567
      normalized = s.replace(/\./g, '');
    } else {
      const decimals = parts[1] ?? '';
      // Treat single dot as decimal in canonical numeric input;
      // exception only when rank expects pure integer
      if (isIntegerRank && decimals.length === 3 && /^0+$/.test(decimals)) {
        normalized = parts[0];
      } else {
        normalized = s;
      }
    }
  }

  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    return { value: null, invalidToken: true };
  }

  if (isIntegerRank) {
    if (!Number.isInteger(num)) {
      return { value: null, invalidToken: true };
    }
    return { value: num, invalidToken: false };
  }

  return { value: Math.round(num * 100) / 100, invalidToken: false };
}

export function createRowId(index: number, pageIndex = 1): string {
  return `td_${pageIndex}_${index}_${Math.random().toString(36).slice(2, 7)}`;
}

export function validateThiDuaRow(
  rowInput: Partial<ThiDuaAiRow> & { id?: string },
  index = 0,
  pageIndex = 1,
  invalidFlags: {
    invalidThucHien?: boolean;
    invalidTarget?: boolean;
    invalidTyLeThucHien?: boolean;
    invalidTyLeDuKien?: boolean;
    invalidHangCty?: boolean;
  } = {}
): ThiDuaAiRow {
  const ten_chuong_trinh = normalizeProgramName(String(rowInput.ten_chuong_trinh ?? ''));
  const kenh = normalizeKenh(rowInput.kenh);

  const uncertainSet = new Set<string>(
    Array.isArray(rowInput.uncertain_fields)
      ? rowInput.uncertain_fields.map((f) => String(f).trim()).filter(Boolean)
      : []
  );
  const missing_fields: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // THỰC HIỆN:
  // - Distinct natural 0 (e.g. 0, 0.00, or DEFAULT_ZERO) vs UNREAD/MISSING (null)
  let thuc_hien: number | null = null;
  const isThExplicitZero =
    rowInput.thuc_hien === 0 ||
    rowInput.cell_metadata?.thuc_hien?.status === 'DEFAULT_ZERO' ||
    rowInput.cell_metadata?.thuc_hien?.rawValue === '-' ||
    rowInput.cell_metadata?.thuc_hien?.rawValue === '0' ||
    rowInput.cell_metadata?.thuc_hien?.rawValue === '0.00';

  if (typeof rowInput.thuc_hien === 'number' && Number.isFinite(rowInput.thuc_hien)) {
    thuc_hien = rowInput.thuc_hien;
  } else if (isThExplicitZero) {
    thuc_hien = 0;
  } else if (rowInput.thuc_hien === null || rowInput.thuc_hien === undefined) {
    thuc_hien = null;
    missing_fields.push('thuc_hien');
    uncertainSet.add('thuc_hien');
    const rawVal = rowInput.cell_metadata?.thuc_hien?.rawValue?.trim();
    warnings.push(
      rawVal
        ? `Chưa nhận diện được Thực hiện (RAW: "${rawVal}") — vui lòng đối chiếu ảnh`
        : 'Chưa nhận diện được Thực hiện (ô trống) — vui lòng đối chiếu ảnh'
    );
  }

  // TARGET:
  let target: number | null = null;
  const isTgtExplicitZero =
    rowInput.target === 0 ||
    rowInput.cell_metadata?.target?.status === 'DEFAULT_ZERO' ||
    rowInput.cell_metadata?.target?.rawValue === '-' ||
    rowInput.cell_metadata?.target?.rawValue === '0' ||
    rowInput.cell_metadata?.target?.rawValue === '0.00';

  if (typeof rowInput.target === 'number' && Number.isFinite(rowInput.target)) {
    target = rowInput.target;
  } else if (isTgtExplicitZero) {
    target = 0;
  } else if (rowInput.target === null || rowInput.target === undefined) {
    target = null;
    missing_fields.push('target');
    uncertainSet.add('target');
    const rawVal = rowInput.cell_metadata?.target?.rawValue?.trim();
    warnings.push(
      rawVal
        ? `Chưa nhận diện được Target (RAW: "${rawVal}") — vui lòng đối chiếu ảnh`
        : 'Chưa nhận diện được Target (ô trống) — vui lòng đối chiếu ảnh'
    );
  }

  // % TH HIỆN TẠI:
  // Ưu tiên giá trị đọc được từ vùng thanh tiến độ (cBar)
  // Nếu chưa có mà Target > 0 và Thực hiện != null -> tự động tính (thuc_hien / target) * 100
  let ty_le_thuc_hien: number | null = null;
  if (typeof rowInput.ty_le_thuc_hien === 'number' && Number.isFinite(rowInput.ty_le_thuc_hien)) {
    ty_le_thuc_hien = rowInput.ty_le_thuc_hien;
  } else if (target !== null && target > 0 && thuc_hien !== null) {
    ty_le_thuc_hien = Math.round((thuc_hien / target) * 10000) / 100;
  } else if (target === 0) {
    ty_le_thuc_hien = 0;
  }

  // % DỰ KIẾN HT:
  let ty_le_du_kien: number | null = null;
  if (typeof rowInput.ty_le_du_kien === 'number' && Number.isFinite(rowInput.ty_le_du_kien)) {
    ty_le_du_kien = rowInput.ty_le_du_kien;
  } else if (rowInput.ty_le_du_kien === null || rowInput.ty_le_du_kien === undefined) {
    // If not read, keep null if uncertain
    if (rowInput.cell_metadata?.ty_le_du_kien?.status === 'DEFAULT_ZERO') {
      ty_le_du_kien = 0;
    } else {
      ty_le_du_kien = rowInput.ty_le_du_kien ?? null;
    }
  }

  // HẠNG VÙNG: giữ nguyên giá trị hợp lệ (>= 1); nếu trống hoặc "-" -> null (hiển thị "-")
  let hang_cty: number | null = null;
  if (typeof rowInput.hang_cty === 'number' && Number.isInteger(rowInput.hang_cty) && rowInput.hang_cty >= 1) {
    hang_cty = rowInput.hang_cty;
  }

  if (!ten_chuong_trinh) {
    missing_fields.push('ten_chuong_trinh');
    errors.push('Thiếu tên chương trình');
  }

  if (!kenh) {
    missing_fields.push('kenh');
    warnings.push('Chưa xác định rõ kênh (mặc định DT)');
    uncertainSet.add('kenh');
  }

  if (invalidFlags.invalidThucHien) {
    errors.push('Thực hiện không phải số hợp lệ');
  } else if (thuc_hien !== null && thuc_hien < 0) {
    errors.push('Thực hiện phải là số >= 0');
  }

  if (invalidFlags.invalidTarget) {
    errors.push('Target không phải số hợp lệ');
  } else if (target !== null && target < 0) {
    errors.push('Target phải là số >= 0');
  } else if (target === 0 && thuc_hien !== null && thuc_hien > 0) {
    warnings.push('Target = 0 trong khi Thực hiện > 0');
  }

  if (invalidFlags.invalidTyLeThucHien) {
    errors.push('% Thực hiện không hợp lệ');
  } else if (ty_le_thuc_hien !== null && ty_le_thuc_hien < 0) {
    errors.push('% Thực hiện không được âm');
  } else if (ty_le_thuc_hien !== null && ty_le_thuc_hien > 5000) {
    errors.push('% Thực hiện vượt ngưỡng hợp lý (> 5000%)');
  }

  if (invalidFlags.invalidTyLeDuKien) {
    errors.push('% Dự kiến HT không hợp lệ');
  } else if (ty_le_du_kien !== null && ty_le_du_kien < 0) {
    errors.push('% Dự kiến hoàn thành không được âm');
  } else if (ty_le_du_kien !== null && ty_le_du_kien > 5000) {
    errors.push('% Dự kiến hoàn thành vượt ngưỡng hợp lý (> 5000%)');
  }

  if (invalidFlags.invalidHangCty) {
    errors.push('Hạng vùng phải là số nguyên dương');
  } else if (rowInput.hang_cty !== null && rowInput.hang_cty !== undefined) {
    if (!Number.isInteger(rowInput.hang_cty) || rowInput.hang_cty < 1 || rowInput.hang_cty > 10000) {
      errors.push('Hạng vùng phải là số nguyên từ 1 trở lên');
    }
  }

  // Cross-field consistency checks (only for active positive targets)
  if (
    target !== null &&
    target > 0 &&
    thuc_hien !== null &&
    thuc_hien > 0 &&
    ty_le_thuc_hien !== null &&
    ty_le_thuc_hien > 0
  ) {
    const computedPct = (thuc_hien / target) * 100;
    const diff = Math.abs(ty_le_thuc_hien - computedPct);
    const allowedTolerance = Math.max(8, computedPct * 0.2);
    if (diff > allowedTolerance) {
      warnings.push(
        `% TH (${ty_le_thuc_hien}%) lệch với Thực hiện/Target (~${computedPct.toFixed(1)}%) — kiểm tra dấu thập phân`
      );
      uncertainSet.add('ty_le_thuc_hien');
    }
  }

  if (
    ty_le_thuc_hien !== null &&
    ty_le_thuc_hien > 0 &&
    ty_le_du_kien !== null &&
    ty_le_du_kien > 0 &&
    ty_le_du_kien + 2 < ty_le_thuc_hien
  ) {
    warnings.push(
      `% Dự kiến (${ty_le_du_kien}%) nhỏ hơn % Thực hiện (${ty_le_thuc_hien}%) — kiểm tra xem có bị đảo cột`
    );
  }

  if (uncertainSet.size > 0) {
    const fieldMap: Record<string, string> = {
      thuc_hien: 'Thực hiện',
      target: 'Target',
      ty_le_thuc_hien: '% TH',
      ty_le_du_kien: '% Dự kiến',
      kenh: 'Kênh',
      ten_chuong_trinh: 'Tên chương trình',
      hang_cty: 'Hạng vùng',
    };
    const translated = Array.from(uncertainSet).map((f) => fieldMap[f] || f);
    warnings.push(`AI chưa chắc chắn: ${translated.join(', ')}`);
  }

  return {
    id: rowInput.id || createRowId(index, pageIndex),
    stt: rowInput.stt ?? (index + 1),
    ten_chuong_trinh,
    kenh,
    thuc_hien,
    target,
    ty_le_thuc_hien,
    ty_le_du_kien,
    hang_cty,
    uncertain_fields: Array.from(uncertainSet),
    missing_fields,
    errors,
    warnings,
    sourcePageIndex: rowInput.sourcePageIndex ?? pageIndex,
    note: rowInput.note ? String(rowInput.note).trim() : undefined,
    cell_metadata: rowInput.cell_metadata,
    row_bbox: rowInput.row_bbox,
  };
}

/**
 * Normalizes all BI rows with Default Zero semantics:
 * - Truly blank or dash ('-') numeric metrics -> 0 (thuc_hien, target, ty_le_thuc_hien, ty_le_du_kien)
 * - If target > 0 and ty_le_thuc_hien is missing -> (thuc_hien / target) * 100
 * - If target = 0 -> ty_le_thuc_hien = 0
 * - hang_cty: integer >= 1 or null (never 0)
 * - Preserves Vietnamese NFC strings, original decimal values, cell_metadata, and does not alter program names
 */
export function normalizeBIData<T extends ThiDuaAiReportResult | ThiDuaAiRow[]>(input: T): T {
  if (Array.isArray(input)) {
    return (input as ThiDuaAiRow[]).map((r, idx) =>
      validateThiDuaRow(
        {
          ...r,
          ten_chuong_trinh: normalizeProgramName(r.ten_chuong_trinh || ''),
          kenh: normalizeKenh(r.kenh),
          thuc_hien:
            typeof r.thuc_hien === 'number' && Number.isFinite(r.thuc_hien)
              ? r.thuc_hien
              : r.thuc_hien === 0
              ? 0
              : null,
          target:
            typeof r.target === 'number' && Number.isFinite(r.target)
              ? r.target
              : r.target === 0
              ? 0
              : null,
          ty_le_thuc_hien:
            typeof r.ty_le_thuc_hien === 'number' && Number.isFinite(r.ty_le_thuc_hien)
              ? r.ty_le_thuc_hien
              : r.target && r.target > 0 && typeof r.thuc_hien === 'number'
              ? Math.round((r.thuc_hien / r.target) * 10000) / 100
              : r.target === 0
              ? 0
              : null,
          ty_le_du_kien:
            typeof r.ty_le_du_kien === 'number' && Number.isFinite(r.ty_le_du_kien)
              ? r.ty_le_du_kien
              : r.ty_le_du_kien === 0
              ? 0
              : null,
          hang_cty:
            typeof r.hang_cty === 'number' && Number.isInteger(r.hang_cty) && r.hang_cty >= 1
              ? r.hang_cty
              : null,
          uncertain_fields: r.uncertain_fields || [],
          cell_metadata: r.cell_metadata,
          row_bbox: r.row_bbox,
        },
        idx,
        r.sourcePageIndex || 1
      )
    ) as T;
  }

  const report = input as ThiDuaAiReportResult;
  const normalizedRows = (report.rows || []).map((r, idx) =>
    validateThiDuaRow(
      {
        ...r,
        ten_chuong_trinh: normalizeProgramName(r.ten_chuong_trinh || ''),
        kenh: normalizeKenh(r.kenh),
        thuc_hien:
          typeof r.thuc_hien === 'number' && Number.isFinite(r.thuc_hien)
            ? r.thuc_hien
            : r.thuc_hien === 0
            ? 0
            : null,
        target:
          typeof r.target === 'number' && Number.isFinite(r.target)
            ? r.target
            : r.target === 0
            ? 0
            : null,
        ty_le_thuc_hien:
          typeof r.ty_le_thuc_hien === 'number' && Number.isFinite(r.ty_le_thuc_hien)
            ? r.ty_le_thuc_hien
            : r.target && r.target > 0 && typeof r.thuc_hien === 'number'
            ? Math.round((r.thuc_hien / r.target) * 10000) / 100
            : r.target === 0
            ? 0
            : null,
        ty_le_du_kien:
          typeof r.ty_le_du_kien === 'number' && Number.isFinite(r.ty_le_du_kien)
            ? r.ty_le_du_kien
            : r.ty_le_du_kien === 0
            ? 0
            : null,
        hang_cty:
          typeof r.hang_cty === 'number' && Number.isInteger(r.hang_cty) && r.hang_cty >= 1
            ? r.hang_cty
            : null,
        uncertain_fields: r.uncertain_fields || [],
        cell_metadata: r.cell_metadata,
        row_bbox: r.row_bbox,
      },
      idx,
      r.sourcePageIndex || 1
    )
  );

  return {
    ...report,
    rows: normalizedRows,
  } as T;
}

export function normalizeRawAiReport(
  raw: ThiDuaAiRawReport,
  pageIndex = 1
): ThiDuaAiReportResult {
  const monthNum = typeof raw.month === 'number' ? raw.month : Number(raw.month);
  const yearNum = typeof raw.year === 'number' ? raw.year : Number(raw.year);
  const expectedNum =
    raw.expected_total_rows === null || raw.expected_total_rows === undefined
      ? null
      : Number(raw.expected_total_rows);

  const month = Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12 ? monthNum : null;
  const year = Number.isInteger(yearNum) && yearNum >= 2020 && yearNum <= 2100 ? yearNum : null;
  const expected_total_rows =
    expectedNum !== null && Number.isInteger(expectedNum) && expectedNum > 0 ? expectedNum : null;

  const rawQuality = typeof raw.image_quality === 'string' ? raw.image_quality.toUpperCase() : 'GOOD';
  const image_quality: 'GOOD' | 'BLURRY' | 'PARTIAL' =
    rawQuality === 'BLURRY' || rawQuality === 'PARTIAL' ? rawQuality : 'GOOD';

  const quality_warnings = Array.isArray(raw.quality_warnings)
    ? raw.quality_warnings.map((w) => String(w).trim()).filter(Boolean)
    : [];

  const rawRows: ThiDuaAiRawRow[] = Array.isArray(raw.rows) ? raw.rows : [];

  const rows = rawRows.map((item, idx) => {
    const parsedTh = parseStrictBiNumber(item?.thuc_hien);
    const parsedTarget = parseStrictBiNumber(item?.target);
    const parsedPctTh = parseStrictBiNumber(item?.ty_le_thuc_hien, { isPercentage: true });
    const parsedPctDk = parseStrictBiNumber(item?.ty_le_du_kien, { isPercentage: true });
    const parsedHang = parseStrictBiNumber(item?.hang_cty, { isIntegerRank: true });

    const uncertain = Array.isArray(item?.uncertain_fields)
      ? item.uncertain_fields.map((f) => String(f).trim()).filter(Boolean)
      : [];

    return validateThiDuaRow(
      {
        ten_chuong_trinh: typeof item?.ten_chuong_trinh === 'string' ? item.ten_chuong_trinh : String(item?.ten_chuong_trinh ?? ''),
        kenh: normalizeKenh(item?.kenh),
        thuc_hien: parsedTh.value,
        target: parsedTarget.value,
        ty_le_thuc_hien: parsedPctTh.value,
        ty_le_du_kien: parsedPctDk.value,
        hang_cty: parsedHang.value,
        uncertain_fields: uncertain,
        note: typeof item?.note === 'string' ? item.note : undefined,
        sourcePageIndex: pageIndex,
      },
      idx,
      pageIndex,
      {
        invalidThucHien: parsedTh.invalidToken,
        invalidTarget: parsedTarget.invalidToken,
        invalidTyLeThucHien: parsedPctTh.invalidToken,
        invalidTyLeDuKien: parsedPctDk.invalidToken,
        invalidHangCty: parsedHang.invalidToken,
      }
    );
  });

  return {
    report_type: 'THI_DUA_LUY_KE',
    month,
    year,
    store_name: typeof raw.store_name === 'string' && raw.store_name.trim() ? raw.store_name.trim() : null,
    expected_total_rows,
    image_quality,
    quality_warnings,
    rows,
  };
}

function scoreRowCompleteness(r: ThiDuaAiRow): number {
  let score = 0;
  if (r.ten_chuong_trinh) score += 2;
  if (r.kenh) score += 2;
  if (r.thuc_hien !== null) score += 3;
  if (r.target !== null) score += 3;
  if (r.ty_le_du_kien !== null) score += 2;
  if (r.ty_le_thuc_hien !== null) score += 1;
  if (r.hang_cty !== null) score += 1;
  score -= r.errors.length * 4;
  score -= r.uncertain_fields.length * 1.5;
  return score;
}

/**
 * Merges multiple analyzed screenshots/pages sequentially,
 * deduplicating overlapping rows (same normalized program + kenh)
 * and flagging conflicting duplicate numbers for Admin review.
 */
export function mergeMultiPageReports(
  pageReports: ThiDuaAiReportResult[]
): {
  merged: ThiDuaAiReportResult;
  duplicatesMerged: number;
  duplicatePrograms: string[];
} {
  if (pageReports.length === 0) {
    return {
      merged: {
        report_type: 'THI_DUA_LUY_KE',
        month: null,
        year: null,
        store_name: null,
        expected_total_rows: null,
        image_quality: 'PARTIAL',
        quality_warnings: ['Chưa có ảnh nào được phân tích'],
        rows: [],
      },
      duplicatesMerged: 0,
      duplicatePrograms: [],
    };
  }

  let month: number | null = null;
  let year: number | null = null;
  let store_name: string | null = null;
  let expected_total_rows: number | null = null;
  let image_quality: 'GOOD' | 'BLURRY' | 'PARTIAL' = 'GOOD';
  const qualityWarningsSet = new Set<string>();

  const rowMap = new Map<string, ThiDuaAiRow>();
  const duplicateProgramsSet = new Set<string>();
  let duplicatesMerged = 0;

  pageReports.forEach((page, pIdx) => {
    if (month === null && page.month !== null) month = page.month;
    if (year === null && page.year !== null) year = page.year;
    if (!store_name && page.store_name) store_name = page.store_name;
    if (page.expected_total_rows !== null) {
      expected_total_rows =
        expected_total_rows === null
          ? page.expected_total_rows
          : Math.max(expected_total_rows, page.expected_total_rows);
    }

    if (page.image_quality === 'BLURRY') image_quality = 'BLURRY';
    else if (page.image_quality === 'PARTIAL' && image_quality === 'GOOD') image_quality = 'PARTIAL';

    page.quality_warnings.forEach((w) => qualityWarningsSet.add(w));

    page.rows.forEach((row, rIdx) => {
      const pKey = normalizeProgramKey(row.ten_chuong_trinh);
      if (!pKey) {
        rowMap.set(`__empty_${pIdx}_${rIdx}`, row);
        return;
      }
      const dedupKey = `${pKey}::${row.kenh || 'UNKNOWN'}`;
      const existing = rowMap.get(dedupKey);
      if (!existing) {
        rowMap.set(dedupKey, row);
        return;
      }

      duplicatesMerged++;
      duplicateProgramsSet.add(row.ten_chuong_trinh);

      // Pick cleaner row and backfill missing fields from the other copy
      const keepExisting = scoreRowCompleteness(existing) >= scoreRowCompleteness(row);
      const primary = keepExisting ? existing : row;
      const secondary = keepExisting ? row : existing;

      const hasConflict =
        (primary.thuc_hien !== null &&
          secondary.thuc_hien !== null &&
          Math.abs(primary.thuc_hien - secondary.thuc_hien) > Math.max(0.5, primary.thuc_hien * 0.01)) ||
        (primary.target !== null &&
          secondary.target !== null &&
          Math.abs(primary.target - secondary.target) > Math.max(0.5, primary.target * 0.01));

      const mergedUncertain = new Set([...primary.uncertain_fields]);
      const extraWarnings = [...primary.warnings];
      if (hasConflict) {
        mergedUncertain.add('thuc_hien');
        mergedUncertain.add('target');
        extraWarnings.push('Trùng giữa nhiều ảnh với số liệu khác nhau — Admin cần đối chiếu lại');
      }

      const mergedRow = validateThiDuaRow(
        {
          ...primary,
          thuc_hien: primary.thuc_hien ?? secondary.thuc_hien,
          target: primary.target ?? secondary.target,
          ty_le_thuc_hien: primary.ty_le_thuc_hien ?? secondary.ty_le_thuc_hien,
          ty_le_du_kien: primary.ty_le_du_kien ?? secondary.ty_le_du_kien,
          hang_cty: primary.hang_cty ?? secondary.hang_cty,
          uncertain_fields: Array.from(mergedUncertain),
          sourcePageIndex: primary.sourcePageIndex,
        },
        rIdx,
        pIdx + 1
      );

      if (hasConflict) {
        mergedRow.warnings = Array.from(new Set([...mergedRow.warnings, ...extraWarnings]));
      }
      rowMap.set(dedupKey, mergedRow);
    });
  });

  if (duplicatesMerged > 0) {
    qualityWarningsSet.add(`Đã phát hiện và gộp ${duplicatesMerged} dòng trùng lặp giữa các ảnh.`);
  }

  return {
    merged: {
      report_type: 'THI_DUA_LUY_KE',
      month,
      year,
      store_name,
      expected_total_rows,
      kpi_breakdown: pageReports[0]?.kpi_breakdown,
      debug_trace: pageReports[0]?.debug_trace,
      image_quality,
      quality_warnings: Array.from(qualityWarningsSet),
      rows: Array.from(rowMap.values()),
    },
    duplicatesMerged,
    duplicatePrograms: Array.from(duplicateProgramsSet),
  };
}

export function buildValidationSummary(
  report: ThiDuaAiReportResult,
  duplicatePrograms: string[] = [],
  adminConfirmedWarnings = false
): ThiDuaAiValidationSummary {
  const rows = report.rows;
  const seenKeys = new Map<string, number>();
  const runtimeDuplicates: string[] = [...duplicatePrograms];

  let validRows = 0;
  let errorRows = 0;
  let warningRows = 0;
  let under100Count = 0;
  let overOrEqual100Count = 0;
  const missingDataPrograms: string[] = [];
  const uncertainPrograms: Array<{ program: string; fields: string[] }> = [];

  for (const row of rows) {
    const key = `${normalizeProgramKey(row.ten_chuong_trinh)}::${row.kenh || 'NONE'}`;
    if (row.ten_chuong_trinh) {
      seenKeys.set(key, (seenKeys.get(key) || 0) + 1);
      if ((seenKeys.get(key) || 0) === 2) {
        runtimeDuplicates.push(`${row.ten_chuong_trinh} (${row.kenh || '?'})`);
      }
    }

    if (row.errors.length === 0) validRows++;
    else errorRows++;

    if (row.warnings.length > 0) warningRows++;
    if (row.missing_fields.length > 0) {
      missingDataPrograms.push(row.ten_chuong_trinh || '(Chưa có tên)');
    }
    if (row.uncertain_fields.length > 0) {
      uncertainPrograms.push({
        program: row.ten_chuong_trinh || '(Chưa có tên)',
        fields: row.uncertain_fields,
      });
    }

    const pctForBucket = row.ty_le_du_kien ?? row.ty_le_thuc_hien;
    if (pctForBucket !== null) {
      if (pctForBucket < 100) under100Count++;
      else overOrEqual100Count++;
    }
  }

  const expectedTotal = report.expected_total_rows;
  const hasCountMismatch = expectedTotal !== null && expectedTotal > 0 && rows.length !== expectedTotal;

  const sttList = rows.map((r, i) => r.stt ?? (i + 1));
  const minStt = sttList.length > 0 ? Math.min(...sttList) : 1;
  const maxStt = sttList.length > 0 ? Math.max(...sttList) : rows.length;
  const seenStt = new Set<number>();
  let duplicateSttCount = 0;
  sttList.forEach((stt) => {
    if (seenStt.has(stt)) duplicateSttCount++;
    else seenStt.add(stt);
  });
  const missingSttCount = expectedTotal && expectedTotal > rows.length ? expectedTotal - rows.length : 0;
  const isIncomplete = (expectedTotal !== null && expectedTotal > 0 && rows.length < expectedTotal) || missingSttCount > 0;
  const incompleteMessage = isIncomplete
    ? `ẢNH CHƯA ĐƯỢC NHẬN DIỆN ĐẦY ĐỦ – VUI LÒNG KIỂM TRA CÁC DÒNG CÒN THIẾU (Đã nhận diện ${rows.length}/${expectedTotal} dòng, còn thiếu ${expectedTotal! - rows.length} dòng).`
    : undefined;

  const requiresAdminConfirmation =
    report.image_quality !== 'GOOD' ||
    uncertainPrograms.length > 0 ||
    missingDataPrograms.length > 0 ||
    warningRows > 0 ||
    hasCountMismatch ||
    runtimeDuplicates.length > 0 ||
    isIncomplete;

  const blockingReasons: string[] = [];
  if (rows.length === 0) {
    blockingReasons.push('Chưa có dòng chương trình nào để lưu.');
  }
  if (errorRows > 0) {
    blockingReasons.push(`Còn ${errorRows} dòng có lỗi dữ liệu bắt buộc (cần sửa trực tiếp hoặc xóa dòng lỗi).`);
  }
  if (runtimeDuplicates.length > 0) {
    const inTableDuplicates = Array.from(seenKeys.values()).some((c) => c > 1);
    if (inTableDuplicates) {
      blockingReasons.push('Còn dòng chương trình trùng tên + kênh trong bảng xem trước (hãy xóa dòng trùng).');
    }
  }
  if (requiresAdminConfirmation && !adminConfirmedWarnings) {
    blockingReasons.push(
      isIncomplete
        ? 'Vui lòng kiểm tra các dòng còn thiếu và tick xác nhận đã rà soát trước khi lưu.'
        : 'Vui lòng tick xác nhận đã kiểm tra các cảnh báo / trường chưa chắc chắn.'
    );
  }

  return {
    totalRecognized: rows.length,
    expectedTotal,
    validRows,
    errorRows,
    warningRows,
    missingDataPrograms: Array.from(new Set(missingDataPrograms)),
    uncertainPrograms,
    duplicatePrograms: Array.from(new Set(runtimeDuplicates)),
    under100Count,
    overOrEqual100Count,
    hasCountMismatch,
    requiresAdminConfirmation,
    canConfirmSave: blockingReasons.length === 0,
    blockingReasons,
    minStt,
    maxStt,
    missingSttCount,
    duplicateSttCount,
    isIncomplete,
    incompleteMessage,
  };
}

/**
 * Formats numbers using plain '.' decimal (max 2 decimal places, ZERO thousands separators)
 * so RTST/utils.ts cleanNum() NEVER misinterprets a 3-digit decimal as thousands!
 */
export function formatPlainBiNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '0';
  const rounded = Math.round(val * 100) / 100;
  return String(rounded);
}

export function formatPlainBiPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '0%';
  const rounded = Math.round(val * 100) / 100;
  return `${rounded}%`;
}

/**
 * Serializes confirmed AI rows into the exact tab-delimited BI format consumed by:
 * - parseCategoryData(..., 'LUYKE')
 * - extractCategoriesFromStoreThiDua(...)
 * - cleanBiReportText(...)
 * - LuyKe.tsx (BC THÁNG) & SucKhoeNhanVien.tsx
 */
export function serializeThiDuaRowsToBiText(
  rows: ThiDuaAiRow[],
  options: {
    storeLabel: string;
    month?: number | null;
    year?: number | null;
    updatedAt?: Date;
  }
): string {
  const storeLabel = (options.storeLabel || 'ĐML - SIÊU THỊ').trim();
  const now = options.updatedAt || new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const periodStr =
    options.month && options.year
      ? `${String(options.month).padStart(2, '0')}/${options.year}`
      : `${mm}/${yyyy}`;

  const lines: string[] = [
    `Cập nhật lúc: ${hh}:${min}:${ss} ${dd}/${mm}/${yyyy}\tNGUỒN: AI_VISION_BI\tKỲ: ${periodStr}`,
  ];

  for (const row of rows) {
    if (!row.ten_chuong_trinh || row.errors.length > 0) continue;
    const metricCol = row.kenh === 'SL' ? 'SLLK' : 'DTLK';
    const pctForParser = row.ty_le_du_kien ?? row.ty_le_thuc_hien ?? 0;
    const pctThStr = row.ty_le_thuc_hien !== null ? formatPlainBiPercent(row.ty_le_thuc_hien) : '-';
    const rankStr = row.hang_cty !== null ? String(row.hang_cty) : '-';

    // Inline header matched by parseCategoryData (must include TARGET and HẠNG)
    lines.push(
      `${normalizeProgramName(row.ten_chuong_trinh)}\t${metricCol}\tTARGET\t%HT\t%TH\tHẠNG CTY`
    );
    lines.push(
      `${storeLabel}\t${formatPlainBiNumber(row.thuc_hien)}\t${formatPlainBiNumber(row.target)}\t${formatPlainBiPercent(pctForParser)}\t${pctThStr}\t${rankStr}`
    );
  }

  return lines.join('\n');
}

export interface MergeThiDuaResult {
  text: string;
  updatedCount: number;
  addedCount: number;
  totalCount: number;
  preservedExistingCount: number;
  toString(): string;
}

/**
 * Merges updated/valid ThiDua rows into existing BI text without deleting any unrelated existing programs!
 * - When replaceMode is true or existingBiText is empty: returns serialized newRows wrapped in MergeThiDuaResult.
 * - When replaceMode is false: updates matching programs (by name + channel), appends new ones, and keeps all other existing programs intact.
 */
export function mergeThiDuaRowsWithBiText(
  existingBiText: string,
  newRows: ThiDuaAiRow[],
  options: {
    storeLabel: string;
    month?: number | null;
    year?: number | null;
    updatedAt?: Date;
    replaceMode?: boolean;
    batchId?: string;
  }
): MergeThiDuaResult {
  if (options.replaceMode || !existingBiText || !existingBiText.trim()) {
    const text = serializeThiDuaRowsToBiText(newRows, options);
    const validRowsCount = newRows.filter(
      (r) => r.ten_chuong_trinh && (!r.errors || r.errors.length === 0)
    ).length;
    return {
      text,
      updatedCount: 0,
      addedCount: validRowsCount,
      totalCount: validRowsCount,
      preservedExistingCount: 0,
      toString() {
        return text;
      },
    };
  }

  const rawLines = existingBiText.split('\n');
  const storeLabel = (options.storeLabel || 'ĐML - SIÊU THỊ').trim();
  const now = options.updatedAt || new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const periodStr =
    options.month && options.year
      ? `${String(options.month).padStart(2, '0')}/${options.year}`
      : `${mm}/${yyyy}`;

  // Parse existing program blocks
  const programBlocks: Array<{
    key: string;
    progName: string;
    channel: string;
    headerLine: string;
    dataLine: string;
  }> = [];

  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i].trim();
    if (!l) continue;
    if (l.startsWith('Cập nhật lúc:')) {
      continue;
    }
    const cols = l.split('\t');
    const upperL = l.toUpperCase();
    const isProgHeader =
      cols.length >= 2 &&
      (upperL.includes('TARGET') ||
        upperL.includes('DTLK') ||
        upperL.includes('SLLK') ||
        upperL.includes('HẠNG CTY'));

    if (isProgHeader && i + 1 < rawLines.length) {
      const progName = cols[0].trim();
      const channel = upperL.includes('SLLK') ? 'SL' : 'DT';
      const dataLine = rawLines[i + 1].trim();
      programBlocks.push({
        key: `${normalizeProgramKey(progName)}::${channel}`,
        progName,
        channel,
        headerLine: l,
        dataLine,
      });
      i++; // skip dataLine
    }
  }

  const initialBlockCount = programBlocks.length;
  let updatedCount = 0;
  let addedCount = 0;

  // Update or append newRows (only valid rows)
  const validRows = newRows.filter(
    (r) => r.ten_chuong_trinh && (!r.errors || r.errors.length === 0)
  );

  for (const row of validRows) {
    const channel = row.kenh === 'SL' ? 'SL' : 'DT';
    const key = `${normalizeProgramKey(row.ten_chuong_trinh)}::${channel}`;
    const metricCol = channel === 'SL' ? 'SLLK' : 'DTLK';
    const pctForParser = row.ty_le_du_kien ?? row.ty_le_thuc_hien ?? 0;
    const pctThStr =
      row.ty_le_thuc_hien !== null ? formatPlainBiPercent(row.ty_le_thuc_hien) : '-';
    const rankStr =
      row.hang_cty !== null && row.hang_cty !== undefined ? String(row.hang_cty) : '-';

    const newHeader = `${normalizeProgramName(row.ten_chuong_trinh)}\t${metricCol}\tTARGET\t%HT\t%TH\tHẠNG CTY`;
    const newData = `${storeLabel}\t${formatPlainBiNumber(row.thuc_hien)}\t${formatPlainBiNumber(
      row.target
    )}\t${formatPlainBiPercent(pctForParser)}\t${pctThStr}\t${rankStr}`;

    const existingBlock = programBlocks.find((b) => b.key === key);
    if (existingBlock) {
      existingBlock.headerLine = newHeader;
      existingBlock.dataLine = newData;
      existingBlock.progName = row.ten_chuong_trinh;
      existingBlock.channel = channel;
      updatedCount++;
    } else {
      programBlocks.push({
        key,
        progName: row.ten_chuong_trinh,
        channel,
        headerLine: newHeader,
        dataLine: newData,
      });
      addedCount++;
    }
  }

  const outLines = [
    `Cập nhật lúc: ${hh}:${min}:${ss} ${dd}/${mm}/${yyyy}\tNGUỒN: AI_VISION_BI\tKỲ: ${periodStr}`,
  ];

  for (const block of programBlocks) {
    outLines.push(block.headerLine);
    outLines.push(block.dataLine);
  }

  const text = outLines.join('\n');
  return {
    text,
    updatedCount,
    addedCount,
    totalCount: updatedCount + addedCount,
    preservedExistingCount: initialBlockCount - updatedCount,
    toString() {
      return text;
    },
  };
}

/**
 * Computes a compact deterministic hash over normalized period + sorted rows
 * to warn Admins if they re-upload the exact same BI report.
 */
export function computeThiDuaReportHash(report: {
  month: number | null;
  year: number | null;
  rows: ThiDuaAiRow[];
}): string {
  const canonicalRows = report.rows
    .map((r) => [
      normalizeProgramKey(r.ten_chuong_trinh),
      r.kenh || '',
      r.thuc_hien ?? '',
      r.target ?? '',
      r.ty_le_thuc_hien ?? '',
      r.ty_le_du_kien ?? '',
      r.hang_cty ?? '',
    ].join('|'))
    .sort()
    .join('\n');

  const payload = `${report.month ?? ''}/${report.year ?? ''}::${canonicalRows}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + (i & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

