/**
 * POPUP CHỈNH SỬA DỮ LIỆU LUỸ KẾ THI ĐUA (39 CHƯƠNG TRÌNH)
 * Cho phép chỉnh sửa nhanh các ô số liệu (Thực hiện, Target, Kênh, Dự kiến, Hạng vùng)
 * và lưu trực tiếp vào Database trung tâm.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Search,
  AlertTriangle,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Trophy,
  Loader2,
} from 'lucide-react';
import { cn } from '../utils';
import type { ThiDuaBatchRecord, ThiDuaProgramRecord } from '../../../services/thiDuaCentralService';

interface ThiDuaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: ThiDuaBatchRecord | null;
  onSaveBatch: (updatedPrograms: ThiDuaProgramRecord[]) => Promise<void>;
  isSaving?: boolean;
}

export const ThiDuaEditModal: React.FC<ThiDuaEditModalProps> = ({
  isOpen,
  onClose,
  batch,
  onSaveBatch,
  isSaving = false,
}) => {
  const [rows, setRows] = useState<ThiDuaProgramRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize rows whenever batch opens
  useEffect(() => {
    if (batch && batch.programs) {
      setRows(JSON.parse(JSON.stringify(batch.programs)));
      setHasChanges(false);
    }
  }, [batch, isOpen]);

  if (!isOpen || !batch) return null;

  const handleFieldChange = (
    index: number,
    field: keyof ThiDuaProgramRecord,
    val: any
  ) => {
    setRows((prev) => {
      const next = [...prev];
      const targetRow = { ...next[index] };

      if (field === 'thuc_hien' || field === 'target') {
        const numVal = Math.max(0, parseFloat(val) || 0);
        (targetRow as any)[field] = numVal;
        // Recalculate percent_actual
        if (targetRow.target > 0) {
          targetRow.percent_actual = Number(((targetRow.thuc_hien / targetRow.target) * 100).toFixed(1));
        } else {
          targetRow.percent_actual = 0;
        }
      } else if (field === 'percent_forecast' || field === 'percent_actual') {
        (targetRow as any)[field] = Math.max(0, parseFloat(val) || 0);
      } else if (field === 'company_rank') {
        const rank = parseInt(val, 10);
        targetRow.company_rank = !isNaN(rank) && rank >= 1 ? rank : null;
      } else {
        (targetRow as any)[field] = val;
      }

      next[index] = targetRow;
      return next;
    });
    setHasChanges(true);
  };

  const handleDeleteRow = (index: number) => {
    if (window.confirm('Bạn có chắc muốn xóa chương trình này khỏi đợt thi đua?')) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      setHasChanges(true);
    }
  };

  const handleAddRow = () => {
    const newProg: ThiDuaProgramRecord = {
      id: `${batch.batch_id}_new_${Date.now()}`,
      batch_id: batch.batch_id,
      store_id: batch.store_id,
      warehouse_code: batch.warehouse_code,
      ten_sieu_thi: batch.ten_sieu_thi,
      month: batch.month,
      year: batch.year,
      ten_chuong_trinh: `Chương trình mới ${rows.length + 1}`,
      kenh: 'DT',
      thuc_hien: 0,
      target: 0,
      percent_actual: 0,
      percent_forecast: 0,
      company_rank: null,
      source_type: 'MANUAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRows((prev) => [...prev, newProg]);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (batch?.programs) {
      setRows(JSON.parse(JSON.stringify(batch.programs)));
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    await onSaveBatch(rows);
    setHasChanges(false);
  };

  // Filtered rows for fast finding
  const filteredIndexedRows = useMemo(() => {
    return rows
      .map((r, originalIndex) => ({ row: r, originalIndex }))
      .filter(({ row }) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          row.ten_chuong_trinh.toLowerCase().includes(q) ||
          row.kenh.toLowerCase().includes(q) ||
          (row.company_rank && String(row.company_rank).includes(q))
        );
      });
  }, [rows, searchQuery]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
              <Trophy size={22} className="text-yellow-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                  CHỈNH SỬA LUỸ KẾ THI ĐUA
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-900/80 border border-blue-400/40 text-blue-100 text-xs font-black">
                  T{String(batch.month).padStart(2, '0')}/{batch.year}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-extrabold truncate">
                  {batch.ten_sieu_thi}
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5 font-medium">
                Sửa trực tiếp các ô số liệu. % TH sẽ tự động tính lại theo Thực hiện và Target.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh chương trình cần sửa..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-bold transition-colors"
            >
              <Plus size={14} /> Thêm CT mới
            </button>
            {hasChanges && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-bold transition-colors"
              >
                <RotateCcw size={14} /> Khôi phục
              </button>
            )}
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed min-w-[850px]">
                <colgroup>
                  <col className="w-[40px]" />
                  <col className="w-[240px]" />
                  <col className="w-[75px]" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[85px]" />
                  <col className="w-[85px]" />
                  <col className="w-[70px]" />
                  <col className="w-[45px]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase tracking-tight text-[11px]">
                    <th className="py-2.5 px-2 text-center">#</th>
                    <th className="py-2.5 px-2">Tên chương trình</th>
                    <th className="py-2.5 px-2 text-center">Kênh</th>
                    <th className="py-2.5 px-2 text-right">Thực hiện</th>
                    <th className="py-2.5 px-2 text-right">Target</th>
                    <th className="py-2.5 px-2 text-right">% TH</th>
                    <th className="py-2.5 px-2 text-right">% Dự kiến</th>
                    <th className="py-2.5 px-2 text-center">Hạng</th>
                    <th className="py-2.5 px-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIndexedRows.map(({ row, originalIndex }) => (
                    <tr key={row.id || originalIndex} className="hover:bg-blue-50/30 transition-colors">
                      {/* STT */}
                      <td className="py-2 px-2 text-center text-slate-400 font-bold text-[11px]">
                        {originalIndex + 1}
                      </td>

                      {/* Tên chương trình */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={row.ten_chuong_trinh}
                          onChange={(e) => handleFieldChange(originalIndex, 'ten_chuong_trinh', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Kênh */}
                      <td className="py-2 px-2 text-center">
                        <select
                          value={row.kenh}
                          onChange={(e) => handleFieldChange(originalIndex, 'kenh', e.target.value as 'DT' | 'SL')}
                          className="px-1.5 py-1 text-xs font-black rounded border border-slate-200 bg-white focus:border-blue-500 focus:outline-hidden"
                        >
                          <option value="DT">DT</option>
                          <option value="SL">SL</option>
                        </select>
                      </td>

                      {/* Thực hiện */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          value={row.thuc_hien}
                          onChange={(e) => handleFieldChange(originalIndex, 'thuc_hien', e.target.value)}
                          className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-slate-900 border border-slate-200 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Target */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          value={row.target}
                          onChange={(e) => handleFieldChange(originalIndex, 'target', e.target.value)}
                          className="w-full px-2 py-1 text-xs text-right font-mono text-slate-700 border border-slate-200 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* % TH */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          value={row.percent_actual ?? 0}
                          onChange={(e) => handleFieldChange(originalIndex, 'percent_actual', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs text-right font-mono font-black text-slate-900 border border-slate-200 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* % Dự kiến */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          value={row.percent_forecast ?? 0}
                          onChange={(e) => handleFieldChange(originalIndex, 'percent_forecast', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs text-right font-mono font-black text-blue-800 border border-slate-200 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Hạng vùng */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={row.company_rank ?? ''}
                          onChange={(e) => handleFieldChange(originalIndex, 'company_rank', e.target.value)}
                          placeholder="-"
                          className="w-full px-1 py-1 text-xs text-center font-bold text-slate-700 border border-slate-200 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Xóa dòng */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(originalIndex)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Xóa dòng này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Tổng cộng: <strong className="text-slate-800 font-black">{rows.length}</strong> chương trình
            {hasChanges && <span className="ml-2 text-amber-600 font-bold">● Có thay đổi chưa lưu</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black shadow-md transition-all text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang lưu Database...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Lưu thay đổi vào Database</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
