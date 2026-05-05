/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, Check, Calendar, Clock, MessageSquare } from 'lucide-react';
import { CategoryData } from '../types';
import { formatRealtimeDate, formatLuyKeDate, getWorkingDayProgress, getLuyKeProgress, cn } from '../utils';
import { useNotification } from '../../../contexts/NotificationContext';

interface CategoryTableProps {
  categories: CategoryData[];
  catMarketFilter: string;
  setCatMarketFilter: (val: string) => void;
  catGroupFilter: string;
  setCatGroupFilter: (val: string) => void;
  captureRef: React.RefObject<HTMLDivElement | null>;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, name: string) => void;
  title?: string;
  mode?: 'realtime' | 'luyke';
  daysPassed?: number;
  totalDays?: number;
}

const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  catMarketFilter,
  setCatMarketFilter,
  catGroupFilter,
  setCatGroupFilter,
  captureRef,
  captureElement,
  title = 'REALTIME NGÀNH HÀNG',
  mode = 'realtime',
  daysPassed = 0,
  totalDays = 0
}) => {
  const { showNotification } = useNotification();
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const generateAndCopyComment = () => {
    if (filteredCats.length === 0) return;

    const currentTime = new Date();
    const titleText = mode === 'luyke' ? 'BÁO CÁO NGÀNH HÀNG (LUỸ KẾ)' : 'BÁO CÁO NGÀNH HÀNG (REALTIME)';
    let commentText = `📊 ${titleText}\n⏰ Cập nhật: ${currentTime.toLocaleTimeString('vi-VN')}\n\n`;
    
    filteredCats.forEach(cat => {
      let rate = 0;
      if (mode === 'luyke') {
        if (cat.target > 0 && daysPassed > 0) {
          rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
        }
      } else {
        rate = cat.target > 0 ? (cat.revenue / cat.target) * 100 : 0;
      }
      
      const roundedRate = Math.round(rate);
      const status = roundedRate >= 100 ? '✅' : '❌';
      commentText += `${status} ${cat.name}: ${roundedRate}% (${cat.revenue.toLocaleString()} / ${cat.target.toLocaleString()})\n`;
    });

    setComment(commentText);
    setShowComment(true);

    navigator.clipboard.writeText(commentText).then(() => {
      showNotification(`Đã tạo nhận xét và copy vào bộ nhớ tạm!`, 'success');
    });
  };

  const groups = ['ALL', 'SLLK', 'DTLK'];
  
  const filteredCats = categories
    .filter(c => {
      const matchesMarket = catMarketFilter === 'ALL' || c.marketName === catMarketFilter;
      
      let matchesType = true;
      if (catGroupFilter !== 'ALL') {
        const filterType = catGroupFilter === 'SLLK' ? 'SL' : (catGroupFilter === 'DTLK' ? 'DT' : 'ALL');
        matchesType = c.type === filterType;
      }
      
      return matchesMarket && matchesType;
    })
    .sort((a, b) => {
      let rateA = 0;
      let rateB = 0;
      
      if (mode === 'luyke') {
        if (a.target > 0 && daysPassed > 0) rateA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
        if (b.target > 0 && daysPassed > 0) rateB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
      } else {
        if (a.target > 0) rateA = (a.revenue / a.target) * 100;
        if (b.target > 0) rateB = (b.revenue / b.target) * 100;
      }
      
      return rateB - rateA;
    });

  return (
    <div className={cn("bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm", mode === 'luyke' ? "" : "overflow-hidden")}>
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-10 bg-black rounded-full" />
          <div>
            <div className={cn("flex flex-wrap items-center gap-2", mode === 'luyke' ? "no-capture" : "")}>
              <h3 className="text-sm sm:text-lg md:text-2xl font-black text-black uppercase tracking-tight">
                📦 {title} {catMarketFilter !== 'ALL' ? `- ${catMarketFilter}` : ''} ({filteredCats.length})
              </h3>
            </div>
            <p className={cn("text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider", mode === 'luyke' ? "no-capture" : "")}>Theo dõi tiến độ hoàn thành mục tiêu</p>
          </div>
          <button 
            onClick={() => captureElement(captureRef, mode === 'luyke' ? 'NganhHang_LuyKe' : 'NganhHang_Realtime')}
            className="flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase border border-amber-200 hover:bg-amber-100 transition-all ml-2 no-capture"
          >
            <Camera size={14} /> <span className="hidden sm:inline">CHỤP ẢNH</span>
          </button>
          <button 
            onClick={generateAndCopyComment}
            className={cn(
              "flex items-center justify-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase border transition-all ml-2 no-capture",
              showComment ? "bg-indigo-600 text-white border-indigo-700" : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
            )}
            title="Tự động nhận xét & Copy"
          >
            <MessageSquare size={14} /> <span className="hidden sm:inline">NHẬN XÉT</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 no-capture">
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => setCatGroupFilter(group)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                catGroupFilter === group ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {group === 'SLLK' ? 'SL LK' : (group === 'DTLK' ? 'DT LK' : group)}
            </button>
          ))}
        </div>
      </div>
      
      <div ref={captureRef} className={cn("bg-white", mode === 'luyke' ? "p-4 sm:p-8" : "p-2 sm:p-4")}>
        {showComment && (
          <div className="mb-4 no-capture">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhận xét tự động..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[80px]"
            />
          </div>
        )}
        <div className={cn(
          "w-full border border-slate-300 bg-white relative shadow-inner"
        )}>
          <table className="w-full text-left border-collapse border border-slate-300 table-auto">
            <thead className="sticky top-0 z-40 shadow-sm">
              <tr className="border-b border-slate-300 bg-white">
                <th colSpan={2} className="sticky left-0 z-50 bg-white px-0.5 py-3 sm:px-2 sm:py-4 text-[clamp(12px,3vw,24px)] font-black uppercase tracking-tight border-r border-slate-300 text-black text-center whitespace-nowrap">
                  {mode === 'luyke' ? 'BẢNG LUỸ KẾ NGÀNH HÀNG' : 'BẢNG TIẾN ĐỘ NGÀNH HÀNG'}
                </th>
                <th colSpan={4} className={cn(
                  "px-0.5 py-3 sm:px-2 sm:py-4 text-[clamp(12px,3vw,24px)] font-black uppercase tracking-tight text-center whitespace-nowrap bg-white",
                  mode === 'luyke' ? "text-rose-600" : "text-[#e11d48]"
                )}>
                  {mode === 'luyke' ? 'LUỸ KẾ' : 'TIẾN ĐỘ'}
                </th>
              </tr>
              <tr className="border-b border-slate-300 bg-white">
                <th colSpan={2} className="sticky left-0 z-50 bg-white px-0.5 py-2 sm:px-2 sm:py-2 text-[clamp(8px,1.8vw,13px)] font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar size={14} className="text-blue-600" />
                    <span className="uppercase tracking-widest">{mode === 'luyke' ? `LUỸ KẾ ĐẾN NGÀY : ${formatLuyKeDate()}` : `LUỸ KẾ : ${formatRealtimeDate()}`}</span>
                  </div>
                </th>
                <th colSpan={4} className="px-0.5 py-2 sm:px-2 sm:py-2 text-[clamp(8px,1.8vw,13px)] font-bold text-slate-900 whitespace-nowrap bg-white">
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={14} className="text-orange-600" />
                    <span className="uppercase tracking-widest">
                      {mode === 'luyke' ? `TGSD: ${getLuyKeProgress(daysPassed, totalDays)}` : `TGSD: ${getWorkingDayProgress().toFixed(0)}%`}
                    </span>
                  </div>
                </th>
              </tr>
              <tr className="border-b border-slate-300">
                <th rowSpan={2} className="sticky left-0 z-50 px-0.5 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-white text-center border-r border-slate-300 bg-[#10b981] whitespace-nowrap">
                  STT
                </th>
                <th rowSpan={2} className="sticky left-[40px] sm:left-[60px] z-50 px-1 sm:px-3 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-white border-r border-slate-300 bg-[#10b981] text-center whitespace-nowrap">
                  NGÀNH HÀNG
                </th>
                <th colSpan={3} className="px-0.5 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-black text-center border-r border-slate-300 bg-[#facc15] whitespace-nowrap">
                  DOANH THU (TRIỆU)
                </th>
                <th rowSpan={2} className="px-0.5 py-3 text-[clamp(8px,1.5vw,14px)] font-black text-white text-center bg-[#f97316] whitespace-nowrap">
                  CÒN LẠI
                </th>
              </tr>
              <tr className="border-b border-slate-300">
                <th className="px-0.5 py-2 text-[clamp(7px,1.2vw,13px)] font-black text-black text-center border-r border-slate-300 bg-[#fde047] whitespace-nowrap">
                  TARGET
                </th>
                <th className="px-0.5 py-2 text-[clamp(7px,1.2vw,13px)] font-black text-black text-center border-r border-slate-300 bg-[#fde047] whitespace-nowrap">
                  {mode === 'luyke' ? 'LUỸ KẾ' : 'REAL'}
                </th>
                <th className="px-0.5 py-2 text-[clamp(7px,1.2vw,13px)] font-black text-black text-center border-r border-slate-300 bg-[#84cc16] whitespace-nowrap">
                  %HT
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCats.map((item, idx) => {
                let rate = 0;
                if (item.target > 0) {
                  if (mode === 'luyke' && daysPassed > 0 && totalDays > 0) {
                    const projectedRevenue = (item.revenue / daysPassed) * totalDays;
                    rate = (projectedRevenue / item.target) * 100;
                  } else {
                    rate = (item.revenue / item.target) * 100;
                  }
                }
                
                const diff = item.revenue - item.target;
                const remaining = mode === 'luyke' ? diff : (item.target - item.revenue);
                
                return (
                  <tr 
                    key={`${item.name}-${idx}`} 
                    className="border-b border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                    style={{ height: '25pt' }}
                  >
                    <td className="sticky left-0 z-10 px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] font-black text-black text-center border-r border-slate-300 bg-[#fef08a] whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="sticky left-[40px] sm:left-[60px] z-10 px-2 sm:px-4 py-2 text-[clamp(8px,1.5vw,13px)] font-black border-r border-slate-300 text-[#2563eb] uppercase leading-tight whitespace-nowrap bg-white">
                      <span className="mr-2">›</span>
                      {mode === 'luyke' 
                        ? (item.type === 'SL' || item.type === 'DT' 
                            ? `${item.name} - ${item.type === 'SL' ? 'SLLK' : 'DTLK'}`
                            : item.name)
                        : (item.type === 'SL' || item.type === 'DT'
                            ? `${item.name.toUpperCase()} - ${item.type}`
                            : item.name.toUpperCase())
                      }
                    </td>
                    <td className="px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] text-center border-r border-slate-300 font-black text-slate-700 whitespace-nowrap">
                      {Math.round(item.target)}
                    </td>
                    <td className="px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] text-center border-r border-slate-300 font-black text-[#059669] whitespace-nowrap">
                      {Math.round(item.revenue)}
                    </td>
                    <td className={cn(
                      "px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] text-center border-r border-slate-300 font-black whitespace-nowrap",
                      rate < 100 ? "bg-red-100 text-red-600" : "text-[#059669]"
                    )}>
                      {Math.round(rate)}%
                    </td>
                    <td className={cn(
                      "px-0.5 py-2 text-[clamp(8px,1.5vw,13px)] text-center font-black whitespace-nowrap",
                      mode === 'luyke' 
                        ? (remaining < 0 ? "bg-red-100 text-red-600" : "")
                        : (remaining < 0 ? "text-[#dc2626]" : (remaining === 0 ? "" : "text-[#059669]"))
                    )}>
                      {mode === 'luyke' ? (
                        remaining < 0 ? Math.round(remaining) : ""
                      ) : (
                        remaining > 0 ? (
                          Math.round(remaining)
                        ) : (remaining === 0 ? (
                          <div className="flex justify-center">
                            <Check size={14} className="text-[#059669] stroke-[4px]" />
                          </div>
                        ) : (
                          Math.round(remaining)
                        ))
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
  );
};

export default CategoryTable;
