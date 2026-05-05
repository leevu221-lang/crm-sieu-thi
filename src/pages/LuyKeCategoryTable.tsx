import React, { useState, useMemo } from 'react';
import { Camera, MessageSquare, TrendingUp, Package } from 'lucide-react';
import { CategoryData } from './RTST/types';
import { cn } from './RTST/utils';
import { useNotification } from '../contexts/NotificationContext';

interface LuyKeCategoryTableProps {
  categories: CategoryData[];
  catMarketFilter: string;
  setCatMarketFilter: (val: string) => void;
  catGroupFilter: string;
  setCatGroupFilter: (val: string) => void;
  captureRef: React.RefObject<HTMLDivElement | null>;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, name: string) => void;
  daysPassed?: number;
  totalDays?: number;
}

const LuyKeCategoryTable: React.FC<LuyKeCategoryTableProps> = ({
  categories,
  catMarketFilter,
  captureRef,
  captureElement,
  daysPassed = 0,
  totalDays = 0
}) => {
  const { showNotification } = useNotification();
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const filteredCats = useMemo(() => {
    const marketFiltered = categories.filter(c => catMarketFilter === 'ALL' || c.marketName === catMarketFilter);
    const map = new Map<string, CategoryData>();
    return marketFiltered;
  }, [categories, catMarketFilter, daysPassed, totalDays]);

  const groupByName = (data: CategoryData[]) => {
    const map = new Map<string, CategoryData>();
    data.forEach(c => {
      const name = c.name.trim();
      if (map.has(name)) {
        const existing = map.get(name)!;
        map.set(name, { ...existing, revenue: existing.revenue + c.revenue, target: existing.target + c.target });
      } else {
        map.set(name, { ...c, name });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
        let rateA = 0;
        let rateB = 0;
        if (a.target > 0 && daysPassed > 0) rateA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
        if (b.target > 0 && daysPassed > 0) rateB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
        return rateB - rateA;
    });
  };

  const slCats = groupByName(filteredCats.filter(c => c.type === 'SL'));
  const dtCats = groupByName(filteredCats.filter(c => c.type === 'DT' || c.type === 'ALL'));

  const generateAndCopyComment = () => {
    if (filteredCats.length === 0) return;

    const currentTime = new Date();
    let commentText = `📊 BÁO CÁO NGÀNH HÀNG (LUỸ KẾ)\n⏰ Cập nhật: ${currentTime.toLocaleTimeString('vi-VN')}\n\n`;
    
    // Filter for comment generation too
    const catsToComment = filteredCats.filter(c => catMarketFilter === 'ALL' || c.marketName === catMarketFilter);
    
    catsToComment.forEach(cat => {
      let rate = 0;
      if (cat.target > 0 && daysPassed > 0) {
        rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
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

  const renderTable = (data: CategoryData[], title: string, subtitle: string, icon: React.ReactNode) => {
    const successCount = data.filter(item => {
      let rate = 0;
      if (item.target > 0 && daysPassed > 0 && totalDays > 0) {
        rate = (((item.revenue / daysPassed) * totalDays) / item.target) * 100;
      }
      return Math.floor(rate * 10) / 10 >= 100;
    }).length;
    
    return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100 shadow-sm">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{title}</h3>
            <p className="text-xs font-medium text-slate-500">{subtitle}</p>
          </div>
        </div>
        <p className="text-[14px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shadow-sm">
          {successCount} / {data.length}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-[#059669]">
              <th className="px-4 py-3 text-xs font-black text-white uppercase tracking-widest border-r border-slate-300">NGÀNH HÀNG</th>
              <th className="px-2 py-3 text-xs font-black text-white uppercase tracking-widest text-center border-r border-slate-300">TARGET</th>
              <th className="px-2 py-3 text-xs font-black text-white uppercase tracking-widest text-center border-r border-slate-300">LUỸ KẾ</th>
              <th className="px-2 py-3 text-xs font-black text-white uppercase tracking-widest text-center border-r border-slate-300">%HT DỰ KIẾN</th>
              <th className="px-2 py-3 text-xs font-black text-white uppercase tracking-widest text-center border-slate-300">CÒN LẠI</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              let rate = 0;
              // Công thức theo yêu cầu: ((LUỸ KẾ / SỐ NGÀY ĐÃ QUA) * TỔNG NGÀY) / TARGET * 100
              // Làm tròn xuống
              if (item.target > 0 && daysPassed > 0 && totalDays > 0) {
                rate = (((item.revenue / daysPassed) * totalDays) / item.target) * 100;
              } else {
                rate = 0;
              }
              
              // console.log(`[Recheck] ${item.name}: Target=${displayTarget}, Rev=${displayRevenue}, DaysPassed=${daysPassed}, TotalDays=${totalDays}, Rate=${rate}`);
              
              const remaining = item.revenue - item.target;
              // Precision round to 1 decimal place: Math.floor(rate * 10) / 10
              const roundedRate = Math.floor(rate * 10) / 10;
              const isSuccess = roundedRate >= 100;

              return (
                <tr key={`${item.name}-${idx}`} className="border-b border-slate-300 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-slate-700 uppercase border-r border-slate-300">
                    {item.name}
                  </td>
                  <td className="px-2 py-3 text-xs font-black text-blue-600 text-center border-r border-slate-300">
                    {Math.round(item.target).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-2 py-3 text-xs font-black text-slate-900 text-center border-r border-slate-300">
                    {item.revenue.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                  </td>
                  <td className="px-2 py-3 text-xs font-black text-center border-r border-slate-300">
                    <span className={cn(
                      "px-2 py-1 rounded-md",
                      isSuccess ? "text-[#059669] bg-[#059669]/10" : "text-red-600 bg-red-50"
                    )}>
                      {roundedRate.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </span>
                  </td>
                  <td className={cn(
                    "px-2 py-3 text-xs font-black text-center border-slate-300",
                    remaining < 0 ? "text-red-600" : ""
                  )}>
                    {remaining < 0 ? remaining.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2 no-capture mb-4">
        <button 
          onClick={() => captureElement(captureRef, 'NganhHang_LuyKe')}
          className="flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-amber-200 hover:bg-amber-100 transition-all"
        >
          <Camera size={14} /> CHỤP ẢNH
        </button>
        <button 
          onClick={generateAndCopyComment}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all",
            showComment ? "bg-indigo-600 text-white border-indigo-700" : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
          )}
        >
          <MessageSquare size={14} /> NHẬN XÉT
        </button>
      </div>

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

      <div ref={captureRef} className="flex flex-col lg:flex-row gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
        {renderTable(
          slCats, 
          "NGÀNH HÀNG (SL)", 
          "Lọc theo số lượng luỹ kế", 
          <Package className="text-blue-600" size={24} strokeWidth={2} />
        )}
        {renderTable(
          dtCats, 
          "NGÀNH HÀNG (DT)", 
          "Lọc theo doanh thu luỹ kế", 
          <TrendingUp className="text-[#059669]" size={24} strokeWidth={2} />
        )}
      </div>
    </div>
  );
};

export default LuyKeCategoryTable;
