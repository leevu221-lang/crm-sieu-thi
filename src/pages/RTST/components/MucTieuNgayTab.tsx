/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Filter, 
  Check, 
  RotateCcw, 
  Search, 
  X, 
  Edit3, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Store,
  Layers,
  ChevronDown,
  ChevronUp,
  Save,
  CheckSquare,
  Square,
  Info,
  MessageSquare,
  Copy,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useNotification } from '../../../contexts/NotificationContext';
import { normalize, normalizeStoreId } from '../utils';

interface MucTieuNgayTabProps {
  marketFilter: string;
  filteredMarkets: any[];
  processedData: any;
  filteredCategories: any[];
  lastUpdated: Date | null;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, name: string) => void;
  userProfile?: any;
}

// Fallback standard DT category template if no categories are uploaded yet
const DEFAULT_DT_CATEGORIES = [
  { name: 'ĐIỆN THOẠI', type: 'DT', defaultTarget: 12 },
  { name: 'MÁY TÍNH BẢNG', type: 'DT', defaultTarget: 5 },
  { name: 'LAPTOP', type: 'DT', defaultTarget: 6 },
  { name: 'PHỤ KIỆN', type: 'DT', defaultTarget: 8 },
  { name: 'ĐỒNG HỒ', type: 'DT', defaultTarget: 2 },
  { name: 'BẢO HIỂM', type: 'DT', defaultTarget: 11 },
  { name: 'TIVI', type: 'DT', defaultTarget: 30 },
  { name: 'TỦ LẠNH', type: 'DT', defaultTarget: 30 },
  { name: 'MÁY LẠNH', type: 'DT', defaultTarget: 10 },
  { name: 'MÁY GIẶT', type: 'DT', defaultTarget: 10 },
  { name: 'GIA DỤNG', type: 'DT', defaultTarget: 50 },
];

