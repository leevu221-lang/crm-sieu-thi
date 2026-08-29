import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Download, Sparkles, Share2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { copyImageToClipboard, dataURLtoBlob } from '../utils/clipboardUtil';

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
  const [copySuccess, setCopySuccess] = useState<boolean | null>(null);
  const [isManualCopied, setIsManualCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (!previewImage) {
      setCopySuccess(null);
      setIsManualCopied(false);
      setShowToast(false);
      setCanShare(false);
      return;
    }

    let isMounted = true;

    // Check if Web Share API with files is supported (iOS & Android)
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const blob = dataURLtoBlob(previewImage);
        const file = new File([blob], 'baocao.png', { type: 'image/png' });
        setCanShare(navigator.canShare({ files: [file] }));
      } catch {
        setCanShare(false);
      }
    }

    // Auto-copy image to clipboard immediately upon preview
    const performAutoCopy = async () => {
      const success = await copyImageToClipboard(previewImage);
      if (isMounted) {
        setCopySuccess(success);
        setShowToast(true);
        const timer = setTimeout(() => {
          if (isMounted) setShowToast(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    performAutoCopy();

    return () => {
      isMounted = false;
    };
  }, [previewImage]);

  if (!previewImage || typeof document === 'undefined') return null;

  const handleManualCopy = async () => {
    const success = await copyImageToClipboard(previewImage);
    if (success) {
      setIsManualCopied(true);
      setCopySuccess(true);
      setShowToast(true);
      setTimeout(() => {
        setIsManualCopied(false);
      }, 2500);
    }
  };

  const handleShare = async () => {
    try {
      const blob = dataURLtoBlob(previewImage);
      const file = new File([blob], `BaoCao_${new Date().getTime()}.png`, { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Báo cáo siêu thị',
          text: 'Báo cáo siêu thị xuất từ hệ thống CRM',
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed, fallback to copy:', err);
        handleManualCopy();
      }
    }
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.download = `BaoCao_${new Date().getTime()}.png`;
      link.href = previewImage;
      link.click();
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden pt-safe pb-safe" 
        onClick={() => setPreviewImage(null)}
      >
        <motion.div 
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-[96vw] sm:max-w-xl md:max-w-3xl lg:max-w-5xl h-auto max-h-[92dvh] sm:max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden shrink-0" 
          onClick={e => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b flex items-center justify-between shrink-0 z-10 transition-colors duration-300 ${
            copySuccess 
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 text-white rounded-lg shadow-xs shrink-0 transition-colors ${
                copySuccess ? 'bg-emerald-600' : 'bg-blue-600'
              }`}>
                {copySuccess ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} strokeWidth={2.5} />}
              </div>
              <div className="min-w-0">
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-tight truncate ${
                  copySuccess ? 'text-emerald-900' : 'text-blue-900'
                }`}>
                  {copySuccess 
                    ? '✅ ĐÃ TỰ ĐỘNG COPY ẢNH VÀO CLIPBOARD' 
                    : 'CHẠM GIỮ ẢNH ĐỂ SAO CHÉP (COPY)'}
                </h3>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate hidden sm:block">
                  {copySuccess 
                    ? 'Bạn có thể dán (Paste / Ctrl+V) ngay vào Zalo, Viber hoặc tin nhắn' 
                    : 'Trên điện thoại chạm giữ 1-2 giây để chọn Sao chép / Chia sẻ'}
                </p>
              </div>
            </div>

            {/* Desktop Header Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
              {/* Native Mobile Share Button (when supported) */}
              {canShare && (
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Gửi hoặc chia sẻ trực tiếp qua Zalo / Tin nhắn"
                >
                  <Share2 size={13} />
                  <span className="hidden xs:inline">GỬI ZALO</span>
                </button>
              )}

              {/* Manual Copy Button */}
              <button
                onClick={handleManualCopy}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs transition-all border shadow-xs active:scale-95 cursor-pointer ${
                  isManualCopied || copySuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Sao chép lại ảnh vào Clipboard"
              >
                {isManualCopied ? (
                  <>
                    <Check size={13} className="text-white" />
                    <span className="hidden xs:inline">ĐÃ COPY!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span className="hidden xs:inline">SAO CHÉP</span>
                  </>
                )}
              </button>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all border border-slate-300 shadow-xs active:scale-95 cursor-pointer"
                title="Tải ảnh về máy"
              >
                <Download size={13} />
                <span>TẢI VỀ</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-full transition-all border border-slate-300 shadow-2xs cursor-pointer active:scale-95"
                title="Đóng"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          
          {/* Image Body: Automatically fit image inside popup container */}
          <div className="flex-1 min-h-0 w-full p-2 sm:p-3.5 bg-slate-100/90 flex items-center justify-center overflow-auto custom-scrollbar touch-pan-x touch-pan-y relative">
            <img 
              src={previewImage} 
              alt="Báo cáo" 
              style={{ 
                userSelect: 'auto', 
                WebkitTouchCallout: 'default' as any,
                pointerEvents: 'auto'
              }}
              className="max-w-full max-h-full w-auto h-auto object-contain block mx-auto shadow-md rounded-xl border border-slate-300/90 select-all cursor-pointer" 
            />

            {/* Floating Toast Notification on Copy */}
            <AnimatePresence>
              {showToast && copySuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="absolute bottom-16 sm:bottom-4 z-20 pointer-events-none"
                >
                  <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-emerald-900/95 backdrop-blur-md text-white rounded-full shadow-xl border border-emerald-500/40 text-xs sm:text-sm font-bold">
                    <Sparkles size={15} className="text-amber-300 animate-pulse shrink-0" />
                    <span>Đã sao chép ảnh vào Clipboard!</span>
                    <Check size={15} className="text-emerald-400 shrink-0" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Bottom Quick Action Bar — Always accessible on phone screen */}
          <div className="sm:hidden p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0 z-10">
            {canShare ? (
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-98 text-white rounded-xl font-black text-xs shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Share2 size={15} />
                <span>GỬI QUA ZALO</span>
              </button>
            ) : null}

            <button
              onClick={handleManualCopy}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-xs transition-all shadow-xs active:scale-98 cursor-pointer ${
                isManualCopied || copySuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-white'
              }`}
            >
              {isManualCopied || copySuccess ? (
                <>
                  <Check size={15} className="text-white" />
                  <span>ĐÃ COPY ẢNH!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>SAO CHÉP ẢNH</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center justify-center p-2.5 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 shrink-0 cursor-pointer"
              title="Lưu ảnh về máy"
            >
              <Download size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
