/**
 * MODULE LUỸ KẾ THI ĐUA – AUTO OCR & AUTO SAVE FIREBASE
 * Quy trình tinh gọn 1-chạm:
 * 1 NÚT TẢI ẢNH → AI TỰ ĐỌC → TỰ KIỂM TRA & CHUẨN HÓA → TỰ LƯU FIREBASE → TỰ CẬP NHẬT LUỸ KẾ THI ĐUA.
 * Không yêu cầu bất kỳ thao tác trung gian hay nút xác nhận nào.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  FileImage,
  Layers,
  Trash2,
  Check,
  ArrowRight,
  Database,
  Calendar,
  Store,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { isGuestShareLink } from '../../../constants/routes';
import { isSuperAdmin43751 } from '../../../firebaseAdapter';
import { isValidStoreName, normalizeStoreId } from '../utils';
import type { MarketInfo } from '../types';
import {
  computeThiDuaReportHash,
  mergeMultiPageReports,
  mergeThiDuaRowsWithBiText,
  normalizeBIData,
  type ThiDuaAiReportResult,
  type ThiDuaLkMeta,
  type ThiDuaLkUpdateHistoryEntry,
  type ThiDuaAiRow,
} from '../../../utils/thiDuaAiParser';
import {
  runAutoOcrOnImages,
  terminateSharedOcrWorker,
} from '../../../utils/thiDuaOcrEngine';
import { thiDuaCentralService } from '../../../services/thiDuaCentralService';

interface SelectedImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeKb: number;
  width?: number;
  height?: number;
}

type PipelineStatus =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'extracting'
  | 'normalizing'
  | 'saving'
  | 'completed'
  | 'error';

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
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit per image

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
  const maxDim = 5000;
  const width = item.width || 0;
  const height = item.height || 0;

  if (item.file.size <= MAX_FILE_SIZE_BYTES && Math.max(width, height) <= maxDim) {
    const raw = await readFileAsDataUrl(item.file);
    return { imageBase64: raw.base64, mimeType: raw.mimeType };
  }

  // Tinh chỉnh tỷ lệ cho ảnh siêu nét mà không vỡ số liệu
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

/**
 * Trích xuất số lượng ngành hàng độc nhất từ danh sách chương trình
 */