export const MucTieuNgayTab: React.FC<MucTieuNgayTabProps> = ({
  marketFilter,
  filteredMarkets,
  processedData,
  filteredCategories,
  lastUpdated,
  captureElement,
  userProfile
}) => {
  const { showNotification } = useNotification();
  const captureRef = useRef<HTMLDivElement | null>(null);

  // Active store resolution
  const activeDeclared = filteredMarkets.find(m => marketFilter === 'ALL' || m.name === marketFilter) || filteredMarkets[0];
  const parsedMarket = activeDeclared ? (processedData.markets.find((pm: any) =>
    normalize(pm.name).includes(normalize(activeDeclared.name)) ||
    normalize(activeDeclared.name).includes(normalize(pm.name))
  ) || {
    name: activeDeclared.name,
    targetQD: 0,
    actualVirtual: 0,
    actualReal: 0,
    percentHT: 0,
    installmentRate: 0,
  }) : {
    name: 'Siêu Thị',
    targetQD: 0,
    actualVirtual: 0,
    actualReal: 0,
    percentHT: 0,
    installmentRate: 0,
  };

  const currentStoreName = activeDeclared?.name || parsedMarket?.name || 'SIÊU THỊ';
  const storeNormalizedKey = normalizeStoreId(currentStoreName);

  // State: Target Values for Table 1 (Overview KPIs)
  const [overviewTargets, setOverviewTargets] = useState<{
    dtThuc: number;
    dtQd: number;
    effQd: number;
    traCham: number;
  }>(() => {
    const saved = localStorage.getItem(`DAILY_OVERVIEW_TARGETS_${storeNormalizedKey}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { dtThuc: 200, dtQd: 300, effQd: 35.0, traCham: 50.0 };
  });

  // State: Target Values for Table 2 (Categories keyed by category name)
  const [categoryTargets, setCategoryTargets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`DAILY_CAT_TARGETS_${storeNormalizedKey}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const init: Record<string, number> = {};
    DEFAULT_DT_CATEGORIES.forEach(c => {
      init[c.name.toUpperCase()] = c.defaultTarget;
    });
    return init;
  });

  // State: Selected Category Keys (Multi-select filter)
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem(`DAILY_CAT_SELECTED_${storeNormalizedKey}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return []; // Empty means show all by default
  });

  // State: Filter Dialog Modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');

  // State: Nhận xét Modal
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedCommentTemplate, setSelectedCommentTemplate] = useState<number>(0);
  const [customCommentText, setCustomCommentText] = useState<string>('');
  const [copiedComment, setCopiedComment] = useState(false);

  // State: Inline Screenshot Comment Box
  const [showInlineComment, setShowInlineComment] = useState(false);
  const [inlineComment, setInlineComment] = useState('');

  // Refs to avoid unnecessary updates and flickering
  const isEditingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize with Firebase Firestore
  useEffect(() => {
    try {
      const docRef = doc(db, 'app_settings', `daily_targets_${storeNormalizedKey}`);
      const unsub = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && !isEditingRef.current) {
            if (data.overviewTargets) {
              setOverviewTargets(prev => JSON.stringify(prev) !== JSON.stringify(data.overviewTargets) ? data.overviewTargets : prev);
            }
            if (data.categoryTargets) {
              setCategoryTargets(prev => JSON.stringify(prev) !== JSON.stringify(data.categoryTargets) ? data.categoryTargets : prev);
            }
            if (data.selectedCategoryKeys) {
              setSelectedCategoryKeys(prev => JSON.stringify(prev) !== JSON.stringify(data.selectedCategoryKeys) ? data.selectedCategoryKeys : prev);
            }
          }
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('Firestore onSnapshot listener for daily targets error:', err);
    }
  }, [storeNormalizedKey]);

  // Debounced Save to LocalStorage and Firestore
  const saveTargetsDebounced = useCallback((
    newOverview: typeof overviewTargets,
    newCatTargets: typeof categoryTargets,
    newSelectedKeys: string[]
  ) => {
    isEditingRef.current = true;
    localStorage.setItem(`DAILY_OVERVIEW_TARGETS_${storeNormalizedKey}`, JSON.stringify(newOverview));
    localStorage.setItem(`DAILY_CAT_TARGETS_${storeNormalizedKey}`, JSON.stringify(newCatTargets));
    localStorage.setItem(`DAILY_CAT_SELECTED_${storeNormalizedKey}`, JSON.stringify(newSelectedKeys));

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'app_settings', `daily_targets_${storeNormalizedKey}`);
        await setDoc(docRef, {
          storeName: currentStoreName,
          overviewTargets: newOverview,
          categoryTargets: newCatTargets,
          selectedCategoryKeys: newSelectedKeys,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to save daily targets:', err);
      } finally {
        setTimeout(() => { isEditingRef.current = false; }, 1000);
      }
    }, 800);
  }, [storeNormalizedKey, currentStoreName]);

  const handleOverviewTargetChange = (field: keyof typeof overviewTargets, value: number) => {
    const next = { ...overviewTargets, [field]: value };
    setOverviewTargets(next);
    saveTargetsDebounced(next, categoryTargets, selectedCategoryKeys);
  };

  const handleCategoryTargetChange = (catKey: string, value: number) => {
    const next = { ...categoryTargets, [catKey.toUpperCase()]: value };
    setCategoryTargets(next);
    saveTargetsDebounced(overviewTargets, next, selectedCategoryKeys);
  };

  // Realtime values for Table 1
  const dtlk = (parsedMarket as any).actualReal || 0;
  const dtqd = parsedMarket.actualVirtual || 0;
  const actualEff = dtlk > 0 ? (((dtqd - dtlk) / dtlk) * 100) : 0;
  const actualInstallment = parsedMarket.installmentRate || 0;

  const dtThucRate = overviewTargets.dtThuc > 0 ? (dtlk / overviewTargets.dtThuc) * 100 : 0;
  const dtQdRate = overviewTargets.dtQd > 0 ? (dtqd / overviewTargets.dtQd) * 100 : 0;
  const diffEff = actualEff - overviewTargets.effQd;
  const diffInstallment = actualInstallment - overviewTargets.traCham;

  const dtThucRemaining = overviewTargets.dtThuc - dtlk;
  const dtQdRemaining = overviewTargets.dtQd - dtqd;

  // ── Build Category List Synchronized 100% with Tab "TỔNG QUAN" (Both DT and SL categories) ──
  const allAvailableCategoryList = useMemo(() => {
    if (filteredCategories && filteredCategories.length > 0) {
      return filteredCategories.map(cat => ({
        key: `${cat.name.toUpperCase()}__${cat.type || 'DT'}`,
        name: cat.name.toUpperCase(),
        type: cat.type || 'DT',
        realtimeRevenue: cat.revenue || cat.actual || 0,
        defaultTarget: cat.target || 0,
        rate: cat.rate || 0,
      }));
    }

    return DEFAULT_DT_CATEGORIES.map(c => ({
      key: `${c.name.toUpperCase()}__${c.type}`,
      name: c.name.toUpperCase(),
      type: c.type,
      realtimeRevenue: 0,
      defaultTarget: c.defaultTarget,
      rate: 0,
    }));
  }, [filteredCategories]);

  // Selected Count (Safe calculation)
  const selectedCount = useMemo(() => {
    if (selectedCategoryKeys.length === 0) return allAvailableCategoryList.length;
    if (selectedCategoryKeys.includes('__NONE__')) return 0;
    return allAvailableCategoryList.filter(c => selectedCategoryKeys.includes(c.key)).length;
  }, [allAvailableCategoryList, selectedCategoryKeys]);

  // Filtered list to display based on selectedCategoryKeys
  const displayedCategoryList = useMemo(() => {
    if (selectedCategoryKeys.length === 0) {
      return allAvailableCategoryList; // Show all by default
    }
    if (selectedCategoryKeys.includes('__NONE__')) return [];
    return allAvailableCategoryList.filter(r => selectedCategoryKeys.includes(r.key));
  }, [allAvailableCategoryList, selectedCategoryKeys]);

  // Date and Time string
  const now = lastUpdated || new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // ── Comment Templates Generator ──
  const commentTemplates = useMemo(() => {
    const doneCats = displayedCategoryList.filter(c => {
      const t = categoryTargets[c.name] !== undefined ? categoryTargets[c.name] : (c.defaultTarget || 0);
      return t > 0 && c.realtimeRevenue >= t;
    });

    const pendingCats = displayedCategoryList.filter(c => {
      const t = categoryTargets[c.name] !== undefined ? categoryTargets[c.name] : (c.defaultTarget || 0);
      return t > 0 && c.realtimeRevenue < t;
    }).sort((a, b) => {
      const targetA = categoryTargets[a.name] !== undefined ? categoryTargets[a.name] : (a.defaultTarget || 0);
      const targetB = categoryTargets[b.name] !== undefined ? categoryTargets[b.name] : (b.defaultTarget || 0);
      return (targetB - b.realtimeRevenue) - (targetA - a.realtimeRevenue);
    });

    // Template 1: Toàn diện
    let t1 = `🎯 BÁO CÁO TIẾN ĐỘ & MỤC TIÊU NGÀY REALTIME\n`;
    t1 += `🏢 Siêu thị: ${currentStoreName}\n`;
    t1 += `⏰ Cập nhật: ${timeStr} ${dateStr}\n\n`;
    t1 += `📊 TIÊU CHÍ CHÍNH:\n`;
    t1 += `• DT Thực: ${Math.round(dtlk).toLocaleString()} / ${overviewTargets.dtThuc} (${dtThucRate.toFixed(1)}%) - C.Lại: ${dtThucRemaining > 0 ? Math.round(dtThucRemaining).toLocaleString() : '0'}\n`;
    t1 += `• DT Quy Đổi: ${Math.round(dtqd).toLocaleString()} / ${overviewTargets.dtQd} (${dtQdRate.toFixed(1)}%) - C.Lại: ${dtQdRemaining > 0 ? Math.round(dtQdRemaining).toLocaleString() : '0'}\n`;
    t1 += `• Hiệu Quả QĐ: ${actualEff.toFixed(1)}% / ${overviewTargets.effQd}% (${diffEff >= 0 ? '+' : ''}${diffEff.toFixed(1)}%)\n`;
    t1 += `• Trả Chậm: ${actualInstallment.toFixed(1)}% / ${overviewTargets.traCham}% (${diffInstallment >= 0 ? '+' : ''}${diffInstallment.toFixed(1)}%)\n\n`;
    
    t1 += `✅ ĐÃ ĐẠT TARGET (${doneCats.length}/${displayedCategoryList.length}):\n`;
    if (doneCats.length > 0) {
      doneCats.forEach(c => {
        const t = categoryTargets[c.name] !== undefined ? categoryTargets[c.name] : (c.defaultTarget || 0);
        const rate = (c.realtimeRevenue / t) * 100;
        t1 += `  + ${c.name} (${c.type}): ${c.realtimeRevenue} / ${t} (${rate.toFixed(1)}%)\n`;
      });
    } else {
      t1 += `  (Chưa có ngành hàng đạt)\n`;
    }

    t1 += `\n🔥 CẦN BỨT PHÁ HOÀN THÀNH:\n`;
    if (pendingCats.length > 0) {
      pendingCats.forEach(c => {
        const t = categoryTargets[c.name] !== undefined ? categoryTargets[c.name] : (c.defaultTarget || 0);
        const remain = t - c.realtimeRevenue;
        const rate = (c.realtimeRevenue / t) * 100;
        t1 += `  - ${c.name} (${c.type}): ${c.realtimeRevenue} / ${t} (${rate.toFixed(1)}%) - Còn lại: ${Math.round(remain * 10) / 10}\n`;
      });
    }

    // Template 2: Rút gọn Zalo
    let t2 = `⚡ FLASH UPDATE MỤC TIÊU NGÀY - ${currentStoreName}\n`;
    t2 += `⏰ ${timeStr} ${dateStr}\n`;
    t2 += `🎯 DT Thực: ${Math.round(dtlk).toLocaleString()} (${dtThucRate.toFixed(1)}%) | DT QĐ: ${Math.round(dtqd).toLocaleString()} (${dtQdRate.toFixed(1)}%)\n`;
    t2 += `📈 Hiệu quả QĐ: ${actualEff.toFixed(1)}% | Trả chậm: ${actualInstallment.toFixed(1)}%\n`;
    t2 += `🏆 Đạt Target: ${doneCats.length}/${displayedCategoryList.length} ngành hàng\n`;
    if (pendingCats.length > 0) {
      t2 += `🚨 Top cần dí số: ${pendingCats.slice(0, 3).map(c => `${c.name} (còn ${Math.round(((categoryTargets[c.name] || c.defaultTarget || 0) - c.realtimeRevenue) * 10) / 10})`).join(', ')}\n`;
    }
    t2 += `💪 Cả nhà cùng bứt phá hoàn thành 100% mục tiêu ngày hôm nay nhé!`;

    return [
      { id: 0, title: 'Báo cáo chi tiết', icon: '📊', text: t1 },
      { id: 1, title: 'Tóm tắt gửi Zalo', icon: '⚡', text: t2 },
    ];
  }, [currentStoreName, timeStr, dateStr, dtlk, overviewTargets, dtThucRate, dtThucRemaining, dtqd, dtQdRate, dtQdRemaining, actualEff, diffEff, actualInstallment, diffInstallment, displayedCategoryList, categoryTargets]);

  const openCommentModal = () => {
    setSelectedCommentTemplate(0);
    setCustomCommentText(commentTemplates[0].text);
    setIsCommentModalOpen(true);
    setCopiedComment(false);
  };

  const handleCopyComment = () => {
    navigator.clipboard.writeText(customCommentText).then(() => {
      setCopiedComment(true);
      showNotification('Đã sao chép nhận xét vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopiedComment(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar (Hidden on export) ── */}
      <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 no-capture">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Store size={20} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-850 uppercase tracking-tight">
              MỤC TIÊU NGÀY - REALTIME
            </h3>
            <p className="text-[11px] font-bold text-slate-400">
              {currentStoreName} | Realtime: {timeStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Category Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer border border-slate-200"
            title="Lọc danh sách ngành hàng hiển thị"
          >
            <Filter size={14} className="text-emerald-600" />
            <span>LỌC NGÀNH HÀNG ({selectedCount}/{allAvailableCategoryList.length})</span>
          </button>

          {/* Reset Targets Button */}
          <button
            onClick={() => {
              if (!confirm('Khôi phục toàn bộ Mục tiêu về giá trị mặc định theo mẫu?')) return;
              const defaultOverview = { dtThuc: 200, dtQd: 300, effQd: 35.0, traCham: 50.0 };
              const defaultCat: Record<string, number> = {};
              DEFAULT_DT_CATEGORIES.forEach(c => {
                defaultCat[c.name.toUpperCase()] = c.defaultTarget;
              });
              setOverviewTargets(defaultOverview);
              setCategoryTargets(defaultCat);
              setSelectedCategoryKeys([]);
              saveTargetsDebounced(defaultOverview, defaultCat, []);
              showNotification('Đã khôi phục mục tiêu mặc định thành công!', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 cursor-pointer"
            title="Khôi phục mặc định"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">MẶC ĐỊNH</span>
          </button>

          {/* NHẬN XÉT Button */}
          <button
            onClick={openCommentModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white shadow-md shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer border border-indigo-400/30"
            title="Xem và sao chép nhận xét mục tiêu ngày"
          >
            <MessageSquare size={14} />
            <span>NHẬN XÉT</span>
          </button>

          {/* Capture Image Button */}
          <button
            onClick={() => captureElement(captureRef, 'MucTieuNgay_Realtime')}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] hover:from-[#036348] hover:to-[#059669] text-white shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
            title="Chụp ảnh xuất báo cáo Mục Tiêu Ngày"
          >
            <Camera size={15} />
            <span>CHỤP ẢNH BÁO CÁO</span>
          </button>
        </div>
      </div>

      {/* ── Instruction Hint Banner (Hidden on export) ── */}
      <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-3 px-4 flex items-center justify-between gap-2.5 text-emerald-950 text-[12px] sm:text-[13px] font-bold shadow-2xs no-capture">
        <div className="flex items-center gap-2.5">
          <span className="text-base shrink-0">💡</span>
          <div className="leading-snug">
            <strong className="text-emerald-900 font-black uppercase">Hướng dẫn:</strong> Cột <strong className="text-emerald-800 uppercase underline decoration-emerald-500 underline-offset-2 font-black">"MỤC TIÊU"</strong> được nhập thủ công trực tiếp trên bảng và hệ thống sẽ tự động lưu riêng theo từng siêu thị.
          </div>
        </div>
        <button
          onClick={() => setShowInlineComment(prev => !prev)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer shrink-0 ${
            showInlineComment ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
          }`}
        >
          {showInlineComment ? 'Ẩn nhận xét trên ảnh' : '+ Thêm nhận xét vào ảnh'}
        </button>
      </div>

      {/* ── Main Report Export Container (Emerald Green Theme) ── */}
      <div 
        ref={captureRef}
        className="bg-white rounded-3xl border border-emerald-200/90 p-4 sm:p-5 shadow-sm space-y-3.5 w-full max-w-[760px] mx-auto box-border"
        style={{ fontFamily: "'UTM Avo', sans-serif", width: '100%', maxWidth: '760px' }}
      >
        {/* Top Header Card (Tone Xanh Lá) */}
        <div className="rounded-2xl border border-emerald-300 overflow-hidden text-center divide-y divide-emerald-200 bg-[#ECFDF5] w-full" style={{ width: '100%' }}>
          {/* Row 1: TÊN CỤM BASE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200 bg-emerald-100/70">
            <div className="p-2.5 sm:p-3 text-[13px] sm:text-[14px] font-black uppercase text-emerald-950 flex items-center justify-center sm:justify-start px-4">
              TÊN CỤM BASE :
            </div>
            <div className="sm:col-span-2 p-2.5 sm:p-3 text-[13px] sm:text-[14.5px] font-black uppercase text-emerald-900 flex items-center justify-center sm:justify-start px-4 truncate">
              {currentStoreName}
            </div>
          </div>

          {/* Row 2: BÁO CÁO DOANH THU REALTIME Banner */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#047857] via-[#059669] to-[#047857] text-white flex flex-col items-center justify-center shadow-inner">
            <h1 className="text-[21px] sm:text-[25px] font-black text-[#FEF08A] uppercase tracking-wider drop-shadow-sm leading-tight">
              BÁO CÁO DOANH THU REALTIME
            </h1>
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-emerald-100/90 mt-0.5">
              THEO DÕI TIẾN ĐỘ VÀ MỤC TIÊU NGÀY
            </span>
          </div>

          {/* Row 3: REALTIME ĐẾN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200 bg-emerald-50">
            <div className="p-2.5 text-[12px] sm:text-[13px] font-black uppercase text-emerald-950 flex items-center justify-center sm:justify-start px-4">
              REALTIME ĐẾN :
            </div>
            <div className="sm:col-span-2 p-2.5 text-[12.5px] sm:text-[13.5px] font-black uppercase text-emerald-900 flex items-center justify-center sm:justify-start px-4 tracking-wide">
              {timeStr} {dateStr}
            </div>
          </div>
        </div>

        {/* ── Table 1: TIÊU CHÍ TỔNG QUAN ── */}
        <div className="overflow-hidden rounded-2xl border border-emerald-500/90 shadow-xs bg-white w-full" style={{ width: '100%' }}>
          <table className="w-full border-collapse table-fixed bg-white text-[13px] sm:text-[14px]" style={{ width: '100%', minWidth: '100%', maxWidth: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '46px', minWidth: '46px' }} />
              <col style={{ width: '304px', minWidth: '304px' }} />
              <col style={{ width: '88px', minWidth: '88px' }} />
              <col style={{ width: '88px', minWidth: '88px' }} />
              <col style={{ width: '92px', minWidth: '92px' }} />
              <col style={{ width: '90px', minWidth: '90px' }} />
            </colgroup>
            <thead>
              <tr className="text-white h-[42px]">
                <th style={{ width: '46px', minWidth: '46px' }} className="px-1 py-0 font-black uppercase text-center border border-emerald-600 bg-[#047857]">STT</th>
                <th style={{ width: '304px', minWidth: '304px' }} className="px-3 py-0 font-black uppercase text-left border border-emerald-600 bg-[#059669]">TIÊU CHÍ</th>
                <th style={{ width: '88px', minWidth: '88px' }} className="px-1.5 py-0 font-black uppercase text-center border border-emerald-600 bg-[#047857]">MỤC TIÊU</th>
                <th style={{ width: '88px', minWidth: '88px' }} className="px-1.5 py-0 font-black uppercase text-center border border-emerald-600 bg-[#059669]">THỰC HIỆN</th>
                <th style={{ width: '92px', minWidth: '92px' }} className="px-1.5 py-0 font-black uppercase text-center border border-emerald-600 bg-[#047857]">HOÀN THÀNH</th>
                <th style={{ width: '90px', minWidth: '90px' }} className="px-1.5 py-0 font-black uppercase text-center border border-emerald-600 bg-[#059669]">C.LẠI</th>
              </tr>
            </thead>
            <tbody className="font-black">
              {/* 1. Doanh Thu Thực */}
              <tr className="bg-white hover:bg-emerald-50/40 transition-colors h-[40px]">
                <td className="px-1 py-0 font-black text-slate-700 text-center border border-emerald-100 bg-emerald-50/40 text-[12.5px] sm:text-[13.5px]">
                  1
                </td>
                <td style={{ minWidth: '304px' }} className="px-3 py-0 font-black text-slate-900 border border-emerald-100 uppercase tracking-tight">Doanh Thu Thực</td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 text-slate-800 bg-emerald-50/20">
                  <input
                    type="number"
                    value={overviewTargets.dtThuc}
                    onChange={(e) => handleOverviewTargetChange('dtThuc', Number(e.target.value))}
                    className="w-full text-center bg-transparent font-black focus:outline-none focus:bg-emerald-100/60 rounded py-0.5"
                    title="Nhập mục tiêu Doanh Thu Thực"
                  />
                </td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 text-emerald-800">
                  {Math.round(dtlk).toLocaleString()}
                </td>
                <td className="px-1 py-0 text-center border border-emerald-100">
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                    dtThucRate >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {dtThucRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 font-black">
                  <span className={dtThucRemaining > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {dtThucRemaining > 0 ? Math.round(dtThucRemaining).toLocaleString() : '0'}
                  </span>
                </td>
              </tr>

              {/* 2. Doanh Thu Quy Đổi */}
              <tr className="bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors h-[40px]">
                <td className="px-1 py-0 font-black text-slate-700 text-center border border-emerald-100 bg-emerald-50/40 text-[12.5px] sm:text-[13.5px]">
                  2
                </td>
                <td style={{ minWidth: '304px' }} className="px-3 py-0 font-black text-slate-900 border border-emerald-100 uppercase tracking-tight">Doanh Thu Quy Đổi</td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 text-slate-800 bg-emerald-50/30">
                  <input
                    type="number"
                    value={overviewTargets.dtQd}
                    onChange={(e) => handleOverviewTargetChange('dtQd', Number(e.target.value))}
                    className="w-full text-center bg-transparent font-black focus:outline-none focus:bg-emerald-100/60 rounded py-0.5"
                    title="Nhập mục tiêu Doanh Thu Quy Đổi"
                  />
                </td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 text-emerald-800">
                  {Math.round(dtqd).toLocaleString()}
                </td>
                <td className="px-1 py-0 text-center border border-emerald-100">
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                    dtQdRate >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {dtQdRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 font-black">
                  <span className={dtQdRemaining > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {dtQdRemaining > 0 ? Math.round(dtQdRemaining).toLocaleString() : '0'}
                  </span>
                </td>
              </tr>

              {/* 3. Hiệu Quả Quy Đổi */}
              <tr className="bg-white hover:bg-emerald-50/40 transition-colors h-[40px]">
                <td className="px-1 py-0 font-black text-slate-700 text-center border border-emerald-100 bg-emerald-50/40 text-[12.5px] sm:text-[13.5px]">
                  3
                </td>
                <td style={{ minWidth: '304px' }} className="px-3 py-0 font-black text-slate-900 border border-emerald-100 uppercase tracking-tight">Hiệu Quả Quy Đổi</td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 text-slate-800 bg-emerald-50/20">
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      step="0.1"
                      value={overviewTargets.effQd}
                      onChange={(e) => handleOverviewTargetChange('effQd', Number(e.target.value))}
                      className="w-12 text-center bg-transparent font-black focus:outline-none focus:bg-emerald-100/60 rounded py-0.5"
                      title="Nhập % Mục tiêu Hiệu Quả QĐ"
                    />
                    <span>%</span>
                  </div>
                </td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 text-slate-800">
                  {actualEff.toFixed(1)}%
                </td>
                <td className="px-1 py-0 text-center border border-emerald-100">
                  <span className={`inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                    diffEff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'
                  }`}>
                    <span>{diffEff >= 0 ? '🟢 +' : '🔻 '}</span>
                    <span>{diffEff.toFixed(1)}%</span>
                  </span>
                </td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 font-bold text-slate-400">
                  -
                </td>
              </tr>

              {/* 4. Trả Chậm */}
              <tr className="bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors h-[40px]">
                <td className="px-1 py-0 font-black text-slate-700 text-center border border-emerald-100 bg-emerald-50/40 text-[12.5px] sm:text-[13.5px]">
                  4
                </td>
                <td style={{ minWidth: '304px' }} className="px-3 py-0 font-black text-slate-900 border border-emerald-100 uppercase tracking-tight">Trả Chậm</td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 text-slate-800 bg-emerald-50/30">
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      step="0.1"
                      value={overviewTargets.traCham}
                      onChange={(e) => handleOverviewTargetChange('traCham', Number(e.target.value))}
                      className="w-12 text-center bg-transparent font-black focus:outline-none focus:bg-emerald-100/60 rounded py-0.5"
                      title="Nhập % Mục tiêu Trả Chậm"
                    />
                    <span>%</span>
                  </div>
                </td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 text-slate-800">
                  {actualInstallment.toFixed(1)}%
                </td>
                <td className="px-1 py-0 text-center border border-emerald-100">
                  <span className={`inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                    diffInstallment >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'
                  }`}>
                    <span>{diffInstallment >= 0 ? '🟢 +' : '🔻 '}</span>
                    <span>{diffInstallment.toFixed(1)}%</span>
                  </span>
                </td>
                <td className="px-1.5 py-0 text-center border border-emerald-100 font-bold text-slate-400">
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Table 2: NGÀNH HÀNG (Đồng bộ Tab Tổng Quan) ── */}
        <div className="overflow-hidden rounded-2xl border border-emerald-500/90 shadow-xs bg-white w-full" style={{ width: '100%' }}>
          <table className="w-full border-collapse table-fixed bg-white text-[13px] sm:text-[14px]" style={{ width: '100%', minWidth: '100%', maxWidth: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '46px', minWidth: '46px' }} />
              <col style={{ width: '304px', minWidth: '304px' }} />
              <col style={{ width: '88px', minWidth: '88px' }} />
              <col style={{ width: '88px', minWidth: '88px' }} />
              <col style={{ width: '92px', minWidth: '92px' }} />
              <col style={{ width: '90px', minWidth: '90px' }} />
            </colgroup>
            <thead>
              <tr className="text-white h-[42px]">
                <th style={{ width: '46px', minWidth: '46px' }} className="px-1 py-0 font-black uppercase text-center border border-emerald-600 bg-[#047857]">STT</th>
                <th style={{ width: '304px', minWidth: '304px' }} className="px-3 py-0 font-black uppercase text-left border border-emerald-600 bg-[#059669]">NGÀNH HÀNG</th>
                <th style={{ width: '88px', minWidth: '88px' }} className="px-1.5 py-0 font-black uppercase text-center border border-emerald-600 bg-[#047857]">MỤC TIÊU</th>
                <th style={{ width: '88px', minWidth: '88px' }} className="px-1.5 py-0 font-black uppercase text-center border border-emerald-600 bg-[#059669]">THỰC HIỆN</th>
                <th style={{ width: '92px', minWidth: '92px' }} className="px-1.5 py-0 font-black uppercase text-center border border-emerald-600 bg-[#047857]">HOÀN THÀNH</th>
                <th style={{ width: '90px', minWidth: '90px' }} className="px-1.5 py-0 font-black uppercase text-center border border-emerald-600 bg-[#059669]">C.LẠI</th>
              </tr>
            </thead>
            <tbody className="font-black">
              {displayedCategoryList.map((item, idx) => {
                const isEven = idx % 2 === 0;
                const thucHien = item.realtimeRevenue || 0;
                const savedTarget = categoryTargets[item.name] !== undefined ? categoryTargets[item.name] : (item.defaultTarget || 0);
                const hasTarget = savedTarget > 0;
                const rate = hasTarget ? (thucHien / savedTarget) * 100 : (item.rate || 0);
                const remaining = hasTarget ? (savedTarget - thucHien) : 0;
                const isSL = item.type === 'SL';

                return (
                  <tr key={item.key || idx} className={`${isEven ? 'bg-white' : 'bg-emerald-50/20'} hover:bg-emerald-50/50 transition-colors h-[40px]`}>
                    <td className="px-1 py-0 font-black text-slate-700 text-center border border-emerald-100 bg-emerald-50/40 text-[12.5px] sm:text-[13.5px]">
                      {idx + 1}
                    </td>
                    <td style={{ width: '304px', minWidth: '304px', maxWidth: '304px', overflow: 'hidden' }} className="px-3 py-0 font-black text-slate-900 border border-emerald-100 uppercase tracking-tight overflow-hidden" title={item.name}>
                      <div className="flex items-center justify-between gap-1 w-full min-w-0" style={{ overflow: 'hidden' }}>
                        <span 
                          className="truncate block" 
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}
                        >
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                          isSL ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-1.5 py-0 text-center border border-emerald-100 text-slate-800 bg-emerald-50/20">
                      <input
                        type="number"
                        value={categoryTargets[item.name] !== undefined ? categoryTargets[item.name] : (item.defaultTarget > 0 ? item.defaultTarget : '')}
                        onChange={(e) => handleCategoryTargetChange(item.name, Number(e.target.value))}
                        className="w-full text-center bg-transparent font-black focus:outline-none focus:bg-emerald-100/60 rounded py-0.5"
                        placeholder="0"
                        title={`Nhập mục tiêu cho ${item.name}`}
                      />
                    </td>
                    <td className="px-1.5 py-0 text-center border border-emerald-100 text-emerald-800 font-black">
                      {thucHien > 0 ? (isSL ? Math.round(thucHien).toLocaleString() : (Math.round(thucHien * 10) / 10).toLocaleString()) : (isSL ? '0' : '0.0')}
                    </td>
                    <td className="px-1 py-0 text-center border border-emerald-100">
                      {hasTarget || item.defaultTarget > 0 ? (
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                          rate >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-500">
                          #N/A
                        </span>
                      )}
                    </td>
                    <td className="px-1.5 py-0 text-center border border-emerald-100 font-black">
                      {hasTarget ? (
                        <span className={remaining > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {remaining > 0 ? (isSL ? Math.round(remaining).toLocaleString() : (Math.round(remaining * 10) / 10).toLocaleString()) : '0'}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Optional Inline Comment Box (Rendered inside captured image if active) ── */}
        {showInlineComment && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
            <textarea
              value={inlineComment}
              onChange={(e) => setInlineComment(e.target.value)}
              placeholder="Nhập ghi chú / nhận xét tiến độ đính kèm vào ảnh xuất..."
              className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 resize-none min-h-[60px]"
            />
          </div>
        )}
      </div>

      {/* ── Multi-Select Category Filter Modal ── */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsFilterModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <div className="fixed inset-0" onClick={() => setIsFilterModalOpen(false)} />
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] relative z-10"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-[#FEF08A]" />
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wide">
                    BỘ LỌC DANH SÁCH NGÀNH HÀNG
                  </h3>
                </div>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search & Bulk Select Controls */}
              <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm ngành hàng..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs font-black">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const allKeys = allAvailableCategoryList.map(c => c.key);
                        setSelectedCategoryKeys(allKeys);
                        saveTargetsDebounced(overviewTargets, categoryTargets, allKeys);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                    >
                      CHỌN TẤT CẢ
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategoryKeys(['__NONE__']);
                        saveTargetsDebounced(overviewTargets, categoryTargets, ['__NONE__']);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      BỎ CHỌN HẾT
                    </button>
                  </div>

                  <span className="text-slate-500 font-bold text-[11px]">
                    Đã chọn: {selectedCount}/{allAvailableCategoryList.length}
                  </span>
                </div>
              </div>

              {/* Category Checkbox List */}
              <div className="overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 grow">
                {allAvailableCategoryList
                  .filter(cat => normalize(cat.name).includes(normalize(filterSearchTerm)))
                  .map(cat => {
                    const isChecked = selectedCategoryKeys.length === 0 || selectedCategoryKeys.includes(cat.key);
                    return (
                      <div
                        key={cat.key}
                        onClick={() => {
                          let currentSelected = selectedCategoryKeys.length === 0 
                            ? allAvailableCategoryList.map(c => c.key)
                            : selectedCategoryKeys.filter(k => k !== '__NONE__');
                          let nextKeys: string[];
                          if (isChecked) {
                            nextKeys = currentSelected.filter(k => k !== cat.key);
                            if (nextKeys.length === 0) nextKeys = ['__NONE__'];
                          } else {
                            nextKeys = [...currentSelected, cat.key];
                          }
                          setSelectedCategoryKeys(nextKeys);
                          saveTargetsDebounced(overviewTargets, categoryTargets, nextKeys);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-50/60 text-emerald-950 font-black' : 'text-slate-700 hover:bg-slate-50 font-bold'
                        } text-xs sm:text-sm`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isChecked ? (
                            <CheckSquare size={17} className="text-emerald-600 shrink-0" />
                          ) : (
                            <Square size={17} className="text-slate-400 shrink-0" />
                          )}
                          <span>{cat.name}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          cat.type === 'SL' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {cat.type}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-black uppercase tracking-wider hover:from-emerald-700 hover:to-teal-800 transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  HOÀN TẤT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Nhận xét Mục Tiêu Ngày Modal ── */}
      <AnimatePresence>
        {isCommentModalOpen && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsCommentModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <div className="fixed inset-0" onClick={() => setIsCommentModalOpen(false)} />
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] relative z-10"
              style={{ fontFamily: "'UTM Avo', sans-serif" }}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className="text-[#FEF08A]" />
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wide">
                    NHẬN XÉT MỤC TIÊU NGÀY
                  </h3>
                </div>
                <button
                  onClick={() => setIsCommentModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Template Selector */}
              <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                <p className="text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wide">
                  Chọn mẫu nhận xét:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {commentTemplates.map((tab, idx) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedCommentTemplate(idx);
                        setCustomCommentText(tab.text);
                      }}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer border ${
                        selectedCommentTemplate === idx
                          ? 'bg-gradient-to-r from-[#047857] to-[#059669] text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Text Area */}
              <div className="p-3 sm:p-4 overflow-y-auto grow space-y-3">
                <textarea
                  value={customCommentText}
                  onChange={(e) => setCustomCommentText(e.target.value)}
                  rows={10}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-800 leading-relaxed resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo
                </span>
                <button
                  onClick={handleCopyComment}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-md active:scale-95 ${
                    copiedComment
                      ? 'bg-emerald-700 shadow-emerald-700/20'
                      : 'bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] hover:from-[#036348] hover:to-[#059669] shadow-emerald-600/25'
                  }`}
                >
                  {copiedComment ? (
                    <>
                      <Check size={16} />
                      <span>ĐÃ COPY!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>SAO CHÉP NHẬN XÉT</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
