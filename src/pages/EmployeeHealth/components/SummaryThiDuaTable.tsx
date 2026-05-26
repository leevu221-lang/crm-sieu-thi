import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { parseCategoryData } from '../../RTST/utils';
import { StaffMatrixData, CategoryData } from '../../RTST/types';
import { cn } from '../../RTST/utils';
import { Download, Copy, Check, MessageSquare, ChevronDown, Search } from 'lucide-react';
import { toPng } from 'html-to-image';
import { cleanCategoryName } from './EmployeeDetailTable';

// Reusing parsing logic to avoid affecting EmployeeDetailTable
const parseStaffMatrixDataRefined = (input: string, staffCount: number, categoryTargets: any[], luykeCategories: CategoryData[], daysPassed: number, totalDays: number): { staffMatrix: StaffMatrixData[], categories: string[] } => {
  const raw = input.trim();
  if (!raw) return { staffMatrix: [], categories: [] };
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. Quét tên các ngành hàng có trong dữ liệu dán (thiDuaNv) - dùng để mapping cột
  let inputCategories: string[] = [];
  let headerStartIdx = -1;
  let dataStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'Phòng ban') {
      headerStartIdx = i;
      continue;
    }
    const isEmployeeLine = /[-–—]\s*\d{5,8}\b/.test(lines[i]) || /\b\d{5,8}\s*[-–—]/.test(lines[i]);
    if (headerStartIdx !== -1 && isEmployeeLine) {
      dataStartIdx = i;
      break;
    }
    if (headerStartIdx !== -1) {
      let catName = lines[i].trim();
      
      // Loại bỏ dòng rác (không phải tên ngành hàng)
      const isColumnTypesLine = /^(DTLK|SLLK|SL|DT|Realtime|REALTIME|\s)+$/i.test(catName);
      const isOnlyNumbers = /^[\d\s,.-]+$/.test(catName);
      const lowerCatName = catName.toLowerCase();
      const isExcluded = [
        'tổng', 'tong',
        'bp all in one',
        'bp trưởng ca', 'bp truong ca',
        'hỗ trợ bi', 'ho tro bi',
        'copyright',
        'dashboard',
        'bc ',
        'hd sử dụng', 'hd su dung',
        'trang chủ', 'trang chu',
        'báo cáo', 'bao cao',
        'khối kinh doanh', 'khoi kinh doanh',
        'logo bi',
        'avatar'
      ].some(ex => lowerCatName.includes(ex));

      if (isColumnTypesLine || isOnlyNumbers || isExcluded) {
        continue;
      }

      const targetMatch = catName.match(/(.+?)\bTARGET\b/i);
      if (targetMatch) {
        catName = targetMatch[1].trim();
      }
      inputCategories.push(catName);
    }
  }

  // 2. Xác định danh sách ngành hàng hiển thị (lấy từ luykeCategories - BC Tháng)
  let displayCategories: string[] = [];
  if (luykeCategories && luykeCategories.length > 0) {
    const seen = new Set<string>();
    luykeCategories.forEach(c => {
      const clean = cleanCategoryName(c.name);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        displayCategories.push(c.name);
      }
    });
  } else {
    displayCategories = inputCategories;
  }

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
    
    // Cột 1 là Tên - Mã nhân viên, số liệu ngành hàng bắt đầu ngay từ Cột 2 (index 1).
    const dataStartIndex = 1;
    
    const rawInputValues = parts.slice(dataStartIndex).map(v => {
      const clean = v.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    });

    const values: number[] = [];
    const projectedRates: number[] = [];
    const actualPercentHTs: number[] = [];
    let achievedCount = 0;

    displayCategories.forEach((catName) => {
      const inputIdx = inputCategories.findIndex(ic => cleanCategoryName(ic) === cleanCategoryName(catName));
      const accumulated = inputIdx !== -1 ? (rawInputValues[inputIdx] || 0) : 0;
      values.push(accumulated);

      const lkCat = luykeCategories.length > 0
        ? luykeCategories.find((c: any) => cleanCategoryName(c.name) === cleanCategoryName(catName))
        : null;
      const matchingTarget = categoryTargets.find((t: any) => cleanCategoryName(t.name) === cleanCategoryName(catName));
      const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
        ? matchingTarget.adjustedTarget
        : (lkCat ? lkCat.target : 0);
      const target = baseTarget / staffCount;
      
      // Actual
      let actualRate = target > 0 ? (accumulated / target) * 100 : 0;
      actualPercentHTs.push(actualRate);
      
      // Projected
      let projectedRate = 0;
      if (target > 0 && daysPassed > 0) {
        projectedRate = ((accumulated / daysPassed) * totalDays) / target * 100;
      }
      projectedRates.push(projectedRate);
      
      if (Math.round(projectedRate) >= 100) achievedCount++;
    });

    results.push({
      displayName: `${id} - ${name.toUpperCase()}`,
      fullId: id,
      shortName: `${id} - ${shortName}`,
      achieved: achievedCount,
      totalCats: displayCategories.length,
      rate: displayCategories.length > 0 ? achievedCount / displayCategories.length : 0, 
      rawValues: values,
      projectedRates,
      actualPercentHTs
    });
  }
  return { staffMatrix: results, categories: displayCategories };
};

