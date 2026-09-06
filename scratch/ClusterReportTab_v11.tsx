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
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { ensureFontsReady } from '../utils/fontExportUtil';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

export interface ClusterStoreRow {
  stt?: number;
  rawName: string;
  storeName: string;
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

interface ClusterReportTabProps {
  clusterSummaryInput: string;
  categoryRevenueInput?: string;
  userProfile?: any;
  onNavigateToKhaiBao?: () => void;
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
 * Format percentage string: e.g. 126 -> "126%", -24 -> "-24%", 3 -> "3%"
 */
function formatPct(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0%';
  if (typeof val === 'string' && val.includes('%')) return val.trim();
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
  if (isNaN(num)) return '0%';
  return `${Math.round(num)}%`;
}

/**
 * Keep full store name formatted (e.g. "ĐML_KGI_GRI - Giồng Riềng", "ĐMS_KGI_GRI - Hòa Hưng")
 */
function formatStoreDisplayName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (upper.includes('TỔNG CỤM') || upper === 'TỔNG' || upper.startsWith('TỔNG:')) {
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
  const str = String(val).trim().replace(/%/g, '').replace(/,/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

// Allowed store prefixes specified by user: ĐML, ĐMM, ĐMS, TGD, AAR
const VALID_PREFIXES = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR', 'DML', 'DMM', 'DMS'];

/**
 * Check if a row is a valid store row or summary row.
 * Strictly requires 3 characters starting with: ĐML, ĐMM, ĐMS, TGD, AAR (or TỔNG / TỔNG CỤM)
 */
function detectStoreCol(cols: string[]): { isStore: boolean; isSummary: boolean; nameColIdx: number } {
  // Check for TỔNG / TỔNG CỤM
  for (let i = 0; i < Math.min(cols.length, 3); i++) {
    const val = cols[i].trim().toUpperCase();
    if (val === 'TỔNG' || val.startsWith('TỔNG CỤM') || val.startsWith('TỔNG:') || val === 'TỔNG CỘNG') {
      return { isStore: true, isSummary: true, nameColIdx: i };
    }
  }

  // Check for 3 characters starting with: ĐML, ĐMM, ĐMS, TGD, AAR
  for (let i = 0; i < Math.min(cols.length, 3); i++) {
    const val = cols[i].trim().toUpperCase();
    const matches = VALID_PREFIXES.some(prefix => val.startsWith(prefix));
    if (matches) {
      return { isStore: true, isSummary: false, nameColIdx: i };
    }
  }

  return { isStore: false, isSummary: false, nameColIdx: -1 };
}

/**
 * Robust parser for "CẬP NHẬT > BÁO CÁO TỔNG HỢP > LUỸ KẾ DT"
 */
function parseClusterSummaryData(rawText: string): { rows: ClusterStoreRow[]; summaryRow: ClusterStoreRow | null } {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { rows: [], summaryRow: null };
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const rawRows: ClusterStoreRow[] = [];
  const khoLuuDongRows: ClusterStoreRow[] = [];
  let summaryRow: ClusterStoreRow | null = null;

  // Track header column indices if present
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

    // Skip generic junk lines
    if (
      lowerLine.includes('hỗ trợ bi liên hệ user') ||
      lowerLine.includes('copyright © bi report')
    ) {
      continue;
    }

    const cols = line.split(/\t|\||\s{2,}/).map(c => c.trim());
    if (cols.length < 2) continue;

    // Check if this line is the table header
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

    // STRICT CHECK: Only lines starting with ĐML, ĐMM, ĐMS, TGD, AAR or TỔNG
    const { isStore, isSummary, nameColIdx: detectedNameIdx } = detectStoreCol(cols);
    if (!isStore || detectedNameIdx === -1) {
      continue;
    }

    const rawStoreName = cols[detectedNameIdx].trim();
    if (!rawStoreName) continue;

    // Extract values with flexible column detection
    let luyKe = 0;
    let luyKeQD = 0;
    let tarVuotTroi = 0;
    let percentHtVuotTroi = 0;
    let percentQD = 0;
    let percentTC = 0;
    let tangGiamCK = 0;
    let percentDuyet = 0;

    // DTLK: Col 2 in standard BI layout
    if (luyKeIdx !== -1 && luyKeIdx < cols.length) {
      luyKe = cleanRawNum(cols[luyKeIdx]);
    } else if (detectedNameIdx + 2 < cols.length) {
      luyKe = cleanRawNum(cols[detectedNameIdx + 2]);
    } else if (detectedNameIdx + 1 < cols.length) {
      luyKe = cleanRawNum(cols[detectedNameIdx + 1]);
    }

    // DTQĐ: Col 4 in standard BI layout
    if (luyKeQDIdx !== -1 && luyKeQDIdx < cols.length) {
      luyKeQD = cleanRawNum(cols[luyKeQDIdx]);
    } else if (detectedNameIdx + 4 < cols.length) {
      luyKeQD = cleanRawNum(cols[detectedNameIdx + 4]);
    } else if (detectedNameIdx + 2 < cols.length) {
      luyKeQD = cleanRawNum(cols[detectedNameIdx + 2]);
    }

    // DT Dự Kiến (QĐ) / Target (QĐ): Col 5 in standard BI layout
    if (tarVuotTroiIdx !== -1 && tarVuotTroiIdx < cols.length) {
      tarVuotTroi = cleanRawNum(cols[tarVuotTroiIdx]);
    } else if (detectedNameIdx + 5 < cols.length) {
      tarVuotTroi = cleanRawNum(cols[detectedNameIdx + 5]);
    } else if (detectedNameIdx + 3 < cols.length) {
      tarVuotTroi = cleanRawNum(cols[detectedNameIdx + 3]);
    }

    // % HT Target Dự Kiến (QĐ): Col 6 in standard BI layout
    if (percentHtIdx !== -1 && percentHtIdx < cols.length) {
      percentHtVuotTroi = cleanRawNum(cols[percentHtIdx]);
    } else if (detectedNameIdx + 6 < cols.length) {
      percentHtVuotTroi = cleanRawNum(cols[detectedNameIdx + 6]);
    }

    // +/- DTCK Tháng (QĐ): Col 8 in standard BI layout
    if (percentQDIdx !== -1 && percentQDIdx < cols.length) {
      percentQD = cleanRawNum(cols[percentQDIdx]);
    } else if (detectedNameIdx + 8 < cols.length) {
      percentQD = cleanRawNum(cols[detectedNameIdx + 8]);
    } else if (detectedNameIdx + 7 < cols.length) {
      percentQD = cleanRawNum(cols[detectedNameIdx + 7]);
    }

    // Tỷ Trọng Trả Chậm (%TC): Col 15 in standard BI layout
    if (percentTCIdx !== -1 && percentTCIdx < cols.length) {
      percentTC = cleanRawNum(cols[percentTCIdx]);
    } else if (cols.length >= 16) {
      percentTC = cleanRawNum(cols[15]);
    } else if (cols.length >= 10) {
      percentTC = cleanRawNum(cols[cols.length - 3]);
    }

    // Tỷ lệ duyệt (%DUYỆT): Col 16 in standard BI layout
    if (percentDuyetIdx !== -1 && percentDuyetIdx < cols.length) {
      percentDuyet = cleanRawNum(cols[percentDuyetIdx]);
    } else if (cols.length >= 17) {
      percentDuyet = cleanRawNum(cols[16]);
    } else if (cols.length >= 10) {
      percentDuyet = cleanRawNum(cols[cols.length - 2]);
    }

    // +/- Tỷ Trọng Trả Chậm (+/-CK): Col 17 in standard BI layout
    if (tangGiamCKIdx !== -1 && tangGiamCKIdx < cols.length) {
      tangGiamCK = cleanRawNum(cols[tangGiamCKIdx]);
    } else if (cols.length >= 18) {
      tangGiamCK = cleanRawNum(cols[17]);
    } else if (cols.length >= 10) {
      tangGiamCK = cleanRawNum(cols[cols.length - 1]);
    }

    const rowObj: ClusterStoreRow = {
      rawName: rawStoreName,
      storeName: formatStoreDisplayName(rawStoreName),
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

    if (isSummary) {
      // Capture the FIRST (top-level) summary row for the whole cluster
      if (!summaryRow) {
        summaryRow = rowObj;
      }
    } else if (isMobileWarehouse(rawStoreName)) {
      khoLuuDongRows.push(rowObj);
    } else {
      if (!rawRows.some(r => r.storeName.toUpperCase() === rowObj.storeName.toUpperCase())) {
        rawRows.push(rowObj);
      }
    }
  }

  // Merge mobile warehouse into main store (matching parent store or Siêu thị 1)
  for (const khoRow of khoLuuDongRows) {
    if (rawRows.length > 0) {
      // Find matching parent store by base name or default to first store (rawRows[0])
      const khoClean = khoRow.storeName.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
      let targetStore = rawRows.find(r => {
        const rClean = r.storeName.trim().toLowerCase();
        return rClean === khoClean || khoClean.includes(rClean) || rClean.includes(khoClean);
      });

      if (!targetStore) {
        targetStore = rawRows[0]; // "CỘNG VÀO CHO TÊN SIÊU THỊ 1"
      }

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

  // If no summary row was explicitly provided, calculate cluster totals
  if (!summaryRow && rows.length > 0) {
    const sumLuyKe = rows.reduce((acc, r) => acc + r.luyKe, 0);
    const sumLuyKeQD = rows.reduce((acc, r) => acc + r.luyKeQD, 0);
    const sumTar = rows.reduce((acc, r) => acc + r.tarVuotTroi, 0);
    const sumPercentHt = sumTar > 0 ? (sumLuyKeQD / sumTar) * 100 : (rows.length > 0 ? rows.reduce((a, b) => a + b.percentHtVuotTroi, 0) / rows.length : 0);
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

export const ClusterReportTab: React.FC<ClusterReportTabProps> = ({
  clusterSummaryInput,
  categoryRevenueInput,
  userProfile,
  onNavigateToKhaiBao,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);

  const tableRef = useRef<HTMLDivElement>(null);

  // Combine available raw text sources (clusterSummaryInput is primary for LUỸ KẾ DT)
  const rawInput = clusterSummaryInput || categoryRevenueInput || '';

  const { rows, summaryRow } = useMemo(() => {
    return parseClusterSummaryData(rawInput);
  }, [rawInput]);

  // Generate smart comments matching Image 2 templates
  const commentTemplates = useMemo(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const nowHeader = `${timeStr} NGÀY ${dateStr}`;

    if (rows.length === 0 && !summaryRow) {
      return [
        {
          id: 1,
          title: 'MẪU 1: TOP/BOT ST',
          icon: '🏆',
          text: `📊 TỔNG HỢP THI ĐUA CỤM SIÊU THỊ - ${nowHeader}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nChưa có dữ liệu báo cáo cụm để nhận xét.`,
        },
        {
          id: 2,
          title: 'MẪU 2: DS CẦN TĂNG TỐC',
          icon: '⚠️',
          text: `⚠️ DANH SÁCH CẦN TĂNG TỐC - ${nowHeader}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nChưa có dữ liệu báo cáo cụm để nhận xét.`,
        },
        {
          id: 3,
          title: 'MẪU 3: TÓM TẮT',
          icon: '⚡',
          text: `⚡ TÓM TẮT BÁO CÁO CỤM - ${nowHeader}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nChưa có dữ liệu báo cáo cụm để nhận xét.`,
        },
      ];
    }

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
        text: `📊 TỔNG HỢP THI ĐUA CỤM SIÊU THỊ - ${nowHeader}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📈 KẾT QUẢ TỔNG QUAN:\n` +
          `🎯 Toàn cụm: ${formatVnNum(totalLuyKeQD)} tỷ QĐ / Target ${formatVnNum(totalTar)} tỷ (Đạt: ${formatPct(totalHt)})\n` +
          `💳 Tỷ trọng Trả chậm: ${formatPct(totalTC)} | +/-CK: ${totalCK > 0 ? `+${formatPct(totalCK)}` : formatPct(totalCK)} | Duyệt: ${formatPct(totalDuyet)}\n\n` +
          `🏆 TOP DẪN ĐẦU:\n` +
          topStores.map((s, idx) => `▲ #${idx + 1}. ${s.storeName} (${formatPct(s.percentHtVuotTroi)})`).join('\n') +
          (lowStores.length > 0 ? `\n\n⚠️ CẦN TĂNG TỐC:\n` + lowStores.map((s, idx) => `🔻 #${idx + 1}. ${s.storeName} (${formatPct(s.percentHtVuotTroi)})`).join('\n') : '') +
          `\n\n👏 Chúc mừng các siêu thị xuất sắc đã bứt phá! Các siêu thị tiếp tục phát huy và tăng tốc về đích nhé! 🚀🚀🚀`,
      },
      {
        id: 2,
        title: 'MẪU 2: DS CẦN TĂNG TỐC',
        icon: '⚠️',
        text: `⚠️ DANH SÁCH SIÊU THỊ CẦN TĂNG TỐC VỀ ĐÍCH - ${nowHeader}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎯 Tiến độ toàn cụm: ${formatPct(totalHt)} so với kế hoạch vượt trội.\n\n` +
          `⚠️ CÁC SIÊU THỊ TIẾN ĐỘ CHƯA ĐẠT KẾ HOẠCH:\n` +
          (lowStores.length > 0
            ? lowStores.map((s, idx) => `🔻 #${idx + 1}. ${s.storeName}: ${formatVnNum(s.luyKeQD)} tỷ QĐ (${formatPct(s.percentHtVuotTroi)} target | %TC: ${formatPct(s.percentTC)})`).join('\n')
            : '✅ Toàn bộ các siêu thị trong cụm đều đạt trên 100% target! 🎉') +
          `\n\n💡 HÀNH ĐỘNG TRỌNG TÂM HÔM NAY:\n` +
          `1. Tiếp cận 100% khách hàng bước vào siêu thị\n` +
          `2. Đẩy mạnh tư vấn Trả góp / Trả chậm để nâng cao tỷ lệ chốt đơn\n` +
          `3. Giới thiệu combo phụ kiện, gia dụng bán kèm\n` +
          `🔥 Toàn thể cụm cùng nỗ lực 200% để hoàn thành xuất sắc mục tiêu! 🔥`,
      },
      {
        id: 3,
        title: 'MẪU 3: TÓM TẮT',
        icon: '⚡',
        text: `⚡ BÁO CÁO NHANH TIẾN ĐỘ CỤM SIÊU THỊ - ${nowHeader}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          rows
            .map(
              (r, idx) =>
                `${idx + 1}. ${r.storeName}:\n` +
                `   - L.Kế: ${formatVnNum(r.luyKe)} | L.Kế QĐ: ${formatVnNum(r.luyKeQD)}\n` +
                `   - %HT Vượt trội: ${formatPct(r.percentHtVuotTroi)} | %QĐ: ${formatPct(r.percentQD)} | %TC: ${formatPct(r.percentTC)} | Duyệt: ${formatPct(r.percentDuyet)}`
            )
            .join('\n\n') +
          `\n\n➡️ TỔNG CỤM: ${formatVnNum(totalLuyKeQD)} tỷ QĐ (${formatPct(totalHt)} target vượt trội | %TC: ${formatPct(totalTC)}).`,
      },
    ];
  }, [rows, summaryRow]);

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

  /**
   * High quality zero-shadow capture:
   * - Strips all scrollbars, .no-capture elements, and shadow styles
   * - Explicit frameWrapper with 1180px fixed width to show FULL columns from SIÊU THỊ to %DUYỆT
   */
  const handleCapture = async () => {
    if (!tableRef.current) return;
    setIsCapturing(true);

    try {
      await ensureFontsReady();

      const original = tableRef.current;
      const clone = original.cloneNode(true) as HTMLElement;

      // 1. Remove all .no-capture elements (buttons, toolbars, comment editors)
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
      const targetWidthPx = 1180;
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = `${targetWidthPx}px`;
      tempContainer.style.zIndex = '-9999';

      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = '24px';
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.borderRadius = '24px';
      frameWrapper.style.width = `${targetWidthPx}px`;
      frameWrapper.style.minWidth = `${targetWidthPx}px`;
      frameWrapper.style.maxWidth = `${targetWidthPx}px`;
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
                Luỹ kế tháng
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
          {onNavigateToKhaiBao && (
            <button
              onClick={onNavigateToKhaiBao}
              className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all active:scale-95 cursor-pointer mt-2"
            >
              <span>Đi đến trang Cập nhật</span>
            </button>
          )}
        </div>
      ) : (
        /* Render Table Pixel-Perfect matching Image 2 */
        <div className="bg-white rounded-3xl p-3 sm:p-6 border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          <div ref={tableRef} className="bg-white rounded-2xl overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table
                className="w-full border-collapse text-[11px] sm:text-[12.5px] md:text-[13.5px] font-sans"
                style={{
                  tableLayout: 'fixed',
                  minWidth: '780px',
                }}
              >
                {/* Fixed column group - precisely balanced to 100% */}
                <colgroup>
                  {/* SIÊU THỊ: 33% */}
                  <col style={{ width: '33%' }} />
                  {/* L.KẾ: 8.5% */}
                  <col style={{ width: '8.5%' }} />
                  {/* L.KẾ QĐ: 8.5% */}
                  <col style={{ width: '8.5%' }} />
                  {/* TAR V.TRỘI: 9.5% */}
                  <col style={{ width: '9.5%' }} />
                  {/* %HT V.TRỘI: 8.5% */}
                  <col style={{ width: '8.5%' }} />
                  {/* %QĐ: 7.5% */}
                  <col style={{ width: '7.5%' }} />
                  {/* %TC: 8.5% */}
                  <col style={{ width: '8.5%' }} />
                  {/* +/-CK: 8% */}
                  <col style={{ width: '8%' }} />
                  {/* %DUYỆT: 8% */}
                  <col style={{ width: '8%' }} />
                </colgroup>

                {/* Grouped Header */}
                <thead>
                  {/* Header Row 1 */}
                  <tr className="border-b border-slate-200">
                    {/* SIÊU THỊ */}
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

                    {/* L.KẾ */}
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

                    {/* L.KẾ QĐ */}
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

                    {/* HIỆU QUẢ */}
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

                    {/* TRẢ CHẬM */}
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

                  {/* Header Row 2 */}
                  <tr className="border-b-2 border-slate-200">
                    {/* Under HIỆU QUẢ */}
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

                    {/* Under TRẢ CHẬM */}
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

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const isHtGood = row.percentHtVuotTroi >= 100;
                    const isQdGood = row.percentQD > 0;

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-indigo-50/30 transition-colors"
                      >
                        {/* SIÊU THỊ - full store name */}
                        <td className="px-3.5 py-3 text-left font-black text-slate-900 border-r border-slate-100 whitespace-nowrap overflow-hidden text-ellipsis">
                          {row.storeName}
                        </td>

                        {/* L.KẾ */}
                        <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                          {formatVnNum(row.luyKe)}
                        </td>

                        {/* L.KẾ QĐ (Highlighted Yellow Column + Bold Blue Text) */}
                        <td
                          className="px-2 py-3 text-center font-black border-r border-slate-100"
                          style={{
                            backgroundColor: '#fefce8',
                            color: '#0284c7',
                          }}
                        >
                          {formatVnNum(row.luyKeQD)}
                        </td>

                        {/* TAR V.TRỘI */}
                        <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                          {formatVnNum(row.tarVuotTroi)}
                        </td>

                        {/* %HT V.TRỘI (Green if >= 100%, Red if < 100%) */}
                        <td
                          className="px-2 py-3 text-center font-black border-r border-slate-100"
                          style={{
                            color: isHtGood ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {formatPct(row.percentHtVuotTroi)}
                        </td>

                        {/* %QĐ (Green if > 0%, Red if <= 0%) */}
                        <td
                          className="px-2 py-3 text-center font-black border-r border-slate-100"
                          style={{
                            color: isQdGood ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {formatPct(row.percentQD)}
                        </td>

                        {/* %TC */}
                        <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                          {formatPct(row.percentTC)}
                        </td>

                        {/* +/-CK */}
                        <td className="px-2 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                          {row.tangGiamCK > 0 ? `+${formatPct(row.tangGiamCK)}` : formatPct(row.tangGiamCK)}
                        </td>

                        {/* %DUYỆT */}
                        <td className="px-2 py-3 text-center font-bold text-slate-700">
                          {formatPct(row.percentDuyet)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Row (TỔNG CỤM) */}
                  {summaryRow && (
                    <tr
                      className="border-t-2 border-slate-300 font-black"
                      style={{
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      {/* SIÊU THỊ (TỔNG CỤM) */}
                      <td className="px-3.5 py-3.5 text-left font-black text-slate-900 uppercase tracking-wide border-r border-slate-200">
                        {summaryRow.storeName}
                      </td>

                      {/* L.KẾ */}
                      <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                        {formatVnNum(summaryRow.luyKe)}
                      </td>

                      {/* L.KẾ QĐ (Highlighted Yellow Column + Bold Blue Text) */}
                      <td
                        className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                        style={{
                          backgroundColor: '#fef9c3',
                          color: '#0284c7',
                        }}
                      >
                        {formatVnNum(summaryRow.luyKeQD)}
                      </td>

                      {/* TAR V.TRỘI */}
                      <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                        {formatVnNum(summaryRow.tarVuotTroi)}
                      </td>

                      {/* %HT V.TRỘI */}
                      <td
                        className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                        style={{
                          color: summaryRow.percentHtVuotTroi >= 100 ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {formatPct(summaryRow.percentHtVuotTroi)}
                      </td>

                      {/* %QĐ */}
                      <td
                        className="px-2 py-3.5 text-center font-black border-r border-slate-200"
                        style={{
                          color: summaryRow.percentQD > 0 ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {formatPct(summaryRow.percentQD)}
                      </td>

                      {/* %TC */}
                      <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                        {formatPct(summaryRow.percentTC)}
                      </td>

                      {/* +/-CK */}
                      <td className="px-2 py-3.5 text-center font-black text-slate-900 border-r border-slate-200">
                        {summaryRow.tangGiamCK > 0 ? `+${formatPct(summaryRow.tangGiamCK)}` : formatPct(summaryRow.tangGiamCK)}
                      </td>

                      {/* %DUYỆT */}
                      <td className="px-2 py-3.5 text-center font-black text-slate-900">
                        {formatPct(summaryRow.percentDuyet)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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

      {/* Nhận xét Modal - 100% Pixel-Perfect matching Image 2 */}
      {isCommentModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            onClick={() => setIsCommentModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header Banner - Orange Gradient matching Image 2 */}
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
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11.5px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                      selectedTemplate === tab.id - 1
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md shadow-orange-500/25'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
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
                  className={`flex items-center gap-2 px-6 py-3 text-[12px] font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
                    copiedComment
                      ? 'text-white bg-emerald-500 border border-emerald-600 shadow-emerald-500/20'
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500 shadow-orange-500/25'
                  }`}
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
