/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Monitor, 
  Smartphone, 
  LayoutGrid, 
  AlertCircle, 
  Wrench, 
  ShieldAlert, 
  RefreshCw, 
  Zap, 
  ShoppingBag, 
  Globe,
  Boxes, 
  FileSpreadsheet, 
  Download,
  ChevronDown, 
  Users, 
  Calendar,
  ExternalLink,
  LayoutDashboard,
  Store,
  Save,
  Loader2,
  TrendingUp,
  X,
  Upload,
  UploadCloud,
  Target
} from 'lucide-react';
import { cn, formatShortCurrency } from '../utils';
import { useNotification } from '../../../contexts/NotificationContext';

interface InputSectionProps {
  marketInput: string;
  setMarketInput: (val: string) => void;
  categoryInput: string;
  setCategoryInput: (val: string) => void;
  categoryTargetInput: string;
  setCategoryTargetInput: (val: string) => void;
  categoryRevenueInput: string;
  setCategoryRevenueInput: (val: string) => void;
  manualAdjustment: number;
  setManualAdjustment: (val: number) => void;
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  daysPassed: number;
  setDaysPassed: (val: number) => void;
  totalDays: number;
  setTotalDays: (val: number) => void;
  ycxFileName: string;
  setYcxFileName: (val: string) => void;
  linkBcTongHop: string;
  setLinkBcTongHop: (val: string) => void;
  linkNganhHangTongHop: string;
  setLinkNganhHangTongHop: (val: string) => void;
  clusterSummaryInput: string;
  setClusterSummaryInput: (val: string) => void;
  clusterCategoryInput: string;
  setClusterCategoryInput: (val: string) => void;
  setYcxData: (data: string) => void;
  ycxData: string;
  onAnalyze: () => void;
  onSaveRealtime: (silent?: boolean) => void;
  clearField?: (setter: (val: string) => void) => void;
  onSaveLuyke: (isSilent?: boolean, source?: 'staff' | 'targets' | 'auto' | string, storeName?: string, overrideTargets?: any[], fieldName?: string) => void;
  onSyncRealtime: () => void;
  activeStore: string;
  onSyncFromRealtime: () => void;
  onLoadRealtime: () => void;
  isSavingRealtime: boolean;
  isLoadingRealtime: boolean;
  isProcessingLuyke: boolean;
  isLoadingLuyke: boolean;
  isSavingStaff?: boolean;
  isSavingTargets?: boolean;
  staffListInput: string;
  setStaffListInput: (val: string) => void;
  staffListFileName: string;
  setStaffListFileName: (val: string) => void;
  handleStaffListUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  staffInput: string;
  setStaffInput: (val: string) => void;
  staffCategoryInput: string;
  setStaffCategoryInput: (val: string) => void;
  categoryTargets: { name: string; target: number; adjustedTarget: number; percent: number; type?: 'SL' | 'DT' | 'ALL' }[];
  setCategoryTargets: (val: any[]) => void;
  stName: string;
  setStName: (val: string) => void;
  isLuykeSynced?: boolean;
  stDtlk: number;
  setStDtlk: (val: number) => void;
  stDtqd: number;
  setStDtqd: (val: number) => void;
  stDtDuKienQD: number;
  setStDtDuKienQD: (val: number) => void;
  stPercentHTTargetDuKienQD: number;
  setStPercentHTTargetDuKienQD: (val: number) => void;
  stTargetQuyDoi: number;
  setStTargetQuyDoi: (val: number) => void;
  stPercentTarget: number;
  setStPercentTarget: (val: number) => void;
  stTargetSauHeSo: number;
  onSaveStoreRevenue: () => void;
  onLoadStoreRevenue: () => void;
  updateStoreSettings?: (storeName: string, settings: any) => Promise<void>;
  isSavingStoreRevenue: boolean;
  isLoadingStoreRevenue?: boolean;
  isValidStoreName?: (name: string) => boolean;
  VALID_STORE_PREFIXES?: string[];
  lastUpdatedRealtime?: Date | null;
  isYcxDirty?: boolean;
  showAll?: boolean;
  activeTab: 'REALTIME' | 'LUY_KE' | 'THOI_GIAN' | 'NHAN_VIEN' | 'TARGET_NGANH_HANG' | 'TARGET_DOANH_THU' | 'RESOURCES';
  availableMarkets?: string[];
  onStoreChange?: (store: string) => void;
  banKemNv?: string;
  setBanKemNv?: (val: string) => void;
  phucVu?: string;
  setPhucVu?: (val: string) => void;
  tragopMatran?: string;
  setTragopMatran?: (val: string) => void;
  syncTragopMatran?: () => void;
  tragopNv?: string;
  setTragopNv?: (val: string) => void;
  allStoresCache?: Record<string, {
    staffInput: string;
    staffCategoryInput: string;
    banKemNv: string;
    phucVu: string;
    tragopMatran: string;
    tragopNv: string;
    stPercentTarget: number;
    categoryTargets: any[];
  }>;
}