interface SummaryThiDuaTableProps {
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  selectedStaffIds?: string[];
  categoryTargets: any[];
  luykeCategories?: CategoryData[];
}

const SummaryThiDuaTable: React.FC<SummaryThiDuaTableProps> = ({
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  selectedStaffIds,
  categoryTargets,
  luykeCategories = []
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [catSearchTerm, setCatSearchTerm] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const catInitializedRef = useRef(false);
  
  // Use passed luykeCategories (BC THÁNG displayed data) for staffMatrix calculation
  const { staffMatrix, categories } = parseStaffMatrixDataRefined(thiDuaNv, staffCount, categoryTargets, luykeCategories, daysPassed, totalDays);
  const sortedStaffMatrix = staffMatrix.sort((a, b) => b.rate - a.rate);

  const getTargetPerStaff = (catName: string) => {
    const lkCat = luykeCategories.length > 0
      ? luykeCategories.find((c: any) => cleanCategoryName(c.name) === cleanCategoryName(catName))
      : null;
    const matchingTarget = categoryTargets.find((t: any) => cleanCategoryName(t.name) === cleanCategoryName(catName));
    const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
      ? matchingTarget.adjustedTarget
      : (lkCat ? lkCat.target : 0);
    return staffCount > 0 ? baseTarget / staffCount : 0;
  };
  
  // Initialize visible categories when categories load
  React.useEffect(() => {
    if (categories.length > 0 && !catInitializedRef.current) {
      setVisibleCategories(categories);
      catInitializedRef.current = true;
    }
  }, [categories]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const toggleCategory = (cat: string) => {
    setVisibleCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const filteredCatList = categories.filter(cat =>
    cat.toLowerCase().includes(catSearchTerm.toLowerCase())
  );

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
          {/* Category Filter Dropdown */}
          <div className="relative" ref={catDropdownRef}>
            <button
              onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all min-w-[180px] justify-between shadow-sm"
            >
              <span className="truncate">
                {visibleCategories.length === categories.length
                  ? "Tất cả ngành hàng"
                  : visibleCategories.length === 0
                    ? "Chưa chọn NH"
                    : `${visibleCategories.length}/${categories.length} NH`}
              </span>
              <ChevronDown size={14} className={cn("transition-transform text-slate-400", isCatDropdownOpen && "rotate-180")} />
            </button>

            {isCatDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm ngành hàng..."
                      value={catSearchTerm}
                      onChange={(e) => setCatSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    />
                  </div>
                </div>
                <div className="p-2 border-b border-slate-100 flex items-center justify-between px-4">
                  <button
                    onClick={() => setVisibleCategories([...categories])}
                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => setVisibleCategories([])}
                    className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredCatList.map(cat => (
                    <label
                      key={cat}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        visibleCategories.includes(cat)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-200 group-hover:border-slate-300 bg-white"
                      )}>
                        {visibleCategories.includes(cat) && <Check size={12} className="text-white stroke-[3px]" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={visibleCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-wider transition-colors",
                        visibleCategories.includes(cat) ? "text-indigo-600" : "text-slate-600"
                      )}>
                        {cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

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
            <tr className="text-slate-900 border-b border-slate-300 h-[105px]">
              <th className="px-2 py-2 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#10b981] w-12">STT</th>
              <th className="px-4 py-2 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#10b981] w-[250px]">NHÂN VIÊN</th>
              <th className="px-1 py-1 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#10b981] w-[60px]">ĐẠT</th>
              <th className="px-1 py-1 text-xs font-black uppercase tracking-tight text-center border-r border-slate-300 bg-[#10b981] w-[60px]">TỶ LỆ</th>
              {categories.filter(catName => visibleCategories.includes(catName)).map(catName => (
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
              <tr key={staff.fullId} className={cn("hover:bg-slate-50 transition-colors h-[45px]", staff.displayName.includes('30016') ? 'border-b border-slate-300' : '')}>
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
                  {(() => {
                    const visibleAchieved = categories.reduce((count, catName, idx) => {
                      if (!visibleCategories.includes(catName)) return count;
                      const targetPerStaff = getTargetPerStaff(catName);
                      const accumulated = staff.rawValues[idx] || 0;
                      const projectedRate = targetPerStaff > 0 && daysPassed > 0
                        ? (((accumulated) / daysPassed) * totalDays) / targetPerStaff * 100
                        : 0;
                      return Math.round(projectedRate) >= 100 ? count + 1 : count;
                    }, 0);
                    return `${visibleAchieved}/${visibleCategories.length}`;
                  })()}
                </td>
                <td className={cn(
                  "px-1 py-0 text-xs font-black text-center border-r border-slate-300 bg-[#ecfdf5]",
                  (() => {
                    const visibleAchieved = categories.reduce((count, catName, idx) => {
                      if (!visibleCategories.includes(catName)) return count;
                      const targetPerStaff = getTargetPerStaff(catName);
                      const accumulated = staff.rawValues[idx] || 0;
                      const projectedRate = targetPerStaff > 0 && daysPassed > 0
                        ? (((accumulated) / daysPassed) * totalDays) / targetPerStaff * 100
                        : 0;
                      return Math.round(projectedRate) >= 100 ? count + 1 : count;
                    }, 0);
                    const visibleRate = visibleCategories.length > 0 ? visibleAchieved / visibleCategories.length : 0;
                    return visibleRate < 0.5 ? "text-rose-600" : "text-slate-900";
                  })()
                )}>
                  {(() => {
                    const visibleAchieved = categories.reduce((count, catName, idx) => {
                      if (!visibleCategories.includes(catName)) return count;
                      const targetPerStaff = getTargetPerStaff(catName);
                      const accumulated = staff.rawValues[idx] || 0;
                      const projectedRate = targetPerStaff > 0 && daysPassed > 0
                        ? (((accumulated) / daysPassed) * totalDays) / targetPerStaff * 100
                        : 0;
                      return Math.round(projectedRate) >= 100 ? count + 1 : count;
                    }, 0);
                    const visibleRate = visibleCategories.length > 0 ? visibleAchieved / visibleCategories.length : 0;
                    return `${(visibleRate * 100).toFixed(1)}%`;
                  })()}
                </td>
                {categories.map((catName, idx) => {
                  if (!visibleCategories.includes(catName)) return null;
                  const targetPerStaff = getTargetPerStaff(catName);
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

export default React.memo(SummaryThiDuaTable);
