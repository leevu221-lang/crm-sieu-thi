/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HeartPulse, Camera, TrendingUp, Search, ChevronDown, Check, MessageSquare, FileText, ChevronRight, LayoutGrid, Info, Users, Printer, UploadCloud, Trophy, TrendingDown, Gift, Target, Trash2, Clock, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
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
import SummaryThiDuaTable from './EmployeeHealth/components/SummaryThiDuaTable';
import CategoryDetailByStaffTable from './EmployeeHealth/components/CategoryDetailByStaffTable';
import TongHopNvTable from './EmployeeHealth/components/TongHopNvTable';
import { cn, parseStaffRankData, parseYcxData, normalizeStoreId, parseStaffValueList, normalize } from './RTST/utils';

const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
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
  const { tragopMatran, categoryTargets, processedData, staffInput, staffCategoryInput, loadData: loadLuykeData, isLoading: isLuykeLoading } = useLuykeData(maKho);

  const isDataLoading = isHealthLoading || isLuykeLoading;

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

  const autoCopyNextStaff = (currentStaffId: string) => {
    const currentIndex = filteredBiData.findIndex(s => s.fullId === currentStaffId);
    if (currentIndex !== -1 && currentIndex < filteredBiData.length - 1) {
      const nextStaff = filteredBiData[currentIndex + 1];
      const match = nextStaff.fullId.match(/\d+/);
      const nextStaffId = match ? match[0] : nextStaff.fullId;
      navigator.clipboard.writeText(nextStaffId).then(() => {
        showNotification(`Đã copy mã NV tiếp theo: ${nextStaffId} (${nextStaff.displayName.split(' - ').pop()})`, 'success');
      }).catch(err => {
        console.error('Failed to copy next staff ID: ', err);
      });
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

  const {
    dtqd1Sum,
    dtqd2Sum,
    dtqd3Sum,
    thunhap1Sum,
    thunhap2Sum,
    thunhap3Sum
  } = useMemo(() => {
    const parsedDtqd1 = parseStaffValueList(dtqd3t1);
    const parsedDtqd2 = parseStaffValueList(dtqd3t2);
    const parsedDtqd3 = parseStaffValueList(dtqd3t3);
    
    const parsedTn1 = parseStaffValueList(thunhap3t1);
    const parsedTn2 = parseStaffValueList(thunhap3t2);
    const parsedTn3 = parseStaffValueList(thunhap3t3);

    const calcSum = (parsed: any[]) => parsed.reduce((acc, item) => {
      let val = item.value;
      if (val > 0 && val < 1000000) val = val * 1000000;
      return acc + val;
    }, 0);

    return {
      dtqd1Sum: calcSum(parsedDtqd1),
      dtqd2Sum: calcSum(parsedDtqd2),
      dtqd3Sum: calcSum(parsedDtqd3),
      thunhap1Sum: calcSum(parsedTn1),
      thunhap2Sum: calcSum(parsedTn2),
      thunhap3Sum: calcSum(parsedTn3),
    };
  }, [dtqd3t1, dtqd3t2, dtqd3t3, thunhap3t1, thunhap3t2, thunhap3t3]);

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
    const parsedDtqd1 = parseStaffValueList(dtqd3t1);
    const parsedDtqd2 = parseStaffValueList(dtqd3t2);
    const parsedDtqd3 = parseStaffValueList(dtqd3t3);
    
    const parsedTn1 = parseStaffValueList(thunhap3t1);
    const parsedTn2 = parseStaffValueList(thunhap3t2);
    const parsedTn3 = parseStaffValueList(thunhap3t3);

    const employeeMap = new Map<string, {
      id: string;
      name: string;
      dtqd: number;
      thunhap: number;
    }>();

    const getEmpKey = (emp: { id: string; name: string }) => {
      if (emp.id && /^\d{5,}$/.test(emp.id)) {
        return `ID_${emp.id}`;
      }
      return `NAME_${normalize(emp.name || emp.id)}`;
    };

    const getOrCreate = (emp: { id: string; name: string }) => {
      const key = getEmpKey(emp);
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          id: emp.id && /^\d{5,}$/.test(emp.id) ? emp.id : '',
          name: emp.name || emp.id,
          dtqd: 0,
          thunhap: 0
        });
      }
      return employeeMap.get(key)!;
    };

    parsedDtqd1.forEach(item => {
      const entry = getOrCreate(item);
      entry.dtqd += item.value;
    });
    parsedDtqd2.forEach(item => {
      const entry = getOrCreate(item);
      entry.dtqd += item.value;
    });
    parsedDtqd3.forEach(item => {
      const entry = getOrCreate(item);
      entry.dtqd += item.value;
    });

    parsedTn1.forEach(item => {
      const entry = getOrCreate(item);
      entry.thunhap += item.value;
    });
    parsedTn2.forEach(item => {
      const entry = getOrCreate(item);
      entry.thunhap += item.value;
    });
    parsedTn3.forEach(item => {
      const entry = getOrCreate(item);
      entry.thunhap += item.value;
    });

    return Array.from(employeeMap.values()).map(emp => {
      let dtqd = emp.dtqd;
      if (dtqd > 0 && dtqd < 1000000) dtqd = dtqd * 1000000;
      
      let thunhap = emp.thunhap;
      if (thunhap > 0 && thunhap < 1000000) thunhap = thunhap * 1000000;

      const effQd = dtqd > 0 ? (thunhap / dtqd) * 100 : 0;

      return {
        id: emp.id,
        name: emp.name,
        dtqd,
        thunhap,
        effQd
      };
    })
    .filter(emp => emp.dtqd > 0 || emp.thunhap > 0)
    .sort((a, b) => b.dtqd - a.dtqd);
  }, [dtqd3t1, dtqd3t2, dtqd3t3, thunhap3t1, thunhap3t2, thunhap3t3]);

  const filteredRank3TData = useMemo(() => {
    // Filter against selectedStaffIds
    const selectedData = parsedRank3TData.filter(emp => {
      const matchingStaff = biRevenueData.find(staff => {
        const staffId = staff.fullId.toLowerCase().trim();
        const staffName = (staff.displayName.split('-').pop() || '').trim();
        const staffNameClean = removeAccents(staffName);
        const empNameClean = removeAccents(emp.name);
        const empIdClean = emp.id.toLowerCase().trim();

        return (
          (empIdClean && staffId.includes(empIdClean)) ||
          empNameClean === staffNameClean ||
          empNameClean.includes(staffNameClean) ||
          staffNameClean.includes(empNameClean)
        );
      });
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

  // Load thuong data from DB when store changes
  useEffect(() => {
    if (marketFilter === 'ALL' || !maKho) return;
    const shortMaKho = maKho.replace(/^0+/, '');
    
    supabase.from('store')
      .select('thuong_nv_data, selected_staff_ids')
      .eq('id', normalizeStoreId(marketFilter.trim()))
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data) {
          setThuongData({});
          return;
        }
        try {
          const parsed = typeof data.thuong_nv_data === 'string' 
            ? JSON.parse(data.thuong_nv_data) 
            : data.thuong_nv_data;
          setThuongData(parsed || {});
          console.log('[THUONG] Loaded thuong_nv_data:', Object.keys(parsed || {}).length, 'staff');
        } catch (e) {
          console.error('[THUONG] Parse error:', e);
          setThuongData({});
        }

        if (data.selected_staff_ids) {
          try {
            const parsedIds = typeof data.selected_staff_ids === 'string'
              ? JSON.parse(data.selected_staff_ids)
              : data.selected_staff_ids;
            if (Array.isArray(parsedIds)) {
              setSelectedStaffIds(parsedIds);
              initializedRef.current = `${maKho.replace(/^0+/, '')}_${marketFilter}`;
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
      const effQd = (staff.actualVal || 0) > 0
        ? ((staff.virtualVal - (staff.actualVal || 0)) / (staff.actualVal || 0)) * 100
        : 0;
      const actualTargetQdPerStaff = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
      const actualVirtualVal = Math.abs(staff.virtualVal) > 10000 ? staff.virtualVal : staff.virtualVal * 1000000;
      const percentHT = (actualTargetQdPerStaff > 0 && daysPassed > 0)
        ? (((actualVirtualVal / daysPassed) * totalDays) / actualTargetQdPerStaff) * 100
        : 0;

      return {
        fullName: staff.displayName,
        effQd,
        percentHT
      };
    });

    const count = Math.max(1, Math.round(staffStats.length * 0.2));

    // Sort for %HT
    const sortedByHT = [...staffStats].sort((a, b) => b.percentHT - a.percentHT);
    const topHT = sortedByHT.slice(0, count);
    const botHT = sortedByHT.slice(-count).reverse();

    // Sort for HIỆU QUẢ QĐ
    const sortedByEff = [...staffStats].sort((a, b) => b.effQd - a.effQd);
    const topEff = sortedByEff.slice(0, count);
    const botEff = sortedByEff.slice(-count).reverse();

    const text = `📊 BÁO CÁO DOANH THU QUY ĐỔI SIÊU THỊ: ${maKho}

🌟 TOP 20% DOANH THU QUY ĐỔI
${topHT.map((s) => {
      const parts = s.fullName.split(' - ');
      const id = parts[0].trim();
      const name = parts.length > 1 ? parts[1].trim() : '';
      const shortName = name.split(' ').pop() || '';
      return `${id} - ${shortName.toUpperCase()} (${Math.round(s.percentHT)}%)`;
    }).join('\n')}

⚠️ NHÓM BOTTOM 20% DOANH THU QUY ĐỔI
${botHT.map((s) => {
      const parts = s.fullName.split(' - ');
      const id = parts[0].trim();
      const name = parts.length > 1 ? parts[1].trim() : '';
      const shortName = name.split(' ').pop() || '';
      return `${id} - ${shortName.toUpperCase()} (${Math.round(s.percentHT)}%)`;
    }).join('\n')}

🏆 TOP 20% HIỆU QUẢ QUY ĐỔI
${topEff.map((s) => {
      const parts = s.fullName.split(' - ');
      const id = parts[0].trim();
      const name = parts.length > 1 ? parts[1].trim() : '';
      const shortName = name.split(' ').pop() || '';
      return `${id} - ${shortName.toUpperCase()} (${Math.round(s.effQd)}%)`;
    }).join('\n')}

⚠️ NHÓM BOTTOM 20% HIỆU QUẢ QUY ĐỔI:
${botEff.map((s) => {
      const parts = s.fullName.split(' - ');
      const id = parts[0].trim();
      const name = parts.length > 1 ? parts[1].trim() : '';
      const shortName = name.split(' ').pop() || '';
      return `${id} - ${shortName.toUpperCase()} (${Math.round(s.effQd)}%)`;
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
    { id: 'KHAI_THAC_NV', label: 'KHAI THÁC NV', icon: Target },
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
                    luykeCategories={processedData.categories.filter((c: any) => {
                      if (marketFilter === 'ALL') return true;
                      if (!c.marketName) return true;
                      return c.marketName.toUpperCase().includes(marketFilter.toUpperCase()) || marketFilter.toUpperCase().includes(c.marketName.toUpperCase());
                    })}
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
                              const dataUrl = await htmlToImage.toPng(element, {
                                backgroundColor: '#ffffff',
                                pixelRatio: 2,
                              });
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
                              luykeCategories={processedData.categories.filter((c: any) => {
                                if (marketFilter === 'ALL') return true;
                                if (!c.marketName) return true;
                                return c.marketName.toUpperCase().includes(marketFilter.toUpperCase()) || marketFilter.toUpperCase().includes(c.marketName.toUpperCase());
                              })}
                              staffTargetQd={targetQdPerStaff}
                              staffDtqd={staffActualVal}
                              staffPercentHT={staffPercentHT}
                              staffBonusHientai={staffBonusHientai}
                              staffInstallmentPercent={staffInstallmentPercent}
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
                    luykeCategories={processedData.categories.filter((c: any) => {
                      if (marketFilter === 'ALL') return true;
                      if (!c.marketName) return true;
                      return c.marketName.toUpperCase().includes(marketFilter.toUpperCase()) || marketFilter.toUpperCase().includes(c.marketName.toUpperCase());
                    })}
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
                    luykeCategories={processedData.categories.filter((c: any) => {
                      if (marketFilter === 'ALL') return true;
                      if (!c.marketName) return true;
                      return c.marketName.toUpperCase().includes(marketFilter.toUpperCase()) || marketFilter.toUpperCase().includes(c.marketName.toUpperCase());
                    })}
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
                    const today = new Date().toLocaleDateString('vi-VN');

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
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }} className={`px-1 py-0 text-center text-[16px] font-extrabold font-sans border-r border-slate-100 last:border-r-0 whitespace-nowrap h-[35px]`}>
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
                                {/* Footer like the image */}
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
                  className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto w-full relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  <div className="hidden">
                    <textarea
                      value={banKemNv}
                      onChange={(e) => saveBanKemNv(e.target.value)}
                    />
                  </div>

                  {banKemNv && (
                    <div className="w-full">
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={handleCaptureBanKem}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-sm font-bold uppercase transition-all shadow-sm"
                        >
                          <Camera size={16} /> CHỤP ẢNH BẢNG
                        </button>
                      </div>

                      <div
                        ref={captureBanKemRef}
                        className="w-full bg-white rounded-[40px] overflow-hidden p-6"
                      >
                        {(() => {
                          const rows = parseBanKemData(banKemNv)
                            .filter(row => selectedStaffIds.length === 0 || selectedStaffIds.some(id => row.nhanVien.includes(id)))
                            .sort((a, b) => parseFloat(b.phanTramBill) - parseFloat(a.phanTramBill));

                          return rows.length > 0 ? (
                            <>
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
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}
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
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 block truncate">{staff.displayName}</label>
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
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 block truncate">{staff.displayName}</label>
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
                                <div className="w-2/5 p-6 flex flex-col items-center justify-center bg-slate-50/50">
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCaptureRank3T}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                        >
                          <Camera size={16} /> CHỤP ẢNH BẢNG
                        </button>
                      </div>
                    </div>

                    {/* Summary row for the 3 monthly inputs */}
                    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-[20px] border border-slate-100">
                      <div className="text-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng DTQĐ Tháng 1</div>
                        <div className="text-sm font-black text-blue-600 mt-1">{formatValueForDisplay(dtqd1Sum)}</div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">TN: {formatValueForDisplay(thunhap1Sum, true)}</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng DTQĐ Tháng 2</div>
                        <div className="text-sm font-black text-indigo-600 mt-1">{formatValueForDisplay(dtqd2Sum)}</div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">TN: {formatValueForDisplay(thunhap2Sum, true)}</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng DTQĐ Tháng 3</div>
                        <div className="text-sm font-black text-violet-600 mt-1">{formatValueForDisplay(dtqd3Sum)}</div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">TN: {formatValueForDisplay(thunhap3Sum, true)}</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-sm text-white flex flex-col justify-center">
                        <div className="text-[10px] font-black text-white/80 uppercase tracking-wider">Tổng Cộng 3 Tháng</div>
                        <div className="text-sm font-black mt-1">{formatValueForDisplay(dtqd1Sum + dtqd2Sum + dtqd3Sum)}</div>
                        <div className="text-[9px] font-bold text-white/80 mt-0.5">Tổng TN: {formatValueForDisplay(thunhap1Sum + thunhap2Sum + thunhap3Sum, true)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Month 1 Inputs */}
                      <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">1</span>
                          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Tháng Thứ Nhất</h4>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dữ Liệu DTQĐ 1</label>
                              <span className="text-[10px] font-black text-blue-600">{formatValueForDisplay(dtqd1Sum)}</span>
                            </div>
                            <textarea
                              value={dtqd3t1}
                              onChange={(e) => setDtqd3t1(e.target.value)}
                              placeholder="Dán cột Nhân viên & DTQĐ tháng 1..."
                              className="w-full h-28 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dữ Liệu Thu Nhập 1</label>
                              <span className="text-[10px] font-black text-emerald-600">{formatValueForDisplay(thunhap1Sum, true)}</span>
                            </div>
                            <textarea
                              value={thunhap3t1}
                              onChange={(e) => setThunhap3t1(e.target.value)}
                              placeholder="Dán cột Nhân viên & Thu nhập tháng 1..."
                              className="w-full h-28 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Month 2 Inputs */}
                      <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">2</span>
                          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Tháng Thứ Hai</h4>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dữ Liệu DTQĐ 2</label>
                              <span className="text-[10px] font-black text-indigo-600">{formatValueForDisplay(dtqd2Sum)}</span>
                            </div>
                            <textarea
                              value={dtqd3t2}
                              onChange={(e) => setDtqd3t2(e.target.value)}
                              placeholder="Dán cột Nhân viên & DTQĐ tháng 2..."
                              className="w-full h-28 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dữ Liệu Thu Nhập 2</label>
                              <span className="text-[10px] font-black text-emerald-600">{formatValueForDisplay(thunhap2Sum, true)}</span>
                            </div>
                            <textarea
                              value={thunhap3t2}
                              onChange={(e) => setThunhap3t2(e.target.value)}
                              placeholder="Dán cột Nhân viên & Thu nhập tháng 2..."
                              className="w-full h-28 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Month 3 Inputs */}
                      <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-black">3</span>
                          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Tháng Thứ Ba</h4>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dữ Liệu DTQĐ 3</label>
                              <span className="text-[10px] font-black text-violet-600">{formatValueForDisplay(dtqd3Sum)}</span>
                            </div>
                            <textarea
                              value={dtqd3t3}
                              onChange={(e) => setDtqd3t3(e.target.value)}
                              placeholder="Dán cột Nhân viên & DTQĐ tháng 3..."
                              className="w-full h-28 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dữ Liệu Thu Nhập 3</label>
                              <span className="text-[10px] font-black text-emerald-600">{formatValueForDisplay(thunhap3Sum, true)}</span>
                            </div>
                            <textarea
                              value={thunhap3t3}
                              onChange={(e) => setThunhap3t3(e.target.value)}
                              placeholder="Dán cột Nhân viên & Thu nhập tháng 3..."
                              className="w-full h-28 px-3 py-2 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

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
                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-[13px] text-slate-500 uppercase tracking-widest">TỔNG HỢP LUỸ KẾ 3T</span>
                            </div>
                            <div className="w-2/5 p-6 flex flex-col items-center justify-center bg-slate-50/50">
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
                                  <tr style={{ height: '60px' }}>
                                    <th style={{ width: '60px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-4 py-3 text-center border-r border-white/20 text-[#0f172a] font-sans font-black">STT</th>
                                    <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#00965e' }} className="px-6 py-3 border-r border-white/20 text-[#0f172a] font-sans font-black">NHÂN VIÊN</th>
                                    <th style={{ width: '180px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 border-r border-white/20 text-[#0f172a] font-sans font-black text-center">DTQĐ</th>
                                    <th style={{ width: '180px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#ffcb05' }} className="px-6 py-3 border-r border-white/20 text-[#0f172a] font-sans font-black text-center">HIỆU QUẢ QĐ</th>
                                    <th style={{ width: '180px', fontFamily: "'Inter', sans-serif", fontWeight: 900, backgroundColor: '#f58220' }} className="px-6 py-3 text-center text-[#0f172a] font-sans font-black">THU NHẬP</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '14px' }}>
                                  {filteredRank3TData.map((row: any, i: number) => {
                                    const isStriped = i % 2 === 1;
                                    const effPercent = row.effQd.toFixed(1);
                                    const isGreen = row.effQd >= 50;

                                    return (
                                      <tr key={i} className={`${isStriped ? 'bg-[#f8faff]' : 'bg-white'} hover:bg-slate-50 h-[48px]`}>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-3 text-center border-r border-slate-200 bg-[#fef08a] text-[#0f172a]">{i + 1}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 border-r border-slate-200 text-[#0f172a] uppercase">{row.name}</td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-slate-700">
                                          {row.dtqd >= 1000000 
                                            ? `${Math.round(row.dtqd / 1000000).toLocaleString('vi-VN')} Tr`
                                            : Math.round(row.dtqd).toLocaleString('vi-VN')}
                                        </td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                          "px-6 py-3 text-center border-r border-slate-200 font-mono",
                                          isGreen ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                          {effPercent}%
                                        </td>
                                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center font-mono text-[#00965e]">
                                          {row.thunhap >= 1000000 
                                            ? `${(row.thunhap / 1000000).toFixed(2).toLocaleString()} Tr`
                                            : Math.round(row.thunhap).toLocaleString('vi-VN')} đ
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200">
                                  <tr className="h-[48px]">
                                    <td colSpan={2} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 text-[#0f172a] uppercase tracking-wider font-sans font-black text-sm">
                                      TỔNG CỘNG
                                    </td>
                                    <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-slate-800">
                                      {(() => {
                                        const sum = filteredRank3TData.reduce((acc: number, r: any) => acc + r.dtqd, 0);
                                        return sum >= 1000000 
                                          ? `${Math.round(sum / 1000000).toLocaleString('vi-VN')} Tr`
                                          : Math.round(sum).toLocaleString('vi-VN');
                                      })()}
                                    </td>
                                    <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-slate-800">
                                      {(() => {
                                        const sumDt = filteredRank3TData.reduce((acc: number, r: any) => acc + r.dtqd, 0);
                                        const sumTn = filteredRank3TData.reduce((acc: number, r: any) => acc + r.thunhap, 0);
                                        const avgEff = sumDt > 0 ? (sumTn / sumDt) * 100 : 0;
                                        return `${avgEff.toFixed(1)}%`;
                                      })()}
                                    </td>
                                    <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center font-mono text-[#00965e]">
                                      {(() => {
                                        const sum = filteredRank3TData.reduce((acc: number, r: any) => acc + r.thunhap, 0);
                                        return sum >= 1000000 
                                          ? `${(sum / 1000000).toFixed(2).toLocaleString()} Tr`
                                          : Math.round(sum).toLocaleString('vi-VN') + ' đ';
                                      })()}
                                    </td>
                                  </tr>
                                </tfoot>
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
    </div>
  );
};

export default EmployeeHealth;
