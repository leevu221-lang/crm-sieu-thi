import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, BarChart3, Activity, Save, CheckCircle2, AlertCircle, Loader2, 
  Database, Trophy, Search, ChevronRight, RefreshCw, LayoutGrid, Crown, Sparkles, CloudDownload,
  FileSpreadsheet, FileUp, Upload, Table2, Filter, Download, Trash2, Eye, ArrowUpDown, TrendingUp, Hash
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// Standard box component for inputs in TNB_DATA
const InputBox = ({ 
  title, 
  icon: Icon, 
  value, 
  onChange, 
  placeholder,
  isDirty,
  headerAction
}: { 
  title: string; 
  icon?: React.ElementType; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string;
  isDirty: boolean;
  headerAction?: React.ReactNode;
}) => (
  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/60 shadow-md shadow-slate-100/40 hover:shadow-lg transition-all duration-300 flex flex-col h-full space-y-3 relative group">
    {isDirty && (
      <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
      </span>
    )}
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
        {Icon && <Icon size={18} strokeWidth={2.2} />}
      </div>
      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">{title}</h3>
      {headerAction && <div className="ml-auto">{headerAction}</div>}
    </div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full flex-1 min-h-[140px] p-4 text-xs font-normal border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all duration-300 resize-y"
      placeholder={placeholder || "Dán dữ liệu từ báo cáo BI..."}
    />
  </div>
);

// Formatted value parser with fallback
const parsePct = (v: string) => {
  if (!v) return 0;
  const cleaned = v.replace('%', '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
};

// Progress percentage cell color code
const pctCls = (v: string) => {
  const n = parsePct(v);
  if (!v) return 'text-slate-400 font-medium';
  if (n >= 100) return 'bg-emerald-50 text-emerald-700 font-black border border-emerald-100 rounded-lg px-2 py-1';
  if (n >= 80) return 'bg-amber-50 text-amber-700 font-black border border-amber-100 rounded-lg px-2 py-1';
  return 'bg-rose-50 text-rose-600 font-black border border-rose-100 rounded-lg px-2 py-1';
};

// LZW compression helper function (safely handles unicode via TextEncoder)
function compressLZW(text: string): string {
  if (!text) return '';
  const bytes = new TextEncoder().encode(text);
  const dictionary: Record<string, number> = {};
  for (let i = 0; i < 256; i++) {
    dictionary[String.fromCharCode(i)] = i;
  }
  let word = '';
  const result: number[] = [];
  let dictSize = 256;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    const char = String.fromCharCode(byte);
    const wordChar = word + char;
    if (dictionary[wordChar] !== undefined) {
      word = wordChar;
    } else {
      result.push(dictionary[word]);
      if (dictSize < 65000) {
        dictionary[wordChar] = dictSize++;
      } else {
        // Reset dictionary if it gets too large
        for (let j = 0; j < 256; j++) {
          dictionary[String.fromCharCode(j)] = j;
        }
        dictSize = 256;
      }
      word = char;
    }
  }
  if (word !== '') {
    result.push(dictionary[word]);
  }
  // Convert code numbers to a string of UTF-16 characters
  return '_lzw_:' + result.map(x => String.fromCharCode(x)).join('');
}

// LZW decompression helper function (restores original string via TextDecoder)
function decompressLZW(compText: string): string {
  if (!compText) return '';
  if (!compText.startsWith('_lzw_:')) return compText; // Return as-is if not LZW compressed
  const compressed = compText.substring(6);
  if (compressed.length === 0) return '';
  
  const dictionary: Record<number, string> = {};
  for (let i = 0; i < 256; i++) {
    dictionary[i] = String.fromCharCode(i);
  }
  let dictSize = 256;
  let currChar = compressed.charAt(0);
  let oldPhrase = currChar;
  const outBytes: number[] = [currChar.charCodeAt(0)];
  
  for (let i = 1; i < compressed.length; i++) {
    const code = compressed.charCodeAt(i);
    let phrase = '';
    if (dictionary[code] !== undefined) {
      phrase = dictionary[code];
    } else {
      if (code === dictSize) {
        phrase = oldPhrase + oldPhrase.charAt(0);
      } else {
        // Return original if decompression fails
        return compText;
      }
    }
    
    for (let j = 0; j < phrase.length; j++) {
      outBytes.push(phrase.charCodeAt(j));
    }
    
    if (dictSize < 65000) {
      dictionary[dictSize++] = oldPhrase + phrase.charAt(0);
    } else {
      // Reset dictionary
      for (let j = 0; j < 256; j++) {
        dictionary[j] = String.fromCharCode(j);
      }
      dictSize = 256;
    }
    oldPhrase = phrase;
  }
  
  const uint8 = new Uint8Array(outBytes);
  return new TextDecoder().decode(uint8);
}

