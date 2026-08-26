import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, MessageSquare, Share2, Smartphone, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Robust, synchronous base64 DataURL to PNG Blob converter
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: 'image/png' });
}

interface ImagePreviewModalProps {
  previewImage: string | null;
  setPreviewImage: (val: string | null) => void;
  onTagBoss?: () => void;
  isAutoCopied?: boolean;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
  previewImage, 
  setPreviewImage
}) => {
  if (!previewImage || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-2.5 sm:p-4 overflow-hidden pt-safe pb-safe" 
        onClick={() => setPreviewImage(null)}
      >
          <motion.div 
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-[94vw] sm:max-w-xl md:max-w-3xl lg:max-w-5xl h-auto max-h-[90dvh] sm:max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden shrink-0" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header Tip: Touch-hold instruction */}
            <div className="px-3 sm:px-4 py-2.5 border-b flex items-center justify-between shrink-0 z-10 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 text-white rounded-lg shadow-xs shrink-0 bg-blue-600">
                  <Copy size={15} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-blue-900 uppercase tracking-tight truncate">
                    CHẠM GIỮ ẢNH ĐỂ SAO CHÉP (COPY)
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={() => setPreviewImage(null)}
                  className="w-7 h-7 flex items-center justify-center bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-full transition-all border border-slate-300 shadow-2xs cursor-pointer active:scale-95"
                  title="Đóng"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            
            {/* Image Body: Automatically fit image inside popup container for easy overview and touch-hold copy */}
            <div className="flex-1 min-h-0 w-full p-2 sm:p-3.5 bg-slate-100/90 flex items-center justify-center overflow-auto custom-scrollbar touch-pan-x touch-pan-y">
              <img 
                src={previewImage} 
                alt="Báo cáo" 
                style={{ userSelect: 'auto', WebkitTouchCallout: 'default' as any }}
                className="max-w-full max-h-full w-auto h-auto object-contain block mx-auto shadow-md rounded-xl border border-slate-300/90 select-all cursor-pointer" 
              />
            </div>
          </motion.div>
        </motion.div>
    </AnimatePresence>,
    document.body
  );
};

