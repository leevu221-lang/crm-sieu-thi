import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Sparkles, Camera } from 'lucide-react';

interface CaptureLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: { current: number; total: number; percent: number } | null;
}

export const CaptureLoadingOverlay: React.FC<CaptureLoadingOverlayProps> = ({
  isLoading,
  message = 'ĐANG TẠO ẢNH CHẤT LƯỢNG CAO...',
  progress = null,
}) => {
  if (!isLoading || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999999] bg-slate-900/65 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto transition-all animate-in fade-in duration-150 px-4">
      {progress ? (
        // Premium Batch Export Progress Card
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white animate-pulse">
              <Camera size={28} className="text-white" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 flex items-center justify-center">
              <Loader2 size={13} className="text-white animate-spin" />
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1">
            ĐANG XUẤT TRỌN BỘ ẢNH NV
          </h3>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-full font-bold text-xs sm:text-sm my-2 border border-indigo-200/60 dark:border-indigo-800/60">
            <span>Tiến độ:</span>
            <span className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
              {progress.current} / {progress.total}
            </span>
            <span className="text-slate-400">|</span>
            <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {progress.percent}%
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-3.5 rounded-full overflow-hidden my-3 shadow-inner border border-slate-200/80 dark:border-slate-600">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-emerald-500 transition-all duration-300 rounded-full relative"
              style={{ width: `${Math.max(4, progress.percent)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[pulse_1.5s_infinite]" />
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-amber-500 shrink-0" />
            <span>
              {progress.percent >= 100 
                ? 'Đang nén file ZIP và bắt đầu tải về...' 
                : 'Đang kết xuất & tối ưu hình ảnh siêu tốc (chống treo máy)...'}
            </span>
          </p>
        </div>
      ) : (
        // Standard Single Capture Spinner
        <div className="bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 shadow-2xl rounded-3xl p-6 sm:p-7 max-w-sm w-full flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-150">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
          <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-center">
            {message}
          </p>
        </div>
      )}
    </div>,
    document.body
  );
};
