import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UploadCloud, 
  FileText, 
  ClipboardList, 
  Calendar, 
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import PhanCaTable from '../components/PhanCaTable';
import PhanCaTuanTable from '../components/PhanCaTuanTable';
import BienBanTinhTrangHangHoa from '../components/BienBanTinhTrangHangHoa';
import BaoGiaCongTyModal from '../components/BaoGiaCongTyModal';
import InventoryManagement from '../components/InventoryManagement';
import { RoadshowManagement } from '../components/RoadshowManagement';

interface TienIchProps {
  pageMaintenanceState?: Record<string, boolean>;
  isUser43751Local?: boolean;
}

export default function TienIch({ pageMaintenanceState = {}, isUser43751Local = false }: TienIchProps) {
  const { userProfile } = useAuth();
  const { currentStoreId, activeTienIchTab: activeTab, setActiveTienIchTab: setActiveTab } = useStore();

  const [isBienBanModalOpen, setIsBienBanModalOpen] = useState(false);
  const [bienBanTitle, setBienBanTitle] = useState('BIÊN BẢN GHI NHẬN TÌNH TRẠNG HÀNG HÓA');
  const [isBaoGiaModalOpen, setIsBaoGiaModalOpen] = useState(false);

  const maKho = userProfile?.ma_kho || '';
  const isAdmin = userProfile?.username === '43751';

  const menuItems = [
    { id: 'phan-ca-thang', label: 'PHÂN CA THÁNG', icon: Users, color: 'text-purple-500' },
    { id: 'phan-ca-tuan', label: 'PHÂN CA TUẦN', icon: UploadCloud, color: 'text-orange-500' },
    { id: 'bien-ban', label: 'BIÊN BẢN CÁC LOẠI', icon: FileText, color: 'text-rose-500' },
    ...(isAdmin ? [{ id: 'kiem-ke', label: 'KIỂM KÊ', icon: ClipboardList, color: 'text-amber-500' }] : []),
    { id: 'roadshow', label: 'ROADSHOW', icon: Calendar, color: 'text-fuchsia-500' },
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
                Phân ca, biên bản, kiểm kê & roadshow siêu thị
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-6">
        {/* Navigation Tabs - Mobile Only */}
        <div className="flex md:hidden overflow-x-auto no-scrollbar gap-2 pb-2">
          {menuItems.map(item => {
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

        {/* Maintenance Guard */}
        {pageMaintenanceState[`tienich_${activeTab}`] && !isUser43751Local ? (
          <div className="flex items-center justify-center p-6 mt-12">
            <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
              <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                <AlertCircle size={48} />
              </div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">HỆ THỐNG ĐANG BẢO TRÌ</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                Tab này đang trong quá trình bảo trì và nâng cấp. Xin lỗi vì sự bất tiện này!
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'phan-ca-thang' && (
              <motion.div
                key="phan-ca-thang"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <PhanCaTable />
              </motion.div>
            )}

            {activeTab === 'phan-ca-tuan' && (
              <motion.div
                key="phan-ca-tuan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <PhanCaTuanTable />
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

            {activeTab === 'roadshow' && (
              <motion.div
                key="roadshow"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <RoadshowManagement warehouseCode={maKho || currentStoreId || '43751'} />
              </motion.div>
            )}

            {activeTab === 'bien-ban' && (
              <motion.div
                key="bien-ban"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]"
              >
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText size={24} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">BIÊN BẢN CÁC LOẠI</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <button
                    onClick={() => {
                      setBienBanTitle('BIÊN BẢN GHI NHẬN TÌNH TRẠNG HÀNG HÓA');
                      setIsBienBanModalOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-6 bg-white border-2 border-indigo-100 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50 rounded-2xl transition-all cursor-pointer group text-left"
                  >
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 text-center uppercase">Biên bản Tình Trạng Hàng Hóa</h3>
                    <p className="text-slate-500 text-sm text-center mt-2">Dùng khi ghi nhận tình trạng hàng hóa, in A4 ngang</p>
                  </button>
                  
                  <button
                    onClick={() => setIsBaoGiaModalOpen(true)}
                    className="flex flex-col items-center justify-center p-6 bg-white border-2 border-emerald-100 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50 rounded-2xl transition-all cursor-pointer group text-left"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 text-center uppercase">Báo Giá Công Ty</h3>
                    <p className="text-slate-500 text-sm text-center mt-2">Dùng khi tạo báo giá, in A4 dọc</p>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <BienBanTinhTrangHangHoa 
        isOpen={isBienBanModalOpen}
        onClose={() => setIsBienBanModalOpen(false)}
        title={bienBanTitle}
      />

      <BaoGiaCongTyModal 
        isOpen={isBaoGiaModalOpen}
        onClose={() => setIsBaoGiaModalOpen(false)}
      />
    </div>
  );
}
