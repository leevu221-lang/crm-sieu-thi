import React, { useRef, useState, useMemo } from 'react';
import { Camera, Check, X } from 'lucide-react';
import { StaffData, StaffMatrixData, CategoryData } from '../../RTST/types';
import { cn } from '../../RTST/utils';
import { domToPng } from 'modern-screenshot';
import { saveAs } from 'file-saver';
import { cleanCategoryName } from './EmployeeDetailTable';
import { parseStaffMatrixDataRefined } from './SummaryThiDuaTable';

const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

interface TongHopNvTableProps {
  biRevenueData: StaffData[];
  filteredBiData: StaffData[];
  thiDuaNv: string;
  tragopNv: string;
  selectedStaffIds: string[];
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  stTargetSauHeSo: number;
  categoryTargets: any[];
  luykeCategories: CategoryData[];
  marketFilter: string;
  storeName?: string;
}

const TongHopNvTable: React.FC<TongHopNvTableProps> = ({
  biRevenueData,
  filteredBiData,
  thiDuaNv,
  tragopNv,
  selectedStaffIds,
  staffCount,
  daysPassed,
  totalDays,
  stTargetSauHeSo,
  categoryTargets,
  luykeCategories,
  marketFilter,
  storeName
}) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<{ key: string; ascending: boolean }>({ key: 'lkQuyDoi', ascending: false });

  // Parse thi đua data
  const { staffMatrix, categories } = useMemo(() =>
    parseStaffMatrixDataRefined(
      thiDuaNv,
      staffCount,
      categoryTargets,
      luykeCategories,
      daysPassed,
      totalDays
    ),
    [thiDuaNv, staffCount, categoryTargets, luykeCategories, daysPassed, totalDays]
  );

  // Parse trả chậm data
  const traChamMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!tragopNv) return map;

    const lines = tragopNv.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const cleanNumber = (val: string): number => {
      if (!val) return 0;
      let s = val.trim();
      const hasComma = s.includes(',');
      const hasDot = s.includes('.');
      if (hasComma && hasDot) {
        if (s.indexOf(',') < s.indexOf('.')) {
          s = s.replace(/,/g, '');
        } else {
          s = s.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        s = s.replace(/,/g, '.');
      }
      const clean = s.replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const isDetailed = tragopNv.toLowerCase().includes('homecredit') ||
                       tragopNv.toLowerCase().includes('fecredit') ||
                       tragopNv.toLowerCase().includes('shinhan');

    const splitLine = (l: string): string[] => {
      if (l.includes('\t')) return l.split('\t').map(p => p.trim());
      return l.split(/\t|\s{2,}/).map(p => p.trim());
    };

    const ignoredKeywords = [
      'nhanvien', 'homecredit', 'fecredit', 'shinhan', 'dmsieuthi', 'tytrong',
      'logobi', 'trangchu', 'baocao', 'khoikinhdoanh', 'hdsudung', 'avatar',
      'vungtay', 'dashboard', 'hotrobi', 'chientranh', 'lichsu', 'quanly',
      'danhsach', 'saovang', 'chupanh', 'xuatpdf', 'xuatexcel', 'hotline',
      'tiendo', 'rank', 'tongcong', 'tong', 'phankhuc', 'nganhhang', 'thang', 'nam'
    ];

    lines.forEach(line => {
      const parts = splitLine(line);
      if (parts.length < 2) return;
      const firstColClean = removeAccents(parts[0]).toLowerCase().replace(/[\s_*()-]+/g, '');
      if (!firstColClean || ignoredKeywords.some(k => firstColClean.includes(k) || k.includes(firstColClean))) return;

      const nameStartCheck = /^[a-zA-Z\dÀ-ỹ]/.test(parts[0]);
      if (!nameStartCheck) return;

      while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();

      if (isDetailed) {
        if (parts.length >= 3) {
          const percentRaw = cleanNumber(parts[parts.length - 1]);
          let percent = percentRaw;
          const lastPart = parts[parts.length - 1];
          if (percent > 0 && percent <= 1 && lastPart && !lastPart.includes('%')) {
            percent = percent * 100;
          }
          // Map by staff name
          biRevenueData.forEach(staff => {
            const staffName = (staff.displayName.split('-').pop() || '').trim();
            const staffNameClean = removeAccents(staffName);
            const rowValClean = removeAccents(parts[0]);
            if (rowValClean.includes(staff.fullId.toLowerCase()) ||
                rowValClean.includes(staffNameClean) ||
                staffNameClean.includes(rowValClean)) {
              map[staff.fullId] = percent;
            }
          });
        }
      } else {
        if (parts.length >= 3) {
          let percent = parts.length > 4 ? cleanNumber(parts[4]) : 0;
          if (percent > 0 && percent <= 1 && parts[4] && !parts[4].includes('%')) {
            percent = percent * 100;
          }
          let totalRevRaw = cleanNumber(parts[1]);
          let installRevRaw = cleanNumber(parts[2]);
          if (Math.abs(totalRevRaw) > 0 && Math.abs(totalRevRaw) < 1000000) totalRevRaw *= 1000000;
          if (Math.abs(installRevRaw) > 0 && Math.abs(installRevRaw) < 1000000) installRevRaw *= 1000000;
          if (percent === 0 && totalRevRaw > 0) {
            percent = (installRevRaw / totalRevRaw) * 100;
          }

          biRevenueData.forEach(staff => {
            const staffName = (staff.displayName.split('-').pop() || '').trim();
            const staffNameClean = removeAccents(staffName);
            const rowValClean = removeAccents(parts[0]);
            if (rowValClean.includes(staff.fullId.toLowerCase()) ||
                rowValClean.includes(staffNameClean) ||
                staffNameClean.includes(rowValClean)) {
              map[staff.fullId] = percent;
            }
          });
        }
      }
    });
    return map;
  }, [tragopNv, biRevenueData]);

  // Build combined data sorted by virtualVal (DT Quy Đổi) descending
  const combinedData = useMemo(() => {
    const targetQdPerStaff = filteredBiData.length > 0 ? stTargetSauHeSo / filteredBiData.length : 0;
    const actualTargetQdPerStaff = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;

    return filteredBiData
      .map(staff => {
        // Revenue data
        const actualActualVal = Math.abs(staff.actualVal || 0) > 1000000 ? (staff.actualVal || 0) : (staff.actualVal || 0) * 1000000;
        const percentHT = (actualTargetQdPerStaff > 0 && daysPassed > 0)
          ? (((actualActualVal / daysPassed) * totalDays) / actualTargetQdPerStaff) * 100
          : 0;

        // Same formula as RevenueRankingTableQd (DOANH THU NV > HIỆU QUẢ QĐ)
        const effQd = (staff.effVal !== 0 
          ? staff.effVal 
          : ((staff.actualVal || 0) > 0 
            ? ((staff.virtualVal - (staff.actualVal || 0)) / (staff.actualVal || 0)) * 100 
            : 0)) * 100;

        // Thi đua (categories achieved)
        const matrixStaff = staffMatrix.find(m => m.fullId === staff.fullId);
        const achieved = matrixStaff ? matrixStaff.achieved : 0;
        const totalCats = matrixStaff ? matrixStaff.totalCats : (categories.length || 0);

        // Trả chậm
        const traChamPercent = traChamMap[staff.fullId] || 0;

        // Doanh thu thực (actual revenue, not converted)
        const dtThuc = staff.virtualVal || 0;

        // Lũy kế quy đổi
        const lkQuyDoi = staff.actualVal || 0;

        // Remaining
        const remaining = actualTargetQdPerStaff - actualActualVal;

        // Projected % (Dự kiến)
        const projected = percentHT;

        // Target per staff in display unit
        const targetDisplay = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;

        // Progress percent for bar (lkQuyDoi / target)
        const lkQuyDoiAbsolute = Math.abs(lkQuyDoi) > 1000000 ? lkQuyDoi : lkQuyDoi * 1000000;
        const progressPercent = targetDisplay > 0 ? (lkQuyDoiAbsolute / targetDisplay) * 100 : 0;

        return {
          staff,
          dtThuc,
          lkQuyDoi,
          lkQuyDoiAbsolute,
          effQd,
          traChamPercent,
          achieved,
          totalCats,
          targetDisplay,
          remaining,
          projected,
          percentHT,
          progressPercent
        };
      })
      .sort((a, b) => (b.lkQuyDoiAbsolute) - (a.lkQuyDoiAbsolute));
  }, [filteredBiData, staffMatrix, traChamMap, stTargetSauHeSo, daysPassed, totalDays, categories.length]);

  // Sorted combined data
  const sortedCombinedData = useMemo(() => {
    const data = [...combinedData];
    const { key, ascending } = sortColumn;
    const dir = ascending ? 1 : -1;

    data.sort((a, b) => {
      let valA = 0, valB = 0;
      switch (key) {
        case 'achieved':
          valA = a.achieved; valB = b.achieved; break;
        case 'dtThuc':
          valA = a.dtThuc; valB = b.dtThuc; break;
        case 'lkQuyDoi':
          valA = a.lkQuyDoiAbsolute; valB = b.lkQuyDoiAbsolute; break;
        case 'effQd':
          valA = a.effQd; valB = b.effQd; break;
        case 'traCham':
          valA = a.traChamPercent; valB = b.traChamPercent; break;
        case 'target':
          valA = a.targetDisplay; valB = b.targetDisplay; break;
        case 'remaining':
          valA = a.remaining; valB = b.remaining; break;
        case 'projected':
          valA = a.projected; valB = b.projected; break;
        default:
          valA = a.lkQuyDoiAbsolute; valB = b.lkQuyDoiAbsolute; break;
      }
      return (valA - valB) * dir;
    });
    return data;
  }, [combinedData, sortColumn]);

  const handleSort = (key: string) => {
    setSortColumn(prev => {
      if (prev.key === key) return { key, ascending: !prev.ascending };
      return { key, ascending: false };
    });
  };

  const renderSortArrows = (key: string) => {
    const isActive = sortColumn.key === key;
    return (
      <span className="inline-flex flex-col ml-1 leading-none -space-y-0.5 align-middle">
        <span className={cn("text-[8px]", isActive && sortColumn.ascending ? "text-white" : "text-white/40")}>▲</span>
        <span className={cn("text-[8px]", isActive && !sortColumn.ascending ? "text-white" : "text-white/40")}>▼</span>
      </span>
    );
  };

  // Light background tint for the active sort column
  const sortBg = (key: string) => sortColumn.key === key ? 'bg-blue-50/60' : '';

  // Totals
  const totals = useMemo(() => {
    let totalAchieved = 0;
    let totalCats = 0;
    let totalDtThuc = 0;
    let totalLkQuyDoi = 0;
    let totalTarget = 0;
    let totalRemaining = 0;

    combinedData.forEach(row => {
      totalAchieved += row.achieved;
      totalCats = row.totalCats; // same for all
      totalDtThuc += row.dtThuc;
      totalLkQuyDoi += row.lkQuyDoiAbsolute;
      totalTarget += row.targetDisplay;
      totalRemaining += row.remaining;
    });

    const totalProgress = totalTarget > 0 ? (totalLkQuyDoi / totalTarget) * 100 : 0;
    const totalProjected = (totalTarget > 0 && daysPassed > 0)
      ? (((totalLkQuyDoi / daysPassed) * totalDays) / totalTarget) * 100
      : 0;

    // Average trả chậm
    const traChamValues = combinedData.filter(r => r.traChamPercent > 0);
    const avgTraCham = traChamValues.length > 0
      ? traChamValues.reduce((s, r) => s + r.traChamPercent, 0) / traChamValues.length
      : 0;

    // Total achieved across all staff
    const sumAchieved = combinedData.reduce((s, r) => s + r.achieved, 0);
    const avgAchievedDisplay = `${sumAchieved}`;

    return {
      totalAchieved: `${Math.round(sumAchieved / Math.max(combinedData.length, 1))}/${totalCats}`,
      totalDtThuc,
      totalLkQuyDoi,
      totalProgress,
      avgTraCham,
      totalTarget,
      totalRemaining,
      totalProjected,
    };
  }, [combinedData, daysPassed, totalDays]);

  const handleCapture = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);

    const originalElement = captureRef.current;
    const tableContainer = originalElement.querySelector('.overflow-x-auto');
    // originalElement has p-4 (16px padding on all sides, total 32px)
    const contentWidth = Math.max(originalElement.scrollWidth - 32, tableContainer ? tableContainer.scrollWidth : 0);
    const contentHeight = Math.max(originalElement.scrollHeight - 32, tableContainer ? tableContainer.scrollHeight : 0);
    
    // We want 32px padding on all sides in the final image
    const actualWidth = contentWidth + 64;
    
    // Create a temporary container to hold the clone
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = `${actualWidth}px`;
    container.style.height = 'auto';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    
    const clone = originalElement.cloneNode(true) as HTMLElement;
    
    // Hide buttons/controls inside the clone
    const noCaptureElements = clone.querySelectorAll('.no-capture, button');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    // Set clone styling to take full layout unconstrained
    clone.style.width = `${actualWidth}px`;
    clone.style.height = 'max-content';
    clone.style.margin = '0';
    clone.style.padding = '32px'; // 32px white border all around
    clone.style.backgroundColor = '#ffffff';
    clone.style.display = 'inline-block';
    
    // Make sure overflow wrappers in the clone are visible
    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = 'auto';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
      el.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'overflow-auto');
    });

    // Force hide all scrollbars in the captured image
    const hideScrollbarStyle = document.createElement('style');
    hideScrollbarStyle.innerHTML = `
      *::-webkit-scrollbar {
        display: none !important;
      }
      * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
    `;
    clone.appendChild(hideScrollbarStyle);

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      await new Promise(r => setTimeout(r, 200));

      const dataUrl = await domToPng(clone, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: actualWidth,
        height: clone.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${actualWidth}px`,
          height: `${clone.scrollHeight}px`
        }
      });

      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing:', err);
    } finally {
      document.body.removeChild(container);
      setIsCapturing(false);
    }
  };

  const formatRevenue = (val: number): string => {
    const absolute = Math.abs(val);
    if (absolute > 1000000) {
      return Math.round(absolute / 1000000).toLocaleString('vi-VN');
    }
    return Math.round(absolute).toLocaleString('vi-VN');
  };

  const formatName = (name: string) => {
    if (!name) return '';
    const parts = name.split(' - ');
    if (parts.length > 1) return parts[1].replace(/[-_]+$/, '').trim();
    return name.replace(/[-_]+$/, '').trim();
  };

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  // Extract store display name
  const storeDisplayName = storeName || (marketFilter !== 'ALL' ? marketFilter : '');
  const storeShort = storeDisplayName
    .replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*[-_]\s*/i, '')
    .replace(/^\d+\s*[-_]\s*/, '')
    .trim();

  return (
    <div className="w-full space-y-4">
      {/* Capture button */}
      <div className="flex justify-end no-capture">
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
            isCapturing
              ? "bg-slate-400 text-white cursor-wait"
              : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200/50"
          )}
        >
          <Camera size={16} />
          {isCapturing ? 'ĐANG XUẤT...' : 'XUẤT ẢNH BÁO CÁO'}
        </button>
      </div>

      <div ref={captureRef} className="bg-white p-4">
        {/* Header */}
        <div className="bg-white rounded-t-2xl px-8 py-6 text-center border border-slate-200 border-b-0">
          <h2 style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }} className="text-[28px] text-[#0f172a] uppercase tracking-tight">
            BẢNG THI ĐUA NGÀNH HÀNG NHÂN VIÊN {dateStr}
          </h2>
          {storeDisplayName && (
            <p style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 700 }} className="text-[14px] text-red-600 mt-1 uppercase tracking-wider">
              {storeDisplayName}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="border border-slate-300 border-t-0 rounded-b-2xl overflow-x-auto">
          <table className="w-full border-collapse table-fixed" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", minWidth: '1230px' }}>
            <thead>
              <tr className="h-[50px] text-[14px] font-black uppercase tracking-tight">
                <th style={{ fontWeight: 900, backgroundColor: '#10b981', width: '70px' }} className="px-1 py-2 text-center border-r border-white/20 text-white">HẠNG</th>
                <th style={{ fontWeight: 900, backgroundColor: '#10b981', width: '260px' }} className="px-2 py-2 text-center border-r border-white/20 text-white">NHÂN VIÊN</th>
                <th style={{ fontWeight: 900, backgroundColor: sortColumn.key === 'achieved' ? '#059669' : '#10b981', width: '80px' }} className="px-1 py-2 text-center border-r border-white/20 text-white cursor-pointer select-none hover:bg-[#059669] transition-colors" onClick={() => handleSort('achieved')}>ĐÃ VỀ{renderSortArrows('achieved')}</th>
                <th style={{ fontWeight: 900, backgroundColor: sortColumn.key === 'dtThuc' ? '#d97706' : '#f59e0b', width: '130px' }} className="px-1 py-2 text-center border-r border-white/20 text-white cursor-pointer select-none hover:bg-[#d97706] transition-colors" onClick={() => handleSort('dtThuc')}>DOANH THU THỰC{renderSortArrows('dtThuc')}</th>
                <th style={{ fontWeight: 900, backgroundColor: sortColumn.key === 'lkQuyDoi' ? '#d97706' : '#f59e0b', width: '140px' }} className="px-1 py-2 text-center border-r border-white/20 text-white cursor-pointer select-none hover:bg-[#d97706] transition-colors" onClick={() => handleSort('lkQuyDoi')}>LUỸ KẾ QUY ĐỔI{renderSortArrows('lkQuyDoi')}</th>
                <th style={{ fontWeight: 900, backgroundColor: sortColumn.key === 'effQd' ? '#d97706' : '#f59e0b', width: '110px' }} className="px-1 py-2 text-center border-r border-white/20 text-white cursor-pointer select-none hover:bg-[#d97706] transition-colors" onClick={() => handleSort('effQd')}>HIỆU QUẢ QĐ{renderSortArrows('effQd')}</th>
                <th style={{ fontWeight: 900, backgroundColor: sortColumn.key === 'traCham' ? '#059669' : '#10b981', width: '110px' }} className="px-1 py-2 text-center border-r border-white/20 text-white cursor-pointer select-none hover:bg-[#059669] transition-colors" onClick={() => handleSort('traCham')}>TRẢ CHẬM{renderSortArrows('traCham')}</th>
                <th style={{ fontWeight: 900, backgroundColor: sortColumn.key === 'target' ? '#059669' : '#10b981', width: '130px' }} className="px-1 py-2 text-center border-r border-white/20 text-white cursor-pointer select-none hover:bg-[#059669] transition-colors" onClick={() => handleSort('target')}>MỤC TIÊU THÁNG{renderSortArrows('target')}</th>
                <th style={{ fontWeight: 900, backgroundColor: sortColumn.key === 'remaining' ? '#059669' : '#10b981', width: '110px' }} className="px-1 py-2 text-center border-r border-white/20 text-white cursor-pointer select-none hover:bg-[#059669] transition-colors" onClick={() => handleSort('remaining')}>CÒN LẠI{renderSortArrows('remaining')}</th>
                <th style={{ fontWeight: 900, backgroundColor: sortColumn.key === 'projected' ? '#059669' : '#10b981', width: '90px' }} className="px-1 py-2 text-center text-white cursor-pointer select-none hover:bg-[#059669] transition-colors" onClick={() => handleSort('projected')}>DỰ KIẾN{renderSortArrows('projected')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedCombinedData.length > 0 ? (
                sortedCombinedData.map((row, index) => {
                  const isStriped = index % 2 === 1;
                  const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                  // Progress bar color based on percentage
                  const progressColor = row.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-rose-400';
                  const progressWidth = Math.min(row.progressPercent, 120);

                  // Format mục tiêu
                  const targetStr = row.targetDisplay > 0 ? formatRevenue(row.targetDisplay) : '';

                  return (
                    <tr key={row.staff.fullId} className={cn("h-[56px] transition-colors", isStriped ? "bg-[#f8faff]" : "bg-white", "hover:bg-slate-50/80")}>
                      {/* HẠNG */}
                      <td className="px-3 py-2 text-center border-r border-slate-200">
                        {rankIcon ? (
                          <span className="text-[20px]">{rankIcon}</span>
                        ) : (
                          <span style={{ fontWeight: 900 }} className="text-[18px] font-black text-slate-800">{index + 1}</span>
                        )}
                      </td>

                      {/* NHÂN VIÊN */}
                      <td style={{ fontWeight: 900 }} className="px-4 py-2 border-r border-slate-200">
                        <span className="text-[15px] font-black text-slate-800 uppercase tracking-tight">
                          {formatName(row.staff.displayName)}
                        </span>
                      </td>

                      {/* ĐÃ VỀ */}
                      <td style={{ fontWeight: 900 }} className={cn("px-2 py-2 text-center border-r border-slate-200", sortBg('achieved'))}>
                        <span className="text-[15px] font-black text-slate-800">{row.achieved}/{row.totalCats}</span>
                      </td>

                      {/* DOANH THU THỰC */}
                      <td style={{ fontWeight: 900 }} className={cn("px-2 py-2 text-center border-r border-slate-200", sortBg('dtThuc'))}>
                        <span className="text-[16px] font-black text-slate-800">
                          {formatRevenue(row.dtThuc)}
                        </span>
                      </td>

                      {/* LUỸ KẾ QUY ĐỔI (with progress bar) */}
                      <td className={cn("px-2 py-2 border-r border-slate-200", sortBg('lkQuyDoi'))}>
                        <div className="flex flex-col items-center gap-1">
                          <span style={{ fontWeight: 900 }} className="text-[16px] font-black text-slate-800">
                            {formatRevenue(row.lkQuyDoi)}
                          </span>
                          <div className="w-full h-[18px] rounded-full overflow-hidden relative" style={{ backgroundColor: '#f1f5f9' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${Math.min(progressWidth, 100)}%`,
                                backgroundColor: row.progressPercent >= 100 ? '#10b981' : '#fb7185'
                              }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#0f172a] drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                              {Math.round(row.progressPercent)}%
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* HIỆU QUẢ QUY ĐỔI */}
                      <td style={{ fontWeight: 900 }} className={cn("px-2 py-2 text-center border-r border-slate-200", sortBg('effQd'))}>
                        <span className={cn(
                          "text-[16px] font-black",
                          row.effQd >= 50 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {row.effQd.toFixed(1)}%
                        </span>
                      </td>

                      {/* TỶ TRỌNG TRẢ CHẬM */}
                      <td style={{ fontWeight: 900 }} className={cn("px-2 py-2 text-center border-r border-slate-200", sortBg('traCham'))}>
                        <span className={cn(
                          "text-[16px] font-black",
                          row.traChamPercent >= 50 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {row.traChamPercent > 0 ? `${row.traChamPercent.toFixed(2)}%` : ''}
                        </span>
                      </td>

                      {/* MỤC TIÊU THÁNG - Always show TARGET QĐ from DOANH THU NV */}
                      <td style={{ fontWeight: 900 }} className={cn("px-2 py-2 text-center border-r border-slate-200", sortBg('target'))}>
                        <span className="text-[16px] font-black text-slate-800">{targetStr}</span>
                      </td>

                      {/* CÒN LẠI - Show ✅ HT when <= 0 */}
                      <td style={{ fontWeight: 900 }} className={cn("px-2 py-2 text-center border-r border-slate-200", sortBg('remaining'))}>
                        {row.remaining <= 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                              <Check size={12} className="text-white" strokeWidth={3} />
                            </span>
                            <span className="text-[12px] font-black text-emerald-600 uppercase">HT</span>
                          </div>
                        ) : (
                          <span className="text-[14px] font-black text-slate-800">
                            {formatRevenue(row.remaining)}
                          </span>
                        )}
                      </td>

                      {/* DỰ KIẾN */}
                      <td style={{ fontWeight: 900 }} className={cn("px-2 py-2 text-center", sortBg('projected'))}>
                        <span className={cn(
                          "text-[14px] font-black",
                          row.projected >= 100 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {row.projected.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                      Chưa có dữ liệu nhân viên
                    </p>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer / Totals */}
            {combinedData.length > 0 && (
              <tfoot className="bg-[#f1f5f9] border-t-2 border-slate-300">
                <tr className="h-[50px]">
                  <td colSpan={2} style={{ fontWeight: 900 }} className="px-4 py-2 text-center border-r border-slate-200 text-[14px] font-black text-slate-800 uppercase tracking-wider">
                    Tổng
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-2 py-2 text-center border-r border-slate-200 text-[13px] font-black text-slate-800">
                    {totals.totalAchieved}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-2 py-2 text-center border-r border-slate-200 text-[14px] font-black text-slate-800">
                    {formatRevenue(totals.totalDtThuc)}
                  </td>
                  <td className="px-2 py-2 border-r border-slate-200">
                    <div className="flex flex-col items-center gap-1">
                      <span style={{ fontWeight: 900 }} className="text-[14px] font-black text-slate-800">
                        {formatRevenue(totals.totalLkQuyDoi)}
                      </span>
                      <div className="w-full h-[18px] rounded-full overflow-hidden relative" style={{ backgroundColor: '#e2e8f0' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ 
                            width: `${Math.min(totals.totalProgress, 100)}%`,
                            backgroundColor: totals.totalProgress >= 100 ? '#10b981' : '#fbbf24'
                          }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#0f172a] drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                          {Math.round(totals.totalProgress)}%
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-2 py-2 text-center border-r border-slate-200 text-[14px] font-black text-emerald-600">
                    {/* Average efficiency not applicable for total */}
                  </td>
                  <td style={{ fontWeight: 900 }} className={cn(
                    "px-2 py-2 text-center border-r border-slate-200 text-[14px] font-black",
                    totals.avgTraCham >= 50 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {totals.avgTraCham > 0 ? `${totals.avgTraCham.toFixed(2)}%` : ''}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-2 py-2 text-center border-r border-slate-200 text-[14px] font-black text-slate-800">
                    {formatRevenue(totals.totalTarget)}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-2 py-2 text-center border-r border-slate-200 text-[14px] font-black text-slate-800">
                    {totals.totalRemaining > 0 ? formatRevenue(totals.totalRemaining) : ''}
                  </td>
                  <td style={{ fontWeight: 900 }} className={cn(
                    "px-2 py-2 text-center text-[14px] font-black",
                    totals.totalProjected >= 100 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {totals.totalProjected.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative bg-white rounded-2xl max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Ảnh chụp màn hình</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-center">
              <p className="text-[13px] font-black text-amber-800 uppercase tracking-wide flex items-center gap-2">
                <span className="text-lg">💡</span> Mẹo: Nhấp chuột phải (hoặc nhấn giữ trên điện thoại) vào ảnh và chọn "Sao chép hình ảnh"
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center min-h-[50vh] overflow-hidden">
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[calc(90vh-120px)] object-contain shadow-sm rounded-xl border border-slate-200" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(TongHopNvTable);
