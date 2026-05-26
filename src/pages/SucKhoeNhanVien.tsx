/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HeartPulse, Camera, TrendingUp, Search, ChevronDown, Check, MessageSquare, FileText, ChevronRight, LayoutGrid, Info, Users, Printer, UploadCloud, Trophy, TrendingDown, Gift, Target, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { useEmployeeHealth } from './EmployeeHealth/hooks/useEmployeeHealth';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { useNotification } from '../contexts/NotificationContext';
import RevenueRankingTableQd from './EmployeeHealth/components/RevenueRankingTableQd';
import EmployeeDetailTable from './EmployeeHealth/components/EmployeeDetailTable';
import SummaryThiDuaTable from './EmployeeHealth/components/SummaryThiDuaTable';
import CategoryDetailByStaffTable from './EmployeeHealth/components/CategoryDetailByStaffTable';
import { cn, parseStaffRankData, parseYcxData } from './RTST/utils';

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
  const [isCopied, setIsCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const capturePhucVuRef = useRef<HTMLDivElement>(null);
  const captureBanKemRef = useRef<HTMLDivElement>(null);
  const captureThuongNvRef = useRef<HTMLDivElement>(null);
  const handleCaptureThuongNv = async () => {
    if (!captureThuongNvRef.current) return;
    setIsCapturing(true);

    const container = captureThuongNvRef.current;
    const tableWrap = container.querySelector('.overflow-x-auto') as HTMLElement;
    const captureBtn = container.querySelector('.capture-btn') as HTMLElement;
    
    const origContainerWidth = container.style.width;
    const origTableWrapOverflow = tableWrap ? tableWrap.style.overflow : '';
    const origBtnDisplay = captureBtn ? captureBtn.style.display : '';

    if (tableWrap) {
        tableWrap.style.overflow = 'visible';
    }
    if (captureBtn) {
        captureBtn.style.display = 'none';
    }
    container.style.width = 'max-content';

    try {
      await new Promise(r => setTimeout(r, 100)); // wait for layout
      const dataUrl = await htmlToImage.toPng(container, { backgroundColor: '#ffffff' });
      saveAs(dataUrl, 'LK_THUONG_NHAN_VIEN.png');
    } catch (err) {
      console.error('Error capturing thuong nv board:', err);
    } finally {
      if (tableWrap) tableWrap.style.overflow = origTableWrapOverflow;
      if (captureBtn) captureBtn.style.display = origBtnDisplay;
      container.style.width = origContainerWidth;
      setIsCapturing(false);
    }
  };

  const handleCaptureBanKem = async () => {
    if (!captureBanKemRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await htmlToImage.toPng(captureBanKemRef.current, { backgroundColor: '#ffffff' });
      saveAs(dataUrl, 'LK_BAN_KEM_NHAN_VIEN.png');
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
    isLoading: isHealthLoading,
    isSaving,
    refresh,
    savePhucVu,
    saveBanKemNv
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
  const { categoryTargets, processedData, staffInput, staffCategoryInput, loadData: loadLuykeData, isLoading: isLuykeLoading } = useLuykeData(maKho);

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
  }, [marketFilter, allowedMarkets, allStoreTargets, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stPercentTarget, setStName, setStDtlk, setStDtqd, setStDtDuKienQD, setStPercentHTTargetDuKienQD, setStPercentTarget]);

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
  const [activeTab, setActiveTab] = useState<'DOANH_THU' | 'CHI_TIET' | 'THI_DUA' | 'NGANH_HANG' | 'PHUC_VU' | 'BAN_KEM_NV' | 'THUONG_NV' | 'KHAI_THAC_NV'>('DOANH_THU');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [autoExpand, setAutoExpand] = useState(false);

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
        id: storeName, // The Supermarket Name as the unique Document ID / Primary Key!
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
      id: storeName,
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

  // Load thuong data from DB when store changes
  useEffect(() => {
    if (marketFilter === 'ALL' || !maKho) return;
    const shortMaKho = maKho.replace(/^0+/, '');
    
    supabase.from('store')
      .select('thuong_nv_data, selected_staff_ids')
      .eq('id', marketFilter.trim())
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
      const dataUrl = await htmlToImage.toPng(captureRef.current, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `XepHangDoanhThuQD_${maKho}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
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
    { id: 'CHI_TIET', label: 'CHI TIẾT NV', icon: Search },
    { id: 'THI_DUA', label: 'TH THI ĐUA', icon: Check },
    { id: 'NGANH_HANG', label: 'CT NGÀNH HÀNG', icon: HeartPulse },
    { id: 'PHUC_VU', label: 'PHỤC VỤ', icon: Users },
    { id: 'BAN_KEM_NV', label: 'BÁN KÈM NV', icon: MessageSquare },
    { id: 'THUONG_NV', label: 'THƯỞNG NV', icon: Gift },
    { id: 'KHAI_THAC_NV', label: 'KHAI THÁC NV', icon: Target },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Menu */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-20 relative transition-all duration-300 w-[340px]`}
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
                <span className={`text-[15px] font-black tracking-tight uppercase ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
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
        <div className="p-4 md:p-6 lg:p-10 w-full min-h-full">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
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
                  className="bg-white rounded-[32px] p-2 md:p-4 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-5xl mx-auto relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <TrendingUp size={20} />
                      </div>
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight border border-slate-200 px-4 py-2 rounded-xl mt-1 shadow-sm bg-white">DOANH THU NV</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
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
                              luykeCategories={processedData.categories.filter(c => {
                                if (marketFilter === 'ALL') return true;
                                if (!c.marketName) return true;
                                return c.marketName.toUpperCase().includes(marketFilter.toUpperCase()) || marketFilter.toUpperCase().includes(c.marketName.toUpperCase());
                              })}
                              staffTargetQd={targetQdPerStaff}
                              staffDtqd={staffActualVal}
                              staffPercentHT={staffPercentHT}
                              staffBonusHientai={staffBonusHientai}
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
                    luykeCategories={processedData.categories.filter(c => {
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
                    luykeCategories={processedData.categories.filter(c => {
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
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                    <Users size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">BÁO CÁO PHỤC VỤ</h2>
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
                        const dataUrl = await htmlToImage.toPng(capturePhucVuRef.current, {
                          backgroundColor: '#ffffff',
                          style: { borderRadius: '32px' },
                          cacheBust: true,
                        });
                        saveAs(dataUrl, `BAO_CAO_PHUC_VU_${new Date().getTime()}.png`);
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
                          <div className="w-full bg-white border border-slate-200 border-b-0 rounded-t-[32px] overflow-hidden flex divide-x divide-slate-100 shadow-sm">
                            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                              <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight mb-2">LUỸ KẾ PHỤC VỤ NHÂN VIÊN</h2>
                              <div className="flex items-center gap-2 py-1 px-4 border-t border-slate-100 mt-2">
                                <Camera size={14} className="text-indigo-600" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LUỸ KẾ ĐẾN NGÀY : {today}</span>
                              </div>
                              <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-slate-100"></div>
                            </div>
                            <div className="w-2/5 p-6 flex flex-col items-center justify-center">
                              <h2 className="text-xl font-black text-[#e11d48] uppercase tracking-tight mb-2">DỰ KIẾN</h2>
                              <div className="flex items-center gap-2 py-1 px-4 border-t border-slate-100 mt-2">
                                <TrendingUp size={14} className="text-orange-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TGSD: 19/30</span>
                              </div>
                            </div>
                          </div>

                          <div className="w-full bg-white border border-slate-200 rounded-b-[32px] overflow-visible shadow-xl shadow-slate-200/50">
                            <div className="w-full">
                              <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-20">
                                  <tr className="text-white font-utm-avo font-black text-[17px] uppercase tracking-wider h-[45px]">
                                    <th className="bg-[#00965e] px-2 py-0 text-center border-r border-white/10 h-[35px]">STT</th>
                                    {visibleIndices.map((idx, i) => {
                                      // Map color regions like the image
                                      let bgColor = 'bg-[#00965e]'; // First group (Emerald)
                                      if (i >= 2) bgColor = 'bg-[#ffcb05]'; // Middle group (Amber)

                                      const headerText = allHeaders[idx].trim().toUpperCase();
                                      let widthClasses = ''; // Flexible width

                                      return (
                                        <th key={idx} className={`${bgColor} ${widthClasses} px-2 py-0 text-center border-r border-white/10 whitespace-normal break-words leading-tight text-[14px] h-[35px]`}>
                                          {allHeaders[idx]}
                                        </th>
                                      );
                                    })}
                                    <th className="bg-[#f58220] px-2 py-0 text-center border-r border-white/10 last:border-r-0 whitespace-nowrap text-[14px] h-[35px]">
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
                                        <td className="px-2 py-0 text-center font-black text-slate-800 text-[16px] font-oswald border-r border-slate-100 h-[35px]">{rowIdx + 1}</td>
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
                                            <td key={idx} className={`px-2 py-0 text-center text-[16px] font-utm-avo font-bold ${textColor} border-r border-slate-100 whitespace-nowrap h-[45px]`}>
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
                                        <td className={`px-1 py-0 text-center text-[16px] font-bold font-oswald border-r border-slate-100 last:border-r-0 whitespace-nowrap h-[35px]`}>
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
                                  <tr className="font-black text-slate-800 uppercase text-[14pt]">
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
                  className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-[1260px] mx-auto w-full relative overflow-hidden"
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
                        className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6"
                      >
                        <div className="mb-6 flex items-center gap-3">
                          <Trophy size={20} className="text-orange-500" />
                          <h3 style={{ fontFamily: 'var(--font-utm-avo)', fontSize: '24px', fontWeight: 'bold' }} className="text-slate-800 uppercase tracking-widest">LK BÁN KÈM NHÂN VIÊN</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-sans text-slate-800 border-collapse border-2 border-slate-300">
                            <thead className="text-white uppercase border-b-2 border-slate-300">
                              <tr>
                                <th style={{ width: '240px', fontFamily: 'var(--font-utm-avo)', fontSize: '16px' }} className="px-6 py-[11px] border-r-2 border-slate-300 bg-emerald-600">NHÂN VIÊN</th>
                                <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300 bg-orange-300 text-slate-800">DTLK</th>
                                <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300 bg-orange-300 text-slate-800">LƯỢT BILL BÁN KÈM</th>
                                <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300 bg-orange-300 text-slate-800">%BILL BÁN KÈM</th>
                                <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300 bg-orange-300 text-slate-800">LƯỢT BILL BÁN HÀNG (TRỪ ONLINE, TRẢ GÓP)</th>
                                <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center bg-orange-300 text-slate-800">HIỆU QUẢ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-200 font-bold" style={{ fontFamily: 'var(--font-utm-avo)', fontSize: '14px' }}>
                              {parseBanKemData(banKemNv)
                                .filter(row => selectedStaffIds.length === 0 || selectedStaffIds.some(id => row.nhanVien.includes(id)))
                                .sort((a, b) => parseFloat(b.phanTramBill) - parseFloat(a.phanTramBill))
                                .map((row: any, i: number, arr: any[]) => {
                                  const threshold = Math.max(1, Math.ceil(arr.length * 0.2));
                                  const isTop = i < threshold;
                                  const isBottom = i >= arr.length - threshold && !isTop;
                                  return (
                                    <tr key={i} className="hover:bg-slate-50">
                                      <td style={{ width: '240px' }} className="px-6 py-[11px] text-slate-900 border-r-2 border-slate-300">{row.nhanVien}</td>
                                      <td style={{ width: '70px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300">{row.dtlk || '0'}</td>
                                      <td style={{ width: '70px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300">{row.luotBill}</td>
                                      <td style={{ width: '70px' }} className={`px-6 py-[11px] text-center border-r-2 border-slate-300 ${isTop ? 'text-emerald-600 font-black' : isBottom ? 'text-rose-600 font-black' : ''}`}>{row.phanTramBill}</td>
                                      <td style={{ width: '70px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300">{row.luotBillBanHang}</td>
                                      <td style={{ width: '70px' }} className="px-6 py-[11px] text-center">
                                        {isTop && (
                                          <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[11px] font-black uppercase whitespace-nowrap">
                                            <TrendingUp size={12} strokeWidth={3} /> TỐT
                                          </span>
                                        )}
                                        {isBottom && (
                                          <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded text-[11px] font-black uppercase whitespace-nowrap">
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
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Dán dữ liệu từ BI</p>
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
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block truncate">{staff.displayName}</label>
                              <textarea
                                className="w-full p-2 rounded-lg border border-slate-200 text-[10px] font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all bg-slate-50/50 hover:bg-white resize-none"
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
                              <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Dán dữ liệu từ BI</p>
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
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block truncate">{staff.displayName}</label>
                              <textarea
                                className="w-full p-2 rounded-lg border border-purple-200 text-[10px] font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all bg-purple-50/30 hover:bg-white resize-none"
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
                    <div ref={captureThuongNvRef} className="bg-white rounded-[24px] shadow-lg border border-slate-200/80 overflow-hidden">
                      {/* Table Header */}
                      <div className="border-b border-slate-100 px-6 py-4.5 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                              <Gift size={22} className="text-slate-700" />
                            </div>
                            <div>
                              <h2 className="text-[19px] font-black text-slate-800 uppercase tracking-tight">Bảng thưởng nhân viên</h2>
                              <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest">{marketFilter !== 'ALL' ? marketFilter : 'Tất cả siêu thị'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCaptureThuongNv}
                              disabled={isCapturing}
                              className={cn(
                                "capture-btn flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                isCapturing ? "opacity-50 cursor-not-allowed" : "active:scale-95"
                              )}
                            >
                              <Camera size={14} /> CHỤP ẢNH
                            </button>
                            <div className="px-3 py-1.5 rounded-xl bg-slate-100">
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
                              <table className="w-full border-collapse border border-slate-100">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th rowSpan={2} className="px-3 py-4 text-left w-10 border-b border-slate-100 border-r border-slate-100">STT</th>
                                    <th rowSpan={2} className="px-3 py-4 text-left border-b border-slate-100 border-r border-slate-100 min-w-[200px]">Nhân viên</th>
                                    {BONUS_COLS.map((cat, idx) => (
                                      <th key={idx} colSpan={3} className="px-3 py-2 text-center border-r border-slate-100 border-b border-slate-100">
                                        {cat.name}
                                      </th>
                                    ))}
                                    <th rowSpan={2} className="px-3 py-4 text-center border-b border-slate-100 min-w-[80px]">Xu hướng</th>
                                  </tr>
                                  <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    {BONUS_COLS.map((_, idx) => (
                                      <React.Fragment key={idx}>
                                        <th className="px-2 py-2 text-center border-r border-slate-100 border-b border-slate-100 min-w-[80px]">T.Trước</th>
                                        <th className="px-2 py-2 text-center border-r border-slate-100 border-b border-slate-100 min-w-[80px]">H.Tại</th>
                                        <th className="px-2 py-2 text-center border-r border-slate-100 border-b border-slate-100 min-w-[80px]">Tăng / Giảm</th>
                                      </React.Fragment>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sortedBiDataForBonus.map((staff, idx) => {
                                    const truoc = thuongData[staff.fullId]?.truoc || '';
                                    const hientai = thuongData[staff.fullId]?.hientai || '';
                                    
                                    const truocData = parseBonusData(truoc, staff, marketFilter);
                                    const hientaiData = parseBonusData(hientai, staff, marketFilter);
                                    
                                    const valTruoc = truocData.tong !== null ? truocData.tong : 0;
                                    const valHientai = hientaiData.tong !== null ? hientaiData.tong : 0;
                                    const tongDiff = valHientai - valTruoc;

                                    return (
                                      <tr key={staff.fullId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-3 py-3 border-r border-slate-100 text-center">
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                                            {idx + 1}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3 border-r border-slate-100">
                                          <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                              <span className="text-[10px] font-black text-purple-600">
                                                {staff.displayName.split(' ').pop()?.charAt(0) || '?'}
                                              </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-800" title={staff.displayName}>{staff.displayName}</p>
                                          </div>
                                        </td>
                                        {BONUS_COLS.map((cat, idx) => {
                                          const valT = truocData.details[cat.index];
                                          const valH = hientaiData.details[cat.index];
                                          const diffVal = (valH || 0) - (valT || 0);
                                          return (
                                            <React.Fragment key={idx}>
                                              <td className="px-2 py-3 text-center border-r border-slate-100">
                                                {valT !== null ? (
                                                  <span className="text-[11px] font-semibold text-slate-600">
                                                    {valT.toLocaleString('vi-VN')}
                                                  </span>
                                                ) : (
                                                  <span className="text-[10px] text-slate-300 font-bold">—</span>
                                                )}
                                              </td>
                                              <td className="px-2 py-3 text-center border-r border-slate-100">
                                                {valH !== null ? (
                                                  <span className="text-[11px] font-bold text-indigo-600">
                                                    {valH.toLocaleString('vi-VN')}
                                                  </span>
                                                ) : (
                                                  <span className="text-[10px] text-slate-300 font-bold">—</span>
                                                )}
                                              </td>
                                              <td className="px-2 py-3 text-center border-r border-slate-100">
                                                {valT !== null || valH !== null ? (
                                                  <span className={cn(
                                                    "text-[11px] font-semibold",
                                                    diffVal > 0 ? "text-emerald-600" :
                                                    diffVal < 0 ? "text-rose-600" :
                                                    "text-slate-400"
                                                  )}>
                                                    {diffVal > 0 ? `+${diffVal.toLocaleString('vi-VN')}` : diffVal.toLocaleString('vi-VN')}
                                                  </span>
                                                ) : (
                                                  <span className="text-[10px] text-slate-300 font-bold">—</span>
                                                )}
                                              </td>
                                            </React.Fragment>
                                          );
                                        })}
                                        <td className="px-3 py-3 text-center">
                                          {truocData.tong !== null || hientaiData.tong !== null ? (
                                            <div className="flex items-center justify-center">
                                              {tongDiff > 0 ? (
                                                <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold uppercase">
                                                  <TrendingUp size={11} strokeWidth={2.5} /> Tăng
                                                </span>
                                              ) : tongDiff < 0 ? (
                                                <span className="inline-flex items-center gap-0.5 text-rose-600 text-[10px] font-bold uppercase">
                                                  <TrendingDown size={11} strokeWidth={2.5} /> Giảm
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-0.5 text-slate-500 text-[10px] font-bold uppercase">
                                                  <Check size={11} strokeWidth={2.5} /> Ổn định
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
                                <tfoot className="bg-[#1e293b] font-bold text-white text-[11px] border-t border-slate-700 select-none">
                                  <tr>
                                    <td colSpan={2} className="px-3 py-3.5 text-left uppercase tracking-wider border-r border-slate-700/50 text-white font-black">
                                      TỔNG CỘNG ĐANG HIỂN THỊ
                                    </td>
                                    {BONUS_COLS.map((cat, idx) => {
                                      const totalT = colTotalsT[cat.index];
                                      const totalH = colTotalsH[cat.index];
                                      const diffTotal = totalH - totalT;
                                      return (
                                        <React.Fragment key={idx}>
                                          <td className="px-2 py-3.5 text-center border-r border-slate-700/50">
                                            {hasAnyDataT ? (
                                              <span className="text-white font-bold">{totalT.toLocaleString('vi-VN')}</span>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </td>
                                          <td className="px-2 py-3.5 text-center border-r border-slate-700/50">
                                            {hasAnyDataH ? (
                                              <span className="text-white font-bold">{totalH.toLocaleString('vi-VN')}</span>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </td>
                                          <td className="px-2 py-3.5 text-center border-r border-slate-700/50">
                                            {hasAnyDataT || hasAnyDataH ? (
                                              <span className="text-white font-bold">
                                                {diffTotal > 0 ? `+${diffTotal.toLocaleString('vi-VN')}` : diffTotal.toLocaleString('vi-VN')}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </td>
                                        </React.Fragment>
                                      );
                                    })}
                                    <td className="px-3 py-3.5 text-center">
                                      {hasAnyDataT && hasAnyDataH ? (
                                        <div className="flex items-center justify-center">
                                          {colTotalsH[7] - colTotalsT[7] > 0 ? (
                                            <span className="text-white text-[9px] font-black uppercase">Tăng</span>
                                          ) : colTotalsH[7] - colTotalsT[7] < 0 ? (
                                            <span className="text-white text-[9px] font-black uppercase">Giảm</span>
                                          ) : (
                                            <span className="text-white text-[9px] font-black uppercase">Ổn định</span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>

                              {filteredBiData.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                  <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                                    <Gift size={28} className="text-slate-300" />
                                  </div>
                                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Chưa có nhân viên</h3>
                                  <p className="text-xs text-slate-300 font-medium mt-1">Chọn siêu thị và nhân viên để xem bảng thưởng</p>
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

              {activeTab === 'KHAI_THAC_NV' && (
                <motion.div
                  key="KHAI_THAC_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-4xl mx-auto w-full relative overflow-hidden"
                >
                  {renderLoadingOverlay()}
                  <div className="flex items-center justify-between mb-6 border-b-2 border-blue-400 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                        <Target size={24} />
                      </div>
                      <h2 className="text-xl font-black text-slate-500 uppercase tracking-tight">Khai Thác NV</h2>
                    </div>
                    <div className="p-2 bg-slate-50 text-blue-400 rounded-xl">
                      <Target size={24} />
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Target size={64} className="mb-4 text-blue-200" />
                    <p className="text-lg font-bold">Tính năng Khai Thác Nhân Viên đang được phát triển</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeHealth;
