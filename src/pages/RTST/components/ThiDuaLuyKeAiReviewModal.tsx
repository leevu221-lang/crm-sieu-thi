import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  FileText,
  FileWarning,
  Info,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildValidationSummary,
  computeThiDuaReportHash,
  createRowId,
  normalizeBIData,
  normalizeKenh,
  parseStrictBiNumber,
  validateThiDuaRow,
  type ThiDuaAiReportResult,
  type ThiDuaAiRow,
  type ThiDuaKenh,
  type ThiDuaLkMeta,
} from '../../../utils/thiDuaAiParser';
import { saveThiDuaDraft } from '../../../utils/thiDuaDraftStorage';

interface ThiDuaLuyKeAiReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReport: ThiDuaAiReportResult | null;
  storeLabel: string;
  storeId?: string;
  pageCount: number;
  duplicatesMerged: number;
  duplicateProgramsOnMerge: string[];
  modelUsed?: string;
  existingMeta?: ThiDuaLkMeta | null;
  hasUpdatePermission: boolean;
  isSaving: boolean;
  imagePreviews?: string[];
  onConfirmSave: (
    finalReport: ThiDuaAiReportResult,
    metaInfo: {
      adminConfirmedWarnings: boolean;
      duplicatesMerged: number;
      pageCount: number;
    }
  ) => Promise<void>;
  onSaveValidOnly?: (
    validReport: ThiDuaAiReportResult,
    metaInfo: {
      adminConfirmedWarnings: boolean;
      duplicatesMerged: number;
      pageCount: number;
    }
  ) => Promise<void>;
  onSaveDraft?: (
    report: ThiDuaAiReportResult,
    isManual?: boolean
  ) => Promise<void>;
}

type FilterMode = 'ALL' | 'ISSUES' | 'UNCERTAIN' | 'MISSING' | 'UNDER_100' | 'OVER_100';

function numToEditString(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '';
  return String(v);
}

