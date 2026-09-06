/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Medal, 
  Sparkles, 
  TrendingUp, 
  Users, 
  ArrowUpDown, 
  Search, 
  Copy, 
  Check, 
  Camera, 
  RotateCcw, 
  Flame, 
  DollarSign, 
  CreditCard, 
  Percent, 
  FileText, 
  Store,
  Clock,
  Target,
  ArrowUpRight,
  Filter,
  Layers,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MwgBiStaffReportData, MwgBiStaffRow } from '../types';
import { cn } from '../utils';

interface MwgStaffRevenueTableProps {
  data: MwgBiStaffReportData;
  onUpdateRawText: (text: string) => void;
  rawText: string;
  selectedMaKho?: string;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => void;
  onResetDefault?: () => void;
}

export const MwgStaffRevenueTable: React.FC<MwgStaffRevenueTableProps> = ({
  data,
  onUpdateRawText,
  rawText,
  selectedMaKho = '',
  captureElement,
  onResetDefault
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'has_revenue' | 'no_revenue' | 'high_installment'>('all');
  const [sortBy, setSortBy] = useState<'convertedRevenue' | 'actualRevenue' | 'installmentRate' | 'installmentRevenue' | 'quantity'>('convertedRevenue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [modalText, setModalText] = useState(rawText || '');
  const [isCopiedComment, setIsCopiedComment] = useState(false);

  const tableCaptureRef = useRef<HTMLDivElement>(null);

  const { summaryKpi, staffRows, totals } = data;

  // Filter and sort staff
  const processedStaff = useMemo(() => {
    let list = [...staffRows];

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(s => 
        s.staffName.toLowerCase().includes(q) || 
        s.staffId.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filterType === 'has_revenue') {
      list = list.filter(s => s.convertedRevenue > 0 || s.actualRevenue > 0);
    } else if (filterType === 'no_revenue') {
      list = list.filter(s => s.convertedRevenue === 0 && s.actualRevenue === 0);
    } else if (filterType === 'high_installment') {
      list = list.filter(s => s.installmentRate >= 50);
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortBy] as number;
      let valB = b[sortBy] as number;
      if (sortOrder === 'desc') {
        return valB - valA;
      }
      return valA - valB;
    });

    return list;
  }, [staffRows, searchTerm, filterType, sortBy, sortOrder]);

  // Generate Zalo / Telegram Comment
  const handleCopyComment = () => {
    const topRevenueStaff = [...staffRows]
      .filter(s => s.convertedRevenue > 0)
      .sort((a, b) => b.convertedRevenue - a.convertedRevenue)
      .slice(0, 3);

    const topInstallmentStaff = [...staffRows]
      .filter(s => s.installmentRevenue > 0)
      .sort((a, b) => b.installmentRate - a.installmentRate)
      .slice(0, 3);

    const storeTitle = summaryKpi.storeName || (selectedMaKho ? `Siêu thị ${selectedMaKho}` : 'Siêu Thị');
    const updateTimeStr = summaryKpi.updateTime ? ` lúc ${summaryKpi.updateTime}` : '';

    const lines = [
      `📊 BÁO CÁO REALTIME DOANH THU NHÂN VIÊN - ${storeTitle.toUpperCase()}`,
      `⏰ Cập nhật${updateTimeStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 DT Quy Đổi: ${summaryKpi.dtQd || (totals?.convertedRevenue ?? 0)} Tr | DT Thực: ${summaryKpi.dtThuc || (totals?.actualRevenue ?? 0)} Tr`,
      `🎯 % HT Target LK: ${summaryKpi.percentHtTarget || (totals?.targetRate ?? 0)}% (Target: ${summaryKpi.targetTronKy ? summaryKpi.targetTronKy.toLocaleString('vi-VN') : (totals?.target ? totals.target.toLocaleString('vi-VN') : 0)} Tr)`,
      `📈 DT Dự Kiến: ${summaryKpi.dtDuKien ? summaryKpi.dtDuKien.toLocaleString('vi-VN') : (totals?.expectedRevenue ? totals.expectedRevenue.toLocaleString('vi-VN') : 0)} Tr (Nhịp 31 ngày)`,
      `💳 DT Trả Góp: ${summaryKpi.dtTraGop || (totals?.installmentRevenue ?? 0)} Tr (Tỉ trọng ${summaryKpi.tiTrongTraGop || (totals?.installmentRate ?? 0)}%)`,
      `📦 Tổng SL bán: ${totals?.quantity ?? 0} SP / ${staffRows.length} Nhân sự`,
      ``,
      `🏆 TOP 3 DOANH THU QUY ĐỔI:`,
      ...topRevenueStaff.map((s, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
        return `${medal} ${s.staffName}: ${s.convertedRevenue} Tr QĐ (Thực: ${s.actualRevenue} Tr | ${s.quantity} SP | TG: ${s.installmentRevenue} Tr - ${s.installmentRate}%)`;
      }),
      ``,
      `⚡ CHIẾN THẦN TRẢ GÓP (% CAO NHẤT):`,
      ...topInstallmentStaff.map(s => `🔥 ${s.staffName}: ${s.installmentRate}% (${s.installmentRevenue} Tr TG / ${s.actualRevenue} Tr Thực)`),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💪 Cố gắng tăng tốc chốt đơn các ca còn lại trong ngày nhé cả nhà!`
    ];

    const commentText = lines.join('\n');
    navigator.clipboard.writeText(commentText).then(() => {
      setIsCopiedComment(true);
      setTimeout(() => setIsCopiedComment(false), 2500);
    });
  };

  const handleSavePasteModal = () => {
    if (modalText.trim()) {
      onUpdateRawText(modalText);
      setIsPasteModalOpen(false);
    }
  };

  const maxConvertedRevenue = useMemo(() => {
    return Math.max(...staffRows.map(s => s.convertedRevenue), 1);
  }, [staffRows]);

  return (
    <div className="space-y-6 w-full" ref={tableCaptureRef}>
      
      {/* ── TOP BANNER & ACTION HEADER ── */}
      <div className="relative overflow-hidden bg-white/95 backdrop-blur-md p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-indigo-100/90 shadow-[0_4px_25px_-4px_rgba(79,70,229,0.08)]">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-gradient-to-br from-amber-200/35 via-orange-100/25 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-gradient-to-tr from-emerald-100/35 via-teal-100/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-orange-500/25 shrink-0 border border-white/50">
              <TrendingUp size={28} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 text-[10.5px] font-black uppercase tracking-wider text-orange-700 shadow-2xs">
                  <Sparkles size={11} className="text-orange-500 animate-pulse" />
                  REALTIME BÁO CÁO HỢP NHẤT MWG
                </span>

                {(summaryKpi.storeName || selectedMaKho) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                    <Store size={12} className="text-slate-500" />
                    <b>{summaryKpi.storeName || `Kho ${selectedMaKho}`}</b>
                  </span>
                )}

                {summaryKpi.updateTime && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <Clock size={11} className="text-slate-400" />
                    {summaryKpi.updateTime}
                  </span>
                )}
                
                <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  <Users size={11} />
                  {staffRows.length} Nhân Sự
                </span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-850 tracking-tight uppercase">
                BẢNG REALTIME DOANH THU NHÂN VIÊN
              </h2>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto no-capture">
            <button
              onClick={() => {
                setModalText(rawText || '');
                setIsPasteModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
              title="Dán dữ liệu báo cáo mới từ MWG"
            >
              <FileText size={14} />
              <span>Dán Báo Cáo Mới</span>
            </button>

            <button
              onClick={handleCopyComment}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              title="Sao chép nội dung nhận xét xếp hạng gửi nhóm Zalo/Telegram"
            >
              {isCopiedComment ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{isCopiedComment ? 'Đã Sao Chép!' : 'Nhận Xét Zalo'}</span>
            </button>

            <button
              onClick={() => captureElement(tableCaptureRef, `Realtime_DoanhThu_NV_${selectedMaKho || 'Kho'}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs hover:border-slate-300 active:scale-95 transition-all cursor-pointer"
              title="Chụp ảnh toàn bộ bảng để gửi nhóm"
            >
              <Camera size={14} className="text-indigo-600" />
              <span>Xuất Ảnh</span>
            </button>

            {onResetDefault && selectedMaKho === '1841' && (
              <button
                onClick={onResetDefault}
                className="inline-flex items-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Khôi phục lại dữ liệu mẫu gốc siêu thị 1841"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Mẫu 1841</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 6 SUMMARY KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-slate-100">
          
          {/* Card 1: DT Quy Đổi */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 rounded-2xl p-3 border border-emerald-100/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">DT QUY ĐỔI</span>
              <DollarSign size={13} className="text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight mt-0.5">
              {summaryKpi.dtQd || totals?.convertedRevenue || 0}
              <span className="text-xs font-extrabold text-emerald-600 ml-1">Tr</span>
            </div>
            <span className="text-[10.5px] font-bold text-emerald-600 block mt-0.5 truncate">
              % HT: <b>{summaryKpi.percentHtTarget || totals?.targetRate || 0}%</b>
            </span>
          </div>

          {/* Card 2: % HT Target */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/60 rounded-2xl p-3 border border-indigo-100/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">% HT TARGET</span>
              <Target size={13} className="text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-800 tracking-tight mt-0.5">
              {summaryKpi.percentHtTarget || totals?.targetRate || 0}%
            </div>
            <span className="text-[10.5px] font-bold text-indigo-600 block mt-0.5 truncate" title={`Target: ${summaryKpi.targetTronKy || totals?.target || 0} Tr`}>
              Target: <b>{Math.round(summaryKpi.targetTronKy || totals?.target || 0).toLocaleString('vi-VN')} Tr</b>
            </span>
          </div>

          {/* Card 3: DT Thực Tế */}
          <div className="bg-gradient-to-br from-blue-50 to-sky-50/60 rounded-2xl p-3 border border-blue-100/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">DOANH THU THỰC</span>
              <TrendingUp size={13} className="text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-800 tracking-tight mt-0.5">
              {summaryKpi.dtThuc || totals?.actualRevenue || 0}
              <span className="text-xs font-extrabold text-blue-600 ml-1">Tr</span>
            </div>
            <span className="text-[10.5px] font-bold text-blue-600 block mt-0.5">
              SL: <b>{totals?.quantity ?? 0} SP</b>
            </span>
          </div>

          {/* Card 4: DT Dự Kiến */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-2xl p-3 border border-amber-100/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">DT DỰ KIẾN</span>
              <ArrowUpRight size={13} className="text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-800 tracking-tight mt-0.5">
              {Math.round(summaryKpi.dtDuKien || totals?.expectedRevenue || 0).toLocaleString('vi-VN')}
              <span className="text-xs font-extrabold text-amber-600 ml-1">Tr</span>
            </div>
            <span className="text-[10.5px] font-bold text-amber-600 block mt-0.5">
              Nhịp 31 ngày
            </span>
          </div>

          {/* Card 5: DT Trả Góp */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50/60 rounded-2xl p-3 border border-purple-100/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">DT TRẢ GÓP</span>
              <CreditCard size={13} className="text-purple-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-800 tracking-tight mt-0.5">
              {summaryKpi.dtTraGop || totals?.installmentRevenue || 0}
              <span className="text-xs font-extrabold text-purple-600 ml-1">Tr</span>
            </div>
            <span className="text-[10.5px] font-bold text-purple-600 block mt-0.5">
              Tỉ trọng: <b>{summaryKpi.tiTrongTraGop || totals?.installmentRate || 0}%</b>
            </span>
          </div>

          {/* Card 6: TT vs TB 3 Tháng */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-2xl p-3 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">TT VS TB 3T</span>
              <Percent size={13} className="text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-0.5">
              {summaryKpi.ttVsTb3t || totals?.growthRate || '—'}
            </div>
            <span className="text-[10.5px] font-bold text-slate-500 block mt-0.5 truncate" title={`TB3T: ${totals?.avg3Months || 213} Tr`}>
              TB3T: <b>{totals?.avg3Months || 213} Tr</b>
            </span>
          </div>

        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs no-capture">
        {/* Left: Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: `Tất Cả (${staffRows.length})` },
            { id: 'has_revenue', label: `Có Doanh Thu (${staffRows.filter(s => s.convertedRevenue > 0).length})` },
            { id: 'no_revenue', label: `Chưa Có DT (${staffRows.filter(s => s.convertedRevenue === 0).length})` },
            { id: 'high_installment', label: `Trả Góp ≥ 50% (${staffRows.filter(s => s.installmentRate >= 50).length})` }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                filterType === btn.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Right: Search + Sort */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên hoặc mã NV..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <ArrowUpDown size={13} className="text-slate-500 ml-1.5" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-hidden py-0.5 pr-2 cursor-pointer"
            >
              <option value="convertedRevenue">Doanh Thu QĐ</option>
              <option value="actualRevenue">Doanh Thu Thực</option>
              <option value="installmentRate">% Trả Góp</option>
              <option value="installmentRevenue">DT Trả Góp</option>
              <option value="quantity">Số Lượng SP</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-1.5 py-0.5 bg-white text-slate-700 font-black rounded-lg text-[10px] shadow-2xs hover:bg-slate-50 cursor-pointer"
              title={sortOrder === 'desc' ? 'Giảm dần' : 'Tăng dần'}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </div>

      {/* ── THE REALTIME STAFF REVENUE TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 select-none">
                <th className="px-3 sm:px-4 py-4 text-[10.5px] font-black uppercase tracking-wider text-center w-12 sm:w-14">
                  STT
                </th>
                <th className="px-4 sm:px-6 py-4 text-[10.5px] font-black uppercase tracking-wider min-w-[200px]">
                  NHÂN VIÊN
                </th>
                <th className="px-3 sm:px-4 py-4 text-[10.5px] font-black uppercase tracking-wider text-center">
                  SỐ LƯỢNG
                </th>
                <th className="px-3 sm:px-4 py-4 text-[10.5px] font-black uppercase tracking-wider text-right">
                  DOANH THU THỰC
                </th>
                <th className="px-4 sm:px-5 py-4 text-[10.5px] font-black uppercase tracking-wider text-right min-w-[150px]">
                  DOANH THU QĐ
                </th>
                <th className="px-3 sm:px-4 py-4 text-[10.5px] font-black uppercase tracking-wider text-center">
                  % TỈ TRỌNG
                </th>
                <th className="px-3 sm:px-4 py-4 text-[10.5px] font-black uppercase tracking-wider text-right">
                  DT DỰ KIẾN
                </th>
                <th className="px-3 sm:px-4 py-4 text-[10.5px] font-black uppercase tracking-wider text-right">
                  DT TRẢ GÓP
                </th>
                <th className="px-3 sm:px-4 py-4 text-[10.5px] font-black uppercase tracking-wider text-center min-w-[110px]">
                  % TRẢ GÓP
                </th>
                <th className="px-3 sm:px-4 py-4 text-[10.5px] font-black uppercase tracking-wider text-center">
                  DANH HIỆU
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
              {processedStaff.map((staff, idx) => {
                // Determine original rank based on converted revenue
                const rank = staffRows
                  .filter(s => s.convertedRevenue > staff.convertedRevenue).length + 1;
                const hasRevenue = staff.convertedRevenue > 0 || staff.actualRevenue > 0;
                const sharePercent = staff.shareRate;
                const convBarWidth = Math.min(100, Math.max(4, (staff.convertedRevenue / maxConvertedRevenue) * 100));

                const isTop1 = rank === 1 && hasRevenue;
                const isTop2 = rank === 2 && hasRevenue;
                const isTop3 = rank === 3 && hasRevenue;
                const isUserStore = staff.staffId === '43751';

                return (
                  <tr 
                    key={`${staff.staffId}-${idx}`} 
                    className={cn(
                      "transition-colors",
                      isUserStore 
                        ? "bg-amber-50/70 hover:bg-amber-100/60 font-bold" 
                        : isTop1 
                          ? "bg-amber-50/35 hover:bg-amber-50/70" 
                          : isTop2 
                            ? "bg-slate-50/60 hover:bg-slate-100/60" 
                            : isTop3 
                              ? "bg-orange-50/30 hover:bg-orange-50/60" 
                              : !hasRevenue 
                                ? "bg-slate-50/30 text-slate-400 hover:bg-slate-50" 
                                : "hover:bg-slate-50"
                    )}
                  >
                    {/* STT / Rank */}
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      {isTop1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-900 font-black text-xs shadow-xs border border-amber-300">
                          🥇
                        </span>
                      ) : isTop2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-700 font-black text-xs shadow-2xs border border-slate-300">
                          🥈
                        </span>
                      ) : isTop3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-400 text-white font-black text-xs shadow-2xs">
                          🥉
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-500 font-extrabold text-[11px]">
                          {rank}
                        </span>
                      )}
                    </td>

                    {/* Nhân Viên */}
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center text-[10.5px] font-black shrink-0 border",
                          isTop1 ? "bg-amber-500 text-white border-amber-400 shadow-xs" :
                          isTop2 ? "bg-slate-600 text-white border-slate-400" :
                          isTop3 ? "bg-orange-600 text-white border-orange-400" :
                          hasRevenue ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                          "bg-slate-100 text-slate-400 border-slate-200"
                        )}>
                          {staff.fullName.split(' ').slice(-1)[0]?.charAt(0) || 'N'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                              "text-xs sm:text-sm font-black uppercase tracking-tight truncate",
                              isTop1 ? "text-amber-800 font-black" :
                              isTop2 ? "text-slate-900 font-black" :
                              isTop3 ? "text-orange-800 font-black" :
                              hasRevenue ? "text-slate-900" : "text-slate-500"
                            )}>
                              {staff.fullName}
                            </span>
                            {isUserStore && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 text-[9.5px] font-black">
                                BẠN
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] font-mono font-bold text-slate-400">
                            {staff.staffId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Số Lượng */}
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black",
                        staff.quantity > 0 
                          ? "bg-slate-100 text-slate-800 border border-slate-200/80" 
                          : "text-slate-300"
                      )}>
                        {staff.quantity}
                      </span>
                    </td>

                    {/* Doanh Thu Thực */}
                    <td className="px-3 sm:px-4 py-3.5 text-right font-bold">
                      {staff.actualRevenue > 0 ? (
                        <span className="text-slate-700 text-xs sm:text-sm">
                          {staff.actualRevenue.toLocaleString('vi-VN')} <span className="text-[10px] text-slate-400 font-semibold">Tr</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Doanh Thu QĐ */}
                    <td className="px-4 sm:px-5 py-3.5 text-right">
                      {staff.convertedRevenue > 0 ? (
                        <div>
                          <span className={cn(
                            "text-xs sm:text-sm font-black",
                            isTop1 ? "text-emerald-700 text-sm font-black" : "text-emerald-600"
                          )}>
                            {staff.convertedRevenue.toLocaleString('vi-VN')} <span className="text-[10px] text-emerald-500 font-bold">Tr</span>
                          </span>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                              style={{ width: `${convBarWidth}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-bold">0</span>
                      )}
                    </td>

                    {/* % Tỉ Trọng */}
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      {sharePercent > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10.5px] font-black border border-indigo-100">
                          {sharePercent}%
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">0.0%</span>
                      )}
                    </td>

                    {/* DT Dự Kiến */}
                    <td className="px-3 sm:px-4 py-3.5 text-right font-bold">
                      {staff.expectedRevenue > 0 ? (
                        <span className="text-amber-700 font-black text-xs sm:text-sm">
                          {staff.expectedRevenue.toLocaleString('vi-VN')} <span className="text-[10px] text-amber-500 font-bold">Tr</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* DT Trả Góp */}
                    <td className="px-3 sm:px-4 py-3.5 text-right font-bold">
                      {staff.installmentRevenue > 0 ? (
                        <span className="text-purple-700 font-black text-xs sm:text-sm">
                          {staff.installmentRevenue.toLocaleString('vi-VN')} <span className="text-[10px] text-purple-500 font-bold">Tr</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* % Trả Góp */}
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      {staff.installmentRate > 0 ? (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black border",
                          staff.installmentRate >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          staff.installmentRate >= 50 ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          <Flame size={10} className={staff.installmentRate >= 80 ? "text-emerald-500" : "text-amber-500"} />
                          {staff.installmentRate}%
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Danh Hiệu */}
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      {isTop1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                          👑 TOP 1
                        </span>
                      ) : isTop2 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-black">
                          ⭐ TOP 2
                        </span>
                      ) : isTop3 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-black">
                          ⭐ TOP 3
                        </span>
                      ) : staff.installmentRate >= 80 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[9.5px] font-black">
                          ⚡ VUA TG
                        </span>
                      ) : hasRevenue ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9.5px] font-bold">
                          ĐÃ BÁN
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10.5px]">—</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>

            {/* ── TOTALS FOOTER ROW ── */}
            {totals && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-black text-xs sm:text-sm border-t-2 border-indigo-400">
                  <td className="px-3 sm:px-4 py-4 text-center">
                    <span className="text-amber-400 text-xs">Σ</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 uppercase tracking-wider text-amber-300">
                    {totals.title || `TỔNG CỘNG (${staffRows.length} DÒNG)`}
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-black">
                      {totals.quantity} SP
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-right text-blue-300">
                    {totals.actualRevenue.toLocaleString('vi-VN')} <span className="text-[10px] text-blue-200 font-bold">Tr</span>
                  </td>
                  <td className="px-4 sm:px-5 py-4 text-right text-emerald-300">
                    {totals.convertedRevenue.toLocaleString('vi-VN')} <span className="text-[10px] text-emerald-200 font-bold">Tr</span>
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-center text-indigo-300">
                    {totals.shareRate}%
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-right text-amber-300">
                    {totals.expectedRevenue.toLocaleString('vi-VN')} <span className="text-[10px] text-amber-200 font-bold">Tr</span>
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-right text-purple-300">
                    {totals.installmentRevenue.toLocaleString('vi-VN')} <span className="text-[10px] text-purple-200 font-bold">Tr</span>
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-center text-rose-300">
                    {totals.installmentRate}%
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-center text-[11px] text-slate-300 font-bold">
                    {totals.growthRate || '—'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footnote */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium gap-2">
          <span>
            Đơn vị tính: <b>Triệu đồng</b>. Tỉ trọng tính trong nhóm cùng cấp cha siêu thị.
          </span>
          <span className="font-bold text-slate-400">
            Hiển thị {processedStaff.length} / {staffRows.length} nhân viên
          </span>
        </div>
      </div>

      {/* ── MODAL DÁN BÁO CÁO ── */}
      <AnimatePresence>
        {isPasteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">
                      Dán Dữ Liệu Báo Cáo Nhân Viên MWG
                    </h3>
                    <p className="text-xs text-slate-500">
                      Copy trực tiếp toàn bộ trang báo cáo hoặc bảng nhân viên rồi dán vào đây
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasteModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase block">
                  Nội dung báo cáo (Copy từ baocao.dienmayxanh.com)
                </label>
                <textarea
                  value={modalText}
                  onChange={e => setModalText(e.target.value)}
                  placeholder="Dán toàn bộ nội dung báo cáo tại đây..."
                  rows={12}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:bg-white resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setModalText(text);
                    } catch (e) {
                      // fallback
                    }
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer"
                >
                  Dán từ Clipboard
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPasteModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePasteModal}
                    className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    Lưu & Cập Nhật Bảng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MwgStaffRevenueTable;