function countDistinctCategories(rows: ThiDuaAiRow[]): number {
  if (!rows || rows.length === 0) return 0;
  const categories = new Set<string>();
  for (const r of rows) {
    const raw = String(r.ten_chuong_trinh || '').trim();
    // Bỏ tiền tố tháng như "T11 - ", "T12 - ", "T07 - "
    const clean = raw.replace(/^T\d{1,2}\s*[-–—:]\s*/i, '').trim();
    if (clean) {
      categories.add(clean.toLowerCase());
    }
  }
  return categories.size > 0 ? categories.size : rows.length;
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
  const activeImagesRef = useRef<SelectedImageItem[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [pipelineStep, setPipelineStep] = useState<number | null>(null);
  const [pipelineStepLabel, setPipelineStepLabel] = useState<string>('');
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [retryReport, setRetryReport] = useState<ThiDuaAiReportResult | null>(null);

  const [autoSaveResult, setAutoSaveResult] = useState<{
    status: 'saved' | 'unchanged';
    totalPrograms: number;
    totalCategories: number;
    savedCount: number;
    updatedCount: number;
    storeLabel: string;
    period: string;
    timestamp: string;
  } | null>(null);

  // Phân quyền
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

  // Siêu thị đích
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

  const monthYearHints = useMemo(() => {
    if (selectedMonth && /^\d{4}-\d{1,2}$/.test(selectedMonth)) {
      const [yStr, mStr] = selectedMonth.split('-');
      return { year: Number(yStr), month: Number(mStr) };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedMonth]);

  // Dọn dẹp bộ nhớ object URLs
  useEffect(() => {
    return () => {
      activeImagesRef.current.forEach((img) => {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch {}
      });
      terminateSharedOcrWorker();
    };
  }, []);

  /**
   * Bước 5: AUTO SAVE FIREBASE
   * Ghi nhận dữ liệu trực tiếp vào Firebase / Firestore và đồng bộ Luỹ Kế Thi Đua
   */
  const executeAutoSave = async (
    normalizedReport: ThiDuaAiReportResult,
    preparedImages: SelectedImageItem[]
  ) => {
    const now = new Date();
    const rows = normalizedReport.rows;
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

    // Chống ghi đè trùng lặp: Nếu dữ liệu giống 100% lần lưu vừa rồi
    const reportHash = computeThiDuaReportHash({
      month: normalizedReport.month,
      year: normalizedReport.year,
      rows: normalizedReport.rows,
    });

    if (savedMeta?.reportHash && savedMeta.reportHash === reportHash) {
      setPipelineStep(6);
      setPipelineStepLabel('Hoàn tất!');
      setStatus('completed');
      setProgressText('Dữ liệu ảnh trùng khớp 100% với lần lưu gần nhất. Không có thay đổi.');
      setAutoSaveResult({
        status: 'unchanged',
        totalPrograms: rows.length,
        totalCategories: countDistinctCategories(rows),
        savedCount: 0,
        updatedCount: rows.length,
        storeLabel: targetStoreLabel,
        period,
        timestamp: new Date().toLocaleString('vi-VN'),
      });
      showNotification('Dữ liệu đã đồng bộ 100% với lần lưu gần nhất.', 'info');
      return;
    }

    // Merge với dữ liệu hiện tại
    const mergeResult = mergeThiDuaRowsWithBiText(currentValue, rows, {
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

    // Cập nhật state cục bộ
    onApplyBiText(mergeResult.text);

    // Kích hoạt pipeline lưu Firebase (store doc, categoryTargets, realtime sync)
    await onTriggerSavePipeline();

    // Lưu Central Competition Database Service (thi_dua_batches + store + realtime event)
    await thiDuaCentralService.saveCompetitionBatch({
      storeId: storeDocId,
      storeName: targetStoreLabel,
      warehouseCode: effectiveMaKho === 'GLOBAL' ? '' : effectiveMaKho,
      month: normalizedReport.month,
      year: normalizedReport.year,
      programs: rows,
      existingBiText: currentValue,
      batchId,
      sourceType: 'AI_VISION_BI',
      username: userProfile?.username || 'ADMIN',
      adminConfirmedWarnings: true,
      pageCount: preparedImages.length,
      duplicatesMerged: 0,
    });

    // Cập nhật metadata lưu trữ
    const newHistoryEntry: ThiDuaLkUpdateHistoryEntry = {
      updatedAt: now.toISOString(),
      updatedBy: userProfile?.username || 'ADMIN',
      source: 'AI_VISION_BI',
      period,
      rowCount: rows.length,
      expectedRowCount: normalizedReport.expected_total_rows || rows.length,
      reportHash,
      batchId,
      batchStatus: 'SAVED',
      updatedCount: mergeResult.updatedCount,
      addedCount: mergeResult.addedCount,
    };

    const nextMeta: ThiDuaLkMeta = {
      lastUpdatedAt: now.toISOString(),
      lastUpdatedBy: userProfile?.username || 'ADMIN',
      source: 'AI_VISION_BI',
      period,
      month: normalizedReport.month,
      year: normalizedReport.year,
      rowCount: rows.length,
      expectedRowCount: normalizedReport.expected_total_rows || rows.length,
      reportHash,
      batchId,
      batchStatus: 'SAVED',
      updatedCount: mergeResult.updatedCount,
      addedCount: mergeResult.addedCount,
      pageCount: preparedImages.length,
      duplicatesMerged: 0,
      uncertainConfirmed: true,
      rowsSnapshot: rows.map((r) => ({
        ten_chuong_trinh: r.ten_chuong_trinh,
        kenh: r.kenh || 'DT',
        thuc_hien: r.thuc_hien ?? 0,
        target: r.target ?? 0,
        ty_le_thuc_hien: r.ty_le_thuc_hien,
        ty_le_du_kien: r.ty_le_du_kien,
        hang_cty: r.hang_cty,
      })),
      history: [newHistoryEntry, ...(savedMeta?.history || [])].slice(0, 10),
    };

    setSavedMeta(nextMeta);
    try {
      localStorage.setItem(metaStorageKey, JSON.stringify(nextMeta));
    } catch {}

    lastSavedBatchRef.current = batchId;

    // Giai đoạn 6: Hoàn tất & Cập nhật giao diện ngay lập tức
    setPipelineStep(6);
    setPipelineStepLabel('Hoàn tất!');
    setStatus('completed');
    setProgressText(`ĐÃ TỰ ĐỘNG ĐỌC VÀ LƯU DỮ LIỆU THÀNH CÔNG (${rows.length} CT)!`);

    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch {}

    const totalCategories = countDistinctCategories(rows);

    setAutoSaveResult({
      status: 'saved',
      totalPrograms: rows.length,
      totalCategories,
      savedCount: mergeResult.addedCount,
      updatedCount: mergeResult.updatedCount,
      storeLabel: targetStoreLabel,
      period,
      timestamp: now.toLocaleString('vi-VN'),
    });

    setRetryReport(null);

    showNotification(
      `ĐÃ TỰ ĐỘNG ĐỌC VÀ LƯU DỮ LIỆU THÀNH CÔNG (${rows.length} CT, ${totalCategories} ngành hàng)!`,
      'success'
    );
  };

  /**
   * QUY TRÌNH OCR TỰ ĐỘNG 1-CHẠM KHI NGƯỜI DÙNG CHỌN ẢNH
   * B1: Upload file
   * B2: Gọi AI OCR (Backend Gemini Vision)
   * B3: Trích xuất dữ liệu
   * B4: Chuẩn hóa & Validation
   * B5: Auto Save Firebase
   * B6: Cập nhật giao diện Luỹ Kế Thi Đua
   */
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    if (!hasUpdatePermission) {
      showNotification('Tài khoản của bạn không có quyền cập nhật dữ liệu.', 'error');
      return;
    }

    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    // Lọc file hợp lệ
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

    // Kiểm tra dung lượng
    const oversized = validFiles.find((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      setErrorMsg(`File "${oversized.name}" vượt quá dung lượng cho phép (tối đa 15MB/ảnh). Vui lòng chọn ảnh khác.`);
      setStatus('error');
      return;
    }

    // Bắt đầu quy trình tự động
    setErrorMsg('');
    setAutoSaveResult(null);
    setRetryReport(null);
    const names = validFiles.map((f) => f.name);
    setSelectedFileNames(names);

    // Dọn dẹp ảnh cũ
    activeImagesRef.current.forEach((img) => {
      try {
        URL.revokeObjectURL(img.previewUrl);
      } catch {}
    });

    try {
      // ================= BƯỚC 1: ĐANG TẢI ẢNH LÊN =================
      setStatus('uploading');
      setPipelineStep(1);
      setPipelineStepLabel('1. Đang tải ảnh lên...');
      setProgressText(`Đang tải ${validFiles.length} ảnh (${names.join(', ')})...`);

      const preparedImages: SelectedImageItem[] = [];
      for (const file of validFiles) {
        const previewUrl = URL.createObjectURL(file);
        const dims = await getImageDimensions(previewUrl);
        preparedImages.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl,
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          width: dims.width,
          height: dims.height,
        });
      }
      activeImagesRef.current = preparedImages;

      // ================= BƯỚC 2: AI ĐANG PHÂN TÍCH HÌNH ẢNH =================
      setStatus('analyzing');
      setPipelineStep(2);
      setPipelineStepLabel('2. AI đang phân tích hình ảnh...');
      setProgressText(`AI đang phân tích và đọc toàn bộ dữ liệu ${preparedImages.length} ảnh...`);

      const allowedPages =
        userProfile?.userPermissions?.allowedPages ||
        ((userProfile?.permissions as string[] | undefined) ?? []);

      const pageReports: ThiDuaAiReportResult[] = [];
      let geminiVisionError: Error | null = null;

      // Gọi Backend Gemini Vision API (bảo mật GEMINI_API_KEY ở server)
      for (let i = 0; i < preparedImages.length; i++) {
        const img = preparedImages[i];
        setProgressText(
          `AI đang phân tích hình ảnh trang ${i + 1}/${preparedImages.length} (${img.name})...`
        );

        try {
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
              totalPages: preparedImages.length,
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
            throw new Error(`Máy chủ phản hồi không hợp lệ (HTTP ${res.status}).`);
          }

          if (!res.ok || !json?.ok || !json?.report) {
            throw new Error(json?.error || `Phân tích AI ảnh ${img.name} thất bại.`);
          }

          pageReports.push(json.report as ThiDuaAiReportResult);
        } catch (visionErr: any) {
          console.warn(`[AutoOcr] Backend AI Vision error on image ${i + 1}:`, visionErr);
          geminiVisionError = visionErr;
          break;
        }
      }

      // Fallback tự động: Nếu Backend AI Vision không phản hồi, tự động dùng bộ đọc OCR WebAssembly client
      if (pageReports.length < preparedImages.length) {
        setProgressText('Đang tự động chuyển sang bộ đọc OCR dự phòng để hoàn tất nhận diện...');
        try {
          const ocrFallbackRes = await runAutoOcrOnImages(preparedImages, {
            monthHint: monthYearHints.month,
            yearHint: monthYearHints.year,
            storeNameHint: resolvedStoreLabel,
          });
          if (ocrFallbackRes?.report?.rows?.length) {
            pageReports.length = 0;
            pageReports.push(ocrFallbackRes.report);
          } else {
            throw geminiVisionError || new Error('Không thể nhận diện nội dung bảng từ ảnh.');
          }
        } catch (ocrErr: any) {
          throw geminiVisionError || ocrErr;
        }
      }

      // ================= BƯỚC 3: ĐANG TRÍCH XUẤT DỮ LIỆU =================
      setStatus('extracting');
      setPipelineStep(3);
      setPipelineStepLabel('3. Đang trích xuất dữ liệu...');
      setProgressText('Đang trích xuất toàn bộ chương trình và ngành hàng...');

      const { merged } = mergeMultiPageReports(pageReports);
      if (merged.month === null) merged.month = monthYearHints.month;
      if (merged.year === null) merged.year = monthYearHints.year;

      // ================= BƯỚC 4: ĐANG KIỂM TRA VÀ CHUẨN HÓA =================
      setStatus('normalizing');
      setPipelineStep(4);
      setPipelineStepLabel('4. Đang kiểm tra và chuẩn hóa...');
      setProgressText('Đang kiểm tra tính hợp lệ và chuẩn hóa cấu trúc dữ liệu...');

      const normalizedReport = normalizeBIData(merged);
      const rows = normalizedReport.rows;

      if (!rows || rows.length === 0) {
        throw new Error(
          'Không tìm thấy dòng chương trình thi đua nào trong ảnh. Vui lòng kiểm tra lại ảnh chụp đúng bảng báo cáo BI Luỹ kế thi đua.'
        );
      }

      // Kiểm tra tên chương trình không được rỗng
      const invalidProgramName = rows.find((r) => !r.ten_chuong_trinh || !r.ten_chuong_trinh.trim());
      if (invalidProgramName) {
        throw new Error('Dữ liệu ảnh có dòng thiếu tên chương trình. Vui lòng kiểm tra lại ảnh chụp.');
      }

      setRetryReport(normalizedReport);

      // ================= BƯỚC 5: ĐANG LƯU DỮ LIỆU VÀO FIREBASE =================
      setStatus('saving');
      setPipelineStep(5);
      setPipelineStepLabel('5. Đang lưu dữ liệu vào Firebase...');
      setProgressText(`Đang tự động lưu ${rows.length} chương trình vào Firebase...`);

      await executeAutoSave(normalizedReport, preparedImages);
    } catch (err: any) {
      console.error('[AutoOcr Pipeline Error]', err);
      setStatus('error');
      setPipelineStep(null);
      setErrorMsg(err?.message || 'Lỗi trong quá trình nhận diện và lưu dữ liệu thi đua.');
      setProgressText('');
    }
  };

  /**
   * Thử lưu lại Firebase nếu lần trước OCR thành công nhưng Firebase ghi lỗi
   */
  const handleRetrySaveFirebase = async () => {
    if (!retryReport) return;
    setStatus('saving');
    setPipelineStep(5);
    setPipelineStepLabel('5. Đang lưu dữ liệu vào Firebase...');
    setProgressText(`Đang thử lưu lại ${retryReport.rows.length} chương trình vào Firebase...`);
    setErrorMsg('');
    try {
      await executeAutoSave(retryReport, activeImagesRef.current);
    } catch (err: any) {
      setStatus('error');
      setPipelineStep(null);
      setErrorMsg(err?.message || 'Lỗi khi lưu dữ liệu vào Firebase.');
    }
  };

  const isBusy = status !== 'idle' && status !== 'completed' && status !== 'error';

  return (
    <div className="relative z-10 mt-2.5 pt-2 border-t border-orange-200/60 space-y-3">
      {/* Permission Guard */}
      {!hasUpdatePermission ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-2.5 text-xs text-slate-600">
          <AlertCircle size={15} className="text-slate-400 shrink-0" />
          <span>
            Chỉ tài khoản có quyền <strong>CẬP NHẬT DỮ LIỆU</strong> mới có thể tải ảnh báo cáo BI.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* KHU VỰC DUY NHẤT: NÚT TẢI ẢNH + DROPZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isBusy) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!isBusy && e.dataTransfer?.files?.length) {
                handleFilesSelected(e.dataTransfer.files);
              }
            }}
            className={`rounded-2xl border-2 border-dashed p-3 sm:p-4 transition-all duration-200 ${
              isDragging
                ? 'border-orange-500 bg-orange-100/60 scale-[1.005]'
                : 'border-orange-300/80 bg-gradient-to-br from-orange-50/50 via-amber-50/30 to-white hover:border-orange-400 hover:bg-orange-50/70 shadow-2xs'
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Text & Icon bên trái */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Upload size={20} className={isBusy ? 'animate-bounce' : ''} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-800 truncate">
                    TẢI ẢNH BÁO CÁO BI LŨY KẾ THI ĐUA
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    Hỗ trợ PNG, JPG, JPEG • Đọc nhiều trang & ảnh ghép • Tự động nhận diện & lưu Firebase
                  </div>
                </div>
              </div>

              {/* NÚT TẢI ẢNH CHÍNH (DUY NHẤT) */}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              >
                {isBusy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>ĐANG XỬ LÝ...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>TẢI ẢNH</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ================= BẢNG TIẾN TRÌNH TỰ ĐỘNG (PROGRESS PANEL) ================= */}
          {pipelineStep !== null && status !== 'idle' && (
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/90 via-amber-50/60 to-white p-3.5 sm:p-4 space-y-3 shadow-sm animate-in fade-in duration-200">
              {/* Header tiến trình */}
              <div className="flex items-center justify-between text-xs sm:text-sm font-black text-orange-950">
                <span className="flex items-center gap-2">
                  {pipelineStep < 6 && status !== 'error' ? (
                    <Loader2 size={16} className="animate-spin text-orange-600 shrink-0" />
                  ) : pipelineStep === 6 ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  )}
                  <span className="uppercase tracking-wide">
                    TIẾN TRÌNH TỰ ĐỘNG: BƯỚC {pipelineStep}/6 – {pipelineStepLabel}
                  </span>
                </span>
                <span className="text-orange-700 font-extrabold text-xs">
                  {Math.round((pipelineStep / 6) * 100)}%
                </span>
              </div>

              {/* Grid 6 Bước */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-[10.5px] sm:text-[11px] font-bold">
                {[
                  { step: 1, label: '1. Tải ảnh lên' },
                  { step: 2, label: '2. AI phân tích' },
                  { step: 3, label: '3. Trích xuất' },
                  { step: 4, label: '4. Chuẩn hóa' },
                  { step: 5, label: '5. Lưu Firebase' },
                  { step: 6, label: '6. Hoàn tất' },
                ].map((s) => {
                  const isDone = pipelineStep > s.step || (pipelineStep === 6 && s.step === 6);
                  const isCurrent = pipelineStep === s.step && pipelineStep < 6;
                  return (
                    <div
                      key={s.step}
                      className={`px-2 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                        isDone
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : isCurrent
                          ? 'bg-orange-500 border-orange-600 text-white shadow-xs font-black ring-2 ring-orange-200'
                          : 'bg-white/70 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <Check size={12} className="shrink-0 text-emerald-600 stroke-[3]" />
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

              {/* Thanh Progress bar */}
              <div className="w-full bg-orange-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.round((pipelineStep / 6) * 100)}%` }}
                />
              </div>

              {/* Thông điệp chi tiết */}
              <div className="text-xs text-slate-600 font-medium truncate">
                {progressText || pipelineStepLabel}
              </div>
            </div>
          )}

          {/* ================= THÔNG BÁO LƯU THÀNH CÔNG (SUCCESS DISPLAY) ================= */}
          {autoSaveResult && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-4 space-y-3 shadow-md animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
                      ĐÃ TỰ ĐỘNG ĐỌC VÀ LƯU DỮ LIỆU THÀNH CÔNG
                    </div>
                    <div className="text-[11px] text-emerald-800 font-medium">
                      Toàn bộ chương trình & ngành hàng đã được lưu chính thức vào Firebase và cập nhật Luỹ Kế Thi Đua.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoSaveResult(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 self-end sm:self-center cursor-pointer"
                  title="Đóng thông báo"
                >
                  Đóng
                </button>
              </div>

              {/* 6 CHỈ SỐ BẮT BUỘC (Desktop 6 cột, Mobile 2 cột) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {/* 1. Tổng số chương trình */}
                <div className="rounded-xl border border-emerald-200 bg-white/95 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
                    Tổng chương trình
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 block">
                    {autoSaveResult.totalPrograms} CT
                  </span>
                </div>

                {/* 2. Tổng số ngành hàng */}
                <div className="rounded-xl border border-emerald-200 bg-white/95 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
                    Tổng ngành hàng
                  </span>
                  <span className="text-base sm:text-lg font-black text-teal-700 mt-0.5 block">
                    {autoSaveResult.totalCategories} ngành
                  </span>
                </div>

                {/* 3. Số dòng dữ liệu mới */}
                <div className="rounded-xl border border-emerald-200 bg-white/95 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
                    Số dòng mới
                  </span>
                  <span className="text-base sm:text-lg font-black text-indigo-700 mt-0.5 block">
                    +{autoSaveResult.savedCount} dòng
                  </span>
                </div>

                {/* 4. Số dòng được cập nhật */}
                <div className="rounded-xl border border-emerald-200 bg-white/95 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
                    Số dòng cập nhật
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-800 mt-0.5 block">
                    {autoSaveResult.updatedCount} dòng
                  </span>
                </div>

                {/* 5. Tên siêu thị / cơ sở */}
                <div className="rounded-xl border border-emerald-200 bg-white/95 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
                    Cơ sở / Siêu thị
                  </span>
                  <span
                    className="text-xs sm:text-sm font-extrabold text-slate-700 mt-1 block truncate"
                    title={autoSaveResult.storeLabel}
                  >
                    {autoSaveResult.storeLabel}
                  </span>
                </div>

                {/* 6. Thời gian lưu */}
                <div className="rounded-xl border border-emerald-200 bg-white/95 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
                    Thời gian lưu
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-700 mt-1 block">
                    {autoSaveResult.timestamp}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= XỬ LÝ LỖI (ERROR DISPLAY) ================= */}
          {status === 'error' && errorMsg && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-3.5 sm:p-4 space-y-2.5 text-xs text-rose-900 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <div className="font-extrabold text-rose-950 uppercase">
                    XỬ LÝ THẤT BẠI
                  </div>
                  <div className="text-rose-800 font-medium">
                    {errorMsg}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/60">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-xs cursor-pointer"
                >
                  <Upload size={13} />
                  <span>TẢI LẠI ẢNH</span>
                </button>

                {retryReport && (
                  <button
                    type="button"
                    onClick={handleRetrySaveFirebase}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Thử lưu lại Firebase</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
