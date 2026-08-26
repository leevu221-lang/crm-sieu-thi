import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Trophy,
  Zap,
  Check,
  Copy,
  X,
  Camera,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Award,
  Crown,
  Flame,
  ChevronDown,
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { ensureFontsReady } from '../../../utils/fontExportUtil';
import { cleanCategoryName, removeAccents } from './EmployeeDetailTable';
import { CategoryData, StaffMatrixData } from '../../RTST/types';

export interface StaffComparisonData {
  fullId: string;
  displayName: string;
  cleanName: string;
  rank?: number;
  targetQd: number;
  actualDtqd: number;
  percentHT: number;
  hieuQuaQd: number | null;
  bonusHientai: number | null;
  installmentPercent: number | null;
  rawMatrixValues: number[];
}

interface StaffComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffComparisonData[];
  initialStaffAId?: string;
  initialStaffBId?: string;
  detailCategories: string[];
  luykeCategories: CategoryData[];
  categoryTargets: any[];
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  onPreviewImage: (dataUrl: string) => void;
}

export const StaffComparisonModal: React.FC<StaffComparisonModalProps> = ({
  isOpen,
  onClose,
  staffList = [],
  initialStaffAId,
  initialStaffBId,
  detailCategories = [],
  luykeCategories = [],
  categoryTargets = [],
  staffCount = 1,
  daysPassed = 1,
  totalDays = 30,
  onPreviewImage,
}) => {
  const safeStaffList = staffList || [];
  const safeDetailCategories = detailCategories || [];
  const safeLuykeCategories = luykeCategories || [];
  const safeCategoryTargets = categoryTargets || [];

  // Select staff A and staff B
  const [staffAId, setStaffAId] = useState<string>(() => {
    if (initialStaffAId && safeStaffList.some(s => s.fullId === initialStaffAId)) return initialStaffAId;
    return safeStaffList[0]?.fullId || '';
  });

  const [staffBId, setStaffBId] = useState<string>(() => {
    if (initialStaffBId && safeStaffList.some(s => s.fullId === initialStaffBId)) return initialStaffBId;
    return safeStaffList[1]?.fullId || safeStaffList[0]?.fullId || '';
  });

  const [activeTab, setActiveTab] = useState<'ALL' | 'SL' | 'DT'>('ALL');
  const [isCapturing, setIsCapturing] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);

  const captureRef = useRef<HTMLDivElement>(null);

  // Sync initial selections only when modal opens or initial IDs change
  React.useEffect(() => {
    if (isOpen) {
      if (initialStaffAId && safeStaffList.some(s => s.fullId === initialStaffAId)) {
        setStaffAId(initialStaffAId);
      } else if (safeStaffList.length > 0 && !safeStaffList.some(s => s.fullId === staffAId)) {
        setStaffAId(safeStaffList[0].fullId);
      }

      if (initialStaffBId && safeStaffList.some(s => s.fullId === initialStaffBId)) {
        setStaffBId(initialStaffBId);
      } else if (safeStaffList.length > 1 && !safeStaffList.some(s => s.fullId === staffBId)) {
        setStaffBId(safeStaffList[1].fullId);
      }
    }
  }, [isOpen, initialStaffAId, initialStaffBId]);

  const staffA = useMemo(() => safeStaffList.find(s => s.fullId === staffAId), [safeStaffList, staffAId]);
  const staffB = useMemo(() => safeStaffList.find(s => s.fullId === staffBId), [safeStaffList, staffBId]);

  // Swap staff A and staff B
  const handleSwap = () => {
    const temp = staffAId;
    setStaffAId(staffBId);
    setStaffBId(temp);
  };

  // Quick preset: Top 1 vs Top 2
  const handlePresetTop1Vs2 = () => {
    if (staffList.length >= 2) {
      const sorted = [...staffList].sort((a, b) => b.percentHT - a.percentHT);
      setStaffAId(sorted[0].fullId);
      setStaffBId(sorted[1].fullId);
    }
  };

  // Quick preset: Top 1 vs Bottom
  const handlePresetTopVsBottom = () => {
    if (staffList.length >= 2) {
      const sorted = [...staffList].sort((a, b) => b.percentHT - a.percentHT);
      setStaffAId(sorted[0].fullId);
      setStaffBId(sorted[sorted.length - 1].fullId);
    }
  };

  // Build category lookup
  const catTypeLookup: Record<string, 'SL' | 'DT' | 'ALL'> = useMemo(() => {
    const lookup: Record<string, 'SL' | 'DT' | 'ALL'> = {};
    safeLuykeCategories.forEach(cat => {
      if (cat && cat.name) {
        lookup[cleanCategoryName(cat.name)] = cat.type || 'ALL';
      }
    });
    return lookup;
  }, [safeLuykeCategories]);

  // Compute category comparison items for Staff A & Staff B
  const categoryComparison = useMemo(() => {
    if (!staffA || !staffB || safeDetailCategories.length === 0) return { all: [], sl: [], dt: [] };

    const categoriesToMap = (safeLuykeCategories && safeLuykeCategories.length > 0)
      ? safeLuykeCategories
      : safeDetailCategories.map(name => ({ name, type: catTypeLookup[cleanCategoryName(name)] || 'ALL', target: 0 }));

    const items = categoriesToMap.map((cat: any) => {
      const cleanCatName = cleanCategoryName(cat?.name || '');

      // Find target per staff
      let target = 0;
      const matchingTarget = safeCategoryTargets.find((t: any) => cleanCategoryName(t?.name || '') === cleanCatName);
      const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
        ? matchingTarget.adjustedTarget
        : (cat?.target || 0);
      target = staffCount > 0 ? baseTarget / staffCount : 0;

      // Staff A value
      const detailIdx = safeDetailCategories.findIndex(dc => cleanCategoryName(dc) === cleanCatName);
      const accA = detailIdx !== -1 ? ((staffA.rawMatrixValues && staffA.rawMatrixValues[detailIdx]) || 0) : 0;
      const pctA = (target > 0 && daysPassed > 0) ? (((accA / daysPassed) * totalDays) / target) * 100 : 0;

      // Staff B value
      const accB = detailIdx !== -1 ? ((staffB.rawMatrixValues && staffB.rawMatrixValues[detailIdx]) || 0) : 0;
      const pctB = (target > 0 && daysPassed > 0) ? (((accB / daysPassed) * totalDays) / target) * 100 : 0;

      const catType = cat?.type || catTypeLookup[cleanCatName] || 'ALL';

      let winner: 'A' | 'B' | 'TIE' = 'TIE';
      if (pctA > pctB) winner = 'A';
      else if (pctB > pctA) winner = 'B';

      return {
        name: cat.name,
        target,
        accA,
        pctA,
        accB,
        pctB,
        catType,
        winner,
        diffPct: Math.abs(pctA - pctB),
      };
    });

    const sl = items.filter(i => i.catType === 'SL').sort((a, b) => (b.pctA + b.pctB) - (a.pctA + a.pctB));
    const dt = items.filter(i => i.catType === 'DT').sort((a, b) => (b.pctA + b.pctB) - (a.pctA + a.pctB));

    return { all: items, sl, dt };
  }, [staffA, staffB, detailCategories, luykeCategories, categoryTargets, catTypeLookup, staffCount, daysPassed, totalDays]);

  // Scores
  const scoreA = useMemo(() => {
    return categoryComparison.all.filter(i => i.winner === 'A').length;
  }, [categoryComparison]);

  const scoreB = useMemo(() => {
    return categoryComparison.all.filter(i => i.winner === 'B').length;
  }, [categoryComparison]);

  // Overall winner
  const overallWinner = useMemo(() => {
    if (!staffA || !staffB) return null;
    if (staffA.percentHT > staffB.percentHT) return 'A';
    if (staffB.percentHT > staffA.percentHT) return 'B';
    if (staffA.actualDtqd > staffB.actualDtqd) return 'A';
    if (staffB.actualDtqd > staffA.actualDtqd) return 'B';
    return 'TIE';
  }, [staffA, staffB]);

  // Auto generated battle commentary
  const battleAnalysisText = useMemo(() => {
    if (!staffA || !staffB) return '';
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const diffDtqd = Math.abs((staffA.actualDtqd || 0) - (staffB.actualDtqd || 0));
    const diffPct = Math.abs((staffA.percentHT || 0) - (staffB.percentHT || 0));

    const nameA = staffA.cleanName || staffA.displayName;
    const nameB = staffB.cleanName || staffB.displayName;

    const leaderName = overallWinner === 'A' ? nameA : (overallWinner === 'B' ? nameB : null);
    const trailerName = overallWinner === 'A' ? nameB : (overallWinner === 'B' ? nameA : null);

    const leaderDtqd = overallWinner === 'A' ? staffA.actualDtqd : staffB.actualDtqd;
    const leaderPct = overallWinner === 'A' ? staffA.percentHT : staffB.percentHT;
    const trailerPct = overallWinner === 'A' ? staffB.percentHT : staffA.percentHT;

    // Strengths of A
    const strongA = categoryComparison.all.filter(i => i.winner === 'A').slice(0, 3).map(i => i.name);
    // Strengths of B
    const strongB = categoryComparison.all.filter(i => i.winner === 'B').slice(0, 3).map(i => i.name);

    return `⚔️ ĐỐI ĐẦU THI ĐUA: 【${nameA}】 VS 【${nameB}】\n` +
      `⏰ Thời điểm: ${timeStr} ngày ${dateStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📊 KẾT QUẢ TỔNG QUAN:\n` +
      `• ${nameA} (#${staffA.fullId}): ${Math.round(staffA.actualDtqd).toLocaleString('vi-VN')} tr QĐ (Đạt ${Math.round(staffA.percentHT)}%) | Trả chậm: ${staffA.installmentPercent !== null ? staffA.installmentPercent + '%' : '-'}\n` +
      `• ${nameB} (#${staffB.fullId}): ${Math.round(staffB.actualDtqd).toLocaleString('vi-VN')} tr QĐ (Đạt ${Math.round(staffB.percentHT)}%) | Trả chậm: ${staffB.installmentPercent !== null ? staffB.installmentPercent + '%' : '-'}\n\n` +
      (leaderName
        ? `👑 DẪN ĐẦU: ${leaderName} đang tạm dẫn trước với khoảng cách ${Math.round(diffDtqd).toLocaleString('vi-VN')} tr QĐ (${Math.round(diffPct)}% tiến độ)!\n\n`
        : `🤝 CÂN BẰNG: Hai bạn đang bám đuổi vô cùng sít sao!\n\n`) +
      `🥊 ĐIỂM MẠNH TỪNG BẠN:\n` +
      `✨ ${nameA}: Ưu thế ở [${strongA.join(', ') || 'Nhiều ngành hàng'}]\n` +
      `✨ ${nameB}: Ưu thế ở [${strongB.join(', ') || 'Nhiều ngành hàng'}]\n\n` +
      `🚀 Tỉ số ngành hàng dẫn đầu: ${nameA} (${scoreA}) - (${scoreB}) ${nameB}\n\n` +
      `🔥 Chúc 2 bạn tiếp tục bung sức, đẩy mạnh chốt đơn & trả góp để bứt phá kỷ lục mới! 🚀🚀🚀`;
  }, [staffA, staffB, overallWinner, categoryComparison, scoreA, scoreB]);

  const handleCopyAnalysis = async () => {
    try {
      await navigator.clipboard.writeText(battleAnalysisText);
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 2000);
    } catch {
      // fallback
    }
  };

  // High quality image export
  const handleCapture = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);

    try {
      await ensureFontsReady();
      const original = captureRef.current;
      const clone = original.cloneNode(true) as HTMLElement;

      // Ensure clone elements take full desktop wide layout (1080px)
      clone.style.width = '1080px';
      clone.style.maxWidth = '1080px';
      clone.style.minWidth = '1080px';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.boxSizing = 'border-box';
      clone.style.backgroundColor = '#ffffff';

      // 1. Remove all elements with .no-capture (buttons, commentary, footer)
      clone.querySelectorAll('.no-capture').forEach(el => el.remove());

      // 2. Explicitly format the header banner
      const headerEl = clone.querySelector('.modal-header-banner') as HTMLElement;
      if (headerEl) {
        headerEl.style.display = 'flex';
        headerEl.style.flexDirection = 'row';
        headerEl.style.alignItems = 'center';
        headerEl.style.justifyContent = 'space-between';
        headerEl.style.padding = '22px 28px';
        headerEl.style.width = '100%';
        headerEl.style.boxSizing = 'border-box';
      }

      // 3. Format selector bar in clone to side-by-side row
      const cloneSelectorRow = clone.querySelector('.selector-row-container') as HTMLElement;
      if (cloneSelectorRow) {
        cloneSelectorRow.style.display = 'flex';
        cloneSelectorRow.style.flexDirection = 'row';
        cloneSelectorRow.style.alignItems = 'center';
        cloneSelectorRow.style.justifyContent = 'space-between';
        cloneSelectorRow.style.gap = '16px';
        cloneSelectorRow.style.width = '100%';
      }

      // 4. Format fighter cards grid in clone to 11-column grid
      const cloneFighterGrid = clone.querySelector('.fighter-cards-grid') as HTMLElement;
      if (cloneFighterGrid) {
        cloneFighterGrid.style.display = 'grid';
        cloneFighterGrid.style.gridTemplateColumns = 'repeat(11, minmax(0, 1fr))';
        cloneFighterGrid.style.gap = '16px';
        cloneFighterGrid.style.alignItems = 'center';
        cloneFighterGrid.style.width = '100%';

        const cardA = cloneFighterGrid.querySelector('.card-staff-a') as HTMLElement;
        const vsBadge = cloneFighterGrid.querySelector('.badge-vs-center') as HTMLElement;
        const cardB = cloneFighterGrid.querySelector('.card-staff-b') as HTMLElement;

        if (cardA) cardA.style.gridColumn = 'span 5 / span 5';
        if (vsBadge) vsBadge.style.gridColumn = 'span 1 / span 1';
        if (cardB) cardB.style.gridColumn = 'span 5 / span 5';
      }

      // 5. Format select boxes in clone into beautiful styled static pills
      const origSelects = original.querySelectorAll('select');
      const cloneSelects = clone.querySelectorAll('select');
      origSelects.forEach((origSelect, i) => {
        const cloneSelect = cloneSelects[i];
        if (cloneSelect) {
          const selectedText = origSelect.options[origSelect.selectedIndex]?.text || origSelect.value;
          const displayDiv = document.createElement('div');
          displayDiv.className = cloneSelect.className;
          displayDiv.style.display = 'flex';
          displayDiv.style.alignItems = 'center';
          displayDiv.style.minHeight = '38px';
          displayDiv.style.paddingLeft = '14px';
          displayDiv.style.paddingRight = '14px';
          displayDiv.style.fontWeight = '900';
          displayDiv.style.fontSize = '13px';
          displayDiv.textContent = selectedText;
          cloneSelect.parentNode?.replaceChild(displayDiv, cloneSelect);
        }
      });

      // 6. Zero-shadow export: strip all shadows, filters and blur
      clone.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.filter = 'none';
        htmlEl.style.maxHeight = 'none';
        htmlEl.classList.remove('shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'drop-shadow-sm', 'drop-shadow-md');
      });

      // 7. Ensure table cells in clone have ample vertical padding and no line cut-offs
      clone.querySelectorAll('td, th').forEach(el => {
        const cell = el as HTMLElement;
        cell.style.paddingTop = '10px';
        cell.style.paddingBottom = '10px';
        cell.style.verticalAlign = 'middle';
      });

      const tableWrapper = clone.querySelector('.table-container-wrapper') as HTMLElement;
      if (tableWrapper) {
        tableWrapper.style.overflow = 'visible';
        tableWrapper.style.maxHeight = 'none';
        tableWrapper.style.height = 'auto';
        tableWrapper.style.border = '1px solid #e2e8f0';
        tableWrapper.style.borderRadius = '16px';
      }

      // 8. Add an explicit bottom spacer to clone to guarantee full visibility of the bottom table row
      const bottomSpacer = document.createElement('div');
      bottomSpacer.style.height = '60px';
      bottomSpacer.style.width = '100%';
      bottomSpacer.style.backgroundColor = '#ffffff';
      bottomSpacer.style.display = 'block';
      clone.appendChild(bottomSpacer);

      // 9. Force 1080px clean wrapper
      const targetWidthPx = 1080;
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = `${targetWidthPx}px`;
      tempContainer.style.zIndex = '-9999';

      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = '0px';
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.borderRadius = '24px';
      frameWrapper.style.overflow = 'visible';
      frameWrapper.style.width = `${targetWidthPx}px`;
      frameWrapper.style.boxSizing = 'border-box';
      frameWrapper.style.boxShadow = 'none';
      frameWrapper.appendChild(clone);

      tempContainer.appendChild(frameWrapper);
      document.body.appendChild(tempContainer);

      await new Promise(r => setTimeout(r, 300));

      const rect = frameWrapper.getBoundingClientRect();
      const scrollH = frameWrapper.scrollHeight;
      const offsetH = frameWrapper.offsetHeight;
      const exactHeight = Math.ceil(Math.max(rect.height, scrollH, offsetH, clone.scrollHeight)) + 20;

      const dataUrl = await domToPng(frameWrapper, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: targetWidthPx,
        height: exactHeight,
        features: { removeControlCharacter: true },
      });

      document.body.removeChild(tempContainer);
      onPreviewImage(dataUrl);
    } catch (err) {
      console.error('[StaffComparisonModal] Capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const activeRows = activeTab === 'ALL'
    ? categoryComparison.all
    : (activeTab === 'SL' ? categoryComparison.sl : categoryComparison.dt);

  // Power bar percentages (normalized)
  const totalDtqd = (staffA?.actualDtqd || 0) + (staffB?.actualDtqd || 0);
  const barA_Dtqd = totalDtqd > 0 ? ((staffA?.actualDtqd || 0) / totalDtqd) * 100 : 50;
  const barB_Dtqd = 100 - barA_Dtqd;

  const totalPct = (staffA?.percentHT || 0) + (staffB?.percentHT || 0);
  const barA_Pct = totalPct > 0 ? ((staffA?.percentHT || 0) / totalPct) * 100 : 50;
  const barB_Pct = 100 - barA_Pct;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 z-10 my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
      >
        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Main Printable / Capturable Area (Includes Header, Selectors, Cards, Bars, Table) */}
          <div ref={captureRef} className="bg-white flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white shrink-0 modal-header-banner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
                  <Swords size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-wide whitespace-nowrap">
                      So Sánh &amp; Đối Đầu Thi Đua
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <Flame size={12} className="text-amber-400" />
                      1 VS 1 Arena
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    Phân tích toàn diện hiệu suất, doanh thu quy đổi &amp; chỉ tiêu ngành hàng
                  </p>
                </div>
              </div>

              {/* Action Buttons (Hidden in Capture) */}
              <div className="flex items-center gap-2 no-capture">
                <button
                  onClick={handleCapture}
                  disabled={isCapturing}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-white/20"
                  title="Chụp ảnh infographic so sánh 2 nhân viên"
                >
                  {isCapturing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Đang tạo ảnh...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={15} />
                      <span className="hidden sm:inline">Xuất ảnh đối đầu</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Toolbar: Staff Selectors & Quick Presets */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 selector-row-container">
                {/* Staff A Selector */}
                <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                    A
                  </span>
                  <div className="relative flex-1">
                    <select
                      value={staffAId}
                      onChange={e => setStaffAId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-blue-200 rounded-xl text-xs sm:text-[13px] font-black text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer appearance-none shadow-xs"
                    >
                      {safeStaffList.map(s => (
                        <option key={`a-${s.fullId}`} value={s.fullId}>
                          #{s.fullId} - {s.cleanName || s.displayName} ({Math.round(s.percentHT)}%)
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none no-capture" />
                  </div>
                </div>

                {/* Swap Button */}
                <button
                  onClick={handleSwap}
                  className="p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 hover:rotate-180 duration-300"
                  title="Đảo vị trí 2 nhân viên"
                >
                  <ArrowRightLeft size={16} className="text-slate-600" />
                </button>

                {/* Staff B Selector */}
                <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                  <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                    B
                  </span>
                  <div className="relative flex-1">
                    <select
                      value={staffBId}
                      onChange={e => setStaffBId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-rose-200 rounded-xl text-xs sm:text-[13px] font-black text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 cursor-pointer appearance-none shadow-xs"
                    >
                      {safeStaffList.map(s => (
                        <option key={`b-${s.fullId}`} value={s.fullId}>
                          #{s.fullId} - {s.cleanName || s.displayName} ({Math.round(s.percentHT)}%)
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none no-capture" />
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">So sánh nhanh:</span>
                <button
                  onClick={handlePresetTop1Vs2}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trophy size={12} className="text-amber-500" />
                  <span>Top 1 vs Top 2</span>
                </button>
                <button
                  onClick={handlePresetTopVsBottom}
                  className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap size={12} className="text-purple-500" />
                  <span>Đầu Bảng vs Cuối Bảng</span>
                </button>
                <button
                  onClick={() => setShowAnalysis(v => !v)}
                  className={`ml-auto px-2.5 py-1 rounded-lg transition-all cursor-pointer border no-capture ${
                    showAnalysis ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {showAnalysis ? 'Ẩn nhận xét' : 'Hiện nhận xét đối đầu'}
                </button>
              </div>
            </div>

            {/* Main Body Content Frame */}
            <div className="p-4 sm:p-6 space-y-6 bg-white main-body-frame">
            {/* Head-to-Head Cards */}
            {staffA && staffB && (
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 sm:gap-4 items-center fighter-cards-grid">
                {/* Staff A Fighter Card */}
                <div
                  className={`md:col-span-5 rounded-3xl p-5 border-2 transition-all relative overflow-hidden card-staff-a ${
                    overallWinner === 'A'
                      ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-white border-blue-500 shadow-xl shadow-blue-500/10'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  {overallWinner === 'A' && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Crown size={13} className="text-amber-900 fill-amber-900" />
                      <span>LEADER</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/25 shrink-0">
                      {staffA.cleanName ? staffA.cleanName.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider block">
                        NV A • #{staffA.fullId}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                        {staffA.cleanName || staffA.displayName}
                      </h3>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-blue-100">
                    <div className="bg-white/80 rounded-xl p-2 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">DTQĐ</span>
                      <span className="text-sm sm:text-base font-black text-blue-700 block">
                        {Math.round(staffA.actualDtqd).toLocaleString('vi-VN')}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-bold">triệu</span>
                    </div>

                    <div className="bg-white/80 rounded-xl p-2 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">%HT TARGET</span>
                      <span
                        className={`text-sm sm:text-base font-black block ${
                          staffA.percentHT >= 100 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {Math.round(staffA.percentHT)}%
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-bold">
                        {staffA.percentHT >= 100 ? 'Đạt' : 'Cần tăng'}
                      </span>
                    </div>

                    <div className="bg-white/80 rounded-xl p-2 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">TRẢ CHẬM</span>
                      <span className="text-sm sm:text-base font-black text-indigo-700 block">
                        {staffA.installmentPercent !== null ? `${staffA.installmentPercent}%` : '-'}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-bold">tỷ trọng</span>
                    </div>
                  </div>
                </div>

                {/* VS Center Badge */}
                <div className="md:col-span-1 flex flex-col items-center justify-center gap-1.5 py-2 badge-vs-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-orange-500/30 animate-pulse">
                    VS
                  </div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                    TỈ SỐ NH
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-200">
                    {scoreA} - {scoreB}
                  </div>
                </div>

                {/* Staff B Fighter Card */}
                <div
                  className={`md:col-span-5 rounded-3xl p-5 border-2 transition-all relative overflow-hidden card-staff-b ${
                    overallWinner === 'B'
                      ? 'bg-gradient-to-br from-rose-50 via-orange-50 to-white border-rose-500 shadow-xl shadow-rose-500/10'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  {overallWinner === 'B' && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Crown size={13} className="text-amber-900 fill-amber-900" />
                      <span>LEADER</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-rose-500/25 shrink-0">
                      {staffB.cleanName ? staffB.cleanName.charAt(0).toUpperCase() : 'B'}
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-black text-rose-600 uppercase tracking-wider block">
                        NV B • #{staffB.fullId}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                        {staffB.cleanName || staffB.displayName}
                      </h3>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-rose-100">
                    <div className="bg-white/80 rounded-xl p-2 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">DTQĐ</span>
                      <span className="text-sm sm:text-base font-black text-rose-700 block">
                        {Math.round(staffB.actualDtqd).toLocaleString('vi-VN')}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-bold">triệu</span>
                    </div>

                    <div className="bg-white/80 rounded-xl p-2 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">%HT TARGET</span>
                      <span
                        className={`text-sm sm:text-base font-black block ${
                          staffB.percentHT >= 100 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {Math.round(staffB.percentHT)}%
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-bold">
                        {staffB.percentHT >= 100 ? 'Đạt' : 'Cần tăng'}
                      </span>
                    </div>

                    <div className="bg-white/80 rounded-xl p-2 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">TRẢ CHẬM</span>
                      <span className="text-sm sm:text-base font-black text-orange-700 block">
                        {staffB.installmentPercent !== null ? `${staffB.installmentPercent}%` : '-'}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-bold">tỷ trọng</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tug of War Comparison Bars */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-600">
                <span className="text-blue-700">{staffA?.cleanName} ({Math.round(barA_Dtqd)}%)</span>
                <span>⚖️ CÂN BẰNG TỔNG DOANH THU QUY ĐỔI</span>
                <span className="text-rose-700">({Math.round(barB_Dtqd)}%) {staffB?.cleanName}</span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${barA_Dtqd}%` }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-500"
                />
                <div
                  style={{ width: `${barB_Dtqd}%` }}
                  className="bg-gradient-to-r from-orange-500 to-rose-600 h-full transition-all duration-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-600 pt-1">
                <span className="text-blue-700">{Math.round(staffA?.percentHT || 0)}% HT</span>
                <span>🎯 TIẾN ĐỘ HOÀN THÀNH KẾ HOẠCH</span>
                <span className="text-rose-700">{Math.round(staffB?.percentHT || 0)}% HT</span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${barA_Pct}%` }}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-500"
                />
                <div
                  style={{ width: `${barB_Pct}%` }}
                  className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-500"
                />
              </div>
            </div>

            {/* Category Matchup Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-indigo-600" />
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    So Sánh Chi Tiết Chỉ Tiêu Ngành Hàng
                  </h4>
                </div>

                {/* Tab Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {[
                    { id: 'ALL' as const, label: `Tất cả (${categoryComparison.all.length})` },
                    { id: 'SL' as const, label: `Số lượng (${categoryComparison.sl.length})` },
                    { id: 'DT' as const, label: `Doanh thu (${categoryComparison.dt.length})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs table-container-wrapper">
                <table className="w-full text-xs font-sans border-collapse" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '32%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '13%' }} />
                  </colgroup>

                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[11px]">
                      <th className="px-3 py-2.5 text-left border-r border-slate-200">NGÀNH HÀNG</th>
                      <th className="px-2 py-2.5 text-center border-r border-slate-200 bg-blue-50/70 text-blue-900">
                        {staffA?.cleanName?.split(' ').pop()} (THỰC ĐẠT)
                      </th>
                      <th className="px-2 py-2.5 text-center border-r border-slate-200 bg-blue-100/70 text-blue-900">
                        %HT (A)
                      </th>
                      <th className="px-1 py-2.5 text-center border-r border-slate-200 bg-slate-200 text-slate-800">
                        VS
                      </th>
                      <th className="px-2 py-2.5 text-center border-r border-slate-200 bg-rose-100/70 text-rose-900">
                        %HT (B)
                      </th>
                      <th className="px-2 py-2.5 text-center bg-rose-50/70 text-rose-900">
                        {staffB?.cleanName?.split(' ').pop()} (THỰC ĐẠT)
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-bold">
                    {activeRows.map((row, idx) => {
                      const isAWinner = row.winner === 'A';
                      const isBWinner = row.winner === 'B';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          {/* Category Name */}
                          <td className="px-3 py-2.5 text-left font-black text-slate-800 border-r border-slate-100 truncate">
                            <span className="inline-block mr-1.5 text-[10px] px-1.5 py-0.5 rounded font-black text-slate-500 bg-slate-100">
                              {row.catType}
                            </span>
                            {row.name}
                          </td>

                          {/* Staff A Actual */}
                          <td
                            className={`px-2 py-2.5 text-center border-r border-slate-100 font-black ${
                              isAWinner ? 'bg-blue-50/40 text-blue-800' : 'text-slate-600'
                            }`}
                          >
                            {row.accA.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                          </td>

                          {/* Staff A %HT */}
                          <td
                            className={`px-2 py-2.5 text-center border-r border-slate-100 font-black ${
                              isAWinner
                                ? 'bg-emerald-50 text-emerald-700'
                                : (row.pctA >= 100 ? 'text-emerald-600' : 'text-slate-600')
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1">
                              {isAWinner && <Trophy size={11} className="text-amber-500 shrink-0" />}
                              {Math.round(row.pctA)}%
                            </span>
                          </td>

                          {/* Matchup Center Indicator */}
                          <td className="px-1 py-2.5 text-center border-r border-slate-100 bg-slate-50/60 font-black text-[10px]">
                            {isAWinner ? (
                              <span className="text-blue-600 font-black">◀ A</span>
                            ) : isBWinner ? (
                              <span className="text-rose-600 font-black">B ▶</span>
                            ) : (
                              <span className="text-slate-400">=</span>
                            )}
                          </td>

                          {/* Staff B %HT */}
                          <td
                            className={`px-2 py-2.5 text-center border-r border-slate-100 font-black ${
                              isBWinner
                                ? 'bg-emerald-50 text-emerald-700'
                                : (row.pctB >= 100 ? 'text-emerald-600' : 'text-slate-600')
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1">
                              {isBWinner && <Trophy size={11} className="text-amber-500 shrink-0" />}
                              {Math.round(row.pctB)}%
                            </span>
                          </td>

                          {/* Staff B Actual */}
                          <td
                            className={`px-2 py-2.5 text-center font-black ${
                              isBWinner ? 'bg-rose-50/40 text-rose-800' : 'text-slate-600'
                            }`}
                          >
                            {row.accB.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Table Footer / Buffer Row */}
                    <tr className="bg-slate-50/60 border-t border-slate-200">
                      <td colSpan={6} className="py-2.5 px-3 text-[11px] font-bold text-slate-400 italic text-center">
                        * Dữ liệu đối đầu được đồng bộ thời gian thực từ hệ thống BI
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis & Commentary Section (Inside modal scroll, hidden in export) */}
        {showAnalysis && (
          <div className="px-4 sm:px-6 pb-6 bg-white no-capture">
            <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white rounded-3xl p-5 border border-indigo-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" />
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wide">
                    Tự Động Phân Tích &amp; Đánh Giá Đối Đầu
                  </h4>
                </div>

                <button
                  onClick={handleCopyAnalysis}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 ${
                    copiedComment
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                  }`}
                >
                  {copiedComment ? (
                    <>
                      <Check size={14} />
                      <span>Đã copy!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Sao chép gửi Zalo</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={battleAnalysisText}
                readOnly
                rows={7}
                className="w-full border border-indigo-200/80 rounded-2xl p-3.5 text-xs sm:text-[12.5px] font-bold text-slate-800 leading-relaxed bg-white outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-400 italic">
            * Dữ liệu đối đầu được đồng bộ thời gian thực từ hệ thống BI
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StaffComparisonModal;
