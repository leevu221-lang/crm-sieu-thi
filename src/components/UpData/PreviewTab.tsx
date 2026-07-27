import React from 'react';
import { Store, Users, Target, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PreviewTabProps {
  previewData: { markets: any[], staff: any[] };
  daysPassed: number;
  totalDays: number;
  excludedMarketNames: string[];
  excludedStaffIds: string[];
  targetConfigMap: Record<string, any>;
}

export default function PreviewTab({
  previewData,
  daysPassed,
  totalDays,
  excludedMarketNames,
  excludedStaffIds,
  targetConfigMap
}: PreviewTabProps) {
  const visibleMarkets = previewData.markets.filter(m => !excludedMarketNames.includes(m.name));
  const visibleStaff = previewData.staff.filter(s => !excludedStaffIds.includes(s.fullId));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Preview */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Store size={20} />
            </div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Xem Trước Siêu Thị ({visibleMarkets.length})</h3>
          </div>

          <div className="space-y-3">
            {visibleMarkets.length === 0 ? (
              <p className="text-center py-8 text-slate-400 font-bold text-sm">Chưa có dữ liệu siêu thị</p>
            ) : (
              visibleMarkets.map((m, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Siêu thị</span>
                    <span className="font-black text-sm text-slate-800">{m.name.replace(/^ĐML\s*-\s*/i, '')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Target Gốc</span>
                    <span className="font-black text-sm text-indigo-600">{Math.round(m.baseTarget).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Staff Preview */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <Users size={20} />
            </div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Xem Trước Nhân Viên ({visibleStaff.length})</h3>
          </div>

          <div className="space-y-3">
            {visibleStaff.length === 0 ? (
              <p className="text-center py-8 text-slate-400 font-bold text-sm">Chưa có dữ liệu nhân viên</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {visibleStaff.map((s, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 font-black text-[10px]">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-700 truncate block">{s.displayName}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{s.fullId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl shadow-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tổng Target Cụm</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">{Math.round(visibleMarkets.reduce((acc, m) => acc + m.baseTarget, 0)).toLocaleString('vi-VN')}</span>
              <span className="text-xs font-bold text-slate-500">triệu</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Target / Nhân viên</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">
                {visibleStaff.length > 0 
                  ? Math.round(visibleMarkets.reduce((acc, m) => acc + m.baseTarget, 0) / visibleStaff.length).toLocaleString('vi-VN')
                  : 0
                }
              </span>
              <span className="text-xs font-bold text-slate-500">triệu</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Số ngày báo cáo</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">{daysPassed}</span>
              <span className="text-xs font-bold text-slate-500">/ {totalDays} ngày</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tỷ lệ thời gian</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">{totalDays > 0 ? Math.round((daysPassed / totalDays) * 100) : 0}%</span>
              <span className="text-xs font-bold text-slate-500">tiến độ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
