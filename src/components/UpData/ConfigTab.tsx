import React from 'react';
import { Filter, Store, ChevronDown, Square, CheckSquare, Check, Target, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfigTabProps {
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  daysPassed: number;
  setDaysPassed: (val: number) => void;
  totalDays: number;
  setTotalDays: (val: number) => void;
  activeMarketName: string | null;
  targetConfigMap: Record<string, any>;
  setTargetConfigMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  excludedMarketNames: string[];
  setExcludedMarketNames: React.Dispatch<React.SetStateAction<string[]>>;
  excludedStaffIds: string[];
  setExcludedStaffIds: React.Dispatch<React.SetStateAction<string[]>>;
  previewData: { markets: { name: string }[], staff: { displayName: string, fullId: string }[] };
}

export default function ConfigTab({
  selectedMonth, setSelectedMonth,
  daysPassed, setDaysPassed,
  totalDays, setTotalDays,
  activeMarketName,
  targetConfigMap, setTargetConfigMap,
  excludedMarketNames, setExcludedMarketNames,
  excludedStaffIds, setExcludedStaffIds,
  previewData
}: ConfigTabProps) {
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = React.useState(false);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = React.useState(false);

  const key = activeMarketName || '__CLUSTER__';
  const targetConfig = targetConfigMap[key] || {
    total: 3524.6,
    traGop: 45,
    quyDoi: 40,
    totalAdj: 100,
    traGopAdj: 100,
    quyDoiAdj: 100
  };

  const setTargetConfig = (updater: (prev: any) => any) => {
    setTargetConfigMap(prev => {
      const current = prev[key] || {
        total: 3524.6,
        traGop: 45,
        quyDoi: 40,
        totalAdj: 100,
        traGopAdj: 100,
        quyDoiAdj: 100
      };
      return { ...prev, [key]: updater(current) };
    });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    
    if (!newMonth) return;
    const [yearStr, monthStr] = newMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();
    
    const calculatedTotalDays = new Date(year, month, 0).getDate();
    setTotalDays(calculatedTotalDays);
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      setDaysPassed(calculatedTotalDays);
    } else if (year === currentYear && month === currentMonth) {
      let d = currentDate - 1;
      setDaysPassed(d < 1 ? 1 : d);
    } else {
      setDaysPassed(0);
    }
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Config */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Filter size={20} />
            </div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Cấu Hình Thời Gian</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tháng báo cáo</label>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={handleMonthChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Số ngày đã qua</label>
                <input 
                  type="number" 
                  value={daysPassed}
                  onChange={(e) => setDaysPassed(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tổng số ngày</label>
                <input 
                  type="number" 
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Target Adjustment */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Target size={20} />
            </div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Điều Chỉnh Target ({activeMarketName || 'CỤM'})</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ số Target Tổng (%)</label>
                <span className="text-lg font-black text-indigo-600">{targetConfig.totalAdj}%</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="150" 
                step="1"
                value={targetConfig.totalAdj}
                onChange={(e) => setTargetConfig(prev => ({ ...prev, totalAdj: Number(e.target.value) }))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase">
                <span>Giảm 50%</span>
                <span>Gốc (100%)</span>
                <span>Tăng 50%</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Giá trị sau điều chỉnh</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {Math.round(targetConfig.total * (targetConfig.totalAdj / 100)).toLocaleString('vi-VN')}
                </span>
                <span className="text-xs font-bold text-slate-400">triệu</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exclusion Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Exclusion */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                <Store size={20} />
              </div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Loại Bỏ Siêu Thị Khỏi Cụm</h3>
            </div>
            <button 
              onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ChevronDown size={20} className={cn("transition-transform", isMarketDropdownOpen && "rotate-180")} />
            </button>
          </div>

          <AnimatePresence>
            {isMarketDropdownOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {previewData.markets.map(m => (
                    <button
                      key={m.name}
                      onClick={() => {
                        setExcludedMarketNames(prev => 
                          prev.includes(m.name) ? prev.filter(n => n !== m.name) : [...prev, m.name]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        excludedMarketNames.includes(m.name)
                          ? "bg-rose-50 border-rose-100 text-rose-600"
                          : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                      )}
                    >
                      {excludedMarketNames.includes(m.name) ? <Square size={16} /> : <CheckSquare size={16} className="text-indigo-600" />}
                      <span className="text-xs font-bold truncate">{m.name.replace(/^ĐML\s*-\s*/i, '')}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Staff Exclusion */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Users size={20} />
              </div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Loại Bỏ Nhân Viên</h3>
            </div>
            <button 
              onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ChevronDown size={20} className={cn("transition-transform", isStaffDropdownOpen && "rotate-180")} />
            </button>
          </div>

          <AnimatePresence>
            {isStaffDropdownOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {previewData.staff.map(s => (
                    <button
                      key={s.fullId}
                      onClick={() => {
                        setExcludedStaffIds(prev => 
                          prev.includes(s.fullId) ? prev.filter(id => id !== s.fullId) : [...prev, s.fullId]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        excludedStaffIds.includes(s.fullId)
                          ? "bg-rose-50 border-rose-100 text-rose-600"
                          : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                      )}
                    >
                      {excludedStaffIds.includes(s.fullId) ? <Square size={16} /> : <CheckSquare size={16} className="text-indigo-600" />}
                      <span className="text-xs font-bold truncate">{s.displayName} - {s.fullId}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