const InputSection: React.FC<InputSectionProps> = ({
  marketInput, setMarketInput,
  categoryInput, setCategoryInput,
  categoryTargetInput, setCategoryTargetInput,
  categoryRevenueInput, setCategoryRevenueInput,
  manualAdjustment, setManualAdjustment,
  selectedMonth, setSelectedMonth,
  daysPassed, setDaysPassed,
  totalDays, setTotalDays,
  ycxFileName, setYcxFileName,
  linkBcTongHop, setLinkBcTongHop,
  linkNganhHangTongHop, setLinkNganhHangTongHop,
  clusterSummaryInput, setClusterSummaryInput,
  clusterCategoryInput, setClusterCategoryInput,
  setYcxData,
  ycxData,
  onAnalyze,
  onSaveRealtime,
  clearField,
  onSaveLuyke,
  onSyncRealtime,
  activeStore,
  onSyncFromRealtime,
  onLoadRealtime,
  isSavingRealtime,
  isLoadingRealtime,
  isProcessingLuyke,
  isLoadingLuyke,
  isSavingStaff = false,
  isSavingTargets = false,
  staffListInput,
  setStaffListInput,
  staffListFileName,
  setStaffListFileName,
  handleStaffListUpload,
  staffInput,
  setStaffInput,
  staffCategoryInput,
  setStaffCategoryInput,
  categoryTargets,
  setCategoryTargets,
  isLuykeSynced,
  banKemNv,
  setBanKemNv,
  phucVu,
  setPhucVu,
  tragopMatran,
  setTragopMatran,
  syncTragopMatran,
  tragopNv,
  setTragopNv,
  stName, setStName,
  stDtlk, setStDtlk,
  stDtqd, setStDtqd,
  stDtDuKienQD, setStDtDuKienQD,
  stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD,
  stTargetQuyDoi, setStTargetQuyDoi,
  stPercentTarget, setStPercentTarget,
  stTargetSauHeSo,
  onSaveStoreRevenue,
  onLoadStoreRevenue,
  updateStoreSettings,
  isSavingStoreRevenue,
  isLoadingStoreRevenue = false,
  isValidStoreName,
  VALID_STORE_PREFIXES = [],
  lastUpdatedRealtime,
  isYcxDirty,
  showAll = true,
  activeTab,
  availableMarkets = [],
  onStoreChange,
  allStoresCache
}) => {
  const { showNotification } = useNotification();
  const [innerTab, setInnerTab] = useState<'DU_LIEU_NGUON' | 'TARGET_DOANH_THU' | 'TARGET_THI_DUA'>('DU_LIEU_NGUON');

  const handleResetAllData = () => {
    if (!window.confirm("Bạn có chắc chắn muốn reset toàn bộ dữ liệu khai báo của siêu thị này?")) return;

    // Clear all inputs
    setMarketInput('');
    setCategoryInput('');
    setCategoryTargetInput('');
    setCategoryRevenueInput('');
    setClusterSummaryInput('');
    if (setClusterCategoryInput) setClusterCategoryInput('');
    setYcxData('');
    setYcxFileName('');
    setStaffInput('');
    setStaffCategoryInput('');
    setStaffListInput('');
    setStaffListFileName('');
    setCategoryTargets([]);

    if (setBanKemNv) setBanKemNv('');
    if (setPhucVu) setPhucVu('');
    if (setTragopMatran) setTragopMatran('');
    if (setTragopNv) setTragopNv('');

    // Clear localStorage
    localStorage.removeItem('rtst_market_input');
    localStorage.removeItem('rtst_category_input');
    localStorage.removeItem('rtst_ycx_data');
    localStorage.removeItem('rtst_ycx_file_name');
    localStorage.removeItem('rtst_cluster_summary_input');
    localStorage.removeItem('rtst_cluster_category_input');
    localStorage.removeItem('rtst_category_revenue_input');
    localStorage.removeItem('RTST_CATEGORY_TARGET_INPUT');

    // Trigger save to Supabase
    setTimeout(() => {
      onSaveRealtime(true);
      if (onSaveLuyke) onSaveLuyke(true, 'auto');
      showNotification('Đã reset toàn bộ dữ liệu khai báo thành công!', 'success');
    }, 200);
  };

  const handlePhucVuUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!stName || stName === 'ALL') {
      showNotification('Vui lòng chọn một siêu thị cụ thể để tải dữ liệu Phục vụ!', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) throw new Error('Nội dung file rỗng hoặc không thể đọc');

        let tsvOutput = '';
        let workBook: XLSX.WorkBook | null = null;

        try {
          workBook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        } catch (err) {
          try {
            const binary = new TextDecoder('latin1').decode(buffer);
            workBook = XLSX.read(binary, { type: 'binary' });
          } catch (e2) {
            try {
              const text = new TextDecoder('utf-8').decode(buffer);
              workBook = XLSX.read(text, { type: 'string' });
            } catch (e3) {
              throw new Error('Định dạng file không được hỗ trợ hoặc file bị hỏng');
            }
          }
        }

        if (workBook && workBook.SheetNames.length > 0) {
          const firstSheetName = workBook.SheetNames[0];
          const worksheet = workBook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

          if (rows && rows.length > 0) {
            tsvOutput = rows
              .filter(row => Array.isArray(row))
              .map(row => row.map(cell => {
                const val = cell === null || cell === undefined ? '' : String(cell);
                return val.replace(/\t|\n|\r/g, ' ').trim();
              }).join('\t'))
              .join('\n');
          }
        }

        if (!tsvOutput || tsvOutput.trim() === '') throw new Error('Không tìm thấy dữ liệu hợp lệ trong file');
        
        console.log('[PhucVu Upload] stName:', stName, '| activeStore:', activeStore, '| setPhucVu type:', typeof setPhucVu, '| data length:', tsvOutput.length);
        if (setPhucVu) {
          try {
            await Promise.resolve(setPhucVu(tsvOutput));
            console.log('[PhucVu Upload] savePhucVu completed successfully');
          } catch (saveErr: any) {
            console.error('[PhucVu Upload] savePhucVu FAILED:', saveErr);
            throw saveErr;
          }
        } else {
          console.error('[PhucVu Upload] setPhucVu is NULL/UNDEFINED!');
        }
        showNotification('Tải file và lưu dữ liệu Phục vụ thành công!', 'success');
      } catch (error: any) {
        const finalErrorMsg = error?.message || (typeof error === 'string' ? error : 'Sai định dạng file');
        showNotification(`Lỗi: ${finalErrorMsg}. Vui lòng kiểm tra lại file.`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Per-store config data for "CẤU HÌNH SIÊU THỊ" card
  // tragop_matran and tragop_nv now come from Firebase via props
  // Other fields still use localStorage as fallback
  const storeConfigKey = (field: string) => `cauhinh_${activeStore}_${field}`;
  const [storeConfig, setStoreConfig] = useState<Record<string, string>>({});

  // Load per-store config when activeStore changes
  React.useEffect(() => {
    if (!activeStore || activeStore === 'ALL') return;
    const localFields = ['bc_dt_nh_rt', 'bc_dt_nh_lk', 'bc_dt_nv_dt', 'bc_dt_nv_td', 'bc_dt_nv_hq'];
    const loaded: Record<string, string> = {};
    localFields.forEach(f => { loaded[f] = localStorage.getItem(storeConfigKey(f)) || ''; });
    // tragop_matran and tragop_nv come from Firebase props
    loaded['tragop_matran'] = tragopMatran || '';
    loaded['tragop_nv'] = tragopNv || '';
    setStoreConfig(loaded);
  }, [activeStore, tragopMatran, tragopNv]);

  const updateStoreConfig = (field: string, value: string) => {
    setStoreConfig(prev => ({ ...prev, [field]: value }));
    // tragop fields go to Firebase via props, others to localStorage
    if (field === 'tragop_matran' && setTragopMatran) {
      setTragopMatran(value);
    } else if (field === 'tragop_nv' && setTragopNv) {
      setTragopNv(value);
    } else {
      localStorage.setItem(storeConfigKey(field), value);
    }
  };

  const clearStoreConfig = (field: string) => {
    setStoreConfig(prev => ({ ...prev, [field]: '' }));
    if (field === 'tragop_matran' && setTragopMatran) {
      setTragopMatran('');
    } else if (field === 'tragop_nv' && setTragopNv) {
      setTragopNv('');
    } else {
      localStorage.removeItem(storeConfigKey(field));
    }
  };

  const [showTimeSettings, setShowTimeSettings] = useState(true);
  const [showRealtime, setShowRealtime] = useState(true);
  const [showClusterData, setShowClusterData] = useState(true);
  const [showStaffData, setShowStaffData] = useState(true);
  const [showTargetData, setShowTargetData] = useState(true);
  const [showStoreRevenueData, setShowStoreRevenueData] = useState(true);
  const [expandedInput, setExpandedInput] = useState<string | null>(null);
  const toggleInput = (id: string) => setExpandedInput(prev => prev === id ? null : id);
  const [savingRow, setSavingRow] = useState<string | null>(null);

  // Per-store data cache logic has been removed here because it was causing data leakage 
  // between stores due to race conditions during React renders.
  // We now rely entirely on the perfectly synchronized `allStoresCache` passed via props
  // which is maintained by the Singleton Global Cache in useLuykeData.ts.
  const [globalPercent, setGlobalPercent] = useState(() => {
    const saved = localStorage.getItem('rtst_global_percent');
    return saved ? Number(saved) : 100;
  });

  const handleGlobalPercentChange = (val: number) => {
    setGlobalPercent(val);
    localStorage.setItem('rtst_global_percent', String(val));
  };

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
      // Điều này giúp dữ liệu trong Database "sạch" hơn và đồng nhất với các ô nhập liệu khác (BI Tổng quan, BI Ngành hàng).
      const rawString = cleanedData.map(row => 
        (Array.isArray(row) ? row : []).map(cell => cell === null || cell === undefined ? '' : String(cell)).join('\t')
      ).join('\n');
      
      setYcxData(rawString);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Data Realtime Container - Redesigned */}
      {activeTab === 'REALTIME' && (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-black text-slate-700 tracking-tight">CẬP NHẬT DỮ LIỆU</h1>
            <p className="text-[12px] text-slate-400 mt-1">Bấm vào các ô và dán dữ liệu (Ctrl+V) từ báo cáo BI.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetAllData}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
              title="Reset toàn bộ dữ liệu khai báo"
            >
              <RefreshCw size={12} className={cn((isSavingRealtime || isLoadingRealtime) && "animate-spin")} />
              <span>RESET DỮ LIỆU</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl">
              <div className={cn("w-2.5 h-2.5 rounded-full", (isSavingRealtime || isLoadingRealtime) ? "bg-amber-400 animate-pulse" : "bg-emerald-500")} />
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                {isSavingRealtime ? "Đang lưu..." : isLoadingRealtime ? "Đang tải..." : lastUpdatedRealtime ? `Dữ liệu đã cập nhật ${lastUpdatedRealtime.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}` : "Sẵn sàng"}
              </span>
            </div>
          </div>
        </div>

        {showAll && showRealtime && (
        <div className="space-y-8">
          {/* Two Groups: BÁO CÁO TỔNG HỢP + THI ĐUA CỤM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { title: 'BÁO CÁO TỔNG HỢP', color: 'bg-slate-700', items: [
                { id: 'rt_market', label: 'REALTIME DT', value: marketInput, onChange: setMarketInput, onBlur: () => onSaveRealtime(false), hasData: !!marketInput },
                { id: 'rt_catrev', label: 'LUỸ KẾ DT', value: clusterSummaryInput || categoryRevenueInput, onChange: (val: string) => { setCategoryRevenueInput(val); setClusterSummaryInput(val); }, onBlur: () => { onSaveRealtime(false); onSaveLuyke(false, 'auto', undefined, undefined, 'LUỸ KẾ DT'); }, hasData: !!(clusterSummaryInput || categoryRevenueInput), isLuyke: true },
              ]},
              { title: 'THI ĐUA CỤM', color: 'bg-orange-500', hasYcx: false, items: [
                { id: 'rt_cat', label: 'REALTIME TĐ', value: categoryInput, onChange: setCategoryInput, onBlur: () => onSaveRealtime(false), hasData: !!categoryInput },
                { id: 'rt_catlk', label: 'LUỸ KẾ TĐ', value: categoryTargetInput || clusterCategoryInput, onChange: (val: string) => { setCategoryTargetInput(val); setClusterCategoryInput && setClusterCategoryInput(val); }, onBlur: () => { onSaveRealtime(false); onSaveLuyke && onSaveLuyke(false, 'auto', undefined, undefined, 'LUỸ KẾ TĐ'); }, hasData: !!(categoryTargetInput || clusterCategoryInput) },
              ]},
            ].map(group => (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("w-1.5 h-5 rounded-full", group.color)} />
                  <h2 className="text-[13px] font-black text-slate-600 uppercase tracking-wider">{group.title}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map(item => (
                    <div key={item.id} className="flex flex-col gap-2">
                      <div className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left",
                        item.hasData ? "border-teal-200 bg-teal-50/30 shadow-sm" : "border-slate-200 bg-white"
                      )}>
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          item.hasData ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {item.hasData ? <Globe size={16} /> : <Download size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={cn("text-[12px] font-black uppercase tracking-wide", item.hasData ? "text-teal-700" : "text-slate-500")}>{item.label}</span>
                          {item.hasData && lastUpdatedRealtime && ('isLuyke' in item && (item as any).isLuyke) && (
                            <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5"><Calendar size={8} /> {lastUpdatedRealtime.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} {lastUpdatedRealtime.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</p>
                          )}
                        </div>
                        {item.hasData && (
                          <button onClick={(e) => { e.stopPropagation(); clearField ? clearField(item.onChange) : item.onChange(''); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 cursor-pointer" title="Xoá dữ liệu">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <textarea
                        value={item.value}
                        onChange={(e) => item.onChange(e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedText = e.clipboardData.getData('text');
                          if (pastedText) {
                            item.onChange(pastedText);
                          }
                        }}
                        onBlur={item.onBlur}
                        rows={3}
                        placeholder="Dán dữ liệu (Ctrl+V)..."
                        className="w-full bg-white border-2 border-slate-200 focus:border-blue-400 rounded-xl p-3 text-[11px] focus:ring-4 focus:ring-blue-100 outline-none resize-none font-sans font-normal transition-all"
                      />
                    </div>
                  ))}
                </div>
                {group.hasYcx && (
                  <label className="mt-3 flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", ycxFileName ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400")}>
                      <FileSpreadsheet size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className={cn("text-[12px] font-black uppercase tracking-wide", ycxFileName ? "text-teal-700" : "text-slate-500")}>YCX NHÂN VIÊN</span>
                      {ycxFileName && <p className="text-[9px] text-slate-400 truncate max-w-[200px]">{ycxFileName}</p>}
                    </div>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
                  </label>
                )}
              </div>
            ))}
          </div>


        </div>
        )}
      </div>
      )}



      {/* CẤU HÌNH SIÊU THỊ - New Independent Card */}
      {activeTab === 'REALTIME' && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-7 rounded-full bg-slate-700" />
              <h2 className="text-[15px] font-black text-slate-700 uppercase tracking-tight">CẤU HÌNH SIÊU THỊ</h2>
            </div>
            {availableMarkets.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button
                onClick={() => onStoreChange?.('ALL')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all active:scale-95",
                  activeStore === 'ALL'
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                )}
              >
                <LayoutGrid size={14} />
                TẤT CẢ
              </button>
              {(() => {
                const prefixOrder = ['ĐML', 'ĐMM', 'TGD', 'ĐMS', 'ĐM3'];
                const getPrefixRank = (name: string) => {
                  const upper = name.toUpperCase();
                  for (let i = 0; i < prefixOrder.length; i++) {
                    if (upper.startsWith(prefixOrder[i])) return i;
                  }
                  return prefixOrder.length;
                };
                return [...availableMarkets]
                  .filter(name => {
                    const normName = (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
                    return !normName.includes('kho ban hang luu dong');
                  })
                  .sort((a, b) => getPrefixRank(a) - getPrefixRank(b))
                  .map(name => (
                <button
                  key={name}
                  onClick={() => onStoreChange?.(name)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all active:scale-95",
                    activeStore === name
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-200"
                      : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                  )}
                >
                  <Store size={14} />
                  {name}
                </button>
              ));
              })()}
            </div>
            )}
          </div>
        </div>

        {/* Inner Tabs */}
        {/* Single tab - no tab switcher needed */}

        {/* Per-store cards side by side */}
        <div className="p-6">
          {(availableMarkets || []).filter(m => m !== 'ALL').length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">Chưa có siêu thị nào. Vui lòng nhập dữ liệu tại "BÁO CÁO TỔNG HỢP" hoặc "THI ĐUA CỤM" trước.</p>
            </div>
          ) : (
          <div className={cn(
            "grid gap-6",
            (availableMarkets || []).filter(m => m !== 'ALL').length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
          )}>
            {(() => {
              const LEFT_PREFIXES = ['ĐML', 'ĐMM', 'TGD', 'ĐMS'];
              const stores = (availableMarkets || []).filter(m => m !== 'ALL');
              const sorted = [...stores].sort((a, b) => {
                const aUpper = a.toUpperCase();
                const bUpper = b.toUpperCase();
                const aIdx = LEFT_PREFIXES.findIndex(p => aUpper.startsWith(p));
                const bIdx = LEFT_PREFIXES.findIndex(p => bUpper.startsWith(p));
                // Both have priority prefix → sort by prefix order
                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                // Only a has prefix → a first (left)
                if (aIdx !== -1) return -1;
                // Only b has prefix → b first (left)
                if (bIdx !== -1) return 1;
                // Neither has prefix → keep original order
                return 0;
              });
              return sorted;
            })().map((storeName, storeIdx) => {
              const cardColors = [
                { border: 'from-pink-400 via-purple-400 to-indigo-400', activeBadge: 'bg-indigo-600 text-white' },
                { border: 'from-cyan-400 via-blue-400 to-indigo-400', activeBadge: 'bg-blue-600 text-white' },
                { border: 'from-amber-400 via-orange-400 to-rose-400', activeBadge: 'bg-orange-600 text-white' },
                { border: 'from-emerald-400 via-teal-400 to-cyan-400', activeBadge: 'bg-teal-600 text-white' },
              ];
              const color = cardColors[storeIdx % cardColors.length];
              const isActiveCard = activeStore === storeName;

              // Per-store data: active card uses live state, inactive card uses the global allStoresCache
              const cachedData = allStoresCache?.[storeName];
              const cardStaffInput = isActiveCard ? staffInput : (cachedData?.staffInput || '');
              const cardStaffCategoryInput = isActiveCard ? staffCategoryInput : (cachedData?.staffCategoryInput || '');
              const cardBanKemNv = isActiveCard ? (banKemNv || '') : (cachedData?.banKemNv || '');
              const cardTragopMatran = isActiveCard ? (storeConfig['tragop_matran'] || '') : (cachedData?.tragopMatran || '');
              const cardTragopNv = isActiveCard ? (storeConfig['tragop_nv'] || '') : (cachedData?.tragopNv || '');
              const cardPhucVu = isActiveCard ? (phucVu || '') : (cachedData?.phucVu || '');
              const cardPercentTarget = isActiveCard ? stPercentTarget : (cachedData?.stPercentTarget || 0);
              const cardCategoryTargets = isActiveCard ? categoryTargets : (cachedData?.categoryTargets || []);

              const handleCardActivate = () => {
                if (!isActiveCard && onStoreChange) {
                  onStoreChange(storeName);
                }
              };

              const storeFields = [
                { key: `${storeName}_dt_nv`, label: 'DOANH THU NV', value: cardStaffInput, setter: isActiveCard ? setStaffInput : undefined, biLink: 'https://bi.thegioididong.com/sieu-thi-con?id=16500&tab=bcdtnv&rt=2&dm=1' },
                { key: `${storeName}_td_nv`, label: 'THI ĐUA NV', value: cardStaffCategoryInput, setter: isActiveCard ? setStaffCategoryInput : undefined },
                { key: `${storeName}_hq_nv`, label: 'HQ BÁN KÈM NV', value: cardBanKemNv, setter: isActiveCard ? setBanKemNv : undefined },
                { key: `${storeName}_matran`, label: 'MA TRẬN NH', value: cardTragopMatran, isConfig: true, configKey: 'tragop_matran' },
                { key: `${storeName}_tragop`, label: 'TRẢ GÓP NV', value: cardTragopNv, isConfig: true, configKey: 'tragop_nv' },
              ];

              return (
                <div 
                  key={storeName} 
                  className={cn(
                    "rounded-2xl overflow-hidden bg-white transition-all",
                    isActiveCard 
                      ? "shadow-sm border border-slate-200" 
                      : "shadow-sm border border-slate-200 cursor-pointer opacity-60 hover:opacity-100"
                  )}
                  onClick={!isActiveCard ? handleCardActivate : undefined}
                >
                  {/* Thin gradient top border */}
                  <div className={cn("h-1 bg-gradient-to-r", color.border)} />

                  {/* Store Card Header — clean white */}
                  <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{storeName}</h3>
                      <p className="text-[10px] text-slate-400 font-black">Thống kê dữ liệu siêu thị.</p>
                    </div>
                    {isActiveCard ? (
                      <span className={cn("text-[9px] font-black px-3 py-1.5 rounded-lg", color.activeBadge)}>ĐANG CHỌN</span>
                    ) : (
                      <span className="text-[9px] font-black text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">BẤM ĐỂ CHỌN</span>
                    )}
                  </div>

                  {/* Store Card Body */}
                  <div className="p-4 space-y-2 bg-white">
                    {storeFields.map(item => {
                      const val = item.value || '';
                      const hasData = !!val;
                      const handleChange = (v: string) => {
                        if (!isActiveCard) { handleCardActivate(); return; }
                        if (item.isConfig && item.configKey) {
                          updateStoreConfig(item.configKey, v);
                        } else if (item.setter) {
                          item.setter(v);
                        }
                      };
                      const handleClear = () => {
                        if (!isActiveCard) return;
                        if (item.isConfig && item.configKey) {
                          clearStoreConfig(item.configKey);
                          // Config fields also need DB save
                          setTimeout(() => onSaveLuyke(true, 'auto'), 200);
                        } else if (item.setter) {
                          if (clearField) clearField(item.setter);
                          else item.setter('');
                          // clearField now handles DB save internally via saveLuykeDataRef
                        }
                      };

                      return (
                        <div key={item.key}>
                          <button 
                            onClick={() => { handleCardActivate(); toggleInput(item.key); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed transition-all text-left",
                              expandedInput === item.key ? "border-blue-400 bg-blue-50/50 shadow-md" :
                              hasData ? "border-teal-200 bg-teal-50/30 hover:shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                            )}
                          >
                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", hasData ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400")}>
                              <Upload size={13} />
                            </div>
                            <span className={cn("text-[11px] font-black uppercase tracking-wide flex-1", hasData ? "text-teal-700" : "text-slate-500")}>{item.label}</span>
                            {(item as any).biLink && (
                              <a href={(item as any).biLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-amber-500 hover:text-amber-600 shrink-0" title="Mở BI">
                                <ExternalLink size={12} />
                              </a>
                            )}
                            {hasData && (
                              <div onClick={(e) => { e.stopPropagation(); handleClear(); }} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0" title="Xoá dữ liệu">
                                <X size={12} />
                              </div>
                            )}
                          </button>
                          {expandedInput === item.key && isActiveCard && (
                            <div className="relative w-full mt-1.5">
                              <textarea 
                                value={val} 
                                onChange={(e) => handleChange(e.target.value)} 
                                onPaste={(e) => { e.preventDefault(); const t = e.clipboardData.getData('text'); if (t) { handleChange(t); } }} 
                                onBlur={() => onSaveLuyke(false, 'auto', undefined, undefined, item.label)} 
                                rows={3} 
                                autoFocus 
                                placeholder="Dán dữ liệu (Ctrl+V)..." 
                                className={cn(
                                  "w-full bg-white border-2 border-blue-200 rounded-xl p-2.5 text-[10px] focus:ring-2 focus:ring-blue-400 outline-none resize-none font-sans font-normal shadow-inner",
                                  item.configKey === 'tragop_matran' && "pb-10"
                                )} 
                              />
                              {item.configKey === 'tragop_matran' && syncTragopMatran && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    syncTragopMatran();
                                  }}
                                  className="absolute right-2.5 bottom-2.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer z-10"
                                >
                                  Đồng bộ từ Khai báo
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Phục vụ upload */}
                    <div className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed transition-all group relative",
                      !isActiveCard ? "cursor-pointer" : "cursor-pointer",
                      cardPhucVu ? "border-teal-200 bg-teal-50/30 hover:shadow-md" : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-slate-100"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cardPhucVu ? "bg-teal-100 text-teal-600" : "bg-indigo-100 text-indigo-600")}>
                          <UploadCloud size={13} />
                        </div>
                        <span className={cn("text-[11px] font-black uppercase tracking-wide", cardPhucVu ? "text-teal-700" : "text-slate-700")}>
                          {cardPhucVu ? 'ĐÃ TẢI DỮ LIỆU' : 'CHỌN FILE DỮ LIỆU'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border", cardPhucVu ? "text-teal-500 bg-white border-teal-200" : "text-slate-400 bg-white border-slate-200")}>
                          BÁO CÁO PHỤC VỤ
                        </div>
                        {cardPhucVu && isActiveCard && (
                          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (setPhucVu) setPhucVu(''); }} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 z-20 relative cursor-pointer" title="Xoá dữ liệu">
                            <X size={12} />
                          </div>
                        )}
                      </div>
                      {isActiveCard && (
                        <input type="file" onChange={handlePhucVuUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title={cardPhucVu ? "Nhấn để tải đè file mới" : "Nhấn để chọn file"} />
                      )}
                    </div>

                    {/* % TARGET input — per-store */}
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-white">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cardPercentTarget ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400")}>
                          <Target size={13} />
                        </div>
                        <span className={cn("text-[11px] font-black uppercase tracking-wide", cardPercentTarget ? "text-teal-700" : "text-slate-500")}>% TARGET</span>
                      </div>
                      <input 
                        type="number" 
                        value={cardPercentTarget || ''} 
                        onChange={(e) => { if (isActiveCard) setStPercentTarget(Number(e.target.value)); else handleCardActivate(); }}
                        onBlur={() => { 
                          if (isActiveCard) {
                            if (updateStoreSettings) {
                              updateStoreSettings(storeName, { stPercentTarget: cardPercentTarget });
                            } else {
                              onSaveStoreRevenue(); 
                            }
                          }
                        }}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') {
                            e.currentTarget.blur(); 
                          }
                        }}
                        placeholder="0" 
                        disabled={!isActiveCard}
                        className={cn(
                          "w-20 border rounded-lg p-1.5 text-xs font-sans font-normal text-center outline-none transition-all",
                          isActiveCard ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500" : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400"
                        )} 
                      />
                    </div>

                    {/* TARGET THI ĐUA — per-store, collapsible */}
                    {cardCategoryTargets.length > 0 && (
                    <div className="mt-1 border-2 border-dashed border-violet-200 rounded-xl overflow-hidden">
                      <button 
                        onClick={() => toggleInput(`${storeName}_thidua`)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-all",
                          expandedInput === `${storeName}_thidua` ? "bg-violet-50" : "bg-white hover:bg-violet-50/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-violet-100 text-violet-600">
                            <Zap size={13} />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-wide text-violet-700">TARGET THI ĐUA</span>
                        </div>
                        <ChevronDown size={14} className={cn("text-violet-400 transition-transform", expandedInput === `${storeName}_thidua` && "rotate-180")} />
                      </button>
                      {expandedInput === `${storeName}_thidua` && (
                        <div className="p-3 border-t border-violet-100 space-y-4">
                          {/* Toolbar — only for active card */}
                          {isActiveCard && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={onAnalyze} className="px-3 py-1.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-violet-100 transition-all active:scale-95 flex items-center gap-1">
                              <Zap size={10} /> ĐỒNG BỘ
                            </button>
                            <input type="number" value={globalPercent} onChange={(e) => handleGlobalPercentChange(Number(e.target.value))} className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-sans font-normal text-center" placeholder="%" />
                             <button onClick={() => { const nt = categoryTargets.map(item => ({ ...item, percent: globalPercent, adjustedTarget: item.target * (globalPercent / 100) })); setCategoryTargets(nt); onSaveLuyke(false, 'targets', undefined, nt, 'TARGET THI ĐUA'); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-indigo-700 transition-all active:scale-95">ÁP DỤNG ALL</button>
                            <button onClick={() => onSaveLuyke(false, 'targets', undefined, undefined, 'TARGET THI ĐUA')} disabled={isSavingTargets} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50">
                              {isSavingTargets ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} LƯU
                            </button>
                          </div>
                          )}
                          {/* Tables */}
                          {['SL', 'DT'].map(type => {
                            const items = cardCategoryTargets.filter(item => type === 'SL' ? item.type === 'SL' : item.type !== 'SL');
                            if (items.length === 0) return null;
                            return (
                              <div key={type}>
                                <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase">Ngành hàng ({type})</h4>
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="text-[9px] text-slate-400 uppercase tracking-widest">
                                      <th className="p-1.5">Tên NH</th>
                                      <th className="p-1.5">Target</th>
                                      <th className="p-1.5">Sau ĐC</th>
                                      <th className="p-1.5 text-center">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map(item => (
                                      <tr key={item.name} className="border-t border-slate-100">
                                        <td className="p-1.5 text-[10px] font-black">{item.name}</td>
                                        <td className="p-1.5 text-[10px]">{item.target.toLocaleString()}</td>
                                        <td className="p-1.5 text-[10px] font-black text-indigo-600">{item.adjustedTarget.toLocaleString()}</td>
                                        <td className="p-1.5 text-center">
                                          <input type="number" value={item.percent} onChange={(e) => { if (!isActiveCard) return; const nv = Number(e.target.value); const nt = categoryTargets.map(t => t.name === item.name ? { ...t, percent: nv, adjustedTarget: t.target * (nv / 100) } : t); setCategoryTargets(nt); }} disabled={!isActiveCard} className={cn("w-14 border rounded p-1 text-[10px] text-center font-sans font-normal outline-none", isActiveCard ? "bg-slate-50 border-slate-200 focus:ring-1 focus:ring-indigo-500" : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400")} />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

      </div>
      )}

      {/* Time Settings Container */}
      {activeTab === 'REALTIME' && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Calendar size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">CÀI ĐẶT THỜI GIAN</h3>
          </div>
          <button 
            onClick={() => setShowTimeSettings(!showTimeSettings)}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
          >
            <ChevronDown size={20} className={cn("transition-transform duration-300", showTimeSettings && "rotate-180")} />
          </button>
        </div>
        
        {showAll && showTimeSettings && (
          <div className="p-4 md:p-6" style={{ overflow: 'visible' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ overflow: 'visible' }}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-500" /> THÁNG BÁO CÁO
                </label>
                {(() => {
                  const MONTHS = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
                  const [showPicker, setShowPicker] = React.useState(false);
                  const [pickerYear, setPickerYear] = React.useState(() => {
                    const [y] = (selectedMonth || '').split('-').map(Number);
                    return y || new Date().getFullYear();
                  });
                  const selectedYear = selectedMonth ? Number(selectedMonth.split('-')[0]) : 0;
                  const selectedMon = selectedMonth ? Number(selectedMonth.split('-')[1]) : 0;
                  const displayLabel = selectedMonth ? `Tháng ${selectedMon}/${selectedYear}` : 'Chọn tháng...';
                  const pickerRef = React.useRef<HTMLDivElement>(null);
                  
                  React.useEffect(() => {
                    const handler = (e: MouseEvent) => {
                      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
                    };
                    document.addEventListener('mousedown', handler);
                    return () => document.removeEventListener('mousedown', handler);
                  }, []);

                  return (
                    <div ref={pickerRef} className="relative">
                      <button
                        type="button"
                        onClick={() => { setShowPicker(!showPicker); setPickerYear(selectedYear || new Date().getFullYear()); }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 text-left flex items-center justify-between hover:bg-white hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar size={16} className="text-indigo-500" />
                          {displayLabel}
                        </span>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
                      </button>
                      {showPicker && (
                        <div className="absolute z-50 bottom-full mb-2 left-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <button type="button" onClick={() => setPickerYear(y => y - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 font-black transition-all">&lt;</button>
                            <span className="text-sm font-black text-slate-700">{pickerYear}</span>
                            <button type="button" onClick={() => setPickerYear(y => y + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 font-black transition-all">&gt;</button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {MONTHS.map((m, i) => {
                              const mon = i + 1;
                              const isSelected = pickerYear === selectedYear && mon === selectedMon;
                              const now = new Date();
                              const isCurrent = pickerYear === now.getFullYear() && mon === (now.getMonth() + 1);
                              return (
                                <button
                                  key={mon}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMonth(`${pickerYear}-${String(mon).padStart(2, '0')}`);
                                    setShowPicker(false);
                                  }}
                                  className={`py-2 px-1 rounded-xl text-xs font-black transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-md'
                                      : isCurrent
                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                                        : 'hover:bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {m}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" /> NGÀY ĐÃ QUA / TỔNG NGÀY
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    value={daysPassed}
                    readOnly
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-sans font-normal text-slate-500 cursor-not-allowed outline-none transition-all text-center"
                    title="Tự động: Tháng quá khứ = Tổng ngày; Tháng hiện tại = Ngày hiện tại - 1"
                  />
                  <span className="text-2xl font-light text-slate-300">/</span>
                  <input 
                    type="number"
                    value={totalDays}
                    readOnly
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-sans font-normal text-slate-500 cursor-not-allowed outline-none transition-all text-center"
                    title="Tổng số ngày trong tháng"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}







      {/* Resources Tab */}
      {activeTab === 'RESOURCES' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">TÀI NGUYÊN HỆ THỐNG</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:border-emerald-200 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                    <FileSpreadsheet size={24} />
                  </div>
                  <a 
                    href="https://docs.google.com/spreadsheets/d/1TVwVom8viDUQvaumJl91QT8wg7AOZpqchoV71lges5U/edit?usp=sharing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 active:scale-95"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Trang tính cập nhật dữ liệu</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Truy cập trang tính Google Sheets để cập nhật các thông số, danh mục và dữ liệu nguồn cho hệ thống.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  LIÊN KẾT TRỰC TIẾP
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copyright Footer */}
      <div className="text-center py-6 mt-4">
        <p className="text-xs font-black text-slate-400 tracking-widest uppercase">
          © LINH VU
        </p>
      </div>
    </div>
  );
};

export default InputSection;
