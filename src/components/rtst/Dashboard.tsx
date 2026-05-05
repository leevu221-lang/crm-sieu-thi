/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3, 
  Store, 
  Users, 
  Grid2X2 
} from 'lucide-react';
import { MarketInfo, CategoryData, StaffData } from '../../types/rtst';
import { formatShortCurrency } from '../../utils/rtstHelpers';

interface DashboardProps {
  displayData: {
    markets: MarketInfo[];
    catData: CategoryData[];
    staffRankData: StaffData[];
  } | null;
  daysPassed: number;
  totalDays: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ displayData, daysPassed, totalDays }) => {
  if (!displayData) return null;

  const totalTarget = displayData.markets.reduce((acc, m) => acc + m.targetST, 0);
  const totalActual = displayData.markets.reduce((acc, m) => acc + m.actualVirtual, 0);
  const totalPercent = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  const runRate = (totalPercent / daysPassed) * totalDays;
  const isOverTarget = runRate >= 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
      {/* Doanh thu tổng */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Doanh thu</span>
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {formatShortCurrency(totalActual)}
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Thực đạt tổng</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(totalPercent, 100)}%` }}
              />
            </div>
            <span className="text-xs font-black text-blue-600">{Math.round(totalPercent)}%</span>
          </div>
        </div>
      </div>

      {/* Target tổng */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <Target size={20} />
          </div>
          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Mục tiêu</span>
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {formatShortCurrency(totalTarget)}
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Target tổng kho</p>
          <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Tiến độ ngày: {Math.round((daysPassed / totalDays) * 100)}%</span>
            <span className={totalPercent >= (daysPassed / totalDays) * 100 ? 'text-emerald-600' : 'text-rose-600'}>
              {totalPercent >= (daysPassed / totalDays) * 100 ? 'Vượt tiến độ' : 'Chậm tiến độ'}
            </span>
          </div>
        </div>
      </div>

      {/* Dự báo tháng */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Zap size={20} />
          </div>
          <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Dự báo</span>
        </div>
        <div className="relative z-10">
          <h3 className={`text-2xl md:text-3xl font-black tracking-tight ${isOverTarget ? 'text-emerald-600' : 'text-rose-600'}`}>
            {Math.round(runRate)}%
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Dự báo hoàn thành</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${isOverTarget ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(runRate, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-black ${isOverTarget ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isOverTarget ? 'DONE' : 'FAIL'}
            </span>
          </div>
        </div>
      </div>

      {/* Xếp hạng */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Trophy size={20} />
          </div>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Nhân sự</span>
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {displayData.staffRankData.length}
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Nhân viên tham gia</p>
          <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Top 1: {displayData.staffRankData[0]?.displayName.split(' - ')[1] || 'N/A'}</span>
            <span className="text-indigo-600">
              {Math.round(displayData.staffRankData[0]?.rate || 0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
