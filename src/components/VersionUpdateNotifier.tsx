import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function VersionUpdateNotifier() {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const initialVersionRef = useRef<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`./version.json?cb=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.version) return;

        if (!initialVersionRef.current) {
          initialVersionRef.current = data.version;
          console.log('[VersionUpdateNotifier] Initial app version:', data.version, 'Commit:', data.commit);
        } else if (initialVersionRef.current !== data.version) {
          console.log('[VersionUpdateNotifier] New version detected! Latest:', data.version, 'Local:', initialVersionRef.current);
          setHasNewVersion(true);
        }
      } catch (err) {
        console.warn('[VersionUpdateNotifier] Error checking version:', err);
      }
    };

    // Initial check on mount
    checkVersion();

    // Set up polling every 60 seconds
    const interval = setInterval(checkVersion, 60000);

    // Check version immediately when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleReload = () => {
    // Force reload bypassing the cache
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {hasNewVersion && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed top-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-[9999] print:hidden"
        >
          {/* Glassmorphic card design with sleek gradients */}
          <div className="relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-4 text-white">
            {/* Ambient background glow */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 leading-none mb-1">Cập nhật hệ thống</span>
                  <h3 className="text-[13px] font-black text-slate-100 uppercase tracking-wide">Đã có phiên bản mới!</h3>
                </div>
              </div>
              <button
                onClick={() => setIsDismissed(true)}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all shrink-0 cursor-pointer"
                title="Đóng thông báo"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed pl-1 font-medium">
              Ứng dụng đã được cập nhật tính năng mới trên hệ thống. Vui lòng làm mới trang để áp dụng các cải tiến mới nhất.
            </p>

            <div className="flex items-center gap-2 pl-1 relative z-10">
              <button
                onClick={handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-[11px] uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] group cursor-pointer"
              >
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700 ease-out" />
                Tải lại trang ngay
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
