/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { RefreshCw, ShoppingBag, TrendingUp, Camera, LayoutGrid, Activity, Globe, ChevronDown, Zap, Upload, Trash2, HelpCircle, FileSpreadsheet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import OverviewDashboard from './RTST/components/OverviewDashboard';
import CategoryTable from './RTST/components/CategoryTable';
import { BonusCalculatorForm } from './BonusCalculatorForm';

import { ConfirmationModal } from './RTST/components/Modals';
import { normalize, isKhoLuuDong } from './RTST/utils';

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
    normalized.includes('vas')
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

const LuyKe: React.FC = () => {
  const { userProfile } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { marketFilter, setMarketFilter, availableMarkets } = useMarket();
  const filteredMarkets = React.useMemo(() => {
    return (availableMarkets || []).filter(m => !isKhoLuuDong(m.name));
  }, [availableMarkets]);
  const [maKho, setMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');
  const [activeTab, setActiveTab] = useState<'summary' | 'efficiency' | 'thuong_st'>('summary');

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
    saveExcelThuongStData
  } = useRTSTSharedData(maKho);

  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>(() => {
    return localStorage.getItem('rtst_selected_store_filter') || 'ALL';
  });
  const [isProcessingData, setIsProcessingData] = useState(false);

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
      setSelectedStoreFilter('ALL');
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

    if (selectedStoreFilter && selectedStoreFilter !== 'ALL' && uniqueExcelStores.includes(selectedStoreFilter)) {
      return;
    }

    const savedFilter = localStorage.getItem('rtst_selected_store_filter');
    if (savedFilter && uniqueExcelStores.includes(savedFilter)) {
      setSelectedStoreFilter(savedFilter);
      return;
    }

    setSelectedStoreFilter(uniqueExcelStores[0]);
  }, [uniqueExcelStores, marketFilter, selectedStoreFilter]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setIsProcessingData(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const dataBuffer = evt.target?.result as ArrayBuffer;
          const wb = XLSX.read(dataBuffer, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' }) as any[][];

          if (!data || data.length === 0) {
            alert('File Excel không có dữ liệu!');
            setIsProcessingData(false);
            return;
          }

          // Process data
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
                const match = cellValCombined.match(/\d+/);
                if (match) {
                  detectedLimit = parseInt(match[0], 10);
                } else if (c + 1 < row.length) {
                  const nextCellVal = String(row[c + 1] || '');
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
            
            sampleRows.forEach(row => {
              if (!row) return;
              for (let c = 0; c < Math.min(row.length, 30); c++) {
                const cellVal = String(row[c] || '').trim();
                if (!cellVal) continue;
                
                const normVal = normalize(cellVal);
                
                // Score for store: check if it matches any availableMarkets name
                const matchesMarket = (availableMarkets || []).some(m => {
                  const normMName = normalize(m.name);
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
                completionVal = rawVal > 0 && rawVal <= 3.0 ? rawVal * 100 : rawVal;
              } else {
                completionVal = parseNumericValue(String(rawVal).replace(/%/g, ''));
              }
            }

            const completionRank = (row.length > completionRankIdx) ? Math.round(parseNumericValue(row[completionRankIdx])) : 0;
            const exceededRank = (row.length > exceededRankIdx) ? Math.round(parseNumericValue(row[exceededRankIdx])) : 0;
            const bonus = (row.length > bonusIdx) ? Math.round(parseNumericValue(row[bonusIdx])) : 0;
            const limit = (limitColIdx !== -1 && row.length > limitColIdx) ? Math.round(parseNumericValue(row[limitColIdx])) : 7;

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

          if (parsedRows.length === 0) {
            alert('Không tìm thấy dòng dữ liệu nhóm hàng nào phù hợp!');
            setIsProcessingData(false);
            return;
          }

          saveExcelThuongStData(parsedRows, file.name, detectedLimit, filteredMarkets.map(m => m.name));
        } catch (err) {
          console.error('Error parsing excel:', err);
          alert('Lỗi xử lý file Excel. Vui lòng kiểm tra định dạng file!');
        } finally {
          setIsProcessingData(false);
        }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  };

  // Excel data for the store currently selected in the dropdown
  const selectedStoreExcelData = React.useMemo(() => {
    const key = (selectedStoreFilter || '').toUpperCase();
    const storeTarget = allStoreTargets[key];
    
    if (storeTarget) {
      return {
        rows: storeTarget.thuongStRows || [],
        fileName: storeTarget.excelFileName || '',
        limit: storeTarget.topPercentRankLimit ?? 7
      };
    }
    
    return {
      rows: thuongStRows || [],
      fileName: excelFileName || '',
      limit: topPercentRankLimit ?? 7
    };
  }, [allStoreTargets, selectedStoreFilter, thuongStRows, excelFileName, topPercentRankLimit]);

  const isExcelActive = React.useMemo(() => {
    return filteredMarkets.some((m: any) => {
      const cached = allStoreTargets[m.name.toUpperCase()];
      return !!cached?.excelFileName || (normalize(m.name) === normalize(stName) && excelFileName);
    });
  }, [allStoreTargets, filteredMarkets, stName, excelFileName]);

  const activeExcelFileName = React.useMemo(() => {
    for (const m of filteredMarkets) {
      const cached = allStoreTargets[m.name.toUpperCase()];
      if (cached?.excelFileName) return cached.excelFileName;
    }
    return excelFileName || '';
  }, [allStoreTargets, filteredMarkets, excelFileName]);

  const filteredThuongStRows = React.useMemo(() => {
    const rows = selectedStoreExcelData.rows;
    if (rows.length === 0) return { yellow: [], green: [], blue: [], all: [] };

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
  }, [selectedStoreExcelData.rows]);

  const totalBonusSum = React.useMemo(() => {
    return (filteredThuongStRows.all || []).reduce((sum: number, row: any) => sum + (row.bonus || 0), 0);
  }, [filteredThuongStRows.all]);

  const renderThuongStRow = (row: any, idx: number, group: 'yellow' | 'green' | 'blue') => {
    let squareBg = 'bg-amber-400';
    if (group === 'green') squareBg = 'bg-emerald-500';
    else if (group === 'blue') squareBg = 'bg-blue-500';

    const isCompletionRankHighlighted = row.completionRank > 0 && row.completionRank <= selectedStoreExcelData.limit;
    const isExceededRankHighlighted = row.exceededRank > 0 && row.exceededRank <= selectedStoreExcelData.limit;

    const completionFormatted = `${row.completion.toFixed(1)}%`;
    const bonusFormatted = row.bonus === 0 ? '0' : row.bonus.toLocaleString('en-US');

    // Calculate sequential index across groups
    let stt = idx + 1;
    if (group === 'green') {
      stt += filteredThuongStRows.yellow.length;
    } else if (group === 'blue') {
      stt += filteredThuongStRows.yellow.length + filteredThuongStRows.green.length;
    }

    return (
      <tr key={`${group}-${idx}`} className="hover:bg-slate-50 transition-colors h-[40px]">
        <td className="px-2 py-0 text-[13px] font-extrabold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a] w-10">
          {stt}
        </td>
        <td className="px-4 py-2 border-r border-b border-slate-300 text-left font-bold text-xs sm:text-sm text-black">
          <div className="flex items-center">
            <div className={`w-3.5 h-3.5 ${squareBg} rounded-sm mr-2.5 shrink-0`} />
            <span className="text-black uppercase">{row.categoryName}</span>
          </div>
        </td>
        <td className="px-4 py-2 border-r border-b border-slate-300 text-center font-extrabold text-xs sm:text-sm text-slate-700">
          {completionFormatted}
        </td>
        <td 
          className={`px-4 py-2 border-r border-b border-slate-300 text-center font-extrabold text-xs sm:text-sm transition-all ${
            isCompletionRankHighlighted ? 'bg-[#5cb85c] text-white font-black' : 'text-slate-850'
          }`}
        >
          {row.completionRank === 0 ? '0' : row.completionRank}
        </td>
        <td 
          className={`px-4 py-2 border-r border-b border-slate-300 text-center font-extrabold text-xs sm:text-sm transition-all ${
            isExceededRankHighlighted ? 'bg-[#5cb85c] text-white font-black' : 'text-slate-855'
          }`}
        >
          {row.exceededRank === 0 ? '0' : row.exceededRank}
        </td>
        <td className="px-4 py-2 border-r border-b border-slate-300 text-right font-extrabold text-xs sm:text-sm text-slate-800 pr-6">
          {bonusFormatted}
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

  // PERF: Sync stName and revenue fields when marketFilter or data changes
  // PERF: Sync stName and revenue fields when marketFilter or data changes
  // Only trigger on external changes (marketFilter, filteredMarkets, allStoreTargets)
  // NOT on the values we set — avoids re-render cascade
  useEffect(() => {
    if (marketFilter === 'ALL') return;
    const market = filteredMarkets.find(m => m.name === marketFilter);
    if (!market) return;

    if (stName !== market.name) setStName(market.name);
    if (stDtlk !== (market.actualReal || 0)) setStDtlk(market.actualReal || 0);
    if (stDtqd !== (market.actualVirtual || 0)) setStDtqd(market.actualVirtual || 0);

    const dtDuKienQD = market.targetQD || 0;
    const percentHT = market.percentHT || 0;
    if (stDtDuKienQD !== dtDuKienQD) setStDtDuKienQD(dtDuKienQD);
    if (stPercentHTTargetDuKienQD !== percentHT) setStPercentHTTargetDuKienQD(percentHT);

    // Sync from DB cache (allStoreTargets) using normalized keys to prevent spacing/underscore mismatches
    const targetDataKey = Object.keys(allStoreTargets || {}).find(k => normalize(k) === normalize(market.name));
    const targetData = targetDataKey ? allStoreTargets[targetDataKey] : null;
    if (targetData) {
      if (targetData.stPercentTarget !== undefined && stPercentTarget !== targetData.stPercentTarget) {
        setStPercentTarget(targetData.stPercentTarget);
      }
    }
  }, [marketFilter, filteredMarkets, allStoreTargets, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stPercentTarget, setStName, setStDtlk, setStDtqd, setStDtDuKienQD, setStPercentHTTargetDuKienQD, setStPercentTarget]);

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



  const captureElement = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) return;
    setIsCapturing(true);
    document.body.classList.add('capturing-screenshot');
    
    const element = ref.current;
    const originalWidth = element.style.width;
    const originalMinWidth = element.style.minWidth;
    
    try {
      // Store original overflow styles and set to visible to get true scrollWidth
      const scrollContainers = element.querySelectorAll('.overflow-x-auto');
      const originalOverflows: { el: HTMLElement, overflowX: string }[] = [];
      
      scrollContainers.forEach(el => {
        const htmlEl = el as HTMLElement;
        originalOverflows.push({ el: htmlEl, overflowX: htmlEl.style.overflowX });
        htmlEl.style.overflowX = 'visible';
      });

      // Temporarily set width to max-content to allow flex containers to expand fully
      element.style.width = 'max-content';
      element.style.minWidth = 'max-content';
      
      // Get the true full width after expanding
      const fullWidth = element.scrollWidth;
      element.style.width = `${fullWidth}px`;
      element.style.minWidth = `${fullWidth}px`;

      // Small delay for CSS to apply
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => !(node instanceof Element && node.classList?.contains('no-capture')),
        style: {
          transform: 'scale(1)',
          borderRadius: '0'
        }
      });
      
      setPreviewImage(dataUrl);

      // Restore overflows
      originalOverflows.forEach(({ el, overflowX }) => {
        el.style.overflowX = overflowX;
      });
    } catch (error) {
      console.error('Error capturing element:', error);
    } finally {
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      document.body.classList.remove('capturing-screenshot');
      setIsCapturing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 selection:bg-indigo-100 selection:text-indigo-900" style={{ fontFamily: '"Inter", sans-serif' }}>
      {/* Excel loading & processing overlay */}
      <AnimatePresence>
        {(isProcessingData || isInitialLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/80 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center"
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
      </AnimatePresence>

      <main className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-4 md:gap-8 p-3 md:p-8">
        {/* Mobile Horizontal Tab Bar */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar bg-white rounded-2xl p-2 border border-slate-100">
          {[
            { id: 'summary', label: 'TỔNG QUAN', icon: LayoutGrid, color: 'text-indigo-600' },
            { id: 'efficiency', label: 'THƯỞNG QL/TC', icon: Activity, color: 'text-emerald-600' },
            { id: 'thuong_st', label: 'THƯỞNG ST', icon: Zap, color: 'text-amber-500' }
          ].map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Desktop Left Vertical Navigation */}
        <div className="hidden lg:block w-[320px] shrink-0">
          <div className="flex flex-col gap-3 py-4 sticky top-[116px]">
            {[
              { id: 'summary', label: 'TỔNG QUAN', icon: LayoutGrid, color: 'text-indigo-600' },
              { id: 'efficiency', label: 'THƯỞNG QL/TC', icon: Activity, color: 'text-emerald-600' },
              { id: 'thuong_st', label: 'THƯỞNG ST', icon: Zap, color: 'text-amber-500' }
            ].map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-4 px-6 py-5 rounded-[22px] border transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white border-indigo-500 shadow-[0_15px_35px_-10px_rgba(79,70,229,0.15)] -translate-y-0.5 translate-x-1' 
                      : 'bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-indigo-50 ' + item.color : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                  }`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[15px] font-black tracking-tight uppercase ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area - Right Side */}
        <div className="flex-1 min-w-0 space-y-6">
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
          <div ref={captureRefs.fullDashboard}>
            <OverviewDashboard 
              markets={marketsForDashboard}
              marketFilter={marketFilter}
              setMarketFilter={setMarketFilter}
              captureRef={captureRefs.overviewInternal}
              fullCaptureRef={captureRefs.fullDashboard}
              captureElement={captureElement}
              title="TỔNG QUAN SIÊU THỊ (LUỸ KẾ)"
              showFilters={false}
              hideTargetQD={true}
              hideDashboard={true}
              daysPassed={daysPassed}
              totalDays={totalDays}
              stName={stName}
              stTargetQuyDoi={stTargetQuyDoi}
              stTargetSauHeSo={stTargetSauHeSo}
              allStoreTargets={allStoreTargets}
              storeSettings={storeSettings}
              stDtDuKienQD={stDtDuKienQD}
              stPercentTarget={stPercentTarget}
            />

        {/* CHI TIẾT NGÀNH HÀNG - Same layout as BC Ngày */}
          <div className="mt-6">
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 text-center">
                    <h3 className="text-[27px] font-black text-slate-900 tracking-tight">CHI TIẾT NGÀNH HÀNG</h3>
                    <p className="text-[17px] text-slate-400 mt-0.5">Thống kê chi tiết theo ngành hàng (Luỹ kế tháng)</p>
                  </div>
                  <button
                    onClick={() => captureElement(captureRefs.categorySL, 'NganhHang_LuyKe')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 active:scale-95 no-capture"
                  >
                    <Camera size={14} />
                    <span>Chụp ảnh báo cáo</span>
                  </button>
                </div>
              </div>

              <div ref={captureRefs.categorySL} className="bg-white rounded-3xl overflow-hidden border border-slate-300">
                <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Table: SLLK */}
                  <div className="border border-slate-300 overflow-hidden">
                   <div className="bg-white p-[15px]">
                    <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                      <div className="p-4 flex flex-col items-center justify-center">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">NGÀNH HÀNG (SL)</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">LUỸ KẾ THÁNG</span>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center">
                        <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                          ĐẠT : {filteredCategories.filter((c: any) => c.type === 'SL').filter((c: any) => c.target > 0 && daysPassed > 0 && (((c.revenue / daysPassed) * totalDays) / c.target) * 100 >= 100).length}/{filteredCategories.filter((c: any) => c.type === 'SL').length} || TGSD: {daysPassed}/{totalDays}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300 min-w-[600px]">
                        <thead>
                          <tr className="text-slate-900 h-[60px]">
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981]">NGÀNH HÀNG</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-[60px]">TARGET</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">LUỸ KẾ</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">%HT</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[60px]">CÒN LẠI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories.filter((c: any) => c.type === 'SL').length === 0 ? (
                            <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm border-r border-b border-slate-300">Chưa có dữ liệu</td></tr>
                          ) : (
                            filteredCategories.filter((c: any) => c.type === 'SL')
                              .sort((a: any, b: any) => {
                                let rA = 0, rB = 0;
                                if (a.target > 0 && daysPassed > 0) rA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
                                if (b.target > 0 && daysPassed > 0) rB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
                                return rB - rA;
                              })
                              .map((cat: any, idx: number) => {
                                let rate = 0;
                                if (cat.target > 0 && daysPassed > 0) rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                                const remaining = cat.target - cat.revenue;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors h-[40px]">
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">{idx + 1}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold uppercase border-r border-b border-slate-300 text-black">{cat.name}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>
                                    <td className={`px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 ${Math.round(rate) >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.round(rate)}%</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>

                  {/* Right Table: DTLK */}
                  <div className="border border-slate-300 overflow-hidden">
                   <div className="bg-white p-[15px]">
                    <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                      <div className="p-4 flex flex-col items-center justify-center">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">NGÀNH HÀNG (DT)</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">LUỸ KẾ THÁNG</span>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center">
                        <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                          ĐẠT : {filteredCategories.filter((c: any) => c.type === 'DT').filter((c: any) => c.target > 0 && daysPassed > 0 && (((c.revenue / daysPassed) * totalDays) / c.target) * 100 >= 100).length}/{filteredCategories.filter((c: any) => c.type === 'DT').length} || TGSD: {daysPassed}/{totalDays}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300 min-w-[600px]">
                        <thead>
                          <tr className="text-slate-900 h-[60px]">
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981]">NGÀNH HÀNG</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-[60px]">TARGET</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">LUỸ KẾ</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">%HT</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[60px]">CÒN LẠI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories.filter((c: any) => c.type === 'DT').length === 0 ? (
                            <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm border-r border-b border-slate-300">Chưa có dữ liệu</td></tr>
                          ) : (
                            filteredCategories.filter((c: any) => c.type === 'DT')
                              .sort((a: any, b: any) => {
                                let rA = 0, rB = 0;
                                if (a.target > 0 && daysPassed > 0) rA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
                                if (b.target > 0 && daysPassed > 0) rB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
                                return rB - rA;
                              })
                              .map((cat: any, idx: number) => {
                                let rate = 0;
                                if (cat.target > 0 && daysPassed > 0) rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                                const remaining = cat.target - cat.revenue;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors h-[40px]">
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">{idx + 1}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold uppercase border-r border-b border-slate-300 text-black">{cat.name}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>
                                    <td className={`px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 ${Math.round(rate) >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.round(rate)}%</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
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
                <style dangerouslySetInnerHTML={{__html: `
                  .capturing-screenshot .no-capture { display: none !important; }
                  .capturing-screenshot .capturing-screenshot-inline { display: inline !important; }
                `}} />

                {/* Excel File active status and control buttons */}
                {isExcelActive && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">File đang hoạt động</p>
                        <p className="text-sm font-bold text-slate-800">{activeExcelFileName || 'Du_Lieu_Thi_Dua.xlsx'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all">
                          <Upload size={14} />
                          <span>TẢI LÊN FILE KHÁC</span>
                        </button>
                        <input 
                           type="file" 
                           accept=".xlsx, .xls" 
                           onChange={handleExcelUpload} 
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm('Xóa dữ liệu thi đua - thưởng?')) {
                            saveExcelThuongStData([], '', 7, filteredMarkets.map(m => m.name));
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all"
                      >
                        <Trash2 size={14} />
                        <span>XÓA DỮ LIỆU</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Container when there's no data */}
                {!isExcelActive ? (
                  <div className="bg-white border-2 border-dashed border-slate-300 rounded-[32px] p-12 text-center hover:border-amber-400 hover:bg-slate-50 transition-all cursor-pointer relative shadow-sm">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      onChange={handleExcelUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                        <Upload size={28} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">Tải lên file Excel kết quả Thi đua - Thưởng</h4>
                        <p className="text-xs text-slate-400 mt-1">Kéo thả hoặc nhấn để chọn file (.xlsx, .xls)</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Display table styled exactly like the mockup */
                  <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 no-capture">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">KẾT QUẢ THI ĐUA ST</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Dữ liệu thi đua thưởng của siêu thị {selectedStoreFilter}</p>
                      </div>
                      <button
                        onClick={() => captureElement(captureRefs.thuongSt, 'BaoCaoThuongSt')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 active:scale-95"
                      >
                        <Camera size={14} />
                        <span>Chụp ảnh báo cáo</span>
                      </button>
                    </div>

                    <div ref={captureRefs.thuongSt} className="bg-white p-4">
                      {/* Title section matching the screenshot */}
                      <div className="space-y-2 mb-6">
                        <h2 className="text-xl font-black text-red-600 uppercase tracking-tight">3.2. THƯỞNG THI ĐUA SIÊU THỊ :</h2>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 no-capture">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-905">
                            <span>🏆 Hạng Top 10% Để Có Thưởng :</span>
                            <input 
                              type="number" 
                              value={selectedStoreExcelData.limit} 
                              disabled
                              className="w-12 px-1.5 py-0.5 border border-slate-300 rounded font-black text-center text-slate-700 bg-slate-100 cursor-not-allowed focus:outline-none"
                            />
                          </div>
                          
                          {uniqueExcelStores.length > 0 && (
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-905">
                              <span>🏪 Chọn Siêu Thị:</span>
                              <select
                                value={selectedStoreFilter}
                                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                                className="px-3 py-1 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[280px]"
                              >
                                {uniqueExcelStores.map((store: string) => (
                                  <option key={store} value={store}>
                                    {store}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        
                        {/* Static text equivalent for screenshot capture */}
                        <div className="hidden capturing-screenshot-inline space-y-1">
                          <div className="text-sm font-bold text-slate-900">
                            🏆 Hạng Top 10% Để Có Thưởng : <span className="font-black">{selectedStoreExcelData.limit}</span>
                          </div>
                          <div className="text-sm font-bold text-slate-905">
                            🏪 Siêu Thị: <span className="font-black">{selectedStoreFilter}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 text-xs font-bold text-slate-900 leading-relaxed max-w-[800px]">
                          <span className="shrink-0 text-xs">⬛</span>
                          <span>Nếu Siêu Thị Nằm Top 10% Nhưng Không Có Thưởng Thì Là Do Nhóm Hàng Này Vùng Chưa Đạt Min Để Có Quỹ Thưởng.</span>
                        </div>
                      </div>

                      {/* Header block above the table */}
                      <div className="border border-slate-300 overflow-hidden mb-6 bg-white">
                        <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                          <div className="p-4 flex flex-col items-center justify-center">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN THƯỞNG</h2>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">LUỸ KẾ THÁNG</span>
                          </div>
                          <div className="p-4 flex flex-col items-center justify-center">
                            <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">TỔNG THƯỞNG</h2>
                            <span className="text-[12px] font-black uppercase tracking-widest text-slate-700">
                              {totalBonusSum.toLocaleString('en-US')} VND
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Grouped Table */}
                      <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-sm">
                        <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300 bg-white">
                          <thead>
                            <tr className="text-slate-900 h-[60px]">
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981]">NHÓM HÀNG</th>
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-[110px]">
                                <div>HOÀN THÀNH</div>
                                <div className="text-[10px] opacity-85">DỰ KIẾN</div>
                              </th>
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[120px]">
                                <div>HẠNG H.T TARGET</div>
                                <div className="text-[10px] opacity-85">THEO KÊNH</div>
                              </th>
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[120px]">
                                <div>HẠNG VƯỢT TRỘI</div>
                                <div className="text-[10px] opacity-85">DT/SL THEO KÊNH</div>
                              </th>
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[110px]">
                                <div>THƯỞNG</div>
                                <div className="text-[10px] opacity-85">DỰ KIẾN</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Render Group 1: Yellow */}
                            {filteredThuongStRows.yellow.map((row, idx) => renderThuongStRow(row, idx, 'yellow'))}
                            
                            {/* Separator / Gap between Yellow and Green groups */}
                            {filteredThuongStRows.yellow.length > 0 && filteredThuongStRows.green.length > 0 && (
                              <tr className="bg-slate-100 h-2">
                                <td colSpan={6} className="p-0 border-r border-b border-slate-300 bg-slate-100"></td>
                              </tr>
                            )}
                            
                            {/* Render Group 2: Green */}
                            {filteredThuongStRows.green.map((row, idx) => renderThuongStRow(row, idx, 'green'))}
                            
                            {/* Thick divider between Green and Blue groups matching screenshot */}
                            {filteredThuongStRows.green.length > 0 && filteredThuongStRows.blue.length > 0 && (
                              <tr className="bg-[#db6b6b] h-1">
                                <td colSpan={6} className="p-0 border-r border-b border-slate-300 bg-[#db6b6b]"></td>
                              </tr>
                            )}
                            
                            {/* Render Group 3: Blue */}
                            {filteredThuongStRows.blue.map((row, idx) => renderThuongStRow(row, idx, 'blue'))}
                            
                            {/* Empty placeholder */}
                            {filteredThuongStRows.all.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-bold text-sm border-r border-b border-slate-300">
                                  Không có dữ liệu hiển thị cho siêu thị này.
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
          </AnimatePresence>
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

      {isCapturing && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg font-black text-indigo-600 uppercase tracking-widest animate-pulse">ĐANG XUẤT ẢNH...</p>
        </div>
      )}

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default LuyKe;