import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Download, Database, LayoutGrid, Search, AlertCircle, Save, CheckCircle2, MessageSquare, AlertTriangle, Globe, Store, Zap, TrendingUp, Filter, Settings, ArrowUp, ArrowDown, GripVertical, Lock, Unlock, Upload, Users, FileSpreadsheet, Sparkles, Eye, X, Trash2, Layers, Camera, ChevronDown, Plus, Trophy, Copy, Check, TrendingDown } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { getCachedDoc } from '../services/cachedFirestore';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../components/CaptureLoadingOverlay';
import { LineExportPanel } from '../components/LineExportPanel';
import { cn, cleanCategoryName } from './RTST/utils';
import { DEFAULT_TNB_LEADER_CATEGORIES } from '../hooks/useCategoryConfig';

// Helper function to linearly interpolate between two hex colors
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = parseInt(color1.replace('#', ''), 16);
  const c2 = parseInt(color2.replace('#', ''), 16);
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
  const f = Math.max(0, Math.min(1, factor));
  const r = Math.round(r1 + f * (r2 - r1));
  const g = Math.round(g1 + f * (g2 - g1));
  const b = Math.round(b1 + f * (b2 - b1));
  return `rgb(${r}, ${g}, ${b})`;
}

// Helper component for Paste Blocks in CAP_NHAT_DATA
const DataPasteBlock = ({
  title,
  icon: Icon,
  iconColor,
  theme,
  value,
  onChange,
  onValidate,
  labelLocked,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  theme: 'emerald' | 'blue' | 'purple' | 'indigo';
  value: string;
  onChange: (val: string) => void;
  onValidate?: (val: string) => { isValid: boolean; errorMsg?: string };
  labelLocked: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  useEffect(() => {
    setTempVal(value);
  }, [value]);

  const lineCount = useMemo(() => {
    if (!value) return 0;
    return value.split('\n').filter(l => l.trim().length > 0).length;
  }, [value]);

  const themeStyles = {
    emerald: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/50',
      text: 'text-emerald-900',
      btn: 'bg-emerald-600 hover:bg-emerald-700',
      textareaBorder: 'focus:border-emerald-500',
    },
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50/50',
      text: 'text-blue-900',
      btn: 'bg-blue-600 hover:bg-blue-700',
      textareaBorder: 'focus:border-blue-500',
    },
    purple: {
      border: 'border-purple-200',
      bg: 'bg-purple-50/50',
      text: 'text-purple-900',
      btn: 'bg-purple-600 hover:bg-purple-700',
      textareaBorder: 'focus:border-purple-500',
    },
    indigo: {
      border: 'border-indigo-200',
      bg: 'bg-indigo-50/50',
      text: 'text-indigo-900',
      btn: 'bg-indigo-600 hover:bg-indigo-700',
      textareaBorder: 'focus:border-indigo-500',
    },
  }[theme];

  const handleSave = () => {
    if (onValidate && tempVal.trim()) {
      const res = onValidate(tempVal);
      if (!res.isValid) {
        alert(res.errorMsg || 'Dữ liệu không đúng định dạng!');
        setTempVal('');
        return;
      }
    }
    onChange(tempVal);
    setIsEditing(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && onValidate) {
      const res = onValidate(pastedText);
      if (!res.isValid) {
        e.preventDefault();
        setTempVal('');
        alert(res.errorMsg || 'Dữ liệu dán không đúng định dạng!');
        return;
      }
    }
  };

  const handleCancel = () => {
    setTempVal(value);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wide">{title}</span>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {lineCount} dòng
        </span>
      </div>

      {/* Main Locked / Unlocked Container */}
      {!isEditing ? (
        <div className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border ${themeStyles.border} ${themeStyles.bg} transition-all duration-200`}>
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <Lock size={16} className={iconColor} />
            <span className={`text-xs sm:text-[13px] font-bold ${themeStyles.text} truncate`}>
              {labelLocked} ({lineCount} dòng)
            </span>
          </div>
          <button
            onClick={() => { setTempVal(value); setIsEditing(true); }}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all cursor-pointer ${themeStyles.btn}`}
          >
            <Unlock size={13} />
            Mở dán mới
          </button>
        </div>
      ) : (
        <div className="flex flex-col space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-200">
          <textarea
            value={tempVal}
            onChange={(e) => setTempVal(e.target.value)}
            onPaste={handlePaste}
            placeholder="Dán dữ liệu báo cáo từ Excel/BI (Ctrl+V)..."
            rows={5}
            autoFocus
            className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 outline-none ${themeStyles.textareaBorder} resize-y`}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">
              Đang nhập: {tempVal ? tempVal.split('\n').filter(l => l.trim().length > 0).length : 0} dòng
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTempVal('')}
                className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer"
              >
                Xóa trắng
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer ${themeStyles.btn}`}
              >
                <Save size={13} />
                Khóa &amp; Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// High-efficiency GZIP Compression using native CompressionStream (reduces text size by 90-95%)
async function compressData(str: string): Promise<string> {
  if (!str) return '';
  if (typeof str === 'string' && str.startsWith('GZ:')) return str;
  try {
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return 'GZ:' + btoa(binary);
  } catch (err) {
    console.error('[Compression] Gzip error:', err);
    return str;
  }
}

// Decompress GZIP string back to original UTF-8 text
async function decompressData(str: string): Promise<string> {
  if (!str || typeof str !== 'string') return '';
  if (!str.startsWith('GZ:')) return str;
  try {
    const binary = atob(str.slice(3));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(stream);
    return await response.text();
  } catch (err) {
    console.error('[Decompression] Gzip error:', err);
    return str;
  }
}

const FIELD_DOC_KEYS: Record<string, string> = {
  rt_vung: 'RT_VUNG',
  rt_st: 'RT_ST',
  lk_vung: 'LK_VUNG',
  lk_st: 'LK_ST',
  ds_boss: 'DS_BOSS',
};

const CHUNK_SIZE = 350000; // 350KB per chunk document (well below Firestore 1MB doc limit)

// Save large raw text to dedicated document with multi-part chunking support
async function saveRawFieldToFirestore(field: string, rawText: string, username: string) {
  const docKey = FIELD_DOC_KEYS[field] || field.toUpperCase();
  const compressed = await compressData(rawText);
  const updatedAt = new Date().toISOString();

  if (!compressed) {
    await setDoc(doc(db, 'app_settings', `TNB_RAW_${docKey}`), {
      data: '',
      partCount: 0,
      updated_at: updatedAt,
      updated_by: username,
    });
    return;
  }

  const parts: string[] = [];
  for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
    parts.push(compressed.substring(i, i + CHUNK_SIZE));
  }

  if (parts.length <= 1) {
    await setDoc(doc(db, 'app_settings', `TNB_RAW_${docKey}`), {
      data: parts[0] || '',
      partCount: 1,
      updated_at: updatedAt,
      updated_by: username,
    });
  } else {
    // Multi-part chunks for huge tables (e.g. 24k+ rows)
    const partWrites = parts.map((chunkStr, idx) =>
      setDoc(doc(db, 'app_settings', `TNB_RAW_${docKey}_P${idx}`), {
        data: chunkStr,
      })
    );
    await Promise.all(partWrites);

    // Save metadata doc
    await setDoc(doc(db, 'app_settings', `TNB_RAW_${docKey}`), {
      data: '',
      partCount: parts.length,
      updated_at: updatedAt,
      updated_by: username,
    });
  }
}

// Load field from dedicated document and resolve any parts
async function loadRawFieldFromFirestore(field: string, metaDocData?: any): Promise<string> {
  const docKey = FIELD_DOC_KEYS[field] || field.toUpperCase();
  try {
    let meta = metaDocData;
    if (!meta) {
      const snap = await getDoc(doc(db, 'app_settings', `TNB_RAW_${docKey}`));
      if (!snap.exists()) return '';
      meta = snap.data();
    }

    const partCount = meta.partCount !== undefined ? meta.partCount : (meta.data ? 1 : 0);
    if (partCount <= 0) return '';
    if (partCount === 1 && meta.data) {
      return await decompressData(meta.data);
    }

    // Parallel load parts
    const partSnaps = await Promise.all(
      Array.from({ length: partCount }, (_, idx) =>
        getDoc(doc(db, 'app_settings', `TNB_RAW_${docKey}_P${idx}`))
      )
    );

    const fullCompressed = partSnaps.map(s => s.exists() ? (s.data().data || '') : '').join('');
    return await decompressData(fullCompressed);
  } catch (err) {
    console.error(`[loadRawField] Error loading ${field}:`, err);
    return '';
  }
}

// Parser to handle CSV lines containing quotes
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

// West Provinces list for smart space-separated line parsing
const WEST_PROVINCES = [
  'An Giang', 'Bạc Liêu', 'Bến Tre', 'Cà Mau', 'Cần Thơ', 'Đồng Tháp',
  'Hậu Giang', 'Kiên Giang', 'Long An', 'Sóc Trăng', 'Tiền Giang', 'Trà Vinh', 'Vĩnh Long'
];

// Smart line splitter for both Tab-separated Excel data and Space-separated Web BI data
const splitSmartLine = (line: string, categories: { name: string; group: string }[] = DEFAULT_CATEGORIES): string[] => {
  if (!line || !line.trim()) return [];
  const trimmed = line.trim();

  // If line contains TAB, split STRICTLY by TAB (preserves commas inside category names like "Máy giặt, Máy sấy, Máy rửa chén")
  if (line.includes('\t')) {
    return line.split('\t').map(c => c.trim());
  }

  // Check category header line from space copy
  for (const cat of categories) {
    if (trimmed.toLowerCase().startsWith(cat.name.toLowerCase())) {
      const rest = trimmed.substring(cat.name.length).trim();
      const restLower = rest.toLowerCase();
      if (restLower.includes('target') || restLower.includes('dt') || restLower.includes('realtime') || restLower.includes('xếp hạng')) {
        return [cat.name, '', 'DT', 'Target', '% HT', 'Xếp hạng'];
      }
    }
  }

  // Check if line starts with "Tổng":
  if (trimmed.toLowerCase().startsWith('tổng') || trimmed.toLowerCase().startsWith('tong')) {
    const match = trimmed.match(/^(tổng|tong)\s*(.*?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+%?)\s*([\d.,]+%?)?/i);
    if (match) {
      return [match[1], '', match[3] || '', match[4] || '', match[5] || '', match[6] || ''];
    }
  }

  // Check if it starts with a Western Province:
  for (const prov of WEST_PROVINCES) {
    if (trimmed.toLowerCase().startsWith(prov.toLowerCase())) {
      const rest = trimmed.substring(prov.length).trim();
      // Match store pattern: e.g. "1732 - ĐMM_CMA_TBI - Thới Bình" followed by numbers at the end
      const match = rest.match(/^(.*?\s-\s.*?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+%?)\s*([\d.,]+%?)?\s*(\d+)?\s*$/);
      if (match) {
        const store = match[1].trim();
        const dt = match[2] || '';
        const target = match[3] || '';
        const percent = match[4] || '';
        const rankOrPercent2 = match[5] || '';
        const rank = match[6] || '';
        return [prov, store, dt, target, percent, rankOrPercent2, rank].filter(x => x !== undefined);
      }
    }
  }

  // Fallback to parseCSVLine if it contains commas
  if (trimmed.includes(',')) {
    return parseCSVLine(trimmed).map(c => c.trim());
  }

  return [trimmed];
};

// Normalizer for DS BOSS: Supports 4 columns (Tỉnh Mới, Tỉnh Cũ, BOSS, MST - Tên ST), 5 columns or 7 columns
const normalizeBossData = (rawText: string): string => {
  if (!rawText || !rawText.trim()) return '';
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return '';
  
  const isTab = lines[0].includes('\t');
  
  return lines.map((line, lineIdx) => {
    const cells = isTab ? line.split('\t').map(c => c.trim()) : parseCSVLine(line).map(c => c.trim());
    
    // CASE 1: User pasted 4 columns (Tỉnh Mới, Tỉnh Cũ, BOSS, MST - Tên Siêu Thị)
    if (cells.length === 4) {
      const colC = cells[0] || '';
      const colD = cells[1] || '';
      const colE = cells[2] || '';
      const colG = cells[3] || '';

      const lowerC = colC.toLowerCase();
      const lowerE = colE.toLowerCase();
      const lowerG = colG.toLowerCase();
      if (lineIdx === 0 && (lowerC.includes('tỉnh') || lowerE.includes('boss') || lowerG.includes('mst') || lowerG.includes('siêu thị'))) {
        return ['MST', 'SIÊU THỊ', colC || 'TỈNH MỚI', colD || 'TỈNH CŨ', colE || 'BOSS', 'KÊNH', colG || 'MST - TÊN SIÊU THỊ'].join('\t');
      }

      // Auto-extract MST (Col A) and Store Name (Col B) from Col G (MST - TÊN SIÊU THỊ)
      let mst = '';
      let tenSt = colG;
      const dashIdx = colG.indexOf('-');
      if (dashIdx !== -1) {
        mst = colG.substring(0, dashIdx).trim();
        tenSt = colG.substring(dashIdx + 1).trim();
      } else {
        const numMatch = colG.match(/^(\d+)/);
        if (numMatch) {
          mst = numMatch[1];
          tenSt = colG.substring(numMatch[1].length).replace(/^[\s\-_]+/, '').trim();
        }
      }

      // Extract Kênh (Col F) from first 3 chars of tenSt
      const colF = tenSt ? tenSt.substring(0, 3) : '';

      return [mst, tenSt, colC, colD, colE, colF, colG].join('\t');
    }

    // CASE 2: User pasted 5 columns (Tỉnh Mới, Tỉnh Cũ, BOSS, Kênh, MST - Tên ST)
    if (cells.length === 5) {
      const colC = cells[0] || '';
      const colD = cells[1] || '';
      const colE = cells[2] || '';
      const colF = cells[3] || '';
      const colG = cells[4] || '';

      const lowerC = colC.toLowerCase();
      const lowerE = colE.toLowerCase();
      const lowerG = colG.toLowerCase();
      if (lineIdx === 0 && (lowerC.includes('tỉnh') || lowerE.includes('boss') || lowerG.includes('mst') || lowerG.includes('siêu thị'))) {
        return ['MST', 'SIÊU THỊ', colC || 'TỈNH MỚI', colD || 'TỈNH CŨ', colE || 'BOSS', colF || 'KÊNH', colG || 'MST - TÊN SIÊU THỊ'].join('\t');
      }

      let mst = '';
      let tenSt = colG;
      const dashIdx = colG.indexOf('-');
      if (dashIdx !== -1) {
        mst = colG.substring(0, dashIdx).trim();
        tenSt = colG.substring(dashIdx + 1).trim();
      } else {
        const numMatch = colG.match(/^(\d+)/);
        if (numMatch) {
          mst = numMatch[1];
          tenSt = colG.substring(numMatch[1].length).replace(/^[\s\-_]+/, '').trim();
        }
      }

      return [mst, tenSt, colC, colD, colE, colF, colG].join('\t');
    }

    // CASE 3: User pasted 7+ columns (already formatted or includes Col A & B)
    if (cells.length >= 7) {
      let colA = cells[0] || '';
      let colB = cells[1] || '';
      const colG = cells[6] || '';
      if ((!colA || colA === '-') && colG) {
        const dashIdx = colG.indexOf('-');
        if (dashIdx !== -1) {
          colA = colG.substring(0, dashIdx).trim();
          colB = colG.substring(dashIdx + 1).trim();
        }
      }
      return [colA, colB, cells[2] || '', cells[3] || '', cells[4] || '', cells[5] || '', colG].join('\t');
    }

    return cells.join('\t');
  }).join('\n');
};

const parseNum = (str: any): number => {
  if (str === null || str === undefined) return 0;
  let s = str.toString().trim();
  if (s.includes(',')) {
    s = s.replace(/,/g, '');
  }
  const clean = s.replace(/ /g, '').replace(/[^0-9.-]/g, '');
  return parseFloat(clean) || 0;
};

const formatLuyKeValue = (val: number, rawStr?: string, isBillionScale?: boolean): string => {
  if (val === null || val === undefined) return '0';
  let normalizedVal = val;
  let wasScaledDown = false;
  const hasThreeDecimals = rawStr ? /\.\d{3}$/.test(rawStr.trim()) : false;
  const shouldMultiply = isBillionScale && (normalizedVal < 10 && !hasThreeDecimals && !wasScaledDown);
  const valueInMillions = shouldMultiply ? normalizedVal * 1000 : normalizedVal;
  const rounded = Math.round(valueInMillions);
  return rounded.toLocaleString('en-US');
};

const DEFAULT_CATEGORIES = DEFAULT_TNB_LEADER_CATEGORIES;

export function detectCategoryGroup(name: string, existingList?: { name: string, group: string }[]): 'ICT' | 'DỊCH VỤ' | 'CE' {
  if (!name) return 'CE';
  
  // 1. First check against known list / defaults
  const listToCheck = existingList && existingList.length > 0 ? existingList : DEFAULT_TNB_LEADER_CATEGORIES;
  const cleanName = cleanCategoryName(name);
  const found = listToCheck.find(c => cleanCategoryName(c.name) === cleanName);
  if (found) {
    const g = (found.group || '').toUpperCase();
    if (g.includes('ICT')) return 'ICT';
    if (g.includes('DỊCH VỤ') || g.includes('DICH VU') || g === 'DV') return 'DỊCH VỤ';
    return 'CE';
  }
  
  // 2. Fuzzy match against known list
  const fuzzy = listToCheck.find(c => {
    const cleanCfg = cleanCategoryName(c.name);
    return (cleanCfg.length > 3 && cleanName.includes(cleanCfg)) || (cleanName.length > 3 && cleanCfg.includes(cleanName));
  });
  if (fuzzy) {
    const g = (fuzzy.group || '').toUpperCase();
    if (g.includes('ICT')) return 'ICT';
    if (g.includes('DỊCH VỤ') || g.includes('DICH VU') || g === 'DV') return 'DỊCH VỤ';
    return 'CE';
  }

  // 3. Keyword-based matching
  const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim();
  if (
    clean.includes('credit') || clean.includes('shinhan') || clean.includes('finance') ||
    clean.includes('vi tra sau') || clean.includes('cake') || clean.includes('ngan hang') ||
    clean.includes('vpbank') || clean.includes('tpbank') || clean.includes('the tin dung') ||
    clean.includes('bao hiem') || clean.includes('sim') || clean.includes('vas') ||
    clean.includes('tra cham') || clean.includes('vay tien') || clean.includes('nap rut') ||
    clean.includes('dich vu') || clean.includes('mango') || clean.includes('icallme') ||
    clean.includes('icall')
  ) {
    return 'DỊCH VỤ';
  }

  if (
    clean.includes('dien thoai') || clean.includes('smartphone') || clean.includes('tablet') ||
    clean.includes('vivo') || clean.includes('realme') || clean.includes('phu kien') ||
    clean.includes('dong ho') || clean.includes('camera') || clean.includes('pin du phong') ||
    clean.includes('pin sac') || clean.includes('sac du phong') || clean.includes('cap - sac') ||
    clean.includes('cap sac') || clean.includes('tai nghe') || clean.includes('bluetooth') ||
    clean.includes('laptop') || clean.includes('macbook') || clean === 'loa' || clean.startsWith('loa ') ||
    clean.includes('am thanh') || clean.includes('audio')
  ) {
    return 'ICT';
  }

  return 'CE';
}

export function extractCategoriesFromRawInput(raw: string): string[] {
  if (!raw) return [];

  // 1. Normalize string for marker detection (remove tone marks, uppercase, convert đ/Đ to d)
  const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toUpperCase();

  // Find "DON VI"
  let startPos = -1;
  const donViRegex = /\bDON\s*VI\b/g;
  let match: RegExpExecArray | null;
  while ((match = donViRegex.exec(norm)) !== null) {
    startPos = match.index + match[0].length;
  }
  if (startPos === -1) {
    const idx = norm.indexOf('DON VI');
    if (idx !== -1) startPos = idx + 6;
  }

  if (startPos !== -1) {
    const subNorm = norm.substring(startPos);
    let endPosInSub = -1;
    const endMarkers = [
      /\bMIEN\s+NAM\b/,
      /\bMIEN\s+BAC\b/,
      /\bMIEN\s+TRUNG\b/,
      /\bMIEN\s+TAY\b/,
      /\bMIEN\s+DONG\b/,
      /\bTOAN\s+CONG\s+TY\b/
    ];
    for (const regex of endMarkers) {
      const endMatch = regex.exec(subNorm);
      if (endMatch) {
        if (endPosInSub === -1 || endMatch.index < endPosInSub) {
          endPosInSub = endMatch.index;
        }
      }
    }

    let chunk = '';
    if (endPosInSub !== -1) {
      chunk = raw.substring(startPos, startPos + endPosInSub);
    } else {
      const percentMatch = /[\r\n]\s*[\d,.-]+%/.exec(subNorm);
      if (percentMatch) {
        chunk = raw.substring(startPos, startPos + percentMatch.index);
      } else {
        chunk = raw.substring(startPos);
      }
    }

    const rawTokens = chunk.split(/[\r\n\t]+/).map(t => t.trim()).filter(Boolean);
    const junkPatterns = [
      /^[\d\s,.\-+/%:()]+$/,
      /^(Tải lại|Xuất Excel|Xuất theo mẫu|Chép link|Chép bảng|Toàn công ty|Danh sách|Ma trận|Lũy kế|Realtime|Toggle theme|employee|Dashboards|Miền|Vùng|Khu vực|Siêu thị|Ngành hàng|Chọn)$/i
    ];

    const extracted = rawTokens.filter(token => {
      if (token.length <= 1) return false;
      for (const pat of junkPatterns) {
        if (pat.test(token)) return false;
      }
      const tokenNorm = token.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toUpperCase();
      if (tokenNorm === 'DON VI' || tokenNorm === 'MIEN NAM' || tokenNorm === 'MIEN BAC') return false;
      return true;
    });

    if (extracted.length > 0) return extracted;
  }

  // 2. Fallback: line-by-line scanning
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const clean = lines[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toUpperCase();
    if (clean === 'DON VI' || clean.endsWith('DON VI') || clean.startsWith('DON VI\t')) {
      startIdx = i + 1;
      break;
    }
  }

  if (startIdx !== -1) {
    let endIdx = lines.length;
    for (let i = startIdx; i < lines.length; i++) {
      const l = lines[i];
      const clean = l.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toUpperCase();
      if (
        clean.startsWith('MIEN ') || clean === 'MIEN' || clean === 'MIEN NAM' || clean === 'MIEN BAC' ||
        clean === 'MIEN TRUNG' || clean === 'MIEN TAY' || clean === 'MIEN DONG' || clean === 'TOAN CONG TY' ||
        /^[\d,.-]+%$/.test(l) || /^[\d,.-]+$/.test(l)
      ) {
        endIdx = i;
        break;
      }
    }
    const extracted = lines.slice(startIdx, endIdx).filter(l => {
      if (/^[\d\s,.\-+/%:()]+$/.test(l)) return false;
      if (/^(Tải lại|Xuất Excel|Xuất theo mẫu|Chép link|Chép bảng|Toàn công ty|Danh sách|Ma trận|Lũy kế|Realtime)$/i.test(l)) return false;
      return true;
    });
    if (extracted.length > 0) return extracted;
  }

  return [];
}

export function isKnownGroupKeyword(g: string): boolean {
  if (!g) return false;
  const upper = g.trim().toUpperCase();
  return upper === 'ICT' || upper === 'CE' || upper === 'DV' || upper === 'DỊCH VỤ' || upper === 'DICH VU';
}

export function parseGroupKeyword(g: string): 'ICT' | 'DỊCH VỤ' | 'CE' {
  if (!g) return 'CE';
  const upper = g.trim().toUpperCase();
  if (upper.includes('ICT')) return 'ICT';
  if (upper.includes('DỊCH VỤ') || upper.includes('DICH VU') || upper === 'DV') return 'DỊCH VỤ';
  return 'CE';
}

export function parseCategoryInput(raw: string, existingList?: { name: string, group: string }[]): { name: string, group: 'ICT' | 'DỊCH VỤ' | 'CE' }[] {
  if (!raw || !raw.trim()) return [];

  // 1. Check if raw BI dashboard report (containing "ĐƠN VỊ" / "DON VI" ... "MIỀN NAM" / "MIEN")
  const biCategories = extractCategoriesFromRawInput(raw);
  if (biCategories.length > 0) {
    return biCategories.map(name => ({
      name,
      group: detectCategoryGroup(name, existingList)
    }));
  }

  // 2. Check if 2-column Excel vertical format (line-by-line where line has tab and 2nd column is known group)
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 1) {
    const tabLines = lines.filter(l => l.includes('\t'));
    if (tabLines.length > 0 && tabLines.every(l => {
      const parts = l.split('\t').map(p => p.trim());
      return parts.length === 2 && isKnownGroupKeyword(parts[1]);
    })) {
      return lines.map(l => {
        const parts = l.split('\t').map(p => p.trim());
        return {
          name: parts[0],
          group: parseGroupKeyword(parts[1])
        };
      }).filter(c => c.name.length > 0);
    }
  }

  // 3. Horizontal tab separated or multi-line tab separated (e.g. copied horizontal table headers or row of categories)
  if (raw.includes('\t')) {
    const tokens = raw.split(/[\t\r\n]+/).map(t => t.trim()).filter(t => t.length > 0);
    const valid = tokens.filter(t => 
      !isKnownGroupKeyword(t) && 
      !['#', 'STT', 'NGÀNH HÀNG', 'NHÓM', 'TÊN NGÀNH HÀNG'].includes(t.toUpperCase())
    );
    if (valid.length > 0) {
      return valid.map(name => ({
        name,
        group: detectCategoryGroup(name, existingList)
      }));
    }
  }

  // 4. Separated by 2 or more spaces or other delimiters (; or |)
  if (/\s{2,}/.test(raw) || raw.includes(';') || raw.includes('|')) {
    const tokens = raw.split(/[\n\r]+|\s{2,}|[;|]/).map(t => t.trim()).filter(t => t.length > 0);
    const valid = tokens.filter(t => 
      !isKnownGroupKeyword(t) && 
      !['#', 'STT', 'NGÀNH HÀNG', 'NHÓM', 'TÊN NGÀNH HÀNG'].includes(t.toUpperCase())
    );
    if (valid.length > 1) {
      return valid.map(name => ({
        name,
        group: detectCategoryGroup(name, existingList)
      }));
    }
  }

  // 5. Multi-line vertical text (each line is a category name, possibly with group suffix like "Máy giặt CE")
  if (lines.length > 1) {
    return lines.map(line => {
      const upper = line.toUpperCase();
      let group: 'ICT' | 'DỊCH VỤ' | 'CE' = 'CE';
      let name = line;
      if (upper.endsWith(' ICT')) {
        group = 'ICT';
        name = line.substring(0, line.length - 4).trim();
      } else if (upper.endsWith(' DỊCH VỤ') || upper.endsWith(' DICH VU')) {
        group = 'DỊCH VỤ';
        name = line.substring(0, line.length - 8).trim();
      } else if (upper.endsWith(' DV')) {
        group = 'DỊCH VỤ';
        name = line.substring(0, line.length - 3).trim();
      } else if (upper.endsWith(' CE')) {
        group = 'CE';
        name = line.substring(0, line.length - 3).trim();
      } else {
        group = detectCategoryGroup(line, existingList);
      }
      return { name, group };
    }).filter(c => c.name.length > 0);
  }

  // 6. Single-line space-delimited fallback matching against dictionary (DEFAULT_TNB_LEADER_CATEGORIES)
  const singleLine = raw.trim();
  const listToCheck = existingList && existingList.length > 0 ? existingList : DEFAULT_TNB_LEADER_CATEGORIES;
  const foundOccurrences: { index: number; length: number; name: string; group: 'ICT' | 'DỊCH VỤ' | 'CE' }[] = [];
  const lowerInput = singleLine.toLowerCase();

  for (const cat of listToCheck) {
    const lowerName = cat.name.toLowerCase();
    let idx = 0;
    while ((idx = lowerInput.indexOf(lowerName, idx)) !== -1) {
      foundOccurrences.push({
        index: idx,
        length: cat.name.length,
        name: cat.name,
        group: detectCategoryGroup(cat.name, existingList)
      });
      idx += lowerName.length;
    }
  }

  if (foundOccurrences.length >= 3) {
    foundOccurrences.sort((a, b) => a.index - b.index);
    const nonOverlapping: { name: string; group: 'ICT' | 'DỊCH VỤ' | 'CE' }[] = [];
    let lastEnd = -1;
    for (const occ of foundOccurrences) {
      if (occ.index >= lastEnd) {
        nonOverlapping.push({ name: occ.name, group: occ.group });
        lastEnd = occ.index + occ.length;
      }
    }
    if (nonOverlapping.length > 0) {
      return nonOverlapping;
    }
  }

  // Single item fallback
  return [{ name: singleLine, group: detectCategoryGroup(singleLine, existingList) }];
}

