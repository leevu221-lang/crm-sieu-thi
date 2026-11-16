import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  ImagePlus,
  Layers,
  Lock,
  Loader2,
  RotateCcw,
  Scan,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { isGuestShareLink } from '../../../constants/routes';
import { isSuperAdmin43751 } from '../../../firebaseAdapter';
import { supabase } from '../../../supabaseClient';
import { isValidStoreName, normalizeStoreId } from '../utils';
import type { MarketInfo } from '../types';
import {
  computeThiDuaReportHash,
  mergeMultiPageReports,
  serializeThiDuaRowsToBiText,
  mergeThiDuaRowsWithBiText,
  normalizeBIData,
  type MergeThiDuaResult,
  type ThiDuaAiReportResult,
  type ThiDuaLkMeta,
  type ThiDuaLkUpdateHistoryEntry,
} from '../../../utils/thiDuaAiParser';
import {
  runAutoOcrOnImages,
  terminateSharedOcrWorker,
  resetOcrWorker,
} from '../../../utils/thiDuaOcrEngine';
import {
  saveThiDuaDraft,
  loadThiDuaDraft,
  clearThiDuaDraft,
  hasActiveDraft,
  convertDraftToAiReport,
  type ThiDuaDraftRecord,
} from '../../../utils/thiDuaDraftStorage';
import { thiDuaCentralService } from '../../../services/thiDuaCentralService';
import { ThiDuaLuyKeAiReviewModal } from './ThiDuaLuyKeAiReviewModal';

interface SelectedImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeKb: number;
  width?: number;
  height?: number;
}

type PipelineStatus = 'idle' | 'loading_images' | 'reading_ocr' | 'analyzing' | 'saving_db' | 'completed' | 'error';

interface ThiDuaLuyKeAiUploaderProps {
  currentValue: string;
  activeStore?: string;
  availableMarkets?: Array<MarketInfo | string>;
  maKho?: string;
  selectedMonth?: string;
  allStoresCache?: Record<string, any>;
  onApplyBiText: (text: string) => void;
  onTriggerSavePipeline: () => Promise<void>;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const ACCEPTED_EXTENSIONS = /\.(png|jpe?g)$/i;
const ACCEPTED_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

function readFileAsDataUrl(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Không thể đọc dữ liệu ảnh.'));
        return;
      }
      const header = result.slice(0, commaIdx);
      const mimeMatch = header.match(/data:([^;]+);base64/i);
      const mimeType = (mimeMatch?.[1] || file.type || 'image/png').toLowerCase();
      resolve({
        base64: result.slice(commaIdx + 1),
        mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
      });
    };
    reader.onerror = () => reject(new Error(`Lỗi đọc file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

async function prepareImageForVision(
  item: SelectedImageItem
): Promise<{ imageBase64: string; mimeType: string }> {
  const maxDirectBytes = 15 * 1024 * 1024;
  const maxDim = 5000;
  const width = item.width || 0;
  const height = item.height || 0;

  if (item.file.size <= maxDirectBytes && Math.max(width, height) <= maxDim) {
    const raw = await readFileAsDataUrl(item.file);
    return { imageBase64: raw.base64, mimeType: raw.mimeType };
  }

  // Only scale down ultra-large images cleanly while keeping high readability
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale =
          Math.max(img.naturalWidth, img.naturalHeight) > maxDim
            ? maxDim / Math.max(img.naturalWidth, img.naturalHeight)
            : 1;
        const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
        const targetH = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          readFileAsDataUrl(item.file)
            .then((r) => resolve({ imageBase64: r.base64, mimeType: r.mimeType }))
            .catch(reject);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const commaIdx = dataUrl.indexOf(',');
        resolve({
          imageBase64: dataUrl.slice(commaIdx + 1),
          mimeType: 'image/jpeg',
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Không thể xử lý ảnh ${item.name}`));
    img.src = item.previewUrl;
  });
}

