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
  Trash2,
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
  FileText,
  RefreshCw
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
  captureElementDirect: (ref: React.RefObject<HTMLDivElement | null>) => void;
  userProfile?: any;
  luykeProcessedData?: any;
  dailyTargetQD?: number;
  isUser43751?: boolean;
}

// Fallback standard DT category template if no categories are uploaded yet
const DEFAULT_DT_CATEGORIES = [
  { name: 'ĐIỆN THOẠI', type: 'DT', defaultTarget: 0 },
  { name: 'MÁY TÍNH BẢNG', type: 'DT', defaultTarget: 0 },
  { name: 'LAPTOP', type: 'DT', defaultTarget: 0 },
  { name: 'PHỤ KIỆN', type: 'DT', defaultTarget: 0 },
  { name: 'ĐỒNG HỒ', type: 'DT', defaultTarget: 0 },
  { name: 'BẢO HIỂM', type: 'DT', defaultTarget: 0 },
  { name: 'TIVI', type: 'DT', defaultTarget: 0 },
  { name: 'TỦ LẠNH', type: 'DT', defaultTarget: 0 },
  { name: 'MÁY LẠNH', type: 'DT', defaultTarget: 0 },
  { name: 'MÁY GIẶT', type: 'DT', defaultTarget: 0 },
  { name: 'GIA DỤNG', type: 'DT', defaultTarget: 0 },
];