export default function TnbLeader({ pageMaintenanceState = {}, isUser43751Local = false }: { pageMaintenanceState?: Record<string, boolean>, isUser43751Local?: boolean }) {
  const { userProfile } = useAuth();
  const { showNotification } = useNotification();
  
  const isUser43751Only = isUser43751Local || 
                          String(userProfile?.username || '').trim() === '43751' || 
                          String(userProfile?.ma_nhan_vien || '').trim() === '43751' || 
                          String(userProfile?.user_id || '').trim() === '43751';

  const isAuthorizedAdmin = isUser43751Only || 
                            ['43751', '7611'].includes(String(userProfile?.username || '').trim()) || 
                            ['43751', '7611'].includes(String(userProfile?.ma_nhan_vien || '').trim()) || 
                            ['43751', '7611'].includes(String(userProfile?.user_id || '').trim());

  const isUser43751 = isAuthorizedAdmin;

  // Dual-Engine Mode (V2 is now the Official Standard Engine for all users)
  const [useV2Engine, setUseV2Engine] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('TNB_LEADER_V2_MODE');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const isV2Active = useV2Engine;

  const [sheetUrl, setSheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataVungPivot, setDataVungPivot] = useState<any[]>([]);
  const [dataSieuThiPivot, setDataSieuThiPivot] = useState<any[]>([]);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAutoCopied, setIsAutoCopied] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const rtTableRef = useRef<HTMLDivElement>(null);
  const lkTableRef = useRef<HTMLDivElement>(null);
  const chiTietTableRef = useRef<HTMLDivElement>(null);
  const xepHangTableRef = useRef<HTMLDivElement>(null);
  const khoTableRef = useRef<HTMLDivElement>(null);
  const tgdTableRef = useRef<HTMLDivElement>(null);
  const dmxTableRef = useRef<HTMLDivElement>(null);
  const vungScorecardRef = useRef<HTMLDivElement>(null);
  
  const exportImage = async (customRef?: React.RefObject<HTMLDivElement> | any) => {
    const targetRef = (customRef && customRef.current) ? customRef : tableRef;
    if (targetRef.current) {
      setIsExporting(true);
      try {
        showNotification('Đang tạo ảnh 4K siêu tốc...', 'info');
        
        // ★ Ensure UTM Avo font is fully loaded before export
        await ensureFontsReady();
        
        // Temporarily hide scrollbars and export buttons for cleaner export
        const styleEl = document.createElement('style');
        styleEl.id = 'hide-scrollbar-temp';
        styleEl.innerHTML = `
          *::-webkit-scrollbar { display: none !important; }
          * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
          .export-btn, .export-btn * { display: none !important; visibility: hidden !important; opacity: 0 !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
        `;
        document.head.appendChild(styleEl);

        // Temporarily expand container for snapshot
        const originalWidth = targetRef.current.style.width;
        const originalHeight = targetRef.current.style.height;
        const originalMaxHeight = targetRef.current.style.maxHeight;
        const originalOverflow = targetRef.current.style.overflow;
        const originalPosition = targetRef.current.style.position;
        const originalPadding = targetRef.current.style.padding;
        const originalBg = targetRef.current.style.backgroundColor;
        const originalDisplay = targetRef.current.style.display;

        targetRef.current.style.width = 'max-content';
        targetRef.current.style.height = 'max-content';
        targetRef.current.style.maxHeight = 'none';
        targetRef.current.style.overflow = 'hidden';
        targetRef.current.style.position = 'relative';
        targetRef.current.style.padding = '32px';
        targetRef.current.style.backgroundColor = '#ffffff';
        targetRef.current.style.display = 'inline-block';
        
        // Instant micro-yield for DOM reflow
        await new Promise(r => requestAnimationFrame(r));
        
        // Calculate optimal pixelRatio for 4K Ultra-HD resolution (200-300 DPI)
        const elemWidth = targetRef.current.offsetWidth || targetRef.current.scrollWidth || 1200;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const pixelRatio = isMobile 
          ? Math.min(2.5, Math.max(2, 3200 / elemWidth)) 
          : Math.min(3, Math.max(2, 3840 / elemWidth));

        const imgData = await htmlToImage.toPng(targetRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: pixelRatio,
          quality: 1.0,
          cacheBust: false,
          skipFonts: false,
          filter: (node: any) => {
            if (node?.classList?.contains('export-btn') || node?.closest?.('.export-btn')) return false;
            return true;
          },
          style: {
            fontFamily: "'UTM Avo', 'Inter', sans-serif",
            transform: 'scale(1)',
            transformOrigin: 'top left',
            overflow: 'hidden',
            boxShadow: 'none',
            filter: 'none',
            backdropFilter: 'none',
            textShadow: 'none',
            ...EXPORT_FONT_STYLE,
          }
        });
        
        // Restore style
        targetRef.current.style.width = originalWidth;
        targetRef.current.style.height = originalHeight;
        targetRef.current.style.maxHeight = originalMaxHeight;
        targetRef.current.style.overflow = originalOverflow;
        targetRef.current.style.position = originalPosition;
        targetRef.current.style.padding = originalPadding;
        targetRef.current.style.backgroundColor = originalBg;
        targetRef.current.style.display = originalDisplay;
        
        // Tự động sao chép ảnh vào Clipboard (Hỗ trợ PC & Laptop chuẩn W3C)
        const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        let autoCopiedSuccess = false;
        if (!isMob) {
          try {
            const arr = imgData.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime || 'image/png' });

            if (navigator.clipboard && window.ClipboardItem) {
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              autoCopiedSuccess = true;
              showNotification('🎉 ĐÃ TỰ ĐỘNG COPY ẢNH 4K! Nhấn Ctrl+V để Dán vào Zalo / Line', 'success');
            }
          } catch (clipErr) {
            console.warn('Auto clipboard write prevented by browser:', clipErr);
            autoCopiedSuccess = false;
            showNotification('Tạo ảnh 4K thành công! Nhấp vào "COPY ẢNH" để sao chép', 'info');
          }
        } else {
          showNotification('Tạo ảnh 4K thành công! Chạm giữ ảnh để Sao chép hoặc bấm "Chia sẻ Zalo"', 'success');
        }

        setIsAutoCopied(autoCopiedSuccess);
        setPreviewImage(imgData);
      } catch (err) {
        console.error('Lỗi khi tạo ảnh:', err);
        showNotification('Lỗi khi xuất ảnh', 'error');
      } finally {
        document.getElementById('hide-scrollbar-temp')?.remove();
        setIsExporting(false);
      }
    }
  };

  const exportImageShort = async (customRef?: React.RefObject<HTMLDivElement> | any) => {
    const targetRef = (customRef && customRef.current) ? customRef : tableRef;
    if (targetRef.current) {
      setIsExporting(true);
      try {
        showNotification('Đang tạo ảnh rút gọn 4K siêu tốc...', 'info');
        
        // ★ Ensure UTM Avo font is fully loaded before export
        await ensureFontsReady();
        
        // Temporarily hide scrollbars and export buttons for cleaner export
        const styleEl = document.createElement('style');
        styleEl.id = 'hide-scrollbar-temp';
        styleEl.innerHTML = `
          *::-webkit-scrollbar { display: none !important; }
          * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
          .export-btn, .export-btn * { display: none !important; visibility: hidden !important; opacity: 0 !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
        `;
        document.head.appendChild(styleEl);
        
        targetRef.current.classList.add('export-short-mode');
        const originalWidth = targetRef.current.style.width;
        const originalHeight = targetRef.current.style.height;
        const originalMaxHeight = targetRef.current.style.maxHeight;
        const originalOverflow = targetRef.current.style.overflow;
        const originalPosition = targetRef.current.style.position;
        const originalPadding = targetRef.current.style.padding;
        const originalBg = targetRef.current.style.backgroundColor;
        const originalDisplay = targetRef.current.style.display;

        targetRef.current.style.width = 'max-content';
        targetRef.current.style.height = 'max-content';
        targetRef.current.style.maxHeight = 'none';
        targetRef.current.style.overflow = 'hidden';
        targetRef.current.style.position = 'relative';
        targetRef.current.style.padding = '32px';
        targetRef.current.style.backgroundColor = '#ffffff';
        targetRef.current.style.display = 'inline-block';
        
        // Instant micro-yield for DOM reflow
        await new Promise(r => requestAnimationFrame(r));
        
        // Calculate optimal pixelRatio for 4K Ultra-HD resolution (200-300 DPI)
        const elemWidth = targetRef.current.offsetWidth || targetRef.current.scrollWidth || 1200;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const pixelRatio = isMobile 
          ? Math.min(2.5, Math.max(2, 3200 / elemWidth)) 
          : Math.min(3, Math.max(2, 3840 / elemWidth));

        const imgData = await htmlToImage.toPng(targetRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: pixelRatio,
          quality: 1.0,
          cacheBust: false,
          skipFonts: false,
          filter: (node: any) => {
            if (node?.classList?.contains('export-btn') || node?.closest?.('.export-btn')) return false;
            return true;
          },
          style: {
            fontFamily: "'UTM Avo', 'Inter', sans-serif",
            transform: 'scale(1)',
            transformOrigin: 'top left',
            overflow: 'hidden',
            ...EXPORT_FONT_STYLE,
          }
        });
        
        targetRef.current.style.width = originalWidth;
        targetRef.current.style.height = originalHeight;
        targetRef.current.style.maxHeight = originalMaxHeight;
        targetRef.current.style.overflow = originalOverflow;
        targetRef.current.style.position = originalPosition;
        targetRef.current.style.padding = originalPadding;
        targetRef.current.style.backgroundColor = originalBg;
        targetRef.current.style.display = originalDisplay;
        targetRef.current.classList.remove('export-short-mode');
        
        // Tự động sao chép ảnh vào Clipboard (Hỗ trợ PC & Laptop chuẩn W3C)
        const isMobShort = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        let autoCopiedShortSuccess = false;
        if (!isMobShort) {
          try {
            const arr = imgData.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime || 'image/png' });

            if (navigator.clipboard && window.ClipboardItem) {
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              autoCopiedShortSuccess = true;
              showNotification('🎉 ĐÃ TỰ ĐỘNG COPY ẢNH RÚT GỌN 4K! Nhấn Ctrl+V để Dán vào Zalo / Line', 'success');
            }
          } catch (clipErr) {
            console.warn('Auto clipboard write prevented by browser:', clipErr);
            autoCopiedShortSuccess = false;
            showNotification('Tạo ảnh rút gọn 4K thành công! Nhấp vào "COPY ẢNH" để sao chép', 'info');
          }
        } else {
          showNotification('Tạo ảnh rút gọn 4K thành công! Chạm giữ ảnh để Sao chép hoặc bấm "Chia sẻ Zalo"', 'success');
        }

        setIsAutoCopied(autoCopiedShortSuccess);
        setPreviewImage(imgData);
      } catch (err) {
        console.error('Lỗi khi tạo ảnh rút gọn:', err);
        showNotification('Lỗi khi xuất ảnh rút gọn', 'error');
      } finally {
        document.getElementById('hide-scrollbar-temp')?.remove();
        setIsExporting(false);
      }
    }
  };
  
  const DEFAULT_10_HEADERS = [
    'COL1',
    'COL2',
    'COL3',
    'COL4',
    'COL5',
    'COL6',
    'COL7',
    'COL8',
    'COL9',
    'COL10'
  ];

  const [dataRtSieuThi, setDataRtSieuThi] = useState<any[]>([]);
  const [headersRtSieuThi, setHeadersRtSieuThi] = useState<string[]>(DEFAULT_10_HEADERS);
  const [dataLkSieuThi, setDataLkSieuThi] = useState<any[]>([]);
  const [headersLkSieuThi, setHeadersLkSieuThi] = useState<string[]>(DEFAULT_10_HEADERS);

  const [activeTab, setActiveTabRaw] = useState<'TONG' | 'VUNG' | 'NHOM_HANG' | 'SIEU_THI' | 'RT_SIEU_THI' | 'LK_SIEU_THI' | 'CAU_HINH' | 'CAP_NHAT_DATA'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      const valid = ['TONG', 'VUNG', 'NHOM_HANG', 'SIEU_THI', 'RT_SIEU_THI', 'LK_SIEU_THI', 'CAU_HINH', 'CAP_NHAT_DATA'];
      if (urlTab && valid.includes(urlTab)) return urlTab as any;
      const saved = localStorage.getItem('crm_active_tnbleader_tab');
      if (saved && valid.includes(saved)) return saved as any;
    } catch {}
    return 'TONG';
  });

  const setActiveTab = (tab: 'TONG' | 'VUNG' | 'NHOM_HANG' | 'SIEU_THI' | 'RT_SIEU_THI' | 'LK_SIEU_THI' | 'CAU_HINH' | 'CAP_NHAT_DATA') => {
    setActiveTabRaw(tab);
    try {
      localStorage.setItem('crm_active_tnbleader_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };
  const [lastSync, setLastSync] = useState<string | null>(() => {
    try { return localStorage.getItem('TNB_LEADER_LAST_SYNC') || null; } catch { return null; }
  });
  const [lastSyncSource, setLastSyncSource] = useState<string>(() => {
    try { return localStorage.getItem('TNB_LEADER_LAST_SYNC_SOURCE') || 'ADMIN'; } catch { return 'ADMIN'; }
  });
  const [dbHash, setDbHash] = useState<string | null>(null);
  const [tnbDataMode, setTnbDataMode] = useState<'realtime' | 'luyke'>('realtime');
  const [hoveredPivotCol, setHoveredPivotCol] = useState<number | null>(null);
  const [selectedNhomHangList, setSelectedNhomHangList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('TNB_LEADER_SELECTED_NHOM_HANG');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved nhom hang:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      if (selectedNhomHangList && selectedNhomHangList.length > 0) {
        localStorage.setItem('TNB_LEADER_SELECTED_NHOM_HANG', JSON.stringify(selectedNhomHangList));
      }
    } catch (e) {
      console.warn('Error saving nhom hang:', e);
    }
  }, [selectedNhomHangList]);
  const [cardComments, setCardComments] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('TNB_LEADER_CARD_COMMENTS');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [cardShowComment, setCardShowComment] = useState<Record<string, boolean>>({});
  const [cardKenhOverrides, setCardKenhOverrides] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('TNB_LEADER_CARD_KENH_OVERRIDES');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const normalized: Record<string, string[]> = {};
          Object.keys(parsed).forEach(k => {
            if (Array.isArray(parsed[k])) normalized[k] = parsed[k];
            else if (typeof parsed[k] === 'string') normalized[k] = [parsed[k]];
          });
          return normalized;
        }
      }
    } catch {}
    return {};
  });
  const [openNhDropdownFor, setOpenNhDropdownFor] = useState<string | null>(null);
  const [nhPopoverSearchTerm, setNhPopoverSearchTerm] = useState('');
  const [openKenhDropdownFor, setOpenKenhDropdownFor] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('TNB_LEADER_CARD_COMMENTS', JSON.stringify(cardComments));
    } catch {}
  }, [cardComments]);

  useEffect(() => {
    try {
      localStorage.setItem('TNB_LEADER_CARD_KENH_OVERRIDES', JSON.stringify(cardKenhOverrides));
    } catch {}
  }, [cardKenhOverrides]);

  const individualCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const searchedRowsRef = useRef<any[]>([]);
  const vungCategoriesRef = useRef<string[]>([]);
  const vungPivotMapRef = useRef<any>({});

  // VÙNG Remark / Feedback Modal States (Matches visual design in screenshot 1)
  const [showVungFeedbackModal, setShowVungFeedbackModal] = useState(false);
  const [vungFeedbackTemplate, setVungFeedbackTemplate] = useState<'mau1' | 'mau2'>('mau2');
  const [vungFeedbackTagMode, setVungFeedbackTagMode] = useState<'user' | 'sieuthi' | 'all'>('user');
  const [vungFeedbackCustomText, setVungFeedbackCustomText] = useState<string | null>(null);
  const [vungFeedbackCopied, setVungFeedbackCopied] = useState(false);

  // SIÊU THỊ Remark / Feedback Modal States
  const [showSieuThiFeedbackModal, setShowSieuThiFeedbackModal] = useState(false);
  const [sieuThiFeedbackTemplate, setSieuThiFeedbackTemplate] = useState<'mau1' | 'mau2'>('mau2');
  const [sieuThiFeedbackTagMode, setSieuThiFeedbackTagMode] = useState<'user' | 'sieuthi' | 'all'>('user');
  const [sieuThiFeedbackCustomText, setSieuThiFeedbackCustomText] = useState<string | null>(null);
  const [sieuThiFeedbackCopied, setSieuThiFeedbackCopied] = useState(false);

  // CATEGORY / NHÓM HÀNG Remark / Feedback Modal States (Matches visual design in Hình 2)
  const [activeCategoryFeedback, setActiveCategoryFeedback] = useState<{
    catName: string;
    tableData: any[];
    totalTarget: number;
    totalReal: number;
    totalHt: number;
    kenhTitle: string;
  } | null>(null);
  const [catFeedbackTemplate, setCatFeedbackTemplate] = useState<'mau1' | 'mau2'>('mau2');
  const [catFeedbackTagMode, setCatFeedbackTagMode] = useState<'user' | 'sieuthi' | 'all'>('user');
  const [catFeedbackCustomText, setCatFeedbackCustomText] = useState<string | null>(null);
  const [catFeedbackCopied, setCatFeedbackCopied] = useState(false);

  const generateCategoryFeedback = (
    template: 'mau1' | 'mau2',
    tagMode: 'user' | 'sieuthi' | 'all',
    info: {
      catName: string;
      tableData: any[];
      totalTarget: number;
      totalReal: number;
      totalHt: number;
      kenhTitle: string;
    }
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} NGÀY ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const { catName, tableData, totalTarget, totalReal, totalHt, kenhTitle } = info;
    if (!tableData || tableData.length === 0) {
      return `⚡ TÓM TẮT KẾT QUẢ THI ĐUA NGÀNH ${catName.toUpperCase()} - ${timeStr}\n━━━━━━━━━━━━━━\nChưa có dữ liệu thi đua.`;
    }

    // Sort by %HT descending
    const sorted = [...tableData].sort((a, b) => (b.ht || 0) - (a.ht || 0));
    const passedCount = sorted.filter(r => (r.ht || 0) >= 100).length;
    const totalCount = sorted.length;
    const passedRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(0) : '0';

    const top3 = sorted.slice(0, 3);
    const bot3 = sorted.slice(-3).reverse();

    if (template === 'mau2') {
      // MẪU 2: Tóm tắt Ngành hàng (Top/Bot Tỉnh) - Chỉ lấy tên tỉnh
      return `⚡ TÓM TẮT KẾT QUẢ THI ĐUA NGÀNH ${catName.toUpperCase()} (${kenhTitle}) - ${timeStr}
━━━━━━━━━━━━━━
📊 KẾT QUẢ TOÀN VÙNG: ${passedCount} / ${totalCount} Tỉnh đạt chỉ tiêu (${passedRate}%)

🏆 TOP 3 TỈNH DẪN ĐẦU:
${top3.map((r, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} #${i + 1} ${r.tinh}`).join('\n')}

⚠️ BOT 3 TỈNH CẦN TĂNG TỐC:
${bot3.map((r, i) => `🔻 #${totalCount - i} ${r.tinh}`).join('\n')}
━━━━━━━━━━━━━━
👉 Đề nghị các Tỉnh bám sát, tập trung đẩy mạnh ngành ${catName.toUpperCase()} để về đích xuất sắc! 💪🏼🔥`;
    } else {
      // MẪU 1: Xếp hạng Tỉnh (TOP/BOT)
      const topCount = Math.min(5, Math.ceil(totalCount / 2));
      const topRows = sorted.slice(0, topCount);
      const botRows = sorted.slice(topCount);

      return `🔥 BẢNG XẾP HẠNG THI ĐUA NGÀNH ${catName.toUpperCase()} (${kenhTitle}) - ${timeStr}
━━━━━━━━━━━━━━
🏆 TOP TỈNH DẪN ĐẦU:
${topRows.map((r, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} #${i + 1} ${r.tinh}: Thực đạt ${Math.round(r.real || 0).toLocaleString('vi-VN')} / Target ${Math.round(r.target || 0).toLocaleString('vi-VN')} (${(r.ht || 0).toFixed(0)}%)`).join('\n')}

⚠️ BOT TỈNH CẦN TĂNG TỐC:
${botRows.map((r, i) => `🔻 #${topCount + i + 1} ${r.tinh}: Thực đạt ${Math.round(r.real || 0).toLocaleString('vi-VN')} / Target ${Math.round(r.target || 0).toLocaleString('vi-VN')} (${(r.ht || 0).toFixed(0)}%)`).join('\n')}
━━━━━━━━━━━━━━
👉 Đề nghị các Tỉnh bám sát, tập trung đẩy mạnh ngành ${catName.toUpperCase()} để về đích xuất sắc! 💪🏼🔥`;
    }
  };

  const generateSieuThiFeedback = (
    template: 'mau1' | 'mau2',
    tagMode: 'user' | 'sieuthi' | 'all',
    rows: any[],
    categoriesList: string[],
    filterTinh: string,
    filterKenh: string[]
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} NGÀY ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const kenhInfo = filterKenh.length === 0 ? 'TẤT CẢ KÊNH' : `KÊNH ${filterKenh.join(', ')}`;
    const scopeInfo = filterTinh ? `TỈNH ${filterTinh.toUpperCase()} (${kenhInfo})` : `TOÀN VÙNG (${kenhInfo})`;

    if (!rows || rows.length === 0) {
      return `⚡ TÓM TẮT KẾT QUẢ THI ĐUA SIÊU THỊ ${scopeInfo} - ${timeStr}\n━━━━━━━━━━━━━━\nChưa có dữ liệu thi đua siêu thị.`;
    }

    const totalStores = rows.length;
    const totalCatsCount = categoriesList.length || 38;
    
    // Top & Bot Stores
    const topCount = Math.min(5, Math.ceil(totalStores * 0.2) || 1);
    const botCount = Math.min(5, Math.ceil(totalStores * 0.2) || 1);
    
    const topStores = rows.slice(0, topCount);
    const botStores = rows.slice(-botCount).reverse();

    const goodStoresCount = rows.filter(r => (r.tyLe || 0) >= 50).length;
    const goodRate = totalStores > 0 ? ((goodStoresCount / totalStores) * 100).toFixed(0) : '0';

    const getBossTag = (r: any): string => {
      let rawBoss = (r.boss || '').toString().trim();
      if (!rawBoss || rawBoss === '-' || !rawBoss.trim()) {
        return '';
      }

      const clean = rawBoss.trim();
      if (clean.startsWith('@')) return clean;

      const parts = clean.split('_');
      const lastPart = parts[parts.length - 1].trim();
      if (/^\d+$/.test(lastPart)) {
        return `@${lastPart}`;
      }

      const matchDigits = clean.match(/(\d{4,8})/);
      if (matchDigits) {
        return `@${matchDigits[1]}`;
      }

      if (/^\d+$/.test(clean)) {
        return `@${clean}`;
      }

      return `@${clean.replace(/\s+/g, '_')}`;
    };

    const formatStoreLine = (r: any, rankNumber: number, medal: string, isTemplate2: boolean) => {
      const bossTag = getBossTag(r);
      const storeName = `${r.prov}${r.tinh ? ` (${r.tinh})` : ''}`;
      
      if (isTemplate2) {
        if (tagMode === 'user') {
          const displayTarget = bossTag || storeName;
          return `${medal} #${rankNumber} ${displayTarget}`;
        } else if (tagMode === 'sieuthi') {
          return `${medal} #${rankNumber} ${storeName}`;
        } else {
          const displayTarget = bossTag ? `${storeName} ${bossTag}` : storeName;
          return `${medal} #${rankNumber} ${displayTarget}`;
        }
      } else {
        const scoreStr = `: ${r.datCount} / ${r.effectiveTotalCats || totalCatsCount} (${r.tyLe ? r.tyLe.toFixed(0) : 0}%)`;
        if (tagMode === 'user') {
          const displayTarget = bossTag || storeName;
          return `${medal} #${rankNumber} ${displayTarget}${scoreStr}`;
        } else if (tagMode === 'sieuthi') {
          return `${medal} #${rankNumber} ${storeName}${scoreStr}`;
        } else {
          const displayTarget = bossTag ? `${storeName} (${bossTag})` : storeName;
          return `${medal} #${rankNumber} ${displayTarget}${scoreStr}`;
        }
      }
    };

    if (template === 'mau2') {
      return `⚡ TÓM TẮT KẾT QUẢ THI ĐUA SIÊU THỊ ${scopeInfo} - ${timeStr}
━━━━━━━━━━━━━━
📊 KẾT QUẢ TOÀN BẢNG: ${goodStoresCount} / ${totalStores} Siêu thị đạt ≥ 50% ngành hàng (${goodRate}%)

🏆 TOP SIÊU THỊ DẪN ĐẦU:
${topStores.map((r, i) => formatStoreLine(r, i + 1, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '✨', true)).join('\n')}

⚠️ BOT SIÊU THỊ CẦN TĂNG TỐC:
${botStores.map((r, i) => formatStoreLine(r, totalStores - i, '🔻', true)).join('\n')}
━━━━━━━━━━━━━━
👉 Đề nghị các Quản lý & Siêu thị bám sát, tập trung đẩy mạnh các ngành hàng trọng điểm để về đích xuất sắc! 💪🏼🔥`;
    } else {
      const halfCount = Math.min(10, Math.ceil(totalStores / 2));
      const topHalf = rows.slice(0, halfCount);
      const botHalf = rows.slice(halfCount);

      return `🔥 BẢNG XẾP HẠNG THI ĐUA SIÊU THỊ ${scopeInfo} - ${timeStr}
━━━━━━━━━━━━━━
🏆 TOP SIÊU THỊ DẪN ĐẦU:
${topHalf.map((r, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '✨'} #${i + 1} ${r.prov}${r.tinh ? ` (${r.tinh})` : ''}: ${r.datCount} / ${r.effectiveTotalCats || totalCatsCount} (${r.tyLe ? r.tyLe.toFixed(0) : 0}%)`).join('\n')}

⚠️ BOT SIÊU THỊ CẦN TĂNG TỐC:
${botHalf.map((r, i) => `🔻 #${halfCount + i + 1} ${r.prov}${r.tinh ? ` (${r.tinh})` : ''}: ${r.datCount} / ${r.effectiveTotalCats || totalCatsCount} (${r.tyLe ? r.tyLe.toFixed(0) : 0}%)`).join('\n')}
━━━━━━━━━━━━━━
👉 Đề nghị các Quản lý & Siêu thị bám sát, tập trung đẩy mạnh các ngành hàng trọng điểm để về đích xuất sắc! 💪🏼🔥`;
    }
  };

  const generateVungFeedback = (
    template: 'mau1' | 'mau2',
    tagMode: 'user' | 'sieuthi' | 'all',
    rows: any[],
    categoriesList: string[],
    pivotData: any
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} NGÀY ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    if (!rows || rows.length === 0) {
      return `⚡ TÓM TẮT KẾT QUẢ THI ĐUA TỈNH TNB - ${timeStr}\n━━━━━━━━━━━━━━\nChưa có dữ liệu thi đua.`;
    }

    // Top 3 & Bot 3
    const top3 = rows.slice(0, 3);
    const bot3 = rows.slice(-3).reverse();

    // Whole region stats
    let totalTargetVal = 0;
    let totalActualVal = 0;
    let reachedCatsCount = 0;

    categoriesList.forEach(cat => {
      let catTarget = 0;
      let catActual = 0;
      Object.keys(pivotData || {}).forEach(prov => {
        const item = pivotData[prov]?.[cat];
        if (item) {
          catTarget += (item.target || 0);
          catActual += (item.dtlk || 0);
        }
      });
      totalTargetVal += catTarget;
      totalActualVal += catActual;
      if (catTarget > 0 && catActual >= catTarget) {
        reachedCatsCount++;
      }
    });

    const totalCatsCount = categoriesList.length || 25;
    const vungRate = totalCatsCount > 0 ? ((reachedCatsCount / totalCatsCount) * 100).toFixed(0) : '0';

    const formatNum = (n: number) => {
      if (!n || isNaN(n)) return '0';
      return Math.round(n).toLocaleString('vi-VN');
    };

    if (template === 'mau2') {
      // MẪU 2: Tóm tắt Vùng (Top/Bot Tỉnh) - Chuẩn theo mẫu yêu cầu
      return `⚡ TÓM TẮT KẾT QUẢ THI ĐUA TỈNH TNB - ${timeStr}
━━━━━━━━━━━━━━
📊 KẾT QUẢ TOÀN VÙNG: ${reachedCatsCount} / ${totalCatsCount} ngành hàng đạt (${vungRate}%)

