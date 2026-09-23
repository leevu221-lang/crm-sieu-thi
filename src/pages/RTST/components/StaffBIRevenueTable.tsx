/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera } from 'lucide-react';
import { StaffData } from '../types';
import { cn, formatStaffName } from '../utils';

interface StaffBIRevenueTableProps {
  staffRankData: StaffData[];
  excludedStaffIds: string[];
  setExcludedStaffIds?: (ids: string[]) => void;
  captureRef: React.RefObject<HTMLDivElement | null>;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => void;
}

const StaffBIRevenueTable: React.FC<StaffBIRevenueTableProps> = ({
  staffRankData,
  excludedStaffIds,
  setExcludedStaffIds,
  captureRef,
  captureElement
}) => {
  const toggleExclude = (id: string) => {
    if (!setExcludedStaffIds) return;
    if (excludedStaffIds.includes(id)) {
      setExcludedStaffIds(excludedStaffIds.filter(i => i !== id));
    } else {
      setExcludedStaffIds([...excludedStaffIds, id]);
    }
  };

  if (staffRankData.length === 0) return null;

  // We show all staff but sort them so excluded ones are at the bottom
  const sortedStaff = [...staffRankData].sort((a, b) => {
    const aExcluded = excludedStaffIds.includes(a.fullId);
    const bExcluded = excludedStaffIds.includes(b.fullId);
    if (aExcluded && !bExcluded) return 1;
    if (!aExcluded && bExcluded) return -1;
    return b.virtualVal - a.virtualVal;
  });

  const visibleCount = staffRankData.filter(s => !excludedStaffIds.includes(s.fullId)).length;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            💰 BẢNG DOANH THU NHÂN VIÊN (BI LUỸ KẾ)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Nguồn: BI LUỸ KẾ</p>
          <button 
            onClick={() => captureElement(captureRef, 'BangDoanhThu_NV_BI')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 border-2 border-slate-200 rounded-xl text-xs font-black hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group no-capture"
          >
            <Camera size={18} className="group-hover:scale-110 transition-transform" />
            XUẤT ẢNH BẢNG
          </button>
        </div>
      </div>

      <div ref={captureRef} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900">
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">STT</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Doanh thu thực</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Doanh thu quy đổi</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Top/Bot</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center no-capture">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStaff.map((staff, idx) => {
                const isExcluded = excludedStaffIds.includes(staff.fullId);
                const rank = isExcluded ? 0 : sortedStaff.filter(s => !excludedStaffIds.includes(s.fullId) && s.virtualVal > staff.virtualVal).length + 1;
                
                const isTop = !isExcluded && rank > 0 && rank <= Math.ceil(visibleCount * 0.2);
                const isBot = !isExcluded && rank > 0 && rank > Math.floor(visibleCount * 0.8);
                const nameOnly = staff.displayName.split(' - ').slice(1).join(' - ');

                return (
                  <tr 
                    key={`${staff.fullId}-${idx}`} 
                    className={cn(
                      "transition-colors",
                      isExcluded ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"
                    )}
                  >
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs font-black text-slate-400">{isExcluded ? '-' : rank}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-sm font-black uppercase",
                          isExcluded ? "text-slate-400 line-through" : isTop ? "text-blue-600" : isBot ? "text-rose-500" : "text-slate-900"
                        )}>
                          {formatStaffName(nameOnly)} - {staff.fullId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-bold text-slate-600">{staff.actualVal !== null ? Math.round(staff.actualVal).toLocaleString('vi-VN') : ''}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-black text-emerald-600">{Math.round(staff.virtualVal).toLocaleString('vi-VN')}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {isTop ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-lg">TOP</span>
                      ) : isBot ? (
                        <span className="px-2 py-1 bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg">BOT</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center no-capture">
                      {setExcludedStaffIds && (
                        <button 
                          onClick={() => toggleExclude(staff.fullId)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            isExcluded ? "text-emerald-500 hover:bg-emerald-50" : "text-rose-500 hover:bg-rose-50"
                          )}
                        >
                          {isExcluded ? 'Bao gồm' : 'Loại trừ'}
                        </button>
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

export default StaffBIRevenueTable;
