import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingDown, TrendingUp, ChevronDown, Check, Search, MessageSquare } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '../../RTST/utils';
import { StaffMatrixData, CategoryData } from '../../RTST/types';

interface CategoryDetailByStaffTableProps {
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  categoryTargets: any[];
  selectedStaffIds?: string[];
  luykeCategories?: CategoryData[];
}

const parseStaffMatrixDataRefined = (input: string, staffCount: number, categoryTargets: any[], luykeCategories: CategoryData[], daysPassed: number, totalDays: number): { results: StaffMatrixData[], categories: string[] } => {
  const raw = input.trim();
  if (!raw) return { results: [], categories: [] };
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

  const targetPerStaffPerCat: Record<string, number> = {};
  if (luykeCategories && luykeCategories.length > 0) {
    luykeCategories.forEach(cat => { targetPerStaffPerCat[cat.name.toUpperCase()] = cat.target / staffCount; });
  } else {
    categoryTargets.forEach(cat => { targetPerStaffPerCat[cat.name.toUpperCase()] = (cat.target || 0) / staffCount; });
  }

  for (const line of dataLines) {
    const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    const namePart = parts[0];

    if (!namePart) continue;
    if (excludedKeywords.some(ex => namePart.includes(ex))) continue;

    const nameIdParts = namePart.split(' - ').map(s => s.trim());
    if (nameIdParts.length < 2) continue;

    const name = nameIdParts[0];
    const id = nameIdParts[1];

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
      const target = targetPerStaffPerCat[catName.toUpperCase()] || 0;
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
  return { results, categories };
};

const CategoryDetailByStaffTable: React.FC<CategoryDetailByStaffTableProps> = ({
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  categoryTargets,
  selectedStaffIds = [],
  luykeCategories = []
}) => {
  const { results: allStaffMatrix, categories } = parseStaffMatrixDataRefined(thiDuaNv, staffCount, categoryTargets, luykeCategories, daysPassed, totalDays);

  // Filter staff matrix based on selectedStaffIds from parent
  const staffMatrix = selectedStaffIds.length > 0
    ? allStaffMatrix.filter(s => selectedStaffIds.includes(s.fullId))
    : allStaffMatrix;

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCapturingAll, setIsCapturingAll] = useState(false);
  const [copiedCat, setCopiedCat] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  React.useEffect(() => {
    if (categories.length > 0 && !initializedRef.current) {
      setSelectedCategories(categories);
      initializedRef.current = true;
    }
  }, [categories]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  if (categories.length === 0) return null;

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleExport = async (catName: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `ChiTietNH_${catName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleExportAll = async () => {
    if (selectedCategories.length === 0) return;
    setIsCapturingAll(true);
    const zip = new JSZip();

    try {
      for (const catName of selectedCategories) {
        const elementId = `cat-detail-${catName.replace(/\s+/g, '-')}`;
        const element = document.getElementById(elementId);
        if (element) {
          const dataUrl = await htmlToImage.toPng(element, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
          });
          const base64Data = dataUrl.split(',')[1];
          zip.file(`ChiTietNH_${catName.replace(/\s+/g, '_')}.png`, base64Data, { base64: true });
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `BaoCao_NganhHang_${new Date().getTime()}.zip`);
    } catch (err) {
      console.error('Export all failed:', err);
    } finally {
      setIsCapturingAll(false);
    }
  };

  const handleCopyFeedback = (catName: string, rowData: any[]) => {
    if (rowData.length === 0) return;

    const totalStaff = rowData.length;
    const count = Math.max(1, Math.round(totalStaff * 0.2));

    const top = rowData.slice(0, count);
    const bot = rowData.slice(-count).reverse();

    const text = `🌟 TOP 20% NHÂN VIÊN XUẤT SẮC:
${top.map((s) => {
      const parts = s.staffName.split(' - ');
      const id = parts[0].trim();
      const name = parts.length > 1 ? parts[1].trim() : '';
      const shortName = name.split(' ').pop() || '';
      return `${id} - ${shortName.toUpperCase()} (${Math.round(s.projectedRate)}%)`;
    }).join('\n')}

⚠️ NHÓM BOTTOM 20% CẦN ĐẨY MẠNH TIẾN ĐỘ:
${bot.map((s) => {
      const parts = s.staffName.split(' - ');
      const id = parts[0].trim();
      const name = parts.length > 1 ? parts[1].trim() : '';
      const shortName = name.split(' ').pop() || '';
      return `${id} - ${shortName.toUpperCase()} (${Math.round(s.projectedRate)}%)`;
    }).join('\n')}

Các bạn nhóm dưới cố gắng bứt phá để hoàn thành mục tiêu ngành hàng nhé! 💪`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedCat(catName);
      setTimeout(() => setCopiedCat(null), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-10">
      {/* Category Selector */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative w-full max-w-md" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
          >
            <span className="truncate">
              {selectedCategories.length === 0
                ? "Chọn ngành hàng chi tiết"
                : selectedCategories.length === categories.length
                  ? "Tất cả ngành hàng"
                  : `Đã chọn ${selectedCategories.length} ngành hàng`}
            </span>
            <ChevronDown size={18} className={cn("transition-transform text-slate-400", isDropdownOpen && "rotate-180")} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm ngành hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-2 border-b border-slate-100 flex items-center justify-between px-4">
                <button
                  onClick={() => setSelectedCategories([...categories])}
                  className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Bỏ chọn tất cả
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto p-2">
                {filteredCategories.map(cat => (
                  <label
                    key={cat}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                      selectedCategories.includes(cat)
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-slate-200 group-hover:border-slate-300 bg-white"
                    )}>
                      {selectedCategories.includes(cat) && <Check size={12} className="text-white stroke-[3px]" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    <span className={cn(
                      "text-[11px] font-black uppercase tracking-wider transition-colors",
                      selectedCategories.includes(cat) ? "text-indigo-600" : "text-slate-600"
                    )}>
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedCategories.length > 0 && (
          <button
            onClick={handleExportAll}
            disabled={isCapturingAll}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95",
              isCapturingAll
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
          >
            <Camera size={16} />
            {isCapturingAll ? "ĐANG XUẤT..." : "XUẤT ALL NGÀNH HÀNG"}
          </button>
        )}
      </div>

      {/* Tables Section */}
      <div className={cn(selectedCategories.length > 0 ? "grid grid-cols-1 md:grid-cols-2 gap-5" : "space-y-5")}>
        {selectedCategories.length > 0 ? (
          selectedCategories.map((catName) => {
            const catIdx = categories.indexOf(catName);
            const lkCat = luykeCategories.length > 0
              ? luykeCategories.find(c => c.name.toUpperCase() === catName.toUpperCase())
              : null;
            const targetPerStaff = lkCat
              ? lkCat.target / staffCount
              : (() => { const t = categoryTargets.find(t => t.name.toUpperCase() === catName.toUpperCase()); return t ? (t.target || 0) / staffCount : 0; })();
            const elementId = `cat-detail-${catName.replace(/\s+/g, '-')}`;

            const rowData = staffMatrix.map(staff => {
              const accumulated = staff.rawValues[catIdx] || 0;
              const projectedRate = staff.projectedRates[catIdx] || 0;

              return {
                staffName: staff.displayName,
                target: targetPerStaff,
                accumulated,
                projectedRate
              };
            }).sort((a, b) => b.projectedRate - a.projectedRate);

            const reachedCount = rowData.filter(row => Math.round(row.projectedRate) >= 100).length;
            const totalStaff = rowData.length;

            return (
              <div key={catName} id={elementId} className="bg-white border-[15px] border-white shadow-xl overflow-hidden ring-1 ring-slate-300">
                {/* Top Header */}
                <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                  <div className="p-4 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center whitespace-nowrap">NGÀNH HÀNG</h2>
                    <div className="flex items-center gap-2 text-slate-600">
                      <button
                        onClick={() => handleExport(catName, elementId)}
                        className="hover:bg-slate-100 p-1 rounded-full transition-colors"
                        title="Xuất ảnh"
                      >
                        <Camera size={14} className="text-indigo-600" />
                      </button>
                      <button
                        onClick={() => handleCopyFeedback(catName, rowData)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border",
                          copiedCat === catName
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"
                        )}
                      >
                        {copiedCat === catName ? <Check size={10} /> : <MessageSquare size={10} />}
                        {copiedCat === catName ? "ĐÃ COPY" : "NHẬN XÉT"}
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{catName}</span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">TIẾN ĐỘ</h2>
                    <div className="flex items-center gap-2 text-slate-600">
                      {totalStaff > 0 && (reachedCount / totalStaff) > 0.5 ? (
                        <TrendingUp size={14} className="text-emerald-500" />
                      ) : (
                        <TrendingDown size={14} className="text-rose-500" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        ĐẠT : {reachedCount}/{totalStaff} || TỶ LỆ : {totalStaff > 0 ? ((reachedCount / totalStaff) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden">
                  <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300">
                    <thead>
                      <tr className="text-slate-900 h-[53px]">
                        <th className="px-1 py-2.5 text-[14px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                        <th className="px-2 py-2.5 text-[14px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#10b981] w-[150px]">NHÂN VIÊN</th>
                        <th className="px-1 py-2.5 text-[14px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#facc15] w-[54px]">TARGET</th>
                        <th className="px-1 py-2.5 text-[14px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#facc15] w-[54px]">LUỸ KẾ</th>
                        <th className="px-1 py-2.5 text-[14px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#facc15] w-[54px]">%HT (DỰ KIẾN)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowData.map((row, index) => {
                        const roundedRate = Math.round(row.projectedRate);
                        return (
                          <tr
                            key={row.staffName}
                            className="hover:bg-slate-50 transition-colors h-[53px]"
                          >
                            <td className="px-1 py-2.5 text-[13px] font-utm-avo font-bold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a] h-full">
                              {index + 1}
                            </td>
                            <td className="px-2 py-2.5 text-[13px] font-utm-avo font-bold uppercase border-r border-b border-slate-300 text-slate-700 truncate max-w-[150px] h-full">
                              {row.staffName}
                            </td>
                            <td className="px-1 py-2.5 text-[13px] font-utm-avo font-bold text-center border-r border-b border-slate-300 text-slate-800 h-full">
                              {row.target.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </td>
                            <td className="px-1 py-2.5 text-[13px] font-utm-avo font-bold text-center border-r border-b border-slate-300 text-emerald-700 h-full">
                              {row.accumulated.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </td>
                            <td className={cn(
                              "px-1 py-2.5 text-[13px] font-utm-avo font-bold text-center border-r border-b border-slate-300 h-full",
                              roundedRate >= 100 ? "text-emerald-600" : roundedRate >= 50 ? "text-amber-600" : "text-rose-600"
                            )}>
                              {roundedRate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
            <Search size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">CHỌN NGÀNH HÀNG ĐỂ XEM CHI TIẾT</h3>
            <p className="text-slate-400 text-sm font-medium">Sử dụng bộ lọc phía trên để chọn các ngành hàng bạn muốn xem báo cáo chi tiết theo nhân viên</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(CategoryDetailByStaffTable);
