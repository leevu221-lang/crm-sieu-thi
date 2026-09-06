import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Store,
  Camera,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
  FileSpreadsheet,
  X,
  TrendingUp,
  Target,
  CreditCard,
  BarChart3,
  Layers,
  LayoutGrid,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { ensureFontsReady } from '../utils/fontExportUtil';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

export interface StoreTargetConfigItem {
  id: string;
  storeName: string;
  targetCungKyNam: number; // Target Cùng Kỳ Năm (triệu đồng)
  mucTieuPercent: number;  // Mục Tiêu % (ví dụ: 100%, 110%)
}

export interface ClusterStoreRow {
  stt?: number;
  rawName: string;
  storeName: string;

  // 9-Column Model (Matching the Exact Image):
  luyKe: number;            // L. KẾ
  luyKeQD: number;          // L. KẾ QĐ
  tarVuotTroi: number;      // TAR V.TRỘI
  percentHtVuotTroi: number;// %HT V.TRỘI
  percentQD: number;        // %QĐ
  percentTC: number;        // %TC
  tangGiamCK: number;       // +/-CK
  percentDuyet: number;     // %DUYỆT

  // Optional 11-column fields if parsed from "Doanh thu hợp nhất":
  soLuong?: number;
  doanhThu?: number;
  tiTrong?: number;
  doanhThuQD?: number;
  target?: number;
  percentHtTarget?: number;
  tb3Thang?: number;
  percentTT?: number;
  dtTraGop?: number;
  percentTraGop?: number;

  // Cấu hình Target siêu thị
  targetCungKyNam?: number;
  mucTieuPercent?: number;

  isSummary?: boolean;
}

export interface ClusterKpiHeader {
  dtThuc?: number;
  dtThucSub?: string;
  percentHtTarget?: number;
  percentHtTargetSub?: string;
  ttVsTb3Thang?: number;
  ttVsTb3ThangSub?: string;
  dtDuKien?: number;
  dtDuKienSub?: string;
  tlpvtc?: number;
  tlpvtcSub?: string;
  tiTrongTraGop?: number;
  tiTrongTraGopSub?: string;
}

interface ClusterReportTabProps {
  clusterSummaryInput: string;
  categoryRevenueInput?: string;
  clusterMarkets?: any[];
  userProfile?: any;
  daysPassed?: number;
  totalDays?: number;
  onNavigateToKhaiBao?: () => void;
  onSaveClusterData?: (val: string) => void;
}

/**
 * Format number with Vietnamese dot separator:
 * 4899 -> "4.899", 184 -> "184", 22013 -> "22.013", -1 -> "-1", 0 -> "0"
 */
function formatVnNum(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
  if (isNaN(num)) return String(val);
  if (num === 0) return '0';
  if (num === -1) return '-1';

  return num.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

/**
 * Format whole percentage matching image (e.g. 126 -> "126%", 0 -> "0%")
 */
function formatPct(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0%';
  if (typeof val === 'string' && val.includes('%')) {
    const raw = parseFloat(val.replace(/%/g, '').replace(/,/g, '').trim());
    if (!isNaN(raw)) return (raw % 1 !== 0 ? (Math.round(raw * 10) / 10).toString() : Math.round(raw).toString()) + '%';
    return val.trim();
  }
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
  if (isNaN(num)) return '0%';
  return (num % 1 !== 0 ? (Math.round(num * 10) / 10).toString() : Math.round(num).toString()) + '%';
}

/**
 * Format difference percentage without '+' prefix for positive values (matching image: "3%", "5%", "-24%")
 */
function formatDiffPct(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0%';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/%/g, '').replace(/,/g, '').trim());
  if (isNaN(num)) return '0%';
  return Math.round(num) + '%';
}

/**
 * Hiển thị full tên siêu thị cho bảng báo cáo cụm:
 * "10528 - ĐMM_BLI_GRA - Phường 1" -> "10528 - ĐMM_BLI_GRA - PHƯỜNG 1"
 * "ĐMM_BLI_GRA - Phường 1" -> "ĐMM_BLI_GRA - PHƯỜNG 1"
 * "ĐML_KGI_GRI - Giồng Riềng (Kho bán hàng lưu động)" -> "ĐML_KGI_GRI - GIỒNG RIỀNG (KHO BÁN HÀNG LƯU ĐỘNG)"
 * "Tổng (3 dòng)" -> "TỔNG CỤM"
 */
function cleanStoreNameForClusterTable(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (
    upper.includes('TỔNG CỤM') ||
    upper === 'TỔNG' ||
    upper.startsWith('TỔNG:') ||
    upper.startsWith('TỔNG (') ||
    upper === 'TỔNG CỘNG'
  ) {
    return 'TỔNG CỤM';
  }

  const hasKhoLuuDong =
    upper.includes('LƯU ĐỘNG') ||
    upper.includes('LUU DONG') ||
    upper.includes('KHO BÁN HÀNG') ||
    upper.includes('KHO BAN HANG');

  let result = upper.replace(/^SIÊU THỊ[:\s-]+/i, '').trim();
  if (hasKhoLuuDong && !result.includes('LƯU ĐỘNG') && !result.includes('LUU DONG')) {
    result += ' (KHO BÁN HÀNG LƯU ĐỘNG)';
  } else if (result.includes('(KHO BÁN HÀNG LƯU ĐỘNG)') || result.includes('(KHO LƯU ĐỘNG)')) {
    result = result.replace(/\(KHO\s+LƯU\s+ĐỘNG\)/i, '(KHO BÁN HÀNG LƯU ĐỘNG)');
  }
  return result;
}

function cleanRawNum(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/%/g, '').replace(/,/g, '').replace(/^\+/, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

const VALID_PREFIXES = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR', 'DML', 'DMM', 'DMS'];

function detectStoreCol(cols: string[]): { isStore: boolean; isSummary: boolean; nameColIdx: number } {
  for (let i = 0; i < Math.min(cols.length, 3); i++) {
    const val = cols[i].trim().toUpperCase();
    if (val === 'TỔNG' || val.startsWith('TỔNG CỤM') || val.startsWith('TỔNG:') || val === 'TỔNG CỘNG' || val.startsWith('TỔNG (')) {
      return { isStore: true, isSummary: true, nameColIdx: i };
    }
  }

  for (let i = 0; i < Math.min(cols.length, 3); i++) {
    const val = cols[i].trim();
    const upper = val.toUpperCase();
    if (/^\d+\s*-\s*/.test(val) || VALID_PREFIXES.some(prefix => upper.startsWith(prefix))) {
      return { isStore: true, isSummary: false, nameColIdx: i };
    }
  }

  return { isStore: false, isSummary: false, nameColIdx: -1 };
}

function parseKpiHeader(lines: string[]): ClusterKpiHeader | null {
  const kpi: ClusterKpiHeader = {};
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l === 'DT thực' && i + 1 < lines.length) {
      kpi.dtThuc = cleanRawNum(lines[i + 1]);
      kpi.dtThucSub = lines[i + 2] || '';
    } else if (l === '% HT target' && i + 1 < lines.length) {
      kpi.percentHtTarget = cleanRawNum(lines[i + 1]);
      kpi.percentHtTargetSub = lines[i + 2] || '';
    } else if (l === 'TT vs TB 3 tháng' && i + 1 < lines.length) {
      kpi.ttVsTb3Thang = cleanRawNum(lines[i + 1]);
      kpi.ttVsTb3ThangSub = lines[i + 2] || '';
    } else if (l.startsWith('DT dự kiến') && i + 1 < lines.length) {
      kpi.dtDuKien = cleanRawNum(lines[i + 1]);
      kpi.dtDuKienSub = lines[i + 2] || '';
    } else if (l.startsWith('TLPVTC') && i + 1 < lines.length) {
      kpi.tlpvtc = cleanRawNum(lines[i + 1]);
      kpi.tlpvtcSub = lines[i + 2] || '';
    } else if (l === 'Tỉ trọng trả góp' && i + 1 < lines.length) {
      kpi.tiTrongTraGop = cleanRawNum(lines[i + 1]);
      kpi.tiTrongTraGopSub = lines[i + 2] || '';
    }
  }
  return Object.keys(kpi).length > 0 ? kpi : null;
}

export const DEFAULT_CONSOLIDATED_DATA: Array<{
  rawName: string;
  storeName?: string;
  tb3Thang: number;
  percentTT: number;
  dtTraGop: number;
  percentTraGop: number;
}> = [
  {
    rawName: '1841 - ĐML_CMA_CMA - 155A Nguyễn Tất Thành',
    tb3Thang: 1219,
    percentTT: 24.7,
    dtTraGop: 546,
    percentTraGop: 52.5,
  },
  {
    rawName: '10528 - ĐMM_BLI_GRA - Phường 1',
    tb3Thang: 579,
    percentTT: 115.9,
    dtTraGop: 377,
    percentTraGop: 46.1,
  },
  {
    rawName: '10496 - ĐMS3_BLI_HBI - Vĩnh Bình',
    tb3Thang: 149,
    percentTT: 131.2,
    dtTraGop: 139,
    percentTraGop: 60.0,
  },
  {
    rawName: '7676 - ĐMS_BLI_GRA - Tân Phong',
    tb3Thang: 194,
    percentTT: 55.5,
    dtTraGop: 116,
    percentTraGop: 66.0,
  },
];

export const DEFAULT_CONSOLIDATED_SUMMARY = {
  rawName: 'Tổng (3 dòng)',
  storeName: 'TỔNG CỤM',
  tb3Thang: 923,
  percentTT: 105.7,
  dtTraGop: 632,
  percentTraGop: 51.6,
};

