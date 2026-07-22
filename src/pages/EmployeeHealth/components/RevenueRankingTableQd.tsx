import React from 'react';
import { Trophy, TrendingDown, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { StaffData } from '../../RTST/types';
import { cn } from '../../RTST/utils';

interface RevenueRankingTableQdQProps {
  data: StaffData[];
  onCapture: () => void;
  stTargetQuyDoi?: number;
  daysPassed?: number;
  totalDays?: number;
  selectedStaffId?: string | null;
  onSelectStaff?: (id: string) => void;
  stPercentHTTargetDuKienQD?: number;
}

const RevenueRankingTableQd: React.FC<RevenueRankingTableQdQProps> = ({ 
  data, 
  onCapture, 
  stTargetQuyDoi = 0,
  daysPassed = 1,
  totalDays = 30,
  selectedStaffId = null,
  onSelectStaff,
  stPercentHTTargetDuKienQD = 0
}) => {
  // Sort by actualVal (Doanh thu QĐ) descending
  const sortedData = [...data].sort((a, b) => (b.actualVal || 0) - (a.actualVal || 0));

  const formatName = (name: string) => {
    if (!name) return '';
    const parts = name.split(' - ');
    if (parts.length > 1) {
      return parts[1].replace(/[-_]+$/, '').trim();
    }
    return name.replace(/[-_]+$/, '').trim();
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  const totalActual = sortedData.reduce((sum, staff) => sum + (staff.actualVal || 0), 0);
  const totalVirtual = sortedData.reduce((sum, staff) => sum + staff.virtualVal, 0);
  const totalEffQd = totalActual > 0 ? ((totalVirtual - totalActual) / totalActual) * 100 * 100 : 0;
  // Lấy đúng giá trị từ cấu hình màn hình BC THÁNG -> THẺ TARGET QUY ĐỔI và chia cho số nhân viên
  const targetQdPerStaff = sortedData.length > 0 ? stTargetQuyDoi / sortedData.length : 0;
  const totalTargetQd = stTargetQuyDoi;
  const actualTotalTargetQd = totalTargetQd > 1000000 ? totalTargetQd : totalTargetQd * 1000000;
  const actualTotalActual = Math.abs(totalActual) > 1000000 ? totalActual : totalActual * 1000000;
  const totalPercentHT = (actualTotalTargetQd > 0 && daysPassed > 0) ? (((actualTotalActual / daysPassed) * totalDays) / actualTotalTargetQd) * 100 : 0;

  return (
    <div className="space-y-4" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      <div className="bg-white p-2 md:p-4">
        <div className="bg-white border border-slate-300 shadow-xl overflow-hidden rounded-[8px]">
          {/* Top Header */}
          <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
            <div className="p-6 flex flex-col items-center justify-center relative">
              <h2 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight mb-2">BẢNG XẾP HẠNG DOANH THU</h2>
              <div className="w-48 h-[1px] bg-slate-300 mb-2"></div>
              <div className="flex items-center gap-2 py-1 px-4">
                <Camera size={14} className="text-indigo-600" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LUỸ KẾ ĐẾN NGÀY : {yesterdayDate}</span>
              </div>
            </div>
            <div className="p-6 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-black text-[#e11d48] uppercase tracking-tight mb-2">DỰ KIẾN</h2>
              <div className="w-48 h-[1px] bg-slate-300 mb-2"></div>
              <div className="flex items-center gap-2 py-1 px-4">
                <TrendingDown size={14} className="text-orange-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TGSD: {daysPassed}/{totalDays}</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full border-collapse table-fixed">
              <thead>
                 <tr className="text-slate-900 font-sans font-black text-[14px] uppercase tracking-tight h-[60px]">
                  <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, width: '5%' }} className="bg-[#00965e] px-2 py-0 text-center text-white border-r border-white/10 h-[60px] font-sans font-black">STT</th>
                  <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="bg-[#00965e] px-2 py-0 text-center text-white border-r border-white/10 whitespace-normal break-words leading-tight font-sans font-black">NHÂN VIÊN</th>
                  <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, width: '13%' }} className="bg-[#00965e] px-2 py-0 text-center text-white border-r border-white/10 whitespace-normal break-words leading-tight font-sans font-black">TARGET QĐ</th>
                  <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, width: '15%' }} className="bg-[#ffcb05] px-2 py-0 text-center border-r border-white/10 whitespace-normal break-words leading-tight font-sans font-black">DOANH THU QUY ĐỔI</th>
                  <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, width: '10%' }} className="bg-[#ffcb05] px-2 py-0 text-center border-r border-white/10 whitespace-normal break-words leading-tight font-sans font-black">% HT</th>
                  <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, width: '13%' }} className="bg-[#ffcb05] px-2 py-0 text-center border-r border-white/10 whitespace-normal break-words leading-tight font-sans font-black">HIỆU QUẢ QĐ</th>
                  <th style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, width: '10%' }} className="bg-[#f58220] px-2 py-0 text-center whitespace-normal break-words leading-tight font-sans font-black">TOP/BOT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedData.length > 0 ? (
                  sortedData.map((staff, index) => {
                    // Uses targetQdPerStaff from outer scope
                    const effQd = (staff.effVal !== 0 
                      ? staff.effVal 
                      : ((staff.actualVal || 0) > 0 
                        ? ((staff.virtualVal - (staff.actualVal || 0)) / (staff.actualVal || 0)) * 100 
                        : 0)) * 100;
                    const actualTargetQdPerStaff = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
                    const actualActualVal = Math.abs(staff.actualVal || 0) > 1000000 ? (staff.actualVal || 0) : (staff.actualVal || 0) * 1000000;
                    
                    const percentHT = (actualTargetQdPerStaff > 0 && daysPassed > 0) 
                      ? (((actualActualVal / daysPassed) * totalDays) / actualTargetQdPerStaff) * 100 
                      : 0;
                    
                    const topCount = Math.max(1, Math.round(sortedData.length * 0.2));
                    const isTop = index < topCount;
                    const isBottom = index >= sortedData.length - topCount;
                    const isStriped = index % 2 === 1;

                    return (
                      <tr 
                        key={staff.fullId}
                        onClick={() => onSelectStaff && onSelectStaff(staff.fullId)}
                        className={cn(
                          "transition-colors h-[40px] cursor-pointer",
                          selectedStaffId === staff.fullId ? "bg-indigo-50" : (isStriped ? "bg-[#f8faff]" : "bg-white"),
                          "hover:bg-slate-50"
                        )}
                      >
                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-2 py-0 text-center border-r border-slate-200 bg-[#fef08a] font-sans font-black text-[13px]">
                          {index + 1}
                        </td>
                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-0 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-blue-600 font-black flex-shrink-0">›</span>
                            <span className={cn(
                              "text-[13px] font-sans font-black uppercase tracking-tight truncate",
                              isTop ? "text-blue-600" : isBottom ? "text-rose-600" : "text-slate-700"
                            )}>
                              {formatName(staff.displayName)} - {staff.fullId}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-2 py-0 text-center border-r border-slate-200 font-sans font-black text-[14px] text-slate-800">
                          {targetQdPerStaff > 1000000 
                            ? Math.floor(targetQdPerStaff / 1000000).toLocaleString('vi-VN')
                            : Math.round(targetQdPerStaff).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-2 py-0 text-center border-r border-slate-200 font-sans font-black text-[14px] text-slate-800">
                          {staff.actualVal !== null ? (Math.abs(staff.actualVal) > 1000000 ? Math.floor(staff.actualVal / 1000000).toLocaleString('vi-VN') : Math.round(staff.actualVal).toLocaleString('vi-VN')) : ''}
                        </td>
                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                          "px-2 py-0 text-center border-r border-slate-200 font-sans font-black text-[14px]",
                          percentHT < 100 ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {percentHT.toFixed(1)}%
                        </td>
                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                          "px-2 py-0 text-center border-r border-slate-200 font-sans font-black text-[14px]",
                          effQd < stPercentHTTargetDuKienQD ? "text-rose-600" : "text-[#059669]"
                        )}>
                          {effQd.toFixed(1)}%
                        </td>
                        <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-2 py-0 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isTop ? (
                              <div className="flex items-center gap-1 text-[#2563eb]">
                                <Trophy size={14} className="flex-shrink-0" />
                                <span className="text-[12px] font-black" style={{ fontWeight: 900 }}>TOP</span>
                              </div>
                            ) : isBottom ? (
                              <div className="flex items-center gap-1 text-[#e11d48]">
                                <TrendingDown size={14} className="flex-shrink-0" />
                                <span className="text-[12px] font-black" style={{ fontWeight: 900 }}>BOT</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-sans">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center h-[100px]">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Chưa có dữ liệu xếp hạng doanh thu
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
              {sortedData.length > 0 && (
                <tfoot className="bg-[#f8faff] border-t-2 border-slate-300">
                  <tr className="h-[40px]">
                    <td colSpan={2} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-4 py-0 text-center border-r border-slate-200 font-sans font-black text-[13px] text-slate-800 uppercase tracking-widest">
                      TỔNG
                    </td>
                    <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-2 py-0 text-center border-r border-slate-200 font-sans font-black text-[14px] text-slate-800">
                      {totalTargetQd > 1000000 
                        ? Math.floor(totalTargetQd / 1000000).toLocaleString('vi-VN')
                        : Math.round(totalTargetQd).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-2 py-0 text-center border-r border-slate-200 font-sans font-black text-[14px] text-slate-800">
                      {Math.abs(totalActual) > 1000000 ? Math.floor(totalActual / 1000000).toLocaleString('vi-VN') : Math.round(totalActual).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                      "px-2 py-0 text-center border-r border-slate-200 font-sans font-black text-[14px] text-rose-600",
                    )}>
                      {totalPercentHT.toFixed(1)}%
                    </td>
                    <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                      "px-2 py-0 text-center border-r border-slate-200 font-sans font-black text-[13px]",
                      stPercentHTTargetDuKienQD < 40 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {stPercentHTTargetDuKienQD > 0 ? `${stPercentHTTargetDuKienQD.toFixed(1)}%` : ''}
                    </td>
                    <td className="px-2 py-0 text-center"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RevenueRankingTableQd);
