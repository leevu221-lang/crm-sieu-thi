import React from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingDown, Check, TrendingUp } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { parseCategoryData } from '../../RTST/utils';
import { cn } from '../../RTST/utils';
import { CategoryData, StaffMatrixData } from '../../RTST/types';

export const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const cleanCategoryName = (name: string): string => {
  if (!name) return '';
  let namePart = name;
  const targetMatch = namePart.match(/(.+?)\bTARGET\b/i);
  if (targetMatch) {
    namePart = targetMatch[1];
  }
  let clean = removeAccents(namePart).trim();
  
  // Replace abbreviations
  clean = clean.replace(/\b(bao hiem)\b/g, 'bh');
  clean = clean.replace(/\b(dien may xanh)\b/g, 'dmx');
  clean = clean.replace(/\b(the gioi di dong)\b/g, 'tgdd');
  clean = clean.replace(/\b(gia dung)\b/g, 'gd');
  clean = clean.replace(/\b(phu kien)\b/g, 'pk');
  
  // Also replace inline occurrences
  clean = clean.replace(/bao\s+hiem/g, 'bh');
  clean = clean.replace(/dien\s+may\s+xanh/g, 'dmx');
  clean = clean.replace(/the\s+gioi\s+di\s+dong/g, 'tgdd');
  clean = clean.replace(/gia\s+dung/g, 'gd');
  clean = clean.replace(/phu\s+kien/g, 'pk');

  // Strip all non-alphanumeric characters
  return clean.replace(/[^a-z0-9]/g, '');
};

interface EmployeeDetailTableProps {
  staffName: string;
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  categoryTargets: any[];
  luykeCategories?: CategoryData[];
  staffTargetQd?: number;
  staffDtqd?: number;
  staffPercentHT?: number;
}

