import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Search, Plus, Trash2, Edit2, Check, Loader2, 
  FileSpreadsheet, ArrowLeft, ArrowRight, Store, AlertCircle
} from 'lucide-react';

export interface BossStoreItem {
  id: string;
  maKho: string;       // Cột B: MST (Mã kho)
  tenSieuThi: string;  // Cột C: SIÊU THỊ
  mstSieuThi?: string; // Cột D: MST + SIÊU THỊ
  base?: string;       // Cột E: BASE
  rawCells?: string[];
}

interface BossStoreTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: BossStoreItem[];
  headers?: string[];
  onUpdateRow: (id: string, newMaKho: string, newTenSieuThi: string, newMstSieuThi?: string, newBase?: string) => Promise<void>;
  onDeleteRow: (id: string) => Promise<void>;
  onAddRow: (maKho: string, tenSieuThi: string, mstSieuThi?: string, base?: string) => Promise<void>;
  onUploadExcel: (file: File) => Promise<void>;
  isUpdating: boolean;
  currentMaKho?: string;
}

const PAGE_SIZE = 50;

export const BossStoreTableModal: React.FC<BossStoreTableModalProps> = ({
  isOpen,
  onClose,
  rows,
  onUpdateRow,
  onDeleteRow,
  onAddRow,
  onUploadExcel,
  isUpdating,
  currentMaKho = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyCurrentKho, setOnlyCurrentKho] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Editing state (4 cột B, C, D, E)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMaKho, setEditMaKho] = useState('');
  const [editTenSieuThi, setEditTenSieuThi] = useState('');
  const [editMstSieuThi, setEditMstSieuThi] = useState('');
  const [editBase, setEditBase] = useState('');

  // Adding new row state
  const [isAdding, setIsAdding] = useState(false);
  const [newMaKho, setNewMaKho] = useState('');
  const [newTenSieuThi, setNewTenSieuThi] = useState('');
  const [newMstSieuThi, setNewMstSieuThi] = useState('');
  const [newBase, setNewBase] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // File upload input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter rows
  const filteredRows = useMemo(() => {
    let list = rows;
    const cleanCurrent = currentMaKho.trim().replace(/^0+/, '');

    if (onlyCurrentKho && cleanCurrent) {
      list = list.filter((r) => {
        const rowKho = String(r.maKho || '').trim().replace(/^0+/, '');
        const d = String(r.mstSieuThi || '').trim();
        const e = String(r.base || '').trim();
        return rowKho === cleanCurrent || 
               d.startsWith(`${cleanCurrent} -`) || 
               e.startsWith(`${cleanCurrent} -`);
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((r) => 
        String(r.maKho || '').toLowerCase().includes(q) ||
        String(r.tenSieuThi || '').toLowerCase().includes(q) ||
        String(r.mstSieuThi || '').toLowerCase().includes(q) ||
        String(r.base || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [rows, searchTerm, onlyCurrentKho, currentMaKho]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const handleStartEdit = (row: BossStoreItem) => {
    setEditingId(row.id);
    setEditMaKho(row.maKho || '');
    setEditTenSieuThi(row.tenSieuThi || '');
    setEditMstSieuThi(row.mstSieuThi || (row.maKho && row.tenSieuThi ? `${row.maKho} - ${row.tenSieuThi}` : ''));
    setEditBase(row.base || row.mstSieuThi || row.tenSieuThi || '');
    setActionError(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editMaKho.trim() || !editTenSieuThi.trim()) {
      setActionError('Mã số kho MST (Cột B) và Tên siêu thị (Cột C) không được để trống!');
      return;
    }
    setActionError(null);
    try {
      const autoD = editMstSieuThi.trim() || `${editMaKho.trim()} - ${editTenSieuThi.trim()}`;
      const autoE = editBase.trim() || autoD;
      await onUpdateRow(id, editMaKho.trim(), editTenSieuThi.trim(), autoD, autoE);
      setEditingId(null);
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi cập nhật dòng dữ liệu');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setActionError(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dòng siêu thị này khỏi DS BOSS?')) {
      try {
        await onDeleteRow(id);
      } catch (err: any) {
        setActionError(err.message || 'Lỗi khi xóa dòng dữ liệu');
      }
    }
  };

  const handleSaveNewRow = async () => {
    if (!newMaKho.trim() || !newTenSieuThi.trim()) {
      setActionError('Vui lòng nhập đầy đủ MST (Cột B) và Tên siêu thị (Cột C)!');
      return;
    }
    setActionError(null);
    try {
      const autoD = newMstSieuThi.trim() || `${newMaKho.trim()} - ${newTenSieuThi.trim()}`;
      const autoE = newBase.trim() || autoD;
      await onAddRow(newMaKho.trim(), newTenSieuThi.trim(), autoD, autoE);
      setNewMaKho('');
      setNewTenSieuThi('');
      setNewMstSieuThi('');
      setNewBase('');
      setIsAdding(false);
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi thêm dòng mới');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadExcel(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-6xl xl:max-w-7xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/60 border border-indigo-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Store size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Bảng Danh Sách BOSS
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                  Admin 43751
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Tổng cộng: <strong className="text-amber-400 font-black">{rows.length}</strong> siêu thị được lưu trên Firebase (Cột B, C, D, E)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action / Filter Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          {/* Search box */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Tìm theo MST (Cột B), SIÊU THỊ (Cột C), MST + SIÊU THỊ (Cột D), BASE (Cột E)..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Filter by current kho button */}
            {currentMaKho && (
              <button
                type="button"
                onClick={() => { setOnlyCurrentKho(!onlyCurrentKho); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  onlyCurrentKho
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Kho hiện tại ({currentMaKho})
              </button>
            )}

            {/* Add row button */}
            <button
              type="button"
              onClick={() => { setIsAdding(!isAdding); setActionError(null); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Plus size={15} />
              <span>Thêm dòng</span>
            </button>

            {/* Upload file button inside modal */}
            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95">
              <FileSpreadsheet size={15} />
              <span>Nạp lại Excel</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUpdating}
              />
            </label>
          </div>
        </div>

        {/* Error message if any */}
        {actionError && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Form Add New Row (4 cột B, C, D, E) */}
        {isAdding && (
          <div className="p-3.5 bg-emerald-50/80 border-b border-emerald-200 flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="w-full md:w-28 shrink-0">
              <input
                type="text"
                value={newMaKho}
                onChange={(e) => setNewMaKho(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNewRow();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                placeholder="MST (Cột B)"
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                value={newTenSieuThi}
                onChange={(e) => {
                  setNewTenSieuThi(e.target.value);
                  if (!newMstSieuThi && newMaKho) {
                    setNewMstSieuThi(`${newMaKho.trim()} - ${e.target.value.trim()}`);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNewRow();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                placeholder="SIÊU THỊ (Cột C)"
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                value={newMstSieuThi}
                onChange={(e) => setNewMstSieuThi(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNewRow();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                placeholder="MST + SIÊU THỊ (Cột D)"
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="w-full md:w-44 shrink-0">
              <input
                type="text"
                value={newBase}
                onChange={(e) => setNewBase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNewRow();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                placeholder="BASE (Cột E)"
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveNewRow}
                disabled={isUpdating}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Lưu</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-black cursor-pointer transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Main Table Content - Thiết kế chuẩn như Hình 1 (Cột B, C, D, E) */}
        <div className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileSpreadsheet size={42} className="mx-auto mb-3 opacity-30" />
              <p className="font-black text-sm">Chưa có dữ liệu DS BOSS nào được tải lên!</p>
              <p className="text-xs mt-1">Bấm nút "Nạp lại Excel" hoặc "Thêm dòng" để bắt đầu.</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-bold text-sm">Không tìm thấy siêu thị nào khớp với từ khóa!</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs table-fixed min-w-[960px]">
              <colgroup>
                <col className="w-14" />
                <col className="w-24" />
                <col className="w-72" />
                <col className="w-72" />
                <col className="w-64" />
                <col className="w-24" />
              </colgroup>
              <thead className="sticky top-0 bg-[#bbf7d0] text-emerald-950 z-10 shadow-xs border-b border-emerald-300">
                <tr className="uppercase font-black tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 text-center border-r border-emerald-200/80">STT</th>
                  <th className="py-2.5 px-3 text-center border-r border-emerald-200/80">MST</th>
                  <th className="py-2.5 px-3 text-left border-r border-emerald-200/80">SIÊU THỊ</th>
                  <th className="py-2.5 px-3 text-left border-r border-emerald-200/80">MST + SIÊU THỊ</th>
                  <th className="py-2.5 px-3 text-left border-r border-emerald-200/80">BASE</th>
                  <th className="py-2.5 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedRows.map((row, index) => {
                  const stt = (currentPage - 1) * PAGE_SIZE + index + 1;
                  const isEditing = editingId === row.id;
                  const cleanCur = currentMaKho.trim().replace(/^0+/, '');
                  const rowKho = String(row.maKho || '').trim().replace(/^0+/, '');
                  const rowD = String(row.mstSieuThi || '').trim();
                  const rowE = String(row.base || '').trim();
                  const isMatchCurrent = cleanCur !== '' && (
                    rowKho === cleanCur ||
                    rowD.startsWith(`${cleanCur} -`) ||
                    rowE.startsWith(`${cleanCur} -`)
                  );

                  const displayD = row.mstSieuThi || (row.maKho && row.tenSieuThi ? `${row.maKho} - ${row.tenSieuThi}` : '');
                  const displayE = row.base || displayD || '';

                  if (isEditing) {
                    return (
                      <tr key={row.id} className="bg-amber-50/90 border-b border-amber-200">
                        <td className="py-2 px-2 text-center font-bold text-slate-400 border-r border-amber-200">{stt}</td>
                        <td className="py-2 px-2 border-r border-amber-200">
                          <input
                            type="text"
                            value={editMaKho}
                            onChange={(e) => setEditMaKho(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="w-full px-2 py-1 bg-white border border-amber-400 rounded-md font-bold text-slate-800 text-xs text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </td>
                        <td className="py-2 px-2 border-r border-amber-200">
                          <input
                            type="text"
                            value={editTenSieuThi}
                            onChange={(e) => setEditTenSieuThi(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="w-full px-2 py-1 bg-white border border-amber-400 rounded-md font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </td>
                        <td className="py-2 px-2 border-r border-amber-200">
                          <input
                            type="text"
                            value={editMstSieuThi}
                            onChange={(e) => setEditMstSieuThi(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="w-full px-2 py-1 bg-white border border-amber-400 rounded-md font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </td>
                        <td className="py-2 px-2 border-r border-amber-200">
                          <input
                            type="text"
                            value={editBase}
                            onChange={(e) => setEditBase(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="w-full px-2 py-1 bg-white border border-amber-400 rounded-md font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(row.id)}
                              disabled={isUpdating}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer disabled:opacity-50"
                              title="Lưu"
                            >
                              {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer"
                              title="Hủy"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={row.id} 
                      className={`transition-colors border-b border-slate-100 ${
                        isMatchCurrent 
                          ? 'bg-[#fef08a] text-yellow-950 font-bold border-l-4 border-l-amber-500 hover:bg-[#fde047]' 
                          : 'hover:bg-indigo-50/30 text-slate-800'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold border-r border-slate-100">{stt}</td>
                      <td className="py-2.5 px-3 text-center font-bold border-r border-slate-100">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black tracking-wide ${
                          isMatchCurrent 
                            ? 'bg-amber-300 text-amber-950' 
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {row.maKho}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 truncate border-r border-slate-100">
                        <span className="font-bold truncate block" title={row.tenSieuThi}>
                          {row.tenSieuThi}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 truncate border-r border-slate-100 text-slate-600 font-medium">
                        <span className="truncate block" title={displayD}>
                          {displayD}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 truncate border-r border-slate-100 text-slate-600 font-medium">
                        <span className="truncate block" title={displayE}>
                          {displayE}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(row)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Sửa dòng này"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa dòng này"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-slate-500">
            Hiển thị <strong className="text-slate-800">{paginatedRows.length}</strong> / <strong className="text-slate-800">{filteredRows.length}</strong> dòng
            {onlyCurrentKho && <span className="text-amber-700 font-black ml-1">(đang lọc theo kho {currentMaKho})</span>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} className="inline mr-1" />
                Trước
              </button>
              <span className="text-xs font-black text-slate-700 px-2">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Sau
                <ArrowRight size={13} className="inline ml-1" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
          >
            Đóng bảng
          </button>
        </div>
      </motion.div>
    </div>
  );
};
