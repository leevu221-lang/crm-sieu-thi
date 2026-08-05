import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function VersionUpdateNotifier() {
  const { userProfile } = useAuth();
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
          if (userProfile?.username === '43751') {
            setHasNewVersion(true);
          } else {
            // Silently reload in the background for normal users to apply updates immediately
            window.location.reload();
          }
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
  }, [userProfile?.username]);

  const handleReload = () => {
    // Force reload bypassing the cache
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {hasNewVersion && userProfile?.username === '43751' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Lớp phủ mờ chặn tương tác toàn bộ trang */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />
          
          {/* Hộp thoại thông báo căn giữa */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="relative w-full max-w-[440px] z-10 print:hidden"
          >
            {/* Thiết kế Glassmorphism tối sang trọng */}
            <div className="relative overflow-hidden bg-slate-900/95 border border-slate-700/50 rounded-[32px] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.8)] flex flex-col gap-6 text-white text-center items-center">
              {/* Vùng phát sáng background mượt mà */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-pink-500/30 rounded-full blur-3xl pointer-events-none" />
 
              <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 shrink-0 mb-2">
                <Sparkles size={32} className="animate-pulse" />
              </div>
 
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 leading-none">Cập nhật hệ thống</span>
                <h3 className="text-xl font-black text-slate-100 uppercase tracking-wide">Đã có phiên bản mới!</h3>
              </div>
 
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Ứng dụng đã được cập nhật tính năng mới trên hệ thống. Vui lòng làm mới trang để áp dụng các cải tiến mới nhất.
              </p>
 
              <button
                onClick={handleReload}
                className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-600/40 transition-all active:scale-[0.97] group cursor-pointer"
              >
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700 ease-out" />
                Tải lại trang ngay
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