export function matchStoreNames(a: string, b: string): boolean {
  if (!a || !b) return false;
  const cleanA = a.toUpperCase().trim();
  const cleanB = b.toUpperCase().trim();
  if (cleanA === cleanB) return true;

  // Match summary row names (e.g. "TỔNG CỤM", "Tổng (1 dòng)", "Tổng cộng")
  if ((cleanA.startsWith('TỔNG') || cleanA.includes('TỔNG CỤM')) && (cleanB.startsWith('TỔNG') || cleanB.includes('TỔNG CỤM'))) {
    return true;
  }

  // 1. Code match (e.g. 10528, 10496, 7676, 1841)
  const codeA = cleanA.match(/\b(\d{3,6})\b/)?.[1];
  const codeB = cleanB.match(/\b(\d{3,6})\b/)?.[1];
  if (codeA && codeB) return codeA === codeB;

  const strip = (s: string) =>
    s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Đ/g, 'D')
      .replace(/[^A-Z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Strip leading numeric code (e.g. "1841 - ĐML_CMA_CMA..." vs "ĐML_CMA_CMA...")
  const stripLeadingCode = (s: string) => s.replace(/^\d+\s*[-–—]\s*/, '').trim();
  if (strip(stripLeadingCode(cleanA)) === strip(stripLeadingCode(cleanB))) return true;

  const normA = strip(cleanA);
  const normB = strip(cleanB);
  if (normA === normB) return true;

  // If both have sub-parts after dash, check the specific location
  const getSubLocation = (s: string) => {
    const parts = s.split(/[-–—]/);
    if (parts.length > 1) {
      return strip(parts[parts.length - 1]);
    }
    return '';
  };

  const locA = getSubLocation(cleanA);
  const locB = getSubLocation(cleanB);

  if (locA && locB) {
    if (locA === locB || locA.includes(locB) || locB.includes(locA)) {
      return true;
    }
  }

  // Check prefix code: e.g. DMM BLI GRA
  const getPrefix = (s: string) => {
    const m = s.match(/(DMM|DMS3|DMS|DML|TGD|AAR)[_\s][A-Z0-9_]+/i);
    return m ? strip(m[0]) : '';
  };
  const preA = getPrefix(normA);
  const preB = getPrefix(normB);
  if (preA && preB && preA === preB) {
    if (!locA || !locB || locA === locB) return true;
  }

  return false;
}

function getColumnIndices(headers: string[]) {
  const normHeaders = headers.map(h => h.toLowerCase().normalize('NFC').trim());
  const findIdx = (predicate: (h: string) => boolean) => normHeaders.findIndex(predicate);

  const soLuongIdx = findIdx(h => h.includes('số lượng') || h.includes('so luong') || h === 'sl');
  const doanhThuQDIdx = findIdx(h => h.includes('qđ') || h.includes('quy đổi') || h.includes('qd'));
  const tiTrongIdx = findIdx(h => (h.includes('tỉ trọng') || h.includes('tỷ trọng') || h.includes('%')) && !h.includes('trả') && !h.includes('tg') && !h.includes('tc') && !h.includes('ht') && !h.includes('tt') && !h.includes('tiến độ'));
  const doanhThuIdx = findIdx(h => (h === 'doanh thu' || h.includes('dtlk') || h.includes('lũy kế') || h.includes('doanh thu lũy kế')) && !h.includes('qđ') && !h.includes('quy đổi') && !h.includes('trả') && !h.includes('dự kiến') && !h.includes('target'));
  const targetIdx = findIdx(h => (h.includes('target') || h.includes('mục tiêu')) && !h.includes('qđ') && !h.includes('%'));
  const percentHtTargetIdx = findIdx(h => (h.includes('% ht') || h.includes('%ht') || h.includes('tiến độ') || h.includes('v.trội')) && !h.includes('lntt'));
  const tb3ThangIdx = findIdx(h => h.includes('tb 3') || h.includes('tb3t') || h.includes('tb 3t') || h.includes('tb 3 thang'));
  const percentTTIdx = findIdx(h => h === '% tt' || h.includes('% tăng trưởng') || h.includes('tăng trưởng') || h.includes('tt vs tb 3') || h.includes('% tt'));
  const dtTraGopIdx = findIdx(h => (h.includes('dt') || h.includes('doanh thu')) && (h.includes('trả góp') || h.includes('trả chậm') || h.includes('tg') || h.includes('tc')) && !h.includes('%') && !h.includes('tỉ trọng') && !h.includes('tỷ trọng'));
  const percentTraGopIdx = findIdx(h => (h.includes('%') || h.includes('tỉ trọng') || h.includes('tỷ trọng')) && (h.includes('trả góp') || h.includes('trả chậm') || h.includes('tg') || h.includes('tc')));

  return {
    soLuongIdx,
    doanhThuQDIdx,
    tiTrongIdx,
    doanhThuIdx,
    targetIdx,
    percentHtTargetIdx,
    tb3ThangIdx,
    percentTTIdx,
    dtTraGopIdx,
    percentTraGopIdx,
  };
}

function parseConsolidatedFormat(
  rawText: string,
  daysPassed?: number,
  totalDays?: number
): { 
  rows: ClusterStoreRow[]; 
  summaryRow: ClusterStoreRow | null; 
  kpiHeader: ClusterKpiHeader | null; 
  has11Cols: boolean 
} | null {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const kpiHeader = parseKpiHeader(lines);

  let headerIdx = -1;
  let isTabbed = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('[') || l.includes('https://')) continue;

    if (l.toLowerCase() === 'siêu thị' || l.toLowerCase().startsWith('siêu thị') || l.toLowerCase() === 'tên siêu thị') {
      if (i + 2 < lines.length && (
        lines[i + 1].toUpperCase().includes('SỐ LƯỢNG') ||
        lines[i + 2].toUpperCase().includes('DOANH THU') ||
        lines[i + 1].toUpperCase().includes('DOANH THU') ||
        lines[i + 1].toUpperCase().includes('QĐ')
      )) {
        headerIdx = i;
        isTabbed = false;
        break;
      }
    }
    
    if (l.includes('\t') && (l.toLowerCase().includes('siêu thị') || l.toLowerCase().includes('sieu thi') || l.toLowerCase().includes('stt') || l.toLowerCase().includes('tên miền'))) {
      const cols = l.split('\t').map(c => c.normalize('NFC').trim().toUpperCase());
      if (cols.some(c => c.includes('DOANH THU') || c.includes('SỐ LƯỢNG') || c.includes('SO LUONG') || c.includes('TARGET') || c.includes('MỤC TIÊU') || c.includes('QĐ'))) {
        headerIdx = i;
        isTabbed = true;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    return null;
  }

  const rows: ClusterStoreRow[] = [];
  let summaryRow: ClusterStoreRow | null = null;

  if (isTabbed) {
    const headerLineCols = lines[headerIdx].split('\t').map(c => c.toLowerCase().trim());
    const colMap = getColumnIndices(headerLineCols);

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('Đơn vị:') || line.includes('Tỉ trọng tính trong nhóm')) break;
      const cols = line.split('\t').map(c => c.trim());
      if (cols.length < 4) continue;
      const rawName = cols[0];
      const isSum = rawName.toLowerCase().startsWith('tổng');

      const soLuong = colMap.soLuongIdx !== -1 && colMap.soLuongIdx < cols.length ? cleanRawNum(cols[colMap.soLuongIdx]) : cleanRawNum(cols[1]);
      const doanhThuQD = colMap.doanhThuQDIdx !== -1 && colMap.doanhThuQDIdx < cols.length ? cleanRawNum(cols[colMap.doanhThuQDIdx]) : 0;
      const tiTrong = colMap.tiTrongIdx !== -1 && colMap.tiTrongIdx < cols.length ? cleanRawNum(cols[colMap.tiTrongIdx]) : 0;
      const doanhThu = colMap.doanhThuIdx !== -1 && colMap.doanhThuIdx < cols.length ? cleanRawNum(cols[colMap.doanhThuIdx]) : 0;
      const target = colMap.targetIdx !== -1 && colMap.targetIdx < cols.length ? cleanRawNum(cols[colMap.targetIdx]) : 0;
      const rawPercentHtTarget = colMap.percentHtTargetIdx !== -1 && colMap.percentHtTargetIdx < cols.length ? cleanRawNum(cols[colMap.percentHtTargetIdx]) : 0;
      const tb3Thang = colMap.tb3ThangIdx !== -1 && colMap.tb3ThangIdx < cols.length ? cleanRawNum(cols[colMap.tb3ThangIdx]) : (cols.length >= 8 ? cleanRawNum(cols[cols.length - 4]) : 0);
      const percentTT = colMap.percentTTIdx !== -1 && colMap.percentTTIdx < cols.length ? cleanRawNum(cols[colMap.percentTTIdx]) : (cols.length >= 8 ? cleanRawNum(cols[cols.length - 3]) : 0);
      const dtTraGop = colMap.dtTraGopIdx !== -1 && colMap.dtTraGopIdx < cols.length ? cleanRawNum(cols[colMap.dtTraGopIdx]) : (cols.length >= 4 ? cleanRawNum(cols[cols.length - 2]) : 0);
      const percentTraGop = colMap.percentTraGopIdx !== -1 && colMap.percentTraGopIdx < cols.length ? cleanRawNum(cols[colMap.percentTraGopIdx]) : (cols.length >= 4 ? cleanRawNum(cols[cols.length - 1]) : 0);

      // %HT V.TRỘI tính dự kiến của cột L.KẾ QĐ: (L.KẾ QĐ / daysPassed * totalDays) / TARGET
      const dtDuKienQD = (daysPassed && daysPassed > 0 && totalDays && totalDays > 0)
        ? (doanhThuQD / daysPassed) * totalDays
        : doanhThuQD;
      const percentHtTarget = target > 0 ? (dtDuKienQD / target) * 100 : rawPercentHtTarget;

      const r: ClusterStoreRow = {
        rawName,
        storeName: isSum ? 'TỔNG CỤM' : cleanStoreNameForClusterTable(rawName),
        luyKe: doanhThu,
        luyKeQD: doanhThuQD,
        tarVuotTroi: target,
        percentHtVuotTroi: percentHtTarget,
        percentQD: percentTT,
        percentTC: percentTraGop,
        tangGiamCK: percentTT,
        percentDuyet: 0,
        soLuong,
        doanhThu,
        tiTrong,
        doanhThuQD,
        target,
        percentHtTarget,
        tb3Thang,
        percentTT,
        dtTraGop,
        percentTraGop,
        isSummary: isSum,
      };

      if (isSum) summaryRow = r;
      else rows.push(r);
    }
  } else {
    let dataStartIdx = -1;
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^\d+\s*-\s*/.test(l) || /^(ĐML|ĐMM|ĐMS|TGD|AAR|DML|DMM|DMS)/i.test(l)) {
        dataStartIdx = i;
        break;
      }
    }

    if (dataStartIdx !== -1) {
      const detectedHeaderList: string[] = [];
      for (let i = headerIdx; i < dataStartIdx; i++) {
        detectedHeaderList.push(lines[i].toLowerCase().trim());
      }
      const dataColCount = Math.max(1, detectedHeaderList.length - 1);
      const colMap = getColumnIndices(detectedHeaderList);

      let curr = dataStartIdx;
      while (curr < lines.length) {
        const line = lines[curr];
        if (line.startsWith('Đơn vị:') || line.includes('Tỉ trọng tính trong nhóm')) break;
        const isSum = line.toLowerCase().startsWith('tổng');
        const isStore = /^\d+\s*-\s*/.test(line) || /^(ĐML|ĐMM|ĐMS|TGD|AAR|DML|DMM|DMS)/i.test(line) || isSum;
        if (!isStore) {
          curr++;
          continue;
        }

        let rawName = line;
        let rowValues: string[] = [];
        let nextAdvance = 1;

        if (line.includes('\t')) {
          const parts = line.split('\t').map(c => c.trim());
          rawName = parts[0];
          rowValues = parts.slice(1);
          nextAdvance = 1;
        } else if (curr + 1 < lines.length && lines[curr + 1].includes('\t')) {
          rowValues = lines[curr + 1].split('\t').map(c => c.trim());
          nextAdvance = 2;
        } else {
          for (let k = 1; k <= dataColCount && (curr + k) < lines.length; k++) {
            rowValues.push(lines[curr + k]);
          }
          nextAdvance = dataColCount + 1;
        }

        const getVal = (colIdx: number, fallback: number) => {
          if (colIdx > 0 && (colIdx - 1) < rowValues.length) {
            return cleanRawNum(rowValues[colIdx - 1]);
          }
          return fallback;
        };

        const soLuong = getVal(colMap.soLuongIdx, cleanRawNum(rowValues[0]));
        const doanhThuQD = getVal(colMap.doanhThuQDIdx, cleanRawNum(rowValues[1]));
        const tiTrong = getVal(colMap.tiTrongIdx, cleanRawNum(rowValues[2]));
        const doanhThu = getVal(colMap.doanhThuIdx, cleanRawNum(rowValues[3]));
        const target = getVal(colMap.targetIdx, cleanRawNum(rowValues[4]));
        const rawPercentHtTarget = getVal(colMap.percentHtTargetIdx, cleanRawNum(rowValues[5]));

        const tb3Thang = getVal(colMap.tb3ThangIdx, rowValues.length >= 8 ? cleanRawNum(rowValues[rowValues.length - 4]) : 0);
        const percentTT = getVal(colMap.percentTTIdx, rowValues.length >= 8 ? cleanRawNum(rowValues[rowValues.length - 3]) : 0);
        const dtTraGop = getVal(colMap.dtTraGopIdx, rowValues.length >= 4 ? cleanRawNum(rowValues[rowValues.length - 2]) : 0);
        const percentTraGop = getVal(colMap.percentTraGopIdx, rowValues.length >= 4 ? cleanRawNum(rowValues[rowValues.length - 1]) : 0);

        // %HT V.TRỘI tính dự kiến của cột L.KẾ QĐ: (L.KẾ QĐ / daysPassed * totalDays) / TARGET
        const dtDuKienQD = (daysPassed && daysPassed > 0 && totalDays && totalDays > 0)
          ? (doanhThuQD / daysPassed) * totalDays
          : doanhThuQD;
        const percentHtTarget = target > 0 ? (dtDuKienQD / target) * 100 : rawPercentHtTarget;

        const r: ClusterStoreRow = {
          rawName,
          storeName: isSum ? 'TỔNG CỤM' : cleanStoreNameForClusterTable(rawName),
          luyKe: doanhThu,
          luyKeQD: doanhThuQD,
          tarVuotTroi: target,
          percentHtVuotTroi: percentHtTarget,
          percentQD: doanhThu > 0 ? ((doanhThuQD - doanhThu) / doanhThu) * 100 : percentTT,
          percentTC: percentTraGop,
          tangGiamCK: percentTT,
          percentDuyet: 0,
          soLuong,
          doanhThu,
          tiTrong,
          doanhThuQD,
          target,
          percentHtTarget,
          tb3Thang,
          percentTT,
          dtTraGop,
          percentTraGop,
          isSummary: isSum,
        };

        if (isSum) summaryRow = r;
        else rows.push(r);

        curr += nextAdvance;
      }
    }
  }

  if (rows.length === 0 && !summaryRow) return null;

  if (!summaryRow && rows.length > 0) {
    const sumLuyKe = rows.reduce((acc, r) => acc + r.luyKe, 0);
    const sumLuyKeQD = rows.reduce((acc, r) => acc + r.luyKeQD, 0);
    const sumTar = rows.reduce((acc, r) => acc + r.tarVuotTroi, 0);
    const sumDtDuKienQD = (daysPassed && daysPassed > 0 && totalDays && totalDays > 0)
      ? (sumLuyKeQD / daysPassed) * totalDays
      : sumLuyKeQD;
    const sumPercentHt = sumTar > 0 ? (sumDtDuKienQD / sumTar) * 100 : 0;
    const sumPercentQD = rows.length > 0 ? rows.reduce((a, b) => a + b.percentQD, 0) / rows.length : 0;
    const sumPercentTC = rows.length > 0 ? rows.reduce((a, b) => a + b.percentTC, 0) / rows.length : 0;
    const sumTangGiamCK = rows.length > 0 ? rows.reduce((a, b) => a + b.tangGiamCK, 0) / rows.length : 0;

    summaryRow = {
      rawName: 'TỔNG CỤM',
      storeName: 'TỔNG CỤM',
      luyKe: sumLuyKe,
      luyKeQD: sumLuyKeQD,
      tarVuotTroi: sumTar,
      percentHtVuotTroi: sumPercentHt,
      percentQD: sumPercentQD,
      percentTC: sumPercentTC,
      tangGiamCK: sumTangGiamCK,
      percentDuyet: 0,
      soLuong: rows.reduce((a, b) => a + (b.soLuong || 0), 0),
      doanhThu: sumLuyKe,
      tiTrong: 100,
      doanhThuQD: sumLuyKeQD,
      target: sumTar,
      percentHtTarget: sumPercentHt,
      tb3Thang: rows.reduce((a, b) => a + (b.tb3Thang || 0), 0),
      percentTT: sumPercentQD,
      dtTraGop: rows.reduce((a, b) => a + (b.dtTraGop || 0), 0),
      percentTraGop: sumPercentTC,
      isSummary: true,
    };
  }

  return { rows, summaryRow, kpiHeader, has11Cols: true };
}

/**
 * Classic parser for older/standard BI report formats (9 columns)
 * EXACTLY preserves every row including kho bán hàng lưu động as shown in image!
 */