export const ThiDuaLuyKeAiReviewModal: React.FC<ThiDuaLuyKeAiReviewModalProps> = ({
  isOpen,
  onClose,
  initialReport,
  storeLabel,
  storeId,
  pageCount,
  duplicatesMerged,
  duplicateProgramsOnMerge,
  modelUsed,
  existingMeta,
  hasUpdatePermission,
  isSaving,
  imagePreviews = [],
  onConfirmSave,
  onSaveValidOnly,
  onSaveDraft,
}) => {
  const [rows, setRows] = useState<ThiDuaAiRow[]>([]);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [expectedTotalText, setExpectedTotalText] = useState<string>('');
  const [rawCellDrafts, setRawCellDrafts] = useState<Record<string, Record<string, string>>>({});
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminConfirmedWarnings, setAdminConfirmedWarnings] = useState(false);
  const [recheckBanner, setRecheckBanner] = useState<{ type: 'ok' | 'warn'; text: string } | null>(
    null
  );
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [draftSavedAt, setDraftSavedAt] = useState<string>('');
  const autoSaveTimerRef = useRef<any>(null);

  // Admin Debug Inspector Mode state
  const [isAdminDebugMode, setIsAdminDebugMode] = useState(false);
  const [selectedInspectCell, setSelectedInspectCell] = useState<{
    rowId: string;
    field: 'ten_chuong_trinh' | 'kenh' | 'thuc_hien' | 'target' | 'ty_le_thuc_hien' | 'ty_le_du_kien' | 'hang_cty';
    rowIdx: number;
  } | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [imgNaturalDims, setImgNaturalDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!isOpen || !initialReport) return;
    const normalized = normalizeBIData(initialReport);
    setRows(normalized.rows.map((r) => ({ ...r })));
    setMonth(normalized.month);
    setYear(normalized.year);
    setExpectedTotalText(
      normalized.expected_total_rows !== null && normalized.expected_total_rows !== undefined
        ? String(normalized.expected_total_rows)
        : ''
    );
    setRawCellDrafts({});
    setFilterMode('ALL');
    setSearchQuery('');
    setAdminConfirmedWarnings(true);
    setRecheckBanner(null);
    setDraftStatus('saved');
    setDraftSavedAt(new Date().toLocaleTimeString('vi-VN'));
  }, [isOpen, initialReport]);

  const currentReport: ThiDuaAiReportResult = useMemo(() => {
    const expNum = expectedTotalText.trim() ? Number(expectedTotalText.trim()) : null;
    const expected_total_rows =
      expNum !== null && Number.isInteger(expNum) && expNum > 0 ? expNum : null;

    return {
      report_type: 'THI_DUA_LUY_KE',
      month,
      year,
      store_name: initialReport?.store_name ?? storeLabel,
      expected_total_rows,
      image_quality: initialReport?.image_quality ?? 'GOOD',
      quality_warnings: initialReport?.quality_warnings ?? [],
      rows,
    };
  }, [rows, month, year, expectedTotalText, initialReport, storeLabel]);

  const summary = useMemo(
    () => buildValidationSummary(currentReport, duplicateProgramsOnMerge, adminConfirmedWarnings),
    [currentReport, duplicateProgramsOnMerge, adminConfirmedWarnings]
  );

  const isDuplicateOfLastSaved = useMemo(() => {
    if (!existingMeta?.reportHash || rows.length === 0) return false;
    const currentHash = computeThiDuaReportHash({ month, year, rows });
    return currentHash === existingMeta.reportHash;
  }, [existingMeta, month, year, rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.ten_chuong_trinh.toLowerCase().includes(q)) return false;
      if (filterMode === 'ISSUES') return r.errors.length > 0 || r.warnings.length > 0;
      if (filterMode === 'UNCERTAIN') return r.uncertain_fields.length > 0;
      if (filterMode === 'MISSING') return r.missing_fields.length > 0;
      if (filterMode === 'UNDER_100') {
        const pct = r.ty_le_du_kien ?? r.ty_le_thuc_hien;
        return pct !== null && pct < 100;
      }
      if (filterMode === 'OVER_100') {
        const pct = r.ty_le_du_kien ?? r.ty_le_thuc_hien;
        return pct !== null && pct >= 100;
      }
      return true;
    });
  }, [rows, searchQuery, filterMode]);

  // Debounced auto-save on any change to rows or report metadata
  useEffect(() => {
    if (!isOpen || rows.length === 0) return;

    setDraftStatus('saving');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await saveThiDuaDraft({
          storeId,
          storeLabel: currentReport.store_name || storeLabel,
          month: currentReport.month,
          year: currentReport.year,
          expected_total_rows: currentReport.expected_total_rows,
          rows: currentReport.rows,
          modelUsed,
          pageCount,
          duplicatesMerged,
          duplicatePrograms: duplicateProgramsOnMerge,
          adminConfirmedWarnings,
          isCommitted: false,
        });
        setDraftStatus('saved');
        setDraftSavedAt(new Date().toLocaleTimeString('vi-VN'));
        if (onSaveDraft) {
          onSaveDraft(currentReport, false);
        }
      } catch (e) {
        console.warn('[ThiDuaModal] Draft auto-save error:', e);
        setDraftStatus('error');
      }
    }, 750);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    isOpen,
    rows,
    month,
    year,
    expectedTotalText,
    adminConfirmedWarnings,
    storeId,
    storeLabel,
    modelUsed,
    pageCount,
    duplicatesMerged,
    duplicateProgramsOnMerge,
  ]);

  const handleManualSaveDraft = async () => {
    try {
      setDraftStatus('saving');
      await saveThiDuaDraft({
        storeId,
        storeLabel: currentReport.store_name || storeLabel,
        month: currentReport.month,
        year: currentReport.year,
        expected_total_rows: currentReport.expected_total_rows,
        rows: currentReport.rows,
        modelUsed,
        pageCount,
        duplicatesMerged,
        duplicatePrograms: duplicateProgramsOnMerge,
        adminConfirmedWarnings,
        isCommitted: false,
      });
      const timeStr = new Date().toLocaleTimeString('vi-VN');
      setDraftStatus('saved');
      setDraftSavedAt(timeStr);
      if (onSaveDraft) {
        await onSaveDraft(currentReport, true);
      }
    } catch (err: any) {
      setDraftStatus('error');
    }
  };

  const setDraftValue = (rowId: string, field: string, text: string) => {
    setRawCellDrafts((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), [field]: text },
    }));
  };

  const clearDraftValue = (rowId: string, field: string) => {
    setRawCellDrafts((prev) => {
      if (!prev[rowId] || !(field in prev[rowId])) return prev;
      const copy = { ...prev, [rowId]: { ...prev[rowId] } };
      delete copy[rowId][field];
      return copy;
    });
  };

  const updateRowField = (
    rowId: string,
    field:
      | 'ten_chuong_trinh'
      | 'kenh'
      | 'thuc_hien'
      | 'target'
      | 'ty_le_thuc_hien'
      | 'ty_le_du_kien'
      | 'hang_cty',
    rawVal: string
  ) => {
    if (
      field === 'thuc_hien' ||
      field === 'target' ||
      field === 'ty_le_thuc_hien' ||
      field === 'ty_le_du_kien' ||
      field === 'hang_cty'
    ) {
      setDraftValue(rowId, field, rawVal);
    }

    setRows((prev) =>
      prev.map((row, idx) => {
        if (row.id !== rowId) return row;

        // Admin manually touching a cell resolves its AI uncertainty flag
        const remainingUncertain = row.uncertain_fields.filter((f) => f !== field);
        let nextInput: Partial<ThiDuaAiRow> = {
          ...row,
          uncertain_fields: remainingUncertain,
        };
        const invalidFlags: Record<string, boolean> = {};

        if (field === 'ten_chuong_trinh') {
          nextInput.ten_chuong_trinh = rawVal;
        } else if (field === 'kenh') {
          nextInput.kenh = normalizeKenh(rawVal);
        } else if (field === 'thuc_hien') {
          const parsed = parseStrictBiNumber(rawVal);
          nextInput.thuc_hien = parsed.value;
          invalidFlags.invalidThucHien = parsed.invalidToken;
        } else if (field === 'target') {
          const parsed = parseStrictBiNumber(rawVal);
          nextInput.target = parsed.value;
          invalidFlags.invalidTarget = parsed.invalidToken;
        } else if (field === 'ty_le_thuc_hien') {
          const parsed = parseStrictBiNumber(rawVal, { isPercentage: true });
          nextInput.ty_le_thuc_hien = parsed.value;
          invalidFlags.invalidTyLeThucHien = parsed.invalidToken;
        } else if (field === 'ty_le_du_kien') {
          const parsed = parseStrictBiNumber(rawVal, { isPercentage: true });
          nextInput.ty_le_du_kien = parsed.value;
          invalidFlags.invalidTyLeDuKien = parsed.invalidToken;
        } else if (field === 'hang_cty') {
          const parsed = parseStrictBiNumber(rawVal, { isIntegerRank: true });
          nextInput.hang_cty = parsed.value;
          invalidFlags.invalidHangCty = parsed.invalidToken;
        }

        return validateThiDuaRow(nextInput, idx, row.sourcePageIndex || 1, invalidFlags);
      })
    );
    setRecheckBanner(null);
  };

  const handleToggleKenh = (rowId: string, nextKenh: ThiDuaKenh) => {
    updateRowField(rowId, 'kenh', nextKenh);
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setRecheckBanner(null);
  };

  const handleAddRow = () => {
    const newRow = validateThiDuaRow(
      {
        id: createRowId(rows.length, 99),
        ten_chuong_trinh: '',
        kenh: 'DT',
        thuc_hien: null,
        target: null,
        ty_le_thuc_hien: null,
        ty_le_du_kien: null,
        hang_cty: null,
        uncertain_fields: [],
      },
      rows.length,
      99
    );
    setRows((prev) => [...prev, newRow]);
    setFilterMode('ALL');
    setRecheckBanner(null);
  };

  const handleRecheck = () => {
    const revalidated = normalizeBIData(rows);
    setRows(revalidated);
    const nextSummary = buildValidationSummary(
      { ...currentReport, rows: revalidated },
      duplicateProgramsOnMerge,
      adminConfirmedWarnings
    );

    if (nextSummary.errorRows > 0 || nextSummary.warningRows > 0) {
      setFilterMode('ISSUES');
      setRecheckBanner({
        type: 'warn',
        text: `Phát hiện ${nextSummary.errorRows} dòng lỗi và ${nextSummary.warningRows} dòng có cảnh báo cần kiểm tra.`,
      });
    } else if (nextSummary.hasCountMismatch) {
      setRecheckBanner({
        type: 'warn',
        text: `Số lượng nhận diện (${nextSummary.totalRecognized}) chưa khớp tổng chương trình kỳ vọng (${nextSummary.expectedTotal}).`,
      });
    } else {
      setFilterMode('ALL');
      setRecheckBanner({
        type: 'ok',
        text: `Đã kiểm tra và chuẩn hóa ${nextSummary.totalRecognized} chương trình — tất cả đều hợp lệ và sẵn sàng lưu toàn bộ!`,
      });
    }
  };

  const getCellText = (row: ThiDuaAiRow, field: keyof ThiDuaAiRow, val: number | null): string => {
    const draft = rawCellDrafts[row.id]?.[field as string];
    if (draft !== undefined) return draft;
    if (field === 'hang_cty') {
      return val !== null && val !== undefined ? String(val) : '-';
    }
    if (val === null || val === undefined) return '0';
    return String(val);
  };

  const FIELD_LABELS: Record<string, string> = {
    ten_chuong_trinh: 'Chương trình',
    kenh: 'Kênh (DT/SL)',
    thuc_hien: 'Thực hiện',
    target: 'Target',
    ty_le_thuc_hien: '% TH hiện tại',
    ty_le_du_kien: '% Dự kiến HT',
    hang_cty: 'Hạng Vùng',
  };

  const activeInspectRow = useMemo(() => {
    if (!selectedInspectCell) return rows[0] || null;
    return rows.find((r) => r.id === selectedInspectCell.rowId) || rows[0] || null;
  }, [rows, selectedInspectCell]);

  const activeInspectField = selectedInspectCell?.field || 'thuc_hien';
  const activeCellMeta = activeInspectRow?.cell_metadata?.[activeInspectField];

  const activeCellBbox = activeCellMeta?.bbox;
  const activeRowBbox =
    (hoveredRowId ? rows.find((r) => r.id === hoveredRowId)?.row_bbox : null) ||
    activeInspectRow?.row_bbox;

  const isCellUncertain = (row: ThiDuaAiRow, field: string) => row.uncertain_fields.includes(field);
  const isCellMissing = (row: ThiDuaAiRow, field: string) => row.missing_fields.includes(field);

  const cellClassName = (row: ThiDuaAiRow, field: string, alignRight = true) => {
    const isUncertain = isCellUncertain(row, field);
    const isMissing = isCellMissing(row, field);
    const isSelected =
      selectedInspectCell?.rowId === row.id && selectedInspectCell?.field === field;
    const base = `w-full px-1.5 py-1 text-[11px] sm:text-xs rounded border focus:outline-none transition-all tabular-nums ${
      alignRight ? 'text-right' : 'text-left'
    } ${isSelected ? 'ring-2 ring-purple-500 font-extrabold shadow-xs ' : 'focus:ring-2 '}`;
    if (isMissing && (field === 'ten_chuong_trinh' || field === 'thuc_hien' || field === 'target' || field === 'kenh')) {
      return `${base} bg-rose-50/80 border-rose-400 text-rose-900 focus:ring-rose-200`;
    }
    if (isUncertain || isMissing) {
      return `${base} bg-amber-50/90 border-amber-400 text-amber-900 focus:ring-amber-200`;
    }
    return `${base} bg-white border-slate-200 text-slate-800 focus:border-orange-400 focus:ring-orange-100`;
  };

  if (!isOpen || !initialReport) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-1.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận dữ liệu AI Lũy kế thi đua"
    >
      <div
        className={`bg-white rounded-2xl border border-slate-200 shadow-2xl w-[98vw] ${
          isAdminDebugMode ? 'max-w-[98vw] h-[96vh]' : 'max-w-7xl max-h-[94vh]'
        } flex flex-col overflow-hidden transition-all`}
      >
        {/* Header */}
        <div className="px-3 py-2.5 sm:px-5 sm:py-3.5 bg-gradient-to-r from-orange-50 via-amber-50/80 to-white border-b border-orange-200/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0">
              <Sparkles size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight truncate">
                  KIỂM TRA & XÁC NHẬN DỮ LIỆU BI — LUỸ KẾ THI ĐUA
                </h3>
                <span className="px-1.5 py-0.5 text-[9.5px] sm:text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
                  CHƯA LƯU DATABASE
                </span>
              </div>
              <p className="text-[10.5px] sm:text-xs text-slate-500 truncate mt-0.5">
                Cơ sở: <strong className="text-slate-700">{storeLabel}</strong> • {pageCount} ảnh đã đọc
                {duplicatesMerged > 0 ? ` • Đã gộp ${duplicatesMerged} dòng trùng trang` : ''}
                {modelUsed ? ` • ${modelUsed}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAdminDebugMode((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isAdminDebugMode
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-purple-200'
                  : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-300'
              }`}
              title="Bật/tắt chế độ đối chiếu hình ảnh gốc và thông tin tọa độ OCR"
            >
              <Crosshair
                size={14}
                className={isAdminDebugMode ? 'text-purple-200 animate-pulse' : 'text-purple-600'}
              />
              <span className="hidden sm:inline">Chế độ Debug đối chiếu (Admin)</span>
              <span className="sm:hidden">Debug Admin</span>
              <span
                className={`ml-1 px-1.5 py-0.2 text-[9.5px] font-extrabold rounded-full ${
                  isAdminDebugMode ? 'bg-purple-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isAdminDebugMode ? 'BẬT' : 'TẮT'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              title="Đóng mà không lưu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-3 bg-slate-50/60">
          {/* Period & Expected Row Count Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 flex flex-wrap items-center gap-2.5 sm:gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-600">
                <span>Tháng:</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={month ?? ''}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setMonth(v && v >= 1 && v <= 12 ? v : null);
                  }}
                  placeholder="MM"
                  className="w-14 px-2 py-1 text-center text-xs font-bold rounded-lg border border-slate-200 focus:border-orange-400 focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-600">
                <span>Năm:</span>
                <input
                  type="number"
                  min={2020}
                  max={2100}
                  value={year ?? ''}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setYear(v && v >= 2020 && v <= 2100 ? v : null);
                  }}
                  placeholder="YYYY"
                  className="w-18 px-2 py-1 text-center text-xs font-bold rounded-lg border border-slate-200 focus:border-orange-400 focus:outline-none"
                />
              </label>

              <label
                className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-600"
                title="Nhập tổng số chương trình nhìn thấy trên báo cáo BI gốc để hệ thống đối chiếu đủ 100%"
              >
                <span>Tổng CT báo cáo gốc:</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={expectedTotalText}
                  onChange={(e) => setExpectedTotalText(e.target.value)}
                  placeholder="VD: 40"
                  className={`w-16 px-2 py-1 text-center text-xs font-bold rounded-lg border focus:outline-none ${
                    summary.hasCountMismatch
                      ? 'border-rose-400 bg-rose-50 text-rose-700'
                      : 'border-slate-200 focus:border-orange-400'
                  }`}
                />
              </label>
            </div>

            <div className="text-[10.5px] sm:text-xs text-slate-500 font-medium">
              Phân bổ %HT:{' '}
              <span className="font-bold text-amber-700">&lt; 100%: {summary.under100Count} CT</span>
              {' • '}
              <span className="font-bold text-emerald-700">&ge; 100%: {summary.overOrEqual100Count} CT</span>
            </div>
          </div>

          {/* Draft Auto-Save Status Bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              {draftStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200 animate-pulse">
                  <RefreshCw size={12} className="animate-spin text-blue-600" />
                  <span>Đang tự động lưu bản nháp...</span>
                </span>
              )}
              {draftStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Đã lưu bản nháp tự động {draftSavedAt ? `lúc ${draftSavedAt}` : ''} (An toàn khi F5 / đóng popup)</span>
                </span>
              )}
              {draftStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                  <AlertTriangle size={12} className="text-rose-600" />
                  <span>Lưu bản nháp thất bại</span>
                </span>
              )}
              {draftStatus === 'idle' && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Bản nháp được tự động lưu mỗi khi có thay đổi.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-600 hidden sm:inline">
                Đang có: <strong className="text-emerald-700">{summary.validRows} hợp lệ</strong> • <strong className="text-rose-600">{summary.errorRows} cần kiểm tra</strong>
              </span>
              <button
                type="button"
                disabled={isSaving || rows.length === 0}
                onClick={handleManualSaveDraft}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10.5px] font-bold transition-colors"
                title="Bấm để lưu bản nháp ngay lập tức"
              >
                <Bookmark size={11} className="text-slate-600" />
                <span>Lưu nháp ngay</span>
              </button>
            </div>
          </div>

          {/* Quality KPI Grid - 6 Comprehensive Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div
              className={`rounded-xl border p-2 sm:p-2.5 bg-white ${
                summary.hasCountMismatch ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-slate-400">Tổng CT dự kiến</div>
              <div className="text-base sm:text-lg font-extrabold text-slate-800 mt-0.5">
                {summary.expectedTotal ?? '—'}
                <span className="text-[10px] font-medium text-slate-400 ml-1">CT</span>
              </div>
            </div>

            <div
              className={`rounded-xl border p-2 sm:p-2.5 bg-white ${
                summary.hasCountMismatch ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-slate-400">Tổng nhận diện</div>
              <div className="text-base sm:text-lg font-extrabold text-slate-800 mt-0.5 flex items-baseline gap-1">
                <span>{summary.totalRecognized}</span>
                <span className="text-[10px] font-medium text-slate-500">
                  (STT {summary.minStt || 1} - {summary.maxStt || summary.totalRecognized})
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 sm:p-2.5">
              <div className="text-[10px] font-bold uppercase text-emerald-700">Dòng hợp lệ</div>
              <div className="text-base sm:text-lg font-extrabold text-emerald-700 mt-0.5">
                {summary.validRows}
              </div>
            </div>

            <div
              className={`rounded-xl border p-2 sm:p-2.5 ${
                summary.uncertainPrograms.length > 0
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <div className="text-[10px] font-bold uppercase opacity-75">Chưa chắc chắn</div>
              <div className="text-base sm:text-lg font-extrabold mt-0.5">
                {summary.uncertainPrograms.length} CT
              </div>
            </div>

            <div
              className={`rounded-xl border p-2 sm:p-2.5 ${
                summary.missingDataPrograms.length > 0
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <div className="text-[10px] font-bold uppercase opacity-75">Thiếu số liệu</div>
              <div className="text-base sm:text-lg font-extrabold mt-0.5">
                {summary.missingDataPrograms.length} CT
              </div>
            </div>

            <div
              className={`rounded-xl border p-2 sm:p-2.5 ${
                (summary.missingSttCount || 0) > 0 || (summary.duplicateSttCount || 0) > 0
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50/30 text-emerald-800'
              }`}
            >
              <div className="text-[10px] font-bold uppercase opacity-75">STT thiếu / trùng</div>
              <div className="text-xs sm:text-sm font-extrabold mt-1 truncate">
                {(summary.missingSttCount || 0) + (summary.duplicateSttCount || 0) === 0 ? (
                  <span className="text-emerald-700 font-bold">0 (Chuẩn 1..{summary.totalRecognized})</span>
                ) : (
                  <span className="text-rose-700 font-bold">
                    {summary.missingSttCount ? `Thiếu ${summary.missingSttCount} ` : ''}
                    {summary.duplicateSttCount ? `Trùng ${summary.duplicateSttCount}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CRITICAL WARNING: Incomplete OCR table */}
          {(summary.isIncomplete || summary.hasCountMismatch) && (
            <div className="rounded-xl border-2 border-rose-400 bg-rose-50/95 p-3 flex items-start gap-3 text-rose-950 shadow-sm animate-pulse">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <strong className="text-rose-800 font-black uppercase tracking-wide">
                  ẢNH CHƯA ĐƯỢC NHẬN DIỆN ĐẦY ĐỦ – VUI LÒNG KIỂM TRA CÁC DÒNG CÒN THIẾU.
                </strong>
                <p className="mt-1 text-slate-700 text-xs font-medium">
                  Báo cáo BI ghi nhận <strong>{summary.expectedTotal}</strong> chương trình, nhưng hệ thống mới nhận diện được <strong>{summary.totalRecognized}</strong> dòng (còn thiếu <strong>{Math.max(0, (summary.expectedTotal || 0) - summary.totalRecognized)}</strong> dòng).
                  Vui lòng kiểm tra kỹ các dòng cuối bảng (đặc biệt các dòng 34 đến 39) hoặc bấm <strong>"Thêm CT"</strong> để bổ sung trước khi xác nhận lưu!
                </p>
              </div>
            </div>
          )}

          {/* Alerts: Duplicate upload / image quality / missing / uncertain */}
          {isDuplicateOfLastSaved && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 flex items-start gap-2 text-xs text-amber-900">
              <FileWarning size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong>Cảnh báo tải trùng báo cáo:</strong> Dữ liệu ảnh này trùng khớp với lần lưu gần nhất lúc{' '}
                <strong>
                  {existingMeta?.lastUpdatedAt
                    ? new Date(existingMeta.lastUpdatedAt).toLocaleString('vi-VN')
                    : ''}
                </strong>
                . Hãy kiểm tra để tránh ghi đè trùng kỳ nếu không có thay đổi.
              </div>
            </div>
          )}

          {(currentReport.image_quality !== 'GOOD' || currentReport.quality_warnings.length > 0 || summary.hasCountMismatch) && (
            <div className="rounded-xl border border-orange-300 bg-orange-50/90 px-3 py-2 space-y-1 text-[11px] sm:text-xs text-orange-900">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-orange-600 shrink-0" />
                <span>Cảnh báo chất lượng & đối chiếu nguồn ảnh ({currentReport.image_quality}):</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {summary.hasCountMismatch && (
                  <li>
                    <strong>Lệch số dòng:</strong> Nhận diện được {summary.totalRecognized} chương trình nhưng tổng kỳ vọng là{' '}
                    {summary.expectedTotal}. Kiểm tra xem ảnh có bị cắt thiếu phần đầu/cuối hoặc có dòng trống cần thêm/xóa không.
                  </li>
                )}
                {currentReport.quality_warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
                {summary.missingDataPrograms.length > 0 && (
                  <li>
                    Chương trình còn ô trống dữ liệu:{' '}
                    <span className="font-semibold">
                      {summary.missingDataPrograms.slice(0, 8).join(', ')}
                      {summary.missingDataPrograms.length > 8
                        ? ` (+${summary.missingDataPrograms.length - 8} CT khác)`
                        : ''}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {recheckBanner && (
            <div
              className={`rounded-xl border px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                recheckBanner.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
            >
              {recheckBanner.type === 'ok' ? (
                <CheckCircle2 size={15} className="shrink-0" />
              ) : (
                <AlertTriangle size={15} className="shrink-0" />
              )}
              <span>{recheckBanner.text}</span>
            </div>
          )}

          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5">
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'ALL', label: `Tất cả (${rows.length})` },
                  {
                    id: 'ISSUES',
                    label: `Lỗi / Cảnh báo (${rows.filter((r) => r.errors.length > 0 || r.warnings.length > 0).length})`,
                  },
                  {
                    id: 'UNCERTAIN',
                    label: `Chưa chắc chắn (${rows.filter((r) => r.uncertain_fields.length > 0).length})`,
                  },
                  {
                    id: 'MISSING',
                    label: `Thiếu số liệu (${rows.filter((r) => r.missing_fields.length > 0).length})`,
                  },
                  { id: 'UNDER_100', label: `< 100% (${summary.under100Count})` },
                  { id: 'OVER_100', label: `>= 100% (${summary.overOrEqual100Count})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] sm:text-xs font-bold transition-colors ${
                    filterMode === tab.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên chương trình..."
                  className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:border-orange-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                disabled={!hasUpdatePermission}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 shrink-0"
              >
                <Plus size={13} />
                <span>Thêm dòng</span>
              </button>
            </div>
          </div>

          {/* Main Dual-Pane or Single-Pane Content */}
          <div className={isAdminDebugMode ? 'grid grid-cols-1 lg:grid-cols-12 gap-3 items-start' : 'space-y-3'}>
            <div className={isAdminDebugMode ? 'lg:col-span-7 xl:col-span-8' : 'w-full'}>
              {/* Editable Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className={`overflow-x-auto ${isAdminDebugMode ? 'max-h-[58vh]' : 'max-h-[44vh]'}`}>
                  <table className="w-full min-w-[920px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-600">
                      <tr>
                        <th className="px-2 py-2 w-12 text-center font-black">STT</th>
                        <th className="px-2 py-2 min-w-[230px]">Chương trình</th>
                        <th className="px-2 py-2 w-20 text-center">Kênh</th>
                        <th className="px-2 py-2 w-28 text-right">Thực hiện</th>
                        <th className="px-2 py-2 w-28 text-right">Target</th>
                        <th className="px-2 py-2 w-24 text-right">% TH hiện tại</th>
                        <th className="px-2 py-2 w-28 text-right">% Dự kiến HT</th>
                        <th className="px-2 py-2 w-20 text-right">Hạng Vùng</th>
                        <th className="px-2 py-2 min-w-[165px]">Kiểm tra</th>
                        <th className="px-2 py-2 w-12 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-xs text-slate-400">
                            Không có dòng nào phù hợp bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, visibleIdx) => {
                          const rowIdx = rows.findIndex((x) => x.id === row.id) + 1;
                          const hasError = row.errors.length > 0;
                          const hasWarn = row.warnings.length > 0 || row.uncertain_fields.length > 0;
                          return (
                            <tr
                              key={row.id}
                              onMouseEnter={() => setHoveredRowId(row.id)}
                              onMouseLeave={() => setHoveredRowId(null)}
                              className={
                                hasError
                                  ? 'bg-rose-50/40'
                                  : hasWarn
                                    ? 'bg-amber-50/30'
                                    : visibleIdx % 2 === 0
                                      ? 'bg-white'
                                      : 'bg-slate-50/40'
                              }
                            >
                              <td
                                className="px-2 py-1.5 text-center text-[11px] font-black text-slate-500 cursor-pointer hover:text-purple-600"
                                onClick={() =>
                                  setSelectedInspectCell({ rowId: row.id, field: 'ten_chuong_trinh', rowIdx })
                                }
                                title="Bấm để xem đối chiếu dòng này trên ảnh gốc"
                              >
                                {row.stt ?? rowIdx}
                              </td>

                              <td className="px-1.5 py-1.5">
                                <input
                                  type="text"
                                  disabled={!hasUpdatePermission}
                                  value={row.ten_chuong_trinh}
                                  onFocus={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'ten_chuong_trinh', rowIdx })
                                  }
                                  onClick={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'ten_chuong_trinh', rowIdx })
                                  }
                                  onChange={(e) =>
                                    updateRowField(row.id, 'ten_chuong_trinh', e.target.value)
                                  }
                                  placeholder="Tên chương trình..."
                                  className={cellClassName(row, 'ten_chuong_trinh', false)}
                                />
                              </td>

                              <td className="px-1.5 py-1.5 text-center">
                                <button
                                  type="button"
                                  disabled={!hasUpdatePermission}
                                  onClick={() => {
                                    setSelectedInspectCell({ rowId: row.id, field: 'kenh', rowIdx });
                                    handleToggleKenh(row.id, row.kenh === 'DT' ? 'SL' : 'DT');
                                  }}
                                  onFocus={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'kenh', rowIdx })
                                  }
                                  title="Nhấn để đổi kênh giữa DT và SL"
                                  className={`inline-flex items-center justify-center min-w-[42px] px-2 py-1 text-[10.5px] font-extrabold rounded-md border transition-all ${
                                    selectedInspectCell?.rowId === row.id && selectedInspectCell?.field === 'kenh'
                                      ? 'ring-2 ring-purple-500 '
                                      : ''
                                  }${
                                    row.kenh === 'DT'
                                      ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                      : row.kenh === 'SL'
                                      ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                      : 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200'
                                  }`}
                                >
                                  {row.kenh || 'Chưa rõ'}
                                </button>
                              </td>

                              <td className="px-1.5 py-1.5">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  disabled={!hasUpdatePermission}
                                  value={getCellText(row, 'thuc_hien', row.thuc_hien)}
                                  onFocus={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'thuc_hien', rowIdx })
                                  }
                                  onClick={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'thuc_hien', rowIdx })
                                  }
                                  onChange={(e) => updateRowField(row.id, 'thuc_hien', e.target.value)}
                                  onBlur={() => clearDraftValue(row.id, 'thuc_hien')}
                                  placeholder="—"
                                  className={cellClassName(row, 'thuc_hien')}
                                />
                              </td>

                              <td className="px-1.5 py-1.5">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  disabled={!hasUpdatePermission}
                                  value={getCellText(row, 'target', row.target)}
                                  onFocus={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'target', rowIdx })
                                  }
                                  onClick={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'target', rowIdx })
                                  }
                                  onChange={(e) => updateRowField(row.id, 'target', e.target.value)}
                                  onBlur={() => clearDraftValue(row.id, 'target')}
                                  placeholder="—"
                                  className={cellClassName(row, 'target')}
                                />
                              </td>

                              <td className="px-1.5 py-1.5">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  disabled={!hasUpdatePermission}
                                  value={getCellText(row, 'ty_le_thuc_hien', row.ty_le_thuc_hien)}
                                  onFocus={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'ty_le_thuc_hien', rowIdx })
                                  }
                                  onClick={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'ty_le_thuc_hien', rowIdx })
                                  }
                                  onChange={(e) =>
                                    updateRowField(row.id, 'ty_le_thuc_hien', e.target.value)
                                  }
                                  onBlur={() => clearDraftValue(row.id, 'ty_le_thuc_hien')}
                                  placeholder="—"
                                  className={cellClassName(row, 'ty_le_thuc_hien')}
                                />
                              </td>

                              <td className="px-1.5 py-1.5">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  disabled={!hasUpdatePermission}
                                  value={getCellText(row, 'ty_le_du_kien', row.ty_le_du_kien)}
                                  onFocus={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'ty_le_du_kien', rowIdx })
                                  }
                                  onClick={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'ty_le_du_kien', rowIdx })
                                  }
                                  onChange={(e) =>
                                    updateRowField(row.id, 'ty_le_du_kien', e.target.value)
                                  }
                                  onBlur={() => clearDraftValue(row.id, 'ty_le_du_kien')}
                                  placeholder="—"
                                  className={cellClassName(row, 'ty_le_du_kien')}
                                />
                              </td>

                              <td className="px-1.5 py-1.5">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={!hasUpdatePermission}
                                  value={getCellText(row, 'hang_cty', row.hang_cty)}
                                  onFocus={(e) => {
                                    setSelectedInspectCell({ rowId: row.id, field: 'hang_cty', rowIdx });
                                    if (e.target.value === '-' || e.target.value === '—') {
                                      e.target.select();
                                    }
                                  }}
                                  onClick={() =>
                                    setSelectedInspectCell({ rowId: row.id, field: 'hang_cty', rowIdx })
                                  }
                                  onChange={(e) => updateRowField(row.id, 'hang_cty', e.target.value)}
                                  onBlur={() => clearDraftValue(row.id, 'hang_cty')}
                                  placeholder="-"
                                  className={cellClassName(row, 'hang_cty')}
                                />
                              </td>

                              <td className="px-2 py-1.5 text-[10.5px] leading-snug">
                                {row.errors.length > 0 ? (
                                  <div className="text-rose-700 font-semibold space-y-0.5">
                                    {row.errors.map((err, i) => (
                                      <div key={i}>• {err}</div>
                                    ))}
                                  </div>
                                ) : row.warnings.length > 0 ? (
                                  <div className="text-amber-700 font-medium space-y-0.5">
                                    {row.warnings.map((w, i) => (
                                      <div key={i}>• {w}</div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                    <CheckCircle2 size={12} /> Hợp lệ
                                  </span>
                                )}
                              </td>

                              <td className="px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  disabled={!hasUpdatePermission || isSaving}
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Xóa dòng này"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Admin Debug Inspector Panel */}
            {isAdminDebugMode && (
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-2.5">
                {/* Panel Header & Inspector Card */}
                <div className="bg-slate-900 text-white rounded-xl p-3 border border-slate-700 shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-purple-300">
                      <Crosshair size={14} className="text-purple-400" />
                      <span>Debug Inspector — Đối Chiếu Tọa Độ</span>
                    </div>
                    {imagePreviews && imagePreviews.length > 1 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-300">
                        <button
                          type="button"
                          onClick={() => setActivePreviewIndex((prev) => Math.max(0, prev - 1))}
                          disabled={activePreviewIndex === 0}
                          className="p-0.5 rounded hover:bg-slate-800 disabled:opacity-30"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span>
                          Trang {activePreviewIndex + 1}/{imagePreviews.length}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePreviewIndex((prev) =>
                              Math.min(imagePreviews.length - 1, prev + 1)
                            )
                          }
                          disabled={activePreviewIndex === imagePreviews.length - 1}
                          className="p-0.5 rounded hover:bg-slate-800 disabled:opacity-30"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Selected Cell Inspector Details */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Chương trình:</span>
                      <span
                        className="font-bold text-white truncate max-w-[210px]"
                        title={activeInspectRow?.ten_chuong_trinh}
                      >
                        {activeInspectRow ? activeInspectRow.ten_chuong_trinh : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Ô đang chọn:</span>
                      <span className="font-extrabold text-orange-400">
                        {FIELD_LABELS[activeInspectField] || activeInspectField}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trạng thái ô:</span>
                      <span>
                        {activeCellMeta?.status === 'VERIFIED' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            VERIFIED (Khớp ảnh)
                          </span>
                        )}
                        {activeCellMeta?.status === 'DEFAULT_ZERO' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700">
                            DEFAULT_ZERO (Gạch/0)
                          </span>
                        )}
                        {activeCellMeta?.status === 'UNCERTAIN' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                            UNCERTAIN (Chưa chắc chắn)
                          </span>
                        )}
                        {activeCellMeta?.status === 'MISSING' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                            MISSING (Chưa đọc được)
                          </span>
                        )}
                        {!activeCellMeta?.status && (
                          <span className="text-slate-400 text-[10px]">VERIFIED</span>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10.5px]">
                      <div className="bg-slate-800/80 rounded-lg p-1.5 border border-slate-700">
                        <div className="text-slate-400 text-[9.5px]">Raw OCR Text</div>
                        <div className="font-mono font-bold text-amber-300 truncate mt-0.5">
                          {activeCellMeta?.rawValue ? `"${activeCellMeta.rawValue}"` : '—'}
                        </div>
                      </div>
                      <div className="bg-slate-800/80 rounded-lg p-1.5 border border-slate-700">
                        <div className="text-slate-400 text-[9.5px]">Parsed Value</div>
                        <div className="font-mono font-bold text-emerald-300 truncate mt-0.5">
                          {activeCellMeta?.parsedValue !== undefined && activeCellMeta?.parsedValue !== null
                            ? String(activeCellMeta.parsedValue)
                            : 'null'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>Độ tin cậy OCR:</span>
                      <span className="font-bold text-slate-200">
                        {activeCellMeta?.confidence ? `${activeCellMeta.confidence}%` : 'N/A'}
                      </span>
                    </div>

                    {activeCellBbox && (
                      <div className="text-[9.5px] font-mono text-slate-400 truncate">
                        Tọa độ BBox: [x:{activeCellBbox.x}, y:{activeCellBbox.y}, w:{activeCellBbox.w}, h:{activeCellBbox.h}]
                      </div>
                    )}
                  </div>
                </div>

                {/* Image with SVG Bounding Box Overlay */}
                <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden relative shadow-lg">
                  <div className="bg-slate-800 px-2.5 py-1.5 text-[10.5px] font-semibold text-slate-300 flex items-center justify-between border-b border-slate-700">
                    <span>Vị trí trên ảnh báo cáo BI:</span>
                    <span className="text-[9.5px] text-orange-300 font-bold">Khung cam = Ô đang chọn</span>
                  </div>
                  <div className="overflow-auto max-h-[380px] sm:max-h-[460px] relative bg-slate-950 p-1 flex justify-center">
                    {imagePreviews && imagePreviews[activePreviewIndex] ? (
                      <div className="relative inline-block max-w-full">
                        <img
                          src={imagePreviews[activePreviewIndex]}
                          alt="Ảnh báo cáo BI"
                          className="w-full h-auto block select-none"
                          onLoad={(e) => {
                            setImgNaturalDims({
                              width: e.currentTarget.naturalWidth,
                              height: e.currentTarget.naturalHeight,
                            });
                          }}
                        />
                        {imgNaturalDims.width > 0 && imgNaturalDims.height > 0 && (
                          <svg
                            viewBox={`0 0 ${imgNaturalDims.width} ${imgNaturalDims.height}`}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                          >
                            {/* Row bounding box */}
                            {activeRowBbox && (
                              <rect
                                x={activeRowBbox.x}
                                y={activeRowBbox.y}
                                width={activeRowBbox.w}
                                height={activeRowBbox.h}
                                fill="rgba(59, 130, 246, 0.08)"
                                stroke="#3b82f6"
                                strokeWidth={imgNaturalDims.width > 1500 ? 3 : 2}
                                strokeDasharray="8 4"
                              />
                            )}
                            {/* Cell bounding box */}
                            {activeCellBbox && (
                              <g>
                                <rect
                                  x={activeCellBbox.x}
                                  y={activeCellBbox.y}
                                  width={activeCellBbox.w}
                                  height={activeCellBbox.h}
                                  fill="rgba(249, 115, 22, 0.35)"
                                  stroke="#f97316"
                                  strokeWidth={imgNaturalDims.width > 1500 ? 4 : 2.5}
                                  rx={imgNaturalDims.width > 1500 ? 4 : 2}
                                />
                              </g>
                            )}
                          </svg>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500">
                        Chưa có ảnh xem trước để đối chiếu.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Admin Confirmation Checkbox when warnings/uncertainties exist */}
          {summary.requiresAdminConfirmation && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={adminConfirmedWarnings}
                onChange={(e) => setAdminConfirmedWarnings(e.target.checked)}
                disabled={!hasUpdatePermission}
                className="mt-0.5 w-4 h-4 accent-orange-600 shrink-0"
              />
              <span className="text-xs font-semibold text-amber-900 leading-relaxed">
                Tôi đã đối chiếu bảng trên với hình ảnh báo cáo gốc (bao gồm các ô đánh dấu vàng / thiếu cột / số lượng dòng) và xác nhận cho phép cập nhật dữ liệu Lũy kế thi đua.
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 sm:px-5 sm:py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            {!hasUpdatePermission ? (
              <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                <Lock size={13} /> Tài khoản hiện tại không có quyền ghi dữ liệu.
              </span>
            ) : summary.blockingReasons.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                <ShieldAlert size={14} className="shrink-0" />
                {summary.blockingReasons[0]}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 size={14} className="shrink-0" />
                Đã chuẩn hóa {summary.validRows} chương trình. Sẵn sàng lưu toàn bộ dữ liệu.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              title="Đóng cửa sổ (Bản nháp vẫn được tự động lưu an toàn)"
            >
              Đóng / Thoát
            </button>

            <button
              type="button"
              onClick={handleRecheck}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              title="Kiểm tra lại toàn bộ quy tắc dữ liệu"
            >
              <RefreshCw size={13} />
              <span>Kiểm tra lại</span>
            </button>

            {/* ACTION A: LƯU BẢN NHÁP (LUÔN BẤM ĐƯỢC KHI CÓ DỮ LIỆU) */}
            <button
              type="button"
              disabled={!hasUpdatePermission || isSaving || rows.length === 0}
              onClick={handleManualSaveDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold shadow-xs hover:border-slate-400 disabled:opacity-45 disabled:cursor-not-allowed transition-all"
              title="Lưu toàn bộ các dòng hiện tại (kể cả có lỗi) vào bản nháp để không bị mất khi thoát hoặc chỉnh sửa sau"
            >
              <Bookmark size={13} className="text-slate-500" />
              <span>LƯU BẢN NHÁP ({rows.length})</span>
            </button>

            {/* ACTION B: LƯU CÁC DÒNG HỢP LỆ (LƯU DÒNG CHUẨN VÀO DB, GIỮ DÒNG LỖI Ở NHÁP) */}
            <button
              type="button"
              disabled={
                !hasUpdatePermission ||
                isSaving ||
                summary.validRows === 0 ||
                (summary.requiresAdminConfirmation && !adminConfirmedWarnings)
              }
              onClick={() => {
                if (onSaveValidOnly) {
                  const normalizedValid = normalizeBIData(currentReport);
                  onSaveValidOnly(normalizedValid, {
                    adminConfirmedWarnings: true,
                    duplicatesMerged,
                    pageCount,
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title={
                summary.requiresAdminConfirmation && !adminConfirmedWarnings
                  ? 'Vui lòng tích vào ô xác nhận đã đối chiếu ở trên để lưu các dòng hợp lệ'
                  : `Lưu ngay ${summary.validRows} dòng hợp lệ vào Database; giữ ${summary.errorRows} dòng lỗi lại trong bản nháp`
              }
            >
              <CheckCircle2 size={13} />
              <span>LƯU DÒNG HỢP LỆ ({summary.validRows})</span>
            </button>

            {/* ACTION C: XÁC NHẬN LƯU TOÀN BỘ (CHỈ KHI TOÀN BỘ ĐÃ HỢP LỆ) */}
            <button
              type="button"
              disabled={!hasUpdatePermission || !summary.canConfirmSave || isSaving}
              onClick={() => {
                const normalizedToSave = normalizeBIData(currentReport);
                onConfirmSave(normalizedToSave, {
                  adminConfirmedWarnings: true,
                  duplicatesMerged,
                  pageCount,
                });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs font-extrabold shadow-sm hover:from-emerald-700 hover:to-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title={
                !summary.canConfirmSave
                  ? summary.blockingReasons[0] || 'Cần xử lý hết các dòng lỗi trước khi lưu toàn bộ'
                  : 'Xác nhận lưu toàn bộ chương trình vào LUỸ KẾ THI ĐUA'
              }
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>XÁC NHẬN LƯU TOÀN BỘ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

