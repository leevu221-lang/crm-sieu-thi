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
  Globe,
  Camera,
  Download,
  Share2,
  Maximize2,
  Minimize2,
  Search,
  MoreVertical,
  MinusCircle,
  PlusCircle,
  Hash,
  FileText,
  CreditCard,
  MessageSquare,
  User,
  Building2,
  Tag,
  GripVertical,
  Package,
  RotateCcw,
  ClipboardList,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useMarket } from '../contexts/MarketContext';
import { useRealtimeData } from './RTST/hooks/useRealtimeData';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import * as XLSX from 'xlsx';
import { domToPng } from 'modern-screenshot';
import { isValidStoreName, normalize } from './RTST/utils';

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
        className={`${bgMap[color] || 'bg-white'} p-5 rounded-2xl border-2 border-white transition-all duration-300 flex flex-col justify-between h-full`}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm shrink-0">
            <Icon size={18} strokeWidth={2.5} />
          </div>
          <h3 className="text-[11px] font-bold text-white/90 uppercase tracking-widest leading-tight">{title}</h3>
          {trend !== undefined && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold bg-white/20 backdrop-blur-sm ml-auto shrink-0">
              {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div>
          <div className="font-bold text-[45px] tracking-tight font-oswald whitespace-nowrap">
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
      className={`bg-white p-5 rounded-2xl border border-slate-100 transition-all duration-300 flex flex-col justify-between ${isLarge ? 'md:col-span-2' : ''}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color] || 'bg-slate-50 text-slate-600'}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{title}</h3>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ml-auto shrink-0 ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <div className={`font-bold text-slate-900 tracking-tight font-oswald whitespace-nowrap ${isLarge ? 'text-[45px]' : 'text-[45px]'}`}>
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

const formatCurrencyUnit = (num: number) => {
  const abs = Math.abs(Math.round(num));
  if (abs >= 1000) return `${Math.round(num).toLocaleString('vi-VN')} tỷ`;
  if (abs > 0) return `${Math.round(num).toLocaleString('vi-VN')} tr`;
  return '0';
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

// Returns delta info for comparison display: { pct: number, up: boolean } or null
const calcDelta = (curr: number, prev: number): { pct: number; up: boolean } | null => {
  if (prev === 0) return null;
  const pct = Math.round((curr - prev) / prev * 100);
  return { pct, up: pct >= 0 };
};

const fmtDiff = (curr: number, prev: number, isMoney = false): React.ReactNode => {
  const diff = curr - prev;
  if (diff === 0) return <span className="text-slate-300">-</span>;
  const val = isMoney ? fmtTr(Math.abs(diff)) : Math.abs(diff).toLocaleString();
  const sign = diff > 0 ? '+' : '-';
  const color = diff > 0 ? 'text-emerald-500' : 'text-rose-500';
  return <span className={`text-[10px] font-black ${color}`}>{sign}{val}</span>;
};

const BRAND_KEYWORDS = [
  'HAIER', 'DAIKIN', 'HISENSE', 'HISENSI', 'SAMSUNG', 'LG', 'PANASONIC', 'TOSHIBA', 'SHARP',
  'AQUA', 'BEKO', 'BOSCH', 'ELECTROLUX', 'MIDEA', 'CASPER', 'APPLE', 'XIAOMI', 'OPPO', 'VIVO',
  'REALME', 'HUAWEI', 'NOKIA', 'INFINIX', 'TECNO', 'ASUS', 'LENOVO', 'HP', 'DELL', 'ACER',
  'SONY', 'JBL', 'MARSHALL', 'HARMAN', 'CANON', 'FUJIFILM', 'NIKON', 'PHILIPS', 'GORENJE',
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
  const { marketFilter, setMarketFilter, availableMarkets: filteredMarkets } = useMarket();
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([]);
  const [selectedMaKho, setSelectedMaKho] = useState(userProfile?.ma_kho || '');
  const { ycxData, setYcxData, processedData, isLoadingRealtime, loadData, lastUpdated, activeStore, setActiveStore, marketInput, setMarketInput, categoryInput, setCategoryInput, categoryRevenueInput, setCategoryRevenueInput, saveRealtimeData } = useRealtimeData(selectedMaKho);

  const { ycxFileName, setYcxFileName } = useRTSTSharedData(selectedMaKho);

  const { processedData: luykeProcessedData, clusterSummaryInput, setClusterSummaryInput, clusterCategoryInput, setClusterCategoryInput, saveLuykeData } = useLuykeData(selectedMaKho);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setYcxFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      // Clean numeric strings: remove commas and convert to numbers where possible
      // to avoid database storage issues with formatted strings.
      const cleanedData = data.map(row => 
        row.map(cell => {
          if (typeof cell === 'string') {
            const trimmed = cell.trim();
            // If it's a numeric string with commas/dots
            if (/^-?[\d,.]+(%?)$/.test(trimmed)) {
              // Robust numeric parsing logic
              const clean = (s: string) => {
                let c = s.replace(/[^\d,.-]/g, '');
                const lastComma = c.lastIndexOf(',');
                const lastDot = c.lastIndexOf('.');
                
                if (lastComma > lastDot && lastComma !== -1) {
                  // Vietnamese format: 1.234.567,89 -> 1234567.89
                  return parseFloat(c.replace(/\./g, '').replace(',', '.'));
                } else if (lastDot > lastComma && lastDot !== -1) {
                  // International format: 1,234,567.89 -> 1234567.89
                  return parseFloat(c.replace(/,/g, ''));
                } else if (lastComma !== -1 && lastDot === -1) {
                  // Only comma: 1234,56 -> 1234.56
                  return parseFloat(c.replace(',', '.'));
                } else if (lastDot !== -1 && lastComma === -1) {
                  // Only dot: could be 1.234 (thousands) or 1.23 (decimal)
                  const parts = c.split('.');
                  if (parts.length > 1 && parts[parts.length - 1].length === 3) {
                    return parseFloat(c.replace(/\./g, ''));
                  }
                  return parseFloat(c);
                }
                return parseFloat(c);
              };
              
              const num = clean(trimmed);
              if (!isNaN(num)) return num;
            }
          }
          return cell;
        })
      );
      
      // Chuyển đổi thành chuỗi Tab-Separated thay vì JSON để tránh lưu các dấu phẩy, ngoặc vuông của định dạng JSON vào Database.
      const rawString = cleanedData.map(row => 
        (Array.isArray(row) ? row : []).map(cell => cell === null || cell === undefined ? '' : String(cell)).join('\t')
      ).join('\n');
      
      setYcxData(rawString);
    };
    reader.readAsBinaryString(file);
  };

  // --- BI Import: show paste button when user returns ---
  const [biImportMode, setBiImportMode] = useState<'realtime' | 'luyke' | null>(null);
  const [biWaitingPaste, setBiWaitingPaste] = useState(false);

  useEffect(() => {
    if (!biImportMode) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && biImportMode) {
        // Small delay to ensure page is fully focused
        await new Promise(r => setTimeout(r, 800));
        
        try {
          const text = await navigator.clipboard.readText();
          if (!text || text.trim().length < 50) {
            showNotification('Clipboard trống. Hãy Ctrl+A → Ctrl+C trên trang BI rồi quay lại.', 'error');
            setBiImportMode(null);
            return;
          }

          if (biImportMode === 'realtime') {
            setMarketInput(text);
            setCategoryInput(text);
            setCategoryRevenueInput(text);
            setTimeout(() => saveRealtimeData(true), 500);
            showNotification('✅ Đã tự động cập nhật dữ liệu BI Realtime!', 'success');
          } else if (biImportMode === 'luyke') {
            setClusterSummaryInput(text);
            setClusterCategoryInput(text);
            setTimeout(() => saveLuykeData(true), 500);
            showNotification('✅ Đã tự động cập nhật dữ liệu BI Luỹ kế!', 'success');
          }

          setBiImportMode(null);
          setBiWaitingPaste(false);
        } catch (err) {
          console.log('[BI Import] Auto-paste failed, showing manual button:', err);
          // Fallback: show paste button for manual click
          setBiWaitingPaste(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [biImportMode]);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length < 50) {
        showNotification('Clipboard trống hoặc dữ liệu quá ngắn. Hãy copy lại trên trang BI (⌘+A → ⌘+C).', 'error');
        return;
      }

      if (biImportMode === 'realtime') {
        setMarketInput(text);
        setCategoryInput(text);
        setCategoryRevenueInput(text);
        setTimeout(() => saveRealtimeData(true), 500);
        showNotification('✅ Đã dán dữ liệu Realtime từ BI thành công!', 'success');
      } else if (biImportMode === 'luyke') {
        setClusterSummaryInput(text);
        setClusterCategoryInput(text);
        setTimeout(() => saveLuykeData(true), 500);
        showNotification('✅ Đã dán dữ liệu Luỹ kế từ BI thành công!', 'success');
      }

      setBiImportMode(null);
      setBiWaitingPaste(false);
    } catch (err) {
      console.error('[BI Import] Clipboard error:', err);
      showNotification('Không đọc được clipboard. Hãy cho phép quyền truy cập clipboard trong cài đặt trình duyệt.', 'error');
    }
  };

  const luykeRemainingMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!luykeProcessedData?.categories) return map;

    luykeProcessedData.categories
      .filter((cat: any) => marketFilter === 'ALL' || !cat.marketName || 
        normalize(cat.marketName).includes(normalize(marketFilter)) ||
        normalize(marketFilter).includes(normalize(cat.marketName))
      )
      .forEach((cat: any) => {
        const name = cat.name.trim().toUpperCase();
        const type = cat.type;
        const key = `${name}_${type}`;
        const remaining = cat.revenue - cat.target;
        if (remaining < 0) {
          map.set(key, (map.get(key) || 0) + remaining);
        }
      });
    return map;
  }, [luykeProcessedData?.categories, marketFilter]);

  // Map for MỤC TIÊU 100%: stores { target, revenue } from BC THÁNG per category
  const luykeCatMap = useMemo(() => {
    const map = new Map<string, { target: number; revenue: number }>();
    if (!luykeProcessedData?.categories) return map;

    luykeProcessedData.categories
      .filter((cat: any) => marketFilter === 'ALL' || !cat.marketName || 
        normalize(cat.marketName).includes(normalize(marketFilter)) ||
        normalize(marketFilter).includes(normalize(cat.marketName))
      )
      .forEach((cat: any) => {
        const name = cat.name.trim().toUpperCase();
        const type = cat.type;
        const key = `${name}_${type}`;
        const existing = map.get(key);
        if (existing) {
          existing.target += cat.target;
          existing.revenue += cat.revenue;
        } else {
          map.set(key, { target: cat.target, revenue: cat.revenue });
        }
      });
    return map;
  }, [luykeProcessedData?.categories, marketFilter]);

  // Calculate days in current month and days passed for MỤC TIÊU 100%
  const mucTieu100Info = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const daysPassed = now.getDate();
    return { totalDaysInMonth, daysPassed };
  }, []);

  // compareMode MUST be declared before the useMemo that uses it (TDZ fix)
  const [compareMode, setCompareMode] = useState<'none' | 'day' | 'week' | 'month'>('none');

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
  const { staffAirConStats, staffCEStats, allStaffNames, drillDownData, drillDownDataPrev, drillRefMs, currLabel, prevLabel } = useMemo(() => {
    const empty = { staffAirConStats: [] as any[], staffCEStats: [] as any[], allStaffNames: [] as string[], drillDownData: [] as any[], drillDownDataPrev: [] as any[], drillRefMs: 0, currLabel: '', prevLabel: '' };
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
    const idxDate = findIdx(['ngày tạo', 'ngày lập', 'ngày xuất', 'ngày giao', 'ngày hoàn'], -1);
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
    const drillMapPrev = new Map<string, Map<string, Map<string, Map<string, { sl: number; dt: number; tc_dt: number }>>>>();
    const names = new Set<string>();

    // Date period helpers
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const parseRowDate = (row: any[]): Date | null => {
      if (idxDate === -1) return null;
      const raw = String(row[idxDate] || '').trim();
      if (!raw) return null;
      // Excel serial date number (e.g. 46143.407...)
      const num = parseFloat(raw);
      if (!isNaN(num) && /^\d+(\.\d+)?$/.test(raw) && num > 40000 && num < 60000) {
        return new Date((Math.floor(num) - 25569) * 86400000);
      }
      // dd/MM/yyyy
      const m = raw.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
      if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };
    // Find max date from "NGÀY TẠO" column to use as reference
    const DAY_MS = 24 * 60 * 60 * 1000;
    let maxDateMs = 0;
    if (compareMode !== 'none' && idxDate !== -1) {
      for (const row of filteredRawYcxRows) {
        const d = parseRowDate(row);
        if (d) {
          const ms = startOfDay(d).getTime();
          if (ms > maxDateMs) maxDateMs = ms;
        }
      }
    }
    // Fallback to today if no date found
    const refMs = maxDateMs || startOfDay(new Date()).getTime();

    const classifyDate = (d: Date | null): 'current' | 'prev' | 'skip' => {
      if (compareMode === 'none' || !d) return 'current';
      const dtMs = startOfDay(d).getTime();
      if (compareMode === 'day') {
        // current = ref date, prev = ref date - 1 day
        if (dtMs === refMs) return 'current';
        if (dtMs === refMs - DAY_MS) return 'prev';
        return 'skip';
      } else if (compareMode === 'week') {
        // current = [ref-6 days → ref], prev = [ref-13 days → ref-7 days]
        if (dtMs >= refMs - 6 * DAY_MS && dtMs <= refMs) return 'current';
        if (dtMs >= refMs - 13 * DAY_MS && dtMs <= refMs - 7 * DAY_MS) return 'prev';
        return 'skip';
      } else if (compareMode === 'month') {
        // current = [ref-29 days → ref], prev = [ref-59 days → ref-30 days]
        if (dtMs >= refMs - 29 * DAY_MS && dtMs <= refMs) return 'current';
        if (dtMs >= refMs - 59 * DAY_MS && dtMs <= refMs - 30 * DAY_MS) return 'prev';
        return 'skip';
      }
      return 'current';
    };

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
        const htx = idxHinhThucXuat !== -1 ? String(row[idxHinhThucXuat] || '').toLowerCase() : '';
        const isTc = htx.includes('trả góp');
        const period = classifyDate(parseRowDate(row));
        const targetMap = (period === 'prev') ? drillMapPrev : drillMap;
        if (period !== 'skip') {
          if (!targetMap.has(nhomLarge)) targetMap.set(nhomLarge, new Map());
          const subMap = targetMap.get(nhomLarge)!;
          const subKey = nhomSmall || 'Khác';
          if (!subMap.has(subKey)) subMap.set(subKey, new Map());
          const staffMap = subMap.get(subKey)!;
          if (!staffMap.has(staffName)) staffMap.set(staffName, new Map());
          const prodMap = staffMap.get(staffName)!;
          if (!prodMap.has(productName)) prodMap.set(productName, { sl: 0, dt: 0, tc_dt: 0 });
          const pd = prodMap.get(productName)!;
          pd.sl += qty; pd.dt += revenue;
          if (isTc) pd.tc_dt += revenue;
        }
      }
    }

    // Sort products by DT desc
    ceMap.forEach(s => s.products.sort((a, b) => b.dt - a.dt));

    const acAll = Array.from(acMap.values());
    const ceAll = Array.from(ceMap.values());
    const ceWithDGD = ceAll.map(s => ({ ...s, ...(dgdMap.get(s.staffName) || { mln: 0, qdh: 0, nc: 0 }) }));

    const buildDrill = (map: typeof drillMap) =>
      Array.from(map.entries()).map(([large, subMap]) => {
        const subs = Array.from(subMap.entries()).map(([subKey, staffMap]) => {
          const staffRows = Array.from(staffMap.entries()).map(([sName, prodMap]) => {
            const products = Array.from((prodMap as Map<string, { sl: number; dt: number; tc_dt: number }>).entries())
              .map(([pName, pd]) => ({ name: pName, sl: pd.sl, dt: pd.dt, tc_dt: pd.tc_dt }))
              .sort((a, b) => b.dt - a.dt);
            const brandMap = new Map<string, { sl: number; dt: number; tc_dt: number; products: { name: string; sl: number; dt: number; tc_dt: number }[] }>();
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

    const drillDownData = buildDrill(drillMap);
    const drillDownDataPrev = buildDrill(drillMapPrev);

    const fmtDate = (ms: number) => {
      const d = new Date(ms);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const ref = refMs || Date.now();
    const currLabel = compareMode === 'day'
      ? fmtDate(ref)
      : compareMode === 'week'
        ? `${fmtDate(ref - 6 * DAY_MS)} → ${fmtDate(ref)}`
        : `${fmtDate(ref - 29 * DAY_MS)} → ${fmtDate(ref)}`;
    const prevLabel = compareMode === 'day'
      ? fmtDate(ref - DAY_MS)
      : compareMode === 'week'
        ? `${fmtDate(ref - 13 * DAY_MS)} → ${fmtDate(ref - 7 * DAY_MS)}`
        : `${fmtDate(ref - 59 * DAY_MS)} → ${fmtDate(ref - 30 * DAY_MS)}`;

    return {
      staffAirConStats: (selectedStaffs.length > 0 ? acAll.filter(s => selectedStaffs.includes(s.staffName)) : acAll)
        .sort((a, b) => b.mayLanh - a.mayLanh),
      staffCEStats: (selectedStaffs.length > 0 ? ceWithDGD.filter(s => selectedStaffs.includes(s.staffName)) : ceWithDGD)
        .sort((a, b) => b.ceDT - a.ceDT),
      allStaffNames: Array.from(names).sort(),
      drillDownData,
      drillDownDataPrev,
      drillRefMs: refMs,
      currLabel,
      prevLabel,
    };
  }, [rawYcxRows, filteredRawYcxRows, selectedStaffs, compareMode]);

  const [activeTab, setActiveTab] = useState<'summary' | 'khai_thac'>('summary');
  const [showKhaiThacCols, setShowKhaiThacCols] = useState({
    doanhThu: false,
    spChinh: true,
    baoHiem: true,
    sim: true,
    dongHo: true,
    phuKien: true,
    giaDung: false
  });
  const [showRawTable, setShowRawTable] = useState(true);

  const handleCaptureTable = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const originalPadding = element.style.padding;
    const originalBg = element.style.backgroundColor;
    const originalWidth = element.style.width;
    const originalHeight = element.style.height;
    try {
      element.classList.add('capturing-target');
      document.body.classList.add('capturing-screenshot');

      // Áp dụng style tạm thời tạo viền trắng xung quanh bảng (24px) và tự động vừa khít dữ liệu
      element.style.padding = '4px';
      element.style.backgroundColor = '#ffffff';
      element.style.width = 'fit-content';
      element.style.height = 'fit-content';

      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await domToPng(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${fileName}_${userProfile?.ma_kho || 'Report'}.png`;
      link.click();
    } catch (err) {
      console.error('Lỗi chụp ảnh bảng:', err);
    } finally {
      if (element) {
        element.style.padding = originalPadding;
        element.style.backgroundColor = originalBg;
        element.style.width = originalWidth;
        element.style.height = originalHeight;
        element.classList.remove('capturing-target');
      }
      document.body.classList.remove('capturing-screenshot');
    }
  };
  const [isPending, startTransition] = useTransition();
  const [rawTablePage, setRawTablePage] = useState(0);
  const RAW_PAGE_SIZE = 100;
  const [currentTime, setCurrentTime] = useState(new Date());
  const categoriesRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const categorySLRef = useRef<HTMLDivElement>(null);
  const categoryDTRef = useRef<HTMLDivElement>(null);
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
          .from('store')
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
  const [showTargetCols, setShowTargetCols] = useState(true);  // TARGET, REAL, %HT
  const [showOrangeCols, setShowOrangeCols] = useState(true);  // CÒN LẠI, LUỸ KẾ, MỤC TIÊU 100%
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});
  const [expandedCERows, setExpandedCERows] = useState<Record<string, boolean>>({});
  const [expandedDrillRows, setExpandedDrillRows] = useState<Record<string, boolean>>({});
  const [expandedDrillBrand, setExpandedDrillBrand] = useState<Record<string, boolean>>({});
  const [isDrillCollapsed, setIsDrillCollapsed] = useState(false);
  const [isDrillAllOpen, setIsDrillAllOpen] = useState(false);
  const [selectedDrillGroups, setSelectedDrillGroups] = useState<string[]>([]);
  const [drillFilterNhomSmall, setDrillFilterNhomSmall] = useState<string[]>([]);
  const [drillFilterStaff, setDrillFilterStaff] = useState<string[]>([]);
  const [drillFilterBrand, setDrillFilterBrand] = useState<string[]>([]);
  const [activeDrillFilter, setActiveDrillFilter] = useState<string | null>(null);
  const [drillFilterSearch, setDrillFilterSearch] = useState('');
  const drillFilterBarRef = useRef<HTMLDivElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const staffKhaiThacStats = useMemo(() => {
    if (rawYcxRows.length <= 1 || filteredRawYcxRows.length === 0) return [];

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

    const statsMap = new Map<string, {
      staffName: string;
      staffId: number;
      ictQty: number;
      ictRev: number;
      ceQty: number;
      ceRev: number;
      dgdQty: number;
      dgdRev: number;
      spChinhTotalQty: number;
      spChinhTotalRev: number;
      bhQty: number;
      bhRev: number;
      simQty: number;
      simRev: number;
      dhQty: number;
      dhRev: number;
      pkCamQty: number;
      pkLoaQty: number;
      pkPinQty: number;
      pkTnQty: number;
      pkTotalQty: number;
      pkRev: number;
      gdQty: number;
      gdRev: number;
      gdMlnQty: number;
      gdNcomQty: number;
      gdNchienQty: number;
      gdQuatQty: number;
      dtThuc: number;
      dtqd: number;
      hqqd: number;
    }>();

    const isSystemName = (n: string) =>
      !n || n.toLowerCase().includes('người tạo') || n.toLowerCase() === 'admin' || n.toLowerCase() === 'administrator';

    for (const row of filteredRawYcxRows) {
      const staffName = String(row[idxStaff] || '').trim();
      if (isSystemName(staffName)) continue;

      const category = String(row[idxCategory] || '').trim();
      const nhomLarge = NHOM_HANG_MAP[category]?.large || '';
      const nhomSmallFromMap = NHOM_HANG_MAP[category]?.small || '';
      const nhomSmallValue = idxSmallCat !== -1 ? String(row[idxSmallCat] || '').trim().toUpperCase() : '';
      const nhomSmall = nhomSmallValue || nhomSmallFromMap.toUpperCase();

      const qty = Math.round(parseFloat(String(row[idxQty] || '0').replace(/,/g, '')) || 0);
      const revenue = Math.round(parseFloat(String(row[idxRevenue] || '0').replace(/,/g, '')) || 0);

      if (!statsMap.has(staffName)) {
        const match = staffName.match(/^(\d+)/);
        const staffId = match ? parseInt(match[1]) : 999999;
        statsMap.set(staffName, {
          staffName,
          staffId,
          ictQty: 0,
          ictRev: 0,
          ceQty: 0,
          ceRev: 0,
          dgdQty: 0,
          dgdRev: 0,
          spChinhTotalQty: 0,
          spChinhTotalRev: 0,
          bhQty: 0,
          bhRev: 0,
          simQty: 0,
          simRev: 0,
          dhQty: 0,
          dhRev: 0,
          pkCamQty: 0,
          pkLoaQty: 0,
          pkPinQty: 0,
          pkTnQty: 0,
          pkTotalQty: 0,
          pkRev: 0,
          gdQty: 0,
          gdRev: 0,
          gdMlnQty: 0,
          gdNcomQty: 0,
          gdNchienQty: 0,
          gdQuatQty: 0,
          dtThuc: 0,
          dtqd: 0,
          hqqd: 0,
        });
      }

      const item = statsMap.get(staffName)!;

      if (nhomLarge === 'ICT') {
        item.ictQty += qty;
        item.ictRev += revenue;
        item.spChinhTotalQty += qty;
        item.spChinhTotalRev += revenue;
      } else if (nhomLarge === 'CE') {
        item.ceQty += qty;
        item.ceRev += revenue;
        item.spChinhTotalQty += qty;
        item.spChinhTotalRev += revenue;
      } else if (nhomLarge === 'ĐIỆN GD') {
        item.dgdQty += qty;
        item.dgdRev += revenue;
        item.spChinhTotalQty += qty;
        item.spChinhTotalRev += revenue;
      } else if (nhomLarge === 'BẢO HIỂM') {
        item.bhQty += qty;
        item.bhRev += revenue;
      } else if (nhomLarge === 'SIM') {
        item.simQty += qty;
        item.simRev += revenue;
      } else if (nhomLarge === 'ĐỒNG HỒ') {
        item.dhQty += qty;
        item.dhRev += revenue;
      } else if (nhomLarge === 'PHỤ KIỆN') {
        item.pkTotalQty += qty;
        item.pkRev += revenue;

        if (nhomSmall === 'CAM') {
          item.pkCamQty += qty;
        } else if (nhomSmall === 'LOA') {
          item.pkLoaQty += qty;
        } else if (nhomSmall === 'PIN SDP') {
          item.pkPinQty += qty;
        } else if (nhomSmall === 'TN BLT' || nhomSmall === 'TN DÂY') {
          item.pkTnQty += qty;
        }
      } else if (nhomLarge === 'DCNB') {
        item.gdQty += qty;
        item.gdRev += revenue;
      }

      // Phân tích Gia dụng từ nhóm nhỏ (YCX RT) độc lập
      const nSmall = nhomSmall.toUpperCase();
      const isMln = nSmall === 'MLN';
      const isNcom = nSmall === 'NC NẮP RỜI' || nSmall === 'NC Đ.TỬ';
      const isNchien = nSmall === 'N.CHIÊN';
      const isQuat = nSmall === 'QUẠT';

      if (isMln) item.gdMlnQty += qty;
      if (isNcom) item.gdNcomQty += qty;
      if (isNchien) item.gdNchienQty += qty;
      if (isQuat) item.gdQuatQty += qty;

      if (isMln || isNcom || isNchien || isQuat) {
        if (nhomLarge !== 'DCNB') {
           item.gdQty += qty;
           item.gdRev += revenue;
        }
      }
    }

    statsMap.forEach(item => {
      item.dtThuc = item.ictRev + item.ceRev + item.dgdRev + item.bhRev + item.simRev + item.dhRev + item.pkRev + item.gdRev;
      
      const ictQD = item.ictRev;
      const ceQD = item.ceRev;
      const dgdQD = item.dgdRev + item.dgdQty * 777777;
      const bhQD = item.bhQty * 3000000;
      const simQD = item.simRev;
      const dhQD = item.dhRev;
      const pkQD = item.pkTotalQty * 1000000;
      const gdQD = item.gdQty * 500000;

      item.dtqd = ictQD + ceQD + dgdQD + bhQD + simQD + dhQD + pkQD + gdQD;
      item.hqqd = item.dtThuc > 0 ? Math.round(((item.dtqd - item.dtThuc) / item.dtThuc) * 100) : 0;
    });

    const allStats = Array.from(statsMap.values());
    const filteredStats = drillFilterStaff.length > 0
      ? allStats.filter(item => drillFilterStaff.includes(item.staffName))
      : allStats;

    return filteredStats;
  }, [rawYcxRows, filteredRawYcxRows, drillFilterStaff]);

  // Available options per filter level (dynamic from data)
  const availableNhomSmall = useMemo(() => {
    const src = selectedDrillGroups.length > 0
      ? drillDownData.filter((g: any) => selectedDrillGroups.includes(g.key))
      : drillDownData;
    const map = new Map<string, string>();
    src.forEach((g: any) => g.subs?.forEach((s: any) => { if (!map.has(s.key)) map.set(s.key, s.name); }));
    return Array.from(map.entries()).map(([k, n]) => ({ key: k, name: n })).sort((a, b) => a.name.localeCompare(b.name));
  }, [drillDownData, selectedDrillGroups]);

  const availableStaff = useMemo(() => {
    const src = selectedDrillGroups.length > 0
      ? drillDownData.filter((g: any) => selectedDrillGroups.includes(g.key))
      : drillDownData;
    const set = new Set<string>();
    src.forEach((g: any) => g.subs?.forEach((s: any) =>
      drillFilterNhomSmall.length === 0 || drillFilterNhomSmall.includes(s.key)
        ? s.staffRows?.forEach((st: any) => set.add(st.name)) : null
    ));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [drillDownData, selectedDrillGroups, drillFilterNhomSmall]);

  const availableBrand = useMemo(() => {
    const src = selectedDrillGroups.length > 0
      ? drillDownData.filter((g: any) => selectedDrillGroups.includes(g.key))
      : drillDownData;
    const set = new Set<string>();
    src.forEach((g: any) => g.subs?.forEach((s: any) => s.staffRows?.forEach((st: any) =>
      (drillFilterStaff.length === 0 || drillFilterStaff.includes(st.name))
        ? st.brands?.forEach((b: any) => set.add(b.name)) : null
    )));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [drillDownData, selectedDrillGroups, drillFilterNhomSmall, drillFilterStaff]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (!activeDrillFilter) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (drillFilterBarRef.current && !drillFilterBarRef.current.contains(e.target as Node)) {
        setActiveDrillFilter(null);
        setDrillFilterSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDrillFilter]);

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

  const generateCategoryComment = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    let commentText = `📊 REALTIME NGÀNH HÀNG ĐẾN ${timeStr}\n\n`;

    // SL categories under 100%
    const slCats = filteredCategories
      .filter(c => (c.type === 'SL' || c.type === 'ALL') && Math.round(c.rate || 0) < 100)
      .sort((a, b) => (b.rate || 0) - (a.rate || 0));

    if (slCats.length > 0) {
      commentText += `📦 NGÀNH HÀNG (SL)\n`;
      slCats.forEach(cat => {
        const remaining = cat.target - cat.revenue;
        commentText += `❌ ${cat.name}: còn ${remaining > 0 ? Math.round(remaining).toLocaleString() : 0}\n`;
      });
      commentText += `\n`;
    }

    // DT categories under 100%
    const dtCats = filteredCategories
      .filter(c => (c.type === 'DT' || c.type === 'ALL') && Math.round(c.rate || 0) < 100)
      .sort((a, b) => (b.rate || 0) - (a.rate || 0));

    if (dtCats.length > 0) {
      commentText += `💰 NGÀNH HÀNG (DT)\n`;
      dtCats.forEach(cat => {
        const remaining = cat.target - cat.revenue;
        commentText += `❌ ${cat.name}: còn ${remaining > 0 ? Math.round(remaining).toLocaleString() : 0}\n`;
      });
    }

    navigator.clipboard.writeText(commentText).then(() => {
      showNotification(`Đã copy nhận xét ngành hàng dưới 100% vào bộ nhớ tạm!`, 'success');
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

  const captureElement = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    const element = ref.current;
    if (element) {
      const originalWidth = element.style.width;
      const originalHeight = element.style.height;
      try {
        element.classList.add('capturing-target');
        document.body.classList.add('capturing-screenshot');
        
        // Tự động vừa khít dữ liệu
        element.style.width = 'fit-content';
        element.style.height = 'fit-content';

        await new Promise(resolve => setTimeout(resolve, 100));

        const dataUrl = await domToPng(element, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${filename}_${userProfile?.ma_kho || 'Report'}.png`;
        link.click();
      } catch (error) {
        console.error(`Lỗi khi chụp ảnh ${filename}:`, error);
      } finally {
        if (element) {
          element.style.width = originalWidth;
          element.style.height = originalHeight;
          element.classList.remove('capturing-target');
        }
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

  // Synchronized with DB-declared stores list via useMarket()

  const summary = useMemo(() => {
    if (!processedData.markets.length) return null;
    
    if (marketFilter !== 'ALL') {
      const match = processedData.markets.find(m => 
        normalize(m.name).includes(normalize(marketFilter)) ||
        normalize(marketFilter).includes(normalize(m.name))
      );
      if (match) return match;
    }
    
    // Try to find the "TỔNG" row first, otherwise take the first one
    const totalRow = processedData.markets.find(m => m.name === 'TỔNG' || m.isSummary);
    return totalRow || processedData.markets[0];
  }, [processedData.markets, marketFilter]);

  const filteredCategories = useMemo(() => {
    if (!processedData.categories || processedData.categories.length === 0) return [];

    // 1. Filter by global market filter
    const visibleCats = processedData.categories.filter(cat =>
      marketFilter === 'ALL' || !cat.marketName || 
      normalize(cat.marketName).includes(normalize(marketFilter)) ||
      normalize(marketFilter).includes(normalize(cat.marketName))
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


  // Don't block the entire page while loading - show cached data immediately
  // Only show a small loading indicator at the top

  return (
    <>
    <div className="min-h-screen bg-[#f8fafc]" style={{ fontFamily: '"Inter", sans-serif' }}>
      {/* Non-blocking loading indicator */}
      {isLoadingRealtime && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-slate-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse w-full" 
               style={{ animation: 'loading-slide 1s ease-in-out infinite' }} />
        </div>
      )}
      {/* Professional Header - Hidden */}
      <div className="hidden bg-white border-b border-slate-200 px-8 py-5 sticky top-[116px] z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-400 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Activity size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Hệ thống trực tuyến</span>
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Sức khỏe siêu thị</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">
                {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
            
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-500" />
                <span className="text-sm font-black font-oswald tracking-wider text-slate-800">
                  {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-100" />
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className={isLoadingRealtime ? 'animate-spin text-indigo-500' : 'text-emerald-500'} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  {lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '---'}
                </span>
              </div>
              <button
                onClick={() => loadData()}
                className="ml-2 w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all duration-300"
              >
                <RefreshCw size={16} className={isLoadingRealtime ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-8 p-8">
        {/* Left Vertical Navigation */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="flex flex-col gap-3 py-4 sticky top-[116px]">
            
            {[
              { id: 'summary', label: 'TỔNG QUAN', icon: LayoutGrid, color: 'text-indigo-600' },
              { id: 'khai_thac', label: 'DASHBOARD YCX', icon: Activity, color: 'text-emerald-600' }
            ].map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => startTransition(() => {
                    setActiveTab(item.id as any);
                    if (item.id === 'khai_thac') setRawTablePage(0);
                  })}
                  className={`flex items-center gap-4 px-6 py-5 rounded-[22px] border transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white border-indigo-500 shadow-[0_15px_35px_-10px_rgba(79,70,229,0.15)] -translate-y-0.5 translate-x-1' 
                      : 'bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-indigo-50 ' + item.color : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                  }`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[15px] font-black tracking-tight uppercase ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area - Right Side */}
        <div className="flex-1 min-w-0 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[32px] border border-slate-100"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lời chào</h3>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {greeting}, <span className="text-indigo-600">{userProfile?.username?.split(' ')[0]}</span>
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mục tiêu ngày</p>
                <span className="text-3xl font-black text-indigo-600 font-oswald tracking-tighter">{Math.round(summary?.percentHT || 0)}%</span>
              </div>
            </div>
            <div className="h-3 bg-slate-50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(Math.round(summary?.percentHT || 0), 100)}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
              />
            </div>
          </motion.div>


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
            <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-100 no-capture">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <LayoutGrid size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-[24px] font-bold text-slate-800 uppercase tracking-tight">
                        {userProfile?.ten_sieu_thi || activeStore || 'Tổng quan hiệu quả'}
                      </h2>
                      {/* Temporarily hidden */}
                      {false && (
                      <div className="relative">
                        <button
                          onClick={async () => {
                            // Request clipboard permission during user gesture
                            try { await navigator.clipboard.readText(); } catch {}
                            setBiImportMode('realtime');
                            window.open('https://bi.thegioididong.com/khoi-ban-hang-sub?id=73920&tab=bcth&rt=1&dm=1', '_blank');
                            showNotification('📄 Đang mở trang BI... Hãy Ctrl+A → Ctrl+C rồi quay lại, dữ liệu sẽ tự động cập nhật!', 'success');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:from-amber-500 hover:to-amber-600 transition-all shadow-lg shadow-amber-200/50 active:scale-95 border-t border-white/20"
                        >
                          <Globe size={16} />
                          Cập nhật BI Realtime
                        </button>
                      </div>
                      )}
                      {userProfile?.role === 'admin' && (
                        <button
                          onClick={() => setIsStoreSelectorOpen(!isStoreSelectorOpen)}
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Lọc siêu thị"
                        >
                          <Filter size={18} className="text-slate-400" />
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
                .map((declaredMarket, mIdx) => {
                  // Find matching parsed store from processedData.markets (parsed from pasted REALTIME DT BI text)
                  const parsedMarket = processedData.markets.find(pm => 
                    normalize(pm.name).includes(normalize(declaredMarket.name)) ||
                    normalize(declaredMarket.name).includes(normalize(pm.name))
                  ) || {
                    name: declaredMarket.name,
                    targetQD: 0,
                    actualVirtual: 0,
                    percentHT: 0,
                    installmentRate: 0,
                    luotBillBanHang: 0,
                    luotBillThuHo: 0
                  };

                  return (
                    <div key={mIdx} className="bg-white p-5 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 px-2 border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${(parsedMarket as any).isSummary || parsedMarket.name === 'TỔNG' ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.3)]'}`} />
                          <h3 className="text-[28px] font-black text-slate-800 uppercase tracking-wider">{declaredMarket.name}</h3>
                        </div>
                        <div className="text-[12px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                          {Math.round(parsedMarket.percentHT || 0)}% HT
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        <StatCard
                          title="TAGET QĐ"
                          value={formatCurrencyUnit(parsedMarket.targetQD || 0)}
                          subValue=""
                          icon={Target}
                          color="rose"
                          isColored={true}
                        />
                        <StatCard
                          title="DOANH THU QUY ĐỔI"
                          value={formatCurrencyUnit(parsedMarket.actualVirtual || 0)}
                          subValue=""
                          icon={TrendingUp}
                          color="indigo"
                          isColored={true}
                        />
                        <StatCard
                          title="%HT"
                          value={`${Math.round(parsedMarket.percentHT || 0)}%`}
                          subValue=""
                          icon={Activity}
                          color="emerald"
                          isColored={true}
                        />
                        <StatCard
                          title="Tỷ Trọng Trả Góp"
                          value={`${(parsedMarket.installmentRate || 0).toFixed(1)}%`}
                          subValue=""
                          icon={ShoppingBag}
                          color="amber"
                          isColored={true}
                        />
                        <StatCard
                          title="Lượt Bill Bán Hàng"
                          value={Math.round(parsedMarket.luotBillBanHang || 0).toLocaleString()}
                          subValue=""
                          icon={Zap}
                          color="orange"
                          isColored={true}
                        />
                        <StatCard
                          title="Lượt Bill Thu Hộ"
                          value={Math.round(parsedMarket.luotBillThuHo || 0).toLocaleString()}
                          subValue=""
                          icon={CreditCard}
                          color="blue"
                          isColored={true}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Categories Tables moved to Summary */}
            <div className="space-y-6 pt-8 border-t border-slate-200">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-[27px] font-black text-slate-900 uppercase tracking-tight text-center">Chi tiết ngành hàng</h2>
                  <p className="text-[17px] text-slate-500">Theo dõi tiến độ hoàn thành mục tiêu ngành hàng</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 no-capture">
                    <button
                      onClick={() => setShowTargetCols(!showTargetCols)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase transition-all duration-300 border active:scale-95 ${showTargetCols
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${showTargetCols ? 'bg-yellow-500' : 'bg-slate-400'}`}></div>
                      TARGET · REAL · %HT · CÒN LẠI
                    </button>
                    <button
                      onClick={() => setShowOrangeCols(!showOrangeCols)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase transition-all duration-300 border active:scale-95 ${showOrangeCols
                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${showOrangeCols ? 'bg-orange-500' : 'bg-slate-400'}`}></div>
                      LUỸ KẾ · MỤC TIÊU
                    </button>
                    <button
                      onClick={generateCategoryComment}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase transition-all duration-300 border active:scale-95 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                    >
                      <MessageSquare size={14} />
                      NHẬN XÉT
                    </button>
                    <button
                      onClick={captureCategories}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 no-capture"
                    >
                      <Camera size={16} />
                      <span>Chụp ảnh</span>
                    </button>
                  </div>
                </div>
              </div>

              <div ref={categoriesRef} className="bg-white rounded-3xl overflow-hidden border border-slate-200">
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Table: SLLK */}
                  <div ref={categorySLRef} className="border border-slate-300 overflow-hidden">
                    <div className="bg-white p-[15px]">
                      <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                        <div className="p-4 flex flex-col items-center justify-center">
                          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">NGÀNH HÀNG (SL)</h2>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">REALTIME</span>
                            <button
                              onClick={() => captureElement(categorySLRef, 'NganhHang_SL_Realtime')}
                              className="no-capture p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Chụp ảnh bảng Ngành hàng SL"
                            >
                              <Camera size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col items-center justify-center">
                          <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN</h2>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                            ĐẠT : {filteredCategories.filter(c => c.type === 'SL' || c.type === 'ALL').filter(c => Math.round(c.rate || 0) >= 100).length}/{filteredCategories.filter(c => c.type === 'SL' || c.type === 'ALL').length}
                          </span>
                        </div>
                      </div>

                      {showSllkComment && (
                        <div className="my-4 no-capture">
                          <textarea
                            value={sllkComment}
                            onChange={(e) => setSllkComment(e.target.value)}
                            placeholder="Nhập nhận xét cho bảng SLLK..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[60px] screenshot-comment"
                          />
                        </div>
                      )}

                      <div className="overflow-hidden">
                        <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300">
                          <thead>
                            <tr className="text-slate-900 h-[60px]">
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981]">NGÀNH HÀNG</th>
                              {showTargetCols && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">TARGET</th>}
                              {showTargetCols && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">REAL</th>}
                              {showTargetCols && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">%HT</th>}
                              {showTargetCols && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">CÒN LẠI</th>}
                              {showOrangeCols && showLuykeColumn && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[60px]">LUỸ KẾ</th>}
                              {showOrangeCols && <th className="px-2 py-0 text-[11px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[70px] leading-tight">MỤC TIÊU<br/>100%/NGÀY</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCategories
                              .filter(c => c.type === 'SL' || c.type === 'ALL')
                              .sort((a, b) => (b.rate || 0) - (a.rate || 0))
                              .map((cat, idx) => {
                                const lkKey = `${cat.name.trim().toUpperCase()}_${cat.type}`;
                                const lkRemaining = luykeRemainingMap.get(lkKey);
                                const remaining = cat.target - cat.revenue;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors h-[40px]">
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">{idx + 1}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold uppercase border-r border-b border-slate-300 text-black">{cat.name}</td>
                                    {showTargetCols && <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>}
                                    {showTargetCols && <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>}
                                    {showTargetCols && <td className={`px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 ${Math.round(cat.rate || 0) >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.round(cat.rate || 0)}%</td>}
                                    {showTargetCols && <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>}
                                    {showOrangeCols && showLuykeColumn && (
                                      <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{lkRemaining ? Math.abs(Math.round(lkRemaining)).toLocaleString() : ""}</td>
                                    )}
                                    {showOrangeCols && (() => {
                                      const lkCat = luykeCatMap.get(lkKey);
                                      if (!lkCat || lkCat.target === 0) return <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-400"></td>;
                                      const mucTieu = Math.round((lkCat.target / mucTieu100Info.totalDaysInMonth) * mucTieu100Info.daysPassed - lkCat.revenue);
                                      return <td className={`px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 ${mucTieu > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{mucTieu > 0 ? Math.round(mucTieu).toLocaleString() : ''}</td>;
                                    })()}
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Table: DTLK */}
                  <div ref={categoryDTRef} className="border border-slate-300 overflow-hidden">
                    <div className="bg-white p-[15px]">
                      <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                        <div className="p-4 flex flex-col items-center justify-center">
                          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">NGÀNH HÀNG (DT)</h2>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">REALTIME</span>
                            <button
                              onClick={() => captureElement(categoryDTRef, 'NganhHang_DT_Realtime')}
                              className="no-capture p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Chụp ảnh bảng Ngành hàng DT"
                            >
                              <Camera size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col items-center justify-center">
                          <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN</h2>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                            ĐẠT : {filteredCategories.filter(c => c.type === 'DT' || c.type === 'ALL').filter(c => Math.round(c.rate || 0) >= 100).length}/{filteredCategories.filter(c => c.type === 'DT' || c.type === 'ALL').length}
                          </span>
                        </div>
                      </div>

                      {showDtlkComment && (
                        <div className="my-4 no-capture">
                          <textarea
                            value={dtlkComment}
                            onChange={(e) => setDtlkComment(e.target.value)}
                            placeholder="Nhập nhận xét cho bảng DTLK..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[60px] screenshot-comment"
                          />
                        </div>
                      )}

                      <div className="overflow-hidden">
                        <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300">
                          <thead>
                            <tr className="text-slate-900 h-[60px]">
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                              <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981]">NGÀNH HÀNG</th>
                              {showTargetCols && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">TARGET</th>}
                              {showTargetCols && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">REAL</th>}
                              {showTargetCols && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">%HT</th>}
                              {showTargetCols && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">CÒN LẠI</th>}
                              {showOrangeCols && showLuykeColumn && <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[60px]">LUỸ KẾ</th>}
                              {showOrangeCols && <th className="px-2 py-0 text-[11px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[70px] leading-tight">MỤC TIÊU<br/>100%/NGÀY</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCategories
                              .filter(c => c.type === 'DT' || c.type === 'ALL')
                              .sort((a, b) => (b.rate || 0) - (a.rate || 0))
                              .map((cat, idx) => {
                                const lkKey = `${cat.name.trim().toUpperCase()}_${cat.type === 'ALL' ? 'DT' : cat.type}`;
                                const lkRemaining = luykeRemainingMap.get(lkKey) || luykeRemainingMap.get(`${cat.name.trim().toUpperCase()}_ALL`);
                                const remaining = cat.target - cat.revenue;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors h-[40px]">
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">{idx + 1}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold uppercase border-r border-b border-slate-300 text-black">{cat.name}</td>
                                    {showTargetCols && <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>}
                                    {showTargetCols && <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>}
                                    {showTargetCols && <td className={`px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 ${Math.round(cat.rate || 0) >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.round(cat.rate || 0)}%</td>}
                                    {showTargetCols && <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>}
                                    {showOrangeCols && showLuykeColumn && (
                                      <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{lkRemaining ? Math.abs(Math.round(lkRemaining)).toLocaleString() : ""}</td>
                                    )}
                                    {showOrangeCols && (() => {
                                      const lkCat = luykeCatMap.get(lkKey) || luykeCatMap.get(`${cat.name.trim().toUpperCase()}_ALL`);
                                      if (!lkCat || lkCat.target === 0) return <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-400"></td>;
                                      const mucTieu = Math.round((lkCat.target / mucTieu100Info.totalDaysInMonth) * mucTieu100Info.daysPassed - lkCat.revenue);
                                      return <td className={`px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 ${mucTieu > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{mucTieu > 0 ? Math.round(mucTieu).toLocaleString() : ''}</td>;
                                    })()}
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

            {/* YCX NHÂN VIÊN Upload Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ycxFileName ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <FileSpreadsheet size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-[12px] font-black uppercase tracking-wide block ${ycxFileName ? 'text-teal-700' : 'text-slate-500'}`}>YCX NHÂN VIÊN</span>
                    {ycxFileName ? (
                      <p className="text-[10px] text-slate-400 truncate max-w-xl">{ycxFileName}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">Nhấp để tải lên file Excel YCX nhân viên</p>
                    )}
                  </div>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
                </label>
                {ycxFileName && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setYcxFileName('');
                      setYcxData('');
                    }}
                    className="ml-3 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 cursor-pointer border border-slate-100"
                    title="Xoá dữ liệu YCX"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* CHI TIẾT NGÀNH HÀNG - Drill-down table */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-[18px] font-black text-slate-900 tracking-tight">
                      {compareMode !== 'none' ? 'SO SÁNH CÙNG KỲ' : 'CHI TIẾT NGÀNH HÀNG'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Thống kê chi tiết theo ngành hàng và nhóm hàng.</p>
                  </div>
                  {/* Comparison period buttons & Capture button */}
                  <div className="flex items-center gap-2 no-capture">
                    <button
                      onClick={() => handleCaptureTable('chi-tiet-nganh-hang-table-container', 'chi_tiet_nganh_hang')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow-sm"
                      title="Chụp ảnh bảng này"
                    >
                      <Camera size={13} className="text-slate-500 hover:text-indigo-600" />
                      <span>Chụp ảnh</span>
                    </button>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                      {([
                        { key: 'none', label: 'Mặc định' },
                        { key: 'day', label: 'Cùng ngày', sub: 'Hôm nay vs Hôm qua' },
                        { key: 'week', label: 'Cùng tuần', sub: 'Tuần này vs Tuần trước' },
                        { key: 'month', label: 'Cùng tháng', sub: 'Tháng này vs Tháng trước' },
                      ] as const).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setCompareMode(opt.key)}
                          title={'sub' in opt ? opt.sub : ''}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${compareMode === opt.key
                              ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                              : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {compareMode !== 'none' && (
                  <div className="flex items-center gap-2 mb-3 text-[11px]">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold border border-indigo-100">📅 {currLabel}</span>
                    <span className="text-slate-400">vs</span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold border border-slate-200">📅 {prevLabel}</span>
                    {drillDownDataPrev.length === 0 && (
                      <span className="text-rose-500 text-[10px] italic">⚠ Không có dữ liệu kỳ trước trong dataset</span>
                    )}
                  </div>
                )}

                {/* Filter bar - reference image style */}
                <div ref={drillFilterBarRef} className="flex flex-wrap items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 relative">
                  <div className="flex items-center gap-1.5 text-[12px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                    <GripVertical size={12} />
                    THỨ TỰ DRILL-DOWN:
                  </div>

                  {/* Level pills */}
                  {[
                    {
                      key: 'nganh', label: 'Ngành hàng', icon: LayoutGrid,
                      activeCount: selectedDrillGroups.length, color: 'pink',
                      bgActive: 'bg-pink-100 border-pink-300', bgInactive: 'bg-white border-slate-200',
                      textActive: 'text-pink-700', textInactive: 'text-slate-600',
                      filterActive: 'text-orange-500', filterInactive: 'text-slate-300',
                      options: drillDownData.map((g: any) => ({ key: g.key, name: g.name })),
                      selected: selectedDrillGroups,
                      toggleFn: (k: string) => setSelectedDrillGroups(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                      selectAll: () => setSelectedDrillGroups(drillDownData.map((g: any) => g.key)),
                      clearAll: () => setSelectedDrillGroups([]),
                      toggleColor: 'bg-indigo-600',
                    },
                    {
                      key: 'nhom', label: 'Nhóm hàng', icon: LayoutGrid,
                      activeCount: drillFilterNhomSmall.length, color: 'blue',
                      bgActive: 'bg-blue-100 border-blue-300', bgInactive: 'bg-white border-slate-200',
                      textActive: 'text-blue-700', textInactive: 'text-slate-600',
                      filterActive: 'text-blue-500', filterInactive: 'text-slate-300',
                      options: availableNhomSmall,
                      selected: drillFilterNhomSmall,
                      toggleFn: (k: string) => setDrillFilterNhomSmall(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                      selectAll: () => setDrillFilterNhomSmall(availableNhomSmall.map(o => o.key)),
                      clearAll: () => setDrillFilterNhomSmall([]),
                      toggleColor: 'bg-indigo-600',
                    },
                    {
                      key: 'nhanvien', label: 'Nhân viên', icon: User,
                      activeCount: drillFilterStaff.length, color: 'yellow',
                      bgActive: 'bg-yellow-100 border-yellow-300', bgInactive: 'bg-white border-slate-200',
                      textActive: 'text-yellow-700', textInactive: 'text-slate-600',
                      filterActive: 'text-yellow-500', filterInactive: 'text-slate-300',
                      options: availableStaff.map(s => ({ key: s, name: s })),
                      selected: drillFilterStaff,
                      toggleFn: (k: string) => setDrillFilterStaff(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                      selectAll: () => setDrillFilterStaff(availableStaff),
                      clearAll: () => setDrillFilterStaff([]),
                      toggleColor: 'bg-indigo-600',
                    },
                    {
                      key: 'hang', label: 'Hãng SX', icon: Building2,
                      activeCount: drillFilterBrand.length, color: 'green',
                      bgActive: 'bg-emerald-100 border-emerald-300', bgInactive: 'bg-white border-slate-200',
                      textActive: 'text-emerald-700', textInactive: 'text-slate-600',
                      filterActive: 'text-emerald-500', filterInactive: 'text-slate-300',
                      options: availableBrand.map(b => ({ key: b, name: b })),
                      selected: drillFilterBrand,
                      toggleFn: (k: string) => setDrillFilterBrand(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                      selectAll: () => setDrillFilterBrand(availableBrand),
                      clearAll: () => setDrillFilterBrand([]),
                      toggleColor: 'bg-indigo-600',
                    },
                    {
                      key: 'sanpham', label: 'Tên sản phẩm', icon: Package,
                      activeCount: 0, color: 'purple',
                      bgActive: 'bg-purple-100 border-purple-300', bgInactive: 'bg-white border-slate-200',
                      textActive: 'text-purple-700', textInactive: 'text-slate-600',
                      filterActive: 'text-purple-500', filterInactive: 'text-slate-300',
                      options: [], selected: [], toggleFn: () => { }, selectAll: () => { }, clearAll: () => { },
                      toggleColor: 'bg-indigo-600',
                    },
                  ].map((level) => {
                    const IconComp = level.icon;
                    const isActive = level.activeCount > 0;
                    const isOpen = activeDrillFilter === level.key;
                    const filtered = level.options.filter(o =>
                      !drillFilterSearch || o.name.toLowerCase().includes(drillFilterSearch.toLowerCase())
                    );
                    return (
                      <div key={level.key} className="relative">
                        {/* Pill button */}
                        <button
                          onClick={() => {
                            setActiveDrillFilter(isOpen ? null : level.key);
                            setDrillFilterSearch('');
                          }}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[13px] font-bold transition-all select-none whitespace-nowrap shadow-sm
                            ${isActive ? `${level.bgActive} ${level.textActive}` : `${level.bgInactive} ${level.textInactive} hover:border-slate-300`}`}
                        >
                          <IconComp size={13} />
                          <span>{level.label}</span>
                          {level.activeCount > 0 && (
                            <span className="ml-0.5 bg-orange-500 text-white rounded-full text-[11px] w-5 h-5 flex items-center justify-center font-black">{level.activeCount}</span>
                          )}
                          <Filter size={12} className={`ml-0.5 ${isActive ? level.filterActive : level.filterInactive}`} />
                        </button>

                        {/* Dropdown panel */}
                        {isOpen && level.options.length > 0 && (
                          <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 w-[280px] overflow-hidden">
                            {/* Search box */}
                            <div className="p-3 pb-0">
                              <div className="flex items-center gap-2 border-2 border-indigo-400 rounded-xl px-3 py-2 bg-white">
                                <Filter size={15} className="text-indigo-400 flex-shrink-0" />
                                <input
                                  autoFocus
                                  value={drillFilterSearch}
                                  onChange={e => setDrillFilterSearch(e.target.value)}
                                  placeholder={`Tìm kiếm ${level.label}...`}
                                  className="flex-1 text-[14px] text-slate-600 outline-none bg-transparent placeholder-slate-400"
                                />
                              </div>
                            </div>
                            {/* Select / Deselect all */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                              <button
                                onClick={() => { level.selectAll(); }}
                                className="text-[13px] font-bold text-indigo-600 hover:text-indigo-800"
                              >Chọn tất cả</button>
                              <button
                                onClick={() => { level.clearAll(); }}
                                className="text-[13px] font-bold text-slate-500 hover:text-slate-700"
                              >Bỏ chọn</button>
                            </div>
                            {/* Items list with toggle switch */}
                            <div className="max-h-[280px] overflow-y-auto">
                              {filtered.map(opt => {
                                const isOn = level.selected.includes(opt.key);
                                return (
                                  <button
                                    key={opt.key}
                                    onClick={() => level.toggleFn(opt.key)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50"
                                  >
                                    <span className="text-[15px] font-bold text-slate-800 text-left">{opt.name}</span>
                                    {/* iOS toggle switch */}
                                    <div className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${isOn ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                  </button>
                                );
                              })}
                              {filtered.length === 0 && (
                                <div className="px-4 py-6 text-center text-[11px] text-slate-400 italic">Không tìm thấy kết quả</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Clear filter */}
                  {(selectedDrillGroups.length > 0 || drillFilterNhomSmall.length > 0 || drillFilterStaff.length > 0 || drillFilterBrand.length > 0) && (
                    <button
                      onClick={() => {
                        setSelectedDrillGroups([]);
                        setDrillFilterNhomSmall([]);
                        setDrillFilterStaff([]);
                        setDrillFilterBrand([]);
                        setActiveDrillFilter(null);
                      }}
                      className="ml-auto flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 whitespace-nowrap"
                    >
                      <RotateCcw size={11} /> Xóa bộ lọc
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto bg-white" id="chi-tiet-nganh-hang-table-container">
                <table className="w-full border-collapse border border-slate-200 [&_th]:border-r [&_th]:border-slate-200 [&_td]:border-r [&_td]:border-slate-200 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-left min-w-[240px]">NGÀNH HÀNG</th>
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right w-24">S.LƯỢNG</th>
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-slate-400 bg-slate-50/50 uppercase tracking-wider text-center w-20">{prevLabel}</th>}
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-rose-500 bg-rose-50/30 uppercase tracking-wider text-center w-16">Tăng/Giảm</th>}
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right w-24">D.THU</th>
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-slate-400 bg-slate-50/50 uppercase tracking-wider text-center w-20">{prevLabel}</th>}
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-rose-500 bg-rose-50/30 uppercase tracking-wider text-center w-16">Tăng/Giảm</th>}
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right w-24">DTQĐ</th>
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-slate-400 bg-slate-50/50 uppercase tracking-wider text-center w-20">{prevLabel}</th>}
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-rose-500 bg-rose-50/30 uppercase tracking-wider text-center w-16">Tăng/Giảm</th>}
                      <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right w-24">GTĐH</th>
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-slate-400 bg-slate-50/50 uppercase tracking-wider text-center w-20">{prevLabel}</th>}
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-rose-500 bg-rose-50/30 uppercase tracking-wider text-center w-16">Tăng/Giảm</th>}
                      <th className="py-3 px-4 text-[11px] font-black text-amber-600 uppercase tracking-wider text-right w-24">% T.CHẬM</th>
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-slate-400 bg-slate-50/50 uppercase tracking-wider text-center w-20">{prevLabel}</th>}
                      {compareMode !== 'none' && <th className="py-3 px-2 text-[10px] font-black text-rose-500 bg-rose-50/30 uppercase tracking-wider text-center w-16">Tăng/Giảm</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const visibleData = selectedDrillGroups.length > 0
                        ? drillDownData.filter((g: any) => selectedDrillGroups.includes(g.key))
                        : drillDownData;
                      return visibleData.length > 0 ? visibleData.map((group: any) => {
                        const groupKey = group.key;
                        const isGroupOpen = isDrillAllOpen
                          ? expandedDrillRows[groupKey] !== false
                          : expandedDrillRows[groupKey] === true;
                        const showGroup = !isDrillCollapsed && isGroupOpen;
                        const groupPrev = compareMode !== 'none' ? drillDownDataPrev.find((g: any) => g.key === group.key) : null;
                        return (
                          <React.Fragment key={groupKey}>
                            <tr
                              className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => { setExpandedDrillRows(prev => ({ ...prev, [groupKey]: !isGroupOpen })); }}
                            >
                              <td className="py-3 px-4 text-left">
                                <div className="flex items-center gap-2">
                                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isGroupOpen ? '' : '-rotate-90'}`} />
                                  <span className="text-[13px] font-black text-slate-800">{group.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right text-[13px] font-bold text-slate-700">{group.sl}</td>
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/50 border-l border-slate-100 text-[11px] font-bold text-slate-400">
                                  {groupPrev ? groupPrev.sl.toLocaleString() : "-"}
                                </td>
                              )}
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/30 border-l border-slate-100">
                                  {groupPrev ? fmtDiff(group.sl, groupPrev.sl) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              <td className="py-3 px-4 text-right text-[13px] font-bold text-slate-700">{fmtTr(group.dt)}</td>
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/50 border-l border-slate-100 text-[11px] font-bold text-slate-400">
                                  {groupPrev ? fmtTr(groupPrev.dt) : "-"}
                                </td>
                              )}
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/30 border-l border-slate-100">
                                  {groupPrev ? fmtDiff(group.dt, groupPrev.dt, true) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              <td className="py-3 px-4 text-right text-[13px] font-bold text-indigo-600">{fmtTr(group.dt)}</td>
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/50 border-l border-slate-100 text-[11px] font-bold text-slate-400">
                                  {groupPrev ? fmtTr(groupPrev.dt) : "-"}
                                </td>
                              )}
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/30 border-l border-slate-100">
                                  {groupPrev ? fmtDiff(group.dt, groupPrev.dt, true) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              <td className="py-3 px-4 text-right text-[13px] font-bold text-slate-600">{fmtTr(group.sl > 0 ? group.dt / group.sl : 0)}</td>
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/50 border-l border-slate-100 text-[11px] font-bold text-slate-400">
                                  {groupPrev ? fmtTr(groupPrev.sl > 0 ? groupPrev.dt / groupPrev.sl : 0) : "-"}
                                </td>
                              )}
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/30 border-l border-slate-100">
                                  {groupPrev ? fmtDiff(group.sl > 0 ? group.dt / group.sl : 0, groupPrev.sl > 0 ? groupPrev.dt / groupPrev.sl : 0, true) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              <td className="py-3 px-4 text-right text-[13px] font-black text-amber-600">{fmtPct(group.tc_dt, group.dt)}</td>
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/50 border-l border-slate-100 text-[11px] font-bold text-slate-400">
                                  {groupPrev ? fmtPct(groupPrev.tc_dt, groupPrev.dt) : "-"}
                                </td>
                              )}
                              {compareMode !== 'none' && (
                                <td className="py-3 px-2 text-center bg-slate-50/30 border-l border-slate-100">
                                  {groupPrev ? fmtDiff(group.tc_dt, groupPrev.tc_dt, true) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                            </tr>

                            {showGroup && group.subs?.map((sub: any, si: number) => {
                              const subKey = `${groupKey}.${sub.key}`;
                              const isSubOpen = isDrillAllOpen
                                ? expandedDrillRows[subKey] !== false
                                : expandedDrillRows[subKey] === true;
                              const showSub = !isDrillCollapsed && isSubOpen;
                              const subPrev = groupPrev?.subs?.find((ps: any) => ps.key === sub.key);
                              return (
                                <React.Fragment key={subKey}>
                                  <tr
                                    className="border-b border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors bg-slate-50/50"
                                    onClick={() => { setExpandedDrillRows(prev => ({ ...prev, [subKey]: !isSubOpen })); }}
                                  >
                                    <td className="py-2.5 px-4 pl-10 text-left">
                                      <div className="flex items-center gap-2">
                                        <ChevronDown size={12} className={`text-blue-400 transition-transform duration-200 flex-shrink-0 ${isSubOpen ? '' : '-rotate-90'}`} />
                                        <span className="text-[12px] font-bold text-blue-600">{sub.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-4 text-right text-[12px] font-bold text-slate-600">{sub.sl}</td>
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/50 border-l border-slate-100 text-[10px] font-bold text-slate-400">
                                        {subPrev ? subPrev.sl.toLocaleString() : "-"}
                                      </td>
                                    )}
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/30 border-l border-slate-100">
                                        {subPrev ? fmtDiff(sub.sl, subPrev.sl) : <span className="text-slate-300">-</span>}
                                      </td>
                                    )}
                                    <td className="py-2.5 px-4 text-right text-[12px] font-bold text-slate-600">{fmtTr(sub.dt)}</td>
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/50 border-l border-slate-100 text-[10px] font-bold text-slate-400">
                                        {subPrev ? fmtTr(subPrev.dt) : "-"}
                                      </td>
                                    )}
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/30 border-l border-slate-100">
                                        {subPrev ? fmtDiff(sub.dt, subPrev.dt, true) : <span className="text-slate-300">-</span>}
                                      </td>
                                    )}
                                    <td className="py-2.5 px-4 text-right text-[12px] font-bold text-indigo-500">{fmtTr(sub.dt)}</td>
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/50 border-l border-slate-100 text-[10px] font-bold text-slate-400">
                                        {subPrev ? fmtTr(subPrev.dt) : "-"}
                                      </td>
                                    )}
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/30 border-l border-slate-100">
                                        {subPrev ? fmtDiff(sub.dt, subPrev.dt, true) : <span className="text-slate-300">-</span>}
                                      </td>
                                    )}
                                    <td className="py-2.5 px-4 text-right text-[12px] font-bold text-slate-500">{fmtTr(sub.sl > 0 ? sub.dt / sub.sl : 0)}</td>
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/50 border-l border-slate-100 text-[10px] font-bold text-slate-400">
                                        {subPrev ? fmtTr(subPrev.sl > 0 ? subPrev.dt / subPrev.sl : 0) : "-"}
                                      </td>
                                    )}
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/30 border-l border-slate-100">
                                        {subPrev ? fmtDiff(sub.sl > 0 ? sub.dt / sub.sl : 0, subPrev.sl > 0 ? subPrev.dt / subPrev.sl : 0, true) : <span className="text-slate-300">-</span>}
                                      </td>
                                    )}
                                    <td className="py-2.5 px-4 text-right text-[12px] font-black text-amber-500">{fmtPct(sub.tc_dt, sub.dt)}</td>
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/50 border-l border-slate-100 text-[10px] font-bold text-slate-400">
                                        {subPrev ? fmtPct(subPrev.tc_dt, subPrev.dt) : "-"}
                                      </td>
                                    )}
                                    {compareMode !== 'none' && (
                                      <td className="py-2 px-2 text-center bg-slate-100/30 border-l border-slate-100">
                                        {subPrev ? fmtDiff(sub.tc_dt, subPrev.tc_dt, true) : <span className="text-slate-300">-</span>}
                                      </td>
                                    )}
                                  </tr>

                                  {showSub && sub.staffRows?.filter((staff: any) => drillFilterStaff.length === 0 || drillFilterStaff.includes(staff.name)).map((staff: any, sti: number) => {
                                    const staffKey = `${subKey}.${sti}`;
                                    const isStaffOpen = isDrillAllOpen
                                      ? expandedDrillRows[staffKey] !== false
                                      : expandedDrillRows[staffKey] === true;
                                    const showStaff = !isDrillCollapsed && isStaffOpen;
                                    const staffPrev = subPrev?.staffRows?.find((pst: any) => pst.name === staff.name);
                                    return (
                                      <React.Fragment key={staffKey}>
                                        <tr
                                          className="border-b border-slate-50 cursor-pointer hover:bg-orange-50/30 transition-colors"
                                          onClick={() => { setExpandedDrillRows(prev => ({ ...prev, [staffKey]: !isStaffOpen })); }}
                                        >
                                          <td className="py-2 px-4 pl-16 text-left">
                                            <div className="flex items-center gap-2">
                                              <ChevronDown size={11} className={`text-orange-400 transition-transform duration-200 flex-shrink-0 ${isStaffOpen ? '' : '-rotate-90'}`} />
                                              <span className="text-[11px] font-bold text-orange-600">{staff.name}</span>
                                            </div>
                                          </td>
                                          <td className="py-2 px-4 text-right text-[11px] font-medium text-slate-500">{staff.sl}</td>
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/40 border-l border-slate-50 text-[10px] font-medium text-slate-400">
                                              {staffPrev ? staffPrev.sl.toLocaleString() : "-"}
                                            </td>
                                          )}
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/20 border-l border-slate-50">
                                              {staffPrev ? fmtDiff(staff.sl, staffPrev.sl) : <span className="text-slate-300">-</span>}
                                            </td>
                                          )}
                                          <td className="py-2 px-4 text-right text-[11px] font-medium text-slate-500">{fmtTr(staff.dt)}</td>
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/40 border-l border-slate-50 text-[10px] font-medium text-slate-400">
                                              {staffPrev ? fmtTr(staffPrev.dt) : "-"}
                                            </td>
                                          )}
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/20 border-l border-slate-50">
                                              {staffPrev ? fmtDiff(staff.dt, staffPrev.dt, true) : <span className="text-slate-300">-</span>}
                                            </td>
                                          )}
                                          <td className="py-2 px-4 text-right text-[11px] font-medium text-indigo-400">{fmtTr(staff.dt)}</td>
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/40 border-l border-slate-50 text-[10px] font-medium text-slate-400">
                                              {staffPrev ? fmtTr(staffPrev.dt) : "-"}
                                            </td>
                                          )}
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/20 border-l border-slate-50">
                                              {staffPrev ? fmtDiff(staff.dt, staffPrev.dt, true) : <span className="text-slate-300">-</span>}
                                            </td>
                                          )}
                                          <td className="py-2 px-4 text-right text-[11px] font-medium text-slate-400">{fmtTr(staff.sl > 0 ? staff.dt / staff.sl : 0)}</td>
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/40 border-l border-slate-50 text-[10px] font-medium text-slate-400">
                                              {staffPrev ? fmtTr(staffPrev.sl > 0 ? staffPrev.dt / staffPrev.sl : 0) : "-"}
                                            </td>
                                          )}
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/20 border-l border-slate-50">
                                              {staffPrev ? fmtDiff(staff.sl > 0 ? staff.dt / staff.sl : 0, staffPrev.sl > 0 ? staffPrev.dt / staffPrev.sl : 0, true) : <span className="text-slate-300">-</span>}
                                            </td>
                                          )}
                                          <td className="py-2 px-4 text-right text-[11px] font-black text-amber-500">{fmtPct(staff.tc_dt, staff.dt)}</td>
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/40 border-l border-slate-50 text-[10px] font-medium text-slate-400">
                                              {staffPrev ? fmtPct(staffPrev.tc_dt, staffPrev.dt) : "-"}
                                            </td>
                                          )}
                                          {compareMode !== 'none' && (
                                            <td className="py-1.5 px-2 text-center bg-slate-50/20 border-l border-slate-50">
                                              {staffPrev ? fmtDiff(staff.tc_dt, staffPrev.tc_dt, true) : <span className="text-slate-300">-</span>}
                                            </td>
                                          )}
                                        </tr>

                                        {showStaff && staff.brands?.filter((brand: any) => drillFilterBrand.length === 0 || drillFilterBrand.includes(brand.name)).map((brand: any, bi: number) => {
                                          const brandKey = `${staffKey}.${bi}`;
                                          const isBrandOpen = isDrillAllOpen
                                            ? expandedDrillBrand[brandKey] !== false
                                            : expandedDrillBrand[brandKey] === true;
                                          const showBrand = !isDrillCollapsed && isBrandOpen;
                                          const brandPrev = staffPrev?.brands?.find((pb: any) => pb.name === brand.name);
                                          return (
                                            <React.Fragment key={brandKey}>
                                              <tr
                                                className="border-b border-slate-50 cursor-pointer hover:bg-purple-50/20 transition-colors bg-slate-50/30"
                                                onClick={() => { setExpandedDrillBrand(prev => ({ ...prev, [brandKey]: !isBrandOpen })); }}
                                              >
                                                <td className="py-1.5 px-4 pl-24 text-left">
                                                  <div className="flex items-center gap-2">
                                                    <ChevronDown size={10} className={`text-purple-400 transition-transform duration-200 flex-shrink-0 ${isBrandOpen ? '' : '-rotate-90'}`} />
                                                    <span className="text-[11px] font-bold text-purple-700">{brand.name}</span>
                                                  </div>
                                                </td>
                                                <td className="py-1.5 px-4 text-right text-[10px] font-medium text-slate-400">{brand.sl}</td>
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/20 border-l border-slate-100 text-[9px] text-slate-400">
                                                    {brandPrev ? brandPrev.sl.toLocaleString() : "-"}
                                                  </td>
                                                )}
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/10 border-l border-slate-100">
                                                    {brandPrev ? fmtDiff(brand.sl, brandPrev.sl) : <span className="text-slate-300">-</span>}
                                                  </td>
                                                )}
                                                <td className="py-1.5 px-4 text-right text-[10px] font-medium text-slate-400">{fmtTr(brand.dt)}</td>
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/20 border-l border-slate-100 text-[9px] text-slate-400">
                                                    {brandPrev ? fmtTr(brandPrev.dt) : "-"}
                                                  </td>
                                                )}
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/10 border-l border-slate-100">
                                                    {brandPrev ? fmtDiff(brand.dt, brandPrev.dt, true) : <span className="text-slate-300">-</span>}
                                                  </td>
                                                )}
                                                <td className="py-1.5 px-4 text-right text-[10px] font-medium text-indigo-300">{fmtTr(brand.dt)}</td>
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/20 border-l border-slate-100 text-[9px] text-slate-400">
                                                    {brandPrev ? fmtTr(brandPrev.dt) : "-"}
                                                  </td>
                                                )}
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/10 border-l border-slate-100">
                                                    {brandPrev ? fmtDiff(brand.dt, brandPrev.dt, true) : <span className="text-slate-300">-</span>}
                                                  </td>
                                                )}
                                                <td className="py-1.5 px-4 text-right text-[10px] font-medium text-slate-400">{fmtTr(brand.sl > 0 ? brand.dt / brand.sl : 0)}</td>
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/20 border-l border-slate-100 text-[9px] text-slate-400">
                                                    {brandPrev ? fmtTr(brandPrev.sl > 0 ? brandPrev.dt / brandPrev.sl : 0) : "-"}
                                                  </td>
                                                )}
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/10 border-l border-slate-100">
                                                    {brandPrev ? fmtDiff(brand.sl > 0 ? brand.dt / brand.sl : 0, brandPrev.sl > 0 ? brandPrev.dt / brandPrev.sl : 0, true) : <span className="text-slate-300">-</span>}
                                                  </td>
                                                )}
                                                <td className="py-1.5 px-4 text-right text-[10px] font-black text-amber-400">{fmtPct(brand.tc_dt, brand.dt)}</td>
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/20 border-l border-slate-100 text-[9px] text-slate-400">
                                                    {brandPrev ? fmtPct(brandPrev.tc_dt, brandPrev.dt) : "-"}
                                                  </td>
                                                )}
                                                {compareMode !== 'none' && (
                                                  <td className="py-1 px-2 text-center bg-slate-50/10 border-l border-slate-100">
                                                    {brandPrev ? fmtDiff(brand.tc_dt, brandPrev.tc_dt, true) : <span className="text-slate-300">-</span>}
                                                  </td>
                                                )}
                                              </tr>
                                              {showBrand && brand.products?.map((prod: any, pi: number) => {
                                                const prodPrev = brandPrev?.products?.find((pp: any) => pp.name === prod.name);
                                                return (
                                                  <tr key={`${brandKey}.${pi}`} className="border-b border-slate-50/50 hover:bg-blue-50/10 transition-colors">
                                                    <td className="py-1.5 px-4 pl-32 text-left">
                                                      <span className="text-[10px] font-semibold text-blue-700">{prod.name}</span>
                                                    </td>
                                                    <td className="py-1.5 px-4 text-right text-[10px] text-slate-400">{prod.sl}</td>
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50 text-[9px] text-slate-400">
                                                        {prodPrev ? prodPrev.sl.toLocaleString() : "-"}
                                                      </td>
                                                    )}
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50">
                                                        {prodPrev ? fmtDiff(prod.sl, prodPrev.sl) : <span className="text-slate-300">-</span>}
                                                      </td>
                                                    )}
                                                    <td className="py-1.5 px-4 text-right text-[10px] text-slate-400">{fmtTr(prod.dt)}</td>
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50 text-[9px] text-slate-400">
                                                        {prodPrev ? fmtTr(prodPrev.dt) : "-"}
                                                      </td>
                                                    )}
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50">
                                                        {prodPrev ? fmtDiff(prod.dt, prodPrev.dt, true) : <span className="text-slate-300">-</span>}
                                                      </td>
                                                    )}
                                                    <td className="py-1.5 px-4 text-right text-[10px] text-indigo-300">{fmtTr(prod.dt)}</td>
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50 text-[9px] text-slate-400">
                                                        {prodPrev ? fmtTr(prodPrev.dt) : "-"}
                                                      </td>
                                                    )}
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50">
                                                        {prodPrev ? fmtDiff(prod.dt, prodPrev.dt, true) : <span className="text-slate-300">-</span>}
                                                      </td>
                                                    )}
                                                    <td className="py-1.5 px-4 text-right text-[10px] text-slate-400">{fmtTr(prod.sl > 0 ? prod.dt / prod.sl : 0)}</td>
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50 text-[9px] text-slate-400">
                                                        {prodPrev ? fmtTr(prodPrev.sl > 0 ? prodPrev.dt / prodPrev.sl : 0) : "-"}
                                                      </td>
                                                    )}
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50">
                                                        {prodPrev ? fmtDiff(prod.sl > 0 ? prod.dt / prod.sl : 0, prodPrev.sl > 0 ? prodPrev.dt / prodPrev.sl : 0, true) : <span className="text-slate-300">-</span>}
                                                      </td>
                                                    )}
                                                    <td className="py-1.5 px-4 text-right text-[10px] font-black text-amber-400">{fmtPct(prod.tc_dt, prod.dt)}</td>
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50 text-[9px] text-slate-400">
                                                        {prodPrev ? fmtPct(prodPrev.tc_dt, prodPrev.dt) : "-"}
                                                      </td>
                                                    )}
                                                    {compareMode !== 'none' && (
                                                      <td className="py-1 px-2 text-center border-l border-slate-50/50">
                                                        {prodPrev ? fmtDiff(prod.tc_dt, prodPrev.tc_dt, true) : <span className="text-slate-300">-</span>}
                                                      </td>
                                                    )}
                                                  </tr>
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
                            })}
                          </React.Fragment>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 italic text-[11px]">
                            {isLoadingRealtime ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu thỏa mãn điều kiện.'}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PHÂN TÍCH KHAI THÁC - Menu Hiển thị & Bảng dữ liệu */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-6">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 font-bold">
                      PK
                    </div>
                    <div>
                      <h3 className="text-[18px] font-black text-slate-900 tracking-tight">Phân Tích Khai Thác</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Chi tiết sản phẩm & hiệu quả bán kèm</p>
                    </div>
                  </div>
                  {/* Nút chụp ảnh */}
                  <button
                    onClick={() => handleCaptureTable('phan-tich-khai-thac-table-container', 'phan_tich_khai_thac')}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow-sm no-capture"
                    title="Chụp ảnh bảng này"
                  >
                    <Camera size={13} className="text-slate-500 hover:text-indigo-600" />
                    <span>Chụp ảnh</span>
                  </button>
                </div>

                {/* Filter bar - menu hiển thị */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 rounded-xl px-4 py-3">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap mr-2">HIỂN THỊ:</span>
                  {[
                    { key: 'spChinh', label: 'SP CHÍNH' },
                    { key: 'baoHiem', label: 'BẢO HIỂM' },
                    { key: 'sim', label: 'SIM' },
                    { key: 'dongHo', label: 'ĐỒNG HỒ' },
                    { key: 'phuKien', label: 'PHỤ KIỆN' },
                    { key: 'giaDung', label: 'GIA DỤNG' }
                  ].map(btn => {
                    const isActive = showKhaiThacCols[btn.key as keyof typeof showKhaiThacCols];
                    return (
                      <button
                        key={btn.key}
                        onClick={() => setShowKhaiThacCols(prev => ({ ...prev, [btn.key]: !isActive }))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto bg-white" id="phan-tich-khai-thac-table-container">
                <table className="w-full border-collapse border border-slate-100 [&_th]:border-r [&_th]:border-slate-200/50 [&_td]:border-r [&_td]:border-slate-100 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th rowSpan={2} className="py-3 px-4 text-left min-w-[200px] border-b border-slate-200/50">NHÂN VIÊN</th>
                      {showKhaiThacCols.doanhThu && (
                        <th colSpan={3} className="py-2 px-3 text-center border-b border-slate-200/50">DOANH THU</th>
                      )}
                      {showKhaiThacCols.spChinh && (
                        <th colSpan={4} className="py-2 px-3 text-center border-b border-slate-200/50">SP CHÍNH</th>
                      )}
                      {showKhaiThacCols.baoHiem && (
                        <th colSpan={showKhaiThacCols.doanhThu ? 3 : 2} className="py-2 px-3 text-center border-b border-slate-200/50">BẢO HIỂM</th>
                      )}
                      {showKhaiThacCols.sim && (
                        <th colSpan={showKhaiThacCols.doanhThu ? 3 : 2} className="py-2 px-3 text-center border-b border-slate-200/50">SIM</th>
                      )}
                      {showKhaiThacCols.dongHo && (
                        <th colSpan={showKhaiThacCols.doanhThu ? 3 : 2} className="py-2 px-3 text-center border-b border-slate-200/50">ĐỒNG HỒ</th>
                      )}
                      {showKhaiThacCols.phuKien && (
                        <th colSpan={showKhaiThacCols.doanhThu ? 6 : 5} className="py-2 px-3 text-center border-b border-slate-200/50">PHỤ KIỆN</th>
                      )}
                      {showKhaiThacCols.giaDung && (
                        <th colSpan={showKhaiThacCols.doanhThu ? 6 : 5} className="py-2 px-3 text-center border-b border-slate-200/50">GIA DỤNG</th>
                      )}
                    </tr>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      {/* DOANH THU Sub Headers */}
                      {showKhaiThacCols.doanhThu && (
                        <>
                          <th className="py-2 px-2 text-center w-20">DT THỰC</th>
                          <th className="py-2 px-2 text-center w-20">DTQĐ</th>
                          <th className="py-2 px-2 text-center w-20">HQQĐ</th>
                        </>
                      )}
                      {/* SP CHÍNH Sub Headers */}
                      {showKhaiThacCols.spChinh && (
                        <>
                          <th className="py-2 px-2 text-center w-14">ICT</th>
                          <th className="py-2 px-2 text-center w-14">CE</th>
                          <th className="py-2 px-2 text-center w-14">ĐGD</th>
                          <th className="py-2 px-2 text-center w-16 text-indigo-600 font-bold bg-indigo-50/20">TỔNG</th>
                        </>
                      )}
                      {/* BẢO HIỂM Sub Headers */}
                      {showKhaiThacCols.baoHiem && (
                        <>
                          <th className="py-2 px-2 text-center w-14">SL</th>
                          {showKhaiThacCols.doanhThu && <th className="py-2 px-2 text-center w-20">D.THU</th>}
                          <th className="py-2 px-2 text-center w-14">%</th>
                        </>
                      )}
                      {/* SIM Sub Headers */}
                      {showKhaiThacCols.sim && (
                        <>
                          <th className="py-2 px-2 text-center w-14">SL</th>
                          {showKhaiThacCols.doanhThu && <th className="py-2 px-2 text-center w-20">D.THU</th>}
                          <th className="py-2 px-2 text-center w-14">%</th>
                        </>
                      )}
                      {/* ĐỒNG HỒ Sub Headers */}
                      {showKhaiThacCols.dongHo && (
                        <>
                          <th className="py-2 px-2 text-center w-14">SL</th>
                          {showKhaiThacCols.doanhThu && <th className="py-2 px-2 text-center w-20">D.THU</th>}
                          <th className="py-2 px-2 text-center w-14">%</th>
                        </>
                      )}
                      {/* PHỤ KIỆN Sub Headers */}
                      {showKhaiThacCols.phuKien && (
                        <>
                          <th className="py-2 px-2 text-center w-14">SL CAM</th>
                          <th className="py-2 px-2 text-center w-14">SL LOA</th>
                          <th className="py-2 px-2 text-center w-14">SL PIN</th>
                          <th className="py-2 px-2 text-center w-14">SL TNGHE</th>
                          {showKhaiThacCols.doanhThu && <th className="py-2 px-2 text-center w-20">D.THU</th>}
                          <th className="py-2 px-2 text-center w-14">%</th>
                        </>
                      )}
                      {/* GIA DỤNG Sub Headers */}
                      {showKhaiThacCols.giaDung && (
                        <>
                          <th className="py-2 px-2 text-center w-14">SL MLN</th>
                          <th className="py-2 px-2 text-center w-14">SL NCƠM</th>
                          <th className="py-2 px-2 text-center w-14">SL NCHIÊN</th>
                          <th className="py-2 px-2 text-center w-14">SL QUẠT</th>
                          <th className="py-2 px-2 text-center w-14">%</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const formatVal = (val: number) => val === 0 ? <span className="text-slate-300">-</span> : val;
                      const formatRev = (val: number) => {
                        if (val === 0) return <span className="text-slate-300">-</span>;
                        if (val >= 1_000_000) {
                          const m = val / 1_000_000;
                          return `${m % 1 === 0 ? m : m.toFixed(1)} Tr`;
                        }
                        if (val >= 1_000) {
                          return `${Math.round(val / 1_000)} K`;
                        }
                        return val.toLocaleString('vi-VN');
                      };
                      const renderPct = (num: number, den: number) => {
                        if (den === 0 || num === 0) {
                          return (
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-rose-50/50 text-rose-400 font-bold text-[10px]">
                              -
                            </span>
                          );
                        }
                        const pct = Math.round((num / den) * 100);
                        return (
                          <span className="inline-flex px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[10px]">
                            {pct}%
                          </span>
                        );
                      };
                      const renderHqqd = (val: number) => {
                        if (val === 0) {
                          return (
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-50/50 text-indigo-400 font-bold text-[10px]">
                              -
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold text-[10px]">
                            {val}%
                          </span>
                        );
                      };

                      return staffKhaiThacStats.length > 0 ? staffKhaiThacStats.map((item, idx) => {
                        return (
                          <tr key={item.staffName} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 text-left font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[13px]">
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </span>
                                <span>{item.staffName}</span>
                              </div>
                            </td>
                            {/* DOANH THU Cells */}
                            {showKhaiThacCols.doanhThu && (
                              <>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatRev(item.dtThuc)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatRev(item.dtqd)}</td>
                                <td className="py-3 px-2 text-center">{renderHqqd(item.hqqd)}</td>
                              </>
                            )}
                            {/* SP CHÍNH Cells */}
                            {showKhaiThacCols.spChinh && (
                              <>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.ictQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.ceQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.dgdQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-bold text-indigo-600 bg-indigo-50/10">{formatVal(item.spChinhTotalQty)}</td>
                              </>
                            )}
                            {/* BẢO HIỂM Cells */}
                            {showKhaiThacCols.baoHiem && (
                              <>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.bhQty)}</td>
                                {showKhaiThacCols.doanhThu && <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatRev(item.bhRev)}</td>}
                                <td className="py-3 px-2 text-center">{renderPct(item.bhQty, item.spChinhTotalQty)}</td>
                              </>
                            )}
                            {/* SIM Cells */}
                            {showKhaiThacCols.sim && (
                              <>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.simQty)}</td>
                                {showKhaiThacCols.doanhThu && <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatRev(item.simRev)}</td>}
                                <td className="py-3 px-2 text-center">{renderPct(item.simQty, item.spChinhTotalQty)}</td>
                              </>
                            )}
                            {/* ĐỒNG HỒ Cells */}
                            {showKhaiThacCols.dongHo && (
                              <>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.dhQty)}</td>
                                {showKhaiThacCols.doanhThu && <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatRev(item.dhRev)}</td>}
                                <td className="py-3 px-2 text-center">{renderPct(item.dhQty, item.spChinhTotalQty)}</td>
                              </>
                            )}
                            {/* PHỤ KIỆN Cells */}
                            {showKhaiThacCols.phuKien && (
                              <>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.pkCamQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.pkLoaQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.pkPinQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.pkTnQty)}</td>
                                {showKhaiThacCols.doanhThu && <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatRev(item.pkRev)}</td>}
                                <td className="py-3 px-2 text-center">{renderPct(item.pkTotalQty, item.spChinhTotalQty)}</td>
                              </>
                            )}
                            {/* GIA DỤNG Cells */}
                            {showKhaiThacCols.giaDung && (
                              <>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.gdMlnQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.gdNcomQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.gdNchienQty)}</td>
                                <td className="py-3 px-2 text-center text-[13px] font-semibold text-slate-600">{formatVal(item.gdQuatQty)}</td>
                                <td className="py-3 px-2 text-center">{renderPct(item.gdQty, item.spChinhTotalQty)}</td>
                              </>
                            )}
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={30} className="py-12 text-center text-slate-400 italic text-[11px]">
                            {isLoadingRealtime ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu.'}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                  {/* Footer - TỔNG CỘNG */}
                  {staffKhaiThacStats.length > 0 && (
                    <tfoot className="bg-slate-50 font-black text-slate-800 text-[13px] border-t border-slate-200">
                      {(() => {
                        const totalDtThuc = staffKhaiThacStats.reduce((s, x) => s + x.dtThuc, 0);
                        const totalDtqd = staffKhaiThacStats.reduce((s, x) => s + x.dtqd, 0);
                        const totalHqqd = totalDtThuc > 0 ? Math.round(((totalDtqd - totalDtThuc) / totalDtThuc) * 100) : 0;

                        const totalIctQty = staffKhaiThacStats.reduce((s, x) => s + x.ictQty, 0);
                        const totalCeQty = staffKhaiThacStats.reduce((s, x) => s + x.ceQty, 0);
                        const totalDgdQty = staffKhaiThacStats.reduce((s, x) => s + x.dgdQty, 0);
                        const totalSpChinhQty = staffKhaiThacStats.reduce((s, x) => s + x.spChinhTotalQty, 0);

                        const totalBhQty = staffKhaiThacStats.reduce((s, x) => s + x.bhQty, 0);
                        const totalBhRev = staffKhaiThacStats.reduce((s, x) => s + x.bhRev, 0);

                        const totalSimQty = staffKhaiThacStats.reduce((s, x) => s + x.simQty, 0);
                        const totalSimRev = staffKhaiThacStats.reduce((s, x) => s + x.simRev, 0);

                        const totalDhQty = staffKhaiThacStats.reduce((s, x) => s + x.dhQty, 0);
                        const totalDhRev = staffKhaiThacStats.reduce((s, x) => s + x.dhRev, 0);

                        const totalPkCam = staffKhaiThacStats.reduce((s, x) => s + x.pkCamQty, 0);
                        const totalPkLoa = staffKhaiThacStats.reduce((s, x) => s + x.pkLoaQty, 0);
                        const totalPkPin = staffKhaiThacStats.reduce((s, x) => s + x.pkPinQty, 0);
                        const totalPkTn = staffKhaiThacStats.reduce((s, x) => s + x.pkTnQty, 0);
                        const totalPkTotalQty = staffKhaiThacStats.reduce((s, x) => s + x.pkTotalQty, 0);
                        const totalPkRev = staffKhaiThacStats.reduce((s, x) => s + x.pkRev, 0);

                        const totalGdQty = staffKhaiThacStats.reduce((s, x) => s + x.gdQty, 0);
                        const totalGdMlnQty = staffKhaiThacStats.reduce((s, x) => s + x.gdMlnQty, 0);
                        const totalGdNcomQty = staffKhaiThacStats.reduce((s, x) => s + x.gdNcomQty, 0);
                        const totalGdNchienQty = staffKhaiThacStats.reduce((s, x) => s + x.gdNchienQty, 0);
                        const totalGdQuatQty = staffKhaiThacStats.reduce((s, x) => s + x.gdQuatQty, 0);
                        const totalGdRev = staffKhaiThacStats.reduce((s, x) => s + x.gdRev, 0);

                        const formatFooterVal = (val: number) => val === 0 ? '-' : val;
                        const formatFooterRev = (val: number) => {
                          if (val === 0) return '-';
                          if (val >= 1_000_000) {
                            const m = val / 1_000_000;
                            return `${m % 1 === 0 ? m : m.toFixed(1)} Tr`;
                          }
                          if (val >= 1_000) {
                            return `${Math.round(val / 1_000)} K`;
                          }
                          return val.toLocaleString('vi-VN');
                        };
                        const renderFooterPct = (num: number, den: number) => {
                          if (den === 0 || num === 0) return '-';
                          return `${Math.round((num / den) * 100)}%`;
                        };
                        const renderFooterHqqd = (val: number) => {
                          if (val === 0) return '-';
                          return `${val}%`;
                        };

                        return (
                          <tr>
                            <td className="py-3 px-4 text-left">TỔNG CỘNG</td>
                            {/* DOANH THU Totals */}
                            {showKhaiThacCols.doanhThu && (
                              <>
                                <td className="py-3 px-2 text-center">{formatFooterRev(totalDtThuc)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterRev(totalDtqd)}</td>
                                <td className="py-3 px-2 text-center text-indigo-600 font-bold bg-indigo-50/20">
                                  {renderFooterHqqd(totalHqqd)}
                                </td>
                              </>
                            )}
                            {/* SP CHÍNH Totals */}
                            {showKhaiThacCols.spChinh && (
                              <>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalIctQty)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalCeQty)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalDgdQty)}</td>
                                <td className="py-3 px-2 text-center text-indigo-600 bg-indigo-50/20">{formatFooterVal(totalSpChinhQty)}</td>
                              </>
                            )}
                            {/* BẢO HIỂM Totals */}
                            {showKhaiThacCols.baoHiem && (
                              <>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalBhQty)}</td>
                                {showKhaiThacCols.doanhThu && <td className="py-3 px-2 text-center">{formatFooterRev(totalBhRev)}</td>}
                                <td className="py-3 px-2 text-center text-rose-600">{renderFooterPct(totalBhQty, totalSpChinhQty)}</td>
                              </>
                            )}
                            {/* SIM Totals */}
                            {showKhaiThacCols.sim && (
                              <>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalSimQty)}</td>
                                {showKhaiThacCols.doanhThu && <td className="py-3 px-2 text-center">{formatFooterRev(totalSimRev)}</td>}
                                <td className="py-3 px-2 text-center text-rose-600">{renderFooterPct(totalSimQty, totalSpChinhQty)}</td>
                              </>
                            )}
                            {/* ĐỒNG HỒ Totals */}
                            {showKhaiThacCols.dongHo && (
                              <>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalDhQty)}</td>
                                {showKhaiThacCols.doanhThu && <td className="py-3 px-2 text-center">{formatFooterRev(totalDhRev)}</td>}
                                <td className="py-3 px-2 text-center text-rose-600">{renderFooterPct(totalDhQty, totalSpChinhQty)}</td>
                              </>
                            )}
                            {/* PHỤ KIỆN Totals */}
                            {showKhaiThacCols.phuKien && (
                              <>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalPkCam)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalPkLoa)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalPkPin)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalPkTn)}</td>
                                {showKhaiThacCols.doanhThu && <td className="py-3 px-2 text-center">{formatFooterRev(totalPkRev)}</td>}
                                <td className="py-3 px-2 text-center text-rose-600">{renderFooterPct(totalPkTotalQty, totalSpChinhQty)}</td>
                              </>
                            )}
                            {/* GIA DỤNG Totals */}
                            {showKhaiThacCols.giaDung && (
                              <>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalGdMlnQty)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalGdNcomQty)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalGdNchienQty)}</td>
                                <td className="py-3 px-2 text-center">{formatFooterVal(totalGdQuatQty)}</td>
                                <td className="py-3 px-2 text-center text-rose-600">{renderFooterPct(totalGdQty, totalSpChinhQty)}</td>
                              </>
                            )}
                          </tr>
                        );
                      })()}
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Raw Data Table: 3. THÊM YCX RT */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md mt-8 mb-12">
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag size={18} className="text-slate-700 flex-shrink-0" />
                  <div>
                    <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-widest">3. THÊM YCX RT (DỮ LIỆU NGUỒN)</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Lọc: Đã xuất &amp; Chưa trả</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRawTable(!showRawTable)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  {showRawTable ? (
                    <>
                      <ChevronUp size={12} />
                      <span>ẨN BẢNG</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={12} />
                      <span>HIỂN THỊ</span>
                    </>
                  )}
                </button>
              </div>

              {showRawTable && (
                <>
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
                            const idxHinhThucXuat = headers.findIndex(h => {
                               const lh = h.toLowerCase();
                               return lh.includes('hình thức xuất') || lh.includes('loại ycx') || lh.includes('loại yêu cầu');
                             });
                            // Date columns to format
                            const dateColIndices = new Set<number>(
                              headers.reduce((acc: number[], h, i) => {
                                const lh = h.toLowerCase();
                                if (lh.includes('ngày tạo') || lh.includes('ngày lập') || lh.includes('ngày xuất') || lh.includes('ngày giao') || lh.includes('ngày hoàn')) acc.push(i);
                                return acc;
                              }, [])
                            );

                            // Format raw date string → dd/MM/yyyy
                            const fmtRawDate = (raw: string): string => {
                              if (!raw || raw.trim() === '') return '-';
                              const p2 = (n: number) => String(n).padStart(2, '0');

                              // ── Excel serial date number (e.g. 46143.40754975694) ──
                              const num = parseFloat(raw);
                              if (!isNaN(num) && /^\d+(\.\d+)?$/.test(raw.trim()) && num > 40000 && num < 60000) {
                                const days = Math.floor(num);
                                const fraction = num - days;
                                // Date portion: offset from Unix epoch (25569 days = days between 1/1/1900 and 1/1/1970, minus Excel's fake leap day)
                                const dateMs = (days - 25569) * 86400000;
                                const d = new Date(dateMs);
                                const dd = p2(d.getUTCDate());
                                const mm = p2(d.getUTCMonth() + 1);
                                const yyyy = d.getUTCFullYear();
                                // Time portion from fractional day (Excel stores local time)
                                const totalSec = Math.round(fraction * 86400);
                                const hh = p2(Math.floor(totalSec / 3600));
                                const min = p2(Math.floor((totalSec % 3600) / 60));
                                const ss = p2(totalSec % 60);
                                return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
                              }

                              // ── dd/MM/yyyy or dd/MM/yyyy HH:mm:ss ──
                              const m1 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})([\s\T](.+))?/);
                              if (m1) {
                                const datePart = `${p2(+m1[1])}/${p2(+m1[2])}/${m1[3]}`;
                                const timePart = m1[5] ? ` ${m1[5].substring(0, 8)}` : '';
                                return `${datePart}${timePart}`;
                              }

                              // ── ISO yyyy-MM-dd[THH:mm:ss] ──
                              const m2 = raw.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})[\sT]?(.*)$/);
                              if (m2) {
                                const timePart = m2[4] ? ` ${m2[4].substring(0, 8)}` : '';
                                return `${p2(+m2[3])}/${p2(+m2[2])}/${m2[1]}${timePart}`;
                              }

                              return raw;
                            };

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

                            const classifyHinhThucXuat = (htx: string): string | null => {
                               const clean = htx.trim().toLowerCase();
                               if (!clean) return null;
                               
                               if (clean.includes('thu hộ')) return 'Thu hộ';
                               if (clean.includes('trả góp')) return 'Trả góp';
                               if (
                                 clean.includes('tiền mặt') ||
                                 clean.includes('xuất bán hàng online') ||
                                 clean.includes('xuất bán hàng tại siêu thị') ||
                                 clean.includes('xuất bán online') ||
                                 clean.includes('xuất bán pre-order') ||
                                 clean.includes('xuất bán ưu đãi') ||
                                 clean.includes('xuất đổi bảo hành') ||
                                 clean.includes('xuất sim')
                               ) {
                                 return 'Tiền mặt';
                               }
                               
                               return null;
                             };

                            // Paginate: only render current page rows
                            const pageRows = deferredFilteredRows.slice(
                              rawTablePage * RAW_PAGE_SIZE,
                              (rawTablePage + 1) * RAW_PAGE_SIZE
                            );

                            return pageRows.map((row, rowIdx) => (
                              <tr key={rowIdx} className={`transition-colors ${rowIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} hover:bg-slate-100`}>
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className={`border border-slate-200 py-2 px-3 text-[9px] font-medium whitespace-nowrap ${dateColIndices.has(cellIdx) ? 'text-indigo-700 font-bold' : 'text-slate-900'}`}>
                                    {dateColIndices.has(cellIdx)
                                      ? fmtRawDate(String(cell || ''))
                                      : cell}
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
                                    const val = idxHinhThucXuat !== -1 ? classifyHinhThucXuat(String(row[idxHinhThucXuat] || '')) : null;
                                    return val === 'Tiền mặt'
                                      ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black">Tiền mặt</span>
                                      : val === 'Trả góp'
                                        ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black">Trả góp</span>
                                        : val === 'Thu hộ'
                                          ? <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-black">Thu hộ</span>
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
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      </div>
    </div>

      {/* BI Import Overlay */}
      <AnimatePresence>
        {biImportMode && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 flex items-center gap-4 min-w-[450px]"
          >
            {!biWaitingPaste ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center animate-pulse">
                  <Globe size={24} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black text-slate-800">
                    Đang chờ dữ liệu {biImportMode === 'realtime' ? 'Realtime' : 'Luỹ kế'}...
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vào trang BI → <span className="font-bold text-slate-600">⌘+A</span> → <span className="font-bold text-slate-600">⌘+C</span> → Quay lại tab này
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <ClipboardList size={24} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black text-emerald-700">
                    Đã copy xong? Nhấn nút bên phải để dán!
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Dữ liệu sẽ được dán vào ô {biImportMode === 'realtime' ? 'Realtime' : 'Luỹ kế'}
                  </p>
                </div>
                <button
                  onClick={handlePasteFromClipboard}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-[12px] font-black uppercase tracking-wider hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200/50 active:scale-95 whitespace-nowrap"
                >
                  📋 DÁN DỮ LIỆU
                </button>
              </>
            )}
            <button
              onClick={() => { setBiImportMode(null); setBiWaitingPaste(false); }}
              className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors uppercase tracking-wider"
            >
              Huỷ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
