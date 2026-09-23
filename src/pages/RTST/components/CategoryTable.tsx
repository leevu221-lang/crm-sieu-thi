/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * CategoryTable v2.1 - Red name for < 100% HT
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

  const [sortMode, setSortMode] = useState<'HT_DESC' | 'HT_ASC' | 'CONLAI_DESC' | 'CONLAI_ASC'>('HT_DESC');

  const sortCatList = (list: CategoryData[]) => {
    return [...list].sort((a, b) => {
      let rateA = 0;
      let rateB = 0;
      if (mode === 'luyke') {
        if (a.target > 0 && daysPassed > 0) rateA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
        if (b.target > 0 && daysPassed > 0) rateB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
      } else {
        if (a.target > 0) rateA = (a.revenue / a.target) * 100;
        if (b.target > 0) rateB = (b.revenue / b.target) * 100;
      }

      const remA = a.target - a.revenue;
      const remB = b.target - b.revenue;

      if (sortMode === 'CONLAI_DESC') {
        if (remA > 0 && remB > 0) return remB - remA;
        if (remA > 0 && remB <= 0) return -1;
        if (remA <= 0 && remB > 0) return 1;
        return remB - remA;
      }

      if (sortMode === 'CONLAI_ASC') {
        if (remA <= 0 && remB > 0) return -1;
        if (remA > 0 && remB <= 0) return 1;
        return remA - remB;
      }

      if (sortMode === 'HT_ASC') {
        return rateA - rateB;
      }

      return rateB - rateA;
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
    });

  // Separate SL and DT categories
  const slCats = filteredCats.filter(c => c.type === 'SL');
  const dtCats = filteredCats.filter(c => c.type === 'DT');
  const showSplit = catGroupFilter === 'ALL' && (slCats.length > 0 || dtCats.length > 0);

  const sortedSlCats = sortCatList(slCats);
  const sortedDtCats = sortCatList(dtCats);

  const renderTable = (cats: CategoryData[], typeLabel: string) => {
    const achievedCount = cats.filter(c => {
      let rate = 0;
      if (mode === 'luyke') {
        if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
      } else {
        if (c.target > 0) rate = (c.revenue / c.target) * 100;
      }
      return rate >= 100;
    }).length;

    return (
      <div className="border border-slate-300 overflow-hidden">
        <div className="bg-white p-[15px]">
          <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
            <div className="p-4 flex flex-col items-center justify-center">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">NGÀNH HÀNG ({typeLabel})</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                {mode === 'luyke' ? 'LUỸ KẾ THÁNG' : 'REALTIME'}
              </span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center">
              <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                ĐẠT : {achievedCount}/{cats.length} || TGSD: {daysPassed}/{totalDays}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300 min-w-[500px]">
              <thead>
                <tr className="text-slate-900 h-[40px]">
                  <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                  <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981]">NGÀNH HÀNG</th>
                  <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-[60px]">TARGET</th>
                  <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">LUỸ KẾ</th>
                  <th 
                    onClick={() => setSortMode(prev => prev === 'HT_DESC' ? 'HT_ASC' : 'HT_DESC')}
                    className={`px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 cursor-pointer select-none ${
                      sortMode.startsWith('HT') ? 'bg-[#eab308]' : 'bg-[#facc15]'
                    } w-[60px]`}
                    title="Bấm để sắp xếp %HT"
                  >
                    %HT {sortMode === 'HT_DESC' ? '▼' : (sortMode === 'HT_ASC' ? '▲' : '')}
                  </th>
                  <th 
                    onClick={() => setSortMode(prev => prev === 'CONLAI_DESC' ? 'CONLAI_ASC' : 'CONLAI_DESC')}
                    className={`px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 cursor-pointer select-none ${
                      sortMode.startsWith('CONLAI') ? 'bg-[#ea580c] text-white' : 'bg-[#f97316]'
                    } w-[60px]`}
                    title="Bấm để sắp xếp theo C.LẠI (Còn lại)"
                  >
                    C.LẠI {sortMode === 'CONLAI_DESC' ? '▼' : (sortMode === 'CONLAI_ASC' ? '▲' : '')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cats.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm border-r border-b border-slate-300">Chưa có dữ liệu</td></tr>
                ) : (
                  sortCatList(cats).map((cat, idx) => {
                    let rate = 0;
                    if (cat.target > 0) {
                      if (mode === 'luyke' && daysPassed > 0 && totalDays > 0) {
                        rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                      } else {
                        rate = (cat.revenue / cat.target) * 100;
                      }
                    }
                    const remaining = cat.target - cat.revenue;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors h-[40px]">
                        <td className="px-2 py-0 text-[13px] font-extrabold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">{idx + 1}</td>
                        <td className={`px-2 py-0 text-[13px] font-extrabold uppercase border-r border-b border-slate-300 ${Math.round(rate) < 100 ? 'text-rose-600' : 'text-black'}`}>{cat.name}</td>
                        <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>
                        <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>
                        <td className="px-1 py-0 text-center border-r border-b border-slate-300">
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[12px] leading-none ${Math.round(rate) >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'}`}>
                            {Math.round(rate)}%
                          </span>
                        </td>
                        <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      {/* Toolbar - hidden in capture */}
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 no-capture">
        <div className="flex items-center gap-3">
          <div className="w-2 h-10 bg-black rounded-full" />
          <div>
            <h3 className="text-sm sm:text-lg md:text-2xl font-black text-black uppercase tracking-tight">
              📦 {title} {catMarketFilter !== 'ALL' ? `- ${catMarketFilter}` : ''} ({filteredCats.length})
            </h3>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Theo dõi tiến độ hoàn thành mục tiêu</p>
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
      
      <div ref={captureRef} className="bg-white p-4 sm:p-8">
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

        {showSplit ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedSlCats.length > 0 && renderTable(sortedSlCats, 'SL')}
            {sortedDtCats.length > 0 && renderTable(sortedDtCats, 'DT')}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTable(filteredCats, catGroupFilter === 'SLLK' ? 'SL' : (catGroupFilter === 'DTLK' ? 'DT' : 'ALL'))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryTable;
