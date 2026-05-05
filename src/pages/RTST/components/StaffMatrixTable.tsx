/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, CheckCircle2, XCircle } from 'lucide-react';
import { StaffMatrixData, CategoryData } from '../types';
import { cn } from '../utils';

interface StaffMatrixTableProps {
  staffMatrix: StaffMatrixData[];
  categories: CategoryData[];
  captureRef: React.RefObject<HTMLDivElement | null>;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, name: string) => void;
}

const StaffMatrixTable: React.FC<StaffMatrixTableProps> = ({
  staffMatrix,
  categories,
  captureRef,
  captureElement
}) => {
  const dtCategories = categories.filter(c => c.type === 'DT');

  if (staffMatrix.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            📊 MA TRẬN HIỆU QUẢ NHÂN VIÊN (BI)
          </h2>
        </div>
        <button 
          onClick={() => captureElement(captureRef, 'MaTran_HieuQua_BI')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 border-2 border-slate-200 rounded-xl text-xs font-black hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
        >
          <Camera size={18} className="group-hover:scale-110 transition-transform" />
          XUẤT ẢNH MA TRẬN
        </button>
      </div>

      <div ref={captureRef} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900">
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sticky left-0 bg-slate-900 z-10">Hạng</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-[60px] bg-slate-900 z-10">Nhân viên</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Đạt</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tỷ lệ</th>
                {dtCategories.map((cat, idx) => (
                  <th key={idx} className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[120px]">
                    {cat.name.replace(' - DTLK', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffMatrix.map((staff, idx) => (
                <tr key={`${staff.fullId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-center sticky left-0 bg-white group-hover:bg-slate-50">
                    <span className="text-xs font-black text-slate-400">{idx + 1}</span>
                  </td>
                  <td className="px-6 py-4 sticky left-[60px] bg-white group-hover:bg-slate-50">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 whitespace-nowrap uppercase">
                        {staff.displayName.split(' - ')[1]} - {staff.fullId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-black text-indigo-600">{staff.achieved}/{staff.totalCats}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "text-xs font-black px-2 py-1 rounded-lg",
                      staff.rate >= 100 ? "bg-emerald-100 text-emerald-600" : 
                      staff.rate >= 50 ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {staff.rate.toFixed(1)}%
                    </span>
                  </td>
                  {staff.projectedRates.map((rate, rIdx) => (
                    <td key={rIdx} className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {rate >= 100 ? (
                          <CheckCircle2 size={20} className="text-emerald-500" />
                        ) : (
                          <XCircle size={20} className="text-rose-300" />
                        )}
                        <span className={cn(
                          "text-[10px] font-bold",
                          rate >= 100 ? "text-emerald-600" : "text-slate-400"
                        )}>
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffMatrixTable;
