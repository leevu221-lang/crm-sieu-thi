import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  AlertCircle,
  Sparkles,
  MessageSquare,
  QrCode,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import InventoryManagement from '../components/InventoryManagement';
import { TuongTacLineTab } from './TienIch/components/TuongTacLineTab';
import InQrSpTab from './TienIch/components/InQrSpTab';

interface TienIchProps {
  pageMaintenanceState?: Record<string, boolean>;
  isUser43751Local?: boolean;
  pageHiddenState?: Record<string, boolean>;
}

const ALLOWED_TIENICH_TABS = ['tuong-tac-line', 'in-qr-sp', 'kiem-ke'];

export default function TienIch({ pageMaintenanceState = {}, isUser43751Local = false, pageHiddenState = {} }: TienIchProps) {
  const { userProfile } = useAuth();
  const { activeTienIchTab: rawActiveTab, setActiveTienIchTab: setActiveTab } = useStore();
  const activeTab = ALLOWED_TIENICH_TABS.includes(rawActiveTab) ? rawActiveTab : 'tuong-tac-line';

  useEffect(() => {
    if (!ALLOWED_TIENICH_TABS.includes(rawActiveTab)) {
      setActiveTab('tuong-tac-line');
    }
  }, [rawActiveTab, setActiveTab]);

  const maKho = userProfile?.ma_kho || '';
  const isUser43751 = userProfile?.username === '43751' || isUser43751Local;
  const isAdmin = isUser43751;

  const menuItems = [
    { id: 'tuong-tac-line', label: 'TƯƠNG TÁC LINE', icon: MessageSquare, color: 'text-emerald-500' },
    { id: 'in-qr-sp', label: 'IN QR SP', icon: QrCode, color: 'text-sky-500' },
    ...(isAdmin ? [{ id: 'kiem-ke', label: 'KIỂM KÊ', icon: ClipboardList, color: 'text-amber-500' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-utm-avo">
      {/* Top Header Section - Mobile only (desktop uses sidebar) */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-xs md:hidden">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                TIỆN ÍCH QUẢN LÝ
                <span className="text-[10px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase">
                  V2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-bold">
                Tương tác LINE, In QR SP & Kiểm kê siêu thị
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-6">
        {/* Navigation Tabs - Mobile Only */}
        <div className="flex md:hidden overflow-x-auto no-scrollbar gap-2 pb-2">
          {menuItems
            .filter(item => isUser43751 || !pageHiddenState[`tienich_${item.id}`])
            .map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : item.color} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Maintenance & Hidden Guard */}
        {((pageMaintenanceState[`tienich_${activeTab}`] && !isUser43751Local) || (!isUser43751 && pageHiddenState[`tienich_${activeTab}`])) ? (
          <div className="flex items-center justify-center p-6 mt-12">
            <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
              <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                {pageHiddenState[`tienich_${activeTab}`] ? <EyeOff size={48} className="text-purple-500" /> : <AlertCircle size={48} />}
              </div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">
                {pageHiddenState[`tienich_${activeTab}`] ? 'TAB ĐANG TẠM ẨN' : 'HỆ THỐNG ĐANG BẢO TRÌ'}
              </h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                {pageHiddenState[`tienich_${activeTab}`] 
                  ? 'Nội dung tab này đang được tạm ẩn. Vui lòng quay lại sau!' 
                  : 'Tab này đang trong quá trình bảo trì và nâng cấp. Xin lỗi vì sự bất tiện này!'}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {activeTab === 'tuong-tac-line' && (
              <motion.div
                key="tuong-tac-line"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TuongTacLineTab />
              </motion.div>
            )}

            {activeTab === 'in-qr-sp' && (
              <motion.div
                key="in-qr-sp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <InQrSpTab />
              </motion.div>
            )}

            {activeTab === 'kiem-ke' && (
              <motion.div
                key="kiem-ke"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]"
              >
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <ClipboardList size={24} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Kế Hoạch & Phân Công Kiểm Kê</h2>
                </div>
                
                <InventoryManagement warehouseCode={maKho || '43751'} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
