/**
 * POPUP XEM CHI TIẾT LUỸ KẾ THI ĐUA (39 CHƯƠNG TRÌNH)
 * Hiển thị toàn bộ bảng thi đua với bộ lọc kênh (DT/SL), trạng thái (Đạt/Cần đẩy/Chưa đạt),
 * tìm kiếm nhanh và sao chép bảng dữ liệu.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Trophy,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Calendar,
  Store,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '../utils';
import type { ThiDuaBatchRecord, ThiDuaProgramRecord } from '../../../services/thiDuaCentralService';

const formatNumber = (val: number | null | undefined): string => (val ?? 0).toLocaleString('vi-VN');

interface ThiDuaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: ThiDuaBatchRecord | null;
  onOpenEdit?: () => void;
  hasUpdatePermission?: boolean;
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ThiDuaDetailModal: React.FC<ThiDuaDetailModalProps> = ({
  isOpen,
  onClose,
  batch,
  onOpenEdit,
  hasUpdatePermission = true,
  showNotification,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DAT' | 'CAN_DAY' | 'CHUA_DAT'>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'DT' | 'SL'>('ALL');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !batch) return null;

  const programs = batch.programs || [];

  // Filter programs based on search, status, and channel
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      // 1. Channel filter
      if (channelFilter !== 'ALL' && p.kenh !== channelFilter) {
        return false;
      }

      // 2. Status filter
      const rate = p.percent_forecast !== undefined && p.percent_forecast !== null
        ? p.percent_forecast
        : (p.percent_actual || 0);

      if (statusFilter === 'DAT' && rate < 100) return false;
      if (statusFilter === 'CAN_DAY' && (rate < 80 || rate >= 100)) return false;
      if (statusFilter === 'CHUA_DAT' && rate >= 80) return false;

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.ten_chuong_trinh.toLowerCase().includes(q);
        const rankMatch = p.company_rank ? String(p.company_rank).includes(q) : false;
        if (!nameMatch && !rankMatch) return false;
      }

      return true;
    });
  }, [programs, channelFilter, statusFilter, searchQuery]);

  // Copy table to clipboard
  const handleCopyTable = () => {
    if (!filteredPrograms.length) return;

    const headers = ['STT', 'Tên chương trình', 'Kênh', 'Thực hiện', 'Target', '% TH', '% Dự kiến', 'Hạng vùng', 'Trạng thái'];
    const rows = filteredPrograms.map((p, idx) => {
      const rate = p.percent_forecast ?? p.percent_actual ?? 0;
      const status = rate >= 100 ? 'Đạt' : rate >= 80 ? 'Cần đẩy' : 'Chưa đạt';
      return [
        idx + 1,
        p.ten_chuong_trinh,
        p.kenh,
        p.thuc_hien,
        p.target,
        `${(p.percent_actual || 0).toFixed(1)}%`,
        `${(p.percent_forecast || 0).toFixed(1)}%`,
        p.company_rank ?? '-',
        status,
      ].join('\t');
    });

    const fullTsv = [headers.join('\t'), ...rows].join('\n');

    navigator.clipboard.writeText(fullTsv).then(() => {
      setIsCopied(true);
      if (showNotification) {
        showNotification(`Đã sao chép ${filteredPrograms.length} dòng vào bộ nhớ tạm!`, 'success');
      }
      setTimeout(() => setIsCopied(false), 2500);
    }).catch(() => {
      if (showNotification) {
        showNotification('Không thể sao chép vào bộ nhớ tạm.', 'error');
      }
    });
  };

  const formattedTime = batch.updated_at
    ? new Date(batch.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
              <Trophy size={22} className="text-yellow-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                  CHI TIẾT LUỸ KẾ THI ĐUA
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-800/80 border border-amber-400/40 text-amber-100 text-xs font-black">
                  T{String(batch.month).padStart(2, '0')}/{batch.year}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-extrabold flex items-center gap-1">
                  <Store size={12} />
                  {batch.ten_sieu_thi}
                </span>
              </div>
              <div className="text-xs text-amber-100/90 flex items-center gap-2 mt-0.5 font-medium flex-wrap">
                <span>Tổng số: <strong className="text-white font-black">{batch.total_programs} chương trình</strong></span>
                {formattedTime && (
                  <span className="flex items-center gap-1 text-[11px] opacity-90">
                    <Clock size={11} /> Cập nhật: {formattedTime} ({batch.updated_by || 'Hệ thống'})
                  </span>
                )}
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/80 text-white text-[10.5px] font-bold">
                  Đã đồng bộ DB
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasUpdatePermission && onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/30"
                title="Chỉnh sửa số liệu bảng"
              >
                <Edit3 size={14} />
                <span>Chỉnh sửa</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SUMMARY STATS PILLS */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-600">Phân loại KPI:</span>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'DAT' ? 'ALL' : 'DAT')}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all border text-[11.5px]",
                statusFilter === 'DAT'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              )}
            >
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Đạt KPI (≥ 100%): <strong>{batch.dat_count}</strong></span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'CAN_DAY' ? 'ALL' : 'CAN_DAY')}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all border text-[11.5px]",
                statusFilter === 'CAN_DAY'
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              )}
            >
              <AlertTriangle size={13} className="text-amber-600" />
              <span>Cần đẩy (80-99%): <strong>{batch.can_day_count}</strong></span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'CHUA_DAT' ? 'ALL' : 'CHUA_DAT')}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all border text-[11.5px]",
                statusFilter === 'CHUA_DAT'
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
              )}
            >
              <XCircle size={13} className="text-rose-600" />
              <span>Chưa đạt (&lt; 80%): <strong>{batch.chua_dat_count}</strong></span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTable}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition-all shadow-2xs text-[11.5px]"
              title="Sao chép toàn bộ bảng vào bộ nhớ tạm"
            >
              {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{isCopied ? 'Đã chép TSV!' : 'Sao chép bảng'}</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS TOOLBAR */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm chương trình hoặc hạng vùng..."
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-500 shrink-0">Kênh:</span>
            <button
              type="button"
              onClick={() => setChannelFilter('ALL')}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md font-bold transition-colors whitespace-nowrap",
                channelFilter === 'ALL'
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Tất cả ({programs.length})
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('DT')}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md font-bold transition-colors whitespace-nowrap",
                channelFilter === 'DT'
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              )}
            >
              Doanh thu ({programs.filter((p) => p.kenh === 'DT').length})
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('SL')}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md font-bold transition-colors whitespace-nowrap",
                channelFilter === 'SL'
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              Số lượng ({programs.filter((p) => p.kenh === 'SL').length})
            </button>
          </div>
        </div>

        {/* MAIN DATA TABLE */}
        <div className="flex-1 overflow-auto bg-slate-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed min-w-[760px]">
                <colgroup>
                  <col className="w-[44px]" />
                  <col className="w-[230px]" />
                  <col className="w-[60px]" />
                  <col className="w-[100px]" />
                  <col className="w-[100px]" />
                  <col className="w-[85px]" />
                  <col className="w-[85px]" />
                  <col className="w-[70px]" />
                  <col className="w-[90px]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200 uppercase tracking-tight text-[11px]">
                    <th className="py-2.5 px-2 text-center">#</th>
                    <th className="py-2.5 px-3">Tên chương trình</th>
                    <th className="py-2.5 px-2 text-center">Kênh</th>
                    <th className="py-2.5 px-3 text-right">Thực hiện</th>
                    <th className="py-2.5 px-3 text-right">Target</th>
                    <th className="py-2.5 px-2 text-right">% TH</th>
                    <th className="py-2.5 px-2 text-right">% Dự kiến</th>
                    <th className="py-2.5 px-2 text-center">Hạng</th>
                    <th className="py-2.5 px-2 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredPrograms.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                        Không tìm thấy chương trình nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredPrograms.map((p, idx) => {
                      const rate = p.percent_forecast ?? p.percent_actual ?? 0;
                      const isDat = rate >= 100;
                      const isCanDay = rate >= 80 && rate < 100;

                      return (
                        <tr
                          key={p.id || idx}
                          className="hover:bg-amber-50/40 transition-colors group"
                        >
                          {/* STT */}
                          <td className="py-2.5 px-2 text-center text-slate-400 font-bold text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Tên chương trình */}
                          <td className="py-2.5 px-3 font-bold text-slate-900 truncate" title={p.ten_chuong_trinh}>
                            {p.ten_chuong_trinh}
                          </td>

                          {/* Kênh */}
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10.5px] font-black uppercase tracking-wide",
                                p.kenh === 'SL'
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-blue-100 text-blue-800 border border-blue-300"
                              )}
                            >
                              {p.kenh}
                            </span>
                          </td>

                          {/* Thực hiện */}
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 font-mono">
                            {formatNumber(p.thuc_hien)}
                          </td>

                          {/* Target */}
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono font-medium">
                            {formatNumber(p.target)}
                          </td>

                          {/* % TH */}
                          <td className="py-2.5 px-2 text-right font-black font-mono">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[11px]",
                                (p.percent_actual || 0) >= 100
                                  ? "bg-emerald-100 text-emerald-800"
                                  : (p.percent_actual || 0) >= 80
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              )}
                            >
                              {(p.percent_actual || 0).toFixed(1)}%
                            </span>
                          </td>

                          {/* % Dự kiến */}
                          <td className="py-2.5 px-2 text-right font-black font-mono">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[11px]",
                                isDat
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isCanDay
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              )}
                            >
                              {(p.percent_forecast || 0).toFixed(1)}%
                            </span>
                          </td>

                          {/* Hạng vùng */}
                          <td className="py-2.5 px-2 text-center">
                            {p.company_rank ? (
                              <span className="inline-flex items-center justify-center min-w-[24px] h-[20px] px-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                                #{p.company_rank}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold">-</span>
                            )}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-2.5 px-2 text-center">
                            {isDat ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check size={11} strokeWidth={3} /> Đạt
                              </span>
                            ) : isCanDay ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <AlertTriangle size={11} /> Cần đẩy
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <X size={11} strokeWidth={3} /> Chưa đạt
                              </span>
                            )}
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

        {/* MODAL FOOTER */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Hiển thị <strong>{filteredPrograms.length}</strong> / <strong>{programs.length}</strong> chương trình</span>
          </div>

          <div className="flex items-center gap-2">
            {hasUpdatePermission && onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit();
                }}
                className="inline-flex sm:hidden items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
              >
                <Edit3 size={13} /> Chỉnh sửa
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
