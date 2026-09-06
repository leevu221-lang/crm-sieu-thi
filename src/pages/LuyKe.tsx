/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import * as htmlToImage from 'html-to-image';
import { domToPng } from 'modern-screenshot';
import html2canvas from 'html2canvas';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { 
  RefreshCw, ShoppingBag, TrendingUp, Camera, LayoutGrid, Activity, Globe, ChevronDown, Zap, Upload, Trash2, 
  HelpCircle, FileSpreadsheet, X, AlertCircle, Trophy, Target, BarChart3, CreditCard, Calendar, ArrowUpRight, 
  ArrowDownRight, MessageSquare, Layers, Store, Smartphone, Watch, Monitor, Award, Filter, Sparkles, Loader2, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../components/CaptureLoadingOverlay';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { useStore } from '../contexts/StoreContext';
import OverviewDashboard from './RTST/components/OverviewDashboard';
import CategoryTable from './RTST/components/CategoryTable';
import { BonusCalculatorForm } from './BonusCalculatorForm';

import { ConfirmationModal } from './RTST/components/Modals';
import { getCustomCategoryIndex } from './EmployeeHealth/components/SummaryThiDuaTable';
import { normalize, isKhoLuuDong, cleanNum } from './RTST/utils';
import BcDtNganhHang from './BcDtNganhHang';
import SSGBoss from './SSGBoss';
import ClusterReportTab from './ClusterReportTab';

const getCategoryGroup = (name: string): 'yellow' | 'green' | 'blue' => {
  const normalized = name.toLowerCase().trim();
  
  if (
    normalized.includes('credit') ||
    normalized.includes('shin') ||
    normalized.includes('finance') ||
    normalized.includes('ví trả sau') ||
    normalized.includes('cake') ||
    normalized.includes('ngân hàng') ||
    normalized.includes('vpbank') ||
    normalized.includes('tpbank') ||
    normalized.includes('bảo hiểm') ||
    normalized.includes('sim') ||
    normalized.includes('vas') ||
    normalized.includes('mango') ||
    normalized.includes('icallme') ||
    normalized.includes('icall')
  ) {
    return 'green';
  }
  
  if (
    normalized.includes('điện thoại') ||
    normalized.includes('vivo') ||
    normalized.includes('realme') ||
    normalized.includes('phụ kiện') ||
    normalized.includes('đồng hồ') ||
    normalized.includes('camera') ||
    normalized.includes('pin sạc') ||
    normalized === 'loa' ||
    normalized.startsWith('loa ')
  ) {
    return 'yellow';
  }
  
  return 'blue';
};

const getCategoryGroupOrder = (name: string): number => {
  const group = getCategoryGroup(name);
  if (group === 'yellow') return 1; // ICT
  if (group === 'green') return 2;  // DỊCH VỤ
  return 3;                         // ĐMX
};

const parseNumericValue = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const str = String(val).trim();
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  
  if (hasComma && hasDot) {
    const commaIndex = str.indexOf(',');
    const dotIndex = str.indexOf('.');
    if (dotIndex < commaIndex) {
      // Vietnamese: 1.155.067,68 -> strip dots, replace comma with dot
      return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
    } else {
      // English: 1,155,067.68 -> strip commas
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  }
  
  if (hasComma) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(str.replace(/,/g, '.')) || 0;
    } else {
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  }
  
  if (hasDot) {
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      return parseFloat(str.replace(/\./g, '')) || 0;
    }
  }
  
  return parseFloat(str) || 0;
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: any;
  trend?: number;
  color?: 'rose' | 'indigo' | 'emerald' | 'amber' | 'orange' | 'blue' | 'default';
  delay?: number;
  isLarge?: boolean;
}> = ({ title, value, subValue, icon: Icon, trend, color = 'default', delay = 0, isLarge = false }) => {
  const gradientMap: Record<string, string> = {
    rose: 'bg-gradient-to-br from-[#E11D48] via-[#E11D48] to-[#BE123C] text-white shadow-rose-500/20 border-rose-400/30',
    indigo: 'bg-gradient-to-br from-[#4F46E5] via-[#4338CA] to-[#3730A3] text-white shadow-indigo-500/20 border-indigo-400/30',
    emerald: 'bg-gradient-to-br from-[#059669] via-[#047857] to-[#065F46] text-white shadow-emerald-500/20 border-emerald-400/30',
    amber: 'bg-gradient-to-br from-[#F97316] via-[#EA580C] to-[#C2410C] text-white shadow-orange-500/20 border-orange-400/30',
    orange: 'bg-gradient-to-br from-[#F97316] via-[#FB923C] to-[#F59E0B] text-white shadow-amber-500/20 border-amber-400/30',
    blue: 'bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white shadow-blue-500/20 border-blue-400/30',
    default: 'bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white shadow-slate-900/20 border-slate-700/30'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.15 }}
      className={`p-3.5 sm:p-5 rounded-2xl md:rounded-3xl border shadow-lg relative overflow-hidden flex flex-col justify-between ${gradientMap[color]} ${isLarge ? 'md:col-span-2' : ''}`}
      style={{ fontFamily: "'UTM Avo', sans-serif" }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-nowrap min-w-0">
        <div
          className="stat-card-badge inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 whitespace-nowrap shrink-0 max-w-full"
          style={{ whiteSpace: 'nowrap' }}
        >
          <Icon size={12} strokeWidth={2.5} className="shrink-0 text-white" />
          <span
            className="stat-card-title whitespace-nowrap leading-none truncate text-white"
            style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all', color: '#ffffff' }}
          >
            {title}
          </span>
        </div>
        {trend !== undefined && (
          <div
            className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black bg-white/25 backdrop-blur-md ml-auto shrink-0 border border-white/20 whitespace-nowrap text-white"
            style={{ whiteSpace: 'nowrap' }}
          >
            {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <div
          className="font-bold text-[24px] xs:text-[29px] sm:text-[36px] md:text-[44px] lg:text-[48px] tracking-tight whitespace-nowrap drop-shadow-sm leading-none py-0.5 sm:py-1 text-white font-oswald truncate"
          style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          {value}
        </div>
        {subValue && (
          <div
            className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] font-bold text-white/80 truncate whitespace-nowrap"
            style={{ fontFamily: "'UTM Avo', sans-serif", whiteSpace: 'nowrap' }}
          >
            {subValue}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const LuyKe: React.FC<{ pageMaintenanceState?: Record<string, boolean>, isUser43751Local?: boolean }> = ({ pageMaintenanceState = {}, isUser43751Local = false }) => {
  const { userProfile } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { marketFilter, setMarketFilter, availableMarkets } = useMarket();
  const { activeLuyKeTab: activeTab, setActiveLuyKeTab: setActiveTab, currentStoreId } = useStore();
  const filteredMarkets = React.useMemo(() => {
    return (availableMarkets || []).filter(m => !isKhoLuuDong(m.name));
  }, [availableMarkets]);
  const [maKho, setMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');

  const is43751 = userProfile?.username === '43751';



  const {
    clusterSummaryInput, setClusterSummaryInput,
    clusterCategoryInput, setClusterCategoryInput,
    staffInput,
    staffCategoryInput,
    tragopMatran,
    activeStore,
    categoryTargets,
    processedData: displayData,
    processData,
    saveLuykeData,
    syncFromRealtime,
    isLoading
  } = useLuykeData(maKho);

  const { 
    daysPassed, totalDays, 
    stName, setStName,
    stTargetQuyDoi, setStTargetQuyDoi,
    allStoreTargets,
    stDtDuKienQD, setStDtDuKienQD,
    stDtlk, setStDtlk,
    stDtqd, setStDtqd,
    stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD,
    stPercentTarget, setStPercentTarget,
    stTargetSauHeSo, setStTargetSauHeSo,
    storeSettings,
    saveStoreRevenue,
    loadStoreRevenue,
    isLoadingStoreRevenue,
    isSavingStoreRevenue,
    isValidStoreName,
    VALID_STORE_PREFIXES,
    excelFileName, setExcelFileName,
    thuongStRows, setThuongStRows,
    topPercentRankLimit, setTopPercentRankLimit,
    excelOldFileName, setExcelOldFileName,
    thuongStOldRows, setThuongStOldRows,
    topPercentRankLimitOld, setTopPercentRankLimitOld,
    saveExcelThuongStData
  } = useRTSTSharedData(maKho);

  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>(() => {
    return localStorage.getItem('rtst_selected_store_filter') || 'ALL';
  });
  const [isProcessingData, setIsProcessingData] = useState(false);

  // Sort modes for Category tables in BC Tháng:
  // 'HT_DESC' (%HT giảm dần - mặc định) | 'HT_ASC' (%HT tăng dần) | 'CONLAI_DESC' (C.Lại giảm dần - thiếu nhiều nhất lên đầu) | 'CONLAI_ASC' (C.Lại tăng dần)
  const [sortModeSL, setSortModeSL] = useState<'HT_DESC' | 'HT_ASC' | 'CONLAI_DESC' | 'CONLAI_ASC'>('HT_DESC');
  const [sortModeDT, setSortModeDT] = useState<'HT_DESC' | 'HT_ASC' | 'CONLAI_DESC' | 'CONLAI_ASC'>('HT_DESC');

  const sortCategoryList = (list: any[], mode: 'HT_DESC' | 'HT_ASC' | 'CONLAI_DESC' | 'CONLAI_ASC') => {
    return [...list].sort((a: any, b: any) => {
      let rateA = 0, rateB = 0;
      if (a.target > 0 && daysPassed > 0) rateA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
      if (b.target > 0 && daysPassed > 0) rateB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;

      const remA = a.target - a.revenue;
      const remB = b.target - b.revenue;

      if (mode === 'CONLAI_DESC') {
        // C.LẠI GIẢM DẦN: Ngành thiếu nhiều nhất lên trước
        if (remA > 0 && remB > 0) return remB - remA;
        if (remA > 0 && remB <= 0) return -1;
        if (remA <= 0 && remB > 0) return 1;
        return remB - remA;
      }

      if (mode === 'CONLAI_ASC') {
        // C.LẠI TĂNG DẦN: Đạt rồi (0) hoặc thiếu ít nhất lên trước
        if (remA <= 0 && remB > 0) return -1;
        if (remA > 0 && remB <= 0) return 1;
        return remA - remB;
      }

      if (mode === 'HT_ASC') {
        return rateA - rateB;
      }

      // Default: HT_DESC (%HT cao nhất)
      return rateB - rateA;
    });
  };

  useEffect(() => {
    localStorage.setItem('rtst_selected_store_filter', selectedStoreFilter);
  }, [selectedStoreFilter]);

  // Unique store names derived from cluster markets
  const uniqueExcelStores = React.useMemo(() => {
    return filteredMarkets.map((m: any) => m.name).sort();
  }, [filteredMarkets]);

  const lastSyncedMarketFilterRef = useRef<string | null>(null);

  // Synchronize store filter with global context or select first available store
  useEffect(() => {
    if (uniqueExcelStores.length === 0) {
      // Don't reset to ALL while markets are still loading from DB/context
      return;
    }

    if (marketFilter && marketFilter !== 'ALL' && marketFilter !== lastSyncedMarketFilterRef.current) {
      lastSyncedMarketFilterRef.current = marketFilter;
      const normFilter = normalize(marketFilter);
      const match = uniqueExcelStores.find((store: string) => {
        const normStore = normalize(store);
        return normStore === normFilter || normStore.includes(normFilter) || normFilter.includes(normStore);
      });
      if (match) {
        setSelectedStoreFilter(match);
        return;
      }
    }

    const savedFilter = localStorage.getItem('rtst_selected_store_filter');
    if (savedFilter && savedFilter !== 'ALL') {
      const normSaved = normalize(savedFilter);
      const match = uniqueExcelStores.find(s => {
        const normS = normalize(s);
        return normS === normSaved || normS.includes(normSaved) || normSaved.includes(normS);
      });
      if (match) {
        if (selectedStoreFilter !== match) setSelectedStoreFilter(match);
        return;
      }
    }

    if (selectedStoreFilter && selectedStoreFilter !== 'ALL' && uniqueExcelStores.includes(selectedStoreFilter)) {
      return;
    }

    if (uniqueExcelStores.length > 0) {
      setSelectedStoreFilter(uniqueExcelStores[0]);
    }
  }, [uniqueExcelStores, marketFilter, selectedStoreFilter]);

  // Helper to read File as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) resolve(e.target.result as ArrayBuffer);
        else reject(new Error('Không thể đọc dữ liệu file'));
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  };

  // Helper to parse Excel file buffer for THƯỞNG THI ĐUA
  const parseThuongStExcelBuffer = (dataBuffer: ArrayBuffer, fileName: string, availableMarketsList?: any[]) => {
    const wb = XLSX.read(dataBuffer, { type: 'array' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' }) as any[][];

    if (!data || data.length === 0) {
      throw new Error(`File ${fileName} không có dữ liệu!`);
    }

    let headerRowIndex = -1;
    let storeIdx = -1;
    let categoryIdx = -1;
    let limitColIdx = -1;
    const completionIdx = 5; // Column F
    const completionRankIdx = 9; // Column J
    const exceededRankIdx = 8; // Column I
    const bonusIdx = 12; // Column M
    let detectedLimit = 7;

    // 1. Scan for headers and limit (by checking current row and next row combined)
    for (let r = 0; r < Math.min(data.length, 50); r++) {
      const row = data[r];
      const nextRow = data[r + 1];
      if (!row) continue;

      let tempStoreIdx = -1;
      let tempCategoryIdx = -1;
      let tempLimitColIdx = -1;

      for (let c = 0; c < row.length; c++) {
        const cellVal1 = String(row[c] || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const cellVal2 = nextRow ? String(nextRow[c] || '').toLowerCase().replace(/\s+/g, ' ').trim() : '';
        const cellValCombined = `${cellVal1} ${cellVal2}`.trim();

        const isMatch = (term: string) => {
          return cellVal1.includes(term) || cellVal2.includes(term) || cellValCombined.includes(term);
        };

        // Check for Top 10% limit
        if (isMatch('hạng top') || isMatch('top 10% để có thưởng') || isMatch('hạng top 10%') || isMatch('top 10% kênh') || isMatch('top 10%') || isMatch('top10%')) {
          tempLimitColIdx = c;
          const cleanLimitText = cellValCombined.replace(/\d+%/g, '').replace(/top\s*10/g, '');
          const match = cleanLimitText.match(/\d+/);
          if (match) {
            detectedLimit = parseInt(match[0], 10);
          } else if (c + 1 < row.length) {
            const nextCellVal = String(row[c + 1] || '').replace(/\d+%/g, '').replace(/top\s*10/g, '');
            const match2 = nextCellVal.match(/\d+/);
            if (match2) {
              detectedLimit = parseInt(match2[0], 10);
            }
          }
        }

        // Match headers for store and category
        if (isMatch('siêu thị') || cellVal1 === 'st' || cellVal2 === 'st' || isMatch('tên kho') || isMatch('mã kho') || isMatch('mã siêu thị') || isMatch('tên siêu thị') || isMatch('tên st')) {
          tempStoreIdx = c;
        } else if (isMatch('nhóm hàng') || isMatch('ngành hàng') || cellVal1 === 'nhóm' || cellVal2 === 'nhóm' || isMatch('category') || isMatch('nhóm sp')) {
          tempCategoryIdx = c;
        }
      }

      // We consider the row containing the category keyword as the header row
      if (tempCategoryIdx !== -1 && headerRowIndex === -1) {
        headerRowIndex = r;
        storeIdx = tempStoreIdx;
        categoryIdx = tempCategoryIdx;
        limitColIdx = tempLimitColIdx;
      }
    }

    // Fallback for limitColIdx if not detected
    if (limitColIdx === -1) {
      limitColIdx = 8; // Column I (index 8)
    }

    // Fallback detection if headers are not found by labels
    if (storeIdx === -1 || categoryIdx === -1) {
      const colScoresStore = new Array(30).fill(0);
      const colScoresCategory = new Array(30).fill(0);

      const sampleRows = data.slice(0, Math.min(data.length, 50));
      // Pre-normalize market names once to avoid repeated normalization in loops
      const normMarketNames = (availableMarketsList || []).map((m: any) => normalize(m.name || '')).filter(Boolean);

      sampleRows.forEach(row => {
        if (!row) return;
        for (let c = 0; c < Math.min(row.length, 30); c++) {
          const cellVal = String(row[c] || '').trim();
          if (!cellVal) continue;

          const normVal = normalize(cellVal);

          // Score for store: check if it matches any availableMarkets name
          const matchesMarket = normMarketNames.some(normMName => {
            return normVal === normMName || normVal.includes(normMName) || normMName.includes(normVal);
          });
          if (matchesMarket) {
            colScoresStore[c] += 1;
          }
          
          // Score for category: check if the name is a known category/group
          const lowerVal = cellVal.toLowerCase();
          const isCategoryTerm = 
            lowerVal.includes('điện thoại') || 
            lowerVal.includes('phụ kiện') || 
            lowerVal.includes('đồng hồ') || 
            lowerVal.includes('credit') || 
            lowerVal.includes('máy lạnh') || 
            lowerVal.includes('tủ lạnh') || 
            lowerVal.includes('máy giặt') || 
            lowerVal.includes('điện tử') || 
            lowerVal.includes('gia dụng') || 
            lowerVal.includes('loa');
          if (isCategoryTerm) {
            colScoresCategory[c] += 1;
          }
        }
      });
      
      if (storeIdx === -1) {
        let maxStoreScore = 0;
        let bestStoreCol = -1;
        for (let c = 0; c < colScoresStore.length; c++) {
          if (colScoresStore[c] > maxStoreScore) {
            maxStoreScore = colScoresStore[c];
            bestStoreCol = c;
          }
        }
        storeIdx = (bestStoreCol !== -1 && maxStoreScore > 0) ? bestStoreCol : 0;
      }
      
      if (categoryIdx === -1) {
        let maxCategoryScore = 0;
        let bestCategoryCol = -1;
        for (let c = 0; c < colScoresCategory.length; c++) {
          if (colScoresCategory[c] > maxCategoryScore) {
            maxCategoryScore = colScoresCategory[c];
            bestCategoryCol = c;
          }
        }
        categoryIdx = (bestCategoryCol !== -1 && maxCategoryScore > 0) ? bestCategoryCol : (storeIdx === 0 ? 1 : 0);
      }
    }

    // 2. Parse rows after header
    const parsedRows: any[] = [];
    const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

    for (let r = startRow; r < data.length; r++) {
      const row = data[r];
      if (!row) continue;

      // Check if row is empty or total/summary row
      const firstCellVal = (categoryIdx !== -1 && row.length > categoryIdx) ? row[categoryIdx] : (row.length > 0 ? row[0] : '');
      const firstCell = String(firstCellVal || '').toLowerCase();
      if (!firstCell || firstCell.includes('tổng cộng') || firstCell === 'tổng' || firstCell.includes('total') || firstCell.includes('báo cáo')) {
        continue;
      }

      const categoryName = (categoryIdx !== -1 && row.length > categoryIdx) ? String(row[categoryIdx] || '').trim() : '';
      if (!categoryName) continue;

      // Ignore header-like names if they are parsed as row values
      const lowerCat = categoryName.toLowerCase();
      if (lowerCat.includes('nhóm hàng') || lowerCat.includes('ngành hàng') || lowerCat.includes('category') || lowerCat.includes('nhóm sp') || lowerCat === 'nhóm') {
        continue;
      }

      const storeName = (storeIdx !== -1 && row.length > storeIdx) ? String(row[storeIdx] || '').trim() : '';
      
      let completionVal = 0;
      if (row.length > completionIdx) {
        const rawVal = row[completionIdx];
        if (typeof rawVal === 'number') {
          // Trong file Excel thi đua, cột % hoàn thành luôn là tỷ lệ thập phân (0.985 = 98.5%, 2.058 = 205.8%, 23.296 = 2329.6%)
          completionVal = rawVal * 100;
        } else if (typeof rawVal === 'string') {
          const str = rawVal.trim();
          if (str.includes('%')) {
            completionVal = parseNumericValue(str.replace(/%/g, ''));
          } else {
            const num = parseNumericValue(str);
            // Nếu lưu dạng chuỗi thập phân "0.985" < 1.0
            if (num > 0 && num < 1.0) {
              completionVal = num * 100;
            } else {
              completionVal = num;
            }
          }
        }
      }

      const completionRank = (row.length > completionRankIdx) ? Math.round(parseNumericValue(row[completionRankIdx])) : 0;
      const exceededRank = (row.length > exceededRankIdx) ? Math.round(parseNumericValue(row[exceededRankIdx])) : 0;
      const bonus = (row.length > bonusIdx) ? Math.round(parseNumericValue(row[bonusIdx])) : 0;
      const limit = (limitColIdx !== -1 && row.length > limitColIdx) ? Math.round(parseNumericValue(row[limitColIdx])) : detectedLimit;

      parsedRows.push({
        storeName,
        categoryName,
        completion: completionVal,
        completionRank,
        exceededRank,
        bonus,
        limit
      });
    }

    return {
      parsedRows,
      detectedLimit,
      fileName
    };
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingData(true);
    // Yield to UI thread so the loading overlay renders before heavy CPU work
    await new Promise(r => setTimeout(r, 50));
    try {
      if (files.length >= 2) {
        // User uploaded 2 files simultaneously:
        // File 1 (index 0 - added first) = Old / Yesterday file
        // File 2 (index 1 - added second) = New / Today file
        const fileOld = files[0];
        const fileNew = files[1];

        const [bufOld, bufNew] = await Promise.all([
          readFileAsArrayBuffer(fileOld),
          readFileAsArrayBuffer(fileNew)
        ]);

        const resOld = parseThuongStExcelBuffer(bufOld, fileOld.name, filteredMarkets);
        const resNew = parseThuongStExcelBuffer(bufNew, fileNew.name, filteredMarkets);

        if (resNew.parsedRows.length === 0 || resOld.parsedRows.length === 0) {
          alert('Không tìm thấy dòng dữ liệu nhóm hàng nào phù hợp trong các file tải lên!');
          return;
        }

        saveExcelThuongStData(
          resNew.parsedRows,
          resNew.fileName,
          resNew.detectedLimit,
          filteredMarkets.map((m: any) => m.name),
          resOld.parsedRows,
          resOld.fileName,
          resOld.detectedLimit
        );
      } else {
        // Single file uploaded -> Pure DOMINO Mechanism:
        const file = files[0];
        const buffer = await readFileAsArrayBuffer(file);
        const resNew = parseThuongStExcelBuffer(buffer, file.name, filteredMarkets);

        if (resNew.parsedRows.length === 0) {
          alert('Không tìm thấy dòng dữ liệu nhóm hàng nào phù hợp!');
          return;
        }

        const hasExistingTodayData = (selectedStoreExcelData.rows && selectedStoreExcelData.rows.length > 0) || (thuongStRows && thuongStRows.length > 0) || !!activeExcelFileName;

        if (hasExistingTodayData) {
          // DOMINO EFFECT:
          // Existing Today file shifts to become Yesterday (Old) file.
          // Newly uploaded file becomes Today (New) file.
          saveExcelThuongStData(
            resNew.parsedRows,
            resNew.fileName,
            resNew.detectedLimit,
            filteredMarkets.map((m: any) => m.name),
            selectedStoreExcelData.rows && selectedStoreExcelData.rows.length > 0 ? selectedStoreExcelData.rows : thuongStRows,
            selectedStoreExcelData.fileName || activeExcelFileName || excelFileName,
            selectedStoreExcelData.limit || topPercentRankLimit || 7
          );
        } else {
          // Initial single file upload: set as Today (New) file
          saveExcelThuongStData(
            resNew.parsedRows,
            resNew.fileName,
            resNew.detectedLimit,
            filteredMarkets.map((m: any) => m.name),
            [],
            '',
            7
          );
        }
      }
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      alert('Lỗi xử lý file Excel: ' + (err.message || 'Vui lòng kiểm tra định dạng file!'));
    } finally {
      setIsProcessingData(false);
      e.target.value = '';
    }
  };

  const handleSwapOldAndNew = () => {
    if (!selectedStoreExcelData.fileName && !selectedStoreExcelData.oldFileName) return;
    saveExcelThuongStData(
      selectedStoreExcelData.oldRows,
      selectedStoreExcelData.oldFileName,
      selectedStoreExcelData.oldLimit,
      filteredMarkets.map((m: any) => m.name),
      selectedStoreExcelData.rows,
      selectedStoreExcelData.fileName,
      selectedStoreExcelData.limit
    );
  };

  const handleClearOldFile = () => {
    saveExcelThuongStData(
      selectedStoreExcelData.rows,
      selectedStoreExcelData.fileName,
      selectedStoreExcelData.limit,
      filteredMarkets.map((m: any) => m.name),
      [],
      '',
      7
    );
  };

  const handleClearAllExcelData = async () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu thi đua (cả file mới và file cũ)?')) return;
    
    // Clear local state immediately for fast response
    setExcelFileName('');
    setThuongStRows([]);
    setTopPercentRankLimit(7);
    setExcelOldFileName('');
    setThuongStOldRows([]);
    setTopPercentRankLimitOld(7);

    // Save empty state to database
    await saveExcelThuongStData([], '', 7, filteredMarkets.map((m: any) => m.name), [], '', 7);
  };

  // Active competition file names from any store in cache, local state, or localStorage
  const activeExcelFileName = React.useMemo(() => {
    if (excelFileName) return excelFileName;
    for (const val of Object.values(allStoreTargets || {})) {
      if ((val as any)?.excelFileName) return (val as any).excelFileName;
    }
    for (const m of filteredMarkets) {
      const cached = allStoreTargets[m.name.toUpperCase()];
      if (cached?.excelFileName) return cached.excelFileName;
    }
    return localStorage.getItem('ST_EXCEL_FILE_NAME_V1') || '';
  }, [allStoreTargets, filteredMarkets, excelFileName]);

  const activeExcelOldFileName = React.useMemo(() => {
    if (excelOldFileName) return excelOldFileName;
    for (const m of filteredMarkets) {
      const cached = allStoreTargets[m.name.toUpperCase()];
      if (cached?.excelOldFileName) return cached.excelOldFileName;
    }
    for (const val of Object.values(allStoreTargets || {})) {
      if ((val as any)?.excelOldFileName) return (val as any).excelOldFileName;
    }
    return localStorage.getItem('ST_EXCEL_OLD_FILE_NAME_V1') || '';
  }, [allStoreTargets, filteredMarkets, excelOldFileName]);

  // Excel data for the store currently selected in the dropdown
  const selectedStoreExcelData = React.useMemo(() => {
    const targetStoreName = (selectedStoreFilter && selectedStoreFilter !== 'ALL')
      ? selectedStoreFilter
      : (stName || currentStoreId || (filteredMarkets[0]?.name) || '');

    const key = (targetStoreName || '').toUpperCase();
    let storeTarget = allStoreTargets[key];
    if (!storeTarget && key) {
      const normKey = normalize(key);
      for (const [k, val] of Object.entries(allStoreTargets)) {
        const normK = normalize(k);
        if (normK === normKey) {
          storeTarget = val;
          break;
        }
      }
      if (!storeTarget) {
        for (const [k, val] of Object.entries(allStoreTargets)) {
          const normK = normalize(k);
          if (normK.includes(normKey) || normKey.includes(normK)) {
            storeTarget = val;
            break;
          }
        }
      }
    }

    // Secondary pass: Match by 3-5 digit store warehouse code if present
    if (!storeTarget && key) {
      const codeMatch = key.match(/\b\d{3,5}\b/);
      if (codeMatch) {
        const code = codeMatch[0];
        for (const [k, val] of Object.entries(allStoreTargets)) {
          if (k.includes(code)) {
            storeTarget = val;
            break;
          }
        }
      }
    }

    // Fallback: ONLY look among cluster stores in filteredMarkets, NEVER an unrelated province or warehouse!
    if (!storeTarget || !storeTarget.thuongStRows || storeTarget.thuongStRows.length === 0) {
      for (const m of filteredMarkets) {
        const cTarget = allStoreTargets[m.name.toUpperCase()];
        if (cTarget?.thuongStRows && cTarget.thuongStRows.length > 0) {
          storeTarget = cTarget;
          break;
        }
      }
    }
    
    const effectiveRows = (storeTarget?.thuongStRows && storeTarget.thuongStRows.length > 0)
      ? storeTarget.thuongStRows
      : (thuongStRows || []);
    
    const effectiveFileName = storeTarget?.excelFileName || activeExcelFileName || excelFileName || '';
    const effectiveLimit = storeTarget?.topPercentRankLimit ?? topPercentRankLimit ?? 7;

    const effectiveOldRows = (storeTarget?.thuongStOldRows && storeTarget.thuongStOldRows.length > 0)
      ? storeTarget.thuongStOldRows
      : (thuongStOldRows || []);
    const effectiveOldFileName = storeTarget?.excelOldFileName || activeExcelOldFileName || excelOldFileName || '';
    const effectiveOldLimit = storeTarget?.topPercentRankLimitOld ?? topPercentRankLimitOld ?? 7;

    return {
      rows: effectiveRows,
      fileName: effectiveFileName,
      limit: effectiveLimit,
      oldRows: effectiveOldRows,
      oldFileName: effectiveOldFileName,
      oldLimit: effectiveOldLimit
    };
  }, [allStoreTargets, selectedStoreFilter, thuongStRows, excelFileName, topPercentRankLimit, thuongStOldRows, excelOldFileName, topPercentRankLimitOld, stName, currentStoreId, filteredMarkets, activeExcelFileName, activeExcelOldFileName]);

  const isComparing = React.useMemo(() => {
    return !!(selectedStoreExcelData.oldFileName && (selectedStoreExcelData.oldRows || []).length > 0);
  }, [selectedStoreExcelData.oldFileName, selectedStoreExcelData.oldRows]);

  const isExcelActive = React.useMemo(() => {
    if (activeExcelFileName || excelFileName || excelOldFileName) return true;
    if (selectedStoreExcelData.fileName || selectedStoreExcelData.oldFileName || selectedStoreExcelData.rows.length > 0) return true;
    const hasAnyTarget = Object.values(allStoreTargets || {}).some(
      (t: any) => !!t?.excelFileName || !!t?.excelOldFileName || (t?.thuongStRows || []).length > 0
    );
    if (hasAnyTarget) return true;
    return filteredMarkets.some((m: any) => {
      const cached = allStoreTargets[m.name.toUpperCase()];
      return !!cached?.excelFileName || !!cached?.excelOldFileName;
    });
  }, [allStoreTargets, filteredMarkets, excelFileName, excelOldFileName, selectedStoreExcelData, activeExcelFileName]);

  // Bonus Filter & Comment states for THƯỞNG ST
  // 'ALL' | 'BONUS' | 'DECREASED' | 'INCREASED'
  const [bonusFilterTab, setBonusFilterTab] = useState<'ALL' | 'BONUS' | 'DECREASED' | 'INCREASED'>('ALL');
  const [thuongStComment, setThuongStComment] = useState('');
  const [showThuongStComment, setShowThuongStComment] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [thuongStCommentOpen, setThuongStCommentOpen] = useState(false);
  const [copiedThuongStComment, setCopiedThuongStComment] = useState(false);
  const [thuongStTemplate, setThuongStTemplate] = useState<1 | 2 | 3>(1);

  // Enriched rows comparing today vs yesterday
  const comparedThuongStRows = React.useMemo(() => {
    const currentRows = selectedStoreExcelData.rows || [];
    const oldRows = selectedStoreExcelData.oldRows || [];

    // Create normalized lookup map for yesterday
    const oldMap = new Map<string, any>();
    oldRows.forEach((r: any) => {
      if (r.categoryName) {
        oldMap.set(normalize(r.categoryName), r);
      }
    });

    const enriched = currentRows.map((curRow: any) => {
      const normName = normalize(curRow.categoryName || '');
      const oldRow = oldMap.get(normName);

      const bonusCurrent = curRow.bonus || 0;
      const bonusOld = oldRow ? (oldRow.bonus || 0) : 0;
      const bonusDiff = bonusCurrent - bonusOld;

      const completionCurrent = curRow.completion || 0;
      const completionOld = oldRow ? (oldRow.completion || 0) : 0;
      const completionDiff = completionCurrent - completionOld;

      const completionRankCurrent = curRow.completionRank || 0;
      const completionRankOld = oldRow ? (oldRow.completionRank || 0) : 0;
      const completionRankDiff = (completionRankOld > 0 && completionRankCurrent > 0)
        ? (completionRankOld - completionRankCurrent) // Positive = jumped/improved ranks
        : 0;

      const exceededRankCurrent = curRow.exceededRank || 0;
      const exceededRankOld = oldRow ? (oldRow.exceededRank || 0) : 0;
      const exceededRankDiff = (exceededRankOld > 0 && exceededRankCurrent > 0)
        ? (exceededRankOld - exceededRankCurrent)
        : 0;

      const isBonusLost = bonusOld > 0 && bonusCurrent === 0;
      const isBonusDecreased = bonusDiff < 0;
      const isBonusIncreased = bonusDiff > 0;
      const isBonusGained = bonusOld === 0 && bonusCurrent > 0;
      const isBonusUnchanged = bonusCurrent > 0 && bonusDiff === 0;

      return {
        ...curRow,
        oldRow,
        bonusCurrent,
        bonusOld,
        bonusDiff,
        completionCurrent,
        completionOld,
        completionDiff,
        completionRankCurrent,
        completionRankOld,
        completionRankDiff,
        exceededRankCurrent,
        exceededRankOld,
        exceededRankDiff,
        isBonusLost,
        isBonusDecreased,
        isBonusIncreased,
        isBonusGained,
        isBonusUnchanged,
        hasComparison: !!oldRow
      };
    });

    return enriched;
  }, [selectedStoreExcelData.rows, selectedStoreExcelData.oldRows]);

  // Overall Statistics for today vs yesterday
  const thuongStStats = React.useMemo(() => {
    const all = comparedThuongStRows || [];
    const bonusRows = all.filter((r: any) => r.bonusCurrent > 0);
    const decreasedRows = all.filter((r: any) => r.isBonusDecreased).sort((a: any, b: any) => a.bonusDiff - b.bonusDiff);
    const increasedRows = all.filter((r: any) => r.isBonusIncreased).sort((a: any, b: any) => b.bonusDiff - a.bonusDiff);
    const lostRows = all.filter((r: any) => r.isBonusLost);
    const gainedRows = all.filter((r: any) => r.isBonusGained);

    const totalBonusCurrent = all.reduce((sum: number, r: any) => sum + r.bonusCurrent, 0);
    const totalBonusOld = all.reduce((sum: number, r: any) => sum + r.bonusOld, 0);
    const totalBonusDiff = totalBonusCurrent - totalBonusOld;

    const totalDecreasedAmount = decreasedRows.reduce((sum: number, r: any) => sum + Math.abs(r.bonusDiff), 0);
    const totalIncreasedAmount = increasedRows.reduce((sum: number, r: any) => sum + r.bonusDiff, 0);

    return {
      all,
      bonusRows,
      decreasedRows,
      increasedRows,
      lostRows,
      gainedRows,
      totalBonusCurrent,
      totalBonusOld,
      totalBonusDiff,
      totalDecreasedAmount,
      totalIncreasedAmount
    };
  }, [comparedThuongStRows]);

  const handleGenerateAIComment = (template: 1 | 2 | 3 = 1) => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      try {
        const stats = thuongStStats;
        const rows = comparedThuongStRows;
        const limit = selectedStoreExcelData.limit || 7;
        const totalBonus = stats.totalBonusCurrent;
        const totalBonusOld = stats.totalBonusOld;
        const diff = stats.totalBonusDiff;
        
        let generated = '';

        if (template === 1) {
          // MẪU 1: Tổng quan + Điểm sáng + Biến động so sánh
          const topPerformers = stats.bonusRows.slice(0, 4);
          const nonBonusRows = rows.filter((r: any) => (r.bonusCurrent || 0) === 0);
          const nearTopRows = nonBonusRows
            .filter((r: any) => (r.completionRankCurrent > 0 && r.completionRankCurrent <= limit + 4) || (r.exceededRankCurrent > 0 && r.exceededRankCurrent <= limit + 4) || r.completionCurrent >= 100)
            .slice(0, 3);
          const lines: string[] = [];

          lines.push(`🎯 ĐÁNH GIÁ TỔNG QUAN THI ĐUA SIÊU THỊ:`);
          lines.push(`• Tổng thưởng dự kiến: ${totalBonus.toLocaleString('vi-VN')} ₫ (${stats.bonusRows.length}/${rows.length} nhóm ngành đạt thưởng).`);
          
          if (isComparing) {
            if (diff > 0) {
              lines.push(`• 📈 BIẾN ĐỘNG SO VỚI HÔM QUA: TĂNG TRƯỞNG +${diff.toLocaleString('vi-VN')} ₫ (+${((diff / (totalBonusOld || 1)) * 100).toFixed(1)}% so với ${totalBonusOld.toLocaleString('vi-VN')} ₫).`);
            } else if (diff < 0) {
              lines.push(`• 📉 BIẾN ĐỘNG SO VỚI HÔM QUA: GIẢM -${Math.abs(diff).toLocaleString('vi-VN')} ₫ (${((diff / (totalBonusOld || 1)) * 100).toFixed(1)}% so với ${totalBonusOld.toLocaleString('vi-VN')} ₫).`);
            } else {
              lines.push(`• ⚖️ BIẾN ĐỘNG SO VỚI HÔM QUA: Duy trì ổn định, không thay đổi quỹ thưởng.`);
            }
          }

          if (stats.decreasedRows.length > 0 && isComparing) {
            lines.push(``);
            lines.push(`🚨 CÁC NGÀNH BỊ GIẢM THƯỞNG / MẤT THƯỞNG CẦN CHÚ Ý:`);
            stats.decreasedRows.forEach((r: any) => {
              if (r.isBonusLost) {
                const rankText = r.completionRankCurrent > 0 ? `Hạng #${r.completionRankCurrent}` : `Hạng VT #${r.exceededRankCurrent || '-'}`;
                lines.push(`• ${r.categoryName}: ⚠️ MẤT THƯỞNG (-${r.bonusOld.toLocaleString('vi-VN')} ₫) do rơi khỏi Top ${limit} (${rankText}, đạt ${r.completionCurrent.toFixed(1)}%).`);
              } else {
                lines.push(`• ${r.categoryName}: Giảm -${Math.abs(r.bonusDiff).toLocaleString('vi-VN')} ₫ (Hôm nay: ${r.bonusCurrent.toLocaleString('vi-VN')} ₫, Hôm qua: ${r.bonusOld.toLocaleString('vi-VN')} ₫).`);
              }
            });
          }

          if (topPerformers.length > 0) {
            lines.push(``);
            lines.push(`🌟 ĐIỂM SÁNG BỨT PHÁ (TOP THƯỞNG CAO NHẤT):`);
            topPerformers.forEach((p: any) => {
              const rankStr = p.completionRankCurrent > 0 && p.completionRankCurrent <= limit 
                ? `Hạng HT #${p.completionRankCurrent}` 
                : `Hạng VT #${p.exceededRankCurrent}`;
              const bonusAdd = isComparing && p.bonusDiff > 0 ? ` (▲ +${p.bonusDiff.toLocaleString('vi-VN')} ₫)` : '';
              lines.push(`• ${p.categoryName}: Đạt ${p.completionCurrent.toFixed(1)}% (${rankStr}) ➔ Thưởng: +${p.bonusCurrent.toLocaleString('vi-VN')} ₫${bonusAdd}`);
            });
          }

          if (nearTopRows.length > 0) {
            lines.push(``);
            lines.push(`🚀 CƠ HỘI BỨT PHÁ GIA TĂNG QUỸ THƯỞNG (SÁT TOP ${limit}):`);
            nearTopRows.forEach((n: any) => {
              const rankText = n.completionRankCurrent > 0 ? `Hạng ${n.completionRankCurrent}` : `Hạng VT ${n.exceededRankCurrent}`;
              lines.push(`• ${n.categoryName}: Đạt ${n.completionCurrent.toFixed(1)}% (${rankText}) ➔ Dồn lực tư vấn chốt deal để lọt Top ${limit} nhận thưởng.`);
            });
          }

          lines.push(``);
          lines.push(`💡 HÀNH ĐỘNG TRỌNG TÂM:`);
          lines.push(`• Dồn lực tư vấn các ngành vừa bị tụt hạng/giảm thưởng để kịp thời lấy lại vị thế Top ${limit}.`);
          lines.push(`• Giữ vững vị thế Top ${limit} ở các nhóm ngành thế mạnh đang dẫn đầu.`);
          generated = lines.join('\n');
        } else if (template === 2) {
          // MẪU 2: Danh sách chi tiết ngành giảm & mất thưởng
          const lines: string[] = [];
          lines.push(`⚠️ BÁO CÁO CHI TIẾT NGÀNH HÀNG GIẢM THƯỞNG SO VỚI HÔM QUA:`);
          lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          if (isComparing) {
            lines.push(`📉 Tổng tiền thưởng giảm sút: -${stats.totalDecreasedAmount.toLocaleString('vi-VN')} ₫ (${stats.decreasedRows.length} ngành bị giảm/mất thưởng)`);
            lines.push(``);
            if (stats.decreasedRows.length === 0) {
              lines.push(`🎉 Tuyệt vời! Không có ngành hàng nào bị giảm thưởng so với hôm qua.`);
            } else {
              stats.decreasedRows.forEach((r: any, i: number) => {
                const rankText = r.completionRankCurrent > 0 ? `HT #${r.completionRankCurrent}` : `VT #${r.exceededRankCurrent || '-'}`;
                const rankOldText = r.completionRankOld > 0 ? `HT #${r.completionRankOld}` : `VT #${r.exceededRankOld || '-'}`;
                lines.push(`${i + 1}. 🔻 ${r.categoryName}:`);
                if (r.isBonusLost) {
                  lines.push(`   - Tình trạng: 🚨 MẤT HOÀN TOÀN THƯỞNG (Từ ${r.bonusOld.toLocaleString('vi-VN')} ₫ ➔ 0 ₫)`);
                } else {
                  lines.push(`   - Mức giảm: -${Math.abs(r.bonusDiff).toLocaleString('vi-VN')} ₫ (Từ ${r.bonusOld.toLocaleString('vi-VN')} ₫ ➔ ${r.bonusCurrent.toLocaleString('vi-VN')} ₫)`);
                }
                lines.push(`   - Thứ hạng: ${rankText} (Hôm qua: ${rankOldText}) | HT: ${r.completionCurrent.toFixed(1)}% (${r.completionDiff >= 0 ? '+' : ''}${r.completionDiff.toFixed(1)}%)`);
              });
            }
          } else {
            lines.push(`📊 Tổng: ${rows.filter((r: any) => r.bonusCurrent === 0).length}/${rows.length} ngành chưa vào Top ${limit}`);
            lines.push(``);
            lines.push(`🚨 CẦN CẢI THIỆN:`);
            rows.filter((r: any) => r.bonusCurrent === 0).forEach((r: any, i: number) => {
              const rankText = r.completionRankCurrent > 0 ? `HT #${r.completionRankCurrent}` : (r.exceededRankCurrent > 0 ? `VT #${r.exceededRankCurrent}` : 'N/A');
              lines.push(`🔻 #${i + 1}. ${r.categoryName} - ${r.completionCurrent.toFixed(1)}% (${rankText})`);
            });
          }
          lines.push(``);
          lines.push(`💡 Cần tập trung tư vấn chốt deal ở các ngành trên để lọt Top ${limit}!`);
          generated = lines.join('\n');
        } else {
          // MẪU 3: Tóm tắt toàn bộ
          const lines: string[] = [];
          lines.push(`📝 TÓM TẮT THI ĐUA & SO SÁNH VỚI HÔM QUA:`);
          lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          lines.push(`🎯 Tổng ngành: ${rows.length}`);
          lines.push(`💰 Tổng thưởng hôm nay: ${totalBonus.toLocaleString('vi-VN')} ₫`);
          if (isComparing) {
            lines.push(`💰 Tổng thưởng hôm qua: ${totalBonusOld.toLocaleString('vi-VN')} ₫`);
            lines.push(`📊 Chênh lệch: ${diff >= 0 ? '+' : ''}${diff.toLocaleString('vi-VN')} ₫ (${diff >= 0 ? '▲ Tăng' : '🔻 Giảm'})`);
            lines.push(`🔴 Ngành giảm/mất thưởng: ${stats.decreasedRows.length} ngành (-${stats.totalDecreasedAmount.toLocaleString('vi-VN')} ₫)`);
            lines.push(`🟢 Ngành tăng/mới đạt thưởng: ${stats.increasedRows.length} ngành (+${stats.totalIncreasedAmount.toLocaleString('vi-VN')} ₫)`);
          }
          lines.push(`✅ Đạt thưởng: ${stats.bonusRows.length}/${rows.length}`);
          lines.push(`❌ Chưa đạt: ${rows.length - stats.bonusRows.length}/${rows.length}`);
          lines.push(``);
          lines.push(`📊 BẢNG XẾP HẠNG CHI TIẾT:`);
          rows.forEach((r: any, i: number) => {
            let icon = (r.bonusCurrent || 0) > 0 ? '✅' : '🔴';
            let bonusStr = '';
            if (r.isBonusLost) {
              icon = '🚨';
              bonusStr = ` → [MẤT THƯỞNG: -${r.bonusOld.toLocaleString('vi-VN')} ₫]`;
            } else if (r.isBonusDecreased) {
              bonusStr = ` → +${r.bonusCurrent.toLocaleString('vi-VN')} ₫ (🔻 -${Math.abs(r.bonusDiff).toLocaleString('vi-VN')} ₫)`;
            } else if (r.isBonusGained) {
              bonusStr = ` → +${r.bonusCurrent.toLocaleString('vi-VN')} ₫ (✨ Mới đạt)`;
            } else if (r.isBonusIncreased) {
              bonusStr = ` → +${r.bonusCurrent.toLocaleString('vi-VN')} ₫ (▲ +${r.bonusDiff.toLocaleString('vi-VN')} ₫)`;
            } else if (r.bonusCurrent > 0) {
              bonusStr = ` → +${r.bonusCurrent.toLocaleString('vi-VN')} ₫`;
            }
            const rankText = r.completionRankCurrent > 0 ? `HT #${r.completionRankCurrent}` : (r.exceededRankCurrent > 0 ? `VT #${r.exceededRankCurrent}` : 'N/A');
            lines.push(`${icon} #${i + 1}. ${r.categoryName} - ${r.completionCurrent.toFixed(1)}% (${rankText})${bonusStr}`);
          });
          generated = lines.join('\n');
        }

        setThuongStComment(generated);
        setShowThuongStComment(true);
        setThuongStTemplate(template);
        setCopiedThuongStComment(false);
      } catch (err) {
        console.error('Error generating AI comment:', err);
      } finally {
        setIsGeneratingAI(false);
      }
    }, 400);
    return thuongStComment;
  };

  const filteredThuongStRows = React.useMemo(() => {
    let rows = comparedThuongStRows;
    if (rows.length === 0) return { yellow: [], green: [], blue: [], all: [] };

    if (bonusFilterTab === 'BONUS') {
      rows = rows.filter((r: any) => (r.bonusCurrent || 0) > 0);
    } else if (bonusFilterTab === 'DECREASED') {
      rows = rows.filter((r: any) => r.isBonusDecreased);
    } else if (bonusFilterTab === 'INCREASED') {
      rows = rows.filter((r: any) => r.isBonusIncreased);
    }

    const yellowGroup: any[] = [];
    const greenGroup: any[] = [];
    const blueGroup: any[] = [];

    rows.forEach((row: any) => {
      const group = getCategoryGroup(row.categoryName);
      if (group === 'yellow') yellowGroup.push(row);
      else if (group === 'green') greenGroup.push(row);
      else blueGroup.push(row);
    });

    return {
      yellow: yellowGroup,
      green: greenGroup,
      blue: blueGroup,
      all: rows
    };
  }, [comparedThuongStRows, bonusFilterTab]);

  const totalBonusSum = React.useMemo(() => {
    return thuongStStats.totalBonusCurrent;
  }, [thuongStStats]);

  const renderThuongStRow = (row: any, idx: number, group: 'yellow' | 'green' | 'blue') => {
    let dotColor = 'bg-amber-500';
    if (group === 'green') dotColor = 'bg-emerald-500';
    else if (group === 'blue') dotColor = 'bg-blue-500';

    const isCompletionRankHighlighted = row.completionRankCurrent > 0 && row.completionRankCurrent <= selectedStoreExcelData.limit;
    const isExceededRankHighlighted = row.exceededRankCurrent > 0 && row.exceededRankCurrent <= selectedStoreExcelData.limit;

    const completionFormatted = `${row.completionCurrent.toFixed(1)}%`;

    // Calculate sequential index across groups
    let stt = idx + 1;
    if (group === 'green') {
      stt += filteredThuongStRows.yellow.length;
    } else if (group === 'blue') {
      stt += filteredThuongStRows.yellow.length + filteredThuongStRows.green.length;
    }

    const isEven = stt % 2 === 0;

    return (
      <tr key={`${group}-${idx}`} className={`${isEven ? 'bg-white' : 'bg-emerald-50/20'} ${row.isBonusLost ? 'bg-rose-50/30' : ''} hover:bg-emerald-50/70 transition-colors h-[44px]`}>
        <td className="px-1 py-0 text-[13px] font-black text-slate-700 text-center border-r border-b border-emerald-100/90 bg-emerald-50/40">
          {stt}
        </td>
        <td className="px-3 py-1 border-r border-b border-emerald-100/90 text-left font-black text-[12.5px] uppercase text-slate-900 truncate" title={row.categoryName}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 ring-2 ring-white shadow-xs`} />
            <span className="truncate">{row.categoryName}</span>
            {isComparing && row.isBonusLost && (
              <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9.5px] font-black shrink-0">
                MẤT THƯỞNG
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-0 border-r border-b border-emerald-100/90 text-center font-bold text-[13px] text-slate-800">
          <div>{completionFormatted}</div>
          {isComparing && row.hasComparison && row.completionDiff !== 0 && (
            <div className={`text-[10px] font-black ${row.completionDiff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {row.completionDiff > 0 ? `▲+${row.completionDiff.toFixed(1)}%` : `▼${row.completionDiff.toFixed(1)}%`}
            </div>
          )}
        </td>
        <td className="px-2 py-0 border-r border-b border-emerald-100/90 text-center text-[13px]">
          {isCompletionRankHighlighted ? (
            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
              #{row.completionRankCurrent}
            </span>
          ) : (
            <span className="font-extrabold text-slate-700">
              {row.completionRankCurrent === 0 ? '-' : row.completionRankCurrent}
            </span>
          )}
          {isComparing && row.hasComparison && row.completionRankDiff !== 0 && (
            <div className={`text-[9.5px] font-black ${row.completionRankDiff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {row.completionRankDiff > 0 ? `▲+${row.completionRankDiff} bậc` : `▼${Math.abs(row.completionRankDiff)} bậc`}
            </div>
          )}
        </td>
        <td className="px-2 py-0 border-r border-b border-emerald-100/90 text-center text-[13px]">
          {isExceededRankHighlighted ? (
            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
              #{row.exceededRankCurrent}
            </span>
          ) : (
            <span className="font-extrabold text-slate-700">
              {row.exceededRankCurrent === 0 ? '-' : row.exceededRankCurrent}
            </span>
          )}
          {isComparing && row.hasComparison && row.exceededRankDiff !== 0 && (
            <div className={`text-[9.5px] font-black ${row.exceededRankDiff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {row.exceededRankDiff > 0 ? `▲+${row.exceededRankDiff} bậc` : `▼${Math.abs(row.exceededRankDiff)} bậc`}
            </div>
          )}
        </td>
        <td className="px-3 py-1 border-b border-emerald-100/90 text-right">
          {!isComparing ? (
            <div className={`text-[13px] font-black ${row.bonusCurrent > 0 ? 'text-rose-600' : 'text-slate-400 font-medium'}`}>
              {row.bonusCurrent > 0 ? `+${row.bonusCurrent.toLocaleString('vi-VN')} ₫` : '-'}
            </div>
          ) : (
            <div>
              {row.isBonusLost ? (
                <div>
                  <div className="text-[12px] font-black text-slate-400">0 ₫</div>
                  <div className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md inline-block">
                    🚨 -{row.bonusOld.toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              ) : row.isBonusDecreased ? (
                <div>
                  <div className="text-[13px] font-black text-rose-600">+{row.bonusCurrent.toLocaleString('vi-VN')} ₫</div>
                  <div className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md inline-block">
                    🔻 -{Math.abs(row.bonusDiff).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              ) : row.isBonusGained ? (
                <div>
                  <div className="text-[13px] font-black text-rose-600">+{row.bonusCurrent.toLocaleString('vi-VN')} ₫</div>
                  <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block">
                    ✨ MỚI ĐẠT
                  </div>
                </div>
              ) : row.isBonusIncreased ? (
                <div>
                  <div className="text-[13px] font-black text-rose-600">+{row.bonusCurrent.toLocaleString('vi-VN')} ₫</div>
                  <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block">
                    ▲ +{row.bonusDiff.toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              ) : row.bonusCurrent > 0 ? (
                <div>
                  <div className="text-[13px] font-black text-rose-600">+{row.bonusCurrent.toLocaleString('vi-VN')} ₫</div>
                  <div className="text-[9.5px] font-medium text-slate-400">Không đổi</div>
                </div>
              ) : (
                <div className="text-[13px] text-slate-400 font-medium">-</div>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };





  // Track whether the initial load has completed — suppress loading overlay on store switches
  const hasInitiallyLoaded = useRef(false);
  useEffect(() => {
    if (!isLoading && !isLoadingStoreRevenue) {
      hasInitiallyLoaded.current = true;
    }
  }, [isLoading, isLoadingStoreRevenue]);

  const isInitialLoading = !hasInitiallyLoaded.current && (isLoading || isLoadingStoreRevenue);

  // Sync maKho when userProfile changes
  useEffect(() => {
    if (userProfile?.ma_kho && userProfile.ma_kho !== maKho) {
      setMaKho(userProfile.ma_kho);
      localStorage.setItem('rtst_ma_kho', userProfile.ma_kho);
    }
  }, [userProfile?.ma_kho]);

  // Sync maKho from report data if available
  useEffect(() => {
    if (filteredMarkets.length > 0) {
      const firstMarket = filteredMarkets[0];
      if (firstMarket.ma_kho) {
        const detectedMaKho = firstMarket.ma_kho.toString().trim().replace(/^0+/, '');
        if (detectedMaKho && detectedMaKho !== maKho) {
          console.log('[LuyKe] Detected ma_kho from report:', detectedMaKho);
          setMaKho(detectedMaKho);
        }
      }
    }
  }, [filteredMarkets, maKho]);

  // Filter out any supermarkets containing (KHO BÁN HÀNG LƯU ĐỘNG)
  const filteredDisplayData = React.useMemo(() => {
    return {
      ...displayData,
      markets: (displayData.markets || []).filter(
        (m: any) => !isKhoLuuDong(m.name)
      ),
      categories: (displayData.categories || []).filter(
        (c: any) => !c.marketName || !isKhoLuuDong(c.marketName)
      )
    };
  }, [displayData]);

  // Pre-filter markets by the current store filter so the overview dashboard
  // only shows the store(s) matching the selected bộ lọc
  const marketsForDashboard = React.useMemo(() => {
    if (marketFilter === 'ALL') return filteredDisplayData.markets;
    const normFilter = normalize(marketFilter);
    return filteredDisplayData.markets.filter((m: any) => {
      const normName = normalize(m.name);
      return normName.includes(normFilter) || normFilter.includes(normName);
    });
  }, [filteredDisplayData.markets, marketFilter]);

  // PERF: Sync stName and revenue fields when marketFilter or data changes
  // Only trigger on external changes (marketFilter, filteredDisplayData.markets, allStoreTargets)
  // NOT on the values we set — avoids re-render cascade
  useEffect(() => {
    if (marketFilter === 'ALL') return;
    const normFilter = normalize(marketFilter);
    // Find matching market in filteredDisplayData.markets (which has targetQD, actualReal, actualVirtual, percentHT)
    const market = (filteredDisplayData.markets || []).find(
      (m: any) => {
        const nm = normalize(m.name);
        return nm === normFilter || nm.includes(normFilter) || normFilter.includes(nm);
      }
    ) || filteredMarkets.find(m => normalize(m.name) === normFilter);
    if (!market) return;

    if (stName !== market.name) setStName(market.name);
    if (market.actualReal !== undefined && stDtlk !== market.actualReal) setStDtlk(market.actualReal);
    if (market.actualVirtual !== undefined && stDtqd !== market.actualVirtual) setStDtqd(market.actualVirtual);

    const dtDuKienQD = market.targetQD || 0;
    const percentHT = market.percentHT || 0;
    if (dtDuKienQD > 0 && stDtDuKienQD !== dtDuKienQD) setStDtDuKienQD(dtDuKienQD);
    if (percentHT > 0 && stPercentHTTargetDuKienQD !== percentHT) setStPercentHTTargetDuKienQD(percentHT);

    // Sync from DB cache (allStoreTargets) using normalized keys to prevent spacing/underscore mismatches
    const targetDataKey = Object.keys(allStoreTargets || {}).find(k => normalize(k) === normFilter);
    const targetData = targetDataKey ? allStoreTargets[targetDataKey] : null;
    if (targetData) {
      if (targetData.stPercentTarget !== undefined && stPercentTarget !== targetData.stPercentTarget) {
        setStPercentTarget(targetData.stPercentTarget);
      }
    }
  }, [marketFilter, filteredDisplayData.markets, filteredMarkets, allStoreTargets, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stPercentTarget, setStName, setStDtlk, setStDtqd, setStDtDuKienQD, setStPercentHTTargetDuKienQD, setStPercentTarget]);

  // Sync marketFilter when filteredMarkets changes
  useEffect(() => {
    // Ensure the current marketFilter is valid within filteredMarkets,
    // otherwise auto-select the first available one.
    if (filteredMarkets.length > 0 && (marketFilter === 'ALL' || !filteredMarkets.some(m => m.name === marketFilter))) {
      setMarketFilter(filteredMarkets[0].name);
    }
  }, [filteredMarkets, marketFilter]);

  // NOTE: Luyke data auto-loads when currentStoreId changes (centralized in useLuykeData)

  // stTargetSauHeSo is synced from DB (KHAI BÁO > TARGET DOANH THU > TAGET SAU X HỆ SỐ)
  // — no local recalculation needed here

  // FastSync removed — allStoreTargets sync is handled in the unified effect above

  // Categories from LUỸ KẾ TĐ already have correct data:
  // cat.target = Column 3 (TARGET) and cat.revenue = Column 2 (LUỸ KẾ)
  // No adjustment needed — pass through raw parsed values directly.
  const adjustedCategories = filteredDisplayData.categories;

  // Filter categories by marketFilter (store button selection)
  const filteredCategories = React.useMemo(() => {
    let cats = adjustedCategories;
    if (marketFilter !== 'ALL') {
      cats = cats.filter((c: any) => {
        // Data is already isolated per-store from the DB via useLuykeData.
        // Bypassing strict string matching prevents "Chưa có dữ liệu" bugs 
        // caused by React state sync delays between marketFilter and activeStore.
        if (!c.marketName) return true;
        
        const normMarketName = normalize(c.marketName);
        const normFilter = normalize(marketFilter);
        
        // If they match, great. If not, still return true to trust the DB isolation,
        // unless we explicitly know it belongs to a completely different store (multi-store edge case).
        if (normMarketName && normFilter && normMarketName !== normFilter && !normMarketName.includes(normFilter) && !normFilter.includes(normMarketName)) {
           // In single-store view, even if names mismatch slightly, we trust the data source.
           // Only filter if we have multiple stores loaded in filteredDisplayData.markets.
           if (filteredDisplayData.markets && filteredDisplayData.markets.length > 1) {
             return false;
           }
        }
        return true;
      });
    }
    // Dedup by name + type (prevent duplicate category rows from broad matching)
    const seen = new Set<string>();
    const deduped = cats.filter((c: any) => {
      const key = `${(c.name || '').trim().toUpperCase()}__${c.type || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort categories by exact custom order specified by user
    deduped.sort((a: any, b: any) => getCustomCategoryIndex(a.name || '') - getCustomCategoryIndex(b.name || ''));

    // Map each category to use the target from categoryTargets (TARGET THI ĐUA) if available
    return deduped.map((cat: any) => {
      const matchingTarget = categoryTargets.find(
        (t: any) => normalize(t.name) === normalize(cat.name) && t.type === cat.type
      );
      if (matchingTarget && typeof matchingTarget.adjustedTarget === 'number') {
        return {
          ...cat,
          target: matchingTarget.adjustedTarget
        };
      }
      return cat;
    });
  }, [adjustedCategories, marketFilter, filteredDisplayData.markets, categoryTargets]);

  // Removed window focus re-processing to improve performance

  // Filter states
  const [catGroupFilter, setCatGroupFilter] = useState('ALL');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Column toggles & comments for V2 Category section
  const [showTargetCols, setShowTargetCols] = useState(true);
  const [sllkComment, setSllkComment] = useState('');
  const [dtlkComment, setDtlkComment] = useState('');
  const [showSllkComment, setShowSllkComment] = useState(false);
  const [showDtlkComment, setShowDtlkComment] = useState(false);

  // Nhận xét Doanh thu & Ngành hàng Modal State (BC THÁNG)
  const [isCategoryCommentModalOpen, setIsCategoryCommentModalOpen] = useState(false);
  const [selectedCategoryTemplate, setSelectedCategoryTemplate] = useState(0);
  const [categoryCommentText, setCategoryCommentText] = useState('');
  const [copiedCategoryComment, setCopiedCategoryComment] = useState(false);

  const formatCurrencyUnit = (num: number) => {
    const abs = Math.abs(Math.round(num));
    if (abs >= 1000) return `${Math.round(num).toLocaleString('vi-VN')} tỷ`;
    if (abs > 0) return `${Math.round(num).toLocaleString('vi-VN')} tr`;
    return '0';
  };

  // Helper to resolve store target without flickering or cross-store fallback leakage
  const resolveMarketTarget = useCallback((market: any) => {
    if (!market) return { displayTargetQD: 0, percentTargetVal: 100, targetData: null };
    const normMarket = normalize(market.name);

    // 1. Match in allStoreTargets: prioritize exact match first, then substring
    const targetDataKey = Object.keys(allStoreTargets || {}).find(k => normalize(k) === normMarket)
      || Object.keys(allStoreTargets || {}).find(k => {
        const normK = normalize(k);
        return normK.includes(normMarket) || normMarket.includes(normK);
      });
    const targetData: any = targetDataKey ? allStoreTargets[targetDataKey] : null;

    // 2. Check popup "CẤU HÌNH TARGET" from localStorage (crm_cluster_store_target_config)
    let clusterTargetConfig: any = null;
    try {
      const rawClusterCfg = localStorage.getItem('crm_cluster_store_target_config');
      if (rawClusterCfg) {
        const parsedCfg = JSON.parse(rawClusterCfg);
        const cfgKey = Object.keys(parsedCfg).find(k => normalize(k) === normMarket)
          || Object.keys(parsedCfg).find(k => {
            const nk = normalize(k);
            return nk.includes(normMarket) || normMarket.includes(nk);
          });
        if (cfgKey) clusterTargetConfig = parsedCfg[cfgKey];
      }
    } catch {}

    const isCurrentActive = normalize(currentStoreId) === normMarket || normalize(stName) === normMarket;

    const percentTargetVal = clusterTargetConfig?.mucTieuPercent !== undefined
      ? Number(clusterTargetConfig.mucTieuPercent)
      : (Number((targetData as any)?.stPercentTarget) || (isCurrentActive ? Number(stPercentTarget) : 100) || 100);

    let displayTargetQD = 0;
    if (clusterTargetConfig && Number(clusterTargetConfig.targetCungKyNam) > 0) {
      displayTargetQD = Math.round(Number(clusterTargetConfig.targetCungKyNam) * (percentTargetVal / 100));
    } else {
      const dtDuKienQD = market.targetQD || 0;
      const rawTargetQD = dtDuKienQD > 0
        ? dtDuKienQD
        : (Number((targetData as any)?.stTargetQuyDoi) || (isCurrentActive ? stTargetQuyDoi : 0) || 0);

      displayTargetQD = rawTargetQD > 0
        ? Math.round(rawTargetQD * (percentTargetVal / 100))
        : (Number((targetData as any)?.stTargetSauHeSo) || (isCurrentActive ? stTargetSauHeSo : 0) || 0);
    }

    return {
      displayTargetQD,
      percentTargetVal,
      targetData
    };
  }, [allStoreTargets, currentStoreId, stName, stPercentTarget, stTargetQuyDoi, stTargetSauHeSo]);

  // Helper to build 3 comment templates for LuyKe Doanh thu & Ngành hàng
  const luykeCategoryCommentTemplates = React.useMemo(() => {
    const market = marketsForDashboard[0] || {
      name: maKho || 'Siêu Thị',
      targetQD: 0,
      actualVirtual: 0,
      actualReal: 0,
      percentHT: 0,
      installmentRate: 0,
      billCount: 0
    };

    const { displayTargetQD, targetData } = resolveMarketTarget(market);
    const actualVirtual = market.actualVirtual || 0;
    const actualReal = market.actualReal || 0;
    const percentHTVal = displayTargetQD > 0 ? Math.round((daysPassed > 0 && totalDays > 0 ? (((actualVirtual) / daysPassed) * totalDays) : actualVirtual) / displayTargetQD * 100 * 10) / 10 : 0;
    const dtlkVal = targetData?.stDtlk || actualReal || 0;
    const dtqdVal = targetData?.stDtqd || actualVirtual || 0;
    const percentQDVal = dtlkVal > 0 ? ((dtqdVal - dtlkVal) / dtlkVal) * 100 : (market.percentQD || 0);
    const installmentRate = (market.installmentRate || 0).toFixed(1);
    const billCount = market.billCount || 0;

    const marketName = market.name || 'SIÊU THỊ';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN');
    const nowHeader = `${timeStr} NGÀY ${dateStr}`;

    let lnttVal = market.percentHTTargetDuKienLNTT ?? (targetData as any)?.percentHTTargetDuKienLNTT ?? 0;
    if (!lnttVal && clusterSummaryInput) {
      const lines = clusterSummaryInput.split('\n').map((l: string) => l.trim()).filter(Boolean);
      let lnttColIdx = -1;
      let nameColIdx = -1;
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('stt') || lower.includes('tên siêu thị') || lower.includes('tên miền') || lower.includes('dt hôm qua')) {
          const cols = line.split(/\t|\||\s{2,}/).map((c: string) => c.trim());
          nameColIdx = cols.findIndex((c: string) => {
            const l = c.toLowerCase();
            return l.includes('tên siêu thị') || l.includes('tên miền') || l.includes('siêu thị');
          });
          lnttColIdx = cols.findIndex((c: string) => {
            const l = c.toLowerCase();
            return (l.includes('% ht target') || l.includes('% ht') || l.includes('%ht')) && l.includes('lntt');
          });
          continue;
        }
        const cols = line.split(/\t|\||\s{2,}/).map((c: string) => c.trim());
        if (cols.length < 2) continue;
        const normMarket = normalize(market.name);
        const isMatch = cols.some((c: string) => {
          const normC = normalize(c);
          return normC && (normC === normMarket || normC.includes(normMarket) || normMarket.includes(normC));
        });
        if (isMatch) {
          if (lnttColIdx !== -1 && lnttColIdx < cols.length) {
            const n = cleanNum(cols[lnttColIdx]);
            if (n) lnttVal = n;
          } else if (cols.length >= 11) {
            const n = cleanNum(cols[10]);
            if (n) lnttVal = n;
          } else if (nameColIdx !== -1 && nameColIdx + 10 < cols.length) {
            const n = cleanNum(cols[nameColIdx + 10]);
            if (n) lnttVal = n;
          }
          break;
        }
      }
    }

    const targetQD = formatCurrencyUnit(displayTargetQD || 0);
    const actualVirtualStr = formatCurrencyUnit(actualVirtual || 0);
    const percentQdStr = `${percentQDVal >= 0 ? '+' : ''}${percentQDVal.toFixed(1)}%`;

    // SL Categories
    const slCats = filteredCategories.filter((c: any) => c.type === 'SL' || c.type === 'ALL').map((c: any) => {
      let rate = 0;
      if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
      const remaining = c.target - c.revenue;
      return { ...c, rate, remaining };
    });
    const slDone = slCats.filter(c => Math.round(c.rate) >= 100);
    const slNotDone = slCats.filter(c => Math.round(c.rate) < 100).sort((a, b) => b.remaining - a.remaining);
    const slTop = [...slCats].sort((a, b) => b.rate - a.rate);

    // DT Categories
    const dtCats = filteredCategories.filter((c: any) => c.type === 'DT' || c.type === 'ALL').map((c: any) => {
      let rate = 0;
      if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
      const remaining = c.target - c.revenue;
      return { ...c, rate, remaining };
    });
    const dtDone = dtCats.filter(c => Math.round(c.rate) >= 100);
    const dtNotDone = dtCats.filter(c => Math.round(c.rate) < 100).sort((a, b) => b.remaining - a.remaining);
    const dtTop = [...dtCats].sort((a, b) => b.rate - a.rate);

    // Staff ranking if available in LuyKe
    const staffRows = selectedStoreExcelData?.rows || [];
    const sortedStaffs = [...staffRows].sort((a: any, b: any) => (b.percentHT || 0) - (a.percentHT || 0));
    const topStaffs = sortedStaffs.slice(0, 3);
    const botStaffs = sortedStaffs.length > 3 ? sortedStaffs.slice(-3).reverse() : [];
    const staffAbove50 = staffRows.filter((s: any) => (s.percentHT || 0) >= 50).length;

    // MẪU 1: TOP/BOT NV (TOÀN DIỆN DOANH THU & NGÀNH HÀNG)
    let t1 = `📊 TỔNG HỢP LŨY KẾ DOANH THU & NGÀNH HÀNG - ${nowHeader}\n`;
    t1 += `🏪 Siêu thị: ${marketName}\n`;
    t1 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    t1 += `📈 KẾT QUẢ TỔNG QUAN:\n`;
    t1 += `🎯 Target QĐ: ${targetQD} || Thực Đạt: ${actualVirtualStr} (${percentHTVal}% HT)\n`;
    t1 += `💳 Tỷ trọng Trả Góp: ${installmentRate}% || % QĐ: ${percentQdStr} || %LNTT: ${Math.round(lnttVal)}%\n`;
    if (staffRows.length > 0) {
      t1 += `🎯 Tổng NV: ${staffRows.length} || ĐẠT trên 50%: ${staffAbove50}/${staffRows.length}\n`;
    }
    t1 += `📦 Tiến độ Ngành Hàng: SL (${slDone.length}/${slCats.length}) || DT (${dtDone.length}/${dtCats.length})\n\n`;

    if (topStaffs.length > 0 && topStaffs[0].name) {
      t1 += `🏆 TOP 3 DẪN ĐẦU:\n`;
      topStaffs.forEach((s: any, idx: number) => {
        t1 += `🔺 #${idx + 1}. ${s.name || s.id} (${Math.round(s.percentHT || 0)}% HT - ${Math.round(s.revenue || s.actualVirtual || 0)} tr)\n`;
      });
      t1 += `\n`;
    }

    if (botStaffs.length > 0 && botStaffs[0].name) {
      t1 += `⚠️ BOTTOM 3 CẦN TĂNG TỐC:\n`;
      botStaffs.forEach((s: any) => {
        t1 += `🔻 ${s.name || s.id}: ${Math.round(s.percentHT || 0)}% HT (${Math.round(s.revenue || s.actualVirtual || 0)} tr)\n`;
      });
      t1 += `\n`;
    }

    if (dtTop.filter(c => c.rate >= 100).length > 0 || slTop.filter(c => c.rate >= 100).length > 0) {
      t1 += `🌟 TOP NGÀNH HÀNG ĐẠT CHỈ TIÊU LUỸ KẾ:\n`;
      dtTop.filter(c => c.rate >= 100).slice(0, 3).forEach(c => {
        t1 += `✨ DT: ${c.name} (${Math.round(c.rate)}% - ${Math.round(c.revenue).toLocaleString('vi-VN')} tr)\n`;
      });
      slTop.filter(c => c.rate >= 100).slice(0, 3).forEach(c => {
        t1 += `✨ SL: ${c.name} (${Math.round(c.rate)}% - ${Math.round(c.revenue).toLocaleString('vi-VN')})\n`;
      });
      t1 += `\n`;
    }

    if (dtNotDone.length > 0 || slNotDone.length > 0) {
      t1 += `🔴 NGÀNH HÀNG CẦN TẬP TRUNG TĂNG TỐC:\n`;
      dtNotDone.slice(0, 4).forEach(c => {
        t1 += `❌ DT: ${c.name} (${Math.round(c.rate)}% | Còn thiếu: ${c.remaining > 0 ? c.remaining.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 0} tr)\n`;
      });
      slNotDone.slice(0, 4).forEach(c => {
        t1 += `❌ SL: ${c.name} (${Math.round(c.rate)}% | Còn thiếu: ${c.remaining > 0 ? Math.round(c.remaining).toLocaleString('vi-VN') : 0})\n`;
      });
      t1 += `\n`;
    }

    t1 += `💪 Toàn đội tiếp tục bứt phá để hoàn thành 100% mục tiêu tháng nhé! 🔥`;

    // MẪU 2: DS CẦN TĂNG TỐC
    let t2 = `⚠️ DANH SÁCH CẦN TĂNG TỐC LUỸ KẾ - ${nowHeader}\n`;
    t2 += `🏪 Siêu thị: ${marketName} (TGSD: ${daysPassed}/${totalDays} ngày)\n`;
    t2 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    t2 += `🎯 TIẾN ĐỘ DOANH THU: Đạt ${actualVirtualStr}/${targetQD} (Dự kiến: ${percentHTVal}% HT)\n`;
    t2 += `💳 Trả Góp: ${installmentRate}% | %LNTT: ${Math.round(lnttVal)}%\n\n`;

    if (dtNotDone.length > 0) {
      t2 += `🚨 CÁC NGÀNH HÀNG (DT) CHƯA ĐẠT KẾ HOẠCH:\n`;
      dtNotDone.forEach(c => {
        t2 += `• ${c.name}: Đạt ${Math.round(c.revenue).toLocaleString('vi-VN')}/${Math.round(c.target).toLocaleString('vi-VN')} tr (${Math.round(c.rate)}%) -> 🔴 CÒN THIẾU: ${c.remaining > 0 ? c.remaining.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 0} tr\n`;
      });
      t2 += `\n`;
    }

    if (slNotDone.length > 0) {
      t2 += `🚨 CÁC NGÀNH HÀNG (SL) CHƯA ĐẠT KẾ HOẠCH:\n`;
      slNotDone.forEach(c => {
        t2 += `• ${c.name}: Đạt ${Math.round(c.revenue).toLocaleString('vi-VN')}/${Math.round(c.target).toLocaleString('vi-VN')} (${Math.round(c.rate)}%) -> 🔴 CÒN THIẾU: ${c.remaining > 0 ? Math.round(c.remaining).toLocaleString('vi-VN') : 0} cái\n`;
      });
      t2 += `\n`;
    }

    if (botStaffs.length > 0 && botStaffs[0].name) {
      t2 += `🔻 NHÂN SỰ CẦN ĐẨY MẠNH BỨT PHÁ:\n`;
      botStaffs.forEach((s: any) => {
        t2 += `• ${s.name || s.id}: ${Math.round(s.percentHT || 0)}% HT (${Math.round(s.revenue || s.actualVirtual || 0)} tr)\n`;
      });
      t2 += `\n`;
    }

    t2 += `🔥 Toàn đội tập trung bứt phá để hoàn thành chỉ tiêu tháng nhé!`;

    // MẪU 3: TÓM TẮT
    let t3 = `⚡ TÓM TẮT NHANH LUỸ KẾ DOANH THU & NGÀNH HÀNG\n`;
    t3 += `🏪 Siêu thị: ${marketName} (TGSD: ${daysPassed}/${totalDays} ngày)\n`;
    t3 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    t3 += `📊 DTQĐ: ${actualVirtualStr}/${targetQD} (Dự kiến: ${percentHTVal}% HT)\n`;
    t3 += `💳 Trả Góp: ${installmentRate}% | 📊 %LNTT: ${Math.round(lnttVal)}%\n`;
    t3 += `📦 Ngành hàng Đạt: SL [${slDone.length}/${slCats.length}] | DT [${dtDone.length}/${dtCats.length}]\n`;
    if (dtNotDone.length > 0 || slNotDone.length > 0) {
      t3 += `🎯 Trọng tâm cần đẩy: ${[...dtNotDone.slice(0, 3), ...slNotDone.slice(0, 2)].map(c => c.name).join(', ')}\n`;
    }
    t3 += `🚀 Quyết tâm hoàn thành 100% mục tiêu tháng!`;

    return [
      {
        id: 1,
        title: 'MẪU 1: TOP/BOT NV',
        icon: '🏆',
        text: t1
      },
      {
        id: 2,
        title: 'MẪU 2: DS CẦN TĂNG TỐC',
        icon: '⚠️',
        text: t2
      },
      {
        id: 3,
        title: 'MẪU 3: TÓM TẮT',
        icon: '⚡',
        text: t3
      }
    ];
  }, [marketsForDashboard, allStoreTargets, stTargetSauHeSo, stTargetQuyDoi, stPercentTarget, daysPassed, totalDays, filteredCategories, selectedStoreExcelData, maKho, clusterSummaryInput]);

  const handleOpenCategoryCommentModal = () => {
    setCategoryCommentText(luykeCategoryCommentTemplates[selectedCategoryTemplate]?.text || luykeCategoryCommentTemplates[0]?.text || '');
    setIsCategoryCommentModalOpen(true);
    setCopiedCategoryComment(false);
  };

  const handleCopyCategoryComment = () => {
    navigator.clipboard.writeText(categoryCommentText).then(() => {
      setCopiedCategoryComment(true);
      setTimeout(() => setCopiedCategoryComment(false), 2500);
    });
  };

  const [excludedYcxStaffNames, setExcludedYcxStaffNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('BI_REAL_EXCLUDED_YCX_V1');
    return saved ? JSON.parse(saved) : [];
  });

  const clearData = () => {
    setClusterSummaryInput('');
    setClusterCategoryInput('');
    // ... clear other states
  };

  // Refs for capture
  const captureRefs = {
    overview: useRef<HTMLDivElement>(null),
    fullDashboard: useRef<HTMLDivElement>(null),
    overviewInternal: useRef<HTMLDivElement>(null),
    category: useRef<HTMLDivElement>(null),
    categorySL: useRef<HTMLDivElement>(null),
    categoryDT: useRef<HTMLDivElement>(null),
    thuongSt: useRef<HTMLDivElement>(null)
  };

  const captureOffscreenHelper = async (element: HTMLElement, fileName: string) => {
    setIsCapturing(true);
    try {
      const isSingleTable = fileName?.includes('_SL_') || fileName?.includes('_DT_') || fileName === 'BaoCaoThuongSt' || fileName?.includes('ThuongSt');
      // Wider width for THI ĐUA table to fit long category names without truncation
      const isThuongSt = fileName === 'BaoCaoThuongSt' || fileName?.includes('ThuongSt');
      const targetWidthPx = isThuongSt ? 1200 : (isSingleTable ? 1000 : 1850);
      const targetWidth = `${targetWidthPx}px`;

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '0';
      tempContainer.style.left = '-99999px';
      tempContainer.style.width = targetWidth;
      tempContainer.style.minWidth = targetWidth;
      tempContainer.style.maxWidth = targetWidth;
      tempContainer.style.zIndex = '-9999';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.overflow = 'visible';

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '100%';
      clone.style.minWidth = '100%';
      clone.style.maxWidth = '100%';
      clone.style.boxSizing = 'border-box';
      clone.style.padding = '0';
      clone.style.margin = '0 auto';
      clone.style.backgroundColor = '#ffffff';

      // Hide no-capture elements, buttons, and textareas
      clone.querySelectorAll('.no-capture, button, textarea, .screenshot-comment').forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // Zero-shadow export & backdrop-filter removal (Zero-Shadow Rule)
      clone.style.boxShadow = 'none';
      clone.style.filter = 'none';
      clone.style.backdropFilter = 'none';
      (clone.style as any).webkitBackdropFilter = 'none';
      clone.style.textShadow = 'none';

      clone.querySelectorAll('*').forEach(node => {
        const htmlEl = node as HTMLElement;
        if (htmlEl.style) {
          htmlEl.style.boxShadow = 'none';
          htmlEl.style.textShadow = 'none';
          htmlEl.style.filter = 'none';
          htmlEl.style.backdropFilter = 'none';
          (htmlEl.style as any).webkitBackdropFilter = 'none';
        }
        if (htmlEl.classList) {
          htmlEl.classList.remove(
            'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow',
            'drop-shadow-sm', 'drop-shadow-md', 'drop-shadow-lg', 'drop-shadow-xl', 'drop-shadow-2xl', 'drop-shadow',
            'backdrop-blur-sm', 'backdrop-blur', 'backdrop-blur-md', 'backdrop-blur-lg', 'backdrop-blur-xl'
          );
          // ★ CRITICAL: Remove ALL truncation classes to prevent text clipping in export
          htmlEl.classList.remove('truncate', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3');
        }
      });

      // ★ Force all elements that had truncate behavior to show full text
      clone.querySelectorAll('*').forEach(node => {
        const htmlEl = node as HTMLElement;
        const cs = htmlEl.style;
        // If any element has inline overflow:hidden + text-overflow:ellipsis, clear them
        if (cs.textOverflow === 'ellipsis') {
          cs.textOverflow = 'clip';
          cs.overflow = 'visible';
        }
      });

      // Explicitly style ONLY emerald table banner headers with yellow text
      clone.querySelectorAll('.bg-gradient-to-r h2, [class*="from-[#047857]"] h2').forEach(h2 => {
        const el = h2 as HTMLElement;
        el.style.color = '#FEF08A';
        el.style.fontFamily = "'UTM Avo', sans-serif";
        el.style.fontWeight = '900';
        el.style.fontSize = '26px';
        el.style.display = 'block';
        el.style.textAlign = 'center';
      });

      // Explicitly ensure section titles (like "CHI TIẾT NGÀNH HÀNG" and Store Name) are SOLID BLACK & explicitly named
      clone.querySelectorAll('h2, h3').forEach(header => {
        const el = header as HTMLElement;
        const text = (el.textContent || '').trim().normalize('NFC').toUpperCase();
        if (text.includes('CHI TIẾT NGÀNH')) {
          el.textContent = 'CHI TIẾT NGÀNH HÀNG';
          el.style.color = '#0f172a';
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '900';
          el.style.textAlign = 'center';
          el.style.display = 'block';
          el.style.width = '100%';
          el.style.background = 'none';
          (el.style as any).webkitTextFillColor = '#0f172a';
        } else if (!el.closest('.bg-gradient-to-r') && !el.closest('[class*="from-[#047857]"]')) {
          el.style.color = '#0f172a'; // Pure black text-slate-900
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '900';
        }
      });

      // Ensure subtitle lines in emerald banners are white and visible
      clone.querySelectorAll('.bg-gradient-to-r span, .bg-gradient-to-r p, .bg-gradient-to-r div, [class*="from-[#047857]"] span').forEach(node => {
        const el = node as HTMLElement;
        if (el.textContent && (el.textContent.includes('Luỹ kế:') || el.textContent.includes('Realtime:') || el.textContent.includes('ĐẠT') || el.textContent.includes('TGSD'))) {
          el.style.color = '#ffffff';
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '700';
        }
      });

      // Ensure description texts outside banners stay readable slate
      clone.querySelectorAll('p').forEach(p => {
        const el = p as HTMLElement;
        if (!el.closest('.bg-gradient-to-r')) {
          el.style.color = '#64748b';
        }
      });

      // Force 2 columns grid for overview (skip specific Thuong ST grids)
      const grids = clone.querySelectorAll('.grid, [class*="grid-cols-"]');
      grids.forEach(g => {
        const htmlG = g as HTMLElement;
        if (htmlG.classList.contains('thuong-st-kpi-grid') || htmlG.classList.contains('thuong-st-diff-grid')) {
          return;
        }
        if (htmlG.children.length === 6) {
          htmlG.style.display = 'grid';
          htmlG.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
          htmlG.style.gap = '16px';
          htmlG.style.width = '100%';
          htmlG.style.boxSizing = 'border-box';
        }
        if (htmlG.children.length === 2 && (htmlG.classList.contains('xl:grid-cols-2') || htmlG.classList.contains('grid-cols-1') || htmlG.classList.contains('grid'))) {
          htmlG.style.display = 'grid';
          htmlG.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
          htmlG.style.gap = '24px';
          htmlG.style.width = '100%';
          htmlG.style.alignItems = 'start';
          htmlG.style.boxSizing = 'border-box';
        }
      });

      // Top KPI Cards grid in BaoCaoThuongSt: 2 columns exactly matching on-screen UI (Ảnh 2)
      const kpiGrids = clone.querySelectorAll('.thuong-st-kpi-grid');
      kpiGrids.forEach(kg => {
        const htmlKg = kg as HTMLElement;
        htmlKg.style.display = 'grid';
        htmlKg.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        htmlKg.style.gap = '14px';
        htmlKg.style.width = '100%';
        htmlKg.style.boxSizing = 'border-box';
      });

      // Card 3: spans full width across both columns (grid-column: 1 / -1) exactly like on-screen UI
      clone.querySelectorAll('.thuong-st-card-3').forEach(c3 => {
        const htmlC3 = c3 as HTMLElement;
        htmlC3.style.gridColumn = '1 / -1';
        htmlC3.style.width = '100%';
        htmlC3.style.boxSizing = 'border-box';
      });

      // Card 3 Diff Grid: Force 2 equal columns with clean gap and prevent any inner wrapping/overlaps
      const diffGrids = clone.querySelectorAll('.thuong-st-diff-grid');
      diffGrids.forEach(dg => {
        const htmlDg = dg as HTMLElement;
        htmlDg.style.display = 'grid';
        htmlDg.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        htmlDg.style.gap = '12px';
        htmlDg.style.width = '100%';
        htmlDg.style.boxSizing = 'border-box';
      });

      // Ensure text inside diff badges never wraps or overlaps
      clone.querySelectorAll('.thuong-st-diff-grid *').forEach(node => {
        const el = node as HTMLElement;
        if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
          el.style.whiteSpace = 'nowrap';
          el.style.overflow = 'visible';
          el.style.textOverflow = 'clip';
        }
      });

      // Tables
      const tableContainers = clone.querySelectorAll('.overflow-x-auto, [class*="overflow-x-"]');
      tableContainers.forEach(tc => {
        const htmlTc = tc as HTMLElement;
        htmlTc.style.width = '100%';
        htmlTc.style.overflow = 'visible';
        htmlTc.style.boxSizing = 'border-box';
      });

      const tables = clone.querySelectorAll('table');
      tables.forEach(table => {
        const htmlTable = table as HTMLTableElement;
        if (isSingleTable) {
          // Single table capture: auto-layout for natural column sizing
          htmlTable.style.width = '100%';
          htmlTable.style.minWidth = '100%';
          htmlTable.style.tableLayout = 'auto';
          // Remove colgroup col width constraints so auto-layout sizes columns by content
          const colEls = htmlTable.querySelectorAll('colgroup col');
          colEls.forEach(col => {
            (col as HTMLElement).style.width = 'auto';
            (col as HTMLElement).style.minWidth = 'auto';
          });
        } else {
          htmlTable.style.width = '100%';
          htmlTable.style.tableLayout = 'fixed';
        }
        htmlTable.style.boxSizing = 'border-box';

        const cells = htmlTable.querySelectorAll('th, td');
        cells.forEach(cell => {
          const htmlCell = cell as HTMLElement;
          htmlCell.style.boxSizing = 'border-box';

          // ★ CRITICAL: Determine if this is a "name/label" cell (typically col 2, text-left)
          // or a numeric/data cell (text-center, text-right)
          const isNameCell = htmlCell.classList.contains('text-left') ||
            (htmlCell.tagName === 'TD' && htmlCell.cellIndex === 1);

          if (isSingleTable) {
            if (isNameCell) {
              // ★ Name cells: ALLOW WRAPPING so no text is ever cut off
              htmlCell.style.whiteSpace = 'normal';
              htmlCell.style.wordBreak = 'break-word';
              htmlCell.style.overflow = 'visible';
              htmlCell.style.textOverflow = 'clip';
              htmlCell.style.paddingLeft = '12px';
              htmlCell.style.paddingRight = '12px';
              htmlCell.style.minWidth = '180px';
            } else {
              // Numeric cells: keep nowrap since numbers are short
              htmlCell.style.whiteSpace = 'nowrap';
              htmlCell.style.overflow = 'visible';
              htmlCell.style.textOverflow = 'clip';
              htmlCell.style.paddingLeft = '12px';
              htmlCell.style.paddingRight = '12px';
            }
          } else {
            htmlCell.style.whiteSpace = 'nowrap';
            htmlCell.style.overflow = 'hidden';
            htmlCell.style.textOverflow = 'ellipsis';
          }

          // ★ Force all child spans/divs inside cells to also be visible (no truncation)
          htmlCell.querySelectorAll('span, div').forEach(child => {
            const childEl = child as HTMLElement;
            childEl.style.overflow = 'visible';
            childEl.style.textOverflow = 'clip';
            if (isNameCell) {
              childEl.style.whiteSpace = 'normal';
              childEl.style.wordBreak = 'break-word';
            }
          });
        });
      });

      // Ensure StatCard badges & titles never wrap on screenshot export
      const statBadges = clone.querySelectorAll('.stat-card-badge, [class*="rounded-full"]');
      statBadges.forEach(b => {
        const htmlB = b as HTMLElement;
        htmlB.style.whiteSpace = 'nowrap';
        htmlB.style.flexWrap = 'nowrap';
        htmlB.querySelectorAll('span, div, p').forEach(s => {
          const htmlS = s as HTMLElement;
          htmlS.style.whiteSpace = 'nowrap';
          htmlS.style.wordBreak = 'keep-all';
          htmlS.style.overflow = 'hidden';
          htmlS.style.textOverflow = 'ellipsis';
        });
      });

      // Ensure Oswald font on StatNumbers
      const statNumbers = clone.querySelectorAll('[style*="Oswald"], .font-oswald');
      statNumbers.forEach(num => {
        const htmlNum = num as HTMLElement;
        htmlNum.style.fontFamily = "'Oswald', sans-serif";
        htmlNum.style.fontWeight = '700';
        htmlNum.style.whiteSpace = 'nowrap';
      });

      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = isSingleTable ? '20px' : '28px';
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.borderRadius = isSingleTable ? '24px' : '32px';
      frameWrapper.style.width = targetWidth;
      frameWrapper.style.minWidth = targetWidth;
      frameWrapper.style.maxWidth = targetWidth;
      frameWrapper.style.boxSizing = 'border-box';
      frameWrapper.style.boxShadow = 'none';
      frameWrapper.appendChild(clone);
      tempContainer.appendChild(frameWrapper);
      document.body.appendChild(tempContainer);

      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 100));

      const exactHeight = Math.max(frameWrapper.scrollHeight, frameWrapper.offsetHeight, clone.scrollHeight, 100);

      let dataUrl: string = '';
      try {
        const canvas = await html2canvas(frameWrapper, {
          scale: 2.5,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: targetWidthPx,
          windowWidth: targetWidthPx,
        });
        dataUrl = canvas.toDataURL('image/png');
      } catch (h2cErr) {
        console.warn('html2canvas failed, fallback to domToPng:', h2cErr);
        dataUrl = await domToPng(frameWrapper, {
          scale: 2.5,
          backgroundColor: '#ffffff',
          width: targetWidthPx,
          height: exactHeight,
          features: { removeControlCharacter: true }
        });
      }

      document.body.removeChild(tempContainer);
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing offscreen:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const captureElement = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) return;
    await captureOffscreenHelper(ref.current, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 selection:bg-indigo-100 selection:text-indigo-900" style={{ fontFamily: '"Inter", sans-serif' }}>
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
        
        /* Ensure no elements inside the capturing target crop their content */
        .capturing-screenshot .capturing-target,
        .capturing-screenshot .capturing-target *,
        .capturing-screenshot .overflow-hidden {
          overflow: visible !important;
        }
      `}} />
      {/* Excel loading & processing overlay (Rendered via Portal to sit on top of Sidebar & Header) */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <AnimatePresence>
          {(isProcessingData || isInitialLoading) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/90 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center"
              >
                <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-400 border-b-transparent border-l-transparent animate-spin"></div>
                  <FileSpreadsheet size={32} className="text-indigo-600 animate-bounce" />
                </div>
                
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider mb-2">
                  {isProcessingData ? "Đang xử lý dữ liệu..." : "Đang tải dữ liệu..."}
                </h3>
                <p className="text-[12px] font-medium text-slate-500 max-w-[240px]">
                  {isProcessingData 
                    ? "Hệ thống đang phân tích cấu trúc cột, làm sạch dữ liệu và tự động nhóm các ngành hàng/hãng sản xuất. Vui lòng chờ trong giây lát."
                    : "Hệ thống đang đồng bộ và tải dữ liệu cài đặt thi đua từ máy chủ. Vui lòng chờ trong giây lát."}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <main className="max-w-[1800px] mx-auto p-3 sm:p-6 space-y-6">
        {/* Top Horizontal Subtab Navigation Bar — Mobile only (sidebar has these on desktop) */}
        <div className="md:hidden bg-white/90 backdrop-blur-xl p-2 rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-start gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'summary', label: 'TỔNG QUAN', icon: LayoutGrid, grad: 'from-indigo-600 to-purple-600' },
            { id: 'cum', label: 'CỤM', icon: Store, grad: 'from-blue-600 to-indigo-600' },
            { id: 'efficiency', label: 'THƯỞNG QL/TC', icon: Activity, grad: 'from-emerald-600 to-teal-600' },
            { id: 'thuong_st', label: 'THƯỞNG ST', icon: Zap, grad: 'from-amber-500 to-orange-500' },
            { id: 'bcdtnh', label: 'BC DT NGÀNH HÀNG', icon: LayoutGrid, grad: 'from-teal-600 to-cyan-600' },
            { id: 'ssg_boss', label: 'SSG BOSS', icon: Trophy, grad: 'from-amber-600 to-yellow-500' }
          ].map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-2xl text-[11px] sm:text-[12.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 cursor-pointer shrink-0 active:scale-95 ${
                  isActive
                    ? `bg-gradient-to-r ${item.grad} text-white shadow-md shadow-indigo-500/20 scale-[1.02]`
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area - Full Width */}
        <div className="w-full min-w-0 space-y-6">
          {pageMaintenanceState[`luyke_${activeTab}`] && !isUser43751Local ? (
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
            {activeTab === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Store Selector Pills */}
                {filteredMarkets.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 mb-2 no-capture">
                    <button 
                      onClick={() => setMarketFilter('ALL')}
                      className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm ${
                        marketFilter === 'ALL' ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      TẤT CẢ SIÊU THỊ
                    </button>
                    {filteredMarkets.map((m: any, i: number) => (
                      <button 
                        key={i}
                        onClick={() => setMarketFilter(m.name)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm ${
                          marketFilter === m.name ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={captureRefs.fullDashboard} className="space-y-6">
                  {/* Top Dashboard for each market */}
                  {marketsForDashboard.map((market: any, mIdx: number) => {
                    const { displayTargetQD, targetData } = resolveMarketTarget(market);
                    const actualVirtual = market.actualVirtual || 0;
                    const actualReal = market.actualReal || 0;
                    const percentHTVal = displayTargetQD > 0 ? Math.round((daysPassed > 0 && totalDays > 0 ? (((actualVirtual) / daysPassed) * totalDays) : actualVirtual) / displayTargetQD * 100 * 10) / 10 : 0;
                    const dtlkVal = targetData?.stDtlk || actualReal || 0;
                    const dtqdVal = targetData?.stDtqd || actualVirtual || 0;
                    const percentQDVal = dtlkVal > 0 ? ((dtqdVal - dtlkVal) / dtlkVal) * 100 : (market.percentQD || 0);
                    const installmentRate = (market.installmentRate || 0).toFixed(1);
                    const billCount = market.billCount || 0;
                    const storeAddress = (storeSettings as any)?.[market.name]?.address || (storeSettings as any)?.[maKho]?.address || 'LUỸ KẾ THÁNG';

                    let lnttVal = market.percentHTTargetDuKienLNTT ?? (targetData as any)?.percentHTTargetDuKienLNTT ?? 0;
                    if (!lnttVal && clusterSummaryInput) {
                      const lines = clusterSummaryInput.split('\n').map((l: string) => l.trim()).filter(Boolean);
                      let lnttColIdx = -1;
                      let nameColIdx = -1;
                      for (const line of lines) {
                        const lower = line.toLowerCase();
                        if (lower.includes('stt') || lower.includes('tên siêu thị') || lower.includes('tên miền') || lower.includes('dt hôm qua')) {
                          const cols = line.split(/\t|\||\s{2,}/).map((c: string) => c.trim());
                          nameColIdx = cols.findIndex((c: string) => {
                            const l = c.toLowerCase();
                            return l.includes('tên siêu thị') || l.includes('tên miền') || l.includes('siêu thị');
                          });
                          lnttColIdx = cols.findIndex((c: string) => {
                            const l = c.toLowerCase();
                            return (l.includes('% ht target') || l.includes('% ht') || l.includes('%ht')) && l.includes('lntt');
                          });
                          continue;
                        }
                        const cols = line.split(/\t|\||\s{2,}/).map((c: string) => c.trim());
                        if (cols.length < 2) continue;
                        const normMarket = normalize(market.name);
                        const isMatch = cols.some((c: string) => {
                          const normC = normalize(c);
                          return normC && (normC === normMarket || normC.includes(normMarket) || normMarket.includes(normC));
                        });
                        if (isMatch) {
                          if (lnttColIdx !== -1 && lnttColIdx < cols.length) {
                            const n = cleanNum(cols[lnttColIdx]);
                            if (n) lnttVal = n;
                          } else if (cols.length >= 11) {
                            const n = cleanNum(cols[10]);
                            if (n) lnttVal = n;
                          } else if (nameColIdx !== -1 && nameColIdx + 10 < cols.length) {
                            const n = cleanNum(cols[nameColIdx + 10]);
                            if (n) lnttVal = n;
                          }
                          break;
                        }
                      }
                    }

                    return (
                      <div key={market.name || mIdx} className="relative overflow-hidden bg-white/95 backdrop-blur-md p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-indigo-100/90 shadow-[0_4px_25px_-4px_rgba(79,70,229,0.08)] space-y-4">
                        {/* Ambient background glow */}
                        <div className="absolute -top-10 -right-10 w-44 h-44 bg-gradient-to-br from-indigo-200/30 to-transparent rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-gradient-to-tr from-emerald-100/30 to-transparent rounded-full blur-2xl pointer-events-none" />

                        {/* Store Header with address & Camera */}
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3.5 border-b border-slate-100/80">
                          <div className="flex items-center gap-3.5">
                            {/* 3D Gradient Store Icon Box */}
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-500/25 shrink-0 border border-white/50">
                              <Store size={22} strokeWidth={2.2} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                  ĐANG HOẠT ĐỘNG
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200/70 text-[10.5px] font-extrabold uppercase tracking-wider text-indigo-700">
                                  📊 BÁO CÁO LUỸ KẾ THÁNG
                                </span>
                              </div>
                              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-850 tracking-tight uppercase flex items-center gap-2 flex-wrap">
                                <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">{market.name}</span>
                                {storeAddress && <span className="text-xs font-bold text-slate-400 font-normal">| {storeAddress}</span>}
                              </h2>
                            </div>
                          </div>

                          <button
                            onClick={() => captureElement(captureRefs.fullDashboard, 'TongQuan_LuyKe')}
                            className="no-capture inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 cursor-pointer w-full sm:w-auto self-start sm:self-auto border border-white/20"
                          >
                            <Camera size={16} />
                            <span>Chụp tổng quan</span>
                          </button>
                        </div>

                        {/* 6 Gradient StatCards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                          <StatCard
                            title="TAGET QĐ"
                            value={formatCurrencyUnit(displayTargetQD)}
                            icon={Target}
                            color="rose"
                          />
                          <StatCard
                            title="DOANH THU QUY ĐỔI"
                            value={formatCurrencyUnit(actualVirtual)}
                            icon={TrendingUp}
                            color="indigo"
                          />
                          <StatCard
                            title="%HT"
                            value={`${percentHTVal}%`}
                            icon={BarChart3}
                            color="emerald"
                          />
                          <StatCard
                            title="TỶ TRỌNG TRẢ GÓP"
                            value={`${installmentRate}%`}
                            icon={Calendar}
                            color="amber"
                          />
                          <StatCard
                            title="% QĐ"
                            value={`${percentQDVal >= 0 ? `+${percentQDVal.toFixed(1)}%` : `${percentQDVal.toFixed(1)}%`}`}
                            icon={Zap}
                            color="orange"
                          />
                          <StatCard
                            title="%HT Target Dự kiến (LNTT)"
                            value={`${Math.round(lnttVal)}%`}
                            icon={CreditCard}
                            color="blue"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {/* CHI TIẾT NGÀNH HÀNG (LUỸ KẾ) */}
                  <div ref={captureRefs.category} className="space-y-3.5">
                    {/* Pill Actions & Sort Controls (Hidden on screenshot export) */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 no-capture">
                      {/* Quick Sort Category Controls */}
                      <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 shadow-2xs flex-wrap">
                        <span className="text-[11px] font-black uppercase text-slate-500 px-2 hidden sm:inline">
                          SẮP XẾP:
                        </span>
                        <button
                          onClick={() => {
                            setSortModeSL('HT_DESC');
                            setSortModeDT('HT_DESC');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            sortModeSL === 'HT_DESC' && sortModeDT === 'HT_DESC'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                          }`}
                          title="Sắp xếp theo % hoàn thành cao nhất"
                        >
                          📊 MẶC ĐỊNH (%HT)
                        </button>
                        <button
                          onClick={() => {
                            setSortModeSL('CONLAI_DESC');
                            setSortModeDT('CONLAI_DESC');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            sortModeSL === 'CONLAI_DESC' && sortModeDT === 'CONLAI_DESC'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                          }`}
                          title="Sắp xếp theo số lượng/doanh thu Còn Lại cần đạt nhiều nhất"
                        >
                          <span>🔥 C.LẠI GIẢM DẦN</span>
                        </button>
                        <button
                          onClick={() => {
                            setSortModeSL('CONLAI_ASC');
                            setSortModeDT('CONLAI_ASC');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            sortModeSL === 'CONLAI_ASC' && sortModeDT === 'CONLAI_ASC'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                          }`}
                          title="Sắp xếp theo Còn Lại tăng dần (Đã đạt / thiếu ít lên trước)"
                        >
                          <span>✨ C.LẠI TĂNG DẦN</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleOpenCategoryCommentModal}
                          className="flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] text-white shadow-md shadow-indigo-500/25 transition-all duration-300 active:scale-95 cursor-pointer border border-indigo-400/30"
                          title="Nhận xét doanh thu & ngành hàng luỹ kế"
                        >
                          <MessageSquare size={14} className="text-white shrink-0" />
                          <span>NHẬN XÉT</span>
                        </button>

                        <button
                          onClick={() => captureElement(captureRefs.category, 'NganhHang_LuyKe')}
                          className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[12px] font-black uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all duration-300 active:scale-95 cursor-pointer"
                          title="Chụp ảnh 2 bảng Ngành hàng"
                        >
                          <Camera size={15} />
                          <span>Chụp ảnh báo cáo</span>
                        </button>
                      </div>
                    </div>

                    {/* 2 Tables Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* Left Table: SLLK */}
                      <div ref={captureRefs.categorySL} className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden min-w-0 flex flex-col p-3.5 shadow-sm">
                        {/* Unified Emerald Gradient Header Banner */}
                        <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] p-4 rounded-2xl text-white relative shrink-0 mb-2.5">
                          <div className="flex flex-col items-center justify-center text-center">
                            <h2 className="text-[23px] sm:text-[27px] font-black text-[#FEF08A] uppercase tracking-wide drop-shadow-sm leading-tight" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                              NGÀNH HÀNG (SL)
                            </h2>
                            <div className="flex items-center justify-center flex-nowrap whitespace-nowrap gap-2 mt-1.5 text-xs sm:text-sm font-bold text-white/95" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                ⚡ Luỹ kế: {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                              </span>
                              <span className="opacity-70">||</span>
                              <span className="text-white font-extrabold whitespace-nowrap">
                                ĐẠT : {filteredCategories.filter((c: any) => c.type === 'SL' || c.type === 'ALL').filter((c: any) => {
                                  let rate = 0;
                                  if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
                                  return Math.round(rate) >= 100;
                                }).length}/{filteredCategories.filter((c: any) => c.type === 'SL' || c.type === 'ALL').length}
                              </span>
                              <span className="opacity-70">||</span>
                              <span className="text-emerald-100 font-bold whitespace-nowrap">
                                TGSD: {daysPassed}/{totalDays}
                              </span>
                            </div>
                          </div>

                          {/* Camera Capture Button */}
                          <button
                            onClick={() => captureElement(captureRefs.categorySL, 'NganhHang_SL_LuyKe')}
                            className="no-capture absolute right-3 top-3 p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-all cursor-pointer border border-white/25 active:scale-95"
                            title="Chụp ảnh bảng Ngành hàng SL"
                          >
                            <Camera size={16} />
                          </button>
                        </div>

                        {showSllkComment && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2.5 no-capture">
                            <textarea
                              value={sllkComment}
                              onChange={(e) => setSllkComment(e.target.value)}
                              placeholder="Nhập nhận xét cho bảng SLLK..."
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-emerald-500/20 resize-none min-h-[60px] screenshot-comment"
                            />
                          </div>
                        )}

                        <div className="overflow-x-auto w-full grow rounded-2xl border border-emerald-300/80">
                          <table className="w-full border-separate border-spacing-0 table-fixed" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                            <colgroup>
                              <col style={{ width: '44px' }} />
                              <col style={{ width: 'auto' }} />
                              <col style={{ width: '68px' }} />
                              <col style={{ width: '68px' }} />
                              <col style={{ width: '62px' }} />
                              <col style={{ width: '72px' }} />
                            </colgroup>
                            <thead>
                              <tr className="text-white h-[46px]">
                                <th className="px-1 py-0 text-[14.5px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">STT</th>
                                <th className="px-2.5 py-0 text-[14.5px] font-black uppercase text-left border-r border-b border-emerald-600 bg-[#059669]">NGÀNH HÀNG</th>
                                <th className="px-1 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">TARGET</th>
                                <th className="px-1 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">LUỸ KẾ</th>
                                <th 
                                  onClick={() => setSortModeSL(prev => prev === 'HT_DESC' ? 'HT_ASC' : 'HT_DESC')}
                                  className={`px-1 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-emerald-600 cursor-pointer select-none transition-colors ${
                                    sortModeSL.startsWith('HT') ? 'bg-[#035940] hover:bg-[#024a35]' : 'bg-[#059669] hover:bg-[#047857]'
                                  }`}
                                  title="Bấm để sắp xếp %HT (Giảm dần / Tăng dần)"
                                >
                                  <div className="flex items-center justify-center gap-0.5">
                                    <span>%HT</span>
                                    <span className="text-[10.5px] opacity-90">{sortModeSL === 'HT_DESC' ? '▼' : (sortModeSL === 'HT_ASC' ? '▲' : '⇅')}</span>
                                  </div>
                                </th>
                                <th 
                                  onClick={() => setSortModeSL(prev => prev === 'CONLAI_DESC' ? 'CONLAI_ASC' : 'CONLAI_DESC')}
                                  className={`px-1 py-0 text-[13.5px] font-black uppercase text-center border-b border-emerald-600 cursor-pointer select-none transition-colors ${
                                    sortModeSL.startsWith('CONLAI') ? 'bg-amber-700 hover:bg-amber-800' : 'bg-[#047857] hover:bg-[#036348]'
                                  }`}
                                  title="Bấm để sắp xếp theo C.LẠI (Còn lại nhiều nhất / ít nhất)"
                                >
                                  <div className="flex items-center justify-center gap-0.5">
                                    <span>C.LẠI</span>
                                    <span className="text-[10.5px] opacity-90">{sortModeSL === 'CONLAI_DESC' ? '▼' : (sortModeSL === 'CONLAI_ASC' ? '▲' : '⇅')}</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortCategoryList(
                                filteredCategories.filter((c: any) => c.type === 'SL' || c.type === 'ALL'),
                                sortModeSL
                              ).map((cat: any, idx: number) => {
                                let rate = 0;
                                if (cat.target > 0 && daysPassed > 0) rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                                const remaining = cat.target - cat.revenue;
                                const isEven = idx % 2 === 0;
                                return (
                                  <tr key={idx} className={`${isEven ? 'bg-white' : 'bg-emerald-50/20'} hover:bg-emerald-50/70 transition-colors h-[40px]`}>
                                    <td className="px-1 py-0 text-[14.5px] font-black text-slate-700 text-center border-r border-b border-emerald-100/90 bg-emerald-50/40">{idx + 1}</td>
                                    <td className={`px-2.5 py-0 text-[14px] font-black uppercase border-r border-b border-emerald-100/90 truncate tracking-tight ${Math.round(rate) < 100 ? 'text-rose-600' : 'text-slate-900'}`} title={cat.name}>{cat.name}</td>
                                    <td className="px-1 py-0 text-[14.5px] font-bold text-center border-r border-b border-emerald-100/90 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>
                                    <td className="px-1 py-0 text-[14.5px] font-black text-center border-r border-b border-emerald-100/90 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>
                                    <td className="px-0.5 py-0 text-center border-r border-b border-emerald-100/90 whitespace-nowrap">
                                      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[14px] leading-none ${Math.round(rate) >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'}`}>
                                        {Math.round(rate)}%
                                      </span>
                                    </td>
                                    <td className={`px-1 py-0 text-[14.5px] font-bold text-center border-b border-emerald-100/90 ${sortModeSL.startsWith('CONLAI') ? 'bg-amber-50/60 font-black' : ''} text-rose-600`}>
                                      {remaining > 0 ? Math.round(remaining).toLocaleString() : ""}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right Table: DTLK */}
                      <div ref={captureRefs.categoryDT} className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden min-w-0 flex flex-col p-3.5 shadow-sm">
                        {/* Unified Emerald Gradient Header Banner */}
                        <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] p-4 rounded-2xl text-white relative shrink-0 mb-2.5">
                          <div className="flex flex-col items-center justify-center text-center">
                            <h2 className="text-[23px] sm:text-[27px] font-black text-[#FEF08A] uppercase tracking-wide drop-shadow-sm leading-tight" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                              NGÀNH HÀNG (DT)
                            </h2>
                            <div className="flex items-center justify-center flex-nowrap whitespace-nowrap gap-2 mt-1.5 text-xs sm:text-sm font-bold text-white/95" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                ⚡ Luỹ kế: {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                              </span>
                              <span className="opacity-70">||</span>
                              <span className="text-white font-extrabold whitespace-nowrap">
                                ĐẠT : {filteredCategories.filter((c: any) => c.type === 'DT' || c.type === 'ALL').filter((c: any) => {
                                  let rate = 0;
                                  if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
                                  return Math.round(rate) >= 100;
                                }).length}/{filteredCategories.filter((c: any) => c.type === 'DT' || c.type === 'ALL').length}
                              </span>
                              <span className="opacity-70">||</span>
                              <span className="text-emerald-100 font-bold whitespace-nowrap">
                                TGSD: {daysPassed}/{totalDays}
                              </span>
                            </div>
                          </div>

                          {/* Camera Capture Button */}
                          <button
                            onClick={() => captureElement(captureRefs.categoryDT, 'NganhHang_DT_LuyKe')}
                            className="no-capture absolute right-3 top-3 p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-all cursor-pointer border border-white/25 active:scale-95"
                            title="Chụp ảnh bảng Ngành hàng DT"
                          >
                            <Camera size={16} />
                          </button>
                        </div>

                        {showDtlkComment && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2.5 no-capture">
                            <textarea
                              value={dtlkComment}
                              onChange={(e) => setDtlkComment(e.target.value)}
                              placeholder="Nhập nhận xét cho bảng DTLK..."
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-emerald-500/20 resize-none min-h-[60px] screenshot-comment"
                            />
                          </div>
                        )}

                        <div className="overflow-x-auto w-full grow rounded-2xl border border-emerald-300/80">
                          <table className="w-full border-separate border-spacing-0 table-fixed" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                            <colgroup>
                              <col style={{ width: '44px' }} />
                              <col style={{ width: 'auto' }} />
                              <col style={{ width: '68px' }} />
                              <col style={{ width: '68px' }} />
                              <col style={{ width: '62px' }} />
                              <col style={{ width: '72px' }} />
                            </colgroup>
                            <thead>
                              <tr className="text-white h-[46px]">
                                <th className="px-1 py-0 text-[14.5px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">STT</th>
                                <th className="px-2.5 py-0 text-[14.5px] font-black uppercase text-left border-r border-b border-emerald-600 bg-[#059669]">NGÀNH HÀNG</th>
                                <th className="px-1 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">TARGET</th>
                                <th className="px-1 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">LUỸ KẾ</th>
                                <th 
                                  onClick={() => setSortModeDT(prev => prev === 'HT_DESC' ? 'HT_ASC' : 'HT_DESC')}
                                  className={`px-1 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-emerald-600 cursor-pointer select-none transition-colors ${
                                    sortModeDT.startsWith('HT') ? 'bg-[#035940] hover:bg-[#024a35]' : 'bg-[#059669] hover:bg-[#047857]'
                                  }`}
                                  title="Bấm để sắp xếp %HT (Giảm dần / Tăng dần)"
                                >
                                  <div className="flex items-center justify-center gap-0.5">
                                    <span>%HT</span>
                                    <span className="text-[10.5px] opacity-90">{sortModeDT === 'HT_DESC' ? '▼' : (sortModeDT === 'HT_ASC' ? '▲' : '⇅')}</span>
                                  </div>
                                </th>
                                <th 
                                  onClick={() => setSortModeDT(prev => prev === 'CONLAI_DESC' ? 'CONLAI_ASC' : 'CONLAI_DESC')}
                                  className={`px-1 py-0 text-[13.5px] font-black uppercase text-center border-b border-emerald-600 cursor-pointer select-none transition-colors ${
                                    sortModeDT.startsWith('CONLAI') ? 'bg-amber-700 hover:bg-amber-800' : 'bg-[#047857] hover:bg-[#036348]'
                                  }`}
                                  title="Bấm để sắp xếp theo C.LẠI (Còn lại nhiều nhất / ít nhất)"
                                >
                                  <div className="flex items-center justify-center gap-0.5">
                                    <span>C.LẠI</span>
                                    <span className="text-[10.5px] opacity-90">{sortModeDT === 'CONLAI_DESC' ? '▼' : (sortModeDT === 'CONLAI_ASC' ? '▲' : '⇅')}</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortCategoryList(
                                filteredCategories.filter((c: any) => c.type === 'DT' || c.type === 'ALL'),
                                sortModeDT
                              ).map((cat: any, idx: number) => {
                                let rate = 0;
                                if (cat.target > 0 && daysPassed > 0) rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                                const remaining = cat.target - cat.revenue;
                                const isEven = idx % 2 === 0;
                                return (
                                  <tr key={idx} className={`${isEven ? 'bg-white' : 'bg-emerald-50/20'} hover:bg-emerald-50/70 transition-colors h-[40px]`}>
                                    <td className="px-1 py-0 text-[14.5px] font-black text-slate-700 text-center border-r border-b border-emerald-100/90 bg-emerald-50/40">{idx + 1}</td>
                                    <td className={`px-2.5 py-0 text-[14px] font-black uppercase border-r border-b border-emerald-100/90 truncate tracking-tight ${Math.round(rate) < 100 ? 'text-rose-600' : 'text-slate-900'}`} title={cat.name}>{cat.name}</td>
                                    <td className="px-1 py-0 text-[14.5px] font-bold text-center border-r border-b border-emerald-100/90 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>
                                    <td className="px-1 py-0 text-[14.5px] font-black text-center border-r border-b border-emerald-100/90 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>
                                    <td className="px-0.5 py-0 text-center border-r border-b border-emerald-100/90 whitespace-nowrap">
                                      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[14px] leading-none ${Math.round(rate) >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'}`}>
                                        {Math.round(rate)}%
                                      </span>
                                    </td>
                                    <td className={`px-1 py-0 text-[14.5px] font-bold text-center border-b border-emerald-100/90 ${sortModeDT.startsWith('CONLAI') ? 'bg-amber-50/60 font-black' : ''} text-rose-600`}>
                                      {remaining > 0 ? Math.round(remaining).toLocaleString() : ""}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'cum' && (
              <motion.div
                key="cum"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <ClusterReportTab
                  clusterSummaryInput={clusterSummaryInput}
                  categoryRevenueInput={
                    clusterSummaryInput ||
                    localStorage.getItem('rt_catrev') ||
                    localStorage.getItem('rtst_cluster_summary') ||
                    localStorage.getItem('rtst_catrev') ||
                    ''
                  }
                  clusterMarkets={displayData.markets}
                  userProfile={userProfile}
                  daysPassed={daysPassed}
                  totalDays={totalDays}
                  onNavigateToKhaiBao={() => {
                    try {
                      localStorage.setItem('crm_active_page', 'khaibao');
                    } catch {}
                    window.location.search = '?page=khaibao';
                  }}
                  onSaveClusterData={(val: string) => {
                    setClusterSummaryInput(val);
                    try {
                      localStorage.setItem('rt_catrev', val);
                      localStorage.setItem('rtst_cluster_summary', val);
                      localStorage.setItem('rtst_catrev', val);
                    } catch {}
                    saveLuykeData(false, 'auto', undefined, undefined, 'LUỸ KẾ DT');
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'efficiency' && (
              <motion.div
                key="efficiency"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {String(userProfile?.username).trim() === '43751' ? (
                  <BonusCalculatorForm
                    activeStore={marketFilter}
                    filteredMarkets={filteredMarkets}
                    clusterMarkets={displayData.markets}
                  />
                ) : (
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Activity size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">THƯỞNG QUẢN LÝ / TRƯỞNG CA</h3>
                        <p className="text-sm text-slate-400">Phân tích hiệu quả & tính thưởng theo tháng</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <Activity size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-wider">Đang trong quá trình xây dựng</p>
                      <p className="text-xs text-slate-300 mt-1">Tính năng tính thưởng quản lý / trưởng ca đang trong quá trình xây dựng và phát triển. Vui lòng quay lại sau.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'thuong_st' && (
              <motion.div
                key="thuong_st"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >

                {/* Single Unified Excel File Status & Upload Bar */}
                {isExcelActive && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    {/* Left: Single file info display */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0 shadow-xs border border-emerald-100">
                        <FileSpreadsheet size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">
                            {isComparing ? 'Dữ liệu thi đua (So sánh 2 ngày Domino)' : 'File thi đua đang hoạt động'}
                          </p>
                          {isComparing && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              Đang so sánh
                            </span>
                          )}
                        </div>

                        {/* File Name(s) */}
                        <div className="text-sm font-black text-slate-800 mt-0.5 flex items-center gap-2 flex-wrap">
                          {isComparing ? (
                            <>
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold truncate max-w-[220px]" title={activeExcelOldFileName}>
                                📅 Cũ: {activeExcelOldFileName}
                              </span>
                              <span className="text-slate-400 text-xs font-black">➔</span>
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black truncate max-w-[220px]" title={activeExcelFileName}>
                                ⚡ Mới: {activeExcelFileName}
                              </span>
                            </>
                          ) : (
                            <span className="truncate max-w-[400px]" title={activeExcelFileName || 'Du_Lieu_Thi_Dua.xlsx'}>
                              ⚡ {activeExcelFileName || 'Du_Lieu_Thi_Dua.xlsx'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Single Domino Upload Button */}
                      <div className="relative">
                        <button className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95">
                          <Upload size={14} />
                          <span>+ TẢI FILE MỚI</span>
                        </button>
                        <input 
                          type="file" 
                          multiple
                          accept=".xlsx, .xls" 
                          onChange={handleExcelUpload} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Tải file theo cơ chế Domino: Thêm 1 file mới thì file hiện tại sẽ thành Hôm qua, file mới thành Hôm nay!"
                        />
                      </div>

                      {isComparing && (
                        <button
                          onClick={handleSwapOldAndNew}
                          className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Đổi thứ tự: Đảo vị trí giữa File Cũ ⇄ File Mới"
                        >
                          <RefreshCw size={13} />
                          <span>ĐỔI VỊ TRÍ</span>
                        </button>
                      )}

                      {isComparing && (
                        <button
                          onClick={handleClearOldFile}
                          className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                          title="Tắt chế độ so sánh (chỉ xem 1 file hôm nay)"
                        >
                          <X size={13} />
                          <span>TẮT SO SÁNH</span>
                        </button>
                      )}

                      <button 
                        onClick={handleClearAllExcelData}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition-all cursor-pointer"
                        title="Xóa toàn bộ dữ liệu thi đua"
                      >
                        <Trash2 size={13} />
                        <span>XÓA HẾT</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Container when there's no data */}
                {!isExcelActive ? (
                  <div className="bg-white border-2 border-dashed border-slate-300 rounded-[32px] p-8 sm:p-12 text-center hover:border-emerald-400 hover:bg-emerald-50/20 transition-all cursor-pointer relative shadow-sm">
                    <input 
                      type="file" 
                      multiple
                      accept=".xlsx, .xls" 
                      onChange={handleExcelUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                        <Upload size={28} />
                      </div>
                      <div className="space-y-1.5 max-w-lg">
                        <h4 className="text-base sm:text-lg font-black text-slate-800">Tải lên file Excel kết quả Thi đua - Thưởng</h4>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                          Chọn <span className="text-emerald-700 font-bold">1 file</span> (Hôm nay) hoặc <span className="text-emerald-700 font-bold">2 file</span> (Cũ & Mới) để nạp dữ liệu
                        </p>
                        <div className="flex flex-col items-center gap-1 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 mt-2 text-left w-full">
                          <div className="font-black flex items-center gap-1.5 text-emerald-800">
                            <span>⚡ Cơ chế nạp file Domino:</span>
                          </div>
                          <div className="text-[11.5px] font-medium space-y-0.5 text-slate-700">
                            <div>• <strong>Thêm 1 file đầu tiên:</strong> Mặc định hiểu là File Hôm Nay (Mới).</div>
                            <div>• <strong>Thêm tiếp 1 file ngày hôm sau:</strong> File Hôm Nay trước đó tự động đẩy thành Hôm Qua (Cũ), file mới nạp sẽ là Hôm Nay (Mới).</div>
                            <div>• <strong>Chọn cùng lúc 2 file:</strong> File chọn trước là Hôm Qua, File chọn sau là Hôm Nay.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Display modern V2 table */
                  <div className="space-y-4">
                    {/* Action Bar with Filter & AI Comment buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs no-capture">
                      {/* Left: Filter Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Tab: Tất cả */}
                        <button
                          onClick={() => setBonusFilterTab('ALL')}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border active:scale-95 ${
                            bonusFilterTab === 'ALL'
                              ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>TẤT CẢ</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${bonusFilterTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {thuongStStats.all.length}
                          </span>
                        </button>

                        {/* Tab: Có thưởng */}
                        <button
                          onClick={() => setBonusFilterTab('BONUS')}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border active:scale-95 ${
                            bonusFilterTab === 'BONUS'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                          }`}
                          title="Lọc chỉ hiển thị các ngành hàng có thưởng hôm nay"
                        >
                          <Award size={13} />
                          <span>CÓ THƯỞNG</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${bonusFilterTab === 'BONUS' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                            {thuongStStats.bonusRows.length}
                          </span>
                        </button>

                        {/* Tab: Giảm/Mất thưởng (Khi so sánh) */}
                        {isComparing && (
                          <button
                            onClick={() => setBonusFilterTab('DECREASED')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border active:scale-95 ${
                              bonusFilterTab === 'DECREASED'
                                ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20'
                                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                            }`}
                            title="Lọc các ngành hàng bị giảm tiền thưởng hoặc mất thưởng so với hôm qua"
                          >
                            <span>🔴 GIẢM THƯỞNG</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${bonusFilterTab === 'DECREASED' ? 'bg-white/25 text-white' : 'bg-rose-200 text-rose-900'}`}>
                              {thuongStStats.decreasedRows.length}
                            </span>
                          </button>
                        )}

                        {/* Tab: Tăng thưởng (Khi so sánh) */}
                        {isComparing && (
                          <button
                            onClick={() => setBonusFilterTab('INCREASED')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border active:scale-95 ${
                              bonusFilterTab === 'INCREASED'
                                ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-500/20'
                                : 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100'
                            }`}
                            title="Lọc các ngành hàng tăng thêm tiền thưởng hoặc mới đạt thưởng"
                          >
                            <span>🟢 TĂNG THƯỞNG</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${bonusFilterTab === 'INCREASED' ? 'bg-white/25 text-white' : 'bg-teal-200 text-teal-900'}`}>
                              {thuongStStats.increasedRows.length}
                            </span>
                          </button>
                        )}

                        {/* AI Comment Button */}
                        <button
                          onClick={() => {
                            handleGenerateAIComment(thuongStTemplate);
                            setThuongStCommentOpen(true);
                          }}
                          disabled={isGeneratingAI}
                          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer disabled:opacity-60"
                          title="Tự động phân tích dữ liệu thi đua và tạo nhận xét AI"
                        >
                          {isGeneratingAI ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>AI ĐANG PHÂN TÍCH...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} className="animate-pulse" />
                              <span>NHẬN XÉT AI</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Right Action: Camera Export Button */}
                      <button
                        onClick={() => captureElement(captureRefs.thuongSt, 'BaoCaoThuongSt')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                      >
                        <Camera size={15} />
                        <span>Chụp ảnh báo cáo</span>
                      </button>
                    </div>

                    {/* Main Capture Box */}
                    <div ref={captureRefs.thuongSt} className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden flex flex-col p-4 sm:p-5 shadow-sm space-y-4">
                      {/* Unified Emerald Gradient Header Banner */}
                      <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] p-4 sm:p-5 rounded-2xl text-white relative shadow-sm">
                        <div className="flex flex-col items-center justify-center text-center">
                          <h2 className="text-[22px] sm:text-[26px] font-black text-[#FEF08A] uppercase tracking-wide drop-shadow-sm leading-tight" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                            THƯỞNG THI ĐUA SIÊU THỊ
                          </h2>
                          <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3 mt-1.5 text-xs sm:text-sm font-bold text-white/95" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              🏪 {selectedStoreFilter}
                            </span>
                            <span className="opacity-70">||</span>
                            <span className="text-white font-extrabold whitespace-nowrap">
                              🏆 TOP 10% HẠNG ≤ {selectedStoreExcelData.limit}
                            </span>
                            <span className="opacity-70">||</span>
                            <span className="text-emerald-100 font-bold whitespace-nowrap">
                              ⚡ LUỸ KẾ THÁNG
                            </span>
                            {isComparing && (
                              <>
                                <span className="opacity-70">||</span>
                                <span className="text-yellow-200 font-black whitespace-nowrap bg-emerald-800/60 px-2 py-0.5 rounded-lg border border-yellow-300/40">
                                  📊 SO SÁNH VỚI HÔM QUA
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Camera Capture Button */}
                        <button
                          onClick={() => captureElement(captureRefs.thuongSt, 'BaoCaoThuongSt')}
                          className="no-capture absolute right-3 top-3 p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-all cursor-pointer border border-white/25 active:scale-95"
                          title="Chụp ảnh bảng Thưởng ST"
                        >
                          <Camera size={16} />
                        </button>
                      </div>

                      {/* Top KPI StatCards (2 Cards or 3 Cards when comparing) */}
                      <div className="thuong-st-kpi-grid grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Card 1: Luỹ kế kỳ báo cáo & Đối soát file */}
                        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-xs">
                          <div className="space-y-1 min-w-0">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              KỲ BÁO CÁO THI ĐUA
                            </span>
                            <div className="text-lg font-black text-slate-800 uppercase truncate" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                              DỰ KIẾN THƯỞNG LUỸ KẾ
                            </div>
                            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 flex-wrap">
                              {isComparing ? (
                                <>
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10.5px] font-bold truncate max-w-[130px]" title={selectedStoreExcelData.oldFileName}>
                                    📅 Cũ: {selectedStoreExcelData.oldFileName}
                                  </span>
                                  <span>➔</span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10.5px] font-bold truncate max-w-[130px]" title={selectedStoreExcelData.fileName}>
                                    ⚡ Mới: {selectedStoreExcelData.fileName}
                                  </span>
                                </>
                              ) : (
                                <span>Áp dụng theo quy chế thi đua tháng hiện tại</span>
                              )}
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs ml-2">
                            <Trophy size={24} />
                          </div>
                        </div>

                        {/* Card 2: Grand Total Bonus & Difference Badge */}
                        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white rounded-2xl border border-emerald-200 p-4 flex items-center justify-between shadow-xs">
                          <div className="space-y-1 min-w-0">
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                              TỔNG THƯỞNG DỰ KIẾN
                            </span>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <div className="text-2xl sm:text-3xl font-black text-emerald-700" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}>
                                {thuongStStats.totalBonusCurrent.toLocaleString('vi-VN')} ₫
                              </div>
                              {isComparing && (
                                <span className={`text-xs font-black flex items-center gap-1 shrink-0 ${
                                  thuongStStats.totalBonusDiff < 0 
                                    ? 'text-rose-600' 
                                    : (thuongStStats.totalBonusDiff > 0 ? 'text-emerald-700' : 'text-slate-500')
                                }`}>
                                  {thuongStStats.totalBonusDiff < 0 ? (
                                    <>▼ Giảm -{Math.abs(thuongStStats.totalBonusDiff).toLocaleString('vi-VN')} ₫</>
                                  ) : (
                                    thuongStStats.totalBonusDiff > 0 ? (
                                      <>▲ Tăng +{thuongStStats.totalBonusDiff.toLocaleString('vi-VN')} ₫</>
                                    ) : (
                                      <>⚖️ Không đổi</>
                                    )
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-emerald-600 truncate">
                              ✨ Đạt thưởng: {thuongStStats.bonusRows.length}/{thuongStStats.all.length} nhóm hàng
                              {isComparing && (
                                <span className="text-slate-500 font-medium ml-1">
                                  (Hôm qua: {thuongStStats.all.filter((r: any) => r.bonusOld > 0).length})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20 ml-2">
                            <Award size={24} />
                          </div>
                        </div>

                        {/* Card 3: Biến động chi tiết theo ngành (chỉ hiện khi có 2 file) */}
                        {isComparing && (
                          <div className="thuong-st-card-3 bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-col justify-between shadow-xs col-span-1 sm:col-span-2 min-h-[110px]">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 shrink-0">
                              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                BIẾN ĐỘNG SO VỚI HÔM QUA
                              </span>
                              <span className="text-[10px] font-bold text-indigo-600 shrink-0 whitespace-nowrap">
                                {thuongStStats.all.length} nhóm ngành
                              </span>
                            </div>

                            <div className="thuong-st-diff-grid grid grid-cols-2 gap-2 mt-2 grow">
                              {/* Red block: Giảm thưởng */}
                              <div 
                                onClick={() => setBonusFilterTab('DECREASED')}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                                  bonusFilterTab === 'DECREASED' 
                                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
                                    : 'bg-rose-50/50 border-rose-200/80 hover:bg-rose-50'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 leading-none">
                                  <span className="text-[11px] font-black text-rose-700 uppercase whitespace-nowrap shrink-0">
                                    🔴 GIẢM/MẤT
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-rose-200/90 text-rose-800 text-[10px] font-black shrink-0 whitespace-nowrap">
                                    {thuongStStats.decreasedRows.length} ngành
                                  </span>
                                </div>
                                <div className="text-[13px] font-black text-rose-600 mt-1.5 whitespace-nowrap leading-tight tracking-tight" style={{ fontFamily: "'UTM Avo', 'Oswald', sans-serif" }}>
                                  -{thuongStStats.totalDecreasedAmount.toLocaleString('vi-VN')} ₫
                                </div>
                              </div>

                              {/* Green block: Tăng thưởng */}
                              <div 
                                onClick={() => setBonusFilterTab('INCREASED')}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                                  bonusFilterTab === 'INCREASED' 
                                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
                                    : 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 leading-none">
                                  <span className="text-[11px] font-black text-emerald-700 uppercase whitespace-nowrap shrink-0">
                                    🟢 TĂNG/MỚI
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/90 text-emerald-800 text-[10px] font-black shrink-0 whitespace-nowrap">
                                    {thuongStStats.increasedRows.length} ngành
                                  </span>
                                </div>
                                <div className="text-[13px] font-black text-emerald-600 mt-1.5 whitespace-nowrap leading-tight tracking-tight" style={{ fontFamily: "'UTM Avo', 'Oswald', sans-serif" }}>
                                  +{thuongStStats.totalIncreasedAmount.toLocaleString('vi-VN')} ₫
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Note Pill */}
                      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs font-bold text-amber-900">
                        <AlertCircle size={15} className="shrink-0 text-amber-600" />
                        <span>Nếu Siêu Thị Nằm Top 10% Nhưng Không Có Thưởng Thì Là Do Nhóm Hàng Này Vùng Chưa Đạt Min Để Có Quỹ Thưởng.</span>
                      </div>

                      {/* Modern Capsule Table */}
                      <div className="overflow-x-auto w-full grow rounded-2xl border border-emerald-300/80">
                        <table className="w-full border-separate border-spacing-0 table-fixed" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                          <colgroup>
                            <col style={{ width: '44px' }} />
                            <col style={{ width: 'auto' }} />
                            <col style={{ width: isComparing ? '120px' : '115px' }} />
                            <col style={{ width: isComparing ? '125px' : '125px' }} />
                            <col style={{ width: isComparing ? '125px' : '125px' }} />
                            <col style={{ width: isComparing ? '170px' : '135px' }} />
                          </colgroup>
                          <thead>
                            <tr className="text-white h-[46px]">
                              <th className="px-1 py-0 text-[13px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">STT</th>
                              <th className="px-3 py-0 text-[13px] font-black uppercase text-left border-r border-b border-emerald-600 bg-[#059669]">NHÓM HÀNG</th>
                              <th className="px-1 py-0 text-[12px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">HOÀN THÀNH<br/><span className="text-[10px] font-bold opacity-90">(DỰ KIẾN)</span></th>
                              <th className="px-1 py-0 text-[12px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857]">HẠNG H.T TARGET<br/><span className="text-[10px] font-bold opacity-90">(THEO KÊNH)</span></th>
                              <th className="px-1 py-0 text-[12px] font-black uppercase text-center border-r border-b border-emerald-600 bg-[#059669]">HẠNG VƯỢT TRỘI<br/><span className="text-[10px] font-bold opacity-90">(DT/SL THEO KÊNH)</span></th>
                              <th className="px-1 py-0 text-[12px] font-black uppercase text-center border-b border-emerald-600 bg-[#047857]">THƯỞNG DỰ KIẾN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Render Group 1: Yellow */}
                            {filteredThuongStRows.yellow.map((row, idx) => renderThuongStRow(row, idx, 'yellow'))}
                            
                            {/* Separator / Gap between Yellow and Green groups */}
                            {filteredThuongStRows.yellow.length > 0 && filteredThuongStRows.green.length > 0 && (
                              <tr className="h-1.5 bg-emerald-100/50">
                                <td colSpan={6} className="p-0 border-b border-emerald-200 bg-emerald-100/40"></td>
                              </tr>
                            )}
                            
                            {/* Render Group 2: Green */}
                            {filteredThuongStRows.green.map((row, idx) => renderThuongStRow(row, idx, 'green'))}
                            
                            {/* Separator between Green and Blue groups */}
                            {filteredThuongStRows.green.length > 0 && filteredThuongStRows.blue.length > 0 && (
                              <tr className="h-1.5 bg-emerald-100/50">
                                <td colSpan={6} className="p-0 border-b border-emerald-200 bg-emerald-100/40"></td>
                              </tr>
                            )}
                            
                            {/* Render Group 3: Blue */}
                            {filteredThuongStRows.blue.map((row, idx) => renderThuongStRow(row, idx, 'blue'))}
                            
                            {/* Empty placeholder */}
                            {filteredThuongStRows.all.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-bold text-sm border-b border-emerald-100">
                                  Không có dữ liệu hiển thị cho nhóm hàng này.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'bcdtnh' && (
              <motion.div
                key="bcdtnh"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <BcDtNganhHang isUser43751={is43751} />
              </motion.div>
            )}

            {activeTab === 'ssg_boss' && (
              <motion.div
                key="ssg_boss"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SSGBoss biMarkets={displayData.markets || []} daysPassed={daysPassed} totalDays={totalDays} />
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </main>

      <ConfirmationModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          clearData();
          setShowConfirm(false);
        }}
        title="XÓA DỮ LIỆU?"
        message="Hành động này sẽ xóa toàn bộ dữ liệu hiện tại và không thể hoàn tác."
      />

      {/* AI Comment Modal for THƯỞNG ST */}
      {thuongStCommentOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-xs" onClick={() => setThuongStCommentOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[580px] w-[95vw] mx-4 overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header - Orange gradient */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Nhận xét thưởng thi đua
                </span>
              </div>
              <button onClick={() => setThuongStCommentOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Template Tabs */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">Chọn mẫu nội dung nhận xét:</p>
              <div className="flex gap-2">
                {[
                  { id: 1 as const, label: 'Mẫu 1: Tổng quan', icon: '🏆' },
                  { id: 2 as const, label: isComparing ? 'Mẫu 2: Ngành giảm thưởng' : 'Mẫu 2: Chưa đạt', icon: '⚠️' },
                  { id: 3 as const, label: isComparing ? 'Mẫu 3: So sánh chi tiết' : 'Mẫu 3: Tóm tắt', icon: '⚡' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setThuongStTemplate(tab.id);
                      handleGenerateAIComment(tab.id);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                      thuongStTemplate === tab.id
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
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
                value={thuongStComment}
                onChange={(e) => setThuongStComment(e.target.value)}
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
                      await navigator.clipboard.writeText(thuongStComment);
                      setCopiedThuongStComment(true);
                      setTimeout(() => setCopiedThuongStComment(false), 2000);
                    } catch { /* fallback */ }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    copiedThuongStComment 
                      ? 'text-white bg-emerald-500 border border-emerald-600' 
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500'
                  }`}
                >
                  {copiedThuongStComment ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Sao chép nhận xét</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Nhận xét Doanh thu & Ngành hàng Modal (BC THÁNG) - 100% Pixel-Perfect matching BC NGÀY */}
      {isCategoryCommentModalOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            onClick={() => setIsCategoryCommentModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 my-auto animate-in fade-in zoom-in-95 duration-200"
            style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
          >
            {/* Header Banner - Orange Gradient matching Image 2 */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={20} className="text-white" />
                <span className="text-[14px] sm:text-[15px] font-black text-white uppercase tracking-wide">
                  Nhận xét thi đua
                </span>
              </div>
              <button
                onClick={() => setIsCategoryCommentModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div className="px-5 sm:px-6 pt-5 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2.5 uppercase tracking-wide">
                Chọn mẫu nội dung nhận xét:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {luykeCategoryCommentTemplates.map((tab, idx) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedCategoryTemplate(idx);
                      setCategoryCommentText(tab.text);
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-[11.5px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                      selectedCategoryTemplate === idx
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md shadow-orange-500/25'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Comment Box */}
            <div className="px-5 sm:px-6 pb-6 pt-2 space-y-4">
              <div>
                <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">
                  Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
                </p>
                <textarea
                  value={categoryCommentText}
                  onChange={e => setCategoryCommentText(e.target.value)}
                  rows={12}
                  className="w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-[12.5px] sm:text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                  style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11.5px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={handleCopyCategoryComment}
                  className={`flex items-center gap-2 px-6 py-3 text-[12px] font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
                    copiedCategoryComment
                      ? 'text-white bg-emerald-500 border border-emerald-600 shadow-emerald-500/20'
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500 shadow-orange-500/25'
                  }`}
                >
                  {copiedCategoryComment ? (
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

      <CaptureLoadingOverlay isLoading={isCapturing} />

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default LuyKe;