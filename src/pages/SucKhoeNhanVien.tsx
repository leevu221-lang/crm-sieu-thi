/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HeartPulse, Camera, TrendingUp, Search, ChevronDown, ChevronUp, Check, MessageSquare, FileText, ChevronRight, LayoutGrid, Info, Users, Printer, UploadCloud, Trophy, TrendingDown, Gift, Target, Trash2, Clock, X, ArrowLeft, ArrowRight, ArrowLeftRight, RotateCcw, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { useEmployeeHealth } from './EmployeeHealth/hooks/useEmployeeHealth';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { useNotification } from '../contexts/NotificationContext';
import RevenueRankingTableQd from './EmployeeHealth/components/RevenueRankingTableQd';
import EmployeeDetailTable from './EmployeeHealth/components/EmployeeDetailTable';
import SummaryThiDuaTable, { parseStaffMatrixDataRefined } from './EmployeeHealth/components/SummaryThiDuaTable';
import CategoryDetailByStaffTable from './EmployeeHealth/components/CategoryDetailByStaffTable';
import TongHopNvTable from './EmployeeHealth/components/TongHopNvTable';
import { cn, parseStaffRankData, parseYcxData, normalizeStoreId, parseStaffValueList, normalize, parseCategoryData, cleanCategoryName, isKhoLuuDong } from './RTST/utils';

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

