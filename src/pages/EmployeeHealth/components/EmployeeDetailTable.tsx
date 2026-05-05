import React from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingDown, Check, TrendingUp } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { parseCategoryData } from '../../RTST/utils';
import { cn } from '../../RTST/utils';
import { CategoryData, StaffMatrixData } from '../../RTST/types';

interface EmployeeDetailTableProps {
  staffName: string;
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  categoryTargets: any[]; // Add this
}

const parseStaffMatrixDataRefined = (input: string, staffCount: number, categoryTargets: any[], daysPassed: number, totalDays: number): { results: StaffMatrixData[], categories: string[] } => {
  const raw = input.trim();
  if (!raw) return { results: [], categories: [] };
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Find categories: lines between "Phòng ban" and the first line starting with "DTLK" or "SLLK"
  let allCategories: string[] = [];
  let headerStartIdx = -1;
  let dataStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'Phòng ban') {
      headerStartIdx = i;
      continue;
    }
    if (headerStartIdx !== -1 && (lines[i].startsWith('DTLK') || lines[i].startsWith('SLLK'))) {
      dataStartIdx = i + 1;
      break;
    }
    if (headerStartIdx !== -1) {
      allCategories.push(lines[i]);
    }
  }

  const categories = allCategories;

  const results: StaffMatrixData[] = [];
  const excludedKeywords = ['Tổng', 'BP All In One', 'BP Trưởng Ca', 'Hỗ trợ BI', 'Copyright', 'Dashboard', 'BC ', 'HD sử dụng', 'Trang chủ', 'Báo cáo', 'Khối kinh doanh', 'Logo BI', 'avatar'];
  const dataLines = lines.slice(dataStartIdx);

  const targetPerStaffPerCat: Record<string, number> = {};
  categoryTargets.forEach(cat => { targetPerStaffPerCat[cat.name] = cat.adjustedTarget / staffCount; });

  for (const line of dataLines) {
    // Use a regex that splits by tab or 2+ spaces to handle different delimiter types
    const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    const namePart = parts[0];
    
    if (!namePart) continue;
    if (excludedKeywords.some(ex => namePart.includes(ex))) continue;

    const nameIdParts = namePart.split(' - ').map(s => s.trim());
    if (nameIdParts.length < 2) continue;
    
    const name = nameIdParts[0];
    const id = nameIdParts[1];
    
    // Dynamically detect the start of data columns
    let dataStartIndex = 1;
    if (parts.length > 1 && isNaN(parseFloat(parts[1].replace(/,/g, '')))) {
        dataStartIndex = 2;
    }
    
    const rawValues = parts.slice(dataStartIndex).map(v => {
      const clean = v.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    });

    // Use all values
    const values = rawValues;

    let achieved = 0;
    const projectedRates: number[] = [];

    categories.forEach((catName, catIdx) => {
      const target = targetPerStaffPerCat[catName] || 0;
      let projectedRate = 0;
      
      if (target > 0 && daysPassed > 0) {
        projectedRate = (((values[catIdx] || 0) / daysPassed) * totalDays) / target * 100;
      }
      
      projectedRates.push(projectedRate);
      if (Math.round(projectedRate) >= 100) achieved++;
    });

    results.push({
      displayName: `${id} - ${name.toUpperCase()}`,
      fullId: id,
      achieved,
      totalCats: categories.length,
      rate: categories.length > 0 ? achieved / categories.length : 0,
      rawValues: values,
      projectedRates
    });
  }
  return { results, categories: categories };
};

