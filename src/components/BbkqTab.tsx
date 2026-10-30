import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  Save,
  History,
  Trash2,
  X,
  ArrowDownCircle,
  Calendar,
  Clock,
  ArrowLeft,
  Scale,
  Download,
  FileText,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  User,
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useNotification } from '../contexts/NotificationContext';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { ImagePreviewModal } from './ImagePreviewModal';
import { getConfiguredStoresFromBoss } from '../services/storeSync';
import {
  BbkqHistoryItem,
  BbkqConflictError,
  BbkqPermissionError,
  resolveAndVerifyWarehouseAccess,
  subscribeBbkqWarehouseDoc,
  saveBbkqRecordTransaction,
  deleteBbkqRecordTransaction,
  fetchBbkqWarehouseRecords,
  computeCountsSignature,
} from '../services/bbkqService';

export type { BbkqHistoryItem };

// Denominations list (VND) with vibrant badge colors matching the reference UI 100%
export const DENOMINATIONS = [
  {
    value: 500000,
    label: '500.000\u00A0đ',
    badgeBg: 'bg-teal-600 text-white',
    textCol: 'text-teal-700',
    mobileBadgeHex: '#0F8A65',
    mobileTextHex: '#0F8A65',
    mobilePlusBg: '#E3F7F0',
    mobilePlusBorder: '#B5E8D6',
    mobilePlusText: '#0F8A65',
  },
  {
    value: 200000,
    label: '200.000\u00A0đ',
    badgeBg: 'bg-rose-600 text-white',
    textCol: 'text-rose-700',
    mobileBadgeHex: '#DF1B41',
    mobileTextHex: '#DF1B41',
    mobilePlusBg: '#FFE6EB',
    mobilePlusBorder: '#FBCFE8',
    mobilePlusText: '#DF1B41',
  },
  {
    value: 100000,
    label: '100.000\u00A0đ',
    badgeBg: 'bg-emerald-600 text-white',
    textCol: 'text-emerald-700',
    mobileBadgeHex: '#128A36',
    mobileTextHex: '#128A36',
    mobilePlusBg: '#E6F7EC',
    mobilePlusBorder: '#BBF7D0',
    mobilePlusText: '#128A36',
  },
  {
    value: 50000,
    label: '50.000\u00A0đ',
    badgeBg: 'bg-orange-500 text-white',
    textCol: 'text-orange-700',
    mobileBadgeHex: '#F27405',
    mobileTextHex: '#E06500',
    mobilePlusBg: '#FFE8E5',
    mobilePlusBorder: '#FECDD3',
    mobilePlusText: '#E11D48',
  },
  {
    value: 20000,
    label: '20.000\u00A0đ',
    badgeBg: 'bg-blue-600 text-white',
    textCol: 'text-blue-700',
    mobileBadgeHex: '#0B57D0',
    mobileTextHex: '#0B57D0',
    mobilePlusBg: '#E6F0FE',
    mobilePlusBorder: '#BFDBFE',
    mobilePlusText: '#0B57D0',
  },
  {
    value: 10000,
    label: '10.000\u00A0đ',
    badgeBg: 'bg-amber-600 text-white',
    textCol: 'text-amber-700',
    mobileBadgeHex: '#E86C00',
    mobileTextHex: '#D96B00',
    mobilePlusBg: '#FFF1DF',
    mobilePlusBorder: '#FDE68A',
    mobilePlusText: '#D96B00',
  },
  {
    value: 5000,
    label: '5.000\u00A0đ',
    badgeBg: 'bg-slate-700 text-white',
    textCol: 'text-slate-800',
    mobileBadgeHex: '#22344A',
    mobileTextHex: '#22344A',
    mobilePlusBg: '#E9EEF5',
    mobilePlusBorder: '#CBD5E1',
    mobilePlusText: '#22344A',
  },
  {
    value: 2000,
    label: '2.000\u00A0đ',
    badgeBg: 'bg-stone-600 text-white',
    textCol: 'text-stone-800',
    mobileBadgeHex: '#6D4C2F',
    mobileTextHex: '#6D4C2F',
    mobilePlusBg: '#F4EAE0',
    mobilePlusBorder: '#E5D3C0',
    mobilePlusText: '#6D4C2F',
  },
  {
    value: 1000,
    label: '1.000\u00A0đ',
    badgeBg: 'bg-zinc-600 text-white',
    textCol: 'text-zinc-800',
    mobileBadgeHex: '#636073',
    mobileTextHex: '#636073',
    mobilePlusBg: '#ECEBF0',
    mobilePlusBorder: '#D5D3DF',
    mobilePlusText: '#636073',
  },
  {
    value: 500,
    label: '500\u00A0đ',
    badgeBg: 'bg-red-500 text-white',
    textCol: 'text-red-700',
    mobileBadgeHex: '#E5322E',
    mobileTextHex: '#E5322E',
    mobilePlusBg: '#FFE8E8',
    mobilePlusBorder: '#FECDD3',
    mobilePlusText: '#E5322E',
  },
];

// Uses non-breaking space (\u00A0) before 'đ' so the currency symbol never wraps onto a new line alone
export const formatMoney = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0\u00A0đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + '\u00A0đ';
};

