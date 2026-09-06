const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../src/pages/ClusterReportTab.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Replace file with comprehensive upgraded version
const newContent = `import React, { useState, useMemo, useRef } from 'react';
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
  ClipboardPaste,
  TrendingUp,
  Target,
  CreditCard,
  BarChart3,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { ensureFontsReady } from '../utils/fontExportUtil';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

export interface ClusterStoreRow {
  stt?: number;
  rawName: string;
  storeName: string;
  // Columns from "Doanh thu hợp nhất" (New structure):
  soLuong?: number;
  doanhThu?: number; // DOANH THU thực (triệu)
  tiTrong?: number; // % TỈ TRỌNG
  doanhThuQD?: number; // DOANH THU QĐ (triệu)
  target?: number; // TARGET (triệu)
  percentHtTarget?: number; // % HT TARGET
  tb3Thang?: number; // TB 3 THÁNG (triệu)
  percentTT?: number; // % TT vs TB 3 tháng
  dtTraGop?: number; // DT TRẢ GÓP (triệu)
  percentTraGop?: number; // % TRẢ GÓP

  // Classic columns compatibility:
  luyKe: number;
  luyKeQD: number;
  tarVuotTroi: number;
  percentHtVuotTroi: number;
  percentQD: number;
  percentTC: number;
  tangGiamCK: number;
  percentDuyet: number;
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
  userProfile?: any;
  onNavigateToKhaiBao?: () => void;
  onSaveClusterData?: (val: string) => void;
}

/**
 * Format a number for VN display with thousand dot separator:
 * e.g. 4899 -> "4.899", 184 -> "184", 22013 -> "22.013", -1 -> "-1"
 */
function formatVnNum(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
  if (isNaN(num)) return String(val);
  if (num === 0) return '0';
  if (num === -1) return '-1';

  // If already in millions scale or large, format with standard Vietnamese dot separator
  if (Math.abs(num) >= 1000000000) {
    return (num / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  } else if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  }

  return num.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

/**
 * Format percentage string with precision:
 * e.g. 119.9 -> "119.9%", 30.8 -> "30.8%", 100 -> "100%", -24.5 -> "-24.5%"
 */
function formatPct(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0%';
  if (typeof val === 'string' && val.includes('%')) return val.trim();
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
  if (isNaN(num)) return '0%';
  if (Number.isInteger(num)) return `${num}%`;
  return `${num.toFixed(1)}%`;
}

/**
 * Keep full store name formatted (e.g. "10528 - ĐMM_BLI_GRA - Phường 1", "ĐMS_KGI_GRI - Hòa Hưng")
 */
function formatStoreDisplayName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (upper.includes('TỔNG CỤM') || upper === 'TỔNG' || upper.startsWith('TỔNG:') || upper.startsWith('TỔNG (')) {
    return 'TỔNG CỤM';
  }
  return trimmed;
}

function isMobileWarehouse(name: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return (
    n.includes('lưu động') ||
    n.includes('luu dong') ||
    n.includes('kho bán hàng') ||
    n.includes('kho ban hang')
  );
}

function cleanRawNum(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/%/g, '').replace(/,/g, '').replace(/^\\+/, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

// Allowed store prefixes specified by user: ĐML, ĐMM, ĐMS, TGD, AAR
const VALID_PREFIXES = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR', 'DML', 'DMM', 'DMS'];

/**
 * Check if a row is a valid store row or summary row.
 */
function detectStoreCol(cols: string[]): { isStore: boolean; isSummary: boolean; nameColIdx: number } {
  // Check for TỔNG / TỔNG CỤM / TỔNG (3 DÒNG)
  for (let i = 0; i < Math.min(cols.length, 3); i++) {
    const val = cols[i].trim().toUpperCase();
    if (val === 'TỔNG' || val.startsWith('TỔNG CỤM') || val.startsWith('TỔNG:') || val === 'TỔNG CỘNG' || val.startsWith('TỔNG (')) {
      return { isStore: true, isSummary: true, nameColIdx: i };
    }
  }

  // Check for digits - ... (e.g. 10528 - ĐMM_BLI_GRA - Phường 1) or 3 characters starting with: ĐML, ĐMM, ĐMS, TGD, AAR
  for (let i = 0; i < Math.min(cols.length, 3); i++) {
    const val = cols[i].trim();
    const upper = val.toUpperCase();
    if (/^\\d+\\s*-\\s*/.test(val) || VALID_PREFIXES.some(prefix => upper.startsWith(prefix))) {
      return { isStore: true, isSummary: false, nameColIdx: i };
    }
  }

  return { isStore: false, isSummary: false, nameColIdx: -1 };
}

/**
 * Parse KPI header metrics from raw text if copied from BI overview
 */
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

/**
 * Robust parser for the new structure from "Doanh thu hợp nhất"
 * (Supports both vertical copy and horizontal tab-separated copy)
 */
function parseConsolidatedFormat(rawText: string): { 
  rows: ClusterStoreRow[]; 
  summaryRow: ClusterStoreRow | null; 
  kpiHeader: ClusterKpiHeader | null; 
  isNewFormat: boolean 
} | null {
  const lines = rawText.split('\\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const kpiHeader = parseKpiHeader(lines);

  // Locate table header line
  let headerIdx = -1;
  let isTabbed = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('[') || l.includes('https://')) continue;

    // Check vertical header
    if (l.toLowerCase() === 'siêu thị') {
      if (i + 2 < lines.length && (
        lines[i + 1].toUpperCase().includes('SỐ LƯỢNG') ||
        lines[i + 2].toUpperCase().includes('DOANH THU') ||
        lines[i + 1].toUpperCase().includes('DOANH THU')
      )) {
        headerIdx = i;
        isTabbed = false;
        break;
      }
    } 
    // Check horizontal tabbed header
    else if (l.includes('\\t') && l.toLowerCase().startsWith('siêu thị')) {
      const cols = l.split('\\t').map(c => c.trim().toUpperCase());
      if (cols.includes('DOANH THU') || cols.includes('SỐ LƯỢNG') || cols.includes('TARGET')) {
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
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('Đơn vị:') || line.includes('Tỉ trọng tính trong nhóm')) break;
      const cols = line.split('\\t').map(c => c.trim());
      if (cols.length < 5) continue;
      const rawName = cols[0];
      const isSum = rawName.toLowerCase().startsWith('tổng');

      const soLuong = cleanRawNum(cols[1]);
      const doanhThu = cleanRawNum(cols[2]);
      const tiTrong = cleanRawNum(cols[3]);
      const doanhThuQD = cleanRawNum(cols[4]);
      const target = cleanRawNum(cols[5]);
      const percentHtTarget = cleanRawNum(cols[6]);
      const tb3Thang = cleanRawNum(cols[7]);
      const percentTT = cleanRawNum(cols[8]);
      const dtTraGop = cleanRawNum(cols[9]);
      const percentTraGop = cleanRawNum(cols[10]);

      const r: ClusterStoreRow = {
        rawName,
        storeName: isSum ? 'TỔNG CỤM' : formatStoreDisplayName(rawName),
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
        luyKe: doanhThu,
        luyKeQD: doanhThuQD,
        tarVuotTroi: target,
        percentHtVuotTroi: percentHtTarget,
        percentQD: percentTT,
        percentTC: percentTraGop,
        tangGiamCK: percentTT,
        percentDuyet: 0,
        isSummary: isSum,
      };

      if (isSum) {
        summaryRow = r;
      } else {
        rows.push(r);
      }
    }
  } else {
    // Vertical lines
    let dataStartIdx = -1;
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^\\d+\\s*-\\s*/.test(l) || /^(ĐML|ĐMM|ĐMS|TGD|AAR|DML|DMM|DMS)/i.test(l)) {
        dataStartIdx = i;
        break;
      }
    }

    if (dataStartIdx !== -1) {
      let curr = dataStartIdx;
      while (curr < lines.length) {
        const line = lines[curr];
        if (line.startsWith('Đơn vị:') || line.includes('Tỉ trọng tính trong nhóm')) break;
        const isSum = line.toLowerCase().startsWith('tổng');
        const isStore = /^\\d+\\s*-\\s*/.test(line) || /^(ĐML|ĐMM|ĐMS|TGD|AAR|DML|DMM|DMS)/i.test(line) || isSum;
        if (!isStore) {
          curr++;
          continue;
        }

        const rawName = line;
        const soLuong = cleanRawNum(lines[curr + 1]);
        const doanhThu = cleanRawNum(lines[curr + 2]);
        const tiTrong = cleanRawNum(lines[curr + 3]);
        const doanhThuQD = cleanRawNum(lines[curr + 4]);
        const target = cleanRawNum(lines[curr + 5]);
        const percentHtTarget = cleanRawNum(lines[curr + 6]);
        const tb3Thang = cleanRawNum(lines[curr + 7]);
        const percentTT = cleanRawNum(lines[curr + 8]);
        const dtTraGop = cleanRawNum(lines[curr + 9]);
        const percentTraGop = cleanRawNum(lines[curr + 10]);

        const r: ClusterStoreRow = {
          rawName,
          storeName: isSum ? 'TỔNG CỤM' : formatStoreDisplayName(rawName),
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
          luyKe: doanhThu,
          luyKeQD: doanhThuQD,
          tarVuotTroi: target,
          percentHtVuotTroi: percentHtTarget,
          percentQD: percentTT,
          percentTC: percentTraGop,
          tangGiamCK: percentTT,
          percentDuyet: 0,
          isSummary: isSum,
        };

        if (isSum) {
          summaryRow = r;
        } else {
          rows.push(r);
        }

        curr += 11;
      }
    }
  }

  if (rows.length === 0 && !summaryRow) return null;

  // Auto calculate summary row if missing
  if (!summaryRow && rows.length > 0) {
    const sumSoLuong = rows.reduce((acc, r) => acc + (r.soLuong || 0), 0);
    const sumDoanhThu = rows.reduce((acc, r) => acc + (r.doanhThu || 0), 0);
    const sumDoanhThuQD = rows.reduce((acc, r) => acc + (r.doanhThuQD || 0), 0);
    const sumTarget = rows.reduce((acc, r) => acc + (r.target || 0), 0);
    const sumTb3Thang = rows.reduce((acc, r) => acc + (r.tb3Thang || 0), 0);
    const sumDtTraGop = rows.reduce((acc, r) => acc + (r.dtTraGop || 0), 0);
    const sumPercentHt = sumTarget > 0 ? (sumDoanhThu / sumTarget) * 100 : 0;
    const sumPercentTT = sumTb3Thang > 0 ? ((sumDoanhThu - sumTb3Thang) / sumTb3Thang) * 100 : 0;
    const sumPercentTraGop = sumDoanhThu > 0 ? (sumDtTraGop / sumDoanhThu) * 100 : 0;

    summaryRow = {
      rawName: 'TỔNG CỤM',
      storeName: 'TỔNG CỤM',
      soLuong: sumSoLuong,
      doanhThu: sumDoanhThu,
      tiTrong: 100,
      doanhThuQD: sumDoanhThuQD,
      target: sumTarget,
      percentHtTarget: sumPercentHt,
      tb3Thang: sumTb3Thang,
      percentTT: sumPercentTT,
      dtTraGop: sumDtTraGop,
      percentTraGop: sumPercentTraGop,
      luyKe: sumDoanhThu,
      luyKeQD: sumDoanhThuQD,
      tarVuotTroi: sumTarget,
      percentHtVuotTroi: sumPercentHt,
      percentQD: sumPercentTT,
      percentTC: sumPercentTraGop,
      tangGiamCK: sumPercentTT,
      percentDuyet: 0,
      isSummary: true,
    };
  }

  return { rows, summaryRow, kpiHeader, isNewFormat: true };
}

/**
 * Classic parser fallback for older report formats
 */
function parseClassicClusterSummaryData(rawText: string): { rows: ClusterStoreRow[]; summaryRow: ClusterStoreRow | null } {
  const lines = rawText.split('\\n').map(l => l.trim()).filter(Boolean);
  const rawRows: ClusterStoreRow[] = [];
  const khoLuuDongRows: ClusterStoreRow[] = [];
  let summaryRow: ClusterStoreRow | null = null;

  let nameIdx = -1;
  let luyKeIdx = -1;
  let luyKeQDIdx = -1;
  let tarVuotTroiIdx = -1;
  let percentHtIdx = -1;
  let percentQDIdx = -1;
  let percentTCIdx = -1;
  let tangGiamCKIdx = -1;
  let percentDuyetIdx = -1;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('hỗ trợ bi liên hệ user') || lowerLine.includes('copyright © bi report')) continue;

    const cols = line.split(/\\t|\\||\\s{2,}/).map(c => c.trim());
    if (cols.length < 2) continue;

    if (
      lowerLine.includes('tên miền') ||
      lowerLine.includes('tên siêu thị') ||
      lowerLine.includes('dt hôm qua') ||
      (lowerLine.includes('siêu thị') && lowerLine.includes('dtlk'))
    ) {
      nameIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return l.includes('tên miền') || l.includes('tên siêu thị') || l.includes('siêu thị');
      });
      luyKeIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l === 'dtlk' || l.includes('lũy kế') || l.includes('l.kế')) && !l.includes('quy đổi') && !l.includes('qđ') && !l.includes('khách') && !l.includes('tlpvtc') && !l.includes('ck');
      });
      luyKeQDIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l === 'dtqđ' || l.includes('quy đổi') || l.includes('l.kế qđ')) && !l.includes('dự kiến') && !l.includes('target') && !l.includes('ck') && !l.includes('lãi');
      });
      tarVuotTroiIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l.includes('dt dự kiến (qđ)') || l.includes('dt dự kiến qđ') || l.includes('target (qđ)') || l.includes('target qđ') || l.includes('tar v.trội') || l.includes('vượt trội')) && !l.includes('%');
      });
      percentHtIdx = cols.findIndex(c => {
        const l = c.toLowerCase();
        return (l.includes('% ht target') || l.includes('% ht') || l.includes('%ht')) && !l.includes('lntt');
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
      continue;
    }

    const { isStore, isSummary, nameColIdx: detectedNameIdx } = detectStoreCol(cols);
    if (!isStore || detectedNameIdx === -1) continue;

    const rawStoreName = cols[detectedNameIdx].trim();
    if (!rawStoreName) continue;

    let luyKe = 0;
    let luyKeQD = 0;
    let tarVuotTroi = 0;
    let percentHtVuotTroi = 0;
    let percentQD = 0;
    let percentTC = 0;
    let tangGiamCK = 0;
    let percentDuyet = 0;

    if (luyKeIdx !== -1 && luyKeIdx < cols.length) luyKe = cleanRawNum(cols[luyKeIdx]);
    else if (detectedNameIdx + 2 < cols.length) luyKe = cleanRawNum(cols[detectedNameIdx + 2]);
    else if (detectedNameIdx + 1 < cols.length) luyKe = cleanRawNum(cols[detectedNameIdx + 1]);

    if (luyKeQDIdx !== -1 && luyKeQDIdx < cols.length) luyKeQD = cleanRawNum(cols[luyKeQDIdx]);
    else if (detectedNameIdx + 4 < cols.length) luyKeQD = cleanRawNum(cols[detectedNameIdx + 4]);
    else if (detectedNameIdx + 2 < cols.length) luyKeQD = cleanRawNum(cols[detectedNameIdx + 2]);

    if (tarVuotTroiIdx !== -1 && tarVuotTroiIdx < cols.length) tarVuotTroi = cleanRawNum(cols[tarVuotTroiIdx]);
    else if (detectedNameIdx + 7 < cols.length) tarVuotTroi = cleanRawNum(cols[detectedNameIdx + 7]);

    if (percentHtIdx !== -1 && percentHtIdx < cols.length) percentHtVuotTroi = cleanRawNum(cols[percentHtIdx]);
    else if (detectedNameIdx + 8 < cols.length) percentHtVuotTroi = cleanRawNum(cols[detectedNameIdx + 8]);

    if (percentQDIdx !== -1 && percentQDIdx < cols.length) percentQD = cleanRawNum(cols[percentQDIdx]);
    else if (detectedNameIdx + 10 < cols.length) percentQD = cleanRawNum(cols[detectedNameIdx + 10]);

    if (percentTCIdx !== -1 && percentTCIdx < cols.length) percentTC = cleanRawNum(cols[percentTCIdx]);
    else if (detectedNameIdx + 12 < cols.length) percentTC = cleanRawNum(cols[detectedNameIdx + 12]);

    if (tangGiamCKIdx !== -1 && tangGiamCKIdx < cols.length) tangGiamCK = cleanRawNum(cols[tangGiamCKIdx]);
    else if (detectedNameIdx + 13 < cols.length) tangGiamCK = cleanRawNum(cols[detectedNameIdx + 13]);

    if (percentDuyetIdx !== -1 && percentDuyetIdx < cols.length) percentDuyet = cleanRawNum(cols[percentDuyetIdx]);
    else if (detectedNameIdx + 14 < cols.length) percentDuyet = cleanRawNum(cols[detectedNameIdx + 14]);

    const formattedName = formatStoreDisplayName(rawStoreName);
    const rowObj: ClusterStoreRow = {
      rawName: rawStoreName,
      storeName: formattedName,
      luyKe,
      luyKeQD,
      tarVuotTroi,
      percentHtVuotTroi,
      percentQD,
      percentTC,
      tangGiamCK,
      percentDuyet,
      isSummary,
    };

    if (isSummary) summaryRow = rowObj;
    else if (isMobileWarehouse(rawStoreName)) khoLuuDongRows.push(rowObj);
    else rawRows.push(rowObj);
  }

  // Handle kho lưu động if present
  if (khoLuuDongRows.length > 0 && rawRows.length > 0) {
    for (const khoRow of khoLuuDongRows) {
      const cleanKho = khoRow.rawName.toLowerCase().replace(/lưu động|luu dong|kho bán hàng|kho ban hang/g, '').trim();
      let targetStore = rawRows.find(st => {
        const cleanSt = st.rawName.toLowerCase();
        return cleanKho.length > 2 && (cleanSt.includes(cleanKho) || cleanKho.includes(cleanSt));
      });
      if (!targetStore) targetStore = rawRows[0];
      if (targetStore) {
        targetStore.luyKe += khoRow.luyKe;
        targetStore.luyKeQD += khoRow.luyKeQD;
        targetStore.tarVuotTroi += khoRow.tarVuotTroi;
        if (khoRow.luyKeQD > 0 && khoRow.tarVuotTroi > 0 && targetStore.tarVuotTroi > 0) {
          targetStore.percentHtVuotTroi = (targetStore.luyKeQD / targetStore.tarVuotTroi) * 100;
        }
      }
    }
  }

  const rows = rawRows;
  if (!summaryRow && rows.length > 0) {
    const sumLuyKe = rows.reduce((acc, r) => acc + r.luyKe, 0);
    const sumLuyKeQD = rows.reduce((acc, r) => acc + r.luyKeQD, 0);
    const sumTar = rows.reduce((acc, r) => acc + r.tarVuotTroi, 0);
    const sumPercentHt = sumTar > 0 ? (sumLuyKeQD / sumTar) * 100 : 0;
    const sumPercentQD = rows.length > 0 ? rows.reduce((a, b) => a + b.percentQD, 0) / rows.length : 0;
    const sumPercentTC = rows.length > 0 ? rows.reduce((a, b) => a + b.percentTC, 0) / rows.length : 0;
    const sumTangGiamCK = rows.length > 0 ? rows.reduce((a, b) => a + b.tangGiamCK, 0) / rows.length : 0;
    const sumPercentDuyet = rows.length > 0 ? rows.reduce((a, b) => a + b.percentDuyet, 0) / rows.length : 0;

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
      isSummary: true,
    };
  }

  return { rows, summaryRow };
}

/**
 * Unified entry point: Attempts new structure first, falls back to classic
 */
function parseClusterSummaryData(rawText: string): { 
  rows: ClusterStoreRow[]; 
  summaryRow: ClusterStoreRow | null; 
  kpiHeader: ClusterKpiHeader | null; 
  isNewFormat: boolean 
} {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { rows: [], summaryRow: null, kpiHeader: null, isNewFormat: false };
  }

  // 1. Try parsing new consolidated format
  const newResult = parseConsolidatedFormat(rawText);
  if (newResult && (newResult.rows.length > 0 || newResult.summaryRow)) {
    return newResult;
  }

  // 2. Fallback to classic format
  const classicResult = parseClassicClusterSummaryData(rawText);
  return { ...classicResult, kpiHeader: null, isNewFormat: false };
}

export const ClusterReportTab: React.FC<ClusterReportTabProps> = ({
  clusterSummaryInput,
  categoryRevenueInput,
  userProfile,
  onNavigateToKhaiBao,
  onSaveClusterData,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);

  // Direct paste modal state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteInputText, setPasteInputText] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);

  // Combine available raw text sources (clusterSummaryInput is primary for LUỸ KẾ DT)
  const rawInput = clusterSummaryInput || categoryRevenueInput || '';

  const { rows, summaryRow, kpiHeader, isNewFormat } = useMemo(() => {
    return parseClusterSummaryData(rawInput);
  }, [rawInput]);

  // Generate smart comments
  const commentTemplates = useMemo(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
    const dateStr = \`\${now.getDate()}/\${now.getMonth() + 1}/\${now.getFullYear()}\`;
    const nowHeader = \`\${timeStr} NGÀY \${dateStr}\`;

    if (rows.length === 0 && !summaryRow) {
      return [
        {
          id: 1,
          title: 'MẪU 1: TOP/BOT ST',
          icon: '🏆',
          text: \`📊 TỔNG HỢP THI ĐUA CỤM SIÊU THỊ - \${nowHeader}\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\nChưa có dữ liệu báo cáo cụm để nhận xét.\`,
        },
        {
          id: 2,
          title: 'MẪU 2: DS CẦN TĂNG TỐC',
          icon: '⚠️',
          text: \`⚠️ DANH SÁCH CẦN TĂNG TỐC - \${nowHeader}\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\nChưa có dữ liệu báo cáo cụm để nhận xét.\`,
        },
        {
          id: 3,
          title: 'MẪU 3: TÓM TẮT',
          icon: '⚡',
          text: \`⚡ TÓM TẮT BÁO CÁO CỤM - \${nowHeader}\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\nChưa có dữ liệu báo cáo cụm để nhận xét.\`,
        },
      ];
    }

    if (isNewFormat) {
      // New format templates based on "Doanh thu hợp nhất"
      const sortedStores = [...rows].sort((a, b) => (b.percentHtTarget ?? 0) - (a.percentHtTarget ?? 0));
      const topStores = sortedStores.slice(0, 5);
      const lowStores = sortedStores.filter(r => (r.percentHtTarget ?? 0) < 100);

      const totalDoanhThu = summaryRow?.doanhThu || 0;
      const totalDoanhThuQD = summaryRow?.doanhThuQD || 0;
      const totalTar = summaryRow?.target || 0;
      const totalHt = summaryRow?.percentHtTarget || 0;
      const totalTT = summaryRow?.percentTT || 0;
      const totalTB3T = summaryRow?.tb3Thang || 0;
      const totalTraGop = summaryRow?.dtTraGop || 0;
      const totalPercentTraGop = summaryRow?.percentTraGop || 0;

      return [
        {
          id: 1,
          title: 'MẪU 1: TOP/BOT ST',
          icon: '🏆',
          text: \`📊 TỔNG HỢP DOANH THU CỤM SIÊU THỊ - \${nowHeader}\\n\` +
            \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n\` +
            \`📈 KẾT QUẢ TỔNG QUAN TOÀN CỤM:\\n\` +
            \`🎯 Doanh thu QĐ: \${formatVnNum(totalDoanhThuQD)} tr | DT thực: \${formatVnNum(totalDoanhThu)} tr\\n\` +
            \`🎯 Tiến độ Target: \${formatPct(totalHt)} (Mục tiêu: \${formatVnNum(totalTar)} tr)\\n\` +
            \`🚀 Tăng trưởng vs TB 3 tháng: \${totalTT > 0 ? '+' : ''}\${formatPct(totalTT)} (TB 3T: \${formatVnNum(totalTB3T)} tr)\\n\` +
            \`💳 Doanh thu Trả góp: \${formatVnNum(totalTraGop)} tr (Tỉ trọng: \${formatPct(totalPercentTraGop)})\\n\\n\` +
            \`🏆 TOP DẪN ĐẦU TIẾN ĐỘ TARGET:\\n\` +
            topStores.map((s, idx) => \`▲ #\${idx + 1}. \${s.storeName}: \${formatVnNum(s.doanhThuQD)} tr QĐ (\${formatPct(s.percentHtTarget)} target | %TT: \${(s.percentTT ?? 0) > 0 ? '+' : ''}\${formatPct(s.percentTT)} | %TG: \${formatPct(s.percentTraGop)})\`).join('\\n') +
            (lowStores.length > 0 ? \`\\n\\n⚠️ SIÊU THỊ CẦN TĂNG TỐC:\\n\` + lowStores.map((s, idx) => \`🔻 #\${idx + 1}. \${s.storeName} (\${formatPct(s.percentHtTarget)} target)\`).join('\\n') : '') +
            \`\\n\\n👏 Chúc mừng các siêu thị xuất sắc đã bứt phá! Toàn cụm tiếp tục tăng tốc để hoàn thành vượt mức kế hoạch! 🚀🚀🚀\`,
        },
        {
          id: 2,
          title: 'MẪU 2: DS CẦN TĂNG TỐC',
          icon: '⚠️',
          text: \`⚠️ DANH SÁCH SIÊU THỊ CẦN TĂNG TỐC VỀ ĐÍCH - \${nowHeader}\\n\` +
            \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n\` +
            \`🎯 Tiến độ toàn cụm: \${formatPct(totalHt)} so với kế hoạch target.\\n\` +
            \`💳 Tỉ trọng trả góp cụm: \${formatPct(totalPercentTraGop)} | Tăng trưởng: \${totalTT > 0 ? '+' : ''}\${formatPct(totalTT)}\\n\\n\` +
            \`⚠️ CÁC SIÊU THỊ TIẾN ĐỘ CHƯA ĐẠT KẾ HOẠCH:\\n\` +
            (lowStores.length > 0
              ? lowStores.map((s, idx) => \`🔻 #\${idx + 1}. \${s.storeName}: \${formatVnNum(s.doanhThuQD)} tr QĐ (\${formatPct(s.percentHtTarget)} target | %TT: \${(s.percentTT ?? 0) > 0 ? '+' : ''}\${formatPct(s.percentTT)} | %TG: \${formatPct(s.percentTraGop)})\`).join('\\n')
              : '✅ Toàn bộ các siêu thị trong cụm đều đạt trên 100% target! 🎉') +
            \`\\n\\n💡 HÀNH ĐỘNG TRỌNG TÂM HÔM NAY:\\n\` +
            \`1. Tiếp cận 100% khách hàng bước vào siêu thị\\n\` +
            \`2. Đẩy mạnh tư vấn Trả góp / Trả chậm để nâng cao tỷ lệ chốt đơn\\n\` +
            \`3. Giới thiệu combo phụ kiện, gia dụng bán kèm\\n\` +
            \`🔥 Toàn thể cụm cùng nỗ lực 200% để hoàn thành xuất sắc mục tiêu! 🔥\`,
        },
        {
          id: 3,
          title: 'MẪU 3: TÓM TẮT',
          icon: '⚡',
          text: \`⚡ BÁO CÁO NHANH TIẾN ĐỘ DOANH THU CỤM - \${nowHeader}\\n\` +
            \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n\` +
            rows
              .map(
                (r, idx) =>
                  \`\${idx + 1}. \${r.storeName}:\\n\` +
                  \`   - DT thực: \${formatVnNum(r.doanhThu)} tr | DT QĐ: \${formatVnNum(r.doanhThuQD)} tr (\${formatPct(r.tiTrong)} cụm)\\n\` +
                  \`   - Target: \${formatVnNum(r.target)} tr | %HT: \${formatPct(r.percentHtTarget)}\\n\` +
                  \`   - TT vs TB3T: \${(r.percentTT ?? 0) > 0 ? '+' : ''}\${formatPct(r.percentTT)} | DT Trả góp: \${formatVnNum(r.dtTraGop)} tr (\${formatPct(r.percentTraGop)})\`
              )
              .join('\\n\\n') +
            \`\\n\\n➡️ TỔNG CỤM: \${formatVnNum(totalDoanhThuQD)} tr QĐ (\${formatPct(totalHt)} target | Trả góp: \${formatPct(totalPercentTraGop)}).\`,
        },
      ];
    }

    // Classic format templates
    const sortedStores = [...rows].sort((a, b) => b.percentHtVuotTroi - a.percentHtVuotTroi);
    const topStores = sortedStores.slice(0, 5);
    const lowStores = sortedStores.filter(r => r.percentHtVuotTroi < 100);
    const totalLuyKeQD = summaryRow?.luyKeQD || 0;
    const totalTar = summaryRow?.tarVuotTroi || 0;
    const totalHt = summaryRow?.percentHtVuotTroi || 0;
    const totalTC = summaryRow?.percentTC || 0;
    const totalCK = summaryRow?.tangGiamCK || 0;
    const totalDuyet = summaryRow?.percentDuyet || 0;

    return [
      {
        id: 1,
        title: 'MẪU 1: TOP/BOT ST',
        icon: '🏆',
        text: \`📊 TỔNG HỢP THI ĐUA CỤM SIÊU THỊ - \${nowHeader}\\n\` +
          \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n\` +
          \`📈 KẾT QUẢ TỔNG QUAN:\\n\` +
          \`🎯 Toàn cụm: \${formatVnNum(totalLuyKeQD)} tỷ QĐ / Target \${formatVnNum(totalTar)} tỷ (Đạt: \${formatPct(totalHt)})\\n\` +
          \`💳 Tỷ trọng Trả chậm: \${formatPct(totalTC)} | +/-CK: \${totalCK > 0 ? \`+\${formatPct(totalCK)}\` : formatPct(totalCK)} | Duyệt: \${formatPct(totalDuyet)}\\n\\n\` +
          \`🏆 TOP DẪN ĐẦU:\\n\` +
          topStores.map((s, idx) => \`▲ #\${idx + 1}. \${s.storeName} (\${formatPct(s.percentHtVuotTroi)})\`).join('\\n') +
          (lowStores.length > 0 ? \`\\n\\n⚠️ CẦN TĂNG TỐC:\\n\` + lowStores.map((s, idx) => \`🔻 #\${idx + 1}. \${s.storeName} (\${formatPct(s.percentHtVuotTroi)})\`).join('\\n') : '') +
          \`\\n\\n👏 Chúc mừng các siêu thị xuất sắc đã bứt phá! Các siêu thị tiếp tục phát huy và tăng tốc về đích nhé! 🚀🚀🚀\`,
      },
      {
        id: 2,
        title: 'MẪU 2: DS CẦN TĂNG TỐC',
        icon: '⚠️',
        text: \`⚠️ DANH SÁCH SIÊU THỊ CẦN TĂNG TỐC VỀ ĐÍCH - \${nowHeader}\\n\` +
          \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n\` +
          \`🎯 Tiến độ toàn cụm: \${formatPct(totalHt)} so với kế hoạch vượt trội.\\n\\n\` +
          \`⚠️ CÁC SIÊU THỊ TIẾN ĐỘ CHƯA ĐẠT KẾ HOẠCH:\\n\` +
          (lowStores.length > 0
            ? lowStores.map((s, idx) => \`🔻 #\${idx + 1}. \${s.storeName}: \${formatVnNum(s.luyKeQD)} tỷ QĐ (\${formatPct(s.percentHtVuotTroi)} target | %TC: \${formatPct(s.percentTC)})\`).join('\\n')
            : '✅ Toàn bộ các siêu thị trong cụm đều đạt trên 100% target! 🎉') +
          \`\\n\\n💡 HÀNH ĐỘNG TRỌNG TÂM HÔM NAY:\\n\` +
          \`1. Tiếp cận 100% khách hàng bước vào siêu thị\\n\` +
          \`2. Đẩy mạnh tư vấn Trả góp / Trả chậm để nâng cao tỷ lệ chốt đơn\\n\` +
          \`3. Giới thiệu combo phụ kiện, gia dụng bán kèm\\n\` +
          \`🔥 Toàn thể cụm cùng nỗ lực 200% để hoàn thành xuất sắc mục tiêu! 🔥\`,
      },
      {
        id: 3,
        title: 'MẪU 3: TÓM TẮT',
        icon: '⚡',
        text: \`⚡ BÁO CÁO NHANH TIẾN ĐỘ CỤM SIÊU THỊ - \${nowHeader}\\n\` +
          \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n\` +
          rows
            .map(
              (r, idx) =>
                \`\${idx + 1}. \${r.storeName}:\\n\` +
                \`   - L.Kế: \${formatVnNum(r.luyKe)} | L.Kế QĐ: \${formatVnNum(r.luyKeQD)}\\n\` +
                \`   - %HT Vượt trội: \${formatPct(r.percentHtVuotTroi)} | %QĐ: \${formatPct(r.percentQD)} | %TC: \${formatPct(r.percentTC)} | Duyệt: \${formatPct(r.percentDuyet)}\`
            )
            .join('\\n\\n') +
          \`\\n\\n➡️ TỔNG CỤM: \${formatVnNum(totalLuyKeQD)} tỷ QĐ (\${formatPct(totalHt)} target vượt trội | %TC: \${formatPct(totalTC)}).\`,
      },
    ];
  }, [rows, summaryRow, isNewFormat]);

  // Update comment text when template changes
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

  const handleSavePasteData = () => {
    if (!pasteInputText || !pasteInputText.trim()) return;
    if (onSaveClusterData) {
      onSaveClusterData(pasteInputText);
    }
    setIsPasteModalOpen(false);
  };

  /**
   * High quality zero-shadow capture
   */
  const handleCapture = async () => {
    if (!tableRef.current) return;
    setIsCapturing(true);

    try {
      await ensureFontsReady();

      const original = tableRef.current;
      const clone = original.cloneNode(true) as HTMLElement;

      // 1. Remove all .no-capture elements
      clone.querySelectorAll('.no-capture').forEach(el => el.remove());

      // 2. Remove all shadows, textShadows, filters, and scrollbars
      clone.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.filter = 'none';
        htmlEl.style.overflow = 'visible';
        htmlEl.classList.remove('shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'drop-shadow-sm', 'drop-shadow-md');
      });

      // 3. Remove scroll containers and ensure 100% full width
      const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto');
      scrollContainers.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.width = '100%';
        htmlEl.style.minWidth = '0';
        htmlEl.style.maxWidth = 'none';
      });

      // 4. Force table to 100% width with fixed table-layout
      const tableEl = clone.querySelector('table');
      if (tableEl) {
        tableEl.style.width = '100%';
        tableEl.style.minWidth = '100%';
        tableEl.style.maxWidth = '100%';
        tableEl.style.tableLayout = 'fixed';
      }

      // 5. Wrap in frameWrapper container
      const targetWidthPx = 1240;
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = \`\${targetWidthPx}px\`;
      tempContainer.style.zIndex = '-9999';

      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = '24px';
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.borderRadius = '24px';
      frameWrapper.style.width = \`\${targetWidthPx}px\`;
      frameWrapper.style.minWidth = \`\${targetWidthPx}px\`;
      frameWrapper.style.maxWidth = \`\${targetWidthPx}px\`;
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                {isNewFormat ? 'Doanh thu hợp nhất' : 'Luỹ kế tháng'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Dữ liệu đồng bộ từ <strong className="text-slate-600">Cập nhật &gt; Báo cáo Tổng hợp &gt; Luỹ kế DT</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setPasteInputText(rawInput);
              setIsPasteModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-amber-200/60"
            title="Dán hoặc cập nhật dữ liệu báo cáo cụm"
          >
            <ClipboardPaste size={16} className="text-amber-600" />
            <span>CẬP NHẬT DATA</span>
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

      {/* KPI Overview Cards (New Format) */}
      {isNewFormat && (kpiHeader || summaryRow) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 animate-in fade-in duration-300">
          {/* Card 1: DT THỰC */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 p-4 rounded-3xl border border-blue-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-700 mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider">DOANH THU THỰC</span>
              <BarChart3 size={16} className="text-blue-500" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
                {formatVnNum(kpiHeader?.dtThuc ?? summaryRow?.doanhThu)} <span className="text-xs font-bold text-blue-600">tr</span>
              </div>
              <div className="text-[10.5px] font-semibold text-blue-600/80 mt-0.5 truncate">
                {kpiHeader?.dtThucSub || 'Lũy kế tới hiện tại'}
              </div>
            </div>
          </div>

          {/* Card 2: DOANH THU QĐ */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50/40 p-4 rounded-3xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider">DOANH THU QĐ</span>
              <Layers size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight">
                {formatVnNum(summaryRow?.doanhThuQD)} <span className="text-xs font-bold text-amber-700">tr</span>
              </div>
              <div className="text-[10.5px] font-semibold text-amber-700/80 mt-0.5 truncate">
                Quy đổi toàn cụm
              </div>
            </div>
          </div>

          {/* Card 3: % HT TARGET */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 rounded-3xl border border-emerald-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider">% HT TARGET</span>
              <Target size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">
                {formatPct(kpiHeader?.percentHtTarget ?? summaryRow?.percentHtTarget)}
              </div>
              <div className="text-[10.5px] font-semibold text-emerald-700/80 mt-0.5 truncate">
                {kpiHeader?.percentHtTargetSub || \`Target: \${formatVnNum(summaryRow?.target)} tr\`}
              </div>
            </div>
          </div>

          {/* Card 4: TT VS TB 3 THÁNG */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50/40 p-4 rounded-3xl border border-purple-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-800 mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider">TT VS TB 3 THÁNG</span>
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight">
                {((kpiHeader?.ttVsTb3Thang ?? summaryRow?.percentTT ?? 0) > 0 ? '+' : '') + formatPct(kpiHeader?.ttVsTb3Thang ?? summaryRow?.percentTT)}
              </div>
              <div className="text-[10.5px] font-semibold text-purple-700/80 mt-0.5 truncate">
                {kpiHeader?.ttVsTb3ThangSub || \`TB 3T: \${formatVnNum(summaryRow?.tb3Thang)} tr\`}
              </div>
            </div>
          </div>

          {/* Card 5: DT TRẢ GÓP */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50/40 p-4 rounded-3xl border border-rose-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-800 mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider">DT TRẢ GÓP</span>
              <CreditCard size={16} className="text-rose-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-rose-950 tracking-tight">
                {formatVnNum(summaryRow?.dtTraGop)} <span className="text-xs font-bold text-rose-700">tr</span>
              </div>
              <div className="text-[10.5px] font-semibold text-rose-700/80 mt-0.5 truncate">
                {kpiHeader?.tiTrongTraGopSub || \`Tỉ trọng: \${formatPct(kpiHeader?.tiTrongTraGop ?? summaryRow?.percentTraGop)}\`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      {rows.length === 0 && !summaryRow ? (
        /* Empty State */
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
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setPasteInputText('');
                setIsPasteModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-200 transition-all active:scale-95 cursor-pointer"
            >
              <ClipboardPaste size={16} />
              <span>Dán dữ liệu tại đây</span>
            </button>
            {onNavigateToKhaiBao && (
              <button
                onClick={onNavigateToKhaiBao}
                className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-wider border border-indigo-200 transition-all active:scale-95 cursor-pointer"
              >
                <span>Đi đến trang Cập nhật</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Render Table */
        <div className="bg-white rounded-3xl p-3 sm:p-6 border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          <div ref={tableRef} className="bg-white rounded-2xl overflow-hidden">
            <div className="overflow-x-auto w-full">
              {isNewFormat ? (
                /* 11-Column Table for Doanh thu hợp nhất */
                <table
                  className="w-full border-collapse text-[11px] sm:text-[12px] md:text-[13px] font-sans"
                  style={{
                    tableLayout: 'fixed',
                    minWidth: '960px',
                  }}
                >
                  <colgroup>
                    {/* SIÊU THỊ: 22% */}
                    <col style={{ width: '22%' }} />
                    {/* SỐ LƯỢNG: 7.5% */}
                    <col style={{ width: '7.5%' }} />
                    {/* DOANH THU: 8.5% */}
                    <col style={{ width: '8.5%' }} />
                    {/* % TỈ TRỌNG: 7.5% */}
                    <col style={{ width: '7.5%' }} />
                    {/* DOANH THU QĐ: 9.5% */}
                    <col style={{ width: '9.5%' }} />
                    {/* TARGET: 9% */}
                    <col style={{ width: '9%' }} />
                    {/* % HT TARGET: 9% */}
                    <col style={{ width: '9%' }} />
                    {/* TB 3 THÁNG: 8.5% */}
                    <col style={{ width: '8.5%' }} />
                    {/* % TT: 8.5% */}
                    <col style={{ width: '8.5%' }} />
                    {/* DT TRẢ GÓP: 8.5% */}
                    <col style={{ width: '8.5%' }} />
                    {/* % TRẢ GÓP: 7.5% */}
                    <col style={{ width: '7.5%' }} />
                  </colgroup>

                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th
                        className="px-3 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#fff1f2',
                          color: '#9f1239',
                          borderBottom: '2.5px solid #f43f5e',
                        }}
                      >
                        SIÊU THỊ
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                        }}
                      >
                        SỐ LƯỢNG
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                        }}
                      >
                        DOANH THU
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                        }}
                      >
                        % TỈ TRỌNG
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#fef08a',
                          color: '#854d0e',
                        }}
                      >
                        DOANH THU<br />QĐ
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                        }}
                      >
                        TARGET
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                        }}
                      >
                        % HT TARGET
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                        }}
                      >
                        TB 3 THÁNG
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                        }}
                      >
                        % TT
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#ffe4e6',
                          color: '#9f1239',
                        }}
                      >
                        DT TRẢ GÓP
                      </th>
                      <th
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: '#ffe4e6',
                          color: '#9f1239',
                        }}
                      >
                        % TRẢ GÓP
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => {
                      const isHtGood = (row.percentHtTarget ?? 0) >= 100 || (row.percentHtTarget ?? 0) >= 25;
                      const isTtGood = (row.percentTT ?? 0) > 0;

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-indigo-50/30 transition-colors"
                        >
                          {/* SIÊU THỊ */}
                          <td className="px-3.5 py-3 text-left font-black text-slate-900 border-r border-slate-100 whitespace-nowrap overflow-hidden text-ellipsis">
                            {row.storeName}
                          </td>

                          {/* SỐ LƯỢNG */}
                          <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                            {formatVnNum(row.soLuong)}
                          </td>

                          {/* DOANH THU */}
                          <td className="px-2 py-3 text-center font-black text-slate-800 border-r border-slate-100">
                            {formatVnNum(row.doanhThu)}
                          </td>

                          {/* % TỈ TRỌNG */}
                          <td className="px-2 py-3 text-center font-bold text-slate-600 border-r border-slate-100">
                            {formatPct(row.tiTrong)}
                          </td>

                          {/* DOANH THU QĐ (Highlighted) */}
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-100"
                            style={{
                              backgroundColor: '#fefce8',
                              color: '#0284c7',
                            }}
                          >
                            {formatVnNum(row.doanhThuQD)}
                          </td>

                          {/* TARGET */}
                          <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                            {formatVnNum(row.target)}
                          </td>

                          {/* % HT TARGET */}
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-100"
                            style={{
                              color: isHtGood ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {formatPct(row.percentHtTarget)}
                          </td>

                          {/* TB 3 THÁNG */}
                          <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                            {formatVnNum(row.tb3Thang)}
                          </td>

                          {/* % TT */}
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-100"
                            style={{
                              color: isTtGood ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {((row.percentTT ?? 0) > 0 ? '+' : '') + formatPct(row.percentTT)}
                          </td>

                          {/* DT TRẢ GÓP */}
                          <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                            {formatVnNum(row.dtTraGop)}
                          </td>

                          {/* % TRẢ GÓP */}
                          <td className="px-2 py-3 text-center font-black text-slate-800">
                            {formatPct(row.percentTraGop)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Summary Row */}
                    {summaryRow && (
                      <tr
                        className="border-t-2 border-slate-300 font-black"
                        style={{
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <td className="px-3.5 py-3.5 text-left font-black text-slate-900 uppercase tracking-wide border-r border-slate-200">
                          {summaryRow.storeName}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {formatVnNum(summaryRow.soLuong)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {formatVnNum(summaryRow.doanhThu)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          100.0%
                        </td>
                        <td
                          className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                          style={{
                            backgroundColor: '#fef9c3',
                            color: '#0284c7',
                          }}
                        >
                          {formatVnNum(summaryRow.doanhThuQD)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {formatVnNum(summaryRow.target)}
                        </td>
                        <td
                          className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                          style={{
                            color: (summaryRow.percentHtTarget ?? 0) >= 100 || (summaryRow.percentHtTarget ?? 0) >= 25 ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {formatPct(summaryRow.percentHtTarget)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {formatVnNum(summaryRow.tb3Thang)}
                        </td>
                        <td
                          className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                          style={{
                            color: (summaryRow.percentTT ?? 0) > 0 ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {((summaryRow.percentTT ?? 0) > 0 ? '+' : '') + formatPct(summaryRow.percentTT)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {formatVnNum(summaryRow.dtTraGop)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900">
                          {formatPct(summaryRow.percentTraGop)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                /* Classic 9-Column Table */
                <table
                  className="w-full border-collapse text-[11px] sm:text-[12.5px] md:text-[13.5px] font-sans"
                  style={{
                    tableLayout: 'fixed',
                    minWidth: '780px',
                  }}
                >
                  <colgroup>
                    <col style={{ width: '33%' }} />
                    <col style={{ width: '8.5%' }} />
                    <col style={{ width: '8.5%' }} />
                    <col style={{ width: '9.5%' }} />
                    <col style={{ width: '8.5%' }} />
                    <col style={{ width: '7.5%' }} />
                    <col style={{ width: '8.5%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>

                  <thead>
                    <tr className="border-b border-slate-200">
                      <th
                        rowSpan={2}
                        className="px-3 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#fff1f2',
                          color: '#9f1239',
                          borderBottom: '2.5px solid #f43f5e',
                        }}
                      >
                        SIÊU THỊ
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                        }}
                      >
                        L. KẾ
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-3 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#fef08a',
                          color: '#854d0e',
                        }}
                      >
                        L. KẾ<br />QĐ
                      </th>
                      <th
                        colSpan={3}
                        className="px-3 py-2 text-center align-middle font-black uppercase tracking-wider border-r border-b border-slate-200"
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                        }}
                      >
                        HIỆU QUẢ
                      </th>
                      <th
                        colSpan={3}
                        className="px-3 py-2 text-center align-middle font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: '#ffe4e6',
                          color: '#9f1239',
                        }}
                      >
                        TRẢ CHẬM
                      </th>
                    </tr>

                    <tr className="border-b-2 border-slate-200">
                      <th
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          fontSize: '11px',
                        }}
                      >
                        TAR<br />V.TRỘI
                      </th>
                      <th
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          fontSize: '11px',
                        }}
                      >
                        %HT<br />V.TRỘI
                      </th>
                      <th
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          fontSize: '11px',
                        }}
                      >
                        %QĐ
                      </th>
                      <th
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#ffe4e6',
                          color: '#9f1239',
                          fontSize: '11px',
                        }}
                      >
                        %TC
                      </th>
                      <th
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider border-r border-slate-200"
                        style={{
                          backgroundColor: '#ffe4e6',
                          color: '#9f1239',
                          fontSize: '11px',
                        }}
                      >
                        +/-CK
                      </th>
                      <th
                        className="px-2 py-2 text-center align-middle font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: '#ffe4e6',
                          color: '#9f1239',
                          fontSize: '11px',
                        }}
                      >
                        %DUYỆT
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => {
                      const isHtGood = row.percentHtVuotTroi >= 100;
                      const isQdGood = row.percentQD > 0;

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="px-3.5 py-3 text-left font-black text-slate-900 border-r border-slate-100 whitespace-nowrap overflow-hidden text-ellipsis">
                            {row.storeName}
                          </td>
                          <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                            {formatVnNum(row.luyKe)}
                          </td>
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-100"
                            style={{
                              backgroundColor: '#fefce8',
                              color: '#0284c7',
                            }}
                          >
                            {formatVnNum(row.luyKeQD)}
                          </td>
                          <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                            {formatVnNum(row.tarVuotTroi)}
                          </td>
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-100"
                            style={{
                              color: isHtGood ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {formatPct(row.percentHtVuotTroi)}
                          </td>
                          <td
                            className="px-2 py-3 text-center font-black border-r border-slate-100"
                            style={{
                              color: isQdGood ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {formatPct(row.percentQD)}
                          </td>
                          <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                            {formatPct(row.percentTC)}
                          </td>
                          <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                            {row.tangGiamCK > 0 ? \`+\${formatPct(row.tangGiamCK)}\` : formatPct(row.tangGiamCK)}
                          </td>
                          <td className="px-2 py-3 text-center font-bold text-slate-700">
                            {formatPct(row.percentDuyet)}
                          </td>
                        </tr>
                      );
                    })}

                    {summaryRow && (
                      <tr
                        className="border-t-2 border-slate-300 font-black"
                        style={{
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <td className="px-3.5 py-3.5 text-left font-black text-slate-900 uppercase tracking-wide border-r border-slate-200">
                          {summaryRow.storeName}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {formatVnNum(summaryRow.luyKe)}
                        </td>
                        <td
                          className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                          style={{
                            backgroundColor: '#fef9c3',
                            color: '#0284c7',
                          }}
                        >
                          {formatVnNum(summaryRow.luyKeQD)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {formatVnNum(summaryRow.tarVuotTroi)}
                        </td>
                        <td
                          className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                          style={{
                            color: summaryRow.percentHtVuotTroi >= 100 ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {formatPct(summaryRow.percentHtVuotTroi)}
                        </td>
                        <td
                          className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                          style={{
                            color: summaryRow.percentQD > 0 ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {formatPct(summaryRow.percentQD)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {formatPct(summaryRow.percentTC)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                          {summaryRow.tangGiamCK > 0 ? \`+\${formatPct(summaryRow.tangGiamCK)}\` : formatPct(summaryRow.tangGiamCK)}
                        </td>
                        <td className="px-2 py-3.5 text-center font-black text-slate-900">
                          {formatPct(summaryRow.percentDuyet)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct Paste Modal */}
      {isPasteModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            onClick={() => setIsPasteModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white">
              <div className="flex items-center gap-2.5">
                <ClipboardPaste size={18} className="text-white" />
                <span className="text-[14px] font-black uppercase tracking-wide">
                  Cập nhật Báo cáo Cụm (Doanh thu hợp nhất)
                </span>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Hướng dẫn lấy dữ liệu:</span>
                </div>
                Truy cập <a href="https://baocao.dienmayxanh.com/dashboard/revenue-consolidated" target="_blank" rel="noreferrer" className="font-bold text-indigo-600 underline">Báo cáo Doanh thu hợp nhất</a>, copy toàn bộ trang hoặc bảng từ cột <strong>Siêu thị</strong> đến <strong>% TRẢ GÓP</strong> và dán vào khung bên dưới.
              </div>

              <div>
                <textarea
                  value={pasteInputText}
                  onChange={e => setPasteInputText(e.target.value)}
                  placeholder="Dán dữ liệu báo cáo Doanh thu hợp nhất tại đây..."
                  rows={9}
                  className="w-full border border-slate-300 rounded-2xl p-4 text-xs font-mono text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 shadow-inner resize-y"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setPasteInputText('')}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  Xóa trắng
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPasteModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleSavePasteData}
                    disabled={!pasteInputText.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Lưu và Xem Báo cáo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
            {/* Header Banner - Orange Gradient */}
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

            {/* Template Selector Tabs */}
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
                    className={\`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11.5px] font-black uppercase tracking-wide transition-all cursor-pointer border \${
                      selectedTemplate === tab.id - 1
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md shadow-orange-500/25'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }\`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Comment Box */}
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

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11.5px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={handleCopyComment}
                  className={\`flex items-center gap-2 px-6 py-3 text-[12px] font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 \${
                    copiedComment
                      ? 'text-white bg-emerald-500 border border-emerald-600 shadow-emerald-500/20'
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500 shadow-orange-500/25'
                  }\`}
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
    </div>
  );
};

export default ClusterReportTab;
\`;

fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('Successfully updated ClusterReportTab.tsx');
