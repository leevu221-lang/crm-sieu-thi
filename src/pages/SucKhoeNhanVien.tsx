/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { HeartPulse, Camera, TrendingUp, Search, ChevronDown, ChevronUp, Check, MessageSquare, FileText, ChevronRight, LayoutGrid, Info, Users, Printer, UploadCloud, Trophy, TrendingDown, Gift, Target, Trash2, Clock, X, ArrowLeft, ArrowRight, ArrowLeftRight, RotateCcw, RefreshCw, AlertCircle, Eye, Filter, Upload, GripVertical, Tag, Sparkles, Copy, Swords, ClipboardPaste, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import * as htmlToImage from 'html-to-image';
import { domToPng } from 'modern-screenshot';
import html2canvas from 'html2canvas';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { useEmployeeHealth } from './EmployeeHealth/hooks/useEmployeeHealth';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../components/CaptureLoadingOverlay';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { useNotification } from '../contexts/NotificationContext';
import { useStore } from '../contexts/StoreContext';
import RevenueRankingTableQd from './EmployeeHealth/components/RevenueRankingTableQd';
import EmployeeDetailTable from './EmployeeHealth/components/EmployeeDetailTable';
import SummaryThiDuaTable, { parseStaffMatrixDataRefined } from './EmployeeHealth/components/SummaryThiDuaTable';
import CategoryDetailByStaffTable from './EmployeeHealth/components/CategoryDetailByStaffTable';
import TongHopNvTable from './EmployeeHealth/components/TongHopNvTable';
import StaffComparisonModal, { StaffComparisonData } from './EmployeeHealth/components/StaffComparisonModal';
import { GiaTriDhTab } from './EmployeeHealth/components/GiaTriDhTab';
import { cn, parseStaffRankData, parseYcxData, normalizeStoreId, parseStaffValueList, normalize, parseCategoryData, cleanCategoryName, isKhoLuuDong, formatCurrencyValue } from './RTST/utils';
import { useCategoryConfig } from '../hooks/useCategoryConfig';

const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

const isCategoryForMarket = (c: any, marketFilter: string): boolean => {
  if (!marketFilter || marketFilter === 'ALL') return true;
  if (!c || !c.marketName) return false;

  // Exclude Kho bán hàng lưu động
  if (isKhoLuuDong(c.marketName)) return false;

  // Exclude categories with no target and no actual (inactive categories)
  if ((typeof c.target === 'number' && c.target <= 0) && (typeof c.actual === 'number' && c.actual <= 0)) {
    return false;
  }
  
  const rawFilterNorm = removeAccents(marketFilter).toLowerCase().trim();
  const rawMarketNorm = removeAccents(c.marketName).toLowerCase().trim();

  const normFilter = rawFilterNorm.replace(/^(dml|dms3|dms|dmm|tgd|aar|bhx)\s*-\s*/i, '').trim();
  const normMarket = rawMarketNorm.replace(/^(dml|dms3|dms|dmm|tgd|aar|bhx)\s*-\s*/i, '').trim();

  const filterCode = (marketFilter.match(/\b\d{4,6}\b/) || [])[0];
  const marketCode = (c.marketName.match(/\b\d{4,6}\b/) || [])[0];
  if (filterCode && marketCode && filterCode === marketCode) return true;

  return rawMarketNorm === rawFilterNorm || 
         normMarket === normFilter ||
         (normMarket.length > 3 && normFilter.length > 3 && normMarket === normFilter);
};

const splitLine = (l: string): string[] => {
  if (l.includes('\t')) {
    return l.split('\t').map(p => p.trim());
  }
  return l.split(/\t|\s{2,}/).map(p => p.trim());
};

const BONUS_COLS = [
  { name: 'Điểm thực lãnh', index: 7 }
];

const LiveClockBadge = React.memo(() => {
  const [liveClockStr, setLiveClockStr] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setLiveClockStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-emerald-200/90 text-emerald-800 rounded-full text-[10px] sm:text-xs md:text-sm font-black tracking-tight shadow-2xs whitespace-nowrap">
      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>{liveClockStr}</span>
    </div>
  );
});

const parseBonusData = (text: string, staffObj: any, marketFilter: string) => {
  if (!text || text.trim().length === 0) return { tong: null, details: Array(8).fill(null) };
  
  // Direct numeric fallback if user types/pastes a raw number directly into the individual input box
  const cleanText = text.trim().replace(/[.,\sđ]/gi, '');
  if (/^\d+$/.test(cleanText)) {
    const val = parseInt(cleanText, 10);
    const details = Array(8).fill(null);
    details[7] = val; // Set the thuc lanh index
    return { tong: val, details };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const currentStoreClean = marketFilter && marketFilter !== 'ALL' 
    ? removeAccents(marketFilter).replace(/^(dml|dms3|dms|dmm|tgd|aar|bhx)\s+/, '').trim()
    : '';
  const staffId = staffObj.fullId;
  const staffNameClean = removeAccents(staffObj.displayName.split('-').pop() || '').trim();

  const getStoreHeader = (line: string): string | null => {
    const cleanLine = removeAccents(line).trim();
    const hasStoreKeyword = cleanLine.includes('sieu thi') || 
                            cleanLine.includes('cua hang') ||
                            cleanLine.includes('dien may xanh') ||
                            cleanLine.includes('the gioi di dong') ||
                            /^(dml|dms3|dms|dmm|tgd|aar|bhx)\b/.test(cleanLine);
    return hasStoreKeyword ? cleanLine : null;
  };

  const colIndices = Array(8).fill(-1);
  let headerColCount = -1;
  let isMultiCol = false;

  for (const line of lines) {
    const parts = splitLine(line);
    const cleanParts = parts.map(p => removeAccents(p));
    const hasSoLuong = cleanParts.some(p => p.includes('so luong'));
    const hasThucLanh = cleanParts.some(p => p.includes('thuc lanh'));
    
    if (hasSoLuong && hasThucLanh) {
      isMultiCol = true;
      headerColCount = parts.length;
      colIndices[0] = cleanParts.findIndex(p => p.includes('so luong'));
      colIndices[1] = cleanParts.findIndex(p => p.includes('tich luy'));
      colIndices[2] = cleanParts.findIndex(p => p.includes('nhap tra'));
      colIndices[3] = cleanParts.findIndex(p => p.includes('thuong nong') && !p.includes('sbh'));
      colIndices[4] = cleanParts.findIndex(p => p.includes('tra gop'));
      colIndices[5] = cleanParts.findIndex(p => p.includes('mdmh') || p.includes('nhan dan'));
      colIndices[6] = cleanParts.findIndex(p => p.includes('sbh'));
      colIndices[7] = cleanParts.findIndex(p => p.includes('thuc lanh'));
      break;
    }
  }

  if (!isMultiCol) {
    for (const line of lines) {
      const parts = splitLine(line);
      const cleanParts = parts.map(p => removeAccents(p));
      const idx = cleanParts.findIndex(p => {
        return p.includes('diem thuc lanh') || 
               p.includes('thuc lanh') ||
               p.includes('thuc nhan') ||
               p.includes('thuc linh') ||
               p.includes('thuc tra');
      });
      if (idx !== -1) {
        headerColCount = parts.length;
        colIndices[7] = idx;
        break;
      }
    }
  }

  let foundStaff = false;
  let targetLines: string[] = [];
  const hasAnyHeader = lines.some(l => getStoreHeader(l) !== null);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = removeAccents(line);
    const matchStaff = cleanLine.includes(staffId) || (staffNameClean && cleanLine.includes(staffNameClean));
    if (matchStaff) {
      let nearestStoreHeader: string | null = null;
      for (let k = i - 1; k >= 0; k--) {
        const header = getStoreHeader(lines[k]);
        if (header) {
          nearestStoreHeader = header;
          break;
        }
      }
      let storeCompatible = true;
      if (currentStoreClean && hasAnyHeader) {
        storeCompatible = nearestStoreHeader !== null && nearestStoreHeader.includes(currentStoreClean);
      }
      if (storeCompatible) {
        foundStaff = true;
        targetLines = [line];
        for (let j = i + 1; j < lines.length; j++) {
          const subLine = lines[j];
          if (getStoreHeader(subLine) !== null) break;
          targetLines.push(subLine);
          const subParts = splitLine(subLine);
          const hasTotalLabel = subParts.some(part => {
            const clean = removeAccents(part);
            return clean === 'tong cong' || clean === 'tong' || clean.includes('tong cong') || clean.includes('tong');
          });
          if (hasTotalLabel) break;
        }
        break;
      }
    }
  }

  const linesToParse = foundStaff ? targetLines : lines;

  let foundRow = false;
  let tong = 0;
  const details: (number | null)[] = Array(8).fill(null);

  for (const line of linesToParse) {
    const parts = splitLine(line);
    
    const hasTotalLabel = parts.some(part => {
      const clean = removeAccents(part);
      return clean === 'tong cong' || 
             clean === 'tong' || 
             clean.startsWith('tong cong') || 
             clean.startsWith('tong ') || 
             clean.startsWith('tong:') ||
             clean.includes('tong cong') || 
             clean.includes('tong');
    });

    const hasNumericData = parts.some(part => {
      const clean = part.replace(/[^\d-]/g, '');
      return clean.length > 0 && !isNaN(parseInt(clean, 10));
    });
    
    if (hasTotalLabel && hasNumericData) {
      foundRow = true;
      
      let offset = 0;
      if (parts.length === headerColCount + 1) {
        offset = 1;
      } else if (parts.length === headerColCount) {
        offset = 0;
      } else {
        const cleanFirst = parts[0].replace(/[^\d-]/g, '');
        const isFirstNumeric = cleanFirst !== '' && !isNaN(parseInt(cleanFirst, 10));
        offset = isFirstNumeric ? 0 : 1;
      }

      for (let i = 0; i < 8; i++) {
        const headerIdx = colIndices[i];
        if (headerIdx !== -1) {
          const targetIdx = headerIdx + offset;
          if (targetIdx >= 0 && targetIdx < parts.length) {
            const raw = parts[targetIdx];
            const clean = raw.replace(/[^\d-]/g, '');
            if (clean.length > 0) {
              const num = parseInt(clean, 10);
              details[i] = isNaN(num) ? 0 : num;
            } else {
              details[i] = 0;
            }
          }
        }
      }
      
      if (colIndices[7] !== -1) {
        tong = details[7] !== null ? details[7] : 0;
      } else {
        let foundNum = false;
        let lastNum = 0;
        for (let i = parts.length - 1; i >= 0; i--) {
          const raw = parts[i];
          const clean = raw.replace(/[^\d-]/g, '');
          const n = parseInt(clean, 10);
          if (!isNaN(n) && n > 0) { 
            lastNum = n; 
            foundNum = true;
            break; 
          }
        }
        tong = foundNum ? lastNum : 0;
        details[7] = tong;
      }
      break;
    }
  }
  return { tong: foundRow ? tong : null, details: foundRow ? details : Array(8).fill(null) };
};

interface CustomFilterPopoverProps {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  pillBgClass: string;
  searchIconColorClass: string;
  icon: React.ReactNode;
}

