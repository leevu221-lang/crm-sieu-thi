import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { parseCategoryData } from '../../RTST/utils';
import { StaffMatrixData } from '../../RTST/types';
import { cn } from '../../RTST/utils';
import { Download, Copy, Check, MessageSquare } from 'lucide-react';
import { toPng } from 'html-to-image';

// Reusing parsing logic to avoid affecting EmployeeDetailTable
const parseStaffMatrixDataRefined = (input: string, staffCount: number, categoryTargets: any[], daysPassed: number, totalDays: number): { staffMatrix: StaffMatrixData[], categories: string[] } => {
  const raw = input.trim();
  if (!raw) return { staffMatrix: [], categories: [] };
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

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

  // Use all categories without filtering
  const categories = allCategories;

  const results: StaffMatrixData[] = [];
  const excludedKeywords = ['Tổng', 'BP All In One', 'BP Trưởng Ca', 'Hỗ trợ BI', 'Copyright', 'Dashboard', 'BC ', 'HD sử dụng', 'Trang chủ', 'Báo cáo', 'Khối kinh doanh', 'Logo BI', 'avatar'];
  const dataLines = lines.slice(dataStartIdx);

  for (const line of dataLines) {
    const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    const namePart = parts[0];
    
    if (!namePart) continue;
    if (excludedKeywords.some(ex => namePart.includes(ex))) continue;

    const nameIdParts = namePart.split(' - ').map(s => s.trim());
    if (nameIdParts.length < 2) continue;
    
    const name = nameIdParts[0];
    const id = nameIdParts[1];
    
    // Extract short name (last word)
    const nameParts = name.trim().split(' ');
    const shortName = nameParts[nameParts.length - 1].toUpperCase();
    
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

    const projectedRates: number[] = [];
    const actualPercentHTs: number[] = [];
    let achievedCount = 0; // Track categories >= 100% (based on projected)

    categories.forEach((catName, catIdx) => {
      const targetObj = categoryTargets.find(t => t.name === catName);
      const target = targetObj ? targetObj.adjustedTarget / staffCount : 0;
      const accumulated = values[catIdx] || 0;
      
      // Actual
      let actualRate = target > 0 ? (accumulated / target) * 100 : 0;
      actualPercentHTs.push(actualRate);
      
      // Projected
      let projectedRate = 0;
      if (target > 0 && daysPassed > 0) {
        projectedRate = (((accumulated) / daysPassed) * totalDays) / target * 100;
      }
      projectedRates.push(projectedRate);
      
      // Count if projected rate >= 100% (visual count)
      if (Math.round(projectedRate) >= 100) achievedCount++;
    });

    results.push({
      displayName: `${id} - ${name.toUpperCase()}`,
      fullId: id,
      shortName: `${id} - ${shortName}`,
      achieved: achievedCount,
      totalCats: categories.length,
      rate: categories.length > 0 ? achievedCount / categories.length : 0, 
      rawValues: values,
      projectedRates,
      actualPercentHTs
    });
  }
  return { staffMatrix: results, categories };
};

interface SummaryThiDuaTableProps {
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  selectedStaffIds?: string[];
  categoryTargets: any[]; // Accept categoryTargets
}

