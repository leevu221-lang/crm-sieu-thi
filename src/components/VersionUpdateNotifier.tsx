import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function VersionUpdateNotifier() {
  const { userProfile } = useAuth();
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const initialVersionRef = useRef<string | null>(null);
  const pendingVersionRef = useRef<string | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Track user activity to prevent reloading while typing or interacting
    const updateActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });

    // Safe silent reload helper for regular users
    const attemptSilentReload = () => {
      if (!pendingVersionRef.current) return false;
      if (userProfile?.username === '43751') return false;

      // 1. If tab is hidden (user switched tabs or minimized window) -> 100% invisible reload
      if (document.visibilityState === 'hidden') {
        console.log('[VersionUpdateNotifier] Tab hidden. Performing 100% silent background reload to version:', pendingVersionRef.current);
        window.location.reload();
        return true;
      }

      // 2. If tab is visible, only reload if user has been idle for >= 30 seconds and no input is focused
      const isIdle = Date.now() - lastActivityTimeRef.current >= 30000;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');
      const isModalOpen = Boolean(document.querySelector('.z-\\[9999\\], .z-\\[99999\\], [role="dialog"], [aria-modal="true"]'));

      if (isIdle && !isTyping && !isModalOpen) {
        console.log('[VersionUpdateNotifier] User idle with no active input. Silently applying new version:', pendingVersionRef.current);
        window.location.reload();
        return true;
      }

      return false;
    };

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
            // User 43751: Keep prominent modal prompt as requested
            setHasNewVersion(true);
          } else {
            // Normal Users: Silently prepare background update
            pendingVersionRef.current = data.version;
            
            // Prefetch index HTML to prime browser cache
            fetch(`./?_cb=${data.version}`, { cache: 'no-cache' }).catch(() => {});

            // Attempt silent background reload if tab is hidden or user is idle
            attemptSilentReload();
          }
        }
      } catch (err) {
        console.warn('[VersionUpdateNotifier] Error checking version:', err);
      }
    };

    // Initial check on mount
    checkVersion();

    // Check version every 45 seconds
    const interval = setInterval(() => {
      checkVersion();
      if (pendingVersionRef.current) {
        attemptSilentReload();
      }
    }, 45000);

    // When tab visibility changes (e.g. user leaves tab or returns)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Perfect moment to reload without the user seeing any flicker!
        if (pendingVersionRef.current && userProfile?.username !== '43751') {
          console.log('[VersionUpdateNotifier] User switched away. Applying update silently.');
          window.location.reload();
        }
      } else if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
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
