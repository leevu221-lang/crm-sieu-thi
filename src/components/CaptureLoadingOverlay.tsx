import React from 'react';
import { createPortal } from 'react-dom';

interface CaptureLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export const CaptureLoadingOverlay: React.FC<CaptureLoadingOverlayProps> = ({
  isLoading,
  message = 'ĐANG TẠO ẢNH CHẤT LƯỢNG CAO...'
}) => {
  if (!isLoading || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999999] bg-white/70 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto transition-all animate-in fade-in duration-200">
      <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
      <p className="text-base sm:text-lg font-black text-emerald-600 uppercase tracking-widest animate-pulse font-sans text-center px-4">
        {message}
      </p>
    </div>,
    document.body
  );
};