const CustomFilterPopover: React.FC<CustomFilterPopoverProps> = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  pillBgClass,
  searchIconColorClass,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = removeAccents(searchQuery).toLowerCase().trim();
    return options.filter(opt => removeAccents(opt).toLowerCase().includes(q));
  }, [options, searchQuery]);

  const isAllSelected = selected.length === 0 || selected.length === options.length;

  const getDisplayText = () => {
    if (isAllSelected || selected.length === 0) return label;
    if (selected.length === 1) {
      const first = selected[0].replace(/^NNH\s+/, '').split(/[-–—]/)[0].trim();
      return `${label}: ${first}`;
    }
    return `${label}: ${selected.length} đã chọn`;
  };

  const handleToggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      const next = selected.filter(item => item !== opt);
      onChange(next);
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-[17.5px] font-black cursor-pointer hover:opacity-90 transition-all select-none shadow-sm active:scale-95",
          pillBgClass
        )}
      >
        <span className="flex items-center gap-1.5">
          {icon} {getDisplayText()}
        </span>
        <Search size={13} className={cn("ml-1", searchIconColorClass)} />
      </button>

      {/* Popover Box (Identical to HÌNH 2) */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-[330px] sm:w-[350px] bg-white border-2 border-indigo-100 rounded-[28px] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Top Search Bar */}
          <div className="relative mb-3">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
              <Filter size={18} className="stroke-[2.5]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-2xl text-[15px] font-bold text-slate-800 placeholder-slate-400 outline-none shadow-sm transition-all"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between px-1 mb-2 pb-2 border-b border-slate-100 font-extrabold text-[15px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                <Upload size={12} className="stroke-[3]" />
              </span>
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
            >
              Bỏ chọn
            </button>
          </div>

          {/* Options List with iOS Switch Toggle */}
          <div className="max-h-[260px] overflow-y-auto space-y-1 divide-y divide-slate-100/70 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-slate-400 font-bold text-sm">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt);
                const cleanDisplay = opt.replace(/^NNH\s+/, '');
                return (
                  <div
                    key={opt}
                    onClick={() => handleToggleOption(opt)}
                    className="flex items-center justify-between py-2.5 px-2.5 rounded-xl hover:bg-indigo-50/50 cursor-pointer transition-colors select-none"
                  >
                    <span className="font-black text-[16px] text-slate-900 leading-tight pr-2">
                      {cleanDisplay}
                    </span>
                    {/* iOS Toggle Switch */}
                    <div className={cn(
                      "w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out flex-shrink-0",
                      isSelected ? "bg-indigo-600" : "bg-slate-200"
                    )}>
                      <div className={cn(
                        "bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out",
                        isSelected ? "translate-x-5" : "translate-x-0"
                      )} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EmployeeHealth: React.FC<{ pageMaintenanceState?: Record<string, boolean>, isUser43751Local?: boolean }> = ({ pageMaintenanceState = {}, isUser43751Local = false }) => {
  const { userProfile, authEmployeeName } = useAuth();
  const isUser43751 = isUser43751Local || 
                      String(userProfile?.username || '').trim() === '43751' || 
                      String(userProfile?.ma_nhan_vien || '').trim() === '43751' ||
                      String(userProfile?.user_id || '').trim() === '43751';
  const { categoryConfig } = useCategoryConfig();
  const { showNotification } = useNotification();
  const { marketFilter, setMarketFilter, setAvailableMarkets } = useMarket();
  const { activeHealthTab: activeTab, setActiveHealthTab: setActiveTab } = useStore();
  const [maKho, setMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');
  const [isCapturing, setIsCapturing] = useState(false);
  const [batchExportProgress, setBatchExportProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareStaffAId, setCompareStaffAId] = useState<string>('');
  const [compareStaffBId, setCompareStaffBId] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isTagCopied, setIsTagCopied] = useState(false);
  const pendingCopyStaffIdRef = useRef<{ staffId: string; nextStaffId: string } | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const capturePhucVuRef = useRef<HTMLDivElement>(null);
  const captureBanKemRef = useRef<HTMLDivElement>(null);
  const captureGiaTriDhRef = useRef<HTMLDivElement>(null);
  const captureCtktnvRef = useRef<HTMLDivElement>(null);
  const captureThuongNvRef = useRef<HTMLDivElement>(null);
  const captureElementHelper = async (element: HTMLElement) => {
    // 1. Measure natural compact width of the table columns or containers
    let sumColWidths = 0;
    const sourceTable = element.querySelector('table');
    if (sourceTable) {
      const colEls = sourceTable.querySelectorAll('colgroup col, col');
      if (colEls.length > 0) {
        colEls.forEach(col => {
          const wStr = (col as HTMLElement).style.width || '';
          const minWStr = (col as HTMLElement).style.minWidth || '';
          const w = parseInt(wStr || minWStr || '0', 10);
          sumColWidths += w > 0 ? w : 120;
        });
      } else {
        const thEls = sourceTable.querySelectorAll('thead tr:first-child th');
        thEls.forEach(th => {
          const wStr = (th as HTMLElement).style.width || '';
          const minWStr = (th as HTMLElement).style.minWidth || '';
          const w = parseInt(wStr || minWStr || '0', 10);
          sumColWidths += w > 0 ? w : (th as HTMLElement).offsetWidth || 120;
        });
      }
    }

    let maxScrollWidth = 0;
    if (sourceTable) {
      maxScrollWidth = sourceTable.scrollWidth || 0;
    }
    const allContainers = Array.from(element.querySelectorAll('.overflow-x-auto, table, [class*="overflow"]'));
    allContainers.forEach(el => {
      if (el.scrollWidth > maxScrollWidth) {
        maxScrollWidth = el.scrollWidth;
      }
    });
    if (element.scrollWidth > maxScrollWidth) {
      maxScrollWidth = element.scrollWidth;
    }

    // Auto-fit content width: Desktop base 980px, or expand to exact sum of column widths / scrollWidth
    const actualContentWidth = Math.max(980, sumColWidths, maxScrollWidth);
    const framePadding = 20;
    const totalExportWidth = actualContentWidth + framePadding * 2;
    
    // Create a temporary container to hold the clone
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${totalExportWidth}px`;
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.backgroundColor = '#ffffff';

    // Frame wrapper to ensure zero shadow, seamless border and generous white padding
    const frameWrapper = document.createElement('div');
    frameWrapper.style.width = `${totalExportWidth}px`;
    frameWrapper.style.minWidth = `${totalExportWidth}px`;
    frameWrapper.style.maxWidth = `${totalExportWidth}px`;
    frameWrapper.style.padding = `${framePadding}px`;
    frameWrapper.style.boxSizing = 'border-box';
    frameWrapper.style.backgroundColor = '#ffffff';
    frameWrapper.style.display = 'block';
    frameWrapper.style.boxShadow = 'none';
    frameWrapper.style.borderRadius = '0px';

    const clone = element.cloneNode(true) as HTMLElement;

    // Hide buttons/controls inside the clone
    const noCaptureElements = clone.querySelectorAll('.no-capture, button, textarea, .capture-btn, input, select');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // Triệt tiêu hoàn toàn bóng mờ (Zero-Shadow Export Rule)
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.filter = 'none';
      }
      if (htmlEl.classList) {
        Array.from(htmlEl.classList).forEach(cls => {
          if (cls.startsWith('shadow') || cls.startsWith('drop-shadow')) {
            htmlEl.classList.remove(cls);
          }
        });
      }
    });

    // Remove max-width constraint inside clone to fill clone width seamlessly
    const innerCards = clone.querySelectorAll('.max-w-\\[880px\\], .max-w-\\[800px\\], .max-w-\\[960px\\]');
    innerCards.forEach(c => {
      (c as HTMLElement).style.maxWidth = '100%';
      (c as HTMLElement).style.width = '100%';
    });

    // Set clone styling to take full layout unconstrained with UTM Avo Black font
    clone.style.width = `${actualContentWidth}px`;
    clone.style.minWidth = `${actualContentWidth}px`;
    clone.style.maxWidth = `${actualContentWidth}px`;
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.backgroundColor = '#ffffff';
    clone.style.display = 'block';
    clone.style.boxSizing = 'border-box';
    clone.style.borderRadius = '0px';
    clone.style.boxShadow = 'none';
    clone.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";

    // Make sure overflow wrappers in the clone are visible and fill full width
    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = '100%';
      htmlEl.style.minWidth = '100%';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
      el.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'overflow-auto');
    });

    // Force all tables to stretch 100% cleanly inside their parent card with fixed layout
    const tables = clone.querySelectorAll('table');
    tables.forEach(table => {
      const htmlTable = table as HTMLElement;
      htmlTable.style.width = '100%';
      htmlTable.style.minWidth = '100%';
      htmlTable.style.maxWidth = 'none';
      htmlTable.style.tableLayout = 'fixed';
      htmlTable.style.boxSizing = 'border-box';
    });

    // Remove sticky positioning (causes rendering issues in capture)
    const stickyEls = clone.querySelectorAll('.sticky, [style*="sticky"]');
    stickyEls.forEach(el => {
      (el as HTMLElement).style.position = 'relative';
      (el as HTMLElement).style.left = 'auto';
      (el as HTMLElement).style.zIndex = 'auto';
    });

    // Force hide all scrollbars in the captured image
    const hideScrollbarStyle = document.createElement('style');
    hideScrollbarStyle.innerHTML = `
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
    `;
    clone.appendChild(hideScrollbarStyle);

    frameWrapper.appendChild(clone);
    tempContainer.appendChild(frameWrapper);
    document.body.appendChild(tempContainer);

    try {
      // ★ Ensure UTM Avo font is fully loaded before export
      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 200));

      const finalCaptureWidth = totalExportWidth;
      const finalCaptureHeight = frameWrapper.offsetHeight || frameWrapper.scrollHeight;

      const dataUrl = await htmlToImage.toPng(frameWrapper, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: false,
        width: finalCaptureWidth,
        height: finalCaptureHeight,
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${finalCaptureWidth}px`,
          height: `${finalCaptureHeight}px`,
          ...EXPORT_FONT_STYLE,
        }
      });
      return dataUrl;
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const captureSingleEmployeeCard = async (element: HTMLElement): Promise<Blob | string> => {
    const __tag = element.id.replace('employee-detail-', '') || '?';
    const __t0 = performance.now();
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '1120px';
    tempContainer.style.height = 'auto';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.backgroundColor = '#ffffff';

    const frameWrapper = document.createElement('div');
    frameWrapper.style.width = '1120px';
    frameWrapper.style.minWidth = '1120px';
    frameWrapper.style.maxWidth = '1120px';
    frameWrapper.style.padding = '20px';
    frameWrapper.style.backgroundColor = '#ffffff';
    frameWrapper.style.boxSizing = 'border-box';
    frameWrapper.style.borderRadius = '24px';
    frameWrapper.style.boxShadow = 'none';
    frameWrapper.style.display = 'block';

    const clone = element.cloneNode(true) as HTMLElement;

    const noCaptureElements = clone.querySelectorAll('.no-capture, button, textarea, .capture-btn, input, select');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    clone.style.width = '100%';
    clone.style.minWidth = '100%';
    clone.style.maxWidth = '100%';
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.backgroundColor = 'transparent';
    clone.style.display = 'block';
    clone.style.boxSizing = 'border-box';
    clone.style.boxShadow = 'none';
    clone.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";

    const innerCards = clone.querySelectorAll('.max-w-\\[960px\\], [class*="max-w"]');
    innerCards.forEach(c => {
      const htmlC = c as HTMLElement;
      htmlC.style.maxWidth = '100%';
      htmlC.style.width = '100%';
      htmlC.style.boxShadow = 'none';
    });

    const statGrids = clone.querySelectorAll('[class*="grid-cols"]');
    statGrids.forEach(g => {
      const htmlG = g as HTMLElement;
      htmlG.style.display = 'grid';
      htmlG.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
      htmlG.style.width = '100%';
      htmlG.style.boxSizing = 'border-box';
    });

    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.filter = 'none';
      }
      if (htmlEl.classList) {
        htmlEl.classList.remove('truncate');
        Array.from(htmlEl.classList).forEach(cls => {
          if (cls.startsWith('shadow') || cls.startsWith('drop-shadow') || cls.startsWith('ring')) {
            htmlEl.classList.remove(cls);
          }
        });
      }
    });

    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = '100%';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
      htmlEl.style.boxSizing = 'border-box';
      el.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'overflow-auto');
    });

    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      const htmlTable = table as HTMLElement;
      htmlTable.style.width = '100%';
      htmlTable.style.minWidth = '100%';
      htmlTable.style.maxWidth = '100%';
      htmlTable.style.boxSizing = 'border-box';
      htmlTable.style.tableLayout = 'fixed';
      htmlTable.style.borderCollapse = 'collapse';

      const cols = htmlTable.querySelectorAll('colgroup col');
      if (cols.length >= 6) {
        (cols[0] as HTMLElement).style.width = '55px';
        (cols[1] as HTMLElement).style.width = '480px';
        (cols[2] as HTMLElement).style.width = '125px';
        (cols[3] as HTMLElement).style.width = '125px';
        (cols[4] as HTMLElement).style.width = '125px';
        (cols[5] as HTMLElement).style.width = '150px';
      }
    });

    const __tPrep = performance.now();
    frameWrapper.appendChild(clone);
    tempContainer.appendChild(frameWrapper);
    document.body.appendChild(tempContainer);

    try {
      // domToPng (modern-screenshot) renders via the browser's native SVG
      // foreignObject pipeline instead of html2canvas's manual JS repaint of
      // every CSS rule — several times faster for tables like this one, and
      // it's what batch export was already falling back to (so the output is
      // already proven correct for this exact DOM). Try it FIRST; html2canvas
      // becomes the last-resort fallback for the rare case both fast paths fail.
      try {
        const __t1 = performance.now();
        const dataUrl = await domToPng(frameWrapper, {
          backgroundColor: '#ffffff',
          scale: 2,
          features: { font: false, image: false },
          width: 1120,
          height: frameWrapper.scrollHeight,
        });
        console.log(`[Export ${__tag}] prep=${(__tPrep - __t0).toFixed(0)}ms domToPng=${(performance.now() - __t1).toFixed(0)}ms total=${(performance.now() - __t0).toFixed(0)}ms`);
        return dataUrl;
      } catch (domErr) {
        console.warn(`[Export ${__tag}] domToPng failed after ${(performance.now() - __tPrep).toFixed(0)}ms, fallback to htmlToImage:`, domErr);
      }

      try {
        const __t2 = performance.now();
        const dataUrl = await htmlToImage.toPng(frameWrapper, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          style: { ...EXPORT_FONT_STYLE },
        });
        console.log(`[Export ${__tag}] prep=${(__tPrep - __t0).toFixed(0)}ms htmlToImage=${(performance.now() - __t2).toFixed(0)}ms total=${(performance.now() - __t0).toFixed(0)}ms`);
        return dataUrl;
      } catch (htiErr) {
        console.warn(`[Export ${__tag}] htmlToImage failed, fallback to html2canvas:`, htiErr);
      }

      const __t3 = performance.now();
      const canvas = await html2canvas(frameWrapper, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 1120,
        windowWidth: 1120,
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      console.log(`[Export ${__tag}] prep=${(__tPrep - __t0).toFixed(0)}ms html2canvas=${(performance.now() - __t3).toFixed(0)}ms total=${(performance.now() - __t0).toFixed(0)}ms`);
      if (blob) return blob;
      throw new Error('All capture strategies failed to produce an image');
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const handleExportAllStaffDetails = async () => {
    const tables = Array.from(document.querySelectorAll('[id^="employee-detail-"]')) as HTMLElement[];
    if (tables.length === 0) {
      showNotification('Không tìm thấy danh sách nhân viên nào để xuất!', 'warning');
      return;
    }

    setIsCapturing(true);
    const startTime = Date.now();
    setBatchExportProgress({ current: 0, total: tables.length, percent: 0 });

    try {
      await ensureFontsReady();
      const zip = new JSZip();
      let completedCount = 0;

      // Concurrency pool sized to the device — domToPng's per-card work is mostly
      // async (image/font decode, canvas→PNG encode) so more in-flight cards keeps
      // the CPU busier than a fixed 6, without spawning so many that memory/GC
      // pressure from many live canvases slows things back down.
      const CONCURRENCY = Math.min(12, Math.max(6, (navigator.hardwareConcurrency || 6)));
      let currentIndex = 0;

      const worker = async () => {
        while (currentIndex < tables.length) {
          const idx = currentIndex++;
          const element = tables[idx];
          if (!element) continue;

          try {
            const rawName = element.id.replace('employee-detail-', '').trim();
            const cleanName = rawName.replace(/[/\\?%*:|"<>]/g, '_');
            const result = await captureSingleEmployeeCard(element);
            
            if (result instanceof Blob) {
              zip.file(`ChiTiet_${String(idx + 1).padStart(2, '0')}_${cleanName}.png`, result);
            } else if (typeof result === 'string') {
              const base64Data = result.split(',')[1];
              zip.file(`ChiTiet_${String(idx + 1).padStart(2, '0')}_${cleanName}.png`, base64Data, { base64: true });
            }
          } catch (err) {
            console.error(`Error capturing employee card ${idx}:`, err);
          } finally {
            completedCount++;
            const percent = Math.round((completedCount / tables.length) * 100);
            setBatchExportProgress({ current: completedCount, total: tables.length, percent });
          }
        }
      };

      const workers = Array.from({ length: Math.min(CONCURRENCY, tables.length) }, () => worker());
      await Promise.all(workers);

      // Fast STORE compression (images are already PNG compressed)
      const content = await zip.generateAsync({
        type: "blob",
        compression: "STORE"
      });

      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      saveAs(content, `ChiTiet_All_${tables.length}_NV.zip`);
      showNotification(`Đã xuất thành công ${completedCount}/${tables.length} nhân viên trong ${durationSeconds}s!`, 'success');
    } catch (err) {
      console.error('Batch export error:', err);
      showNotification('Có lỗi xảy ra khi xuất ảnh hàng loạt!', 'error');
    } finally {
      setIsCapturing(false);
      setBatchExportProgress(null);
    }
  };

  const handleCaptureThuongNv = async () => {
    if (!captureThuongNvRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureThuongNvRef.current);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing thuong nv board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureBanKem = async () => {
    if (!captureBanKemRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureBanKemRef.current);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing ban kem board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureGiaTriDh = async () => {
    if (!captureGiaTriDhRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureGiaTriDhRef.current);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing gia tri dh board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    const handleReceiveData = (text: string) => {
      if (text && typeof text === 'string' && text.trim().length > 10) {
        saveNganhhangChinhNv(text);
        setSyncNganhHangModal({
          isOpen: true,
          status: 'success',
          message: 'Đã nhận dữ liệu từ [⚡ AUTO COPY N.HÀNG CHÍNH] và dán vào Giá Trị ĐH thành công!'
        });
        setTimeout(() => {
          setSyncNganhHangModal(prev => ({ ...prev, isOpen: false }));
        }, 1400);
      }
    };

    const handleCustomEvent = (e: any) => {
      const text = e.detail?.data || e.detail?.text || e.detail;
      handleReceiveData(text);
    };

    const handleMessage = (e: MessageEvent) => {
      if (
        e.data?.type === 'CRM_RECEIVE_BI_NGANHHANG_DATA' ||
        e.data?.type === 'CRM_SYNC_NGANHHANG_RESPONSE' ||
        e.data?.action === 'AUTO_COPY_NGANHHANG_RESPONSE'
      ) {
        handleReceiveData(e.data.data || e.data.payload || e.data.text);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'crm_bi_nganhhang_copied_data' || e.key === 'crm_auto_copy_nganhhang_result') {
        if (e.newValue) handleReceiveData(e.newValue);
      }
    };

    document.addEventListener('CRM_RECEIVE_BI_NGANHHANG_DATA', handleCustomEvent);
    document.addEventListener('CRM_SYNC_NGANHHANG_RESPONSE', handleCustomEvent);
    document.addEventListener('CRM_RECEIVE_AUTO_COPY_DATA', handleCustomEvent);
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('crm_bi_sync_channel');
      bc.onmessage = (event) => {
        if (event.data?.action === 'CLEAR_GTDH_DATA') {
          saveNganhhangChinhNv('');
          return;
        }
        if (event.data?.text || event.data?.data) {
          handleReceiveData(event.data.text || event.data.data);
        }
      };
    } catch (err) {}

    return () => {
      document.removeEventListener('CRM_RECEIVE_BI_NGANHHANG_DATA', handleCustomEvent);
      document.removeEventListener('CRM_SYNC_NGANHHANG_RESPONSE', handleCustomEvent);
      document.removeEventListener('CRM_RECEIVE_AUTO_COPY_DATA', handleCustomEvent);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, []);

  const handleAutoPasteNganhHangChinh = async () => {
    // 1. Kiểm tra nhanh Clipboard trước: Nếu người dùng vừa bấm nút cam trên BI xong
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && clipText.trim().length > 20 && (clipText.includes('DTLK') || clipText.includes('DTQĐ') || clipText.includes('Nhân viên'))) {
        saveNganhhangChinhNv(clipText);
        setSyncNganhHangModal({
          isOpen: true,
          status: 'success',
          message: 'Đã nhận dữ liệu từ [⚡ AUTO COPY N.HÀNG CHÍNH] và dán vào Giá Trị ĐH thành công!'
        });
        setTimeout(() => {
          setSyncNganhHangModal(prev => ({ ...prev, isOpen: false }));
        }, 1400);
        return;
      }
    } catch (e) {}

    // 2. Show Center Modal in Loading State
    setSyncNganhHangModal({
      isOpen: true,
      status: 'loading',
      message: 'Đang gửi lệnh tới tab BI: Đang tự động xổ 5 cấp và copy dữ liệu...'
    });

    const requestTime = Date.now();

    // 3. Dispatch cross-tab events & channels for Tampermonkey / extensions / BI tabs
    try {
      document.dispatchEvent(new CustomEvent('CRM_REQUEST_BI_NGANHHANG_SYNC', { detail: { timestamp: requestTime } }));
      document.dispatchEvent(new CustomEvent('CRM_TRIGGER_AUTO_COPY_NGANHHANG', { detail: { timestamp: requestTime } }));
      document.dispatchEvent(new CustomEvent('CRM_AUTO_COPY_NHANG_CHINH', { detail: { timestamp: requestTime } }));
      window.postMessage({ type: 'CRM_REQUEST_BI_NGANHHANG_SYNC', target: 'AUTO_COPY_NHANG', timestamp: requestTime }, '*');
      window.postMessage({ type: 'CRM_TRIGGER_AUTO_COPY_NGANHHANG', target: 'AUTO_COPY_NHANG', timestamp: requestTime }, '*');
      window.postMessage({ type: 'CRM_AUTO_COPY_NHANG_CHINH', target: 'AUTO_COPY_NHANG', timestamp: requestTime }, '*');
      localStorage.setItem('crm_trigger_auto_copy_nganhhang', requestTime.toString());
      localStorage.setItem('crm_bi_request_sync', JSON.stringify({ type: 'nganhhang', action: 'AUTO_COPY_NGANHHANG', time: requestTime }));
      
      const bc = new BroadcastChannel('crm_bi_sync_channel');
      bc.postMessage({ action: 'AUTO_COPY_NGANHHANG_CHINH', timestamp: requestTime });
      bc.postMessage({ type: 'CRM_REQUEST_BI_NGANHHANG_SYNC', timestamp: requestTime });
    } catch (e) {
      console.log('Cross-tab broadcast:', e);
    }

    // 4. Polling for clipboard after BI finishes 5-level expand (BI expand takes ~3.5-4s)
    let foundData = false;
    const delays = [3000, 1200, 1200, 1500, 1500];
    
    for (const delay of delays) {
      await new Promise(r => setTimeout(r, delay));
      const currentSaved = localStorage.getItem('nganhhangchinh_nv_data') || '';
      if (currentSaved && currentSaved.trim().length > 20) {
        foundData = true;
        break;
      }
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 20 && (text.includes('DTLK') || text.includes('DTQĐ') || text.includes('Nhân viên'))) {
          saveNganhhangChinhNv(text);
          foundData = true;
          setSyncNganhHangModal({
            isOpen: true,
            status: 'success',
            message: 'Đã nhận dữ liệu từ [⚡ AUTO COPY N.HÀNG CHÍNH] và dán vào Giá Trị ĐH thành công!'
          });
          setTimeout(() => {
            setSyncNganhHangModal(prev => ({ ...prev, isOpen: false }));
          }, 1400);
          break;
        }
      } catch (err) {}
    }

    // 5. Fallback if after 8s no response received
    if (!foundData) {
      setSyncNganhHangModal(prev => {
        if (prev.isOpen && prev.status === 'loading') {
          return {
            isOpen: true,
            status: 'warning',
            message: 'Chưa nhận được phản hồi tự động từ tab BI! Bạn có thể bấm nút màu cam [⚡ AUTO COPY N.HÀNG CHÍNH] trên tab BI, sau đó bấm Thử lại.'
          };
        }
        return prev;
      });
    }
  };

  const handleCaptureCtktnv = async () => {
    if (!captureCtktnvRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureCtktnvRef.current);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing CTKTNV board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Sync maKho when userProfile changes
  useEffect(() => {
    if (userProfile?.ma_kho && userProfile.ma_kho !== maKho) {
      setMaKho(userProfile.ma_kho);
      localStorage.setItem('rtst_ma_kho', userProfile.ma_kho);
    }
  }, [userProfile?.ma_kho]);

  const {
    biRevenueData: dbBiRevenueData,
    luyKeNganhHang,
    thiDuaNv: dbThiDuaNv,
    phucVu,
    banKemNv,
    tragopNv,
    dtqd3t1, setDtqd3t1,
    dtqd3t2, setDtqd3t2,
    dtqd3t3, setDtqd3t3,
    thunhap3t1, setThunhap3t1,
    thunhap3t2, setThunhap3t2,
    thunhap3t3, setThunhap3t3,
    nganhhang3t1, setNganhhang3t1,
    nganhhang3t2, setNganhhang3t2,
    nganhhang3t3, setNganhhang3t3,
    giocong3t1, setGiocong3t1,
    giocong3t2, setGiocong3t2,
    giocong3t3, setGiocong3t3,
    thidua3t1, setThidua3t1,
    thidua3t2, setThidua3t2,
    thidua3t3, setThidua3t3,
    tracham3t1, setTracham3t1,
    tracham3t2, setTracham3t2,
    tracham3t3, setTracham3t3,
    rankMonth1, setRankMonth1,
    rankMonth2, setRankMonth2,
    rankMonth3, setRankMonth3,
    setBanKemNv,
    setTragopNv,
    nganhhangChinhNv,
    setNganhhangChinhNv,
    isLoading: isHealthLoading,
    isSaving,
    refresh,
    savePhucVu,
    saveBanKemNv,
    saveNganhhangChinhNv,
    saveTragopNv,
    tenSieuThi
  } = useEmployeeHealth(maKho, marketFilter !== 'ALL' ? marketFilter : undefined);
  const { 
    stTargetSauHeSo, setStTargetSauHeSo,
    stTargetQuyDoi, setStTargetQuyDoi,
    stPercentTarget, setStPercentTarget,
    daysPassed,
    totalDays,
    stName, setStName,
    stDtlk, setStDtlk,
    stDtqd, setStDtqd,
    stDtDuKienQD, setStDtDuKienQD,
    stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD,
    allStoreTargets
  } = useRTSTSharedData(maKho);
  const { tragopMatran, categoryTargets, processedData, staffInput, staffCategoryInput, loadData: loadLuykeData, isLoading: isLuykeLoading, storeData } = useLuykeData(maKho);

  const isDataLoading = isHealthLoading || isLuykeLoading;

  const [showIncome1, setShowIncome1] = useState(false);
  const [showIncome2, setShowIncome2] = useState(false);
  const [showIncome3, setShowIncome3] = useState(false);
  const [showBanKemInput, setShowBanKemInput] = useState(false);
  const [showNganhhangChinhInput, setShowNganhhangChinhInput] = useState(false);
  const [syncNganhHangModal, setSyncNganhHangModal] = useState<{
    isOpen: boolean;
    status: 'loading' | 'success' | 'warning';
    message?: string;
  }>({ isOpen: false, status: 'loading' });

  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'info' } | null>(null);



  // Filter processed markets
  const allowedMarkets = useMemo(() => {
    if (!processedData.markets) return [];
    const allowedPrefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR"];
    return processedData.markets.filter((m: any) =>
      allowedPrefixes.some((prefix: string) => m.name.toUpperCase().startsWith(prefix))
    );
  }, [processedData.markets]);

  const currentMarket = useMemo(() => {
    return allowedMarkets.find((m: any) => removeAccents(m.name) === removeAccents(marketFilter));
  }, [allowedMarkets, marketFilter]);
  const marketPercentQD = currentMarket?.actualReal 
    ? (((currentMarket.actualVirtual || 0) - currentMarket.actualReal) / currentMarket.actualReal) * 100 
    : 0;

  // Sync stName and target fields when marketFilter or data changes (consistent with Lũy Kế page)
  useEffect(() => {
    if (marketFilter === 'ALL') return;
    const market = allowedMarkets.find((m: any) => removeAccents(m.name) === removeAccents(marketFilter));
    if (!market) return;

    if (stName !== market.name) setStName(market.name);
    if (stDtlk !== (market.actualReal || 0)) setStDtlk(market.actualReal || 0);
    if (stDtqd !== (market.actualVirtual || 0)) setStDtqd(market.actualVirtual || 0);

    const dtDuKienQD = market.targetQD || 0;
    const percentHT = market.percentHT || 0;
    if (stDtDuKienQD !== dtDuKienQD) setStDtDuKienQD(dtDuKienQD);
    if (stPercentHTTargetDuKienQD !== percentHT) setStPercentHTTargetDuKienQD(percentHT);

    const targetDataKey = Object.keys(allStoreTargets || {}).find((k: string) => removeAccents(k) === removeAccents(market.name));
    const targetData = targetDataKey ? allStoreTargets[targetDataKey] : null;
    if (targetData) {
      if (targetData.stPercentTarget !== undefined && stPercentTarget !== targetData.stPercentTarget) {
        setStPercentTarget(targetData.stPercentTarget);
      }
    }
  }, [marketFilter, allowedMarkets, allStoreTargets, setStName, setStDtlk, setStDtqd, setStDtDuKienQD, setStPercentHTTargetDuKienQD, setStPercentTarget]);

  // NOTE: Luyke data auto-loads when currentStoreId changes (centralized in useLuykeData)

  // Removed visibilitychange reload for performance — data is already real-time and auto-reacts to store changes

  // Use KHAI BÁO inputs (DOANH THU + THI ĐUA NV) when available, otherwise use DB data
  const biRevenueData = React.useMemo(() => {
    if (staffInput) {
      return parseStaffRankData(staffInput);
    }
    return dbBiRevenueData;
  }, [staffInput, dbBiRevenueData]);

  const thiDuaNv = staffCategoryInput || dbThiDuaNv;

  // Sync available markets to global context if on this page
  useEffect(() => {
    if (processedData.markets.length > 0) {
      const allowedPrefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR"];
      const filtered = processedData.markets.filter((m: any) =>
        allowedPrefixes.some((prefix: string) => m.name.toUpperCase().startsWith(prefix))
      );
      if (filtered.length > 0) {
        setAvailableMarkets(filtered);
      }
    }
  }, [processedData.markets, setAvailableMarkets]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [khaiThacCategoryFilter, setKhaiThacCategoryFilter] = useState<string>('ALL');
  const [showMonthlyDtqd, setShowMonthlyDtqd] = useState(true);
  const [showDtqdGroup, setShowDtqdGroup] = useState(true);
  const [showNganhHangGroup, setShowNganhHangGroup] = useState(true);
  const [showEffGroup, setShowEffGroup] = useState(true);
  const [showThuNhapGroup, setShowThuNhapGroup] = useState(false);
  const [showTraChamGroup, setShowTraChamGroup] = useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [autoExpand, setAutoExpand] = useState(false);
  const [isProjectedMonth1, setIsProjectedMonth1] = useState(false);
  const [isProjectedMonth2, setIsProjectedMonth2] = useState(false);
  const [isProjectedMonth3, setIsProjectedMonth3] = useState(false);

  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    title: string;
    template: 1 | 2 | 3;
    text: string;
    tabs: { id: 1 | 2 | 3; label: string; icon: string }[];
    generator: (tab: 1 | 2 | 3) => string;
  }>({
    isOpen: false,
    title: '',
    template: 1,
    text: '',
    tabs: [],
    generator: () => '',
  });
  const [copiedComment, setCopiedComment] = useState(false);

  const captureTraChamRef = useRef<HTMLDivElement>(null);
  const captureKhaiThacRef = useRef<HTMLDivElement>(null);
  const captureRank3TRef = useRef<HTMLDivElement>(null);

  const handleCaptureTraCham = async () => {
    if (!captureTraChamRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureTraChamRef.current);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing tra cham board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureKhaiThac = async () => {
    if (!captureKhaiThacRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureKhaiThacRef.current);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing khai thac board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureRank3T = async () => {
    if (!captureRank3TRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureRank3TRef.current);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing rank 3t board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const [prevRank3TState, setPrevRank3TState] = useState<{
    rankMonth1: string;
    rankMonth2: string;
    rankMonth3: string;
    dtqd3t1: string;
    dtqd3t2: string;
    dtqd3t3: string;
    thunhap3t1: string;
    thunhap3t2: string;
    thunhap3t3: string;
    nganhhang3t1: string;
    nganhhang3t2: string;
    nganhhang3t3: string;
    thidua3t1: string;
    thidua3t2: string;
    thidua3t3: string;
    giocong3t1: string;
    giocong3t2: string;
    giocong3t3: string;
  } | null>(null);

  const saveRank3TSnapshot = () => {
    setPrevRank3TState({
      rankMonth1,
      rankMonth2,
      rankMonth3,
      dtqd3t1,
      dtqd3t2,
      dtqd3t3,
      thunhap3t1,
      thunhap3t2,
      thunhap3t3,
      nganhhang3t1,
      nganhhang3t2,
      nganhhang3t3,
      thidua3t1,
      thidua3t2,
      thidua3t3,
      tracham3t1,
      tracham3t2,
      tracham3t3,
      giocong3t1,
      giocong3t2,
      giocong3t3
    });
  };

  const handleRestoreRank3T = () => {
    if (!prevRank3TState) return;
    setRankMonth1(prevRank3TState.rankMonth1);
    setRankMonth2(prevRank3TState.rankMonth2);
    setRankMonth3(prevRank3TState.rankMonth3);

    setDtqd3t1(prevRank3TState.dtqd3t1);
    setDtqd3t2(prevRank3TState.dtqd3t2);
    setDtqd3t3(prevRank3TState.dtqd3t3);

    setThunhap3t1(prevRank3TState.thunhap3t1);
    setThunhap3t2(prevRank3TState.thunhap3t2);
    setThunhap3t3(prevRank3TState.thunhap3t3);

    setNganhhang3t1(prevRank3TState.nganhhang3t1);
    setNganhhang3t2(prevRank3TState.nganhhang3t2);
    setNganhhang3t3(prevRank3TState.nganhhang3t3);

    setThidua3t1(prevRank3TState.thidua3t1);
    setThidua3t2(prevRank3TState.thidua3t2);
    setThidua3t3(prevRank3TState.thidua3t3);

    if (prevRank3TState.tracham3t1 !== undefined) setTracham3t1(prevRank3TState.tracham3t1);
    if (prevRank3TState.tracham3t2 !== undefined) setTracham3t2(prevRank3TState.tracham3t2);
    if (prevRank3TState.tracham3t3 !== undefined) setTracham3t3(prevRank3TState.tracham3t3);

    setGiocong3t1(prevRank3TState.giocong3t1);
    setGiocong3t2(prevRank3TState.giocong3t2);
    setGiocong3t3(prevRank3TState.giocong3t3);

    setPrevRank3TState(null);
    showNotification('Đã khôi phục lại dữ liệu 3 tháng trước khi dịch chuyển!', 'success');
  };

  const handleShift2to1 = () => {
    saveRank3TSnapshot();
    setRankMonth1(rankMonth2);
    setDtqd3t1(dtqd3t2);
    setThunhap3t1(thunhap3t2);
    setNganhhang3t1(nganhhang3t2);
    setThidua3t1(thidua3t2);
    setTracham3t1(tracham3t2);
    setGiocong3t1(giocong3t2);

    setDtqd3t2('');
    setThunhap3t2('');
    setNganhhang3t2('');
    setThidua3t2('');
    setTracham3t2('');
    setGiocong3t2('');

    showNotification('Đã dịch toàn bộ dữ liệu Cột 2 sang Cột 1! Bấm KHÔI PHỤC DỮ LIỆU nếu muốn hoàn tác.', 'info');
  };

  const handleShift3to2 = () => {
    saveRank3TSnapshot();
    setRankMonth2(rankMonth3);
    setDtqd3t2(dtqd3t3);
    setThunhap3t2(thunhap3t3);
    setNganhhang3t2(nganhhang3t3);
    setThidua3t2(thidua3t3);
    setTracham3t2(tracham3t3);
    setGiocong3t2(giocong3t3);

    setDtqd3t3('');
    setThunhap3t3('');
    setNganhhang3t3('');
    setThidua3t3('');
    setTracham3t3('');
    setGiocong3t3('');

    showNotification('Đã dịch toàn bộ dữ liệu Cột 3 sang Cột 2! Bấm KHÔI PHỤC DỮ LIỆU nếu muốn hoàn tác.', 'info');
  };

  const handleShiftAllLeft = () => {
    saveRank3TSnapshot();
    setRankMonth1(rankMonth2);
    setDtqd3t1(dtqd3t2);
    setThunhap3t1(thunhap3t2);
    setNganhhang3t1(nganhhang3t2);
    setThidua3t1(thidua3t2);
    setTracham3t1(tracham3t2);
    setGiocong3t1(giocong3t2);

    setRankMonth2(rankMonth3);
    setDtqd3t2(dtqd3t3);
    setThunhap3t2(thunhap3t3);
    setNganhhang3t2(nganhhang3t3);
    setThidua3t2(thidua3t3);
    setTracham3t2(tracham3t3);
    setGiocong3t2(giocong3t3);

    const m3Num = parseInt(rankMonth3.replace(/\D/g, '')) || 6;
    const nextM3Num = m3Num >= 12 ? 1 : m3Num + 1;
    setRankMonth3(`Tháng ${nextM3Num}`);

    setDtqd3t3('');
    setThunhap3t3('');
    setNganhhang3t3('');
    setThidua3t3('');
    setTracham3t3('');
    setGiocong3t3('');

    showNotification('Đã dịch chuyển Cột 2 ➔ 1 và Cột 3 ➔ 2! Bấm KHÔI PHỤC DỮ LIỆU nếu muốn hoàn tác.', 'info');
  };

  const parseKhaiThacData = useCallback((text: string) => {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.replace(/[\r\n]/g, '')).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const cleanNumber = (val: string): number => {
      if (!val) return 0;
      let s = val.trim().replace(/[^\d,.-]/g, ''); // Keep only digits, dots, commas, minus
      if (!s) return 0;

      const hasComma = s.includes(',');
      const hasDot = s.includes('.');

      if (hasComma && hasDot) {
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        if (lastComma > lastDot) {
          // Comma is decimal separator (e.g. 1.500.000,50)
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          // Dot is decimal separator (e.g. 1,500,000.50)
          s = s.replace(/,/g, '');
        }
      } else if (hasComma) {
        // Only comma(s)
        const parts = s.split(',');
        if (parts.length > 2) {
          // Multiple commas (e.g. 1,500,000) -> thousand separators
          s = s.replace(/,/g, '');
        } else {
          // Single comma (e.g. 1,500 or 15,5)
          if (parts[1].length === 3) {
            // E.g. 1,500 -> 1500
            s = s.replace(/,/g, '');
          } else {
            // E.g. 15,5 -> 15.5
            s = s.replace(',', '.');
          }
        }
      } else if (hasDot) {
        // Only dot(s)
        const parts = s.split('.');
        if (parts.length > 2) {
          // Multiple dots (e.g. 1.500.000) -> thousand separators
          s = s.replace(/\./g, '');
        } else {
          // Single dot (e.g. 1.500 or 15.5)
          if (parts[1].length === 3) {
            // E.g. 1.500 -> 1500
            s = s.replace(/\./g, '');
          }
        }
      }

      const num = parseFloat(s);
      return isNaN(num) ? 0 : num;
    };

    const splitLineRobust = (line: string): string[] => {
      let parts = line.split('\t');
      if (parts.length === 1) {
        parts = line.split(/ {2,}/);
      }
      return parts.map(p => p.trim());
    };

    const parsedRows: any[] = [];

    // 1. Detect headers if present in the first few lines
    let dtlkColIdx = -1;
    let dtqdColIdx = -1;
    let soLuongColIdx = -1;
    let donGiaColIdx = -1;
    let hasColumnBasedHeader = false;
    let solarColIdx = -1;
    let staffColIdx = -1;
    let detectedNhomHang = 'Đèn năng lượng mặt trời';

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const parts = splitLineRobust(lines[i]);
      const lowerParts = parts.map(p => removeAccents(p.toLowerCase()).trim());
      
      const hasDtlk = lowerParts.some(p => p === 'dtlk' || p.includes('luy ke') || p.includes('doanh thu thuc'));
      const hasDtqd = lowerParts.some(p => p === 'dtqd' || p.includes('quy doi') || p.includes('doanh thu quy doi'));
      
      if (hasDtlk || hasDtqd) {
        dtlkColIdx = lowerParts.findIndex(p => p === 'dtlk' || p.includes('luy ke') || p.includes('doanh thu thuc'));
        dtqdColIdx = lowerParts.findIndex(p => p === 'dtqd' || p.includes('quy doi') || p.includes('doanh thu quy doi'));
        soLuongColIdx = lowerParts.findIndex(p => p === 'so luong' || p === 'sl');
        donGiaColIdx = lowerParts.findIndex(p => p === 'don gia' || p === 'dg');
      }

      // Also check if this is a standard Column-Based report where product name is in the column header
      const solarIdx = lowerParts.findIndex(p => 
        p.includes('den nang luong mat troi') || 
        (p.includes('nang luong') && p.includes('mat troi')) || 
        p.includes('den nang luong') || 
        p.includes('nang luong mat troi') ||
        p.includes('den nang luong mt') ||
        p.includes('dnlmt')
      );
      if (solarIdx !== -1) {
        // Confirm it has numbers below
        let hasNumbers = false;
        for (let j = i + 1; j < lines.length; j++) {
          const rowParts = splitLineRobust(lines[j]);
          if (rowParts.length > solarIdx) {
            const val = cleanNumber(rowParts[solarIdx]);
            if (val > 0) {
              hasNumbers = true;
              break;
            }
          }
        }
        if (hasNumbers) {
          hasColumnBasedHeader = true;
          solarColIdx = solarIdx;
          const staffIdx = lowerParts.findIndex(p => 
            p.includes('nhan vien') || p.includes('ho ten') || p === 'nv' || p === 'username'
          );
          staffColIdx = staffIdx !== -1 ? staffIdx : 0;
          break;
        }
      }
    }

    // 2. Parse the lines
    if (hasColumnBasedHeader && solarColIdx !== -1) {
      lines.forEach((line) => {
        const parts = splitLineRobust(line);
        if (parts.length <= Math.max(solarColIdx, staffColIdx)) return;

        const firstColClean = removeAccents(parts[0]).toLowerCase().replace(/[\s_*()-]+/g, '');
        if (firstColClean.includes('nganhhang') || firstColClean.includes('nhomhang') || firstColClean.includes('sanpham') || firstColClean.includes('tennhanvien') || firstColClean.includes('nhanvien')) {
          return;
        }

        const staffNameRaw = parts[staffColIdx].trim();
        const solarValueRaw = parts[solarColIdx].trim();
        let revenue = cleanNumber(solarValueRaw);
        
        // Scale to absolute VND if needed
        if (revenue > 0 && revenue < 1000000) {
          revenue = revenue * 1000000;
        }

        if (staffNameRaw && revenue > 0) {
          parsedRows.push({
            nhanVien: staffNameRaw,
            nhomHang: 'Đèn năng lượng mặt trời',
            dtlk: revenue,
            soLuong: 0,
            donGia: 0
          });
        }
      });
    } else {
      let activeStaffName = '';

      lines.forEach(line => {
        const parts = splitLineRobust(line);
        if (parts.length === 0) return;

        const firstCell = parts[0].trim();
        if (!firstCell) return;

        // Check if this line is an employee row
        const matchingStaff = biRevenueData.find(staff => {
          const staffId = staff.fullId.toLowerCase().trim();
          const staffName = (staff.displayName.split('-').pop() || '').trim();
          const staffNameClean = removeAccents(staffName);
          const cellClean = removeAccents(firstCell);
          return cellClean.includes(staffId) || 
                 cellClean === staffNameClean ||
                 cellClean.includes(staffNameClean) ||
                 staffNameClean.includes(cellClean);
        });

        if (matchingStaff) {
          const nameParts = matchingStaff.displayName.split('-');
          activeStaffName = nameParts.length > 1 
            ? (isNaN(Number(nameParts[0].trim())) ? nameParts[0].trim() : nameParts[1].trim())
            : matchingStaff.displayName;
          return; // Skip parsing numbers on the employee header line itself
        }

        // Check if this line is a category row matching solar lights
        const cleanFirstCell = removeAccents(firstCell.toLowerCase());
        const isSolar = cleanFirstCell.includes('den nang luong mat troi') || 
                        (cleanFirstCell.includes('nang luong') && cleanFirstCell.includes('mat troi')) || 
                        cleanFirstCell.includes('den nang luong') || 
                        cleanFirstCell.includes('dnlmt');
        
        // Fallbacks
        const isGiaDung = !isSolar && (cleanFirstCell.includes('dien gia dung') || cleanFirstCell.includes('gia dung'));
        const isPhuKien = !isSolar && !isGiaDung && (cleanFirstCell.includes('phu kien') || cleanFirstCell === 'pk');

        if (isSolar || isGiaDung || isPhuKien) {
          const currentCategory = isSolar ? 'Đèn năng lượng mặt trời' : (isGiaDung ? 'Điện gia dụng' : 'Phụ kiện');
          
          // Identify numeric cells in this row
          const numericParts = parts.map((p, idx) => {
            const clean = p.trim();
            const val = cleanNumber(clean);
            // Check if it looks like a number and is not the toggle or category cell
            const hasLetters = /[a-zA-ZÀ-ỹ]/.test(removeAccents(clean).replace(/[đd%]/g, ''));
            const isNumeric = clean.length > 0 && !hasLetters && !isNaN(parseFloat(clean.replace(/[^\d.-]/g, '')));
            return { val, isNumeric, index: idx };
          }).filter(item => item.isNumeric);

          let dtlk = 0;
          if (dtlkColIdx !== -1 && parts.length > dtlkColIdx) {
            dtlk = cleanNumber(parts[dtlkColIdx]);
          } else {
            dtlk = numericParts[0]?.val || 0;
          }

          if (dtlk > 0 && dtlk < 1000000) {
            dtlk = dtlk * 1000000;
          }

          let soLuong = 0;
          if (soLuongColIdx !== -1 && parts.length > soLuongColIdx) {
            soLuong = cleanNumber(parts[soLuongColIdx]);
          } else if (numericParts.length >= 4) {
            soLuong = numericParts[3].val;
          } else if (parts.length > 4) {
            soLuong = cleanNumber(parts[4]); // Standard sl index
          }

          let donGia = 0;
          if (donGiaColIdx !== -1 && parts.length > donGiaColIdx) {
            donGia = cleanNumber(parts[donGiaColIdx]);
          } else if (numericParts.length >= 5) {
            donGia = numericParts[4].val;
          } else {
            donGia = soLuong > 0 ? dtlk / soLuong : 0;
          }

          if (donGia > 0 && donGia < 1000000) {
            donGia = donGia * 1000000;
          }

          if (dtlk > 0 && activeStaffName) {
            parsedRows.push({
              nhanVien: activeStaffName,
              nhomHang: currentCategory,
              dtlk: dtlk,
              soLuong: soLuong,
              donGia: donGia
            });
          }
        }
      });
    }

    return parsedRows;
  }, [biRevenueData]);

  const parseTraChamData = useCallback((text: string) => {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.replace(/[\r\n]/g, '')).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const parsedRows: any[] = [];

    const cleanNumber = (val: string): number => {
      if (!val) return 0;
      let s = val.trim();
      const hasComma = s.includes(',');
      const hasDot = s.includes('.');
      
      if (hasComma && hasDot) {
        if (s.indexOf(',') < s.indexOf('.')) {
          s = s.replace(/,/g, '');
        } else {
          s = s.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        s = s.replace(/,/g, '.');
      }
      
      const clean = s.replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    // Keywords to ignore when checking if a line is a header
    const ignoredKeywords = [
      'nhanvien', 'homecredit', 'fecredit', 'shinhan', 'dmsieuthi', 'tytrong',
      'logobi', 'trangchu', 'baocao', 'khoikinhdoanh', 'hdsudung', 'avatar',
      'vungtay', 'dashboard', 'hotrobi', 'chientranh', 'lichsu', 'quanly',
      'danhsach', 'saovang', 'chupanh', 'xuatpdf', 'xuatexcel', 'hotline',
      'tiendo', 'rank', 'tongcong', 'tong', 'phankhuc', 'nganhhang', 'thang', 'nam'
    ];

    const isDetailed = text.toLowerCase().includes('homecredit') || 
                       text.toLowerCase().includes('fecredit') || 
                       text.toLowerCase().includes('shinhan');

    lines.forEach(line => {
      const parts = splitLine(line);
      if (parts.length < 2) return;

      const firstColClean = removeAccents(parts[0]).toLowerCase().replace(/[\s_*()-]+/g, '');
      if (!firstColClean || ignoredKeywords.some(k => firstColClean.includes(k) || k.includes(firstColClean))) {
        return; // skip headers
      }

      // Skip lines that don't start with a name or id
      const nameStartCheck = /^[a-zA-Z\dÀ-ỹ]/.test(parts[0]);
      if (!nameStartCheck) return;

      const staffVal = parts[0];

      // Remove trailing empty elements from parts
      while (parts.length > 0 && parts[parts.length - 1] === '') {
        parts.pop();
      }

      if (isDetailed) {
        if (parts.length >= 3) {
          const totalRevRaw = cleanNumber(parts[parts.length - 2]);
          const percentRaw = cleanNumber(parts[parts.length - 1]);
          
          let totalRevenue = totalRevRaw;
          // Scale to absolute VND if it's in millions (e.g. 107.33 -> 107,330,000)
          if (Math.abs(totalRevenue) > 0 && Math.abs(totalRevenue) < 1000000) {
            totalRevenue = totalRevenue * 1000000;
          }

          let percent = percentRaw;
          const lastPart = parts[parts.length - 1];
          if (percent > 0 && percent <= 1 && lastPart && !lastPart.includes('%')) {
            percent = percent * 100;
          }

          const installmentRevenue = totalRevenue * (percent / 100);

          parsedRows.push({
            nhanVien: staffVal,
            totalRevenue,
            installmentRevenue,
            billCount: 0,
            percent
          });
        }
      } else {
        // Format A: Standard report (usually 4-5 columns)
        if (parts.length >= 3) {
          const totalRevRaw = cleanNumber(parts[1]);
          const installRevRaw = cleanNumber(parts[2]);
          const billCount = parts.length > 3 ? cleanNumber(parts[3]) : 0;
          
          let percent = parts.length > 4 ? cleanNumber(parts[4]) : 0;
          if (percent > 0 && percent <= 1 && parts[4] && !parts[4].includes('%')) {
            percent = percent * 100;
          }

          let totalRevenue = totalRevRaw;
          if (Math.abs(totalRevenue) > 0 && Math.abs(totalRevenue) < 1000000) {
            totalRevenue = totalRevenue * 1000000;
          }

          let installmentRevenue = installRevRaw;
          if (Math.abs(installmentRevenue) > 0 && Math.abs(installmentRevenue) < 1000000) {
            installmentRevenue = installmentRevenue * 1000000;
          }

          if (percent === 0 && totalRevenue > 0) {
            percent = (installmentRevenue / totalRevenue) * 100;
          }

          parsedRows.push({
            nhanVien: staffVal,
            totalRevenue,
            installmentRevenue,
            billCount,
            percent
          });
        }
      }
    });

    return parsedRows;
  }, []);

  const parseBanKemData = useCallback((text: string) => {
    if (!text) return [];
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.split('\t'))
      .filter(parts => {
        if (parts.length < 6) return false;
        return /-\s*\d+/.test(parts[0]) || /\d+\s*-/.test(parts[0]);
      })
      .map(parts => ({
        nhanVien: parts[0],
        dtlk: parts[1],
        luotBill: parts[4],
        phanTramBill: parts[5],
        luotBillBanHang: parts[9] || '0',
      }));
  }, []);

  const parseNganhhangChinhNvData = useCallback((text: string) => {
    if (!text) return { headers: [], rows: [] };
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const allParsed = lines.map(line => line.split('\t').map(c => c.trim()));
    return { headers: allParsed[0], rows: allParsed.slice(1) };
  }, []);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<string | null>(null);
  const [thuongData, setThuongData] = useState<Record<string, { truoc: string; hientai: string }>>({});
  const thuongSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save entire thuong data object as JSON into a single column
  const saveThuongToDb = (data: Record<string, { truoc: string; hientai: string }>) => {
    const storeName = marketFilter !== 'ALL' ? marketFilter : '';
    if (!storeName || !maKho) return;
    const shortMaKho = maKho.replace(/^0+/, '');
    
    if (thuongSaveTimerRef.current) clearTimeout(thuongSaveTimerRef.current);
    
    thuongSaveTimerRef.current = setTimeout(() => {
      supabase.from('store').upsert({
        id: normalizeStoreId(storeName), // Normalized UPPERCASE ID to prevent duplicates
        warehouse_code: shortMaKho,
        ten_sieu_thi: storeName,
        thuong_nv_data: JSON.stringify(data)
      }, { onConflict: 'id' }).then(({ error }: any) => {
        if (error) console.error('[THUONG] Save error:', error);
        else console.log('[THUONG] Saved thuong_nv_data for', storeName);
      });
    }, 1500);
  };

  const saveStaffIdsToDb = (ids: string[]) => {
    const storeName = marketFilter !== 'ALL' ? marketFilter : '';
    if (!storeName || !maKho) return;
    const shortMaKho = maKho.replace(/^0+/, '');
    
    supabase.from('store').upsert({
      id: normalizeStoreId(storeName),
      warehouse_code: shortMaKho,
      ten_sieu_thi: storeName,
      selected_staff_ids: JSON.stringify(ids)
    }, { onConflict: 'id' }).then(({ error }: any) => {
      if (error) console.error('[EmployeeHealth] Save selected_staff_ids error:', error);
    });
  };

  const saveThuongField = (staffId: string, field: 'truoc' | 'hientai', value: string) => {
    setThuongData(prev => {
      const updated = { ...prev, [staffId]: { ...prev[staffId], [field]: value } };
      saveThuongToDb(updated);
      return updated;
    });
  };

  const copyToClipboard = (text: string, isPasteHandler: boolean = false): Promise<void> => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      if (isPasteHandler) {
        // Run synchronously to preserve user gesture context (especially for Safari)
        // and avoid shifting focus during the paste event.
        return navigator.clipboard.writeText(text).catch(() => {
          // If it fails, schedule fallback copy asynchronously so we don't steal focus during paste
          return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              copyToClipboardFallback(text).then(resolve).catch(reject);
            }, 100);
          });
        });
      } else {
        return navigator.clipboard.writeText(text).catch(() => {
          return copyToClipboardFallback(text);
        });
      }
    }
    
    if (isPasteHandler) {
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          copyToClipboardFallback(text).then(resolve).catch(reject);
        }, 100);
      });
    }
    return copyToClipboardFallback(text);
  };

  const copyToClipboardFallback = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const activeEl = document.activeElement as HTMLElement | null;
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (activeEl && typeof activeEl.focus === 'function') {
          activeEl.focus();
        }
        
        if (successful) {
          resolve();
        } else {
          reject(new Error('execCommand copy failed'));
        }
      } catch (err) {
        if (activeEl && typeof activeEl.focus === 'function') {
          activeEl.focus();
        }
        reject(err);
      }
    });
  };

  const autoCopyNextStaff = (currentStaffId: string, isFromKeyUp: boolean = false) => {
    const currentIndex = filteredBiData.findIndex(s => s.fullId === currentStaffId);
    if (currentIndex !== -1 && currentIndex < filteredBiData.length - 1) {
      const nextStaff = filteredBiData[currentIndex + 1];
      let nextStaffId = '';
      if (nextStaff.displayName && nextStaff.displayName.includes('-')) {
        nextStaffId = nextStaff.displayName.split('-')[0].trim();
      } else if (nextStaff.fullId.includes('-')) {
        nextStaffId = nextStaff.fullId.split('-')[0].trim();
      } else {
        const match = nextStaff.fullId.match(/\d+/);
        nextStaffId = match ? match[0] : nextStaff.fullId;
      }
      
      // Store next ID in ref for keyup fallback
      pendingCopyStaffIdRef.current = { staffId: currentStaffId, nextStaffId };
      
      copyToClipboard(nextStaffId, true).then(() => {
        // Clear pending copy if succeeded
        pendingCopyStaffIdRef.current = null;
        showNotification(`Đã copy mã NV tiếp theo: ${nextStaffId} (${nextStaff.displayName.split(' - ').pop()})`, 'success');
      }).catch(err => {
        console.warn('Sync copy failed inside event handler, waiting for keyup gesture fallback: ', err);
        // Only show error notification if this was called from keyup (where gesture fallback also failed)
        if (isFromKeyUp) {
          showNotification(`Không thể copy mã NV tiếp theo: ${nextStaffId}`, 'error');
        }
      });
    }
  };

  const handleStaffInputKeyUp = (currentStaffId: string) => {
    const pending = pendingCopyStaffIdRef.current;
    if (pending && pending.staffId === currentStaffId) {
      // Trigger copy with isFromKeyUp = true so it shows error if it actually fails under keyup
      autoCopyNextStaff(currentStaffId, true);
    }
  };

  const handleClearThuong = (field: 'truoc' | 'hientai') => {
    if (!window.confirm(`Bạn có chắc muốn xóa dữ liệu thưởng ${field === 'truoc' ? 'tháng trước' : 'hiện tại'} của tất cả nhân viên?`)) return;
    setThuongData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(staffId => {
        if (updated[staffId]) {
          updated[staffId] = { ...updated[staffId], [field]: '' };
        }
      });
      saveThuongToDb(updated);
      showNotification(`Đã xóa dữ liệu thưởng ${field === 'truoc' ? 'tháng trước' : 'hiện tại'} thành công!`, 'success');
      return updated;
    });
  };

  const handleImportFromInsite = async () => {
    // If Tampermonkey background sync helper is active, trigger it directly in the background!
    if ((window as any).CRM_TAMPERMONKEY_ACTIVE) {
      showNotification('Đang tải ngầm dữ liệu thưởng từ Insite...', 'info');
      document.dispatchEvent(new CustomEvent('CRM_TRIGGER_SYNC_THUONG'));
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim() === '') {
        showNotification('Không tìm thấy dữ liệu trong Clipboard. Vui lòng copy dữ liệu từ Insite trước!', 'warning');
        return;
      }
      
      let items: { maNhanVien: string; soTien: string }[] = [];
      
      if (text.startsWith('CRM_BONUS_DATA:')) {
        try {
          const jsonStr = text.substring('CRM_BONUS_DATA:'.length);
          items = JSON.parse(jsonStr);
        } catch (e) {
          console.error('[THUONG] Error parsing JSON from Tampermonkey:', e);
        }
      } else {
        // Fallback: Parse tab-separated, semicolon-separated, or space-separated values from manual copy
        const lines = text.split('\n');
        for (const line of lines) {
          let parts = line.split('\t').map(p => p.trim());
          if (parts.length < 2) {
            parts = line.split(/ {2,}/).map(p => p.trim());
          }
          if (parts.length < 2) {
            parts = line.split(';').map(p => p.trim());
          }
          
          if (parts.length >= 2) {
            // Find a cell containing the Employee ID (5 to 8 digits)
            let maNV = '';
            let maNVIndex = -1;
            
            for (let i = 0; i < parts.length; i++) {
              const match = parts[i].match(/\b\d{5,8}\b/);
              if (match) {
                maNV = match[0];
                maNVIndex = i;
                break;
              }
            }
            
            if (maNVIndex !== -1) {
              let soTien = '';
              // Search for a cell that looks like an amount (>= 1,000 VND)
              for (let i = 0; i < parts.length; i++) {
                if (i === maNVIndex) continue;
                const cleanVal = parts[i].replace(/[.,\sđ]/gi, '');
                if (cleanVal && /^\d+$/.test(cleanVal) && Number(cleanVal) >= 1000) {
                  soTien = cleanVal;
                  break;
                }
              }
              
              if (maNV && soTien) {
                items.push({ maNhanVien: maNV, soTien });
              }
            }
          }
        }
      }
      
      if (items.length === 0) {
        showNotification('Không nhận diện được định dạng dữ liệu thưởng trong Clipboard. Vui lòng thử lại!', 'warning');
        return;
      }
      
      setThuongData(prev => {
        const next = { ...prev };
        let count = 0;
        
        filteredBiData.forEach(staff => {
          const staffIdMatch = staff.fullId.match(/\d+/);
          if (staffIdMatch) {
            const numericId = staffIdMatch[0];
            const matchedItem = items.find(item => item.maNhanVien === numericId);
            if (matchedItem) {
              next[staff.fullId] = {
                ...(next[staff.fullId] || { truoc: '' }),
                hientai: matchedItem.soTien
              };
              count++;
            }
          }
        });
        
        if (count > 0) {
          saveThuongToDb(next);
          showNotification(`Đã tự động cập nhật thưởng hiện tại cho ${count} nhân viên thành công!`, 'success');
        } else {
          showNotification('Không tìm thấy mã nhân viên nào trùng khớp trong danh sách siêu thị!', 'warning');
        }
        return next;
      });
      
    } catch (err) {
      console.error('[THUONG] Error reading clipboard:', err);
      showNotification('Không thể đọc dữ liệu từ Clipboard. Vui lòng cấp quyền truy cập clipboard cho trình duyệt!', 'error');
    }
  };

  // Default to check all when data is loaded or STORE changes
  // KEY FIX: marketFilter is NOT in deps — only biRevenueData change triggers this.
  // When marketFilter changes, we do NOT clear selectedStaffIds immediately to prevent layout shift (shaking/flicker).
  // Instead, we wait for biRevenueData to load. Once it loads:
  // - If it is empty, we clear selectedStaffIds and update initializedRef.
  // - If it is not empty, we initialize selectedStaffIds to all staff.
  useEffect(() => {
    if (!maKho) return;
    const storeKey = `${maKho}_${marketFilter}`;

    if (biRevenueData.length === 0) {
      if (initializedRef.current !== storeKey) {
        setSelectedStaffIds([]);
        initializedRef.current = storeKey;
      }
      return;
    }

    const validIds = biRevenueData.map(s => s.fullId);
    const hasValidSelection = selectedStaffIds.length > 0 && selectedStaffIds.some(id => validIds.includes(id));
    const isExplicitlyEmpty = initializedRef.current === storeKey && selectedStaffIds.length === 0;

    if (initializedRef.current !== storeKey || (!hasValidSelection && !isExplicitlyEmpty)) {
      setSelectedStaffIds(validIds);
      initializedRef.current = storeKey;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maKho, biRevenueData]); // intentionally omit marketFilter & selectedStaffIds to avoid race condition

  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const filteredBiData = useMemo(() => biRevenueData.filter(staff => {
    const matchesSearch = staff.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.fullId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSelection = selectedStaffIds.includes(staff.fullId);
    return matchesSearch && matchesSelection;
  }), [biRevenueData, searchTerm, selectedStaffIds]);

  const parsedTraChamRows = useMemo(() => {
    const parsed = parseTraChamData(tragopNv);
    return parsed
      .filter((row: any) => {
        // Find if this row matches any staff in the store's biRevenueData list
        const matchingStaff = biRevenueData.find(staff => {
          const staffId = staff.fullId.toLowerCase().trim();
          const staffName = (staff.displayName.split('-').pop() || '').trim();
          const staffNameClean = removeAccents(staffName);
          const rowValClean = removeAccents(row.nhanVien);
          return rowValClean.includes(staffId) || 
                 rowValClean === staffNameClean ||
                 rowValClean.includes(staffNameClean) ||
                 staffNameClean.includes(rowValClean);
        });
        if (!matchingStaff) return false;
        return selectedStaffIds.includes(matchingStaff.fullId);
      })
      .sort((a, b) => b.percent - a.percent);
  }, [tragopNv, selectedStaffIds, biRevenueData, parseTraChamData]);

  const parsedBanKemRows = useMemo(() => {
    return banKemNv ? parseBanKemData(banKemNv)
      .filter(row => selectedStaffIds.length === 0 || selectedStaffIds.some(id => row.nhanVien.includes(id)))
      .sort((a, b) => parseFloat(b.phanTramBill) - parseFloat(a.phanTramBill)) : [];
  }, [banKemNv, selectedStaffIds, parseBanKemData]);

  const generateBanKemComment = useCallback((tmpl: 1 | 2 | 3): string => {
    if (parsedBanKemRows.length === 0) return '';
    const total = parsedBanKemRows.length;
    const threshold = Math.max(1, Math.ceil(total * 0.2));

    const getStaffId = (nhanVien: string) => {
      const match = nhanVien.match(/\d{4,6}/);
      return match ? match[0] : nhanVien.trim();
    };

    if (tmpl === 1) {
      const top = parsedBanKemRows.slice(0, threshold);
      const bot = parsedBanKemRows.slice(Math.max(threshold, total - threshold));
      let text = `📊 BÁO CÁO BÁN KÈM NHÂN VIÊN\n⚡ Luỹ kế tháng || TGSD: ${daysPassed}/${totalDays}\n━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🏆 TOP ${top.length} DẪN ĐẦU % BÁN KÈM:\n`;
      top.forEach((r, i) => {
        const id = getStaffId(r.nhanVien);
        text += `🔺 #${i + 1}. @${id} - ${r.phanTramBill} (${r.luotBill} bill BK)\n`;
      });
      text += `\n⚠️ BOTTOM ${bot.length} CẦN TĂNG TỐC BÁN KÈM:\n`;
      bot.forEach((r, i) => {
        const id = getStaffId(r.nhanVien);
        text += `🔻 #${total - bot.length + i + 1}. @${id} - ${r.phanTramBill}\n`;
      });
      text += `\n💪 Chủ động giới thiệu combo & phụ kiện kèm theo mọi đơn hàng! 🔥`;
      return text;
    } else if (tmpl === 2) {
      const bot = parsedBanKemRows.slice(Math.max(threshold, total - threshold));
      let text = `🚨 DANH SÁCH NHÂN VIÊN CẦN TĂNG TỐC BÁN KÈM:\n`;
      text += `📊 Tổng: ${bot.length}/${total} nhân viên\n\n`;
      bot.forEach((r, i) => {
        const id = getStaffId(r.nhanVien);
        text += `🟡 #${i + 1}. @${id}\n`;
      });
      text += `\n💡 Nhắc nhở và hỗ trợ các nhân viên trên bám sát chỉ số bán kèm hàng ngày!`;
      return text;
    } else {
      const totalBK = parsedBanKemRows.reduce((s: number, r: any) => s + (parseInt(String(r.luotBill).replace(/[^0-9]/g, '')) || 0), 0);
      const totalBH = parsedBanKemRows.reduce((s: number, r: any) => s + (parseInt(String(r.luotBillBanHang).replace(/[^0-9]/g, '')) || 0), 0);
      const overallRate = totalBH > 0 ? ((totalBK / totalBH) * 100).toFixed(2) + '%' : '0%';
      let text = `⚡ TÓM TẮT BÁN KÈM NHÂN VIÊN:\n`;
      text += `📅 TGSD: ${daysPassed}/${totalDays} ngày\n`;
      text += `👥 Tổng số nhân viên: ${total}\n`;
      text += `📦 Tổng lượt bill bán kèm: ${totalBK.toLocaleString('vi-VN')}\n`;
      text += `🧾 Tổng lượt bill bán hàng: ${totalBH.toLocaleString('vi-VN')}\n`;
      text += `📈 Tỉ lệ bán kèm toàn siêu thị: ${overallRate}\n`;
      const top1 = parsedBanKemRows[0];
      if (top1) {
        text += `🥇 Dẫn đầu: @${getStaffId(top1.nhanVien)} (${top1.phanTramBill} - ${top1.luotBill} bill BK)\n`;
      }
      return text;
    }
  }, [parsedBanKemRows, daysPassed, totalDays]);

  const handleOpenBanKemComment = useCallback(() => {
    const initialText = generateBanKemComment(1);
    setCommentModal({
      isOpen: true,
      title: 'Nhận xét bán kèm',
      template: 1,
      text: initialText,
      tabs: [
        { id: 1, label: 'Mẫu 1: TOP/BOT NV', icon: '🏆' },
        { id: 2, label: 'Mẫu 2: DS Cần tăng tốc', icon: '⚠️' },
        { id: 3, label: 'Mẫu 3: Tóm tắt', icon: '⚡' },
      ],
      generator: generateBanKemComment,
    });
  }, [generateBanKemComment]);

  const generateTraChamComment = useCallback((tmpl: 1 | 2 | 3): string => {
    if (parsedTraChamRows.length === 0) return '';
    const total = parsedTraChamRows.length;
    const threshold = Math.max(1, Math.ceil(total * 0.2));

    const getStaffId = (nhanVien: string) => {
      const match = nhanVien.match(/\d{4,6}/);
      return match ? match[0] : nhanVien.trim();
    };

    if (tmpl === 1) {
      const top = parsedTraChamRows.slice(0, threshold);
      const bot = parsedTraChamRows.slice(Math.max(threshold, total - threshold));
      let text = `📊 BÁO CÁO TRẢ CHẬM NHÂN VIÊN\n⚡ Luỹ kế tháng || TGSD: ${daysPassed}/${totalDays}\n━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🏆 TOP ${top.length} TỈ LỆ TRẢ CHẬM CAO NHẤT:\n`;
      top.forEach((r, i) => {
        const id = getStaffId(r.nhanVien);
        text += `🔺 #${i + 1}. @${id} - ${r.percent.toFixed(1)}% (DT: ${Math.round(r.installmentRevenue).toLocaleString('vi-VN')}đ)\n`;
      });
      text += `\n⚠️ BOTTOM ${bot.length} CẦN ĐẨY MẠNH TRẢ CHẬM:\n`;
      bot.forEach((r, i) => {
        const id = getStaffId(r.nhanVien);
        text += `🔻 #${total - bot.length + i + 1}. @${id} - ${r.percent.toFixed(1)}%\n`;
      });
      text += `\n💪 Tư vấn linh hoạt các gói trả góp / trả chậm 0% để kích cầu mua sắm! 🔥`;
      return text;
    } else if (tmpl === 2) {
      const bot = parsedTraChamRows.slice(Math.max(threshold, total - threshold));
      let text = `🚨 DANH SÁCH NHÂN VIÊN CẦN ĐẨY MẠNH TRẢ CHẬM:\n`;
      text += `📊 Tổng: ${bot.length}/${total} nhân viên\n\n`;
      bot.forEach((r, i) => {
        const id = getStaffId(r.nhanVien);
        text += `🟡 #${i + 1}. @${id}\n`;
      });
      text += `\n💡 Tận dụng các chương trình trả chậm để chốt đơn phân khúc trung & cao cấp!`;
      return text;
    } else {
      const totalRev = parsedTraChamRows.reduce((s: number, r: any) => s + r.totalRevenue, 0);
      const totalInst = parsedTraChamRows.reduce((s: number, r: any) => s + r.installmentRevenue, 0);
      const overallRate = totalRev > 0 ? ((totalInst / totalRev) * 100).toFixed(1) + '%' : '0%';
      let text = `⚡ TÓM TẮT HIỆU QUẢ TRẢ CHẬM:\n`;
      text += `📅 TGSD: ${daysPassed}/${totalDays} ngày\n`;
      text += `👥 Tổng số nhân viên: ${total}\n`;
      text += `💰 Tổng doanh thu thực: ${Math.round(totalRev).toLocaleString('vi-VN')}đ\n`;
      text += `💳 Tổng doanh thu trả chậm: ${Math.round(totalInst).toLocaleString('vi-VN')}đ\n`;
      text += `📈 Tỉ lệ trả chậm toàn siêu thị: ${overallRate}\n`;
      const top1 = parsedTraChamRows[0];
      if (top1) {
        text += `🥇 Dẫn đầu trả chậm: @${getStaffId(top1.nhanVien)} (${top1.percent.toFixed(1)}%)\n`;
      }
      return text;
    }
  }, [parsedTraChamRows, daysPassed, totalDays]);

  const handleOpenTraChamComment = useCallback(() => {
    const initialText = generateTraChamComment(1);
    setCommentModal({
      isOpen: true,
      title: 'Nhận xét trả chậm',
      template: 1,
      text: initialText,
      tabs: [
        { id: 1, label: 'Mẫu 1: TOP/BOT NV', icon: '🏆' },
        { id: 2, label: 'Mẫu 2: DS Cần tăng tốc', icon: '⚠️' },
        { id: 3, label: 'Mẫu 3: Tóm tắt', icon: '⚡' },
      ],
      generator: generateTraChamComment,
    });
  }, [generateTraChamComment]);

  const parseTn = useCallback((rawText: string) => {
    try {
      const json = JSON.parse(rawText);
      if (json && typeof json === 'object') {
        return biRevenueData.map(staff => {
          const text = json[staff.fullId] || '';
          const { tong } = parseBonusData(text, staff, marketFilter);
          return {
            id: staff.fullId.match(/\d+/) ? staff.fullId.match(/\d+/)![0] : staff.fullId,
            name: staff.displayName,
            value: tong || 0
          };
        });
      }
    } catch {}
    return parseStaffValueList(rawText);
  }, [biRevenueData, marketFilter]);

  const {
    dtqd1Sum,
    dtqd2Sum,
    dtqd3Sum,
    thunhap1Sum,
    thunhap2Sum,
    thunhap3Sum,
    nganhhang1Sum,
    nganhhang2Sum,
    nganhhang3Sum,
    giocong1Sum,
    giocong2Sum,
    giocong3Sum,
    thidua1Sum,
    thidua2Sum,
    thidua3Sum,
    tracham1Sum,
    tracham2Sum,
    tracham3Sum
  } = useMemo(() => {
    const parsedDtqd1 = parseStaffValueList(dtqd3t1);
    const parsedDtqd2 = parseStaffValueList(dtqd3t2);
    const parsedDtqd3 = parseStaffValueList(dtqd3t3);
    
    const parsedTn1 = parseTn(thunhap3t1);
    const parsedTn2 = parseTn(thunhap3t2);
    const parsedTn3 = parseTn(thunhap3t3);

    const parsedNh1 = parseStaffValueList(nganhhang3t1);
    const parsedNh2 = parseStaffValueList(nganhhang3t2);
    const parsedNh3 = parseStaffValueList(nganhhang3t3);

    const parsedGc1 = parseStaffValueList(giocong3t1);
    const parsedGc2 = parseStaffValueList(giocong3t2);
    const parsedGc3 = parseStaffValueList(giocong3t3);

    const parsedTd1 = parseStaffValueList(thidua3t1);
    const parsedTd2 = parseStaffValueList(thidua3t2);
    const parsedTd3 = parseStaffValueList(thidua3t3);

    const parsedTracham1 = parseStaffValueList(tracham3t1, 'LAST_COLUMN');
    const parsedTracham2 = parseStaffValueList(tracham3t2, 'LAST_COLUMN');
    const parsedTracham3 = parseStaffValueList(tracham3t3, 'LAST_COLUMN');

    const calcSum = (parsed: any[]) => parsed.reduce((acc, item) => {
      let val = item.value;
      if (val > 0 && val < 1000000) val = val * 1000000;
      return acc + val;
    }, 0);

    const calcRawSum = (parsed: any[]) => parsed.reduce((acc, item) => acc + item.value, 0);

    return {
      dtqd1Sum: calcSum(parsedDtqd1),
      dtqd2Sum: calcSum(parsedDtqd2),
      dtqd3Sum: calcSum(parsedDtqd3),
      thunhap1Sum: calcSum(parsedTn1),
      thunhap2Sum: calcSum(parsedTn2),
      thunhap3Sum: calcSum(parsedTn3),
      nganhhang1Sum: calcRawSum(parsedNh1),
      nganhhang2Sum: calcRawSum(parsedNh2),
      nganhhang3Sum: calcRawSum(parsedNh3),
      giocong1Sum: calcRawSum(parsedGc1),
      giocong2Sum: calcRawSum(parsedGc2),
      giocong3Sum: calcRawSum(parsedGc3),
      thidua1Sum: calcRawSum(parsedTd1),
      thidua2Sum: calcRawSum(parsedTd2),
      thidua3Sum: calcRawSum(parsedTd3),
      tracham1Sum: calcRawSum(parsedTracham1),
      tracham2Sum: calcRawSum(parsedTracham2),
      tracham3Sum: calcRawSum(parsedTracham3),
    };
  }, [dtqd3t1, dtqd3t2, dtqd3t3, thunhap3t1, thunhap3t2, thunhap3t3, nganhhang3t1, nganhhang3t2, nganhhang3t3, giocong3t1, giocong3t2, giocong3t3, thidua3t1, thidua3t2, thidua3t3, tracham3t1, tracham3t2, tracham3t3, parseTn]);

  const formatValueForDisplay = (val: number, isCurrency: boolean = false) => {
    if (val === 0) return isCurrency ? '0 đ' : '0';
    if (isCurrency || Math.abs(val) >= 1000000) {
      const formatted = formatCurrencyValue(val);
      if (Math.abs(val) < 1000000 && isCurrency) return `${formatted} đ`;
      return formatted;
    }
    return Math.round(val).toLocaleString('vi-VN');
  };

  const parsedRank3TData = useMemo(() => {
    const parseDtqdWithEff = (rawText: string) => {
      if (!rawText || !rawText.trim()) return [];
      const list = parseStaffRankData(rawText);
      return list.map(item => {
        let val = item.actualVal || 0;
        let eff = item.effVal || 0;
        if (eff > 0 && eff <= 1.0) {
          eff = eff * 100;
        }
        return {
          id: item.fullId || (item.displayName.match(/\d+/) ? item.displayName.match(/\d+/)![0] : ''),
          name: item.displayName,
          value: val,
          eff
        };
      });
    };

    const parsedDtqd1 = parseDtqdWithEff(dtqd3t1);
    const parsedDtqd2 = parseDtqdWithEff(dtqd3t2);
    const parsedDtqd3 = parseDtqdWithEff(dtqd3t3);
    
    const parsedTn1 = parseTn(thunhap3t1);
    const parsedTn2 = parseTn(thunhap3t2);
    const parsedTn3 = parseTn(thunhap3t3);

    const parsedNh1 = parseStaffValueList(nganhhang3t1);
    const parsedNh2 = parseStaffValueList(nganhhang3t2);
    const parsedNh3 = parseStaffValueList(nganhhang3t3);

    const parsedGc1 = parseStaffValueList(giocong3t1);
    const parsedGc2 = parseStaffValueList(giocong3t2);
    const parsedGc3 = parseStaffValueList(giocong3t3);

    const parsedTracham1 = parseStaffValueList(tracham3t1, 'LAST_COLUMN');
    const parsedTracham2 = parseStaffValueList(tracham3t2, 'LAST_COLUMN');
    const parsedTracham3 = parseStaffValueList(tracham3t3, 'LAST_COLUMN');

    const employeeMap = new Map<string, {
      id: string;
      name: string;
      dtqd1: number;
      dtqd2: number;
      dtqd3: number;
      dtqd: number;
      eff1: number;
      eff2: number;
      eff3: number;
      hasEff1: boolean;
      hasEff2: boolean;
      hasEff3: boolean;
      thunhap1: number;
      thunhap2: number;
      thunhap3: number;
      thunhap: number;
      nganhhang: number;
      giocong: number;
    }>();

    const getCleanName = (nameStr: string) => {
      if (!nameStr) return '';
      let cleaned = nameStr;
      if (nameStr.includes('-')) {
        cleaned = nameStr.split('-').pop()!.trim();
      } else if (nameStr.includes('–')) {
        cleaned = nameStr.split('–').pop()!.trim();
      } else if (nameStr.includes('—')) {
        cleaned = nameStr.split('—').pop()!.trim();
      }
      return cleaned.replace(/^USER\s+/i, '').trim();
    };

    const getEmpKey = (emp: { id: string; name: string }) => {
      const cleanName = getCleanName(emp.name || emp.id);
      return `NAME_${normalize(cleanName)}`;
    };

    const getOrCreate = (emp: { id: string; name: string }) => {
      const key = getEmpKey(emp);
      const cleanName = getCleanName(emp.name || emp.id);
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          id: emp.id && /^\d{5,}$/.test(emp.id) ? emp.id : '',
          name: cleanName,
          dtqd1: 0,
          dtqd2: 0,
          dtqd3: 0,
          dtqd: 0,
          eff1: 0,
          eff2: 0,
          eff3: 0,
          hasEff1: false,
          hasEff2: false,
          hasEff3: false,
          thunhap1: 0,
          thunhap2: 0,
          thunhap3: 0,
          thunhap: 0,
          nganhhang: 0,
          giocong: 0,
          tracham1: 0,
          tracham2: 0,
          tracham3: 0,
          tracham: 0
        });
      } else {
        const existing = employeeMap.get(key)!;
        if (!existing.id && emp.id && /^\d{5,}$/.test(emp.id)) {
          existing.id = emp.id;
        }
      }
      return employeeMap.get(key)!;
    };

    parsedDtqd1.forEach(item => {
      const entry = getOrCreate(item);
      entry.dtqd1 += item.value;
      entry.dtqd += item.value;
      if (item.eff > 0) {
        entry.eff1 = item.eff;
        entry.hasEff1 = true;
      }
    });
    parsedDtqd2.forEach(item => {
      const entry = getOrCreate(item);
      entry.dtqd2 += item.value;
      entry.dtqd += item.value;
      if (item.eff > 0) {
        entry.eff2 = item.eff;
        entry.hasEff2 = true;
      }
    });
    parsedDtqd3.forEach(item => {
      const entry = getOrCreate(item);
      entry.dtqd3 += item.value;
      entry.dtqd += item.value;
      if (item.eff > 0) {
        entry.eff3 = item.eff;
        entry.hasEff3 = true;
      }
    });

    parsedTn1.forEach(item => {
      const entry = getOrCreate(item);
      entry.thunhap1 += item.value;
      entry.thunhap += item.value;
    });
    parsedTn2.forEach(item => {
      const entry = getOrCreate(item);
      entry.thunhap2 += item.value;
      entry.thunhap += item.value;
    });
    parsedTn3.forEach(item => {
      const entry = getOrCreate(item);
      entry.thunhap3 += item.value;
      entry.thunhap += item.value;
    });

    parsedNh1.forEach(item => {
      const entry = getOrCreate(item);
      entry.nganhhang += item.value;
    });
    parsedNh2.forEach(item => {
      const entry = getOrCreate(item);
      entry.nganhhang += item.value;
    });
    parsedNh3.forEach(item => {
      const entry = getOrCreate(item);
      entry.nganhhang += item.value;
    });

    parsedGc1.forEach(item => {
      const entry = getOrCreate(item);
      entry.giocong += item.value;
    });
    parsedGc2.forEach(item => {
      const entry = getOrCreate(item);
      entry.giocong += item.value;
    });
    parsedGc3.forEach(item => {
      const entry = getOrCreate(item);
      entry.giocong += item.value;
    });

    parsedTracham1.forEach(item => {
      const entry = getOrCreate(item);
      entry.tracham1 += item.value;
      entry.tracham += item.value;
    });
    parsedTracham2.forEach(item => {
      const entry = getOrCreate(item);
      entry.tracham2 += item.value;
      entry.tracham += item.value;
    });
    parsedTracham3.forEach(item => {
      const entry = getOrCreate(item);
      entry.tracham3 += item.value;
      entry.tracham += item.value;
    });

    return Array.from(employeeMap.values()).map(emp => {
      let dtqd = emp.dtqd;
      if (dtqd > 0 && dtqd < 1000000) dtqd = dtqd * 1000000;

      let dtqd1 = emp.dtqd1;
      if (dtqd1 > 0 && dtqd1 < 1000000) dtqd1 = dtqd1 * 1000000;

      let dtqd2 = emp.dtqd2;
      if (dtqd2 > 0 && dtqd2 < 1000000) dtqd2 = dtqd2 * 1000000;

      let dtqd3 = emp.dtqd3;
      if (dtqd3 > 0 && dtqd3 < 1000000) dtqd3 = dtqd3 * 1000000;
      
      let thunhap1 = emp.thunhap1;
      if (thunhap1 > 0 && thunhap1 < 1000000) thunhap1 = thunhap1 * 1000000;

      let thunhap2 = emp.thunhap2;
      if (thunhap2 > 0 && thunhap2 < 1000000) thunhap2 = thunhap2 * 1000000;

      let thunhap3 = emp.thunhap3;
      if (thunhap3 > 0 && thunhap3 < 1000000) thunhap3 = thunhap3 * 1000000;

      let thunhap = emp.thunhap;
      if (thunhap > 0 && thunhap < 1000000) thunhap = thunhap * 1000000;

      const currentSystemMonth = new Date().getMonth() + 1;
      const m1Num = parseInt(rankMonth1.replace(/\D/g, '')) || 4;
      const m2Num = parseInt(rankMonth2.replace(/\D/g, '')) || 5;
      const m3Num = parseInt(rankMonth3.replace(/\D/g, '')) || 6;
      const isM1CurrentMonth = m1Num === currentSystemMonth;
      const isM2CurrentMonth = m2Num === currentSystemMonth;
      const isM3CurrentMonth = m3Num === currentSystemMonth;

      if (isProjectedMonth1 && isM1CurrentMonth && daysPassed > 0) {
        dtqd1 = (dtqd1 / daysPassed) * totalDays;
        thunhap1 = (thunhap1 / daysPassed) * totalDays;
      }
      if (isProjectedMonth2 && isM2CurrentMonth && daysPassed > 0) {
        dtqd2 = (dtqd2 / daysPassed) * totalDays;
        thunhap2 = (thunhap2 / daysPassed) * totalDays;
      }
      if (isProjectedMonth3 && isM3CurrentMonth && daysPassed > 0) {
        dtqd3 = (dtqd3 / daysPassed) * totalDays;
        thunhap3 = (thunhap3 / daysPassed) * totalDays;
      }

      dtqd = dtqd1 + dtqd2 + dtqd3;
      thunhap = thunhap1 + thunhap2 + thunhap3;

      let effQd1 = emp.hasEff1 ? emp.eff1 : (dtqd1 > 0 ? (thunhap1 / dtqd1) * 100 : 0);
      let effQd2 = emp.hasEff2 ? emp.eff2 : (dtqd2 > 0 ? (thunhap2 / dtqd2) * 100 : 0);
      let effQd3 = emp.hasEff3 ? emp.eff3 : (dtqd3 > 0 ? (thunhap3 / dtqd3) * 100 : 0);

      let effSum = 0;
      let effCount = 0;
      if (emp.hasEff1 || dtqd1 > 0) { effSum += effQd1; effCount++; }
      if (emp.hasEff2 || dtqd2 > 0) { effSum += effQd2; effCount++; }
      if (emp.hasEff3 || dtqd3 > 0) { effSum += effQd3; effCount++; }

      let effQd = effCount > 0 ? effSum / effCount : (dtqd > 0 ? (thunhap / dtqd) * 100 : 0);

      return {
        id: emp.id,
        name: emp.name,
        dtqd1,
        dtqd2,
        dtqd3,
        dtqd,
        thunhap1,
        thunhap2,
        thunhap3,
        thunhap,
        nganhhang: emp.nganhhang,
        giocong: emp.giocong,
        tracham1: emp.tracham1,
        tracham2: emp.tracham2,
        tracham3: emp.tracham3,
        tracham: emp.tracham,
        effQd1,
        effQd2,
        effQd3,
        effQd
      };
    })
    .filter(emp => emp.dtqd > 0 || emp.thunhap > 0 || emp.nganhhang > 0 || emp.giocong > 0 || emp.tracham > 0)
    .sort((a, b) => b.dtqd - a.dtqd);
  }, [dtqd3t1, dtqd3t2, dtqd3t3, thunhap3t1, thunhap3t2, thunhap3t3, nganhhang3t1, nganhhang3t2, nganhhang3t3, giocong3t1, giocong3t2, giocong3t3, tracham3t1, tracham3t2, tracham3t3, parseTn, isProjectedMonth1, isProjectedMonth2, isProjectedMonth3, daysPassed, totalDays, rankMonth1, rankMonth2, rankMonth3]);

  const filteredRank3TData = useMemo(() => {
    if (!biRevenueData || biRevenueData.length === 0) return parsedRank3TData;

    // Synchronize 3-Month Ranking table (Hình 2) with BỘ LỌC NHÂN VIÊN (Hình 1 / selectedStaffIds)
    const selectedData = parsedRank3TData.filter(emp => {
      const empIdClean = emp.id ? emp.id.toLowerCase().trim() : '';
      const empNameClean = removeAccents((emp.name || '').toLowerCase().trim());

      // Filter out non-employee summary rows like ĐMX, Tổng, Hỗ trợ BI
      if (!empNameClean || empNameClean === 'dmx' || empNameClean === 'tong' || empNameClean.includes('ho tro bi')) {
        return false;
      }

      const matchingStaff = biRevenueData.find(staff => {
        const staffFullIdClean = (staff.fullId || '').toLowerCase().trim();
        const staffDisplayClean = removeAccents((staff.displayName || '').toLowerCase().trim());

        // 1. Direct ID match
        if (empIdClean && (staffFullIdClean.includes(empIdClean) || staffDisplayClean.includes(empIdClean))) {
          return true;
        }

        // 2. Display Name match
        if (empNameClean) {
          if (staffDisplayClean.includes(empNameClean) || empNameClean.includes(staffDisplayClean)) {
            return true;
          }

          // Match by name parts after removing hyphens
          const parts = staff.displayName.split(/[-–—]/).map(p => removeAccents(p.trim().toLowerCase())).filter(Boolean);
          for (const part of parts) {
            if (part && part.length > 2 && !/^\d+$/.test(part)) {
              if (empNameClean.includes(part) || part.includes(empNameClean)) {
                return true;
              }
            }
          }
        }
        return false;
      });

      // ONLY include if employee matches a staff in biRevenueData AND is checked in selectedStaffIds
      if (!matchingStaff) return false;
      return selectedStaffIds.includes(matchingStaff.fullId);
    });

    if (!searchTerm.trim()) return selectedData;
    const cleanSearch = removeAccents(searchTerm.toLowerCase());
    return selectedData.filter(emp => 
      removeAccents(emp.name.toLowerCase()).includes(cleanSearch) ||
      emp.id.toLowerCase().includes(cleanSearch)
    );
  }, [parsedRank3TData, searchTerm, selectedStaffIds, biRevenueData]);

  const rank3TTopBotStats = useMemo(() => {
    if (!filteredRank3TData || filteredRank3TData.length === 0) return { stats: {}, sets: null };
    
    const N = filteredRank3TData.length;
    const count20 = Math.max(1, Math.round(N * 0.2));

    // Sort by DTQĐ TB (row.dtqd)
    const sortedTb = [...filteredRank3TData].sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
    const topTbKeys = new Set(sortedTb.slice(0, count20).map(item => item.id || item.name));
    const botTbKeys = new Set(sortedTb.slice(-count20).map(item => item.id || item.name));

    // Individual monthly sets for cell background colors
    const sortedM1 = [...filteredRank3TData].sort((a, b) => b.dtqd1 - a.dtqd1);
    const topM1Keys = new Set(sortedM1.slice(0, count20).map(item => item.id || item.name));
    const botM1Keys = new Set(sortedM1.slice(-count20).map(item => item.id || item.name));

    const sortedM2 = [...filteredRank3TData].sort((a, b) => b.dtqd2 - a.dtqd2);
    const topM2Keys = new Set(sortedM2.slice(0, count20).map(item => item.id || item.name));
    const botM2Keys = new Set(sortedM2.slice(-count20).map(item => item.id || item.name));

    const sortedM3 = [...filteredRank3TData].sort((a, b) => b.dtqd3 - a.dtqd3);
    const topM3Keys = new Set(sortedM3.slice(0, count20).map(item => item.id || item.name));
    const botM3Keys = new Set(sortedM3.slice(-count20).map(item => item.id || item.name));

    const stats: Record<string, { top: number; bot: number }> = {};

    filteredRank3TData.forEach(row => {
      const key = row.id || row.name;
      const top = topTbKeys.has(key) ? 1 : 0;
      const bot = botTbKeys.has(key) ? 1 : 0;
      stats[key] = { top, bot };
    });

    return { stats, sets: { topM1Keys, botM1Keys, topM2Keys, botM2Keys, topM3Keys, botM3Keys, topTbKeys, botTbKeys } };
  }, [filteredRank3TData]);

  const mainStoreCategories = useMemo(() => {
    if (!processedData?.categories) return [];
    const filtered = processedData.categories.filter((c: any) => isCategoryForMarket(c, marketFilter));
    const seen = new Set<string>();
    const unique: any[] = [];
    filtered.forEach((c: any) => {
      const clean = cleanCategoryName(c.name);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        unique.push(c);
      }
    });
    return unique;
  }, [processedData?.categories, marketFilter]);

  const rank3TNganhHangScores = useMemo(() => {
    if (!filteredRank3TData || filteredRank3TData.length === 0) return {};

    const staffCount = filteredRank3TData.length;

    const calcMonth = (nganhhangInput: string, thiduaInput: string, mDaysPassed: number = 0, mTotalDays: number = 30) => {
      if (!nganhhangInput.trim()) return { staffMatrix: [], totalCat: 0 };

      const hasThiduaText = Boolean(thiduaInput && thiduaInput.trim().length > 0);
      let targetCatsToUse: any[] = [];

      if (hasThiduaText) {
        const categoryTargets = parseCategoryData(thiduaInput.trim(), 0, 30, allowedMarkets, 'LUYKE');

        const filteredCategoryTargets = categoryTargets.filter((c: any) => isCategoryForMarket(c, marketFilter));
        
        // Deduplicate unique categories per store using cleanCategoryName
        const seenCat = new Set<string>();
        filteredCategoryTargets.forEach((c: any) => {
          const clean = cleanCategoryName(c.name);
          if (clean && !seenCat.has(clean)) {
            seenCat.add(clean);
            targetCatsToUse.push(c);
          }
        });
      } else if (mainStoreCategories.length > 0) {
        targetCatsToUse = mainStoreCategories;
      }

      const { staffMatrix, categories } = parseStaffMatrixDataRefined(
        nganhhangInput,
        staffCount,
        targetCatsToUse,
        targetCatsToUse,
        mDaysPassed,
        mTotalDays,
        mDaysPassed > 0
      );

      return { staffMatrix, totalCat: categories.length };
    };

    const currentSystemMonth = new Date().getMonth() + 1;
    const m1Num = parseInt(rankMonth1.replace(/\D/g, '')) || 4;
    const m2Num = parseInt(rankMonth2.replace(/\D/g, '')) || 5;
    const m3Num = parseInt(rankMonth3.replace(/\D/g, '')) || 6;
    const isM1CurrentMonth = m1Num === currentSystemMonth;
    const isM2CurrentMonth = m2Num === currentSystemMonth;
    const isM3CurrentMonth = m3Num === currentSystemMonth;

    let m1;
    if (isProjectedMonth1 && isM1CurrentMonth && daysPassed > 0) {
      m1 = calcMonth(nganhhang3t1, thidua3t1, daysPassed, totalDays);
    } else {
      m1 = calcMonth(nganhhang3t1, thidua3t1);
    }

    let m2;
    if (isProjectedMonth2 && isM2CurrentMonth && daysPassed > 0) {
      m2 = calcMonth(nganhhang3t2, thidua3t2, daysPassed, totalDays);
    } else {
      m2 = calcMonth(nganhhang3t2, thidua3t2);
    }
    
    let m3;
    if (isProjectedMonth3 && isM3CurrentMonth && daysPassed > 0) {
      m3 = calcMonth(nganhhang3t3, thidua3t3, daysPassed, totalDays);
    } else {
      m3 = calcMonth(nganhhang3t3, thidua3t3);
    }

    const scores: Record<string, {
      m1Text: string;
      m2Text: string;
      m3Text: string;
      totalText: string;
      hasData: boolean;
    }> = {};

    filteredRank3TData.forEach(row => {
      const empId = (row.id || '').toLowerCase().trim();
      const empNameClean = removeAccents((row.name || '').toLowerCase());

      const findAchieved = (mRes: { staffMatrix: any[], totalCat: number }) => {
        if (!mRes.staffMatrix || mRes.staffMatrix.length === 0) return 0;
        const found = mRes.staffMatrix.find(item => {
          const rowId = (item.fullId || item.id || '').toLowerCase().trim();
          const rowNameClean = removeAccents((item.displayName || item.name || '').toLowerCase());
          return (empId && rowId && (empId === rowId || empId.includes(rowId) || rowId.includes(empId))) ||
                 (empNameClean && rowNameClean && (empNameClean === rowNameClean || empNameClean.includes(rowNameClean) || rowNameClean.includes(empNameClean)));
        });
        return found ? (found.achievedCount ?? found.achieved ?? 0) : 0;
      };

      const ach1 = findAchieved(m1);
      const ach2 = findAchieved(m2);
      const ach3 = findAchieved(m3);

      const m1Text = m1.totalCat > 0 ? `${ach1}/${m1.totalCat}` : '-';
      const m2Text = m2.totalCat > 0 ? `${ach2}/${m2.totalCat}` : '-';
      const m3Text = m3.totalCat > 0 ? `${ach3}/${m3.totalCat}` : '-';

      const totalAch = (m1.totalCat > 0 ? ach1 : 0) + (m2.totalCat > 0 ? ach2 : 0) + (m3.totalCat > 0 ? ach3 : 0);
      const totalCatSum = m1.totalCat + m2.totalCat + m3.totalCat;

      const totalText = totalCatSum > 0 ? `${totalAch}/${totalCatSum}` : '';

      scores[row.id || row.name] = {
        m1Text,
        m2Text,
        m3Text,
        totalText,
        hasData: totalCatSum > 0
      };
    });

    return scores;
  }, [filteredRank3TData, nganhhang3t1, thidua3t1, nganhhang3t2, thidua3t2, nganhhang3t3, thidua3t3, marketFilter, allowedMarkets, mainStoreCategories, isProjectedMonth1, isProjectedMonth2, isProjectedMonth3, daysPassed, totalDays, rankMonth1, rankMonth2, rankMonth3]);

  const rank3TNganhHangTopBotStats = useMemo(() => {
    if (!filteredRank3TData || filteredRank3TData.length === 0) return { stats: {}, sets: null };

    const N = filteredRank3TData.length;
    const count20 = Math.max(1, Math.round(N * 0.2));

    const getTotalAchievedVal = (row: any) => {
      const key = row.id || row.name;
      const sc = rank3TNganhHangScores[key];
      if (!sc || !sc.totalText) return 0;
      const parts = sc.totalText.split('/');
      return parts.length === 2 ? parseInt(parts[0], 10) || 0 : 0;
    };

    // Sort by N.HÀNG TB total achieved
    const sortedTb = [...filteredRank3TData].sort((a, b) => getTotalAchievedVal(b) - getTotalAchievedVal(a));
    const topTbKeys = new Set(sortedTb.slice(0, count20).map(item => item.id || item.name));
    const botTbKeys = new Set(sortedTb.slice(-count20).map(item => item.id || item.name));

    const getAchievedVal = (row: any, monthKey: 'm1' | 'm2' | 'm3') => {
      const key = row.id || row.name;
      const sc = rank3TNganhHangScores[key];
      if (!sc) return 0;
      const text = monthKey === 'm1' ? sc.m1Text : monthKey === 'm2' ? sc.m2Text : sc.m3Text;
      const parts = text.split('/');
      return parts.length === 2 ? parseInt(parts[0], 10) || 0 : 0;
    };

    const sortedM1 = [...filteredRank3TData].sort((a, b) => getAchievedVal(b, 'm1') - getAchievedVal(a, 'm1'));
    const topM1Keys = new Set(sortedM1.slice(0, count20).map(item => item.id || item.name));
    const botM1Keys = new Set(sortedM1.slice(-count20).map(item => item.id || item.name));

    const sortedM2 = [...filteredRank3TData].sort((a, b) => getAchievedVal(b, 'm2') - getAchievedVal(a, 'm2'));
    const topM2Keys = new Set(sortedM2.slice(0, count20).map(item => item.id || item.name));
    const botM2Keys = new Set(sortedM2.slice(-count20).map(item => item.id || item.name));

    const sortedM3 = [...filteredRank3TData].sort((a, b) => getAchievedVal(b, 'm3') - getAchievedVal(a, 'm3'));
    const topM3Keys = new Set(sortedM3.slice(0, count20).map(item => item.id || item.name));
    const botM3Keys = new Set(sortedM3.slice(-count20).map(item => item.id || item.name));

    const stats: Record<string, { top: number; bot: number }> = {};

    filteredRank3TData.forEach(row => {
      const key = row.id || row.name;
      const top = topTbKeys.has(key) ? 1 : 0;
      const bot = botTbKeys.has(key) ? 1 : 0;
      stats[key] = { top, bot };
    });

    return { stats, sets: { topM1Keys, botM1Keys, topM2Keys, botM2Keys, topM3Keys, botM3Keys, topTbKeys, botTbKeys } };
  }, [filteredRank3TData, rank3TNganhHangScores]);

  const rank3TEffQdTopBotStats = useMemo(() => {
    if (!filteredRank3TData || filteredRank3TData.length === 0) return { stats: {}, sets: null };

    const N = filteredRank3TData.length;
    const count20 = Math.max(1, Math.round(N * 0.2));

    // Sort by HQ TB (row.effQd)
    const sortedTb = [...filteredRank3TData].sort((a, b) => (b.effQd || 0) - (a.effQd || 0));
    const topTbKeys = new Set(sortedTb.slice(0, count20).map(item => item.id || item.name));
    const botTbKeys = new Set(sortedTb.slice(-count20).map(item => item.id || item.name));

    const sortedM1 = [...filteredRank3TData].sort((a, b) => (b.effQd1 || 0) - (a.effQd1 || 0));
    const topM1Keys = new Set(sortedM1.slice(0, count20).map(item => item.id || item.name));
    const botM1Keys = new Set(sortedM1.slice(-count20).map(item => item.id || item.name));

    const sortedM2 = [...filteredRank3TData].sort((a, b) => (b.effQd2 || 0) - (a.effQd2 || 0));
    const topM2Keys = new Set(sortedM2.slice(0, count20).map(item => item.id || item.name));
    const botM2Keys = new Set(sortedM2.slice(-count20).map(item => item.id || item.name));

    const sortedM3 = [...filteredRank3TData].sort((a, b) => (b.effQd3 || 0) - (a.effQd3 || 0));
    const topM3Keys = new Set(sortedM3.slice(0, count20).map(item => item.id || item.name));
    const botM3Keys = new Set(sortedM3.slice(-count20).map(item => item.id || item.name));

    const stats: Record<string, { top: number; bot: number }> = {};

    filteredRank3TData.forEach(row => {
      const key = row.id || row.name;
      const top = topTbKeys.has(key) ? 1 : 0;
      const bot = botTbKeys.has(key) ? 1 : 0;
      stats[key] = { top, bot };
    });

    return { stats, sets: { topM1Keys, botM1Keys, topM2Keys, botM2Keys, topM3Keys, botM3Keys, topTbKeys, botTbKeys } };
  }, [filteredRank3TData]);

  const rank3TThuNhapTopBotStats = useMemo(() => {
    if (!filteredRank3TData || filteredRank3TData.length === 0) return { stats: {}, sets: null };

    const N = filteredRank3TData.length;
    const count20 = Math.max(1, Math.round(N * 0.2));

    // Sort by TN TB (row.thunhap)
    const sortedTb = [...filteredRank3TData].sort((a, b) => (b.thunhap || 0) - (a.thunhap || 0));
    const topTbKeys = new Set(sortedTb.slice(0, count20).map(item => item.id || item.name));
    const botTbKeys = new Set(sortedTb.slice(-count20).map(item => item.id || item.name));

    const sortedM1 = [...filteredRank3TData].sort((a, b) => (b.thunhap1 || 0) - (a.thunhap1 || 0));
    const topM1Keys = new Set(sortedM1.slice(0, count20).map(item => item.id || item.name));
    const botM1Keys = new Set(sortedM1.slice(-count20).map(item => item.id || item.name));

    const sortedM2 = [...filteredRank3TData].sort((a, b) => (b.thunhap2 || 0) - (a.thunhap2 || 0));
    const topM2Keys = new Set(sortedM2.slice(0, count20).map(item => item.id || item.name));
    const botM2Keys = new Set(sortedM2.slice(-count20).map(item => item.id || item.name));

    const sortedM3 = [...filteredRank3TData].sort((a, b) => (b.thunhap3 || 0) - (a.thunhap3 || 0));
    const topM3Keys = new Set(sortedM3.slice(0, count20).map(item => item.id || item.name));
    const botM3Keys = new Set(sortedM3.slice(-count20).map(item => item.id || item.name));

    const stats: Record<string, { top: number; bot: number }> = {};

    filteredRank3TData.forEach(row => {
      const key = row.id || row.name;
      const top = topTbKeys.has(key) ? 1 : 0;
      const bot = botTbKeys.has(key) ? 1 : 0;
      stats[key] = { top, bot };
    });

    return { stats, sets: { topM1Keys, botM1Keys, topM2Keys, botM2Keys, topM3Keys, botM3Keys, topTbKeys, botTbKeys } };
  }, [filteredRank3TData]);

  const rank3TTraChamTopBotStats = useMemo(() => {
    if (!filteredRank3TData || filteredRank3TData.length === 0) return { stats: {}, sets: null };

    const N = filteredRank3TData.length;
    const count20 = Math.max(1, Math.round(N * 0.2));

    // Sort by Trả Chậm TB (row.tracham)
    const sortedTb = [...filteredRank3TData].sort((a, b) => (b.tracham || 0) - (a.tracham || 0));
    const topTbKeys = new Set(sortedTb.slice(0, count20).map(item => item.id || item.name));
    const botTbKeys = new Set(sortedTb.slice(-count20).map(item => item.id || item.name));

    const sortedM1 = [...filteredRank3TData].sort((a, b) => (b.tracham1 || 0) - (a.tracham1 || 0));
    const topM1Keys = new Set(sortedM1.slice(0, count20).map(item => item.id || item.name));
    const botM1Keys = new Set(sortedM1.slice(-count20).map(item => item.id || item.name));

    const sortedM2 = [...filteredRank3TData].sort((a, b) => (b.tracham2 || 0) - (a.tracham2 || 0));
    const topM2Keys = new Set(sortedM2.slice(0, count20).map(item => item.id || item.name));
    const botM2Keys = new Set(sortedM2.slice(-count20).map(item => item.id || item.name));

    const sortedM3 = [...filteredRank3TData].sort((a, b) => (b.tracham3 || 0) - (a.tracham3 || 0));
    const topM3Keys = new Set(sortedM3.slice(0, count20).map(item => item.id || item.name));
    const botM3Keys = new Set(sortedM3.slice(-count20).map(item => item.id || item.name));

    const stats: Record<string, { top: number; bot: number }> = {};

    filteredRank3TData.forEach(row => {
      const key = row.id || row.name;
      const top = topTbKeys.has(key) ? 1 : 0;
      const bot = botTbKeys.has(key) ? 1 : 0;
      stats[key] = { top, bot };
    });

    return { stats, sets: { topM1Keys, botM1Keys, topM2Keys, botM2Keys, topM3Keys, botM3Keys, topTbKeys, botTbKeys } };
  }, [filteredRank3TData]);

  const parsedKhaiThacRows = useMemo(() => {
    const parsed = parseKhaiThacData(tragopMatran);
    return parsed
      .filter((row: any) => {
        const matchingStaff = biRevenueData.find(staff => {
          const staffId = staff.fullId.toLowerCase().trim();
          const staffName = (staff.displayName.split('-').pop() || '').trim();
          const staffNameClean = removeAccents(staffName);
          const rowValClean = removeAccents(row.nhanVien);
          return rowValClean.includes(staffId) || 
                 rowValClean === staffNameClean ||
                 rowValClean.includes(staffNameClean) ||
                 staffNameClean.includes(rowValClean);
        });
        if (!matchingStaff) return false;
        if (!selectedStaffIds.includes(matchingStaff.fullId)) return false;

        // Filter by category
        if (khaiThacCategoryFilter !== 'ALL' && row.nhomHang !== khaiThacCategoryFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.dtlk - a.dtlk);
  }, [tragopMatran, selectedStaffIds, biRevenueData, parseKhaiThacData, khaiThacCategoryFilter]);

  const availableKhaiThacCategories = useMemo(() => {
    const parsed = parseKhaiThacData(tragopMatran);
    const categories = new Set<string>();
    parsed.forEach((row: any) => {
      if (row.nhomHang) {
        categories.add(row.nhomHang);
      }
    });
    return Array.from(categories);
  }, [tragopMatran, parseKhaiThacData]);

  // Load thuong data from DB when store or marketFilter changes
  useEffect(() => {
    if (!maKho) return;
    const shortMaKho = maKho.replace(/^0+/, '');
    const isAll = !marketFilter || marketFilter === 'ALL';
    
    let query = supabase.from('store').select('thuong_nv_data, selected_staff_ids');
    if (isAll) {
      query = query.or(`warehouse_code.eq.${shortMaKho},warehouse_code.eq.${maKho.trim()}`);
    } else {
      query = query.eq('id', normalizeStoreId(marketFilter.trim()));
    }

    query.then(({ data }: any) => {
      if (!data) {
        setThuongData({});
        return;
      }
      const records = Array.isArray(data) ? data : [data];
      const mergedThuong: Record<string, { truoc: string; hientai: string }> = {};
      
      records.forEach(r => {
        if (r.thuong_nv_data) {
          try {
            const parsed = typeof r.thuong_nv_data === 'string' ? JSON.parse(r.thuong_nv_data) : r.thuong_nv_data;
            if (parsed && typeof parsed === 'object') {
              Object.assign(mergedThuong, parsed);
            }
          } catch (e) {
            console.error('[THUONG] Parse error:', e);
          }
        }
      });
      
      setThuongData(mergedThuong);
      console.log('[THUONG] Loaded merged thuong_nv_data:', Object.keys(mergedThuong).length, 'staff');

      const firstWithIds = records.find(r => r.selected_staff_ids);
      if (firstWithIds?.selected_staff_ids) {
        try {
          const parsedIds = typeof firstWithIds.selected_staff_ids === 'string'
            ? JSON.parse(firstWithIds.selected_staff_ids)
            : firstWithIds.selected_staff_ids;
          if (Array.isArray(parsedIds)) {
            setSelectedStaffIds(parsedIds);
            initializedRef.current = `${shortMaKho}_${marketFilter}`;
          }
        } catch(e) {
          console.error('[EmployeeHealth] Parse selected_staff_ids error:', e);
        }
      }
    });
  }, [marketFilter, maKho]);

  // Listen to cross-origin sync hash data for Thưởng NV
  useEffect(() => {
    const handleHashSyncThuong = () => {
      if (typeof window === 'undefined' || !maKho) return;
      const hash = window.location.hash;
      if (!hash.startsWith('#sync_thuong=')) return;

      try {
        const rawData = hash.replace('#sync_thuong=', '');
        const decoded = decodeURIComponent(atob(rawData));
        const payload = JSON.parse(decoded);

        if (payload && payload.thuongMap) {
          const storeName = marketFilter !== 'ALL' ? marketFilter : 'siêu thị';
          const confirmSync = window.confirm(
            `Phát hiện dữ liệu thưởng nhân viên từ TGDD cho ${storeName} (${Object.keys(payload.thuongMap).length} nhân sự).\n\nBạn có đồng ý đồng bộ dữ liệu này vào CỘT THƯỞNG HIỆN TẠI không?`
          );

          if (confirmSync) {
            setThuongData(prev => {
              const updated = { ...prev };
              Object.keys(payload.thuongMap).forEach(key => {
                const upperKey = key.toUpperCase().trim();
                if (!updated[upperKey]) {
                  updated[upperKey] = { truoc: '', hientai: '' };
                }
                updated[upperKey].hientai = String(payload.thuongMap[key]);
              });

              // Save to database
              saveThuongToDb(updated);
              return updated;
            });

            // Switch to THƯỞNG NV tab
            setActiveTab('THUONG_NV');
          }
        }
      } catch (err) {
        console.error('Error parsing sync_thuong hash data:', err);
        alert('Lỗi giải mã dữ liệu đồng bộ thưởng!');
      } finally {
        // Clear URL hash
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    const timer = setTimeout(handleHashSyncThuong, 800);
    return () => clearTimeout(timer);
  }, [marketFilter, maKho]);

  // Listen for background sync responses from Tampermonkey script
  useEffect(() => {
    const handleTampermonkeyResponse = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      
      if (payload && payload.items) {
        setThuongData(prev => {
          const next = { ...prev };
          let count = 0;
          
          filteredBiData.forEach(staff => {
            const staffIdMatch = staff.fullId.match(/\d+/);
            if (staffIdMatch) {
              const numericId = staffIdMatch[0];
              const matchedItem = payload.items.find((item: any) => item.maNhanVien === numericId);
              if (matchedItem) {
                next[staff.fullId] = {
                  ...(next[staff.fullId] || { truoc: '' }),
                  hientai: matchedItem.soTien
                };
                count++;
              }
            }
          });
          
          saveThuongToDb(next);
          showNotification(`Đã tự động đồng bộ ngầm thưởng của ${count} nhân sự thành công!`, 'success');
          return next;
        });
      }
    };

    document.addEventListener('CRM_SYNC_THUONG_RESPONSE', handleTampermonkeyResponse);
    return () => document.removeEventListener('CRM_SYNC_THUONG_RESPONSE', handleTampermonkeyResponse);
  }, [filteredBiData]);



  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds(prev => {
      const updated = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      saveStaffIdsToDb(updated);
      return updated;
    });
  };


  const handleCapture = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureRef.current);
      setPreviewImage(dataUrl);
    } catch (error) {
      console.error('Error capturing element:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const generateDoanhThuNvComment = useCallback((tmpl: 1 | 2 | 3): string => {
    if (filteredBiData.length === 0) return '';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN');
    const nowHeader = `${timeStr} NGÀY ${dateStr}`;

    const targetQdPerStaff = filteredBiData.length > 0 ? stTargetSauHeSo / filteredBiData.length : 0;

    const staffStats = filteredBiData.map(staff => {
      const actualTargetQdPerStaff = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
      const actualActualVal = Math.abs(staff.actualVal || 0) > 1000000 ? (staff.actualVal || 0) : (staff.actualVal || 0) * 1000000;
      const percentHT = (actualTargetQdPerStaff > 0 && daysPassed > 0)
        ? (((actualActualVal / daysPassed) * totalDays) / actualTargetQdPerStaff) * 100
        : 0;
      const staffId = staff.fullId?.match(/\d+/) ? staff.fullId.match(/\d+/)![0] : staff.fullId;
      return {
        id: staffId,
        fullName: staff.displayName,
        actualVal: staff.actualVal || 0,
        virtualVal: staff.virtualVal || 0,
        percentHT
      };
    });

    const sortedStaffs = [...staffStats].sort((a, b) => (b.actualVal || 0) - (a.actualVal || 0));
    const count = Math.max(1, Math.min(3, Math.round(sortedStaffs.length * 0.2)));
    const topStaffs = sortedStaffs.slice(0, count);
    const botStaffs = sortedStaffs.length > count ? sortedStaffs.slice(-count) : [];
    const staffAbove50 = sortedStaffs.filter(s => s.percentHT >= 50).length;

    if (tmpl === 1) {
      let t1 = `📊 TỔNG HỢP THI ĐUA SIÊU THỊ - ${nowHeader}\n`;
      t1 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      t1 += `📈 KẾT QUẢ TỔNG QUAN:\n`;
      t1 += `🎯 Tổng NV: ${sortedStaffs.length} || ĐẠT trên 50%: ${staffAbove50}/${sortedStaffs.length}\n\n`;

      if (topStaffs.length > 0) {
        t1 += `🏆 TOP ${topStaffs.length} DẪN ĐẦU:\n`;
        topStaffs.forEach((s, idx) => {
          t1 += `🔺 #${idx + 1}. @${s.id}\n`;
        });
        t1 += `\n`;
      }

      if (botStaffs.length > 0) {
        t1 += `⚠️ BOTTOM ${botStaffs.length} CẦN TĂNG TỐC:\n`;
        botStaffs.forEach((s, idx) => {
          t1 += `🔻 #${sortedStaffs.length - botStaffs.length + idx + 1}. @${s.id}\n`;
        });
        t1 += `\n`;
      }

      t1 += `💪 Toàn đội cùng nhau bứt phá về đích ngoạn mục nhé! 🔥`;
      return t1;
    } else if (tmpl === 2) {
      let t2 = `⚠️ DANH SÁCH NHÂN SỰ CẦN TĂNG TỐC DOANH THU - ${nowHeader}\n`;
      t2 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      t2 += `📊 Tiến độ siêu thị (TGSD: ${daysPassed}/${totalDays} ngày)\n\n`;
      t2 += `🚨 NHÂN VIÊN CẦN BỨT PHÁ (%HT < 100%):\n`;
      const notDoneStaffs = sortedStaffs.filter(s => s.percentHT < 100);
      if (notDoneStaffs.length > 0) {
        notDoneStaffs.forEach(s => {
          t2 += `• @${s.id}\n`;
        });
      } else {
        t2 += `🎉 Tất cả nhân viên đều đạt trên 100% kế hoạch!\n`;
      }
      t2 += `\n🔥 Cố gắng tăng tốc tư vấn và bứt phá doanh số nhé!`;
      return t2;
    } else {
      let t3 = `⚡ TÓM TẮT XẾP HẠNG DOANH THU NHÂN VIÊN\n`;
      t3 += `📅 TGSD: ${daysPassed}/${totalDays} ngày || 👥 Tổng NV: ${sortedStaffs.length}\n`;
      t3 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      t3 += `🎯 Tỉ lệ hoàn thành trên 50%: ${staffAbove50}/${sortedStaffs.length} NV\n`;
      if (sortedStaffs[0]) {
        t3 += `🥇 Dẫn đầu: @${sortedStaffs[0].id} (${sortedStaffs[0].percentHT.toFixed(1)}% HT - ${formatCurrencyValue(sortedStaffs[0].actualVal)})\n`;
      }
      if (topStaffs.length > 0) {
        t3 += `🎯 Top: ${topStaffs.map(s => `@${s.id}`).join(', ')}\n`;
      }
      if (botStaffs.length > 0) {
        t3 += `⚠️ Cần hỗ trợ: ${botStaffs.map(s => `@${s.id}`).join(', ')}\n`;
      }
      t3 += `🚀 Quyết tâm hoàn thành 100% mục tiêu!`;
      return t3;
    }
  }, [filteredBiData, stTargetSauHeSo, daysPassed, totalDays]);

  const handleOpenDoanhThuNvComment = useCallback(() => {
    const initialText = generateDoanhThuNvComment(1);
    setCommentModal({
      isOpen: true,
      title: 'Nhận xét thi đua',
      template: 1,
      text: initialText,
      tabs: [
        { id: 1, label: 'Mẫu 1: TOP/BOT NV', icon: '🏆' },
        { id: 2, label: 'Mẫu 2: DS Cần tăng tốc', icon: '⚠️' },
        { id: 3, label: 'Mẫu 3: Tóm tắt', icon: '⚡' },
      ],
      generator: generateDoanhThuNvComment,
    });
  }, [generateDoanhThuNvComment]);

  const handleCopyTags = () => {
    if (filteredBiData.length === 0) return;

    const targetQdPerStaff = filteredBiData.length > 0 ? stTargetSauHeSo / filteredBiData.length : 0;

    const staffStats = filteredBiData.map(staff => {
      const actualTargetQdPerStaff = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
      const actualActualVal = Math.abs(staff.actualVal || 0) > 1000000 ? (staff.actualVal || 0) : (staff.actualVal || 0) * 1000000;
      const percentHT = (actualTargetQdPerStaff > 0 && daysPassed > 0)
        ? (((actualActualVal / daysPassed) * totalDays) / actualTargetQdPerStaff) * 100
        : 0;

      return {
        fullName: staff.displayName,
        percentHT
      };
    });

    const botStaffs = staffStats.filter(s => s.percentHT < 100);

    const tags = botStaffs.map(s => {
      // Find the ID, which is typically the numeric part separated by a dash or just the first number sequence.
      // Usually format is "PHẠM NGỌC ANH - 58638" or "58638 - PHẠM NGỌC ANH"
      const parts = s.fullName.split('-');
      if (parts.length > 1) {
        // Find the part that is purely numeric (or has the 5+ digit ID)
        const potentialId = parts.find(p => /\d{4,}/.test(p));
        if (potentialId) {
          const match = potentialId.match(/\d{4,}/);
          if (match) return `@${match[0]}`;
        }
      }
      
      const fallbackMatch = s.fullName.match(/\d{4,}/);
      if (fallbackMatch) return `@${fallbackMatch[0]}`;
      
      return '';
    }).filter(t => t !== '').join('\n');

    if (!tags) {
      showNotification('Không có nhân viên nào dưới 100% hoặc không tìm thấy mã NV', 'warning');
      return;
    }

    const clipboardText = `🚨 NHÂN VIÊN CÓ TỶ LỆ HOÀN THÀNH DƯỚI 100% :\n${tags}`;

    navigator.clipboard.writeText(clipboardText).then(() => {
      setIsTagCopied(true);
      showNotification('Đã copy tag nhân viên vào clipboard!', 'success');
      setTimeout(() => setIsTagCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy tags: ', err);
      showNotification('Không thể copy. Vui lòng thử lại.', 'error');
    });
  };



  const renderLoadingOverlay = () => {
    if (!isDataLoading) return null;
    return (
      <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden z-[60] rounded-t-[32px]">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            ease: "easeInOut"
          }}
          style={{ width: '50%' }}
        />
      </div>
    );
  };

  const menuItems = [
    { id: 'DOANH_THU', label: 'DOANH THU NV', icon: TrendingUp },
    { id: 'TONG_HOP_NV', label: 'TỔNG HỢP NV', icon: LayoutGrid },
    { id: 'CHI_TIET', label: 'CHI TIẾT NV', icon: Search },
    { id: 'THI_DUA', label: 'TH THI ĐUA', icon: Check },
    { id: 'NGANH_HANG', label: 'CT NGÀNH HÀNG', icon: HeartPulse },
    { id: 'PHUC_VU', label: 'PHỤC VỤ', icon: Users },
    { id: 'BAN_KEM_NV', label: 'BÁN KÈM NV', icon: MessageSquare },
    { id: 'THUONG_NV', label: 'THƯỞNG NV', icon: Gift },
    { id: 'TRA_CHAM_NV', label: 'TRẢ CHẬM NV', icon: Clock },
    { id: 'RANK_3T_NV', label: 'XẾP HẠNG NV 3T', icon: Trophy },
    { id: 'GIA_TRI_DH', label: 'GIÁ TRỊ ĐƠN HÀNG', icon: FileText },
  ];

  const renderStaffFilterDropdown = () => (
    <div className="relative z-50" ref={filterRef}>
      <button
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
      >
        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
        <span className="truncate uppercase tracking-tight">
          {selectedStaffIds.length === biRevenueData.length
            ? "Tất cả nhân viên"
            : selectedStaffIds.length === 0
              ? "Chưa chọn NV"
              : `Đã chọn ${selectedStaffIds.length} NV`}
        </span>
        <ChevronDown size={16} className={cn("transition-transform text-slate-400", isFilterOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
          >
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nhanh..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              <div className="flex items-center justify-between px-3 mb-2.5">
                <button
                  onClick={() => {
                    const allIds = biRevenueData.map(s => s.fullId);
                    setSelectedStaffIds(allIds);
                    saveStaffIdsToDb(allIds);
                  }}
                  className="text-xs font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={() => {
                    setSelectedStaffIds([]);
                    saveStaffIdsToDb([]);
                  }}
                  className="text-xs font-black uppercase text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              </div>

              {biRevenueData.filter(s =>
                s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.fullId.toLowerCase().includes(searchTerm.toLowerCase())
              ).sort((a, b) => {
                const aSelected = selectedStaffIds.includes(a.fullId) ? 1 : 0;
                const bSelected = selectedStaffIds.includes(b.fullId) ? 1 : 0;
                if (aSelected !== bSelected) return bSelected - aSelected;
                return a.displayName.localeCompare(b.displayName);
              }).map(staff => (
                <label
                  key={staff.fullId}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                >
                  <div className={cn(
                    "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                    selectedStaffIds.includes(staff.fullId)
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-slate-200 group-hover:border-slate-300 bg-white"
                  )}>
                    {selectedStaffIds.includes(staff.fullId) && <Check size={11} className="text-white stroke-[3px]" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedStaffIds.includes(staff.fullId)}
                    onChange={() => toggleStaffSelection(staff.fullId)}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-[13px] font-black text-slate-800 uppercase leading-tight">{staff.displayName}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{staff.fullId}</span>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const parsedNhcStaffRows = useMemo(() => {
    const nhcRows: { name: string; dtThuc: number; dtqd: number; hieuQuaQD: number | null }[] = [];
    if (nganhhangChinhNv) {
      const lines = nganhhangChinhNv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length < 3) continue;
        const name = cols[0];
        if (!name || name.toLowerCase().startsWith('tổng') || name.toLowerCase().startsWith('total')) continue;
        const dtThuc = parseFloat(cols[1].replace(/,/g, '')) || 0;
        const dtqd = parseFloat(cols[2].replace(/,/g, '')) || 0;
        const hieuQuaQD = cols.length >= 4 ? (parseFloat(cols[3].replace(/,/g, '').replace(/%/g, '')) || null) : null;
        nhcRows.push({ name, dtThuc, dtqd, hieuQuaQD });
      }
    }
    return nhcRows;
  }, [nganhhangChinhNv]);

  // Pre-calculate comparison staff list and detail categories for Head-to-Head Arena
  const { comparisonStaffList, detailComparisonCategories } = useMemo(() => {
    if (!biRevenueData || biRevenueData.length === 0) {
      return { comparisonStaffList: [], detailComparisonCategories: [] };
    }

    const matrixRes = parseStaffMatrixDataRefined(
      thiDuaNv || '',
      filteredBiData.length > 0 ? filteredBiData.length : 1,
      categoryTargets || [],
      (processedData?.categories || []).filter((c: any) => isCategoryForMarket(c, marketFilter)),
      daysPassed || 1,
      totalDays || 30
    );
    const staffMatrix = matrixRes?.staffMatrix || [];
    const detailCategories = matrixRes?.categories || [];
    const parsedNhcRows = parsedNhcStaffRows;

    const list: StaffComparisonData[] = biRevenueData.map((staff, idx) => {
      const targetQdPerStaff = filteredBiData.length > 0 ? stTargetSauHeSo / filteredBiData.length : 0;
      const actualTargetQd = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
      const staffActualVal = staff.actualVal || 0;
      const actualDtqd = Math.abs(staffActualVal) > 1000000 ? staffActualVal : staffActualVal * 1000000;
      const staffPercentHT = (actualTargetQd > 0 && daysPassed > 0)
        ? (((actualDtqd / daysPassed) * totalDays) / actualTargetQd) * 100
        : 0;

      const staffBonusHientai = (() => {
        const hientai = thuongData[staff.fullId]?.hientai || '';
        const res = parseBonusData(hientai, staff, marketFilter);
        return res.tong;
      })();

      const staffTraChamRow = (parsedTraChamRows || []).find(row => {
        const staffId = staff.fullId.toLowerCase().trim();
        const staffName = (staff.displayName.split('-').pop() || '').trim();
        const staffNameClean = removeAccents(staffName);
        const rowValClean = removeAccents(row.nhanVien);
        return rowValClean.includes(staffId) ||
               rowValClean === staffNameClean ||
               rowValClean.includes(staffNameClean) ||
               staffNameClean.includes(rowValClean);
      });
      const staffInstallmentPercent = staffTraChamRow ? staffTraChamRow.percent : null;

      const staffNhcRow = parsedNhcRows.find(row => {
        const staffId = staff.fullId.toLowerCase().trim();
        const staffName = (staff.displayName.split('-').pop() || '').trim();
        const staffNameClean = removeAccents(staffName);
        const rowValClean = removeAccents(row.name);
        return rowValClean.includes(staffId) ||
               rowValClean === staffNameClean ||
               rowValClean.includes(staffNameClean) ||
               staffNameClean.includes(rowValClean);
      });

      const effQd = (staff.effVal !== 0
        ? (staff.effVal > 5 ? staff.effVal : staff.effVal * 100)
        : ((staff.actualVal || 0) > 0
          ? (((staff.virtualVal - (staff.actualVal || 0)) / (staff.actualVal || 0)) * 100)
          : 0));

      const staffHieuQuaQd = (staffNhcRow && staffNhcRow.hieuQuaQD !== null && staffNhcRow.hieuQuaQD !== undefined)
        ? staffNhcRow.hieuQuaQD
        : effQd;

      const matrixStaff = (staffMatrix || []).find(s => s?.fullId === staff.fullId);
      const rawMatrixValues = matrixStaff ? matrixStaff.rawValues : [];

      const cleanName = staff.displayName.split(' - ').pop() || staff.displayName;

      return {
        fullId: staff.fullId,
        displayName: staff.displayName,
        cleanName,
        rank: idx + 1,
        targetQd: actualTargetQd / 1000000,
        actualDtqd: actualDtqd / 1000000,
        percentHT: staffPercentHT,
        hieuQuaQd: staffHieuQuaQd,
        bonusHientai: staffBonusHientai,
        installmentPercent: staffInstallmentPercent,
        rawMatrixValues,
      };
    });

    return { comparisonStaffList: list, detailComparisonCategories: detailCategories };
  }, [biRevenueData, filteredBiData, thiDuaNv, categoryTargets, processedData.categories, marketFilter, daysPassed, totalDays, stTargetSauHeSo, thuongData, parsedTraChamRows, nganhhangChinhNv]);

  return (
    <div className="w-full min-h-screen bg-slate-50 overflow-x-hidden font-sans" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      <main className="flex-1 overflow-auto relative bg-slate-50/50">
        <div className="p-2.5 sm:p-5 lg:p-6 w-full min-h-full">
          
          {/* V2 Gradient Top Header Banner */}
          <div className="relative z-30 bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-lg sm:shadow-xl shadow-slate-200/30 p-3.5 sm:p-5 mb-4 sm:mb-6">
            {/* Top brand gradient highlight strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] rounded-t-2xl sm:rounded-t-3xl" />
            
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Top Deck: Branding + Staff & Store Info + Live Sync & Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-2.5 sm:pb-3 border-b border-slate-100">
                {/* Left: Branding & Module Title */}
                <div className="flex items-center gap-2.5 sm:gap-3.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#2563EB] via-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                    <HeartPulse size={22} className="sm:w-[26px] sm:h-[26px]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-xl md:text-2xl font-black bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent uppercase tracking-tight leading-tight">Sức Khỏe Nhân Viên</h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-emerald-700 text-[10px] sm:text-xs font-black rounded-full uppercase tracking-wider shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Realtime
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-slate-500 truncate max-w-[280px] sm:max-w-none">Hệ thống phân tích hiệu suất & thi đua siêu thị</p>
                  </div>
                </div>

                {/* Middle/Right: Quick Filters & System Status Badges */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
                  {/* Staff Multi-Select Filter */}
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/90 rounded-full pl-2.5 sm:pl-3.5 pr-1 py-1 shadow-2xs">
                    <span className="font-black text-slate-600 uppercase tracking-wider text-[10px] sm:text-xs">NHÂN VIÊN:</span>
                    {renderStaffFilterDropdown()}
                  </div>

                  {/* Warehouse Badge */}
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-50 border border-slate-200/90 rounded-full shadow-2xs">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">MÃ KHO:</span>
                    <span className="font-black text-[#2563EB] text-xs sm:text-sm">{maKho || 'CHƯA CHỌN'}</span>
                  </div>

                  {/* Live Clock / Update Indicator */}
                  <LiveClockBadge />

                  {/* Refresh Button */}
                  <button
                    onClick={() => {
                      refresh();
                      showNotification('Đang làm mới dữ liệu Sức Khỏe NV...', 'info');
                    }}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white rounded-full text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 cursor-pointer transition-all active:scale-95 ml-auto sm:ml-0"
                  >
                    <RotateCcw size={14} className="sm:w-[15px] sm:h-[15px]" />
                    <span>Cập nhật</span>
                  </button>
                </div>
              </div>

              {/* Bottom Deck: Segmented Tab Bar Navigation — Mobile only */}
              <div className="md:hidden w-full overflow-hidden">
                <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-100/80 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar shadow-inner">
                  {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-[13px] font-black uppercase tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-500/25 scale-[1.02] border border-indigo-400/30'
                            : 'bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200/60 hover:shadow-2xs'
                        }`}
                      >
                        <Icon size={14} className={cn("sm:w-4 sm:h-4", isActive ? 'text-white' : 'text-slate-500')} strokeWidth={isActive ? 2.5 : 2} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-10">
            {pageMaintenanceState[`health_${activeTab}`] && !isUser43751Local ? (
              <div className="flex items-center justify-center h-full p-6 mt-12">
                <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
                  <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                    <AlertCircle size={48} />
                  </div>
                  <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">HỆ THỐNG ĐANG BẢO TRÌ</h1>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Tab này đang trong quá trình bảo trì và nâng cấp. Xin lỗi vì sự bất tiện này!
                  </p>
                </div>
              </div>
            ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'DOANH_THU' && (
                <motion.div
                  key="DOANH_THU"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/95 backdrop-blur-sm rounded-3xl p-3 sm:p-5 shadow-xl shadow-slate-200/30 border border-slate-200/90 max-w-full mx-auto relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 mb-4">
                      <button
                        onClick={handleCapture}
                        disabled={isCapturing}
                         className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer",
                          isCapturing
                            ? "bg-slate-400 text-white cursor-wait"
                            : "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white hover:from-[#1D4ED8] hover:to-[#4338CA] shadow-blue-500/20 border-t border-white/20"
                        )}
                      >
                        {isCapturing ? (
                          <div className="relative w-4 h-4 flex items-center justify-center">
                            <div className="absolute inset-0 border-2 border-white/20 rounded-full" />
                            <motion.div
                              className="absolute inset-0 border-2 border-white rounded-full border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                        ) : (
                          <Camera size={15} />
                        )}
                        {isCapturing ? 'ĐANG XUẤT...' : 'XUẤT ẢNH BÁO CÁO'}
                      </button>

                       <button
                        onClick={handleOpenDoanhThuNvComment}
                        disabled={filteredBiData.length === 0}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer",
                          filteredBiData.length === 0
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30"
                        )}
                        title="Nhận xét thi đua xếp hạng doanh thu"
                      >
                        <MessageSquare size={14} className="text-white shrink-0" />
                        <span>NHẬN XÉT</span>
                      </button>

                      <button
                        onClick={handleCopyTags}
                        disabled={filteredBiData.length === 0}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer",
                          filteredBiData.length === 0
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : isTagCopied
                              ? "bg-emerald-600 text-white shadow-emerald-200/50"
                              : "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-purple-200/50 border-t border-white/20"
                        )}
                      >
                        {isTagCopied ? (
                          <Check size={16} />
                        ) : (
                          <span className="text-[14px]">@</span>
                        )}
                        {isTagCopied ? 'ĐÃ COPY!' : 'TAG TÊN NV'}
                      </button>
                  </div>

                  <div ref={captureRef}>
                    <RevenueRankingTableQd
                      data={filteredBiData}
                      onCapture={handleCapture}
                      stTargetQuyDoi={stTargetSauHeSo}
                      daysPassed={daysPassed}
                      totalDays={totalDays}
                      stPercentHTTargetDuKienQD={marketPercentQD}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'TONG_HOP_NV' && (
                <motion.div
                  key="TONG_HOP_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-2 md:p-4 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  <TongHopNvTable
                    biRevenueData={biRevenueData}
                    filteredBiData={filteredBiData}
                    thiDuaNv={thiDuaNv}
                    tragopNv={tragopNv}
                    selectedStaffIds={selectedStaffIds}
                    staffCount={selectedStaffIds.length}
                    daysPassed={daysPassed}
                    totalDays={totalDays}
                    stTargetSauHeSo={stTargetSauHeSo}
                    categoryTargets={categoryTargets}
                    luykeCategories={processedData.categories.filter((c: any) => isCategoryForMarket(c, marketFilter))}
                    marketFilter={marketFilter}
                    storeName={marketFilter !== 'ALL' ? marketFilter : ''}
                  />
                </motion.div>
              )}

              {activeTab === 'CHI_TIET' && (
                <motion.div
                  key="CHI_TIET"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-2 md:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto space-y-6 relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  {/* Export & Compare Actions Toolbar */}
                  {selectedStaffIds.length > 0 && (
                    <div className="flex items-center justify-end gap-3 my-4 flex-wrap">
                      {/* BUTTON SO SÁNH NV XỊN XÒ NHẤT */}
                      <button
                        onClick={() => {
                          if (comparisonStaffList.length >= 2) {
                            if (!compareStaffAId) setCompareStaffAId(comparisonStaffList[0].fullId);
                            if (!compareStaffBId) setCompareStaffBId(comparisonStaffList[1].fullId);
                          }
                          setIsCompareOpen(true);
                        }}
                        disabled={comparisonStaffList.length < 2}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-orange-500/25 border border-amber-300/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Mở bảng so sánh & đối đầu trực tiếp 2 nhân viên"
                      >
                        <Swords size={16} />
                        <span>SO SÁNH NV</span>
                      </button>

                      {/* BUTTON XUẤT ALL NV */}
                      <button
                        disabled={isCapturing}
                        onClick={handleExportAllStaffDetails}
                        className={cn(
                          "relative overflow-hidden flex items-center gap-2 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer",
                          isCapturing 
                            ? "bg-slate-800 cursor-not-allowed text-white/95 ring-2 ring-indigo-400/50 shadow-indigo-500/30" 
                            : "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] shadow-indigo-500/20"
                        )}
                        title="Xuất trọn bộ file ZIP chứa tất cả ảnh Chi tiết nhân viên"
                      >
                        {batchExportProgress ? (
                          <>
                            <Loader2 size={15} className="animate-spin text-amber-300 shrink-0" />
                            <span className="font-mono tracking-normal">
                              ĐANG XUẤT {batchExportProgress.current}/{batchExportProgress.total} NV ({batchExportProgress.percent}%)
                            </span>
                            {/* Animated progress bar fill */}
                            <div 
                              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 transition-all duration-200" 
                              style={{ width: `${batchExportProgress.percent}%` }}
                            />
                          </>
                        ) : (
                          <>
                            <Camera size={15} />
                            <span>XUẤT ALL NV ({selectedStaffIds.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Employee Detail Table Section */}
                  {selectedStaffIds.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                      {selectedStaffIds.map((id, idx) => {
                        const staff = biRevenueData.find(s => s.fullId === id);
                        if (!staff) return null;
                        const targetQdPerStaff = filteredBiData.length > 0 ? stTargetSauHeSo / filteredBiData.length : 0;
                        const actualTargetQd = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
                        const staffActualVal = staff.actualVal || 0;
                        const actualDtqd = Math.abs(staffActualVal) > 1000000 ? staffActualVal : staffActualVal * 1000000;
                        const staffPercentHT = (actualTargetQd > 0 && daysPassed > 0)
                          ? (((actualDtqd / daysPassed) * totalDays) / actualTargetQd) * 100
                          : 0;
                        const staffBonusHientai = (() => {
                           const hientai = thuongData[staff.fullId]?.hientai || '';
                           const res = parseBonusData(hientai, staff, marketFilter);
                           return res.tong;
                         })();

                        const staffTraChamRow = parsedTraChamRows.find(row => {
                          const staffId = staff.fullId.toLowerCase().trim();
                          const staffName = (staff.displayName.split('-').pop() || '').trim();
                          const staffNameClean = removeAccents(staffName);
                          const rowValClean = removeAccents(row.nhanVien);
                          return rowValClean.includes(staffId) || 
                                 rowValClean === staffNameClean ||
                                 rowValClean.includes(staffNameClean) ||
                                 staffNameClean.includes(rowValClean);
                        });
                        const staffInstallmentPercent = staffTraChamRow ? staffTraChamRow.percent : null;

                        const staffNhcRow = parsedNhcStaffRows.find(row => {
                          const staffId = staff.fullId.toLowerCase().trim();
                          const staffName = (staff.displayName.split('-').pop() || '').trim();
                          const staffNameClean = removeAccents(staffName);
                          const rowValClean = removeAccents(row.name);
                          return rowValClean.includes(staffId) || 
                                 rowValClean === staffNameClean ||
                                 rowValClean.includes(staffNameClean) ||
                                 staffNameClean.includes(rowValClean);
                        });

                        // Hiệu quả QĐ: Đồng bộ trực tiếp từ Bảng Doanh Thu NV (Bảng Xếp Hạng Doanh Thu)
                        const effQd = (staff.effVal !== 0 
                          ? (staff.effVal > 5 ? staff.effVal : staff.effVal * 100)
                          : ((staff.actualVal || 0) > 0 
                            ? (((staff.virtualVal - (staff.actualVal || 0)) / (staff.actualVal || 0)) * 100) 
                            : 0));

                        const staffHieuQuaQd = (staffNhcRow && staffNhcRow.hieuQuaQD !== null && staffNhcRow.hieuQuaQD !== undefined)
                          ? staffNhcRow.hieuQuaQD
                          : effQd;

                        return (
                          <motion.div
                            key={`detail-${id}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (idx * 0.05) }}
                          >
                            <EmployeeDetailTable
                              staffName={`${staff.displayName.split(' - ').pop()} - ${staff.fullId}`}
                              luyKeNganhHang={luyKeNganhHang}
                              thiDuaNv={thiDuaNv}
                              staffCount={selectedStaffIds.length}
                              daysPassed={daysPassed}
                              totalDays={totalDays}
                              categoryTargets={categoryTargets}
                              luykeCategories={processedData.categories.filter((c: any) => isCategoryForMarket(c, marketFilter))}
                              staffTargetQd={targetQdPerStaff}
                              staffDtqd={staffActualVal}
                              staffPercentHT={staffPercentHT}
                              staffHieuQuaQd={staffHieuQuaQd}
                              staffBonusHientai={staffBonusHientai}
                              staffInstallmentPercent={staffInstallmentPercent}
                              onPreviewImage={setPreviewImage}
                              onOpenCompare={(targetStaffId) => {
                                setCompareStaffAId(targetStaffId);
                                const otherStaff = comparisonStaffList.find(s => s.fullId !== targetStaffId);
                                if (otherStaff) {
                                  setCompareStaffBId(otherStaff.fullId);
                                }
                                setIsCompareOpen(true);
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
                      <Search size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">CHỌN NHÂN VIÊN ĐỂ XEM CHI TIẾT</h3>
                      <p className="text-slate-400 text-sm font-medium">Sử dụng bộ lọc phía trên để chọn nhân viên bạn muốn xem bảng "Chi tiết nhân viên"</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'THI_DUA' && (
                <motion.div
                  key="THI_DUA"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="relative overflow-hidden rounded-[16px]"
                >
                  {renderLoadingOverlay()}
                  <SummaryThiDuaTable
                    luyKeNganhHang={luyKeNganhHang}
                    thiDuaNv={thiDuaNv}
                    staffCount={selectedStaffIds.length}
                    daysPassed={daysPassed}
                    totalDays={totalDays}
                    selectedStaffIds={selectedStaffIds}
                    categoryTargets={categoryTargets}
                    luykeCategories={processedData.categories.filter((c: any) => isCategoryForMarket(c, marketFilter))}
                    categoryConfig={categoryConfig}
                  />
                </motion.div>
              )}

              {activeTab === 'NGANH_HANG' && (
                <motion.div
                  key="NGANH_HANG"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-[calc(100%-1px)] mx-auto relative overflow-hidden rounded-[16px]"
                >
                  {renderLoadingOverlay()}
                  <CategoryDetailByStaffTable
                    luyKeNganhHang={luyKeNganhHang}
                    thiDuaNv={thiDuaNv}
                    staffCount={selectedStaffIds.length}
                    daysPassed={daysPassed}
                    totalDays={totalDays}
                    categoryTargets={categoryTargets}
                    selectedStaffIds={selectedStaffIds}
                    luykeCategories={processedData.categories.filter((c: any) => isCategoryForMarket(c, marketFilter))}
                    categoryConfig={categoryConfig}
                  />
                </motion.div>
              )}

              {activeTab === 'PHUC_VU' && (
                <motion.div
                  key="PHUC_VU"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  {/* 
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                    <Users size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">BÁO CÁO PHỤC VỤ</h2>
                  */}
                  {!phucVu && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 w-full max-w-md mt-6">
                      <p className="text-amber-700 font-bold text-sm mb-2">Chưa có dữ liệu Phục vụ!</p>
                      <p className="text-amber-600 text-xs">Vui lòng tải file dữ liệu Phục vụ tại tab <b>Khai Báo &gt; Cấu Hình Siêu Thị &gt; Dữ Liệu Nguồn &gt; TRẢ GÓP & CHI TIẾT NH</b> để hiển thị báo cáo.</p>
                    </div>
                  )}

                  {phucVu && (() => {
                    const lines = phucVu.split('\n').filter(l => l.trim() !== '');
                    const headerIdx = lines.findIndex(l => l.toUpperCase().includes('5 SAO') && l.includes('\t'));
                    if (headerIdx === -1) return null; // Could not find header row
                    
                    const allHeaders = lines[headerIdx].split('\t');
                    const excludedColumns = [
                      'Tổng điểm KH đánh giá NV',
                      'Tổng SL ĐH gửi khảo sát (đã gửi hoặc KH đã quét QR)',
                      'Tổng ĐH KH đánh giá NV',
                      'Tỉ Lệ tiếp cận thành công',
                      'Điểm KH hài lòng của NV (tạm tính)',
                      'STT',
                      'MIỀN',
                      'CÔNG TY',
                      'MIEN',
                      'CONG TY'
                    ];

                    const visibleIndices = allHeaders
                      .map((h, i) => {
                        const headerText = h.trim().toUpperCase();
                        const isExcluded = excludedColumns.some(excluded =>
                          excluded.toUpperCase() === headerText
                        );
                        return isExcluded ? -1 : i;
                      })
                      .filter(i => i !== -1);

                    const rows = lines.slice(headerIdx + 1).filter(l => {
                      const parts = l.split('\t');
                      // Only keep rows that look like employee data (has ID or enough columns)
                      if (parts.length < 5) return false;
                      return /^(\d{4,6})\s*-/.test(parts[0]) || parts.length >= allHeaders.length - 2;
                    });

                    // Sorting by '5 SAO' descending
                    const colIndex5Sao = allHeaders.findIndex(h => h.trim().toUpperCase().includes('5 SAO'));
                    let sortedRows = [...rows];
                    if (colIndex5Sao !== -1) {
                      sortedRows.sort((a, b) => {
                        const cellA = a.split('\t')[colIndex5Sao] || '0';
                        const cellB = b.split('\t')[colIndex5Sao] || '0';
                        const valA = parseFloat(cellA.replace(/[^0-9.-]+/g, "")) || 0;
                        const valB = parseFloat(cellB.replace(/[^0-9.-]+/g, "")) || 0;
                        return valB - valA;
                      });
                    }

                    const totalRows = sortedRows.length;
                    const topLimit = Math.ceil(totalRows * 0.2);
                    const botLimit = Math.ceil(totalRows * 0.2);
                    const yesterdayObj = new Date();
                    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
                    const today = yesterdayObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

                    const startIndex5Sao = visibleIndices.findIndex(idx =>
                      allHeaders[idx].trim().toUpperCase().includes('5 SAO')
                    );

                    const generatePhucVuComment = (tmpl: 1 | 2 | 3): string => {
                      if (sortedRows.length === 0) return '';
                      const total = sortedRows.length;
                      const count20 = Math.max(1, Math.ceil(total * 0.2));

                      const getStaffInfo = (rowLine: string) => {
                        const cells = rowLine.split('\t');
                        const uIdx = visibleIndices.find(idx => {
                          const h = allHeaders[idx].trim().toUpperCase();
                          return h.includes('USER') || h.includes('MÃ NV');
                        });
                        const tIdx = visibleIndices.find(idx => {
                          const h = allHeaders[idx].trim().toUpperCase();
                          return h.includes('TÊN') || h.includes('TEN');
                        });
                        const s5Idx = allHeaders.findIndex(h => h.trim().toUpperCase().includes('5 SAO'));
                        const scIdx = allHeaders.findIndex(h => h.trim().toUpperCase().includes('ĐIỂM KH HÀI LÒNG'));

                        const rawId = uIdx !== undefined ? (cells[uIdx] || '').trim() : '';
                        const name = tIdx !== undefined ? (cells[tIdx] || '').trim() : '';
                        const id = rawId.match(/\d{4,6}/)?.[0] || (name.match(/\d{4,6}/)?.[0] || rawId || name);
                        const star5 = s5Idx !== -1 ? (cells[s5Idx] || '0').trim() : '0';
                        let score = scIdx !== -1 ? (cells[scIdx] || '0').trim() : '0';
                        const numScore = parseFloat(score);
                        if (!isNaN(numScore)) score = (Math.floor(numScore * 10) / 10).toString();
                        return { id, name, star5, score };
                      };

                      if (tmpl === 1) {
                        const top = sortedRows.slice(0, count20);
                        const bot = sortedRows.slice(Math.max(count20, total - count20));
                        let text = `📊 BÁO CÁO PHỤC VỤ NHÂN VIÊN\n⚡ Luỹ kế đến ngày: ${today} || TGSD: ${daysPassed}/${totalDays}\n━━━━━━━━━━━━━━━━━━\n\n`;
                        text += `🏆 TOP ${top.length} XUẤT SẮC (5 SAO CAO NHẤT):\n`;
                        top.forEach((r, i) => {
                          const info = getStaffInfo(r);
                          text += `🔺 #${i + 1}. @${info.id} - ${info.star5} lượt 5⭐ (Điểm: ${info.score})\n`;
                        });
                        text += `\n⚠️ BOTTOM ${bot.length} CẦN CẢI THIỆN PHỤC VỤ:\n`;
                        bot.forEach((r, i) => {
                          const info = getStaffInfo(r);
                          text += `🔻 #${total - bot.length + i + 1}. @${info.id} - ${info.star5} lượt 5⭐\n`;
                        });
                        text += `\n💪 Nâng cao trải nghiệm khách hàng để tối đa lượt đánh giá 5 sao! 🔥`;
                        return text;
                      } else if (tmpl === 2) {
                        const bot = sortedRows.slice(Math.max(count20, total - count20));
                        let text = `🚨 DANH SÁCH NHÂN VIÊN CẦN NÂNG CAO PHỤC VỤ:\n`;
                        text += `📊 Tổng: ${bot.length}/${total} nhân viên\n\n`;
                        bot.forEach((r, i) => {
                          const info = getStaffInfo(r);
                          text += `🟡 #${i + 1}. @${info.id}\n`;
                        });
                        text += `\n💡 Chú ý chào đón, tư vấn chu đáo và hướng dẫn khách quét mã đánh giá phục vụ!`;
                        return text;
                      } else {
                        let total5 = 0;
                        sortedRows.forEach(r => {
                          const info = getStaffInfo(r);
                          total5 += parseInt(info.star5.replace(/[^0-9]/g, '')) || 0;
                        });
                        let text = `⚡ TÓM TẮT CHỈ SỐ PHỤC VỤ NHÂN VIÊN:\n`;
                        text += `📅 Ngày cập nhật: ${today} (TGSD: ${daysPassed}/${totalDays})\n`;
                        text += `👥 Tổng số nhân viên: ${total}\n`;
                        text += `⭐ Tổng lượt đánh giá 5 sao: ${total5.toLocaleString('vi-VN')}\n`;
                        const top1 = getStaffInfo(sortedRows[0]);
                        text += `🥇 Dẫn đầu phục vụ: @${top1.id} (${top1.star5} lượt 5⭐)\n`;
                        text += `\n🎯 Mục tiêu: 100% khách hàng hài lòng và đánh giá 5 sao!`;
                        return text;
                      }
                    };

                    const handleOpenPhucVuComment = () => {
                      const initialText = generatePhucVuComment(1);
                      setCommentModal({
                        isOpen: true,
                        title: 'Nhận xét phục vụ',
                        template: 1,
                        text: initialText,
                        tabs: [
                          { id: 1, label: 'Mẫu 1: TOP/BOT NV', icon: '🏆' },
                          { id: 2, label: 'Mẫu 2: DS Cần cải thiện', icon: '⚠️' },
                          { id: 3, label: 'Mẫu 3: Tóm tắt', icon: '⚡' },
                        ],
                        generator: generatePhucVuComment,
                      });
                    };

                    const handleExportPhucVuImage = async () => {
                      if (!capturePhucVuRef.current) return;
                      setIsCapturing(true);
                      try {
                        const dataUrl = await captureElementHelper(capturePhucVuRef.current);
                        setPreviewImage(dataUrl);
                        showNotification('Đã xuất ảnh báo cáo phục vụ!', 'success');
                      } catch (error) {
                        console.error('Lỗi khi chụp ảnh:', error);
                        showNotification('Không thể xuất ảnh báo cáo!', 'error');
                      } finally {
                        setIsCapturing(false);
                      }
                    };

                    return (
                      <div className="mt-10 w-full flex flex-col items-center">
                        <div className="w-full flex justify-end items-center gap-2.5 mb-4">
                          <button
                            onClick={handleOpenPhucVuComment}
                            className="no-capture flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                          >
                            <Sparkles size={14} className="animate-pulse" />
                            <span>NHẬN XÉT</span>
                          </button>
                          <button
                            onClick={handleExportPhucVuImage}
                            disabled={isCapturing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#00965e] hover:bg-[#007b4e] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-md shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            <Camera size={16} />
                            {isCapturing ? 'ĐANG CHỤP...' : 'CHỤP ẢNH BÁO CÁO'}
                          </button>
                        </div>

                        <div ref={capturePhucVuRef} className="bg-white rounded-2xl w-full border border-slate-200 overflow-hidden shadow-sm">
                          {/* Header Banner - Emerald gradient */}
                          <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white p-3.5 sm:p-4 text-center flex flex-col items-center justify-center">
                            <h2 className="text-[19px] sm:text-[23px] md:text-[26px] text-[#FEF08A] font-black uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                              LUỸ KẾ PHỤC VỤ NHÂN VIÊN
                            </h2>
                            <p className="text-[11px] sm:text-[12px] text-white/80 font-bold mt-1" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
                              ⚡ Luỹ kế đến ngày: {today} &nbsp;||&nbsp; TGSD: {daysPassed}/{totalDays}
                            </p>
                          </div>

                          {/* Table */}
                          <div className="w-full overflow-x-auto">
                            <table className="w-full border-collapse table-fixed" style={{ border: '1px solid #e2e8f0', fontWeight: 900 }}>
                              <colgroup>
                                <col style={{ width: '50px' }} />
                                <col style={{ width: '250px' }} />
                                {visibleIndices.slice(startIndex5Sao >= 0 ? startIndex5Sao : 2).map((_, i) => (
                                  <col key={i} style={{ width: '80px' }} />
                                ))}
                                <col style={{ width: '60px' }} />
                              </colgroup>
                              <thead>
                                <tr className="h-[40px]">
                                  <th className="bg-[#047857] text-white px-2 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>STT</th>
                                  <th className="bg-[#047857] text-white px-3 py-0 text-left text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>Nhân viên</th>
                                  {visibleIndices.slice(startIndex5Sao >= 0 ? startIndex5Sao : 2).map((idx, i) => (
                                    <th key={idx} className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                      {allHeaders[idx]}
                                    </th>
                                  ))}
                                  <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>XH</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedRows.map((row, rowIdx) => {
                                  const cells = row.split('\t');
                                  const isTopOne = rowIdx < topLimit;
                                  const isBottomOne = rowIdx >= totalRows - botLimit;

                                  // Build staff name: combine USER NV + TÊN NV
                                  const userNvIdx = visibleIndices.find(idx => {
                                    const h = allHeaders[idx].trim().toUpperCase();
                                    return h.includes('USER') || h.includes('MÃ NV');
                                  });
                                  const tenNvIdx = visibleIndices.find(idx => {
                                    const h = allHeaders[idx].trim().toUpperCase();
                                    return h.includes('TÊN') || h.includes('TEN');
                                  });
                                  const userId = userNvIdx !== undefined ? (cells[userNvIdx] || '').trim() : '';
                                  const tenNv = tenNvIdx !== undefined ? (cells[tenNvIdx] || '').trim() : '';
                                  const staffDisplay = tenNv && userId 
                                    ? `${tenNv.toUpperCase()} - ${userId}` 
                                    : (tenNv || userId || '').toUpperCase();

                                  const nameColor = isTopOne ? 'text-emerald-700' : isBottomOne ? 'text-rose-600' : 'text-slate-800';
                                  const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';

                                  return (
                                    <tr key={rowIdx} className={`${rowBg} hover:bg-slate-50 transition-colors h-[44px] border-b border-slate-100`}>
                                      <td className="px-2 py-0 text-center font-black text-slate-500 text-[12px] sm:text-[13px] border-r border-slate-100" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        #{rowIdx + 1}
                                      </td>
                                      <td className={`px-3 py-0 text-left font-black text-[12px] sm:text-[13px] border-r border-slate-100 truncate ${nameColor}`} style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        {staffDisplay}
                                      </td>
                                      {visibleIndices.slice(startIndex5Sao >= 0 ? startIndex5Sao : 2).map((idx) => {
                                        const value = cells[idx] || '';
                                        const headerText = allHeaders[idx].trim().toUpperCase();
                                        let displayValue = value;

                                        if (headerText.includes('ĐIỂM KH HÀI LÒNG')) {
                                          const numVal = parseFloat(value);
                                          if (!isNaN(numVal) && value.trim() !== '') {
                                            displayValue = (Math.floor(numVal * 10) / 10).toString();
                                          }
                                        }

                                        // Color for satisfaction score
                                        let tdColor = 'text-slate-700';
                                        if (headerText.includes('ĐIỂM KH HÀI LÒNG')) {
                                          const numVal = parseFloat(value);
                                          if (!isNaN(numVal)) {
                                            tdColor = numVal >= 7 ? 'text-emerald-600' : numVal >= 5 ? 'text-amber-600' : 'text-rose-600';
                                          }
                                        }

                                        return (
                                          <td key={idx} className={`px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-slate-100 whitespace-nowrap ${tdColor}`} style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                            {displayValue}
                                          </td>
                                        );
                                      })}
                                      <td className="px-1 py-0 text-center text-[11px] sm:text-[12px] font-black border-r border-slate-100 last:border-r-0 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        {isTopOne && <span className="text-emerald-700">Top</span>}
                                        {isBottomOne && <span className="text-rose-600">Bot</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="h-[44px] bg-[#047857] text-white">
                                  <td colSpan={2} className="px-3 py-0 text-center font-black text-[12px] sm:text-[13px] uppercase tracking-widest border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                    Tổng
                                  </td>
                                  {visibleIndices.slice(startIndex5Sao >= 0 ? startIndex5Sao : 2).map((idx) => {
                                    // Calculate column sum
                                    let colSum: number | null = null;
                                    sortedRows.forEach(row => {
                                      const val = parseFloat((row.split('\t')[idx] || '').replace(/[^0-9.-]+/g, ''));
                                      if (!isNaN(val)) colSum = (colSum || 0) + val;
                                    });
                                    const headerText = allHeaders[idx].trim().toUpperCase();
                                    const isAvg = headerText.includes('ĐIỂM') || headerText.includes('TỈ LỆ');
                                    let display = '—';
                                    if (colSum !== null) {
                                      if (isAvg) {
                                        display = (colSum / sortedRows.length).toFixed(1);
                                      } else {
                                        display = colSum.toLocaleString('vi-VN');
                                      }
                                    }
                                    return (
                                      <td key={idx} className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        {display}
                                      </td>
                                    );
                                  })}
                                  <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px]" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>—</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                        {sortedRows.length > 50 && (
                          <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                            * Hiển thị danh sách đầy đủ nhân viên
                          </p>
                        )}
                      </div>
                    );
                  })()}
                 </motion.div>
               )}

              {activeTab === 'BAN_KEM_NV' && (
                <motion.div
                  key="BAN_KEM_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto w-full relative overflow-hidden space-y-6"
                >
                  {renderLoadingOverlay()}

                  {/* Header Bar & Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">BÁO CÁO BÁN KÈM NHÂN VIÊN</h2>
                        <p className="text-xs text-slate-500 font-medium">Theo dõi chỉ số Bill bán kèm và hiệu quả bán hàng nhân viên</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBanKemInput(!showBanKemInput)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <FileText size={14} /> {showBanKemInput ? 'Ẩn ô dán dữ liệu' : 'Dán / Sửa dữ liệu'}
                      </button>
                      {banKemNv && (
                        <>
                          <button
                            onClick={handleOpenBanKemComment}
                            className="no-capture flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                          >
                            <Sparkles size={14} className="animate-pulse" />
                            <span>NHẬN XÉT</span>
                          </button>
                          <button
                            onClick={handleCaptureBanKem}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:from-[#1D4ED8] hover:to-[#4338CA] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                          >
                            <Camera size={15} /> CHỤP ẢNH BẢNG
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Collapsible / Interactive Input Area */}
                  {(!banKemNv || showBanKemInput) && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                        <Info size={16} className="text-amber-600 flex-shrink-0" />
                        <span>💡 <b>Hướng dẫn dán dữ liệu Bán Kèm NV:</b> Vào báo cáo <b>BÁN KÈM NHÂN VIÊN</b> từ BI &rarr; Chọn Ngày &rarr; Bấm <b>CTRL + A</b> &rarr; <b>Copy</b> &rarr; Dán vào ô bên dưới.</span>
                      </div>
                      <textarea
                        value={banKemNv || ''}
                        onChange={(e) => saveBanKemNv(e.target.value)}
                        placeholder="Dán toàn bộ dữ liệu báo cáo BÁN KÈM NHÂN VIÊN từ BI vào đây (CTRL + V)..."
                        rows={5}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-y"
                      />
                    </div>
                  )}

                  {/* Table View or Empty State */}
                  {(() => {
                    const rows = banKemNv ? parseBanKemData(banKemNv)
                      .filter(row => selectedStaffIds.length === 0 || selectedStaffIds.some(id => row.nhanVien.includes(id)))
                      .sort((a, b) => parseFloat(b.phanTramBill) - parseFloat(a.phanTramBill)) : [];

                    if (rows.length === 0) {
                      return (
                        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-8 text-center space-y-3 max-w-lg mx-auto my-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                            <Info size={24} />
                          </div>
                          <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Chưa có dữ liệu Bán Kèm Nhân Viên</h3>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Vui lòng dán dữ liệu báo cáo Bán Kèm NV từ BI vào khung phía trên hoặc cập nhật tại tab <b>CẬP NHẬT &gt; CẤU HÌNH SIÊU THỊ &gt; HQ BÁN KÈM NV</b>.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        ref={captureBanKemRef}
                        className="bg-white rounded-2xl w-full border border-slate-200 overflow-hidden shadow-sm"
                      >
                        {/* Header Banner - Emerald gradient */}
                        <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white p-3.5 sm:p-4 text-center flex flex-col items-center justify-center">
                          <h2 className="text-[19px] sm:text-[23px] md:text-[26px] text-[#FEF08A] font-black uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                            BÁN KÈM NHÂN VIÊN
                          </h2>
                          <p className="text-[11px] sm:text-[12px] text-white/80 font-bold mt-1" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
                            ⚡ Luỹ kế tháng &nbsp;||&nbsp; TGSD: {daysPassed}/{totalDays}
                          </p>
                        </div>

                        {/* Table */}
                        <div className="w-full overflow-x-auto">
                          <table className="w-full border-collapse table-fixed" style={{ border: '1px solid #e2e8f0', fontWeight: 900 }}>
                            <colgroup>
                              <col style={{ width: '50px' }} />
                              <col style={{ width: '220px' }} />
                              <col style={{ width: '100px' }} />
                              <col style={{ width: '110px' }} />
                              <col style={{ width: '100px' }} />
                              <col style={{ width: '140px' }} />
                              <col style={{ width: '70px' }} />
                            </colgroup>
                            <thead>
                              <tr className="h-[40px]">
                                <th className="bg-[#047857] text-white px-2 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>STT</th>
                                <th className="bg-[#047857] text-white px-3 py-0 text-left text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>Nhân viên</th>
                                <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>DTLK</th>
                                <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>Lượt Bill BK</th>
                                <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>%Bill BK</th>
                                <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>Lượt Bill BH</th>
                                <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>XH</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row: any, i: number, arr: any[]) => {
                                const threshold = Math.max(1, Math.ceil(arr.length * 0.2));
                                const isTop = i < threshold;
                                const isBottom = i >= arr.length - threshold && !isTop;
                                const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                                const nameColor = isTop ? 'text-emerald-700' : isBottom ? 'text-rose-600' : 'text-slate-800';

                                return (
                                  <tr key={i} className={`${rowBg} hover:bg-slate-50 transition-colors h-[44px] border-b border-slate-100`}>
                                    <td className="px-2 py-0 text-center font-black text-slate-500 text-[12px] sm:text-[13px] border-r border-slate-100" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                      #{i + 1}
                                    </td>
                                    <td className={`px-3 py-0 text-left font-black text-[12px] sm:text-[13px] border-r border-slate-100 truncate ${nameColor}`} style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                      {(row.nhanVien || '').toUpperCase()}
                                    </td>
                                    <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-slate-100 text-slate-700 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                      {row.dtlk || '0'}
                                    </td>
                                    <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-slate-100 text-slate-700 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                      {row.luotBill}
                                    </td>
                                    <td className={`px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-slate-100 whitespace-nowrap ${isTop ? 'text-emerald-600' : isBottom ? 'text-rose-600' : 'text-slate-700'}`} style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                      {row.phanTramBill}
                                    </td>
                                    <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-slate-100 text-slate-700 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                      {row.luotBillBanHang}
                                    </td>
                                    <td className="px-1 py-0 text-center text-[11px] sm:text-[12px] font-black whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                      {isTop && <span className="text-emerald-700">Top</span>}
                                      {isBottom && <span className="text-rose-600">Bot</span>}
                                      {!isTop && !isBottom && <span className="text-slate-300">-</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="h-[44px] bg-[#047857] text-white">
                                <td colSpan={2} className="px-3 py-0 text-center font-black text-[12px] sm:text-[13px] uppercase tracking-widest border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                  Tổng
                                </td>
                                <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>—</td>
                                <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                  {rows.reduce((s: number, r: any) => s + (parseInt(String(r.luotBill).replace(/[^0-9]/g, '')) || 0), 0).toLocaleString('vi-VN')}
                                </td>
                                <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>—</td>
                                <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                  {rows.reduce((s: number, r: any) => s + (parseInt(String(r.luotBillBanHang).replace(/[^0-9]/g, '')) || 0), 0).toLocaleString('vi-VN')}
                                </td>
                                <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px]" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>—</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {activeTab === 'THUONG_NV' && (
                <motion.div
                  key="THUONG_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full relative overflow-hidden rounded-[24px]"
                >
                  {renderLoadingOverlay()}
                  <div className="space-y-5">
                    {/* Hướng dẫn sử dụng */}
                    <div className="bg-amber-50 border border-amber-200/60 rounded-[16px] px-4 py-3 flex items-center gap-2.5 shadow-sm">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Info size={14} className="text-amber-700" />
                      </div>
                      <div className="text-[11px] leading-relaxed text-amber-800">
                        <span className="font-black uppercase tracking-wider text-amber-900 block mb-0.5">💡 Hướng dẫn sử dụng dán dữ liệu</span>
                        <span>BCNB &rarr; ĐIỂM THƯỞNG NHÂN VIÊN &rarr; CHỌN NGÀY &rarr; CHỌN USER NV &rarr; CTRL A &rarr; COPY &rarr; DÁN VÀO Ô TÊN NV TƯƠNG ỨNG.</span>
                      </div>
                    </div>

                    {/* TOP ROW - Two input panels side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tháng trước */}
                      <div className="bg-white rounded-[20px] p-4 shadow-lg border border-slate-200/80">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                              <Gift size={14} className="text-slate-500" />
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight">Thưởng tháng trước</h3>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Dán dữ liệu từ BI</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleClearThuong('truoc')}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                            title="Xóa toàn bộ dữ liệu thưởng tháng trước"
                          >
                            <Trash2 size={10} className="text-rose-500" />
                            Xóa dữ liệu
                          </button>
                        </div>
                        <div className="space-y-2.5">
                          {filteredBiData.map((staff) => (
                            <div key={`truoc-${staff.fullId}`}>
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 block">{staff.displayName}</label>
                              <textarea
                                className="w-full p-2 rounded-lg border border-slate-200 text-[10px] font-black font-sans focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all bg-slate-50/50 hover:bg-white resize-none"
                                rows={1}
                                placeholder="Dán dữ liệu..."
                                value={thuongData[staff.fullId]?.truoc || ''}
                                onChange={(e) => {
                                  saveThuongField(staff.fullId, 'truoc', e.target.value);
                                }}
                                onPaste={() => {
                                  autoCopyNextStaff(staff.fullId);
                                }}
                                onKeyUp={() => {
                                  handleStaffInputKeyUp(staff.fullId);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tháng hiện tại */}
                      <div className="bg-white rounded-[20px] p-4 shadow-lg border border-purple-200/80">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-200">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-purple-200/50">
                              <Gift size={14} className="text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-purple-700 uppercase tracking-tight">Thưởng hiện tại</h3>
                              <p className="text-[9px] text-purple-400 font-black uppercase tracking-widest">Dán dữ liệu từ BI</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleImportFromInsite}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 hover:text-purple-800 border border-purple-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
                              title="Tự động đồng bộ toàn bộ dữ liệu thưởng từ New Insite"
                            >
                              <RefreshCw size={10} className="text-purple-500" />
                              ĐỒNG BỘ THƯỞNG
                            </button>
                            <button
                              onClick={() => handleClearThuong('hientai')}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
                              title="Xóa toàn bộ dữ liệu thưởng tháng hiện tại"
                            >
                              <Trash2 size={10} className="text-rose-500" />
                              Xóa dữ liệu
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          {filteredBiData.map((staff) => (
                            <div key={`hientai-${staff.fullId}`}>
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 block">{staff.displayName}</label>
                              <textarea
                                className="w-full p-2 rounded-lg border border-purple-200 text-[10px] font-black font-sans focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all bg-purple-50/30 hover:bg-white resize-none"
                                rows={1}
                                placeholder="Dán dữ liệu..."
                                value={thuongData[staff.fullId]?.hientai || ''}
                                onChange={(e) => {
                                  saveThuongField(staff.fullId, 'hientai', e.target.value);
                                }}
                                onPaste={() => {
                                  autoCopyNextStaff(staff.fullId);
                                }}
                                onKeyUp={() => {
                                  handleStaffInputKeyUp(staff.fullId);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT PANEL - Bonus Summary Table */}
                    <div ref={captureThuongNvRef} className="bg-white border-[15px] border-white shadow-xl overflow-hidden ring-1 ring-slate-300">
                      {/* Table Header */}
                      <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                        <div className="p-5 flex flex-col items-center justify-center">
                          <h2 className="text-2xl font-sans font-black text-[#0f172a] uppercase tracking-tight mb-2">BẢNG THƯỞNG NHÂN VIÊN</h2>
                          <div className="w-48 h-[1px] bg-slate-300 mb-2"></div>
                          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">{marketFilter !== 'ALL' ? marketFilter : 'Tất cả siêu thị'}</p>
                        </div>
                        <div className="p-5 flex flex-col items-center justify-center">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCaptureThuongNv}
                              disabled={isCapturing}
                              className={cn(
                                "capture-btn flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:from-[#1D4ED8] hover:to-[#4338CA] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer",
                                isCapturing ? "opacity-50 cursor-not-allowed" : "active:scale-95"
                              )}
                            >
                              <Camera size={14} /> CHỤP ẢNH
                            </button>
                            <div className="px-3 py-2 rounded-lg bg-slate-100">
                              <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest">{filteredBiData.length} NV</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Table Content */}
                      <div className="overflow-x-auto scrollbar-thin select-none">
                        {(() => {
                          // Tính toán hàng Tổng cho Footer
                          const colTotalsT = Array(8).fill(0);
                          const colTotalsH = Array(8).fill(0);
                          let hasAnyDataT = false;
                          let hasAnyDataH = false;

                          filteredBiData.forEach(staff => {
                            const truoc = thuongData[staff.fullId]?.truoc || '';
                            const hientai = thuongData[staff.fullId]?.hientai || '';
                            const tD = parseBonusData(truoc, staff, marketFilter);
                            const hD = parseBonusData(hientai, staff, marketFilter);
                            
                            for (let i = 0; i < 8; i++) {
                              if (tD.details[i] !== null) {
                                colTotalsT[i] += tD.details[i] || 0;
                                hasAnyDataT = true;
                              }
                              if (hD.details[i] !== null) {
                                colTotalsH[i] += hD.details[i] || 0;
                                hasAnyDataH = true;
                              }
                            }
                          });

                          // Sắp xếp danh sách nhân viên theo thứ tự Tăng/Giảm (Hiện tại - Tháng trước) giảm dần
                          const sortedBiDataForBonus = [...filteredBiData].sort((a, b) => {
                            const truocA = thuongData[a.fullId]?.truoc || '';
                            const hientaiA = thuongData[a.fullId]?.hientai || '';
                            const tDA = parseBonusData(truocA, a, marketFilter);
                            const hDA = parseBonusData(hientaiA, a, marketFilter);
                            const valTA = tDA.details[7] || 0;
                            const valHA = hDA.details[7] || 0;
                            const diffA = valHA - valTA;

                            const truocB = thuongData[b.fullId]?.truoc || '';
                            const hientaiB = thuongData[b.fullId]?.hientai || '';
                            const tDB = parseBonusData(truocB, b, marketFilter);
                            const hDB = parseBonusData(hientaiB, b, marketFilter);
                            const valTB = tDB.details[7] || 0;
                            const valHB = hDB.details[7] || 0;
                            const diffB = valHB - valTB;

                            return diffB - diffA;
                          });

                          return (
                            <>
                              <div className="overflow-x-auto">
                              <table className="w-full border-collapse min-w-[1000px]" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                                <thead>
                                  <tr className="bg-[#facc15] text-[14px] font-black text-slate-900 uppercase tracking-tight h-[45px] border-b border-slate-300">
                                    <th rowSpan={2} style={{ fontFamily: 'var(--font-sans)', fontWeight: '900' }} className="px-3 py-0 text-center w-10 border-r border-slate-300 font-sans font-black">STT</th>
                                    <th rowSpan={2} style={{ fontFamily: 'var(--font-sans)', fontWeight: '900' }} className="px-4 py-0 text-center border-r border-slate-300 min-w-[200px] font-sans font-black">Nhân viên</th>
                                    {BONUS_COLS.map((cat, idx) => (
                                      <th key={idx} colSpan={3} style={{ fontFamily: 'var(--font-sans)', fontWeight: '900' }} className="px-3 py-0 text-center border-r border-slate-300 text-[14px] font-black text-slate-900 uppercase font-sans font-black">
                                        {cat.name}
                                      </th>
                                    ))}
                                    <th rowSpan={2} style={{ fontFamily: 'var(--font-sans)', fontWeight: '900' }} className="px-3 py-0 text-center min-w-[80px] text-[14px] font-black text-slate-900 uppercase font-sans font-black">Nhận xét</th>
                                  </tr>
                                  <tr className="bg-[#facc15] text-[12px] font-black text-slate-900 uppercase tracking-tight h-[35px] border-b border-slate-300">
                                    {BONUS_COLS.map((_, idx) => (
                                      <React.Fragment key={idx}>
                                        <th style={{ fontFamily: 'var(--font-sans)', fontWeight: '900' }} className="px-2 py-0 text-center border-r border-slate-300 min-w-[80px] font-sans font-black">T.Trước</th>
                                        <th style={{ fontFamily: 'var(--font-sans)', fontWeight: '900' }} className="px-2 py-0 text-center border-r border-slate-300 min-w-[80px] font-sans font-black">H.Tại</th>
                                        <th style={{ fontFamily: 'var(--font-sans)', fontWeight: '900' }} className="px-2 py-0 text-center border-r border-slate-300 min-w-[80px] font-sans font-black">Tăng / Giảm</th>
                                      </React.Fragment>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {sortedBiDataForBonus.map((staff, idx) => {
                                    const truoc = thuongData[staff.fullId]?.truoc || '';
                                    const hientai = thuongData[staff.fullId]?.hientai || '';
                                    
                                    const truocData = parseBonusData(truoc, staff, marketFilter);
                                    const hientaiData = parseBonusData(hientai, staff, marketFilter);
                                    
                                    const valTruoc = truocData.tong !== null ? truocData.tong : 0;
                                    const valHientai = hientaiData.tong !== null ? hientaiData.tong : 0;
                                    const tongDiff = valHientai - valTruoc;

                                    return (
                                      <tr key={staff.fullId} className={cn("hover:bg-slate-50 transition-colors h-[40px]", idx % 2 === 1 ? "bg-[#f8faff]" : "bg-white")}>
                                        <td className="px-2 py-0 text-center border-r border-slate-200 bg-white font-bold text-[13px] text-slate-800">
                                          {idx + 1}
                                        </td>
                                        <td className="px-4 py-0 border-r border-slate-200">
                                          <span className="text-[13px] font-bold text-slate-800 uppercase" title={staff.displayName}>{staff.displayName}</span>
                                        </td>
                                        {BONUS_COLS.map((cat, idx) => {
                                          const valT = truocData.details[cat.index];
                                          const valH = hientaiData.details[cat.index];
                                          const diffVal = (valH || 0) - (valT || 0);
                                          return (
                                            <React.Fragment key={idx}>
                                              <td className="px-2 py-0 text-center border-r border-slate-200">
                                                {valT !== null ? (
                                                  <span className="text-[14px] font-bold text-slate-700">
                                                    {valT.toLocaleString('vi-VN')}
                                                  </span>
                                                ) : (
                                                  <span className="text-[12px] text-slate-300 font-bold">—</span>
                                                )}
                                              </td>
                                              <td className="px-2 py-0 text-center border-r border-slate-200">
                                                {valH !== null ? (
                                                  <span className="text-[14px] font-bold text-emerald-700">
                                                    {valH.toLocaleString('vi-VN')}
                                                  </span>
                                                ) : (
                                                  <span className="text-[12px] text-slate-300 font-bold">—</span>
                                                )}
                                              </td>
                                              <td className="px-2 py-0 text-center border-r border-slate-200">
                                                {valT !== null || valH !== null ? (
                                                  <span className={cn(
                                                    "text-[14px] font-bold",
                                                    diffVal > 0 ? "text-emerald-600" :
                                                    diffVal < 0 ? "text-rose-600" :
                                                    "text-slate-400"
                                                  )}>
                                                    {diffVal > 0 ? `+${diffVal.toLocaleString('vi-VN')}` : diffVal.toLocaleString('vi-VN')}
                                                  </span>
                                                ) : (
                                                  <span className="text-[12px] text-slate-300 font-bold">—</span>
                                                )}
                                              </td>
                                            </React.Fragment>
                                          );
                                        })}
                                        <td className="px-2 py-0 text-center">
                                          {truocData.tong !== null || hientaiData.tong !== null ? (
                                            <div className="flex items-center justify-center">
                                              {tongDiff > 0 ? (
                                                <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[11px] font-bold uppercase">
                                                  <TrendingUp size={12} strokeWidth={2.5} /> Tăng
                                                </span>
                                              ) : tongDiff < 0 ? (
                                                <span className="inline-flex items-center gap-0.5 text-rose-600 text-[11px] font-bold uppercase">
                                                  <TrendingDown size={12} strokeWidth={2.5} /> Giảm
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-0.5 text-slate-500 text-[11px] font-bold uppercase">
                                                  <Check size={12} strokeWidth={2.5} /> Ổn định
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="inline-flex items-center text-slate-400 text-[10px] font-bold uppercase">
                                              Chưa có DL
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-[#facc15] font-black text-slate-900 text-[13px] border-t-2 border-slate-300 select-none">
                                  <tr>
                                    <td colSpan={2} className="px-4 py-3 text-left uppercase tracking-wider border-r border-slate-300/50 font-black">
                                      TỔNG CỘNG ĐANG HIỂN THỊ
                                    </td>
                                    {BONUS_COLS.map((cat, idx) => {
                                      const totalT = colTotalsT[cat.index];
                                      const totalH = colTotalsH[cat.index];
                                      const diffTotal = totalH - totalT;
                                      return (
                                        <React.Fragment key={idx}>
                                          <td className="px-2 py-3 text-center border-r border-slate-300/50">
                                            {hasAnyDataT ? (
                                              <span className="text-slate-900 font-black">{totalT.toLocaleString('vi-VN')}</span>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </td>
                                          <td className="px-2 py-3 text-center border-r border-slate-300/50">
                                            {hasAnyDataH ? (
                                              <span className="text-slate-900 font-black">{totalH.toLocaleString('vi-VN')}</span>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </td>
                                          <td className="px-2 py-3 text-center border-r border-slate-300/50">
                                            {hasAnyDataT || hasAnyDataH ? (
                                              <span className="text-slate-900 font-black">
                                                {diffTotal > 0 ? `+${diffTotal.toLocaleString('vi-VN')}` : diffTotal.toLocaleString('vi-VN')}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </td>
                                        </React.Fragment>
                                      );
                                    })}
                                    <td className="px-3 py-3 text-center">
                                      {hasAnyDataT && hasAnyDataH ? (
                                        <div className="flex items-center justify-center">
                                          {colTotalsH[7] - colTotalsT[7] > 0 ? (
                                            <span className="text-slate-900 text-[12px] font-black uppercase">Tăng</span>
                                          ) : colTotalsH[7] - colTotalsT[7] < 0 ? (
                                            <span className="text-slate-900 text-[12px] font-black uppercase">Giảm</span>
                                          ) : (
                                            <span className="text-slate-900 text-[12px] font-black uppercase">Ổn định</span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                              </div>

                              {filteredBiData.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                  <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                                    <Gift size={28} className="text-slate-300" />
                                  </div>
                                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Chưa có nhân viên</h3>
                                  <p className="text-xs text-slate-300 font-black mt-1">Chọn siêu thị và nhân viên để xem bảng thưởng</p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'TRA_CHAM_NV' && (
                <motion.div
                  key="TRA_CHAM_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-[1260px] mx-auto w-full relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                          <Clock size={20} />
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: '900' }} className="text-slate-800 uppercase tracking-widest font-sans font-black">LK TRẢ CHẬM NHÂN VIÊN</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {parsedTraChamRows.length > 0 && (
                          <button
                            onClick={handleOpenTraChamComment}
                            className="no-capture flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                          >
                            <Sparkles size={14} className="animate-pulse" />
                            <span>NHẬN XÉT</span>
                          </button>
                        )}
                        <button
                          onClick={handleCaptureTraCham}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:from-[#1D4ED8] hover:to-[#4338CA] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                        >
                          <Camera size={15} /> CHỤP ẢNH BẢNG
                        </button>
                      </div>
                    </div>



                    <div
                      ref={captureTraChamRef}
                      className="bg-white rounded-2xl w-full border border-slate-200 overflow-hidden shadow-sm"
                    >
                      {parsedTraChamRows.length > 0 ? (
                        <>
                          {/* Header Banner - Emerald gradient */}
                          <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white p-3.5 sm:p-4 text-center flex flex-col items-center justify-center">
                            <h2 className="text-[19px] sm:text-[23px] md:text-[26px] text-[#FEF08A] font-black uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                              TRẢ CHẬM NHÂN VIÊN
                            </h2>
                            <p className="text-[11px] sm:text-[12px] text-white/80 font-bold mt-1" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
                              ⚡ Luỹ kế tháng &nbsp;||&nbsp; TGSD: {daysPassed}/{totalDays}
                            </p>
                          </div>

                          {/* Table */}
                          <div className="w-full overflow-x-auto">
                            <table className="w-full border-collapse table-fixed" style={{ border: '1px solid #e2e8f0', fontWeight: 900 }}>
                              <colgroup>
                                <col style={{ width: '50px' }} />
                                <col style={{ width: '220px' }} />
                                <col style={{ width: '140px' }} />
                                <col style={{ width: '140px' }} />
                                <col style={{ width: '100px' }} />
                                <col style={{ width: '70px' }} />
                              </colgroup>
                              <thead>
                                <tr className="h-[40px]">
                                  <th className="bg-[#047857] text-white px-2 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>STT</th>
                                  <th className="bg-[#047857] text-white px-3 py-0 text-left text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>Nhân viên</th>
                                  <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>DT Thực</th>
                                  <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>DT Trả Chậm</th>
                                  <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>% Trả Chậm</th>
                                  <th className="bg-[#047857] text-white px-1 py-0 text-center text-[11px] sm:text-[12px] font-black uppercase tracking-wider" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>XH</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parsedTraChamRows.map((row: any, i: number, arr: any[]) => {
                                  const threshold = Math.max(1, Math.ceil(arr.length * 0.2));
                                  const isTop = i < threshold;
                                  const isBottom = i >= arr.length - threshold && !isTop;
                                  const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                                  const nameColor = isTop ? 'text-emerald-700' : isBottom ? 'text-rose-600' : 'text-slate-800';

                                  return (
                                    <tr key={i} className={`${rowBg} hover:bg-slate-50 transition-colors h-[44px] border-b border-slate-100`}>
                                      <td className="px-2 py-0 text-center font-black text-slate-500 text-[12px] sm:text-[13px] border-r border-slate-100" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        #{i + 1}
                                      </td>
                                      <td className={`px-3 py-0 text-left font-black text-[12px] sm:text-[13px] border-r border-slate-100 truncate ${nameColor}`} style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        {(row.nhanVien || '').toUpperCase()}
                                      </td>
                                      <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-slate-100 text-slate-700 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        {Math.round(row.totalRevenue).toLocaleString('vi-VN')}
                                      </td>
                                      <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-slate-100 text-slate-700 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        {Math.round(row.installmentRevenue).toLocaleString('vi-VN')}
                                      </td>
                                      <td className={`px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-slate-100 whitespace-nowrap ${isTop ? 'text-emerald-600' : isBottom ? 'text-rose-600' : 'text-slate-700'}`} style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        {row.percent.toFixed(1)}%
                                      </td>
                                      <td className="px-1 py-0 text-center text-[11px] sm:text-[12px] font-black whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                        {isTop && <span className="text-emerald-700">Top</span>}
                                        {isBottom && <span className="text-rose-600">Bot</span>}
                                        {!isTop && !isBottom && <span className="text-slate-300">-</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="h-[44px] bg-[#047857] text-white">
                                  <td colSpan={2} className="px-3 py-0 text-center font-black text-[12px] sm:text-[13px] uppercase tracking-widest border-r border-emerald-600/50" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                    Tổng
                                  </td>
                                  <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                    {parsedTraChamRows.reduce((s: number, r: any) => s + Math.round(r.totalRevenue), 0).toLocaleString('vi-VN')}
                                  </td>
                                  <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                    {parsedTraChamRows.reduce((s: number, r: any) => s + Math.round(r.installmentRevenue), 0).toLocaleString('vi-VN')}
                                  </td>
                                  <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px] border-r border-emerald-600/50 whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                    {(() => {
                                      const totalRev = parsedTraChamRows.reduce((s: number, r: any) => s + r.totalRevenue, 0);
                                      const totalInst = parsedTraChamRows.reduce((s: number, r: any) => s + r.installmentRevenue, 0);
                                      return totalRev > 0 ? ((totalInst / totalRev) * 100).toFixed(1) + '%' : '—';
                                    })()}
                                  </td>
                                  <td className="px-1 py-0 text-center font-black text-[12px] sm:text-[13px]" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>—</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
                          <Clock size={48} className="mx-auto text-slate-300 mb-4 animate-pulse" />
                          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">CHƯA CÓ DỮ LIỆU TRẢ CHẬM HỢP LỆ</h3>
                          <p className="text-slate-400 text-sm font-medium mb-4">Vui lòng dán dữ liệu hiệu quả trả chậm của nhân viên tại trang <b>Khai Báo &gt; Cấu Hình Siêu Thị &gt; TRẢ GÓP NV</b>.</p>
                          {tragopNv && tragopNv.trim().length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-left text-xs max-w-lg mx-auto">
                              <p className="font-bold text-red-800 mb-1">Dữ liệu thô đang có trong cấu hình (không phân tích được):</p>
                              <pre className="whitespace-pre-wrap font-mono text-[10px] text-red-700 max-h-32 overflow-y-auto bg-white p-2 rounded border border-red-100">{tragopNv}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'KHAI_THAC_NV' && (
                <motion.div
                  key="KHAI_THAC_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 animate-fade-in"
                >
                  <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto w-full relative overflow-hidden">
                    {renderLoadingOverlay()}
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                          <Target size={24} />
                        </div>
                        <div>
                          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: '900' }} className="text-slate-800 uppercase tracking-widest font-sans font-black">KHAI THÁC NHÓM HÀNG</h3>
                          <p className="text-xs text-slate-400 font-black uppercase tracking-wider mt-1">Dữ liệu từ "CHI TIẾT DTNV"</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCaptureKhaiThac}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                        >
                          <Camera size={16} /> CHỤP ẢNH BẢNG
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    {availableKhaiThacCategories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2">BỘ LỌC NHÓM HÀNG:</span>
                        <button
                          onClick={() => setKhaiThacCategoryFilter('ALL')}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
                            khaiThacCategoryFilter === 'ALL'
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                              : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                          )}
                        >
                          TẤT CẢ
                        </button>
                        {availableKhaiThacCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setKhaiThacCategoryFilter(cat)}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
                              khaiThacCategoryFilter === cat
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                                : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                            )}
                          >
                            {cat.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Table or Fallback */}
                    <div
                      ref={captureKhaiThacRef}
                      className="w-full bg-white rounded-[40px] overflow-hidden p-6"
                    >
                      {parsedKhaiThacRows.length > 0 ? (
                        (() => {
                          const displayNhomHangName = khaiThacCategoryFilter !== 'ALL' 
                            ? khaiThacCategoryFilter 
                            : (parsedKhaiThacRows[0]?.nhomHang || 'Đèn năng lượng mặt trời');
                          return (
                            <>
                              {/* Double Header Card */}
                              <div className="w-full bg-white border border-slate-200 border-b-0 rounded-t-[32px] overflow-hidden flex divide-x divide-slate-200 shadow-sm">
                                <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#0f172a] uppercase tracking-tight mb-2">NHÓM HÀNG NHÂN VIÊN</h2>
                                  <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[15px] text-slate-500 uppercase tracking-widest">LUỸ KẾ THÁNG</span>
                                </div>
                                <div className="w-2/5 p-6 flex flex-col items-center justify-center bg-slate-50/50 relative">
                                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[24px] text-[#2563eb] uppercase tracking-tight mb-2 text-center">{displayNhomHangName.toUpperCase()}</h2>
                                  <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[13px] text-slate-500 uppercase tracking-widest">
                                    Siêu thị: {marketFilter}
                                  </span>
                                </div>
                              </div>

                          <div className="w-full bg-white border border-slate-200 rounded-b-[32px] overflow-hidden shadow-lg shadow-slate-200/30">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[#0f172a] border-collapse" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                                <thead className="text-slate-900 uppercase border-b border-slate-200">
                                  <tr style={{ height: '50px' }}>
                                    <th style={{ width: '60px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-4 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">STT</th>
                                    <th style={{ width: '250px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-6 py-3 border-r border-white/20 text-[#0f172a] font-sans font-black">NHÂN VIÊN</th>
                                    <th style={{ width: '220px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-6 py-3 border-r border-white/20 text-[#0f172a] font-sans font-black text-center">NHÓM HÀNG</th>
                                    <th style={{ width: '100px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">SL</th>
                                    <th style={{ width: '180px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">DTLK</th>
                                    <th style={{ width: '150px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-6 py-3 text-center text-[#0f172a] font-sans font-black">ĐƠN GIÁ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '14px' }}>
                                  {parsedKhaiThacRows.map((row: any, i: number) => {
                                      const isStriped = i % 2 === 1;
                                      return (
                                        <tr key={i} className={`${isStriped ? 'bg-[#f8faff]' : 'bg-white'} hover:bg-slate-50 h-[48px]`}>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-3 text-center border-r border-slate-200 text-[#0f172a]">{i + 1}</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 border-r border-slate-200 text-[#0f172a] uppercase">{row.nhanVien}</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 border-r border-slate-200 text-center text-[#0f172a]">{row.nhomHang}</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#0f172a]">{row.soLuong}</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#0f172a]">{Math.round(row.dtlk).toLocaleString('vi-VN')} đ</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center font-mono text-[#0f172a]">{row.donGia > 0 ? `${Math.round(row.donGia).toLocaleString('vi-VN')} đ` : '-'}</td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
                          <Clock size={48} className="mx-auto text-slate-300 mb-4 animate-pulse" />
                          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">CHƯA CÓ DỮ LIỆU NHÓM HÀNG HỢP LỆ</h3>
                          <p className="text-slate-400 text-sm font-medium mb-4">Vui lòng dán dữ liệu ma trận doanh thu nhân viên (chứa nhóm hàng "Đèn năng lượng mặt trời") tại trang <b>Khai Báo &gt; Cấu Hình Siêu Thị &gt; CHI TIẾT DTNV</b>.</p>
                          {tragopMatran && tragopMatran.trim().length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-left text-xs max-w-lg mx-auto">
                              <p className="font-bold text-red-800 mb-1">Dữ liệu thô đang có trong cấu hình (chưa trích xuất được):</p>
                              <pre className="whitespace-pre-wrap font-mono text-[10px] text-red-700 max-h-32 overflow-y-auto bg-white p-2 rounded border border-red-100">{tragopMatran}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'RANK_3T_NV' && (
                <motion.div
                  key="RANK_3T_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 animate-fade-in"
                >
                  {/* Inputs Section */}
                  <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto w-full relative">
                    {renderLoadingOverlay()}
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl">
                          <Trophy size={24} />
                        </div>
                        <div>
                          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: '900' }} className="text-slate-800 uppercase tracking-widest font-sans font-black">XẾP HẠNG NHÂN VIÊN 3 THÁNG</h3>
                          <p className="text-xs text-slate-400 font-black uppercase tracking-wider mt-1">Dán dữ liệu DTQĐ và Thu nhập của 3 tháng để xếp hạng tổng hợp</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleShiftAllLeft}
                          className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 border border-indigo-200/60 cursor-pointer"
                          title="Chuyển toàn bộ dữ liệu Cột 2 sang Cột 1 và Cột 3 sang Cột 2"
                        >
                          <ArrowLeftRight size={15} /> DỊCH CHUYỂN CỘT 2 -&gt; CỘT 1, CỘT 3 -&gt; CỘT 2
                        </button>
                        {prevRank3TState && (
                          <button
                            type="button"
                            onClick={handleRestoreRank3T}
                            className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 border border-amber-200/60 cursor-pointer animate-fade-in"
                            title="Khôi phục dữ liệu về trạng thái trước khi thực hiện dịch chuyển"
                          >
                            <RotateCcw size={15} /> KHÔI PHỤC DỮ LIỆU
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Guidance Banner */}
                    <div className="mb-6 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/10 border-2 border-amber-300/80 rounded-2xl p-5 sm:p-6 shadow-md shadow-amber-500/5">
                      <div className="flex items-center gap-3 mb-4 text-amber-950 font-black text-base sm:text-lg uppercase tracking-tight">
                        <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-600/30">
                          <Info size={20} />
                        </div>
                        <span>💡 HƯỚNG DẪN ĐỔ DỮ LIỆU NHÂN VIÊN 3 THÁNG</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm sm:text-[15px] text-slate-800 leading-relaxed font-normal">
                        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-amber-200/80 shadow-sm flex gap-3 items-start">
                          <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-amber-600/20">1</span>
                          <div>
                            Anh/Chị đổ dữ liệu 3 tháng vào các ô dữ liệu, <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-black border border-blue-200/80 inline-block shadow-2xs">"DỮ LIỆU THU NHẬP"</span> <b>đổ từng nhân viên</b>: <b>Copy User nhân viên 1</b>, xem điểm thưởng nhân viên <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-black border border-emerald-200/80 inline-block shadow-2xs">Ctrl A (Copy ALL)</span> và <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 font-black border border-purple-200/80 inline-block shadow-2xs">Ctrl V</span> dán vào sẽ <b>tự động copy mã nhân viên thứ 2</b>, dán dữ liệu cho đến hết danh sách nhân viên.
                          </div>
                        </div>
                        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-amber-200/80 shadow-sm flex gap-3 items-start">
                          <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-amber-600/20">2</span>
                          <div>
                            Khi qua tháng mới Anh/Chị nhấn nút <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 font-black border border-indigo-200/80 inline-block shadow-2xs">"DỊCH CHUYỂN CỘT"</span> để <b>chuyển dữ liệu domino qua</b>, Anh/Chị chỉ cần chọn lại 3 tháng ở 3 cột là được.
                          </div>
                        </div>
                        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-amber-200/80 shadow-sm flex gap-3 items-start">
                          <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-amber-600/20">3</span>
                          <div>
                            Riêng tháng hiện tại nằm ở Cột 3 có nút <span className="px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-900 font-black border border-cyan-200/80 inline-block shadow-2xs">"ĐỒNG BỘ"</span> sẽ <b>đồng bộ dữ liệu tháng hiện tại</b> nên Anh/Chị <b>không cần đổ lại dữ liệu lần nữa</b>.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Month 1 Inputs */}
                      <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">1</span>
                            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Cột 1</h4>
                          </div>
                          <select
                            value={rankMonth1}
                            onChange={(e) => setRankMonth1(e.target.value)}
                            className="text-xs font-black text-blue-600 bg-blue-50/50 border border-blue-100 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                          >
                            {Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">DOANH THU NHÂN VIÊN ({rankMonth1})</label>
                              <span className="text-[10px] font-black text-blue-600">{formatValueForDisplay(dtqd1Sum)}</span>
                            </div>
                            <textarea
                              value={dtqd3t1}
                              onChange={(e) => setDtqd3t1(e.target.value)}
                              placeholder={`Dán cột Nhân viên & DTQĐ ${rankMonth1}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div 
                              onClick={() => setShowIncome1(!showIncome1)}
                              className="flex justify-between items-center mb-1.5 cursor-pointer hover:opacity-80 transition-all select-none"
                            >
                              <div className="flex items-center gap-1">
                                <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block cursor-pointer">Dữ Liệu Thu Nhập ({rankMonth1})</label>
                                {showIncome1 ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmModal({ title: 'Xoá dữ liệu Thu Nhập', message: 'Xoá toàn bộ dữ liệu Thu Nhập ' + rankMonth1 + '?', variant: 'danger', onConfirm: () => setThunhap3t1('{}') }); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                  title="Xoá dữ liệu thu nhập"
                                >
                                  <Trash2 size={9} />Xoá
                                </button>
                                <span className="text-[10px] font-black text-emerald-600">{formatValueForDisplay(thunhap1Sum, true)}</span>
                              </div>
                            </div>
                            {showIncome1 && (
                              <div className="space-y-3 max-h-[320px] overflow-y-auto p-3 bg-slate-100/50 rounded-2xl border border-slate-200/60 shadow-inner">
                                {(() => {
                                  let parsedTnData: Record<string, string> = {};
                                  try {
                                    parsedTnData = JSON.parse(thunhap3t1) || {};
                                  } catch {}
                                  return filteredBiData.map((staff) => {
                                    const rawVal = parsedTnData[staff.fullId] || '';
                                    const { tong } = parseBonusData(rawVal, staff, marketFilter);
                                    return (
                                      <div key={`tn1-${staff.fullId}`} className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-sm">
                                        <div className="flex justify-between items-center mb-1 gap-2">
                                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{staff.displayName}</span>
                                          <span className="text-[9px] font-black text-emerald-600 flex-shrink-0">{formatValueForDisplay(tong || 0, true)}</span>
                                        </div>
                                        <textarea
                                          className="w-full p-1.5 rounded-lg border border-slate-200 text-[10px] font-black font-sans focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all bg-slate-50/50 hover:bg-white resize-none"
                                          rows={1}
                                          placeholder="Dán dữ liệu thưởng..."
                                          value={rawVal}
                                          onChange={(e) => {
                                            const updated = { ...parsedTnData, [staff.fullId]: e.target.value };
                                            setThunhap3t1(JSON.stringify(updated));
                                          }}
                                          onPaste={() => {
                                            autoCopyNextStaff(staff.fullId);
                                          }}
                                          onKeyUp={() => {
                                            handleStaffInputKeyUp(staff.fullId);
                                          }}
                                        />
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">THI ĐUA NHÂN VIÊN ({rankMonth1})</label>
                              <span className="text-[10px] font-black text-indigo-600">{nganhhang1Sum.toLocaleString('vi-VN')}</span>
                            </div>
                            <textarea
                              value={nganhhang3t1}
                              onChange={(e) => setNganhhang3t1(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Thi đua ${rankMonth1}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Thi Đua Siêu Thị ({rankMonth1})</label>
                              <span className="text-[10px] font-black text-purple-600">{thidua1Sum.toLocaleString('vi-VN')}</span>
                            </div>
                            <textarea
                              value={thidua3t1}
                              onChange={(e) => setThidua3t1(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Thi đua siêu thị ${rankMonth1}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Trả Chậm ({rankMonth1})</label>
                              <span className="text-[10px] font-black text-rose-600">{Math.round(tracham1Sum)}%</span>
                            </div>
                            <textarea
                              value={tracham3t1}
                              onChange={(e) => setTracham3t1(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Trả chậm ${rankMonth1}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono bg-white"
                            />
                          </div>

                        </div>
                      </div>

                      {/* Month 2 Inputs */}
                      <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">2</span>
                            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Cột 2</h4>
                            <button
                              type="button"
                              onClick={handleShift2to1}
                              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200/60 transition-all ml-1 cursor-pointer"
                              title="Dịch toàn bộ dữ liệu Cột 2 sang Cột 1 và xóa Cột 2"
                            >
                              <ArrowLeft size={12} /> Sang Cột 1
                            </button>
                          </div>
                          <select
                            value={rankMonth2}
                            onChange={(e) => setRankMonth2(e.target.value)}
                            className="text-xs font-black text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                          >
                            {Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">DOANH THU NHÂN VIÊN ({rankMonth2})</label>
                              <span className="text-[10px] font-black text-indigo-600">{formatValueForDisplay(dtqd2Sum)}</span>
                            </div>
                            <textarea
                              value={dtqd3t2}
                              onChange={(e) => setDtqd3t2(e.target.value)}
                              placeholder={`Dán cột Nhân viên & DTQĐ ${rankMonth2}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div 
                              onClick={() => setShowIncome2(!showIncome2)}
                              className="flex justify-between items-center mb-1.5 cursor-pointer hover:opacity-80 transition-all select-none"
                            >
                              <div className="flex items-center gap-1">
                                <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block cursor-pointer">Dữ Liệu Thu Nhập ({rankMonth2})</label>
                                {showIncome2 ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmModal({ title: 'Xoá dữ liệu Thu Nhập', message: 'Xoá toàn bộ dữ liệu Thu Nhập ' + rankMonth2 + '?', variant: 'danger', onConfirm: () => setThunhap3t2('{}') }); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                  title="Xoá dữ liệu thu nhập"
                                >
                                  <Trash2 size={9} />Xoá
                                </button>
                                <span className="text-[10px] font-black text-emerald-600">{formatValueForDisplay(thunhap2Sum, true)}</span>
                              </div>
                            </div>
                            {showIncome2 && (
                              <div className="space-y-3 max-h-[320px] overflow-y-auto p-3 bg-slate-100/50 rounded-2xl border border-slate-200/60 shadow-inner">
                                {(() => {
                                  let parsedTnData: Record<string, string> = {};
                                  try {
                                    parsedTnData = JSON.parse(thunhap3t2) || {};
                                  } catch {}
                                  return filteredBiData.map((staff) => {
                                    const rawVal = parsedTnData[staff.fullId] || '';
                                    const { tong } = parseBonusData(rawVal, staff, marketFilter);
                                    return (
                                      <div key={`tn2-${staff.fullId}`} className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-sm">
                                        <div className="flex justify-between items-center mb-1 gap-2">
                                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{staff.displayName}</span>
                                          <span className="text-[9px] font-black text-emerald-600 flex-shrink-0">{formatValueForDisplay(tong || 0, true)}</span>
                                        </div>
                                        <textarea
                                          className="w-full p-1.5 rounded-lg border border-slate-200 text-[10px] font-black font-sans focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all bg-slate-50/50 hover:bg-white resize-none"
                                          rows={1}
                                          placeholder="Dán dữ liệu thưởng..."
                                          value={rawVal}
                                          onChange={(e) => {
                                            const updated = { ...parsedTnData, [staff.fullId]: e.target.value };
                                            setThunhap3t2(JSON.stringify(updated));
                                          }}
                                          onPaste={() => {
                                            autoCopyNextStaff(staff.fullId);
                                          }}
                                          onKeyUp={() => {
                                            handleStaffInputKeyUp(staff.fullId);
                                          }}
                                        />
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">THI ĐUA NHÂN VIÊN ({rankMonth2})</label>
                              <span className="text-[10px] font-black text-indigo-600">{nganhhang2Sum.toLocaleString('vi-VN')}</span>
                            </div>
                            <textarea
                              value={nganhhang3t2}
                              onChange={(e) => setNganhhang3t2(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Thi đua ${rankMonth2}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Thi Đua Siêu Thị ({rankMonth2})</label>
                              <span className="text-[10px] font-black text-purple-600">{thidua2Sum.toLocaleString('vi-VN')}</span>
                            </div>
                            <textarea
                              value={thidua3t2}
                              onChange={(e) => setThidua3t2(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Thi đua siêu thị ${rankMonth2}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Trả Chậm ({rankMonth2})</label>
                              <span className="text-[10px] font-black text-rose-600">{Math.round(tracham2Sum)}%</span>
                            </div>
                            <textarea
                              value={tracham3t2}
                              onChange={(e) => setTracham3t2(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Trả chậm ${rankMonth2}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono bg-white"
                            />
                          </div>

                        </div>
                      </div>

                      {/* Month 3 Inputs */}
                      <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-black">3</span>
                            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Cột 3</h4>
                            <button
                              type="button"
                              onClick={handleShift3to2}
                              className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200/60 transition-all ml-1 cursor-pointer"
                              title="Dịch toàn bộ dữ liệu Cột 3 sang Cột 2 và xóa Cột 3"
                            >
                              <ArrowLeft size={12} /> Sang Cột 2
                            </button>
                          </div>
                          <select
                            value={rankMonth3}
                            onChange={(e) => setRankMonth3(e.target.value)}
                            className="text-xs font-black text-violet-600 bg-violet-50/50 border border-violet-100 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
                          >
                            {Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">DOANH THU NHÂN VIÊN ({rankMonth3})</label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setConfirmModal({ title: 'Đồng bộ Doanh Thu NV', message: 'Đồng bộ dữ liệu từ CẬP NHẬT > CẤU HÌNH SIÊU THỊ > DOANH THU NV vào cột ' + rankMonth3 + '?\nDữ liệu cũ sẽ bị ghi đè.', variant: 'info', onConfirm: () => { if (staffInput) setDtqd3t3(staffInput); else alert('Chưa có dữ liệu Doanh Thu NV từ CẤU HÌNH SIÊU THỊ'); } })}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                  title="Đồng bộ từ CẤU HÌNH SIÊU THỊ > DOANH THU NV"
                                >
                                  <RefreshCw size={9} />Đồng bộ
                                </button>
                                <span className="text-[10px] font-black text-violet-600">{formatValueForDisplay(dtqd3Sum)}</span>
                              </div>
                            </div>
                            <textarea
                              value={dtqd3t3}
                              onChange={(e) => setDtqd3t3(e.target.value)}
                              placeholder={`Dán cột Nhân viên & DTQĐ ${rankMonth3}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div 
                              onClick={() => setShowIncome3(!showIncome3)}
                              className="flex justify-between items-center mb-1.5 cursor-pointer hover:opacity-80 transition-all select-none"
                            >
                              <div className="flex items-center gap-1">
                                <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block cursor-pointer">Dữ Liệu Thu Nhập ({rankMonth3})</label>
                                {showIncome3 ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmModal({
                                      title: 'Đồng bộ từ Thưởng NV',
                                      message: 'Đồng bộ dữ liệu từ Thưởng NV (hiện tại) vào Thu Nhập ' + rankMonth3 + '?\nNV đã có dữ liệu thưởng sẽ được ghi đè.',
                                      variant: 'info',
                                      onConfirm: () => {
                                        const newTnData: Record<string, string> = {};
                                        filteredBiData.forEach((staff) => {
                                          let hientai = thuongData[staff.fullId]?.hientai || '';
                                          if (!hientai) {
                                            const matchKey = Object.keys(thuongData).find(k => k === staff.fullId || (staff.id && (k === staff.id || k.startsWith(staff.id + ' '))));
                                            if (matchKey) hientai = thuongData[matchKey]?.hientai || '';
                                          }
                                          if (hientai.trim()) {
                                            newTnData[staff.fullId] = hientai;
                                          }
                                        });
                                        if (Object.keys(newTnData).length === 0) {
                                          alert('Chưa có dữ liệu thưởng ở tab THƯỞNG NV. Vui lòng dán dữ liệu vào tab THƯỞNG NV trước khi đồng bộ!');
                                          return;
                                        }
                                        setThunhap3t3(JSON.stringify(newTnData));
                                      }
                                    });
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                  title="Đồng bộ dữ liệu từ Thưởng NV"
                                >
                                  <RefreshCw size={9} />Đồng bộ
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmModal({ title: 'Xoá dữ liệu Thu Nhập', message: 'Xoá toàn bộ dữ liệu Thu Nhập ' + rankMonth3 + '?', variant: 'danger', onConfirm: () => setThunhap3t3('{}') }); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                  title="Xoá dữ liệu thu nhập"
                                >
                                  <Trash2 size={9} />Xoá
                                </button>
                                <span className="text-[10px] font-black text-emerald-600">{formatValueForDisplay(thunhap3Sum, true)}</span>
                              </div>
                            </div>
                            {showIncome3 && (
                              <div className="space-y-3 max-h-[320px] overflow-y-auto p-3 bg-slate-100/50 rounded-2xl border border-slate-200/60 shadow-inner">
                                {(() => {
                                  let parsedTnData: Record<string, string> = {};
                                  try {
                                    parsedTnData = JSON.parse(thunhap3t3) || {};
                                  } catch {}
                                  return filteredBiData.map((staff) => {
                                    const rawVal = parsedTnData[staff.fullId] || '';
                                    const { tong } = parseBonusData(rawVal, staff, marketFilter);
                                    return (
                                      <div key={`tn3-${staff.fullId}`} className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-sm">
                                        <div className="flex justify-between items-center mb-1 gap-2">
                                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{staff.displayName}</span>
                                          <span className="text-[9px] font-black text-emerald-600 flex-shrink-0">{formatValueForDisplay(tong || 0, true)}</span>
                                        </div>
                                        <textarea
                                          className="w-full p-1.5 rounded-lg border border-slate-200 text-[10px] font-black font-sans focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all bg-slate-50/50 hover:bg-white resize-none"
                                          rows={1}
                                          placeholder="Dán dữ liệu thưởng..."
                                          value={rawVal}
                                          onChange={(e) => {
                                            const updated = { ...parsedTnData, [staff.fullId]: e.target.value };
                                            setThunhap3t3(JSON.stringify(updated));
                                          }}
                                          onPaste={() => {
                                            autoCopyNextStaff(staff.fullId);
                                          }}
                                          onKeyUp={() => {
                                            handleStaffInputKeyUp(staff.fullId);
                                          }}
                                        />
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">THI ĐUA NHÂN VIÊN ({rankMonth3})</label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setConfirmModal({ title: 'Đồng bộ Thi Đua NV', message: 'Đồng bộ dữ liệu từ CẬP NHẬT > CẤU HÌNH SIÊU THỊ > THI ĐUA NV vào cột ' + rankMonth3 + '?\nDữ liệu cũ sẽ bị ghi đè.', variant: 'info', onConfirm: () => { if (thiDuaNv) setNganhhang3t3(thiDuaNv); else alert('Chưa có dữ liệu Thi Đua NV từ CẤU HÌNH SIÊU THỊ'); } })}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                  title="Đồng bộ từ CẤU HÌNH SIÊU THỊ > THI ĐUA NV"
                                >
                                  <RefreshCw size={9} />Đồng bộ
                                </button>
                                <span className="text-[10px] font-black text-indigo-600">{nganhhang3Sum.toLocaleString('vi-VN')}</span>
                              </div>
                            </div>
                            <textarea
                              value={nganhhang3t3}
                              onChange={(e) => setNganhhang3t3(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Thi đua ${rankMonth3}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Thi Đua Siêu Thị ({rankMonth3})</label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setConfirmModal({ title: 'Đồng bộ Thi Đua Siêu Thị', message: 'Đồng bộ dữ liệu từ CẬP NHẬT > THI ĐUA CỤM > LUỸ KẾ TĐ vào cột ' + rankMonth3 + '?\nDữ liệu cũ sẽ bị ghi đè.', variant: 'info', onConfirm: () => { if (luyKeNganhHang) setThidua3t3(luyKeNganhHang); else alert('Chưa có dữ liệu Thi Đua Siêu Thị từ THI ĐUA CỤM'); } })}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                  title="Đồng bộ từ THI ĐUA CỤM > LUỸ KẾ TĐ"
                                >
                                  <RefreshCw size={9} />Đồng bộ
                                </button>
                                <span className="text-[10px] font-black text-purple-600">{thidua3Sum.toLocaleString('vi-VN')}</span>
                              </div>
                            </div>
                            <textarea
                              value={thidua3t3}
                              onChange={(e) => setThidua3t3(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Thi đua siêu thị ${rankMonth3}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Trả Chậm ({rankMonth3})</label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setConfirmModal({ title: 'Đồng bộ Trả Chậm', message: 'Đồng bộ dữ liệu từ CẬP NHẬT > CẤU HÌNH SIÊU THỊ > TRẢ GÓP NV vào cột ' + rankMonth3 + '?\nDữ liệu cũ sẽ bị ghi đè.', variant: 'info', onConfirm: () => { if (tragopNv) setTracham3t3(tragopNv); else alert('Chưa có dữ liệu Trả Góp NV từ CẤU HÌNH SIÊU THỊ'); } })}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                                  title="Đồng bộ từ CẤU HÌNH SIÊU THỊ > TRẢ GÓP NV"
                                >
                                  <RefreshCw size={9} />Đồng bộ
                                </button>
                                <span className="text-[10px] font-black text-rose-600">{Math.round(tracham3Sum)}%</span>
                              </div>
                            </div>
                            <textarea
                              value={tracham3t3}
                              onChange={(e) => setTracham3t3(e.target.value)}
                              placeholder={`Dán cột Nhân viên & Trả chậm ${rankMonth3}...`}
                              className="w-full h-24 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono bg-white"
                            />
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Control Panel Card */}
                  {filteredRank3TData.length > 0 && (
                    <div className="bg-white rounded-[24px] p-4 border border-slate-200/60 shadow-sm flex flex-wrap items-center justify-between gap-4 max-w-full mx-auto w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Cấu hình bảng xếp hạng</span>
                      </div>
                      <div className="flex items-center gap-6">
                        {/* Toggle switch for "Doanh Thu QĐ" */}
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
                            Doanh Thu QĐ
                          </span>
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={showDtqdGroup}
                              onChange={(e) => setShowDtqdGroup(e.target.checked)}
                            />
                            <div className={cn(
                              "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                              showDtqdGroup ? "bg-amber-500" : "bg-slate-200"
                            )} />
                            <div className={cn(
                              "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                              showDtqdGroup ? "transform translate-x-4" : ""
                            )} />
                          </div>
                        </label>

                        {/* Toggle switch for "Ngành Hàng" */}
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
                            Ngành Hàng
                          </span>
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={showNganhHangGroup}
                              onChange={(e) => setShowNganhHangGroup(e.target.checked)}
                            />
                            <div className={cn(
                              "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                              showNganhHangGroup ? "bg-indigo-500" : "bg-slate-200"
                            )} />
                            <div className={cn(
                              "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                              showNganhHangGroup ? "transform translate-x-4" : ""
                            )} />
                          </div>
                        </label>

                        {/* Toggle switch for "Hiệu Quả QĐ" */}
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
                            Hiệu Quả QĐ
                          </span>
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={showEffGroup}
                              onChange={(e) => setShowEffGroup(e.target.checked)}
                            />
                            <div className={cn(
                              "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                              showEffGroup ? "bg-sky-500" : "bg-slate-200"
                            )} />
                            <div className={cn(
                              "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                              showEffGroup ? "transform translate-x-4" : ""
                            )} />
                          </div>
                        </label>

                        {/* Premium custom toggle switch for "Hiển thị Thu Nhập" */}
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
                            Thu Nhập
                          </span>
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={showThuNhapGroup}
                              onChange={(e) => setShowThuNhapGroup(e.target.checked)}
                            />
                            <div className={cn(
                              "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                              showThuNhapGroup ? "bg-orange-500" : "bg-slate-200"
                            )} />
                            <div className={cn(
                              "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                              showThuNhapGroup ? "transform translate-x-4" : ""
                            )} />
                          </div>
                        </label>

                        {/* Toggle switch for "Trả Chậm" */}
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
                            Trả Chậm
                          </span>
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={showTraChamGroup}
                              onChange={(e) => setShowTraChamGroup(e.target.checked)}
                            />
                            <div className={cn(
                              "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                              showTraChamGroup ? "bg-rose-500" : "bg-slate-200"
                            )} />
                            <div className={cn(
                              "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                              showTraChamGroup ? "transform translate-x-4" : ""
                            )} />
                          </div>
                        </label>

                        {/* Premium custom toggle switch for "Chi tiết các tháng" */}
                        <label className="flex items-center gap-2 cursor-pointer select-none group border-l pl-4 border-slate-200">
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
                            Chi tiết tháng
                          </span>
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={showMonthlyDtqd}
                              onChange={(e) => setShowMonthlyDtqd(e.target.checked)}
                            />
                            <div className={cn(
                              "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                              showMonthlyDtqd ? "bg-emerald-500" : "bg-slate-200"
                            )} />
                            <div className={cn(
                              "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                              showMonthlyDtqd ? "transform translate-x-4" : ""
                            )} />
                          </div>
                        </label>

                        {/* New Toggles for Projected Months */}
                        {(parseInt(rankMonth1.replace(/\D/g, '')) || 4) === new Date().getMonth() + 1 && (
                          <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm group">
                            <span className="flex items-center gap-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
                              <TrendingUp size={16} /> DỰ KIẾN THÁNG {(parseInt(rankMonth1.replace(/\D/g, '')) || 4)}
                            </span>
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isProjectedMonth1}
                                onChange={(e) => setIsProjectedMonth1(e.target.checked)}
                              />
                              <div className={cn(
                                "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                                isProjectedMonth1 ? "bg-amber-500" : "bg-slate-200"
                              )} />
                              <div className={cn(
                                "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                                isProjectedMonth1 ? "transform translate-x-4" : ""
                              )} />
                            </div>
                          </label>
                        )}
                        {(parseInt(rankMonth2.replace(/\D/g, '')) || 5) === new Date().getMonth() + 1 && (
                          <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm group">
                            <span className="flex items-center gap-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
                              <TrendingUp size={16} /> DỰ KIẾN THÁNG {(parseInt(rankMonth2.replace(/\D/g, '')) || 5)}
                            </span>
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isProjectedMonth2}
                                onChange={(e) => setIsProjectedMonth2(e.target.checked)}
                              />
                              <div className={cn(
                                "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                                isProjectedMonth2 ? "bg-amber-500" : "bg-slate-200"
                              )} />
                              <div className={cn(
                                "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                                isProjectedMonth2 ? "transform translate-x-4" : ""
                              )} />
                            </div>
                          </label>
                        )}
                        {(parseInt(rankMonth3.replace(/\D/g, '')) || 6) === new Date().getMonth() + 1 && (
                          <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm group">
                            <span className="flex items-center gap-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
                              <TrendingUp size={16} /> DỰ KIẾN THÁNG {(parseInt(rankMonth3.replace(/\D/g, '')) || 6)}
                            </span>
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isProjectedMonth3}
                                onChange={(e) => setIsProjectedMonth3(e.target.checked)}
                              />
                              <div className={cn(
                                "w-9 h-5 rounded-full transition-colors duration-300 ease-in-out shadow-inner",
                                isProjectedMonth3 ? "bg-amber-500" : "bg-slate-200"
                              )} />
                              <div className={cn(
                                "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out",
                                isProjectedMonth3 ? "transform translate-x-4" : ""
                              )} />
                            </div>
                          </label>
                        )}

                        {/* Capture button */}
                        <button
                          onClick={handleCaptureRank3T}
                          disabled={isCapturing}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:from-[#1D4ED8] hover:to-[#4338CA] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Camera size={15} /> CHỤP ẢNH BẢNG
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ranking Table Section */}
                  <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto w-full">
                    <div
                      ref={captureRank3TRef}
                      className="w-full bg-white rounded-[40px] overflow-hidden p-4 md:p-6"
                    >
                      {filteredRank3TData.length > 0 ? (
                        <>
                          {/* Banner Header */}
                          <div className="w-full bg-white border border-slate-200 border-b-0 rounded-t-[32px] overflow-hidden flex divide-x divide-slate-200 shadow-sm">
                            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#0f172a] uppercase tracking-tight mb-2">BẢNG XẾP HẠNG NHÂN VIÊN 3 THÁNG</h2>
                              <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[13px] text-slate-500 uppercase tracking-widest">
                                TỔNG HỢP LUỸ KẾ {rankMonth1}, {rankMonth2.replace('Tháng ', '')}, {rankMonth3.replace('Tháng ', '')}
                              </span>
                            </div>
                            <div className="w-2/5 p-6 flex flex-col items-center justify-center bg-slate-50/50 relative">
                              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[24px] text-[#00965e] uppercase tracking-tight mb-2 text-center">TỔNG HỢP</h2>
                              <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[13px] text-slate-500 uppercase tracking-widest">
                                Siêu thị: {marketFilter}
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-white border border-slate-200 rounded-b-[32px] overflow-hidden shadow-lg shadow-slate-200/30">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[#0f172a] border-collapse table-fixed" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900, minWidth: '100%' }}>
                                <colgroup>
                                  <col style={{ width: '55px' }} />
                                  <col style={{ width: '220px' }} />
                                  {showDtqdGroup && (
                                    <>
                                      {showMonthlyDtqd && (
                                        <>
                                          <col style={{ width: '110px' }} />
                                          <col style={{ width: '110px' }} />
                                          <col style={{ width: '110px' }} />
                                        </>
                                      )}
                                      <col style={{ width: '120px' }} />
                                      <col style={{ width: '160px' }} />
                                    </>
                                  )}
                                  {showNganhHangGroup && (
                                    <>
                                      {showMonthlyDtqd && (
                                        <>
                                          <col style={{ width: '120px' }} />
                                          <col style={{ width: '120px' }} />
                                          <col style={{ width: '120px' }} />
                                        </>
                                      )}
                                      <col style={{ width: '140px' }} />
                                      <col style={{ width: '160px' }} />
                                    </>
                                  )}
                                  {showEffGroup && (
                                    <>
                                      {showMonthlyDtqd && (
                                        <>
                                          <col style={{ width: '110px' }} />
                                          <col style={{ width: '110px' }} />
                                          <col style={{ width: '110px' }} />
                                        </>
                                      )}
                                      <col style={{ width: '120px' }} />
                                      <col style={{ width: '160px' }} />
                                    </>
                                  )}
                                  {showThuNhapGroup && (
                                    <>
                                      {showMonthlyDtqd && (
                                        <>
                                          <col style={{ width: '110px' }} />
                                          <col style={{ width: '110px' }} />
                                          <col style={{ width: '110px' }} />
                                        </>
                                      )}
                                      <col style={{ width: '120px' }} />
                                      <col style={{ width: '160px' }} />
                                    </>
                                  )}
                                  {showTraChamGroup && (
                                    <>
                                      {showMonthlyDtqd && (
                                        <>
                                          <col style={{ width: '110px' }} />
                                          <col style={{ width: '110px' }} />
                                          <col style={{ width: '110px' }} />
                                        </>
                                      )}
                                      <col style={{ width: '120px' }} />
                                      <col style={{ width: '160px' }} />
                                    </>
                                  )}
                                  <col style={{ width: '180px' }} />
                                </colgroup>
                                <thead className="text-slate-900 uppercase border-b border-slate-200">
                                  <tr>
                                    <th rowSpan={2} style={{ width: '55px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-2 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black align-middle whitespace-nowrap">STT</th>
                                    <th rowSpan={2} style={{ width: '220px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-4 py-3 border-r border-white/20 text-[#0f172a] font-sans font-black align-middle whitespace-nowrap">NHÂN VIÊN</th>
                                    {showDtqdGroup && (
                                      <th colSpan={showMonthlyDtqd ? 5 : 2} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-2.5 border-r border-b border-white/20 text-[#0f172a] bg-[#ffcb05] font-sans font-black text-center text-sm md:text-base tracking-wide uppercase whitespace-nowrap">
                                        DOANH THU QUY ĐỔI THÁNG {rankMonth1.replace(/tháng\s*/i, '')}, {rankMonth2.replace(/tháng\s*/i, '')}, {rankMonth3.replace(/tháng\s*/i, '')}
                                      </th>
                                    )}
                                    {showNganhHangGroup && (
                                      <th colSpan={showMonthlyDtqd ? 5 : 2} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-2.5 border-r border-b border-white/20 text-white bg-[#6366f1] font-sans font-black text-center text-sm md:text-base tracking-wide uppercase whitespace-nowrap">
                                        NGÀNH HÀNG THI ĐUA THÁNG {rankMonth1.replace(/tháng\s*/i, '')}, {rankMonth2.replace(/tháng\s*/i, '')}, {rankMonth3.replace(/tháng\s*/i, '')}
                                      </th>
                                    )}
                                    {showEffGroup && (
                                      <th colSpan={showMonthlyDtqd ? 5 : 2} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-2.5 border-r border-b border-white/20 text-[#0f172a] bg-[#38bdf8] font-sans font-black text-center text-sm md:text-base tracking-wide uppercase whitespace-nowrap">
                                        HIỆU QUẢ QĐ THÁNG {rankMonth1.replace(/tháng\s*/i, '')}, {rankMonth2.replace(/tháng\s*/i, '')}, {rankMonth3.replace(/tháng\s*/i, '')}
                                      </th>
                                    )}
                                    {showThuNhapGroup && (
                                      <th colSpan={showMonthlyDtqd ? 5 : 2} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-2.5 border-r border-b border-white/20 text-white bg-[#f58220] font-sans font-black text-center text-sm md:text-base tracking-wide uppercase whitespace-nowrap">
                                        THU NHẬP THÁNG {rankMonth1.replace(/tháng\s*/i, '')}, {rankMonth2.replace(/tháng\s*/i, '')}, {rankMonth3.replace(/tháng\s*/i, '')}
                                      </th>
                                    )}
                                    {showTraChamGroup && (
                                      <th colSpan={showMonthlyDtqd ? 5 : 2} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-2.5 border-r border-b border-white/20 text-white bg-[#e11d48] font-sans font-black text-center text-sm md:text-base tracking-wide uppercase whitespace-nowrap">
                                        TRẢ CHẬM THÁNG {rankMonth1.replace(/tháng\s*/i, '')}, {rankMonth2.replace(/tháng\s*/i, '')}, {rankMonth3.replace(/tháng\s*/i, '')}
                                      </th>
                                    )}
                                    <th rowSpan={2} style={{ width: '180px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#0f172a' }} className="px-4 py-3 text-center border-r border-white/20 text-white font-sans font-black align-middle whitespace-nowrap">
                                      <div className="text-sm uppercase tracking-wider text-amber-400 font-black">ĐÁNH GIÁ NHÂN VIÊN</div>
                                    </th>
                                  </tr>
                                  <tr>
                                    {showDtqdGroup && (
                                      <>
                                        {showMonthlyDtqd && (
                                          <>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-4 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">DTQĐ {rankMonth1.replace('Tháng ', 'T')}{isProjectedMonth1 ? ' (DK)' : ''}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-4 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">DTQĐ {rankMonth2.replace('Tháng ', 'T')}{isProjectedMonth2 ? ' (DK)' : ''}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-4 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">DTQĐ {rankMonth3.replace('Tháng ', 'T')}{isProjectedMonth3 ? ' (DK)' : ''}</th>
                                          </>
                                        )}
                                        <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">DTQĐ TB</th>
                                        <th style={{ width: '160px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-3 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">TOP / BOT (20%)</th>
                                      </>
                                    )}

                                    {showNganhHangGroup && (
                                      <>
                                        {showMonthlyDtqd && (
                                          <>
                                            <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#6366f1' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">N.HÀNG {rankMonth1.replace('Tháng ', 'T')}{isProjectedMonth1 ? ' (DK)' : ''}</th>
                                            <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#6366f1' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">N.HÀNG {rankMonth2.replace('Tháng ', 'T')}{isProjectedMonth2 ? ' (DK)' : ''}</th>
                                            <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#6366f1' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">N.HÀNG {rankMonth3.replace('Tháng ', 'T')}{isProjectedMonth3 ? ' (DK)' : ''}</th>
                                          </>
                                        )}
                                        <th style={{ width: '140px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#4f46e5' }} className="px-6 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">N.HÀNG TB</th>
                                        <th style={{ width: '160px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#4338ca' }} className="px-3 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TOP / BOT (20%)</th>
                                      </>
                                    )}

                                    {showEffGroup && (
                                      <>
                                        {showMonthlyDtqd && (
                                          <>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#0284c7' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">HQ {rankMonth1.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#0284c7' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">HQ {rankMonth2.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#0284c7' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">HQ {rankMonth3.replace('Tháng ', 'T')}</th>
                                          </>
                                        )}
                                        <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#0369a1' }} className="px-6 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">HQ TB</th>
                                        <th style={{ width: '160px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#075985' }} className="px-3 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TOP / BOT (20%)</th>
                                      </>
                                    )}

                                    {showThuNhapGroup && (
                                      <>
                                        {showMonthlyDtqd && (
                                          <>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TN {rankMonth1.replace('Tháng ', 'T')}{isProjectedMonth1 ? ' (DK)' : ''}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TN {rankMonth2.replace('Tháng ', 'T')}{isProjectedMonth2 ? ' (DK)' : ''}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TN {rankMonth3.replace('Tháng ', 'T')}{isProjectedMonth3 ? ' (DK)' : ''}</th>
                                          </>
                                        )}
                                        <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ea580c' }} className="px-6 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TN TB</th>
                                        <th style={{ width: '160px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#c2410c' }} className="px-3 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TOP / BOT (20%)</th>
                                      </>
                                    )}

                                    {showTraChamGroup && (
                                      <>
                                        {showMonthlyDtqd && (
                                          <>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#e11d48' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TC {rankMonth1.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#e11d48' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TC {rankMonth2.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#e11d48' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TC {rankMonth3.replace('Tháng ', 'T')}</th>
                                          </>
                                        )}
                                        <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#be123c' }} className="px-6 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TC TB</th>
                                        <th style={{ width: '160px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#881337' }} className="px-3 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TOP / BOT (20%)</th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '14px' }}>
                                  {filteredRank3TData.map((row: any, i: number) => {
                                    const isStriped = i % 2 === 1;
                                    const key = row.id || row.name;
                                    const tbDtqd = rank3TTopBotStats.stats[key] || { top: 0, bot: 0 };
                                    const tbNh = rank3TNganhHangTopBotStats.stats[key] || { top: 0, bot: 0 };
                                    const tbEff = rank3TEffQdTopBotStats.stats[key] || { top: 0, bot: 0 };
                                    const tbTn = rank3TThuNhapTopBotStats.stats[key] || { top: 0, bot: 0 };
                                    const tbTc = rank3TTraChamTopBotStats.stats[key] || { top: 0, bot: 0 };

                                    return (
                                      <tr key={i} className="bg-white hover:bg-slate-50 h-[48px]">
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-2 py-3 text-center border-r border-slate-100 bg-[#fef08a] text-[#0f172a] font-black whitespace-nowrap">{i + 1}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-3 border-r border-slate-100 bg-white text-[#0f172a] uppercase font-black truncate max-w-[220px]" title={row.name}>{row.name}</td>
                                        {showDtqdGroup && (
                                          <>
                                            {showMonthlyDtqd && (
                                              <>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-100 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TTopBotStats.sets?.botM1Keys.has(key) ? "bg-[#ffe4e6] text-[#be123c]" :
                                                  rank3TTopBotStats.sets?.topM1Keys.has(key) ? "bg-[#d1fae5] text-[#065f46]" :
                                                  "bg-white text-slate-700"
                                                )}>
                                                  {formatCurrencyValue(row.dtqd1)}
                                                </td>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-100 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TTopBotStats.sets?.botM2Keys.has(key) ? "bg-[#ffe4e6] text-[#be123c]" :
                                                  rank3TTopBotStats.sets?.topM2Keys.has(key) ? "bg-[#d1fae5] text-[#065f46]" :
                                                  "bg-white text-slate-700"
                                                )}>
                                                  {formatCurrencyValue(row.dtqd2)}
                                                </td>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-100 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TTopBotStats.sets?.botM3Keys.has(key) ? "bg-[#ffe4e6] text-[#be123c]" :
                                                  rank3TTopBotStats.sets?.topM3Keys.has(key) ? "bg-[#d1fae5] text-[#065f46]" :
                                                  "bg-white text-slate-700"
                                                )}>
                                                  {formatCurrencyValue(row.dtqd3)}
                                                </td>
                                              </>
                                            )}
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                              "px-6 py-3 text-center border-r border-slate-100 font-mono font-black whitespace-nowrap transition-colors",
                                              tbDtqd.top > 0 ? "bg-[#d1fae5] text-[#065f46]" :
                                              tbDtqd.bot > 0 ? "bg-[#ffe4e6] text-[#be123c]" :
                                              "bg-white text-slate-700"
                                            )}>
                                              {(() => {
                                                const avgDtqd = row.dtqd / 3;
                                                return formatCurrencyValue(avgDtqd);
                                              })()}
                                            </td>
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-100 text-[12px] whitespace-nowrap bg-white">
                                              {tbDtqd.top > 0 ? (
                                                 <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-black text-xs">TOP</span>
                                               ) : tbDtqd.bot > 0 ? (
                                                 <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>
                                               ) : (
                                                 <span className="text-slate-300 font-normal text-xs">-</span>
                                               )}
                                            </td>
                                          </>
                                        )}

                                        {showNganhHangGroup && (
                                          <>
                                            {showMonthlyDtqd && (
                                              <>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TNganhHangTopBotStats.sets?.botM1Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TNganhHangTopBotStats.sets?.topM1Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-indigo-50/10 text-indigo-700"
                                                )}>
                                                  {(() => {
                                                    const sc = rank3TNganhHangScores[key];
                                                    return sc ? sc.m1Text : '-';
                                                  })()}
                                                </td>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TNganhHangTopBotStats.sets?.botM2Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TNganhHangTopBotStats.sets?.topM2Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-indigo-50/10 text-indigo-700"
                                                )}>
                                                  {(() => {
                                                    const sc = rank3TNganhHangScores[key];
                                                    return sc ? sc.m2Text : '-';
                                                  })()}
                                                </td>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TNganhHangTopBotStats.sets?.botM3Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TNganhHangTopBotStats.sets?.topM3Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-indigo-50/10 text-indigo-700"
                                                )}>
                                                  {(() => {
                                                    const sc = rank3TNganhHangScores[key];
                                                    return sc ? sc.m3Text : '-';
                                                  })()}
                                                </td>
                                              </>
                                            )}
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                              "px-6 py-3 text-center border-r border-slate-200 font-mono font-black whitespace-nowrap transition-colors",
                                              tbNh.top > 0 ? "bg-[#d1fae5] text-[#065f46]" :
                                              tbNh.bot > 0 ? "bg-[#ffe4e6] text-[#be123c]" :
                                              "bg-indigo-50/10 text-indigo-600"
                                            )}>
                                              {(() => {
                                                const sc = rank3TNganhHangScores[key];
                                                if (sc && sc.hasData) return sc.totalText;
                                                return row.nganhhang.toLocaleString('vi-VN');
                                              })()}
                                            </td>
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-indigo-50/20">
                                              {tbNh.top > 0 ? (
                                                 <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-800 font-black text-xs">TOP</span>
                                               ) : tbNh.bot > 0 ? (
                                                 <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>
                                               ) : (
                                                 <span className="text-slate-300 font-normal text-xs">-</span>
                                               )}
                                            </td>
                                          </>
                                        )}

                                        {showEffGroup && (
                                          <>
                                            {showMonthlyDtqd && (
                                              <>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TEffQdTopBotStats.sets?.botM1Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TEffQdTopBotStats.sets?.topM1Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-sky-50/10 text-sky-700"
                                                )}>
                                                  {(() => {
                                                    const val = row.effQd1 || 0;
                                                    if (!val) return '0%';
                                                    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}%`;
                                                  })()}
                                                </td>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TEffQdTopBotStats.sets?.botM2Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TEffQdTopBotStats.sets?.topM2Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-sky-50/10 text-sky-700"
                                                )}>
                                                  {(() => {
                                                    const val = row.effQd2 || 0;
                                                    if (!val) return '0%';
                                                    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}%`;
                                                  })()}
                                                </td>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TEffQdTopBotStats.sets?.botM3Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TEffQdTopBotStats.sets?.topM3Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-sky-50/10 text-sky-700"
                                                )}>
                                                  {(() => {
                                                    const val = row.effQd3 || 0;
                                                    if (!val) return '0%';
                                                    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}%`;
                                                  })()}
                                                </td>
                                              </>
                                            )}
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                               "px-6 py-3 text-center border-r border-slate-200 font-mono font-black whitespace-nowrap",
                                               tbEff.top > 0 ? "bg-emerald-100 text-emerald-800" : tbEff.bot > 0 ? "bg-rose-100 text-rose-700" : "bg-white text-slate-900"
                                             )}>
                                               {(() => {
                                                 const val = row.effQd || 0;
                                                 if (!val) return '0%';
                                                 return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}%`;
                                               })()}
                                            </td>
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-sky-50/20">
                                              {tbEff.top > 0 ? (
                                                 <span className="px-2.5 py-1 rounded bg-sky-100 text-sky-800 font-black text-xs">TOP</span>
                                               ) : tbEff.bot > 0 ? (
                                                 <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>
                                               ) : (
                                                 <span className="text-slate-300 font-normal text-xs">-</span>
                                               )}
                                            </td>
                                          </>
                                        )}

                                        {showThuNhapGroup && (
                                          <>
                                            {showMonthlyDtqd && (
                                               <>
                                                 <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                   "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                   rank3TThuNhapTopBotStats.sets?.botM1Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                   rank3TThuNhapTopBotStats.sets?.topM1Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                   "bg-orange-50/10 text-[#00965e]"
                                                 )}>
                                                   {(() => {
                                                     const val = row.thunhap1 || 0;
                                                     if (!val) return '0';
                                                     return formatCurrencyValue(val);
                                                   })()}
                                                 </td>
                                                 <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                   "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                   rank3TThuNhapTopBotStats.sets?.botM2Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                   rank3TThuNhapTopBotStats.sets?.topM2Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                   "bg-orange-50/10 text-[#00965e]"
                                                 )}>
                                                   {(() => {
                                                     const val = row.thunhap2 || 0;
                                                     if (!val) return '0';
                                                     return formatCurrencyValue(val);
                                                   })()}
                                                 </td>
                                                 <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                   "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                   rank3TThuNhapTopBotStats.sets?.botM3Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                   rank3TThuNhapTopBotStats.sets?.topM3Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                   "bg-orange-50/10 text-[#00965e]"
                                                 )}>
                                                   {(() => {
                                                     const val = row.thunhap3 || 0;
                                                     if (!val) return '0';
                                                     return formatCurrencyValue(val);
                                                   })()}
                                                 </td>
                                               </>
                                             )}
                                             <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#00965e] font-black bg-orange-50/10 whitespace-nowrap">
                                               {(() => {
                                                 const avgTn = row.thunhap / 3;
                                                 return formatCurrencyValue(avgTn);
                                               })()}
                                             </td>
                                             <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-orange-50/20">
                                               {(() => {
                                                  const avgTn = row.thunhap / 3;
                                                  if (avgTn === 0) {
                                                    return <span className="text-slate-300 font-normal text-xs">-</span>;
                                                  }
                                                  if (tbTn.top > 0) {
                                                    return <span className="px-2.5 py-1 rounded bg-orange-100 text-orange-800 font-black text-xs">TOP</span>;
                                                  }
                                                  if (tbTn.bot > 0) {
                                                    return <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>;
                                                  }
                                                  return <span className="text-slate-300 font-normal text-xs">-</span>;
                                               })()}
                                             </td>
                                          </>
                                        )}
                                        {showTraChamGroup && (
                                           <>
                                             {showMonthlyDtqd && (
                                                <>
                                                  <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                    "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                    rank3TTraChamTopBotStats.sets?.botM1Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                    rank3TTraChamTopBotStats.sets?.topM1Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                    "bg-rose-50/10 text-rose-700"
                                                  )}>
                                                    {row.tracham1 ? Math.round(row.tracham1) + '%' : '0%'}
                                                  </td>
                                                  <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                    "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                    rank3TTraChamTopBotStats.sets?.botM2Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                    rank3TTraChamTopBotStats.sets?.topM2Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                    "bg-rose-50/10 text-rose-700"
                                                  )}>
                                                    {row.tracham2 ? Math.round(row.tracham2) + '%' : '0%'}
                                                  </td>
                                                  <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                    "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                    rank3TTraChamTopBotStats.sets?.botM3Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                    rank3TTraChamTopBotStats.sets?.topM3Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                    "bg-rose-50/10 text-rose-700"
                                                  )}>
                                                    {row.tracham3 ? Math.round(row.tracham3) + '%' : '0%'}
                                                  </td>
                                                </>
                                              )}
                                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                "px-6 py-3 text-center border-r border-slate-200 font-mono font-black whitespace-nowrap transition-colors",
                                                tbTc.top > 0 ? "bg-[#d1fae5] text-[#065f46]" :
                                                tbTc.bot > 0 ? "bg-[#ffe4e6] text-[#be123c]" :
                                                "bg-rose-50/10 text-rose-700"
                                              )}>
                                                {(() => {
                                                  const avgTc = Math.round(row.tracham / 3);
                                                  return avgTc > 0 ? avgTc + '%' : '0%';
                                                })()}
                                              </td>
                                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-rose-50/20">
                                                {(() => {
                                                   const avgTc = Math.round(row.tracham / 3);
                                                   if (avgTc === 0) {
                                                     return <span className="text-slate-300 font-normal text-xs">-</span>;
                                                   }
                                                   if (tbTc.top > 0) {
                                                     return <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-black text-xs">TOP</span>;
                                                   }
                                                   if (tbTc.bot > 0) {
                                                     return <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>;
                                                   }
                                                   return <span className="text-slate-300 font-normal text-xs">-</span>;
                                                })()}
                                              </td>
                                           </>
                                         )}
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center text-[12px] whitespace-nowrap bg-slate-900/5">
                                          {(() => {
                                            const tbTn = rank3TThuNhapTopBotStats.stats[key] || { top: 0, bot: 0 };
                                            const avgTn = row.thunhap / 3;
                                            const effectiveTbTn = avgTn === 0 ? { top: 0, bot: 0 } : tbTn;
                                            
                                            const tbTc = rank3TTraChamTopBotStats.stats[key] || { top: 0, bot: 0 };
                                            const avgTc = Math.round(row.tracham / 3);
                                            const effectiveTbTc = avgTc === 0 ? { top: 0, bot: 0 } : tbTc;

                                            const totalTop = (showDtqdGroup ? tbDtqd.top : 0) + 
                                                             (showNganhHangGroup ? tbNh.top : 0) + 
                                                             (showEffGroup ? tbEff.top : 0) + 
                                                             (showThuNhapGroup ? effectiveTbTn.top : 0) +
                                                             (showTraChamGroup ? effectiveTbTc.top : 0);

                                            const totalBot = (showDtqdGroup ? tbDtqd.bot : 0) + 
                                                             (showNganhHangGroup ? tbNh.bot : 0) + 
                                                             (showEffGroup ? tbEff.bot : 0) + 
                                                             (showThuNhapGroup ? effectiveTbTn.bot : 0) +
                                                             (showTraChamGroup ? effectiveTbTc.bot : 0);
                                            return (
                                              <div className="inline-flex items-center gap-1.5 font-black justify-center">
                                                <span className={totalTop > 0 ? "text-emerald-700 font-black text-sm" : "text-slate-400 text-sm"}>
                                                  TOP - {totalTop}
                                                </span>
                                                <span className="text-slate-300 font-normal">||</span>
                                                <span className={totalBot > 0 ? "text-rose-600 font-black text-sm" : "text-slate-400 text-sm"}>
                                                  BOT - {totalBot}
                                                </span>
                                              </div>
                                            );
                                          })()}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
                          <Trophy size={48} className="mx-auto text-slate-300 mb-4 animate-pulse" />
                          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">CHƯA CÓ DỮ LIỆU XẾP HẠNG</h3>
                          <p className="text-slate-400 text-sm font-medium">Vui lòng dán dữ liệu cột Nhân viên và giá trị số tương ứng vào các ô dán dữ liệu phía trên để tổng hợp.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'GIA_TRI_DH' && (
                <GiaTriDhTab
                  nganhhangChinhNv={nganhhangChinhNv}
                  saveNganhhangChinhNv={saveNganhhangChinhNv}
                  handleAutoPasteNganhHangChinh={handleAutoPasteNganhHangChinh}
                  renderLoadingOverlay={renderLoadingOverlay}
                  searchTerm={searchTerm}
                  selectedStaffIds={selectedStaffIds}
                  biRevenueData={biRevenueData}
                  parsedTraChamRows={parsedTraChamRows}
                  tragopNv={tragopNv}
                  onPreviewImage={setPreviewImage}
                />
              )}


            </AnimatePresence>
            )}
          </div>
        </div>
      </main>
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />

      {/* ⚔️ Head-to-Head Staff Comparison Modal */}
      <StaffComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        staffList={comparisonStaffList}
        initialStaffAId={compareStaffAId}
        initialStaffBId={compareStaffBId}
        detailCategories={detailComparisonCategories}
        luykeCategories={processedData.categories.filter((c: any) => isCategoryForMarket(c, marketFilter))}
        categoryTargets={categoryTargets}
        staffCount={filteredBiData.length > 0 ? filteredBiData.length : 1}
        daysPassed={daysPassed}
        totalDays={totalDays}
        onPreviewImage={setPreviewImage}
      />
      {/* Custom Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={() => setConfirmModal(null)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/60 p-0 w-[380px] max-w-[90vw] overflow-hidden"
            >
              <div className={`px-6 pt-6 pb-4 ${confirmModal.variant === 'danger' ? 'bg-gradient-to-br from-rose-50 to-white' : 'bg-gradient-to-br from-blue-50 to-white'}`}>
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${confirmModal.variant === 'danger' ? 'bg-rose-100' : 'bg-blue-100'}`}>
                    {confirmModal.variant === 'danger' 
                      ? <Trash2 size={20} className="text-rose-600" />
                      : <RefreshCw size={20} className="text-blue-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-black text-slate-900 leading-tight">{confirmModal.title}</h3>
                    <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed whitespace-pre-line">{confirmModal.message}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 pb-6 pt-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-black hover:bg-slate-50 active:bg-slate-100 transition-all active:scale-[0.98]"
                >
                  Huỷ
                </button>
                <button
                  onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-white text-[13px] font-black transition-all active:scale-[0.98] shadow-lg ${
                    confirmModal.variant === 'danger' 
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-200' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200'
                  }`}
                >
                  {confirmModal.variant === 'danger' ? 'Xoá' : 'Đồng bộ'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Universal Comment Modal - Portal to document.body */}
      {commentModal.isOpen && ReactDOM.createPortal(
        <div className="no-capture fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-xs" onClick={() => setCommentModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[580px] w-[95vw] mx-4 overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header - Orange gradient */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  {commentModal.title}
                </span>
              </div>
              <button onClick={() => setCommentModal(prev => ({ ...prev, isOpen: false }))} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Template Tabs */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">Chọn mẫu nội dung nhận xét:</p>
              <div className="flex gap-2">
                {commentModal.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      const text = commentModal.generator(tab.id);
                      setCommentModal(prev => ({ ...prev, template: tab.id, text }));
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer border",
                      commentModal.template === tab.id
                        ? "bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide mt-2">
                Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
              </p>
              <textarea
                value={commentModal.text}
                onChange={(e) => setCommentModal(prev => ({ ...prev, text: e.target.value }))}
                rows={12}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(commentModal.text);
                      setCopiedComment(true);
                      setTimeout(() => setCopiedComment(false), 2000);
                    } catch { /* fallback */ }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    copiedComment 
                      ? 'text-white bg-emerald-500 border border-emerald-600' 
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500'
                  }`}
                >
                  {copiedComment ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Sao chép nhận xét</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* 🌟 Center Loading / Success Modal for CẬP NHẬT DATA */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <AnimatePresence>
          {syncNganhHangModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
            >
              <div
                className="absolute inset-0 bg-black/45 backdrop-blur-md"
                onClick={() => {
                  if (syncNganhHangModal.status !== 'loading') {
                    setSyncNganhHangModal(prev => ({ ...prev, isOpen: false }));
                  }
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                className="relative bg-white rounded-[28px] shadow-2xl border border-slate-100 p-7 max-w-md w-full text-center space-y-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {syncNganhHangModal.status === 'loading' && (
                  <div className="space-y-4 py-2">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                      <Loader2 size={36} className="animate-spin" />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', sans-serif" }} className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        ĐANG LOAD DỮ LIỆU...
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        {syncNganhHangModal.message || 'Đang kết nối hệ thống BI và trích xuất dữ liệu chi tiết...'}
                      </p>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                )}

                {syncNganhHangModal.status === 'success' && (
                  <div className="space-y-4 py-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.35 }}
                      className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30"
                    >
                      <Check size={36} className="stroke-[3]" />
                    </motion.div>
                    <div>
                      <h3 style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', sans-serif" }} className="text-lg font-black text-emerald-700 uppercase tracking-tight">
                        ĐÃ CẬP NHẬT DỮ LIỆU XONG!
                      </h3>
                      <p className="text-xs text-slate-600 font-semibold mt-1">
                        {syncNganhHangModal.message || 'Dữ liệu đã được nạp vào bảng phân tích Giá Trị Đơn Hàng.'}
                      </p>
                    </div>
                  </div>
                )}

                {syncNganhHangModal.status === 'warning' && (
                  <div className="space-y-4 py-2">
                    <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                      <AlertCircle size={36} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', sans-serif" }} className="text-base font-black text-amber-900 uppercase tracking-tight">
                        CHƯA CÓ DỮ LIỆU TỪ BI
                      </h3>
                      <p className="text-xs text-amber-800 font-medium mt-1.5 leading-relaxed bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60">
                        {syncNganhHangModal.message || 'Vui lòng chọn đúng Siêu thị trên BI và bấm nút AUTO COPY trước!'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <button
                        onClick={() => {
                          setSyncNganhHangModal(prev => ({ ...prev, isOpen: false }));
                          handleAutoPasteNganhHangChinh();
                        }}
                        className="w-full sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <RefreshCw size={14} /> Thử lại
                      </button>
                      <button
                        onClick={() => {
                          setSyncNganhHangModal(prev => ({ ...prev, isOpen: false }));
                          window.open('https://bi.thegioididong.com/khoi-ban-hang-sub?id=73920&tab=bcth&rt=1&dm=1', '_blank');
                        }}
                        className="w-full sm:flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Mở trang BI
                      </button>
                      <button
                        onClick={() => setSyncNganhHangModal(prev => ({ ...prev, isOpen: false }))}
                        className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Unified Global Capture Loading Overlay */}
      <CaptureLoadingOverlay isLoading={isCapturing} />
    </div>
  );
};

export default EmployeeHealth;