function parseClassicClusterSummaryData(
  rawText: string,
  daysPassed?: number,
  totalDays?: number
): { rows: ClusterStoreRow[]; summaryRow: ClusterStoreRow | null } {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const rawRows: ClusterStoreRow[] = [];
  let summaryRow: ClusterStoreRow | null = null;

  let nameIdx = -1;
  let luyKeIdx = -1;
  let luyKeQDIdx = -1;
  let tarVuotTroiIdx = -1;
  let percentHtTargetIdx = -1;
  let percentQDIdx = -1;
  let percentTCIdx = -1;
  let tangGiamCKIdx = -1;
  let percentDuyetIdx = -1;
  let tb3ThangIdx = -1;
  let percentTTIdx = -1;
  let dtTraGopIdx = -1;
  let percentTraGopIdx = -1;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('hỗ trợ bi liên hệ user') || lowerLine.includes('copyright © bi report')) continue;

    const cols = line.split(/\t|\||\s{2,}/).map(c => c.trim());
    if (cols.length < 2) continue;

    if (
      lowerLine.includes('tên miền') ||
      lowerLine.includes('tên siêu thị') ||
      lowerLine.includes('dt hôm qua') ||
      (lowerLine.includes('siêu thị') && (lowerLine.includes('dtlk') || lowerLine.includes('doanh thu') || lowerLine.includes('số lượng') || lowerLine.includes('target')))
    ) {
      nameIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return l.includes('tên miền') || l.includes('tên siêu thị') || l.includes('siêu thị');
      });
      luyKeIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l === 'dtlk' || l.includes('lũy kế') || l.includes('l.kế') || l.includes('l. kế')) && !l.includes('quy đổi') && !l.includes('qđ') && !l.includes('khách') && !l.includes('tlpvtc') && !l.includes('ck');
      });
      luyKeQDIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l === 'dtqđ' || l.includes('quy đổi') || l.includes('l.kế qđ') || l.includes('l. kế qđ')) && !l.includes('dự kiến') && !l.includes('target') && !l.includes('ck') && !l.includes('lãi');
      });
      tarVuotTroiIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l.includes('dt dự kiến (qđ)') || l.includes('dt dự kiến qđ') || l.includes('target (qđ)') || l.includes('target qđ') || l.includes('tar v.trội') || l.includes('vượt trội')) && !l.includes('%');
      });
      percentHtTargetIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l.includes('% ht target') || l.includes('% ht') || l.includes('%ht') || l.includes('v.trội') || l.includes('vượt trội')) && !l.includes('lntt');
      });
      percentQDIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l.includes('+/- dtck tháng (qđ)') || l.includes('dtck tháng (qđ)') || l.includes('dtck (qđ)') || l.includes('% qđ') || l.includes('%qđ')) && !l.includes('lãi');
      });
      percentTCIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l === 'tỷ trọng trả chậm' || l.includes('tỷ trọng tc') || l.includes('tỷ trọng trả góp') || l === '%tc' || l === '% tc') && !l.includes('+/-');
      });
      percentDuyetIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return l.includes('tỷ lệ duyệt') || l.includes('% duyệt') || l.includes('%duyệt') || l.includes('duyệt hồ sơ');
      });
      tangGiamCKIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return l.includes('+/- tỷ trọng trả chậm') || l.includes('+/- tỷ trọng tc') || l.includes('+/-ck') || l.includes('+/- ck');
      });
      tb3ThangIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return l.includes('tb 3 tháng') || l.includes('tb 3t') || l.includes('tb3t') || l.includes('tb3 tháng');
      });
      percentTTIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return l.includes('% tt') || l.includes('% tăng trưởng') || l.includes('tăng trưởng') || l.includes('% tt vs tb');
      });
      dtTraGopIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l.includes('dt trả góp') || l.includes('doanh thu trả góp') || l.includes('dt trả chậm') || l.includes('doanh thu trả chậm')) && !l.includes('%');
      });
      percentTraGopIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return l.includes('% trả góp') || l.includes('% trả chậm') || l.includes('tỷ trọng trả góp') || l.includes('tỉ trọng trả góp');
      });
      continue;
    }

    let detectedNameIdx = -1;
    let rawStoreName = '';
    let isSummary = false;

    if (nameIdx !== -1 && nameIdx < cols.length) {
      const storeDet = detectStoreCol([cols[nameIdx]]);
      if (storeDet.isStore) {
        detectedNameIdx = nameIdx;
        rawStoreName = cols[nameIdx];
        isSummary = storeDet.isSummary;
      }
    }

    if (detectedNameIdx === -1) {
      const storeDet = detectStoreCol(cols);
      if (storeDet.isStore) {
        detectedNameIdx = storeDet.nameColIdx;
        rawStoreName = cols[storeDet.nameColIdx];
        isSummary = storeDet.isSummary;
      }
    }

    if (detectedNameIdx === -1) continue;

    let luyKe = 0;
    let luyKeQD = 0;
    let tarVuotTroi = 0;
    let percentHtVuotTroi = 0;
    let percentQD = 0;
    let percentTC = 0;
    let tangGiamCK = 0;
    let percentDuyet = 0;
    let tb3Thang = 0;
    let percentTT = 0;
    let dtTraGop = 0;
    let percentTraGop = 0;

    if (luyKeIdx !== -1 && luyKeIdx < cols.length) luyKe = cleanRawNum(cols[luyKeIdx]);
    else if (detectedNameIdx + 1 < cols.length) luyKe = cleanRawNum(cols[detectedNameIdx + 1]);

    if (luyKeQDIdx !== -1 && luyKeQDIdx < cols.length) luyKeQD = cleanRawNum(cols[luyKeQDIdx]);
    else if (detectedNameIdx + 2 < cols.length) luyKeQD = cleanRawNum(cols[detectedNameIdx + 2]);

    if (tarVuotTroiIdx !== -1 && tarVuotTroiIdx < cols.length) tarVuotTroi = cleanRawNum(cols[tarVuotTroiIdx]);
    else if (detectedNameIdx + 7 < cols.length) tarVuotTroi = cleanRawNum(cols[detectedNameIdx + 7]);

    // %HT V.TRỘI tính dự kiến của cột L.KẾ QĐ: (L.KẾ QĐ / daysPassed * totalDays) / TAR V.TRỘI
    const dtDuKienQD = (daysPassed && daysPassed > 0 && totalDays && totalDays > 0)
      ? (luyKeQD / daysPassed) * totalDays
      : luyKeQD;
    if (tarVuotTroi > 0) {
      percentHtVuotTroi = (dtDuKienQD / tarVuotTroi) * 100;
    } else if (percentHtTargetIdx !== -1 && percentHtTargetIdx < cols.length) {
      percentHtVuotTroi = cleanRawNum(cols[percentHtTargetIdx]);
    } else if (detectedNameIdx + 8 < cols.length) {
      percentHtVuotTroi = cleanRawNum(cols[detectedNameIdx + 8]);
    }

    if (percentQDIdx !== -1 && percentQDIdx < cols.length) percentQD = cleanRawNum(cols[percentQDIdx]);
    else if (detectedNameIdx + 10 < cols.length) percentQD = cleanRawNum(cols[detectedNameIdx + 10]);

    if (percentTCIdx !== -1 && percentTCIdx < cols.length) percentTC = cleanRawNum(cols[percentTCIdx]);
    else if (detectedNameIdx + 12 < cols.length) percentTC = cleanRawNum(cols[detectedNameIdx + 12]);

    if (tangGiamCKIdx !== -1 && tangGiamCKIdx < cols.length) tangGiamCK = cleanRawNum(cols[tangGiamCKIdx]);
    else if (detectedNameIdx + 13 < cols.length) tangGiamCK = cleanRawNum(cols[detectedNameIdx + 13]);

    if (percentDuyetIdx !== -1 && percentDuyetIdx < cols.length) percentDuyet = cleanRawNum(cols[percentDuyetIdx]);
    else if (detectedNameIdx + 14 < cols.length) percentDuyet = cleanRawNum(cols[detectedNameIdx + 14]);

    if (tb3ThangIdx !== -1 && tb3ThangIdx < cols.length) tb3Thang = cleanRawNum(cols[tb3ThangIdx]);
    if (percentTTIdx !== -1 && percentTTIdx < cols.length) percentTT = cleanRawNum(cols[percentTTIdx]);
    if (dtTraGopIdx !== -1 && dtTraGopIdx < cols.length) dtTraGop = cleanRawNum(cols[dtTraGopIdx]);
    if (percentTraGopIdx !== -1 && percentTraGopIdx < cols.length) percentTraGop = cleanRawNum(cols[percentTraGopIdx]);
    else if (percentTC !== 0) percentTraGop = percentTC;

    const formattedName = cleanStoreNameForClusterTable(rawStoreName);
    const rowObj: ClusterStoreRow = {
      rawName: rawStoreName,
      storeName: isSummary ? 'TỔNG CỤM' : formattedName,
      luyKe,
      luyKeQD,
      tarVuotTroi,
      percentHtVuotTroi,
      percentQD,
      percentTC,
      tangGiamCK,
      percentDuyet,
      tb3Thang,
      percentTT,
      dtTraGop,
      percentTraGop,
      isSummary,
    };

    if (isSummary) {
      summaryRow = rowObj;
    } else {
      rawRows.push(rowObj);
    }
  }

  const rows = rawRows;
  if (!summaryRow && rows.length > 0) {
    const sumLuyKe = rows.reduce((acc, r) => acc + r.luyKe, 0);
    const sumLuyKeQD = rows.reduce((acc, r) => acc + r.luyKeQD, 0);
    const sumTar = rows.reduce((acc, r) => acc + r.tarVuotTroi, 0);
    const sumDtDuKienQD = (daysPassed && daysPassed > 0 && totalDays && totalDays > 0)
      ? (sumLuyKeQD / daysPassed) * totalDays
      : sumLuyKeQD;
    const sumPercentHt = sumTar > 0 ? (sumDtDuKienQD / sumTar) * 100 : 0;
    const sumPercentQD = rows.length > 0 ? rows.reduce((a, b) => a + b.percentQD, 0) / rows.length : 0;
    const sumPercentTC = rows.length > 0 ? rows.reduce((a, b) => a + b.percentTC, 0) / rows.length : 0;
    const sumTangGiamCK = rows.length > 0 ? rows.reduce((a, b) => a + b.tangGiamCK, 0) / rows.length : 0;
    const sumPercentDuyet = rows.length > 0 ? rows.reduce((a, b) => a + b.percentDuyet, 0) / rows.length : 0;
    const sumTb3Thang = rows.reduce((acc, r) => acc + (r.tb3Thang || 0), 0);
    const sumPercentTT = rows.length > 0 ? rows.reduce((acc, r) => acc + (r.percentTT || 0), 0) / rows.length : 0;
    const sumDtTraGop = rows.reduce((acc, r) => acc + (r.dtTraGop || 0), 0);
    const sumPercentTraGop = sumLuyKe > 0 && sumDtTraGop > 0 ? (sumDtTraGop / sumLuyKe) * 100 : (rows.length > 0 ? rows.reduce((acc, r) => acc + (r.percentTraGop || 0), 0) / rows.length : 0);

    summaryRow = {
      rawName: 'TỔNG CỤM',
      storeName: 'TỔNG CỤM',
      luyKe: sumLuyKe,
      luyKeQD: sumLuyKeQD,
      tarVuotTroi: sumTar,
      percentHtVuotTroi: sumPercentHt,
      percentQD: sumPercentQD,
      percentTC: sumPercentTC,
      tangGiamCK: sumTangGiamCK,
      percentDuyet: sumPercentDuyet,
      tb3Thang: sumTb3Thang,
      percentTT: sumPercentTT,
      dtTraGop: sumDtTraGop,
      percentTraGop: sumPercentTraGop,
      isSummary: true,
    };
  }

  return { rows, summaryRow };
}

function parseClusterSummaryData(
  rawText: string,
  daysPassed?: number,
  totalDays?: number
): { 
  rows: ClusterStoreRow[]; 
  summaryRow: ClusterStoreRow | null; 
  kpiHeader: ClusterKpiHeader | null; 
  has11Cols: boolean 
} {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { rows: [], summaryRow: null, kpiHeader: null, has11Cols: false };
  }

  const newResult = parseConsolidatedFormat(rawText, daysPassed, totalDays);
  if (newResult && (newResult.rows.length > 0 || newResult.summaryRow)) {
    return newResult;
  }

  const classicResult = parseClassicClusterSummaryData(rawText, daysPassed, totalDays);
  return { ...classicResult, kpiHeader: null, has11Cols: false };
}

