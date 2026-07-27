import React, { useState } from 'react';
import { 
  X, 
  History, 
  RotateCcw, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  Eye, 
  EyeOff, 
  AlertCircle,
  FileText,
  Store
} from 'lucide-react';
import { cn } from '../utils';

export interface DataSnapshot {
  id: string;
  dateKey: string; // YYYY-MM-DD
  dateFormatted: string; // DD/MM/YYYY
  timeFormatted: string; // HH:mm:ss
  timestamp: number;
  activeStore: string;
  payload: {
    marketInput?: string;
    categoryRevenueInput?: string;
    clusterSummaryInput?: string;
    categoryInput?: string;
    categoryTargetInput?: string;
    clusterCategoryInput?: string;
    staffInput?: string;
    staffCategoryInput?: string;
    banKemNv?: string;
    phucVu?: string;
    tragopNv?: string;
  };
  summary: {
    hasRealtimeDt: boolean;
    hasLuykeDt: boolean;
    hasRealtimeTd: boolean;
    hasLuykeTd: boolean;
    hasStaffData: boolean;
  };
}

export const HISTORY_STORAGE_KEY = 'CRM_DATA_PASTE_HISTORY_V1';

export const getHistorySnapshots = (): DataSnapshot[] => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load history snapshots", e);
    return [];
  }
};

export const saveHistorySnapshot = (payload: DataSnapshot['payload'], activeStore: string): DataSnapshot[] => {
  try {
    const history = getHistorySnapshots();
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeFormatted = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const hasRealtimeDt = Boolean(payload.marketInput && payload.marketInput.trim().length > 0);
    const hasLuykeDt = Boolean((payload.categoryRevenueInput || payload.clusterSummaryInput) && (payload.categoryRevenueInput || payload.clusterSummaryInput)!.trim().length > 0);
    const hasRealtimeTd = Boolean(payload.categoryInput && payload.categoryInput.trim().length > 0);
    const hasLuykeTd = Boolean((payload.categoryTargetInput || payload.clusterCategoryInput) && (payload.categoryTargetInput || payload.clusterCategoryInput)!.trim().length > 0);
    const hasStaffData = Boolean(
      (payload.staffInput && payload.staffInput.trim().length > 0) ||
      (payload.staffCategoryInput && payload.staffCategoryInput.trim().length > 0) ||
      (payload.banKemNv && payload.banKemNv.trim().length > 0)
    );

    if (!hasRealtimeDt && !hasLuykeDt && !hasRealtimeTd && !hasLuykeTd && !hasStaffData) {
      return history;
    }

    if (history.length > 0) {
      const last = history[0];
      if (
        last.payload.marketInput === payload.marketInput &&
        last.payload.categoryRevenueInput === payload.categoryRevenueInput &&
        last.payload.categoryInput === payload.categoryInput &&
        last.payload.categoryTargetInput === payload.categoryTargetInput &&
        last.payload.staffInput === payload.staffInput
      ) {
        return history;
      }
    }

    const newSnapshot: DataSnapshot = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dateKey,
      dateFormatted,
      timeFormatted,
      timestamp: Date.now(),
      activeStore: activeStore || '',
      payload,
      summary: {
        hasRealtimeDt,
        hasLuykeDt,
        hasRealtimeTd,
        hasLuykeTd,
        hasStaffData,
      }
    };

    const updated = [newSnapshot, ...history].slice(0, 50);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save history snapshot", e);
    return getHistorySnapshots();
  }
};