export const MucTieuNgayTab: React.FC<MucTieuNgayTabProps> = ({
  marketFilter,
  filteredMarkets,
  processedData,
  filteredCategories,
  lastUpdated,
  captureElement,
  captureElementDirect,
  userProfile,
  luykeProcessedData,
  dailyTargetQD,
  isUser43751 = false
}) => {
  const { showNotification } = useNotification();
  const captureRef = useRef<HTMLDivElement | null>(null);

  // Check if current user is 43751
  const is43751 = Boolean(
    isUser43751 || 
    String(userProfile?.username || '').trim() === '43751' || 
    String(userProfile?.ma_nhan_vien || '').trim() === '43751' || 
    String(userProfile?.user_id || '').trim() === '43751' || 
    String(userProfile?.email || '').trim().startsWith('43751') || 
    String(userProfile?.store_id || '').trim() === '43751'
  );

  // Tone Xanh Dương Pastel cho User 43751 vs Tone Xanh Lá Truyền Thống cho User Khác
  const theme = useMemo(() => {
    if (is43751) {
      return {
        // Toolbar
        storeIconBg: 'bg-gradient-to-br from-[#38BDF8] via-[#0EA5E9] to-[#0284C7] shadow-sky-500/25',
        filterIcon: 'text-sky-600',
        syncBtn: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md shadow-sky-500/25 border border-sky-400/30',
        exportBtn: 'bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#0284C7] hover:from-[#0369A1] hover:to-[#0284C7] text-white shadow-md shadow-sky-600/25',
        commentToggleActive: 'bg-sky-700 text-white border-sky-800',
        commentToggleInactive: 'bg-white text-sky-800 border-sky-300 hover:bg-sky-100',
        hintBg: 'bg-sky-50/90 border border-sky-300/80 text-sky-950',
        hintStrong: 'text-sky-900',
        hintBadge: 'text-sky-800 bg-sky-100 border border-sky-200',

        // Main Report Export Card Container
        cardBorder: 'border-[#BAE6FD]/90',
        topCardBorder: 'border-[#BAE6FD]',
        topCardBg: 'bg-[#F0F7FF]',
        topCardDivide: 'divide-sky-200',
        
        // Row 1: TÊN CỤM BASE
        row1Bg: 'bg-[#E0F2FE]/70',
        row1Label: 'text-sky-950',
        row1Val: 'text-sky-900',

        // Row 2: Banner
        bannerBg: 'bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#0284C7]',
        bannerTitle: 'text-[#FEF08A]',
        bannerSub: 'text-sky-100/90',

        // Row 3: REALTIME ĐẾN
        row3Bg: 'bg-[#F0F9FF]',
        row3Label: 'text-sky-950',
        row3Val: 'text-sky-900',

        // Tables 1 & 2
        tableCardBorder: 'border-[#0284C7]/80',
        thDark: 'border border-sky-600 bg-[#0284C7]',
        thLight: 'border border-sky-600 bg-[#0369A1]',
        thSortHover: 'hover:bg-[#0284C7]',
        
        // Tbody
        cellBorder: 'border-sky-100',
        rowEvenBg: 'bg-white',
        rowOddBg: 'bg-sky-50/25',
        rowHover: 'hover:bg-sky-50/50',
        sttCellBg: 'bg-sky-50/50',
        inputCellBgLight: 'bg-sky-50/20',
        inputCellBgDark: 'bg-sky-50/30',
        inputFocusBg: 'focus:bg-sky-100/60',
        actualValText: 'text-[#0284C7]',
        rateSuccessBadge: 'bg-sky-100 text-sky-800 border border-sky-200',
        diffSuccessBadge: 'bg-sky-100 text-sky-800 border border-sky-200',
        remainingGoodText: 'text-[#0284C7]',
        dtBadge: 'bg-sky-100 text-sky-800 border border-sky-200',

        // Inline Comment in Image
        inlineCommentBg: 'bg-sky-50/70 border border-sky-200',
        inlineCommentArea: 'bg-white border border-sky-200 text-slate-700 focus:ring-2 focus:ring-sky-500/20',

        // Modals
        modalHeaderBg: 'bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#0369A1]',
        modalFocusRing: 'focus:ring-sky-500',
        modalSelectAllBtn: 'bg-sky-100 text-sky-800 hover:bg-sky-200',
        modalItemCheckedBg: 'bg-sky-50/60 text-sky-950',
        modalItemCheckedIcon: 'text-sky-600',
        modalConfirmBtn: 'bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white shadow-sky-600/20',
        commentActiveTab: 'bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white border-sky-600 shadow-md shadow-sky-600/20',
        commentTextareaFocus: 'focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500',
        commentCopyBtn: 'bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] shadow-sky-600/25',
        commentCopySuccess: 'bg-sky-700 shadow-sky-700/20',
      };
    }

    // Default Traditional Emerald Green Theme for Other Users
    return {
      storeIconBg: 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/20',
      filterIcon: 'text-emerald-600',
      syncBtn: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/30',
      exportBtn: 'bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] hover:from-[#036348] hover:to-[#059669] text-white shadow-md shadow-emerald-600/25',
      commentToggleActive: 'bg-emerald-700 text-white border-emerald-800',
      commentToggleInactive: 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100',
      hintBg: 'bg-emerald-50/90 border border-emerald-300/80 text-emerald-950',
      hintStrong: 'text-emerald-900',
      hintBadge: 'text-teal-800 bg-teal-100 border border-teal-200',

      cardBorder: 'border-emerald-200/90',
      topCardBorder: 'border-emerald-300',
      topCardBg: 'bg-[#ECFDF5]',
      topCardDivide: 'divide-emerald-200',
      
      row1Bg: 'bg-emerald-100/70',
      row1Label: 'text-emerald-950',
      row1Val: 'text-emerald-900',

      bannerBg: 'bg-gradient-to-r from-[#047857] via-[#059669] to-[#047857]',
      bannerTitle: 'text-[#FEF08A]',
      bannerSub: 'text-emerald-100/90',

      row3Bg: 'bg-emerald-50',
      row3Label: 'text-emerald-950',
      row3Val: 'text-emerald-900',

      tableCardBorder: 'border-emerald-500/90',
      thDark: 'border border-emerald-600 bg-[#047857]',
      thLight: 'border border-emerald-600 bg-[#059669]',
      thSortHover: 'hover:bg-[#047857]',
      
      cellBorder: 'border-emerald-100',
      rowEvenBg: 'bg-white',
      rowOddBg: 'bg-emerald-50/20',
      rowHover: 'hover:bg-emerald-50/40',
      sttCellBg: 'bg-emerald-50/40',
      inputCellBgLight: 'bg-emerald-50/20',
      inputCellBgDark: 'bg-emerald-50/30',
      inputFocusBg: 'focus:bg-emerald-100/60',
      actualValText: 'text-emerald-800',
      rateSuccessBadge: 'bg-emerald-100 text-emerald-800',
      diffSuccessBadge: 'bg-emerald-100 text-emerald-800',
      remainingGoodText: 'text-emerald-700',
      dtBadge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',

      inlineCommentBg: 'bg-emerald-50/70 border border-emerald-200',
      inlineCommentArea: 'bg-white border border-emerald-200 text-slate-700 focus:ring-2 focus:ring-emerald-500/20',

      modalHeaderBg: 'bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981]',
      modalFocusRing: 'focus:ring-emerald-500',
      modalSelectAllBtn: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
      modalItemCheckedBg: 'bg-emerald-50/60 text-emerald-950',
      modalItemCheckedIcon: 'text-emerald-600',
      modalConfirmBtn: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/20',
      commentActiveTab: 'bg-gradient-to-r from-[#047857] to-[#059669] text-white border-emerald-600 shadow-md shadow-emerald-600/20',
      commentTextareaFocus: 'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
      commentCopyBtn: 'bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] hover:from-[#036348] hover:to-[#059669] shadow-emerald-600/25',
      commentCopySuccess: 'bg-emerald-700 shadow-emerald-700/20',
    };
  }, [is43751]);

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

  // State: Target Values for Table 1 (Overview KPIs - strictly from BC NGÀY > TỔNG QUAN or custom user inputs, 0/blank if empty)
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
    return {
      dtThuc: (parsedMarket as any)?.targetReal || 0,
      dtQd: dailyTargetQD || (parsedMarket?.targetQD || 0),
      effQd: 0,
      traCham: 0
    };
  });

  // Auto-fill dtQd from dailyTargetQD if not customized
  useEffect(() => {
    if (dailyTargetQD && dailyTargetQD > 0 && (!overviewTargets.dtQd || overviewTargets.dtQd === 0)) {
      setOverviewTargets(prev => ({ ...prev, dtQd: dailyTargetQD }));
    }
  }, [dailyTargetQD]);

  // State: Target Values for Table 2 (Categories keyed by category name - strictly from BC NGÀY > TỔNG QUAN, 0/blank if empty)
  const [categoryTargets, setCategoryTargets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`DAILY_CAT_TARGETS_${storeNormalizedKey}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {};
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

  // State: Sort C.LẠI column
  const [sortConLai, setSortConLai] = useState<'none' | 'desc' | 'asc'>('none');

  // Refs to avoid unnecessary updates and flickering
  const isEditingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize with Firebase Firestore
  useEffect(() => {
    try {
      const docRef = doc(db, 'app_settings', `daily_targets_${storeNormalizedKey}`);
      const unsub = onSnapshot(docRef, (snapshot) => {
        // Don't write stale data during logout/login redirect
        if ((window as any).__crm_is_redirecting) return;
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
    let list = allAvailableCategoryList;
    if (selectedCategoryKeys.length > 0) {
      if (selectedCategoryKeys.includes('__NONE__')) return [];
      list = allAvailableCategoryList.filter(r => selectedCategoryKeys.includes(r.key));
    }
    // Sort by C.LẠI if active
    if (sortConLai !== 'none') {
      list = [...list].sort((a, b) => {
        const targetA = categoryTargets[a.name] !== undefined ? categoryTargets[a.name] : (a.defaultTarget || 0);
        const targetB = categoryTargets[b.name] !== undefined ? categoryTargets[b.name] : (b.defaultTarget || 0);
        const remainA = targetA > 0 ? targetA - (a.realtimeRevenue || 0) : 0;
        const remainB = targetB > 0 ? targetB - (b.realtimeRevenue || 0) : 0;
        return sortConLai === 'desc' ? remainB - remainA : remainA - remainB;
      });
    }
    return list;
  }, [allAvailableCategoryList, selectedCategoryKeys, sortConLai, categoryTargets]);

  // Handler: Remove a single category from view
  const handleRemoveCategory = useCallback((catKey: string) => {
    let currentSelected = selectedCategoryKeys.length > 0 
      ? [...selectedCategoryKeys] 
      : allAvailableCategoryList.map(c => c.key); // If showing all, init with all keys
    const newSelected = currentSelected.filter(k => k !== catKey);
    if (newSelected.length === 0) newSelected.push('__NONE__');
    setSelectedCategoryKeys(newSelected);
    saveTargetsDebounced(overviewTargets, categoryTargets, newSelected);
  }, [selectedCategoryKeys, allAvailableCategoryList, overviewTargets, categoryTargets, saveTargetsDebounced]);

  // Đồng bộ Mục tiêu từ cột C.LẠI bên BC THÁNG > TỔNG QUAN (hoạt động song song với nhập thủ công)
  const handleSyncFromLuyke = useCallback(() => {
    if (!luykeProcessedData) {
      showNotification('Chưa có dữ liệu BC THÁNG để đồng bộ!', 'warning');
      return;
    }

    // 1. Sync Table 1 Overview KPIs from BC THÁNG > TỔNG QUAN (C.LẠI = Target - Lũy kế)
    const luykeStore = luykeProcessedData.markets?.find((pm: any) =>
      normalize(pm.name).includes(normalize(currentStoreName)) ||
      normalize(currentStoreName).includes(normalize(pm.name))
    );

    let newOverview = { ...overviewTargets };
    if (luykeStore) {
      const lkTargetThuc = (luykeStore as any).targetReal || luykeStore.targetST || 0;
      const lkActualThuc = (luykeStore as any).actualReal || 0;
      const remainThuc = Math.max(0, lkTargetThuc - lkActualThuc);

      const lkTargetQD = luykeStore.targetQD || 0;
      const lkActualQD = luykeStore.actualVirtual || 0;
      const remainQD = Math.max(0, lkTargetQD - lkActualQD);

      newOverview = {
        dtThuc: Math.round(remainThuc),
        dtQd: Math.round(remainQD),
        effQd: overviewTargets.effQd > 0 ? overviewTargets.effQd : (luykeStore.percentQD || 50),
        traCham: overviewTargets.traCham > 0 ? overviewTargets.traCham : (luykeStore.installmentRate || 60),
      };
      setOverviewTargets(newOverview);
    }

    // 2. Sync Table 2 Category Targets from BC THÁNG > TỔNG QUAN > C.LẠI
    const lkCats = luykeProcessedData.categories?.filter((cat: any) =>
      marketFilter === 'ALL' || !cat.marketName ||
      normalize(cat.marketName).includes(normalize(currentStoreName)) ||
      normalize(currentStoreName).includes(normalize(cat.marketName))
    ) || [];

    if (lkCats.length === 0 && !luykeStore) {
      showNotification('Không tìm thấy dữ liệu luỹ kế của siêu thị này trong BC THÁNG!', 'warning');
      return;
    }

    const newCatTargets: Record<string, number> = { ...categoryTargets };
    let syncCount = 0;

    const lkRemainMap = new Map<string, number>();
    lkCats.forEach((c: any) => {
      const normN = normalize(c.name);
      const keyWith = `${normN}__${c.type || 'DT'}`;
      const keySimple = normN;
      const remaining = (c.target || 0) - (c.revenue || c.actual || 0);
      const val = remaining > 0 ? (c.type === 'SL' ? Math.round(remaining) : Math.round(remaining * 10) / 10) : 0;
      lkRemainMap.set(keyWith, val);
      if (!lkRemainMap.has(keySimple)) {
        lkRemainMap.set(keySimple, val);
      }
    });

    allAvailableCategoryList.forEach(item => {
      const normN = normalize(item.name);
      const keyWith = `${normN}__${item.type}`;
      const keySimple = normN;
      if (lkRemainMap.has(keyWith)) {
        newCatTargets[item.name.toUpperCase()] = lkRemainMap.get(keyWith)!;
        syncCount++;
      } else if (lkRemainMap.has(keySimple)) {
        newCatTargets[item.name.toUpperCase()] = lkRemainMap.get(keySimple)!;
        syncCount++;
      }
    });

    setCategoryTargets(newCatTargets);
    saveTargetsDebounced(newOverview, newCatTargets, selectedCategoryKeys);
    showNotification(`✅ Đã đồng bộ Mục tiêu theo Còn lại Luỹ Kế (${syncCount} ngành hàng)!`, 'success');
  }, [luykeProcessedData, currentStoreName, marketFilter, overviewTargets, categoryTargets, selectedCategoryKeys, allAvailableCategoryList, saveTargetsDebounced, showNotification]);

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
      t2 += `🚨 Top cần dí số:\n`;
      pendingCats.slice(0, 3).forEach(c => {
        const targetVal = categoryTargets[c.name] !== undefined ? categoryTargets[c.name] : (c.defaultTarget || 0);
        const remain = Math.round((targetVal - c.realtimeRevenue) * 10) / 10;
        t2 += `• ${c.name} (còn ${remain})\n`;
      });
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
          <div className={`w-10 h-10 rounded-2xl ${theme.storeIconBg} text-white flex items-center justify-center`}>
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
            <Filter size={14} className={theme.filterIcon} />
            <span>LỌC NGÀNH HÀNG ({selectedCount}/{allAvailableCategoryList.length})</span>
          </button>

          {/* ĐỒNG BỘ LUỸ KẾ Button */}
          <button
            onClick={handleSyncFromLuyke}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${theme.syncBtn} transition-all active:scale-95 cursor-pointer`}
            title="Đồng bộ Mục tiêu từ cột C.LẠI bên BC THÁNG > TỔNG QUAN"
          >
            <RefreshCw size={14} />
            <span>ĐỒNG BỘ LUỸ KẾ</span>
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

          {/* XUẤT ẢNH Button - Direct on-screen capture */}
          <button
            onClick={() => captureElementDirect(captureRef)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${theme.exportBtn} transition-all active:scale-95 cursor-pointer no-capture`}
            title="Xuất ảnh báo cáo Mục Tiêu Ngày (giữ nguyên layout web)"
          >
            <Camera size={15} />
            <span>XUẤT ẢNH</span>
          </button>

        </div>
      </div>

      {/* ── Instruction Hint Banner (Hidden on export) ── */}
      <div className={`${theme.hintBg} rounded-2xl p-3 px-4 flex items-center justify-between gap-2.5 text-[12px] sm:text-[13px] font-bold shadow-2xs no-capture`}>
        <div className="flex items-center gap-2.5">
          <span className="text-base shrink-0">💡</span>
          <div className="leading-snug">
            <strong className={`${theme.hintStrong} font-black uppercase`}>Hướng dẫn:</strong> Bấm nút <strong className={`uppercase font-black px-1.5 py-0.5 rounded ${theme.hintBadge}`}>"ĐỒNG BỘ LUỸ KẾ"</strong> để tự động điền mục tiêu từ cột <strong>C.LẠI</strong> bên <strong>BC THÁNG</strong>, hoặc nhập tay trực tiếp theo nhu cầu. Hệ thống tự động lưu riêng theo từng siêu thị.
          </div>
        </div>
        <button
          onClick={() => setShowInlineComment(prev => !prev)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer shrink-0 ${
            showInlineComment ? theme.commentToggleActive : theme.commentToggleInactive
          }`}
        >
          {showInlineComment ? 'Ẩn nhận xét trên ảnh' : '+ Thêm nhận xét vào ảnh'}
        </button>
      </div>

      {/* ── Main Report Export Container ── */}
      <div 
        ref={captureRef}
        className={`bg-white rounded-3xl border ${theme.cardBorder} p-4 sm:p-5 shadow-sm space-y-3.5 w-full max-w-[760px] mx-auto box-border`}
        style={{ fontFamily: "'UTM Avo', sans-serif", width: '100%', maxWidth: '760px' }}
      >
        {/* Top Header Card */}
        <div className={`rounded-2xl border ${theme.topCardBorder} overflow-hidden text-center divide-y ${theme.topCardDivide} ${theme.topCardBg} w-full`} style={{ width: '100%' }}>
          {/* Row 1: TÊN CỤM BASE */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x ${theme.topCardDivide} ${theme.row1Bg}`}>
            <div className={`p-2.5 sm:p-3 text-[13px] sm:text-[14px] font-black uppercase ${theme.row1Label} flex items-center justify-center sm:justify-start px-4`}>
              TÊN CỤM BASE :
            </div>
            <div className={`sm:col-span-2 p-2.5 sm:p-3 text-[13px] sm:text-[14.5px] font-black uppercase ${theme.row1Val} flex items-center justify-center sm:justify-start px-4 truncate`}>
              {currentStoreName}
            </div>
          </div>

          {/* Row 2: BÁO CÁO DOANH THU REALTIME Banner */}
          <div className={`p-3.5 sm:p-4 ${theme.bannerBg} text-white flex flex-col items-center justify-center shadow-inner`}>
            <h1 className={`text-[21px] sm:text-[25px] font-black ${theme.bannerTitle} uppercase tracking-wider drop-shadow-sm leading-tight`}>
              BÁO CÁO DOANH THU REALTIME
            </h1>
            <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest ${theme.bannerSub} mt-0.5`}>
              THEO DÕI TIẾN ĐỘ VÀ MỤC TIÊU NGÀY
            </span>
          </div>

          {/* Row 3: REALTIME ĐẾN */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x ${theme.topCardDivide} ${theme.row3Bg}`}>
            <div className={`p-2.5 text-[12px] sm:text-[13px] font-black uppercase ${theme.row3Label} flex items-center justify-center sm:justify-start px-4`}>
              REALTIME ĐẾN :
            </div>
            <div className={`sm:col-span-2 p-2.5 text-[12.5px] sm:text-[13.5px] font-black uppercase ${theme.row3Val} flex items-center justify-center sm:justify-start px-4 tracking-wide`}>
              {timeStr} {dateStr}
            </div>
          </div>
        </div>

        {/* ── Table 1: TIÊU CHÍ TỔNG QUAN ── */}
        <div className={`overflow-hidden rounded-2xl border ${theme.tableCardBorder} shadow-xs bg-white w-full`} style={{ width: '100%' }}>
          <table className="w-full border-collapse table-fixed bg-white text-[13px] sm:text-[14px]" style={{ width: '100%', minWidth: '100%', maxWidth: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col width="6.5%" style={{ width: '6.5%' }} />
              <col width="43.5%" style={{ width: '43.5%' }} />
              <col width="12.5%" style={{ width: '12.5%' }} />
              <col width="12.5%" style={{ width: '12.5%' }} />
              <col width="13%" style={{ width: '13%' }} />
              <col width="12%" style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr className="text-white h-[42px]">
                <th style={{ width: '6.5%' }} className={`px-1 py-0 font-black uppercase text-center ${theme.thDark}`}>STT</th>
                <th style={{ width: '43.5%' }} className={`px-3 py-0 font-black uppercase text-left ${theme.thLight}`}>TIÊU CHÍ</th>
                <th style={{ width: '12.5%' }} className={`px-1.5 py-0 font-black uppercase text-center ${theme.thDark}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>MỤC TIÊU</span>
                    <button
                      type="button"
                      onClick={handleSyncFromLuyke}
                      className="no-capture p-0.5 hover:bg-white/20 rounded text-[#FEF08A] hover:text-white transition-colors cursor-pointer"
                      title="Bấm để đồng bộ số Còn lại từ BC THÁNG"
                    >
                      <RefreshCw size={11} />
                    </button>
                  </div>
                </th>
                <th style={{ width: '12.5%' }} className={`px-1.5 py-0 font-black uppercase text-center ${theme.thLight}`}>THỰC HIỆN</th>
                <th style={{ width: '13%' }} className={`px-1.5 py-0 font-black uppercase text-center ${theme.thDark}`}>HOÀN THÀNH</th>
                <th style={{ width: '12%' }} className={`px-1.5 py-0 font-black uppercase text-center ${theme.thLight}`}>C.LẠI</th>
              </tr>
            </thead>
            <tbody className="font-black">
              {/* 1. Doanh Thu Thực */}
              <tr className={`bg-white ${theme.rowHover} transition-colors h-[40px]`}>
                <td className={`px-1 py-0 font-black text-slate-700 text-center border ${theme.cellBorder} ${theme.sttCellBg} text-[12.5px] sm:text-[13.5px]`}>
                  1
                </td>
                <td className={`px-3 py-0 font-black text-slate-900 border ${theme.cellBorder} uppercase tracking-tight`}>Doanh Thu Thực</td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} text-slate-800 ${theme.inputCellBgLight}`}>
                  <input
                    type="number"
                    value={overviewTargets.dtThuc > 0 ? overviewTargets.dtThuc : ''}
                    placeholder="0"
                    onChange={(e) => handleOverviewTargetChange('dtThuc', Number(e.target.value))}
                    className={`w-full text-center bg-transparent font-black focus:outline-none ${theme.inputFocusBg} rounded py-0.5`}
                    title="Nhập mục tiêu Doanh Thu Thực"
                  />
                </td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} ${theme.actualValText}`}>
                  {Math.round(dtlk).toLocaleString()}
                </td>
                <td className={`px-1 py-0 text-center border ${theme.cellBorder}`}>
                  {overviewTargets.dtThuc > 0 ? (
                    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                      dtThucRate >= 100 ? theme.rateSuccessBadge : 'bg-rose-100 text-rose-600'
                    }`}>
                      {dtThucRate.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">-</span>
                  )}
                </td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} font-black`}>
                  {overviewTargets.dtThuc > 0 ? (
                    <span className={dtThucRemaining > 0 ? 'text-rose-600' : theme.remainingGoodText}>
                      {dtThucRemaining > 0 ? Math.round(dtThucRemaining).toLocaleString() : '0'}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">-</span>
                  )}
                </td>
              </tr>

              {/* 2. Doanh Thu Quy Đổi */}
              <tr className={`${theme.rowOddBg} ${theme.rowHover} transition-colors h-[40px]`}>
                <td className={`px-1 py-0 font-black text-slate-700 text-center border ${theme.cellBorder} ${theme.sttCellBg} text-[12.5px] sm:text-[13.5px]`}>
                  2
                </td>
                <td className={`px-3 py-0 font-black text-slate-900 border ${theme.cellBorder} uppercase tracking-tight`}>Doanh Thu Quy Đổi</td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} text-slate-800 ${theme.inputCellBgDark}`}>
                  <input
                    type="number"
                    value={overviewTargets.dtQd > 0 ? overviewTargets.dtQd : ''}
                    placeholder="0"
                    onChange={(e) => handleOverviewTargetChange('dtQd', Number(e.target.value))}
                    className={`w-full text-center bg-transparent font-black focus:outline-none ${theme.inputFocusBg} rounded py-0.5`}
                    title="Nhập mục tiêu Doanh Thu Quy Đổi"
                  />
                </td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} ${theme.actualValText}`}>
                  {Math.round(dtqd).toLocaleString()}
                </td>
                <td className={`px-1 py-0 text-center border ${theme.cellBorder}`}>
                  {overviewTargets.dtQd > 0 ? (
                    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                      dtQdRate >= 100 ? theme.rateSuccessBadge : 'bg-rose-100 text-rose-600'
                    }`}>
                      {dtQdRate.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">-</span>
                  )}
                </td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} font-black`}>
                  {overviewTargets.dtQd > 0 ? (
                    <span className={dtQdRemaining > 0 ? 'text-rose-600' : theme.remainingGoodText}>
                      {dtQdRemaining > 0 ? Math.round(dtQdRemaining).toLocaleString() : '0'}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">-</span>
                  )}
                </td>
              </tr>

              {/* 3. Hiệu Quả Quy Đổi */}
              <tr className={`bg-white ${theme.rowHover} transition-colors h-[40px]`}>
                <td className={`px-1 py-0 font-black text-slate-700 text-center border ${theme.cellBorder} ${theme.sttCellBg} text-[12.5px] sm:text-[13.5px]`}>
                  3
                </td>
                <td className={`px-3 py-0 font-black text-slate-900 border ${theme.cellBorder} uppercase tracking-tight`}>Hiệu Quả Quy Đổi</td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} text-slate-800 ${theme.inputCellBgLight}`}>
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      step="0.1"
                      value={overviewTargets.effQd > 0 ? overviewTargets.effQd : ''}
                      placeholder="0"
                      onChange={(e) => handleOverviewTargetChange('effQd', Number(e.target.value))}
                      className={`w-12 text-center bg-transparent font-black focus:outline-none ${theme.inputFocusBg} rounded py-0.5`}
                      title="Nhập % Mục tiêu Hiệu Quả QĐ"
                    />
                    <span>%</span>
                  </div>
                </td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} text-slate-800`}>
                  {actualEff.toFixed(1)}%
                </td>
                <td className={`px-1 py-0 text-center border ${theme.cellBorder}`}>
                  {overviewTargets.effQd > 0 ? (
                    <span className={`inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                      diffEff >= 0 ? theme.diffSuccessBadge : 'bg-rose-100 text-rose-600'
                    }`}>
                      <span>{diffEff >= 0 ? '🟢 +' : '🔻 '}</span>
                      <span>{diffEff.toFixed(1)}%</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">-</span>
                  )}
                </td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} font-bold text-slate-400`}>
                  -
                </td>
              </tr>

              {/* 4. Trả Chậm */}
              <tr className={`${theme.rowOddBg} ${theme.rowHover} transition-colors h-[40px]`}>
                <td className={`px-1 py-0 font-black text-slate-700 text-center border ${theme.cellBorder} ${theme.sttCellBg} text-[12.5px] sm:text-[13.5px]`}>
                  4
                </td>
                <td className={`px-3 py-0 font-black text-slate-900 border ${theme.cellBorder} uppercase tracking-tight`}>Trả Chậm</td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} text-slate-800 ${theme.inputCellBgDark}`}>
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      step="0.1"
                      value={overviewTargets.traCham > 0 ? overviewTargets.traCham : ''}
                      placeholder="0"
                      onChange={(e) => handleOverviewTargetChange('traCham', Number(e.target.value))}
                      className={`w-12 text-center bg-transparent font-black focus:outline-none ${theme.inputFocusBg} rounded py-0.5`}
                      title="Nhập % Mục tiêu Trả Chậm"
                    />
                    <span>%</span>
                  </div>
                </td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} text-slate-800`}>
                  {actualInstallment.toFixed(1)}%
                </td>
                <td className={`px-1 py-0 text-center border ${theme.cellBorder}`}>
                  {overviewTargets.traCham > 0 ? (
                    <span className={`inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                      diffInstallment >= 0 ? theme.diffSuccessBadge : 'bg-rose-100 text-rose-600'
                    }`}>
                      <span>{diffInstallment >= 0 ? '🟢 +' : '🔻 '}</span>
                      <span>{diffInstallment.toFixed(1)}%</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">-</span>
                  )}
                </td>
                <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} font-bold text-slate-400`}>
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Table 2: NGÀNH HÀNG (Đồng bộ Tab Tổng Quan) ── */}
        <div className={`overflow-hidden rounded-2xl border ${theme.tableCardBorder} shadow-xs bg-white w-full`} style={{ width: '100%' }}>
          <table className="w-full border-collapse table-fixed bg-white text-[13px] sm:text-[14px]" style={{ width: '100%', minWidth: '100%', maxWidth: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col width="6.5%" style={{ width: '6.5%' }} />
              <col width="43.5%" style={{ width: '43.5%' }} />
              <col width="12.5%" style={{ width: '12.5%' }} />
              <col width="12.5%" style={{ width: '12.5%' }} />
              <col width="13%" style={{ width: '13%' }} />
              <col width="12%" style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr className="text-white h-[42px]">
                <th style={{ width: '6.5%' }} className={`px-1 py-0 font-black uppercase text-center ${theme.thDark}`}>STT</th>
                <th style={{ width: '43.5%' }} className={`px-3 py-0 font-black uppercase text-left ${theme.thLight}`}>NGÀNH HÀNG</th>
                <th style={{ width: '12.5%' }} className={`px-1.5 py-0 font-black uppercase text-center ${theme.thDark}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>MỤC TIÊU</span>
                    <button
                      type="button"
                      onClick={handleSyncFromLuyke}
                      className="no-capture p-0.5 hover:bg-white/20 rounded text-[#FEF08A] hover:text-white transition-colors cursor-pointer"
                      title="Bấm để đồng bộ số Còn lại từ BC THÁNG"
                    >
                      <RefreshCw size={11} />
                    </button>
                  </div>
                </th>
                <th style={{ width: '12.5%' }} className={`px-1.5 py-0 font-black uppercase text-center ${theme.thLight}`}>THỰC HIỆN</th>
                <th style={{ width: '13%' }} className={`px-1.5 py-0 font-black uppercase text-center ${theme.thDark}`}>HOÀN THÀNH</th>
                <th 
                  style={{ width: '12%' }} 
                  className={`px-1.5 py-0 font-black uppercase text-center ${theme.thLight} cursor-pointer select-none ${theme.thSortHover} transition-colors`}
                  onClick={() => setSortConLai(prev => prev === 'desc' ? 'asc' : prev === 'asc' ? 'none' : 'desc')}
                  title="Bấm để sắp xếp theo C.LẠI"
                >
                  C.LẠI {sortConLai === 'desc' ? '▼' : sortConLai === 'asc' ? '▲' : ''}
                </th>
              </tr>
            </thead>
            <tbody className="font-black">
              {displayedCategoryList.map((item, idx) => {
                const isEven = idx % 2 === 0;
                const thucHien = item.realtimeRevenue || 0;
                const savedTarget = categoryTargets[item.name] !== undefined ? categoryTargets[item.name] : (item.defaultTarget || 0);
                const hasTarget = savedTarget > 0;
                const rate = hasTarget ? (thucHien / savedTarget) * 100 : 0;
                const remaining = hasTarget ? (savedTarget - thucHien) : 0;
                const isSL = item.type === 'SL';

                return (
                  <tr key={item.key || idx} className={`${isEven ? 'bg-white' : theme.rowOddBg} ${theme.rowHover} transition-colors h-[40px]`}>
                    <td className={`px-1 py-0 font-black text-slate-700 text-center border ${theme.cellBorder} ${theme.sttCellBg} text-[12.5px] sm:text-[13.5px]`}>
                      {idx + 1}
                    </td>
                    <td style={{ maxWidth: 0, overflow: 'hidden' }} className={`px-1.5 py-0 font-black text-slate-900 border ${theme.cellBorder} uppercase tracking-tight overflow-hidden`} title={item.name}>
                      <div className="flex items-center justify-between gap-1 w-full min-w-0" style={{ overflow: 'hidden' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(item.key)}
                          className="no-capture shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title={`Xóa ${item.name} khỏi danh sách`}
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                        <span 
                          className="truncate block flex-1" 
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}
                        >
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                          isSL ? 'bg-amber-100 text-amber-800 border border-amber-200' : theme.dtBadge
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    </td>
                    <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} text-slate-800 ${theme.inputCellBgLight}`}>
                      <input
                        type="number"
                        value={savedTarget > 0 ? savedTarget : ''}
                        onChange={(e) => handleCategoryTargetChange(item.name, Number(e.target.value))}
                        className={`w-full text-center bg-transparent font-black focus:outline-none ${theme.inputFocusBg} rounded py-0.5`}
                        placeholder="0"
                        title={`Nhập mục tiêu cho ${item.name}`}
                      />
                    </td>
                    <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} ${theme.actualValText} font-black`}>
                      {thucHien > 0 ? (isSL ? Math.round(thucHien).toLocaleString() : (Math.round(thucHien * 10) / 10).toLocaleString()) : (isSL ? '0' : '0.0')}
                    </td>
                    <td className={`px-1 py-0 text-center border ${theme.cellBorder}`}>
                      {hasTarget ? (
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] sm:text-[13px] ${
                          rate >= 100 ? theme.rateSuccessBadge : 'bg-rose-100 text-rose-600'
                        }`}>
                          {rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>
                    <td className={`px-1.5 py-0 text-center border ${theme.cellBorder} font-black`}>
                      {hasTarget ? (
                        <span className={remaining > 0 ? 'text-rose-600' : theme.remainingGoodText}>
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
          <div className={`p-3 ${theme.inlineCommentBg} rounded-2xl`}>
            <textarea
              value={inlineComment}
              onChange={(e) => setInlineComment(e.target.value)}
              placeholder="Nhập ghi chú / nhận xét tiến độ đính kèm vào ảnh xuất..."
              className={`w-full p-2.5 rounded-xl text-[12px] font-bold resize-none min-h-[60px] ${theme.inlineCommentArea}`}
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
              <div className={`p-4 sm:p-5 ${theme.modalHeaderBg} text-white flex items-center justify-between shrink-0`}>
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
                    className={`w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 ${theme.modalFocusRing}`}
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
                      className={`px-3 py-1.5 rounded-lg ${theme.modalSelectAllBtn} transition-colors cursor-pointer`}
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
                          isChecked ? `${theme.modalItemCheckedBg} font-black` : 'text-slate-700 hover:bg-slate-50 font-bold'
                        } text-xs sm:text-sm`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isChecked ? (
                            <CheckSquare size={17} className={`${theme.modalItemCheckedIcon} shrink-0`} />
                          ) : (
                            <Square size={17} className="text-slate-400 shrink-0" />
                          )}
                          <span>{cat.name}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          cat.type === 'SL' ? 'bg-amber-100 text-amber-800 border border-amber-200' : theme.dtBadge
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
                  className={`px-6 py-2.5 rounded-xl ${theme.modalConfirmBtn} text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95`}
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
              <div className={`p-4 sm:p-5 ${theme.modalHeaderBg} text-white flex items-center justify-between shrink-0`}>
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
                          ? theme.commentActiveTab
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
                  className={`w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-800 leading-relaxed resize-none outline-none ${theme.commentTextareaFocus}`}
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
                      ? theme.commentCopySuccess
                      : theme.commentCopyBtn
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
