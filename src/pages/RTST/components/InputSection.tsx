/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
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
  Target,
  Clock,
  Lock,
  Unlock,
  Trash2,
  BarChart3,
  Trophy,
  CreditCard
} from 'lucide-react';
import { cn, formatShortCurrency } from '../utils';
import { cleanBiReportText } from '../../../utils/rtstHelpers';
import { useNotification } from '../../../contexts/NotificationContext';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { safeSetDoc } from '../../../firebaseAdapter';


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
  clearField?: (setter: (val: string) => void, fieldName?: string) => void;
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

interface ReportInputBoxProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  onClear: () => void;
  colorTheme?: 'emerald' | 'amber' | 'blue' | 'teal' | 'orange' | 'purple' | 'violet';
  placeholder?: string;
  onSaveTrigger?: () => void;
  externalLink?: string;
}

const ReportInputBox: React.FC<ReportInputBoxProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  onClear,
  colorTheme = 'emerald',
  placeholder,
  onSaveTrigger,
  externalLink
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  // Tự động đóng/khóa khi click ra ngoài
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setTempVal('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  // Trích xuất thời gian cập nhật từ text (nếu có dạng "Cập nhật lúc: 20:49:40")
  const extractedTime = useMemo(() => {
    if (!value) return '';
    const match = value.match(/Cập nhật lúc:\s*([^\n\r]+)/i);
    if (match) {
      const raw = match[1].trim();
      const tMatch = raw.match(/(\d{1,2}:\d{2}:\d{2})/);
      return tMatch ? tMatch[1] : raw.substring(0, 15);
    }
    return '';
  }, [value]);

  const lineCount = useMemo(() => {
    if (!value || !value.trim()) return 0;
    return value.trim().split('\n').filter(Boolean).length;
  }, [value]);

  const hasData = !!(value && value.trim());

  const handleSaveAndLock = (text: string) => {
    if (!text || !text.trim()) {
      setIsEditing(false);
      setTempVal('');
      return;
    }
    onChange(text);
    setTimeout(() => {
      if (onBlur) onBlur();
      if (onSaveTrigger) onSaveTrigger();
      try {
        confetti({
          particleCount: 65,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }, 50);
    setIsEditing(false);
    setTempVal('');
  };

  // Màu sắc theo chủ đề (chuẩn thiết kế mẫu Enterprise BI V2.0)
  const isEmerald = colorTheme === 'emerald' || colorTheme === 'teal';
  const isAmber = colorTheme === 'amber' || colorTheme === 'orange';
  const isPurple = colorTheme === 'purple' || colorTheme === 'violet';

  const cardSurfaceClass = isEmerald
    ? 'bg-gradient-to-b from-[#F4FDF9] via-[#ECFAF3] to-[#E2F7EC] border-[#BDEFD7] hover:border-[#8CE3BA]'
    : isAmber
    ? 'bg-gradient-to-b from-[#FFFDF7] via-[#FFF8E7] to-[#FFF0D1] border-[#FDE0A6] hover:border-[#FCD34D]'
    : isPurple
    ? 'bg-gradient-to-b from-[#FCF9FF] via-[#F6EEFF] to-[#EDE2FF] border-[#DEC7FF] hover:border-[#C4B5FD]'
    : 'bg-gradient-to-b from-[#F5FAFF] via-[#ECF4FF] to-[#E1EEFF] border-[#C4DCFF] hover:border-[#9EC5FE]';

  const textHeaderColor = isEmerald
    ? 'text-[#047857]'
    : isAmber
    ? 'text-[#C2410C]'
    : isPurple
    ? 'text-[#6D28D9]'
    : 'text-[#0A58CA]';

  const iconCircleClass = isEmerald
    ? 'bg-[#D6F5E6] text-[#059669] border border-[#B2EBD0]'
    : isAmber
    ? 'bg-[#FFEDC2] text-[#EA580C] border border-[#FDE09B]'
    : isPurple
    ? 'bg-[#EBE0FF] text-[#7C3AED] border border-[#D8B4FE]'
    : 'bg-[#DCEBFF] text-[#0D6EFD] border border-[#B8D6FF]';

  const iconColor = isEmerald
    ? 'text-[#059669]'
    : isAmber
    ? 'text-[#EA580C]'
    : isPurple
    ? 'text-[#7C3AED]'
    : 'text-[#0D6EFD]';

  const badgeTimeColor = isEmerald
    ? 'bg-[#E9FBF2] text-[#047857] border-[#A7F3D0]'
    : isAmber
    ? 'bg-[#FFF7E0] text-[#D97706] border-[#FCD34D]'
    : isPurple
    ? 'bg-[#F5EEFF] text-[#7C3AED] border-[#D8B4FE]'
    : 'bg-[#EBF4FF] text-[#0D6EFD] border-[#B6D4FE]';

  const badgeCountColor = isEmerald
    ? 'bg-[#CCF5E1] text-[#065F46]'
    : isAmber
    ? 'bg-[#FDE6AC] text-[#92400E]'
    : isPurple
    ? 'bg-[#E5D4FF] text-[#5B21B6]'
    : 'bg-[#D4E6FF] text-[#084298]';

  const buttonBgColor = isEmerald
    ? 'bg-gradient-to-r from-[#047857] to-[#065F46] hover:from-[#065F46] hover:to-[#064E3B] shadow-[0_4px_12px_rgba(4,120,87,0.22)]'
    : isAmber
    ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] shadow-[0_4px_12px_rgba(249,115,22,0.25)]'
    : isPurple
    ? 'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] shadow-[0_4px_12px_rgba(124,58,237,0.24)]'
    : 'bg-gradient-to-r from-[#0D6EFD] to-[#0B5ED7] hover:from-[#0B5ED7] hover:to-[#0A58CA] shadow-[0_4px_12px_rgba(13,110,253,0.25)]';

  const dividerColor = isEmerald
    ? 'bg-[#9EE6C4]/70'
    : isAmber
    ? 'bg-[#FCD385]/70'
    : isPurple
    ? 'bg-[#D3B8FF]/70'
    : 'bg-[#A9CBFF]/70';

  const waveFillColor = isEmerald
    ? '#A7F3D0'
    : isAmber
    ? '#FDE68A'
    : isPurple
    ? '#DDD6FE'
    : '#BFDBFE';

  const textLockedColor = isEmerald
    ? 'text-[#063F30]'
    : isAmber
    ? 'text-[#5C2804]'
    : isPurple
    ? 'text-[#3B0764]'
    : 'text-[#0B2E59]';

  const borderEditColor = isEmerald
    ? 'border-[#10B981] focus:border-[#059669]'
    : isAmber
    ? 'border-[#F59E0B] focus:border-[#D97706]'
    : isPurple
    ? 'border-[#8B5CF6] focus:border-[#7C3AED]'
    : 'border-[#3B82F6] focus:border-[#2563EB]';

  return (
    <div 
      ref={boxRef} 
      className={cn(
        "relative overflow-hidden rounded-[16px] sm:rounded-[18px] border p-[14px] sm:p-[16px] shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all h-full flex flex-col justify-between gap-[12px] w-full",
        cardSurfaceClass
      )}
    >
      {/* Decorative soft wave at bottom right matching approved design */}
      <svg
        className="pointer-events-none select-none absolute bottom-0 right-0 w-[68%] h-[46px] opacity-45"
        viewBox="0 0 400 60"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C90,60 140,12 240,22 C310,30 355,8 400,18 L400,60 Z"
          fill={waveFillColor}
        />
      </svg>

      {/* Header ô dữ liệu */}
      <div className="relative z-10 flex flex-wrap items-start sm:items-center justify-between gap-[8px]">
        <div className="flex items-center gap-[10px] min-w-0 flex-1">
          <div className={cn("w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 shadow-2xs", iconCircleClass)}>
            <Globe size={18} className="shrink-0 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-[6px] min-w-0 flex-1 flex-wrap">
            <span className={cn("text-[13.5px] sm:text-[15px] font-black uppercase tracking-tight leading-[1.3] break-words", textHeaderColor)}>
              {label}
            </span>
            {externalLink && (
              <a 
                href={externalLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()} 
                className="text-[#D97706] hover:text-[#B45309] p-[4px] rounded-[6px] hover:bg-amber-100/60 transition-colors inline-flex items-center shrink-0" 
                title="Mở báo cáo BI"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-[6px] flex-wrap shrink-0">
          {extractedTime && (
            <span className={cn("inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-full border text-[11px] sm:text-[11.5px] font-bold leading-none whitespace-nowrap", badgeTimeColor)}>
              <Clock size={12} className="shrink-0" />
              <span>Cập nhật: {extractedTime}</span>
            </span>
          )}
          <span className={cn("inline-flex items-center px-[10px] py-[4px] rounded-full text-[11px] sm:text-[11.5px] font-black leading-none whitespace-nowrap", badgeCountColor)}>
            {hasData ? `${lineCount} dòng` : 'Chưa có dữ liệu'}
          </span>
        </div>
      </div>

      {/* Trạng thái Khóa / Mở dán mới */}
      {!isEditing ? (
        <div 
          onClick={() => {
            setIsEditing(true);
            setTempVal('');
          }}
          className="relative z-10 flex flex-col min-[360px]:flex-row min-[360px]:items-center justify-between gap-[10px] sm:gap-[12px] pt-[4px] cursor-pointer group select-none"
          title="Click để mở dán mới"
        >
          <div className="flex items-start sm:items-center gap-[9px] min-w-0 flex-1">
            <Lock size={17} className={cn(iconColor, "shrink-0 stroke-[2.3] mt-[2px] sm:mt-0")} />
            <div className={cn("text-[12px] sm:text-[13px] font-black leading-[1.38] break-words min-w-0", textLockedColor)}>
              <span className="block">{hasData ? `Đã khóa dữ liệu ${label}` : `Chưa có dữ liệu ${label}`}</span>
              <span className="block text-[11.5px] sm:text-[12.5px] font-extrabold opacity-90 mt-[1px]">
                ({lineCount} dòng)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-[12px] shrink-0 max-[359px]:w-full">
            <div className={cn("hidden sm:block w-[1px] h-[30px] shrink-0", dividerColor)} />
            <button
              type="button"
              className={cn(
                "w-full min-[360px]:w-auto min-h-[44px] px-[14px] sm:px-[16px] py-[10px] text-white rounded-[11px] text-[12.5px] sm:text-[13px] font-black inline-flex items-center justify-center gap-[7px] transition-all pointer-events-none whitespace-nowrap",
                buttonBgColor
              )}
            >
              <Lock size={14} className="stroke-[2.4] shrink-0" />
              <span>Mở dán mới</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 space-y-[10px] pt-[4px]">
          <textarea
            value={tempVal}
            onPaste={(e) => {
              const text = e.clipboardData?.getData('text');
              if (text && text.trim()) {
                e.preventDefault();
                handleSaveAndLock(text);
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              setTempVal(val);
              if (val && val.trim()) {
                handleSaveAndLock(val);
              }
            }}
            placeholder={placeholder || `Dán toàn bộ dữ liệu báo cáo ${label} tại đây... (Tự động Khóa & Lưu ngay khi dán)`}
            rows={5}
            autoFocus
            className={cn(
              "w-full p-[12px] bg-white border-2 rounded-[14px] text-[12.5px] font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden transition-all resize-y",
              borderEditColor
            )}
          />

          <div className="flex flex-wrap items-center justify-between gap-[8px] px-[2px]">
            <span className="text-[11.5px] text-slate-600 font-semibold leading-snug">
              💡 Tự động <b>Khóa &amp; Lưu</b> ngay khi dán • Click ra ngoài để đóng
            </span>

            {(hasData || !!(tempVal && tempVal.trim())) && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTempVal('');
                  onClear();
                  setIsEditing(true);
                }}
                className="min-h-[36px] inline-flex items-center justify-center gap-[5px] px-[10px] py-[6px] text-rose-600 hover:text-rose-700 bg-white/80 hover:bg-rose-50 border border-rose-200 rounded-[9px] text-[11.5px] font-bold cursor-pointer transition-all"
              >
                <Trash2 size={13} />
                <span>Xóa Trắng</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
    // tragop_matran and tragop_nv come from Firebase props with localStorage fallback
    loaded['tragop_matran'] = tragopMatran || '';
    loaded['tragop_nv'] = tragopNv || localStorage.getItem(storeConfigKey('tragop_nv')) || '';
    setStoreConfig(loaded);
  }, [activeStore, tragopMatran, tragopNv]);

  const updateStoreConfig = (field: string, value: string) => {
    setStoreConfig(prev => ({ ...prev, [field]: value }));
    // tragop fields go to Firebase via props, others to localStorage
    if (field === 'tragop_matran' && setTragopMatran) {
      setTragopMatran(value);
    } else if (field === 'tragop_nv' && setTragopNv) {
      setTragopNv(value);
      localStorage.setItem(storeConfigKey(field), value);
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
      localStorage.removeItem(storeConfigKey(field));
    } else {
      localStorage.removeItem(storeConfigKey(field));
    }
  };

  const [dtThucNvMap, setDtThucNvMap] = useState<Record<string, string>>({});

  const handleUpdateDtThucNv = (sName: string, val: string) => {
    const cleanVal = cleanBiReportText(val);
    const sClean = sName ? sName.replace(/\D/g, '') : '';
    setDtThucNvMap(prev => ({ ...prev, [sName]: cleanVal }));
    if (sClean) {
      try {
        localStorage.setItem(`real_dthu_nv_raw_thuc_${sClean}`, cleanVal);
      } catch {}
      try {
        const docRef = doc(db, 'app_settings', `real_dthu_nv_${sClean}`);
        safeSetDoc(docRef, {
          storeId: sClean,
          rawInputThuc: cleanVal,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
      } catch {}
    }
    try {
      if (sName) {
        localStorage.setItem(`real_dthu_nv_raw_thuc_${sName}`, cleanVal);
        localStorage.setItem(`cauhinh_${sName}_dt_thuc_nv`, cleanVal);
      }
      localStorage.setItem('real_dthu_nv_raw_thuc_latest', cleanVal);
    } catch {}

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff_thuc_updated', { detail: { storeName: sName, value: cleanVal } }));
      }
    } catch {}
  };

  const removeLocalStorageByPrefix = (prefixes: string[], exactKeys: string[]) => {
    try {
      exactKeys.forEach(k => localStorage.removeItem(k));
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && prefixes.some(p => k.startsWith(p))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  };

  const handleClearDtThucNv = (sName: string) => {
    const sClean = sName ? sName.replace(/\D/g, '') : '';
    setDtThucNvMap(prev => ({ ...prev, [sName]: '' }));
    if (sClean) {
      try {
        localStorage.removeItem(`real_dthu_nv_raw_thuc_${sClean}`);
      } catch {}
      try {
        const docRef = doc(db, 'app_settings', `real_dthu_nv_${sClean}`);
        safeSetDoc(docRef, {
          storeId: sClean,
          rawInputThuc: '',
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
      } catch {}
    }
    try {
      if (sName) localStorage.removeItem(`real_dthu_nv_raw_thuc_${sName}`);
      localStorage.removeItem(`cauhinh_${sName}_dt_thuc_nv`);
      localStorage.removeItem('real_dthu_nv_raw_thuc_latest');
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff_thuc_updated', { detail: { storeName: sName, value: '' } }));
      }
    } catch {}
    showNotification('Đã xóa dữ liệu D.THU THỰC NHÂN VIÊN', 'info');
  };

  const handleBlurDtThucNv = (sName: string) => {
    showNotification('Đã lưu dữ liệu D.THU THỰC NHÂN VIÊN', 'success');
  };

  // Realtime & Luỹ kế Doanh thu thực
  const [realtimeDtThuc, setRealtimeDtThuc] = useState(() => {
    try {
      if (localStorage.getItem('crm_field_cleared_rt_market_thuc')) return '';
      return (activeStore && localStorage.getItem(`rtst_realtime_dt_thuc_${activeStore}`)) || localStorage.getItem('rtst_realtime_dt_thuc') || localStorage.getItem('rt_market_thuc') || '';
    } catch {
      return '';
    }
  });

  const [luykeDtThuc, setLuykeDtThuc] = useState(() => {
    try {
      if (localStorage.getItem('crm_field_cleared_rt_catrev_thuc')) return '';
      return (activeStore && localStorage.getItem(`rtst_luyke_dt_thuc_${activeStore}`)) || localStorage.getItem('rtst_luyke_dt_thuc') || localStorage.getItem('rt_catrev_thuc') || '';
    } catch {
      return '';
    }
  });

  // Realtime & Luỹ kế Trả chậm
  const [realtimeTraCham, setRealtimeTraCham] = useState(() => {
    try {
      if (localStorage.getItem('crm_field_cleared_rt_tra_cham')) return '';
      return (activeStore && localStorage.getItem(`rtst_realtime_tra_cham_${activeStore}`)) || 
             localStorage.getItem('rtst_realtime_tra_cham') || 
             localStorage.getItem('rt_tra_cham') || '';
    } catch {
      return '';
    }
  });

  const [luykeTraCham, setLuykeTraCham] = useState(() => {
    try {
      if (localStorage.getItem('crm_field_cleared_lk_tra_cham')) return '';
      return (activeStore && localStorage.getItem(`rtst_luyke_tra_cham_${activeStore}`)) || 
             localStorage.getItem('rtst_luyke_tra_cham') || 
             localStorage.getItem('rt_tra_cham_lk') || '';
    } catch {
      return '';
    }
  });

  const realtimeDtThucRef = useRef(realtimeDtThuc);
  const luykeDtThucRef = useRef(luykeDtThuc);
  const realtimeTraChamRef = useRef(realtimeTraCham);
  const luykeTraChamRef = useRef(luykeTraCham);
  const lastLocalClusterEditRef = useRef<Record<string, { value: string; time: number }>>({});
  const lastSavedClusterBoxRef = useRef<Record<string, string>>({});

  useEffect(() => { realtimeDtThucRef.current = realtimeDtThuc; }, [realtimeDtThuc]);
  useEffect(() => { luykeDtThucRef.current = luykeDtThuc; }, [luykeDtThuc]);
  useEffect(() => { realtimeTraChamRef.current = realtimeTraCham; }, [realtimeTraCham]);
  useEffect(() => { luykeTraChamRef.current = luykeTraCham; }, [luykeTraCham]);

  useEffect(() => {
    if (!activeStore || activeStore === 'ALL') return;
    const isRtCleared = !!localStorage.getItem('crm_field_cleared_rt_market_thuc');
    const isLkCleared = !!localStorage.getItem('crm_field_cleared_rt_catrev_thuc');
    const isRtTcCleared = !!localStorage.getItem('crm_field_cleared_rt_tra_cham');
    const isLkTcCleared = !!localStorage.getItem('crm_field_cleared_lk_tra_cham');

    const vRt = isRtCleared ? '' : (localStorage.getItem(`rtst_realtime_dt_thuc_${activeStore}`) || localStorage.getItem('rtst_realtime_dt_thuc') || localStorage.getItem('rt_market_thuc') || '');
    const vLk = isLkCleared ? '' : (localStorage.getItem(`rtst_luyke_dt_thuc_${activeStore}`) || localStorage.getItem('rtst_luyke_dt_thuc') || localStorage.getItem('rt_catrev_thuc') || '');
    const vRtTc = isRtTcCleared ? '' : (localStorage.getItem(`rtst_realtime_tra_cham_${activeStore}`) || localStorage.getItem('rtst_realtime_tra_cham') || localStorage.getItem('rt_tra_cham') || '');
    const vLkTc = isLkTcCleared ? '' : (localStorage.getItem(`rtst_luyke_tra_cham_${activeStore}`) || localStorage.getItem('rtst_luyke_tra_cham') || localStorage.getItem('rt_tra_cham_lk') || '');

    realtimeDtThucRef.current = vRt;
    setRealtimeDtThuc(vRt);
    luykeDtThucRef.current = vLk;
    setLuykeDtThuc(vLk);
    realtimeTraChamRef.current = vRtTc;
    setRealtimeTraCham(vRtTc);
    luykeTraChamRef.current = vLkTc;
    setLuykeTraCham(vLkTc);
  }, [activeStore]);

  const handleSaveRealtimeDtThuc = (val: string) => {
    const raw = (val || '').trim();
    lastLocalClusterEditRef.current['rt_market_thuc'] = { value: raw, time: Date.now() };
    realtimeDtThucRef.current = raw;
    setRealtimeDtThuc(raw);
    try {
      if (raw) {
        localStorage.removeItem('crm_field_cleared_rt_market_thuc');
        localStorage.setItem('rtst_realtime_dt_thuc', raw);
        localStorage.setItem('rt_market_thuc', raw);
        if (activeStore && activeStore !== 'ALL') {
          localStorage.setItem(`rtst_realtime_dt_thuc_${activeStore}`, raw);
        }
      } else {
        localStorage.setItem('crm_field_cleared_rt_market_thuc', String(Date.now()));
        removeLocalStorageByPrefix(['rtst_realtime_dt_thuc_'], ['rtst_realtime_dt_thuc', 'rt_market_thuc']);
      }
    } catch {}
    try {
      const docKey = activeStore && activeStore !== 'ALL' ? `realtime_dt_thuc_${activeStore}` : 'realtime_dt_thuc_general';
      if (lastSavedClusterBoxRef.current[docKey] !== raw) {
        lastSavedClusterBoxRef.current[docKey] = raw;
        const docRef = doc(db, 'app_settings', docKey);
        safeSetDoc(docRef, {
          value: raw,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch((err) => console.warn('Firestore write warning:', err));
      }
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('realtime_dt_thuc_updated', { detail: { value: raw, activeStore } }));
      }
    } catch {}
  };

  const handleSaveLuykeDtThuc = (val: string) => {
    const raw = (val || '').trim();
    lastLocalClusterEditRef.current['rt_catrev_thuc'] = { value: raw, time: Date.now() };
    luykeDtThucRef.current = raw;
    setLuykeDtThuc(raw);
    try {
      if (raw) {
        localStorage.removeItem('crm_field_cleared_rt_catrev_thuc');
        localStorage.setItem('rtst_luyke_dt_thuc', raw);
        localStorage.setItem('rt_catrev_thuc', raw);
        if (activeStore && activeStore !== 'ALL') {
          localStorage.setItem(`rtst_luyke_dt_thuc_${activeStore}`, raw);
        }
      } else {
        localStorage.setItem('crm_field_cleared_rt_catrev_thuc', String(Date.now()));
        removeLocalStorageByPrefix(['rtst_luyke_dt_thuc_'], ['rtst_luyke_dt_thuc', 'rt_catrev_thuc', 'lk_market_thuc']);
      }
    } catch {}
    try {
      const docKey = activeStore && activeStore !== 'ALL' ? `luyke_dt_thuc_${activeStore}` : 'luyke_dt_thuc_general';
      if (lastSavedClusterBoxRef.current[docKey] !== raw) {
        lastSavedClusterBoxRef.current[docKey] = raw;
        const docRef = doc(db, 'app_settings', docKey);
        safeSetDoc(docRef, {
          value: raw,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch((err) => console.warn('Firestore write warning:', err));
      }
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('luyke_dt_thuc_updated', { detail: { value: raw, activeStore } }));
      }
    } catch {}
  };

  const handleSaveRealtimeTraCham = (val: string) => {
    const raw = (val || '').trim();
    lastLocalClusterEditRef.current['rt_tra_cham'] = { value: raw, time: Date.now() };
    realtimeTraChamRef.current = raw;
    setRealtimeTraCham(raw);
    try {
      if (raw) {
        localStorage.removeItem('crm_field_cleared_rt_tra_cham');
        localStorage.setItem('rtst_realtime_tra_cham', raw);
        localStorage.setItem('rt_tra_cham', raw);
        if (activeStore && activeStore !== 'ALL') {
          localStorage.setItem(`rtst_realtime_tra_cham_${activeStore}`, raw);
        }
      } else {
        localStorage.setItem('crm_field_cleared_rt_tra_cham', String(Date.now()));
        removeLocalStorageByPrefix(['rtst_realtime_tra_cham_'], ['rtst_realtime_tra_cham', 'rt_tra_cham']);
      }
    } catch {}
    try {
      const docKey = activeStore && activeStore !== 'ALL' ? `realtime_tra_cham_${activeStore}` : 'realtime_tra_cham_general';
      if (lastSavedClusterBoxRef.current[docKey] !== raw) {
        lastSavedClusterBoxRef.current[docKey] = raw;
        const docRef = doc(db, 'app_settings', docKey);
        safeSetDoc(docRef, {
          value: raw,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch((err) => console.warn('Firestore write warning:', err));
      }
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('realtime_tra_cham_updated', { detail: { value: raw, activeStore } }));
      }
    } catch {}
  };

  const handleSaveLuykeTraCham = (val: string) => {
    const raw = (val || '').trim();
    lastLocalClusterEditRef.current['lk_tra_cham'] = { value: raw, time: Date.now() };
    luykeTraChamRef.current = raw;
    setLuykeTraCham(raw);
    try {
      if (raw) {
        localStorage.removeItem('crm_field_cleared_lk_tra_cham');
        localStorage.setItem('rtst_luyke_tra_cham', raw);
        localStorage.setItem('rt_tra_cham_lk', raw);
        if (activeStore && activeStore !== 'ALL') {
          localStorage.setItem(`rtst_luyke_tra_cham_${activeStore}`, raw);
        }
      } else {
        localStorage.setItem('crm_field_cleared_lk_tra_cham', String(Date.now()));
        removeLocalStorageByPrefix(['rtst_luyke_tra_cham_'], ['rtst_luyke_tra_cham', 'rt_tra_cham_lk']);
      }
    } catch {}
    try {
      const docKey = activeStore && activeStore !== 'ALL' ? `luyke_tra_cham_${activeStore}` : 'luyke_tra_cham_general';
      if (lastSavedClusterBoxRef.current[docKey] !== raw) {
        lastSavedClusterBoxRef.current[docKey] = raw;
        const docRef = doc(db, 'app_settings', docKey);
        safeSetDoc(docRef, {
          value: raw,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch((err) => console.warn('Firestore write warning:', err));
      }
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('luyke_tra_cham_updated', { detail: { value: raw, activeStore } }));
      }
    } catch {}
  };

  useEffect(() => {
    try {
      const docKeyRt = activeStore && activeStore !== 'ALL' ? `realtime_dt_thuc_${activeStore}` : 'realtime_dt_thuc_general';
      const docKeyLk = activeStore && activeStore !== 'ALL' ? `luyke_dt_thuc_${activeStore}` : 'luyke_dt_thuc_general';
      const docKeyRtTc = activeStore && activeStore !== 'ALL' ? `realtime_tra_cham_${activeStore}` : 'realtime_tra_cham_general';
      const docKeyLkTc = activeStore && activeStore !== 'ALL' ? `luyke_tra_cham_${activeStore}` : 'luyke_tra_cham_general';

      const shouldAcceptRemote = (fieldId: string, clearKey: string, val: string, updatedAt: any) => {
        const localEdit = lastLocalClusterEditRef.current[fieldId];
        if (localEdit && Date.now() - localEdit.time < 15000 && val !== localEdit.value) {
          return false;
        }
        try {
          const clearedTsStr = localStorage.getItem(clearKey);
          if (clearedTsStr && val) {
            const clearedTs = Number(clearedTsStr) || 0;
            const docTs = updatedAt?.toMillis ? updatedAt.toMillis() : (updatedAt?.seconds ? updatedAt.seconds * 1000 : 0);
            if (!docTs || docTs <= clearedTs + 5000) {
              return false;
            }
            localStorage.removeItem(clearKey);
          }
        } catch {}
        return true;
      };

      const unsub1 = onSnapshot(doc(db, 'app_settings', docKeyRt), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.value !== undefined) {
            const val = String(d.value || '');
            if (!shouldAcceptRemote('rt_market_thuc', 'crm_field_cleared_rt_market_thuc', val, d.updatedAt)) return;
            lastSavedClusterBoxRef.current[docKeyRt] = val;
            realtimeDtThucRef.current = val;
            setRealtimeDtThuc(val);
            if (val) {
              localStorage.setItem('rtst_realtime_dt_thuc', val);
              localStorage.setItem('rt_market_thuc', val);
              if (activeStore && activeStore !== 'ALL') {
                localStorage.setItem(`rtst_realtime_dt_thuc_${activeStore}`, val);
              }
            } else {
              removeLocalStorageByPrefix(['rtst_realtime_dt_thuc_'], ['rtst_realtime_dt_thuc', 'rt_market_thuc']);
            }
          }
        }
      }, () => {});
      const unsub2 = onSnapshot(doc(db, 'app_settings', docKeyLk), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.value !== undefined) {
            const val = String(d.value || '');
            if (!shouldAcceptRemote('rt_catrev_thuc', 'crm_field_cleared_rt_catrev_thuc', val, d.updatedAt)) return;
            lastSavedClusterBoxRef.current[docKeyLk] = val;
            luykeDtThucRef.current = val;
            setLuykeDtThuc(val);
            if (val) {
              localStorage.setItem('rtst_luyke_dt_thuc', val);
              localStorage.setItem('rt_catrev_thuc', val);
              if (activeStore && activeStore !== 'ALL') {
                localStorage.setItem(`rtst_luyke_dt_thuc_${activeStore}`, val);
              }
            } else {
              removeLocalStorageByPrefix(['rtst_luyke_dt_thuc_'], ['rtst_luyke_dt_thuc', 'rt_catrev_thuc', 'lk_market_thuc']);
            }
          }
        }
      }, () => {});
      const unsub3 = onSnapshot(doc(db, 'app_settings', docKeyRtTc), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.value !== undefined) {
            const val = String(d.value || '');
            if (!shouldAcceptRemote('rt_tra_cham', 'crm_field_cleared_rt_tra_cham', val, d.updatedAt)) return;
            lastSavedClusterBoxRef.current[docKeyRtTc] = val;
            realtimeTraChamRef.current = val;
            setRealtimeTraCham(val);
            if (val) {
              localStorage.setItem('rtst_realtime_tra_cham', val);
              localStorage.setItem('rt_tra_cham', val);
              if (activeStore && activeStore !== 'ALL') {
                localStorage.setItem(`rtst_realtime_tra_cham_${activeStore}`, val);
              }
            } else {
              removeLocalStorageByPrefix(['rtst_realtime_tra_cham_'], ['rtst_realtime_tra_cham', 'rt_tra_cham']);
            }
            try {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('realtime_tra_cham_updated', { detail: { value: val, activeStore } }));
              }
            } catch {}
          }
        }
      }, () => {});
      const unsub4 = onSnapshot(doc(db, 'app_settings', docKeyLkTc), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.value !== undefined) {
            const val = String(d.value || '');
            if (!shouldAcceptRemote('lk_tra_cham', 'crm_field_cleared_lk_tra_cham', val, d.updatedAt)) return;
            lastSavedClusterBoxRef.current[docKeyLkTc] = val;
            luykeTraChamRef.current = val;
            setLuykeTraCham(val);
            if (val) {
              localStorage.setItem('rtst_luyke_tra_cham', val);
              localStorage.setItem('rt_tra_cham_lk', val);
              if (activeStore && activeStore !== 'ALL') {
                localStorage.setItem(`rtst_luyke_tra_cham_${activeStore}`, val);
              }
            } else {
              removeLocalStorageByPrefix(['rtst_luyke_tra_cham_'], ['rtst_luyke_tra_cham', 'rt_tra_cham_lk']);
            }
            try {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('luyke_tra_cham_updated', { detail: { value: val, activeStore } }));
              }
            } catch {}
          }
        }
      }, () => {});

      return () => {
        unsub1();
        unsub2();
        unsub3();
        unsub4();
      };
    } catch {}
  }, [activeStore]);

  const [showTimeSettings, setShowTimeSettings] = useState(true);
  const [showRealtime, setShowRealtime] = useState(true);
  const [showClusterData, setShowClusterData] = useState(true);
  const [showStaffData, setShowStaffData] = useState(true);
  const [showTargetData, setShowTargetData] = useState(true);
  const [showStoreRevenueData, setShowStoreRevenueData] = useState(true);
  const [expandedInput, setExpandedInput] = useState<string | null>(null);
  const toggleInput = (id: string) => setExpandedInput(prev => prev === id ? null : id);
  const [savingRow, setSavingRow] = useState<string | null>(null);

  // Focus value trackers to prevent saving unchanged data on blur
  const focusedInputValRef = React.useRef<Record<string, string>>({});
  const focusedPercentRef = React.useRef<Record<string, number>>({});

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
    <div className="space-y-[16px] sm:space-y-[22px] mb-[32px]" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
      {/* Data Realtime Container - Modern V2 Redesign */}
      {activeTab === 'REALTIME' && (
      <div className="space-y-[16px] sm:space-y-[22px]">
        {/* Header Hero Card */}
        <div className="relative overflow-hidden bg-white rounded-[20px] sm:rounded-[24px] border border-[#E2EAF4] p-[14px] sm:p-[22px] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-[12px] sm:gap-[16px]">
          <div className="flex items-start sm:items-center gap-[12px] sm:gap-[14px] min-w-0">
            <div className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-[#10B981] via-[#0D9488] to-[#0891B2] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(16,185,129,0.25)] shrink-0">
              <Zap size={24} className="shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-[8px] sm:gap-[10px] flex-wrap">
                <h1 className="text-[17px] sm:text-[22px] font-black text-[#0B1F3A] tracking-tight uppercase leading-snug" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                  CẬP NHẬT DỮ LIỆU
                </h1>
                <span className="px-[10px] py-[3px] rounded-full text-[11px] font-black bg-[#E6FAEF] text-[#047857] border border-[#A7F3D0] leading-none whitespace-nowrap">
                  V2.0 BI
                </span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-[#64748B] font-medium mt-[4px] flex flex-wrap items-center gap-[5px] leading-relaxed">
                <span>⚡ Bấm vào từng ô và dán dữ liệu</span>
                <kbd className="px-[7px] py-[2px] bg-[#EEF2FF] border border-[#C7D2FE] rounded-[6px] text-[11px] font-black text-[#1E3A8A] font-sans">Ctrl + V</kbd>
                <span>từ báo cáo BI để tự động phân tích &amp; đồng bộ.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-[10px] flex-wrap self-start md:self-center shrink-0">
            {/* Nút RESET DỮ LIỆU đã được ẩn theo yêu cầu */}
            <div className="flex items-center gap-[8px] px-[14px] py-[8px] sm:py-[9px] bg-white border border-[#E2EAF4] rounded-full shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div className={cn("w-[8px] h-[8px] rounded-full shrink-0", (isSavingRealtime || isLoadingRealtime) ? "bg-amber-500 animate-ping" : "bg-[#10B981]")} />
              <span className="text-[11.5px] sm:text-[12px] font-black text-[#0F172A] uppercase tracking-wide whitespace-nowrap">
                {isSavingRealtime ? "ĐANG LƯU DỮ LIỆU..." : isLoadingRealtime ? "ĐANG TẢI DỮ LIỆU..." : lastUpdatedRealtime ? `ĐÃ CẬP NHẬT ${lastUpdatedRealtime.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}` : "HỆ THỐNG SẴN SÀNG"}
              </span>
            </div>
          </div>
        </div>

        {showAll && showRealtime && (
        <div className="space-y-[16px] sm:space-y-[22px]">
          {/* Groups: DOANH THU CỤM + THI ĐUA CỤM + TRẢ CHẬM CỤM */}
          <div className="flex flex-col gap-[16px] sm:gap-[22px]">
            {[
              { 
                title: 'DOANH THU CỤM', 
                subtitle: 'Dữ liệu Doanh thu Realtime & Luỹ kế',
                badgeBg: 'bg-[#F4F9FF] text-[#0D6EFD] border-[#CFE2FF] hover:bg-[#E6F1FF]',
                iconBoxClass: 'bg-[#EBF3FF] border border-[#D4E5FF] text-[#0D6EFD]',
                groupIcon: 'chart',
                activeColor: 'emerald',
                reportUrl: 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated',
                reportLabel: 'LINK REPORT DT',
                items: [
                  { 
                    id: 'rt_market_thuc', 
                    label: 'REALTIME DOANH THU THỰC', 
                    value: realtimeDtThuc, 
                    onChange: handleSaveRealtimeDtThuc, 
                    hasData: !!realtimeDtThuc,
                    colorTheme: 'emerald'
                  },
                  { 
                    id: 'rt_catrev_thuc', 
                    label: 'LUỸ KẾ DOANH THU THỰC', 
                    value: luykeDtThuc, 
                    colorTheme: 'emerald',
                    onChange: handleSaveLuykeDtThuc, 
                    hasData: !!luykeDtThuc,
                    isLuyke: true 
                  },
                  { 
                    id: 'rt_market', 
                    label: 'REALTIME DOANH THU QUY ĐỔI', 
                    value: marketInput, 
                    onChange: (val: string) => {
                      try {
                        if (val) localStorage.removeItem('crm_field_cleared_rt_market');
                      } catch {}
                      setMarketInput(val);
                    }, 
                    onBlur: () => onSaveRealtime(false, 'REALTIME DT'), 
                    hasData: !!marketInput,
                    colorTheme: 'blue'
                  },
                  { 
                    id: 'rt_catrev', 
                    label: 'LUỸ KẾ DOANH THU QUY ĐỔI', 
                    value: clusterSummaryInput || categoryRevenueInput, 
                    colorTheme: 'blue',
                    onChange: (val: string) => { 
                      setCategoryRevenueInput(val); 
                      setClusterSummaryInput(val); 
                      try {
                        if (val) {
                          localStorage.removeItem('crm_field_cleared_rt_catrev');
                          localStorage.setItem('rt_catrev', val);
                          localStorage.setItem('rtst_cluster_summary', val);
                          localStorage.setItem('rtst_catrev', val);
                        } else {
                          localStorage.setItem('crm_field_cleared_rt_catrev', String(Date.now()));
                          removeLocalStorageByPrefix(['rt_catrev_', 'rtst_cluster_summary_', 'rtst_catrev_'], ['rt_catrev', 'rtst_cluster_summary', 'rtst_catrev', 'rtst_doanh_thu_hop_nhat']);
                        }
                      } catch {}
                    }, 
                    onBlur: () => { 
                      try {
                        const v = clusterSummaryInput || categoryRevenueInput || '';
                        if (v) {
                          localStorage.setItem('rt_catrev', v);
                          localStorage.setItem('rtst_cluster_summary', v);
                          localStorage.setItem('rtst_catrev', v);
                        } else {
                          removeLocalStorageByPrefix(['rt_catrev_', 'rtst_cluster_summary_', 'rtst_catrev_'], ['rt_catrev', 'rtst_cluster_summary', 'rtst_catrev', 'rtst_doanh_thu_hop_nhat']);
                        }
                      } catch {}
                      onSaveRealtime(false, 'LUỸ KẾ DT'); 
                      onSaveLuyke(false, 'auto', undefined, undefined, 'LUỸ KẾ DT'); 
                    }, 
                    hasData: !!(clusterSummaryInput || categoryRevenueInput), 
                    isLuyke: true 
                  },
                ]
              },
              { 
                title: 'THI ĐUA CỤM', 
                subtitle: 'Dữ liệu Thi đua Realtime & Luỹ kế theo kênh',
                badgeBg: 'bg-[#FFFDF5] text-[#D97706] border-[#FDE0A6] hover:bg-[#FFF5D6]',
                iconBoxClass: 'bg-[#FFF8E6] border border-[#FDE4A6] text-[#F59E0B]',
                groupIcon: 'trophy',
                activeColor: 'amber',
                hasYcx: false,
                reportUrl: 'https://baocao.dienmayxanh.com/dashboard/thi-dua',
                reportLabel: 'LINK REPORT TĐ',
                items: [
                  { 
                    id: 'rt_cat', 
                    label: 'REALTIME THI ĐUA', 
                    value: categoryInput, 
                    onChange: (val: string) => {
                      try {
                        if (val) localStorage.removeItem('crm_field_cleared_rt_cat');
                      } catch {}
                      setCategoryInput(val);
                    }, 
                    onBlur: () => onSaveRealtime(false, 'REALTIME TĐ'), 
                    hasData: !!categoryInput,
                    colorTheme: 'amber'
                  },
                  { 
                    id: 'rt_catlk', 
                    label: 'LUỸ KẾ THI ĐUA', 
                    value: categoryTargetInput || clusterCategoryInput, 
                    colorTheme: 'orange',
                    onChange: (val: string) => { 
                      setCategoryTargetInput(val); 
                      setClusterCategoryInput && setClusterCategoryInput(val); 
                      try {
                        if (val) {
                          localStorage.removeItem('crm_field_cleared_rt_catlk');
                        } else {
                          localStorage.setItem('crm_field_cleared_rt_catlk', String(Date.now()));
                          removeLocalStorageByPrefix(['rtst_cat_target_', 'rtst_catlk_', 'rtst_cluster_category_'], ['rt_catlk', 'rtst_catlk', 'rtst_cluster_category']);
                        }
                      } catch {}
                    }, 
                    onBlur: () => { 
                      onSaveRealtime(false, 'LUỸ KẾ TĐ'); 
                      onSaveLuyke && onSaveLuyke(false, 'auto', undefined, undefined, 'LUỸ KẾ TĐ'); 
                    }, 
                    hasData: !!(categoryTargetInput || clusterCategoryInput) 
                  },
                ]
              },
              { 
                title: 'TRẢ CHẬM CỤM', 
                subtitle: 'Dữ liệu Trả chậm Realtime & Luỹ kế',
                badgeBg: 'bg-[#FAF5FF] text-[#7C3AED] border-[#E9D5FF] hover:bg-[#F3E8FF]',
                iconBoxClass: 'bg-[#F5EEFF] border border-[#E2D0FF] text-[#7C3AED]',
                groupIcon: 'card',
                activeColor: 'purple',
                hasYcx: false,
                reportUrl: 'https://baocao.dienmayxanh.com/dashboard/tra-cham',
                reportLabel: 'LINK REPORT TRẢ CHẬM',
                items: [
                  { 
                    id: 'rt_tra_cham', 
                    label: 'REALTIME TRẢ CHẬM', 
                    value: realtimeTraCham, 
                    onChange: handleSaveRealtimeTraCham, 
                    hasData: !!realtimeTraCham,
                    colorTheme: 'purple'
                  },
                  { 
                    id: 'lk_tra_cham', 
                    label: 'LUỸ KẾ TRẢ CHẬM', 
                    value: luykeTraCham, 
                    colorTheme: 'violet',
                    onChange: handleSaveLuykeTraCham, 
                    hasData: !!luykeTraCham,
                    isLuyke: true 
                  },
                ]
              },
            ].map(group => (
              <div key={group.title} className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#E2EAF4] p-[14px] sm:p-[22px] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] space-y-[14px] sm:space-y-[18px]">
                <div className="flex flex-wrap items-center justify-between gap-[10px] border-b border-[#EEF3F9] pb-[12px] sm:pb-[14px]">
                  <div className="flex items-center gap-[12px] min-w-0">
                    <div className={cn("w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[12px] flex items-center justify-center shrink-0 shadow-2xs", group.iconBoxClass)}>
                      {group.groupIcon === 'chart' ? (
                        <BarChart3 size={22} className="stroke-[2.3]" />
                      ) : group.groupIcon === 'trophy' ? (
                        <Trophy size={21} className="stroke-[2.2]" />
                      ) : (
                        <CreditCard size={21} className="stroke-[2.2]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[15px] sm:text-[17px] font-black text-[#0B1F3A] uppercase tracking-tight leading-snug" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                        {group.title}
                      </h2>
                      <p className="text-[11.5px] sm:text-[12.5px] font-medium text-[#64748B] mt-[1px] leading-snug">
                        {group.subtitle}
                      </p>
                    </div>
                  </div>
                  <a 
                    href={group.reportUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn("min-h-[38px] px-[12px] sm:px-[14px] py-[7px] rounded-[11px] text-[11.5px] sm:text-[12px] font-black uppercase border cursor-pointer transition-all inline-flex items-center gap-[6px] shrink-0 whitespace-nowrap shadow-2xs", group.badgeBg)}
                  >
                    <ExternalLink size={14} className="shrink-0" />
                    <span>{group.reportLabel}</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] sm:gap-[16px]">
                  {group.items.map(item => (
                    <ReportInputBox
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      value={item.value}
                      onChange={item.onChange}
                      onBlur={(item as any).onBlur}
                      colorTheme={item.colorTheme as any}
                      onClear={() => {
                        if (item.label === 'REALTIME DT' || item.label === 'REALTIME DOANH THU QUY ĐỔI') {
                          try {
                            localStorage.setItem('crm_field_cleared_rt_market', String(Date.now()));
                            removeLocalStorageByPrefix(['rtst_market_input_'], ['rtst_market_input', 'rt_market', 'rt_market_qd']);
                          } catch {}
                          setMarketInput('');
                          if (clearField) clearField(setMarketInput, 'REALTIME DT');
                          else onSaveRealtime(true, 'REALTIME DT');
                          showNotification('Đã xóa dữ liệu REALTIME DOANH THU QUY ĐỔI', 'info');
                        } else if (item.label === 'LUỸ KẾ DT' || item.label === 'LUỸ KẾ DOANH THU QUY ĐỔI') {
                          try {
                            localStorage.setItem('crm_field_cleared_rt_catrev', String(Date.now()));
                            removeLocalStorageByPrefix(['rt_catrev_', 'rtst_cluster_summary_', 'rtst_catrev_'], ['rt_catrev', 'rtst_cluster_summary', 'rtst_catrev', 'rtst_doanh_thu_hop_nhat']);
                          } catch {}
                          setCategoryRevenueInput('');
                          setClusterSummaryInput('');
                          if (clearField) clearField(setCategoryRevenueInput, 'LUỸ KẾ DT');
                          else {
                            onSaveRealtime(true, 'LUỸ KẾ DT');
                            onSaveLuyke(true, 'auto', undefined, undefined, 'LUỸ KẾ DT');
                          }
                          showNotification('Đã xóa dữ liệu LUỸ KẾ DOANH THU QUY ĐỔI', 'info');
                        } else if (item.label === 'REALTIME DOANH THU THỰC') {
                          handleSaveRealtimeDtThuc('');
                          showNotification('Đã xóa dữ liệu REALTIME DOANH THU THỰC', 'info');
                        } else if (item.label === 'LUỸ KẾ DOANH THU THỰC') {
                          handleSaveLuykeDtThuc('');
                          showNotification('Đã xóa dữ liệu LUỸ KẾ DOANH THU THỰC', 'info');
                        } else if (item.label === 'REALTIME TRẢ CHẬM') {
                          handleSaveRealtimeTraCham('');
                          showNotification('Đã xóa dữ liệu REALTIME TRẢ CHẬM', 'info');
                        } else if (item.label === 'LUỸ KẾ TRẢ CHẬM') {
                          handleSaveLuykeTraCham('');
                          showNotification('Đã xóa dữ liệu LUỸ KẾ TRẢ CHẬM', 'info');
                        } else if (item.label === 'REALTIME THI ĐUA' || item.label === 'REALTIME TĐ') {
                          try {
                            localStorage.setItem('crm_field_cleared_rt_cat', String(Date.now()));
                            removeLocalStorageByPrefix(['rtst_category_input_'], ['rtst_category_input', 'rt_cat']);
                          } catch {}
                          setCategoryInput('');
                          if (clearField) clearField(setCategoryInput, 'REALTIME TĐ');
                          else onSaveRealtime(true, 'REALTIME TĐ');
                          showNotification('Đã xóa dữ liệu REALTIME THI ĐUA', 'info');
                        } else if (item.label === 'LUỸ KẾ THI ĐUA' || item.label === 'LUỸ KẾ TĐ') {
                          try {
                            localStorage.setItem('crm_field_cleared_rt_catlk', String(Date.now()));
                            removeLocalStorageByPrefix(['rtst_cat_target_', 'rtst_catlk_', 'rtst_cluster_category_'], ['rt_catlk', 'rtst_catlk', 'rtst_cluster_category']);
                          } catch {}
                          setCategoryTargetInput('');
                          if (setClusterCategoryInput) setClusterCategoryInput('');
                          if (clearField) clearField(setCategoryTargetInput, 'LUỸ KẾ TĐ');
                          else {
                            onSaveRealtime(true, 'LUỸ KẾ TĐ');
                            onSaveLuyke(true, 'auto', undefined, undefined, 'LUỸ KẾ TĐ');
                          }
                          showNotification('Đã xóa dữ liệu LUỸ KẾ THI ĐUA', 'info');
                        } else {
                          if (clearField) clearField(item.onChange, item.label);
                          else item.onChange('');
                        }
                      }}
                    />
                  ))}
                </div>

                {group.hasYcx && (
                  <label className="mt-[12px] flex items-center gap-[12px] px-[14px] py-[12px] rounded-[16px] border-2 border-dashed border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer">
                    <div className={cn("w-[36px] h-[36px] rounded-[10px] flex items-center justify-center shrink-0", ycxFileName ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400")}>
                      <FileSpreadsheet size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className={cn("text-[12px] font-black uppercase tracking-wide", ycxFileName ? "text-teal-700" : "text-slate-500")}>YCX NHÂN VIÊN</span>
                      {ycxFileName && <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{ycxFileName}</p>}
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
      <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#E2EAF4] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Header */}
        <div className="px-[14px] py-[14px] sm:px-[22px] sm:py-[18px] border-b border-[#EEF3F9] bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]">
            <div className="flex items-center gap-[12px]">
              <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[12px] bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Store size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-[17px] font-black text-[#0B1F3A] uppercase tracking-tight leading-snug" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  CẤU HÌNH SIÊU THỊ &amp; NHÂN VIÊN
                </h2>
                <p className="text-[11.5px] sm:text-[12.5px] font-medium text-[#64748B] mt-[1px] leading-snug">
                  Dữ liệu Doanh thu NV, Thi đua NV, Bán kèm, Trả góp và Phục vụ
                </p>
              </div>
            </div>

            {availableMarkets.length > 0 && (
            <div className="flex items-center gap-[6px] overflow-x-auto no-scrollbar bg-slate-100/80 p-[6px] rounded-[14px] border border-slate-200">
              <button
                onClick={() => onStoreChange?.('ALL')}
                className={cn(
                  "min-h-[36px] flex items-center gap-[6px] px-[12px] py-[6px] rounded-[10px] text-[11.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 cursor-pointer",
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
                    "min-h-[36px] flex items-center gap-[6px] px-[12px] py-[6px] rounded-[10px] text-[11.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 cursor-pointer",
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
        <div className="p-[14px] sm:p-[22px]">
          {(availableMarkets || []).filter(m => m !== 'ALL').length === 0 ? (
            <div className="text-center py-[28px]">
              <p className="text-[13px] text-slate-400">Chưa có siêu thị nào. Vui lòng nhập dữ liệu tại "DOANH THU CỤM" hoặc "THI ĐUA CỤM" trước.</p>
            </div>
          ) : (
          <div className={cn(
            "grid gap-[14px] sm:gap-[20px]",
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
              const cardStaffInput = (isActiveCard && staffInput) ? staffInput : (cachedData?.staffInput || staffInput || '');
              const cardStaffCategoryInput = (isActiveCard && staffCategoryInput) ? staffCategoryInput : (cachedData?.staffCategoryInput || staffCategoryInput || '');
              const cardBanKemNv = (isActiveCard && banKemNv) ? banKemNv : (cachedData?.banKemNv || banKemNv || '');
              const cardTragopMatran = (isActiveCard && storeConfig['tragop_matran']) ? storeConfig['tragop_matran'] : (cachedData?.tragopMatran || storeConfig['tragop_matran'] || '');
              const cardTragopNv = (isActiveCard && tragopNv) ? tragopNv : (cachedData?.tragopNv || tragopNv || '');
              const cardPhucVu = (isActiveCard && phucVu) ? phucVu : (cachedData?.phucVu || phucVu || '');
              const cardPercentTarget = (isActiveCard && stPercentTarget) ? stPercentTarget : (cachedData?.stPercentTarget || stPercentTarget || 100);
              const cardCategoryTargets = (isActiveCard && categoryTargets && categoryTargets.length > 0) ? categoryTargets : (cachedData?.categoryTargets || categoryTargets || []);

              const handleCardActivate = () => {
                if (!isActiveCard && onStoreChange) {
                  onStoreChange(storeName);
                }
              };

              const storeCleanNum = storeName ? storeName.replace(/\D/g, '') : '';
              const cardStaffInputThuc = dtThucNvMap[storeName] !== undefined
                ? dtThucNvMap[storeName]
                : ((storeCleanNum && localStorage.getItem(`real_dthu_nv_raw_thuc_${storeCleanNum}`)) ||
                   localStorage.getItem(`cauhinh_${storeName}_dt_thuc_nv`) ||
                   cachedData?.staffInputThuc || '');

              const storeFields = [
                { 
                  key: `${storeName}_dt_thuc_nv`, 
                  label: 'D.THU THỰC NHÂN VIÊN', 
                  value: cardStaffInputThuc, 
                  setter: (v: string) => handleUpdateDtThucNv(storeName, v), 
                  onBlur: () => handleBlurDtThucNv(storeName),
                  onClear: () => handleClearDtThucNv(storeName),
                  biLink: 'https://bi.thegioididong.com/sieu-thi-con?id=16500&tab=bcdtnv&rt=2&dm=1',
                  colorTheme: 'emerald' as const
                },
                { 
                  key: `${storeName}_dt_nv`, 
                  label: 'D.THU QUY ĐỔI NHÂN VIÊN', 
                  value: cardStaffInput, 
                  setter: isActiveCard ? setStaffInput : undefined, 
                  biLink: 'https://bi.thegioididong.com/sieu-thi-con?id=16500&tab=bcdtnv&rt=2&dm=1',
                  colorTheme: 'blue' as const
                },
                { 
                  key: `${storeName}_td_nv`, 
                  label: 'THI ĐUA NV', 
                  value: cardStaffCategoryInput, 
                  setter: isActiveCard ? setStaffCategoryInput : undefined,
                  colorTheme: 'orange' as const
                },
                { 
                  key: `${storeName}_tragop`, 
                  label: 'TRẢ GÓP NV', 
                  value: cardTragopNv, 
                  setter: isActiveCard ? setTragopNv : undefined,
                  colorTheme: 'purple' as const
                },
              ];

              return (
                <div 
                  key={storeName} 
                  className={cn(
                    "rounded-[18px] sm:rounded-[20px] overflow-hidden bg-white transition-all shadow-sm",
                    isActiveCard 
                      ? "border-2 border-emerald-500/80 shadow-emerald-500/5 ring-4 ring-emerald-500/10" 
                      : "border border-slate-200 cursor-pointer opacity-80 hover:opacity-100 hover:border-slate-300"
                  )}
                  onClick={!isActiveCard ? handleCardActivate : undefined}
                >
                  {/* Gradient accent top stripe */}
                  <div className={cn("h-[6px] bg-gradient-to-r", color.border)} />

                  {/* Store Card Header */}
                  <div className="px-[14px] py-[12px] sm:px-[18px] sm:py-[14px] flex flex-wrap items-center justify-between gap-[8px] border-b border-slate-100 bg-slate-50/50">
                    <div className="min-w-0">
                      <h3 className="text-[14px] sm:text-[15px] font-black text-slate-900 uppercase tracking-tight break-words" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                        {storeName}
                      </h3>
                      <p className="text-[11.5px] text-slate-400 font-medium mt-[1px]">
                        Cấu hình và dữ liệu chi tiết siêu thị
                      </p>
                    </div>
                    {isActiveCard ? (
                      <span className="text-[11px] font-black px-[12px] py-[4px] rounded-full bg-emerald-500 text-white shadow-xs shrink-0">
                        ĐANG CHỌN
                      </span>
                    ) : (
                      <span className="text-[11px] font-black text-slate-500 px-[12px] py-[4px] rounded-full border border-slate-200 bg-white shadow-xs shrink-0">
                        BẤM ĐỂ CHỌN
                      </span>
                    )}
                  </div>

                  {/* Store Card Body */}
                  <div className="p-[12px] sm:p-[18px] space-y-[12px] sm:space-y-[14px] bg-white">
                    {/* Bố cục 1 cột các ô dữ liệu */}
                    <div className="grid grid-cols-1 gap-[12px] sm:gap-[14px]">
                      {storeFields.map(item => {
                        const handleChange = (v: string) => {
                          if (!isActiveCard) { handleCardActivate(); }
                          const cleanV = cleanBiReportText(v);
                          if (item.setter) {
                            item.setter(cleanV);
                          }
                        };
                        const handleClear = () => {
                          if (!isActiveCard) handleCardActivate();
                          if ((item as any).onClear) {
                            (item as any).onClear();
                          } else if (item.setter) {
                            if (clearField) clearField(item.setter, item.label);
                            else item.setter('');
                            setTimeout(() => onSaveLuyke(true, 'auto', undefined, undefined, item.label), 200);
                          }
                        };

                        return (
                          <ReportInputBox
                            key={item.key}
                            id={item.key}
                            label={item.label}
                            value={item.value || ''}
                            externalLink={item.biLink}
                            colorTheme={item.colorTheme}
                            onChange={(v) => {
                              handleChange(v);
                            }}
                            onBlur={() => {
                              if ((item as any).onBlur) {
                                (item as any).onBlur();
                              } else {
                                onSaveLuyke(false, 'auto', undefined, undefined, item.label);
                              }
                            }}
                            onClear={handleClear}
                          />
                        );
                      })}
                    </div>

                    {/* Phục vụ upload */}
                    <div className={cn(
                      "w-full min-h-[48px] flex flex-wrap items-center justify-between gap-[10px] px-[14px] py-[10px] rounded-[14px] border transition-all group relative shadow-xs",
                      cardPhucVu ? "border-emerald-300 bg-gradient-to-r from-emerald-50/60 to-teal-50/40" : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                    )}>
                      <div className="flex items-center gap-[10px] min-w-0">
                        <div className={cn(
                          "w-[32px] h-[32px] rounded-[10px] flex items-center justify-center shrink-0 shadow-xs",
                          cardPhucVu ? "bg-emerald-600 text-white" : "bg-indigo-50 border border-indigo-200 text-indigo-600"
                        )}>
                          <UploadCloud size={15} />
                        </div>
                        <div className="flex items-center gap-[8px] min-w-0">
                          <span className={cn(
                            "text-[12.5px] font-black uppercase tracking-wide break-words",
                            cardPhucVu ? "text-emerald-900" : "text-slate-700"
                          )}>
                            {cardPhucVu ? 'ĐÃ TẢI DỮ LIỆU' : 'CHỌN FILE DỮ LIỆU'}
                          </span>
                          <a 
                            href="https://crm.thegioididong.com/Reviewuser/ReportCustomerRatings" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-600 hover:text-indigo-800 z-20 relative bg-indigo-50 hover:bg-indigo-100 p-[5px] rounded-[6px] transition-colors shrink-0"
                            title="Lấy file Báo cáo Phục vụ từ CRM"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-[6px] shrink-0">
                        <div className={cn(
                          "text-[11px] font-black px-[10px] py-[4px] rounded-[8px] border",
                          cardPhucVu ? "text-emerald-700 bg-white border-emerald-200" : "text-slate-500 bg-white border-slate-200"
                        )}>
                          BÁO CÁO PHỤC VỤ
                        </div>
                        {cardPhucVu && isActiveCard && (
                          <div 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (setPhucVu) setPhucVu(''); }} 
                            className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shrink-0 z-20 relative cursor-pointer" 
                            title="Xoá dữ liệu"
                          >
                            <X size={14} />
                          </div>
                        )}
                      </div>
                      {isActiveCard && (
                        <input type="file" onChange={handlePhucVuUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title={cardPhucVu ? "Nhấn để tải đè file mới" : "Nhấn để chọn file"} />
                      )}
                    </div>

                    {/* % TARGET input — per-store */}
                    <div className="min-h-[48px] flex items-center justify-between gap-[10px] px-[14px] py-[8px] rounded-[14px] border border-slate-200 bg-slate-50/60 shadow-xs">
                      <div className="flex items-center gap-[10px]">
                        <div className={cn(
                          "w-[32px] h-[32px] rounded-[10px] flex items-center justify-center shrink-0 shadow-xs",
                          cardPercentTarget ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-400"
                        )}>
                          <Target size={15} />
                        </div>
                        <span className={cn(
                          "text-[12.5px] font-black uppercase tracking-wide",
                          cardPercentTarget ? "text-emerald-900" : "text-slate-600"
                        )}>
                          % TARGET
                        </span>
                      </div>
                      <input 
                        type="number" 
                        value={cardPercentTarget || ''} 
                        onFocus={() => {
                          focusedPercentRef.current[storeName] = cardPercentTarget;
                        }}
                        onChange={(e) => { if (isActiveCard) setStPercentTarget(Number(e.target.value)); else handleCardActivate(); }}
                        onBlur={() => { 
                          if (isActiveCard) {
                            const prevPercent = focusedPercentRef.current[storeName];
                            if (prevPercent !== undefined && prevPercent === cardPercentTarget) {
                              // Unchanged, skip DB write!
                              return;
                            }
                            focusedPercentRef.current[storeName] = cardPercentTarget;
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
                          "w-[84px] min-h-[36px] border rounded-[10px] px-[10px] py-[6px] text-[13px] font-sans font-bold text-center outline-none transition-all shadow-inner",
                          isActiveCard ? "bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800" : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400"
                        )} 
                      />
                    </div>

                    {/* TARGET THI ĐUA — per-store, collapsible */}
                    {cardCategoryTargets.length > 0 && (
                    <div className="mt-[8px] border border-violet-200/90 rounded-[14px] overflow-hidden shadow-xs bg-white">
                      <button 
                        onClick={() => toggleInput(`${storeName}_thidua`)}
                        className={cn(
                          "w-full min-h-[48px] flex items-center justify-between gap-[10px] px-[14px] py-[10px] text-left transition-all cursor-pointer",
                          expandedInput === `${storeName}_thidua` ? "bg-violet-50/80" : "bg-white hover:bg-violet-50/40"
                        )}
                      >
                        <div className="flex items-center gap-[10px]">
                          <div className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center shrink-0 bg-violet-600 text-white shadow-xs">
                            <Zap size={15} />
                          </div>
                          <span className="text-[12.5px] font-black uppercase tracking-wide text-violet-900">TARGET THI ĐUA</span>
                        </div>
                        <ChevronDown size={16} className={cn("text-violet-500 transition-transform", expandedInput === `${storeName}_thidua` && "rotate-180")} />
                      </button>
                      {expandedInput === `${storeName}_thidua` && (
                        <div className="p-[12px] sm:p-[14px] border-t border-violet-100 space-y-[12px] bg-slate-50/30">
                          {/* Toolbar — only for active card */}
                          {isActiveCard && (
                          <div className="flex flex-wrap items-center gap-[8px]">
                            <button onClick={onAnalyze} className="min-h-[36px] px-[12px] py-[6px] bg-white text-violet-700 border border-violet-200 rounded-[10px] text-[11px] font-black uppercase tracking-wider hover:bg-violet-50 transition-all active:scale-95 flex items-center gap-[5px] shadow-xs cursor-pointer">
                              <Zap size={12} /> ĐỒNG BỘ
                            </button>
                            <input type="number" value={globalPercent} onChange={(e) => handleGlobalPercentChange(Number(e.target.value))} className="w-[68px] min-h-[36px] bg-white border border-slate-200 rounded-[10px] px-[8px] py-[6px] text-[12.5px] font-sans font-bold text-center shadow-inner" placeholder="%" />
                             <button onClick={() => { const nt = categoryTargets.map(item => ({ ...item, percent: globalPercent, adjustedTarget: item.target * (globalPercent / 100) })); setCategoryTargets(nt); onSaveLuyke(false, 'targets', undefined, nt, 'TARGET THI ĐUA'); }} className="min-h-[36px] px-[12px] py-[6px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-[10px] text-[11px] font-black uppercase transition-all active:scale-95 shadow-xs cursor-pointer">ÁP DỤNG ALL</button>
                            <button onClick={() => onSaveLuyke(false, 'targets', undefined, undefined, 'TARGET THI ĐUA')} disabled={isSavingTargets} className="min-h-[36px] px-[14px] py-[6px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-[10px] text-[11px] font-black uppercase transition-all active:scale-95 flex items-center gap-[5px] disabled:opacity-50 shadow-xs cursor-pointer">
                              {isSavingTargets ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} LƯU
                            </button>
                          </div>
                          )}
                          {/* Tables */}
                          {['SL', 'DT'].map(type => {
                            const items = cardCategoryTargets.filter(item => type === 'SL' ? item.type === 'SL' : item.type !== 'SL');
                            if (items.length === 0) return null;
                            return (
                              <div key={type} className="bg-white rounded-[12px] border border-slate-200 p-[10px] overflow-x-auto">
                                <h4 className="text-[11.5px] font-black text-slate-500 mb-[8px] uppercase">Ngành hàng ({type})</h4>
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="text-[10.5px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                      <th className="p-[6px]">Tên NH</th>
                                      <th className="p-[6px]">Target</th>
                                      <th className="p-[6px]">Sau ĐC</th>
                                      <th className="p-[6px] text-center">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map(item => (
                                      <tr key={item.name} className="border-t border-slate-50">
                                        <td className="p-[6px] text-[11.5px] font-black text-slate-800">{item.name}</td>
                                        <td className="p-[6px] text-[11.5px] text-slate-600">{item.target.toLocaleString()}</td>
                                        <td className="p-[6px] text-[11.5px] font-black text-indigo-600">{item.adjustedTarget.toLocaleString()}</td>
                                        <td className="p-[6px] text-center">
                                          <input 
                                            type="number" 
                                            value={item.percent} 
                                            onChange={(e) => { 
                                              if (!isActiveCard) return; 
                                              const nv = Number(e.target.value); 
                                              const nt = categoryTargets.map(t => t.name === item.name ? { ...t, percent: nv, adjustedTarget: t.target * (nv / 100) } : t); 
                                              setCategoryTargets(nt); 
                                            }} 
                                            onBlur={() => {
                                              if (!isActiveCard) return;
                                              if (onSaveLuyke) { 
                                                onSaveLuyke(true, 'targets', undefined, categoryTargets, 'TARGET THI ĐUA'); 
                                              } 
                                            }}
                                            disabled={!isActiveCard} 
                                            className={cn("w-[56px] border rounded-[8px] p-[4px] text-[11.5px] text-center font-sans font-normal outline-none", isActiveCard ? "bg-slate-50 border-slate-200 focus:ring-1 focus:ring-indigo-500" : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400")} 
                                          />
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
      <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#E2EAF4] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-[14px] py-[14px] sm:px-[22px] sm:py-[18px] flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 border-b border-[#EEF3F9]">
          <div className="flex items-center gap-[12px]">
            <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[12px] flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-[15px] sm:text-[17px] font-black text-[#0B1F3A] uppercase tracking-tight leading-snug" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                CÀI ĐẶT THỜI GIAN
              </h3>
              <p className="text-[11.5px] sm:text-[12.5px] font-medium text-[#64748B] mt-[1px]">
                Tháng báo cáo và tiến độ ngày trong tháng
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowTimeSettings(!showTimeSettings)}
            className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center bg-slate-100/80 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-all cursor-pointer shrink-0"
          >
            <ChevronDown size={18} className={cn("transition-transform duration-300", showTimeSettings && "rotate-180")} />
          </button>
        </div>
        
        {showAll && showTimeSettings && (
          <div className="p-[14px] sm:p-[22px]" style={{ overflow: 'visible' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] sm:gap-[20px]" style={{ overflow: 'visible' }}>
              <div className="space-y-[8px]">
                <label className="text-[12px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-[6px]">
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
                        className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-[12px] px-[14px] py-[10px] text-[13.5px] font-black text-slate-700 text-left flex items-center justify-between hover:bg-white hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <span className="flex items-center gap-[8px]">
                          <Calendar size={16} className="text-indigo-500" />
                          {displayLabel}
                        </span>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
                      </button>
                      {showPicker && (
                        <div className="absolute z-50 bottom-full mb-[8px] left-0 w-[260px] bg-white border border-slate-200 rounded-[16px] shadow-xl p-[14px]">
                          <div className="flex items-center justify-between mb-[10px]">
                            <button type="button" onClick={() => setPickerYear(y => y - 1)} className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center hover:bg-slate-100 text-slate-500 font-black transition-all">&lt;</button>
                            <span className="text-[14px] font-black text-slate-700">{pickerYear}</span>
                            <button type="button" onClick={() => setPickerYear(y => y + 1)} className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center hover:bg-slate-100 text-slate-500 font-black transition-all">&gt;</button>
                          </div>
                          <div className="grid grid-cols-4 gap-[6px]">
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
                                  className={`py-[8px] px-[4px] rounded-[10px] text-[12px] font-black transition-all ${
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
              <div className="space-y-[8px]">
                <label className="text-[12px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-[6px]">
                  <Zap size={14} className="text-amber-500" /> NGÀY ĐÃ QUA / TỔNG NGÀY
                </label>
                <div className="flex items-center gap-[10px]">
                  <input 
                    type="number"
                    value={daysPassed}
                    readOnly
                    className="flex-1 min-h-[44px] bg-slate-100 border border-slate-200 rounded-[12px] px-[14px] py-[10px] text-[14px] font-sans font-bold text-slate-600 cursor-not-allowed outline-none transition-all text-center"
                    title="Tự động: Tháng quá khứ = Tổng ngày; Tháng hiện tại = Ngày hiện tại - 1"
                  />
                  <span className="text-[20px] font-light text-slate-300">/</span>
                  <input 
                    type="number"
                    value={totalDays}
                    readOnly
                    className="flex-1 min-h-[44px] bg-slate-100 border border-slate-200 rounded-[12px] px-[14px] py-[10px] text-[14px] font-sans font-bold text-slate-600 cursor-not-allowed outline-none transition-all text-center"
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
