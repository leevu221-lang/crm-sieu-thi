import React from 'react';
import { StaffMatrixData, CategoryData } from '../../RTST/types';

interface StaffDetailTableProps {
  staffMatrixData: StaffMatrixData[];
  categoryTargets: CategoryData[];
  selectedStaffId: string | null;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
}

const StaffDetailTable: React.FC<StaffDetailTableProps> = ({
  staffMatrixData,
  categoryTargets,
  selectedStaffId,
  staffCount,
  daysPassed,
  totalDays
}) => {
  if (!selectedStaffId) return null;

  const staffData = staffMatrixData.find(s => s.fullId === selectedStaffId);
  if (!staffData) return null;

  return (
    <div className="bg-white p-8 mt-8 border border-slate-300 shadow-xl rounded-2xl">
      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 text-center">
        CHI TIẾT NHÂN VIÊN: {staffData.displayName}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-slate-900 border-b border-slate-300 bg-[#10b981]">
              <th className="px-4 py-2 text-xs font-black uppercase tracking-tight text-left border-r border-slate-300 text-white">NGÀNH HÀNG</th>
              <th className="px-4 py-2 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 text-white">TARGET</th>
              <th className="px-4 py-2 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 text-white">LUỸ KẾ</th>
              <th className="px-4 py-2 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 text-white">%HT</th>
              <th className="px-4 py-2 text-xs font-black uppercase tracking-tight text-center text-white">CÒN LẠI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {categoryTargets.map((cat, index) => {
              const targetPerStaff = staffCount > 0 ? cat.target / staffCount : 0;
              const luyKe = staffData.rawValues[index] || 0;
              const percentHT = (targetPerStaff > 0 && daysPassed > 0) 
                ? (((luyKe / daysPassed) * totalDays) / targetPerStaff) * 100 
                : 0;
              const remaining = targetPerStaff - luyKe;

              const formatVal = (val: number) => {
                const absVal = Math.abs(val);
                if (absVal > 1000000) {
                  return Math.floor(val / 1000000).toLocaleString('vi-VN');
                }
                return Math.round(val).toLocaleString('vi-VN');
              };

              return (
                <tr key={cat.name} className="hover:bg-slate-50 transition-colors h-[30px]">
                  <td className="px-4 py-2 border-r border-slate-300 text-xs font-black uppercase text-slate-700">
                    {cat.name}
                  </td>
                  <td className="px-4 py-2 text-center border-r border-slate-300 font-bold text-xs text-slate-800">
                    {formatVal(targetPerStaff)}
                  </td>
                  <td className="px-4 py-2 text-center border-r border-slate-300 font-bold text-xs text-emerald-700">
                    {formatVal(luyKe)}
                  </td>
                  <td className="px-2 py-1 text-center border-r border-slate-300">
                    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-xs leading-none ${percentHT >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600'}`}>
                      {percentHT.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center font-bold text-xs text-rose-600">
                    {remaining > 0 ? formatVal(remaining) : 0}
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

export default StaffDetailTable;