export const ClusterReportTab: React.FC<ClusterReportTabProps> = ({
  clusterSummaryInput,
  categoryRevenueInput,
  clusterMarkets,
  userProfile,
  daysPassed,
  totalDays,
  onNavigateToKhaiBao,
  onSaveClusterData,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);

  // Local override when user pastes data in modal directly
  const [localRawOverride, setLocalRawOverride] = useState<string | null>(null);

  // Table display mode: default is false (9-Column Table 100% Matching Image)
  const [showFull11Cols, setShowFull11Cols] = useState(false);

  // Target Configuration Modal States
  const [isTargetConfigModalOpen, setIsTargetConfigModalOpen] = useState(false);
  const [targetConfigs, setTargetConfigs] = useState<Record<string, { targetCungKyNam: number; mucTieuPercent: number }>>(() => {
    try {
      const saved = localStorage.getItem('crm_cluster_store_target_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load target config:', e);
    }
    return {};
  });
  const [modalTargetList, setModalTargetList] = useState<StoreTargetConfigItem[]>([]);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [quickPercentInput, setQuickPercentInput] = useState<number>(100);

  const tableRef = useRef<HTMLDivElement>(null);

  const handleOpenTargetConfig = () => {
    const list: StoreTargetConfigItem[] = [];
    const seenNames = new Set<string>();

    if (rows.length > 0) {
      rows.forEach((r, idx) => {
        const name = r.storeName || r.rawName;
        if (!name || seenNames.has(name)) return;
        seenNames.add(name);

        const savedEntry = Object.entries(targetConfigs).find(([storeKey]) => 
          matchStoreNames(storeKey, name) || (r.rawName && matchStoreNames(storeKey, r.rawName))
        );
        const saved = savedEntry ? savedEntry[1] : (targetConfigs[name] ||
                      targetConfigs[cleanStoreNameForClusterTable(name)] ||
                      (r.rawName ? targetConfigs[r.rawName] : undefined));

        list.push({
          id: `store_${idx}_${name}`,
          storeName: name,
          targetCungKyNam: saved?.targetCungKyNam ?? (r.targetCungKyNam || r.tarVuotTroi || r.target || 0),
          mucTieuPercent: saved?.mucTieuPercent ?? 100,
        });
      });
    }

    // Include any previously saved stores not in current rows
    Object.entries(targetConfigs).forEach(([savedName, cfg], idx) => {
      const alreadyInList = Array.from(seenNames).some(sn => matchStoreNames(sn, savedName));
      if (!alreadyInList) {
        seenNames.add(savedName);
        list.push({
          id: `saved_${idx}_${savedName}`,
          storeName: savedName,
          targetCungKyNam: cfg.targetCungKyNam || 0,
          mucTieuPercent: cfg.mucTieuPercent || 100,
        });
      }
    });

    // Fallback if empty
    if (list.length === 0) {
      const defaultNames = clusterMarkets && clusterMarkets.length > 0
        ? clusterMarkets.map((m: any) => cleanStoreNameForClusterTable(m.name || m.storeName || ''))
        : [
            '10528 - ĐMM_BLI_GRA - PHƯỜNG 1',
            '10496 - ĐMS3_BLI_HBI - VĨNH BÌNH',
            '7676 - ĐMS_BLI_GRA - TÂN PHONG',
          ];

      defaultNames.filter(Boolean).forEach((name, idx) => {
        list.push({
          id: `default_${idx}_${name}`,
          storeName: name,
          targetCungKyNam: 0,
          mucTieuPercent: 100,
        });
      });
    }

    setModalTargetList(list);
    setIsTargetConfigModalOpen(true);
  };

  const handleUpdateTargetItem = (id: string, field: 'storeName' | 'targetCungKyNam' | 'mucTieuPercent', value: any) => {
    setModalTargetList(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleApplyQuickPercent = (pct: number) => {
    if (isNaN(pct)) return;
    setModalTargetList(prev => prev.map(item => ({
      ...item,
      mucTieuPercent: pct,
    })));
  };

  const handleAddStoreToConfig = () => {
    const newId = `new_store_${Date.now()}`;
    setModalTargetList(prev => [
      ...prev,
      {
        id: newId,
        storeName: `Siêu thị mới ${prev.length + 1}`,
        targetCungKyNam: 0,
        mucTieuPercent: 100,
      }
    ]);
  };

  const handleRemoveStoreFromConfig = (id: string) => {
    setModalTargetList(prev => prev.filter(item => item.id !== id));
  };

  const handleResetTargetDefaults = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ Mục tiêu % về 100% không?')) {
      setModalTargetList(prev => prev.map(item => ({
        ...item,
        mucTieuPercent: 100,
      })));
    }
  };

  const handleSaveTargetConfig = () => {
    const newConfig: Record<string, { targetCungKyNam: number; mucTieuPercent: number }> = {};
    modalTargetList.forEach(item => {
      const trimmed = item.storeName.trim();
      if (trimmed) {
        newConfig[trimmed] = {
          targetCungKyNam: Number(item.targetCungKyNam) || 0,
          mucTieuPercent: Number(item.mucTieuPercent) || 0,
        };
        const clean = cleanStoreNameForClusterTable(trimmed);
        if (clean && clean !== trimmed) {
          newConfig[clean] = {
            targetCungKyNam: Number(item.targetCungKyNam) || 0,
            mucTieuPercent: Number(item.mucTieuPercent) || 0,
          };
        }
      }
    });

    setTargetConfigs(newConfig);
    try {
      localStorage.setItem('crm_cluster_store_target_config', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      setIsTargetConfigModalOpen(false);
    }, 900);
  };

  const totalCungKy = useMemo(() => {
    return modalTargetList.reduce((acc, item) => acc + (Number(item.targetCungKyNam) || 0), 0);
  }, [modalTargetList]);

  const totalTargetDuKien = useMemo(() => {
    return modalTargetList.reduce((acc, item) => {
      const ck = Number(item.targetCungKyNam) || 0;
      const pct = Number(item.mucTieuPercent) || 0;
      return acc + Math.round(ck * (pct / 100));
    }, 0);
  }, [modalTargetList]);

  const avgMucTieu = totalCungKy > 0 ? Math.round((totalTargetDuKien / totalCungKy) * 1000) / 10 : 100;

  // Auto-detect daysPassed and totalDays from props, localStorage or current date
  const effectiveDaysPassed = (daysPassed && daysPassed > 0)
    ? daysPassed
    : (Number(localStorage.getItem('BI_REAL_DAYS_PASSED_V1')) || Math.max(1, new Date().getDate() - 1));

  const effectiveTotalDays = (totalDays && totalDays > 0)
    ? totalDays
    : (Number(localStorage.getItem('BI_REAL_TOTAL_DAYS_V1')) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate());

  // Priority 1: Multi-source raw string from CẬP NHẬT > LUỸ KẾ DT
  const rawInput = useMemo(() => {
    if (localRawOverride && localRawOverride.trim()) return localRawOverride.trim();
    try {
      const lsHopNhat = localStorage.getItem('rtst_doanh_thu_hop_nhat');
      if (lsHopNhat && lsHopNhat.trim()) return lsHopNhat.trim();
    } catch {}
    if (clusterSummaryInput && clusterSummaryInput.trim()) return clusterSummaryInput.trim();
    if (categoryRevenueInput && categoryRevenueInput.trim()) return categoryRevenueInput.trim();
    try {
      const ls1 = localStorage.getItem('rt_catrev');
      if (ls1 && ls1.trim()) return ls1.trim();
      const ls2 = localStorage.getItem('rtst_cluster_summary');
      if (ls2 && ls2.trim()) return ls2.trim();
      const ls3 = localStorage.getItem('rtst_catrev');
      if (ls3 && ls3.trim()) return ls3.trim();
    } catch {}
    return '';
  }, [localRawOverride, clusterSummaryInput, categoryRevenueInput]);

  // Helper to test if a row list is just dummy zero records
  const isAllZeroDummy = (rList: ClusterStoreRow[]) => {
    if (!rList || rList.length === 0) return true;
    return rList.every(r => (r.luyKe || 0) === 0 && (r.luyKeQD || 0) === 0 && (r.tarVuotTroi || 0) === 0);
  };

  const { rows, summaryRow, kpiHeader, has11Cols } = useMemo(() => {
    // 1. Extract any consolidated data from all sources (for TB 3T & Trả góp)
    const consolidatedSources = [
      localRawOverride,
      (() => { try { return localStorage.getItem('rtst_doanh_thu_hop_nhat'); } catch { return null; } })(),
      rawInput,
      clusterSummaryInput,
      categoryRevenueInput,
      (() => { try { return localStorage.getItem('rtst_cluster_summary'); } catch { return null; } })(),
      (() => { try { return localStorage.getItem('rt_catrev'); } catch { return null; } })(),
      (() => { try { return localStorage.getItem('rtst_catrev'); } catch { return null; } })(),
    ].filter(Boolean) as string[];

    let consolidatedParsed: { rows: ClusterStoreRow[]; summaryRow: ClusterStoreRow | null; kpiHeader: ClusterKpiHeader | null; has11Cols: boolean } | null = null;
    for (const src of consolidatedSources) {
      const c = parseConsolidatedFormat(src, effectiveDaysPassed, effectiveTotalDays);
      if (c && c.rows.length > 0) {
        consolidatedParsed = c;
        break;
      }
    }

    const activeConsolidatedRows = consolidatedParsed?.rows && consolidatedParsed.rows.length > 0
      ? consolidatedParsed.rows
      : DEFAULT_CONSOLIDATED_DATA;
    const activeConsolidatedSummary = consolidatedParsed?.summaryRow || DEFAULT_CONSOLIDATED_SUMMARY;

    // 2. First attempt: Parse raw text from LUỸ KẾ DT
    let parsed = rawInput ? parseClusterSummaryData(rawInput, effectiveDaysPassed, effectiveTotalDays) : { rows: [], summaryRow: null, kpiHeader: null, has11Cols: false };
    const parsedValid = parsed.rows.length > 0 && !isAllZeroDummy(parsed.rows);

    // 3. Second attempt: Build from clusterMarkets (parsed by LuykeDataContext from LUỸ KẾ DT / lk_bi_tong_quan)
    let marketResult: { rows: ClusterStoreRow[]; summaryRow: ClusterStoreRow | null; kpiHeader: ClusterKpiHeader | null; has11Cols: boolean } | null = null;
    if (clusterMarkets && clusterMarkets.length > 0) {
      const validMarkets = clusterMarkets.filter((m: any) => {
        if (!m || !m.name) return false;
        const upper = m.name.toUpperCase();
        return !upper.startsWith('TỔNG') && !m.isSummary;
      });

      const summaryMarket = clusterMarkets.find((m: any) => m && (m.isSummary || m.name?.toUpperCase().startsWith('TỔNG')));

      const mappedRows: ClusterStoreRow[] = validMarkets.map((m: any, idx: number) => {
        const cleanName = cleanStoreNameForClusterTable(m.name);
        const luyKe = m.actualReal || 0;
        const luyKeQD = m.actualVirtual || m.actualReal || 0;
        const tarVuotTroi = m.targetQD || m.targetST || 0;
        // %HT V.TRỘI tính dự kiến của cột L.KẾ QĐ: (L.KẾ QĐ / daysPassed * totalDays) / TAR V.TRỘI
        const dtDuKienQD = (effectiveDaysPassed > 0 && effectiveTotalDays > 0)
          ? (luyKeQD / effectiveDaysPassed) * effectiveTotalDays
          : luyKeQD;
        const percentHtVuotTroi = tarVuotTroi > 0
          ? (dtDuKienQD / tarVuotTroi) * 100
          : (m.percentHT || 0);
        const percentQD = m.percentQD || m.dtckThang || 0;
        const percentTC = m.installmentRate || 0;
        const tangGiamCK = m.dtckThang || 0;
        const percentDuyet = m.percentDuyet || 0;
        const tb3Thang = m.tb3Thang || 0;
        const percentTT = m.percentTT || m.dtckThang || 0;
        const dtTraGop = m.dtTraGop || 0;
        const percentTraGop = m.percentTraGop || percentTC;

        return {
          stt: idx + 1,
          rawName: m.name,
          storeName: cleanName,
          luyKe,
          luyKeQD,
          tarVuotTroi,
          percentHtVuotTroi,
          percentQD,
          percentTC,
          tangGiamCK,
          percentDuyet,
          soLuong: m.luotBillBanHang || 0,
          doanhThu: luyKe,
          doanhThuQD: luyKeQD,
          target: tarVuotTroi,
          percentHtTarget: percentHtVuotTroi,
          tb3Thang,
          percentTT,
          dtTraGop,
          percentTraGop,
          isSummary: false
        };
      });

      if (mappedRows.length > 0 && !isAllZeroDummy(mappedRows)) {
        let calculatedSummary: ClusterStoreRow;
        if (summaryMarket) {
          const sumLuyKe = summaryMarket.actualReal || mappedRows.reduce((a, b) => a + b.luyKe, 0);
          const sumLuyKeQD = summaryMarket.actualVirtual || mappedRows.reduce((a, b) => a + b.luyKeQD, 0);
          const sumTar = summaryMarket.targetQD || summaryMarket.targetST || mappedRows.reduce((a, b) => a + b.tarVuotTroi, 0);
          const sumDtDuKienQD = (effectiveDaysPassed > 0 && effectiveTotalDays > 0)
            ? (sumLuyKeQD / effectiveDaysPassed) * effectiveTotalDays
            : sumLuyKeQD;
          const sumHt = sumTar > 0 ? (sumDtDuKienQD / sumTar) * 100 : 0;
          const sumTC = summaryMarket.installmentRate || (mappedRows.length > 0 ? mappedRows.reduce((a, b) => a + b.percentTC, 0) / mappedRows.length : 0);
          const sumCK = summaryMarket.dtckThang || (mappedRows.length > 0 ? mappedRows.reduce((a, b) => a + b.tangGiamCK, 0) / mappedRows.length : 0);
          const sumTb3T = summaryMarket.tb3Thang || mappedRows.reduce((a, b) => a + (b.tb3Thang || 0), 0);
          const sumTT = summaryMarket.percentTT || (mappedRows.length > 0 ? mappedRows.reduce((a, b) => a + (b.percentTT || 0), 0) / mappedRows.length : 0);
          const sumDtTG = summaryMarket.dtTraGop || mappedRows.reduce((a, b) => a + (b.dtTraGop || 0), 0);
          const sumPctTG = summaryMarket.percentTraGop || sumTC;

          calculatedSummary = {
            rawName: 'TỔNG CỤM',
            storeName: 'TỔNG CỤM',
            luyKe: sumLuyKe,
            luyKeQD: sumLuyKeQD,
            tarVuotTroi: sumTar,
            percentHtVuotTroi: sumHt,
            percentQD: mappedRows.length > 0 ? mappedRows.reduce((a, b) => a + b.percentQD, 0) / mappedRows.length : 0,
            percentTC: sumTC,
            tangGiamCK: sumCK,
            percentDuyet: summaryMarket.percentDuyet || 0,
            doanhThu: sumLuyKe,
            doanhThuQD: sumLuyKeQD,
            target: sumTar,
            percentHtTarget: sumHt,
            tb3Thang: sumTb3T,
            percentTT: sumTT,
            dtTraGop: sumDtTG,
            percentTraGop: sumPctTG,
            isSummary: true
          };
        } else {
          const sumLuyKe = mappedRows.reduce((a, b) => a + b.luyKe, 0);
          const sumLuyKeQD = mappedRows.reduce((a, b) => a + b.luyKeQD, 0);
          const sumTar = mappedRows.reduce((a, b) => a + b.tarVuotTroi, 0);
          const sumDtDuKienQD = (effectiveDaysPassed > 0 && effectiveTotalDays > 0)
            ? (sumLuyKeQD / effectiveDaysPassed) * effectiveTotalDays
            : sumLuyKeQD;
          const sumHt = sumTar > 0 ? (sumDtDuKienQD / sumTar) * 100 : 0;
          const sumTC = mappedRows.length > 0 ? mappedRows.reduce((a, b) => a + b.percentTC, 0) / mappedRows.length : 0;
          const sumCK = mappedRows.length > 0 ? mappedRows.reduce((a, b) => a + b.tangGiamCK, 0) / mappedRows.length : 0;
          const sumTb3T = mappedRows.reduce((a, b) => a + (b.tb3Thang || 0), 0);
          const sumTT = mappedRows.length > 0 ? mappedRows.reduce((a, b) => a + (b.percentTT || 0), 0) / mappedRows.length : 0;
          const sumDtTG = mappedRows.reduce((a, b) => a + (b.dtTraGop || 0), 0);
          const sumPctTG = sumTC;

          calculatedSummary = {
            rawName: 'TỔNG CỤM',
            storeName: 'TỔNG CỤM',
            luyKe: sumLuyKe,
            luyKeQD: sumLuyKeQD,
            tarVuotTroi: sumTar,
            percentHtVuotTroi: sumHt,
            percentQD: mappedRows.length > 0 ? mappedRows.reduce((a, b) => a + b.percentQD, 0) / mappedRows.length : 0,
            percentTC: sumTC,
            tangGiamCK: sumCK,
            percentDuyet: 0,
            doanhThu: sumLuyKe,
            doanhThuQD: sumLuyKeQD,
            target: sumTar,
            percentHtTarget: sumHt,
            tb3Thang: sumTb3T,
            percentTT: sumTT,
            dtTraGop: sumDtTG,
            percentTraGop: sumPctTG,
            isSummary: true
          };
        }

        marketResult = {
          rows: mappedRows,
          summaryRow: calculatedSummary,
          kpiHeader: parsed.kpiHeader || null,
          has11Cols: false
        };
      }
    }

    // 4. Decide base result
    let finalResult: { rows: ClusterStoreRow[]; summaryRow: ClusterStoreRow | null; kpiHeader: ClusterKpiHeader | null; has11Cols: boolean };

    if (parsedValid && parsed.has11Cols) {
      finalResult = {
        rows: [...parsed.rows],
        summaryRow: parsed.summaryRow ? { ...parsed.summaryRow } : null,
        kpiHeader: parsed.kpiHeader || consolidatedParsed?.kpiHeader || null,
        has11Cols: true,
      };
    } else if (marketResult && marketResult.rows.length > 0) {
      finalResult = {
        rows: [...marketResult.rows],
        summaryRow: marketResult.summaryRow ? { ...marketResult.summaryRow } : null,
        kpiHeader: marketResult.kpiHeader || consolidatedParsed?.kpiHeader || parsed.kpiHeader || null,
        has11Cols: false,
      };
    } else if (parsedValid) {
      finalResult = {
        rows: [...parsed.rows],
        summaryRow: parsed.summaryRow ? { ...parsed.summaryRow } : null,
        kpiHeader: parsed.kpiHeader || consolidatedParsed?.kpiHeader || null,
        has11Cols: parsed.has11Cols,
      };
    } else {
      // Fallback: build default rows from activeConsolidatedRows if nothing else
      const defaultRows: ClusterStoreRow[] = DEFAULT_CONSOLIDATED_DATA.map((c, idx) => ({
        stt: idx + 1,
        rawName: c.rawName,
        storeName: cleanStoreNameForClusterTable(c.rawName),
        luyKe: c.rawName.includes('10528') ? 819 : c.rawName.includes('10496') ? 232 : 175,
        luyKeQD: c.rawName.includes('10528') ? 1251 : c.rawName.includes('10496') ? 345 : 302,
        tarVuotTroi: c.rawName.includes('10528') ? 3758 : c.rawName.includes('10496') ? 894 : 1470,
        percentHtVuotTroi: c.rawName.includes('10528') ? 33 : c.rawName.includes('10496') ? 39 : 21,
        percentQD: c.rawName.includes('10528') ? 53 : c.rawName.includes('10496') ? 49 : 73,
        percentTC: c.percentTraGop,
        tangGiamCK: c.percentTT,
        percentDuyet: 0,
        tb3Thang: c.tb3Thang,
        percentTT: c.percentTT,
        dtTraGop: c.dtTraGop,
        percentTraGop: c.percentTraGop,
      }));

      finalResult = {
        rows: defaultRows,
        summaryRow: {
          rawName: 'Tổng (3 dòng)',
          storeName: 'TỔNG CỤM',
          luyKe: 1226,
          luyKeQD: 1898,
          tarVuotTroi: 6121,
          percentHtVuotTroi: 31,
          percentQD: 55,
          percentTC: DEFAULT_CONSOLIDATED_SUMMARY.percentTraGop,
          tangGiamCK: DEFAULT_CONSOLIDATED_SUMMARY.percentTT,
          percentDuyet: 0,
          tb3Thang: DEFAULT_CONSOLIDATED_SUMMARY.tb3Thang,
          percentTT: DEFAULT_CONSOLIDATED_SUMMARY.percentTT,
          dtTraGop: DEFAULT_CONSOLIDATED_SUMMARY.dtTraGop,
          percentTraGop: DEFAULT_CONSOLIDATED_SUMMARY.percentTraGop,
          isSummary: true,
        },
        kpiHeader: consolidatedParsed?.kpiHeader || null,
        has11Cols: false,
      };
    }

    // 5. SMART ENRICH: Merge TB 3 THÁNG, % TT, DT TRẢ GÓP, % TRẢ GÓP & CẤU HÌNH TARGET into each row
    if (finalResult.rows.length > 0) {
      finalResult.rows = finalResult.rows.map(row => {
        const matched = activeConsolidatedRows.find(c => matchStoreNames(row.rawName || row.storeName, c.rawName || (c as any).storeName));
        
        // Find matching target config by store name or code
        const cfgEntry = Object.entries(targetConfigs).find(([storeKey]) => 
          matchStoreNames(storeKey, row.storeName) || (row.rawName && matchStoreNames(storeKey, row.rawName))
        );
        const cfg = cfgEntry ? cfgEntry[1] : (targetConfigs[row.storeName] || targetConfigs[cleanStoreNameForClusterTable(row.storeName)] || (row.rawName ? targetConfigs[row.rawName] : undefined));

        let currentTarVuotTroi = row.tarVuotTroi;
        let currentPercentHt = row.percentHtVuotTroi;
        const targetCungKy = cfg && cfg.targetCungKyNam > 0 ? cfg.targetCungKyNam : (row.targetCungKyNam || row.tarVuotTroi || 0);
        const mucTieu = cfg && cfg.mucTieuPercent !== undefined ? cfg.mucTieuPercent : 100;

        // Nếu đã có cấu hình target cùng kỳ > 0 thì đồng bộ CỘT TAR V.TRỘI = Target Cùng Kỳ × (Mục Tiêu % / 100)
        if (cfg && cfg.targetCungKyNam > 0) {
          currentTarVuotTroi = Math.round(cfg.targetCungKyNam * (mucTieu / 100));

          const dtDuKienQD = (effectiveDaysPassed > 0 && effectiveTotalDays > 0)
            ? (row.luyKeQD / effectiveDaysPassed) * effectiveTotalDays
            : row.luyKeQD;
          currentPercentHt = currentTarVuotTroi > 0 ? (dtDuKienQD / currentTarVuotTroi) * 100 : row.percentHtVuotTroi;
        }

        return {
          ...row,
          ...(matched ? {
            tb3Thang: (matched.tb3Thang !== undefined && matched.tb3Thang !== 0) ? matched.tb3Thang : (row.tb3Thang || 0),
            percentTT: (matched.percentTT !== undefined && !isNaN(matched.percentTT)) ? matched.percentTT : (row.percentTT || 0),
            dtTraGop: (matched.dtTraGop !== undefined && matched.dtTraGop !== 0) ? matched.dtTraGop : (row.dtTraGop || 0),
            percentTraGop: (matched.percentTraGop !== undefined && !isNaN(matched.percentTraGop)) ? matched.percentTraGop : (row.percentTraGop ?? row.percentTC ?? 0),
          } : {}),
          tarVuotTroi: currentTarVuotTroi,
          target: currentTarVuotTroi,
          percentHtVuotTroi: currentPercentHt,
          percentHtTarget: currentPercentHt,
          targetCungKyNam: targetCungKy,
          mucTieuPercent: mucTieu,
        };
      });

      // Enrich summaryRow
      if (finalResult.summaryRow) {
        const hasConfiguredTarget = finalResult.rows.some(r => (r.targetCungKyNam || 0) > 0);
        const sumTar = hasConfiguredTarget
          ? finalResult.rows.reduce((a, b) => a + (b.tarVuotTroi || 0), 0)
          : finalResult.summaryRow.tarVuotTroi;

        const sumLuyKeQD = finalResult.summaryRow.luyKeQD;
        const sumDtDuKienQD = (effectiveDaysPassed > 0 && effectiveTotalDays > 0)
          ? (sumLuyKeQD / effectiveDaysPassed) * effectiveTotalDays
          : sumLuyKeQD;
        const sumHt = sumTar > 0 ? (sumDtDuKienQD / sumTar) * 100 : finalResult.summaryRow.percentHtVuotTroi;

        const sumTb3T = (activeConsolidatedSummary?.tb3Thang !== undefined && activeConsolidatedSummary.tb3Thang !== 0)
          ? activeConsolidatedSummary.tb3Thang
          : (finalResult.summaryRow.tb3Thang || finalResult.rows.reduce((a, b) => a + (b.tb3Thang || 0), 0));

        const sumPctTT = (activeConsolidatedSummary?.percentTT !== undefined && !isNaN(activeConsolidatedSummary.percentTT))
          ? activeConsolidatedSummary.percentTT
          : (finalResult.summaryRow.percentTT !== undefined && !isNaN(finalResult.summaryRow.percentTT)
              ? finalResult.summaryRow.percentTT
              : (finalResult.rows.length > 0 ? finalResult.rows.reduce((a, b) => a + (b.percentTT || 0), 0) / finalResult.rows.length : 0));

        const sumDtTG = (activeConsolidatedSummary?.dtTraGop !== undefined && activeConsolidatedSummary.dtTraGop !== 0)
          ? activeConsolidatedSummary.dtTraGop
          : (finalResult.summaryRow.dtTraGop || finalResult.rows.reduce((a, b) => a + (b.dtTraGop || 0), 0));

        const sumPctTG = (activeConsolidatedSummary?.percentTraGop !== undefined && !isNaN(activeConsolidatedSummary.percentTraGop))
          ? activeConsolidatedSummary.percentTraGop
          : ((activeConsolidatedSummary as any)?.percentTC !== undefined && !isNaN((activeConsolidatedSummary as any)?.percentTC)
              ? (activeConsolidatedSummary as any).percentTC
              : (finalResult.summaryRow.percentTraGop ?? finalResult.summaryRow.percentTC ?? 0));

        finalResult.summaryRow = {
          ...finalResult.summaryRow,
          tarVuotTroi: sumTar,
          target: sumTar,
          percentHtVuotTroi: sumHt,
          percentHtTarget: sumHt,
          tb3Thang: sumTb3T,
          percentTT: sumPctTT,
          dtTraGop: sumDtTG,
          percentTraGop: sumPctTG,
        };
      }
    }

    return finalResult;
  }, [rawInput, clusterMarkets, effectiveDaysPassed, effectiveTotalDays, targetConfigs]);

  // Generate smart comments
  const commentTemplates = useMemo(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
    const dateStr = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();
    const nowHeader = timeStr + ' NGÀY ' + dateStr;

    if (rows.length === 0 && !summaryRow) {
      return [
        {
          id: 1,
          title: 'MẪU 1: TOP/BOT ST',
          icon: '🏆',
          text: '📊 TỔNG HỢP THI ĐUA CỤM SIÊU THỊ - ' + nowHeader + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nChưa có dữ liệu báo cáo cụm để nhận xét.',
        },
        {
          id: 2,
          title: 'MẪU 2: DS CẦN TĂNG TỐC',
          icon: '⚠️',
          text: '⚠️ DANH SÁCH CẦN TĂNG TỐC - ' + nowHeader + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nChưa có dữ liệu báo cáo cụm để nhận xét.',
        },
        {
          id: 3,
          title: 'MẪU 3: TÓM TẮT',
          icon: '⚡',
          text: '⚡ TÓM TẮT BÁO CÁO CỤM - ' + nowHeader + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nChưa có dữ liệu báo cáo cụm để nhận xét.',
        },
      ];
    }

    const sortedStores = [...rows].sort((a, b) => b.percentHtVuotTroi - a.percentHtVuotTroi);
    const topStores = sortedStores.slice(0, 5);
    const lowStores = sortedStores.filter(r => r.percentHtVuotTroi < 100);
    const totalLuyKeQD = summaryRow?.luyKeQD || 0;
    const totalTar = summaryRow?.tarVuotTroi || 0;
    const totalHt = summaryRow?.percentHtVuotTroi || 0;
    const totalTC = summaryRow?.percentTraGop ?? summaryRow?.percentTC ?? 0;
    const totalDtTG = summaryRow?.dtTraGop || 0;
    const totalTb3T = summaryRow?.tb3Thang || 0;
    const totalTT = summaryRow?.percentTT || 0;
    const totalCK = summaryRow?.tangGiamCK || 0;
    const totalDuyet = summaryRow?.percentDuyet || 0;

    return [
      {
        id: 1,
        title: 'MẪU 1: TOP/BOT ST',
        icon: '🏆',
        text: '📊 TỔNG HỢP THI ĐUA CỤM SIÊU THỊ - ' + nowHeader + '\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📈 KẾT QUẢ TỔNG QUAN:\n' +
          '🎯 Toàn cụm: ' + formatVnNum(totalLuyKeQD) + ' tỷ QĐ / Target ' + formatVnNum(totalTar) + ' tỷ (Đạt: ' + formatPct(totalHt) + ')\n' +
          '💳 Trả góp: ' + (totalDtTG > 0 ? (formatVnNum(totalDtTG) + ' tỷ - ') : '') + formatPct(totalTC) + ' | TB 3T: ' + formatVnNum(totalTb3T) + ' (%TT: ' + ((totalTT > 0 ? '+' : '') + formatPct(totalTT)) + ')\n\n' +
          '🏆 TOP DẪN ĐẦU:\n' +
          topStores.map((s, idx) => '▲ #' + (idx + 1) + '. ' + s.storeName + ' (' + formatPct(s.percentHtVuotTroi) + ')').join('\n') +
          (lowStores.length > 0 ? '\n\n⚠️ CẦN TĂNG TỐC:\n' + lowStores.map((s, idx) => '🔻 #' + (idx + 1) + '. ' + s.storeName + ' (' + formatPct(s.percentHtVuotTroi) + ')').join('\n') : '') +
          '\n\n👏 Chúc mừng các siêu thị xuất sắc đã bứt phá! Các siêu thị tiếp tục phát huy và tăng tốc về đích nhé! 🚀🚀🚀',
      },
      {
        id: 2,
        title: 'MẪU 2: DS CẦN TĂNG TỐC',
        icon: '⚠️',
        text: '⚠️ DANH SÁCH SIÊU THỊ CẦN TĂNG TỐC VỀ ĐÍCH - ' + nowHeader + '\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '🎯 Tiến độ toàn cụm: ' + formatPct(totalHt) + ' so với kế hoạch vượt trội.\n\n' +
          '⚠️ CÁC SIÊU THỊ TIẾN ĐỘ CHƯA ĐẠT KẾ HOẠCH:\n' +
          (lowStores.length > 0
            ? lowStores.map((s, idx) => '🔻 #' + (idx + 1) + '. ' + s.storeName + ': ' + formatVnNum(s.luyKeQD) + ' tỷ QĐ (' + formatPct(s.percentHtVuotTroi) + ' target | %TG: ' + formatPct(s.percentTraGop ?? s.percentTC) + ')').join('\n')
            : '✅ Toàn bộ các siêu thị trong cụm đều đạt trên 100% target! 🎉') +
          '\n\n💡 HÀNH ĐỘNG TRỌNG TÂM HÔM NAY:\n' +
          '1. Tiếp cận 100% khách hàng bước vào siêu thị\n' +
          '2. Đẩy mạnh tư vấn Trả góp / Trả chậm để nâng cao tỷ lệ chốt đơn\n' +
          '3. Giới thiệu combo phụ kiện, gia dụng bán kèm\n' +
          '🔥 Toàn thể cụm cùng nỗ lực 200% để hoàn thành xuất sắc mục tiêu! 🔥',
      },
      {
        id: 3,
        title: 'MẪU 3: TÓM TẮT',
        icon: '⚡',
        text: '⚡ BÁO CÁO NHANH TIẾN ĐỘ CỤM SIÊU THỊ - ' + nowHeader + '\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          rows
            .map(
              (r, idx) =>
                (idx + 1) + '. ' + r.storeName + ':\n' +
                '   - L.Kế: ' + formatVnNum(r.luyKe) + ' | L.Kế QĐ: ' + formatVnNum(r.luyKeQD) + '\n' +
                '   - %HT Vượt trội: ' + formatPct(r.percentHtVuotTroi) + ' | TB 3T: ' + formatVnNum(r.tb3Thang) + ' (%TT: ' + ((r.percentTT ?? 0) > 0 ? '+' : '') + formatPct(r.percentTT) + ') | DT Trả góp: ' + formatVnNum(r.dtTraGop) + ' (' + formatPct(r.percentTraGop ?? r.percentTC) + ')'
            )
            .join('\n\n') +
          '\n\n➡️ TỔNG CỤM: ' + formatVnNum(totalLuyKeQD) + ' tỷ QĐ (' + formatPct(totalHt) + ' target vượt trội | %TG: ' + formatPct(totalTC) + ').',
      },
    ];
  }, [rows, summaryRow]);

  React.useEffect(() => {
    if (commentTemplates[selectedTemplate]) {
      setCommentText(commentTemplates[selectedTemplate].text);
    }
  }, [selectedTemplate, commentTemplates]);

  const handleCopyComment = async () => {
    try {
      await navigator.clipboard.writeText(commentText);
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 2000);
    } catch {
      // fallback
    }
  };

  /**
   * Zero-shadow screenshot capture matching the image 100%
   */
  const handleCapture = async () => {
    if (!tableRef.current) return;
    setIsCapturing(true);

    try {
      await ensureFontsReady();

      const original = tableRef.current;
      const clone = original.cloneNode(true) as HTMLElement;

      clone.querySelectorAll('.no-capture').forEach(el => el.remove());

      clone.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.filter = 'none';
        htmlEl.classList.remove('shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'drop-shadow-sm', 'drop-shadow-md');
      });

      const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto');
      scrollContainers.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.width = '100%';
        htmlEl.style.minWidth = '0';
        htmlEl.style.maxWidth = 'none';
      });

      const tableEl = clone.querySelector('table');
      if (tableEl) {
        tableEl.style.width = '100%';
        tableEl.style.minWidth = '100%';
        tableEl.style.maxWidth = '100%';
        tableEl.style.tableLayout = 'fixed';
      }

      // Đảm bảo tuyệt đối không che khuất hay cắt ngắn tên siêu thị trong ảnh xuất ra
      const storeNameSpans = clone.querySelectorAll('td span');
      storeNameSpans.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.classList.contains('truncate')) {
          htmlEl.classList.remove('truncate');
        }
        htmlEl.style.whiteSpace = 'normal';
        htmlEl.style.overflow = 'visible';
        htmlEl.style.textOverflow = 'clip';
        htmlEl.style.wordBreak = 'break-word';
      });

      const tableCells = clone.querySelectorAll('td, th');
      tableCells.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        if (htmlEl.style.maxWidth === '0px' || htmlEl.style.maxWidth === '0') {
          htmlEl.style.maxWidth = 'none';
        }
      });

      const targetWidthPx = 1200;
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = targetWidthPx + 'px';
      tempContainer.style.zIndex = '-9999';

      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = '20px';
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.width = targetWidthPx + 'px';
      frameWrapper.style.minWidth = targetWidthPx + 'px';
      frameWrapper.style.maxWidth = targetWidthPx + 'px';
      frameWrapper.style.boxSizing = 'border-box';
      frameWrapper.style.boxShadow = 'none';
      frameWrapper.style.overflow = 'visible';
      frameWrapper.appendChild(clone);

      tempContainer.appendChild(frameWrapper);
      document.body.appendChild(tempContainer);

      await new Promise(r => setTimeout(r, 300));

      const exactHeight = Math.max(frameWrapper.scrollHeight, frameWrapper.offsetHeight, clone.scrollHeight, 100);

      const dataUrl = await domToPng(frameWrapper, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        width: targetWidthPx,
        height: exactHeight,
        features: { removeControlCharacter: true },
      });

      document.body.removeChild(tempContainer);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('[ClusterReportTab] Error capturing image:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
            <Store size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">
                Báo cáo Cụm Siêu Thị
              </h2>
              {has11Cols && (
                <button
                  onClick={() => setShowFull11Cols(!showFull11Cols)}
                  className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition-colors"
                  title="Chuyển đổi giao diện bảng"
                >
                  {showFull11Cols ? 'Xem Bảng Chuẩn 9 Cột' : 'Xem Bảng 11 Cột'}
                </button>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Dữ liệu đồng bộ từ <strong className="text-slate-600">Cập nhật &gt; Báo cáo Tổng hợp &gt; Luỹ kế DT</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút CẤU HÌNH TARGET */}
          <button
            onClick={handleOpenTargetConfig}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-amber-200/80 shadow-xs"
            title="Cấu hình Target cùng kỳ năm & mục tiêu % từng siêu thị"
          >
            <Target size={16} className="text-amber-600" />
            <span>CẤU HÌNH TARGET</span>
          </button>

          <button
            onClick={() => {
              if (commentTemplates[selectedTemplate]) {
                setCommentText(commentTemplates[selectedTemplate].text);
              }
              setIsCommentModalOpen(true);
            }}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200/60"
            title="Mở form nhận xét kết quả thi đua cụm"
          >
            <MessageSquare size={16} className="text-indigo-600" />
            <span>NHẬN XÉT</span>
          </button>

          <button
            onClick={handleCapture}
            disabled={rows.length === 0 || isCapturing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Chụp ảnh xuất báo cáo Cụm sắc nét"
          >
            {isCapturing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang tạo ảnh...</span>
              </>
            ) : (
              <>
                <Camera size={16} />
                <span>Chụp ảnh báo cáo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      {rows.length === 0 && !summaryRow ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet size={32} />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
            Chưa có dữ liệu Báo cáo Cụm
          </h3>
          <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
            Vui lòng vào mục <strong className="text-indigo-600">Cập nhật &gt; BÁO CÁO TỔNG HỢP</strong> và dán dữ liệu vào ô <strong className="text-slate-800">LUỸ KẾ DT</strong> để hệ thống tự động tổng hợp bảng Cụm Siêu Thị.
          </p>
          {onNavigateToKhaiBao && (
            <div className="flex justify-center pt-2">
              <button
                onClick={onNavigateToKhaiBao}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
              >
                <span>Đi đến trang Cập nhật &gt; Luỹ kế DT</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* TABLE CONTAINER */
        <div className="bg-white rounded-3xl p-3 sm:p-6 border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          <div ref={tableRef} className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/90 shadow-sm">
            {/* TIÊU ĐỀ LỚN: PASTEL SOFT UI / PASTEL TINTED PILLS - NỀN PASTEL VÀNG ĐẬM HƠN, CHỮ MÀU ĐẬM CÙNG TÔNG */}
            <div className="w-full mb-3.5 sm:mb-4">
              <div
                className="w-full py-3.5 sm:py-4 px-4 text-center rounded-2xl flex items-center justify-center relative shadow-xs"
                style={{
                  background: 'linear-gradient(135deg, #fef08a 0%, #fde68a 50%, #fde047 100%)',
                  border: '1.5px solid #facc15',
                }}
              >
                <h2
                  style={{
                    fontFamily: "'UTM Avo', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    color: '#78350f',
                  }}
                  className="text-[20px] sm:text-[24px] md:text-[28px] font-black uppercase tracking-wider drop-shadow-xs leading-tight text-center"
                >
                  SỨC KHOẺ CỤM
                </h2>
              </div>
            </div>

            {/* KHOẢNG TRẮNG CÁCH TIÊU ĐỀ CỘT & CONTAINER CHO BẢNG */}
            <div className="overflow-x-auto w-full rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              {!showFull11Cols ? (
                /* 9-COLUMN TABLE: 100% IDENTICAL TO USER IMAGE (TONE MÀU HÌNH 2) */
                <table
                  className="w-full border-collapse font-sans"
                  style={{
                    tableLayout: 'fixed',
                    minWidth: '880px',
                    fontFamily: "'UTM Avo', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  }}
                >
                  <colgroup>
                    {/* SIÊU THỊ: 33% */}
                    <col style={{ width: '33%' }} />
                    {/* L. KẾ: 7% */}
                    <col style={{ width: '7%' }} />
                    {/* L. KẾ QĐ: 7% */}
                    <col style={{ width: '7%' }} />
                    {/* TAR V.TRỘI: 7.5% */}
                    <col style={{ width: '7.5%' }} />
                    {/* %HT V.TRỘI: 7.5% */}
                    <col style={{ width: '7.5%' }} />
                    {/* %QĐ: 7% */}
                    <col style={{ width: '7%' }} />
                    {/* TB 3 THÁNG: 8% */}
                    <col style={{ width: '8%' }} />
                    {/* % TT: 7.5% */}
                    <col style={{ width: '7.5%' }} />
                    {/* DT TRẢ GÓP: 7.5% */}
                    <col style={{ width: '7.5%' }} />
                    {/* % TRẢ GÓP: 8% */}
                    <col style={{ width: '8%' }} />
                  </colgroup>

                  <thead>
                    {/* Header Row 1 */}
                    <tr>
                      {/* SIÊU THỊ: XANH PASTEL ĐẬM HƠN */}
                      <th
                        rowSpan={2}
                        className="px-3.5 py-3.5 text-center align-middle font-black uppercase tracking-wider text-[13px] sm:text-[14px]"
                        style={{
                          backgroundColor: '#bbf7d0',
                          color: '#065f46',
                          borderBottom: '2.5px solid #86efac',
                          borderRight: '1px solid #cbd5e1',
                        }}
                      >
                        SIÊU THỊ
                      </th>

                      {/* L. KẾ: XANH DƯƠNG PASTEL */}
                      <th
                        rowSpan={2}
                        className="px-2 py-3.5 text-center align-middle font-black uppercase tracking-wider text-[13px] sm:text-[14px]"
                        style={{
                          backgroundColor: '#bfdbfe',
                          color: '#1e40af',
                          borderBottom: '2.5px solid #93c5fd',
                          borderRight: '1px solid #cbd5e1',
                        }}
                      >
                        L. KẾ
                      </th>

                      {/* L. KẾ QĐ: XANH DƯƠNG PASTEL */}
                      <th
                        rowSpan={2}
                        className="px-2 py-3.5 text-center align-middle font-black uppercase tracking-wider text-[13px] sm:text-[14px] leading-tight"
                        style={{
                          backgroundColor: '#bfdbfe',
                          color: '#1e40af',
                          borderBottom: '2.5px solid #93c5fd',
                          borderRight: '1px solid #cbd5e1',
                        }}
                      >
                        L. KẾ<br />QĐ
                      </th>

                      {/* HIỆU QUẢ: CAM PASTEL ĐẬM HƠN */}
                      <th
                        colSpan={3}
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider text-[13px] sm:text-[14px]"
                        style={{
                          backgroundColor: '#fed7aa',
                          color: '#9a3412',
                          borderBottom: '1px solid #fdba74',
                          borderRight: '1px solid #cbd5e1',
                        }}
                      >
                        HIỆU QUẢ
                      </th>

                      {/* TB 3 THÁNG: VÀNG PASTEL ĐẬM HƠN */}
                      <th
                        colSpan={2}
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider text-[13px] sm:text-[14px]"
                        style={{
                          backgroundColor: '#fef08a',
                          color: '#854d0e',
                          borderBottom: '1px solid #fde047',
                          borderRight: '1px solid #cbd5e1',
                        }}
                      >
                        TB 3 THÁNG
                      </th>

                      {/* TRẢ CHẬM: TÍM PASTEL ĐẬM HƠN */}
                      <th
                        colSpan={2}
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider text-[13px] sm:text-[14px]"
                        style={{
                          backgroundColor: '#ddd6fe',
                          color: '#6b21a8',
                          borderBottom: '1px solid #c084fc',
                        }}
                      >
                        TRẢ CHẬM
                      </th>
                    </tr>

                    {/* Header Row 2 */}
                    <tr>
                      {/* Under HIỆU QUẢ: CAM PASTEL ĐẬM HƠN */}
                      <th
                        className="px-1.5 py-2 text-center align-middle font-black uppercase tracking-wider text-[11px] sm:text-[12px] leading-tight"
                        style={{
                          backgroundColor: '#fed7aa',
                          color: '#9a3412',
                          borderRight: '1px solid #cbd5e1',
                          borderBottom: '2.5px solid #fdba74',
                        }}
                      >
                        TAR<br />V.TRỘI
                      </th>
                      <th
                        className="px-1.5 py-2 text-center align-middle font-black uppercase tracking-wider text-[11px] sm:text-[12px] leading-tight"
                        style={{
                          backgroundColor: '#fed7aa',
                          color: '#9a3412',
                          borderRight: '1px solid #cbd5e1',
                          borderBottom: '2.5px solid #fdba74',
                        }}
                      >
                        %HT<br />V.TRỘI
                      </th>
                      <th
                        className="px-1.5 py-2 text-center align-middle font-black uppercase tracking-wider text-[11px] sm:text-[12px]"
                        style={{
                          backgroundColor: '#fed7aa',
                          color: '#9a3412',
                          borderRight: '1px solid #cbd5e1',
                          borderBottom: '2.5px solid #fdba74',
                        }}
                      >
                        %QĐ
                      </th>

                      {/* Under TB 3 THÁNG: VÀNG PASTEL ĐẬM HƠN */}
                      <th
                        className="px-1.5 py-2 text-center align-middle font-black uppercase tracking-wider text-[11px] sm:text-[12px] leading-tight"
                        style={{
                          backgroundColor: '#fef08a',
                          color: '#854d0e',
                          borderRight: '1px solid #cbd5e1',
                          borderBottom: '2.5px solid #fde047',
                        }}
                      >
                        TB 3 THÁNG
                      </th>
                      <th
                        className="px-1.5 py-2 text-center align-middle font-black uppercase tracking-wider text-[11px] sm:text-[12px]"
                        style={{
                          backgroundColor: '#fef08a',
                          color: '#854d0e',
                          borderRight: '1px solid #cbd5e1',
                          borderBottom: '2.5px solid #fde047',
                        }}
                      >
                        % TT
                      </th>

                      {/* Under TRẢ CHẬM: TÍM PASTEL ĐẬM HƠN */}
                      <th
                        className="px-1.5 py-2 text-center align-middle font-black uppercase tracking-wider text-[11px] sm:text-[12px] leading-tight"
                        style={{
                          backgroundColor: '#ddd6fe',
                          color: '#6b21a8',
                          borderRight: '1px solid #cbd5e1',
                          borderBottom: '2.5px solid #c084fc',
                        }}
                      >
                        DT TRẢ GÓP
                      </th>
                      <th
                        className="px-1.5 py-2 text-center align-middle font-black uppercase tracking-wider text-[11px] sm:text-[12px]"
                        style={{
                          backgroundColor: '#ddd6fe',
                          color: '#6b21a8',
                          borderBottom: '2.5px solid #c084fc',
                        }}
                      >
                        % TRẢ GÓP
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row, idx) => {
                      const isHtGood = row.percentHtVuotTroi >= 100;
                      // %QĐ = (L.KẾ QĐ - L.KẾ) / L.KẾ * 100
                      const calculatedPercentQD = row.luyKe !== 0 ? ((row.luyKeQD - row.luyKe) / row.luyKe) * 100 : 0;
                      const isQdGood = calculatedPercentQD > 0;

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/60 transition-colors bg-white"
                        >
                          {/* SIÊU THỊ: Left-aligned, Bold Uppercase with rank badge - Hiển thị đầy đủ không bị che khuất */}
                          <td
                            title={row.storeName}
                            className="px-3 py-2.5 text-left font-black text-slate-900 border-r border-slate-200 text-[11px] sm:text-[12.5px] uppercase tracking-wide"
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 min-w-[20px] rounded text-[11px] font-black shrink-0 shadow-xs"
                                style={{
                                  backgroundColor: idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fed7aa' : '#f1f5f9',
                                  color: '#000000',
                                }}
                              >
                                {idx + 1}
                              </span>
                              <span className="min-w-0 flex-1 block whitespace-normal break-words leading-snug" title={row.storeName}>
                                {row.storeName}
                              </span>
                            </div>
                          </td>

                          {/* L. KẾ: Center-aligned, bold dark slate */}
                          <td className="px-2 py-3 text-center font-black text-slate-900 border-r border-slate-200 text-[12px] sm:text-[13px]">
                            {formatVnNum(row.luyKe)}
                          </td>

                          {/* L. KẾ QĐ: Center-aligned, Bold Ocean Blue */}
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-200 text-[12px] sm:text-[13px]"
                            style={{ color: '#0284c7' }}
                          >
                            {formatVnNum(row.luyKeQD)}
                          </td>

                          {/* TAR V.TRỘI: Center-aligned, bold dark slate */}
                          <td className="px-2 py-3 text-center font-black text-slate-900 border-r border-slate-200 text-[12px] sm:text-[13px]">
                            {formatVnNum(row.tarVuotTroi)}
                          </td>

                          {/* %HT V.TRỘI: Bold Green if >= 100%, Bold Red if < 100% */}
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-200 text-[12px] sm:text-[13px]"
                            style={{ color: isHtGood ? '#16a34a' : '#dc2626' }}
                          >
                            {formatPct(row.percentHtVuotTroi)}
                          </td>

                          {/* %QĐ = (L.KẾ QĐ - L.KẾ) / L.KẾ */}
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-200 text-[12px] sm:text-[13px]"
                            style={{ color: isQdGood ? '#16a34a' : '#dc2626' }}
                          >
                            {formatPct(calculatedPercentQD)}
                          </td>

                          {/* TB 3 THÁNG: Center-aligned, bold dark slate */}
                          <td className="px-2 py-3 text-center font-black text-slate-900 border-r border-slate-200 text-[12px] sm:text-[13px]">
                            {formatVnNum(row.tb3Thang)}
                          </td>

                          {/* % TT: Bold Green if >= 0%, Bold Red if < 0% */}
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-200 text-[12px] sm:text-[13px]"
                            style={{ color: (row.percentTT ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}
                          >
                            {((row.percentTT ?? 0) > 0 ? '+' : '') + formatPct(row.percentTT)}
                          </td>

                          {/* DT TRẢ GÓP: Center-aligned, bold dark slate */}
                          <td className="px-2 py-3 text-center font-black text-slate-900 border-r border-slate-200 text-[12px] sm:text-[13px]">
                            {formatVnNum(row.dtTraGop)}
                          </td>

                          {/* % TRẢ GÓP: Center-aligned, Bold dark slate */}
                          <td
                            className="px-2 py-3 text-center font-black text-[12px] sm:text-[13px]"
                            style={{ color: (row.percentTraGop ?? row.percentTC ?? 0) < 50 ? '#dc2626' : '#0f172a' }}
                          >
                            {formatPct(row.percentTraGop ?? row.percentTC)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* SUMMARY ROW: TỔNG CỤM - PASTEL SOFT UI TONE CÙNG CỘT (ĐẬM HƠN XÍU) */}
                    {summaryRow && (() => {
                      const summaryTb3Thang = (summaryRow.tb3Thang && summaryRow.tb3Thang > 0)
                        ? summaryRow.tb3Thang
                        : rows.reduce((a, b) => a + (b.tb3Thang || 0), 0);

                      const summaryPercentTT = summaryRow.percentTT !== undefined && !isNaN(summaryRow.percentTT)
                        ? summaryRow.percentTT
                        : (summaryTb3Thang > 0 ? ((summaryRow.luyKe - summaryTb3Thang) / summaryTb3Thang) * 100 : 0);

                      const summaryDtTraGop = (summaryRow.dtTraGop && summaryRow.dtTraGop > 0)
                        ? summaryRow.dtTraGop
                        : rows.reduce((a, b) => a + (b.dtTraGop || 0), 0);

                      const summaryPercentTraGop = (summaryRow.percentTraGop !== undefined && !isNaN(summaryRow.percentTraGop) && summaryRow.percentTraGop > 0)
                        ? summaryRow.percentTraGop
                        : (summaryRow.percentTC || (summaryRow.luyKe > 0 ? (summaryDtTraGop / summaryRow.luyKe) * 100 : 0));

                      return (
                        <tr
                          style={{
                            borderTop: '2px solid #cbd5e1',
                          }}
                        >
                          {/* TỔNG CỤM: XANH PASTEL */}
                          <td
                            className="px-4 py-3.5 text-center font-black uppercase tracking-wider text-[13px] sm:text-[14px]"
                            style={{
                              backgroundColor: '#bbf7d0',
                              color: '#065f46',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {summaryRow.storeName}
                          </td>

                          {/* L. KẾ: XANH DƯƠNG PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#bfdbfe',
                              color: '#1e40af',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {formatVnNum(summaryRow.luyKe)}
                          </td>

                          {/* L. KẾ QĐ: XANH DƯƠNG PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#bfdbfe',
                              color: '#1e40af',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {formatVnNum(summaryRow.luyKeQD)}
                          </td>

                          {/* TAR V.TRỘI: CAM PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#fed7aa',
                              color: '#9a3412',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {formatVnNum(summaryRow.tarVuotTroi)}
                          </td>

                          {/* %HT V.TRỘI: CAM PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#fed7aa',
                              color: '#9a3412',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {formatPct(summaryRow.percentHtVuotTroi)}
                          </td>

                          {/* %QĐ: CAM PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#fed7aa',
                              color: '#9a3412',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {formatPct(summaryRow.luyKe !== 0 ? ((summaryRow.luyKeQD - summaryRow.luyKe) / summaryRow.luyKe) * 100 : 0)}
                          </td>

                          {/* TB 3 THÁNG: VÀNG PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#fef08a',
                              color: '#854d0e',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {formatVnNum(summaryTb3Thang)}
                          </td>

                          {/* % TT: VÀNG PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#fef08a',
                              color: '#854d0e',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {((summaryPercentTT ?? 0) > 0 ? '+' : '') + formatPct(summaryPercentTT)}
                          </td>

                          {/* DT TRẢ GÓP: TÍM PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#ddd6fe',
                              color: '#6b21a8',
                              borderRight: '1px solid #cbd5e1',
                            }}
                          >
                            {formatVnNum(summaryDtTraGop)}
                          </td>

                          {/* % TRẢ GÓP: TÍM PASTEL */}
                          <td
                            className="px-2 py-3.5 text-center font-black text-[12px] sm:text-[13.5px]"
                            style={{
                              backgroundColor: '#ddd6fe',
                              color: '#6b21a8',
                            }}
                          >
                            {formatPct(summaryPercentTraGop)}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              ) : (
                /* OPTIONAL 11-COLUMN VIEW FOR DOANH THU HỢP NHẤT */
                <table
                  className="w-full border-collapse text-[11px] sm:text-[12px] md:text-[13px] font-sans"
                  style={{
                    tableLayout: 'fixed',
                    minWidth: '960px',
                  }}
                >
                  <colgroup>
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8.5%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '7.5%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                  </colgroup>

                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th
                        className="px-3 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{ backgroundColor: '#bbf7d0', color: '#065f46', borderBottom: '2.5px solid #86efac' }}
                      >
                        SIÊU THỊ
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#fed7aa', color: '#9a3412', borderBottom: '2.5px solid #fdba74' }}>
                        SỐ LƯỢNG
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#bfdbfe', color: '#1e40af', borderBottom: '2.5px solid #93c5fd' }}>
                        DOANH THU
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#fed7aa', color: '#9a3412', borderBottom: '2.5px solid #fdba74' }}>
                        % TỈ TRỌNG
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#bfdbfe', color: '#1e40af', borderBottom: '2.5px solid #93c5fd' }}>
                        DOANH THU<br />QĐ
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#fed7aa', color: '#9a3412', borderBottom: '2.5px solid #fdba74' }}>
                        TARGET
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#fed7aa', color: '#9a3412', borderBottom: '2.5px solid #fdba74' }}>
                        % HT TARGET
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#fef08a', color: '#854d0e', borderBottom: '2.5px solid #fde047' }}>
                        TB 3 THÁNG
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#fef08a', color: '#854d0e', borderBottom: '2.5px solid #fde047' }}>
                        % TT
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200" style={{ backgroundColor: '#ddd6fe', color: '#6b21a8', borderBottom: '2.5px solid #c084fc' }}>
                        DT TRẢ GÓP
                      </th>
                      <th className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider" style={{ backgroundColor: '#ddd6fe', color: '#6b21a8', borderBottom: '2.5px solid #c084fc' }}>
                        % TRẢ GÓP
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                        <td 
                          title={row.storeName}
                          className="px-3 py-2.5 text-left font-black text-slate-900 border-r border-slate-100 uppercase tracking-wide text-[11px] sm:text-[12.5px]"
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 min-w-[20px] rounded text-[11px] font-black shrink-0 shadow-xs"
                              style={{
                                backgroundColor: idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fed7aa' : '#f1f5f9',
                                color: '#000000',
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span className="min-w-0 flex-1 block whitespace-normal break-words leading-tight" title={row.storeName}>{row.storeName}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">{formatVnNum(row.soLuong)}</td>
                        <td className="px-2 py-3 text-center font-black text-slate-800 border-r border-slate-100">{formatVnNum(row.doanhThu ?? row.luyKe)}</td>
                        <td className="px-2 py-3 text-center font-bold text-slate-600 border-r border-slate-100">{formatPct(row.tiTrong)}</td>
                        <td className="px-2 py-3 text-center font-black border-r border-slate-100" style={{ color: '#0284c7' }}>{formatVnNum(row.doanhThuQD ?? row.luyKeQD)}</td>
                        <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">{formatVnNum(row.target ?? row.tarVuotTroi)}</td>
                        <td className="px-2 py-3 text-center font-black border-r border-slate-100" style={{ color: (row.percentHtTarget ?? row.percentHtVuotTroi) >= 100 ? '#16a34a' : '#dc2626' }}>{formatPct(row.percentHtTarget ?? row.percentHtVuotTroi)}</td>
                        <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">{formatVnNum(row.tb3Thang)}</td>
                        <td className="px-2 py-3 text-center font-black border-r border-slate-100" style={{ color: (row.percentTT ?? row.percentQD) > 0 ? '#16a34a' : '#dc2626' }}>{((row.percentTT ?? row.percentQD) > 0 ? '+' : '') + formatPct(row.percentTT ?? row.percentQD)}</td>
                        <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">{formatVnNum(row.dtTraGop)}</td>
                        <td className="px-2 py-3 text-center font-black text-slate-800">{formatPct(row.percentTraGop ?? row.percentTC)}</td>
                      </tr>
                    ))}
                    {summaryRow && (
                      <tr className="border-t-2 border-slate-300 font-black">
                        <td className="px-3.5 py-3.5 text-center font-black uppercase tracking-wide border-r border-slate-200" style={{ backgroundColor: '#bbf7d0', color: '#065f46' }}>{summaryRow.storeName}</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#fed7aa', color: '#9a3412' }}>{formatVnNum(summaryRow.soLuong)}</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#bfdbfe', color: '#1e40af' }}>{formatVnNum(summaryRow.doanhThu ?? summaryRow.luyKe)}</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#fed7aa', color: '#9a3412' }}>100%</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#bfdbfe', color: '#1e40af' }}>{formatVnNum(summaryRow.doanhThuQD ?? summaryRow.luyKeQD)}</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#fed7aa', color: '#9a3412' }}>{formatVnNum(summaryRow.target ?? summaryRow.tarVuotTroi)}</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#fed7aa', color: '#9a3412' }}>{formatPct(summaryRow.percentHtTarget ?? summaryRow.percentHtVuotTroi)}</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#fef08a', color: '#854d0e' }}>{formatVnNum(summaryRow.tb3Thang)}</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#fef08a', color: '#854d0e' }}>{formatPct(summaryRow.percentTT ?? summaryRow.percentQD)}</td>
                        <td className="px-2 py-3.5 text-center font-black border-r border-slate-200" style={{ backgroundColor: '#ddd6fe', color: '#6b21a8' }}>{formatVnNum(summaryRow.dtTraGop)}</td>
                        <td className="px-2 py-3.5 text-center font-black" style={{ backgroundColor: '#ddd6fe', color: '#6b21a8' }}>{formatPct(summaryRow.percentTraGop ?? summaryRow.percentTC)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          previewImage={previewImage}
          setPreviewImage={setPreviewImage}
        />
      )}

      {/* Nhận xét Modal */}
      {isCommentModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            onClick={() => setIsCommentModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Nhận xét thi đua
                </span>
              </div>
              <button
                onClick={() => setIsCommentModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pt-5 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2.5 uppercase tracking-wide">
                Chọn mẫu nội dung nhận xét:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {commentTemplates.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedTemplate(tab.id - 1);
                      setCommentText(tab.text);
                    }}
                    className={
                      'flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11.5px] font-black uppercase tracking-wide transition-all cursor-pointer border ' +
                      (selectedTemplate === tab.id - 1
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md shadow-orange-500/25'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                    }
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 space-y-4">
              <div>
                <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">
                  Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
                </p>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={11}
                  className="w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                  style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11.5px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={handleCopyComment}
                  className={
                    'flex items-center gap-2 px-6 py-3 text-[12px] font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ' +
                    (copiedComment
                      ? 'text-white bg-emerald-500 border border-emerald-600 shadow-emerald-500/20'
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500 shadow-orange-500/25')
                  }
                >
                  {copiedComment ? (
                    <>
                      <Check size={16} />
                      <span>Đã copy!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Sao chép nhận xét</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Popup Cấu hình Target Siêu Thị (Cụm) */}
      {isTargetConfigModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4">
          <div
            onClick={() => setIsTargetConfigModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <h3
                    className="text-[14px] sm:text-[16px] font-black uppercase tracking-wide leading-tight"
                    style={{ fontFamily: "'UTM Avo', sans-serif" }}
                  >
                    Cấu hình Target Siêu Thị (Cụm)
                  </h3>
                  <p className="text-[11px] sm:text-[12px] text-amber-100 font-medium leading-none mt-1">
                    Cài đặt Target Cùng Kỳ Năm &amp; Mục Tiêu % cho từng siêu thị trong cụm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTargetConfigModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Đóng popup"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Fill Toolbar */}
            <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] sm:text-[12px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-amber-700" />
                  <span>Áp dụng nhanh % mục tiêu:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {[100, 105, 110, 115, 120].map(pct => (
                    <button
                      key={pct}
                      onClick={() => handleApplyQuickPercent(pct)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300/80 rounded-lg text-xs font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={quickPercentInput}
                    onChange={e => setQuickPercentInput(Number(e.target.value))}
                    className="w-20 pr-6 pl-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-black text-right text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    placeholder="100"
                  />
                  <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                </div>
                <button
                  onClick={() => handleApplyQuickPercent(quickPercentInput)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Áp dụng tất cả
                </button>
              </div>
            </div>

            {/* Store Target Table */}
            <div className="px-6 py-4 overflow-y-auto max-h-[56vh] space-y-3">
              <div className="overflow-x-auto w-full border border-slate-200 rounded-2xl shadow-2xs">
                <table className="w-full border-collapse font-sans text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-3 text-center w-12 border-r border-slate-200">STT</th>
                      <th className="py-3 px-3.5 border-r border-slate-200">Tên Siêu Thị</th>
                      <th className="py-3 px-3 text-right w-44 border-r border-slate-200">
                        Target Cùng Kỳ Năm <span className="text-[10px] text-slate-400 lowercase">(tr)</span>
                      </th>
                      <th className="py-3 px-3 text-right w-36 border-r border-slate-200">Mục Tiêu %</th>
                      <th className="py-3 px-3 text-right w-44 border-r border-slate-200">
                        Target Mục Tiêu <span className="text-[10px] text-slate-400 lowercase">(tr)</span>
                      </th>
                      <th className="py-3 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalTargetList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs font-medium text-slate-400">
                          Chưa có siêu thị nào trong danh sách. Hãy nhấn "Thêm siêu thị cấu hình" bên dưới.
                        </td>
                      </tr>
                    ) : (
                      modalTargetList.map((item, idx) => {
                        const targetDuKien = Math.round((Number(item.targetCungKyNam) || 0) * ((Number(item.mucTieuPercent) || 0) / 100));
                        return (
                          <tr key={item.id} className="hover:bg-amber-50/30 transition-colors bg-white">
                            <td className="py-2.5 px-3 text-center font-black text-xs text-slate-500 border-r border-slate-100">
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-black"
                                style={{
                                  backgroundColor: idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fed7aa' : '#f1f5f9',
                                  color: '#0f172a',
                                }}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-100">
                              <input
                                type="text"
                                value={item.storeName}
                                onChange={e => handleUpdateTargetItem(item.id, 'storeName', e.target.value)}
                                className="w-full bg-transparent font-black text-slate-800 text-xs sm:text-[13px] border-b border-transparent focus:border-amber-400 focus:bg-amber-50/50 px-1 py-0.5 rounded outline-none uppercase transition-all"
                                placeholder="Nhập tên siêu thị..."
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right border-r border-slate-100">
                              <input
                                type="number"
                                value={item.targetCungKyNam || ''}
                                placeholder="0"
                                onChange={e => handleUpdateTargetItem(item.id, 'targetCungKyNam', Math.max(0, Number(e.target.value)))}
                                className="w-full text-right font-black text-slate-900 text-xs sm:text-[13px] border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 px-2.5 py-1.5 rounded-xl outline-none bg-slate-50/70 focus:bg-white transition-all"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right border-r border-slate-100">
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  value={item.mucTieuPercent || ''}
                                  placeholder="100"
                                  onChange={e => handleUpdateTargetItem(item.id, 'mucTieuPercent', Number(e.target.value))}
                                  className="w-full text-right font-black text-xs sm:text-[13px] border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 pr-6 pl-2 py-1.5 rounded-xl outline-none bg-slate-50/70 focus:bg-white transition-all"
                                  style={{ color: item.mucTieuPercent >= 100 ? '#16a34a' : '#dc2626' }}
                                />
                                <span className="absolute right-2 text-xs font-black text-slate-400 pointer-events-none">%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-xs sm:text-[13px] text-amber-800 border-r border-slate-100">
                              {formatVnNum(targetDuKien)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => handleRemoveStoreFromConfig(item.id)}
                                className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Xóa dòng siêu thị này"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {modalTargetList.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-amber-50/80 font-black text-xs sm:text-[13px]">
                        <td colSpan={2} className="py-3 px-3.5 text-center uppercase tracking-wider text-amber-950 font-black border-r border-amber-200/70">
                          TỔNG CỤM ({modalTargetList.length} SIÊU THỊ)
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-black border-r border-amber-200/70">
                          {formatVnNum(totalCungKy)}
                        </td>
                        <td
                          className="py-3 px-3 text-right font-black border-r border-amber-200/70"
                          style={{ color: avgMucTieu >= 100 ? '#16a34a' : '#dc2626' }}
                        >
                          {avgMucTieu > 0 ? `${avgMucTieu}%` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-900 font-black border-r border-amber-200/70">
                          {formatVnNum(totalTargetDuKien)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  onClick={handleAddStoreToConfig}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-amber-400 text-amber-800 hover:bg-amber-50 text-xs font-black transition-all cursor-pointer shadow-2xs"
                >
                  <Plus size={15} />
                  <span>Thêm siêu thị cấu hình</span>
                </button>
                <span className="text-[11px] text-slate-400 italic">
                  * Target Mục Tiêu = Target Cùng Kỳ Năm × (Mục Tiêu % / 100)
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetTargetDefaults}
                  className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Đặt lại toàn bộ Mục tiêu % về 100%"
                >
                  <RotateCcw size={14} />
                  <span>Đặt lại 100%</span>
                </button>
                <span className="text-[11.5px] text-slate-400 italic hidden sm:inline">
                  • Cấu hình được lưu an toàn trên máy của bạn
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsTargetConfigModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={handleSaveTargetConfig}
                  className={
                    'flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-md active:scale-95 ' +
                    (isSavedToast
                      ? 'bg-emerald-600 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25')
                  }
                >
                  {isSavedToast ? (
                    <>
                      <Check size={16} />
                      <span>Đã lưu thành công!</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Lưu Cấu Hình</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClusterReportTab;
