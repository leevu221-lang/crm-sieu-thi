/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HeartPulse, Camera, TrendingUp, Search, ChevronDown, Check, MessageSquare, FileText, ChevronRight, LayoutGrid, Info, Users, Printer, UploadCloud, Trophy, TrendingDown, Gift, Target, RefreshCw } from 'lucide-react';
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

  // Sync stName and target fields when marketFilter or data changes (consistent with Lũy Kế page)
  useEffect(() => {
    if (marketFilter === 'ALL') return;
    const market = allowedMarkets.find((m: any) => m.name === marketFilter);
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
        // Employee lines usually have at least 10 columns and the first column starts with a 4-6 digit ID
        if (parts.length < 10) return false;
        return /^(\d{4,6})\s*-/.test(parts[0]);
      })
      .map(parts => ({
        nhanVien: parts[0],
        dtlk: parts[1],
        luotBill: parts[4],
        phanTramBill: parts[5], // Use 6th column (index 5)
        luotBillBanHang: parts[9], // 10th column (index 9)
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

  const saveThuongField = (staffId: string, field: 'truoc' | 'hientai', value: string) => {
    setThuongData(prev => {
      const updated = { ...prev, [staffId]: { ...prev[staffId], [field]: value } };
      saveThuongToDb(updated);
      return updated;
    });
  };

  const handleDistribute = (field: 'truoc' | 'hientai') => {
    const firstStaff = filteredBiData[0];
    if (!firstStaff) {
      showNotification('Không tìm thấy nhân viên nào để phân bổ!', 'error');
      return;
    }
    const sourceText = thuongData[firstStaff.fullId]?.[field] || '';
    if (!sourceText.trim()) {
      showNotification('Vui lòng dán dữ liệu vào ô nhân viên đầu tiên trước!', 'error');
      return;
    }

    const lines = sourceText.split('\n');
    
    // Clean store name for matching
    const currentStoreClean = marketFilter && marketFilter !== 'ALL' 
      ? removeAccents(marketFilter).replace(/^(dml|dms3|dms|dmm|tgd|aar|bhx)\s+/, '').trim()
      : '';

    // Helper to check if a line is a supermarket header
    const getStoreHeader = (line: string): string | null => {
      const cleanLine = removeAccents(line).trim();
      const hasStoreKeyword = cleanLine.includes('sieu thi') || 
                              cleanLine.includes('cua hang') ||
                              cleanLine.includes('dien may xanh') ||
                              cleanLine.includes('the gioi di dong') ||
                              /^(dml|dms3|dms|dmm|tgd|aar|bhx)\b/.test(cleanLine);
      return hasStoreKeyword ? cleanLine : null;
    };

    // Find the header line in the source text if it exists
    let headerLine = '';
    for (const line of lines) {
      const parts = line.split(/\t|\s{2,}/).map(p => p.trim());
      const hasThucLanh = parts.some(p => {
        const clean = removeAccents(p);
        return clean.includes('diem thuc lanh') || 
               clean.includes('thuc lanh') ||
               clean.includes('thuc nhan') ||
               clean.includes('thuc linh') ||
               clean.includes('thuc tra');
      });
      if (hasThucLanh) {
        headerLine = line;
        break;
      }
    }

    const updated = { ...thuongData };
    let count = 0;
    const hasAnyHeader = lines.some(l => getStoreHeader(l) !== null);

    filteredBiData.forEach(staff => {
      const staffId = staff.fullId;
      const staffNameClean = removeAccents(staff.displayName.split('-').pop() || '').trim();
      let staffLines: string[] = [];
      let found = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cleanLine = removeAccents(line);

        const matchStaff = cleanLine.includes(staffId) || (staffNameClean && cleanLine.includes(staffNameClean));
        if (matchStaff) {
          // Look upwards for nearest store header
          let nearestStoreHeader: string | null = null;
          for (let k = i - 1; k >= 0; k--) {
            const header = getStoreHeader(lines[k]);
            if (header) {
              nearestStoreHeader = header;
              break;
            }
          }

          // Check store compatibility
          let storeCompatible = true;
          if (currentStoreClean) {
            if (hasAnyHeader) {
              if (nearestStoreHeader) {
                storeCompatible = nearestStoreHeader.includes(currentStoreClean);
              } else {
                storeCompatible = false;
              }
            }
          }

          if (storeCompatible) {
            found = true;
            staffLines = [line];
            
            for (let j = i + 1; j < lines.length; j++) {
              const subLine = lines[j];

              if (getStoreHeader(subLine) !== null) {
                break;
              }

              staffLines.push(subLine);
              const subParts = subLine.split(/\t|\s{2,}/).map(p => p.trim());
              const hasTotalLabel = subParts.some(part => {
                const clean = removeAccents(part);
                return clean === 'tong cong' ||
                       clean === 'tong' ||
                       clean.startsWith('tong cong') ||
                       clean.startsWith('tong ') ||
                       clean.startsWith('tong:') ||
                       clean.includes('tong cong') ||
                       clean.includes('tong');
              });
              if (hasTotalLabel) {
                break;
              }
            }
            break;
          }
        }
      }

      if (found && staffLines.length > 0) {
        // Prepend header if not already present
        if (headerLine && staffLines[0] !== headerLine) {
          staffLines.unshift(headerLine);
        }
        updated[staffId] = {
          ...updated[staffId],
          [field]: staffLines.join('\n')
        };
        count++;
      }
    });

    if (count > 0) {
      setThuongData(updated);
      saveThuongToDb(updated);
      showNotification(`Đã phân bổ dữ liệu thành công cho ${count} nhân viên!`, 'success');
    } else {
      showNotification('Không tìm thấy dữ liệu khớp với mã nhân viên nào trong danh sách!', 'error');
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
    if (initializedRef.current !== storeKey || !hasValidSelection) {
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

  // Load thuong data from DB when store changes or tab switches to THUONG_NV
  useEffect(() => {
    if (activeTab !== 'THUONG_NV' || marketFilter === 'ALL' || !maKho) return;
    const shortMaKho = maKho.replace(/^0+/, '');
    
    supabase.from('store')
      .select('thuong_nv_data')
      .eq('id', marketFilter.trim())
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data || !data.thuong_nv_data) {
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
      });
  }, [activeTab, marketFilter, maKho]);

  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
                            onClick={() => setSelectedStaffIds(biRevenueData.map(s => s.fullId))}
                            className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Chọn tất cả
                          </button>
                          <button
                            onClick={() => setSelectedStaffIds([])}
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
                                  <tr className="text-white font-utm-avo font-black text-[14px] uppercase tracking-wider h-[40px]">
                                    <th className="bg-[#00965e] px-2 py-0 text-center border-r border-white/10 h-[30px]">STT</th>
                                    {visibleIndices.map((idx, i) => {
                                      // Map color regions like the image
                                      let bgColor = 'bg-[#00965e]'; // First group (Emerald)
                                      if (i >= 2) bgColor = 'bg-[#ffcb05]'; // Middle group (Amber)

                                      const headerText = allHeaders[idx].trim().toUpperCase();
                                      let widthClasses = ''; // Flexible width

                                      return (
                                        <th key={idx} className={`${bgColor} ${widthClasses} px-2 py-0 text-center border-r border-white/10 whitespace-normal break-words leading-tight text-[12px] h-[30px]`}>
                                          {allHeaders[idx]}
                                        </th>
                                      );
                                    })}
                                    <th className="bg-[#f58220] px-2 py-0 text-center border-r border-white/10 last:border-r-0 whitespace-nowrap text-[12px] h-[30px]">
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
                                      <tr key={rowIdx} className={`${isStriped ? 'bg-[#f8faff]' : 'bg-white'} hover:bg-slate-50 transition-colors h-[30px]`}>
                                        <td className="px-2 py-0 text-center font-black text-slate-800 text-[13px] font-oswald border-r border-slate-100 h-[30px]">{rowIdx + 1}</td>
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

                                          return (
                                            <td key={idx} className={`px-2 py-0 text-center text-[13px] font-utm-avo font-bold ${textColor} border-r border-slate-100 whitespace-nowrap h-[40px]`}>
                                              <div className="flex items-center justify-center gap-1 h-full px-2">
                                                {isStaffName && <ChevronRight size={14} className="flex-shrink-0" />}
                                                {isPercentage ? (
                                                  <span className={`px-1.5 py-0.5 rounded ${parseFloat(value) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {value}
                                                  </span>
                                                ) : (
                                                  <span>{value}</span>
                                                )}
                                              </div>
                                            </td>
                                          );
                                        })}
                                        <td className={`px-1 py-0 text-center text-[13px] font-bold font-oswald border-r border-slate-100 last:border-r-0 whitespace-nowrap h-[30px]`}>
                                          <div className="flex items-center justify-center gap-1 h-full">
                                            {isTopOne && (
                                              <div className="flex items-center gap-1 text-[#2563eb]">
                                                <Trophy size={14} className="flex-shrink-0" />
                                                <span className="text-[11px]">TOP</span>
                                              </div>
                                            )}
                                            {isBottomOne && (
                                              <div className="flex items-center gap-1 text-[#e11d48]">
                                                <TrendingDown size={14} className="flex-shrink-0" />
                                                <span className="text-[11px]">BOT</span>
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
                                  <tr className="font-black text-slate-800 uppercase text-[12pt]">
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
                                      <td style={{ width: '70px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300">{row.dtlk ? Math.round(parseFloat(row.dtlk.toString().replace(/,/g, '')) || 0).toLocaleString('vi-VN') : '0'}</td>
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
                            onClick={() => handleDistribute('truoc')}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                            title="Cập nhật dữ liệu cho các nhân viên bên dưới từ ô nhân viên đầu tiên phía trên"
                          >
                            <RefreshCw size={10} className="text-slate-500" />
                            Cập nhật từ ô NV phía trên
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
                            onClick={() => handleDistribute('hientai')}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 hover:text-purple-900 border border-purple-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                            title="Cập nhật dữ liệu cho các nhân viên bên dưới từ ô nhân viên đầu tiên phía trên"
                          >
                            <RefreshCw size={10} className="text-purple-500" />
                            Cập nhật từ ô NV phía trên
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
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT PANEL - Bonus Summary Table */}
                    <div className="bg-white rounded-[24px] shadow-lg border border-slate-200/80 overflow-hidden">
                      {/* Table Header */}
                      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Gift size={18} className="text-white" />
                            </div>
                            <div>
                              <h2 className="text-base font-black text-white uppercase tracking-tight">Bảng thưởng nhân viên</h2>
                              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{marketFilter !== 'ALL' ? marketFilter : 'Tất cả siêu thị'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm">
                              <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">{filteredBiData.length} NV</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Table Content */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                              <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left w-10">STT</th>
                              <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Nhân viên</th>
                              <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-l border-slate-200">Thưởng T.Trước</th>
                              <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-l border-slate-200">Thưởng Hiện tại</th>
                              <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-l border-slate-200">Xu hướng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredBiData.map((staff, idx) => {
                              const truoc = thuongData[staff.fullId]?.truoc || '';
                              const hientai = thuongData[staff.fullId]?.hientai || '';
                              
                              // Parse: dòng "Tổng cộng" → cột "Điểm thực lãnh" (hoặc các tên tương đương)
                              // Chỉ lấy dữ liệu hiển thị trực tiếp, CẤM lấy từ nguồn DB khác
                              const parseBonusData = (text: string) => {
                                if (!text || text.trim().length === 0) return { tong: null };
                                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                                
                                // Clean store name for matching
                                const currentStoreClean = marketFilter && marketFilter !== 'ALL' 
                                  ? removeAccents(marketFilter).replace(/^(dml|dms3|dms|dmm|tgd|aar|bhx)\s+/, '').trim()
                                  : '';

                                // Get employee ID and clean name
                                const staffId = staff.fullId;
                                const staffNameClean = removeAccents(staff.displayName.split('-').pop() || '').trim();

                                // Helper to check if a line is a supermarket header
                                const getStoreHeader = (line: string): string | null => {
                                  const cleanLine = removeAccents(line).trim();
                                  const hasStoreKeyword = cleanLine.includes('sieu thi') || 
                                                          cleanLine.includes('cua hang') ||
                                                          cleanLine.includes('dien may xanh') ||
                                                          cleanLine.includes('the gioi di dong') ||
                                                          /^(dml|dms3|dms|dmm|tgd|aar|bhx)\b/.test(cleanLine);
                                  return hasStoreKeyword ? cleanLine : null;
                                };

                                // Step 1: Find column index of "Điểm thực lãnh" or equivalents in headers
                                let thucLanhColIdx = -1;
                                let headerColCount = -1;
                                for (const line of lines) {
                                  const parts = line.split(/\t|\s{2,}/).map(p => p.trim());
                                  const idx = parts.findIndex(p => {
                                    const clean = removeAccents(p);
                                    return clean.includes('diem thuc lanh') || 
                                           clean.includes('thuc lanh') ||
                                           clean.includes('thuc nhan') ||
                                           clean.includes('thuc linh') ||
                                           clean.includes('thuc tra');
                                  });
                                  if (idx !== -1) {
                                    thucLanhColIdx = idx;
                                    headerColCount = parts.length;
                                    break;
                                  }
                                }

                                // Step 2: Find the correct section of lines
                                let foundStaff = false;
                                let targetLines: string[] = [];
                                const hasAnyHeader = lines.some(l => getStoreHeader(l) !== null);

                                for (let i = 0; i < lines.length; i++) {
                                  const line = lines[i];
                                  const cleanLine = removeAccents(line);

                                  const matchStaff = cleanLine.includes(staffId) || (staffNameClean && cleanLine.includes(staffNameClean));
                                  if (matchStaff) {
                                    // Look upwards for nearest store header
                                    let nearestStoreHeader: string | null = null;
                                    for (let k = i - 1; k >= 0; k--) {
                                      const header = getStoreHeader(lines[k]);
                                      if (header) {
                                        nearestStoreHeader = header;
                                        break;
                                      }
                                    }

                                    // Check store compatibility
                                    let storeCompatible = true;
                                    if (currentStoreClean) {
                                      if (hasAnyHeader) {
                                        if (nearestStoreHeader) {
                                          storeCompatible = nearestStoreHeader.includes(currentStoreClean);
                                        } else {
                                          storeCompatible = false;
                                        }
                                      }
                                    }

                                    if (storeCompatible) {
                                      foundStaff = true;
                                      targetLines = [line];
                                      for (let j = i + 1; j < lines.length; j++) {
                                        const subLine = lines[j];
                                        
                                        if (getStoreHeader(subLine) !== null) {
                                          break;
                                        }

                                        targetLines.push(subLine);

                                        const subParts = subLine.split(/\t|\s{2,}/).map(p => p.trim());
                                        const hasTotalLabel = subParts.some(part => {
                                          const clean = removeAccents(part);
                                          return clean === 'tong cong' || 
                                                 clean === 'tong' || 
                                                 clean.startsWith('tong cong') || 
                                                 clean.startsWith('tong ') || 
                                                 clean.startsWith('tong:') ||
                                                 clean.includes('tong cong') || 
                                                 clean.includes('tong');
                                        });

                                        if (hasTotalLabel) {
                                          break;
                                        }
                                      }
                                      break;
                                    }
                                  }
                                }

                                const linesToParse = foundStaff ? targetLines : lines;

                                let foundRow = false;
                                let tong = 0;
                                for (const line of linesToParse) {
                                  const parts = line.split(/\t|\s{2,}/).map(p => p.trim());
                                  
                                  // Kiểm tra xem dòng này có phải là dòng Tổng cộng/Tổng công hay không
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
                                    let targetIdx = -1;
                                    
                                    if (thucLanhColIdx !== -1 && headerColCount !== -1) {
                                      if (parts.length === headerColCount) {
                                        targetIdx = thucLanhColIdx;
                                      } else {
                                        // Right-aligned column mapping for merged cells in the total row
                                        const distFromRight = headerColCount - 1 - thucLanhColIdx;
                                        const mappedIdx = parts.length - 1 - distFromRight;
                                        if (mappedIdx >= 0 && mappedIdx < parts.length) {
                                          targetIdx = mappedIdx;
                                        }
                                      }
                                    }
                                    
                                    if (targetIdx !== -1) {
                                      const raw = parts[targetIdx];
                                      const clean = raw.replace(/[^\d-]/g, '');
                                      const num = parseInt(clean, 10);
                                      tong = isNaN(num) ? 0 : num;
                                    } else {
                                      // Fallback: Thử lấy giá trị số cuối cùng của dòng này
                                      let foundNum = false;
                                      for (let i = parts.length - 1; i >= 0; i--) {
                                        const raw = parts[i];
                                        const clean = raw.replace(/[^\d-]/g, '');
                                        const n = parseInt(clean, 10);
                                        if (!isNaN(n) && n > 0) { 
                                          tong = n; 
                                          foundNum = true;
                                          break; 
                                        }
                                      }
                                      if (!foundNum) {
                                        tong = 0;
                                      }
                                    }
                                    break;
                                  }
                                }
                                return { tong: foundRow ? tong : null };
                              };
                              
                              const truocData = parseBonusData(truoc);
                              const hientaiData = parseBonusData(hientai);
                              
                              const valTruoc = truocData.tong !== null ? truocData.tong : 0;
                              const valHientai = hientaiData.tong !== null ? hientaiData.tong : 0;
                              const tongDiff = valHientai - valTruoc;
 
                              return (
                                <tr key={staff.fullId} className="hover:bg-purple-50/30 transition-colors">
                                  <td className="px-3 py-3">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] font-black text-purple-600">
                                          {staff.displayName.split(' ').pop()?.charAt(0) || '?'}
                                        </span>
                                      </div>
                                      <p className="text-[11px] font-bold text-slate-800 truncate max-w-[180px]">{staff.displayName}</p>
                                    </div>
                                  </td>
                                  {/* Thưởng T.Trước */}
                                  <td className="px-3 py-3 text-center border-l border-slate-100">
                                    {truocData.tong !== null ? (
                                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-700">{truocData.tong.toLocaleString('vi-VN')}</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-300 font-bold">—</span>
                                    )}
                                  </td>
                                  {/* Thưởng Hiện tại */}
                                  <td className="px-3 py-3 text-center border-l border-slate-100">
                                    {hientaiData.tong !== null ? (
                                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-purple-100 text-xs font-bold text-purple-700">{hientaiData.tong.toLocaleString('vi-VN')}</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-300 font-bold">—</span>
                                    )}
                                  </td>
                                  {/* Xu hướng */}
                                  <td className="px-3 py-3 text-center border-l border-slate-100">
                                    {truocData.tong !== null || hientaiData.tong !== null ? (
                                      <div className="flex items-center justify-center">
                                        {tongDiff > 0 ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase">
                                            <TrendingUp size={11} strokeWidth={3} /> Tăng
                                          </span>
                                        ) : tongDiff < 0 ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-[9px] font-black uppercase">
                                            <TrendingDown size={11} strokeWidth={3} /> Giảm
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[9px] font-black uppercase">
                                            <Check size={11} strokeWidth={3} /> Ổn định
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-50 text-slate-400 text-[9px] font-black uppercase">
                                        Chưa có DL
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
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
