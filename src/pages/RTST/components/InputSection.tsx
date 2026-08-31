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
import { cleanBiReportText } from '../../../utils/rtstHelpers';
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
  forceDeleteAllData?: () => Promise<void>;
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
  forceDeleteAllData,
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);


  const handleResetAllData = async () => {
    setIsResetting(true);

    // Clear all local inputs immediately
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

    // FORCE DELETE from Firebase immediately — block all restore for 30s
    if (forceDeleteAllData) {
      await forceDeleteAllData();
    }

    showNotification('Đã XOÁ TOÀN BỘ dữ liệu trên Firebase thành công!', 'success');
    setIsResetting(false);
    setShowResetConfirm(false);
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
      setTimeout(() => {
        if (onSaveRealtime) {
          onSaveRealtime(true);
        }
      }, 100);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 mb-8" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
      {/* Data Realtime Container - Modern V2 Redesign */}
      {activeTab === 'REALTIME' && (
      <div className="space-y-6">
        {/* Header Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                  CẬP NHẬT DỮ LIỆU
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  V2.0 BI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                <span>⚡ Bấm vào từng ô và dán dữ liệu</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 font-mono">Ctrl + V</kbd>
                <span>từ báo cáo BI để tự động phân tích & đồng bộ.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-xs"
              title="Reset toàn bộ dữ liệu khai báo"
            >
              <RefreshCw size={14} className={cn((isSavingRealtime || isLoadingRealtime) && "animate-spin")} />
              <span>RESET DỮ LIỆU</span>
            </button>

            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
              <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", (isSavingRealtime || isLoadingRealtime) ? "bg-amber-500 animate-ping" : "bg-emerald-500")} />
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {isSavingRealtime ? "ĐANG LƯU DỮ LIỆU..." : isLoadingRealtime ? "ĐANG TẢI DỮ LIỆU..." : lastUpdatedRealtime ? `ĐÃ CẬP NHẬT ${lastUpdatedRealtime.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}` : "HỆ THỐNG SẴN SÀNG"}
              </span>
            </div>
          </div>
        </div>

        {showAll && showRealtime && (
        <div className="space-y-6">
          {/* Two Groups: BÁO CÁO TỔNG HỢP + THI ĐUA CỤM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { 
                title: 'BÁO CÁO TỔNG HỢP', 
                subtitle: 'Dữ liệu Doanh thu Realtime & Luỹ kế',
                badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                headerDot: 'bg-emerald-600',
                activeColor: 'emerald',
                reportUrl: 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated',
                reportLabel: 'LINK REPORT DT',
                items: [
                  { id: 'rt_market', label: 'REALTIME DT', value: marketInput, onChange: setMarketInput, onBlur: () => onSaveRealtime(false, 'REALTIME DT'), hasData: !!marketInput },
                  { id: 'rt_catrev', label: 'LUỸ KẾ DT', value: clusterSummaryInput || categoryRevenueInput, onChange: (val: string) => { setCategoryRevenueInput(val); setClusterSummaryInput(val); }, onBlur: () => { onSaveRealtime(false, 'LUỸ KẾ DT'); onSaveLuyke(false, 'auto', undefined, undefined, 'LUỸ KẾ DT'); }, hasData: !!(clusterSummaryInput || categoryRevenueInput), isLuyke: true },
                ]
              },
              { 
                title: 'THI ĐUA CỤM', 
                subtitle: 'Dữ liệu Thi đua Realtime & Luỹ kế theo kênh',
                badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
                headerDot: 'bg-amber-500',
                activeColor: 'amber',
                hasYcx: false,
                reportUrl: 'https://baocao.dienmayxanh.com/dashboard/thi-dua',
                reportLabel: 'LINK REPORT TĐ',
                items: [
                  { id: 'rt_cat', label: 'REALTIME TĐ', value: categoryInput, onChange: setCategoryInput, onBlur: () => onSaveRealtime(false, 'REALTIME TĐ'), hasData: !!categoryInput },
                  { id: 'rt_catlk', label: 'LUỸ KẾ TĐ', value: categoryTargetInput || clusterCategoryInput, onChange: (val: string) => { setCategoryTargetInput(val); setClusterCategoryInput && setClusterCategoryInput(val); }, onBlur: () => { onSaveRealtime(false, 'LUỸ KẾ TĐ'); onSaveLuyke && onSaveLuyke(false, 'auto', undefined, undefined, 'LUỸ KẾ TĐ'); }, hasData: !!(categoryTargetInput || clusterCategoryInput) },
                ]
              },
            ].map(group => (
              <div key={group.title} className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-2.5 h-6 rounded-full shrink-0", group.headerDot)} />
                    <div>
                      <h2 className="text-[15px] font-black text-slate-800 uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                        {group.title}
                      </h2>
                      <p className="text-[11px] font-medium text-slate-400">
                        {group.subtitle}
                      </p>
                    </div>
                  </div>
                  <a 
                    href={group.reportUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn("px-2.5 py-1 rounded-xl text-[11px] font-black uppercase border cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5", group.badgeBg)}
                  >
                    <ExternalLink size={12} />
                    {group.reportLabel}
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.items.map(item => (
                    <div key={item.id} className="flex flex-col gap-2">
                      <div className={cn(
                        "w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all text-left shadow-xs",
                        item.hasData 
                          ? group.activeColor === 'emerald'
                            ? "border-emerald-300 bg-gradient-to-r from-emerald-50/70 to-teal-50/50" 
                            : "border-amber-300 bg-gradient-to-r from-amber-50/70 to-orange-50/50"
                          : "border-slate-200 bg-slate-50/70 hover:bg-slate-50"
                      )}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors",
                            item.hasData 
                              ? group.activeColor === 'emerald' ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                              : "bg-white border border-slate-200 text-slate-400"
                          )}>
                            <Globe size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className={cn(
                              "text-xs font-black uppercase tracking-wide block truncate",
                              item.hasData 
                                ? group.activeColor === 'emerald' ? "text-emerald-900" : "text-amber-900"
                                : "text-slate-600"
                            )}>
                              {item.label}
                            </span>
                            {item.hasData && (
                              <span className={cn(
                                "text-[9px] font-extrabold uppercase",
                                group.activeColor === 'emerald' ? "text-emerald-600" : "text-amber-600"
                              )}>
                                ✓ ĐÃ NẠP DỮ LIỆU
                              </span>
                            )}
                          </div>
                        </div>

                        {item.hasData && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); if (clearField) { clearField(item.onChange); } else { item.onChange(''); } }} 
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shrink-0 cursor-pointer border border-transparent hover:border-rose-200" 
                            title="Xoá dữ liệu ô này"
                          >
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
                            setTimeout(() => {
                              if (item.onBlur) item.onBlur();
                              if (onSaveRealtime) onSaveRealtime(true);
                            }, 50);
                          }
                        }}
                        onBlur={item.onBlur}
                        rows={3}
                        placeholder="Dán dữ liệu (Ctrl + V) tại đây..."
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 rounded-2xl p-3 text-[13px] outline-none resize-none font-sans font-normal text-slate-800 transition-all shadow-inner placeholder:text-slate-300 placeholder:text-xs"
                      />
                    </div>
                  ))}
                </div>

                {group.hasYcx && (
                  <label className="mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer">
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

      {/* CẤU HÌNH SIÊU THỊ - Modern V2 Card */}
      {activeTab === 'REALTIME' && (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Store size={20} />
              </div>
              <div>
                <h2 className="text-[16px] font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  CẤU HÌNH SIÊU THỊ & NHÂN VIÊN
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  Dữ liệu Doanh thu NV, Thi đua NV, Bán kèm, Trả góp và Phục vụ
                </p>
              </div>
            </div>

            {availableMarkets.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => onStoreChange?.('ALL')}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 cursor-pointer",
                  activeStore === 'ALL'
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                )}
              >
                <LayoutGrid size={13} />
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
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 cursor-pointer",
                    activeStore === name
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  )}
                >
                  <Store size={13} />
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
                { key: `${storeName}_tragop`, label: 'TRẢ GÓP NV', value: cardTragopNv, isConfig: true, configKey: 'tragop_nv' },
              ];

              return (
                <div 
                  key={storeName} 
                  className={cn(
                    "rounded-3xl overflow-hidden bg-white transition-all shadow-sm",
                    isActiveCard 
                      ? "border-2 border-emerald-500/80 shadow-emerald-500/5 ring-4 ring-emerald-500/10" 
                      : "border border-slate-200 cursor-pointer opacity-70 hover:opacity-100 hover:border-slate-300"
                  )}
                  onClick={!isActiveCard ? handleCardActivate : undefined}
                >
                  {/* Gradient accent top stripe */}
                  <div className={cn("h-1.5 bg-gradient-to-r", color.border)} />

                  {/* Store Card Header */}
                  <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                        {storeName}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Cấu hình và dữ liệu chi tiết siêu thị
                      </p>
                    </div>
                    {isActiveCard ? (
                      <span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-500 text-white shadow-xs">
                        ĐANG CHỌN
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-slate-500 px-3 py-1 rounded-full border border-slate-200 bg-white shadow-xs">
                        BẤM ĐỂ CHỌN
                      </span>
                    )}
                  </div>

                  {/* Store Card Body */}
                  <div className="p-4 sm:p-5 space-y-2.5 bg-white">
                    {storeFields.map(item => {
                      const val = item.value || '';
                      const hasData = !!val;
                      const handleChange = (v: string) => {
                        if (!isActiveCard) { handleCardActivate(); return; }
                        const cleanV = cleanBiReportText(v);
                        if (item.isConfig && item.configKey) {
                          updateStoreConfig(item.configKey, cleanV);
                        } else if (item.setter) {
                          item.setter(cleanV);
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
                        }
                      };

                      return (
                        <div key={item.key} className="space-y-1.5">
                          <button 
                            onClick={() => { handleCardActivate(); toggleInput(item.key); }}
                            className={cn(
                              "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border transition-all text-left shadow-xs cursor-pointer active:scale-[0.99]",
                              expandedInput === item.key ? "border-indigo-400 bg-indigo-50/60 shadow-sm" :
                              hasData ? "border-emerald-300 bg-gradient-to-r from-emerald-50/60 to-teal-50/40" : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors",
                                hasData ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-400"
                              )}>
                                <Upload size={13} />
                              </div>
                              <span className={cn(
                                "text-xs font-black uppercase tracking-wide truncate",
                                hasData ? "text-emerald-900" : "text-slate-700"
                              )}>
                                {item.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {(item as any).biLink && (
                                <a 
                                  href={(item as any).biLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-amber-500 hover:text-amber-600 p-1 rounded-md hover:bg-amber-50 transition-colors" 
                                  title="Mở báo cáo BI"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}
                              {hasData && (
                                <div 
                                  onClick={(e) => { e.stopPropagation(); handleClear(); }} 
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer" 
                                  title="Xoá dữ liệu"
                                >
                                  <X size={13} />
                                </div>
                              )}
                            </div>
                          </button>

                          {expandedInput === item.key && isActiveCard && (
                            <div className="relative w-full">
                              <textarea 
                                value={val} 
                                onChange={(e) => handleChange(e.target.value)} 
                                onPaste={(e) => { e.preventDefault(); const t = e.clipboardData.getData('text'); if (t) { handleChange(t); } }} 
                                onBlur={() => onSaveLuyke(false, 'auto', undefined, undefined, item.label)} 
                                rows={3} 
                                autoFocus 
                                placeholder="Dán dữ liệu (Ctrl + V)..." 
                                className={cn(
                                  "w-full bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 rounded-2xl p-3 text-[13px] outline-none resize-none font-sans font-normal shadow-inner text-slate-800",
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
                                  className="absolute right-2.5 bottom-2.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer z-10"
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
                      "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border transition-all group relative shadow-xs",
                      cardPhucVu ? "border-emerald-300 bg-gradient-to-r from-emerald-50/60 to-teal-50/40" : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                    )}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                          cardPhucVu ? "bg-emerald-600 text-white" : "bg-indigo-50 border border-indigo-200 text-indigo-600"
                        )}>
                          <UploadCloud size={13} />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "text-xs font-black uppercase tracking-wide truncate",
                            cardPhucVu ? "text-emerald-900" : "text-slate-700"
                          )}>
                            {cardPhucVu ? 'ĐÃ TẢI DỮ LIỆU' : 'CHỌN FILE DỮ LIỆU'}
                          </span>
                          <a 
                            href="https://crm.thegioididong.com/Reviewuser/ReportCustomerRatings" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-600 hover:text-indigo-800 z-20 relative bg-indigo-50 hover:bg-indigo-100 p-1 rounded-md transition-colors"
                            title="Lấy file Báo cáo Phục vụ từ CRM"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-lg border",
                          cardPhucVu ? "text-emerald-700 bg-white border-emerald-200" : "text-slate-500 bg-white border-slate-200"
                        )}>
                          BÁO CÁO PHỤC VỤ
                        </div>
                        {cardPhucVu && isActiveCard && (
                          <div 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (setPhucVu) setPhucVu(''); }} 
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shrink-0 z-20 relative cursor-pointer" 
                            title="Xoá dữ liệu"
                          >
                            <X size={13} />
                          </div>
                        )}
                      </div>
                      {isActiveCard && (
                        <input type="file" onChange={handlePhucVuUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title={cardPhucVu ? "Nhấn để tải đè file mới" : "Nhấn để chọn file"} />
                      )}
                    </div>

                    {/* % TARGET input — per-store */}
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                          cardPercentTarget ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-400"
                        )}>
                          <Target size={13} />
                        </div>
                        <span className={cn(
                          "text-xs font-black uppercase tracking-wide",
                          cardPercentTarget ? "text-emerald-900" : "text-slate-600"
                        )}>
                          % TARGET
                        </span>
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
                          "w-20 border rounded-xl p-1.5 text-xs font-sans font-bold text-center outline-none transition-all shadow-inner",
                          isActiveCard ? "bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800" : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400"
                        )} 
                      />
                    </div>

                    {/* TARGET THI ĐUA — per-store, collapsible */}
                    {cardCategoryTargets.length > 0 && (
                    <div className="mt-2 border border-violet-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
                      <button 
                        onClick={() => toggleInput(`${storeName}_thidua`)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-all cursor-pointer",
                          expandedInput === `${storeName}_thidua` ? "bg-violet-50/80" : "bg-white hover:bg-violet-50/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-violet-600 text-white shadow-xs">
                            <Zap size={13} />
                          </div>
                          <span className="text-xs font-black uppercase tracking-wide text-violet-900">TARGET THI ĐUA</span>
                        </div>
                        <ChevronDown size={15} className={cn("text-violet-500 transition-transform", expandedInput === `${storeName}_thidua` && "rotate-180")} />
                      </button>
                      {expandedInput === `${storeName}_thidua` && (
                        <div className="p-3.5 border-t border-violet-100 space-y-4 bg-slate-50/30">
                          {/* Toolbar — only for active card */}
                          {isActiveCard && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={onAnalyze} className="px-3 py-1.5 bg-white text-violet-700 border border-violet-200 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-violet-50 transition-all active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer">
                              <Zap size={11} /> ĐỒNG BỘ
                            </button>
                            <input type="number" value={globalPercent} onChange={(e) => handleGlobalPercentChange(Number(e.target.value))} className="w-16 bg-white border border-slate-200 rounded-xl p-1.5 text-[12px] font-sans font-bold text-center shadow-inner" placeholder="%" />
                             <button onClick={() => { const nt = categoryTargets.map(item => ({ ...item, percent: globalPercent, adjustedTarget: item.target * (globalPercent / 100) })); setCategoryTargets(nt); onSaveLuyke(false, 'targets', undefined, nt, 'TARGET THI ĐUA'); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 shadow-xs cursor-pointer">ÁP DỤNG ALL</button>
                            <button onClick={() => onSaveLuyke(false, 'targets', undefined, undefined, 'TARGET THI ĐUA')} disabled={isSavingTargets} className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50 shadow-xs cursor-pointer">
                              {isSavingTargets ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} LƯU
                            </button>
                          </div>
                          )}
                          {/* Tables */}
                          {['SL', 'DT'].map(type => {
                            const items = cardCategoryTargets.filter(item => type === 'SL' ? item.type === 'SL' : item.type !== 'SL');
                            if (items.length === 0) return null;
                            return (
                              <div key={type} className="bg-white rounded-xl border border-slate-200 p-2.5">
                                <h4 className="text-[11px] font-black text-slate-500 mb-2 uppercase">Ngành hàng ({type})</h4>
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                      <th className="p-1.5">Tên NH</th>
                                      <th className="p-1.5">Target</th>
                                      <th className="p-1.5">Sau ĐC</th>
                                      <th className="p-1.5 text-center">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map(item => (
                                      <tr key={item.name} className="border-t border-slate-50">
                                        <td className="p-1.5 text-[11px] font-black text-slate-800">{item.name}</td>
                                        <td className="p-1.5 text-[11px] text-slate-600">{item.target.toLocaleString()}</td>
                                        <td className="p-1.5 text-[11px] font-black text-indigo-600">{item.adjustedTarget.toLocaleString()}</td>
                                        <td className="p-1.5 text-center">
                                          <input type="number" value={item.percent} onChange={(e) => { if (!isActiveCard) return; const nv = Number(e.target.value); const nt = categoryTargets.map(t => t.name === item.name ? { ...t, percent: nv, adjustedTarget: t.target * (nv / 100) } : t); setCategoryTargets(nt); if (onSaveLuyke) { onSaveLuyke(true, 'targets', undefined, nt, 'TARGET THI ĐUA'); } }} disabled={!isActiveCard} className={cn("w-14 border rounded-lg p-1 text-[11px] text-center font-sans font-normal outline-none", isActiveCard ? "bg-slate-50 border-slate-200 focus:ring-1 focus:ring-indigo-500" : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400")} />
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

      {/* Time Settings Container - Modern V2 */}
      {activeTab === 'REALTIME' && (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                CÀI ĐẶT THỜI GIAN
              </h3>
              <p className="text-xs font-medium text-slate-400">
                Tháng báo cáo và tiến độ ngày trong tháng
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowTimeSettings(!showTimeSettings)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100/80 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-all cursor-pointer"
          >
            <ChevronDown size={18} className={cn("transition-transform duration-300", showTimeSettings && "rotate-180")} />
          </button>
        </div>
        
        {showAll && showTimeSettings && (
          <div className="p-4 md:p-6" style={{ overflow: 'visible' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ overflow: 'visible' }}>
              <div className="space-y-2">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
                <div className="flex items-center gap-2 text-[12px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  LIÊN KẾT TRỰC TIẾP
                </div>
              </div>
            </div>
          </div>
        </div>
      )}




      {/* Custom Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => !isResetting && setShowResetConfirm(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease-out' }} />
          
          {/* Modal */}
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red gradient header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Xoá toàn bộ dữ liệu</h3>
                  <p className="text-white/80 text-sm">Hành động không thể hoàn tác</p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-slate-700 text-[15px] leading-relaxed">
                Bạn có chắc chắn muốn <strong className="text-red-600">XOÁ TOÀN BỘ</strong> dữ liệu khai báo của siêu thị <strong className="text-slate-900">{activeStore || 'này'}</strong>?
              </p>
              <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-red-600 text-[13px] font-medium flex items-start gap-2">
                  <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                  <span>Tất cả dữ liệu Realtime, Luỹ kế, Nhân viên, Trả góp sẽ bị xoá vĩnh viễn trên Firebase.</span>
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[14px] font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Huỷ bỏ
              </button>
              <button
                onClick={handleResetAllData}
                disabled={isResetting}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-[14px] font-bold transition-all cursor-pointer active:scale-95 shadow-lg shadow-red-200 disabled:opacity-70 flex items-center gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang xoá...</span>
                  </>
                ) : (
                  <>
                    <X size={16} />
                    <span>Xoá vĩnh viễn</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}

    </div>
  );
};

export default InputSection;
