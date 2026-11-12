import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  History,
  ImagePlus,
  Lock,
  Loader2,
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
  type ThiDuaAiReportResult,
  type ThiDuaLkMeta,
  type ThiDuaLkUpdateHistoryEntry,
} from '../../../utils/thiDuaAiParser';
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

type PipelineStatus = 'idle' | 'loading_images' | 'analyzing' | 'completed' | 'error';

interface ThiDuaLuyKeAiUploaderProps {
  currentValue: string;
  activeStore?: string;
  availableMarkets?: MarketInfo[];
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
  const maxDirectBytes = 3.2 * 1024 * 1024;
  const maxDim = 2800;
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

  const [images, setImages] = useState<SelectedImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [expectedRowsHint, setExpectedRowsHint] = useState<string>('');

  const [analyzedReport, setAnalyzedReport] = useState<ThiDuaAiReportResult | null>(null);
  const [pageCountAnalyzed, setPageCountAnalyzed] = useState<number>(0);
  const [duplicatesMerged, setDuplicatesMerged] = useState<number>(0);
  const [duplicateProgramsOnMerge, setDuplicateProgramsOnMerge] = useState<string[]>([]);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    const candidate = availableMarkets.find(
      (m) => m?.name && m.name !== 'ALL' && isValidStoreName(m.name)
    );
    if (candidate?.name) return candidate.name;
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

