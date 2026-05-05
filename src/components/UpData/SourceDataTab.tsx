import React from 'react';
import { Trash2, Link, Store, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SourceDataTabProps {
  marketInput: string;
  setMarketInput: (val: string) => void;
  staffInput: string;
  setStaffInput: (val: string) => void;
  categoryInput: string;
  setCategoryInput: (val: string) => void;
  staffCategoryInput: string;
  setStaffCategoryInput: (val: string) => void;
  clusterReportInput: string;
  setClusterReportInput: (val: string) => void;
  clusterCompetitionInput: string;
  setClusterCompetitionInput: (val: string) => void;
  activeMarketName: string | null;
  setActiveMarketName: (val: string | null) => void;
  marketDataMap: Record<string, any>;
  setMarketDataMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  clusterMarkets: { name: string }[];
  clearAllData: () => void;
}

export default function SourceDataTab({
  marketInput, setMarketInput,
  staffInput, setStaffInput,
  categoryInput, setCategoryInput,
  staffCategoryInput, setStaffCategoryInput,
  clusterReportInput, setClusterReportInput,
  clusterCompetitionInput, setClusterCompetitionInput,
  activeMarketName, setActiveMarketName,
  marketDataMap, setMarketDataMap,
  clusterMarkets,
  clearAllData
}: SourceDataTabProps) {
  return (
    <div className="space-y-6">
      {/* Market Selector */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Store size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Chọn Siêu Thị Đang Cập Nhật</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Dữ liệu sẽ được lưu riêng cho từng siêu thị</p>
            </div>
          </div>
          <button 
            onClick={clearAllData}
            className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-black text-[10px] uppercase px-4 py-2 bg-rose-50 rounded-xl transition-all"
          >
            <Trash2 size={14} /> Xóa Hết Dữ Liệu
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveMarketName(null)}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all text-left group relative overflow-hidden",
              !activeMarketName 
                ? "border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100" 
                : "border-slate-100 bg-slate-50 hover:border-slate-200"
            )}
          >
            <div className="relative z-10">
              <span className={cn("text-[10px] font-black uppercase tracking-widest block mb-1", !activeMarketName ? "text-indigo-600" : "text-slate-400")}>Chế độ</span>
              <span className={cn("font-black text-sm", !activeMarketName ? "text-slate-900" : "text-slate-600")}>DỮ LIỆU CỤM</span>
            </div>
            {!activeMarketName && <div className="absolute top-0 right-0 p-2 text-indigo-600"><Link size={16} /></div>}
          </button>

          {clusterMarkets.map((m) => (
            <button
              key={m.name}
              onClick={() => {
                setActiveMarketName(m.name);
                const saved = marketDataMap[m.name];
                if (saved) {
                  setMarketInput(saved.market);
                  setStaffInput(saved.staff);
                  setCategoryInput(saved.cat);
                  setStaffCategoryInput(saved.staffCat || '');
                } else {
                  setMarketInput('');
                  setStaffInput('');
                  setCategoryInput('');
                  setStaffCategoryInput('');
                }
              }}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all text-left group relative overflow-hidden",
                activeMarketName === m.name 
                  ? "border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100" 
                  : "border-slate-100 bg-slate-50 hover:border-slate-200"
              )}
            >
              <div className="relative z-10">
                <span className={cn("text-[10px] font-black uppercase tracking-widest block mb-1", activeMarketName === m.name ? "text-indigo-600" : "text-slate-400")}>Siêu thị</span>
                <span className={cn("font-black text-sm truncate block", activeMarketName === m.name ? "text-slate-900" : "text-slate-600")}>
                  {m.name.replace(/^ĐML\s*-\s*/i, '')}
                </span>
              </div>
              {activeMarketName === m.name && <div className="absolute top-0 right-0 p-2 text-indigo-600"><Link size={16} /></div>}
              {marketDataMap[m.name] && activeMarketName !== m.name && (
                <div className="absolute top-0 right-0 p-2 text-emerald-500"><Link size={16} /></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Input Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cluster Report */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <Store size={18} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">1. Báo Cáo Cụm (Copy từ Excel)</h3>
          </div>
          <textarea
            value={clusterReportInput}
            onChange={(e) => setClusterReportInput(e.target.value)}
            placeholder="Dán dữ liệu báo cáo cụm tại đây..."
            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Cluster Competition */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <Store size={18} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">2. Thi Đua Cụm (Nếu có)</h3>
          </div>
          <textarea
            value={clusterCompetitionInput}
            onChange={(e) => setClusterCompetitionInput(e.target.value)}
            placeholder="Dán dữ liệu thi đua cụm tại đây..."
            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Market Data */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Store size={18} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">3. Dữ liệu Siêu Thị (Realtime)</h3>
          </div>
          <textarea
            value={marketInput}
            onChange={(e) => setMarketInput(e.target.value)}
            placeholder="Dán dữ liệu siêu thị tại đây..."
            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Category Data */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Store size={18} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">4. Tiến độ Ngành Hàng</h3>
          </div>
          <textarea
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            placeholder="Dán dữ liệu ngành hàng tại đây..."
            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Staff Data */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
              <Store size={18} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">5. Dữ liệu Nhân Viên</h3>
          </div>
          <textarea
            value={staffInput}
            onChange={(e) => setStaffInput(e.target.value)}
            placeholder="Dán dữ liệu nhân viên tại đây..."
            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Staff Category Data */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <Store size={18} />
            </div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">6. Ma Trận Nhân Viên - Ngành Hàng</h3>
          </div>
          <textarea
            value={staffCategoryInput}
            onChange={(e) => setStaffCategoryInput(e.target.value)}
            placeholder="Dán dữ liệu ma trận tại đây..."
            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
