/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, Camera, UserMinus, UserPlus } from 'lucide-react';
import { cn, formatStaffName } from '../utils';
import { StaffData } from '../types';

interface StaffRankTableProps {
  staffRankData: StaffData[];
  excludedStaffIds: string[];
  setExcludedStaffIds: (ids: string[]) => void;
  captureRef: React.RefObject<HTMLDivElement | null>;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => void;
}

const StaffRankTable: React.FC<StaffRankTableProps> = ({
  staffRankData,
  excludedStaffIds,
  setExcludedStaffIds,
  captureRef,
  captureElement
}) => {
  const toggleExclude = (id: string) => {
    if (excludedStaffIds.includes(id)) {
      setExcludedStaffIds(excludedStaffIds.filter(i => i !== id));
    } else {
      setExcludedStaffIds([...excludedStaffIds, id]);
    }
  };

  if (staffRankData.length === 0) return null;

  return (
    <div className="mt-8 md:mt-12 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Trophy className="text-amber-500" /> BẢNG DOANH THU NHÂN VIÊN (REALTIME)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Nguồn: 3. THÊM YCX RT</p>
          <button 
            onClick={() => captureElement(captureRef, 'BangDoanhThu_NV_RT')}
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
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hạng</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Doanh thu</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Mục tiêu</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tiến độ</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffRankData.map((staff, idx) => {
                const isExcluded = excludedStaffIds.includes(staff.fullId);
                const nameOnly = staff.displayName.split(' - ').slice(1).join(' - ');
                return (
                  <tr 
                    key={`${staff.fullId}-${idx}`} 
                    className={cn(
                      "group transition-colors",
                      isExcluded ? "bg-slate-50 opacity-60" : "hover:bg-slate-50/80"
                    )}
                  >
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black",
                        idx === 0 ? "bg-amber-100 text-amber-600" : 
                        idx === 1 ? "bg-slate-100 text-slate-600" :
                        idx === 2 ? "bg-orange-100 text-orange-600" : "bg-slate-50 text-slate-400"
                      )}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 uppercase">
                          {formatStaffName(nameOnly)} - {staff.fullId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-black text-indigo-600">{staff.virtualVal.toLocaleString('vi-VN')}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-bold text-slate-500">{staff.target?.toLocaleString('vi-VN')}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-1000",
                              (staff.rate || 0) >= 100 ? "bg-emerald-500" : 
                              (staff.rate || 0) >= 80 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${Math.min(staff.rate || 0, 100)}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-black",
                          (staff.rate || 0) >= 100 ? "text-emerald-600" : 
                          (staff.rate || 0) >= 80 ? "text-amber-600" : "text-rose-600"
                        )}>
                          {(staff.rate || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => toggleExclude(staff.fullId)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          isExcluded ? "text-emerald-500 hover:bg-emerald-50" : "text-rose-500 hover:bg-rose-50"
                        )}
                        title={isExcluded ? "Bao gồm lại" : "Loại trừ khỏi tính toán"}
                      >
                        {isExcluded ? <UserPlus size={18} /> : <UserMinus size={18} />}
                      </button>
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

export default StaffRankTable;