export const parseMoneyInput = (str: string): number => {
  const clean = str.replace(/[^\d]/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

// Dynamic font-size classes for the 3 overview cards on live mobile/desktop screen (never truncates with '...')
const getLiveCardMoneyClass = (text: string): string => {
  const len = text.length;
  if (len <= 9) {
    return 'text-[16px] min-[375px]:text-[18px] sm:text-[21px]';
  }
  if (len <= 12) {
    return 'text-[13px] min-[375px]:text-[14.5px] min-[410px]:text-[16px] sm:text-[19px]';
  }
  if (len <= 14) {
    return 'text-[11.5px] min-[375px]:text-[13px] min-[410px]:text-[14.5px] sm:text-[17.5px]';
  }
  return 'text-[10.5px] min-[375px]:text-[11.5px] min-[410px]:text-[13px] sm:text-[15.5px]';
};

// Dynamic font-size (px) for the 3 overview cards inside the 540px dedicated Export DOM
const getExportCardMoneyFontSize = (text: string): string => {
  const len = text.length;
  if (len <= 9) return '20px';
  if (len <= 12) return '17.5px';
  if (len <= 14) return '16px';
  if (len <= 16) return '14px';
  return '12.5px';
};

// Crisp Banknote Icon SVG matching the reference image
const BanknoteBadgeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={Math.round(size * 0.72)}
    viewBox="0 0 20 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <rect
      x="1"
      y="1"
      width="18"
      height="12"
      rx="2.5"
      stroke={color}
      strokeWidth="1.8"
    />
    <circle cx="10" cy="7" r="2.5" stroke={color} strokeWidth="1.6" />
  </svg>
);

const STORAGE_KEY_BBKQ_DRAFT_PREFIX = 'crm_bbkq_cash_draft_v2';
const STORAGE_KEY_BBKQ_HISTORY_PREFIX = 'crm_bbkq_history_v2';

const getEmptyCounts = (): Record<number, number> => ({
  500000: 0,
  200000: 0,
  100000: 0,
  50000: 0,
  20000: 0,
  10000: 0,
  5000: 0,
  2000: 0,
  1000: 0,
  500: 0,
});

export default function BbkqTab() {
  const { userProfile } = useAuth();
  const { currentStoreId } = useStore();
  const { showNotification } = useNotification();

  // Track URL query string changes so changing ?kho= is immediately detected
  const [urlSearch, setUrlSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.search : ''
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncUrlSearch = () => setUrlSearch(window.location.search);
    window.addEventListener('popstate', syncUrlSearch);
    return () => window.removeEventListener('popstate', syncUrlSearch);
  }, []);

  // Verify warehouse isolation & user authorization against URL ?kho=
  const warehouseAccess = useMemo(
    () => resolveAndVerifyWarehouseAccess(userProfile, urlSearch),
    [userProfile, urlSearch]
  );

  const storeCode = warehouseAccess.effectiveKho;
  const staffId = warehouseAccess.staffId;

  // Resolve store name isolated to the authorized warehouse
  const storeName = useMemo(() => {
    if (
      currentStoreId &&
      currentStoreId !== 'ALL' &&
      warehouseAccess.authorized &&
      (!warehouseAccess.requestedUrlKho ||
        warehouseAccess.requestedUrlKho === warehouseAccess.userKho)
    ) {
      return currentStoreId;
    }
    if (
      userProfile?.ten_sieu_thi &&
      (!warehouseAccess.requestedUrlKho ||
        warehouseAccess.requestedUrlKho === warehouseAccess.userKho)
    ) {
      return userProfile.ten_sieu_thi;
    }
    if (storeCode) {
      const bossStores = getConfiguredStoresFromBoss(storeCode);
      if (bossStores && bossStores.length > 0) {
        return bossStores[0];
      }
    }
    return userProfile?.ten_sieu_thi || storeCode || '';
  }, [currentStoreId, userProfile, storeCode, warehouseAccess]);

  // Warehouse-isolated LocalStorage keys
  const draftStorageKey = useMemo(
    () =>
      storeCode
        ? `${STORAGE_KEY_BBKQ_DRAFT_PREFIX}::KHO_${storeCode}`
        : STORAGE_KEY_BBKQ_DRAFT_PREFIX,
    [storeCode]
  );
  const historyStorageKey = useMemo(
    () =>
      storeCode
        ? `${STORAGE_KEY_BBKQ_HISTORY_PREFIX}::KHO_${storeCode}`
        : STORAGE_KEY_BBKQ_HISTORY_PREFIX,
    [storeCode]
  );

  // Current date string (DD/MM/YYYY) constructed safely
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  }, []);

  // Denominations counts
  const [counts, setCounts] = useState<Record<number, number>>(() => getEmptyCounts());
  const [erpTotal, setErpTotal] = useState<number>(0);

  // Optimistic Concurrency Tracking for the currently active/loaded record
  const [activeRecordKey, setActiveRecordKey] = useState<string | null>(null);
  const [activeRecordVersion, setActiveRecordVersion] = useState<number | null>(null);
  const [conflictRecord, setConflictRecord] = useState<BbkqHistoryItem | null>(null);

  const activeRecordKeyRef = useRef<string | null>(null);
  activeRecordKeyRef.current = activeRecordKey;
  const activeRecordVersionRef = useRef<number | null>(null);
  activeRecordVersionRef.current = activeRecordVersion;
  const baseSavedSigRef = useRef<string>('');
  const lastSavedSignatureRef = useRef<string>('');
  const isSavingRef = useRef<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Input editing state so clearing an input does not force '0' back while typing
  const [focusedDenom, setFocusedDenom] = useState<number | null>(null);
  const [editingCountStr, setEditingCountStr] = useState<string>('');
  const [isErpFocused, setIsErpFocused] = useState(false);
  const [editingErpStr, setEditingErpStr] = useState<string>('');

  // History state (synced with Firestore per warehouse)
  const [historyList, setHistoryList] = useState<BbkqHistoryItem[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Preview & Export
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportDomRef = useRef<HTMLDivElement>(null);

  // Load warehouse-isolated draft & cached history when storeCode changes
  useEffect(() => {
    if (!warehouseAccess.authorized || !storeCode) {
      setCounts(getEmptyCounts());
      setErpTotal(0);
      setHistoryList([]);
      setActiveRecordKey(null);
      setActiveRecordVersion(null);
      setConflictRecord(null);
      return;
    }

    try {
      const savedDraft = localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setCounts(parsed.counts || getEmptyCounts());
        setErpTotal(typeof parsed.erpTotal === 'number' ? parsed.erpTotal : 0);
        setActiveRecordKey(parsed.activeRecordKey || null);
        setActiveRecordVersion(
          typeof parsed.activeRecordVersion === 'number' ? parsed.activeRecordVersion : null
        );
        baseSavedSigRef.current = parsed.baseSavedSig || '';
      } else {
        setCounts(getEmptyCounts());
        setErpTotal(0);
        setActiveRecordKey(null);
        setActiveRecordVersion(null);
        baseSavedSigRef.current = '';
      }
    } catch {
      setCounts(getEmptyCounts());
      setErpTotal(0);
    }

    try {
      const savedHist = localStorage.getItem(historyStorageKey);
      if (savedHist) {
        const parsedHist = JSON.parse(savedHist);
        if (Array.isArray(parsedHist)) {
          setHistoryList(parsedHist.filter(item => item && item.storeCode === storeCode));
        }
      } else {
        setHistoryList([]);
      }
    } catch {
      setHistoryList([]);
    }
  }, [warehouseAccess.authorized, storeCode, draftStorageKey, historyStorageKey]);

  // Save draft to warehouse-isolated localStorage
  useEffect(() => {
    if (!warehouseAccess.authorized || !storeCode) return;
    try {
      localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          counts,
          erpTotal,
          activeRecordKey,
          activeRecordVersion,
          baseSavedSig: baseSavedSigRef.current,
        })
      );
    } catch {
      // ignore quota error
    }
  }, [counts, erpTotal, activeRecordKey, activeRecordVersion, warehouseAccess.authorized, storeCode, draftStorageKey]);

  // Keep latest counts & erpTotal in a ref for snapshot conflict checks without re-subscribing
  const currentDataSigRef = useRef<string>('');
  currentDataSigRef.current = computeCountsSignature(counts, erpTotal);

  // Single Real-Time Firestore Subscription per authorized warehouse
  useEffect(() => {
    if (!warehouseAccess.authorized || !storeCode) return;

    const unsubscribe = subscribeBbkqWarehouseDoc(
      storeCode,
      serverRecords => {
        setHistoryList(serverRecords);
        try {
          localStorage.setItem(historyStorageKey, JSON.stringify(serverRecords));
        } catch {
          // ignore
        }

        // Check if the currently active record was modified by another user
        const curKey = activeRecordKeyRef.current;
        const curVer = activeRecordVersionRef.current;
        if (curKey && curVer !== null) {
          const matchingServerRec = serverRecords.find(
            r => (r.recordKey || r.id) === curKey
          );
          if (matchingServerRec && matchingServerRec.version > curVer) {
            const serverSig = computeCountsSignature(
              matchingServerRec.counts,
              matchingServerRec.erpTotal
            );
            const localSig = currentDataSigRef.current;
            const hasLocalUnsavedEdits =
              baseSavedSigRef.current !== '' && localSig !== baseSavedSigRef.current;

            if (!hasLocalUnsavedEdits || serverSig === localSig) {
              // No conflicting local edits: seamlessly adopt the newer server state & version
              setCounts(matchingServerRec.counts || getEmptyCounts());
              setErpTotal(matchingServerRec.erpTotal || 0);
              setActiveRecordVersion(matchingServerRec.version);
              baseSavedSigRef.current = serverSig;
              lastSavedSignatureRef.current = serverSig;
              setConflictRecord(null);
            } else {
              // User has unsaved local edits while another user updated the same record -> flag conflict!
              setConflictRecord(matchingServerRec);
            }
          }
        }
      },
      err => {
        console.warn('[BbkqTab] Realtime subscription error:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [warehouseAccess.authorized, storeCode, historyStorageKey]);

  // Calculations
  const totalActual = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.value] || 0) * d.value, 0);
  const totalBills = Object.values(counts).reduce((sum, c) => sum + (c || 0), 0);

  const discrepancy = totalActual - erpTotal;
  const isBalanced = erpTotal > 0 && Math.abs(discrepancy) === 0;
  const isSurplus = erpTotal > 0 && discrepancy > 0;

  const formattedActual = formatMoney(totalActual);
  const formattedErp = formatMoney(erpTotal);
  const formattedDiscrepancy =
    erpTotal === 0
      ? formatMoney(0)
      : discrepancy > 0
        ? `+${formatMoney(discrepancy)}`
        : formatMoney(discrepancy);

  // Handlers for Count Changes
  const handleCountChange = (val: number, delta: number) => {
    setCounts(prev => {
      const nextVal = Math.max(0, (prev[val] || 0) + delta);
      if (focusedDenom === val) {
        setEditingCountStr(String(nextVal));
      }
      return {
        ...prev,
        [val]: nextVal,
      };
    });
  };

  const handleSetCount = (val: number, directCount: number) => {
    setCounts(prev => ({
      ...prev,
      [val]: Math.max(0, isNaN(directCount) ? 0 : directCount),
    }));
  };

  // 1. Chức năng XÓA SỐ TỜ ALL (Bắt đầu phiên đếm mới sạch sẽ)
  const handleClearAllCounts = () => {
    setCounts(getEmptyCounts());
    setFocusedDenom(null);
    setEditingCountStr('');
    setActiveRecordKey(null);
    setActiveRecordVersion(null);
    setConflictRecord(null);
    baseSavedSigRef.current = '';
    lastSavedSignatureRef.current = '';
    showNotification('Đã xóa tất cả số tờ về 0 (Bắt đầu lượt kiểm mới)!', 'success');
  };

  // Tải dữ liệu mới nhất từ server khi có xung đột phiên bản
  const handleReloadConflictRecord = useCallback(async () => {
    if (conflictRecord) {
      const sig = computeCountsSignature(conflictRecord.counts, conflictRecord.erpTotal);
      setCounts(conflictRecord.counts || getEmptyCounts());
      setErpTotal(conflictRecord.erpTotal || 0);
      setActiveRecordKey(conflictRecord.recordKey || conflictRecord.id);
      setActiveRecordVersion(conflictRecord.version || 1);
      baseSavedSigRef.current = sig;
      lastSavedSignatureRef.current = sig;
      setConflictRecord(null);
      showNotification(
        `Đã tải dữ liệu mới nhất (v${conflictRecord.version}) từ ${conflictRecord.staffId || 'hệ thống'}!`,
        'success'
      );
      return;
    }

    if (!storeCode) return;
    try {
      const latestList = await fetchBbkqWarehouseRecords(storeCode);
      setHistoryList(latestList);
      if (activeRecordKey) {
        const found = latestList.find(r => (r.recordKey || r.id) === activeRecordKey);
        if (found) {
          const sig = computeCountsSignature(found.counts, found.erpTotal);
          setCounts(found.counts || getEmptyCounts());
          setErpTotal(found.erpTotal || 0);
          setActiveRecordVersion(found.version || 1);
          baseSavedSigRef.current = sig;
          lastSavedSignatureRef.current = sig;
        }
      }
      setConflictRecord(null);
      showNotification('Đã đồng bộ dữ liệu mới nhất từ máy chủ!', 'success');
    } catch {
      showNotification('Không thể tải dữ liệu mới, vui lòng kiểm tra kết nối mạng!', 'error');
    }
  }, [conflictRecord, storeCode, activeRecordKey, showNotification]);

  // 2. Chức năng LƯU LỊCH SỬ KIỂM TRONG NGÀY (Atomic Firestore Transaction + Anti-Duplicate + Concurrency Check)
  const handleSaveHistory = async () => {
    if (!warehouseAccess.authorized || !storeCode) {
      showNotification(
        warehouseAccess.reason || 'Bạn không có quyền lưu dữ liệu vào mã kho này!',
        'error'
      );
      return;
    }

    if (totalActual === 0 && erpTotal === 0) {
      showNotification('Vui lòng nhập số tờ hoặc tiền ERP trước khi lưu lịch sử!', 'warning');
      return;
    }

    // In-flight lock to block rapid double/triple clicks
    if (isSavingRef.current) {
      return;
    }

    // If a remote conflict was already detected on the active record, block silent overwrite
    if (conflictRecord) {
      showNotification(
        'Phát hiện xung đột dữ liệu: Bản ghi này vừa được người khác cập nhật. Vui lòng tải dữ liệu mới nhất trước khi tiếp tục!',
        'warning'
      );
      return;
    }

    const currentSig = computeCountsSignature(counts, erpTotal);

    // Prevent redundant network write if user clicks Save repeatedly without changing any data
    if (activeRecordKey && lastSavedSignatureRef.current === currentSig) {
      showNotification(
        'Dữ liệu kiểm tiền hiện tại đã được lưu đồng bộ, không có thay đổi mới!',
        'success'
      );
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    try {
      const result = await saveBbkqRecordTransaction({
        storeCode,
        storeName,
        staffId,
        dateStr,
        timeStr,
        counts: { ...counts },
        totalActual,
        totalBills,
        erpTotal,
        discrepancy,
        existingRecordKey: activeRecordKey,
        expectedVersion: activeRecordVersion,
      });

      const saved = result.savedRecord;
      setActiveRecordKey(saved.recordKey || saved.id);
      setActiveRecordVersion(saved.version);
      baseSavedSigRef.current = currentSig;
      lastSavedSignatureRef.current = currentSig;
      setConflictRecord(null);
      setHistoryList(result.allRecords);

      try {
        localStorage.setItem(historyStorageKey, JSON.stringify(result.allRecords));
      } catch {
        // ignore
      }

      if (result.wasDeduplicated) {
        showNotification(
          `Bản ghi kiểm tiền (${formatMoney(totalActual)}) đã tồn tại và được đồng bộ (chống tạo trùng)!`,
          'success'
        );
      } else if (result.wasUpdated) {
        showNotification(
          `Đã cập nhật bản ghi kiểm tiền lúc ${saved.timeStr} (v${saved.version} · ${formatMoney(totalActual)})!`,
          'success'
        );
      } else {
        showNotification(
          `Đã lưu lịch sử kiểm tiền lúc ${saved.timeStr}! (${formatMoney(totalActual)})`,
          'success'
        );
      }
    } catch (err: any) {
      if (err instanceof BbkqConflictError) {
        setConflictRecord(err.serverRecord);
        showNotification(err.message, 'warning');
      } else if (err instanceof BbkqPermissionError) {
        showNotification(err.message, 'error');
      } else {
        console.error('[BbkqTab] Save error:', err);
        showNotification(
          err?.message?.includes('NETWORK_')
            ? err.message.replace(/^NETWORK_[A-Z]+:\s*/, '')
            : 'Lỗi kết nối khi lưu lên máy chủ! Dữ liệu trên màn hình vẫn được giữ nguyên, vui lòng thử lưu lại.',
          'error'
        );
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // 3. Tải lại bản ghi từ lịch sử vào bảng (kèm khóa recordKey & version để cập nhật đúng bản ghi đó)
  const handleLoadHistoryRecord = (item: BbkqHistoryItem) => {
    const loadedCounts = item.counts || getEmptyCounts();
    const loadedErp = item.erpTotal || 0;
    const sig = computeCountsSignature(loadedCounts, loadedErp);

    setCounts(loadedCounts);
    setErpTotal(loadedErp);
    setActiveRecordKey(item.recordKey || item.id);
    setActiveRecordVersion(item.version || 1);
    setConflictRecord(null);
    baseSavedSigRef.current = sig;
    lastSavedSignatureRef.current = sig;
    setIsHistoryModalOpen(false);
    showNotification(
      `Đã nạp bản ghi lúc ${item.timeStr} (${item.dateStr} · v${item.version || 1}). Khi bấm Lưu sẽ cập nhật trực tiếp bản ghi này!`,
      'success'
    );
  };

  // Xóa 1 bản ghi lịch sử (Atomic Transaction per recordKey)
  const handleDeleteHistoryItem = async (idOrKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!warehouseAccess.authorized || !storeCode) return;

    try {
      const updated = await deleteBbkqRecordTransaction({
        storeCode,
        recordKey: idOrKey,
        staffId,
      });
      setHistoryList(updated);
      if (activeRecordKey === idOrKey) {
        setActiveRecordKey(null);
        setActiveRecordVersion(null);
        baseSavedSigRef.current = '';
        lastSavedSignatureRef.current = '';
      }
      try {
        localStorage.setItem(historyStorageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      showNotification('Đã xóa bản ghi khỏi lịch sử kho!', 'success');
    } catch (err: any) {
      console.error('[BbkqTab] Delete record error:', err);
      showNotification(
        'Không thể xóa bản ghi do lỗi kết nối mạng. Vui lòng thử lại!',
        'error'
      );
    }
  };

  // Copy Zalo Text
  const handleCopyZalo = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    let text = `💵 BẢNG KIỂM KÊ TIỀN MẶT THU NGÂN\n`;
    text += `🏢 Siêu thị: ${storeName} (Kho ${storeCode})\n`;
    text += `⏰ Thời gian: ${timeStr}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 CHI TIẾT MỆNH GIÁ:\n`;

    DENOMINATIONS.forEach(d => {
      const count = counts[d.value] || 0;
      if (count > 0) {
        text += `  • ${d.label}: ${count} tờ = ${formatMoney(count * d.value)}\n`;
      }
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 TỔNG TIỀN MẶT THỰC ĐẾM: ${formatMoney(totalActual)} (${totalBills} tờ)\n`;
    text += `📑 TỔNG TIỀN THEO ERP: ${formatMoney(erpTotal)}\n`;

    if (erpTotal === 0) {
      text += `🎯 KẾT QUẢ: Chưa nhập tiền ERP\n`;
    } else if (isBalanced) {
      text += `🎯 KẾT QUẢ: 0 đ (KHỚP QUỸ 100% ✅)\n`;
    } else if (isSurplus) {
      text += `🎯 KẾT QUẢ: DƯ +${formatMoney(discrepancy)} ⚠️\n`;
    } else {
      text += `🎯 KẾT QUẢ: THIẾU ${formatMoney(discrepancy)} 🚨\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `(Xuất tự động từ CRM Siêu Thị)`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        showNotification('Đã copy báo cáo kiểm tiền Zalo!', 'success');
      })
      .catch(() => {
        showNotification('Không thể copy, vui lòng thử lại!', 'error');
      });
  };

  // Export Image HD using the dedicated Export DOM (exportDomRef)
  const handleExportImage = async () => {
    if (!exportDomRef.current) return;
    try {
      setIsExporting(true);
      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 120));

      const node = exportDomRef.current;
      const clone = node.cloneNode(true) as HTMLElement;

      // Ensure any accidental summary block is removed from clone
      clone.querySelectorAll('[data-export-exclude="true"]').forEach(el => el.remove());

      // Zero-Shadow Export: remove boxShadow, textShadow, filter across all nodes
      clone.style.boxShadow = 'none';
      clone.style.textShadow = 'none';
      clone.style.filter = 'none';
      clone.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.filter = 'none';
        htmlEl.style.scrollbarWidth = 'none';
        (htmlEl.style as any).msOverflowStyle = 'none';
      });

      const styleTag = document.createElement('style');
      styleTag.innerHTML = `
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
          box-sizing: border-box !important;
        }
        *::-webkit-scrollbar {
          display: none !important;
          width: 0px !important;
          height: 0px !important;
        }
      `;

      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = '0px';
      frameWrapper.style.margin = '0px';
      frameWrapper.style.backgroundColor = '#EEF4FF';
      frameWrapper.style.boxShadow = 'none';
      frameWrapper.style.display = 'inline-block';
      frameWrapper.style.width = '540px';
      frameWrapper.style.height = 'auto';
      frameWrapper.style.boxSizing = 'border-box';
      frameWrapper.appendChild(styleTag);
      frameWrapper.appendChild(clone);

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-99999px';
      tempContainer.style.top = '0';
      tempContainer.style.zIndex = '-1000';
      tempContainer.appendChild(frameWrapper);
      document.body.appendChild(tempContainer);

      await new Promise(r => setTimeout(r, 180));

      const dataUrl = await htmlToImage.toPng(frameWrapper, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#EEF4FF',
        style: EXPORT_FONT_STYLE,
      });

      document.body.removeChild(tempContainer);
      setPreviewImageUrl(dataUrl);
    } catch (err) {
      console.error('Export error:', err);
      showNotification('Không thể xuất ảnh bảng kê, vui lòng thử lại!', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleMobileBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'realtime' }));
    }
  };

  // Block unauthorized cross-warehouse URL access (?kho=...)
  if (!warehouseAccess.authorized) {
    return (
      <div className="w-full max-w-lg mx-auto p-6 mt-8 font-sans">
        <div className="bg-white rounded-3xl p-8 border-2 border-rose-200 shadow-lg text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            TỪ CHỐI TRUY CẬP KHO {warehouseAccess.requestedUrlKho || ''}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            {warehouseAccess.reason}
          </p>
          {warehouseAccess.userKho && (
            <button
              type="button"
              onClick={() => {
                const targetUrl = `/bbkq?kho=${encodeURIComponent(warehouseAccess.userKho)}`;
                window.history.replaceState({}, '', targetUrl);
                setUrlSearch(`?kho=${encodeURIComponent(warehouseAccess.userKho)}`);
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Chuyển về Kho {warehouseAccess.userKho} của bạn
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-sans">
      {/* =====================================================================
          1. LIVE INTERACTIVE UI (MOBILE + DESKTOP)
         ===================================================================== */}
      <div
        className="w-full max-w-[680px] mx-auto min-h-screen md:min-h-0 bg-gradient-to-b from-[#EBF3FF] via-[#F2F7FF] to-[#F6F9FC] md:rounded-[28px] md:border md:border-[#D5E5FF] md:shadow-[0_12px_36px_rgba(15,23,42,0.06)] p-2.5 min-[375px]:p-3.5 sm:p-5 space-y-3 overflow-x-hidden"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* ── CONFLICT ALERT BANNER (When another user modified the active record) ── */}
        {conflictRecord && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-[18px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-snug">
                <div className="font-black uppercase">
                  Phát hiện thay đổi mới từ người dùng khác (v{conflictRecord.version})
                </div>
                <div className="text-[11px] font-medium text-amber-800 mt-0.5">
                  Bản ghi đang mở vừa được cập nhật ({formatMoney(conflictRecord.totalActual)} · ERP:{' '}
                  {formatMoney(conflictRecord.erpTotal)}). Vui lòng tải bản mới nhất trước khi lưu tiếp!
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 justify-end">
              <button
                type="button"
                onClick={handleReloadConflictRecord}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all"
              >
                <RefreshCw size={12} />
                Tải bản mới nhất
              </button>
              <button
                type="button"
                onClick={() => {
                  // Detach from old record so user can save their work as a separate new record
                  setActiveRecordKey(null);
                  setActiveRecordVersion(null);
                  setConflictRecord(null);
                  showNotification(
                    'Đã tách thành lượt kiểm mới độc lập để không ghi đè bản ghi của người trước!',
                    'success'
                  );
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-[11px] font-bold hover:bg-amber-100 cursor-pointer transition-all"
              >
                Tạo bản ghi riêng
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION 1: HERO HEADER CARD ── */}
        <div
          className="relative overflow-hidden rounded-[20px] px-3.5 sm:px-5 py-4 text-white"
          style={{
            background: 'linear-gradient(135deg, #0A4FD6 0%, #1567F5 55%, #3888FF 100%)',
          }}
        >
          {/* Subtle geometric background shapes */}
          <div
            className="pointer-events-none absolute -top-12 -right-10 w-44 h-44 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #93C5FD 0%, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-10 right-12 w-32 h-32 rotate-12 rounded-2xl opacity-10"
            style={{ background: '#FFFFFF' }}
          />

          <div className="relative z-10 flex items-center justify-between gap-2.5">
            {/* Left group: Back button + BBKQ Title & Store Details */}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleMobileBack}
                aria-label="Quay lại"
                className="w-8 h-8 rounded-full bg-white/90 text-[#1459E6] flex items-center justify-center shrink-0 active:scale-95 transition-transform mt-0.5 cursor-pointer"
              >
                <ArrowLeft size={17} strokeWidth={2.6} />
              </button>

              <div className="min-w-0 flex-1">
                {/* BBKQ Aqua Badge */}
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider text-white"
                  style={{ background: 'linear-gradient(90deg, #17C8AC 0%, #2CE0C3 100%)' }}
                >
                  BBKQ
                </span>

                {/* Main Title */}
                <h1 className="text-[17px] min-[375px]:text-[19px] sm:text-[22px] font-black text-white uppercase tracking-tight leading-[1.2] mt-1">
                  KIỂM KÊ TIỀN MẶT THU NGÂN
                </h1>

                {/* Store Name */}
                <p className="text-[12px] min-[375px]:text-[13px] sm:text-[14px] font-bold text-white/95 truncate mt-1">
                  {storeName || 'Chưa cấu hình siêu thị'}
                </p>

                {/* Warehouse & Date */}
                <p className="text-[11.5px] min-[375px]:text-[12px] sm:text-[12.5px] font-semibold text-blue-100/95 truncate mt-0.5">
                  Kho: <span className="font-bold text-white">{storeCode || '---'}</span>
                  <span className="mx-1.5 opacity-75">|</span>
                  Ngày kiểm kê: <span className="font-bold text-white">{todayDateStr}</span>
                </p>
              </div>
            </div>

            {/* Right: 3D-style Cash Stack & Gold Coins Illustration */}
            <div className="shrink-0 flex items-center justify-center pointer-events-none select-none">
              <svg
                width="74"
                height="66"
                viewBox="0 0 92 82"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Sparkles */}
                <path d="M14 20L15.5 24.5L20 26L15.5 27.5L14 32L12.5 27.5L8 26L12.5 24.5L14 20Z" fill="#93C5FD" fillOpacity="0.8" />
                <path d="M82 36L83 39L86 40L83 41L82 44L81 41L78 40L81 39L82 36Z" fill="#93C5FD" fillOpacity="0.8" />
                {/* Stacked Green Banknotes */}
                <rect x="22" y="24" width="58" height="35" rx="6" transform="rotate(-8 22 24)" fill="#059669" />
                <rect x="22" y="19" width="58" height="35" rx="6" transform="rotate(-8 22 19)" fill="#10B981" />
                <rect x="22" y="14" width="58" height="35" rx="6" transform="rotate(-8 22 14)" fill="#34D399" stroke="#A7F3D0" strokeWidth="1.5" />
                <circle cx="52" cy="27" r="8.5" fill="#059669" fillOpacity="0.45" />
                {/* Gold Coins Stack Left */}
                <ellipse cx="28" cy="64" rx="13" ry="4.5" fill="#D97706" />
                <rect x="15" y="56" width="26" height="8" fill="#F59E0B" />
                <ellipse cx="28" cy="56" rx="13" ry="4.5" fill="#FBBF24" />
                <rect x="15" y="48" width="26" height="8" fill="#F59E0B" />
                <ellipse cx="28" cy="48" rx="13" ry="4.5" fill="#FDE047" />
                {/* Gold Coin Front Right */}
                <circle cx="52" cy="56" r="13.5" fill="#F59E0B" stroke="#FDE047" strokeWidth="2" />
                <circle cx="52" cy="56" r="9" fill="#FBBF24" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: NHÓM NÚT CHỨC NĂNG + XÓA SỐ TỜ ALL ── */}
        <div className="bg-white rounded-[18px] p-2.5 border border-[#E2ECF8] shadow-[0_3px_12px_rgba(15,23,42,0.03)] space-y-2">
          <div className="grid grid-cols-4 gap-1.5 min-[375px]:gap-2">
            {/* COPY ZALO */}
            <button
              type="button"
              onClick={handleCopyZalo}
              className="min-w-0 min-h-[42px] py-2 px-1.5 rounded-[12px] text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
              style={{ background: 'linear-gradient(180deg, #1E70FF 0%, #0F58E6 100%)' }}
            >
              <Copy size={13} strokeWidth={2.5} className="shrink-0" />
              <span className="text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-tight whitespace-nowrap truncate">
                COPY ZALO
              </span>
            </button>

            {/* LƯU LỊCH SỬ */}
            <button
              type="button"
              onClick={handleSaveHistory}
              disabled={isSaving}
              className="min-w-0 min-h-[42px] py-2 px-1.5 rounded-[12px] text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
              style={{ background: 'linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)' }}
            >
              <Save size={13} strokeWidth={2.5} className="shrink-0" />
              <span className="text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-tight whitespace-nowrap truncate">
                {isSaving ? 'ĐANG LƯU...' : 'LƯU LỊCH SỬ'}
              </span>
            </button>

            {/* LỊCH SỬ (N) */}
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="min-w-0 min-h-[42px] py-2 px-1.5 rounded-[12px] bg-[#FAF5FF] border border-[#E9D5FF] text-[#6B21A8] flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <History size={13} strokeWidth={2.5} className="shrink-0" />
              <span className="text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-tight whitespace-nowrap truncate">
                LỊCH SỬ ({historyList.length})
              </span>
            </button>

            {/* XUẤT ẢNH */}
            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExporting}
              className="min-w-0 min-h-[42px] py-2 px-1.5 rounded-[12px] text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
              style={{ background: 'linear-gradient(180deg, #129E5A 0%, #0B7E46 100%)' }}
            >
              <Download size={13} strokeWidth={2.5} className="shrink-0" />
              <span className="text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-tight whitespace-nowrap truncate">
                {isExporting ? 'ĐANG XUẤT' : 'XUẤT ẢNH'}
              </span>
            </button>
          </div>

          {/* Hàng riêng phía dưới: XÓA SỐ TỜ ALL */}
          <button
            type="button"
            onClick={handleClearAllCounts}
            className="w-full min-h-[38px] py-1.5 px-3 rounded-[11px] bg-[#FFF1F2] hover:bg-[#FFE4E6] active:scale-[0.99] border border-[#FECDD3] text-[#E11D48] text-[11px] sm:text-[12px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 size={14} strokeWidth={2.5} />
            <span>XÓA SỐ TỜ ALL</span>
          </button>
        </div>

        {/* ── SECTION 3: BA THẺ TỔNG QUAN (3 BALANCED OVERVIEW CARDS) ── */}
        <div className="grid grid-cols-3 gap-2 min-[375px]:gap-2.5 items-stretch">
          {/* Card 1: TỔNG THỰC ĐẾM (TIỀN MẶT) */}
          <div className="min-w-0 rounded-[18px] p-2.5 sm:p-3.5 bg-gradient-to-br from-[#F3FDF7] via-[#EBFBF2] to-[#E2F8EC] border border-[#BDEFD1] flex flex-col justify-between min-h-[112px] sm:min-h-[126px]">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] bg-[#D5F6E2] text-[#0F7638] flex items-center justify-center shrink-0">
                <BanknoteBadgeIcon size={16} color="#0F7638" />
              </div>
              <div className="text-[8.5px] min-[375px]:text-[9.5px] sm:text-[11px] font-black text-slate-800 uppercase leading-[1.2] min-w-0">
                <div className="whitespace-nowrap">TỔNG THỰC ĐẾM</div>
                <div className="whitespace-nowrap text-slate-700">(TIỀN MẶT)</div>
              </div>
            </div>

            <div
              className={`${getLiveCardMoneyClass(formattedActual)} font-black text-[#0B6B32] leading-[1.15] my-2 tracking-tight break-words`}
            >
              {formattedActual}
            </div>

            <div className="text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11.5px] text-slate-600 font-medium leading-[1.25] mt-auto">
              Tổng cộng: <span className="font-black text-slate-900">{totalBills}</span> tờ tiền
            </div>
          </div>

          {/* Card 2: TỔNG TIỀN THEO ERP */}
          <div className="min-w-0 rounded-[18px] p-2.5 sm:p-3.5 bg-gradient-to-br from-[#F3F8FF] via-[#EBF3FF] to-[#E2EEFF] border border-[#C3DCFD] flex flex-col justify-between min-h-[112px] sm:min-h-[126px]">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1459E6] text-white flex items-center justify-center shrink-0">
                <FileText size={14} strokeWidth={2.5} />
              </div>
              <div className="text-[8.5px] min-[375px]:text-[9.5px] sm:text-[11px] font-black text-slate-800 uppercase leading-[1.2] min-w-0">
                <div className="whitespace-nowrap">TỔNG TIỀN</div>
                <div className="whitespace-nowrap">THEO ERP</div>
              </div>
            </div>

            <div className="my-1.5">
              <input
                type="text"
                inputMode="numeric"
                aria-label="Tổng tiền theo ERP"
                value={
                  isErpFocused
                    ? editingErpStr
                    : erpTotal === 0
                      ? '0\u00A0đ'
                      : formattedErp
                }
                placeholder="0 đ"
                onFocus={() => {
                  setIsErpFocused(true);
                  setEditingErpStr(erpTotal === 0 ? '' : new Intl.NumberFormat('vi-VN').format(erpTotal));
                }}
                onBlur={() => {
                  setIsErpFocused(false);
                }}
                onChange={e => {
                  const parsed = parseMoneyInput(e.target.value);
                  setErpTotal(parsed);
                  setEditingErpStr(
                    parsed === 0 && e.target.value === '' ? '' : new Intl.NumberFormat('vi-VN').format(parsed)
                  );
                }}
                className={`w-full bg-white/80 focus:bg-white border border-blue-200/90 focus:border-blue-600 rounded-lg px-1.5 py-0.5 ${getLiveCardMoneyClass(formattedErp)} font-black text-[#0B46C4] leading-[1.15] tracking-tight outline-none transition-all`}
              />
            </div>

            <div className="text-[9.5px] min-[375px]:text-[10px] sm:text-[11px] leading-[1.25] text-slate-600 font-medium mt-auto">
              Nhập số liệu từ phần mềm POS
            </div>
          </div>

          {/* Card 3: CHÊNH LỆCH TIỀN */}
          <div className="min-w-0 rounded-[18px] p-2.5 sm:p-3.5 bg-gradient-to-br from-[#FFFDF7] via-[#FFF7E8] to-[#FFEFD6] border border-[#FCD6A4] flex flex-col justify-between min-h-[112px] sm:min-h-[126px]">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                <Scale size={14} strokeWidth={2.5} />
              </div>
              <div className="text-[8.5px] min-[375px]:text-[9.5px] sm:text-[11px] font-black text-[#7C2D12] uppercase leading-[1.2] min-w-0">
                <div className="whitespace-nowrap">CHÊNH LỆCH</div>
                <div className="whitespace-nowrap">TIỀN</div>
              </div>
            </div>

            <div
              className={`${getLiveCardMoneyClass(formattedDiscrepancy)} font-black text-[#C83E00] leading-[1.15] my-2 tracking-tight break-words`}
            >
              {formattedDiscrepancy}
            </div>

            <div className="text-[9.5px] min-[375px]:text-[10px] sm:text-[11px] font-extrabold text-slate-700 uppercase tracking-tight leading-[1.25] mt-auto">
              THỰC ĐẾM - ERP
            </div>
          </div>
        </div>

        {/* ── SECTION 4: BẢNG KÊ TIỀN MẶT THEO MỆNH GIÁ CARD ── */}
        <div className="bg-white rounded-[20px] p-3 sm:p-4 border border-[#E2ECF8] shadow-[0_4px_18px_rgba(15,23,42,0.03)]">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#E6F8EE] text-[#0F8A5F] flex items-center justify-center shrink-0">
                <BanknoteBadgeIcon size={18} color="#0F8A5F" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[13px] min-[375px]:text-[14px] sm:text-[16px] font-black text-slate-900 uppercase tracking-tight truncate">
                  BẢNG KÊ TIỀN MẶT THEO MỆNH GIÁ
                </h2>
                <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 truncate">
                  {storeName} • Mã Kho: {storeCode}
                </p>
              </div>
            </div>

            {activeRecordKey && (
              <span className="shrink-0 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold">
                Đang sửa bản ghi (v{activeRecordVersion || 1})
              </span>
            )}
          </div>

          {/* Table Column Header Row */}
          <div className="grid grid-cols-[104px_1fr_84px] min-[375px]:grid-cols-[118px_1fr_98px] min-[410px]:grid-cols-[126px_1fr_110px] sm:grid-cols-[144px_1fr_140px] items-center py-2 px-1.5 bg-[#F8FAFC] rounded-lg mt-2 text-[9.5px] min-[375px]:text-[10px] sm:text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            <div className="pl-1">MỆNH GIÁ</div>
            <div className="text-center">SỐ LƯỢNG (TỜ)</div>
            <div className="text-right pr-1">THÀNH TIỀN</div>
          </div>

          {/* 10 Denomination Rows */}
          <div className="divide-y divide-slate-100">
            {DENOMINATIONS.map((denom, idx) => {
              const count = counts[denom.value] || 0;
              const lineTotal = count * denom.value;
              const isFocused = focusedDenom === denom.value;
              const displayCount = isFocused ? editingCountStr : String(count);

              return (
                <div
                  key={denom.value}
                  className={`grid grid-cols-[104px_1fr_84px] min-[375px]:grid-cols-[118px_1fr_98px] min-[410px]:grid-cols-[126px_1fr_110px] sm:grid-cols-[144px_1fr_140px] items-center py-2 px-1 min-w-0 ${
                    idx % 2 === 1 ? 'bg-[#F8FAFC]/50' : 'bg-white'
                  }`}
                >
                  {/* Col 1: Denomination Badge */}
                  <div className="pr-1 min-w-0">
                    <div
                      className="w-full h-[32px] min-[375px]:h-[34px] px-2 rounded-[9px] text-white font-extrabold text-[11px] min-[375px]:text-[12.5px] sm:text-[13.5px] flex items-center gap-1.5 whitespace-nowrap"
                      style={{ backgroundColor: denom.mobileBadgeHex }}
                    >
                      <BanknoteBadgeIcon size={15} color="#FFFFFF" />
                      <span className="truncate">{denom.label}</span>
                    </div>
                  </div>

                  {/* Col 2: Quantity Stepper (- [input] +) */}
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleCountChange(denom.value, -1)}
                      aria-label={`Giảm số tờ ${denom.label}`}
                      className="w-[28px] h-[32px] min-[375px]:w-[32px] min-[375px]:h-[34px] rounded-[8px] bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 border border-slate-200/90 text-slate-600 font-bold text-base flex items-center justify-center shrink-0 cursor-pointer select-none"
                    >
                      −
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label={`Số lượng tờ ${denom.label}`}
                      value={displayCount}
                      placeholder="0"
                      onFocus={e => {
                        setFocusedDenom(denom.value);
                        setEditingCountStr(count === 0 ? '' : String(count));
                        setTimeout(() => e.target.select(), 0);
                      }}
                      onBlur={() => {
                        setFocusedDenom(null);
                      }}
                      onChange={e => {
                        const cleanDigits = e.target.value.replace(/[^\d]/g, '');
                        setEditingCountStr(cleanDigits);
                        const numericVal = cleanDigits === '' ? 0 : parseInt(cleanDigits, 10);
                        handleSetCount(denom.value, numericVal);
                      }}
                      className="w-[44px] min-[375px]:w-[52px] min-[410px]:w-[58px] sm:w-[70px] h-[32px] min-[375px]:h-[34px] rounded-[8px] bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-center font-extrabold text-[13px] min-[375px]:text-[13.5px] sm:text-[14px] text-slate-900 outline-none transition-all shrink-0"
                    />

                    <button
                      type="button"
                      onClick={() => handleCountChange(denom.value, 1)}
                      aria-label={`Tăng số tờ ${denom.label}`}
                      style={{
                        backgroundColor: denom.mobilePlusBg,
                        borderColor: denom.mobilePlusBorder,
                        color: denom.mobilePlusText,
                      }}
                      className="w-[28px] h-[32px] min-[375px]:w-[32px] min-[375px]:h-[34px] rounded-[8px] active:scale-95 border font-bold text-base flex items-center justify-center shrink-0 cursor-pointer select-none"
                    >
                      +
                    </button>
                  </div>

                  {/* Col 3: Line Total */}
                  <div
                    className="text-right pr-1 font-extrabold text-[11.5px] min-[375px]:text-[12.5px] min-[410px]:text-[13.5px] sm:text-[14.5px] whitespace-nowrap"
                    style={{ color: denom.mobileTextHex }}
                  >
                    {formatMoney(lineTotal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. DEDICATED EXPORT DOM (540px FIXED WIDTH, ZERO SUMMARY FOOTER,
             BALANCED 3 OVERVIEW CARDS, ENDS CLEANLY AT DENOMINATION TABLE)
         ===================================================================== */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          zIndex: -1000,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          ref={exportDomRef}
          style={{
            width: '540px',
            minWidth: '540px',
            maxWidth: '540px',
            height: 'auto',
            padding: '14px',
            background: 'linear-gradient(180deg, #EBF3FF 0%, #F2F7FF 55%, #F6F9FC 100%)',
            fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxSizing: 'border-box',
          }}
        >
          {/* 1. EXPORT HEADER CARD */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '20px',
              padding: '18px 20px',
              background: 'linear-gradient(135deg, #0A4FD6 0%, #1567F5 55%, #3888FF 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  background: 'linear-gradient(90deg, #17C8AC 0%, #2CE0C3 100%)',
                }}
              >
                BBKQ
              </span>

              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                  marginTop: '6px',
                }}
              >
                KIỂM KÊ TIỀN MẶT THU NGÂN
              </div>

              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.96)',
                  marginTop: '5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {storeName || 'Chưa cấu hình siêu thị'}
              </div>

              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(226, 240, 255, 0.95)',
                  marginTop: '3px',
                }}
              >
                Kho: <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{storeCode || '---'}</span>
                <span style={{ margin: '0 8px', opacity: 0.75 }}>|</span>
                Ngày kiểm kê: <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{todayDateStr}</span>
              </div>
            </div>

            {/* Right Illustration */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="86" height="76" viewBox="0 0 92 82" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 20L15.5 24.5L20 26L15.5 27.5L14 32L12.5 27.5L8 26L12.5 24.5L14 20Z" fill="#93C5FD" fillOpacity="0.85" />
                <path d="M82 36L83 39L86 40L83 41L82 44L81 41L78 40L81 39L82 36Z" fill="#93C5FD" fillOpacity="0.85" />
                <rect x="22" y="24" width="58" height="35" rx="6" transform="rotate(-8 22 24)" fill="#059669" />
                <rect x="22" y="19" width="58" height="35" rx="6" transform="rotate(-8 22 19)" fill="#10B981" />
                <rect x="22" y="14" width="58" height="35" rx="6" transform="rotate(-8 22 14)" fill="#34D399" stroke="#A7F3D0" strokeWidth="1.5" />
                <circle cx="52" cy="27" r="8.5" fill="#059669" fillOpacity="0.45" />
                <ellipse cx="28" cy="64" rx="13" ry="4.5" fill="#D97706" />
                <rect x="15" y="56" width="26" height="8" fill="#F59E0B" />
                <ellipse cx="28" cy="56" rx="13" ry="4.5" fill="#FBBF24" />
                <rect x="15" y="48" width="26" height="8" fill="#F59E0B" />
                <ellipse cx="28" cy="48" rx="13" ry="4.5" fill="#FDE047" />
                <circle cx="52" cy="56" r="13.5" fill="#F59E0B" stroke="#FDE047" strokeWidth="2" />
                <circle cx="52" cy="56" r="9" fill="#FBBF24" />
              </svg>
            </div>
          </div>

          {/* 2. EXPORT ACTION BUTTONS CARD */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '10px',
              border: '1px solid #E2ECF8',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '8px',
              }}
            >
              <div
                style={{
                  height: '40px',
                  borderRadius: '11px',
                  background: 'linear-gradient(180deg, #1E70FF 0%, #0F58E6 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                <Copy size={13} strokeWidth={2.5} />
                <span>COPY ZALO</span>
              </div>

              <div
                style={{
                  height: '40px',
                  borderRadius: '11px',
                  background: 'linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                <Save size={13} strokeWidth={2.5} />
                <span>LƯU LỊCH SỬ</span>
              </div>

              <div
                style={{
                  height: '40px',
                  borderRadius: '11px',
                  backgroundColor: '#FAF5FF',
                  border: '1px solid #E9D5FF',
                  color: '#6B21A8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                <History size={13} strokeWidth={2.5} />
                <span>LỊCH SỬ ({historyList.length})</span>
              </div>

              <div
                style={{
                  height: '40px',
                  borderRadius: '11px',
                  background: 'linear-gradient(180deg, #129E5A 0%, #0B7E46 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                <Download size={13} strokeWidth={2.5} />
                <span>XUẤT ẢNH</span>
              </div>
            </div>

            <div
              style={{
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#FFF1F2',
                border: '1px solid #FECDD3',
                color: '#E11D48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
              }}
            >
              <Trash2 size={13} strokeWidth={2.5} />
              <span>XÓA SỐ TỜ ALL</span>
            </div>
          </div>

          {/* 3. EXPORT 3 BALANCED OVERVIEW CARDS (NO TRUNCATION, EQUAL HEIGHT & WIDTH) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '10px',
              alignItems: 'stretch',
            }}
          >
            {/* Card 1: TỔNG THỰC ĐẾM (TIỀN MẶT) */}
            <div
              style={{
                borderRadius: '18px',
                padding: '13px 12px',
                background: 'linear-gradient(145deg, #F3FDF7 0%, #E3F9EC 100%)',
                border: '1.5px solid #BDEFD1',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '124px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    backgroundColor: '#D5F6E2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <BanknoteBadgeIcon size={17} color="#0F7638" />
                </div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: '#1E293B',
                    lineHeight: 1.25,
                    textTransform: 'uppercase',
                  }}
                >
                  <div style={{ whiteSpace: 'nowrap' }}>TỔNG THỰC ĐẾM</div>
                  <div style={{ whiteSpace: 'nowrap' }}>(TIỀN MẶT)</div>
                </div>
              </div>

              <div
                style={{
                  fontSize: getExportCardMoneyFontSize(formattedActual),
                  fontWeight: 900,
                  color: '#0B6B32',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  margin: '10px 0 8px 0',
                  wordBreak: 'break-word',
                }}
              >
                {formattedActual}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#475569',
                  lineHeight: 1.25,
                  marginTop: 'auto',
                }}
              >
                Tổng cộng: <span style={{ fontWeight: 800, color: '#0F172A' }}>{totalBills}</span> tờ tiền
              </div>
            </div>

            {/* Card 2: TỔNG TIỀN THEO ERP */}
            <div
              style={{
                borderRadius: '18px',
                padding: '13px 12px',
                background: 'linear-gradient(145deg, #F3F8FF 0%, #E3EEFF 100%)',
                border: '1.5px solid #C3DCFD',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '124px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '999px',
                    backgroundColor: '#1459E6',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={15} strokeWidth={2.5} />
                </div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: '#1E293B',
                    lineHeight: 1.25,
                    textTransform: 'uppercase',
                  }}
                >
                  <div style={{ whiteSpace: 'nowrap' }}>TỔNG TIỀN</div>
                  <div style={{ whiteSpace: 'nowrap' }}>THEO ERP</div>
                </div>
              </div>

              <div
                style={{
                  fontSize: getExportCardMoneyFontSize(formattedErp),
                  fontWeight: 900,
                  color: '#0B46C4',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  margin: '10px 0 8px 0',
                  wordBreak: 'break-word',
                }}
              >
                {formattedErp}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#475569',
                  lineHeight: 1.25,
                  marginTop: 'auto',
                }}
              >
                Nhập số liệu từ phần mềm POS
              </div>
            </div>

            {/* Card 3: CHÊNH LỆCH TIỀN */}
            <div
              style={{
                borderRadius: '18px',
                padding: '13px 12px',
                background: 'linear-gradient(145deg, #FFFDF7 0%, #FFEFD6 100%)',
                border: '1.5px solid #FCD6A4',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '124px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '999px',
                    backgroundColor: '#EA580C',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Scale size={15} strokeWidth={2.5} />
                </div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    lineHeight: 1.25,
                    textTransform: 'uppercase',
                  }}
                >
                  <div style={{ whiteSpace: 'nowrap' }}>CHÊNH LỆCH</div>
                  <div style={{ whiteSpace: 'nowrap' }}>TIỀN</div>
                </div>
              </div>

              <div
                style={{
                  fontSize: getExportCardMoneyFontSize(formattedDiscrepancy),
                  fontWeight: 900,
                  color: '#C83E00',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  margin: '10px 0 8px 0',
                  wordBreak: 'break-word',
                }}
              >
                {formattedDiscrepancy}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#334155',
                  lineHeight: 1.25,
                  textTransform: 'uppercase',
                  marginTop: 'auto',
                }}
              >
                THỰC ĐẾM - ERP
              </div>
            </div>
          </div>

          {/* 4. EXPORT DENOMINATION TABLE CARD (FINAL ELEMENT OF EXPORTED IMAGE) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #E2ECF8',
            }}
          >
            {/* Card Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingBottom: '12px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#E6F8EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BanknoteBadgeIcon size={18} color="#0F8A5F" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#0F172A',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                  }}
                >
                  BẢNG KÊ TIỀN MẶT THEO MỆNH GIÁ
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#64748B',
                    marginTop: '2px',
                  }}
                >
                  {storeName} • Mã Kho: {storeCode}
                </div>
              </div>
            </div>

            {/* Table Column Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '142px 1fr 142px',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                padding: '8px 10px',
                marginTop: '10px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              <div>MỆNH GIÁ</div>
              <div style={{ textAlign: 'center' }}>SỐ LƯỢNG (TỜ)</div>
              <div style={{ textAlign: 'right' }}>THÀNH TIỀN</div>
            </div>

            {/* 10 Denomination Rows */}
            <div>
              {DENOMINATIONS.map((denom, idx) => {
                const count = counts[denom.value] || 0;
                const lineTotal = count * denom.value;
                const isLast = idx === DENOMINATIONS.length - 1;

                return (
                  <div
                    key={denom.value}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '142px 1fr 142px',
                      alignItems: 'center',
                      padding: isLast ? '8px 6px 2px 6px' : '8px 6px',
                      borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                      backgroundColor: idx % 2 === 1 ? 'rgba(248, 250, 252, 0.55)' : '#FFFFFF',
                    }}
                  >
                    {/* Col 1: Denomination Badge */}
                    <div>
                      <div
                        style={{
                          width: '132px',
                          height: '34px',
                          borderRadius: '9px',
                          backgroundColor: denom.mobileBadgeHex,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '0 10px',
                          fontSize: '13px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <BanknoteBadgeIcon size={16} color="#FFFFFF" />
                        <span>{denom.label}</span>
                      </div>
                    </div>

                    {/* Col 2: Centered Stepper (- [count] +) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 800,
                        }}
                      >
                        −
                      </div>

                      <div
                        style={{
                          width: '62px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          color: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 800,
                        }}
                      >
                        {count}
                      </div>

                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: denom.mobilePlusBg,
                          border: `1px solid ${denom.mobilePlusBorder}`,
                          color: denom.mobilePlusText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 800,
                        }}
                      >
                        +
                      </div>
                    </div>

                    {/* Col 3: Right-Aligned Line Total */}
                    <div
                      style={{
                        textAlign: 'right',
                        paddingRight: '4px',
                        fontSize: '14.5px',
                        fontWeight: 800,
                        color: denom.mobileTextHex,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatMoney(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL XEM LẠI LỊCH SỬ KIỂM TIỀN (Portal to document.body) ── */}
      {isHistoryModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative z-[1000000]">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl">
                    <History size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase">
                      LỊCH SỬ KIỂM TIỀN (KHO {storeCode})
                    </h3>
                    <p className="text-xs text-slate-400 font-bold">
                      Tổng cộng: {historyList.length} bản ghi đồng bộ thời gian thực
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body: List of History Records */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
                {historyList.length === 0 ? (
                  <div className="text-center py-12">
                    <History size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-600">
                      Chưa có lịch sử kiểm tiền nào được lưu tại Kho {storeCode}.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hãy bấm nút "LƯU LỊCH SỬ" sau mỗi lần đếm tiền xong!
                    </p>
                  </div>
                ) : (
                  historyList.map(item => {
                    const itemDiscrepancy = item.discrepancy ?? item.totalActual - item.erpTotal;
                    const isItemBalanced = item.erpTotal > 0 && Math.abs(itemDiscrepancy) === 0;
                    const isItemSurplus = item.erpTotal > 0 && itemDiscrepancy > 0;
                    const itemKey = item.recordKey || item.id;
                    const isCurrentlyLoaded = activeRecordKey === itemKey;

                    return (
                      <div
                        key={itemKey}
                        className={`pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                          isCurrentlyLoaded
                            ? 'bg-indigo-50/70 border-indigo-300'
                            : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-black">
                              <Clock size={12} /> {item.timeStr}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold">
                              <Calendar size={12} /> {item.dateStr}
                            </span>
                            {item.staffId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px] font-extrabold">
                                <User size={11} /> {item.staffId}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">
                              v{item.version || 1}
                            </span>

                            {item.erpTotal > 0 ? (
                              isItemBalanced ? (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black">
                                  ✅ Khớp 100%
                                </span>
                              ) : isItemSurplus ? (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-black">
                                  ⚠️ Dư +{formatMoney(itemDiscrepancy)}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-black">
                                  🚨 Thiếu {formatMoney(itemDiscrepancy)}
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-600 text-[11px] font-bold">
                                Chưa nhập ERP
                              </span>
                            )}
                          </div>

                          {/* Totals info */}
                          <div className="flex items-baseline gap-3">
                            <span className="text-base sm:text-lg font-black text-emerald-700">
                              {formatMoney(item.totalActual)}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              ({item.totalBills} tờ)
                            </span>
                            {item.erpTotal > 0 && (
                              <span className="text-xs font-bold text-blue-700">
                                · ERP: {formatMoney(item.erpTotal)}
                              </span>
                            )}
                          </div>

                          {/* Quick preview of bills breakdown */}
                          <div className="text-[11px] text-slate-400 font-medium line-clamp-1">
                            {DENOMINATIONS.filter(d => (item.counts[d.value] || 0) > 0)
                              .map(d => `${d.label.replace(/\u00A0đ| đ/g, '')}: ${item.counts[d.value]} tờ`)
                              .join(' · ') || '0 tờ'}
                          </div>
                        </div>

                        {/* Action buttons on card */}
                        <div className="flex items-center gap-2 shrink-0 justify-end">
                          <button
                            onClick={() => handleLoadHistoryRecord(item)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
                            title="Tải lại số tờ của lần kiểm này vào bảng đếm"
                          >
                            <ArrowDownCircle size={14} /> NẠP LẠI
                          </button>
                          <button
                            onClick={e => handleDeleteHistoryItem(itemKey, e)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Xóa bản ghi này"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Image Preview Modal ── */}
      {previewImageUrl && (
        <ImagePreviewModal
          previewImage={previewImageUrl}
          setPreviewImage={setPreviewImageUrl}
        />
      )}
    </div>
  );
}
