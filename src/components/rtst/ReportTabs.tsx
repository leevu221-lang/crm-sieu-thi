/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutGrid, 
  Boxes, 
  Users, 
  Grid2X2, 
  Zap, 
  Search, 
  Trash2, 
  Copy, 
  Download, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  ChevronRight, 
  ChevronDown, 
  MoreHorizontal 
} from 'lucide-react';
import { MarketInfo, CategoryData, StaffData, StaffMatrixData, YcxStaffData } from '../../types/rtst';
import { formatShortCurrency, formatMarketNameForDisplay } from '../../utils/rtstHelpers';

interface ReportTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  displayData: {
    markets: MarketInfo[];
    catData: CategoryData[];
    staffRankData: StaffData[];
    staffMatrix: StaffMatrixData[];
    ycxData: YcxStaffData[];
  } | null;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onCopy: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string, type: string) => void;
  daysPassed: number;
  totalDays: number;
}

export const ReportTabs: React.FC<ReportTabsProps> = ({
  activeTab, setActiveTab,
  displayData,
  searchTerm, setSearchTerm,
  onCopy, onDownload, onDelete,
  daysPassed, totalDays
}) => {
  if (!displayData) return null;

  const tabs = [
    { id: 'market', label: 'Siêu thị', icon: LayoutGrid, color: 'blue' },
    { id: 'category', label: 'Ngành hàng', icon: Boxes, color: 'indigo' },
    { id: 'staff', label: 'Xếp hạng', icon: Users, color: 'emerald' },
    { id: 'matrix', label: 'Ma trận', icon: Grid2X2, color: 'amber' },
    { id: 'ycx', label: 'YCX', icon: Zap, color: 'cyan' },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center bg-slate-50/50 border-b border-slate-100 p-2 md:p-3 gap-1 md:gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all whitespace-nowrap
                ${isActive 
                  ? `bg-white text-${tab.color}-600 shadow-sm border border-slate-200` 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }
              `}
            >
              <Icon size={14} />
              <span className="uppercase tracking-widest">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="p-4 md:p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm nhanh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs md:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onCopy(activeTab)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
          >
            <Copy size={14} /> SAO CHÉP
          </button>
          <button 
            onClick={() => onDownload(activeTab)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
          >
            <Download size={14} /> TẢI ẢNH
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="overflow-x-auto">
        {activeTab === 'market' && (
          <MarketTable 
            data={displayData.markets} 
            searchTerm={searchTerm} 
            onDelete={onDelete}
            daysPassed={daysPassed}
            totalDays={totalDays}
          />
        )}
        {activeTab === 'category' && (
          <CategoryTable 
            data={displayData.catData} 
            searchTerm={searchTerm} 
            onDelete={onDelete}
            daysPassed={daysPassed}
            totalDays={totalDays}
          />
        )}
        {activeTab === 'staff' && (
          <StaffTable 
            data={displayData.staffRankData} 
            searchTerm={searchTerm} 
            onDelete={onDelete}
            daysPassed={daysPassed}
            totalDays={totalDays}
          />
        )}
        {activeTab === 'matrix' && (
          <MatrixTable 
            data={displayData.staffMatrix} 
            searchTerm={searchTerm} 
            onDelete={onDelete}
          />
        )}
        {activeTab === 'ycx' && (
          <YcxTable 
            data={displayData.ycxData} 
            searchTerm={searchTerm} 
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
};

// --- Sub-components for Tables ---

const MarketTable = ({ data, searchTerm, onDelete, daysPassed, totalDays }: any) => {
  const filtered = data.filter((m: any) => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <table className="w-full text-left border-collapse min-w-[800px]">
      <thead>
        <tr className="bg-slate-50/50">
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siêu thị</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Mục tiêu</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thực đạt (V)</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thực đạt (R)</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tỉ lệ</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Dự báo</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {filtered.map((m: any, idx: number) => {
          const runRate = (m.percent / daysPassed) * totalDays;
          const isOver = runRate >= 100;
          return (
            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{formatMarketNameForDisplay(m.name)}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-bold text-slate-600">{formatShortCurrency(m.targetST)}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-black text-blue-600">{formatShortCurrency(m.actualVirtual)}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-medium text-slate-500">{formatShortCurrency(m.actualReal)}</span>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black">
                  {Math.round(m.percent)}%
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${isOver ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isOver ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.round(runRate)}%
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <button 
                  onClick={() => onDelete(m.name, 'market')}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const CategoryTable = ({ data, searchTerm, onDelete, daysPassed, totalDays }: any) => {
  const filtered = data.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <table className="w-full text-left border-collapse min-w-[800px]">
      <thead>
        <tr className="bg-slate-50/50">
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngành hàng</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Mục tiêu</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thực đạt</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tỉ lệ</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Dự báo</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {filtered.map((c: any, idx: number) => {
          const runRate = (c.rate / daysPassed) * totalDays;
          const isOver = runRate >= 100;
          return (
            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{c.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-bold text-slate-600">{formatShortCurrency(c.target)}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-black text-indigo-600">{formatShortCurrency(c.actual)}</span>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black">
                  {Math.round(c.rate)}%
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${isOver ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isOver ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.round(runRate)}%
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <button 
                  onClick={() => onDelete(c.name, 'category')}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const StaffTable = ({ data, searchTerm, onDelete, daysPassed, totalDays }: any) => {
  const filtered = data.filter((s: any) => 
    s.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <table className="w-full text-left border-collapse min-w-[800px]">
      <thead>
        <tr className="bg-slate-50/50">
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thực đạt</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tỉ lệ</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Dự báo</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {filtered.map((s: any, idx: number) => {
          const runRate = (s.rate / daysPassed) * totalDays;
          const isOver = runRate >= 100;
          return (
            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{s.displayName}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-black text-emerald-600">{formatShortCurrency(s.actual)}</span>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black">
                  {Math.round(s.rate)}%
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${isOver ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isOver ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.round(runRate)}%
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <button 
                  onClick={() => onDelete(s.displayName, 'staff')}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const MatrixTable = ({ data, searchTerm, onDelete }: any) => {
  const filtered = data.filter((m: any) => 
    m.staffName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <table className="w-full text-left border-collapse min-w-[800px]">
      <thead>
        <tr className="bg-slate-50/50">
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngành hàng</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thực đạt</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tỉ lệ</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Dự báo</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {filtered.map((m: any, idx: number) => {
          const isOver = m.runRate >= 100;
          return (
            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{m.staffName}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.category}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-black text-amber-600">{formatShortCurrency(m.actual)}</span>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black">
                  {Math.round(m.rate)}%
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${isOver ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isOver ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.round(m.runRate)}%
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <button 
                  onClick={() => onDelete(m.staffName + m.category, 'matrix')}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const YcxTable = ({ data, searchTerm, onDelete }: any) => {
  const filtered = data.filter((y: any) => 
    y.staffName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <table className="w-full text-left border-collapse min-w-[800px]">
      <thead>
        <tr className="bg-slate-50/50">
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">DT Quy đổi</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">DT Thực</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số lượng SP</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {filtered.map((y: any, idx: number) => (
          <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                  {idx + 1}
                </div>
                <span className="text-sm font-bold text-slate-700">{y.staffName}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-right">
              <span className="text-sm font-black text-cyan-600">{formatShortCurrency(y.convertedTotal)}</span>
            </td>
            <td className="px-6 py-4 text-right">
              <span className="text-sm font-medium text-slate-500">{formatShortCurrency(y.actualTotal)}</span>
            </td>
            <td className="px-6 py-4 text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black">
                {y.items.length} SP
              </div>
            </td>
            <td className="px-6 py-4 text-center">
              <button 
                onClick={() => onDelete(y.staffName, 'ycx')}
                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
