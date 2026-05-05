/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutGrid, 
  Trash2, 
  Search, 
  ShoppingBag, 
  Boxes, 
  Users, 
  Grid2X2, 
  Zap, 
  Target, 
  FileSpreadsheet, 
  Link,
  Loader2
} from 'lucide-react';

interface InputSectionProps {
  marketInput: string;
  setMarketInput: (val: string) => void;
  staffInput: string;
  setStaffInput: (val: string) => void;
  categoryInput: string;
  setCategoryInput: (val: string) => void;
  staffCategoryInput: string;
  setStaffCategoryInput: (val: string) => void;
  manualAdjustment: number;
  setManualAdjustment: (val: number) => void;
  selectedMonth: string;
  onMonthChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  daysPassed: number;
  setDaysPassed: (val: number) => void;
  totalDays: number;
  setTotalDays: (val: number) => void;
  ycxFileName: string;
  onExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onClear: () => void;
  isProcessing: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  marketInput, setMarketInput,
  staffInput, setStaffInput,
  categoryInput, setCategoryInput,
  staffCategoryInput, setStaffCategoryInput,
  manualAdjustment, setManualAdjustment,
  selectedMonth, onMonthChange,
  daysPassed, setDaysPassed,
  totalDays, setTotalDays,
  ycxFileName, onExcelUpload,
  onProcess, onClear,
  isProcessing
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
      {/* Left Column: Inputs */}
      <div className="space-y-4 md:space-y-6">
        {/* 1. BI Tổng quan */}
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <h2 className="text-sm md:text-base font-bold text-slate-800">1. BI Tổng quan</h2>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="https://bi.mwg.vn/report/view/643" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] md:text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md transition-colors"
              >
                <Link size={10} /> RT BC TỔNG HỢP
              </a>
            </div>
          </div>
          <textarea 
            value={marketInput}
            onChange={(e) => setMarketInput(e.target.value)}
            rows={3}
            placeholder="Dán dòng Siêu thị tổng quan từ BI..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none font-mono"
          />
        </section>

        {/* 2. BI Ngành hàng */}
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <Boxes size={18} />
              </div>
              <h2 className="text-sm md:text-base font-bold text-slate-800">2. BI Ngành hàng</h2>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="https://bi.mwg.vn/report/view/643" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] md:text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
              >
                <Link size={10} /> RT BC TỔNG HỢP
              </a>
            </div>
          </div>
          <textarea 
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            rows={3}
            placeholder="Dán dữ liệu Ngành hàng từ BI..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all resize-none font-mono"
          />
        </section>

        {/* 3. BI Nhân viên */}
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Users size={18} />
              </div>
              <h2 className="text-sm md:text-base font-bold text-slate-800">3. BI Nhân viên</h2>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="https://bi.mwg.vn/report/view/643" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] md:text-xs text-emerald-500 hover:text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md transition-colors"
              >
                <Link size={10} /> RT BC TỔNG HỢP
              </a>
            </div>
          </div>
          <textarea 
            value={staffInput}
            onChange={(e) => setStaffInput(e.target.value)}
            rows={3}
            placeholder="Dán dữ liệu Xếp hạng nhân viên từ BI..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all resize-none font-mono"
          />
        </section>

        {/* 4. BI Ma trận */}
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <Grid2X2 size={18} />
              </div>
              <h2 className="text-sm md:text-base font-bold text-slate-800">4. BI Ma trận</h2>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="https://bi.mwg.vn/report/view/643" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] md:text-xs text-amber-500 hover:text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md transition-colors"
              >
                <Link size={10} /> RT BC TỔNG HỢP
              </a>
            </div>
          </div>
          <textarea 
            value={staffCategoryInput}
            onChange={(e) => setStaffCategoryInput(e.target.value)}
            rows={3}
            placeholder="Dán dữ liệu Ma trận nhân viên từ BI..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all resize-none font-mono"
          />
        </section>
      </div>

      {/* Right Column: Config & Actions */}
      <div className="space-y-4 md:space-y-6">
        {/* Cấu hình thời gian & Target */}
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
              <Target size={18} />
            </div>
            <h2 className="text-sm md:text-base font-bold text-slate-800">Cấu hình báo cáo</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Tháng báo cáo</label>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={onMonthChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Điều chỉnh Target (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={manualAdjustment}
                  onChange={(e) => setManualAdjustment(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày đã trôi qua</label>
              <input 
                type="number" 
                value={daysPassed}
                onChange={(e) => setDaysPassed(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng số ngày</label>
              <input 
                type="number" 
                value={totalDays}
                onChange={(e) => setTotalDays(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* 5. Dữ liệu YCX (Excel) */}
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet size={18} />
              </div>
              <h2 className="text-sm md:text-base font-bold text-slate-800">5. Dữ liệu YCX (Excel)</h2>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="https://bi.mwg.vn/report/view/100" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] md:text-xs text-cyan-500 hover:text-cyan-700 font-medium flex items-center gap-1 bg-cyan-50 px-2 py-1 rounded-md transition-colors"
              >
                <Link size={10} /> BC YCX
              </a>
            </div>
          </div>
          
          <div className="relative group">
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={onExcelUpload}
              className="hidden"
              id="excel-upload"
            />
            <label 
              htmlFor="excel-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-cyan-50/30 hover:border-cyan-200 transition-all cursor-pointer group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-cyan-500 transition-colors">
                  <FileSpreadsheet size={24} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-600">
                    {ycxFileName || 'Tải lên file Excel YCX'}
                  </p>
                  <p className="text-[10px] text-slate-400">Hỗ trợ .xlsx, .xls</p>
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Main Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onProcess}
            disabled={isProcessing}
            className="flex-1 group flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-2xl text-sm font-black hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Zap size={20} className="group-hover:scale-125 transition-transform" />
            )}
            <span>PHÂN TÍCH DỮ LIỆU</span>
          </button>
          <button 
            onClick={onClear}
            className="sm:w-16 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 px-4 py-4 rounded-2xl transition-all border border-slate-200"
            title="Xóa tất cả"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
