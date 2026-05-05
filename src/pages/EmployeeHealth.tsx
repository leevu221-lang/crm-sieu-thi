/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { HeartPulse, Camera, TrendingUp, Search, ChevronDown, Check, MessageSquare, FileText, ChevronRight, LayoutGrid, Info, Users, Printer, UploadCloud, Trophy, TrendingDown, Gift, Target } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { useEmployeeHealth } from './EmployeeHealth/hooks/useEmployeeHealth';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { useNotification } from '../contexts/NotificationContext';
import RevenueRankingTableQd from './EmployeeHealth/components/RevenueRankingTableQd';
import EmployeeDetailTable from './EmployeeHealth/components/EmployeeDetailTable';
import SummaryThiDuaTable from './EmployeeHealth/components/SummaryThiDuaTable';
import CategoryDetailByStaffTable from './EmployeeHealth/components/CategoryDetailByStaffTable';
import { cn } from './RTST/utils';

const EmployeeHealth: React.FC = () => {
  const { userProfile } = useAuth();
  const { showNotification } = useNotification();
  const { marketFilter, setMarketFilter, setAvailableMarkets } = useMarket();
  const [maKho, setMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const capturePhucVuRef = useRef<HTMLDivElement>(null);
  const captureBanKemRef = useRef<HTMLDivElement>(null);

  const handleCaptureBanKem = async () => {
    if (!captureBanKemRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await htmlToImage.toPng(captureBanKemRef.current, { backgroundColor: '#ffffff' });
      saveAs(dataUrl, 'LK_BAN_KEM_NHAN_VIEN.png');
    } finally {
      setIsCapturing(false);
    }
  };

  // Sync maKho when userProfile changes
  useEffect(() => {
    if (userProfile?.ma_kho && userProfile.ma_kho !== maKho) {
      setMaKho(userProfile.ma_kho);
      localStorage.setItem('rtst_ma_kho', userProfile.ma_kho);
    }
  }, [userProfile?.ma_kho]);

  const { 
    biRevenueData, 
    luyKeNganhHang, 
    thiDuaNv, 
    phucVu,
    banKemNv,
    isLoading, 
    isSaving,
    refresh,
    savePhucVu,
    saveBanKemNv
  } = useEmployeeHealth(maKho);
  const { stTargetSauHeSo, daysPassed, totalDays } = useRTSTSharedData(maKho);
  const { categoryTargets, processedData } = useLuykeData(maKho);

  // Sync available markets to global context if on this page
  useEffect(() => {
    if (processedData.markets.length > 0) {
      const allowedPrefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR"];
      const filtered = processedData.markets.filter(m => 
        allowedPrefixes.some(prefix => m.name.toUpperCase().startsWith(prefix))
      );
      if (filtered.length > 0) {
        setAvailableMarkets(filtered);
      }
    }
  }, [processedData.markets, setAvailableMarkets]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'DOANH_THU' | 'CHI_TIET' | 'THI_DUA' | 'NGANH_HANG' | 'PHUC_VU' | 'BAN_KEM_NV' | 'THUONG_NV' | 'KHAI_THAC_NV'>('DOANH_THU');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [autoExpand, setAutoExpand] = useState(false);

  const parseBanKemData = (text: string) => {
    if (!text) return [];
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.split('\t'))
      .filter(parts => parts.length >= 10)
      .slice(1) // Assuming first row is header
      .map(parts => ({
        nhanVien: parts[0],
        dtlk: parts[1],
        luotBill: parts[4], 
        phanTramBill: parts[5], // Use 6th column (index 5)
        luotBillBanHang: parts[9], // 10th column (index 9)
      }));
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<string | null>(null);

  const [thuongThangTruoc, setThuongThangTruoc] = useState(() => localStorage.getItem('rtst_thuong_thang_truoc') || '');
  const [thuongThangHienTai, setThuongThangHienTai] = useState(() => localStorage.getItem('rtst_thuong_thang_hien_tai') || '');

  // Default to check all when data is loaded or maKho changes
  useEffect(() => {
    if (maKho && biRevenueData.length > 0 && initializedRef.current !== maKho) {
      setSelectedStaffIds(biRevenueData.map(s => s.fullId));
      initializedRef.current = maKho;
    }
  }, [maKho, biRevenueData]);

  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const filteredBiData = biRevenueData.filter(staff => {
    const matchesSearch = staff.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         staff.fullId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSelection = selectedStaffIds.includes(staff.fullId);
    return matchesSearch && matchesSelection;
  });

  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveThuongThangTruoc = (value: string) => {
    setThuongThangTruoc(value);
    localStorage.setItem('rtst_thuong_thang_truoc', value);
  };

  const handleSaveThuongThangHienTai = (value: string) => {
    setThuongThangHienTai(value);
    localStorage.setItem('rtst_thuong_thang_hien_tai', value);
  };

  const handleCapture = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await htmlToImage.toPng(captureRef.current, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `XepHangDoanhThuQD_${maKho}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error capturing element:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCopyFeedback = () => {
    if (filteredBiData.length === 0) return;

    const targetQdPerStaff = filteredBiData.length > 0 ? Math.round(stTargetSauHeSo / filteredBiData.length) : 0;

    const staffStats = filteredBiData.map(staff => {
      const effQd = (staff.actualVal || 0) > 0 
        ? ((staff.virtualVal - (staff.actualVal || 0)) / (staff.actualVal || 0)) * 100 
        : 0;
      const actualTargetQdPerStaff = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
      const actualVirtualVal = Math.abs(staff.virtualVal) > 10000 ? staff.virtualVal : staff.virtualVal * 1000000;
      const percentHT = (actualTargetQdPerStaff > 0 && daysPassed > 0) 
        ? (((actualVirtualVal / daysPassed) * totalDays) / actualTargetQdPerStaff) * 100 
        : 0;
      
      return {
        fullName: staff.displayName,
        effQd,
        percentHT
      };
    });

    const count = Math.max(1, Math.round(staffStats.length * 0.2));

    // Sort for %HT
    const sortedByHT = [...staffStats].sort((a, b) => b.percentHT - a.percentHT);
    const topHT = sortedByHT.slice(0, count);
    const botHT = sortedByHT.slice(-count).reverse();

    // Sort for HIỆU QUẢ QĐ
    const sortedByEff = [...staffStats].sort((a, b) => b.effQd - a.effQd);
    const topEff = sortedByEff.slice(0, count);
    const botEff = sortedByEff.slice(-count).reverse();

    const text = `📊 BÁO CÁO DOANH THU QUY ĐỔI SIÊU THỊ: ${maKho}

🌟 TOP 20% NHÂN VIÊN HOÀN THÀNH TỐT TIẾN ĐỘ (%HT):
${topHT.map((s) => {
  const parts = s.fullName.split(' - ');
  const id = parts[0].trim();
  const name = parts.length > 1 ? parts[1].trim() : '';
  const shortName = name.split(' ').pop() || '';
  return `${id} - ${shortName.toUpperCase()} (${Math.round(s.percentHT)}%)`;
}).join('\n')}

⚠️ NHÓM BOTTOM 20% CẦN CỐ GẮNG ĐẨY MẠNH TIẾN ĐỘ (%HT):
${botHT.map((s) => {
  const parts = s.fullName.split(' - ');
  const id = parts[0].trim();
  const name = parts.length > 1 ? parts[1].trim() : '';
  const shortName = name.split(' ').pop() || '';
  return `${id} - ${shortName.toUpperCase()} (${Math.round(s.percentHT)}%)`;
}).join('\n')}

🏆 TOP 20% NHÂN VIÊN CÓ HIỆU QUẢ QUY ĐỔI TỐT NHẤT:
${topEff.map((s) => {
  const parts = s.fullName.split(' - ');
  const id = parts[0].trim();
  const name = parts.length > 1 ? parts[1].trim() : '';
  const shortName = name.split(' ').pop() || '';
  return `${id} - ${shortName.toUpperCase()} (${Math.round(s.effQd)}%)`;
}).join('\n')}

⚠️ NHÓM BOTTOM 20% CẦN CẢI THIỆN HIỆU QUẢ QUY ĐỔI:
${botEff.map((s) => {
  const parts = s.fullName.split(' - ');
  const id = parts[0].trim();
  const name = parts.length > 1 ? parts[1].trim() : '';
  const shortName = name.split(' ').pop() || '';
  return `${id} - ${shortName.toUpperCase()} (${Math.round(s.effQd)}%)`;
}).join('\n')}

Các bạn nhóm dưới cố gắng bứt phá để hoàn thành mục tiêu nhé! 💪`;

    // navigator.clipboard.writeText(text).then(() => {
    //   setIsCopied(true);
    //   setTimeout(() => setIsCopied(false), 2000);
    // }).catch(err => {
    //   console.error('Failed to copy text: ', err);
    // });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) throw new Error('Nội dung file rỗng hoặc không thể đọc');
        
        let tsvOutput = '';
        let workBook: XLSX.WorkBook | null = null;
        
        // CHIẾN THUẬT ĐỌC FILE ĐA TẦNG:
        
        // Tầng 1: Đọc dưới dạng ArrayBuffer (Chuẩn cho .xlsx và .xls hiện đại)
        try {
          workBook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        } catch (e) {
          console.warn('Tầng 1 (ArrayBuffer) thất bại, chuyển sang Tầng 2...');
          
          // Tầng 2: Đọc dưới dạng Binary String (Chuẩn cho .xls cổ điển / BIFF8)
          try {
            // Chuyển buffer thành binary string (latin1 giữ nguyên byte dữ liệu)
            const binary = new TextDecoder('latin1').decode(buffer);
            workBook = XLSX.read(binary, { type: 'binary' });
          } catch (e2) {
            console.warn('Tầng 2 (Binary String) thất bại, chuyển sang Tầng 3...');
            
            // Tầng 3: Đọc dưới dạng String (Cho các file CSV/TSV/HTML giả danh .xls)
            try {
              const text = new TextDecoder('utf-8').decode(buffer);
              workBook = XLSX.read(text, { type: 'string' });
            } catch (e3) {
              console.error('Tất cả các tầng giải mã đều thất bại');
              throw new Error('Định dạng file không được hỗ trợ hoặc file bị hỏng');
            }
          }
        }

        if (workBook && workBook.SheetNames.length > 0) {
          const firstSheetName = workBook.SheetNames[0];
          const worksheet = workBook.Sheets[firstSheetName];
          
          // Trích xuất dữ liệu thành mảng
          const rows = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '' 
          }) as any[][];
          
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
        
        if (!tsvOutput || tsvOutput.trim() === '') {
          throw new Error('Không tìm thấy dữ liệu hợp lệ trong file');
        }

        await savePhucVu(tsvOutput);
        showNotification('Tải file và lưu dữ liệu Phục vụ thành công!', 'success');
      } catch (error: any) {
        console.error('Lỗi chi tiết khi xử lý file:', error);
        // Hiển thị thông báo lỗi cụ thể nhất có thể
        const finalErrorMsg = error?.message || (typeof error === 'string' ? error : 'Sai định dạng file');
        showNotification(`Lỗi: ${finalErrorMsg}. Vui lòng kiểm tra lại file.`, 'error');
      }
    };
    
    // Luôn đọc dưới dạng ArrayBuffer để có dữ liệu thô (raw) nhất cho các bước giải mã
    reader.readAsArrayBuffer(file);
    
    // Reset input để có thể chọn lại cùng 1 file nếu cần
    e.target.value = '';
  };

  const menuItems = [
    { id: 'DOANH_THU', label: 'DOANH THU NV', icon: TrendingUp },
    { id: 'CHI_TIET', label: 'CHI TIẾT NV', icon: Search },
    { id: 'THI_DUA', label: 'TH THI ĐUA', icon: Check },
    { id: 'NGANH_HANG', label: 'CT NGÀNH HÀNG', icon: HeartPulse },
    { id: 'PHUC_VU', label: 'PHỤC VỤ', icon: Users },
    { id: 'BAN_KEM_NV', label: 'BÁN KÈM NV', icon: MessageSquare },
    { id: 'THUONG_NV', label: 'THƯỞNG NV', icon: Gift },
    { id: 'KHAI_THAC_NV', label: 'KHAI THÁC NV', icon: Target },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Menu */}
      <aside 
        className={`bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-20 relative transition-all duration-300 ${
          (autoExpand ? isSidebarExpanded : true) ? 'w-96' : 'w-[120px]'
        }`}
        onMouseEnter={() => autoExpand && setIsSidebarExpanded(true)}
        onMouseLeave={() => autoExpand && setIsSidebarExpanded(false)}
      >
        {/* Sidebar Header */}
        <div className={`p-6 transition-all duration-300 ${(!isSidebarExpanded && autoExpand) ? 'opacity-0 invisible h-0 overflow-hidden' : 'opacity-100 visible'}`}>
          <h1 className="text-xl font-black text-slate-800 tracking-tight mb-8 uppercase">Sức khỏe nhân sự</h1>
          
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-[#00965e] flex items-center justify-center text-white shadow-lg shadow-emerald-100 shrink-0">
              <HeartPulse size={28} />
            </div>
            <div className="truncate">
              <h2 className="text-lg font-black text-slate-800 leading-none uppercase">Sức khỏe</h2>
              <p className="text-[10px] font-black text-[#00965e] uppercase tracking-widest mt-1">Nhân viên</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 space-y-2 overflow-hidden">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const showLabel = !autoExpand || isSidebarExpanded;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center px-5 py-4 rounded-full transition-all group ${
                  isActive 
                    ? 'bg-[#00965e] text-white shadow-xl shadow-emerald-200 translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50'
                } ${!showLabel ? 'justify-center px-0' : 'justify-between'}`}
              >
                <div className="flex items-center gap-4">
                  <Icon size={24} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                  {showLabel && (
                    <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-600'}`}>
                      {item.label}
                    </span>
                  )}
                </div>
                {showLabel && !isActive && <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400" />}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-slate-100 space-y-6">
          <div className={`flex items-center justify-between transition-all duration-300 ${(!isSidebarExpanded && autoExpand) ? 'flex-col gap-4' : ''}`}>
            {(!isSidebarExpanded && autoExpand) ? (
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <LayoutGrid size={20} />
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AUTO EXPAND</p>
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">HOVER MENU</p>
              </div>
            )}
            <button 
              onClick={() => setAutoExpand(!autoExpand)}
              className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${autoExpand ? 'bg-[#00965e]' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoExpand ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className={`flex items-center justify-between pt-2 transition-all duration-300 ${(!isSidebarExpanded && autoExpand) ? 'justify-center' : ''}`}>
            {(!isSidebarExpanded && autoExpand) ? (
              <span className="text-[8px] font-black text-slate-300">V2.5</span>
            ) : (
              <>
                <div className="flex items-center gap-2 text-slate-400">
                  <Info size={20} />
                </div>
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">V2.5 PRO</span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative bg-slate-50/50">
        <div className="p-4 md:p-6 lg:p-10 w-full min-h-full">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200">
                <HeartPulse size={32} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase rounded-full tracking-wider">Module Sức Khỏe</span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Realtime Active</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Sức khỏe nhân viên</h1>
                <p className="text-slate-500 font-medium">Quản lý trạng thái làm việc và sức khỏe đội ngũ nhân sự</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Multi-select Checkbox Filter moved to header */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all min-w-[200px] justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="truncate uppercase tracking-wider">
                      {selectedStaffIds.length === biRevenueData.length
                        ? "Tất cả nhân viên" 
                        : selectedStaffIds.length === 0
                          ? "Chưa chọn NV"
                          : `Đã chọn ${selectedStaffIds.length} NV`}
                    </span>
                  </div>
                  <ChevronDown size={14} className={cn("transition-transform text-slate-400", isFilterOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm nhanh..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                          />
                        </div>
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto p-2">
                        <div className="flex items-center justify-between px-3 mb-2">
                          <button
                            onClick={() => setSelectedStaffIds(biRevenueData.map(s => s.fullId))}
                            className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Chọn tất cả
                          </button>
                          <button
                            onClick={() => setSelectedStaffIds([])}
                            className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            Bỏ chọn tất cả
                          </button>
                        </div>
                        
                        {biRevenueData.filter(s => 
                          s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.fullId.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map(staff => (
                          <label
                            key={staff.fullId}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                              selectedStaffIds.includes(staff.fullId)
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-slate-200 group-hover:border-slate-300 bg-white"
                            )}>
                              {selectedStaffIds.includes(staff.fullId) && <Check size={12} className="text-white stroke-[3px]" />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={selectedStaffIds.includes(staff.fullId)}
                              onChange={() => toggleStaffSelection(staff.fullId)}
                            />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-800 uppercase leading-tight">{staff.displayName}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{staff.fullId}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã kho đang chọn</span>
                <div className="px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                  <span className="text-sm font-black text-slate-800">{maKho || 'CHƯA CHỌN'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-10">
            <AnimatePresence mode="wait">
              {activeTab === 'DOANH_THU' && (
                <motion.div
                  key="DOANH_THU"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-2 md:p-4 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-5xl mx-auto"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <TrendingUp size={20} />
                      </div>
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight border border-slate-200 px-4 py-2 rounded-xl">DOANH THU NV</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button 
                        onClick={handleCapture}
                        disabled={isCapturing}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                          isCapturing 
                            ? "bg-indigo-600/80 text-white cursor-wait" 
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 border border-transparent active:scale-95"
                        )}
                      >
                        {isCapturing ? (
                          <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                            <div className="absolute inset-0 border-2 border-white/20 rounded-full" />
                            <motion.div 
                              className="absolute inset-0 border-2 border-white rounded-full border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                        ) : (
                          <Camera size={14} />
                        )}
                        {isCapturing ? 'ĐANG XUẤT...' : 'XUẤT ẢNH BÁO CÁO'}
                      </button>
                    </div>
                  </div>

                  <div ref={captureRef}>
                    <RevenueRankingTableQd 
                      data={filteredBiData}
                      onCapture={handleCapture}
                      stTargetSauHeSo={stTargetSauHeSo}
                      daysPassed={daysPassed}
                      totalDays={totalDays}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'CHI_TIET' && (
                <motion.div
                  key="CHI_TIET"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-2 md:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-full mx-auto space-y-6"
                >
                  {/* Export All Button */}
                  {selectedStaffIds.length > 0 && (
                    <div className="flex justify-center my-6">
                      <button
                        disabled={isCapturing}
                        onClick={async () => {
                          setIsCapturing(true);
                          try {
                            const zip = new JSZip();
                            const tables = document.querySelectorAll('[id^="employee-detail-"]');
                            
                            for (let i = 0; i < tables.length; i++) {
                              const element = tables[i] as HTMLElement;
                              const dataUrl = await htmlToImage.toPng(element, { 
                                backgroundColor: '#ffffff', 
                                pixelRatio: 2,
                              });
                              const base64Data = dataUrl.split(',')[1];
                              zip.file(`ChiTiet_${element.id.replace('employee-detail-', '')}.png`, base64Data, { base64: true });
                            }
                            
                            const content = await zip.generateAsync({ type: "blob" });
                            saveAs(content, "ChiTiet_All_NV.zip");
                          } finally {
                            setIsCapturing(false);
                          }
                        }}
                        className={cn(
                          "text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                          isCapturing ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                        )}
                      >
                        {isCapturing ? "ĐANG XUẤT HÌNH ẢNH..." : "XUẤT ALL NV"}
                      </button>
                    </div>
                  )}

                  {/* Employee Detail Table Section */}
                  {selectedStaffIds.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {selectedStaffIds.map((id, idx) => {
                        const staff = biRevenueData.find(s => s.fullId === id);
                        if (!staff) return null;
                        return (
                          <motion.div
                            key={`detail-${id}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (idx * 0.05) }}
                          >
                            <EmployeeDetailTable 
                              staffName={`${staff.displayName.split(' - ').pop()} - ${staff.fullId}`}
                              luyKeNganhHang={luyKeNganhHang}
                              thiDuaNv={thiDuaNv}
                              staffCount={selectedStaffIds.length}
                              daysPassed={daysPassed}
                              totalDays={totalDays}
                              categoryTargets={categoryTargets}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
                      <Search size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">CHỌN NHÂN VIÊN ĐỂ XEM CHI TIẾT</h3>
                      <p className="text-slate-400 text-sm font-medium">Sử dụng bộ lọc phía trên để chọn nhân viên bạn muốn xem bảng "Chi tiết nhân viên"</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'THI_DUA' && (
                <motion.div
                  key="THI_DUA"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <SummaryThiDuaTable 
                    luyKeNganhHang={luyKeNganhHang}
                    thiDuaNv={thiDuaNv}
                    staffCount={selectedStaffIds.length}
                    daysPassed={daysPassed}
                    totalDays={totalDays}
                    selectedStaffIds={selectedStaffIds}
                    categoryTargets={categoryTargets}
                  />
                </motion.div>
              )}

              {activeTab === 'NGANH_HANG' && (
                <motion.div
                  key="NGANH_HANG"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-[calc(100%-1px)] mx-auto"
                >
                  <CategoryDetailByStaffTable 
                    luyKeNganhHang={luyKeNganhHang}
                    thiDuaNv={thiDuaNv}
                    staffCount={selectedStaffIds.length}
                    daysPassed={daysPassed}
                    totalDays={totalDays}
                    categoryTargets={categoryTargets}
                    selectedStaffIds={selectedStaffIds}
                  />
                </motion.div>
              )}

              {activeTab === 'PHUC_VU' && (
                <motion.div
                  key="PHUC_VU"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[400px] flex flex-col items-center justify-center text-center"
                >
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                    <Users size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">QUẢN LÝ PHỤC VỤ</h2>
                  <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">
                    Tải lên file Excel báo cáo phục vụ khách hàng để lưu trữ và phân tích.
                  </p>

                  <div className="w-full max-w-sm bg-slate-50 border-2 border-dashed border-slate-200 rounded-full py-3.5 px-6 transition-all hover:border-indigo-300 hover:bg-slate-100/50 group relative flex items-center justify-center gap-4">
                    <input 
                      type="file" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <UploadCloud size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                      {isSaving ? 'ĐANG LƯU DỮ LIỆU...' : 'CHỌN FILE DỮ LIỆU'}
                    </span>
                  </div>

                  {phucVu && (() => {
                    const lines = phucVu.split('\n').filter(l => l.trim() !== '');
                    const allHeaders = lines[0].split('\t');
                    const excludedColumns = [
                      'Tổng điểm KH đánh giá NV',
                      'Tổng SL ĐH gửi khảo sát (đã gửi hoặc KH đã quét QR)',
                      'Tổng ĐH KH đánh giá NV',
                      'Tỉ Lệ tiếp cận thành công',
                      'Điểm KH hài lòng của NV (tạm tính)',
                      'STT',
                      'MIỀN',
                      'CÔNG TY',
                      'MIEN',
                      'CONG TY'
                    ];

                    const visibleIndices = allHeaders
                      .map((h, i) => {
                        const headerText = h.trim().toUpperCase();
                        const isExcluded = excludedColumns.some(excluded => 
                          excluded.toUpperCase() === headerText
                        );
                        return isExcluded ? -1 : i;
                      })
                      .filter(i => i !== -1);

                    const rows = lines.slice(1);

                    // Sorting by '5 SAO' descending
                    const colIndex5Sao = allHeaders.findIndex(h => h.trim().toUpperCase().includes('5 SAO'));
                    let sortedRows = [...rows];
                    if (colIndex5Sao !== -1) {
                      sortedRows.sort((a, b) => {
                        const cellA = a.split('\t')[colIndex5Sao] || '0';
                        const cellB = b.split('\t')[colIndex5Sao] || '0';
                        const valA = parseFloat(cellA.replace(/[^0-9.-]+/g, "")) || 0;
                        const valB = parseFloat(cellB.replace(/[^0-9.-]+/g, "")) || 0;
                        return valB - valA;
                      });
                    }

                    const totalRows = sortedRows.length;
                    const topLimit = Math.ceil(totalRows * 0.2);
                    const botLimit = Math.ceil(totalRows * 0.2);
                    const today = new Date().toLocaleDateString('vi-VN');
                    
                    const startIndex5Sao = visibleIndices.findIndex(idx => 
                      allHeaders[idx].trim().toUpperCase().includes('5 SAO')
                    );
                    
                    const handleExportPhucVuImage = async () => {
                      if (!capturePhucVuRef.current) return;
                      setIsCapturing(true);
                      try {
                        const dataUrl = await htmlToImage.toPng(capturePhucVuRef.current, {
                          backgroundColor: '#ffffff',
                          style: { borderRadius: '32px' },
                          cacheBust: true,
                        });
                        saveAs(dataUrl, `BAO_CAO_PHUC_VU_${new Date().getTime()}.png`);
                        showNotification('Đã xuất ảnh báo cáo phục vụ!', 'success');
                      } catch (error) {
                        console.error('Lỗi khi chụp ảnh:', error);
                        showNotification('Không thể xuất ảnh báo cáo!', 'error');
                      } finally {
                        setIsCapturing(false);
                      }
                    };

                    return (
                      <div className="mt-10 w-full flex flex-col items-center">
                        <div className="w-full flex justify-end mb-4">
                          <button
                            onClick={handleExportPhucVuImage}
                            disabled={isCapturing}
                            className="flex items-center gap-2 px-6 py-3 bg-[#00965e] hover:bg-[#007b4e] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Camera size={18} />
                            {isCapturing ? 'ĐANG CHỤP...' : 'CHỤP ẢNH BÁO CÁO'}
                          </button>
                        </div>

                        <div ref={capturePhucVuRef} className="p-6 bg-white rounded-[40px] w-full shadow-sm">
                          {/* Custom Header from Image */}
                          <div className="w-full bg-white border border-slate-200 border-b-0 rounded-t-[32px] overflow-hidden flex divide-x divide-slate-100 shadow-sm">
                            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                              <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight mb-2">LUỸ KẾ PHỤC VỤ NHÂN VIÊN</h2>
                              <div className="flex items-center gap-2 py-1 px-4 border-t border-slate-100 mt-2">
                                <Camera size={14} className="text-indigo-600" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LUỸ KẾ ĐẾN NGÀY : {today}</span>
                              </div>
                              <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-slate-100"></div>
                            </div>
                            <div className="w-2/5 p-6 flex flex-col items-center justify-center">
                              <h2 className="text-xl font-black text-[#e11d48] uppercase tracking-tight mb-2">DỰ KIẾN</h2>
                              <div className="flex items-center gap-2 py-1 px-4 border-t border-slate-100 mt-2">
                                <TrendingUp size={14} className="text-orange-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TGSD: 19/30</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full bg-white border border-slate-200 rounded-b-[32px] overflow-visible shadow-xl shadow-slate-200/50">
                            <div className="w-full">
                              <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-20">
                                  <tr className="text-white font-utm-avo font-black text-[14px] uppercase tracking-wider h-[40px]">
                                    <th className="bg-[#00965e] px-2 py-0 text-center border-r border-white/10 h-[30px]">STT</th>
                                    {visibleIndices.map((idx, i) => {
                                      // Map color regions like the image
                                      let bgColor = 'bg-[#00965e]'; // First group (Emerald)
                                      if (i >= 2) bgColor = 'bg-[#ffcb05]'; // Middle group (Amber)
                                      
                                      const headerText = allHeaders[idx].trim().toUpperCase();
                                      let widthClasses = ''; // Flexible width

                                      return (
                                        <th key={idx} className={`${bgColor} ${widthClasses} px-2 py-0 text-center border-r border-white/10 whitespace-normal break-words leading-tight text-[12px] h-[30px]`}>
                                          {allHeaders[idx]}
                                        </th>
                                      );
                                    })}
                                    <th className="bg-[#f58220] px-2 py-0 text-center border-r border-white/10 last:border-r-0 whitespace-nowrap text-[12px] h-[30px]">
                                      TOP/BOT
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sortedRows.map((row, rowIdx) => {
                                    const cells = row.split('\t');
                                    const isStriped = rowIdx % 2 === 1;
                                    const isTopOne = rowIdx < topLimit;
                                    const isBottomOne = rowIdx >= totalRows - botLimit;
                                    
                                    return (
                                    <tr key={rowIdx} className={`${isStriped ? 'bg-[#f8faff]' : 'bg-white'} hover:bg-slate-50 transition-colors h-[30px]`}>
                                      <td className="px-2 py-0 text-center font-black text-slate-800 text-[13px] font-oswald border-r border-slate-100 h-[30px]">{rowIdx + 1}</td>
                                      {visibleIndices.map((idx, i) => {
                                        const value = cells[idx] || '';
                                        const headerText = allHeaders[idx].trim().toUpperCase();
                                        const isStaffName = headerText.includes('TÊN') || headerText.includes('TEN') || i === 0;
                                        const isUserNV = headerText.includes('USER') || headerText.includes('MÃ NV');
                                        const isPercentage = value.includes('%');
                                        
                                        // Numeric fonts per request
                                        const isNumericColumn = !isStaffName && !isUserNV;
                                        const fontClass = isNumericColumn ? 'font-oswald' : 'font-sans';

                                        // Specific formatting based on reference image
                                        let textColor = 'text-slate-700';
                                        if (isStaffName) textColor = isTopOne ? 'text-[#2563eb]' : (isBottomOne ? 'text-[#e11d48]' : 'text-slate-800');
                                        if (isPercentage) {
                                          const numVal = parseFloat(value);
                                          if (!isNaN(numVal)) {
                                            textColor = numVal >= 100 ? 'text-[#059669]' : 'text-[#e11d48]';
                                          }
                                        }

                                        return (
                                          <td key={idx} className={`px-2 py-0 text-center text-[13px] font-utm-avo font-bold ${textColor} border-r border-slate-100 whitespace-nowrap h-[40px]`}>
                                            <div className="flex items-center justify-center gap-1 h-full px-2">
                                              {isStaffName && <ChevronRight size={14} className="flex-shrink-0" />}
                                              {isPercentage ? (
                                                <span className={`px-1.5 py-0.5 rounded ${parseFloat(value) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                  {value}
                                                </span>
                                              ) : (
                                                <span>{value}</span>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                      <td className={`px-1 py-0 text-center text-[13px] font-bold font-oswald border-r border-slate-100 last:border-r-0 whitespace-nowrap h-[30px]`}>
                                        <div className="flex items-center justify-center gap-1 h-full">
                                          {isTopOne && (
                                            <div className="flex items-center gap-1 text-[#2563eb]">
                                              <Trophy size={14} className="flex-shrink-0" />
                                              <span className="text-[11px]">TOP</span>
                                            </div>
                                          )}
                                          {isBottomOne && (
                                            <div className="flex items-center gap-1 text-[#e11d48]">
                                              <TrendingDown size={14} className="flex-shrink-0" />
                                              <span className="text-[11px]">BOT</span>
                                            </div>
                                          )}
                                          {!isTopOne && !isBottomOne && <span className="opacity-20 text-slate-400">-</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              {/* Footer like the image */}
                              <tfoot className="bg-[#f8faff] border-t-2 border-slate-200">
                                <tr className="font-black text-slate-800 uppercase text-[12pt]">
                                  <td colSpan={2} className="px-6 py-4 text-center">TỔNG</td>
                                  {visibleIndices.slice(1).map((_, i) => (
                                    <td key={i} className="px-4 py-4 text-center">---</td>
                                  ))}
                                  <td className="px-4 py-4 text-center">---</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                        {sortedRows.length > 50 && (
                          <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                            * Hiển thị danh sách đầy đủ nhân viên
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
              )}

              {activeTab === 'BAN_KEM_NV' && (
                <motion.div
                  key="BAN_KEM_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-[1260px] mx-auto w-full"
                >
                  <div className="flex items-center justify-between mb-6 border-b-2 border-orange-400 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                            <LayoutGrid size={24} />
                        </div>
                        <h2 className="text-xl font-black text-slate-500 uppercase tracking-tight">1. Data Bán Kèm NV</h2>
                    </div>
                    <div className="p-2 bg-slate-50 text-orange-400 rounded-xl">
                        <TrendingUp size={24} />
                    </div>
                  </div>
                  
                  <textarea
                      value={banKemNv}
                      onChange={(e) => saveBanKemNv(e.target.value)}
                      className="w-full h-32 p-4 border border-slate-200 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none text-slate-800 font-mono"
                      placeholder="Dán dữ liệu (định dạng Excel tab) vào đây..."
                  />
                  {isSaving && <p className="text-xs text-orange-500 mt-2">Đang lưu tự động...</p>}
                  
                  {banKemNv && (
                    <div className="mt-8 w-full">
                      <div className="flex justify-end mb-4">
                        <button 
                          onClick={handleCaptureBanKem}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-sm font-bold uppercase transition-all shadow-sm"
                        >
                          <Camera size={16} /> CHỤP ẢNH BẢNG
                        </button>
                      </div>
                      
                      <div 
                        ref={captureBanKemRef} 
                        className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6"
                      >
                        <div className="mb-6 flex items-center gap-3">
                          <Trophy size={20} className="text-orange-500"/>
                          <h3 style={{ fontFamily: 'var(--font-utm-avo)', fontSize: '24px', fontWeight: 'bold' }} className="text-slate-800 uppercase tracking-widest">LK BÁN KÈM NHÂN VIÊN</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-sans text-slate-800 border-collapse border-2 border-slate-300">
                          <thead className="text-white uppercase border-b-2 border-slate-300">
                            <tr>
                              <th style={{ width: '240px', fontFamily: 'var(--font-utm-avo)', fontSize: '16px' }} className="px-6 py-[11px] border-r-2 border-slate-300 bg-emerald-600">NHÂN VIÊN</th>
                              <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300 bg-orange-300 text-slate-800">DTLK</th>
                              <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300 bg-orange-300 text-slate-800">LƯỢT BILL BÁN KÈM</th>
                              <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300 bg-orange-300 text-slate-800">%BILL BÁN KÈM</th>
                              <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300 bg-orange-300 text-slate-800">LƯỢT BILL BÁN HÀNG (TRỪ ONLINE, TRẢ GÓP)</th>
                              <th style={{ width: '70px', fontFamily: 'var(--font-utm-avo)', fontSize: '13px' }} className="px-6 py-[11px] text-center bg-orange-300 text-slate-800">HIỆU QUẢ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-2 divide-slate-200 font-bold" style={{ fontFamily: 'var(--font-utm-avo)', fontSize: '14px' }}>
                            {parseBanKemData(banKemNv)
                              .filter(row => selectedStaffIds.length === 0 || selectedStaffIds.some(id => row.nhanVien.includes(id)))
                              .sort((a, b) => parseFloat(b.phanTramBill) - parseFloat(a.phanTramBill))
                              .map((row: any, i:number, arr: any[]) => {
                                const threshold = Math.max(1, Math.ceil(arr.length * 0.2));
                                const isTop = i < threshold;
                                const isBottom = i >= arr.length - threshold && !isTop;
                                return (
                              <tr key={i} className="hover:bg-slate-50">
                                  <td style={{ width: '240px' }} className="px-6 py-[11px] text-slate-900 border-r-2 border-slate-300">{row.nhanVien}</td>
                                  <td style={{ width: '70px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300">{row.dtlk ? Math.round(parseFloat(row.dtlk.toString().replace(/,/g, '')) || 0).toLocaleString('vi-VN') : '0'}</td>
                                  <td style={{ width: '70px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300">{row.luotBill}</td>
                                  <td style={{ width: '70px' }} className={`px-6 py-[11px] text-center border-r-2 border-slate-300 ${isTop ? 'text-emerald-600 font-black' : isBottom ? 'text-rose-600 font-black' : ''}`}>{row.phanTramBill}</td>
                                  <td style={{ width: '70px' }} className="px-6 py-[11px] text-center border-r-2 border-slate-300">{row.luotBillBanHang}</td>
                                  <td style={{ width: '70px' }} className="px-6 py-[11px] text-center">
                                    {isTop && (
                                      <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[11px] font-black uppercase whitespace-nowrap">
                                        <TrendingUp size={12} strokeWidth={3} /> TỐT
                                      </span>
                                    )}
                                    {isBottom && (
                                      <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded text-[11px] font-black uppercase whitespace-nowrap">
                                        <TrendingDown size={12} strokeWidth={3} /> CHÚ Ý
                                      </span>
                                    )}
                                    {!isTop && !isBottom && (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                              </tr>
                                );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'THUONG_NV' && (
                <motion.div
                  key="THUONG_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-4xl mx-auto w-full"
                >
                  <div className="flex items-center justify-between mb-6 border-b-2 border-purple-400 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                            <Gift size={24} />
                        </div>
                        <h2 className="text-xl font-black text-slate-500 uppercase tracking-tight">Dữ liệu Thưởng NV</h2>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Dữ liệu Thưởng tháng trước</h3>
                      {filteredBiData.map((staff) => (
                        <div key={`truoc-${staff.fullId}`} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 space-y-2">
                          <div className="font-bold text-xs text-slate-600">{staff.displayName}</div>
                          <textarea
                            className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Dán dữ liệu tháng trước..."
                            onBlur={(e) => {
                              const value = e.target.value;
                              supabase.from('store_luyke').upsert({
                                staff_id: staff.fullId,
                                thuong_thang_truoc: value,
                                warehouse_code: maKho
                              }, { onConflict: 'staff_id, warehouse_code' }).then(({ error }) => {
                                if (error) console.error('Lỗi lưu thưởng tháng trước:', error);
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Dữ liệu Thưởng hiện tại</h3>
                      {filteredBiData.map((staff) => (
                        <div key={`hientai-${staff.fullId}`} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 space-y-2">
                          <div className="font-bold text-xs text-slate-600">{staff.displayName}</div>
                          <textarea
                            className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Dán dữ liệu tháng hiện tại..."
                            onBlur={(e) => {
                              const value = e.target.value;
                              supabase.from('store_luyke').upsert({
                                staff_id: staff.fullId,
                                thuong_hien_tai: value,
                                warehouse_code: maKho
                              }, { onConflict: 'staff_id, warehouse_code' }).then(({ error }) => {
                                if (error) console.error('Lỗi lưu thưởng hiện tại:', error);
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'KHAI_THAC_NV' && (
                <motion.div
                  key="KHAI_THAC_NV"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-4xl mx-auto w-full"
                >
                  <div className="flex items-center justify-between mb-6 border-b-2 border-blue-400 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                            <Target size={24} />
                        </div>
                        <h2 className="text-xl font-black text-slate-500 uppercase tracking-tight">Khai Thác NV</h2>
                    </div>
                    <div className="p-2 bg-slate-50 text-blue-400 rounded-xl">
                        <Target size={24} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Target size={64} className="mb-4 text-blue-200" />
                    <p className="text-lg font-bold">Tính năng Khai Thác Nhân Viên đang được phát triển</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeHealth;
