import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useTransition } from 'react';
import { supabase } from '../supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  LayoutGrid,
  Users,
  TrendingUp,
  Target,
  ShoppingBag,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Zap,
  RefreshCw,
  Sparkles,
  Trophy,
  ArrowRight,
  Activity,
  Star,
  Check,
  Crown,
  Flame,
  CreditCard,
  Camera,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useMarket } from '../contexts/MarketContext';
import { useRealtimeData } from './RTST/hooks/useRealtimeData';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { domToPng } from 'modern-screenshot';
import { isValidStoreName } from './RTST/utils';

const TabButton = ({ active, onClick, icon: Icon, label, count }: { active: boolean, onClick: () => void, icon: any, label: string, count?: number }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${active
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
      }`}
  >
    <Icon size={14} className={active ? 'text-white' : 'text-slate-400'} />
    <span>{label}</span>
    {count !== undefined && (
      <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    )}
  </button>
);

const StatCard = ({ title, value, subValue, icon: Icon, color, trend, delay = 0, isLarge = false, isColored = false }: any) => {
  const colorMap: any = {
    indigo: 'text-indigo-600 bg-indigo-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    rose: 'text-rose-600 bg-rose-50',
    slate: 'text-slate-600 bg-slate-50',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  const bgMap: any = {
    indigo: 'bg-indigo-600 text-white border-indigo-500',
    emerald: 'bg-emerald-600 text-white border-emerald-500',
    amber: 'bg-amber-500 text-white border-amber-400',
    rose: 'bg-rose-600 text-white border-rose-500',
    slate: 'bg-slate-600 text-white border-slate-500',
    blue: 'bg-blue-600 text-white border-blue-500',
    orange: 'bg-orange-500 text-white border-orange-400'
  };

  if (isColored) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className={`${bgMap[color] || 'bg-white'} p-5 rounded-2xl border-2 border-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm">
            <Icon size={18} strokeWidth={2.5} />
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold bg-white/20 backdrop-blur-sm">
              {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1">{title}</h3>
          <div className="font-bold text-4xl tracking-tight font-oswald">
            {value}
          </div>
          {subValue && (
            <div className="mt-2 text-[11px] font-medium text-white/60">
              {subValue}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between ${isLarge ? 'md:col-span-2' : ''}`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || 'bg-slate-50 text-slate-600'}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
        <div className={`font-bold text-slate-900 tracking-tight font-oswald ${isLarge ? 'text-5xl' : 'text-4xl'}`}>
          {value}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-medium text-slate-500">
          <span className="opacity-60">{subValue}</span>
        </div>
      </div>
    </motion.div>
  );
};

const StaffMultiSelectFilter = ({
  staffNames,
  selectedStaffs,
  setSelectedStaffs
}: {
  staffNames: string[],
  selectedStaffs: string[],
  setSelectedStaffs: (names: string[]) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNames = useMemo(() => {
    return staffNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [staffNames, searchTerm]);

  const handleToggleAll = () => {
    if (selectedStaffs.length === staffNames.length) {
      setSelectedStaffs([]);
    } else {
      setSelectedStaffs([...staffNames]);
    }
  };

  const handleToggleStaff = (name: string) => {
    if (selectedStaffs.includes(name)) {
      setSelectedStaffs(selectedStaffs.filter(s => s !== name));
    } else {
      setSelectedStaffs([...selectedStaffs, name]);
    }
  };

  return (
    <div className="relative" ref={filterRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Filter size={14} className="text-slate-400" />
        <span>{selectedStaffs.length === 0 ? "TẤT CẢ NV" : `ĐÃ CHỌN (${selectedStaffs.length})`}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-4"
          >
            <div className="mb-4">
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-3 px-2 py-2 mb-2 border-b border-slate-50 group cursor-pointer" onClick={handleToggleAll}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedStaffs.length === staffNames.length
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-white border-slate-300'
                }`}>
                {selectedStaffs.length === staffNames.length && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[13px] font-bold text-indigo-600">Chọn tất cả</span>
            </div>

            <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {filteredNames.length > 0 ? (
                filteredNames.map(name => (
                  <div
                    key={name}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStaff(name);
                    }}
                    className="flex items-center gap-3 px-2 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedStaffs.includes(name)
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white border-slate-300 group-hover:border-indigo-400'
                      }`}>
                      {selectedStaffs.includes(name) && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[13px] text-slate-700 font-medium">{name}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[12px] text-slate-400">Không tìm thấy kết quả</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NHOM_HANG_MAP: Record<string, { large: string, small: string }> = {
  "4479 - Dịch Vụ Bảo Hiểm": { large: "BẢO HIỂM", small: "B.HIỂM" },
  "4499 - Thu Hộ Phí Bảo Hiểm": { large: "BẢO HIỂM", small: "B.HIỂM" },
  "1098 - Máy lạnh (IMEI)": { large: "CE", small: "ML" },
  "911 - Máy nước nóng": { large: "CE", small: "MNN" },
  "1097 - Tủ lạnh (IMEI)": { large: "CE", small: "TL" },
  "893 - Tủ đông": { large: "CE", small: "TL" },
  "894 - Tủ mát": { large: "CE", small: "TL" },
  "1099 - Máy giặt (IMEI)": { large: "CE", small: "MG" },
  "3659 - Máy sấy lồng ngang": { large: "CE", small: "MG" },
  "3859 - Máy rửa chén": { large: "CE", small: "MG" },
  "880 - Loa Karaoke": { large: "CE", small: "AUDIO" },
  "1094 - Tivi LED (IMEI)": { large: "CE", small: "TIVI" },
  "3241 - Dao/Kéo/Thớt": { large: "DCNB", small: "" },
  "3263 - Chảo": { large: "DCNB", small: "" },
  "3187 - Bình/Ly/Ca giữ nhiệt": { large: "DCNB", small: "" },
  "3185 - Vệ sinh nhà cửa": { large: "DCNB", small: "" },
  "3265 - Nồi": { large: "DCNB", small: "" },
  "2999 - Dụng cụ nhà bếp khác": { large: "DCNB", small: "" },
  "3240 - Hộp/Hũ": { large: "DCNB", small: "" },
  "4302 - Nón bảo hiểm các loại": { large: "DCNB", small: "" },
  "4171 - Lọc nước dạng tủ đứng": { large: "ĐIỆN GD", small: "MLN" },
  "4150 - Máy nước nóng lạnh": { large: "ĐIỆN GD", small: "MLN" },
  "4172 - Lọc nước âm tủ/trên bàn": { large: "ĐIỆN GD", small: "MLN" },
  "4144 - Bếp gas âm": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "3779 - Bếp điện âm": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4148 - Bếp điện đôi": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4339 - Ổn Áp": { large: "ĐIỆN GD", small: "" },
  "4459 - Quạt Trần": { large: "ĐIỆN GD", small: "QUẠT" },
  "955 - Hút mùi/ hút khói": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4146 - Bếp gas đôi": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "956 - Hút bụi": { large: "ĐIỆN GD", small: "HÚT BỤI" },
  "4155 - Hút bụi cây": { large: "ĐIỆN GD", small: "HÚT BỤI" },
  "4439 - Hút Bụi Robot": { large: "ĐIỆN GD", small: "HÚT BỤI" },
  "3639 - Máy lọc không khí": { large: "ĐIỆN GD", small: "HÚT BỤI" },
  "6000 - Máy ép trái cây": { large: "ĐIỆN GD", small: "XAY ÉP/S.TỐ" },
  "4099 - Nồi chiên": { large: "ĐIỆN GD", small: "N.CHIÊN" },
  "4156 - Nồi cơm nắp gài/nắp rời": { large: "ĐIỆN GD", small: "NC NẮP RỜI" },
  "4158 - Nồi cơm điện tử": { large: "ĐIỆN GD", small: "NC Đ.TỬ" },
  "4157 - Nồi cơm cao tần": { large: "ĐIỆN GD", small: "NC Đ.TỬ" },
  "4660 - Quạt lửng": { large: "ĐIỆN GD", small: "QUẠT" },
  "4160 - Quạt bàn/hộp/sạc": { large: "ĐIỆN GD", small: "QUẠT" },
  "4159 - Quạt đứng": { large: "ĐIỆN GD", small: "QUẠT" },
  "4161 - Quạt treo": { large: "ĐIỆN GD", small: "QUẠT" },
  "3799 - Quạt điều hòa": { large: "ĐIỆN GD", small: "QĐH" },
  "4154 - Xay ép/Khác": { large: "ĐIỆN GD", small: "XAY ÉP/S.TỐ" },
  "4153 - Xay Sinh tố": { large: "ĐIỆN GD", small: "XAY ÉP/S.TỐ" },
  "4149 - Bình thủy điện": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "958 - Lò vi sóng": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "967 - Sấy tóc": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4142 - Bình đun siêu tốc": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4145 - Bếp gas đơn": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4141 - Bàn ủi khô": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4151 - Áp suất/lẩu/chiên/nướng": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4140 - Bàn ủi hơi nước": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "957 - Lò nướng": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4143 - Bàn ủi hơi nước đứng": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4152 - Ổ cắm điện/vợt muỗi": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4147 - Bếp điện đơn": { large: "ĐIỆN GD", small: "BẾP GAS/ĐIỆN/HÚT MÙI" },
  "4139 - Đèn bàn/Đèn Sạc/Đèn bắt muỗi": { large: "ĐIỆN GD", small: "ĐGD KHÁC" },
  "4062 - Đồng hồ Nữ Dây kim loại": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4061 - Đồng hồ Nam Dây khác": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4059 - Đồng hồ Nam Dây kim loại": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4070 - Đồng hồ Trẻ em": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4063 - Đồng hồ Nữ Dây da": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4064 - Đồng hồ Nữ Dây khác": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4060 - Đồng hồ Nam Dây da": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "3359 - Phụ kiện đồng hồ": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "4125 - Smartband": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "2391 - Smartwatch": { large: "ĐỒNG HỒ", small: "Đ.HỒ" },
  "1491 - Smartphone": { large: "ICT", small: "SMP" },
  "42 - Laptop": { large: "ICT", small: "LAP" },
  "931 - Máy tính bảng": { large: "ICT", small: "TAB" },
  "6479 - Camera IP Trong nhà": { large: "PHỤ KIỆN", small: "CAM" },
  "4219 - Camera IP Ngoài trời": { large: "PHỤ KIỆN", small: "CAM" },
  "4779 - Loa di động - imei": { large: "PHỤ KIỆN", small: "LOA" },
  "1031 - Loa di động": { large: "PHỤ KIỆN", small: "LOA" },
  "12 - Pin sạc dự phòng": { large: "PHỤ KIỆN", small: "PIN SDP" },
  "2651 - Pin sạc dự phòng đa dạng": { large: "PHỤ KIỆN", small: "PIN SDP" },
  "3346 - Tai Nghe Bluetooth": { large: "PHỤ KIỆN", small: "TN BLT" },
  "4540 - Tai Nghe Bluetooth - imei": { large: "PHỤ KIỆN", small: "TN BLT" },
  "15 - Tai nghe dây": { large: "PHỤ KIỆN", small: "TN DÂY" },
  "3345 - Cáp": { large: "PHỤ KIỆN", small: "CÁP" },
  "14 - Sạc/ Adapter": { large: "PHỤ KIỆN", small: "ADAPTER" },
  "531 - Pin": { large: "PHỤ KIỆN", small: "" },
  "4095 - Cáp (Giá Rẻ)": { large: "PHỤ KIỆN", small: "CÁP" },
  "16 - Thẻ Nhớ": { large: "PHỤ KIỆN", small: "T.NHỚ" },
  "4659 - Phụ kiện tiện ích Apple": { large: "PHỤ KIỆN", small: "PK APPLE" },
  "4900 - Bàn phím": { large: "PHỤ KIỆN", small: "" },
  "10 - Chuột": { large: "PHỤ KIỆN", small: "CHUỘT" },
  "6400 - Phụ kiện tiện ích Apple - imei": { large: "PHỤ KIỆN", small: "PK APPLE" },
  "2351 - Router - Imei": { large: "PHỤ KIỆN", small: "" },
  "2831 - Phụ kiện trang trí Apple": { large: "PHỤ KIỆN", small: "PK APPLE" },
  "2691 - Bộ Sạc/Cáp/Adaptor (Giá Rẻ)": { large: "PHỤ KIỆN", small: "CÁP" },
  "73 - Phụ kiện điện máy": { large: "PHỤ KIỆN", small: "" },
  "3479 - Thiết bị mạng khác": { large: "PHỤ KIỆN", small: "" },
  "871 - USB": { large: "PHỤ KIỆN", small: "" },
  "4199 - Miếng Dán Kính": { large: "PHỤ KIỆN", small: "M.DÁN" },
  "1231 - Miếng dán mặt trước": { large: "PHỤ KIỆN", small: "M.DÁN" },
  "58 - Miếng dán mặt sau": { large: "PHỤ KIỆN", small: "M.DÁN" },
  "431 - Ốp Lưng - Flip Cover": { large: "PHỤ KIỆN", small: "ỐP LƯNG" },
  "5975 - Balo Túi Chống Sốc": { large: "PHỤ KIỆN", small: "BALO" },
  "410 - Phụ kiện TT khác": { large: "PHỤ KIỆN", small: "" },
  "1351 - Loa vi tính (imei)": { large: "PHỤ KIỆN", small: "LOA" },
  "1891 - Sim Online": { large: "SIM", small: "SIM" },
  "4179 - Sim Online Số Đẹp": { large: "SIM", small: "SIM" },
  "571 - UDDĐ": { large: "VIEON", small: "VIEON" },
  "4741 - Xe Đạp Trẻ Em": { large: "XE ĐẠP", small: "XE ĐẠP" },
  "4742 - Xe Đạp Người Lớn": { large: "XE ĐẠP", small: "XE ĐẠP" },
  "4324 - Khung treo, giá đỡ": { large: "ĐIỆN GD", small: "KHUNG TREO" },
  "4169 - Lõi lọc": { large: "ĐIỆN GD", small: "LÕI LỌC" }
};

const NHOM_SMALL_DISPLAY: Record<string, string> = {
  'ML': 'Máy lạnh', 'MNN': 'Máy nước nóng', 'TL': 'Tủ lạnh', 'MG': 'Máy giặt',
  'AUDIO': 'Loa Karaoke', 'TIVI': 'Tivi', 'MLN': 'Lọc nước', 'QĐH': 'Quạt ĐH',
  'NC NẮP RỜI': 'NC nắp rời', 'NC Đ.TỬ': 'NC điện tử', 'NC': 'Nồi cơm',
  'HÚT BỤI': 'Hút bụi', 'BẾP GAS/ĐIỆN/HÚT MÙI': 'Bếp', 'XAY ÉP/S.TỐ': 'Xay ép',
  'N.CHIÊN': 'Nồi chiên', 'ĐGD KHÁC': 'ĐGD khác', 'QUẠT': 'Quạt',
  'SMP': 'Smartphone', 'LAP': 'Laptop', 'TAB': 'Máy tính bảng',
  'TN BLT': 'Tai nghe BT', 'TN DÂY': 'Tai nghe dây', 'CÁP': 'Cáp',
  'ADAPTER': 'Sạc', 'T.NHỚ': 'Thẻ nhớ', 'M.DÁN': 'Miếng dán',
  'ỐP LƯNG': 'Ốp lưng', 'PK APPLE': 'PK Apple', 'BALO': 'Balo/Túi',
  'CAM': 'Camera', 'LOA': 'Loa', 'PIN SDP': 'Pin sạc', 'SIM': 'Sim',
  'CHUỘT': 'Chuột', 'Đ.HỒ': 'Đồng hồ', 'B.HIỂM': 'Bảo hiểm',
  'XE ĐẠP': 'Xe đạp', 'VIEON': 'UDDĐ', 'KHUNG TREO': 'Khung treo', 'LÕI LỌC': 'Lõi lọc',
};

const fmtTr = (v: number): string => {
  if (v === 0) return '0';
  const m = v / 1_000_000;
  return `${m % 1 === 0 ? m : m.toFixed(1)} Tr`;
};

const fmtPct = (tc_dt: number, total_dt: number): string => {
  if (total_dt === 0 || tc_dt === 0) return '';
  return `${Math.round(tc_dt / total_dt * 100)}%`;
};

const BRAND_KEYWORDS = [
  'HAIER','DAIKIN','HISENSE','HISENSI','SAMSUNG','LG','PANASONIC','TOSHIBA','SHARP',
  'AQUA','BEKO','BOSCH','ELECTROLUX','MIDEA','CASPER','APPLE','XIAOMI','OPPO','VIVO',
  'REALME','HUAWEI','NOKIA','INFINIX','TECNO','ASUS','LENOVO','HP','DELL','ACER',
  'SONY','JBL','MARSHALL','HARMAN','CANON','FUJIFILM','NIKON','PHILIPS','GORENJE',
];

const extractBrand = (productName: string): string => {
  const upper = productName.toUpperCase();
  for (const brand of BRAND_KEYWORDS) {
    if (upper.includes(brand)) return brand.charAt(0) + brand.slice(1).toLowerCase();
  }
  return 'Khác';
};

export default function NewRealtimePage() {
  const { userProfile } = useAuth();
  const { showNotification } = useNotification();
  const { marketFilter, setMarketFilter, setAvailableMarkets } = useMarket();
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([]);
  const [selectedMaKho, setSelectedMaKho] = useState(userProfile?.ma_kho || '');
  const { ycxData, processedData, isLoadingRealtime, loadData, lastUpdated, activeStore, setActiveStore } = useRealtimeData(selectedMaKho);

  const { processedData: luykeProcessedData } = useLuykeData(selectedMaKho);

  const luykeRemainingMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!luykeProcessedData?.categories) return map;

    luykeProcessedData.categories.forEach(cat => {
      const name = cat.name.trim().toUpperCase();
      const type = cat.type;
      const key = `${name}_${type}`;
      const remaining = cat.revenue - cat.target;
      if (remaining < 0) {
        map.set(key, (map.get(key) || 0) + remaining);
      }
    });
    return map;
  }, [luykeProcessedData?.categories]);

  const rawYcxRows = useMemo(() => {
    if (!ycxData) return [];
    return ycxData.split('\n').filter(line => line.trim()).map(line => line.split('\t'));
  }, [ycxData]);

  const filteredRawYcxRows = useMemo(() => {
    if (rawYcxRows.length <= 1) return [];
    const headers = rawYcxRows[0].map(h => h.trim());

    // Find column indices by exact name or fallback to index 13 (N) and 44 (AS)
    let idxStatus = headers.findIndex(h => h === 'Trạng thái xuất');
    let idxTra = headers.findIndex(h => h === 'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính');

    if (idxStatus === -1) idxStatus = 13;
    if (idxTra === -1) idxTra = 44;

    return rawYcxRows.slice(1).filter(row => {
      const statusValue = String(row[idxStatus] || '').trim();
      const traValue = String(row[idxTra] || '').trim();
      return statusValue === 'Đã xuất' && traValue === 'Chưa trả';
    });
  }, [rawYcxRows]);

  // Defer heavy row list so useMemo stats don't block render
  const deferredFilteredRows = useDeferredValue(filteredRawYcxRows);

  // ─── Single-pass computation: iterate filteredRawYcxRows only ONCE ──────────
  const { staffAirConStats, staffCEStats, allStaffNames, drillDownData } = useMemo(() => {
    const empty = { staffAirConStats: [] as any[], staffCEStats: [] as any[], allStaffNames: [] as string[], drillDownData: [] as any[] };
    if (rawYcxRows.length <= 1 || filteredRawYcxRows.length === 0) return empty;

    const headers = rawYcxRows[0].map(h => String(h || '').trim());
    const findIdx = (names: string[], defaultIdx: number) => {
      const idx = headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));
      return idx !== -1 ? idx : defaultIdx;
    };

    const idxStaff = findIdx(['người tạo'], 23);
    const idxQty = findIdx(['số lượng'], 35);
    const idxRevenue = findIdx(['phải thu', 'doanh thu', 'tổng tiền', 'thành tiền', 'giá bán'], 37);
    const idxCategory = findIdx(['nhóm ngành hàng', 'nhóm hàng'], 40);
    const idxSmallCat = findIdx(['nhóm hàng nhỏ'], -1);
    const idxHinhThucXuat = findIdx(['hình thức xuất'], -1);
    // Exact-match product column to avoid IMEI columns
    const idxProduct = (() => {
      const exact = headers.findIndex(h => h.toLowerCase() === 'tên sản phẩm');
      if (exact !== -1) return exact;
      const partial = headers.findIndex(h => h.toLowerCase().startsWith('tên sản phẩm') || h.toLowerCase() === 'tên hàng');
      return partial !== -1 ? partial : 33;
    })();

    type ACStats = { staffName: string; mayLanh: number; mayLanhDaikin: number; mayLanhHaier: number; mayLanhHisense: number };
    type CEStats = { staffName: string; ceSL: number; ceDT: number; products: { name: string; sl: number; dt: number }[] };
    type DGDStats = { staffName: string; mln: number; qdh: number; nc: number };

    const acMap = new Map<string, ACStats>();
    const ceMap = new Map<string, CEStats>();
    const dgdMap = new Map<string, DGDStats>();
    const drillMap = new Map<string, Map<string, Map<string, Map<string, { sl: number; dt: number; tc_dt: number }>>>>();
    const names = new Set<string>();

    const isSystemName = (n: string) =>
      !n || n.toLowerCase().includes('người tạo') || n.toLowerCase() === 'admin' || n.toLowerCase() === 'administrator';

    for (const row of filteredRawYcxRows) {
      const staffName = String(row[idxStaff] || '').trim();
      if (isSystemName(staffName)) continue;

      names.add(staffName);

      const category = String(row[idxCategory] || '').trim();
      const nhomLarge = NHOM_HANG_MAP[category]?.large || '';
      const nhomSmallFromMap = NHOM_HANG_MAP[category]?.small || '';
      const nhomSmallValue = idxSmallCat !== -1 ? String(row[idxSmallCat] || '').trim().toUpperCase() : '';
      // Prefer value from data column, fallback to map
      const nhomSmall = nhomSmallValue || nhomSmallFromMap.toUpperCase();

      const qty = Math.round(parseFloat(String(row[idxQty] || '0').replace(/,/g, '')) || 0);
      const revenue = Math.round(parseFloat(String(row[idxRevenue] || '0').replace(/,/g, '')) || 0);

      // ── Air-con stats ──
      if (nhomSmallValue === 'ML' || nhomSmallFromMap === 'ML') {
        const productName = String(row[idxProduct] || '').toUpperCase();
        if (!acMap.has(staffName)) acMap.set(staffName, { staffName, mayLanh: 0, mayLanhDaikin: 0, mayLanhHaier: 0, mayLanhHisense: 0 });
        const d = acMap.get(staffName)!;
        d.mayLanh += qty;
        if (productName.includes('DAIKIN')) d.mayLanhDaikin += qty;
        if (productName.includes('HAIER')) d.mayLanhHaier += qty;
        if (productName.includes('HISENSE') || productName.includes('HISENSI')) d.mayLanhHisense += qty;
      }

      // ── CE stats ──
      if (nhomLarge === 'CE') {
        const productName = String(row[idxProduct] || '').trim() || 'Không rõ';
        if (!ceMap.has(staffName)) ceMap.set(staffName, { staffName, ceSL: 0, ceDT: 0, products: [] });
        const d = ceMap.get(staffName)!;
        d.ceSL += qty;
        d.ceDT += revenue;
        const existing = d.products.find(p => p.name === productName);
        if (existing) { existing.sl += qty; existing.dt += revenue; }
        else d.products.push({ name: productName, sl: qty, dt: revenue });
      }

      // ── ĐGD stats (MLN, QĐH, NC) ──
      if (nhomLarge === 'ĐIỆN GD') {
        if (!dgdMap.has(staffName)) dgdMap.set(staffName, { staffName, mln: 0, qdh: 0, nc: 0 });
        const d = dgdMap.get(staffName)!;
        if (nhomSmall === 'MLN') d.mln += qty;
        else if (nhomSmall === 'QĐH') d.qdh += qty;
        else if (nhomSmall.startsWith('NC')) d.nc += qty;
      }

      // ── Drill-down hierarchy (5 levels) ──
      if (nhomLarge) {
        const productName = String(row[idxProduct] || '').trim() || 'Không rõ';
        if (!drillMap.has(nhomLarge)) drillMap.set(nhomLarge, new Map());
        const subMap = drillMap.get(nhomLarge)!;
        const subKey = nhomSmall || 'Khác';
        if (!subMap.has(subKey)) subMap.set(subKey, new Map());
        const staffMap = subMap.get(subKey)!;
        if (!staffMap.has(staffName)) staffMap.set(staffName, new Map());
        const prodMap = staffMap.get(staffName)!;
        if (!prodMap.has(productName)) prodMap.set(productName, { sl: 0, dt: 0, tc_dt: 0 });
        const pd = prodMap.get(productName)!;
        pd.sl += qty; pd.dt += revenue;
        // TC = trả góp
        const htx = idxHinhThucXuat !== -1 ? String(row[idxHinhThucXuat] || '').toLowerCase() : '';
        if (htx.includes('trả góp')) pd.tc_dt += revenue;
      }
    }

    // Sort products by DT desc
    ceMap.forEach(s => s.products.sort((a, b) => b.dt - a.dt));

    const acAll = Array.from(acMap.values());
    const ceAll = Array.from(ceMap.values());
    const ceWithDGD = ceAll.map(s => ({ ...s, ...(dgdMap.get(s.staffName) || { mln: 0, qdh: 0, nc: 0 }) }));

    // Build drillDownData with brand grouping
    const drillDownData = Array.from(drillMap.entries()).map(([large, subMap]) => {
      const subs = Array.from(subMap.entries()).map(([subKey, staffMap]) => {
        const staffRows = Array.from(staffMap.entries()).map(([sName, prodMap]) => {
          const products = Array.from((prodMap as Map<string, {sl:number;dt:number;tc_dt:number}>).entries())
            .map(([pName, pd]) => ({ name: pName, sl: pd.sl, dt: pd.dt, tc_dt: pd.tc_dt }))
            .sort((a, b) => b.dt - a.dt);
          // Group products by brand
          const brandMap = new Map<string, { sl: number; dt: number; tc_dt: number; products: {name:string;sl:number;dt:number;tc_dt:number}[] }>();
          products.forEach(p => {
            const brand = extractBrand(p.name);
            if (!brandMap.has(brand)) brandMap.set(brand, { sl: 0, dt: 0, tc_dt: 0, products: [] });
            const bd = brandMap.get(brand)!;
            bd.sl += p.sl; bd.dt += p.dt; bd.tc_dt += p.tc_dt;
            bd.products.push(p);
          });
          const brands = Array.from(brandMap.entries())
            .map(([bName, bd]) => ({ name: bName, sl: bd.sl, dt: bd.dt, tc_dt: bd.tc_dt, products: bd.products }))
            .sort((a, b) => b.dt - a.dt);
          const sSL = products.reduce((s, x) => s + x.sl, 0);
          const sDT = products.reduce((s, x) => s + x.dt, 0);
          const sTC = products.reduce((s, x) => s + x.tc_dt, 0);
          return { name: sName, sl: sSL, dt: sDT, tc_dt: sTC, brands };
        }).sort((a, b) => b.dt - a.dt);
        const subSL = staffRows.reduce((s, x) => s + x.sl, 0);
        const subDT = staffRows.reduce((s, x) => s + x.dt, 0);
        const subTC = staffRows.reduce((s, x) => s + x.tc_dt, 0);
        return { key: subKey, name: NHOM_SMALL_DISPLAY[subKey] || subKey, sl: subSL, dt: subDT, tc_dt: subTC, staffRows };
      }).sort((a, b) => b.dt - a.dt);
      const grpSL = subs.reduce((s, x) => s + x.sl, 0);
      const grpDT = subs.reduce((s, x) => s + x.dt, 0);
      const grpTC = subs.reduce((s, x) => s + x.tc_dt, 0);
      return { key: large, name: large, sl: grpSL, dt: grpDT, tc_dt: grpTC, subs };
    }).sort((a, b) => b.dt - a.dt);

    return {
      staffAirConStats: (selectedStaffs.length > 0 ? acAll.filter(s => selectedStaffs.includes(s.staffName)) : acAll)
        .sort((a, b) => b.mayLanh - a.mayLanh),
      staffCEStats: (selectedStaffs.length > 0 ? ceWithDGD.filter(s => selectedStaffs.includes(s.staffName)) : ceWithDGD)
        .sort((a, b) => b.ceDT - a.ceDT),
      allStaffNames: Array.from(names).sort(),
      drillDownData,
    };
  }, [rawYcxRows, filteredRawYcxRows, selectedStaffs]);


  useEffect(() => {
    console.log('[NewRealtimePage] selectedMaKho:', selectedMaKho);
  }, [selectedMaKho]);
  const [activeTab, setActiveTab] = useState<'summary' | 'khai_thac'>('summary');
  const [isPending, startTransition] = useTransition();
  const [rawTablePage, setRawTablePage] = useState(0);
  const RAW_PAGE_SIZE = 100;
  const [currentTime, setCurrentTime] = useState(new Date());
  const categoriesRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const [stores, setStores] = useState<{ warehouse_code: string, ten_sieu_thi: string }[]>([]);
  const [isStoreSelectorOpen, setIsStoreSelectorOpen] = useState(false);

  // Update selectedMaKho when userProfile changes
  useEffect(() => {
    if (userProfile?.ma_kho && !selectedMaKho) {
      setSelectedMaKho(userProfile.ma_kho);
    }
  }, [userProfile, selectedMaKho]);

  // Fetch all stores for admin
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      const fetchStores = async () => {
        const { data } = await supabase
          .from('store_realtime')
          .select('warehouse_code, ten_sieu_thi');
        if (data) setStores(data);
      };
      fetchStores();
    }
  }, [userProfile]);
  const [sllkComment, setSllkComment] = useState('');
  const [dtlkComment, setDtlkComment] = useState('');
  const [showSllkComment, setShowSllkComment] = useState(false);
  const [showDtlkComment, setShowDtlkComment] = useState(false);
  const [showLuykeColumn, setShowLuykeColumn] = useState(true);
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});
  const [expandedCERows, setExpandedCERows] = useState<Record<string, boolean>>({});
  const [expandedDrillRows, setExpandedDrillRows] = useState<Record<string, boolean>>({});
  const [expandedDrillBrand, setExpandedDrillBrand] = useState<Record<string, boolean>>({});
  const [isDrillCollapsed, setIsDrillCollapsed] = useState(false);
  const [isDrillAllOpen, setIsDrillAllOpen] = useState(false); // default: all closed, drill-down per level
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const allCategories = useMemo(() => {
    if (!processedData.staff) return [];
    const cats = new Set<string>();
    processedData.staff.forEach(s => {
      s.items.forEach(item => {
        if (item.category) cats.add(item.category);
      });
    });
    return Array.from(cats).sort();
  }, [processedData.staff]);

  // Initialize selectedCategories with all categories when data loads
  useEffect(() => {
    if (allCategories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(allCategories);
    }
  }, [allCategories]);

  const toggleStaffExpand = (staffName: string) => {
    setExpandedStaff(prev => ({
      ...prev,
      [staffName]: !prev[staffName]
    }));
  };

  const generateAndCopyComment = (type: 'SL' | 'DT') => {
    const categories = processedData.categories
      .filter(c => c.type === type)
      .sort((a, b) => (b.rate || 0) - (a.rate || 0));

    if (categories.length === 0) return;

    const title = type === 'SL' ? 'BÁO CÁO NGÀNH HÀNG (SL)' : 'BÁO CÁO NGÀNH HÀNG (DT)';
    let commentText = `📊 ${title}\n⏰ Cập nhật: ${currentTime.toLocaleTimeString('vi-VN')}\n\n`;

    categories.forEach(cat => {
      const rate = Math.round(cat.rate || 0);
      const status = rate >= 100 ? '✅' : '❌';
      commentText += `${status} ${cat.name}: ${rate}% (${cat.revenue.toLocaleString()} / ${cat.target.toLocaleString()})\n`;
    });

    if (type === 'SL') {
      setSllkComment(commentText);
      setShowSllkComment(true);
    } else {
      setDtlkComment(commentText);
      setShowDtlkComment(true);
    }

    navigator.clipboard.writeText(commentText).then(() => {
      showNotification(`Đã tạo nhận xét và copy vào bộ nhớ tạm!`, 'success');
    });
  };

  const captureCategories = async () => {
    if (categoriesRef.current) {
      try {
        document.body.classList.add('capturing-screenshot');
        // Đợi một chút để CSS áp dụng (loại bỏ scrollbar, mở rộng table)
        await new Promise(resolve => setTimeout(resolve, 100));

        const dataUrl = await domToPng(categoriesRef.current, {
          backgroundColor: '#f8fafc',
          scale: 2,
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `NganhHang_Realtime_${userProfile?.ma_kho || 'Report'}.png`;
        link.click();
      } catch (error) {
        console.error('Lỗi khi chụp ảnh:', error);
      } finally {
        document.body.classList.remove('capturing-screenshot');
      }
    }
  };

  const captureOverview = async () => {
    if (overviewRef.current) {
      try {
        document.body.classList.add('capturing-screenshot');
        await new Promise(resolve => setTimeout(resolve, 100));

        const dataUrl = await domToPng(overviewRef.current, {
          backgroundColor: '#f8fafc',
          scale: 2,
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `TongQuan_Realtime_${userProfile?.ma_kho || 'Report'}.png`;
        link.click();
      } catch (error) {
        console.error('Lỗi khi chụp ảnh tổng quan:', error);
      } finally {
        document.body.classList.remove('capturing-screenshot');
      }
    }
  };


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 10) return 'Chào buổi sáng';
    if (hour < 13) return 'Chào buổi trưa';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, [currentTime]);

  const filteredMarkets = useMemo(() => {
    return processedData.markets.filter(m => isValidStoreName(m.name));
  }, [processedData.markets]);

  // Sync available markets to global context
  useEffect(() => {
    if (filteredMarkets.length > 0) {
      setAvailableMarkets(filteredMarkets);
    }
  }, [filteredMarkets, setAvailableMarkets]);

  const summary = useMemo(() => {
    if (!processedData.markets.length) return null;
    // Try to find the "TỔNG" row first, otherwise take the first one
    const totalRow = processedData.markets.find(m => m.name === 'TỔNG' || m.isSummary);
    return totalRow || processedData.markets[0];
  }, [processedData.markets]);

  const filteredCategories = useMemo(() => {
    if (!processedData.categories || processedData.categories.length === 0) return [];

    // 1. Filter by global market filter
    const visibleCats = processedData.categories.filter(cat =>
      marketFilter === 'ALL' || !cat.marketName || cat.marketName === marketFilter
    );

    // 2. Aggregate by name and type
    const aggregated: Record<string, any> = {};

    visibleCats.forEach(cat => {
      const key = `${cat.name}_${cat.type}`;
      if (!aggregated[key]) {
        aggregated[key] = { ...cat };
      } else {
        aggregated[key].target += cat.target;
        aggregated[key].actual = (aggregated[key].actual || 0) + (cat.actual || 0);
        aggregated[key].revenue = (aggregated[key].revenue || 0) + (cat.revenue || 0);
      }
    });

    // 3. Re-calculate rates
    return Object.values(aggregated).map(cat => {
      const rate = cat.target > 0 ? (cat.revenue / cat.target) * 100 : 0;
      return {
        ...cat,
        rate: Math.round(rate * 10) / 10
      };
    });
  }, [processedData.categories, marketFilter]);

  const filteredStaff = useMemo(() => {
    if (!processedData.staff) return [];
    if (allCategories.length === 0 || selectedCategories.length === 0) return processedData.staff;

    return processedData.staff.map(s => {
      const filteredItems = s.items.filter(item => selectedCategories.includes(item.category));

      const totalRevenue = filteredItems.reduce((sum, item) => sum + item.revenue, 0);
      const convertedRevenue = filteredItems.reduce((sum, item) => sum + item.convertedRevenue, 0);
      const installmentRevenue = filteredItems.reduce((sum, item) => sum + (item.isInstallment ? item.revenue : 0), 0);

      const giaDungTotal = filteredItems.filter(item => item.category === 'Gia dụng').reduce((sum, item) => sum + item.revenue, 0);
      const baoHiemTotal = filteredItems.filter(item => item.category === 'Bảo hiểm').reduce((sum, item) => sum + item.revenue, 0);
      const ictTotal = filteredItems.filter(item => item.category === 'ICT').reduce((sum, item) => sum + item.revenue, 0);
      const ceTotal = filteredItems.filter(item => item.category === 'CE').reduce((sum, item) => sum + item.revenue, 0);

      return {
        ...s,
        items: filteredItems,
        totalRevenue,
        convertedRevenue,
        installmentRevenue,
        giaDung: { ...s.giaDung, total: giaDungTotal },
        baoHiem: { ...s.baoHiem, total: baoHiemTotal },
        ce: { ...s.ce, total: ceTotal }
      };
    }).filter(s => s.totalRevenue > 0);
  }, [processedData.staff, selectedCategories, allCategories]);

  const exploitationMetrics = useMemo(() => {
    const total = {
      revenue: 0,
      convertedRevenue: 0,
      installmentRevenue: 0,
      giaDung: 0,
      baoHiem: 0,
      baoHiemCount: 0,
      ict: 0,
      ce: 0,
      staffCount: filteredStaff.length
    };

    filteredStaff.forEach(s => {
      total.revenue += s.totalRevenue;
      total.convertedRevenue += s.convertedRevenue;
      total.installmentRevenue += s.installmentRevenue;
      total.giaDung += s.giaDung.total;
      total.baoHiem += s.baoHiem.total;
      total.baoHiemCount += s.baoHiem.count;
      // ICT is quantity based in the data structure, but let's just sum it for now
      total.ce += s.ce.total;
    });

    return total;
  }, [filteredStaff]);

  if (isLoadingRealtime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={24} />
        </div>
        <p className="mt-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Khởi tạo dữ liệu Realtime...</p>
      </div>
    );
  }

  return (
    <div className={`${activeTab === 'summary' ? 'max-w-[96rem]' : 'max-w-7xl'} mx-auto px-4 py-8 space-y-8 pb-32 font-sans bg-slate-50/30 transition-all duration-500`}>
      {/* Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Hệ thống trực tuyến</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            {greeting}, <span className="text-indigo-600">{userProfile?.username?.split(' ')[0]}</span>
          </h1>
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <Calendar size={14} />
            {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Thời gian</span>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-500" />
                <span className="text-xl font-bold font-oswald tracking-wider text-slate-900">
                  {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dữ liệu</span>
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className={isLoadingRealtime ? 'animate-spin text-indigo-500' : 'text-emerald-500'} />
                <span className="text-xs font-bold text-slate-700">
                  {lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '---'}
                </span>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <button
              onClick={() => loadData()}
              className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all duration-300"
              title="Làm mới"
            >
              <RefreshCw size={18} className={isLoadingRealtime ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Daily Target Progress */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Target size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tiến độ mục tiêu ngày</span>
              <span className="text-sm font-bold text-slate-900">Hoàn thành kế hoạch</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-indigo-600 font-oswald">{Math.round(summary?.percentHT || 0)}%</span>
          </div>
        </div>
        <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(Math.round(summary?.percentHT || 0), 100)}%` }}
            transition={{ duration: 1.2, ease: "circOut" }}
            className="h-full bg-indigo-600 rounded-full"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide sticky top-0 z-40 bg-slate-50/90 backdrop-blur-xl py-4 -mx-4 px-4">
        <TabButton
          active={activeTab === 'summary'}
          onClick={() => startTransition(() => setActiveTab('summary'))}
          icon={LayoutGrid}
          label="TỔNG QUAN"
        />
        <TabButton
          active={activeTab === 'khai_thac'}
          onClick={() => startTransition(() => { setActiveTab('khai_thac'); setRawTablePage(0); })}
          icon={Activity}
          label="DASHBOARD YCX"
        />
      </div>


      <AnimatePresence mode="wait">
        {activeTab === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
            ref={overviewRef}
          >
            {/* Overview Header with Capture Button */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <LayoutGrid size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[24px] font-bold text-slate-800 uppercase tracking-tight">
                        {userProfile?.ten_sieu_thi || activeStore || 'Tổng quan hiệu quả'}
                      </h2>
                      {userProfile?.role === 'admin' && (
                        <button
                          onClick={() => setIsStoreSelectorOpen(!isStoreSelectorOpen)}
                          className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                          title="Lọc siêu thị"
                        >
                          <Filter size={14} className="text-slate-400" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-slate-400">KPI & Chi tiết ngành hàng</p>

                    {isStoreSelectorOpen && stores.length > 0 && (
                      <div className="absolute z-50 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-60 overflow-y-auto">
                          {stores.map(store => (
                            <button
                              key={store.warehouse_code}
                              onClick={() => {
                                setSelectedMaKho(store.warehouse_code);
                                setActiveStore(store.ten_sieu_thi);
                                setIsStoreSelectorOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                            >
                              {store.ten_sieu_thi} ({store.warehouse_code})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={captureOverview}
                  className="no-capture flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 shadow-lg shadow-indigo-200 active:scale-95"
                >
                  <Camera size={14} />
                  <span>Chụp tổng quan</span>
                </button>
              </div>

            </div>

            {/* Stats Grid Container */}
            <div className="space-y-6">
              {filteredMarkets
                .filter(m => marketFilter === 'ALL' || m.name === marketFilter)
                .map((market, mIdx) => (
                  <div key={mIdx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between px-2 border-b border-slate-50 pb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${market.isSummary || market.name === 'TỔNG' ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500'}`} />
                        <h3 className="text-[24px] font-black text-slate-800 uppercase tracking-wider">{market.name}</h3>
                      </div>
                      <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {Math.round(market.percentHT || 0)}% HT
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                      <StatCard
                        title="TAGET QĐ"
                        value={market.targetQD?.toLocaleString() || '0'}
                        subValue=""
                        icon={Target}
                        color="rose"
                        isColored={true}
                      />
                      <StatCard
                        title="DOANH THU QUY ĐỔI"
                        value={market.actualVirtual?.toLocaleString() || '0'}
                        subValue=""
                        icon={TrendingUp}
                        color="indigo"
                        isColored={true}
                      />
                      <StatCard
                        title="%HT"
                        value={`${Math.round(market.percentHT || 0)}%`}
                        subValue=""
                        icon={Activity}
                        color="emerald"
                        isColored={true}
                      />
                      <StatCard
                        title="Tỷ Trọng Trả Góp"
                        value={`${(market.installmentRate || 0).toFixed(1)}%`}
                        subValue=""
                        icon={ShoppingBag}
                        color="amber"
                        isColored={true}
                      />
                      <StatCard
                        title="Lượt Bill Bán Hàng"
                        value={Math.round(market.luotBillBanHang || 0).toLocaleString()}
                        subValue=""
                        icon={Zap}
                        color="orange"
                        isColored={true}
                      />
                      <StatCard
                        title="Lượt Bill Thu Hộ"
                        value={Math.round(market.luotBillThuHo || 0).toLocaleString()}
                        subValue=""
                        icon={CreditCard}
                        color="blue"
                        isColored={true}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {/* Categories Tables moved to Summary */}
            <div className="space-y-6 pt-8 border-t border-slate-200">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight text-center">Chi tiết ngành hàng</h2>
                <div className="flex flex-wrap items-center justify-center gap-3 no-capture">
                  <button
                    onClick={() => setShowLuykeColumn(!showLuykeColumn)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-black uppercase transition-all duration-300 shadow-sm border active:scale-95 ${showLuykeColumn
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'
                      }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${showLuykeColumn ? 'bg-rose-600 animate-pulse' : 'bg-slate-400'}`}></div>
                    {showLuykeColumn ? 'Ẩn cột luỹ kế' : 'Hiện cột luỹ kế'}
                  </button>
                  <button
                    onClick={captureCategories}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all duration-300 shadow-lg shadow-emerald-200 active:scale-95"
                  >
                    <Camera size={16} />
                    <span>Chụp ảnh báo cáo</span>
                  </button>
                </div>
              </div>

              <div ref={categoriesRef} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Table: SLLK */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600 shrink-0">
                          <ShoppingBag size={24} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">NGÀNH HÀNG (SL)</h3>
                          <p className="text-[14px] font-medium text-slate-500">Lọc theo số lượng luỹ kế</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 px-5 py-2.5 rounded-full border border-indigo-100 shadow-sm">
                          <span className="text-[18px] font-black text-indigo-700">
                            {filteredCategories.filter(c => c.type === 'SL' || c.type === 'ALL').filter(c => Math.round(c.rate || 0) >= 100).length} / {filteredCategories.filter(c => c.type === 'SL' || c.type === 'ALL').length}
                          </span>
                        </div>
                        <button
                          onClick={() => generateAndCopyComment('SL')}
                          className={`p-2.5 rounded-xl transition-all duration-300 no-capture shadow-sm ${showSllkComment ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'}`}
                          title="Tự động nhận xét & Copy"
                        >
                          <MessageSquare size={18} />
                        </button>
                      </div>
                    </div>

                    {showSllkComment && (
                      <div className="mb-4">
                        <textarea
                          value={sllkComment}
                          onChange={(e) => setSllkComment(e.target.value)}
                          placeholder="Nhập nhận xét cho bảng SLLK..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[60px] screenshot-comment"
                        />
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100/80">
                            <th className="py-3 px-3 text-[12px] font-black bg-emerald-600 text-white uppercase tracking-wider border border-emerald-500">NGÀNH HÀNG</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-emerald-600 text-white uppercase tracking-wider text-center border border-emerald-500 w-[60px] min-w-[60px] max-w-[60px]">TARGET</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">REAL</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">%HT</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">CÒN LẠI</th>
                            {showLuykeColumn && <th className="py-3 px-1 text-[12px] font-black bg-rose-600 text-white uppercase tracking-wider text-center border border-rose-500 w-[60px] min-w-[60px] max-w-[60px]">LUỸ KẾ</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories
                            .filter(c => c.type === 'SL' || c.type === 'ALL')
                            .sort((a, b) => (b.rate || 0) - (a.rate || 0))
                            .map((cat, idx) => {
                              const lkKey = `${cat.name.trim().toUpperCase()}_${cat.type}`;
                              const lkRemaining = luykeRemainingMap.get(lkKey);

                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-3 text-[13px] font-bold text-slate-700 border border-slate-300">{cat.name}</td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-slate-900 font-oswald text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px] truncate">{cat.target.toLocaleString()}</td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-indigo-600 font-oswald text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px] truncate">
                                    {cat.revenue === 0 ? "" : cat.revenue.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-1 text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px]">
                                    <span className={`text-[13px] font-bold px-1.5 py-0.5 rounded ${Math.round(cat.rate || 0) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                      {Math.round(cat.rate || 0)}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-rose-600 font-oswald text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px] truncate">
                                    {cat.target - cat.revenue > 0 ? (cat.target - cat.revenue).toLocaleString() : ""}
                                  </td>
                                  {showLuykeColumn && (
                                    <td className="py-3 px-1 text-[13px] font-black text-rose-600 bg-white font-oswald text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px] truncate">
                                      {lkRemaining ? Math.round(lkRemaining).toLocaleString() : ""}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Table: DTLK */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-emerald-600 shrink-0">
                          <TrendingUp size={24} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">NGÀNH HÀNG (DT)</h3>
                          <p className="text-[14px] font-medium text-slate-500">Lọc theo doanh thu luỹ kế</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 px-5 py-2.5 rounded-full border border-emerald-100 shadow-sm">
                          <span className="text-[18px] font-black text-emerald-700">
                            {filteredCategories.filter(c => c.type === 'DT' || c.type === 'ALL').filter(c => Math.round(c.rate || 0) >= 100).length} / {filteredCategories.filter(c => c.type === 'DT' || c.type === 'ALL').length}
                          </span>
                        </div>
                        <button
                          onClick={() => generateAndCopyComment('DT')}
                          className={`p-2.5 rounded-xl transition-all duration-300 no-capture shadow-sm ${showDtlkComment ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'}`}
                          title="Tự động nhận xét & Copy"
                        >
                          <MessageSquare size={18} />
                        </button>
                      </div>
                    </div>

                    {showDtlkComment && (
                      <div className="mb-4">
                        <textarea
                          value={dtlkComment}
                          onChange={(e) => setDtlkComment(e.target.value)}
                          placeholder="Nhập nhận xét cho bảng DTLK..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[60px] screenshot-comment"
                        />
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100/80">
                            <th className="py-3 px-3 text-[12px] font-black bg-emerald-600 text-white uppercase tracking-wider border border-emerald-500">NGÀNH HÀNG</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-emerald-600 text-white uppercase tracking-wider text-center border border-emerald-500 w-[60px] min-w-[60px] max-w-[60px]">TARGET</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">REAL</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">%HT</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">CÒN LẠI</th>
                            {showLuykeColumn && <th className="py-3 px-1 text-[12px] font-black bg-rose-600 text-white uppercase tracking-wider text-center border border-rose-500 w-[60px] min-w-[60px] max-w-[60px]">LUỸ KẾ</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories
                            .filter(c => c.type === 'DT' || c.type === 'ALL')
                            .sort((a, b) => (b.rate || 0) - (a.rate || 0))
                            .map((cat, idx) => {
                              const lkKey = `${cat.name.trim().toUpperCase()}_${cat.type === 'ALL' ? 'DT' : cat.type}`;
                              // In BC Thang DT table, it uses DT or ALL. 
                              // we need to be careful with types.
                              const lkRemaining = luykeRemainingMap.get(lkKey) || luykeRemainingMap.get(`${cat.name.trim().toUpperCase()}_ALL`);

                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-3 text-[13px] font-bold text-slate-700 border border-slate-300">{cat.name}</td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-slate-900 font-oswald text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px] truncate">{cat.target.toLocaleString()}</td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-indigo-600 font-oswald text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px] truncate">
                                    {cat.revenue === 0 ? "" : cat.revenue.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-1 text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px]">
                                    <span className={`text-[13px] font-bold px-1.5 py-0.5 rounded ${Math.round(cat.rate || 0) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                      {Math.round(cat.rate || 0)}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-rose-600 font-oswald text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px] truncate">
                                    {cat.target - cat.revenue > 0 ? (cat.target - cat.revenue).toLocaleString() : ""}
                                  </td>
                                  {showLuykeColumn && (
                                    <td className="py-3 px-1 text-[13px] font-black text-rose-600 bg-white font-oswald text-center border border-slate-300 w-[60px] min-w-[60px] max-w-[60px] truncate">
                                      {lkRemaining ? Math.round(lkRemaining).toLocaleString() : ""}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'khai_thac' && (
          <motion.div
            key="khai_thac"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
            style={{ zoom: 1.3 }}
          >

            {/* CHI TIẾT NGÀNH HÀNG - Drill-down table */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {/* Header */}
              <div className="px-6 pt-5 pb-3 border-b border-slate-100">
                <h3 className="text-[18px] font-black text-slate-900 tracking-tight">CHI TIẾT NGÀNH HÀNG</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Thống kê chi tiết theo ngành hàng và nhóm hàng.</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-left min-w-[240px]">NGÀNH HÀNG</th>
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right w-24">S.LƯỢNG</th>
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right w-24">D.THU</th>
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right w-24">DTQĐ</th>
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right w-24">GTĐH</th>
                      <th className="py-3 px-4 text-[11px] font-black text-amber-600 uppercase tracking-wider text-right w-24">% T.CHẬM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownData.length > 0 ? drillDownData.map((group) => {
                      const groupKey = group.key;
                      const isGroupOpen = isDrillAllOpen
                        ? expandedDrillRows[groupKey] !== false  // when all-open: open unless explicitly closed
                        : expandedDrillRows[groupKey] === true;  // when individual: open only if explicitly opened
                      const showGroup = !isDrillCollapsed && isGroupOpen;
                      return (
                        <React.Fragment key={groupKey}>
                          {/* Level 1: nhomLarge */}
                          <tr
                            className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => {
                              setExpandedDrillRows(prev => ({ ...prev, [groupKey]: !isGroupOpen }));
                            }}
                          >
                            <td className="py-3 px-4 text-left">
                              <div className="flex items-center gap-2">
                                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isGroupOpen ? '' : '-rotate-90'}`} />
                                <span className="text-[13px] font-black text-slate-800">{group.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-[13px] font-bold text-slate-700">{group.sl}</td>
                            <td className="py-3 px-4 text-right text-[13px] font-bold text-slate-700">{fmtTr(group.dt)}</td>
                            <td className="py-3 px-4 text-right text-[13px] font-bold text-indigo-600">{fmtTr(group.dt)}</td>
                            <td className="py-3 px-4 text-right text-[13px] font-bold text-slate-600">{fmtTr(group.sl > 0 ? group.dt / group.sl : 0)}</td>
                            <td className="py-3 px-4 text-right text-[13px] font-black text-amber-600">{fmtPct(group.tc_dt, group.dt)}</td>
                          </tr>

                          {showGroup && group.subs.map((sub: any) => {
                            const subKey = `${groupKey}.${sub.key}`;
                            const isSubOpen = isDrillAllOpen
                              ? expandedDrillRows[subKey] !== false
                              : expandedDrillRows[subKey] === true;
                            const showSub = !isDrillCollapsed && isSubOpen;
                            return (
                              <React.Fragment key={subKey}>
                                {/* Level 2: nhomSmall */}
                                <tr
                                  className="border-b border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors bg-slate-50/50"
                                  onClick={() => {
                                    setExpandedDrillRows(prev => ({ ...prev, [subKey]: !isSubOpen }));
                                  }}
                                >
                                  <td className="py-2.5 px-4 pl-10 text-left">
                                    <div className="flex items-center gap-2">
                                      <ChevronDown size={12} className={`text-blue-400 transition-transform duration-200 flex-shrink-0 ${isSubOpen ? '' : '-rotate-90'}`} />
                                      <span className="text-[12px] font-bold text-blue-600">{sub.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-[12px] font-bold text-slate-600">{sub.sl}</td>
                                  <td className="py-2.5 px-4 text-right text-[12px] font-bold text-slate-600">{fmtTr(sub.dt)}</td>
                                  <td className="py-2.5 px-4 text-right text-[12px] font-bold text-indigo-500">{fmtTr(sub.dt)}</td>
                                  <td className="py-2.5 px-4 text-right text-[12px] font-bold text-slate-500">{fmtTr(sub.sl > 0 ? sub.dt / sub.sl : 0)}</td>
                                  <td className="py-2.5 px-4 text-right text-[12px] font-black text-amber-500">{fmtPct(sub.tc_dt, sub.dt)}</td>
                                </tr>

                                {showSub && sub.staffRows.map((staff: any, si: number) => {
                                  const staffKey = `${subKey}.${si}`;
                                  const isStaffOpen = isDrillAllOpen
                                    ? expandedDrillRows[staffKey] !== false
                                    : expandedDrillRows[staffKey] === true;
                                  const showStaff = !isDrillCollapsed && isStaffOpen;
                                  return (
                                    <React.Fragment key={staffKey}>
                                      {/* Level 3: Staff */}
                                      <tr
                                        className="border-b border-slate-50 cursor-pointer hover:bg-orange-50/30 transition-colors"
                                        onClick={() => {
                                          setExpandedDrillRows(prev => ({ ...prev, [staffKey]: !isStaffOpen }));
                                        }}
                                      >
                                        <td className="py-2 px-4 pl-16 text-left">
                                          <div className="flex items-center gap-2">
                                            <ChevronDown size={11} className={`text-orange-400 transition-transform duration-200 flex-shrink-0 ${isStaffOpen ? '' : '-rotate-90'}`} />
                                            <span className="text-[11px] font-bold text-orange-600">{staff.name}</span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-4 text-right text-[11px] font-medium text-slate-500">{staff.sl}</td>
                                        <td className="py-2 px-4 text-right text-[11px] font-medium text-slate-500">{fmtTr(staff.dt)}</td>
                                        <td className="py-2 px-4 text-right text-[11px] font-medium text-indigo-400">{fmtTr(staff.dt)}</td>
                                        <td className="py-2 px-4 text-right text-[11px] font-medium text-slate-400">{fmtTr(staff.sl > 0 ? staff.dt / staff.sl : 0)}</td>
                                        <td className="py-2 px-4 text-right text-[11px] font-black text-amber-500">{fmtPct(staff.tc_dt, staff.dt)}</td>
                                      </tr>
                                      {showStaff && staff.brands.map((brand: any, bi: number) => {
                                        const brandKey = `${staffKey}.${bi}`;
                                        const isBrandOpen = isDrillAllOpen
                                          ? expandedDrillBrand[brandKey] !== false
                                          : expandedDrillBrand[brandKey] === true;
                                        const showBrand = !isDrillCollapsed && isBrandOpen;
                                        return (
                                          <React.Fragment key={brandKey}>
                                            {/* Level 4: Brand */}
                                            <tr
                                              className="border-b border-slate-50 cursor-pointer hover:bg-purple-50/20 transition-colors bg-slate-50/30"
                                              onClick={() => {
                                                setExpandedDrillBrand(prev => ({ ...prev, [brandKey]: !isBrandOpen }));
                                              }}
                                            >
                                              <td className="py-1.5 px-4 pl-24 text-left">
                                                <div className="flex items-center gap-2">
                                                  <ChevronDown size={10} className={`text-purple-400 transition-transform duration-200 flex-shrink-0 ${isBrandOpen ? '' : '-rotate-90'}`} />
                                                  <span className="text-[11px] font-bold text-purple-700">{brand.name}</span>
                                                </div>
                                              </td>
                                              <td className="py-1.5 px-4 text-right text-[10px] font-medium text-slate-400">{brand.sl}</td>
                                              <td className="py-1.5 px-4 text-right text-[10px] font-medium text-slate-400">{fmtTr(brand.dt)}</td>
                                              <td className="py-1.5 px-4 text-right text-[10px] font-medium text-indigo-300">{fmtTr(brand.dt)}</td>
                                              <td className="py-1.5 px-4 text-right text-[10px] font-medium text-slate-400">{fmtTr(brand.sl > 0 ? brand.dt / brand.sl : 0)}</td>
                                              <td className="py-1.5 px-4 text-right text-[10px] font-black text-amber-400">{fmtPct(brand.tc_dt, brand.dt)}</td>
                                            </tr>
                                            {showBrand && brand.products.map((prod: any, pi: number) => (
                                              <tr key={`${brandKey}.${pi}`} className="border-b border-slate-50/50 hover:bg-blue-50/10 transition-colors">
                                                <td className="py-1.5 px-4 pl-32 text-left">
                                                  <span className="text-[10px] font-semibold text-blue-700">{prod.name}</span>
                                                </td>
                                                <td className="py-1.5 px-4 text-right text-[10px] text-slate-400">{prod.sl}</td>
                                                <td className="py-1.5 px-4 text-right text-[10px] text-slate-400">{fmtTr(prod.dt)}</td>
                                                <td className="py-1.5 px-4 text-right text-[10px] text-indigo-300">{fmtTr(prod.dt)}</td>
                                                <td className="py-1.5 px-4 text-right text-[10px] text-slate-400">{fmtTr(prod.sl > 0 ? prod.dt / prod.sl : 0)}</td>
                                                <td className="py-1.5 px-4 text-right text-[10px] font-black text-amber-400">{fmtPct(prod.tc_dt, prod.dt)}</td>
                                              </tr>
                                            ))}
                                          </React.Fragment>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                                })}

                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 italic text-[11px]">
                          {isLoadingRealtime ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu thỏa mãn điều kiện.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>


            {/* Raw Data Table: 3. THÊM YCX RT */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md mt-8 mb-12">
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
                <ShoppingBag size={18} className="text-slate-700 flex-shrink-0" />
                <div>
                  <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-widest">3. THÊM YCX RT (DỮ LIỆU NGUỒN)</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Lọc: Đã xuất &amp; Chưa trả</p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full border-collapse text-center min-w-[3000px]" style={{ borderSpacing: 0 }}>
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {rawYcxRows.length > 0 &&
                        rawYcxRows[0].map((cell, idx) => (
                          <th key={idx} className="border border-slate-300 bg-slate-700 py-2 px-3 text-[9px] font-black text-white uppercase tracking-wider whitespace-nowrap">
                            {cell || `Cột ${String.fromCharCode(65 + idx)}`}
                          </th>
                        ))
                      }
                      <th className="border border-slate-300 bg-slate-700 py-2 px-3 text-[9px] font-black text-white uppercase tracking-wider whitespace-nowrap">PHÂN LOẠI</th>
                      <th className="border border-slate-300 bg-slate-700 py-2 px-3 text-[9px] font-black text-white uppercase tracking-wider whitespace-nowrap">NHÓM HÀNG LỚN</th>
                      <th className="border border-slate-300 bg-slate-700 py-2 px-3 text-[9px] font-black text-white uppercase tracking-wider whitespace-nowrap">NHÓM HÀNG NHỎ</th>
                      <th className="border border-slate-300 bg-slate-700 py-2 px-3 text-[9px] font-black text-white uppercase tracking-wider whitespace-nowrap">PHÂN LOẠI YCX</th>
                    </tr>
                  </thead>

                  <tbody>
                    {deferredFilteredRows.length > 0 ? (
                      (() => {
                        // Find index of Tên sản phẩm
                        const headers = rawYcxRows[0].map(h => String(h || '').trim());
                        const idxProduct = headers.findIndex(h => h.toLowerCase().includes('tên sản phẩm'));
                        const idxSmallCategoryHeader = headers.findIndex(h => h.toLowerCase().includes('nhóm hàng nhỏ'));
                        const idxNhomHang = headers.findIndex(h => h.includes('Nhóm hàng'));
                        const idxHinhThucXuat = headers.findIndex(h => h.includes('Hình thức xuất'));

                        const classifyProduct = (name: string) => {
                          const n = name.toUpperCase();
                          if (n.includes('1 ĐỔI 1')) return '1 ĐỔI 1';
                          if (n.includes('BẢO HIỂM KHOẢN VAY')) return 'BHKV';
                          if (n.includes('BẢO HÀNH MỞ RỘNG')) return 'BHMR';
                          if (n.includes('BẢO HIỂM RƠI VỠ')) return 'BHRV';
                          if (n.includes('BẢO HIỂM SC+')) return 'SC+';
                          if (n.includes('BẢO HÀNH APPLECARE+')) return 'BHAP';
                          if (n.includes('BẢO HIỂM Ô TÔ')) return 'BHOT';
                          if (n.includes('BẢO HIỂM VẬT CHẤT')) return 'BHVC';
                          if (n.includes('BẢO HIỂM XE MÁY')) return 'BHXM';
                          if (n.includes('BẢO HIỂM XE MOTO')) return 'BHMT';
                          if (n.includes('BẢO HIỂM XÃ HỘI')) return 'BHXH';
                          if (n.includes('BẢO HIỂM Y TẾ')) return 'BHYT';
                          if (n.includes('01 THÁNG')) return 'V1';
                          if (n.includes('03 THÁNG')) return 'V2';
                          if (n.includes('06 THÁNG')) return 'V4';
                          return '-';
                        };

                        const classifyHinhThucXuat = (htx: string): string => {
                          const lower = htx.toLowerCase();
                          // TC = Trả cửợc: chứa 'trả góp'
                          if (lower.includes('trả góp')) return 'TC';
                          // TM = Tiền mặt: tất cả các trường hợp còn lại
                          return 'TM';
                        };

                        // Paginate: only render current page rows
                        const pageRows = deferredFilteredRows.slice(
                          rawTablePage * RAW_PAGE_SIZE,
                          (rawTablePage + 1) * RAW_PAGE_SIZE
                        );

                        return pageRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className={`transition-colors ${rowIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} hover:bg-slate-100`}>
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="border border-slate-200 py-2 px-3 text-[9px] text-slate-900 font-medium whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                            <td className="border border-slate-200 py-2 px-3 text-[9px] text-slate-900 whitespace-nowrap font-bold">
                              {classifyProduct(String(row[idxProduct] || '').toUpperCase())}
                            </td>
                            <td className="border border-slate-200 py-2 px-3 text-[9px] text-slate-900 whitespace-nowrap font-bold">
                              {idxNhomHang !== -1 ? (NHOM_HANG_MAP[row[idxNhomHang]]?.large || '-') : '-'}
                            </td>
                            <td className="border border-slate-200 py-2 px-3 text-[9px] text-slate-900 whitespace-nowrap font-bold">
                              {idxSmallCategoryHeader !== -1 ? (row[idxSmallCategoryHeader] || '-') : (idxNhomHang !== -1 ? (NHOM_HANG_MAP[row[idxNhomHang]]?.small || '-') : '-')}
                            </td>
                            <td className="border border-slate-200 py-2 px-3 text-[9px] whitespace-nowrap font-black text-center">
                              {(() => {
                                const val = idxHinhThucXuat !== -1 ? classifyHinhThucXuat(String(row[idxHinhThucXuat] || '')) : '-';
                                return val === 'TC'
                                  ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black">TC</span>
                                  : val === 'TM'
                                    ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black">TM</span>
                                    : <span className="text-slate-400">-</span>;
                              })()}
                            </td>
                          </tr>
                        ));
                      })()
                    ) : (
                      <tr>
                        <td className="py-12 text-center text-slate-400 italic text-[11px]" colSpan={(rawYcxRows[0]?.length || 0) + 1}>
                          Chưa có dữ liệu nguồn hoặc không có bản ghi nào thỏa mãn điều kiện lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {deferredFilteredRows.length > RAW_PAGE_SIZE && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-[11px] font-bold text-slate-500">
                    Hiển thị {rawTablePage * RAW_PAGE_SIZE + 1}–{Math.min((rawTablePage + 1) * RAW_PAGE_SIZE, deferredFilteredRows.length)} / {deferredFilteredRows.length} dòng
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={rawTablePage === 0}
                      onClick={() => setRawTablePage(p => Math.max(0, p - 1))}
                      className="px-3 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >← Trước</button>
                    <span className="text-[11px] font-bold text-slate-600">
                      Trang {rawTablePage + 1} / {Math.ceil(deferredFilteredRows.length / RAW_PAGE_SIZE)}
                    </span>
                    <button
                      disabled={(rawTablePage + 1) * RAW_PAGE_SIZE >= deferredFilteredRows.length}
                      onClick={() => setRawTablePage(p => p + 1)}
                      className="px-3 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >Tiếp →</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

}
