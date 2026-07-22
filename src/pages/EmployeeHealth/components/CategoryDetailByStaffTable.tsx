import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingDown, TrendingUp, ChevronDown, Check, Search, MessageSquare, X, Download } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '../../RTST/utils';
import { ImagePreviewModal } from '../../../components/ImagePreviewModal';
import { StaffMatrixData, CategoryData } from '../../RTST/types';
import { cleanCategoryName } from './EmployeeDetailTable';
import { useLuykeData } from '../../RTST/hooks/useLuykeData';

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

  // 1. Quét tên các ngành hàng có trong dữ liệu dán (thiDuaNv) - dùng để mapping cột
  // CRITICAL: Track ALL column positions including filtered ones, so data column indices stay aligned.
  let inputCategories: string[] = [];
  let allColumnHeaders: string[] = [];
  const categoryToColIdx: Map<string, number> = new Map();
  let headerStartIdx = -1;
  let dataStartIdx = -1;
  let colPosition = 0;

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
      ].some(ex => lowerCatName.includes(ex)) ||
      ((lowerCatName.includes('tổng') || lowerCatName.includes('tong')) && cleanCategoryName(catName) !== 'simtong');

      allColumnHeaders.push(catName);

      if (isColumnTypesLine || isOnlyNumbers || isExcluded) {
        colPosition++;
        continue;
      }

      const targetMatch = catName.match(/(.+?)\bTARGET\b/i);
      if (targetMatch) {
        catName = targetMatch[1].trim();
      }
      
      const cleanName = cleanCategoryName(catName);
      if (!categoryToColIdx.has(cleanName)) {
        categoryToColIdx.set(cleanName, colPosition);
      }
      
      inputCategories.push(catName);
      colPosition++;
    }
  }

  // 2. Xác định danh sách ngành hàng hiển thị (lấy trực tiếp từ dữ liệu dán thiDuaNv)
  // để đảm bảo các cột hiển thị trùng khớp hoàn toàn với dữ liệu người dùng dán vào.
  let displayCategories: string[] = [];
  const seen = new Set<string>();
  inputCategories.forEach(catName => {
    const clean = cleanCategoryName(catName);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      displayCategories.push(catName);
    }
  });

  const results: StaffMatrixData[] = [];
  const excludedKeywords = ['Tổng', 'BP All In One', 'BP Trưởng Ca', 'Hỗ trợ BI', 'Copyright', 'Dashboard', 'BC ', 'HD sử dụng', 'Trang chủ', 'Báo cáo', 'Khối kinh doanh', 'Logo BI', 'avatar'];
  const dataLines = lines.slice(dataStartIdx);

  const targetPerStaffPerCat: Record<string, number> = {};
  if (luykeCategories && luykeCategories.length > 0) {
    luykeCategories.forEach((cat: any) => {
      const matchingTarget = categoryTargets.find((t: any) => cleanCategoryName(t.name) === cleanCategoryName(cat.name));
      const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
        ? matchingTarget.adjustedTarget
        : cat.target;
      targetPerStaffPerCat[cleanCategoryName(cat.name)] = baseTarget / staffCount;
    });
  } else {
    categoryTargets.forEach((cat: any) => {
      const baseTarget = (typeof cat.adjustedTarget === 'number')
        ? cat.adjustedTarget
        : (cat.target || 0);
      targetPerStaffPerCat[cleanCategoryName(cat.name)] = baseTarget / staffCount;
    });
  }

  for (const line of dataLines) {
    // Split by tab ONLY and preserve empty columns to maintain alignment with category headers.
    let parts = line.split('\t').map(p => p.trim());
    
    // Fallback: if no tabs found (single column), try splitting by multiple spaces
    if (parts.length < 3) {
      parts = line.split(/ {2,}/).map(p => p.trim()).filter(p => p.length > 0);
    }
    
    const namePart = parts[0];

    if (!namePart) continue;
    if (excludedKeywords.some(ex => namePart.includes(ex))) continue;

    const nameIdParts = namePart.split(' - ').map(s => s.trim());
    if (nameIdParts.length < 2) continue;

    const name = nameIdParts[0];
    const id = nameIdParts[1];

    // Cột 1 là Tên - Mã nhân viên, số liệu ngành hàng bắt đầu ngay từ Cột 2 (index 1).
    const dataStartIndex = 1;

    const rawInputValues = parts.slice(dataStartIndex).map(v => {
      if (!v || v.trim() === '') return 0; // Preserve empty columns as 0
      const clean = v.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    });

    const values: number[] = [];
    const projectedRates: number[] = [];
    let achieved = 0;

    displayCategories.forEach((catName) => {
      const cleanName = cleanCategoryName(catName);
      const colIdx = categoryToColIdx.get(cleanName);
      const val = (colIdx !== undefined && colIdx < rawInputValues.length) ? (rawInputValues[colIdx] || 0) : 0;
      values.push(val);

      const target = targetPerStaffPerCat[cleanName] || 0;
      let projectedRate = 0;

      if (target > 0 && daysPassed > 0) {
        projectedRate = ((val / daysPassed) * totalDays) / target * 100;
      }

      projectedRates.push(projectedRate);
      if (Math.round(projectedRate) >= 100) achieved++;
    });

    results.push({
      displayName: `${id} - ${name.toUpperCase()}`,
      fullId: id,
      achieved,
      totalCats: displayCategories.length,
      rate: displayCategories.length > 0 ? achieved / displayCategories.length : 0,
      rawValues: values,
      projectedRates
    });
  }
  return { results, categories: displayCategories };
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

  // Build dropdown options from luykeCategories (BC Tháng) if available, otherwise fall back to parsed categories
  const dropdownCategories = React.useMemo(() => {
    if (luykeCategories && luykeCategories.length > 0) {
      return luykeCategories.map((c: any) => c.name).filter((n: string) => n);
    }
    return categories;
  }, [luykeCategories, categories]);

  // Filter staff matrix based on selectedStaffIds from parent
  const staffMatrix = selectedStaffIds.length > 0
    ? allStaffMatrix.filter(s => selectedStaffIds.includes(s.fullId))
    : allStaffMatrix;

  const { activeStore } = useLuykeData();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCapturingAll, setIsCapturingAll] = useState(false);
  const [copiedCat, setCopiedCat] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  React.useEffect(() => {
    if (dropdownCategories.length > 0 && !initializedRef.current) {
      const savedKey = `EH_DETAIL_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const savedVal = localStorage.getItem(savedKey);
      if (savedVal !== null) {
        try {
          const parsed = JSON.parse(savedVal);
          if (Array.isArray(parsed)) {
            const validSaved = parsed.filter((c: string) => dropdownCategories.includes(c));
            setSelectedCategories(validSaved);
            initializedRef.current = true;
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setSelectedCategories(dropdownCategories);
      initializedRef.current = true;
    }
  }, [dropdownCategories, activeStore]);

  // Save selected categories when selection changes
  React.useEffect(() => {
    if (dropdownCategories.length > 0 && initializedRef.current) {
      const savedKey = `EH_DETAIL_CATEGORIES_${activeStore || 'GLOBAL'}`;
      localStorage.setItem(savedKey, JSON.stringify(selectedCategories));
    }
  }, [selectedCategories, dropdownCategories, activeStore]);

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

  if (dropdownCategories.length === 0 && categories.length === 0) return null;

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const captureElementHelper = async (element: HTMLElement) => {
    // Create a temporary container to hold the clone
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '0';
    tempContainer.style.left = '0';
    tempContainer.style.width = '4000px'; // Extremely wide to prevent any wrapping or truncation
    tempContainer.style.height = '0';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';

    const clone = element.cloneNode(true) as HTMLElement;

    // Hide buttons/controls inside the clone
    const noCaptureElements = clone.querySelectorAll('.no-capture, button, textarea, .capture-btn');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // Set clone styling to take full layout unconstrained
    clone.style.width = 'max-content';
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.padding = '32px'; // Nice margin around the captured image
    clone.style.backgroundColor = '#ffffff';
    clone.style.display = 'inline-block';
    clone.style.borderRadius = '32px'; // Round corners like target container

    // Make sure overflow wrappers in the clone are visible
    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = 'auto';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
    });

    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      const htmlTable = table as HTMLTableElement;
      htmlTable.style.width = 'auto';
      htmlTable.style.minWidth = 'auto';
      htmlTable.style.tableLayout = 'auto';

      // Remove fixed widths on all cells so columns auto-shrink to fit content
      const allCells = htmlTable.querySelectorAll('th, td');
      allCells.forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = 'auto';
        htmlCell.style.minWidth = 'auto';
        htmlCell.style.maxWidth = 'none';
        htmlCell.style.whiteSpace = 'nowrap';
        htmlCell.style.paddingLeft = '12px';
        htmlCell.style.paddingRight = '12px';
      });

      // Remove colgroup if exists
      const colgroup = htmlTable.querySelector('colgroup');
      if (colgroup) colgroup.remove();
    });

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    try {
      await new Promise(r => setTimeout(r, 200)); // wait for layout/render
      const dataUrl = await htmlToImage.toPng(clone, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
      return dataUrl;
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const handleExport = async (catName: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      try {
        const dataUrl = await captureElementHelper(element);
        setPreviewImage(dataUrl);
      } catch (err) {
        console.error('Export category failed:', err);
      }
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
          const dataUrl = await captureElementHelper(element);
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

  const filteredDropdownCategories = dropdownCategories.filter(cat =>
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
                : selectedCategories.length === dropdownCategories.length
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
                  onClick={() => setSelectedCategories([...dropdownCategories])}
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
                {filteredDropdownCategories.map(cat => (
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
            const catIdx = categories.findIndex(c => cleanCategoryName(c) === cleanCategoryName(catName));
            const lkCat = luykeCategories.length > 0
              ? luykeCategories.find((c: any) => cleanCategoryName(c.name) === cleanCategoryName(catName))
              : null;
            const matchingTarget = categoryTargets.find((t: any) => cleanCategoryName(t.name) === cleanCategoryName(catName));
            const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
              ? matchingTarget.adjustedTarget
              : (lkCat ? lkCat.target : 0);
            const targetPerStaff = staffCount > 0 ? baseTarget / staffCount : 0;
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

                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300 min-w-[600px]">
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
                            <td className="px-1 py-2.5 text-[15px] font-utm-avo font-black text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a] h-full">
                              {index + 1}
                            </td>
                            <td className="px-2 py-2.5 text-[15px] font-utm-avo font-black uppercase border-r border-b border-slate-300 text-slate-700 truncate max-w-[150px] h-full">
                              {row.staffName}
                            </td>
                            <td className="px-1 py-2.5 text-[15px] font-utm-avo font-black text-center border-r border-b border-slate-300 text-slate-800 h-full">
                              {row.target.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </td>
                            <td className="px-1 py-2.5 text-[15px] font-utm-avo font-black text-center border-r border-b border-slate-300 text-emerald-700 h-full">
                              {row.accumulated.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </td>
                            <td className={cn(
                              "px-1 py-2.5 text-[15px] font-utm-avo font-black text-center border-r border-b border-slate-300 h-full",
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

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default React.memo(CategoryDetailByStaffTable);