🏆 TOP 3 TỈNH DẪN ĐẦU:
${top3.map((r, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} #${i + 1} ${r.prov}: ${r.datCount} / ${r.effectiveTotalCats || totalCatsCount} (${r.tyLe.toFixed(0)}%)`).join('\n')}

⚠️ BOT 3 TỈNH CẦN TĂNG TỐC:
${bot3.map((r, i) => `🔻 #${rows.length - i} ${r.prov}: ${r.datCount} / ${r.effectiveTotalCats || totalCatsCount} (${r.tyLe.toFixed(0)}%)`).join('\n')}
━━━━━━━━━━━━━━
👉 Đề nghị các Tỉnh bám sát, tập trung đẩy mạnh các ngành hàng trọng điểm để về đích xuất sắc! 💪🏼🔥`;
    } else {
      // MẪU 1: Xếp hạng Tỉnh (TOP/BOT)
      const topCount = Math.min(5, Math.ceil(rows.length / 2));
      const topRows = rows.slice(0, topCount);
      const botRows = rows.slice(topCount);

      return `🔥 BẢNG XẾP HẠNG THI ĐUA TỈNH TNB - ${timeStr}
━━━━━━━━━━━━━━
🏆 TOP TỈNH DẪN ĐẦU:
${topRows.map((r, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '✨'} #${i + 1} ${r.prov}: ${r.datCount} / ${r.effectiveTotalCats || totalCatsCount} (${r.tyLe.toFixed(0)}%)`).join('\n')}

⚠️ BOT TỈNH CẦN TĂNG TỐC:
${botRows.map((r, i) => `🔻 #${topCount + i + 1} ${r.prov}: ${r.datCount} / ${r.effectiveTotalCats || totalCatsCount} (${r.tyLe.toFixed(0)}%)`).join('\n')}
━━━━━━━━━━━━━━
👉 Đề nghị các Tỉnh bám sát, tập trung đẩy mạnh các ngành hàng trọng điểm để về đích xuất sắc! 💪🏼🔥`;
    }
  };

  // Loading & Sync Progress Modal State (Matches visual design in screenshot)
  const [isSyncingModal, setIsSyncingModal] = useState(false);
  const [syncModalTitle, setSyncModalTitle] = useState('ĐANG ĐỒNG BỘ NỀN FIREBASE');
  const [syncModalStep, setSyncModalStep] = useState('☁️ 3. Đang lưu giữ liệu & đồng bộ hệ thống Firebase Database...');
  const [syncModalProgress, setSyncModalProgress] = useState(88);
  const [syncModalFooter, setSyncModalFooter] = useState('Tiến trình xử lý & Đồng bộ Firebase');

  // BOSS Modal Viewer States
  const [showBossModal, setShowBossModal] = useState(false);
  const [bossModalSearch, setBossModalSearch] = useState('');
  const [bossModalPage, setBossModalPage] = useState(1);

  // Category Configuration State (Tab CẤU HÌNH)
  const [categoryConfig, setCategoryConfig] = useState<{name: string, group: string}[]>(DEFAULT_CATEGORIES);
  const [categoryConfigText, setCategoryConfigText] = useState(() => 
    DEFAULT_CATEGORIES.map(c => `${c.name}\t${c.group}`).join('\n')
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<{name: string, group: string}[]>(DEFAULT_CATEGORIES);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // One-time cached read (shared cache key with useCategoryConfig.ts) instead of a
  // permanent onSnapshot — see src/services/cachedFirestore.ts. Short TTL since this
  // page is also where the config gets edited (own edits refresh via setCachedDoc
  // right after save, so the shorter TTL here only affects picking up OTHER admins'
  // concurrent edits).
  const loadTnbLeaderConfig = React.useCallback((force = false) => {
    getCachedDoc<any>('app_settings', 'TNB_LEADER_DATA', force ? 0 : 5 * 60 * 1000).then((data) => {
      if (!data) return;
      if (data.categories && Array.isArray(data.categories)) {
        setCategoryConfig(data.categories);
        setPreviewConfig(data.categories);
        const text = data.categories.map((c: any) => `${c.name}\t${c.group}`).join('\n');
        setCategoryConfigText(text);
      }
      if (data.updated_at) {
        setLastSync(data.updated_at);
      }
      if (data.updated_source) {
        setLastSyncSource(data.updated_source);
      } else {
        setLastSyncSource('ADMIN');
      }
    });
  }, []);

  useEffect(() => {
    loadTnbLeaderConfig(false);
  }, [loadTnbLeaderConfig]);

  // Raw Data State for CAP_NHAT_DATA (Synced via Firestore with GZIP & Local Cache)
  const rawTimestampsRef = useRef<Record<string, string>>({});

  const [tnbRawData, setTnbRawData] = useState(() => {
    try {
      const cached = localStorage.getItem('TNB_LEADER_RAW_CACHE');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      rt_vung: '',
      rt_st: '',
      lk_vung: '',
      lk_st: '',
      ds_boss: '',
    };
  });

  // Attach raw listeners ONLY when V2 is active (0 reads / 0 listeners for general users)
  useEffect(() => {
    if (!isV2Active) return;

    const fieldKeys = ['rt_vung', 'rt_st', 'lk_vung', 'lk_st', 'ds_boss'] as const;
    
    // Listen to dedicated field documents with chunk resolution & timestamp caching
    const unsubs = fieldKeys.map(field => {
      const docKey = FIELD_DOC_KEYS[field];
      return onSnapshot(doc(db, 'app_settings', `TNB_RAW_${docKey}`), async (snapshot) => {
        if (snapshot.exists()) {
          const d = snapshot.data();
          const docUpdatedAt = d.updated_at || '';

          // Cache Hit: If timestamp is identical to our local cache, skip fetching parts & decompression!
          if (docUpdatedAt && rawTimestampsRef.current[field] === docUpdatedAt) {
            return;
          }

          const decompressed = await loadRawFieldFromFirestore(field, d);
          rawTimestampsRef.current[field] = docUpdatedAt;
          try {
            localStorage.setItem('TNB_LEADER_RAW_TIMESTAMPS', JSON.stringify(rawTimestampsRef.current));
          } catch {}

          setTnbRawData(prev => {
            const updated = { ...prev, [field]: decompressed };
            try { localStorage.setItem('TNB_LEADER_RAW_CACHE', JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      });
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [isV2Active]);

  // Memoized BOSS lookup map: Match Cột G (Index 6) with Cột E (Index 4) from CẬP NHẬT DANH SÁCH BOSS
  const bossLookupMap = useMemo(() => {
    if (!tnbRawData.ds_boss || !tnbRawData.ds_boss.trim()) return new Map<string, string>();
    const map = new Map<string, string>();
    const rawLines = tnbRawData.ds_boss.split('\n').filter(l => l.trim().length > 0);
    const isTab = rawLines[0]?.includes('\t');

    for (const line of rawLines) {
      const cells = isTab ? line.split('\t').map(c => c.trim()) : parseCSVLine(line).map(c => c.trim());
      // Col E = Index 4, Col G = Index 6
      const colE = cells[4] || '';
      const colG = cells[6] || '';
      if (colG) {
        map.set(colG.toLowerCase().trim(), colE);
        const cleanG = colG.toLowerCase().replace(/[\s\-_]/g, '');
        if (cleanG) map.set(cleanG, colE);

        const codeMatch = colG.match(/^(\d+)/);
        if (codeMatch) {
          map.set(`code_${codeMatch[1]}`, colE);
        }
      }
    }
    return map;
  }, [tnbRawData.ds_boss]);

  // Parse all raw BOSS rows for viewing
  const parsedBossRows = useMemo(() => {
    if (!tnbRawData.ds_boss || !tnbRawData.ds_boss.trim()) return [];
    const rawLines = tnbRawData.ds_boss.split('\n').filter(l => l.trim().length > 0);
    if (rawLines.length === 0) return [];
    const isTab = rawLines[0].includes('\t');
    return rawLines.map(line => {
      if (isTab) return line.split('\t').map(c => c.trim());
      return parseCSVLine(line).map(c => c.trim());
    });
  }, [tnbRawData.ds_boss]);

  const filteredBossRows = useMemo(() => {
    if (!bossModalSearch.trim()) return parsedBossRows;
    const q = bossModalSearch.toLowerCase().trim();
    return parsedBossRows.filter(row => row.some(cell => (cell || '').toLowerCase().includes(q)));
  }, [parsedBossRows, bossModalSearch]);

  const bossRowsPerPage = 50;
  const totalBossPages = Math.ceil(filteredBossRows.length / bossRowsPerPage);
  const paginatedBossRows = useMemo(() => {
    const start = (bossModalPage - 1) * bossRowsPerPage;
    return filteredBossRows.slice(start, start + bossRowsPerPage);
  }, [filteredBossRows, bossModalPage]);

  // Memoized Fast Category Lookup Map (O(1) lookups instead of 1,000,000 array searches across 24k rows)
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    const allCats = [...DEFAULT_CATEGORIES, ...previewConfig, ...categoryConfig];
    for (const cat of allCats) {
      if (cat.name) {
        map.set(cat.name.trim().toLowerCase(), cat.name.trim());
      }
    }
    return map;
  }, [categoryConfig, previewConfig]);

  // High-performance memoized parser for rt_st (runs 0ms on tab switches & rerenders)
  const parsedRtStRows = useMemo(() => {
    if (!isV2Active || !tnbRawData.rt_st || !tnbRawData.rt_st.trim()) return [];

    try {
      const rawLines = tnbRawData.rt_st.split('\n').filter(l => l.trim().length > 0);
      if (rawLines.length === 0) return [];

      const activeCategories = categoryConfig.length > 0 ? categoryConfig : DEFAULT_CATEGORIES;
      const parsed = rawLines.map(line => splitSmartLine(line, activeCategories));

      if (parsed.length === 0) return [];

      // Tìm dòng tiêu đề báo cáo BI thực sự (bỏ qua toàn bộ header/navigation/pills phía trên)
      const headerRowIndex = parsed.findIndex(row => {
        if (row.length < 3) return false;
        const rowStr = row.join(' ').toLowerCase();
        return (
          (rowStr.includes('target') && (rowStr.includes('dt') || rowStr.includes('%') || rowStr.includes('xếp hạng') || rowStr.includes('xep hang'))) ||
          rowStr.includes('dtlk') || 
          rowStr.includes('dt realtime') || 
          (rowStr.includes('% ht') && rowStr.includes('target'))
        );
      });

      let dataRows: string[][] = [];
      if (headerRowIndex !== -1) {
        dataRows = parsed.slice(headerRowIndex);
      } else {
        dataRows = parsed;
      }

      // Cố định đúng 10 cột cho mỗi dòng dữ liệu và trích xuất COL7, COL8, COL9, COL10
      let currentActiveCategory = '';

      return dataRows.map((r) => {
        const row10 = Array.from({ length: 10 }, (_, i) => r[i] || '');
        
        // COL1 (Index 0): So sánh với Tab CẤU HÌNH (O(1) Map Lookup)
        const col1Val = (row10[0] || '').trim();
        const col1Lower = col1Val.toLowerCase();

        // Nếu COL1 là dòng "Hỗ trợ BI..." thì đặt COL10 = '-' và ngắt lan truyền ngành hàng
        if (col1Lower.includes('hỗ trợ bi') || col1Lower.includes('ho tro bi')) {
          currentActiveCategory = '';
          row10[9] = '-';
        } else {
          if (col1Val && col1Val !== '-') {
            const matchedCat = categoryMap.get(col1Lower);
            if (matchedCat) {
              currentActiveCategory = matchedCat;
            }
          }

          // COLD10 (Index 9) = Dòng ngành hàng trùng khớp, các dòng bên dưới giống dòng trên cho đến khi có dòng mới
          row10[9] = currentActiveCategory || '-';
        }

        // COL7 (Index 6) = COL2 (Index 1) chỉ lấy phần sau dấu "-" đầu tiên
        // Ví dụ: "2399 - ĐMM_CMA_DDO - Đường 19/" => "ĐMM_CMA_DDO - Đường 19/"
        const col2Val = row10[1] || '';
        let storeCode = '';
        if (col2Val && col2Val !== '-') {
          const dashIdx = col2Val.indexOf('-');
          if (dashIdx !== -1) {
            storeCode = col2Val.substring(0, dashIdx).trim();
            row10[6] = col2Val.substring(dashIdx + 1).trim();
          } else {
            row10[6] = col2Val.trim();
          }
        }

        // COL8 (Index 7) = COL7 (Index 6) chỉ lấy 3 ký tự đầu (Kênh: ĐMM, ĐMS, ĐML, TGD,...)
        // Ví dụ: "ĐMM_CMA_DDO - Đường 19/" => "ĐMM"
        const col7Val = row10[6] || '';
        if (col7Val && col7Val !== '-') {
          row10[7] = col7Val.trim().substring(0, 3);
        }

        // COL9 (Index 8) = COL2 so sánh với Cột G trong "CẬP NHẬT DANH SÁCH BOSS" => hiển thị Cột E (O(1) Map Lookup)
        if (col2Val && col2Val !== '-') {
          const col2Lower = col2Val.toLowerCase().trim();
          const bossValue = bossLookupMap.get(col2Lower) || 
                            (storeCode ? bossLookupMap.get(`code_${storeCode}`) : undefined);
          
          if (bossValue) {
            row10[8] = bossValue;
          }
        }
        
        return row10;
      });
    } catch (err) {
      console.error('[V2] Error parsing rt_st data:', err);
      return [];
    }
  }, [isV2Active, tnbRawData.rt_st, bossLookupMap, categoryMap, categoryConfig]);

  // Realtime Supermarket Data Source (V2 uses parsed CAP_NHAT_DATA, V1 uses Google Sheet)
  const effectiveDataRtSieuThi = useMemo(() => {
    return isV2Active ? parsedRtStRows : dataRtSieuThi;
  }, [isV2Active, parsedRtStRows, dataRtSieuThi]);

  // High-performance memoized parser for lk_st (LUỸ KẾ SIÊU THỊ from CAP_NHAT_DATA)
  const parsedLkStRows = useMemo(() => {
    if (!isV2Active || !tnbRawData.lk_st || !tnbRawData.lk_st.trim()) return [];

    try {
      const rawLines = tnbRawData.lk_st.split('\n').filter(l => l.trim().length > 0);
      if (rawLines.length === 0) return [];

      const activeCategories = categoryConfig.length > 0 ? categoryConfig : DEFAULT_CATEGORIES;
      const parsed = rawLines.map(line => splitSmartLine(line, activeCategories));

      if (parsed.length === 0) return [];

      // Tìm dòng tiêu đề báo cáo BI thực sự (bỏ qua toàn bộ header/navigation/pills phía trên)
      const headerRowIndex = parsed.findIndex(row => {
        if (row.length < 3) return false;
        const rowStr = row.join(' ').toLowerCase();
        return (
          (rowStr.includes('target') && (rowStr.includes('dt') || rowStr.includes('%') || rowStr.includes('xếp hạng') || rowStr.includes('xep hang'))) ||
          rowStr.includes('dtlk') || 
          rowStr.includes('dt realtime') || 
          (rowStr.includes('% ht') && rowStr.includes('target'))
        );
      });

      let dataRows: string[][] = [];
      if (headerRowIndex !== -1) {
        dataRows = parsed.slice(headerRowIndex);
      } else {
        dataRows = parsed;
      }

      // Cố định đúng 10 cột cho mỗi dòng dữ liệu và trích xuất COL7, COL8, COL9, COL10
      let currentActiveCategory = '';

      return dataRows.map((r) => {
        const row10 = Array.from({ length: 10 }, (_, i) => r[i] || '');
        
        // COL1 (Index 0): So sánh với Tab CẤU HÌNH (O(1) Map Lookup)
        const col1Val = (row10[0] || '').trim();
        const col1Lower = col1Val.toLowerCase();

        // Nếu COL1 là dòng "Hỗ trợ BI..." thì đặt COL10 = '-' và ngắt lan truyền ngành hàng
        if (col1Lower.includes('hỗ trợ bi') || col1Lower.includes('ho tro bi')) {
          currentActiveCategory = '';
          row10[9] = '-';
        } else {
          if (col1Val && col1Val !== '-') {
            const matchedCat = categoryMap.get(col1Lower);
            if (matchedCat) {
              currentActiveCategory = matchedCat;
            }
          }

          // COLD10 (Index 9) = Dòng ngành hàng trùng khớp, các dòng bên dưới giống dòng trên cho đến khi có dòng mới
          row10[9] = currentActiveCategory || '-';
        }

        // COL7 (Index 6) = COL2 (Index 1) chỉ lấy phần sau dấu "-" đầu tiên
        // Ví dụ: "2399 - ĐMM_CMA_DDO - Đường 19/" => "ĐMM_CMA_DDO - Đường 19/"
        const col2Val = row10[1] || '';
        let storeCode = '';
        if (col2Val && col2Val !== '-') {
          const dashIdx = col2Val.indexOf('-');
          if (dashIdx !== -1) {
            storeCode = col2Val.substring(0, dashIdx).trim();
            row10[6] = col2Val.substring(dashIdx + 1).trim();
          } else {
            row10[6] = col2Val.trim();
          }
        }

        // COL8 (Index 7) = COL7 (Index 6) chỉ lấy 3 ký tự đầu (Kênh: ĐMM, ĐMS, ĐML, TGD,...)
        // Ví dụ: "ĐMM_CMA_DDO - Đường 19/" => "ĐMM"
        const col7Val = row10[6] || '';
        if (col7Val && col7Val !== '-') {
          row10[7] = col7Val.trim().substring(0, 3);
        }

        // COL9 (Index 8) = COL2 so sánh với Cột G trong "CẬP NHẬT DANH SÁCH BOSS" => hiển thị Cột E (O(1) Map Lookup)
        if (col2Val && col2Val !== '-') {
          const col2Lower = col2Val.toLowerCase().trim();
          const bossValue = bossLookupMap.get(col2Lower) || 
                            (storeCode ? bossLookupMap.get(`code_${storeCode}`) : undefined);
          
          if (bossValue) {
            row10[8] = bossValue;
          }
        }
        
        return row10;
      });
    } catch (err) {
      console.error('[V2] Error parsing lk_st data:', err);
      return [];
    }
  }, [isV2Active, tnbRawData.lk_st, bossLookupMap, categoryMap, categoryConfig]);

  // Legacy V1 Luỹ Kế Siêu Thị mapping from Google Sheet
  const dataLkSieuThiMapped = useMemo(() => {
    return dataLkSieuThi.map(row => {
      const virtualRow = [];
      virtualRow[0] = (row[0] || '').normalize('NFC'); // Tỉnh (Cột 1)
      virtualRow[1] = '';
      virtualRow[2] = row[2] || ''; // Luỹ Kế (Cột 3)
      virtualRow[3] = row[3] || ''; // Target (Cột 4)
      virtualRow[4] = row[5] || ''; // %HT Dự kiến (Cột 6)
      virtualRow[5] = (row[8] || '').normalize('NFC'); // Kênh (Cột 11)
      virtualRow[6] = (row[7] || '').normalize('NFC'); // Siêu thị (Cột 10)
      virtualRow[7] = (row[8] || '').normalize('NFC'); // Kênh (Cột 11)
      virtualRow[8] = (row[9] || '').normalize('NFC'); // BOSS (Cột 12)
      
      let nganhHang = (row[10] || '').trim().toUpperCase().normalize('NFC');
      if (nganhHang === 'B.HIỂM TTB') {
        nganhHang = 'BẢO HIỂM';
      }
      virtualRow[9] = nganhHang; // Ngành Hàng (Cột 17)
      
      return virtualRow;
    });
  }, [dataLkSieuThi]);

  // Luỹ Kế Supermarket Data Source (V2 uses parsed CAP_NHAT_DATA, V1 uses Google Sheet)
  const effectiveDataLkSieuThi = useMemo(() => {
    return isV2Active ? parsedLkStRows : dataLkSieuThiMapped;
  }, [isV2Active, parsedLkStRows, dataLkSieuThiMapped]);

  // Validation helpers for Realtime vs Luỹ Kế
  const validateRtSt = (val: string): { isValid: boolean; errorMsg?: string } => {
    if (!val || !val.trim()) return { isValid: true };
    const lower = val.toLowerCase();
    const hasTargetNgay = lower.includes('target ngày') || lower.includes('target ngay');
    if (!hasTargetNgay) {
      return {
        isValid: false,
        errorMsg: '⚠️ CẢNH BÁO: Dữ liệu bạn vừa dán KHÔNG PHẢI là dữ liệu REALTIME (Thiếu từ khóa "Target Ngày")!\n\nHệ thống đã tự động xóa trắng ô này để bạn dán lại đúng dữ liệu.'
      };
    }
    return { isValid: true };
  };

  const validateLkSt = (val: string): { isValid: boolean; errorMsg?: string } => {
    if (!val || !val.trim()) return { isValid: true };
    const lower = val.toLowerCase();
    const hasTargetNgay = lower.includes('target ngày') || lower.includes('target ngay');
    if (hasTargetNgay) {
      return {
        isValid: false,
        errorMsg: '⚠️ CẢNH BÁO: Bạn đang dán nhầm dữ liệu REALTIME vào ô LUỸ KẾ (Dữ liệu có chứa "Target Ngày")!\n\nHệ thống đã tự động xóa trắng ô này để bạn dán lại đúng dữ liệu.'
      };
    }
    const hasLkKeywords = lower.includes('target') || lower.includes('dtlk') || lower.includes('luỹ kế') || lower.includes('luy ke');
    if (!hasLkKeywords) {
      return {
        isValid: false,
        errorMsg: '⚠️ CẢNH BÁO: Dữ liệu bạn vừa dán KHÔNG PHẢI là dữ liệu LUỸ KẾ hợp lệ (Thiếu từ khóa "Target")!\n\nHệ thống đã tự động xóa trắng ô này để bạn dán lại đúng dữ liệu.'
      };
    }
    return { isValid: true };
  };

  const handleSaveRawField = async (field: 'rt_vung' | 'rt_st' | 'lk_vung' | 'lk_st' | 'ds_boss', val: string) => {
    try {
      if (field === 'rt_st') {
        const valRes = validateRtSt(val);
        if (!valRes.isValid) {
          alert(valRes.errorMsg);
          return;
        }
      } else if (field === 'lk_st') {
        const valRes = validateLkSt(val);
        if (!valRes.isValid) {
          alert(valRes.errorMsg);
          return;
        }
      }

      setIsSyncingModal(true);
      setSyncModalTitle('ĐANG ĐỒNG BỘ NỀN FIREBASE');
      setSyncModalStep('⚡ 1. Đang tối ưu nén GZIP dữ liệu lớn...');
      setSyncModalProgress(25);
      setSyncModalFooter('Tiến trình xử lý & Đồng bộ Firebase');

      const nowIso = new Date().toISOString();
      const userLabel = 'ADMIN';
      
      const processedVal = field === 'ds_boss' ? normalizeBossData(val) : val;
      const updated = { ...tnbRawData, [field]: processedVal };
      setTnbRawData(updated);
      setLastSync(nowIso);
      setLastSyncSource(userLabel);
      try {
        localStorage.setItem('TNB_LEADER_RAW_CACHE', JSON.stringify(updated));
        localStorage.setItem('TNB_LEADER_LAST_SYNC', nowIso);
        localStorage.setItem('TNB_LEADER_LAST_SYNC_SOURCE', userLabel);
      } catch {}

      setSyncModalStep('📦 2. Đang phân mảnh và chuẩn bị lưu trữ...');
      setSyncModalProgress(55);

      // Save to dedicated document with multi-part chunking (eliminates all 1MB limit errors)
      await saveRawFieldToFirestore(field, processedVal, userProfile?.username || 'unknown');

      setSyncModalStep('☁️ 3. Đang lưu giữ liệu & đồng bộ hệ thống Firebase Database...');
      setSyncModalProgress(88);

      // Update timestamp in global settings document for real-time header sync
      await setDoc(doc(db, 'app_settings', 'TNB_LEADER_DATA'), {
        updated_at: nowIso,
        updated_by: userProfile?.username || '43751',
        updated_source: userLabel,
      }, { merge: true });
      loadTnbLeaderConfig(true);

      setSyncModalStep('✅ 4. Hoàn tất đồng bộ dữ liệu toàn hệ thống!');
      setSyncModalProgress(100);

      setTimeout(() => {
        setIsSyncingModal(false);
        showNotification('Đã tối ưu lưu trữ dữ liệu lớn thành công!', 'success');
      }, 500);
    } catch (err: any) {
      console.error('Error saving raw field:', err);
      setIsSyncingModal(false);
      showNotification('Lỗi khi lưu dữ liệu: ' + (err.message || ''), 'error');
    }
  };

  const handleExportBackup = () => {
    const backupObj = {
      export_date: new Date().toISOString(),
      source: 'TNB_LEADER',
      version: '1.0',
      ...tnbRawData
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TNB_LEADER_BACKUP_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Đã xuất file Backup (.json) thành công!', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        showNotification('Đang nén và khôi phục Backup...', 'info');
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        const importedData = {
          rt_vung: parsed.rt_vung || '',
          rt_st: parsed.rt_st || '',
          lk_vung: parsed.lk_vung || '',
          lk_st: parsed.lk_st || '',
          ds_boss: parsed.ds_boss || '',
        };
        setTnbRawData(importedData);
        try {
          localStorage.setItem('TNB_LEADER_RAW_CACHE', JSON.stringify(importedData));
        } catch {}

        const fields = ['rt_vung', 'rt_st', 'lk_vung', 'lk_st', 'ds_boss'] as const;
        await Promise.all(fields.map(f => saveRawFieldToFirestore(f, importedData[f], userProfile?.username || 'unknown')));

        showNotification('Đã nhập và khôi phục Backup thành công!', 'success');
      } catch (err: any) {
        console.error('Lỗi nhập file backup:', err);
        showNotification('Lỗi file backup không hợp lệ!', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUploadBossFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const csv = XLSX.utils.sheet_to_csv(ws);
        await handleSaveRawField('ds_boss', csv);
        showNotification(`Đã tải lên file BOSS thành công (${file.name})!`, 'success');
      } catch (err: any) {
        console.error('Lỗi upload file BOSS:', err);
        showNotification('Lỗi khi đọc file BOSS: ' + (err.message || ''), 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const getLineCount = (str: string) => {
    if (!str) return 0;
    return str.split('\n').filter(l => l.trim().length > 0).length;
  };



  const handleCategoryTextChange = (val: string) => {
    setCategoryConfigText(val);
    if (val && val.trim().length > 0) {
      const parsed = parseCategoryInput(val, categoryConfig);
      if (parsed && parsed.length > 0) {
        setPreviewConfig(parsed);
      }
    }
  };

  const handleCategoryPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (text && text.trim()) {
      const isBiReport = extractCategoriesFromRawInput(text).length > 0;
      const parsed = parseCategoryInput(text, categoryConfig);
      if (parsed && parsed.length > 0) {
        setPreviewConfig(parsed);
        if (isBiReport) {
          showNotification(`Đã tự động trích xuất ${parsed.length} ngành hàng nằm dưới ĐƠN VỊ và trên MIỀN NAM!`, 'success');
        } else {
          showNotification(`Bảng bên phải đã tự động nhận diện ${parsed.length} ngành hàng!`, 'info');
        }
      }
    }
  };

  const handleViewAndGroup = () => {
    if (!categoryConfigText || !categoryConfigText.trim()) {
      showNotification('Vui lòng dán dữ liệu vào ô bên trái!', 'error');
      return;
    }

    const parsed = parseCategoryInput(categoryConfigText, categoryConfig);
    if (parsed.length === 0) {
      showNotification('Không tìm thấy ngành hàng hợp lệ trong dữ liệu!', 'error');
      return;
    }

    // Gom nhóm theo thứ tự ICT -> DỊCH VỤ -> CE
    const ict = parsed.filter(c => c.group === 'ICT');
    const dv = parsed.filter(c => c.group === 'DỊCH VỤ');
    const ce = parsed.filter(c => c.group === 'CE');
    const grouped = [...ict, ...dv, ...ce];

    setPreviewConfig(grouped);
    showNotification(`Đã gom nhóm thành công ${grouped.length} ngành hàng (ICT ➔ DỊCH VỤ ➔ CE)!`, 'success');
  };

  const handleUpdateItemName = (index: number, newName: string) => {
    setPreviewConfig(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], name: newName };
      }
      return copy;
    });
  };

  const handleUpdateItemGroup = (index: number, newGroup: string) => {
    setPreviewConfig(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], group: newGroup };
      }
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setPreviewConfig(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItem = () => {
    setPreviewConfig(prev => [...prev, { name: 'Ngành hàng mới', group: 'CE' }]);
  };

  const handleSortByGroup = () => {
    const ict = previewConfig.filter(c => c.group === 'ICT');
    const dv = previewConfig.filter(c => c.group === 'DỊCH VỤ');
    const ce = previewConfig.filter(c => c.group === 'CE');
    setPreviewConfig([...ict, ...dv, ...ce]);
    showNotification('Đã sắp xếp thứ tự gom nhóm: ICT ➔ DỊCH VỤ ➔ CE!', 'info');
  };

  const handleResetDefaultCategories = () => {
    if (window.confirm('Khôi phục danh mục 35 ngành hàng mặc định theo chuẩn TNB Leader?')) {
      setPreviewConfig(DEFAULT_CATEGORIES);
      setCategoryConfigText(DEFAULT_CATEGORIES.map(c => `${c.name}\t${c.group}`).join('\n'));
      showNotification('Đã khôi phục 35 ngành hàng mặc định!', 'info');
    }
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _previewConfig = [...previewConfig];
      const draggedItemContent = _previewConfig.splice(dragItem.current, 1)[0];
      _previewConfig.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setPreviewConfig(_previewConfig);
    }
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const _previewConfig = [...previewConfig];
    const temp = _previewConfig[index - 1];
    _previewConfig[index - 1] = _previewConfig[index];
    _previewConfig[index] = temp;
    setPreviewConfig(_previewConfig);
  };

  const moveItemDown = (index: number) => {
    if (index === previewConfig.length - 1) return;
    const _previewConfig = [...previewConfig];
    const temp = _previewConfig[index + 1];
    _previewConfig[index + 1] = _previewConfig[index];
    _previewConfig[index] = temp;
    setPreviewConfig(_previewConfig);
  };

  const handleSaveCategoryConfig = async () => {
    if (previewConfig.length === 0) {
      showNotification('Danh sách ngành hàng trống, không thể lưu!', 'error');
      return;
    }
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'app_settings', 'TNB_LEADER_DATA'), { categories: previewConfig }, { merge: true });
      loadTnbLeaderConfig(true);
      setCategoryConfigText(previewConfig.map(c => `${c.name}\t${c.group}`).join('\n'));
      showNotification('Lưu cấu hình ngành hàng thành công vào toàn bộ hệ thống!', 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      showNotification('Lỗi khi lưu cấu hình. Vui lòng thử lại!', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCopyNhanXet = () => {
    const rows = searchedRowsRef.current || [];
    const under50 = rows.filter(r => r.tyLe < 50);
    if (under50.length === 0) {
      showNotification('Không có siêu thị nào tỷ lệ dưới 50% trong danh sách hiện tại!', 'error');
      return;
    }
    
    let text = '🚨 DANH SÁCH SIÊU THỊ CÓ TỶ LỆ DƯỚI 50%:\n\n';
    
    const userIds = under50.map(r => {
      const bossParts = (r.boss || '').split('_');
      return bossParts.length > 1 ? bossParts[bossParts.length - 1] : r.boss;
    }).filter(id => id);
    
    const uniqueUserIds = Array.from(new Set(userIds));
    text += uniqueUserIds.map(id => `@${id}`).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Đã copy danh sách nhận xét vào khay nhớ tạm!', 'success');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      showNotification('Không thể copy text, vui lòng thử lại.', 'error');
    });
  };

  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  // Search & Dedicated Table Testing Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilterCol, setTableFilterCol] = useState<string>('ALL');
  const [tableFilterText, setTableFilterText] = useState<string>('');
  const [tableFilterExact, setTableFilterExact] = useState<boolean>(false);
  
  const getStoreKey = (key: string) => `${key}_${userProfile?.ten_sieu_thi || 'default'}`;

  const [sieuThiFilterTinh, setSieuThiFilterTinh] = useState<string>(() => {
    return localStorage.getItem(getStoreKey('tnb_leader_filter_tinh')) || '';
  });
  
  const [sieuThiFilterKenh, setSieuThiFilterKenh] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(getStoreKey('tnb_leader_filter_kenh'));
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [sieuThiFilterNganhHangList, setSieuThiFilterNganhHangList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(getStoreKey('tnb_leader_filter_nganhhang'));
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isNganhHangDropdownOpen, setIsNganhHangDropdownOpen] = useState(false);

  const [sieuThiFilterNhomList, setSieuThiFilterNhomList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(getStoreKey('tnb_leader_filter_nhom'));
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isNhomDropdownOpen, setIsNhomDropdownOpen] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  
  // Custom Realtime Table filters
  const [rtFilterTinh, setRtFilterTinh] = useState<string>('');
  const [rtFilterKenh, setRtFilterKenh] = useState<string[]>([]);
  const [rtFilterNganhHang, setRtFilterNganhHang] = useState<string>('');
  const [rtFilterKenhXepHang, setRtFilterKenhXepHang] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rtFilterKenhXepHang');
      return saved ? JSON.parse(saved) : ['ĐML'];
    } catch {
      return ['ĐML'];
    }
  });

  useEffect(() => {
    localStorage.setItem('rtFilterKenhXepHang', JSON.stringify(rtFilterKenhXepHang));
  }, [rtFilterKenhXepHang]);
  const [rtFilterTinhXepHang, setRtFilterTinhXepHang] = useState<string>('');
  const [rtKhoFilterNganhHang, setRtKhoFilterNganhHang] = useState<string>(() => {
    try {
      return localStorage.getItem('rtKhoFilterNganhHang') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    localStorage.setItem('rtKhoFilterNganhHang', rtKhoFilterNganhHang);
  }, [rtKhoFilterNganhHang]);

  // Save filters whenever they change
  useEffect(() => {
    localStorage.setItem(getStoreKey('tnb_leader_filter_tinh'), sieuThiFilterTinh);
  }, [sieuThiFilterTinh, userProfile?.ten_sieu_thi]);

  useEffect(() => {
    localStorage.setItem(getStoreKey('tnb_leader_filter_kenh'), JSON.stringify(sieuThiFilterKenh));
  }, [sieuThiFilterKenh, userProfile?.ten_sieu_thi]);

  useEffect(() => {
    localStorage.setItem(getStoreKey('tnb_leader_filter_nganhhang'), JSON.stringify(sieuThiFilterNganhHangList));
  }, [sieuThiFilterNganhHangList, userProfile?.ten_sieu_thi]);

  useEffect(() => {
    localStorage.setItem(getStoreKey('tnb_leader_filter_nhom'), JSON.stringify(sieuThiFilterNhomList));
  }, [sieuThiFilterNhomList, userProfile?.ten_sieu_thi]);

  const [firebaseFiltersLoaded, setFirebaseFiltersLoaded] = useState(false);

  // Load filters from Firebase
  useEffect(() => {
    const loadFilters = async () => {
      if (!userProfile?.username || firebaseFiltersLoaded) return;
      try {
        const docRef = doc(db, 'user_filters', `${userProfile.username}_tnbleader`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.rtFilterTinh !== undefined) setRtFilterTinh(data.rtFilterTinh);
          if (data.rtFilterKenh !== undefined) setRtFilterKenh(Array.isArray(data.rtFilterKenh) ? data.rtFilterKenh : (data.rtFilterKenh ? [data.rtFilterKenh] : []));
          if (data.rtFilterNganhHang !== undefined) setRtFilterNganhHang(data.rtFilterNganhHang);
          
          if (data.sieuThiFilterTinh !== undefined) setSieuThiFilterTinh(data.sieuThiFilterTinh);
          if (data.sieuThiFilterKenh !== undefined) setSieuThiFilterKenh(data.sieuThiFilterKenh);
        }
      } catch (error) {
        console.error("Error loading filters from Firebase:", error);
      } finally {
        setFirebaseFiltersLoaded(true);
      }
    };
    loadFilters();
  }, [userProfile?.username, firebaseFiltersLoaded]);

  // Save filters to Firebase whenever they change
  useEffect(() => {
    const saveFilters = async () => {
      if (!userProfile?.username || !firebaseFiltersLoaded) return;
      try {
        const docRef = doc(db, 'user_filters', `${userProfile.username}_tnbleader`);
        await setDoc(docRef, {
          rtFilterTinh,
          rtFilterKenh,
          rtFilterNganhHang,
          sieuThiFilterTinh,
          sieuThiFilterKenh,
          sieuThiFilterNganhHangList,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving filters to Firebase:", error);
      }
    };
    
    const timeoutId = setTimeout(() => {
      saveFilters();
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [rtFilterTinh, rtFilterKenh, rtFilterNganhHang, sieuThiFilterTinh, sieuThiFilterKenh, sieuThiFilterNganhHangList, userProfile?.username, firebaseFiltersLoaded]);

  const isUser7611 = String(userProfile?.username || '').trim() === '7611' || 
                     String(userProfile?.ma_nhan_vien || '').trim() === '7611' || 
                     String(userProfile?.user_id || '').trim() === '7611';

  useEffect(() => {
    if (isUser7611) {
      setActiveTab('SIEU_THI');
    }
  }, [isUser7611]);

  // Load initial data from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const cacheKey = 'TNB_LEADER_DATA_CACHE';
        const cachedStr = localStorage.getItem(cacheKey);
        let cachedData = null;
        
        if (cachedStr) {
          try {
            const parsed = JSON.parse(cachedStr);
            // Bỏ luôn vụ check 5 phút vì ta luôn gọi fetchDataFromUrl để lấy data mới từ Google Sheet
            cachedData = parsed.data;
          } catch (e) {}
        }

        let dbData = cachedData;

        if (!dbData) {
          const { data, error } = await supabase
            .from('store')
            .select('updated_at, sticker_lk_price_data, sticker_ce_price_data')
            .eq('id', 'TNB_LEADER_DATA')
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error loading TNB Leader data:', error);
            return;
          }
          dbData = data;
          
          if (dbData) {
            localStorage.setItem(cacheKey, JSON.stringify({
              data: dbData,
              timestamp: Date.now()
            }));
          }
        }

        if (dbData && dbData.sticker_lk_price_data) {
          if (isMounted) {
            setSheetUrl(dbData.sticker_lk_price_data);
            setLastSync(dbData.updated_at);
            setDbHash(dbData.sticker_ce_price_data);
            // Auto-fetch data from URL
            fetchDataFromUrl(dbData.sticker_lk_price_data, dbData.sticker_ce_price_data, dbData.updated_at);
          }
        }
      } catch (err) {
        console.error('Failed to load TNB Leader data:', err);
      }
    };
    
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Helper: convert column letter (A, B, ..., Z, AA, AB, ...) to 0-based index
  const colLetterToIndex = (col: string): number => {
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
      idx = idx * 26 + (col.charCodeAt(i) - 64);
    }
    return idx - 1; // 0-based
  };

  // Helper: extract specific columns from parsed data
  const extractColumns = (allHeaders: string[], allData: string[][], colIndices: number[]) => {
    const data = allData.map(row => colIndices.map(i => row[i] || ''));
    return { headers: colIndices.map(i => allHeaders[i] || ''), data };
  };

  const fetchDataFromUrl = async (url: string, currentHash?: string | null, currentLastSync?: string | null) => {
    const sheetId = extractSheetId(url);
    if (!sheetId) return;

    setIsSyncing(true);
    try {
      // Only fetch 1 sheet: "data SIÊU THỊ"
      const resSieuThi = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('data SIÊU THỊ')}`);



      // --- Sheet "data SIÊU THỊ" ---
      if (resSieuThi.ok) {
        const csvST = await resSieuThi.text();
        const newHash = hashString(csvST);
        
        // 1. If we have a known previous hash and it changed
        const isDataChanged = typeof currentHash === 'string' && newHash !== currentHash;
        // 2. If we don't have a known hash (first time setup) for any user
        const isFirstSetup = !currentHash;
        // 3. If we don't have a time for some reason (e.g. old cache or string 'null')
        let actualLastSync = currentLastSync !== undefined ? currentLastSync : lastSync;
        if (actualLastSync === 'null' || actualLastSync === 'undefined') actualLastSync = null;
        
        let isValidDate = false;
        if (actualLastSync) {
          const d = new Date(String(actualLastSync).includes('T') ? String(actualLastSync) : String(actualLastSync).replace(' ', 'T'));
          isValidDate = !isNaN(d.getTime());
        }
        const isMissingTime = !actualLastSync || !isValidDate;

        if (isDataChanged || isFirstSetup || isMissingTime) {
          let newTime = new Date().toISOString();
          
          // Only update the time to NOW if data changed OR if we are completely missing a time
          if (isDataChanged || isMissingTime) {
            setLastSync(newTime);
          } else {
            // Keep the old time if we are just initializing the hash but a time already exists
            newTime = typeof actualLastSync === 'string' ? actualLastSync : newTime;
          }

          if (isUser43751) {
            const record = {
              id: 'TNB_LEADER_DATA',
              ten_sieu_thi: 'Dữ liệu TNB Leader URL',
              warehouse_code: 'GLOBAL',
              sticker_ce_price_data: newHash,
              sticker_lk_price_data: url, 
              updated_by: userProfile?.username || 'unknown',
              updated_at: newTime
            };
            // Upsert in background, ignore error
            supabase.from('store').upsert(record, { onConflict: 'id' }).then().catch(e => console.error(e));
          }
          
          // Save to local cache to ensure it persists on reload even if DB fails
          localStorage.setItem('TNB_LEADER_DATA_CACHE', JSON.stringify({
            data: {
              sticker_ce_price_data: newHash,
              sticker_lk_price_data: url,
              updated_at: newTime
            },
            timestamp: Date.now()
          }));
          
          setDbHash(newHash);
        } else if (!currentHash) {
          // If non-admin and first load, just initialize the local state
          setDbHash(newHash);
        }
        
        const parsed = csvST.split('\n').filter(l => l.trim()).map(line => parseCSVLine(line).map(cell => cell.trim()));
        if (parsed.length > 0) {
          const allHeaders = parsed[0];
          const allData = parsed.slice(1);

          // REALTIME SIÊU THỊ: Ngắt hoàn toàn liên kết Google Sheet khi ở chế độ V2
          if (!isV2Active) {
            const rtSTCols = ['U','V','W','X','Y','Z','AB','AC','AD','AG'].map(colLetterToIndex);
            const rtST = extractColumns(allHeaders, allData, rtSTCols);
            setHeadersRtSieuThi(rtST.headers);
            setDataRtSieuThi(rtST.data);
          }

          // LUỸ KẾ SIÊU THỊ: Ngắt hoàn toàn liên kết Google Sheet khi ở chế độ V2
          if (!isV2Active) {
            const lkSTCols = ['B','C','D','E','F','G','H','K','L','M','R'].map(colLetterToIndex);
            const lkST = extractColumns(allHeaders, allData, lkSTCols);
            setHeadersLkSieuThi(lkST.headers);
            setDataLkSieuThi(lkST.data);
          }



          // VÙNG PIVOT: Cột B (Tỉnh), D (DTLK), E (TARGET), L (Brand), R (Ngành Hàng)
          const vungCols = ['B', 'D', 'E', 'L', 'R'].map(colLetterToIndex);
          const vungPivot = extractColumns(allHeaders, allData, vungCols);
          setDataVungPivot(vungPivot.data);

          // SIÊU THỊ PIVOT: Cột C (Siêu thị), D (DTLK), E (TARGET), L (Brand), R (Ngành Hàng)
          const stCols = ['C', 'D', 'E', 'L', 'R'].map(colLetterToIndex);
          const stPivot = extractColumns(allHeaders, allData, stCols);
          setDataSieuThiPivot(stPivot.data);
        }
      }
    } catch (e) {
      console.error('Auto fetch error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const extractSheetId = (url: string) => {
    const match = url.match(/\/d\/(.*?)(\/|$)/);
    return match ? match[1] : null;
  };

  // Load fresh data directly from TAB CẬP NHẬT DATA / Firebase
  const handleRefreshData = async () => {
    try {
      setIsSyncingModal(true);
      setSyncModalTitle('ĐANG ĐỒNG BỘ NỀN FIREBASE');
      setSyncModalStep('⚡ 1. Đang kết nối máy chủ Firebase...');
      setSyncModalProgress(25);
      setSyncModalFooter('Tiến trình xử lý & Đồng bộ Firebase');

      const fieldKeys = ['rt_vung', 'rt_st', 'lk_vung', 'lk_st', 'ds_boss'] as const;
      setSyncModalStep('📦 2. Đang tải và nạp dữ liệu từ Tab CẬP NHẬT DATA...');
      setSyncModalProgress(55);

      const loadedData: any = {};
      for (let i = 0; i < fieldKeys.length; i++) {
        const field = fieldKeys[i];
        const val = await loadRawFieldFromFirestore(field);
        loadedData[field] = val;
      }

      setSyncModalStep('☁️ 3. Đang cập nhật bộ nhớ đệm và hiển thị báo cáo...');
      setSyncModalProgress(88);

      setTnbRawData(loadedData);
      try {
        localStorage.setItem('TNB_LEADER_RAW_CACHE', JSON.stringify(loadedData));
      } catch {}

      setSyncModalStep('✅ 4. Hoàn tất cập nhật dữ liệu mới!');
      setSyncModalProgress(100);

      setTimeout(() => {
        setIsSyncingModal(false);
        showNotification('Đã nạp dữ liệu mới từ Tab CẬP NHẬT DATA thành công!', 'success');
      }, 400);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setIsSyncingModal(false);
      showNotification('Lỗi khi tải dữ liệu: ' + (err.message || ''), 'error');
    }
  };

  const currentData = useMemo(() => {
    if (activeTab === 'RT_SIEU_THI') {
      return effectiveDataRtSieuThi;
    }
    if (activeTab === 'LK_SIEU_THI') {
      return isV2Active ? parsedLkStRows : dataLkSieuThi;
    }
    if (activeTab === 'SIEU_THI') {
      return tnbDataMode === 'luyke' ? effectiveDataLkSieuThi : effectiveDataRtSieuThi;
    }
    if (activeTab === 'TONG' || activeTab === 'VUNG' || activeTab === 'NHOM_HANG') {
      return tnbDataMode === 'luyke' ? effectiveDataLkSieuThi : (tnbDataMode === 'realtime' ? effectiveDataRtSieuThi : dataVungPivot);
    }
    return [];
  }, [activeTab, isV2Active, parsedLkStRows, effectiveDataRtSieuThi, effectiveDataLkSieuThi, dataLkSieuThi, tnbDataMode, dataVungPivot]);

  const currentHeaders = useMemo(() => {
    return Array.from({ length: 10 }, (_, idx) => `COL${idx + 1}`);
  }, []);

  const filteredData = useMemo(() => {
    let result = currentData;
    const query = tableFilterText.trim().toLowerCase();
    
    if (query) {
      if (tableFilterCol === 'ALL') {
        if (tableFilterExact) {
          result = result.filter(row => row.some((cell: string) => (cell || '').trim().toLowerCase() === query));
        } else {
          result = result.filter(row => row.some((cell: string) => (cell || '').toLowerCase().includes(query)));
        }
      } else {
        const colIdx = parseInt(tableFilterCol, 10);
        if (!isNaN(colIdx)) {
          if (tableFilterExact) {
            result = result.filter(row => (row[colIdx] || '').trim().toLowerCase() === query);
          } else {
            result = result.filter(row => (row[colIdx] || '').toLowerCase().includes(query));
          }
        }
      }
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(row => row.some((cell: string) => (cell || '').toLowerCase().includes(s)));
    }

    return result;
  }, [currentData, tableFilterCol, tableFilterText, tableFilterExact, searchTerm]);

  // Unique values in selected column for quick-pick testing
  const uniqueColValues = useMemo(() => {
    if (tableFilterCol === 'ALL') return [];
    const colIdx = parseInt(tableFilterCol, 10);
    if (isNaN(colIdx)) return [];
    const setVals = new Set<string>();
    currentData.forEach(row => {
      const val = (row[colIdx] || '').trim();
      if (val && val !== '-') setVals.add(val);
    });
    return Array.from(setVals).slice(0, 150);
  }, [currentData, tableFilterCol]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, tableFilterCol, tableFilterText, tableFilterExact]);

  if (pageMaintenanceState['tnbleader'] && !isUser43751Local) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6">
        <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
          <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
            <AlertCircle size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">HỆ THỐNG ĐANG BẢO TRÌ</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Trang này đang trong quá trình bảo trì và nâng cấp. Xin lỗi vì sự bất tiện này!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 relative" style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', 'Inter', sans-serif" }}>
      {/* Centered Professional Loading Overlay & Glassmorphic Card */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-white/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="flex flex-col sm:flex-row items-center gap-4 px-7 py-5 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_rgba(79,70,229,0.25)] border border-indigo-100 ring-8 ring-indigo-500/10 max-w-md text-center sm:text-left"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 animate-spin flex items-center justify-center p-[2.5px] shadow-lg shadow-indigo-500/30">
                  <div className="w-full h-full bg-white rounded-[13px] flex items-center justify-center">
                    <RefreshCw size={22} className="text-indigo-600 animate-spin" />
                  </div>
                </div>
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-600"></span>
                </span>
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-sm sm:text-base font-black text-slate-800 tracking-tight uppercase whitespace-nowrap">
                    ĐANG ĐỒNG BỘ & XỬ LÝ DỮ LIỆU...
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-700 animate-pulse">
                    REALTIME
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500 mt-0.5">
                  Hệ thống đang đồng bộ và xử lý dữ liệu
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-0 w-full max-w-none space-y-2.5">
        {/* UNIFIED SINGLE WHITE CARD: Header, Mode Toggles, Status Badge, Action Button & Tabs (Sticky below main navbar) */}
        <div className="sticky top-[48px] md:top-[56px] z-40 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200 space-y-2.5 transition-all">
          {/* Top Row: Title, Mode Toggles, Status Badge (Unbolded, No Clipping) & Refresh Button */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
                <Database size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">TNB LEADER</h1>
                  <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[12.5px] sm:text-[13.5px] font-black tracking-wide bg-emerald-50 border-2 border-emerald-500 text-emerald-900 shadow-sm">
                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0" strokeWidth={2.5} />
                    <span>
                      {(() => {
                        if (lastSync) {
                          const syncStr = String(lastSync);
                          const safeDateStr = syncStr.includes('T') ? syncStr : syncStr.replace(' ', 'T');
                          const d = new Date(safeDateStr);
                          if (!isNaN(d.getTime())) {
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const h = pad(d.getHours());
                            const m = pad(d.getMinutes());
                            const s = pad(d.getSeconds());
                            const day = pad(d.getDate());
                            const month = pad(d.getMonth() + 1);
                            const year = d.getFullYear();
                            return `DATA ĐÃ ĐƯỢC CẬP NHẬT LÚC ${h}:${m}:${s} NGÀY ${day}/${month}/${year}`;
                          }
                        }
                        const now = new Date();
                        const pad = (n: number) => String(n).padStart(2, '0');
                        return `DATA ĐÃ ĐƯỢC CẬP NHẬT LÚC ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} NGÀY ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
                      })()}
                    </span>
                  </span>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">Dữ liệu nội bộ từ BI / Admin</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setTnbDataMode('realtime')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                      tnbDataMode === 'realtime'
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-800 shadow-sm font-black ring-2 ring-indigo-300'
                        : 'bg-indigo-50/70 border-indigo-200 text-indigo-700 font-bold hover:opacity-100 opacity-60'
                    }`}
                  >
                    <Zap size={15} strokeWidth={2.5} />
                    <span className="text-xs sm:text-sm tracking-wide whitespace-nowrap">REALTIME</span>
                  </button>
                  <button
                    onClick={() => setTnbDataMode('luyke')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                      tnbDataMode === 'luyke'
                        ? 'bg-violet-100 border-violet-400 text-violet-800 shadow-sm font-black ring-2 ring-violet-300'
                        : 'bg-violet-50/70 border-violet-200 text-violet-700 font-bold hover:opacity-100 opacity-60'
                    }`}
                  >
                    <TrendingUp size={15} strokeWidth={2.5} />
                    <span className="text-xs sm:text-sm tracking-wide whitespace-nowrap">LUỸ KẾ</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="flex items-center justify-end shrink-0">
              <button
                onClick={handleRefreshData}
                disabled={isSyncing}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={16} />
                <span className="whitespace-nowrap">CẬP NHẬT DATA MỚI</span>
              </button>
            </div>
          </div>

          {/* Border Separator */}
          <div className="border-t border-slate-100 pt-3">
            {/* Navigation Tabs Bar: Roomy vertical padding to prevent border/text cutoffs */}
            <div className="flex w-full overflow-x-auto hide-scrollbar py-1 px-1 gap-2.5 items-center">
              {[
                { 
                  id: 'TONG', 
                  label: 'TỔNG', 
                  icon: LayoutGrid,
                  activeBg: 'bg-purple-100',
                  activeBorder: 'border-purple-300',
                  inactiveBg: 'bg-purple-50/70',
                  inactiveBorder: 'border-purple-200',
                  textColor: 'text-purple-800'
                },
                { 
                  id: 'VUNG', 
                  label: 'VÙNG', 
                  icon: Globe,
                  activeBg: 'bg-emerald-100',
                  activeBorder: 'border-emerald-300',
                  inactiveBg: 'bg-emerald-50/70',
                  inactiveBorder: 'border-emerald-200',
                  textColor: 'text-emerald-800'
                },
                { 
                  id: 'NHOM_HANG', 
                  label: 'NHÓM HÀNG', 
                  icon: Layers,
                  activeBg: 'bg-teal-100',
                  activeBorder: 'border-teal-300',
                  inactiveBg: 'bg-teal-50/70',
                  inactiveBorder: 'border-teal-200',
                  textColor: 'text-teal-800'
                },
                { 
                  id: 'SIEU_THI', 
                  label: 'SIÊU THỊ', 
                  icon: Store,
                  activeBg: 'bg-rose-100',
                  activeBorder: 'border-rose-300',
                  inactiveBg: 'bg-rose-50/70',
                  inactiveBorder: 'border-rose-200',
                  textColor: 'text-rose-800'
                },
                { 
                  id: 'RT_SIEU_THI', 
                  label: 'REALTIME SIÊU THỊ', 
                  icon: Zap,
                  activeBg: 'bg-blue-100',
                  activeBorder: 'border-blue-300',
                  inactiveBg: 'bg-blue-50/70',
                  inactiveBorder: 'border-blue-200',
                  textColor: 'text-blue-800',
                  only43751: true
                },
                { 
                  id: 'LK_SIEU_THI', 
                  label: 'LUỸ KẾ SIÊU THỊ', 
                  icon: TrendingUp,
                  activeBg: 'bg-fuchsia-100',
                  activeBorder: 'border-fuchsia-300',
                  inactiveBg: 'bg-fuchsia-50/70',
                  inactiveBorder: 'border-fuchsia-200',
                  textColor: 'text-fuchsia-800',
                  only43751: true
                },
                { 
                  id: 'CAU_HINH', 
                  label: 'CẤU HÌNH', 
                  icon: Settings,
                  activeBg: 'bg-amber-100',
                  activeBorder: 'border-amber-300',
                  inactiveBg: 'bg-amber-50/70',
                  inactiveBorder: 'border-amber-200',
                  textColor: 'text-amber-800',
                  adminOnly: true 
                },
                { 
                  id: 'CAP_NHAT_DATA', 
                  label: 'CẬP NHẬT DATA', 
                  icon: Database,
                  activeBg: 'bg-emerald-100',
                  activeBorder: 'border-emerald-300',
                  inactiveBg: 'bg-emerald-50/70',
                  inactiveBorder: 'border-emerald-200',
                  textColor: 'text-emerald-800',
                  adminOnly: true,
                  v2Only: true
                }
              ].filter(tab => (!tab.only43751 || isUser43751Only) && (!tab.adminOnly || isAuthorizedAdmin) && (!tab.v2Only || isV2Active)).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-none items-center gap-2 px-4 sm:px-5 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id 
                      ? `${tab.activeBg} ${tab.activeBorder} ${tab.textColor} shadow-sm font-black ring-2 ring-${tab.activeBorder.split('-')[1]}-300` 
                      : `${tab.inactiveBg} ${tab.inactiveBorder} ${tab.textColor} font-bold hover:opacity-100 opacity-65`
                  }`}
                >
                  <tab.icon size={16} strokeWidth={2.3} />
                  <span className="text-xs sm:text-sm tracking-wide whitespace-nowrap">{tab.label}</span>
                  <Filter size={14} strokeWidth={2} className="ml-0.5 opacity-60" />
                </button>
              ))}
            </div>
          </div>

          {/* Integrated Filters and Actions directly below tabs */}
          {(activeTab === 'SIEU_THI' || activeTab === 'VUNG') && (
            <div className="border-t border-slate-100 pt-4 flex flex-col xl:flex-row items-start xl:items-end justify-between gap-5">
              <div className="flex-1 w-full">
                {activeTab === 'SIEU_THI' && (
                  <div className="flex flex-col gap-4 w-full">
                    {/* Bộ lọc Kênh Tổng */}
                    <div className="w-full">
                      <label className="block text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Bộ lọc Kênh Tổng</label>
                      <div className="flex flex-wrap gap-2">
                        {['ĐML', 'ĐMM', 'ĐMS', 'TGD'].map(k => (
                          <label key={k} className={`flex items-center gap-2 cursor-pointer bg-white px-3.5 py-1.5 border-2 rounded-xl text-xs sm:text-sm font-black transition-all shadow-sm ${sieuThiFilterKenh.includes(k) ? 'border-blue-500 text-blue-700 bg-blue-50/40 shadow-blue-500/10' : 'border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                            <input 
                              type="checkbox" 
                              className={`w-4 h-4 rounded focus:ring-blue-500 cursor-pointer ${sieuThiFilterKenh.includes(k) ? 'text-blue-600 border-blue-500' : 'border-slate-300'}`}
                              checked={sieuThiFilterKenh.includes(k)}
                              onChange={(e) => {
                                if (e.target.checked) setSieuThiFilterKenh([...sieuThiFilterKenh, k]);
                                else setSieuThiFilterKenh(sieuThiFilterKenh.filter(x => x !== k));
                              }}
                            />
                            <span>{k}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Bộ lọc Tỉnh, Nhóm, Ngành Hàng */}
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                      <div className="w-full sm:w-[220px]">
                        <label className="block text-[12px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Bộ lọc Tỉnh</label>
                        <div className="relative">
                          <select 
                            className="w-full px-3.5 py-2 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-xs sm:text-sm font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%231d4ed8%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-no-repeat bg-[position:right_10px_center] pr-8"
                            value={sieuThiFilterTinh}
                            onChange={(e) => setSieuThiFilterTinh(e.target.value)}
                          >
                            <option value="" className="bg-white text-slate-800 font-bold">Tất cả các tỉnh</option>
                            {[
                              'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 
                              'Trà Vinh', 'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 
                              'Bến Tre', 'Đồng Tháp', 'An Giang'
                            ].sort((a, b) => a.localeCompare(b, 'vi')).map(tinh => (
                              <option key={tinh} value={tinh} className="bg-white text-slate-800 font-bold">{tinh}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="w-full sm:w-[250px] relative">
                        <label className="block text-[12px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Bộ Lọc Nhóm</label>
                        <button 
                           type="button"
                           onClick={() => setIsNhomDropdownOpen(!isNhomDropdownOpen)}
                           className="w-full flex items-center justify-between px-3.5 py-2 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-xs sm:text-sm font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                        >
                           <span className="truncate mr-2">{sieuThiFilterNhomList.length > 0 ? `Đã chọn (${sieuThiFilterNhomList.length})` : 'Tất cả các nhóm'}</span>
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        {isNhomDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsNhomDropdownOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col">
                               <div className="p-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
                                 <button 
                                   type="button"
                                   onClick={() => {
                                     const groups = Array.from(new Set(categoryConfig.map(c => c.group).filter(Boolean)));
                                     setSieuThiFilterNhomList(groups);
                                   }}
                                   className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                                 >
                                   Chọn tất cả
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={() => setSieuThiFilterNhomList([])}
                                   className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1"
                                 >
                                   Bỏ chọn
                                 </button>
                               </div>
                               <div className="p-2 max-h-[300px] overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                                 {Array.from(new Set(categoryConfig.map(c => c.group).filter(Boolean))).map(group => (
                                    <label key={group} className="flex items-start gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                      <input 
                                        type="checkbox"
                                        checked={sieuThiFilterNhomList.includes(group)}
                                        onChange={(e) => {
                                          if (e.target.checked) setSieuThiFilterNhomList([...sieuThiFilterNhomList, group]);
                                          else setSieuThiFilterNhomList(sieuThiFilterNhomList.filter(x => x !== group));
                                        }}
                                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                      <span className="text-sm font-semibold text-slate-700 leading-tight">{group === 'CE' ? 'C.E & GIA DỤNG' : group}</span>
                                    </label>
                                 ))}
                               </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="w-full sm:w-[280px] relative">
                        <label className="block text-[12px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ngành Hàng Hiển Thị</label>
                        <button 
                           type="button"
                           onClick={() => setIsNganhHangDropdownOpen(!isNganhHangDropdownOpen)}
                           className="w-full flex items-center justify-between px-3.5 py-2 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-xs sm:text-sm font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                        >
                           <span className="truncate mr-2">{sieuThiFilterNganhHangList.length > 0 ? `Đã chọn (${sieuThiFilterNganhHangList.length})` : 'Tất cả ngành hàng'}</span>
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        {isNganhHangDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsNganhHangDropdownOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col">
                               <div className="p-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
                                 <button 
                                   type="button"
                                   onClick={() => setSieuThiFilterNganhHangList(categoryConfig.map(c => c.name))}
                                   className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                                 >
                                   Chọn tất cả
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={() => setSieuThiFilterNganhHangList([])}
                                   className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1"
                                 >
                                   Bỏ chọn
                                 </button>
                               </div>
                               <div className="p-2 max-h-[300px] overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                                 {categoryConfig.map(c => (
                                    <label key={c.name} className="flex items-start gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                      <input 
                                        type="checkbox"
                                        checked={sieuThiFilterNganhHangList.includes(c.name)}
                                        onChange={(e) => {
                                          if (e.target.checked) setSieuThiFilterNganhHangList([...sieuThiFilterNganhHangList, c.name]);
                                          else setSieuThiFilterNganhHangList(sieuThiFilterNganhHangList.filter(x => x !== c.name));
                                        }}
                                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                      <span className="text-sm font-semibold text-slate-700 leading-tight">{c.name}</span>
                                    </label>
                                 ))}
                               </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CAP NHAT DATA UI */}
        {activeTab === 'CAP_NHAT_DATA' && (
          <div className="bg-slate-50/60 rounded-[32px] p-4 lg:p-8 border border-slate-200/80 max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0 mt-0.5 border border-blue-100 shadow-sm">
                  <Database size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    CẬP NHẬT DỮ LIỆU TỪ BI
                  </h1>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-medium">
                    Mở khóa để dán dữ liệu Ctrl+V =&gt; Hệ thống tự động phân tích, đồng bộ &amp; khóa dữ liệu lại
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportBackup}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
                >
                  <Download size={15} /> Xuất Backup (.json)
                </button>
                
                <label className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer">
                  <Upload size={15} /> Nhập Backup (.json)
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>
            </div>

            {/* 2 Column Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: REALTIME */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col space-y-6">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Zap size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-wide">REALTIME</h2>
                    <p className="text-xs text-slate-400 font-medium">Dán dữ liệu Thi Đua Siêu Thị Realtime</p>
                  </div>
                </div>

                {/* Thi Đua Siêu Thị Realtime */}
                <DataPasteBlock
                  title="Thi Đua Siêu Thị"
                  icon={Globe}
                  iconColor="text-blue-600"
                  theme="blue"
                  value={tnbRawData.rt_st}
                  onValidate={validateRtSt}
                  onChange={(val) => handleSaveRawField('rt_st', val)}
                  labelLocked="Đã khóa dữ liệu Thi Đua Siêu Thị"
                />
              </div>

              {/* Right Column: LUỸ KẾ */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col space-y-6">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <TrendingUp size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-wide">LUỸ KẾ</h2>
                    <p className="text-xs text-slate-400 font-medium">Dán dữ liệu Thi Đua Siêu Thị Luỹ Kế (Có từ "Target")</p>
                  </div>
                </div>

                {/* Thi Đua Siêu Thị Luỹ Kế */}
                <DataPasteBlock
                  title="Thi Đua Siêu Thị"
                  icon={Globe}
                  iconColor="text-indigo-600"
                  theme="indigo"
                  value={tnbRawData.lk_st}
                  onValidate={validateLkSt}
                  onChange={(val) => handleSaveRawField('lk_st', val)}
                  labelLocked="Đã khóa dữ liệu Luỹ Kế Siêu Thị"
                />
              </div>
            </div>

            {/* Bottom Card: CẬP NHẬT DANH SÁCH BOSS */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Users size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-wide uppercase">CẬP NHẬT DANH SÁCH BOSS</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Dán 4 cột (Tỉnh Mới, Tỉnh Cũ, BOSS, MST - Tên Siêu Thị) - Hệ thống tự động lấy Cột A (MST) & Cột B (Siêu Thị)</p>
                    {getLineCount(tnbRawData.ds_boss) > 0 && (
                      <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        ✓ Đã có {getLineCount(tnbRawData.ds_boss)} dòng dữ liệu BOSS (Đã tự động lấy Cột A & Cột B)
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setBossModalSearch('');
                      setBossModalPage(1);
                      setShowBossModal(true);
                    }}
                    disabled={!tnbRawData.ds_boss || !tnbRawData.ds_boss.trim()}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide shadow-md transition-all cursor-pointer ${
                      tnbRawData.ds_boss && tnbRawData.ds_boss.trim()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Eye size={16} strokeWidth={2.5} />
                    View DS BOSS
                  </button>

                  <button
                    onClick={async () => {
                      if (!tnbRawData.ds_boss || !tnbRawData.ds_boss.trim()) return;
                      if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ Danh Sách BOSS không?')) {
                        await handleSaveRawField('ds_boss', '');
                        showNotification('Đã xóa toàn bộ Danh Sách BOSS thành công!', 'info');
                      }
                    }}
                    disabled={!tnbRawData.ds_boss || !tnbRawData.ds_boss.trim()}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide shadow-md transition-all cursor-pointer ${
                      tnbRawData.ds_boss && tnbRawData.ds_boss.trim()
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                    Xóa DS BOSS
                  </button>
                </div>
              </div>

              {/* Instruction Guide Banner */}
              <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl text-blue-900 text-xs sm:text-[13px] leading-relaxed shadow-sm">
                <div className="font-bold flex items-center gap-2 mb-1.5 text-blue-950">
                  <Sparkles size={16} className="text-blue-600" />
                  <span>💡 Hướng dẫn định dạng dán dữ liệu DS BOSS:</span>
                </div>
                <div>
                  Copy đúng <strong>4 cột</strong> từ Excel theo đúng thứ tự:
                  <div className="flex flex-wrap items-center gap-1.5 my-2 font-mono text-[11px] sm:text-xs">
                    <span className="bg-white border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-blue-800 shadow-xs">Cột 1: TỈNH MỚI</span>
                    <span className="text-blue-400 font-sans font-bold">➔</span>
                    <span className="bg-white border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-blue-800 shadow-xs">Cột 2: TỈNH CŨ</span>
                    <span className="text-blue-400 font-sans font-bold">➔</span>
                    <span className="bg-white border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-blue-800 shadow-xs">Cột 3: BOSS</span>
                    <span className="text-blue-400 font-sans font-bold">➔</span>
                    <span className="bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg font-black text-emerald-900 shadow-xs">Cột 4: MST - TÊN SIÊU THỊ</span>
                  </div>
                  <p className="text-[12px] text-blue-700 font-medium">
                    ✨ Hệ thống sẽ <strong>tự động trích xuất Cột A (Mã Siêu Thị)</strong> và <strong>Cột B (Tên Siêu Thị)</strong> từ Cột 4 mà bạn không cần phải tách cột thủ công!
                  </p>
                </div>
              </div>

              {/* DataPasteBlock for direct paste */}
              <DataPasteBlock
                title="Dán trực tiếp Danh Sách BOSS (Tỉnh Mới, Tỉnh Cũ, BOSS, MST - Tên Siêu Thị)"
                icon={Users}
                iconColor="text-blue-600"
                theme="blue"
                value={tnbRawData.ds_boss}
                onChange={(val) => handleSaveRawField('ds_boss', val)}
                labelLocked="Đã khóa dữ liệu Danh Sách BOSS"
              />
            </div>
          </div>
        )}

        {/* Configuration UI */}
        {activeTab === 'CAU_HINH' && (
          <div className="bg-white rounded-[32px] p-6 lg:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cấu hình thứ tự Ngành hàng</h2>
                <p className="text-slate-500 text-[15px] mt-1">Dán dữ liệu từ Báo cáo BI Thi Đua hoặc Excel để cài đặt thứ tự và nhóm cho các ngành hàng. Dữ liệu sẽ lưu chung toàn hệ thống (Firebase).</p>
              </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
              {/* Left Column: Paste Input */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="bg-amber-50/90 p-4 rounded-2xl border border-amber-200 text-amber-900 text-[13px] leading-relaxed shadow-xs">
                  <div className="font-bold flex items-center gap-2 mb-2 text-amber-950 text-sm">
                    <Sparkles size={16} className="text-amber-600" />
                    <span>💡 Hướng dẫn dán dữ liệu:</span>
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside">
                    <li>
                      <strong>Cách 1 (Dán hàng ngang hoặc danh sách):</strong> Dán danh sách tên các ngành hàng (cách nhau bởi <strong>khoảng trắng, Tab, hoặc xuống dòng</strong>). Bảng bên phải sẽ <strong>TỰ ĐỘNG HIỂU và nhận diện từng ngành hàng</strong> ngay khi bạn dán!
                    </li>
                    <li>
                      <strong>Cách 2 (Từ Báo cáo BI Thi đua):</strong> Copy toàn bộ trang/bảng thi đua BI (chứa từ dòng <code className="bg-white px-1.5 py-0.5 rounded font-bold text-amber-800">ĐƠN VỊ</code> đến <code className="bg-white px-1.5 py-0.5 rounded font-bold text-amber-800">MIỀN NAM</code>). Hệ thống sẽ tự động lọc ra đúng 35 ngành hàng.
                    </li>
                    <li>
                      <strong>Cách 3 (Từ Excel):</strong> Copy 2 cột: <strong>Cột 1: Tên ngành hàng, Cột 2: Tên Nhóm</strong> (<code className="bg-white px-1.5 py-0.5 rounded text-amber-700 font-bold">ICT</code>, <code className="bg-white px-1.5 py-0.5 rounded text-amber-700 font-bold">DỊCH VỤ</code>, <code className="bg-white px-1.5 py-0.5 rounded text-amber-700 font-bold">CE</code>).
                    </li>
                  </ul>
                  <p className="mt-2 text-xs font-semibold text-amber-800 border-t border-amber-200/60 pt-2">
                    ✨ Bảng bên phải tự động cập nhật ngay lập tức. Bạn chỉ cần <strong>chọn lại loại nhóm (ICT / DỊCH VỤ / CE) và sắp xếp vị trí</strong> (kéo thả hoặc bấm nút Gom nhóm) rồi bấm <strong>"ÁP DỤNG VÀ LƯU"</strong>.
                  </p>
                </div>
                
                <div className="relative">
                  <textarea
                    className="w-full h-[420px] p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-mono text-[13px] leading-relaxed resize-none bg-slate-50 shadow-inner"
                    placeholder={"Dán dữ liệu ngành hàng tại đây (hàng ngang cách nhau bởi tab hoặc khoảng trắng, hoặc hàng dọc, hoặc báo cáo BI)...\n\nBảng bên phải sẽ TỰ ĐỘNG HIỂU và trích xuất từng ngành hàng ngay khi bạn dán!\n\nVí dụ dán hàng ngang:\nBảo hiểm tổng\tBảo hiểm Thợ ĐMX\tSIM MOBIFONE/VINAPHONE/SIM DMX\tSIM tổng...\n\nVí dụ báo cáo BI:\nĐƠN VỊ\nBảo hiểm tổng\n...\nĐIỆN TỬ\nMiền Nam"}
                    value={categoryConfigText}
                    onChange={e => handleCategoryTextChange(e.target.value)}
                    onPaste={handleCategoryPaste}
                    spellCheck={false}
                  />
                  {categoryConfigText && (
                    <button
                      onClick={() => {
                        setCategoryConfigText('');
                      }}
                      className="absolute top-3 right-3 px-2 py-1 bg-white/80 hover:bg-white text-slate-400 hover:text-rose-600 rounded-lg text-xs font-bold border border-slate-200 shadow-xs cursor-pointer transition-colors"
                      title="Xóa trắng ô dán"
                    >
                      Xóa nội dung
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleViewAndGroup}
                    className="flex-1 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black rounded-xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Search size={20} />
                    <span>XEM TRƯỚC & GOM NHÓM</span>
                  </button>

                  <button
                    onClick={handleSaveCategoryConfig}
                    disabled={isSavingConfig || previewConfig.length === 0}
                    className="flex-1 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingConfig ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>ÁP DỤNG VÀ LƯU</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Editable Preview Table */}
              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col h-[600px] overflow-hidden shadow-xs">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 bg-white rounded-t-xl flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-black text-slate-800 text-sm sm:text-base uppercase tracking-tight">Bảng xem trước hiện tại</h3>
                    <span className="text-xs font-black px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                      {previewConfig.length} ngành hàng
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSortByGroup}
                      title="Sắp xếp gom nhóm ICT ➔ DỊCH VỤ ➔ CE"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Layers size={13} />
                      <span className="hidden sm:inline">Gom nhóm</span>
                    </button>
                    <button
                      onClick={handleResetDefaultCategories}
                      title="Khôi phục 35 ngành hàng chuẩn mặc định"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCw size={13} />
                      <span className="hidden sm:inline">Mặc định</span>
                    </button>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-auto p-1">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead className="sticky top-0 bg-slate-100 z-10 shadow-xs">
                      <tr>
                        <th className="px-3 py-2.5 font-black text-slate-600 uppercase border-b border-slate-200 text-center w-12">#</th>
                        <th className="px-3 py-2.5 font-black text-slate-600 uppercase border-b border-slate-200">Ngành hàng (Chỉnh sửa trực tiếp)</th>
                        <th className="px-3 py-2.5 font-black text-slate-600 uppercase border-b border-slate-200 text-center w-36">Nhóm</th>
                        <th className="px-3 py-2.5 font-black text-slate-600 uppercase border-b border-slate-200 text-center w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {previewConfig.map((c, i) => (
                        <tr 
                          key={i} 
                          className="hover:bg-indigo-50/40 group transition-colors"
                          draggable
                          onDragStart={() => (dragItem.current = i)}
                          onDragEnter={() => (dragOverItem.current = i)}
                          onDragEnd={handleSort}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          {/* Row Number & Grip */}
                          <td className="px-2 py-1.5 text-slate-400 text-center w-12 select-none">
                            <div className="flex items-center justify-center gap-1">
                              <GripVertical size={13} className="opacity-30 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-500" />
                              <span className="font-bold text-xs text-slate-500">{i + 1}</span>
                            </div>
                          </td>

                          {/* Editable Category Name */}
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => handleUpdateItemName(i, e.target.value)}
                              placeholder="Nhập tên ngành hàng..."
                              className="w-full px-2.5 py-1 text-[13px] font-bold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg outline-none transition-all"
                            />
                          </td>

                          {/* Editable Group Dropdown */}
                          <td className="px-3 py-1.5 text-center w-36">
                            <select
                              value={c.group}
                              onChange={(e) => handleUpdateItemGroup(i, e.target.value)}
                              className={`w-full px-2.5 py-1 text-xs font-black rounded-lg border shadow-xs transition-all cursor-pointer outline-none ${
                                c.group === 'ICT'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : c.group === 'DỊCH VỤ'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                              }`}
                            >
                              <option value="ICT" className="bg-white text-amber-800 font-bold">ICT</option>
                              <option value="DỊCH VỤ" className="bg-white text-emerald-800 font-bold">DỊCH VỤ</option>
                              <option value="CE" className="bg-white text-blue-800 font-bold">CE</option>
                            </select>
                          </td>

                          {/* Actions: Up, Down, Delete */}
                          <td className="px-2 py-1.5 text-center w-24">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => moveItemUp(i)} 
                                disabled={i === 0} 
                                title="Di chuyển lên"
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button 
                                onClick={() => moveItemDown(i)} 
                                disabled={i === previewConfig.length - 1} 
                                title="Di chuyển xuống"
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button 
                                onClick={() => handleRemoveItem(i)} 
                                title="Xóa ngành hàng này"
                                className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {previewConfig.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                            Chưa có dữ liệu. Hãy dán dữ liệu báo cáo BI hoặc Excel và nhấn "XEM TRƯỚC & GOM NHÓM".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Actions & Group Stats */}
                <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={handleAddNewItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 cursor-pointer transition-all shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Thêm ngành hàng mới</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                      ICT: {previewConfig.filter(c => c.group === 'ICT').length}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                      DỊCH VỤ: {previewConfig.filter(c => c.group === 'DỊCH VỤ').length}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                      CE: {previewConfig.filter(c => c.group === 'CE').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Testing Toolbar for RT_SIEU_THI & LK_SIEU_THI */}
        {(activeTab === 'RT_SIEU_THI' || activeTab === 'LK_SIEU_THI') && (
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-white p-4 rounded-[22px] shadow-sm border border-slate-200">
            {/* Left: Row Count Badge */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 px-4 py-2 rounded-xl">
                <span className="text-slate-600 font-bold text-sm">Tổng cộng:</span>
                <span className="text-indigo-600 font-black text-base">{currentData.length.toLocaleString('vi-VN')}</span>
                <span className="text-slate-400 font-medium text-xs">dòng gốc</span>
              </div>

              {tableFilterText.trim() && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-xs font-black animate-in fade-in">
                  <span>Khớp lọc:</span>
                  <span className="text-emerald-800 text-sm font-black">{filteredData.length.toLocaleString('vi-VN')}</span>
                  <span>dòng</span>
                </div>
              )}
            </div>

            {/* Right: Dedicated Filter Controls on the same horizontal row */}
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
                {/* Column Selector */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-black uppercase text-slate-500">Cột:</span>
                  <select
                    value={tableFilterCol}
                    onChange={(e) => {
                      setTableFilterCol(e.target.value);
                      setTableFilterText('');
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-black text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="ALL">🔍 Tất cả các cột</option>
                    {currentHeaders.map((h, idx) => (
                      <option key={idx} value={String(idx)}>
                        {h} (Cột {idx + 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick-Pick Values Dropdown (if specific column chosen) */}
                {tableFilterCol !== 'ALL' && uniqueColValues.length > 0 && (
                  <select
                    value={uniqueColValues.includes(tableFilterText) ? tableFilterText : ''}
                    onChange={(e) => setTableFilterText(e.target.value)}
                    className="max-w-[220px] px-3 py-2 rounded-xl border border-indigo-300 bg-indigo-50/50 text-indigo-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm truncate"
                  >
                    <option value="">-- Chọn giá trị ({uniqueColValues.length}) --</option>
                    {uniqueColValues.map((val, idx) => (
                      <option key={idx} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                )}

                {/* Keyword Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-[380px]">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={tableFilterText}
                    onChange={(e) => setTableFilterText(e.target.value)}
                    placeholder={tableFilterCol === 'ALL' ? "Nhập từ khóa lọc kiểm tra data..." : `Lọc Cột ${parseInt(tableFilterCol, 10) + 1}...`}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                  {tableFilterText && (
                    <button
                      onClick={() => setTableFilterText('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Exact Match Toggle */}
                <button
                  onClick={() => setTableFilterExact(!tableFilterExact)}
                  title="Chuyển đổi giữa tìm kiếm chứa từ khóa và khớp chính xác"
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                    tableFilterExact
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tableFilterExact ? '= Chính xác' : '≈ Chứa từ'}
                </button>

                {/* Reset Filters Button */}
                {(tableFilterText || tableFilterCol !== 'ALL') && (
                  <button
                    onClick={() => {
                      setTableFilterCol('ALL');
                      setTableFilterText('');
                      setTableFilterExact(false);
                    }}
                    className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    <span>✕ Xóa lọc</span>
                  </button>
                )}
              </div>
          </div>
        )}

        {/* TỔNG / VÙNG / NHÓM HÀNG / SIÊU THỊ Pivot Table & Scorecard View */}
        {(activeTab === 'CAU_HINH' || activeTab === 'CAP_NHAT_DATA') ? null : (activeTab === 'TONG' || activeTab === 'VUNG' || activeTab === 'NHOM_HANG' || activeTab === 'SIEU_THI') ? (
          <div className={`bg-white rounded-2xl p-2 sm:p-3 shadow-sm border border-slate-200 overflow-hidden flex flex-col relative min-h-[500px] w-full transition-all ${isSyncing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex-1 w-full">
              {(() => {
                const renderPivotTable = (isRealtime: boolean, currentTableRef?: any) => {
                  const isLuyKeMode = tnbDataMode === 'luyke';
                  const dataSource = isLuyKeMode 
                    ? effectiveDataLkSieuThi 
                    : ((activeTab === 'VUNG' && !isRealtime) ? dataVungPivot : effectiveDataRtSieuThi);
                  if (dataSource.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                      <LayoutGrid size={40} className="text-slate-300 mb-3" />
                      <p className="font-medium text-lg text-slate-500">Chưa có dữ liệu</p>
                      <p className="text-sm text-slate-400">Hãy cập nhật dữ liệu để hiển thị.</p>
                    </div>
                  );
                }

                // Pivot source: dataSource
                // Col 0 (A) = Province name / Store name
                // Col 1 (C) = DTLK
                // Col 2 (D) = Target
                // Col 3 (K) = Brand -> Condition: !== "TGD" && !== "AAR"

                // 1. Filter rows
                const filtered = dataSource.filter(row => {
                  if (activeTab === 'VUNG' && !isRealtime) {
                    const brand = (row[3] || '').trim().toUpperCase();
                    return brand !== 'TGD' && brand !== 'AAR';
                  } else if (activeTab === 'VUNG' && isRealtime) {
                    const brand = (row[7] || row[5] || '').trim().toUpperCase();
                    return brand !== 'TGD' && brand !== 'AAR';
                  } else {
                    const stName = (row[6] || '').trim().toUpperCase();
                    if (!stName || stName === '-' || stName.includes('KHO BÁN HÀNG LƯU ĐỘNG')) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                      <LayoutGrid size={40} className="text-slate-300 mb-3" />
                      <p className="font-medium text-lg text-slate-500">Không có dữ liệu phù hợp</p>
                      <p className="text-sm text-slate-400">Không tìm thấy dòng nào hợp lệ.</p>
                    </div>
                  );
                }

                // 2. Extract unique categories preserving order
                const categorySet = new Set<string>();
                filtered.forEach(row => {
                  const cat = ((activeTab === 'VUNG' && !isRealtime && !isLuyKeMode) ? row[4] : row[9]) || '';
                  const cleanCat = cat.trim().toUpperCase().normalize('NFC');
                  if (cleanCat && cleanCat !== '-') categorySet.add(cleanCat);
                });

                if (!isLuyKeMode && effectiveDataLkSieuThi.length > 0) {
                  effectiveDataLkSieuThi.forEach(row => {
                    const kenh = (row[7] || '').trim().toUpperCase();
                    let isValidKenh = false;
                    if (sieuThiFilterKenh.length === 0) {
                      isValidKenh = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR'].includes(kenh);
                    } else {
                      if (sieuThiFilterKenh.includes(kenh)) isValidKenh = true;
                      if (sieuThiFilterKenh.includes('TGD') && kenh === 'AAR') isValidKenh = true;
                    }
                    if (!isValidKenh) return;
                    const cat = (row[9] || '').trim().toUpperCase().normalize('NFC');
                    if (cat && cat !== '-') categorySet.add(cat);
                  });
                }
                const CATEGORY_ORDER = categoryConfig.map(c => c.name.toUpperCase().normalize('NFC'));
                const blueCatsData = categoryConfig.filter(c => c.group === 'CE').map(c => c.name.toUpperCase().normalize('NFC'));
                const allCats = Array.from(categorySet);
                let categories = [];
                if (sieuThiFilterNganhHangList.length > 0) {
                  const filterUpper = sieuThiFilterNganhHangList.map(c => c.toUpperCase().normalize('NFC'));
                  categories = CATEGORY_ORDER.filter(c => filterUpper.includes(c));
                  const extra = filterUpper.filter(c => !CATEGORY_ORDER.includes(c));
                  categories = [...categories, ...extra];
                } else {
                  categories = [
                    ...CATEGORY_ORDER.filter(c => allCats.includes(c)),
                    ...allCats.filter(c => !CATEGORY_ORDER.includes(c))
                  ];
                }

                if (sieuThiFilterNhomList.length > 0) {
                  categories = categories.filter(c => {
                    const catObj = categoryConfig.find(cfg => cfg.name.toUpperCase().normalize('NFC') === c);
                    return catObj && sieuThiFilterNhomList.includes(catObj.group);
                  });
                }

                if (activeTab !== 'VUNG' && sieuThiFilterKenh.length === 1 && sieuThiFilterKenh[0] === 'TGD') {
                  categories = categories.filter(c => !blueCatsData.includes(c));
                }

                // 3. Define rows
                let rowNames: string[] = [];
                const storeInfoMap: Record<string, { tinh: string, boss: string, kenh: string }> = {};

                if (activeTab === 'VUNG') {
                  rowNames = [
                    'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 'Trà Vinh',
                    'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 'Bến Tre', 'Đồng Tháp', 'An Giang'
                  ];
                } else {
                  const storeSet = new Set<string>();
                  filtered.forEach(row => {
                    const tinh = (row[0] || '').trim().toUpperCase();
                    const stRt = (row[6] || '').trim().toUpperCase();
                    const kenh = (row[7] || '').trim().toUpperCase();
                    const boss = (row[8] || '').trim().toUpperCase();
                    if (stRt && stRt !== '-') {
                      storeSet.add(stRt);
                      storeInfoMap[stRt] = { tinh, boss, kenh };
                    }
                  });

                  let storesList = Array.from(storeSet);
                  if (sieuThiFilterTinh) {
                    const cleanFilterTinh = sieuThiFilterTinh.trim().toLowerCase().normalize('NFC');
                    storesList = storesList.filter(s => (storeInfoMap[s]?.tinh || '').trim().toLowerCase().normalize('NFC') === cleanFilterTinh);
                  }
                  if (sieuThiFilterKenh.length > 0) {
                    storesList = storesList.filter(s => sieuThiFilterKenh.includes(storeInfoMap[s]?.kenh || ''));
                  }
                  rowNames = storesList;
                }

                const pivotMap: Record<string, Record<string, { dtlk: number, target: number, rawPercent: number, htDuKien: number }>> = {};


                filtered.forEach(row => {
                  if (activeTab === 'VUNG' && !isRealtime && !isLuyKeMode) {
                    // VUNG LK (non-luyke): dataVungPivot columns
                    const prov = (row[0] || '').trim().toUpperCase();
                    const dtlk = parseNum(row[1]);
                    const target = parseNum(row[2]);
                    const cat = (row[4] || '').trim().toUpperCase().normalize('NFC');
                    if (prov && cat && cat !== '-') {
                      if (!pivotMap[prov]) pivotMap[prov] = {};
                      if (!pivotMap[prov][cat]) pivotMap[prov][cat] = { dtlk: 0, target: 0, rawPercent: 0, htDuKien: 0 };
                      pivotMap[prov][cat].dtlk += dtlk;
                      pivotMap[prov][cat].target += target;
                    }
                  } else if (activeTab === 'VUNG' && (isRealtime || isLuyKeMode)) {
                    // VUNG RT or VUNG+luyke: dataRtSieuThi / dataLkSieuThiMapped columns
                    const prov = (row[0] || '').trim().toUpperCase();
                    const dtlk = parseNum(row[2]); // CỘT 3
                    const target = parseNum(row[3]); // CỘT 4
                    const kenh = (row[7] || '').trim().toUpperCase(); // CỘT 9 (AC)
                    const cat = (row[9] || '').trim().toUpperCase().normalize('NFC'); // CỘT 13 (AG)
                    
                    if (prov && cat && cat !== '-') {
                      let isValidKenh = false;
                      if (sieuThiFilterKenh.length === 0) {
                        isValidKenh = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR'].includes(kenh);
                      } else {
                        if (sieuThiFilterKenh.includes(kenh)) isValidKenh = true;
                        if (sieuThiFilterKenh.includes('TGD') && kenh === 'AAR') isValidKenh = true;
                      }

                      if (isValidKenh) {
                        if (!pivotMap[prov]) pivotMap[prov] = {};
                        if (!pivotMap[prov][cat]) pivotMap[prov][cat] = { dtlk: 0, target: 0, rawPercent: 0, htDuKien: 0 };
                        pivotMap[prov][cat].dtlk += dtlk;
                        pivotMap[prov][cat].target += target;
                      }
                    }
                  } else {
                    const stRt = (row[6] || '').trim().toUpperCase();
                    // NẾU BUTTON "LUỸ KẾ"=TRUE THÌ CỘT %HT = COLD6 (row[5]), ngược lại nếu REALTIME thì %HT = COLD5 (row[4])
                    const rawPercent = parseNum(isLuyKeMode ? row[5] : row[4]);
                    const htDuKien = parseNum(row[5]);
                    const dtlk = parseNum(row[2]);
                    const target = parseNum(row[3]);
                    const cat = (row[9] || '').trim().toUpperCase().normalize('NFC');
                    if (stRt && cat && cat !== '-') {
                      if (!pivotMap[stRt]) pivotMap[stRt] = {};
                      if (!pivotMap[stRt][cat]) pivotMap[stRt][cat] = { dtlk: 0, target: 0, rawPercent: 0, htDuKien: 0 };
                      pivotMap[stRt][cat].rawPercent = rawPercent;
                      pivotMap[stRt][cat].htDuKien = htDuKien;
                      pivotMap[stRt][cat].dtlk += dtlk;
                      pivotMap[stRt][cat].target += target;
                    }
                  }
                });

                // SUPPLEMENT: When in SIEU_THI + realtime mode, fill missing store+category
                // entries from LK data. This handles cases where the RT columns in the Google
                // Sheet don't have data for certain ngành hàng (e.g. Mở thẻ tín dụng, Vay tiền mặt,
                // Ví trả sau, Nạp rút tiền) for TGD stores, while the LK columns do.
                if (activeTab !== 'VUNG' && !isLuyKeMode && effectiveDataLkSieuThi.length > 0) {
                  effectiveDataLkSieuThi.forEach(row => {
                    const stRt = (row[6] || '').trim().toUpperCase();
                    const cat = (row[9] || '').trim().toUpperCase().normalize('NFC');
                    if (!stRt || !cat || cat === '-') return;
                    // Only supplement if this store exists in rowNames (i.e. matched the kenh filter)
                    if (!rowNames.some(r => r.toUpperCase() === stRt)) return;
                    // Only supplement if the store+category is MISSING from RT pivotMap
                    if (pivotMap[stRt] && pivotMap[stRt][cat]) return;

                    const rawPercent = parseNum(row[5]); // LK %HT is COLD6 (row[5])
                    const dtlk = parseNum(row[2]);
                    const target = parseNum(row[3]);
                    if (!pivotMap[stRt]) pivotMap[stRt] = {};
                    pivotMap[stRt][cat] = { dtlk, target, rawPercent, htDuKien: 0 };
                  });
                }

                // SUPPLEMENT for VUNG tab: When in realtime mode, fill missing province+category
                // entries from LK data, respecting the kenh filter.
                if (activeTab === 'VUNG' && isRealtime && !isLuyKeMode && effectiveDataLkSieuThi.length > 0) {
                  effectiveDataLkSieuThi.forEach(row => {
                    const prov = (row[0] || '').trim().toUpperCase();
                    const cat = (row[9] || '').trim().toUpperCase().normalize('NFC');
                    const kenh = (row[7] || '').trim().toUpperCase();
                    if (!prov || !cat || cat === '-') return;
                    // Respect kenh filter
                    let isValidKenh = false;
                    if (sieuThiFilterKenh.length === 0) {
                      isValidKenh = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR'].includes(kenh);
                    } else {
                      if (sieuThiFilterKenh.includes(kenh)) isValidKenh = true;
                      if (sieuThiFilterKenh.includes('TGD') && kenh === 'AAR') isValidKenh = true;
                    }
                    if (!isValidKenh) return;
                    // Only supplement if this province+category is MISSING from RT pivotMap
                    if (pivotMap[prov] && pivotMap[prov][cat]) return;

                    const dtlk = parseNum(row[2]);
                    const target = parseNum(row[3]);
                    if (!pivotMap[prov]) pivotMap[prov] = {};
                    pivotMap[prov][cat] = { dtlk: 0, target: 0, rawPercent: 0, htDuKien: 0 };
                    pivotMap[prov][cat].dtlk += dtlk;
                    pivotMap[prov][cat].target += target;
                  });
                }

                const today = new Date();
                const currentDay = Math.max(1, today.getDate() - 1);
                const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const totalCats = categories.length;


                const mappedRows = rowNames.map((prov) => {
                  let datCount = 0;
                  const provData = pivotMap[prov.toUpperCase()] || {};
                  const info = storeInfoMap[prov.toUpperCase()] || { tinh: '', boss: '', kenh: '' };
                  
                  const isTGD = info.kenh === 'TGD';
                  const blueCats = blueCatsData;
                  let effectiveTotalCats = 0;

                  const catPercents = categories.map(cat => {
                    const isBlueCat = blueCats.includes(cat);
                    const shouldIgnoreForTGD = isTGD && isBlueCat;
                    
                    if (!shouldIgnoreForTGD) {
                      effectiveTotalCats++;
                    }

                    const cellData = provData[cat];
                    let percent = 0;
                    let displayVal = '-';
                    let textColor = 'text-slate-400';
                    let bgColor = 'bg-white';
                    
                    const isLuyKeMode = tnbDataMode === 'luyke';
                    
                    if (activeTab === 'VUNG' && (!isRealtime || isLuyKeMode)) {
                      if (cellData && cellData.target > 0) {
                        percent = ((cellData.dtlk / currentDay) * totalDays) / cellData.target * 100;
                        displayVal = percent.toFixed(0) + '%';
                      }
                    } else if (activeTab === 'VUNG' && isRealtime) {
                      if (cellData && cellData.target > 0) {
                        percent = (cellData.dtlk / cellData.target) * 100;
                        displayVal = percent.toFixed(0) + '%';
                      } else if (cellData && cellData.target === 0 && cellData.dtlk > 0) {
                        percent = 100;
                        displayVal = '100%';
                      }
                    } else {
                      if (cellData) {
                        if (isLuyKeMode) {
                          // SIEU_THI + luyke: rawPercent = row[4] = %HT Dự Kiến from spreadsheet
                          percent = cellData.rawPercent;
                        } else {
                          percent = cellData.rawPercent;
                        }
                        displayVal = percent.toFixed(0) + '%';
                      }
                    }
                    
                    // If ignored for TGD, maybe we still show it or blank it out? Let's just blank it out so it's clear it's not counted.
                    if (shouldIgnoreForTGD) {
                      displayVal = '-';
                    }

                    if (displayVal !== '-') {
                      if (percent >= 100) {
                        if (!shouldIgnoreForTGD) datCount++;
                        textColor = 'text-[#064e3b]';
                        bgColor = 'bg-emerald-100';
                      } else if (isLuyKeMode && percent < 50) {
                        textColor = 'text-red-600';
                        bgColor = 'bg-red-100';
                      } else if (!isLuyKeMode && percent <= 10) {
                        textColor = 'text-red-500';
                      } else {
                        textColor = 'text-slate-900';
                      }
                    } else if (cellData && cellData.target === 0 && cellData.dtlk > 0 && !shouldIgnoreForTGD) {
                      percent = 100;
                      displayVal = '100%';
                      textColor = 'text-[#064e3b]';
                      bgColor = 'bg-emerald-100';
                      datCount++;
                    }
                    
                    return { displayVal, textColor, bgColor };
                  });

                  const tyLe = effectiveTotalCats > 0 ? (datCount / effectiveTotalCats) * 100 : 0;
                  return { prov, datCount, tyLe, effectiveTotalCats, catPercents, ...info };
                });

                // Search logic
                let searchedRows = mappedRows.filter(r => {
                  // Filter out OFF stores only in SIÊU THỊ tab
                  if (activeTab === 'SIEU_THI' && (r.prov || '').toString().toUpperCase().includes('OFF')) {
                    return false;
                  }
                  
                  if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    return (r.prov || '').toString().toLowerCase().includes(term) || 
                           (r.boss || '').toString().toLowerCase().includes(term) ||
                           (r.kenh || '').toString().toLowerCase().includes(term);
                  }
                  return true;
                });
                
                searchedRowsRef.current = searchedRows;
                vungCategoriesRef.current = categories;
                vungPivotMapRef.current = pivotMap;

                // Sort logic
                if (activeTab === 'VUNG') {
                  searchedRows.sort((a, b) => {
                    if (b.tyLe !== a.tyLe) return b.tyLe - a.tyLe;
                    if (b.datCount !== a.datCount) return b.datCount - a.datCount;
                    return a.prov.localeCompare(b.prov);
                  });
                } else {
                  const kenhOrder: Record<string, number> = { 'ĐML': 1, 'ĐMM': 2, 'ĐMS': 3, 'TGD': 4 };
                  searchedRows.sort((a, b) => {
                    const kA = kenhOrder[a.kenh] || 99;
                    const kB = kenhOrder[b.kenh] || 99;
                    if (kA !== kB) return kA - kB;
                    if (b.tyLe !== a.tyLe) return b.tyLe - a.tyLe;
                    if (b.datCount !== a.datCount) return b.datCount - a.datCount;
                    return a.prov.localeCompare(b.prov);
                  });
                }

                // Pagination logic removed - display all rows directly
                const paginatedRows = searchedRows;

                const totalRowCats = categories.map(cat => {
                   let sumDtlk = 0;
                   let sumTarget = 0;
                   let sumRawPercent = 0;
                   let countRawPercent = 0;

                   searchedRows.forEach(r => {
                      const provData = pivotMap[r.prov.toUpperCase()] || {};
                      const cellData = provData[cat];
                      if (cellData) {
                         sumDtlk += cellData.dtlk || 0;
                         sumTarget += cellData.target || 0;
                         if (cellData.rawPercent > 0 || cellData.target === 0) {
                           sumRawPercent += cellData.rawPercent || 0;
                           countRawPercent++;
                         }
                      }
                   });

                   let percent = 0;
                   let displayVal = '-';
                   let textColor = 'text-slate-400';
                   let bgColor = 'bg-white';

                   if (activeTab === 'VUNG' && (!isRealtime || isLuyKeMode)) {
                     if (sumTarget > 0) {
                       percent = ((sumDtlk / currentDay) * totalDays) / sumTarget * 100;
                       displayVal = percent.toFixed(0) + '%';
                     }
                   } else if (activeTab === 'VUNG' && isRealtime) {
                     if (sumTarget > 0) {
                       percent = (sumDtlk / sumTarget) * 100;
                       displayVal = percent.toFixed(0) + '%';
                     } else if (sumTarget === 0 && sumDtlk > 0) {
                       percent = 100;
                       displayVal = '100%';
                     }
                   } else {
                     if (isLuyKeMode && sumTarget > 0) {
                       // % Dự Kiến for SIEU_THI total row
                       percent = ((sumDtlk / currentDay) * totalDays) / sumTarget * 100;
                       displayVal = percent.toFixed(0) + '%';
                     } else if (countRawPercent > 0) {
                       percent = sumRawPercent / countRawPercent;
                       displayVal = percent.toFixed(0) + '%';
                     }
                   }

                   const isBlueCat = blueCatsData.includes(cat);
                   const shouldIgnoreForTGD = (activeTab !== 'VUNG' && sieuThiFilterKenh.length === 1 && sieuThiFilterKenh[0] === 'TGD') && isBlueCat;
                   
                   if (shouldIgnoreForTGD) {
                     displayVal = '-';
                   }

                   if (displayVal !== '-') {
                     if (percent >= 100) {
                       textColor = 'text-[#064e3b]';
                       bgColor = 'bg-emerald-100';
                     } else if (isLuyKeMode && percent < 50) {
                       textColor = 'text-red-600';
                       bgColor = 'bg-red-100';
                     } else if (!isLuyKeMode && percent <= 10) {
                       textColor = 'text-red-500';
                     } else {
                       textColor = 'text-slate-900';
                     }
                   }

                   return { displayVal, textColor, bgColor, percent, shouldIgnoreForTGD };
                });

                let totalDatCount = 0;
                let totalEffectiveCats = 0;
                totalRowCats.forEach(c => {
                  if (!c.shouldIgnoreForTGD) {
                    totalEffectiveCats++;
                    if (c.displayVal !== '-' && c.percent >= 100) {
                      totalDatCount++;
                    }
                  }
                });

                const totalTyLe = totalEffectiveCats > 0 ? (totalDatCount / totalEffectiveCats) * 100 : 0;

                const totalRow = {
                  isTotalRow: true,
                  prov: 'TỔNG CỘNG',
                  tinh: 'TỔNG CỘNG',
                  boss: '-',
                  kenh: '-',
                  datCount: totalDatCount,
                  effectiveTotalCats: totalEffectiveCats,
                  tyLe: totalTyLe,
                  catPercents: totalRowCats
                };

                const finalRows = searchedRows.length > 0 ? [...paginatedRows, totalRow] : paginatedRows;

                return (
                  <div className="w-full">
                    <style>{`
                      .export-short-mode .category-col { display: none !important; }
                    `}</style>
                    <div ref={currentTableRef} className="w-full bg-white">
                      <div className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                        <table className="w-full border-separate border-spacing-0 text-[15px] border border-slate-200 rounded-2xl shadow-sm">
                      <thead className="sticky top-0 z-20 shadow-sm bg-white">
                        {/* Title Rows */}
                        {(() => {
                          const now = new Date();
                          const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${todayStr}`;
                          
                          const monthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                          const yesterday = new Date(now);
                          yesterday.setDate(yesterday.getDate() - 1);
                          const yesterdayStr = `${String(yesterday.getDate()).padStart(2, '0')}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${yesterday.getFullYear()}`;
                          
                          const isLuyKeMode = tnbDataMode === 'luyke';
                          const isEffectiveRealtime = isRealtime && !isLuyKeMode;

                          const titlePrefix = isLuyKeMode
                            ? `LUỸ KẾ THI ĐUA NGÀNH HÀNG THÁNG ${monthStr}`
                            : (activeTab === 'VUNG' 
                                ? (isEffectiveRealtime ? `REALTIME THI ĐUA NGÀNH HÀNG NGÀY ${todayStr}` : `LUỸ KẾ THI ĐUA NGÀNH HÀNG THÁNG ${monthStr}`)
                                : `REALTIME THI ĐUA NGÀNH HÀNG NGÀY ${todayStr}`);
                          const displayTime = isLuyKeMode
                            ? yesterdayStr
                            : (activeTab === 'VUNG' 
                                ? (isEffectiveRealtime ? timeStr : yesterdayStr)
                                : timeStr);
                          
                          const getKenhTitle = () => {
                            if (sieuThiFilterKenh.length === 0) return "TẤT CẢ KÊNH";
                            const hasDMX = sieuThiFilterKenh.some(k => ['ĐML', 'ĐMM', 'ĐMS'].includes(k));
                            const hasTGD = sieuThiFilterKenh.includes('TGD');
                            if (hasDMX && hasTGD) return "KÊNH ĐMX & TGD";
                            if (hasDMX) return "KÊNH ĐMX";
                            if (hasTGD) return "KÊNH TGD";
                            return `KÊNH ${sieuThiFilterKenh.join(', ')}`;
                          };
                          
                          return (
                            <>
                                <tr>
                                  <th colSpan={100} style={{ borderBottom: '1px solid #e2e8f0' }} className="bg-white px-4 py-3 text-left sticky left-0 z-30">
                                    <div className="flex items-center justify-start flex-wrap gap-4 sm:gap-6">
                                      <div>
                                        <span className="text-[26px] sm:text-[31px] font-black text-slate-800">{titlePrefix} - </span>
                                        <span className="text-[26px] sm:text-[31px] font-black text-[#c00000] uppercase">
                                          {getKenhTitle()}
                                        </span>
                                      </div>

                                      {/* Action Buttons placed right next to title (Guaranteed hidden during export) */}
                                      {!isExporting && (
                                        <div className="export-btn flex items-center gap-2.5 shrink-0">
                                          <LineExportPanel 
                                            tableRefs={{
                                              tableRef,
                                              rtTableRef,
                                              chiTietTableRef,
                                              xepHangTableRef,
                                              khoTableRef,
                                              tgdTableRef,
                                              dmxTableRef,
                                              vungScorecardRef
                                            }}
                                            activeTab={activeTab}
                                            setActiveTab={setActiveTab}
                                            isUser43751={false}
                                          />
                                          {activeTab === 'VUNG' ? (
                                            <div className="flex items-center gap-2">
                                              <button 
                                                onClick={() => {
                                                  setVungFeedbackCustomText(null);
                                                  setShowVungFeedbackModal(true);
                                                }} 
                                                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#06b6d4] hover:from-[#1e40af] hover:to-[#0284c7] text-white px-3.5 py-2 rounded-xl font-black transition-all shadow-md shadow-blue-500/20 whitespace-nowrap text-xs cursor-pointer active:scale-95"
                                                title="Mở Form nhận xét kết quả thi đua Vùng"
                                              >
                                                <MessageSquare size={15} strokeWidth={2.5} /> NHẬN XÉT VÙNG
                                              </button>
                                              <button onClick={() => exportImageShort(rtTableRef)} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap text-xs cursor-pointer">
                                                <Download size={15} /> XUẤT ẢNH RÚT GỌN
                                              </button>
                                              <button onClick={() => exportImage(rtTableRef)} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap text-xs cursor-pointer">
                                                <Download size={15} /> XUẤT ẢNH TỔNG
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              {activeTab === 'SIEU_THI' && (
                                                <button 
                                                  onClick={() => {
                                                    setSieuThiFeedbackCustomText(null);
                                                    setShowSieuThiFeedbackModal(true);
                                                  }} 
                                                  className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#06b6d4] hover:from-[#1e40af] hover:to-[#0284c7] text-white px-3.5 py-2 rounded-xl font-black transition-all shadow-md shadow-blue-500/20 whitespace-nowrap text-xs cursor-pointer active:scale-95"
                                                  title="Mở Form nhận xét kết quả thi đua Siêu thị"
                                                >
                                                  <MessageSquare size={15} strokeWidth={2.5} /> NHẬN XÉT SIÊU THỊ
                                                </button>
                                              )}
                                              <button onClick={() => exportImageShort()} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap text-xs sm:text-sm cursor-pointer">
                                                <Download size={16} /> XUẤT ẢNH RÚT GỌN
                                              </button>
                                              <button onClick={() => exportImage()} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap text-xs sm:text-sm cursor-pointer">
                                                <Download size={16} /> XUẤT ẢNH TỔNG
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </th>
                                </tr>
                                <tr>
                                  <th colSpan={100} style={{ borderBottom: '2px solid #cbd5e1' }} className="bg-white px-4 py-2 text-left sticky left-0 z-30">
                                    <span className="text-[15px] sm:text-[17px] font-bold text-slate-800 uppercase">THỜI GIAN ĐẾN : </span>
                                    <span className="text-[15px] sm:text-[17px] font-bold text-slate-900 ml-3">{displayTime}</span>
                                    <span className="text-[15px] sm:text-[17px] font-bold text-red-600 ml-3 uppercase">
                                      || CHỈ TÍNH {sieuThiFilterKenh.length === 0 ? 'TẤT CẢ KÊNH ĐMX, TGD, AAR' : (sieuThiFilterKenh.includes('TGD') ? getKenhTitle() + ', AAR' : getKenhTitle())}
                                    </span>
                                  </th>
                                </tr>
                            </>
                          );
                        })()}
                        {/* Top Group Header row */}
                        <tr>
                          <th rowSpan={2} style={{ background: 'linear-gradient(180deg, #047857 0%, #059669 50%, #10b981 100%)', fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }} className="text-white px-2 py-3 border-r border-b border-white/20 text-center w-[40px] whitespace-nowrap lg:sticky lg:left-0 z-30 text-[13.5px] font-black drop-shadow-xs">
                            STT
                          </th>
                          {activeTab === 'SIEU_THI' && (
                            <>
                              <th rowSpan={2} style={{ background: 'linear-gradient(180deg, #047857 0%, #059669 50%, #10b981 100%)', fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }} className="text-white px-3 py-3 border-r border-b border-white/20 text-center w-[80px] min-w-[80px] max-w-[80px] whitespace-nowrap lg:sticky lg:left-[40px] z-30 text-[13.5px] font-black drop-shadow-xs">
                                TỈNH
                              </th>
                              <th rowSpan={2} style={{ background: 'linear-gradient(180deg, #047857 0%, #059669 50%, #10b981 100%)', fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }} className="text-white px-3 py-3 border-r border-b border-white/20 text-center w-[100px] min-w-[100px] max-w-[100px] whitespace-nowrap lg:sticky lg:left-[120px] z-30 text-[13.5px] font-black drop-shadow-xs">
                                BOSS
                              </th>
                              <th rowSpan={2} style={{ background: 'linear-gradient(180deg, #047857 0%, #059669 50%, #10b981 100%)', fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }} className="text-white px-3 py-3 border-r border-b border-white/20 text-center w-[60px] min-w-[60px] max-w-[60px] whitespace-nowrap lg:sticky lg:left-[220px] z-30 text-[13.5px] font-black drop-shadow-xs">
                                KÊNH
                              </th>
                            </>
                          )}
                          <th rowSpan={2} style={{ background: 'linear-gradient(180deg, #047857 0%, #059669 50%, #10b981 100%)', fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }} className={`text-white px-3 py-3 border-r border-b border-white/20 text-center whitespace-nowrap lg:sticky z-30 text-[13.5px] font-black drop-shadow-xs ${activeTab === 'SIEU_THI' ? 'w-[240px] min-w-[240px] max-w-[240px] lg:left-[280px]' : 'w-[120px] min-w-[120px] max-w-[120px] lg:left-[40px]'}`}>
                            {activeTab === 'VUNG' ? 'TỈNH' : 'SIÊU THỊ'}
                          </th>
                          <th rowSpan={2} style={{ background: 'linear-gradient(180deg, #047857 0%, #059669 50%, #10b981 100%)', fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }} className={`text-white px-2 py-3 border-r border-b border-white/20 text-center w-[70px] min-w-[70px] max-w-[70px] whitespace-nowrap lg:sticky z-30 uppercase text-[13.5px] font-black drop-shadow-xs ${activeTab === 'SIEU_THI' ? 'lg:left-[520px]' : 'lg:left-[160px]'}`}>
                            ĐẠT
                          </th>
                          <th rowSpan={2} style={{ background: 'linear-gradient(180deg, #047857 0%, #059669 50%, #10b981 100%)', fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }} className={`text-white px-3 py-3 border-r border-b border-white/20 text-center w-[70px] min-w-[70px] max-w-[70px] whitespace-nowrap lg:sticky z-30 uppercase text-[13.5px] font-black drop-shadow-xs ${activeTab === 'SIEU_THI' ? 'lg:left-[590px]' : 'lg:left-[230px]'}`}>
                            TỶ LỆ
                          </th>
                          {(() => {
                            const yellowCats = categoryConfig.filter(c => c.group === 'ICT').map(c => c.name.toUpperCase().normalize('NFC'));
                            const greenCats = categoryConfig.filter(c => c.group === 'DỊCH VỤ').map(c => c.name.toUpperCase().normalize('NFC'));
                            const blueCats = categoryConfig.filter(c => c.group === 'CE').map(c => c.name.toUpperCase().normalize('NFC'));
                            const yellowSpan = yellowCats.filter(c => categories.includes(c)).length;
                            const greenSpan = greenCats.filter(c => categories.includes(c)).length;
                            const blueSpan = blueCats.filter(c => categories.includes(c)).length;
                            return (
                              <>
                                {yellowSpan > 0 && (
                                  <th
                                    colSpan={yellowSpan}
                                    style={{
                                      background: '#FFC220',
                                      fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif",
                                      fontWeight: 900
                                    }}
                                    className="category-col text-[#1e293b] px-2 py-2.5 border-r border-b border-[#e5a800] text-center uppercase text-[13.5px] font-black tracking-wider"
                                  >
                                    NHÓM ICT ({yellowSpan} NGÀNH HÀNG)
                                  </th>
                                )}
                                {greenSpan > 0 && (
                                  <th
                                    colSpan={greenSpan}
                                    style={{
                                      background: '#70E59D',
                                      fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif",
                                      fontWeight: 900
                                    }}
                                    className="category-col text-[#064e3b] px-4 py-2.5 border-r border-b border-[#52cb81] text-center uppercase text-[13.5px] font-black tracking-wider"
                                  >
                                    NHÓM DỊCH VỤ ({greenSpan} NGÀNH HÀNG)
                                  </th>
                                )}
                                {blueSpan > 0 && (
                                  <th
                                    colSpan={blueSpan}
                                    style={{
                                      background: '#99C2FF',
                                      fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif",
                                      fontWeight: 900
                                    }}
                                    className="category-col text-[#1e3a8a] px-4 py-2.5 border-r border-b border-[#77aaff] text-center uppercase text-[13.5px] font-black tracking-wider"
                                  >
                                    NHÓM CE & GIA DỤNG ({blueSpan} NGÀNH HÀNG)
                                  </th>
                                )}
                              </>
                            );
                          })()}
                        </tr>
                        {/* Sub Category Header row */}
                        <tr>
                          {categories.map((cat, idx) => {
                            const yellowCats = categoryConfig.filter(c => c.group === 'ICT').map(c => c.name.toUpperCase().normalize('NFC'));
                            const greenCats = categoryConfig.filter(c => c.group === 'DỊCH VỤ').map(c => c.name.toUpperCase().normalize('NFC'));
                            const blueCats = categoryConfig.filter(c => c.group === 'CE').map(c => c.name.toUpperCase().normalize('NFC'));

                            let subBg = '#CCE0FF';
                            let subTextColor = 'text-[#1e3a8a]';
                            let subBorderColor = 'border-[#b0ceff]';

                            if (yellowCats.includes(cat)) {
                              subBg = '#FFE599';
                              subTextColor = 'text-[#1e293b]';
                              subBorderColor = 'border-[#eed484]';
                            } else if (greenCats.includes(cat)) {
                              subBg = '#D0F5DB';
                              subTextColor = 'text-[#064e3b]';
                              subBorderColor = 'border-[#b7e9c5]';
                            } else if (blueCats.includes(cat)) {
                              subBg = '#CCE0FF';
                              subTextColor = 'text-[#1e3a8a]';
                              subBorderColor = 'border-[#b0ceff]';
                            }
                            
                            return (
                              <th
                                key={idx}
                                onMouseEnter={() => setHoveredPivotCol(idx)}
                                onMouseLeave={() => setHoveredPivotCol(null)}
                                style={{
                                  background: subBg,
                                  fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif",
                                  fontWeight: 900
                                }}
                                className={`category-col ${subTextColor} ${hoveredPivotCol === idx ? 'brightness-95 ring-2 ring-slate-400' : ''} px-1 py-2 border-r border-b ${subBorderColor} text-center w-[70px] min-w-[70px] max-w-[70px] break-words whitespace-normal leading-tight uppercase text-[11.5px] font-black cursor-pointer transition-all`}
                                title={cat}
                              >
                                {cat}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {finalRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className={cn("group/row transition-all duration-150 h-[44px] hover:bg-emerald-50/70", row.isTotalRow ? cn("font-bold shadow-[0_-2px_4px_rgba(0,0,0,0.05)] border-t-[3px] border-emerald-600 z-20 hover:brightness-95", !isExporting && "sticky bottom-0") : "")} style={row.isTotalRow ? { background: 'linear-gradient(90deg, #047857 0%, #059669 35%, #10b981 70%, #059669 100%)' } : undefined}>
                              {/* Combined columns for Total Row OR Individual Columns */}
                              {row.isTotalRow ? (
                                <td 
                                  colSpan={activeTab === 'SIEU_THI' ? 5 : 2} 
                                  style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900, background: 'linear-gradient(90deg, #047857 0%, #059669 100%)' }} 
                                  className={cn("text-white uppercase px-3 py-[7.5px] border-r border-b border-emerald-700/50 text-center whitespace-nowrap lg:sticky lg:left-0 z-20 text-[15px] tracking-wide drop-shadow-xs")}
                                >
                                  TỔNG CỘNG
                                </td>
                              ) : (
                                <>
                                  {/* STT - sticky */}
                                  <td style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900 }} className="bg-white group-hover/row:bg-emerald-50/80 text-slate-800 px-2 py-[7.5px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky lg:left-0 z-10 text-[14px] font-black transition-colors">
                                    {rowIndex + 1}
                                  </td>
                                  {activeTab === 'SIEU_THI' && (
                                    <>
                                      {/* TỈNH - sticky */}
                                      <td style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900 }} className="bg-white group-hover/row:bg-emerald-50/80 text-slate-900 px-3 py-[7.5px] border-r border-b border-slate-300 whitespace-nowrap lg:sticky lg:left-[40px] z-10 text-[14.5px] text-left transition-colors font-black">
                                        {row.tinh}
                                      </td>
                                      {/* BOSS - sticky */}
                                      <td style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900 }} className="bg-white group-hover/row:bg-emerald-50/80 text-slate-900 px-2 py-[7.5px] border-r border-b border-slate-300 whitespace-nowrap lg:sticky lg:left-[120px] z-10 text-center transition-colors">
                                        <span className="inline-block px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[12px] font-black tracking-tight">
                                          {row.boss}
                                        </span>
                                      </td>
                                      {/* KÊNH - sticky */}
                                      <td style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900 }} className="bg-white group-hover/row:bg-emerald-50/80 px-1.5 py-[7.5px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky lg:left-[220px] z-10 transition-colors">
                                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-black uppercase tracking-wider">
                                          {row.kenh}
                                        </span>
                                      </td>
                                    </>
                                  )}
                                  {/* Province/Store name - sticky */}
                                  <td style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900 }} className={`bg-white group-hover/row:bg-emerald-50/80 text-slate-900 font-black uppercase px-3 py-[7.5px] border-r border-b border-slate-300 whitespace-nowrap lg:sticky z-10 text-[14.5px] transition-colors ${activeTab === 'SIEU_THI' ? 'truncate lg:left-[280px]' : 'lg:left-[40px]'}`}>
                                    {row.prov}
                                  </td>
                                </>
                              )}
                              {/* ĐẠT - sticky */}
                              <td style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900, ...(row.isTotalRow ? { background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)' } : {}) }} className={`${row.isTotalRow ? 'text-white' : 'text-slate-900 bg-white group-hover/row:bg-emerald-50/80'} px-2 py-[7.5px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky z-10 text-[14.5px] font-black transition-colors ${activeTab === 'SIEU_THI' ? 'lg:left-[520px]' : 'lg:left-[160px]'}`}>
                                {row.datCount}/{row.effectiveTotalCats !== undefined ? row.effectiveTotalCats : totalCats}
                              </td>
                              {/* TỶ LỆ - sticky */}
                              <td style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900, ...(row.isTotalRow ? { background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)' } : {}) }} className={` ${row.isTotalRow ? 'text-white' : 'bg-rose-100/70 text-rose-700 group-hover/row:bg-rose-100'} px-2 py-[7.5px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky z-10 text-[14.5px] font-black transition-colors ${activeTab === 'SIEU_THI' ? 'lg:left-[590px]' : 'lg:left-[230px]'}`}>
                                {row.tyLe.toFixed(0)}%
                              </td>
                              
                              {row.catPercents.map((c: any, colIndex: number) => (
                                <td
                                  key={colIndex}
                                  onMouseEnter={() => setHoveredPivotCol(colIndex)}
                                  onMouseLeave={() => setHoveredPivotCol(null)}
                                  style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', sans-serif", fontWeight: 900, ...(row.isTotalRow ? { background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)' } : {}) }}
                                  className={`category-col ${row.isTotalRow ? (c.displayVal !== '-' ? 'text-white' : 'text-emerald-100') : (c.bgColor + ' ' + c.textColor)} ${hoveredPivotCol === colIndex && !row.isTotalRow ? '!brightness-90 ring-1 ring-black/10' : 'group-hover/row:brightness-95'} transition-colors px-1 py-[7.5px] border-r border-b border-slate-300 text-center whitespace-nowrap w-[70px] min-w-[70px] max-w-[70px] text-[15px]`}
                                  title={c.displayVal}
                                >
                                  {c.displayVal}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pivot Pagination Footer removed */}
                  </div>
                </div>
              );
            };

            const renderKhoTable = () => {
              const isMobileClient = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

              const exportSingleTableImage = async (nhItem: string) => {
                const targetElem = individualCardRefs.current[nhItem];
                if (!targetElem) {
                  showNotification('Không tìm thấy bảng để chụp ảnh.', 'error');
                  return;
                }
                setIsExporting(true);
                try {
                  showNotification(`Đang tạo ảnh bảng "${nhItem}"...`, 'info');

                  // Hide scrollbars & export buttons
                  const styleEl = document.createElement('style');
                  styleEl.id = 'hide-scrollbar-temp';
                  styleEl.innerHTML = `
                    *::-webkit-scrollbar { display: none !important; }
                    * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
                    .export-btn, .export-btn * { display: none !important; visibility: hidden !important; opacity: 0 !important; }
                  `;
                  document.head.appendChild(styleEl);

                  const originalWidth = targetElem.style.width;
                  const originalMinWidth = targetElem.style.minWidth;
                  const originalHeight = targetElem.style.height;
                  const originalMaxWidth = targetElem.style.maxWidth;
                  const originalDisplay = targetElem.style.display;
                  const originalPadding = targetElem.style.padding;
                  const originalMargin = targetElem.style.margin;
                  const originalBoxSizing = targetElem.style.boxSizing;
                  const originalBg = targetElem.style.backgroundColor;

                  const exportPadding = 20;
                  const singleWidth = '520px';
                  targetElem.style.width = singleWidth;
                  targetElem.style.minWidth = singleWidth;
                  targetElem.style.maxWidth = singleWidth;
                  targetElem.style.boxSizing = 'border-box';
                  targetElem.style.height = 'max-content';
                  targetElem.style.display = 'block';
                  targetElem.style.padding = `${exportPadding}px`;
                  targetElem.style.margin = '0 auto';
                  targetElem.style.backgroundColor = '#ffffff';

                  await new Promise(r => requestAnimationFrame(r));
                  await new Promise(r => setTimeout(r, 150));

                  // ★ Ensure UTM Avo font is fully loaded before export
                  await ensureFontsReady();

                  const imgData = await htmlToImage.toPng(targetElem, {
                    backgroundColor: '#ffffff',
                    pixelRatio: 2.5,
                    quality: 1.0,
                    cacheBust: false,
                    skipFonts: false,
                    style: {
                      boxShadow: 'none',
                      filter: 'none',
                      backdropFilter: 'none',
                      textShadow: 'none',
                      ...EXPORT_FONT_STYLE,
                    },
                    filter: (node: any) => {
                      if (node?.classList?.contains('export-btn') || node?.closest?.('.export-btn')) return false;
                      return true;
                    }
                  });

                  targetElem.style.width = originalWidth;
                  targetElem.style.minWidth = originalMinWidth;
                  targetElem.style.height = originalHeight;
                  targetElem.style.maxWidth = originalMaxWidth;
                  targetElem.style.display = originalDisplay;
                  targetElem.style.padding = originalPadding;
                  targetElem.style.margin = originalMargin;
                  targetElem.style.boxSizing = originalBoxSizing;
                  targetElem.style.backgroundColor = originalBg;

                  const existingStyle = document.getElementById('hide-scrollbar-temp');
                  if (existingStyle) existingStyle.remove();

                  let autoCopiedSuccess = false;
                  try {
                    const arr = imgData.split(',');
                    const mimeMatch = arr[0].match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                      u8arr[n] = bstr.charCodeAt(n);
                    }
                    const blob = new Blob([u8arr], { type: mime || 'image/png' });

                    if (navigator.clipboard && window.ClipboardItem) {
                      const item = new ClipboardItem({ 'image/png': blob });
                      await navigator.clipboard.write([item]);
                      autoCopiedSuccess = true;
                      showNotification(`🎉 ĐÃ COPY ẢNH BẢNG "${nhItem}"! Nhấn Ctrl+V để Dán`, 'success');
                    }
                  } catch (clipErr) {
                    console.warn('Clipboard write error:', clipErr);
                  }

                  setIsAutoCopied(autoCopiedSuccess);
                  setPreviewImage(imgData);
                } catch (err) {
                  console.error('Lỗi khi chụp ảnh bảng:', err);
                  showNotification('Lỗi khi chụp ảnh bảng, vui lòng thử lại.', 'error');
                } finally {
                  setIsExporting(false);
                }
              };

              const isLuyKeMode = tnbDataMode === 'luyke';
              const dataSrc = isLuyKeMode ? effectiveDataLkSieuThi : effectiveDataRtSieuThi;
              if (dataSrc.length === 0) return null;

              const nganhHangSet = new Set<string>();
              dataSrc.forEach(row => {
                let nh = (row[9] || '').trim().toUpperCase();
                if (nh === 'B.HIỂM TTB') nh = 'BẢO HIỂM';
                if (nh && nh !== '-') nganhHangSet.add(nh);
              });
              const dsNganhHang = Array.from(nganhHangSet).sort();

              const dsTinhList = [
                'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 
                'Trà Vinh', 'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 
                'Bến Tre', 'Đồng Tháp', 'An Giang'
              ];

              const effectiveSelected = (selectedNhomHangList.length > 0
                ? selectedNhomHangList.filter(nh => dsNganhHang.includes(nh))
                : dsNganhHang.slice(0, 4));

              const toggleNganhHang = (nh: string) => {
                if (effectiveSelected.includes(nh)) {
                  const next = effectiveSelected.filter(x => x !== nh);
                  setSelectedNhomHangList(next.length === 0 ? ['__NONE__'] : next);
                } else {
                  const currentClean = selectedNhomHangList.filter(x => x !== '__NONE__');
                  setSelectedNhomHangList([...currentClean, nh]);
                }
              };

              const selectAll = () => setSelectedNhomHangList([...dsNganhHang]);
              const unselectAll = () => setSelectedNhomHangList(['__NONE__']);
              const selectTop4 = () => setSelectedNhomHangList(dsNganhHang.slice(0, 4));

              const now = new Date();
              const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
              const timeStr = isLuyKeMode
                ? `${String(new Date(now.getTime() - 86400000).getDate()).padStart(2, '0')}/${String(new Date(now.getTime() - 86400000).getMonth() + 1).padStart(2, '0')}`
                : `${todayStr} || ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

              const nowCalc = new Date();
              const totalDaysInMonth = new Date(nowCalc.getFullYear(), nowCalc.getMonth() + 1, 0).getDate();
              const daysPassed = Math.max(1, nowCalc.getDate() - 1);

              const selectedListToRender = selectedNhomHangList.includes('__NONE__') ? [] : effectiveSelected;
              const isMulti3Cols = selectedListToRender.length > 4;
              const numCols = selectedListToRender.length === 1 ? 1 : (isMulti3Cols ? 3 : 2);
              const gridInnerWidth = numCols === 1 ? 520 : (numCols === 2 ? 1064 : 1608);
              const exportPadding = 24;
              const targetExportWidth = `${gridInnerWidth + exportPadding * 2}px`;

              const exportNhomHangGridImage = async () => {
                const targetElem = khoTableRef.current;
                if (!targetElem) {
                  showNotification('Không tìm thấy lưới bảng để chụp ảnh.', 'error');
                  return;
                }
                setIsExporting(true);
                try {
                  showNotification(`Đang tạo ảnh lưới bảng...`, 'info');

                  // Hide scrollbars & export buttons
                  const styleEl = document.createElement('style');
                  styleEl.id = 'hide-scrollbar-temp';
                  styleEl.innerHTML = `
                    *::-webkit-scrollbar { display: none !important; }
                    * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
                    .export-btn, .export-btn * { display: none !important; visibility: hidden !important; opacity: 0 !important; }
                  `;
                  document.head.appendChild(styleEl);

                  const originalWidth = targetElem.style.width;
                  const originalMinWidth = targetElem.style.minWidth;
                  const originalHeight = targetElem.style.height;
                  const originalMaxWidth = targetElem.style.maxWidth;
                  const originalDisplay = targetElem.style.display;
                  const originalPadding = targetElem.style.padding;
                  const originalMargin = targetElem.style.margin;
                  const originalBoxSizing = targetElem.style.boxSizing;
                  const originalBg = targetElem.style.backgroundColor;

                  targetElem.style.width = targetExportWidth;
                  targetElem.style.minWidth = targetExportWidth;
                  targetElem.style.maxWidth = targetExportWidth;
                  targetElem.style.boxSizing = 'border-box';
                  targetElem.style.height = 'max-content';
                  targetElem.style.display = 'block';
                  targetElem.style.padding = `${exportPadding}px`;
                  targetElem.style.margin = '0 auto';
                  targetElem.style.backgroundColor = '#ffffff';

                  await new Promise(r => requestAnimationFrame(r));
                  await new Promise(r => setTimeout(r, 150));

                  // ★ Ensure UTM Avo font is fully loaded before export
                  await ensureFontsReady();

                  const elemHeight = targetElem.scrollHeight || 2000;
                  const maxDim = Math.max(parseInt(targetExportWidth, 10), elemHeight);
                  const safePixelRatio = Math.min(2.5, Math.max(1.8, 3840 / maxDim));

                  const imgData = await htmlToImage.toPng(targetElem, {
                    backgroundColor: '#ffffff',
                    pixelRatio: safePixelRatio,
                    quality: 1.0,
                    cacheBust: false,
                    skipFonts: false,
                    style: {
                      boxShadow: 'none',
                      filter: 'none',
                      backdropFilter: 'none',
                      textShadow: 'none',
                      transform: 'none',
                      webkitTransform: 'none',
                      ...EXPORT_FONT_STYLE,
                    },
                    filter: (node: any) => {
                      if (node?.classList?.contains('export-btn') || node?.closest?.('.export-btn')) return false;
                      return true;
                    }
                  });

                  targetElem.style.width = originalWidth;
                  targetElem.style.minWidth = originalMinWidth;
                  targetElem.style.height = originalHeight;
                  targetElem.style.maxWidth = originalMaxWidth;
                  targetElem.style.display = originalDisplay;
                  targetElem.style.padding = originalPadding;
                  targetElem.style.margin = originalMargin;
                  targetElem.style.boxSizing = originalBoxSizing;
                  targetElem.style.backgroundColor = originalBg;

                  const existingStyle = document.getElementById('hide-scrollbar-temp');
                  if (existingStyle) existingStyle.remove();

                  let autoCopiedSuccess = false;
                  try {
                    const arr = imgData.split(',');
                    const mimeMatch = arr[0].match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                      u8arr[n] = bstr.charCodeAt(n);
                    }
                    const blob = new Blob([u8arr], { type: mime || 'image/png' });

                    if (navigator.clipboard && window.ClipboardItem) {
                      const item = new ClipboardItem({ 'image/png': blob });
                      await navigator.clipboard.write([item]);
                      autoCopiedSuccess = true;
                      showNotification(`🎉 ĐÃ COPY ẢNH LƯỚI BẢNG! Nhấn Ctrl+V để Dán`, 'success');
                    }
                  } catch (clipErr) {
                    console.warn('Clipboard write error:', clipErr);
                  }

                  setIsAutoCopied(autoCopiedSuccess);
                  setPreviewImage(imgData);
                } catch (err) {
                  console.error('Lỗi khi chụp ảnh lưới bảng:', err);
                  showNotification('Lỗi khi xuất ảnh lưới bảng, vui lòng thử lại.', 'error');
                } finally {
                  setIsExporting(false);
                }
              };

              const handleAddCard = () => {
                const unselected = dsNganhHang.filter(x => !selectedListToRender.includes(x));
                if (unselected.length > 0) {
                  setSelectedNhomHangList(prev => {
                    const clean = prev.filter(x => x !== '__NONE__');
                    return [...clean, unselected[0]];
                  });
                } else {
                  showNotification('Đã hiển thị tất cả các ngành hàng!', 'info');
                }
              };

              const gridColumnsStyle = isExporting 
                ? (selectedListToRender.length === 1 ? '520px' : (selectedListToRender.length <= 4 ? 'repeat(2, 520px)' : 'repeat(3, 520px)')) 
                : undefined;

              return (
                <div className="flex flex-col gap-3 w-full max-w-none">
                  {/* Sleek Top Action Bar (Đã ẩn danh sách nút ngành hàng rườm rà) */}
                  <div className="w-full bg-white px-5 py-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
                        ĐANG HIỂN THỊ: <span className="text-emerald-600 font-extrabold">{selectedListToRender.length}/{dsNganhHang.length} BẢNG</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={handleAddCard}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
                      >
                        <Plus size={14} /> + THÊM BẢNG
                      </button>
                      <button 
                        onClick={exportNhomHangGridImage}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl font-bold transition-all shadow-md shadow-blue-200 whitespace-nowrap text-xs cursor-pointer ml-1 active:scale-95"
                      >
                        <Download size={15} /> XUẤT ẢNH LƯỚI BẢNG
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Grid Container - 4 bảng (2 trên 2 dưới), >= 6 bảng (3 trên 3 dưới) */}
                  <div ref={khoTableRef} className="w-full bg-slate-50/30 p-0 sm:p-1 rounded-none overflow-x-auto">
                    {selectedListToRender.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-none border border-slate-200 text-slate-400">
                        <Layers size={40} className="mb-3 text-slate-300" />
                        <p className="font-bold text-base">Chưa chọn nhóm hàng nào</p>
                        <p className="text-sm">Hãy nhấn chọn các nhóm hàng ở trên để hiển thị bảng.</p>
                      </div>
                    ) : (
                      <div 
                        style={gridColumnsStyle ? {
                          display: 'grid',
                          gridTemplateColumns: gridColumnsStyle,
                          gap: '24px',
                          width: `${gridInnerWidth}px`,
                          minWidth: `${gridInnerWidth}px`,
                          maxWidth: `${gridInnerWidth}px`,
                          margin: '0 auto',
                          boxSizing: 'border-box',
                          alignItems: 'start'
                        } : undefined}
                        className={!gridColumnsStyle ? (
                          selectedListToRender.length <= 4
                            ? "grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-none items-start"
                            : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full max-w-none items-start"
                        ) : "w-full max-w-none items-start justify-center"}
                      >
                        {selectedListToRender.map(nhItem => {
                          const defaultKenhList = sieuThiFilterKenh.length > 0 ? sieuThiFilterKenh : ['TGD'];
                          const cardKenhList = cardKenhOverrides[nhItem] || defaultKenhList;
                          const ALL_KENH_LIST = ['TGD', 'ĐML', 'ĐMM', 'ĐMS', 'AAR'];

                          // Filter data for this specific nhItem and card's Kênh list
                          const filteredForNh = dataSrc.filter(row => {
                            const rowKenh = (row[7] || '').trim().toUpperCase();
                            let isValidKenh = false;
                            if (cardKenhList.length === ALL_KENH_LIST.length || cardKenhList.includes('ALL')) {
                              isValidKenh = ALL_KENH_LIST.includes(rowKenh);
                            } else {
                              if (cardKenhList.includes(rowKenh)) isValidKenh = true;
                              if (cardKenhList.includes('TGD') && rowKenh === 'AAR') isValidKenh = true;
                            }
                            if (!isValidKenh) return false;

                            let rowNganhHang = (row[9] || '').trim().toUpperCase();
                            if (rowNganhHang === 'B.HIỂM TTB') rowNganhHang = 'BẢO HIỂM';
                            return rowNganhHang === nhItem;
                          });

                          const aggregated: Record<string, { target: number, real: number }> = {};
                          dsTinhList.forEach(t => aggregated[t.toUpperCase()] = { target: 0, real: 0 });

                          filteredForNh.forEach(row => {
                            const tinh = (row[0] || '').trim().toUpperCase();
                            if (!aggregated[tinh]) return;
                            aggregated[tinh].target += parseNum(row[3]);
                            aggregated[tinh].real += parseNum(row[2]);
                          });

                          const tableData = dsTinhList.map(tinhName => {
                            const t = tinhName.toUpperCase();
                            const target = aggregated[t]?.target || 0;
                            const real = aggregated[t]?.real || 0;
                            const ht = target > 0 ? (real / target) * 100 : 0;
                            return { tinh: tinhName, target, real, ht };
                          });

                          tableData.sort((a, b) => {
                            if (b.ht !== a.ht) return b.ht - a.ht;
                            return b.real - a.real;
                          });

                          let totalTarget = 0;
                          let totalReal = 0;
                          tableData.forEach(r => {
                            totalTarget += r.target;
                            totalReal += r.real;
                          });
                          const totalHtRaw = totalTarget > 0 ? (totalReal / totalTarget) * 100 : 0;
                          const totalForecast = totalTarget > 0 ? ((totalReal / daysPassed) * totalDaysInMonth / totalTarget) * 100 : 0;
                          const totalHtDisplay = isLuyKeMode ? totalForecast : totalHtRaw;

                          const kenhDisplayText = cardKenhList.length === ALL_KENH_LIST.length
                            ? 'ALL KÊNH'
                            : cardKenhList.join(', ');

                          const getCategoryClass = (name: string) => {
                            const len = (name || '').trim().length;
                            if (len > 32) return 'text-[13px] sm:text-[15px] md:text-[16.5px] tracking-tighter';
                            if (len > 22) return 'text-[15px] sm:text-[18px] md:text-[20px] tracking-tight';
                            if (len > 14) return 'text-[17.5px] sm:text-[21px] md:text-[23px] tracking-tight';
                            if (len > 8) return 'text-[20.5px] sm:text-[24px] md:text-[26px]';
                            return 'text-[22.5px] sm:text-[26px] md:text-[28px]';
                          };

                          return (
                            <div 
                              key={nhItem} 
                              ref={(el) => { individualCardRefs.current[nhItem] = el; }}
                              style={isExporting ? { width: '520px', minWidth: '520px', maxWidth: '520px', boxSizing: 'border-box', margin: '0' } : undefined}
                              className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-300 flex flex-col w-full max-w-none shadow-xs"
                            >
                              {/* Mini Action Toolbar (KÊNH, Nhận xét, Xóa bảng, Chụp ảnh) */}
                              <div className="flex items-center justify-between gap-2 mb-2 px-0.5 export-btn no-capture">
                                {/* Left: KÊNH Multi-Select Checkboxes Dropdown Pill */}
                                <div className="relative inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenKenhDropdownFor(openKenhDropdownFor === nhItem ? null : nhItem);
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-full text-[11px] sm:text-xs font-black text-slate-700 transition-all shadow-2xs cursor-pointer active:scale-95"
                                    title="Bấm để chọn nhiều kênh"
                                  >
                                    <span className="text-slate-400 font-extrabold uppercase text-[9.5px] sm:text-[10px]">KÊNH:</span>
                                    <span className="text-slate-900 font-black uppercase max-w-[90px] sm:max-w-[130px] truncate">
                                      {kenhDisplayText}
                                    </span>
                                    <ChevronDown size={13} className={cn("text-slate-500 transition-transform duration-200 shrink-0", openKenhDropdownFor === nhItem && "rotate-180")} />
                                  </button>

                                  {/* Multi-Select Checkbox Popover */}
                                  {openKenhDropdownFor === nhItem && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-40 cursor-default" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenKenhDropdownFor(null);
                                        }} 
                                      />
                                      <div 
                                        className="absolute z-50 top-full mt-1.5 left-0 w-56 sm:w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 flex flex-col gap-1 export-btn no-capture text-left animate-in fade-in zoom-in-95 duration-100"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="px-1 py-0.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between pb-1 mb-1">
                                          <span>CHỌN NHIỀU KÊNH</span>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setCardKenhOverrides(prev => ({ ...prev, [nhItem]: [...ALL_KENH_LIST] }));
                                              }}
                                              className="text-[10px] text-emerald-600 hover:underline font-extrabold cursor-pointer"
                                            >
                                              Tất cả
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setCardKenhOverrides(prev => ({ ...prev, [nhItem]: ['TGD'] }));
                                              }}
                                              className="text-[10px] text-slate-500 hover:underline font-bold cursor-pointer"
                                            >
                                              TGD
                                            </button>
                                          </div>
                                        </div>

                                        {/* Checkbox Options */}
                                        <div className="flex flex-col gap-1">
                                          {ALL_KENH_LIST.map(kenhOpt => {
                                            const isChecked = cardKenhList.includes(kenhOpt);
                                            return (
                                              <label
                                                key={kenhOpt}
                                                className={cn(
                                                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border",
                                                  isChecked 
                                                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-800" 
                                                    : "border-transparent text-slate-700 hover:bg-slate-50"
                                                )}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => {
                                                    setCardKenhOverrides(prev => {
                                                      const current = prev[nhItem] || defaultKenhList;
                                                      let next: string[];
                                                      if (current.includes(kenhOpt)) {
                                                        next = current.filter(x => x !== kenhOpt);
                                                        if (next.length === 0) next = ['TGD']; // keep at least 1
                                                      } else {
                                                        next = [...current, kenhOpt];
                                                      }
                                                      return { ...prev, [nhItem]: next };
                                                    });
                                                  }}
                                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600 shrink-0"
                                                />
                                                <span className="font-extrabold uppercase">{kenhOpt}</span>
                                                {kenhOpt === 'TGD' && <span className="text-[10px] text-slate-400 font-medium ml-auto">(Gồm AAR)</span>}
                                              </label>
                                            );
                                          })}
                                        </div>

                                        <div className="border-t border-slate-100 pt-2 mt-1 flex items-center justify-between">
                                          <span className="text-[11px] text-slate-400 font-bold">Đã chọn: {cardKenhList.length}/{ALL_KENH_LIST.length}</span>
                                          <button
                                            type="button"
                                            onClick={() => setOpenKenhDropdownFor(null)}
                                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                                          >
                                            ✓ Xong
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Right: 3 Action Icons (💬 Nhận xét, ❌ Xoá bảng, 📷 Chụp ảnh) */}
                                <div className="flex items-center gap-1.5">
                                  {/* 💬 Note / Comment Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const kenhTitle = cardKenhList.join(', ');
                                      setActiveCategoryFeedback({
                                        catName: nhItem,
                                        tableData,
                                        totalTarget,
                                        totalReal,
                                        totalHt: totalHtDisplay,
                                        kenhTitle
                                      });
                                      setCatFeedbackCustomText(null);
                                    }}
                                    title={`Nhận xét / Ghi chú ngành "${nhItem}"`}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 shadow-2xs bg-[#fef9c3] hover:bg-amber-100 text-amber-700 border-amber-200"
                                  >
                                    <MessageSquare size={15} />
                                  </button>

                                  {/* ❌ Delete Table from View */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = selectedNhomHangList.filter(x => x !== nhItem && x !== '__NONE__');
                                      setSelectedNhomHangList(next.length === 0 ? ['__NONE__'] : next);
                                    }}
                                    title={`Xoá bảng "${nhItem}"`}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center bg-[#fee2e2] hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                  >
                                    <X size={15} strokeWidth={2.5} />
                                  </button>

                                  {/* 📷 Single Table Camera Export */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      exportSingleTableImage(nhItem);
                                    }}
                                    title={`Chụp ảnh trọn vẹn bảng ${nhItem}`}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center bg-[#0284c7] hover:bg-sky-600 text-white transition-all cursor-pointer active:scale-95 shadow-sm shadow-sky-200"
                                  >
                                    <Camera size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Unified Emerald Gradient Header Banner - Square (Không bo cạnh) */}
                              <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] py-2.5 sm:py-3 px-3 sm:px-4 text-white relative rounded-none mb-2 sm:mb-3 shadow-xs">
                                <div className="flex flex-col items-center justify-center text-center">
                                  {/* Direct Category Custom Dropdown Selector on Title */}
                                  <div className="relative inline-flex items-center justify-center group max-w-full">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenNhDropdownFor(openNhDropdownFor === nhItem ? null : nhItem);
                                      }}
                                      className={cn(
                                        "inline-flex items-center justify-center gap-1.5 sm:gap-2 text-[#FEF08A] font-black uppercase tracking-wide cursor-pointer text-center outline-none transition-all py-0.5 px-1.5 sm:px-2 max-w-full active:scale-95 hover:opacity-90",
                                        getCategoryClass(nhItem)
                                      )}
                                      style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}
                                      title="Bấm để đổi ngành hàng"
                                    >
                                      <span className="whitespace-normal leading-tight">{nhItem}</span>
                                      <ChevronDown size={20} className={cn("text-[#FEF08A] transition-transform duration-200 shrink-0 opacity-80 group-hover:opacity-100", openNhDropdownFor === nhItem && "rotate-180")} />
                                    </button>

                                    {/* Compact Popover Dropdown Menu with Search */}
                                    {openNhDropdownFor === nhItem && (
                                      <>
                                        {/* Click outside backdrop */}
                                        <div 
                                          className="fixed inset-0 z-40 cursor-default" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenNhDropdownFor(null);
                                            setNhPopoverSearchTerm('');
                                          }} 
                                        />
                                        <div 
                                          className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 w-64 sm:w-72 max-h-80 bg-white rounded-xl shadow-2xl border-2 border-emerald-500 p-2 flex flex-col gap-1.5 export-btn no-capture text-left"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="px-2 py-0.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center justify-between">
                                            <span>CHỌN NGÀNH HÀNG</span>
                                            <span className="text-emerald-700 font-bold">
                                              {dsNganhHang.filter(nh => nh.toLowerCase().includes(nhPopoverSearchTerm.trim().toLowerCase())).length}/{dsNganhHang.length} mục
                                            </span>
                                          </div>

                                          {/* Search Box */}
                                          <div className="relative">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
                                            <input
                                              type="text"
                                              value={nhPopoverSearchTerm}
                                              onChange={(e) => setNhPopoverSearchTerm(e.target.value)}
                                              placeholder="Gõ tìm ngành hàng..."
                                              autoFocus
                                              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 uppercase tracking-tight"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            {nhPopoverSearchTerm && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setNhPopoverSearchTerm('');
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                                              >
                                                <X size={12} />
                                              </button>
                                            )}
                                          </div>

                                          <div className="overflow-y-auto max-h-56 flex flex-col gap-0.5 pr-0.5">
                                            {dsNganhHang
                                              .filter(nh => nh.toLowerCase().includes(nhPopoverSearchTerm.trim().toLowerCase()))
                                              .map(nh => {
                                                const isCurrent = nh === nhItem;
                                                return (
                                                  <button
                                                    key={nh}
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (nh !== nhItem) {
                                                        setSelectedNhomHangList(prev => {
                                                          const clean = prev.filter(x => x !== '__NONE__');
                                                          const idx = clean.indexOf(nhItem);
                                                          if (idx !== -1) {
                                                            const next = [...clean];
                                                            next[idx] = nh;
                                                            return next;
                                                          }
                                                          return [...clean, nh];
                                                        });
                                                      }
                                                      setOpenNhDropdownFor(null);
                                                      setNhPopoverSearchTerm('');
                                                    }}
                                                    className={cn(
                                                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                                                      isCurrent 
                                                        ? "bg-emerald-600 text-white font-black shadow-2xs" 
                                                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                    )}
                                                  >
                                                    <span className="truncate">{nh}</span>
                                                    {isCurrent && <span className="text-white font-black text-xs ml-1 shrink-0">✓</span>}
                                                  </button>
                                                );
                                              })}
                                            {dsNganhHang.filter(nh => nh.toLowerCase().includes(nhPopoverSearchTerm.trim().toLowerCase())).length === 0 && (
                                              <div className="py-3 text-center text-xs font-bold text-slate-400">
                                                Không tìm thấy ngành hàng
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-center gap-2 text-[11px] sm:text-[13.5px] font-bold text-white mt-1 whitespace-nowrap tracking-normal" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                                    <span>⚡ {isLuyKeMode ? 'Luỹ kế' : 'Realtime'}: {timeStr}</span>
                                    <span className="opacity-60">||</span>
                                    <span className="text-[#FEF08A] font-black uppercase">{kenhDisplayText}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Modern Capsule Table - Square (Không bo cạnh) & Khoảng trắng phân cách */}
                              <div className="overflow-x-auto w-full grow border border-slate-300 rounded-none shadow-xs">
                                <table className="w-full table-fixed border-collapse bg-white text-[12.5px] sm:text-[16px]" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                                  <colgroup>
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '18%' }} />
                                    <col style={{ width: '18%' }} />
                                    <col style={{ width: '16%' }} />
                                    <col style={{ width: '12%' }} />
                                  </colgroup>
                                  <thead>
                                    <tr className="text-white h-[38px] sm:h-[46px]">
                                      <th className="px-0.5 sm:px-1 py-0 text-[11px] sm:text-[13.5px] font-black uppercase text-center border-r border-emerald-500/60 bg-[#047857] whitespace-nowrap overflow-hidden">STT</th>
                                      <th className="px-1.5 sm:px-2.5 py-0 text-[11px] sm:text-[13.5px] font-black uppercase text-left border-r border-emerald-500/60 bg-[#059669] whitespace-nowrap overflow-hidden">TỈNH</th>
                                      <th className="px-0.5 sm:px-1 py-0 text-[11px] sm:text-[13.5px] font-black uppercase text-center border-r border-emerald-500/60 bg-[#047857] whitespace-nowrap overflow-hidden">TARGET</th>
                                      <th className="px-0.5 sm:px-1 py-0 text-[11px] sm:text-[13.5px] font-black uppercase text-center border-r border-emerald-500/60 bg-[#047857] whitespace-nowrap overflow-hidden">{isLuyKeMode ? 'L.KẾ' : 'REAL'}</th>
                                      <th className="px-0.5 sm:px-1 py-0 text-[11px] sm:text-[13.5px] font-black uppercase text-center border-r border-emerald-500/60 bg-[#047857] whitespace-nowrap overflow-hidden">{isLuyKeMode ? '% D.K' : '%HT'}</th>
                                      <th className="px-0.5 sm:px-1 py-0 text-[11px] sm:text-[13.5px] font-black uppercase text-center border-emerald-500/60 bg-[#047857] whitespace-nowrap overflow-hidden">XH</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tableData.map((row, idx) => {
                                      const isTop = idx < 3;
                                      const isBot = idx >= tableData.length - 3;
                                      const forecastHt = row.target > 0 ? ((row.real / daysPassed) * totalDaysInMonth / row.target) * 100 : (row.real > 0 ? 100 : 0);
                                      const displayHt = isLuyKeMode ? forecastHt : row.ht;
                                      const htDisplay = `${displayHt.toFixed(0)}%`;
                                      
                                      return (
                                        <tr key={idx} className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors h-[42px] sm:h-[51px]">
                                          <td className="px-1 py-0.5 sm:py-1 text-center text-slate-500 font-extrabold text-[12.5px] sm:text-[15.5px] border-r border-slate-200 whitespace-nowrap">{idx + 1}</td>
                                          <td className="px-1.5 sm:px-3 py-0.5 sm:py-1 text-[#0369a1] font-black text-[12.5px] sm:text-[16px] border-r border-slate-200 whitespace-nowrap tracking-tight text-left">{row.tinh}</td>
                                          <td className="px-1 py-0.5 sm:py-1 text-center text-slate-900 font-extrabold text-[12.5px] sm:text-[16px] border-r border-slate-200 whitespace-nowrap">{Math.round(row.target).toLocaleString()}</td>
                                          <td className="px-1 py-0.5 sm:py-1 text-center text-red-600 font-black text-[12.5px] sm:text-[16px] border-r border-slate-200 whitespace-nowrap">{Math.round(row.real).toLocaleString()}</td>
                                          <td className="px-0.5 py-0.5 sm:py-1 text-center border-r border-slate-200 whitespace-nowrap">
                                            <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black leading-none text-[11.5px] sm:text-[14px] ${displayHt >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'}`}>
                                              {htDisplay}
                                            </span>
                                          </td>
                                          <td className={`px-1 py-0.5 sm:py-1 text-center font-black text-[12px] sm:text-[15px] whitespace-nowrap ${isTop ? 'text-[#0284c7]' : (isBot ? 'text-red-600' : 'text-slate-400')}`}>{isTop ? 'Top' : (isBot ? 'Bot' : '')}</td>
                                        </tr>
                                      );
                                    })}
                                    <tr className="bg-[#059669] text-white font-black text-[13.5px] sm:text-[17px] h-[44px] sm:h-[53px]">
                                      <td colSpan={2} className="px-2 sm:px-3 py-1 text-center font-black border-r border-emerald-600 whitespace-nowrap">Tổng</td>
                                      <td className="px-1 py-1 text-center font-black border-r border-emerald-600 whitespace-nowrap">{Math.round(totalTarget).toLocaleString()}</td>
                                      <td className="px-1 py-1 text-center font-black border-r border-emerald-600 whitespace-nowrap">{Math.round(totalReal).toLocaleString()}</td>
                                      <td className="px-0.5 py-1 text-center border-r border-emerald-600 whitespace-nowrap">
                                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black leading-none text-[11.5px] sm:text-[14px] ${totalHtDisplay >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'}`}>
                                          {totalHtDisplay.toFixed(0)}%
                                        </span>
                                      </td>
                                      <td className="px-1 py-1 text-center font-black"></td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Comment / Note Box (When Open) */}
                              {cardShowComment[nhItem] && (
                                <div className="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-200 rounded-none flex flex-col gap-1.5 export-btn">
                                  <div className="flex items-center justify-between text-[11px] font-black text-amber-800 uppercase">
                                    <span className="flex items-center gap-1.5"><MessageSquare size={13} /> GHI CHÚ / NHẬN XÉT:</span>
                                    <button 
                                      onClick={() => setCardShowComment(prev => ({ ...prev, [nhItem]: false }))}
                                      className="text-amber-600 hover:text-amber-800 text-xs font-bold no-capture cursor-pointer"
                                    >
                                      ✕ Đóng
                                    </button>
                                  </div>
                                  <textarea
                                    value={cardComments[nhItem] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCardComments(prev => ({ ...prev, [nhItem]: val }));
                                    }}
                                    placeholder="Nhập ghi chú hoặc nhận xét cho ngành hàng này..."
                                    className="w-full bg-white border border-amber-200 p-2 text-xs font-sans font-medium text-slate-800 outline-none rounded-none resize-y min-h-[55px]"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            };

            const renderChiTietTable = () => {
              const isLuyKeMode = tnbDataMode === 'luyke';
              const dataSrc = isLuyKeMode ? effectiveDataLkSieuThi : effectiveDataRtSieuThi;
              if (dataSrc.length === 0) return null;
              
              // Extract unique Ngành Hàng for the filter
              const nganhHangSet = new Set<string>();
              dataSrc.forEach(row => {
                const nh = (row[9] || '').trim().toUpperCase(); // Ngành Hàng is row[9]
                if (nh && nh !== '-') nganhHangSet.add(nh);
              });
              const dsNganhHang = Array.from(nganhHangSet).sort();
              
              const dsTinhList = [
                'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 
                'Trà Vinh', 'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 
                'Bến Tre', 'Đồng Tháp', 'An Giang'
              ];

              const filtered = dataSrc.filter(row => {
                const rowTinh = (row[0] || '').trim(); // Tỉnh is row[0]
                if (!rowTinh) return false;
                
                const rowKenh = (row[7] || '').trim().toUpperCase(); // Kênh is row[7]
                const rowNganhHang = (row[9] || '').trim().toUpperCase(); // Ngành hàng is row[9]
                
                if (rtFilterTinh && rtFilterTinh !== 'TẤT CẢ TỈNH') {
                  if (rowTinh.toLowerCase() !== rtFilterTinh.toLowerCase()) return false;
                }
                if (rtFilterKenh.length > 0) {
                  if (!rtFilterKenh.includes(rowKenh)) return false;
                }
                if (rtFilterNganhHang && rtFilterNganhHang !== 'TẤT CẢ NGÀNH HÀNG') {
                  if (rowNganhHang !== rtFilterNganhHang) return false;
                }
                
                const rowTenSieuThi = (row[6] || '').trim().toLowerCase();
                if (rowTenSieuThi.includes('(kho bán hàng lưu động)')) {
                  return false;
                }
                
                return true;
              });



              const aggregateRows = (rows: any[]) => {
                const map = new Map<string, any[]>();
                rows.forEach(row => {
                  const st = (row[6] || '').trim().toUpperCase();
                  if (!map.has(st)) {
                    map.set(st, [...row]);
                  } else {
                    const existing = map.get(st)!;
                    const dtlk = parseNum(existing[2]) + parseNum(row[2]);
                    const target = parseNum(existing[3]) + parseNum(row[3]);
                    
                    existing[2] = dtlk.toString();
                    existing[3] = target.toString();
                    if (target > 0) {
                      existing[4] = ((dtlk / target) * 100).toFixed(0) + '%';
                    } else if (dtlk > 0) {
                      existing[4] = '100%';
                    } else {
                      existing[4] = '0%';
                    }
                  }
                });
                return Array.from(map.values());
              };

              const aggregatedFiltered = aggregateRows(filtered);

              const kenhOrder: Record<string, number> = { 'ĐML': 1, 'ĐMM': 2, 'ĐMS': 3, 'TGD': 4 };
              
              // Sort by %HT desc
              const sortedData = [...aggregatedFiltered].sort((a, b) => {
                const htA = parseFloat((a[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                const htB = parseFloat((b[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                return htB - htA;
              });
              
              // Group by Kênh (row[7])
              const groups: Record<string, any[]> = {};
              sortedData.forEach(row => {
                const kenh = (row[7] || '').trim().toUpperCase();
                if (!groups[kenh]) groups[kenh] = [];
                groups[kenh].push(row);
              });
              
              const kenhListToDisplay = Object.keys(groups)
                .sort((a, b) => (kenhOrder[a] || 99) - (kenhOrder[b] || 99));
              
              const now = new Date();
              const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
              const timeStr = isLuyKeMode
                ? `${String(new Date(now.getTime() - 86400000).getDate()).padStart(2, '0')}/${String(new Date(now.getTime() - 86400000).getMonth() + 1).padStart(2, '0')}`
                : `${todayStr} || ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

              const handleNhanXet = () => {
                const targetKenhOrder: Record<string, number> = { 'ĐML': 1, 'ĐMM': 2, 'ĐMS': 3, 'TGD': 4 };
                const bossesByKenh: Record<string, Set<string>> = {
                  'TGD': new Set<string>(),
                  'ĐMS': new Set<string>(),
                  'ĐMM': new Set<string>(),
                  'ĐML': new Set<string>()
                };

                const addedBosses = new Set<string>();

                sortedData.forEach(row => {
                  const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                  const htVal = parseFloat(htValStr);
                  if (!isNaN(htVal) && htVal < 100) {
                    const bossName = row[8] || '';
                    const match = bossName.match(/\d+/);
                    if (match) {
                      const kenh = (row[7] || '').trim().toUpperCase();
                      const bossTag = `@${match[0]}`;
                      if (!addedBosses.has(bossTag)) {
                        addedBosses.add(bossTag);
                        if (bossesByKenh[kenh]) {
                          bossesByKenh[kenh].add(bossTag);
                        } else {
                          bossesByKenh[kenh] = new Set<string>([bossTag]);
                        }
                      }
                    }
                  }
                });

                const finalBossList: string[] = [];
                const sortedKenhKeys = Object.keys(bossesByKenh).sort((a, b) => {
                  const orderA = targetKenhOrder[a] || 99;
                  const orderB = targetKenhOrder[b] || 99;
                  return orderA - orderB;
                });

                sortedKenhKeys.forEach(kenh => {
                  bossesByKenh[kenh].forEach(bossTag => {
                    finalBossList.push(bossTag);
                  });
                });

                if (finalBossList.length === 0) {
                  showNotification('Không có Boss nào có %HT dưới 100% để nhận xét.', 'error');
                  return;
                }

                const nganhHangText = rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'TẤT CẢ NGÀNH HÀNG';
                const nhanXetText = `🚨 SIÊU THỊ CHƯA HIỆU QUẢ NGÀNH HÀNG "${nganhHangText}"\n${finalBossList.join('\n')}`;
                
                navigator.clipboard.writeText(nhanXetText).then(() => {
                  showNotification('Đã copy nhận xét vào khay nhớ tạm!', 'success');
                }).catch(err => {
                  console.error('Failed to copy: ', err);
                  showNotification('Không thể copy text, vui lòng thử lại.', 'error');
                });
              };

              // Logic cho bảng XẾP HẠNG
              const filteredXepHang = dataSrc.filter(row => {
                const rowTinh = (row[0] || '').trim();
                if (!rowTinh) return false;
                
                if (rtFilterTinhXepHang && rtFilterTinhXepHang !== 'TẤT CẢ TỈNH') {
                  if (rowTinh.toLowerCase() !== rtFilterTinhXepHang.toLowerCase()) return false;
                }
                
                const rowKenh = (row[7] || '').trim().toUpperCase();
                if (rtFilterKenhXepHang.length > 0) {
                  if (!rtFilterKenhXepHang.includes(rowKenh)) return false;
                }
                
                const rowNganhHang = (row[9] || '').trim().toUpperCase();
                if (rtFilterNganhHang && rtFilterNganhHang !== 'TẤT CẢ NGÀNH HÀNG') {
                  if (rowNganhHang !== rtFilterNganhHang) return false;
                }
                
                const rowTenSieuThi = (row[6] || '').trim().toLowerCase();
                if (rowTenSieuThi.includes('(kho bán hàng lưu động)')) {
                  return false;
                }
                
                return true;
              });

              const aggregatedXepHang = aggregateRows(filteredXepHang);

              const sortedXepHang = [...aggregatedXepHang].sort((a, b) => {
                const htA = parseFloat((a[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                const htB = parseFloat((b[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                return htB - htA;
              });

              const rawTop20Count = Math.round(sortedXepHang.length * 0.2);
              const top20Count = Math.min(20, rawTop20Count);
              const top20Data = sortedXepHang.slice(0, top20Count);
              const bot20Data = top20Count > 0 ? sortedXepHang.slice(-top20Count) : [];

              const handleNhanXetXepHang = () => {
                const targetBosses = new Set<string>();
                bot20Data.forEach(row => {
                  const bossName = row[8] || '';
                  const match = bossName.match(/\d+/);
                  if (match) {
                    targetBosses.add(`@${match[0]}`);
                  }
                });
                
                if (targetBosses.size === 0) {
                  showNotification('Không có Boss nào trong Bot 20% để nhận xét.', 'error');
                  return;
                }

                const nganhHangText = rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'TẤT CẢ NGÀNH HÀNG';
                const nhanXetText = `🚨 SIÊU THỊ BOTTOM 20% NGÀNH HÀNG (${nganhHangText})\n${Array.from(targetBosses).join('\n')}`;
                
                navigator.clipboard.writeText(nhanXetText).then(() => {
                  showNotification('Đã copy nhận xét vào khay nhớ tạm!', 'success');
                }).catch(err => {
                  console.error('Failed to copy: ', err);
                  showNotification('Không thể copy text, vui lòng thử lại.', 'error');
                });
              };

              return (
                <div className="flex flex-col gap-6 mt-8 w-full">
                  <div className="flex flex-col xl:flex-row gap-6 items-start justify-start w-full">
                    <div className="w-full max-w-max xl:w-auto flex flex-col gap-4">
                      {!isExporting && (
                        <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <select 
                              className="w-full sm:w-auto min-w-[170px] px-4 py-2.5 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-[15px] font-black shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%231d4ed8%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-no-repeat bg-[position:right_12px_center] pr-10"
                              value={rtFilterTinh}
                              onChange={(e) => setRtFilterTinh(e.target.value)}
                            >
                              <option value="" className="bg-white text-slate-800 font-bold">TẤT CẢ TỈNH</option>
                              {dsTinhList.map(t => <option key={t} value={t} className="bg-white text-slate-800 font-bold">{t}</option>)}
                            </select>
                            <select 
                              className="w-full sm:w-auto min-w-[200px] px-4 py-2.5 bg-white text-emerald-700 border-2 border-emerald-500 rounded-xl text-[15px] font-black shadow-md shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23059669%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-no-repeat bg-[position:right_12px_center] pr-10"
                              value={rtFilterNganhHang}
                              onChange={(e) => setRtFilterNganhHang(e.target.value)}
                            >
                              <option value="" className="bg-white text-slate-800 font-bold">TẤT CẢ NGÀNH HÀNG</option>
                              {dsNganhHang.map(nh => <option key={nh} value={nh} className="bg-white text-slate-800 font-bold">{nh}</option>)}
                            </select>
                            <div className="flex flex-wrap items-center gap-2">
                              {['ĐML', 'ĐMM', 'ĐMS', 'TGD'].map(k => (
                                <label key={k} className={`flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 border-2 rounded-xl text-[15px] font-black transition-all shadow-sm ${rtFilterKenh.includes(k) ? 'border-blue-500 text-blue-700 shadow-blue-500/20 bg-blue-50/30' : 'border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                                  <input 
                                    type="checkbox" 
                                    className={`w-[18px] h-[18px] rounded focus:ring-blue-500 cursor-pointer ${rtFilterKenh.includes(k) ? 'text-blue-600 border-blue-500' : 'border-slate-300'}`}
                                    checked={rtFilterKenh.includes(k)}
                                    onChange={(e) => {
                                      if (e.target.checked) setRtFilterKenh([...rtFilterKenh, k]);
                                      else setRtFilterKenh(rtFilterKenh.filter(x => x !== k));
                                    }}
                                  />
                                  <span>{k}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <button 
                              onClick={handleNhanXet}
                              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm cursor-pointer"
                            >
                              <MessageSquare size={16} /> TAG TÊN BOSS
                            </button>
                            <button 
                              onClick={() => exportImageShort(chiTietTableRef)} 
                              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm cursor-pointer"
                            >
                              <Download size={16} /> XUẤT ẢNH
                            </button>
                          </div>
                        </div>
                      )}
                      <div ref={chiTietTableRef} className={isExporting ? 'bg-white p-6 w-max inline-block' : 'w-full overflow-hidden shadow-lg shadow-slate-200/50 rounded-xl border border-slate-200'}>
                      <div className="w-full">
                        <table className="w-full border-collapse text-[15px] bg-white" style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }}>
                          <thead className="sticky top-0 z-20">
                            <tr>
                              <th colSpan={4} style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-4 py-4 sm:py-5 text-center font-black text-[36px] sm:text-[44px] lg:text-[48px] uppercase tracking-wider whitespace-nowrap shadow-xs">
                                {rtFilterTinh && rtFilterTinh !== 'TẤT CẢ TỈNH' ? `${isLuyKeMode ? 'LUỸ KẾ' : 'REALTIME'} THI ĐUA - ${rtFilterTinh.toUpperCase()}` : (isLuyKeMode ? 'LUỸ KẾ THI ĐUA' : 'REALTIME THI ĐUA')}
                              </th>
                              <th colSpan={3} style={{ background: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', color: '#ffffff' }} className="px-4 py-4 sm:py-5 text-right font-black text-[28px] sm:text-[36px] lg:text-[40px] whitespace-nowrap shadow-xs">
                                {timeStr}
                              </th>
                            </tr>
                            <tr className="bg-white" style={{ height: '4px' }}>
                              <th colSpan={7} className="p-0 border-0"></th>
                            </tr>
                            <tr className="shadow-sm">
                              <th colSpan={7} style={{ background: 'linear-gradient(90deg, #047857 0%, #059669 50%, #10b981 100%)', color: '#ffffff' }} className="px-4 py-3 sm:py-3.5 text-center font-black uppercase whitespace-nowrap border-b border-emerald-600 text-[28px] sm:text-[34px] lg:text-[38px] tracking-wide">
                                {rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'TẤT CẢ NGÀNH HÀNG'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {kenhListToDisplay.map((kenh) => {
                              const groupData = groups[kenh];
                              return (
                                <React.Fragment key={kenh}>
                                  <tr className="shadow-sm sticky top-[98px] z-10">
                                    <th style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30">TỈNH</th>
                                    <th style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30">BOSS</th>
                                    <th style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30">KÊNH</th>
                                    <th style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30">SIÊU THỊ</th>
                                    <th style={{ background: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[60px] max-w-[60px] w-[60px]">TAR</th>
                                    <th style={{ background: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[60px] max-w-[60px] w-[60px]">{isLuyKeMode ? 'L.KẾ' : 'Real'}</th>
                                    <th style={{ background: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap min-w-[60px] max-w-[60px] w-[60px]">%HT</th>
                                  </tr>
                                  {groupData.map((row, idx) => {
                                    const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                                     const isSimCategory = (row[9] || '').toString().toUpperCase().includes('SIM');
                                     const isBillionScale = (() => { const t = parseNum((row[3] || '0').trim()); return ((t >= 5000 && t % 1000 === 0) ? t / 1000 : t) < 10; })() && !isSimCategory;
                                    const htValRaw = parseFloat(htValStr);
                                    const isRedHT = isNaN(htValRaw) || htValRaw < 100;
                                    const htDisplay = isNaN(htValRaw) ? row[4] : `${Math.round(htValRaw)}%`;
                                    
                                    const realValStr = (row[2] || '0').trim(); 
                                    const realValRaw = parseNum(realValStr);
                                    const isZeroReal = isNaN(realValRaw) || realValRaw === 0;
                                    const realDisplay = isNaN(realValRaw)
                                      ? row[2]
                                      : isLuyKeMode
                                        ? formatLuyKeValue(realValRaw, realValStr, isBillionScale)
                                        : Number(realValRaw.toFixed(1));

                                    const tarValStr = (row[3] || '0').trim();
                                    const tarValRaw = parseNum(tarValStr);
                                    const tarDisplay = isNaN(tarValRaw)
                                      ? row[3]
                                      : isLuyKeMode
                                        ? formatLuyKeValue(tarValRaw, tarValStr, isBillionScale)
                                        : tarValRaw.toFixed(1);

                                    return (
                                      <tr key={`${kenh}-${idx}`} className="bg-white font-black text-[15px] border-b border-slate-200 hover:bg-slate-50 transition-colors h-[44px]">
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-900 whitespace-nowrap">{row[0]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#b45309] whitespace-nowrap">{row[8]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#0f766e] font-black whitespace-nowrap">{row[7]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-black whitespace-nowrap">{row[6]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-center text-amber-700 bg-amber-50/20">{tarDisplay}</td>
                                        <td className={`px-3 py-2 border-r border-slate-200 text-center ${isZeroReal ? 'text-slate-300' : 'text-slate-900'}`}>{realDisplay}</td>
                                        <td className={`px-3 py-2 text-center ${isRedHT ? 'text-red-600' : 'text-[#0369a1]'}`}>{htDisplay}</td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                    {/* BẢNG XẾP HẠNG */}
                    <div className="w-full max-w-max mx-auto xl:mx-0 xl:w-auto flex flex-col gap-4">
                      {!isExporting && (
                        <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-3">
                          <select 
                            className="hidden"
                            value={rtFilterTinhXepHang}
                            onChange={(e) => setRtFilterTinhXepHang(e.target.value)}
                          >
                            <option value="">TẤT CẢ TỈNH</option>
                            {dsTinhList.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <div className="flex flex-wrap items-center gap-2">
                            {['ĐML', 'ĐMM', 'ĐMS', 'TGD'].map(k => (
                              <label key={k} className={`flex items-center gap-2.5 cursor-pointer bg-white px-4 py-2.5 border-2 rounded-xl text-[15px] font-black transition-all shadow-sm ${rtFilterKenhXepHang.includes(k) ? 'border-blue-500 text-blue-700 shadow-blue-500/20 bg-blue-50/30' : 'border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                                <input 
                                  type="checkbox" 
                                  className={`w-[18px] h-[18px] rounded focus:ring-blue-500 cursor-pointer ${rtFilterKenhXepHang.includes(k) ? 'text-blue-600 border-blue-500' : 'border-slate-300'}`}
                                  checked={rtFilterKenhXepHang.includes(k)}
                                  onChange={(e) => {
                                    if (e.target.checked) setRtFilterKenhXepHang([k]);
                                    else setRtFilterKenhXepHang([]);
                                  }}
                                />
                                <span>{k}</span>
                              </label>
                            ))}
                          </div>
                          <button 
                            onClick={handleNhanXetXepHang}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm"
                          >
                            <MessageSquare size={16} /> TAG TÊN BOSS BOT 20%
                          </button>
                          <button 
                            onClick={() => exportImageShort(xepHangTableRef)} 
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm"
                          >
                            <Download size={16} /> XUẤT ẢNH XẾP HẠNG
                          </button>
                        </div>
                      )}

                      <div ref={xepHangTableRef} className={`w-full overflow-hidden ${isExporting ? 'bg-white p-6' : 'shadow-lg shadow-slate-200/50 rounded-xl border border-slate-200'}`}>
                        <div className="w-full">
                          <table className="w-full border-collapse text-[15px] bg-white" style={{ fontFamily: "'UTM Avo', 'UTM Avo Black', 'Inter', sans-serif", fontWeight: 900 }}>
                            <thead className="sticky top-0 z-20">
                              <tr>
                                <th colSpan={4} style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-4 py-4 sm:py-5 text-center font-black text-[36px] sm:text-[44px] lg:text-[48px] uppercase tracking-wider whitespace-nowrap shadow-xs">
                                  BẢNG XẾP HẠNG TOP/BOT 20% %HT
                                </th>
                                <th colSpan={3} style={{ background: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', color: '#ffffff' }} className="px-4 py-4 sm:py-5 text-right font-black text-[28px] sm:text-[36px] lg:text-[40px] whitespace-nowrap shadow-xs">
                                  {timeStr}
                                </th>
                              </tr>
                              <tr className="bg-white" style={{ height: '4px' }}>
                                <th colSpan={7} className="p-0 border-0"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {top20Data.length > 0 && (
                                <React.Fragment>
                                  <tr className="shadow-sm sticky top-[72px] z-10">
                                    <th colSpan={7} style={{ background: 'linear-gradient(90deg, #047857 0%, #059669 50%, #10b981 100%)', color: '#ffffff' }} className="px-4 py-3 sm:py-3.5 text-center font-black uppercase whitespace-nowrap border-b border-white text-[28px] sm:text-[34px] lg:text-[38px] tracking-wide">
                                      {rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'TOP 20% SIÊU THỊ'}
                                    </th>
                                  </tr>
                                  <tr className="shadow-sm sticky top-[95px] z-10">
                                    <th style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[100px] max-w-[100px] w-[100px]">TỈNH</th>
                                    <th style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[140px] max-w-[140px] w-[140px]">BOSS</th>
                                    <th style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[70px] max-w-[70px] w-[70px]">KÊNH</th>
                                    <th style={{ background: 'linear-gradient(180deg, #059669 0%, #10b981 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[250px]">SIÊU THỊ</th>
                                    <th style={{ background: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[60px] max-w-[60px] w-[60px]">TAR</th>
                                    <th style={{ background: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[60px] max-w-[60px] w-[60px]">{isLuyKeMode ? 'L.KẾ' : 'Real'}</th>
                                    <th style={{ background: 'linear-gradient(180deg, #d97706 0%, #f59e0b 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap min-w-[60px] max-w-[60px] w-[60px]">%HT</th>
                                  </tr>
                                  {top20Data.map((row, idx) => {
                                    const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                                     const isSimCategory = (row[9] || '').toString().toUpperCase().includes('SIM');
                                     const isBillionScale = (() => { const t = parseNum((row[3] || '0').trim()); return ((t >= 5000 && t % 1000 === 0) ? t / 1000 : t) < 10; })() && !isSimCategory;
                                    const htValRaw = parseFloat(htValStr);
                                    const isRedHT = isNaN(htValRaw) || htValRaw < 100;
                                    const htDisplay = isNaN(htValRaw) ? row[4] : `${Math.round(htValRaw)}%`;
                                    
                                    const realValStr = (row[2] || '0').trim(); 
                                    const realValRaw = parseNum(realValStr);
                                    const isZeroReal = isNaN(realValRaw) || realValRaw === 0;
                                    const realDisplay = isNaN(realValRaw)
                                      ? row[2]
                                      : isLuyKeMode
                                        ? formatLuyKeValue(realValRaw, realValStr, isBillionScale)
                                        : Number(realValRaw.toFixed(1));

                                    const tarValStr = (row[3] || '0').trim();
                                    const tarValRaw = parseNum(tarValStr);
                                    const tarDisplay = isNaN(tarValRaw)
                                      ? row[3]
                                      : isLuyKeMode
                                        ? formatLuyKeValue(tarValRaw, tarValStr, isBillionScale)
                                        : tarValRaw.toFixed(1);

                                    return (
                                      <tr key={`top-${idx}`} className="bg-white font-black text-[15px] border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-900 whitespace-nowrap">{row[0]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#b45309] whitespace-nowrap">{row[8]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#0f766e] font-black whitespace-nowrap">{row[7]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-black whitespace-nowrap">{row[6]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-center text-amber-700 bg-amber-50/20">{tarDisplay}</td>
                                        <td className={`px-3 py-2 border-r border-slate-200 text-center ${isZeroReal ? 'text-slate-300' : 'text-slate-900'}`}>{realDisplay}</td>
                                        <td className={`px-3 py-2 text-center ${isRedHT ? 'text-red-600' : 'text-[#0369a1]'}`}>{htDisplay}</td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              )}

                              {bot20Data.length > 0 && (
                                <React.Fragment>
                                  <tr className="shadow-sm sticky z-10" style={{ top: top20Data.length > 0 ? 'auto' : '56px' }}>
                                    <th colSpan={7} style={{ background: 'linear-gradient(90deg, #be123c 0%, #e11d48 50%, #f43f5e 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-b border-white text-lg tracking-wide">
                                      {rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'BOTTOM 20% SIÊU THỊ'}
                                    </th>
                                  </tr>
                                  <tr className="shadow-sm sticky z-10" style={{ top: top20Data.length > 0 ? 'auto' : '95px' }}>
                                    <th style={{ background: 'linear-gradient(180deg, #be123c 0%, #e11d48 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[100px] max-w-[100px] w-[100px]">TỈNH</th>
                                    <th style={{ background: 'linear-gradient(180deg, #be123c 0%, #e11d48 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[140px] max-w-[140px] w-[140px]">BOSS</th>
                                    <th style={{ background: 'linear-gradient(180deg, #be123c 0%, #e11d48 100%)', color: '#ffffff' }} className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[70px] max-w-[70px] w-[70px]">KÊNH</th>
                                    <th style={{ background: 'linear-gradient(180deg, #be123c 0%, #e11d48 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[250px]">SIÊU THỊ</th>
                                    <th style={{ background: 'linear-gradient(180deg, #e11d48 0%, #f43f5e 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[60px] max-w-[60px] w-[60px]">TAR</th>
                                    <th style={{ background: 'linear-gradient(180deg, #e11d48 0%, #f43f5e 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white/30 min-w-[60px] max-w-[60px] w-[60px]">{isLuyKeMode ? 'L.KẾ' : 'Real'}</th>
                                    <th style={{ background: 'linear-gradient(180deg, #e11d48 0%, #f43f5e 100%)', color: '#ffffff' }} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap min-w-[60px] max-w-[60px] w-[60px]">%HT</th>
                                  </tr>
                                  {bot20Data.map((row, idx) => {
                                    const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                                     const isSimCategory = (row[9] || '').toString().toUpperCase().includes('SIM');
                                     const isBillionScale = (() => { const t = parseNum((row[3] || '0').trim()); return ((t >= 5000 && t % 1000 === 0) ? t / 1000 : t) < 10; })() && !isSimCategory;
                                    const htValRaw = parseFloat(htValStr);
                                    const isRedHT = isNaN(htValRaw) || htValRaw < 100;
                                    const htDisplay = isNaN(htValRaw) ? row[4] : `${Math.round(htValRaw)}%`;
                                    
                                    const realValStr = (row[2] || '0').trim(); 
                                    const realValRaw = parseNum(realValStr);
                                    const isZeroReal = isNaN(realValRaw) || realValRaw === 0;
                                    const realDisplay = isNaN(realValRaw)
                                      ? row[2]
                                      : isLuyKeMode
                                        ? formatLuyKeValue(realValRaw, realValStr, isBillionScale)
                                        : Number(realValRaw.toFixed(1));

                                    const tarValStr = (row[3] || '0').trim();
                                    const tarValRaw = parseNum(tarValStr);
                                    const tarDisplay = isNaN(tarValRaw)
                                      ? row[3]
                                      : isLuyKeMode
                                        ? formatLuyKeValue(tarValRaw, tarValStr, isBillionScale)
                                        : tarValRaw.toFixed(1);

                                    return (
                                      <tr key={`bot-${idx}`} className="bg-white font-black text-[15px] border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-900 whitespace-nowrap">{row[0]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#b45309] whitespace-nowrap">{row[8]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#0f766e] font-black whitespace-nowrap">{row[7]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-black whitespace-nowrap">{row[6]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-center text-amber-700 bg-amber-50/20">{tarDisplay}</td>
                                        <td className={`px-3 py-2 border-r border-slate-200 text-center ${isZeroReal ? 'text-slate-300' : 'text-slate-900'}`}>{realDisplay}</td>
                                        <td className={`px-3 py-2 text-center ${isRedHT ? 'text-red-600' : 'text-[#0369a1]'}`}>{htDisplay}</td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              )}
                              
                              {top20Data.length === 0 && bot20Data.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">
                                    Không có dữ liệu cho kênh này
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            };

            const renderVungScorecard = () => {
              const isLuyKeMode = tnbDataMode === 'luyke';
              const dataSrc = isLuyKeMode ? effectiveDataLkSieuThi : effectiveDataRtSieuThi;
              if (dataSrc.length === 0) return null;

              const now = new Date();
              const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const currentDay = Math.max(1, now.getDate() - 1);
              
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = `${String(yesterday.getDate()).padStart(2, '0')}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${yesterday.getFullYear()}`;



              // Collect all unique categories
              const rawCategories = Array.from(new Set(
                dataSrc
                  .map(row => (row[9] || '').toString().trim())
                  .filter(cat => cat && cat !== '-')
              ));

              // Resolve group for each category
              const resolveGroup = (catName: string) => {
                const cfg = categoryConfig.find(c => c.name.trim().toUpperCase() === catName.trim().toUpperCase());
                if (cfg) {
                  const g = cfg.group.trim().toUpperCase();
                  if (g === 'CE' || g === 'C.E & GD' || g === 'C.E & GIA DỤNG') return 'CE';
                  if (g === 'ICT') return 'ICT';
                  if (g === 'DỊCH VỤ') return 'DỊCH VỤ';
                }
                const upper = catName.toUpperCase();
                if (upper.includes('SIM') || upper.includes('BẢO HIỂM') || upper.includes('VAS') || upper.includes('TRẢ CHẬM') || upper.includes('VÍ TRẢ SAU') || upper.includes('TIỀN MẶT') || upper.includes('OTT') || upper.includes('DỊCH VỤ') || upper.includes('MỞ THẺ') || upper.includes('NẠP RÚT') || upper.includes('TPBANK')) {
                  return 'DỊCH VỤ';
                }
                if (upper.includes('CAMERA') || upper.includes('LOA') || upper.includes('LAPTOP') || upper.includes('SẠC DỰ PHÒNG') || upper.includes('TAI NGHE') || upper.includes('ĐIỆN THOẠI') || upper.includes('ĐỒNG HỒ') || upper.includes('TABLET')) {
                  return 'ICT';
                }
                return 'CE';
              };

              // Aggregate function
              const aggregateForBrands = (channelBrands: string[]) => {
                const map: Record<string, { dtlk: number, target: number, percent: number | null }> = {};
                
                rawCategories.forEach(cat => {
                  map[cat] = { dtlk: 0, target: 0, percent: null };
                });

                dataSrc.forEach(row => {
                  const brand = (row[7] || '').toString().trim().toUpperCase();
                  const cat = (row[9] || '').toString().trim();
                  if (channelBrands.includes(brand) && cat && cat !== '-') {
                    if (!map[cat]) {
                      map[cat] = { dtlk: 0, target: 0, percent: null };
                    }
                    map[cat].dtlk += parseNum(row[2]);
                    map[cat].target += parseNum(row[3]);
                  }
                });

                Object.keys(map).forEach(cat => {
                  const item = map[cat];
                  if (item.target > 0) {
                    if (isLuyKeMode) {
                      item.percent = ((item.dtlk / currentDay) * totalDays) / item.target * 100;
                    } else {
                      item.percent = (item.dtlk / item.target) * 100;
                    }
                  } else {
                    item.percent = null;
                  }
                });

                return map;
              };

              const tgdDataMap = aggregateForBrands(['TGD', 'AAR']);
              const dmxDataMap = aggregateForBrands(['ĐML', 'ĐMM', 'ĐMS']);

              const prepareList = (dataMap: typeof tgdDataMap) => {
                const ictList: any[] = [];
                const dichVuList: any[] = [];
                const ceList: any[] = [];

                Object.keys(dataMap).forEach(cat => {
                  const g = resolveGroup(cat);
                  const item = { name: cat, ...dataMap[cat] };
                  if (g === 'ICT') ictList.push(item);
                  else if (g === 'DỊCH VỤ') dichVuList.push(item);
                  else ceList.push(item);
                });

                const sortFn = (a: any, b: any) => {
                  const valA = a.percent !== null ? a.percent : 0;
                  const valB = b.percent !== null ? b.percent : 0;
                  return valB - valA;
                  //
                  //
                  //
                };

                return {
                  ict: [...ictList].sort(sortFn),
                  dichVu: [...dichVuList].sort(sortFn),
                  ce: [...ceList].sort(sortFn)
                };
              };

              const tgdLists = prepareList(tgdDataMap);
              const dmxLists = prepareList(dmxDataMap);

              const getSummary = (list: any[]) => {
                const totalWithTarget = list.filter(x => x.target > 0).length;
                const achieved = list.filter(x => x.target > 0 && x.percent !== null && x.percent >= 100).length;
                const ratio = `${achieved}/${totalWithTarget}`;
                const pct = totalWithTarget > 0 ? Math.round((achieved / totalWithTarget) * 100) : 0;
                return { ratio, pct, totalWithTarget, achieved };
              };

              const renderSideTable = (
                title: string,
                channelKenh: string,
                subtitle2: string | React.ReactNode,
                lists: typeof tgdLists,
                theme: 'TGD' | 'ĐMX',
                wrapperRef: React.RefObject<HTMLDivElement>
              ) => {
                const ictSum = getSummary(lists.ict);
                const dvSum = getSummary(lists.dichVu);
                const ceSum = getSummary(lists.ce);

                const includeCE = theme !== 'TGD';

                const grandTotalWithTarget = ictSum.totalWithTarget + dvSum.totalWithTarget + (includeCE ? ceSum.totalWithTarget : 0);
                const grandAchieved = ictSum.achieved + dvSum.achieved + (includeCE ? ceSum.achieved : 0);
                const grandRatio = `${grandAchieved}/${grandTotalWithTarget}`;
                const grandPct = grandTotalWithTarget > 0 ? Math.round((grandAchieved / grandTotalWithTarget) * 100) : 0;

                const headerBg = theme === 'TGD' ? 'bg-[#fbbf24]' : 'bg-[#60a5fa]';
                const subHeaderBg = theme === 'TGD' ? 'bg-[#fde047]' : 'bg-[#93c5fd]';
                const numBg = theme === 'TGD' ? 'bg-[#fef08a]' : 'bg-[#bfdbfe]';
                const footerBg = theme === 'TGD' ? 'bg-[#fbbf24]' : 'bg-[#60a5fa]';

                const rows: { catName: string; percent: number | null; target: number; dtlk: number; group: 'ICT' | 'DỊCH VỤ' | 'C.E & GD'; isFirst: boolean; groupLength: number; summary: any }[] = [];

                lists.ict.forEach((item, idx) => {
                  rows.push({
                    catName: item.name,
                    percent: item.percent,
                    target: item.target,
                    dtlk: item.dtlk,
                    group: 'ICT',
                    isFirst: idx === 0,
                    groupLength: lists.ict.length,
                    summary: ictSum
                  });
                });

                lists.dichVu.forEach((item, idx) => {
                  rows.push({
                    catName: item.name,
                    percent: item.percent,
                    target: item.target,
                    dtlk: item.dtlk,
                    group: 'DỊCH VỤ',
                    isFirst: idx === 0,
                    groupLength: lists.dichVu.length,
                    summary: dvSum
                  });
                });

                if (includeCE) {
                  lists.ce.forEach((item, idx) => {
                    rows.push({
                      catName: item.name,
                      percent: item.percent,
                      target: item.target,
                      dtlk: item.dtlk,
                      group: 'C.E & GD',
                      isFirst: idx === 0,
                      groupLength: lists.ce.length,
                      summary: ceSum
                    });
                  });
                }

                return (
                  <div className="flex flex-col w-full border border-slate-400 rounded-[24px] overflow-hidden bg-white shadow-lg relative">
                    {/* Header */}
                    <div className={`${headerBg} p-6 flex flex-col gap-1 border-b border-slate-400 relative`}>
                      <button
                        onClick={() => exportImage(wrapperRef)}
                        className="export-btn absolute top-6 right-6 bg-black/25 hover:bg-black/35 text-white px-3 py-1.5 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download size={14} /> Xuất ảnh {title}
                      </button>
                      <h2 className="text-7xl font-black text-black tracking-tight leading-none">{title}</h2>
                      <p className="text-[14px] font-black text-black uppercase tracking-wider mt-1">{channelKenh}</p>
                      <div className="text-[13px] font-bold text-slate-905 uppercase mt-2 flex items-center gap-2">
                        <span>{isLuyKeMode ? "LUỸ KẾ ĐẾN NGÀY :" : "REALTIME ĐẾN THỜI GIAN :"}</span>
                        <span className="text-red-600 font-black">
                          {isLuyKeMode ? yesterdayStr : (() => {
                            const pad = (n: number) => String(n).padStart(2, '0');
                            return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} || NGÀY ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
                          })()}
                        </span>
                      </div>
                      {subtitle2 && (
                        <div className="text-[11px] font-bold text-slate-900 border-t border-black/15 pt-2 mt-2 leading-tight uppercase">
                          {subtitle2}
                        </div>
                      )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-400 text-[15px]">
                        <thead>
                          <tr className={`${subHeaderBg} text-black font-black uppercase text-center border-b border-slate-400`}>
                            <th className="py-2.5 px-1 border-r border-b border-slate-400 w-10"></th>
                            <th className="py-2.5 px-2 border-r border-b border-slate-400 w-28 whitespace-nowrap">NGÀNH HÀNG</th>
                            <th className="py-2.5 px-3 border-r border-b border-slate-400 text-left">NHÓM HÀNG</th>
                             <th className="py-2.5 px-2 border-r border-b border-slate-400 w-32">{isLuyKeMode ? "% DỰ KIẾN" : "% HOÀN THÀNH"}</th>
                            <th colSpan={2} className="py-2.5 px-2 w-36 leading-tight text-[12.5px] border-b border-slate-400 whitespace-nowrap">TỈ LỆ HOÀN THÀNH<br/>TRÊN 100%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => {
                            const percentVal = row.percent;
                            let pctStr = '0%';
                            let pctClass = 'text-[#991b1b] font-black';
                            let bgClass = 'bg-[#fee2e2]';
                            if (percentVal !== null) {
                              pctStr = Math.round(percentVal) + '%';
                              if (percentVal >= 100) {
                                pctClass = 'text-[#166534] font-black';
                                bgClass = 'bg-[#d1fae5]';
                              } else {
                                pctClass = 'text-[#991b1b] font-black';
                                bgClass = 'bg-[#fee2e2]';
                              }
                            }

                            const isTgdTheme = theme === 'TGD';
                            const rowHoverBg = isTgdTheme ? 'hover:bg-amber-100/70' : 'hover:bg-blue-100/70';
                            const sttHoverBg = isTgdTheme ? 'group-hover/row:bg-[#fde047]' : 'group-hover/row:bg-[#93c5fd]';
                            const cellHoverBg = isTgdTheme ? 'group-hover/row:bg-amber-50/70' : 'group-hover/row:bg-blue-50/70';

                            return (
                              <tr key={index} className={`group/row ${rowHoverBg} font-bold text-slate-900 transition-colors duration-150`}>
                                <td className={`py-1 px-1 border-r border-b border-slate-400 text-center ${numBg} ${sttHoverBg} font-black transition-colors`}>
                                  {index + 1}
                                </td>
                                {row.isFirst ? (
                                  <td
                                    rowSpan={row.groupLength}
                                    className={`py-1 px-2 border-r border-b border-slate-400 text-center font-black text-slate-900 bg-white ${cellHoverBg} align-middle text-[15px] whitespace-nowrap transition-colors`}
                                  >
                                    {row.group}
                                  </td>
                                ) : null}
                                <td className={`py-1 px-3 border-r border-b border-slate-400 text-left font-bold text-slate-900 uppercase ${cellHoverBg} transition-colors`}>
                                  {row.catName}
                                </td>
                                <td className={`py-1 px-2 border-r border-b border-slate-400 text-center ${bgClass} ${pctClass} group-hover/row:brightness-95 transition-colors`}>
                                  {pctStr}
                                </td>
                                {row.isFirst ? (
                                  <>
                                    <td
                                      rowSpan={row.groupLength}
                                      className={`py-1 px-2 border-r border-b border-slate-400 text-center font-black text-slate-900 bg-white ${cellHoverBg} align-middle transition-colors`}
                                    >
                                      {row.summary.ratio}
                                    </td>
                                    <td
                                      rowSpan={row.groupLength}
                                      className={`py-1 px-2 border-r border-b border-slate-400 text-center font-black text-red-600 bg-white ${cellHoverBg} align-middle text-[16px] transition-colors`}
                                    >
                                      {row.summary.pct}%
                                    </td>
                                  </>
                                ) : null}
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className={`${footerBg} text-black font-black uppercase text-[15px] h-[54px]`}>
                            <td colSpan={3} className="px-4 text-center align-middle font-black border-r border-b border-slate-400 h-[54px] leading-normal">
                              TỔNG CỘNG
                            </td>
                            <td className="px-2 border-r border-b border-slate-400 align-middle h-[54px] leading-normal"></td>
                            <td className="px-2 border-r border-b border-slate-400 text-center align-middle font-black h-[54px] leading-normal">
                              {grandRatio}
                            </td>
                            <td className="px-2 border-b border-slate-400 text-center align-middle font-black text-red-700 text-[17px] h-[54px] leading-normal">
                              {grandPct}%
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              };

              return (
                <div ref={vungScorecardRef} className="w-full" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
                  <div className="export-btn flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-6 bg-indigo-600 rounded-full" />
                      <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
                        BẢNG THI ĐUA VÙNG - TGD & ĐMX
                      </h3>
                    </div>
                    <button
                      onClick={() => exportImage(vungScorecardRef)}
                      className="export-btn bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl font-black text-xs sm:text-sm uppercase flex items-center gap-2 transition-all shadow-md shadow-indigo-150 cursor-pointer active:scale-95"
                    >
                      <Download size={16} /> Xuất ảnh chung 2 bảng
                    </button>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 items-start w-full">
                    <div ref={tgdTableRef} className="w-full">
                      {renderSideTable(
                        'TGD',
                        'KÊNH : TGD + TZ',
                        null,
                        tgdLists,
                        'TGD',
                        tgdTableRef
                      )}
                    </div>
                    <div ref={dmxTableRef} className="w-full">
                      {renderSideTable(
                        'ĐMX',
                        'KÊNH : ĐML + ĐMM + ĐMS + LƯU ĐỘNG',
                        'D.THU C.E + GD DO TGD + TZ BÁN SẼ TÍNH CHO VÙNG, KHÔNG CỘNG CHO ĐMX',
                        dmxLists,
                        'ĐMX',
                        dmxTableRef
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            if (activeTab === 'NHAN_VIEN') {
              return (
                <div className="flex flex-col gap-8 w-full">
                  {renderPivotTable(false)}
                </div>
              );
            }

            if (activeTab === 'TONG') {
              return (
                <div className="flex flex-col gap-8 w-full">
                  {renderVungScorecard()}
                </div>
              );
            }

            if (activeTab === 'VUNG') {
              const handleCopyVungSummary = () => {
                const rows = searchedRowsRef.current || [];
                if (rows.length === 0) {
                  showNotification('Chưa có dữ liệu để copy.', 'error');
                  return;
                }
                
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                const isLuyKeMode = tnbDataMode === 'luyke';

                // Build kênh title
                let kenhTitle = 'TẤT CẢ KÊNH';
                if (sieuThiFilterKenh.length > 0) {
                  const hasDMX = sieuThiFilterKenh.some(k => ['ĐML', 'ĐMM', 'ĐMS'].includes(k));
                  const hasTGD = sieuThiFilterKenh.includes('TGD');
                  if (hasDMX && hasTGD) kenhTitle = 'ĐMX & TGD';
                  else if (hasDMX) kenhTitle = 'ĐMX';
                  else if (hasTGD) kenhTitle = 'TGD';
                  else kenhTitle = sieuThiFilterKenh.join(', ');
                }

                const timeStr = isLuyKeMode
                  ? (() => {
                      const yesterday = new Date(now);
                      yesterday.setDate(yesterday.getDate() - 1);
                      return `${pad(yesterday.getDate())}/${pad(yesterday.getMonth() + 1)}/${yesterday.getFullYear()}`;
                    })()
                  : `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

                const modeText = isLuyKeMode ? 'LUỸ KẾ' : 'REALTIME';

                let text = `🏆 KẾT QUẢ THI ĐUA NGÀNH HÀNG KÊNH ${kenhTitle} – CẬP NHẬT ${modeText} ĐẾN ${timeStr}\n\n`;
                
                text += `⚠️ TỈNH CHƯA HIỆU QUẢ THI ĐUA\n\n`;

                // Filter provinces with tỷ lệ < 50%, sort ascending (worst first)
                const under50 = [...rows].filter(r => r.tyLe < 50).sort((a, b) => b.tyLe - a.tyLe);
                
                if (under50.length === 0) {
                  text += `✅ Tất cả tỉnh đều đạt trên 50%!`;
                } else {
                  under50.forEach((r, idx) => {
                    const emoji = r.tyLe >= 30 ? '🟡' : '🔴';
                    text += `${idx + 1}. ${emoji} ${r.prov}: ${r.datCount}/${r.effectiveTotalCats} (${r.tyLe.toFixed(0)}%)\n`;
                  });
                }
                
                navigator.clipboard.writeText(text).then(() => {
                  showNotification('Đã copy kết quả thi đua vào khay nhớ tạm!', 'success');
                }).catch(err => {
                  console.error('Failed to copy: ', err);
                  showNotification('Không thể copy text, vui lòng thử lại.', 'error');
                });
              };

              return (
                <div className="flex flex-col gap-8 w-full">
                  <button
                    onClick={handleCopyVungSummary}
                    className="self-start flex items-center gap-3 px-6 py-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-[15px] uppercase tracking-wide transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <MessageSquare size={20} strokeWidth={2.5} />
                    <span>
                      🏆 KẾT QUẢ THI ĐUA NGÀNH HÀNG – CẬP NHẬT {tnbDataMode === 'luyke' ? 'LUỸ KẾ' : 'REALTIME'}
                    </span>
                  </button>
                  {renderPivotTable(true, rtTableRef)}
                </div>
              );
            }

            if (activeTab === 'NHOM_HANG') {
              return (
                <div className="flex flex-col gap-8 w-full">
                  {renderKhoTable()}
                </div>
              );
            }

            if (activeTab === 'SIEU_THI') {
              return (
                <div className="flex flex-col gap-8 w-full">
                  {renderPivotTable(false, tableRef)}
                  {renderChiTietTable()}
                </div>
              );
            }
          })()}
            </div>
          </div>
        ) : (
        <>

        {/* Data Table */}
        <div className={`bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden flex flex-col relative min-h-[500px] transition-opacity duration-200 ${isSyncing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex-1 w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <th className="px-4 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 w-16 text-center">STT</th>
                  {currentHeaders.map((header, idx) => (
                    <th key={idx} className="px-4 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 min-w-[240px] max-w-[240px] w-[240px] truncate" title={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-500 border-r border-slate-100 text-center font-medium">
                        {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                      </td>
                      {currentHeaders.map((_, colIndex) => {
                        let displayVal = row[colIndex];
                        if (displayVal === undefined || displayVal === null || displayVal === '') {
                          displayVal = '-';
                        }
                        return (
                          <td key={colIndex} className="px-4 py-3 text-sm text-slate-700 border-r border-slate-100 min-w-[200px] max-w-[240px] w-[240px] truncate" title={displayVal}>
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={currentHeaders.length + 1} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <LayoutGrid size={40} className="text-slate-300" />
                        <p className="font-medium text-lg">Chưa có dữ liệu</p>
                        <p className="text-sm">Hãy cập nhật dữ liệu để hiển thị.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer (100 rows per page) */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-500 font-medium">
              Hiển thị <span className="font-bold text-slate-700">{filteredData.length > 0 ? ((currentPage - 1) * rowsPerPage) + 1 : 0}</span> - <span className="font-bold text-slate-700">{Math.min(currentPage * rowsPerPage, filteredData.length)}</span> trên <span className="font-bold text-indigo-600">{filteredData.length.toLocaleString('vi-VN')}</span> dòng (Tối đa 100 dòng/trang)
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                >
                  Đầu
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                >
                  Trước
                </button>
                <div className="flex items-center gap-1.5 px-2">
                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">{currentPage}</span>
                  <span className="text-sm text-slate-400 font-bold">/</span>
                  <span className="text-sm font-bold text-slate-600">{totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                >
                  Sau
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                >
                  Cuối
                </button>
              </div>
            )}
          </div>
        </div>
        
        </>
        )}

        {lastSync && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium pb-8">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Lần cập nhật cuối: {new Date(lastSync).toLocaleString('vi-VN')}
          </div>
        )}
      </div>
      {/* Capture Loading Overlay */}
      <CaptureLoadingOverlay isLoading={isExporting} />

      {/* Modal for Image Preview with TAG TEN BOSS and COPY ANH */}
      <ImagePreviewModal 
        previewImage={previewImage} 
        setPreviewImage={setPreviewImage} 
        onTagBoss={handleCopyNhanXet} 
        isAutoCopied={isAutoCopied}
      />

      {/* Modal for Viewing BOSS Dataset */}
      {showBossModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Users size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">DANH SÁCH BOSS TOÀN MIỀN</h3>
                  <p className="text-xs text-slate-500 font-medium">Tổng cộng {parsedBossRows.length.toLocaleString('vi-VN')} dòng dữ liệu</p>
                </div>
              </div>

              {/* Search input in header */}
              <div className="flex-1 max-w-md relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={bossModalSearch}
                  onChange={(e) => {
                    setBossModalSearch(e.target.value);
                    setBossModalPage(1);
                  }}
                  placeholder="Tìm kiếm siêu thị, mã kho, tên BOSS..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <button
                onClick={() => setShowBossModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Table */}
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              {filteredBossRows.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Users size={48} className="text-slate-300 mb-2" />
                  <p className="font-bold text-sm">Không tìm thấy dòng dữ liệu nào khớp với tìm kiếm</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-black sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center border-r border-slate-200 w-[50px]">STT</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap bg-amber-50 text-amber-900">CỘT A (MST)</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap bg-amber-50 text-amber-900">CỘT B (SIÊU THỊ)</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap">CỘT C (TỈNH MỚI)</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap">CỘT D (TỈNH CŨ)</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap bg-blue-100 text-blue-900">CỘT E (TÊN BOSS)</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap">CỘT F (KÊNH)</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap bg-emerald-100 text-emerald-900">CỘT G (MST - TÊN SIÊU THỊ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedBossRows.map((row, rIdx) => {
                        const globalIdx = (bossModalPage - 1) * bossRowsPerPage + rIdx + 1;
                        return (
                          <tr key={rIdx} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-3 py-2 text-center font-bold text-slate-400 border-r border-slate-100">
                              {globalIdx}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap font-black text-amber-800 bg-amber-50/50">
                              {row[0] || '-'}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap font-black text-amber-900 bg-amber-50/30">
                              {row[1] || '-'}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap font-medium text-slate-700">
                              {row[2] || '-'}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap font-medium text-slate-700">
                              {row[3] || '-'}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap font-black text-blue-800 bg-blue-50/70">
                              {row[4] || '-'}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap font-medium text-slate-700">
                              {row[5] || '-'}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap font-black text-emerald-800 bg-emerald-50/70">
                              {row[6] || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer with Pagination */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-500">
                Hiển thị {paginatedBossRows.length} / {filteredBossRows.length} dòng
              </span>
              {totalBossPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setBossModalPage(p => Math.max(1, p - 1))}
                    disabled={bossModalPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                  >
                    Trước
                  </button>
                  <span className="px-3 py-1.5 font-black text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm">
                    {bossModalPage} / {totalBossPages}
                  </span>
                  <button
                    onClick={() => setBossModalPage(p => Math.min(totalBossPages, p + 1))}
                    disabled={bossModalPage === totalBossPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* VÙNG Remark / Feedback Modal (Matching Visual Design in Screenshot 1) */}
      <AnimatePresence>
        {showVungFeedbackModal && (() => {
          const rows = searchedRowsRef.current || [];
          const topTinh = rows[0] || { prov: 'Bạc Liêu', datCount: 0, effectiveTotalCats: 25, tyLe: 0 };
          const botTinh = rows.length > 0 ? rows[rows.length - 1] : { prov: 'Bến Tre', datCount: 0, effectiveTotalCats: 25, tyLe: 0 };
          
          const generatedText = generateVungFeedback(
            vungFeedbackTemplate,
            vungFeedbackTagMode,
            rows,
            vungCategoriesRef.current || [],
            vungPivotMapRef.current || {}
          );
          const currentText = vungFeedbackCustomText !== null ? vungFeedbackCustomText : generatedText;

          return (
            <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 font-sans"
              >
                {/* Header: Solid Orange Banner matching screenshot 1 */}
                <div className="bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#06b6d4] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={22} className="text-white" strokeWidth={2.3} />
                    <h3 className="font-black text-base sm:text-lg tracking-wide uppercase text-white">
                      FORM NHẬN XÉT: VÙNG
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowVungFeedbackModal(false);
                      setVungFeedbackCustomText(null);
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    title="Đóng"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Modal Body: Scrollable */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
                  {/* Top 2 Metric Highlight Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    {/* Left: Tỉnh dẫn đầu vùng */}
                    <div className="bg-[#fefce8] border border-amber-300/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs">
                      <div className="w-12 h-12 rounded-xl bg-[#f59e0b] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Trophy size={24} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block">
                          TỈNH DẪN ĐẦU VÙNG
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                          {topTinh.prov}
                        </h4>
                        <p className="text-xs sm:text-[13px] font-black text-emerald-600 mt-0.5">
                          {topTinh.datCount}/{topTinh.effectiveTotalCats || 25} ({topTinh.tyLe ? topTinh.tyLe.toFixed(0) : 0}%)
                        </p>
                      </div>
                    </div>

                    {/* Right: Tỉnh cần tăng tốc */}
                    <div className="bg-[#fff1f2] border border-rose-300/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs">
                      <div className="w-12 h-12 rounded-xl bg-[#f43f5e] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <AlertCircle size={24} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-black text-rose-800 uppercase tracking-wider block">
                          TỈNH CẦN TĂNG TỐC
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                          {botTinh.prov}
                        </h4>
                        <p className="text-xs sm:text-[13px] font-black text-rose-600 mt-0.5">
                          {botTinh.datCount}/{botTinh.effectiveTotalCats || 25} ({botTinh.tyLe ? botTinh.tyLe.toFixed(0) : 0}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Template selector & Tag options */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs sm:text-[13px] font-black text-slate-800">
                        Chọn mẫu nội dung nhận xét (VÙNG):
                      </span>
                      <div className="flex items-center gap-2">
                        {[
                          { id: 'user', label: 'User' },
                          { id: 'sieuthi', label: 'Siêu thị' },
                          { id: 'all', label: 'Siêu thị + User' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setVungFeedbackTagMode(opt.id);
                              setVungFeedbackCustomText(null);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border",
                              vungFeedbackTagMode === opt.id
                                ? "bg-gradient-to-r from-[#1d4ed8] to-[#0284c7] border-blue-600 text-white shadow-2xs"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                            )}
                          >
                            <span className={cn(
                              "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black",
                              vungFeedbackTagMode === opt.id ? "bg-white text-[#1d4ed8]" : "border border-slate-300 bg-white text-transparent"
                            )}>
                              ✓
                            </span>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2 Template Tabs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVungFeedbackTemplate('mau1');
                          setVungFeedbackCustomText(null);
                        }}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border text-center",
                          vungFeedbackTemplate === 'mau1'
                            ? "bg-amber-50 border-amber-400 text-amber-800 shadow-xs ring-2 ring-amber-400/20"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        )}
                      >
                        <span>🔥 Mẫu 1: Xếp hạng Tỉnh (TOP/BOT)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVungFeedbackTemplate('mau2');
                          setVungFeedbackCustomText(null);
                        }}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border text-center",
                          vungFeedbackTemplate === 'mau2'
                            ? "bg-sky-50 border-sky-400 text-sky-800 shadow-xs ring-2 ring-sky-400/20"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        )}
                      >
                        <span>⚡ Mẫu 2: Tóm tắt Vùng (Top/Bot Tỉnh)</span>
                      </button>
                    </div>
                  </div>

                  {/* Textarea Content */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-[13px] font-black text-slate-800 block">
                      Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
                    </label>
                    <textarea
                      value={currentText}
                      onChange={(e) => setVungFeedbackCustomText(e.target.value)}
                      rows={10}
                      className="w-full p-3.5 sm:p-4 bg-slate-50/70 border-2 border-slate-200 rounded-2xl text-xs sm:text-[13px] font-sans text-slate-800 outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 leading-relaxed resize-y custom-scrollbar transition-all"
                      placeholder="Nội dung nhận xét..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 shrink-0">
                  <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
                    Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(currentText);
                        setVungFeedbackCopied(true);
                        setTimeout(() => setVungFeedbackCopied(false), 2500);
                      }
                    }}
                    className={cn(
                      "w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95",
                      vungFeedbackCopied
                        ? "bg-emerald-600 text-white shadow-emerald-600/30"
                        : "bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#06b6d4] hover:from-[#1e40af] hover:to-[#0284c7] text-white shadow-blue-500/30"
                    )}
                  >
                    {vungFeedbackCopied ? (
                      <>
                        <Check size={16} strokeWidth={3} />
                        <span>ĐÃ SAO CHÉP!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} strokeWidth={2.3} />
                        <span>SAO CHÉP NHẬN XÉT</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      {/* SIÊU THỊ Remark / Feedback Modal */}
      <AnimatePresence>
        {showSieuThiFeedbackModal && (() => {
          const rows = searchedRowsRef.current || [];
          const topStore = rows[0] || { prov: 'ĐMX Siêu Thị 1', tinh: 'An Giang', datCount: 0, effectiveTotalCats: 38, tyLe: 0 };
          const botStore = rows.length > 0 ? rows[rows.length - 1] : { prov: 'ĐMS Siêu Thị 2', tinh: 'Long An', datCount: 0, effectiveTotalCats: 38, tyLe: 0 };
          
          const generatedText = generateSieuThiFeedback(
            sieuThiFeedbackTemplate,
            sieuThiFeedbackTagMode,
            rows,
            vungCategoriesRef.current || [],
            sieuThiFilterTinh,
            sieuThiFilterKenh
          );
          const currentText = sieuThiFeedbackCustomText !== null ? sieuThiFeedbackCustomText : generatedText;

          return (
            <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 font-sans"
              >
                {/* Header: Solid Sapphire-Cyan Banner */}
                <div className="bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#06b6d4] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={22} className="text-white" strokeWidth={2.3} />
                    <h3 className="font-black text-base sm:text-lg tracking-wide uppercase text-white">
                      FORM NHẬN XÉT: SIÊU THỊ {sieuThiFilterTinh ? `- ${sieuThiFilterTinh.toUpperCase()}` : ''}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowSieuThiFeedbackModal(false);
                      setSieuThiFeedbackCustomText(null);
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    title="Đóng"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Modal Body: Scrollable */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
                  {/* Top 2 Metric Highlight Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    {/* Left: Siêu thị dẫn đầu */}
                    <div className="bg-[#fefce8] border border-amber-300/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs">
                      <div className="w-12 h-12 rounded-xl bg-[#f59e0b] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Trophy size={24} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block">
                          SIÊU THỊ DẪN ĐẦU
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                          {topStore.prov} {topStore.tinh ? `(${topStore.tinh})` : ''}
                        </h4>
                        <p className="text-xs sm:text-[13px] font-black text-emerald-600 mt-0.5">
                          {topStore.datCount}/{topStore.effectiveTotalCats || 38} ({topStore.tyLe ? topStore.tyLe.toFixed(0) : 0}%)
                        </p>
                      </div>
                    </div>

                    {/* Right: Siêu thị cần tăng tốc */}
                    <div className="bg-[#fff1f2] border border-rose-300/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs">
                      <div className="w-12 h-12 rounded-xl bg-[#f43f5e] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <AlertCircle size={24} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-black text-rose-800 uppercase tracking-wider block">
                          SIÊU THỊ CẦN TĂNG TỐC
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                          {botStore.prov} {botStore.tinh ? `(${botStore.tinh})` : ''}
                        </h4>
                        <p className="text-xs sm:text-[13px] font-black text-rose-600 mt-0.5">
                          {botStore.datCount}/{botStore.effectiveTotalCats || 38} ({botStore.tyLe ? botStore.tyLe.toFixed(0) : 0}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Template selector & Tag options */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs sm:text-[13px] font-black text-slate-800">
                        Chọn mẫu nội dung nhận xét (SIÊU THỊ):
                      </span>
                      <div className="flex items-center gap-2">
                        {[
                          { id: 'user', label: 'User' },
                          { id: 'sieuthi', label: 'Siêu thị' },
                          { id: 'all', label: 'Siêu thị + User' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSieuThiFeedbackTagMode(opt.id);
                              setSieuThiFeedbackCustomText(null);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border",
                              sieuThiFeedbackTagMode === opt.id
                                ? "bg-gradient-to-r from-[#1d4ed8] to-[#0284c7] border-blue-600 text-white shadow-2xs"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                            )}
                          >
                            <span className={cn(
                              "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black",
                              sieuThiFeedbackTagMode === opt.id ? "bg-white text-[#1d4ed8]" : "border border-slate-300 bg-white text-transparent"
                            )}>
                              ✓
                            </span>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2 Template Tabs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSieuThiFeedbackTemplate('mau1');
                          setSieuThiFeedbackCustomText(null);
                        }}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border text-center",
                          sieuThiFeedbackTemplate === 'mau1'
                            ? "bg-amber-50 border-amber-400 text-amber-800 shadow-xs ring-2 ring-amber-400/20"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        )}
                      >
                        <span>🔥 Mẫu 1: Xếp hạng Siêu Thị (TOP/BOT)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSieuThiFeedbackTemplate('mau2');
                          setSieuThiFeedbackCustomText(null);
                        }}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border text-center",
                          sieuThiFeedbackTemplate === 'mau2'
                            ? "bg-sky-50 border-sky-400 text-sky-800 shadow-xs ring-2 ring-sky-400/20"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        )}
                      >
                        <span>⚡ Mẫu 2: Tóm tắt Thi Đua Siêu Thị (Top/Bot)</span>
                      </button>
                    </div>
                  </div>

                  {/* Textarea Content */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-[13px] font-black text-slate-800 block">
                      Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
                    </label>
                    <textarea
                      value={currentText}
                      onChange={(e) => setSieuThiFeedbackCustomText(e.target.value)}
                      rows={10}
                      className="w-full p-3.5 sm:p-4 bg-slate-50/70 border-2 border-slate-200 rounded-2xl text-xs sm:text-[13px] font-sans text-slate-800 outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 leading-relaxed resize-y custom-scrollbar transition-all"
                      placeholder="Nội dung nhận xét siêu thị..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 shrink-0">
                  <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
                    Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(currentText);
                        setSieuThiFeedbackCopied(true);
                        setTimeout(() => setSieuThiFeedbackCopied(false), 2500);
                      }
                    }}
                    className={cn(
                      "w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95",
                      sieuThiFeedbackCopied
                        ? "bg-emerald-600 text-white shadow-emerald-600/30"
                        : "bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#06b6d4] hover:from-[#1e40af] hover:to-[#0284c7] text-white shadow-blue-500/30"
                    )}
                  >
                    {sieuThiFeedbackCopied ? (
                      <>
                        <Check size={16} strokeWidth={3} />
                        <span>ĐÃ SAO CHÉP!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} strokeWidth={2.3} />
                        <span>SAO CHÉP NHẬN XÉT</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      {/* CATEGORY Remark / Feedback Modal (Matches Hình 2 in screenshot) */}
      <AnimatePresence>
        {activeCategoryFeedback && (() => {
          const { catName, tableData, kenhTitle } = activeCategoryFeedback;
          const sorted = [...(tableData || [])].sort((a, b) => (b.ht || 0) - (a.ht || 0));
          const topTinh = sorted[0] || { tinh: 'Cà Mau', real: 0, target: 0, ht: 0 };
          const botTinh = sorted.length > 0 ? sorted[sorted.length - 1] : { tinh: 'Long An', real: 0, target: 0, ht: 0 };
          
          const generatedText = generateCategoryFeedback(
            catFeedbackTemplate,
            catFeedbackTagMode,
            activeCategoryFeedback
          );
          const currentText = catFeedbackCustomText !== null ? catFeedbackCustomText : generatedText;

          return (
            <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 font-sans"
              >
                {/* Header: Solid Sapphire-Cyan Banner matching Hình 2 */}
                <div className="bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#06b6d4] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={22} className="text-white" strokeWidth={2.3} />
                    <h3 className="font-black text-base sm:text-lg tracking-wide uppercase text-white">
                      FORM NHẬN XÉT: {catName.toUpperCase()}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setActiveCategoryFeedback(null);
                      setCatFeedbackCustomText(null);
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    title="Đóng"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Modal Body: Scrollable */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
                  {/* Top 2 Metric Highlight Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    {/* Left: Tỉnh dẫn đầu */}
                    <div className="bg-[#fefce8] border border-amber-300/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs">
                      <div className="w-12 h-12 rounded-xl bg-[#f59e0b] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Trophy size={24} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block">
                          TỈNH DẪN ĐẦU NGÀNH
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                          {topTinh.tinh}
                        </h4>
                        <p className="text-xs sm:text-[13px] font-black text-emerald-600 mt-0.5">
                          {(topTinh.ht || 0).toFixed(0)}% (Thực đạt {Math.round(topTinh.real || 0).toLocaleString('vi-VN')} / Tar {Math.round(topTinh.target || 0).toLocaleString('vi-VN')})
                        </p>
                      </div>
                    </div>

                    {/* Right: Tỉnh cần tăng tốc */}
                    <div className="bg-[#fff1f2] border border-rose-300/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs">
                      <div className="w-12 h-12 rounded-xl bg-[#f43f5e] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <AlertCircle size={24} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-black text-rose-800 uppercase tracking-wider block">
                          TỈNH CẦN TĂNG TỐC
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                          {botTinh.tinh}
                        </h4>
                        <p className="text-xs sm:text-[13px] font-black text-rose-600 mt-0.5">
                          {(botTinh.ht || 0).toFixed(0)}% (Thực đạt {Math.round(botTinh.real || 0).toLocaleString('vi-VN')} / Tar {Math.round(botTinh.target || 0).toLocaleString('vi-VN')})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Template selector & Tag options */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs sm:text-[13px] font-black text-slate-800">
                        Chọn mẫu nội dung nhận xét ({catName.toUpperCase()}):
                      </span>
                      <div className="flex items-center gap-2">
                        {[
                          { id: 'user', label: 'User' },
                          { id: 'sieuthi', label: 'Siêu thị' },
                          { id: 'all', label: 'Siêu thị + User' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setCatFeedbackTagMode(opt.id as any);
                              setCatFeedbackCustomText(null);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border",
                              catFeedbackTagMode === opt.id
                                ? "bg-gradient-to-r from-[#1d4ed8] to-[#0284c7] border-blue-600 text-white shadow-2xs"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                            )}
                          >
                            <span className={cn(
                              "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black",
                              catFeedbackTagMode === opt.id ? "bg-white text-[#1d4ed8]" : "border border-slate-300 bg-white text-transparent"
                            )}>
                              ✓
                            </span>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2 Template Tabs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCatFeedbackTemplate('mau1');
                          setCatFeedbackCustomText(null);
                        }}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border text-center",
                          catFeedbackTemplate === 'mau1'
                            ? "bg-amber-50 border-amber-400 text-amber-800 shadow-xs ring-2 ring-amber-400/20"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        )}
                      >
                        <span>🔥 Mẫu 1: Xếp hạng Tỉnh (TOP/BOT)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCatFeedbackTemplate('mau2');
                          setCatFeedbackCustomText(null);
                        }}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border text-center",
                          catFeedbackTemplate === 'mau2'
                            ? "bg-sky-50 border-sky-400 text-sky-800 shadow-xs ring-2 ring-sky-400/20"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        )}
                      >
                        <span>⚡ Mẫu 2: Tóm tắt Ngành hàng (Top/Bot)</span>
                      </button>
                    </div>
                  </div>

                  {/* Textarea Content */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-[13px] font-black text-slate-800 block">
                      Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
                    </label>
                    <textarea
                      value={currentText}
                      onChange={(e) => setCatFeedbackCustomText(e.target.value)}
                      rows={10}
                      className="w-full p-3.5 sm:p-4 bg-slate-50/70 border-2 border-slate-200 rounded-2xl text-xs sm:text-[13px] font-sans text-slate-800 outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 leading-relaxed resize-y custom-scrollbar transition-all"
                      placeholder="Nội dung nhận xét ngành hàng..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 shrink-0">
                  <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
                    Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(currentText);
                        setCatFeedbackCopied(true);
                        setTimeout(() => setCatFeedbackCopied(false), 2500);
                      }
                    }}
                    className={cn(
                      "w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95",
                      catFeedbackCopied
                        ? "bg-emerald-600 text-white shadow-emerald-600/30"
                        : "bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#06b6d4] hover:from-[#1e40af] hover:to-[#0284c7] text-white shadow-blue-500/30"
                    )}
                  >
                    {catFeedbackCopied ? (
                      <>
                        <Check size={16} strokeWidth={3} />
                        <span>ĐÃ SAO CHÉP!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} strokeWidth={2.3} />
                        <span>SAO CHÉP NHẬN XÉT</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      {/* Modal for Firebase Sync & Load Progress (Matches user visual screenshot) */}
      {isSyncingModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-slate-100 w-full max-w-[540px] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Top Icon with subtle glow */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 flex items-center justify-center shadow-lg shadow-blue-400/30 mb-6 relative">
              <RefreshCw size={36} className="text-white animate-spin" style={{ animationDuration: '2.5s' }} />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight mb-5">
              {syncModalTitle}
            </h2>

            {/* Sub-card with Step info */}
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3.5 px-5 mb-6">
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
                {syncModalStep}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 sm:h-3 overflow-hidden p-0.5 mb-3 border border-slate-200/60">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, syncModalProgress))}%` }}
              />
            </div>

            {/* Footer Row */}
            <div className="w-full flex items-center justify-between text-xs sm:text-[13px] font-bold text-slate-500">
              <span>{syncModalFooter}</span>
              <span className="text-blue-600 font-black">{Math.round(syncModalProgress)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
