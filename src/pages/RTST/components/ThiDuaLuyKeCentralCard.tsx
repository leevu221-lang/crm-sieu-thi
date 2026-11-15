/**
 * THẺ LUỸ KẾ THI ĐUA TRUNG TÂM (CENTRAL COMPETITION CARD)
 * Quản lý trực tiếp nguồn dữ liệu trung tâm của toàn bộ CRM.
 * Hiển thị chính xác 39 dòng sau khi lưu, trạng thái đồng bộ, nhãn phân loại KPI,
 * cùng đầy đủ các công cụ hành động: Xem chi tiết, Chỉnh sửa, Mở đợt mới, Lịch sử, Xóa đợt.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  ExternalLink,
  Clock,
  Lock,
  Eye,
  Edit3,
  PlusCircle,
  History,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  Loader2,
  UploadCloud,
  ChevronRight,
  Database,
  Calendar,
  Store,
} from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../../../contexts/AuthContext';
import { isGuestShareLink } from '../../../constants/routes';
import { isSuperAdmin43751 } from '../../../firebaseAdapter';
import {
  thiDuaCentralService,
  type ThiDuaBatchRecord,
  type ThiDuaProgramRecord,
} from '../../../services/thiDuaCentralService';
import { ThiDuaDetailModal } from './ThiDuaDetailModal';
import { ThiDuaEditModal } from './ThiDuaEditModal';
import { ThiDuaHistoryModal } from './ThiDuaHistoryModal';
import { ThiDuaLuyKeAiUploader } from './ThiDuaLuyKeAiUploader';

interface ThiDuaLuyKeCentralCardProps {
  id?: string;
  label?: string;
  value: string; // raw tab text for backward compatibility with RTST pipeline
  onChange: (val: string) => void;
  onBlur?: () => void;
  onClear?: () => void;
  activeStore: string;
  availableMarkets?: string[];
  selectedMonth?: string | number | null;
  selectedYear?: number | null;
  allStoresCache?: any;
  hasUpdatePermission?: boolean;
  onTriggerSavePipeline?: () => Promise<void>;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  externalLink?: string;
}

export const ThiDuaLuyKeCentralCard: React.FC<ThiDuaLuyKeCentralCardProps> = ({
  id = 'rt_catlk',
  label = 'LUỸ KẾ THI ĐUA',
  value,
  onChange,
  onBlur,
  onClear,
  activeStore,
  availableMarkets = [],
  selectedMonth,
  selectedYear,
  allStoresCache,
  hasUpdatePermission: propHasUpdatePermission,
  onTriggerSavePipeline,
  showNotification,
  externalLink = 'https://bi.thegioididong.com',
}) => {
  const { userProfile } = useAuth();
  const isGuest = isGuestShareLink();
  const hasUpdatePermission =
    propHasUpdatePermission !== undefined
      ? propHasUpdatePermission
      : !isGuest && (isSuperAdmin43751(userProfile?.username) || userProfile?.role === 'admin' || userProfile?.role === 'asm' || userProfile?.role === 'sm' || userProfile?.role === 'user' || !userProfile);

  const [batch, setBatch] = useState<ThiDuaBatchRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Manual paste / text editor state
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [manualText, setManualText] = useState('');
  const manualBoxRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const parsedMonth = typeof selectedMonth === 'string'
    ? (selectedMonth.includes('-') ? Number(selectedMonth.split('-')[1]) : Number(selectedMonth))
    : selectedMonth;
  const parsedYear = typeof selectedMonth === 'string' && selectedMonth.includes('-')
    ? Number(selectedMonth.split('-')[0])
    : selectedYear;

  const effectiveMonth = parsedMonth && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : now.getMonth() + 1;
  const effectiveYear = parsedYear && parsedYear >= 2020 && parsedYear <= 2100 ? parsedYear : now.getFullYear();

  // 1. Fetch competition batch on mount and when store/month/year changes
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      if (!activeStore || activeStore === 'ALL') {
        setBatch(null);
        return;
      }

      setIsLoading(true);
      try {
        const found = await thiDuaCentralService.getCompetitionByStore(
          activeStore,
          effectiveMonth,
          effectiveYear
        );
        if (!isCancelled) {
          setBatch(found);
          // Sync raw_bi_text if parent value is empty but DB has data
          if (found && found.raw_bi_text && (!value || !value.trim())) {
            onChange(found.raw_bi_text);
          }
        }
      } catch (err) {
        console.error('[ThiDuaCentralCard] Error fetching batch:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Subscribe to realtime database updates and local window broadcasts
    const unsubscribe = thiDuaCentralService.subscribeCompetitionChanges(
      activeStore,
      (updatedBatch) => {
        if (!isCancelled) {
          setBatch(updatedBatch);
          if (updatedBatch?.raw_bi_text) {
            onChange(updatedBatch.raw_bi_text);
          }
        }
      }
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [activeStore, effectiveMonth, effectiveYear]);

  // Click outside listener for manual edit box
  useEffect(() => {
    if (!isManualEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (manualBoxRef.current && !manualBoxRef.current.contains(e.target as Node)) {
        setIsManualEditing(false);
        setManualText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isManualEditing]);

  // Handle manual paste save
  const handleSaveManualText = (text: string) => {
    if (!text || !text.trim()) {
      setIsManualEditing(false);
      setManualText('');
      return;
    }

    onChange(text);
    setIsManualEditing(false);
    setManualText('');

    setTimeout(() => {
      if (onBlur) onBlur();
      if (onTriggerSavePipeline) onTriggerSavePipeline();
      try {
        confetti({
          particleCount: 65,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    }, 50);
  };

  // Handle batch deletion with confirmation check
  const handleDeleteBatch = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!hasUpdatePermission) {
      showNotification('Tài khoản không có quyền xóa đợt thi đua.', 'error');
      return;
    }

    if (!batch) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn XÓA TOÀN BỘ đợt thi đua ${batch.total_programs} dòng của siêu thị ${batch.ten_sieu_thi} (Tháng T${String(batch.month).padStart(2, '0')}/${batch.year})?\n\nHành động này sẽ xóa dữ liệu trên Database trung tâm.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await thiDuaCentralService.deleteCompetitionBatch(
        activeStore,
        batch.batch_id,
        batch.month,
        batch.year
      );

      setBatch(null);
      onChange('');
      if (onClear) onClear();

      showNotification('Đã xóa thành công đợt thi đua khỏi Database trung tâm.', 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi xóa đợt thi đua.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit modal save batch
  const handleSaveEditedBatch = async (updatedPrograms: ThiDuaProgramRecord[]) => {
    if (!batch) return;
    setIsSavingEdit(true);
    try {
      const aiRows = updatedPrograms.map((p) => ({
        id: p.id,
        ten_chuong_trinh: p.ten_chuong_trinh,
        kenh: p.kenh,
        thuc_hien: p.thuc_hien,
        target: p.target,
        ty_le_thuc_hien: p.percent_actual,
        ty_le_du_kien: p.percent_forecast,
        hang_cty: p.company_rank,
        uncertain_fields: [],
        missing_fields: [],
        errors: [],
        warnings: [],
      }));

      const res = await thiDuaCentralService.saveCompetitionBatch({
        storeId: batch.store_id,
        storeName: batch.ten_sieu_thi,
        warehouseCode: batch.warehouse_code,
        month: batch.month,
        year: batch.year,
        programs: aiRows,
        existingBiText: batch.raw_bi_text || value || '',
        batchId: batch.batch_id,
        sourceType: 'MANUAL',
      });

      setBatch(res.batch);
      onChange(res.mergeResult.text);

      if (onTriggerSavePipeline) {
        await onTriggerSavePipeline();
      }

      setIsEditOpen(false);
      showNotification(`Đã lưu thành công ${updatedPrograms.length} chương trình vào Database!`, 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Lỗi khi lưu dữ liệu chỉnh sửa.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Compute display variables
  const totalPrograms = batch ? batch.total_programs : 0;
  const hasData = totalPrograms > 0;

  const formattedTime = useMemo(() => {
    if (batch?.updated_at) {
      const d = new Date(batch.updated_at);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    // Fallback: match "Cập nhật lúc: ..." in raw value
    if (value) {
      const match = value.match(/Cập nhật lúc:\s*([^\n\r]+)/i);
      if (match) {
        const raw = match[1].trim();
        const tMatch = raw.match(/(\d{1,2}:\d{2}:\d{2})/);
        return tMatch ? tMatch[1] : raw.substring(0, 15);
      }
    }
    return '';
  }, [batch?.updated_at, value]);

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-[16px] sm:rounded-[18px] border p-[14px] sm:p-[16px] shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all h-full flex flex-col justify-between gap-[12px] w-full",
          "bg-gradient-to-b from-[#FFFDF7] via-[#FFF8E7] to-[#FFF0D1] border-[#FDE0A6] hover:border-[#FCD34D]"
        )}
      >
        {/* Soft wave background */}
        <svg
          className="pointer-events-none select-none absolute bottom-0 right-0 w-[68%] h-[46px] opacity-45"
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 C90,60 140,12 240,22 C310,30 355,8 400,18 L400,60 Z"
            fill="#FDE68A"
          />
        </svg>

        {/* ================= HEADER ================= */}
        <div className="relative z-10 flex flex-wrap items-start sm:items-center justify-between gap-[8px]">
          <div className="flex items-center gap-[10px] min-w-0 flex-1">
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 shadow-2xs bg-[#FFEDC2] text-[#EA580C] border border-[#FDE09B]">
              <Trophy size={18} className="shrink-0 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-[6px] min-w-0 flex-1 flex-wrap">
              <span className="text-[13.5px] sm:text-[15px] font-black uppercase tracking-tight leading-[1.3] break-words text-[#C2410C]">
                {label}
              </span>
              {externalLink && (
                <a
                  href={externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#D97706] hover:text-[#B45309] p-[4px] rounded-[6px] hover:bg-amber-100/60 transition-colors inline-flex items-center shrink-0"
                  title="Mở báo cáo BI"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-[6px] flex-wrap shrink-0">
            {/* Month & Store badge */}
            <span className="inline-flex items-center gap-1 px-[9px] py-[3.5px] rounded-full border bg-[#FFF7E0] text-[#D97706] border-[#FCD34D] text-[11px] sm:text-[11.5px] font-bold leading-none whitespace-nowrap">
              <Calendar size={11} />
              <span>T{String(effectiveMonth).padStart(2, '0')}/{effectiveYear}</span>
            </span>

            {/* Sync timestamp */}
            {formattedTime && (
              <span className="inline-flex items-center gap-[4px] px-[9px] py-[3.5px] rounded-full border bg-[#FFF7E0] text-[#D97706] border-[#FCD34D] text-[11px] sm:text-[11.5px] font-bold leading-none whitespace-nowrap">
                <Clock size={11} className="shrink-0" />
                <span>{formattedTime}</span>
              </span>
            )}

            {/* Row Count Badge: Explicitly 39 dòng or 0 dòng */}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-[10px] py-[3.5px] rounded-full text-[11px] sm:text-[11.5px] font-black leading-none whitespace-nowrap shadow-2xs",
                hasData
                  ? "bg-amber-500 text-white"
                  : "bg-[#FDE6AC] text-[#92400E]"
              )}
            >
              {isLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : hasData ? (
                <>
                  <Database size={11} />
                  <span>{totalPrograms} dòng</span>
                </>
              ) : (
                '0 dòng'
              )}
            </span>
          </div>
        </div>

        {/* ================= CARD BODY ================= */}
        {!isManualEditing ? (
          <div
            onClick={() => {
              if (hasData) {
                setIsDetailOpen(true);
              } else {
                setIsManualEditing(true);
                setManualText('');
              }
            }}
            className="relative z-10 flex flex-col gap-[10px] pt-[2px] cursor-pointer group select-none"
            title={hasData ? "Nhấp để xem chi tiết 39 chương trình" : "Nhấp để dán dữ liệu thủ công"}
          >
            {/* Status Line */}
            <div className="flex items-start sm:items-center justify-between gap-[10px]">
              <div className="flex items-start sm:items-center gap-[9px] min-w-0 flex-1">
                <Lock size={17} className="text-[#EA580C] shrink-0 stroke-[2.3] mt-[2px] sm:mt-0" />
                <div className="text-[12px] sm:text-[13px] font-black leading-[1.38] break-words min-w-0 text-[#5C2804]">
                  <span className="block">
                    {hasData ? `Đã đồng bộ dữ liệu ${label}` : `Chưa có dữ liệu ${label}`}
                  </span>
                  <span className="block text-[11.5px] sm:text-[12.5px] font-extrabold opacity-90 mt-[1px]">
                    ({totalPrograms} dòng{batch?.ten_sieu_thi ? ` • ${batch.ten_sieu_thi}` : ''})
                  </span>
                </div>
              </div>

              {/* Action: Open new / paste new if no data */}
              {!hasData && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsManualEditing(true);
                    setManualText('');
                  }}
                  className="w-auto min-h-[38px] px-[14px] py-[8px] text-white rounded-[10px] text-[12px] font-black inline-flex items-center justify-center gap-[6px] transition-all whitespace-nowrap bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] shadow-sm"
                >
                  <PlusCircle size={13} className="stroke-[2.5]" />
                  <span>Mở đợt mới</span>
                </button>
              )}
            </div>

            {/* KPI PILLS BREAKDOWN (When data exists) */}
            {hasData && batch && (
              <div className="flex items-center gap-[6px] flex-wrap pt-0.5">
                {/* Đạt KPI */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-[11px] font-bold shadow-2xs">
                  <CheckCircle2 size={12} className="text-emerald-700" />
                  <span>Đạt (≥ 100%): <strong className="font-black text-emerald-800">{batch.dat_count}</strong></span>
                </div>

                {/* Cần đẩy */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs">
                  <AlertTriangle size={12} className="text-amber-700" />
                  <span>Cần đẩy (80-99%): <strong className="font-black text-amber-800">{batch.can_day_count}</strong></span>
                </div>

                {/* Chưa đạt */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-900 text-[11px] font-bold shadow-2xs">
                  <XCircle size={12} className="text-rose-700" />
                  <span>Chưa đạt (&lt; 80%): <strong className="font-black text-rose-800">{batch.chua_dat_count}</strong></span>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS TOOLBAR (When data exists) */}
            {hasData && (
              <div
                className="flex items-center gap-2 flex-wrap pt-1 border-t border-amber-200/60"
                onClick={(e) => e.stopPropagation()}
              >
                {/* [Xem chi tiết] */}
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-black shadow-2xs transition-colors"
                  title="Xem toàn bộ 39 chương trình"
                >
                  <Eye size={13} className="text-amber-700" />
                  <span>Xem chi tiết</span>
                </button>

                {/* [Chỉnh sửa dữ liệu] */}
                {hasUpdatePermission && (
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-blue-900 border border-blue-300 text-xs font-black shadow-2xs transition-colors"
                    title="Chỉnh sửa các ô số liệu"
                  >
                    <Edit3 size={13} className="text-blue-700" />
                    <span>Chỉnh sửa</span>
                  </button>
                )}

                {/* [Mở đợt mới] */}
                <button
                  type="button"
                  onClick={() => {
                    setIsManualEditing(true);
                    setManualText('');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-2xs transition-colors"
                  title="Nhận diện ảnh mới hoặc dán bảng mới"
                >
                  <PlusCircle size={13} />
                  <span>Mở đợt mới</span>
                </button>

                {/* [Xem lịch sử] */}
                {batch && batch.history && batch.history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition-colors"
                    title="Xem lịch sử cập nhật"
                  >
                    <History size={13} className="text-slate-500" />
                    <span>Lịch sử</span>
                  </button>
                )}

                {/* [Xóa đợt thi đua] */}
                {hasUpdatePermission && (
                  <button
                    type="button"
                    onClick={handleDeleteBatch}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs transition-colors ml-auto"
                    title="Xóa đợt thi đua này khỏi Database"
                  >
                    {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
                    <span className="hidden sm:inline">Xóa đợt</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* MANUAL TEXTAREA / PASTE CONTAINER */
          <div ref={manualBoxRef} className="relative z-10 space-y-[10px] pt-[2px]">
            <textarea
              value={manualText}
              onPaste={(e) => {
                const text = e.clipboardData?.getData('text');
                if (text && text.trim()) {
                  e.preventDefault();
                  handleSaveManualText(text);
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setManualText(val);
                if (val && val.trim()) {
                  handleSaveManualText(val);
                }
              }}
              placeholder={`Dán (Ctrl+V) dữ liệu báo cáo BI ${label} vào đây...`}
              className="w-full h-[110px] p-[10px] text-[12px] rounded-[10px] border border-[#F59E0B] focus:border-[#D97706] focus:outline-hidden bg-white/95 text-slate-800 shadow-inner font-mono resize-none transition-all"
              autoFocus
            />

            <div className="flex items-center justify-between gap-[8px]">
              <span className="text-[11px] text-amber-800/80 font-bold italic">
                * Dán trực tiếp từ bảng Excel/BI hoặc tải ảnh ở dưới
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualEditing(false);
                    setManualText('');
                  }}
                  className="px-3 py-1 rounded-md text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveManualText(manualText)}
                  className="px-3 py-1 rounded-md text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-2xs"
                >
                  Lưu & Khóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= AI UPLOADER SLOT ================= */}
        <div className="relative z-10 pt-1 border-t border-amber-200/50">
          <ThiDuaLuyKeAiUploader
            currentValue={value}
            activeStore={activeStore}
            availableMarkets={availableMarkets}
            selectedMonth={selectedMonth}
            allStoresCache={allStoresCache}
            onApplyBiText={(newText) => {
              onChange(newText);
              // Trigger reload in Central Card
              thiDuaCentralService.getCompetitionByStore(activeStore, effectiveMonth, effectiveYear).then((b) => {
                if (b) setBatch(b);
              });
            }}
            onTriggerSavePipeline={async () => {
              if (onTriggerSavePipeline) {
                await onTriggerSavePipeline();
              }
            }}
            showNotification={showNotification}
          />
        </div>
      </div>

      {/* ================= DETAIL MODAL ================= */}
      {isDetailOpen && (
        <ThiDuaDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          batch={batch}
          onOpenEdit={() => setIsEditOpen(true)}
          hasUpdatePermission={hasUpdatePermission}
          showNotification={showNotification}
        />
      )}

      {/* ================= EDIT MODAL ================= */}
      {isEditOpen && (
        <ThiDuaEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          batch={batch}
          onSaveBatch={handleSaveEditedBatch}
          isSaving={isSavingEdit}
        />
      )}

      {/* ================= HISTORY MODAL ================= */}
      {isHistoryOpen && batch && (
        <ThiDuaHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          history={batch.history || []}
          storeName={batch.ten_sieu_thi}
          month={batch.month}
          year={batch.year}
        />
      )}
    </>
  );
};
