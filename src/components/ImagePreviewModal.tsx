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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const getExportFileName = () => {
    if (typeof window !== 'undefined' && (window as any).__lastExportFileName) {
      return String((window as any).__lastExportFileName);
    }
    return `BaoCao_${new Date().getTime()}.png`;
  };

  useEffect(() => {
    if (!previewImage) {
      setCopySuccess(null);
      setIsManualCopied(false);
      setShowToast(false);
      setCanShare(false);
      setBlobUrl(null);
      return;
    }

    let isMounted = true;
    let createdObjectUrl: string | null = null;

    try {
      const blob = dataURLtoBlob(previewImage);
      createdObjectUrl = URL.createObjectURL(blob);
      setBlobUrl(createdObjectUrl);

      // Check if Web Share API with files is supported (iOS & Android)
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        const file = new File([blob], getExportFileName(), { type: 'image/png' });
        setCanShare(navigator.canShare({ files: [file] }));
      }
    } catch {
      setCanShare(false);
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
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
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
      const file = new File([blob], getExportFileName(), { type: 'image/png' });
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
      const fileName = getExportFileName();
      if (blobUrl) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const blob = dataURLtoBlob(previewImage);
        const tempUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = tempUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(tempUrl), 5000);
      }
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
          {/* Header Bar: Clean single-row layout */}
          <div className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b flex items-center justify-between shrink-0 z-10 transition-colors duration-300 ${
            copySuccess 
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-white rounded-xl shadow-2xs shrink-0 transition-colors ${
                copySuccess ? 'bg-emerald-600' : 'bg-slate-800'
              }`}>
                {copySuccess ? <Check size={16} strokeWidth={2.5} /> : <Copy size={15} strokeWidth={2.5} />}
              </div>
              <div className="min-w-0">
                <h3 className={`text-[12px] sm:text-sm font-black uppercase tracking-tight truncate ${
                  copySuccess ? 'text-emerald-900' : 'text-slate-900'
                }`}>
                  {copySuccess 
                    ? 'ĐÃ TỰ ĐỘNG COPY ẢNH VÀO CLIPBOARD' 
                    : 'XEM TRƯỚC ẢNH BÁO CÁO'}
                </h3>
                <p className="text-[10.5px] sm:text-[11px] font-medium text-slate-500 truncate hidden sm:block">
                  {copySuccess 
                    ? 'Bạn có thể dán (Paste / Ctrl+V) ngay vào Zalo, Viber hoặc tin nhắn' 
                    : 'Chạm giữ 1-2 giây trên ảnh để chọn Sao chép hoặc dùng nút bên dưới'}
                </p>
              </div>
            </div>

            {/* Desktop Header Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
              {/* Native Mobile Share Button (when supported) */}
              {canShare && (
                <button
                  onClick={handleShare}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Gửi hoặc chia sẻ trực tiếp qua Zalo / Tin nhắn"
                >
                  <Share2 size={13} />
                  <span>GỬI ZALO</span>
                </button>
              )}

              {/* Manual Copy Button */}
              <button
                onClick={handleManualCopy}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all border shadow-xs active:scale-95 cursor-pointer ${
                  isManualCopied || copySuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                }`}
                title="Sao chép lại ảnh vào Clipboard"
              >
                {isManualCopied || copySuccess ? (
                  <>
                    <Check size={13} className="text-white" />
                    <span>ĐÃ COPY!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>SAO CHÉP</span>
                  </>
                )}
              </button>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all border border-slate-300 shadow-2xs active:scale-95 cursor-pointer"
                title="Tải ảnh về máy"
              >
                <Download size={13} />
                <span>TẢI VỀ</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-full transition-all border border-slate-300/80 shadow-2xs cursor-pointer active:scale-95"
                title="Đóng"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          
          {/* Image Body: Scrollable true-ratio preview without distortion */}
          <div className="flex-1 min-h-0 w-full p-2 sm:p-4 bg-slate-100/90 overflow-y-auto overflow-x-hidden custom-scrollbar touch-pan-y relative flex flex-col items-center justify-start">
            <div className="my-auto py-1 max-w-full flex justify-center">
              <img 
                src={blobUrl || previewImage} 
                alt="Báo cáo" 
                style={{ 
                  userSelect: 'auto', 
                  WebkitTouchCallout: 'default' as any,
                  pointerEvents: 'auto',
                }}
                className="max-w-full h-auto w-auto object-contain block mx-auto shadow-md rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white select-all cursor-pointer" 
              />
            </div>

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

          {/* Mobile Bottom Action Bar — Standardized buttons, uniform height, high-contrast colors */}
          <div className="sm:hidden px-3 py-2.5 bg-white border-t border-slate-200/90 flex items-center justify-between gap-2 shrink-0 z-10 pb-safe">
            {canShare ? (
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1.5 h-11 px-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 active:scale-95 text-white rounded-xl font-black text-xs shadow-md shadow-blue-500/20 border border-blue-500/30 cursor-pointer"
                title="Gửi trực tiếp qua Zalo"
              >
                <Share2 size={15} />
                <span>GỬI QUA ZALO</span>
              </button>
            ) : null}

            <button
              onClick={handleManualCopy}
              className={`flex-1 flex items-center justify-center gap-1.5 h-11 px-2.5 active:scale-95 text-white rounded-xl font-black text-xs shadow-xs transition-all cursor-pointer ${
                isManualCopied || copySuccess
                  ? 'bg-emerald-600 border border-emerald-600'
                  : 'bg-slate-900 hover:bg-slate-800 border border-slate-900'
              }`}
              title="Sao chép ảnh vào bộ nhớ tạm"
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
              className={`flex items-center justify-center gap-1.5 h-11 px-3 bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 font-bold text-xs shrink-0 cursor-pointer ${
                !canShare ? 'flex-1' : ''
              }`}
              title="Tải ảnh về máy"
            >
              <Download size={15} />
              <span className="hidden xs:inline">TẢI ẢNH</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