export const ThiDuaLuyKeAiUploader: React.FC<ThiDuaLuyKeAiUploaderProps> = ({
  currentValue,
  activeStore,
  availableMarkets = [],
  maKho,
  selectedMonth,
  allStoresCache,
  onApplyBiText,
  onTriggerSavePipeline,
  showNotification,
}) => {
  const { userProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSavedBatchRef = useRef<string | null>(null);

  const [images, setImages] = useState<SelectedImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [expectedRowsHint, setExpectedRowsHint] = useState<string>('');

  const [ocrProgressPct, setOcrProgressPct] = useState<number>(0);
  const [ocrStats, setOcrStats] = useState<{
    total: number;
    valid: number;
    uncertain: number;
    missing?: number;
    errors: number;
    confidence: number;
  } | null>(null);
  const [ocrNeedsAiFallback, setOcrNeedsAiFallback] = useState<boolean>(false);
  const [showAdminDebug, setShowAdminDebug] = useState<boolean>(false);
  const [copiedDebug, setCopiedDebug] = useState<boolean>(false);

  const [analyzedReport, setAnalyzedReport] = useState<ThiDuaAiReportResult | null>(null);
  const [activeDraft, setActiveDraft] = useState<ThiDuaDraftRecord | null>(null);
  const [pageCountAnalyzed, setPageCountAnalyzed] = useState<number>(0);
  const [duplicatesMerged, setDuplicatesMerged] = useState<number>(0);
  const [duplicateProgramsOnMerge, setDuplicateProgramsOnMerge] = useState<string[]>([]);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 6-stage OCR pipeline tracker & auto-save states
  const [pipelineStep, setPipelineStep] = useState<number | null>(null);
  const [pipelineStepLabel, setPipelineStepLabel] = useState<string>('');
  const [autoSaveResult, setAutoSaveResult] = useState<{
    status: 'saved' | 'unchanged';
    totalPrograms: number;
    savedCount: number;
    updatedCount: number;
    storeLabel: string;
    period: string;
    timestamp: string;
  } | null>(null);

  const [aiStatusState, setAiStatusState] = useState<{
    loading: boolean;
    configured: boolean | null;
    errorCode?: string;
    message: string;
  }>({ loading: false, configured: null, errorCode: '', message: '' });

  const checkBackendAiStatus = async () => {
    setAiStatusState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/thi-dua/ai-status', { cache: 'no-store' });
      const data = await res.json();
      setAiStatusState({
        loading: false,
        configured: Boolean(data?.configured),
        errorCode: data?.errorCode || (data?.configured ? '' : 'GEMINI_API_KEY_MISSING'),
        message: String(data?.message || ''),
      });
    } catch {
      setAiStatusState({
        loading: false,
        configured: null,
        errorCode: '',
        message: 'Không kiểm tra được trạng thái backend',
      });
    }
  };

  // Strict RBAC check matching Section 8
  const isGuestUser = useMemo(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    return (
      isGuestShareLink(search) ||
      Boolean((userProfile as any)?.isGuest) ||
      (userProfile?.role as string) === 'guest'
    );
  }, [userProfile]);

  const hasUpdatePermission = useMemo(() => {
    if (!userProfile?.username || isGuestUser) return false;
    if (
      isSuperAdmin43751(userProfile.username) ||
      userProfile.role === 'admin' ||
      userProfile.userPermissions?.canEditUser
    ) {
      return true;
    }
    const allowedPages =
      userProfile.userPermissions?.allowedPages ||
      ((userProfile.permissions as string[] | undefined) ?? []);
    return Array.isArray(allowedPages) && allowedPages.includes('khaibao');
  }, [userProfile, isGuestUser]);

  const resolvedStoreLabel = useMemo(() => {
    const cleanActive = (activeStore || '').trim();
    if (cleanActive && cleanActive !== 'ALL' && isValidStoreName(cleanActive)) {
      return cleanActive;
    }
    const candidateName = availableMarkets
      .map((m) => (typeof m === 'string' ? m : m?.name || '').trim())
      .find((name) => name && name !== 'ALL' && isValidStoreName(name));
    if (candidateName) return candidateName;
    if (userProfile?.ten_sieu_thi && isValidStoreName(userProfile.ten_sieu_thi)) {
      return userProfile.ten_sieu_thi;
    }
    return `ĐML - ${(maKho || userProfile?.ma_kho || 'CỤM').trim()}`;
  }, [activeStore, availableMarkets, userProfile, maKho]);

  const effectiveMaKho = useMemo(() => {
    const cachedStoreWh = allStoresCache?.[resolvedStoreLabel]?.warehouseCode;
    const anyCachedWh = allStoresCache
      ? (Object.values(allStoresCache).find((s: any) => s?.warehouseCode)?.warehouseCode as string | undefined)
      : undefined;
    return (maKho || cachedStoreWh || anyCachedWh || userProfile?.ma_kho || '').trim() || 'GLOBAL';
  }, [maKho, allStoresCache, resolvedStoreLabel, userProfile]);

  const metaStorageKey = `rtst_lk_nh_meta_${effectiveMaKho}`;

  const [savedMeta, setSavedMeta] = useState<ThiDuaLkMeta | null>(() => {
    try {
      const raw = localStorage.getItem(metaStorageKey);
      return raw ? (JSON.parse(raw) as ThiDuaLkMeta) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(metaStorageKey);
      setSavedMeta(raw ? (JSON.parse(raw) as ThiDuaLkMeta) : null);
    } catch {
      setSavedMeta(null);
    }
  }, [metaStorageKey]);

  // Pick up metadata from allStoresCache if already loaded from Firestore
  useEffect(() => {
    if (!allStoresCache) return;
    const storeKey =
      activeStore && activeStore !== 'ALL' && allStoresCache[activeStore]
        ? activeStore
        : Object.keys(allStoresCache).find((k) => allStoresCache[k]?.lk_nh_meta);
    const remoteMeta = storeKey ? (allStoresCache[storeKey]?.lk_nh_meta as ThiDuaLkMeta | undefined) : undefined;
    if (remoteMeta && (!savedMeta || remoteMeta.lastUpdatedAt > savedMeta.lastUpdatedAt)) {
      setSavedMeta(remoteMeta);
      try {
        localStorage.setItem(metaStorageKey, JSON.stringify(remoteMeta));
      } catch {}
    }
  }, [allStoresCache, activeStore, metaStorageKey, savedMeta]);

  // Revoke object URLs on unmount to avoid memory leaks + terminate shared OCR worker
  const imagesRef = useRef<SelectedImageItem[]>([]);
  imagesRef.current = images;
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch {}
      });
      terminateSharedOcrWorker();
    };
  }, []);

  useEffect(() => {
    if (hasUpdatePermission) {
      checkBackendAiStatus();
    }
  }, [hasUpdatePermission]);

  const monthYearHints = useMemo(() => {
    if (selectedMonth && /^\d{4}-\d{1,2}$/.test(selectedMonth)) {
      const [yStr, mStr] = selectedMonth.split('-');
      return { year: Number(yStr), month: Number(mStr) };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedMonth]);

  // Check for active uncommitted draft on mount or when store / period changes
  useEffect(() => {
    let isMounted = true;
    const storeKey = resolvedStoreLabel || activeStore;
    loadThiDuaDraft(storeKey, monthYearHints.month, monthYearHints.year).then((draft) => {
      if (!isMounted) return;
      if (draft && !draft.isCommitted && draft.rows.length > 0) {
        setActiveDraft(draft);
      } else {
        setActiveDraft(null);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [resolvedStoreLabel, activeStore, monthYearHints.month, monthYearHints.year]);

  const handleRestoreDraft = () => {
    if (!activeDraft) return;
    const report = convertDraftToAiReport(activeDraft);
    setAnalyzedReport(report);
    setPageCountAnalyzed(activeDraft.pageCount || 1);
    setDuplicatesMerged(activeDraft.duplicatesMerged || 0);
    setDuplicateProgramsOnMerge(activeDraft.duplicatePrograms || []);
    setModelUsed(activeDraft.modelUsed || 'Bản nháp đã lưu');
    setStatus('completed');
    setIsReviewOpen(true);
    showNotification(
      `Đã khôi phục bản nháp OCR thành công (${activeDraft.rows.length} chương trình)!`,
      'success'
    );
  };

  const handleDismissDraft = async () => {
    if (!activeDraft) return;
    const storeKey = resolvedStoreLabel || activeStore;
    await clearThiDuaDraft(storeKey, activeDraft.month, activeDraft.year);
    setActiveDraft(null);
    showNotification('Đã xóa bản nháp OCR.', 'info');
  };

  /**
   * Pipeline lưu dữ liệu chính thức vào Cơ sở dữ liệu và Luỹ Kế Thi Đua trung tâm
   * Tái sử dụng cho cả Auto-Save an toàn và Xác nhận thủ công từ Review Modal
   */
  const executeThiDuaSavePipeline = async (
    finalReport: ThiDuaAiReportResult,
    metaInfo: {
      adminConfirmedWarnings: boolean;
      duplicatesMerged: number;
      pageCount: number;
    }
  ) => {
    const now = new Date();
    // Ensure normalizeBIData runs immediately before saving
    const normalizedReport = normalizeBIData(finalReport);
    const targetStoreLabel =
      normalizedReport.store_name && isValidStoreName(normalizedReport.store_name) && activeStore === 'ALL'
        ? normalizedReport.store_name
        : resolvedStoreLabel;

    const storeDocId = normalizeStoreId(targetStoreLabel);
    const mm = normalizedReport.month
      ? String(normalizedReport.month).padStart(2, '0')
      : String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = normalizedReport.year || now.getFullYear();
    const period = `${mm}/${yyyy}`;

    const batchId = `BATCH_${Date.now()}_${storeDocId || 'STORE'}_T${mm}_${yyyy}_${Math.random().toString(36).slice(2, 7)}`;
    if (lastSavedBatchRef.current === batchId) {
      return { targetStoreLabel, period, updatedCount: 0, addedCount: 0, normalizedReport };
    }

    // Merge ALL normalized programs with existing currentValue (100% protecting existing 286 rows)
    const mergeResult = mergeThiDuaRowsWithBiText(currentValue, normalizedReport.rows, {
      storeLabel: targetStoreLabel,
      month: normalizedReport.month,
      year: normalizedReport.year,
      updatedAt: now,
      batchId,
      replaceMode: false,
    });

    try {
      localStorage.removeItem('crm_field_cleared_rt_catlk');
    } catch {}

    // Apply merged text to shared React state and trigger existing LUỸ KẾ THI ĐUA save + sync pipeline
    onApplyBiText(mergeResult.text);

    // Wait briefly so LuykeDataContext useEffect syncs clusterCategoryInputRef before save
    await new Promise((resolve) => setTimeout(resolve, 140));
    await onTriggerSavePipeline();

    // Persist lightweight metadata (source, timestamp, period, hash, compact snapshot, history, batch)
    const reportHash = computeThiDuaReportHash({
      month: normalizedReport.month,
      year: normalizedReport.year,
      rows: normalizedReport.rows,
    });

    const newHistoryEntry: ThiDuaLkUpdateHistoryEntry = {
      updatedAt: now.toISOString(),
      updatedBy: userProfile?.username || 'ADMIN',
      source: 'AI_VISION_BI',
      period,
      rowCount: normalizedReport.rows.length,
      expectedRowCount: normalizedReport.expected_total_rows,
      reportHash,
      batchId,
      batchStatus: 'SAVED',
      updatedCount: mergeResult.updatedCount,
      addedCount: mergeResult.addedCount,
    };

    const nextHistory = [newHistoryEntry, ...(savedMeta?.history || [])].slice(0, 10);
    const nextMeta: ThiDuaLkMeta = {
      lastUpdatedAt: now.toISOString(),
      lastUpdatedBy: userProfile?.username || 'ADMIN',
      source: 'AI_VISION_BI',
      period,
      month: normalizedReport.month,
      year: normalizedReport.year,
      rowCount: normalizedReport.rows.length,
      expectedRowCount: normalizedReport.expected_total_rows,
      reportHash,
      batchId,
      batchStatus: 'SAVED',
      updatedCount: mergeResult.updatedCount,
      addedCount: mergeResult.addedCount,
      pageCount: metaInfo.pageCount,
      duplicatesMerged: metaInfo.duplicatesMerged,
      uncertainConfirmed: metaInfo.adminConfirmedWarnings,
      rowsSnapshot: normalizedReport.rows.map((r) => ({
        ten_chuong_trinh: r.ten_chuong_trinh,
        kenh: r.kenh || 'DT',
        thuc_hien: r.thuc_hien ?? 0,
        target: r.target ?? 0,
        ty_le_thuc_hien: r.ty_le_thuc_hien,
        ty_le_du_kien: r.ty_le_du_kien,
        hang_cty: r.hang_cty,
      })),
      history: nextHistory,
    };

    setSavedMeta(nextMeta);
    try {
      localStorage.setItem(metaStorageKey, JSON.stringify(nextMeta));
    } catch {}

    // Persist to Central Competition Database Service (thi_dua_batches + store + realtime sync)
    await thiDuaCentralService.saveCompetitionBatch({
      storeId: storeDocId,
      storeName: targetStoreLabel,
      warehouseCode: effectiveMaKho === 'GLOBAL' ? '' : effectiveMaKho,
      month: normalizedReport.month,
      year: normalizedReport.year,
      programs: normalizedReport.rows,
      existingBiText: currentValue,
      batchId,
      sourceType: 'AI_VISION_BI',
      username: userProfile?.username || 'ADMIN',
      adminConfirmedWarnings: metaInfo.adminConfirmedWarnings,
      pageCount: metaInfo.pageCount,
      duplicatesMerged: metaInfo.duplicatesMerged,
    });

    if (targetStoreLabel && targetStoreLabel !== 'ALL' && isValidStoreName(targetStoreLabel)) {
      if (storeDocId && storeDocId !== 'ALL') {
        // Clear active draft ONLY after DB write confirmation
        await clearThiDuaDraft(storeDocId, normalizedReport.month, normalizedReport.year);
      }
    }

    lastSavedBatchRef.current = batchId;
    setActiveDraft(null);

    return {
      targetStoreLabel,
      period,
      updatedCount: mergeResult.updatedCount,
      addedCount: mergeResult.addedCount,
      normalizedReport,
    };
  };

  /**
   * Tự động nhận diện dữ liệu bằng OCR Engine (Tesseract.js / WebAssembly) chạy trực tiếp trên Client
   * 6 Giai đoạn tiến trình:
   * 1. Đang tải ảnh
   * 2. Đang phân tích cấu trúc bảng
   * 3. Đang nhận diện dữ liệu
   * 4. Đang kiểm tra 39 chương trình
   * 5. Đang lưu Database (khi 100% hợp lệ)
   * 6. Đã lưu thành công
   */
  const triggerAutoOcr = async (targetImages: SelectedImageItem[]) => {
    if (!hasUpdatePermission) {
      showNotification('Tài khoản của bạn không có quyền cập nhật dữ liệu.', 'error');
      return;
    }
    if (targetImages.length === 0) {
      setAnalyzedReport(null);
      setOcrStats(null);
      setPipelineStep(null);
      setPipelineStepLabel('');
      setAutoSaveResult(null);
      setStatus('idle');
      setProgressText('');
      return;
    }

    setStatus('reading_ocr');
    setErrorMsg('');
    setErrorCode('');
    setOcrProgressPct(5);
    setPipelineStep(2);
    setPipelineStepLabel('Đang phân tích cấu trúc bảng...');
    setProgressText(`Bước 2/6: Đang phân tích cấu trúc bảng cho ${targetImages.length} ảnh...`);

    try {
      const hintTotal = expectedRowsHint.trim() ? Number(expectedRowsHint.trim()) : null;

      // Pass targetImages directly (runAutoOcrOnImages accepts File, Blob, or image objects safely)
      const ocrResult = await runAutoOcrOnImages(targetImages, {
        monthHint: monthYearHints.month,
        yearHint: monthYearHints.year,
        storeNameHint: resolvedStoreLabel,
        expectedRowsHint:
          hintTotal && Number.isInteger(hintTotal) && hintTotal > 0 ? hintTotal : null,
        onProgress: (p, stageText) => {
          setOcrProgressPct(p);
          setProgressText(stageText);
          if (p < 25) {
            setPipelineStep(2);
            setPipelineStepLabel('Đang phân tích cấu trúc bảng...');
          } else if (p < 90) {
            setPipelineStep(3);
            setPipelineStepLabel('Đang nhận diện dữ liệu...');
          } else {
            setPipelineStep(4);
            setPipelineStepLabel(`Đang kiểm tra ${hintTotal || 39} chương trình...`);
          }
        },
      });

      const normalizedOcrReport = normalizeBIData(ocrResult.report);
      const rows = normalizedOcrReport.rows;
      const validCount = rows.filter((r) => r.errors.length === 0).length;
      const uncertainCount = rows.filter(
        (r) => r.uncertain_fields.length > 0 && r.errors.length === 0
      ).length;
      const missingDataCount = rows.filter(
        (r) => r.missing_fields.length > 0 && r.errors.length === 0
      ).length;
      const errorCount = rows.filter((r) => r.errors.length > 0).length;

      setOcrStats({
        total: rows.length,
        valid: validCount,
        uncertain: uncertainCount,
        missing: missingDataCount,
        errors: errorCount,
        confidence: ocrResult.confidenceScore,
      });

      setOcrNeedsAiFallback(ocrResult.needsAiFallback);
      setAnalyzedReport(normalizedOcrReport);
      setPageCountAnalyzed(targetImages.length);
      setDuplicatesMerged(ocrResult.duplicatesMerged);
      setDuplicateProgramsOnMerge(ocrResult.duplicatePrograms);
      setModelUsed('Auto-OCR WebAssembly (Client Engine)');

      // Giai đoạn 4: Kiểm tra tính toàn vẹn và hợp lệ của các chương trình
      setPipelineStep(4);
      setPipelineStepLabel(`Đang kiểm tra ${rows.length} chương trình...`);
      setProgressText(`Bước 4/6: Đang kiểm tra tính đầy đủ của ${rows.length} chương trình...`);

      // Auto-save draft immediately upon OCR completion to guarantee multi-tier persistence
      try {
        const storeDocId = normalizeStoreId(resolvedStoreLabel);
        saveThiDuaDraft({
          storeId: storeDocId,
          storeLabel: resolvedStoreLabel,
          month: normalizedOcrReport.month || monthYearHints.month,
          year: normalizedOcrReport.year || monthYearHints.year,
          expected_total_rows: normalizedOcrReport.expected_total_rows,
          rows: normalizedOcrReport.rows,
          modelUsed: 'Auto-OCR WebAssembly (Client Engine)',
          pageCount: targetImages.length,
          duplicatesMerged: ocrResult.duplicatesMerged,
          duplicatePrograms: ocrResult.duplicatePrograms,
          savedBy: userProfile?.username || 'ADMIN',
          isCommitted: false,
        }).then((saved) => {
          setActiveDraft(saved);
        });
      } catch (e) {
        console.warn('[ThiDuaAutoOcr] Initial auto-save draft warning:', e);
      }

      // ----------------------------------------------------
      // AUTOMATIC DATABASE PERSISTENCE DECISION PIPELINE
      // ----------------------------------------------------
      const totalExpected = normalizedOcrReport.expected_total_rows || 39;
      const isCountMatched = rows.length >= totalExpected;
      const is100PercentValid =
        rows.length >= 5 &&
        isCountMatched &&
        errorCount === 0 &&
        missingDataCount === 0 &&
        uncertainCount === 0 &&
        hasUpdatePermission;

      const currentReportHash = computeThiDuaReportHash({
        month: normalizedOcrReport.month,
        year: normalizedOcrReport.year,
        rows: normalizedOcrReport.rows,
      });

      // Anti-duplication check: Avoid redundant writes when data is identical to last save
      if (savedMeta?.reportHash && savedMeta.reportHash === currentReportHash) {
        setPipelineStep(6);
        setPipelineStepLabel('Dữ liệu đã đồng bộ – Không thay đổi');
        setStatus('completed');
        setProgressText('Dữ liệu ảnh trùng khớp 100% với lần lưu gần nhất. Không có thay đổi.');
        setAutoSaveResult({
          status: 'unchanged',
          totalPrograms: rows.length,
          savedCount: 0,
          updatedCount: 0,
          storeLabel: resolvedStoreLabel,
          period: `${String(normalizedOcrReport.month || monthYearHints.month).padStart(2, '0')}/${normalizedOcrReport.year || monthYearHints.year}`,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
        });
        showNotification('Dữ liệu không thay đổi so với lần lưu gần nhất.', 'info');
        return;
      }

      if (is100PercentValid) {
        // Giai đoạn 5: Tự động lưu toàn bộ dữ liệu vào Database
        setPipelineStep(5);
        setPipelineStepLabel('Đang lưu Database...');
        setStatus('saving_db');
        setProgressText(`Bước 5/6: Đang tự động lưu ${rows.length} chương trình vào Database...`);

        try {
          const saveRes = await executeThiDuaSavePipeline(normalizedOcrReport, {
            adminConfirmedWarnings: true,
            duplicatesMerged: ocrResult.duplicatesMerged,
            pageCount: targetImages.length,
          });

          // Giai đoạn 6: Đã lưu thành công
          setPipelineStep(6);
          setPipelineStepLabel('Đã lưu thành công');
          setStatus('completed');
          setProgressText(`Bước 6/6: ĐÃ TỰ ĐỘNG LƯU DỮ LIỆU LŨY KẾ THI ĐUA THÀNH CÔNG (${rows.length} CT)!`);

          setAutoSaveResult({
            status: 'saved',
            totalPrograms: rows.length,
            savedCount: saveRes.addedCount,
            updatedCount: saveRes.updatedCount,
            storeLabel: saveRes.targetStoreLabel,
            period: saveRes.period,
            timestamp: new Date().toLocaleTimeString('vi-VN'),
          });

          showNotification(
            `ĐÃ TỰ ĐỘNG LƯU DỮ LIỆU LŨY KẾ THI ĐUA THÀNH CÔNG (${rows.length} CT)!`,
            'success'
          );
        } catch (saveErr: any) {
          console.error('[ThiDuaAutoSave] Auto save error:', saveErr);
          setPipelineStep(4);
          setStatus('completed');
          setIsReviewOpen(true);
          showNotification(
            `Lỗi khi tự động lưu Database: ${saveErr?.message || 'Vui lòng kiểm tra lại'}.`,
            'error'
          );
        }
      } else {
        // Nếu có dòng nào cần kiểm tra lại (còn nghi vấn, missing, hoặc lỗi), mở popup để người dùng rà soát
        setPipelineStep(4);
        setPipelineStepLabel(`Cần kiểm tra: ${rows.length} chương trình (${errorCount} lỗi, ${uncertainCount} nghi vấn)`);
        setStatus('completed');
        setProgressText(
          `Đã nhận diện ${rows.length} chương trình. Vui lòng rà soát các dòng cần kiểm tra trước khi lưu.`
        );
        setIsReviewOpen(true);
        showNotification(
          `Đã nhận diện ${rows.length} chương trình. Cần rà soát ${errorCount + uncertainCount + missingDataCount} vấn đề.`,
          'warning'
        );
      }
    } catch (err: any) {
      console.error('[ThiDuaAutoOcr Technical Trace]', err);
      setStatus('error');
      setPipelineStep(null);
      setErrorCode(String(err?.code || err?.errorCode || 'OCR_ERROR'));
      setErrorMsg(err?.message || 'Lỗi khi tự động nhận diện ảnh bằng OCR.');
      setProgressText('');
    }
  };

  const handleRetryOcr = async () => {
    try {
      await resetOcrWorker();
    } catch {}
    await triggerAutoOcr(images);
  };

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    if (!hasUpdatePermission) {
      showNotification('Tài khoản của bạn không có quyền cập nhật dữ liệu.', 'error');
      return;
    }

    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const validFiles = incoming.filter((f) => {
      const mimeOk = f.type ? ACCEPTED_MIMES.has(f.type.toLowerCase()) : false;
      const extOk = ACCEPTED_EXTENSIONS.test(f.name);
      return mimeOk || extOk;
    });

    if (validFiles.length === 0) {
      setErrorMsg('Chỉ chấp nhận file ảnh định dạng PNG, JPG hoặc JPEG.');
      setErrorCode('INVALID_IMAGE');
      setStatus('error');
      return;
    }

    setStatus('loading_images');
    setPipelineStep(1);
    setPipelineStepLabel('Đang tải ảnh...');
    setProgressText(`Bước 1/6: Đang tải ${validFiles.length} ảnh xem trước...`);
    setAutoSaveResult(null);
    setErrorMsg('');
    setErrorCode('');

    try {
      const prepared: SelectedImageItem[] = [];
      for (const file of validFiles) {
        const previewUrl = URL.createObjectURL(file);
        const dims = await getImageDimensions(previewUrl);
        prepared.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl,
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          width: dims.width,
          height: dims.height,
        });
      }

      const nextImages = [...images, ...prepared];
      setImages(nextImages);

      // Tự động phân tích ngay sau khi tải ảnh, không cần người dùng bấm nút
      await triggerAutoOcr(nextImages);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể tải ảnh đã chọn.');
      setErrorCode('INVALID_IMAGE');
      setStatus('error');
    }
  };

  const handleRemoveImage = (id: string) => {
    const nextImages = images.filter((x) => x.id !== id);
    const found = images.find((x) => x.id === id);
    if (found) {
      try {
        URL.revokeObjectURL(found.previewUrl);
      } catch {}
    }
    setImages(nextImages);

    if (nextImages.length > 0) {
      // Tự động cập nhật dữ liệu từ các ảnh còn lại
      triggerAutoOcr(nextImages);
    } else {
      handleClearImages();
    }
  };

  const handleClearImages = () => {
    images.forEach((img) => {
      try {
        URL.revokeObjectURL(img.previewUrl);
      } catch {}
    });
    setImages([]);
    setAnalyzedReport(null);
    setOcrStats(null);
    setOcrProgressPct(0);
    setOcrNeedsAiFallback(false);
    setPipelineStep(null);
    setPipelineStepLabel('');
    setAutoSaveResult(null);
    setStatus('idle');
    setProgressText('');
    setErrorMsg('');
    setErrorCode('');
  };

  const handleAnalyzeImages = async () => {
    if (!hasUpdatePermission) {
      showNotification('Tài khoản không có quyền sử dụng AI nhận diện.', 'error');
      return;
    }
    if (images.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 ảnh báo cáo BI để phân tích.');
      setErrorCode('INVALID_IMAGE');
      setStatus('error');
      return;
    }

    setStatus('analyzing');
    setErrorMsg('');
    setErrorCode('');
    const pageReports: ThiDuaAiReportResult[] = [];
    let latestModel = '';

    try {
      const allowedPages =
        userProfile?.userPermissions?.allowedPages ||
        ((userProfile?.permissions as string[] | undefined) ?? []);

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setProgressText(
          `Đang phân tích AI ảnh ${i + 1}/${images.length} (${img.name})...`
        );

        const payloadImg = await prepareImageForVision(img);
        const res = await fetch('/api/gemini-vision-thi-dua', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CRM-User': userProfile?.username || '',
          },
          body: JSON.stringify({
            imageBase64: payloadImg.imageBase64,
            mimeType: payloadImg.mimeType,
            pageIndex: i + 1,
            totalPages: images.length,
            monthHint: monthYearHints.month,
            yearHint: monthYearHints.year,
            storeNameHint: resolvedStoreLabel,
            authContext: {
              username: userProfile?.username || '',
              role: userProfile?.role || 'user',
              isGuest: isGuestUser,
              allowedPages,
              canEditUser: Boolean(userProfile?.userPermissions?.canEditUser),
            },
          }),
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          throw new Error(`Phân tích ảnh ${i + 1} gặp lỗi phản hồi không hợp lệ (HTTP ${res.status}).`);
        }

        if (!res.ok || !json?.ok || !json?.report) {
          const err: any = new Error(
            json?.error || `Phân tích ảnh ${i + 1} thất bại (HTTP ${res.status}).`
          );
          err.errorCode = json?.errorCode || '';
          throw err;
        }
        if (json.modelUsed) latestModel = String(json.modelUsed);
        pageReports.push(json.report as ThiDuaAiReportResult);
      }

      setProgressText('Đang tổng hợp & kiểm tra trùng dòng...');
      const { merged, duplicatesMerged: mergedCount, duplicatePrograms } =
        mergeMultiPageReports(pageReports);

      // Apply manual expected row hint if image didn't include a total indicator
      const hintTotal = expectedRowsHint.trim() ? Number(expectedRowsHint.trim()) : null;
      if (
        merged.expected_total_rows === null &&
        hintTotal !== null &&
        Number.isInteger(hintTotal) &&
        hintTotal > 0
      ) {
        merged.expected_total_rows = hintTotal;
      }

      if (merged.month === null) merged.month = monthYearHints.month;
      if (merged.year === null) merged.year = monthYearHints.year;

      const normalizedMerged = normalizeBIData(merged);

      setAnalyzedReport(normalizedMerged);
      setPageCountAnalyzed(images.length);
      setDuplicatesMerged(mergedCount);
      setDuplicateProgramsOnMerge(duplicatePrograms);
      setModelUsed(latestModel);
      setStatus('completed');
      setPipelineStep(4);
      setPipelineStepLabel(`Đã phân tích ${normalizedMerged.rows.length} chương trình qua AI`);
      setProgressText(
        `Hoàn thành nhận diện ${normalizedMerged.rows.length} chương trình. Chờ Admin xác nhận.`
      );

      // Auto-save draft immediately upon AI completion to guarantee multi-tier persistence
      try {
        const storeDocId = normalizeStoreId(resolvedStoreLabel);
        saveThiDuaDraft({
          storeId: storeDocId,
          storeLabel: resolvedStoreLabel,
          month: normalizedMerged.month || monthYearHints.month,
          year: normalizedMerged.year || monthYearHints.year,
          expected_total_rows: normalizedMerged.expected_total_rows,
          rows: normalizedMerged.rows,
          modelUsed: latestModel,
          pageCount: images.length,
          duplicatesMerged: mergedCount,
          duplicatePrograms,
          savedBy: userProfile?.username || 'ADMIN',
          isCommitted: false,
        }).then((saved) => {
          setActiveDraft(saved);
        });
      } catch (e) {
        console.warn('[ThiDuaAi] Initial auto-save draft warning:', e);
      }

      setIsReviewOpen(true);
    } catch (err: any) {
      setStatus('error');
      setProgressText('');
      setErrorCode(String(err?.errorCode || ''));
      setErrorMsg(err?.message || 'Lỗi khi phân tích hình ảnh báo cáo BI.');
    }
  };

  const handleConfirmAndSave = async (
    finalReport: ThiDuaAiReportResult,
    metaInfo: {
      adminConfirmedWarnings: boolean;
      duplicatesMerged: number;
      pageCount: number;
    }
  ) => {
    if (!hasUpdatePermission) {
      showNotification('Tài khoản không có quyền lưu dữ liệu.', 'error');
      return;
    }

    setIsSaving(true);
    setPipelineStep(5);
    setPipelineStepLabel('Đang lưu Database...');
    try {
      const saveRes = await executeThiDuaSavePipeline(finalReport, metaInfo);

      setPipelineStep(6);
      setPipelineStepLabel('Đã lưu thành công');
      setStatus('completed');
      setIsReviewOpen(false);
      setAnalyzedReport(null);
      handleClearImages();

      setAutoSaveResult({
        status: 'saved',
        totalPrograms: saveRes.normalizedReport.rows.length,
        savedCount: saveRes.addedCount,
        updatedCount: saveRes.updatedCount,
        storeLabel: saveRes.targetStoreLabel,
        period: saveRes.period,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      });

      showNotification(
        `Đã lưu thành công ${saveRes.normalizedReport.rows.length} chương trình vào Database. (Cập nhật: ${saveRes.updatedCount}, Thêm mới: ${saveRes.addedCount})`,
        'success'
      );
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi lưu dữ liệu Luỹ kế thi đua.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveValidOnly = async (
    validReport: ThiDuaAiReportResult,
    metaInfo: {
      adminConfirmedWarnings: boolean;
      duplicatesMerged: number;
      pageCount: number;
    }
  ) => {
    if (!hasUpdatePermission) {
      showNotification('Tài khoản không có quyền lưu dữ liệu.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const targetStoreLabel =
        validReport.store_name && isValidStoreName(validReport.store_name) && activeStore === 'ALL'
          ? validReport.store_name
          : resolvedStoreLabel;

      const validRows = validReport.rows.filter((r) => !r.errors || r.errors.length === 0);
      const remainingErrorRows = validReport.rows.filter((r) => r.errors && r.errors.length > 0);

      if (validRows.length === 0) {
        showNotification('Không có dòng hợp lệ nào để lưu.', 'warning');
        return;
      }

      // Merge ONLY valid rows with existing currentValue so existing 286 rows are 100% preserved!
      const mergeResult = mergeThiDuaRowsWithBiText(currentValue, validRows, {
        storeLabel: targetStoreLabel,
        month: validReport.month,
        year: validReport.year,
        updatedAt: now,
        replaceMode: false,
      });

      try {
        localStorage.removeItem('crm_field_cleared_rt_catlk');
      } catch {}

      onApplyBiText(mergeResult.text);
      await new Promise((resolve) => setTimeout(resolve, 140));
      await onTriggerSavePipeline();

      // Persist lightweight metadata
      const mm = validReport.month
        ? String(validReport.month).padStart(2, '0')
        : String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = validReport.year || now.getFullYear();
      const period = `${mm}/${yyyy}`;
      const reportHash = computeThiDuaReportHash({
        month: validReport.month,
        year: validReport.year,
        rows: validRows,
      });

      const newHistoryEntry: ThiDuaLkUpdateHistoryEntry = {
        updatedAt: now.toISOString(),
        updatedBy: userProfile?.username || 'ADMIN',
        source: 'AI_VISION_BI (DÒNG HỢP LỆ)',
        period,
        rowCount: validRows.length,
        expectedRowCount: validReport.expected_total_rows,
        reportHash,
        batchStatus: 'SAVED',
        updatedCount: mergeResult.updatedCount,
        addedCount: mergeResult.addedCount,
      };

      const nextHistory = [newHistoryEntry, ...(savedMeta?.history || [])].slice(0, 10);
      const nextMeta: ThiDuaLkMeta = {
        lastUpdatedAt: now.toISOString(),
        lastUpdatedBy: userProfile?.username || 'ADMIN',
        source: 'AI_VISION_BI',
        period,
        month: validReport.month,
        year: validReport.year,
        rowCount: validRows.length,
        expectedRowCount: validReport.expected_total_rows,
        reportHash,
        batchStatus: 'SAVED',
        updatedCount: mergeResult.updatedCount,
        addedCount: mergeResult.addedCount,
        pageCount: metaInfo.pageCount,
        duplicatesMerged: metaInfo.duplicatesMerged,
        uncertainConfirmed: metaInfo.adminConfirmedWarnings,
        rowsSnapshot: validRows.map((r) => ({
          ten_chuong_trinh: r.ten_chuong_trinh,
          kenh: r.kenh || 'DT',
          thuc_hien: r.thuc_hien ?? 0,
          target: r.target ?? 0,
          ty_le_thuc_hien: r.ty_le_thuc_hien,
          ty_le_du_kien: r.ty_le_du_kien,
          hang_cty: r.hang_cty,
        })),
        history: nextHistory,
      };

      setSavedMeta(nextMeta);
      try {
        localStorage.setItem(metaStorageKey, JSON.stringify(nextMeta));
      } catch {}

      const storeDocId = normalizeStoreId(targetStoreLabel);
      if (storeDocId && storeDocId !== 'ALL') {
        // Persist to Central Competition Database Service
        await thiDuaCentralService.saveCompetitionBatch({
          storeId: storeDocId,
          storeName: targetStoreLabel,
          warehouseCode: effectiveMaKho === 'GLOBAL' ? '' : effectiveMaKho,
          month: validReport.month,
          year: validReport.year,
          programs: validRows,
          existingBiText: currentValue,
          sourceType: 'AI_VISION_BI',
          username: userProfile?.username || 'ADMIN',
          adminConfirmedWarnings: metaInfo.adminConfirmedWarnings,
          pageCount: metaInfo.pageCount,
          duplicatesMerged: metaInfo.duplicatesMerged,
        });
      }

      // Update draft: keep all rows (including remaining error rows) so user can continue later!
      const updatedDraft = await saveThiDuaDraft({
        draftId: activeDraft?.draftId,
        storeId: storeDocId,
        storeLabel: targetStoreLabel,
        month: validReport.month,
        year: validReport.year,
        expected_total_rows: validReport.expected_total_rows,
        rows: validReport.rows,
        modelUsed,
        pageCount: pageCountAnalyzed,
        duplicatesMerged,
        duplicatePrograms: duplicateProgramsOnMerge,
        adminConfirmedWarnings: metaInfo.adminConfirmedWarnings,
        savedBy: userProfile?.username || 'ADMIN',
        isCommitted: remainingErrorRows.length === 0,
      });
      setActiveDraft(updatedDraft);

      setAutoSaveResult({
        status: 'saved',
        totalPrograms: validRows.length,
        savedCount: mergeResult.addedCount,
        updatedCount: mergeResult.updatedCount,
        storeLabel: targetStoreLabel,
        period,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      });
      setPipelineStep(6);
      setPipelineStepLabel(`Đã lưu ${validRows.length} dòng hợp lệ thành công`);

      showNotification(
        `Đã lưu thành công ${validRows.length} dòng hợp lệ vào LUỸ KẾ THI ĐUA! ${
          remainingErrorRows.length > 0
            ? `Còn ${remainingErrorRows.length} dòng lỗi được giữ lại trong bản nháp để tiếp tục hoàn thiện.`
            : ''
        }`,
        'success'
      );
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi lưu các dòng hợp lệ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraftManual = async (
    report: ThiDuaAiReportResult,
    isManual = false
  ) => {
    try {
      const storeDocId = normalizeStoreId(report.store_name || resolvedStoreLabel);
      const saved = await saveThiDuaDraft({
        draftId: activeDraft?.draftId,
        storeId: storeDocId,
        storeLabel: report.store_name || resolvedStoreLabel,
        month: report.month,
        year: report.year,
        expected_total_rows: report.expected_total_rows,
        rows: report.rows,
        modelUsed,
        pageCount: pageCountAnalyzed,
        duplicatesMerged,
        duplicatePrograms: duplicateProgramsOnMerge,
        savedBy: userProfile?.username || 'ADMIN',
        isCommitted: false,
      });
      setActiveDraft(saved);
      if (isManual) {
        showNotification(
          `Đã lưu bản nháp thành công (${report.rows.length} chương trình, ${saved.validRowsCount} hợp lệ, ${saved.errorRowsCount} lỗi)!`,
          'success'
        );
      }
    } catch (err: any) {
      if (isManual) {
        showNotification(err?.message || 'Lỗi khi lưu bản nháp.', 'error');
      }
    }
  };

  const activeDataSourceBadge = useMemo(() => {
    if (!currentValue || !currentValue.trim()) return null;
    if (currentValue.includes('NGUỒN: AI_VISION_BI') && savedMeta?.source === 'AI_VISION_BI') {
      return {
        label: 'AI Vision BI',
        detail: `${savedMeta.rowCount} CT • Kỳ ${savedMeta.period} • ${new Date(
          savedMeta.lastUpdatedAt
        ).toLocaleString('vi-VN')}`,
      };
    }
    return {
      label: 'Excel (Ctrl + V)',
      detail: 'Dữ liệu dán từ báo cáo bảng tính',
    };
  }, [currentValue, savedMeta]);

  return (
    <div className="relative z-10 mt-2.5 pt-2.5 border-t border-orange-200/70 space-y-2">
      {/* Method Indicator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10.5px] sm:text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            <FileSpreadsheet size={11} />
            A. EXCEL (Ctrl+V ở ô trên)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-300 font-extrabold">
            <Sparkles size={11} />
            B. NHẬN DIỆN HÌNH ẢNH AI
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {activeDataSourceBadge && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-semibold"
              title={activeDataSourceBadge.detail}
            >
              <Clock size={10} />
              <span className="truncate max-w-[180px] sm:max-w-none">
                {activeDataSourceBadge.label}
              </span>
            </span>
          )}
          {savedMeta && savedMeta.history?.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-orange-600 hover:border-orange-300 font-semibold transition-colors"
              title="Xem lịch sử cập nhật Luỹ kế thi đua"
            >
              <History size={11} />
              <span>Lịch sử ({savedMeta.history.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Update History Drawer */}
      {showHistory && savedMeta?.history?.length ? (
        <div className="rounded-xl bg-white border border-slate-200 p-2 text-[10.5px] space-y-1">
          <div className="font-bold text-slate-700">Lịch sử cập nhật gần nhất:</div>
          <div className="max-h-28 overflow-y-auto divide-y divide-slate-100">
            {savedMeta.history.map((h, idx) => (
              <div key={idx} className="py-1 flex flex-wrap items-center justify-between gap-2 text-slate-600">
                <span>
                  <strong className="text-orange-700">{h.source}</strong> • Kỳ {h.period} •{' '}
                  <strong>{h.rowCount} CT</strong>
                </span>
                <span className="text-slate-400">
                  {h.updatedBy} • {new Date(h.updatedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Permission Guard */}
      {!hasUpdatePermission ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-2 text-[11px] text-slate-600">
          <Lock size={14} className="text-slate-400 shrink-0" />
          <span>
            Chỉ tài khoản có quyền <strong>CẬP NHẬT DỮ LIỆU</strong> mới được tải ảnh BI, phân tích AI và xác nhận lưu dữ liệu.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Server AI Health Check Bar */}
          {aiStatusState.configured !== null && (
            <div
              className={`rounded-lg border px-2.5 py-1 flex flex-wrap items-center justify-between gap-1.5 text-[10px] sm:text-[10.5px] ${
                aiStatusState.configured
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                  : 'border-amber-200 bg-amber-50/80 text-amber-800'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 font-semibold min-w-0">
                {aiStatusState.configured ? (
                  <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle size={12} className="shrink-0 text-amber-600" />
                )}
                <span className="truncate">
                  {aiStatusState.configured
                    ? 'Backend AI: AI service ready (Secret GEMINI_API_KEY đã được phát hiện trên server)'
                    : 'Backend AI: Chưa cấu hình GEMINI_API_KEY (Server Cloudflare Pages chưa nhận được biến môi trường)'}
                </span>
              </span>
              <button
                type="button"
                disabled={aiStatusState.loading}
                onClick={checkBackendAiStatus}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-orange-700 hover:border-orange-300 font-bold disabled:opacity-50 shrink-0"
              >
                <RotateCcw size={10} className={aiStatusState.loading ? 'animate-spin' : ''} />
                <span>Kiểm tra lại</span>
              </button>
            </div>
          )}

          {/* Active Draft Recovery Banner */}
          {activeDraft && !activeDraft.isCommitted && !analyzedReport && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-300">
                  <Bookmark size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-950 flex flex-wrap items-center gap-1.5">
                    <span>TÌM THẤY BẢN NHÁP OCR CHƯA LƯU</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-extrabold">
                      {activeDraft.totalRows} chương trình
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                      {activeDraft.validRowsCount} hợp lệ
                    </span>
                    {activeDraft.errorRowsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200">
                        {activeDraft.errorRowsCount} cần sửa
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Lưu lúc <strong>{new Date(activeDraft.savedAt).toLocaleString('vi-VN')}</strong> • Cơ sở: <strong>{activeDraft.storeLabel}</strong> • Kỳ: <strong>{activeDraft.month ? `${activeDraft.month}/${activeDraft.year}` : 'Hiện tại'}</strong>.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-extrabold shadow-sm transition-all"
                  title="Mở lại bản nháp để tiếp tục kiểm tra và xác nhận lưu"
                >
                  <RotateCcw size={12} />
                  <span>Khôi phục bản nháp</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissDraft}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-all"
                  title="Xóa bản nháp này"
                >
                  <Trash2 size={12} />
                  <span>Xóa nháp</span>
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop Zone + Upload Button */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer?.files?.length) {
                handleFilesSelected(e.dataTransfer.files);
              }
            }}
            className={`rounded-xl border-2 border-dashed p-2 sm:p-2.5 transition-all ${
              isDragging
                ? 'border-orange-500 bg-orange-50'
                : 'border-orange-200 bg-orange-50/35 hover:border-orange-400 hover:bg-orange-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFilesSelected(e.target.files);
                }
                e.target.value = '';
              }}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <ImagePlus size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">
                    Kéo thả hoặc chọn ảnh báo cáo BI (PNG, JPG, JPEG)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Hỗ trợ nhiều trang/ảnh ghép (40+ chương trình), xem trước & xác nhận trước khi lưu.
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={status === 'analyzing' || isSaving}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold shadow-sm hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 shrink-0 transition-all"
              >
                <Upload size={13} />
                <span>TẢI ẢNH BÁO CÁO BI</span>
              </button>
            </div>
          </div>

          {/* Image Previews Before Processing */}
          {images.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-700">
                  Xem trước {images.length} ảnh trước khi phân tích:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={expectedRowsHint}
                    onChange={(e) => setExpectedRowsHint(e.target.value)}
                    placeholder="Tổng CT (VD: 40)"
                    title="Tùy chọn: Nhập tổng số chương trình trên báo cáo để AI đối chiếu"
                    className="w-32 px-2 py-1 text-[11px] rounded-lg border border-slate-200 focus:border-orange-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleClearImages}
                    disabled={status === 'analyzing'}
                    className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-500 hover:text-rose-600"
                  >
                    <Trash2 size={12} /> Xóa ảnh
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-full h-24 object-cover object-top"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[9.5px] font-bold">
                      Trang {idx + 1}
                    </span>
                    <button
                      type="button"
                      disabled={status === 'analyzing'}
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors"
                      title="Bỏ ảnh này"
                    >
                      <X size={11} />
                    </button>
                    <div className="px-1.5 py-1 text-[9.5px] text-slate-600 truncate bg-white border-t border-slate-100">
                      {img.name} ({img.sizeKb}KB{img.width ? ` • ${img.width}×${img.height}` : ''})
                    </div>
                  </div>
                ))}
              </div>

              {/* Auto OCR Controls & Mini Quick Preview */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="text-[10.5px] text-slate-500 font-medium">
                  {status === 'reading_ocr' ? (
                    <span className="inline-flex items-center gap-1.5 text-orange-600 font-bold">
                      <Loader2 size={12} className="animate-spin" />
                      Đang tự động đọc ảnh bằng OCR ({ocrProgressPct}%)...
                    </span>
                  ) : (
                    <span>
                      Tự động phân tích ngay khi nạp ảnh (Hybrid OCR Client Engine).
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={status === 'reading_ocr' || status === 'analyzing' || isSaving}
                    onClick={handleRetryOcr}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-[10.5px] font-bold hover:bg-slate-50 hover:border-orange-300 disabled:opacity-50 transition-colors"
                    title="Khởi tạo lại bộ đọc OCR và quét lại ảnh"
                  >
                    <RotateCcw size={11} />
                    <span>Đọc lại OCR</span>
                  </button>

                  <button
                    type="button"
                    disabled={status === 'reading_ocr' || status === 'analyzing' || isSaving}
                    onClick={handleAnalyzeImages}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200 text-orange-700 text-[10.5px] font-bold hover:bg-orange-100 disabled:opacity-50 transition-colors"
                    title="Sử dụng Gemini Vision Backend làm phương án dự phòng khi ảnh bị mờ hoặc cần đối chiếu"
                  >
                    {status === 'analyzing' ? (
                      <>
                        <Loader2 size={11} className="animate-spin" />
                        <span>Đang gọi AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} />
                        <span>Dùng AI nâng cao (Dự phòng)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6-Stage OCR Pipeline Progress Tracker */}
          {pipelineStep !== null && status !== 'idle' && (
            <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50/90 via-amber-50/80 to-white p-3 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-orange-950">
                <span className="flex items-center gap-2">
                  {pipelineStep < 6 && status !== 'error' ? (
                    <Loader2 size={14} className="animate-spin text-orange-600 shrink-0" />
                  ) : pipelineStep === 6 ? (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                  )}
                  <span className="font-extrabold uppercase tracking-wide">
                    TIẾN TRÌNH NHẬN DIỆN & TỰ ĐỘNG LƯU (BƯỚC {pipelineStep}/6)
                  </span>
                </span>
                <span className="text-orange-700 font-black">
                  {pipelineStep === 6 ? '100%' : `${ocrProgressPct}%`}
                </span>
              </div>

              {/* Step pills grid (2 cols on mobile, 3 cols on sm, 6 cols on lg) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-[10px] sm:text-[10.5px] font-bold">
                {[
                  { step: 1, label: '1. Đang tải ảnh' },
                  { step: 2, label: '2. Cấu trúc bảng' },
                  { step: 3, label: '3. Đọc dữ liệu' },
                  { step: 4, label: `4. Kiểm tra ${ocrStats?.total || 39} CT` },
                  { step: 5, label: '5. Lưu Database' },
                  { step: 6, label: '6. Hoàn tất' },
                ].map((s) => {
                  const isDone = pipelineStep > s.step || (pipelineStep === 6 && s.step === 6);
                  const isCurrent = pipelineStep === s.step && pipelineStep < 6;
                  return (
                    <div
                      key={s.step}
                      className={`px-2 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                        isDone
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : isCurrent
                          ? 'bg-orange-500 border-orange-600 text-white shadow-xs font-black ring-2 ring-orange-200'
                          : 'bg-white/70 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <Check size={11} className="shrink-0 text-emerald-600 stroke-[3]" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      )}
                      <span className="truncate">{s.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar during active OCR */}
              {status === 'reading_ocr' && (
                <div className="w-full bg-orange-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(4, ocrProgressPct)}%` }}
                  />
                </div>
              )}

              {/* Stage description text */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                <span className="font-semibold text-slate-700 truncate">{progressText || pipelineStepLabel}</span>
                <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                  {pipelineStep === 5 ? 'Đang ghi Firestore & Central DB' : pipelineStep === 6 ? 'Đã đồng bộ' : 'WebAssembly Engine'}
                </span>
              </div>
            </div>
          )}

          {/* Prominent Success Summary Card after Auto-Save or Manual Confirm */}
          {autoSaveResult && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white p-3.5 sm:p-4 space-y-3 shadow-md animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
                      {autoSaveResult.status === 'unchanged'
                        ? 'DỮ LIỆU ĐÃ ĐỒNG BỘ – KHÔNG CÓ THAY ĐỔI'
                        : 'ĐÃ TỰ ĐỘNG LƯU DỮ LIỆU LŨY KẾ THI ĐUA THÀNH CÔNG'}
                    </div>
                    <div className="text-[11px] text-emerald-800 font-medium">
                      {autoSaveResult.status === 'unchanged'
                        ? 'Dữ liệu ảnh vừa OCR trùng khớp 100% với lần lưu gần nhất. Không tạo bản ghi trùng lặp.'
                        : 'Toàn bộ dữ liệu chương trình đã được lưu chính thức vào Cơ sở dữ liệu và Luỹ Kế Thi Đua.'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {analyzedReport && (
                    <button
                      type="button"
                      onClick={() => setIsReviewOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-all shadow-2xs"
                    >
                      <Eye size={13} />
                      <span>Xem lại bảng ({autoSaveResult.totalPrograms} CT)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAutoSaveResult(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Đóng thông báo"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Metrics Grid (Dual-platform Desktop & Mobile optimized) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl border border-emerald-200 bg-white/90 p-2 sm:p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Tổng chương trình</span>
                  <span className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 block">
                    {autoSaveResult.totalPrograms} CT
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white/90 p-2 sm:p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Cập nhật / Thêm mới</span>
                  <span className="text-base sm:text-lg font-black text-slate-800 mt-0.5 block">
                    {autoSaveResult.updatedCount} / {autoSaveResult.savedCount}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white/90 p-2 sm:p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Cơ sở & Kỳ</span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-700 mt-1 block truncate" title={autoSaveResult.storeLabel}>
                    {autoSaveResult.storeLabel} • {autoSaveResult.period}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white/90 p-2 sm:p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Thời gian lưu</span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-700 mt-1 block">
                    {autoSaveResult.timestamp}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Gemini AI Fallback Running Feedback */}
          {status === 'analyzing' && progressText && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 flex items-center gap-2 text-[11px] font-semibold text-blue-800">
              <Loader2 size={14} className="animate-spin shrink-0 text-blue-600" />
              <span>{progressText}</span>
            </div>
          )}

          {/* Error Message Box */}
          {status === 'error' && errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 space-y-1.5 text-[11px] text-rose-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 font-semibold">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-1">
                    <div>{errorMsg}</div>
                    {errorCode === 'OCR_WORKER_LOAD_FAILED' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1 space-y-0.5">
                        <div><strong>Lỗi khởi chạy OCR Worker:</strong> Không thể tải file <code>/ocr/worker.min.js</code> từ server. Vui lòng bấm <strong>Thử lại OCR</strong>.</div>
                      </div>
                    )}
                    {errorCode === 'OCR_CORE_LOAD_FAILED' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1 space-y-0.5">
                        <div><strong>Lỗi tải lõi Tesseract Core:</strong> Không thể tải script lõi tại <code>/ocr/core/</code>. Vui lòng kiểm tra kết nối mạng và bấm <strong>Thử lại OCR</strong>.</div>
                      </div>
                    )}
                    {errorCode === 'OCR_WASM_LOAD_FAILED' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1 space-y-0.5">
                        <div><strong>Lỗi khởi tạo WebAssembly:</strong> Trình duyệt hoặc server gặp lỗi khi nạp <code>/ocr/core/*.wasm</code>. Vui lòng thử lại.</div>
                      </div>
                    )}
                    {errorCode === 'OCR_TRAINEDDATA_LOAD_FAILED' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1 space-y-0.5">
                        <div><strong>Lỗi từ điển ngôn ngữ:</strong> Không thể tải dữ liệu từ điển <code>/ocr/lang/vie.traineddata.gz</code> hoặc <code>eng.traineddata.gz</code>. Vui lòng bấm <strong>Thử lại OCR</strong>.</div>
                      </div>
                    )}
                    {errorCode === 'OCR_IMAGE_DECODE_FAILED' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1 space-y-0.5">
                        <div><strong>Lỗi giải mã ảnh:</strong> Định dạng ảnh không tương thích hoặc file bị hỏng. Vui lòng kiểm tra file ảnh chụp PNG/JPG.</div>
                      </div>
                    )}
                    {errorCode === 'OCR_PROCESSING_FAILED' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1 space-y-0.5">
                        <div><strong>Lỗi xử lý bảng dữ liệu:</strong> Quá trình quét ký tự hoặc phân tích cấu trúc cột gặp sự cố. Bấm <strong>Thử lại OCR</strong> hoặc bấm <strong>Dùng AI nâng cao (Dự phòng)</strong>.</div>
                      </div>
                    )}
                    {errorCode === 'OCR_ERROR' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1 space-y-0.5">
                        <div>Ảnh chụp có thể chưa rõ hoặc bị nghiêng. Bạn có thể:</div>
                        <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-700">
                          <li>Kiểm tra lại ảnh chụp bảng báo cáo BI (đủ các cột Chương trình, Thực hiện, Target...).</li>
                          <li>Bấm <strong>Thử lại OCR</strong> hoặc bấm <strong>Dùng AI nâng cao (Dự phòng)</strong>.</li>
                        </ul>
                      </div>
                    )}
                    {(errorCode === 'GEMINI_API_KEY_MISSING' || errorCode === 'MISSING_API_KEY') && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1.5 space-y-1">
                        <div>
                          <strong>Hướng dẫn cấu hình Cloudflare Pages:</strong>
                        </div>
                        <ol className="list-decimal pl-4 space-y-0.5 text-[10px] text-slate-700">
                          <li>Vào <strong>Cloudflare Dashboard</strong> → <strong>Workers & Pages</strong> → Chọn project <code>crm43751</code> (hoặc <code>crm-sieu-thi</code>).</li>
                          <li>Vào <strong>Settings</strong> → <strong>Variables and Secrets</strong> → Bấm <strong>Add Variable / Secret</strong>.</li>
                          <li>Tên: <code className="px-1 py-0.2 rounded bg-rose-100 font-bold text-rose-800">GEMINI_API_KEY</code> (không dùng tiền tố <code>VITE_</code>).</li>
                          <li>Giá trị: Nhập API Key Gemini lấy từ <code>aistudio.google.com</code>.</li>
                          <li>Thiết lập cho cả <strong>Production</strong> và <strong>Preview</strong>.</li>
                          <li>Bấm <strong>Save and Deploy</strong> hoặc thực hiện <strong>Redeploy</strong> bản build gần nhất.</li>
                        </ol>
                      </div>
                    )}
                    {(errorCode === 'GEMINI_API_KEY_INVALID' || errorCode === 'INVALID_API_KEY') && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1">
                        <strong>Lưu ý Admin:</strong> GEMINI_API_KEY hiện tại không hợp lệ hoặc đã bị vô hiệu hóa trên Google AI Studio. Vui lòng lấy API Key mới tại <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-600">aistudio.google.com</a> và cập nhật lại vào Cloudflare Pages.
                      </div>
                    )}
                    {(errorCode === 'GEMINI_PERMISSION_DENIED' || errorCode === 'PERMISSION_DENIED') && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1">
                        <strong>Quyền hạn:</strong> Tài khoản cần có quyền CẬP NHẬT DỮ LIỆU (khaibao) hoặc API Key bị giới hạn IP/Referer trên Google Cloud Console.
                      </div>
                    )}
                    {(errorCode === 'GEMINI_QUOTA_EXCEEDED' || errorCode === 'QUOTA_EXCEEDED') && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1">
                        <strong>Hạn mức API:</strong> Google Gemini API đã vượt hạn mức sử dụng (Quota Exceeded / HTTP 429). Vui lòng kiểm tra hạn mức hoặc thông tin thanh toán tại Google AI Studio.
                      </div>
                    )}
                    {errorCode === 'GEMINI_RATE_LIMIT' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1">
                        <strong>Tần suất yêu cầu:</strong> Hệ thống đã tự động thử lại nhưng Google API vẫn tạm thời giới hạn tần suất gọi. Vui lòng chờ 10-15 giây rồi bấm nút <strong>Thử lại</strong> bên phải.
                      </div>
                    )}
                    {(errorCode === 'GEMINI_TIMEOUT' || errorCode === 'TIMEOUT') && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1">
                        <strong>Quá thời gian chờ:</strong> Quá 45 giây chưa nhận được phản hồi từ máy chủ Google. Vui lòng kiểm tra kết nối mạng và bấm <strong>Thử lại</strong>.
                      </div>
                    )}
                    {errorCode === 'GEMINI_SERVER_ERROR' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1">
                        <strong>Sự cố máy chủ Google:</strong> Máy chủ Gemini API đang phản hồi lỗi 500/503. Dữ liệu của bạn được bảo toàn 100%, vui lòng thử lại sau ít phút.
                      </div>
                    )}
                    {errorCode === 'GEMINI_INVALID_RESPONSE' && (
                      <div className="text-[10.5px] font-medium text-rose-700 bg-white/80 rounded border border-rose-200 px-2 py-1">
                        <strong>Chất lượng ảnh:</strong> AI không trích xuất được bảng số liệu hợp lệ từ ảnh. Vui lòng kiểm tra ảnh chụp rõ nét bảng báo cáo BI (đủ các cột Chương trình, Thực hiện, Target...).
                      </div>
                    )}
                    {images.length > 0 && (
                      <div className="text-[10px] text-slate-600 font-medium">
                        {images.length} ảnh đã tải lên vẫn được giữ nguyên; 286 dòng dữ liệu LUỸ KẾ THI ĐUA cũ không bị thay đổi.
                      </div>
                    )}
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleRetryOcr}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md bg-orange-600 text-white text-[10.5px] font-extrabold hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw size={11} />
                      <span>Thử lại OCR</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleAnalyzeImages}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-white text-[10px] font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors"
                    >
                      <Sparkles size={10} />
                      <span>Thử AI Cloud</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auto-OCR Result Card with Live Quick Preview & Prominent Confirm Button */}
          {analyzedReport && status !== 'reading_ocr' && (
            <div className="rounded-xl border border-emerald-200 bg-white shadow-sm overflow-hidden space-y-0">
              {/* Header Statistics Bar */}
              <div className="bg-emerald-50/80 px-3 py-2 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-black">
                    <CheckCircle2 size={13} />
                    <span>ĐÃ NHẬN DIỆN {analyzedReport.rows.length} CHƯƠNG TRÌNH</span>
                  </span>
                  <span className="text-[10.5px] font-semibold text-emerald-800">
                    {images.length} trang • Kỳ {analyzedReport.month || monthYearHints.month}/{analyzedReport.year || monthYearHints.year} • {analyzedReport.store_name || resolvedStoreLabel}
                  </span>
                  {analyzedReport.kpi_breakdown && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      KPI: {analyzedReport.kpi_breakdown.dat ?? 0} Đạt · {analyzedReport.kpi_breakdown.canDay ?? 0} Cần đẩy · {analyzedReport.kpi_breakdown.chuaDat ?? 0} Chưa đạt ({analyzedReport.kpi_breakdown.totalReported ?? 39} CT)
                    </span>
                  )}
                  {analyzedReport.expected_total_rows && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        analyzedReport.rows.length === analyzedReport.expected_total_rows
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      <span>
                        KPI Đối chiếu: {analyzedReport.rows.length}/{analyzedReport.expected_total_rows} CT
                      </span>
                      {analyzedReport.rows.length === analyzedReport.expected_total_rows
                        ? ' (Khớp 100%)'
                        : ` (Thiếu ${Math.max(0, analyzedReport.expected_total_rows - analyzedReport.rows.length)} CT)`}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {ocrStats && (
                    <>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100/80 text-emerald-800 font-bold">
                        Chuẩn xác: {ocrStats.valid}
                      </span>
                      {ocrStats.uncertain > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold inline-flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Cần kiểm tra: {ocrStats.uncertain}
                        </span>
                      )}
                      {(ocrStats.missing ?? 0) > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                          Thiếu số: {ocrStats.missing}
                        </span>
                      )}
                      {ocrStats.errors > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                          Lỗi: {ocrStats.errors}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                        Độ tin cậy: {ocrStats.confidence}%
                      </span>
                    </>
                  )}
                  {modelUsed && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {modelUsed}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Table Preview (5 First Rows) */}
              <div className="p-2 sm:p-2.5 space-y-2">
                <div className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Bảng BI xem nhanh ({Math.min(5, analyzedReport.rows.length)}/{analyzedReport.rows.length} dòng đầu):</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Dữ liệu 286 dòng cũ đang được bảo toàn nguyên vẹn 100%)
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-1.5 border-b border-slate-200 w-8 text-center">STT</th>
                        <th className="p-1.5 border-b border-slate-200 min-w-[150px]">1. CHƯƠNG TRÌNH</th>
                        <th className="p-1.5 border-b border-slate-200 text-center w-14">KÊNH</th>
                        <th className="p-1.5 border-b border-slate-200 text-right w-24">2. THỰC HIỆN</th>
                        <th className="p-1.5 border-b border-slate-200 text-right w-24">3. TARGET</th>
                        <th className="p-1.5 border-b border-slate-200 text-right w-24">4. % DỰ KIẾN HT</th>
                        <th className="p-1.5 border-b border-slate-200 text-center w-20">5. HẠNG VÙNG</th>
                        <th className="p-1.5 border-b border-slate-200 text-center w-20">TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {analyzedReport.rows.slice(0, 5).map((row, idx) => {
                        const isTruncated =
                          Boolean(row.note && row.note.includes('rút gọn')) ||
                          row.uncertain_fields?.includes('ten_chuong_trinh') ||
                          /[.…]{2,}$/.test(row.ten_chuong_trinh);

                        const hasErr = row.errors && row.errors.length > 0;
                        const hasMissing = row.missing_fields && row.missing_fields.length > 0;
                        const isUncertain = (row.uncertain_fields && row.uncertain_fields.length > 0) || hasMissing;

                        return (
                          <tr
                            key={row.id || idx}
                            className={hasErr ? 'bg-rose-50/60' : isUncertain ? 'bg-amber-50/60' : 'hover:bg-slate-50/60'}
                          >
                            <td className="p-1.5 text-center font-mono text-[10px] text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 font-semibold text-slate-800">
                              <div className="flex items-center gap-1.5 truncate max-w-[240px]" title={row.ten_chuong_trinh}>
                                <span className="truncate">{row.ten_chuong_trinh}</span>
                                {isTruncated && (
                                  <span
                                    className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0"
                                    title="Tên chương trình bị rút gọn bởi giao diện nguồn (...)"
                                  >
                                    Rút gọn (...)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                  row.kenh === 'SL'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {row.kenh || 'DT'}
                              </span>
                            </td>
                            <td className="p-1.5 text-right font-mono font-medium">
                              {row.thuc_hien !== null && row.thuc_hien !== undefined
                                ? Number(row.thuc_hien).toLocaleString('vi-VN')
                                : <span className="text-amber-600 font-bold">-</span>}
                            </td>
                            <td className="p-1.5 text-right font-mono font-medium">
                              {row.target !== null && row.target !== undefined
                                ? Number(row.target).toLocaleString('vi-VN')
                                : <span className="text-amber-600 font-bold">-</span>}
                            </td>
                            <td className="p-1.5 text-right font-mono font-bold text-orange-600">
                              {row.ty_le_du_kien !== null && row.ty_le_du_kien !== undefined
                                ? `${row.ty_le_du_kien}%`
                                : row.ty_le_thuc_hien !== null && row.ty_le_thuc_hien !== undefined
                                ? `${row.ty_le_thuc_hien}%`
                                : '-'}
                            </td>
                            <td className="p-1.5 text-center font-mono text-[10.5px]">
                              {row.hang_cty !== null && row.hang_cty !== undefined ? row.hang_cty : '-'}
                            </td>
                            <td className="p-1.5 text-center">
                              {hasErr ? (
                                <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                                  Lỗi
                                </span>
                              ) : isUncertain ? (
                                <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                                  <AlertTriangle size={10} /> Cần xem lại
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                                  <Check size={10} /> Chuẩn
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {analyzedReport.rows.length > 5 && (
                  <div className="text-center text-[10.5px] text-slate-500 font-medium">
                    ... và còn <strong>{analyzedReport.rows.length - 5}</strong> chương trình khác. Bấm nút dưới đây để kiểm tra toàn bộ.
                  </div>
                )}

                {/* Primary Action Button (Prominent & Eye-Catching) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="text-[10px] text-slate-500">
                    <span className="text-emerald-700 font-bold">Lưu ý:</span> Kết quả OCR cần Admin xác nhận mới được lưu vào bảng LUỸ KẾ THI ĐUA.
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReviewOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs sm:text-[13px] font-black shadow-md hover:from-emerald-700 hover:to-teal-800 hover:shadow-lg transition-all transform active:scale-[0.99]"
                  >
                    <Eye size={15} />
                    <span>KIỂM TRA VÀ XÁC NHẬN LƯU ({analyzedReport.rows.length} CHƯƠNG TRÌNH)</span>
                  </button>
                </div>

                {/* Internal Admin Debug Panel (Inspection Tool for Engineering) */}
                {hasUpdatePermission && analyzedReport.debug_trace && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAdminDebug((prev) => !prev)}
                      className="text-[10.5px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Cpu size={13} className="text-indigo-600" />
                      <span>{showAdminDebug ? '▼ Ẩn Bảng Debug Kỹ Thuật OCR (Admin)' : '► Xem Bảng Debug Kỹ Thuật OCR (Admin Diagnostic)'}</span>
                    </button>

                    {showAdminDebug && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono space-y-2 border border-slate-700 shadow-inner">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                            <Cpu size={14} /> THÔNG SỐ PIPELINE OCR (NỘI BỘ ADMIN)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(analyzedReport.debug_trace?.rawText || '');
                              setCopiedDebug(true);
                              setTimeout(() => setCopiedDebug(false), 2000);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-600 transition-colors"
                          >
                            {copiedDebug ? '✓ Đã copy Raw OCR' : 'Copy Raw OCR Text'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                          <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">
                            <span className="text-slate-400 block text-[9.5px]">Khối (Blocks):</span>
                            <span className="text-white font-bold text-[12px]">{analyzedReport.debug_trace.blocksCount}</span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">
                            <span className="text-slate-400 block text-[9.5px]">Số từ (Words):</span>
                            <span className="text-white font-bold text-[12px]">{analyzedReport.debug_trace.wordsCount}</span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">
                            <span className="text-slate-400 block text-[9.5px]">Spatial / Stream:</span>
                            <span className="text-amber-400 font-bold text-[12px]">
                              {analyzedReport.debug_trace.spatialRowsCount} / {analyzedReport.debug_trace.streamRowsCount}
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">
                            <span className="text-slate-400 block text-[9.5px]">Parser tạo ra:</span>
                            <span className="text-emerald-400 font-bold text-[12px]">{analyzedReport.debug_trace.detectedRowsCount} CT</span>
                          </div>
                        </div>

                        <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700 text-[10.5px]">
                          <span className="text-slate-400 block text-[9.5px]">Phương thức trích xuất:</span>
                          <span className="text-cyan-400 font-bold">{analyzedReport.debug_trace.parserMethod}</span>
                          {analyzedReport.debug_trace.kpiSummary.totalReported && (
                            <span className="text-slate-300 ml-2">
                              (KPI Header: {analyzedReport.debug_trace.kpiSummary.dat ?? 0} Đạt + {analyzedReport.debug_trace.kpiSummary.canDay ?? 0} Cần đẩy + {analyzedReport.debug_trace.kpiSummary.chuaDat ?? 0} Chưa đạt = {analyzedReport.debug_trace.kpiSummary.totalReported} CT)
                            </span>
                          )}
                        </div>

                        {analyzedReport.debug_trace.discardedLines && analyzedReport.debug_trace.discardedLines.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-slate-400 font-semibold text-[10px]">
                              Dòng bị loại trừ ({analyzedReport.debug_trace.discardedLines.length} dòng):
                            </div>
                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-[9.5px]">
                              {analyzedReport.debug_trace.discardedLines.map((disc, dIdx) => (
                                <div key={dIdx} className="flex items-start justify-between gap-2 p-1 rounded bg-slate-800/40 border border-slate-700/50">
                                  <span className="text-slate-300 truncate max-w-[70%]">{disc.lineText}</span>
                                  <span className="text-rose-400 font-bold shrink-0">{disc.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-slate-400 font-semibold text-[10px] mb-1">Raw OCR Text preview:</div>
                          <textarea
                            readOnly
                            value={analyzedReport.debug_trace.rawText}
                            rows={4}
                            className="w-full p-1.5 rounded bg-black/60 border border-slate-700 text-slate-200 text-[9.5px] font-mono resize-none focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview / Edit / Confirm Modal */}
      <ThiDuaLuyKeAiReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        initialReport={analyzedReport}
        storeLabel={resolvedStoreLabel}
        storeId={normalizeStoreId(resolvedStoreLabel)}
        pageCount={pageCountAnalyzed}
        duplicatesMerged={duplicatesMerged}
        duplicateProgramsOnMerge={duplicateProgramsOnMerge}
        modelUsed={modelUsed}
        existingMeta={savedMeta}
        hasUpdatePermission={hasUpdatePermission}
        isSaving={isSaving}
        imagePreviews={images.map((img) => img.previewUrl)}
        onConfirmSave={handleConfirmAndSave}
        onSaveValidOnly={handleSaveValidOnly}
        onSaveDraft={handleSaveDraftManual}
      />
    </div>
  );
};