  // Revoke object URLs on unmount to avoid memory leaks
  const imagesRef = useRef<SelectedImageItem[]>([]);
  imagesRef.current = images;
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch {}
      });
    };
  }, []);

  const monthYearHints = useMemo(() => {
    if (selectedMonth && /^\d{4}-\d{1,2}$/.test(selectedMonth)) {
      const [yStr, mStr] = selectedMonth.split('-');
      return { year: Number(yStr), month: Number(mStr) };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedMonth]);

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
      setStatus('error');
      return;
    }

    setStatus('loading_images');
    setProgressText(`Đang tải ${validFiles.length} ảnh xem trước...`);
    setErrorMsg('');

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

      setImages((prev) => [...prev, ...prepared]);
      setStatus('idle');
      setProgressText('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể tải ảnh đã chọn.');
      setStatus('error');
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) {
        try {
          URL.revokeObjectURL(found.previewUrl);
        } catch {}
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleClearImages = () => {
    images.forEach((img) => {
      try {
        URL.revokeObjectURL(img.previewUrl);
      } catch {}
    });
    setImages([]);
    setStatus('idle');
    setProgressText('');
    setErrorMsg('');
  };

  const handleAnalyzeImages = async () => {
    if (!hasUpdatePermission) {
      showNotification('Tài khoản không có quyền sử dụng AI nhận diện.', 'error');
      return;
    }
    if (images.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 ảnh báo cáo BI để phân tích.');
      setStatus('error');
      return;
    }

    setStatus('analyzing');
    setErrorMsg('');
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

        const json = await res.json();
        if (!res.ok || !json?.ok || !json?.report) {
          throw new Error(
            json?.error || `Phân tích ảnh ${i + 1} thất bại (HTTP ${res.status}).`
          );
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

      setAnalyzedReport(merged);
      setPageCountAnalyzed(images.length);
      setDuplicatesMerged(mergedCount);
      setDuplicateProgramsOnMerge(duplicatePrograms);
      setModelUsed(latestModel);
      setStatus('completed');
      setProgressText(
        `Hoàn thành nhận diện ${merged.rows.length} chương trình. Chờ Admin xác nhận.`
      );
      setIsReviewOpen(true);
    } catch (err: any) {
      setStatus('error');
      setProgressText('');
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
    try {
      const now = new Date();
      const targetStoreLabel =
        finalReport.store_name && isValidStoreName(finalReport.store_name) && activeStore === 'ALL'
          ? finalReport.store_name
          : resolvedStoreLabel;

      const serializedBiText = serializeThiDuaRowsToBiText(finalReport.rows, {
        storeLabel: targetStoreLabel,
        month: finalReport.month,
        year: finalReport.year,
        updatedAt: now,
      });

      try {
        localStorage.removeItem('crm_field_cleared_rt_catlk');
      } catch {}

      // Apply to shared React state and trigger existing LUỸ KẾ THI ĐUA save + sync pipeline
      onApplyBiText(serializedBiText);

      // Wait briefly so LuykeDataContext useEffect syncs clusterCategoryInputRef before save
      await new Promise((resolve) => setTimeout(resolve, 140));
      await onTriggerSavePipeline();

      // Persist lightweight metadata (source, timestamp, period, hash, compact snapshot, history)
      const mm = finalReport.month
        ? String(finalReport.month).padStart(2, '0')
        : String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = finalReport.year || now.getFullYear();
      const period = `${mm}/${yyyy}`;
      const reportHash = computeThiDuaReportHash({
        month: finalReport.month,
        year: finalReport.year,
        rows: finalReport.rows,
      });

      const newHistoryEntry: ThiDuaLkUpdateHistoryEntry = {
        updatedAt: now.toISOString(),
        updatedBy: userProfile?.username || 'ADMIN',
        source: 'AI_VISION_BI',
        period,
        rowCount: finalReport.rows.length,
        expectedRowCount: finalReport.expected_total_rows,
        reportHash,
      };

      const nextHistory = [newHistoryEntry, ...(savedMeta?.history || [])].slice(0, 10);
      const nextMeta: ThiDuaLkMeta = {
        lastUpdatedAt: now.toISOString(),
        lastUpdatedBy: userProfile?.username || 'ADMIN',
        source: 'AI_VISION_BI',
        period,
        month: finalReport.month,
        year: finalReport.year,
        rowCount: finalReport.rows.length,
        expectedRowCount: finalReport.expected_total_rows,
        reportHash,
        pageCount: metaInfo.pageCount,
        duplicatesMerged: metaInfo.duplicatesMerged,
        uncertainConfirmed: metaInfo.adminConfirmedWarnings,
        rowsSnapshot: finalReport.rows.map((r) => ({
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

      if (targetStoreLabel && targetStoreLabel !== 'ALL' && isValidStoreName(targetStoreLabel)) {
        const storeDocId = normalizeStoreId(targetStoreLabel);
        if (storeDocId && storeDocId !== 'ALL') {
          await supabase.from('store').upsert({
            id: storeDocId,
            warehouse_code: effectiveMaKho === 'GLOBAL' ? '' : effectiveMaKho,
            ten_sieu_thi: targetStoreLabel,
            lk_nh_meta: nextMeta,
          });
        }
      }

      setIsReviewOpen(false);
      setAnalyzedReport(null);
      handleClearImages();
      showNotification(
        `Đã lưu thành công ${finalReport.rows.length} chương trình LUỸ KẾ THI ĐUA từ AI Vision!`,
        'success'
      );
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi lưu dữ liệu Luỹ kế thi đua.', 'error');
    } finally {
      setIsSaving(false);
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
    <div className="mt-2.5 pt-2.5 border-t border-orange-200/70 space-y-2">
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

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={status === 'analyzing' || isSaving}
                  onClick={handleAnalyzeImages}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-extrabold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {status === 'analyzing' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>ĐANG PHÂN TÍCH AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>PHÂN TÍCH {images.length} ẢNH BẰNG AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Pipeline Status Feedback */}
          {(status === 'loading_images' || status === 'analyzing') && progressText && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 flex items-center gap-2 text-[11px] font-semibold text-blue-800">
              <Loader2 size={13} className="animate-spin shrink-0" />
              <span>{progressText}</span>
            </div>
          )}

          {status === 'error' && errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 flex items-start gap-2 text-[11px] font-semibold text-rose-700">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {analyzedReport && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>
                  Đã nhận diện {analyzedReport.rows.length} chương trình (chưa lưu vào DB).
                </span>
              </span>
              <button
                type="button"
                onClick={() => setIsReviewOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10.5px] font-extrabold hover:bg-emerald-700"
              >
                <Eye size={12} />
                <span>XEM TRƯỚC & XÁC NHẬN LƯU</span>
              </button>
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
        pageCount={pageCountAnalyzed}
        duplicatesMerged={duplicatesMerged}
        duplicateProgramsOnMerge={duplicateProgramsOnMerge}
        modelUsed={modelUsed}
        existingMeta={savedMeta}
        hasUpdatePermission={hasUpdatePermission}
        isSaving={isSaving}
        onConfirmSave={handleConfirmAndSave}
      />
    </div>
  );
};
