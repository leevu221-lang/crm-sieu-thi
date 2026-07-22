/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, ChevronDown, ChevronUp, Square, CheckSquare, Check, Calendar, Clock, Trophy, TrendingDown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { YcxStaffData } from '../types';
import { formatRealtimeDate, getWorkingDayProgress, cn, formatStaffName } from '../utils';

interface StaffRevenueTableProps {
  ycxStaffData: YcxStaffData[];
  excludedYcxStaffNames: string[];
  setExcludedYcxStaffNames: React.Dispatch<React.SetStateAction<string[]>>;
  expandedStaffRows: Set<string>;
  toggleStaffRow: (name: string) => void;
  toggleAllStaffRows: () => void;
  isYcxDropdownOpen: boolean;
  setIsYcxDropdownOpen: (val: boolean) => void;
  catMarketFilter: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, name: string) => void;
}

const StaffRevenueTable: React.FC<StaffRevenueTableProps> = ({
  ycxStaffData,
  excludedYcxStaffNames,
  setExcludedYcxStaffNames,
  expandedStaffRows,
  toggleStaffRow,
  toggleAllStaffRows,
  isYcxDropdownOpen,
  setIsYcxDropdownOpen,
  catMarketFilter,
  captureRef,
  captureElement
}) => {
  const visibleStaff = ycxStaffData
    .filter(s => {
      const matchesMarket = catMarketFilter === 'ALL' || (s.marketName && s.marketName.toUpperCase().includes(catMarketFilter.toUpperCase()));
      const isExcluded = excludedYcxStaffNames.includes(s.staffName);
      return matchesMarket && !isExcluded;
    })
    .sort((a, b) => b.convertedRevenue - a.convertedRevenue);
    
  const allVisibleExpanded = visibleStaff.length > 0 && visibleStaff.every(s => expandedStaffRows.has(s.staffName));

  const handleGenerateComment = () => {
    if (visibleStaff.length === 0) return;

    const total = visibleStaff.length;
    const topCount = Math.ceil(total * 0.2);
    const botCount = Math.ceil(total * 0.2); // Last 20%

    const topStaff = visibleStaff.slice(0, topCount);
    const botStaff = visibleStaff.slice(-botCount).reverse();

    let comment = `📊 BÁO CÁO DOANH THU NV - ${formatRealtimeDate()}\n\n`;
    
    comment += `🏆 TOP XUẤT SẮC:\n`;
    topStaff.forEach((s, i) => {
      comment += `${i + 1}. ${formatStaffName(s.staffName)}: ${Math.round(s.convertedRevenue).toLocaleString('vi-VN')} Tr\n`;
    });

    comment += `\n📉 CẦN CỐ GẮNG:\n`;
    botStaff.forEach((s, i) => {
      comment += `${i + 1}. ${formatStaffName(s.staffName)}: ${Math.round(s.convertedRevenue).toLocaleString('vi-VN')} Tr\n`;
    });

    comment += `\n🔥 Cả nhà cùng nỗ lực hoàn thành mục tiêu ngày nhé! 💪💪`;

    navigator.clipboard.writeText(comment).then(() => {
      alert('Đã sao chép nhận xét vào bộ nhớ tạm!');
    }).catch(err => {
      console.error('Lỗi khi sao chép:', err);
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className="p-5 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tight">📊 DOANH THU NV ({visibleStaff.length}/{ycxStaffData.length})</h3>
              <div className="flex items-center gap-2 ml-2 no-capture">
                <button 
                  onClick={() => captureElement(captureRef, 'BangXepHang_DoanhThu')}
                  className="flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase border border-emerald-200 hover:bg-emerald-100 transition-all"
                >
                  <Camera size={14} /> <span className="hidden sm:inline">CHỤP ẢNH</span>
                </button>
                <button 
                  onClick={handleGenerateComment}
                  className="flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase border border-indigo-200 hover:bg-indigo-100 transition-all"
                >
                  <MessageSquare size={14} /> <span className="hidden sm:inline">NHẬN XÉT</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">(DỮ LIỆU TỪ Ô 3. THÊM YCX RT - TÍNH THEO USER TẠO)</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={toggleAllStaffRows}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] sm:text-xs font-bold hover:bg-emerald-700 transition-all whitespace-nowrap shadow-sm"
          >
            {allVisibleExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{allVisibleExpanded ? 'THU GỌN ALL' : 'XỔ ALL CHI TIẾT SP'}</span>
          </button>
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setIsYcxDropdownOpen(!isYcxDropdownOpen)}
              className="w-full flex items-center justify-between sm:justify-start gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-slate-50 transition-all whitespace-nowrap"
            >
              <span>LỌC NV</span>
              <ChevronDown size={14} className={cn("transition-transform", isYcxDropdownOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isYcxDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[70]" 
                    onClick={() => setIsYcxDropdownOpen(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 min-w-[240px] max-w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[80] overflow-hidden"
                  >
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chọn nhân viên</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setExcludedYcxStaffNames([])}
                          className="text-[9px] font-bold text-indigo-600 hover:underline"
                        >
                          Hiện hết
                        </button>
                        <button 
                          onClick={() => setExcludedYcxStaffNames(ycxStaffData.map(s => s.staffName))}
                          className="text-[9px] font-bold text-red-600 hover:underline"
                        >
                          Ẩn hết
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      {ycxStaffData.map((staff, sIdx) => {
                        const isExcluded = excludedYcxStaffNames.includes(staff.staffName);
                        return (
                          <button
                            key={`${staff.staffName}-${sIdx}`}
                            onClick={() => {
                              setExcludedYcxStaffNames(prev => 
                                isExcluded 
                                  ? prev.filter(name => name !== staff.staffName)
                                  : [...prev, staff.staffName]
                              );
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                              isExcluded ? "opacity-50 hover:bg-slate-50" : "hover:bg-emerald-50"
                            )}
                          >
                            {isExcluded ? (
                              <Square size={16} className="text-slate-300" />
                            ) : (
                              <CheckSquare size={16} className="text-emerald-600" />
                            )}
                            <div className="flex-1 overflow-hidden">
                              <p className={cn("text-xs font-bold truncate", !isExcluded ? "text-slate-800" : "text-slate-400")}>
                                {formatStaffName(staff.staffName)}
                              </p>
                            </div>
                            {!isExcluded && <Check size={12} className="text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div ref={captureRef} className="p-2 sm:p-4 bg-white">
        <div className="w-full overflow-auto max-h-[80vh] border border-slate-300 bg-white relative">
          <table className="w-full text-left border-collapse border border-slate-300 table-auto">
            <thead className="sticky top-0 z-40 shadow-sm">
              <tr className="border-b border-slate-300 bg-white">
                <th colSpan={2} className="sticky left-0 z-50 bg-white px-0.5 py-3 sm:px-2 sm:py-4 text-[clamp(12px,3vw,24px)] font-black uppercase tracking-tight border-r border-slate-300 text-black text-center whitespace-nowrap">
                  BẢNG XẾP HẠNG DOANH THU
                </th>
                <th colSpan={4} className="px-0.5 py-3 sm:px-2 sm:py-4 text-[clamp(12px,3vw,24px)] font-black text-[#e11d48] uppercase tracking-tight text-center whitespace-nowrap bg-white">
                  HIỆU QUẢ
                </th>
              </tr>
              <tr className="border-b border-slate-300 bg-white">
                <th colSpan={2} className="sticky left-0 z-50 bg-white px-0.5 py-2 sm:px-2 sm:py-2 text-[clamp(8px,1.8vw,13px)] font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <Camera size={14} className="text-blue-600" />
                    <span className="uppercase tracking-widest">REALTIME : {formatRealtimeDate()}</span>
                  </div>
                </th>
                <th colSpan={4} className="px-0.5 py-2 sm:px-2 sm:py-2 text-[clamp(8px,1.8vw,13px)] font-bold text-slate-900 whitespace-nowrap bg-white">
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={14} className="text-orange-600" />
                    <span className="uppercase tracking-widest">TGSD: {getWorkingDayProgress().toFixed(0)}%</span>
                  </div>
                </th>
              </tr>
              <tr className="border-b border-slate-300">
                <th rowSpan={2} className="sticky left-0 z-50 px-0.5 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-white uppercase tracking-wider text-center border-r border-slate-300 bg-[#10b981] whitespace-nowrap">
                  STT
                </th>
                <th rowSpan={2} className="sticky left-[40px] sm:left-[60px] z-50 px-1 sm:px-3 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-white uppercase tracking-wider text-left border-r border-slate-300 bg-[#10b981] whitespace-nowrap">
                  NGƯỜI TẠO
                </th>
                <th colSpan={2} className="px-0.5 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-black uppercase tracking-wider text-center border-r border-slate-300 bg-[#facc15] whitespace-nowrap">
                  DOANH THU QUY ĐỔI
                </th>
                <th rowSpan={2} className="px-0.5 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-white uppercase tracking-wider text-center border-r border-slate-300 bg-[#84cc16] whitespace-nowrap">
                  HIỆU QUẢ QĐ
                </th>
                <th rowSpan={2} className="px-0.5 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-white uppercase tracking-wider text-center border-r border-slate-300 bg-[#f97316] whitespace-nowrap">
                  TOP/BOT
                </th>
              </tr>
              <tr className="border-b border-slate-300">
                <th className="px-0.5 py-2 text-[clamp(7px,1.2vw,13px)] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fde047] whitespace-nowrap">
                  DT THỰC
                </th>
                <th className="px-0.5 py-2 text-[clamp(7px,1.2vw,13px)] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fde047] whitespace-nowrap">
                  DT QĐ
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleStaff.length > 0 ? visibleStaff.map((staff, idx, arr) => {
                const rank = idx + 1;
                const total = arr.length;
                const isTop = rank <= Math.ceil(total * 0.2);
                const isBot = rank > Math.floor(total * 0.8);
                const isExpanded = expandedStaffRows.has(staff.staffName);
                
                return (
                  <React.Fragment key={idx}>
                    <tr 
                      className={cn(
                        "border-b border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition-colors",
                        isExpanded && "bg-emerald-50/30"
                      )}
                      onClick={() => toggleStaffRow(staff.staffName)}
                      style={{ height: '45px' }}
                    >
                      <td className="sticky left-0 z-10 px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] font-black text-black text-center border-r border-slate-300 bg-[#fef08a] whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className={cn(
                        "sticky left-[40px] sm:left-[60px] z-10 px-2 sm:px-4 py-2 text-[clamp(8px,1.5vw,13px)] font-black border-r border-slate-300 text-[#2563eb] whitespace-nowrap",
                        isExpanded ? "bg-[#f0fdf4]" : "bg-white"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="text-[#2563eb]">›</span>
                          <ChevronDown 
                            size={12} 
                            className={cn("transition-transform shrink-0", isExpanded ? "rotate-0" : "-rotate-90")} 
                          />
                          <span className="uppercase leading-tight whitespace-nowrap">{formatStaffName(staff.staffName)}</span>
                        </div>
                      </td>
                      <td className="px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] text-center border-r border-slate-300 font-black text-slate-700 whitespace-nowrap">
                        {Math.round(staff.totalRevenue).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] text-center border-r border-slate-300 font-black text-[#059669] whitespace-nowrap">
                        {Math.round(staff.convertedRevenue).toLocaleString('vi-VN')}
                      </td>
                      <td className={cn(
                        "px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] text-center border-r border-slate-300 font-black whitespace-nowrap",
                        (() => {
                          const eff = staff.totalRevenue > 0 
                            ? ((staff.convertedRevenue - staff.totalRevenue) / staff.totalRevenue) * 100 
                            : 0;
                          return eff < 50 ? "bg-red-50" : "";
                        })()
                      )}>
                        {(() => {
                          const eff = staff.totalRevenue > 0 
                            ? ((staff.convertedRevenue - staff.totalRevenue) / staff.totalRevenue) * 100 
                            : 0;
                          return (
                            <span className={cn(eff >= 50 ? "text-[#059669]" : "text-rose-600 font-black")}>
                              {eff >= 0 ? '+' : ''}{eff.toFixed(1)}%
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] text-center font-black whitespace-nowrap border-r border-slate-300">
                        {isTop ? (
                          <div className="flex items-center justify-center gap-1 text-[#2563eb]">
                            <Trophy size={14} className="shrink-0" />
                            <span className="font-black">TOP</span>
                          </div>
                        ) : isBot ? (
                          <div className="flex items-center justify-center gap-1 text-rose-600">
                            <TrendingDown size={14} className="shrink-0" />
                            <span className="font-black">BOT</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-slate-300">
                        <td colSpan={6} className="px-0.5 py-1 sm:px-1 sm:py-2 bg-slate-50/80">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between border-b border-slate-300 pb-0.5 mb-1">
                              <span className="text-[clamp(5px,1.2vw,9px)] font-black text-slate-400 uppercase tracking-wider">Chi tiết sản phẩm</span>
                              <span className="text-[clamp(5px,1.2vw,9px)] font-black text-slate-400 uppercase tracking-wider">{staff.items.length} SP</span>
                            </div>
                            <div className="w-full border border-slate-300 overflow-hidden">
                              <table className="w-full text-left border-collapse table-auto">
                                <thead>
                                  <tr className="bg-slate-200">
                                    <th className="px-1 py-0.5 text-center border-r border-slate-300 font-bold text-slate-600 text-[clamp(5px,1.2vw,8px)] whitespace-nowrap w-6 sm:w-8">STT</th>
                                    <th className="px-1 py-0.5 border-r border-slate-300 font-bold text-slate-600 text-[clamp(5px,1.2vw,8px)] whitespace-nowrap">TÊN SẢN PHẨM</th>
                                    <th className="px-1 py-0.5 text-center border-r border-slate-300 font-bold text-slate-600 text-[clamp(5px,1.2vw,8px)] whitespace-nowrap">SỐ LƯỢNG</th>
                                    <th className="px-1 py-0.5 text-center border-r border-slate-300 font-bold text-slate-600 text-[clamp(5px,1.2vw,8px)] whitespace-nowrap">DOANH THU THỰC</th>
                                    <th className="px-1 py-0.5 text-center font-bold text-slate-600 text-[clamp(5px,1.2vw,8px)] whitespace-nowrap">GIÁ BÁN 1</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {staff.items.map((item, iIdx) => (
                                    <tr key={iIdx} className="border-b border-slate-300 last:border-b-0 bg-white">
                                      <td className="px-0.5 py-0.5 text-center border-r border-slate-300 bg-[#ffff00] font-bold text-black text-[clamp(5px,1.2vw,8px)] whitespace-nowrap">
                                        {iIdx + 1}
                                      </td>
                                      <td className="px-1 py-0.5 border-r border-slate-300 bg-white">
                                        <p className="text-[clamp(6px,1.5vw,9px)] font-bold text-slate-800 leading-tight">{item.productName}</p>
                                      </td>
                                      <td className="px-1 py-0.5 text-center border-r border-slate-300 bg-white">
                                        <p className="text-[clamp(6px,1.5vw,9px)] font-bold text-slate-600 leading-tight">{item.quantity}</p>
                                      </td>
                                      <td className="px-1 py-0.5 text-center border-r border-slate-300 bg-white">
                                        <p className="text-[clamp(6px,1.5vw,9px)] font-bold text-slate-600 leading-tight">{Math.round(item.revenue).toLocaleString('vi-VN')}</p>
                                      </td>
                                      <td className="px-1 py-0.5 text-center bg-white">
                                        <p className="text-[clamp(6px,1.5vw,9px)] font-bold text-emerald-600 leading-tight">{Math.round(item.revenue / (item.quantity || 1)).toLocaleString('vi-VN')}</p>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] bg-white">
                    Chưa có dữ liệu nhân viên
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffRevenueTable;
