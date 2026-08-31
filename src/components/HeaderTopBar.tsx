import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, Store, ChevronDown, Clock, Calendar, User, Filter } from 'lucide-react';

interface HeaderTopBarProps {
  tenSieuThi?: string;
  maKho?: string;
  roleName?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onSelectStoreClick?: () => void;
  onProfileClick?: () => void;
  onFilterClick?: () => void;
  activeFilter?: string;
  showFilter?: boolean;
}

export default function HeaderTopBar({
  tenSieuThi = 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH',
  maKho = '43751',
  roleName = 'admin',
  isSidebarOpen = true,
  onToggleSidebar,
  onSelectStoreClick,
  onProfileClick,
  onFilterClick,
  activeFilter = 'NV bán hàng',
  showFilter = false,
}: HeaderTopBarProps) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200/90 px-6 py-3 shadow-xs sticky top-0 z-40 flex items-center justify-between gap-4 flex-wrap">
      
      {/* ─── CỤM TRÁI: LOGO BRAND + CRM SIÊU THỊ + CHỌN SIÊU THỊ ─── */}
      <div className="flex items-center gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <Star className="w-5 h-5 fill-white stroke-none" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-none uppercase">CRM SIÊU THỊ</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-slate-400 leading-none">Online</span>
            </div>
          </div>
        </div>

        {/* Nút thu gọn Sidebar */}
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            title="Thu gọn menu"
            className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block"></div>

        {/* Nút chọn Siêu Thị Active */}
        <button 
          onClick={onSelectStoreClick}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#00965e] hover:bg-[#008252] text-white font-extrabold text-xs tracking-tight shadow-xs transition-all group cursor-pointer"
        >
          <Store className="w-4 h-4 text-emerald-100 stroke-[2.2]" />
          <span className="truncate max-w-[260px] md:max-w-[320px]">{tenSieuThi}</span>
          <ChevronDown className="w-3.5 h-3.5 text-emerald-200 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* ─── CỤM PHẢI: BỘ LỌC + THỜI GIAN + TÀI KHOẢN (ĐỒNG BỘ PHONG CÁCH HÌNH 2) ─── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* 1. Nút Bộ Lọc NV (Nếu có) */}
        {showFilter && (
          <button 
            onClick={onFilterClick}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] text-[#9A3412] hover:bg-[#FFEDD5] transition-all shadow-2xs group cursor-pointer"
          >
            <User className="w-4 h-4 text-[#C2410C] stroke-[2.2]" />
            <span className="text-sm font-extrabold tracking-tight">{activeFilter}</span>
            <Filter className="w-4 h-4 text-[#C2410C] stroke-[2.2] group-hover:rotate-12 transition-transform" />
          </button>
        )}

        {/* 2. Viên Thuốc Thời Gian (Phong cách Vàng Kem Tone-on-Tone y hệt Hình 2) */}
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] text-[#9A3412] shadow-2xs">
          <Clock className="w-4 h-4 text-[#C2410C] stroke-[2.2]" />
          <span className="font-mono text-sm font-extrabold tracking-tight">{timeStr || '17:34:30'}</span>
          <span className="text-[#FDBA74]">-</span>
          <span className="text-sm font-extrabold tracking-tight">{dateStr || '31/08/2026'}</span>
          <Calendar className="w-4 h-4 text-[#C2410C] stroke-[2.2] ml-0.5" />
        </div>

        {/* 3. Viên Thuốc Tài Khoản 43751 - Admin (Phong cách Vàng Kem y hệt Hình 2) */}
        <button 
          onClick={onProfileClick}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] text-[#9A3412] hover:bg-[#FFEDD5] hover:border-[#FED7AA] transition-all shadow-2xs group cursor-pointer"
        >
          <User className="w-4 h-4 text-[#C2410C] stroke-[2.2]" />
          <span className="text-sm font-extrabold tracking-tight">{maKho || '43751'} - {roleName || 'admin'}</span>
          <ChevronDown className="w-4 h-4 text-[#C2410C] stroke-[2.2] group-hover:translate-y-0.5 transition-transform" />
        </button>

      </div>

    </header>
  );
}