// Parse all staff matrix data (same as before - one unified parse)
const parseStaffMatrixDataRefined = (input: string, staffCount: number, categoryTargets: any[], luykeCategories: CategoryData[], daysPassed: number, totalDays: number): { results: StaffMatrixData[], categories: string[] } => {
  const raw = input.trim();
  if (!raw) return { results: [], categories: [] };
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
      const numbers = catName.match(/-?[\d,.]+/g) || [];
      const hasManyNumbers = numbers.length >= 2;
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

      if (isColumnTypesLine || hasManyNumbers || isExcluded) {
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
  // Nếu không có luykeCategories, dùng fallback là inputCategories
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

  const targetPerStaffPerCat: Record<string, number> = {};
  if (luykeCategories && luykeCategories.length > 0) {
    luykeCategories.forEach(cat => {
      targetPerStaffPerCat[cleanCategoryName(cat.name)] = cat.target / staffCount;
    });
  } else {
    categoryTargets.forEach(cat => {
      targetPerStaffPerCat[cleanCategoryName(cat.name)] = (cat.target || 0) / staffCount;
    });
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
    
    const rawInputValues = parts.slice(dataStartIndex).map(v => {
      const clean = v.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    });

    const values: number[] = [];
    const projectedRates: number[] = [];
    let achieved = 0;

    displayCategories.forEach((catName) => {
      // Tìm index của ngành hàng này trong inputCategories của dữ liệu dán
      const inputIdx = inputCategories.findIndex(ic => cleanCategoryName(ic) === cleanCategoryName(catName));
      const val = inputIdx !== -1 ? (rawInputValues[inputIdx] || 0) : 0;
      values.push(val);

      const target = targetPerStaffPerCat[cleanCategoryName(catName)] || 0;
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

// Reusable mini table for a single section (SLLK or DTLK)
const SectionTable: React.FC<{
  title: string;
  titleColor: string;
  headerBg: string;
  rowData: { name: string; target: number; accumulated: number; percentHT: number; remainingVal: number }[];
}> = ({ title, titleColor, headerBg, rowData }) => {
  if (rowData.length === 0) {
    return null;
  }

  const reachedCount = rowData.filter(r => r.percentHT >= 100).length;

  return (
    <div className="overflow-visible">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-slate-300 bg-slate-700 px-3 h-[32px]">
        <span className={cn("text-[13px] font-utm-avo font-black uppercase tracking-widest", titleColor)}>{title}</span>
        <span className="text-[11px] font-utm-avo font-black text-white uppercase tracking-wider">
          ĐẠT: {reachedCount}/{rowData.length} || {rowData.length > 0 ? ((reachedCount / rowData.length) * 100).toFixed(0) : 0}%
        </span>
      </div>
      <table className="w-full border-separate border-spacing-0 border-l border-slate-300">
        <thead>
          <tr className="text-slate-900 h-[34px]">
            <th className={cn("px-2 py-0 text-[12px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300", headerBg)}>STT</th>
            <th className={cn("px-2 py-0 text-[12px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300", headerBg)}>NGÀNH HÀNG</th>
            <th className={cn("px-2 py-0 text-[12px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300", headerBg)}>TARGET</th>
            <th className="px-2 py-0 text-[12px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#facc15]">LUỸ KẾ</th>
            <th className="px-2 py-0 text-[12px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#facc15]">% HT</th>
            <th className="px-2 py-0 text-[12px] font-utm-avo font-black uppercase tracking-tight text-center border-r border-b border-slate-300 bg-[#f97316]">CÒN LẠI</th>
          </tr>
        </thead>
        <tbody>
          {rowData.map((row, index) => (
            <tr
              key={row.name}
              className="hover:bg-slate-50 transition-colors h-[34px]"
            >
              <td className="px-2 py-0 text-[12px] font-utm-avo font-bold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">
                {index + 1}
              </td>
              <td className={cn(
                "px-2 py-0 text-[12px] font-utm-avo font-bold uppercase border-r border-b border-slate-300",
                row.percentHT < 100 ? "text-rose-600" : "text-black"
              )}>
                {row.name}
              </td>
              <td className="px-2 py-0 text-[12px] font-utm-avo font-bold text-center border-r border-b border-slate-300 text-slate-800">
                {row.target.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
              </td>
              <td className="px-2 py-0 text-[12px] font-utm-avo font-bold text-center border-r border-b border-slate-300 text-emerald-700">
                {row.accumulated.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </td>
              <td className={cn(
                "px-2 py-0 text-[12px] font-utm-avo font-bold text-center border-r border-b border-slate-300",
                row.percentHT >= 100 ? "text-emerald-600" : row.percentHT >= 50 ? "text-amber-600" : "text-rose-600"
              )}>
                {row.percentHT.toFixed(0)}%
              </td>
              <td className={cn(
                "px-2 py-0 text-[12px] font-utm-avo font-bold text-center border-r border-b border-slate-300 flex items-center justify-center h-[34px]",
                row.remainingVal > 0 ? "text-emerald-600" : "text-rose-600 font-black"
              )}>
                {row.remainingVal > 0 ? (
                  <Check size={13} strokeWidth={4} />
                ) : (
                  Math.abs(row.remainingVal).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EmployeeDetailTable: React.FC<EmployeeDetailTableProps> = ({
  staffName,
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  categoryTargets,
  luykeCategories = [],
  staffTargetQd = 0,
  staffDtqd = 0,
  staffPercentHT = 0
}) => {
  // Parse staff matrix using original unified parser
  const { results: staffMatrix, categories: detailCategories } = parseStaffMatrixDataRefined(thiDuaNv, staffCount, categoryTargets, luykeCategories, daysPassed, totalDays);
  
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

  // Build a lookup for category type from luykeCategories (BC THÁNG → CHI TIẾT NGÀNH HÀNG)
  const catTypeLookup: Record<string, 'SL' | 'DT' | 'ALL'> = {};
  luykeCategories.forEach(cat => {
    catTypeLookup[cleanCategoryName(cat.name)] = cat.type || 'ALL';
  });

  // Prepare all row data
  const allRowData = detailCategories.map((catName, index) => {
    let target = 0;
    if (luykeCategories && luykeCategories.length > 0) {
      const lkCat = luykeCategories.find(c => cleanCategoryName(c.name) === cleanCategoryName(catName));
      target = lkCat ? lkCat.target / staffCount : 0;
    } else {
      const targetObj = categoryTargets.find(t => cleanCategoryName(t.name) === cleanCategoryName(catName));
      target = targetObj ? targetObj.target / staffCount : 0;
    }
    
    // Giá trị thực đạt đã được khớp đúng vị trí cột từ parseStaffMatrixDataRefined
    const accumulated = staffData.rawValues[index] || 0;

    const percentHT = (target > 0 && daysPassed > 0) 
      ? (((accumulated / daysPassed) * totalDays) / target) * 100 
      : 0;
    const remainingVal = accumulated - target;
    const catType = catTypeLookup[cleanCategoryName(catName)] || 'ALL';
    
    return {
      name: catName,
      target,
      accumulated,
      percentHT,
      remainingVal,
      catType
    };
  });

  // Split by type based on luykeCategories (BC THÁNG → CHI TIẾT NGÀNH HÀNG)
  const sllkRows = allRowData
    .filter(r => r.catType === 'SL')
    .sort((a, b) => b.percentHT - a.percentHT);
  const dtlkRows = allRowData
    .filter(r => r.catType === 'DT')
    .sort((a, b) => b.percentHT - a.percentHT);
  const otherRows = allRowData
    .filter(r => r.catType === 'ALL')
    .sort((a, b) => b.percentHT - a.percentHT);

  // Calculate combined stats
  const totalReached = allRowData.filter(r => r.percentHT >= 100).length;
  const totalCats = allRowData.length;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    <div id={`employee-detail-${staffName}`} className="bg-white p-[15px]">
    <div className="border-2 border-slate-400 overflow-visible">
      {/* Top Header */}
      <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-3xl font-utm-avo font-black text-slate-900 uppercase tracking-tight pb-2 mb-0 border-b border-slate-300 w-full text-center whitespace-nowrap p-4">CHI TIẾT NHÂN VIÊN</h2>
          <div className="flex items-center gap-2 bg-slate-700 w-full justify-center h-[40px]">
            <button 
              onClick={() => {
                const element = document.getElementById(`employee-detail-${staffName}`);
                if (element) {
                  htmlToImage.toPng(element, { 
                    backgroundColor: '#ffffff', 
                    pixelRatio: 2,
                    style: { fontSize: '9px', padding: '4px' }
                  })
                    .then(dataUrl => {
                      const link = document.createElement('a');
                      link.download = `ChiTietNV_${staffName.replace(/\s+/g, '_')}.png`;
                      link.href = dataUrl;
                      link.click();
                    });
                }
              }}
              className="hover:bg-slate-400 p-1 rounded-full transition-colors"
            >
              <Camera size={21} className="text-white" />
            </button>
            <span className="text-[15px] font-utm-avo font-black uppercase tracking-widest text-white">{staffName}</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-3xl font-utm-avo font-black text-rose-600 uppercase tracking-tight pb-2 mb-0 border-b border-slate-300 w-full text-center p-4">DỰ KIẾN</h2>
          <div className="flex items-center gap-2 bg-slate-700 w-full justify-center h-[40px]">
            {totalCats > 0 && (totalReached / totalCats) > 0.5 ? (
              <TrendingUp size={21} className="text-emerald-300" />
            ) : (
              <TrendingDown size={21} className="text-rose-300" />
            )}
            <span className="text-[15px] font-utm-avo font-black uppercase tracking-widest text-white">
              ĐẠT : {totalReached}/{totalCats} || TỶ LỆ : {totalCats > 0 ? ((totalReached / totalCats) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Revenue Dashboard */}
      {(staffTargetQd > 0 || staffDtqd > 0) && (
        <div className="grid grid-cols-4 border-b border-slate-300">
          <div className="p-3 flex flex-col items-center justify-center border-r border-slate-300 bg-white">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TARGET QĐ</span>
            <span className="text-[27px] font-utm-avo font-black text-blue-900">
              {staffTargetQd > 1000000 
                ? Math.floor(staffTargetQd / 1000000).toLocaleString('vi-VN')
                : Math.round(staffTargetQd).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="p-3 flex flex-col items-center justify-center border-r border-slate-300 bg-white">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DTQĐ</span>
            <span className="text-[27px] font-utm-avo font-black text-emerald-600">
              {Math.abs(staffDtqd) > 1000000 
                ? Math.floor(staffDtqd / 1000000).toLocaleString('vi-VN')
                : Math.round(staffDtqd).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="p-3 flex flex-col items-center justify-center border-r border-slate-300 bg-white">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">% HT</span>
            <span className={cn("text-[27px] font-utm-avo font-black", staffPercentHT >= 100 ? "text-amber-500" : "text-rose-600")}>
              {Math.round(staffPercentHT)}%
            </span>
          </div>
          <div className="p-3 flex flex-col items-center justify-center bg-white">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">THƯỞNG</span>
            <span className="text-[27px] font-utm-avo font-black text-slate-300">
              -
            </span>
          </div>
        </div>
      )}

      {/* SLLK Table (Top) - categories with type 'SL' from BC THÁNG */}
      <SectionTable
        title="SỐ LƯỢNG LUỸ KẾ (SLLK)"
        titleColor="text-cyan-300"
        headerBg="bg-[#06b6d4]"
        rowData={sllkRows}
      />

      {/* DTLK Table (Bottom) - categories with type 'DT' from BC THÁNG */}
      <SectionTable
        title="DOANH THU LUỸ KẾ (DTLK)"
        titleColor="text-emerald-300"
        headerBg="bg-[#10b981]"
        rowData={dtlkRows}
      />

      {/* Other categories (type 'ALL' - unclassified) */}
      {otherRows.length > 0 && (
        <SectionTable
          title="NGÀNH HÀNG KHÁC"
          titleColor="text-amber-300"
          headerBg="bg-[#f59e0b]"
          rowData={otherRows}
        />
      )}
    </div>
    </div>
  );
};

export default React.memo(EmployeeDetailTable);
