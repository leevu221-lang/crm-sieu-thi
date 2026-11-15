/**
 * POPUP LỊCH SỬ CẬP NHẬT LUỸ KẾ THI ĐUA
 * Hiển thị nhật ký các lần cập nhật, số lượng chương trình và người thực hiện.
 */

import React from 'react';
import { X, History, Clock, User, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import type { ThiDuaBatchHistoryItem } from '../../../services/thiDuaCentralService';

interface ThiDuaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ThiDuaBatchHistoryItem[];
  storeName: string;
  month: number;
  year: number;
}

export const ThiDuaHistoryModal: React.FC<ThiDuaHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  storeName,
  month,
  year,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <History size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                LỊCH SỬ CẬP NHẬT THI ĐUA
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {storeName} • Tháng T{String(month).padStart(2, '0')}/{year}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
          {!history || history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Chưa ghi nhận lịch sử cập nhật nào cho đợt thi đua này.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {history.map((item, idx) => {
                const dateObj = new Date(item.updated_at);
                const timeStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : item.updated_at;

                return (
                  <div key={item.id || idx} className="relative group">
                    {/* TIMELINE DOT */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-xs group-hover:scale-125 transition-transform" />

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          {timeStr}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300">
                          {item.source_type}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap mb-2">
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <User size={12} className="text-slate-400" />
                          {item.updated_by || 'Hệ thống'}
                        </span>
                        <span>•</span>
                        <span>Tổng số: <strong className="text-slate-900">{item.total_programs} CT</strong></span>
                        {(item.updated_count > 0 || item.added_count > 0) && (
                          <span className="text-[11px] text-emerald-600 font-bold">
                            ({item.updated_count} cập nhật, {item.added_count} thêm mới)
                          </span>
                        )}
                      </div>

                      {item.note && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 italic">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
