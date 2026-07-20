import React from 'react';
import { X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImagePreviewModalProps {
  previewImage: string | null;
  setPreviewImage: (val: string | null) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ previewImage, setPreviewImage }) => {
  return (
    <AnimatePresence>
      {previewImage && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
          onClick={() => setPreviewImage(null)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-rose-50 border-b-2 border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500 text-white rounded-xl animate-pulse">
                  <Copy size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-rose-700 uppercase tracking-wide leading-tight">
                    Mẹo: Nhấn giữ (trên điện thoại) hoặc nhấp chuột phải
                  </h3>
                  <p className="text-[15px] font-bold text-rose-600/80">
                    Chọn "Sao chép hình ảnh" để dán vào nhóm Zalo / Line
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-rose-100 text-rose-400 hover:text-rose-600 rounded-full transition-all border border-rose-200 shadow-sm ml-4 shrink-0"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-4 bg-slate-100 flex items-center justify-center min-h-[50vh] overflow-hidden">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-w-full max-h-[calc(90vh-120px)] object-contain shadow-md rounded-xl border border-slate-200" 
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
