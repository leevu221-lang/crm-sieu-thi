import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import BbkqTab from '../components/BbkqTab';

interface BbkqPageProps {
  pageMaintenanceState?: Record<string, boolean>;
  isUser43751Local?: boolean;
}

export default function BbkqPage({
  pageMaintenanceState = {},
  isUser43751Local = false,
}: BbkqPageProps) {
  if (pageMaintenanceState['bbkq'] && !isUser43751Local) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
          <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
            <AlertCircle size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">
            HỆ THỐNG ĐANG BẢO TRÌ
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Trang BBKQ (Kiểm Quỹ) đang trong quá trình bảo trì và nâng cấp. Xin lỗi vì sự bất tiện này!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-16">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          <BbkqTab />
        </motion.div>
      </div>
    </div>
  );
}