const parseBonusData = (text: string, staffObj: any, marketFilter: string) => {
  if (!text || text.trim().length === 0) return { tong: null, details: Array(8).fill(null) };
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

const EmployeeHealth: React.FC = () => {
  const { userProfile } = useAuth();
  const { showNotification } = useNotification();
  const { marketFilter, setMarketFilter, setAvailableMarkets } = useMarket();
  const [maKho, setMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const pendingCopyStaffIdRef = useRef<{ staffId: string; nextStaffId: string } | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const capturePhucVuRef = useRef<HTMLDivElement>(null);
  const captureBanKemRef = useRef<HTMLDivElement>(null);
  const captureThuongNvRef = useRef<HTMLDivElement>(null);
  const captureElementHelper = async (element: HTMLElement) => {
    // Create a temporary container to hold the clone
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '0';
    tempContainer.style.left = '0';
    tempContainer.style.width = '4000px'; // Extremely wide to prevent any wrapping or truncation
    tempContainer.style.height = '0';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';

    const clone = element.cloneNode(true) as HTMLElement;

    // Hide buttons/controls inside the clone
    const noCaptureElements = clone.querySelectorAll('.no-capture, button, textarea, .capture-btn');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // Set clone styling to take full layout unconstrained
    clone.style.width = 'max-content';
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.padding = '32px'; // Nice margin around the captured image
    clone.style.backgroundColor = '#ffffff';
    clone.style.display = 'inline-block';
    clone.style.borderRadius = '32px'; // Round corners like target container

    // Make sure overflow wrappers in the clone are visible
    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = 'auto';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
    });

    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      const htmlTable = table as HTMLTableElement;
      htmlTable.style.width = 'auto';
      htmlTable.style.minWidth = 'auto';
      htmlTable.style.tableLayout = 'auto';

      // Remove fixed widths on all cells so columns auto-shrink to fit content
      const allCells = htmlTable.querySelectorAll('th, td');
      allCells.forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = 'auto';
        htmlCell.style.minWidth = 'auto';
        htmlCell.style.maxWidth = 'none';
        htmlCell.style.whiteSpace = 'nowrap';
        htmlCell.style.paddingLeft = '12px';
        htmlCell.style.paddingRight = '12px';
      });

      // Remove colgroup if exists
      const colgroup = htmlTable.querySelector('colgroup');
      if (colgroup) colgroup.remove();
    });

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    try {
      await new Promise(r => setTimeout(r, 200)); // wait for layout/render
      const dataUrl = await htmlToImage.toPng(clone, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
      return dataUrl;
    } finally {
      document.body.removeChild(tempContainer);
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
    rankMonth1, setRankMonth1,
    rankMonth2, setRankMonth2,
    rankMonth3, setRankMonth3,
    setBanKemNv,
    setTragopNv,
    isLoading: isHealthLoading,
    isSaving,
    refresh,
    savePhucVu,
    saveBanKemNv,
    saveTragopNv
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
  const [activeTab, setActiveTab] = useState<'DOANH_THU' | 'TONG_HOP_NV' | 'CHI_TIET' | 'THI_DUA' | 'NGANH_HANG' | 'PHUC_VU' | 'BAN_KEM_NV' | 'THUONG_NV' | 'TRA_CHAM_NV' | 'KHAI_THAC_NV' | 'RANK_3T_NV'>('DOANH_THU');
  const [khaiThacCategoryFilter, setKhaiThacCategoryFilter] = useState<string>('ALL');
  const [showMonthlyDtqd, setShowMonthlyDtqd] = useState(true);
  const [showDtqdGroup, setShowDtqdGroup] = useState(true);
  const [showNganhHangGroup, setShowNganhHangGroup] = useState(true);
  const [showEffGroup, setShowEffGroup] = useState(true);
  const [showThuNhapGroup, setShowThuNhapGroup] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [autoExpand, setAutoExpand] = useState(false);

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
    setGiocong3t1(giocong3t2);

    setDtqd3t2('');
    setThunhap3t2('');
    setNganhhang3t2('');
    setThidua3t2('');
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
    setGiocong3t2(giocong3t3);

    setDtqd3t3('');
    setThunhap3t3('');
    setNganhhang3t3('');
    setThidua3t3('');
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
    setGiocong3t1(giocong3t2);

    setRankMonth2(rankMonth3);
    setDtqd3t2(dtqd3t3);
    setThunhap3t2(thunhap3t3);
    setNganhhang3t2(nganhhang3t3);
    setThidua3t2(thidua3t3);
    setGiocong3t2(giocong3t3);

    const m3Num = parseInt(rankMonth3.replace(/\D/g, '')) || 6;
    const nextM3Num = m3Num >= 12 ? 1 : m3Num + 1;
    setRankMonth3(`Tháng ${nextM3Num}`);

    setDtqd3t3('');
    setThunhap3t3('');
    setNganhhang3t3('');
    setThidua3t3('');
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
    thidua3Sum
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
    };
  }, [dtqd3t1, dtqd3t2, dtqd3t3, thunhap3t1, thunhap3t2, thunhap3t3, nganhhang3t1, nganhhang3t2, nganhhang3t3, giocong3t1, giocong3t2, giocong3t3, thidua3t1, thidua3t2, thidua3t3, parseTn]);

  const formatValueForDisplay = (val: number, isCurrency: boolean = false) => {
    if (val === 0) return isCurrency ? '0 đ' : '0';
    if (val >= 1000000) {
      if (isCurrency) {
        return `${(val / 1000000).toFixed(2).toLocaleString()} Tr`;
      } else {
        return `${Math.round(val / 1000000).toLocaleString('vi-VN')} Tr`;
      }
    }
    return isCurrency 
      ? `${Math.round(val).toLocaleString('vi-VN')} đ`
      : Math.round(val).toLocaleString('vi-VN');
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
          giocong: 0
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
        effQd1,
        effQd2,
        effQd3,
        effQd
      };
    })
    .filter(emp => emp.dtqd > 0 || emp.thunhap > 0 || emp.nganhhang > 0 || emp.giocong > 0)
    .sort((a, b) => b.dtqd - a.dtqd);
  }, [dtqd3t1, dtqd3t2, dtqd3t3, thunhap3t1, thunhap3t2, thunhap3t3, nganhhang3t1, nganhhang3t2, nganhhang3t3, giocong3t1, giocong3t2, giocong3t3, parseTn]);

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

    const calcMonth = (nganhhangInput: string, thiduaInput: string) => {
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
        0,
        30,
        false
      );

      return { staffMatrix, totalCat: categories.length };
    };

    const m1 = calcMonth(nganhhang3t1, thidua3t1);
    const m2 = calcMonth(nganhhang3t2, thidua3t2);
    const m3 = calcMonth(nganhhang3t3, thidua3t3);

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
  }, [filteredRank3TData, nganhhang3t1, thidua3t1, nganhhang3t2, thidua3t2, nganhhang3t3, thidua3t3, marketFilter, allowedMarkets, mainStoreCategories]);

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

  const handleCopyFeedback = () => {
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

    const count = Math.max(1, Math.round(staffStats.length * 0.2));

    // Sort for %HT
    const sortedByHT = [...staffStats].sort((a, b) => b.percentHT - a.percentHT);
    const topHT = sortedByHT.slice(0, count);
    const botHT = sortedByHT.slice(-count).reverse();

    const text = `📊 BÁO CÁO DOANH THU QUY ĐỔI SIÊU THỊ: ${maKho}

🌟 TOP 20% DOANH THU QUY ĐỔI
${topHT.map((s) => {
      const parts = s.fullName.split(' - ');
      const id = parts[0].trim();
      const name = parts.length > 1 ? parts[1].trim() : '';
      const shortName = name.split(' ').pop() || '';
      return `${id} - ${shortName.toUpperCase()} (${Math.floor(s.percentHT)}%)`;
    }).join('\n')}

⚠️ NHÓM BOTTOM 20% DOANH THU QUY ĐỔI
${botHT.map((s) => {
      const parts = s.fullName.split(' - ');
      const id = parts[0].trim();
      const name = parts.length > 1 ? parts[1].trim() : '';
      const shortName = name.split(' ').pop() || '';
      return `${id} - ${shortName.toUpperCase()} (${Math.floor(s.percentHT)}%)`;
    }).join('\n')}

Các bạn nhóm dưới cố gắng bứt phá để hoàn thành mục tiêu nhé! 💪`;

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      showNotification('Đã copy nhận xét TOP / BOT vào clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
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
  ];

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-64px)] bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Horizontal Tab Bar - shown only on mobile */}
      <div className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#00965e] text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar Menu - hidden on mobile */}
      <aside
        className={`hidden lg:flex bg-white border-r border-slate-200 flex-col h-full shadow-sm z-20 relative transition-all duration-300 w-[340px]`}
      >
        {/* Sidebar Header */}
        <div className="p-8">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00965e] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-100 shrink-0">
              <HeartPulse size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 leading-tight uppercase tracking-tight">Sức khỏe</h2>
              <p className="text-[10px] font-black text-[#00965e] uppercase tracking-[0.2em] mt-1">Nhân viên</p>
            </div>
          </div>
          
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-6 py-4 space-y-3 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-[22px] border transition-all duration-300 group ${
                  isActive 
                    ? 'bg-white border-[#00965e] shadow-[0_15px_35px_-10px_rgba(0,150,94,0.15)] -translate-y-0.5 translate-x-1' 
                    : 'bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200 text-slate-500'
                }`}
              >
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-emerald-50 text-[#00965e]' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                }`}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[15px] font-sans font-bold tracking-tight uppercase ${isActive ? 'text-slate-800' : 'text-slate-500'}`} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00965e] shadow-[0_0_10px_rgba(0,150,94,0.5)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Removed as per request */}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative bg-slate-50/50">
        <div className="p-3 md:p-6 lg:p-10 w-full min-h-full">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200">
                <HeartPulse size={32} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase rounded-full tracking-wider">Module Sức Khỏe</span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Realtime Active</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Sức khỏe nhân viên</h1>
                <p className="text-slate-500 font-medium">Quản lý trạng thái làm việc và sức khỏe đội ngũ nhân sự</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Multi-select Checkbox Filter moved to header */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all min-w-[200px] justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="truncate uppercase tracking-wider">
                      {selectedStaffIds.length === biRevenueData.length
                        ? "Tất cả nhân viên"
                        : selectedStaffIds.length === 0
                          ? "Chưa chọn NV"
                          : `Đã chọn ${selectedStaffIds.length} NV`}
                    </span>
                  </div>
                  <ChevronDown size={14} className={cn("transition-transform text-slate-400", isFilterOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm nhanh..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-2">
                        <div className="flex items-center justify-between px-3 mb-2">
                          <button
                            onClick={() => {
                              const allIds = biRevenueData.map(s => s.fullId);
                              setSelectedStaffIds(allIds);
                              saveStaffIdsToDb(allIds);
                            }}
                            className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Chọn tất cả
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStaffIds([]);
                              saveStaffIdsToDb([]);
                            }}
                            className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            Bỏ chọn tất cả
                          </button>
                        </div>

                        {biRevenueData.filter(s =>
                          s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.fullId.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map(staff => (
                          <label
                            key={staff.fullId}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                              selectedStaffIds.includes(staff.fullId)
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-slate-200 group-hover:border-slate-300 bg-white"
                            )}>
                              {selectedStaffIds.includes(staff.fullId) && <Check size={12} className="text-white stroke-[3px]" />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={selectedStaffIds.includes(staff.fullId)}
                              onChange={() => toggleStaffSelection(staff.fullId)}
                            />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-800 uppercase leading-tight">{staff.displayName}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{staff.fullId}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã kho đang chọn</span>
                <div className="px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                  <span className="text-sm font-black text-slate-800">{maKho || 'CHƯA CHỌN'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-10">
            <AnimatePresence mode="wait">
              {activeTab === 'DOANH_THU' && (
                <motion.div
                  key="DOANH_THU"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-2 md:p-4 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                      <button
                        onClick={handleCapture}
                        disabled={isCapturing}
                         className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                          isCapturing
                            ? "bg-slate-400 text-white cursor-wait"
                            : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200/50 border-t border-white/20"
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
                          <Camera size={16} />
                        )}
                        {isCapturing ? 'ĐANG XUẤT...' : 'XUẤT ẢNH BÁO CÁO'}
                      </button>

                       <button
                        onClick={handleCopyFeedback}
                        disabled={filteredBiData.length === 0}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                          filteredBiData.length === 0
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : isCopied
                              ? "bg-emerald-600 text-white shadow-emerald-200/50"
                              : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-200/50 border-t border-white/20"
                        )}
                      >
                        {isCopied ? (
                          <Check size={16} />
                        ) : (
                          <MessageSquare size={16} />
                        )}
                        {isCopied ? 'ĐÃ COPY!' : 'NHẬN XÉT TOP / BOT'}
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
                  {/* Export All Button */}
                  {selectedStaffIds.length > 0 && (
                    <div className="flex justify-center my-6">
                      <button
                        disabled={isCapturing}
                        onClick={async () => {
                          setIsCapturing(true);
                          try {
                            const zip = new JSZip();
                            const tables = document.querySelectorAll('[id^="employee-detail-"]');

                            for (let i = 0; i < tables.length; i++) {
                              const element = tables[i] as HTMLElement;
                              const dataUrl = await captureElementHelper(element);
                              const base64Data = dataUrl.split(',')[1];
                              zip.file(`ChiTiet_${element.id.replace('employee-detail-', '')}.png`, base64Data, { base64: true });
                            }

                            const content = await zip.generateAsync({ type: "blob" });
                            saveAs(content, "ChiTiet_All_NV.zip");
                          } finally {
                            setIsCapturing(false);
                          }
                        }}
                        className={cn(
                          "text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                          isCapturing ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                        )}
                      >
                        {isCapturing ? "ĐANG XUẤT HÌNH ẢNH..." : "XUẤT ALL NV"}
                      </button>
                    </div>
                  )}

                  {/* Employee Detail Table Section */}
                  {selectedStaffIds.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                              staffBonusHientai={staffBonusHientai}
                              staffInstallmentPercent={staffInstallmentPercent}
                              onPreviewImage={setPreviewImage}
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
                        <div className="w-full flex justify-end mb-4">
                          <button
                            onClick={handleExportPhucVuImage}
                            disabled={isCapturing}
                            className="flex items-center gap-2 px-6 py-3 bg-[#00965e] hover:bg-[#007b4e] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Camera size={18} />
                            {isCapturing ? 'ĐANG CHỤP...' : 'CHỤP ẢNH BÁO CÁO'}
                          </button>
                        </div>

                        <div ref={capturePhucVuRef} className="p-6 bg-white rounded-[40px] w-full shadow-sm">
                          {/* Custom Header from Image */}
                          <div className="w-full bg-white border border-slate-200 border-b-0 rounded-t-[32px] overflow-hidden flex divide-x divide-slate-200 shadow-sm">
                            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#0f172a] uppercase tracking-tight mb-2">LUỸ KẾ PHỤC VỤ NHÂN VIÊN</h2>
                              <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[15px] text-slate-500 uppercase tracking-widest">LUỸ KẾ ĐẾN NGÀY : {today}</span>
                            </div>
                            <div className="w-2/5 p-6 flex flex-col items-center justify-center">
                              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#e11d48] uppercase tracking-tight mb-2">DỰ KIẾN</h2>
                              <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[15px] text-slate-500 uppercase tracking-widest">
                                TGSD: {daysPassed}/{totalDays}
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-white border border-slate-200 rounded-b-[32px] overflow-visible shadow-xl shadow-slate-200/50">
                            <div className="w-full overflow-x-auto">
                              <table className="w-full border-collapse min-w-[900px]" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                                <thead className="sticky top-0 z-20">
                                  <tr className="text-[#0f172a] font-sans font-black text-[17px] uppercase tracking-wider h-[45px]">
                                    <th style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }} className="bg-[#00965e] px-2 py-0 text-center border-r border-white/10 h-[35px] font-sans font-black text-[#0f172a]">STT</th>
                                    {visibleIndices.map((idx, i) => {
                                      // Map color regions like the image
                                      let bgColor = 'bg-[#00965e]'; // First group (Emerald)
                                      if (i >= 2) bgColor = 'bg-[#ffcb05]'; // Middle group (Amber)

                                      const headerText = allHeaders[idx].trim().toUpperCase();
                                      let widthClasses = ''; // Flexible width

                                      return (
                                        <th key={idx} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`${bgColor} ${widthClasses} px-2 py-0 text-center border-r border-white/10 whitespace-normal break-words leading-tight text-[14px] h-[35px] font-sans font-black text-[#0f172a]`}>
                                          {allHeaders[idx]}
                                        </th>
                                      );
                                    })}
                                    <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="bg-[#f58220] px-2 py-0 text-center border-r border-white/10 last:border-r-0 whitespace-nowrap text-[14px] h-[35px] font-sans font-black text-[#0f172a]">
                                      TOP/BOT
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sortedRows.map((row, rowIdx) => {
                                    const cells = row.split('\t');
                                    const isStriped = rowIdx % 2 === 1;
                                    const isTopOne = rowIdx < topLimit;
                                    const isBottomOne = rowIdx >= totalRows - botLimit;

                                    return (
                                      <tr key={rowIdx} className={`${isStriped ? 'bg-[#f8faff]' : 'bg-white'} hover:bg-slate-50 transition-colors h-[35px]`}>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="px-2 py-0 text-center font-extrabold text-slate-800 text-[16px] font-sans border-r border-slate-100 h-[35px]">{rowIdx + 1}</td>
                                        {visibleIndices.map((idx, i) => {
                                          const value = cells[idx] || '';
                                          const headerText = allHeaders[idx].trim().toUpperCase();
                                          const isStaffName = headerText.includes('TÊN') || headerText.includes('TEN') || i === 0;
                                          const isUserNV = headerText.includes('USER') || headerText.includes('MÃ NV');
                                          const isPercentage = value.includes('%');

                                          // Numeric fonts per request
                                          const isNumericColumn = !isStaffName && !isUserNV;
                                          const fontClass = isNumericColumn ? 'font-oswald' : 'font-sans';

                                          // Specific formatting based on reference image
                                          let textColor = 'text-slate-700';
                                          if (isStaffName) textColor = isTopOne ? 'text-[#2563eb]' : (isBottomOne ? 'text-[#e11d48]' : 'text-slate-800');
                                          if (isPercentage) {
                                            const numVal = parseFloat(value);
                                            if (!isNaN(numVal)) {
                                              textColor = numVal >= 100 ? 'text-[#059669]' : 'text-[#e11d48]';
                                            }
                                          }

                                          let displayValue = value;
                                          if (headerText.includes('ĐIỂM KH HÀI LÒNG')) {
                                            const numVal = parseFloat(value);
                                            if (!isNaN(numVal) && value.trim() !== '') {
                                              displayValue = (Math.floor(numVal * 10) / 10).toString();
                                            }
                                          }

                                          return (
                                            <td key={idx} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className={`px-2 py-0 text-center text-[16px] font-sans font-extrabold ${textColor} border-r border-slate-100 whitespace-nowrap h-[45px]`}>
                                              <div className="flex items-center justify-center gap-1 h-full px-2">
                                                {isStaffName && <ChevronRight size={14} className="flex-shrink-0" />}
                                                {isPercentage ? (
                                                  <span className={`px-1.5 py-0.5 rounded ${parseFloat(value) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {displayValue}
                                                  </span>
                                                ) : (
                                                  <span>{displayValue}</span>
                                                )}
                                              </div>
                                            </td>
                                          );
                                        })}
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="px-1 py-0 text-center text-[16px] font-extrabold font-sans border-r border-slate-100 last:border-r-0 whitespace-nowrap h-[35px]">
                                           <div className="flex items-center justify-center gap-1 h-full">
                                             {isTopOne && (
                                               <div className="flex items-center gap-1 text-[#2563eb]">
                                                 <Trophy size={14} className="flex-shrink-0" />
                                                 <span className="text-[13px]">TOP</span>
                                               </div>
                                             )}
                                             {isBottomOne && (
                                               <div className="flex items-center gap-1 text-[#e11d48]">
                                                 <TrendingDown size={14} className="flex-shrink-0" />
                                                 <span className="text-[13px]">BOT</span>
                                               </div>
                                             )}
                                             {!isTopOne && !isBottomOne && <span className="opacity-20 text-slate-400">-</span>}
                                           </div>
                                         </td>
                                       </tr>
                                     );
                                   })}
                                 </tbody>
                                 <tfoot className="bg-[#f8faff] border-t-2 border-slate-200">
                                   <tr style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="font-black text-slate-800 uppercase text-[14pt]">
                                     <td colSpan={2} className="px-6 py-4 text-center">TỔNG</td>
                                     {visibleIndices.slice(1).map((_, i) => (
                                       <td key={i} className="px-4 py-4 text-center">---</td>
                                     ))}
                                     <td className="px-4 py-4 text-center">---</td>
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
                        <button
                          onClick={handleCaptureBanKem}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
                        >
                          <Camera size={16} /> CHỤP ẢNH BẢNG
                        </button>
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
                        className="w-full bg-white rounded-[40px] overflow-hidden p-6"
                      >
                        {/* Double Header Card */}
                        <div className="w-full bg-white border border-slate-200 border-b-0 rounded-t-[32px] overflow-hidden flex divide-x divide-slate-200 shadow-sm">
                          <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#0f172a] uppercase tracking-tight mb-2">BÁN KÈM NHÂN VIÊN</h2>
                            <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[15px] text-slate-500 uppercase tracking-widest">LUỸ KẾ THÁNG</span>
                          </div>
                          <div className="w-2/5 p-6 flex flex-col items-center justify-center">
                            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#e11d48] uppercase tracking-tight mb-2">DỰ KIẾN</h2>
                            <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[15px] text-slate-500 uppercase tracking-widest">
                              TGSD: {daysPassed}/{totalDays}
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
                                  <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">DTLK</th>
                                  <th style={{ width: '150px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">LƯỢT BILL BÁN KÈM</th>
                                  <th style={{ width: '150px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">%BILL BÁN KÈM</th>
                                  <th style={{ width: '220px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">LƯỢT BILL BÁN HÀNG (TRỪ ONLINE, TRẢ GÓP)</th>
                                  <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-6 py-3 text-center text-[#0f172a] font-sans font-black">HIỆU QUẢ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: '14px' }}>
                                {rows.map((row: any, i: number, arr: any[]) => {
                                    const threshold = Math.max(1, Math.ceil(arr.length * 0.2));
                                    const isTop = i < threshold;
                                    const isBottom = i >= arr.length - threshold && !isTop;
                                    const isStriped = i % 2 === 1;
                                    return (
                                      <tr key={i} className={`${isStriped ? 'bg-[#f8faff]' : 'bg-white'} hover:bg-slate-50 h-[48px]`}>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="px-4 py-3 text-center border-r border-slate-200 text-[#0f172a]">{i + 1}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="px-6 py-3 border-r border-slate-200 text-[#0f172a] uppercase">{row.nhanVien}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#0f172a]">{row.dtlk || '0'}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#0f172a]">{row.luotBill}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className={`px-6 py-3 text-center border-r border-slate-200 font-mono ${isTop ? 'text-emerald-600' : isBottom ? 'text-rose-600' : 'text-[#0f172a]'}`}>{row.phanTramBill}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#0f172a]">{row.luotBillBanHang}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="px-6 py-3 text-center text-[#0f172a]">
                                          {isTop && (
                                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded text-[11px] uppercase whitespace-nowrap">
                                              <TrendingUp size={12} strokeWidth={3} /> TỐT
                                            </span>
                                          )}
                                          {isBottom && (
                                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 rounded text-[11px] uppercase whitespace-nowrap">
                                              <TrendingDown size={12} strokeWidth={3} /> CHÚ Ý
                                            </span>
                                          )}
                                          {!isTop && !isBottom && (
                                            <span className="text-slate-400">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                })}
                              </tbody>
                            </table>
                          </div>
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
                          <button
                            onClick={() => handleClearThuong('hientai')}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                            title="Xóa toàn bộ dữ liệu thưởng tháng hiện tại"
                          >
                            <Trash2 size={10} className="text-rose-500" />
                            Xóa dữ liệu
                          </button>
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
                                "capture-btn flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
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
                        <button
                          onClick={handleCaptureTraCham}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                        >
                          <Camera size={16} /> CHỤP ẢNH BẢNG
                        </button>
                      </div>
                    </div>



                    <div
                      ref={captureTraChamRef}
                      className="w-full bg-white rounded-[40px] overflow-hidden p-6"
                    >
                      {parsedTraChamRows.length > 0 ? (
                        <>
                          {/* Double Header Card */}
                          <div className="w-full bg-white border border-slate-200 border-b-0 rounded-t-[32px] overflow-hidden flex divide-x divide-slate-200 shadow-sm">
                            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#0f172a] uppercase tracking-tight mb-2">TRẢ CHẬM NHÂN VIÊN</h2>
                              <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[15px] text-slate-500 uppercase tracking-widest">LUỸ KẾ THÁNG</span>
                            </div>
                            <div className="w-2/5 p-6 flex flex-col items-center justify-center">
                              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#e11d48] uppercase tracking-tight mb-2">DỰ KIẾN</h2>
                              <div className="w-4/5 border-t-2 border-slate-200 mt-1 mb-2"></div>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[15px] text-slate-500 uppercase tracking-widest">
                                TGSD: {daysPassed}/{totalDays}
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-white border border-slate-200 rounded-b-[32px] overflow-hidden shadow-lg shadow-slate-200/30">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[#0f172a] border-collapse" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                                <thead className="text-slate-900 uppercase border-b border-slate-200">
                                  <tr style={{ height: '50px' }}>
                                    <th style={{ width: '60px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-4 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">STT</th>
                                    <th style={{ width: '280px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-6 py-3 border-r border-white/20 text-[#0f172a] font-sans font-black">NHÂN VIÊN</th>
                                    <th style={{ width: '180px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">DOANH THU THỰC</th>
                                    <th style={{ width: '200px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">DOANH THU TRẢ CHẬM</th>
                                    <th style={{ width: '150px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">% TRẢ CHẬM</th>
                                    <th style={{ width: '150px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-6 py-3 text-center text-[#0f172a] font-sans font-black">HIỆU QUẢ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '14px' }}>
                                  {parsedTraChamRows.map((row: any, i: number, arr: any[]) => {
                                      const threshold = Math.max(1, Math.ceil(arr.length * 0.2));
                                      const isTop = i < threshold;
                                      const isBottom = i >= arr.length - threshold && !isTop;
                                      const isStriped = i % 2 === 1;
                                      return (
                                        <tr key={i} className={`${isStriped ? 'bg-[#f8faff]' : 'bg-white'} hover:bg-slate-50 h-[48px]`}>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-3 text-center border-r border-slate-200 text-[#0f172a]">{i + 1}</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 border-r border-slate-200 text-[#0f172a] uppercase">{row.nhanVien}</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#0f172a]">{Math.round(row.totalRevenue).toLocaleString('vi-VN')}</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#0f172a]">{Math.round(row.installmentRevenue).toLocaleString('vi-VN')}</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`px-6 py-3 text-center border-r border-slate-200 font-mono ${isTop ? 'text-emerald-600' : isBottom ? 'text-rose-600' : 'text-[#0f172a]'}`}>{row.percent.toFixed(1)}%</td>
                                          <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center text-[#0f172a]">
                                            {isTop && (
                                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded text-[11px] uppercase whitespace-nowrap">
                                                <TrendingUp size={12} strokeWidth={3} /> TỐT
                                              </span>
                                            )}
                                            {isBottom && (
                                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 rounded text-[11px] uppercase whitespace-nowrap">
                                                <TrendingDown size={12} strokeWidth={3} /> CHÚ Ý
                                              </span>
                                            )}
                                            {!isTop && !isBottom && (
                                              <span className="text-slate-400 font-black">-</span>
                                            )}
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

                        {/* Capture button */}
                        <button
                          onClick={handleCaptureRank3T}
                          disabled={isCapturing}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          <Camera size={16} /> CHỤP ẢNH BẢNG
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
                              <table className="w-full text-left text-[#0f172a] border-collapse" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                                <thead className="text-slate-900 uppercase border-b border-slate-200">
                                  <tr>
                                    <th rowSpan={2} style={{ width: '60px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-4 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black align-middle whitespace-nowrap">STT</th>
                                    <th rowSpan={2} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-6 py-3 border-r border-white/20 text-[#0f172a] font-sans font-black align-middle whitespace-nowrap min-w-[170px]">NHÂN VIÊN</th>
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
                                    <th rowSpan={2} style={{ width: '180px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#0f172a' }} className="px-4 py-3 text-center border-r border-white/20 text-white font-sans font-black align-middle whitespace-nowrap">
                                      <div className="text-sm uppercase tracking-wider text-amber-400 font-black">ĐÁNH GIÁ NHÂN VIÊN</div>
                                    </th>
                                  </tr>
                                  <tr>
                                    {showDtqdGroup && (
                                      <>
                                        {showMonthlyDtqd && (
                                          <>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-4 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">DTQĐ {rankMonth1.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-4 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">DTQĐ {rankMonth2.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-4 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">DTQĐ {rankMonth3.replace('Tháng ', 'T')}</th>
                                          </>
                                        )}
                                        <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#eab308' }} className="px-6 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">DTQĐ TB</th>
                                        <th style={{ width: '160px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f59e0b' }} className="px-3 py-2.5 border-r border-white/20 text-[#0f172a] font-sans font-black text-center whitespace-nowrap">TOP / BOT (20%)</th>
                                      </>
                                    )}

                                    {showNganhHangGroup && (
                                      <>
                                        {showMonthlyDtqd && (
                                          <>
                                            <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#6366f1' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">N.HÀNG {rankMonth1.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#6366f1' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">N.HÀNG {rankMonth2.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#6366f1' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">N.HÀNG {rankMonth3.replace('Tháng ', 'T')}</th>
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
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TN {rankMonth1.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TN {rankMonth2.replace('Tháng ', 'T')}</th>
                                            <th style={{ width: '110px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-4 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TN {rankMonth3.replace('Tháng ', 'T')}</th>
                                          </>
                                        )}
                                        <th style={{ width: '120px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ea580c' }} className="px-6 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TN TB</th>
                                        <th style={{ width: '160px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#c2410c' }} className="px-3 py-2.5 border-r border-white/20 text-white font-sans font-black text-center whitespace-nowrap">TOP / BOT (20%)</th>
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

                                    return (
                                      <tr key={i} className={`${isStriped ? 'bg-[#f8faff]' : 'bg-white'} hover:bg-slate-50 h-[48px]`}>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-3 text-center border-r border-slate-200 bg-[#fef08a] text-[#0f172a] font-black whitespace-nowrap">{i + 1}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 border-r border-slate-200 text-[#0f172a] uppercase font-black whitespace-nowrap">{row.name}</td>
                                        {showDtqdGroup && (
                                          <>
                                            {showMonthlyDtqd && (
                                              <>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TTopBotStats.sets?.botM1Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TTopBotStats.sets?.topM1Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-amber-50/10 text-slate-700"
                                                )}>
                                                  {row.dtqd1 >= 1000000 
                                                    ? `${Math.round(row.dtqd1 / 1000000).toLocaleString('vi-VN')} Tr`
                                                    : Math.round(row.dtqd1).toLocaleString('vi-VN')}
                                                </td>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TTopBotStats.sets?.botM2Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TTopBotStats.sets?.topM2Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-amber-50/10 text-slate-700"
                                                )}>
                                                  {row.dtqd2 >= 1000000 
                                                    ? `${Math.round(row.dtqd2 / 1000000).toLocaleString('vi-VN')} Tr`
                                                    : Math.round(row.dtqd2).toLocaleString('vi-VN')}
                                                </td>
                                                <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                  "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                  rank3TTopBotStats.sets?.botM3Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                  rank3TTopBotStats.sets?.topM3Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                  "bg-amber-50/10 text-slate-700"
                                                )}>
                                                  {row.dtqd3 >= 1000000 
                                                    ? `${Math.round(row.dtqd3 / 1000000).toLocaleString('vi-VN')} Tr`
                                                    : Math.round(row.dtqd3).toLocaleString('vi-VN')}
                                                </td>
                                              </>
                                            )}
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-slate-700 font-black bg-amber-100/10 whitespace-nowrap">
                                              {(() => {
                                                const avgDtqd = row.dtqd / 3;
                                                return avgDtqd >= 1000000 
                                                  ? `${Math.round(avgDtqd / 1000000).toLocaleString('vi-VN')} Tr`
                                                  : Math.round(avgDtqd).toLocaleString('vi-VN');
                                              })()}
                                            </td>
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-amber-50/20">
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
                                            <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-indigo-600 font-black bg-indigo-50/10 whitespace-nowrap">
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
                                                     return val >= 1000000 
                                                       ? `${(val / 1000000).toFixed(1).replace('.', ',')} tr`
                                                       : Math.round(val).toLocaleString('vi-VN');
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
                                                     return val >= 1000000 
                                                       ? `${(val / 1000000).toFixed(1).replace('.', ',')} tr`
                                                       : Math.round(val).toLocaleString('vi-VN');
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
                                                     return val >= 1000000 
                                                       ? `${(val / 1000000).toFixed(1).replace('.', ',')} tr`
                                                       : Math.round(val).toLocaleString('vi-VN');
                                                   })()}
                                                 </td>
                                               </>
                                             )}
                                             <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#00965e] font-black bg-orange-50/10 whitespace-nowrap">
                                               {(() => {
                                                 const avgTn = row.thunhap / 3;
                                                 return avgTn >= 1000000 
                                                   ? `${(avgTn / 1000000).toFixed(1).replace('.', ',')} tr`
                                                   : Math.round(avgTn).toLocaleString('vi-VN');
                                               })()}
                                             </td>
                                             <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-orange-50/20">
                                          </td>
                                          </>
                                        )}
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center text-[12px] whitespace-nowrap bg-slate-900/5">
                                          {(() => {
                                            const tbTn = rank3TThuNhapTopBotStats.stats[key] || { top: 0, bot: 0 };
                                            const totalTop = (showDtqdGroup ? tbDtqd.top : 0) + 
                                                             (showNganhHangGroup ? tbNh.top : 0) + 
                                                             (showEffGroup ? tbEff.top : 0) + 
                                                             (showThuNhapGroup ? tbTn.top : 0);

                                            const totalBot = (showDtqdGroup ? tbDtqd.bot : 0) + 
                                                             (showNganhHangGroup ? tbNh.bot : 0) + 
                                                             (showEffGroup ? tbEff.bot : 0) + 
                                                             (showThuNhapGroup ? tbTn.bot : 0);
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
            </AnimatePresence>
          </div>
        </div>
      </main>
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
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
    </div>
  );
};

export default EmployeeHealth;