interface HistoryDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (snapshot: DataSnapshot) => void;
  showNotification?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const HistoryDataModal: React.FC<HistoryDataModalProps> = ({
  isOpen,
  onClose,
  onRestore,
  showNotification
}) => {
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>(() => getHistorySnapshots());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    if (showNotification) {
      showNotification('Đã xóa bản ghi lịch sử', 'info');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử dán dữ liệu?')) {
      setSnapshots([]);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      if (showNotification) {
        showNotification('Đã xóa toàn bộ lịch sử', 'info');
      }
    }
  };

  // Group snapshots by dateFormatted
  const groupedSnapshots = snapshots.reduce((acc, snapshot) => {
    const key = snapshot.dateFormatted;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(snapshot);
    return acc;
  }, {} as Record<string, DataSnapshot[]>);

  const todayStr = `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <History size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white uppercase">LỊCH SỬ CẬP NHẬT DỮ LIỆU</h2>
              <p className="text-xs text-slate-300 font-medium">Khôi phục lại toàn bộ dữ liệu đã dán từ các ngày trước đó</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {snapshots.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Xóa tất cả lịch sử"
              >
                <Trash2 size={13} />
                <span>Xóa tất cả</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {Object.keys(groupedSnapshots).length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <History size={32} />
              </div>
              <h3 className="text-base font-black text-slate-600 uppercase tracking-wide">CHƯA CÓ LỊCH SỬ DÁN DỮ LIỆU</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto font-medium">
                Mỗi khi bạn thực hiện dán dữ liệu mới ở trang Cập nhật dữ liệu, hệ thống sẽ tự động lưu lại bản chụp theo từng ngày để bạn khôi phục lại khi cần.
              </p>
            </div>
          ) : (
            Object.entries(groupedSnapshots).map(([dateStr, list]) => {
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className="space-y-3">
                  {/* Date Header */}
                  <div className="flex items-center gap-2 px-1">
                    <Calendar size={16} className={isToday ? "text-indigo-600" : "text-slate-400"} />
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                      Ngày {dateStr} {isToday && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold normal-case">Hôm nay</span>}
                    </h3>
                    <span className="text-xs font-semibold text-slate-400">({list.length} bản lưu)</span>
                    <div className="flex-1 h-px bg-slate-200 ml-2" />
                  </div>

                  {/* List of snapshots for this date */}
                  <div className="space-y-3">
                    {list.map((snapshot) => {
                      const isPreviewing = previewId === snapshot.id;
                      const isConfirming = confirmRestoreId === snapshot.id;

                      return (
                        <div 
                          key={snapshot.id}
                          className={cn(
                            "bg-white border rounded-2xl p-4 transition-all duration-200 hover:shadow-md space-y-3",
                            isConfirming ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10" : "border-slate-200 hover:border-indigo-200"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  <Clock size={12} className="text-slate-500" />
                                  {snapshot.timeFormatted}
                                </span>
                                {snapshot.activeStore && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                    <Store size={12} />
                                    {snapshot.activeStore}
                                  </span>
                                )}
                              </div>

                              {/* Included datasets badges */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {snapshot.summary.hasRealtimeDt && (
                                  <span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">REALTIME DT</span>
                                )}
                                {snapshot.summary.hasLuykeDt && (
                                  <span className="text-[11px] font-black px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">LUỸ KẾ DT</span>
                                )}
                                {snapshot.summary.hasRealtimeTd && (
                                  <span className="text-[11px] font-black px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">REALTIME TĐ</span>
                                )}
                                {snapshot.summary.hasLuykeTd && (
                                  <span className="text-[11px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">LUỸ KẾ TĐ</span>
                                )}
                                {snapshot.summary.hasStaffData && (
                                  <span className="text-[11px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">DỮ LIỆU NV</span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => setPreviewId(isPreviewing ? null : snapshot.id)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                title="Xem nội dung chi tiết"
                              >
                                {isPreviewing ? <EyeOff size={14} /> : <Eye size={14} />}
                                <span>{isPreviewing ? "Ẩn chi tiết" : "Xem nội dung"}</span>
                              </button>

                              {!isConfirming ? (
                                <button
                                  onClick={() => setConfirmRestoreId(snapshot.id)}
                                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <RotateCcw size={14} />
                                  <span>KHÔI PHỤC</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                  <button
                                    onClick={() => {
                                      onRestore(snapshot);
                                      setConfirmRestoreId(null);
                                      onClose();
                                    }}
                                    className="px-3 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>XÁC NHẬN</span>
                                  </button>
                                  <button
                                    onClick={() => setConfirmRestoreId(null)}
                                    className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-200 rounded-xl transition-all cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              )}

                              <button
                                onClick={(e) => handleDelete(snapshot.id, e)}
                                className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center cursor-pointer"
                                title="Xóa bản ghi này"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Preview content detail */}
                          {isPreviewing && (
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2 bg-slate-50/80 p-3 rounded-xl">
                              <h4 className="font-bold text-slate-600 uppercase text-[11px] tracking-wide flex items-center gap-1">
                                <FileText size={12} /> Dữ liệu đã lưu ngày {snapshot.dateFormatted} ({snapshot.timeFormatted}):
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 bg-white rounded border border-slate-200 space-y-1">
                                  <span className="font-bold text-emerald-700 block">REALTIME DT:</span>
                                  <p className="text-slate-600 line-clamp-3 font-mono text-[10px]">
                                    {snapshot.payload.marketInput || '(Không có)'}
                                  </p>
                                </div>
                                <div className="p-2 bg-white rounded border border-slate-200 space-y-1">
                                  <span className="font-bold text-teal-700 block">LUỸ KẾ DT:</span>
                                  <p className="text-slate-600 line-clamp-3 font-mono text-[10px]">
                                    {snapshot.payload.categoryRevenueInput || snapshot.payload.clusterSummaryInput || '(Không có)'}
                                  </p>
                                </div>
                                <div className="p-2 bg-white rounded border border-slate-200 space-y-1">
                                  <span className="font-bold text-orange-700 block">REALTIME TĐ:</span>
                                  <p className="text-slate-600 line-clamp-3 font-mono text-[10px]">
                                    {snapshot.payload.categoryInput || '(Không have)'}
                                  </p>
                                </div>
                                <div className="p-2 bg-white rounded border border-slate-200 space-y-1">
                                  <span className="font-bold text-indigo-700 block">LUỸ KẾ TĐ:</span>
                                  <p className="text-slate-600 line-clamp-3 font-mono text-[10px]">
                                    {snapshot.payload.categoryTargetInput || snapshot.payload.clusterCategoryInput || '(Không có)'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <AlertCircle size={14} className="text-amber-500" />
            <span>Khôi phục sẽ ghi đè toàn bộ các ô dán dữ liệu hiện tại bằng bản lưu được chọn.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            ĐÓNG
          </button>
        </div>

      </div>
    </div>
  );
};

export default HistoryDataModal;
