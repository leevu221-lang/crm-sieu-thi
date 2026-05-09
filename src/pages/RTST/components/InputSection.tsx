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
  TrendingUp
} from 'lucide-react';
import { cn, formatShortCurrency } from '../utils';

interface InputSectionProps {
  marketInput: string;
  setMarketInput: (val: string) => void;
  categoryInput: string;
  setCategoryInput: (val: string) => void;
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
  onSaveLuyke: (isSilent?: boolean, source?: 'staff' | 'targets' | 'auto', storeName?: string, overrideTargets?: any[]) => void;
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
  isSavingStoreRevenue: boolean;
  isLoadingStoreRevenue?: boolean;
  isValidStoreName?: (name: string) => boolean;
  VALID_STORE_PREFIXES?: string[];
  lastUpdatedRealtime?: Date | null;
  isYcxDirty?: boolean;
  showAll?: boolean;
  activeTab: 'REALTIME' | 'LUY_KE' | 'THOI_GIAN' | 'NHAN_VIEN' | 'TARGET_NGANH_HANG' | 'TARGET_DOANH_THU' | 'RESOURCES';
}

const InputSection: React.FC<InputSectionProps> = ({
  marketInput, setMarketInput,
  categoryInput, setCategoryInput,
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
  isSavingStoreRevenue,
  isLoadingStoreRevenue = false,
  isValidStoreName,
  VALID_STORE_PREFIXES = [],
  lastUpdatedRealtime,
  isYcxDirty,
  showAll = true,
  activeTab
}) => {
  const [showTimeSettings, setShowTimeSettings] = useState(true);
  const [showRealtime, setShowRealtime] = useState(true);
  const [showClusterData, setShowClusterData] = useState(true);
  const [showStaffData, setShowStaffData] = useState(true);
  const [showTargetData, setShowTargetData] = useState(true);
  const [showStoreRevenueData, setShowStoreRevenueData] = useState(true);
  const [expandedInput, setExpandedInput] = useState<string | null>(null);
  const toggleInput = (id: string) => setExpandedInput(prev => prev === id ? null : id);
  const [savingRow, setSavingRow] = useState<string | null>(null);
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
          <div className="flex items-center gap-2">
            <button onClick={onLoadRealtime} disabled={isLoadingRealtime} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50">
              {isLoadingRealtime ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} TẢI LẠI
            </button>
            <button onClick={() => onSaveRealtime(false)} disabled={isSavingRealtime} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50", isYcxDirty ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")}>
              {isSavingRealtime ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} LƯU
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl">
              <div className={cn("w-2.5 h-2.5 rounded-full", (isSavingRealtime || isLoadingRealtime) ? "bg-amber-400 animate-pulse" : "bg-emerald-500")} />
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{isSavingRealtime ? "Đang lưu..." : isLoadingRealtime ? "Đang tải..." : "Sẵn sàng"}</span>
            </div>
          </div>
        </div>

        {showAll && showRealtime && (
        <div className="space-y-8">
          {/* Two Groups: BÁO CÁO TỔNG HỢP + THI ĐUA CỤM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { title: 'BÁO CÁO TỔNG HỢP', color: 'bg-slate-700', items: [
                { id: 'rt_market', label: 'REALTIME', value: marketInput, onChange: setMarketInput, onBlur: () => onSaveRealtime(true), hasData: !!marketInput },
                { id: 'rt_catrev', label: 'LUỸ KẾ', value: categoryRevenueInput, onChange: setCategoryRevenueInput, onBlur: () => onSaveRealtime(true), hasData: !!categoryRevenueInput, isLuyke: true },
              ]},
              { title: 'THI ĐUA CỤM', color: 'bg-orange-500', hasYcx: true, items: [
                { id: 'rt_cat', label: 'REALTIME', value: categoryInput, onChange: setCategoryInput, onBlur: () => onSaveRealtime(true), hasData: !!categoryInput },
                { id: 'rt_catlk', label: 'LUỸ KẾ', value: categoryRevenueInput, onChange: setCategoryRevenueInput, onBlur: () => onSaveRealtime(true), hasData: !!ycxFileName, isLuyke: true },
              ]},
            ].map(group => (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("w-1.5 h-5 rounded-full", group.color)} />
                  <h2 className="text-[13px] font-black text-slate-600 uppercase tracking-wider">{group.title}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map(item => (
                    <div key={item.id}>
                      <button onClick={() => toggleInput(item.id)} className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left",
                        expandedInput === item.id ? "border-blue-400 bg-blue-50/50 shadow-md" :
                        item.hasData ? "border-teal-200 bg-teal-50/30 hover:shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      )}>
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          item.hasData ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {item.hasData ? <Globe size={16} /> : <Download size={16} />}
                        </div>
                        <div className="min-w-0">
                          <span className={cn("text-[12px] font-black uppercase tracking-wide", item.hasData ? "text-teal-700" : "text-slate-500")}>{item.label}</span>
                          {item.hasData && lastUpdatedRealtime && item.isLuyke && (
                            <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5"><Calendar size={8} /> {lastUpdatedRealtime.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} {lastUpdatedRealtime.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</p>
                          )}
                        </div>
                      </button>
                      {expandedInput === item.id && (
                        <textarea value={item.value} onChange={(e) => item.onChange(e.target.value)} onBlur={item.onBlur} rows={3} autoFocus placeholder="Dán dữ liệu (Ctrl+V)..." className="w-full mt-2 bg-white border-2 border-blue-200 rounded-xl p-3 text-[11px] focus:ring-2 focus:ring-blue-400 outline-none resize-none font-mono shadow-inner" />
                      )}
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

          {/* DỮ LIỆU LUỸ KẾ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-indigo-600 rounded-full" />
              <h2 className="text-[13px] font-black text-slate-600 uppercase tracking-wider">DỮ LIỆU LUỸ KẾ</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[
                { id: 'lk_summary', label: 'BC TỔNG HỢP CỤM', value: clusterSummaryInput, onChange: setClusterSummaryInput, onBlur: () => onSaveLuyke(true,'auto'), hasData: !!clusterSummaryInput, link: 'https://bi.thegioididong.com/khoi-ban-hang-sub?id=13559&tab=bcth&rt=2&dm=1' },
                { id: 'lk_category', label: 'BC NGÀNH HÀNG CỤM', value: clusterCategoryInput, onChange: setClusterCategoryInput, onBlur: () => onSaveLuyke(true,'auto'), hasData: !!clusterCategoryInput, link: 'https://bi.thegioididong.com/thi-dua?id=-1&tab=1&rt=2&dm=2&mt=2' },
              ].map(item => (
                <div key={item.id}>
                  <button onClick={() => toggleInput(item.id)} className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left",
                    expandedInput === item.id ? "border-indigo-400 bg-indigo-50/50 shadow-md" :
                    item.hasData ? "border-teal-200 bg-teal-50/30 hover:shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  )}>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      item.hasData ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {item.hasData ? <Globe size={16} /> : <Download size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={cn("text-[12px] font-black uppercase tracking-wide", item.hasData ? "text-teal-700" : "text-slate-500")}>{item.label}</span>
                    </div>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-indigo-400 hover:text-indigo-600"><ExternalLink size={14} /></a>
                  </button>
                  {expandedInput === item.id && (
                    <textarea value={item.value} onChange={(e) => item.onChange(e.target.value)} onBlur={item.onBlur} rows={3} autoFocus placeholder="Dán dữ liệu (Ctrl+V)..." className="w-full mt-2 bg-white border-2 border-indigo-200 rounded-xl p-3 text-[11px] focus:ring-2 focus:ring-indigo-400 outline-none resize-none font-mono shadow-inner" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
      )}



      {/* Time Settings Container */}
      {activeTab === 'THOI_GIAN' && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-500" /> THÁNG BÁO CÁO
                </label>
                <input 
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                />
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
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-500 cursor-not-allowed outline-none transition-all text-center"
                    title="Tự động: Tháng quá khứ = Tổng ngày; Tháng hiện tại = Ngày hiện tại - 1"
                  />
                  <span className="text-2xl font-light text-slate-300">/</span>
                  <input 
                    type="number"
                    value={totalDays}
                    readOnly
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-500 cursor-not-allowed outline-none transition-all text-center"
                    title="Tổng số ngày trong tháng"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* DATA NHÂN VIÊN Container */}
      {activeTab === 'NHAN_VIEN' && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">DATA NHÂN VIÊN</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              {(isProcessingLuyke || isLoadingLuyke) ? (
                <Loader2 size={12} className="animate-spin text-emerald-500" />
              ) : (
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isProcessingLuyke ? "ĐANG LƯU..." : isLoadingLuyke ? "ĐANG TẢI..." : "TỰ ĐỘNG LƯU"}
              </span>
            </div>
            <button 
              onClick={() => onSaveLuyke(false, 'staff')}
              disabled={isSavingStaff}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingStaff ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {isSavingStaff ? "ĐANG LƯU..." : "LƯU NGAY"}
            </button>
            <button 
              onClick={() => setShowStaffData(!showStaffData)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all ml-2"
            >
              <ChevronDown size={20} className={cn("transition-transform duration-300", showStaffData && "rotate-180")} />
            </button>
          </div>
        </div>
        
        {showAll && showStaffData && (
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-amber-500 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                      <Zap size={14} className="text-amber-500" /> 1. DOANH THU NV
                    </h2>
                    <a 
                      href="https://bi.thegioididong.com/sieu-thi-con?id=16500&tab=bcdtnv&rt=2&dm=1" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-amber-500 hover:text-amber-600 ml-2"
                      title="Mở BC Doanh thu NV"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
                <textarea 
                  value={staffInput}
                  onChange={(e) => setStaffInput(e.target.value)}
                  onBlur={() => onSaveLuyke(true, 'auto')}
                  rows={3}
                  placeholder="Dán dữ liệu doanh thu nhân viên..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all resize-none font-mono"
                />
              </section>

              <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-orange-500 relative">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                    <LayoutDashboard size={14} className="text-orange-500" /> 2. TỔNG HỢP THI ĐUA
                  </h2>
                </div>
                <textarea 
                  value={staffCategoryInput}
                  onChange={(e) => setStaffCategoryInput(e.target.value)}
                  onBlur={() => onSaveLuyke(true, 'auto')}
                  rows={3}
                  placeholder="Dán dữ liệu thi đua nhân viên..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all resize-none font-mono"
                />
              </section>
            </div>
          </div>
        )}
      </div>
      )}

      {/* CÀI ĐẶT TARGET NGÀNH HÀNG Container */}
      {activeTab === 'TARGET_NGANH_HANG' && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border-b border-slate-200 gap-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">CÀI ĐẶT TARGET NGÀNH HÀNG</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={onAnalyze}
              className="px-4 py-2 bg-violet-50 text-violet-600 border border-violet-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-violet-100 transition-all active:scale-95 flex items-center gap-2"
              title="Đồng bộ dữ liệu Target từ BC Ngành Hàng Cụm"
            >
              <Zap size={12} />
              ĐỒNG BỘ DATA
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <input 
              type="number"
              value={globalPercent}
              onChange={(e) => handleGlobalPercentChange(Number(e.target.value))}
              className="w-20 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-center"
              placeholder="%"
            />
            <button 
              onClick={() => {
                const newTargets = categoryTargets.map(item => ({
                  ...item,
                  percent: globalPercent,
                  adjustedTarget: item.target * (globalPercent / 100)
                }));
                setCategoryTargets(newTargets);
                onSaveLuyke(false, 'targets', undefined, newTargets);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95"
            >
              ÁP DỤNG ALL
            </button>
            <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">TỰ ĐỘNG LƯU</span>
            </div>
            <button 
              onClick={() => onSaveLuyke(false, 'targets')}
              disabled={isSavingTargets}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingTargets ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {isSavingTargets ? "ĐANG LƯU..." : "LƯU NGAY"}
            </button>
            <button 
              onClick={() => setShowTargetData(!showTargetData)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all ml-2"
            >
              <ChevronDown size={20} className={cn("transition-transform duration-300", showTargetData && "rotate-180")} />
            </button>
          </div>
        </div>
        {showAll && showTargetData && (
          <div className="p-4 md:p-6 overflow-x-auto space-y-8">
            {/* Table SL */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase">Ngành hàng (SL)</h4>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="p-2">Tên ngành hàng</th>
                    <th className="p-2">Target</th>
                    <th className="p-2">Target sau điều chỉnh</th>
                    <th className="p-2 text-center">% Target</th>
                    <th className="p-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTargets.filter(item => item.type === 'SL').map((item, index) => (
                    <tr key={item.name} className="border-t border-slate-100 group">
                      <td className="p-2 text-xs font-bold">{item.name}</td>
                      <td className="p-2 text-xs">{item.target.toLocaleString()}</td>
                      <td className="p-2 text-xs font-bold text-indigo-600">{item.adjustedTarget.toLocaleString()}</td>
                      <td className="p-2 text-center">
                        <input 
                          type="number"
                          value={item.percent}
                          onChange={(e) => {
                            const newVal = Number(e.target.value);
                            const newTargets = categoryTargets.map((t) => 
                              t.name === item.name 
                                ? { ...t, percent: newVal, adjustedTarget: t.target * (newVal / 100) }
                                : t
                            );
                            setCategoryTargets(newTargets);
                          }}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <button 
                          onClick={async () => {
                            setSavingRow(item.name);
                            await onSaveLuyke(false, 'targets', undefined, categoryTargets);
                            setTimeout(() => setSavingRow(null), 1500);
                          }}
                          disabled={savingRow === item.name}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                            savingRow === item.name 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white"
                          )}
                        >
                          {savingRow === item.name ? "ĐÃ LƯU" : "ÁP DỤNG"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table DT */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase">Ngành hàng (DT)</h4>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="p-2">Tên ngành hàng</th>
                    <th className="p-2">Target</th>
                    <th className="p-2">Target sau điều chỉnh</th>
                    <th className="p-2 text-center">% Target</th>
                    <th className="p-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTargets.filter(item => item.type !== 'SL').map((item, index) => (
                    <tr key={item.name} className="border-t border-slate-100 group">
                      <td className="p-2 text-xs font-bold">{item.name}</td>
                      <td className="p-2 text-xs">{item.target.toLocaleString()}</td>
                      <td className="p-2 text-xs font-bold text-indigo-600">{item.adjustedTarget.toLocaleString()}</td>
                      <td className="p-2 text-center">
                        <input 
                          type="number"
                          value={item.percent}
                          onChange={(e) => {
                            const newVal = Number(e.target.value);
                            const newTargets = categoryTargets.map((t) => 
                              t.name === item.name 
                                ? { ...t, percent: newVal, adjustedTarget: t.target * (newVal / 100) }
                                : t
                            );
                            setCategoryTargets(newTargets);
                          }}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <button 
                          onClick={async () => {
                            setSavingRow(item.name);
                            await onSaveLuyke(false, 'targets', undefined, categoryTargets);
                            setTimeout(() => setSavingRow(null), 1500);
                          }}
                          disabled={savingRow === item.name}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                            savingRow === item.name 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white"
                          )}
                        >
                          {savingRow === item.name ? "ĐÃ LƯU" : "ÁP DỤNG"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* CÀI ĐẶT DOANH THU SIÊU THỊ Container */}
      {activeTab === 'TARGET_DOANH_THU' && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Store size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">CÀI ĐẶT DOANH THU SIÊU THỊ</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onLoadStoreRevenue}
              disabled={isLoadingStoreRevenue}
              className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
              title="Tải lại dữ liệu từ Database"
            >
              {isLoadingStoreRevenue ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              <span className="text-[10px] font-black uppercase tracking-widest">TẢI LẠI DB</span>
            </button>
            <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">TỰ ĐỘNG LƯU</span>
            </div>
            <button 
              onClick={onSaveStoreRevenue}
              disabled={isSavingStoreRevenue}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100"
            >
              {isSavingStoreRevenue ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSavingStoreRevenue ? "ĐANG LƯU..." : "LƯU NGAY"}
            </button>
            <button 
              onClick={() => setShowStoreRevenueData(!showStoreRevenueData)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all ml-2"
            >
              <ChevronDown size={20} className={cn("transition-transform duration-300", showStoreRevenueData && "rotate-180")} />
            </button>
          </div>
        </div>
        {showAll && showStoreRevenueData && (
          <div className="p-4 md:p-6 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="p-2 border-b border-slate-100">Tên siêu thị</th>
                <th className="p-2 border-b border-slate-100 text-center">DTLK</th>
                <th className="p-2 border-b border-slate-100 text-center">DTQĐ</th>
                <th className="p-2 border-b border-slate-100 text-center">DT Dự Kiến (QĐ)</th>
                <th className="p-2 border-b border-slate-100 text-center">% HT Target Dự Kiến (QĐ)</th>
                <th className="p-2 border-b border-slate-100 text-center">TAGET QUY ĐỔI</th>
                <th className="p-2 border-b border-slate-100 text-center">% TARGET</th>
                <th className="p-2 border-b border-slate-100 text-center">TAGET SAU X HỆ SỐ</th>
                <th className="p-2 border-b border-slate-100 text-center">%HT sau x hệ số</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-50">
                <td className="p-2">
                  <div className="space-y-1">

                    <input 
                      type="text" 
                      value={stName} 
                      readOnly
                      disabled
                      placeholder="Tên siêu thị (Tự động đồng bộ)..."
                      className={cn(
                        "w-full bg-slate-100 border rounded-lg p-2 text-xs font-black text-slate-500 cursor-not-allowed outline-none transition-all",
                        stName && isValidStoreName && !isValidStoreName(stName) 
                          ? "border-red-300 bg-red-50" 
                          : "border-slate-200"
                      )}
                    />
                    <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest">
                      {stName ? "✓ Đã đồng bộ từ BC Tổng hợp cụm" : "⚠ Chờ đồng bộ dữ liệu..."}
                    </p>
                    {stName && isValidStoreName && !isValidStoreName(stName) && (
                      <p className="text-[9px] text-red-500 font-bold px-1">
                        Phải bắt đầu bằng: {VALID_STORE_PREFIXES.join(', ')}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    value={stDtlk || ''} 
                    readOnly
                    disabled
                    placeholder="0"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono text-center text-slate-500 cursor-not-allowed outline-none transition-all"
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    value={stDtqd || ''} 
                    readOnly
                    disabled
                    placeholder="0"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono text-center text-slate-500 cursor-not-allowed outline-none transition-all"
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    value={stDtDuKienQD || ''} 
                    readOnly
                    disabled
                    placeholder="0"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono text-center text-slate-500 cursor-not-allowed outline-none transition-all"
                  />
                </td>
                <td className="p-2">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="number" 
                      value={stPercentHTTargetDuKienQD || ''} 
                      readOnly
                      disabled
                      placeholder="0"
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono text-center text-slate-500 cursor-not-allowed outline-none transition-all pr-6"
                    />
                    <span className="absolute right-2 text-[10px] text-slate-400 font-mono">%</span>
                  </div>
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    value={stTargetQuyDoi || ''} 
                    readOnly
                    disabled
                    placeholder="0"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono font-black text-indigo-400 text-center cursor-not-allowed outline-none transition-all"
                  />
                </td>
                <td className="p-2 text-center">
                  <input 
                    type="number" 
                    value={stPercentTarget || ''} 
                    onChange={(e) => setStPercentTarget(Number(e.target.value))}
                    placeholder="0"
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </td>
                <td className="p-2 text-center">
                  <div className="w-full bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-xs font-black text-indigo-700 text-center">
                    {stTargetSauHeSo}
                  </div>
                </td>
                <td className="p-2 text-center">
                  <div className="w-full bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-xs font-black text-emerald-700 text-center">
                    {stTargetSauHeSo > 0 ? Math.round((stDtDuKienQD / stTargetSauHeSo) * 100) : 0}%
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  LIÊN KẾT TRỰC TIẾP
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputSection;
