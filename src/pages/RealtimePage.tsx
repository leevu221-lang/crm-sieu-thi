import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useTransition, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { birthdayService } from '../services/birthdayService';
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
  Copy,
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
  ChevronsUpDown,
  ClipboardList,
  X,
  FileSpreadsheet,
  Database,
  Store,
  ChevronsDownUp,
  Columns,
  Sliders,
  BarChart3,
  Gift,
  Edit3,
  Trash2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, setDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getCachedDoc, setCachedDoc } from '../services/cachedFirestore';
import { NGANH_DISPLAY } from './BcDtNganhHang';
import { NHOM_HANG_MAP } from '../utils/categoriesMap';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useMarket } from '../contexts/MarketContext';
import { useStore } from '../contexts/StoreContext';
import { useRealtimeData } from './RTST/hooks/useRealtimeData';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../components/CaptureLoadingOverlay';
import { ConfigNhomHangModal } from '../components/ConfigNhomHangModal';
import { ConfigBaoHiemModal, BaoHiemRule } from '../components/ConfigBaoHiemModal';
import { ConfigExclusionModal, ExclusionRule } from '../components/ConfigExclusionModal';
import { ConfigQuyDoiModal, QuyDoiRule } from '../components/ConfigQuyDoiModal';
import { ConfigGoogleSheetModal } from '../components/ConfigGoogleSheetModal';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { YcxStaffData } from './RTST/types';
import { UnexportedOrdersTable } from './RTST/components/UnexportedOrdersTable';
import { BanGiaSocTab } from './RTST/components/BanGiaSocTab';
import { MucTieuNgayTab } from './RTST/components/MucTieuNgayTab';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as XLSX from 'xlsx';
import { domToPng } from 'modern-screenshot';
import { isValidStoreName, normalize, normalizeStoreId } from './RTST/utils';

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
    indigo: 'text-[#2563EB] bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    rose: 'text-rose-600 bg-rose-50',
    slate: 'text-slate-600 bg-slate-50',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  const bgMap: any = {
    indigo: 'bg-gradient-to-br from-[#2563EB] via-[#6366F1] to-[#7C3AED] text-white shadow-lg shadow-indigo-500/20 border-white/30',
    emerald: 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 border-white/30',
    amber: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 border-white/30',
    rose: 'bg-gradient-to-br from-rose-600 via-pink-600 to-rose-700 text-white shadow-lg shadow-rose-500/20 border-white/30',
    slate: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white shadow-lg shadow-slate-500/20 border-white/30',
    blue: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 border-white/30',
    orange: 'bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 text-white shadow-lg shadow-orange-500/20 border-white/30'
  };

  if (isColored) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className={`${bgMap[color] || 'bg-white'} p-3.5 sm:p-5 rounded-2xl md:rounded-3xl border transition-all duration-300 flex flex-col justify-between h-full hover:scale-[1.02] shadow-lg`}
        style={{ fontFamily: "'UTM Avo', sans-serif" }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-nowrap min-w-0">
          <div
            className="stat-card-badge inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 whitespace-nowrap shrink-0 max-w-full"
            style={{ whiteSpace: 'nowrap' }}
          >
            <Icon size={12} strokeWidth={2.5} className="shrink-0 text-white" />
            <span
              className="stat-card-title whitespace-nowrap leading-none truncate text-white"
              style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all', color: '#ffffff' }}
            >
              {title}
            </span>
          </div>
          {trend !== undefined && (
            <div
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black bg-white/25 backdrop-blur-md ml-auto shrink-0 border border-white/20 whitespace-nowrap text-white"
              style={{ whiteSpace: 'nowrap' }}
            >
              {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div>
          <div
            className="font-bold text-[24px] xs:text-[29px] sm:text-[36px] md:text-[44px] lg:text-[48px] tracking-tight whitespace-nowrap drop-shadow-sm leading-none py-0.5 sm:py-1 text-white font-oswald truncate"
            style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {value}
          </div>
          {subValue && (
            <div
              className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] font-bold text-white/80 truncate whitespace-nowrap"
              style={{ fontFamily: "'UTM Avo', sans-serif", whiteSpace: 'nowrap' }}
            >
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
      className={`bg-white p-3.5 sm:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 flex flex-col justify-between ${isLarge ? 'md:col-span-2' : ''}`}
      style={{ fontFamily: "'UTM Avo', sans-serif" }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color] || 'bg-slate-50 text-slate-600'}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <h3 className="text-[9.5px] xs:text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider leading-tight truncate">{title}</h3>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ml-auto shrink-0 ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <div className="font-bold text-[26.4px] xs:text-[31.2px] sm:text-[40.8px] md:text-[48px] lg:text-[55.2px] tracking-tight text-slate-800 leading-none py-0.5 sm:py-1 font-oswald truncate" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}>
          {value}
        </div>
        {subValue && (
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] font-medium text-slate-400 truncate" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
            {subValue}
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface ColumnFilterDropdownProps {
  colIdx: number;
  columnName: string;
  uniqueVals: string[];
  filterState: { search: string; selectedValues: string[] | null } | undefined;
  onApply: (search: string, selectedValues: string[] | null) => void;
  onClear: () => void;
  onClose: () => void;
}

const ColumnFilterDropdown: React.FC<ColumnFilterDropdownProps> = ({
  colIdx,
  columnName,
  uniqueVals,
  filterState,
  onApply,
  onClear,
  onClose,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize tempSelected
  useEffect(() => {
    if (filterState?.selectedValues) {
      setTempSelected(new Set(filterState.selectedValues));
    } else {
      setTempSelected(new Set(uniqueVals));
    }
  }, [filterState, uniqueVals]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Filter unique values by search input
  const filteredUniqueVals = useMemo(() => {
    return uniqueVals.filter(val =>
      String(val).toLowerCase().includes(localSearch.toLowerCase())
    );
  }, [uniqueVals, localSearch]);

  const DISPLAY_LIMIT = 250;
  const displayedUniqueVals = useMemo(() => {
    return filteredUniqueVals.slice(0, DISPLAY_LIMIT);
  }, [filteredUniqueVals]);

  const allDisplayedChecked = useMemo(() => {
    if (displayedUniqueVals.length === 0) return false;
    return displayedUniqueVals.every(val => tempSelected.has(val));
  }, [displayedUniqueVals, tempSelected]);

  const updateFilter = (newTemp: Set<string>, searchVal: string = localSearch) => {
    setTempSelected(newTemp);
    if (newTemp.size === uniqueVals.length) {
      onApply(searchVal, null);
    } else {
      onApply(searchVal, Array.from(newTemp));
    }
  };

  const handleSelectAllToggle = () => {
    const newTemp = new Set(tempSelected);
    if (allDisplayedChecked) {
      displayedUniqueVals.forEach(val => newTemp.delete(val));
    } else {
      displayedUniqueVals.forEach(val => newTemp.add(val));
    }
    updateFilter(newTemp);
  };

  const handleCheckboxChange = (val: string) => {
    const newTemp = new Set(tempSelected);
    if (newTemp.has(val)) {
      newTemp.delete(val);
    } else {
      newTemp.add(val);
    }
    updateFilter(newTemp);
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full mt-1 right-0 z-50 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-left normal-case"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-black text-slate-700 truncate">
          Lọc cột: {columnName}
        </div>
        {columnName === "Nhóm hàng" && (
          <button onClick={() => setShowConfigModal(true)} className="text-slate-400 hover:text-indigo-600">
            <Settings size={12} />
          </button>
        )}
      </div>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Tìm kiếm giá trị..."
        value={localSearch}
        onChange={e => {
          const val = e.target.value;
          setLocalSearch(val);
          updateFilter(tempSelected, val);
        }}
        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-2"
      />

      {/* Scrollable Checklist */}
      <div className="max-h-48 overflow-y-auto border border-slate-150 rounded p-1.5 mb-2 bg-slate-50/50">
        <label className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-slate-100 cursor-pointer text-[11px] font-medium text-slate-700">
          <input
            type="checkbox"
            checked={allDisplayedChecked}
            onChange={handleSelectAllToggle}
            className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
          />
          <span>(Chọn tất cả kết quả hiển thị)</span>
        </label>
        <div className="border-t border-slate-200 my-1"></div>

        {displayedUniqueVals.length > 0 ? (
          displayedUniqueVals.map((val, idx) => (
            <label
              key={idx}
              className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-slate-100 cursor-pointer text-[11px] font-medium text-slate-700 truncate"
            >
              <input
                type="checkbox"
                checked={tempSelected.has(val)}
                onChange={() => handleCheckboxChange(val)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
              />
              <span title={val}>{val}</span>
            </label>
          ))
        ) : (
          <div className="text-[10px] text-slate-400 italic text-center py-2">
            Không tìm thấy giá trị
          </div>
        )}
      </div>

      {/* DISPLAY LIMIT MESSAGE */}
      {filteredUniqueVals.length > DISPLAY_LIMIT && (
        <div className="text-[9px] text-slate-400 font-bold mb-2 text-center">
          Hiển thị {DISPLAY_LIMIT} / {filteredUniqueVals.length} dòng. Hãy tìm kiếm để lọc thêm.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
        <button
          onClick={onClear}
          className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-500 transition-colors uppercase tracking-wider"
        >
          Xóa bộ lọc
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded hover:bg-slate-50 text-[10px] font-black text-slate-400 transition-colors uppercase tracking-wider"
          >
            Đóng
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black transition-colors uppercase tracking-wider shadow-sm"
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
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



const formatCurrencyUnit = (num: number) => {
  const abs = Math.abs(Math.round(num));
  if (abs >= 1000) return `${Math.round(num).toLocaleString('vi-VN')} tỷ`;
  if (abs > 0) return `${Math.round(num).toLocaleString('vi-VN')} tr`;
  return '0';
};

const fmtTr = (v: number): string => {
  if (!v || v === 0) return '-';
  const absVal = Math.abs(v);
  if (absVal >= 1_000_000_000) {
    const tỷ = v / 1_000_000_000;
    return `${tỷ % 1 === 0 ? tỷ.toFixed(0) : tỷ.toFixed(1)} Tỷ`;
  }
  if (absVal >= 1_000_000) {
    const m = v / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} Tr`;
  }
  if (absVal >= 1_000) {
    const k = v / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} K`;
  }
  return String(v);
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

const fmtDiff = (curr: number, prev: number, isMoney = false, toFixed?: number): React.ReactNode => {
  const diff = curr - prev;
  if (diff === 0) return <span className="text-slate-300">-</span>;

  let val = '';
  if (toFixed !== undefined) {
    if (Math.abs(diff).toFixed(toFixed) === (0).toFixed(toFixed)) {
      return <span className="text-slate-300">-</span>;
    }
    val = Math.abs(diff).toFixed(toFixed);
  } else {
    val = isMoney ? fmtTr(Math.abs(diff)) : Math.abs(diff).toLocaleString();
  }

  const sign = diff > 0 ? '+' : '-';
  const color = diff > 0 ? 'text-emerald-500' : 'text-rose-500';
  return <span className={`text-[10px] font-black ${color}`}>{sign}{val}</span>;
};

const BRAND_DEFINITIONS: Array<[string, string]> = [
  // Longer keywords first to avoid substring matching issues (e.g. 'Harman Kardon' before 'Harman')
  ['MITSUBISHI HEAVY', 'Mitsubishi Heavy'],
  ['HARMAN KARDON', 'Harman Kardon'],
  ['THẺ GAME GARENA', 'Thẻ game Garena'],
  ['THẾ GIỚI DI ĐỘNG', 'Thế Giới Di Động'],
  ['UNIBEST CO., LTD', 'UNIBEST CO., LTD'],
  ['GỖ TRƯỜNG SƠN', 'Gỗ Trường Sơn'],
  ['BẢO HIỂM PTI', 'Bảo hiểm PTI'],
  ['BẢO HIỂM PVI', 'Bảo hiểm PVI'],
  ['CHƯA XÁC ĐỊNH', 'Chưa xác định'],
  ['ĐIỆN MÁY XANH', 'Điện Máy Xanh'],
  ['ARCTIC HUNTER', 'Arctic Hunter'],
  ['DANH PHONG', 'Danh Phong'],
  ['GREENCOOK', 'GREENCOOK'],
  ['HK THUNDER', 'HK THUNDER'],
  ['INNOSTYLE', 'INNOSTYLE'],
  ['SOUNDPEATS', 'Soundpeats'],
  ['DAIKIOSAN', 'DAIKIOSAN'],
  ['ELECTROLUX', 'Electrolux'],
  ['ENERGIZER', 'ENERGIZER'],
  ['MITSUBISHI', 'Mitsubishi Heavy'],
  ['SMILE KID', 'SMILE KID'],
  ['M-SERVICE', 'M-Service'],
  ['VINAPHONE', 'Vinaphone'],
  ['BLUESTONE', 'Bluestone'],
  ['KANGAROO', 'Kangaroo'],
  ['LOGITECH', 'Logitech'],
  ['MEGALIFE', 'Megalife'],
  ['MOTOROLA', 'Motorola'],
  ['NAGAKAWA', 'NAGAKAWA'],
  ['PANASONIC', 'Panasonic'],
  ['SUNHOUSE', 'Sunhouse'],
  ['ARISTON', 'Ariston'],
  ['FIVESTAR', 'Fivestar'],
  ['HIKSEMI', 'HIKSEMI'],
  ['KINGSTON', 'Kingston'],
  ['LOCK&LOCK', 'Lock&Lock'],
  ['MOBIFONE', 'MobiFone'],
  ['PEPOCO', 'Pepko'],
  ['PHILIPS', 'Philips'],
  ['SHOWCASE', 'Showcase'],
  ['TOSHIBA', 'Toshiba'],
  ['VIETTEL', 'Viettel'],
  ['AVITA', 'Avita'],
  ['AVA+', 'AVA+'],
  ['BASEUS', 'Baseus'],
  ['XMOBILE', 'Xmobile'],
  ['BEAR', 'BEAR'],
  ['BEAZOUT', 'Beazout'],
  ['BROTHER', 'Brother'],
  ['CASH24', 'Cash24'],
  ['CASIO', 'Casio'],
  ['CASPER', 'Casper'],
  ['COCOON', 'Cocoon'],
  ['COMFEE', 'Comfee'],
  ['COSMIS', 'Cosmis'],
  ['CRYSTAL', 'CRYSTAL'],
  ['CUCKOO', 'Cuckoo'],
  ['DAIKIN', 'Daikin'],
  ['DALLAN', 'Dallan'],
  ['DALTON', 'Dalton'],
  ['DAREU', 'Dareu'],
  ['DENON', 'Denon'],
  ['DUXDUC', 'Duxduc'],
  ['DUY TÂN', 'DUY TÂN'],
  ['ELMICH', 'Elmich'],
  ['EZVIZ', 'Ezviz'],
  ['GIMIKO', 'GIMIKO'],
  ['HAFELE', 'Hafele'],
  ['HAITER', 'Haier'],
  ['HAIER', 'Haier'],
  ['HAVIT', 'Havit'],
  ['HISENSE', 'Hisense'],
  ['HISENSI', 'Hisense'],
  ['HOMMY', 'Hommy'],
  ['INOCHI', 'Inochi'],
  ['JINCASE', 'Jincase'],
  ['JUNGER', 'Junger'],
  ['KACHI', 'Kachi'],
  ['KAROFI', 'KAROFI'],
  ['KIDCARE', 'Kidcare'],
  ['KODAK', 'KODAK'],
  ['LIVOTEC', 'LIVOTEC'],
  ['MASSTEL', 'Masstel'],
  ['MISHIO', 'Mishio'],
  ['MUTOSI', 'Mutosi'],
  ['NAMILUX', 'Namilux'],
  ['NANOMAX', 'Nanomax'],
  ['PALOMA', 'Paloma'],
  ['PROMAS', 'Promas'],
  ['PRAMIE', 'Pramie'],
  ['RAPIDO', 'Rapido'],
  ['RAPOO', 'Rapoo'],
  ['REALME', 'Realme'],
  ['RINNAI', 'Rinnai'],
  ['SAKURA', 'Sakura'],
  ['SAMSUNG', 'Samsung'],
  ['SANAKY', 'Sanaky'],
  ['SANDISK', 'Sandisk'],
  ['SANYO', 'Sanyo'],
  ['SOUMAX', 'Soumax'],
  ['SUNRA', 'Sunra'],
  ['SUPOR', 'Supor'],
  ['TP-LINK', 'TP-LINK'],
  ['UGREEN', 'Ugreen'],
  ['VIETEL', 'Viettel'],
  ['XIAOMI', 'Xiaomi'],
  ['ANKER', 'Anker'],
  ['APPLE', 'Apple'],
  ['ARISTO', 'Ariston'],
  ['CANON', 'Canon'],
  ['DAHUA', 'Dahua'],
  ['DELL', 'Dell'],
  ['DMAX', 'DMAX'],
  ['ELIO', 'ELIO'],
  ['EPSON', 'Epson'],
  ['ESAY', 'Esay'],
  ['EVIC', 'Evic'],
  ['GAMA', 'GAMA'],
  ['HONOR', 'Honor'],
  ['IMOU', 'Imou'],
  ['ITEL', 'Itel'],
  ['JAMMY', 'Jammy'],
  ['JBL', 'Jbl'],
  ['JOIE', 'Joie'],
  ['MOBEL', 'Mobell'],
  ['MODI', 'MODI'],
  ['MUTOS', 'Mutosi'],
  ['NOKIA', 'Nokia'],
  ['PUMAX', 'PUMAX'],
  ['REOLINK', 'Reolink'],
  ['SHARP', 'Sharp'],
  ['SUUNTO', 'Suunto'],
  ['TEFAL', 'Tefal'],
  ['TOGO', 'Togo'],
  ['UNIQ', 'UNIQ'],
  ['VIEON', 'VieON'],
  ['VPLINK', 'VPLink'],
  ['ZINC', 'Zinc'],
  ['AQUA', 'Aqua'],
  ['ASUS', 'Asus'],
  ['BEKO', 'Beko'],
  ['BOSE', 'Bose'],
  ['BOSCH', 'Bosch'],
  ['COEX', 'Coex'],
  ['DARE', 'Dareu'],
  ['DELL', 'Dell'],
  ['ELIO', 'ELIO'],
  ['IMOO', 'Imoo'],
  ['IPHONE', 'iPhone'],
  ['ITEL', 'Itel'],
  ['JOIE', 'Joie'],
  ['OPPO', 'OPPO'],
  ['SONY', 'Sony'],
  ['TCL', 'TCL'],
  ['TECN', 'TECNO'],
  ['VIVO', 'Vivo'],
  ['AC', 'AC'],
  ['AS', 'Asia'],
  ['AV', 'Ava'],
  ['LG', 'LG'],
  ['MD', 'M.D'],
  ['HP', 'HP'],
  ['HR', 'Haier'],
  ['O.TECH', 'O.Tech'],
  ['ĐIỆN QUANG', 'Điện Quang'],
];

const extractBrand = (productName: string): string => {
  const upper = productName.toUpperCase();
  if (upper.includes('IPHONE')) return 'iPhone';
  for (const [keyword, displayName] of BRAND_DEFINITIONS) {
    if (keyword.length <= 3) {
      // Keyword ngắn: phải match đầu từ (word boundary) để tránh match nhầm
      // VD: 'AS' không match '50NANO80ASA' nhưng match 'AS-390R' hoặc 'ASIA AS ...'
      const regex = new RegExp(`(?:^|[\\s\\-\\_\\/\\(\\)])${keyword}(?:[\\s\\-\\_\\/\\(\\)]|$)`);
      if (regex.test(upper)) return displayName;
      // Cũng match nếu keyword nằm ở đầu tên sản phẩm
      if (upper.startsWith(keyword + ' ') || upper.startsWith(keyword + '-')) return displayName;
    } else {
      if (upper.includes(keyword)) return displayName;
    }
  }
  return 'Khác';
};

const resolveBrandForProduct = (productName: string, nhomSmall: string): string => {
  if (nhomSmall === 'CAM') {
    const prodLower = productName.toLowerCase();
    const normProd = removeAccents(prodLower);
    if (prodLower.includes('ngoài trời') || normProd.includes('ngoai troi') ||
        prodLower.includes('outdoor') || prodLower.includes('bullet') ||
        prodLower.includes('chống nước') || normProd.includes('chong nuoc')) {
      return 'Ngoài trời';
    }
    return 'Trong nhà';
  }
  return extractBrand(productName);
};

const NGANH_DISPLAY: Record<string, string> = {
  "CE": "CE",
  "ICT": "ICT",
  "ĐIỆN GD": "Gia dụng",
  "PHỤ KIỆN": "Phụ kiện",
  "DCNB": "DCNB",
  "BẢO HIỂM": "Bảo hiểm",
  "ĐỒNG HỒ": "Đồng hồ",
  "ĐỒNG HỒ THỜI TRANG": "Đồng hồ thời trang",
  "PHỤ KIỆN LẮP ĐẶT": "Phụ kiện lắp đặt",
  "SIM": "Sim",
  "IT": "IT",
  "THỂ CÀO": "Thẻ cào",
  "THÊN CÀO": "Thẻ cào",
  "VIEON": "VieON",
  "WEARABLE": "Wearable",
  "CHĂM SÓC SẮC ĐẸP": "Chăm sóc sắc đẹp",
  "XE ĐẠP": "Xe đạp",
};


export let activeCustomBaoHiemRules: BaoHiemRule[] = [];

const getMatchedBaoHiemRule = (code: string, name: string, customRules?: BaoHiemRule[]): BaoHiemRule | null => {
  const cleanCode = String(code || '').trim();
  const cleanName = String(name || '').toUpperCase();
  const rules = customRules || activeCustomBaoHiemRules;
  
  if (rules && rules.length > 0) {
    if (cleanCode) {
      const match = rules.find(r => r.maSanPham && cleanCode === r.maSanPham);
      if (match) return match;
    }
    if (cleanName) {
      const match = rules.find(r => !r.maSanPham && r.tenSanPham && cleanName.includes(r.tenSanPham));
      if (match) return match;
    }
  }
  return null;
};

const classifyProductByCode = (code: string, customRules?: BaoHiemRule[]): string | null => {
  const cleanCode = String(code || '').trim();
  if (!cleanCode) return null;
  
  const rules = customRules || activeCustomBaoHiemRules;
  if (rules && rules.length > 0) {
    const match = rules.find(r => r.maSanPham && cleanCode === r.maSanPham);
    if (match) return match.phanLoai;
  }

  return null;
};

// Strip employee code prefix from staff names: "38847 - Nguyễn Hùng Mạnh" → "Nguyễn Hùng Mạnh"
const extractName = (raw: string): string => {
  if (!raw) return raw;
  const match = raw.match(/^\s*\d+\s*[-–]\s*(.+)$/);
  return match ? match[1].trim() : raw.trim();
};

// Robust helper to find Staff/Creator column index, strictly excluding delivery staff ("giao hàng")
const getStaffIdx = (headers: string[]): number => {
  if (!headers || headers.length === 0) return -1;
  const normalizedHeaders = headers.map(h => removeAccents(String(h || '')).toLowerCase().trim());
  
  // Prioritize Creator (Người tạo) first as required for YCX, then Sales Staff
  const priorityList = [
    'nguoi tao',
    'user tao',
    'ten nguoi tao',
    'ma/ten nguoi tao',
    'ten nhan vien ban hang',
    'nhan vien ban hang',
    'user ban hang',
    'nv ban hang',
    'ten nhan vien',
    'ten nv',
    'nhan vien',
    'nguoi ban',
    'nguoi lap',
    'user lap',
    'nv tao',
    'nguoi thuc hien'
  ];

  // Pass 1: Exact match, strictly excluding any header with 'giao' (e.g. Tên nhân viên giao hàng)
  for (const name of priorityList) {
    const idx = normalizedHeaders.findIndex(h => h === name && !h.includes('giao'));
    if (idx !== -1) return idx;
  }

  // Pass 2: Partial match, strictly excluding any header with 'giao'
  for (const name of priorityList) {
    const idx = normalizedHeaders.findIndex(h => h.includes(name) && !h.includes('giao'));
    if (idx !== -1) return idx;
  }

  return -1;
};

const classifyProduct = (name: string, customRules?: BaoHiemRule[]) => {
  const n = String(name || '').toUpperCase();
  
  const rules = customRules || activeCustomBaoHiemRules;
  if (rules && rules.length > 0) {
    const match = rules.find(r => r.tenSanPham && n.includes(r.tenSanPham));
    if (match) return match.phanLoai;
  }

  return '-';
};

let activeCustomCategoryMap: Record<string, { large: string, small: string }> | null = null;

const parseCategoryMapping = (inputText: string): Record<string, { large: string, small: string }> => {
  const result: Record<string, { large: string, small: string }> = {};
  if (!inputText) return result;

  const lines = inputText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('	').map(p => p.trim());
    if (parts.length < 3) continue;

    // Skip header line if any
    const firstCol = parts[0].toLowerCase();
    const secondCol = parts[1].toLowerCase();
    if (firstCol.includes('ngành hàng') && secondCol.includes('nhóm hàng')) {
      continue;
    }

    const nganh = parts[0];
    const nhom = parts[1];
    const large = parts[2];
    const small = parts[3] || '';

    // Map using lowercase keys for case-insensitive lookup
    if (nhom) {
      result[nhom.toLowerCase()] = { large, small };
      const nhomParts = nhom.split(' - ');
      if (nhomParts.length === 2) {
        result[nhomParts[1].trim().toLowerCase()] = { large, small };
      }
    }
    if (nganh) {
      result[nganh.toLowerCase()] = { large, small };
      const nganhParts = nganh.split(' - ');
      if (nganhParts.length === 2) {
        result[nganhParts[1].trim().toLowerCase()] = { large, small };
      }
    }
  }
  return result;
};

const removeAccents = (str: string): string => {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
};



const classifyNhomHangLarge = (
  category: string,
  productName?: string,
  nhomSmallValue?: string,
  activeCustomCategoryMap?: Record<string, { large: string, small: string }>,
  customNhomSmallMap?: Record<string, { nganhHang?: string, large: string, small: string }>,
  customBaoHiemRules?: BaoHiemRule[],
  productCode?: string
): string => {
  const cat = String(category || '').trim();
  const catUpper = cat.toUpperCase();
  const prodCode = String(productCode || '').trim();
  const prodName = String(productName || '').trim().toUpperCase();

  const matchedRule = getMatchedBaoHiemRule(prodCode, prodName, customBaoHiemRules);
  if (matchedRule && matchedRule.nganhHangLon) {
    return matchedRule.nganhHangLon;
  }

  if (catUpper && customNhomSmallMap && customNhomSmallMap[catUpper]) {
    const largeVal = customNhomSmallMap[catUpper].large;
    return largeVal === 'BẢO HIỂM' ? 'B.HIỂM' : largeVal;
  }

  const catLower = cat.toLowerCase();
  
  // Try exact match in NHOM_HANG_MAP
  if (NHOM_HANG_MAP[cat] && NHOM_HANG_MAP[cat].large) {
    return NHOM_HANG_MAP[cat].large;
  }
  
  // Try case-insensitive match
  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    if (key.toLowerCase() === catLower) {
      return val.large;
    }
  }

  // Try partial match by splitting ' - '
  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    const parts = key.split(' - ');
    if (parts.length === 2) {
      const name = parts[1].trim().toLowerCase();
      if (catLower === name || catLower.includes(name) || name.includes(catLower)) {
        return val.large;
      }
    }
  }

  return 'Khác';
};



const resolveNhomSmall = (
  category: string,
  nhomSmallValue: string,
  nhomLarge: string,
  productName?: string,
  customNhomSmallMap?: Record<string, { large: string, small: string }>,
  productCode?: string,
  customBaoHiemRules?: BaoHiemRule[]
): string => {
  const cat = String(category || '').trim().toUpperCase();
  const prodName = String(productName || '').trim().toUpperCase();
  const prodCode = String(productCode || '').trim();
  
  const matchedRule = getMatchedBaoHiemRule(prodCode, prodName, customBaoHiemRules);
  if (matchedRule && matchedRule.nhomHangNho) {
    return matchedRule.nhomHangNho;
  }
  
  if (nhomSmallValue && customNhomSmallMap && customNhomSmallMap[nhomSmallValue]) {
    return customNhomSmallMap[nhomSmallValue].small;
  }
  if (cat && customNhomSmallMap && customNhomSmallMap[cat]) {
    return customNhomSmallMap[cat].small;
  }

  const origCat = String(category || '').trim();
  const catLower = origCat.toLowerCase();

  if (NHOM_HANG_MAP[origCat] && NHOM_HANG_MAP[origCat].small) {
    return NHOM_HANG_MAP[origCat].small;
  }

  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    if (key.toLowerCase() === catLower) {
      return val.small;
    }
  }

  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    const parts = key.split(' - ');
    if (parts.length === 2) {
      const name = parts[1].trim().toLowerCase();
      if (catLower === name || catLower.includes(name) || name.includes(catLower)) {
        return val.small;
      }
    }
  }

  if (nhomSmallValue) return nhomSmallValue;
  return 'KHÁC';
};

const resolveNhomSmallFriendlyName = (
  row: any[],
  idxSmallCategoryHeader: number,
  idxNhomHang: number,
  idxProduct?: number,
  idxProductCode?: number,
  customNhomSmallMap?: Record<string, { large: string, small: string }>,
  customBaoHiemRules?: BaoHiemRule[]
): string => {
  const catVal = idxNhomHang !== -1 ? String(row[idxNhomHang] || '').trim().toUpperCase() : '';
  const origCat = idxNhomHang !== -1 ? String(row[idxNhomHang] || '').trim() : '';
  const nhomSmallValue = idxSmallCategoryHeader !== -1 ? String(row[idxSmallCategoryHeader] || '').trim().toUpperCase() : '';
  const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
  const prodName = idxProduct !== -1 ? String(row[idxProduct] || '').toUpperCase() : '';
  
  const matchedRule = getMatchedBaoHiemRule(prodCode, prodName, customBaoHiemRules);
  if (matchedRule && matchedRule.nhomHangNho) {
    return matchedRule.nhomHangNho;
  }
  
  if (catVal && customNhomSmallMap && customNhomSmallMap[catVal]) {
    return customNhomSmallMap[catVal].small;
  }

  const catLower = origCat.toLowerCase();
  if (NHOM_HANG_MAP[origCat] && NHOM_HANG_MAP[origCat].small) {
    return NHOM_HANG_MAP[origCat].small;
  }

  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    if (key.toLowerCase() === catLower) {
      return val.small;
    }
  }

  for (const [key, val] of Object.entries(NHOM_HANG_MAP)) {
    const parts = key.split(' - ');
    if (parts.length === 2) {
      const name = parts[1].trim().toLowerCase();
      if (catLower === name || catLower.includes(name) || name.includes(catLower)) {
        return val.small;
      }
    }
  }

  if (nhomSmallValue) return nhomSmallValue;
  return 'KHÁC';
};

const getNganhName = (key: string) => NGANH_DISPLAY[key] || key;

const getRowDtqd = (nhomLarge: string, qty: number, revenue: number, nhomSmall?: string, isTraGop?: boolean) => {
  let rate = 1.0;
  if (nhomLarge === 'ICT') {
    if (nhomSmall === 'LAP' || nhomSmall === 'TAB' || nhomSmall === 'TABLET') {
      rate = 1.20;
    }
  } else if (nhomLarge === 'CE') {
    if (nhomSmall === 'AUDIO') {
      rate = 1.29;
    }
  } else if (nhomLarge === 'ĐIỆN GD' || nhomLarge === 'PHỤ KIỆN LẶP ĐẶT' || nhomLarge === 'Gia dụng lắp đặt') {
    rate = 1.85;
  } else if (nhomLarge === 'BẢO HIỂM' || nhomLarge === 'B.HIỂM') {
    rate = 4.18;
  } else if (nhomLarge === 'SIM') {
    rate = 5.45;
  } else if (nhomLarge === 'VIEON') {
    rate = 5.45;
  } else if (nhomLarge === 'CHĂM SÓC SẮC ĐẸP') {
    rate = 1.85;
  } else if (nhomLarge === 'ĐỒNG HỒ' || nhomLarge === 'ĐỒNG HỒ THỜI TRANG' || nhomLarge === 'WEARABLE') {
    rate = 3.00;
  } else if (nhomLarge === 'PHỤ KIỆN') {
    rate = 3.37;
  } else if (nhomLarge === 'DCNB') {
    rate = 1.92;
  } else if (nhomLarge === 'IT') {
    rate = 2.00;
  }

  if (isTraGop) {
    return (revenue * rate) + (revenue * 0.3);
  }
  return revenue * rate;
};

// Date column checking helper
const isDateColumnHeader = (h: string): boolean => {
  if (!h) return false;
  const lh = h.toLowerCase();
  return lh.includes('ngày tạo') || lh.includes('ngày lập') || lh.includes('ngày xuất') || lh.includes('ngày giao') || lh.includes('ngày hoàn');
};

// Format raw date string → dd/MM/yyyy HH:mm:ss
const fmtRawDate = (raw: string): string => {
  if (!raw || raw.trim() === '') return '-';
  const p2 = (n: number) => String(n).padStart(2, '0');

  // ── Excel serial date number (e.g. 46143.40754975694) ──
  const num = parseFloat(raw);
  if (!isNaN(num) && /^\d+(\.\d+)?$/.test(raw.trim()) && num > 40000 && num < 60000) {
    const days = Math.floor(num);
    const fraction = num - days;
    const dateMs = (days - 25569) * 86400000;
    const d = new Date(dateMs);
    const dd = p2(d.getUTCDate());
    const mm = p2(d.getUTCMonth() + 1);
    const yyyy = d.getUTCFullYear();
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

export default function NewRealtimePage({ pageMaintenanceState = {}, isUser43751Local = false }: { pageMaintenanceState?: Record<string, boolean>, isUser43751Local?: boolean, useV2Layout?: boolean }) {
  const isV2Active = true;
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.username === '43751' || userProfile?.username === 'ADMIN' || userProfile?.role === 'admin';
  const isUser43751 = String(userProfile?.username || '').trim() === '43751' || 
                      String(userProfile?.ma_nhan_vien || '').trim() === '43751' || 
                      String(userProfile?.user_id || '').trim() === '43751';
  const [isProcessingData, setIsProcessingData] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { showNotification } = useNotification();
  const { marketFilter, setMarketFilter, availableMarkets: filteredMarkets } = useMarket();
  const { isStoreReady, activeRealtimeTab: activeTab, setActiveRealtimeTab: setActiveTab } = useStore();
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([]);
  const [selectedMaKho, setSelectedMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customNhomSmallMap, setCustomNhomSmallMap] = useState<Record<string, { nganhHang?: string, large: string, small: string }>>({});
  const [showConfigBaoHiemModal, setShowConfigBaoHiemModal] = useState(false);
  const [customBaoHiemRules, setCustomBaoHiemRules] = useState<BaoHiemRule[]>([]);
  const [showConfigLoaiBoModal, setShowConfigLoaiBoModal] = useState(false);
  const [customExclusionRules, setCustomExclusionRules] = useState<ExclusionRule[]>([]);
  const [showConfigQuyDoiModal, setShowConfigQuyDoiModal] = useState(false);
  const [customQuyDoiRules, setCustomQuyDoiRules] = useState<QuyDoiRule[]>([]);
  const [showConfigGoogleSheetModal, setShowConfigGoogleSheetModal] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');

  // Nhận xét Doanh thu & Ngành hàng Modal State
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedCommentTemplate, setSelectedCommentTemplate] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [copiedComment, setCopiedComment] = useState(false);

  // Fetch pending users for admin (43751)
  const fetchPendingUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('ql_nguoi_dung')
        .select('username, storeCode, status, password')
        .eq('status', 'pending');
      
      if (!usersError && usersData) {
        // Batch-fetch all warehouse names in one query instead of one query per pending
        // user (N+1) — cheap when there are 0-2 pending users, wasteful once there are many.
        const storeCodes = Array.from(new Set(usersData.map((u: any) => u.storeCode).filter(Boolean)));
        const whMap = new Map<string, string>();
        if (storeCodes.length > 0) {
          const { data: whList } = await supabase
            .from('warehouses')
            .select('ma_kho, ten_kho')
            .in('ma_kho', storeCodes);
          (whList || []).forEach((wh: any) => whMap.set(wh.ma_kho, wh.ten_kho));
        }
        const usersWithWarehouse = usersData.map((u: any) => ({
          username: u.username,
          storeCode: u.storeCode,
          password: u.password,
          status: u.status,
          ten_sieu_thi: whMap.get(u.storeCode) || `Siêu thị ${u.storeCode}`
        }));
        setPendingUsers(usersWithWarehouse);
        setPendingUsersCount(usersWithWarehouse.length);
      }
    } catch (e) {
      console.error('Error fetching pending users:', e);
    }
  };

  useEffect(() => {
    if (isUser43751) {
      fetchPendingUsers();
    }
  }, [isUser43751, userProfile?.username]);

  const handleEditSupermarketName = async (username: string, storeCode: string, oldStoreName: string, newStoreName: string) => {
    if (!newStoreName || !newStoreName.trim()) return;
    const cleanNewStoreName = newStoreName.trim();
    if (cleanNewStoreName === oldStoreName) return;

    try {
      // 1. Update the warehouses table (ten_kho column)
      const { error: whError } = await supabase
        .from('warehouses')
        .upsert({
          ma_kho: storeCode,
          ten_kho: cleanNewStoreName
        }, { onConflict: 'ma_kho' });

      if (whError) throw whError;

      // 2. Normalize IDs
      const oldId = normalizeStoreId(oldStoreName);
      const newId = normalizeStoreId(cleanNewStoreName);

      if (oldId && oldId !== newId) {
        // Fetch old store doc
        const { data: oldDoc } = await supabase
          .from('store')
          .eq('id', oldId)
          .maybeSingle();

        if (oldDoc) {
          // Update the declared stores array to reflect the new store name if it is there
          let updatedDeclaredStores = oldDoc.declared_stores || [];
          if (Array.isArray(updatedDeclaredStores)) {
            updatedDeclaredStores = updatedDeclaredStores.map((s: string) => 
              s === oldStoreName ? cleanNewStoreName : s
            );
          }

          // Create new document with new ID
          const { error: insertError } = await supabase
            .from('store')
            .upsert({
              ...oldDoc,
              id: newId,
              ten_sieu_thi: cleanNewStoreName,
              declared_stores: updatedDeclaredStores,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

          if (insertError) throw insertError;

          // Delete old document
          const { error: deleteError } = await supabase
            .from('store')
            .delete()
            .eq('id', oldId);

          if (deleteError) {
            console.error('Error deleting old store doc:', deleteError);
          }
        }
      }

      // Refresh list
      await fetchPendingUsers();
      showNotification('Đã cập nhật tên siêu thị thành công và lưu vào Firebase!', 'success');
    } catch (err: any) {
      console.error('Error editing supermarket name:', err);
      showNotification('Có lỗi xảy ra khi chỉnh sửa tên siêu thị: ' + (err.message || ''), 'error');
    }
  };

  const handleApproveUser = async (username: string) => {
    try {
      const { error } = await supabase
        .from('ql_nguoi_dung')
        .update({
          status: 'active',
          paymentConfirmed: true
        })
        .eq('username', username);

      if (error) throw error;

      await fetchPendingUsers();
      showNotification(`Đã duyệt kích hoạt tài khoản ${username} thành công!`, 'success');
    } catch (err: any) {
      console.error('Error approving user:', err);
      showNotification('Có lỗi xảy ra khi phê duyệt người dùng: ' + (err.message || ''), 'error');
    }
  };

  const handleRejectUser = async (username: string) => {
    try {
      const { error } = await supabase
        .from('ql_nguoi_dung')
        .update({
          status: 'rejected',
          paymentConfirmed: false
        })
        .eq('username', username);

      if (error) throw error;

      await fetchPendingUsers();
      showNotification(`Đã từ chối kích hoạt tài khoản ${username}!`, 'success');
    } catch (err: any) {
      console.error('Error rejecting user:', err);
      showNotification('Có lỗi xảy ra khi từ chối người dùng: ' + (err.message || ''), 'error');
    }
  };

  // One-time cached reads instead of 4 permanent onSnapshot listeners — these are
  // admin-edited business rule tables that change rarely. See src/services/cachedFirestore.ts
  // for why: a live listener here is billed on every mount AND to every open session
  // on every edit, which at ~1000 concurrent users is the single biggest Firestore
  // read multiplier in the app.
  useEffect(() => {
    let cancelled = false;
    getCachedDoc<{ map: any }>('system_configs', 'nhom_hang_map').then((data) => {
      if (!cancelled && data?.map) setCustomNhomSmallMap(data.map);
    });
    getCachedDoc<{ rules: any }>('system_configs', 'bao_hiem_map').then((data) => {
      if (!cancelled && data?.rules) {
        setCustomBaoHiemRules(data.rules);
        activeCustomBaoHiemRules = data.rules;
      }
    });
    getCachedDoc<{ rules: any }>('system_configs', 'loai_bo_map').then((data) => {
      if (!cancelled && data?.rules) setCustomExclusionRules(data.rules);
    });
    getCachedDoc<{ rules: any }>('system_configs', 'quy_doi_map').then((data) => {
      if (!cancelled && data?.rules) setCustomQuyDoiRules(data.rules);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeTab === 'khai_thac_moi' && !isUser43751) {
      setActiveTab('summary');
    }
  }, [activeTab, isUser43751]);
  const { ycxData, setYcxData, ycxDataMoi, setYcxDataMoi, ycxFileName, setYcxFileName, ycxFileNameMoi, setYcxFileNameMoi, processedData, isLoadingRealtime, isProcessingRealtime, loadData, lastUpdated, hasLoadedFromDB, processError, activeStore, setActiveStore, marketInput, setMarketInput, categoryInput, setCategoryInput, categoryRevenueInput, setCategoryRevenueInput, saveRealtimeData } = useRealtimeData(selectedMaKho);

  const daysRemaining = useMemo(() => {
    if (!userProfile?.expiredAt) return null;
    const exp = new Date(userProfile.expiredAt);
    const today = new Date();
    exp.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diff = exp.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [userProfile?.expiredAt]);

  // States and hooks for Birthday greetings in card (Placed safely after standard hook initializations)
  const [birthdaysList, setBirthdaysList] = useState<any[]>([]);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isEditingAnnounce, setIsEditingAnnounce] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | 'new' | null>(null);
  const [announceTitleInput, setAnnounceTitleInput] = useState('');
  const [announceContentInput, setAnnounceContentInput] = useState('');
  const [isSavingAnnounce, setIsSavingAnnounce] = useState(false);

  // One-time read (server-side filtered by active=true) + short localStorage cache,
  // instead of a live onSnapshot on the whole collection. A permanent listener here
  // was billed for every document on every mount AND re-billed to every concurrently
  // open session on every single announcement edit — at ~1000 concurrent users that
  // turns one admin edit into ~1000 reads. Announcements don't need sub-minute
  // real-time propagation, so a 3-minute cache is a large read reduction for
  // effectively no UX cost.
  const loadAnnouncements = useCallback(async (force = false) => {
    const CACHE_KEY = 'crm_announcements_cache_v1';
    const TTL_MS = 3 * 60 * 1000;
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < TTL_MS) {
            setAnnouncements(parsed.data);
            return;
          }
        }
      } catch {}
    }
    try {
      const q = query(collection(db, 'system_announcements'), where('active', '==', true));
      const snap = await getDocs(q);
      const docs: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setAnnouncements(docs);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: docs })); } catch {}
    } catch (error) {
      console.error('[RealtimePage] Lỗi tải thông báo:', error);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements(false);
  }, [loadAnnouncements]);

  const handleSaveAnnouncement = async () => {
    if (!announceContentInput.trim()) {
      showNotification('Nội dung thông báo không được để trống.', 'error');
      return;
    }
    setIsSavingAnnounce(true);
    try {
      const isNew = editingDocId === 'new';
      const docRef = isNew 
        ? doc(collection(db, 'system_announcements'))
        : doc(db, 'system_announcements', String(editingDocId));

      await setDoc(docRef, {
        title: announceTitleInput.trim() || 'Thông báo hệ thống',
        content: announceContentInput.trim(),
        active: true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      showNotification(isNew ? 'Thêm thông báo mới thành công.' : 'Cập nhật thông báo thành công.', 'success');
      setEditingDocId(null);
      setAnnounceTitleInput('');
      setAnnounceContentInput('');
      loadAnnouncements(true);
    } catch (err) {
      console.error('Failed to save announcement:', err);
      showNotification('Lỗi khi lưu thông báo.', 'error');
    } finally {
      setIsSavingAnnounce(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return;
    setIsSavingAnnounce(true);
    try {
      await deleteDoc(doc(db, 'system_announcements', id));
      showNotification('Đã xóa thông báo thành công.', 'success');
      if (editingDocId === id) {
        setEditingDocId(null);
        setAnnounceTitleInput('');
        setAnnounceContentInput('');
      }
      loadAnnouncements(true);
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      showNotification('Lỗi khi xóa thông báo.', 'error');
    } finally {
      setIsSavingAnnounce(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      birthdayService.getBirthdays()
        .then(data => setBirthdaysList(data))
        .catch(err => console.error('[RealtimePage] Lỗi tải dữ liệu sinh nhật:', err));
    }
  }, [userProfile]);

  const { todayBirthdays, tomorrowBirthdays } = useMemo(() => {
    const todayList: string[] = [];
    const tomorrowList: string[] = [];

    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowMonth = tomorrow.getMonth() + 1;
    const tomorrowDay = tomorrow.getDate();

    birthdaysList.forEach(b => {
      const matchesWarehouse = 
        marketFilter === 'ALL' || 
        b.warehouse_code === marketFilter;

      if (!matchesWarehouse) {
        return;
      }

      if (!b.birthday) return;
      const parts = b.birthday.split('-');
      if (parts.length < 3) return;
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);

      const labelSuffix = marketFilter === 'ALL' ? ` (${b.warehouse_code})` : '';

      if (m === todayMonth && d === todayDay) {
        todayList.push(`${b.employee_name}${labelSuffix}`);
      } else if (m === tomorrowMonth && d === tomorrowDay) {
        tomorrowList.push(`${b.employee_name}${labelSuffix}`);
      }
    });

    return { todayBirthdays: todayList, tomorrowBirthdays: tomorrowList };
  }, [birthdaysList, marketFilter, userProfile]);

  const [inventorySchedules, setInventorySchedules] = useState<any[]>([]);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_schedules')
          .select('*');
        if (data) {
          setInventorySchedules(data);
        }
      } catch (err) {
        console.error('[RealtimePage] Lỗi tải lịch kiểm kê:', err);
      }
    };
    fetchSchedules();
  }, []);

  const activeInventoryNotification = useMemo(() => {
    if (!inventorySchedules || inventorySchedules.length === 0) return null;
    
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const today = new Date(todayStr);

    const items = inventorySchedules.map(s => {
      if (!s.inventory_date) return null;
      const sDate = new Date(s.inventory_date);
      const diffTime = sDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...s, diffDays };
    }).filter((s): s is any => s !== null && s.diffDays === 0);

    if (items.length === 0) return null;

    // Sort by diffDays ascending to prioritize the nearest inventory cycle
    items.sort((a, b) => a.diffDays - b.diffDays);
    const active = items[0];

    return {
      title: active.title,
      date: active.inventory_date,
      diffDays: active.diffDays,
    };
  }, [inventorySchedules]);

  const {
    drillFilterStaff, setDrillFilterStaff,
    categoryMappingInput, setCategoryMappingInput,
    allStoreTargets, stTargetSauHeSo, stTargetQuyDoi, stPercentTarget
  } = useRTSTSharedData(selectedMaKho);

  const customCategoryMap = useMemo(() => {
    return parseCategoryMapping(categoryMappingInput || '');
  }, [categoryMappingInput]);

  activeCustomCategoryMap = customCategoryMap;

  const { processedData: luykeProcessedData, clusterSummaryInput, setClusterSummaryInput, clusterCategoryInput, setClusterCategoryInput, saveLuykeData } = useLuykeData(selectedMaKho);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [drillFilterStore, setDrillFilterStore] = useState<string[]>([]);
  const [drillFilterProduct, setDrillFilterProduct] = useState<string[]>([]);
  const [drillFilterTrangThaiSP, setDrillFilterTrangThaiSP] = useState<string[]>([]);
  const [drillLevels, setDrillLevels] = useState<string[]>(['kho', 'nganh', 'nhom', 'hang', 'sanpham', 'nguoitao', 'trangthaisp']);
  const [expandedDrillRows, setExpandedDrillRows] = useState<Record<string, boolean>>({});
  const [isDrillFullscreen, setIsDrillFullscreen] = useState(false);
  const [drillExpandDepth, setDrillExpandDepth] = useState<number>(1);
  const [selectedDrillGroups, setSelectedDrillGroups] = useState<string[]>([]);
  const [drillFilterNhomSmall, setDrillFilterNhomSmall] = useState<string[]>([]);
  const [drillFilterBrand, setDrillFilterBrand] = useState<string[]>([]);
  const [activeDrillFilter, setActiveDrillFilter] = useState<string | null>(null);
  const [drillFilterSearch, setDrillFilterSearch] = useState('');
  const drillFilterBarRef = useRef<HTMLDivElement>(null);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingData(true);
    const formatFileName = (name: string) => {
      let n = name.replace(/\.xlsx?$|\.csv$/i, '');
      if (/[a-f0-9]{20,}/i.test(n)) {
        n = n.replace(/[a-f0-9]{20,}/i, '...');
      }
      return n.length > 30 ? n.substring(0, 27) + '...' : n;
    };

    if (isMoiTab) {
      setYcxFileNameMoi(prev => (prev && prev.trim() ? `${prev} + ${formatFileName(file.name)}` : formatFileName(file.name)));
    } else {
      setYcxFileName(formatFileName(file.name));
    }

    // Clear input value so same file can be uploaded again if needed
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary', dense: true });
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
          const rawStringRows = cleanedData.map(row =>
            (Array.isArray(row) ? row : []).map(cell => cell === null || cell === undefined ? '' : String(cell)).join('\t')
          );

          if (isMoiTab) {
            setYcxDataMoi(prev => {
              if (prev && prev.trim()) {
                // If data already exists, strip the header row of newly uploaded file
                const newRowsWithoutHeader = rawStringRows.slice(1).join('\n');
                return prev.trim() + '\n' + newRowsWithoutHeader;
              }
              return rawStringRows.join('\n');
            });
          } else {
            const rawString = rawStringRows.join('\n');
            setYcxData(rawString);
          }
          // showNotification('Đã xử lý dữ liệu Excel thành công!', 'success'); // Hidden as requested
          // Wait longer for React re-render + useEffect ref update before saving to Firebase
          setTimeout(() => {
            console.log('[YCX Upload] Triggering save to Firebase...');
            saveRealtimeData(false);
          }, 2500);
        } catch (error) {
          console.error(error);
          showNotification('Lỗi khi xử lý file Excel!', 'error');
        } finally {
          setIsProcessingData(false);
        }
      }, 100);
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

  // ===== SSG Boss: Load M.TIÊU H.NAY for TARGET column =====
  const [ssgBossData, setSsgBossData] = useState<{
    dataMap: Record<string, { dtqdNamTruoc: string; mucTieuSSG: string }>;
    savedDtqd: Record<string, number>;
    tbConLaiMap: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    const loadSSGBoss = async () => {
      try {
        const docRef = doc(db, 'app_settings', 'ssg_boss_data');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setSsgBossData({
            dataMap: data.dataMap || {},
            savedDtqd: data.savedDtqd || {},
            tbConLaiMap: data.tbConLaiMap || {},
          });
        }
      } catch (err) {
        console.error('[RealtimePage] Error loading SSG Boss data:', err);
      }
    };
    loadSSGBoss();
  }, []);

  // Calculate / fetch M.TIÊU H.NAY for the active store
  const ssgTbConLai = useMemo(() => {
    if (!ssgBossData || !activeStore) return 0;
    const normActive = normalize(activeStore);
    
    // First try matching directly in tbConLaiMap using normalized store name
    const tbConLaiKey = Object.keys(ssgBossData.tbConLaiMap).find(k => normalize(k) === normActive);
    if (tbConLaiKey && typeof ssgBossData.tbConLaiMap[tbConLaiKey] === 'number') {
      return ssgBossData.tbConLaiMap[tbConLaiKey];
    }

    // Fallback: calculate if tbConLaiMap value is missing
    const matchedKey = Object.keys(ssgBossData.dataMap).find(k => normalize(k) === normActive);
    if (!matchedKey) return 0;

    const row = ssgBossData.dataMap[matchedKey];
    const dtqdNamTruocRaw = row.dtqdNamTruoc || '0';
    const dtqdNamTruoc = parseFloat(String(dtqdNamTruocRaw).replace(/[.,\s]/g, '')) || 0;
    const mucTieuSSG = parseFloat(row.mucTieuSSG || '0') || 0;
    if (dtqdNamTruoc <= 0 || mucTieuSSG <= 0) return 0;

    const mucTieuSSGDecimal = mucTieuSSG / 100;
    const targetHienTai = dtqdNamTruoc * mucTieuSSGDecimal;
    const dtqdHienTai = ssgBossData.savedDtqd[matchedKey] || 0;

    const { totalDaysInMonth, daysPassed } = mucTieu100Info;
    const tbConLai = targetHienTai > 0 && daysPassed > 0
      ? (targetHienTai * (daysPassed + 1) / totalDaysInMonth) - dtqdHienTai
      : 0;
    if (tbConLai < 0) {
      const tbNgay = targetHienTai > 0 ? targetHienTai / totalDaysInMonth : 0;
      return tbNgay;
    }
    return tbConLai;
  }, [ssgBossData, activeStore, mucTieu100Info]);


  // compareMode MUST be declared before the useMemo that uses it (TDZ fix)
  const [compareMode, setCompareMode] = useState<'none' | 'day' | 'week' | 'month'>('none');

  const isMoiTab = activeTab === 'khai_thac_moi';
  const currentYcxData = isMoiTab ? ycxDataMoi : ycxData;
  const currentYcxFileName = isMoiTab ? ycxFileNameMoi : ycxFileName;

  const rawYcxRows = useMemo(() => {
    if (!currentYcxData) return [];
    return currentYcxData.split('\n').filter(line => line.trim()).map(line => line.split('\t'));
  }, [currentYcxData]);

  const filteredRawYcxRows = useMemo(() => {
    if (!rawYcxRows || rawYcxRows.length <= 1) return [];

    // DATA YCX MỚI: hiển thị TẤT CẢ dữ liệu, không lọc bất kỳ điều kiện nào
    if (isMoiTab) {
      return rawYcxRows.slice(1);
    }

    const headers = rawYcxRows[0].map(h => h.trim());

    // Find column indices by exact name or fallback to -1
    let idxStatus = (() => {
      const exact = headers.findIndex(h => {
        const lower = removeAccents(h).toLowerCase().trim();
        return lower === 'trang thai xuat' || lower === 'trang thai ycx' || lower === 'tinh trang xuat';
      });
      if (exact !== -1) return exact;
      return headers.findIndex(h => {
        const lower = removeAccents(h).toLowerCase().trim();
        return (lower.includes('trang thai xuat') || lower.includes('trang thai ycx') || lower.includes('tinh trang xuat')) && !lower.includes('thoi gian') && !lower.includes('ngay');
      });
    })();

    let idxThuTien = (() => {
      const exact = headers.findIndex(h => {
        const lower = removeAccents(h).toLowerCase().trim();
        return lower === 'trang thai thu tien';
      });
      if (exact !== -1) return exact;
      return headers.findIndex(h => {
        const lower = removeAccents(h).toLowerCase().trim();
        return lower.includes('trang thai thu tien') && !lower.includes('thoi gian');
      });
    })();

    let idxTra = headers.findIndex(h => {
      const lower = removeAccents(h).toLowerCase().trim();
      return lower.includes('tinh trang nhap tra') || lower.includes('nhap tra') || lower === 'tra hang';
    });

    let idxNhomHang = headers.findIndex(h => {
      const lower = removeAccents(h).toLowerCase().trim();
      return (lower.includes('nhom hang') && !lower.includes('nho')) || lower === 'nhom hang';
    });

    let idxCategory = (() => {
      const exactNhom = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase().trim();
        return norm === 'nhom hang' || norm === 'ten nhom hang';
      });
      if (exactNhom !== -1) return exactNhom;
      const partialNhom = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase().trim();
        return norm.includes('nhom hang') && !norm.includes('nhom hang nho');
      });
      if (partialNhom !== -1) return partialNhom;
      return headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase().trim();
        return norm.includes('nganh hang') || norm.includes('nhom nganh hang');
      });
    })();

    let idxProduct = headers.findIndex(h => {
      const lower = removeAccents(h).toLowerCase().trim();
      return lower.includes('ten san pham') || (lower.includes('san pham') && !lower.includes('ma')) || lower === 'ten hang';
    });

    let idxProductCode = headers.findIndex(h => {
      const lower = removeAccents(h).toLowerCase().trim();
      return lower.includes('ma san pham') || lower.includes('ma hang') || lower === 'ma sp';
    });

    const idxHinhThucXuat = (() => {
      const idxExact = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === 'hinh thuc xuat');
      if (idxExact !== -1) return idxExact;
      return headers.findIndex(h => {
        const lh = removeAccents(h).toLowerCase().trim();
        return lh === 'loai ycx' || lh === 'loai yeu cau' || lh === 'phan loai ycx';
      });
    })();

    return rawYcxRows.slice(1).filter((row, rIdx) => {
      const productName = idxProduct !== -1 ? String(row[idxProduct] || '').trim() : '';
      const category = idxCategory !== -1 ? String(row[idxCategory] || '').trim() : '';
      const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
      const pClass = classifyProductByCode(prodCode, customBaoHiemRules) || classifyProduct(productName, customBaoHiemRules);

      const normProdUpper = removeAccents(productName).toUpperCase();
      const normCatUpper = removeAccents(category).toUpperCase();

      const isVasRow = 
        pClass === 'Mango' || pClass === 'Icall' || ['V1', 'V2', 'V3', 'V4'].includes(pClass) ||
        pClass === 'B.HIỂM' || ['BHXM', 'BHRV', 'BHMR', 'BHKV', 'SC+', '1 ĐỔI 1', 'BHAP', 'BHOT', 'BHVC', 'BHMT', 'BHXH', 'BHYT', 'BVMH', 'GIC'].includes(pClass) ||
        normProdUpper.includes('MANGO') || normProdUpper.includes('ICALL') || normProdUpper.includes('VIEON') ||
        ((normProdUpper.includes('BAO HIEM') || normCatUpper.includes('BAO HIEM')) && !normProdUpper.includes('NON BAO HIEM') && !normProdUpper.includes('MU BAO HIEM') && !normCatUpper.includes('NON BAO HIEM') && !normCatUpper.includes('MU BAO HIEM')) ||
        normProdUpper.includes('1 DOI 1') || normProdUpper.includes('PVI_') ||
        normProdUpper.includes('BVMH') || normProdUpper.includes('BAO VE MAN HINH') ||
        category.includes('1994') || category.includes('4479') || category.includes('7139');

      const statusValue = idxStatus !== -1 ? removeAccents(String(row[idxStatus] || '')).trim().toLowerCase() : '';
      const thuTienValue = idxThuTien !== -1 ? removeAccents(String(row[idxThuTien] || '')).trim().toLowerCase() : '';
      const traValue = idxTra !== -1 ? removeAccents(String(row[idxTra] || '')).trim().toLowerCase() : '';

      let failStatus = false;
      if (idxStatus !== -1) {
        if (!statusValue || !statusValue.includes('da xuat')) failStatus = true;
      }

      let failThuTien = false;
      if (idxThuTien !== -1 && isVasRow) {
        if (!thuTienValue || !thuTienValue.includes('da thu')) failThuTien = true;
      }

      let failTra = false;
      if (idxTra !== -1 && traValue) {
        if (traValue.includes('da tra') || (traValue.includes('tra') && !traValue.includes('chua tra'))) failTra = true;
      }

      if (failStatus || failThuTien || failTra) {
        if (rIdx < 50) {
          console.log(`[Filter YCX Row ${rIdx} FAIL status/thutien/tra]`, {
            product: row[idxProduct],
            category: row[idxCategory],
            statusValue,
            thuTienValue,
            traValue,
            failStatus,
            failThuTien,
            failTra
          });
        }
        return false;
      }

      // 4. Loại trừ theo danh sách Cấu hình loại bỏ động (hoặc danh sách mặc định)
      const rowHtx = idxHinhThucXuat !== -1 ? removeAccents(String(row[idxHinhThucXuat] || '')).toUpperCase() : '';
      const rowNganh = idxCategory !== -1 ? removeAccents(String(row[idxCategory] || '')).toUpperCase() : '';
      const rowNhom = idxNhomHang !== -1 ? removeAccents(String(row[idxNhomHang] || '')).toUpperCase() : '';
      const rowTenSP = idxProduct !== -1 ? removeAccents(String(row[idxProduct] || '')).toUpperCase() : '';

      let shouldExclude = false;
      if (customExclusionRules && customExclusionRules.length > 0) {
        shouldExclude = customExclusionRules.some(rule => {
          const normHtx = removeAccents(rule.hinhThucXuat || '').toUpperCase().trim();
          const normNganh = removeAccents(rule.nganhHang || '').toUpperCase().trim();
          const normNhom = removeAccents(rule.nhomHang || '').toUpperCase().trim();
          const normTenSP = removeAccents(rule.tenSanPham || '').toUpperCase().trim();

          if (!normHtx && !normNganh && !normNhom && !normTenSP) return false;

          const matchHtx = normHtx && rowHtx.includes(normHtx);
          const matchNganh = normNganh && rowNganh.includes(normNganh);
          const matchNhom = normNhom && rowNhom.includes(normNhom);
          const matchTenSP = normTenSP && rowTenSP.includes(normTenSP);

          return matchHtx || matchNganh || matchNhom || matchTenSP;
        });
      } else {
        // Fallback mặc định
        const nhomHangVal = idxNhomHang !== -1 
          ? removeAccents(String(row[idxNhomHang] || '')).toLowerCase()
          : removeAccents(row.join(' ')).toLowerCase();

        shouldExclude = 
          nhomHangVal.includes('2513') ||
          nhomHangVal.includes('2571') ||
          nhomHangVal.includes('4519') ||
          nhomHangVal.includes('4599') ||
          nhomHangVal.includes('thu ho payoo') ||
          nhomHangVal.includes('thu ho cuoc viettel') ||
          nhomHangVal.includes('thu ho tien tra gop') ||
          nhomHangVal.includes('thu ho tien mat');
      }

      if (shouldExclude) {
        if (rIdx < 50) {
          console.log(`[Filter YCX Row ${rIdx} FAIL shouldExclude]`, { product: row[idxProduct], rowHtx, rowNganh, rowNhom, rowTenSP });
        }
        return false;
      }

      // 5. Ẩn / Loại trừ Ngành hàng "Khác" / "Không rõ" / "Thẻ cào" (GIỮ LẠI B.HIỂM, V1, V2, V3, VieON, MANGO, ICALLME)

      let failNhomLarge = false;
      if (!isVasRow) {
        const nhomSmallValue = '';
        const nhomLarge = classifyNhomHangLarge(category, productName, nhomSmallValue, undefined, customNhomSmallMap, customBaoHiemRules, prodCode);
        if (nhomLarge === 'Khác' || nhomLarge === 'KHÁC' || nhomLarge === 'Không rõ' || nhomLarge === 'THỂ CÀO') {
          failNhomLarge = true;
        }
      }

      if (failNhomLarge) {
        if (rIdx < 50) {
          console.log(`[Filter YCX Row ${rIdx} FAIL failNhomLarge]`, { product: row[idxProduct], category, isVasRow });
        }
        return false;
      }

      if (rIdx < 50) {
        console.log(`[Filter YCX Row ${rIdx} KEEP]`, { product: row[idxProduct], category, isVasRow });
      }
      return true;
    });
  }, [rawYcxRows, isMoiTab, customNhomSmallMap, customBaoHiemRules, customExclusionRules]);

  const rawYcxRowsForTable = useMemo(() => {
    if (rawYcxRows.length <= 1) return [];
    return rawYcxRows.slice(1);
  }, [rawYcxRows]);

  // Defer heavy row list so useMemo stats don't block render
  const deferredFilteredRows = useDeferredValue(filteredRawYcxRows);
  const deferredRawTableRowsForUnique = useDeferredValue(rawYcxRowsForTable);

  // ─── Single-pass computation: iterate filteredRawYcxRows only ONCE ──────────
  // ─── Single-pass computation: iterate filteredRawYcxRows only ONCE ──────────
  const { staffAirConStats, staffCEStats, allStaffNames, drillDownData, drillDownDataPrev, drillRefMs, currLabel, prevLabel, minDateStr, maxDateStr } = useMemo(() => {
    const empty = { staffAirConStats: [] as any[], staffCEStats: [] as any[], allStaffNames: [] as string[], drillDownData: [] as any[], drillDownDataPrev: [] as any[], drillRefMs: 0, currLabel: '', prevLabel: '', minDateStr: '', maxDateStr: '' };
    if (rawYcxRows.length <= 1 || filteredRawYcxRows.length === 0) return empty;

    const headers = rawYcxRows[0].map(h => String(h || '').trim());
    const findIdx = (names: string[], defaultIdx: number) => {
      const normalizedNames = names.map(n => removeAccents(n).toLowerCase().trim());
      for (const name of normalizedNames) {
        const exactIdx = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === name);
        if (exactIdx !== -1) return exactIdx;
        const partialIdx = headers.findIndex(h => {
          const norm = removeAccents(h).toLowerCase().trim();
          if (name === 'nhom hang' && norm.includes('nho')) return false;
          if (name === 'nganh hang' && norm.includes('lon')) return false;
          return norm.includes(name);
        });
        if (partialIdx !== -1) return partialIdx;
      }
      return defaultIdx;
    };

    const idxStaff = getStaffIdx(headers);
    const idxQty = findIdx(['số lượng xuất', 'số lượng bán', 'số lượng xuất bán', 'số lượng', 'sl xuất', 'sl bán'], -1);
    // Ưu tiên tuyệt đối cột "Giá bán_1" / "Giá bán 1" từ dữ liệu nguồn
    const idxRevenue = (() => {
      const giaBan1Idx = headers.findIndex(h => {
        const norm = removeAccents(String(h || '')).toLowerCase().trim().replace(/\s+/g, ' ');
        return norm === 'gia ban_1' || norm === 'gia ban 1' || norm === 'giaban_1' || (norm.includes('gia ban') && norm.includes('1'));
      });
      if (giaBan1Idx !== -1) return giaBan1Idx;
      const giaBanIdx = headers.findIndex(h => {
        const norm = removeAccents(String(h || '')).toLowerCase().trim();
        return norm === 'gia ban' || norm === 'giaban';
      });
      if (giaBanIdx !== -1) return giaBanIdx;
      return findIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá bán', 'giá trị đh', 'giá trị'], -1);
    })();
    console.log('[DrillDown] idxRevenue:', idxRevenue, '| Header:', headers[idxRevenue]);
    const idxCategory = findIdx(['nhóm hàng', 'tên nhóm hàng', 'ngành hàng', 'nhóm ngành hàng'], -1);
    const idxSmallCat = findIdx(['nhóm hàng nhỏ', 'tên nhóm nhỏ'], -1);
    const idxHinhThucXuat = findIdx(['hình thức xuất', 'loại ycx', 'loại yêu cầu', 'phân loại ycx'], -1);
    const idxDate = findIdx(['ngày tạo', 'ngày lập', 'ngày xuất', 'ngày giao', 'ngày hoàn', 'ngày'], -1);
    const idxProduct = (() => {
      const exact = headers.findIndex(h => h.toLowerCase() === 'tên sản phẩm');
      if (exact !== -1) return exact;
      const partial = headers.findIndex(h => h.toLowerCase().startsWith('tên sản phẩm') || h.toLowerCase() === 'tên hàng');
      return partial !== -1 ? partial : -1;
    })();
    const idxProductCode = (() => {
      const exact = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase().trim();
        return norm === 'ma san pham' || norm === 'ma sp' || norm === 'ma hang' || norm.includes('ma san pham');
      });
      if (exact !== -1) return exact;
      return headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase().trim();
        return norm.includes('ma san pham') || norm.includes('ma hang');
      });
    })();
    const idxMarket = findIdx(['mã kho tạo', 'mã kho', 'siêu thị', 'tên kho', 'địa điểm', 'kho', 'cửa hàng'], -1);
    const idxTrangThaiSP = findIdx(['trạng thái hồ sơ', 'trạng thái xuất', 'trạng thái'], -1);
    const idxNhaSanXuat = findIdx(['nhà sản xuất', 'nha san xuat', 'nhà sx', 'nha sx', 'hãng sản xuất', 'hãng sx', 'brand'], -1);
    // Tìm cột DOANH THU QĐ để lấy trực tiếp (DATA YCX MỚI)
    const idxDtqdCol = headers.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return norm === 'doanh thu qd' || norm === 'doanh thu quy doi' || norm === 'dt qd' || norm === 'dtqd' || norm.includes('doanh thu qd') || norm.includes('doanh thu quy doi');
    });
    // Tìm cột DOANH THU (-R) để lấy trực tiếp cho DT THỰC (DATA YCX MỚI)
    const idxDtThucCol = headers.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return norm === 'doanh thu (-r)' || norm === 'doanh thu(-r)' || norm === 'dt (-r)' || norm === 'dt(-r)' || norm.includes('doanh thu (-r)') || norm.includes('doanh thu(-r)');
    });



    type ACStats = { staffName: string; mayLanh: number; mayLanhDaikin: number; mayLanhHaier: number; mayLanhHisense: number };
    type CEStats = { staffName: string; ceSL: number; ceDT: number; products: { name: string; sl: number; dt: number }[] };
    type DGDStats = { staffName: string; mln: number; qdh: number; nc: number };

    const acMap = new Map<string, ACStats>();
    const ceMap = new Map<string, CEStats>();
    const dgdMap = new Map<string, DGDStats>();
    const names = new Set<string>();

    // Date period helpers
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const parseRowDate = (row: any[]): Date | null => {
      if (idxDate === -1) return null;
      const raw = String(row[idxDate] || '').trim();
      if (!raw) return null;
      const num = parseFloat(raw);
      if (!isNaN(num) && /^\d+(\.\d+)?$/.test(raw) && num > 40000 && num < 60000) {
        return new Date((Math.floor(num) - 25569) * 86400000);
      }
      const m = raw.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
      if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };

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
    const refMs = maxDateMs || startOfDay(new Date()).getTime();

    const classifyDate = (d: Date | null): 'current' | 'prev' | 'skip' => {
      if (compareMode === 'none' || !d) return 'current';
      const dtMs = startOfDay(d).getTime();
      if (compareMode === 'day') {
        if (dtMs === refMs) return 'current';
        if (dtMs === refMs - DAY_MS) return 'prev';
        return 'skip';
      } else if (compareMode === 'week') {
        if (dtMs >= refMs - 6 * DAY_MS && dtMs <= refMs) return 'current';
        if (dtMs >= refMs - 13 * DAY_MS && dtMs <= refMs - 7 * DAY_MS) return 'prev';
        return 'skip';
      } else if (compareMode === 'month') {
        if (dtMs >= refMs - 29 * DAY_MS && dtMs <= refMs) return 'current';
        if (dtMs >= refMs - 59 * DAY_MS && dtMs <= refMs - 30 * DAY_MS) return 'prev';
        return 'skip';
      }
      return 'current';
    };

    const isSystemName = (n: string) =>
      !n || n.toLowerCase().includes('người tạo') || n.toLowerCase() === 'admin' || n.toLowerCase() === 'administrator';

    const isInsuranceRowHelper = (category: string, productName: string, row: any[]): boolean => {
      const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
      let nhomLarge = classifyNhomHangLarge(category, productName, undefined, undefined, undefined, customBaoHiemRules, prodCode);
      const normProdUpper = removeAccents(productName).toUpperCase();
      const normCatUpper = removeAccents(category).toUpperCase();

      const pClass = classifyProductByCode(prodCode, customBaoHiemRules) || classifyProduct(productName, customBaoHiemRules);
      
      return (
        pClass === 'B.HIỂM' || ['BHXM', 'BHRV', 'BHMR', 'BHKV', 'SC+', '1 ĐỔI 1', 'BHAP', 'BHOT', 'BHVC', 'BHMT', 'BHXH', 'BHYT', 'BVMH', 'GIC'].includes(pClass) ||
        ((normProdUpper.includes('BAO HIEM') || normCatUpper.includes('BAO HIEM')) && !normProdUpper.includes('NON BAO HIEM') && !normProdUpper.includes('MU BAO HIEM') && !normCatUpper.includes('NON BAO HIEM') && !normCatUpper.includes('MU BAO HIEM')) ||
        normProdUpper.includes('1 DOI 1') || normProdUpper.includes('PVI_') ||
        normProdUpper.includes('BVMH') || normProdUpper.includes('BAO VE MAN HINH') ||
        category.includes('1994') || category.includes('4479') || category.includes('7139') ||
        nhomLarge === 'BẢO HIỂM' || nhomLarge === 'B.HIỂM'
      );
    };

    const classifyWithColumnCheck = (category: string, productName: string, row: any[]): string => {
      const nhomSmallValue = idxSmallCat !== -1 ? String(row[idxSmallCat] || '').trim().toUpperCase() : '';
      if (isInsuranceRowHelper(category, productName, row)) {
        return 'BẢO HIỂM';
      }
      const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
      return classifyNhomHangLarge(category, productName, nhomSmallValue, activeCustomCategoryMap, customNhomSmallMap, customBaoHiemRules, prodCode);
    };

    const currentRows: any[][] = [];
    const prevRows: any[][] = [];
    for (const row of filteredRawYcxRows) {
      const staffName = idxStaff !== -1 ? extractName(String(row[idxStaff] || '')) : 'HỆ THỐNG';
      const isSystemRow = idxStaff !== -1 && isSystemName(staffName);

      if (!isSystemRow) {
        names.add(staffName);
      }

      const productName = idxProduct !== -1 ? String(row[idxProduct] || '').trim() : 'Sản phẩm khác';
      const category = idxCategory !== -1 ? String(row[idxCategory] || '').trim() : '';
      const nhomLarge = classifyWithColumnCheck(category, productName, row);
      const nhomSmallValue = idxSmallCat !== -1 ? String(row[idxSmallCat] || '').trim().toUpperCase() : '';
      const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
      const nhomSmall = resolveNhomSmall(category, nhomSmallValue, nhomLarge, productName, customNhomSmallMap, prodCode, customBaoHiemRules);

      const rawQty = idxQty !== -1 ? Math.round(parseFloat(String(row[idxQty] || '1').replace(/,/g, '')) || 0) : 1;
      const qty = rawQty > 0 ? rawQty : 1;
      const revenue = idxRevenue !== -1 ? Math.round(parseFloat(String(row[idxRevenue] || '0').replace(/,/g, '')) || 0) : 0;

      if (!isSystemRow) {
        // ── Air-con stats ──
        if (nhomSmall === 'ML') {
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
      }

      const period = classifyDate(parseRowDate(row));
      if (period === 'current') {
        currentRows.push(row);
      } else if (period === 'prev') {
        prevRows.push(row);
      }
    }

    // Sort products by DT desc
    ceMap.forEach(s => s.products.sort((a, b) => b.dt - a.dt));

    const acAll = Array.from(acMap.values());
    const ceAll = Array.from(ceMap.values());
    const ceWithDGD = ceAll.map(s => ({ ...s, ...(dgdMap.get(s.staffName) || { mln: 0, qdh: 0, nc: 0 }) }));

    // Helper functions for dynamic tree
    const getLevelValueAndName = (level: string, row: any[], idxs: any) => {
      switch (level) {
        case 'kho': {
          const rawMarket = String(row[idxs.idxMarket] || '').trim();
          const storeId = rawMarket.match(/^([a-zA-Z0-9]+)/)?.[1] || rawMarket || 'Không rõ';
          return { key: storeId, name: storeId };
        }
        case 'nganh': {
          const productName = String(row[idxs.idxProduct] || '').trim();
          const category = String(row[idxs.idxCategory] || '').trim();
          const nhomLarge = classifyWithColumnCheck(category, productName, row);
          return { key: nhomLarge, name: getNganhName(nhomLarge) };
        }
        case 'nhom': {
          const productName = String(row[idxs.idxProduct] || '').trim();
          const category = String(row[idxs.idxCategory] || '').trim();
          const nhomLarge = classifyWithColumnCheck(category, productName, row);
          const nhomSmallValue = idxs.idxSmallCat !== -1 ? String(row[idxs.idxSmallCat] || '').trim().toUpperCase() : '';
          const prodCode = idxs.idxProductCode !== -1 ? String(row[idxs.idxProductCode] || '').trim() : '';
          const nhomSmall = resolveNhomSmall(category, nhomSmallValue, nhomLarge, productName, customNhomSmallMap, prodCode, customBaoHiemRules);
          return { key: nhomSmall, name: nhomSmall };
        }
        case 'hang': {
          const productName = String(row[idxs.idxProduct] || '').trim() || 'Không rõ';
          const category = String(row[idxs.idxCategory] || '').trim();
          const nhomLarge = classifyWithColumnCheck(category, productName, row);
          const nhomSmallValue = idxs.idxSmallCat !== -1 ? String(row[idxs.idxSmallCat] || '').trim().toUpperCase() : '';
          const prodCode = idxs.idxProductCode !== -1 ? String(row[idxs.idxProductCode] || '').trim() : '';
          const nhomSmall = resolveNhomSmall(category, nhomSmallValue, nhomLarge, productName, customNhomSmallMap, prodCode, customBaoHiemRules);
          const brand = idxs.idxNhaSanXuat !== -1 && String(row[idxs.idxNhaSanXuat] || '').trim()
            ? String(row[idxs.idxNhaSanXuat] || '').trim().toUpperCase()
            : resolveBrandForProduct(productName, nhomSmall);
          return { key: brand.toUpperCase(), name: brand };
        }
        case 'nguoitao': {
          const staffName = idxs.idxStaff !== -1 ? extractName(String(row[idxs.idxStaff] || '')) || 'Không rõ' : 'HỆ THỐNG';
          return { key: staffName, name: staffName };
        }
        case 'sanpham': {
          const productName = idxs.idxProduct !== -1 ? String(row[idxs.idxProduct] || '').trim() || 'Không rõ' : 'Sản phẩm khác';
          return { key: productName, name: productName };
        }
        case 'trangthaisp': {
          const statusValue = idxs.idxTrangThaiSP !== -1 ? String(row[idxs.idxTrangThaiSP] || '').trim() : 'Không rõ';
          const displayVal = statusValue || 'Không rõ';
          return { key: displayVal, name: displayVal };
        }
        default:
          return { key: 'unknown', name: 'Không rõ' };
      }
    };

    const filterDataset = (datasetRows: any[][]) => {
      return datasetRows.filter(row => {
        const rawMarket = idxMarket !== -1 ? String(row[idxMarket] || '').trim() : '';
        const storeId = rawMarket.match(/^([a-zA-Z0-9]+)/)?.[1] || rawMarket || 'Không rõ';

        const productName = idxProduct !== -1 ? String(row[idxProduct] || '').trim() || 'Không rõ' : 'Sản phẩm khác';
        
        const category = idxCategory !== -1 ? String(row[idxCategory] || '').trim() : '';
        const nhomLarge = classifyWithColumnCheck(category, productName, row);
        const nhomSmallValue = idxSmallCat !== -1 ? String(row[idxSmallCat] || '').trim().toUpperCase() : '';
        const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
        const nhomSmall = resolveNhomSmall(category, nhomSmallValue, nhomLarge, productName, customNhomSmallMap, prodCode, customBaoHiemRules);

        const brand = idxNhaSanXuat !== -1 && String(row[idxNhaSanXuat] || '').trim()
          ? String(row[idxNhaSanXuat] || '').trim().toUpperCase()
          : resolveBrandForProduct(productName, nhomSmall);
        const staffName = idxStaff !== -1 ? extractName(String(row[idxStaff] || '')) || 'Không rõ' : 'HỆ THỐNG';

        // Check page-level staff filter
        if (selectedStaffs.length > 0 && !selectedStaffs.includes(staffName)) return false;

        // Check drill-down dropdown filters
        if (drillFilterStore.length > 0 && !drillFilterStore.includes(storeId)) return false;
        if (selectedDrillGroups.length > 0 && !selectedDrillGroups.includes(nhomLarge)) return false;
        if (drillFilterNhomSmall.length > 0 && !drillFilterNhomSmall.includes(nhomSmall)) return false;
        if (drillFilterBrand.length > 0 && !drillFilterBrand.includes(brand)) return false;
        if (drillFilterStaff.length > 0 && !drillFilterStaff.includes(staffName)) return false;
        if (drillFilterProduct.length > 0 && !drillFilterProduct.includes(productName)) return false;
        const statusValue = idxTrangThaiSP !== -1 ? String(row[idxTrangThaiSP] || '').trim() : 'Không rõ';
        if (drillFilterTrangThaiSP.length > 0 && !drillFilterTrangThaiSP.includes(statusValue)) return false;

        return true;
      });
    };

    const filteredCurrentRows = filterDataset(currentRows);
    const filteredPrevRows = filterDataset(prevRows);

    const buildDrillTree = (rowsToBuild: any[][], levelsToUse: string[], idxs: any, isPrev = false) => {
      const buildNode = (
        currentLevelRows: any[][],
        levelIndex: number,
        parentPath: string
      ): any[] => {
        if (levelIndex >= levelsToUse.length || currentLevelRows.length === 0) return [];

        const currentLevel = levelsToUse[levelIndex];
        const groups = new Map<string, { name: string; rows: any[][] }>();

        currentLevelRows.forEach(row => {
          const { key, name } = getLevelValueAndName(currentLevel, row, idxs);
          if (!groups.has(key)) {
            groups.set(key, { name, rows: [] });
          }
          groups.get(key)!.rows.push(row);
        });

        const nodes: any[] = [];
        groups.forEach(({ name, rows: nodeRows }, key) => {
          const nodePath = parentPath ? `${parentPath}.${key}` : key;

          let sl = 0;
          let dt = 0;
          let tc_dt = 0;
          let dtqd = 0;

          nodeRows.forEach(row => {
            const rawQty = idxs.idxQty !== -1 ? Math.round(parseFloat(String(row[idxs.idxQty] || '1').replace(/,/g, '')) || 0) : 1;
            const qty = rawQty > 0 ? rawQty : 1;
            const revenue = Math.round(parseFloat(String(row[idxs.idxRevenue] || '0').replace(/,/g, '')) || 0);
            const htx = idxs.idxHinhThucXuat !== -1 ? String(row[idxs.idxHinhThucXuat] || '').toLowerCase() : '';
            const isTc = htx.includes('trả góp');
            const category = String(row[idxs.idxCategory] || '').trim();
            const productName = String(row[idxs.idxProduct] || '').trim();
            const nhomLarge = classifyWithColumnCheck(category, productName, row);
            const nhomSmallValue = idxs.idxSmallCat !== -1 ? String(row[idxs.idxSmallCat] || '').trim().toUpperCase() : '';
            const prodCode = idxs.idxProductCode !== -1 ? String(row[idxs.idxProductCode] || '').trim() : '';
            const nhomSmall = resolveNhomSmall(category, nhomSmallValue, nhomLarge, productName, customNhomSmallMap, prodCode, customBaoHiemRules);

            sl += qty;
            // DATA YCX MỚI: DT THỰC lấy từ cột "DOANH THU (-R)"
            if (isMoiTab && idxs.idxDtThucCol !== -1) {
              const rawDtThuc = parseFloat(String(row[idxs.idxDtThucCol] || '0').replace(/,/g, '')) || 0;
              dt += Math.round(rawDtThuc);
            } else {
              dt += revenue;
            }
            if (isTc) tc_dt += revenue;
            // DATA YCX MỚI: lấy trực tiếp từ cột "DOANH THU QĐ" nếu có
            if (isMoiTab && idxs.idxDtqdCol !== -1) {
              const rawDtqd = parseFloat(String(row[idxs.idxDtqdCol] || '0').replace(/,/g, '')) || 0;
              dtqd += Math.round(rawDtqd);
            } else {
              dtqd += getRowDtqd(nhomLarge, qty, revenue, nhomSmall, isTc);
            }
          });

          const children = buildNode(nodeRows, levelIndex + 1, nodePath);

          nodes.push({
            key: nodePath,
            nodeKey: key,
            levelKey: currentLevel,
            name,
            sl,
            dt,
            tc_dt,
            dtqd,
            children
          });
        });

        return nodes.sort((a, b) => b.dt - a.dt);
      };

      return buildNode(rowsToBuild, 0, '');
    };

    const idxs = { idxMarket, idxCategory, idxSmallCat, idxProduct, idxStaff, idxQty, idxRevenue, idxHinhThucXuat, idxTrangThaiSP, idxDtqdCol, idxDtThucCol, idxNhaSanXuat };

    const filterDrillRows = (rows: any[]) => {
      return rows.filter(row => {
        const prodName = idxs.idxProduct !== -1 ? String(row[idxs.idxProduct] || '').trim() : '';
        const normProdUpper = removeAccents(prodName).toUpperCase();
        
        // 1. Loại bỏ các sản phẩm bắt đầu bằng "PMH"
        if (normProdUpper.startsWith('PMH') || normProdUpper.startsWith('PHIEU MUA HANG')) return false;

        // (Đã loại bỏ bộ lọc CE & ICT theo yêu cầu)

        return true;
      });
    };

    const drillDownData = buildDrillTree(filterDrillRows(filteredCurrentRows), drillLevels, idxs);
    const drillDownDataPrev = buildDrillTree(filterDrillRows(filteredPrevRows), drillLevels, idxs, true);

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

    // Find min and max date from rows
    let minDateStr = '';
    let maxDateStr = '';
    if (idxDate !== -1 && filteredRawYcxRows.length > 0) {
      let minMs = Infinity;
      let maxMs = -Infinity;
      filteredRawYcxRows.forEach(row => {
        const d = parseRowDate(row);
        if (d) {
          const ms = d.getTime();
          if (ms < minMs) minMs = ms;
          if (ms > maxMs) maxMs = ms;
        }
      });
      if (minMs !== Infinity && maxMs !== -Infinity) {
        const fmtD = (ms: number) => {
          const d = new Date(ms);
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };
        minDateStr = fmtD(minMs);
        maxDateStr = fmtD(maxMs);
      }
    }

    if (!minDateStr || !maxDateStr) {
      // Fallback to today
      const fmtD = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const todayStr = fmtD(new Date());
      minDateStr = todayStr;
      maxDateStr = todayStr;
    }

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
      minDateStr,
      maxDateStr,
    };
  }, [rawYcxRows, filteredRawYcxRows, selectedStaffs, compareMode, drillLevels, drillFilterStore, selectedDrillGroups, drillFilterNhomSmall, drillFilterBrand, drillFilterStaff, drillFilterProduct, drillFilterTrangThaiSP, customNhomSmallMap, customBaoHiemRules]);

  const captureOffscreenHelper = async (
    element: HTMLElement,
    options: {
      width: string;
      minWidth: string;
      backgroundColor?: string;
      isOverview?: boolean;
      isTableOnly?: boolean;
    }
  ) => {
    // 1. Create a temporary off-screen wrapper container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    
    // Parse target width and add safety margins
    const targetWidthVal = parseInt(options.width) || 2000;
    tempContainer.style.width = `${Math.max(targetWidthVal + 500, 20000)}px`;
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'visible';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';

    // 2. Clone the element
    const clone = element.cloneNode(true) as HTMLElement;

    try {
      // Add the body class to trigger global screenshot styles
      document.body.classList.add('capturing-screenshot');

      // 3. Preserve input values and convert inputs/textareas to styled text in the clone
      const origInputs = Array.from(element.querySelectorAll('input, textarea'));
      const cloneInputs = Array.from(clone.querySelectorAll('input, textarea'));

      origInputs.forEach((origEl, idx) => {
        const cloneEl = cloneInputs[idx] as HTMLInputElement | HTMLTextAreaElement;
        if (!cloneEl) return;
        
        if (cloneEl.classList.contains('no-capture') || cloneEl.closest('.no-capture')) {
          cloneEl.style.display = 'none';
          return;
        }

        const inputVal = (origEl as HTMLInputElement | HTMLTextAreaElement).value;
        if (cloneEl.tagName.toLowerCase() === 'textarea') {
          if (inputVal && inputVal.trim()) {
            const div = document.createElement('div');
            div.textContent = inputVal;
            div.className = cloneEl.className;
            div.style.whiteSpace = 'pre-wrap';
            div.style.wordBreak = 'break-word';
            div.style.backgroundColor = 'transparent';
            cloneEl.parentNode?.replaceChild(div, cloneEl);
          } else {
            cloneEl.style.display = 'none';
          }
        } else {
          // Input element -> convert to styled text span
          const span = document.createElement('span');
          span.textContent = inputVal !== undefined && inputVal !== '' ? String(inputVal) : ((origEl as HTMLInputElement).placeholder || '0');
          span.className = cloneEl.className;
          span.style.display = 'inline-block';
          span.style.width = '100%';
          span.style.textAlign = 'center';
          span.style.fontWeight = '900';
          span.style.color = '#1e293b';
          span.style.backgroundColor = 'transparent';
          cloneEl.parentNode?.replaceChild(span, cloneEl);
        }
      });

      // Hide all remaining no-capture controls and interactive buttons in the clone
      const noCaptureElements = clone.querySelectorAll('.no-capture, button');
      noCaptureElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // 4. Force only horizontal scrollable containers to render fully expanded, while preserving table-layout and table-wrapper boundaries
      const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto');
      scrollContainers.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.maxWidth = 'none';
        htmlEl.style.maxHeight = 'none';
      });

      // EARLY: Strip ALL max-width constraints from clone tree BEFORE table processing
      // This ensures table pixel widths set later have the final say
      clone.style.maxWidth = 'none';
      clone.classList.forEach(c => { if (c.startsWith('max-w-')) clone.classList.remove(c); });
      const earlyAllNodes = clone.querySelectorAll('*');
      earlyAllNodes.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.classList) {
          const toRemove: string[] = [];
          htmlEl.classList.forEach(c => { if (c.startsWith('max-w-')) toRemove.push(c); });
          toRemove.forEach(c => htmlEl.classList.remove(c));
        }
        if (htmlEl.style && htmlEl.style.maxWidth) {
          htmlEl.style.maxWidth = 'none';
        }
      });

      // Calculate exact inner container width for tables
      const framePadding = options.isOverview ? 64 : 40;
      const targetWidthVal = parseInt(options.width || '780') || 780;
      const innerCardWidth = targetWidthVal - framePadding;
      const cardInnerPadding = 32; // 16px padding on left/right of captureRef
      const exactTablePixelWidth = innerCardWidth - cardInnerPadding;

      // Fixed column widths: STT=46px, TIÊU CHÍ/NGÀNH HÀNG=350px, rest distributed evenly
      const sttWidth = 46;
      const nameColWidth = 350; // Cố định 350px cho cột TIÊU CHÍ & NGÀNH HÀNG
      const remainingWidth = exactTablePixelWidth - sttWidth - nameColWidth;
      const dataColWidth = Math.floor(remainingWidth / 4);
      const lastDataColWidth = remainingWidth - (dataColWidth * 3); // Absorb rounding

      const colWidths = [
        sttWidth,        // STT: 46px
        nameColWidth,    // TIÊU CHÍ / NGÀNH HÀNG: 350px (cố định)
        dataColWidth,    // MỤC TIÊU
        dataColWidth,    // THỰC HIỆN
        dataColWidth,    // HOÀN THÀNH
        lastDataColWidth // C.LẠI
      ];

      // Ensure all tables inside the clone strictly respect exact fixed width and column widths
      // Using cssText with !important to absolutely override any CSS class or computed style
      const allTables = clone.querySelectorAll('table');
      allTables.forEach(t => {
        const htmlTable = t as HTMLElement;
        if (options.isTableOnly) {
          // Force table width with !important
          htmlTable.style.cssText += `; width: ${exactTablePixelWidth}px !important; min-width: ${exactTablePixelWidth}px !important; max-width: ${exactTablePixelWidth}px !important; display: table !important; table-layout: fixed !important; box-sizing: border-box !important;`;

          // Force table's parent wrapper with !important
          const parent = htmlTable.parentElement;
          if (parent) {
            parent.style.cssText += `; width: ${exactTablePixelWidth}px !important; min-width: ${exactTablePixelWidth}px !important; max-width: ${exactTablePixelWidth}px !important; box-sizing: border-box !important; overflow: hidden !important; display: block !important;`;
          }

          // Apply exact pixel width to each col in colgroup with !important
          const cols = htmlTable.querySelectorAll('colgroup col');
          cols.forEach((c, idx) => {
            if (colWidths[idx]) {
              const htmlCol = c as HTMLElement;
              htmlCol.style.cssText += `; width: ${colWidths[idx]}px !important;`;
              htmlCol.setAttribute('width', `${colWidths[idx]}`);
            }
          });

          // Apply exact pixel width to each header th with !important
          const ths = htmlTable.querySelectorAll('thead tr th');
          ths.forEach((th, idx) => {
            if (colWidths[idx]) {
              const htmlTh = th as HTMLElement;
              htmlTh.style.cssText += `; width: ${colWidths[idx]}px !important; min-width: ${colWidths[idx]}px !important; max-width: ${colWidths[idx]}px !important; box-sizing: border-box !important; overflow: hidden !important;`;
            }
          });

          // Apply exact pixel width to EVERY td in tbody rows with !important
          const bodyRows = htmlTable.querySelectorAll('tbody tr');
          bodyRows.forEach(row => {
            const tds = row.querySelectorAll('td');
            tds.forEach((td, idx) => {
              if (colWidths[idx]) {
                const htmlTd = td as HTMLElement;
                htmlTd.style.cssText += `; width: ${colWidths[idx]}px !important; min-width: ${colWidths[idx]}px !important; max-width: ${colWidths[idx]}px !important; box-sizing: border-box !important; overflow: hidden !important;`;
              }
            });
          });
        } else {
          htmlTable.style.width = '100%';
          htmlTable.style.minWidth = '100%';
          htmlTable.style.maxWidth = '100%';
          htmlTable.style.tableLayout = 'fixed';
        }
      });

      // Ensure all category name containers in tables truncate properly
      const categorySpans = clone.querySelectorAll('span.truncate');
      categorySpans.forEach(s => {
        const htmlS = s as HTMLElement;
        htmlS.style.overflow = 'hidden';
        htmlS.style.textOverflow = 'ellipsis';
        htmlS.style.whiteSpace = 'nowrap';
        htmlS.style.maxWidth = '290px';
        htmlS.style.display = 'inline-block';
        htmlS.style.verticalAlign = 'middle';
      });

      // 5. Force desktop layout configurations if overview
      if (options.isOverview) {
        forceDesktopLayout(clone);
      }

      // 6. Style the cloned element itself so it lays out nicely
      clone.style.display = 'block';
      clone.style.width = '100%';
      clone.style.minWidth = '100%';
      clone.style.maxWidth = 'none';
      clone.style.height = 'auto';
      clone.style.margin = '0 auto';
      clone.style.boxSizing = 'border-box';
      clone.style.overflow = 'visible';
      clone.style.boxShadow = 'none';
      clone.style.filter = 'none';
      clone.style.backdropFilter = 'none';
      (clone.style as any).webkitBackdropFilter = 'none';
      clone.style.textShadow = 'none';
      if (options.backgroundColor) {
        clone.style.backgroundColor = options.backgroundColor;
      }
      
      // Strip all box shadows, filters, text shadows, and backdrop filters from the entire clone tree (Zero-Shadow Rule)
      const allCloneNodes = clone.querySelectorAll('*');
      allCloneNodes.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          htmlEl.style.boxShadow = 'none';
          htmlEl.style.filter = 'none';
          htmlEl.style.backdropFilter = 'none';
          (htmlEl.style as any).webkitBackdropFilter = 'none';
          htmlEl.style.textShadow = 'none';
        }
        if (htmlEl.classList) {
          htmlEl.classList.remove(
            'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow',
            'drop-shadow-sm', 'drop-shadow-md', 'drop-shadow-lg', 'drop-shadow-xl', 'drop-shadow-2xl', 'drop-shadow',
            'backdrop-blur-sm', 'backdrop-blur', 'backdrop-blur-md', 'backdrop-blur-lg', 'backdrop-blur-xl'
          );
        }
      });

      // Ensure all grids render identically in desktop layout (6 stats cards & 2 category cards)
      if (options.isOverview) {
        const allGrids = clone.querySelectorAll('.grid, [class*="grid-cols-"]');
        allGrids.forEach(g => {
          const htmlG = g as HTMLElement;
          if (htmlG.children.length === 6) {
            htmlG.style.display = 'grid';
            htmlG.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
            htmlG.style.gap = '20px';
            htmlG.style.width = '100%';
          }
          if (htmlG.children.length === 2 && (htmlG.classList.contains('xl:grid-cols-2') || htmlG.classList.contains('grid-cols-1') || htmlG.classList.contains('grid'))) {
            htmlG.style.display = 'grid';
            htmlG.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
            htmlG.style.gap = '24px';
            htmlG.style.width = '100%';
            htmlG.style.alignItems = 'start';
          }
        });
      }

      // Ensure all realtime subtitle banners never wrap awkwardly
      const subtitles = clone.querySelectorAll('.whitespace-nowrap, [class*="text-xs"], [class*="text-sm"]');
      subtitles.forEach(s => {
        const htmlS = s as HTMLElement;
        if (htmlS.textContent?.includes('Realtime:')) {
          htmlS.style.whiteSpace = 'nowrap';
          htmlS.style.flexWrap = 'nowrap';
        }
      });

      // 7. Special handling for tables inside the clone to render full columns with natural fit
      const tableContainers = clone.querySelectorAll('.overflow-x-auto, [class*="overflow-x-"]');
      tableContainers.forEach(tc => {
        const htmlTc = tc as HTMLElement;
        htmlTc.style.width = options.isTableOnly ? 'max-content' : '100%';
        htmlTc.style.overflow = 'visible';
        htmlTc.style.boxSizing = 'border-box';
      });

      const tables = clone.querySelectorAll('table');
      tables.forEach(table => {
        const htmlTable = table as HTMLTableElement;
        if (options.isTableOnly) {
          htmlTable.style.width = 'max-content';
          htmlTable.style.minWidth = 'max-content';
          htmlTable.style.maxWidth = 'none';
          htmlTable.style.tableLayout = 'auto';
          htmlTable.style.borderCollapse = 'collapse';
          // Remove colgroup col width constraints so auto-layout sizes columns by content
          const colEls = htmlTable.querySelectorAll('colgroup col');
          colEls.forEach(col => {
            (col as HTMLElement).style.width = 'auto';
            (col as HTMLElement).style.minWidth = 'auto';
          });
        } else {
          htmlTable.style.width = '100%';
          htmlTable.style.tableLayout = 'fixed';
        }
        htmlTable.style.boxSizing = 'border-box';

        const cells = htmlTable.querySelectorAll('th, td');
        cells.forEach(cell => {
          const htmlCell = cell as HTMLElement;
          htmlCell.style.boxSizing = 'border-box';
          if (options.isTableOnly) {
            htmlCell.style.whiteSpace = 'nowrap';
            htmlCell.style.overflow = 'visible';
            htmlCell.style.textOverflow = 'clip';
            htmlCell.style.width = 'auto';
            htmlCell.style.minWidth = 'auto';
            htmlCell.style.maxWidth = 'none';
            htmlCell.style.paddingLeft = '14px';
            htmlCell.style.paddingRight = '14px';
          } else {
            htmlCell.style.whiteSpace = 'nowrap';
            htmlCell.style.overflow = 'hidden';
            htmlCell.style.textOverflow = 'ellipsis';
          }
        });
      });

      // Ensure StatCard badges & titles never wrap on screenshot export
      const statBadges = clone.querySelectorAll('.stat-card-badge, [class*="rounded-full"]');
      statBadges.forEach(b => {
        const htmlB = b as HTMLElement;
        htmlB.style.whiteSpace = 'nowrap';
        htmlB.style.flexWrap = 'nowrap';
        htmlB.querySelectorAll('span, div, p').forEach(s => {
          const htmlS = s as HTMLElement;
          htmlS.style.whiteSpace = 'nowrap';
          htmlS.style.wordBreak = 'keep-all';
          htmlS.style.overflow = 'hidden';
          htmlS.style.textOverflow = 'ellipsis';
        });
      });

      // Ensure StatCard numbers explicitly use Oswald in the screenshot clone
      const statNumbers = clone.querySelectorAll('[style*="Oswald"], .font-oswald');
      statNumbers.forEach(num => {
        const htmlNum = num as HTMLElement;
        htmlNum.style.fontFamily = "'Oswald', sans-serif";
        htmlNum.style.fontWeight = '700';
        htmlNum.style.whiteSpace = 'nowrap';
      });

      // Explicitly style ONLY emerald table banner headers with yellow text
      clone.querySelectorAll('.bg-gradient-to-r h2, [class*="from-[#047857]"] h2').forEach(h2 => {
        const el = h2 as HTMLElement;
        el.style.color = '#FEF08A';
        el.style.fontFamily = "'UTM Avo', sans-serif";
        el.style.fontWeight = '900';
        el.style.fontSize = '26px';
        el.style.display = 'block';
        el.style.textAlign = 'center';
      });

      // Explicitly ensure section titles (like "CHI TIẾT NGÀNH HÀNG" and Store Name) are SOLID BLACK & explicitly named
      clone.querySelectorAll('h2, h3').forEach(header => {
        const el = header as HTMLElement;
        const text = (el.textContent || '').trim().normalize('NFC').toUpperCase();
        if (text.includes('CHI TIẾT NGÀNH')) {
          el.textContent = 'CHI TIẾT NGÀNH HÀNG';
          el.style.color = '#0f172a';
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '900';
          el.style.textAlign = 'center';
          el.style.display = 'block';
          el.style.width = '100%';
          el.style.background = 'none';
          (el.style as any).webkitTextFillColor = '#0f172a';
        } else if (!el.closest('.bg-gradient-to-r') && !el.closest('[class*="from-[#047857]"]')) {
          el.style.color = '#0f172a'; // Pure black text-slate-900
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '900';
        }
      });

      // Ensure subtitle lines in emerald banners are white and visible
      clone.querySelectorAll('.bg-gradient-to-r span, .bg-gradient-to-r p, .bg-gradient-to-r div, [class*="from-[#047857]"] span').forEach(node => {
        const el = node as HTMLElement;
        if (el.textContent && (el.textContent.includes('Luỹ kế:') || el.textContent.includes('Realtime:') || el.textContent.includes('ĐẠT') || el.textContent.includes('TGSD'))) {
          el.style.color = '#ffffff';
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '700';
        }
      });

      // Ensure description texts outside banners stay readable slate
      clone.querySelectorAll('p').forEach(p => {
        const el = p as HTMLElement;
        if (!el.closest('.bg-gradient-to-r')) {
          el.style.color = '#64748b';
        }
      });

      // Create an outer frame wrapper to give the screenshot a pristine white border without shadows
      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = options.isOverview ? '32px' : '20px';
      frameWrapper.style.backgroundColor = options.backgroundColor || '#ffffff';
      frameWrapper.style.borderRadius = options.isOverview ? '32px' : '24px';
      frameWrapper.style.boxSizing = 'border-box';
      frameWrapper.style.width = options.width || '780px';
      frameWrapper.style.minWidth = options.minWidth || '780px';
      frameWrapper.style.maxWidth = options.width || '780px';
      frameWrapper.style.overflow = 'hidden';
      frameWrapper.style.boxShadow = 'none';

      frameWrapper.appendChild(clone);

      // Add frameWrapper to DOM inside the hidden off-screen container
      tempContainer.appendChild(frameWrapper);
      document.body.appendChild(tempContainer);

      // Wait for fonts to load
      if (document.fonts) {
        await document.fonts.ready;
      }

      // 8. Small delay to allow the browser's layout engine to compute sizes
      await new Promise(resolve => setTimeout(resolve, 250));

      const rect = frameWrapper.getBoundingClientRect();
      const targetWidthNum = parseInt(options.width || '780') || 780;
      const exactWidth = options.isTableOnly ? targetWidthNum : Math.ceil(Math.max(rect.width, frameWrapper.offsetWidth, 100));
      const exactHeight = Math.ceil(Math.max(rect.height, frameWrapper.scrollHeight, frameWrapper.offsetHeight, 100));

      // 9. Capture the image using domToPng from the off-screen frameWrapper element with 3x scale for crisp sharpness
      const dataUrl = await domToPng(frameWrapper, {
        backgroundColor: options.backgroundColor || '#ffffff',
        scale: 3, // Ultra-high 3x DPI for crystal-clear text and borders
        features: { removeControlCharacter: true },
        width: exactWidth,
        height: exactHeight,
      });

      return dataUrl;
    } finally {
      // Cleanup the temporary container
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      document.body.classList.remove('capturing-screenshot');
    }
  };

  const handleCaptureTable = async (elementId: string, _fileName: string) => {
    return captureDirectHelper(elementId);
  };

  const [showKhaiThacCols, setShowKhaiThacCols] = useState({
    doanhThu: true,
    target: true,
    pctHt: true,
    spChinh: true,
    baoHiem: true,
    vasBh: true,
    vasVieon: true,
    vasMangoIcall: true,
    sim: true,
    dongHo: true,
    phuKien: true,
    giaDung: true,
    smartphone: true,
    smfIphone: true,
    smfSamsung: true,
    smfOppo: true,
    smfVivo: true,
    smfRealme: true,
    smfXiaomi: true,
    smfHonor: true,
    smfMotorola: true,
    spcSmf: true,
    spcLap: true,
    spcTab: true,
    spcTivi: true,
    spcMl: true,
    spcTl: true,
    spcMg: true,
    pkCam: true,
    pkLoa: true,
    pkPin: true,
    pkTn: true,
    pkDenMt: true,
    gdMln: true,
    gdNcom: true,
    gdNchien: true,
    gdQuat: true,
    gdQdh: true
  });

  // Load preferences from Firebase when activeStore changes
  useEffect(() => {
    if (!activeStore) return;
    const storeId = normalizeStoreId(activeStore);
    if (!storeId) return;
    
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'store', storeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.khaiThacSettings) {
            setShowKhaiThacCols(prev => ({ ...prev, ...data.khaiThacSettings }));
          }
        }
      } catch (err) {
        console.error('Error loading khai thac settings:', err);
      }
    };
    loadSettings();
  }, [activeStore]);

  const handleToggleKhaiThacCol = async (key: string, newValue: boolean) => {
    const newState = { ...showKhaiThacCols, [key]: newValue };
    setShowKhaiThacCols(newState);
    
    if (!activeStore) return;
    
    try {
      const storeId = normalizeStoreId(activeStore);
      if (!storeId) return;
      const docRef = doc(db, 'store', storeId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        showNotification('SAI TÊN SIÊU THỊ HÃY COPY ĐÚNG TRÊN BI', 'error');
        return;
      }
      
      await updateDoc(docRef, {
        khaiThacSettings: newState
      });
    } catch (err) {
      console.error('Error saving toggle:', err);
    }
  };
  const [showRawTable, setShowRawTable] = useState(false);
  const [khaiThacSortField, setKhaiThacSortField] = useState<string>('dtqd');
  const [khaiThacSortAsc, setKhaiThacSortAsc] = useState<boolean>(false);

  const handleKhaiThacSort = (field: string) => {
    if (khaiThacSortField === field) {
      setKhaiThacSortAsc(prev => !prev);
    } else {
      setKhaiThacSortField(field);
      setKhaiThacSortAsc(false);
    }
  };

  const renderKhaiThacHeader = (field: string, label: string, textColor: string, bgColor: string, width: string) => {
    return (
      <th
        onClick={() => handleKhaiThacSort(field)}
        className={`py-1 px-3 ${bgColor} border-r border-slate-200/50 font-black text-[11px] ${textColor} cursor-pointer select-none text-center ${width} border-b border-slate-100`}
      >
        <div className="flex items-center justify-center gap-0.5">
          <span>{label}</span>
          <span className={`text-[9px] ${khaiThacSortField === field ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
            {khaiThacSortField === field ? (khaiThacSortAsc ? '▲' : '▼') : '⇅'}
          </span>
        </div>
      </th>
    );
  };


  const [isPending, startTransition] = useTransition();
  const [isCapturing, setIsCapturing] = useState(false);
  const [rawTablePage, setRawTablePage] = useState(0);
  const [columnFilters, setColumnFilters] = useState<Record<number, { search: string; selectedValues: string[] | null }>>({});
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<number | null>(null);

  useEffect(() => {
    setRawTablePage(0);
  }, [columnFilters]);

  const filteredRawTableRows = useMemo(() => {
    if (rawYcxRowsForTable.length === 0) return [];
    const headers = rawYcxRows[0]?.map(h => String(h || '').trim()) || [];
    const idxProduct = (() => {
      const idx = headers.findIndex(h => h.toLowerCase().includes('tên sản phẩm') || h.toLowerCase() === 'tên hàng');
      return idx !== -1 ? idx : 33;
    })();
    const idxProductCode = (() => {
      const idx = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        return norm === 'ma san pham' || norm === 'ma sp' || norm === 'ma hang' || norm.includes('ma san pham');
      });
      return idx !== -1 ? idx : 28;
    })();
    const idxSmallCategoryHeader = headers.findIndex(h => h.toLowerCase().includes('nhóm hàng nhỏ'));
    const idxNganhHang = (() => {
      const idx = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        return (norm.includes('nganh hang') && !norm.includes('lon')) || norm.includes('nhom nganh hang');
      });
      return idx !== -1 ? idx : -1;
    })();
    const idxNhomHang = (() => {
      const exactNhom = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        return norm === 'nhom hang' || (norm.includes('nhom hang') && !norm.includes('nhom hang nho'));
      });
      if (exactNhom !== -1) return exactNhom;
      const idx = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        return (norm.includes('nganh hang') && !norm.includes('lon')) ||
               norm.includes('nhom nganh hang') ||
               (norm.includes('nhom hang') && !norm.includes('nhom hang nho'));
      });
      return idx !== -1 ? idx : 40;
    })();
    const idxHinhThucXuat = (() => {
      const idxExact = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === 'hinh thuc xuat');
      if (idxExact !== -1) return idxExact;
      return headers.findIndex(h => {
        const lh = removeAccents(h).toLowerCase().trim();
        return lh === 'loai ycx' || lh === 'loai yeu cau' || lh === 'phan loai ycx';
      });
    })();
    
    // Find exact "Hình thức xuất" column for strict filtering
    const idxExactHinhThucXuat = idxHinhThucXuat;

    const classifyHinhThucXuat = (htx: string): string | null => {
      const clean = htx.trim().toLowerCase();
      if (!clean) return null;

      if (clean.includes('yêu cầu xuất dv thu hộ bảo hiểm') || clean.includes('yeu cau xuat dv thu ho bao hiem')) {
        return 'Yêu cầu xuất DV thu hộ bảo hiểm';
      }
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

    return rawYcxRowsForTable.filter(row => {
      // 1. Loại bỏ theo danh sách Cấu hình loại bỏ động
      const rowHtx = idxHinhThucXuat !== -1 ? removeAccents(String(row[idxHinhThucXuat] || '')).toUpperCase() : '';
      const rowNganh = idxNganhHang !== -1 ? removeAccents(String(row[idxNganhHang] || '')).toUpperCase() : '';
      const rowNhom = idxNhomHang !== -1 ? removeAccents(String(row[idxNhomHang] || '')).toUpperCase() : '';
      const rowTenSP = idxProduct !== -1 ? removeAccents(String(row[idxProduct] || '')).toUpperCase() : '';

      let shouldExclude = false;
      if (customExclusionRules && customExclusionRules.length > 0) {
        shouldExclude = customExclusionRules.some(rule => {
          const normHtx = removeAccents(rule.hinhThucXuat || '').toUpperCase().trim();
          const normNganh = removeAccents(rule.nganhHang || '').toUpperCase().trim();
          const normNhom = removeAccents(rule.nhomHang || '').toUpperCase().trim();
          const normTenSP = removeAccents(rule.tenSanPham || '').toUpperCase().trim();

          if (!normHtx && !normNganh && !normNhom && !normTenSP) return false;

          const matchHtx = normHtx && rowHtx.includes(normHtx);
          const matchNganh = normNganh && rowNganh.includes(normNganh);
          const matchNhom = normNhom && rowNhom.includes(normNhom);
          const matchTenSP = normTenSP && rowTenSP.includes(normTenSP);

          return matchHtx || matchNganh || matchNhom || matchTenSP;
        });
      }

      if (shouldExclude) {
        return false;
      }

      // 2. Lọc theo column filters
      return Object.entries(columnFilters).every(([colIdxStr, filter]) => {
        if (!filter) return true;
        const colIdx = parseInt(colIdxStr, 10);
        let cellValue = '';

        if (colIdx < row.length) {
          cellValue = String(row[colIdx] || '').trim();
          if (isDateColumnHeader(headers[colIdx] || '')) {
            cellValue = fmtRawDate(cellValue);
          }
        } else {
          const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
          const prodName = idxProduct !== -1 ? String(row[idxProduct] || '').toUpperCase() : '';

          if (colIdx === row.length) {
            const codeClass = classifyProductByCode(prodCode, customBaoHiemRules);
            if (codeClass) {
              cellValue = codeClass;
            } else {
              cellValue = classifyProduct(prodName, customBaoHiemRules) || '-';
            }
          } else if (colIdx === row.length + 1) {
            const nhomSmallValue = idxSmallCategoryHeader !== -1 ? String(row[idxSmallCategoryHeader] || '').trim().toUpperCase() : '';
            const valLarge = classifyNhomHangLarge(idxNhomHang !== -1 ? row[idxNhomHang] : '', String(row[idxProduct] || ''), nhomSmallValue, undefined, customNhomSmallMap, customBaoHiemRules, prodCode) || '-';
            cellValue = valLarge === 'BẢO HIỂM' ? 'B.HIỂM' : valLarge;
          } else if (colIdx === row.length + 2) {
            cellValue = resolveNhomSmallFriendlyName(row, idxSmallCategoryHeader, idxNhomHang, idxProduct, idxProductCode, customNhomSmallMap, customBaoHiemRules);
          } else if (colIdx === row.length + 3) {
            cellValue = idxHinhThucXuat !== -1 ? (classifyHinhThucXuat(String(row[idxHinhThucXuat] || '')) || '-') : '-';
          }
        }

        if (!cellValue) cellValue = '-';

        // Checklist filter
        if (filter.selectedValues !== null) {
          if (!filter.selectedValues.includes(cellValue)) {
            return false;
          }
        }

        // Wildcard search filter
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          if (!cellValue.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        return true;
      });
    });
  }, [deferredFilteredRows, columnFilters, rawYcxRows, rawYcxRowsForTable, customExclusionRules, customNhomSmallMap, customBaoHiemRules]);

  const getUniqueValuesForColumn = useCallback((colIdx: number) => {
    const values = new Set<string>();
    const headers = rawYcxRows[0]?.map(h => String(h || '').trim()) || [];
    const idxProduct = (() => {
      const idx = headers.findIndex(h => h.toLowerCase().includes('tên sản phẩm') || h.toLowerCase() === 'tên hàng');
      return idx !== -1 ? idx : 33;
    })();
    const idxProductCode = (() => {
      const idx = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        return norm === 'ma san pham' || norm === 'ma sp' || norm === 'ma hang' || norm.includes('ma san pham');
      });
      return idx !== -1 ? idx : 28;
    })();
    const idxSmallCategoryHeader = headers.findIndex(h => h.toLowerCase().includes('nhóm hàng nhỏ'));
    const idxNhomHang = (() => {
      const exactNhom = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        return norm === 'nhom hang' || (norm.includes('nhom hang') && !norm.includes('nhom hang nho'));
      });
      if (exactNhom !== -1) return exactNhom;
      const idx = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        return (norm.includes('nganh hang') && !norm.includes('lon')) ||
               norm.includes('nhom nganh hang') ||
               (norm.includes('nhom hang') && !norm.includes('nhom hang nho'));
      });
      return idx !== -1 ? idx : 40;
    })();
    const idxHinhThucXuat = (() => {
      const idxExact = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === 'hinh thuc xuat');
      if (idxExact !== -1) return idxExact;
      return headers.findIndex(h => {
        const lh = removeAccents(h).toLowerCase().trim();
        return lh === 'loai ycx' || lh === 'loai yeu cau';
      });
    })();

    const classifyHinhThucXuat = (htx: string): string | null => {
      const clean = htx.trim().toLowerCase();
      if (!clean) return null;

      if (clean.includes('yêu cầu xuất dv thu hộ bảo hiểm') || clean.includes('yeu cau xuat dv thu ho bao hiem')) {
        return 'Yêu cầu xuất DV thu hộ bảo hiểm';
      }
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

    deferredRawTableRowsForUnique.forEach(row => {
      let val = '';
      if (colIdx < row.length) {
        val = String(row[colIdx] || '').trim();
        if (isDateColumnHeader(headers[colIdx] || '')) {
          val = fmtRawDate(val);
        }
      } else {
        const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
        const prodName = idxProduct !== -1 ? String(row[idxProduct] || '').toUpperCase() : '';

        if (colIdx === row.length) {
          const codeClass = classifyProductByCode(prodCode, customBaoHiemRules);
          if (codeClass) {
            val = codeClass;
          } else {
            val = classifyProduct(prodName, customBaoHiemRules) || '-';
          }
        } else if (colIdx === row.length + 1) {
          const nhomSmallValue = idxSmallCategoryHeader !== -1 ? String(row[idxSmallCategoryHeader] || '').trim().toUpperCase() : '';
          const valLarge = classifyNhomHangLarge(idxNhomHang !== -1 ? row[idxNhomHang] : '', String(row[idxProduct] || ''), nhomSmallValue, undefined, customNhomSmallMap, customBaoHiemRules, prodCode) || '-';
          val = valLarge === 'BẢO HIỂM' ? 'B.HIỂM' : valLarge;
        } else if (colIdx === row.length + 2) {
          val = resolveNhomSmallFriendlyName(row, idxSmallCategoryHeader, idxNhomHang, idxProduct, idxProductCode, customNhomSmallMap, customBaoHiemRules);
        } else if (colIdx === row.length + 3) {
          val = idxHinhThucXuat !== -1 ? (classifyHinhThucXuat(String(row[idxHinhThucXuat] || '')) || '-') : '-';
        }
      }
      values.add(val || '-');
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [deferredRawTableRowsForUnique, rawYcxRows, customNhomSmallMap, customBaoHiemRules]);

  const openColumnUniqueValues = useMemo(() => {
    if (activeFilterDropdown === null) return [];
    return getUniqueValuesForColumn(activeFilterDropdown);
  }, [activeFilterDropdown, getUniqueValuesForColumn]);

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
  const [expandedCrossSellingStaff, setExpandedCrossSellingStaff] = useState<Record<string, boolean>>({});




  const staffKhaiThacStats = useMemo(() => {
    if (rawYcxRows.length <= 1 || filteredRawYcxRows.length === 0) return [];

    const headers = rawYcxRows[0].map(h => String(h || '').trim());
    const findIdx = (names: string[], defaultIdx: number) => {
      const normalizedNames = names.map(n => removeAccents(n).toLowerCase().trim());
      for (const name of normalizedNames) {
        const exactIdx = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === name);
        if (exactIdx !== -1) return exactIdx;
        const partialIdx = headers.findIndex(h => {
          const norm = removeAccents(h).toLowerCase().trim();
          if (name === 'nhom hang' && norm.includes('nho')) return false;
          if (name === 'nganh hang' && norm.includes('lon')) return false;
          return norm.includes(name);
        });
        if (partialIdx !== -1) return partialIdx;
      }
      return defaultIdx;
    };

    const idxStaff = getStaffIdx(headers);
    const idxQty = findIdx(['số lượng', 'sl'], -1);
    // Ưu tiên tuyệt đối cột "Giá bán_1" / "Giá bán 1" từ dữ liệu nguồn cho DT THỰC
    const idxRevenue = (() => {
      const giaBan1Idx = headers.findIndex(h => {
        const norm = removeAccents(String(h || '')).toLowerCase().trim().replace(/\s+/g, ' ');
        return norm === 'gia ban_1' || norm === 'gia ban 1' || norm === 'giaban_1' || (norm.includes('gia ban') && norm.includes('1'));
      });
      if (giaBan1Idx !== -1) return giaBan1Idx;
      const giaBanIdx = headers.findIndex(h => {
        const norm = removeAccents(String(h || '')).toLowerCase().trim();
        return norm === 'gia ban' || norm === 'giaban';
      });
      if (giaBanIdx !== -1) return giaBanIdx;
      return findIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá bán', 'giá trị đh', 'giá trị'], -1);
    })();
    console.log('[KhaiThac] idxRevenue:', idxRevenue, '| Header:', headers[idxRevenue]);
    const idxCategory = findIdx(['nhóm hàng', 'tên nhóm hàng', 'ngành hàng', 'nhóm ngành hàng'], -1);
    const idxSmallCat = findIdx(['nhóm hàng nhỏ', 'tên nhóm nhỏ'], -1);
    const idxHinhThucXuat = findIdx(['hình thức xuất', 'loại ycx', 'loại yêu cầu', 'phân loại ycx'], -1);
    const idxNhaSanXuat = findIdx(['nhà sản xuất', 'nha san xuat', 'nhà sx', 'nha sx', 'hãng sản xuất', 'hãng sx', 'brand'], -1);
    const idxProduct = (() => {
      const exact = headers.findIndex(h => h.toLowerCase() === 'tên sản phẩm');
      if (exact !== -1) return exact;
      const partial = headers.findIndex(h => h.toLowerCase().startsWith('tên sản phẩm') || h.toLowerCase() === 'tên hàng');
      return partial !== -1 ? partial : -1;
    })();
    const idxProductCode = (() => {
      const idx = headers.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        return norm === 'ma san pham' || norm === 'ma sp' || norm === 'ma hang' || norm.includes('ma san pham') || norm.includes('mã sản phẩm') || norm.includes('mã sp');
      });
      return idx !== -1 ? idx : -1;
    })();
    // Tìm cột DOANH THU QĐ để lấy trực tiếp (DATA YCX MỚI)
    const idxDtqd = headers.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return norm === 'doanh thu qd' || norm === 'doanh thu quy doi' || norm === 'dt qd' || norm === 'dtqd' || norm.includes('doanh thu qd') || norm.includes('doanh thu quy doi');
    });
    // Tìm cột DOANH THU (-R) để lấy trực tiếp cho DT THỰC (DATA YCX MỚI)
    const idxDtThuc = headers.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return norm === 'doanh thu (-r)' || norm === 'doanh thu(-r)' || norm === 'dt (-r)' || norm === 'dt(-r)' || norm.includes('doanh thu (-r)') || norm.includes('doanh thu(-r)');
    });

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
      spcSmfQty: number;
      smfIphoneQty: number;
      smfSamsungQty: number;
      smfOppoQty: number;
      smfVivoQty: number;
      smfRealmeQty: number;
      smfXiaomiQty: number;
      smfHonorQty: number;
      smfMotorolaQty: number;
      spcLapQty: number;
      spcTabQty: number;
      spcTiviQty: number;
      spcMlQty: number;
      spcTlQty: number;
      spcMgQty: number;
      bhQty: number;
      bhRev: number;
      vieonQty: number;
      vieonRev: number;
      mangoIcallQty: number;
      mangoIcallRev: number;
      simQty: number;
      simRev: number;
      dhQty: number;
      dhDhttQty: number;
      dhWearQty: number;
      dhRev: number;
      pkCamQty: number;
      pkLoaQty: number;
      pkPinQty: number;
      pkTnQty: number;
      pkDenMtQty: number;
      pkTotalQty: number;
      pkRev: number;
      gdQty: number;
      gdRev: number;
      gdMlnQty: number;
      gdNcomQty: number;
      gdNchienQty: number;
      gdQuatQty: number;
      gdQdhQty: number;
      dtThuc: number;
      dtqd: number;
      hqqd: number;
      dtTraGop: number;
    }>();

    const isSystemName = (n: string) =>
      !n || n.toLowerCase().includes('người tạo') || n.toLowerCase() === 'admin' || n.toLowerCase() === 'administrator';

    for (const row of filteredRawYcxRows) {
      const staffName = idxStaff !== -1 ? extractName(String(row[idxStaff] || '')) : 'HỆ THỐNG';
      if (idxStaff !== -1 && isSystemName(staffName)) continue;

      const category = idxCategory !== -1 ? String(row[idxCategory] || '').trim() : '';
      const productName = idxProduct !== -1 ? String(row[idxProduct] || '').trim() : 'Sản phẩm khác';
      const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
      let nhomLarge = classifyNhomHangLarge(category, productName, undefined, undefined, customNhomSmallMap, customBaoHiemRules, prodCode);
      const normProdUpper = removeAccents(productName).toUpperCase();
      const normCatUpper = removeAccents(category).toUpperCase();
      const prodUpper = productName.toUpperCase();
      const pClass = classifyProductByCode(prodCode, customBaoHiemRules) || classifyProduct(productName, customBaoHiemRules);
      const isInsuranceRow = 
        pClass === 'B.HIỂM' || ['BHXM', 'BHRV', 'BHMR', 'BHKV', 'SC+', '1 ĐỔI 1', 'BHAP', 'BHOT', 'BHVC', 'BHMT', 'BHXH', 'BHYT', 'BVMH', 'GIC'].includes(pClass) ||
        ((normProdUpper.includes('BAO HIEM') || normCatUpper.includes('BAO HIEM')) && !normProdUpper.includes('NON BAO HIEM') && !normProdUpper.includes('MU BAO HIEM') && !normCatUpper.includes('NON BAO HIEM') && !normCatUpper.includes('MU BAO HIEM')) ||
        normProdUpper.includes('1 DOI 1') || normProdUpper.includes('PVI_') ||
        normProdUpper.includes('BVMH') || normProdUpper.includes('BAO VE MAN HINH') ||
        category.includes('1994') || category.includes('4479') || category.includes('7139') ||
        nhomLarge === 'BẢO HIỂM' || nhomLarge === 'B.HIỂM';

      if (isInsuranceRow) {
        nhomLarge = 'B.HIỂM';
      }

      const nhomSmallValue = idxSmallCat !== -1 ? String(row[idxSmallCat] || '').trim().toUpperCase() : '';
      const nhomSmall = resolveNhomSmall(category, nhomSmallValue, nhomLarge, productName, customNhomSmallMap, prodCode, customBaoHiemRules);

      const brandVal = idxNhaSanXuat !== -1 ? String(row[idxNhaSanXuat] || '').trim().toUpperCase() : '';
      const isVieONRow = (brandVal === 'VIEON' || category.toUpperCase().includes('VIEON') || productName.toUpperCase().includes('VIEON') || ['V1', 'V2', 'V3', 'V4'].includes(pClass) || normProdUpper.includes('VIEON') || normCatUpper.includes('VIEON')) && pClass !== 'Mango' && pClass !== 'Icall' && !normProdUpper.includes('MANGO') && !normProdUpper.includes('ICALL');

      const rawQty = idxQty !== -1 ? Math.round(parseFloat(String(row[idxQty] || '1').replace(/,/g, '')) || 0) : 1;
      const qty = rawQty > 0 ? rawQty : 1;
      const revenue = idxRevenue !== -1 ? Math.round(parseFloat(String(row[idxRevenue] || '0').replace(/,/g, '')) || 0) : 0;

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
          spcSmfQty: 0,
          smfIphoneQty: 0,
          smfSamsungQty: 0,
          smfOppoQty: 0,
          smfVivoQty: 0,
          smfRealmeQty: 0,
          smfXiaomiQty: 0,
          smfHonorQty: 0,
          smfMotorolaQty: 0,
          spcLapQty: 0,
          spcTabQty: 0,
          spcTiviQty: 0,
          spcMlQty: 0,
          spcTlQty: 0,
          spcMgQty: 0,
          bhQty: 0,
          bhRev: 0,
          vieonQty: 0,
          vieonRev: 0,
          mangoIcallQty: 0,
          mangoIcallRev: 0,
          simQty: 0,
          simRev: 0,
          dhQty: 0,
          dhDhttQty: 0,
          dhWearQty: 0,
          dhRev: 0,
          pkCamQty: 0,
          pkLoaQty: 0,
          pkPinQty: 0,
          pkTnQty: 0,
          pkDenMtQty: 0,
          pkTotalQty: 0,
          pkRev: 0,
          gdQty: 0,
          gdRev: 0,
          gdMlnQty: 0,
          gdNcomQty: 0,
          gdNchienQty: 0,
          gdQuatQty: 0,
          gdQdhQty: 0,
          dtThuc: 0,
          dtqd: 0,
          hqqd: 0,
          dtTraGop: 0,
        });
      }

      const item = statsMap.get(staffName)!;

      if (pClass === 'Mango' || pClass === 'Icall' || normProdUpper.includes('MANGO') || normProdUpper.includes('ICALL')) {
        item.mangoIcallQty += qty;
        item.mangoIcallRev += revenue;
      }

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
      } else if (nhomLarge === 'BẢO HIỂM' || nhomLarge === 'B.HIỂM' || isInsuranceRow) {
        item.bhQty += qty;
        item.bhRev += revenue;
      } else if (isVieONRow || nhomLarge === 'VIEON') {
        item.vieonQty += qty;
        item.vieonRev += revenue;
      } else if (nhomLarge === 'SIM') {
        item.simQty += qty;
        item.simRev += revenue;
      } else if (nhomLarge === 'ĐỒNG HỒ' || nhomLarge === 'ĐỒNG HỒ THỜI TRANG' || nhomLarge === 'WEARABLE') {
        item.dhQty += qty;
        item.dhRev += revenue;
        const nsUpper = nhomSmall.toUpperCase();
        if (nsUpper === 'Đ.HỒ' || nsUpper === 'ĐỒNG HỒ' || nsUpper === 'ĐỒNG HỒ THỜI TRANG') {
          item.dhDhttQty += qty;
        } else if (nsUpper === 'WEARABLE' || nsUpper === 'WERABLE') {
          item.dhWearQty += qty;
        }
      } else if (nhomLarge === 'PHỤ KIỆN') {
        item.pkTotalQty += qty;
        item.pkRev += revenue;

        if (nhomSmall === 'CAM') {
          item.pkCamQty += qty;
        } else if (nhomSmall === 'LOA') {
          item.pkLoaQty += qty;
        } else if (nhomSmall === 'PIN SDP' || nhomSmall === 'SDP') {
          item.pkPinQty += qty;
        } else if (nhomSmall === 'TN BLT' || nhomSmall === 'TN DÂY' || nhomSmall === 'TN') {
          item.pkTnQty += qty;
        } else if (nhomSmall === 'ĐÈN NĂNG LƯỢNG MẶT TRỜI' || nhomSmall === 'ĐÈN MẶT TRỜI') {
          item.pkDenMtQty += qty;
        }
      } else if (nhomLarge === 'DCNB') {
        item.gdQty += qty;
        item.gdRev += revenue;
      }

      // Phân tích Gia dụng từ nhóm nhỏ (YCX RT) độc lập
      const nSmall = nhomSmall.toUpperCase();

      // Phân tích SP CHÍNH chi tiết
      if (nhomLarge === 'ICT' && nSmall === 'SMP') {
        item.spcSmfQty += qty;
        
        const brand = brandVal || 'KHÁC';
        const pNameUpper = productName.toUpperCase();
        if (brand.includes('APPLE') || pNameUpper.includes('IPHONE')) {
          item.smfIphoneQty += qty;
        } else if (brand.includes('SAMSUNG') || pNameUpper.includes('SAMSUNG')) {
          item.smfSamsungQty += qty;
        } else if (brand.includes('OPPO') || pNameUpper.includes('OPPO')) {
          item.smfOppoQty += qty;
        } else if (brand.includes('VIVO') || pNameUpper.includes('VIVO')) {
          item.smfVivoQty += qty;
        } else if (brand.includes('REALME') || pNameUpper.includes('REALME')) {
          item.smfRealmeQty += qty;
        } else if (brand.includes('XIAOMI') || pNameUpper.includes('XIAOMI')) {
          item.smfXiaomiQty += qty;
        } else if (brand.includes('HONOR') || pNameUpper.includes('HONOR')) {
          item.smfHonorQty += qty;
        } else if (brand.includes('MOTOROLA') || pNameUpper.includes('MOTOROLA')) {
          item.smfMotorolaQty += qty;
        }
      } else if (nhomLarge === 'ICT' && nSmall === 'LAP') {
        item.spcLapQty += qty;
      } else if (nhomLarge === 'ICT' && (nSmall === 'TAB' || nSmall === 'TABLET')) {
        item.spcTabQty += qty;
      } else if (nhomLarge === 'CE' && nSmall === 'TIVI') {
        item.spcTiviQty += qty;
      } else if (nhomLarge === 'CE' && nSmall === 'ML') {
        item.spcMlQty += qty;
      } else if (nhomLarge === 'CE' && nSmall === 'TL') {
        item.spcTlQty += qty;
      } else if (nhomLarge === 'CE' && nSmall === 'MG') {
        item.spcMgQty += qty;
      }

      const rawSmallCatVal = idxSmallCat !== -1 ? removeAccents(String(row[idxSmallCat] || '')).trim().toUpperCase() : '';
      const isMln = nSmall === 'MLN' || rawSmallCatVal === 'MLN';
      const isNcom = nSmall === 'N.CƠM' || nSmall === 'NC NẮP RỜI' || nSmall === 'NC Đ.TỬ';
      const isNchien = nSmall === 'N.CHIÊN';
      const isQuat = nSmall === 'QUẠT';
      const isQdh = nSmall === 'QĐH';

      if (isMln) item.gdMlnQty += qty;
      if (isNcom) item.gdNcomQty += qty;
      if (isNchien) item.gdNchienQty += qty;
      if (isQuat) item.gdQuatQty += qty;
      if (isQdh) item.gdQdhQty += qty;

      if (isMln || isNcom || isNchien || isQuat) {
        if (nhomLarge !== 'DCNB') {
          item.gdQty += qty;
          item.gdRev += revenue;
        }
      }

      // DATA YCX MỚI: lấy trực tiếp từ cột "DOANH THU (-R)" nếu có
      if (isMoiTab && idxDtThuc !== -1) {
        const rawDtThuc = parseFloat(String(row[idxDtThuc] || '0').replace(/,/g, '')) || 0;
        item.dtThuc += Math.round(rawDtThuc);
      } else {
        item.dtThuc += revenue;
      }

      const htx = idxHinhThucXuat !== -1 ? String(row[idxHinhThucXuat] || '').toLowerCase() : '';
      const isTraGop = htx.includes('trả góp');
      if (isTraGop) {
        item.dtTraGop += revenue;
      }
      // DATA YCX MỚI: lấy trực tiếp từ cột "DOANH THU QĐ" nếu có, không áp dụng công thức
      if (isMoiTab && idxDtqd !== -1) {
        const rawDtqd = parseFloat(String(row[idxDtqd] || '0').replace(/,/g, '')) || 0;
        item.dtqd += Math.round(rawDtqd);
      } else {
        item.dtqd += getRowDtqd(nhomLarge, qty, revenue, nhomSmall, isTraGop);
      }
    }

    statsMap.forEach(item => {
      item.hqqd = item.dtThuc > 0 ? Math.round(((item.dtqd - item.dtThuc) / item.dtThuc) * 100) : 0;
    });

    const allStats = Array.from(statsMap.values());
    const filteredStats = drillFilterStaff.length > 0
      ? allStats.filter(item => drillFilterStaff.includes(item.staffName))
      : allStats;

    if (khaiThacSortField) {
      const getVisibleSpChinhQty = (item: any) => {
        return (showKhaiThacCols.spcSmf ? item.spcSmfQty : 0) +
          (showKhaiThacCols.spcLap ? item.spcLapQty : 0) +
          (showKhaiThacCols.spcTab ? item.spcTabQty : 0) +
          (showKhaiThacCols.spcTivi ? item.spcTiviQty : 0) +
          (showKhaiThacCols.spcMl ? item.spcMlQty : 0) +
          (showKhaiThacCols.spcTl ? item.spcTlQty : 0) +
          (showKhaiThacCols.spcMg ? item.spcMgQty : 0);
      };

      const getVisibleVasTotalQty = (item: any) => {
        return (showKhaiThacCols.vasBh ? item.bhQty : 0) +
          (showKhaiThacCols.vasVieon ? item.vieonQty : 0) +
          (showKhaiThacCols.vasMangoIcall ? item.mangoIcallQty : 0);
      };

      const getVisiblePkTotalQty = (item: any) => {
        return (showKhaiThacCols.pkCam ? item.pkCamQty : 0) +
          (showKhaiThacCols.pkLoa ? item.pkLoaQty : 0) +
          (showKhaiThacCols.pkPin ? item.pkPinQty : 0) +
          (showKhaiThacCols.pkTn ? item.pkTnQty : 0) +
          (showKhaiThacCols.pkDenMt ? item.pkDenMtQty : 0);
      };

      const getVisibleGdTotalQty = (item: any) => {
        return (showKhaiThacCols.gdMln ? item.gdMlnQty : 0) +
          (showKhaiThacCols.gdNcom ? item.gdNcomQty : 0) +
          (showKhaiThacCols.gdNchien ? item.gdNchienQty : 0) +
          (showKhaiThacCols.gdQuat ? item.gdQuatQty : 0) +
          (showKhaiThacCols.gdQdh ? item.gdQdhQty : 0);
      };

      filteredStats.sort((a, b) => {
        let valA: number = 0;
        let valB: number = 0;

        if (khaiThacSortField === 'staffName') {
          return khaiThacSortAsc
            ? a.staffName.localeCompare(b.staffName)
            : b.staffName.localeCompare(a.staffName);
        }

        // Percentage sorting
        if (khaiThacSortField === 'tc') {
          valA = a.dtThuc > 0 ? (a.dtTraGop || 0) / a.dtThuc : 0;
          valB = b.dtThuc > 0 ? (b.dtTraGop || 0) / b.dtThuc : 0;
        } else if (khaiThacSortField === 'vasPct') {
          const spcA = getVisibleSpChinhQty(a);
          const spcB = getVisibleSpChinhQty(b);
          valA = spcA > 0 ? getVisibleVasTotalQty(a) / spcA : 0;
          valB = spcB > 0 ? getVisibleVasTotalQty(b) / spcB : 0;
        } else if (khaiThacSortField === 'simPct') {
          const spcA = getVisibleSpChinhQty(a);
          const spcB = getVisibleSpChinhQty(b);
          valA = spcA > 0 ? a.simQty / spcA : 0;
          valB = spcB > 0 ? b.simQty / spcB : 0;
        } else if (khaiThacSortField === 'dhPct') {
          const spcA = getVisibleSpChinhQty(a);
          const spcB = getVisibleSpChinhQty(b);
          valA = spcA > 0 ? a.dhQty / spcA : 0;
          valB = spcB > 0 ? b.dhQty / spcB : 0;
        } else if (khaiThacSortField === 'pkPct') {
          const spcA = getVisibleSpChinhQty(a);
          const spcB = getVisibleSpChinhQty(b);
          valA = spcA > 0 ? getVisiblePkTotalQty(a) / spcA : 0;
          valB = spcB > 0 ? getVisiblePkTotalQty(b) / spcB : 0;
        } else if (khaiThacSortField === 'gdPct') {
          const spcA = getVisibleSpChinhQty(a);
          const spcB = getVisibleSpChinhQty(b);
          valA = spcA > 0 ? getVisibleGdTotalQty(a) / spcA : 0;
          valB = spcB > 0 ? getVisibleGdTotalQty(b) / spcB : 0;
        } else if (khaiThacSortField === 'spChinhTotalQty') {
          valA = getVisibleSpChinhQty(a);
          valB = getVisibleSpChinhQty(b);
        } else if (khaiThacSortField === 'vasBhQty') {
          valA = getVisibleVasTotalQty(a);
          valB = getVisibleVasTotalQty(b);
        } else if (khaiThacSortField === 'pkTotalQty') {
          valA = getVisiblePkTotalQty(a);
          valB = getVisiblePkTotalQty(b);
        } else if (khaiThacSortField === 'gdTotalQty') {
          valA = getVisibleGdTotalQty(a);
          valB = getVisibleGdTotalQty(b);
        } else {
          // Standard numeric fields
          valA = (a[khaiThacSortField as keyof typeof a] as number) || 0;
          valB = (b[khaiThacSortField as keyof typeof b] as number) || 0;
        }

        return khaiThacSortAsc ? valA - valB : valB - valA;
      });
    }

    return filteredStats;
  }, [rawYcxRows, filteredRawYcxRows, drillFilterStaff, showKhaiThacCols, khaiThacSortField, khaiThacSortAsc]);

  const crossSellingStats = useMemo(() => {
    if (rawYcxRows.length <= 1 || filteredRawYcxRows.length === 0) return [];
    
    const headers = rawYcxRows[0].map(h => String(h || '').trim());
    const findIdx = (names: string[], defaultIdx: number) => {
      const normalizedNames = names.map(n => removeAccents(n).toLowerCase().trim());
      for (const name of normalizedNames) {
        const exactIdx = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === name);
        if (exactIdx !== -1) return exactIdx;
        const partialIdx = headers.findIndex(h => removeAccents(h).toLowerCase().trim().includes(name));
        if (partialIdx !== -1) return partialIdx;
      }
      return defaultIdx;
    };

    const idxStaff = getStaffIdx(headers);
    const idxDate = findIdx(['ngày tạo', 'ngày lập', 'ngày xuất', 'ngày giao', 'ngày hoàn', 'ngày'], -1);
    const idxHtx = findIdx(['hình thức xuất', 'loại ycx', 'loại yêu cầu', 'phân loại ycx'], -1);
    const idxProduct = findIdx(['tên sản phẩm', 'tên hàng', 'sản phẩm'], -1);
    const idxProductCode = findIdx(['mã sản phẩm', 'mã sp', 'mã hàng'], -1);
    const idxNhomHang = findIdx(['nhóm hàng', 'nhóm sản phẩm'], -1);
    const idxNganhHang = findIdx(['ngành hàng', 'nhóm ngành hàng', 'tên nhóm hàng'], -1);
    const idxCustomerName = findIdx(['khách hàng', 'tên kh', 'tên khách hàng', 'người mua'], -1);
    const idxTrangThaiHoSo = findIdx(['trạng thái hồ sơ', 'trạng thái xuất', 'trạng thái'], -1);

    const bills = new Map<string, { staffName: string, dateVal: string, customerName: string, itemCount: number, items: Array<{ product: string, htx: string }> }>();

    filteredRawYcxRows.forEach(row => {
      const htx = idxHtx !== -1 ? removeAccents(String(row[idxHtx] || '')).toLowerCase() : '';
      const nhomHangStr = idxNhomHang !== -1 ? String(row[idxNhomHang] || '').trim() : '';
      const nganhHangStr = idxNganhHang !== -1 ? String(row[idxNganhHang] || '').trim() : '';
      const nhomHang = removeAccents(nhomHangStr).toLowerCase();
      const sp = idxProduct !== -1 ? removeAccents(String(row[idxProduct] || '')).toLowerCase() : '';
      const trangThai = idxTrangThaiHoSo !== -1 ? removeAccents(String(row[idxTrangThaiHoSo] || '')).toLowerCase().trim() : '';
      


      // Filter out insurance (B.HIỂM) rows from employee cross-selling table calculations
      const rawProdName = idxProduct !== -1 ? String(row[idxProduct] || '') : '';
      const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
      let largeCat = classifyNhomHangLarge(nhomHangStr, rawProdName, undefined, undefined, customNhomSmallMap, customBaoHiemRules, prodCode);
      const prodNameUpper = rawProdName.toUpperCase();
      if (prodNameUpper.includes('GIC-BOLTTECH_BẢO VỆ MÀN HÌNH') || prodNameUpper.includes('BẢO VỆ MÀN HÌNH') || prodNameUpper.includes('BVMH')) {
        largeCat = 'B.HIỂM';
      } else if (nhomHangStr.includes('1994') || nhomHangStr.includes('4479')) {
        largeCat = 'B.HIỂM';
      } else if (largeCat === 'BẢO HIỂM') {
        largeCat = 'B.HIỂM';
      }
      if (largeCat === 'B.HIỂM') return;

      const staffName = idxStaff !== -1 ? extractName(String(row[idxStaff] || '')) || 'Unknown' : 'HỆ THỐNG';
      if (selectedStaffs.length > 0 && !selectedStaffs.some(s => staffName.toLowerCase().includes(s.toLowerCase()))) return;
      if (drillFilterStaff.length > 0 && !drillFilterStaff.includes(staffName)) return;

      const dateVal = idxDate !== -1 ? fmtRawDate(String(row[idxDate] || '').trim()) : '';
      const billKey = `${staffName}_${dateVal}`;
      const customerName = idxCustomerName !== -1 ? String(row[idxCustomerName] || '').trim() : '';

      if (!bills.has(billKey)) {
        bills.set(billKey, { staffName, dateVal, customerName, itemCount: 0, items: [] });
      }
      const bill = bills.get(billKey)!;
      bill.itemCount += 1;
      
      bill.items.push({
        product: idxProduct !== -1 ? String(row[idxProduct] || '').trim() : 'Sản phẩm khác',
        htx: idxHtx !== -1 ? String(row[idxHtx] || '').trim() : ''
      });
    });

    const staffMap = new Map<string, {
      staffName: string;
      boPhan: string;
      totalBills: number;
      kemBills: number;
      noKemBills: number;
      twoItemsBills: number;
      moreThanTwoItemsBills: number;
      billsList: Array<{ dateVal: string, customerName: string, itemCount: number, items: Array<{ product: string, htx: string }> }>;
    }>();

    for (const bill of bills.values()) {
      if (!staffMap.has(bill.staffName)) {
        staffMap.set(bill.staffName, {
          staffName: bill.staffName,
          boPhan: 'BP ALL IN ONE',
          totalBills: 0,
          kemBills: 0,
          noKemBills: 0,
          twoItemsBills: 0,
          moreThanTwoItemsBills: 0,
          billsList: [],
        });
      }
      
      const stats = staffMap.get(bill.staffName)!;
      stats.totalBills += 1;
      stats.billsList.push({
        dateVal: bill.dateVal,
        customerName: bill.customerName,
        itemCount: bill.itemCount,
        items: bill.items
      });
      
      if (bill.itemCount >= 2) {
        stats.kemBills += 1;
        if (bill.itemCount === 2) {
          stats.twoItemsBills += 1;
        } else {
          stats.moreThanTwoItemsBills += 1;
        }
      } else {
        stats.noKemBills += 1;
      }
    }

    const result = Array.from(staffMap.values()).map(s => {
      const pctKem = s.totalBills > 0 ? Math.round((s.kemBills / s.totalBills) * 100) : 0;
      return { ...s, pctKem };
    });

    result.sort((a, b) => b.pctKem - a.pctKem || b.totalBills - a.totalBills);

    return result;
  }, [rawYcxRows, filteredRawYcxRows, selectedStaffs, drillFilterStaff, customNhomSmallMap, customBaoHiemRules]);

  // Available options per filter level (dynamic from data)
  // Available options per filter level (dynamic from data)
  const availableOptions = useMemo(() => {
    const stores = new Set<string>();
    const nganhs = new Set<string>();
    const nhoms = new Set<string>();
    const brands = new Set<string>();
    const staffs = new Set<string>();
    const products = new Set<string>();
    const trangThaiSPs = new Set<string>();

    if (rawYcxRows.length > 1) {
      const headers = rawYcxRows[0].map(h => String(h || '').trim());
      const findIdx = (names: string[], defaultIdx: number) => {
        const normalizedNames = names.map(n => removeAccents(n).toLowerCase().trim());
        for (const name of normalizedNames) {
          const idx = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === name);
          if (idx !== -1) return idx;
        }
        for (const name of normalizedNames) {
          const idx = headers.findIndex(h => {
            const norm = removeAccents(h).toLowerCase().trim();
            if (name === 'nhom hang' && norm.includes('nho')) return false;
            if (name === 'nganh hang' && norm.includes('lon')) return false;
            return norm.includes(name);
          });
          if (idx !== -1) return idx;
        }
        return defaultIdx;
      };
      const idxStaff = getStaffIdx(headers);
      const idxCategory = findIdx(['nhóm hàng', 'tên nhóm hàng', 'nhóm ngành hàng', 'ngành hàng lớn', 'ngành hàng'], -1);
      const idxSmallCat = findIdx(['nhóm hàng nhỏ', 'tên nhóm nhỏ', 'nhóm nhỏ'], -1);
      const idxProduct = (() => {
        const exact = headers.findIndex(h => h.toLowerCase() === 'tên sản phẩm');
        if (exact !== -1) return exact;
        const partial = headers.findIndex(h => h.toLowerCase().startsWith('tên sản phẩm') || h.toLowerCase() === 'tên hàng');
        return partial !== -1 ? partial : -1;
      })();
      const idxProductCode = (() => {
        const exact = headers.findIndex(h => {
          const norm = removeAccents(h).toLowerCase().trim();
          return norm === 'ma san pham' || norm === 'ma hang' || norm === 'ma sp';
        });
        if (exact !== -1) return exact;
        return headers.findIndex(h => {
          const norm = removeAccents(h).toLowerCase().trim();
          return norm.includes('ma san pham') || norm.includes('ma hang');
        });
      })();
      const idxMarket = findIdx(['mã kho tạo', 'mã kho', 'siêu thị', 'tên kho', 'địa điểm', 'kho', 'cửa hàng'], -1);
      const idxTrangThaiSP = findIdx(['trạng thái hồ sơ', 'trạng thái xuất', 'trạng thái'], -1);
      const idxHinhThucXuat = findIdx(['hình thức xuất', 'loại ycx', 'loại yêu cầu', 'phân loại ycx'], -1);
      const idxNhaSanXuat = findIdx(['nhà sản xuất', 'nha san xuat', 'nhà sx', 'nha sx', 'hãng sản xuất', 'hãng sx', 'brand'], -1);

      for (let i = 1; i < rawYcxRows.length; i++) {
        const row = rawYcxRows[i];
        const rawMarket = idxMarket !== -1 ? String(row[idxMarket] || '').trim() : '';
        const storeId = rawMarket.match(/^([a-zA-Z0-9]+)/)?.[1] || rawMarket || 'Không rõ';

        const productName = idxProduct !== -1 ? String(row[idxProduct] || '').trim() || 'Không rõ' : 'Sản phẩm khác';
        const category = idxCategory !== -1 ? String(row[idxCategory] || '').trim() : '';
        const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
        const pClass = classifyProductByCode(prodCode, customBaoHiemRules) || classifyProduct(productName, customBaoHiemRules);
        const normProdUpper = removeAccents(productName).toUpperCase();
        const normCatUpper = removeAccents(category).toUpperCase();
        let nhomLarge = classifyNhomHangLarge(category, productName, undefined, undefined, customNhomSmallMap, customBaoHiemRules, prodCode);
        const isInsuranceRow = 
          pClass === 'B.HIỂM' || ['BHXM', 'BHRV', 'BHMR', 'BHKV', 'SC+', '1 ĐỔI 1', 'BHAP', 'BHOT', 'BHVC', 'BHMT', 'BHXH', 'BHYT', 'BVMH', 'GIC'].includes(pClass) ||
          ((normProdUpper.includes('BAO HIEM') || normCatUpper.includes('BAO HIEM')) && !normProdUpper.includes('NON BAO HIEM') && !normProdUpper.includes('MU BAO HIEM') && !normCatUpper.includes('NON BAO HIEM') && !normCatUpper.includes('MU BAO HIEM')) ||
          normProdUpper.includes('1 DOI 1') || normProdUpper.includes('PVI_') ||
          normProdUpper.includes('BVMH') || normProdUpper.includes('BAO VE MAN HINH') ||
          category.includes('1994') || category.includes('4479') || category.includes('7139') ||
          nhomLarge === 'BẢO HIỂM' || nhomLarge === 'B.HIỂM';

        if (isInsuranceRow) {
          nhomLarge = 'BẢO HIỂM';
        }

        if (nhomLarge === 'THỂ CÀO') continue;

        const nhomSmallValue = idxSmallCat !== -1 ? String(row[idxSmallCat] || '').trim().toUpperCase() : '';
        const nhomSmall = resolveNhomSmall(category, nhomSmallValue, nhomLarge, productName, customNhomSmallMap, prodCode, customBaoHiemRules);

        const brand = idxNhaSanXuat !== -1 && String(row[idxNhaSanXuat] || '').trim()
          ? String(row[idxNhaSanXuat] || '').trim().toUpperCase()
          : resolveBrandForProduct(productName, nhomSmall);
        const staffName = idxStaff !== -1 ? extractName(String(row[idxStaff] || '')) || 'Không rõ' : 'HỆ THỐNG';

        if (storeId) stores.add(storeId);
        if (nhomLarge) nganhs.add(nhomLarge);
        if (nhomSmall) nhoms.add(nhomSmall);
        if (brand) brands.add(brand);
        if (staffName) staffs.add(staffName);
        if (productName) products.add(productName);
        const statusValue = idxTrangThaiSP !== -1 ? String(row[idxTrangThaiSP] || '').trim() : 'Không rõ';
        if (statusValue) trangThaiSPs.add(statusValue);
      }
    }

    return {
      stores: Array.from(stores).sort().map(s => ({ key: s, name: s })),
      nganhs: Array.from(nganhs).sort().map(n => ({ key: n, name: getNganhName(n) })),
      nhoms: Array.from(nhoms).sort().map(n => ({ key: n, name: n })),
      brands: Array.from(brands).sort().map(b => ({ key: b, name: b })),
      staffs: Array.from(staffs).sort().map(s => ({ key: s, name: s })),
      products: Array.from(products).sort().map(p => ({ key: p, name: p })),
      trangThaiSPs: Array.from(trangThaiSPs).sort().map(s => ({ key: s, name: s })),
    };
  }, [rawYcxRows, customNhomSmallMap, customBaoHiemRules]);

  const availableNhomSmall = availableOptions.nhoms;
  const availableStaff = availableOptions.staffs.map(s => s.name);
  const availableBrand = availableOptions.brands.map(b => b.name);

  // Drag and drop states for drill-down pills
  const [draggedLevelIndex, setDraggedLevelIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedLevelIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedLevelIndex === null) return;
    const newLevels = [...drillLevels];
    const [removed] = newLevels.splice(draggedLevelIndex, 1);
    newLevels.splice(index, 0, removed);
    setDrillLevels(newLevels);
    setDraggedLevelIndex(null);
  };

  const prevNodesMap = useMemo(() => {
    const map = new Map<string, any>();
    const traverse = (nodes: any[]) => {
      nodes.forEach(n => {
        map.set(n.key, n);
        if (n.children) traverse(n.children);
      });
    };
    traverse(drillDownDataPrev);
    return map;
  }, [drillDownDataPrev]);

  // Recursively flatten tree for dynamic row rendering
  const flattenTree = useCallback((
    nodes: any[],
    depth = 0,
    isVisible = true
  ): any[] => {
    const result: any[] = [];
    nodes.forEach(node => {
      if (!isVisible) return;
      result.push({ ...node, depth });
      const isOpen = expandedDrillRows[node.key] !== undefined
        ? expandedDrillRows[node.key] === true
        : depth < drillExpandDepth;
      if (node.children && node.children.length > 0) {
        const flatChildren = flattenTree(node.children, depth + 1, isOpen);
        result.push(...flatChildren);
      }
    });
    return result;
  }, [expandedDrillRows, drillExpandDepth]);

  const flatRows = useMemo(() => {
    return flattenTree(drillDownData, 0, true);
  }, [drillDownData, flattenTree]);

  const totals = useMemo(() => {
    let sl = 0;
    let dt = 0;
    let tc_dt = 0;
    let dtqd = 0;
    drillDownData.forEach((node: any) => {
      sl += node.sl;
      dt += node.dt;
      tc_dt += node.tc_dt;
      dtqd += node.dtqd;
    });
    return { sl, dt, tc_dt, dtqd };
  }, [drillDownData]);

  const handleExpandAll = () => {
    setExpandedDrillRows({});
    setDrillExpandDepth(prev => Math.min(prev + 1, drillLevels.length));
  };

  const handleCollapseAll = () => {
    setExpandedDrillRows({});
    setDrillExpandDepth(prev => Math.max(prev - 1, 0));
  };



  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (!activeDrillFilter) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      // Nếu click ra ngoài các khu vực filter thì mới đóng
      if (!target.closest('.drill-filter-node')) {
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

  const forceDesktopLayout = (element: HTMLElement) => {
    // Force cards grid to 6 columns
    const cardsGrid = element.querySelector('.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-3.xl\\:grid-cols-6');
    if (cardsGrid) {
      cardsGrid.classList.add('force-grid-cols-6');
    }
    // Force categories grid to 2 columns
    const categoriesGrid = element.querySelector('.grid-cols-1.xl\\:grid-cols-2') || element.querySelector('[class*="grid-cols-1"][class*="grid-cols-2"]');
    if (categoriesGrid) {
      categoriesGrid.classList.add('force-grid-cols-2');
    }
  };

  const removeDesktopLayout = (element: HTMLElement) => {
    const cardsGrid = element.querySelector('.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-3.xl\\:grid-cols-6');
    if (cardsGrid) {
      cardsGrid.classList.remove('force-grid-cols-6');
    }
    const categoriesGrid = element.querySelector('.grid-cols-1.xl\\:grid-cols-2') || element.querySelector('[class*="grid-cols-1"][class*="grid-cols-2"]');
    if (categoriesGrid) {
      categoriesGrid.classList.remove('force-grid-cols-2');
    }
  };

  // Universal direct on-screen capture helper:
  // Expands the target element and its tables/scroll containers to full natural content dimensions,
  // strips shadows, ensures all columns and rows are 100% visible, takes domToPng, and restores original layout.
  const captureDirectHelper = async (targetInput: HTMLElement | React.RefObject<HTMLElement | null> | string | null) => {
    let element: HTMLElement | null = null;
    if (typeof targetInput === 'string') {
      element = document.getElementById(targetInput);
    } else if (targetInput && typeof targetInput === 'object' && 'current' in targetInput) {
      element = (targetInput as any).current;
    } else if (targetInput instanceof HTMLElement) {
      element = targetInput;
    }

    if (!element) {
      console.warn('captureDirectHelper: target element not found', targetInput);
      return;
    }

    try {
      setIsCapturing(true);
      document.body.classList.add('capturing-screenshot');
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 150));

      // Save original styles for element and all ancestors up to body
      const savedStyles: { el: HTMLElement; cssText: string }[] = [];
      
      // Save and expand element itself
      savedStyles.push({ el: element, cssText: element.style.cssText });
      element.style.maxWidth = 'none';
      element.style.width = 'max-content';
      element.style.minWidth = 'max-content';
      element.style.height = 'auto';
      element.style.minHeight = '0px';
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';
      element.style.boxShadow = 'none';
      element.style.filter = 'none';
      element.style.alignSelf = 'flex-start';
      element.style.flex = '0 0 auto';

      // Expand all ancestors so they don't clip the widened table
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        savedStyles.push({ el: parent, cssText: parent.style.cssText });
        parent.style.maxWidth = 'none';
        parent.style.overflow = 'visible';
        parent.style.width = 'auto';
        parent.style.alignItems = 'flex-start';
        parent = parent.parentElement;
      }

      // Expand all scroll containers and reset flex grow inside element
      const scrollEls = element.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow-"], .grow, [class*="grow"]');
      scrollEls.forEach(el => {
        const htmlEl = el as HTMLElement;
        savedStyles.push({ el: htmlEl, cssText: htmlEl.style.cssText });
        htmlEl.style.overflow = 'visible';
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.maxWidth = 'none';
        htmlEl.style.width = 'max-content';
        htmlEl.style.minWidth = '100%';
        htmlEl.style.height = 'auto';
        htmlEl.style.minHeight = '0px';
        htmlEl.style.maxHeight = 'none';
        htmlEl.style.flexGrow = '0';
      });

      // Force all tables inside element to full natural width
      const allTables = element.querySelectorAll('table');
      allTables.forEach(t => {
        const htmlT = t as HTMLElement;
        savedStyles.push({ el: htmlT, cssText: htmlT.style.cssText });
        htmlT.style.width = 'max-content';
        htmlT.style.minWidth = '100%';
        htmlT.style.maxWidth = 'none';
        htmlT.style.tableLayout = 'auto';
        htmlT.style.borderCollapse = 'collapse';
      });

      // Force all table cells to not truncate / clip
      const allCells = element.querySelectorAll('th, td');
      allCells.forEach(c => {
        const htmlC = c as HTMLElement;
        savedStyles.push({ el: htmlC, cssText: htmlC.style.cssText });
        htmlC.style.whiteSpace = 'nowrap';
        htmlC.style.maxWidth = 'none';
        htmlC.style.overflow = 'visible';
      });

      // Strip shadows and filters from all children temporarily
      const allChildren = element.querySelectorAll('*');
      const savedShadows: { el: HTMLElement; bs: string; f: string; ts: string }[] = [];
      allChildren.forEach(el => {
        const htmlEl = el as HTMLElement;
        const cs = getComputedStyle(htmlEl);
        if (cs.boxShadow !== 'none' || cs.filter !== 'none' || cs.textShadow !== 'none') {
          savedShadows.push({ el: htmlEl, bs: htmlEl.style.boxShadow, f: htmlEl.style.filter, ts: htmlEl.style.textShadow });
          htmlEl.style.boxShadow = 'none';
          htmlEl.style.filter = 'none';
          htmlEl.style.textShadow = 'none';
        }
      });

      // Remove Tailwind max-w-* classes temporarily
      const removedClasses: { el: HTMLElement; classes: string[] }[] = [];
      [element, ...Array.from(element.querySelectorAll('*'))].forEach(node => {
        const htmlEl = node as HTMLElement;
        if (htmlEl.classList) {
          const toRemove: string[] = [];
          htmlEl.classList.forEach(c => { if (c.startsWith('max-w-')) toRemove.push(c); });
          if (toRemove.length > 0) {
            removedClasses.push({ el: htmlEl, classes: toRemove });
            toRemove.forEach(c => htmlEl.classList.remove(c));
          }
        }
      });

      // Let browser reflow to compute full natural dimensions
      await new Promise(resolve => setTimeout(resolve, 300));

      // Measure FULL content dimensions after expansion
      const fullWidth = Math.ceil(Math.max(element.scrollWidth, element.offsetWidth, element.getBoundingClientRect().width));
      const fullHeight = Math.ceil(Math.max(element.scrollHeight, element.offsetHeight, element.getBoundingClientRect().height));
      
      // Set explicit pixel dimensions on target element
      element.style.width = `${fullWidth}px`;
      element.style.minWidth = `${fullWidth}px`;
      element.style.height = `${fullHeight}px`;
      element.style.minHeight = `${fullHeight}px`;

      await new Promise(resolve => setTimeout(resolve, 200));

      const dataUrl = await domToPng(element, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        width: fullWidth,
        height: fullHeight,
        features: { removeControlCharacter: true }
      });

      // Restore all styles in reverse order
      savedStyles.forEach(({ el, cssText }) => { el.style.cssText = cssText; });
      savedShadows.forEach(({ el, bs, f, ts }) => {
        el.style.boxShadow = bs;
        el.style.filter = f;
        el.style.textShadow = ts;
      });
      removedClasses.forEach(({ el, classes }) => {
        classes.forEach(c => el.classList.add(c));
      });

      document.body.classList.remove('capturing-screenshot');
      setPreviewImage(dataUrl);
    } catch (error) {
      console.error('Lỗi khi chụp ảnh direct:', error);
      document.body.classList.remove('capturing-screenshot');
    } finally {
      setIsCapturing(false);
    }
  };

  const captureElement = async (ref: React.RefObject<HTMLDivElement | null>, _filename: string) => {
    return captureDirectHelper(ref);
  };

  const captureElementDirect = async (ref: React.RefObject<HTMLDivElement | null>) => {
    return captureDirectHelper(ref);
  };

  const captureOverview = async () => {
    if (overviewRef.current) {
      try {
        setIsCapturing(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        const screenWidth = 1850;
        const dataUrl = await captureOffscreenHelper(overviewRef.current, {
          width: `${screenWidth}px`,
          minWidth: `${screenWidth}px`,
          backgroundColor: '#f8fafc',
          isOverview: true
        });
        setPreviewImage(dataUrl);
      } catch (error) {
        console.error('Lỗi khi chụp ảnh tổng quan:', error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greetingData = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 10) return { text: 'Chào buổi sáng', icon: '☀️', sub: 'Khởi đầu ngày mới tràn đầy năng lượng!' };
    if (hour < 13) return { text: 'Chào buổi trưa', icon: '🌤️', sub: 'Chúc bạn bữa trưa ngon miệng và tiếp tục năng suất!' };
    if (hour < 18) return { text: 'Chào buổi chiều', icon: '🌅', sub: 'Bứt phá doanh số ca chiều cùng siêu thị!' };
    return { text: 'Chào buổi tối', icon: '🌙', sub: 'Tổng kết ca làm việc và theo dõi số liệu hôm nay!' };
  }, [currentTime]);

  const greeting = greetingData.text;

  const summary = useMemo(() => {
    if (!processedData.markets.length) return null;

    if (marketFilter !== 'ALL') {
      const match = processedData.markets.find(m =>
        normalize(m.name).includes(normalize(marketFilter)) ||
        normalize(marketFilter).includes(normalize(m.name))
      );
      if (match) return match;
    }

    const totalRow = processedData.markets.find(m => m.name === 'TỔNG' || m.isSummary);
    return totalRow || processedData.markets[0];
  }, [processedData.markets, marketFilter]);

  const filteredCategories = useMemo(() => {
    if (!processedData.categories || processedData.categories.length === 0) return [];

    const visibleCats = processedData.categories.filter(cat =>
      marketFilter === 'ALL' || !cat.marketName ||
      normalize(cat.marketName).includes(normalize(marketFilter)) ||
      normalize(marketFilter).includes(normalize(cat.marketName))
    );

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

  // Helper to build 3 comment templates for Realtime Doanh thu & Ngành hàng (Matching Image 2)
  const realtimeCommentTemplates = useMemo(() => {
    const activeDeclared = filteredMarkets.find(m => marketFilter === 'ALL' || m.name === marketFilter) || filteredMarkets[0];
    const parsedMarket = activeDeclared ? (processedData.markets.find(pm =>
      normalize(pm.name).includes(normalize(activeDeclared.name)) ||
      normalize(activeDeclared.name).includes(normalize(pm.name))
    ) || {
      name: activeDeclared.name,
      targetQD: 0,
      actualVirtual: 0,
      actualReal: 0,
      percentHT: 0,
      installmentRate: 0,
      luotBillBanHang: 0,
      luotBillThuHo: 0
    }) : {
      name: 'Siêu Thị',
      targetQD: 0,
      actualVirtual: 0,
      actualReal: 0,
      percentHT: 0,
      installmentRate: 0,
      luotBillBanHang: 0,
      luotBillThuHo: 0
    };

    const marketName = activeDeclared?.name || parsedMarket?.name || 'SIÊU THỊ';
    const now = lastUpdated || new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN');
    const nowHeader = `${timeStr} NGÀY ${dateStr}`;
    // Use raw targetQD from BC THÁNG (lũy kế) directly - matching OverviewDashboard
    const activeLkMarket = activeDeclared ? luykeProcessedData?.markets?.find(lm =>
      normalize(lm.name).includes(normalize(activeDeclared.name)) ||
      normalize(activeDeclared.name).includes(normalize(lm.name))
    ) : null;
    const monthTargetQD = activeLkMarket?.targetQD || parsedMarket.targetQD || 0;
    const totalDaysInMonth = mucTieu100Info.totalDaysInMonth || new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyTargetQD = totalDaysInMonth > 0 ? Math.round(monthTargetQD / totalDaysInMonth) : monthTargetQD;
    const dailyPercentHT = dailyTargetQD > 0 
      ? Math.round(((parsedMarket.actualVirtual || 0) / dailyTargetQD) * 100) 
      : Math.round(parsedMarket.percentHT || 0);

    const targetQD = formatCurrencyUnit(dailyTargetQD);
    const actualVirtual = formatCurrencyUnit(parsedMarket.actualVirtual || 0);
    const percentHT = dailyPercentHT;
    const installmentRate = (parsedMarket.installmentRate || 0).toFixed(1);
    const luotBill = Math.round(parsedMarket.luotBillThuHo || 0);

    const dtlk = (parsedMarket as any).actualReal || 0;
    const dtqd = parsedMarket.actualVirtual || 0;
    const valQd = dtlk > 0 ? (((dtqd - dtlk) / dtlk) * 100) : 0;
    const percentQdStr = `${valQd >= 0 ? '+' : ''}${valQd.toFixed(1)}%`;

    // SL Categories
    const slCats = filteredCategories.filter(c => c.type === 'SL' || c.type === 'ALL');
    const slDone = slCats.filter(c => Math.round(c.rate || 0) >= 100);
    const slNotDone = slCats.filter(c => Math.round(c.rate || 0) < 100).sort((a, b) => (b.target - b.revenue) - (a.target - a.revenue));
    const slTop = [...slCats].sort((a, b) => (b.rate || 0) - (a.rate || 0));

    // DT Categories
    const dtCats = filteredCategories.filter(c => c.type === 'DT' || c.type === 'ALL');
    const dtDone = dtCats.filter(c => Math.round(c.rate || 0) >= 100);
    const dtNotDone = dtCats.filter(c => Math.round(c.rate || 0) < 100).sort((a, b) => (b.target - b.revenue) - (a.target - a.revenue));
    const dtTop = [...dtCats].sort((a, b) => (b.rate || 0) - (a.rate || 0));

    // Staff Ranking
    const activeStaffs = (processedData.staffs || []).filter(s => (s.actualVirtual || s.revenue || 0) > 0 || (s.percentHT || 0) > 0);
    const sortedStaffs = [...activeStaffs].sort((a, b) => (b.percentHT || 0) - (a.percentHT || 0));
    const topStaffs = sortedStaffs.slice(0, 3);
    const botStaffs = sortedStaffs.length > 3 ? sortedStaffs.slice(-3).reverse() : [];
    const staffAbove50 = activeStaffs.filter(s => (s.percentHT || 0) >= 50).length;

    // MẪU 1: TOP/BOT NV (TOÀN DIỆN DOANH THU & NGÀNH HÀNG)
    let t1 = `📊 TỔNG HỢP DOANH THU & NGÀNH HÀNG SIÊU THỊ - ${nowHeader}\n`;
    t1 += `🏪 Siêu thị: ${marketName}\n`;
    t1 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    t1 += `📈 KẾT QUẢ TỔNG QUAN:\n`;
    t1 += `🎯 Target QĐ: ${targetQD} || Thực Đạt: ${actualVirtual} (${percentHT}% HT)\n`;
    t1 += `💳 Tỷ trọng Trả Góp: ${installmentRate}% || % QĐ: ${percentQdStr}\n`;
    t1 += `🧾 Lượt Bill Thu Hộ: ${luotBill.toLocaleString()} bill\n`;
    if (activeStaffs.length > 0) {
      t1 += `🎯 Tổng NV: ${activeStaffs.length} || ĐẠT trên 50%: ${staffAbove50}/${activeStaffs.length}\n`;
    }
    t1 += `📦 Tiến độ Ngành Hàng: SL [${slDone.length}/${slCats.length}] || DT [${dtDone.length}/${dtCats.length}]\n\n`;

    if (topStaffs.length > 0) {
      t1 += `🏆 TOP 3 DẪN ĐẦU:\n`;
      topStaffs.forEach((s, idx) => {
        t1 += `🔺 #${idx + 1}. ${s.cleanName || s.name || s.id} (${Math.round(s.percentHT || 0)}% HT - ${Math.round(s.actualVirtual || s.revenue || 0)} tr)\n`;
      });
      t1 += `\n`;
    }

    if (botStaffs.length > 0) {
      t1 += `⚠️ BOTTOM 3 CẦN TĂNG TỐC:\n`;
      botStaffs.forEach(s => {
        t1 += `🔻 ${s.cleanName || s.name || s.id}: ${Math.round(s.percentHT || 0)}% HT (${Math.round(s.actualVirtual || s.revenue || 0)} tr)\n`;
      });
      t1 += `\n`;
    }

    if (dtTop.filter(c => c.rate >= 100).length > 0 || slTop.filter(c => c.rate >= 100).length > 0) {
      t1 += `🌟 TOP NGÀNH HÀNG ĐẠT CHỈ TIÊU:\n`;
      dtTop.filter(c => c.rate >= 100).slice(0, 3).forEach(c => {
        t1 += `✨ DT: ${c.name} (${Math.round(c.rate)}% - ${Math.round(c.revenue).toLocaleString('vi-VN')} tr)\n`;
      });
      slTop.filter(c => c.rate >= 100).slice(0, 3).forEach(c => {
        t1 += `✨ SL: ${c.name} (${Math.round(c.rate)}% - ${Math.round(c.revenue).toLocaleString('vi-VN')})\n`;
      });
      t1 += `\n`;
    }

    if (dtNotDone.length > 0 || slNotDone.length > 0) {
      t1 += `🔴 NGÀNH HÀNG CẦN TẬP TRUNG TĂNG TỐC:\n`;
      dtNotDone.slice(0, 4).forEach(c => {
        const rem = Math.max(0, c.target - c.revenue);
        t1 += `❌ DT: ${c.name} (${Math.round(c.rate)}% | Còn thiếu: ${rem.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr)\n`;
      });
      slNotDone.slice(0, 4).forEach(c => {
        const rem = Math.max(0, c.target - c.revenue);
        t1 += `❌ SL: ${c.name} (${Math.round(c.rate)}% | Còn thiếu: ${Math.round(rem).toLocaleString('vi-VN')})\n`;
      });
      t1 += `\n`;
    }

    t1 += `💪 Cả nhà cùng quyết tâm bứt phá để hoàn thành 100% mục tiêu ngày hôm nay nhé! 🔥`;

    // MẪU 2: DS CẦN TĂNG TỐC
    let t2 = `⚠️ DANH SÁCH CẦN TĂNG TỐC - ${nowHeader}\n`;
    t2 += `🏪 Siêu thị: ${marketName}\n`;
    t2 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    t2 += `🎯 DOANH THU: Đạt ${actualVirtual}/${targetQD} (${percentHT}% HT)\n`;
    t2 += `💳 Trả Góp: ${installmentRate}% | Bill Thu Hộ: ${luotBill} bill\n\n`;

    if (dtNotDone.length > 0) {
      t2 += `🚨 CÁC NGÀNH HÀNG (DT) CHƯA ĐẠT KẾ HOẠCH:\n`;
      dtNotDone.forEach(c => {
        const rem = Math.max(0, c.target - c.revenue);
        t2 += `• ${c.name}: Đạt ${Math.round(c.revenue).toLocaleString('vi-VN')}/${Math.round(c.target).toLocaleString('vi-VN')} tr (${Math.round(c.rate)}%) -> 🔴 CÒN THIẾU: ${rem.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr\n`;
      });
      t2 += `\n`;
    }

    if (slNotDone.length > 0) {
      t2 += `🚨 CÁC NGÀNH HÀNG (SL) CHƯA ĐẠT KẾ HOẠCH:\n`;
      slNotDone.forEach(c => {
        const rem = Math.max(0, c.target - c.revenue);
        t2 += `• ${c.name}: Đạt ${Math.round(c.revenue).toLocaleString('vi-VN')}/${Math.round(c.target).toLocaleString('vi-VN')} (${Math.round(c.rate)}%) -> 🔴 CÒN THIẾU: ${Math.round(rem).toLocaleString('vi-VN')} cái\n`;
      });
      t2 += `\n`;
    }

    if (botStaffs.length > 0) {
      t2 += `🔻 NHÂN SỰ CẦN ĐẨY MẠNH BỨT PHÁ:\n`;
      botStaffs.forEach(s => {
        t2 += `• ${s.cleanName || s.name || s.id}: ${Math.round(s.percentHT || 0)}% HT (${Math.round(s.actualVirtual || s.revenue || 0)} tr)\n`;
      });
      t2 += `\n`;
    }

    t2 += `🔥 Cố gắng lên toàn đội! Tập trung mời khách, tư vấn gói trả góp và đẩy mạnh các ngành hàng chưa đạt nhé!`;

    // MẪU 3: TÓM TẮT
    let t3 = `⚡ TÓM TẮT NHANH DOANH THU & NGÀNH HÀNG - ${timeStr}\n`;
    t3 += `🏪 Siêu thị: ${marketName}\n`;
    t3 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    t3 += `📊 DTQĐ: ${actualVirtual}/${targetQD} (${percentHT}% HT)\n`;
    t3 += `💳 Trả Góp: ${installmentRate}% | 🧾 Thu Hộ: ${luotBill} bill\n`;
    t3 += `📦 Ngành hàng Đạt: SL [${slDone.length}/${slCats.length}] | DT [${dtDone.length}/${dtCats.length}]\n`;
    if (dtNotDone.length > 0 || slNotDone.length > 0) {
      t3 += `🎯 Trọng tâm cần đẩy: ${[...dtNotDone.slice(0, 3), ...slNotDone.slice(0, 2)].map(c => c.name).join(', ')}\n`;
    }
    t3 += `🚀 Quyết tâm hoàn thành 100% mục tiêu hôm nay!`;

    return [
      {
        id: 1,
        title: 'MẪU 1: TOP/BOT NV',
        icon: '🏆',
        text: t1
      },
      {
        id: 2,
        title: 'MẪU 2: DS CẦN TĂNG TỐC',
        icon: '⚠️',
        text: t2
      },
      {
        id: 3,
        title: 'MẪU 3: TÓM TẮT',
        icon: '⚡',
        text: t3
      }
    ];
  }, [filteredMarkets, marketFilter, processedData.markets, processedData.staffs, filteredCategories, lastUpdated]);

  const handleOpenCommentModal = () => {
    setCommentText(realtimeCommentTemplates[selectedCommentTemplate]?.text || realtimeCommentTemplates[0]?.text || '');
    setIsCommentModalOpen(true);
    setCopiedComment(false);
  };

  const handleCopyComment = () => {
    navigator.clipboard.writeText(commentText).then(() => {
      setCopiedComment(true);
      showNotification('Đã sao chép nhận xét vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopiedComment(false), 2500);
    });
  };

  const generateCategoryComment = () => {
    handleOpenCommentModal();
  };

  const captureCategories = async () => {
    if (categoriesRef.current) {
      try {
        setIsCapturing(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        const dataUrl = await captureOffscreenHelper(categoriesRef.current, {
          width: '1850px',
          minWidth: '1850px',
          backgroundColor: '#f8fafc',
          isOverview: true
        });
        setPreviewImage(dataUrl);
      } catch (error) {
        console.error('Lỗi khi chụp ảnh categories:', error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .capturing-screenshot .no-capture { display: none !important; }
        .capturing-screenshot .capturing-screenshot-inline { display: inline !important; }
        .capturing-screenshot .capture-only-title { display: block !important; }
        
        /* Force CSS Grid columns to render identically to on-screen column layout during screenshot capture */
        .capturing-screenshot .force-grid-cols-6 {
          grid-template-columns: repeat(6, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-3 {
          grid-template-columns: repeat(3, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-2 {
          grid-template-columns: repeat(2, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-1 {
          grid-template-columns: 1fr !important;
          display: grid !important;
        }
        
        /* Ensure no elements inside the capturing target crop their content */
        .capturing-screenshot .capturing-target,
        .capturing-screenshot .capturing-target *,
        .capturing-screenshot .overflow-hidden {
          overflow: visible !important;
        }
      `}} />
      <div className="w-full" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
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
              </div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          {/* Top Horizontal Subtab Navigation Bar — Mobile only (sidebar has these on desktop) */}
          <div className="md:hidden bg-white/90 backdrop-blur-xl p-2 rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-start gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'summary', label: 'TỔNG QUAN', icon: LayoutGrid, grad: 'from-indigo-600 to-purple-600', activeBg: 'bg-indigo-50 text-indigo-600' },
              { id: 'muc_tieu_ngay', label: 'MỤC TIÊU NGÀY', icon: Target, grad: 'from-emerald-600 via-teal-600 to-emerald-700', activeBg: 'bg-emerald-50 text-emerald-600' },
              { id: 'khai_thac', label: 'DATA YCX', icon: Activity, grad: 'from-emerald-600 to-teal-600', activeBg: 'bg-emerald-50 text-emerald-600' },
              ...(isUser43751 ? [{ id: 'khai_thac_moi', label: 'DATA YCX MỚI', icon: Activity, grad: 'from-teal-600 to-cyan-600', activeBg: 'bg-teal-50 text-teal-600' }] : [])
            ].map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => startTransition(() => {
                    setActiveTab(item.id as any);
                    if (item.id === 'khai_thac' || item.id === 'khai_thac_moi') setRawTablePage(0);
                  })}
                  className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-2xl text-[11px] sm:text-[12.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 cursor-pointer shrink-0 active:scale-95 ${
                    isActive
                      ? `bg-gradient-to-r ${item.grad} text-white shadow-md shadow-indigo-500/20 scale-[1.02]`
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-slate-500'} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Content Area - Full Width */}
          <div className="w-full min-w-0">
            {pageMaintenanceState[`realtime_${activeTab}`] && !isUser43751Local ? (
              <div className="flex items-center justify-center h-full p-6 mt-12">
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
              {activeTab === 'summary' && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                  ref={overviewRef}
                >
                  {/* Greeting & Birthday Banner */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="no-capture relative overflow-hidden bg-white/95 backdrop-blur-md p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-indigo-100/90 shadow-[0_4px_25px_-4px_rgba(79,70,229,0.08)] space-y-4"
                  >
                    {/* Ambient glow blobs */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-indigo-200/35 via-purple-100/25 to-transparent rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-gradient-to-tr from-emerald-100/35 via-cyan-100/25 to-transparent rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                      <div className="flex items-center gap-3.5">
                        {/* Time Avatar Badge */}
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white flex items-center justify-center text-2xl shadow-md shadow-indigo-500/25 shrink-0 border border-white/50">
                          {greetingData.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-[10.5px] font-extrabold uppercase tracking-wider text-indigo-700 shadow-2xs">
                              <Sparkles size={11} className="text-indigo-500 animate-pulse" />
                              LỜI CHÀO HỆ THỐNG
                            </span>
                            {userProfile?.storeCode && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-600">
                                Mã kho: <b className="text-slate-800 font-extrabold">{userProfile.storeCode}</b>
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl sm:text-2xl md:text-[25px] font-black text-slate-850 tracking-tight mt-0.5">
                            {greeting},{' '}
                            <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 bg-clip-text text-transparent">
                              {userProfile?.username?.split(' ')[0] || 'Bạn'}
                            </span>{' '}
                            👋
                          </h2>
                          <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                            {greetingData.sub}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setIsEditingAnnounce(prev => !prev)}
                          className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 transition-all font-bold text-xs shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
                        >
                          <Edit3 size={13} className="text-indigo-600" />
                          <span>{isEditingAnnounce ? 'Đóng chỉnh sửa' : 'Chỉnh sửa thông báo'}</span>
                        </button>
                      )}
                    </div>

                    {/* Pending users notification with details and inline edit for Admin 43751 */}
                    {isUser43751 && pendingUsers.length > 0 && (
                      <div className="relative z-10 bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 no-capture shadow-xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-amber-200/60">
                          <span className="text-xl animate-bounce">🔔</span>
                          <span className="text-xs font-black text-amber-800 uppercase tracking-wider">
                            Có {pendingUsers.length} người dùng mới đang chờ duyệt
                          </span>
                        </div>
                        <div className="space-y-3">
                          {pendingUsers.map((user) => (
                            <div key={user.username} className="bg-white border border-amber-100 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                    Tài khoản: {user.username}
                                  </span>
                                  <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100">
                                    Mã kho: {user.storeCode}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-slate-700 flex items-center gap-2 flex-wrap">
                                  <span>Siêu thị khai báo:</span>
                                  {editingUsername === user.username ? (
                                    <div className="flex items-center gap-2 mt-1 w-full md:w-auto">
                                      <input
                                        type="text"
                                        value={editNameInput}
                                        onChange={(e) => setEditNameInput(e.target.value)}
                                        className="px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full md:w-[280px]"
                                      />
                                      <button
                                        onClick={() => {
                                          handleEditSupermarketName(user.username, user.storeCode, user.ten_sieu_thi, editNameInput);
                                          setEditingUsername(null);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer transition-colors shadow-sm font-bold"
                                      >
                                        Lưu
                                      </button>
                                      <button
                                        onClick={() => setEditingUsername(null)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer transition-colors font-bold"
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="text-indigo-600 font-extrabold">{user.ten_sieu_thi}</span>
                                      <button
                                        onClick={() => {
                                          setEditingUsername(user.username);
                                          setEditNameInput(user.ten_sieu_thi);
                                        }}
                                        className="text-[10px] text-indigo-500 hover:text-indigo-700 font-black uppercase hover:underline cursor-pointer flex items-center gap-0.5 ml-1 font-bold"
                                      >
                                        [Sửa]
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                                <button
                                  onClick={() => handleRejectUser(user.username)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer font-bold"
                                >
                                  Từ chối
                                </button>
                                <button
                                  onClick={() => handleApproveUser(user.username)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-colors shadow-sm shadow-indigo-100 cursor-pointer font-bold"
                                >
                                  Duyệt Kích Hoạt
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isEditingAnnounce && (
                      <div className="relative z-10 bg-slate-50/90 border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-4 no-capture shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                          <div className="text-[12px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            📢 QUẢN LÝ DANH SÁCH THÔNG BÁO ({announcements.length})
                          </div>
                          {editingDocId !== 'new' && (
                            <button
                              onClick={() => {
                                setEditingDocId('new');
                                setAnnounceTitleInput('');
                                setAnnounceContentInput('');
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider cursor-pointer shadow-sm shadow-indigo-100 flex items-center gap-1 shrink-0"
                            >
                              ➕ Thêm thông báo mới
                            </button>
                          )}
                        </div>

                        {/* Add New Announcement Form inline */}
                        {editingDocId === 'new' && (
                          <div className="bg-white border border-indigo-100 p-4 rounded-xl space-y-3 shadow-sm">
                            <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
                              ✨ Tạo thông báo mới
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                  Tiêu đề thông báo
                                </label>
                                <input
                                  type="text"
                                  value={announceTitleInput}
                                  onChange={(e) => setAnnounceTitleInput(e.target.value)}
                                  placeholder="Ví dụ: THÔNG BÁO DUY TRÌ HỆ THỐNG"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-[11px] font-bold text-slate-850 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                  Nội dung thông báo
                                </label>
                                <textarea
                                  value={announceContentInput}
                                  onChange={(e) => setAnnounceContentInput(e.target.value)}
                                  placeholder="Nhập nội dung thông báo hiển thị cho tất cả người dùng..."
                                  rows={3}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-[11px] font-bold text-slate-850 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner leading-relaxed"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={() => setEditingDocId(null)}
                                className="px-3.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all font-bold text-xs cursor-pointer border border-transparent"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={handleSaveAnnouncement}
                                disabled={isSavingAnnounce}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-all font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
                              >
                                {isSavingAnnounce ? 'Đang lưu...' : 'Lưu / Thêm mới'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* List of current announcements to Edit/Delete */}
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                          {announcements.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 italic text-[11px] font-bold">
                              Chưa có thông báo nào được tạo.
                            </div>
                          ) : (
                            announcements.map((item) => {
                              const isEditingThis = editingDocId === item.id;
                              return (
                                <div key={item.id} className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm space-y-3">
                                  {isEditingThis ? (
                                    <div className="space-y-3">
                                      <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
                                        ✏️ Chỉnh sửa thông báo
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                          Tiêu đề thông báo
                                        </label>
                                        <input
                                          type="text"
                                          value={announceTitleInput}
                                          onChange={(e) => setAnnounceTitleInput(e.target.value)}
                                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-[11px] font-bold text-slate-850 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                          Nội dung thông báo
                                        </label>
                                        <textarea
                                          value={announceContentInput}
                                          onChange={(e) => setAnnounceContentInput(e.target.value)}
                                          rows={3}
                                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-[11px] font-bold text-slate-850 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner leading-relaxed"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2 pt-1">
                                        <button
                                          onClick={() => setEditingDocId(null)}
                                          className="px-3.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all font-bold text-xs cursor-pointer border border-transparent"
                                        >
                                          Hủy
                                        </button>
                                        <button
                                          onClick={handleSaveAnnouncement}
                                          disabled={isSavingAnnounce}
                                          className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-all font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
                                        >
                                          {isSavingAnnounce ? 'Đang lưu...' : 'Lưu / Cập nhật'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 space-y-1">
                                        <h4 className="text-[12px] font-black text-rose-600 uppercase tracking-wider">
                                          {item.title}
                                        </h4>
                                        <p className="text-[11px] text-slate-650 font-bold leading-relaxed whitespace-pre-wrap">
                                          {item.content}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={() => {
                                            setEditingDocId(item.id);
                                            setAnnounceTitleInput(item.title || '');
                                            setAnnounceContentInput(item.content || '');
                                          }}
                                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                          title="Chỉnh sửa"
                                        >
                                          <Edit3 size={12} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteAnnouncement(item.id)}
                                          className="p-1.5 rounded-lg border border-slate-200 text-slate-550 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                                          title="Xóa"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* Global System Announcement list */}
                    {!isEditingAnnounce && announcements.map((announce) => (
                      <div
                        key={announce.id}
                        className="relative z-10 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-orange-500/10 p-3.5 sm:p-4 shadow-2xs overflow-hidden"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg shadow-md shadow-amber-500/25 shrink-0 border border-white/60 animate-bounce">
                            📢
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[11px] uppercase tracking-wider px-3 py-0.5 rounded-lg shadow-2xs">
                                {announce.title?.trim() || 'THÔNG BÁO HỆ THỐNG'}
                              </span>
                            </div>
                            <div className="text-[12.5px] text-rose-700 font-bold leading-relaxed whitespace-pre-wrap bg-white/90 backdrop-blur-xs p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                              {announce.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Personal Expiration Alert */}
                    {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 3 && (
                      <div className="relative z-10 flex items-start gap-4 bg-gradient-to-r from-rose-500/10 via-rose-50/60 to-red-500/10 border border-rose-300/80 p-4 sm:p-5 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center text-lg shadow-md shadow-rose-500/25 shrink-0 border border-white/60 animate-bounce">
                          ⚠️
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-[13px] font-black text-rose-600 uppercase tracking-wider">
                            Cảnh báo hết hạn cước phí
                          </p>
                          <p className="text-[12px] text-rose-700 font-bold tracking-tight leading-relaxed">
                            Gói cước sử dụng của bạn chỉ còn lại <span className="font-black">{daysRemaining} ngày</span> (Hết hạn vào ngày {userProfile?.expiredAt ? new Date(userProfile.expiredAt).toLocaleDateString('vi-VN') : '---'}). Vui lòng chuyển khoản thanh toán gia hạn sớm để tránh gián đoạn dịch vụ truy cập website.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Integrated Birthday & Inventory Greetings */}
                    {(todayBirthdays.length > 0 || tomorrowBirthdays.length > 0 || activeInventoryNotification) && (
                      <div className="relative z-10 flex flex-col gap-3.5">
                        {activeInventoryNotification && (
                          <div className="flex items-start gap-3.5 bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-orange-500/10 border border-amber-300/80 p-3.5 sm:p-4 rounded-2xl overflow-hidden shadow-2xs">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center text-lg shadow-md shadow-amber-500/25 shrink-0 border border-white/60 animate-bounce">
                              📋
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                <span className="text-amber-700 font-black">LỊCH KIỂM KÊ CỦA SIÊU THỊ:</span>
                                <span className="bg-amber-100/90 border border-amber-300/70 text-amber-900 px-2.5 py-0.5 rounded-md font-extrabold text-[11px] uppercase tracking-wide">
                                  {activeInventoryNotification.title}
                                </span>
                              </p>
                              <p className="text-[11.5px] text-slate-700 font-bold tracking-tight leading-relaxed">
                                {activeInventoryNotification.diffDays === 0 ? (
                                  <span className="text-rose-600 animate-pulse font-black uppercase">⚠️ HÔM NAY ĐANG KIỂM KÊ! Vui lòng tập trung và kiểm kê chính xác, nhanh chóng!</span>
                                ) : (
                                  `Sắp diễn ra vào ngày ${new Date(activeInventoryNotification.date).toLocaleDateString('vi-VN')} (Còn ${activeInventoryNotification.diffDays} ngày). Vui lòng chuẩn bị và kiểm tra danh sách phân công.`
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {todayBirthdays.length > 0 && (
                          <div className="flex items-start gap-3.5 bg-gradient-to-r from-rose-500/10 via-pink-50/60 to-rose-500/10 border border-rose-200/80 p-3.5 sm:p-4 rounded-2xl overflow-hidden shadow-2xs">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center text-lg shadow-md shadow-rose-500/25 shrink-0 border border-white/60">
                              🎂
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                <span className="text-rose-600 font-black">Hôm nay sinh nhật:</span>
                                <span className="bg-rose-100/90 border border-rose-200 text-rose-700 px-2.5 py-0.5 rounded-md font-black text-xs">
                                  {todayBirthdays.join(', ')}
                                </span>
                                <span className="text-rose-600 font-black">! 🎉</span>
                              </p>
                              <p className="text-[11.5px] text-slate-500 font-medium">
                                Hãy gửi lời chúc hoặc gửi kèm một món quà/lời chúc ý nghĩa đến nhân viên nhé!
                              </p>
                            </div>
                          </div>
                        )}

                        {tomorrowBirthdays.length > 0 && (
                          <div className="flex items-start gap-3.5 bg-gradient-to-r from-indigo-500/10 via-violet-50/60 to-indigo-500/10 border border-indigo-200/80 p-3.5 sm:p-4 rounded-2xl overflow-hidden shadow-2xs">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg shadow-md shadow-indigo-500/25 shrink-0 border border-white/60">
                              🎁
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                <span className="text-indigo-600 font-black">Ngày mai sinh nhật:</span>
                                <span className="bg-indigo-100/90 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-md font-black text-xs">
                                  {tomorrowBirthdays.join(', ')}
                                </span>
                                <span className="text-indigo-600 font-black">! ✨</span>
                              </p>
                              <p className="text-[11.5px] text-slate-500 font-medium">
                                Hãy chuẩn bị những lời chúc hoặc món quà bất ngờ cho đồng nghiệp vào ngày mai nhé!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>

                  {/* Stats Grid Container */}
                  <div className="space-y-3">
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
                          actualReal: 0,
                          percentHT: 0,
                          installmentRate: 0,
                          luotBillBanHang: 0,
                          luotBillThuHo: 0
                        };

                        // Use raw targetQD from BC THÁNG (lũy kế) directly
                        const lkMarket = luykeProcessedData?.markets?.find(lm =>
                          normalize(lm.name).includes(normalize(declaredMarket.name)) ||
                          normalize(declaredMarket.name).includes(normalize(lm.name))
                        );
                        const monthTargetQD = lkMarket?.targetQD || parsedMarket.targetQD || 0;
                        const totalDaysInMonth = mucTieu100Info.totalDaysInMonth || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                        const dailyTargetQD = totalDaysInMonth > 0 ? Math.round(monthTargetQD / totalDaysInMonth) : monthTargetQD;
                        const dailyPercentHT = dailyTargetQD > 0 
                          ? Math.round(((parsedMarket.actualVirtual || 0) / dailyTargetQD) * 100) 
                          : Math.round(parsedMarket.percentHT || 0);

                        return (
                          <div key={mIdx} className="relative overflow-hidden bg-white/95 backdrop-blur-md p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-indigo-100/90 shadow-[0_4px_25px_-4px_rgba(79,70,229,0.08)] space-y-4">
                            {/* Ambient background glow */}
                            <div className="absolute -top-10 -right-10 w-44 h-44 bg-gradient-to-br from-indigo-200/30 to-transparent rounded-full blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-gradient-to-tr from-emerald-100/30 to-transparent rounded-full blur-2xl pointer-events-none" />

                            {/* Header: Supermarket Banner */}
                            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3.5 border-b border-slate-100/80">
                              <div className="flex items-center gap-3.5">
                                {/* 3D Gradient Store Icon Box */}
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-500/25 shrink-0 border border-white/50">
                                  <Store size={22} strokeWidth={2.2} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-2xs">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                      ĐANG HOẠT ĐỘNG
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200/70 text-[10.5px] font-extrabold uppercase tracking-wider text-indigo-700">
                                      ⚡ BÁO CÁO REALTIME NGÀY
                                    </span>
                                    {lastUpdated && (
                                      <span className="text-[11px] font-bold text-slate-400">
                                        Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-850 tracking-tight uppercase flex items-center gap-2">
                                    <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
                                      {declaredMarket.name}
                                    </span>
                                  </h3>
                                </div>
                              </div>
                              <button
                                onClick={captureOverview}
                                className="no-capture inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 shrink-0 cursor-pointer w-full sm:w-auto self-start sm:self-auto border border-white/20"
                              >
                                <Camera size={16} />
                                <span>Chụp tổng quan</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                              <StatCard
                                title="TAGET QĐ"
                                value={formatCurrencyUnit(dailyTargetQD)}
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
                                value={`${dailyPercentHT}%`}
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
                                title="% QĐ"
                                value={(() => {
                                  const dtlk = (parsedMarket as any).actualReal || 0;
                                  const dtqd = parsedMarket.actualVirtual || 0;
                                  if (dtlk === 0) return '0.0%';
                                  const val = ((dtqd - dtlk) / dtlk) * 100;
                                  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
                                })()}
                                subValue=""
                                icon={TrendingUp}
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

                  {/* Categories Tables in Summary */}
                  <div className="space-y-3.5" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                    {isV2Active ? (
                      /* ===== V2 GRADIENT CATEGORY UI ===== */
                      <>
                        <div className="flex flex-wrap items-center justify-end gap-2.5 no-capture">
                          <button
                            onClick={() => setShowTargetCols(!showTargetCols)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase transition-all duration-300 border active:scale-95 cursor-pointer ${showTargetCols
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-md shadow-orange-500/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 shadow-xs'
                              }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${showTargetCols ? 'bg-white' : 'bg-slate-400'}`}></div>
                            TARGET · REAL · %HT · C.LẠI
                          </button>
                          <button
                            onClick={() => setShowOrangeCols(!showOrangeCols)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase transition-all duration-300 border active:scale-95 cursor-pointer ${showOrangeCols
                              ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white border-transparent shadow-md shadow-purple-500/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 shadow-xs'
                              }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${showOrangeCols ? 'bg-white' : 'bg-slate-400'}`}></div>
                            LUỸ KẾ · MỤC TIÊU
                          </button>
                          <button
                            onClick={generateCategoryComment}
                            className="flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] text-white shadow-md shadow-indigo-500/25 transition-all duration-300 active:scale-95 cursor-pointer border border-indigo-400/30"
                          >
                            <MessageSquare size={14} className="text-white shrink-0" />
                            <span>NHẬN XÉT</span>
                          </button>
                          <button
                            onClick={captureCategories}
                            className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[12px] font-black uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all duration-300 active:scale-95 no-capture cursor-pointer"
                          >
                            <Camera size={15} />
                            <span>Chụp ảnh</span>
                          </button>
                        </div>

                        <div ref={categoriesRef} className="w-full">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 items-start">
                            {/* Left Table: SLLK */}
                            <div ref={categorySLRef} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden min-w-0 flex flex-col p-2 sm:p-2.5 shadow-sm self-start h-auto">
                              {/* Unified Emerald Gradient Header Banner */}
                              <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] p-4 rounded-2xl text-white relative shrink-0 mb-2.5">
                                <div className="flex flex-col items-center justify-center text-center">
                                  <h2 className="text-[23px] sm:text-[27px] font-black text-[#FEF08A] uppercase tracking-wide drop-shadow-sm leading-tight" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                    NGÀNH HÀNG (SL)
                                  </h2>
                                  <div className="flex items-center justify-center flex-nowrap whitespace-nowrap gap-2 mt-1.5 text-xs sm:text-sm font-bold text-white/95" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                      ⚡ Realtime: {lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                    <span className="opacity-70">||</span>
                                    <span className="text-white font-extrabold whitespace-nowrap">
                                      ĐẠT : {filteredCategories.filter(c => c.type === 'SL' || c.type === 'ALL').filter(c => Math.round(c.rate || 0) >= 100).length}/{filteredCategories.filter(c => c.type === 'SL' || c.type === 'ALL').length}
                                    </span>
                                  </div>
                                </div>

                                {/* Camera Capture Button */}
                                <button
                                  onClick={() => captureElement(categorySLRef, 'NganhHang_SL_Realtime')}
                                  className="no-capture absolute right-3 top-3 p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-all cursor-pointer border border-white/25 active:scale-95"
                                  title="Chụp ảnh bảng Ngành hàng SL"
                                >
                                  <Camera size={16} />
                                </button>
                              </div>

                              {showSllkComment && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2.5 no-capture">
                                  <textarea
                                    value={sllkComment}
                                    onChange={(e) => setSllkComment(e.target.value)}
                                    placeholder="Nhập nhận xét cho bảng SLLK..."
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-emerald-500/20 resize-none min-h-[60px] screenshot-comment"
                                  />
                                </div>
                              )}

                              <div className="overflow-x-auto w-full rounded-2xl border border-emerald-300/80 mobile-table-scroll" style={{ '--sticky-col-1-width': '40px' } as React.CSSProperties}>
                                <table className="w-full border-separate border-spacing-0 table-fixed bg-white responsive-data-table" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900, minWidth: '600px' }}>
                                  <colgroup>
                                    <col style={{ width: '40px' }} />
                                    <col style={{ width: 'auto' }} className="sticky-col-2-width" />
                                    <col style={{ width: '68px' }} />
                                    <col style={{ width: '58px' }} />
                                    <col style={{ width: '58px' }} />
                                    <col style={{ width: '58px' }} />
                                    {showOrangeCols && showLuykeColumn && <col style={{ width: '68px' }} />}
                                    {showOrangeCols && <col style={{ width: '75px' }} />}
                                  </colgroup>
                                  <thead>
                                    <tr className="text-white h-[46px]">
                                      <th className={`sticky-col sticky-col-1 px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden`}>STT</th>
                                      <th className={`sticky-col sticky-col-2 px-2.5 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black uppercase text-left border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden`}>NGÀNH HÀNG</th>
                                      <th className={`px-1 py-0 ${isUser43751 ? 'text-[13.5px]' : 'text-[12px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden`}>TARGET</th>
                                      <th className={`px-1 py-0 ${isUser43751 ? 'text-[13.5px]' : 'text-[12px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden`}>REAL</th>
                                      <th className={`px-1 py-0 ${isUser43751 ? 'text-[13.5px]' : 'text-[12px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden`}>%HT</th>
                                      <th className={`px-1 py-0 ${isUser43751 ? 'text-[13.5px]' : 'text-[12px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden`}>C.LẠI</th>
                                      {showOrangeCols && showLuykeColumn && <th className={`px-1 py-0 ${isUser43751 ? 'text-[11.5px]' : 'text-[10px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#065F46] leading-tight whitespace-nowrap overflow-hidden`}>LK<br />C.LẠI</th>}
                                      {showOrangeCols && <th className={`px-1 py-0 ${isUser43751 ? 'text-[11.5px]' : 'text-[10px]'} font-black uppercase text-center border-b border-emerald-600 bg-[#065F46] leading-tight whitespace-nowrap overflow-hidden`}>M.TIÊU<br />/ NGÀY</th>}
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
                                        const isEven = idx % 2 === 0;
                                        return (
                                          <tr key={idx} className={`group ${isEven ? 'bg-white' : 'bg-emerald-50/20'} hover:bg-emerald-50/70 transition-colors h-[40px]`}>
                                            <td className={`sticky-col sticky-col-1 px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-slate-700 text-center border-r border-b border-emerald-100/90 bg-emerald-50/40`}>{idx + 1}</td>
                                            <td className={`sticky-col sticky-col-2 px-2 py-0.5 ${isUser43751 ? 'text-[14px]' : 'text-[12.5px]'} font-black uppercase border-r border-b border-emerald-100/90 text-slate-900 leading-snug tracking-tight ${isEven ? 'bg-white' : 'bg-emerald-50/20'} group-hover:bg-emerald-50/70`} title={cat.name}><span className="sticky-col-cell-text">{cat.name}</span></td>
                                            <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-bold text-center border-r border-b border-emerald-100/90 text-slate-800`}>{cat.target > 0 ? Math.round(cat.target).toLocaleString() : ""}</td>
                                            <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-center border-r border-b border-emerald-100/90 text-emerald-700`}>{cat.revenue > 0 ? Math.round(cat.revenue).toLocaleString() : ""}</td>
                                            <td className="px-0.5 py-0 text-center border-r border-b border-emerald-100/90 whitespace-nowrap">
                                              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black leading-none ${isUser43751 ? 'text-[12.5px] sm:text-[14px]' : 'text-[11.5px] sm:text-[13px]'} ${Math.round(cat.rate || 0) >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'}`}>
                                                {Math.round(cat.rate || 0)}%
                                              </span>
                                            </td>
                                            <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-bold text-center border-r border-b border-emerald-100/90 text-rose-600`}>{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>
                                            {showOrangeCols && showLuykeColumn && (
                                              <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-bold text-center border-r border-b border-emerald-100/90 text-purple-700`}>{lkRemaining ? Math.abs(Math.round(lkRemaining)).toLocaleString() : ""}</td>
                                            )}
                                            {showOrangeCols && (() => {
                                              const lkCat = luykeCatMap.get(lkKey);
                                              if (!lkCat || lkCat.target === 0) return <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-center border-b border-emerald-100/90 text-slate-400`}></td>;
                                              const mucTieu = Math.round((lkCat.target / mucTieu100Info.totalDaysInMonth) * mucTieu100Info.daysPassed - lkCat.revenue);
                                              return <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-center border-b border-emerald-100/90 ${mucTieu > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{mucTieu > 0 ? Math.round(mucTieu).toLocaleString() : ''}</td>;
                                            })()}
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Right Table: DTLK */}
                            <div ref={categoryDTRef} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden min-w-0 flex flex-col p-2 sm:p-2.5 shadow-sm self-start h-auto">
                              {/* Unified Emerald Gradient Header Banner */}
                              <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] p-4 rounded-2xl text-white relative shrink-0 mb-2.5">
                                <div className="flex flex-col items-center justify-center text-center">
                                  <h2 className="text-[23px] sm:text-[27px] font-black text-[#FEF08A] uppercase tracking-wide drop-shadow-sm leading-tight" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                    NGÀNH HÀNG (DT)
                                  </h2>
                                  <div className="flex items-center justify-center flex-nowrap whitespace-nowrap gap-2 mt-1.5 text-xs sm:text-sm font-bold text-white/95" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                      ⚡ Realtime: {lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                    <span className="opacity-70">||</span>
                                    <span className="text-white font-extrabold whitespace-nowrap">
                                      ĐẠT : {filteredCategories.filter(c => c.type === 'DT' || c.type === 'ALL').filter(c => Math.round(c.rate || 0) >= 100).length}/{filteredCategories.filter(c => c.type === 'DT' || c.type === 'ALL').length}
                                    </span>
                                  </div>
                                </div>

                                {/* Camera Capture Button */}
                                <button
                                  onClick={() => captureElement(categoryDTRef, 'NganhHang_DT_Realtime')}
                                  className="no-capture absolute right-3 top-3 p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-all cursor-pointer border border-white/25 active:scale-95"
                                  title="Chụp ảnh bảng Ngành hàng DT"
                                >
                                  <Camera size={16} />
                                </button>
                              </div>

                              {showDtlkComment && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2.5 no-capture">
                                  <textarea
                                    value={dtlkComment}
                                    onChange={(e) => setDtlkComment(e.target.value)}
                                    placeholder="Nhập nhận xét cho bảng DTLK..."
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-emerald-500/20 resize-none min-h-[60px] screenshot-comment"
                                  />
                                </div>
                              )}

                              <div className="overflow-x-auto w-full rounded-2xl border border-emerald-300/80 mobile-table-scroll" style={{ '--sticky-col-1-width': '40px' } as React.CSSProperties}>
                                <table className="w-full border-separate border-spacing-0 table-fixed bg-white responsive-data-table" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900, minWidth: '600px' }}>
                                  <colgroup>
                                    <col style={{ width: '40px' }} />
                                    <col style={{ width: 'auto' }} className="sticky-col-2-width" />
                                    <col style={{ width: '68px' }} />
                                    <col style={{ width: '58px' }} />
                                    <col style={{ width: '58px' }} />
                                    <col style={{ width: '58px' }} />
                                    {showOrangeCols && showLuykeColumn && <col style={{ width: '68px' }} />}
                                    {showOrangeCols && <col style={{ width: '75px' }} />}
                                  </colgroup>
                                  <thead>
                                    <tr className="text-white h-[46px]">
                                      <th className={`sticky-col sticky-col-1 px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden`}>STT</th>
                                      <th className={`sticky-col sticky-col-2 px-2.5 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black uppercase text-left border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden`}>NGÀNH HÀNG</th>
                                      <th className={`px-1 py-0 ${isUser43751 ? 'text-[13.5px]' : 'text-[12px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden`}>TARGET</th>
                                      <th className={`px-1 py-0 ${isUser43751 ? 'text-[13.5px]' : 'text-[12px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden`}>REAL</th>
                                      <th className={`px-1 py-0 ${isUser43751 ? 'text-[13.5px]' : 'text-[12px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden`}>%HT</th>
                                      <th className={`px-1 py-0 ${isUser43751 ? 'text-[13.5px]' : 'text-[12px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden`}>C.LẠI</th>
                                      {showOrangeCols && showLuykeColumn && <th className={`px-1 py-0 ${isUser43751 ? 'text-[11.5px]' : 'text-[10px]'} font-black uppercase text-center border-r border-b border-emerald-600 bg-[#065F46] leading-tight whitespace-nowrap overflow-hidden`}>LK<br />C.LẠI</th>}
                                      {showOrangeCols && <th className={`px-1 py-0 ${isUser43751 ? 'text-[11.5px]' : 'text-[10px]'} font-black uppercase text-center border-b border-emerald-600 bg-[#065F46] leading-tight whitespace-nowrap overflow-hidden`}>M.TIÊU<br />/ NGÀY</th>}
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
                                        const isEven = idx % 2 === 0;
                                        return (
                                          <tr key={idx} className={`group ${isEven ? 'bg-white' : 'bg-emerald-50/20'} hover:bg-emerald-50/70 transition-colors h-[40px]`}>
                                            <td className={`sticky-col sticky-col-1 px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-slate-700 text-center border-r border-b border-emerald-100/90 bg-emerald-50/40`}>{idx + 1}</td>
                                            <td className={`sticky-col sticky-col-2 px-2 py-0.5 ${isUser43751 ? 'text-[14px]' : 'text-[12.5px]'} font-black uppercase border-r border-b border-emerald-100/90 text-slate-900 leading-snug tracking-tight ${isEven ? 'bg-white' : 'bg-emerald-50/20'} group-hover:bg-emerald-50/70`} title={cat.name}><span className="sticky-col-cell-text">{cat.name}</span></td>
                                            <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-bold text-center border-r border-b border-emerald-100/90 text-slate-800`}>{Math.round(cat.target).toLocaleString()}</td>
                                            <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-center border-r border-b border-emerald-100/90 text-emerald-700`}>{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>
                                            <td className="px-0.5 py-0 text-center border-r border-b border-emerald-100/90 whitespace-nowrap">
                                              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black leading-none ${isUser43751 ? 'text-[12.5px] sm:text-[14px]' : 'text-[11.5px] sm:text-[13px]'} ${Math.round(cat.rate || 0) >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'}`}>
                                                {Math.round(cat.rate || 0)}%
                                              </span>
                                            </td>
                                            <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-bold text-center border-r border-b border-emerald-100/90 text-rose-600`}>{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>
                                            {showOrangeCols && showLuykeColumn && (
                                              <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-bold text-center border-r border-b border-emerald-100/90 text-purple-700`}>{lkRemaining ? Math.abs(Math.round(lkRemaining)).toLocaleString() : ""}</td>
                                            )}
                                            {showOrangeCols && (() => {
                                              const lkCat = luykeCatMap.get(lkKey) || luykeCatMap.get(`${cat.name.trim().toUpperCase()}_ALL`);
                                              if (!lkCat || lkCat.target === 0) return <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-center border-b border-emerald-100/90 text-slate-400`}></td>;
                                              const mucTieu = Math.round((lkCat.target / mucTieu100Info.totalDaysInMonth) * mucTieu100Info.daysPassed - lkCat.revenue);
                                              return <td className={`px-1 py-0 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-center border-b border-emerald-100/90 ${mucTieu > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{mucTieu > 0 ? Math.round(mucTieu).toLocaleString() : ''}</td>;
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
                      </>
                    ) : (
                      /* ===== V1 CLASSIC CATEGORY UI ===== */
                      <>
                        <div className="flex flex-wrap items-center justify-end gap-2 no-capture">
                          <button
                            onClick={() => setShowTargetCols(!showTargetCols)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all duration-300 border cursor-pointer ${showTargetCols
                              ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            TARGET · REAL · %HT · CÒN LẠI
                          </button>
                          <button
                            onClick={() => setShowOrangeCols(!showOrangeCols)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all duration-300 border cursor-pointer ${showOrangeCols
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md shadow-purple-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            LUỸ KẾ · MỤC TIÊU
                          </button>
                          <button
                            onClick={generateCategoryComment}
                            className="p-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white rounded-xl transition-all duration-300 shadow-sm cursor-pointer"
                            title="Nhận xét chung doanh thu & ngành hàng"
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button
                            onClick={captureCategories}
                            className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-all duration-300 border border-slate-200 no-capture cursor-pointer"
                            title="Chụp ảnh toàn bộ Ngành hàng"
                          >
                            <Camera size={16} />
                          </button>
                        </div>

                        <div ref={categoriesRef} className="bg-white rounded-3xl overflow-hidden border border-slate-200">
                          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Left Table: SLLK */}
                            <div ref={categorySLRef} className="border border-slate-300 overflow-hidden min-w-0">
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

                                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-sm mobile-table-scroll" style={{ '--sticky-col-1-width': '40px' } as React.CSSProperties}>
                                  <table className="w-full border-separate border-spacing-0 responsive-data-table" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                                    <thead>
                                      <tr className="text-white h-[52px]">
                                        <th className="sticky-col sticky-col-1 px-2 py-0 text-[14.5px] font-black uppercase text-center border-r border-b border-slate-800 bg-[#0F172A] w-10">STT</th>
                                        <th className="sticky-col sticky-col-2 px-3 py-0 text-[14.5px] font-black uppercase text-left border-r border-b border-slate-800 bg-[#0F172A]">NGÀNH HÀNG</th>
                                        {showTargetCols && <th className="px-2 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-slate-700 bg-[#1E293B] w-[65px]">TARGET</th>}
                                        {showTargetCols && <th className="px-2 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-slate-700 bg-[#1E293B] w-[65px]">REAL</th>}
                                        {showTargetCols && <th className="px-2 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-slate-700 bg-[#1E293B] w-[65px]">%HT</th>}
                                        {showTargetCols && <th className="px-2 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-slate-700 bg-[#1E293B] w-[65px]">CÒN LẠI</th>}
                                        {showOrangeCols && showLuykeColumn && <th className="px-2 py-0 text-[12px] font-black uppercase text-center border-r border-b border-purple-900 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] w-[65px] leading-tight">L.KẾ<br />CÒN LẠI</th>}
                                        {showOrangeCols && <th className="px-2 py-0 text-[12px] font-black uppercase text-center border-r border-b border-purple-900 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] w-[75px] leading-tight">MỤC TIÊU<br />100%/NGÀY</th>}
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
                                            <tr key={idx} className="group hover:bg-indigo-50/50 transition-colors h-[40px]">
                                              <td className="sticky-col sticky-col-1 px-2 py-0 text-[14.5px] font-black text-slate-700 text-center border-r border-b border-slate-200 bg-slate-50">{idx + 1}</td>
                                              <td className="sticky-col sticky-col-2 px-3 py-0 text-[14px] font-black uppercase border-r border-b border-slate-200 text-slate-900 truncate tracking-tight bg-white group-hover:bg-indigo-50/50"><span className="sticky-col-cell-text">{cat.name}</span></td>
                                              {showTargetCols && <td className="px-2 py-0 text-[14.5px] font-bold text-center border-r border-b border-slate-200 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>}
                                              {showTargetCols && <td className="px-2 py-0 text-[14.5px] font-black text-center border-r border-b border-slate-200 text-emerald-600">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>}
                                              {showTargetCols && <td className={`px-2 py-0 text-[14.5px] font-black text-center border-r border-b border-slate-200 ${Math.round(cat.rate || 0) >= 100 ? 'text-emerald-700 bg-emerald-50/80' : 'text-rose-600'}`}>{Math.round(cat.rate || 0)}%</td>}
                                              {showTargetCols && <td className="px-2 py-0 text-[14.5px] font-bold text-center border-r border-b border-slate-200 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>}
                                              {showOrangeCols && showLuykeColumn && (
                                                <td className="px-2 py-0 text-[14.5px] font-bold text-center border-r border-b border-slate-200 text-purple-700">{lkRemaining ? Math.abs(Math.round(lkRemaining)).toLocaleString() : ""}</td>
                                              )}
                                              {showOrangeCols && (() => {
                                                const lkCat = luykeCatMap.get(lkKey);
                                                if (!lkCat || lkCat.target === 0) return <td className="px-2 py-0 text-[14.5px] font-black text-center border-r border-slate-200 text-slate-400"></td>;
                                                const mucTieu = Math.round((lkCat.target / mucTieu100Info.totalDaysInMonth) * mucTieu100Info.daysPassed - lkCat.revenue);
                                                return <td className={`px-2 py-0 text-[14.5px] font-black text-center border-r border-b border-slate-200 ${mucTieu > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{mucTieu > 0 ? Math.round(mucTieu).toLocaleString() : ''}</td>;
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
                            <div ref={categoryDTRef} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden min-w-0">
                              <div className="p-5">
                                <div className="grid grid-cols-2 border-b border-slate-200 divide-x divide-slate-200 pb-3 mb-4">
                                  <div className="p-2 flex flex-col items-center justify-center">
                                    <h2 className="text-lg font-black bg-gradient-to-r from-slate-900 to-[#2563EB] bg-clip-text text-transparent uppercase tracking-tight pb-1 mb-1 border-b border-slate-100 w-full text-center">NGÀNH HÀNG (DT)</h2>
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">REALTIME</span>
                                      <button
                                        onClick={() => captureElement(categoryDTRef, 'NganhHang_DT_Realtime')}
                                        className="no-capture p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                        title="Chụp ảnh bảng Ngành hàng DT"
                                      >
                                        <Camera size={13} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="p-2 flex flex-col items-center justify-center">
                                    <h2 className="text-lg font-black bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent uppercase tracking-tight pb-1 mb-1 border-b border-slate-100 w-full text-center">DỰ KIẾN</h2>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">
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

                                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-sm mobile-table-scroll" style={{ '--sticky-col-1-width': '40px' } as React.CSSProperties}>
                                  <table className="w-full border-separate border-spacing-0 responsive-data-table" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
                                    <thead>
                                      <tr className="text-white h-[52px]">
                                        <th className="sticky-col sticky-col-1 px-2 py-0 text-[14.5px] font-black uppercase text-center border-r border-b border-slate-800 bg-[#0F172A] w-10">STT</th>
                                        <th className="sticky-col sticky-col-2 px-3 py-0 text-[14.5px] font-black uppercase text-left border-r border-b border-slate-800 bg-[#0F172A]">NGÀNH HÀNG</th>
                                        {showTargetCols && <th className="px-2 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-slate-700 bg-[#1E293B] w-[65px]">TARGET</th>}
                                        {showTargetCols && <th className="px-2 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-slate-700 bg-[#1E293B] w-[65px]">REAL</th>}
                                        {showTargetCols && <th className="px-2 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-slate-700 bg-[#1E293B] w-[65px]">%HT</th>}
                                        {showTargetCols && <th className="px-2 py-0 text-[13.5px] font-black uppercase text-center border-r border-b border-slate-700 bg-[#1E293B] w-[65px]">CÒN LẠI</th>}
                                        {showOrangeCols && showLuykeColumn && <th className="px-2 py-0 text-[12px] font-black uppercase text-center border-r border-b border-purple-900 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] w-[65px] leading-tight">L.KẾ<br />CÒN LẠI</th>}
                                        {showOrangeCols && <th className="px-2 py-0 text-[12px] font-black uppercase text-center border-r border-b border-purple-900 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] w-[75px] leading-tight">MỤC TIÊU<br />100%/NGÀY</th>}
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
                                            <tr key={idx} className="group hover:bg-indigo-50/50 transition-colors h-[40px]">
                                              <td className="sticky-col sticky-col-1 px-2 py-0 text-[14.5px] font-black text-slate-700 text-center border-r border-b border-slate-200 bg-slate-50">{idx + 1}</td>
                                              <td className="sticky-col sticky-col-2 px-3 py-0 text-[14px] font-black uppercase border-r border-b border-slate-200 text-slate-900 truncate tracking-tight bg-white group-hover:bg-indigo-50/50"><span className="sticky-col-cell-text">{cat.name}</span></td>
                                              {showTargetCols && <td className="px-2 py-0 text-[14.5px] font-bold text-center border-r border-b border-slate-200 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>}
                                              {showTargetCols && <td className="px-2 py-0 text-[14.5px] font-black text-center border-r border-b border-slate-200 text-emerald-600">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>}
                                              {showTargetCols && <td className={`px-2 py-0 text-[14.5px] font-black text-center border-r border-b border-slate-200 ${Math.round(cat.rate || 0) >= 100 ? 'text-emerald-700 bg-emerald-50/80' : 'text-rose-600'}`}>{Math.round(cat.rate || 0)}%</td>}
                                              {showTargetCols && <td className="px-2 py-0 text-[14.5px] font-bold text-center border-r border-b border-slate-200 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>}
                                              {showOrangeCols && showLuykeColumn && (
                                                <td className="px-2 py-0 text-[14.5px] font-bold text-center border-r border-b border-slate-200 text-purple-700">{lkRemaining ? Math.abs(Math.round(lkRemaining)).toLocaleString() : ""}</td>
                                              )}
                                              {showOrangeCols && (() => {
                                                const lkCat = luykeCatMap.get(lkKey) || luykeCatMap.get(`${cat.name.trim().toUpperCase()}_ALL`);
                                                if (!lkCat || lkCat.target === 0) return <td className="px-2 py-0 text-[14.5px] font-black text-center border-r border-b border-slate-200 text-slate-400"></td>;
                                                const mucTieu = Math.round((lkCat.target / mucTieu100Info.totalDaysInMonth) * mucTieu100Info.daysPassed - lkCat.revenue);
                                                return <td className={`px-2 py-0 text-[14.5px] font-black text-center border-r border-b border-slate-200 ${mucTieu > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{mucTieu > 0 ? Math.round(mucTieu).toLocaleString() : ''}</td>;
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
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'muc_tieu_ngay' && (
                <motion.div
                  key="muc_tieu_ngay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <MucTieuNgayTab
                    marketFilter={marketFilter}
                    filteredMarkets={filteredMarkets}
                    processedData={processedData}
                    filteredCategories={filteredCategories}
                    lastUpdated={lastUpdated}
                    captureElement={captureElement}
                    captureElementDirect={captureElementDirect}
                    userProfile={userProfile}
                    luykeProcessedData={luykeProcessedData}
                  />
                </motion.div>
              )}

              {(activeTab === 'khai_thac' || activeTab === 'khai_thac_moi') && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                  style={{ zoom: 1.3 }}
                >
                  {/* HƯỚNG DẪN TẢI BÁO CÁO YCX */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <Globe size={18} />
                        </div>
                        <div>
                          <h4 className={`text-[12px] font-black uppercase tracking-wider ${isMoiTab ? 'text-red-600' : 'text-slate-800'}`}>HƯỚNG DẪN TẢI DỮ LIỆU YCX {isMoiTab ? 'MỚI' : ''}</h4>
                          <p className="text-[10px] text-slate-400">Trình tự thao tác tải file báo cáo YCX {isMoiTab ? 'mới' : ''} từ trang nguồn</p>
                        </div>
                      </div>
                      {isUser43751 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowConfigModal(true)}
                            className="p-2 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-2"
                            title="Cấu hình phân loại nhóm hàng"
                          >
                            <Settings size={18} />
                            <span className="hidden md:inline text-[11px] font-bold">CẤU HÌNH NHÓM HÀNG</span>
                          </button>
                          <button
                            onClick={() => setShowConfigBaoHiemModal(true)}
                            className="p-2 bg-slate-100 hover:bg-teal-100 text-slate-500 hover:text-teal-600 rounded-lg transition-colors flex items-center gap-2"
                            title="Cấu hình phân loại Bảo hiểm & VAS"
                          >
                            <Settings size={18} />
                            <span className="hidden md:inline text-[11px] font-bold">CẤU HÌNH BH & VAS</span>
                          </button>
                          <button
                            onClick={() => setShowConfigLoaiBoModal(true)}
                            className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-lg transition-colors flex items-center gap-2"
                            title="Cấu hình loại bỏ dữ liệu"
                          >
                            <Settings size={18} />
                            <span className="hidden md:inline text-[11px] font-bold">CẤU HÌNH LOẠI BỎ</span>
                          </button>
                          <button
                            onClick={() => setShowConfigQuyDoiModal(true)}
                            className="p-2 bg-slate-100 hover:bg-purple-100 text-slate-500 hover:text-purple-600 rounded-lg transition-colors flex items-center gap-2"
                            title="Cấu hình hệ số quy đổi"
                          >
                            <Settings size={18} />
                            <span className="hidden md:inline text-[11px] font-bold">CẤU HÌNH QUY ĐỔI</span>
                          </button>
                          <button
                            onClick={() => setShowConfigGoogleSheetModal(true)}
                            className="p-2 bg-slate-100 hover:bg-green-100 text-slate-500 hover:text-green-600 rounded-lg transition-colors flex items-center gap-2"
                            title="Đồng bộ Google Sheets"
                          >
                            <FileSpreadsheet size={18} />
                            <span className="hidden md:inline text-[11px] font-bold">ĐỒNG BỘ GOOGLE SHEET</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <div className="space-y-3">
                        <div className="text-[11px] text-slate-600 space-y-2">
                          <p className="font-bold">Trình tự thao tác:</p>
                          {isMoiTab ? (
                            <ol className="list-decimal pl-4 space-y-1 text-slate-500 font-medium">
                              <li>Chọn app <span className="font-black text-indigo-600">MWG WORK</span></li>
                              <li>Tìm <span className="font-black text-indigo-600">Report DMX</span></li>
                              <li>Chọn <span className="font-black text-indigo-600">Doanh Thu Nhân Viên - Kho Tạo</span></li>
                              <li>Chọn <span className="font-black text-indigo-600">ngày</span>, Chọn <span className="font-black text-indigo-600">Vùng</span>, Chọn <span className="font-black text-indigo-600">Khu Vực</span>, Chọn <span className="font-black text-indigo-600">Siêu Thị</span> → Xem báo cáo</li>
                              <li><span className="font-black text-indigo-600">Xuất Excel</span> → Tải về Điện Thoại</li>
                              <li>Mở Web bằng <span className="font-black text-indigo-600">Safari</span> → Chọn tải <span className="font-black text-indigo-600">File Excel</span> lên → Hoàn Tất</li>
                            </ol>
                          ) : (
                            <ol className="list-decimal pl-4 space-y-1 text-slate-500 font-medium">
                              <li>Chọn <span className="font-black text-indigo-600">Bán hàng</span></li>
                              <li>Chọn tiếp danh mục con <span className="font-black text-indigo-600">Bán hàng</span></li>
                              <li>Click vào mục <span className="font-black text-indigo-600">Chi tiết yêu cầu xuất</span></li>
                              <li>Chọn <span className="font-black text-indigo-600">từ ngày đến ngày</span></li>
                              <li>Chọn <span className="font-black text-indigo-600">kho tạo</span></li>
                              <li>Chọn <span className="font-black text-indigo-600">mã siêu thị</span></li>
                            </ol>
                          )}
                        </div>

                        {!isMoiTab && (
                        <div className="pt-2">
                          <a
                            href="https://report.mwgroup.vn/home/dashboard/77"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-100 hover:shadow-indigo-200"
                          >
                            <Globe size={12} />
                            <span>Truy cập Link tải báo cáo</span>
                          </a>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* YCX NHÂN VIÊN Upload Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${currentYcxFileName ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <FileSpreadsheet size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`text-[12px] font-black uppercase tracking-wide block ${currentYcxFileName ? 'text-teal-700' : 'text-slate-500'}`}>YCX NHÂN VIÊN {isMoiTab ? 'MỚI' : ''}</span>
                          {currentYcxFileName ? (
                            <p className="text-[10px] text-teal-600 font-bold truncate max-w-xl">{currentYcxFileName} <span className="text-slate-400 font-normal ml-1">(Nhấp để tải/gộp thêm file Excel)</span></p>
                          ) : (
                            <p className="text-[10px] text-slate-400">Nhấp để tải lên file Excel YCX nhân viên {isMoiTab ? 'mới (có thể tải/gộp nhiều file)' : ''}</p>
                          )}
                        </div>
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
                      </label>
                      {currentYcxFileName && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isMoiTab) {
                              setYcxFileNameMoi('');
                              setYcxDataMoi('');
                            } else {
                              setYcxFileName('');
                              setYcxData('');
                            }
                            setTimeout(() => {
                              saveRealtimeData(true);
                              showNotification(`Đã xoá dữ liệu YCX ${isMoiTab ? 'mới' : ''}`, 'success');
                            }, 100);
                          }}
                          className="ml-3 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 cursor-pointer border border-slate-100"
                          title={`Xoá dữ liệu YCX ${isMoiTab ? 'mới' : ''}`}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CHI TIẾT NGÀNH HÀNG - Drill-down table */}
                  <div className={`bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${isDrillFullscreen ? 'fixed inset-0 z-[9999] p-6 flex flex-col bg-white' : ''
                    }`}>
                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 border-b border-slate-100 bg-white">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3" id="chi-tiet-nganh-hang-title-block">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100">
                            <LayoutGrid size={20} />
                          </div>
                          <div>
                            <h3 className="text-[18px] font-black text-red-600 tracking-tight uppercase">
                              {compareMode !== 'none' ? 'SO SÁNH CÙNG KỲ' : 'CHI TIẾT NGÀNH HÀNG'}
                            </h3>
                            <p className="text-[11px] font-normal text-slate-500 uppercase tracking-wide">
                              THỐNG KÊ CHI TIẾT THEO NGÀNH HÀNG VÀ NHÓM HÀNG.
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-normal uppercase tracking-wider">
                              TRẠNG THÁI XUẤT: ĐÃ XUẤT | TỪ {minDateStr} ĐẾN {maxDateStr}
                            </p>
                          </div>
                        </div>

                        {/* Comparison period select & Layout group */}
                        <div className="flex items-center gap-3 no-capture">
                          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/60 rounded-xl p-1">
                            {([
                              { key: 'none', label: 'Mặc định' },
                              { key: 'day', label: 'Cùng ngày' },
                              { key: 'week', label: 'Cùng tuần' },
                              { key: 'month', label: 'Cùng tháng' },
                            ] as const).map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => setCompareMode(opt.key)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase ${compareMode === opt.key
                                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200/50'
                                  : 'text-slate-500 hover:text-slate-700'
                                  }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl p-1 bg-white shadow-sm">
                            <button className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center transition-all hover:bg-blue-100 cursor-pointer" title="Xem dạng lưới">
                              <LayoutGrid size={15} />
                            </button>
                            <button className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all hover:bg-slate-50 cursor-pointer" title="Bố cục cột">
                              <Columns size={15} />
                            </button>
                            <button className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all hover:bg-slate-50 cursor-pointer" title="Cấu hình hiển thị">
                              <Sliders size={15} />
                            </button>
                            <button
                              onClick={() => handleCaptureTable('chi-tiet-nganh-hang-capture-wrapper', 'chi_tiet_nganh_hang')}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all hover:bg-indigo-50 cursor-pointer"
                              title="Chụp ảnh bảng này (bao gồm tiêu đề)"
                            >
                              <Camera size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                      {compareMode !== 'none' && (
                        <div className="flex items-center gap-2 mb-3 text-[11px] no-capture">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold border border-indigo-100">📅 {currLabel}</span>
                          <span className="text-slate-400">vs</span>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold border border-slate-200">📅 {prevLabel}</span>
                          {drillDownDataPrev.length === 0 && (
                            <span className="text-rose-500 text-[10px] italic">⚠ Không có dữ liệu kỳ trước trong dataset</span>
                          )}
                        </div>
                      )}

                      {/* Filter bar - reference image style (hidden in capture) */}
                      <div ref={drillFilterBarRef} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 bg-white relative no-capture">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                          Cấu trúc hiển thị & lọc (kéo thả để sắp xếp):
                        </div>

                        {/* Level pills in the order of drillLevels */}
                        {(() => {
                          const configs: Record<string, {
                            key: string;
                            label: string;
                            icon: any;
                            bgActive: string;
                            bgInactive: string;
                            textActive: string;
                            textInactive: string;
                            filterActive: string;
                            filterInactive: string;
                            activeCount: number;
                            selected: string[];
                            options: { key: string; name: string }[];
                            toggleFn: (k: string) => void;
                            selectAll: () => void;
                            clearAll: () => void;
                          }> = {
                            kho: {
                              key: 'kho',
                              label: 'Kho',
                              icon: Store,
                              bgActive: 'bg-[#ceead6] border-[#137333]',
                              bgInactive: 'bg-[#e6f4ea] border-[#ceead6]',
                              textActive: 'text-[#137333]',
                              textInactive: 'text-[#137333]',
                              filterActive: 'text-[#137333]',
                              filterInactive: 'text-[#137333]/60',
                              activeCount: drillFilterStore.length,
                              selected: drillFilterStore,
                              options: availableOptions.stores,
                              toggleFn: (k) => setDrillFilterStore(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                              selectAll: () => setDrillFilterStore(availableOptions.stores.map(o => o.key)),
                              clearAll: () => setDrillFilterStore([]),
                            },
                            nganh: {
                              key: 'nganh',
                              label: 'Ngành',
                              icon: LayoutGrid,
                              bgActive: 'bg-[#fad2cf] border-[#c5221f]',
                              bgInactive: 'bg-[#fce8e6] border-[#fad2cf]',
                              textActive: 'text-[#c5221f]',
                              textInactive: 'text-[#c5221f]',
                              filterActive: 'text-[#c5221f]',
                              filterInactive: 'text-[#c5221f]/60',
                              activeCount: selectedDrillGroups.length,
                              selected: selectedDrillGroups,
                              options: availableOptions.nganhs,
                              toggleFn: (k) => setSelectedDrillGroups(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                              selectAll: () => setSelectedDrillGroups(availableOptions.nganhs.map(o => o.key)),
                              clearAll: () => setSelectedDrillGroups([]),
                            },
                            nhom: {
                              key: 'nhom',
                              label: 'Nhóm',
                              icon: LayoutGrid,
                              bgActive: 'bg-[#d2e3fc] border-[#1a73e8]',
                              bgInactive: 'bg-[#e8f0fe] border-[#d2e3fc]',
                              textActive: 'text-[#1a73e8]',
                              textInactive: 'text-[#1a73e8]',
                              filterActive: 'text-[#1a73e8]',
                              filterInactive: 'text-[#1a73e8]/60',
                              activeCount: drillFilterNhomSmall.length,
                              selected: drillFilterNhomSmall,
                              options: availableOptions.nhoms,
                              toggleFn: (k) => setDrillFilterNhomSmall(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                              selectAll: () => setDrillFilterNhomSmall(availableOptions.nhoms.map(o => o.key)),
                              clearAll: () => setDrillFilterNhomSmall([]),
                            },
                            hang: {
                              key: 'hang',
                              label: 'Hãng SX',
                              icon: Building2,
                              bgActive: 'bg-[#fbcce2] border-[#d0157a]',
                              bgInactive: 'bg-[#fdf0f5] border-[#fbcce2]',
                              textActive: 'text-[#d0157a]',
                              textInactive: 'text-[#d0157a]',
                              filterActive: 'text-[#d0157a]',
                              filterInactive: 'text-[#d0157a]/60',
                              activeCount: drillFilterBrand.length,
                              selected: drillFilterBrand,
                              options: availableOptions.brands,
                              toggleFn: (k) => setDrillFilterBrand(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                              selectAll: () => setDrillFilterBrand(availableOptions.brands.map(o => o.key)),
                              clearAll: () => setDrillFilterBrand([]),
                            },
                            nguoitao: {
                              key: 'nguoitao',
                              label: 'NV bán hàng',
                              icon: User,
                              bgActive: 'bg-[#feebc8] border-[#b06000]',
                              bgInactive: 'bg-[#fef7e0] border-[#feebc8]',
                              textActive: 'text-[#b06000]',
                              textInactive: 'text-[#b06000]',
                              filterActive: 'text-[#b06000]',
                              filterInactive: 'text-[#b06000]/60',
                              activeCount: drillFilterStaff.length,
                              selected: drillFilterStaff,
                              options: availableOptions.staffs,
                              toggleFn: (k) => setDrillFilterStaff(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                              selectAll: () => setDrillFilterStaff(availableOptions.staffs.map(o => o.key)),
                              clearAll: () => setDrillFilterStaff([]),
                            },
                            sanpham: {
                              key: 'sanpham',
                              label: 'Sản phẩm',
                              icon: Package,
                              bgActive: 'bg-[#e9d5ff] border-[#6b21a8]',
                              bgInactive: 'bg-[#f3e8ff] border-[#e9d5ff]',
                              textActive: 'text-[#6b21a8]',
                              textInactive: 'text-[#6b21a8]',
                              filterActive: 'text-[#6b21a8]',
                              filterInactive: 'text-[#6b21a8]/60',
                              activeCount: drillFilterProduct.length,
                              selected: drillFilterProduct,
                              options: availableOptions.products,
                              toggleFn: (k) => setDrillFilterProduct(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                              selectAll: () => setDrillFilterProduct(availableOptions.products.map(o => o.key)),
                              clearAll: () => setDrillFilterProduct([]),
                            },
                            trangthaisp: {
                              key: 'trangthaisp',
                              label: 'Trạng thái SP',
                              buttonLabel: drillFilterTrangThaiSP.length === 1 
                                ? (availableOptions.trangThaiSPs || []).find(o => o.key === drillFilterTrangThaiSP[0])?.name || 'Trạng thái SP'
                                : 'Trạng thái SP',
                              icon: Tag,
                              bgActive: 'bg-[#e2e8f0] border-[#475569]',
                              bgInactive: 'bg-[#f1f5f9] border-[#e2e8f0]',
                              textActive: 'text-[#475569]',
                              textInactive: 'text-[#475569]',
                              filterActive: 'text-[#475569]',
                              filterInactive: 'text-[#475569]/60',
                              activeCount: drillFilterTrangThaiSP.length,
                              selected: drillFilterTrangThaiSP,
                              options: availableOptions.trangThaiSPs || [],
                              toggleFn: (k) => setDrillFilterTrangThaiSP(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]),
                              selectAll: () => setDrillFilterTrangThaiSP((availableOptions.trangThaiSPs || []).map(o => o.key)),
                              clearAll: () => setDrillFilterTrangThaiSP([]),
                            },
                          };

                          return drillLevels.map((lvlKey, idx) => {
                            const level = configs[lvlKey];
                            if (!level) return null;
                            const IconComp = level.icon;
                            const isActive = level.activeCount > 0;
                            const isOpen = activeDrillFilter === level.key;
                            const filtered = level.options.filter(o =>
                              !drillFilterSearch || o.name.toLowerCase().includes(drillFilterSearch.toLowerCase())
                            );
                            const LIMIT = 100;
                            const displayed = filtered.slice(0, LIMIT);

                            return (
                              <div
                                key={level.key}
                                className="relative drill-filter-node"
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={() => handleDrop(idx)}
                              >
                                {/* Pill button */}
                                <button
                                  onClick={() => {
                                    setActiveDrillFilter(isOpen ? null : level.key);
                                    setDrillFilterSearch('');
                                  }}
                                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[13px] font-bold transition-all select-none whitespace-nowrap shadow-sm cursor-grab active:cursor-grabbing
                              ${isActive ? `${level.bgActive} ${level.textActive}` : `${level.bgInactive} ${level.textInactive} hover:border-slate-300`}`}
                                >
                                  <IconComp size={13} />
                                  <span>{level.buttonLabel || level.label}</span>
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
                                        className="text-[13px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                      >Chọn tất cả</button>
                                      <button
                                        onClick={() => { level.clearAll(); }}
                                        className="text-[13px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                                      >Bỏ chọn</button>
                                    </div>
                                    {/* Items list with toggle switch */}
                                    <div className="max-h-[280px] overflow-y-auto">
                                      {displayed.map(opt => {
                                        const isOn = level.selected.includes(opt.key);
                                        return (
                                          <button
                                            key={opt.key}
                                            onClick={() => level.toggleFn(opt.key)}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 cursor-pointer"
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
                                      {filtered.length > LIMIT && (
                                        <div className="px-4 py-3 bg-indigo-50 border-t border-slate-100 text-[11px] text-indigo-700 font-bold text-center leading-relaxed">
                                          💡 Hiển thị {LIMIT} / {filtered.length} kết quả.<br />Hãy nhập từ khóa để tìm kiếm chính xác hơn.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}

                        {/* Actions & Clear filters wrapper */}
                        <div className="ml-auto flex items-center gap-2">
                          {/* Clear filter */}
                          {(drillFilterStore.length > 0 || selectedDrillGroups.length > 0 || drillFilterNhomSmall.length > 0 || drillFilterBrand.length > 0 || drillFilterStaff.length > 0 || drillFilterProduct.length > 0 || drillFilterTrangThaiSP.length > 0) && (
                            <button
                              onClick={() => {
                                setDrillFilterStore([]);
                                setSelectedDrillGroups([]);
                                setDrillFilterNhomSmall([]);
                                setDrillFilterBrand([]);
                                setDrillFilterStaff([]);
                                setDrillFilterProduct([]);
                                setDrillFilterTrangThaiSP([]);
                                setActiveDrillFilter(null);
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 whitespace-nowrap cursor-pointer mr-2"
                            >
                              <RotateCcw size={11} /> Xóa bộ lọc
                            </button>
                          )}

                          {/* Divider */}
                          <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />

                          {/* Tree controls (Expand, Collapse, Fullscreen) */}
                          <div className="flex items-center gap-1.5 no-capture">
                            <button
                              onClick={handleExpandAll}
                              className="w-8 h-8 rounded-lg bg-[#e6f4ea] text-[#137333] hover:bg-[#d2ebd9] flex items-center justify-center transition-all cursor-pointer shadow-sm relative"
                              title="Mở rộng 1 cấp"
                            >
                              <ChevronsUpDown size={14} />
                              {drillExpandDepth > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#137333] text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white font-bold">
                                  {drillExpandDepth}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={handleCollapseAll}
                              className="w-8 h-8 rounded-lg bg-[#fef7e0] text-[#b06000] hover:bg-[#fde0a3] flex items-center justify-center transition-all cursor-pointer shadow-sm"
                              title="Thu gọn 1 cấp"
                            >
                              <ChevronsDownUp size={14} />
                            </button>
                            <button
                              onClick={() => setIsDrillFullscreen(!isDrillFullscreen)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                              title={isDrillFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                            >
                              {isDrillFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Capture wrapper: includes title + table, excludes filters */}
                    <div id="chi-tiet-nganh-hang-capture-wrapper" className="bg-white">
                    {/* Title block clone for capture (hidden on screen, visible in capture) */}
                    <div className="hidden capture-only-title px-6 py-4 bg-white border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100">
                          <LayoutGrid size={20} />
                        </div>
                        <div>
                          <h3 className="text-[18px] font-black text-red-600 tracking-tight uppercase">
                            {compareMode !== 'none' ? 'SO SÁNH CÙNG KỲ' : 'CHI TIẾT NGÀNH HÀNG'}
                          </h3>
                          <p className="text-[11px] font-normal text-slate-500 uppercase tracking-wide">
                            THỐNG KÊ CHI TIẾT THEO NGÀNH HÀNG VÀ NHÓM HÀNG.
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-normal uppercase tracking-wider">
                            TRẠNG THÁI XUẤT: ĐÃ XUẤT | TỪ {minDateStr} ĐẾN {maxDateStr}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className={`overflow-x-auto bg-white mobile-table-scroll ${isDrillFullscreen ? 'flex-1 mt-4' : ''}`} id="chi-tiet-nganh-hang-table-container">
                      <table className="w-full border-collapse border border-slate-200/50 [&_th]:border-r [&_th]:border-slate-200/50 [&_td]:border-r [&_td]:border-slate-200/50 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap responsive-data-table" style={{ borderSpacing: 0 }}>
                        <thead>
                          {compareMode === 'none' ? (
                            <>
                              <tr className={`bg-slate-50 border-b border-slate-200/50 text-slate-800 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black uppercase`}>
                                <th rowSpan={2} className="sticky-col sticky-col-1 py-2.5 px-4 text-left bg-slate-50 min-w-[240px] border-r border-slate-200/50 font-black align-middle">CHI TIẾT NGÀNH HÀNG</th>
                                <th colSpan={2} className={`py-1 px-4 text-center text-[#047857] bg-[#e6fbf4] border-r border-slate-200/50 font-black ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} border-b border-emerald-100`}>SỐ LƯỢNG</th>
                                <th colSpan={2} className={`py-1 px-4 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 font-black ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} border-b border-blue-100`}>DOANH THU</th>
                                <th rowSpan={2} className="py-2.5 px-4 text-center text-[#b45309] bg-[#fef3c7] border-r border-slate-200/50 w-28 font-black align-middle">DTQĐ</th>
                                <th rowSpan={2} className="py-2.5 px-4 text-center text-[#6b21a8] bg-[#f3e8ff] border-r border-slate-200/50 w-28 font-black align-middle">GIÁ TRỊ ĐH</th>
                                <th rowSpan={2} className="py-2.5 px-4 text-center text-[#be123c] bg-[#ffe4e6] w-28 font-black align-middle">TRẢ CHẬM</th>
                              </tr>
                              <tr className={`bg-slate-50 border-b border-slate-200/50 text-slate-800 ${isUser43751 ? 'text-[12.5px]' : 'text-[11px]'} font-black uppercase`}>
                                <th className="py-1 px-4 text-center text-[#047857] bg-[#e6fbf4] border-r border-slate-200/50 w-24 font-black">SL</th>
                                <th className="py-1 px-4 text-center text-[#047857] bg-[#e6fbf4] border-r border-slate-200/50 w-24 font-black">%SL</th>
                                <th className="py-1 px-4 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 w-28 font-black">DT ⬇</th>
                                <th className="py-1 px-4 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 w-24 font-black">%DT</th>
                              </tr>
                            </>
                          ) : (
                            <>
                              <tr className={`bg-slate-50 border-b border-slate-200/50 text-slate-800 ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black uppercase`}>
                                <th rowSpan={2} className="sticky-col sticky-col-1 py-2.5 px-4 text-left bg-slate-50 min-w-[240px] border-r border-slate-200/50 font-black align-middle">CHI TIẾT NGÀNH HÀNG</th>
                                <th colSpan={3} className="py-1 px-4 text-center text-[#047857] bg-[#e6fbf4] border-r border-slate-200/50 font-black border-b border-emerald-100">SỐ LƯỢNG</th>
                                <th colSpan={3} className="py-1 px-4 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 font-black border-b border-blue-100">DOANH THU</th>
                                <th colSpan={3} className="py-1 px-4 text-center text-[#b45309] bg-[#fef3c7] border-r border-slate-200/50 font-black border-b border-amber-100">DTQĐ</th>
                                <th colSpan={3} className="py-1 px-4 text-center text-[#6b21a8] bg-[#f3e8ff] border-r border-slate-200/50 font-black border-b border-purple-100">GIÁ TRỊ ĐH</th>
                                <th colSpan={3} className="py-1 px-4 text-center text-[#be123c] bg-[#ffe4e6] font-black border-b border-rose-100">TRẢ CHẬM</th>
                              </tr>
                              <tr className={`bg-slate-50 border-b border-slate-200/50 text-slate-800 ${isUser43751 ? 'text-[11.5px]' : 'text-[10px]'} font-black uppercase`}>
                                <th className="py-1 px-2 text-center text-[#047857] bg-[#e6fbf4] border-r border-slate-200/50 w-20 font-black">SL Kỳ này</th>
                                <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">{prevLabel}</th>
                                <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] border-r border-slate-200/50 w-16 font-black">+/-</th>

                                <th className="py-1 px-2 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 w-20 font-black">DT Kỳ này</th>
                                <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">{prevLabel}</th>
                                <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] border-r border-slate-200/50 w-16 font-black">+/-</th>

                                <th className="py-1 px-2 text-center text-[#b45309] bg-[#fef3c7] border-r border-slate-200/50 w-20 font-black">DTQĐ Kỳ này</th>
                                <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">{prevLabel}</th>
                                <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] border-r border-slate-200/50 w-16 font-black">+/-</th>

                                <th className="py-1 px-2 text-center text-[#6b21a8] bg-[#f3e8ff] border-r border-slate-200/50 w-20 font-black">GTĐH Kỳ này</th>
                                <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">{prevLabel}</th>
                                <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] border-r border-slate-200/50 w-16 font-black">+/-</th>

                                <th className="py-1 px-2 text-center text-[#be123c] bg-[#ffe4e6] border-r border-slate-200/50 w-20 font-black">Trả chậm</th>
                                <th className="py-1 px-2 text-center text-slate-400 bg-slate-50/50 border-r border-slate-200/50 w-20 font-black">{prevLabel}</th>
                                <th className="py-1 px-2 text-center text-rose-500 bg-[#ffe4e6] w-16 font-black">+/-</th>
                              </tr>
                            </>
                          )}
                        </thead>
                        <tbody>
                          {(() => {
                            if (flatRows.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={compareMode === 'none' ? 8 : 16} className="py-12 text-center text-slate-400 italic text-[13px]">
                                    {isLoadingRealtime ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu thỏa mãn điều kiện.'}
                                  </td>
                                </tr>
                              );
                            }

                            return flatRows.map((row: any) => {
                              const nodePrev = prevNodesMap.get(row.key);
                              const hasChildren = row.children && row.children.length > 0;
                              const isExpanded = expandedDrillRows[row.key] !== undefined
                                ? expandedDrillRows[row.key] === true
                                : row.depth < drillExpandDepth;

                              const slPct = totals.sl > 0 ? (row.sl / totals.sl) * 100 : 0;
                              const dtPct = totals.dt > 0 ? (row.dt / totals.dt) * 100 : 0;
                              const orderValue = row.sl > 0 ? (row.dt / 1000000) / row.sl : 0;
                              const tcPct = row.dt > 0 ? (row.tc_dt / row.dt) * 100 : 0;

                              let textClass = 'text-slate-800';
                              if (row.levelKey === 'nganh') {
                                textClass = 'text-[#e11d48] font-black';
                              } else if (row.levelKey === 'nhom') {
                                textClass = 'text-indigo-600 font-bold';
                              } else if (row.levelKey === 'hang') {
                                textClass = 'text-[#d0157a] font-bold';
                              } else if (row.levelKey === 'nguoitao') {
                                textClass = 'text-amber-600 font-bold';
                              } else {
                                textClass = 'text-slate-800 font-bold';
                              }

                              const prevOrderValue = nodePrev && nodePrev.sl > 0 ? (nodePrev.dt / 1000000) / nodePrev.sl : 0;
                              const prevTcPct = nodePrev && nodePrev.dt > 0 ? (nodePrev.tc_dt / nodePrev.dt) * 100 : 0;

                              return (
                                <tr key={row.key} className="group border-b border-slate-100/70 hover:bg-slate-50/80 transition-colors h-10">
                                  {/* Danh mục / Indented */}
                                  <td className="sticky-col sticky-col-1 bg-white group-hover:bg-slate-50/80 py-2 px-4 text-left border-r border-slate-200/50" style={{ paddingLeft: `${16 + row.depth * 20}px` }}>
                                    <div className="flex items-center">
                                      {hasChildren ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedDrillRows(prev => ({
                                              ...prev,
                                              [row.key]: !isExpanded
                                            }));
                                          }}
                                          className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 mr-1.5 transition-colors cursor-pointer shrink-0"
                                        >
                                          <ChevronRight size={14} className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>
                                      ) : (
                                        <div className="w-5 h-5 mr-1.5 shrink-0" />
                                      )}
                                      <span className={`${isUser43751 ? 'text-[14px]' : 'text-[13px]'} tracking-tight ${textClass}`}>{row.name}</span>
                                    </div>
                                  </td>

                                  {/* SL & %SL */}
                                  <td className={`py-2 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-slate-800 w-24 border-r border-slate-200/50`}>{row.sl === 0 ? '-' : row.sl.toLocaleString('vi-VN')}</td>
                                  {compareMode !== 'none' && (
                                    <>
                                      <td className={`py-2 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>
                                        {nodePrev ? nodePrev.sl.toLocaleString('vi-VN') : "-"}
                                      </td>
                                      <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                                        {nodePrev ? fmtDiff(row.sl, nodePrev.sl) : <span className="text-slate-300">-</span>}
                                      </td>
                                    </>
                                  )}
                                  {compareMode === 'none' && (
                                    <td className={`py-2 px-4 text-center ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black text-[#0f766e] w-24 border-r border-slate-200/50`}>{slPct.toFixed(0)}%</td>
                                  )}

                                  {/* DT & %DT */}
                                  <td className={`py-2 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black w-28 border-r border-slate-200/50 ${row.dt === 0 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>{fmtTr(row.dt)}</td>
                                  {compareMode !== 'none' && (
                                    <>
                                      <td className={`py-2 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>
                                        {nodePrev ? fmtTr(nodePrev.dt) : "-"}
                                      </td>
                                      <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                                        {nodePrev ? fmtDiff(row.dt, nodePrev.dt, true) : <span className="text-slate-300">-</span>}
                                      </td>
                                    </>
                                  )}
                                  {compareMode === 'none' && (
                                    <td className={`py-2 px-4 text-center ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black w-24 border-r border-slate-200/50 ${row.dt === 0 ? 'text-rose-600 font-black' : 'text-[#ea580c]'}`}>
                                      {row.dt > 0 ? `${dtPct.toFixed(0)}%` : '-'}
                                    </td>
                                  )}

                                  {/* DTQĐ */}
                                  <td className={`py-2 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black w-28 border-r border-slate-200/50 ${row.dtqd === 0 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>{fmtTr(row.dtqd)}</td>
                                  {compareMode !== 'none' && (
                                    <>
                                      <td className={`py-2 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>
                                        {nodePrev ? fmtTr(nodePrev.dtqd) : "-"}
                                      </td>
                                      <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                                        {nodePrev ? fmtDiff(row.dtqd, nodePrev.dtqd, true) : <span className="text-slate-300">-</span>}
                                      </td>
                                    </>
                                  )}

                                  {/* GIÁ TRỊ ĐH */}
                                  <td className={`py-2 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black w-28 border-r border-slate-200/50 ${orderValue < 1.0 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                                    {orderValue > 0 ? orderValue.toFixed(1) : '-'}
                                  </td>
                                  {compareMode !== 'none' && (
                                    <>
                                      <td className={`py-2 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>
                                        {nodePrev && prevOrderValue > 0 ? prevOrderValue.toFixed(1) : "-"}
                                      </td>
                                      <td className="py-2 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">
                                        {nodePrev ? fmtDiff(orderValue, prevOrderValue, false, 1) : <span className="text-slate-300">-</span>}
                                      </td>
                                    </>
                                  )}

                                  {/* TRẢ CHẬM */}
                                  <td className={`py-2 px-4 text-center ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black w-28 border-r border-slate-200/50 ${row.dt === 0 || row.tc_dt === 0
                                    ? 'text-rose-600 font-black'
                                    : tcPct >= 50
                                      ? 'text-[#047857]'
                                      : 'text-amber-500'
                                    }`}>
                                    {row.dt > 0 && row.tc_dt > 0 ? `${tcPct.toFixed(0)}%` : '-'}
                                  </td>
                                  {compareMode !== 'none' && (
                                    <>
                                      <td className={`py-2 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>
                                        {nodePrev && nodePrev.dt > 0 && nodePrev.tc_dt > 0 ? `${prevTcPct.toFixed(0)}%` : "-"}
                                      </td>
                                      <td className="py-2 px-2 text-center bg-slate-50/30">
                                        {nodePrev ? fmtDiff(row.tc_dt, nodePrev.tc_dt, true) : <span className="text-slate-300">-</span>}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            });
                          })()}

                          {/* Total Row */}
                          {flatRows.length > 0 && (() => {
                            const slTotal = totals.sl;
                            const dtTotal = totals.dt;
                            const tcTotal = totals.tc_dt;
                            const dtqdTotal = totals.dtqd;

                            const totalOrderValue = slTotal > 0 ? (dtTotal / 1000000) / slTotal : 0;
                            const totalTcPct = dtTotal > 0 ? (tcTotal / dtTotal) * 100 : 0;

                            let prevSlTotal = 0;
                            let prevDtTotal = 0;
                            let prevTcTotal = 0;
                            let prevDtqdTotal = 0;
                            drillDownDataPrev.forEach((node: any) => {
                              prevSlTotal += node.sl;
                              prevDtTotal += node.dt;
                              prevTcTotal += node.tc_dt;
                              prevDtqdTotal += node.dtqd;
                            });
                            const prevTotalOrderValue = prevSlTotal > 0 ? (prevDtTotal / 1000000) / prevSlTotal : 0;
                            const prevTotalTcPct = prevDtTotal > 0 ? (prevTcTotal / prevDtTotal) * 100 : 0;

                            if (compareMode === 'none') {
                              return (
                                <tr className="bg-[#ccfbf1]/80 border-t-2 border-teal-300 font-black text-slate-900 h-10 uppercase">
                                  <td className={`py-3 px-4 text-left ${isUser43751 ? 'text-[15px]' : 'text-[14px]'} text-teal-800 font-black pl-6 border-r border-slate-200/50`}>TỔNG</td>
                                  <td className={`py-3 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-slate-800 font-black border-r border-slate-200/50`}>{slTotal.toLocaleString('vi-VN')}</td>
                                  <td className={`py-3 px-4 text-center ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-[#0f766e] font-black border-r border-slate-200/50`}>100%</td>
                                  <td className={`py-3 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-slate-800 font-black border-r border-slate-200/50`}>{fmtTr(dtTotal)}</td>
                                  <td className={`py-3 px-4 text-center ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-[#ea580c] font-black border-r border-slate-200/50`}>100%</td>
                                  <td className={`py-3 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-slate-800 font-black border-r border-slate-200/50`}>{fmtTr(dtqdTotal)}</td>
                                  <td className={`py-3 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-slate-800 font-black border-r border-slate-200/50`}>{totalOrderValue > 0 ? totalOrderValue.toFixed(1) : '-'}</td>
                                  <td className={`py-3 px-4 text-center ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black ${totalTcPct >= 50 ? 'text-[#047857]' : totalTcPct > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {totalTcPct > 0 ? totalTcPct.toFixed(0) + '%' : '-'}
                                  </td>
                                </tr>
                              );
                            } else {
                              return (
                                <tr className="bg-[#ccfbf1]/80 border-t-2 border-teal-300 font-black text-slate-900 h-10 uppercase">
                                  <td className={`py-3 px-4 text-left ${isUser43751 ? 'text-[15px]' : 'text-[14px]'} text-teal-800 font-black pl-6 border-r border-slate-200/50`}>TỔNG</td>
                                  <td className={`py-3 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-slate-800 font-black border-r border-slate-200/50`}>{slTotal.toLocaleString('vi-VN')}</td>
                                  <td className={`py-3 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>{prevSlTotal.toLocaleString('vi-VN')}</td>
                                  <td className="py-3 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">{fmtDiff(slTotal, prevSlTotal)}</td>
                                  <td className={`py-3 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-slate-800 font-black border-r border-slate-200/50`}>{fmtTr(dtTotal)}</td>
                                  <td className={`py-3 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>{fmtTr(prevDtTotal)}</td>
                                  <td className="py-3 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">{fmtDiff(dtTotal, prevDtTotal, true)}</td>
                                  <td className={`py-3 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-slate-800 font-black border-r border-slate-200/50`}>{fmtTr(dtqdTotal)}</td>
                                  <td className={`py-3 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>{fmtTr(prevDtqdTotal)}</td>
                                  <td className="py-3 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">{fmtDiff(dtqdTotal, prevDtqdTotal, true)}</td>
                                  <td className={`py-3 px-4 text-right ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} text-slate-800 font-black border-r border-slate-200/50`}>{totalOrderValue > 0 ? totalOrderValue.toFixed(1) : '-'}</td>
                                  <td className={`py-3 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>{prevTotalOrderValue > 0 ? prevTotalOrderValue.toFixed(1) : "-"}</td>
                                  <td className="py-3 px-2 text-center bg-slate-50/30 border-r border-slate-200/50">{fmtDiff(totalOrderValue, prevTotalOrderValue, false, 1)}</td>
                                  <td className={`py-3 px-4 text-center ${isUser43751 ? 'text-[14.5px]' : 'text-[13px]'} font-black border-r border-slate-200/50 ${totalTcPct >= 50 ? 'text-[#047857]' : totalTcPct > 0 ? 'text-[#ea580c]' : 'text-rose-600'}`}>{totalTcPct > 0 ? totalTcPct.toFixed(0) + '%' : '-'}</td>
                                  <td className={`py-3 px-2 text-center bg-slate-50/50 ${isUser43751 ? 'text-[12px]' : 'text-[11px]'} font-black text-slate-400 border-r border-slate-200/50`}>{prevTotalTcPct > 0 ? prevTotalTcPct.toFixed(0) + '%' : "-"}</td>
                                  <td className="py-3 px-2 text-center bg-slate-50/30">{fmtDiff(tcTotal, prevTcTotal, true)}</td>
                                </tr>
                              );
                            }
                          })()}
                        </tbody>
                      </table>
                    </div>
                    </div>{/* close chi-tiet-nganh-hang-capture-wrapper */}
                  </div>

                  {/* PHÂN TÍCH KHAI THÁC - Menu Hiển thị & Bảng dữ liệu */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-6" id="phan-tich-khai-thac-card-container">
                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 font-bold border border-red-100">
                            <BarChart3 size={20} />
                          </div>
                          <div>
                            <h3 className="text-[18px] font-black text-red-600 tracking-tight uppercase">PHÂN TÍCH KHAI THÁC</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Chi tiết sản phẩm & hiệu quả bán kèm THEO USER BÁN HÀNG</p>
                          </div>
                        </div>
                        {/* Nút chụp ảnh */}
                        <button
                          onClick={() => handleCaptureTable('phan-tich-khai-thac-card-container', 'phan_tich_khai_thac')}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow-sm no-capture"
                          title="Chụp ảnh bảng này"
                        >
                          <Camera size={13} className="text-slate-500 hover:text-indigo-600" />
                          <span>Chụp ảnh</span>
                        </button>
                      </div>

                      {/* Filter bar - menu hiển thị */}
                      <div className="flex flex-col gap-3 bg-slate-50 rounded-xl px-5 py-4 no-capture">
                        <div className="flex flex-nowrap overflow-x-auto no-scrollbar items-center gap-2.5 pb-1">
                          <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1.5">
                            <Filter size={13} />
                            HIỂN THỊ:
                          </span>
                           {[
                            { key: 'doanhThu', label: 'DOANH THU', icon: '💰', activeBg: 'bg-blue-50', activeText: 'text-[#1d4ed8]', activeBorder: 'border-blue-300' },
                            { key: 'spChinh', label: 'SP CHÍNH', icon: '📱', activeBg: 'bg-emerald-50', activeText: 'text-[#047857]', activeBorder: 'border-emerald-300' },
                            { key: 'smartphone', label: 'SMARTPHONE', icon: '📲', activeBg: 'bg-yellow-50', activeText: 'text-yellow-700', activeBorder: 'border-yellow-300' },
                            { key: 'baoHiem', label: 'VAS', icon: '🛡️', activeBg: 'bg-rose-50', activeText: 'text-[#be123c]', activeBorder: 'border-rose-300' },
                            { key: 'sim', label: 'SIM', icon: '📡', activeBg: 'bg-amber-50', activeText: 'text-[#b45309]', activeBorder: 'border-amber-300' },
                            { key: 'dongHo', label: 'ĐỒNG HỒ', icon: '⌚', activeBg: 'bg-purple-50', activeText: 'text-[#6b21a8]', activeBorder: 'border-purple-300' },
                            { key: 'phuKien', label: 'PHỤ KIỆN', icon: '🎧', activeBg: 'bg-rose-50', activeText: 'text-[#be123c]', activeBorder: 'border-rose-300' },
                            { key: 'giaDung', label: 'GIA DỤNG', icon: '🏠', activeBg: 'bg-cyan-50', activeText: 'text-[#0e7490]', activeBorder: 'border-cyan-300' }
                          ].map(btn => {
                            const isActive = showKhaiThacCols[btn.key as keyof typeof showKhaiThacCols];
                            return (
                              <button
                                key={btn.key}
                                onClick={() => handleToggleKhaiThacCol(btn.key, !isActive)}
                                className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all border whitespace-nowrap flex items-center gap-1.5 ${isActive
                                  ? `${btn.activeBg} ${btn.activeText} ${btn.activeBorder} shadow-sm`
                                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                                  }`}
                              >
                                <span className="text-[14px]">{btn.icon}</span>
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex flex-col gap-2.5 pl-[90px]">
                          {showKhaiThacCols.doanhThu && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black text-[#1d4ed8] w-20 flex items-center gap-1">💰 DOANH THU:</span>
                              {[
                                { key: 'target', label: 'TARGET' },
                                { key: 'pctHt', label: '%HT' }
                              ].map(btn => {
                                const isActive = showKhaiThacCols[btn.key as keyof typeof showKhaiThacCols] ?? false;
                                return (
                                  <button
                                    key={btn.key}
                                    onClick={() => handleToggleKhaiThacCol(btn.key, !isActive)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${isActive
                                      ? 'bg-blue-50 text-[#1d4ed8] border-blue-200 shadow-sm'
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                                      }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {showKhaiThacCols.spChinh && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black text-[#047857] w-20 flex items-center gap-1">📱 SP CHÍNH:</span>
                              {[
                                { key: 'spcSmf', label: 'SMF' },
                                { key: 'spcLap', label: 'LAP' },
                                { key: 'spcTab', label: 'TABLET' },
                                { key: 'spcTivi', label: 'TIVI' },
                                { key: 'spcMl', label: 'ML' },
                                { key: 'spcTl', label: 'TL,TĐ,TM' },
                                { key: 'spcMg', label: 'MG,MS,MRC' }
                              ].map(btn => {
                                const isActive = showKhaiThacCols[btn.key as keyof typeof showKhaiThacCols];
                                return (
                                  <button
                                    key={btn.key}
                                    onClick={() => handleToggleKhaiThacCol(btn.key, !isActive)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${isActive
                                      ? 'bg-emerald-50 text-[#047857] border-emerald-200 shadow-sm'
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                                      }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {showKhaiThacCols.smartphone && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black text-yellow-700 w-20 flex items-center gap-1">📲 SMARTPHONE:</span>
                              {[
                                { key: 'smfIphone', label: 'IPHONE' },
                                { key: 'smfSamsung', label: 'SAMSUNG' },
                                { key: 'smfOppo', label: 'OPPO' },
                                { key: 'smfVivo', label: 'VIVO' },
                                { key: 'smfRealme', label: 'REALME' },
                                { key: 'smfXiaomi', label: 'XIAOMI' },
                                { key: 'smfHonor', label: 'HONOR' },
                                { key: 'smfMotorola', label: 'MOTOROLA' }
                              ].map(btn => {
                                const isActive = showKhaiThacCols[btn.key as keyof typeof showKhaiThacCols];
                                return (
                                  <button
                                    key={btn.key}
                                    onClick={() => handleToggleKhaiThacCol(btn.key, !isActive)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${isActive
                                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm'
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                                      }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {showKhaiThacCols.baoHiem && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black text-[#be123c] w-20 flex items-center gap-1">🛡️ VAS:</span>
                              {[
                                { key: 'vasBh', label: 'SL B.HIỂM' },
                                { key: 'vasVieon', label: 'SL VIEON' },
                                { key: 'vasMangoIcall', label: 'SL Mango/Icall' }
                              ].map(btn => {
                                const isActive = showKhaiThacCols[btn.key as keyof typeof showKhaiThacCols];
                                return (
                                  <button
                                    key={btn.key}
                                    onClick={() => handleToggleKhaiThacCol(btn.key, !isActive)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${isActive
                                      ? 'bg-rose-50 text-[#be123c] border-rose-200 shadow-sm'
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                                      }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {showKhaiThacCols.phuKien && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black text-[#be123c] w-20 flex items-center gap-1">🎧 PHỤ KIỆN:</span>
                              {[
                                { key: 'pkCam', label: 'SL CÁP/SẠC' },
                                { key: 'pkLoa', label: 'SL LOA' },
                                { key: 'pkPin', label: 'SL PIN' },
                                { key: 'pkTn', label: 'SL TAI NGHE' },
                                { key: 'pkDenMt', label: 'SL ĐÈN MT' }
                              ].map(btn => {
                                const isActive = showKhaiThacCols[btn.key as keyof typeof showKhaiThacCols];
                                return (
                                  <button
                                    key={btn.key}
                                    onClick={() => handleToggleKhaiThacCol(btn.key, !isActive)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${isActive
                                      ? 'bg-rose-50 text-[#be123c] border-rose-200 shadow-sm'
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                                      }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {showKhaiThacCols.giaDung && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black text-[#0e7490] w-20 flex items-center gap-1">🏠 GIA DỤNG:</span>
                              {[
                                { key: 'gdMln', label: 'SL MLN' },
                                { key: 'gdNcom', label: 'SL NCƠM' },
                                { key: 'gdNchien', label: 'SL NCHIÊN' },
                                { key: 'gdQuat', label: 'SL Q.GIÓ' },
                                { key: 'gdQdh', label: 'SL QĐH' }
                              ].map(btn => {
                                const isActive = showKhaiThacCols[btn.key as keyof typeof showKhaiThacCols];
                                return (
                                  <button
                                    key={btn.key}
                                    onClick={() => handleToggleKhaiThacCol(btn.key, !isActive)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${isActive
                                      ? 'bg-cyan-50 text-[#0e7490] border-cyan-200 shadow-sm'
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                                      }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto bg-white mobile-table-scroll" id="phan-tich-khai-thac-table-container">
                      <table className="w-full border-collapse border border-slate-200/50 [&_th]:border-r [&_th]:border-slate-200/50 [&_td]:border-r [&_td]:border-slate-200/50 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_tr>th:last-child]:border-r-0 [&_tr>td:last-child]:border-r-0 responsive-data-table" style={{ borderSpacing: 0 }}>
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-800 text-[13px] font-black uppercase">
                            <th
                              rowSpan={2}
                              onClick={() => handleKhaiThacSort('staffName')}
                              className="sticky-col sticky-col-1 py-2.5 px-4 text-left bg-slate-50 min-w-[200px] border-r border-slate-200/50 font-black align-middle cursor-pointer select-none hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-0.5">
                                <span>NHÂN VIÊN</span>
                                <span className={`text-[10px] ${khaiThacSortField === 'staffName' ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
                                  {khaiThacSortField === 'staffName' ? (khaiThacSortAsc ? '▲' : '▼') : '⇅'}
                                </span>
                              </div>
                            </th>
                            {showKhaiThacCols.doanhThu && (
                              <th colSpan={5 + (showKhaiThacCols.target ? 1 : 0) + (showKhaiThacCols.pctHt ? 1 : 0)} className="py-1 px-3 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 font-black text-[13px] border-b border-blue-100">DOANH THU</th>
                            )}
                            {showKhaiThacCols.spChinh && (
                              <th colSpan={1 + (showKhaiThacCols.spcSmf ? 1 : 0) + (showKhaiThacCols.spcLap ? 1 : 0) + (showKhaiThacCols.spcTab ? 1 : 0) + (showKhaiThacCols.spcTivi ? 1 : 0) + (showKhaiThacCols.spcMl ? 1 : 0) + (showKhaiThacCols.spcTl ? 1 : 0) + (showKhaiThacCols.spcMg ? 1 : 0)} className="py-1 px-3 text-center text-[#047857] bg-[#e6fbf4] border-r border-slate-200/50 font-black text-[13px] border-b border-emerald-100">SP CHÍNH</th>
                            )}
                            {showKhaiThacCols.smartphone && (
                              <th colSpan={(showKhaiThacCols.smfIphone ? 1 : 0) + (showKhaiThacCols.smfSamsung ? 1 : 0) + (showKhaiThacCols.smfOppo ? 1 : 0) + (showKhaiThacCols.smfVivo ? 1 : 0) + (showKhaiThacCols.smfRealme ? 1 : 0) + (showKhaiThacCols.smfXiaomi ? 1 : 0) + (showKhaiThacCols.smfHonor ? 1 : 0) + (showKhaiThacCols.smfMotorola ? 1 : 0)} className="py-1 px-3 text-center text-yellow-700 bg-yellow-50 border-r border-slate-200/50 font-black text-[13px] border-b border-yellow-100">SMARTPHONE</th>
                            )}
                            {(showKhaiThacCols.baoHiem || showKhaiThacCols.sim) && (
                              <th
                                colSpan={
                                  (showKhaiThacCols.sim ? 1 : 0) +
                                  (showKhaiThacCols.baoHiem ? (
                                    (showKhaiThacCols.vasBh ? 1 : 0) +
                                    (showKhaiThacCols.vasVieon ? 1 : 0) +
                                    (showKhaiThacCols.vasMangoIcall ? 1 : 0)
                                  ) : 0)
                                }
                                className="py-1 px-3 text-center text-[#be123c] bg-[#ffe4e6] border-r border-slate-200/50 font-black text-[13px] border-b border-rose-100"
                              >
                                DỊCH VỤ
                              </th>
                            )}
                            {showKhaiThacCols.dongHo && (
                              <th colSpan={2} className="py-1 px-3 text-center text-[#6b21a8] bg-[#f3e8ff] border-r border-slate-200/50 font-black text-[13px] border-b border-purple-100">ĐỒNG HỒ</th>
                            )}
                            {showKhaiThacCols.phuKien && (
                              <th colSpan={(showKhaiThacCols.pkCam ? 1 : 0) + (showKhaiThacCols.pkLoa ? 1 : 0) + (showKhaiThacCols.pkPin ? 1 : 0) + (showKhaiThacCols.pkTn ? 1 : 0) + (showKhaiThacCols.pkDenMt ? 1 : 0)} className="py-1 px-3 text-center text-[#be123c] bg-[#ffe4e6] border-r border-slate-200/50 font-black text-[13px] border-b border-rose-100">PHỤ KIỆN</th>
                            )}
                            {showKhaiThacCols.giaDung && (
                              <th colSpan={(showKhaiThacCols.gdMln ? 1 : 0) + (showKhaiThacCols.gdNcom ? 1 : 0) + (showKhaiThacCols.gdNchien ? 1 : 0) + (showKhaiThacCols.gdQuat ? 1 : 0) + (showKhaiThacCols.gdQdh ? 1 : 0)} className="py-1 px-3 text-center text-[#0e7490] bg-[#ecfeff] border-r border-slate-200/50 font-black text-[13px] border-b border-cyan-100">GIA DỤNG</th>
                            )}
                          </tr>
                          <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-800 text-[11px] font-black uppercase">
                            {showKhaiThacCols.doanhThu && (
                              <>
                                {showKhaiThacCols.target && (
                                  <th className="py-1.5 px-2 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 w-20 cursor-pointer">TARGET</th>
                                )}
                                {renderKhaiThacHeader('dtThuc', 'DT THỰC', 'text-[#1d4ed8]', 'bg-[#eff6ff]', 'w-20')}
                                {renderKhaiThacHeader('dtqd', 'DTQĐ', 'text-[#1d4ed8]', 'bg-[#eff6ff]', 'w-20')}
                                {showKhaiThacCols.pctHt && (
                                  <th className="py-1.5 px-2 text-center text-[#1d4ed8] bg-[#eff6ff] border-r border-slate-200/50 w-20 cursor-pointer">%HT</th>
                                )}
                                {renderKhaiThacHeader('hqqd', 'HQQĐ', 'text-[#1d4ed8]', 'bg-[#eff6ff]', 'w-20')}
                                {renderKhaiThacHeader('dtTraGop', 'DT T.GÓP', 'text-[#1d4ed8]', 'bg-[#eff6ff]', 'w-20')}
                                {renderKhaiThacHeader('tc', '%TC', 'text-[#1d4ed8]', 'bg-[#eff6ff]', 'w-20')}
                              </>
                            )}
                            {/* SP CHÍNH Sub Headers */}
                            {showKhaiThacCols.spChinh && (
                              <>
                                {showKhaiThacCols.spcSmf && renderKhaiThacHeader('spcSmfQty', 'SMF', 'text-[#047857]', 'bg-[#e6fbf4]', 'w-14')}
                                {showKhaiThacCols.spcLap && renderKhaiThacHeader('spcLapQty', 'LAP', 'text-[#047857]', 'bg-[#e6fbf4]', 'w-14')}
                                {showKhaiThacCols.spcTab && renderKhaiThacHeader('spcTabQty', 'TABLET', 'text-[#047857]', 'bg-[#e6fbf4]', 'w-16')}
                                {showKhaiThacCols.spcTivi && renderKhaiThacHeader('spcTiviQty', 'TIVI', 'text-[#047857]', 'bg-[#e6fbf4]', 'w-14')}
                                {showKhaiThacCols.spcMl && renderKhaiThacHeader('spcMlQty', 'ML', 'text-[#047857]', 'bg-[#e6fbf4]', 'w-14')}
                                {showKhaiThacCols.spcTl && renderKhaiThacHeader('spcTlQty', 'TL,TĐ,TM', 'text-[#047857]', 'bg-[#e6fbf4]', 'w-16')}
                                {showKhaiThacCols.spcMg && renderKhaiThacHeader('spcMgQty', 'MG,MS,MRC', 'text-[#047857]', 'bg-[#e6fbf4]', 'w-16')}
                                {renderKhaiThacHeader('spChinhTotalQty', 'TỔNG', 'text-[#047857]', 'bg-[#e6fbf4]', 'w-16')}
                              </>
                            )}
                            {/* SMARTPHONE Sub Headers */}
                            {showKhaiThacCols.smartphone && (
                              <>
                                {showKhaiThacCols.smfIphone && renderKhaiThacHeader('smfIphoneQty', 'IPHONE', 'text-yellow-700', 'bg-yellow-50', 'w-16')}
                                {showKhaiThacCols.smfSamsung && renderKhaiThacHeader('smfSamsungQty', 'SAMSUNG', 'text-yellow-700', 'bg-yellow-50', 'w-16')}
                                {showKhaiThacCols.smfOppo && renderKhaiThacHeader('smfOppoQty', 'OPPO', 'text-yellow-700', 'bg-yellow-50', 'w-14')}
                                {showKhaiThacCols.smfVivo && renderKhaiThacHeader('smfVivoQty', 'VIVO', 'text-yellow-700', 'bg-yellow-50', 'w-14')}
                                {showKhaiThacCols.smfRealme && renderKhaiThacHeader('smfRealmeQty', 'REALME', 'text-yellow-700', 'bg-yellow-50', 'w-16')}
                                {showKhaiThacCols.smfXiaomi && renderKhaiThacHeader('smfXiaomiQty', 'XIAOMI', 'text-yellow-700', 'bg-yellow-50', 'w-16')}
                                {showKhaiThacCols.smfHonor && renderKhaiThacHeader('smfHonorQty', 'HONOR', 'text-yellow-700', 'bg-yellow-50', 'w-16')}
                                {showKhaiThacCols.smfMotorola && renderKhaiThacHeader('smfMotorolaQty', 'MOTOROLA', 'text-yellow-700', 'bg-yellow-50', 'w-16')}
                              </>
                            )}
                            {/* DỊCH VỤ Sub Headers */}
                            {(showKhaiThacCols.sim || showKhaiThacCols.baoHiem) && (
                              <>
                                {showKhaiThacCols.sim && renderKhaiThacHeader('simQty', 'SL SIM', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-14')}
                                {showKhaiThacCols.baoHiem && (
                                  <>
                                    {showKhaiThacCols.vasBh && renderKhaiThacHeader('bhQty', 'SL B.HIỂM', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-14')}
                                    {showKhaiThacCols.vasVieon && renderKhaiThacHeader('vieonQty', 'SL VIEON', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-14')}
                                    {showKhaiThacCols.vasMangoIcall && renderKhaiThacHeader('mangoIcallQty', 'SL Mango/Icall', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-24')}
                                  </>
                                )}
                              </>
                            )}
                            {/* ĐỒNG HỒ Sub Headers */}
                            {showKhaiThacCols.dongHo && (
                              <>
                                {renderKhaiThacHeader('dhDhttQty', 'SL ĐHTT', 'text-[#6b21a8]', 'bg-[#f3e8ff]', 'w-16')}
                                {renderKhaiThacHeader('dhWearQty', 'SL WEAR', 'text-[#6b21a8]', 'bg-[#f3e8ff]', 'w-16')}
                              </>
                            )}
                            {/* PHỤ KIỆN Sub Headers */}
                            {showKhaiThacCols.phuKien && (
                              <>
                                {showKhaiThacCols.pkCam && renderKhaiThacHeader('pkCamQty', 'SL CAM', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-14')}
                                {showKhaiThacCols.pkLoa && renderKhaiThacHeader('pkLoaQty', 'SL LOA', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-14')}
                                {showKhaiThacCols.pkPin && renderKhaiThacHeader('pkPinQty', 'SL PIN', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-14')}
                                {showKhaiThacCols.pkTn && renderKhaiThacHeader('pkTnQty', 'SL TNGHE', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-14')}
                                {showKhaiThacCols.pkDenMt && renderKhaiThacHeader('pkDenMtQty', 'SL ĐÈN MT', 'text-[#be123c]', 'bg-[#ffe4e6]', 'w-16')}
                              </>
                            )}
                            {/* GIA DỤNG Sub Headers */}
                            {showKhaiThacCols.giaDung && (
                              <>
                                {showKhaiThacCols.gdMln && renderKhaiThacHeader('gdMlnQty', 'SL MLN', 'text-[#0e7490]', 'bg-[#ecfeff]', 'w-16')}
                                {showKhaiThacCols.gdNcom && renderKhaiThacHeader('gdNcomQty', 'SL NCƠM', 'text-[#0e7490]', 'bg-[#ecfeff]', 'w-18')}
                                {showKhaiThacCols.gdNchien && renderKhaiThacHeader('gdNchienQty', 'SL NCHIÊN', 'text-[#0e7490]', 'bg-[#ecfeff]', 'w-20')}
                                {showKhaiThacCols.gdQuat && renderKhaiThacHeader('gdQuatQty', 'SL Q.GIÓ', 'text-[#0e7490]', 'bg-[#ecfeff]', 'w-16')}
                                {showKhaiThacCols.gdQdh && renderKhaiThacHeader('gdQdhQty', 'SL QĐH', 'text-[#0e7490]', 'bg-[#ecfeff]', 'w-16')}
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const getVisibleSpChinhQty = (item: any) => {
                              return (showKhaiThacCols.spcSmf ? item.spcSmfQty : 0) +
                                (showKhaiThacCols.spcLap ? item.spcLapQty : 0) +
                                (showKhaiThacCols.spcTab ? item.spcTabQty : 0) +
                                (showKhaiThacCols.spcTivi ? item.spcTiviQty : 0) +
                                (showKhaiThacCols.spcMl ? item.spcMlQty : 0) +
                                (showKhaiThacCols.spcTl ? item.spcTlQty : 0) +
                                (showKhaiThacCols.spcMg ? item.spcMgQty : 0);
                            };
                            const formatVal = (val: number) => val === 0 ? <span className="text-slate-300">-</span> : val;
                            const formatRev = (val: number) => {
                              if (val === 0) return <span className="text-slate-300">-</span>;
                              if (val >= 1_000_000) {
                                const m = val / 1_000_000;
                                if (m >= 1000) {
                                  return `${Math.round(m).toLocaleString('en-US')} Tỷ`;
                                }
                                return `${m % 1 === 0 ? m : m.toFixed(1)} Tr`;
                              }
                              if (val >= 1_000) {
                                return `${Math.round(val / 1_000)} K`;
                              }
                              return val.toLocaleString('vi-VN');
                            };
                            const renderPct = (num: number, den: number, colorClass = 'text-[#be123c]') => {
                              if (den === 0 || num === 0) {
                                return (
                                  <span className="text-slate-300">-</span>
                                );
                              }
                              const pct = Math.round((num / den) * 100);
                              return (
                                <span className={`${colorClass} font-black text-[13px]`}>
                                  {pct}%
                                </span>
                              );
                            };
                            const renderHqqd = (val: number) => {
                              if (val === 0) {
                                return (
                                  <span className="text-slate-300">-</span>
                                );
                              }
                              const colorClass = val < 45 ? 'text-red-600' : 'text-emerald-600';
                              return (
                                <span className={`${colorClass} font-black text-[13px]`}>
                                  {val}%
                                </span>
                              );
                            };
                            const renderTcPct = (tc: number, total: number) => {
                              if (total === 0 || tc === 0) {
                                return (
                                  <span className="text-slate-300">-</span>
                                );
                              }
                              const pct = Math.round((tc / total) * 100);
                              const colorClass = pct < 60 ? 'text-red-600' : 'text-emerald-600';
                              return (
                                <span className={`${colorClass} font-black text-[13px]`}>
                                  {pct}%
                                </span>
                              );
                            };

                            const totalStaffCount = staffKhaiThacStats.length;
                            const targetPerPerson = totalStaffCount > 0 && ssgTbConLai > 0 ? ssgTbConLai / totalStaffCount : 0;
                            const top20Idx = Math.max(1, Math.ceil(totalStaffCount * 0.2));
                            const bot20Idx = totalStaffCount - Math.max(1, Math.ceil(totalStaffCount * 0.2));
                            const getStaffIcon = (idx: number) => {
                              if (idx === 0) return '🥇';
                              if (idx === 1) return '🥈';
                              if (idx === 2) return '🥉';
                              if (idx < top20Idx) return '🏅';
                              if (idx >= bot20Idx) return '⚠️';
                              return `#${idx + 1}`;
                            };
                            return staffKhaiThacStats.length > 0 ? staffKhaiThacStats.map((item, idx) => {
                              const visibleSpChinhTotalQty = getVisibleSpChinhQty(item);

                              return (
                                <tr key={item.staffName} className="group border-b border-slate-100/70 hover:bg-slate-50/80 transition-colors h-10">
                                  <td className="sticky-col sticky-col-1 bg-white group-hover:bg-slate-50/80 py-2 px-4 text-left font-black text-slate-800 border-r border-slate-200/50">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black ${idx < 3 ? 'text-[18px]' : 'text-[13px]'}`}>
                                        {getStaffIcon(idx)}
                                      </span>
                                      <span>{item.staffName}</span>
                                    </div>
                                  </td>
                                  {/* DOANH THU Cells */}
                                  {showKhaiThacCols.doanhThu && (
                                    <>
                                      {showKhaiThacCols.target && (
                                        <td className="py-2 px-2 text-center text-[13px] font-black text-[#7c3aed] bg-[#f5f3ff]/40 border-r border-slate-200/50">{targetPerPerson > 0 ? formatRev(targetPerPerson * 1_000_000) : '-'}</td>
                                      )}
                                      <td className="py-2 px-2 text-center text-[13px] font-black text-[#1d4ed8] border-r border-slate-200/50">{formatRev(item.dtThuc)}</td>
                                      <td className="py-2 px-2 text-center text-[13px] font-black text-[#1d4ed8] border-r border-slate-200/50">{formatRev(item.dtqd)}</td>
                                      {showKhaiThacCols.pctHt && (
                                        <td className="py-2 px-2 text-center text-[13px] font-black bg-[#f5f3ff]/30 border-r border-slate-200/50">
                                          {(() => {
                                            if (targetPerPerson <= 0 || item.dtqd <= 0) return <span className="text-slate-400">-</span>;
                                            const targetRaw = targetPerPerson * 1_000_000; // convert triệu → đồng
                                            const pctHT = Math.round((item.dtqd / targetRaw) * 100);
                                            return <span className={`${pctHT >= 100 ? 'text-emerald-600' : 'text-[#7c3aed]'} font-black`}>{pctHT}%</span>;
                                          })()}
                                        </td>
                                      )}
                                      <td className="py-2 px-2 text-center border-r border-slate-200/50">{renderHqqd(item.hqqd)}</td>
                                      <td className="py-2 px-2 text-center text-[13px] font-black text-[#1d4ed8] border-r border-slate-200/50">{formatRev(item.dtTraGop)}</td>
                                      <td className="py-2 px-2 text-center border-r border-slate-200/50">{renderTcPct(item.dtTraGop, item.dtThuc)}</td>
                                    </>
                                  )}
                                  {/* SP CHÍNH Cells */}
                                  {showKhaiThacCols.spChinh && (
                                    <>
                                      {showKhaiThacCols.spcSmf && <td className="py-2 px-2 text-center text-[13px] font-black text-[#047857] border-r border-slate-200/50">{formatVal(item.spcSmfQty)}</td>}
                                      {showKhaiThacCols.spcLap && <td className="py-2 px-2 text-center text-[13px] font-black text-[#047857] border-r border-slate-200/50">{formatVal(item.spcLapQty)}</td>}
                                      {showKhaiThacCols.spcTab && <td className="py-2 px-2 text-center text-[13px] font-black text-[#047857] border-r border-slate-200/50">{formatVal(item.spcTabQty)}</td>}
                                      {showKhaiThacCols.spcTivi && <td className="py-2 px-2 text-center text-[13px] font-black text-[#047857] border-r border-slate-200/50">{formatVal(item.spcTiviQty)}</td>}
                                      {showKhaiThacCols.spcMl && <td className="py-2 px-2 text-center text-[13px] font-black text-[#047857] border-r border-slate-200/50">{formatVal(item.spcMlQty)}</td>}
                                      {showKhaiThacCols.spcTl && <td className="py-2 px-2 text-center text-[13px] font-black text-[#047857] border-r border-slate-200/50">{formatVal(item.spcTlQty)}</td>}
                                      {showKhaiThacCols.spcMg && <td className="py-2 px-2 text-center text-[13px] font-black text-[#047857] border-r border-slate-200/50">{formatVal(item.spcMgQty)}</td>}
                                      <td className="py-2 px-2 text-center text-[13px] font-black text-[#047857] bg-[#e6fbf4]/20 border-r border-slate-200/50">{formatVal(visibleSpChinhTotalQty)}</td>
                                    </>
                                  )}
                                  {/* SMARTPHONE Cells */}
                                  {showKhaiThacCols.smartphone && (
                                    <>
                                      {showKhaiThacCols.smfIphone && <td className="py-2 px-2 text-center text-[13px] font-black text-yellow-700 border-r border-slate-200/50">{formatVal(item.smfIphoneQty)}</td>}
                                      {showKhaiThacCols.smfSamsung && <td className="py-2 px-2 text-center text-[13px] font-black text-yellow-700 border-r border-slate-200/50">{formatVal(item.smfSamsungQty)}</td>}
                                      {showKhaiThacCols.smfOppo && <td className="py-2 px-2 text-center text-[13px] font-black text-yellow-700 border-r border-slate-200/50">{formatVal(item.smfOppoQty)}</td>}
                                      {showKhaiThacCols.smfVivo && <td className="py-2 px-2 text-center text-[13px] font-black text-yellow-700 border-r border-slate-200/50">{formatVal(item.smfVivoQty)}</td>}
                                      {showKhaiThacCols.smfRealme && <td className="py-2 px-2 text-center text-[13px] font-black text-yellow-700 border-r border-slate-200/50">{formatVal(item.smfRealmeQty)}</td>}
                                      {showKhaiThacCols.smfXiaomi && <td className="py-2 px-2 text-center text-[13px] font-black text-yellow-700 border-r border-slate-200/50">{formatVal(item.smfXiaomiQty)}</td>}
                                      {showKhaiThacCols.smfHonor && <td className="py-2 px-2 text-center text-[13px] font-black text-yellow-700 border-r border-slate-200/50">{formatVal(item.smfHonorQty)}</td>}
                                      {showKhaiThacCols.smfMotorola && <td className="py-2 px-2 text-center text-[13px] font-black text-yellow-700 border-r border-slate-200/50">{formatVal(item.smfMotorolaQty)}</td>}
                                    </>
                                  )}
                                  {/* DỊCH VỤ Cells */}
                                  {(showKhaiThacCols.sim || showKhaiThacCols.baoHiem) && (
                                    <>
                                      {showKhaiThacCols.sim && (
                                        <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.simQty)}</td>
                                      )}
                                      {showKhaiThacCols.baoHiem && (
                                        <>
                                          {showKhaiThacCols.vasBh && <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.bhQty)}</td>}
                                          {showKhaiThacCols.vasVieon && <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.vieonQty)}</td>}
                                          {showKhaiThacCols.vasMangoIcall && <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.mangoIcallQty)}</td>}
                                        </>
                                      )}
                                    </>
                                  )}
                                  {/* ĐỒNG HỒ Cells */}
                                  {showKhaiThacCols.dongHo && (
                                    <>
                                      <td className="py-2 px-2 text-center text-[13px] font-black text-[#6b21a8] border-r border-slate-200/50">{formatVal(item.dhDhttQty)}</td>
                                      <td className="py-2 px-2 text-center text-[13px] font-black text-[#6b21a8] border-r border-slate-200/50">{formatVal(item.dhWearQty)}</td>
                                    </>
                                  )}
                                  {/* PHỤ KIỆN Cells */}
                                  {showKhaiThacCols.phuKien && (
                                    <>
                                      {showKhaiThacCols.pkCam && <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.pkCamQty)}</td>}
                                      {showKhaiThacCols.pkLoa && <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.pkLoaQty)}</td>}
                                      {showKhaiThacCols.pkPin && <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.pkPinQty)}</td>}
                                      {showKhaiThacCols.pkTn && <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.pkTnQty)}</td>}
                                      {showKhaiThacCols.pkDenMt && <td className="py-2 px-2 text-center text-[13px] font-black text-[#be123c] border-r border-slate-200/50">{formatVal(item.pkDenMtQty)}</td>}
                                    </>
                                  )}
                                  {/* GIA DỤNG Cells */}
                                  {showKhaiThacCols.giaDung && (
                                    <>
                                      {showKhaiThacCols.gdMln && <td className="py-2 px-2 text-center text-[13px] font-black text-[#0e7490] border-r border-slate-200/50">{formatVal(item.gdMlnQty)}</td>}
                                      {showKhaiThacCols.gdNcom && <td className="py-2 px-2 text-center text-[13px] font-black text-[#0e7490] border-r border-slate-200/50">{formatVal(item.gdNcomQty)}</td>}
                                      {showKhaiThacCols.gdNchien && <td className="py-2 px-2 text-center text-[13px] font-black text-[#0e7490] border-r border-slate-200/50">{formatVal(item.gdNchienQty)}</td>}
                                      {showKhaiThacCols.gdQuat && <td className="py-2 px-2 text-center text-[13px] font-black text-[#0e7490] border-r border-slate-200/50">{formatVal(item.gdQuatQty)}</td>}
                                      {showKhaiThacCols.gdQdh && <td className="py-2 px-2 text-center text-[13px] font-black text-[#0e7490] border-r border-slate-200/50">{formatVal(item.gdQdhQty)}</td>}
                                    </>
                                  )}
                                </tr>
                              );
                            }) : (
                              <tr>
                                <td colSpan={30} className="py-12 text-center text-slate-400 italic text-[11px] border-r border-slate-200/50">
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
                              const totalDtTraGop = staffKhaiThacStats.reduce((s, x) => s + (x.dtTraGop || 0), 0);

                              const totalSpcSmf = staffKhaiThacStats.reduce((s, x) => s + x.spcSmfQty, 0);
                              const totalSpcLap = staffKhaiThacStats.reduce((s, x) => s + x.spcLapQty, 0);
                              const totalSpcTab = staffKhaiThacStats.reduce((s, x) => s + x.spcTabQty, 0);
                              const totalSpcTivi = staffKhaiThacStats.reduce((s, x) => s + x.spcTiviQty, 0);
                              const totalSpcMl = staffKhaiThacStats.reduce((s, x) => s + x.spcMlQty, 0);
                              const totalSpcTl = staffKhaiThacStats.reduce((s, x) => s + x.spcTlQty, 0);
                              const totalSpcMg = staffKhaiThacStats.reduce((s, x) => s + x.spcMgQty, 0);

                              const totalSpChinhQty =
                                (showKhaiThacCols.spcSmf ? totalSpcSmf : 0) +
                                (showKhaiThacCols.spcLap ? totalSpcLap : 0) +
                                (showKhaiThacCols.spcTab ? totalSpcTab : 0) +
                                (showKhaiThacCols.spcTivi ? totalSpcTivi : 0) +
                                (showKhaiThacCols.spcMl ? totalSpcMl : 0) +
                                (showKhaiThacCols.spcTl ? totalSpcTl : 0) +
                                (showKhaiThacCols.spcMg ? totalSpcMg : 0);

                              const totalSmfIphone = staffKhaiThacStats.reduce((s, x) => s + x.smfIphoneQty, 0);
                              const totalSmfSamsung = staffKhaiThacStats.reduce((s, x) => s + x.smfSamsungQty, 0);
                              const totalSmfOppo = staffKhaiThacStats.reduce((s, x) => s + x.smfOppoQty, 0);
                              const totalSmfVivo = staffKhaiThacStats.reduce((s, x) => s + x.smfVivoQty, 0);
                              const totalSmfRealme = staffKhaiThacStats.reduce((s, x) => s + x.smfRealmeQty, 0);
                              const totalSmfXiaomi = staffKhaiThacStats.reduce((s, x) => s + x.smfXiaomiQty, 0);
                              const totalSmfHonor = staffKhaiThacStats.reduce((s, x) => s + x.smfHonorQty, 0);
                              const totalSmfMotorola = staffKhaiThacStats.reduce((s, x) => s + x.smfMotorolaQty, 0);

                              const totalBhQty = staffKhaiThacStats.reduce((s, x) => s + x.bhQty, 0);
                              const totalVieonQty = staffKhaiThacStats.reduce((s, x) => s + x.vieonQty, 0);
                              const totalMangoIcallQty = staffKhaiThacStats.reduce((s, x) => s + x.mangoIcallQty, 0);

                              const totalSimQty = staffKhaiThacStats.reduce((s, x) => s + x.simQty, 0);

                              const totalDhDhtt = staffKhaiThacStats.reduce((s, x) => s + x.dhDhttQty, 0);
                              const totalDhWear = staffKhaiThacStats.reduce((s, x) => s + x.dhWearQty, 0);

                              const totalPkCam = staffKhaiThacStats.reduce((s, x) => s + x.pkCamQty, 0);
                              const totalPkLoa = staffKhaiThacStats.reduce((s, x) => s + x.pkLoaQty, 0);
                              const totalPkPin = staffKhaiThacStats.reduce((s, x) => s + x.pkPinQty, 0);
                              const totalPkTn = staffKhaiThacStats.reduce((s, x) => s + x.pkTnQty, 0);
                              const totalPkDenMt = staffKhaiThacStats.reduce((s, x) => s + x.pkDenMtQty, 0);

                              const totalGdMlnQty = staffKhaiThacStats.reduce((s, x) => s + x.gdMlnQty, 0);
                              const totalGdNcomQty = staffKhaiThacStats.reduce((s, x) => s + x.gdNcomQty, 0);
                              const totalGdNchienQty = staffKhaiThacStats.reduce((s, x) => s + x.gdNchienQty, 0);
                              const totalGdQuatQty = staffKhaiThacStats.reduce((s, x) => s + x.gdQuatQty, 0);
                              const totalGdQdhQty = staffKhaiThacStats.reduce((s, x) => s + x.gdQdhQty, 0);

                              const formatFooterVal = (val: number) => {
                                return val === 0 ? <span className="text-slate-300">-</span> : val.toLocaleString('vi-VN');
                              };
                              const formatFooterRev = (val: number) => {
                                if (val === 0) return <span className="text-slate-300">-</span>;
                                if (val >= 1_000_000) {
                                  const m = val / 1_000_000;
                                  if (m >= 1000) {
                                    return `${Math.round(m).toLocaleString('en-US')} Tỷ`;
                                  }
                                  return `${m % 1 === 0 ? m : m.toFixed(1)} Tr`;
                                }
                                if (val >= 1_000) {
                                  return `${Math.round(val / 1_000)} K`;
                                }
                                return val.toLocaleString('vi-VN');
                              };
                              const renderFooterHqqd = (val: number) => {
                                if (val === 0) return <span className="text-slate-300">-</span>;
                                const colorClass = val < 45 ? 'text-red-600' : 'text-emerald-600';
                                return (
                                  <span className={`${colorClass} font-black`}>
                                    {val}%
                                  </span>
                                );
                              };
                              const renderFooterTcPct = (tc: number, total: number) => {
                                if (total === 0 || tc === 0) {
                                  return (
                                    <span className="text-slate-300">-</span>
                                  );
                                }
                                const pct = Math.round((tc / total) * 100);
                                const colorClass = pct < 60 ? 'text-red-600' : 'text-emerald-600';
                                return (
                                  <span className={`${colorClass} font-black`}>
                                    {pct}%
                                  </span>
                                );
                              };

                              return (
                                <tr className="bg-[#e6fbf4] border-t-2 border-emerald-300 font-black text-slate-900 h-10 uppercase">
                                  <td className="py-2.5 px-4 text-left text-[14px] text-[#047857] font-black pl-6 border-r border-slate-200/50">TỔNG CỘNG</td>
                                  {/* DOANH THU Totals */}
                                  {showKhaiThacCols.doanhThu && (
                                    <>
                                      {showKhaiThacCols.target && (
                                        <td className="py-2 px-2 text-center text-[13px] text-[#7c3aed] font-black bg-[#f5f3ff]/60 border-r border-slate-200/50">{ssgTbConLai > 0 ? formatFooterRev(ssgTbConLai * 1_000_000) : '-'}</td>
                                      )}
                                      <td className="py-2 px-2 text-center text-[13px] text-[#1d4ed8] font-black border-r border-slate-200/50">{formatFooterRev(totalDtThuc)}</td>
                                      <td className="py-2 px-2 text-center text-[13px] text-[#1d4ed8] font-black border-r border-slate-200/50">{formatFooterRev(totalDtqd)}</td>
                                      {showKhaiThacCols.pctHt && (
                                        <td className="py-2 px-2 text-center text-[13px] font-black bg-[#f5f3ff]/40 border-r border-slate-200/50">
                                          {(() => {
                                            if (ssgTbConLai <= 0 || totalDtqd <= 0) return <span className="text-slate-300">-</span>;
                                            const totalTarget = ssgTbConLai * 1_000_000;
                                            const pctHT = Math.round((totalDtqd / totalTarget) * 100);
                                            return <span className={`${pctHT >= 100 ? 'text-emerald-600' : 'text-[#7c3aed]'} font-black`}>{pctHT}%</span>;
                                          })()}
                                        </td>
                                      )}
                                      <td className="py-2 px-2 text-center text-[13px] text-[#1d4ed8] font-black border-r border-slate-200/50">
                                        {renderFooterHqqd(totalHqqd)}
                                      </td>
                                      <td className="py-2 px-2 text-center text-[13px] text-[#1d4ed8] font-black border-r border-slate-200/50">{formatFooterRev(totalDtTraGop)}</td>
                                      <td className="py-2 px-2 text-center border-r border-slate-200/50">
                                        {renderFooterTcPct(totalDtTraGop, totalDtThuc)}
                                      </td>
                                    </>
                                  )}
                                  {/* SP CHÍNH Totals */}
                                  {showKhaiThacCols.spChinh && (
                                    <>
                                      {showKhaiThacCols.spcSmf && <td className="py-2 px-2 text-center text-[13px] text-[#047857] font-black border-r border-slate-200/50">{formatFooterVal(totalSpcSmf)}</td>}
                                      {showKhaiThacCols.spcLap && <td className="py-2 px-2 text-center text-[13px] text-[#047857] font-black border-r border-slate-200/50">{formatFooterVal(totalSpcLap)}</td>}
                                      {showKhaiThacCols.spcTab && <td className="py-2 px-2 text-center text-[13px] text-[#047857] font-black border-r border-slate-200/50">{formatFooterVal(totalSpcTab)}</td>}
                                      {showKhaiThacCols.spcTivi && <td className="py-2 px-2 text-center text-[13px] text-[#047857] font-black border-r border-slate-200/50">{formatFooterVal(totalSpcTivi)}</td>}
                                      {showKhaiThacCols.spcMl && <td className="py-2 px-2 text-center text-[13px] text-[#047857] font-black border-r border-slate-200/50">{formatFooterVal(totalSpcMl)}</td>}
                                      {showKhaiThacCols.spcTl && <td className="py-2 px-2 text-center text-[13px] text-[#047857] font-black border-r border-slate-200/50">{formatFooterVal(totalSpcTl)}</td>}
                                      {showKhaiThacCols.spcMg && <td className="py-2 px-2 text-center text-[13px] text-[#047857] font-black border-r border-slate-200/50">{formatFooterVal(totalSpcMg)}</td>}
                                      <td className="py-2 px-2 text-center text-[13px] text-[#047857] font-black border-r border-slate-200/50">{formatFooterVal(totalSpChinhQty)}</td>
                                    </>
                                  )}
                                  {/* SMARTPHONE Totals */}
                                  {showKhaiThacCols.smartphone && (
                                    <>
                                      {showKhaiThacCols.smfIphone && <td className="py-2 px-2 text-center text-[13px] text-yellow-700 font-black border-r border-slate-200/50">{formatFooterVal(totalSmfIphone)}</td>}
                                      {showKhaiThacCols.smfSamsung && <td className="py-2 px-2 text-center text-[13px] text-yellow-700 font-black border-r border-slate-200/50">{formatFooterVal(totalSmfSamsung)}</td>}
                                      {showKhaiThacCols.smfOppo && <td className="py-2 px-2 text-center text-[13px] text-yellow-700 font-black border-r border-slate-200/50">{formatFooterVal(totalSmfOppo)}</td>}
                                      {showKhaiThacCols.smfVivo && <td className="py-2 px-2 text-center text-[13px] text-yellow-700 font-black border-r border-slate-200/50">{formatFooterVal(totalSmfVivo)}</td>}
                                      {showKhaiThacCols.smfRealme && <td className="py-2 px-2 text-center text-[13px] text-yellow-700 font-black border-r border-slate-200/50">{formatFooterVal(totalSmfRealme)}</td>}
                                      {showKhaiThacCols.smfXiaomi && <td className="py-2 px-2 text-center text-[13px] text-yellow-700 font-black border-r border-slate-200/50">{formatFooterVal(totalSmfXiaomi)}</td>}
                                      {showKhaiThacCols.smfHonor && <td className="py-2 px-2 text-center text-[13px] text-yellow-700 font-black border-r border-slate-200/50">{formatFooterVal(totalSmfHonor)}</td>}
                                      {showKhaiThacCols.smfMotorola && <td className="py-2 px-2 text-center text-[13px] text-yellow-700 font-black border-r border-slate-200/50">{formatFooterVal(totalSmfMotorola)}</td>}
                                    </>
                                  )}
                                  {/* DỊCH VỤ Totals */}
                                  {(showKhaiThacCols.sim || showKhaiThacCols.baoHiem) && (
                                    <>
                                      {showKhaiThacCols.sim && (
                                        <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalSimQty)}</td>
                                      )}
                                      {showKhaiThacCols.baoHiem && (
                                        <>
                                          {showKhaiThacCols.vasBh && <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalBhQty)}</td>}
                                          {showKhaiThacCols.vasVieon && <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalVieonQty)}</td>}
                                          {showKhaiThacCols.vasMangoIcall && <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalMangoIcallQty)}</td>}
                                        </>
                                      )}
                                    </>
                                  )}
                                  {/* ĐỒNG HỒ Totals */}
                                  {showKhaiThacCols.dongHo && (
                                    <>
                                      <td className="py-2 px-2 text-center text-[13px] text-[#6b21a8] font-black border-r border-slate-200/50">{formatFooterVal(totalDhDhtt)}</td>
                                      <td className="py-2 px-2 text-center text-[13px] text-[#6b21a8] font-black border-r border-slate-200/50">{formatFooterVal(totalDhWear)}</td>
                                    </>
                                  )}
                                  {/* PHỤ KIỆN Totals */}
                                  {showKhaiThacCols.phuKien && (
                                    <>
                                      {showKhaiThacCols.pkCam && <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalPkCam)}</td>}
                                      {showKhaiThacCols.pkLoa && <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalPkLoa)}</td>}
                                      {showKhaiThacCols.pkPin && <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalPkPin)}</td>}
                                      {showKhaiThacCols.pkTn && <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalPkTn)}</td>}
                                      {showKhaiThacCols.pkDenMt && <td className="py-2 px-2 text-center text-[13px] text-[#be123c] font-black border-r border-slate-200/50">{formatFooterVal(totalPkDenMt)}</td>}
                                    </>
                                  )}
                                  {/* GIA DỤNG Totals */}
                                  {showKhaiThacCols.giaDung && (
                                    <>
                                      {showKhaiThacCols.gdMln && <td className="py-2 px-2 text-center text-[13px] text-[#0e7490] font-black border-r border-slate-200/50">{formatFooterVal(totalGdMlnQty)}</td>}
                                      {showKhaiThacCols.gdNcom && <td className="py-2 px-2 text-center text-[13px] text-[#0e7490] font-black border-r border-slate-200/50">{formatFooterVal(totalGdNcomQty)}</td>}
                                      {showKhaiThacCols.gdNchien && <td className="py-2 px-2 text-center text-[13px] text-[#0e7490] font-black border-r border-slate-200/50">{formatFooterVal(totalGdNchienQty)}</td>}
                                      {showKhaiThacCols.gdQuat && <td className="py-2 px-2 text-center text-[13px] text-[#0e7490] font-black border-r border-slate-200/50">{formatFooterVal(totalGdQuatQty)}</td>}
                                      {showKhaiThacCols.gdQdh && <td className="py-2 px-2 text-center text-[13px] text-[#0e7490] font-black border-r border-slate-200/50">{formatFooterVal(totalGdQdhQty)}</td>}
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

                  {/* HIỆU QUẢ BÁN KÈM THEO NHÂN VIÊN */}
                  {!isMoiTab && (
                    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-6 mb-12" id="hieu-qua-ban-kem-card-container">
                    <div className="bg-[#93c5fd] px-6 py-4 flex items-center justify-between border-b border-[#60a5fa] relative">
                      <div className="flex items-center gap-3 mx-auto">
                        <h3 className="text-2xl font-black text-[#1e3a8a] uppercase tracking-widest text-center" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}>
                          HIỆU QUẢ BÁN KÈM THEO NHÂN VIÊN
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 absolute right-6 top-1/2 -translate-y-1/2">
                        <button
                          onClick={() => {
                            const allExpanded = crossSellingStats.length > 0 && crossSellingStats.every(s => expandedCrossSellingStaff[s.staffName]);
                            const newState: Record<string, boolean> = {};
                            if (!allExpanded) {
                              crossSellingStats.forEach(s => {
                                newState[s.staffName] = true;
                              });
                            }
                            setExpandedCrossSellingStaff(newState);
                          }}
                          className={`px-3 py-1.5 rounded-lg border border-[#3b82f6] text-[10px] font-bold transition-colors flex items-center gap-1.5 no-capture shadow-sm ${crossSellingStats.length > 0 && crossSellingStats.every(s => expandedCrossSellingStaff[s.staffName]) ? 'bg-[#3b82f6] text-white' : 'bg-white/50 text-[#1e3a8a] hover:bg-[#3b82f6] hover:text-white'}`}
                          title="Xổ / Đóng tất cả chi tiết"
                        >
                          <ChevronsUpDown size={12} />
                          <span>{crossSellingStats.length > 0 && crossSellingStats.every(s => expandedCrossSellingStaff[s.staffName]) ? 'Đóng tất cả' : 'Xổ tất cả'}</span>
                        </button>
                        <button
                          onClick={() => handleCaptureTable('hieu-qua-ban-kem-card-container', 'hieu_qua_ban_kem')}
                          className="px-3 py-1.5 rounded-lg border border-[#3b82f6] text-[10px] font-bold text-[#1e3a8a] hover:bg-[#3b82f6] hover:text-white transition-colors flex items-center gap-1.5 no-capture shadow-sm bg-white/50"
                        >
                          <Camera size={12} />
                          <span>Chụp ảnh</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto mobile-table-scroll" style={{ '--sticky-col-1-width': '200px' } as React.CSSProperties}>
                      <table className="w-full border-collapse text-center responsive-data-table" style={{ borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            <th rowSpan={2} className="sticky-col sticky-col-1 py-2.5 px-4 text-center bg-[#fed7aa] text-[#9a3412] font-black border-r border-[#fdba74] border-b align-middle min-w-[200px]">NHÂN VIÊN</th>
                            <th rowSpan={2} className="sticky-col sticky-col-2 py-2.5 px-4 text-center bg-[#bbf7d0] text-[#166534] font-black border-r border-[#86efac] border-b align-middle min-w-[120px]">BỘ PHẬN</th>
                            <th colSpan={5} className="py-2.5 px-4 text-center bg-[#fef08a] text-[#854d0e] font-black border-r border-[#fde047] border-b">SỐ LƯỢNG BILL</th>
                            <th colSpan={2} className="py-2.5 px-4 text-center bg-[#fde047] text-[#a16207] font-black border-b border-[#facc15]">H.QUẢ SL</th>
                          </tr>
                          <tr>
                            <th className="py-2 px-2 text-center text-[11px] bg-[#fef08a] text-[#b91c1c] font-black border-r border-[#fde047] border-b w-[120px]">TỔNG BILL<br/>(- thu hộ -<br/>thẻ cào -<br/>trả góp)</th>
                            <th className="py-2 px-2 text-center text-[11px] bg-[#fef08a] text-[#854d0e] font-black border-r border-[#fde047] border-b w-[80px]">SL BILL<br/>B.KÈM</th>
                            <th className="py-2 px-2 text-center text-[11px] bg-[#fef08a] text-[#854d0e] font-black border-r border-[#fde047] border-b w-[80px]">SL BILL<br/>KO B.KÈM</th>
                            <th className="py-2 px-2 text-center text-[11px] bg-[#fef08a] text-[#854d0e] font-black border-r border-[#fde047] border-b w-[80px]">%BILL<br/>B.KÈM</th>
                            <th className="py-2 px-2 text-center text-[11px] bg-[#fef08a] text-[#854d0e] font-black border-r border-[#fde047] border-b w-[80px]">ĐÁNH<br/>GIÁ</th>
                            <th className="py-2 px-2 text-center text-[11px] bg-[#fde047] text-[#a16207] font-black border-r border-[#facc15] border-b w-[80px]">SL BILL<br/>2 MÓN</th>
                            <th className="py-2 px-2 text-center text-[11px] bg-[#fde047] text-[#a16207] font-black border-b border-[#facc15] w-[80px]">SL BILL<br/>&gt;2 MÓN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const totalBills = crossSellingStats.reduce((s, x) => s + x.totalBills, 0);
                            const totalKem = crossSellingStats.reduce((s, x) => s + x.kemBills, 0);
                            const totalNoKem = crossSellingStats.reduce((s, x) => s + x.noKemBills, 0);
                            const totalPct = totalBills > 0 ? Math.round((totalKem / totalBills) * 100) : 0;
                            const total2 = crossSellingStats.reduce((s, x) => s + x.twoItemsBills, 0);
                            const totalMore2 = crossSellingStats.reduce((s, x) => s + x.moreThanTwoItemsBills, 0);

                            return (
                              <tr className="bg-[#fef9c3] border-b border-slate-200">
                                <td colSpan={2} className="sticky-col sticky-col-1 bg-[#fef9c3] py-2.5 px-4 text-center text-[14px] text-slate-900 font-black border-r border-slate-200">TỔNG</td>
                                <td className="py-2.5 px-2 text-center text-[14px] text-slate-900 font-black border-r border-slate-200">{totalBills || ''}</td>
                                <td className="py-2.5 px-2 text-center text-[14px] text-slate-900 font-black border-r border-slate-200">{totalKem || ''}</td>
                                <td className="py-2.5 px-2 text-center text-[14px] text-slate-900 font-black border-r border-slate-200">{totalNoKem || ''}</td>
                                <td className="py-2.5 px-2 text-center text-[14px] text-slate-900 font-black border-r border-slate-200">{totalPct}%</td>
                                <td className="py-2.5 px-2 text-center border-r border-slate-200"></td>
                                <td className="py-2.5 px-2 text-center text-[14px] text-slate-900 font-black border-r border-slate-200">{total2 || ''}</td>
                                <td className="py-2.5 px-2 text-center text-[14px] text-slate-900 font-black border-slate-200">{totalMore2 || ''}</td>
                              </tr>
                            );
                          })()}

                          {crossSellingStats.map((item, idx) => (
                            <React.Fragment key={idx}>
                              <tr className="group border-b border-slate-200 hover:bg-slate-50 transition-colors bg-white">
                                <td
                                  className="sticky-col sticky-col-1 bg-white group-hover:bg-slate-50 py-2 px-4 text-left text-[13px] text-slate-900 font-bold border-r border-slate-200 cursor-pointer hover:text-[#2563eb] whitespace-nowrap"
                                  onClick={() => setExpandedCrossSellingStaff(prev => ({ ...prev, [item.staffName]: !prev[item.staffName] }))}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <ChevronRight size={14} className={`transition-transform duration-200 flex-shrink-0 ${expandedCrossSellingStaff[item.staffName] ? 'rotate-90 text-[#2563eb]' : 'text-slate-400'}`} />
                                    <span>{item.staffName}</span>
                                  </div>
                                </td>
                                <td className="sticky-col sticky-col-2 bg-white group-hover:bg-slate-50 py-2 px-4 text-center text-[12px] text-slate-700 font-bold border-r border-slate-200">{item.boPhan}</td>
                                <td className="py-2 px-2 text-center text-[13px] text-slate-900 font-bold border-r border-slate-200">{item.totalBills || ''}</td>
                                <td className="py-2 px-2 text-center text-[13px] text-[#ef4444] font-black border-r border-slate-200">{item.kemBills || ''}</td>
                                <td className="py-2 px-2 text-center text-[13px] text-slate-900 font-bold border-r border-slate-200">{item.noKemBills || ''}</td>
                                <td className={`py-2 px-2 text-center text-[13px] font-black border-r border-slate-200 ${item.pctKem === 0 ? 'bg-[#fecaca] text-[#ef4444]' : 'text-slate-900'}`}>{item.pctKem}%</td>
                                <td className={`py-2 px-2 text-center border-r border-slate-200 ${item.pctKem === 0 ? 'bg-[#fecaca]' : ''}`}>
                                  {item.pctKem === 0 ? <span className="text-[14px]">⛔️</span> : ''}
                                </td>
                                <td className="py-2 px-2 text-center text-[13px] text-slate-900 font-bold border-r border-slate-200">{item.twoItemsBills || ''}</td>
                                <td className="py-2 px-2 text-center text-[13px] text-slate-900 font-bold border-slate-200">{item.moreThanTwoItemsBills || ''}</td>
                              </tr>
                              {expandedCrossSellingStaff[item.staffName] && (
                                <tr className="bg-slate-50 border-b border-slate-200 shadow-inner">
                                  <td colSpan={9} className="p-4">
                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 text-left">
                                      <h4 className="text-[13px] font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">Danh sách Đơn Hàng ({item.totalBills}) - <span className="text-[#2563eb]">{item.staffName}</span></h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {item.billsList.map((bill, bIdx) => (
                                          <div key={bIdx} className={`p-3 rounded-md border ${bill.itemCount >= 2 ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'} relative mt-2`}>
                                            {bill.itemCount >= 2 && <div className="absolute -top-2.5 -right-2.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm whitespace-nowrap z-10">Bán Kèm</div>}
                                            <div className="text-[11px] text-slate-500 font-medium mb-1">📅 {bill.dateVal}</div>
                                            {bill.customerName && <div className="text-[11px] text-[#2563eb] font-bold mb-1.5 truncate" title={bill.customerName}>👤 {bill.customerName}</div>}
                                            <div className="text-[12px] font-bold text-slate-800 mb-1.5">{bill.itemCount} Món:</div>
                                            <ul className="list-disc pl-4 space-y-1">
                                              {bill.items.map((prod, pIdx) => (
                                                <li key={pIdx} className="text-[11px] text-slate-600 leading-tight">
                                                  {prod.product} {prod.htx && <span className="text-[10px] text-slate-400 ml-1">({prod.htx})</span>}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                          
                          {/* Empty rows to match design */}
                          {crossSellingStats.length < 5 && Array.from({ length: 5 - crossSellingStats.length }).map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-slate-200 bg-white">
                              <td className="py-5 border-r border-slate-200"></td>
                              <td className="py-5 border-r border-slate-200"></td>
                              <td className="py-5 border-r border-slate-200"></td>
                              <td className="py-5 border-r border-slate-200"></td>
                              <td className="py-5 border-r border-slate-200"></td>
                              <td className="py-5 border-r border-slate-200"></td>
                              <td className="py-5 border-r border-slate-200"></td>
                              <td className="py-5 border-r border-slate-200"></td>
                              <td className="py-5 border-slate-200"></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}

                  {/* Unexported Orders Table */}
                  {rawYcxRows && rawYcxRows.length > 1 && (
                    <UnexportedOrdersTable 
                      rawYcxRows={rawYcxRows}
                      marketFilter={marketFilter} 
                      onCapture={() => handleCaptureTable('unexported-orders-table-container', 'don_hang_chua_xuat')}
                      drillFilterTrangThaiSP={drillFilterTrangThaiSP}
                    />
                  )}

                  {/* Raw Data Table: 3. THÊM YCX RT */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md mt-8 mb-12">
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShoppingBag size={18} className="text-slate-700 flex-shrink-0" />
                        <div>
                          <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-widest">3. DỮ LIỆU NGUỒN</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{isMoiTab ? 'Hiển thị tất cả dữ liệu (không lọc)' : 'Lọc: Đã xuất, Chưa xuất & Chưa trả'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCaptureTable('ycx-raw-data-container', 'data_ycx_rt')}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center gap-1.5 no-capture"
                        >
                          <Camera size={12} className="text-slate-500 hover:text-indigo-600" />
                          <span>Chụp ảnh</span>
                        </button>
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
                  </div>

                    {showRawTable && (() => {
                      const COLUMNS_TO_HIDE = new Set([
                        'THƯƠNG HIỆU', 'SỐ ĐIỆN THOẠI', 'PHẢI THU', 'ĐÃ THU', 'CÒN NỢ', 'PHỤ PHÍ',
                        'KHOẢNG CÁCH GIAO HÀNG', 'TẠO TỪ', 'CHỨNG TỪ LIÊN QUAN', 'SỐ HOÁ ĐƠN', 'KÝ HIỆU HOÁ ĐƠN',
                        'MÃ SP WEB', 'IMEI_1', 'CTKM_1', 'ĐỊA CHỈ KHÁCH HÀNG', 'EMAIL KH', 'GIÁ TRỊ GIẢM',
                        'MÃ KHÁCH HÀNG', 'CHỨNG TỪ LIÊN QUAN_1'
                      ]);
                      const hiddenColIdxs = new Set<number>();
                      if (rawYcxRows.length > 0) {
                        rawYcxRows[0].forEach((h, idx) => {
                          const headerName = String(h || '').trim().toUpperCase();
                          if (COLUMNS_TO_HIDE.has(headerName)) {
                            hiddenColIdxs.add(idx);
                          }
                        });
                      }
                      
                      return (
                      <div id="ycx-raw-data-container">
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                          <table className="w-full border-collapse text-center min-w-[3000px]" style={{ borderSpacing: 0 }}>
                            <thead className="sticky top-0 z-10">
                              <tr>
                                {rawYcxRows.length > 0 &&
                                  rawYcxRows[0].map((cell, idx) => {
                                    if (hiddenColIdxs.has(idx)) return null;
                                    const hasFilter = columnFilters[idx]?.selectedValues !== null && columnFilters[idx]?.selectedValues !== undefined;
                                    return (
                                      <th key={idx} className="relative border border-slate-300 bg-slate-700 py-2 px-3 text-[9px] font-black text-white uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center justify-between gap-2">
                                          <span>{cell || `Cột ${String.fromCharCode(65 + idx)}`}</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveFilterDropdown(activeFilterDropdown === idx ? null : idx);
                                            }}
                                            className={`p-1 rounded hover:bg-slate-600 transition-colors ${hasFilter ? 'text-indigo-400 font-bold' : 'text-slate-400'
                                              }`}
                                          >
                                            <Filter size={10} />
                                          </button>
                                        </div>
                                        {activeFilterDropdown === idx && (
                                          <ColumnFilterDropdown
                                            colIdx={idx}
                                            columnName={cell || `Cột ${String.fromCharCode(65 + idx)}`}
                                            uniqueVals={openColumnUniqueValues}
                                            filterState={columnFilters[idx]}
                                            onApply={(search, selectedValues) => {
                                              setColumnFilters(prev => ({ ...prev, [idx]: { search, selectedValues } }));
                                            }}
                                            onClear={() => {
                                              setColumnFilters(prev => {
                                                const next = { ...prev };
                                                delete next[idx];
                                                return next;
                                              });
                                              setActiveFilterDropdown(null);
                                            }}
                                            onClose={() => setActiveFilterDropdown(null)}
                                          />
                                        )}
                                      </th>
                                    );
                                  })
                                }
                                {[
                                  { name: 'PHÂN LOẠI', key: 'classify', offset: 0 },
                                  { name: 'NGÀNH HÀNG LỚN', key: 'large', offset: 1 },
                                  { name: 'NHÓM HÀNG NHỎ', key: 'small', offset: 2 },
                                  { name: 'PHÂN LOẠI YCX', key: 'ycx', offset: 3 },
                                ].map((col) => {
                                  const filterIdx = (rawYcxRows[0]?.length || 0) + col.offset;
                                  const hasFilter = columnFilters[filterIdx]?.selectedValues !== null && columnFilters[filterIdx]?.selectedValues !== undefined;
                                  return (
                                    <th key={`calc-${col.key}`} className="relative border border-slate-300 bg-slate-700 py-2 px-3 text-[9px] font-black text-white uppercase tracking-wider whitespace-nowrap">
                                      <div className="flex items-center justify-between gap-2">
                                        <span>{col.name}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveFilterDropdown(activeFilterDropdown === filterIdx ? null : filterIdx);
                                          }}
                                          className={`p-1 rounded hover:bg-slate-600 transition-colors ${hasFilter ? 'text-indigo-400 font-bold' : 'text-slate-400'
                                            }`}
                                        >
                                          <Filter size={10} />
                                        </button>
                                      </div>
                                      {activeFilterDropdown === filterIdx && (
                                        <ColumnFilterDropdown
                                          colIdx={filterIdx}
                                          columnName={col.name}
                                          uniqueVals={openColumnUniqueValues}
                                          filterState={columnFilters[filterIdx]}
                                          onApply={(search, selectedValues) => {
                                            setColumnFilters(prev => ({ ...prev, [filterIdx]: { search, selectedValues } }));
                                          }}
                                          onClear={() => {
                                            setColumnFilters(prev => {
                                              const next = { ...prev };
                                              delete next[filterIdx];
                                              return next;
                                            });
                                            setActiveFilterDropdown(null);
                                          }}
                                          onClose={() => setActiveFilterDropdown(null)}
                                        />
                                      )}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>

                            <tbody>
                              {filteredRawTableRows.length > 0 ? (
                                (() => {
                                  // Find index of Tên sản phẩm
                                  const headers = rawYcxRows[0]?.map(h => String(h || '').trim()) || [];
                                  const idxProduct = (() => {
                                    const idx = headers.findIndex(h => h.toLowerCase().includes('tên sản phẩm') || h.toLowerCase() === 'tên hàng');
                                    return idx !== -1 ? idx : 33;
                                  })();
                                  const idxProductCode = (() => {
                                    const idx = headers.findIndex(h => {
                                      const norm = removeAccents(h).toLowerCase();
                                      return norm === 'ma san pham' || norm === 'ma sp' || norm === 'ma hang' || norm.includes('ma san pham');
                                    });
                                    return idx !== -1 ? idx : 28;
                                  })();
                                  const idxSmallCategoryHeader = headers.findIndex(h => h.toLowerCase().includes('nhóm hàng nhỏ'));
                                  const idxNganhHang = (() => {
                                    const idx = headers.findIndex(h => {
                                      const norm = removeAccents(h).toLowerCase();
                                      return (norm.includes('nganh hang') && !norm.includes('lon')) || norm.includes('nhom nganh hang');
                                    });
                                    return idx !== -1 ? idx : -1;
                                  })();
                                  const idxNhomHang = (() => {
                                    const exactNhom = headers.findIndex(h => {
                                      const norm = removeAccents(h).toLowerCase();
                                      return norm === 'nhom hang' || (norm.includes('nhom hang') && !norm.includes('nhom hang nho'));
                                    });
                                    if (exactNhom !== -1) return exactNhom;
                                    const idx = headers.findIndex(h => {
                                      const norm = removeAccents(h).toLowerCase();
                                      return (norm.includes('nganh hang') && !norm.includes('lon')) ||
                                             norm.includes('nhom nganh hang') ||
                                             (norm.includes('nhom hang') && !norm.includes('nhom hang nho'));
                                    });
                                    return idx !== -1 ? idx : 40;
                                  })();
                                  const idxHinhThucXuat = (() => {
                                    const idxExact = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === 'hinh thuc xuat');
                                    if (idxExact !== -1) return idxExact;
                                    return headers.findIndex(h => {
                                      const lh = removeAccents(h).toLowerCase().trim();
                                      return lh === 'loai ycx' || lh === 'loai yeu cau' || lh === 'phan loai ycx';
                                    });
                                  })();
                                  // Date columns to format
                                  const dateColIndices = new Set<number>(
                                    headers.reduce((acc: number[], h, i) => {
                                      if (isDateColumnHeader(h)) acc.push(i);
                                      return acc;
                                    }, [])
                                  );


                                  const classifyHinhThucXuat = (htx: string): string | null => {
                                    const clean = htx.trim().toLowerCase();
                                    if (!clean) return null;

                                    if (clean.includes('yêu cầu xuất dv thu hộ bảo hiểm') || clean.includes('yeu cau xuat dv thu ho bao hiem')) {
                                      return 'Yêu cầu xuất DV thu hộ bảo hiểm';
                                    }
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

                                  // Render rows up to the current visible limit
                                  const visibleLimit = isCapturing ? filteredRawTableRows.length : (rawTablePage + 1) * RAW_PAGE_SIZE;
                                  const pageRows = filteredRawTableRows.slice(0, visibleLimit);

                                  return pageRows.map((row, rowIdx) => (
                                    <tr key={rowIdx} className={`transition-colors ${rowIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} hover:bg-slate-100`}>
                                      {headers.map((_, cellIdx) => {
                                        if (hiddenColIdxs.has(cellIdx)) return null;
                                        const cell = row[cellIdx];
                                        return (
                                        <td key={cellIdx} className={`border border-slate-200 py-2 px-3 text-[9px] font-medium whitespace-nowrap ${dateColIndices.has(cellIdx) ? 'text-indigo-700 font-bold' : 'text-slate-900'}`}>
                                          {dateColIndices.has(cellIdx)
                                            ? fmtRawDate(String(cell || ''))
                                            : (cell === undefined || cell === null ? '' : String(cell))}
                                        </td>
                                      )})}
                                      <td className="border border-slate-200 py-2 px-3 text-[9px] text-slate-900 whitespace-nowrap font-bold">
                                        {(() => {
                                          const prodCode = idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '';
                                          const prodName = idxProduct !== -1 ? String(row[idxProduct] || '').toUpperCase() : '';
                                          const codeClass = classifyProductByCode(prodCode, customBaoHiemRules);
                                          if (codeClass) return codeClass;
                                          return classifyProduct(prodName, customBaoHiemRules) || '-';
                                        })()}
                                      </td>
                                      <td className="border border-slate-200 py-2 px-3 text-[9px] text-slate-900 whitespace-nowrap font-bold">
                                        {(() => {
                                          const nhomSmallValue = idxSmallCategoryHeader !== -1 ? String(row[idxSmallCategoryHeader] || '').trim().toUpperCase() : '';
                                          const valLarge = classifyNhomHangLarge(idxNhomHang !== -1 ? row[idxNhomHang] : '', String(row[idxProduct] || ''), nhomSmallValue, undefined, customNhomSmallMap, customBaoHiemRules, idxProductCode !== -1 ? String(row[idxProductCode] || '').trim() : '') || '-';
                                          return valLarge === 'BẢO HIỂM' ? 'B.HIỂM' : valLarge;
                                        })()}
                                      </td>
                                      <td className="border border-slate-200 py-2 px-3 text-[9px] text-slate-900 whitespace-nowrap font-bold">
                                        {(() => {
                                          return resolveNhomSmallFriendlyName(row, idxSmallCategoryHeader, idxNhomHang, idxProduct, idxProductCode, customNhomSmallMap, customBaoHiemRules);
                                        })()}
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
                            <tfoot>
                              {rawYcxRows.length > 0 && (() => {
                                const headers = rawYcxRows[0]?.map(h => String(h || '').trim()) || [];
                                const colCount = headers.length;

                                // Pre-compute sums for ALL columns
                                const colSums: (number | null)[] = new Array(colCount).fill(null);
                                const colNumericCount: number[] = new Array(colCount).fill(0);

                                for (let c = 0; c < colCount; c++) {
                                  let sum = 0;
                                  let numCount = 0;
                                  for (const row of filteredRawTableRows) {
                                    const rawVal = String(row[c] || '').replace(/,/g, '').trim();
                                    const val = parseFloat(rawVal);
                                    if (!isNaN(val) && rawVal !== '') {
                                      sum += val;
                                      numCount++;
                                    }
                                  }
                                  // Only show sum if at least half of rows have numeric values
                                  if (numCount > 0 && numCount >= filteredRawTableRows.length * 0.3) {
                                    colSums[c] = sum;
                                    colNumericCount[c] = numCount;
                                  }
                                }

                                return (
                                  <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-400 text-[10px] text-slate-800 sticky bottom-0 z-[5]">
                                    {headers.map((_, idx) => {
                                      if (hiddenColIdxs.has(idx)) return null;
                                      if (idx === 0) {
                                        return (
                                          <td key={idx} className="border border-slate-200 py-2 px-3 text-center uppercase tracking-wider text-slate-700 whitespace-nowrap bg-slate-100">
                                            TỔNG CỘNG
                                          </td>
                                        );
                                      }
                                      if (colSums[idx] !== null) {
                                        return (
                                          <td key={idx} className="border border-slate-200 py-2 px-3 text-center text-slate-900 font-black whitespace-nowrap bg-emerald-50/50">
                                            {colSums[idx]!.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                          </td>
                                        );
                                      }
                                      return (
                                        <td key={idx} className="border border-slate-200 py-2 px-3 bg-slate-100"></td>
                                      );
                                    })}
                                    {/* Extra calculated columns */}
                                    <td className="border border-slate-200 py-2 px-3 bg-slate-100"></td>
                                    <td className="border border-slate-200 py-2 px-3 bg-slate-100"></td>
                                    <td className="border border-slate-200 py-2 px-3 bg-slate-100"></td>
                                    <td className="border border-slate-200 py-2 px-3 bg-slate-100"></td>
                                  </tr>
                                );
                              })()}
                            </tfoot>
                          </table>
                        </div>

                        {/* Load More button */}
                        {!isCapturing && (rawTablePage + 1) * RAW_PAGE_SIZE < filteredRawTableRows.length && (
                          <div className="flex items-center justify-center px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                            <button
                              onClick={() => setRawTablePage(p => p + 5)}
                              className="px-4 py-2 text-[12px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2 shadow-sm"
                            >
                              Hiển thị thêm 500 dòng (Đang xem {(rawTablePage + 1) * RAW_PAGE_SIZE} / {filteredRawTableRows.length})
                            </button>
                          </div>
                        )}
                      </div>
                      );
                    })()}
                  </div>

                  {/* Custom Category Mapping Card - Hidden by User Request */}
                  {/*
                  <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md mt-6">
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database size={18} className="text-slate-700 flex-shrink-0" />
                        <div>
                          <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-widest">4. CẤU HÌNH MAPPING NGÀNH HÀNG</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dùng để phân loại cột Ngành hàng LỚN &amp; Nhóm hàng NHỎ</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-sans">
                        <p className="font-bold text-slate-700 mb-1">💡 Hướng dẫn sử dụng:</p>
                        Copy toàn bộ bảng excel gồm 4 cột: <span className="font-black text-indigo-600">Ngành hàng | Nhóm hàng | Ngành hàng LỚN | Nhóm hàng NHỎ</span> (có hoặc không có dòng tiêu đề), dán vào ô dưới đây. Hệ thống sẽ tự động cập nhật phân loại và tính toán DTQĐ theo luật mới.
                      </div>
                      <textarea
                        value={categoryMappingInput || ''}
                        onChange={(e) => setCategoryMappingInput(e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedText = e.clipboardData.getData('text');
                          if (pastedText) {
                            setCategoryMappingInput(pastedText);
                          }
                        }}
                        rows={8}
                        placeholder="Dán dữ liệu mapping từ Excel (Ctrl+V) tại đây..."
                        className="w-full bg-white border-2 border-slate-200 focus:border-blue-400 rounded-xl p-4 text-[11px] focus:ring-4 focus:ring-blue-100 outline-none resize-y font-sans font-normal transition-all"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {categoryMappingInput ? `Đã nhập ${categoryMappingInput.split('\n').filter(Boolean).length} dòng dữ liệu` : 'Chưa có dữ liệu mapping'}
                        </span>
                        {categoryMappingInput && (
                          <button
                            onClick={() => setCategoryMappingInput('')}
                            className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-red-50 transition-all cursor-pointer active:scale-95 shadow-sm"
                          >
                            Xóa dữ liệu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  */}
                  {/* Custom Category Mapping Card - Hidden by User Request */}
                  {/* ... */}
                  
                  {/* Unexported Orders Table moved to above Raw Data Table */}
                </motion.div>
              )}

            </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Excel processing overlay */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isProcessingData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/80 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center"
              >
                <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-400 border-b-transparent border-l-transparent animate-spin"></div>
                  <FileSpreadsheet size={32} className="text-indigo-600 animate-bounce" />
                </div>

                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider mb-2">Đang xử lý dữ liệu...</h3>
                <p className="text-[12px] font-medium text-slate-500 max-w-[240px]">
                  Hệ thống đang phân tích cấu trúc cột, làm sạch dữ liệu và tự động nhóm các ngành hàng/hãng sản xuất. Vui lòng chờ trong giây lát.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />

      {processError && (
        <div className="fixed bottom-4 right-4 bg-rose-950 text-rose-200 border border-rose-800 p-4 rounded-2xl max-w-md shadow-2xl z-[9999] text-xs font-mono select-text">
          <p className="font-bold text-rose-400 mb-1">⚠️ Lỗi xử lý dữ liệu (Realtime Parse Error):</p>
          <pre className="whitespace-pre-wrap leading-relaxed max-h-40 overflow-auto">{processError}</pre>
        </div>
      )}

      {/* Config Nhom Hang Modal */}
      <ConfigNhomHangModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        initialMap={customNhomSmallMap}
        onSave={async (newMap) => {
          setCustomNhomSmallMap(newMap);
          try {
            await setDoc(doc(db, 'system_configs', 'nhom_hang_map'), { map: newMap, updatedAt: serverTimestamp() }, { merge: true });
            setCachedDoc('system_configs', 'nhom_hang_map', { map: newMap });
            showNotification('Đã lưu cấu hình lên hệ thống', 'success');
          } catch (error) {
            console.error('Error saving map to Firebase:', error);
            showNotification('Có lỗi khi lưu cấu hình lên Firebase', 'error');
          }
        }}
      />
      
      {/* Config Bao Hiem Modal */}
      <ConfigBaoHiemModal
        isOpen={showConfigBaoHiemModal}
        onClose={() => setShowConfigBaoHiemModal(false)}
        initialRules={customBaoHiemRules}
        onSave={async (newRules) => {
          setCustomBaoHiemRules(newRules);
          try {
            await setDoc(doc(db, 'system_configs', 'bao_hiem_map'), { rules: newRules, updatedAt: serverTimestamp() }, { merge: true });
            setCachedDoc('system_configs', 'bao_hiem_map', { rules: newRules });
            showNotification('Đã lưu cấu hình BH & VAS lên hệ thống', 'success');
          } catch (error) {
            console.error('Error saving bao hiem config to Firebase:', error);
            showNotification('Có lỗi khi lưu cấu hình BH & VAS lên Firebase', 'error');
          }
        }}
      />
      
      {/* Config Loai Bo Modal */}
      <ConfigExclusionModal
        isOpen={showConfigLoaiBoModal}
        onClose={() => setShowConfigLoaiBoModal(false)}
        initialRules={customExclusionRules}
        onSave={async (newRules) => {
          setCustomExclusionRules(newRules);
          try {
            await setDoc(doc(db, 'system_configs', 'loai_bo_map'), { rules: newRules, updatedAt: serverTimestamp() }, { merge: true });
            setCachedDoc('system_configs', 'loai_bo_map', { rules: newRules });
            showNotification('Đã lưu cấu hình loại bỏ lên hệ thống', 'success');
          } catch (error) {
            console.error('Error saving loai bo config to Firebase:', error);
            showNotification('Có lỗi khi lưu cấu hình loại bỏ lên Firebase', 'error');
          }
        }}
      />
      
      {/* Config Quy Doi Modal */}
      <ConfigQuyDoiModal
        isOpen={showConfigQuyDoiModal}
        onClose={() => setShowConfigQuyDoiModal(false)}
        initialRules={customQuyDoiRules}
        onSave={async (newRules) => {
          setCustomQuyDoiRules(newRules);
          try {
            await setDoc(doc(db, 'system_configs', 'quy_doi_map'), { rules: newRules, updatedAt: serverTimestamp() }, { merge: true });
            setCachedDoc('system_configs', 'quy_doi_map', { rules: newRules });
            showNotification('Đã lưu cấu hình quy đổi lên hệ thống', 'success');
          } catch (error) {
            console.error('Error saving quy doi config to Firebase:', error);
            showNotification('Có lỗi khi lưu cấu hình quy đổi lên Firebase', 'error');
          }
        }}
      />
      
      <ConfigGoogleSheetModal
        isOpen={showConfigGoogleSheetModal}
        onClose={() => setShowConfigGoogleSheetModal(false)}
        onRefreshAllData={() => {
          showNotification('Đã đồng bộ thành công cấu hình từ Google Sheets!', 'success');
        }}
        currentNhomHangMap={customNhomSmallMap}
        currentBaoHiemRules={customBaoHiemRules}
        currentExclusionRules={customExclusionRules}
        currentQuyDoiRules={customQuyDoiRules}
      />

      {/* Nhận xét Doanh thu & Ngành hàng Modal - 100% Pixel-Perfect matching Image 2 */}
      {isCommentModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            onClick={() => setIsCommentModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 my-auto animate-in fade-in zoom-in-95 duration-200"
            style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
          >
            {/* Header Banner - Orange Gradient matching Image 2 */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={20} className="text-white" />
                <span className="text-[14px] sm:text-[15px] font-black text-white uppercase tracking-wide">
                  Nhận xét thi đua
                </span>
              </div>
              <button
                onClick={() => setIsCommentModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div className="px-5 sm:px-6 pt-5 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2.5 uppercase tracking-wide">
                Chọn mẫu nội dung nhận xét:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {realtimeCommentTemplates.map((tab, idx) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedCommentTemplate(idx);
                      setCommentText(tab.text);
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-[11.5px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                      selectedCommentTemplate === idx
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md shadow-orange-500/25'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Comment Box */}
            <div className="px-5 sm:px-6 pb-6 pt-2 space-y-4">
              <div>
                <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">
                  Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
                </p>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={12}
                  className="w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-[12.5px] sm:text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                  style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11.5px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={handleCopyComment}
                  className={`flex items-center gap-2 px-6 py-3 text-[12px] font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
                    copiedComment
                      ? 'text-white bg-emerald-500 border border-emerald-600 shadow-emerald-500/20'
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500 shadow-orange-500/25'
                  }`}
                >
                  {copiedComment ? (
                    <>
                      <Check size={16} />
                      <span>Đã copy!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Sao chép nhận xét</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <CaptureLoadingOverlay isLoading={isCapturing} />
    </>
  );
}