const EmployeeDetailTable: React.FC<EmployeeDetailTableProps> = ({
  staffName,
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  categoryTargets
}) => {
  // Parse staff matrix from "2. THI ĐUA NV" using ordered categories for correct mapping
  const { results: staffMatrix, categories: detailCategories } = parseStaffMatrixDataRefined(thiDuaNv, staffCount, categoryTargets, daysPassed, totalDays);
  
  // Extract staff ID from staffName (format: "NAME - ID")
  const staffId = staffName.split('-').pop()?.trim() || '';
  const staffData = staffMatrix.find(s => s.fullId === staffId);

  if (!staffData || detailCategories.length === 0) {
    return (
      <div className="bg-white p-4 border border-slate-300 shadow-xl rounded-2xl">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-300 pb-2">
          CHI TIẾT NHÂN VIÊN: {staffName}
        </h2>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-center py-8">
          Chưa có dữ liệu chi tiết cho nhân viên này
        </p>
      </div>
    );
  }

  // Prepare row data for display and sort by percentHT descending
  const rowData = detailCategories.map((catName, index) => {
    const targetObj = categoryTargets.find(t => t.name === catName);
    const target = targetObj ? targetObj.adjustedTarget / staffCount : 0;
    // CỘT DỮ LIỆU TÍNH TỪ CỘT SỐ 1 (index)
    const accumulated = staffData.rawValues[index] || 0;
    const percentHT = (target > 0 && daysPassed > 0) 
      ? (((accumulated / daysPassed) * totalDays) / target) * 100 
      : 0;
    const remainingVal = accumulated - target; // User's formula: LUỸ KẾ - TARGET
    
    return {
      name: catName,
      target,
      accumulated,
      percentHT,
      remainingVal
    };
  }).sort((a, b) => b.percentHT - a.percentHT);

  // Calculate reached count for header
  const reachedCount = rowData.filter(row => row.percentHT >= 100).length;
  const totalCategories = rowData.length;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  return (
    <div id={`employee-detail-${staffName}`} className="bg-white border-[15px] border-white shadow-xl overflow-visible ring-1 ring-slate-300">
      {/* Top Header matching RevenueRankingTableQd */}
      <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
        <div className="p-4 flex flex-col items-center justify-center">
          <h2 className="text-xl font-utm-avo font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center whitespace-nowrap">CHI TIẾT NHÂN VIÊN</h2>
          <div className="flex items-center gap-2 text-slate-600">
            <button 
              onClick={() => {
                const element = document.getElementById(`employee-detail-${staffName}`);
                if (element) {
                  htmlToImage.toPng(element, { 
                    backgroundColor: '#ffffff', 
                    pixelRatio: 2,
                    style: {
                      fontSize: '9px',
                      padding: '4px'
                    }
                  })
                    .then(dataUrl => {
                      const link = document.createElement('a');
                      link.download = `ChiTietNV_${staffName.replace(/\s+/g, '_')}.png`;
                      link.href = dataUrl;
                      link.click();
                    });
                }
              }}
              className="hover:bg-slate-100 p-1 rounded-full transition-colors"
            >
              <Camera size={14} className="text-indigo-600" />
            </button>
            <span className="text-[10px] font-utm-avo font-black uppercase tracking-widest">{staffName}</span>
          </div>
        </div>
        <div className="p-4 flex flex-col items-center justify-center">
          <h2 className="text-xl font-utm-avo font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN</h2>
          <div className="flex items-center gap-2 text-slate-600">
            {totalCategories > 0 && (reachedCount / totalCategories) > 0.5 ? (
              <TrendingUp size={14} className="text-emerald-500" />
            ) : (
              <TrendingDown size={14} className="text-rose-500" />
            )}
            <span className="text-[10px] font-utm-avo font-black uppercase tracking-widest">
              ĐẠT : {reachedCount}/{totalCategories} || TỶ LỆ : {totalCategories > 0 ? ((reachedCount / totalCategories) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-visible">
        <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300">
          <thead>
            <tr className="text-slate-900 h-[40px]">
              <th className="px-2 py-0 text-[13px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#10b981]">STT</th>
              <th className="px-2 py-0 text-[13px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#10b981]">NGÀNH HÀNG</th>
              <th className="px-2 py-0 text-[13px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#10b981]">TARGET</th>
              <th className="px-2 py-0 text-[13px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#facc15]">LUỸ KẾ</th>
              <th className="px-2 py-0 text-[13px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#facc15]">% HT</th>
              <th className="px-2 py-0 text-[13px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#f97316]">CÒN LẠI</th>
            </tr>
          </thead>
          <tbody>
            {rowData.map((row, index) => {
              return (
                <motion.tr 
                  key={row.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 transition-colors h-[40px]"
                >
                  <td className="px-2 py-0 text-[13px] font-utm-avo font-bold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">
                    {index + 1}
                  </td>
                  <td className={cn(
                    "px-2 py-0 text-[13px] font-utm-avo font-bold uppercase border-r border-b border-slate-300",
                    row.percentHT >= 100 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {row.name}
                  </td>
                  <td className="px-2 py-0 text-[13px] font-utm-avo font-bold text-center border-r border-b border-slate-300 text-slate-800">
                    {row.target.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                  </td>
                  <td className="px-2 py-0 text-[13px] font-utm-avo font-bold text-center border-r border-b border-slate-300 text-emerald-700">
                    {row.accumulated.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                  <td className={cn(
                    "px-2 py-0 text-[13px] font-utm-avo font-bold text-center border-r border-b border-slate-300",
                    row.percentHT >= 100 ? "text-emerald-600" : row.percentHT >= 50 ? "text-amber-600" : "text-rose-600"
                  )}>
                    {row.percentHT.toFixed(0)}%
                  </td>
                  <td className={cn(
                    "px-2 py-0 text-[13px] font-utm-avo font-bold text-center border-r border-b border-slate-300 flex items-center justify-center h-[40px]",
                    row.remainingVal > 0 ? "text-emerald-600" : "text-rose-600 font-black"
                  )}>
                    {row.remainingVal > 0 ? (
                      <Check size={14} strokeWidth={4} />
                    ) : (
                      Math.abs(row.remainingVal).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeDetailTable;