const SummaryThiDuaTable: React.FC<SummaryThiDuaTableProps> = ({
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  selectedStaffIds,
  categoryTargets // Accept categoryTargets
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  
  // Use passed categoryTargets for staffMatrix calculation
  const { staffMatrix, categories } = parseStaffMatrixDataRefined(thiDuaNv, staffCount, categoryTargets, daysPassed, totalDays);
  const sortedStaffMatrix = staffMatrix.sort((a, b) => b.rate - a.rate);
  
  const filteredStaffMatrix = selectedStaffIds && selectedStaffIds.length > 0 
    ? sortedStaffMatrix.filter(s => selectedStaffIds.includes(s.fullId))
    : sortedStaffMatrix;

  const handleCopyStaff = (staff: StaffMatrixData) => {
    let text = `📊 BÁO CÁO THI ĐUA: ${staff.shortName}\n`;
    text += `✅ ĐẠT: ${staff.achieved}/${staff.totalCats} chỉ tiêu\n`;
    text += `📈 TỶ LỆ: ${(staff.rate * 100).toFixed(1)}%\n\n`;
    text += `CHI TIẾT % DỰ KIẾN:\n`;

    categories.forEach((catName, idx) => {
      const rate = staff.projectedRates[idx];
      const roundedRate = Math.round(rate);
      text += `- ${catName}: ${roundedRate}% ${roundedRate >= 100 ? '✅' : '⚠️'}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(staff.fullId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCopyAll = () => {
    if (filteredStaffMatrix.length === 0) return;
    setIsCopyingAll(true);

    const total = filteredStaffMatrix.length;
    const count20 = Math.max(1, Math.round(total * 0.2));
    
    const top20 = filteredStaffMatrix.slice(0, count20);
    // Get bottom 20%, but ensure we don't overlap if total is small
    const bottom20 = filteredStaffMatrix.slice(Math.max(count20, total - count20));

    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    let text = `🌟 TỔNG HỢP THI ĐUA SIÊU THỊ (${dateStr}):\n\n`;
    
    filteredStaffMatrix.forEach((staff, sIdx) => {
      const ratePercent = (staff.rate * 100).toFixed(0);
      text += `${sIdx + 1}. ${staff.shortName} (${ratePercent}%)\n`;
    });

    text += `\n🏆 TOP 20% DẪN ĐẦU:\n`;
    top20.forEach(s => text += `- ${s.shortName} (${(s.rate * 100).toFixed(0)}%)\n`);

    text += `\n⚠️ BOTTOM 20% CẦN CỐ GẮNG:\n`;
    bottom20.forEach(s => text += `- ${s.shortName} (${(s.rate * 100).toFixed(0)}%)\n`);

    text += `\nChúc các bạn bứt phá mạnh mẽ trong các ngày còn lại! 💪`;

    navigator.clipboard.writeText(text).then(() => {
      setTimeout(() => setIsCopyingAll(false), 2000);
    });
  };

  const handleExport = async () => {
    if (tableRef.current) {
      const originalElement = tableRef.current;
      
      // Create a temporary container to hold the clone
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '2000px'; // Ensure enough width for the capture
      container.style.height = '0';
      container.style.overflow = 'hidden';
      container.style.zIndex = '-1';
      container.style.pointerEvents = 'none';
      
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // Hide the buttons in the clone
      const buttonsToHide = clone.querySelectorAll('button');
      buttonsToHide.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });
      
      // Maintain the original layout styles
      clone.style.width = 'max-content'; // Allow it to take its natural fixed width
      clone.style.height = 'auto';
      clone.style.margin = '0';
      clone.style.padding = '32px 60px 32px 32px'; // Add extra padding on the right (60px)
      clone.style.backgroundColor = '#ffffff';
      clone.style.display = 'inline-block';
      
      // Ensure all nested scroll containers in the clone are expanded but maintain layout
      const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto');
      scrollContainers.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.width = 'auto';
        htmlEl.style.height = 'auto';
      });
      
      const table = clone.querySelector('table') as HTMLTableElement;
      if (table) {
        // DO NOT change tableLayout to 'auto', keep it as 'fixed' if it was fixed
        // This ensures the columns don't stretch
        table.style.minWidth = 'unset'; 
        table.style.width = originalElement.querySelector('table')?.offsetWidth + 'px';
      }

      container.appendChild(clone);
      document.body.appendChild(container);

      try {
        // Wait for styles and fonts to settle
        await new Promise(resolve => setTimeout(resolve, 300));

        const dataUrl = await toPng(clone, { 
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            width: clone.offsetWidth,
            height: clone.offsetHeight,
            cacheBust: true,
        });
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `TongHopThiDua_${new Date().getTime()}.png`;
        link.click();
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        document.body.removeChild(container);
      }
    }
  };

  return (
    <div ref={tableRef} className="card-thi-dua bg-white rounded-[16px] shadow-sm p-4 md:p-6 border border-slate-200">
      {/* Header */}
      <div className="flex flex-row items-center justify-between w-full border-b border-slate-300 pb-4 mb-4">
        <div className="flex flex-row items-center justify-between w-full border border-slate-300 rounded-xl py-4 bg-slate-50/30">
          <div className="flex flex-col items-center justify-center w-1/2 border-r border-slate-300">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">TỔNG HỢP THI ĐUA</h2>
            <div className="flex items-center gap-2 text-slate-600 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M3 7h18"/></svg>
              <span className="text-sm font-bold">LUỸ KẾ ĐẾN NGÀY : 24-03-2026</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center w-1/2">
            <h2 className="text-2xl font-black text-rose-600 uppercase tracking-tight">DỰ KIẾN</h2>
            <div className="flex items-center gap-2 text-slate-600 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              <span className="text-sm font-bold">TGSD: 24/31</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button 
            onClick={handleCopyAll}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase transition-all",
              isCopyingAll ? "bg-emerald-100 text-emerald-600 border border-emerald-200" : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {isCopyingAll ? <Check size={16} /> : <MessageSquare size={16} />}
            {isCopyingAll ? "ĐÃ COPY" : "COPY BÁO CÁO"}
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold uppercase hover:bg-indigo-700 transition-colors"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="text-slate-900 border-b border-slate-300 h-[70px]">
              <th className="px-2 py-2 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#10b981] w-12">STT</th>
              <th className="px-4 py-2 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#10b981] w-[250px]">NHÂN VIÊN</th>
              <th className="px-1 py-1 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#10b981] w-[60px]">ĐẠT</th>
              <th className="px-1 py-1 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#10b981] w-[60px]">TỶ LỆ</th>
              {categories.map(catName => (
                <React.Fragment key={catName}>
                  <th className="px-1 py-1 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#facc15] w-[60px] whitespace-normal break-words">{catName}</th>
                  {catName === 'MÁY LẠNH ĐẶC QUYỀN' && (
                    <th className="bg-white w-[30pt] border-r border-slate-300"></th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {filteredStaffMatrix.map((staff, index) => (
              <tr key={staff.fullId} className={cn("hover:bg-slate-50 transition-colors h-[30px]", staff.displayName.includes('30016') ? 'border-b border-slate-300' : '')}>
                <td className="px-2 py-0 text-center border-r border-slate-300 bg-[#d1fae5] font-black text-xs truncate">
                  {index + 1}
                </td>
                <td className="px-4 py-0 border-r border-slate-300 text-xs font-black uppercase tracking-tight text-slate-700 truncate">
                  <div className="flex items-center justify-between group">
                    <span>{staff.displayName}</span>
                    <button 
                      onClick={() => handleCopyStaff(staff)}
                      className={cn(
                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                        copiedId === staff.fullId ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 hover:text-indigo-600"
                      )}
                    >
                      {copiedId === staff.fullId ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </td>
                <td className="px-1 py-0 text-xs font-black text-center border-r border-slate-300 bg-[#ecfdf5]">
                  {staff.achieved}/{staff.totalCats}
                </td>
                <td className={cn(
                  "px-1 py-0 text-xs font-black text-center border-r border-slate-300 bg-[#ecfdf5]",
                  staff.rate < 0.5 ? "text-rose-600" : "text-slate-900"
                )}>
                  {(staff.rate * 100).toFixed(1)}%
                </td>
                {categories.map((catName, idx) => {
                  const target = categoryTargets.find(t => t.name === catName);
                  const targetPerStaff = target && staffCount > 0 ? (target.adjustedTarget / staffCount) : 0;
                  const accumulated = staff.rawValues[idx] || 0;
                  const projectedRate = targetPerStaff > 0 && daysPassed > 0 
                      ? (((accumulated) / daysPassed) * totalDays) / targetPerStaff * 100
                      : 0;
                  const roundedRate = Math.round(projectedRate);
                  return (
                    <React.Fragment key={idx}>
                      <td className={cn(
                          "px-1 py-0 text-xs font-black text-center border-r border-slate-300 truncate",
                          roundedRate >= 100 ? "text-emerald-600" : "text-rose-600"
                      )}>
                          {roundedRate}%
                      </td>
                      {catName === 'MÁY LẠNH ĐẶC QUYỀN' && (
                        <td className="bg-white border-r border-slate-300"></td>
                      )}
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SummaryThiDuaTable;