export default function TnbData() {
  const { userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'TNB_DATA' | 'TNB_LEADER' | 'RT_ST_EXCEL'>('TNB_DATA');

  // RT SIÊU THỊ Excel upload state
  interface SheetData {
    headers: string[];
    rows: string[][];
    rawRows: string[][]; // ALL rows including headers, preserving original structure
    colGroupColors: Record<number, string>; // column index → color class for category groups
  }
  const [excelData, setExcelData] = useState<{
    headers: string[]; rows: string[][]; rawRows: string[][];
    sheetNames: string[]; activeSheet: string;
    allSheets: Record<string, SheetData>;
    colGroupColors: Record<number, string>;
  }>({
    headers: [], rows: [], rawRows: [],
    sheetNames: [], activeSheet: '',
    allSheets: {},
    colGroupColors: {},
  });
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelSearchQuery, setExcelSearchQuery] = useState('');
  const [excelSortCol, setExcelSortCol] = useState<number | null>(null);
  const [excelSortAsc, setExcelSortAsc] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  
  // TNB data values
  const [data, setData] = useState({
    rt_vung: '',
    lk_vung: '',
    rt_st: '',
    lk_st: '',
    ds_boss: '',
  });

  // Track modified fields that need saving
  const [dirtyFields, setDirtyFields] = useState<Record<keyof typeof data, boolean>>({
    rt_vung: false,
    lk_vung: false,
    rt_st: false,
    lk_st: false,
    ds_boss: false,
  });

  // Keep ref of values to handle debounced saving without stale state
  const dataRef = useRef(data);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Load existing data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.ma_kho) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        console.log('[TnbData] Loading database data for ma_kho:', userProfile.ma_kho);
        const { data: dbData, error } = await supabase
          .from('tnb_data')
          .select('*')
          .eq('warehouse_code', userProfile.ma_kho)
          .maybeSingle();

        if (dbData) {
          setData({
            rt_vung: decompressLZW(dbData.rt_vung || ''),
            lk_vung: decompressLZW(dbData.lk_vung || ''),
            rt_st: decompressLZW(dbData.rt_st || ''),
            lk_st: decompressLZW(dbData.lk_st || ''),
            ds_boss: decompressLZW(dbData.ds_boss || ''),
          });
        }
      } catch (err) {
        console.error('[TnbData] Error fetching database data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userProfile]);

  // Debounced auto-save function
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setSaveStatus('saving');
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!userProfile?.ma_kho) {
        setSaveStatus('idle');
        return;
      }

      try {
        const warehouseCode = userProfile.ma_kho.trim();
        const tenSieuThi = userProfile.ten_sieu_thi || userProfile.username || 'Siêu thị';
        const updatedAt = new Date().toISOString();

        console.log('[TnbData] Auto-saving to database...');
        
        const currentData = dataRef.current;
        
        // Compress text inputs using LZW before saving to stay under Firestore's 1MB limit
        const payload = {
          id: warehouseCode, // Must match warehouseCode for Firestore rules
          warehouse_code: warehouseCode,
          ten_sieu_thi: tenSieuThi,
          rt_vung: compressLZW(currentData.rt_vung),
          lk_vung: compressLZW(currentData.lk_vung),
          rt_st: compressLZW(currentData.rt_st),
          lk_st: compressLZW(currentData.lk_st),
          ds_boss: compressLZW(currentData.ds_boss),
          updated_at: updatedAt,
        };

        const { error } = await supabase
          .from('tnb_data')
          .upsert(payload, { onConflict: 'warehouse_code' });

        if (error) throw error;
        
        setSaveStatus('success');
        setDirtyFields({
          rt_vung: false,
          lk_vung: false,
          rt_st: false,
          lk_st: false,
          ds_boss: false,
        });

        // Revert to idle after 3s
        setTimeout(() => setSaveStatus(prev => prev === 'success' ? 'idle' : prev), 3000);
      } catch (err) {
        console.error('[TnbData] Auto-save error:', err);
        setSaveStatus('error');
      }
    }, 1500); // 1.5 seconds debounce
  }, [userProfile]);

  // Handle field adjustments
  const handleFieldChange = (key: keyof typeof data, val: string) => {
    setData(prev => ({ ...prev, [key]: val }));
    setDirtyFields(prev => ({ ...prev, [key]: true }));
    triggerAutoSave();
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Detect column group colors from header rows (matching reference image)
  const detectColumnGroupColors = (allRows: string[][]): Record<number, string> => {
    const colColors: Record<number, string> = {};
    // Category color mappings matching reference image exactly
    const categoryColors: [RegExp, string][] = [
      [/ITC|CNTT|C\.?N\.?T\.?T/i, '#FFFF00'],         // Yellow
      [/DỊCH VỤ|DICH VU|DV/i, '#00B050'],              // Green  
      [/C\.?E\.?.*GIA DỤNG|GIA DUNG|CE.*GD|C\.E/i, '#4472C4'], // Blue
      [/ĐIỆN T[ỬỰU]|DIEN TU|ĐT(?!\w)/i, '#FFC000'],   // Orange
      [/100\s*%|TỔNG HỢP|TONG HOP/i, '#00B050'],       // Green
    ];
    
    // Scan first 6 rows for category header patterns
    const headerRows = allRows.slice(0, 6);
    for (const row of headerRows) {
      let currentColor = '';
      let lastFilledIdx = -1;
      for (let i = 0; i < row.length; i++) {
        const cellVal = (row[i] || '').trim();
        if (!cellVal) continue;
        // Check if this cell matches a known category
        for (const [pattern, color] of categoryColors) {
          if (pattern.test(cellVal)) {
            currentColor = color;
            lastFilledIdx = i;
            colColors[i] = color;
            break;
          }
        }
        // If we have a current color and this cell is filled (sub-header under a group), keep it
        if (currentColor && cellVal && !Object.values(colColors).length) {
          colColors[i] = currentColor;
        }
      }
    }
    
    // Second pass: fill in gaps between detected category starts
    // Find category start columns and assign ranges
    const categoryStarts: { col: number; color: string }[] = [];
    for (const row of headerRows) {
      for (let i = 0; i < row.length; i++) {
        const cellVal = (row[i] || '').trim();
        if (!cellVal) continue;
        for (const [pattern, color] of categoryColors) {
          if (pattern.test(cellVal)) {
            categoryStarts.push({ col: i, color });
            break;
          }
        }
      }
    }
    
    // Sort by column index and fill ranges
    categoryStarts.sort((a, b) => a.col - b.col);
    const maxCol = Math.max(...allRows.map(r => r.length), 0);
    for (let k = 0; k < categoryStarts.length; k++) {
      const start = categoryStarts[k].col;
      const end = k + 1 < categoryStarts.length ? categoryStarts[k + 1].col : maxCol;
      for (let c = start; c < end; c++) {
        colColors[c] = categoryStarts[k].color;
      }
    }
    
    return colColors;
  };

  // Excel file processing - preserves ALL rows for faithful rendering
  const processExcelFile = useCallback(async (file: File) => {
    setExcelLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellStyles: true });
      const sheetNames = workbook.SheetNames;
      
      const allSheets: Record<string, SheetData> = {};
      
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
        
        if (jsonData.length === 0) {
          allSheets[sheetName] = { headers: [], rows: [], rawRows: [], colGroupColors: {} };
          continue;
        }
        
        // Find the widest row to determine column count
        const maxCols = Math.max(...jsonData.map(r => r.length));
        
        // Store ALL raw rows (pad to maxCols)
        const rawRows = jsonData
          .map(row => {
            const paddedRow = [...row];
            while (paddedRow.length < maxCols) paddedRow.push('');
            return paddedRow.map((cell: any) => String(cell ?? ''));
          });
        
        // First row as headers (for stats)
        const headers = rawRows[0]?.map((h, idx) => {
          const val = h.trim();
          return val || `Cột ${idx + 1}`;
        }) || [];
        
        // Data rows (skip empty rows for stats)
        const rows = rawRows.slice(1)
          .filter(row => row.some(cell => cell.trim() !== ''));
        
        // Detect column group colors
        const colGroupColors = detectColumnGroupColors(rawRows);
        
        allSheets[sheetName] = { headers, rows, rawRows, colGroupColors };
      }
      
      const firstSheet = sheetNames[0];
      const first = allSheets[firstSheet];
      setExcelData({
        headers: first?.headers || [],
        rows: first?.rows || [],
        rawRows: first?.rawRows || [],
        sheetNames,
        activeSheet: firstSheet,
        allSheets,
        colGroupColors: first?.colGroupColors || {},
      });
    } catch (err) {
      console.error('[TnbData] Excel parse error:', err);
      alert('Lỗi đọc file Excel! Vui lòng kiểm tra lại file.');
    } finally {
      setExcelLoading(false);
    }
  }, []);

  const handleExcelFileSelect = useCallback((file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
      alert('Chỉ chấp nhận file .xlsx hoặc .xls');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('File quá lớn! Tối đa 50MB.');
      return;
    }
    setExcelFile(file);
    setExcelSearchQuery('');
    setExcelSortCol(null);
    processExcelFile(file);
  }, [processExcelFile]);

  const handleExcelDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleExcelFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleExcelFileSelect]);

  const handleExcelSheetChange = useCallback((sheetName: string) => {
    const sheet = excelData.allSheets[sheetName];
    if (sheet) {
      setExcelData(prev => ({
        ...prev,
        headers: sheet.headers,
        rows: sheet.rows,
        rawRows: sheet.rawRows,
        activeSheet: sheetName,
        colGroupColors: sheet.colGroupColors,
      }));
      setExcelSearchQuery('');
      setExcelSortCol(null);
    }
  }, [excelData.allSheets]);

  const handleExcelSort = useCallback((colIdx: number) => {
    setExcelSortCol(prev => {
      if (prev === colIdx) {
        setExcelSortAsc(a => !a);
        return colIdx;
      }
      setExcelSortAsc(true);
      return colIdx;
    });
  }, []);

  const clearExcelData = useCallback(() => {
    setExcelFile(null);
    setExcelData({ headers: [], rows: [], rawRows: [], sheetNames: [], activeSheet: '', allSheets: {}, colGroupColors: {} });
    setExcelSearchQuery('');
    setExcelSortCol(null);
    if (excelInputRef.current) excelInputRef.current.value = '';
  }, []);

  // Custom visual components for leaderboard display
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<'RT_VUNG' | 'LK_VUNG' | 'RT_ST' | 'LK_ST' | 'DS_BOSS'>('RT_VUNG');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingRtVung, setSyncingRtVung] = useState(false);

  // Google Sheet ID for RT VÙNG sync
  const SHEET_ID = '1ZZt-jFkGgQCXaFbpj4P41NDDNsipnXFYy9X2OUfzLEQ';

  // Sync RT VÙNG from Google Sheets (columns N-S)
  const handleSyncRtVung = useCallback(async () => {
    setSyncingRtVung(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch Google Sheet');
      const csvText = await response.text();

      // Parse CSV properly (handle quoted fields with commas)
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

      const lines = csvText.split('\n').filter(l => l.trim());
      
      // Extract columns N-S (0-indexed: 13-18) from each row
      // Build TSV lines for RT VÙNG
      const tsvLines: string[] = [];
      
      for (const line of lines) {
        const cols = parseCSVLine(line);
        // Columns N(13) through S(18) - get 6 columns
        const rtCols = cols.slice(13, 19).map(c => c.replace(/^"|"$/g, '').trim());
        
        // Skip rows where all RT columns are empty
        if (rtCols.every(c => !c)) continue;
        
        // Skip header/metadata rows (first few rows with instructions)
        const joined = rtCols.join(' ');
        if (joined.includes('REALTIME TỈNH') || joined.includes('MỞ Bi') || joined.includes('CTRL A')) continue;
        if (joined.includes('HD sử dụng') || joined.includes('avatar') || joined.includes('Trở lại')) continue;
        if (joined.includes('BC Thi') || joined.includes('Kết quả thi')) continue;
        if (joined.includes('Điện Máy Xanh') || joined.includes('Sóc Trăng') && joined.includes('Kiên Giang') && joined.includes('Cà Mau')) continue;
        
        // Skip rows that are just category lists or chain names
        if (rtCols[0] && rtCols[0].length > 100) continue;
        
        tsvLines.push(rtCols.join('\t'));
      }

      if (tsvLines.length > 0) {
        const tsvContent = tsvLines.join('\n');
        handleFieldChange('rt_vung', tsvContent);
        console.log('[TnbData] Synced RT VÙNG from Google Sheet:', tsvLines.length, 'rows');
      }
    } catch (err) {
      console.error('[TnbData] Sync RT VÙNG error:', err);
      alert('Đồng bộ thất bại! Vui lòng kiểm tra lại link Google Sheet.');
    } finally {
      setSyncingRtVung(false);
    }
  }, [handleFieldChange]);

  // Sync RT SIÊU THỊ from Google Sheets (sheet "data SIÊU THỊ", columns U-AA)
  const [syncingRtSt, setSyncingRtSt] = useState(false);

  const handleSyncRtSt = useCallback(async () => {
    setSyncingRtSt(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('data SIÊU THỊ')}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch Google Sheet');
      const csvText = await response.text();

      // Parse CSV properly (handle quoted fields with commas)
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

      const lines = csvText.split('\n').filter(l => l.trim());
      
      // First pass: parse all rows with full columns
      const allParsed = lines.map(line => {
        const cols = parseCSVLine(line);
        const rtCols = cols.slice(20, 27).map(c => c.replace(/^"|"$/g, '').trim());
        // Also get column B (index 1) for ngành hàng name
        const colB = (cols[1] || '').replace(/^"|"$/g, '').trim();
        return { rtCols, colB };
      });

      // Second pass: find rows where next row is "Tổng" (ngành hàng header rows)
      const headerRowIndices = new Set<number>();
      for (let i = 0; i < allParsed.length - 1; i++) {
        const nextRt = allParsed[i + 1].rtCols;
        if (nextRt[0] && nextRt[0].toUpperCase().includes('TỔNG')) {
          headerRowIndices.add(i);
        }
      }

      // Build TSV lines
      const tsvLines: string[] = [];
      
      for (let i = 0; i < allParsed.length; i++) {
        const { rtCols, colB } = allParsed[i];
        
        // If this is a ngành hàng header row (1 row before Tổng)
        if (headerRowIndices.has(i)) {
          // Use ngành hàng name from colB or rtCols[0]
          const nganhName = rtCols[0] || colB || '';
          if (nganhName) {
            tsvLines.push(nganhName + '\t\t\t\t\t\t');
          }
          continue;
        }
        
        // Skip rows where all RT columns are empty
        if (rtCols.every(c => !c)) continue;
        
        // Skip header/metadata rows
        const joined = rtCols.join(' ');
        if (joined.includes('REALTIME') && joined.includes('MỞ Bi')) continue;
        if (joined.includes('HD sử dụng') || joined.includes('avatar') || joined.includes('Trở lại')) continue;
        if (joined.includes('BC Thi') || joined.includes('Kết quả thi')) continue;
        if (joined.includes('ADM -')) continue;
        
        // Skip rows that are just category/store lists
        if (rtCols[0] && rtCols[0].length > 200) continue;
        
        tsvLines.push(rtCols.join('\t'));
      }

      if (tsvLines.length > 0) {
        const tsvContent = tsvLines.join('\n');
        handleFieldChange('rt_st', tsvContent);
        console.log('[TnbData] Synced RT SIÊU THỊ from Google Sheet:', tsvLines.length, 'rows');
      }
    } catch (err) {
      console.error('[TnbData] Sync RT SIÊU THỊ error:', err);
      alert('Đồng bộ RT SIÊU THỊ thất bại! Vui lòng kiểm tra lại link Google Sheet.');
    } finally {
      setSyncingRtSt(false);
    }
  }, [handleFieldChange]);

  // ----------------------------------------------------
  // PARSING LOGIC FOR LEADERBOARDS
  // ----------------------------------------------------

  // 1. Regional parsing (carry-forward departments)
  const parseRegionalData = (rawText: string) => {
    if (!rawText || !rawText.trim()) return [];
    
    const lines = rawText.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Locate targets row to begin parsing
    const targetIdx = lines.findIndex(line =>
      line.toUpperCase().includes('TARGET NGÀY') || line.toUpperCase().includes('TARGET NGAY')
    );
    
    const visibleLines = (targetIdx !== -1 ? lines.slice(targetIdx) : lines.slice(1))
      .filter(line => !line.toLowerCase().includes('hỗ trợ bi liên hệ user'));

    const isMarkerRow = (cols: string[]) =>
      cols.some(c => c.toUpperCase().includes('DT REALTIME') || c.toUpperCase().includes('SL REALTIME'));

    let currentNganh = 'CHUNG';
    
    return visibleLines.map(row => {
      const cols = row.split('\t').map(c => c.trim());
      const isMarker = isMarkerRow(cols);
      
      if (isMarker && cols[0]) {
        currentNganh = cols[0];
      }

      return {
        nganhHang: currentNganh,
        tinh: cols[0] || '',
        realtime: cols[1] || '',
        target: cols[2] || '',
        percent: cols[3] || '',
        rank: cols[4] || '',
        isMarker,
        isTotal: row.toUpperCase().includes('TỔNG'),
        isTarget: row.toUpperCase().includes('TARGET NGÀY') || row.toUpperCase().includes('TARGET NGAY'),
      };
    });
  };

  // 2. Generic TSV parsing for supermarkets
  const parseGenericTSV = (rawText: string) => {
    if (!rawText || !rawText.trim()) return { headers: [], rows: [] };
    
    const lines = rawText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = lines[0].split('\t').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const cols = line.split('\t').map(c => c.trim());
      // Pad cells to match headers length
      while (cols.length < headers.length) cols.push('');
      return cols;
    });

    return { headers, rows };
  };

  // 3. Boss directories parsing
  interface BossProfile {
    name: string;
    title: string;
    description?: string;
  }
  
  const parseBosses = (rawText: string): BossProfile[] => {
    if (!rawText || !rawText.trim()) return [];
    
    const lines = rawText.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Check if it is a TSV format or lists
    const hasTabs = lines.some(l => l.includes('\t'));
    if (hasTabs) {
      const parsed = parseGenericTSV(rawText);
      const nameIdx = parsed.headers.findIndex(h => h.toUpperCase().includes('TÊN') || h.toUpperCase().includes('BOSS') || h.toUpperCase().includes('NHÂN VIÊN'));
      const titleIdx = parsed.headers.findIndex(h => h.toUpperCase().includes('CHỨC') || h.toUpperCase().includes('TITLE') || h.toUpperCase().includes('VAI TRÒ'));
      
      return parsed.rows.map(row => {
        const nameVal = nameIdx !== -1 ? row[nameIdx] : row[0];
        const titleVal = titleIdx !== -1 ? row[titleIdx] : (row[1] || 'Lãnh đạo');
        const descriptionVal = row.filter((val, idx) => idx !== nameIdx && idx !== titleIdx).join(' - ');
        
        return {
          name: nameVal || 'Chưa rõ tên',
          title: titleVal || 'Lãnh đạo',
          description: descriptionVal
        };
      });
    }

    // Newline format parsing
    return lines.map(line => {
      // Split by hyphen, comma, colon
      const separators = [' - ', ' : ', ' , ', '-', ':', ','];
      for (const sep of separators) {
        if (line.includes(sep)) {
          const parts = line.split(sep);
          const name = parts[0].trim();
          const title = parts.slice(1).join(' - ').trim();
          return { name, title };
        }
      }
      return { name: line.trim(), title: 'Lãnh đạo' };
    });
  };

  // Run filtering on leaderboards
  const renderLeaderboardContent = () => {
    switch (selectedLeaderboard) {
      case 'RT_VUNG': {
        const rows = parseRegionalData(data.rt_vung);
        if (rows.length === 0) return <EmptyLeaderboard message="RT VÙNG" />;
        
        const filtered = rows.filter(r => 
          r.tinh.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.nganhHang.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
          <div className="space-y-4">
            <SummaryCards rows={rows} />
            <div className="overflow-x-auto border border-slate-200/80 rounded-3xl bg-white shadow-xl">
              <table className="min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                    <th className="p-4 border-b border-slate-800 text-left">Ngành hàng</th>
                    <th className="p-4 border-b border-slate-800 text-left">Tỉnh / Bộ phận</th>
                    <th className="p-4 border-b border-slate-800 text-center">Doanh thu đạt</th>
                    <th className="p-4 border-b border-slate-800 text-center">Mục tiêu</th>
                    <th className="p-4 border-b border-slate-800 text-center">% Hoàn thành</th>
                    <th className="p-4 border-b border-slate-800 text-center">Xếp hạng</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const isSpecial = row.isMarker || row.isTarget || row.isTotal;
                    let rowCls = 'bg-white hover:bg-slate-50';
                    if (row.isMarker) rowCls = 'bg-slate-800 text-white font-bold';
                    else if (row.isTarget) rowCls = 'bg-indigo-900 text-indigo-100 font-extrabold';
                    else if (row.isTotal) rowCls = 'bg-amber-50/70 font-black text-slate-800 border-t border-b border-slate-200';
                    else if (idx % 2 !== 0) rowCls = 'bg-slate-50/50 hover:bg-slate-100/60';

                    return (
                      <tr key={idx} className={`${rowCls} transition-colors duration-250`}>
                        <td className={`p-4 border-b border-slate-100 font-black tracking-wide ${isSpecial ? 'text-white' : 'text-indigo-600 bg-indigo-50/30'}`}>
                          {row.nganhHang}
                        </td>
                        <td className={`p-4 border-b border-slate-100 font-bold ${isSpecial ? 'text-white' : 'text-slate-800'}`}>
                          {row.tinh}
                        </td>
                        <td className="p-4 border-b border-slate-100 text-center">{row.realtime}</td>
                        <td className="p-4 border-b border-slate-100 text-center">{row.target}</td>
                        <td className="p-4 border-b border-slate-100 text-center">
                          {isSpecial ? <span>{row.percent}</span> : <span className={pctCls(row.percent)}>{row.percent}</span>}
                        </td>
                        <td className={`p-4 border-b border-slate-100 text-center font-black ${isSpecial ? 'text-white' : 'text-indigo-600'}`}>
                          {row.rank}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      
      case 'LK_VUNG': {
        const rows = parseRegionalData(data.lk_vung);
        if (rows.length === 0) return <EmptyLeaderboard message="LK VÙNG" />;
        
        const filtered = rows.filter(r => 
          r.tinh.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.nganhHang.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
          <div className="space-y-4">
            <SummaryCards rows={rows} />
            <div className="overflow-x-auto border border-slate-200/80 rounded-3xl bg-white shadow-xl">
              <table className="min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                    <th className="p-4 border-b border-slate-800 text-left">Ngành hàng</th>
                    <th className="p-4 border-b border-slate-800 text-left">Tỉnh / Bộ phận</th>
                    <th className="p-4 border-b border-slate-800 text-center">Doanh thu lũy kế</th>
                    <th className="p-4 border-b border-slate-800 text-center">Mục tiêu lũy kế</th>
                    <th className="p-4 border-b border-slate-800 text-center">% Hoàn thành</th>
                    <th className="p-4 border-b border-slate-800 text-center">Xếp hạng</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const isSpecial = row.isMarker || row.isTarget || row.isTotal;
                    let rowCls = 'bg-white hover:bg-slate-50';
                    if (row.isMarker) rowCls = 'bg-slate-800 text-white font-bold';
                    else if (row.isTarget) rowCls = 'bg-indigo-900 text-indigo-100 font-extrabold';
                    else if (row.isTotal) rowCls = 'bg-amber-50/70 font-black text-slate-800 border-t border-b border-slate-200';
                    else if (idx % 2 !== 0) rowCls = 'bg-slate-50/50 hover:bg-slate-100/60';

                    return (
                      <tr key={idx} className={`${rowCls} transition-colors duration-250`}>
                        <td className={`p-4 border-b border-slate-100 font-black tracking-wide ${isSpecial ? 'text-white' : 'text-indigo-600 bg-indigo-50/30'}`}>
                          {row.nganhHang}
                        </td>
                        <td className={`p-4 border-b border-slate-100 font-bold ${isSpecial ? 'text-white' : 'text-slate-800'}`}>
                          {row.tinh}
                        </td>
                        <td className="p-4 border-b border-slate-100 text-center">{row.realtime}</td>
                        <td className="p-4 border-b border-slate-100 text-center">{row.target}</td>
                        <td className="p-4 border-b border-slate-100 text-center">
                          {isSpecial ? <span>{row.percent}</span> : <span className={pctCls(row.percent)}>{row.percent}</span>}
                        </td>
                        <td className={`p-4 border-b border-slate-100 text-center font-black ${isSpecial ? 'text-white' : 'text-indigo-600'}`}>
                          {row.rank}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'RT_ST': {
        const { headers, rows } = parseGenericTSV(data.rt_st);
        if (rows.length === 0) return <EmptyLeaderboard message="RT SIÊU THỊ" />;

        const filteredRows = rows.filter(row => 
          row.some(cell => cell.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        return (
          <div className="overflow-x-auto border border-slate-200/80 rounded-3xl bg-white shadow-xl">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
                  {headers.map((h, idx) => (
                    <th key={idx} className="p-4 border-b border-slate-800 whitespace-nowrap text-center first:text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rIdx) => {
                  const isTotal = row.some(cell => cell.toUpperCase().includes('TỔNG'));
                  return (
                    <tr 
                      key={rIdx} 
                      className={`
                        border-b border-slate-100 transition-colors
                        ${isTotal ? 'bg-amber-50 font-black text-slate-800' : (rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}
                        hover:bg-indigo-50/40
                      `}
                    >
                      {row.map((cell, cIdx) => (
                        <td 
                          key={cIdx} 
                          className={`
                            p-4 whitespace-nowrap text-center first:text-left first:font-bold
                            ${cIdx === 0 ? 'text-slate-800' : 'text-slate-600'}
                            ${cell.includes('%') ? pctCls(cell) : ''}
                          `}
                        >
                          {cell.includes('%') ? cell : cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      case 'LK_ST': {
        const { headers, rows } = parseGenericTSV(data.lk_st);
        if (rows.length === 0) return <EmptyLeaderboard message="LK SIÊU THỊ" />;

        const filteredRows = rows.filter(row => 
          row.some(cell => cell.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        return (
          <div className="overflow-x-auto border border-slate-200/80 rounded-3xl bg-white shadow-xl">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
                  {headers.map((h, idx) => (
                    <th key={idx} className="p-4 border-b border-slate-800 whitespace-nowrap text-center first:text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rIdx) => {
                  const isTotal = row.some(cell => cell.toUpperCase().includes('TỔNG'));
                  return (
                    <tr 
                      key={rIdx} 
                      className={`
                        border-b border-slate-100 transition-colors
                        ${isTotal ? 'bg-amber-50 font-black text-slate-800' : (rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}
                        hover:bg-indigo-50/40
                      `}
                    >
                      {row.map((cell, cIdx) => (
                        <td 
                          key={cIdx} 
                          className={`
                            p-4 whitespace-nowrap text-center first:text-left first:font-bold
                            ${cIdx === 0 ? 'text-slate-800' : 'text-slate-600'}
                            ${cell.includes('%') ? pctCls(cell) : ''}
                          `}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      case 'DS_BOSS': {
        const bosses = parseBosses(data.ds_boss);
        if (bosses.length === 0) return <EmptyLeaderboard message="DS BOSS" />;

        const filtered = bosses.filter(b => 
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          b.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((boss, idx) => {
              // Extract initials for circular badge
              const initials = boss.name
                .split(' ')
                .filter(Boolean)
                .slice(-2)
                .map(n => n[0].toUpperCase())
                .join('');

              // Harmonies colors for circular badge
              const colors = [
                'bg-indigo-500 text-indigo-50',
                'bg-emerald-500 text-emerald-50',
                'bg-amber-500 text-amber-50',
                'bg-rose-500 text-rose-50',
                'bg-teal-500 text-teal-50',
                'bg-cyan-500 text-cyan-50'
              ];
              const colorCls = colors[idx % colors.length];

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/95 border border-slate-200/80 rounded-3xl p-5 shadow-md flex items-center gap-4 hover:shadow-xl hover:border-indigo-400 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute right-0 top-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all" />
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm uppercase shadow-inner shadow-black/10 shrink-0 ${colorCls}`}>
                    {initials || <Crown size={18} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{boss.name}</h4>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mt-0.5">{boss.title}</p>
                    {boss.description && (
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-1">{boss.description}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      }
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans font-black pb-12">
      <div className="max-w-[1280px] mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        
        {/* Header Navigation & Auto-save status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Navigation Tab selection */}
          <div className="flex p-1.5 bg-slate-200/70 border border-slate-300/30 rounded-2xl w-fit flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('TNB_DATA')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'TNB_DATA'
                  ? "bg-white text-indigo-600 shadow-md shadow-slate-300/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
              }`}
            >
              <Database size={14} strokeWidth={2.2} />
              <span>TNB DATA</span>
            </button>
            <button
              onClick={() => setActiveTab('TNB_LEADER')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'TNB_LEADER'
                  ? "bg-white text-indigo-600 shadow-md shadow-slate-300/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
              }`}
            >
              <Trophy size={14} strokeWidth={2.2} />
              <span>BẢNG XẾP HẠNG</span>
            </button>
            <button
              onClick={() => setActiveTab('RT_ST_EXCEL')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'RT_ST_EXCEL'
                  ? "bg-white text-emerald-600 shadow-md shadow-emerald-200/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
              }`}
            >
              <FileSpreadsheet size={14} strokeWidth={2.2} />
              <span>RT SIÊU THỊ</span>
            </button>
          </div>

          {/* Toast / Global Auto-save status */}
          <div className="shrink-0 flex items-center">
            <AnimatePresence mode="wait">
              {saveStatus !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold border ${
                    saveStatus === 'saving'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : saveStatus === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {saveStatus === 'saving' && <Loader2 size={13} className="animate-spin" />}
                  {saveStatus === 'success' && <CheckCircle2 size={13} />}
                  {saveStatus === 'error' && <AlertCircle size={13} />}
                  <span>
                    {saveStatus === 'saving' && 'Đang lưu tự động...'}
                    {saveStatus === 'success' && 'Đã lưu tự động vào DB'}
                    {saveStatus === 'error' && 'Lỗi kết nối database!'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main tabs container */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'TNB_DATA' ? (
              <motion.div
                key="TNB_DATA"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex items-start gap-3 text-slate-600 shadow-inner">
                  <Sparkles className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs font-bold leading-normal">
                    Hệ thống sẽ **tự động lưu** dữ liệu vào database Firestore mỗi khi bạn hoàn tất chỉnh sửa. Bạn không cần bấm bất kỳ nút Lưu nào. Dữ liệu này sẽ được dùng để tạo bảng xếp hạng và các thống kê bên tab **TNB LEADER**.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputBox 
                    title="RT VÙNG" 
                    icon={Activity} 
                    value={data.rt_vung} 
                    onChange={(v) => handleFieldChange('rt_vung', v)} 
                    placeholder="Dán dữ liệu Realtime Vùng Tây Nam Bộ..."
                    isDirty={dirtyFields.rt_vung}
                    headerAction={
                      <button
                        onClick={handleSyncRtVung}
                        disabled={syncingRtVung}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          syncingRtVung
                            ? 'bg-slate-100 text-slate-400 cursor-wait'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 active:scale-95'
                        }`}
                      >
                        {syncingRtVung ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                        {syncingRtVung ? 'Đang đồng bộ...' : 'Sync GSheet'}
                      </button>
                    }
                  />
                  <InputBox 
                    title="LK VÙNG" 
                    icon={BarChart3} 
                    value={data.lk_vung} 
                    onChange={(v) => handleFieldChange('lk_vung', v)} 
                    placeholder="Dán dữ liệu Lũy Kế Vùng Tây Nam Bộ..."
                    isDirty={dirtyFields.lk_vung}
                  />
                  <InputBox 
                    title="RT SIÊU THỊ" 
                    icon={Activity} 
                    value={data.rt_st} 
                    onChange={(v) => handleFieldChange('rt_st', v)} 
                    placeholder="Dán dữ liệu Realtime Siêu Thị Tây Nam Bộ..."
                    isDirty={dirtyFields.rt_st}
                    headerAction={
                      <button
                        onClick={handleSyncRtSt}
                        disabled={syncingRtSt}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          syncingRtSt
                            ? 'bg-slate-100 text-slate-400 cursor-wait'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 active:scale-95'
                        }`}
                      >
                        {syncingRtSt ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                        {syncingRtSt ? 'Đang đồng bộ...' : 'Sync GSheet'}
                      </button>
                    }
                  />
                  <InputBox 
                    title="LK SIÊU THỊ" 
                    icon={BarChart3} 
                    value={data.lk_st} 
                    onChange={(v) => handleFieldChange('lk_st', v)} 
                    placeholder="Dán dữ liệu Lũy Kế Siêu Thị Tây Nam Bộ..."
                    isDirty={dirtyFields.lk_st}
                  />
                  <div className="md:col-span-2">
                    <InputBox 
                      title="DS BOSS" 
                      icon={Users} 
                      value={data.ds_boss} 
                      onChange={(v) => handleFieldChange('ds_boss', v)} 
                      placeholder="Nhập hoặc dán danh sách Lãnh đạo (Boss) Tây Nam Bộ. Ví dụ: Nguyễn Văn A - Quản lý Vùng..."
                      isDirty={dirtyFields.ds_boss}
                    />
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'TNB_LEADER' ? (
              <motion.div
                key="TNB_LEADER"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Tab selections for leaderboards */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-2xl w-fit flex-wrap gap-1">
                    {(['RT_VUNG', 'LK_VUNG', 'RT_ST', 'LK_ST', 'DS_BOSS'] as const).map((tab) => {
                      const labels = {
                        RT_VUNG: 'RT VÙNG',
                        LK_VUNG: 'LK VÙNG',
                        RT_ST: 'RT SIÊU THỊ',
                        LK_ST: 'LK SIÊU THỊ',
                        DS_BOSS: 'BAN LÃNH ĐẠO (BOSS)'
                      };
                      return (
                        <button
                          key={tab}
                          onClick={() => { setSelectedLeaderboard(tab); setSearchQuery(''); }}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                            selectedLeaderboard === tab
                              ? "bg-slate-900 text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                          }`}
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search filter */}
                  <div className="relative w-full md:max-w-xs group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Search size={14} />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl font-normal text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all duration-300 text-xs shadow-inner"
                      placeholder="Tìm kiếm..."
                    />
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="space-y-4">
                  {renderLeaderboardContent()}
                </div>
              </motion.div>
            ) : (
              /* RT SIÊU THỊ - Excel Upload & Data Analysis Tab (Matching reference image) */
              <motion.div
                key="RT_ST_EXCEL"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
              >
                {/* Upload Zone */}
                {!excelFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleExcelDrop}
                    className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-500 ${
                      dragActive
                        ? 'border-emerald-400 bg-emerald-50/60 scale-[1.005] shadow-xl shadow-emerald-100'
                        : 'border-slate-300 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30 hover:border-emerald-300 hover:shadow-lg'
                    }`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.08),transparent_70%)]" />
                    <div className="relative p-10 flex flex-col items-center text-center space-y-4">
                      <motion.div
                        animate={dragActive ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className={`p-4 rounded-2xl shadow-lg transition-colors duration-300 ${
                          dragActive
                            ? 'bg-emerald-500 text-white shadow-emerald-200'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-100'
                        }`}
                      >
                        <Upload size={28} strokeWidth={2.5} />
                      </motion.div>
                      <div className="space-y-1.5">
                        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                          {dragActive ? 'Thả file vào đây!' : 'Nhập File Excel RT Siêu Thị'}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium max-w-sm">
                          Kéo thả file Excel (.xlsx, .xls) vào đây hoặc bấm nút bên dưới. Hệ thống hiển thị <strong className="text-emerald-600">100% dữ liệu</strong> từ file.
                        </p>
                      </div>
                      <input
                        ref={excelInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleExcelFileSelect(e.target.files[0]);
                        }}
                        className="hidden"
                        id="excel-rt-st-upload"
                      />
                      <label
                        htmlFor="excel-rt-st-upload"
                        className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all duration-200"
                      >
                        <FileUp size={15} strokeWidth={2.5} />
                        Chọn file Excel
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium">.xlsx, .xls • Tối đa 50MB</p>
                    </div>
                  </div>
                ) : (
                  /* File info bar */
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#00B050] text-white rounded-lg">
                        <FileSpreadsheet size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-xs truncate max-w-[250px] sm:max-w-[400px]">{excelFile.name}</h4>
                        <p className="text-[9px] text-slate-500 font-bold mt-0.5">
                          {(excelFile.size / 1024).toFixed(1)} KB • {excelData.sheetNames.length} sheet(s) • {excelData.rawRows.length} dòng • {(excelData.rawRows[0] || []).length} cột
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="excel-rt-st-upload-replace"
                        className="cursor-pointer flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                      >
                        <RefreshCw size={11} />
                        Đổi file
                      </label>
                      <input type="file" accept=".xlsx,.xls" onChange={(e) => { if (e.target.files?.[0]) handleExcelFileSelect(e.target.files[0]); }} className="hidden" id="excel-rt-st-upload-replace" />
                      <button onClick={clearExcelData} className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-all active:scale-95">
                        <Trash2 size={11} /> Xóa
                      </button>
                    </div>
                  </div>
                )}

                {/* Sheet selector + Search */}
                {excelFile && !excelLoading && excelData.rawRows.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {excelData.sheetNames.length > 1 && (
                      <div className="flex bg-slate-100 p-1 rounded-lg w-fit flex-wrap gap-1 overflow-x-auto">
                        {excelData.sheetNames.map((name) => (
                          <button key={name} onClick={() => handleExcelSheetChange(name)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                              excelData.activeSheet === name ? 'bg-[#00B050] text-white' : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >{name}</button>
                        ))}
                      </div>
                    )}
                    <div className="relative w-full sm:max-w-[260px]">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={excelSearchQuery} onChange={(e) => setExcelSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:ring-2 focus:ring-[#00B050]/20 focus:border-[#00B050] focus:outline-none transition-all"
                        placeholder="Tìm kiếm..." />
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {excelLoading && (
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="relative">
                      <div className="w-14 h-14 border-4 border-emerald-100 rounded-full" />
                      <div className="w-14 h-14 border-4 border-[#00B050] rounded-full border-t-transparent animate-spin absolute top-0 left-0" />
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Đang phân tích file Excel...</p>
                  </div>
                )}

                {/* ========== FULL DATA TABLE — SPREADSHEET STYLE (matching reference) ========== */}
                {!excelLoading && excelData.rawRows.length > 0 && (() => {
                  const allRaw = excelData.rawRows;
                  const colColors = excelData.colGroupColors;
                  
                  // Determine how many top rows are "header" rows (non-data: title, category groups, sub-headers)
                  // Heuristic: header rows are the rows before consistent data begins
                  let headerRowCount = 0;
                  for (let r = 0; r < Math.min(allRaw.length, 8); r++) {
                    const row = allRaw[r];
                    const filledCells = row.filter(c => c.trim() !== '').length;
                    const totalCols = row.length;
                    const fillRatio = totalCols > 0 ? filledCells / totalCols : 0;
                    const upperJoin = row.map(c => c.toUpperCase()).join(' ');
                    
                    // Header rows typically: have low fill ratio, or contain keywords
                    const hasKeyword = /THI ĐUA|NGÀNH HÀNG|THỜI GIAN|TỈNH|KÊNH|BOSS|SIÊU THỊ|DT REALTIME|SL REALTIME|TARGET|TOÀN QUỐC|100\s*%/i.test(upperJoin);
                    const isLowFill = fillRatio < 0.5;
                    
                    if (hasKeyword || isLowFill || r < 2) {
                      headerRowCount = r + 1;
                    }
                  }
                  // Ensure at least 1 header row
                  if (headerRowCount === 0) headerRowCount = 1;
                  
                  const headerRows = allRaw.slice(0, headerRowCount);
                  let dataRows = allRaw.slice(headerRowCount);
                  
                  // Filter data rows by search
                  if (excelSearchQuery.trim()) {
                    const q = excelSearchQuery.toLowerCase();
                    dataRows = dataRows.filter(row => row.some(cell => cell.toLowerCase().includes(q)));
                  }
                  
                  // Sort data rows
                  if (excelSortCol !== null) {
                    const col = excelSortCol;
                    dataRows = [...dataRows].sort((a, b) => {
                      const va = a[col] || '';
                      const vb = b[col] || '';
                      const na = parseFloat(va.replace(/[,%]/g, '').replace(/\./g, '').replace(',', '.'));
                      const nb = parseFloat(vb.replace(/[,%]/g, '').replace(/\./g, '').replace(',', '.'));
                      if (!isNaN(na) && !isNaN(nb)) return excelSortAsc ? na - nb : nb - na;
                      return excelSortAsc ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
                    });
                  }

                  // Color utility for header cells based on category detection  
                  const getHeaderCellBg = (colIdx: number): string => {
                    const color = colColors[colIdx];
                    if (!color) return '';
                    switch (color) {
                      case '#FFFF00': return 'background-color: #FFFF00; color: #000;'; // Yellow - ITC
                      case '#00B050': return 'background-color: #00B050; color: #fff;'; // Green
                      case '#4472C4': return 'background-color: #4472C4; color: #fff;'; // Blue - CE&GD
                      case '#FFC000': return 'background-color: #FFC000; color: #000;'; // Orange
                      default: return `background-color: ${color}; color: #000;`;
                    }
                  };
                  
                  // Light tint for data column backgrounds
                  const getDataColTint = (colIdx: number): string => {
                    const color = colColors[colIdx];
                    if (!color) return '';
                    switch (color) {
                      case '#FFFF00': return 'background-color: rgba(255,255,0,0.08);';
                      case '#00B050': return 'background-color: rgba(0,176,80,0.06);';
                      case '#4472C4': return 'background-color: rgba(68,114,196,0.08);';
                      case '#FFC000': return 'background-color: rgba(255,192,0,0.08);';
                      default: return '';
                    }
                  };
                  
                  // Cell value color for percentages (matching reference: green for >=100%, red for <80%)
                  const getCellValueStyle = (val: string, isDataRow: boolean): string => {
                    if (!isDataRow) return '';
                    const cleaned = val.replace('%', '').replace(',', '.').trim();
                    const num = parseFloat(cleaned);
                    if (val.includes('%') && !isNaN(num)) {
                      if (num >= 100) return 'background-color: #92D050; color: #000; font-weight: 900;';
                      if (num >= 80) return 'background-color: #FFF2CC; color: #7F6000; font-weight: 700;';
                      return 'background-color: #FF0000; color: #fff; font-weight: 900;';
                    }
                    return '';
                  };

                  // Detect if a row is a "Tổng" (total) row
                  const isTotalRow = (row: string[]) => row.some(c => /^TỔNG$|^TOTAL$/i.test(c.trim()));
                  
                  // Detect if row is a section header (only first cell filled or has category keyword)
                  const isSectionHeader = (row: string[]) => {
                    const filled = row.filter(c => c.trim()).length;
                    if (filled === 1 && row[0].trim()) return true;
                    const joined = row.join(' ').toUpperCase();
                    return filled <= 2 && (joined.includes('NGÀNH') || joined.includes('THI ĐUA'));
                  };

                  const totalDataRows = allRaw.length - headerRowCount;

                  return (
                    <>
                      {/* Spreadsheet-style table */}
                      <div className="overflow-x-auto border border-slate-300 rounded-md bg-white shadow-md">
                        <table className="min-w-full border-collapse" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontSize: '10px' }}>
                          {/* Header rows from Excel (multi-row, colored by category) */}
                          <thead>
                            {headerRows.map((hRow, hIdx) => {
                              // Detect if this is the title row
                              const joinedUpper = hRow.join(' ').toUpperCase();
                              const isTitleRow = joinedUpper.includes('THI ĐUA') || joinedUpper.includes('NGÀNH HÀNG');
                              const isMetaRow = joinedUpper.includes('THỜI GIAN') || joinedUpper.includes('THỜ GIAN') || (joinedUpper.includes('100%') && hRow.filter(c => c.trim()).length <= 3);
                              
                              return (
                                <tr key={`h-${hIdx}`}>
                                  {hRow.map((cell, cIdx) => {
                                    const cellVal = cell.trim();
                                    let bgStyle = '';
                                    let textStyle = 'color: #1e293b;';
                                    let fontWeight = 'font-weight: 700;';
                                    
                                    if (isTitleRow) {
                                      bgStyle = 'background-color: #fff;';
                                      textStyle = 'color: #000;';
                                      fontWeight = 'font-weight: 900; font-size: 13px;';
                                    } else if (isMetaRow) {
                                      bgStyle = 'background-color: #f8fafc;';
                                      textStyle = 'color: #475569;';
                                      fontWeight = 'font-weight: 700; font-size: 10px;';
                                    } else {
                                      // Apply category group color
                                      const headerBg = getHeaderCellBg(cIdx);
                                      if (headerBg) {
                                        bgStyle = headerBg.split(';').filter(s => s.includes('background')).join(';') + ';';
                                        textStyle = headerBg.split(';').filter(s => s.includes('color')).join(';') + ';';
                                      } else {
                                        bgStyle = 'background-color: #f1f5f9;';
                                      }
                                      fontWeight = 'font-weight: 800;';
                                    }

                                    return (
                                      <th
                                        key={cIdx}
                                        style={{
                                          ...Object.fromEntries(
                                            `${bgStyle} ${textStyle} ${fontWeight}`.split(';').filter(Boolean).map(s => {
                                              const [k, v] = s.split(':').map(x => x.trim());
                                              return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v];
                                            })
                                          ),
                                          padding: '4px 6px',
                                          borderRight: '1px solid #cbd5e1',
                                          borderBottom: '1px solid #94a3b8',
                                          whiteSpace: 'nowrap',
                                          textAlign: cIdx < 4 ? 'left' : 'center',
                                          fontSize: isTitleRow ? '13px' : '9px',
                                          textTransform: isTitleRow ? 'none' : 'uppercase',
                                          letterSpacing: isTitleRow ? 'normal' : '0.03em',
                                          minWidth: cIdx < 4 ? '60px' : '45px',
                                        }}
                                        onClick={() => !isTitleRow && !isMetaRow && handleExcelSort(cIdx)}
                                        className={!isTitleRow && !isMetaRow ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                                      >
                                        {cellVal || ''}
                                      </th>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </thead>
                          <tbody>
                            {dataRows.map((row, rIdx) => {
                              const isTotal = isTotalRow(row);
                              const isSection = isSectionHeader(row);
                              
                              let rowBg = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
                              let rowFontWeight = '400';
                              if (isTotal) { rowBg = '#FFF2CC'; rowFontWeight = '900'; }
                              if (isSection) { rowBg = '#e2e8f0'; rowFontWeight = '900'; }

                              return (
                                <tr key={rIdx} style={{ backgroundColor: rowBg }}>
                                  {row.map((cell, cIdx) => {
                                    const cellVal = cell.trim();
                                    const valStyle = getCellValueStyle(cellVal, !isSection);
                                    const colTint = !isTotal && !isSection ? getDataColTint(cIdx) : '';
                                    
                                    // Parse inline styles
                                    const parseCssString = (css: string): Record<string, string> => {
                                      if (!css) return {};
                                      return Object.fromEntries(
                                        css.split(';').filter(Boolean).map(s => {
                                          const [k, v] = s.split(':').map(x => x.trim());
                                          return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v];
                                        })
                                      );
                                    };
                                    
                                    const combinedStyle: React.CSSProperties = {
                                      padding: '3px 5px',
                                      borderRight: '1px solid #e2e8f0',
                                      borderBottom: '1px solid #e2e8f0',
                                      whiteSpace: 'nowrap',
                                      textAlign: cIdx < 4 ? 'left' : 'center',
                                      fontWeight: isTotal || isSection ? '900' : rowFontWeight,
                                      fontSize: '10px',
                                      ...parseCssString(colTint),
                                      ...parseCssString(valStyle),
                                    };
                                    
                                    // First column (TỈNH) styling
                                    if (cIdx === 0 && !isSection) {
                                      combinedStyle.fontWeight = '800';
                                      combinedStyle.color = '#1e293b';
                                    }
                                    
                                    // KÊNH, BOSS, SIÊU THỊ columns
                                    if (cIdx >= 1 && cIdx <= 3 && !isSection) {
                                      combinedStyle.fontWeight = '600';
                                      combinedStyle.color = '#334155';
                                    }

                                    return (
                                      <td key={cIdx} style={combinedStyle}>
                                        {cellVal || ''}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {dataRows.length === 0 && excelSearchQuery && (
                          <div className="p-8 text-center" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
                            <Search size={28} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-500">Không tìm thấy kết quả cho "{excelSearchQuery}"</p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between px-1" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
                        <p className="text-[10px] text-slate-500 font-bold">
                          Hiển thị <span style={{ color: '#00B050' }}>{dataRows.length}</span> / {totalDataRows} dòng • Sheet: <span className="text-indigo-600">"{excelData.activeSheet}"</span>
                        </p>
                        <p className="text-[10px] text-slate-400">{excelFile?.name}</p>
                      </div>
                    </>
                  );
                })()}

                {/* Empty state */}
                {!excelLoading && !excelFile && excelData.rawRows.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 max-w-sm mx-auto" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
                    <div className="w-14 h-14 bg-[#00B050]/10 text-[#00B050] rounded-xl flex items-center justify-center mx-auto">
                      <FileSpreadsheet size={24} />
                    </div>
                    <h3 className="text-xs font-black text-slate-800 uppercase">Chưa có dữ liệu</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Tải lên file Excel <strong style={{ color: '#00B050' }}>RT SIÊU THỊ</strong> để xem toàn bộ dữ liệu.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// HELPER INTERNAL SUB-COMPONENTS
// ----------------------------------------------------

const EmptyLeaderboard = ({ message }: { message: string }) => (
  <div className="bg-white/80 border border-slate-200/80 rounded-3xl p-12 text-center shadow-lg space-y-4 max-w-md mx-auto my-8">
    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
      <Database size={24} />
    </div>
    <div className="space-y-2">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Thiếu dữ liệu hiển thị</h3>
      <p className="text-xs text-slate-500 font-medium leading-relaxed">
        Chưa có dữ liệu cho <strong className="text-indigo-600 font-black">{message}</strong>. Vui lòng chuyển sang tab <strong className="text-slate-700 font-black">TNB DATA (NHẬP LIỆU)</strong> và dán dữ liệu vào.
      </p>
    </div>
  </div>
);

// Card summary metrics for regional data
const SummaryCards = ({ rows }: { rows: any[] }) => {
  const dataRows = rows.filter(r => !r.isMarker && !r.isTarget && !r.isTotal && r.tinh);
  const totalItems = dataRows.length;
  
  // Calculate count of items achievement >= 100%
  const passCount = dataRows.filter(r => parsePct(r.percent) >= 100).length;
  
  // Average achievement rate
  const sumPct = dataRows.reduce((sum, r) => sum + parsePct(r.percent), 0);
  const avgPct = totalItems > 0 ? Math.round(sumPct / totalItems) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 border border-slate-200/60 rounded-3xl shadow-md flex items-center gap-4 hover:shadow-lg transition-all duration-300">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
          <LayoutGrid size={20} strokeWidth={2.2} />
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng đầu mục tỉnh</span>
          <h4 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{totalItems} bộ phận</h4>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 border border-slate-200/60 rounded-3xl shadow-md flex items-center gap-4 hover:shadow-lg transition-all duration-300">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
          <CheckCircle2 size={20} strokeWidth={2.2} />
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hoàn thành &gt;= 100%</span>
          <h4 className="text-xl font-black text-emerald-600 tracking-tight mt-0.5">
            {passCount} / {totalItems} <span className="text-xs font-bold text-slate-400">({totalItems > 0 ? Math.round((passCount / totalItems) * 100) : 0}%)</span>
          </h4>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 border border-slate-200/60 rounded-3xl shadow-md flex items-center gap-4 hover:shadow-lg transition-all duration-300">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
          <Activity size={20} strokeWidth={2.2} />
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tỷ lệ hoàn thành trung bình</span>
          <h4 className="text-xl font-black text-amber-600 tracking-tight mt-0.5">{avgPct}%</h4>
        </div>
      </div>
    </div>
  );
};
